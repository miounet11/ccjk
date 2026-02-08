/**
 * CCJK Performance Tracker
 *
 * High-level performance tracking utilities that wrap the metrics collector
 * with convenient APIs for tracking various operations.
 */

import type { MetricsCollector } from './metrics-collector'
import type {
  AggregatedMetric,
  ApiStats,
  CacheStats,
  CommandStats,
  ErrorStats,
  MemoryStats,
  MetricEventListener,
  MetricEventType,
  ThresholdConfig,
} from './types'
import { getMetricsCollector } from './metrics-collector'

// ============================================================================
// Performance Tracker Class
// ============================================================================

export class PerformanceTracker {
  private collector: MetricsCollector
  private activeTimers: Map<string, { start: number, label: string }> = new Map()
  private memoryInterval?: ReturnType<typeof setInterval>

  constructor(collector?: MetricsCollector) {
    this.collector = collector || getMetricsCollector()
  }

  // ==========================================================================
  // Timer-based Tracking
  // ==========================================================================

  /**
   * Start a timer for measuring duration
   */
  startTimer(label: string): string {
    const id = `timer_${Date.now()}_${Math.random().toString(36).slice(2)}`
    this.activeTimers.set(id, { start: performance.now(), label })
    return id
  }

  /**
   * Stop a timer and return the duration
   */
  stopTimer(id: string): number {
    const timer = this.activeTimers.get(id)
    if (!timer)
      return 0

    const duration = performance.now() - timer.start
    this.activeTimers.delete(id)
    return duration
  }

