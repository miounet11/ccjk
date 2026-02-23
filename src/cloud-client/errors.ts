/**
 * Standardized Cloud Client Error Handling
 *
 * Provides unified error codes, localized messages, and utility functions
 * for all cloud client operations.
 *
 * @module cloud-client/errors
 */

import { i18n } from '../i18n/index.js'

/**
 * Standard cloud error codes
 */
export enum CloudErrorCode {
  /** Authentication failed (401) */
  AUTH_ERROR = 'AUTH_ERROR',
  /** Rate limit exceeded (429) */
  RATE_LIMIT = 'RATE_LIMIT',
  /** Response schema mismatch or validation error */
  SCHEMA_MISMATCH = 'SCHEMA_MISMATCH',
  /** Network connection error */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Request timeout */
  TIMEOUT = 'TIMEOUT',
  /** Server error (5xx) */
  SERVER_ERROR = 'SERVER_ERROR',
  /** Resource not found (404) */
  NOT_FOUND = 'NOT_FOUND',
  /** Generic API error (4xx) */
  API_ERROR = 'API_ERROR',
  /** Validation error (client-side) */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** Unknown error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Cloud error metadata
 */
export interface CloudErrorMetadata {
  /** HTTP status code if applicable */
  statusCode?: number
  /** Original error object */
  originalError?: unknown
  /** Additional context data */
  context?: Record<string, any>
  /** Retry attempt number */
  retryAttempt?: number
  /** Request ID for tracking */
  requestId?: string
}

/**
 * Standardized Cloud Error Class
 *
 * Extends Error with cloud-specific error codes and localized messages
 */
export class CloudError extends Error {
  /** Error code */
  readonly code: CloudErrorCode

  /** HTTP status code if applicable */
  readonly statusCode?: number

  /** Original error */
  readonly originalError?: unknown

  /** Additional context */
  readonly context?: Record<string, any>

  /** Retry attempt number */
  readonly retryAttempt?: number

  /** Request ID */
  readonly requestId?: string

  /** Whether this error is retryable */
  readonly isRetryable: boolean

  constructor(
    code: CloudErrorCode,
    message: string,
    metadata?: CloudErrorMetadata,
  ) {
    super(message)
    this.name = 'CloudError'
    this.code = code
    this.statusCode = metadata?.statusCode
    this.originalError = metadata?.originalError
    this.context = metadata?.context
    this.retryAttempt = metadata?.retryAttempt
    this.requestId = metadata?.requestId
    this.isRetryable = isRetryableErrorCode(code)

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CloudError)
    }
  }

  /**
   * Get localized error message
   */
  getLocalizedMessage(language?: string): string {
    const lang = language || i18n.language
    return i18n.t(`cloud:errors.${this.code}`, { lng: lang }) || this.message
  }

  /**
   * Get user-friendly error message with context
   */
  getUserMessage(language?: string): string {
    const localizedMsg = this.getLocalizedMessage(language)

    // Add context if available
    if (this.statusCode) {
      return `${localizedMsg} (HTTP ${this.statusCode})`
    }

    return localizedMsg
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      isRetryable: this.isRetryable,
      retryAttempt: this.retryAttempt,
      requestId: this.requestId,
      context: this.context,
      stack: this.stack,
    }
  }
}

/**
 * Error factory functions
 */
export const CloudErrorFactory = {
  /**
   * Create error from HTTP response
   */
  fromHttpStatus(
    statusCode: number,
    message: string,
    metadata?: Omit<CloudErrorMetadata, 'statusCode'>,
  ): CloudError {
    let code: CloudErrorCode

    if (statusCode === 401 || statusCode === 403) {
      code = CloudErrorCode.AUTH_ERROR
    }
    else if (statusCode === 404) {
      code = CloudErrorCode.NOT_FOUND
    }
    else if (statusCode === 429) {
      code = CloudErrorCode.RATE_LIMIT
    }
    else if (statusCode >= 500) {
      code = CloudErrorCode.SERVER_ERROR
    }
    else if (statusCode >= 400) {
      code = CloudErrorCode.API_ERROR
    }
    else {
      code = CloudErrorCode.UNKNOWN_ERROR
    }

    return new CloudError(code, message, { ...metadata, statusCode })
  },

  /**
   * Create authentication error
   */
  auth(message?: string, metadata?: CloudErrorMetadata): CloudError {
    return new CloudError(
      CloudErrorCode.AUTH_ERROR,
      message || 'Authentication failed',
      { ...metadata, statusCode: metadata?.statusCode || 401 },
    )
  },

  /**
   * Create rate limit error
   */
  rateLimit(message?: string, metadata?: CloudErrorMetadata): CloudError {
    return new CloudError(
      CloudErrorCode.RATE_LIMIT,
      message || 'Rate limit exceeded',
      { ...metadata, statusCode: metadata?.statusCode || 429 },
    )
  },

  /**
   * Create schema mismatch error
   */
  schemaMismatch(message?: string, metadata?: CloudErrorMetadata): CloudError {
    return new CloudError(
      CloudErrorCode.SCHEMA_MISMATCH,
      message || 'Response schema validation failed',
      metadata,
    )
  },

  /**
   * Create network error
   */
  network(error: unknown, metadata?: CloudErrorMetadata): CloudError {
    const message = error instanceof Error
      ? error.message
      : 'Network connection failed'

    return new CloudError(
      CloudErrorCode.NETWORK_ERROR,
      message,
      { ...metadata, originalError: error },
    )
  },

  /**
   * Create timeout error
   */
  timeout(timeoutMs: number, metadata?: CloudErrorMetadata): CloudError {
    return new CloudError(
      CloudErrorCode.TIMEOUT,
      `Request timeout after ${timeoutMs}ms`,
      metadata,
    )
  },

  /**
   * Create server error
   */
  server(message?: string, metadata?: CloudErrorMetadata): CloudError {
    return new CloudError(
      CloudErrorCode.SERVER_ERROR,
      message || 'Server error occurred',
      { ...metadata, statusCode: metadata?.statusCode || 500 },
    )
  },

  /**
   * Create not found error
   */
  notFound(resource?: string, metadata?: CloudErrorMetadata): CloudError {
    const message = resource
      ? `Resource not found: ${resource}`
      : 'Resource not found'

    return new CloudError(
      CloudErrorCode.NOT_FOUND,
      message,
      { ...metadata, statusCode: metadata?.statusCode || 404 },
    )
  },

  /**
   * Create validation error
   */
  validation(message: string, metadata?: CloudErrorMetadata): CloudError {
    return new CloudError(
      CloudErrorCode.VALIDATION_ERROR,
      message,
      { ...metadata, statusCode: metadata?.statusCode || 400 },
    )
  },

  /**
   * Create unknown error
   */
  unknown(error: unknown, metadata?: CloudErrorMetadata): CloudError {
    const message = error instanceof Error
      ? error.message
      : 'An unknown error occurred'

    return new CloudError(
      CloudErrorCode.UNKNOWN_ERROR,
      message,
      { ...metadata, originalError: error },
    )
  },
}

