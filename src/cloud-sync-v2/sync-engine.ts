/**
 * Cloud Sync V2 - Sync Engine
 *
 * Main synchronization engine with streaming, encryption, and CRDT support.
 *
 * @module cloud-sync-v2/sync-engine
 */

import type { EncryptionManager } from './encryption'
import type { OfflineQueue } from './offline-queue'
import type { StreamTransferEngine } from './stream-transfer'
import type {
  CRDTSnapshot,
  NodeId,
  OperationType,
  ProgressCallback,
  QueuedOperation,
  SyncEngineV2Config,
  SyncItemType,
  SyncItemV2,
  SyncResultV2,
  Timestamp,
  TransferProgress,
} from './types'
import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { createEncryptionManager } from './encryption'
import { createOfflineQueue } from './offline-queue'
import { createStreamTransferEngine } from './stream-transfer'
import {
  DEFAULT_SYNC_ENGINE_V2_CONFIG,
} from './types'

// ============================================================================
// Storage Adapter Interface
// ============================================================================

/**
 * Local storage adapter for sync items
 */
export interface StorageAdapter<T = unknown> {
  /**
   * Get an item by ID
   */
  get: (id: string) => Promise<SyncItemV2<T> | null>

  /**
   * Get all items of a type
   */
  getAll: (type: SyncItemType) => Promise<SyncItemV2<T>[]>

  /**
   * Save an item
   */
  save: (item: SyncItemV2<T>) => Promise<void>

  /**
   * Delete an item
   */
  delete: (id: string) => Promise<void>

  /**
   * List all item IDs
   */
  list: (type?: SyncItemType) => Promise<string[]>

  /**
   * Check if item exists
   */
  has: (id: string) => Promise<boolean>
}

/**
 * Remote storage adapter for cloud sync
 */
export interface RemoteStorageAdapter<T = unknown> {
  /**
   * Connect to remote storage
   */
  connect: () => Promise<void>

  /**
   * Disconnect from remote storage
   */
  disconnect: () => Promise<void>

  /**
   * Test connection
   */
  testConnection: () => Promise<boolean>

  /**
   * Upload a chunk
   */
  uploadChunk: (itemId: string, chunkIndex: number, data: Buffer) => Promise<void>

  /**
   * Download a chunk
   */
  downloadChunk: (itemId: string, chunkIndex: number) => Promise<Buffer>

  /**
   * Upload metadata
   */
  uploadMetadata: (itemId: string, metadata: SyncItemV2<T>) => Promise<void>

  /**
   * Download metadata
   */
  downloadMetadata: (itemId: string) => Promise<SyncItemV2<T> | null>

  /**
   * List remote items
   */
  list: (type?: SyncItemType) => Promise<SyncItemV2<T>[]>

  /**
   * Delete item
   */
  delete: (itemId: string) => Promise<void>
}

// ============================================================================
// Default In-Memory Storage
// ============================================================================

class InMemoryStorage<T = unknown> implements StorageAdapter<T> {
  private items: Map<string, SyncItemV2<T>> = new Map()

  async get(id: string): Promise<SyncItemV2<T> | null> {
    return this.items.get(id) || null
  }

  async getAll(type: SyncItemType): Promise<SyncItemV2<T>[]> {
    return Array.from(this.items.values()).filter(item => item.type === type)
  }

  async save(item: SyncItemV2<T>): Promise<void> {
    this.items.set(item.id, item)
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id)
  }

  async list(type?: SyncItemType): Promise<string[]> {
    if (type) {
      return Array.from(this.items.values())
        .filter(item => item.type === type)
        .map(item => item.id)
    }
    return Array.from(this.items.keys())
  }

  async has(id: string): Promise<boolean> {
    return this.items.has(id)
  }
}

// ============================================================================
// Sync Engine V2
// ============================================================================

