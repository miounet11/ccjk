/**
 * Smart caching system for version information
 * Reduces network calls by caching version data with TTL
 */

import { VersionInfo, VersionCacheEntry } from './types';

/**
 * LRU Cache for version information
 */
export class VersionCache {
  private cache: Map<string, VersionCacheEntry>;
  private maxSize: number;
  private defaultTtl: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 100, defaultTtl: number = 3600000) {
    // Default TTL: 1 hour
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
  }

  /**
   * Get version info from cache
   */
  get(tool: string): VersionInfo | null {
    const entry = this.cache.get(tool);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    const age = now - entry.cachedAt.getTime();

    if (age > entry.ttl) {
      // Entry expired, remove it
      this.cache.delete(tool);
      this.misses++;
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(tool);
    this.cache.set(tool, entry);
    this.hits++;

    return entry.versionInfo;
  }

  /**
   * Set version info in cache
   */
  set(tool: string, versionInfo: VersionInfo, ttl?: number): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(tool)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const entry: VersionCacheEntry = {
      versionInfo,
      cachedAt: new Date(),
      ttl: ttl || this.defaultTtl,
    };

    this.cache.set(tool, entry);
  }

  /**
   * Check if tool is in cache and not expired
   */
  has(tool: string): boolean {
    return this.get(tool) !== null;
  }

  /**
   * Invalidate cache entry for a tool
   */
  invalidate(tool: string): void {
    this.cache.delete(tool);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
    };
  }

  /**
   * Prune expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [tool, entry] of this.cache.entries()) {
      const age = now - entry.cachedAt.getTime();
      if (age > entry.ttl) {
        this.cache.delete(tool);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get all cached tools
   */
  getCachedTools(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries that will expire soon
   */
  getExpiringSoon(threshold: number = 300000): string[] {
    // Default threshold: 5 minutes
    const now = Date.now();
    const expiring: string[] = [];

    for (const [tool, entry] of this.cache.entries()) {
      const age = now - entry.cachedAt.getTime();
      const remaining = entry.ttl - age;

      if (remaining > 0 && remaining < threshold) {
        expiring.push(tool);
      }
    }

    return expiring;
  }

  /**
   * Refresh cache entry TTL
   */
  refresh(tool: string, ttl?: number): boolean {
    const entry = this.cache.get(tool);
    if (!entry) {
      return false;
    }

    entry.cachedAt = new Date();
    entry.ttl = ttl || this.defaultTtl;
    this.cache.set(tool, entry);

    return true;
  }

  /**
   * Get time until cache entry expires
   */
  getTimeToExpiry(tool: string): number | null {
    const entry = this.cache.get(tool);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.cachedAt.getTime();
    const remaining = entry.ttl - age;

    return remaining > 0 ? remaining : 0;
  }

  /**
   * Batch get multiple tools
   */
  batchGet(tools: string[]): Map<string, VersionInfo> {
    const results = new Map<string, VersionInfo>();

    for (const tool of tools) {
      const info = this.get(tool);
      if (info) {
        results.set(tool, info);
      }
    }

    return results;
  }

  /**
   * Batch set multiple tools
   */
  batchSet(entries: Map<string, VersionInfo>, ttl?: number): void {
    for (const [tool, versionInfo] of entries) {
      this.set(tool, versionInfo, ttl);
    }
  }

  /**
   * Export cache to JSON
   */
  export(): string {
    const data = Array.from(this.cache.entries()).map(([tool, entry]) => ({
      tool,
      versionInfo: entry.versionInfo,
      cachedAt: entry.cachedAt.toISOString(),
      ttl: entry.ttl,
    }));

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import cache from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json);
      this.cache.clear();

      for (const item of data) {
        const entry: VersionCacheEntry = {
          versionInfo: item.versionInfo,
          cachedAt: new Date(item.cachedAt),
          ttl: item.ttl,
        };
        this.cache.set(item.tool, entry);
      }
    } catch (error) {
      throw new Error(`Failed to import cache: ${error}`);
    }
  }
}
