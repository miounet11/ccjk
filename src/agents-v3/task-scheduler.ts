/**
 * CCJK Agents V3 - Task Scheduler
 *
 * Priority-based task scheduling with load balancing,
 * task affinity, and timeout handling.
 *
 * @module agents-v3/task-scheduler
 */

import { EventEmitter } from 'node:events'
import { nanoid } from 'nanoid'
import type {
  AgentId,
  AgentInstance,
  Priority,
  SchedulerConfig,
  SchedulerStats,
  Task,
  TaskId,
  TaskResult,
  TaskStatus,
} from './types.js'

/**
 * Default scheduler configuration
 */
const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  maxConcurrentTasks: 10,
  defaultTimeoutMs: 300000,
  enablePriorityQueue: true,
  enableLoadBalancing: true,
  loadBalancingStrategy: 'least-loaded',
  enableTaskAffinity: true,
  processingIntervalMs: 100,
  staleTaskThresholdMs: 600000,
}

/**
 * Priority weights for sorting
 */
const PRIORITY_WEIGHTS: Record<Priority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
}

/**
 * Scheduler events
 */
export interface TaskSchedulerEvents {
  'task:queued': (task: Task) => void
  'task:started': (task: Task) => void
  'task:completed': (result: TaskResult) => void
  'task:failed': (taskId: TaskId, error: Error) => void
  'task:timeout': (taskId: TaskId) => void
  'task:cancelled': (taskId: TaskId) => void
  'task:retrying': (taskId: TaskId, attempt: number) => void
  'scheduler:processing': () => void
  'scheduler:idle': () => void
}

/**
 * Task execution function type
 */
export type TaskExecutor = (
  task: Task,
  agent: AgentInstance,
) => Promise<TaskResult>

/**
 * Agent provider function type
 */
export type AgentProvider = {
  getAvailableAgent: (type: string) => AgentInstance | undefined
  getAgentByCapabilities: (capabilities: string[]) => AgentInstance | undefined
  getLeastLoadedAgent: (type?: string) => AgentInstance | undefined
  assignTask: (agentId: AgentId, taskId: TaskId) => boolean
  completeTask: (agentId: AgentId, taskId: TaskId, success: boolean, durationMs: number) => void
}

/**
 * Task Scheduler
 *
 * Manages task queue with priority-based scheduling, load balancing,
 * and automatic timeout handling.
 */
export class TaskScheduler extends EventEmitter {
  private readonly config: SchedulerConfig
  private readonly pendingQueue: Task[] = []
  private readonly runningTasks: Map<TaskId, Task> = new Map()
  private readonly taskTimeouts: Map<TaskId, NodeJS.Timeout> = new Map()
  private readonly taskResults: Map<TaskId, TaskResult> = new Map()
  private processingTimer?: NodeJS.Timeout
  private isRunning = false
  private executor?: TaskExecutor
  private agentProvider?: AgentProvider

  // Statistics
  private stats: SchedulerStats = {
    totalScheduled: 0,
    queuedTasks: 0,
    runningTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    avgWaitTimeMs: 0,
    avgExecutionTimeMs: 0,
    throughput: 0,
    queueByPriority: {
      low: 0,
      normal: 0,
      high: 0,
      critical: 0,
    },
  }

  private totalWaitTime = 0
  private totalExecutionTime = 0
  private startTime = 0

