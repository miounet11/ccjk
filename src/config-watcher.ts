/**
 * Configuration File Watcher Module
 *
 * Provides real-time file watching and hot reloading for configuration files,
 * supporting automatic configuration updates without restarting the application.
 *
 * Features:
 * - Real-time file system watching with chokidar
 * - Debounced reload to prevent excessive updates
 * - Event-driven architecture for integration
 * - Cross-platform compatibility
 * - Graceful error handling
 *
 * @module config-watcher
 */

import type { FSWatcher } from 'chokidar'
import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import { watch } from 'chokidar'

/**
 * Configuration change event types
 */
export type ConfigChangeEventType = 'added' | 'changed' | 'removed'

/**
 * Configuration change event data
 */
export interface ConfigChangeEvent {
  /** Event type (added, changed, or removed) */
  type: ConfigChangeEventType

  /** File path that triggered the event */
  filePath: string

  /** Event timestamp */
  timestamp: Date

  /** Configuration content (undefined for removed events) */
  content?: any
}

/**
 * Configuration watcher options
 */
export interface ConfigWatcherOptions {
  /**
   * Debounce delay in milliseconds
   * Prevents excessive reloads when files change rapidly
   * @default 300
   */
  debounceMs?: number

  /**
   * Whether to ignore initial scan events
   * If true, only watches for changes after initial load
   * @default true
   */
  ignoreInitial?: boolean

  /**
   * Whether to watch for file additions
   * @default true
   */
  watchAdded?: boolean

  /**
   * Whether to watch for file changes
   * @default true
   */
  watchChanged?: boolean

  /**
   * Whether to watch for file removals
   * @default true
   */
  watchRemoved?: boolean

  /**
   * Custom file parser function
   * If not provided, uses JSON.parse for .json files
   */
  parser?: (filePath: string) => Promise<any>
}

/**
 * Configuration file watcher
 *
 * Watches configuration files for changes and automatically triggers
 * reload callbacks when files are added, modified, or removed.
 *
 * Extends EventEmitter to provide event-driven notifications:
 * - `config-added`: Emitted when a new config file is detected
 * - `config-changed`: Emitted when an existing config file is modified
 * - `config-removed`: Emitted when a config file is deleted
 * - `error`: Emitted when an error occurs during reload
 *
 * @example
 * ```typescript
 * const watcher = new ConfigWatcher()
 *
 * // Listen for config changes
 * watcher.on('config-changed', (event: ConfigChangeEvent) => {
 *   console.log(`Config ${event.filePath} was updated`)
 *   // Reload application configuration
 * })
 *
 * // Start watching a config file
 * watcher.watch('/path/to/config.json')
 *
 * // Stop watching
 * watcher.stopWatching()
 * ```
 */
