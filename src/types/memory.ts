/**
 * Cross-Session AI Memory System Types
 * Provides type definitions for persistent memory storage and retrieval
 */

/**
 * Memory entry types for categorization
 */
export type MemoryType =
  | 'decision'      // Architectural/design decisions
  | 'pattern'       // Code patterns and conventions
  | 'preference'    // User preferences
  | 'context'       // Project context
  | 'learning'      // Learned insights
  | 'error'         // Error patterns and solutions
  | 'workflow'      // Workflow patterns

/**
 * Memory entry importance levels
 */
export type MemoryImportance = 'critical' | 'high' | 'medium' | 'low'

/**
 * Memory entry scope
 */
export type MemoryScope = 'global' | 'project' | 'session'

/**
 * Source of memory entry
 */
export interface MemorySource {
  /** Session ID where memory was captured */
  sessionId: string
  /** Timestamp of capture */
  timestamp: number
  /** File path if applicable */
  filePath?: string
  /** Command that triggered capture */
  command?: string
  /** Project name */
  project?: string
}

/**
 * Embedding vector for semantic search
 */
export interface MemoryEmbedding {
  /** Vector representation */
  vector: number[]
  /** Model used for embedding */
  model: string
  /** Timestamp of embedding generation */
  generatedAt: number
}

/**
 * Core memory entry structure
 */
export interface MemoryEntry {
  /** Unique identifier */
  id: string
  /** Memory type */
  type: MemoryType
  /** Memory scope */
  scope: MemoryScope
  /** Importance level */
  importance: MemoryImportance
  /** Main content */
  content: string
  /** Summary for quick reference */
  summary: string
  /** Tags for categorization */
  tags: string[]
  /** Source information */
  source: MemorySource
  /** Embedding for semantic search */
  embedding?: MemoryEmbedding
  /** Related memory IDs */
  relatedIds: string[]
  /** Access count for relevance scoring */
  accessCount: number
  /** Last accessed timestamp */
  lastAccessed: number
  /** Creation timestamp */
  createdAt: number
  /** Update timestamp */
  updatedAt: number
  /** Whether memory is archived */
  archived: boolean
  /** Custom metadata */
  metadata: Record<string, unknown>
}

/**
 * Memory index for fast lookups
 */
export interface MemoryIndex {
  /** Index by type */
  byType: Record<MemoryType, string[]>
  /** Index by scope */
  byScope: Record<MemoryScope, string[]>
  /** Index by tag */
  byTag: Record<string, string[]>
  /** Index by project */
  byProject: Record<string, string[]>
  /** Index by importance */
  byImportance: Record<MemoryImportance, string[]>
  /** Last updated timestamp */
  updatedAt: number
}

/**
 * Memory store configuration
 */
export interface MemoryConfig {
  /** Enable memory system */
  enabled: boolean
  /** Storage directory path */
  storagePath: string
  /** Maximum memories to store */
  maxMemories: number
  /** Auto-capture enabled */
  autoCapture: boolean
  /** Auto-inject relevant memories */
  autoInject: boolean
  /** Maximum memories to inject per query */
  maxInjectCount: number
  /** Minimum similarity score for retrieval (0-1) */
  minSimilarity: number
  /** Embedding model to use */
  embeddingModel: 'local' | 'openai' | 'anthropic'
  /** Archive memories older than (days) */
  archiveAfterDays: number
  /** Delete archived memories after (days) */
  deleteArchivedAfterDays: number
}

/**
 * Memory retrieval query
 */
export interface MemoryQuery {
  /** Text query for semantic search */
  text?: string
  /** Filter by types */
  types?: MemoryType[]
  /** Filter by scopes */
  scopes?: MemoryScope[]
  /** Filter by tags */
  tags?: string[]
  /** Filter by project */
  project?: string
  /** Filter by importance */
  importance?: MemoryImportance[]
  /** Maximum results */
  limit?: number
  /** Include archived */
  includeArchived?: boolean
  /** Minimum similarity score */
  minSimilarity?: number
}

/**
 * Memory retrieval result
 */
export interface MemoryResult {
  /** Memory entry */
  entry: MemoryEntry
  /** Similarity score (0-1) */
  score: number
  /** Match reason */
  matchReason: 'semantic' | 'tag' | 'type' | 'project' | 'combined'
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  /** Total memory count */
  totalCount: number
  /** Count by type */
  byType: Record<MemoryType, number>
  /** Count by scope */
  byScope: Record<MemoryScope, number>
  /** Count by importance */
  byImportance: Record<MemoryImportance, number>
  /** Archived count */
  archivedCount: number
  /** Storage size in bytes */
  storageSizeBytes: number
  /** Last updated */
  lastUpdated: number
}

/**
 * Auto-capture pattern configuration
 */
export interface CapturePattern {
  /** Pattern name */
  name: string
  /** Regex pattern to match */
  pattern: RegExp
  /** Memory type to assign */
  type: MemoryType
  /** Default importance */
  importance: MemoryImportance
  /** Default scope */
  scope: MemoryScope
  /** Tags to add */
  tags: string[]
  /** Whether pattern is enabled */
  enabled: boolean
}

/**
 * Memory export format
 */
export interface MemoryExport {
  /** Export version */
  version: string
  /** Export timestamp */
  exportedAt: number
  /** Memories */
  memories: MemoryEntry[]
  /** Index */
  index: MemoryIndex
  /** Config used */
  config: MemoryConfig
}

/**
 * Memory injection context
 */
export interface MemoryInjectionContext {
  /** Current query/prompt */
  query: string
  /** Current project */
  project?: string
  /** Current file */
  currentFile?: string
  /** Session ID */
  sessionId: string
  /** Additional context */
  additionalContext?: string
}

/**
 * Memory injection result
 */
export interface MemoryInjection {
  /** Injected memories */
  memories: MemoryResult[]
  /** Formatted context string */
  contextString: string
  /** Token estimate */
  tokenEstimate: number
}

/**
 * Default memory configuration
 */
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  enabled: true,
  storagePath: '~/.claude/memory',
  maxMemories: 10000,
  autoCapture: true,
  autoInject: true,
  maxInjectCount: 5,
  minSimilarity: 0.7,
  embeddingModel: 'local',
  archiveAfterDays: 90,
  deleteArchivedAfterDays: 365,
}