/**
 * Advanced cloud synchronization engine with streaming, encryption, and CRDT support.
 *
 * Features:
 * - Chunked streaming transfers with resume support
 * - End-to-end encryption with AES-256-GCM
 * - CRDT-based conflict resolution
 * - Offline queue with persistence
 * - Progress callbacks
 *
 * @example
 * ```typescript
 * const engine = new SyncEngineV2({
 *   nodeId: 'device-1',
 *   encryption: { enabled: true, algorithm: 'aes-256-gcm' },
 * })
 *
 * // Set storage adapters
 * engine.setStorageAdapter(new InMemoryStorage())
 * engine.setRemoteAdapter(new MyCloudAdapter())
 *
 * // Initialize
 * await engine.initialize('my-password')
 *
 * // Sync with progress
 * await engine.sync('skill', {
 *   onProgress: (progress) => console.log(`${progress.percentage}%`),
 * })
 * ```
 */
export class SyncEngineV2 extends EventEmitter {
  private config: SyncEngineV2Config
  private nodeId: NodeId
  private encryption: EncryptionManager
  private transfer: StreamTransferEngine
  private queue: OfflineQueue
  private localAdapter: StorageAdapter
  private remoteAdapter: RemoteStorageAdapter | null
  private isInitialized: boolean
  private autoSyncTimer: ReturnType<typeof setInterval> | null

