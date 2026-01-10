/**
 * Subagent management types for Claude Code 2.1.x context: fork feature
 */

/**
 * Skill.md file reference for subagent configuration
 */
export interface SkillMdFile {
  /**
   * Path to the skill.md file
   */
  path: string

  /**
   * Skill name
   */
  name: string

  /**
   * Skill description
   */
  description?: string
}

/**
 * Subagent configuration
 */
export interface SubagentConfig {
  /**
   * Unique identifier for the subagent
   */
  id: string

  /**
   * Human-readable name for the subagent
   */
  name: string

  /**
   * Execution mode:
   * - fork: Creates a new isolated context
   * - inherit: Inherits parent context
   */
  mode: 'fork' | 'inherit'

  /**
   * Optional skill.md file to load for the subagent
   */
  skill?: SkillMdFile

  /**
   * Parent subagent ID (for nested subagents)
   */
  parentId?: string

  /**
   * List of allowed tools for this subagent
   * If not specified, all tools are allowed
   */
  allowedTools?: string[]

  /**
   * Timeout in milliseconds
   * Default: 300000 (5 minutes)
   */
  timeout?: number

  /**
   * Initial prompt/task for the subagent
   */
  initialPrompt?: string

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>
}

/**
 * Transcript entry type
 */
export type TranscriptEntryType = 'user' | 'assistant' | 'tool' | 'system' | 'error'

/**
 * Single entry in the subagent transcript
 */
export interface TranscriptEntry {
  /**
   * Timestamp of the entry
   */
  timestamp: Date

  /**
   * Type of the entry
   */
  type: TranscriptEntryType

  /**
   * Content of the entry
   */
  content: string

  /**
   * Optional metadata for the entry
   */
  metadata?: Record<string, any>

  /**
   * Tool name (if type is 'tool')
   */
  toolName?: string

  /**
   * Tool result (if type is 'tool')
   */
  toolResult?: any
}

/**
 * Subagent execution status
 */
export type SubagentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled'

/**
 * Subagent state tracking
 */
export interface SubagentState {
  /**
   * Unique identifier
   */
  id: string

  /**
   * Subagent configuration
   */
  config: SubagentConfig

  /**
   * Current execution status
   */
  status: SubagentStatus

  /**
   * Execution transcript
   */
  transcript: TranscriptEntry[]

  /**
   * Start timestamp
   */
  startedAt: Date

  /**
   * End timestamp (if completed/failed/timeout)
   */
  endedAt?: Date

  /**
   * Execution result (if completed)
   */
  result?: any

  /**
   * Error message (if failed)
   */
  error?: string

  /**
   * Timeout timer reference
   */
  timeoutTimer?: NodeJS.Timeout

  /**
   * Child subagent IDs
   */
  children?: string[]
}

/**
 * Subagent event types
 */
export interface SubagentEvents {
  /**
   * Emitted when a subagent starts
   */
  start: (state: SubagentState) => void

  /**
   * Emitted when a subagent completes successfully
   */
  complete: (state: SubagentState) => void

  /**
   * Emitted when a subagent fails
   */
  fail: (state: SubagentState) => void

  /**
   * Emitted when a subagent times out
   */
  timeout: (state: SubagentState) => void

  /**
   * Emitted when a subagent is cancelled
   */
  cancel: (state: SubagentState) => void

  /**
   * Emitted when a transcript entry is added
   */
  transcript: (state: SubagentState, entry: TranscriptEntry) => void

  /**
   * Emitted when status changes
   */
  statusChange: (state: SubagentState, oldStatus: SubagentStatus, newStatus: SubagentStatus) => void
}

/**
 * Transcript save options
 */
export interface TranscriptSaveOptions {
  /**
   * Output format
   */
  format?: 'json' | 'markdown' | 'both'

  /**
   * Output directory
   * Default: ~/.claude/transcripts/
   */
  outputDir?: string

  /**
   * Include metadata in output
   */
  includeMetadata?: boolean

  /**
   * Pretty print JSON
   */
  prettyPrint?: boolean
}

/**
 * Transcript cleanup options
 */
export interface TranscriptCleanupOptions {
  /**
   * Maximum age in days
   * Transcripts older than this will be deleted
   */
  maxAgeDays?: number

  /**
   * Maximum number of transcripts to keep
   */
  maxCount?: number

  /**
   * Dry run mode (don't actually delete)
   */
  dryRun?: boolean
}

/**
 * Subagent manager options
 */
export interface SubagentManagerOptions {
  /**
   * Default timeout for subagents (ms)
   * Default: 300000 (5 minutes)
   */
  defaultTimeout?: number

  /**
   * Maximum number of concurrent subagents
   * Default: 10
   */
  maxConcurrent?: number

  /**
   * Auto-save transcripts
   * Default: true
   */
  autoSaveTranscripts?: boolean

  /**
   * Transcript save directory
   * Default: ~/.claude/transcripts/
   */
  transcriptDir?: string

  /**
   * Enable verbose logging
   */
  verbose?: boolean
}
