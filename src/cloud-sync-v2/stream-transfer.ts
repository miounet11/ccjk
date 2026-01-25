/**
 * Cloud Sync V2 - Stream Transfer
 *
 * Provides chunked file transfer with resume support, progress tracking,
 * and bandwidth limiting.
 *
 * @module cloud-sync-v2/stream-transfer
 */

import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, stat, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pipeline, Readable, Transform, Writable } from 'node:stream'
import { promisify } from 'node:util'
import { createGzip, createGunzip } from 'node:zlib'
import type {
  ChunkMetadata,
  ProgressCallback,
  StreamTransferConfig,
  TransferProgress,
  TransferState,
  Timestamp,
} from './types'
import { DEFAULT_TRANSFER_CONFIG } from './types'

const pipelineAsync = promisify(pipeline)

// ============================================================================
// Chunk Manager
// ============================================================================

/**
 * Split data into chunks
 */
export function* chunkData(data: Buffer, chunkSize: number): Generator<{ chunk: Buffer, index: number, offset: number }> {
  let offset = 0
  let index = 0

  while (offset < data.length) {
    const chunk = data.subarray(offset, offset + chunkSize)
    yield { chunk, index, offset }
    offset += chunkSize
    index++
  }
}

/**
 * Calculate chunk metadata
 */
export function calculateChunkMetadata(
  data: Buffer,
  chunkSize: number,
): ChunkMetadata[] {
  const chunks: ChunkMetadata[] = []
  const totalChunks = Math.ceil(data.length / chunkSize)

  for (const { chunk, index, offset } of chunkData(data, chunkSize)) {
    chunks.push({
      index,
      total: totalChunks,
      size: chunk.length,
      hash: createHash('sha256').update(chunk).digest('hex'),
      offset,
    })
  }

  return chunks
}

/**
 * Verify chunk integrity
 */
export function verifyChunk(chunk: Buffer, expectedHash: string): boolean {
  const actualHash = createHash('sha256').update(chunk).digest('hex')
  return actualHash === expectedHash
}

// ============================================================================
// Bandwidth Limiter
// ============================================================================

/**
 * Create a bandwidth-limiting transform stream
 */
export function createBandwidthLimiter(bytesPerSecond: number): Transform {
  if (bytesPerSecond <= 0) {
    // No limit - pass through
    return new Transform({
      transform(chunk, encoding, callback) {
        callback(null, chunk)
      },
    })
  }

  let lastTime = Date.now()
  let bytesSent = 0

  return new Transform({
    async transform(chunk, encoding, callback) {
      const now = Date.now()
      const elapsed = (now - lastTime) / 1000

      if (elapsed >= 1) {
        // Reset counter every second
        bytesSent = 0
        lastTime = now
      }

      bytesSent += chunk.length

      if (bytesSent > bytesPerSecond) {
        // Throttle - wait until next second
        const waitTime = Math.ceil((bytesSent / bytesPerSecond - elapsed) * 1000)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        bytesSent = 0
        lastTime = Date.now()
      }

      callback(null, chunk)
    },
  })
}

// ============================================================================
// Progress Tracker
// ============================================================================

/**
 * Create a progress tracking transform stream
 */
export function createProgressTracker(
  transferId: string,
  itemId: string,
  direction: 'upload' | 'download',
  totalBytes: number,
  totalChunks: number,
  onProgress: ProgressCallback,
): Transform {
  let bytesTransferred = 0
  let currentChunk = 0
  let startTime = Date.now()
  let lastUpdateTime = startTime
  let lastBytes = 0

  return new Transform({
    transform(chunk, encoding, callback) {
      bytesTransferred += chunk.length
      currentChunk = Math.floor(bytesTransferred / (totalBytes / totalChunks))

      const now = Date.now()
      const elapsed = (now - lastUpdateTime) / 1000

      // Update progress every 100ms or on completion
      if (elapsed >= 0.1 || bytesTransferred >= totalBytes) {
        const speed = elapsed > 0 ? (bytesTransferred - lastBytes) / elapsed : 0
        const remaining = totalBytes - bytesTransferred
        const eta = speed > 0 ? remaining / speed : 0

        const progress: TransferProgress = {
          transferId,
          itemId,
          direction,
          bytesTransferred,
          totalBytes,
          percentage: Math.round((bytesTransferred / totalBytes) * 100),
          speed,
          eta,
          currentChunk,
          totalChunks,
        }

        onProgress(progress)
        lastUpdateTime = now
        lastBytes = bytesTransferred
      }

      callback(null, chunk)
    },
  })
}

