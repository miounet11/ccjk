import type { CloudAdapter } from './adapters/index'
/**
 * Cloud Sync Engine
 *
 * Core synchronization engine for CCJK cloud sync functionality.
 * Manages bidirectional sync between local and remote storage with
 * conflict resolution, retry logic, and progress tracking.
 *
 * @module cloud-sync/sync-engine
 */

import type {
  ConflictStrategy,
  SyncableItem,
  SyncableItemType,
  SyncConfig,
  SyncConflict,
  SyncError,
  SyncErrorCode,
  SyncEvents,
  SyncQueueItem,
  SyncQueueState,
  SyncResult,
  SyncState,
  SyncStats,
  SyncStatus,
} from './types'
import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { createAdapter } from './adapters/index'
import { DEFAULT_SYNC_CONFIG, INITIAL_SYNC_STATE } from './types'

// ============================================================================
// Event Emitter Implementation
// ============================================================================

type EventCallback = (...args: any[]) => void

/**
 * Simple typed event emitter for sync events
 */
class SyncEventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map()

  on<K extends keyof SyncEvents>(event: K, callback: SyncEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback as EventCallback)
  }

  off<K extends keyof SyncEvents>(event: K, callback: SyncEvents[K]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback as EventCallback)
    }
  }

  emit<K extends keyof SyncEvents>(event: K, ...args: Parameters<SyncEvents[K]>): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(...args)
        }
        catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  removeAllListeners(event?: keyof SyncEvents): void {
    if (event) {
      this.listeners.delete(event)
    }
    else {
      this.listeners.clear()
    }
  }
}

// ============================================================================
// Sync Engine Options
// ============================================================================

/**
 * Options for sync operations
 */
export interface SyncOptions {
  /** Force sync even if no changes detected */
  force?: boolean
  /** Specific item types to sync */
  itemTypes?: SyncableItemType[]
  /** Override conflict strategy for this sync */
  conflictStrategy?: ConflictStrategy
  /** Batch size for sync operations */
  batchSize?: number
  /** Enable delta sync optimization */
  deltaSync?: boolean
}

/**
 * Default sync options
 */
const DEFAULT_SYNC_OPTIONS: Required<SyncOptions> = {
  force: false,
  itemTypes: ['skills', 'workflows', 'settings', 'mcp-configs'],
  conflictStrategy: 'newest-wins',
  batchSize: 10,
  deltaSync: true,
}

// ============================================================================
// Sync Engine Class
// ============================================================================

/**
 * Core synchronization engine for cloud sync operations
 *
 * Manages the complete sync lifecycle including initialization, bidirectional
 * sync, conflict resolution, and progress tracking.
 *
 * @example
 * ```typescript
 * const engine = new SyncEngine(config)
 * await engine.initialize()
 *
 * engine.on('sync:progress', (progress, item) => {
 *   console.log(`Syncing ${item}: ${progress}%`)
 * })
 *
 * const result = await engine.sync()
 * console.log(`Synced ${result.pushed.length} items`)
 * ```
 */
export class SyncEngine {
  // Configuration
  private config: SyncConfig
  private options: Required<SyncOptions>

  // State management
  private state: SyncState
  private queue: SyncQueueState

  // Adapter
  private adapter: CloudAdapter | null = null

  // Event emitter
  private emitter: SyncEventEmitter

  // Auto-sync timer
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null

  // Pause state
  private isPaused: boolean = false
  private pausePromise: Promise<void> | null = null
  private pauseResolve: (() => void) | null = null

  // Local items cache
  private localItemsCache: Map<string, SyncableItem> = new Map()

