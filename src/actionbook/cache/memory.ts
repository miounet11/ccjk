/**
 * Memory Cache (LRU)
 *
 * In-memory LRU cache for fast access to frequently used data.
 * Integrates with LevelDB storage for two-tier caching.
 */

import { LRUCache } from 'lru-cache'
import type { CacheEntry, CacheStats } from '../types.js'

/**
 * LRU memory cache class
 */
export class MemoryCache {
  private cache: LRUCache<string, CacheEntry>
  private hits: number = 0
  private misses: number = 0

  constructor(maxSize = 1000) {
    this.cache = new LRUCache({
      max: maxSize,
      ttl: 1000 * 60 * 30, // 30 minutes TTL
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    })

    // Track cache operations for statistics
    this.cache.on('hit', () => {
      this.hits++
    })

    this.cache.on('miss', () => {
      this.misses++
    })
  }

  /**
   * Get entry from cache
   */
  get(key: string): CacheEntry | undefined {
    return this.cache.get(key)
  }

  /**
   * Set entry in cache
   */
  set(key: string, entry: CacheEntry): void {
    this.cache.set(key, entry)
  }

  /**
   * Check if key exists
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
    this.hits = 0
    this.misses = 0
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses
    const hitRate = total > 0 ? this.hits / total : 0

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate,
    }
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size
  }

  /**
   * Check if cache is empty
   */
  isEmpty(): boolean {
    return this.cache.size === 0
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get all values
   */
  values(): CacheEntry[] {
    return Array.from(this.cache.values())
  }

  /**
   * Dump cache contents (for debugging)
   */
  dump(): Map<string, CacheEntry> {
    const map = new Map<string, CacheEntry>()
    for (const [key, value] of this.cache.entries()) {
      map.set(key, value)
    }
    return map
  }

  /**
   * Load multiple entries into cache
   */
  loadMany(entries: [string, CacheEntry][]): void {
    for (const [key, entry] of entries) {
      this.cache.set(key, entry)
    }
  }

  /**
   * Delete multiple entries
   */
  deleteMany(keys: string[]): number {
    let deleted = 0
    for (const key of keys) {
      if (this.cache.delete(key)) {
        deleted++
      }
    }
    return deleted
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0
    this.misses = 0
  }

  /**
   * Get estimated memory usage
   */
  getEstimatedSize(): number {
    let size = 0
    for (const [key, value] of this.cache.entries()) {
      size += key.length * 2 // Unicode characters
      size += JSON.stringify(value).length * 2
    }
    return size
  }

  /**
   * Prune cache (remove expired entries)
   */
  prune(): void {
    // LRU cache automatically prunes expired entries
    // This is a no-op but provided for API completeness
  }

  /**
   * Set cache size limit
   */
  setMaxSize(maxSize: number): void {
    this.cache.max = maxSize
  }

  /**
   * Get cache configuration
   */
  getConfig(): { maxSize: number; ttl: number } {
    return {
      maxSize: this.cache.max,
      ttl: this.cache.calculateSize() as number, // Approximation
    }
  }
}

/**
 * Global memory cache instance
 */
let globalCache: MemoryCache | null = null

/**
 * Get or create global memory cache
 */
export function getGlobalCache(maxSize = 1000): MemoryCache {
  if (!globalCache) {
    globalCache = new MemoryCache(maxSize)
  }
  return globalCache
}

/**
 * Reset global cache
 */
export function resetGlobalCache(): void {
  if (globalCache) {
    globalCache.clear()
    globalCache.resetStats()
  }
}
