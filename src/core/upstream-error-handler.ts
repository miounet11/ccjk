/**
 * Upstream Error Handler
 *
 * Handles errors from upstream API providers (Claude, OpenAI, etc.)
 * and triggers appropriate recovery actions like auto-compact.
 *
 * @module core/upstream-error-handler
 */

import type { HookContext } from './hook-skill-bridge'
import { getHookSkillBridge, triggerHooks } from './hook-skill-bridge'
import { getLifecycleManager } from './lifecycle-hooks'

// ============================================================================
// Types
// ============================================================================

/**
 * Upstream error types that can trigger recovery actions
 */
export type UpstreamErrorType =
  | 'context_overflow'      // Context/token limit exceeded
  | 'rate_limit'            // Rate limit hit
  | 'overloaded'            // Server overloaded
  | 'timeout'               // Request timeout
  | 'authentication'        // Auth error
  | 'invalid_request'       // Bad request
  | 'server_error'          // 5xx errors
  | 'unknown'               // Unknown error

/**
 * Parsed upstream error
 */
export interface UpstreamError {
  type: UpstreamErrorType
  message: string
  code?: string
  statusCode?: number
  retryAfter?: number
  provider?: string
  recoverable: boolean
  suggestedAction?: 'compact' | 'retry' | 'wait' | 'reauthenticate' | 'none'
}

/**
 * Error handler configuration
 */
export interface UpstreamErrorHandlerConfig {
  /** Enable auto-compact on context overflow */
  autoCompactOnOverflow: boolean
  /** Enable auto-retry on rate limit */
  autoRetryOnRateLimit: boolean
  /** Maximum retry attempts */
  maxRetries: number
  /** Base delay for exponential backoff (ms) */
  baseRetryDelay: number
  /** Callback when auto-compact is triggered */
  onAutoCompact?: (error: UpstreamError) => Promise<void> | void
  /** Callback when retry is triggered */
  onRetry?: (error: UpstreamError, attempt: number) => void
}

// ============================================================================
// Error Detection Patterns
// ============================================================================

/**
 * Patterns to detect context overflow errors
 */
const CONTEXT_OVERFLOW_PATTERNS = [
  /context.?length/i,
  /token.?limit/i,
  /max.?tokens/i,
  /context.?window/i,
  /too.?many.?tokens/i,
  /exceeds?.?(?:the)?.?(?:maximum)?.?(?:context|token)/i,
  /input.?too.?long/i,
  /prompt.?too.?long/i,
  /conversation.?too.?long/i,
]

/**
 * Patterns to detect rate limit errors
 */
const RATE_LIMIT_PATTERNS = [
  /rate.?limit/i,
  /too.?many.?requests/i,
  /quota.?exceeded/i,
  /throttl/i,
]

/**
 * Patterns to detect overloaded errors
 */
const OVERLOADED_PATTERNS = [
  /overloaded/i,
  /capacity/i,
  /busy/i,
  /unavailable/i,
  /try.?again.?later/i,
]

// ============================================================================
// Upstream Error Handler
// ============================================================================

/**
 * Upstream Error Handler
 *
 * Detects and handles errors from upstream API providers,
 * triggering appropriate recovery actions.
 */
export class UpstreamErrorHandler {
  private config: UpstreamErrorHandlerConfig
  private retryCount: Map<string, number> = new Map()

  constructor(config?: Partial<UpstreamErrorHandlerConfig>) {
    this.config = {
      autoCompactOnOverflow: config?.autoCompactOnOverflow ?? true,
      autoRetryOnRateLimit: config?.autoRetryOnRateLimit ?? true,
      maxRetries: config?.maxRetries ?? 3,
      baseRetryDelay: config?.baseRetryDelay ?? 1000,
      onAutoCompact: config?.onAutoCompact,
      onRetry: config?.onRetry,
    }
  }

  // ==========================================================================
  // Error Detection
  // ==========================================================================

  /**
   * Parse an error into a structured UpstreamError
   */
  parseError(error: Error | string | unknown): UpstreamError {
    const message = this.extractMessage(error)
    const statusCode = this.extractStatusCode(error)
    const code = this.extractErrorCode(error)

    // Detect error type
    const type = this.detectErrorType(message, statusCode, code)

    // Determine if recoverable and suggested action
    const { recoverable, suggestedAction } = this.getRecoveryInfo(type, statusCode)

    return {
      type,
      message,
      code,
      statusCode,
      retryAfter: this.extractRetryAfter(error),
      provider: this.extractProvider(error),
      recoverable,
      suggestedAction,
    }
  }

