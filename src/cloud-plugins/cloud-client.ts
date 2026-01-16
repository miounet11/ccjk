/**
 * CCJK Cloud Plugin Recommendation System - API Client
 *
 * HTTP client for communicating with the CCJK Cloud Plugin Service.
 * Handles plugin recommendations, search, download, and upload operations.
 *
 * @module cloud-plugins/cloud-client
 */

import type { Buffer } from 'node:buffer'
import type { SupportedLang } from '../constants.js'
import type {
  PluginSearchParams as BasePluginSearchParams,
  RecommendationContext as BaseRecommendationContext,
  CloudPlugin,
  PluginCategory,
} from './types.js'

// Re-export types from types.ts for convenience
export type { CloudPlugin, PluginCategory } from './types.js'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CLOUD_API_URL = 'https://api.claudehome.cn/api/v1/plugins'
const REQUEST_TIMEOUT = 30000 // 30 seconds
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000 // 1 second
const CACHE_TTL = 3600000 // 1 hour in milliseconds

// ============================================================================
// Extended Type Definitions (for cloud-client specific needs)
// ============================================================================

/**
 * Extended recommendation context for cloud API
 */
export interface RecommendationContext extends Partial<BaseRecommendationContext> {
  /** User's current code tool type */
  codeToolType?: 'claude-code' | 'codex' | 'aider'
  /** User's preferred language */
  language?: SupportedLang
  /** User's installed plugins */
  installedPlugins?: string[]
  /** User's recent activities */
  recentActivities?: string[]
  /** User's skill level */
  skillLevel?: 'beginner' | 'intermediate' | 'advanced'
  /** Maximum number of recommendations */
  limit?: number
}

/**
 * Cloud API recommendation result (simplified for API response)
 */
export interface RecommendationResult {
  /** Recommended plugins */
  plugins: CloudPlugin[]
  /** Recommendation reason for each plugin */
  reasons: Record<string, string>
  /** Recommendation score (0-1) */
  scores: Record<string, number>
  /** Total count */
  total: number
}

/**
 * Extended plugin search parameters for cloud API
 */
export interface PluginSearchParams extends Partial<BasePluginSearchParams> {
  /** Filter by author */
  author?: string
  /** Filter by verification status */
  verified?: 'verified' | 'community' | 'unverified'
  /** Filter by supported tool */
  supportedTool?: 'claude-code' | 'codex' | 'aider'
  /** Sort direction */
  sortDir?: 'asc' | 'desc'
  /** Results limit */
  limit?: number
  /** Results offset */
  offset?: number
  /** Filter by keywords */
  keywords?: string[]
  /** Minimum rating */
  minRating?: number
  /** Minimum CCJK version */
  minCcjkVersion?: string
}

/**
 * Plugin category information
 */
export interface PluginCategoryInfo {
  /** Category identifier */
  id: PluginCategory
  /** Localized category name */
  name: Record<SupportedLang, string>
  /** Number of plugins in category */
  count: number
  /** Category icon */
  icon?: string
}

/**
 * Plugin download result
 */
export interface PluginDownloadResult {
  /** Plugin ID */
  pluginId: string
  /** Plugin content (base64 encoded) */
  content: string
  /** SHA256 checksum */
  checksum: string
  /** Download timestamp */
  downloadedAt: string
}

/**
 * Cloud API response wrapper (simplified for this client)
 */
export interface CloudApiResponse<T = unknown> {
  /** Whether request was successful */
  success: boolean
  /** Response data */
  data?: T
  /** Error message if failed */
  error?: string
  /** Error code */
  code?: string
  /** Response timestamp */
  timestamp?: string
}

/**
 * Cloud client options
 */
export interface CloudClientOptions {
  /** Base URL for the cloud API */
  baseUrl?: string
  /** API authentication key */
  apiKey?: string
  /** Request timeout in milliseconds */
  timeout?: number
  /** Enable offline mode */
  offlineMode?: boolean
  /** Enable request logging */
  enableLogging?: boolean
  /** Maximum retry attempts */
  maxRetries?: number
  /** Retry delay in milliseconds */
  retryDelay?: number
}

/**
 * Request options
 */
interface RequestOptions {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** Request body */
  body?: string
  /** Query parameters */
  params?: Record<string, any>
  /** Request headers */
  headers?: Record<string, string>
  /** Abort signal */
  signal?: AbortSignal
  /** Request timeout */
  timeout?: number
  /** Skip cache */
  skipCache?: boolean
}

