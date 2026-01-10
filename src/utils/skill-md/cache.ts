/**
 * Skill Cache Management Module
 *
 * Provides caching functionality for SKILL.md files with access tracking
 * and usage statistics for prioritization and optimization.
 *
 * @module utils/skill-md/cache
 */

import type { SkillMdFile } from '../../types/skill-md.js'

/**
 * Cached skill entry with metadata
 *
 * Tracks skill access patterns for optimization and prioritization.
 */
export interface CachedSkill {
  /** The cached skill */
  skill: SkillMdFile

  /** When the skill was loaded into cache */
  loadedAt: Date

  /** Number of times the skill has been accessed */
  accessCount: number

  /** Last time the skill was accessed */
  lastAccessedAt: Date
}

/**
 * Skill cache manager
 *
 * Manages in-memory cache of parsed SKILL.md files with access tracking
 * for performance optimization and usage analytics.
 *
 * Features:
 * - Fast in-memory skill lookup
 * - Access pattern tracking
 * - Recently used skill prioritization
 * - Most frequently used skill identification
 *
 * @example
 * ```typescript
 * const cache = new SkillCache()
 *
 * // Add skill to cache
 * cache.set(parsedSkill)
 *
 * // Get skill from cache
 * const skill = cache.get('git-commit')
 *
 * // Get recently used skills
 * const recent = cache.getRecentlyUsed(5)
 *
 * // Get most frequently used skills
 * const popular = cache.getMostUsed(10)
 * ```
 */
export class SkillCache {
  private cache: Map<string, CachedSkill> = new Map()

  /**
   * Add or update a skill in the cache
   *
   * If the skill already exists, it updates the skill content
   * and resets the loaded time while preserving access statistics.
   *
   * @param skill - Skill to cache
   *
   * @example
   * ```typescript
   * const skill = await parseSkillMdFile('/path/to/SKILL.md')
   * cache.set(skill)
   * ```
   */
  set(skill: SkillMdFile): void {
    const existing = this.cache.get(skill.metadata.name)

    if (existing) {
      // Update existing entry, preserve access stats
      existing.skill = skill
      existing.loadedAt = new Date()
    }
    else {
      // Create new entry
      this.cache.set(skill.metadata.name, {
        skill,
        loadedAt: new Date(),
        accessCount: 0,
        lastAccessedAt: new Date(),
      })
    }
  }

  /**
   * Get a skill from the cache
   *
   * Automatically records access for usage tracking.
   * Returns null if skill is not in cache.
   *
   * @param name - Skill name (metadata.name)
   * @returns Cached skill or null if not found
   *
   * @example
   * ```typescript
   * const skill = cache.get('git-commit')
   * if (skill) {
   *   console.log(skill.metadata.description)
   * }
   * ```
   */
  get(name: string): SkillMdFile | null {
    const cached = this.cache.get(name)

    if (cached) {
      // Record access
      this.recordAccess(name)
      return cached.skill
    }

    return null
  }

  /**
   * Remove a skill from the cache
   *
   * @param name - Skill name to remove
   * @returns true if skill was removed, false if not found
   *
   * @example
   * ```typescript
   * const removed = cache.remove('git-commit')
   * console.log(removed ? 'Removed' : 'Not found')
   * ```
   */
  remove(name: string): boolean {
    return this.cache.delete(name)
  }

  /**
   * Clear all skills from the cache
   *
   * Resets the entire cache, removing all skills and statistics.
   *
   * @example
   * ```typescript
   * cache.clear()
   * console.log(cache.size()) // 0
   * ```
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get the number of cached skills
   *
   * @returns Number of skills in cache
   *
   * @example
   * ```typescript
   * console.log(`Cache contains ${cache.size()} skills`)
   * ```
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Check if a skill is cached
   *
   * @param name - Skill name to check
   * @returns true if skill is in cache
   *
   * @example
   * ```typescript
   * if (!cache.has('git-commit')) {
   *   const skill = await parseSkillMdFile('/path/to/SKILL.md')
   *   cache.set(skill)
   * }
   * ```
   */
  has(name: string): boolean {
    return this.cache.has(name)
  }