// ============================================================================
// Transfer State Manager
// ============================================================================

/**
 * Manage transfer state for resumable transfers
 */
export class TransferStateManager {
  private states: Map<string, TransferState> = new Map()
  private persistPath: string | null = null

  constructor(persistPath?: string) {
    this.persistPath = persistPath || null
  }

  /**
   * Create a new transfer state
   */
  createTransfer(
    itemId: string,
    direction: 'upload' | 'download',
    totalSize: number,
    totalChunks: number,
    contentHash: string,
  ): TransferState {
    const id = `${direction}-${itemId}-${Date.now()}`
    const state: TransferState = {
      id,
      itemId,
      direction,
      totalSize,
      transferredBytes: 0,
      completedChunks: [],
      totalChunks,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      status: 'pending',
      contentHash,
    }

    this.states.set(id, state)
    return state
  }

  /**
   * Get transfer state
   */
  getTransfer(id: string): TransferState | undefined {
    return this.states.get(id)
  }

  /**
   * Update transfer progress
   */
  updateProgress(id: string, chunkIndex: number, bytesTransferred: number): void {
    const state = this.states.get(id)
    if (!state) return

    if (!state.completedChunks.includes(chunkIndex)) {
      state.completedChunks.push(chunkIndex)
    }
    state.transferredBytes = bytesTransferred
    state.lastActivityAt = Date.now()
    state.status = 'active'
  }

  /**
   * Mark transfer as completed
   */
  completeTransfer(id: string): void {
    const state = this.states.get(id)
    if (!state) return

    state.status = 'completed'
    state.lastActivityAt = Date.now()
  }

  /**
   * Mark transfer as failed
   */
  failTransfer(id: string, error: string): void {
    const state = this.states.get(id)
    if (!state) return

    state.status = 'failed'
    state.error = error
    state.lastActivityAt = Date.now()
  }

  /**
   * Pause transfer
   */
  pauseTransfer(id: string): void {
    const state = this.states.get(id)
    if (!state) return

    state.status = 'paused'
    state.lastActivityAt = Date.now()
  }

  /**
   * Resume transfer
   */
  resumeTransfer(id: string): void {
    const state = this.states.get(id)
    if (!state || state.status !== 'paused') return

    state.status = 'active'
    state.lastActivityAt = Date.now()
  }

  /**
   * Get missing chunks for resume
   */
  getMissingChunks(id: string): number[] {
    const state = this.states.get(id)
    if (!state) return []

    const missing: number[] = []
    for (let i = 0; i < state.totalChunks; i++) {
      if (!state.completedChunks.includes(i)) {
        missing.push(i)
      }
    }
    return missing
  }

  /**
   * Check if transfer can be resumed
   */
  canResume(id: string): boolean {
    const state = this.states.get(id)
    if (!state) return false

    return state.status === 'paused' || state.status === 'failed'
  }

  /**
   * Remove transfer state
   */
  removeTransfer(id: string): void {
    this.states.delete(id)
  }

  /**
   * Get all active transfers
   */
  getActiveTransfers(): TransferState[] {
    return Array.from(this.states.values()).filter(
      s => s.status === 'active' || s.status === 'pending',
    )
  }

  /**
   * Get all transfers for an item
   */
  getTransfersForItem(itemId: string): TransferState[] {
    return Array.from(this.states.values()).filter(s => s.itemId === itemId)
  }

  /**
   * Clear completed transfers
   */
  clearCompleted(): void {
    for (const [id, state] of this.states) {
      if (state.status === 'completed') {
        this.states.delete(id)
      }
    }
  }