/**
 * Cache entry
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

// ============================================================================
// Cloud Recommendation Client Class
// ============================================================================

/**
 * Cloud Recommendation Client
 *
 * Handles all communication with the CCJK Cloud Plugin Service.
 * Supports plugin recommendations, search, download, and upload operations.
 *
 * @example
 * ```typescript
 * const client = new CloudRecommendationClient({
 *   baseUrl: 'https://api.api.claudehome.cn/v1/plugins',
 *   apiKey: 'your-api-key',
 *   enableLogging: true
 * })
 *
 * // Get recommendations
 * const recommendations = await client.getRecommendations({
 *   codeToolType: 'claude-code',
 *   language: 'zh-CN',
 *   limit: 10
 * })
 *
 * // Search plugins
 * const results = await client.searchPlugins({
 *   query: 'git workflow',
 *   category: 'workflow',
 *   sortBy: 'downloads'
 * })
 * ```
 */
export class CloudRecommendationClient {
  private baseUrl: string
  private apiKey?: string
  private timeout: number
  private offlineMode: boolean
  private enableLogging: boolean
  private maxRetries: number
  private retryDelay: number
  private cache: Map<string, CacheEntry<any>>

  constructor(options: CloudClientOptions = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_CLOUD_API_URL
    this.apiKey = options.apiKey
    this.timeout = options.timeout || REQUEST_TIMEOUT
    this.offlineMode = options.offlineMode || false
    this.enableLogging = options.enableLogging || false
    this.maxRetries = options.maxRetries || MAX_RETRY_ATTEMPTS
    this.retryDelay = options.retryDelay || RETRY_DELAY
    this.cache = new Map()
  }

  // ==========================================================================
  // Public API Methods
  // ==========================================================================

  /**
   * Get personalized plugin recommendations
   *
   * @param context - Recommendation context with user preferences
   * @returns Recommended plugins with reasons and scores
   *
   * @example
   * ```typescript
   * const recommendations = await client.getRecommendations({
   *   codeToolType: 'claude-code',
   *   language: 'zh-CN',
   *   installedPlugins: ['git-workflow', 'test-runner'],
   *   limit: 10
   * })
   * ```
   */
  async getRecommendations(
    context: RecommendationContext,
  ): Promise<CloudApiResponse<RecommendationResult>> {
    this.log('Getting recommendations with context:', context)

    return this.request<RecommendationResult>('/recommendations', {
      method: 'POST',
      body: JSON.stringify(context),
    })
  }

  /**
   * Search plugins with filters and sorting
   *
   * @param params - Search parameters
   * @returns Matching plugins
   *
   * @example
   * ```typescript
   * const results = await client.searchPlugins({
   *   query: 'git',
   *   category: 'workflow',
   *   sortBy: 'downloads',
   *   sortDir: 'desc',
   *   limit: 20
   * })
   * ```
   */
  async searchPlugins(
    params: PluginSearchParams,
  ): Promise<CloudApiResponse<CloudPlugin[]>> {
    this.log('Searching plugins with params:', params)

    // API uses /plugins endpoint with query params for search (not /search)
    return this.request<CloudPlugin[]>('', {
      method: 'GET',
      params,
    })
  }

  /**
   * Get detailed information about a specific plugin
   *
   * @param id - Plugin ID
   * @returns Plugin details
   *
   * @example
   * ```typescript
   * const plugin = await client.getPlugin('git-workflow-pro')
   * ```
   */
  async getPlugin(id: string): Promise<CloudApiResponse<CloudPlugin>> {
    this.log('Getting plugin:', id)

    return this.request<CloudPlugin>(`/plugins/${id}`, {
      method: 'GET',
    })
  }

  /**
   * Get popular plugins
   *
   * @param limit - Maximum number of plugins to return
   * @returns Popular plugins
   *
   * @example
   * ```typescript
   * const popular = await client.getPopularPlugins(10)
   * ```
   */
  async getPopularPlugins(
    limit: number = 10,
  ): Promise<CloudApiResponse<CloudPlugin[]>> {
    this.log('Getting popular plugins, limit:', limit)

    return this.request<CloudPlugin[]>('/popular', {
      method: 'GET',
      params: { limit },
    })
  }

  /**
   * Get all plugin categories
   *
   * @returns Category information
   *
   * @example
   * ```typescript
   * const categories = await client.getCategories()
   * ```
   */
  async getCategories(): Promise<CloudApiResponse<PluginCategoryInfo[]>> {
    this.log('Getting categories')

    return this.request<PluginCategoryInfo[]>('/categories', {
      method: 'GET',
    })
  }

