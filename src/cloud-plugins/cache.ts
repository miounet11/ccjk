/**
 * Local Plugin Cache System
 *
 * Provides local caching for cloud-based plugins to improve performance
 * and reduce network requests. Supports cache expiration, size limits,
 * and atomic file operations.
 */

import type { CacheStats, CloudPlugin, CloudPluginCache } from './types'
import { Buffer } from 'node:buffer'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { writeFileAtomic } from '../utils/fs-operations'

// ============================================================================
// Constants
// ============================================================================

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** Cache time-to-live: 24 hours in milliseconds */
  TTL: 24 * 60 * 60 * 1000,
  /** Maximum number of plugins to cache */
  MAX_PLUGINS: 1000,
  /** Cache version for compatibility tracking */
  VERSION: '1.0.0',
  /** Maximum size for individual plugin content (5MB) */
  MAX_CONTENT_SIZE: 5 * 1024 * 1024,
} as const

/**
 * Cache directory paths
 */
const CACHE_BASE_DIR = join(homedir(), '.ccjk', 'cloud-plugins', 'cache')

// ============================================================================
// Local Plugin Cache Class
// ============================================================================

/**
 * Local Plugin Cache
 *
 * Manages local caching of cloud plugin metadata and content.
 * Provides thread-safe operations with atomic writes and proper error handling.
 */
