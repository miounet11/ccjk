/**
 * Subagent Scheduler
 *
 * Orchestrates task execution via subagents with:
 * - Parallel execution with concurrency limits
 * - Dependency resolution
 * - Auto-retry on failure
 * - Git worktree isolation
 */

import type { SubagentConfig, SubagentState } from '../utils/subagent/types'
import type {
  SchedulerConfig,
  TaskPriority,
  WorkflowSession,
  WorkflowTask,
} from './types'
import { EventEmitter } from 'node:events'
import { SubagentManager } from '../utils/subagent/manager'
import { TwoStageReviewer } from './review'
import { getWorkflowStateMachine } from './state-machine'
import { DEFAULT_SCHEDULER_CONFIG } from './types'

/**
 * Scheduler events
 */
export interface SchedulerEvents {
  /** Task queued for execution */
  'task:queued': (task: WorkflowTask) => void

  /** Task started execution */
  'task:started': (task: WorkflowTask, subagent: SubagentState) => void

  /** Task completed successfully */
  'task:completed': (task: WorkflowTask, result: any) => void

  /** Task failed */
  'task:failed': (task: WorkflowTask, error: string, willRetry: boolean) => void

  /** Task retrying */
  'task:retry': (task: WorkflowTask, attempt: number, maxAttempts: number) => void

  /** All tasks completed */
  'queue:empty': () => void

  /** Scheduler paused */
  'scheduler:paused': () => void

  /** Scheduler resumed */
  'scheduler:resumed': () => void
}

/**
 * Task queue entry
 */
interface QueueEntry {
  task: WorkflowTask
  session: WorkflowSession
  attempt: number
  priority: number
  addedAt: Date
}

/**
 * Running task entry
 */
interface RunningEntry {
  task: WorkflowTask
  session: WorkflowSession
  subagentId: string
  startedAt: Date
}

/**
 * SubagentScheduler - Orchestrates task execution
 *
 * @example
 * ```typescript
 * const scheduler = new SubagentScheduler()
 *
 * // Queue tasks
 * scheduler.queueTask(session, task1)
 * scheduler.queueTask(session, task2)
 *
 * // Start processing
 * scheduler.start()
 *
 * // Listen to events
 * scheduler.on('task:completed', (task, result) => {
 *   console.log(`Task ${task.title} completed`)
 * })
 * ```
 */
export class SubagentScheduler extends EventEmitter {
  private config: SchedulerConfig
  private queue: QueueEntry[] = []
  private running: Map<string, RunningEntry> = new Map()
  private subagentManager: SubagentManager
  private _reviewer: TwoStageReviewer
  private isRunning: boolean = false
  private isPaused: boolean = false

  constructor(config: Partial<SchedulerConfig> = {}) {
    super()
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config }
    this.subagentManager = new SubagentManager({
      maxConcurrent: this.config.maxConcurrent,
      defaultTimeout: this.config.defaultTimeout * 60 * 1000, // Convert to ms
      verbose: false,
    })
    this._reviewer = new TwoStageReviewer()

