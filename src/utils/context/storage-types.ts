/**
 * Storage type definitions for CCJK Context Compression System
 * Defines all data structures for persistent storage
 */

/**
 * Session status enumeration
 */
export type SessionStatus = 'active' | 'completed' | 'archived'

/**
 * Function call status enumeration
 */
export type FCStatus = 'success' | 'error'

/**
 * Sync queue item status
 */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'

/**
 * Session metadata stored in meta.json
 */
export interface SessionMeta {
  /** Unique session identifier */
  id: string
  /** Absolute path to project directory */
  projectPath: string
  /** Hash identifier for project */
  projectHash: string
  /** Session start time (ISO 8601) */
  startTime: string
  /** Session end time (ISO 8601) */
  endTime?: string
  /** Current session status */
  status: SessionStatus
  /** Total tokens used in session */
  tokenCount: number
  /** Tokens used for summaries */
  summaryTokens: number
  /** Total function call count */
  fcCount: number
  /** CCJK version that created this session */
  version: string
  /** Optional session description */
  description?: string
  /** Last updated timestamp */
  lastUpdated: string
}

/**
 * Function call log entry stored in fc-log.jsonl (JSON Lines format)
 */
export interface FCLogEntry {
  /** Timestamp (ISO 8601) */
  ts: string
  /** Unique function call identifier */
  id: string
  /** Function name */
  fc: string
  /** Function arguments (may be truncated) */
  args: Record<string, unknown>
  /** Function result (truncated if large) */
  result?: string
  /** Token count for this FC */
  tokens: number
  /** Execution duration in milliseconds */
  duration: number
  /** AI-generated summary of this FC */
  summary: string
  /** Execution status */
  status: FCStatus
  /** Error message if status is 'error' */
  error?: string
}

/**
 * Complete session data including metadata and logs
 */
export interface Session {
  /** Session metadata */
  meta: SessionMeta
  /** Path to session directory */
  path: string
  /** Path to FC log file */
  fcLogPath: string
  /** Path to summary file */
  summaryPath: string
}

/**
 * Current session pointer stored in current.json
 */
export interface CurrentSessionPointer {
  /** Current active session ID */
  sessionId: string
  /** Last updated timestamp */
  lastUpdated: string
}

/**
 * Cloud sync queue item
 */
export interface SyncQueueItem {
  /** Unique queue item identifier */
  id: string
  /** Type of data to sync */
  type: 'session' | 'summary' | 'fc-log'
  /** Associated session ID */
  sessionId: string
  /** Data payload to sync */
  data: unknown
  /** Creation timestamp (ISO 8601) */
  createdAt: string
  /** Current sync status */
  status: SyncStatus
  /** Number of retry attempts */
  retries: number
  /** Last error message if failed */
  lastError?: string
  /** Next retry timestamp */
  nextRetry?: string
}

/**
 * Context system configuration
 */
export interface ContextConfig {
  /** Enable context compression system */
  enabled: boolean
  /** Automatically generate summaries */
  autoSummarize: boolean
  /** Token threshold to trigger summarization */
  contextThreshold: number
  /** Maximum context tokens before compression */
  maxContextTokens: number
  /** Model to use for summarization */
  summaryModel: 'haiku' | 'user-default'
  /** Cloud sync configuration */
  cloudSync: {
    /** Enable cloud synchronization */
    enabled: boolean
    /** API key for cloud service */
    apiKey?: string
    /** Cloud service endpoint */
    endpoint?: string
  }
  /** Cleanup policies */
  cleanup: {
    /** Maximum session age in days */
    maxSessionAge: number
    /** Maximum storage size in MB */
    maxStorageSize: number
    /** Auto-cleanup enabled */
    autoCleanup: boolean
  }
  /** Storage paths */
  storage: {
    /** Base directory for context storage */
    baseDir: string
    /** Sessions subdirectory */
    sessionsDir: string
    /** Sync queue subdirectory */
    syncQueueDir: string
  }
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /** Total number of sessions */
  totalSessions: number
  /** Number of active sessions */
  activeSessions: number
  /** Number of completed sessions */
  completedSessions: number
  /** Number of archived sessions */
  archivedSessions: number
  /** Total storage size in bytes */
  totalSize: number
  /** Total token count across all sessions */
  totalTokens: number
  /** Total FC count across all sessions */
  totalFCs: number
  /** Oldest session timestamp */
  oldestSession?: string
  /** Newest session timestamp */
  newestSession?: string
  /** Number of pending sync items */
  pendingSyncItems: number
}

/**
 * Session list query options
 */
export interface SessionListOptions {
  /** Filter by project hash */
  projectHash?: string
  /** Filter by status */
  status?: SessionStatus
  /** Limit number of results */
  limit?: number
  /** Sort order */
  sortBy?: 'startTime' | 'endTime' | 'tokenCount'
  /** Sort direction */
  sortOrder?: 'asc' | 'desc'
}

/**
 * FC log query options
 */
export interface FCLogQueryOptions {
  /** Start from this timestamp */
  startTime?: string
  /** End at this timestamp */
  endTime?: string
  /** Filter by function name */
  functionName?: string
  /** Filter by status */
  status?: FCStatus
  /** Limit number of results */
  limit?: number
}

/**
 * Storage operation result
 */
export interface StorageResult<T = void> {
  /** Operation success status */
  success: boolean
  /** Result data if successful */
  data?: T
  /** Error message if failed */
  error?: string
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  /** Number of sessions cleaned */
  sessionsRemoved: number
  /** Number of bytes freed */
  bytesFreed: number
  /** List of removed session IDs */
  removedSessionIds: string[]
  /** Cleanup duration in milliseconds */
  duration: number
}
