/**
 * Configuration Cache - Intelligent caching for CCJK configurations
 *
 * Improves performance by caching:
 * - Parsed configuration files
 * - Validated configurations
 * - Remote API responses (MCP, skills registry)
 * - Expensive computations
 */

import { mkdirSync } from 'node:fs'
import { join } from 'pathe'
import { exists } from '../utils/fs-operations'
import { getHomeDir } from '../utils/platform/paths'

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
  hits: number
  size: number
}

/**
 * Cache statistics
 */
interface CacheStats {
  size: number
  hits: number
  misses: number
  hitRate: number
  totalRequests: number
}

/**
 * Cache configuration
 */
interface CacheConfig {
  maxSize?: number // Maximum cache size in bytes (default: 10MB)
  defaultTTL?: number // Default time-to-live in ms (default: 60000 = 1 minute)
  cleanupInterval?: number // Cleanup interval in ms (default: 300000 = 5 minutes)
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 10 * 1024 * 1024, // 10MB
  defaultTTL: 60000, // 1 minute
  cleanupInterval: 300000, // 5 minutes
}

/**
 * ConfigCache class
 */
export class ConfigCache {
  private cache = new Map<string, CacheEntry<any>>()
  private stats = {
    hits: 0,
    misses: 0,
  }

  private config: CacheConfig
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    // Start periodic cleanup
    this.startCleanup()
  }

  /**
   * Get value from cache
   */
  get<T = any>(key: string, maxAge?: number): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if expired
    const now = Date.now()
    const ttl = maxAge ?? this.config.defaultTTL!

    if (now - entry.timestamp > ttl) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // Check if expired by absolute time
    if (entry.expiresAt && now > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // Update hit count
    entry.hits++
    this.stats.hits++

    return entry.data as T
  }

  /**
   * Set value in cache
   */
  set<T = any>(key: string, data: T, options?: {
    ttl?: number // Time-to-live in ms
    expiresAt?: number // Absolute expiration timestamp
    size?: number // Data size in bytes
  }): void {
    const now = Date.now()

    // Calculate expiration
    let expiresAt: number | undefined
    if (options?.expiresAt) {
      expiresAt = options.expiresAt
    }
    else if (options?.ttl) {
      expiresAt = now + options.ttl
    }
    else {
      expiresAt = now + this.config.defaultTTL!
    }

    // Calculate size if not provided
    const size = options?.size ?? JSON.stringify(data).length

    // Check cache size limit
    this.ensureCapacity(size)

    // Set entry
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
      hits: 0,
      size,
    } as CacheEntry<T>)
  }

  /**
   * Check if key exists in cache (without marking as hit)
   */
  has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * Invalidate cache by pattern
   */
  invalidate(pattern: string | RegExp): number {
    let count = 0

    if (typeof pattern === 'string') {
      // String pattern - delete keys starting with pattern
      for (const key of this.cache.keys()) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key)
          count++
        }
      }
    }
    else if (pattern instanceof RegExp) {
      // RegExp pattern - delete matching keys
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key)
          count++
        }
      }
    }

    return count
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0
      ? Math.round((this.stats.hits / totalRequests) * 100) / 100
      : 0

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      totalRequests,
    }
  }

  /**
   * Ensure cache has capacity for new entry
   */
  private ensureCapacity(requiredSize: number): void {
    // Calculate current size
    let currentSize = 0
    for (const entry of this.cache.values()) {
      currentSize += entry.size
    }

    // If over capacity, remove old/unused entries
    if (currentSize + requiredSize > this.config.maxSize!) {
      const entries = Array.from(this.cache.entries())
      // Sort by: 1) expiration time, 2) hit count (ascending)
      entries.sort((a, b) => {
        const aExpired = a[1].expiresAt || Infinity
        const bExpired = b[1].expiresAt || Infinity
        if (aExpired !== bExpired) {
          return aExpired - bExpired
        }
        return a[1].hits - b[1].hits
      })

      // Remove entries until there's enough space
      let freedSpace = 0
      for (const [key, entry] of entries) {
        this.cache.delete(key)
        freedSpace += entry.size
        if (currentSize + requiredSize - freedSpace <= this.config.maxSize!) {
          break
        }
      }
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    // Clear previous timer if exists
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      let removed = 0

      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt && now > entry.expiresAt) {
          this.cache.delete(key)
          removed++
        }
      }

      if (removed > 0) {
        // Cleanup stats can be logged here
      }
    }, this.config.cleanupInterval!)
  }

  /**
   * Stop cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    this.stopCleanup()
    this.clear()
  }

  /**
   * Get cache keys by pattern
   */
  keys(pattern?: string): string[] {
    if (!pattern) {
      return Array.from(this.cache.keys())
    }
    return Array.from(this.cache.keys()).filter(key => key.includes(pattern))
  }

  /**
   * Get cache entry info (without loading data)
   */
  getEntryInfo(key: string): CacheEntry<any> | undefined {
    return this.cache.get(key)
  }
}

/**
 * Global cache instance for CCJK configurations
 */
let globalConfigCache: ConfigCache | null = null

/**
 * Get global config cache instance
 */
export function getConfigCache(): ConfigCache {
  if (!globalConfigCache) {
    // Use home directory for cache persistence
    const cacheDir = join(getHomeDir(), '.ccjk', 'cache')

    // Create directory if needed
    if (!exists(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true })
    }

    globalConfigCache = new ConfigCache()
  }

  return globalConfigCache
}

/**
 * Invalidate cache by pattern
 */
export function invalidateCache(pattern: string | RegExp): number {
  return getConfigCache().invalidate(pattern)
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  return getConfigCache().getStats()
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
  return getConfigCache().clear()
}
