/**
 * Cache Management for Cloud Client
 *
 * Implements caching layer using cache-manager with filesystem storage
 * @module cloud-client/cache
 */

import type { CloudClient } from './client'
import type {
  ProjectAnalysisResponse,
  TemplateResponse,
  BatchTemplateRequest,
  BatchTemplateResponse,
  CacheEntry,
  CloudClientConfig,
  ProjectAnalysisRequest,
} from './types'
import consola from 'consola'
import { hash } from 'ohash'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Simple in-memory cache with filesystem persistence
 */
export class CloudCache {
  private memoryCache: Map<string, CacheEntry<any>>
  private cacheDir: string
  private enabled: boolean

  constructor(config: CloudClientConfig) {
    this.memoryCache = new Map()
    this.enabled = config.enableCache !== false
    this.cacheDir = config.cacheDir || path.join(process.cwd(), '.ccjk-cache')

    if (this.enabled) {
      this.ensureCacheDir()
      this.loadCacheFromDisk()
    }
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDir(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true })
        consola.debug('Created cache directory:', this.cacheDir)
      }
    }
    catch (error) {
      consola.warn('Failed to create cache directory, disabling cache:', error)
      this.enabled = false
    }
  }

  /**
   * Load cache from disk
   */
  private loadCacheFromDisk(): void {
    try {
      const cacheFile = path.join(this.cacheDir, 'cache.json')
      if (fs.existsSync(cacheFile)) {
        const data = fs.readFileSync(cacheFile, 'utf-8')
        const entries = JSON.parse(data) as Record<string, CacheEntry<any>>

        // Filter expired entries
        const now = Date.now()
        for (const [key, entry] of Object.entries(entries)) {
          if (entry.expiresAt > now) {
            this.memoryCache.set(key, entry)
          }
        }

        consola.debug(`Loaded ${this.memoryCache.size} cache entries from disk`)
      }
    }
    catch (error) {
      consola.warn('Failed to load cache from disk:', error)
    }
  }

  /**
   * Save cache to disk
   */
  private saveCacheToDisk(): void {
    try {
      const cacheFile = path.join(this.cacheDir, 'cache.json')
      const entries = Object.fromEntries(this.memoryCache)
      fs.writeFileSync(cacheFile, JSON.stringify(entries, null, 2))
    }
    catch (error) {
      consola.warn('Failed to save cache to disk:', error)
    }
  }

  /**
   * Generate cache key from parameters
   */
  generateKey(prefix: string, params: Record<string, any>): string {
    const hashValue = hash(params)
    return `${prefix}:${hashValue}`
  }

  /**
   * Get cached value
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get<T>(key: string): T | undefined {
    if (!this.enabled) {
      return undefined
    }

    const entry = this.memoryCache.get(key)
    if (!entry) {
      return undefined
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key)
      this.saveCacheToDisk()
      return undefined
    }

    consola.debug(`Cache hit: ${key}`)
    return entry.data as T
  }

  /**
   * Set cached value with TTL
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time to live in seconds
   */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    if (!this.enabled) {
      return
    }

    const entry: CacheEntry<T> = {
      data: value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      key,
    }

    this.memoryCache.set(key, entry)
    this.saveCacheToDisk()
    consola.debug(`Cache set: ${key} (TTL: ${ttlSeconds}s)`)
  }

  /**
   * Delete cache entry
   *
   * @param key - Cache key
   */
  delete(key: string): void {
    this.memoryCache.delete(key)
    this.saveCacheToDisk()
    consola.debug(`Cache deleted: ${key}`)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear()
    this.saveCacheToDisk()
    consola.debug('Cache cleared')
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      this.saveCacheToDisk()
      consola.debug(`Cleaned ${cleaned} expired cache entries`)
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys()),
    }
  }
}

/**
 * Cached Cloud Client
 *
 * Wraps CloudClient with caching layer
 */
export class CachedCloudClient {
  private client: CloudClient
  private cache: CloudCache

  constructor(client: CloudClient, cache: CloudCache) {
    this.client = client
    this.cache = cache
  }

  /**
   * Analyze project with caching (7-day TTL)
   */
  async analyzeProject(request: ProjectAnalysisRequest): Promise<ProjectAnalysisResponse> {
    const cacheKey = this.cache.generateKey('analyze', request)

    // Check cache first
    const cached = this.cache.get<ProjectAnalysisResponse>(cacheKey)
    if (cached) {
      return cached
    }

    // Call API and cache result
    const result = await this.client.analyzeProject(request)
    this.cache.set(cacheKey, result, 7 * 24 * 60 * 60) // 7 days

    return result
  }

  /**
   * Get template with caching (30-day TTL)
   */
  async getTemplate(id: string, language?: string): Promise<TemplateResponse> {
    const cacheKey = this.cache.generateKey('template', { id, language })

    // Check cache first
    const cached = this.cache.get<TemplateResponse>(cacheKey)
    if (cached) {
      return cached
    }

    // Call API and cache result
    const result = await this.client.getTemplate(id, language)
    this.cache.set(cacheKey, result, 30 * 24 * 60 * 60) // 30 days

    return result
  }

  /**
   * Get batch templates with caching (30-day TTL)
   */
  async getBatchTemplates(request: BatchTemplateRequest): Promise<BatchTemplateResponse> {
    const cacheKey = this.cache.generateKey('batch', request)

    // Check cache first
    const cached = this.cache.get<BatchTemplateResponse>(cacheKey)
    if (cached) {
      return cached
    }

    // Call API and cache result
    const result = await this.client.getBatchTemplates(request)
    this.cache.set(cacheKey, result, 30 * 24 * 60 * 60) // 30 days

    return result
  }

  /**
   * Report usage (no caching)
   */
  async reportUsage(report: any): Promise<any> {
    return this.client.reportUsage(report)
  }

  /**
   * Health check with caching (5-minute TTL)
   */
  async healthCheck(): Promise<any> {
    const cacheKey = 'health:check'

    // Check cache first
    const cached = this.cache.get<any>(cacheKey)
    if (cached) {
      return cached
    }

    // Call API and cache result
    const result = await this.client.healthCheck()
    this.cache.set(cacheKey, result, 5 * 60) // 5 minutes

    return result
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Clean expired cache entries
   */
  cleanCache(): void {
    this.cache.cleanExpired()
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * Get underlying client
   */
  getClient(): CloudClient {
    return this.client
  }
}
