/**
 * CCJK Context Management API Types
 *
 * Type definitions for context management, sessions, and token optimization.
 *
 * @module types/context-api
 */

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session status
 */
export type SessionStatus = 'active' | 'archived' | 'deleted'

/**
 * Git information associated with a session
 */
export interface SessionGitInfo {
  branch?: string
  commitHash?: string
  forkPoint?: string
  remoteUrl?: string
  isDetached?: boolean
  rootPath?: string
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  tags?: string[]
  color?: string
  pinned?: boolean
  archived?: boolean
  projectPath?: string
  [key: string]: unknown
}

/**
 * Session summary information
 */
export interface SessionSummary {
  id: string
  createdAt: string
  updatedAt: string
  messageCount: number
  tokenEstimate: number
  keyDecisions: string[]
  codeChanges: CodeChange[]
  topics: string[]
  summary: string
}

/**
 * Code change record
 */
export interface CodeChange {
  file: string
  action: 'create' | 'modify' | 'delete' | 'rename'
  description?: string
  linesAdded?: number
  linesRemoved?: number
}

/**
 * Session in list response
 */
export interface SessionListItem {
  id: string
  name?: string
  provider?: string
  model?: string
  status: SessionStatus
  createdAt: string
  lastUsedAt: string
  messageCount: number
  tokenEstimate: number
  gitInfo?: SessionGitInfo
  metadata?: SessionMetadata
  forkedFrom?: string
  forkCount?: number
}

/**
 * Full session details
 */
