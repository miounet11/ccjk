/**
 * Unified Concurrency Manager for CCJK v4.0.0
 *
 * Integrates three-tier concurrency architecture:
 * 1. Enhanced Worker Pool (multi-threaded, specialized workers)
 * 2. Process Pool (multi-process, isolation)
 * 3. Cowork Orchestrator (multi-agent, real-time progress)
 *
 * This manager automatically routes tasks to the optimal execution backend.
 */

import type { ExecutionStrategy, ProgressEvent, TaskProgress } from '../agents/cowork-orchestrator.js'
import type { WorkerSpecialization } from './enhanced-worker-pool.js'
import type { ProcessSpecialization } from './process-pool.js'
import { EventEmitter } from 'node:events'
import { CoworkOrchestrator } from '../agents/cowork-orchestrator.js'
import { EnhancedWorkerPool } from './enhanced-worker-pool.js'
import { ProcessPool } from './process-pool.js'

// ============================================================================
// Type Definitions
// ============================================================================

export interface ConcurrencyTask {
  id: string
  name: string
  type: TaskType
  input: unknown
  priority: number
  timeout?: number
  executionMode?: ExecutionMode
  retryPolicy?: RetryPolicy
}

export type TaskType
  = | 'cpu-intensive' // Heavy computation
    | 'io-heavy' // File operations
    | 'network' // HTTP requests, scraping
    | 'analysis' // Code/document analysis
    | 'memory-intensive' // Large data processing
    | 'isolation-required' // Security/safety needs
    | 'general' // Default
    | 'multi-agent' // Orchestrated agent workflow

export type ExecutionMode = 'auto' | 'worker-thread' | 'process' | 'agent'

export interface RetryPolicy {
  maxAttempts: number
  backoffMs: number
  retryableErrors: string[]
}

export interface ConcurrencyResult {
  taskId: string
  success: boolean
  result?: unknown
  error?: Error
  executionMode: ExecutionMode
  duration: number
  workerId?: string
  processId?: string
  agentId?: string
}

export interface ConcurrencyConfig {
  // Worker pool config
  maxWorkers: number
  workerSpecialization: boolean
  enableWorkerCache: boolean

  // Process pool config
  maxProcesses: number
  processTimeout: number

  // Agent orchestrator config
  maxAgents: number
  maxAgentTasks: number
  enableProgressStreaming: boolean

  // Overall config
  taskTimeout: number
  autoScaling: boolean
  monitoringInterval: number
}

export interface SystemMetrics {
  timestamp: number
  workerPool: {
    activeWorkers: number
    idleWorkers: number
    queueSize: number
    avgTaskTime: number
  }
  processPool: {
    activeProcesses: number
    idleProcesses: number
    memoryUsage: number
  }
  orchestrator: {
    activeAgents: number
    runningTasks: number
    queuedTasks: number
  }
  overall: {
    totalTasksProcessed: number
    successRate: number
    avgResponseTime: number
  }
}

export interface RoutingDecision {
  mode: ExecutionMode
  reason: string
  specialization?: WorkerSpecialization | ProcessSpecialization
}

// ============================================================================
// Main Manager Class
// ============================================================================

export class UnifiedConcurrencyManager extends EventEmitter {
  // Execution backends
  private workerPool: EnhancedWorkerPool
  private processPool: ProcessPool
  private orchestrator: CoworkOrchestrator

  // Configuration
  private config: ConcurrencyConfig

  // Metrics tracking
  private metrics: SystemMetrics
  private metricsInterval?: NodeJS.Timeout

  // Task tracking
  private activeTasks = new Map<string, ConcurrencyTask>()
  private taskResults = new Map<string, ConcurrencyResult>()
  private totalTasksProcessed = 0
  private successfulTasks = 0

