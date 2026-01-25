/**
 * CCJK Performance Monitoring - Type Definitions
 *
 * Comprehensive type definitions for the monitoring system including
 * metrics, performance tracking, dashboard, and reporting.
 */

// ============================================================================
// Core Metric Types
// ============================================================================

/**
 * Metric data point with timestamp
 */
export interface MetricDataPoint {
  timestamp: number
  value: number
  metadata?: Record<string, unknown>
}

/**
 * Time series data for a metric
 */
export interface MetricTimeSeries {
  name: string
  unit: string
  dataPoints: MetricDataPoint[]
  aggregation?: AggregatedMetric
}

/**
 * Aggregated metric statistics
 */
export interface AggregatedMetric {
  min: number
  max: number
  avg: number
  median: number
  p95: number
  p99: number
  sum: number
  count: number
  stdDev: number
}

/**
 * Metric categories
 */
export type MetricCategory =
  | 'command'      // Command execution metrics
  | 'memory'       // Memory usage metrics
  | 'api'          // API call metrics
  | 'cache'        // Cache performance metrics
  | 'error'        // Error rate metrics
  | 'agent'        // Agent task metrics
  | 'system'       // System-level metrics

/**
 * Metric definition
 */
export interface MetricDefinition {
  name: string
  category: MetricCategory
  unit: string
  description: string
  aggregationType: 'counter' | 'gauge' | 'histogram' | 'summary'
}

// ============================================================================
// Command Execution Metrics
// ============================================================================

/**
 * Command execution record
 */
export interface CommandExecution {
  id: string
  command: string
  args: string[]
  startTime: number
  endTime?: number
  duration?: number
  status: 'running' | 'success' | 'failed' | 'timeout'
  error?: string
  memoryUsed?: number
  metadata?: Record<string, unknown>
}

/**
 * Command statistics
 */
export interface CommandStats {
  command: string
  totalExecutions: number
  successCount: number
  failureCount: number
  avgDuration: number
  minDuration: number
  maxDuration: number
  p95Duration: number
  lastExecution?: number
}

// ============================================================================
// Memory Metrics
// ============================================================================

/**
 * Memory snapshot
 */
export interface MemorySnapshot {
  timestamp: number
  heapUsed: number
  heapTotal: number
  external: number
  arrayBuffers: number
  rss: number
  heapUsedPercent: number
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  current: MemorySnapshot
  peak: MemorySnapshot
  average: {
    heapUsed: number
    heapTotal: number
    rss: number
  }
  trend: 'stable' | 'increasing' | 'decreasing'
}

// ============================================================================
// API Call Metrics
// ============================================================================

/**
 * API call record
 */
export interface ApiCallRecord {
  id: string
  provider: string
  endpoint: string
  method: string
  startTime: number
  endTime?: number
  latency?: number
  status: 'pending' | 'success' | 'failed' | 'timeout'
  statusCode?: number
  error?: string
  requestSize?: number
  responseSize?: number
  tokensUsed?: number
  cached?: boolean
}

/**
 * API statistics
 */
export interface ApiStats {
  provider: string
  totalCalls: number
  successCount: number
  failureCount: number
  avgLatency: number
  minLatency: number
  maxLatency: number
  p95Latency: number
  totalTokens: number
  cacheHits: number
  cacheMisses: number
  errorRate: number
}

// ============================================================================
// Cache Metrics
// ============================================================================

/**
 * Cache operation record
 */
export interface CacheOperation {
  timestamp: number
  operation: 'get' | 'set' | 'delete' | 'clear'
  key: string
  hit: boolean
  latency: number
  size?: number
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalOperations: number
  hits: number
  misses: number
  hitRate: number
  avgLatency: number
  totalSize: number
  itemCount: number
  evictions: number
}

// ============================================================================
// Error Metrics
// ============================================================================

/**
 * Error record
 */
export interface ErrorRecord {
  id: string
  timestamp: number
  type: string
  message: string
  stack?: string
  context?: Record<string, unknown>
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolved: boolean
}

/**
 * Error statistics
 */
export interface ErrorStats {
  totalErrors: number
  errorsByType: Record<string, number>
  errorsBySeverity: {
    low: number
    medium: number
    high: number
    critical: number
  }
  errorRate: number
  recentErrors: ErrorRecord[]
}

// ============================================================================
// Agent Task Metrics
// ============================================================================

/**
 * Agent task record
 */
export interface AgentTaskRecord {
  id: string
  agentId: string
  agentName: string
  taskType: string
  startTime: number
  endTime?: number
  duration?: number
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
  tokensUsed?: number
  error?: string
  metadata?: Record<string, unknown>
}

