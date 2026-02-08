/**
 * Response cache for API requests
 */

import type { CacheConfig, CacheEntry } from './types.js'

export interface ResponseCache {
  get: <T>(key: string) => Promise<T | null>
  set: <T>(key: string, value: T, ttl?: number) => Promise<void>
  invalidate: (pattern: string) => Promise<void>
  clear: () => Promise<void>
}

export class ResponseCacheImpl implements ResponseCache {
  private cache = new Map<string, CacheEntry<any>>()
  private config: CacheConfig

  constructor(config: CacheConfig) {
    this.config = config
  }

  /**
   * Get a cached response
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled)
      return null

    const entry = this.cache.get(key)
    if (!entry)
      return null

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Cache a response
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.config.enabled)
      return

    const now = Date.now()
    const expiresAt = now + (ttl ?? this.config.defaultTTL)

    // Check cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest()
    }

    const entry: CacheEntry<T> = {
      data: value,
      cachedAt: now,
      expiresAt,
    }

    this.cache.set(key, entry)
  }

  /**
   * Invalidate cached responses matching a pattern
   */
  async invalidate(pattern: string): Promise<void> {
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []

    const keys = Array.from(this.cache.keys())
    for (const key of keys) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
    }
  }

  /**
   * Clear all cached responses
   */
  async clear(): Promise<void> {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    hitRate: number
    missRate: number
    oldestEntry: number
    newestEntry: number
  } {
    const now = Date.now()
    let oldestEntry = now
    let newestEntry = 0

    const entries = Array.from(this.cache.values())
    for (const entry of entries) {
      oldestEntry = Math.min(oldestEntry, entry.cachedAt)
      newestEntry = Math.max(newestEntry, entry.cachedAt)
    }

    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
      missRate: 0,
      oldestEntry,
      newestEntry,
    }
  }

  /**
   * Evict the oldest entry from cache
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    const entries = Array.from(this.cache.entries())
    for (const [key, entry] of entries) {
      if (entry.cachedAt < oldestTime) {
        oldestTime = entry.cachedAt
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }
}

/**
 * Cache key builder for consistent key generation
 */
export class CacheKeyBuilder {
  private parts: string[] = []

  static from(path: string): CacheKeyBuilder {
    const builder = new CacheKeyBuilder()
    builder.parts.push(path)
    return builder
  }

  withQuery(params: Record<string, any>): CacheKeyBuilder {
    const query = new URLSearchParams()
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .forEach(([key, value]) => query.append(key, String(value)))

    if (query.toString()) {
      this.parts.push(`?${query.toString()}`)
    }

    return this
  }

  withHeaders(headers: Record<string, string>): CacheKeyBuilder {
    const relevantHeaders = ['authorization', 'x-api-key', 'accept-language']
    const headerValues = relevantHeaders
      .filter(key => headers[key])
      .map(key => `${key}:${headers[key]}`)
      .join('&')

    if (headerValues) {
      this.parts.push(`[${headerValues}]`)
    }

    return this
  }

  withBody(body: any): CacheKeyBuilder {
    if (body) {
      const hash = this.hashBody(body)
      this.parts.push(`[${hash}]`)
    }

    return this
  }

  build(): string {
    return this.parts.join('')
  }

  private hashBody(body: any): string {
    const str = JSON.stringify(body)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash + char) & 0xFFFFFFFF
    }
    return Math.abs(hash).toString(16)
  }
}

/**
 * TTL strategies for different types of responses
 */
export const TTL_STRATEGIES = {
  // Short-lived data that changes frequently
  EPHEMERAL: 60000, // 1 minute

  // Standard API responses
  STANDARD: 300000, // 5 minutes

  // Data that changes infrequently
  STABLE: 1800000, // 30 minutes

  // Static data that rarely changes
  STATIC: 86400000, // 24 hours

  // User-specific data
  USER_DATA: 600000, // 10 minutes

  // Search results
  SEARCH: 300000, // 5 minutes

  // Trending/recommended content
  RECOMMENDED: 600000, // 10 minutes
} as const

/**
 * Conditional cache headers
 */
export interface CacheHeaders {
  etag?: string
  lastModified?: string
  maxAge?: number
  noCache?: boolean
  noStore?: boolean
  mustRevalidate?: boolean
}

/**
 * Parse cache headers from response
 */
