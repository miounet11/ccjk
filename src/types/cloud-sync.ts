/**
 * Cloud Sync Type Definitions
 *
 * Defines types for cloud synchronization of Skills and other resources.
 *
 * @module types/cloud-sync
 */

/**
 * Cloud skill data structure
 *
 * Represents a skill stored in the cloud with metadata and content.
 */
export interface CloudSkill {
  /** Unique skill identifier */
  id: string

  /** Skill name (same as metadata.name) */
  name: string

  /** Skill version (semantic version) */
  version: string

  /** Skill content (markdown with frontmatter) */
  content: string

  /** Skill metadata */
  metadata: CloudSkillMetadata

  /** Privacy level */
  privacy: 'private' | 'team' | 'public'

  /** Content checksum (SHA-256) */
  checksum: string

  /** Creation timestamp (ISO 8601) */
  createdAt: string

  /** Last update timestamp (ISO 8601) */
  updatedAt: string
}

/**
 * Cloud skill metadata
 *
 * Extended metadata for cloud-stored skills.
 */
export interface CloudSkillMetadata {
  /** Author username or ID */
  author: string

  /** Skill description */
  description: string

  /** Skill tags for discovery */
  tags: string[]

  /** Skill category */
  category: string

  /** Download count */
  downloads?: number

  /** Star/like count */
  stars?: number

  /** Minimum CCJK version required */
  minCcjkVersion?: string
}

/**
 * Sync state for a skill
 *
 * Tracks synchronization status between local and cloud.
 */
export interface SyncState {
  /** Skill ID */
  skillId: string

  /** Last sync timestamp (ISO 8601) */
  lastSyncTime: string

  /** Local version */
  localVersion: string

  /** Remote version */
  remoteVersion: string

  /** Local content checksum */
  localChecksum: string

  /** Remote content checksum */
  remoteChecksum: string

  /**
   * Sync status
   * - synced: Local and remote are identical
   * - local_ahead: Local has newer changes
   * - remote_ahead: Remote has newer changes
   * - conflict: Both have different changes
   * - local_only: Skill exists only locally
   * - remote_only: Skill exists only remotely
   */
  status: 'synced' | 'local_ahead' | 'remote_ahead' | 'conflict' | 'local_only' | 'remote_only'

  /** Last sync error (if any) */
  lastError?: string
}

/**
 * Sync state storage
 *
 * Stores sync states for all skills.
 */
export interface SyncStateStorage {
  /** Storage version */
  version: string

  /** Last global sync timestamp */
  lastGlobalSync: string

  /** Sync states by skill ID */
  skills: Record<string, SyncState>
}

/**
 * Sync options
 *
 * Configuration for sync operations.
 */
export interface SyncOptions {
  /**
   * Conflict resolution strategy
   * - local: Keep local version
   * - remote: Keep remote version
   * - newer: Keep newer version based on timestamp
   * - prompt: Ask user for each conflict
   */
  conflictResolution?: 'local' | 'remote' | 'newer' | 'prompt'

  /**
   * Whether to perform dry run (no actual changes)
   */
  dryRun?: boolean

  /**
   * Whether to force sync (ignore conflicts)
   */
  force?: boolean

  /**
   * Filter by skill IDs (only sync these skills)
   */
  skillIds?: string[]

  /**
   * Filter by privacy level
   */
  privacy?: 'private' | 'team' | 'public'
}

/**
 * Sync result for a single skill
 *
 * Contains information about sync operation outcome.
 */
export interface SkillSyncResult {
  /** Skill ID */
  skillId: string

  /** Skill name */
  skillName: string

  /** Whether sync succeeded */
  success: boolean

  /**
   * Action taken
   * - uploaded: Skill was uploaded to cloud
   * - downloaded: Skill was downloaded from cloud
   * - skipped: Skill was skipped (already synced)
   * - conflict: Conflict detected and not resolved
   * - deleted_local: Skill was deleted locally
   * - deleted_remote: Skill was deleted remotely
   */
  action: 'uploaded' | 'downloaded' | 'skipped' | 'conflict' | 'deleted_local' | 'deleted_remote'

  /** Previous sync state */
  previousState?: SyncState

  /** New sync state */
  newState?: SyncState

  /** Error message (if failed) */
  error?: string
}

/**
 * Sync operation result
 *
 * Contains information about overall sync operation.
 */
export interface SyncResult {
  /** Whether overall sync succeeded */
  success: boolean

  /** Total skills processed */
  total: number

  /** Number of successful syncs */
  succeeded: number

  /** Number of failed syncs */
  failed: number

  /** Number of conflicts */
  conflicts: number

  /** Number of skills uploaded */
  uploaded: number

  /** Number of skills downloaded */
  downloaded: number

  /** Number of skills skipped */
  skipped: number

  /** Individual skill results */
  results: SkillSyncResult[]

  /** Overall error message (if failed) */
  error?: string

  /** Sync duration in milliseconds */
  durationMs: number
}

/**
 * Cloud API response wrapper
 */
export interface CloudApiResponse<T = unknown> {
  /** Whether request succeeded */
  success: boolean

  /** Response data */
  data?: T

  /** Error message */
  error?: string

  /** Error code */
  code?: string

  /** Response timestamp */
  timestamp: string
}

/**
 * List skills request options
 */
export interface ListSkillsOptions {
  /** Filter by privacy level */
  privacy?: 'private' | 'team' | 'public'

  /** Filter by author */
  author?: string

  /** Filter by tags */
  tags?: string[]

  /** Search query */
  query?: string

  /** Page number (1-based) */
  page?: number

  /** Page size */
  pageSize?: number

  /** Sort by field */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'downloads' | 'stars'

  /** Sort direction */
  sortDir?: 'asc' | 'desc'
}

/**
 * List skills response
 */
export interface ListSkillsResponse {
  /** Skills list */
  skills: CloudSkill[]

  /** Total count */
  total: number

  /** Current page */
  page: number

  /** Page size */
  pageSize: number

  /** Total pages */
  totalPages: number
}

/**
 * Upload skill request
 */
export interface UploadSkillRequest {
  /** Skill name */
  name: string

  /** Skill version */
  version: string

  /** Skill content */
  content: string

  /** Skill metadata */
  metadata: CloudSkillMetadata

  /** Privacy level */
  privacy: 'private' | 'team' | 'public'

  /** Content checksum */
  checksum: string
}

/**
 * Download skill request
 */
export interface DownloadSkillRequest {
  /** Skill ID */
  skillId: string

  /** Specific version (optional, defaults to latest) */
  version?: string
}

/**
 * Delete skill request
 */
export interface DeleteSkillRequest {
  /** Skill ID */
  skillId: string
}

/**
 * Conflict resolution choice
 */
export interface ConflictResolution {
  /** Skill ID */
  skillId: string

  /**
   * Resolution choice
   * - local: Keep local version
   * - remote: Keep remote version
   * - merge: Attempt to merge (not implemented yet)
   */
  choice: 'local' | 'remote' | 'merge'
}
