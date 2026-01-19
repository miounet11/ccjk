/**
 * MCP Marketplace Client
 *
 * HTTP client for communicating with the MCP Package Marketplace.
 * Handles package discovery, search, version management, and updates.
 * Supports offline caching, request deduplication, and throttling.
 *
 * @module mcp-marketplace/marketplace-client
 */

import type {
  CategoryInfo,
  InstalledPackage,
  MarketplaceApiResponse,
  MarketplaceCache,
  MarketplaceCacheStats,
  MarketplaceClientOptions,
  MCPPackage,
  SearchOptions,
  SearchResult,
  UpdateInfo,
  VersionInfo,
} from './types'
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { writeFileAtomic } from '../utils/fs-operations'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_API_URL = 'https://api.api.claudehome.cn/v1/mcp-marketplace'
const REQUEST_TIMEOUT = 30000 // 30 seconds
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000 // 1 second
const DEFAULT_CACHE_TTL = 3600000 // 1 hour
const DEFAULT_THROTTLE_INTERVAL = 100 // 100ms between requests
const CACHE_VERSION = '1.0.0'

// Cache directory
const CACHE_BASE_DIR = join(homedir(), '.ccjk', 'mcp-marketplace', 'cache')

// ============================================================================
// Request Deduplication & Throttling
// ============================================================================

/**
 * Pending request tracker for deduplication
 */
interface PendingRequest<T> {
  promise: Promise<MarketplaceApiResponse<T>>
  timestamp: number
}

// ============================================================================
// MarketplaceClient Class
// ============================================================================

/**
 * MCP Marketplace Client
 *
 * Provides methods for interacting with the MCP package marketplace.
 * Features include:
 * - Package search and discovery
 * - Version management
 * - Offline caching
 * - Request deduplication
 * - Request throttling
 */
export class MarketplaceClient {
  private baseUrl: string
  private apiKey?: string
  private timeout: number
  private offlineMode: boolean
  private enableLogging: boolean
  private maxRetries: number
  private retryDelay: number
  private cacheTTL: number
  private enableDeduplication: boolean
  private throttleInterval: number

  // In-memory cache
  private memoryCache: Map<string, { data: unknown, timestamp: number, ttl: number }>
  // Pending requests for deduplication
  private pendingRequests: Map<string, PendingRequest<unknown>>
  // Last request timestamp for throttling
  private lastRequestTime: number

  // File-based cache
  private cacheDir: string
  private cacheFile: string

  constructor(options: MarketplaceClientOptions = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_API_URL
    this.apiKey = options.apiKey
    this.timeout = options.timeout || REQUEST_TIMEOUT
    this.offlineMode = options.offlineMode || false
    this.enableLogging = options.enableLogging || false
    this.maxRetries = options.maxRetries || MAX_RETRY_ATTEMPTS
    this.retryDelay = options.retryDelay || RETRY_DELAY
    this.cacheTTL = options.cacheTTL || DEFAULT_CACHE_TTL
    this.enableDeduplication = options.enableDeduplication !== false
    this.throttleInterval = options.throttleInterval || DEFAULT_THROTTLE_INTERVAL

    this.memoryCache = new Map()
    this.pendingRequests = new Map()
    this.lastRequestTime = 0

    this.cacheDir = CACHE_BASE_DIR
    this.cacheFile = join(this.cacheDir, 'marketplace.json')
  }

  // ==========================================================================
  // Public API Methods
  // ==========================================================================

  /**
   * Search packages with filters and sorting
   */
  async search(options: SearchOptions = {}): Promise<SearchResult> {
    this.log('Searching packages with options:', options)

    const params = this.buildSearchParams(options)
    const response = await this.request<SearchResult>('/search', {
      method: 'GET',
      params,
    })

    if (response.success && response.data) {
      return response.data
    }

    return {
      packages: [],
      total: 0,
      page: options.page || 1,
      limit: options.limit || 20,
      totalPages: 0,
      hasMore: false,
    }
  }