  /**
   * Detect error type from message and status code
   */
  private detectErrorType(
    message: string,
    statusCode?: number,
    code?: string,
  ): UpstreamErrorType {
    // Check for context overflow
    if (CONTEXT_OVERFLOW_PATTERNS.some(p => p.test(message))) {
      return 'context_overflow'
    }

    // Check for rate limit
    if (statusCode === 429 || RATE_LIMIT_PATTERNS.some(p => p.test(message))) {
      return 'rate_limit'
    }

    // Check for overloaded
    if (statusCode === 503 || OVERLOADED_PATTERNS.some(p => p.test(message))) {
      return 'overloaded'
    }

    // Check for timeout
    if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT' || /timeout/i.test(message)) {
      return 'timeout'
    }

    // Check for authentication
    if (statusCode === 401 || statusCode === 403 || /auth|unauthorized|forbidden/i.test(message)) {
      return 'authentication'
    }

    // Check for invalid request
    if (statusCode === 400 || /invalid|bad.?request/i.test(message)) {
      return 'invalid_request'
    }

    // Check for server error
    if (statusCode && statusCode >= 500) {
      return 'server_error'
    }

    return 'unknown'
  }

  /**
   * Get recovery information for error type
   */
  private getRecoveryInfo(
    type: UpstreamErrorType,
    statusCode?: number,
  ): { recoverable: boolean, suggestedAction: UpstreamError['suggestedAction'] } {
    switch (type) {
      case 'context_overflow':
        return { recoverable: true, suggestedAction: 'compact' }
      case 'rate_limit':
        return { recoverable: true, suggestedAction: 'wait' }
      case 'overloaded':
        return { recoverable: true, suggestedAction: 'retry' }
      case 'timeout':
        return { recoverable: true, suggestedAction: 'retry' }
      case 'authentication':
        return { recoverable: false, suggestedAction: 'reauthenticate' }
      case 'invalid_request':
        return { recoverable: false, suggestedAction: 'none' }
      case 'server_error':
        return { recoverable: true, suggestedAction: 'retry' }
      default:
        return { recoverable: false, suggestedAction: 'none' }
    }
  }

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  /**
   * Handle an upstream error with appropriate recovery action
   */
  async handleError(error: Error | string | unknown): Promise<{
    handled: boolean
    action: string
    shouldRetry: boolean
    retryDelay?: number
  }> {
    const parsed = this.parseError(error)

    // Trigger error hook
    await this.triggerErrorHook(parsed)

    // Handle based on error type
    switch (parsed.type) {
      case 'context_overflow':
        return this.handleContextOverflow(parsed)

      case 'rate_limit':
        return this.handleRateLimit(parsed)

      case 'overloaded':
      case 'timeout':
      case 'server_error':
        return this.handleRetryableError(parsed)

      default:
        return {
          handled: false,
          action: 'none',
          shouldRetry: false,
        }
    }
  }

  /**
   * Handle context overflow error
   */
  private async handleContextOverflow(error: UpstreamError): Promise<{
    handled: boolean
    action: string
    shouldRetry: boolean
  }> {
    if (!this.config.autoCompactOnOverflow) {
      return {
        handled: false,
        action: 'none',
        shouldRetry: false,
      }
    }

    console.log('🗜️  Context overflow detected, triggering auto-compact...')

    // Call custom handler if provided
    if (this.config.onAutoCompact) {
      await this.config.onAutoCompact(error)
    }

    // Trigger auto-compact hook
    await triggerHooks('Error', {
      source: 'upstream',
      error: {
        message: error.message,
      },
      data: {
        errorType: 'context_overflow',
        action: 'auto_compact',
      },
    })

    return {
      handled: true,
      action: 'auto_compact',
      shouldRetry: true,
    }
  }

  /**
   * Handle rate limit error
   */
  private async handleRateLimit(error: UpstreamError): Promise<{
    handled: boolean
    action: string
    shouldRetry: boolean
    retryDelay?: number
  }> {
    const retryDelay = error.retryAfter
      ? error.retryAfter * 1000
      : this.calculateBackoff('rate_limit')

    if (!this.config.autoRetryOnRateLimit) {
      return {
        handled: false,
        action: 'none',
        shouldRetry: false,
      }
    }

    console.log(`⏳ Rate limit hit, waiting ${Math.round(retryDelay / 1000)}s before retry...`)

    return {
      handled: true,
      action: 'wait_and_retry',
      shouldRetry: true,
      retryDelay,
    }
  }

  /**
   * Handle retryable errors (overloaded, timeout, server error)
   */
  private async handleRetryableError(error: UpstreamError): Promise<{
    handled: boolean
    action: string
    shouldRetry: boolean
    retryDelay?: number
  }> {
    const retryKey = error.type
    const currentRetries = this.retryCount.get(retryKey) || 0

    if (currentRetries >= this.config.maxRetries) {
      this.retryCount.delete(retryKey)
      return {
        handled: false,
        action: 'max_retries_exceeded',
        shouldRetry: false,
      }
    }

    this.retryCount.set(retryKey, currentRetries + 1)
    const retryDelay = this.calculateBackoff(retryKey, currentRetries)

    if (this.config.onRetry) {
      this.config.onRetry(error, currentRetries + 1)
    }

    console.log(`🔄 ${error.type} error, retry ${currentRetries + 1}/${this.config.maxRetries} in ${Math.round(retryDelay / 1000)}s...`)

    return {
      handled: true,
      action: 'retry',
      shouldRetry: true,
      retryDelay,
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Extract error message from various error types
   */
  private extractMessage(error: unknown): string {
    if (typeof error === 'string') return error
    if (error instanceof Error) return error.message
    if (error && typeof error === 'object') {
      const obj = error as Record<string, unknown>
      return String(obj.message || obj.error || obj.detail || JSON.stringify(error))
    }
    return String(error)
  }

  /**
   * Extract status code from error
   */
  private extractStatusCode(error: unknown): number | undefined {
    if (error && typeof error === 'object') {
      const obj = error as Record<string, unknown>
      const status = obj.status || obj.statusCode || obj.code
      if (typeof status === 'number') return status
    }
    return undefined
  }

  /**
   * Extract error code from error
   */
  private extractErrorCode(error: unknown): string | undefined {
    if (error && typeof error === 'object') {
      const obj = error as Record<string, unknown>
      if (typeof obj.code === 'string') return obj.code
      if (typeof obj.error_code === 'string') return obj.error_code
    }
    return undefined
  }

  /**
   * Extract retry-after header value
   */
  private extractRetryAfter(error: unknown): number | undefined {
    if (error && typeof error === 'object') {
      const obj = error as Record<string, unknown>
      const retryAfter = obj.retryAfter || obj.retry_after
      if (typeof retryAfter === 'number') return retryAfter
      if (typeof retryAfter === 'string') return Number.parseInt(retryAfter, 10)
    }
    return undefined
  }

  /**
   * Extract provider from error
   */
  private extractProvider(error: unknown): string | undefined {
    if (error && typeof error === 'object') {
      const obj = error as Record<string, unknown>
      if (typeof obj.provider === 'string') return obj.provider
    }
    return undefined
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(key: string, attempt: number = 0): number {
    const jitter = Math.random() * 0.3 + 0.85 // 0.85-1.15
    return Math.min(
      this.config.baseRetryDelay * (2 ** attempt) * jitter,
      60000, // Max 60 seconds
    )
  }

  /**
   * Trigger error hook for monitoring
   */
  private async triggerErrorHook(error: UpstreamError): Promise<void> {
    try {
      const lifecycle = getLifecycleManager()
      await lifecycle.handleError(
        new Error(error.message),
        `upstream:${error.type}`,
      )
    }
    catch {
      // Ignore hook errors
    }
  }

  /**
   * Reset retry count for a specific error type
   */
  resetRetryCount(type?: UpstreamErrorType): void {
    if (type) {
      this.retryCount.delete(type)
    }
    else {
      this.retryCount.clear()
    }
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<UpstreamErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let handlerInstance: UpstreamErrorHandler | null = null

/**
 * Get the singleton upstream error handler
 */
export function getUpstreamErrorHandler(): UpstreamErrorHandler {
  if (!handlerInstance) {
    handlerInstance = new UpstreamErrorHandler()
  }
  return handlerInstance
}

/**
 * Initialize upstream error handler with configuration
 */
export function initUpstreamErrorHandler(
  config?: Partial<UpstreamErrorHandlerConfig>,
): UpstreamErrorHandler {
  handlerInstance = new UpstreamErrorHandler(config)
  return handlerInstance
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Handle an upstream error
 */
export async function handleUpstreamError(error: unknown): Promise<{
  handled: boolean
  action: string
  shouldRetry: boolean
  retryDelay?: number
}> {
  const handler = getUpstreamErrorHandler()
  return handler.handleError(error)
}

/**
 * Check if an error is a context overflow error
 */
export function isContextOverflowError(error: unknown): boolean {
  const handler = getUpstreamErrorHandler()
  const parsed = handler.parseError(error)
  return parsed.type === 'context_overflow'
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  const handler = getUpstreamErrorHandler()
  const parsed = handler.parseError(error)
  return parsed.recoverable
}
