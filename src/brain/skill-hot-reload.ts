/**
 * Skill Hot Reload - File watching and automatic skill reloading
 *
 * This module provides hot-reload capabilities for SKILL.md files using
 * chokidar for file system watching. It integrates with the skill registry
 * to automatically add, update, and remove skills as files change.
 *
 * @module brain/skill-hot-reload
 */

import type { FSWatcher } from 'chokidar'
import type { SkillParseResult } from './skill-parser'
import type { SkillRegistryEntry } from './skill-registry'
import type { MessageType } from './types'
import { EventEmitter } from 'node:events'
import { homedir } from 'node:os'
import chokidar from 'chokidar'
import { basename, join } from 'pathe'
import { getMessageBus } from './message-bus'
import { getSkillParser, isSkillFile as isSkillFileCanonical } from './skill-parser'
import { getSkillRegistry } from './skill-registry'

// ============================================================================
// Types
// ============================================================================

/**
 * Hot reload event types
 */
export type HotReloadEventType
  = | 'add' // New skill file added
    | 'change' // Skill file modified
    | 'unlink' // Skill file removed
    | 'error' // Parse or watch error
    | 'ready' // Watcher ready
    | 'raw' // Raw chokidar event

/**
 * Hot reload event payload
 */
export interface HotReloadEvent {
  /** Event type */
  type: HotReloadEventType

  /** File path */
  filePath: string

  /** Timestamp */
  timestamp: number

  /** Skill entry (for add/change events) */
  entry?: SkillRegistryEntry

  /** Parse result (for add/change events) */
  parseResult?: SkillParseResult

  /** Previous entry (for change events) */
  previousEntry?: SkillRegistryEntry

  /** Error message (for error events) */
  error?: string

  /** Raw event data */
  raw?: unknown
}

/**
 * Hot reload configuration options
 */
export interface HotReloadOptions {
  /** Paths to watch for skill files */
  watchPaths?: string[]

  /** Whether to watch user's home directory skills */
  watchHomeSkills?: boolean

  /** Whether to watch current directory skills */
  watchLocalSkills?: boolean

  /** Whether to enable recursive watching */
  recursive?: boolean

  /** Debounce delay for file changes (ms) */
  debounceDelay?: number

  /** Whether to ignore initial add events */
  ignoreInitial?: boolean

  /** Custom ignore patterns */
  ignored?: string | RegExp | (string | RegExp)[] | ((path: string) => boolean)

  /** Whether to emit verbose logging */
  verbose?: boolean

  /** Auto-register skills on add */
  autoRegister?: boolean

  /** Auto-unregister skills on unlink */
  autoUnregister?: boolean

  /** Callback for hot reload events */
  onEvent?: (event: HotReloadEvent) => void
}

/**
 * Hot reload statistics
 */
export interface HotReloadStats {
  /** Number of files being watched */
  watchedFiles: number

  /** Number of skills registered via hot reload */
  registeredSkills: number

  /** Total number of add events processed */
  totalAdds: number

  /** Total number of change events processed */
  totalChanges: number

  /** Total number of unlink events processed */
  totalUnlinks: number

  /** Total number of errors */
  totalErrors: number

  /** Watcher state */
  isWatching: boolean

  /** Last event timestamp */
  lastEventAt?: number
}

// ============================================================================
// Constants
// ============================================================================

/** Default skill directory in user's home */
const DEFAULT_HOME_SKILLS_DIR = join(homedir(), '.claude', 'skills')

/** Default local skills directory */
const DEFAULT_LOCAL_SKILLS_DIR = '.claude/skills'

/** Default debounce delay (300ms) */
const DEFAULT_DEBOUNCE_DELAY = 300

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
const SKILL_FILE_PATTERNS = [
  '*.md',
  '*.MD',
  '*.markdown',
  '**/SKILL.md',
  '**/skill.md',
]

// ============================================================================
// Skill Hot Reload Class
// ============================================================================

