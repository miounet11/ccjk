/**
 * CCJK Enhanced Worker Pool - v4.0.0
 *
 * Advanced multi-threaded execution system with:
 * - Worker specialization by task type
 * - Worker affinity for cache optimization
 * - Priority-based task scheduling
 * - Real-time performance monitoring
 * - Dynamic scaling based on load
 *
 * @module concurrency/enhanced-worker-pool
 */

import type { TaskOptions } from '../brain/task-queue'
import type { WorkerPoolStats, WorkerTask } from '../brain/worker-pool'
import { EventEmitter } from 'node:events'
import { cpus } from 'node:os'
import { join } from 'node:path'
import { Worker } from 'node:worker_threads'
import { nanoid } from 'nanoid'

// Default to current directory for __dirname in ESM
const __dirname = '.'

/**
 * Worker specialization type
 */
export type WorkerSpecialization = 'general' | 'cpu' | 'io' | 'network' | 'analysis'

/**
 * Worker state with extended information
 */
export interface EnhancedWorkerInfo {
  /** Worker unique identifier */
  id: string

  /** Worker thread instance */
  worker: Worker

  /** Worker status */
  status: 'idle' | 'busy' | 'terminating' | 'warming-up'

  /** Number of tasks completed by this worker */
  tasksCompleted: number

  /** Worker creation timestamp */
  createdAt: number

  /** Last task completion timestamp */
  lastTaskCompletedAt: number

  /** Current task ID (if busy) */
  currentTaskId?: string

  /** Idle timeout timer */
  idleTimer?: NodeJS.Timeout

  /** Worker specialization */
  specialization: WorkerSpecialization

  /** Worker capabilities */
  capabilities: string[]

  /** Current load (0-1) */
  currentLoad: number

  /** Average task completion time */
  avgTaskTime: number

  /** Task history (last 100 tasks) */
  taskHistory: Array<{
    taskId: string
    type: string
    duration: number
    success: boolean
    timestamp: number
  }>

  /** Cache affinity (tasks this worker is good at) */
  cacheAffinity: string[]
}

/**
 * Enhanced worker pool options
 */
export interface EnhancedWorkerPoolOptions {
  /** Minimum number of workers (default: 1) */
  minWorkers?: number

  /** Maximum number of workers (default: CPU count) */
  maxWorkers?: number

  /** Worker specialization configuration */
  specialization?: {
    /** Number of general workers */
    general?: number
    /** Number of CPU-intensive workers */
    cpu?: number
    /** Number of I/O workers */
    io?: number
    /** Number of network workers */
    network?: number
    /** Number of analysis workers */
    analysis?: number
  }

  /** Worker idle timeout in milliseconds before termination (default: 30000) */
  workerIdleTimeout?: number

  /** Maximum tasks per worker before recycling (default: 100) */
  maxTasksPerWorker?: number

  /** Task queue concurrency (default: maxWorkers * 2) */
  taskQueueConcurrency?: number

  /** Enable dynamic worker scaling */
  enableDynamicScaling?: boolean

  /** Enable worker specialization */
  enableSpecialization?: boolean

  /** Enable cache affinity */
  enableCacheAffinity?: boolean

  /** Enable performance monitoring */
  enableMonitoring?: boolean

  /** Worker script path (required for worker_threads) */
  workerScript?: string

  /** Worker initialization data */
  workerData?: unknown
}

/**
 * Task type to specialization mapping
 */
const TASK_SPECIALIZATION: Record<string, WorkerSpecialization> = {
  // CPU intensive tasks
  'crypto': 'cpu',
  'compression': 'cpu',
  'encoding': 'cpu',
  'image-processing': 'cpu',
  'video-processing': 'cpu',

  // I/O intensive tasks
  'file-read': 'io',
  'file-write': 'io',
  'database-query': 'io',
  'database-write': 'io',

  // Network intensive tasks
  'http-request': 'network',
  'websocket': 'network',
  'grpc': 'network',

  // Analysis tasks
  'code-analysis': 'analysis',
  'text-analysis': 'analysis',
  'data-analysis': 'analysis',
  'semantic-analysis': 'analysis',
}

/**
 * Enhanced worker pool statistics
 */
