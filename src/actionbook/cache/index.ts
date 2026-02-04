/**
 * Multi-Level Index
 *
 * Two-tier caching system with L1 memory cache and L2 LevelDB storage.
 * Provides intelligent cache management with automatic promotion/demotion.
 */

import type { CacheEntry } from '../types.js'
import type { MemoryCache } from './memory.js'
import { getGlobalCache } from './memory.js'
import { LevelDBStorage } from './storage.js'

/**
 * Cache level configuration
 */
interface CacheLevelConfig {
  name: string
  maxSize: number
  ttl: number
}

/**
 * Cache entry with metadata for multi-level indexing
 */
interface IndexedEntry extends CacheEntry {
  accessCount: number
  lastAccess: number
  level: 1 | 2
}

/**
 * Multi-level index class
 */
export class MultiLevelIndex {
  private l1: MemoryCache
  private l2: LevelDBStorage
  private config: {
    l1: CacheLevelConfig
    l2: CacheLevelConfig
  }

  constructor(dbPath: string, config?: {
    l1?: Partial<CacheLevelConfig>
    l2?: Partial<CacheLevelConfig>
  }) {
    this.l1 = getGlobalCache(config?.l1?.maxSize || 1000)
    this.l2 = new LevelDBStorage(dbPath)

    this.config = {
      l1: {
        name: 'L1-Memory',
        maxSize: config?.l1?.maxSize || 1000,
        ttl: config?.l1?.ttl || 1000 * 60 * 30, // 30 minutes
      },
      l2: {
        name: 'L2-Disk',
        maxSize: config?.l2?.maxSize || 100000,
        ttl: config?.l2?.ttl || 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    }
  }

  /**
   * Get entry from cache (L1 first, then L2)
   */
  async get(key: string): Promise<IndexedEntry | null> {
    // Try L1 first
    const l1Entry = this.l1.get(key) as IndexedEntry | undefined
    if (l1Entry) {
      l1Entry.accessCount++
      l1Entry.lastAccess = Date.now()
      l1Entry.level = 1
      return l1Entry
    }

    // Try L2
    const l2Entry = (await this.l2.get(key)) as IndexedEntry | null
    if (l2Entry) {
      // Promote to L1 if frequently accessed
      if (l2Entry.accessCount > 5) {
        await this.promoteToL1(key, l2Entry)
      }

      l2Entry.accessCount++
      l2Entry.lastAccess = Date.now()
      l2Entry.level = 2
      return l2Entry
    }

    return null
  }

  /**
   * Set entry in cache (writes to both levels)
   */
  async set(key: string, entry: CacheEntry): Promise<void> {
    const indexedEntry: IndexedEntry = {
      ...entry,
      accessCount: 0,
      lastAccess: Date.now(),
      level: 1,
    }

    // Store in L1
    this.l1.set(key, indexedEntry)

    // Store in L2
    await this.l2.put(indexedEntry)
  }

  /**
   * Delete entry from both levels
   */
  async delete(key: string): Promise<void> {
    this.l1.delete(key)
    await this.l2.del(key)
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    if (this.l1.has(key)) {
      return true
    }
    return await this.l2.has(key)
  }

  /**
   * Get all entries for a file path
   */
  async getByFilePath(filePath: string): Promise<IndexedEntry[]> {
    const prefix = `${filePath}|`

    // Get from L1
    const l1Entries: IndexedEntry[] = []
    for (const key of this.l1.keys()) {
      if (key.startsWith(prefix)) {
        const entry = this.l1.get(key) as IndexedEntry
        if (entry) {
          l1Entries.push(entry)
        }
      }
    }

    // Get from L2
    const l2Entries = (await this.l2.getByPrefix(prefix)) as IndexedEntry[]

    return [...l1Entries, ...l2Entries]
  }

  /**
   * Promote entry to L1 cache
   */
  async promoteToL1(key: string, entry: IndexedEntry): Promise<void> {
    entry.level = 1
    this.l1.set(key, entry)
  }

  /**
   * Demote entry from L1 to L2
   */
  async demoteToL2(key: string): Promise<void> {
    const entry = this.l1.get(key) as IndexedEntry | undefined
    if (entry) {
      entry.level = 2
      await this.l2.put(entry)
      this.l1.delete(key)
    }
  }

  /**
   * Get combined statistics
   */
  async getStats(): Promise<{
    l1: ReturnType<MemoryCache['getStats']>
    l2: { size: number }
    combined: { hitRate: number }
  }> {
    const l1Stats = this.l1.getStats()
    const l2Size = await this.l2.getSize()
    const totalHits = l1Stats.hits
    const totalMisses = l1Stats.misses
    const combinedHitRate = totalHits + totalMisses > 0
      ? totalHits / (totalHits + totalMisses)
      : 0

    return {
      l1: l1Stats,
      l2: { size: l2Size },
      combined: {
        hitRate: combinedHitRate,
      },
    }
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.l1.clear()
    await this.l2.clear()
  }

  /**
   * Warm up L1 cache with frequently accessed entries
   */
  async warmup(filePath: string): Promise<void> {
    const entries = await this.getByFilePath(filePath)

    // Sort by access count and promote top entries
    entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 100)
      .forEach(async (entry) => {
        await this.promoteToL1(`${filePath}|${entry.type}`, entry)
      })
  }

  /**
   * Evict stale entries from L1
   */
  async evictStale(): Promise<void> {
    const keys = this.l1.keys()
    const now = Date.now()

    for (const key of keys) {
      const entry = this.l1.get(key) as IndexedEntry | undefined
      if (entry && (now - entry.lastAccess) > this.config.l1.ttl) {
        await this.demoteToL2(key)
      }
    }
  }

  /**
   * Close cache system
   */
  async close(): Promise<void> {
    await this.l2.close()
  }

  /**
   * Compact L2 storage
   */
  async compact(): Promise<void> {
    await this.l2.compact()
  }

  /**
   * Get cache configuration
   */
  getConfig(): typeof this.config {
    return { ...this.config }
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: {
    l1?: Partial<CacheLevelConfig>
    l2?: Partial<CacheLevelConfig>
  }): void {
    if (config.l1) {
      this.config.l1 = { ...this.config.l1, ...config.l1 }
      if (config.l1.maxSize) {
        this.l1.setMaxSize(config.l1.maxSize)
      }
    }
    if (config.l2) {
      this.config.l2 = { ...this.config.l2, ...config.l2 }
    }
  }
}

/**
 * Global multi-level index instance
 */
let globalIndex: MultiLevelIndex | null = null

/**
 * Get or create global multi-level index
 */
export function getGlobalIndex(dbPath = './actionbook-cache'): MultiLevelIndex {
  if (!globalIndex) {
    globalIndex = new MultiLevelIndex(dbPath)
  }
  return globalIndex
}

/**
 * Close global index
 */
export async function closeGlobalIndex(): Promise<void> {
  if (globalIndex) {
    await globalIndex.close()
    globalIndex = null
  }
}