/**
 * Skill Hot Reload Manager
 *
 * Watches skill file directories and automatically updates the
 * skill registry when files change.
 *
 * @example
 * ```typescript
 * const hotReload = new SkillHotReload({
 *   watchHomeSkills: true,
 *   watchLocalSkills: true,
 *   verbose: true,
 * })
 *
 * await hotReload.start()
 *
 * // Listen to events
 * hotReload.on('add', (event) => {
 *   console.log('New skill:', event.entry?.id)
 * })
 * ```
 */
export class SkillHotReload extends EventEmitter {
  private options: Required<Omit<HotReloadOptions, 'onEvent' | 'ignored'>>
  private customIgnored: HotReloadOptions['ignored']
  private watcher: FSWatcher | null = null
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private parser = getSkillParser()
  private registry = getSkillRegistry()
  private messageBus = getMessageBus()

  private stats: HotReloadStats = {
    watchedFiles: 0,
    registeredSkills: 0,
    totalAdds: 0,
    totalChanges: 0,
    totalUnlinks: 0,
    totalErrors: 0,
    isWatching: false,
  }

  constructor(options: HotReloadOptions = {}) {
    super()

    // Apply defaults
    this.options = {
      watchPaths: options.watchPaths || [],
      watchHomeSkills: options.watchHomeSkills ?? true,
      watchLocalSkills: options.watchLocalSkills ?? true,
      recursive: options.recursive ?? true,
      debounceDelay: options.debounceDelay ?? DEFAULT_DEBOUNCE_DELAY,
      ignoreInitial: options.ignoreInitial ?? false,
      verbose: options.verbose ?? false,
      autoRegister: options.autoRegister ?? true,
      autoUnregister: options.autoUnregister ?? true,
    }

    this.customIgnored = options.ignored

    // Register event callback if provided
    if (options.onEvent) {
      this.on('event', options.onEvent)
    }
  }

