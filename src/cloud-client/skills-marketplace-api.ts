/**
 * Skills Marketplace API Client
 *
 * Provides API methods for interacting with the CCJK Skills Marketplace.
 * All marketplace endpoints are public and do not require authentication.
 *
 * @module skills-marketplace-api
 */

import type {
  MarketplaceParams,
  MarketplaceResponse,
  SearchParams,
  SearchResponse,
  SuggestionsParams,
  SuggestionsResponse,
  TrendingParams,
  TrendingResponse,
} from './skills-marketplace-types'

/** Base URL for the CCJK API */
const API_BASE_URL = 'https://api.claudehome.cn/api/v1'

/** Default cache TTL in milliseconds (5 minutes) */
const DEFAULT_CACHE_TTL = 5 * 60 * 1000

/** Cache entry interface */
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

/** Request options interface */
interface RequestOptions {
  /** AbortController signal for request cancellation */
  signal?: AbortSignal
  /** Cache TTL in milliseconds. Set to 0 to disable caching */
  cacheTtl?: number
  /** Force refresh, bypassing cache */
  forceRefresh?: boolean
}

/** API Error class for marketplace errors */
export class SkillsMarketplaceApiError extends Error {
  /** HTTP status code */
  public readonly status: number
  /** Error code from API response */
  public readonly code?: string
  /** Original response data */
  public readonly data?: unknown

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message)
    this.name = 'SkillsMarketplaceApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

/**
 * Simple in-memory cache for API responses
 */
class ResponseCache {
  private cache = new Map<string, CacheEntry<unknown>>()

  /**
   * Get cached data if valid
   * @param key - Cache key
   * @returns Cached data or undefined if not found/expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (!entry) {
      return undefined
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return undefined
    }

    return entry.data
  }

  /**
   * Set cache entry
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds
   */
  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Delete a specific cache entry
   * @param key - Cache key to delete
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Get cache size
   * @returns Number of cached entries
   */
  get size(): number {
    return this.cache.size
  }
}

/** Global response cache instance */
const responseCache = new ResponseCache()

/**
 * Generate cache key from endpoint and params
 * @param endpoint - API endpoint
 * @param params - Request parameters
 * @returns Cache key string
 */
function generateCacheKey(endpoint: string, params?: Record<string, unknown>): string {
  const sortedParams = params
    ? Object.keys(params)
        .sort()
        .reduce(
          (acc, key) => {
            if (params[key] !== undefined && params[key] !== null) {
              acc[key] = params[key]
            }
            return acc
          },
          {} as Record<string, unknown>,
        )
    : {}

  return `${endpoint}:${JSON.stringify(sortedParams)}`
}

/**
 * Build URL with query parameters
 * @param endpoint - API endpoint path
 * @param params - Query parameters
 * @returns Full URL with query string
 */
function buildUrl(endpoint: string, params?: Record<string, unknown>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  return url.toString()
}

/**
 * Make HTTP GET request to the API
 * @param endpoint - API endpoint path
 * @param params - Query parameters
 * @param options - Request options
 * @returns Parsed JSON response
 * @throws {SkillsMarketplaceApiError} When request fails
 */
