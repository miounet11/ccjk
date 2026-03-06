import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import ansis from 'ansis'
import { join } from 'pathe'

/**
 * Cache entry structure
 */
interface CacheEntry<T = any> {
  key: string
  version: string
  data: T
  timestamp: number
  etag?: string
  size?: number
}

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number
  misses: number
  size: number
  entries: number
}

/**
 * Cache strategy options
 */
export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Max cache size in bytes
  maxEntries?: number // Max number of entries
}

/**
 * Installation cache manager
 */
export class InstallCache {
  private cacheDir: string
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    entries: 0,
  }

  constructor(
    private options: CacheOptions = {},
  ) {
    this.cacheDir = join(homedir(), '.ccjk', 'cache')
    this.ensureCacheDir()
  }

  /**
   * Get cached data
   */
  async get<T>(key: string, version: string): Promise<T | null> {
    try {
      const entry = await this.readCache<T>(key)

      if (!entry) {
        this.stats.misses++
        return null
      }

      // Check version match
      if (entry.version !== version) {
        console.log(ansis.dim(`  Cache miss: version mismatch (${entry.version} !== ${version})`))
        this.stats.misses++
        return null
      }

      // Check TTL
      const ttl = this.options.ttl || 24 * 60 * 60 * 1000 // Default 24h
      if (Date.now() - entry.timestamp > ttl) {
        console.log(ansis.dim(`  Cache miss: expired (${Math.floor((Date.now() - entry.timestamp) / 1000 / 60)}m old)`))
        await this.invalidate(key)
        this.stats.misses++
        return null
      }

      console.log(ansis.green(`  ✓ Cache hit: ${key}`))
      this.stats.hits++
      return entry.data
    }
    catch (error) {
      console.log(ansis.dim(`  Cache error: ${error}`))
      this.stats.misses++
      return null
    }
  }

  /**
   * Set cached data
   */
  async set<T>(key: string, version: string, data: T): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        key,
        version,
        data,
        timestamp: Date.now(),
        size: JSON.stringify(data).length,
      }

      await this.writeCache(key, entry)
      this.stats.entries++
      this.stats.size += entry.size || 0

      console.log(ansis.dim(`  ✓ Cached: ${key} (${this.formatSize(entry.size || 0)})`))

      // Check cache limits
      await this.enforceLimit()
    }
    catch (error) {
      console.log(ansis.yellow(`  ⚠ Cache write failed: ${error}`))
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key: string): Promise<void> {
    const cachePath = this.getCachePath(key)
    if (existsSync(cachePath)) {
      await rm(cachePath)
      this.stats.entries--
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (existsSync(this.cacheDir)) {
      await rm(this.cacheDir, { recursive: true })
      await this.ensureCacheDir()
      this.stats = {
        hits: 0,
        misses: 0,
        size: 0,
        entries: 0,
      }
      console.log(ansis.green('✓ Cache cleared'))
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0

    return {
      ...this.stats,
      hitRate,
    }
  }

  /**
   * Print cache statistics
   */
  printStats(): void {
    const stats = this.getStats()
    console.log(ansis.bold.cyan('\n📊 Cache Statistics:'))
    console.log(`  Hits: ${ansis.green(stats.hits.toString())}`)
    console.log(`  Misses: ${ansis.yellow(stats.misses.toString())}`)
    console.log(`  Hit Rate: ${ansis.cyan(`${stats.hitRate.toFixed(1)}%`)}`)
    console.log(`  Entries: ${stats.entries}`)
    console.log(`  Size: ${this.formatSize(stats.size)}`)
  }

  /**
   * Read cache entry from disk
   */
  private async readCache<T>(key: string): Promise<CacheEntry<T> | null> {
    const cachePath = this.getCachePath(key)

    if (!existsSync(cachePath)) {
      return null
    }

    const content = await readFile(cachePath, 'utf-8')
    return JSON.parse(content) as CacheEntry<T>
  }

  /**
   * Write cache entry to disk
   */
  private async writeCache<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    const cachePath = this.getCachePath(key)
    const content = JSON.stringify(entry, null, 2)
    await writeFile(cachePath, content, 'utf-8')
  }

  /**
   * Get cache file path
   */
  private getCachePath(key: string): string {
    // Sanitize key for filename
    const safeKey = key.replace(/[^\w-]/g, '_')
    return join(this.cacheDir, `${safeKey}.json`)
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDir(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true })
    }
  }

  /**
   * Enforce cache size limits
   */
  private async enforceLimit(): Promise<void> {
    // Check max entries
    if (this.options.maxEntries && this.stats.entries > this.options.maxEntries) {
      await this.evictOldest()
    }

    // Check max size
    if (this.options.maxSize && this.stats.size > this.options.maxSize) {
      await this.evictOldest()
    }
  }

  /**
   * Evict oldest cache entries
   */
  private async evictOldest(): Promise<void> {
    // TODO: Implement LRU eviction
    console.log(ansis.dim('  Cache limit reached, evicting oldest entries...'))
  }

  /**
   * Format byte size for display
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024)
      return `${bytes}B`
    if (bytes < 1024 * 1024)
      return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }
}

/**
 * Global cache instance
 */
let globalCache: InstallCache | null = null

/**
 * Get or create global cache instance
 */
export function getInstallCache(options?: CacheOptions): InstallCache {
  if (!globalCache) {
    globalCache = new InstallCache(options)
  }
  return globalCache
}

/**
 * Clear global cache
 */
export async function clearInstallCache(): Promise<void> {
  if (globalCache) {
    await globalCache.clear()
  }
}
