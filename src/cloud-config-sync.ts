/**
 * Cloud Configuration Synchronization Module
 *
 * Provides periodic synchronization with cloud-based configuration services,
 * enabling automatic updates of API provider presets and other cloud-managed settings.
 *
 * Features:
 * - Periodic polling with configurable intervals
 * - Automatic retry with exponential backoff
 * - Event-driven architecture for integration
 * - Graceful degradation on network failures
 * - Cache management with TTL
 *
 * @module cloud-config-sync
 */

import type { ApiProviderPreset } from './config/api-providers'
import { EventEmitter } from 'node:events'
import { CCJK_CLOUD_API_URL } from './constants'

/**
 * Cloud API response structure
 */
interface CloudApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message?: string
  }
}

/**
 * Cloud sync event types
 */
export type CloudSyncEventType = 'sync-started' | 'sync-completed' | 'sync-failed' | 'config-updated'

/**
 * Cloud sync event data
 */
export interface CloudSyncEvent {
  /** Event type */
  type: CloudSyncEventType

  /** Event timestamp */
  timestamp: Date

  /** Updated configuration data (for config-updated events) */
  data?: any

  /** Error information (for sync-failed events) */
  error?: Error
}

/**
 * Cloud sync configuration options
 */
export interface CloudSyncOptions {
  /**
   * Sync interval in milliseconds
   * @default 300000 (5 minutes)
   */
  syncInterval?: number

  /**
   * API endpoint URL
   * @default CCJK_CLOUD_API_URL
   */
  apiEndpoint?: string

  /**
   * Request timeout in milliseconds
   * @default 5000 (5 seconds)
   */
  timeout?: number

  /**
   * Maximum retry attempts on failure
   * @default 3
   */
  maxRetries?: number

  /**
   * Initial retry delay in milliseconds
   * @default 1000 (1 second)
   */
  retryDelay?: number

  /**
   * Whether to sync immediately on start
   * @default true
   */
  syncOnStart?: boolean

  /**
   * API key for authenticated requests (optional)
   */
  apiKey?: string
}

/**
 * Cloud sync statistics
 */
export interface CloudSyncStats {
  /** Total number of sync attempts */
  totalSyncs: number

  /** Number of successful syncs */
  successfulSyncs: number

  /** Number of failed syncs */
  failedSyncs: number

  /** Last sync timestamp */
  lastSyncAt: Date | null

  /** Last successful sync timestamp */
  lastSuccessAt: Date | null

  /** Last error */
  lastError: Error | null

  /** Current sync status */
  isRunning: boolean
}

/**
 * Cloud configuration synchronizer
 *
 * Periodically fetches configuration updates from cloud API and notifies
 * listeners when new configurations are available.
 *
 * Extends EventEmitter to provide event-driven notifications:
 * - `sync-started`: Emitted when sync begins
 * - `sync-completed`: Emitted when sync completes successfully
 * - `sync-failed`: Emitted when sync fails
 * - `config-updated`: Emitted when configuration changes are detected
 * - `error`: Emitted when an error occurs
 *
 * @example
 * ```typescript
 * const sync = new CloudConfigSync({
 *   syncInterval: 300000, // 5 minutes
 *   apiEndpoint: 'https://api.example.com'
 * })
 *
 * // Listen for config updates
 * sync.on('config-updated', (event: CloudSyncEvent) => {
 *   console.log('New config available:', event.data)
 * })
 *
 * // Start syncing
 * sync.startSync()
 *
 * // Stop syncing
 * sync.stopSync()
 * ```
 */
