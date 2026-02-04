/**
 * Error Boundary - Centralized error handling for CCJK
 *
 * Provides consistent error handling across all modules with:
 * - Standardized error types
 * - Context-aware error messages
 * - Error recovery suggestions
 * - Logging integration
 */

import ansis from 'ansis'

/**
 * Base CCJK Error class
 */
export class CcjkError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: string,
    public originalError?: Error,
  ) {
    super(message)
    this.name = 'CcjkError'
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      originalError: this.originalError?.message,
      stack: this.stack,
    }
  }

  toString() {
    let output = `[${this.code}] ${this.message}`
    if (this.context) {
      output += ` (context: ${this.context})`
    }
    return output
  }
}

/**
 * Error Code Types
 */
export type ErrorCode
  = | 'CONFIG_INVALID'
    | 'CONFIG_MISSING'
    | 'API_KEY_MISSING'
    | 'API_KEY_INVALID'
    | 'NETWORK_ERROR'
    | 'NETWORK_TIMEOUT'
    | 'FILE_NOT_FOUND'
    | 'FILE_READ_ERROR'
    | 'FILE_WRITE_ERROR'
    | 'PARSE_ERROR'
    | 'VALIDATION_ERROR'
    | 'PERMISSION_DENIED'
    | 'LOCK_FILE_EXISTS'
    | 'VERSION_INCOMPATIBLE'
    | 'DEPENDENCY_MISSING'
    | 'UNKNOWN_ERROR'

/**
 * Specific error types
 */
export class ConfigError extends CcjkError {
  constructor(message: string, context?: string) {
    super('CONFIG_INVALID', message, context)
    this.name = 'ConfigError'
  }
}

export class ApiKeyError extends CcjkError {
  constructor(message: string, context?: string) {
    super('API_KEY_MISSING', message, context)
    this.name = 'ApiKeyError'
  }
}

export class NetworkError extends CcjkError {
  constructor(message: string, context?: string, originalError?: Error) {
    super('NETWORK_ERROR', message, context, originalError)
    this.name = 'NetworkError'
  }
}

export class FileNotFoundError extends CcjkError {
  constructor(path: string, context?: string) {
    super('FILE_NOT_FOUND', `File not found: ${path}`, context)
    this.name = 'FileNotFoundError'
  }
}

export class ValidationError extends CcjkError {
  constructor(message: string, context?: string) {
    super('VALIDATION_ERROR', message, context)
    this.name = 'ValidationError'
  }
}

/**
 * Error Boundary class
 */
export class ErrorBoundary {
  /**
   * Handle an error and throw appropriate CcjkError
   */
  static handle(error: unknown, context: string): never {
    // Already a CcjkError
    if (error instanceof CcjkError) {
      this.log(error)
      throw error
    }

    // Standard Error
    if (error instanceof Error) {
      const ccjkError = new CcjkError(
        'UNKNOWN_ERROR',
        error.message,
        context,
        error,
      )
      this.log(ccjkError)
      throw ccjkError
    }

    // Unknown error type
    const ccjkError = new CcjkError(
      'UNKNOWN_ERROR',
      String(error),
      context,
    )
    this.log(ccjkError)
    throw ccjkError
  }

  /**
   * Wrap a synchronous function with error handling
   */
  static wrap<T>(fn: () => T, context: string): T {
    try {
      return fn()
    }
    catch (error) {
      ErrorBoundary.handle(error, context)
      // Never reached, handle always throws
      throw new Error('Unreachable')
    }
  }

  /**
   * Wrap an async function with error handling
   */
  static async wrapAsync<T>(fn: () => Promise<T>, context: string): Promise<T> {
    try {
      return await fn()
    }
    catch (error) {
      ErrorBoundary.handle(error, context)
      // Never reached, handle always throws
      throw new Error('Unreachable')
    }
  }

  /**
   * Log error with formatting
   */
  private static log(error: CcjkError): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${error.toString()}`

    // Console error with color
    console.error(ansis.red(logMessage))

    // Debug logging in development
    if (process.env.CCJK_DEBUG) {
      console.error(ansis.gray('Stack:'), error.stack)
    }
  }

  /**
   * Get recovery suggestion for an error
   */
  static getSuggestion(error: CcjkError): string {
    const suggestions: Record<ErrorCode, string> = {
      CONFIG_INVALID: 'Run `ccjk doctor` to diagnose configuration issues',
      CONFIG_MISSING: 'Run `ccjk init` to create a configuration file',
      API_KEY_MISSING: 'Run `ccjk api` to configure API key',
      API_KEY_INVALID: 'Check your API key and run `ccjk api` to reconfigure',
      NETWORK_ERROR: 'Check your internet connection and try again',
      NETWORK_TIMEOUT: 'The request timed out, check your connection and try again',
      FILE_NOT_FOUND: 'Verify the file path and run `ccjk doctor`',
      FILE_READ_ERROR: 'Check file permissions and try again',
      FILE_WRITE_ERROR: 'Check file permissions and disk space',
      PARSE_ERROR: 'The configuration file is corrupted, run `ccjk doctor --fix`',
      VALIDATION_ERROR: 'Check your input and try again',
      PERMISSION_DENIED: 'Check file permissions or run with appropriate privileges',
      LOCK_FILE_EXISTS: 'Another CCJK instance is running, wait a moment or run `ccjk --force-unlock`',
      VERSION_INCOMPATIBLE: `Update CCJK: npm update -g ccjk`,
      DEPENDENCY_MISSING: 'Run `ccjk doctor` to check dependencies',
      UNKNOWN_ERROR: 'Run `ccjk doctor` for diagnostic information',
    }

    return suggestions[error.code as ErrorCode] || suggestions.UNKNOWN_ERROR
  }

  /**
   * Format error for user display
   */
  static format(error: CcjkError): string {
    const parts: string[] = []

    // Error code with color
    parts.push(ansis.red(`[${error.code}]`))

    // Error message
    parts.push(ansis.white(error.message))

    // Context
    if (error.context) {
      parts.push(ansis.gray(`(${error.context})`))
    }

    // Suggestion
    const suggestion = ErrorBoundary.getSuggestion(error)
    parts.push(ansis.yellow(`\n💡 ${suggestion}`))

    return parts.join(' ')
  }
}