/**
 * Error handling utilities
 */

/**
 * Check if error code is retryable
 */
export function isRetryableErrorCode(code: CloudErrorCode): boolean {
  return [
    CloudErrorCode.NETWORK_ERROR,
    CloudErrorCode.TIMEOUT,
    CloudErrorCode.SERVER_ERROR,
    CloudErrorCode.RATE_LIMIT,
  ].includes(code)
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof CloudError) {
    return error.isRetryable
  }

  // Check for network-related errors in regular Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network')
      || message.includes('connection')
      || message.includes('timeout')
      || message.includes('econnrefused')
      || message.includes('enotfound')
      || message.includes('etimedout')
    )
  }

  return false
}

/**
 * Check if error is authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof CloudError) {
    return error.code === CloudErrorCode.AUTH_ERROR
  }
  return false
}

/**
 * Check if error is rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof CloudError) {
    return error.code === CloudErrorCode.RATE_LIMIT
  }
  return false
}

/**
 * Handle cloud error with logging and user-friendly message
 */
export function handleCloudError(
  error: unknown,
  context?: string,
  language?: string,
): CloudError {
  // Already a CloudError
  if (error instanceof CloudError) {
    return error
  }

  // Convert to CloudError
  let cloudError: CloudError

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Detect error type from message
    if (message.includes('timeout') || message.includes('timed out')) {
      cloudError = CloudErrorFactory.timeout(10000, { originalError: error })
    }
    else if (
      message.includes('econnrefused')
      || message.includes('enotfound')
      || message.includes('network')
    ) {
      cloudError = CloudErrorFactory.network(error)
    }
    else if (message.includes('401') || message.includes('unauthorized')) {
      cloudError = CloudErrorFactory.auth(error.message, { originalError: error })
    }
    else if (message.includes('429') || message.includes('rate limit')) {
      cloudError = CloudErrorFactory.rateLimit(error.message, { originalError: error })
    }
    else if (message.includes('404') || message.includes('not found')) {
      cloudError = CloudErrorFactory.notFound(undefined, { originalError: error })
    }
    else {
      cloudError = CloudErrorFactory.unknown(error)
    }
  }
  else {
    cloudError = CloudErrorFactory.unknown(error)
  }

  // Add context if provided (create new error with context)
  if (context && !cloudError.context) {
    return new CloudError(
      cloudError.code,
      cloudError.message,
      {
        statusCode: cloudError.statusCode,
        originalError: cloudError.originalError,
        context: { operation: context },
        retryAttempt: cloudError.retryAttempt,
        requestId: cloudError.requestId,
      },
    )
  }
  else if (context && cloudError.context) {
    return new CloudError(
      cloudError.code,
      cloudError.message,
      {
        statusCode: cloudError.statusCode,
        originalError: cloudError.originalError,
        context: { ...cloudError.context, operation: context },
        retryAttempt: cloudError.retryAttempt,
        requestId: cloudError.requestId,
      },
    )
  }

  return cloudError
}

/**
 * Get retry delay for error (exponential backoff)
 */
export function getRetryDelay(
  error: CloudError,
  attempt: number,
  config?: {
    initialDelay?: number
    multiplier?: number
    maxDelay?: number
  },
): number {
  const initialDelay = config?.initialDelay || 100
  const multiplier = config?.multiplier || 2
  const maxDelay = config?.maxDelay || 10000

  // Special handling for rate limit errors
  if (error.code === CloudErrorCode.RATE_LIMIT) {
    // Use longer delays for rate limits
    return Math.min(initialDelay * 10 * multiplier ** attempt, maxDelay)
  }

  // Standard exponential backoff
  return Math.min(initialDelay * multiplier ** attempt, maxDelay)
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: unknown): Record<string, any> {
  if (error instanceof CloudError) {
    return error.toJSON()
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    error: String(error),
  }
}

// Re-export for backward compatibility
export { CloudError as CloudClientError }
export type { CloudErrorCode as CloudClientErrorType }
