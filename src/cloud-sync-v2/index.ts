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

// CRDT
export {
  createGCounter,
  createLWWRegister,
  createORSet,
  createORSetWithValues,
  createPNCounter,
  GCounter,
  LWWRegister,
  mergeGCounterStates,
  mergeLWWStates,
  ORSet,
  PNCounter,
} from './crdt'

// Encryption
export {
  createEncryptionManager,
  decrypt,
  decryptFromEnvelope,
  decryptWithKey,
  deriveKey,
  deriveSharedSecret,
  encrypt,
  EncryptionManager,
  encryptToEnvelope,
  encryptWithKey,
  generateCommitment,
  generateIV,
  generateKey,
  generateKeyId,
  generateKeyPair,
  generateProofOfKnowledge,
  generateSalt,
  generateSecureToken,
  hashData,
  verifyCommitment,
} from './encryption'

// Offline Queue
export {
  createCRDTConflictResolver,
  createLWWConflictResolver,
  createOfflineQueue,
  OfflineQueue,
} from './offline-queue'

// Stream Transfer
export {
  calculateChunkMetadata,
  calculateContentHash,
  chunkData,
  createBandwidthLimiter,
  createProgressTracker,
  createStreamTransferEngine,
  createTransferStateManager,
  StreamTransferEngine,
  TransferStateManager,
  verifyChunk,
} from './stream-transfer'

// Main Sync Engine
export {
  createSyncEngineV2,
  createSyncEngineV2WithConfig,
  InMemoryStorage,
  SyncEngineV2,
} from './sync-engine'

export type {
  RemoteStorageAdapter,
  StorageAdapter,
} from './sync-engine'

export type {
  EncryptedEnvelope,
  EncryptionAlgorithm,
  EncryptionConfig,
  KDFType,
  KeyPair,
} from './types'

export type {
  ChunkMetadata,
  ProgressCallback,
  StreamTransferConfig,
  TransferProgress,
  TransferState,
} from './types'

export type {
  CRDTOperation,
  CRDTSnapshot,
  GCounterState,
  GCounterStateObject,
  LWWRegisterOptions,
  LWWRegisterState,
  MergeResult,
  NodeId,
  ORSetState,
  ORSetStateObject,
  PNCounterState,
  Tag,
  TaggedElement,
  Timestamp,
  VectorClock,
} from './types'

export type {
  ConflictResolver,
  OperationProcessor,
  QueueConfig,
  QueuedOperation,
  QueueEvents,
  QueueState,
} from './types'

// Types
export type {
  OperationType,
  SyncEngineV2Config,
  SyncEventsV2,
  SyncItemType,
  SyncItemV2,
  SyncResultV2,
} from './types'

// Constants
export {
  DEFAULT_ENCRYPTION_CONFIG,
  DEFAULT_QUEUE_CONFIG,
  DEFAULT_SYNC_ENGINE_V2_CONFIG,
  DEFAULT_TRANSFER_CONFIG,
} from './types'
