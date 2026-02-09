/**
 * Cloud Client API Types
 *
 * Type definitions for the CCJK Cloud API v1.0.0
 * @module cloud-client/types
 */

/**
 * Project analysis request payload
 */
export interface ProjectAnalysisRequest {
  /** Project root directory path */
  projectRoot: string
  /** Package.json dependencies */
  dependencies?: Record<string, string>
  /** Dev dependencies */
  devDependencies?: Record<string, string>
  /** Git repository URL */
  gitRemote?: string
  /** Project language (zh-CN, en, ja, ko) */
  language?: string
  /** CCJK version */
  ccjkVersion?: string
}

/**
 * Recommended tool or workflow
 */
export interface Recommendation {
  /** Unique identifier */
  id: string
  /** Display name (multilingual) */
  name: Record<string, string>
  /** Description (multilingual) */
  description: Record<string, string>
  /** Category: skill, mcp, agent, hook */
  category: 'skill' | 'mcp' | 'agent' | 'hook'
  /** Relevance score (0-1) */
  relevanceScore: number
  /** Install command */
  installCommand?: string
  /** Configuration JSON */
  config?: Record<string, any>
  /** Tags for filtering */
  tags?: string[]
  /** Dependencies required */
  dependencies?: string[]
}

/**
 * Project analysis response
 */
export interface ProjectAnalysisResponse {
  /** Unique request ID for tracking */
  requestId: string
  /** Array of personalized recommendations */
  recommendations: Recommendation[]
  /** Project type detection result */
  projectType?: string
  /** Framework detection results */
  frameworks?: string[]
}

/**
 * Template type
 */
export type TemplateType = 'workflow' | 'output-style' | 'prompt' | 'agent'

/**
 * Template response
 */
export interface TemplateResponse {
  /** Unique template identifier */
  id: string
  /** Template type */
  type: TemplateType
  /** Template name (multilingual) */
  name: Record<string, string>
  /** Template description (multilingual) */
  description: Record<string, string>
  /** Template content */
  content: string
  /** Version */
  version: string
  /** Author */
  author?: string
  /** Tags */
  tags?: string[]
  /** Required parameters */
  parameters?: TemplateParameter[]
  /** ISO 8601 creation timestamp */
  createdAt: string
  /** ISO 8601 update timestamp */
  updatedAt: string
}

/**
 * Template parameter definition
 */
export interface TemplateParameter {
  /** Parameter name */
  name: string
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  /** Required flag */
  required: boolean
  /** Default value */
  default?: any
  /** Description (multilingual) */
  description?: Record<string, string>
}

/**
 * Batch template request
 */
export interface BatchTemplateRequest {
  /** Template IDs to fetch */
  ids: string[]
  /** Language for translations */
  language?: string
}

/**
 * Batch template response
 */
export interface BatchTemplateResponse {
  /** Request ID for tracking */
  requestId: string
  /** Map of template ID to template content */
  templates: Record<string, TemplateResponse>
  /** IDs that were not found */
  notFound: string[]
}

/**
 * Usage metric type
 */
export type MetricType
  = | 'template_download'
    | 'recommendation_shown'
    | 'recommendation_accepted'
    | 'analysis_completed'
    | 'error_occurred'

/**
 * Usage report payload
 */
export interface UsageReport {
  /** Unique report ID */
  reportId: string
  /** Metric type */
  metricType: MetricType
  /** ISO 8601 timestamp */
  timestamp: string
  /** CCJK version */
  ccjkVersion: string
  /** Node.js version */
  nodeVersion: string
  /** Operating system */
  platform: string
  /** Project language if applicable */
  language?: string
  /** Additional context data */
  data?: Record<string, any>
}

/**
 * Usage report response
 */
export interface UsageReportResponse {
  /** Success indicator */
  success: boolean
  /** Request ID */
  requestId: string
  /** Message from server */
  message?: string
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  /** Service health status */
  status: 'healthy' | 'degraded' | 'unhealthy'
  /** API version */
  version: string
  /** Current timestamp */
  timestamp: string
  /** Optional service messages */
  message?: string
}

/**
 * Cloud client error types
 */
export type CloudClientErrorType
  = | 'NETWORK_ERROR'
    | 'TIMEOUT_ERROR'
    | 'API_ERROR'
    | 'VALIDATION_ERROR'
    | 'AUTH_ERROR'
    | 'RATE_LIMIT_ERROR'
    | 'SERVER_ERROR'
    | 'UNKNOWN_ERROR'

/**
 * Cloud client error class
 */
export class CloudClientError extends Error {
  /** Error type */
  readonly type: CloudClientErrorType
  /** HTTP status code if applicable */
  readonly statusCode?: number
  /** Original error */
  readonly originalError?: unknown

  constructor(
    type: CloudClientErrorType,
    message: string,
    statusCode?: number,
    originalError?: unknown,
  ) {
    super(message)
    this.name = 'CloudClientError'
    this.type = type
    this.statusCode = statusCode
    this.originalError = originalError
  }

  /**
   * Create error from HTTP response
   */
  static fromResponse(statusCode: number, message: string): CloudClientError {
    let type: CloudClientErrorType

    if (statusCode === 401)
      type = 'AUTH_ERROR'
    else if (statusCode === 429)
      type = 'RATE_LIMIT_ERROR'
    else if (statusCode >= 500)
      type = 'SERVER_ERROR'
    else if (statusCode >= 400)
      type = 'API_ERROR'
    else type = 'UNKNOWN_ERROR'

    return new CloudClientError(type, message, statusCode)
  }

  /**
   * Create network error
   */
  static network(error: unknown): CloudClientError {
    return new CloudClientError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network connection failed',
      undefined,
      error,
    )
  }

  /**
   * Create timeout error
   */
  static timeout(timeout: number): CloudClientError {
    return new CloudClientError(
      'TIMEOUT_ERROR',
      `Request timeout after ${timeout}ms`,
    )
  }

  /**
   * Create validation error
   */
  static validation(message: string): CloudClientError {
    return new CloudClientError('VALIDATION_ERROR', message)
  }
}

/**
 * Cloud client configuration
 */
export interface CloudClientConfig {
  /** API base URL */
  baseURL: string
  /** Request timeout in milliseconds */
  timeout?: number
  /** CCJK version header */
  version?: string
  /** Enable caching */
  enableCache?: boolean
  /** Cache directory path */
  cacheDir?: string
  /** Enable retry logic */
  enableRetry?: boolean
  /** Maximum retry attempts */
  maxRetries?: number
  /** Enable telemetry reporting */
  enableTelemetry?: boolean
  /** API key if required */
  apiKey?: string
  /** Language for API responses */
  language?: string
}

/**
 * Cache entry metadata
 */
export interface CacheEntry<T> {
  /** Cached data */
  data: T
  /** Expiration timestamp */
  expiresAt: number
  /** Cache key */
  key: string
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number
  /** Initial delay in milliseconds */
  initialDelay: number
  /** Backoff multiplier */
  multiplier: number
  /** Maximum delay in milliseconds */
  maxDelay: number
  /** HTTP status codes to retry */
  retryableStatusCodes: number[]
}

/**
 * Telemetry event
 */
export interface TelemetryEvent {
  /** Event type */
  type: MetricType
  /** Event data */
  data?: Record<string, any>
  /** Event timestamp */
  timestamp: string
}

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /** Enable telemetry reporting */
  enabled: boolean
  /** Batch size before sending */
  batchSize: number
  /** Maximum time to wait before sending (ms) */
  flushInterval: number
  /** Anonymous user ID */
  userId?: string
}
