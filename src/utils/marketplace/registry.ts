/**
 * Marketplace Registry Service
 *
 * Handles fetching, caching, and searching the package registry.
 * Provides core functionality for package discovery and metadata retrieval.
 *
 * @module utils/marketplace/registry
 */

import type {
  MarketplacePackage,
  MarketplaceRegistry,
  MarketplaceSearchOptions,
  MarketplaceSearchResult,
  RegistryCacheConfig,
} from '../../types/marketplace.js'
import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { writeFileAtomicAsync } from '../fs-operations.js'

/**
 * Default registry URL
 *
 * Points to the official CCJK marketplace registry.
 * Can be overridden via configuration.
 */
const DEFAULT_REGISTRY_URL = 'https://registry.api.claudehome.cn/v1'

/**
 * Default cache configuration
 *
 * Provides sensible defaults for registry caching:
 * - Cache directory: ~/.ccjk/cache
 * - TTL: 1 hour (3600 seconds)
 * - Enabled by default
 */
const DEFAULT_CACHE_CONFIG: RegistryCacheConfig = {
  cacheDir: join(homedir(), '.ccjk', 'cache'),
  ttl: 3600, // 1 hour
  enabled: true,
}

/**
 * Built-in packages registry
 *
 * Local registry for built-in packages that are always available.
 * These packages are bundled with CCJK and don't require network access.
 */
const BUILTIN_PACKAGES: MarketplacePackage[] = [
  // Built-in packages will be added here in future versions
]

/**
 * Get the cache file path
 *
 * Returns the absolute path to the registry cache file.
 *
 * @param cacheDir - Cache directory path
 * @returns Absolute path to cache file
 */
export function getCacheFilePath(cacheDir: string): string {
  return join(cacheDir, 'registry-cache.json')
}

/**
 * Check if cache is valid
 *
 * Validates cache based on TTL (time-to-live).
 * Returns false if cache doesn't exist or has expired.
 *
 * @param cacheDir - Cache directory path
 * @param ttl - Time-to-live in seconds
 * @returns True if cache is valid and not expired
 */
export async function isCacheValid(
  cacheDir: string,
  ttl: number,
): Promise<boolean> {
  const cachePath = getCacheFilePath(cacheDir)
  if (!existsSync(cachePath)) {
    return false
  }

  try {
    const content = await readFile(cachePath, 'utf-8')
    const cache = JSON.parse(content)
    const cacheTime = new Date(cache.lastUpdated).getTime()
    const now = Date.now()
    return (now - cacheTime) < (ttl * 1000)
  }
  catch {
    return false
  }
}

/**
 * Read registry from cache
 *
 * Attempts to read and parse the cached registry.
 * Returns null if cache doesn't exist or is invalid.
 *
 * @param cacheDir - Cache directory path
 * @returns Cached registry or null if unavailable
 */
export async function readCachedRegistry(
  cacheDir: string,
): Promise<MarketplaceRegistry | null> {
  const cachePath = getCacheFilePath(cacheDir)
  if (!existsSync(cachePath)) {
    return null
  }

  try {
    const content = await readFile(cachePath, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return null
  }
}

/**
 * Write registry to cache
 *
 * Persists the registry to disk cache.
 * Creates cache directory if it doesn't exist.
 *
 * @param cacheDir - Cache directory path
 * @param registry - Registry to cache
 */
export async function writeCacheRegistry(
  cacheDir: string,
  registry: MarketplaceRegistry,
): Promise<void> {
  await mkdir(cacheDir, { recursive: true })
  const cachePath = getCacheFilePath(cacheDir)
  await writeFileAtomicAsync(cachePath, JSON.stringify(registry, null, 2))
}

/**
 * Fetch registry from remote URL
 *
 * Downloads the registry from the remote marketplace server.
 * Includes timeout and proper error handling.
 *
 * @param registryUrl - Registry base URL
 * @param timeout - Request timeout in milliseconds
 * @returns Registry data from remote server
 * @throws Error if fetch fails or times out
 */
export async function fetchRemoteRegistry(
  registryUrl: string = DEFAULT_REGISTRY_URL,
  timeout: number = 30000,
): Promise<MarketplaceRegistry> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(`${registryUrl}/registry.json`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ccjk-cli',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json() as MarketplaceRegistry
  }
  finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Get the marketplace registry
 *
 * Main entry point for accessing the registry.
 * Implements intelligent caching with fallback strategies:
 * 1. Check cache if enabled and not force refresh
 * 2. Fetch from remote if cache miss or expired
 * 3. Fallback to cache if remote fetch fails
 * 4. Fallback to built-in packages if all else fails
 *
 * @param options - Registry fetch options
 * @param options.registryUrl - Custom registry URL
 * @param options.cache - Cache configuration overrides
 * @param options.forceRefresh - Skip cache and force remote fetch
 * @returns Registry data
 */
export async function getRegistry(
  options: {
    registryUrl?: string
    cache?: Partial<RegistryCacheConfig>
    forceRefresh?: boolean
  } = {},
): Promise<MarketplaceRegistry> {
  const cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...options.cache }
  const registryUrl = options.registryUrl || DEFAULT_REGISTRY_URL

  // Check cache first (unless force refresh)
  if (cacheConfig.enabled && !options.forceRefresh) {
    const cacheValid = await isCacheValid(cacheConfig.cacheDir, cacheConfig.ttl)
    if (cacheValid) {
      const cached = await readCachedRegistry(cacheConfig.cacheDir)
      if (cached) {
        return cached
      }
    }
  }

  // Fetch from remote
  try {
    const registry = await fetchRemoteRegistry(registryUrl)

    // Update cache
    if (cacheConfig.enabled) {
      await writeCacheRegistry(cacheConfig.cacheDir, registry)
    }

    return registry
  }
  catch {
    // Fallback to cache if available
    const cached = await readCachedRegistry(cacheConfig.cacheDir)
    if (cached) {
      return cached
    }

    // Return local registry with built-in packages
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      url: registryUrl,
      packages: BUILTIN_PACKAGES,
      categories: {
        'plugin': 0,
        'skill': 0,
        'workflow': 0,
        'agent': 0,
        'mcp-service': 0,
        'output-style': 0,
        'bundle': 0,
      },
    }
  }
}

