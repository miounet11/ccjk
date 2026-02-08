/**
 * Base API Client for api.claudehome.cn
 * Handles common HTTP operations, retry logic, caching, and error handling
 */

import type {
  CacheConfig,
  RetryConfig,
} from './types.js'
import { AuthManager } from './auth.js'
import { CacheKeyBuilder, parseCacheHeaders, ResponseCacheImpl } from './cache.js'
import { DEFAULT_CONFIG } from './config.js'
import { RetryManager } from './retry.js'
import {
  APIError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
} from './types.js'

interface RequestOptions {
  headers?: Record<string, string>
  timeout?: number
  retries?: number
  cache?: boolean
  signal?: AbortSignal
  params?: Record<string, any>
  body?: any
}

export interface ClientConfig {
  baseURL?: string
  timeout?: number
  retryConfig?: Partial<RetryConfig>
  cacheConfig?: Partial<CacheConfig>
  auth?: {
    accessToken?: string
    refreshToken?: string
    apiKey?: string
  }
}

export class APIClient {
  protected auth: AuthManager
  protected retry: RetryManager
  protected cache: ResponseCacheImpl

  constructor(config: ClientConfig = {}) {
    const baseURL = config.baseURL ?? DEFAULT_CONFIG.baseURL
    const timeout = config.timeout ?? DEFAULT_CONFIG.timeout

    // Initialize auth manager
    this.auth = new AuthManager(baseURL, timeout)

    // Set auth credentials if provided
    if (config.auth) {
      if (config.auth.accessToken && config.auth.refreshToken) {
        this.auth.setTokens(
          config.auth.accessToken,
          config.auth.refreshToken,
        )
      }
      if (config.auth.apiKey) {
        this.auth.setApiKey(config.auth.apiKey)
      }
    }

    // Initialize retry manager
    this.retry = new RetryManager({
      ...DEFAULT_CONFIG.retryConfig,
      ...config.retryConfig,
    })

    // Initialize cache
    this.cache = new ResponseCacheImpl({
      ...DEFAULT_CONFIG.cacheConfig,
      ...config.cacheConfig,
    })
  }

  /**
   * Make HTTP GET request
   */
  protected async get<T>(
    path: string,
    options?: RequestOptions & { params?: Record<string, any> },
  ): Promise<T> {
    let fullPath = path

    // Add query parameters
    if (options?.params) {
      const query = new URLSearchParams()
      Object.entries(options.params)
        .filter(([, value]) => value !== undefined && value !== null)
        .forEach(([key, value]) => query.append(key, String(value)))

      if (query.toString()) {
        fullPath = `${path}?${query.toString()}`
      }
    }

    return this.request<T>('GET', fullPath, undefined, options)
  }

  /**
   * Make HTTP POST request
   */
  protected async post<T>(
    path: string,
    body?: any,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('POST', path, body, options)
  }

  /**
   * Make HTTP PUT request
   */
  protected async put<T>(
    path: string,
    body?: any,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('PUT', path, body, options)
  }

  /**
   * Make HTTP PATCH request
   */
  protected async patch<T>(
    path: string,
    body?: any,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('PATCH', path, body, options)
  }

  /**
   * Make HTTP DELETE request
   */
  protected async delete<T>(
    path: string,
    options?: RequestOptions,
  ): Promise<T> {
    const body = options?.body
    return this.request<T>('DELETE', path, body, options)
  }

