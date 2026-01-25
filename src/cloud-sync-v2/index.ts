/**
 * Cloud Sync V2 - Main Module
 *
 * Advanced cloud synchronization with streaming, encryption, and CRDT support.
 *
 * @module cloud-sync-v2
 *
 * @example
 * ```typescript
 * import { createSyncEngineV2, InMemoryStorage } from '@/cloud-sync-v2'
 *
 * // Create engine
 * const engine = createSyncEngineV2('device-1', {
 *   encryption: { enabled: true, algorithm: 'aes-256-gcm' },
 *   transfer: { chunkSize: 1024 * 1024, compression: true },
 * })
 *
 * // Set storage
 * engine.setStorageAdapter(new InMemoryStorage())
 *
 * // Initialize
 * await engine.initialize('my-password')
 *
 * // Sync
 * const result = await engine.sync('skill')
 * console.log(`Synced ${result.pushed.length} items`)
 * ```
 */

// Main Sync Engine
export {
  SyncEngineV2,
  createSyncEngineV2,
  createSyncEngineV2WithConfig,
  InMemoryStorage,
} from './sync-engine'

export type {
  StorageAdapter,
  RemoteStorageAdapter,
  SyncEventsV2,
} from './sync-engine'

// Encryption
export {
  EncryptionManager,
  createEncryptionManager,
  encrypt,
  decrypt,
  encryptToEnvelope,
  decryptFromEnvelope,
  encryptWithKey,
  decryptWithKey,
  generateKey,
  generateSalt,
  generateIV,
  generateKeyId,
  deriveKey,
  generateKeyPair,
  deriveSharedSecret,
  generateCommitment,
  verifyCommitment,
  generateProofOfKnowledge,
  hashData,
  generateSecureToken,
} from './encryption'

export type {
  EncryptionAlgorithm,
  EncryptionConfig,
  EncryptedEnvelope,
  KDFType,
  KeyPair,
} from './types'

// Stream Transfer
export {
  StreamTransferEngine,
  createStreamTransferEngine,
  TransferStateManager,
  createTransferStateManager,
  chunkData,
  calculateChunkMetadata,
  verifyChunk,
  createBandwidthLimiter,
  createProgressTracker,
  calculateContentHash,
} from './stream-transfer'

export type {
  ChunkMetadata,
  ProgressCallback,
  StreamTransferConfig,
  TransferProgress,
  TransferState,
} from './types'

// CRDT
export {
  LWWRegister,
  GCounter,
  PNCounter,
  ORSet,
  createLWWRegister,
  createGCounter,
  createPNCounter,
  createORSet,
  createORSetWithValues,
  mergeLWWStates,
  mergeGCounterStates,
} from './crdt'

export type {
  CRDTOperation,
  CRDTSnapshot,
  MergeResult,
  NodeId,
  Timestamp,
  VectorClock,
  LWWRegisterState,
  LWWRegisterOptions,
  GCounterState,
  GCounterStateObject,
  PNCounterState,
  ORSetState,
  ORSetStateObject,
  Tag,
  TaggedElement,
} from './types'

// Offline Queue
export {
  OfflineQueue,
  createOfflineQueue,
  createCRDTConflictResolver,
  createLWWConflictResolver,
} from './offline-queue'

export type {
  QueuedOperation,
  QueueConfig,
  QueueEvents,
  QueueState,
  OperationProcessor,
  ConflictResolver,
} from './types'

// Types
export type {
  SyncItemType,
  OperationType,
  SyncItemV2,
  SyncEngineV2Config,
  SyncResultV2,
} from './types'

// Constants
export {
  DEFAULT_ENCRYPTION_CONFIG,
  DEFAULT_TRANSFER_CONFIG,
  DEFAULT_QUEUE_CONFIG,
  DEFAULT_SYNC_ENGINE_V2_CONFIG,
} from './types'