async function fetchApi<T>(
  endpoint: string,
  params?: Record<string, unknown>,
  options: RequestOptions = {},
): Promise<T> {
  const { signal, cacheTtl = DEFAULT_CACHE_TTL, forceRefresh = false } = options

  // Check cache first (unless force refresh)
  if (cacheTtl > 0 && !forceRefresh) {
    const cacheKey = generateCacheKey(endpoint, params)
    const cached = responseCache.get<T>(cacheKey)
    if (cached !== undefined) {
      return cached
    }
  }

  const url = buildUrl(endpoint, params)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal,
    })

    if (!response.ok) {
      let errorData: unknown
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      let errorCode: string | undefined

      try {
        errorData = await response.json()
        if (typeof errorData === 'object' && errorData !== null) {
          const err = errorData as Record<string, unknown>
          if (typeof err.message === 'string') {
            errorMessage = err.message
          }
          if (typeof err.code === 'string') {
            errorCode = err.code
          }
        }
      }
      catch {
        // Ignore JSON parse errors for error response
      }

      throw new SkillsMarketplaceApiError(errorMessage, response.status, errorCode, errorData)
    }

    const data = (await response.json()) as T

    // Cache successful response
    if (cacheTtl > 0) {
      const cacheKey = generateCacheKey(endpoint, params)
      responseCache.set(cacheKey, data, cacheTtl)
    }

    return data
  }
  catch (error) {
    // Re-throw API errors
    if (error instanceof SkillsMarketplaceApiError) {
      throw error
    }

    // Handle abort errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SkillsMarketplaceApiError('Request was cancelled', 0, 'ABORT_ERROR')
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new SkillsMarketplaceApiError(
        'Network error: Unable to connect to the API',
        0,
        'NETWORK_ERROR',
      )
    }

    // Handle other errors
    throw new SkillsMarketplaceApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      0,
      'UNKNOWN_ERROR',
    )
  }
}

/**
 * Get skills from the marketplace with pagination and filtering
 *
 * @param params - Query parameters for filtering and pagination
 * @param params.page - Page number (default: 1)
 * @param params.limit - Items per page (default: 20, max: 100)
 * @param params.category - Filter by category
 * @param params.provider - Filter by provider
 * @param params.sort - Sort order (popular, newest, updated, name)
 * @param params.isOfficial - Filter official skills only
 * @param params.isTrending - Filter trending skills only
 * @param options - Request options (signal, cacheTtl, forceRefresh)
 * @returns Paginated marketplace response with skills array
 *
 * @example
 * ```typescript
 * // Get first page of trending skills
 * const result = await getMarketplace({ isTrending: true, limit: 10 })
 * console.log(result.data) // Array of skills
 * console.log(result.pagination) // Pagination info
 *
 * // With request cancellation
 * const controller = new AbortController()
 * const result = await getMarketplace({}, { signal: controller.signal })
 * // Later: controller.abort()
 * ```
 */
export async function getMarketplace(
  params: MarketplaceParams = {},
  options: RequestOptions = {},
): Promise<MarketplaceResponse> {
  return fetchApi<MarketplaceResponse>('/skills/marketplace', params as unknown as Record<string, unknown>, options)
}

/**
 * Search skills in the marketplace
 *
 * @param params - Search parameters
 * @param params.q - Search query (required)
 * @param params.category - Filter by category
 * @param params.provider - Filter by provider
 * @param params.limit - Maximum results (default: 20)
 * @param params.offset - Results offset for pagination (default: 0)
 * @param options - Request options (signal, cacheTtl, forceRefresh)
 * @returns Search results with matching skills
 *
 * @example
 * ```typescript
 * // Search for git-related skills
 * const result = await searchSkills({ q: 'git', limit: 10 })
 * console.log(result.data) // Array of matching skills
 * console.log(result.total) // Total matches
 *
 * // Search with category filter
 * const result = await searchSkills({
 *   q: 'deploy',
 *   category: 'devops',
 *   limit: 5
 * })
 * ```
 */
export async function searchSkills(
  params: SearchParams,
  options: RequestOptions = {},
): Promise<SearchResponse> {
  if (!params.q || params.q.trim() === '') {
    throw new SkillsMarketplaceApiError(
      'Search query (q) is required',
      400,
      'INVALID_PARAMS',
    )
  }

  return fetchApi<SearchResponse>('/skills/search', params as unknown as Record<string, unknown>, options)
}

/**
 * Get search suggestions based on partial query
 *
 * @param params - Suggestion parameters
 * @param params.q - Partial search query (required)
 * @param params.limit - Maximum suggestions (default: 10)
 * @param options - Request options (signal, cacheTtl, forceRefresh)
 * @returns Array of search suggestions
 *
 * @example
 * ```typescript
 * // Get suggestions as user types
 * const suggestions = await getSearchSuggestions({ q: 'git', limit: 5 })
 * console.log(suggestions.data) // ['git-commit', 'git-branch', ...]
 * ```
 */
