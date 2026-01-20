/**
 * Error Utilities
 * Error handling and custom error classes
 */

/**
 * Base custom error class
 */
export class BaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly details?: any,
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack,
    }
  }
}

/**
 * Validation error
 */
export class ValidationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

/**
 * Not found error
 */
export class NotFoundError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, details)
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'UNAUTHORIZED', 401, details)
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'FORBIDDEN', 403, details)
  }
}

/**
 * Conflict error
 */
export class ConflictError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details)
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'TIMEOUT', 408, details)
  }
}

/**
 * Internal error
 */
export class InternalError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'INTERNAL_ERROR', 500, details)
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', 500, details)
  }
}

/**
 * Network error
 */
export class NetworkError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 503, details)
  }
}

/**
 * Check if error is of specific type
 */
export function isErrorType<T extends Error>(
  error: unknown,
  errorClass: new (...args: any[]) => T,
): error is T {
  return error instanceof errorClass
}

/**
 * Get error message safely
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

/**
 * Get error stack safely
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack
  }
  return undefined
}

/**
 * Format error for logging
 */
export function formatError(error: unknown): {
  message: string
  name?: string
  code?: string
  statusCode?: number
  stack?: string
  details?: any
} {
  if (error instanceof BaseError) {
    return {
      message: error.message,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      details: error.details,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    }
  }

  return {
    message: String(error),
  }
}

/**
 * Wrap error with additional context
 */
export function wrapError(
  error: unknown,
  message: string,
  code?: string,
): BaseError {
  const originalMessage = getErrorMessage(error)
  const fullMessage = `${message}: ${originalMessage}`

  if (error instanceof BaseError) {
    return new BaseError(
      fullMessage,
      code || error.code,
      error.statusCode,
      error.details,
    )
  }

  return new BaseError(fullMessage, code)
}

/**
 * Try-catch wrapper that returns result or error
 */
export function tryCatch<T>(
  fn: () => T,
): { success: true, data: T } | { success: false, error: Error } {
  try {
    const data = fn()
    return { success: true, data }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}

/**
 * Async try-catch wrapper
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
): Promise<{ success: true, data: T } | { success: false, error: Error }> {
  try {
    const data = await fn()
    return { success: true, data }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}

/**
 * Assert condition or throw error
 */
export function assert(
  condition: boolean,
  message: string,
  ErrorClass: new (message: string) => Error = Error,
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message)
  }
}

/**
 * Create error handler
 */
export function createErrorHandler(
  handlers: Record<string, (error: Error) => void>,
  defaultHandler?: (error: Error) => void,
): (error: unknown) => void {
  return (error: unknown) => {
    if (error instanceof BaseError && error.code && handlers[error.code]) {
      handlers[error.code](error)
    }
    else if (error instanceof Error && handlers[error.name]) {
      handlers[error.name](error)
    }
    else if (defaultHandler) {
      defaultHandler(error instanceof Error ? error : new Error(String(error)))
    }
    else {
      throw error
    }
  }
}

/**
 * Aggregate multiple errors
 */
export class AggregateError extends BaseError {
  constructor(
    public readonly errors: Error[],
    message: string = 'Multiple errors occurred',
  ) {
    super(message, 'AGGREGATE_ERROR', 500, { errors })
  }

  static fromErrors(errors: Error[]): AggregateError {
    const message = `${errors.length} error(s) occurred: ${errors
      .map(e => e.message)
      .join(', ')}`
    return new AggregateError(errors, message)
  }
}

/**
 * Retry with error handling
 */
export async function retryWithErrorHandling<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    delay?: number
    shouldRetry?: (error: Error) => boolean
    onError?: (error: Error, attempt: number) => void
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    shouldRetry = () => true,
    onError,
  } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    }
    catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (onError) {
        onError(lastError, attempt)
      }

      if (attempt < maxAttempts && shouldRetry(lastError)) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      else {
        throw lastError
      }
    }
  }

  throw lastError!
}
