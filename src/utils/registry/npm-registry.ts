/**
 * NPM Registry Module - Multi-source version query with waterfall fallback
 *
 * This module provides robust npm package version querying with intelligent
 * fallback across multiple registry sources. It automatically detects user
 * location and prioritizes registries accordingly.
 *
 * Features:
 * - Waterfall fallback: tries multiple sources until one succeeds
 * - Location-aware source prioritization (China users get taobao first)
 * - Configurable timeouts per source
 * - Integration with version cache for performance
 * - GitHub releases as final fallback
 */

import process from 'node:process'
import { i18n } from '../../i18n'

/**
 * Registry source configurations with their base URLs
 */
export const REGISTRIES = {
  npm: 'https://registry.npmjs.org',
  taobao: 'https://registry.npmmirror.com',
  huawei: 'https://repo.huaweicloud.com/repository/npm',
} as const

/**
 * All available registry sources including GitHub as fallback
 */
export type RegistrySource = keyof typeof REGISTRIES | 'github'

/**
 * Result of a successful version query
 */
export interface VersionQueryResult {
  version: string
  source: RegistrySource
}

/**
 * Default timeout for each registry query in milliseconds
 */
const DEFAULT_TIMEOUT_MS = 5000

/**
 * Query the latest version of a package from a specific npm registry
 *
 * @param packageName - The npm package name (e.g., '@anthropic-ai/claude-code')
 * @param registry - The registry base URL
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns The version string or null if query fails
 */
export async function queryVersionFromRegistry(
  packageName: string,
  registry: string,
  timeout: number = DEFAULT_TIMEOUT_MS,
): Promise<string | null> {
  const url = `${registry}/${packageName}/latest`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        // Some registries require a user-agent
        'User-Agent': 'ccjk-version-checker',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      // Log non-200 responses for debugging
      logDebug('registry:queryFailed', {
        registry: getRegistryName(registry),
        status: String(response.status),
      })
      return null
    }

    const data = await response.json() as { version?: string }

    if (data && typeof data.version === 'string') {
      return data.version
    }

    return null
  }
  catch (error) {
    // Handle timeout and network errors gracefully
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        logDebug('registry:timeout', {
          registry: getRegistryName(registry),
          timeout: String(timeout),
        })
      }
      else {
        logDebug('registry:error', {
          registry: getRegistryName(registry),
          error: error.message,
        })
      }
    }
    return null
  }
}

/**
 * Get the display name for a registry URL
 */
function getRegistryName(registry: string): string {
  for (const [name, url] of Object.entries(REGISTRIES)) {
    if (url === registry) {
      return name
    }
  }
  return registry
}

/**
 * Log debug information using i18n
 * Only logs when DEBUG environment variable is set
 */
function logDebug(key: string, params?: Record<string, string>): void {
  if (process.env.DEBUG || process.env.CCJK_DEBUG) {
    const message = i18n.t(`registry:${key}`, params)
    console.debug(`[registry] ${message}`)
  }
}

/**
 * Log info message using i18n
 */
function logInfo(key: string, params?: Record<string, string>): void {
  if (process.env.DEBUG || process.env.CCJK_DEBUG) {
    const message = i18n.t(`registry:${key}`, params)
    console.info(`[registry] ${message}`)
  }
}

/**
 * Detect if the user is likely in China based on environment and timezone
 *
 * Detection methods:
 * 1. Environment variable CCJK_CHINA=1 or CHINA=1
 * 2. Timezone check (Asia/Shanghai, Asia/Chongqing, etc.)
 * 3. Locale check (zh_CN, zh-CN)
 *
 * @returns true if user is likely in China
 */
export function isChinaUser(): boolean {
  // Check explicit environment variable first
  if (process.env.CCJK_CHINA === '1' || process.env.CHINA === '1') {
    return true
  }

  // Check timezone
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const chinaTimezones = [
      'Asia/Shanghai',
      'Asia/Chongqing',
      'Asia/Harbin',
      'Asia/Urumqi',
      'Asia/Hong_Kong',
      'Asia/Macau',
      'Asia/Taipei',
    ]
    if (chinaTimezones.includes(timezone)) {
      return true
    }
  }
  catch {
    // Timezone detection failed, continue with other checks
  }

  // Check locale environment variables
  const locale = process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES || ''
  if (locale.toLowerCase().startsWith('zh_cn') || locale.toLowerCase().startsWith('zh-cn')) {
    return true
  }

  return false
}

/**
 * Get the preferred registry sources based on user location
 *
 * For China users: taobao -> npm -> github
 * For other users: npm -> taobao -> github
 *
 * @returns Ordered array of registry sources to try
 */
export async function getPreferredSources(): Promise<RegistrySource[]> {
  const isChina = isChinaUser()

  if (isChina) {
    logDebug('registry:chinaUserDetected')
    return ['taobao', 'npm', 'github']
  }

  logDebug('registry:globalUserDetected')
  return ['npm', 'taobao', 'github']
}

/**
 * Query version from GitHub releases as a fallback
 *
 * This function attempts to get the latest version from GitHub releases
 * when all npm registries fail.
 *
 * @param packageName - The npm package name
 * @returns The version string or null if query fails
 */
