/**
 * Sandbox mode type definitions
 */

/**
 * Sandbox configuration interface
 */
export interface SandboxConfig {
  /** Enable sandbox mode */
  enabled: boolean
  /** Isolate requests to prevent cross-contamination */
  isolateRequests: boolean
  /** Mask sensitive data in logs and responses */
  maskSensitiveData: boolean
  /** Enable audit logging */
  auditLog: boolean
  /** Maximum requests per minute (rate limiting) */
  maxRequestsPerMinute?: number
  /** Audit log directory */
  auditLogDir?: string
}

/**
 * Sandbox request wrapper
 */
export interface SandboxRequest {
  /** Original request data */
  original: any
  /** Request ID for tracking */
  requestId: string
  /** Timestamp */
  timestamp: number
  /** Request metadata */
  metadata?: Record<string, any>
}

/**
 * Sandbox response wrapper
 */
export interface SandboxResponse {
  /** Original response data */
  original: any
  /** Request ID for correlation */
  requestId: string
  /** Timestamp */
  timestamp: number
  /** Response metadata */
  metadata?: Record<string, any>
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /** Log entry ID */
  id: string
  /** Log type */
  type: 'request' | 'response' | 'error'
  /** Timestamp */
  timestamp: number
  /** Request/Response data */
  data: any
  /** Additional metadata */
  metadata?: Record<string, any>
  /** Error information (if type is 'error') */
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

/**
 * Audit log filter
 */
export interface AuditLogFilter {
  /** Filter by type */
  type?: 'request' | 'response' | 'error'
  /** Start timestamp */
  startTime?: number
  /** End timestamp */
  endTime?: number
  /** Filter by request ID */
  requestId?: string
  /** Maximum number of results */
  limit?: number
}

/**
 * Rate limiter quota information
 */
export interface RateLimitQuota {
  /** Limit key */
  key: string
  /** Maximum requests allowed */
  limit: number
  /** Remaining quota */
  remaining: number
  /** Reset timestamp */
  resetAt: number
}

/**
 * Sensitive field patterns
 */
export type SensitiveFieldPattern
  = | 'apiKey'
    | 'password'
    | 'token'
    | 'secret'
    | 'credential'
    | 'auth'
    | 'bearer'
    | 'authorization'

/**
 * Data masking options
 */
export interface MaskingOptions {
  /** Show first N characters */
  showFirst?: number
  /** Show last N characters */
  showLast?: number
  /** Mask character */
  maskChar?: string
  /** Custom patterns to mask */
  customPatterns?: RegExp[]
}

/**
 * Sandbox status
 */
export interface SandboxStatus {
  /** Is sandbox enabled */
  enabled: boolean
  /** Current configuration */
  config: SandboxConfig
  /** Statistics */
  stats: {
    /** Total requests processed */
    totalRequests: number
    /** Total responses processed */
    totalResponses: number
    /** Total errors logged */
    totalErrors: number
    /** Rate limit hits */
    rateLimitHits: number
  }
}