  /**
   * Clear all transfers
   */
  clearAll(): void {
    this.states.clear()
  }
}

// ============================================================================
// Stream Transfer Engine
// ============================================================================

/**
 * Upload handler type
 */
export type ChunkUploadHandler = (
  chunk: Buffer,
  metadata: ChunkMetadata,
  transferId: string,
) => Promise<void>

/**
 * Download handler type
 */
export type ChunkDownloadHandler = (
  chunkIndex: number,
  transferId: string,
) => Promise<Buffer>

/**
 * Stream transfer engine for chunked uploads/downloads
 */
export class StreamTransferEngine {
  private config: StreamTransferConfig
  private stateManager: TransferStateManager
  private activeTransfers: Map<string, AbortController> = new Map()

  constructor(config: Partial<StreamTransferConfig> = {}) {
    this.config = { ...DEFAULT_TRANSFER_CONFIG, ...config }
    this.stateManager = new TransferStateManager()
  }

  /**
   * Upload data in chunks
   */
  async upload(
    data: Buffer,
    itemId: string,
    uploadChunk: ChunkUploadHandler,
    onProgress?: ProgressCallback,
  ): Promise<TransferState> {
    const contentHash = createHash('sha256').update(data).digest('hex')
    const chunks = calculateChunkMetadata(data, this.config.chunkSize)
    const totalChunks = chunks.length

    const state = this.stateManager.createTransfer(
      itemId,
      'upload',
      data.length,
      totalChunks,
      contentHash,
    )

    const abortController = new AbortController()
    this.activeTransfers.set(state.id, abortController)

    try {
      // Process chunks with concurrency limit
      const chunkQueue = [...chunks]
      const inFlight: Promise<void>[] = []

      while (chunkQueue.length > 0 || inFlight.length > 0) {
        // Check for abort
        if (abortController.signal.aborted) {
          throw new Error('Transfer aborted')
        }

        // Fill up to max concurrent
        while (chunkQueue.length > 0 && inFlight.length < this.config.maxConcurrent) {
          const chunkMeta = chunkQueue.shift()!
          const chunk = data.subarray(chunkMeta.offset, chunkMeta.offset + chunkMeta.size)

          // Apply compression if enabled
          let processedChunk = chunk
          if (this.config.compression) {
            processedChunk = await this.compressChunk(chunk)
          }

          const uploadPromise = this.uploadChunkWithRetry(
            processedChunk,
            chunkMeta,
            state.id,
            uploadChunk,
          ).then(() => {
            this.stateManager.updateProgress(
              state.id,
              chunkMeta.index,
              (chunkMeta.index + 1) * this.config.chunkSize,
            )

            if (onProgress) {
              const progress: TransferProgress = {
                transferId: state.id,
                itemId,
                direction: 'upload',
                bytesTransferred: Math.min((chunkMeta.index + 1) * this.config.chunkSize, data.length),
                totalBytes: data.length,
                percentage: Math.round(((chunkMeta.index + 1) / totalChunks) * 100),
                speed: 0,
                eta: 0,
                currentChunk: chunkMeta.index,
                totalChunks,
              }
              onProgress(progress)
            }
          })

          inFlight.push(uploadPromise)
        }

        // Wait for at least one to complete
        if (inFlight.length > 0) {
          await Promise.race(inFlight)
          // Remove completed promises
          const completed = await Promise.allSettled(inFlight)
          inFlight.length = 0

          // Check for failures
          for (const result of completed) {
            if (result.status === 'rejected') {
              throw result.reason
            }
          }
        }
      }

      this.stateManager.completeTransfer(state.id)
      return this.stateManager.getTransfer(state.id)!
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.stateManager.failTransfer(state.id, errorMessage)
      throw error
    }
    finally {
      this.activeTransfers.delete(state.id)
    }
  }