export interface Session {
  id: string
  name?: string
  provider?: string
  apiKey?: string
  apiUrl?: string
  model?: string
  status: SessionStatus
  createdAt: string
  lastUsedAt: string
  gitInfo?: SessionGitInfo
  metadata?: SessionMetadata
  forkedFrom?: string
  forks?: string[]
  summaries?: SessionSummary[]
  latestSummary?: SessionSummary
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message role
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * Message type
 */
export type MessageType = 'user' | 'assistant' | 'system' | 'tool_use' | 'tool_result'

/**
 * Content block types
 */
export interface TextContentBlock {
  type: 'text'
  text: string
}

export interface ImageContentBlock {
  type: 'image'
  source: {
    type: 'base64' | 'url'
    mediaType: string
    data: string
  }
}

export interface ToolUseContentBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultContentBlock {
  type: 'tool_result'
  toolUseId: string
  content: string | ContentBlock[]
  isError?: boolean
}

export type ContentBlock
  = | TextContentBlock
    | ImageContentBlock
    | ToolUseContentBlock
    | ToolResultContentBlock

/**
 * Tool use result
 */
export interface ToolUseResult {
  toolUseId: string
  toolName: string
  result: unknown
  isError?: boolean
  duration?: number
}

/**
 * Session message
 */
export interface SessionMessage {
  uuid: string
  sessionId: string
  type: MessageType
  role: MessageRole
  content: string | ContentBlock[]
  timestamp: string
  toolUseResult?: ToolUseResult
  importanceScore?: number
  tokenEstimate?: number
  metadata?: Record<string, unknown>
}

/**
 * Message in list response (lighter weight)
 */
export interface MessageListItem {
  uuid: string
  type: MessageType
  role: MessageRole
  contentPreview: string
  timestamp: string
  tokenEstimate?: number
  importanceScore?: number
}

// ============================================================================
// Context Statistics Types
// ============================================================================

/**
 * Context usage statistics
 */
export interface ContextUsageStats {
  estimatedTokens: number
  maxTokens: number
  usagePercentage: number
  turnCount: number
  messageCount: number
  lastCompactedAt?: string
  warningThreshold: number
  criticalThreshold: number
}

/**
 * Token estimation request
 */
export interface TokenEstimateRequest {
  content: string | ContentBlock[]
  includeSystemPrompt?: boolean
}

/**
 * Token estimation response
 */
export interface TokenEstimateResponse {
  success: boolean
  data: {
    estimatedTokens: number
    breakdown?: {
      text: number
      code: number
      images: number
      toolUse: number
    }
  }
}

// ============================================================================
// Compact/Compression Types
// ============================================================================

/**
 * Compact options
 */
export interface CompactOptions {
  keepLastN?: number
  archiveThreshold?: number
  preserveDecisions?: boolean
  preserveCodeChanges?: boolean
  generateSummary?: boolean
}

/**
 * Compact result
 */
export interface CompactResult {
  success: boolean
  data: {
    originalMessageCount: number
    compactedMessageCount: number
    archivedMessageCount: number
    tokensBefore: number
    tokensAfter: number
    tokensSaved: number
    savingsPercentage: number
    summary?: SessionSummary
    archiveId?: string
  }
}

// ============================================================================
// Archive Types
// ============================================================================

/**
 * Archive entry
 */
export interface ArchiveEntry {
  id: string
  sessionId: string
  messageCount: number
  tokenEstimate: number
  createdAt: string
  startTimestamp: string
  endTimestamp: string
}

/**
 * Archive list response
 */
export interface ArchiveListResponse {
  success: boolean
  data: {
    archives: ArchiveEntry[]
    totalCount: number
  }
}

/**
 * Archive detail response
 */
export interface ArchiveDetailResponse {
  success: boolean
  data: {
    archive: ArchiveEntry
    messages: SessionMessage[]
  }
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Session list request parameters
 */
export interface ListSessionsParams {
  status?: SessionStatus
  sortBy?: 'name' | 'createdAt' | 'lastUsedAt' | 'messageCount'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
  search?: string
  tags?: string[]
  gitBranch?: string
}

/**
 * Session list response
 */
export interface ListSessionsResponse {
  success: boolean
  data: {
    sessions: SessionListItem[]
    totalCount: number
    hasMore: boolean
  }
}

/**
 * Get session response
 */
export interface GetSessionResponse {
  success: boolean
  data: {
    session: Session
  }
}

/**
 * Create session request
 */
export interface CreateSessionRequest {
  name?: string
  provider?: string
  model?: string
  gitInfo?: SessionGitInfo
  metadata?: SessionMetadata
  forkedFrom?: string
}

/**
 * Create session response
 */
export interface CreateSessionResponse {
  success: boolean
  data: {
    session: Session
  }
}

/**
 * Update session request
 */
export interface UpdateSessionRequest {
  name?: string
  provider?: string
  model?: string
  status?: SessionStatus
  gitInfo?: SessionGitInfo
  metadata?: SessionMetadata
}

/**
 * Update session response
 */
export interface UpdateSessionResponse {
  success: boolean
  data: {
    session: Session
  }
}

/**
 * Delete session response
 */
export interface DeleteSessionResponse {
  success: boolean
  message: string
}

/**
 * List messages request parameters
 */
export interface ListMessagesParams {
  limit?: number
  offset?: number
  before?: string
  after?: string
  since?: string
  role?: MessageRole
  type?: MessageType
  minImportance?: number
}

/**
 * List messages response
 */
export interface ListMessagesResponse {
  success: boolean
  data: {
    messages: SessionMessage[]
    totalCount: number
    hasMore: boolean
  }
}

/**
 * Add message request
 */
export interface AddMessageRequest {
  type: MessageType
  role: MessageRole
  content: string | ContentBlock[]
  toolUseResult?: ToolUseResult
  metadata?: Record<string, unknown>
}

/**
 * Add message response
 */
export interface AddMessageResponse {
  success: boolean
  data: {
    message: SessionMessage
    contextStats: ContextUsageStats
  }
}

/**
 * Get summary response
 */
export interface GetSummaryResponse {
  success: boolean
  data: {
    summary: SessionSummary
  }
}

/**
 * List summaries response
 */
export interface ListSummariesResponse {
  success: boolean
  data: {
    summaries: SessionSummary[]
    totalCount: number
  }
}

/**
 * Get context stats response
 */
export interface GetContextStatsResponse {
  success: boolean
  data: ContextUsageStats
}

/**
 * Compact session request
 */
export interface CompactSessionRequest {
  options?: CompactOptions
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

/**
 * Context warning event
 */
export interface ContextWarningEvent {
  type: 'context:warning'
  sessionId: string
  stats: ContextUsageStats
  timestamp: string
}

/**
 * Context critical event
 */
export interface ContextCriticalEvent {
  type: 'context:critical'
  sessionId: string
  stats: ContextUsageStats
  timestamp: string
}

/**
 * Session auto-saved event
 */
export interface SessionAutoSavedEvent {
  type: 'session:auto-saved'
  sessionId: string
  trigger: AutoSaveTrigger
  messageCount: number
  timestamp: string
}

/**
 * Session compacted event
 */
export interface SessionCompactedEvent {
  type: 'session:compacted'
  sessionId: string
  result: CompactResult['data']
  timestamp: string
}

/**
 * Crash recovery available event
 */
export interface CrashRecoveryAvailableEvent {
  type: 'crash:recovery-available'
  sessionId: string
  recoveryData: CrashRecoveryData
  timestamp: string
}

/**
 * Auto save trigger types
 */
export type AutoSaveTrigger
  = | 'message_count'
    | 'time_interval'
    | 'exit'
    | 'crash_recovery'
    | 'manual'
    | 'context_compact'

/**
 * Crash recovery data
 */
export interface CrashRecoveryData {
  sessionId: string
  lastSaveTime: number
  messageCount: number
  pendingMessages: SessionMessage[]
  contextSnapshot?: string
}

/**
 * All WebSocket events
 */
export type ContextWebSocketEvent
  = | ContextWarningEvent
    | ContextCriticalEvent
    | SessionAutoSavedEvent
    | SessionCompactedEvent
    | CrashRecoveryAvailableEvent

// ============================================================================
// Error Types
// ============================================================================

/**
 * Context API error codes
 */
export type ContextApiErrorCode
  = | 'SESSION_NOT_FOUND'
    | 'MESSAGE_NOT_FOUND'
    | 'ARCHIVE_NOT_FOUND'
    | 'SUMMARY_NOT_FOUND'
    | 'CONTEXT_OVERFLOW'
    | 'COMPACT_FAILED'
    | 'INVALID_SESSION_STATUS'
    | 'UNAUTHORIZED'
    | 'NETWORK_ERROR'
    | 'TIMEOUT'
    | 'UNKNOWN_ERROR'

/**
 * Context API error
 */
export class ContextApiError extends Error {
  constructor(
    message: string,
    public code: ContextApiErrorCode,
    public statusCode?: number,
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ContextApiError'
  }
}