export interface EnhancedWorkerPoolStats extends WorkerPoolStats {
  /** Workers by specialization */
  workersBySpecialization: Record<WorkerSpecialization, number>

  /** Active workers by specialization */
  activeBySpecialization: Record<WorkerSpecialization, number>

  /** Task throughput (tasks/second) */
  throughput: number

  /** Average queue wait time */
  avgQueueWaitTime: number

  /** Cache hit rate */
  cacheHitRate: number

  /** Memory usage in bytes */
  memoryUsage: number
}

/**
 * Worker performance metrics
 */
export interface WorkerPerformanceMetrics {
  /** Worker ID */
  workerId: string

  /** Specialization */
  specialization: WorkerSpecialization

  /** Tasks completed in last minute */
  tasksPerMinute: number

  /** Average task duration */
  avgTaskDuration: number

  /** Success rate (0-1) */
  successRate: number

  /** Current load (0-1) */
  currentLoad: number

  /** Cache affinity score */
  affinityScore: number
}

/**
 * Enhanced worker pool class
 */
export class EnhancedWorkerPool extends EventEmitter {
  private workers = new Map<string, EnhancedWorkerInfo>()
  private taskQueue: EnhancedTaskQueue
  private options: Required<EnhancedWorkerPoolOptions>
  private stats: EnhancedWorkerPoolStats
  private workerIdCounter = 0
  private taskIdCounter = 0
  private pendingTasks = new Map<string, EnhancedWorkerTask>()
  private terminated = false

  // Performance monitoring
  private performanceMetrics = new Map<string, WorkerPerformanceMetrics>()
  private monitoringInterval?: NodeJS.Timeout

  // Task timing
  private taskQueueTimestamps = new Map<string, number>()

