/**
 * Cloud Sync System Types
 *
 * Type definitions for the CCJK cloud synchronization engine.
 * Supports multiple cloud providers with incremental sync capabilities.
 */

// ============================================================================
// Cloud Provider Types
// ============================================================================

/**
 * Supported cloud storage providers
 */
export type CloudProvider
  = | 'github-gist' // GitHub Gist storage
    | 's3' // AWS S3 or compatible (MinIO, etc.)
    | 'webdav' // WebDAV servers (Nextcloud, etc.)
    | 'custom' // Custom provider via adapter

/**
 * Sync direction modes
 */
export type SyncDirection
  = | 'push' // Local -> Remote only
    | 'pull' // Remote -> Local only
    | 'bidirectional' // Two-way sync with conflict resolution

/**
 * Current sync status
 */
export type SyncStatus
  = | 'idle' // No sync in progress
    | 'syncing' // Sync operation in progress
    | 'conflict' // Conflicts detected, awaiting resolution
    | 'error' // Sync failed with error

/**
 * Types of changes that can occur
 */
export type ChangeType
  = | 'create' // New item created
    | 'update' // Existing item modified
    | 'delete' // Item deleted

/**
 * Types of items that can be synced
 */
export type SyncableItemType
  = | 'skills' // Custom skills
    | 'workflows' // Workflow configurations
    | 'settings' // User settings
    | 'mcp-configs' // MCP server configurations
    | 'memories' // AI memory entries

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Cloud provider configuration
 */
export interface ProviderConfig {
  /** Provider type */
  type: CloudProvider

  /** Provider-specific endpoint URL */
  endpoint?: string

  /** Authentication credentials */
  credentials: ProviderCredentials

  /** Provider-specific options */
  options?: Record<string, unknown>
}

/**
 * Provider authentication credentials
 */
export interface ProviderCredentials {
  /** API token or access key */
  token?: string

  /** Secret key (for S3-compatible) */
  secretKey?: string

  /** Username (for WebDAV) */
  username?: string

  /** Password (for WebDAV) */
  password?: string
}

/**
 * Sync engine configuration
 */
export interface SyncConfig {
  /** Cloud provider configuration */
  provider: ProviderConfig

  /** Sync direction mode */
  direction: SyncDirection

  /** Items to sync (empty = all) */
  itemTypes: SyncableItemType[]

  /** Auto-sync interval in milliseconds (0 = disabled) */
  autoSyncInterval: number

  /** Conflict resolution strategy */
  conflictStrategy: ConflictStrategy

  /** Maximum retry attempts */
  maxRetries: number

  /** Base retry delay in milliseconds */
  retryDelayMs: number

  /** Enable verbose logging */
  verbose: boolean
}

/**
 * Conflict resolution strategies
 */
export type ConflictStrategy
  = | 'local-wins' // Local changes take precedence
    | 'remote-wins' // Remote changes take precedence
    | 'newest-wins' // Most recent change wins
    | 'manual' // Require manual resolution

/**
 * Alias for ConflictStrategy to maintain compatibility
 */
export type ConflictResolutionStrategy = ConflictStrategy

/**
 * Default sync configuration
 */
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  provider: {
    type: 'github-gist',
    credentials: {},
  },
  direction: 'bidirectional',
  itemTypes: ['skills', 'workflows', 'settings', 'mcp-configs', 'memories'],
  autoSyncInterval: 0,
  conflictStrategy: 'newest-wins',
  maxRetries: 3,
  retryDelayMs: 1000,
  verbose: false,
}

// ============================================================================
// Syncable Item Types
// ============================================================================

/**
 * Base interface for all syncable items
 */
export interface SyncableItem {
  /** Unique item identifier */
  id: string

  /** Item type */
  type: SyncableItemType

  /** Item name/title */
  name: string

  /** Content hash for change detection */
  contentHash: string

  /** Last modified timestamp (ISO 8601) */
  lastModified: string

  /** Item version number */
  version: number

  /** Item content (serialized) */
  content: string

  /** Item metadata */
  metadata?: Record<string, unknown>
}

/**
 * Skill item for sync
 */
export interface SyncableSkill extends SyncableItem {
  type: 'skills'
  metadata?: {
    category?: string
    tags?: string[]
    author?: string
  }
}

/**
 * Workflow item for sync
 */