export class CloudConfigSync extends EventEmitter {
  private options: Required<Omit<CloudSyncOptions, 'apiKey'>> & { apiKey?: string }
  private syncTimer: NodeJS.Timeout | null = null
  private isRunning = false
  private stats: CloudSyncStats = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    lastSyncAt: null,
    lastSuccessAt: null,
    lastError: null,
    isRunning: false,
  }

  private lastConfigHash: string | null = null

  /**
   * Create a new cloud configuration synchronizer
   *
   * @param options - Cloud sync configuration options
   *
   * @example
   * ```typescript
   * const sync = new CloudConfigSync({
   *   syncInterval: 600000, // 10 minutes
   *   timeout: 10000 // 10 seconds
   * })
   * ```
   */
  constructor(options: CloudSyncOptions = {}) {
    super()

    // Set default options
    this.options = {
      syncInterval: options.syncInterval ?? 300000, // 5 minutes
      apiEndpoint: options.apiEndpoint ?? CCJK_CLOUD_API_URL,
      timeout: options.timeout ?? 5000, // 5 seconds
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000, // 1 second
      syncOnStart: options.syncOnStart ?? true,
      apiKey: options.apiKey,
    }
  }

  /**
   * Start periodic synchronization
   *
   * Begins polling the cloud API at the configured interval.
   * Optionally performs an immediate sync on start.
   *
   * @param interval - Optional custom sync interval (overrides constructor option)
   *
   * @example
   * ```typescript
   * // Start with default interval
   * sync.startSync()
   *
   * // Start with custom interval (10 minutes)
   * sync.startSync(600000)
   * ```
   */
  startSync(interval?: number): void {
    if (this.isRunning) {
      throw new Error('Cloud sync is already running. Call stopSync() first.')
    }

    const syncInterval = interval ?? this.options.syncInterval
    this.isRunning = true
    this.stats.isRunning = true

    // Perform immediate sync if configured
    if (this.options.syncOnStart) {
      this.forceSync().catch((error) => {
        this.emit('error', error)
      })
    }

    // Set up periodic sync
    this.syncTimer = setInterval(() => {
      this.forceSync().catch((error) => {
        this.emit('error', error)
      })
    }, syncInterval)
  }

  /**
   * Stop periodic synchronization
   *
   * Stops the sync timer and clears any pending operations.
   *
   * @example
   * ```typescript
   * sync.stopSync()
   * console.log('Stopped cloud sync')
   * ```
   */
  stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }

    this.isRunning = false
    this.stats.isRunning = false
  }

  /**
   * Force an immediate synchronization
   *
   * Performs a sync operation immediately, bypassing the interval timer.
   * Useful for manual refresh operations.
   *
   * @returns Promise that resolves when sync completes
   *
   * @example
   * ```typescript
   * try {
   *   await sync.forceSync()
   *   console.log('Sync completed successfully')
   * } catch (error) {
   *   console.error('Sync failed:', error)
   * }
   * ```
   */
  async forceSync(): Promise<void> {
    this.stats.totalSyncs++
    this.stats.lastSyncAt = new Date()

    const event: CloudSyncEvent = {
      type: 'sync-started',
      timestamp: new Date(),
    }
    this.emit('sync-started', event)

    try {
      // Fetch configuration from cloud with retry logic
      const config = await this.fetchWithRetry()

      // Check if configuration has changed
      const configHash = this.hashConfig(config)
      if (configHash !== this.lastConfigHash) {
        this.lastConfigHash = configHash

        // Emit config update event
        const updateEvent: CloudSyncEvent = {
          type: 'config-updated',
          timestamp: new Date(),
          data: config,
        }
        this.emit('config-updated', updateEvent)
      }

      // Update stats
      this.stats.successfulSyncs++
      this.stats.lastSuccessAt = new Date()
      this.stats.lastError = null

      // Emit completion event
      const completeEvent: CloudSyncEvent = {
        type: 'sync-completed',
        timestamp: new Date(),
        data: config,
      }
      this.emit('sync-completed', completeEvent)
    }
    catch (error) {
      // Update stats
      this.stats.failedSyncs++
      this.stats.lastError = error instanceof Error ? error : new Error(String(error))

      // Emit failure event
      const failEvent: CloudSyncEvent = {
        type: 'sync-failed',
        timestamp: new Date(),
        error: this.stats.lastError,
      }
      this.emit('sync-failed', failEvent)

      throw error
    }
  }

  /**
   * Register a callback for configuration updates
   *
   * @param callback - Function to call when config updates
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = sync.onConfigUpdate((event) => {
   *   console.log('Config updated:', event.data)
   * })
   *
   * // Later, unsubscribe
   * unsubscribe()
   * ```
   */
  onConfigUpdate(callback: (event: CloudSyncEvent) => void): () => void {
    const handler = (event: CloudSyncEvent): void => callback(event)
    this.on('config-updated', handler)

    // Return unsubscribe function
    return (): void => {
      this.off('config-updated', handler)
    }
  }

  /**
   * Get synchronization statistics
   *
   * @returns Current sync statistics
   *
   * @example
   * ```typescript
   * const stats = sync.getStats()
   * console.log(`Success rate: ${stats.successfulSyncs}/${stats.totalSyncs}`)
   * ```
   */
  getStats(): CloudSyncStats {
    return { ...this.stats }
  }

  /**
   * Check if sync is currently running
   *
   * @returns true if sync is active
   */
  isActive(): boolean {
    return this.isRunning
  }

  /**
   * Fetch configuration from cloud API with retry logic
   *
   * @returns Fetched configuration data
   * @throws Error if all retry attempts fail
   *
   * @private
   */
  private async fetchWithRetry(): Promise<any> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      try {
        return await this.fetchConfig()
      }
      catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Don't retry on last attempt
        if (attempt < this.options.maxRetries - 1) {
          // Exponential backoff
          const delay = this.options.retryDelay * (2 ** attempt)
          await this.sleep(delay)
        }
      }
    }

    throw lastError || new Error('Failed to fetch configuration after retries')
  }

  /**
   * Fetch configuration from cloud API
   *
   * @returns Fetched configuration data
   * @throws Error if fetch fails
   *
   * @private
   */
  private async fetchConfig(): Promise<any> {
    const url = `${this.options.apiEndpoint}/providers`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.options.apiKey) {
      headers.Authorization = `Bearer ${this.options.apiKey}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.options.timeout),
    })

    if (!response.ok) {
      throw new Error(`Cloud API returned ${response.status}: ${response.statusText}`)
    }

    const result = await response.json() as CloudApiResponse

    if (!result.success) {
      throw new Error(result.error?.message || 'Cloud API returned error')
    }

    return result.data
  }

  /**
   * Generate hash of configuration for change detection
   *
   * @param config - Configuration object
   * @returns Hash string
   *
   * @private
   */
  private hashConfig(config: any): string {
    // Simple hash using JSON stringification
    // In production, consider using a proper hash function
    return JSON.stringify(config)
  }

  /**
   * Sleep for specified duration
   *
   * @param ms - Duration in milliseconds
   *
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Create a new cloud configuration synchronizer instance
 *
 * @param options - Cloud sync configuration options
 * @returns New CloudConfigSync instance
 *
 * @example
 * ```typescript
 * const sync = createCloudConfigSync({
 *   syncInterval: 600000
 * })
 * ```
 */
export function createCloudConfigSync(options?: CloudSyncOptions): CloudConfigSync {
  return new CloudConfigSync(options)
}

/**
 * Fetch API providers from cloud (one-time fetch)
 *
 * Utility function for fetching providers without setting up periodic sync.
 *
 * @param apiEndpoint - Optional custom API endpoint
 * @param timeout - Optional request timeout
 * @returns Array of API provider presets
 *
 * @example
 * ```typescript
 * const providers = await fetchCloudProviders()
 * console.log(`Fetched ${providers.length} providers`)
 * ```
 */
export async function fetchCloudProviders(
  apiEndpoint?: string,
  timeout = 5000,
): Promise<ApiProviderPreset[]> {
  const url = `${apiEndpoint || CCJK_CLOUD_API_URL}/providers`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(timeout),
    })

    if (!response.ok) {
      return []
    }

    const result = await response.json() as CloudApiResponse<ApiProviderPreset[]>
    if (result.success && Array.isArray(result.data)) {
      return result.data.map((p: ApiProviderPreset) => ({ ...p, isCloud: true }))
    }

    return []
  }
  catch {
    // Silently fail and return empty array
    return []
  }
}