  constructor(config: Partial<SchedulerConfig> = {}) {
    super()
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config }
  }

  /**
   * Start the scheduler
   */
  start(executor: TaskExecutor, agentProvider: AgentProvider): void {
    if (this.isRunning) {
      return
    }

    this.executor = executor
    this.agentProvider = agentProvider
    this.isRunning = true
    this.startTime = Date.now()

    // Start processing loop
    this.processingTimer = setInterval(
      () => this.processQueue(),
      this.config.processingIntervalMs,
    )
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false

    // Clear processing timer
    if (this.processingTimer) {
      clearInterval(this.processingTimer)
      this.processingTimer = undefined
    }

    // Clear all task timeouts
    for (const timer of this.taskTimeouts.values()) {
      clearTimeout(timer)
    }
    this.taskTimeouts.clear()

    // Wait for running tasks to complete (with timeout)
    const timeout = 30000
    const startWait = Date.now()

    while (this.runningTasks.size > 0 && Date.now() - startWait < timeout) {
      await this.sleep(100)
    }

    // Cancel remaining tasks
    for (const taskId of this.runningTasks.keys()) {
      this.cancelTask(taskId)
    }
  }

  /**
   * Schedule a task
   */
  schedule(task: Partial<Task> & { name: string; type: string }): Task {
    const now = Date.now()

    const fullTask: Task = {
      id: task.id || nanoid(),
      name: task.name,
      description: task.description,
      type: task.type,
      priority: task.priority || 'normal',
      requiredCapabilities: task.requiredCapabilities || [],
      input: task.input || {},
      status: 'pending',
      dependencies: task.dependencies,
      timeout: task.timeout || this.config.defaultTimeoutMs,
      retry: task.retry || {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      },
      retryCount: 0,
      progress: 0,
      affinity: task.affinity,
      createdAt: now,
      metadata: task.metadata,
    }

    // Check dependencies
    if (this.hasPendingDependencies(fullTask)) {
      fullTask.status = 'pending'
    } else {
      fullTask.status = 'queued'
    }

    // Add to queue
    this.enqueue(fullTask)

    // Update stats
    this.stats.totalScheduled++
    this.stats.queuedTasks++
    this.stats.queueByPriority[fullTask.priority]++

    this.emit('task:queued', fullTask)

    return fullTask
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: TaskId): boolean {
    // Check pending queue
    const pendingIndex = this.pendingQueue.findIndex(t => t.id === taskId)
    if (pendingIndex !== -1) {
      const task = this.pendingQueue[pendingIndex]
      this.pendingQueue.splice(pendingIndex, 1)
      task.status = 'cancelled'
      this.stats.queuedTasks--
      this.stats.queueByPriority[task.priority]--
      this.emit('task:cancelled', taskId)
      return true
    }

    // Check running tasks
    const runningTask = this.runningTasks.get(taskId)
    if (runningTask) {
      this.clearTaskTimeout(taskId)
      runningTask.status = 'cancelled'
      this.runningTasks.delete(taskId)
      this.stats.runningTasks--
      this.emit('task:cancelled', taskId)
      return true
    }

    return false
  }

  /**
   * Get task by ID
   */
  getTask(taskId: TaskId): Task | undefined {
    // Check pending queue
    const pending = this.pendingQueue.find(t => t.id === taskId)
    if (pending) {
      return pending
    }

    // Check running tasks
    return this.runningTasks.get(taskId)
  }

  /**
   * Get task result
   */
  getTaskResult(taskId: TaskId): TaskResult | undefined {
    return this.taskResults.get(taskId)
  }

  /**
   * Get all pending tasks
   */
  getPendingTasks(): Task[] {
    return [...this.pendingQueue]
  }

  /**
   * Get all running tasks
   */
  getRunningTasks(): Task[] {
    return Array.from(this.runningTasks.values())
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    const elapsed = (Date.now() - this.startTime) / 1000
    const completed = this.stats.completedTasks + this.stats.failedTasks

    return {
      ...this.stats,
      avgWaitTimeMs: completed > 0 ? this.totalWaitTime / completed : 0,
      avgExecutionTimeMs: completed > 0 ? this.totalExecutionTime / completed : 0,
      throughput: elapsed > 0 ? completed / elapsed : 0,
    }
  }

  /**
   * Update task progress
   */
  updateProgress(taskId: TaskId, progress: number): void {
    const task = this.runningTasks.get(taskId)
    if (task) {
      task.progress = Math.min(100, Math.max(0, progress))
    }
  }

  /**
   * Create task checkpoint
   */
  createCheckpoint(taskId: TaskId, data: unknown): void {
    const task = this.runningTasks.get(taskId)
    if (task) {
      task.checkpoint = {
        id: nanoid(),
        data,
        progress: task.progress,
        timestamp: Date.now(),
      }
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Add task to queue with priority sorting
   */
  private enqueue(task: Task): void {
    if (!this.config.enablePriorityQueue) {
      this.pendingQueue.push(task)
      return
    }

    // Find insertion point based on priority
    const taskWeight = PRIORITY_WEIGHTS[task.priority]
    let insertIndex = this.pendingQueue.length

    for (let i = 0; i < this.pendingQueue.length; i++) {
      const existingWeight = PRIORITY_WEIGHTS[this.pendingQueue[i].priority]
      if (taskWeight > existingWeight) {
        insertIndex = i
        break
      }
    }

    this.pendingQueue.splice(insertIndex, 0, task)
  }

  /**
   * Process the task queue
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning || !this.executor || !this.agentProvider) {
      return
    }

    // Check if we can run more tasks
    if (this.runningTasks.size >= this.config.maxConcurrentTasks) {
      return
    }

    // Check for tasks with resolved dependencies
    this.updateDependencyStatus()

    // Find next task to execute
    const task = this.getNextTask()
    if (!task) {
      if (this.runningTasks.size === 0 && this.pendingQueue.length === 0) {
        this.emit('scheduler:idle')
      }
      return
    }

    // Find suitable agent
    const agent = this.findAgentForTask(task)
    if (!agent) {
      // No agent available, task stays in queue
      return
    }

    // Assign task to agent
    if (!this.agentProvider.assignTask(agent.id, task.id)) {
      return
    }

    // Remove from pending queue
    const index = this.pendingQueue.indexOf(task)
    if (index !== -1) {
      this.pendingQueue.splice(index, 1)
    }

    // Update task state
    task.status = 'running'
    task.startedAt = Date.now()
    task.assignedAgentId = agent.id

    // Add to running tasks
    this.runningTasks.set(task.id, task)

    // Update stats
    this.stats.queuedTasks--
    this.stats.queueByPriority[task.priority]--
    this.stats.runningTasks++

    // Set timeout
    this.setTaskTimeout(task)

    this.emit('task:started', task)
    this.emit('scheduler:processing')

    // Execute task
    this.executeTask(task, agent)
  }

  /**
   * Execute a task
   */
  private async executeTask(task: Task, agent: AgentInstance): Promise<void> {
    const startTime = Date.now()

    try {
      const result = await this.executor!(task, agent)

      // Clear timeout
      this.clearTaskTimeout(task.id)

      // Calculate times
      const executionTime = Date.now() - startTime
      const waitTime = task.startedAt! - task.createdAt

      this.totalWaitTime += waitTime
      this.totalExecutionTime += executionTime

      // Update task
      task.status = result.success ? 'completed' : 'failed'
      task.completedAt = Date.now()
      task.output = result.output
      task.progress = 100

      // Remove from running
      this.runningTasks.delete(task.id)

      // Store result
      this.taskResults.set(task.id, result)

      // Update agent
      this.agentProvider!.completeTask(agent.id, task.id, result.success, executionTime)

      // Update stats
      this.stats.runningTasks--
      if (result.success) {
        this.stats.completedTasks++
        this.emit('task:completed', result)
      } else {
        // Check for retry
        if (this.shouldRetry(task, result)) {
          this.retryTask(task)
        } else {
          this.stats.failedTasks++
          this.emit('task:failed', task.id, new Error(result.error?.message || 'Task failed'))
        }
      }
    } catch (error) {
      this.handleTaskError(task, agent, error as Error)
    }
  }

  /**
   * Handle task execution error
   */
  private handleTaskError(task: Task, agent: AgentInstance, error: Error): void {
    // Clear timeout
    this.clearTaskTimeout(task.id)

    // Update task
    task.status = 'failed'
    task.completedAt = Date.now()
    task.error = {
      code: 'EXECUTION_ERROR',
      message: error.message,
      stack: error.stack,
      recoverable: true,
    }

    // Remove from running
    this.runningTasks.delete(task.id)

    // Update agent
    const executionTime = Date.now() - (task.startedAt || Date.now())
    this.agentProvider!.completeTask(agent.id, task.id, false, executionTime)

    // Update stats
    this.stats.runningTasks--

    // Check for retry
    if (this.shouldRetry(task)) {
      this.retryTask(task)
    } else {
      this.stats.failedTasks++
      this.emit('task:failed', task.id, error)
    }
  }

  /**
   * Get next task to execute
   */
  private getNextTask(): Task | undefined {
    for (const task of this.pendingQueue) {
      if (task.status === 'queued') {
        return task
      }
    }
    return undefined
  }

  /**
   * Find suitable agent for task
   */
  private findAgentForTask(task: Task): AgentInstance | undefined {
    if (!this.agentProvider) {
      return undefined
    }

    // Check affinity first
    if (this.config.enableTaskAffinity && task.affinity) {
      if (task.affinity.agentId) {
        const agent = this.agentProvider.getAvailableAgent(task.affinity.agentId)
        if (agent) {
          return agent
        }
      }

      if (task.affinity.capabilities) {
        const agent = this.agentProvider.getAgentByCapabilities(task.affinity.capabilities)
        if (agent) {
          return agent
        }
      }
    }

    // Check required capabilities
    if (task.requiredCapabilities.length > 0) {
      const agent = this.agentProvider.getAgentByCapabilities(task.requiredCapabilities)
      if (agent) {
        return agent
      }
    }

    // Use load balancing strategy
    if (this.config.enableLoadBalancing) {
      switch (this.config.loadBalancingStrategy) {
        case 'least-loaded':
          return this.agentProvider.getLeastLoadedAgent(task.type)
        case 'round-robin':
        case 'random':
        case 'best-fit':
        default:
          return this.agentProvider.getAvailableAgent(task.type)
      }
    }

    return this.agentProvider.getAvailableAgent(task.type)
  }

  /**
   * Check if task has pending dependencies
   */
  private hasPendingDependencies(task: Task): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return false
    }

    for (const depId of task.dependencies) {
      const result = this.taskResults.get(depId)
      if (!result || !result.success) {
        return true
      }
    }

    return false
  }

  /**
   * Update dependency status for pending tasks
   */
  private updateDependencyStatus(): void {
    for (const task of this.pendingQueue) {
      if (task.status === 'pending' && !this.hasPendingDependencies(task)) {
        task.status = 'queued'
      }
    }
  }

  /**
   * Check if task should be retried
   */
  private shouldRetry(task: Task, result?: TaskResult): boolean {
    if (!task.retry) {
      return false
    }

    if (task.retryCount >= task.retry.maxAttempts) {
      return false
    }

    // Check error codes
    const errorCode = task.error?.code || result?.error?.code
    if (errorCode) {
      if (task.retry.noRetryOnCodes?.includes(errorCode)) {
        return false
      }
      if (task.retry.retryOnCodes && !task.retry.retryOnCodes.includes(errorCode)) {
        return false
      }
    }

    return true
  }

  /**
   * Retry a failed task
   */
  private retryTask(task: Task): void {
    task.retryCount++
    task.status = 'retrying'

    // Calculate backoff delay
    const delay = Math.min(
      task.retry!.initialDelayMs * Math.pow(task.retry!.backoffMultiplier, task.retryCount - 1),
      task.retry!.maxDelayMs,
    )

    this.emit('task:retrying', task.id, task.retryCount)

    // Re-queue after delay
    setTimeout(() => {
      task.status = 'queued'
      task.error = undefined
      task.startedAt = undefined
      task.completedAt = undefined
      task.assignedAgentId = undefined
      this.enqueue(task)
      this.stats.queuedTasks++
      this.stats.queueByPriority[task.priority]++
    }, delay)
  }

  /**
   * Set task timeout
   */
  private setTaskTimeout(task: Task): void {
    const timeout = task.timeout || this.config.defaultTimeoutMs

    const timer = setTimeout(() => {
      this.handleTaskTimeout(task.id)
    }, timeout)

    this.taskTimeouts.set(task.id, timer)
  }

  /**
   * Clear task timeout
   */
  private clearTaskTimeout(taskId: TaskId): void {
    const timer = this.taskTimeouts.get(taskId)
    if (timer) {
      clearTimeout(timer)
      this.taskTimeouts.delete(taskId)
    }
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(taskId: TaskId): void {
    const task = this.runningTasks.get(taskId)
    if (!task) {
      return
    }

    task.status = 'timeout'
    task.completedAt = Date.now()
    task.error = {
      code: 'TASK_TIMEOUT',
      message: `Task timed out after ${task.timeout}ms`,
      recoverable: true,
    }

    this.runningTasks.delete(taskId)
    this.stats.runningTasks--

    // Notify agent
    if (task.assignedAgentId && this.agentProvider) {
      const executionTime = Date.now() - (task.startedAt || Date.now())
      this.agentProvider.completeTask(task.assignedAgentId, taskId, false, executionTime)
    }

    this.emit('task:timeout', taskId)

    // Check for retry
    if (this.shouldRetry(task)) {
      this.retryTask(task)
    } else {
      this.stats.failedTasks++
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Create a task scheduler instance
 */
export function createTaskScheduler(config?: Partial<SchedulerConfig>): TaskScheduler {
  return new TaskScheduler(config)
}
