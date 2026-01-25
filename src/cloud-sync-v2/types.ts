/**
 * Cloud Sync V2 - Type Definitions
 *
 * Advanced cloud synchronization with streaming, encryption, and CRDT support.
 *
 * @module cloud-sync-v2/types
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Unique identifier type
 */
export type NodeId = string

/**
 * Timestamp in milliseconds since epoch
 */
export type Timestamp = number

/**
 * Vector clock for causality tracking
 */
export type VectorClock = Map<NodeId, Timestamp>

/**
 * Sync item types
 */
export type SyncItemType = 'skill' | 'workflow' | 'config' | 'plugin' | 'template'

/**
 * Operation types for sync
 */
export type OperationType = 'create' | 'update' | 'delete' | 'merge'

// ============================================================================
// Encryption Types
// ============================================================================

/**
 * Encryption algorithm options
 */
export type EncryptionAlgorithm = 'aes-256-gcm' | 'chacha20-poly1305'

/**
 * Key derivation function options
 */
export type KDFType = 'pbkdf2' | 'argon2' | 'scrypt'

/**
 * Encrypted data envelope
 */
export interface EncryptedEnvelope {
  /** Encryption algorithm used */
  algorithm: EncryptionAlgorithm

  /** Initialization vector (base64) */
  iv: string

  /** Authentication tag (base64) */
  authTag: string

  /** Encrypted data (base64) */
  ciphertext: string

  /** Key derivation parameters */
  kdf?: {
    type: KDFType
    salt: string
    iterations?: number
    memory?: number
    parallelism?: number
  }

  /** Key ID for key rotation */
  keyId?: string

  /** Version for format migration */
  version: number
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  /** Enable encryption */
  enabled: boolean

  /** Encryption algorithm */
  algorithm: EncryptionAlgorithm

  /** Key derivation function */
  kdf: KDFType

  /** PBKDF2 iterations (if using PBKDF2) */
  iterations?: number

  /** Enable key rotation */
  keyRotation?: boolean

  /** Key rotation interval in days */
  keyRotationDays?: number
}

/**
 * Key pair for asymmetric encryption
 */
export interface KeyPair {
  /** Public key (base64) */
  publicKey: string

  /** Private key (base64, encrypted) */
  privateKey: string

  /** Key ID */
  keyId: string

  /** Creation timestamp */
  createdAt: Timestamp

  /** Expiration timestamp */
  expiresAt?: Timestamp
}

// ============================================================================
// Stream Transfer Types
// ============================================================================

/**
 * Chunk metadata
 */
export interface ChunkMetadata {
  /** Chunk index */
  index: number

  /** Total chunks */
  total: number

  /** Chunk size in bytes */
  size: number

  /** Chunk hash for verification */
  hash: string

  /** Offset in original file */
  offset: number
}

/**
 * Transfer state for resumable uploads/downloads
 */
export interface TransferState {
  /** Transfer ID */
  id: string

  /** File/item ID being transferred */
  itemId: string

  /** Transfer direction */
  direction: 'upload' | 'download'

  /** Total size in bytes */
  totalSize: number

  /** Transferred bytes */
  transferredBytes: number

  /** Completed chunk indices */
  completedChunks: number[]

  /** Total chunks */
  totalChunks: number

  /** Transfer start time */
  startedAt: Timestamp

  /** Last activity time */
  lastActivityAt: Timestamp

  /** Transfer status */
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed'

  /** Error message if failed */
  error?: string

  /** Content hash for verification */
  contentHash: string

  /** Encryption envelope (if encrypted) */
  encryption?: Partial<EncryptedEnvelope>
}

/**
 * Stream transfer configuration
 */
export interface StreamTransferConfig {
  /** Chunk size in bytes (default: 1MB) */
  chunkSize: number

  /** Maximum concurrent chunks */
  maxConcurrent: number

  /** Bandwidth limit in bytes/second (0 = unlimited) */
  bandwidthLimit: number

  /** Enable compression */
  compression: boolean

  /** Compression level (1-9) */
  compressionLevel: number

  /** Retry attempts per chunk */
  retryAttempts: number

  /** Retry delay in milliseconds */
  retryDelay: number

  /** Transfer timeout in milliseconds */
  timeout: number

  /** Enable integrity verification */
  verifyIntegrity: boolean
}

/**
 * Progress callback data
 */
export interface TransferProgress {
  /** Transfer ID */
  transferId: string

  /** Item ID */
  itemId: string

  /** Direction */
  direction: 'upload' | 'download'

  /** Bytes transferred */
  bytesTransferred: number

