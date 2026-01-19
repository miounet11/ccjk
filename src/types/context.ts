/**
 * Context Compression System Types
 * Type definitions for CLI wrapper and shell hook system
 */

/**
 * Shell types supported by the hook system
 */
export type ShellType = 'bash' | 'zsh' | 'fish' | 'unknown'

/**
 * Shell hook configuration
 */
export interface ShellHookConfig {
  shellType: ShellType
  hookScript: string
  rcFile: string
}

/**
 * Shell hook installation result
 */
export interface ShellHookInstallResult {
  success: boolean
  shellType: ShellType
  rcFile: string
  message: string
  error?: string
}

/**
 * CLI wrapper options
 */
export interface ClaudeWrapperOptions {
  debug?: boolean
  noWrap?: boolean
}

/**
 * Process execution result
 */
export interface ProcessResult {
  exitCode: number
  stdout: string
  stderr: string
  signal?: string
}

/**
 * Context session status
 */
export interface ContextSessionStatus {
  sessionId: string
  messageCount: number
  tokenEstimate: number
  needsCompact: boolean
  oldestMessage: string
  newestMessage: string
}

/**
 * Context management options
 */
export interface ContextManagementOptions {
  lang?: 'zh-CN' | 'en'
  verbose?: boolean
}

// ============================================================================
// Session & Function Call Types
// ============================================================================

/**
 * Unique identifier types
 */
export type SessionId = string
export type FCId = string
export type ProjectHash = string

/**
 * Function call status
 */
export type FCStatus = 'success' | 'error' | 'timeout'

/**
 * Summary model options
 */
export type SummaryModel = 'haiku' | 'user-default'

/**
 * Function call summary
 */
export interface FCSummary {
  fcId: string
  fcName: string
  summary: string
  tokens: number
  timestamp: Date
}

/**
 * Session status
 */
export type SessionStatus = 'active' | 'completed' | 'archived'

/**
 * Session data
 */
export interface Session {
  id: string
  projectPath: string
  projectHash: string
  startTime: Date
  endTime?: Date
  status: SessionStatus
  tokenCount: number
  fcCount: number
  summaries: FCSummary[]
}

/**
 * Session configuration
 */
export interface SessionConfig {
  contextThreshold: number // 0.8 = 80%
  maxContextTokens: number // 200000
  summaryModel: SummaryModel
  autoSummarize: boolean
}

/**
 * Summarization request
 */
export interface SummarizationRequest {
  fcName: string
  fcArgs: Record<string, any>
  fcResult: string
  fcId: string
}

/**
 * Summarization response
 */
export interface SummarizationResponse {
  fcId: string
  summary: string
  tokens: number
}

/**
 * Threshold level
 */
export type ThresholdLevel = 'normal' | 'warning' | 'critical'

/**
 * Session event types
 */
export type SessionEventType
  = | 'session_created'
    | 'session_completed'
    | 'threshold_warning'
    | 'threshold_critical'
    | 'fc_summarized'
    | 'session_archived'

/**
 * Session event
 */
export interface SessionEvent {
  type: SessionEventType
  sessionId: string
  timestamp: Date
  data?: any
}

/**
 * API retry configuration
 */
export interface RetryConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
}

/**
 * Token estimation result
 */
export interface TokenEstimation {
  total: number
  chineseChars: number
  otherChars: number
}
