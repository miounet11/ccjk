/**
 * CCJK Cloud API Client
 *
 * Generic HTTP client for communicating with CCJK Cloud Services.
 * Provides request/response handling, error management, timeout control,
 * and retry logic for cloud-based features.
 *
 * @module services/cloud/api-client
 */

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT = 30000 // 30 seconds
const DEFAULT_RETRY_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY = 1000 // 1 second

// ============================================================================
// Types
// ============================================================================

/**
 * Cloud API response wrapper
 *
 * Standard response format for all cloud API endpoints.
 */
export interface CloudApiResponse<T = unknown> {
  /** Whether request was successful */
  success: boolean
  /** Response data */
  data?: T
  /** Error message */
  error?: string
  /** Error code */
  code?: string
  /** Response timestamp */
  timestamp?: string
}

/**
 * API request options
 *
 * Configuration for making HTTP requests to cloud services.
 */
export interface ApiRequestOptions {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  /** Request body (will be JSON stringified) */
  body?: unknown
  /** Custom headers */
  headers?: Record<string, string>
  /** Request timeout in milliseconds */
  timeout?: number
  /** Query parameters */
  query?: Record<string, string | number | boolean>
  /** Authentication token */
  authToken?: string
  /** Retry configuration */
  retry?: {
    /** Maximum retry attempts */
    maxAttempts: number
    /** Delay between retries in milliseconds */
    delay: number
  }
}

/**
 * API client configuration
 *
 * Configuration for the CloudApiClient instance.
 */
export interface ApiClientConfig {
  /** Base URL for API endpoints */
  baseUrl: string
  /** Default timeout for requests */
  timeout?: number
  /** Default authentication token */
  authToken?: string
  /** User agent string */
  userAgent?: string
  /** Default retry configuration */
  retry?: {
    maxAttempts: number
    delay: number
  }
}

// ============================================================================
// CloudApiClient Class
// ============================================================================

/**
 * Cloud API Client
 *
 * Generic HTTP client for CCJK Cloud Services with built-in error handling,
 * timeout management, and retry logic.
 *
 * @example
 * ```typescript
 * const client = new CloudApiClient({
 *   baseUrl: 'https://api.claudehome.cn',
 *   timeout: 30000,
 *   authToken: 'your-token'
 * })
 *
 * const response = await client.request<{ plugins: Plugin[] }>('/plugins/recommend', {
 *   method: 'POST',
 *   body: { os: 'darwin', codeTool: 'claude-code' }
 * })
 *
 * if (response.success) {
 *   console.log('Plugins:', response.data.plugins)
 * }
 * ```
 */
export class CloudApiClient {
  private baseUrl: string
  private timeout: number
  private authToken?: string
  private userAgent: string
  private retry: {
    maxAttempts: number
    delay: number
  }