  /**
   * Start watching for skill file changes
   */
  async start(): Promise<void> {
    if (this.watcher) {
      this.log('Watcher already running')
      return
    }

    this.log('Starting skill hot reload...')

    // Build watch paths
    const watchPaths = this.buildWatchPaths()

    if (watchPaths.length === 0) {
      this.log('No paths to watch')
      return
    }

    // Build ignore patterns
    const ignored = this.buildIgnorePatterns()

    // Create watcher
    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: this.options.ignoreInitial,
      ignored,
      // @ts-expect-error - recursive option exists but not in types
      recursive: this.options.recursive,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    })

    // Set up event handlers
    this.setupWatchHandlers()

    // Wait for watcher to be ready
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
    if (!this.options.ignoreInitial) {
      await this.scanExistingFiles(watchPaths)
    }
  }

  /**
   * Stop watching for skill file changes
   */
  async stop(): Promise<void> {
    if (!this.watcher) {
      return
    }

    this.log('Stopping skill hot reload...')

    // Clear debounce timers
    Array.from(this.debounceTimers.values()).forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()

    // Close watcher
    await this.watcher.close()
    this.watcher = null
    this.stats.isWatching = false

    this.log('Watcher stopped')
  }

  /**
   * Restart the watcher
   */
  async restart(): Promise<void> {
    await this.stop()
    await this.start()
  }

  /**
   * Add a path to watch
   *
   * @param path - Path to add
   */
  addWatchPath(path: string): void {
    if (this.watcher) {
      this.watcher.add(path)
      this.log(`Added watch path: ${path}`)
    }
    else {
      this.options.watchPaths.push(path)
    }
  }

  /**
   * Remove a path from watching
   *
   * @param path - Path to remove
   */
  removeWatchPath(path: string): void {
    if (this.watcher) {
      this.watcher.unwatch(path)
      this.log(`Removed watch path: ${path}`)
    }
    else {
      const index = this.options.watchPaths.indexOf(path)
      if (index > -1) {
        this.options.watchPaths.splice(index, 1)
      }
    }
  }

  /**
   * Get hot reload statistics
   */
  getStats(): HotReloadStats {
    return { ...this.stats }
  }

  /**
   * Get list of watched paths
   */
  getWatchedPaths(): string[] {
    const watched = this.watcher?.getWatched()
    // chokidar returns either string[] or Record<string, string[]>
    if (Array.isArray(watched))
      return watched
    return watched ? Object.values(watched).flat() : []
  }

  /**
   * Manually trigger a scan of a file
   *
   * @param filePath - Path to scan
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
    paths.push(...this.options.watchPaths)

    // Add home skills directory
    if (this.options.watchHomeSkills) {
      paths.push(DEFAULT_HOME_SKILLS_DIR)
    }

    // Add local skills directory
    if (this.options.watchLocalSkills) {
      paths.push(DEFAULT_LOCAL_SKILLS_DIR)
    }

    this.log(`Watching ${paths.length} paths: ${paths.join(', ')}`)
    return paths
  }

  /**
   * Build ignore patterns for chokidar
   */
  private buildIgnorePatterns(): (string | RegExp | ((path: string) => boolean))[] {
    const patterns: (string | RegExp | ((path: string) => boolean))[] = [
      ...DEFAULT_IGNORED,
    ]

    if (this.customIgnored) {
      if (Array.isArray(this.customIgnored)) {
        patterns.push(...this.customIgnored)
      }
      else {
        patterns.push(this.customIgnored)
      }
    }

    return patterns
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

    // Directory events
    this.watcher.on('addDir', (dirPath) => {
      this.log(`Directory added: ${dirPath}`)
      this.stats.watchedFiles++
    })

    this.watcher.on('unlinkDir', (dirPath) => {
      this.log(`Directory removed: ${dirPath}`)
    })

    // Raw event
    this.watcher.on('raw', (event, path, details) => {
      this.emitEvent({
        type: 'raw',
        filePath: path || '',
        timestamp: Date.now(),
        raw: { event, details },
      })
    })
  }

  /**
   * Handle file add event
   */
  private async handleFileAdd(filePath: string): Promise<void> {
    if (!this.isSkillFile(filePath))
      return

    this.log(`Skill file added: ${filePath}`)

    const parseResult = this.parser.parseFile(filePath)

    if (!parseResult.success) {
      this.stats.totalErrors++
      this.emitEvent({
        type: 'error',
        filePath,
        timestamp: Date.now(),
        error: parseResult.error,
      })
      return
    }

    const skill = parseResult.skill!
    const entry = this.registry.register(skill, this.getSkillSource(filePath))

    this.stats.totalAdds++
    this.stats.registeredSkills++

    this.emitEvent({
      type: 'add',
      filePath,
      timestamp: Date.now(),
      entry,
      parseResult,
    })

    this.publishMessage('skill:added' as MessageType, { entry, filePath })
  }

  /**
   * Handle file change event
   */
  private async handleFileChange(filePath: string): Promise<void> {
    if (!this.isSkillFile(filePath))
      return

    this.log(`Skill file changed: ${filePath}`)

    const previousEntry = this.registry.getByPath(filePath)

    const parseResult = this.parser.parseFile(filePath)

    if (!parseResult.success) {
      this.stats.totalErrors++
      this.emitEvent({
        type: 'error',
        filePath,
        timestamp: Date.now(),
        error: parseResult.error,
      })
      return
    }

    const skill = parseResult.skill!
    const entry = this.registry.register(skill, this.getSkillSource(filePath))

    this.stats.totalChanges++

    this.emitEvent({
      type: 'change',
      filePath,
      timestamp: Date.now(),
      entry,
      parseResult,
      previousEntry: previousEntry || undefined,
    })

    this.publishMessage('skill:changed' as MessageType, { entry, previousEntry, filePath })
  }

  /**
   * Handle file unlink event
   */
  private async handleFileUnlink(filePath: string): Promise<void> {
    if (!this.isSkillFile(filePath))
      return

    this.log(`Skill file removed: ${filePath}`)

    const entry = this.registry.getByPath(filePath)

    if (this.options.autoUnregister) {
      this.registry.unregisterByPath(filePath)
    }

    this.stats.totalUnlinks++

    this.emitEvent({
      type: 'unlink',
      filePath,
      timestamp: Date.now(),
      entry: entry || undefined,
    })

    if (entry) {
      this.publishMessage('skill:removed' as MessageType, { entry, filePath })
    }
  }

  /**
   * Scan existing files in watch paths
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
   * Debounce file events
   */
  private debounce(
    filePath: string,
    type: string,
    handler: () => Promise<void>,
  ): void {
    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        await handler()
      }
      catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        this.log(`Error handling ${type} event for ${filePath}: ${errorMsg}`, 'error')
      }
      finally {
        this.debounceTimers.delete(filePath)
      }
    }, this.options.debounceDelay)

    this.debounceTimers.set(filePath, timer)
  }

  /**
   * Check if a file is a skill file
   *
   * Delegates to the canonical `isSkillFile` from skill-parser,
   * with additional checks for files in skills directories.
   */
  private isSkillFile(filePath: string): boolean {
    // First check using canonical implementation
    if (isSkillFileCanonical(filePath)) {
      return true
    }

    // Additional check: .md files in skills directory
    const fileBasename = basename(filePath)
    if (filePath.includes('/skills/') || filePath.includes('\\skills\\')) {
      return fileBasename.endsWith('.md')
    }

    return false
  }

  /**
   * Determine skill source from file path
   */
  private getSkillSource(filePath: string): 'builtin' | 'user' | 'marketplace' {
    if (filePath.includes('.claude/skills') || filePath.includes('node_modules')) {
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
    if (this.options.verbose) {
      this.log(`Event: ${event.type} - ${event.filePath || '(system)'}`)
    }
  }

  /**
   * Publish message to event bus
   */
  private publishMessage(type: string, payload: Record<string, unknown>): void {
    this.messageBus.publish(
      'notification',
      'coordinator',
      'all',
      `Skill hot reload: ${type}`,
      payload,
      { priority: 'normal' },
    ).catch(console.error)
  }

  /**
   * Log message
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = '[SkillHotReload]'
    switch (level) {
      case 'warn':
        console.warn(prefix, message)
        break
      case 'error':
        console.error(prefix, message)
        break
      default:
        if (this.options.verbose) {
          console.log(prefix, message)
        }
    }
  }
}

// ============================================================================
// Event Type Definitions
// ============================================================================

export interface SkillHotReloadEvents {
  /** New skill file added */
  add: (event: HotReloadEvent) => void

  /** Skill file modified */
  change: (event: HotReloadEvent) => void

  /** Skill file removed */
  unlink: (event: HotReloadEvent) => void

  /** Parse or watch error */
  error: (event: HotReloadEvent) => void

  /** Watcher ready */
  ready: (event: HotReloadEvent) => void

  /** Raw chokidar event */
  raw: (event: HotReloadEvent) => void

  /** Any hot reload event */
  event: (event: HotReloadEvent) => void
}