    this.setupSubagentListeners()
  }

  // ==========================================================================
  // Queue Management
  // ==========================================================================

  /**
   * Queue a task for execution
   */
  queueTask(session: WorkflowSession, task: WorkflowTask): void {
    // Check if task is already queued or running
    if (this.isTaskQueued(task.id) || this.isTaskRunning(task.id)) {
      return
    }

    const entry: QueueEntry = {
      task,
      session,
      attempt: 0,
      priority: this.getPriorityValue(task.priority),
      addedAt: new Date(),
    }

    this.queue.push(entry)
    this.sortQueue()

    // Update task status
    const stateMachine = getWorkflowStateMachine()
    stateMachine.updateTaskStatus(session.id, task.id, 'queued')

    this.emit('task:queued', task)

    // Try to process if running
    if (this.isRunning && !this.isPaused) {
      this.processQueue()
    }
  }

  /**
   * Queue multiple tasks
   */
  queueTasks(session: WorkflowSession, tasks: WorkflowTask[]): void {
    for (const task of tasks) {
      this.queueTask(session, task)
    }
  }

  /**
   * Remove a task from the queue
   */
  dequeueTask(taskId: string): boolean {
    const index = this.queue.findIndex(e => e.task.id === taskId)
    if (index >= 0) {
      this.queue.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.queue = []
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queued: number
    running: number
    capacity: number
  } {
    return {
      queued: this.queue.length,
      running: this.running.size,
      capacity: this.config.maxConcurrent - this.running.size,
    }
  }

  // ==========================================================================
  // Scheduler Control
  // ==========================================================================

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    this.isPaused = false
    this.processQueue()
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.isRunning = false
  }

  /**
   * Pause the scheduler (keeps running tasks, stops new ones)
   */
  pause(): void {
    this.isPaused = true
    this.emit('scheduler:paused')
  }

  /**
   * Resume the scheduler
   */
  resume(): void {
    this.isPaused = false
    this.emit('scheduler:resumed')
    this.processQueue()
  }

  /**
   * Cancel a running task
   */
  cancelTask(taskId: string): boolean {
    const entry = this.running.get(taskId)
    if (!entry) {
      return false
    }

    this.subagentManager.cancel(entry.subagentId)
    this.running.delete(taskId)

    const stateMachine = getWorkflowStateMachine()
    stateMachine.updateTaskStatus(entry.session.id, taskId, 'cancelled')

    return true
  }

  /**
   * Cancel all running tasks
   */
  cancelAll(): void {
    for (const taskId of Array.from(this.running.keys())) {
      this.cancelTask(taskId)
    }
  }

  // ==========================================================================
  // Task Execution
  // ==========================================================================

  /**
   * Process the queue
   */
  private processQueue(): void {
    if (!this.isRunning || this.isPaused) {
      return
    }

    // Check capacity
    const capacity = this.config.maxConcurrent - this.running.size
    if (capacity <= 0) {
      return
    }

    // Get ready tasks (dependencies satisfied)
    const readyTasks = this.getReadyTasks(capacity)

    for (const entry of readyTasks) {
      this.executeTask(entry)
    }

    // Check if queue is empty
    if (this.queue.length === 0 && this.running.size === 0) {
      this.emit('queue:empty')
    }
  }

  /**
   * Get tasks ready for execution
   */
  private getReadyTasks(limit: number): QueueEntry[] {
    const ready: QueueEntry[] = []

    for (const entry of this.queue) {
      if (ready.length >= limit) {
        break
      }

      // Check dependencies
      if (this.areDependenciesSatisfied(entry)) {
        ready.push(entry)
      }
    }

    // Remove from queue
    for (const entry of ready) {
      const index = this.queue.indexOf(entry)
      if (index >= 0) {
        this.queue.splice(index, 1)
      }
    }

    return ready
  }

  /**
   * Check if task dependencies are satisfied
   */
  private areDependenciesSatisfied(entry: QueueEntry): boolean {
    if (!entry.task.dependencies || entry.task.dependencies.length === 0) {
      return true
    }

    for (const depId of entry.task.dependencies) {
      const depTask = entry.session.tasks.find(t => t.id === depId)
      if (!depTask || depTask.status !== 'completed') {
        return false
      }
    }

    return true
  }

  /**
   * Execute a task
   */
  private async executeTask(entry: QueueEntry): Promise<void> {
    const { task, session } = entry
    entry.attempt++

    // Create subagent config
    const subagentConfig: SubagentConfig = {
      id: `task-${task.id}-${entry.attempt}`,
      name: task.title,
      mode: 'fork',
      initialPrompt: this.buildTaskPrompt(task, session),
      timeout: (task.estimatedMinutes || this.config.defaultTimeout) * 60 * 1000,
      metadata: {
        taskId: task.id,
        sessionId: session.id,
        attempt: entry.attempt,
      },
    }

    // Fork subagent
    const subagentState = this.subagentManager.fork(subagentConfig)

    // Track running task
    this.running.set(task.id, {
      task,
      session,
      subagentId: subagentState.id,
      startedAt: new Date(),
    })

    // Update task status
    const stateMachine = getWorkflowStateMachine()
    stateMachine.updateTaskStatus(session.id, task.id, 'running')
    task.subagentState = subagentState

    this.emit('task:started', task, subagentState)
  }

  /**
   * Build task prompt for subagent
   */
  private buildTaskPrompt(task: WorkflowTask, session: WorkflowSession): string {
    const lines: string[] = [
      `# Task: ${task.title}`,
      '',
      `## Description`,
      task.description,
      '',
      `## Context`,
      `- Workflow: ${session.name}`,
      `- Phase: ${session.currentPhase}`,
      `- Priority: ${task.priority}`,
      `- Estimated time: ${task.estimatedMinutes} minutes`,
      '',
    ]

    if (task.dependencies && task.dependencies.length > 0) {
      lines.push(`## Dependencies`)
      for (const depId of task.dependencies) {
        const depTask = session.tasks.find(t => t.id === depId)
        if (depTask) {
          lines.push(`- ${depTask.title} (${depTask.status})`)
        }
      }
      lines.push('')
    }

    lines.push(`## Instructions`)
    lines.push(`1. Complete the task as described`)
    lines.push(`2. Follow TDD approach: write tests first`)
    lines.push(`3. Ensure code quality and documentation`)
    lines.push(`4. Report any blockers or issues`)

    return lines.join('\n')
  }

  /**
   * Handle task completion
   */
  private async handleTaskComplete(subagentState: SubagentState): Promise<void> {
    const taskId = subagentState.config.metadata?.taskId
    const entry = this.running.get(taskId)

    if (!entry) {
      return
    }

    this.running.delete(taskId)

    const { task, session } = entry
    const stateMachine = getWorkflowStateMachine()

    // Update task with result
    task.output = subagentState.result
    task.modifiedFiles = subagentState.config.metadata?.modifiedFiles

    // Move to review status
    stateMachine.updateTaskStatus(session.id, taskId, 'review')

    // Perform review
    const reviewResult = await this.performReview(task, session)

    if (reviewResult.status === 'passed') {
      stateMachine.updateTaskStatus(session.id, taskId, 'completed')
      this.emit('task:completed', task, subagentState.result)
    }
    else {
      // Check if we should retry
      const queueEntry = { task, session, attempt: 0, priority: 0, addedAt: new Date() }
      const currentAttempt = subagentState.config.metadata?.attempt || 1

      if (this.config.autoRetry && currentAttempt < this.config.maxRetries) {
        stateMachine.updateTaskStatus(session.id, taskId, 'rejected')
        this.emit('task:failed', task, 'Review failed', true)
        this.emit('task:retry', task, currentAttempt + 1, this.config.maxRetries)

        // Re-queue with updated attempt count
        queueEntry.attempt = currentAttempt
        setTimeout(() => {
          this.queue.push(queueEntry)
          this.sortQueue()
          this.processQueue()
        }, this.config.retryDelay * 1000)
      }
      else {
        stateMachine.updateTaskStatus(session.id, taskId, 'failed')
        task.error = 'Review failed after max retries'
        this.emit('task:failed', task, task.error, false)
      }
    }

    // Continue processing
    this.processQueue()
  }

  /**
   * Handle task failure
   */
  private handleTaskFail(subagentState: SubagentState): void {
    const taskId = subagentState.config.metadata?.taskId
    const entry = this.running.get(taskId)

    if (!entry) {
      return
    }

    this.running.delete(taskId)

    const { task, session } = entry
    const stateMachine = getWorkflowStateMachine()
    const currentAttempt = subagentState.config.metadata?.attempt || 1

    // Check if we should retry
    if (this.config.autoRetry && currentAttempt < this.config.maxRetries) {
      this.emit('task:failed', task, subagentState.error || 'Unknown error', true)
      this.emit('task:retry', task, currentAttempt + 1, this.config.maxRetries)

      // Re-queue with delay
      setTimeout(() => {
        const queueEntry: QueueEntry = {
          task,
          session,
          attempt: currentAttempt,
          priority: this.getPriorityValue(task.priority),
          addedAt: new Date(),
        }
        this.queue.push(queueEntry)
        this.sortQueue()
        this.processQueue()
      }, this.config.retryDelay * 1000)
    }
    else {
      task.error = subagentState.error || 'Task failed'
      stateMachine.updateTaskStatus(session.id, taskId, 'failed')
      this.emit('task:failed', task, task.error, false)
    }

    // Continue processing
    this.processQueue()
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(subagentState: SubagentState): void {
    const taskId = subagentState.config.metadata?.taskId
    const entry = this.running.get(taskId)

    if (!entry) {
      return
    }

    this.running.delete(taskId)

    const { task, session } = entry
    const stateMachine = getWorkflowStateMachine()

    task.error = 'Task timed out'
    stateMachine.updateTaskStatus(session.id, taskId, 'failed')
    this.emit('task:failed', task, task.error, false)

    // Continue processing
    this.processQueue()
  }

  /**
   * Perform two-stage review
   */
  private async performReview(task: WorkflowTask, _session: WorkflowSession): Promise<{ status: 'passed' | 'failed' }> {
    // In a real implementation, this would:
    // 1. Read the modified files
    // 2. Get the original spec from the task
    // 3. Run the two-stage review

    // For now, we'll do a simplified check
    if (!task.modifiedFiles || task.modifiedFiles.length === 0) {
      return { status: 'failed' }
    }

    // Placeholder: In production, use the TwoStageReviewer
    // const result = await this.reviewer.review({
    //   task,
    //   session,
    //   spec: task.description,
    //   modifiedFiles: task.modifiedFiles,
    //   fileContents: new Map()
    // })

    return { status: 'passed' }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Setup subagent event listeners
   */
  private setupSubagentListeners(): void {
    this.subagentManager.on('complete', (state) => {
      this.handleTaskComplete(state)
    })

    this.subagentManager.on('fail', (state) => {
      this.handleTaskFail(state)
    })

    this.subagentManager.on('timeout', (state) => {
      this.handleTaskTimeout(state)
    })
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      // Earlier added first (FIFO for same priority)
      return a.addedAt.getTime() - b.addedAt.getTime()
    })
  }

  /**
   * Get numeric priority value
   */
  private getPriorityValue(priority: TaskPriority): number {
    const values: Record<TaskPriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    }
    return values[priority]
  }

  /**
   * Check if task is queued
   */
  private isTaskQueued(taskId: string): boolean {
    return this.queue.some(e => e.task.id === taskId)
  }

  /**
   * Check if task is running
   */
  private isTaskRunning(taskId: string): boolean {
    return this.running.has(taskId)
  }

  // ==========================================================================
  // Type-safe Event Emitter
  // ==========================================================================

  on<K extends keyof SchedulerEvents>(event: K, listener: SchedulerEvents[K]): this {
    return super.on(event, listener as any)
  }

  emit<K extends keyof SchedulerEvents>(event: K, ...args: Parameters<SchedulerEvents[K]>): boolean {
    return super.emit(event, ...args)
  }

  once<K extends keyof SchedulerEvents>(event: K, listener: SchedulerEvents[K]): this {
    return super.once(event, listener as any)
  }

  off<K extends keyof SchedulerEvents>(event: K, listener: SchedulerEvents[K]): this {
    return super.off(event, listener as any)
  }

  // ==========================================================================
  // Statistics & Workflow Management
  // ==========================================================================

  /**
   * Get scheduler statistics
   */
  getStats(): {
    activeTasks: number
    queuedTasks: number
    completedTasks: number
    failedTasks: number
    totalAgents: number
    uptime: number
  } {
    return {
      activeTasks: this.running.size,
      queuedTasks: this.queue.length,
      completedTasks: 0, // Would track in production
      failedTasks: 0, // Would track in production
      totalAgents: this.config.maxConcurrent,
      uptime: Date.now(), // Would track actual start time in production
    }
  }

  /**
   * Cancel all tasks for a specific workflow
   */
  cancelWorkflow(workflowId: string): void {
    // Cancel running tasks for this workflow
    for (const [taskId, entry] of this.running.entries()) {
      if (entry.session.id === workflowId) {
        this.cancelTask(taskId)
      }
    }

    // Remove queued tasks for this workflow
    this.queue = this.queue.filter(entry => entry.session.id !== workflowId)
  }
}

