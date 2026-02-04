/**
 * CCJK Agents V3 - Error Recovery
 *
 * Comprehensive error recovery mechanism with exponential backoff,
 * checkpoints, dead letter queue, and graceful degradation.
 *
 * @module agents-v3/error-recovery
 */

import type {
  DeadLetterEntry,
  RecoveryAction,
  RecoveryAttempt,
  RecoveryStrategy,
  Task,
  TaskCheckpoint,
  TaskError,
  TaskId,
  TaskResult,
} from './types.js'
import { EventEmitter } from 'node:events'
import { nanoid } from 'nanoid'

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  /** Enable automatic recovery */
  enabled: boolean

  /** Maximum recovery attempts per task */
  maxAttempts: number

  /** Initial retry delay in milliseconds */
  initialDelayMs: number

  /** Maximum retry delay in milliseconds */
  maxDelayMs: number

  /** Backoff multiplier */
  backoffMultiplier: number

  /** Enable checkpoint-based recovery */
  enableCheckpoints: boolean

  /** Checkpoint retention time in milliseconds */
  checkpointRetentionMs: number

  /** Enable dead letter queue */
  enableDeadLetterQueue: boolean

  /** Maximum dead letter queue size */
  maxDeadLetterQueueSize: number

  /** Dead letter retention time in milliseconds */
  deadLetterRetentionMs: number

  /** Enable graceful degradation */
  enableGracefulDegradation: boolean

  /** Custom recovery strategies */
  strategies: RecoveryStrategy[]
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ErrorRecoveryConfig = {
  enabled: true,
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  enableCheckpoints: true,
  checkpointRetentionMs: 3600000, // 1 hour
  enableDeadLetterQueue: true,
  maxDeadLetterQueueSize: 1000,
  deadLetterRetentionMs: 86400000, // 24 hours
  enableGracefulDegradation: true,
  strategies: [],
}

/**
 * Error recovery events
 */
export interface ErrorRecoveryEvents {
  'recovery:started': (taskId: TaskId, strategy: string) => void
  'recovery:attempt': (taskId: TaskId, attempt: RecoveryAttempt) => void
  'recovery:success': (taskId: TaskId, result: TaskResult) => void
  'recovery:failed': (taskId: TaskId, reason: string) => void
  'checkpoint:created': (taskId: TaskId, checkpoint: TaskCheckpoint) => void
  'checkpoint:restored': (taskId: TaskId, checkpoint: TaskCheckpoint) => void
  'deadletter:added': (entry: DeadLetterEntry) => void
  'deadletter:removed': (entryId: string) => void
  'deadletter:reprocessed': (entryId: string) => void
  'degradation:activated': (taskId: TaskId, level: string) => void
}

/**
 * Recovery context for a task
 */
interface RecoveryContext {
  taskId: TaskId
  task: Task
  attempts: RecoveryAttempt[]
  currentStrategy?: RecoveryStrategy
  startedAt: number
  lastAttemptAt?: number
}

/**
 * Error Recovery Manager
 *
 * Handles error recovery with multiple strategies including retry,
 * checkpoint restoration, and graceful degradation.
 */
