/**
 * Actionbook Precomputation Engine
 *
 * Main entry point for the actionbook precomputation engine.
 * Provides high-level API for indexing, querying, and managing precomputed data.
 */

import type { QueryAPIRouter } from './api/router.js'
import type { DependencyTracker } from './indexer/dependency.js'
import type { IncrementalIndexer } from './indexer/incremental.js'
import type { FileWatcher } from './indexer/watcher.js'
import type { IndexingStats, PrecomputedData, QueryAPI } from './types.js'
import * as fs from 'node:fs/promises'
import { getQueryAPI } from './api/router.js'
import { closeGlobalIndex, getGlobalIndex } from './cache/index.js'
import { getGlobalTracker, resetGlobalTracker } from './indexer/dependency.js'
import { getGlobalIndexer, resetGlobalIndexer } from './indexer/incremental.js'
import { closeGlobalWatcher, getGlobalWatcher } from './indexer/watcher.js'

/**
 * Actionbook engine configuration
 */
export interface ActionbookConfig {
  cachePath?: string
  watchMode?: boolean
  compressionEnabled?: boolean
  maxMemoryCacheSize?: number
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * Actionbook engine class
 */
export class ActionbookEngine {
  private config: Required<ActionbookConfig>
  private queryAPI: QueryAPIRouter
  private indexer: IncrementalIndexer
  private watcher: FileWatcher
  private tracker: DependencyTracker
  private isInitialized = false

  constructor(config: ActionbookConfig = {}) {
    this.config = {
      cachePath: config.cachePath || './.actionbook-cache',
      watchMode: config.watchMode ?? true,
      compressionEnabled: config.compressionEnabled ?? true,
      maxMemoryCacheSize: config.maxMemoryCacheSize || 1000,
      logLevel: config.logLevel || 'info',
    }

    this.queryAPI = getQueryAPI()
    this.indexer = getGlobalIndexer()
    this.watcher = getGlobalWatcher()
    this.tracker = getGlobalTracker()
  }

  /**
   * Initialize the engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    this.log('info', 'Initializing Actionbook Engine...')

    // Initialize cache
    const index = getGlobalIndex(this.config.cachePath)
    await index.compact()

    // Setup file watcher if enabled
    if (this.config.watchMode) {
      this.tracker.enableWatchMode()
      this.setupWatcher()
    }

    this.isInitialized = true
    this.log('info', 'Actionbook Engine initialized')
  }

  /**
   * Index a single file
   */
  async indexFile(filePath: string): Promise<PrecomputedData | null> {
    this.ensureInitialized()
    this.log('debug', `Indexing file: ${filePath}`)
    return this.indexer.indexFile(filePath)
  }

  /**
   * Index multiple files
   */
  async indexFiles(filePaths: string[]): Promise<IndexingStats> {
    this.ensureInitialized()
    this.log('info', `Indexing ${filePaths.length} files...`)
    return this.indexer.indexFiles(filePaths)
  }

  /**
   * Index a directory recursively
   */
  async indexDirectory(dirPath: string, extensions = ['.ts', '.tsx', '.js', '.jsx']): Promise<IndexingStats> {
    this.ensureInitialized()
    this.log('info', `Indexing directory: ${dirPath}`)

    // Get all files with specified extensions
    const files = await this.getFilesRecursively(dirPath, extensions)
    return this.indexFiles(files)
  }

  /**
   * Watch a directory for changes
   */
  async watchDirectory(dirPath: string): Promise<void> {
    this.ensureInitialized()
    this.log('info', `Watching directory: ${dirPath}`)

    if (!this.config.watchMode) {
      this.log('warn', 'Watch mode is disabled')
      return
    }

    this.watcher.watch(dirPath)
  }

  /**
   * Query precomputed data
   */
  get query(): QueryAPI {
    return this.queryAPI
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    l1: { hits: number, misses: number, size: number, hitRate: number }
    l2: { size: number }
    combined: { hitRate: number }
  }> {
    const index = getGlobalIndex()
    return index.getStats()
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(): Map<string, Set<string>> {
    return this.indexer.getDependencyGraph()
  }

  /**
   * Get circular dependencies
   */
  getCircularDependencies(): Array<Array<string>> {
    return this.tracker.detectCircularDependencies()
  }

  /**
   * Warm up cache for specific files
   */
  async warmup(files: string[]): Promise<void> {
    this.ensureInitialized()
    this.log('info', `Warming up cache for ${files.length} files...`)

    const index = getGlobalIndex()
    await Promise.all(files.map(file => index.warmup(file)))
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    this.log('info', 'Clearing all caches...')
    const index = getGlobalIndex()
    await index.clear()
  }

  /**
   * Shutdown the engine
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return
    }

    this.log('info', 'Shutting down Actionbook Engine...')

    // Close watchers
    if (this.config.watchMode) {
      await closeGlobalWatcher()
    }

    // Close cache
    await closeGlobalIndex()

    // Reset global instances
    resetGlobalIndexer()
    resetGlobalTracker()

    this.isInitialized = false
    this.log('info', 'Actionbook Engine shutdown complete')
  }

  /**
   * Setup file watcher
   */
  private setupWatcher(): void {
    this.watcher.on('change', (event) => {
      this.log('debug', `File changed: ${event.path} (${event.type})`)
    })

    this.watcher.on('indexed', (stats) => {
      this.log('info', `Indexed ${stats.added + stats.removed} files`)
    })

    this.watcher.on('error', (error) => {
      this.log('error', 'Watcher error:', error)
    })
  }

  /**
   * Get files recursively
   */
  private async getFilesRecursively(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = `${dir}/${entry.name}`

        if (entry.isDirectory()) {
          // Skip common ignore directories
          if (!this.shouldIgnoreDirectory(entry.name)) {
            const subFiles = await this.getFilesRecursively(fullPath, extensions)
            files.push(...subFiles)
          }
        }
        else if (entry.isFile()) {
          if (extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(fullPath)
          }
        }
      }
    }
    catch (error) {
      this.log('warn', `Failed to read directory ${dir}:`, error)
    }

    return files
  }

  /**
   * Check if directory should be ignored
   */
  private shouldIgnoreDirectory(name: string): boolean {
    const ignorePatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      'coverage',
      '.actionbook-cache',
    ]

    return ignorePatterns.some(pattern => name.includes(pattern))
  }

  /**
   * Ensure engine is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Actionbook Engine not initialized. Call initialize() first.')
    }
  }

  /**
   * Log message
   */
  private log(level: string, message: string, ...args: any[]): void {
    const levels = ['debug', 'info', 'warn', 'error']
    const currentLevel = levels.indexOf(this.config.logLevel)
    const messageLevel = levels.indexOf(level)

    if (messageLevel >= currentLevel) {
      console.log(`[Actionbook:${level.toUpperCase()}] ${message}`, ...args)
    }
  }
}

/**
 * Create actionbook engine instance
 */
export function createEngine(config?: ActionbookConfig): ActionbookEngine {
  return new ActionbookEngine(config)
}

export * from './api/router.js'
export * from './cache/index.js'
export * from './indexer/dependency.js'
export * from './indexer/incremental.js'
export * from './indexer/watcher.js'
/**
 * Export all types and utilities
 */
export * from './types.js'

/**
 * Default export
 */
export default ActionbookEngine