  /**
   * Measure the duration of an async function
   */
  async measure<T>(label: string, fn: () => Promise<T>): Promise<{ result: T, duration: number }> {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - start
      return { result, duration }
    }
    catch (error) {
      const duration = performance.now() - start
      throw Object.assign(error as Error, { duration })
    }
  }

  /**
   * Measure the duration of a sync function
   */
  measureSync<T>(label: string, fn: () => T): { result: T, duration: number } {
    const start = performance.now()
    try {
      const result = fn()
      const duration = performance.now() - start
      return { result, duration }
    }
    catch (error) {
      const duration = performance.now() - start
      throw Object.assign(error as Error, { duration })
    }
  }

  // ==========================================================================
  // Command Tracking
  // ==========================================================================

  /**
   * Track a command execution
   */
  trackCommand(command: string, args: string[] = []): CommandTracker {
    const id = this.collector.startCommand(command, args)
    return new CommandTracker(this.collector, id)
  }

  /**
   * Track a command with automatic completion
   */
  async trackCommandAsync<T>(
    command: string,
    args: string[],
    fn: () => Promise<T>,
  ): Promise<T> {
    const tracker = this.trackCommand(command, args)
    try {
      const result = await fn()
      tracker.success()
      return result
    }
    catch (error) {
      tracker.fail((error as Error).message)
      throw error
    }
  }

  /**
   * Get command statistics
   */
  getCommandStats(): CommandStats[] {
    return this.collector.getCommandStats()
  }

  // ==========================================================================
  // API Call Tracking
  // ==========================================================================

  /**
   * Track an API call
   */
  trackApiCall(provider: string, endpoint: string, method: string = 'POST'): ApiCallTracker {
    const id = this.collector.startApiCall(provider, endpoint, method)
    return new ApiCallTracker(this.collector, id)
  }

  /**
   * Track an API call with automatic completion
   */
  async trackApiCallAsync<T>(
    provider: string,
    endpoint: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const tracker = this.trackApiCall(provider, endpoint)
    try {
      const result = await fn()
      tracker.success()
      return result
    }
    catch (error) {
      tracker.fail((error as Error).message)
      throw error
    }
  }

  /**
   * Get API statistics
   */
  getApiStats(): ApiStats[] {
    return this.collector.getApiStats()
  }

  // ==========================================================================
  // Cache Tracking
  // ==========================================================================

  /**
   * Track a cache get operation
   */
  trackCacheGet(key: string, hit: boolean, latency: number): void {
    this.collector.recordCacheOperation('get', key, hit, latency)
  }

  /**
   * Track a cache set operation
   */
  trackCacheSet(key: string, latency: number, size?: number): void {
    this.collector.recordCacheOperation('set', key, true, latency, size)
  }

  /**
   * Track a cache delete operation
   */
  trackCacheDelete(key: string, latency: number): void {
    this.collector.recordCacheOperation('delete', key, true, latency)
  }

  /**
   * Track a cache clear operation
   */
  trackCacheClear(latency: number): void {
    this.collector.recordCacheOperation('clear', '*', true, latency)
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.collector.getCacheStats()
  }

  // ==========================================================================
  // Error Tracking
  // ==========================================================================

  /**
   * Track an error
   */
  trackError(
    type: string,
    message: string,
    options: {
      stack?: string
      context?: Record<string, unknown>
      severity?: 'low' | 'medium' | 'high' | 'critical'
    } = {},
  ): string {
    return this.collector.recordError(type, message, options)
  }

  /**
   * Track an exception
   */
  trackException(error: Error, context?: Record<string, unknown>): string {
    return this.collector.recordError(
      error.name || 'Error',
      error.message,
      {
        stack: error.stack,
        context,
        severity: 'high',
      },
    )
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    return this.collector.getErrorStats()
  }

  // ==========================================================================
  // Agent Task Tracking
  // ==========================================================================

  /**
   * Track an agent task
   */
  trackAgentTask(agentId: string, agentName: string, taskType: string): AgentTaskTracker {
    const id = this.collector.startAgentTask(agentId, agentName, taskType)
    return new AgentTaskTracker(this.collector, id)
  }

  /**
   * Track an agent task with automatic completion
   */
  async trackAgentTaskAsync<T>(
    agentId: string,
    agentName: string,
    taskType: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const tracker = this.trackAgentTask(agentId, agentName, taskType)
    try {
      const result = await fn()
      tracker.success()
      return result
    }
    catch (error) {
      tracker.fail((error as Error).message)
      throw error
    }
  }

  // ==========================================================================
  // Memory Tracking
  // ==========================================================================

  /**
   * Take a memory snapshot
   */
  takeMemorySnapshot(): void {
    this.collector.takeMemorySnapshot()
  }

  /**
   * Start automatic memory monitoring
   */
  startMemoryMonitoring(intervalMs: number = 30000): void {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval)
    }
    this.memoryInterval = setInterval(() => {
      this.collector.takeMemorySnapshot()
    }, intervalMs)
  }

  /**
   * Stop automatic memory monitoring
   */
  stopMemoryMonitoring(): void {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval)
      this.memoryInterval = undefined
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): MemoryStats {
    return this.collector.getMemoryStats()
  }

  // ==========================================================================
  // Threshold Management
  // ==========================================================================

  /**
   * Add a performance threshold
   */
  addThreshold(config: ThresholdConfig): void {
    this.collector.addThreshold(config)
  }

  /**
   * Remove a performance threshold
   */
  removeThreshold(metric: string): void {
    this.collector.removeThreshold(metric)
  }

  /**
   * Set up common thresholds
   */
  setupDefaultThresholds(): void {
    // Command duration thresholds
    this.addThreshold({
      metric: 'command.duration',
      warning: 5000,
      critical: 30000,
      comparison: 'gt',
    })

    // API latency thresholds
    this.addThreshold({
      metric: 'api.latency',
      warning: 3000,
      critical: 10000,
      comparison: 'gt',
    })

    // Memory usage thresholds
    this.addThreshold({
      metric: 'memory.heapUsedPercent',
      warning: 0.8,
      critical: 0.95,
      comparison: 'gt',
    })

    // Error count thresholds
    this.addThreshold({
      metric: 'error.count',
      warning: 10,
      critical: 50,
      comparison: 'gt',
    })
  }

  // ==========================================================================
  // Event Subscription
  // ==========================================================================

  /**
   * Subscribe to metric events
   */
  on(type: MetricEventType, listener: MetricEventListener): () => void {
    return this.collector.on(type, listener)
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get aggregated statistics for a set of values
   */
  aggregate(values: number[]): AggregatedMetric {
    return this.collector.aggregate(values)
  }

  /**
   * Get uptime
   */
  getUptime(): number {
    return this.collector.getUptime()
  }

  /**
   * Format duration for display
   */
  formatDuration(ms: number): string {
    if (ms < 1000)
      return `${ms.toFixed(0)}ms`
    if (ms < 60000)
      return `${(ms / 1000).toFixed(2)}s`
    if (ms < 3600000)
      return `${(ms / 60000).toFixed(2)}m`
    return `${(ms / 3600000).toFixed(2)}h`
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes: number): string {
    if (bytes < 1024)
      return `${bytes}B`
    if (bytes < 1024 * 1024)
      return `${(bytes / 1024).toFixed(2)}KB`
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.collector.clear()
    this.activeTimers.clear()
  }

  /**
   * Dispose of the tracker
   */
  dispose(): void {
    this.stopMemoryMonitoring()
    this.activeTimers.clear()
  }
}