  /**
   * Make HTTP request with retry logic and caching
   */
  protected async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: RequestOptions,
  ): Promise<T> {
    const baseURL = DEFAULT_CONFIG.baseURL
    const url = `${baseURL}${path}`
    const timeout = options?.timeout ?? DEFAULT_CONFIG.timeout

    // Check cache for GET requests
    if (method === 'GET' && options?.cache !== false) {
      const cacheKey = CacheKeyBuilder.from(path)
        .withQuery(options?.params ?? {})
        .withHeaders(options?.headers ?? {})
        .build()

      const cached = await this.cache.get<T>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Execute request with retry logic
    const result = await this.retry.execute(async () => {
      return this.executeRequest<T>(method, url, body, options, timeout)
    })

    // Cache successful GET responses
    if (method === 'GET' && options?.cache !== false && result.headers) {
      const cacheKey = CacheKeyBuilder.from(path)
        .withQuery(options?.params ?? {})
        .withHeaders(options?.headers ?? {})
        .build()

      const cacheHeaders = parseCacheHeaders(result.headers)
      if (cacheHeaders.maxAge) {
        await this.cache.set(cacheKey, result.data, cacheHeaders.maxAge)
      }
    }

    return result.data
  }

  /**
   * Execute actual HTTP request
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    body: any,
    options?: RequestOptions,
    timeout?: number,
  ): Promise<{ data: T, headers?: Headers }> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // Prepare headers
      const headers = new Headers({
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      })

      // Add authorization header
      const authHeader = await this.auth.getAuthorizationHeader()
      if (authHeader) {
        headers.set('Authorization', authHeader)
      }

      // Prepare request
      const requestInit: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      }

      if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        if (typeof Buffer !== 'undefined' && body instanceof Buffer) {
          // Binary data (Node.js)
          headers.delete('Content-Type')
          requestInit.body = body as any
        }
        else if (body instanceof Uint8Array) {
          // Binary data (browser)
          headers.delete('Content-Type')
          requestInit.body = body as any
        }
        else {
          // JSON data
          requestInit.body = JSON.stringify(body)
        }
      }

      // Execute request
      const response = await fetch(url, requestInit)

      clearTimeout(timeoutId)

      // Handle errors
      if (!response.ok) {
        await this.handleErrorResponse(response)
      }

      // Parse response
      const data = await response.json() as T

      return { data, headers: response.headers }
    }
    catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof APIError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new APIError('Request timeout', 408, 'TIMEOUT_ERROR')
      }

      throw new APIError(
        error instanceof Error ? error.message : 'Unknown error',
        0,
        'NETWORK_ERROR',
      )
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any = {}

    try {
      errorData = await response.json()
    }
    catch {
      // Ignore parse errors
    }

    const message = errorData.message ?? response.statusText
    const code = errorData.code

    switch (response.status) {
      case 401:
        throw new AuthenticationError(message)

      case 403:
        throw new AuthorizationError(message)

      case 404:
        throw new NotFoundError(errorData.resource ?? 'Resource')

      case 422:
        throw new ValidationError(errorData.errors ?? {})

      case 429:
        const retryAfter = response.headers.get('retry-after')
        throw new RateLimitError(
          retryAfter ? Number.parseInt(retryAfter, 10) : 60,
          message,
        )

      case 500:
      case 502:
      case 503:
      case 504:
        throw new ServerError(message)

      default:
        throw new APIError(message, response.status, code)
    }
  }

  /**
   * Upload file with progress tracking
   */
  protected async upload<T>(
    path: string,
    file: Buffer | Uint8Array | Blob,
    options?: {
      method?: 'POST' | 'PUT'
      filename?: string
      contentType?: string
      onProgress?: (loaded: number, total: number) => void
    },
  ): Promise<T> {
    const baseURL = DEFAULT_CONFIG.baseURL
    const url = `${baseURL}${path}`
    const timeout = options?.onProgress ? undefined : DEFAULT_CONFIG.timeout

    // Prepare form data
    const formData = new FormData()

    if (file instanceof Blob) {
      formData.append('file', file, options?.filename ?? 'file')
    }
    else {
      const blob = new Blob([file], { type: options?.contentType ?? 'application/octet-stream' })
      formData.append('file', blob, options?.filename ?? 'file')
    }

    // Execute with retry logic
    return this.retry.execute(async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const headers = new Headers()

        // Add authorization header
        const authHeader = await this.auth.getAuthorizationHeader()
        if (authHeader) {
          headers.set('Authorization', authHeader)
        }

        // Note: FormData doesn't work well with progress tracking in fetch
        // For proper progress tracking, consider using XMLHttpRequest or a library
        const response = await fetch(url, {
          method: options?.method ?? 'POST',
          headers,
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          await this.handleErrorResponse(response)
        }

        return await response.json() as T
      }
      catch (error) {
        clearTimeout(timeoutId)

        if (error instanceof APIError) {
          throw error
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new APIError('Upload timeout', 408, 'TIMEOUT_ERROR')
        }

        throw new APIError(
          error instanceof Error ? error.message : 'Upload failed',
          0,
          'UPLOAD_ERROR',
        )
      }
    })
  }

  /**
   * Download file
   */
  protected async download(
    path: string,
    options?: RequestOptions,
  ): Promise<Buffer> {
    const baseURL = DEFAULT_CONFIG.baseURL
    const url = `${baseURL}${path}`
    const timeout = options?.timeout ?? DEFAULT_CONFIG.timeout

    return this.retry.execute(async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const headers = new Headers(options?.headers)

        // Add authorization header
        const authHeader = await this.auth.getAuthorizationHeader()
        if (authHeader) {
          headers.set('Authorization', authHeader)
        }

        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          await this.handleErrorResponse(response)
        }

        const arrayBuffer = await response.arrayBuffer()
        return Buffer.from(arrayBuffer)
      }
      catch (error) {
        clearTimeout(timeoutId)

        if (error instanceof APIError) {
          throw error
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new APIError('Download timeout', 408, 'TIMEOUT_ERROR')
        }

        throw new APIError(
          error instanceof Error ? error.message : 'Download failed',
          0,
          'DOWNLOAD_ERROR',
        )
      }
    })
  }

  /**
   * Clear all cached responses
   */
  async clearCache(): Promise<void> {
    await this.cache.clear()
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCache(pattern: string): Promise<void> {
    await this.cache.invalidate(pattern)
  }
}

/**
 * API client builder for fluent configuration
 */
export class APIClientBuilder {
  private config: ClientConfig = {}

  static create(): APIClientBuilder {
    return new APIClientBuilder()
  }

  baseURL(url: string): APIClientBuilder {
    this.config.baseURL = url
    return this
  }

  timeout(ms: number): APIClientBuilder {
    this.config.timeout = ms
    return this
  }

  retry(config: Partial<RetryConfig>): APIClientBuilder {
    this.config.retryConfig = config
    return this
  }

  cache(config: Partial<CacheConfig>): APIClientBuilder {
    this.config.cacheConfig = config
    return this
  }

  authentication(auth: {
    accessToken?: string
    refreshToken?: string
    apiKey?: string
  }): APIClientBuilder {
    this.config.auth = auth
    return this
  }

  build(): APIClient {
    return new APIClient(this.config)
  }
}

/**
 * Singleton client instance
 */
let defaultClient: APIClient | null = null

export function getAPIClient(config?: ClientConfig): APIClient {
  if (!defaultClient) {
    defaultClient = new APIClient(config)
  }
  return defaultClient
}

export function resetAPIClient(): void {
  defaultClient = null
}