/**
 * Agent statistics
 */
export interface AgentStats {
  agentId: string
  agentName: string
  totalTasks: number
  successCount: number
  failureCount: number
  avgDuration: number
  totalTokens: number
  successRate: number
  lastActive?: number
}

// ============================================================================
// System Metrics
// ============================================================================

/**
 * System health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'critical'

/**
 * System health check result
 */
export interface HealthCheckResult {
  component: string
  status: HealthStatus
  message?: string
  latency?: number
  lastCheck: number
}

/**
 * System overview
 */
export interface SystemOverview {
  status: HealthStatus
  uptime: number
  startTime: number
  version: string
  nodeVersion: string
  platform: string
  healthChecks: HealthCheckResult[]
}

// ============================================================================
// Dashboard Types
// ============================================================================

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  refreshInterval: number
  showCommands: boolean
  showMemory: boolean
  showApi: boolean
  showCache: boolean
  showErrors: boolean
  showAgents: boolean
  chartWidth: number
  chartHeight: number
  colorScheme: 'default' | 'minimal' | 'colorful'
}

/**
 * Dashboard data
 */
export interface DashboardData {
  timestamp: number
  system: SystemOverview
  commands: CommandStats[]
  memory: MemoryStats
  api: ApiStats[]
  cache: CacheStats
  errors: ErrorStats
  agents: AgentStats[]
}

/**
 * Dashboard export format
 */
export type ExportFormat = 'json' | 'csv' | 'html'

/**
 * Dashboard interface
 */
export interface Dashboard {
  show(): void
  refresh(): void
  export(format: ExportFormat): string
  stop(): void
}

// ============================================================================
// Reporter Types
// ============================================================================

/**
 * Report time range
 */
export type ReportTimeRange = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'

/**
 * Report configuration
 */
export interface ReportConfig {
  timeRange: ReportTimeRange
  startTime?: number
  endTime?: number
  includeCommands: boolean
  includeMemory: boolean
  includeApi: boolean
  includeCache: boolean
  includeErrors: boolean
  includeAgents: boolean
  includeTrends: boolean
  includeAnomalies: boolean
}

/**
 * Trend analysis
 */
export interface TrendAnalysis {
  metric: string
  direction: 'up' | 'down' | 'stable'
  changePercent: number
  significance: 'low' | 'medium' | 'high'
  prediction?: number
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetection {
  metric: string
  timestamp: number
  value: number
  expectedValue: number
  deviation: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
}

/**
 * Performance report
 */
export interface PerformanceReport {
  id: string
  generatedAt: number
  timeRange: {
    start: number
    end: number
  }
  summary: {
    totalCommands: number
    avgCommandDuration: number
    totalApiCalls: number
    avgApiLatency: number
    cacheHitRate: number
    errorRate: number
    memoryUsage: number
  }
  commands: CommandStats[]
  api: ApiStats[]
  cache: CacheStats
  errors: ErrorStats
  agents: AgentStats[]
  trends: TrendAnalysis[]
  anomalies: AnomalyDetection[]
  recommendations: string[]
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Metrics storage configuration
 */
export interface StorageConfig {
  maxRecords: number
  retentionPeriod: number
  persistPath?: string
  enablePersistence: boolean
  compressOldData: boolean
}

/**
 * Persisted metrics data
 */
export interface PersistedMetrics {
  version: string
  savedAt: number
  commands: CommandExecution[]
  apiCalls: ApiCallRecord[]
  cacheOps: CacheOperation[]
  errors: ErrorRecord[]
  agentTasks: AgentTaskRecord[]
  memorySnapshots: MemorySnapshot[]
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Metric event types
 */
export type MetricEventType =
  | 'command:start'
  | 'command:end'
  | 'api:start'
  | 'api:end'
  | 'cache:operation'
  | 'error:recorded'
  | 'agent:task:start'
  | 'agent:task:end'
  | 'memory:snapshot'
  | 'threshold:exceeded'

/**
 * Metric event
 */
export interface MetricEvent {
  type: MetricEventType
  timestamp: number
  data: unknown
}

/**
 * Event listener
 */
export type MetricEventListener = (event: MetricEvent) => void

// ============================================================================
// Threshold Types
// ============================================================================

/**
 * Threshold configuration
 */
export interface ThresholdConfig {
  metric: string
  warning: number
  critical: number
  comparison: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'
}

/**
 * Threshold alert
 */
export interface ThresholdAlert {
  threshold: ThresholdConfig
  currentValue: number
  level: 'warning' | 'critical'
  timestamp: number
  message: string
}
