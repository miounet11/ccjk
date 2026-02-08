/**
 * Cache Manager
 * Manages local caching of MCP services
 */

import type { CacheEntry } from '../types'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

export class CacheManager {
  private cache: Map<string, CacheEntry<any>>
  private cachePath: string
  private ttl: number

  constructor(ttl: number = 3600000) {
    this.cache = new Map()
    this.ttl = ttl
    this.cachePath = path.join(os.homedir(), '.ccjk', 'mcp-cache.json')
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.ttl,
    }

    this.cache.set(key, entry)
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear()
    await this.save()
  }

  /**
   * Load cache from disk
   */
  async load(): Promise<void> {
    try {
      if (!fs.existsSync(this.cachePath)) {
        return
      }

      const data = await fs.promises.readFile(this.cachePath, 'utf-8')
      const parsed = JSON.parse(data)

      // Convert array back to Map
      this.cache = new Map(parsed)

      // Clean expired entries
      this.cleanExpired()
    }
    catch (_error) {
      // Ignore errors, start with empty cache
      this.cache = new Map()
    }
  }

  /**
   * Save cache to disk
   */
  async save(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.cachePath)
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true })
      }

      // Convert Map to array for JSON serialization
      const data = JSON.stringify(Array.from(this.cache.entries()), null, 2)
      await fs.promises.writeFile(this.cachePath, data, 'utf-8')
    }
    catch (error) {
      console.error('Failed to save cache:', error)
    }
  }

  /**
   * Clean expired entries
   */
  private cleanExpired(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Get cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }
}