  /**
   * Download data in chunks
   */
  async download(
    itemId: string,
    totalSize: number,
    totalChunks: number,
    contentHash: string,
    downloadChunk: ChunkDownloadHandler,
    onProgress?: ProgressCallback,
  ): Promise<Buffer> {
    const state = this.stateManager.createTransfer(
      itemId,
      'download',
      totalSize,
      totalChunks,
      contentHash,
    )

    const abortController = new AbortController()
    this.activeTransfers.set(state.id, abortController)

    try {
      const chunks: Buffer[] = new Array(totalChunks)
      const chunkIndices = Array.from({ length: totalChunks }, (_, i) => i)
      const inFlight: Promise<void>[] = []

      while (chunkIndices.length > 0 || inFlight.length > 0) {
        if (abortController.signal.aborted) {
          throw new Error('Transfer aborted')
        }

        while (chunkIndices.length > 0 && inFlight.length < this.config.maxConcurrent) {
          const chunkIndex = chunkIndices.shift()!

          const downloadPromise = this.downloadChunkWithRetry(
            chunkIndex,
            state.id,
            downloadChunk,
          ).then(async (chunk) => {
            // Decompress if needed
            let processedChunk = chunk
            if (this.config.compression) {
              processedChunk = await this.decompressChunk(chunk)
            }

            chunks[chunkIndex] = processedChunk
            this.stateManager.updateProgress(
              state.id,
              chunkIndex,
              (chunkIndex + 1) * this.config.chunkSize,
            )

            if (onProgress) {
              const progress: TransferProgress = {
                transferId: state.id,
                itemId,
                direction: 'download',
                bytesTransferred: Math.min((chunkIndex + 1) * this.config.chunkSize, totalSize),
                totalBytes: totalSize,
                percentage: Math.round(((chunkIndex + 1) / totalChunks) * 100),
                speed: 0,
                eta: 0,
                currentChunk: chunkIndex,
                totalChunks,
              }
              onProgress(progress)
            }
          })

          inFlight.push(downloadPromise)
        }

        if (inFlight.length > 0) {
          await Promise.race(inFlight)
          const completed = await Promise.allSettled(inFlight)
          inFlight.length = 0

          for (const result of completed) {
            if (result.status === 'rejected') {
              throw result.reason
            }
          }
        }
      }

      const result = Buffer.concat(chunks)

      // Verify integrity
      if (this.config.verifyIntegrity) {
        const actualHash = createHash('sha256').update(result).digest('hex')
        if (actualHash !== contentHash) {
          throw new Error('Content integrity verification failed')
        }
      }

      this.stateManager.completeTransfer(state.id)
      return result
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.stateManager.failTransfer(state.id, errorMessage)
      throw error
    }
    finally {
      this.activeTransfers.delete(state.id)
    }
  }

  /**
   * Resume a paused or failed transfer
   */
  async resumeUpload(
    transferId: string,
    data: Buffer,
    uploadChunk: ChunkUploadHandler,
    onProgress?: ProgressCallback,
  ): Promise<TransferState> {
    const state = this.stateManager.getTransfer(transferId)
    if (!state) {
      throw new Error(`Transfer not found: ${transferId}`)
    }

    if (!this.stateManager.canResume(transferId)) {
      throw new Error(`Transfer cannot be resumed: ${state.status}`)
    }

    this.stateManager.resumeTransfer(transferId)
    const missingChunks = this.stateManager.getMissingChunks(transferId)

    const abortController = new AbortController()
    this.activeTransfers.set(transferId, abortController)

    try {
      for (const chunkIndex of missingChunks) {
        if (abortController.signal.aborted) {
          throw new Error('Transfer aborted')
        }

        const offset = chunkIndex * this.config.chunkSize
        const chunk = data.subarray(offset, offset + this.config.chunkSize)
        const chunkMeta: ChunkMetadata = {
          index: chunkIndex,
          total: state.totalChunks,
          size: chunk.length,
          hash: createHash('sha256').update(chunk).digest('hex'),
          offset,
        }

        let processedChunk = chunk
        if (this.config.compression) {
          processedChunk = await this.compressChunk(chunk)
        }

        await this.uploadChunkWithRetry(processedChunk, chunkMeta, transferId, uploadChunk)
        this.stateManager.updateProgress(transferId, chunkIndex, offset + chunk.length)

        if (onProgress) {
          const completedChunks = state.completedChunks.length
          const progress: TransferProgress = {
            transferId,
            itemId: state.itemId,
            direction: 'upload',
            bytesTransferred: completedChunks * this.config.chunkSize,
            totalBytes: state.totalSize,
            percentage: Math.round((completedChunks / state.totalChunks) * 100),
            speed: 0,
            eta: 0,
            currentChunk: chunkIndex,
            totalChunks: state.totalChunks,
          }
          onProgress(progress)
        }
      }

      this.stateManager.completeTransfer(transferId)
      return this.stateManager.getTransfer(transferId)!
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.stateManager.failTransfer(transferId, errorMessage)
      throw error
    }
    finally {
      this.activeTransfers.delete(transferId)
    }
  }