// ============================================================================
// Singleton Instance
// ============================================================================

let hotReloadInstance: SkillHotReload | null = null

/**
 * Get the singleton SkillHotReload instance
 */
export function getSkillHotReload(options?: HotReloadOptions): SkillHotReload {
  if (!hotReloadInstance) {
    hotReloadInstance = new SkillHotReload(options)
  }
  return hotReloadInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export async function resetSkillHotReload(): Promise<void> {
  if (hotReloadInstance) {
    await hotReloadInstance.stop()
    hotReloadInstance.removeAllListeners()
    hotReloadInstance = null
  }
}

/**
 * Create a new SkillHotReload instance with custom options
 */
export function createSkillHotReload(options: HotReloadOptions): SkillHotReload {
  return new SkillHotReload(options)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Start skill hot reload with default options
 *
 * @param options - Optional configuration
 * @returns Hot reload instance
 */
export async function startSkillHotReload(options?: HotReloadOptions): Promise<SkillHotReload> {
  const hotReload = getSkillHotReload(options)
  await hotReload.start()
  return hotReload
}

/**
 * Stop skill hot reload
 */
export async function stopSkillHotReload(): Promise<void> {
  await resetSkillHotReload()
}

/**
 * Get skill hot reload statistics
 *
 * @returns Current statistics
 */
export function getSkillHotReloadStats(): HotReloadStats {
  return getSkillHotReload().getStats()
}
