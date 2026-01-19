/**
 * CCJK Plugin Recommendation Service
 *
 * Provides intelligent plugin recommendations based on user environment,
 * preferences, and usage patterns. Supports local caching and cloud-based
 * recommendation API integration.
 *
 * @module services/cloud/plugin-recommendation
 */

import type { SupportedLang } from '../../constants'
import type { PackageCategory } from '../../types/marketplace'
import type { CloudApiResponse } from './api-client'
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join } from 'pathe'
import { writeFileAtomic } from '../../utils/fs-operations'
import { CloudApiClient } from './api-client'

// ============================================================================
// Constants
// ============================================================================

const CLOUD_API_BASE_URL = 'https://api.claudehome.cn'
const CACHE_DIR = join(homedir(), '.ccjk', 'cache')
const CACHE_FILE = join(CACHE_DIR, 'plugin-recommendations.json')
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
const DEFAULT_TIMEOUT = 10000 // 10 seconds

// ============================================================================
// Types
// ============================================================================

/**
 * Plugin recommendation metadata
 *
 * Complete information about a recommended plugin.
 */
export interface PluginRecommendation {
  /** Unique plugin identifier */
  id: string
  /** Plugin display name */
  name: string
  /** Localized descriptions */
  description: Record<SupportedLang, string>
  /** Plugin category */
  category: PackageCategory
  /** Popularity score (0-100) */
  popularity: number
  /** Average rating (1-5) */
  rating: number
  /** Number of ratings */
  ratingCount: number
  /** Search tags */
  tags: string[]
  /** Installation command */
  installCommand: string
  /** Compatibility information */
  compatibility: {
    /** Supported operating systems */
    os: string[]
    /** Supported code tools */
    codeTools: string[]
  }
  /** Plugin version */
  version?: string
  /** Author name */
  author?: string
  /** Repository URL */
  repository?: string
  /** Download count */
  downloads?: number
  /** Whether plugin is verified */
  verified?: boolean
  /** Recommendation score (0-100) */
  recommendationScore?: number
  /** Reason for recommendation */
  recommendationReason?: Record<SupportedLang, string>
}

/**
 * Recommendation request parameters
 *
 * User environment and preferences for generating recommendations.
 */
export interface RecommendationRequest {
  /** Operating system (darwin, linux, win32) */
  os: string
  /** Code tool type (claude-code, codex, aider) */
  codeTool: string
  /** List of already installed plugin IDs */
  installedPlugins: string[]
  /** Preferred language */
  preferredLang: SupportedLang
  /** User-specified tags for filtering */
  userTags?: string[]
  /** Category filter */
  category?: PackageCategory
  /** Maximum number of recommendations */
  limit?: number
}

/**
 * Recommendation response
 *
 * Contains recommended plugins and metadata.
 */
export interface RecommendationResponse {
  /** Recommended plugins */
  recommendations: PluginRecommendation[]
  /** Total available recommendations */
  total: number
  /** Whether results are from cache */
  fromCache: boolean
  /** Cache timestamp */
  cacheTimestamp?: string
  /** Recommendation algorithm version */
  algorithmVersion?: string
}

/**
 * Cached recommendation data
 *
 * Structure for storing recommendations in local cache.
 */
interface CachedRecommendations {
  /** Cached recommendations */
  data: PluginRecommendation[]
  /** Cache creation timestamp */
  timestamp: string
  /** Request parameters used for caching */
  request: RecommendationRequest
  /** Cache expiration timestamp */
  expiresAt: string
}

// ============================================================================
// PluginRecommendationService Class
// ============================================================================

/**
 * Plugin Recommendation Service
 *
 * Manages plugin recommendations with intelligent caching and cloud API integration.
 *
 * @example
 * ```typescript
 * const service = new PluginRecommendationService()
 *
 * const recommendations = await service.getRecommendations({
 *   os: 'darwin',
 *   codeTool: 'claude-code',
 *   installedPlugins: ['git-workflow', 'mcp-filesystem'],
 *   preferredLang: 'zh-CN',
 *   limit: 10
 * })
 *
 * console.log('Recommended plugins:', recommendations.recommendations)
 * ```
 */
export class PluginRecommendationService {
  private apiClient: CloudApiClient
  private fallbackData: PluginRecommendation[]