  constructor(
    nodeId: string | Partial<SyncEngineV2Config> = {},
    config?: Partial<SyncEngineV2Config>,
  ) {
    super()

    // Handle both string nodeId and config object
    if (typeof nodeId === 'string') {
      this.nodeId = nodeId
      this.config = {
        ...DEFAULT_SYNC_ENGINE_V2_CONFIG,
        ...config,
        nodeId,
      }
    }
    else {
      this.config = {
        ...DEFAULT_SYNC_ENGINE_V2_CONFIG,
        ...nodeId,
        nodeId: nodeId.nodeId || randomUUID(),
      }
      this.nodeId = this.config.nodeId
    }

    // Initialize components
    this.encryption = createEncryptionManager(this.config.encryption)
    this.transfer = createStreamTransferEngine(this.config.transfer)
    this.queue = createOfflineQueue(this.config.queue)
    this.localAdapter = new InMemoryStorage()
    this.remoteAdapter = null

    this.isInitialized = false
    this.autoSyncTimer = null

    // Forward queue events
    this.setupQueueEventForwarding()
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Initialize the sync engine
   *
   * @param password - Encryption password (if encryption enabled)
   */
  async initialize(password?: string): Promise<void> {
    if (this.isInitialized) {
      return
    }

    // Initialize encryption
    if (this.config.encryption.enabled) {
      if (password) {
        this.encryption.initialize(password)
      }
      else if (this.config.encryption.enabled) {
        throw new Error('Encryption is enabled but no password provided')
      }
    }

    this.isInitialized = true
    this.emit('initialized')

    // Start auto-sync if configured
    if (this.config.autoSyncInterval > 0) {
      this.startAutoSync()
    }
  }

  /**
   * Stop the sync engine
   */
  async stop(): Promise<void> {
    this.stopAutoSync()

    if (this.remoteAdapter) {
      await this.remoteAdapter.disconnect()
    }

    this.queue.destroy()
    this.encryption.destroy()
    this.isInitialized = false
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Set the local storage adapter
   */
  setStorageAdapter(adapter: StorageAdapter): void {
    this.localAdapter = adapter
  }

  /**
   * Set the remote storage adapter
   */
  setRemoteAdapter(adapter: RemoteStorageAdapter): void {
    this.remoteAdapter = adapter
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SyncEngineV2Config>): void {
    this.config = { ...this.config, ...config }

    // Update encryption config
    if (config.encryption) {
      this.encryption.updateConfig(config.encryption)
    }

    // Update transfer config
    if (config.transfer) {
      this.transfer.updateConfig(config.transfer)
    }

    // Update queue config
    if (config.queue) {
      this.queue.updateConfig(config.queue)
    }

    // Restart auto-sync with new interval
    if (config.autoSyncInterval !== undefined) {
      this.stopAutoSync()
      if (config.autoSyncInterval > 0) {
        this.startAutoSync()
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SyncEngineV2Config {
    return { ...this.config }
  }

  // ===========================================================================
  // Sync Operations
  // ===========================================================================

  /**
   * Perform synchronization
   *
   * @param itemType - Type of items to sync (undefined = all)
   * @param options - Sync options
   */
  async sync<T = unknown>(
    itemType?: SyncItemType,
    options: {
      direction?: 'push' | 'pull' | 'bidirectional'
      onProgress?: ProgressCallback
      force?: boolean
    } = {},
  ): Promise<SyncResultV2> {
    const startTime = Date.now()

    this.ensureInitialized()
    this.ensureRemoteAdapter()

    const result: SyncResultV2 = {
      success: false,
      pushed: [],
      pulled: [],
      merged: [],
      conflicts: [],
      errors: [],
      durationMs: 0,
      timestamp: Date.now(),
    }

    this.emit('sync:start')

    try {
      const direction = options.direction || 'bidirectional'

      switch (direction) {
        case 'push':
          await this.performPush<T>(result, itemType, options.onProgress)
          break
        case 'pull':
          await this.performPull<T>(result, itemType, options.onProgress)
          break
        case 'bidirectional':
          await this.performBidirectionalSync<T>(result, itemType, options.onProgress)
          break
      }

      result.success = result.errors.length === 0
    }
    catch (error) {
      result.errors.push({
        code: 'SYNC_ERROR',
        message: error instanceof Error ? error.message : String(error),
      })
    }

    result.durationMs = Date.now() - startTime
    this.emit('sync:complete', result)

    return result
  }

  /**
   * Push local changes to remote
   */
  private async performPush<T>(
    result: SyncResultV2,
    itemType?: SyncItemType,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    const localItems: SyncItemV2<T>[] = itemType
      ? (await this.localAdapter.getAll(itemType) as SyncItemV2<T>[])
      : await this.getAllLocalItems<T>()

    for (const item of localItems) {
      try {
        await this.pushItem<T>(item, onProgress)
        result.pushed.push(item)
      }
      catch (error) {
        result.errors.push({
          code: 'PUSH_ERROR',
          message: error instanceof Error ? error.message : String(error),
          itemId: item.id,
        })
      }
    }
  }

  /**
   * Pull remote changes to local
   */
  private async performPull<T>(
    result: SyncResultV2,
    itemType?: SyncItemType,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    this.ensureRemoteAdapter()

    const remoteItems: SyncItemV2<T>[] = itemType
      ? (await this.remoteAdapter!.list(itemType) as SyncItemV2<T>[])
      : (await this.remoteAdapter!.list() as SyncItemV2<T>[])

    for (const item of remoteItems) {
      try {
        await this.pullItem<T>(item, onProgress)
        result.pulled.push(item)
      }
      catch (error) {
        result.errors.push({
          code: 'PULL_ERROR',
          message: error instanceof Error ? error.message : String(error),
          itemId: item.id,
        })
      }
    }
  }

  /**
   * Perform bidirectional sync with CRDT merge
   */
  private async performBidirectionalSync<T>(
    result: SyncResultV2,
    itemType?: SyncItemType,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    this.ensureRemoteAdapter()

    // Get local and remote items
    const localItems = itemType
      ? (await this.localAdapter.getAll(itemType) as SyncItemV2<T>[])
      : await this.getAllLocalItems<T>()
    const localMap = new Map(localItems.map(item => [item.id, item]))

    const remoteItems: SyncItemV2<T>[] = itemType
      ? (await this.remoteAdapter!.list(itemType) as SyncItemV2<T>[])
      : (await this.remoteAdapter!.list() as SyncItemV2<T>[])
    const remoteMap = new Map(remoteItems.map(item => [item.id, item]))

    // Find items that need sync
    const allIds = new Set([...localMap.keys(), ...remoteMap.keys()])

    for (const id of allIds) {
      const local = localMap.get(id)
      const remote = remoteMap.get(id)

      if (!local) {
        // Remote-only - pull
        if (remote) {
          await this.pullItem<T>(remote, onProgress)
          result.pulled.push(remote)
        }
      }
      else if (!remote) {
        // Local-only - push
        await this.pushItem<T>(local, onProgress)
        result.pushed.push(local)
      }
      else {
        // Both exist - merge
        const mergeResult = await this.mergeItems<T>(local, remote)

        if (mergeResult.type === 'merged' && mergeResult.item) {
          await this.pushItem<T>(mergeResult.item, onProgress)
          await this.localAdapter.save(mergeResult.item)
          result.merged.push(mergeResult.item)
          this.emit('sync:merged', mergeResult.item)
        }
        else if (mergeResult.type === 'conflict') {
          result.conflicts.push({
            itemId: id,
            local,
            remote,
            reason: mergeResult.reason ?? 'Unknown conflict',
          })
          this.emit('sync:conflict', { itemId: id, local, remote })
        }
        else if (mergeResult.type === 'local') {
          // Local wins - push
          await this.pushItem<T>(local, onProgress)
          result.pushed.push(local)
        }
        else if (mergeResult.type === 'remote') {
          // Remote wins - pull
          await this.pullItem<T>(remote, onProgress)
          result.pulled.push(remote)
        }
      }
    }
  }

  // ===========================================================================
  // Item Operations
  // ===========================================================================

  /**
   * Push an item to remote storage
   */
  private async pushItem<T>(
    item: SyncItemV2<T>,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    this.ensureRemoteAdapter()

    // Encrypt if enabled
    let contentToPush: Buffer
    if (this.config.encryption.enabled && this.encryption.isReady()) {
      const encrypted = this.encryption.encrypt(JSON.stringify(item.content))
      contentToPush = Buffer.from(JSON.stringify(encrypted))
    }
    else {
      contentToPush = Buffer.from(JSON.stringify(item.content))
    }

    // Upload in chunks if large
    if (contentToPush.length > this.config.transfer.chunkSize) {
      const chunks = Math.ceil(contentToPush.length / this.config.transfer.chunkSize)

      for (let i = 0; i < chunks; i++) {
        const start = i * this.config.transfer.chunkSize
        const end = Math.min(start + this.config.transfer.chunkSize, contentToPush.length)
        const chunk = contentToPush.subarray(start, end)

        await this.remoteAdapter!.uploadChunk(item.id, i, chunk)

        if (onProgress) {
          const progress: TransferProgress = {
            transferId: `push-${item.id}`,
            itemId: item.id,
            direction: 'upload',
            bytesTransferred: end,
            totalBytes: contentToPush.length,
            percentage: Math.round((end / contentToPush.length) * 100),
            speed: 0,
            eta: 0,
            currentChunk: i,
            totalChunks: chunks,
          }
          onProgress(progress)
        }
      }

      // Upload metadata
      await this.remoteAdapter!.uploadMetadata(item.id, item)
    }
    else {
      await this.remoteAdapter!.uploadMetadata(item.id, item)
    }
  }

  /**
   * Pull an item from remote storage
   */
  private async pullItem<T>(
    item: SyncItemV2<T>,
    _onProgress?: ProgressCallback,
  ): Promise<void> {
    // Save to local storage
    await this.localAdapter.save(item)
  }

  /**
   * Merge two items using CRDT
   */
  private async mergeItems<T>(
    local: SyncItemV2<T>,
    remote: SyncItemV2<T>,
  ): Promise<{
    type: 'local' | 'remote' | 'merged' | 'conflict'
    item?: SyncItemV2<T>
    reason?: string
  }> {
    // Compare timestamps
    const localTime = local.updatedAt
    const remoteTime = remote.updatedAt

    if (local.crdt.timestamp === remote.crdt.timestamp) {
      // Same timestamp - check content hash
      if (local.contentHash === remote.contentHash) {
        return { type: 'local' } // Same content, keep local
      }

      // Conflict - needs manual resolution
      return {
        type: 'conflict',
        reason: 'Concurrent modifications with same timestamp',
      }
    }

    if (localTime > remoteTime) {
      return { type: 'local' }
    }
    else if (remoteTime > localTime) {
      return { type: 'remote' }
    }

    // Use CRDT merge if available
    if (local.crdt && remote.crdt) {
      return this.mergeCRDT(local, remote)
    }

    return { type: 'local' }
  }

  /**
   * Merge items using CRDT
   */
  private mergeCRDT<T>(
    local: SyncItemV2<T>,
    remote: SyncItemV2<T>,
  ): { type: 'local' | 'remote' | 'merged', item?: SyncItemV2<T> } {
    const localVC = local.crdt.vectorClock
    const remoteVC = remote.crdt.vectorClock

    // Check if one is causally newer
    const localIsNewer = this.isVectorClockGreater(localVC, remoteVC)
    const remoteIsNewer = this.isVectorClockGreater(remoteVC, localVC)

    if (localIsNewer && !remoteIsNewer) {
      return { type: 'local' }
    }
    if (remoteIsNewer && !localIsNewer) {
      return { type: 'remote' }
    }

    // Concurrent updates - attempt merge
    const merged = this.mergeContent(local, remote)
    if (merged) {
      return { type: 'merged', item: merged }
    }

    return { type: 'local' }
  }

  /**
   * Compare vector clocks
   */
  private isVectorClockGreater(
    a: Record<string, Timestamp>,
    b: Record<string, Timestamp>,
  ): boolean {
    let greater = false
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)])

    for (const key of allKeys) {
      const aVal = a[key] || 0
      const bVal = b[key] || 0

      if (aVal < bVal) {
        return false
      }
      if (aVal > bVal) {
        greater = true
      }
    }

    return greater
  }

  /**
   * Merge content based on type
   */
  private mergeContent<T>(local: SyncItemV2<T>, remote: SyncItemV2<T>): SyncItemV2<T> | null {
    // For different CRDT types, use appropriate merge
    switch (local.crdt.type) {
      case 'lww-register': {
        // Last write wins
        const winner = local.crdt.timestamp > remote.crdt.timestamp ? local : remote
        return { ...winner }
      }

      case 'g-counter': {
        // G-Counter: sum
        const localState = local.crdt.state as { counts: Record<string, number> }
        const remoteState = remote.crdt.state as { counts: Record<string, number> }

        const mergedCounts: Record<string, number> = {}
        for (const key of Object.keys({ ...localState.counts, ...remoteState.counts })) {
          mergedCounts[key] = Math.max(
            localState.counts[key] || 0,
            remoteState.counts[key] || 0,
          )
        }

        return {
          ...local,
          crdt: {
            ...local.crdt,
            state: { counts: mergedCounts },
            value: Object.values(mergedCounts).reduce((a, b) => a + b, 0) as T,
          },
        }
      }

      case 'or-set': {
        // OR-Set: union
        const localState = local.crdt.state as { elements: Array<{ key: string, value: T }> }
        const remoteState = remote.crdt.state as { elements: Array<{ key: string, value: T }> }

        const mergedElements = [...localState.elements]
        for (const elem of remoteState.elements) {
          if (!mergedElements.find(e => e.key === elem.key)) {
            mergedElements.push(elem)
          }
        }

        return {
          ...local,
          crdt: {
            ...local.crdt,
            state: { elements: mergedElements },
            value: mergedElements.map(e => e.value) as T,
          },
        }
      }

      default:
        return null
    }
  }

  // ===========================================================================
  // Queue Management
  // ===========================================================================

  /**
   * Queue an operation for offline sync
   */
  queueOperation(params: {
    type: OperationType
    itemType: SyncItemType
    itemId: string
    payload: unknown
  }): QueuedOperation {
    return this.queue.enqueue(params)
  }

  /**
   * Process queued operations
   */
  async processQueue(): Promise<void> {
    await this.queue.process(async (operation) => {
      // Process the operation
      switch (operation.type) {
        case 'create':
        case 'update': {
          const item = await this.localAdapter.get(operation.itemId)
          if (item) {
            await this.pushItem(item)
          }
          break
        }
        case 'delete': {
          if (this.remoteAdapter) {
            await this.remoteAdapter.delete(operation.itemId)
          }
          break
        }
      }
    })
  }

  /**
   * Get queue state
   */
  getQueueState() {
    return this.queue.getState()
  }

  // ===========================================================================
  // Auto-Sync
  // ===========================================================================

  /**
   * Start auto-sync timer
   */
  private startAutoSync(): void {
    if (this.autoSyncTimer) {
      return
    }

    this.autoSyncTimer = setInterval(async () => {
      if (this.queue.isOnline()) {
        await this.sync()
      }
    }, this.config.autoSyncInterval)
  }

  /**
   * Stop auto-sync timer
   */
  private stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer)
      this.autoSyncTimer = null
    }
  }

  // ===========================================================================
  // Network Status
  // ===========================================================================

  /**
   * Set network status
   */
  setNetworkStatus(status: 'online' | 'offline'): void {
    this.queue.setNetworkStatus(status)
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.queue.isOnline()
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Get all local items
   */
  private async getAllLocalItems<T>(): Promise<SyncItemV2<T>[]> {
    const types: SyncItemType[] = ['skill', 'workflow', 'config', 'plugin', 'template']
    const items: SyncItemV2<T>[] = []

    for (const type of types) {
      const typeItems = await this.localAdapter.getAll(type) as SyncItemV2<T>[]
      items.push(...typeItems)
    }

    return items
  }

  /**
   * Ensure engine is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('SyncEngine not initialized. Call initialize() first.')
    }
  }

  /**
   * Ensure remote adapter is set
   */
  private ensureRemoteAdapter(): void {
    if (!this.remoteAdapter) {
      throw new Error('Remote storage adapter not set. Call setRemoteAdapter() first.')
    }
  }

  /**
   * Setup queue event forwarding
   */
  private setupQueueEventForwarding(): void {
    this.queue.on('queue:processing', () => this.emit('queue:processing'))
    this.queue.on('queue:idle', () => this.emit('queue:idle'))
    this.queue.on('network:online', () => this.emit('network:online'))
    this.queue.on('network:offline', () => this.emit('network:offline'))
  }

  /**
   * Create a sync item with CRDT metadata
   */
  createSyncItem<T>(params: {
    id?: string
    type: SyncItemType
    name: string
    content: T
  }): SyncItemV2<T> {
    const now = Date.now()
    const id = params.id || randomUUID()
    const contentJson = JSON.stringify(params.content)
    const contentHash = Buffer.from(contentJson).toString('base64')

    // Create basic CRDT state
    const crdt: CRDTSnapshot<T> = {
      type: 'lww-register',
      value: params.content,
      nodeId: this.nodeId,
      timestamp: now,
      vectorClock: { [this.nodeId]: now },
      state: { value: params.content, timestamp: now, nodeId: this.nodeId },
    }

    return {
      id,
      type: params.type,
      name: params.name,
      content: params.content,
      contentHash,
      version: 1,
      createdAt: now,
      updatedAt: now,
      modifiedBy: this.nodeId,
      crdt,
      encrypted: this.config.encryption.enabled,
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a sync engine v2 instance
 */
export function createSyncEngineV2(
  nodeId: string,
  config?: Partial<SyncEngineV2Config>,
): SyncEngineV2 {
  return new SyncEngineV2(nodeId, config)
}

/**
 * Create a sync engine v2 with full config
 */
export function createSyncEngineV2WithConfig(
  config: Partial<SyncEngineV2Config>,
): SyncEngineV2 {
  return new SyncEngineV2(config)
}

// ============================================================================
// Re-exports
// ============================================================================

export { InMemoryStorage }
