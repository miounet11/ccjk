/**
 * Cloud Sync V2 - Offline Queue
 *
 * Manages operations when offline with persistence and automatic sync on reconnect.
 *
 * @module cloud-sync-v2/offline-queue
 */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type {
  CRDTSnapshot,
  OperationType,
  QueueConfig,
  QueuedOperation,
  QueueState,
  SyncItemType,
  Timestamp,
} from './types'
import { DEFAULT_QUEUE_CONFIG } from './types'

// ============================================================================
// Types
// ============================================================================

/**
 * Queue event types
 */
export interface QueueEvents {
  'operation:added': (operation: QueuedOperation) => void
  'operation:processed': (operation: QueuedOperation) => void
  'operation:failed': (operation: QueuedOperation, error: Error) => void
  'operation:retrying': (operation: QueuedOperation, attempt: number) => void
  'queue:processing': () => void
  'queue:idle': () => void
  'queue:cleared': () => void
  'network:online': () => void
  'network:offline': () => void
  'conflict:detected': (operation: QueuedOperation, existing: QueuedOperation) => void
}

/**
 * Operation processor function
 */
export type OperationProcessor = (operation: QueuedOperation) => Promise<void>

/**
 * Conflict resolver function
 */
export type ConflictResolver = (
  local: QueuedOperation,
  remote: QueuedOperation,
) => QueuedOperation | null

// ============================================================================
// Event Emitter
// ============================================================================

type EventCallback = (...args: any[]) => void

class QueueEventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map()

  on<K extends keyof QueueEvents>(event: K, callback: QueueEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback as EventCallback)
  }

  off<K extends keyof QueueEvents>(event: K, callback: QueueEvents[K]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback as EventCallback)
    }
  }

  emit<K extends keyof QueueEvents>(event: K, ...args: Parameters<QueueEvents[K]>): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(...args)
        }
        catch (error) {
          console.error(`Error in queue event listener for ${event}:`, error)
        }
      })
    }
  }

  removeAllListeners(): void {
    this.listeners.clear()
  }
}

// ============================================================================
// Offline Queue Implementation
// ============================================================================

/**
 * Offline Queue Manager
 *
 * Manages operations when offline with automatic persistence and retry.
 *
 * @example
 * ```typescript
 * const queue = new OfflineQueue({
 *   persistence: true,
 *   storageKey: 'my-app-queue',
 * })
 *
 * // Add operation
 * queue.enqueue({
 *   type: 'update',
 *   itemType: 'skill',
 *   itemId: 'skill-1',
 *   payload: { name: 'Updated Skill' },
 * })
 *
 * // Process when online
 * await queue.process(async (op) => {
 *   await api.sync(op)
 * })
 * ```
 */
