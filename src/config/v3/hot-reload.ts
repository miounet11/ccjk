/**
 * Configuration Manager V3 - Hot Reload System
 *
 * File watcher for automatic configuration updates
 */

import type { FSWatcher } from 'node:fs'

import type { ConfigChangeEvent, ConfigChangeHandler, ConfigV3 } from './types'
import { existsSync, watch } from 'node:fs'
import { join } from 'pathe'
import { CCJK_CONFIG_DIR } from '../../constants'
import { readFile } from '../../utils/fs-operations'

// ============================================================================
// Types
// ============================================================================

/**
 * Hot reload options
 */
export interface HotReloadOptions {
  /**
   * Debounce delay in milliseconds
   */
  debounceMs?: number

  /**
   * Whether to validate config on change
   */
  validateOnChange?: boolean

  /**
   * Custom config file path
   */
  configPath?: string

  /**
   * Callback for validation errors
   */
  onValidationError?: (errors: string[]) => void
}

/**
 * Hot reload state
 */
interface HotReloadState {
  watcher: FSWatcher | null
  handlers: Set<ConfigChangeHandler>
  lastConfig: ConfigV3 | null
  debounceTimer: ReturnType<typeof setTimeout> | null
  isWatching: boolean
}

// ============================================================================
// Hot Reload Manager
// ============================================================================

/**
 * Hot Reload Manager for configuration files
 */
export class HotReloadManager {
  private state: HotReloadState = {
    watcher: null,
    handlers: new Set(),
    lastConfig: null,
    debounceTimer: null,
    isWatching: false,
  }

  private options: Required<HotReloadOptions>
  private configPath: string

  constructor(options: HotReloadOptions = {}) {
    this.options = {
      debounceMs: options.debounceMs ?? 100,
      validateOnChange: options.validateOnChange ?? true,
      configPath: options.configPath ?? join(CCJK_CONFIG_DIR, 'config.v3.json'),
      onValidationError: options.onValidationError ?? (() => {}),
    }
    this.configPath = this.options.configPath
  }

  /**
   * Start watching configuration file
   */
  start(): void {
    if (this.state.isWatching) {
      return
    }

    // Load initial config
    this.loadConfig()

    // Start file watcher
    if (existsSync(this.configPath)) {
      this.startWatcher()
    }
    else {
      // Watch directory for file creation
      this.watchDirectory()
    }

    this.state.isWatching = true
  }

