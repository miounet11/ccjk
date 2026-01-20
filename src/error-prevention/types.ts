/**
 * Error Prevention System Types
 */

/**
 * Write options
 */
export interface WriteOptions {
  /** Enable automatic backup before overwrite */
  backup?: boolean
  /** Maximum retry attempts */
  maxRetries?: number
  /** Force overwrite without checking */
  force?: boolean
}

/**
 * Write result
 */
export interface WriteResult {
  /** Operation success */
  success: boolean
  /** Action taken */
  action: 'written' | 'edited' | 'appended' | 'overwritten' | 'skipped' | 'failed'
  /** Success/info message */
  message?: string
  /** Error message */
  error?: string
  /** Suggestion for fixing error */
  suggestion?: string
  /** Number of retries */
  retries?: number
  /** Additional details */
  details?: Record<string, any>
}

/**
 * Bash options
 */
export interface BashOptions {
  /** Working directory */
  cwd?: string
  /** Command timeout in milliseconds */
  timeout?: number
  /** Environment variables */
  env?: Record<string, string>
  /** Maximum retry attempts */
  maxRetries?: number
  /** Enable auto-fix */
  autoFix?: boolean
}

/**
 * Bash result
 */
export interface BashResult {
  /** Execution success */
  success: boolean
  /** Standard output */
  stdout?: string
  /** Standard error */
  stderr?: string
  /** Exit code */
  exitCode: number
  /** Error message */
  error?: string
  /** Suggestion for fixing error */
  suggestion?: string
  /** Number of retries */
  retries?: number
}

/**
 * Path options
 */
export interface PathOptions {
  /** Base path for relative paths */
  basePath?: string
  /** Resolve symbolic links */
  resolveSymlinks?: boolean
}

/**
 * Path result
 */
export interface PathResult {
  /** Resolved path */
  path: string
  /** Path is valid */
  valid: boolean
  /** Path exists */
  exists: boolean
  /** Path type */
  type?: 'file' | 'directory' | 'symlink' | 'unknown'
  /** Path permissions */
  permissions?: {
    readable: boolean
    writable: boolean
    executable: boolean
  }
}

/**
 * Error type
 */
export type ErrorType
  = | 'file_exists'
    | 'file_not_found'
    | 'permission_denied'
    | 'invalid_path'
    | 'command_not_found'
    | 'invalid_parameters'
    | 'timeout'
    | 'unknown'

/**
 * Error analysis result
 */
export interface ErrorAnalysis {
  /** Error type */
  type: ErrorType
  /** Is retryable */
  retryable: boolean
  /** Auto-fixable */
  autoFixable: boolean
  /** Suggested fix */
  suggestion: string
}
