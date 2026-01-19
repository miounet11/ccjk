/**
 * Statistics type definitions for CCJK usage tracking
 */

/**
 * API provider identifier
 */
export type ApiProvider = '302ai' | 'glm' | 'minimax' | 'kimi' | 'anthropic' | 'openai' | 'custom' | string

/**
 * Time period for statistics
 */
export type StatsPeriod = '1d' | '7d' | '30d' | '90d' | 'all'

/**
 * Single request record
 */
export interface RequestRecord {
  /** Timestamp of the request */
  timestamp: number
  /** API provider used */
  provider: ApiProvider
  /** Model used for the request */
  model?: string
  /** Input tokens consumed */
  inputTokens: number
  /** Output tokens generated */
  outputTokens: number
  /** Total tokens (input + output) */
  totalTokens: number
  /** Request latency in milliseconds */
  latency: number
  /** Whether the request was successful */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Estimated cost in USD */
  cost?: number
}

/**
 * Daily statistics summary
 */
export interface DailyStats {
  /** Date in YYYY-MM-DD format */
  date: string
  /** Total number of requests */
  totalRequests: number
  /** Number of successful requests */
  successfulRequests: number
  /** Number of failed requests */
  failedRequests: number
  /** Total input tokens */
  totalInputTokens: number
  /** Total output tokens */
  totalOutputTokens: number
  /** Total tokens */
  totalTokens: number
  /** Total estimated cost */
  totalCost: number
  /** Average latency in milliseconds */
  averageLatency: number
  /** Provider breakdown */
  providerStats: Record<ApiProvider, ProviderDailyStats>
}

/**
 * Provider-specific daily statistics
 */
export interface ProviderDailyStats {
  /** Provider identifier */
  provider: ApiProvider
  /** Number of requests */
  requests: number
  /** Input tokens */
  inputTokens: number
  /** Output tokens */
  outputTokens: number
  /** Total tokens */
  totalTokens: number
  /** Estimated cost */
  cost: number
  /** Average latency */
  averageLatency: number
  /** Success rate (0-1) */
  successRate: number
}

/**
 * Aggregated statistics for a time period
 */
export interface AggregatedStats {
  /** Time period */
  period: StatsPeriod
  /** Start timestamp */
  startTime: number
  /** End timestamp */
  endTime: number
  /** Total number of requests */
  totalRequests: number
  /** Number of successful requests */
  successfulRequests: number
  /** Number of failed requests */
  failedRequests: number
  /** Success rate (0-1) */
  successRate: number
  /** Total input tokens */
  totalInputTokens: number
  /** Total output tokens */
  totalOutputTokens: number
  /** Total tokens */
  totalTokens: number
  /** Total estimated cost in USD */
  totalCost: number
  /** Average latency in milliseconds */
  averageLatency: number
  /** Provider breakdown */
  providerStats: ProviderStats[]
  /** Daily breakdown */
  dailyStats: DailyStats[]
}

/**
 * Provider-specific aggregated statistics
 */
export interface ProviderStats {
  /** Provider identifier */
  provider: ApiProvider
  /** Number of requests */
  requests: number
  /** Percentage of total requests (0-100) */
  percentage: number
  /** Input tokens */
  inputTokens: number
  /** Output tokens */
  outputTokens: number
  /** Total tokens */
  totalTokens: number
  /** Estimated cost */
  cost: number
  /** Average latency */
  averageLatency: number
  /** Success rate (0-1) */
  successRate: number
}

/**
 * Statistics export format
 */
export type ExportFormat = 'json' | 'csv' | 'markdown'

/**
 * Statistics query options
 */
export interface StatsQueryOptions {
  /** Time period to query */
  period?: StatsPeriod
  /** Specific provider to filter */
  provider?: ApiProvider
  /** Start date (YYYY-MM-DD) */
  startDate?: string
  /** End date (YYYY-MM-DD) */
  endDate?: string
  /** Include detailed daily breakdown */
  includeDaily?: boolean
}

/**
 * Statistics export options
 */
export interface StatsExportOptions {
  /** Export format */
  format: ExportFormat
  /** Output file path */
  outputPath?: string
  /** Query options */
  query?: StatsQueryOptions
}

/**
 * Cost estimation configuration
 */
export interface CostConfig {
  /** Provider identifier */
  provider: ApiProvider
  /** Model name */
  model?: string
  /** Cost per 1M input tokens in USD */
  inputCostPer1M: number
  /** Cost per 1M output tokens in USD */
  outputCostPer1M: number
}

/**
 * Default cost configurations for common providers
 */
export const DEFAULT_COST_CONFIGS: Record<string, CostConfig> = {
  'anthropic-opus': {
    provider: 'anthropic',
    model: 'claude-opus-4',
    inputCostPer1M: 15.0,
    outputCostPer1M: 75.0,
  },
  'anthropic-sonnet': {
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
  },
  'anthropic-haiku': {
    provider: 'anthropic',
    model: 'claude-haiku-4',
    inputCostPer1M: 0.8,
    outputCostPer1M: 4.0,
  },
  '302ai': {
    provider: '302ai',
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
  },
  'glm': {
    provider: 'glm',
    inputCostPer1M: 1.0,
    outputCostPer1M: 1.0,
  },
  'minimax': {
    provider: 'minimax',
    inputCostPer1M: 1.0,
    outputCostPer1M: 1.0,
  },
  'kimi': {
    provider: 'kimi',
    inputCostPer1M: 0.5,
    outputCostPer1M: 0.5,
  },
}
