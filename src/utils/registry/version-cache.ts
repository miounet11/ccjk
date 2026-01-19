import { existsSync } from 'node:fs'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'pathe'

/**
 * Version cache entry representing a cached package version
 */
export interface VersionCacheEntry {
  version: string
  source: 'npm' | 'taobao' | 'huawei' | 'github'
  timestamp: number
  packageName: string
}

/**
 * Version cache structure stored in the cache file
 */
export interface VersionCache {
  entries: Record<string, VersionCacheEntry>
  lastCleanup: number
}

// Default cache TTL: 24 hours in milliseconds
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000

// Cache file location
const CCJK_CONFIG_DIR = join(homedir(), '.ccjk')
const VERSION_CACHE_FILE = join(CCJK_CONFIG_DIR, 'version-cache.json')

/**
 * Create an empty cache structure
 */
function createEmptyCache(): VersionCache {
  return {
    entries: {},
    lastCleanup: Date.now(),
  }
}

/**
 * Ensure the cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  const dir = dirname(VERSION_CACHE_FILE)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
}

/**
 * Read the version cache from disk
 * Returns an empty cache if file doesn't exist or is invalid
 */
async function readCache(): Promise<VersionCache> {
  try {
    if (!existsSync(VERSION_CACHE_FILE)) {
      return createEmptyCache()
    }

    const content = await readFile(VERSION_CACHE_FILE, 'utf-8')
    const cache = JSON.parse(content) as VersionCache

    // Validate cache structure
    if (!cache.entries || typeof cache.entries !== 'object') {
      return createEmptyCache()
    }

    return cache
  }
  catch {
    // Return empty cache on any error (file not found, invalid JSON, etc.)
    return createEmptyCache()
  }
}

/**
 * Write the version cache to disk atomically
 */
async function writeCache(cache: VersionCache): Promise<void> {
  await ensureCacheDir()

  const content = JSON.stringify(cache, null, 2)
  const tempFile = `${VERSION_CACHE_FILE}.tmp.${Date.now()}`

  try {
    // Write to temp file first
    await writeFile(tempFile, content, 'utf-8')

    // Rename atomically (this is atomic on most file systems)
    const { rename } = await import('node:fs/promises')
    await rename(tempFile, VERSION_CACHE_FILE)
  }
  catch (error) {
    // Clean up temp file if it exists
    try {
      if (existsSync(tempFile)) {
        await unlink(tempFile)
      }
    }
    catch {
      // Ignore cleanup errors
    }
    throw error
  }
}

/**
 * Remove expired entries from the cache
 * @param cache - The cache to clean
 * @param ttl - Time-to-live in milliseconds
 * @returns The cleaned cache
 */
function cleanExpiredEntries(cache: VersionCache, ttl: number = DEFAULT_CACHE_TTL): VersionCache {
  const now = Date.now()
  const cleanedEntries: Record<string, VersionCacheEntry> = {}

  for (const [key, entry] of Object.entries(cache.entries)) {
    const age = now - entry.timestamp
    if (age < ttl) {
      cleanedEntries[key] = entry
    }
  }

  return {
    entries: cleanedEntries,
    lastCleanup: now,
  }
}

/**
 * Check if cleanup is needed (once per hour)
 */
function shouldRunCleanup(cache: VersionCache): boolean {
  const CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour
  return Date.now() - cache.lastCleanup > CLEANUP_INTERVAL
}

/**
 * Get a cached version entry for a package
 * Automatically cleans expired entries periodically
 *
 * @param packageName - The npm package name to look up
 * @returns The cached entry or null if not found/expired
 */
export async function getCachedVersion(packageName: string): Promise<VersionCacheEntry | null> {
  try {
    let cache = await readCache()

    // Run cleanup if needed
    if (shouldRunCleanup(cache)) {
      cache = cleanExpiredEntries(cache)
      await writeCache(cache)
    }

    const entry = cache.entries[packageName]
    if (!entry) {
      return null
    }

    // Check if entry is expired
    const age = Date.now() - entry.timestamp
    if (age >= DEFAULT_CACHE_TTL) {
      return null
    }

    return entry
  }
  catch {
    // Return null on any error to allow fallback to network request
    return null
  }
}

/**
 * Set a cached version entry for a package
 *
 * @param packageName - The npm package name
 * @param version - The version string to cache
 * @param source - The source registry where the version was fetched from
 */
export async function setCachedVersion(
  packageName: string,
  version: string,
  source: VersionCacheEntry['source'],
): Promise<void> {
  try {
    const cache = await readCache()

    cache.entries[packageName] = {
      version,
      source,
      timestamp: Date.now(),
      packageName,
    }

    await writeCache(cache)
  }
  catch (error) {
    // Log error but don't throw - caching failure shouldn't break the main flow
    console.error(`Failed to cache version for ${packageName}:`, error)
  }
}

/**
 * Check if a cached version is still valid (not expired)
 *
 * @param packageName - The npm package name to check
 * @param ttl - Optional custom TTL in milliseconds (default: 24 hours)
 * @returns true if cache exists and is valid, false otherwise
 */
export async function isCacheValid(packageName: string, ttl: number = DEFAULT_CACHE_TTL): Promise<boolean> {
  try {
    const cache = await readCache()
    const entry = cache.entries[packageName]

    if (!entry) {
      return false
    }

    const age = Date.now() - entry.timestamp
    return age < ttl
  }
  catch {
    return false
  }
}

/**
 * Clear all cached version entries
 */
export async function clearCache(): Promise<void> {
  try {
    if (existsSync(VERSION_CACHE_FILE)) {
      await unlink(VERSION_CACHE_FILE)
    }
  }
  catch (error) {
    console.error('Failed to clear version cache:', error)
    throw error
  }
}

/**
 * Get the age of a cached entry in milliseconds
 *
 * @param packageName - The npm package name to check
 * @returns The age in milliseconds, or null if not cached
 */
export async function getCacheAge(packageName: string): Promise<number | null> {
  try {
    const cache = await readCache()
    const entry = cache.entries[packageName]

    if (!entry) {
      return null
    }

    return Date.now() - entry.timestamp
  }
  catch {
    return null
  }
}

/**
 * Get the cache file path (useful for debugging/testing)
 */
export function getCacheFilePath(): string {
  return VERSION_CACHE_FILE
}

/**
 * Get the default cache TTL in milliseconds
 */
export function getDefaultCacheTTL(): number {
  return DEFAULT_CACHE_TTL
}