  /**
   * Create a new CloudApiClient instance
   *
   * @param config - Client configuration
   */
  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.timeout = config.timeout || DEFAULT_TIMEOUT
    this.authToken = config.authToken
    this.userAgent = config.userAgent || 'CCJK-Client/1.0'
    this.retry = config.retry || {
      maxAttempts: DEFAULT_RETRY_ATTEMPTS,
      delay: DEFAULT_RETRY_DELAY,
    }
  }

  // ==========================================================================
  // Configuration Methods
  // ==========================================================================

  /**
   * Set authentication token
   *
   * @param token - Authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = undefined
  }

  /**
   * Get current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * Update base URL
   *
   * @param url - New base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '')
  }

  // ==========================================================================
  // Request Methods
  // ==========================================================================

  /**
   * Make an HTTP request to the cloud service
   *
   * @param path - API endpoint path (e.g., '/plugins/recommend')
   * @param options - Request options
   * @returns API response
   *
   * @example
   * ```typescript
   * const response = await client.request<{ data: string }>('/api/endpoint', {
   *   method: 'POST',
   *   body: { key: 'value' },
   *   timeout: 5000
   * })
   * ```
   */
  async request<T>(
    path: string,
    options: ApiRequestOptions,
  ): Promise<CloudApiResponse<T>> {
    const maxAttempts = options.retry?.maxAttempts || this.retry.maxAttempts
    const retryDelay = options.retry?.delay || this.retry.delay

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.executeRequest<T>(path, options)
      }
      catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Don't retry on client errors (4xx) or if this is the last attempt
        if (attempt === maxAttempts || this.isClientError(lastError)) {
          break
        }

        // Wait before retrying
        await this.sleep(retryDelay * attempt)
      }
    }

    // All attempts failed
    return {
      success: false,
      error: lastError?.message || 'Request failed',
      code: 'REQUEST_FAILED',
    }
  }

  /**
   * Execute a single HTTP request
   *
   * @private
   */
  private async executeRequest<T>(
    path: string,
    options: ApiRequestOptions,
  ): Promise<CloudApiResponse<T>> {
    const url = this.buildUrl(path, options.query)
    const timeout = options.timeout || this.timeout

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const headers = this.buildHeaders(options)

      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const data = await response.json() as CloudApiResponse<T>

      if (!response.ok) {
        // Handle error object format from cloud API
        const errorMsg = typeof data.error === 'object' && data.error !== null
          ? (data.error as { message?: string }).message || JSON.stringify(data.error)
          : data.error || `HTTP ${response.status}: ${response.statusText}`
        const errorCode = typeof data.error === 'object' && data.error !== null
          ? (data.error as { code?: string }).code || data.code
          : data.code
        return {
          success: false,
          error: errorMsg,
          code: errorCode || `HTTP_${response.status}`,
        }
      }

      return {
        ...data,
        success: true,
      }
    }
    catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout',
            code: 'TIMEOUT',
          }
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

  // ==========================================================================
  // Convenience Methods
  // ==========================================================================

  /**
   * Make a GET request
   *
   * @param path - API endpoint path
   * @param query - Query parameters
   * @param options - Additional request options
   * @returns API response
   */
  async get<T>(
    path: string,
    query?: Record<string, string | number | boolean>,
    options?: Partial<ApiRequestOptions>,
  ): Promise<CloudApiResponse<T>> {
    return this.request<T>(path, {
      method: 'GET',
      query,
      ...options,
    })
  }

  /**
   * Make a POST request
   *
   * @param path - API endpoint path
   * @param body - Request body
   * @param options - Additional request options
   * @returns API response
   */
  async post<T>(
    path: string,
    body?: unknown,
    options?: Partial<ApiRequestOptions>,
  ): Promise<CloudApiResponse<T>> {
    return this.request<T>(path, {
      method: 'POST',
      body,
      ...options,
    })
  }

  /**
   * Make a PUT request
   *
   * @param path - API endpoint path
   * @param body - Request body
   * @param options - Additional request options
   * @returns API response
   */
  async put<T>(
    path: string,
    body?: unknown,
    options?: Partial<ApiRequestOptions>,
  ): Promise<CloudApiResponse<T>> {
    return this.request<T>(path, {
      method: 'PUT',
      body,
      ...options,
    })
  }

  /**
   * Make a DELETE request
   *
   * @param path - API endpoint path
   * @param options - Additional request options
   * @returns API response
   */
  async delete<T>(
    path: string,
    options?: Partial<ApiRequestOptions>,
  ): Promise<CloudApiResponse<T>> {
    return this.request<T>(path, {
      method: 'DELETE',
      ...options,
    })
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Build full URL with query parameters
   *
   * @private
   */
  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean>,
  ): string {
    const url = `${this.baseUrl}${path}`

    if (!query || Object.keys(query).length === 0) {
      return url
    }

    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      params.append(key, String(value))
    }

    return `${url}?${params.toString()}`
  }

  /**
   * Build request headers
   *
   * @private
   */
  private buildHeaders(options: ApiRequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': this.userAgent,
      ...options.headers,
    }

    // Add authentication token
    const token = options.authToken || this.authToken
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  /**
   * Check if error is a client error (4xx)
   *
   * @private
   */
  private isClientError(error: Error): boolean {
    return error.message.includes('HTTP 4')
  }

  /**
   * Sleep for specified milliseconds
   *
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new CloudApiClient instance
 *
 * @param config - Client configuration
 * @returns CloudApiClient instance
 *
 * @example
 * ```typescript
 * const client = createApiClient({
 *   baseUrl: 'https://api.claudehome.cn',
 *   timeout: 30000
 * })
 * ```
 */
export function createApiClient(config: ApiClientConfig): CloudApiClient {
  return new CloudApiClient(config)
}
