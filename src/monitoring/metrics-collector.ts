/**
 * CCJK Metrics Collector
 *
 * Central metrics collection system for tracking command execution,
 * API calls, cache operations, errors, and agent tasks.
 */

import type {
  AgentStats,
  AgentTaskRecord,
  AggregatedMetric,
  ApiCallRecord,
  ApiStats,
  CacheOperation,
  CacheStats,
  CommandExecution,
  CommandStats,
  ErrorRecord,
  ErrorStats,
  MemorySnapshot,
  MemoryStats,
  MetricEvent,
  MetricEventListener,
  MetricEventType,
  PersistedMetrics,
  StorageConfig,
  ThresholdAlert,
  ThresholdConfig,
} from './types'
import { nanoid } from 'nanoid'

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  maxRecords: 10000,
  retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
  enablePersistence: false,
  compressOldData: true,
}

// ============================================================================
// Metrics Collector Class
// ============================================================================

export class MetricsCollector {
  private commands: Map<string, CommandExecution> = new Map()
  private commandHistory: CommandExecution[] = []
  private apiCalls: Map<string, ApiCallRecord> = new Map()
  private apiHistory: ApiCallRecord[] = []
  private cacheOperations: CacheOperation[] = []
  private errors: ErrorRecord[] = []
  private agentTasks: Map<string, AgentTaskRecord> = new Map()
  private agentHistory: AgentTaskRecord[] = []
  private memorySnapshots: MemorySnapshot[] = []
  private eventListeners: Map<MetricEventType, Set<MetricEventListener>> = new Map()
  private thresholds: ThresholdConfig[] = []
  private config: StorageConfig
  private startTime: number

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config }
    this.startTime = Date.now()
  }

  // ==========================================================================
  // Command Metrics
  // ==========================================================================

  /**
   * Start tracking a command execution
   */
  startCommand(command: string, args: string[] = []): string {
    const id = nanoid()
    const execution: CommandExecution = {
      id,
      command,
      args,
      startTime: Date.now(),
      status: 'running',
    }
    this.commands.set(id, execution)
    this.emit('command:start', execution)
    return id
  }

  /**
   * End tracking a command execution
   */
  endCommand(id: string, status: 'success' | 'failed' | 'timeout', error?: string): void {
    const execution = this.commands.get(id)
    if (!execution)
      return

    execution.endTime = Date.now()
    execution.duration = execution.endTime - execution.startTime
    execution.status = status
    execution.error = error
    execution.memoryUsed = process.memoryUsage().heapUsed

    this.commandHistory.push(execution)
    this.commands.delete(id)
    this.trimHistory(this.commandHistory)
    this.emit('command:end', execution)
    this.checkThresholds('command.duration', execution.duration)
  }

  /**
   * Get command statistics
   */
  getCommandStats(): CommandStats[] {
    const statsMap = new Map<string, CommandStats>()

    for (const exec of this.commandHistory) {
      let stats = statsMap.get(exec.command)
      if (!stats) {
        stats = {
          command: exec.command,
          totalExecutions: 0,
          successCount: 0,
          failureCount: 0,
          avgDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          p95Duration: 0,
        }
        statsMap.set(exec.command, stats)
      }

      stats.totalExecutions++
      if (exec.status === 'success')
        stats.successCount++
      else if (exec.status === 'failed' || exec.status === 'timeout')
        stats.failureCount++

      if (exec.duration !== undefined) {
        stats.minDuration = Math.min(stats.minDuration, exec.duration)
        stats.maxDuration = Math.max(stats.maxDuration, exec.duration)
      }
      stats.lastExecution = exec.endTime || exec.startTime
    }

    // Calculate averages and percentiles
    for (const [command, stats] of statsMap) {
      const durations = this.commandHistory
        .filter(e => e.command === command && e.duration !== undefined)
        .map(e => e.duration!)
        .sort((a, b) => a - b)

      if (durations.length > 0) {
        stats.avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
        stats.p95Duration = this.calculatePercentile(durations, 95)
      }

      if (stats.minDuration === Infinity)
        stats.minDuration = 0
    }

    return Array.from(statsMap.values())
  }

  // ==========================================================================
  // API Call Metrics
  // ==========================================================================

  /**
   * Start tracking an API call
   */
  startApiCall(provider: string, endpoint: string, method: string = 'POST'): string {
    const id = nanoid()
    const record: ApiCallRecord = {
      id,
      provider,
      endpoint,
      method,
      startTime: Date.now(),
      status: 'pending',
    }
    this.apiCalls.set(id, record)
    this.emit('api:start', record)
    return id
  }

  /**
   * End tracking an API call
   */
  endApiCall(
    id: string,
    status: 'success' | 'failed' | 'timeout',
    options: {
      statusCode?: number
      error?: string
      requestSize?: number
      responseSize?: number
      tokensUsed?: number
      cached?: boolean
    } = {},
  ): void {
    const record = this.apiCalls.get(id)
    if (!record)
      return

    record.endTime = Date.now()
    record.latency = record.endTime - record.startTime
    record.status = status
    record.statusCode = options.statusCode
    record.error = options.error
    record.requestSize = options.requestSize
    record.responseSize = options.responseSize
    record.tokensUsed = options.tokensUsed
    record.cached = options.cached

    this.apiHistory.push(record)
    this.apiCalls.delete(id)
    this.trimHistory(this.apiHistory)
    this.emit('api:end', record)
    this.checkThresholds('api.latency', record.latency)
  }

  /**
   * Get API statistics by provider
   */
  getApiStats(): ApiStats[] {
    const statsMap = new Map<string, ApiStats>()

    for (const call of this.apiHistory) {
      let stats = statsMap.get(call.provider)
      if (!stats) {
        stats = {
          provider: call.provider,
          totalCalls: 0,
          successCount: 0,
          failureCount: 0,
          avgLatency: 0,
          minLatency: Infinity,
          maxLatency: 0,
          p95Latency: 0,
          totalTokens: 0,
          cacheHits: 0,
          cacheMisses: 0,
          errorRate: 0,
        }
        statsMap.set(call.provider, stats)
      }

      stats.totalCalls++
      if (call.status === 'success')
        stats.successCount++
      else stats.failureCount++

      if (call.latency !== undefined) {
        stats.minLatency = Math.min(stats.minLatency, call.latency)
        stats.maxLatency = Math.max(stats.maxLatency, call.latency)
      }

      if (call.tokensUsed)
        stats.totalTokens += call.tokensUsed
      if (call.cached)
        stats.cacheHits++
      else stats.cacheMisses++
    }

    // Calculate averages and percentiles
    for (const [provider, stats] of statsMap) {
      const latencies = this.apiHistory
        .filter(c => c.provider === provider && c.latency !== undefined)
        .map(c => c.latency!)
        .sort((a, b) => a - b)

      if (latencies.length > 0) {
        stats.avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
        stats.p95Latency = this.calculatePercentile(latencies, 95)
      }

      if (stats.minLatency === Infinity)
        stats.minLatency = 0
      stats.errorRate = stats.totalCalls > 0 ? stats.failureCount / stats.totalCalls : 0
    }

    return Array.from(statsMap.values())
  }

  // ==========================================================================
  // Cache Metrics
  // ==========================================================================

  /**
   * Record a cache operation
   */
  recordCacheOperation(
    operation: 'get' | 'set' | 'delete' | 'clear',
    key: string,
    hit: boolean,
    latency: number,
    size?: number,
  ): void {
    const record: CacheOperation = {
      timestamp: Date.now(),
      operation,
      key,
      hit,
      latency,
      size,
    }
    this.cacheOperations.push(record)
    this.trimHistory(this.cacheOperations)
    this.emit('cache:operation', record)
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const getOps = this.cacheOperations.filter(op => op.operation === 'get')
    const hits = getOps.filter(op => op.hit).length
    const misses = getOps.filter(op => !op.hit).length
    const totalSize = this.cacheOperations
      .filter(op => op.size !== undefined)
      .reduce((sum, op) => sum + (op.size || 0), 0)

    const latencies = this.cacheOperations.map(op => op.latency)
    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0

    return {
      totalOperations: this.cacheOperations.length,
      hits,
      misses,
      hitRate: getOps.length > 0 ? hits / getOps.length : 0,
      avgLatency,
      totalSize,
      itemCount: new Set(this.cacheOperations.map(op => op.key)).size,
      evictions: this.cacheOperations.filter(op => op.operation === 'delete').length,
    }
  }

  // ==========================================================================
  // Error Metrics
  // ==========================================================================

  /**
   * Record an error
   */
  recordError(
    type: string,
    message: string,
    options: {
      stack?: string
      context?: Record<string, unknown>
      severity?: 'low' | 'medium' | 'high' | 'critical'
    } = {},
  ): string {
    const id = nanoid()
    const record: ErrorRecord = {
      id,
      timestamp: Date.now(),
      type,
      message,
      stack: options.stack,
      context: options.context,
      severity: options.severity || 'medium',
      resolved: false,
    }
    this.errors.push(record)
    this.trimHistory(this.errors)
    this.emit('error:recorded', record)
    this.checkThresholds('error.count', this.errors.length)
    return id
  }

  /**
   * Mark an error as resolved
   */
  resolveError(id: string): void {
    const error = this.errors.find(e => e.id === id)
    if (error) {
      error.resolved = true
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    const errorsByType: Record<string, number> = {}
    const errorsBySeverity = { low: 0, medium: 0, high: 0, critical: 0 }

    for (const error of this.errors) {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1
      errorsBySeverity[error.severity]++
    }

    const recentErrors = this.errors
      .slice(-10)
      .reverse()

    // Calculate error rate (errors per minute over last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const recentErrorCount = this.errors.filter(e => e.timestamp > oneHourAgo).length
    const errorRate = recentErrorCount / 60

    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorsBySeverity,
      errorRate,
      recentErrors,
    }
  }

  // ==========================================================================
  // Agent Task Metrics
  // ==========================================================================

  /**
   * Start tracking an agent task
   */
  startAgentTask(agentId: string, agentName: string, taskType: string): string {
    const id = nanoid()
    const record: AgentTaskRecord = {
      id,
      agentId,
      agentName,
      taskType,
      startTime: Date.now(),
      status: 'running',
    }
    this.agentTasks.set(id, record)
    this.emit('agent:task:start', record)
    return id
  }

  /**
   * End tracking an agent task
   */
  endAgentTask(
    id: string,
    status: 'success' | 'failed' | 'cancelled',
    options: {
      tokensUsed?: number
      error?: string
      metadata?: Record<string, unknown>
    } = {},
  ): void {
    const record = this.agentTasks.get(id)
    if (!record)
      return

    record.endTime = Date.now()
    record.duration = record.endTime - record.startTime
    record.status = status
    record.tokensUsed = options.tokensUsed
    record.error = options.error
    record.metadata = options.metadata

    this.agentHistory.push(record)
    this.agentTasks.delete(id)
    this.trimHistory(this.agentHistory)
    this.emit('agent:task:end', record)
  }

  /**
   * Get agent statistics
   */
  getAgentStats(): AgentStats[] {
    const statsMap = new Map<string, AgentStats>()

    for (const task of this.agentHistory) {
      let stats = statsMap.get(task.agentId)
      if (!stats) {
        stats = {
          agentId: task.agentId,
          agentName: task.agentName,
          totalTasks: 0,
          successCount: 0,
          failureCount: 0,
          avgDuration: 0,
          totalTokens: 0,
          successRate: 0,
        }
        statsMap.set(task.agentId, stats)
      }

      stats.totalTasks++
      if (task.status === 'success')
        stats.successCount++
      else if (task.status === 'failed')
        stats.failureCount++

      if (task.tokensUsed)
        stats.totalTokens += task.tokensUsed
      stats.lastActive = task.endTime || task.startTime
    }

    // Calculate averages
    for (const [agentId, stats] of statsMap) {
      const durations = this.agentHistory
        .filter(t => t.agentId === agentId && t.duration !== undefined)
        .map(t => t.duration!)

      if (durations.length > 0) {
        stats.avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      }

      stats.successRate = stats.totalTasks > 0 ? stats.successCount / stats.totalTasks : 0
    }

    return Array.from(statsMap.values())
  }

  // ==========================================================================
  // Memory Metrics
  // ==========================================================================

  /**
   * Take a memory snapshot
   */
  takeMemorySnapshot(): MemorySnapshot {
    const mem = process.memoryUsage()
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      rss: mem.rss,
      heapUsedPercent: mem.heapUsed / mem.heapTotal,
    }
    this.memorySnapshots.push(snapshot)
    this.trimHistory(this.memorySnapshots)
    this.emit('memory:snapshot', snapshot)
    this.checkThresholds('memory.heapUsedPercent', snapshot.heapUsedPercent)
    return snapshot
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): MemoryStats {
    const current = this.takeMemorySnapshot()

    if (this.memorySnapshots.length === 0) {
      return {
        current,
        peak: current,
        average: {
          heapUsed: current.heapUsed,
          heapTotal: current.heapTotal,
          rss: current.rss,
        },
        trend: 'stable',
      }
    }

    // Find peak
    const peak = this.memorySnapshots.reduce((max, snap) =>
      snap.heapUsed > max.heapUsed ? snap : max,
    )

    // Calculate averages
    const avgHeapUsed = this.memorySnapshots.reduce((sum, s) => sum + s.heapUsed, 0) / this.memorySnapshots.length
    const avgHeapTotal = this.memorySnapshots.reduce((sum, s) => sum + s.heapTotal, 0) / this.memorySnapshots.length
    const avgRss = this.memorySnapshots.reduce((sum, s) => sum + s.rss, 0) / this.memorySnapshots.length

    // Determine trend
    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable'
    if (this.memorySnapshots.length >= 5) {
      const recent = this.memorySnapshots.slice(-5)
      const first = recent[0].heapUsed
      const last = recent[recent.length - 1].heapUsed
      const change = (last - first) / first

      if (change > 0.1)
        trend = 'increasing'
      else if (change < -0.1)
        trend = 'decreasing'
    }

    return {
      current,
      peak,
      average: {
        heapUsed: avgHeapUsed,
        heapTotal: avgHeapTotal,
        rss: avgRss,
      },
      trend,
    }
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  /**
   * Subscribe to metric events
   */
  on(type: MetricEventType, listener: MetricEventListener): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set())
    }
    this.eventListeners.get(type)!.add(listener)

    return () => {
      this.eventListeners.get(type)?.delete(listener)
    }
  }

  /**
   * Emit a metric event
   */
  private emit(type: MetricEventType, data: unknown): void {
    const event: MetricEvent = { type, timestamp: Date.now(), data }
    this.eventListeners.get(type)?.forEach((listener) => {
      try {
        listener(event)
      }
      catch {
        // Ignore listener errors
      }
    })
  }

  // ==========================================================================
  // Threshold System
  // ==========================================================================

  /**
   * Add a threshold configuration
   */
  addThreshold(config: ThresholdConfig): void {
    this.thresholds.push(config)
  }

  /**
   * Remove a threshold configuration
   */
  removeThreshold(metric: string): void {
    this.thresholds = this.thresholds.filter(t => t.metric !== metric)
  }

  /**
   * Check thresholds and emit alerts
   */
  private checkThresholds(metric: string, value: number): void {
    for (const threshold of this.thresholds) {
      if (threshold.metric !== metric)
        continue

      let exceeded = false
      let level: 'warning' | 'critical' = 'warning'

      const checkValue = (limit: number, comparison: string): boolean => {
        switch (comparison) {
          case 'gt': return value > limit
          case 'lt': return value < limit
          case 'gte': return value >= limit
          case 'lte': return value <= limit
          case 'eq': return value === limit
          default: return false
        }
      }

      if (checkValue(threshold.critical, threshold.comparison)) {
        exceeded = true
        level = 'critical'
      }
      else if (checkValue(threshold.warning, threshold.comparison)) {
        exceeded = true
        level = 'warning'
      }

      if (exceeded) {
        const alert: ThresholdAlert = {
          threshold,
          currentValue: value,
          level,
          timestamp: Date.now(),
          message: `${metric} ${level}: ${value} (threshold: ${level === 'critical' ? threshold.critical : threshold.warning})`,
        }
        this.emit('threshold:exceeded', alert)
      }
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0)
      return 0
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
    return sortedValues[Math.max(0, index)]
  }

  /**
   * Trim history arrays to max records
   */
  private trimHistory<T extends { timestamp?: number, startTime?: number }>(array: T[]): void {
    const cutoff = Date.now() - this.config.retentionPeriod

    // Remove old records
    while (array.length > 0) {
      const timestamp = array[0].timestamp || array[0].startTime || 0
      if (timestamp < cutoff) {
        array.shift()
      }
      else {
        break
      }
    }

    // Limit total records
    while (array.length > this.config.maxRecords) {
      array.shift()
    }
  }

  /**
   * Calculate aggregated statistics
   */
  aggregate(values: number[]): AggregatedMetric {
    if (values.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        median: 0,
        p95: 0,
        p99: 0,
        sum: 0,
        count: 0,
        stdDev: 0,
      }
    }

    const sorted = [...values].sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length

    // Calculate standard deviation
    const squaredDiffs = values.map(v => (v - avg) ** 2)
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
    const stdDev = Math.sqrt(avgSquaredDiff)

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg,
      median: this.calculatePercentile(sorted, 50),
      p95: this.calculatePercentile(sorted, 95),
      p99: this.calculatePercentile(sorted, 99),
      sum,
      count: values.length,
      stdDev,
    }
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime
  }

  /**
   * Export all metrics data
   */
  exportData(): PersistedMetrics {
    return {
      version: '1.0.0',
      savedAt: Date.now(),
      commands: this.commandHistory,
      apiCalls: this.apiHistory,
      cacheOps: this.cacheOperations,
      errors: this.errors,
      agentTasks: this.agentHistory,
      memorySnapshots: this.memorySnapshots,
    }
  }

  /**
   * Import metrics data
   */
  importData(data: PersistedMetrics): void {
    this.commandHistory = data.commands || []
    this.apiHistory = data.apiCalls || []
    this.cacheOperations = data.cacheOps || []
    this.errors = data.errors || []
    this.agentHistory = data.agentTasks || []
    this.memorySnapshots = data.memorySnapshots || []
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.commands.clear()
    this.commandHistory = []
    this.apiCalls.clear()
    this.apiHistory = []
    this.cacheOperations = []
    this.errors = []
    this.agentTasks.clear()
    this.agentHistory = []
    this.memorySnapshots = []
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalCollector: MetricsCollector | undefined

/**
 * Get the global metrics collector instance
 */
export function getMetricsCollector(config?: Partial<StorageConfig>): MetricsCollector {
  if (!globalCollector) {
    globalCollector = new MetricsCollector(config)
  }
  return globalCollector
}

/**
 * Reset the global metrics collector
 */
export function resetMetricsCollector(): void {
  if (globalCollector) {
    globalCollector.clear()
    globalCollector = undefined
  }
}