  constructor(config: Partial<ConcurrencyConfig> = {}) {
    super()

    this.config = {
      maxWorkers: config.maxWorkers ?? 4,
      workerSpecialization: config.workerSpecialization ?? true,
      enableWorkerCache: config.enableWorkerCache ?? true,
      maxProcesses: config.maxProcesses ?? 2,
      processTimeout: config.processTimeout ?? 60000,
      maxAgents: config.maxAgents ?? 4,
      maxAgentTasks: config.maxAgentTasks ?? 16,
      enableProgressStreaming: config.enableProgressStreaming ?? true,
      taskTimeout: config.taskTimeout ?? 30000,
      autoScaling: config.autoScaling ?? true,
      monitoringInterval: config.monitoringInterval ?? 5000,
    }

    // Initialize execution backends
    this.workerPool = new EnhancedWorkerPool({
      maxWorkers: this.config.maxWorkers,
      enableSpecialization: this.config.workerSpecialization,
      enableCacheAffinity: this.config.enableWorkerCache,
    })

    this.processPool = new ProcessPool({
      maxProcesses: this.config.maxProcesses,
      defaultTimeout: this.config.processTimeout,
    })

    this.orchestrator = new CoworkOrchestrator({
      maxConcurrentAgents: this.config.maxAgents,
      maxConcurrentTasks: this.config.maxAgentTasks,
      enableProgressStreaming: this.config.enableProgressStreaming,
    })

    // Wire up orchestrator with pools
    this.orchestrator.setWorkerPool(this.workerPool)
    this.orchestrator.setProcessPool(this.processPool)

    // Initialize metrics
    this.metrics = this.initializeMetrics()

    // Forward progress events
    this.orchestrator.on('*', (event: ProgressEvent) => {
      this.emit('progress', event)
    })

    // Start monitoring if enabled
    if (this.config.autoScaling) {
      this.startMonitoring()
    }
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Execute a task with automatic routing to optimal backend
   */
  async execute(task: ConcurrencyTask): Promise<ConcurrencyResult> {
    const startTime = Date.now()

    // Validate task
    if (!task.id) {
      task.id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }

    this.activeTasks.set(task.id, task)

    try {
      // Determine optimal execution mode
      const decision = this.routeTask(task)

      // Execute based on routing decision
      const result = await this.executeWithMode(task, decision)

      const duration = Date.now() - startTime

      const concurrencyResult: ConcurrencyResult = {
        taskId: task.id,
        success: true,
        result,
        executionMode: decision.mode,
        duration,
      }

      this.taskResults.set(task.id, concurrencyResult)
      this.totalTasksProcessed++
      this.successfulTasks++

      this.emit('task.completed', concurrencyResult)

      return concurrencyResult
    }
    catch (error) {
      const duration = Date.now() - startTime

      const concurrencyResult: ConcurrencyResult = {
        taskId: task.id,
        success: false,
        error: error as Error,
        executionMode: task.executionMode ?? 'auto',
        duration,
      }

      this.taskResults.set(task.id, concurrencyResult)
      this.totalTasksProcessed++

      this.emit('task.failed', concurrencyResult)

      // Retry if configured
      if (task.retryPolicy && this.shouldRetry(error as Error, task.retryPolicy)) {
        return this.retryTask(task)
      }

      throw error
    }
    finally {
      this.activeTasks.delete(task.id)
    }
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeBatch(tasks: ConcurrencyTask[]): Promise<ConcurrencyResult[]> {
    return Promise.all(tasks.map(task => this.execute(task)))
  }

  /**
   * Execute a multi-agent orchestration plan
   */
  async executePlan(
    description: string,
    strategy: ExecutionStrategy = 'hierarchical',
  ): Promise<ConcurrencyResult> {
    const startTime = Date.now()

    try {
      const plan = await this.orchestrator.createPlan(description, strategy)
      const result = await this.orchestrator.executePlan(plan)

      return {
        taskId: plan.id,
        success: result.success,
        result,
        executionMode: 'agent',
        duration: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        taskId: 'plan-failed',
        success: false,
        error: error as Error,
        executionMode: 'agent',
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Get real-time system metrics
   */
  getMetrics(): SystemMetrics {
    this.updateMetrics()
    return { ...this.metrics }
  }

  /**
   * Get progress for all active tasks
   */
  getAllProgress(): TaskProgress[] {
    return this.orchestrator.getAllProgress()
  }

  /**
   * Cancel an active task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId)
    if (!task) {
      return false
    }

    // Cancel based on current execution
    const result = await this.orchestrator.cancelTask(taskId)

    this.activeTasks.delete(taskId)
    this.emit('task.cancelled', { taskId })

    return result
  }

  /**
   * Scale the execution capacity
   */
  async scale(target: {
    workers?: number
    processes?: number
    agents?: number
  }): Promise<void> {
    // Note: Worker pool handles scaling internally
    // Process pool doesn't have a scale method - it manages via specialization config
    if (target.agents !== undefined) {
      await this.orchestrator.scaleAgentPool(target.agents)
    }

    this.emit('scaled', target)
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Stop monitoring
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }

    // Wait for active tasks to complete or cancel them
    const timeout = 5000
    const start = Date.now()

    while (this.activeTasks.size > 0 && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Shutdown all backends
    await Promise.all([
      this.workerPool.terminate(),
      this.processPool.shutdown(),
      this.orchestrator.shutdown(),
    ])

    this.removeAllListeners()
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private routeTask(task: ConcurrencyTask): RoutingDecision {
    // If execution mode is explicitly set, use it
    if (task.executionMode && task.executionMode !== 'auto') {
      return {
        mode: task.executionMode,
        reason: 'explicit',
      }
    }

    // Multi-agent tasks go to orchestrator
    if (task.type === 'multi-agent') {
      return {
        mode: 'agent',
        reason: 'task-type-multi-agent',
      }
    }

    // Isolation-required tasks go to process pool
    if (task.type === 'isolation-required') {
      return {
        mode: 'process',
        reason: 'task-type-isolation',
        specialization: 'general',
      }
    }

    // Memory-intensive tasks go to process pool
    if (task.type === 'memory-intensive') {
      return {
        mode: 'process',
        reason: 'task-type-memory',
        specialization: 'memory',
      }
    }

    // CPU-intensive tasks go to worker pool with CPU specialization
    if (task.type === 'cpu-intensive') {
      return {
        mode: 'worker-thread',
        reason: 'task-type-cpu',
        specialization: 'cpu',
      }
    }

    // I/O heavy tasks go to worker pool with I/O specialization
    if (task.type === 'io-heavy') {
      return {
        mode: 'worker-thread',
        reason: 'task-type-io',
        specialization: 'io',
      }
    }

    // Network tasks go to worker pool with network specialization
    if (task.type === 'network') {
      return {
        mode: 'worker-thread',
        reason: 'task-type-network',
        specialization: 'network',
      }
    }

    // Analysis tasks go to worker pool with analysis specialization
    if (task.type === 'analysis') {
      return {
        mode: 'worker-thread',
        reason: 'task-type-analysis',
        specialization: 'analysis',
      }
    }

    // Default: use worker pool with general specialization
    return {
      mode: 'worker-thread',
      reason: 'default',
      specialization: 'general',
    }
  }

  private async executeWithMode(
    task: ConcurrencyTask,
    decision: RoutingDecision,
  ): Promise<unknown> {
    switch (decision.mode) {
      case 'worker-thread':
        return this.workerPool.exec(task.type, task.input, {
          priority: task.priority as any,
          timeout: task.timeout ?? this.config.taskTimeout,
        })

      case 'process':
        return this.processPool.execute(task.type, task.input, {
          timeout: task.timeout ?? this.config.processTimeout,
        })

      case 'agent':
        return this.orchestrator.executeTask({
          id: task.id,
          type: this.mapTaskTypeToAgentType(task.type),
          description: task.name,
          input: task.input,
          priority: task.priority,
          timeout: task.timeout,
          retryPolicy: task.retryPolicy,
        })

      default:
        throw new Error(`Unknown execution mode: ${decision.mode}`)
    }
  }

  private mapTaskTypeToAgentType(taskType: TaskType): 'file' | 'web' | 'data' | 'analysis' | 'general' {
    const mapping: Record<TaskType, 'file' | 'web' | 'data' | 'analysis' | 'general'> = {
      'cpu-intensive': 'analysis',
      'io-heavy': 'file',
      'network': 'web',
      'analysis': 'analysis',
      'memory-intensive': 'data',
      'isolation-required': 'general',
      'general': 'general',
      'multi-agent': 'general',
    }

    return mapping[taskType] ?? 'general'
  }

  private shouldRetry(error: Error, policy: RetryPolicy): boolean {
    return policy.retryableErrors.some(pattern =>
      error.message.includes(pattern),
    )
  }

  private async retryTask(task: ConcurrencyTask): Promise<ConcurrencyResult> {
    const retryTask = { ...task, id: `${task.id}-retry` }
    return this.execute(retryTask)
  }

  private initializeMetrics(): SystemMetrics {
    return {
      timestamp: Date.now(),
      workerPool: {
        activeWorkers: 0,
        idleWorkers: this.config.maxWorkers,
        queueSize: 0,
        avgTaskTime: 0,
      },
      processPool: {
        activeProcesses: 0,
        idleProcesses: this.config.maxProcesses,
        memoryUsage: 0,
      },
      orchestrator: {
        activeAgents: 0,
        runningTasks: 0,
        queuedTasks: 0,
      },
      overall: {
        totalTasksProcessed: 0,
        successRate: 1,
        avgResponseTime: 0,
      },
    }
  }

  private updateMetrics(): void {
    // Update worker pool metrics
    const workerStats = this.workerPool.getStats()
    this.metrics.workerPool = {
      activeWorkers: workerStats.busyWorkers,
      idleWorkers: workerStats.idleWorkers,
      queueSize: workerStats.queuedTasks,
      avgTaskTime: workerStats.averageTaskTime,
    }

    // Update process pool metrics
    const processStats = this.processPool.getStats()
    this.metrics.processPool = {
      activeProcesses: processStats.busyProcesses,
      idleProcesses: processStats.idleProcesses,
      memoryUsage: processStats.totalMemoryUsage,
    }

    // Update orchestrator metrics
    const agentStatus = this.orchestrator.getAgentStatus()
    const progress = this.orchestrator.getAllProgress()

    this.metrics.orchestrator = {
      activeAgents: agentStatus.length,
      runningTasks: progress.filter(p => p.status === 'running').length,
      queuedTasks: progress.filter(p => p.status === 'queued').length,
    }

    // Update overall metrics
    this.metrics.overall = {
      totalTasksProcessed: this.totalTasksProcessed,
      successRate: this.totalTasksProcessed > 0
        ? this.successfulTasks / this.totalTasksProcessed
        : 1,
      avgResponseTime: this.calculateAvgResponseTime(),
    }

    this.metrics.timestamp = Date.now()
  }

  private calculateAvgResponseTime(): number {
    if (this.taskResults.size === 0) {
      return 0
    }

    let total = 0
    for (const result of this.taskResults.values()) {
      total += result.duration
    }

    return total / this.taskResults.size
  }

  private startMonitoring(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics()
      this.emit('metrics', this.getMetrics())

      // Auto-scale based on load
      this.autoScale()
    }, this.config.monitoringInterval)
  }

  private autoScale(): void {
    const queuePressure
      = this.metrics.workerPool.queueSize
        + this.metrics.orchestrator.queuedTasks

    // Note: Worker pool auto-scaling is handled internally by the pool
    // We can optionally scale the agent pool here
    if (queuePressure > 10) {
      const agentStatus = this.orchestrator.getAgentStatus()
      const targetAgents = Math.min(this.config.maxAgents * 2, 8)
      if (agentStatus.length < targetAgents) {
        // Non-blocking async call
        this.orchestrator.scaleAgentPool(targetAgents, 'auto-scale-up').catch(() => {})
      }
    }
  }

  // ========================================================================
  // Singleton Support
  // ========================================================================

  private static instance?: UnifiedConcurrencyManager

  static getInstance(config?: Partial<ConcurrencyConfig>): UnifiedConcurrencyManager {
    if (!this.instance) {
      this.instance = new UnifiedConcurrencyManager(config)
    }
    return this.instance
  }

  static resetInstance(): void {
    if (this.instance) {
      this.instance.shutdown()
      this.instance = undefined
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Execute a task with automatic routing
 */
export async function executeTask(
  name: string,
  type: TaskType,
  input: unknown,
  options: Partial<ConcurrencyTask> = {},
): Promise<ConcurrencyResult> {
  const manager = UnifiedConcurrencyManager.getInstance()

  return manager.execute({
    id: options.id ?? `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    type,
    input,
    priority: options.priority ?? 5,
    timeout: options.timeout,
    executionMode: options.executionMode ?? 'auto',
    retryPolicy: options.retryPolicy,
  })
}

/**
 * Execute a CPU-intensive task
 */
export async function executeCpuTask(
  name: string,
  input: unknown,
  options?: Partial<ConcurrencyTask>,
): Promise<ConcurrencyResult> {
  return executeTask(name, 'cpu-intensive', input, options)
}

/**
 * Execute an I/O heavy task
 */
export async function executeIoTask(
  name: string,
  input: unknown,
  options?: Partial<ConcurrencyTask>,
): Promise<ConcurrencyResult> {
  return executeTask(name, 'io-heavy', input, options)
}

/**
 * Execute a network task
 */
export async function executeNetworkTask(
  name: string,
  input: unknown,
  options?: Partial<ConcurrencyTask>,
): Promise<ConcurrencyResult> {
  return executeTask(name, 'network', input, options)
}

/**
 * Execute an analysis task
 */
export async function executeAnalysisTask(
  name: string,
  input: unknown,
  options?: Partial<ConcurrencyTask>,
): Promise<ConcurrencyResult> {
  return executeTask(name, 'analysis', input, options)
}

/**
 * Execute a task requiring isolation
 */
export async function executeIsolatedTask(
  name: string,
  input: unknown,
  options?: Partial<ConcurrencyTask>,
): Promise<ConcurrencyResult> {
  return executeTask(name, 'isolation-required', input, options)
}
