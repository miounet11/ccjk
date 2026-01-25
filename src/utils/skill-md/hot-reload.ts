/**
 * Skill Hot Reload System Module
 *
 * Provides real-time file watching and hot reloading for SKILL.md files,
 * supporting Claude Code 2.1.x's skill file modification feature.
 *
 * Features:
 * - Real-time file system watching with chokidar
 * - Automatic skill cache updates on file changes
 * - Debounced reload to prevent excessive updates
 * - Event-driven architecture for integration
 * - Cross-platform compatibility
 *
 * @module utils/skill-md/hot-reload
 *
 * @deprecated This module is deprecated since v8.3.0.
 * Use `src/brain/skill-hot-reload.ts` (SkillHotReload class) instead,
 * which provides more comprehensive features including:
 * - Integration with SkillRegistry and MessageBus
 * - Better error handling and statistics
 * - Support for multiple skill file patterns
 *
 * Migration guide:
 * ```typescript
 * // Old (deprecated):
 * import { SkillHotReloader } from '@/utils/skill-md/hot-reload'
 * const reloader = new SkillHotReloader()
 * reloader.watch()
 *
 * // New (recommended):
 * import { getSkillHotReload, startSkillHotReload } from '@/brain'
 * const hotReload = await startSkillHotReload()
 * // or
 * const hotReload = getSkillHotReload(options)
 * await hotReload.start()
 * ```
 *
 * This module will be removed in v9.0.0.
 */

import type { FSWatcher } from 'chokidar'
import type { SkillMdFile } from '../../types/skill-md.js'
import { EventEmitter } from 'node:events'
import { basename } from 'node:path'
import { watch } from 'chokidar'
import { SkillCache } from './cache.js'
import { SkillDiscovery } from './discovery.js'
import { parseSkillMdFile } from './parser.js'

/**
 * Hot reload event types
 */
export type HotReloadEventType = 'added' | 'changed' | 'removed'

/**
 * Hot reload event data
 *
 * Contains information about a skill file change event.
 */
export interface HotReloadEvent {
  /** Event type (added, changed, or removed) */
  type: HotReloadEventType

  /** The skill that was affected */
  skill: SkillMdFile

  /** File path that triggered the event */
  filePath: string

  /** Event timestamp */
  timestamp: Date
}

/**
 * Hot reload configuration options
 */
export interface HotReloadOptions {
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
}

/**
 * Skill hot reloader
 *
 * Watches skill directories for changes and automatically updates
 * the skill cache when SKILL.md files are added, modified, or removed.
 *
 * Extends EventEmitter to provide event-driven notifications:
 * - `skill-added`: Emitted when a new skill is detected
 * - `skill-changed`: Emitted when an existing skill is modified
 * - `skill-removed`: Emitted when a skill is deleted
 * - `error`: Emitted when an error occurs during reload
 *
 * @example
 * ```typescript
 * const reloader = new SkillHotReloader()
 *
 * // Listen for skill changes
 * reloader.on('skill-changed', (event: HotReloadEvent) => {
 *   console.log(`Skill ${event.skill.metadata.name} was updated`)
 * })
 *
 * // Start watching default directories
 * reloader.watch()
 *
 * // Stop watching
 * reloader.stop()
 * ```
 *
 * @deprecated Use `SkillHotReload` from `@/brain/skill-hot-reload` instead.
 * This class will be removed in v9.0.0.
 */
export class SkillHotReloader extends EventEmitter {
  private watcher: FSWatcher | null = null
  private skillCache: SkillCache
  public discovery: SkillDiscovery
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private options: Required<HotReloadOptions>