  /**
   * Download a plugin
   *
   * @param id - Plugin ID
   * @returns Plugin download result with content
   *
   * @example
   * ```typescript
   * const download = await client.downloadPlugin('git-workflow-pro')
   * if (download.success && download.data) {
   *   const content = require('node:buffer').require('node:buffer').require('node:buffer').require('node:buffer').Buffer.from(download.data.content, 'base64')
   *   // Process plugin content
   * }
   * ```
   */
  async downloadPlugin(
    id: string,
  ): Promise<CloudApiResponse<PluginDownloadResult>> {
    this.log('Downloading plugin:', id)

    return this.request<PluginDownloadResult>(`/plugins/${id}/download`, {
      method: 'GET',
      skipCache: true, // Always fetch fresh download
    })
  }

  /**
   * Upload a plugin (user contribution)
   *
   * @param plugin - Plugin metadata
   * @param content - Plugin content as Buffer
   * @returns Upload result with plugin ID
   *
   * @example
   * ```typescript
   * const result = await client.uploadPlugin(pluginMetadata, pluginContent)
   * if (result.success && result.data) {
   *   console.log('Plugin uploaded with ID:', result.data.id)
   * }
   * ```
   */
  async uploadPlugin(
    plugin: CloudPlugin,
    content: Buffer,
  ): Promise<CloudApiResponse<{ id: string }>> {
    this.log('Uploading plugin:', plugin.id)

    const payload = {
      plugin,
      content: content.toString('base64'),
    }

    return this.request<{ id: string }>('/plugins/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipCache: true,
    })
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear()
    this.log('Cache cleared')
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
    this.log('Expired cache entries cleared')
  }

  /**
   * Set offline mode
   */
  setOfflineMode(enabled: boolean): void {
    this.offlineMode = enabled
    this.log('Offline mode:', enabled ? 'enabled' : 'disabled')
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Make an HTTP request to the cloud service
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<CloudApiResponse<T>> {
    const url = this.buildUrl(endpoint, options.params)
    const cacheKey = `${options.method || 'GET'}:${url}`

    // Check cache first (for GET requests)
    if (!options.skipCache && (options.method === 'GET' || !options.method)) {
      const cached = this.getFromCache<T>(cacheKey)
      if (cached) {
        this.log('Cache hit:', cacheKey)
        return {
          success: true,
          data: cached,
          timestamp: new Date().toISOString(),
        }
      }
    }

    // Offline mode - return cached data or error
    if (this.offlineMode) {
      const cached = this.getFromCache<T>(cacheKey)
      if (cached) {
        this.log('Offline mode: returning cached data')
        return {
          success: true,
          data: cached,
          timestamp: new Date().toISOString(),
        }
      }
      return {
        success: false,
        error: 'Offline mode enabled and no cached data available',
        code: 'OFFLINE_MODE',
      }
    }

    // Make request with retry logic
    let lastError: Error | null = null
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.log(`Request attempt ${attempt}/${this.maxRetries}:`, url)

        const response = await this.makeRequest<T>(url, options)

        // Cache successful GET requests
        if (response.success && response.data && (options.method === 'GET' || !options.method)) {
          this.setCache(cacheKey, response.data, CACHE_TTL)
        }

        return response
      }
      catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        this.log(`Request failed (attempt ${attempt}):`, lastError.message)

        // Don't retry on abort
        if (lastError.name === 'AbortError') {
          break
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt)
        }
      }
    }

    // All retries failed
    return {
      success: false,
      error: lastError?.message || 'Request failed after all retries',
      code: 'REQUEST_FAILED',
    }
  }

  /**
   * Make a single HTTP request
   */
  private async makeRequest<T>(
    url: string,
    options: RequestOptions,
  ): Promise<CloudApiResponse<T>> {
    const timeout = options.timeout || this.timeout
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout)

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: this.getHeaders(options.headers),
        body: options.body,
        signal: options.signal || timeoutController.signal,
      })

      clearTimeout(timeoutId)

      const data = await response.json() as CloudApiResponse<T>

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          code: data.code || `HTTP_${response.status}`,
        }
      }

      return {
        ...data,
        timestamp: new Date().toISOString(),
      }
    }
    catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw error // Re-throw abort errors
        }
        return {
          success: false,
          error: error.message,
          code: 'NETWORK_ERROR',
        }
      }

      return {
        success: false,
        error: String(error),
        code: 'UNKNOWN_ERROR',
      }
    }
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseUrl)

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)))
          }
          else {
            url.searchParams.append(key, String(value))
          }
        }
      }
    }

    return url.toString()
  }

  /**
   * Get request headers
   */
  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'CCJK-Cloud-Client/1.0',
      ...customHeaders,
    }

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`
    }

    return headers
  }

  /**
   * Get data from cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set data in cache
   */
  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Log message (if logging is enabled)
   */
  private log(...args: any[]): void {
    if (this.enableLogging) {
      console.log('[CloudRecommendationClient]', ...args)
    }
  }
}

// ============================================================================
// Mock Data for Development/Testing
// ============================================================================

/**
 * Mock plugin data for development and testing
 */
export const MOCK_PLUGINS: CloudPlugin[] = [
  {
    id: 'git-workflow-pro',
    name: {
      'zh-CN': 'Git 工作流专业版',
      'en': 'Git Workflow Pro',
    },
    version: '1.2.0',
    description: {
      'zh-CN': '高级 Git 工作流自动化工具',
      'en': 'Advanced Git workflow automation tool',
    },
    author: 'CCJK Team',
    tags: ['git', 'workflow', 'automation', 'commit'],
    category: 'dev',
    downloads: 1500,
    rating: 4.8,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
    size: 102400,
  },
  {
    id: 'test-runner-plus',
    name: {
      'zh-CN': '测试运行器增强版',
      'en': 'Test Runner Plus',
    },
    version: '2.0.1',
    description: {
      'zh-CN': '智能测试运行器和覆盖率分析',
      'en': 'Intelligent test runner and coverage analyzer',
    },
    author: 'Community',
    tags: ['test', 'testing', 'coverage', 'tdd'],
    category: 'testing',
    downloads: 890,
    rating: 4.5,
    createdAt: '2024-12-15T00:00:00Z',
    updatedAt: '2025-01-08T00:00:00Z',
    size: 204800,
  },
  {
    id: 'code-review-assistant',
    name: {
      'zh-CN': '代码审查助手',
      'en': 'Code Review Assistant',
    },
    version: '1.5.3',
    description: {
      'zh-CN': 'AI 驱动的代码审查助手',
      'en': 'AI-powered code review assistant',
    },
    author: 'DevTools Inc',
    tags: ['code-review', 'ai', 'quality', 'analysis'],
    category: 'ai',
    downloads: 2100,
    rating: 4.9,
    createdAt: '2024-11-20T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    size: 153600,
  },
]

/**
 * Mock categories data
 */
export const MOCK_CATEGORIES: PluginCategoryInfo[] = [
  {
    id: 'dev',
    name: {
      'zh-CN': '开发工具',
      'en': 'Development',
    },
    count: 45,
    icon: '🔌',
  },
  {
    id: 'devops',
    name: {
      'zh-CN': 'DevOps',
      'en': 'DevOps',
    },
    count: 32,
    icon: '⚡',
  },
  {
    id: 'ai',
    name: {
      'zh-CN': 'AI 工具',
      'en': 'AI Tools',
    },
    count: 28,
    icon: '🤖',
  },
  {
    id: 'testing',
    name: {
      'zh-CN': '测试',
      'en': 'Testing',
    },
    count: 56,
    icon: '🎯',
  },
  {
    id: 'security',
    name: {
      'zh-CN': '安全',
      'en': 'Security',
    },
    count: 18,
    icon: '🔗',
  },
]

/**
 * Create a mock client for testing
 */
export function createMockClient(options: CloudClientOptions = {}): CloudRecommendationClient {
  return new CloudRecommendationClient({
    ...options,
    offlineMode: true,
    enableLogging: true,
  })
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a cloud recommendation client instance
 */
export function createCloudClient(options?: CloudClientOptions): CloudRecommendationClient {
  return new CloudRecommendationClient(options)
}

/**
 * Get the default cloud client instance (singleton)
 */
let defaultClientInstance: CloudRecommendationClient | null = null

export function getDefaultCloudClient(): CloudRecommendationClient {
  if (!defaultClientInstance) {
    defaultClientInstance = new CloudRecommendationClient()
  }
  return defaultClientInstance
}

/**
 * Reset the default client instance (for testing)
 */
export function resetDefaultCloudClient(): void {
  defaultClientInstance = null
}