export interface SyncableWorkflow extends SyncableItem {
  type: 'workflows'
  metadata?: {
    phase?: string
    dependencies?: string[]
  }
}

/**
 * Settings item for sync
 */
export interface SyncableSettings extends SyncableItem {
  type: 'settings'
  metadata?: {
    scope?: 'global' | 'project'
  }
}

/**
 * MCP config item for sync
 */
export interface SyncableMcpConfig extends SyncableItem {
  type: 'mcp-configs'
  metadata?: {
    serverName?: string
    enabled?: boolean
  }
}

// ============================================================================
// Change Tracking Types
// ============================================================================

/**
 * Represents a single change to an item
 */
export interface Change {
  /** Change identifier */
  id: string

  /** Type of change */
  type: ChangeType

  /** Item that changed */
  item: SyncableItem

  /** Timestamp of change (ISO 8601) */
  timestamp: string

  /** Source of change */
  source: 'local' | 'remote'
}

/**
 * Set of changes to be synced
 */
export interface ChangeSet {
  /** Unique changeset identifier */
  id: string

  /** Changes in this set */
  changes: Change[]

  /** Changeset creation timestamp */
  createdAt: string

  /** Base sync state hash */
  baseStateHash: string
}

/**
 * Conflict between local and remote changes
 */
export interface SyncConflict {
  /** Conflict identifier */
  id: string

  /** Item with conflict */
  itemId: string

  /** Item type */
  itemType: SyncableItemType

  /** Local version of the item */
  localItem: SyncableItem

  /** Remote version of the item */
  remoteItem: SyncableItem

  /** Local change */
  localChange: Change

  /** Remote change */
  remoteChange: Change

  /** Conflict detection timestamp */
  detectedAt: string

  /** Resolution status */
  resolved: boolean

  /** Resolution result (if resolved) */
  resolution?: 'local' | 'remote' | 'merged'

  /** Whether the conflict can be auto-resolved */
  autoResolvable?: boolean

  /** Suggested resolution strategy */
  suggestedStrategy?: ConflictResolutionStrategy

  /** Reason for the suggested strategy */
  suggestionReason?: string
}

// ============================================================================
// Sync State Types
// ============================================================================

/**
 * Current sync state
 */
export interface SyncState {
  /** Current sync status */
  status: SyncStatus

  /** Last successful sync timestamp */
  lastSyncAt: string | null

  /** Last sync error (if any) */
  lastError: string | null

  /** Current sync progress (0-100) */
  progress: number

  /** Items currently being synced */
  currentItems: string[]

  /** Pending conflicts */
  conflicts: SyncConflict[]

  /** Local state hash */
  localStateHash: string

  /** Remote state hash */
  remoteStateHash: string | null

  /** Sync statistics */
  stats: SyncStats
}

/**
 * Sync statistics
 */
export interface SyncStats {
  /** Total items synced */
  totalSynced: number

  /** Items pushed to remote */
  pushed: number

  /** Items pulled from remote */
  pulled: number

  /** Conflicts resolved */
  conflictsResolved: number

  /** Failed sync attempts */
  failures: number

  /** Total sync duration in milliseconds */
  totalDurationMs: number
}

/**
 * Initial sync state
 */
export const INITIAL_SYNC_STATE: SyncState = {
  status: 'idle',
  lastSyncAt: null,
  lastError: null,
  progress: 0,
  currentItems: [],
  conflicts: [],
  localStateHash: '',
  remoteStateHash: null,
  stats: {
    totalSynced: 0,
    pushed: 0,
    pulled: 0,
    conflictsResolved: 0,
    failures: 0,
    totalDurationMs: 0,
  },
}

// ============================================================================
// Sync Result Types
// ============================================================================

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean

  /** Sync direction that was performed */
  direction: SyncDirection

  /** Items that were pushed */
  pushed: SyncableItem[]

  /** Items that were pulled */
  pulled: SyncableItem[]

  /** Conflicts that occurred */
  conflicts: SyncConflict[]

  /** Errors that occurred */
  errors: SyncError[]

  /** Sync duration in milliseconds */
  durationMs: number

  /** Sync start timestamp */
  startedAt: string

  /** Sync end timestamp */
  completedAt: string
}

/**
 * Sync error details
 */
export interface SyncError {
  /** Error code */
  code: SyncErrorCode