  /**
   * Create a new skill hot reloader
   *
   * @param options - Hot reload configuration options
   *
   * @example
   * ```typescript
   * const reloader = new SkillHotReloader({
   *   debounceMs: 500,
   *   ignoreInitial: true
   * })
   * ```
   */
  constructor(options: HotReloadOptions = {}) {
    super()

    this.skillCache = new SkillCache()
    this.discovery = new SkillDiscovery()

    // Set default options
    this.options = {
      debounceMs: options.debounceMs ?? 300,
      ignoreInitial: options.ignoreInitial ?? true,
      watchAdded: options.watchAdded ?? true,
      watchChanged: options.watchChanged ?? true,
      watchRemoved: options.watchRemoved ?? true,
    }
  }

  /**
   * Start watching skill directories
   *
   * Begins monitoring the specified directories (or default directories)
   * for SKILL.md file changes. Automatically loads existing skills into
   * cache on startup.
   *
   * @param skillsDirs - Directories to watch (default: ['~/.claude/skills', '.claude/skills'])
   *
   * @example
   * ```typescript
   * const reloader = new SkillHotReloader()
   *
   * // Watch default directories
   * reloader.watch()
   *
   * // Watch custom directories
   * reloader.watch(['/custom/skills', '/shared/skills'])
   * ```
   */
  watch(skillsDirs?: string[]): void {
    if (this.watcher) {
      throw new Error('Hot reloader is already watching. Call stop() first.')
    }

    // Use provided directories or default ones
    const dirs = skillsDirs || this.discovery.getDefaultDirs()

    // Initialize chokidar watcher - watch directories, not glob patterns
    this.watcher = watch(dirs, {
      ignoreInitial: this.options.ignoreInitial,
      persistent: true,
      depth: 99, // Watch all subdirectories
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    })

    // Set up event handlers
    if (this.options.watchAdded) {
      this.watcher.on('add', (filePath: string) => {
        // Only handle SKILL.md files
        if (basename(filePath) === 'SKILL.md') {
          this.handleFileChange('added', filePath)
        }
      })
    }

    if (this.options.watchChanged) {
      this.watcher.on('change', (filePath: string) => {
        // Only handle SKILL.md files
        if (basename(filePath) === 'SKILL.md') {
          this.handleFileChange('changed', filePath)
        }
      })
    }

    if (this.options.watchRemoved) {
      this.watcher.on('unlink', (filePath: string) => {
        // Only handle SKILL.md files
        if (basename(filePath) === 'SKILL.md') {
          this.handleFileRemove(filePath)
        }
      })
    }

    // Handle watcher errors
    this.watcher.on('error', (error: unknown) => {
      this.emit('error', error instanceof Error ? error : new Error(String(error)), 'watcher')
    })

    // Emit ready event when watcher is ready
    this.watcher.on('ready', () => {
      this.emit('ready')
    })

    // Load existing skills into cache if not ignoring initial
    if (!this.options.ignoreInitial) {
      this.reloadAll().catch((error) => {
        this.emit('error', error, 'initial-load')
      })
    }
  }

  /**
   * Stop watching skill directories
   *
   * Stops the file watcher and clears all debounce timers.
   * Does not clear the skill cache.
   *
   * @example
   * ```typescript
   * reloader.stop()
   * console.log('Stopped watching for skill changes')
   * ```
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }

  /**
   * Get a cached skill
   *
   * @param name - Skill name
   * @returns Cached skill or null if not found
   *
   * @example
   * ```typescript
   * const skill = reloader.getSkill('git-commit')
   * if (skill) {
   *   console.log(skill.metadata.description)
   * }
   * ```
   */
  getSkill(name: string): SkillMdFile | null {
    return this.skillCache.get(name)
  }

  /**
   * Get all cached skills
   *
   * @returns Array of all cached skills
   *
   * @example
   * ```typescript
   * const allSkills = reloader.getAllSkills()
   * console.log(`Cache contains ${allSkills.length} skills`)
   * ```
   */
  getAllSkills(): SkillMdFile[] {
    return this.skillCache.getAll()
  }

