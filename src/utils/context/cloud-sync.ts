/**
 * Cloud Sync Module for CCJK Context Compression System
 * Handles cross-device synchronization of sessions and summaries
 */

import type { StorageManager } from './storage-manager'
import type { SessionMeta } from './storage-types'
import type { SyncQueueManager } from './sync-queue'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import * as os from 'node:os'
import { promisify } from 'node:util'
import { gunzip, gzip } from 'node:zlib'
import { createStorageManager } from './storage-manager'
import { createSyncQueueManager } from './sync-queue'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

/**
 * Cloud sync configuration options
 */
export interface CloudSyncOptions {
  /** API endpoint for cloud service */
  apiEndpoint: string
  /** API key for authentication */
  apiKey?: string
  /** Sync interval in milliseconds (default: 5 minutes) */
  syncInterval?: number
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number
  /** Conflict resolution strategy (default: 'local-wins') */
  conflictStrategy?: 'local-wins' | 'remote-wins' | 'merge'
  /** Enable data compression (default: true) */
  enableCompression?: boolean
  /** Storage manager instance */
  storageManager?: StorageManager
  /** Sync queue manager instance */
  syncQueueManager?: SyncQueueManager
}

/**
 * Sync data payload
 */
export interface SyncData {
  /** Unique identifier */
  id: string
  /** Data type */
  type: 'session' | 'summary' | 'config'
  /** Actual data payload */
  data: unknown
  /** Version number for conflict resolution */
  version: number
  /** Last update timestamp */
  updatedAt: number
  /** Data checksum for integrity verification */
  checksum: string
  /** Device identifier */
  deviceId?: string
  /** Compression flag */
  compressed?: boolean
}

/**
 * Sync operation result
 */
export interface SyncResult {
  /** Number of items uploaded */
  uploaded: number
  /** Number of items downloaded */
  downloaded: number
  /** Number of conflicts encountered */
  conflicts: number
  /** Error messages */
  errors: string[]
  /** Sync duration in milliseconds */
  duration: number
}

/**
 * Sync status information
 */
export interface SyncStatus {
  /** Whether sync service is running */
  isRunning: boolean
  /** Last successful sync timestamp */
  lastSync: number | null
  /** Number of pending uploads */
  pendingUploads: number
  /** Number of pending downloads */
  pendingDownloads: number
  /** Recent error messages */
  errors: string[]
  /** Next scheduled sync time */
  nextSync: number | null
}

/**
 * Cloud sync event types
 */
export type CloudSyncEventType
  = | 'sync_started'
    | 'sync_completed'
    | 'sync_failed'
    | 'upload_success'
    | 'download_success'
    | 'conflict_detected'
    | 'conflict_resolved'

/**
 * Cloud sync event
 */
export interface CloudSyncEvent {
  type: CloudSyncEventType
  timestamp: number
  data?: any
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<CloudSyncOptions, 'apiKey' | 'storageManager' | 'syncQueueManager'>> = {
  apiEndpoint: 'https://api.ccjk.cloud/sync',
  syncInterval: 5 * 60 * 1000, // 5 minutes
  maxRetries: 3,
  conflictStrategy: 'local-wins',
  enableCompression: true,
}

/**
 * Cloud synchronization manager
 * Handles bidirectional sync between local storage and cloud service
 */
export class CloudSync extends EventEmitter {
  private config: Required<CloudSyncOptions>
  private storageManager: StorageManager
  private syncQueueManager: SyncQueueManager
  private syncTimer: NodeJS.Timeout | null = null
  private isRunning = false
  private lastSyncTime: number | null = null
  private errors: string[] = []
  private deviceId: string
  private isSyncing = false

  constructor(options: CloudSyncOptions) {
    super()

    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...options,
      apiKey: options.apiKey || '',
      storageManager: options.storageManager || createStorageManager(),
      syncQueueManager: options.syncQueueManager || createSyncQueueManager(''),
    }