export class ConfigWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private options: Required<Omit<ConfigWatcherOptions, 'parser'>> & { parser?: (filePath: string) => Promise<any> }
  private watchedPaths: Set<string> = new Set()

  /**
   * Create a new configuration watcher
   *
   * @param options - Configuration watcher options
   *
   * @example
   * ```typescript
   * const watcher = new ConfigWatcher({
   *   debounceMs: 500,
   *   ignoreInitial: true
   * })
   * ```
   */
  constructor(options: ConfigWatcherOptions = {}) {
    super()

    // Set default options
    this.options = {
      debounceMs: options.debounceMs ?? 300,
      ignoreInitial: options.ignoreInitial ?? true,
      watchAdded: options.watchAdded ?? true,
      watchChanged: options.watchChanged ?? true,
      watchRemoved: options.watchRemoved ?? true,
      parser: options.parser,
    }
  }

  /**
   * Start watching configuration file(s)
   *
   * Begins monitoring the specified file or files for changes.
   * Can be called multiple times to watch additional files.
   *
   * @param configPath - File path or array of file paths to watch
   *
   * @example
   * ```typescript
   * const watcher = new ConfigWatcher()
   *
   * // Watch single file
   * watcher.watch('/path/to/config.json')
   *
   * // Watch multiple files
   * watcher.watch([
   *   '/path/to/settings.json',
   *   '/path/to/api-config.json'
   * ])
   * ```
   */
  watch(configPath: string | string[]): void {
    const paths = Array.isArray(configPath) ? configPath : [configPath]

    // Validate paths exist
    for (const path of paths) {
      if (!existsSync(path)) {
        this.emit('error', new Error(`Config file does not exist: ${path}`), path)
        continue
      }
      this.watchedPaths.add(path)
    }

    if (this.watchedPaths.size === 0) {
      throw new Error('No valid configuration files to watch')
    }

    // Initialize or update chokidar watcher
    if (!this.watcher) {
      this.watcher = watch(Array.from(this.watchedPaths), {
        ignoreInitial: this.options.ignoreInitial,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      })

      this.setupEventHandlers()
    }
    else {
      // Add new paths to existing watcher
      for (const path of paths) {
        if (existsSync(path)) {
          this.watcher.add(path)
        }
      }
    }
  }

  /**
   * Stop watching all configuration files
   *
   * Stops the file watcher and clears all debounce timers.
   *
   * @example
   * ```typescript
   * watcher.stopWatching()
   * console.log('Stopped watching for config changes')
   * ```
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
    this.watchedPaths.clear()
  }

  /**
   * Register a callback for configuration changes
   *
   * @param callback - Function to call when config changes
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = watcher.onConfigChange((event) => {
   *   console.log('Config changed:', event.filePath)
   * })
   *
   * // Later, unsubscribe
   * unsubscribe()
   * ```
   */
  onConfigChange(callback: (event: ConfigChangeEvent) => void): () => void {
    const handler = (event: ConfigChangeEvent): void => callback(event)

    this.on('config-added', handler)
    this.on('config-changed', handler)
    this.on('config-removed', handler)

    // Return unsubscribe function
    return () => {
      this.off('config-added', handler)
      this.off('config-changed', handler)
      this.off('config-removed', handler)
    }
  }

  /**
   * Get list of currently watched paths
   *
   * @returns Array of watched file paths
   */
  getWatchedPaths(): string[] {
    return Array.from(this.watchedPaths)
  }

  /**
   * Check if a specific path is being watched
   *
   * @param path - File path to check
   * @returns true if path is being watched
   */
  isWatching(path: string): boolean {
    return this.watchedPaths.has(path)
  }

  /**
   * Setup event handlers for the file watcher
   *
   * @private
   */
  private setupEventHandlers(): void {
    if (!this.watcher) {
      return
    }

    // Set up event handlers
    if (this.options.watchAdded) {
      this.watcher.on('add', (filePath: string) => {
        this.handleFileChange('added', filePath)
      })
    }

    if (this.options.watchChanged) {
      this.watcher.on('change', (filePath: string) => {
        this.handleFileChange('changed', filePath)
      })
    }

    if (this.options.watchRemoved) {
      this.watcher.on('unlink', (filePath: string) => {
        this.handleFileRemove(filePath)
      })
    }

    // Handle watcher errors
    this.watcher.on('error', (error: unknown): void => {
      this.emit('error', error instanceof Error ? error : new Error(String(error)), 'watcher')
    })

    // Emit ready event when watcher is ready
    this.watcher.on('ready', () => {
      this.emit('ready')
    })
  }

  /**
   * Handle file change events (add/change)
   *
   * Debounces the reload to prevent excessive updates when files
   * change rapidly (e.g., during save operations).
   *
   * @param type - Event type ('added' or 'changed')
   * @param filePath - File path that changed
   *
   * @private
   */
  private handleFileChange(type: 'added' | 'changed', filePath: string): void {
    // Clear existing debounce timer for this file
    const existingTimer = this.debounceTimers.get(filePath)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath)

      // Parse the configuration file
      this.parseConfigFile(filePath)
        .then((content) => {
          const event: ConfigChangeEvent = {
            type,
            filePath,
            timestamp: new Date(),
            content,
          }

          // Emit appropriate event
          if (type === 'added') {
            this.emit('config-added', event)
          }
          else {
            this.emit('config-changed', event)
          }
        })
        .catch((error) => {
          this.emit('error', error, filePath)
        })
    }, this.options.debounceMs)

    this.debounceTimers.set(filePath, timer)
  }

  /**
   * Handle file removal events
   *
   * Emits removal event and removes path from watched list.
   *
   * @param filePath - File path that was removed
   *
   * @private
   */
  private handleFileRemove(filePath: string): void {
    this.watchedPaths.delete(filePath)

    const event: ConfigChangeEvent = {
      type: 'removed',
      filePath,
      timestamp: new Date(),
    }

    this.emit('config-removed', event)
  }

  /**
   * Parse configuration file
   *
   * Uses custom parser if provided, otherwise defaults to JSON.parse
   *
   * @param filePath - File path to parse
   * @returns Parsed configuration content
   *
   * @private
   */
  private async parseConfigFile(filePath: string): Promise<any> {
    if (this.options.parser) {
      return this.options.parser(filePath)
    }

    // Default JSON parser
    const { readFile } = await import('node:fs/promises')
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content)
  }
}

/**
 * Create a new configuration watcher instance
 *
 * @param options - Configuration watcher options
 * @returns New ConfigWatcher instance
 *
 * @example
 * ```typescript
 * const watcher = createConfigWatcher({
 *   debounceMs: 500
 * })
 * ```
 */
export function createConfigWatcher(options?: ConfigWatcherOptions): ConfigWatcher {
  return new ConfigWatcher(options)
}