  /**
   * Check if a skill is cached
   *
   * @param name - Skill name
   * @returns true if skill is in cache
   *
   * @example
   * ```typescript
   * if (reloader.isCached('git-commit')) {
   *   console.log('Skill is cached')
   * }
   * ```
   */
  isCached(name: string): boolean {
    return this.skillCache.has(name)
  }

  /**
   * Manually reload a single skill
   *
   * Forces a reload of a specific skill file, bypassing debounce.
   * Useful for manual refresh operations.
   *
   * @param filePath - Path to SKILL.md file
   * @returns Reloaded skill
   * @throws Error if file cannot be parsed
   *
   * @example
   * ```typescript
   * try {
   *   const skill = await reloader.reloadSkill('/path/to/SKILL.md')
   *   console.log(`Reloaded: ${skill.metadata.name}`)
   * } catch (error) {
   *   console.error('Failed to reload skill:', error)
   * }
   * ```
   */
  async reloadSkill(filePath: string): Promise<SkillMdFile> {
    const skill = await parseSkillMdFile(filePath)
    this.skillCache.set(skill)
    return skill
  }

  /**
   * Manually reload all skills
   *
   * Scans all watched directories and reloads all skills into cache.
   * Useful for initial load or manual refresh.
   *
   * @example
   * ```typescript
   * await reloader.reloadAll()
   * console.log('All skills reloaded')
   * ```
   */
  async reloadAll(): Promise<void> {
    const skills = await this.discovery.scanDefaultDirs()

    for (const skill of skills) {
      this.skillCache.set(skill)
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   *
   * @example
   * ```typescript
   * const stats = reloader.getCacheStats()
   * console.log(`Total skills: ${stats.totalSkills}`)
   * console.log(`Total accesses: ${stats.totalAccesses}`)
   * ```
   */
  getCacheStats(): {
    totalSkills: number
    totalAccesses: number
    averageAccesses: number
    oldestLoadedAt: Date | null
    newestLoadedAt: Date | null
  } {
    return this.skillCache.getStats()
  }

  /**
   * Get recently used skills
   *
   * @param limit - Maximum number of skills to return
   * @returns Array of recently used skills
   *
   * @example
   * ```typescript
   * const recent = reloader.getRecentlyUsed(5)
   * recent.forEach(skill => {
   *   console.log(`- ${skill.metadata.name}`)
   * })
   * ```
   */
  getRecentlyUsed(limit?: number): SkillMdFile[] {
    return this.skillCache.getRecentlyUsed(limit)
  }

  /**
   * Get most frequently used skills
   *
   * @param limit - Maximum number of skills to return
   * @returns Array of most frequently used skills
   *
   * @example
   * ```typescript
   * const popular = reloader.getMostUsed(10)
   * popular.forEach(skill => {
   *   console.log(`- ${skill.metadata.name}`)
   * })
   * ```
   */
  getMostUsed(limit?: number): SkillMdFile[] {
    return this.skillCache.getMostUsed(limit)
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

      // Reload the skill
      this.reloadSkill(filePath)
        .then((skill) => {
          const event: HotReloadEvent = {
            type,
            skill,
            filePath,
            timestamp: new Date(),
          }

          // Emit appropriate event
          if (type === 'added') {
            this.emit('skill-added', event)
          }
          else {
            this.emit('skill-changed', event)
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
   * Removes the skill from cache and emits removal event.
   *
   * @param filePath - File path that was removed
   *
   * @private
   */
  private handleFileRemove(filePath: string): void {
    // Try to get the skill before removing it
    const allSkills = this.skillCache.getAll()
    const removedSkill = allSkills.find(skill => skill.filePath === filePath)

    if (removedSkill) {
      // Remove from cache
      this.skillCache.remove(removedSkill.metadata.name)

      // Emit removal event
      const event: HotReloadEvent = {
        type: 'removed',
        skill: removedSkill,
        filePath,
        timestamp: new Date(),
      }

      this.emit('skill-removed', event)
    }
  }
}
