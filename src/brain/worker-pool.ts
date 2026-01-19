/**
 * Worker Pool for parallel task execution using Node.js worker_threads
 * Supports dynamic scaling, load balancing, and task distribution
 */

import type { TaskOptions } from './task-queue'
import { EventEmitter } from 'node:events'
import { cpus } from 'node:os'
import { Worker } from 'node:worker_threads'
import { TaskQueue } from './task-queue'

export interface WorkerPoolOptions {
  /**
   * Minimum number of workers (default: 1)
   */
  minWorkers?: number

  /**
   * Maximum number of workers (default: CPU count)
   */
  maxWorkers?: number

  /**
   * Worker idle timeout in milliseconds before termination (default: 30000)
   */
  workerIdleTimeout?: number

  /**
   * Maximum tasks per worker before recycling (default: 100)
   */
  maxTasksPerWorker?: number

  /**
   * Task queue concurrency (default: maxWorkers * 2)
   */
  taskQueueConcurrency?: number

  /**
   * Enable dynamic worker scaling (default: true)
   */
  enableDynamicScaling?: boolean

  /**
   * Worker script path (required for worker_threads)
   */
  workerScript?: string

  /**
   * Worker initialization data
   */
  workerData?: unknown
}

export interface WorkerInfo {
  /**
   * Worker unique identifier
   */
  id: string

  /**
   * Worker thread instance
   */
  worker: Worker

  /**
   * Worker status
   */
  status: 'idle' | 'busy' | 'terminating'

  /**
   * Number of tasks completed by this worker
   */
  tasksCompleted: number

  /**
   * Worker creation timestamp
   */
  createdAt: number

  /**
   * Last task completion timestamp
   */
  lastTaskCompletedAt: number

  /**
   * Current task ID (if busy)
   */
  currentTaskId?: string

  /**
   * Idle timeout timer
   */
  idleTimer?: NodeJS.Timeout
}

export interface WorkerPoolStats {
  /**
   * Total workers created
   */
  totalWorkersCreated: number

  /**
   * Current active workers
   */
  activeWorkers: number

  /**
   * Idle workers
   */
  idleWorkers: number

  /**
   * Busy workers
   */
  busyWorkers: number

  /**
   * Total tasks processed
   */
  totalTasksProcessed: number

  /**
   * Tasks currently in queue
   */
  queuedTasks: number

  /**
   * Average task execution time
   */
  averageTaskTime: number

  /**
   * Pool creation timestamp
   */
  createdAt: number
}

export interface WorkerTask<T = unknown> {
  /**
   * Task unique identifier
   */
  id: string

  /**
   * Task type/name for worker routing
   */
  type: string

  /**
   * Task data payload
   */
  data: unknown

  /**
   * Task options
   */
  options: TaskOptions

  /**
   * Promise resolve function
   */
  resolve: (value: T) => void

  /**
   * Promise reject function
   */
  reject: (error: Error) => void
}

export interface WorkerMessage {
  /**
   * Message type
   */
  type: 'task' | 'result' | 'error' | 'ready'

  /**
   * Task ID
   */
  taskId?: string

  /**
   * Task type
   */
  taskType?: string

  /**
   * Task data
   */
  data?: unknown

  /**
   * Result data
   */
  result?: unknown

  /**
   * Error information
   */
  error?: {
    message: string
    stack?: string
  }
}

/**
 * Worker Pool for parallel task execution
 */
export class WorkerPool extends EventEmitter {
  private workers = new Map<string, WorkerInfo>()
  private taskQueue: TaskQueue
  private options: Required<WorkerPoolOptions>
  private stats: WorkerPoolStats
  private workerIdCounter = 0
  private taskIdCounter = 0
  private pendingTasks = new Map<string, WorkerTask>()
  private terminated = false

