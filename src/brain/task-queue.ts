/**
 * Priority Task Queue with timeout handling and retry mechanism
 * Supports task prioritization, automatic retries, and timeout management
 */

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

export interface TaskOptions {
  /**
   * Task priority level (default: 'normal')
   */
  priority?: TaskPriority

  /**
   * Maximum execution time in milliseconds (default: 30000)
   */
  timeout?: number

  /**
   * Maximum number of retry attempts (default: 0)
   */
  maxRetries?: number

  /**
   * Delay between retries in milliseconds (default: 1000)
   */
  retryDelay?: number

  /**
   * Exponential backoff multiplier for retry delay (default: 1)
   */
  retryBackoff?: number

  /**
   * Task metadata for tracking and debugging
   */
  metadata?: Record<string, unknown>
}

export interface Task<T = unknown> {
  /**
   * Unique task identifier
   */
  id: string

  /**
   * Task execution function
   */
  execute: () => Promise<T>

  /**
   * Task options
   */
  options: Required<TaskOptions>

  /**
   * Task creation timestamp
   */
  createdAt: number

  /**
   * Number of retry attempts made
   */
  retryCount: number

  /**
   * Task status
   */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout'

  /**
   * Promise resolve function
   */
  resolve: (value: T) => void

  /**
   * Promise reject function
   */
  reject: (error: Error) => void
}

export interface TaskQueueStats {
  /**
   * Total tasks added to queue
   */
  totalTasks: number

  /**
   * Tasks currently pending
   */
  pendingTasks: number

  /**
   * Tasks currently running
   */
  runningTasks: number

  /**
   * Successfully completed tasks
   */
  completedTasks: number

  /**
   * Failed tasks
   */
  failedTasks: number

  /**
   * Timed out tasks
   */
  timeoutTasks: number

  /**
   * Average task execution time in milliseconds
   */
  averageExecutionTime: number

  /**
   * Queue creation timestamp
   */
  createdAt: number
}

export interface TaskQueueOptions {
  /**
   * Maximum number of concurrent tasks (default: Infinity)
   */
  concurrency?: number

  /**
   * Default task timeout in milliseconds (default: 30000)
   */
  defaultTimeout?: number

  /**
   * Default maximum retries (default: 0)
   */
  defaultMaxRetries?: number

  /**
   * Default retry delay in milliseconds (default: 1000)
   */
  defaultRetryDelay?: number

  /**
   * Enable automatic queue processing (default: true)
   */
  autoStart?: boolean
}

/**
 * Priority-based task queue with timeout and retry support
 */
export class TaskQueue {
  private queue: Task[] = []
  private runningTasks = new Set<string>()
  private stats: TaskQueueStats
  private options: Required<TaskQueueOptions>
  private taskIdCounter = 0
  private executionTimes: number[] = []
  private processing = false
  private paused = false

  constructor(options: TaskQueueOptions = {}) {
    this.options = {
      concurrency: options.concurrency ?? Number.POSITIVE_INFINITY,
      defaultTimeout: options.defaultTimeout ?? 30000,
      defaultMaxRetries: options.defaultMaxRetries ?? 0,
      defaultRetryDelay: options.defaultRetryDelay ?? 1000,
      autoStart: options.autoStart ?? true,
    }

    this.stats = {
      totalTasks: 0,
      pendingTasks: 0,
      runningTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      timeoutTasks: 0,
      averageExecutionTime: 0,
      createdAt: Date.now(),
    }

    if (this.options.autoStart) {
      this.start()
    }
  }

  /**
   * Add a task to the queue
   */
  add<T>(execute: () => Promise<T>, options: TaskOptions = {}): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: Task<T> = {
        id: this.generateTaskId(),
        execute,
        options: {
          priority: options.priority ?? 'normal',
          timeout: options.timeout ?? this.options.defaultTimeout,
          maxRetries: options.maxRetries ?? this.options.defaultMaxRetries,
          retryDelay: options.retryDelay ?? this.options.defaultRetryDelay,
          retryBackoff: options.retryBackoff ?? 1,
          metadata: options.metadata ?? {},
        },
        createdAt: Date.now(),
        retryCount: 0,
        status: 'pending',
        resolve,
        reject,
      }

