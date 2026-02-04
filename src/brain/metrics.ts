/**
 * Metrics Collector - Performance metrics collection and analysis
 * Tracks CPU/memory usage, task completion, response times, and error rates
 */

import type { AgentMetrics } from './orchestrator-types'

export interface MetricRecord {
  timestamp: number
  value: number
  metadata?: Record<string, any>
}

export interface AggregatedMetrics {
  min: number
  max: number
  avg: number
  median: number
  p95: number
  p99: number
  count: number
}

export interface TaskMetrics {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  avgDuration: number
  successRate: number
}

export interface PerformanceMetrics {
  cpuUsage: number
  memoryUsage: number
  responseTime: number
  errorCount: number
  requestCount: number
  timestamp: number
}

export interface MetricSnapshot {
  metricName: string
  agentId: string
  timestamp: number
  current: number
  min: number
  max: number
  avg: number
  count: number
}

export class MetricsCollector {
  private metrics: Map<string, Map<string, MetricRecord[]>> = new Map()
  private taskMetrics: Map<string, TaskMetrics> = new Map()
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map()
  private maxRecords: number
  private retentionPeriod: number

  constructor(options: { maxRecords?: number, retentionPeriod?: number } = {}) {
    this.maxRecords = options.maxRecords ?? 1000
    this.retentionPeriod = options.retentionPeriod ?? 3600000 // 1 hour
  }

  /**
   * Record a metric value
   */
  recordMetric(agentId: string, metricName: string, value: number, metadata?: Record<string, any>): void {
    if (!this.metrics.has(agentId)) {
      this.metrics.set(agentId, new Map())
    }

    const agentMetrics = this.metrics.get(agentId)!
    if (!agentMetrics.has(metricName)) {
      agentMetrics.set(metricName, [])
    }

    const records = agentMetrics.get(metricName)!
    records.push({
      timestamp: Date.now(),
      value,
      metadata,
    })

    // Trim old records
    this.trimRecords(records)
  }

