/**
 * File Watcher
 *
 * Monitors file system changes and triggers incremental indexing.
 * Uses chokidar for efficient cross-platform file watching.
 */

import chokidar from 'chokidar'
import type { FSWatcher } from 'chokidar'
import { EventEmitter } from 'node:events'
import { IncrementalIndexer } from './incremental.js'

/**
 * File change event
 */
export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
  path: string
  timestamp: number
}

/**
 * File watcher options
 */
export interface FileWatcherOptions {
  ignoreInitial?: boolean
  persistent?: boolean
  ignorePermissionErrors?: boolean
  awaitWriteFinish?: {
    stabilityThreshold: number
    pollInterval: number
  }
}

/**
 * File watcher class
 */
export class FileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null
  private indexer: IncrementalIndexer
  private watchedPaths: Set<string> = new Set()
  private changeQueue: Map<string, FileChangeEvent> = new Map()
  private flushTimer: NodeJS.Timeout | null = null
  private readonly FLUSH_DELAY = 100 // ms

  constructor(indexer: IncrementalIndexer) {
    super()
    this.indexer = indexer
  }

  /**
   * Start watching a path
   */
  watch(path: string, options: FileWatcherOptions = {}): void {
    if (this.watchedPaths.has(path)) {
      return
    }

    const watcherOptions = {
      ignored: [
        /(^|[\\/\\])\../, // dot files
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**',
      ],
      persistent: options.persistent ?? true,
      ignoreInitial: options.ignoreInitial ?? true,
      ignorePermissionErrors: options.ignorePermissionErrors ?? true,
      awaitWriteFinish: options.awaitWriteFinish ?? {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    }

    this.watcher = chokidar.watch(path, watcherOptions)

    this.watcher
      .on('add', filePath => this.handleFileChange('add', filePath))
      .on('change', filePath => this.handleFileChange('change', filePath))
      .on('unlink', filePath => this.handleFileChange('unlink', filePath))
      .on('addDir', dirPath => this.handleFileChange('addDir', dirPath))
      .on('unlinkDir', dirPath => this.handleFileChange('unlinkDir', dirPath))
      .on('error', error => this.emit('error', error))
      .on('ready', () => this.emit('ready'))

    this.watchedPaths.add(path)
  }

  /**
   * Stop watching a path
   */
  async unwatch(path: string): Promise<void> {
    if (!this.watchedPaths.has(path)) {
      return
    }

    if (this.watcher) {
      await this.watcher.unwatch(path)
    }

    this.watchedPaths.delete(path)
  }

  /**
   * Stop all watching
   */
  async close(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }

    this.watchedPaths.clear()
    this.changeQueue.clear()

    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * Handle file change event
   */
  private handleFileChange(type: FileChangeEvent['type'], path: string): void {
    const event: FileChangeEvent = {
      type,
      path,
      timestamp: Date.now(),
    }

    // Queue the change
    this.changeQueue.set(path, event)

    // Emit event
    this.emit('change', event)

    // Schedule flush
    this.scheduleFlush()
  }

  /**
   * Schedule flushing the change queue
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      return
    }

    this.flushTimer = setTimeout(() => {
      this.flushChanges().catch(error => this.emit('error', error))
      this.flushTimer = null
    }, this.FLUSH_DELAY)
  }

  /**
   * Flush queued changes to indexer
   */
  private async flushChanges(): Promise<void> {
    if (this.changeQueue.size === 0) {
      return
    }

    const changes = Array.from(this.changeQueue.values())
    this.changeQueue.clear()

    // Group changes by type
    const toAdd = changes.filter(c => c.type === 'add' || c.type === 'change').map(c => c.path)
    const toRemove = changes.filter(c => c.type === 'unlink').map(c => c.path)

    // Process changes
    try {
      if (toAdd.length > 0) {
        await this.indexer.indexFiles(toAdd)
      }

      if (toRemove.length > 0) {
        await this.indexer.removeFiles(toRemove)
      }

      this.emit('indexed', { added: toAdd.length, removed: toRemove.length })
    }
    catch (error) {
      this.emit('error', error)
    }
  }

  /**
   * Get list of watched paths
   */
  getWatchedPaths(): string[] {
    return Array.from(this.watchedPaths)
  }

  /**
   * Check if path is being watched
   */
  isWatching(path: string): boolean {
    return this.watchedPaths.has(path)
  }

  /**
   * Get current change queue size
   */
  getQueueSize(): number {
    return this.changeQueue.size
  }
}

/**
 * Global file watcher instance
 */
let globalWatcher: FileWatcher | null = null

/**
 * Get or create global file watcher
 */
export function getGlobalWatcher(): FileWatcher {
  if (!globalWatcher) {
    const indexer = new IncrementalIndexer()
    globalWatcher = new FileWatcher(indexer)
  }
  return globalWatcher
}

/**
 * Close global file watcher
 */
export async function closeGlobalWatcher(): Promise<void> {
  if (globalWatcher) {
    await globalWatcher.close()
    globalWatcher = null
  }
}