      this.queue.push(task as Task<unknown>)
      this.stats.totalTasks++
      this.stats.pendingTasks++

      // Sort queue by priority
      this.sortQueue()

      // Trigger processing if not paused
      if (!this.paused) {
        this.processQueue()
      }
    })
  }

  /**
   * Start queue processing
   */
  start(): void {
    this.paused = false
    this.processQueue()
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    this.paused = true
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    this.start()
  }

  /**
   * Clear all pending tasks
   */
  clear(): void {
    const pendingTasks = this.queue.filter(task => task.status === 'pending')
    pendingTasks.forEach((task) => {
      task.status = 'failed'
      task.reject(new Error('Task cancelled: queue cleared'))
    })
    this.queue = this.queue.filter(task => task.status === 'running')
    this.stats.pendingTasks = 0
  }

  /**
   * Wait for all tasks to complete
   */
  async drain(): Promise<void> {
    while (this.queue.length > 0 || this.runningTasks.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): TaskQueueStats {
    return { ...this.stats }
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.queue.length
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0 && this.runningTasks.size === 0
  }

  /**
   * Check if queue is paused
   */
  isPaused(): boolean {
    return this.paused
  }

  /**
   * Process tasks in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.paused) {
      return
    }

    this.processing = true

    while (!this.paused && this.queue.length > 0 && this.runningTasks.size < this.options.concurrency) {
      const task = this.queue.find(t => t.status === 'pending')
      if (!task) {
        break
      }

      task.status = 'running'
      this.stats.pendingTasks--
      this.stats.runningTasks++
      this.runningTasks.add(task.id)

      // Execute task without blocking queue processing
      this.executeTask(task).catch(() => {
        // Error already handled in executeTask
      })
    }

    this.processing = false
  }

  /**
   * Execute a single task with timeout and retry support
   */
  private async executeTask<T>(task: Task<T>): Promise<void> {
    const startTime = Date.now()

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Task timeout after ${task.options.timeout}ms`))
        }, task.options.timeout)
      })

      // Race between task execution and timeout
      const result = await Promise.race([
        task.execute(),
        timeoutPromise,
      ])

      // Task completed successfully
      const executionTime = Date.now() - startTime
      this.recordExecutionTime(executionTime)

      task.status = 'completed'
      this.stats.completedTasks++
      task.resolve(result)
    }
    catch (error) {
      // Check if it's a timeout error
      const isTimeout = error instanceof Error && error.message.includes('timeout')

      if (isTimeout) {
        task.status = 'timeout'
        this.stats.timeoutTasks++
      }

      // Retry logic
      if (task.retryCount < task.options.maxRetries) {
        task.retryCount++
        task.status = 'pending'

        // Calculate retry delay with exponential backoff
        const delay = task.options.retryDelay * task.options.retryBackoff ** (task.retryCount - 1)

        // Schedule retry
        setTimeout(() => {
          this.stats.pendingTasks++
          this.sortQueue()
          this.processQueue()
        }, delay)
      }
      else {
        // Max retries reached or no retries configured
        task.status = 'failed'
        this.stats.failedTasks++
        task.reject(error instanceof Error ? error : new Error(String(error)))
      }
    }
    finally {
      // Clean up running task
      this.runningTasks.delete(task.id)
      this.stats.runningTasks--

      // Remove completed/failed tasks from queue
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'timeout') {
        this.queue = this.queue.filter(t => t.id !== task.id)
      }

      // Continue processing queue
      this.processQueue()
    }
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    }

    this.queue.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[a.options.priority] - priorityOrder[b.options.priority]
      if (priorityDiff !== 0) {
        return priorityDiff
      }

      // Then by creation time (FIFO for same priority)
      return a.createdAt - b.createdAt
    })
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${++this.taskIdCounter}_${Date.now()}`
  }

  /**
   * Record task execution time for statistics
   */
  private recordExecutionTime(time: number): void {
    this.executionTimes.push(time)

    // Keep only last 100 execution times for average calculation
    if (this.executionTimes.length > 100) {
      this.executionTimes.shift()
    }

    // Calculate average
    const sum = this.executionTimes.reduce((acc, t) => acc + t, 0)
    this.stats.averageExecutionTime = sum / this.executionTimes.length
  }
}
