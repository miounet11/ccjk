/**
 * CCJK Skills V3 - Unified Hot Reload System
 *
 * Provides file watching and automatic reloading of skills.
 * Consolidates hot-reload implementations from V1, V2, and brain modules.
 *
 * Features:
 * - Single chokidar instance for all skill directories
 * - Debounced file event handling (300ms)
 * - File locking to prevent race conditions
 * - Memory leak protection
 * - Event emission for skill changes
 *
 * @module skills-v3/hot-reload
 */

import type { FSWatcher } from 'chokidar'
import type {
  HotReloadConfig,
  HotReloadEvent,
  HotReloadStats,
  SkillSource,
} from './types'
import { EventEmitter } from 'node:events'
import { homedir } from 'node:os'
import chokidar from 'chokidar'
import { join } from 'pathe'
import { parseSkillFile } from './parser'
import { getSkillRegistry } from './skill-registry'

// ============================================================================
// Constants
// ============================================================================

/** Default debounce delay (300ms) */
const DEFAULT_DEBOUNCE_DELAY = 300

/** Default home skills directory */
const DEFAULT_HOME_SKILLS_DIR = join(homedir(), '.claude', 'skills')

/** Default CCJK skills directory - uses ~/.claude/skills for Claude Code compatibility */
const DEFAULT_CCJK_SKILLS_DIR = join(homedir(), '.claude', 'skills')

/** Default local skills directory */
const DEFAULT_LOCAL_SKILLS_DIR = '.claude/skills'

/** Default ignore patterns */
const DEFAULT_IGNORED = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /\.DS_Store/,
  /Thumbs\.db/,
  /^\./, // Hidden files
  /~$/, // Backup files
  /\.tmp$/i,
  /\.swp$/i,
]

/** Valid skill file patterns */
const SKILL_FILE_PATTERNS = ['*.md', '*.MD', '*.markdown', '*.json']

// ============================================================================
// File Lock for Race Prevention
// ============================================================================

/**
 * Simple file lock mechanism to prevent race conditions
 */
class FileLock {
  private locks = new Map<string, NodeJS.Timeout>()

  acquire(filePath: string, timeout: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.locks.has(filePath)) {
        resolve(false)
        return
      }

      const timer = setTimeout(() => {
        this.locks.delete(filePath)
      }, timeout)

      this.locks.set(filePath, timer)
      resolve(true)
    })
  }

  release(filePath: string): void {
    const timer = this.locks.get(filePath)
    if (timer) {
      clearTimeout(timer)
      this.locks.delete(filePath)
    }
  }

  clear(): void {
    for (const timer of this.locks.values()) {
      clearTimeout(timer)
    }
    this.locks.clear()
  }
}

// ============================================================================
// Hot Reload Class
// ============================================================================

/**
 * Unified Hot Reload Manager
 *
 * Single chokidar instance for all skill watching with:
 * - Debounced event handling
 * - File locking to prevent race conditions
 * - Memory leak protection
 * - Automatic skill registration/unregistration
 */
export class HotReloadManager extends EventEmitter {
  private config: Required<HotReloadConfig>
  private watcher: FSWatcher | null = null
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private fileLock = new FileLock()
  private registry = getSkillRegistry()
  private stats: HotReloadStats = {
    watchedFiles: 0,
    registeredSkills: 0,
    totalAdds: 0,
    totalChanges: 0,
    totalUnlinks: 0,
    totalErrors: 0,
    isWatching: false,
  }