  constructor(options: EnhancedWorkerPoolOptions = {}) {
    super()

    const cpuCount = cpus().length

    // Calculate specialization distribution
    const defaultSpecialization = {
      general: Math.max(1, Math.floor(cpuCount * 0.3)),
      cpu: Math.floor(cpuCount * 0.2),
      io: Math.floor(cpuCount * 0.2),
      network: Math.floor(cpuCount * 0.15),
      analysis: Math.floor(cpuCount * 0.15),
    }

    this.options = {
      minWorkers: options.minWorkers ?? 1,
      maxWorkers: options.maxWorkers ?? cpuCount,
      workerIdleTimeout: options.workerIdleTimeout ?? 30000,
      maxTasksPerWorker: options.maxTasksPerWorker ?? 100,
      taskQueueConcurrency: options.taskQueueConcurrency ?? (options.maxWorkers ?? cpuCount) * 2,
      enableDynamicScaling: options.enableDynamicScaling ?? true,
      enableSpecialization: options.enableSpecialization ?? true,
      enableCacheAffinity: options.enableCacheAffinity ?? true,
      enableMonitoring: options.enableMonitoring ?? true,
      workerScript: options.workerScript ?? join(__dirname, 'worker-bootstrap.js'),
      workerData: options.workerData ?? {},
      specialization: { ...defaultSpecialization, ...options.specialization },
    }

    // Initialize statistics
    this.stats = {
      totalWorkersCreated: 0,
      activeWorkers: 0,
      idleWorkers: 0,
      busyWorkers: 0,
      totalTasksProcessed: 0,
      queuedTasks: 0,
      averageTaskTime: 0,
      createdAt: Date.now(),
      workersBySpecialization: {
        general: 0,
        cpu: 0,
        io: 0,
        network: 0,
        analysis: 0,
      },
      activeBySpecialization: {
        general: 0,
        cpu: 0,
        io: 0,
        network: 0,
        analysis: 0,
      },
      throughput: 0,
      avgQueueWaitTime: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
    }

    // Initialize task queue with priority support
    this.taskQueue = new EnhancedTaskQueue({
      concurrency: this.options.taskQueueConcurrency,
      autoStart: true,
    })

    // Setup task queue event handlers
    this.setupTaskQueueEvents()

    // Initialize specialized workers
    this.initializeWorkers()

    // Start performance monitoring
    if (this.options.enableMonitoring) {
      this.startMonitoring()
    }
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
      const task: EnhancedWorkerTask = {
        id: this.generateTaskId(),
        type: taskType,
        data,
        options,
        resolve: resolve as (value: unknown) => void,
        reject,
        specialization: this.determineSpecialization(taskType, data),
        createdAt: Date.now(),
        priority: options.priority || 'normal',
      }

      this.pendingTasks.set(task.id, task)
      this.taskQueueTimestamps.set(task.id, Date.now())
      this.stats.queuedTasks++

      // Add to specialized queue
      this.taskQueue.add(task)

      // Update statistics
      this.updateQueueWaitTime()
    })
  }

  /**
   * Determine task specialization
   */
  private determineSpecialization(taskType: string, data: unknown): WorkerSpecialization {
    if (!this.options.enableSpecialization) {
      return 'general'
    }

    // Check explicit specialization mapping
    if (taskType in TASK_SPECIALIZATION) {
      return TASK_SPECIALIZATION[taskType]
    }

    // Analyze data to infer specialization
    if (typeof data === 'object' && data !== null) {
      const dataObj = data as Record<string, unknown>

      // Check for network-related data
      if ('url' in dataObj || 'http' in dataObj || 'fetch' in dataObj) {
        return 'network'
      }

      // Check for file-related data
      if ('filePath' in dataObj || 'file' in dataObj || 'path' in dataObj) {
        return 'io'
      }

      // Check for analysis-related data
      if ('analyze' in dataObj || 'parse' in dataObj || 'process' in dataObj) {
        return 'analysis'
      }
    }

    // Default to general
    return 'general'
  }

  /**
   * Initialize workers with specializations
   */
  private initializeWorkers(): void {
    const spec = this.options.specialization

    // Create workers for each specialization
    for (const [type, count] of Object.entries(spec)) {
      for (let i = 0; i < count; i++) {
        this.createWorker(type as WorkerSpecialization)
      }
    }
  }

  /**
   * Create a specialized worker
   */
  private createWorker(specialization: WorkerSpecialization = 'general'): EnhancedWorkerInfo | null {
    if (this.workers.size >= this.options.maxWorkers) {
      return null
    }

    const workerId = this.generateWorkerId(specialization)

    try {
      // Create worker with specialization context
      const workerData = {
        ...(this.options.workerData || {}),
        specialization,
        workerId,
      }

      let worker: Worker

      if (this.options.workerScript && this.options.workerScript !== join(__dirname, 'worker-bootstrap.js')) {
        // Custom worker script
        worker = new Worker(this.options.workerScript, {
          workerData,
        })
      }
      else {
        // Built-in inline worker with specialization support
        worker = new Worker(`
          const { parentPort } = require('worker_threads');

          // Worker specialization context
          let workerSpecialization = workerData?.specialization || 'general';
          let taskCount = 0;

          parentPort.on('message', async (message) => {
            try {
              if (message.type === 'task') {
                const startTime = Date.now();

                // Execute task based on specialization
                let result;

                if (workerSpecialization === 'cpu') {
                  result = await executeCPUTask(message.taskType, message.data);
                }
                else if (workerSpecialization === 'io') {
                  result = await executeIOTask(message.taskType, message.data);
                }
                else if (workerSpecialization === 'network') {
                  result = await executeNetworkTask(message.taskType, message.data);
                }
                else if (workerSpecialization === 'analysis') {
                  result = await executeAnalysisTask(message.taskType, message.data);
                }
                else {
                  result = await executeGeneralTask(message.taskType, message.data);
                }

                const duration = Date.now() - startTime;
                taskCount++;

                parentPort.postMessage({
                  type: 'result',
                  taskId: message.taskId,
                  result,
                  duration,
                  specialization: workerSpecialization,
                });
              }
            } catch (error) {
              parentPort.postMessage({
                type: 'error',
                taskId: message.taskId,
                error: {
                  message: error.message,
                  stack: error.stack,
                },
              });
            }
          });

          // Task execution functions
          async function executeCPUTask(taskType, data) {
            // CPU-intensive task simulation
            return { taskType, data, processed: true, method: 'cpu' };
          }

          async function executeIOTask(taskType, data) {
            // I/O-intensive task simulation
            return { taskType, data, processed: true, method: 'io' };
          }

          async function executeNetworkTask(taskType, data) {
            // Network-intensive task simulation
            return { taskType, data, processed: true, method: 'network' };
          }

          async function executeAnalysisTask(taskType, data) {
            // Analysis task simulation
            return { taskType, data, processed: true, method: 'analysis' };
          }

          async function executeGeneralTask(taskType, data) {
            // General task execution
            const fn = new Function('data', 'return ' + taskType);
            return await fn(data);
          }

          parentPort.postMessage({ type: 'ready', specialization: workerSpecialization });
        `, {
          eval: true,
          workerData,
        })
      }

      const workerInfo: EnhancedWorkerInfo = {
        id: workerId,
        worker,
        status: 'idle',
        tasksCompleted: 0,
        createdAt: Date.now(),
        lastTaskCompletedAt: Date.now(),
        specialization,
        capabilities: this.getCapabilitiesForSpecialization(specialization),
        currentLoad: 0,
        avgTaskTime: 0,
        taskHistory: [],
        cacheAffinity: [],
      }

      // Set up worker message handler
      worker.on('message', message => this.handleWorkerMessage(workerId, message))

      // Set up worker error handler
      worker.on('error', error => this.handleWorkerError(workerId, error))

      // Set up worker exit handler
      worker.on('exit', code => this.handleWorkerExit(workerId, code))

      this.workers.set(workerId, workerInfo)
      this.stats.totalWorkersCreated++
      this.stats.activeWorkers++
      this.stats.idleWorkers++
      this.stats.workersBySpecialization[specialization]++

      this.emit('workerCreated', workerId, specialization)

      return workerInfo
    }
    catch (error) {
      this.emit('error', new Error(`Failed to create worker: ${error}`))
      return null
    }
  }

  /**
   * Get capabilities for a specialization
   */
  private getCapabilitiesForSpecialization(specialization: WorkerSpecialization): string[] {
    const capabilities: Record<WorkerSpecialization, string[]> = {
      general: ['*'],
      cpu: ['crypto', 'compression', 'encoding', 'image-processing', 'video-processing', 'computation'],
      io: ['file-read', 'file-write', 'database-query', 'database-write', 'fs', 'stream'],
      network: ['http-request', 'websocket', 'grpc', 'fetch', 'axios', 'http'],
      analysis: ['code-analysis', 'text-analysis', 'data-analysis', 'semantic-analysis', 'parse'],
    }

    return capabilities[specialization] || []
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(workerId: string, message: any): void {
    const workerInfo = this.workers.get(workerId)
    if (!workerInfo) {
      return
    }

    switch (message.type) {
      case 'ready':
        this.emit('workerReady', workerId, message.specialization)
        break

      case 'result': {
        const { taskId, result, duration, specialization } = message
        this.handleTaskResult(workerId, taskId, result, duration)

        // Update performance metrics
        this.updatePerformanceMetrics(workerId, specialization, duration, true)
        break
      }

      case 'error': {
        const { taskId, error } = message
        this.handleTaskError(workerId, taskId, error)

        // Update performance metrics
        this.updatePerformanceMetrics(workerId, workerInfo.specialization, 0, false)
        break
      }
    }
  }

  /**
   * Update performance metrics for a worker
   */
  private updatePerformanceMetrics(
    workerId: string,
    specialization: WorkerSpecialization,
    duration: number,
    success: boolean,
  ): void {
    const workerInfo = this.workers.get(workerId)
    if (!workerInfo) {
      return
    }

    // Update worker's task history
    workerInfo.taskHistory.push({
      taskId: workerInfo.currentTaskId || '',
      type: workerInfo.specialization,
      duration,
      success,
      timestamp: Date.now(),
    })

    // Keep only last 100 tasks
    if (workerInfo.taskHistory.length > 100) {
      workerInfo.taskHistory = workerInfo.taskHistory.slice(-100)
    }

    // Calculate average task time
    const recentTasks = workerInfo.taskHistory.slice(-20)
    workerInfo.avgTaskTime = recentTasks.reduce((sum, t) => sum + t.duration, 0) / recentTasks.length

    // Calculate success rate
    const successfulTasks = recentTasks.filter(t => t.success).length
    const successRate = successfulTasks / recentTasks.length

    // Calculate current load (tasks in last minute)
    const oneMinuteAgo = Date.now() - 60000
    const tasksPerMinute = recentTasks.filter(t => t.timestamp >= oneMinuteAgo).length
    workerInfo.currentLoad = Math.min(tasksPerMinute / 60, 1)

    // Update pool-level metrics
    this.performanceMetrics.set(workerId, {
      workerId,
      specialization,
      tasksPerMinute,
      avgTaskDuration: workerInfo.avgTaskTime,
      successRate,
      currentLoad: workerInfo.currentLoad,
      affinityScore: workerInfo.cacheAffinity.length,
    })

    this.emit('workerMetricsUpdated', workerId, this.performanceMetrics.get(workerId)!)
  }

  /**
   * Handle task result
   */
  private handleTaskResult(workerId: string, taskId: string, result: unknown, duration: number): void {
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
    this.stats.activeBySpecialization[workerInfo.specialization]--

    // Update cache affinity
    if (this.options.enableCacheAffinity && task.type) {
      if (!workerInfo.cacheAffinity.includes(task.type)) {
        workerInfo.cacheAffinity.push(task.type)
      }
    }

    // Resolve task
    this.pendingTasks.delete(taskId)
    this.stats.queuedTasks--
    this.stats.totalTasksProcessed++
    task.resolve(result)

    // Recycle or set idle timer
    if (workerInfo.tasksCompleted >= this.options.maxTasksPerWorker) {
      this.recycleWorker(workerId)
    }
    else {
      this.setWorkerIdleTimer(workerId)
    }

    this.emit('taskCompleted', taskId, workerId, duration)
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
    this.stats.activeBySpecialization[workerInfo.specialization]--

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
        this.createWorker(workerInfo.specialization)
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
    this.stats.workersBySpecialization[workerInfo.specialization]--

    if (workerInfo.status === 'idle') {
      this.stats.idleWorkers--
    }
    else if (workerInfo.status === 'busy') {
      this.stats.busyWorkers--
      this.stats.activeBySpecialization[workerInfo.specialization]--
    }

    this.performanceMetrics.delete(workerId)

    this.emit('workerExited', workerId, code)

    // Replace worker if below minimum
    if (!this.terminated && this.shouldCreateWorker(workerInfo.specialization)) {
      this.createWorker(workerInfo.specialization)
    }
  }

  /**
   * Check if a new worker should be created for a specialization
   */
  private shouldCreateWorker(specialization: WorkerSpecialization): boolean {
    const specCounts = this.options.specialization

    // Count current workers by specialization
    let currentCount = 0
    for (const worker of this.workers.values()) {
      if (worker.specialization === specialization) {
        currentCount++
      }
    }

    return currentCount < (specCounts[specialization] || 0)
  }

  /**
   * Get an available worker for a task
   */
  private getAvailableWorker(specialization: WorkerSpecialization = 'general'): EnhancedWorkerInfo | null {
    // Find idle worker with matching specialization
    let bestWorker: EnhancedWorkerInfo | null = null
    let bestScore = -1

    for (const worker of this.workers.values()) {
      if (worker.status !== 'idle' || worker.specialization !== specialization) {
        continue
      }

      // Calculate worker score
      let score = 0

      // Prefer workers with lower current load
      score += (1 - worker.currentLoad) * 50

      // Prefer workers with cache affinity
      score += Math.min(worker.cacheAffinity.length * 10, 50)

      if (score > bestScore) {
        bestWorker = worker
        bestScore = score
      }
    }

    if (bestWorker) {
      return bestWorker
    }

    // No specialized worker available, try to create one
    if (this.options.enableDynamicScaling && this.workers.size < this.options.maxWorkers) {
      return this.createWorker(specialization)
    }

    // Fall back to general worker
    if (specialization !== 'general') {
      return this.getAvailableWorker('general')
    }

    return null
  }

  /**
   * Setup task queue event handlers
   */
  private setupTaskQueueEvents(): void {
    this.taskQueue.on('nextTask', async (task: EnhancedWorkerTask) => {
      await this.executeTask(task)
    })
  }

  /**
   * Execute a task on an available worker
   */
  private async executeTask(task: EnhancedWorkerTask): Promise<void> {
    // Get or create an available worker
    const workerInfo = this.getAvailableWorker(task.specialization)

    if (!workerInfo) {
      // Queue task for later execution
      setTimeout(() => this.taskQueue.add(task), 100)
      return
    }

    // Mark worker as busy
    workerInfo.status = 'busy'
    workerInfo.currentTaskId = task.id
    this.stats.idleWorkers--
    this.stats.busyWorkers++
    this.stats.activeBySpecialization[workerInfo.specialization]++

    // Clear idle timer
    if (workerInfo.idleTimer) {
      clearTimeout(workerInfo.idleTimer)
      workerInfo.idleTimer = undefined
    }

    // Update queue wait time statistics
    const queueWaitTime = Date.now() - task.createdAt
    this.updateQueueWaitTimeStats(queueWaitTime)

    // Send task to worker
    const message = {
      type: 'task',
      taskId: task.id,
      taskType: task.type,
      data: task.data,
    }

    workerInfo.worker.postMessage(message)
  }

  /**
   * Update queue wait time statistics
   */
  private updateQueueWaitTimeStats(waitTime: number): void {
    const currentAvg = this.stats.avgQueueWaitTime
    this.stats.avgQueueWaitTime = (currentAvg * 0.9) + (waitTime * 0.1)
  }

  /**
   * Update throughput statistics
   */
  private updateQueueWaitTime(): void {
    // Calculate average time tasks spend in queue
    let totalWaitTime = 0
    let count = 0

    for (const [taskId, timestamp] of this.taskQueueTimestamps.entries()) {
      if (this.pendingTasks.has(taskId)) {
        totalWaitTime += Date.now() - timestamp
        count++
      }
      else {
        this.taskQueueTimestamps.delete(taskId)
      }
    }

    if (count > 0) {
      this.stats.avgQueueWaitTime = totalWaitTime / count
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

    // Don't terminate if at minimum for specialization
    const specCounts = this.options.specialization
    let currentCount = 0
    for (const worker of this.workers.values()) {
      if (worker.specialization === workerInfo.specialization) {
        currentCount++
      }
    }

    if (currentCount <= (specCounts[workerInfo.specialization] || 1)) {
      return
    }

    // Clear existing timer
    if (workerInfo.idleTimer) {
      clearTimeout(workerInfo.idleTimer)
    }

    // Set new idle timer
    workerInfo.idleTimer = setTimeout(() => {
      if (workerInfo.status === 'idle' && this.workers.get(workerId) === workerInfo) {
        this.terminateWorker(workerId)
      }
    }, this.options.workerIdleTimeout)
  }

  /**
   * Recycle a worker (terminate and create new one)
   */
  private async recycleWorker(workerId: string): Promise<void> {
    await this.terminateWorker(workerId)

    const workerInfo = this.workers.get(workerId)
    if (workerInfo && !this.terminated) {
      if (this.shouldCreateWorker(workerInfo.specialization)) {
        this.createWorker(workerInfo.specialization)
      }
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
      this.emit('error', new Error(`Failed to terminate worker ${workerId}: ${error}`))
    }

    this.workers.delete(workerId)
    this.performanceMetrics.delete(workerId)
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updatePerformanceStats()
      this.emit('statsUpdated', this.getStats())
    }, 5000) // Update every 5 seconds
  }

  /**
   * Update performance statistics
   */
  private updatePerformanceStats(): void {
    // Calculate throughput (tasks per second over last minute)
    const oneMinuteAgo = Date.now() - 60000
    let tasksInLastMinute = 0

    for (const worker of this.workers.values()) {
      tasksInLastMinute += worker.taskHistory.filter(t => t.timestamp >= oneMinuteAgo).length
    }

    this.stats.throughput = tasksInLastMinute / 60

    // Calculate cache hit rate
    let totalTasks = 0
    let cacheHits = 0

    for (const worker of this.workers.values()) {
      for (const task of worker.taskHistory) {
        totalTasks++
        if (worker.cacheAffinity.some(aff => task.type.includes(aff))) {
          cacheHits++
        }
      }
    }

    this.stats.cacheHitRate = totalTasks > 0 ? cacheHits / totalTasks : 0

    // Estimate memory usage (rough estimate)
    this.stats.memoryUsage = this.workers.size * 50 * 1024 * 1024 // 50MB per worker
  }

  /**
   * Get enhanced statistics
   */
  getStats(): EnhancedWorkerPoolStats {
    return {
      ...this.stats,
      queuedTasks: this.taskQueue.size,
      workersBySpecialization: { ...this.stats.workersBySpecialization },
      activeBySpecialization: { ...this.stats.activeBySpecialization },
      throughput: this.stats.throughput,
      avgQueueWaitTime: this.stats.avgQueueWaitTime,
      cacheHitRate: this.stats.cacheHitRate,
      memoryUsage: this.stats.memoryUsage,
    }
  }

  /**
   * Get performance metrics for all workers
   */
  getPerformanceMetrics(): WorkerPerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values())
  }

  /**
   * Get performance metrics for a specific worker
   */
  getWorkerMetrics(workerId: string): WorkerPerformanceMetrics | undefined {
    return this.performanceMetrics.get(workerId)
  }

  /**
   * Get all workers
   */
  getAllWorkers(): EnhancedWorkerInfo[] {
    return Array.from(this.workers.values())
  }

  /**
   * Get workers by specialization
   */
  getWorkersBySpecialization(specialization: WorkerSpecialization): EnhancedWorkerInfo[] {
    return Array.from(this.workers.values()).filter(w => w.specialization === specialization)
  }

  /**
   * Terminate all workers and shutdown pool
   */
  async terminate(): Promise<void> {
    if (this.terminated) {
      return
    }

    this.terminated = true

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    // Clear task queue
    this.taskQueue.clear()

    // Terminate all workers
    const terminationPromises = Array.from(this.workers.values()).map(workerInfo =>
      this.terminateWorker(workerInfo.id),
    )

    await Promise.all(terminationPromises)

    this.workers.clear()
    this.pendingTasks.clear()
    this.taskQueueTimestamps.clear()
    this.performanceMetrics.clear()

    this.emit('terminated')
  }

  /**
   * Generate unique worker ID
   */
  private generateWorkerId(specialization: WorkerSpecialization): string {
    return `${specialization}-worker_${++this.workerIdCounter}_${Date.now()}`
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${++this.taskIdCounter}_${Date.now()}`
  }
}

/**
 * Enhanced task queue with priority support
 */
class EnhancedTaskQueue extends EventEmitter {
  private queue: EnhancedWorkerTask[] = []
  private processing = false
  private concurrency: number
  private activeTasks = 0

  constructor(options: { concurrency: number, autoStart: boolean }) {
    super()
    this.concurrency = options.concurrency

    if (options.autoStart) {
      this.start()
    }
  }

  add(task: EnhancedWorkerTask): void {
    // Insert task based on priority
    let inserted = false

    for (let i = 0; i < this.queue.length; i++) {
      if (this.comparePriority(task.priority, this.queue[i].priority) > 0) {
        this.queue.splice(i, 0, task)
        inserted = true
        break
      }
    }

    if (!inserted) {
      this.queue.push(task)
    }

    this.emit('taskAdded', task)
  }

  private comparePriority(p1: string, p2: string): number {
    const priorities = ['critical', 'high', 'normal', 'low']
    return priorities.indexOf(p2) - priorities.indexOf(p1)
  }

  next(): EnhancedWorkerTask | undefined {
    return this.queue.shift()
  }

  complete(task: EnhancedWorkerTask): void {
    this.activeTasks--
    this.emit('taskCompleted', task)
    this.process()
  }

  private start(): void {
    this.processing = true
    this.process()
  }

  private process(): void {
    while (this.activeTasks < this.concurrency && this.queue.length > 0) {
      const task = this.next()
      if (task) {
        this.activeTasks++
        this.emit('nextTask', task)
      }
      else {
        break
      }
    }
  }

  get size(): number {
    return this.queue.length
  }

  clear(): void {
    this.queue = []
  }
}

/**
 * Enhanced worker task interface
 */
interface EnhancedWorkerTask extends WorkerTask {
  /** Task specialization */
  specialization: WorkerSpecialization

  /** Creation timestamp */
  createdAt: number

  /** Task priority */
  priority: string
}

/**
 * Create an enhanced worker pool
 */
export function createEnhancedWorkerPool(options?: EnhancedWorkerPoolOptions): EnhancedWorkerPool {
  return new EnhancedWorkerPool(options)
}
