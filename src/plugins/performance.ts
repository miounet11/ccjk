/**
 * CCJK Performance Plugin
 *
 * Monitors and tracks performance metrics for CCJK operations.
 * Provides insights into execution times, memory usage, and bottlenecks.
 *
 * Features:
 * - Real-time performance monitoring
 * - Memory usage tracking
 * - Execution time profiling
 * - Performance reports and recommendations
 *
 * @module plugins/performance
 */

import type { CCJKPlugin, HookContext, HookResult, PluginManager } from '../core/plugin-system'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { cpuUsage, memoryUsage } from 'node:process'
import { join } from 'pathe'
import { createPlugin, PluginHookType } from '../core/plugin-system'

/**
 * Performance metric data point
 */
interface PerformanceMetric {
  /** Timestamp of the metric */
  timestamp: number
  /** Command or operation name */
  operation: string
  /** Execution time in milliseconds */
  executionTime: number
  /** Memory usage in bytes */
  memoryUsage: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  /** CPU usage percentage (if available) */
  cpuUsage?: {
    user: number
    system: number
  }
}

/**
 * Performance summary statistics
 */
interface PerformanceSummary {
  /** Total number of operations tracked */
  totalOperations: number
  /** Average execution time */
  averageExecutionTime: number
  /** Minimum execution time */
  minExecutionTime: number
  /** Maximum execution time */
  maxExecutionTime: number
  /** Average memory usage */
  averageMemoryUsage: number
  /** Peak memory usage */
  peakMemoryUsage: number
  /** Slowest operations */
  slowestOperations: Array<{
    operation: string
    executionTime: number
    timestamp: number
  }>
}

/**
 * Performance storage manager
 */
class PerformanceStorage {
  private dataPath: string
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 1000 // Keep last 1000 metrics

  constructor() {
    const ccjkDir = join(homedir(), '.ccjk')
    if (!existsSync(ccjkDir)) {
      mkdirSync(ccjkDir, { recursive: true })
    }

    this.dataPath = join(ccjkDir, 'performance.json')
    this.load()
  }

  /**
   * Load performance data from disk
   */
  private load(): void {
    try {
      if (existsSync(this.dataPath)) {
        const content = readFileSync(this.dataPath, 'utf-8')
        this.metrics = JSON.parse(content)
      }
    }
    catch (error) {
      console.error('[Performance] Failed to load data:', error)
      this.metrics = []
    }
  }

  /**
   * Save performance data to disk
   */
  private save(): void {
    try {
      // Keep only the most recent metrics
      if (this.metrics.length > this.maxMetrics) {
        this.metrics = this.metrics.slice(-this.maxMetrics)
      }

      writeFileSync(this.dataPath, JSON.stringify(this.metrics, null, 2), 'utf-8')
    }
    catch (error) {
      console.error('[Performance] Failed to save data:', error)
    }
  }

  /**
   * Record a performance metric
   */
  record(metric: PerformanceMetric): void {
    this.metrics.push(metric)
    this.save()
  }

  /**
   * Get performance summary
   */
  getSummary(): PerformanceSummary {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        averageExecutionTime: 0,
        minExecutionTime: 0,
        maxExecutionTime: 0,
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        slowestOperations: [],
      }
    }

    const executionTimes = this.metrics.map(m => m.executionTime)
    const memoryUsages = this.metrics.map(m => m.memoryUsage.heapUsed)

    const totalExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0)
    const totalMemoryUsage = memoryUsages.reduce((sum, mem) => sum + mem, 0)

    // Get slowest operations
    const slowestOperations = [...this.metrics]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10)
      .map(m => ({
        operation: m.operation,
        executionTime: m.executionTime,
        timestamp: m.timestamp,
      }))

    return {
      totalOperations: this.metrics.length,
      averageExecutionTime: totalExecutionTime / this.metrics.length,
      minExecutionTime: Math.min(...executionTimes),
      maxExecutionTime: Math.max(...executionTimes),
      averageMemoryUsage: totalMemoryUsage / this.metrics.length,
      peakMemoryUsage: Math.max(...memoryUsages),
      slowestOperations,
    }
  }

  /**
   * Get metrics for a specific operation
   */
  getOperationMetrics(operation: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.operation === operation)
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit = 10): PerformanceMetric[] {
    return this.metrics.slice(-limit)
  }

  /**
   * Clear all performance data
   */
  clear(): void {
    this.metrics = []
    this.save()
  }
}