export function parseCacheHeaders(headers: Headers): CacheHeaders {
  const cacheControl = headers.get('cache-control')
  const etag = headers.get('etag')
  const lastModified = headers.get('last-modified')

  const result: CacheHeaders = {
    etag: etag ?? undefined,
    lastModified: lastModified ?? undefined,
  }

  if (cacheControl) {
    const directives = cacheControl.toLowerCase().split(',').map(d => d.trim())

    if (directives.includes('no-cache')) {
      result.noCache = true
    }

    if (directives.includes('no-store')) {
      result.noStore = true
    }

    if (directives.includes('must-revalidate')) {
      result.mustRevalidate = true
    }

    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/)
    if (maxAgeMatch) {
      result.maxAge = Number.parseInt(maxAgeMatch[1], 10) * 1000 // Convert to milliseconds
    }
  }

  return result
}

/**
 * Determine if a response should be cached based on headers
 */
export function shouldCache(headers: CacheHeaders): boolean {
  // Never cache if explicitly forbidden
  if (headers.noStore || headers.noCache) {
    return false
  }

  // Cache if max-age is specified
  if (headers.maxAge !== undefined) {
    return headers.maxAge > 0
  }

  // Default to caching if no explicit cache directives
  return true
}

/**
 * Cache with conditional requests (ETag/If-Modified-Since)
 */
export class ConditionalCache extends ResponseCacheImpl {
  private etags = new Map<string, string>()
  private lastModified = new Map<string, string>()

  /**
   * Get cached response with conditional headers
   */
  async getWithConditions(key: string): Promise<{
    data: any | null
    headers: Record<string, string>
  }> {
    const cached = await this.get(key)
    const headers: Record<string, string> = {}

    const etag = this.etags.get(key)
    const lastMod = this.lastModified.get(key)

    if (etag) {
      headers['if-none-match'] = etag
    }

    if (lastMod) {
      headers['if-modified-since'] = lastMod
    }

    return { data: cached, headers }
  }

  /**
   * Cache response with conditional headers
   */
  async setWithConditions(
    key: string,
    value: any,
    headers: CacheHeaders,
    ttl?: number,
  ): Promise<void> {
    await this.set(key, value, ttl)

    if (headers.etag) {
      this.etags.set(key, headers.etag)
    }

    if (headers.lastModified) {
      this.lastModified.set(key, headers.lastModified)
    }
  }

  /**
   * Invalidate cached response and its conditional headers
   */
  async invalidate(key: string): Promise<void> {
    await super.invalidate(key)
    this.etags.delete(key)
    this.lastModified.delete(key)
  }

  /**
   * Clear all cached data including conditional headers
   */
  async clear(): Promise<void> {
    await super.clear()
    this.etags.clear()
    this.lastModified.clear()
  }
}

/**
 * Memory-efficient cache with size limits and LRU eviction
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private readonly maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    // Remove if already exists
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

/**
 * Cache middleware for intercepting requests
 */
export class CacheMiddleware {
  constructor(
    private cache: ResponseCacheImpl,
    private config: CacheConfig,
  ) {}

  /**
   * Intercept request and return cached response if available
   */
  async intercept<T>(
    key: string,
    fn: () => Promise<{ data: T, headers: CacheHeaders }>,
  ): Promise<{ data: T, fromCache: boolean }> {
    if (!this.config.enabled) {
      const result = await fn()
      return { data: result.data, fromCache: false }
    }

    // Try to get from cache
    const cached = await this.cache.get<T>(key)
    if (cached) {
      return { data: cached, fromCache: true }
    }

    // Execute request
    const result = await fn()

    // Cache if appropriate
    if (shouldCache(result.headers)) {
      const ttl = result.headers.maxAge ?? undefined
      await this.cache.set(key, result.data, ttl)
    }

    return { data: result.data, fromCache: false }
  }
}

/**
 * Cache statistics collector
 */
export class CacheStats {
  private hits = 0
  private misses = 0
  private evictions = 0
  private errors = 0

  recordHit(): void {
    this.hits++
  }

  recordMiss(): void {
    this.misses++
  }

  recordEviction(): void {
    this.evictions++
  }

  recordError(): void {
    this.errors++
  }

  getStats() {
    const total = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      errors: this.errors,
      total,
      hitRate: total > 0 ? this.hits / total : 0,
      missRate: total > 0 ? this.misses / total : 0,
    }
  }

  reset(): void {
    this.hits = 0
    this.misses = 0
    this.evictions = 0
    this.errors = 0
  }
}
