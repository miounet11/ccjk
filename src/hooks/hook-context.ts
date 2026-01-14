/**
 * Hook context definitions
 * Provides context data passed to hooks during execution
 */

/**
 * Base context interface shared by all hook contexts
 */
export interface BaseHookContext {
  /** Timestamp when the hook was triggered */
  timestamp: number
  /** Session ID for tracking related operations */
  sessionId?: string
}

/**
 * Context passed to PreRequest hooks
 * Contains information about the outgoing API request
 */
export interface PreRequestContext extends BaseHookContext {
  /** API provider being used (e.g., 'anthropic', '302ai', 'openai') */
  provider: string
  /** Model being requested (e.g., 'claude-3-5-sonnet-20241022') */
  model: string
  /** Request messages (sanitized, without sensitive data) */
  messages?: Array<{
    role: string
    content: string
  }>
  /** Request metadata */
  metadata?: {
    maxTokens?: number
    temperature?: number
    [key: string]: any
  }
}

/**
 * Context passed to PostResponse hooks
 * Contains information about the received API response
 */
export interface PostResponseContext extends BaseHookContext {
  /** API provider that handled the request */
  provider: string
  /** Model that generated the response */
  model: string
  /** Response content (sanitized) */
  response?: {
    content?: string
    stopReason?: string
  }
  /** Request latency in milliseconds */
  latency: number
  /** Token usage information */
  tokens?: {
    input?: number
    output?: number
    total?: number
  }
  /** Whether the request was successful */
  success: boolean
}

/**
 * Context passed to ProviderSwitch hooks
 * Contains information about provider switching
 */
export interface ProviderSwitchContext extends BaseHookContext {
  /** Provider being switched from */
  fromProvider: string
  /** Provider being switched to */
  toProvider: string
  /** Reason for the switch */
  reason: string
  /** Previous provider configuration */
  previousConfig?: {
    model?: string
    baseUrl?: string
  }
  /** New provider configuration */
  newConfig?: {
    model?: string
    baseUrl?: string
  }
}

/**
 * Context passed to Error hooks
 * Contains information about errors that occurred
 */
export interface ErrorContext extends BaseHookContext {
  /** Error message */
  error: string
  /** Error type/code */
  errorType?: string
  /** Stack trace (if available) */
  stack?: string
  /** Provider where the error occurred */
  provider?: string
  /** Number of retry attempts made */
  retryCount?: number
  /** Operation that failed */
  operation?: string
  /** Additional error metadata */
  metadata?: Record<string, any>
}

/**
 * Context passed to SessionStart hooks
 * Contains information about session initialization
 */
export interface SessionStartContext extends BaseHookContext {
  /** Session ID */
  sessionId: string
  /** User identifier (if available) */
  userId?: string
  /** Initial provider configuration */
  provider?: string
  /** Session metadata */
  metadata?: Record<string, any>
}

/**
 * Context passed to SessionEnd hooks
 * Contains information about session termination
 */
export interface SessionEndContext extends BaseHookContext {
  /** Session ID */
  sessionId: string
  /** Session duration in milliseconds */
  duration: number
  /** Total requests made during session */
  totalRequests?: number
  /** Total tokens used during session */
  totalTokens?: number
  /** Session termination reason */
  reason?: 'normal' | 'error' | 'timeout' | 'user-terminated'
  /** Session metadata */
  metadata?: Record<string, any>
}

/**
 * Union type of all hook contexts
 */
export type HookContext
  = | PreRequestContext
    | PostResponseContext
    | ProviderSwitchContext
    | ErrorContext
    | SessionStartContext
    | SessionEndContext

/**
 * Type guard to check if context is PreRequestContext
 */
export function isPreRequestContext(context: HookContext): context is PreRequestContext {
  return 'messages' in context
}

/**
 * Type guard to check if context is PostResponseContext
 */
export function isPostResponseContext(context: HookContext): context is PostResponseContext {
  return 'latency' in context && 'tokens' in context
}

/**
 * Type guard to check if context is ProviderSwitchContext
 */
export function isProviderSwitchContext(context: HookContext): context is ProviderSwitchContext {
  return 'fromProvider' in context && 'toProvider' in context
}

/**
 * Type guard to check if context is ErrorContext
 */
export function isErrorContext(context: HookContext): context is ErrorContext {
  return 'error' in context && typeof (context as any).error === 'string'
}

/**
 * Type guard to check if context is SessionStartContext
 */
export function isSessionStartContext(context: HookContext): context is SessionStartContext {
  return 'sessionId' in context && !('duration' in context)
}

/**
 * Type guard to check if context is SessionEndContext
 */
export function isSessionEndContext(context: HookContext): context is SessionEndContext {
  return 'sessionId' in context && 'duration' in context
}
