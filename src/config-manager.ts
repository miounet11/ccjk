/**
 * Unified Configuration Manager Module
 *
 * Provides centralized configuration management with hot-reload support,
 * combining local file watching and cloud synchronization.
 *
 * Features:
 * - Unified configuration access across the application
 * - Hot-reload support for local configuration files
 * - Cloud configuration synchronization
 * - Configuration priority: CLI args > Env vars > Local file > Cloud
 * - Event-driven architecture for configuration changes
 * - Thread-safe configuration updates
 * - Graceful degradation on failures
 *
 * @module config-manager
 */

import type { CloudSyncEvent } from './cloud-config-sync'
import type { ConfigChangeEvent } from './config-watcher'
import type { ApiProviderPreset } from './config/api-providers'
import type { ApiConfig, ClaudeSettings } from './types/config'
import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import { CloudConfigSync } from './cloud-config-sync'
import { ConfigWatcher } from './config-watcher'
import { getApiProvidersAsync, LOCAL_PROVIDER_PRESETS } from './config/api-providers'
import { SETTINGS_FILE } from './constants'
import { readJsonConfig } from './utils/json-config'

/**
 * Configuration source types
 */
export type ConfigSource = 'cli' | 'env' | 'local' | 'cloud' | 'default'

/**
 * Configuration change event
 */
export interface ConfigUpdateEvent {
  /** Configuration source that triggered the update */
  source: ConfigSource

  /** Timestamp of the update */
  timestamp: Date

  /** Previous configuration (if available) */
  previous?: any

  /** New configuration */
  current: any

  /** Changed keys (if applicable) */
  changedKeys?: string[]
}

/**
 * Configuration manager options
 */
export interface ConfigManagerOptions {
  /**
   * Enable file watching for hot-reload
   * @default true
   */
  enableFileWatch?: boolean

  /**
   * Enable cloud synchronization
   * @default false
   */
  enableCloudSync?: boolean

  /**
   * Cloud sync interval in milliseconds
   * @default 300000 (5 minutes)
   */
  cloudSyncInterval?: number

  /**
   * File watch debounce delay in milliseconds
   * @default 300
   */
  watchDebounceMs?: number

  /**
   * Cloud API endpoint
   */
  cloudApiEndpoint?: string

  /**
   * Cloud API key for authenticated requests
   */
  cloudApiKey?: string

  /**
   * Configuration file paths to watch
   */
  configPaths?: string[]
}

/**
 * Managed configuration state
 */
interface ManagedConfig {
  /** Claude Code settings */
  settings: ClaudeSettings

  /** API provider presets */
  providers: ApiProviderPreset[]

  /** Current API configuration */
  apiConfig: ApiConfig | null

  /** Configuration metadata */
  metadata: {
    lastUpdated: Date
    source: ConfigSource
    version: number
  }
}

/**
 * Unified configuration manager
 *
 * Manages application configuration with hot-reload support,
 * combining local file watching and cloud synchronization.
 *
 * Extends EventEmitter to provide event-driven notifications:
 * - `config-updated`: Emitted when configuration changes
 * - `settings-updated`: Emitted when settings.json changes
 * - `providers-updated`: Emitted when API providers change
 * - `error`: Emitted when an error occurs
 *
 * @example
 * ```typescript
 * const manager = new ConfigManager({
 *   enableFileWatch: true,
 *   enableCloudSync: true
 * })
 *
 * // Initialize and start watching
 * await manager.initialize()
 *
 * // Subscribe to configuration changes
 * manager.subscribe((event) => {
 *   console.log('Config updated:', event.source)
 * })
 *
 * // Get current configuration
 * const config = await manager.getConfig()
 *
 * // Update configuration
 * await manager.updateConfig({ settings: { model: 'opus' } })
 *
 * // Reload configuration
 * await manager.reloadConfig()
 *
 * // Cleanup
 * await manager.dispose()
 * ```
 */
export class ConfigManager extends EventEmitter {
  private options: Required<Omit<ConfigManagerOptions, 'cloudApiKey' | 'cloudApiEndpoint' | 'configPaths'>> & {
    cloudApiKey?: string
    cloudApiEndpoint?: string
    configPaths?: string[]
  }