  constructor(options: WorkerPoolOptions = {}) {
    super()

    const cpuCount = cpus().length

    this.options = {
      minWorkers: options.minWorkers ?? 1,
      maxWorkers: options.maxWorkers ?? cpuCount,
      workerIdleTimeout: options.workerIdleTimeout ?? 30000,
      maxTasksPerWorker: options.maxTasksPerWorker ?? 100,
      taskQueueConcurrency: options.taskQueueConcurrency ?? (options.maxWorkers ?? cpuCount) * 2,
      enableDynamicScaling: options.enableDynamicScaling ?? true,
      workerScript: options.workerScript ?? '',
      workerData: options.workerData ?? {},
    }

    // Validate options
    if (this.options.minWorkers < 0) {
      throw new Error('minWorkers must be >= 0')
    }
    if (this.options.maxWorkers < this.options.minWorkers) {
      throw new Error('maxWorkers must be >= minWorkers')
    }

    this.stats = {
      totalWorkersCreated: 0,
      activeWorkers: 0,
      idleWorkers: 0,
      busyWorkers: 0,
      totalTasksProcessed: 0,
      queuedTasks: 0,
      averageTaskTime: 0,
      createdAt: Date.now(),
    }

    // Initialize task queue
    this.taskQueue = new TaskQueue({
      concurrency: this.options.taskQueueConcurrency,
      autoStart: true,
    })

    // Create minimum workers
    this.initializeWorkers()
  }

  /**
   * Execute a task in the worker pool
   */
  async exec<T = unknown>(
    taskType: string,
    data: unknown,
    options: TaskOptions = {},
  ): Promise<T> {
    if (this.terminated) {
      throw new Error('Worker pool has been terminated')
    }

    return new Promise<T>((resolve, reject) => {
      const task: WorkerTask<T> = {
        id: this.generateTaskId(),
        type: taskType,
        data,
        options,
        resolve,
        reject,
      }

      this.pendingTasks.set(task.id, task as WorkerTask<unknown>)
      this.stats.queuedTasks++

      // Add to task queue for execution
      this.taskQueue.add(
        () => this.executeTask(task),
        {
          priority: options.priority,
          timeout: options.timeout,
          maxRetries: options.maxRetries,
          retryDelay: options.retryDelay,
          retryBackoff: options.retryBackoff,
          metadata: options.metadata,
        },
      ).catch((error) => {
        // Task failed after all retries
        this.pendingTasks.delete(task.id)
        this.stats.queuedTasks--
        task.reject(error)
      })
    })
  }

  /**
   * Get pool statistics
   */
  getStats(): WorkerPoolStats {
    return {
      ...this.stats,
      queuedTasks: this.taskQueue.size(),
    }
  }

  /**
   * Get current worker count
   */
  getWorkerCount(): number {
    return this.workers.size
  }

  /**
   * Get idle worker count
   */
  getIdleWorkerCount(): number {
    return Array.from(this.workers.values()).filter(w => w.status === 'idle').length
  }

  /**
   * Get busy worker count
   */
  getBusyWorkerCount(): number {
    return Array.from(this.workers.values()).filter(w => w.status === 'busy').length
  }

  /**
   * Terminate all workers and shutdown pool
   */
  async terminate(): Promise<void> {
    if (this.terminated) {
      return
    }

    this.terminated = true

    // Clear task queue
    this.taskQueue.clear()

    // Terminate all workers
    const terminationPromises = Array.from(this.workers.values()).map(workerInfo =>
      this.terminateWorker(workerInfo.id),
    )

    await Promise.all(terminationPromises)

    this.workers.clear()
    this.pendingTasks.clear()

    this.emit('terminated')
  }

  /**
   * Wait for all tasks to complete
   */
  async drain(): Promise<void> {
    await this.taskQueue.drain()
  }