  /**
   * Record CPU usage
   */
  recordCpuUsage(agentId: string, usage: number): void {
    this.recordMetric(agentId, 'cpu_usage', usage)
    this.updatePerformanceMetrics(agentId, { cpuUsage: usage })
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(agentId: string, usage: number): void {
    this.recordMetric(agentId, 'memory_usage', usage)
    this.updatePerformanceMetrics(agentId, { memoryUsage: usage })
  }

  /**
   * Record response time
   */
  recordResponseTime(agentId: string, responseTime: number): void {
    this.recordMetric(agentId, 'response_time', responseTime)
    this.updatePerformanceMetrics(agentId, { responseTime })
  }

  /**
   * Record task completion
   */
  recordTaskCompletion(agentId: string, success: boolean, duration: number): void {
    if (!this.taskMetrics.has(agentId)) {
      this.taskMetrics.set(agentId, {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        avgDuration: 0,
        successRate: 0,
      })
    }

    const metrics = this.taskMetrics.get(agentId)!
    metrics.totalTasks++

    if (success) {
      metrics.completedTasks++
    }
    else {
      metrics.failedTasks++
    }

    // Update average duration
    metrics.avgDuration = (metrics.avgDuration * (metrics.totalTasks - 1) + duration) / metrics.totalTasks
    metrics.successRate = metrics.completedTasks / metrics.totalTasks

    this.recordMetric(agentId, 'task_duration', duration, { success })
  }

  /**
   * Record error
   */
  recordError(agentId: string, errorType: string, errorMessage?: string): void {
    this.recordMetric(agentId, 'error', 1, { errorType, errorMessage })
    this.updatePerformanceMetrics(agentId, { errorCount: 1 })
  }

  /**
   * Get agent metrics
   */
  getAgentMetrics(agentId: string): AgentMetrics {
    const taskMetrics = this.taskMetrics.get(agentId)

    const cpuRecords = this.getMetricRecords(agentId, 'cpu_usage')
    const memoryRecords = this.getMetricRecords(agentId, 'memory_usage')
    const responseTimeRecords = this.getMetricRecords(agentId, 'response_time')

    const cpuUsage = cpuRecords.length > 0 ? cpuRecords[cpuRecords.length - 1].value : 0
    const memoryUsage = memoryRecords.length > 0 ? memoryRecords[memoryRecords.length - 1].value : 0
    const avgResponseTime = this.calculateAverage(responseTimeRecords.map(r => r.value))
    const errorRate = taskMetrics ? taskMetrics.failedTasks / taskMetrics.totalTasks : 0

    return {
      tasksExecuted: taskMetrics?.totalTasks ?? 0,
      tasksSucceeded: taskMetrics?.completedTasks ?? 0,
      tasksFailed: taskMetrics?.failedTasks ?? 0,
      avgTaskDuration: taskMetrics?.avgDuration ?? 0,
      successRate: taskMetrics?.successRate ?? 0,
      totalExecutionTime: taskMetrics?.avgDuration ?? 0,
      avgConfidence: 0.8,
      lastUpdated: new Date().toISOString(),
      cpuUsage,
      memoryUsage,
    }
  }

  /**
   * Get metric snapshot
   */
  getMetricSnapshot(agentId: string, metricName: string, timeRange?: number): MetricSnapshot {
    const records = this.getMetricRecords(agentId, metricName, timeRange)
    const values = records.map(r => r.value)

    if (values.length === 0) {
      return {
        metricName,
        agentId,
        timestamp: Date.now(),
        current: 0,
        min: 0,
        max: 0,
        avg: 0,
        count: 0,
      }
    }

    return {
      metricName,
      agentId,
      timestamp: Date.now(),
      current: values[values.length - 1],
      min: Math.min(...values),
      max: Math.max(...values),
      avg: this.calculateAverage(values),
      count: values.length,
    }
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(agentId: string, metricName: string, timeRange?: number): AggregatedMetrics {
    const records = this.getMetricRecords(agentId, metricName, timeRange)
    const values = records.map(r => r.value).sort((a, b) => a - b)

    if (values.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        median: 0,
        p95: 0,
        p99: 0,
        count: 0,
      }
    }

    return {
      min: values[0],
      max: values[values.length - 1],
      avg: this.calculateAverage(values),
      median: this.calculatePercentile(values, 50),
      p95: this.calculatePercentile(values, 95),
      p99: this.calculatePercentile(values, 99),
      count: values.length,
    }
  }

  /**
   * Get task metrics
   */
  getTaskMetrics(agentId: string): TaskMetrics | undefined {
    return this.taskMetrics.get(agentId)
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(agentId: string): PerformanceMetrics | undefined {
    return this.performanceMetrics.get(agentId)
  }

  /**
   * Get all agents with metrics
   */
  getAllAgents(): string[] {
    return Array.from(this.metrics.keys())
  }

  /**
   * Clear metrics for an agent
   */
  clearAgentMetrics(agentId: string): void {
    this.metrics.delete(agentId)
    this.taskMetrics.delete(agentId)
    this.performanceMetrics.delete(agentId)
  }

  /**
   * Clear all metrics
   */
  clearAll(): void {
    this.metrics.clear()
    this.taskMetrics.clear()
    this.performanceMetrics.clear()
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(agentId?: string): Record<string, any> {
    if (agentId) {
      return {
        agentId,
        metrics: this.getAgentMetrics(agentId),
        taskMetrics: this.getTaskMetrics(agentId),
        performanceMetrics: this.getPerformanceMetrics(agentId),
        timestamp: Date.now(),
      }
    }

    const allMetrics: Record<string, any> = {}
    for (const id of this.getAllAgents()) {
      allMetrics[id] = {
        metrics: this.getAgentMetrics(id),
        taskMetrics: this.getTaskMetrics(id),
        performanceMetrics: this.getPerformanceMetrics(id),
      }
    }

    return {
      agents: allMetrics,
      timestamp: Date.now(),
    }
  }

  /**
   * Get metric records
   */
  private getMetricRecords(agentId: string, metricName: string, timeRange?: number): MetricRecord[] {
    const agentMetrics = this.metrics.get(agentId)
    if (!agentMetrics) {
      return []
    }

    const records = agentMetrics.get(metricName) ?? []

    if (timeRange) {
      const cutoff = Date.now() - timeRange
      return records.filter(r => r.timestamp >= cutoff)
    }

    return records
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(agentId: string, update: Partial<PerformanceMetrics>): void {
    if (!this.performanceMetrics.has(agentId)) {
      this.performanceMetrics.set(agentId, {
        cpuUsage: 0,
        memoryUsage: 0,
        responseTime: 0,
        errorCount: 0,
        requestCount: 0,
        timestamp: Date.now(),
      })
    }

    const metrics = this.performanceMetrics.get(agentId)!

    if (update.cpuUsage !== undefined) {
      metrics.cpuUsage = update.cpuUsage
    }
    if (update.memoryUsage !== undefined) {
      metrics.memoryUsage = update.memoryUsage
    }
    if (update.responseTime !== undefined) {
      metrics.requestCount++
      metrics.responseTime = (metrics.responseTime * (metrics.requestCount - 1) + update.responseTime) / metrics.requestCount
    }
    if (update.errorCount !== undefined) {
      metrics.errorCount += update.errorCount
    }

    metrics.timestamp = Date.now()
  }

  /**
   * Trim old records
   */
  private trimRecords(records: MetricRecord[]): void {
    // Remove old records beyond retention period
    const cutoff = Date.now() - this.retentionPeriod
    while (records.length > 0 && records[0].timestamp < cutoff) {
      records.shift()
    }

    // Limit total records
    while (records.length > this.maxRecords) {
      records.shift()
    }
  }

  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) {
      return 0
    }
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) {
      return 0
    }

    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
    return sortedValues[Math.max(0, index)]
  }
}

/**
 * Create a singleton metrics collector instance
 */
let globalMetricsCollector: MetricsCollector | undefined

export function getMetricsCollector(options?: { maxRecords?: number, retentionPeriod?: number }): MetricsCollector {
  if (!globalMetricsCollector) {
    globalMetricsCollector = new MetricsCollector(options)
  }
  return globalMetricsCollector
}

export function resetMetricsCollector(): void {
  if (globalMetricsCollector) {
    globalMetricsCollector.clearAll()
    globalMetricsCollector = undefined
  }
}