  private fileWatcher: ConfigWatcher | null = null
  private cloudSync: CloudConfigSync | null = null
  private config: ManagedConfig
  private initialized = false
  private updateLock = false

  /**
   * Create a new configuration manager
   *
   * @param options - Configuration manager options
   *
   * @example
   * ```typescript
   * const manager = new ConfigManager({
   *   enableFileWatch: true,
   *   enableCloudSync: true,
   *   cloudSyncInterval: 600000 // 10 minutes
   * })
   * ```
   */
  constructor(options: ConfigManagerOptions = {}) {
    super()

    // Set default options
    this.options = {
      enableFileWatch: options.enableFileWatch ?? true,
      enableCloudSync: options.enableCloudSync ?? false,
      cloudSyncInterval: options.cloudSyncInterval ?? 300000, // 5 minutes
      watchDebounceMs: options.watchDebounceMs ?? 300,
      cloudApiEndpoint: options.cloudApiEndpoint,
      cloudApiKey: options.cloudApiKey,
      configPaths: options.configPaths,
    }

    // Initialize default configuration
    this.config = {
      settings: {},
      providers: LOCAL_PROVIDER_PRESETS,
      apiConfig: null,
      metadata: {
        lastUpdated: new Date(),
        source: 'default',
        version: 0,
      },
    }
  }

  /**
   * Initialize the configuration manager
   *
   * Loads initial configuration and starts file watching and cloud sync
   * if enabled.
   *
   * @example
   * ```typescript
   * await manager.initialize()
   * console.log('Configuration manager initialized')
   * ```
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('ConfigManager is already initialized')
    }

    // Load initial configuration
    await this.loadInitialConfig()

    // Setup file watching if enabled
    if (this.options.enableFileWatch) {
      this.setupFileWatcher()
    }

    // Setup cloud sync if enabled
    if (this.options.enableCloudSync) {
      this.setupCloudSync()
    }

    this.initialized = true
  }

  /**
   * Dispose the configuration manager
   *
   * Stops file watching and cloud sync, and cleans up resources.
   *
   * @example
   * ```typescript
   * await manager.dispose()
   * console.log('Configuration manager disposed')
   * ```
   */
  async dispose(): Promise<void> {
    if (this.fileWatcher) {
      await this.fileWatcher.stopWatching()
      this.fileWatcher = null
    }

    if (this.cloudSync) {
      this.cloudSync.stopSync()
      this.cloudSync = null
    }

    this.initialized = false
    this.removeAllListeners()
  }

  /**
   * Get current configuration
   *
   * Returns a deep copy of the current configuration to prevent
   * external modifications.
   *
   * @returns Current managed configuration
   *
   * @example
   * ```typescript
   * const config = await manager.getConfig()
   * console.log('Current model:', config.settings.model)
   * ```
   */
  async getConfig(): Promise<ManagedConfig> {
    if (!this.initialized) {
      await this.initialize()
    }

    // Return deep copy to prevent external modifications
    return JSON.parse(JSON.stringify(this.config))
  }

  /**
   * Update configuration
   *
   * Merges partial updates with existing configuration.
   * Updates are applied atomically with a lock to prevent race conditions.
   *
   * @param updates - Partial configuration updates
   * @param source - Configuration source (default: 'local')
   * @returns Updated configuration
   *
   * @example
   * ```typescript
   * await manager.updateConfig({
   *   settings: { model: 'opus' }
   * }, 'cli')
   * ```
   */
  async updateConfig(
    updates: Partial<Omit<ManagedConfig, 'metadata'>>,
    source: ConfigSource = 'local',
  ): Promise<ManagedConfig> {
    if (!this.initialized) {
      await this.initialize()
    }

    // Acquire update lock
    while (this.updateLock) {
      await this.sleep(10)
    }
    this.updateLock = true

    try {
      const previous = { ...this.config }

      // Merge updates
      if (updates.settings) {
        this.config.settings = this.deepMerge(this.config.settings, updates.settings)
      }
      if (updates.providers) {
        this.config.providers = updates.providers
      }
      if (updates.apiConfig !== undefined) {
        this.config.apiConfig = updates.apiConfig
      }

      // Update metadata
      this.config.metadata = {
        lastUpdated: new Date(),
        source,
        version: this.config.metadata.version + 1,
      }

      // Emit update event
      const event: ConfigUpdateEvent = {
        source,
        timestamp: new Date(),
        previous,
        current: this.config,
        changedKeys: this.getChangedKeys(previous, this.config),
      }

      this.emit('config-updated', event)

      // Emit specific events for settings and providers
      if (updates.settings) {
        this.emit('settings-updated', event)
      }
      if (updates.providers) {
        this.emit('providers-updated', event)
      }

      return this.getConfig()
    }
    finally {
      this.updateLock = false
    }
  }