  /**
   * Get detailed information about a specific package
   */
  async getPackage(id: string): Promise<MCPPackage | null> {
    this.log('Getting package:', id)

    const encodedId = encodeURIComponent(id)
    const response = await this.request<MCPPackage>(`/packages/${encodedId}`, {
      method: 'GET',
    })

    return response.success && response.data ? response.data : null
  }

  /**
   * Get version history for a package
   */
  async getVersions(id: string): Promise<VersionInfo[]> {
    this.log('Getting versions for package:', id)

    const encodedId = encodeURIComponent(id)
    const response = await this.request<VersionInfo[]>(`/packages/${encodedId}/versions`, {
      method: 'GET',
    })

    return response.success && response.data ? response.data : []
  }

  /**
   * Get trending/popular packages
   */
  async getTrending(limit: number = 10): Promise<MCPPackage[]> {
    this.log('Getting trending packages, limit:', limit)

    const response = await this.request<MCPPackage[]>('/trending', {
      method: 'GET',
      params: { limit },
    })

    return response.success && response.data ? response.data : []
  }

  /**
   * Get personalized recommendations based on installed packages
   */
  async getRecommendations(installed: string[]): Promise<MCPPackage[]> {
    this.log('Getting recommendations for installed packages:', installed)

    const response = await this.request<MCPPackage[]>('/recommendations', {
      method: 'POST',
      body: JSON.stringify({ installed }),
    })

    return response.success && response.data ? response.data : []
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<CategoryInfo[]> {
    this.log('Getting categories')

    const response = await this.request<CategoryInfo[]>('/categories', {
      method: 'GET',
    })

    return response.success && response.data ? response.data : []
  }

  /**
   * Check for updates for installed packages
   */
  async checkUpdates(installed: InstalledPackage[]): Promise<UpdateInfo[]> {
    this.log('Checking updates for', installed.length, 'packages')

    const response = await this.request<UpdateInfo[]>('/updates/check', {
      method: 'POST',
      body: JSON.stringify({ packages: installed }),
    })

    return response.success && response.data ? response.data : []
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Clear all cached data (memory and file)
   */
  clearCache(): void {
    this.memoryCache.clear()
    this.pendingRequests.clear()

    try {
      if (existsSync(this.cacheFile)) {
        unlinkSync(this.cacheFile)
      }
    }
    catch (error) {
      this.log('Failed to clear file cache:', error)
    }

    this.log('Cache cleared')
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.memoryCache.delete(key))
    this.log('Cleared', keysToDelete.length, 'expired cache entries')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): MarketplaceCacheStats {
    const fileCache = this.loadFileCache()

    let cacheSize = 0
    try {
      if (existsSync(this.cacheFile)) {
        cacheSize = statSync(this.cacheFile).size
      }
    }
    catch {
      // Ignore errors
    }

    return {
      totalPackages: fileCache?.packages.length || 0,
      cacheSize,
      lastUpdated: fileCache?.lastUpdated || null,
      expiresAt: fileCache?.expiresAt || null,
      isExpired: this.isFileCacheExpired(),
      cachedCategories: fileCache?.categories.length || 0,
    }
  }

  /**
   * Set offline mode
   */
  setOfflineMode(enabled: boolean): void {
    this.offlineMode = enabled
    this.log('Offline mode:', enabled ? 'enabled' : 'disabled')
  }

  // ==========================================================================
  // Private Request Methods
  // ==========================================================================

  /**
   * Make an HTTP request with caching, deduplication, and throttling
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      params?: Record<string, unknown>
      body?: string
      skipCache?: boolean
    } = {},
  ): Promise<MarketplaceApiResponse<T>> {
    const url = this.buildUrl(endpoint, options.params)
    const cacheKey = `${options.method || 'GET'}:${url}`

    // Check memory cache first (for GET requests)
    if (!options.skipCache && (options.method === 'GET' || !options.method)) {
      const cached = this.getFromMemoryCache<T>(cacheKey)
      if (cached) {
        this.log('Memory cache hit:', cacheKey)
        return {
          success: true,
          data: cached,
          timestamp: new Date().toISOString(),
        }
      }
    }

    // Request deduplication
    if (this.enableDeduplication && (options.method === 'GET' || !options.method)) {
      const pending = this.pendingRequests.get(cacheKey) as PendingRequest<T> | undefined
      if (pending) {
        this.log('Deduplicating request:', cacheKey)
        return pending.promise as Promise<MarketplaceApiResponse<T>>
      }
    }

    // Offline mode - return cached data or error
    if (this.offlineMode) {
      const cached = this.getFromMemoryCache<T>(cacheKey)
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
        error: {
          code: 'OFFLINE_MODE',
          message: 'Offline mode enabled and no cached data available',
        },
        timestamp: new Date().toISOString(),
      }
    }

    // Throttling
    await this.throttle()

    // Create request promise
    const requestPromise = this.executeRequest<T>(url, options, cacheKey)

    // Track pending request for deduplication
    if (this.enableDeduplication && (options.method === 'GET' || !options.method)) {
      this.pendingRequests.set(cacheKey, {
        promise: requestPromise as Promise<MarketplaceApiResponse<unknown>>,
        timestamp: Date.now(),
      })

      // Clean up pending request after completion
      requestPromise.finally(() => {
        this.pendingRequests.delete(cacheKey)
      })
    }

    return requestPromise
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeRequest<T>(
    url: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      body?: string
      skipCache?: boolean
    },
    cacheKey: string,
  ): Promise<MarketplaceApiResponse<T>> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.log(`Request attempt ${attempt}/${this.maxRetries}:`, url)

        const response = await this.makeRequest<T>(url, options)

        // Cache successful GET requests
        if (response.success && response.data && (options.method === 'GET' || !options.method)) {
          this.setMemoryCache(cacheKey, response.data, this.cacheTTL)
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
      error: {
        code: 'REQUEST_FAILED',
        message: lastError?.message || 'Request failed after all retries',
      },
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Make a single HTTP request
   */
  private async makeRequest<T>(
    url: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      body?: string
    },
  ): Promise<MarketplaceApiResponse<T>> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: this.getHeaders(),
        body: options.body,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      this.lastRequestTime = Date.now()