  /**
   * Abort a transfer
   */
  abortTransfer(transferId: string): void {
    const controller = this.activeTransfers.get(transferId)
    if (controller) {
      controller.abort()
    }
    this.stateManager.failTransfer(transferId, 'Aborted by user')
  }

  /**
   * Pause a transfer
   */
  pauseTransfer(transferId: string): void {
    this.stateManager.pauseTransfer(transferId)
  }

  /**
   * Get transfer state
   */
  getTransferState(transferId: string): TransferState | undefined {
    return this.stateManager.getTransfer(transferId)
  }

  /**
   * Get all active transfers
   */
  getActiveTransfers(): TransferState[] {
    return this.stateManager.getActiveTransfers()
  }

  /**
   * Upload chunk with retry logic
   */
  private async uploadChunkWithRetry(
    chunk: Buffer,
    metadata: ChunkMetadata,
    transferId: string,
    uploadChunk: ChunkUploadHandler,
  ): Promise<void> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        await Promise.race([
          uploadChunk(chunk, metadata, transferId),
          this.createTimeout(this.config.timeout),
        ])
        return
      }
      catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < this.config.retryAttempts - 1) {
          await this.sleep(this.config.retryDelay * (attempt + 1))
        }
      }
    }

    throw lastError || new Error('Upload failed after retries')
  }

  /**
   * Download chunk with retry logic
   */
  private async downloadChunkWithRetry(
    chunkIndex: number,
    transferId: string,
    downloadChunk: ChunkDownloadHandler,
  ): Promise<Buffer> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const result = await Promise.race([
          downloadChunk(chunkIndex, transferId),
          this.createTimeout(this.config.timeout),
        ])
        return result as Buffer
      }
      catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < this.config.retryAttempts - 1) {
          await this.sleep(this.config.retryDelay * (attempt + 1))
        }
      }
    }

    throw lastError || new Error('Download failed after retries')
  }

  /**
   * Compress a chunk
   */
  private compressChunk(chunk: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const gzip = createGzip({ level: this.config.compressionLevel })
      const chunks: Buffer[] = []

      gzip.on('data', (data: Buffer) => chunks.push(data))
      gzip.on('end', () => resolve(Buffer.concat(chunks)))
      gzip.on('error', reject)

      gzip.write(chunk)
      gzip.end()
    })
  }

  /**
   * Decompress a chunk
   */
  private decompressChunk(chunk: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const gunzip = createGunzip()
      const chunks: Buffer[] = []

      gunzip.on('data', (data: Buffer) => chunks.push(data))
      gunzip.on('end', () => resolve(Buffer.concat(chunks)))
      gunzip.on('error', reject)

      gunzip.write(chunk)
      gunzip.end()
    })
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    })
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StreamTransferConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): StreamTransferConfig {
    return { ...this.config }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a stream transfer engine
 */
export function createStreamTransferEngine(
  config?: Partial<StreamTransferConfig>,
): StreamTransferEngine {
  return new StreamTransferEngine(config)
}

/**
 * Create a transfer state manager
 */
export function createTransferStateManager(persistPath?: string): TransferStateManager {
  return new TransferStateManager(persistPath)
}

/**
 * Calculate content hash
 */
export function calculateContentHash(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}
