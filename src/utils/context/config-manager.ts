/**
 * Configuration manager for CCJK Context Compression System
 * Handles loading, saving, and validating context system configuration
 */

import type { ContextConfig } from './storage-types'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'pathe'

/**
 * Default context configuration
 */
export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  enabled: true,
  autoSummarize: true,
  contextThreshold: 100000, // 100K tokens
  maxContextTokens: 150000, // 150K tokens
  summaryModel: 'haiku',
  cloudSync: {
    enabled: false,
    apiKey: undefined,
    endpoint: undefined,
  },
  cleanup: {
    maxSessionAge: 30, // 30 days
    maxStorageSize: 500, // 500 MB
    autoCleanup: true,
  },
  storage: {
    baseDir: join(homedir(), '.ccjk', 'context'),
    sessionsDir: 'sessions',
    syncQueueDir: 'sync-queue',
  },
}

/**
 * Configuration manager class
 */
export class ConfigManager {
  private config: ContextConfig
  private configPath: string
  private loaded = false

  constructor(configPath?: string) {
    this.configPath = configPath || join(homedir(), '.ccjk', 'context', 'config.json')
    this.config = { ...DEFAULT_CONTEXT_CONFIG }
  }

  /**
   * Load configuration from disk
   * Creates default config if not exists
   */
  async load(): Promise<ContextConfig> {
    try {
      if (existsSync(this.configPath)) {
        const content = await readFile(this.configPath, 'utf-8')
        const loadedConfig = JSON.parse(content) as Partial<ContextConfig>

        // Merge with defaults to ensure all fields exist
        this.config = this.mergeWithDefaults(loadedConfig)
      }
      else {
        // Create default config
        await this.save()
      }

      this.loaded = true
      return this.config
    }
    catch (error) {
      throw new Error(`Failed to load context config: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Save configuration to disk
   */
  async save(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = dirname(this.configPath)
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }

      // Write config with pretty formatting
      const content = JSON.stringify(this.config, null, 2)
      await writeFile(this.configPath, content, 'utf-8')
    }
    catch (error) {
      throw new Error(`Failed to save context config: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get current configuration
   * Loads from disk if not already loaded
   */
  async get(): Promise<ContextConfig> {
    if (!this.loaded) {
      await this.load()
    }
    return { ...this.config }
  }

  /**
   * Update configuration
   * Merges partial updates with existing config
   */
  async update(updates: Partial<ContextConfig>): Promise<ContextConfig> {
    if (!this.loaded) {
      await this.load()
    }

    // Deep merge updates
    this.config = this.deepMerge(this.config, updates)

    // Validate updated config
    this.validate(this.config)

    // Save to disk
    await this.save()

    return { ...this.config }
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<ContextConfig> {
    this.config = { ...DEFAULT_CONTEXT_CONFIG }
    await this.save()
    return { ...this.config }
  }

  /**
   * Get specific configuration value
   */
  async getValue<K extends keyof ContextConfig>(key: K): Promise<ContextConfig[K]> {
    if (!this.loaded) {
      await this.load()
    }
    return this.config[key]
  }

  /**
   * Set specific configuration value
   */
  async setValue<K extends keyof ContextConfig>(
    key: K,
    value: ContextConfig[K],
  ): Promise<void> {
    if (!this.loaded) {
      await this.load()
    }

    this.config[key] = value
    this.validate(this.config)
    await this.save()
  }

  /**
   * Check if context system is enabled
   */
  async isEnabled(): Promise<boolean> {
    return this.getValue('enabled')
  }

  /**
   * Enable or disable context system
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await this.setValue('enabled', enabled)
  }

  /**
   * Get storage paths
   */
  async getStoragePaths(): Promise<{
    baseDir: string
    sessionsDir: string
    syncQueueDir: string
    absoluteSessionsDir: string
    absoluteSyncQueueDir: string
  }> {
    const config = await this.get()
    const { baseDir, sessionsDir, syncQueueDir } = config.storage

    return {
      baseDir,
      sessionsDir,
      syncQueueDir,
      absoluteSessionsDir: join(baseDir, sessionsDir),
      absoluteSyncQueueDir: join(baseDir, syncQueueDir),
    }
  }

  /**
   * Validate configuration
   * Throws error if invalid
   */
  private validate(config: ContextConfig): void {
    // Validate token thresholds
    if (config.contextThreshold <= 0) {
      throw new Error('contextThreshold must be positive')
    }

    if (config.maxContextTokens <= 0) {
      throw new Error('maxContextTokens must be positive')
    }

    if (config.contextThreshold >= config.maxContextTokens) {
      throw new Error('contextThreshold must be less than maxContextTokens')
    }

    // Validate cleanup settings
    if (config.cleanup.maxSessionAge <= 0) {
      throw new Error('cleanup.maxSessionAge must be positive')
    }

    if (config.cleanup.maxStorageSize <= 0) {
      throw new Error('cleanup.maxStorageSize must be positive')
    }

    // Validate cloud sync
    if (config.cloudSync.enabled) {
      if (!config.cloudSync.apiKey || config.cloudSync.apiKey.trim() === '') {
        throw new Error('cloudSync.apiKey is required when cloudSync is enabled')
      }
      if (!config.cloudSync.endpoint || config.cloudSync.endpoint.trim() === '') {
        throw new Error('cloudSync.endpoint is required when cloudSync is enabled')
      }
    }

    // Validate storage paths
    if (!config.storage.baseDir) {
      throw new Error('storage.baseDir is required')
    }
  }

  /**
   * Merge partial config with defaults
   */
  private mergeWithDefaults(partial: Partial<ContextConfig>): ContextConfig {
    return this.deepMerge(DEFAULT_CONTEXT_CONFIG, partial)
  }

  /**
   * Deep merge two objects
   */
  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target }

    for (const key in source) {
      const sourceValue = source[key]
      const targetValue = result[key]

      if (sourceValue === undefined) {
        continue
      }

      if (
        typeof sourceValue === 'object'
        && sourceValue !== null
        && !Array.isArray(sourceValue)
        && typeof targetValue === 'object'
        && targetValue !== null
        && !Array.isArray(targetValue)
      ) {
        result[key] = this.deepMerge(targetValue, sourceValue)
      }
      else {
        result[key] = sourceValue as T[Extract<keyof T, string>]
      }
    }

    return result
  }
}

/**
 * Create a new config manager instance
 */
export function createConfigManager(configPath?: string): ConfigManager {
  return new ConfigManager(configPath)
}

/**
 * Global config manager instance
 */
let globalConfigManager: ConfigManager | null = null

/**
 * Get global config manager instance
 */
export function getConfigManager(): ConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager()
  }
  return globalConfigManager
}

/**
 * Load global configuration
 */
export async function loadConfig(): Promise<ContextConfig> {
  return getConfigManager().load()
}

/**
 * Save global configuration
 */
export async function saveConfig(config: Partial<ContextConfig>): Promise<ContextConfig> {
  return getConfigManager().update(config)
}

/**
 * Get global configuration
 */
export async function getConfig(): Promise<ContextConfig> {
  return getConfigManager().get()
}

/**
 * Reset global configuration to defaults
 */
export async function resetConfig(): Promise<ContextConfig> {
  return getConfigManager().reset()
}