/**
 * Singleton instance
 */
let schedulerInstance: SubagentScheduler | null = null

/**
 * Get the scheduler instance
 */
export function getScheduler(config?: Partial<SchedulerConfig>): SubagentScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new SubagentScheduler(config)
  }
  return schedulerInstance
}

/**
 * Reset the scheduler instance (for testing)
 */
export function resetScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop()
    schedulerInstance.cancelAll()
    schedulerInstance.clearQueue()
  }
  schedulerInstance = null
}

/**
 * Create tasks from a plan
 */
export function createTasksFromPlan(plan: string, session: WorkflowSession): WorkflowTask[] {
  const tasks: WorkflowTask[] = []
  const lines = plan.split('\n')

  let currentTask: Partial<WorkflowTask> | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Match task headers: "## Task 1: Title" or "### 1. Title"
    // Use possessive-like pattern to avoid backtracking
    const taskMatch = trimmed.match(/^#{2,3} +(?:Task +)?\d+[.:] +(\S.*)$/i)
    if (taskMatch) {
      // Save previous task
      if (currentTask && currentTask.title) {
        tasks.push(createTask(currentTask, session))
      }

      currentTask = {
        title: taskMatch[1],
        description: '',
        priority: 'medium',
        estimatedMinutes: 15,
        dependencies: [],
        metadata: { phase: session.currentPhase },
      }
      continue
    }

    // Match priority: "Priority: high"
    const priorityMatch = trimmed.match(/^priority:\s*(critical|high|medium|low)/i)
    if (priorityMatch && currentTask) {
      currentTask.priority = priorityMatch[1].toLowerCase() as TaskPriority
      continue
    }

    // Match estimate: "Estimate: 30 minutes" or "Time: 30m"
    const estimateMatch = trimmed.match(/^(?:estimate|time):\s*(\d+)\s*(?:minutes?|m)?/i)
    if (estimateMatch && currentTask) {
      currentTask.estimatedMinutes = Number.parseInt(estimateMatch[1], 10)
      continue
    }

    // Match dependencies: "Depends on: Task 1, Task 2"
    const depsMatch = trimmed.match(/^(?:depends on|dependencies):\s*(.+)/i)
    if (depsMatch && currentTask) {
      const deps = depsMatch[1].split(',').map(d => d.trim())
      currentTask.dependencies = deps
      continue
    }

    // Add to description
    if (currentTask && trimmed && !trimmed.startsWith('#')) {
      currentTask.description = `${(currentTask.description || '') + trimmed}\n`
    }
  }

  // Save last task
  if (currentTask && currentTask.title) {
    tasks.push(createTask(currentTask, session))
  }

  return tasks
}

/**
 * Create a task from partial data
 */
function createTask(partial: Partial<WorkflowTask>, session: WorkflowSession): WorkflowTask {
  const stateMachine = getWorkflowStateMachine()

  return stateMachine.addTask(session.id, {
    title: partial.title || 'Untitled Task',
    description: (partial.description || '').trim(),
    priority: partial.priority || 'medium',
    estimatedMinutes: partial.estimatedMinutes || 15,
    dependencies: partial.dependencies || [],
    metadata: partial.metadata || {},
  })
}