  /**
   * Create a new PluginRecommendationService instance
   *
   * @param baseUrl - Cloud API base URL (default: https://api.claudehome.cn)
   * @param fallbackData - Fallback data for offline mode
   */
  constructor(
    baseUrl: string = CLOUD_API_BASE_URL,
    fallbackData: PluginRecommendation[] = [],
  ) {
    this.apiClient = new CloudApiClient({
      baseUrl,
      timeout: DEFAULT_TIMEOUT,
      userAgent: 'CCJK-PluginRecommendation/1.0',
    })
    this.fallbackData = fallbackData
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Get plugin recommendations
   *
   * Fetches recommendations from cache if available and valid,
   * otherwise requests from cloud API with fallback to local data.
   *
   * @param request - Recommendation request parameters
   * @returns Recommendation response
   */
  async getRecommendations(
    request: RecommendationRequest,
  ): Promise<RecommendationResponse> {
    // Try to get from cache first
    const cached = this.getCachedRecommendations(request)
    if (cached) {
      return {
        recommendations: cached.data,
        total: cached.data.length,
        fromCache: true,
        cacheTimestamp: cached.timestamp,
      }
    }

    // Try to fetch from cloud API
    try {
      const response = await this.fetchFromCloud(request)
      if (response.success && response.data) {
        // Cache the results
        this.cacheRecommendations(request, response.data.recommendations)

        return {
          recommendations: response.data.recommendations,
          total: response.data.total || response.data.recommendations.length,
          fromCache: false,
          algorithmVersion: response.data.algorithmVersion,
        }
      }
    }
    catch (error) {
      // Cloud API failed, fall through to local fallback
      console.warn('Cloud API request failed:', error)
    }

    // Fallback to local data
    const localRecommendations = this.getLocalRecommendations(request)

    // Cache the local recommendations too
    this.cacheRecommendations(request, localRecommendations)

    return {
      recommendations: localRecommendations,
      total: localRecommendations.length,
      fromCache: false,
    }
  }

  /**
   * Clear recommendation cache
   *
   * Removes all cached recommendations.
   */
  clearCache(): void {
    try {
      if (existsSync(CACHE_FILE)) {
        unlinkSync(CACHE_FILE)
      }
    }
    catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }

  /**
   * Get cache status
   *
   * Returns information about the current cache state.
   */
  getCacheStatus(): {
    exists: boolean
    timestamp?: string
    expiresAt?: string
    isValid?: boolean
  } {
    try {
      if (!existsSync(CACHE_FILE)) {
        return { exists: false }
      }

      const data = readFileSync(CACHE_FILE, 'utf-8')
      const cached: CachedRecommendations = JSON.parse(data)

      const isValid = new Date(cached.expiresAt).getTime() > Date.now()

      return {
        exists: true,
        timestamp: cached.timestamp,
        expiresAt: cached.expiresAt,
        isValid,
      }
    }
    catch {
      return { exists: false }
    }
  }

  /**
   * Set fallback data
   *
   * Updates the local fallback data used when cloud API is unavailable.
   *
   * @param data - Fallback plugin recommendations
   */
  setFallbackData(data: PluginRecommendation[]): void {
    this.fallbackData = data
  }

  // ==========================================================================
  // Private Methods - Cache Management
  // ==========================================================================

  /**
   * Get cached recommendations if valid
   *
   * @private
   */
  private getCachedRecommendations(
    request: RecommendationRequest,
  ): CachedRecommendations | null {
    try {
      if (!existsSync(CACHE_FILE)) {
        return null
      }

      const data = readFileSync(CACHE_FILE, 'utf-8')
      const cached: CachedRecommendations = JSON.parse(data)

      // Check if cache is expired
      if (new Date(cached.expiresAt).getTime() < Date.now()) {
        return null
      }

      // Check if request parameters match
      if (!this.requestMatches(cached.request, request)) {
        return null
      }

      return cached
    }
    catch {
      return null
    }
  }

  /**
   * Cache recommendations to disk
   *
   * @private
   */
  private cacheRecommendations(
    request: RecommendationRequest,
    recommendations: PluginRecommendation[],
  ): void {
    try {
      // Ensure cache directory exists
      if (!existsSync(CACHE_DIR)) {
        mkdirSync(CACHE_DIR, { recursive: true })
      }

      const now = new Date()
      const expiresAt = new Date(now.getTime() + CACHE_TTL)

      const cached: CachedRecommendations = {
        data: recommendations,
        timestamp: now.toISOString(),
        request,
        expiresAt: expiresAt.toISOString(),
      }

      writeFileAtomic(CACHE_FILE, JSON.stringify(cached, null, 2), 'utf-8')
    }
    catch (error) {
      console.warn('Failed to cache recommendations:', error)
    }
  }

  /**
   * Check if two requests match for caching purposes
   *
   * @private
   */
  private requestMatches(
    cached: RecommendationRequest,
    current: RecommendationRequest,
  ): boolean {
    return (
      cached.os === current.os
      && cached.codeTool === current.codeTool
      && cached.preferredLang === current.preferredLang
      && cached.category === current.category
      && JSON.stringify(cached.userTags || []) === JSON.stringify(current.userTags || [])
    )
  }

  // ==========================================================================
  // Private Methods - Cloud API
  // ==========================================================================

  /**
   * Fetch recommendations from cloud API
   *
   * @private
   */
  private async fetchFromCloud(
    request: RecommendationRequest,
  ): Promise<CloudApiResponse<{
    recommendations: PluginRecommendation[]
    total: number
    algorithmVersion?: string
  }>> {
    return this.apiClient.post('/plugins/recommend', {
      os: request.os,
      codeTool: request.codeTool,
      installedPlugins: request.installedPlugins,
      preferredLang: request.preferredLang,
      userTags: request.userTags,
      category: request.category,
      limit: request.limit || 10,
    })
  }

  // ==========================================================================
  // Private Methods - Local Fallback
  // ==========================================================================

  /**
   * Get recommendations from local fallback data
   *
   * Filters and scores local plugins based on request parameters.
   *
   * @private
   */
  private getLocalRecommendations(
    request: RecommendationRequest,
  ): PluginRecommendation[] {
    let recommendations = [...this.fallbackData]

    // Filter by OS compatibility
    recommendations = recommendations.filter(plugin =>
      plugin.compatibility.os.includes(request.os)
      || plugin.compatibility.os.includes('all'),
    )

    // Filter by code tool compatibility
    recommendations = recommendations.filter(plugin =>
      plugin.compatibility.codeTools.includes(request.codeTool)
      || plugin.compatibility.codeTools.includes('all'),
    )

    // Filter by category if specified
    if (request.category) {
      recommendations = recommendations.filter(
        plugin => plugin.category === request.category,
      )
    }

    // Filter by user tags if specified
    if (request.userTags && request.userTags.length > 0) {
      recommendations = recommendations.filter(plugin =>
        request.userTags!.some(tag => plugin.tags.includes(tag)),
      )
    }

    // Exclude already installed plugins
    recommendations = recommendations.filter(
      plugin => !request.installedPlugins.includes(plugin.id),
    )

    // Calculate recommendation scores
    recommendations = recommendations.map((plugin) => {
      const score = this.calculateRecommendationScore(plugin, request)
      return {
        ...plugin,
        recommendationScore: score,
      }
    })

    // Sort by recommendation score
    recommendations.sort((a, b) =>
      (b.recommendationScore || 0) - (a.recommendationScore || 0),
    )

    // Apply limit
    const limit = request.limit || 10
    return recommendations.slice(0, limit)
  }

  /**
   * Calculate recommendation score for a plugin
   *
   * Combines popularity, rating, and relevance to generate a score.
   *
   * @private
   */
  private calculateRecommendationScore(
    plugin: PluginRecommendation,
    request: RecommendationRequest,
  ): number {
    let score = 0

    // Popularity weight (0-40 points)
    score += (plugin.popularity / 100) * 40

    // Rating weight (0-30 points)
    score += (plugin.rating / 5) * 30

    // Tag relevance weight (0-20 points)
    if (request.userTags && request.userTags.length > 0) {
      const matchingTags = plugin.tags.filter(tag =>
        request.userTags!.includes(tag),
      ).length
      score += (matchingTags / request.userTags.length) * 20
    }
    else {
      score += 10 // Default bonus if no tags specified
    }

    // Verification bonus (0-10 points)
    if (plugin.verified) {
      score += 10
    }

    return Math.round(score)
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let serviceInstance: PluginRecommendationService | null = null

/**
 * Get the singleton PluginRecommendationService instance
 *
 * @param fallbackData - Optional fallback data for offline mode
 * @returns PluginRecommendationService instance
 */
export function getPluginRecommendationService(
  fallbackData?: PluginRecommendation[],
): PluginRecommendationService {
  if (!serviceInstance) {
    serviceInstance = new PluginRecommendationService(
      CLOUD_API_BASE_URL,
      fallbackData,
    )
  }
  else if (fallbackData) {
    serviceInstance.setFallbackData(fallbackData)
  }
  return serviceInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetPluginRecommendationService(): void {
  serviceInstance = null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get plugin recommendations
 *
 * Convenience function for getting recommendations without managing service instance.
 *
 * @param request - Recommendation request parameters
 * @returns Recommendation response
 *
 * @example
 * ```typescript
 * const recommendations = await getRecommendations({
 *   os: platform(),
 *   codeTool: 'claude-code',
 *   installedPlugins: [],
 *   preferredLang: 'zh-CN'
 * })
 * ```
 */
export async function getRecommendations(
  request: RecommendationRequest,
): Promise<RecommendationResponse> {
  const service = getPluginRecommendationService()
  return service.getRecommendations(request)
}

/**
 * Clear recommendation cache
 *
 * Convenience function for clearing the cache.
 */
export function clearRecommendationCache(): void {
  const service = getPluginRecommendationService()
  service.clearCache()
}

/**
 * Get current platform identifier
 *
 * Returns a normalized platform string for recommendation requests.
 */
export function getCurrentPlatform(): string {
  const p = platform()
  switch (p) {
    case 'darwin':
      return 'darwin'
    case 'win32':
      return 'win32'
    case 'linux':
      return 'linux'
    default:
      return 'linux'
  }
}
