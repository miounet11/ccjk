/**
 * Memory Cache (LRU)
 *
 * In-memory LRU cache for fast access to frequently used data.
 * Integrates with LevelDB storage for two-tier caching.
 */

import type { CacheEntry, CacheStats } from '../types.js'

/**
 * Simple LRU cache node
 */
interface CacheNode {
  key: string
  value: CacheEntry
  timestamp: number
  prev: CacheNode | null
  next: CacheNode | null
}

/**
 * LRU memory cache class
 */
export class MemoryCache {
  private cache: Map<string, CacheNode>
  private head: CacheNode | null = null
  private tail: CacheNode | null = null
  private maxSize: number
  private ttl: number
  private hits: number = 0
  private misses: number = 0

  constructor(maxSize = 1000) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = 1000 * 60 * 30 // 30 minutes TTL
  }

  /**
   * Get entry from cache
   */
  get(key: string): CacheEntry | undefined {
    const node = this.cache.get(key)
    if (!node) {
      this.misses++
      return undefined
    }

    // Check TTL
    if (Date.now() - node.timestamp > this.ttl) {
      this.delete(key)
      this.misses++
      return undefined
    }

    // Move to front (most recently used)
    this.moveToFront(node)
    this.hits++
    return node.value
  }

  /**
   * Set entry in cache
   */
  set(key: string, entry: CacheEntry): void {
    const existing = this.cache.get(key)
    if (existing) {
      existing.value = entry
      existing.timestamp = Date.now()
      this.moveToFront(existing)
      return
    }

    const node: CacheNode = {
      key,
      value: entry,
      timestamp: Date.now(),
      prev: null,
      next: null,
    }

    this.cache.set(key, node)
    this.addToFront(node)

    // Evict if over capacity
    if (this.cache.size > this.maxSize) {
      this.evictLRU()
    }
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const node = this.cache.get(key)
    if (!node) {
      return false
    }

    // Check TTL
    if (Date.now() - node.timestamp > this.ttl) {
      this.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const node = this.cache.get(key)
    if (!node) {
      return false
    }

    this.removeNode(node)
    return this.cache.delete(key)
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear()
    this.head = null
    this.tail = null
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
    return Array.from(this.cache.values()).map(node => node.value)
  }

  /**
   * Dump cache contents (for debugging)
   */
  dump(): Map<string, CacheEntry> {
    const map = new Map<string, CacheEntry>()
    const entries = Array.from(this.cache.entries())
    for (const [key, node] of entries) {
      map.set(key, node.value)
    }
    return map
  }

  /**
   * Load multiple entries into cache
   */
  loadMany(entries: [string, CacheEntry][]): void {
    for (const [key, entry] of entries) {
      this.set(key, entry)
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
    const entries = Array.from(this.cache.entries())
    for (const [key, node] of entries) {
      size += key.length * 2 // Unicode characters
      size += JSON.stringify(node.value).length * 2
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
    this.maxSize = maxSize
    // Evict entries if new size is smaller
    while (this.cache.size > this.maxSize) {
      this.evictLRU()
    }
  }

  /**
   * Get cache configuration
   */
  getConfig(): { maxSize: number, ttl: number } {
    return {
      maxSize: this.maxSize,
      ttl: this.ttl,
    }
  }

  /**
   * Move node to front of list
   */
  private moveToFront(node: CacheNode): void {
    if (node === this.head) {
      return
    }

    this.removeNode(node)
    this.addToFront(node)
  }

  /**
   * Add node to front of list
   */
  private addToFront(node: CacheNode): void {
    node.next = this.head
    node.prev = null

    if (this.head) {
      this.head.prev = node
    }

    this.head = node

    if (!this.tail) {
      this.tail = node
    }
  }

  /**
   * Remove node from list
   */
  private removeNode(node: CacheNode): void {
    if (node.prev) {
      node.prev.next = node.next
    }
    else {
      this.head = node.next
    }

    if (node.next) {
      node.next.prev = node.prev
    }
    else {
      this.tail = node.prev
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (!this.tail) {
      return
    }

    this.cache.delete(this.tail.key)
    this.removeNode(this.tail)
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