  /** Error message */
  message: string

  /** Item that caused the error (if applicable) */
  itemId?: string

  /** Original error */
  cause?: Error
}

/**
 * Sync error codes
 */
export type SyncErrorCode
  = | 'NETWORK_ERROR' // Network connectivity issue
    | 'AUTH_ERROR' // Authentication failed
    | 'PROVIDER_ERROR' // Provider-specific error
    | 'CONFLICT_ERROR' // Unresolved conflict
    | 'VALIDATION_ERROR' // Data validation failed
    | 'TIMEOUT_ERROR' // Operation timed out
    | 'QUOTA_ERROR' // Storage quota exceeded
    | 'UNKNOWN_ERROR' // Unknown error

// ============================================================================
// Event Types
// ============================================================================

/**
 * Sync event types
 */
export interface SyncEvents {
  /** Sync operation started */
  'sync:start': (direction: SyncDirection, itemTypes: SyncableItemType[]) => void

  /** Sync progress updated */
  'sync:progress': (progress: number, currentItem: string) => void

  /** Sync operation completed */
  'sync:complete': (result: SyncResult) => void

  /** Sync operation failed */
  'sync:error': (error: SyncError) => void

  /** Conflict detected */
  'sync:conflict': (conflict: SyncConflict) => void

  /** Conflict resolved */
  'sync:conflict-resolved': (conflict: SyncConflict, resolution: 'local' | 'remote' | 'merged') => void

  /** Item pushed to remote */
  'sync:pushed': (item: SyncableItem) => void

  /** Item pulled from remote */
  'sync:pulled': (item: SyncableItem) => void

  /** Auto-sync triggered */
  'sync:auto-triggered': () => void

  /** Retry attempt */
  'sync:retry': (attempt: number, maxAttempts: number, error: SyncError) => void
}

// ============================================================================
// Provider Adapter Types
// ============================================================================

/**
 * Cloud provider adapter interface
 *
 * Implement this interface to add support for new cloud providers.
 */
export interface CloudProviderAdapter {
  /** Provider type identifier */
  readonly type: CloudProvider

  /** Provider display name */
  readonly name: string

  /**
   * Initialize the provider connection
   */
  initialize: (config: ProviderConfig) => Promise<void>

  /**
   * Test provider connectivity
   */
  testConnection: () => Promise<boolean>

  /**
   * Fetch all items from remote
   */
  fetchItems: (types?: SyncableItemType[]) => Promise<SyncableItem[]>

  /**
   * Fetch a single item by ID
   */
  fetchItem: (id: string) => Promise<SyncableItem | null>

  /**
   * Push items to remote
   */
  pushItems: (items: SyncableItem[]) => Promise<void>

  /**
   * Delete items from remote
   */
  deleteItems: (ids: string[]) => Promise<void>

  /**
   * Get remote state hash for change detection
   */
  getRemoteStateHash: () => Promise<string>

  /**
   * Cleanup and close connection
   */
  dispose: () => Promise<void>
}

// ============================================================================
// Queue Types
// ============================================================================

/**
 * Sync queue item
 */
export interface SyncQueueItem {
  /** Queue item ID */
  id: string

  /** Operation type */
  operation: 'push' | 'pull' | 'delete'

  /** Item to sync */
  item: SyncableItem

  /** Priority (lower = higher priority) */
  priority: number

  /** Number of retry attempts */
  retryCount: number

  /** Queued timestamp */
  queuedAt: string

  /** Last attempt timestamp */
  lastAttemptAt?: string

  /** Last error (if any) */
  lastError?: SyncError
}

/**
 * Sync queue state
 */
export interface SyncQueueState {
  /** Items in queue */
  items: SyncQueueItem[]

  /** Whether queue is processing */
  isProcessing: boolean

  /** Current item being processed */
  currentItem: SyncQueueItem | null
}

// ============================================================================
// Persistence Types
// ============================================================================

/**
 * Sync persistence state
 */
export interface SyncPersistenceState {
  /** Persistence version for migration */
  version: number

  /** Sync configuration */
  config: SyncConfig

  /** Current sync state */
  state: SyncState

  /** Queue state */
  queue: SyncQueueState

  /** Last updated timestamp */
  lastUpdated: string
}

/**
 * Current persistence version
 */
export const SYNC_PERSISTENCE_VERSION = 1
