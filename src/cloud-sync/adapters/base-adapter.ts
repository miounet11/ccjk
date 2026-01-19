import type { Buffer } from 'node:buffer'
/**
 * Cloud Storage Base Adapter
 *
 * Abstract base class for all cloud storage adapters.
 * Provides common interface and utility methods.
 *
 * @module cloud-sync/adapters/base-adapter
 */

import type {
  CloudProvider,
  DownloadResult,
  ItemMetadata,
  ProgressCallback,
  ProviderConfig,
  RemoteItem,
  UploadResult,
} from './types'
import { createHash } from 'node:crypto'
import { AdapterError } from './types'

/**
 * Abstract base class for cloud storage adapters
 *
 * All cloud storage adapters must extend this class and implement
 * the abstract methods for their specific provider.
 */
export abstract class CloudAdapter<T extends ProviderConfig = ProviderConfig> {
  /**
   * The cloud provider type
   */
  abstract readonly provider: CloudProvider

  /**
   * Current configuration
   */
  protected config: T | null = null

  /**
   * Connection state
   */
  protected connected: boolean = false

  /**
   * Progress callback for operations
   */
  protected progressCallback: ProgressCallback | null = null

  /**
   * Default timeout in milliseconds
   */
  protected readonly defaultTimeout: number = 30000

  /**
   * Default maximum retry attempts
   */
  protected readonly defaultMaxRetries: number = 3

  // ===========================================================================
  // Abstract Methods - Must be implemented by subclasses
  // ===========================================================================

  /**
   * Connect to the cloud storage provider
   *
   * @param config - Provider-specific configuration
   * @throws AdapterError if connection fails
   */
  abstract connect(config: T): Promise<void>

  /**
   * Disconnect from the cloud storage provider
   */
  abstract disconnect(): Promise<void>

  /**
   * Upload data to cloud storage
   *
   * @param key - Unique key/path for the item
   * @param data - Data to upload
   * @param metadata - Optional metadata to attach
   * @returns Upload result with details
   */
  abstract upload(key: string, data: Buffer, metadata?: Record<string, unknown>): Promise<UploadResult>

  /**
   * Download data from cloud storage
   *
   * @param key - Key/path of the item to download
   * @returns Download result with data
   */
  abstract download(key: string): Promise<DownloadResult>

  /**
   * Delete an item from cloud storage
   *
   * @param key - Key/path of the item to delete
   */
  abstract delete(key: string): Promise<void>

  /**
   * List items in cloud storage
   *
   * @param prefix - Optional prefix to filter items
   * @returns Array of remote items
   */
  abstract list(prefix?: string): Promise<RemoteItem[]>

  /**
   * Get metadata for an item
   *
   * @param key - Key/path of the item
   * @returns Item metadata
   */
  abstract getMetadata(key: string): Promise<ItemMetadata>

  // ===========================================================================
  // Common Methods
  // ===========================================================================

  /**
   * Check if adapter is connected
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Get current configuration
   */
  getConfig(): T | null {
    return this.config
  }

  /**
   * Set progress callback for upload/download operations
   *
   * @param callback - Progress callback function
   */
  setProgressCallback(callback: ProgressCallback | null): void {
    this.progressCallback = callback
  }

  /**
   * Check if an item exists
   *
   * @param key - Key/path to check
   * @returns True if item exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.getMetadata(key)
      return true
    }
    catch (error) {
      if (error instanceof AdapterError && error.code === 'NOT_FOUND') {
        return false
      }
      throw error
    }
  }

  // ===========================================================================
  // Protected Utility Methods
  // ===========================================================================

  /**
   * Ensure adapter is connected before operations
   *
   * @throws AdapterError if not connected
   */
  protected ensureConnected(): void {
    if (!this.connected) {
      throw new AdapterError(
        'Adapter is not connected. Call connect() first.',
        'CONNECTION_FAILED',
        this.provider,
      )
    }
  }

  /**
   * Calculate SHA-256 checksum of data
   *
   * @param data - Data to hash
   * @returns Hex-encoded SHA-256 hash
   */
  protected calculateChecksum(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex')
  }

  /**
   * Get timeout value from config or default
   */
  protected getTimeout(): number {
    return this.config?.timeout ?? this.defaultTimeout
  }

  /**
   * Get max retries from config or default
   */
  protected getMaxRetries(): number {
    return this.config?.maxRetries ?? this.defaultMaxRetries
  }

  /**
   * Report progress to callback
   *
   * @param operation - Operation type
   * @param key - Item key
   * @param bytesTransferred - Bytes transferred so far
   * @param totalBytes - Total bytes (if known)
   */
  protected reportProgress(
    operation: 'upload' | 'download',
    key: string,
    bytesTransferred: number,
    totalBytes?: number,
  ): void {
    if (this.progressCallback) {
      this.progressCallback({
        operation,
        key,
        bytesTransferred,
        totalBytes,
        percentage: totalBytes ? Math.round((bytesTransferred / totalBytes) * 100) : undefined,
      })
    }
  }

  /**
   * Execute operation with retry logic
   *
   * @param operation - Async operation to execute
   * @param retryableErrors - Error codes that should trigger retry
   * @returns Operation result
   */
  protected async withRetry<R>(
    operation: () => Promise<R>,
    retryableErrors: string[] = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED'],
  ): Promise<R> {
    const maxRetries = this.getMaxRetries()
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      }
      catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        const shouldRetry
          = error instanceof AdapterError
            && retryableErrors.includes(error.code)
            && attempt < maxRetries

        if (!shouldRetry) {
          throw error
        }

        // Exponential backoff with jitter
        const delay = Math.min(1000 * 2 ** (attempt - 1) + Math.random() * 1000, 30000)
        await this.sleep(delay)
      }
    }

    throw lastError
  }

  /**
   * Create a fetch request with timeout
   *
   * @param url - Request URL
   * @param options - Fetch options
   * @returns Fetch response
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const timeout = this.getTimeout()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      return response
    }
    catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AdapterError(
          `Request timed out after ${timeout}ms`,
          'TIMEOUT',
          this.provider,
          error,
        )
      }
      throw new AdapterError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        'NETWORK_ERROR',
        this.provider,
        error instanceof Error ? error : undefined,
      )
    }
    finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms - Milliseconds to sleep
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get current ISO timestamp
   */
  protected getCurrentTimestamp(): string {
    return new Date().toISOString()
  }

  /**
   * Normalize key/path (remove leading/trailing slashes, normalize separators)
   *
   * @param key - Key to normalize
   * @returns Normalized key
   */
  protected normalizeKey(key: string): string {
    return key
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .replace(/\/+/g, '/')
  }
}