/**
 * Performance monitor
 */
class PerformanceMonitor {
  private startTimes: Map<string, number> = new Map()
  private startMemory: Map<string, NodeJS.MemoryUsage> = new Map()
  private startCpu: Map<string, NodeJS.CpuUsage> = new Map()

  /**
   * Start monitoring an operation
   */
  start(operationId: string): void {
    this.startTimes.set(operationId, Date.now())
    this.startMemory.set(operationId, memoryUsage())
    this.startCpu.set(operationId, cpuUsage())
  }

  /**
   * Stop monitoring and get metrics
   */
  stop(operationId: string, operationName: string): PerformanceMetric | null {
    const startTime = this.startTimes.get(operationId)
    // const _startMem removed - unused
    const startCpu = this.startCpu.get(operationId)

    if (!startTime) {
      return null
    }

    const executionTime = Date.now() - startTime
    const currentMemory = memoryUsage()
    const currentCpu = cpuUsage(startCpu)

    // Cleanup
    this.startTimes.delete(operationId)
    this.startMemory.delete(operationId)
    this.startCpu.delete(operationId)

    return {
      timestamp: Date.now(),
      operation: operationName,
      executionTime,
      memoryUsage: {
        heapUsed: currentMemory.heapUsed,
        heapTotal: currentMemory.heapTotal,
        external: currentMemory.external,
        rss: currentMemory.rss,
      },
      cpuUsage: {
        user: currentCpu.user,
        system: currentCpu.system,
      },
    }
  }
}

/**
 * Performance plugin implementation
 */