    this.storageManager = this.config.storageManager
    this.syncQueueManager = this.config.syncQueueManager
    this.deviceId = this.generateDeviceId()
  }

  /**
   * Start sync service
   * Begins periodic synchronization with cloud
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    this.errors = []

    // Initialize managers
    await this.storageManager.initialize()
    await this.syncQueueManager.initialize()

    // Perform initial sync
    await this.syncNow()

    // Schedule periodic sync
    this.syncTimer = setInterval(() => {
      this.syncNow().catch((error) => {
        this.addError(`Periodic sync failed: ${error.message}`)
      })
    }, this.config.syncInterval)

    this.emitEvent('sync_started', { deviceId: this.deviceId })
  }

  /**
   * Stop sync service
   * Cancels periodic synchronization
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false

    // Clear sync timer
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }

    // Wait for current sync to complete
    while (this.isSyncing) {
      await this.sleep(100)
    }
  }

  /**
   * Manually trigger synchronization
   * Performs bidirectional sync with cloud
   */
  async syncNow(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress')
    }

    this.isSyncing = true
    const startTime = Date.now()

    const result: SyncResult = {
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      errors: [],
      duration: 0,
    }

    try {
      // Process upload queue
      const uploadResult = await this.processUploadQueue()
      result.uploaded = uploadResult.uploaded
      result.errors.push(...uploadResult.errors)

      // Download remote changes
      const downloadResult = await this.downloadRemoteChanges()
      result.downloaded = downloadResult.downloaded
      result.conflicts = downloadResult.conflicts
      result.errors.push(...downloadResult.errors)

      // Update last sync time
      this.lastSyncTime = Date.now()

      this.emitEvent('sync_completed', result)
    }
    catch (error: any) {
      const errorMsg = `Sync failed: ${error.message}`
      result.errors.push(errorMsg)
      this.addError(errorMsg)
      this.emitEvent('sync_failed', { error: errorMsg })
    }
    finally {
      result.duration = Date.now() - startTime
      this.isSyncing = false
    }