// ============================================================================
// Tracker Helper Classes
// ============================================================================

/**
 * Command execution tracker
 */
export class CommandTracker {
  constructor(
    private collector: MetricsCollector,
    private id: string,
  ) {}

  success(): void {
    this.collector.endCommand(this.id, 'success')
  }

  fail(error?: string): void {
    this.collector.endCommand(this.id, 'failed', error)
  }

  timeout(): void {
    this.collector.endCommand(this.id, 'timeout')
  }
}

/**
 * API call tracker
 */
export class ApiCallTracker {
  private options: {
    statusCode?: number
    requestSize?: number
    responseSize?: number
    tokensUsed?: number
    cached?: boolean
  } = {}

  constructor(
    private collector: MetricsCollector,
    private id: string,
  ) {}

  setStatusCode(code: number): this {
    this.options.statusCode = code
    return this
  }

  setRequestSize(size: number): this {
    this.options.requestSize = size
    return this
  }

  setResponseSize(size: number): this {
    this.options.responseSize = size
    return this
  }

  setTokensUsed(tokens: number): this {
    this.options.tokensUsed = tokens
    return this
  }

  setCached(cached: boolean): this {
    this.options.cached = cached
    return this
  }

  success(): void {
    this.collector.endApiCall(this.id, 'success', this.options)
  }

  fail(error?: string): void {
    this.collector.endApiCall(this.id, 'failed', { ...this.options, error })
  }

  timeout(): void {
    this.collector.endApiCall(this.id, 'timeout', this.options)
  }
}

/**
 * Agent task tracker
 */
export class AgentTaskTracker {
  private options: {
    tokensUsed?: number
    metadata?: Record<string, unknown>
  } = {}

  constructor(
    private collector: MetricsCollector,
    private id: string,
  ) {}

  setTokensUsed(tokens: number): this {
    this.options.tokensUsed = tokens
    return this
  }

  setMetadata(metadata: Record<string, unknown>): this {
    this.options.metadata = metadata
    return this
  }

  success(): void {
    this.collector.endAgentTask(this.id, 'success', this.options)
  }

  fail(error?: string): void {
    this.collector.endAgentTask(this.id, 'failed', { ...this.options, error })
  }

  cancel(): void {
    this.collector.endAgentTask(this.id, 'cancelled', this.options)
  }
}

// ============================================================================
// Decorators (for class methods)
// ============================================================================

/**
 * Decorator to track method execution time
 */
export function trackPerformance(label?: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value
    const tracker = getPerformanceTracker()

    descriptor.value = async function (...args: unknown[]) {
      const methodLabel = label || `${(target as object).constructor.name}.${propertyKey}`
      const timerId = tracker.startTimer(methodLabel)
      try {
        const result = await originalMethod.apply(this, args)
        tracker.stopTimer(timerId)
        return result
      }
      catch (error) {
        tracker.stopTimer(timerId)
        throw error
      }
    }

    return descriptor
  }
}

/**
 * Decorator to track errors
 */
export function trackErrors(type?: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value
    const tracker = getPerformanceTracker()

    descriptor.value = async function (...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args)
      }
      catch (error) {
        const _errorType = type || `${(target as object).constructor.name}.${propertyKey}`
        tracker.trackException(error as Error, { method: propertyKey, args })
        throw error
      }
    }

    return descriptor
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalTracker: PerformanceTracker | undefined

/**
 * Get the global performance tracker instance
 */
export function getPerformanceTracker(): PerformanceTracker {
  if (!globalTracker) {
    globalTracker = new PerformanceTracker()
  }
  return globalTracker
}

/**
 * Reset the global performance tracker
 */
export function resetPerformanceTracker(): void {
  if (globalTracker) {
    globalTracker.dispose()
    globalTracker = undefined
  }
}