/**
 * Search packages in the registry
 *
 * Provides comprehensive package search with filtering and sorting.
 * Supports:
 * - Text search (name, description, keywords)
 * - Category filtering
 * - Author filtering
 * - Verification status filtering
 * - Keyword filtering (AND logic)
 * - Rating filtering
 * - Multiple sort options
 * - Pagination
 *
 * @param options - Search and filter options
 * @returns Search results with pagination info
 */
export async function searchPackages(
  options: MarketplaceSearchOptions = {},
): Promise<MarketplaceSearchResult> {
  const registry = await getRegistry()
  let packages = [...registry.packages]

  // Apply filters
  if (options.query) {
    const query = options.query.toLowerCase()
    packages = packages.filter(pkg =>
      pkg.name.toLowerCase().includes(query)
      || pkg.id.toLowerCase().includes(query)
      || pkg.keywords.some(k => k.toLowerCase().includes(query))
      || Object.values(pkg.description).some(d => d.toLowerCase().includes(query)),
    )
  }

  if (options.category) {
    packages = packages.filter(pkg => pkg.category === options.category)
  }

  if (options.author) {
    packages = packages.filter(pkg =>
      pkg.author.toLowerCase().includes(options.author!.toLowerCase()),
    )
  }

  if (options.verified) {
    packages = packages.filter(pkg => pkg.verified === options.verified)
  }

  if (options.keywords?.length) {
    packages = packages.filter(pkg =>
      options.keywords!.some(k => pkg.keywords.includes(k)),
    )
  }

  if (options.minRating) {
    packages = packages.filter(pkg => pkg.rating >= options.minRating!)
  }

  if (options.supportedTool) {
    packages = packages.filter(pkg =>
      pkg.supportedTools?.includes(options.supportedTool!),
    )
  }

  // Sort
  const sortBy = options.sortBy || 'downloads'
  const sortDir = options.sortDir || 'desc'

  packages.sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'downloads':
        comparison = a.downloads - b.downloads
        break
      case 'rating':
        comparison = a.rating - b.rating
        break
      case 'updated':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
      case 'created':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
    }
    return sortDir === 'desc' ? -comparison : comparison
  })

  // Pagination
  const total = packages.length
  const offset = options.offset || 0
  const limit = options.limit || 20
  packages = packages.slice(offset, offset + limit)

  return {
    packages,
    total,
    offset,
    limit,
    query: options.query,
    filters: options,
  }
}

/**
 * Get package by ID
 *
 * Retrieves a specific package from the registry by its unique ID.
 *
 * @param packageId - Unique package identifier
 * @returns Package metadata or null if not found
 */
export async function getPackage(
  packageId: string,
): Promise<MarketplacePackage | null> {
  const registry = await getRegistry()
  return registry.packages.find(pkg => pkg.id === packageId) || null
}

/**
 * Get package versions
 *
 * Retrieves all available versions for a package.
 * In the current implementation, returns the latest version only.
 * Future versions will support full version history.
 *
 * @param packageId - Unique package identifier
 * @returns Array of available versions
 */
export async function getPackageVersions(
  packageId: string,
): Promise<string[]> {
  // In a real implementation, this would fetch from the registry API
  const pkg = await getPackage(packageId)
  return pkg ? [pkg.version] : []
}

/**
 * Get featured packages
 *
 * Returns packages marked as featured in the registry.
 * Falls back to top downloaded packages if no featured list exists.
 *
 * @returns Array of featured packages
 */
export async function getFeaturedPackages(): Promise<MarketplacePackage[]> {
  const registry = await getRegistry()
  if (!registry.featured?.length) {
    // Return top downloaded packages as featured
    return registry.packages
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 5)
  }

  return registry.packages.filter(pkg =>
    registry.featured!.includes(pkg.id),
  )
}

/**
 * Get packages by category
 *
 * Retrieves all packages in a specific category.
 *
 * @param category - Package category
 * @returns Array of packages in the category
 */
export async function getPackagesByCategory(
  category: string,
): Promise<MarketplacePackage[]> {
  const result = await searchPackages({ category: category as any })
  return result.packages
}
