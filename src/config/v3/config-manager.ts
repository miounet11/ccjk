/**
 * Configuration Manager V3 - Core Manager
 *
 * Singleton configuration manager with full type safety
 */

import type {
  ConfigChangeEvent,
  ConfigChangeHandler,
  ConfigDiff,
  ConfigV3,
  DiffEntry,
  Environment,
  IConfigManagerV3,
  MigrationResult,
  PartialConfigV3,
  ValidationResult,
} from './types'

import { existsSync } from 'node:fs'
import { join } from 'pathe'
import { CCJK_CONFIG_DIR } from '../../constants'
import { ensureDir, readFile, writeFileAtomic } from '../../utils/fs-operations'
import { createHotReloadManager, type HotReloadManager } from './hot-reload'
import { createDefaultConfigV3, runMigration } from './migration'
import { SchemaValidator, validateConfig } from './schema-validator'

// ============================================================================
// Constants
// ============================================================================

const CONFIG_FILE_NAME = 'config.v3.json'
const DEFAULT_CONFIG_PATH = join(CCJK_CONFIG_DIR, CONFIG_FILE_NAME)

// ============================================================================
// Configuration Manager V3
// ============================================================================

/**
 * Configuration Manager V3 Implementation
 *
 * Features:
 * - Singleton pattern
 * - JSON Schema validation
 * - Automatic migration
 * - Hot reload support
 * - Multi-environment support
 * - Configuration diff
 */
export class ConfigManagerV3 implements IConfigManagerV3 {
  private static instance: ConfigManagerV3 | null = null

  private config: ConfigV3
  private configPath: string
  private validator: SchemaValidator
  private hotReloadManager: HotReloadManager | null = null
  private changeHandlers: Set<ConfigChangeHandler> = new Set()
  private isDirty = false

  /**
   * Private constructor for singleton pattern
   */
  private constructor(configPath?: string) {
    this.configPath = configPath || DEFAULT_CONFIG_PATH
    this.validator = new SchemaValidator()
    this.config = this.loadOrCreate()
  }

  /**
   * Get singleton instance
   */
  static getInstance(configPath?: string): ConfigManagerV3 {
    if (!ConfigManagerV3.instance) {
      ConfigManagerV3.instance = new ConfigManagerV3(configPath)
    }
    return ConfigManagerV3.instance
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    if (ConfigManagerV3.instance) {
      ConfigManagerV3.instance.stopHotReload()
      ConfigManagerV3.instance = null
    }
  }

  // ============================================================================
  // Core API
  // ============================================================================

  /**
   * Get configuration value by dot-notation path
   */
  get<T>(path: string): T {
    const parts = path.split('.')
    let current: unknown = this.config

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined as T
      }

      if (typeof current !== 'object') {
        return undefined as T
      }

      // Handle array index access
      if (part.includes('[')) {
        const match = part.match(/^(\w+)\[(\d+)\]$/)
        if (match) {
          const [, key, index] = match
          current = (current as Record<string, unknown>)[key]
          if (Array.isArray(current)) {
            current = current[Number.parseInt(index, 10)]
          }
          else {
            return undefined as T
          }
          continue
        }
      }