  /** Total bytes */
  totalBytes: number

  /** Progress percentage (0-100) */
  percentage: number

  /** Current transfer speed in bytes/second */
  speed: number

  /** Estimated time remaining in seconds */
  eta: number

  /** Current chunk index */
  currentChunk: number

  /** Total chunks */
  totalChunks: number
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: TransferProgress) => void

// ============================================================================
// CRDT Types
// ============================================================================

/**
 * CRDT operation
 */
export interface CRDTOperation<T = unknown> {
  /** Operation ID */
  id: string

  /** Operation type */
  type: 'set' | 'increment' | 'add' | 'remove'

  /** Node that created the operation */
  nodeId: NodeId

  /** Timestamp */
  timestamp: Timestamp

  /** Operation value */
  value: T

  /** Vector clock at operation time */
  vectorClock: Record<NodeId, Timestamp>
}

/**
 * CRDT state snapshot
 */
export interface CRDTSnapshot<T = unknown> {
  /** CRDT type */
  type: 'lww-register' | 'g-counter' | 'pn-counter' | 'or-set' | 'lww-map'

  /** Current value */
  value: T

  /** Node ID */
  nodeId: NodeId

  /** Last update timestamp */
  timestamp: Timestamp

  /** Vector clock */
  vectorClock: Record<NodeId, Timestamp>

  /** Internal state (type-specific) */
  state: unknown
}

/**
 * Merge result
 */
export interface MergeResult<T = unknown> {
  /** Merged value */
  value: T

  /** Whether merge caused changes */
  changed: boolean

  /** Conflicts detected (for manual resolution) */
  conflicts?: Array<{
    field: string
    local: unknown
    remote: unknown
  }>
}

// ============================================================================
// Offline Queue Types
// ============================================================================

/**
 * Queued operation
 */
export interface QueuedOperation {
  /** Operation ID */
  id: string

  /** Operation type */
  type: OperationType

  /** Item type */
  itemType: SyncItemType

  /** Item ID */
  itemId: string

  /** Operation payload */
  payload: unknown

  /** Creation timestamp */
  createdAt: Timestamp

  /** Retry count */
  retryCount: number

  /** Last attempt timestamp */
  lastAttemptAt?: Timestamp

  /** Error from last attempt */
  lastError?: string

  /** Priority (lower = higher priority) */
  priority: number

  /** Dependencies (operation IDs that must complete first) */
  dependencies: string[]

  /** CRDT state for conflict resolution */
  crdtState?: CRDTSnapshot
}

/**
 * Queue state
 */
export interface QueueState {
  /** Pending operations */
  pending: QueuedOperation[]

  /** Failed operations */
  failed: QueuedOperation[]

  /** Completed operation IDs (for deduplication) */
  completed: Set<string>

  /** Is queue processing */
  isProcessing: boolean

  /** Last sync timestamp */
  lastSyncAt?: Timestamp

  /** Network status */
  networkStatus: 'online' | 'offline' | 'unknown'
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  /** Maximum queue size */
  maxSize: number

  /** Maximum retry attempts */
  maxRetries: number

  /** Retry delay in milliseconds */
  retryDelay: number

  /** Batch size for processing */
  batchSize: number

  /** Persistence storage key */
  storageKey: string

  /** Enable persistence */
  persistence: boolean

  /** Conflict resolution strategy */
  conflictStrategy: 'crdt' | 'last-write-wins' | 'manual'
}

// ============================================================================
// Sync Engine V2 Types
// ============================================================================

/**
 * Sync item with CRDT support
 */
export interface SyncItemV2<T = unknown> {
  /** Item ID */
  id: string

  /** Item type */
  type: SyncItemType

  /** Item name */
  name: string

  /** Item content */
  content: T

  /** Content hash */
  contentHash: string

  /** Version number */
  version: number

  /** Creation timestamp */
  createdAt: Timestamp

  /** Last modified timestamp */
  updatedAt: Timestamp

  /** Node that last modified */
  modifiedBy: NodeId

  /** CRDT state */
  crdt: CRDTSnapshot<T>

  /** Encryption status */
  encrypted: boolean

  /** Metadata */
  metadata?: Record<string, unknown>
}

/**
 * Sync engine V2 configuration
 */
export interface SyncEngineV2Config {
  /** Node ID for this instance */
  nodeId: NodeId

  /** Encryption configuration */
  encryption: EncryptionConfig

  /** Stream transfer configuration */
  transfer: StreamTransferConfig

  /** Queue configuration */
  queue: QueueConfig

  /** Auto-sync interval in milliseconds (0 = disabled) */
  autoSyncInterval: number