  /**
   * Get all cached skills
   *
   * Returns an array of all skills currently in cache.
   * Does not record access for any skills.
   *
   * @returns Array of all cached skills
   *
   * @example
   * ```typescript
   * const allSkills = cache.getAll()
   * console.log(`Total skills: ${allSkills.length}`)
   * ```
   */
  getAll(): SkillMdFile[] {
    return Array.from(this.cache.values()).map(cached => cached.skill)
  }

  /**
   * Get recently used skills
   *
   * Returns skills sorted by last access time (most recent first).
   * Useful for showing recently used skills in UI or prioritizing
   * skill suggestions.
   *
   * @param limit - Maximum number of skills to return (default: 10)
   * @returns Array of recently used skills
   *
   * @example
   * ```typescript
   * // Get 5 most recently used skills
   * const recent = cache.getRecentlyUsed(5)
   * recent.forEach(skill => {
   *   console.log(`${skill.metadata.name} - ${skill.metadata.description}`)
   * })
   * ```
   */
  getRecentlyUsed(limit = 10): SkillMdFile[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime())
      .slice(0, limit)
      .map(cached => cached.skill)
  }

  /**
   * Get most frequently used skills
   *
   * Returns skills sorted by access count (most accessed first).
   * Useful for identifying popular skills and optimizing performance.
   *
   * @param limit - Maximum number of skills to return (default: 10)
   * @returns Array of most frequently used skills
   *
   * @example
   * ```typescript
   * // Get top 10 most used skills
   * const popular = cache.getMostUsed(10)
   * popular.forEach(skill => {
   *   const cached = cache.getCacheEntry(skill.metadata.name)
   *   console.log(`${skill.metadata.name}: ${cached?.accessCount} uses`)
   * })
   * ```
   */
  getMostUsed(limit = 10): SkillMdFile[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit)
      .map(cached => cached.skill)
  }

  /**
   * Record access to a skill
   *
   * Updates access count and last accessed time.
   * Called automatically by get() method.
   *
   * @param name - Skill name
   *
   * @example
   * ```typescript
   * // Manually record access (usually not needed)
   * cache.recordAccess('git-commit')
   * ```
   */
  recordAccess(name: string): void {
    const cached = this.cache.get(name)

    if (cached) {
      cached.accessCount++
      cached.lastAccessedAt = new Date()
    }
  }

  /**
   * Get cache entry with metadata
   *
   * Returns the full cache entry including access statistics.
   * Useful for debugging and analytics.
   *
   * @param name - Skill name
   * @returns Cache entry or null if not found
   *
   * @example
   * ```typescript
   * const entry = cache.getCacheEntry('git-commit')
   * if (entry) {
   *   console.log(`Loaded: ${entry.loadedAt}`)
   *   console.log(`Access count: ${entry.accessCount}`)
   *   console.log(`Last accessed: ${entry.lastAccessedAt}`)
   * }
   * ```
   */
  getCacheEntry(name: string): CachedSkill | null {
    return this.cache.get(name) || null
  }

  /**
   * Get cache statistics
   *
   * Returns aggregate statistics about cache usage.
   *
   * @returns Cache statistics
   *
   * @example
   * ```typescript
   * const stats = cache.getStats()
   * console.log(`Total skills: ${stats.totalSkills}`)
   * console.log(`Total accesses: ${stats.totalAccesses}`)
   * console.log(`Average accesses: ${stats.averageAccesses}`)
   * ```
   */
  getStats(): {
    totalSkills: number
    totalAccesses: number
    averageAccesses: number
    oldestLoadedAt: Date | null
    newestLoadedAt: Date | null
  } {
    const entries = Array.from(this.cache.values())

    if (entries.length === 0) {
      return {
        totalSkills: 0,
        totalAccesses: 0,
        averageAccesses: 0,
        oldestLoadedAt: null,
        newestLoadedAt: null,
      }
    }

    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0)
    const loadedTimes = entries.map(entry => entry.loadedAt.getTime())

    return {
      totalSkills: entries.length,
      totalAccesses,
      averageAccesses: totalAccesses / entries.length,
      oldestLoadedAt: new Date(Math.min(...loadedTimes)),
      newestLoadedAt: new Date(Math.max(...loadedTimes)),
    }
  }
}