export class ErrorRecovery extends EventEmitter {
  private readonly config: ErrorRecoveryConfig
  private readonly recoveryContexts: Map<TaskId, RecoveryContext> = new Map()
  private readonly checkpoints: Map<TaskId, TaskCheckpoint[]> = new Map()
  private readonly deadLetterQueue: DeadLetterEntry[] = []
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: Partial<ErrorRecoveryConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Start cleanup timer
    this.cleanupTimer = setInterval(
      () => this.cleanup(),
      60000, // Run cleanup every minute
    )
  }

  /**
   * Stop the error recovery manager
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * Handle task error and initiate recovery
   */
  async handleError(
    task: Task,
    error: TaskError,
    executor: (task: Task) => Promise<TaskResult>,
  ): Promise<TaskResult | null> {
    if (!this.config.enabled) {
      return null
    }

    // Get or create recovery context
    let context = this.recoveryContexts.get(task.id)
    if (!context) {
      context = {
        taskId: task.id,
        task,
        attempts: [],
        startedAt: Date.now(),
      }
      this.recoveryContexts.set(task.id, context)
    }

    // Find appropriate strategy
    const strategy = this.findStrategy(task, error)
    context.currentStrategy = strategy

    this.emit('recovery:started', task.id, strategy.name)

    // Execute recovery actions
    for (const action of strategy.actions) {
      const attempt = await this.executeRecoveryAction(context, action, error, executor)
      context.attempts.push(attempt)
      context.lastAttemptAt = Date.now()

      this.emit('recovery:attempt', task.id, attempt)

      if (attempt.success) {
        // Recovery successful
        const result: TaskResult = {
          taskId: task.id,
          success: true,
          durationMs: Date.now() - context.startedAt,
          retryCount: context.attempts.length,
        }

        this.recoveryContexts.delete(task.id)
        this.emit('recovery:success', task.id, result)

        return result
      }

      // Check if we should continue with next action
      if (context.attempts.length >= this.config.maxAttempts) {
        break
      }
    }

    // All recovery attempts failed
    this.handleRecoveryFailure(context, error)

    return null
  }

  /**
   * Create a checkpoint for a task
   */
  createCheckpoint(taskId: TaskId, data: unknown, progress: number): TaskCheckpoint {
    const checkpoint: TaskCheckpoint = {
      id: nanoid(),
      data,
      progress,
      timestamp: Date.now(),
    }

    let taskCheckpoints = this.checkpoints.get(taskId)
    if (!taskCheckpoints) {
      taskCheckpoints = []
      this.checkpoints.set(taskId, taskCheckpoints)
    }

    taskCheckpoints.push(checkpoint)

    this.emit('checkpoint:created', taskId, checkpoint)

    return checkpoint
  }

  /**
   * Get latest checkpoint for a task
   */
  getLatestCheckpoint(taskId: TaskId): TaskCheckpoint | undefined {
    const taskCheckpoints = this.checkpoints.get(taskId)
    if (!taskCheckpoints || taskCheckpoints.length === 0) {
      return undefined
    }

    return taskCheckpoints[taskCheckpoints.length - 1]
  }

  /**
   * Restore from checkpoint
   */
  restoreFromCheckpoint(taskId: TaskId, checkpointId?: string): TaskCheckpoint | undefined {
    const taskCheckpoints = this.checkpoints.get(taskId)
    if (!taskCheckpoints || taskCheckpoints.length === 0) {
      return undefined
    }

    let checkpoint: TaskCheckpoint | undefined

    if (checkpointId) {
      checkpoint = taskCheckpoints.find(cp => cp.id === checkpointId)
    }
    else {
      checkpoint = taskCheckpoints[taskCheckpoints.length - 1]
    }

    if (checkpoint) {
      this.emit('checkpoint:restored', taskId, checkpoint)
    }

    return checkpoint
  }

  /**
   * Clear checkpoints for a task
   */
  clearCheckpoints(taskId: TaskId): void {
    this.checkpoints.delete(taskId)
  }

  /**
   * Add entry to dead letter queue
   */
  addToDeadLetterQueue(task: Task, error: TaskError, reason: string): DeadLetterEntry {
    const context = this.recoveryContexts.get(task.id)

    const entry: DeadLetterEntry = {
      id: nanoid(),
      task,
      error,
      recoveryAttempts: context?.attempts || [],
      timestamp: Date.now(),
      reason,
    }

    // Enforce max size
    while (this.deadLetterQueue.length >= this.config.maxDeadLetterQueueSize) {
      this.deadLetterQueue.shift()
    }

    this.deadLetterQueue.push(entry)

    this.emit('deadletter:added', entry)

    return entry
  }

  /**
   * Get dead letter queue entries
   */
  getDeadLetterQueue(): DeadLetterEntry[] {
    return [...this.deadLetterQueue]
  }

  /**
   * Get dead letter entry by ID
   */
  getDeadLetterEntry(entryId: string): DeadLetterEntry | undefined {
    return this.deadLetterQueue.find(e => e.id === entryId)
  }

  /**
   * Remove entry from dead letter queue
   */
  removeFromDeadLetterQueue(entryId: string): boolean {
    const index = this.deadLetterQueue.findIndex(e => e.id === entryId)
    if (index !== -1) {
      this.deadLetterQueue.splice(index, 1)
      this.emit('deadletter:removed', entryId)
      return true
    }
    return false
  }

  /**
   * Reprocess dead letter entry
   */
  async reprocessDeadLetter(
    entryId: string,
    executor: (task: Task) => Promise<TaskResult>,
  ): Promise<TaskResult | null> {
    const entry = this.getDeadLetterEntry(entryId)
    if (!entry) {
      return null
    }

    this.emit('deadletter:reprocessed', entryId)

    // Reset task state
    entry.task.status = 'pending'
    entry.task.retryCount = 0
    entry.task.error = undefined

    try {
      const result = await executor(entry.task)

      if (result.success) {
        this.removeFromDeadLetterQueue(entryId)
      }

      return result
    }
    catch (error) {
      return null
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attemptNumber: number): number {
    const delay = this.config.initialDelayMs
      * this.config.backoffMultiplier ** (attemptNumber - 1)

    // Add jitter (10% random variation)
    const jitter = delay * 0.1 * (Math.random() - 0.5)

    return Math.min(delay + jitter, this.config.maxDelayMs)
  }

  /**
   * Get recovery statistics
   */
  getStats(): {
    activeRecoveries: number
    totalCheckpoints: number
    deadLetterQueueSize: number
    successRate: number
  } {
    let totalAttempts = 0
    let successfulAttempts = 0

    for (const context of this.recoveryContexts.values()) {
      for (const attempt of context.attempts) {
        totalAttempts++
        if (attempt.success) {
          successfulAttempts++
        }
      }
    }

    let totalCheckpoints = 0
    for (const checkpoints of this.checkpoints.values()) {
      totalCheckpoints += checkpoints.length
    }

    return {
      activeRecoveries: this.recoveryContexts.size,
      totalCheckpoints,
      deadLetterQueueSize: this.deadLetterQueue.length,
      successRate: totalAttempts > 0 ? successfulAttempts / totalAttempts : 0,
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Find appropriate recovery strategy
   */
  private findStrategy(task: Task, error: TaskError): RecoveryStrategy {
    // Check custom strategies first
    for (const strategy of this.config.strategies) {
      if (this.strategyMatches(strategy, task, error)) {
        return strategy
      }
    }

    // Return default strategy
    return this.getDefaultStrategy(error)
  }

  /**
   * Check if strategy matches task and error
   */
  private strategyMatches(
    strategy: RecoveryStrategy,
    task: Task,
    error: TaskError,
  ): boolean {
    if (!strategy.conditions) {
      return false
    }

    if (strategy.conditions.errorCodes
      && !strategy.conditions.errorCodes.includes(error.code)) {
      return false
    }

    if (strategy.conditions.taskTypes
      && !strategy.conditions.taskTypes.includes(task.type)) {
      return false
    }

    return true
  }

  /**
   * Get default recovery strategy based on error
   */
  private getDefaultStrategy(error: TaskError): RecoveryStrategy {
    const actions: RecoveryAction[] = []

    if (error.recoverable) {
      actions.push('retry')

      if (this.config.enableCheckpoints) {
        actions.push('checkpoint_restore')
      }

      actions.push('reassign_task')
    }

    if (this.config.enableGracefulDegradation) {
      actions.push('graceful_degrade')
    }

    actions.push('dead_letter')

    return {
      name: 'default',
      actions,
      maxAttempts: this.config.maxAttempts,
      timeoutMs: this.config.maxDelayMs * this.config.maxAttempts,
    }
  }

  /**
   * Execute a recovery action
   */
  private async executeRecoveryAction(
    context: RecoveryContext,
    action: RecoveryAction,
    error: TaskError,
    executor: (task: Task) => Promise<TaskResult>,
  ): Promise<RecoveryAttempt> {
    const startTime = Date.now()
    const attemptNumber = context.attempts.length + 1

    try {
      switch (action) {
        case 'retry':
          return await this.executeRetry(context, attemptNumber, executor)

        case 'checkpoint_restore':
          return await this.executeCheckpointRestore(context, executor)

        case 'reassign_task':
          return await this.executeReassign(context, executor)

        case 'graceful_degrade':
          return this.executeGracefulDegrade(context)

        case 'restart_agent':
          return this.executeRestartAgent(context)

        case 'dead_letter':
          return this.executeDeadLetter(context, error)

        case 'escalate':
          return this.executeEscalate(context, error)

        case 'ignore':
          return {
            attempt: attemptNumber,
            action,
            success: true,
            durationMs: Date.now() - startTime,
            timestamp: Date.now(),
          }

        default:
          return {
            attempt: attemptNumber,
            action,
            success: false,
            error: `Unknown recovery action: ${action}`,
            durationMs: Date.now() - startTime,
            timestamp: Date.now(),
          }
      }
    }
    catch (err) {
      return {
        attempt: attemptNumber,
        action,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Execute retry action
   */
  private async executeRetry(
    context: RecoveryContext,
    attemptNumber: number,
    executor: (task: Task) => Promise<TaskResult>,
  ): Promise<RecoveryAttempt> {
    const startTime = Date.now()

    // Calculate delay
    const delay = this.calculateRetryDelay(attemptNumber)
    await this.sleep(delay)

    try {
      // Reset task state
      context.task.status = 'pending'
      context.task.error = undefined

      const result = await executor(context.task)

      return {
        attempt: attemptNumber,
        action: 'retry',
        success: result.success,
        error: result.error?.message,
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      }
    }
    catch (err) {
      return {
        attempt: attemptNumber,
        action: 'retry',
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Execute checkpoint restore action
   */
  private async executeCheckpointRestore(
    context: RecoveryContext,
    executor: (task: Task) => Promise<TaskResult>,
  ): Promise<RecoveryAttempt> {
    const startTime = Date.now()
    const attemptNumber = context.attempts.length + 1

    const checkpoint = this.restoreFromCheckpoint(context.taskId)
    if (!checkpoint) {
      return {
        attempt: attemptNumber,
        action: 'checkpoint_restore',
        success: false,
        error: 'No checkpoint available',
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      }
    }

    try {
      // Restore task state from checkpoint
      context.task.checkpoint = checkpoint
      context.task.progress = checkpoint.progress
      context.task.status = 'pending'
      context.task.error = undefined

      const result = await executor(context.task)

      return {
        attempt: attemptNumber,
        action: 'checkpoint_restore',
        success: result.success,
        error: result.error?.message,
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      }
    }
    catch (err) {
      return {
        attempt: attemptNumber,
        action: 'checkpoint_restore',
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Execute reassign task action
   */
  private async executeReassign(
    context: RecoveryContext,
    executor: (task: Task) => Promise<TaskResult>,
  ): Promise<RecoveryAttempt> {
    const startTime = Date.now()
    const attemptNumber = context.attempts.length + 1

    try {
      // Clear agent assignment
      context.task.assignedAgentId = undefined
      context.task.status = 'pending'
      context.task.error = undefined

      const result = await executor(context.task)

      return {
        attempt: attemptNumber,
        action: 'reassign_task',
        success: result.success,
        error: result.error?.message,
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      }
    }
    catch (err) {
      return {
        attempt: attemptNumber,
        action: 'reassign_task',
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Execute graceful degrade action
   */
  private executeGracefulDegrade(context: RecoveryContext): RecoveryAttempt {
    const startTime = Date.now()
    const attemptNumber = context.attempts.length + 1

    // Mark task as degraded but successful
    context.task.status = 'completed'
    context.task.output = {
      data: null,
      confidence: 0,
      warnings: ['Task completed with graceful degradation'],
      metadata: {
        degraded: true,
        originalError: context.task.error?.message,
      },
    }

    this.emit('degradation:activated', context.taskId, 'graceful')

    return {
      attempt: attemptNumber,
      action: 'graceful_degrade',
      success: true,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    }
  }

  /**
   * Execute restart agent action
   */
  private executeRestartAgent(context: RecoveryContext): RecoveryAttempt {
    const startTime = Date.now()
    const attemptNumber = context.attempts.length + 1

    // This would trigger agent restart through the pool
    // For now, just mark as needing reassignment
    context.task.assignedAgentId = undefined

    return {
      attempt: attemptNumber,
      action: 'restart_agent',
      success: true,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    }
  }

  /**
   * Execute dead letter action
   */
  private executeDeadLetter(
    context: RecoveryContext,
    error: TaskError,
  ): RecoveryAttempt {
    const startTime = Date.now()
    const attemptNumber = context.attempts.length + 1

    this.addToDeadLetterQueue(
      context.task,
      error,
      'All recovery attempts exhausted',
    )

    return {
      attempt: attemptNumber,
      action: 'dead_letter',
      success: true, // Successfully moved to dead letter
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    }
  }

  /**
   * Execute escalate action
   */
  private executeEscalate(
    context: RecoveryContext,
    error: TaskError,
  ): RecoveryAttempt {
    const startTime = Date.now()
    const attemptNumber = context.attempts.length + 1

    // Escalation would notify external systems
    // For now, just log and add to dead letter
    console.error(`[ErrorRecovery] Escalating task ${context.taskId}: ${error.message}`)

    return {
      attempt: attemptNumber,
      action: 'escalate',
      success: true,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    }
  }

  /**
   * Handle recovery failure
   */
  private handleRecoveryFailure(context: RecoveryContext, error: TaskError): void {
    // Add to dead letter queue if not already there
    if (this.config.enableDeadLetterQueue) {
      const existingEntry = this.deadLetterQueue.find(
        e => e.task.id === context.taskId,
      )

      if (!existingEntry) {
        this.addToDeadLetterQueue(
          context.task,
          error,
          'Recovery failed after all attempts',
        )
      }
    }

    this.recoveryContexts.delete(context.taskId)
    this.emit('recovery:failed', context.taskId, 'All recovery attempts exhausted')
  }

  /**
   * Cleanup old checkpoints and dead letter entries
   */
  private cleanup(): void {
    const now = Date.now()

    // Cleanup old checkpoints
    if (this.config.enableCheckpoints) {
      for (const [taskId, checkpoints] of this.checkpoints.entries()) {
        const validCheckpoints = checkpoints.filter(
          cp => now - cp.timestamp < this.config.checkpointRetentionMs,
        )

        if (validCheckpoints.length === 0) {
          this.checkpoints.delete(taskId)
        }
        else if (validCheckpoints.length !== checkpoints.length) {
          this.checkpoints.set(taskId, validCheckpoints)
        }
      }
    }

    // Cleanup old dead letter entries
    if (this.config.enableDeadLetterQueue) {
      const validEntries = this.deadLetterQueue.filter(
        entry => now - entry.timestamp < this.config.deadLetterRetentionMs,
      )

      if (validEntries.length !== this.deadLetterQueue.length) {
        this.deadLetterQueue.length = 0
        this.deadLetterQueue.push(...validEntries)
      }
    }

    // Cleanup stale recovery contexts
    for (const [taskId, context] of this.recoveryContexts.entries()) {
      const elapsed = now - context.startedAt
      const timeout = context.currentStrategy?.timeoutMs || 300000

      if (elapsed > timeout) {
        this.recoveryContexts.delete(taskId)
      }
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
 * Create an error recovery instance
 */
export function createErrorRecovery(config?: Partial<ErrorRecoveryConfig>): ErrorRecovery {
  return new ErrorRecovery(config)
}