  /**
   * Create a new SyncEngine instance
   *
   * @param config - Sync configuration
   * @param options - Sync options
   */
  constructor(config: Partial<SyncConfig> = {}, options: SyncOptions = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config }
    this.options = { ...DEFAULT_SYNC_OPTIONS, ...options }
    this.state = { ...INITIAL_SYNC_STATE }
    this.queue = {
      items: [],
      isProcessing: false,
      currentItem: null,
    }
    this.emitter = new SyncEventEmitter()
  }

  // ===========================================================================
  // Lifecycle Methods
  // ===========================================================================

  /**
   * Initialize the sync engine and connect to cloud provider
   *
   * @throws SyncError if initialization fails
   */
  async initialize(): Promise<void> {
    try {
      this.updateState({ status: 'syncing' })

      // Create and connect adapter
      const providerType = this.config.provider.type === 'custom'
        ? 'local' // Fallback for custom
        : this.config.provider.type === 's3'
          ? 'webdav' // S3 not yet implemented, fallback
          : this.config.provider.type

      this.adapter = await createAdapter(providerType as any, {
        provider: providerType,
        ...this.config.provider.credentials,
        ...this.config.provider.options,
      } as any)

      // Calculate initial local state hash
      const localHash = await this.calculateLocalStateHash()
      this.updateState({
        status: 'idle',
        localStateHash: localHash,
      })

      // Start auto-sync if configured
      if (this.config.autoSyncInterval > 0) {
        this.startAutoSync()
      }
    }
    catch (error) {
      const syncError = this.createSyncError(error, 'PROVIDER_ERROR')
      this.updateState({
        status: 'error',
        lastError: syncError.message,
      })
      throw syncError
    }
  }

  /**
   * Stop the sync engine and cleanup resources
   */
  async stop(): Promise<void> {
    // Stop auto-sync
    this.stopAutoSync()

    // Cancel any pending operations
    this.isPaused = false
    if (this.pauseResolve) {
      this.pauseResolve()
      this.pauseResolve = null
      this.pausePromise = null
    }

    // Disconnect adapter
    if (this.adapter) {
      await this.adapter.disconnect()
      this.adapter = null
    }

    // Reset state
    this.updateState({
      status: 'idle',
      progress: 0,
      currentItems: [],
    })

    // Clear event listeners
    this.emitter.removeAllListeners()
  }

  /**
   * Pause sync operations
   */
  pause(): void {
    if (!this.isPaused) {
      this.isPaused = true
      this.pausePromise = new Promise((resolve) => {
        this.pauseResolve = resolve
      })
    }
  }

  /**
   * Resume sync operations
   */
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false
      if (this.pauseResolve) {
        this.pauseResolve()
        this.pauseResolve = null
        this.pausePromise = null
      }
    }
  }

  /**
   * Check if engine is paused
   */
  get paused(): boolean {
    return this.isPaused
  }

  // ===========================================================================
  // Main Sync Methods
  // ===========================================================================

  /**
   * Perform a full sync operation
   *
   * @param options - Override options for this sync
   * @returns Sync result with details
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const mergedOptions = { ...this.options, ...options }
    const startTime = Date.now()
    const startedAt = new Date().toISOString()

    const result: SyncResult = {
      success: false,
      direction: this.config.direction,
      pushed: [],
      pulled: [],
      conflicts: [],
      errors: [],
      durationMs: 0,
      startedAt,
      completedAt: '',
    }

    try {
      this.ensureInitialized()
      this.updateState({ status: 'syncing', progress: 0, currentItems: [] })
      this.emitter.emit('sync:start', this.config.direction, mergedOptions.itemTypes!)

      // Wait if paused
      await this.waitIfPaused()

      // Perform sync based on direction
      switch (this.config.direction) {
        case 'push':
          await this.performPush(result, mergedOptions)
          break
        case 'pull':
          await this.performPull(result, mergedOptions)
          break
        case 'bidirectional':
          await this.performBidirectionalSync(result, mergedOptions)
          break
      }

      // Update state on success
      result.success = result.errors.length === 0
      const completedAt = new Date().toISOString()
      result.completedAt = completedAt
      result.durationMs = Date.now() - startTime

      this.updateState({
        status: result.conflicts.length > 0 ? 'conflict' : 'idle',
        lastSyncAt: completedAt,
        lastError: null,
        progress: 100,
        currentItems: [],
        conflicts: result.conflicts,
        stats: this.updateStats(result),
      })

      this.emitter.emit('sync:complete', result)
    }
    catch (error) {
      const syncError = this.createSyncError(error, 'UNKNOWN_ERROR')
      result.errors.push(syncError)
      result.completedAt = new Date().toISOString()
      result.durationMs = Date.now() - startTime

      this.updateState({
        status: 'error',
        lastError: syncError.message,
        progress: 0,
        currentItems: [],
      })

      this.emitter.emit('sync:error', syncError)
    }

    return result
  }

  /**
   * Push local changes to remote
   *
   * @param options - Sync options
   * @returns Sync result
   */
  async push(options: SyncOptions = {}): Promise<SyncResult> {
    return this.sync({ ...options, ...{ direction: 'push' } } as any)
  }

  /**
   * Pull remote changes to local
   *
   * @param options - Sync options
   * @returns Sync result
   */
  async pull(options: SyncOptions = {}): Promise<SyncResult> {
    return this.sync({ ...options, ...{ direction: 'pull' } } as any)
  }

  // ===========================================================================
  // Sync Implementation Methods
  // ===========================================================================

  /**
   * Perform push operation (local -> remote)
   */
  private async performPush(
    result: SyncResult,
    options: Required<SyncOptions>,
  ): Promise<void> {
    const localItems = await this.getLocalItems(options.itemTypes)
    const totalItems = localItems.length
    let processedItems = 0

    // Process in batches
    const batches = this.createBatches(localItems, options.batchSize)

    for (const batch of batches) {
      await this.waitIfPaused()

      for (const item of batch) {
        try {
          this.updateState({
            progress: Math.round((processedItems / totalItems) * 100),
            currentItems: [item.id],
          })
          this.emitter.emit('sync:progress', this.state.progress, item.name)

          await this.pushItem(item)
          result.pushed.push(item)
          this.emitter.emit('sync:pushed', item)
        }
        catch (error) {
          const syncError = this.createSyncError(error, 'PROVIDER_ERROR', item.id)
          result.errors.push(syncError)
        }

        processedItems++
      }
    }
  }

  /**
   * Perform pull operation (remote -> local)
   */
  private async performPull(
    result: SyncResult,
    options: Required<SyncOptions>,
  ): Promise<void> {
    const remoteItems = await this.getRemoteItems(options.itemTypes)
    const totalItems = remoteItems.length
    let processedItems = 0

    // Process in batches
    const batches = this.createBatches(remoteItems, options.batchSize)

    for (const batch of batches) {
      await this.waitIfPaused()

      for (const item of batch) {
        try {
          this.updateState({
            progress: Math.round((processedItems / totalItems) * 100),
            currentItems: [item.id],
          })
          this.emitter.emit('sync:progress', this.state.progress, item.name)

          await this.pullItem(item)
          result.pulled.push(item)
          this.emitter.emit('sync:pulled', item)
        }
        catch (error) {
          const syncError = this.createSyncError(error, 'PROVIDER_ERROR', item.id)
          result.errors.push(syncError)
        }

        processedItems++
      }
    }
  }

  /**
   * Perform bidirectional sync with conflict detection
   */
  private async performBidirectionalSync(
    result: SyncResult,
    options: Required<SyncOptions>,
  ): Promise<void> {
    // Get local and remote items
    const localItems = await this.getLocalItems(options.itemTypes)
    const remoteItems = await this.getRemoteItems(options.itemTypes)

    // Build maps for comparison
    const localMap = new Map(localItems.map(item => [item.id, item]))
    const remoteMap = new Map(remoteItems.map(item => [item.id, item]))

    // Detect changes
    const changes = this.detectChanges(localMap, remoteMap, options.deltaSync)

    const totalOperations = changes.toPush.length + changes.toPull.length + changes.conflicts.length
    let processedOperations = 0

    // Handle conflicts first
    for (const conflict of changes.conflicts) {
      await this.waitIfPaused()

      const resolution = await this.resolveConflict(conflict, options.conflictStrategy)

      if (resolution === 'local') {
        changes.toPush.push(conflict.localItem)
      }
      else if (resolution === 'remote') {
        changes.toPull.push(conflict.remoteItem)
      }
      else {
        // Manual resolution required
        result.conflicts.push(conflict)
        this.emitter.emit('sync:conflict', conflict)
      }

      processedOperations++
      this.updateState({
        progress: Math.round((processedOperations / totalOperations) * 100),
      })
    }

    // Push local changes
    for (const item of changes.toPush) {
      await this.waitIfPaused()

      try {
        this.updateState({
          progress: Math.round((processedOperations / totalOperations) * 100),
          currentItems: [item.id],
        })
        this.emitter.emit('sync:progress', this.state.progress, item.name)

        await this.pushItem(item)
        result.pushed.push(item)
        this.emitter.emit('sync:pushed', item)
      }
      catch (error) {
        const syncError = this.createSyncError(error, 'PROVIDER_ERROR', item.id)
        result.errors.push(syncError)
      }

      processedOperations++
    }

    // Pull remote changes
    for (const item of changes.toPull) {
      await this.waitIfPaused()

      try {
        this.updateState({
          progress: Math.round((processedOperations / totalOperations) * 100),
          currentItems: [item.id],
        })
        this.emitter.emit('sync:progress', this.state.progress, item.name)

        await this.pullItem(item)
        result.pulled.push(item)
        this.emitter.emit('sync:pulled', item)
      }
      catch (error) {
        const syncError = this.createSyncError(error, 'PROVIDER_ERROR', item.id)
        result.errors.push(syncError)
      }

      processedOperations++
    }

    // Handle deletions
    for (const itemId of changes.toDeleteRemote) {
      await this.waitIfPaused()
      try {
        await this.deleteRemoteItem(itemId)
      }
      catch (error) {
        const syncError = this.createSyncError(error, 'PROVIDER_ERROR', itemId)
        result.errors.push(syncError)
      }
    }

    for (const itemId of changes.toDeleteLocal) {
      await this.waitIfPaused()
      try {
        await this.deleteLocalItem(itemId)
      }
      catch (error) {
        const syncError = this.createSyncError(error, 'PROVIDER_ERROR', itemId)
        result.errors.push(syncError)
      }
    }
  }

  // ===========================================================================
  // Change Detection
  // ===========================================================================

  /**
   * Detect changes between local and remote items
   */
  private detectChanges(
    localMap: Map<string, SyncableItem>,
    remoteMap: Map<string, SyncableItem>,
    deltaSync: boolean,
  ): {
    toPush: SyncableItem[]
    toPull: SyncableItem[]
    conflicts: SyncConflict[]
    toDeleteLocal: string[]
    toDeleteRemote: string[]
  } {
    const toPush: SyncableItem[] = []
    const toPull: SyncableItem[] = []
    const conflicts: SyncConflict[] = []
    const toDeleteLocal: string[] = []
    const toDeleteRemote: string[] = []

    // Check local items
    for (const [id, localItem] of localMap) {
      const remoteItem = remoteMap.get(id)

      if (!remoteItem) {
        // New local item - push to remote
        toPush.push(localItem)
      }
      else if (deltaSync && localItem.contentHash === remoteItem.contentHash) {
        // No changes - skip
        continue
      }
      else {
        // Both exist - check for conflicts
        const localTime = new Date(localItem.lastModified).getTime()
        const remoteTime = new Date(remoteItem.lastModified).getTime()

        if (localItem.contentHash !== remoteItem.contentHash) {
          // Content differs - potential conflict
          if (Math.abs(localTime - remoteTime) < 1000) {
            // Modified at nearly the same time - conflict
            conflicts.push(this.createConflict(localItem, remoteItem))
          }
          else if (localTime > remoteTime) {
            // Local is newer
            toPush.push(localItem)
          }
          else {
            // Remote is newer
            toPull.push(remoteItem)
          }
        }
      }
    }

    // Check for remote-only items (new remote items)
    for (const [id, remoteItem] of remoteMap) {
      if (!localMap.has(id)) {
        toPull.push(remoteItem)
      }
    }

    return { toPush, toPull, conflicts, toDeleteLocal, toDeleteRemote }
  }

  // ===========================================================================
  // Conflict Resolution
  // ===========================================================================

  /**
   * Create a conflict object
   */
  private createConflict(localItem: SyncableItem, remoteItem: SyncableItem): SyncConflict {
    return {
      id: randomUUID(),
      itemId: localItem.id,
      itemType: localItem.type,
      localItem,
      remoteItem,
      localChange: {
        id: randomUUID(),
        type: 'update',
        item: localItem,
        timestamp: localItem.lastModified,
        source: 'local',
      },
      remoteChange: {
        id: randomUUID(),
        type: 'update',
        item: remoteItem,
        timestamp: remoteItem.lastModified,
        source: 'remote',
      },
      detectedAt: new Date().toISOString(),
      resolved: false,
    }
  }

  /**
   * Resolve a conflict based on strategy
   */
  private async resolveConflict(
    conflict: SyncConflict,
    strategy: ConflictStrategy,
  ): Promise<'local' | 'remote' | 'manual'> {
    switch (strategy) {
      case 'local-wins':
        conflict.resolved = true
        conflict.resolution = 'local'
        this.emitter.emit('sync:conflict-resolved', conflict, 'local')
        return 'local'

      case 'remote-wins':
        conflict.resolved = true
        conflict.resolution = 'remote'
        this.emitter.emit('sync:conflict-resolved', conflict, 'remote')
        return 'remote'

      case 'newest-wins': {
        const localTime = new Date(conflict.localItem.lastModified).getTime()
        const remoteTime = new Date(conflict.remoteItem.lastModified).getTime()
        const winner = localTime >= remoteTime ? 'local' : 'remote'
        conflict.resolved = true
        conflict.resolution = winner
        this.emitter.emit('sync:conflict-resolved', conflict, winner)
        return winner
      }

      case 'manual':
      default:
        return 'manual'
    }
  }

  /**
   * Manually resolve a conflict
   *
   * @param conflictId - ID of the conflict to resolve
   * @param resolution - Resolution choice
   */
  async resolveConflictManually(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merged',
    mergedItem?: SyncableItem,
  ): Promise<void> {
    const conflict = this.state.conflicts.find(c => c.id === conflictId)
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`)
    }

    conflict.resolved = true
    conflict.resolution = resolution

    if (resolution === 'local') {
      await this.pushItem(conflict.localItem)
    }
    else if (resolution === 'remote') {
      await this.pullItem(conflict.remoteItem)
    }
    else if (resolution === 'merged' && mergedItem) {
      await this.pushItem(mergedItem)
      await this.saveLocalItem(mergedItem)
    }

    // Remove from conflicts list
    this.updateState({
      conflicts: this.state.conflicts.filter(c => c.id !== conflictId),
      status: this.state.conflicts.length <= 1 ? 'idle' : 'conflict',
    })

    this.emitter.emit('sync:conflict-resolved', conflict, resolution)
  }

  // ===========================================================================
  // Item Operations
  // ===========================================================================

  /**
   * Push a single item to remote
   */
  private async pushItem(item: SyncableItem): Promise<void> {
    this.ensureInitialized()

    const key = this.getItemKey(item)
    const data = Buffer.from(JSON.stringify(item), 'utf-8')

    await this.withRetry(async () => {
      await this.adapter!.upload(key, data, {
        type: item.type,
        version: item.version,
        contentHash: item.contentHash,
      })
    })
  }

  /**
   * Pull a single item from remote
   */
  private async pullItem(item: SyncableItem): Promise<void> {
    this.ensureInitialized()

    // Save to local storage
    await this.saveLocalItem(item)
  }

  /**
   * Delete an item from remote
   */
  private async deleteRemoteItem(itemId: string): Promise<void> {
    this.ensureInitialized()

    // Find item type from cache or try all types
    const cachedItem = this.localItemsCache.get(itemId)
    if (cachedItem) {
      const key = this.getItemKey(cachedItem)
      await this.withRetry(async () => {
        await this.adapter!.delete(key)
      })
    }
  }

  /**
   * Delete an item from local storage
   */
  private async deleteLocalItem(itemId: string): Promise<void> {
    this.localItemsCache.delete(itemId)
    // Actual file deletion would be implemented based on item type
  }

  /**
   * Save an item to local storage
   */
  private async saveLocalItem(item: SyncableItem): Promise<void> {
    this.localItemsCache.set(item.id, item)
    // Actual file saving would be implemented based on item type
  }

  /**
   * Get the storage key for an item
   */
  private getItemKey(item: SyncableItem): string {
    return `${item.type}/${item.id}.json`
  }

  // ===========================================================================
  // Data Retrieval Methods
  // ===========================================================================

  /**
   * Get local items by type
   */
  private async getLocalItems(types: SyncableItemType[]): Promise<SyncableItem[]> {
    // Return cached items filtered by type
    const items: SyncableItem[] = []
    for (const item of this.localItemsCache.values()) {
      if (types.includes(item.type)) {
        items.push(item)
      }
    }
    return items
  }

  /**
   * Get remote items by type
   */
  private async getRemoteItems(types: SyncableItemType[]): Promise<SyncableItem[]> {
    this.ensureInitialized()

    const items: SyncableItem[] = []

    for (const type of types) {
      const remoteList = await this.adapter!.list(`${type}/`)

      for (const remoteItem of remoteList) {
        try {
          const result = await this.adapter!.download(remoteItem.key)
          const item = JSON.parse(result.data.toString('utf-8')) as SyncableItem
          items.push(item)
        }
        catch (error) {
          // Skip invalid items
          if (this.config.verbose) {
            console.warn(`Failed to parse remote item: ${remoteItem.key}`, error)
          }
        }
      }
    }

    return items
  }

  // ===========================================================================
  // Retry Logic
  // ===========================================================================

  /**
   * Execute operation with exponential backoff retry
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries,
    baseDelay: number = this.config.retryDelayMs,
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      }
      catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < maxRetries) {
          const syncError = this.createSyncError(lastError, 'NETWORK_ERROR')
          this.emitter.emit('sync:retry', attempt, maxRetries, syncError)

          // Exponential backoff with jitter
          const delay = Math.min(
            baseDelay * 2 ** (attempt - 1) + Math.random() * 1000,
            30000,
          )
          await this.sleep(delay)
        }
      }
    }

    throw lastError
  }

  // ===========================================================================
  // Auto-Sync Management
  // ===========================================================================

  /**
   * Start auto-sync timer
   */
  private startAutoSync(): void {
    if (this.autoSyncTimer) {
      return
    }

    this.autoSyncTimer = setInterval(async () => {
      if (this.state.status === 'idle' && !this.isPaused) {
        this.emitter.emit('sync:auto-triggered')
        try {
          await this.sync()
        }
        catch (error) {
          // Auto-sync errors are logged but don't throw
          if (this.config.verbose) {
            console.error('Auto-sync failed:', error)
          }
        }
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

  /**
   * Update auto-sync interval
   *
   * @param interval - New interval in milliseconds (0 to disable)
   */
  setAutoSyncInterval(interval: number): void {
    this.config.autoSyncInterval = interval
    this.stopAutoSync()

    if (interval > 0) {
      this.startAutoSync()
    }
  }

  // ===========================================================================
  // Queue Management
  // ===========================================================================

  /**
   * Add item to sync queue
   */
  addToQueue(item: SyncableItem, operation: 'push' | 'pull' | 'delete'): void {
    const queueItem: SyncQueueItem = {
      id: randomUUID(),
      operation,
      item,
      priority: this.getItemPriority(item),
      retryCount: 0,
      queuedAt: new Date().toISOString(),
    }

    this.queue.items.push(queueItem)
    this.queue.items.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Process the sync queue
   */
  async processQueue(): Promise<void> {
    if (this.queue.isProcessing || this.queue.items.length === 0) {
      return
    }

    this.queue.isProcessing = true

    while (this.queue.items.length > 0) {
      await this.waitIfPaused()

      const queueItem = this.queue.items.shift()!
      this.queue.currentItem = queueItem

      try {
        switch (queueItem.operation) {
          case 'push':
            await this.pushItem(queueItem.item)
            break
          case 'pull':
            await this.pullItem(queueItem.item)
            break
          case 'delete':
            await this.deleteRemoteItem(queueItem.item.id)
            break
        }
      }
      catch (error) {
        queueItem.retryCount++
        queueItem.lastAttemptAt = new Date().toISOString()
        queueItem.lastError = this.createSyncError(error, 'PROVIDER_ERROR', queueItem.item.id)

        if (queueItem.retryCount < this.config.maxRetries) {
          // Re-queue with lower priority
          queueItem.priority += 10
          this.queue.items.push(queueItem)
          this.queue.items.sort((a, b) => a.priority - b.priority)
        }
      }
    }

    this.queue.isProcessing = false
    this.queue.currentItem = null
  }

  /**
   * Get priority for an item (lower = higher priority)
   */
  private getItemPriority(item: SyncableItem): number {
    const priorities: Record<SyncableItemType, number> = {
      'settings': 1,
      'mcp-configs': 2,
      'skills': 3,
      'workflows': 4,
      'memories': 5,
    }
    return priorities[item.type] || 6
  }

  /**
   * Clear the sync queue
   */
  clearQueue(): void {
    this.queue.items = []
    this.queue.currentItem = null
  }

  /**
   * Get current queue state
   */
  getQueueState(): SyncQueueState {
    return { ...this.queue }
  }

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  /**
   * Subscribe to sync events
   *
   * @param event - Event name
   * @param callback - Event callback
   */
  on<K extends keyof SyncEvents>(event: K, callback: SyncEvents[K]): void {
    this.emitter.on(event, callback)
  }

  /**
   * Unsubscribe from sync events
   *
   * @param event - Event name
   * @param callback - Event callback
   */
  off<K extends keyof SyncEvents>(event: K, callback: SyncEvents[K]): void {
    this.emitter.off(event, callback)
  }

  /**
   * Subscribe to sync event once
   *
   * @param event - Event name
   * @param callback - Event callback
   */
  once<K extends keyof SyncEvents>(event: K, callback: SyncEvents[K]): void {
    const wrapper = ((...args: any[]) => {
      this.emitter.off(event, wrapper as any)
      ;(callback as any)(...args)
    }) as SyncEvents[K]
    this.emitter.on(event, wrapper)
  }

  // ===========================================================================
  // State Management
  // ===========================================================================

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return { ...this.state }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return this.state.status
  }

  /**
   * Get sync statistics
   */
  getStats(): SyncStats {
    return { ...this.state.stats }
  }

  /**
   * Get pending conflicts
   */
  getConflicts(): SyncConflict[] {
    return [...this.state.conflicts]
  }

  /**
   * Update sync state
   */
  private updateState(updates: Partial<SyncState>): void {
    this.state = { ...this.state, ...updates }
  }

  /**
   * Update statistics from sync result
   */
  private updateStats(result: SyncResult): SyncStats {
    return {
      totalSynced: this.state.stats.totalSynced + result.pushed.length + result.pulled.length,
      pushed: this.state.stats.pushed + result.pushed.length,
      pulled: this.state.stats.pulled + result.pulled.length,
      conflictsResolved: this.state.stats.conflictsResolved
        + result.conflicts.filter(c => c.resolved).length,
      failures: this.state.stats.failures + result.errors.length,
      totalDurationMs: this.state.stats.totalDurationMs + result.durationMs,
    }
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Get current configuration
   */
  getConfig(): SyncConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   *
   * @param updates - Configuration updates
   */
  updateConfig(updates: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...updates }

    // Handle auto-sync interval changes
    if ('autoSyncInterval' in updates) {
      this.stopAutoSync()
      if (this.config.autoSyncInterval > 0) {
        this.startAutoSync()
      }
    }
  }

  /**
   * Set local items (for testing or manual population)
   *
   * @param items - Items to set
   */
  setLocalItems(items: SyncableItem[]): void {
    this.localItemsCache.clear()
    for (const item of items) {
      this.localItemsCache.set(item.id, item)
    }
  }

  /**
   * Add a local item
   *
   * @param item - Item to add
   */
  addLocalItem(item: SyncableItem): void {
    this.localItemsCache.set(item.id, item)
  }

  /**
   * Remove a local item
   *
   * @param itemId - ID of item to remove
   */
  removeLocalItem(itemId: string): void {
    this.localItemsCache.delete(itemId)
  }

  /**
   * Get a local item by ID
   *
   * @param itemId - Item ID
   */
  getLocalItem(itemId: string): SyncableItem | undefined {
    return this.localItemsCache.get(itemId)
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Ensure engine is initialized
   */
  private ensureInitialized(): void {
    if (!this.adapter) {
      throw new Error('SyncEngine not initialized. Call initialize() first.')
    }
  }

  /**
   * Wait if engine is paused
   */
  private async waitIfPaused(): Promise<void> {
    if (this.isPaused && this.pausePromise) {
      await this.pausePromise
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Calculate local state hash
   */
  private async calculateLocalStateHash(): Promise<string> {
    const items = Array.from(this.localItemsCache.values())
    const sortedItems = items.sort((a, b) => a.id.localeCompare(b.id))
    const content = JSON.stringify(sortedItems.map(i => ({
      id: i.id,
      hash: i.contentHash,
      modified: i.lastModified,
    })))
    return createHash('sha256').update(content).digest('hex')
  }

  /**
   * Create a sync error object
   */
  private createSyncError(
    error: unknown,
    code: SyncErrorCode,
    itemId?: string,
  ): SyncError {
    const message = error instanceof Error ? error.message : String(error)
    return {
      code,
      message,
      itemId,
      cause: error instanceof Error ? error : undefined,
    }
  }

  /**
   * Test connection to cloud provider
   *
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    if (!this.adapter) {
      return false
    }

    try {
      // Try to list items to verify connection
      await this.adapter.list('')
      return true
    }
    catch {
      return false
    }
  }

  /**
   * Get sync progress information
   */
  getProgress(): { progress: number, currentItems: string[] } {
    return {
      progress: this.state.progress,
      currentItems: [...this.state.currentItems],
    }
  }

  /**
   * Check if sync is in progress
   */
  isSyncing(): boolean {
    return this.state.status === 'syncing'
  }

  /**
   * Check if there are unresolved conflicts
   */
  hasConflicts(): boolean {
    return this.state.conflicts.length > 0
  }

  /**
   * Reset sync state (for recovery)
   */
  resetState(): void {
    this.state = { ...INITIAL_SYNC_STATE }
    this.queue = {
      items: [],
      isProcessing: false,
      currentItem: null,
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new SyncEngine instance with default configuration
 *
 * @param config - Optional configuration overrides
 * @returns New SyncEngine instance
 *
 * @example
 * ```typescript
 * const engine = createSyncEngine({
 *   provider: {
 *     type: 'github-gist',
 *     credentials: { token: 'ghp_xxxx' },
 *   },
 *   direction: 'bidirectional',
 * })
 *
 * await engine.initialize()
 * await engine.sync()
 * ```
 */
export function createSyncEngine(config: Partial<SyncConfig> = {}): SyncEngine {
  return new SyncEngine(config)
}

/**
 * Create a SyncEngine for GitHub Gist storage
 *
 * @param token - GitHub personal access token
 * @param options - Additional options
 * @returns Configured SyncEngine instance
 */
export function createGitHubGistSyncEngine(
  token: string,
  options: Partial<SyncConfig> = {},
): SyncEngine {
  return new SyncEngine({
    ...options,
    provider: {
      type: 'github-gist',
      credentials: { token },
      ...options.provider,
    },
  })
}

/**
 * Create a SyncEngine for WebDAV storage
 *
 * @param serverUrl - WebDAV server URL
 * @param username - WebDAV username
 * @param password - WebDAV password
 * @param options - Additional options
 * @returns Configured SyncEngine instance
 */
export function createWebDAVSyncEngine(
  serverUrl: string,
  username: string,
  password: string,
  options: Partial<SyncConfig> = {},
): SyncEngine {
  return new SyncEngine({
    ...options,
    provider: {
      type: 'webdav',
      endpoint: serverUrl,
      credentials: { username, password },
      ...options.provider,
    },
  })
}

/**
 * Create a SyncEngine for local storage (testing)
 *
 * @param baseDir - Base directory for local storage
 * @param options - Additional options
 * @returns Configured SyncEngine instance
 */
export function createLocalSyncEngine(
  baseDir: string,
  options: Partial<SyncConfig> = {},
): SyncEngine {
  return new SyncEngine({
    ...options,
    provider: {
      type: 'custom',
      endpoint: baseDir,
      credentials: {},
      options: { baseDir },
      ...options.provider,
    },
  })
}

// ============================================================================
// Exports
// ============================================================================