  /**
   * Reload configuration from all sources
   *
   * Forces a complete reload of configuration from local files
   * and cloud (if enabled).
   *
   * @example
   * ```typescript
   * await manager.reloadConfig()
   * console.log('Configuration reloaded')
   * ```
   */
  async reloadConfig(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    await this.loadInitialConfig()

    // Force cloud sync if enabled
    if (this.cloudSync && this.options.enableCloudSync) {
      try {
        await this.cloudSync.forceSync()
      }
      catch (error) {
        // Don't fail reload on cloud sync error
        this.emit('error', error)
      }
    }
  }

  /**
   * Subscribe to configuration changes
   *
   * @param callback - Function to call when configuration changes
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = manager.subscribe((event) => {
   *   console.log('Config changed from:', event.source)
   * })
   *
   * // Later, unsubscribe
   * unsubscribe()
   * ```
   */
  subscribe(callback: (event: ConfigUpdateEvent) => void): () => void {
    const handler = (event: ConfigUpdateEvent): void => callback(event)
    this.on('config-updated', handler)

    // Return unsubscribe function
    return () => {
      this.off('config-updated', handler)
    }
  }

  /**
   * Get configuration metadata
   *
   * @returns Configuration metadata
   */
  getMetadata(): ManagedConfig['metadata'] {
    return { ...this.config.metadata }
  }

  /**
   * Check if configuration manager is initialized
   *
   * @returns true if initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Load initial configuration from local files
   *
   * @private
   */
  private async loadInitialConfig(): Promise<void> {
    // Load settings.json
    if (existsSync(SETTINGS_FILE)) {
      const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
      if (settings) {
        this.config.settings = settings
        this.config.metadata.source = 'local'
      }
    }

    // Load API providers (cloud + local)
    try {
      const providers = await getApiProvidersAsync()
      if (providers.length > 0) {
        this.config.providers = providers
      }
    }
    catch {
      // Fallback to local providers
      this.config.providers = LOCAL_PROVIDER_PRESETS
    }

    // Extract API config from settings
    if (this.config.settings.env) {
      const { ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL } = this.config.settings.env

      if (ANTHROPIC_BASE_URL || ANTHROPIC_API_KEY || ANTHROPIC_AUTH_TOKEN) {
        this.config.apiConfig = {
          url: ANTHROPIC_BASE_URL || '',
          key: ANTHROPIC_AUTH_TOKEN || ANTHROPIC_API_KEY || '',
          authType: ANTHROPIC_AUTH_TOKEN ? 'auth_token' : 'api_key',
        }
      }
    }

    this.config.metadata.lastUpdated = new Date()
  }

  /**
   * Setup file watcher for hot-reload
   *
   * @private
   */
  private setupFileWatcher(): void {
    const configPaths = this.options.configPaths || [SETTINGS_FILE]

    this.fileWatcher = new ConfigWatcher({
      debounceMs: this.options.watchDebounceMs,
      ignoreInitial: true,
    })

    // Listen for configuration changes
    this.fileWatcher.on('config-changed', (event: ConfigChangeEvent): void => {
      this.handleFileChange(event).catch((error) => {
        this.emit('error', error)
      })
    })

    // Listen for errors
    this.fileWatcher.on('error', (error: Error): void => {
      this.emit('error', error)
    })

    // Start watching
    try {
      this.fileWatcher.watch(configPaths)
    }
    catch (error) {
      this.emit('error', error)
    }
  }