async function queryVersionFromGitHub(packageName: string): Promise<string | null> {
  // Map common package names to their GitHub repositories
  const packageToRepo: Record<string, string> = {
    '@anthropic-ai/claude-code': 'anthropics/claude-code',
    '@musistudio/claude-code-router': 'anthropics/claude-code-router',
    '@cometix/ccline': 'cometix/ccline',
    'ccjk': 'anthropics/ccjk',
  }

  const repo = packageToRepo[packageName]
  if (!repo) {
    logDebug('registry:githubNoMapping', { package: packageName })
    return null
  }

  const url = `https://api.github.com/repos/${repo}/releases/latest`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ccjk-version-checker',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      logDebug('registry:githubQueryFailed', { status: String(response.status) })
      return null
    }

    const data = await response.json() as { tag_name?: string }

    if (data && typeof data.tag_name === 'string') {
      // Remove 'v' prefix if present (e.g., 'v1.2.3' -> '1.2.3')
      const version = data.tag_name.replace(/^v/, '')
      return version
    }

    return null
  }
  catch (error) {
    if (error instanceof Error) {
      logDebug('registry:githubError', { error: error.message })
    }
    return null
  }
}

/**
 * Simple in-memory cache for version queries
 * This provides basic caching when version-cache module is not available
 */
const memoryCache = new Map<string, { version: string, source: RegistrySource, timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get cached version if available and not expired
 */
function getCachedVersion(packageName: string): VersionQueryResult | null {
  const cached = memoryCache.get(packageName)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    logDebug('registry:cacheHit', { package: packageName })
    return { version: cached.version, source: cached.source }
  }
  return null
}

/**
 * Store version in cache
 */
function setCachedVersion(packageName: string, version: string, source: RegistrySource): void {
  memoryCache.set(packageName, { version, source, timestamp: Date.now() })
}

/**
 * Get the latest version of a package with waterfall fallback across multiple sources
 *
 * This is the main entry point for version queries. It:
 * 1. Checks the cache first
 * 2. Determines preferred sources based on user location
 * 3. Tries each source in order until one succeeds
 * 4. Falls back to GitHub releases as a last resort
 * 5. Caches successful results
 *
 * @param packageName - The npm package name (e.g., '@anthropic-ai/claude-code')
 * @returns Version query result with version and source, or null if all sources fail
 */
export async function getLatestVersionWithFallback(
  packageName: string,
): Promise<VersionQueryResult | null> {
  // Check cache first
  const cached = getCachedVersion(packageName)
  if (cached) {
    return cached
  }

  // Get preferred sources based on user location
  const sources = await getPreferredSources()

  logInfo('registry:queryingVersion', { package: packageName })

  // Try each source in order
  for (const source of sources) {
    if (source === 'github') {
      // GitHub is handled separately as it uses a different API
      logInfo('registry:tryingSource', { source: 'github' })
      const version = await queryVersionFromGitHub(packageName)
      if (version) {
        logInfo('registry:sourceSuccess', { source: 'github', version })
        setCachedVersion(packageName, version, 'github')
        return { version, source: 'github' }
      }
      continue
    }

    // Query npm registry
    const registry = REGISTRIES[source]
    logInfo('registry:tryingSource', { source })

    const version = await queryVersionFromRegistry(packageName, registry)
    if (version) {
      logInfo('registry:sourceSuccess', { source, version })
      setCachedVersion(packageName, version, source)
      return { version, source }
    }

    logInfo('registry:sourceFailed', { source })
  }

  // All sources failed
  logInfo('registry:allSourcesFailed', { package: packageName })
  return null
}

/**
 * Clear the version cache
 * Useful for testing or forcing fresh queries
 */
export function clearVersionCache(): void {
  memoryCache.clear()
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { size: number, entries: string[] } {
  return {
    size: memoryCache.size,
    entries: Array.from(memoryCache.keys()),
  }
}

/**
 * Query version with explicit source selection
 * Useful when you want to query a specific registry without fallback
 *
 * @param packageName - The npm package name
 * @param source - The specific source to query
 * @param timeout - Optional timeout in milliseconds
 * @returns The version string or null if query fails
 */
export async function queryVersionFromSource(
  packageName: string,
  source: RegistrySource,
  timeout?: number,
): Promise<string | null> {
  if (source === 'github') {
    return queryVersionFromGitHub(packageName)
  }

  const registry = REGISTRIES[source]
  return queryVersionFromRegistry(packageName, registry, timeout)
}

/**
 * Check if a specific registry is reachable
 * Useful for network diagnostics
 *
 * @param source - The registry source to check
 * @param timeout - Optional timeout in milliseconds
 * @returns true if the registry responds within timeout
 */
export async function isRegistryReachable(
  source: Exclude<RegistrySource, 'github'>,
  timeout: number = 3000,
): Promise<boolean> {
  const registry = REGISTRIES[source]
  const testPackage = 'lodash' // A well-known package that should always exist

  try {
    const version = await queryVersionFromRegistry(testPackage, registry, timeout)
    return version !== null
  }
  catch {
    return false
  }
}

/**
 * Get all reachable registries
 * Useful for diagnostics and selecting the best source
 *
 * @returns Array of reachable registry sources
 */
export async function getReachableRegistries(): Promise<Array<Exclude<RegistrySource, 'github'>>> {
  const sources: Array<Exclude<RegistrySource, 'github'>> = ['npm', 'taobao', 'huawei']
  const results = await Promise.all(
    sources.map(async (source) => {
      const reachable = await isRegistryReachable(source)
      return { source, reachable }
    }),
  )

  return results
    .filter(r => r.reachable)
    .map(r => r.source)
}