  /** Enable delta sync */
  deltaSync: boolean

  /** Verbose logging */
  verbose: boolean
}

/**
 * Sync result V2
 */
export interface SyncResultV2 {
  /** Success status */
  success: boolean

  /** Items pushed */
  pushed: SyncItemV2[]

  /** Items pulled */
  pulled: SyncItemV2[]

  /** Merged items (CRDT) */
  merged: SyncItemV2[]

  /** Unresolved conflicts */
  conflicts: Array<{
    itemId: string
    local: SyncItemV2
    remote: SyncItemV2
    reason: string
  }>

  /** Errors */
  errors: Array<{
    code: string
    message: string
    itemId?: string
  }>

  /** Duration in milliseconds */
  durationMs: number

  /** Timestamp */
  timestamp: Timestamp
}

/**
 * Sync events V2
 */
export interface SyncEventsV2 {
  'sync:start': () => void
  'sync:complete': (result: SyncResultV2) => void
  'sync:error': (error: Error) => void
  'sync:progress': (progress: TransferProgress) => void
  'sync:conflict': (conflict: { itemId: string; local: SyncItemV2; remote: SyncItemV2 }) => void
  'sync:merged': (item: SyncItemV2) => void
  'queue:added': (operation: QueuedOperation) => void
  'queue:processed': (operation: QueuedOperation) => void
  'queue:failed': (operation: QueuedOperation, error: Error) => void
  'network:online': () => void
  'network:offline': () => void
  'encryption:keyRotated': (keyId: string) => void
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default encryption configuration
 */
export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  enabled: true,
  algorithm: 'aes-256-gcm',
  kdf: 'pbkdf2',
  iterations: 100000,
  keyRotation: false,
  keyRotationDays: 90,
}

/**
 * Default stream transfer configuration
 */
export const DEFAULT_TRANSFER_CONFIG: StreamTransferConfig = {
  chunkSize: 1024 * 1024, // 1MB
  maxConcurrent: 3,
  bandwidthLimit: 0, // Unlimited
  compression: true,
  compressionLevel: 6,
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 30000,
  verifyIntegrity: true,
}

/**
 * Default queue configuration
 */
export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxSize: 1000,
  maxRetries: 5,
  retryDelay: 5000,
  batchSize: 10,
  storageKey: 'ccjk-sync-queue-v2',
  persistence: true,
  conflictStrategy: 'crdt',
}

/**
 * Default sync engine V2 configuration
 */
export const DEFAULT_SYNC_ENGINE_V2_CONFIG: SyncEngineV2Config = {
  nodeId: '',
  encryption: DEFAULT_ENCRYPTION_CONFIG,
  transfer: DEFAULT_TRANSFER_CONFIG,
  queue: DEFAULT_QUEUE_CONFIG,
  autoSyncInterval: 0,
  deltaSync: true,
  verbose: false,
}

// ============================================================================
// Re-export CRDT Types for Convenience
// ============================================================================

/**
 * LWW Register state
 */
export interface LWWRegisterState<T> {
  value: T
  timestamp: Timestamp
  nodeId: NodeId
}

/**
 * LWW Register options
 */
export interface LWWRegisterOptions {
  bias?: 'first' | 'last'
  comparator?: (a: Timestamp, b: Timestamp) => number
}

/**
 * G-Counter state
 */
export type GCounterState = Map<NodeId, number>

/**
 * Serializable G-Counter state
 */
export interface GCounterStateObject {
  counts: Record<NodeId, number>
  timestamp: Timestamp
}

/**
 * PN-Counter state
 */
export interface PNCounterState {
  positive: GCounterState
  negative: GCounterState
}

/**
 * OR-Set state
 */
export interface ORSetState<T> {
  elements: Map<string, TaggedElement<T>>
  tombstones: Set<Tag>
}

/**
 * Serializable OR-Set state
 */
export interface ORSetStateObject<T> {
  elements: Array<{ key: string, value: T, tags: string[] }>
  tombstones: string[]
  timestamp: Timestamp
}

/**
 * Unique tag for tracking element additions
 */
export type Tag = string

/**
 * Element with its associated tags
 */
export interface TaggedElement<T> {
  value: T
  tags: Set<Tag>
}

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
  'conflict:detected': (local: QueuedOperation, remote: QueuedOperation) => void
}

/**
 * Operation processor function
 */
export type OperationProcessor = (operation: QueuedOperation) => Promise<void>

/**
 * Conflict resolver function
 */
export type ConflictResolver = (local: QueuedOperation, remote: QueuedOperation) => QueuedOperation | null