  /**
   * Initialize minimum workers
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.options.minWorkers; i++) {
      this.createWorker()
    }
  }

  /**
   * Create a new worker
   */
  private createWorker(): WorkerInfo | null {
    if (this.workers.size >= this.options.maxWorkers) {
      return null
    }

    const workerId = this.generateWorkerId()

    try {
      // Create worker based on whether workerScript is provided
      let worker: Worker

      if (this.options.workerScript) {
        worker = new Worker(this.options.workerScript, {
          workerData: this.options.workerData,
        })
      }
      else {
        // Inline worker for simple function execution
        worker = new Worker(`
          const { parentPort } = require('worker_threads');

          parentPort.on('message', async (message) => {
            try {
              if (message.type === 'task') {
                // Execute task function
                const fn = new Function('data', message.taskType);
                const result = await fn(message.data);

                parentPort.postMessage({
                  type: 'result',
                  taskId: message.taskId,
                  result
                });
              }
            } catch (error) {
              parentPort.postMessage({
                type: 'error',
                taskId: message.taskId,
                error: {
                  message: error.message,
                  stack: error.stack
                }
              });
            }
          });

          parentPort.postMessage({ type: 'ready' });
        `, { eval: true })
      }

      const workerInfo: WorkerInfo = {
        id: workerId,
        worker,
        status: 'idle',
        tasksCompleted: 0,
        createdAt: Date.now(),
        lastTaskCompletedAt: Date.now(),
      }

      // Set up worker message handler
      worker.on('message', (message: WorkerMessage) => {
        this.handleWorkerMessage(workerId, message)
      })

      // Set up worker error handler
      worker.on('error', (error) => {
        this.handleWorkerError(workerId, error)
      })

      // Set up worker exit handler
      worker.on('exit', (code) => {
        this.handleWorkerExit(workerId, code)
      })

      this.workers.set(workerId, workerInfo)
      this.stats.totalWorkersCreated++
      this.stats.activeWorkers++
      this.stats.idleWorkers++

      this.emit('workerCreated', workerId)

      return workerInfo
    }
    catch (error) {
      this.emit('error', new Error(`Failed to create worker: ${error instanceof Error ? error.message : String(error)}`))
      return null
    }
  }

  /**
   * Execute a task on an available worker
   */
  private async executeTask<T>(task: WorkerTask<T>): Promise<T> {
    // Get or create an available worker
    const workerInfo = this.getAvailableWorker()

    if (!workerInfo) {
      throw new Error('No available workers')
    }

    // Mark worker as busy
    workerInfo.status = 'busy'
    workerInfo.currentTaskId = task.id
    this.stats.idleWorkers--
    this.stats.busyWorkers++

    // Clear idle timer
    if (workerInfo.idleTimer) {
      clearTimeout(workerInfo.idleTimer)
      workerInfo.idleTimer = undefined
    }

    // Send task to worker
    const message: WorkerMessage = {
      type: 'task',
      taskId: task.id,
      taskType: task.type,
      data: task.data,
    }

    workerInfo.worker.postMessage(message)

    // Return promise that resolves when task completes
    return new Promise<T>((resolve, reject) => {
      task.resolve = resolve as (value: unknown) => void
      task.reject = reject
    })
  }