      current = (current as Record<string, unknown>)[part]
    }

    return current as T
  }

  /**
   * Set configuration value by dot-notation path
   */
  set(path: string, value: unknown): void {
    const parts = path.split('.')
    const lastPart = parts.pop()

    if (!lastPart) {
      throw new Error('Invalid path')
    }

    let current: Record<string, unknown> = this.config as unknown as Record<string, unknown>
    const oldValue = this.get(path)

    for (const part of parts) {
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {}
      }
      current = current[part] as Record<string, unknown>
    }

    current[lastPart] = value
    this.config.$lastUpdated = new Date().toISOString()
    this.isDirty = true

    // Notify change handlers
    this.notifyChange({
      path,
      oldValue,
      newValue: value,
      timestamp: new Date(),
      source: 'api',
    })

    // Auto-save
    this.save()
  }

  /**
   * Update multiple configuration values
   */
  update(updates: PartialConfigV3): void {
    this.mergeConfig(this.config as unknown as Record<string, unknown>, updates as unknown as Record<string, unknown>)
    this.config.$lastUpdated = new Date().toISOString()
    this.isDirty = true
    this.save()
  }

  /**
   * Validate current configuration
   */
  validate(): ValidationResult {
    return this.validator.validate(this.config)
  }

  /**
   * Migrate configuration from older versions
   */
  migrate(): MigrationResult {
    const result = runMigration({ backup: true })

    if (result.success) {
      // Reload config after migration
      this.config = this.loadOrCreate()
    }

    return result
  }

  /**
   * Watch for configuration changes
   */
  watch(callback: ConfigChangeHandler): () => void {
    this.changeHandlers.add(callback)

    // Start hot reload if not already running
    if (!this.hotReloadManager) {
      this.startHotReload()
    }

    return () => {
      this.changeHandlers.delete(callback)

      // Stop hot reload if no more handlers
      if (this.changeHandlers.size === 0) {
        this.stopHotReload()
      }
    }
  }

  /**
   * Export configuration as JSON string
   */
  export(): string {
    return JSON.stringify(this.config, null, 2)
  }

  /**
   * Import configuration from JSON string
   */
  import(data: string): void {
    try {
      const imported = JSON.parse(data) as ConfigV3

      // Validate before importing
      const validation = this.validator.validate(imported)
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      const oldConfig = { ...this.config }
      this.config = imported
      this.config.$lastUpdated = new Date().toISOString()
      this.save()

      // Notify about import
      this.notifyChange({
        path: '$root',
        oldValue: oldConfig,
        newValue: this.config,
        timestamp: new Date(),
        source: 'api',
      })
    }
    catch (error) {
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get configuration diff
   */
  diff(other: Partial<ConfigV3>): ConfigDiff {
    const added: DiffEntry[] = []
    const removed: DiffEntry[] = []
    const changed: DiffEntry[] = []

    this.compareObjects(this.config, other, '', added, removed, changed)

    return { added, removed, changed }
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    const oldConfig = { ...this.config }
    this.config = createDefaultConfigV3()
    this.save()

    this.notifyChange({
      path: '$root',
      oldValue: oldConfig,
      newValue: this.config,
      timestamp: new Date(),
      source: 'api',
    })
  }

  /**
   * Get current environment
   */
  getEnvironment(): Environment {
    return this.config.$environment
  }

  /**
   * Set current environment
   */
  setEnvironment(env: Environment): void {
    this.set('$environment', env)
  }

  // ============================================================================
  // Additional Methods
  // ============================================================================

  /**
   * Get full configuration object
   */
  getAll(): ConfigV3 {
    return { ...this.config }
  }

  /**
   * Check if configuration has unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.isDirty
  }

  /**
   * Force save configuration
   */
  save(): void {
    try {
      ensureDir(CCJK_CONFIG_DIR)
      writeFileAtomic(this.configPath, JSON.stringify(this.config, null, 2))
      this.isDirty = false
    }
    catch (error) {
      console.error('Failed to save configuration:', error)
      throw error
    }
  }

  /**
   * Reload configuration from file
   */
  reload(): void {
    this.config = this.loadOrCreate()
    this.isDirty = false
  }

  /**
   * Start hot reload
   */
  startHotReload(): void {
    if (this.hotReloadManager) {
      return
    }

    this.hotReloadManager = createHotReloadManager({
      configPath: this.configPath,
      validateOnChange: true,
      onValidationError: (errors) => {
        console.warn('Config validation errors on hot reload:', errors)
      },
    })

    this.hotReloadManager.subscribe((event) => {
      // Update internal config
      this.config = this.hotReloadManager?.getConfig() || this.config

      // Forward to handlers
      Array.from(this.changeHandlers).forEach((handler) => {
        handler(event)
      })
    })

    this.hotReloadManager.start()
  }

  /**
   * Stop hot reload
   */
  stopHotReload(): void {
    if (this.hotReloadManager) {
      this.hotReloadManager.stop()
      this.hotReloadManager = null
    }
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return this.configPath
  }

  /**
   * Unsubscribe from change handlers
   */
  private unsubscribeHandler(handler: ConfigChangeHandler): void {
    this.changeHandlers.delete(handler)
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Load configuration or create default
   */
  private loadOrCreate(): ConfigV3 {
    if (existsSync(this.configPath)) {
      try {
        const content = readFile(this.configPath)
        const config = JSON.parse(content) as ConfigV3

        // Validate loaded config
        const validation = this.validator.validate(config)
        if (validation.valid) {
          return config
        }

        console.warn('Config validation warnings:', validation.warnings)

        // Return config even with warnings, but not with errors
        if (validation.errors.length === 0) {
          return config
        }

        console.error('Config validation errors, using defaults:', validation.errors)
      }
      catch (error) {
        console.error('Failed to load config, using defaults:', error)
      }
    }

    // Create and save default config
    const defaultConfig = createDefaultConfigV3()
    this.saveConfig(defaultConfig)
    return defaultConfig
  }

  /**
   * Save configuration to file
   */
  private saveConfig(config: ConfigV3): void {
    try {
      ensureDir(CCJK_CONFIG_DIR)
      writeFileAtomic(this.configPath, JSON.stringify(config, null, 2))
    }
    catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  /**
   * Merge configuration objects
   */
  private mergeConfig(target: Record<string, unknown>, source: Record<string, unknown>): void {
    for (const key of Object.keys(source)) {
      const sourceValue = source[key]
      const targetValue = target[key]

      if (
        sourceValue !== null
        && typeof sourceValue === 'object'
        && !Array.isArray(sourceValue)
        && targetValue !== null
        && typeof targetValue === 'object'
        && !Array.isArray(targetValue)
      ) {
        this.mergeConfig(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        )
      }
      else {
        target[key] = sourceValue
      }
    }
  }

  /**
   * Compare objects for diff
   */
  private compareObjects(
    current: unknown,
    other: unknown,
    path: string,
    added: DiffEntry[],
    removed: DiffEntry[],
    changed: DiffEntry[],
  ): void {
    if (current === other) {
      return
    }

    if (typeof current !== 'object' || typeof other !== 'object') {
      if (current !== other) {
        changed.push({ path, oldValue: current, newValue: other })
      }
      return
    }

    if (current === null || other === null) {
      changed.push({ path, oldValue: current, newValue: other })
      return
    }

    const currentObj = current as Record<string, unknown>
    const otherObj = other as Record<string, unknown>

    const currentKeys = Object.keys(currentObj)
    const otherKeys = Object.keys(otherObj)
    const otherKeysSet = new Set(otherKeys)
    const currentKeysSet = new Set(currentKeys)

    // Find added keys
    otherKeys.forEach((key) => {
      if (!currentKeysSet.has(key)) {
        const fullPath = path ? `${path}.${key}` : key
        added.push({ path: fullPath, newValue: otherObj[key] })
      }
    })

    // Find removed keys
    currentKeys.forEach((key) => {
      if (!otherKeysSet.has(key)) {
        const fullPath = path ? `${path}.${key}` : key
        removed.push({ path: fullPath, oldValue: currentObj[key] })
      }
    })

    // Find changed keys
    currentKeys.forEach((key) => {
      if (otherKeysSet.has(key)) {
        const fullPath = path ? `${path}.${key}` : key
        this.compareObjects(
          currentObj[key],
          otherObj[key],
          fullPath,
          added,
          removed,
          changed,
        )
      }
    })
  }

  /**
   * Notify change handlers
   */
  private notifyChange(event: ConfigChangeEvent): void {
    Array.from(this.changeHandlers).forEach((handler) => {
      try {
        handler(event)
      }
      catch (error) {
        console.error('Change handler error:', error)
      }
    })
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Get configuration manager instance
 */
export function getConfigManager(configPath?: string): ConfigManagerV3 {
  return ConfigManagerV3.getInstance(configPath)
}

/**
 * Create a new configuration manager (non-singleton)
 */
export function createConfigManager(configPath: string): ConfigManagerV3 {
  return new (ConfigManagerV3 as any)(configPath)
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get configuration value
 */
export function getConfig<T>(path: string): T {
  return getConfigManager().get<T>(path)
}

/**
 * Set configuration value
 */
export function setConfig(path: string, value: unknown): void {
  getConfigManager().set(path, value)
}

/**
 * Get full configuration
 */
export function getAllConfig(): ConfigV3 {
  return getConfigManager().getAll()
}

/**
 * Validate configuration
 */
export function validateCurrentConfig(): ValidationResult {
  return getConfigManager().validate()
}

/**
 * Export configuration
 */
export function exportConfig(): string {
  return getConfigManager().export()
}

/**
 * Import configuration
 */
export function importConfig(data: string): void {
  getConfigManager().import(data)
}

/**
 * Watch configuration changes
 */
export function watchConfig(callback: ConfigChangeHandler): () => void {
  return getConfigManager().watch(callback)
}

/**
 * Get current environment
 */
export function getEnvironment(): Environment {
  return getConfigManager().getEnvironment()
}

/**
 * Set current environment
 */
export function setEnvironment(env: Environment): void {
  getConfigManager().setEnvironment(env)
}