  /**
   * Setup cloud synchronization
   *
   * @private
   */
  private setupCloudSync(): void {
    this.cloudSync = new CloudConfigSync({
      syncInterval: this.options.cloudSyncInterval,
      apiEndpoint: this.options.cloudApiEndpoint,
      apiKey: this.options.cloudApiKey,
      syncOnStart: true,
    })

    // Listen for configuration updates
    this.cloudSync.on('config-updated', (event: CloudSyncEvent) => {
      this.handleCloudUpdate(event).catch((error) => {
        this.emit('error', error)
      })
    })

    // Listen for errors
    this.cloudSync.on('error', (error: Error) => {
      this.emit('error', error)
    })

    // Start syncing
    this.cloudSync.startSync()
  }

  /**
   * Handle file change events
   *
   * @param event - File change event
   *
   * @private
   */
  private async handleFileChange(event: ConfigChangeEvent): Promise<void> {
    // Reload settings from file
    if (event.filePath === SETTINGS_FILE && event.content) {
      await this.updateConfig(
        {
          settings: event.content,
        },
        'local',
      )
    }
  }

  /**
   * Handle cloud configuration updates
   *
   * @param event - Cloud sync event
   *
   * @private
   */
  private async handleCloudUpdate(event: CloudSyncEvent): Promise<void> {
    if (event.data && Array.isArray(event.data)) {
      // Update providers from cloud
      await this.updateConfig(
        {
          providers: event.data,
        },
        'cloud',
      )
    }
  }

  /**
   * Deep merge two objects
   *
   * @private
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

  /**
   * Get changed keys between two configurations
   *
   * @private
   */
  private getChangedKeys(prev: any, curr: any, prefix = ''): string[] {
    const changed: string[] = []

    const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)])

    for (const key of allKeys) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      const prevValue = prev[key]
      const currValue = curr[key]

      if (JSON.stringify(prevValue) !== JSON.stringify(currValue)) {
        changed.push(fullKey)

        // Recursively check nested objects
        if (
          typeof prevValue === 'object'
          && prevValue !== null
          && typeof currValue === 'object'
          && currValue !== null
        ) {
          changed.push(...this.getChangedKeys(prevValue, currValue, fullKey))
        }
      }
    }

    return changed
  }

  /**
   * Sleep for specified duration
   *
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Global configuration manager instance
 */
let globalConfigManager: ConfigManager | null = null

/**
 * Get global configuration manager instance
 *
 * Creates a new instance if one doesn't exist.
 *
 * @param options - Configuration manager options (only used on first call)
 * @returns Global ConfigManager instance
 *
 * @example
 * ```typescript
 * const manager = getConfigManager()
 * await manager.initialize()
 * ```
 */
export function getConfigManager(options?: ConfigManagerOptions): ConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager(options)
  }
  return globalConfigManager
}

/**
 * Reset global configuration manager
 *
 * Disposes the current global instance and creates a new one.
 *
 * @param options - Configuration manager options
 * @returns New global ConfigManager instance
 *
 * @example
 * ```typescript
 * const manager = await resetConfigManager({
 *   enableCloudSync: true
 * })
 * ```
 */
export async function resetConfigManager(options?: ConfigManagerOptions): Promise<ConfigManager> {
  if (globalConfigManager) {
    await globalConfigManager.dispose()
  }
  globalConfigManager = new ConfigManager(options)
  await globalConfigManager.initialize()
  return globalConfigManager
}

/**
 * Create a new configuration manager instance
 *
 * @param options - Configuration manager options
 * @returns New ConfigManager instance
 *
 * @example
 * ```typescript
 * const manager = createConfigManager({
 *   enableFileWatch: true,
 *   enableCloudSync: false
 * })
 * await manager.initialize()
 * ```
 */
export function createConfigManager(options?: ConfigManagerOptions): ConfigManager {
  return new ConfigManager(options)
}