  /**
   * Get an available worker or create one
   */
  private getAvailableWorker(): WorkerInfo | null {
    // Find idle worker
    const idleWorker = Array.from(this.workers.values()).find(w => w.status === 'idle')

    if (idleWorker) {
      return idleWorker
    }

    // Create new worker if dynamic scaling is enabled
    if (this.options.enableDynamicScaling && this.workers.size < this.options.maxWorkers) {
      return this.createWorker()
    }

    return null
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(workerId: string, message: WorkerMessage): void {
    const workerInfo = this.workers.get(workerId)
    if (!workerInfo) {
      return
    }

    switch (message.type) {
      case 'ready':
        this.emit('workerReady', workerId)
        break

      case 'result':
        if (message.taskId) {
          this.handleTaskResult(workerId, message.taskId, message.result)
        }
        break

      case 'error':
        if (message.taskId && message.error) {
          this.handleTaskError(workerId, message.taskId, message.error)
        }
        break
    }
  }

  /**
   * Handle task result
   */
  private handleTaskResult(workerId: string, taskId: string, result: unknown): void {
    const workerInfo = this.workers.get(workerId)
    const task = this.pendingTasks.get(taskId)

    if (!workerInfo || !task) {
      return
    }

    // Update worker status
    workerInfo.status = 'idle'
    workerInfo.tasksCompleted++
    workerInfo.lastTaskCompletedAt = Date.now()
    workerInfo.currentTaskId = undefined
    this.stats.busyWorkers--
    this.stats.idleWorkers++
    this.stats.totalTasksProcessed++

    // Resolve task
    this.pendingTasks.delete(taskId)
    this.stats.queuedTasks--
    task.resolve(result)

    // Check if worker should be recycled
    if (workerInfo.tasksCompleted >= this.options.maxTasksPerWorker) {
      this.recycleWorker(workerId)
    }
    else {
      // Set idle timer for dynamic scaling
      this.setWorkerIdleTimer(workerId)
    }

    this.emit('taskCompleted', taskId, workerId)
  }

  /**
   * Handle task error
   */
  private handleTaskError(workerId: string, taskId: string, error: { message: string, stack?: string }): void {
    const workerInfo = this.workers.get(workerId)
    const task = this.pendingTasks.get(taskId)

    if (!workerInfo || !task) {
      return
    }

    // Update worker status
    workerInfo.status = 'idle'
    workerInfo.currentTaskId = undefined
    this.stats.busyWorkers--
    this.stats.idleWorkers++

    // Reject task
    this.pendingTasks.delete(taskId)
    this.stats.queuedTasks--
    const taskError = new Error(error.message)
    if (error.stack) {
      taskError.stack = error.stack
    }
    task.reject(taskError)

    // Set idle timer
    this.setWorkerIdleTimer(workerId)

    this.emit('taskFailed', taskId, workerId, error)
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(workerId: string, error: Error): void {
    const workerInfo = this.workers.get(workerId)
    if (!workerInfo) {
      return
    }

    // If worker was processing a task, reject it
    if (workerInfo.currentTaskId) {
      const task = this.pendingTasks.get(workerInfo.currentTaskId)
      if (task) {
        this.pendingTasks.delete(workerInfo.currentTaskId)
        this.stats.queuedTasks--
        task.reject(new Error(`Worker error: ${error.message}`))
      }
    }

    this.emit('workerError', workerId, error)

    // Terminate and replace worker
    this.terminateWorker(workerId).then(() => {
      if (!this.terminated && this.workers.size < this.options.minWorkers) {
        this.createWorker()
      }
    })
  }

  /**
   * Handle worker exit
   */
  private handleWorkerExit(workerId: string, code: number): void {
    const workerInfo = this.workers.get(workerId)
    if (!workerInfo) {
      return
    }

    this.workers.delete(workerId)
    this.stats.activeWorkers--

    if (workerInfo.status === 'idle') {
      this.stats.idleWorkers--
    }
    else if (workerInfo.status === 'busy') {
      this.stats.busyWorkers--
    }

    this.emit('workerExited', workerId, code)

    // Replace worker if below minimum
    if (!this.terminated && this.workers.size < this.options.minWorkers) {
      this.createWorker()
    }
  }

  /**
   * Set worker idle timer for dynamic scaling
   */
  private setWorkerIdleTimer(workerId: string): void {
    const workerInfo = this.workers.get(workerId)
    if (!workerInfo || !this.options.enableDynamicScaling) {
      return
    }

    // Clear existing timer
    if (workerInfo.idleTimer) {
      clearTimeout(workerInfo.idleTimer)
    }

    // Don't terminate if at minimum workers
    if (this.workers.size <= this.options.minWorkers) {
      return
    }

    // Set new idle timer
    workerInfo.idleTimer = setTimeout(() => {
      if (workerInfo.status === 'idle' && this.workers.size > this.options.minWorkers) {
        this.terminateWorker(workerId)
      }
    }, this.options.workerIdleTimeout)
  }

  /**
   * Recycle a worker (terminate and create new one)
   */
  private async recycleWorker(workerId: string): Promise<void> {
    await this.terminateWorker(workerId)

    if (!this.terminated && this.workers.size < this.options.minWorkers) {
      this.createWorker()
    }
  }

  /**
   * Terminate a worker
   */
  private async terminateWorker(workerId: string): Promise<void> {
    const workerInfo = this.workers.get(workerId)
    if (!workerInfo) {
      return
    }

    workerInfo.status = 'terminating'

    // Clear idle timer
    if (workerInfo.idleTimer) {
      clearTimeout(workerInfo.idleTimer)
      workerInfo.idleTimer = undefined
    }

    try {
      await workerInfo.worker.terminate()
    }
    catch (error) {
      this.emit('error', new Error(`Failed to terminate worker ${workerId}: ${error instanceof Error ? error.message : String(error)}`))
    }
  }

  /**
   * Generate unique worker ID
   */
  private generateWorkerId(): string {
    return `worker_${++this.workerIdCounter}_${Date.now()}`
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${++this.taskIdCounter}_${Date.now()}`
  }
}