  /**
   * Stop watching configuration file
   */
  stop(): void {
    if (!this.state.isWatching) {
      return
    }

    if (this.state.watcher) {
      this.state.watcher.close()
      this.state.watcher = null
    }

    if (this.state.debounceTimer) {
      clearTimeout(this.state.debounceTimer)
      this.state.debounceTimer = null
    }

    this.state.isWatching = false
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(handler: ConfigChangeHandler): () => void {
    this.state.handlers.add(handler)

    return () => {
      this.state.handlers.delete(handler)
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ConfigV3 | null {
    return this.state.lastConfig
  }

  /**
   * Check if watching is active
   */
  isWatching(): boolean {
    return this.state.isWatching
  }

  /**
   * Force reload configuration
   */
  reload(): void {
    this.loadConfig()
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Start file watcher
   */
  private startWatcher(): void {
    try {
      this.state.watcher = watch(this.configPath, (eventType) => {
        if (eventType === 'change') {
          this.handleFileChange()
        }
      })

      this.state.watcher.on('error', (error) => {
        console.error('Config watcher error:', error)
        this.restartWatcher()
      })
    }
    catch (error) {
      console.error('Failed to start config watcher:', error)
    }
  }

  /**
   * Watch directory for file creation
   */
  private watchDirectory(): void {
    const dir = CCJK_CONFIG_DIR

    if (!existsSync(dir)) {
      return
    }

    try {
      this.state.watcher = watch(dir, (eventType, filename) => {
        if (filename === 'config.v3.json') {
          if (existsSync(this.configPath)) {
            // File created, switch to file watcher
            this.state.watcher?.close()
            this.startWatcher()
            this.handleFileChange()
          }
        }
      })
    }
    catch (error) {
      console.error('Failed to watch config directory:', error)
    }
  }

  /**
   * Restart watcher after error
   */
  private restartWatcher(): void {
    if (this.state.watcher) {
      this.state.watcher.close()
      this.state.watcher = null
    }

    // Restart after delay
    setTimeout(() => {
      if (this.state.isWatching) {
        this.startWatcher()
      }
    }, 1000)
  }

  /**
   * Handle file change event
   */
  private handleFileChange(): void {
    // Debounce rapid changes
    if (this.state.debounceTimer) {
      clearTimeout(this.state.debounceTimer)
    }

    this.state.debounceTimer = setTimeout(() => {
      this.processConfigChange()
    }, this.options.debounceMs)
  }

  /**
   * Process configuration change
   */
  private processConfigChange(): void {
    const oldConfig = this.state.lastConfig
    const newConfig = this.loadConfig()

    if (!newConfig) {
      return
    }

    // Find changed paths
    const changes = this.findChanges(oldConfig, newConfig)

    // Notify handlers
    for (const change of changes) {
      const event: ConfigChangeEvent = {
        path: change.path,
        oldValue: change.oldValue,
        newValue: change.newValue,
        timestamp: new Date(),
        source: 'file',
      }

      Array.from(this.state.handlers).forEach((handler) => {
        try {
          handler(event)
        }
        catch (error) {
          console.error('Config change handler error:', error)
        }
      })
    }
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): ConfigV3 | null {
    if (!existsSync(this.configPath)) {
      return null
    }

    try {
      const content = readFile(this.configPath)
      const config = JSON.parse(content) as ConfigV3

      // Validate if enabled
      if (this.options.validateOnChange) {
        const errors = this.validateConfig(config)
        if (errors.length > 0) {
          this.options.onValidationError(errors)
          return this.state.lastConfig // Keep old config on validation error
        }
      }

      this.state.lastConfig = config
      return config
    }
    catch (error) {
      console.error('Failed to load config:', error)
      return this.state.lastConfig
    }
  }

  /**
   * Basic config validation
   */
  private validateConfig(config: unknown): string[] {
    const errors: string[] = []

    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object')
      return errors
    }

    const cfg = config as Record<string, unknown>

    if (!cfg.$version) {
      errors.push('Missing $version field')
    }

    if (!cfg.general) {
      errors.push('Missing general section')
    }

    if (!cfg.tools) {
      errors.push('Missing tools section')
    }

    return errors
  }

  /**
   * Find changes between two configs
   */
  private findChanges(
    oldConfig: ConfigV3 | null,
    newConfig: ConfigV3,
    prefix = '',
  ): Array<{ path: string, oldValue: unknown, newValue: unknown }> {
    const changes: Array<{ path: string, oldValue: unknown, newValue: unknown }> = []

    if (!oldConfig) {
      // All fields are new
      changes.push({
        path: prefix || '$root',
        oldValue: null,
        newValue: newConfig,
      })
      return changes
    }

    // Compare objects recursively
    const allKeys = new Set([
      ...Object.keys(oldConfig as unknown as Record<string, unknown>),
      ...Object.keys(newConfig as unknown as Record<string, unknown>),
    ])

    allKeys.forEach((key) => {
      const path = prefix ? `${prefix}.${key}` : key
      const oldValue = (oldConfig as unknown as Record<string, unknown>)[key]
      const newValue = (newConfig as unknown as Record<string, unknown>)[key]

      if (this.isEqual(oldValue, newValue)) {
        return
      }

      if (
        typeof oldValue === 'object'
        && typeof newValue === 'object'
        && oldValue !== null
        && newValue !== null
        && !Array.isArray(oldValue)
        && !Array.isArray(newValue)
      ) {
        // Recurse into nested objects
        changes.push(
          ...this.findChanges(
            oldValue as ConfigV3,
            newValue as ConfigV3,
            path,
          ),
        )
      }
      else {
        changes.push({ path, oldValue, newValue })
      }
    })

    return changes
  }

  /**
   * Deep equality check
   */
  private isEqual(a: unknown, b: unknown): boolean {
    if (a === b)
      return true
    if (typeof a !== typeof b)
      return false
    if (a === null || b === null)
      return a === b

    if (typeof a === 'object') {
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length)
          return false
        return a.every((item, i) => this.isEqual(item, b[i]))
      }

      if (Array.isArray(a) || Array.isArray(b))
        return false

      const aObj = a as Record<string, unknown>
      const bObj = b as Record<string, unknown>
      const aKeys = Object.keys(aObj)
      const bKeys = Object.keys(bObj)

      if (aKeys.length !== bKeys.length)
        return false

      return aKeys.every(key =>
        this.isEqual(aObj[key], bObj[key]),
      )
    }

    return false
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a hot reload manager instance
 */
export function createHotReloadManager(options?: HotReloadOptions): HotReloadManager {
  return new HotReloadManager(options)
}

/**
 * Singleton instance for global use
 */
let globalHotReloadManager: HotReloadManager | null = null

/**
 * Get or create global hot reload manager
 */
export function getHotReloadManager(options?: HotReloadOptions): HotReloadManager {
  if (!globalHotReloadManager) {
    globalHotReloadManager = new HotReloadManager(options)
  }
  return globalHotReloadManager
}

/**
 * Start global hot reload
 */
export function startHotReload(options?: HotReloadOptions): void {
  getHotReloadManager(options).start()
}

/**
 * Stop global hot reload
 */
export function stopHotReload(): void {
  globalHotReloadManager?.stop()
}

/**
 * Subscribe to global config changes
 */
export function onConfigChange(handler: ConfigChangeHandler): () => void {
  return getHotReloadManager().subscribe(handler)
}