  constructor(config: Partial<HotReloadConfig> = {}) {
    super()

    this.config = {
      watchPaths: config.watchPaths || [
        DEFAULT_HOME_SKILLS_DIR,
        DEFAULT_CCJK_SKILLS_DIR,
        DEFAULT_LOCAL_SKILLS_DIR,
      ],
      watchHomeSkills: config.watchHomeSkills ?? true,
      watchLocalSkills: config.watchLocalSkills ?? true,
      recursive: config.recursive ?? true,
      debounceDelay: config.debounceDelay ?? DEFAULT_DEBOUNCE_DELAY,
      ignoreInitial: config.ignoreInitial ?? false,
      verbose: config.verbose ?? false,
      autoRegister: config.autoRegister ?? true,
      autoUnregister: config.autoUnregister ?? true,
      ignored: config.ignored || DEFAULT_IGNORED,
    }
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Start watching for skill changes
   */
  async start(): Promise<void> {
    if (this.watcher) {
      this.log('Watcher already running')
      return
    }

    this.log('Starting hot reload...')

    // Build watch paths
    const watchPaths = this.buildWatchPaths()

    if (watchPaths.length === 0) {
      this.log('No paths to watch')
      return
    }

    // Build ignore patterns
    const ignored = this.buildIgnorePatterns()

    // Create watcher (single chokidar instance)
    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: this.config.ignoreInitial,
      ignored,
      // @ts-expect-error - recursive option exists but not in types
      recursive: this.config.recursive,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    })

    // Set up event handlers
    this.setupWatchHandlers()

    // Wait for ready
    await new Promise<void>((resolve, reject) => {
      this.watcher!.on('ready', () => {
        this.stats.isWatching = true
        this.log('Watcher ready')
        this.emitEvent({
          type: 'ready',
          filePath: '',
          timestamp: Date.now(),
        })
        resolve()
      })

      this.watcher!.on('error', (error) => {
        this.log(`Watcher error: ${error}`, 'error')
        reject(error)
      })
    })

    // Scan existing files if not ignoring initial
    if (!this.config.ignoreInitial) {
      await this.scanExistingFiles(watchPaths)
    }
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (!this.watcher)
      return

    this.log('Stopping hot reload...')

    // Clear debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()

    // Clear file locks
    this.fileLock.clear()

    // Close watcher
    await this.watcher.close()
    this.watcher = null
    this.stats.isWatching = false

