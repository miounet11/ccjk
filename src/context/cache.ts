/**
 * Smart LRU Cache for context optimization
 * Implements Least Recently Used caching with size limits
 */

import type { CacheEntry, CacheStats, CompressedContext } from './types'

/**
 * Smart LRU Cache implementation
 */
export class ContextCache {
  private cache: Map<string, CacheEntry>
  private maxSize: number
  private maxEntries: number
  private currentSize: number
  private hits: number
  private misses: number
  private evictions: number

  constructor(maxSize: number = 10 * 1024 * 1024, maxEntries: number = 1000) {
    this.cache = new Map()
    this.maxSize = maxSize // 10MB default
    this.maxEntries = maxEntries
    this.currentSize = 0
    this.hits = 0
    this.misses = 0
    this.evictions = 0
  }

  /**
   * Get cached context
   */
  get(id: string): CompressedContext | null {
    const entry = this.cache.get(id)

    if (!entry) {
      this.misses++
      return null
    }

    // Update access time and count
    entry.lastAccess = Date.now()
    entry.accessCount++

    // Move to end (most recently used)
    this.cache.delete(id)
    this.cache.set(id, entry)

    this.hits++
    return entry.context
  }

  /**
   * Set cached context
   */
  set(id: string, context: CompressedContext): void {
    const size = this.estimateSize(context)

    // Check if we need to evict
    while (
      (this.currentSize + size > this.maxSize || this.cache.size >= this.maxEntries)
      && this.cache.size > 0
    ) {
      this.evictLRU()
    }

    // Remove old entry if exists
    const existing = this.cache.get(id)
    if (existing) {
      this.currentSize -= existing.size
      this.cache.delete(id)
    }

    // Add new entry
    const entry: CacheEntry = {
      id,
      context,
      lastAccess: Date.now(),
      accessCount: 1,
      size,
    }

    this.cache.set(id, entry)
    this.currentSize += size
  }

  /**
   * Check if context is cached
   */
  has(id: string): boolean {
    return this.cache.has(id)
  }

  /**
   * Remove context from cache
   */
  delete(id: string): boolean {
    const entry = this.cache.get(id)
    if (!entry) {
      return false
    }

    this.currentSize -= entry.size
    return this.cache.delete(id)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
    this.currentSize = 0
    this.hits = 0
    this.misses = 0
    this.evictions = 0
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses
    const hitRate = total > 0 ? this.hits / total : 0

    return {
      totalEntries: this.cache.size,
      totalSize: this.currentSize,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      evictions: this.evictions,
    }
  }

  /**
   * Get all cached IDs
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get cache size in bytes
   */
  size(): number {
    return this.currentSize
  }

  /**
   * Get number of entries
   */
  count(): number {
    return this.cache.size
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    // First entry is least recently used (due to Map ordering)
    const firstKey = this.cache.keys().next().value

    if (firstKey) {
      const entry = this.cache.get(firstKey)
      if (entry) {
        this.currentSize -= entry.size
        this.cache.delete(firstKey)
        this.evictions++
      }
    }
  }

  /**
   * Estimate size of compressed context in bytes
   */
  private estimateSize(context: CompressedContext): number {
    // Rough estimation
    let size = 0

    // Compressed content
    size += context.compressed.length * 2 // UTF-16 characters

    // Metadata
    if (context.metadata) {
      size += JSON.stringify(context.metadata).length * 2
    }

    // Other fields (rough estimate)
    size += 200 // Fixed overhead for other fields

    return size
  }

  /**
   * Get most frequently accessed entries
   */
  getMostFrequent(limit: number = 10): CacheEntry[] {
    const entries = Array.from(this.cache.values())
    return entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit)
  }

  /**
   * Get most recently accessed entries
   */
  getMostRecent(limit: number = 10): CacheEntry[] {
    const entries = Array.from(this.cache.values())
    return entries
      .sort((a, b) => b.lastAccess - a.lastAccess)
      .slice(0, limit)
  }

  /**
   * Prune cache to target size
   */
  prune(targetSize: number): number {
    let pruned = 0

    while (this.currentSize > targetSize && this.cache.size > 0) {
      this.evictLRU()
      pruned++
    }

    return pruned
  }

  /**
   * Get cache efficiency metrics
   */
  getEfficiency(): {
    hitRate: number
    avgAccessCount: number
    utilizationRate: number
  } {
    const stats = this.getStats()
    const entries = Array.from(this.cache.values())

    const avgAccessCount = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length
      : 0

    const utilizationRate = this.maxSize > 0
      ? this.currentSize / this.maxSize
      : 0

    return {
      hitRate: stats.hitRate,
      avgAccessCount,
      utilizationRate,
    }
  }
}