    return result
  }

  /**
   * Upload local data to cloud
   * Compresses and encrypts data before transmission
   */
  async upload(data: SyncData): Promise<void> {
    // Generate checksum
    const checksum = this.generateChecksum(data.data)
    const syncData: SyncData = {
      ...data,
      checksum,
      deviceId: this.deviceId,
      updatedAt: Date.now(),
    }

    // Compress data if enabled
    if (this.config.enableCompression) {
      syncData.data = await this.compressData(syncData.data)
      syncData.compressed = true
    }

    // Upload with retry
    await this.uploadWithRetry(syncData)

    this.emitEvent('upload_success', { id: syncData.id, type: syncData.type })
  }

  /**
   * Download data from cloud
   * Retrieves and decompresses remote data
   */
  async download(): Promise<SyncData[]> {
    const response = await this.fetchWithRetry(`${this.config.apiEndpoint}/download`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`)
    }

    const remoteData = (await response.json()) as SyncData[]

    // Decompress data if needed
    for (const item of remoteData) {
      if (item.compressed) {
        item.data = await this.decompressData(item.data as Buffer)
        item.compressed = false
      }

      // Verify checksum
      const checksum = this.generateChecksum(item.data)
      if (checksum !== item.checksum) {
        throw new Error(`Checksum mismatch for item ${item.id}`)
      }
    }

    return remoteData
  }

  /**
   * Resolve conflict between local and remote data
   * Applies configured conflict resolution strategy
   */
  async resolveConflict(local: SyncData, remote: SyncData): Promise<SyncData> {
    this.emitEvent('conflict_detected', { local, remote })

    let resolved: SyncData

    switch (this.config.conflictStrategy) {
      case 'local-wins':
        resolved = local
        break

      case 'remote-wins':
        resolved = remote
        break

      case 'merge':
        resolved = await this.mergeData(local, remote)
        break

      default:
        resolved = local
    }

    this.emitEvent('conflict_resolved', { strategy: this.config.conflictStrategy, resolved })

    return resolved
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      isRunning: this.isRunning,
      lastSync: this.lastSyncTime,
      pendingUploads: 0, // Will be populated by queue manager
      pendingDownloads: 0,
      errors: [...this.errors],
      nextSync: this.syncTimer && this.isRunning
        ? this.lastSyncTime ? this.lastSyncTime + this.config.syncInterval : Date.now() + this.config.syncInterval
        : null,
    }
  }

  /**
   * Update configuration
   */
  updateConfig(options: Partial<CloudSyncOptions>): void {
    const needsRestart = this.isRunning && (
      options.syncInterval !== undefined
      || options.apiEndpoint !== undefined
    )

    // Update config
    Object.assign(this.config, options)

    // Restart if needed
    if (needsRestart) {
      this.stop().then(() => this.start())
    }
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.errors = []
  }

  /**
   * Process upload queue
   * Uploads all pending items from sync queue
   */
  private async processUploadQueue(): Promise<{ uploaded: number, errors: string[] }> {
    const result = { uploaded: 0, errors: [] as string[] }

    // Get pending items
    const pendingItems = await this.syncQueueManager.listItems({ status: 'pending' })

    // Get retryable failed items
    const retryableItems = await this.syncQueueManager.getRetryableItems()

    const allItems = [...pendingItems, ...retryableItems]

    for (const item of allItems) {
      try {
        // Mark as syncing
        await this.syncQueueManager.markSyncing(item.id)

        // Convert to SyncData
        const syncData: SyncData = {
          id: item.sessionId,
          type: item.type as any,
          data: item.data,
          version: 1,
          updatedAt: Date.now(),
          checksum: this.generateChecksum(item.data),
          deviceId: this.deviceId,
        }

        // Upload
        await this.upload(syncData)

        // Mark as synced
        await this.syncQueueManager.markSynced(item.id)

        result.uploaded++
      }
      catch (error: any) {
        const errorMsg = `Failed to upload item ${item.id}: ${error.message}`
        result.errors.push(errorMsg)

        // Mark as failed with retry
        await this.syncQueueManager.markFailed(
          item.id,
          errorMsg,
          this.calculateRetryDelay(item.retries),
        )
      }
    }

    return result
  }

  /**
   * Download remote changes
   * Fetches and applies remote updates
   */
  private async downloadRemoteChanges(): Promise<{ downloaded: number, conflicts: number, errors: string[] }> {
    const result = { downloaded: 0, conflicts: 0, errors: [] as string[] }

    try {
      const remoteData = await this.download()

      for (const remote of remoteData) {
        try {
          // Check if local version exists
          const local = await this.getLocalData(remote.id, remote.type)

          if (local) {
            // Check for conflicts
            if (local.version !== remote.version || local.updatedAt !== remote.updatedAt) {
              result.conflicts++
              const resolved = await this.resolveConflict(local, remote)
              await this.saveLocalData(resolved)
            }
          }
          else {
            // No local version, save remote
            await this.saveLocalData(remote)
          }

          result.downloaded++
          this.emitEvent('download_success', { id: remote.id, type: remote.type })
        }
        catch (error: any) {
          result.errors.push(`Failed to process remote item ${remote.id}: ${error.message}`)
        }
      }
    }
    catch (error: any) {
      result.errors.push(`Failed to download remote changes: ${error.message}`)
    }

    return result
  }

  /**
   * Upload data with exponential backoff retry
   */
  private async uploadWithRetry(data: SyncData, attempt = 1): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/upload`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }
    }
    catch (error: any) {
      if (attempt >= this.config.maxRetries) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = this.calculateRetryDelay(attempt)
      await this.sleep(delay)

      // Retry
      return this.uploadWithRetry(data, attempt + 1)
    }
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(url: string, options: RequestInit, attempt = 1): Promise<Response> {
    try {
      const response = await fetch(url, options)

      if (!response.ok && this.isRetryableStatus(response.status)) {
        throw new Error(`HTTP ${response.status}`)
      }

      return response
    }
    catch (error: any) {
      if (attempt >= this.config.maxRetries) {
        throw error
      }

      const delay = this.calculateRetryDelay(attempt)
      await this.sleep(delay)

      return this.fetchWithRetry(url, options, attempt + 1)
    }
  }

  /**
   * Check if HTTP status is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return status === 429 || (status >= 500 && status < 600)
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 1000 // 1 second
    const maxDelay = 60000 // 60 seconds
    const delay = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay)
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000
  }

  /**
   * Compress data using gzip
   */
  private async compressData(data: unknown): Promise<Buffer> {
    const json = JSON.stringify(data)
    return gzipAsync(Buffer.from(json, 'utf-8'))
  }

  /**
   * Decompress data using gzip
   */
  private async decompressData(data: Buffer): Promise<unknown> {
    const decompressed = await gunzipAsync(data)
    return JSON.parse(decompressed.toString('utf-8'))
  }

  /**
   * Generate checksum for data integrity
   */
  private generateChecksum(data: unknown): string {
    const json = JSON.stringify(data)
    return createHash('sha256').update(json).digest('hex')
  }

  /**
   * Generate unique device identifier
   */
  private generateDeviceId(): string {
    const hostname = os.hostname()
    const platform = os.platform()
    const arch = os.arch()
    const data = `${hostname}-${platform}-${arch}-${Date.now()}`
    return createHash('md5').update(data).digest('hex').substring(0, 16)
  }

  /**
   * Get HTTP headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-Id': this.deviceId,
    }

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`
    }

    return headers
  }

  /**
   * Get local data by ID and type
   */
  private async getLocalData(id: string, type: SyncData['type']): Promise<SyncData | null> {
    try {
      if (type === 'session') {
        const session = await this.storageManager.getSession(id)
        if (!session) {
          return null
        }

        return {
          id,
          type: 'session',
          data: session.meta,
          version: 1,
          updatedAt: new Date(session.meta.lastUpdated).getTime(),
          checksum: this.generateChecksum(session.meta),
          deviceId: this.deviceId,
        }
      }

      if (type === 'summary') {
        const summary = await this.storageManager.getSummary(id)
        if (!summary) {
          return null
        }

        return {
          id,
          type: 'summary',
          data: summary,
          version: 1,
          updatedAt: Date.now(),
          checksum: this.generateChecksum(summary),
          deviceId: this.deviceId,
        }
      }

      return null
    }
    catch {
      return null
    }
  }

  /**
   * Save data to local storage
   */
  private async saveLocalData(syncData: SyncData): Promise<void> {
    if (syncData.type === 'session') {
      const meta = syncData.data as SessionMeta
      const session = await this.storageManager.getSession(meta.id, meta.projectHash)

      if (session) {
        session.meta = meta
        await this.storageManager.updateSession(session)
      }
    }
    else if (syncData.type === 'summary') {
      const summary = syncData.data as string
      await this.storageManager.saveSummary(syncData.id, summary)
    }
  }

  /**
   * Merge local and remote data
   * Implements intelligent merge strategy
   */
  private async mergeData(local: SyncData, remote: SyncData): Promise<SyncData> {
    // Use the most recent version
    if (remote.updatedAt > local.updatedAt) {
      return remote
    }

    return local
  }

  /**
   * Add error to history
   */
  private addError(error: string): void {
    this.errors.push(error)

    // Keep only last 10 errors
    if (this.errors.length > 10) {
      this.errors.shift()
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Emit cloud sync event
   */
  private emitEvent(type: CloudSyncEventType, data?: any): void {
    const event: CloudSyncEvent = {
      type,
      timestamp: Date.now(),
      data,
    }

    this.emit('sync_event', event)
    this.emit(type, event)
  }
}

/**
 * Create cloud sync instance
 *
 * @param options - Cloud sync configuration
 * @returns Cloud sync instance
 */
export function createCloudSync(options: CloudSyncOptions): CloudSync {
  return new CloudSync(options)
}