export async function getSearchSuggestions(
  params: SuggestionsParams,
  options: RequestOptions = {},
): Promise<SuggestionsResponse> {
  if (!params.q || params.q.trim() === '') {
    throw new SkillsMarketplaceApiError(
      'Search query (q) is required',
      400,
      'INVALID_PARAMS',
    )
  }

  // Use shorter cache TTL for suggestions (1 minute)
  const suggestionOptions = {
    ...options,
    cacheTtl: options.cacheTtl ?? 60 * 1000,
  }

  return fetchApi<SuggestionsResponse>(
    '/skills/search/suggestions',
    params as unknown as Record<string, unknown>,
    suggestionOptions,
  )
}

/**
 * Get trending search keywords
 *
 * @param params - Trending parameters
 * @param params.limit - Maximum keywords (default: 10)
 * @param options - Request options (signal, cacheTtl, forceRefresh)
 * @returns Array of trending keywords with search counts
 *
 * @example
 * ```typescript
 * // Get top 5 trending keywords
 * const trending = await getTrendingKeywords({ limit: 5 })
 * console.log(trending.data) // [{ keyword: 'ai', count: 1234 }, ...]
 * ```
 */
export async function getTrendingKeywords(
  params: TrendingParams = {},
  options: RequestOptions = {},
): Promise<TrendingResponse> {
  // Use longer cache TTL for trending (10 minutes)
  const trendingOptions = {
    ...options,
    cacheTtl: options.cacheTtl ?? 10 * 60 * 1000,
  }

  return fetchApi<TrendingResponse>(
    '/skills/search/trending',
    params as unknown as Record<string, unknown>,
    trendingOptions,
  )
}

/**
 * Clear the API response cache
 *
 * @example
 * ```typescript
 * // Clear all cached responses
 * clearCache()
 * ```
 */
export function clearCache(): void {
  responseCache.clear()
}

/**
 * Get current cache size
 *
 * @returns Number of cached entries
 *
 * @example
 * ```typescript
 * console.log(`Cache has ${getCacheSize()} entries`)
 * ```
 */
export function getCacheSize(): number {
  return responseCache.size
}

/**
 * Create an AbortController for request cancellation
 *
 * @returns AbortController instance
 *
 * @example
 * ```typescript
 * const controller = createAbortController()
 *
 * // Start request
 * const promise = getMarketplace({}, { signal: controller.signal })
 *
 * // Cancel if needed
 * controller.abort()
 *
 * // Handle cancellation
 * try {
 *   await promise
 * } catch (error) {
 *   if (error instanceof SkillsMarketplaceApiError && error.code === 'ABORT_ERROR') {
 *     console.log('Request was cancelled')
 *   }
 * }
 * ```
 */
export function createAbortController(): AbortController {
  return new AbortController()
}

/**
 * Skills Marketplace API client object
 *
 * Provides a unified interface for all marketplace API methods.
 *
 * @example
 * ```typescript
 * import { skillsMarketplaceApi } from './skills-marketplace-api'
 *
 * // Get marketplace skills
 * const marketplace = await skillsMarketplaceApi.getMarketplace({ limit: 10 })
 *
 * // Search skills
 * const results = await skillsMarketplaceApi.searchSkills({ q: 'git' })
 *
 * // Get suggestions
 * const suggestions = await skillsMarketplaceApi.getSearchSuggestions({ q: 'de' })
 *
 * // Get trending
 * const trending = await skillsMarketplaceApi.getTrendingKeywords()
 *
 * // Clear cache
 * skillsMarketplaceApi.clearCache()
 * ```
 */
export const skillsMarketplaceApi = {
  getMarketplace,
  searchSkills,
  getSearchSuggestions,
  getTrendingKeywords,
  clearCache,
  getCacheSize,
  createAbortController,
}

export default skillsMarketplaceApi