      const data = await response.json() as MarketplaceApiResponse<T>

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: `HTTP_${response.status}`,
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
          timestamp: new Date().toISOString(),
        }
      }

      return {
        ...data,
        success: true,
        timestamp: new Date().toISOString(),
      }
    }
    catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw error
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
        timestamp: new Date().toISOString(),
      }
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, unknown>): string {
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
   * Build search parameters from options
   */
  private buildSearchParams(options: SearchOptions): Record<string, unknown> {
    return {
      q: options.query,
      category: options.category,
      tags: options.tags,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      verified: options.verified,
      verificationStatus: options.verificationStatus,
      author: options.author,
      platform: options.platform,
      codeTool: options.codeTool,
      minRating: options.minRating,
      page: options.page || 1,
      limit: options.limit || 20,
    }
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'CCJK-MCP-Marketplace-Client/1.0',
    }

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`
    }

    return headers
  }

  /**
   * Throttle requests
   */
  private async throttle(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    const remaining = this.throttleInterval - elapsed

    if (remaining > 0) {
      await this.sleep(remaining)
    }
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
  private log(...args: unknown[]): void {
    if (this.enableLogging) {
      console.log('[MarketplaceClient]', ...args)
    }
  }

  // ==========================================================================
  // Memory Cache Methods
  // ==========================================================================

  /**
   * Get data from memory cache
   */
  private getFromMemoryCache<T>(key: string): T | null {
    const entry = this.memoryCache.get(key)
    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set data in memory cache
   */
  private setMemoryCache<T>(key: string, data: T, ttl: number): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  // ==========================================================================
  // File Cache Methods
  // ==========================================================================

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  /**
   * Load cache from file
   */
  private loadFileCache(): MarketplaceCache | null {
    try {
      if (!existsSync(this.cacheFile)) {
        return null
      }

      const content = readFileSync(this.cacheFile, 'utf-8')
      const cache = JSON.parse(content) as MarketplaceCache

      if (cache.version !== CACHE_VERSION) {
        return null
      }

      return cache
    }
    catch {
      return null
    }
  }

  /**
   * Save cache to file
   */
  saveFileCache(packages: MCPPackage[], categories: CategoryInfo[]): void {
    try {
      this.ensureCacheDir()

      const now = new Date().toISOString()
      const expiresAt = new Date(Date.now() + this.cacheTTL).toISOString()

      const cache: MarketplaceCache = {
        version: CACHE_VERSION,
        packages,
        categories,
        createdAt: now,
        expiresAt,
        lastUpdated: now,
      }

      writeFileAtomic(this.cacheFile, JSON.stringify(cache, null, 2), 'utf-8')
    }
    catch (error) {
      this.log('Failed to save file cache:', error)
    }
  }

  /**
   * Check if file cache is expired
   */
  private isFileCacheExpired(): boolean {
    const cache = this.loadFileCache()
    if (!cache) {
      return true
    }

    const expiresAt = new Date(cache.expiresAt).getTime()
    return Date.now() >= expiresAt
  }
}

// ============================================================================
// Mock Data for Development/Testing
// ============================================================================

/**
 * Mock MCP packages for development and testing
 */
export const MOCK_MCP_PACKAGES: MCPPackage[] = [
  {
    id: 'mcp-git-tools',
    name: 'MCP Git Tools',
    version: '1.2.0',
    description: {
      'zh-CN': '强大的 Git 操作 MCP 服务',
      'en': 'Powerful Git operations MCP service',
    },
    author: 'CCJK Team',
    repository: 'https://github.com/ccjk/mcp-git-tools',
    downloads: 15000,
    rating: 4.8,
    ratingCount: 320,
    tags: ['git', 'version-control', 'automation'],
    category: 'dev-tools',
    compatibility: {
      minCcjkVersion: '3.0.0',
      platforms: ['darwin', 'linux', 'win32'],
      codeTools: ['claude-code', 'codex'],
    },
    dependencies: [],
    permissions: [
      {
        type: 'filesystem',
        scope: '.git',
        reason: {
          'zh-CN': '需要访问 Git 仓库',
          'en': 'Requires access to Git repository',
        },
      },
      {
        type: 'shell',
        reason: {
          'zh-CN': '需要执行 Git 命令',
          'en': 'Requires executing Git commands',
        },
      },
    ],
    verified: true,
    verificationStatus: 'verified',
    size: 102400,
    license: 'MIT',
    homepage: 'https://api.claudehome.cn/mcp/git-tools',
    keywords: ['git', 'vcs', 'commit', 'branch'],
    publishedAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'mcp-file-search',
    name: 'MCP File Search',
    version: '2.0.1',
    description: {
      'zh-CN': '高性能文件搜索和索引服务',
      'en': 'High-performance file search and indexing service',
    },
    author: 'Community',
    repository: 'https://github.com/community/mcp-file-search',
    downloads: 8900,
    rating: 4.5,
    ratingCount: 180,
    tags: ['search', 'files', 'indexing', 'ripgrep'],
    category: 'productivity',
    compatibility: {
      minCcjkVersion: '3.0.0',
      platforms: ['darwin', 'linux', 'win32'],
      codeTools: ['claude-code', 'codex', 'aider'],
    },
    dependencies: [],
    permissions: [
      {
        type: 'filesystem',
        reason: {
          'zh-CN': '需要读取文件系统',
          'en': 'Requires filesystem read access',
        },
      },
    ],
    verified: true,
    verificationStatus: 'verified',
    size: 204800,
    license: 'Apache-2.0',
    keywords: ['search', 'find', 'grep', 'files'],
    publishedAt: '2024-12-15T00:00:00Z',
    updatedAt: '2025-01-08T00:00:00Z',
  },
  {
    id: 'mcp-database-connector',
    name: 'MCP Database Connector',
    version: '1.5.3',
    description: {
      'zh-CN': '多数据库连接和查询服务',
      'en': 'Multi-database connection and query service',
    },
    author: 'DevTools Inc',
    repository: 'https://github.com/devtools/mcp-database',
    downloads: 21000,
    rating: 4.9,
    ratingCount: 450,
    tags: ['database', 'sql', 'postgresql', 'mysql', 'sqlite'],
    category: 'data-processing',
    compatibility: {
      minCcjkVersion: '3.2.0',
      platforms: ['darwin', 'linux', 'win32'],
      codeTools: ['claude-code'],
      nodeVersion: '>=18.0.0',
    },
    dependencies: [
      { id: 'mcp-core', version: '^1.0.0' },
    ],
    permissions: [
      {
        type: 'network',
        reason: {
          'zh-CN': '需要连接数据库服务器',
          'en': 'Requires database server connection',
        },
      },
      {
        type: 'env',
        scope: 'DATABASE_*',
        reason: {
          'zh-CN': '需要读取数据库配置环境变量',
          'en': 'Requires database configuration environment variables',
        },
      },
    ],
    verified: true,
    verificationStatus: 'verified',
    size: 153600,
    license: 'MIT',
    homepage: 'https://devtools.io/mcp-database',
    keywords: ['database', 'sql', 'query', 'orm'],
    publishedAt: '2024-11-20T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
  },
]

/**
 * Mock categories data
 */
export const MOCK_CATEGORIES: CategoryInfo[] = [
  {
    id: 'ai-tools',
    name: { 'zh-CN': 'AI 工具', 'en': 'AI Tools' },
    description: { 'zh-CN': 'AI 和机器学习相关的 MCP 服务', 'en': 'AI and machine learning related MCP services' },
    count: 28,
    icon: '🤖',
  },
  {
    id: 'dev-tools',
    name: { 'zh-CN': '开发工具', 'en': 'Development Tools' },
    description: { 'zh-CN': '软件开发相关的 MCP 服务', 'en': 'Software development related MCP services' },
    count: 45,
    icon: '🔧',
  },
  {
    id: 'productivity',
    name: { 'zh-CN': '生产力', 'en': 'Productivity' },
    description: { 'zh-CN': '提高工作效率的 MCP 服务', 'en': 'Productivity enhancing MCP services' },
    count: 32,
    icon: '⚡',
  },
  {
    id: 'data-processing',
    name: { 'zh-CN': '数据处理', 'en': 'Data Processing' },
    description: { 'zh-CN': '数据处理和分析的 MCP 服务', 'en': 'Data processing and analysis MCP services' },
    count: 24,
    icon: '📊',
  },
  {
    id: 'integrations',
    name: { 'zh-CN': '集成', 'en': 'Integrations' },
    description: { 'zh-CN': '第三方服务集成的 MCP 服务', 'en': 'Third-party service integration MCP services' },
    count: 38,
    icon: '🔗',
  },
  {
    id: 'utilities',
    name: { 'zh-CN': '实用工具', 'en': 'Utilities' },
    description: { 'zh-CN': '通用实用工具 MCP 服务', 'en': 'General utility MCP services' },
    count: 56,
    icon: '🛠️',
  },
]

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a marketplace client instance
 */
export function createMarketplaceClient(options?: MarketplaceClientOptions): MarketplaceClient {
  return new MarketplaceClient(options)
}

/**
 * Get the default marketplace client instance (singleton)
 */
let defaultClientInstance: MarketplaceClient | null = null

export function getDefaultMarketplaceClient(): MarketplaceClient {
  if (!defaultClientInstance) {
    defaultClientInstance = new MarketplaceClient()
  }
  return defaultClientInstance
}

/**
 * Reset the default client instance (for testing)
 */
export function resetDefaultMarketplaceClient(): void {
  defaultClientInstance = null
}

/**
 * Create a mock client for testing (uses offline mode with mock data)
 */
export function createMockMarketplaceClient(options: MarketplaceClientOptions = {}): MarketplaceClient {
  return new MarketplaceClient({
    ...options,
    offlineMode: true,
    enableLogging: true,
  })
}