const performancePlugin: CCJKPlugin = createPlugin({
  name: 'ccjk-performance',
  version: '1.0.0',
  description: 'Monitors and tracks performance metrics for CCJK operations',
  author: 'CCJK Team',

  config: {
    enabled: true,
    options: {
      // Whether to track all operations
      trackAll: true,
      // Whether to show performance warnings
      showWarnings: true,
      // Threshold for slow operation warning (ms)
      slowOperationThreshold: 5000,
      // Whether to show performance summary on shutdown
      showSummaryOnShutdown: false,
    },
  },

  async init(manager: PluginManager): Promise<void> {
    const storage = new PerformanceStorage()
    const monitor = new PerformanceMonitor()

    // Store instances for use in hooks
    ;(manager as any)._performanceStorage = storage
    ;(manager as any)._performanceMonitor = monitor
  },

  hooks: {
    /**
     * Start performance monitoring
     */
    [PluginHookType.PreCommand]: async (context: HookContext): Promise<HookResult> => {
      const monitor = (context as any)._performanceMonitor as PerformanceMonitor | undefined

      if (!monitor || !context.command) {
        return { success: true, continue: true }
      }

      const operationId = `${context.command}-${context.timestamp}`
      monitor.start(operationId)

      // Store operation ID in metadata
      if (!context.metadata) {
        context.metadata = {}
      }
      context.metadata.performanceOperationId = operationId

      return {
        success: true,
        continue: true,
      }
    },

    /**
     * Stop performance monitoring and record metrics
     */
    [PluginHookType.PostCommand]: async (context: HookContext): Promise<HookResult> => {
      const monitor = (context as any)._performanceMonitor as PerformanceMonitor | undefined
      const storage = (context as any)._performanceStorage as PerformanceStorage | undefined

      if (!monitor || !storage || !context.command) {
        return { success: true, continue: true }
      }

      const operationId = context.metadata?.performanceOperationId as string | undefined
      if (!operationId) {
        return { success: true, continue: true }
      }

      const metric = monitor.stop(operationId, context.command)
      if (metric) {
        storage.record(metric)

        // Check for slow operations
        const plugin = (context as any)._plugin as CCJKPlugin | undefined
        const threshold = plugin?.config?.options?.slowOperationThreshold || 5000
        const showWarnings = plugin?.config?.options?.showWarnings

        if (showWarnings && metric.executionTime > threshold) {
          console.warn(
            `⚠️  Slow operation detected: ${context.command} took ${metric.executionTime}ms`,
          )
        }
      }

      return {
        success: true,
        continue: true,
      }
    },

    /**
     * Show performance summary on shutdown
     */
    [PluginHookType.Shutdown]: async (context: HookContext): Promise<HookResult> => {
      const storage = (context as any)._performanceStorage as PerformanceStorage | undefined

      if (!storage) {
        return { success: true, continue: true }
      }

      const plugin = (context as any)._plugin as CCJKPlugin | undefined
      const showSummary = plugin?.config?.options?.showSummaryOnShutdown

      if (showSummary) {
        const summary = storage.getSummary()

        console.log('\n⚡ CCJK Performance Summary:')
        console.log(`   Total operations: ${summary.totalOperations}`)
        console.log(`   Average execution time: ${summary.averageExecutionTime.toFixed(2)}ms`)
        console.log(`   Slowest operation: ${summary.maxExecutionTime.toFixed(2)}ms`)
        console.log(`   Peak memory usage: ${(summary.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`)
      }

      return {
        success: true,
        continue: true,
      }
    },
  },

  commands: [
    {
      name: 'performance',
      description: 'View CCJK performance metrics and analysis',
      aliases: ['perf', 'profile'],
      async handler(args: string[], _options: Record<string, any>): Promise<void> {
        const storage = new PerformanceStorage()

        if (args.includes('clear')) {
          storage.clear()
          console.log('✅ Performance data cleared')
          return
        }

        const summary = storage.getSummary()

        console.log('\n⚡ CCJK Performance Report\n')
        console.log('═══════════════════════════════════════')

        // Overview
        console.log('\n📊 Overview:')
        console.log(`   Total operations tracked: ${summary.totalOperations}`)
        console.log(`   Average execution time: ${summary.averageExecutionTime.toFixed(2)}ms`)
        console.log(`   Fastest operation: ${summary.minExecutionTime.toFixed(2)}ms`)
        console.log(`   Slowest operation: ${summary.maxExecutionTime.toFixed(2)}ms`)

        // Memory
        console.log('\n💾 Memory Usage:')
        console.log(`   Average: ${(summary.averageMemoryUsage / 1024 / 1024).toFixed(2)}MB`)
        console.log(`   Peak: ${(summary.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`)

        // Slowest operations
        if (summary.slowestOperations.length > 0) {
          console.log('\n🐌 Slowest Operations:')
          summary.slowestOperations.slice(0, 5).forEach((op, index) => {
            const date = new Date(op.timestamp).toLocaleString()
            console.log(`   ${index + 1}. ${op.operation}: ${op.executionTime.toFixed(2)}ms (${date})`)
          })
        }

        // Recent metrics
        const recentMetrics = storage.getRecentMetrics(5)
        if (recentMetrics.length > 0) {
          console.log('\n📈 Recent Operations:')
          recentMetrics.forEach((metric) => {
            const memMB = (metric.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)
            console.log(`   - ${metric.operation}: ${metric.executionTime}ms (${memMB}MB)`)
          })
        }

        console.log('\n═══════════════════════════════════════')
        console.log('\n💡 Tip: Use "ccjk performance clear" to reset performance data\n')
      },
    },
  ],
})

export default performancePlugin