export class OfflineQueue {
  private config: QueueConfig
  private state: QueueState
  private emitter: QueueEventEmitter
  private processor: OperationProcessor | null = null
  private conflictResolver: ConflictResolver | null = null
  private processingPromise: Promise<void> | null = null
  private persistPath: string | null = null

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config }
    this.emitter = new QueueEventEmitter()

    this.state = {
      pending: [],
      failed: [],
      completed: new Set(),
      isProcessing: false,
      networkStatus: 'unknown',
    }

    // Set up persistence path
    if (this.config.persistence) {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '.'
      this.persistPath = join(homeDir, '.ccjk', 'sync-queue-v2.json')
      this.loadFromDisk()
    }
  }

  // ===========================================================================
  // Queue Operations
  // ===========================================================================

  /**
   * Add an operation to the queue
   */
  enqueue(params: {
    type: OperationType
    itemType: SyncItemType
    itemId: string
    payload: unknown
    priority?: number
    dependencies?: string[]
    crdtState?: CRDTSnapshot
  }): QueuedOperation {
    // Check queue size limit
    if (this.state.pending.length >= this.config.maxSize) {
      throw new Error(`Queue is full (max: ${this.config.maxSize})`)
    }

    // Check for duplicate/conflicting operations
    const existing = this.findExistingOperation(params.itemId, params.type)
    if (existing) {
      if (this.conflictResolver) {
        const resolved = this.conflictResolver(existing, params as any)
        if (resolved) {
          // Replace existing with resolved
          const index = this.state.pending.indexOf(existing)
          if (index !== -1) {
            this.state.pending[index] = resolved
            this.persist()
            return resolved
          }
        }
      }
      this.emitter.emit('conflict:detected', params as any, existing)
    }

    const operation: QueuedOperation = {
      id: randomUUID(),
      type: params.type,
      itemType: params.itemType,
      itemId: params.itemId,
      payload: params.payload,
      createdAt: Date.now(),
      retryCount: 0,
      priority: params.priority ?? this.getDefaultPriority(params.type),
      dependencies: params.dependencies ?? [],
      crdtState: params.crdtState,
    }

    // Insert in priority order
    this.insertByPriority(operation)
    this.persist()

    this.emitter.emit('operation:added', operation)

    // Auto-process if online
    if (this.state.networkStatus === 'online' && this.processor) {
      this.process(this.processor).catch(() => {})
    }

    return operation
  }

  /**
   * Remove an operation from the queue
   */
  dequeue(operationId: string): QueuedOperation | null {
    const index = this.state.pending.findIndex(op => op.id === operationId)
    if (index === -1) {
      return null
    }

    const [operation] = this.state.pending.splice(index, 1)
    this.persist()
    return operation
  }

  /**
   * Get an operation by ID
   */
  getOperation(operationId: string): QueuedOperation | undefined {
    return this.state.pending.find(op => op.id === operationId)
      || this.state.failed.find(op => op.id === operationId)
  }

  /**
   * Get all pending operations
   */
  getPending(): QueuedOperation[] {
    return [...this.state.pending]
  }

  /**
   * Get all failed operations
   */
  getFailed(): QueuedOperation[] {
    return [...this.state.failed]
  }

  /**
   * Get operations for a specific item
   */
  getOperationsForItem(itemId: string): QueuedOperation[] {
    return this.state.pending.filter(op => op.itemId === itemId)
  }

  /**
   * Check if an operation is completed
   */
  isCompleted(operationId: string): boolean {
    return this.state.completed.has(operationId)
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.state.pending.length
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.state.pending.length === 0
  }

  /**
   * Clear all pending operations
   */
  clear(): void {
    this.state.pending = []
    this.persist()
    this.emitter.emit('queue:cleared')
  }

  /**
   * Clear failed operations
   */
  clearFailed(): void {
    this.state.failed = []
    this.persist()
  }

  /**
   * Retry failed operations
   */
  retryFailed(): void {
    for (const operation of this.state.failed) {
      operation.retryCount = 0
      operation.lastError = undefined
      this.insertByPriority(operation)
    }
    this.state.failed = []
    this.persist()
  }

  // ===========================================================================
  // Processing
  // ===========================================================================

  /**
   * Process the queue
   */
  async process(processor: OperationProcessor): Promise<void> {
    if (this.state.isProcessing) {
      return this.processingPromise!
    }

    if (this.state.networkStatus === 'offline') {
      return
    }

    this.processor = processor
    this.state.isProcessing = true
    this.emitter.emit('queue:processing')

    this.processingPromise = this.processQueue(processor)

    try {
      await this.processingPromise
    }
    finally {
      this.state.isProcessing = false
      this.processingPromise = null
      this.emitter.emit('queue:idle')
    }
  }

  /**
   * Internal queue processing
   */
  private async processQueue(processor: OperationProcessor): Promise<void> {
    while (this.state.pending.length > 0 && this.state.networkStatus !== 'offline') {
      // Get next batch
      const batch = this.getNextBatch()

      // Process batch in parallel
      await Promise.all(
        batch.map(operation => this.processOperation(operation, processor)),
      )
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(
    operation: QueuedOperation,
    processor: OperationProcessor,
  ): Promise<void> {
    // Check dependencies
    if (!this.areDependenciesMet(operation)) {
      return
    }

    try {
      await processor(operation)

      // Success - remove from queue
      this.removeFromPending(operation.id)
      this.state.completed.add(operation.id)
      this.persist()

      this.emitter.emit('operation:processed', operation)
    }
    catch (error) {
      operation.retryCount++
      operation.lastAttemptAt = Date.now()
      operation.lastError = error instanceof Error ? error.message : String(error)

      if (operation.retryCount >= this.config.maxRetries) {
        // Move to failed
        this.removeFromPending(operation.id)
        this.state.failed.push(operation)
        this.persist()

        this.emitter.emit('operation:failed', operation, error as Error)
      }
      else {
        // Retry with backoff
        this.emitter.emit('operation:retrying', operation, operation.retryCount)

        await this.sleep(this.config.retryDelay * operation.retryCount)
      }
    }
  }

  /**
   * Get next batch of operations to process
   */
  private getNextBatch(): QueuedOperation[] {
    const batch: QueuedOperation[] = []
    const seen = new Set<string>()

    for (const operation of this.state.pending) {
      if (batch.length >= this.config.batchSize) {
        break
      }

      // Skip if dependencies not met
      if (!this.areDependenciesMet(operation)) {
        continue
      }

      // Skip if same item already in batch (to avoid conflicts)
      if (seen.has(operation.itemId)) {
        continue
      }

      batch.push(operation)
      seen.add(operation.itemId)
    }

    return batch
  }

  /**
   * Check if operation dependencies are met
   */
  private areDependenciesMet(operation: QueuedOperation): boolean {
    for (const depId of operation.dependencies) {
      if (!this.state.completed.has(depId)) {
        // Check if dependency is still pending
        const pending = this.state.pending.find(op => op.id === depId)
        if (pending) {
          return false
        }
      }
    }
    return true
  }

  // ===========================================================================
  // Network Status
  // ===========================================================================

  /**
   * Set network status
   */
  setNetworkStatus(status: 'online' | 'offline'): void {
    const wasOffline = this.state.networkStatus === 'offline'
    this.state.networkStatus = status

    if (status === 'online') {
      this.emitter.emit('network:online')

      // Auto-process if we have a processor and were offline
      if (wasOffline && this.processor && !this.state.isProcessing) {
        this.process(this.processor).catch(() => {})
      }
    }
    else {
      this.emitter.emit('network:offline')
    }
  }

  /**
   * Get network status
   */
  getNetworkStatus(): 'online' | 'offline' | 'unknown' {
    return this.state.networkStatus
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.state.networkStatus === 'online'
  }

  // ===========================================================================
  // Conflict Resolution
  // ===========================================================================

  /**
   * Set conflict resolver
   */
  setConflictResolver(resolver: ConflictResolver): void {
    this.conflictResolver = resolver
  }

  /**
   * Find existing operation for same item
   */
  private findExistingOperation(
    itemId: string,
    type: OperationType,
  ): QueuedOperation | undefined {
    return this.state.pending.find(
      op => op.itemId === itemId && op.type === type,
    )
  }

  /**
   * Preview conflicts before sync
   */
  previewConflicts(remoteOperations: QueuedOperation[]): Array<{
    local: QueuedOperation
    remote: QueuedOperation
    resolution: 'local' | 'remote' | 'merge' | 'manual'
  }> {
    const conflicts: Array<{
      local: QueuedOperation
      remote: QueuedOperation
      resolution: 'local' | 'remote' | 'merge' | 'manual'
    }> = []

    for (const remote of remoteOperations) {
      const local = this.state.pending.find(op => op.itemId === remote.itemId)
      if (local) {
        let resolution: 'local' | 'remote' | 'merge' | 'manual' = 'manual'

        if (this.config.conflictStrategy === 'last-write-wins') {
          resolution = local.createdAt > remote.createdAt ? 'local' : 'remote'
        }
        else if (this.config.conflictStrategy === 'crdt' && local.crdtState && remote.crdtState) {
          resolution = 'merge'
        }

        conflicts.push({ local, remote, resolution })
      }
    }

    return conflicts
  }

  // ===========================================================================
  // Persistence
  // ===========================================================================

  /**
   * Persist queue to disk
   */
  private persist(): void {
    if (!this.config.persistence || !this.persistPath) {
      return
    }

    try {
      const data = {
        pending: this.state.pending,
        failed: this.state.failed,
        completed: Array.from(this.state.completed),
        lastSyncAt: this.state.lastSyncAt,
        version: 1,
      }

      const dir = dirname(this.persistPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      writeFileSync(this.persistPath, JSON.stringify(data, null, 2))
    }
    catch (error) {
      console.error('Failed to persist queue:', error)
    }
  }

  /**
   * Load queue from disk
   */
  private loadFromDisk(): void {
    if (!this.config.persistence || !this.persistPath) {
      return
    }

    try {
      if (!existsSync(this.persistPath)) {
        return
      }

      const content = readFileSync(this.persistPath, 'utf-8')
      const data = JSON.parse(content)

      this.state.pending = data.pending || []
      this.state.failed = data.failed || []
      this.state.completed = new Set(data.completed || [])
      this.state.lastSyncAt = data.lastSyncAt
    }
    catch (error) {
      console.error('Failed to load queue from disk:', error)
    }
  }

  /**
   * Export queue state
   */
  export(): string {
    return JSON.stringify({
      pending: this.state.pending,
      failed: this.state.failed,
      completed: Array.from(this.state.completed),
      lastSyncAt: this.state.lastSyncAt,
    })
  }

  /**
   * Import queue state
   */
  import(data: string): void {
    const parsed = JSON.parse(data)
    this.state.pending = parsed.pending || []
    this.state.failed = parsed.failed || []
    this.state.completed = new Set(parsed.completed || [])
    this.state.lastSyncAt = parsed.lastSyncAt
    this.persist()
  }

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  /**
   * Subscribe to queue events
   */
  on<K extends keyof QueueEvents>(event: K, callback: QueueEvents[K]): void {
    this.emitter.on(event, callback)
  }

  /**
   * Unsubscribe from queue events
   */
  off<K extends keyof QueueEvents>(event: K, callback: QueueEvents[K]): void {
    this.emitter.off(event, callback)
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Insert operation in priority order
   */
  private insertByPriority(operation: QueuedOperation): void {
    const index = this.state.pending.findIndex(op => op.priority > operation.priority)
    if (index === -1) {
      this.state.pending.push(operation)
    }
    else {
      this.state.pending.splice(index, 0, operation)
    }
  }

  /**
   * Remove operation from pending
   */
  private removeFromPending(operationId: string): void {
    const index = this.state.pending.findIndex(op => op.id === operationId)
    if (index !== -1) {
      this.state.pending.splice(index, 1)
    }
  }

  /**
   * Get default priority for operation type
   */
  private getDefaultPriority(type: OperationType): number {
    const priorities: Record<OperationType, number> = {
      delete: 1,
      create: 2,
      update: 3,
      merge: 4,
    }
    return priorities[type] || 5
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get queue state
   */
  getState(): QueueState {
    return {
      ...this.state,
      completed: new Set(this.state.completed),
    }
  }

  /**
   * Get configuration
   */
  getConfig(): QueueConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Destroy the queue
   */
  destroy(): void {
    this.emitter.removeAllListeners()
    this.processor = null
    this.conflictResolver = null
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an offline queue
 */
export function createOfflineQueue(config?: Partial<QueueConfig>): OfflineQueue {
  return new OfflineQueue(config)
}

/**
 * Create a CRDT-based conflict resolver
 */
export function createCRDTConflictResolver(): ConflictResolver {
  return (local, remote) => {
    // If both have CRDT state, merge them
    if (local.crdtState && remote.crdtState) {
      // Use timestamp for LWW
      if (local.crdtState.timestamp > remote.crdtState.timestamp) {
        return local
      }
      return remote
    }

    // Fallback to last-write-wins
    return local.createdAt > remote.createdAt ? local : remote
  }
}

/**
 * Create a last-write-wins conflict resolver
 */
export function createLWWConflictResolver(): ConflictResolver {
  return (local, remote) => {
    return local.createdAt > remote.createdAt ? local : remote
  }
}