export class LocalPluginCache {
  private cacheDir: string
  private cacheFile: string
  private contentDir: string
  private cache: CloudPluginCache | null = null

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || CACHE_BASE_DIR
    this.cacheFile = join(this.cacheDir, 'metadata.json')
    this.contentDir = join(this.cacheDir, 'contents')
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Ensure cache directory exists
   */
  ensureCacheDir(): void {
    try {
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true })
      }
      if (!existsSync(this.contentDir)) {
        mkdirSync(this.contentDir, { recursive: true })
      }
    }
    catch (error) {
      throw new Error(`Failed to create cache directory: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // ==========================================================================
  // Cache Metadata Operations
  // ==========================================================================

  /**
   * Load cache metadata from disk
   *
   * @returns Cache metadata or null if not found or invalid
   */
  loadCache(): CloudPluginCache | null {
    try {
      if (!existsSync(this.cacheFile)) {
        return null
      }

      const content = readFileSync(this.cacheFile, 'utf-8')
      const cache = JSON.parse(content) as CloudPluginCache

      // Validate cache structure
      if (!this.isValidCache(cache)) {
        console.warn('[LocalPluginCache] Invalid cache structure, ignoring')
        return null
      }

      // Check version compatibility
      if (cache.version !== CACHE_CONFIG.VERSION) {
        console.warn(`[LocalPluginCache] Cache version mismatch (${cache.version} vs ${CACHE_CONFIG.VERSION}), ignoring`)
        return null
      }

      this.cache = cache
      return cache
    }
    catch (error) {
      console.error('[LocalPluginCache] Failed to load cache:', error)
      return null
    }
  }

  /**
   * Save cache metadata to disk
   *
   * Uses atomic write operation to prevent corruption
   *
   * @param cache - Cache metadata to save
   */
  saveCache(cache: CloudPluginCache): void {
    try {
      this.ensureCacheDir()

      // Validate before saving
      if (!this.isValidCache(cache)) {
        throw new Error('Invalid cache structure')
      }

      // Enforce size limits
      if (cache.plugins.length > CACHE_CONFIG.MAX_PLUGINS) {
        console.warn(`[LocalPluginCache] Cache exceeds max plugins (${cache.plugins.length}), truncating`)
        cache.plugins = cache.plugins.slice(0, CACHE_CONFIG.MAX_PLUGINS)
        cache.totalPlugins = cache.plugins.length
      }

      // Atomic write using shared utility
      const content = JSON.stringify(cache, null, 2)
      writeFileAtomic(this.cacheFile, content, 'utf-8')

      this.cache = cache
    }
    catch (error) {
      throw new Error(`Failed to save cache: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get cached plugins
   *
   * @returns Array of cached plugins
   */
  getCachedPlugins(): CloudPlugin[] {
    if (!this.cache) {
      this.cache = this.loadCache()
    }
    return this.cache?.plugins || []
  }

  /**
   * Get a single cached plugin by ID
   *
   * @param id - Plugin ID
   * @returns Plugin or undefined if not found
   */
  getCachedPlugin(id: string): CloudPlugin | undefined {
    const plugins = this.getCachedPlugins()
    return plugins.find(p => p.id === id)
  }

  /**
   * Update cache with new plugin list
   *
   * @param plugins - New plugin list
   */
  updateCache(plugins: CloudPlugin[]): void {
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + CACHE_CONFIG.TTL).toISOString()

    const cache: CloudPluginCache = {
      version: CACHE_CONFIG.VERSION,
      plugins,
      createdAt: this.cache?.createdAt || now,
      expiresAt,
      lastUpdated: now,
      totalPlugins: plugins.length,
    }

    this.saveCache(cache)
  }

  // ==========================================================================
  // Cache Expiration
  // ==========================================================================

  /**
   * Check if cache is expired
   *
   * @returns True if cache is expired or doesn't exist
   */
  isCacheExpired(): boolean {
    if (!this.cache) {
      this.cache = this.loadCache()
    }

    if (!this.cache) {
      return true
    }

    const expiresAt = new Date(this.cache.expiresAt).getTime()
    const now = Date.now()

    return now >= expiresAt
  }

  /**
   * Clear all cache data
   */
  clearCache(): void {
    try {
      // Remove metadata file
      if (existsSync(this.cacheFile)) {
        unlinkSync(this.cacheFile)
      }

      // Remove all cached content files
      if (existsSync(this.contentDir)) {
        const files = readdirSync(this.contentDir)
        for (const file of files) {
          const filePath = join(this.contentDir, file)
          if (existsSync(filePath)) {
            unlinkSync(filePath)
          }
        }
      }

      this.cache = null
    }
    catch (error) {
      throw new Error(`Failed to clear cache: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // ==========================================================================
  // Plugin Content Caching
  // ==========================================================================

  /**
   * Cache plugin content to disk
   *
   * @param pluginId - Plugin ID
   * @param content - Plugin content (code/template)
   * @returns Path to cached content file
   */
  cachePluginContent(pluginId: string, content: string): string {
    try {
      this.ensureCacheDir()

      // Validate content size
      const contentSize = Buffer.byteLength(content, 'utf-8')
      if (contentSize > CACHE_CONFIG.MAX_CONTENT_SIZE) {
        throw new Error(`Content size (${contentSize} bytes) exceeds maximum (${CACHE_CONFIG.MAX_CONTENT_SIZE} bytes)`)
      }

      // Sanitize plugin ID for filename
      const safeId = this.sanitizeFilename(pluginId)
      const contentPath = join(this.contentDir, `${safeId}.txt`)

      // Atomic write using shared utility
      writeFileAtomic(contentPath, content, 'utf-8')

      return contentPath
    }
    catch (error) {
      throw new Error(`Failed to cache plugin content: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get cached plugin content
   *
   * @param pluginId - Plugin ID
   * @returns Plugin content or null if not cached
   */
  getPluginContent(pluginId: string): string | null {
    try {
      const safeId = this.sanitizeFilename(pluginId)
      const contentPath = join(this.contentDir, `${safeId}.txt`)

      if (!existsSync(contentPath)) {
        return null
      }

      return readFileSync(contentPath, 'utf-8')
    }
    catch (error) {
      console.error(`[LocalPluginCache] Failed to read plugin content: ${error}`)
      return null
    }
  }

  /**
   * Remove cached plugin content
   *
   * @param pluginId - Plugin ID
   * @returns True if content was removed
   */
  removePluginContent(pluginId: string): boolean {
    try {
      const safeId = this.sanitizeFilename(pluginId)
      const contentPath = join(this.contentDir, `${safeId}.txt`)

      if (existsSync(contentPath)) {
        unlinkSync(contentPath)
        return true
      }

      return false
    }
    catch (error) {
      console.error(`[LocalPluginCache] Failed to remove plugin content: ${error}`)
      return false
    }
  }

  // ==========================================================================
  // Cache Statistics
  // ==========================================================================

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  getCacheStats(): CacheStats {
    if (!this.cache) {
      this.cache = this.loadCache()
    }

    const totalPlugins = this.cache?.totalPlugins || 0
    const lastUpdated = this.cache?.lastUpdated || null
    const expiresAt = this.cache?.expiresAt || null
    const isExpired = this.isCacheExpired()

    // Calculate cache size
    let cacheSize = 0
    let cachedContents = 0

    try {
      // Add metadata file size
      if (existsSync(this.cacheFile)) {
        cacheSize += statSync(this.cacheFile).size
      }

      // Add content files size
      if (existsSync(this.contentDir)) {
        const files = readdirSync(this.contentDir)
        for (const file of files) {
          const filePath = join(this.contentDir, file)
          if (existsSync(filePath)) {
            cacheSize += statSync(filePath).size
            cachedContents++
          }
        }
      }
    }
    catch (error) {
      console.error('[LocalPluginCache] Failed to calculate cache size:', error)
    }

    return {
      totalPlugins,
      cacheSize,
      lastUpdated,
      expiresAt,
      isExpired,
      cachedContents,
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Validate cache structure
   *
   * @param cache - Cache to validate
   * @returns True if cache is valid
   */
  private isValidCache(cache: any): cache is CloudPluginCache {
    return (
      cache
      && typeof cache === 'object'
      && typeof cache.version === 'string'
      && Array.isArray(cache.plugins)
      && typeof cache.createdAt === 'string'
      && typeof cache.expiresAt === 'string'
      && typeof cache.lastUpdated === 'string'
      && typeof cache.totalPlugins === 'number'
    )
  }

  /**
   * Sanitize filename to prevent path traversal
   *
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  private sanitizeFilename(filename: string): string {
    // Remove path separators and special characters
    return filename
      .replace(/[/\\]/g, '_')
      .replace(/[^\w.-]/g, '_')
      .substring(0, 255) // Limit filename length
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the default cache instance
 */
let defaultCacheInstance: LocalPluginCache | null = null

export function getDefaultCache(): LocalPluginCache {
  if (!defaultCacheInstance) {
    defaultCacheInstance = new LocalPluginCache()
  }
  return defaultCacheInstance
}

/**
 * Load cached plugins
 *
 * @returns Array of cached plugins
 */
export function loadCachedPlugins(): CloudPlugin[] {
  const cache = getDefaultCache()
  return cache.getCachedPlugins()
}

/**
 * Update plugin cache
 *
 * @param plugins - New plugin list
 */
export function updatePluginCache(plugins: CloudPlugin[]): void {
  const cache = getDefaultCache()
  cache.updateCache(plugins)
}

/**
 * Check if cache is expired
 *
 * @returns True if cache is expired
 */
export function isCacheExpired(): boolean {
  const cache = getDefaultCache()
  return cache.isCacheExpired()
}

/**
 * Clear plugin cache
 */
export function clearPluginCache(): void {
  const cache = getDefaultCache()
  cache.clearCache()
}

/**
 * Get cache statistics
 *
 * @returns Cache statistics
 */
export function getCacheStats(): CacheStats {
  const cache = getDefaultCache()
  return cache.getCacheStats()
}