    this.log('Watcher stopped')
  }

  /**
   * Restart watcher
   */
  async restart(): Promise<void> {
    await this.stop()
    await this.start()
  }

  // ==========================================================================
  // Path Management
  // ==========================================================================

  /**
   * Add a watch path
   */
  addWatchPath(path: string): void {
    if (this.watcher) {
      this.watcher.add(path)
      this.log(`Added watch path: ${path}`)
    }
    else {
      this.config.watchPaths.push(path)
    }
  }

  /**
   * Remove a watch path
   */
  removeWatchPath(path: string): void {
    if (this.watcher) {
      this.watcher.unwatch(path)
      this.log(`Removed watch path: ${path}`)
    }
    else {
      const index = this.config.watchPaths.indexOf(path)
      if (index > -1) {
        this.config.watchPaths.splice(index, 1)
      }
    }
  }

  /**
   * Get watched paths
   */
  getWatchedPaths(): string[] {
    const watched = this.watcher?.getWatched()
    if (Array.isArray(watched))
      return watched
    return watched ? Object.values(watched).flat() : []
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get current statistics
   */
  getStats(): HotReloadStats {
    return { ...this.stats }
  }

  // ==========================================================================
  // Manual Operations
  // ==========================================================================

  /**
   * Manually trigger a file scan
   */
  async scanFile(filePath: string): Promise<void> {
    this.log(`Scanning file: ${filePath}`)
    await this.handleFileAdd(filePath)
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Build list of paths to watch
   */
  private buildWatchPaths(): string[] {
    const paths: string[] = []

    // Add custom paths
    paths.push(...this.config.watchPaths)

    // Add home skills directory
    if (this.config.watchHomeSkills) {
      paths.push(DEFAULT_HOME_SKILLS_DIR)
    }

    // Add local skills directory
    if (this.config.watchLocalSkills) {
      paths.push(DEFAULT_LOCAL_SKILLS_DIR)
    }

    this.log(`Watching ${paths.length} paths`)
    return paths
  }

  /**
   * Build ignore patterns
   */
  private buildIgnorePatterns(): (string | RegExp | ((path: string) => boolean))[] {
    return [...DEFAULT_IGNORED, ...(this.config.ignored || [])]
  }

  /**
   * Set up chokidar event handlers
   */
  private setupWatchHandlers(): void {
    if (!this.watcher)
      return

    // File added
    this.watcher.on('add', (filePath) => {
      this.debounce(filePath, 'add', () => this.handleFileAdd(filePath))
    })

    // File changed
    this.watcher.on('change', (filePath) => {
      this.debounce(filePath, 'change', () => this.handleFileChange(filePath))
    })

    // File removed
    this.watcher.on('unlink', (filePath) => {
      this.debounce(filePath, 'unlink', () => this.handleFileUnlink(filePath))
    })

    // Directory events (for stats)
    this.watcher.on('addDir', () => {
      this.stats.watchedFiles++
    })

    this.watcher.on('unlinkDir', () => {
      this.stats.watchedFiles--
    })
  }

  /**
   * Debounce file events
   */
  private debounce(
    filePath: string,
    type: string,
    handler: () => Promise<void>,
  ): void {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(filePath)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        // Acquire file lock to prevent race conditions
        const acquired = await this.fileLock.acquire(filePath)
        if (!acquired) {
          this.log(`File locked, skipping ${type}: ${filePath}`)
          return
        }

        try {
          await handler()
        }
        finally {
          this.fileLock.release(filePath)
        }
      }
      catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        this.log(`Error handling ${type} for ${filePath}: ${errorMsg}`, 'error')
      }
      finally {
        this.debounceTimers.delete(filePath)
      }
    }, this.config.debounceDelay)

    this.debounceTimers.set(filePath, timer)
  }

  /**
   * Handle file add event
   */
  private async handleFileAdd(filePath: string): Promise<void> {
    if (!this.isSkillFile(filePath))
      return

    this.log(`Skill file added: ${filePath}`)

    const parseResult = parseSkillFile(filePath)

    if (!parseResult.success || !parseResult.skill) {
      this.stats.totalErrors++
      this.emitEvent({
        type: 'error',
        filePath,
        timestamp: Date.now(),
        error: parseResult.error || 'Unknown parse error',
      })
      return
    }

    if (this.config.autoRegister) {
      const source = this.determineSource(filePath)
      const entry = this.registry.register(parseResult.skill, filePath, source)
      this.stats.totalAdds++
      this.stats.registeredSkills++

      this.emitEvent({
        type: 'add',
        filePath,
        timestamp: Date.now(),
        entry,
      })
    }
  }

  /**
   * Handle file change event
   */
  private async handleFileChange(filePath: string): Promise<void> {
    if (!this.isSkillFile(filePath))
      return

    this.log(`Skill file changed: ${filePath}`)

    const previousEntry = this.registry.getByPath(filePath)
    const parseResult = parseSkillFile(filePath)

    if (!parseResult.success || !parseResult.skill) {
      this.stats.totalErrors++
      this.emitEvent({
        type: 'error',
        filePath,
        timestamp: Date.now(),
        error: parseResult.error || 'Unknown parse error',
      })
      return
    }

    if (this.config.autoRegister) {
      const source = this.determineSource(filePath)
      const entry = this.registry.register(parseResult.skill, filePath, source)
      this.stats.totalChanges++

      this.emitEvent({
        type: 'change',
        filePath,
        timestamp: Date.now(),
        entry,
        previousEntry: previousEntry || undefined,
      })
    }
  }

  /**
   * Handle file unlink event
   */
  private async handleFileUnlink(filePath: string): Promise<void> {
    if (!this.isSkillFile(filePath))
      return

    this.log(`Skill file removed: ${filePath}`)

    const entry = this.registry.getByPath(filePath)

    if (this.config.autoUnregister) {
      this.registry.unregisterByPath(filePath)
    }

    this.stats.totalUnlinks++

    this.emitEvent({
      type: 'unlink',
      filePath,
      timestamp: Date.now(),
      entry: entry || undefined,
    })
  }

  /**
   * Scan existing files
   */
  private async scanExistingFiles(watchPaths: string[]): Promise<void> {
    this.log('Scanning existing files...')

    const { glob } = await import('glob')

    for (const basePath of watchPaths) {
      try {
        const files = await glob(SKILL_FILE_PATTERNS, {
          cwd: basePath,
          absolute: true,
          nodir: true,
        })

        this.log(`Found ${files.length} skill files in ${basePath}`)

        for (const filePath of files) {
          await this.handleFileAdd(filePath)
        }
      }
      catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        this.log(`Error scanning ${basePath}: ${errorMsg}`, 'error')
      }
    }
  }

  /**
   * Check if a file is a skill file
   */
  private isSkillFile(filePath: string): boolean {
    const basename = filePath.split('/').pop() || ''
    const upperBasename = basename.toUpperCase()

    // Check for SKILL.md or skill.md
    if (upperBasename === 'SKILL.MD' || upperBasename === 'SKILL.MD') {
      return true
    }

    // Check for .md extension in skills directory
    if (filePath.includes('/skills/') || filePath.includes('\\skills\\')) {
      return filePath.endsWith('.md')
    }

    // Check for .json files in skills directory
    if (filePath.includes('/skills/') || filePath.includes('\\skills\\')) {
      return filePath.endsWith('.json')
    }

    return false
  }

  /**
   * Determine skill source from path
   */
  private determineSource(filePath: string): SkillSource {
    if (filePath.includes('.ccjk/skills') || filePath.includes('node_modules')) {
      return 'builtin'
    }
    if (filePath.includes(homedir())) {
      return 'user'
    }
    return 'user'
  }

  /**
   * Emit hot reload event
   */
  private emitEvent(event: HotReloadEvent): void {
    this.stats.lastEventAt = event.timestamp

    // Emit typed events
    this.emit(event.type, event)
    this.emit('event', event)

    // Log if verbose
    if (this.config.verbose) {
      this.log(`Event: ${event.type} - ${event.filePath || '(system)'}`)
    }
  }

  /**
   * Log message
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = '[SkillsV3 HotReload]'
    switch (level) {
      case 'warn':
        console.warn(prefix, message)
        break
      case 'error':
        console.error(prefix, message)
        break
      default:
        if (this.config.verbose) {
          console.log(prefix, message)
        }
    }
  }
}

// ============================================================================
// Singleton & Utilities
// ============================================================================

let hotReloadInstance: HotReloadManager | null = null

/**
 * Get singleton hot reload instance
 */
export function getHotReloadManager(config?: Partial<HotReloadConfig>): HotReloadManager {
  if (!hotReloadInstance) {
    hotReloadInstance = new HotReloadManager(config)
  }
  return hotReloadInstance
}

/**
 * Reset hot reload instance (for testing)
 */
export async function resetHotReloadManager(): Promise<void> {
  if (hotReloadInstance) {
    await hotReloadManager.stop()
    hotReloadInstance.removeAllListeners()
    hotReloadInstance = null
  }
}

/**
 * Start hot reload
 */
export async function startHotReload(config?: Partial<HotReloadConfig>): Promise<HotReloadManager> {
  const manager = getHotReloadManager(config)
  await manager.start()
  return manager
}

/**
 * Stop hot reload
 */
export async function stopHotReload(): Promise<void> {
  await resetHotReloadManager()
}

/**
 * Get hot reload statistics
 */
export function getHotReloadStats(): HotReloadStats {
  return getHotReloadManager().getStats()
}

// Re-export for convenience
export const hotReloadManager = new HotReloadManager()
