/**
 * CCJK Multi-Process Pool - v4.0.0
 *
 * Process-based parallel execution with:
 * - CPU-intensive task isolation
 * - Inter-process communication (IPC)
 * - Shared memory support
 * - Process lifecycle management
 * - Resource monitoring and limits
 *
 * @module concurrency/process-pool
 */

import type { ProcessTaskOptions } from './types'
import { fork } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { cpus } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { nanoid } from 'nanoid'

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Process specialization type
 */
export type ProcessSpecialization = 'cpu' | 'memory' | 'io' | 'general'

/**
 * Process state
 */
export type ProcessState = 'starting' | 'idle' | 'busy' | 'terminating' | 'terminated' | 'failed'

/**
 * Process worker information
 */
export interface ProcessWorkerInfo {
  /** Unique process identifier */
  id: string

  /** Child process instance */
  process: any

  /** Current state */
  state: ProcessState

  /** Process specialization */
  specialization: ProcessSpecialization

  /** PID */
  pid?: number

  /** Tasks completed */
  tasksCompleted: number

  /** Current task ID */
  currentTaskId?: string

  /** Creation timestamp */
  createdAt: number

  /** Last activity timestamp */
  lastActivityAt: number

  /** Memory usage in bytes */
  memoryUsage?: number

  /** CPU usage (0-1) */
  cpuUsage?: number

  /** Task history */
  taskHistory: Array<{
    taskId: string
    duration: number
    success: boolean
    timestamp: number
  }>

  /** Average task duration */
  avgTaskDuration: number

  /** Process affinity (tasks it's good at) */
  affinity: string[]
}

/**
 * Process task with process-specific options
 */
export interface ProcessTask {
  /** Unique task identifier */
  id: string

  /** Task type/name */
  type: string

  /** Task data payload */
  data: unknown

  /** Task options */
  options: ProcessTaskOptions

  /** Process specialization preference */
  specialization?: ProcessSpecialization

  /** Task priority */
  priority: string

  /** Maximum memory in MB */
  maxMemory?: number

  /** Maximum CPU usage (0-1) */
  maxCpu?: number

  /** Timeout in milliseconds */
  timeout?: number

  /** Promise resolve function */
  resolve: (value: unknown) => void

  /** Promise reject function */
  reject: (error: Error) => void

  /** Creation timestamp */
  createdAt: number

  /** Queue wait time */
  queuedAt?: number
}

/**
 * Process pool options
 */
export interface ProcessPoolOptions {
  /** Maximum concurrent processes */
  maxProcesses?: number

  /** Minimum idle processes */
  minIdleProcesses?: number

  /** Process specialization configuration */
  specialization?: {
    cpu?: number
    memory?: number
    io?: number
    general?: number
  }

  /** Default process timeout in milliseconds */
  defaultTimeout?: number

  /** Process idle timeout before termination */
  processIdleTimeout?: number

  /** Enable process monitoring */
  enableMonitoring?: boolean

  /** Monitoring interval in milliseconds */
  monitoringInterval?: number

  /** Maximum memory per process in MB */
  maxProcessMemory?: number

  /** IPC timeout in milliseconds */
  ipcTimeout?: number

  /** Enable shared memory for large data transfer */
  enableSharedMemory?: boolean

  /** Worker script path */
  workerScript?: string

  /** Worker initialization data */
  workerData?: unknown
}

/**
 * Process pool statistics
 */
export interface ProcessPoolStats {
  /** Total processes created */
  totalProcessesCreated: number

  /** Currently active processes */
  activeProcesses: number

  /** Idle processes */
  idleProcesses: number

  /** Busy processes */
  busyProcesses: number

  /** Total tasks processed */
  totalTasksProcessed: number

  /** Tasks currently queued */
  queuedTasks: number

  /** Average task duration */
  avgTaskDuration: number

  /** Process pool creation timestamp */
  createdAt: number

  /** Processes by specialization */
  processesBySpecialization: Record<ProcessSpecialization, number>

  /** Active processes by specialization */
  activeBySpecialization: Record<ProcessSpecialization, number>

  /** Average memory usage per process (MB) */
  avgMemoryUsage: number

  /** Average CPU usage across processes (0-1) */
  avgCpuUsage: number

  /** Total memory usage (MB) */
  totalMemoryUsage: number

  /** Process throughput (tasks/second) */
  throughput: number
}

/**
 * Process execution result
 */
export interface ProcessExecutionResult {
  /** Process ID */
  processId: string

  /** Task ID */
  taskId: string

  /** Whether execution succeeded */
  success: boolean

  /** Result data */
  result?: unknown

  /** Error message if failed */
  error?: string

  /** Execution duration in milliseconds */
  duration: number

  /** Memory usage peak during execution */
  peakMemoryUsage?: number

  /** CPU usage peak during execution */
  peakCpuUsage?: number
}

/**
 * IPC message types
 */
type IpcMessage
  = | { type: 'ready', processId: string, specialization: ProcessSpecialization }
    | { type: 'task', taskId: string, taskType: string, data: unknown, options?: ProcessTaskOptions }
    | { type: 'result', taskId: string, result: unknown, duration: number, memoryUsage?: number, cpuUsage?: number }
    | { type: 'error', taskId: string, error: { message: string, stack?: string } }
    | { type: 'ping' }
    | { type: 'pong' }
    | { type: 'heartbeat', processId: string, stats: { memoryUsage: number, cpuUsage: number } }

/**
 * Default process pool options
 */
const DEFAULT_PROCESS_OPTIONS: Required<ProcessPoolOptions> = {
  maxProcesses: Math.max(2, cpus().length - 1), // Leave one core for main process
  minIdleProcesses: 1,
  specialization: {
    cpu: Math.floor((cpus().length - 1) * 0.4),
    memory: Math.floor((cpus().length - 1) * 0.2),
    io: Math.floor((cpus().length - 1) * 0.2),
    general: Math.floor((cpus().length - 1) * 0.2),
  },
  defaultTimeout: 300000, // 5 minutes
  processIdleTimeout: 60000, // 1 minute
  enableMonitoring: true,
  monitoringInterval: 5000,
  maxProcessMemory: 1024, // 1GB per process
  ipcTimeout: 30000,
  enableSharedMemory: false,
  workerScript: join(__dirname, 'process-worker.js'),
  workerData: {},
}

/**
 * Process pool class
 */
export class ProcessPool extends EventEmitter {
  private options: Required<ProcessPoolOptions>
  private processes = new Map<string, ProcessWorkerInfo>()
  private taskQueue: ProcessTask[] = []
  private pendingTasks = new Map<string, ProcessTask>()
  private terminated = false

  private processIdCounter = 0
  private taskIdCounter = 0

  private stats: ProcessPoolStats
  private monitoringInterval?: NodeJS.Timeout
  private heartbeatInterval?: NodeJS.Timeout

  private ipcTempDir: string

  constructor(options: ProcessPoolOptions = {}) {
    super()

    this.options = { ...DEFAULT_PROCESS_OPTIONS, ...options }

    this.stats = {
      totalProcessesCreated: 0,
      activeProcesses: 0,
      idleProcesses: 0,
      busyProcesses: 0,
      totalTasksProcessed: 0,
      queuedTasks: 0,
      avgTaskDuration: 0,
      createdAt: Date.now(),
      processesBySpecialization: {
        cpu: 0,
        memory: 0,
        io: 0,
        general: 0,
      },
      activeBySpecialization: {
        cpu: 0,
        memory: 0,
        io: 0,
        general: 0,
      },
      avgMemoryUsage: 0,
      avgCpuUsage: 0,
      totalMemoryUsage: 0,
      throughput: 0,
    }

    // Create temporary directory for IPC
    this.ipcTempDir = join(process.env.TMP || '/tmp', `ccjk-process-pool-${nanoid(8)}`)

    try {
      mkdirSync(this.ipcTempDir, { recursive: true })
    }
    catch (error) {
      console.error('Failed to create IPC temp directory:', error)
    }

    // Initialize workers
    this.initializeWorkers()

    // Start monitoring
    if (this.options.enableMonitoring) {
      this.startMonitoring()
    }

    // Start heartbeat
    this.startHeartbeat()
  }

  /**
   * Initialize worker processes
   */
  private initializeWorkers(): void {
    const spec = this.options.specialization

    for (const [type, count] of Object.entries(spec)) {
      for (let i = 0; i < count; i++) {
        this.spawnWorker(type as ProcessSpecialization)
      }
    }
  }

  /**
   * Spawn a new worker process
   */
  private spawnWorker(specialization: ProcessSpecialization = 'general'): ProcessWorkerInfo | null {
    if (this.processes.size >= this.options.maxProcesses) {
      return null
    }

    const processId = this.generateProcessId(specialization)

    try {
      const workerProcess = fork(this.options.workerScript, [], {
        silent: false,
        env: {
          ...process.env,
          CCJK_PROCESS_ID: processId,
          CCJK_PROCESS_SPECIALIZATION: specialization,
          NODE_ENV: process.env.NODE_ENV || 'production',
        },
        execArgv: [],
        serialization: 'json',
        cwd: process.cwd(),
      })

      const workerInfo: ProcessWorkerInfo = {
        id: processId,
        process: workerProcess,
        state: 'starting',
        specialization,
        pid: workerProcess.pid,
        tasksCompleted: 0,
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        taskHistory: [],
        avgTaskDuration: 0,
        affinity: [],
      }

      this.processes.set(processId, workerInfo)
      this.stats.totalProcessesCreated++
      this.stats.processesBySpecialization[specialization]++

      // Setup IPC handlers
      this.setupIpcHandlers(processId, workerProcess)

      // Setup process exit handlers
      workerProcess.on('exit', (code, signal) => this.handleProcessExit(processId, (code ?? 0) as number, (signal ?? 'SIGTERM') as string))
      workerProcess.on('error', (error: Error) => this.handleProcessError(processId, error))

      this.emit('processCreated', processId, specialization)

      return workerInfo
    }
    catch (error) {
      this.emit('error', new Error(`Failed to spawn process ${specialization}: ${error}`))
      return null
    }
  }

  /**
   * Setup IPC message handlers for a process
   */
  private setupIpcHandlers(processId: string, workerProcess: any): void {
    // Message handler
    workerProcess.on('message', (message: IpcMessage) => {
      this.handleIpcMessage(processId, message)
    })

    // Error handler for message parsing errors
    workerProcess.on('messageerror', (error: Error) => {
      console.error(`IPC message error for process ${processId}:`, error)
    })

    // Disconnect handler
    workerProcess.on('disconnect', () => {
      this.emit('processDisconnected', processId)
    })
  }

  /**
   * Handle IPC message from worker
   */
  private handleIpcMessage(processId: string, message: IpcMessage): void {
    const workerInfo = this.processes.get(processId)
    if (!workerInfo) {
      return
    }

    switch (message.type) {
      case 'ready':
        workerInfo.state = 'idle'
        this.stats.idleProcesses++
        this.emit('processReady', processId, message.specialization)
        break

      case 'result': {
        const { taskId, result, duration, memoryUsage, cpuUsage } = message
        this.handleTaskResult(processId, taskId, result, duration, memoryUsage, cpuUsage)
        break
      }

      case 'error': {
        const { taskId, error } = message
        this.handleTaskError(processId, taskId, error)
        break
      }

      case 'pong':
        // Heartbeat response
        break

      case 'heartbeat':
        if (workerInfo) {
          workerInfo.memoryUsage = message.stats.memoryUsage
          workerInfo.cpuUsage = message.stats.cpuUsage
        }
        break

      default:
        console.warn(`Unknown IPC message type from process ${processId}:`, message)
    }
  }

  /**
   * Execute a task in the process pool
   */
  async execute<T = unknown>(
    taskType: string,
    data: unknown,
    options: ProcessTaskOptions = {},
  ): Promise<T> {
    if (this.terminated) {
      throw new Error('Process pool has been terminated')
    }

    return new Promise<T>((resolve, reject) => {
      const task: ProcessTask = {
        id: this.generateTaskId(),
        type: taskType,
        data,
        options,
        specialization: this.determineSpecialization(taskType, data),
        priority: options.priority || 'normal',
        maxMemory: options.maxMemory || this.options.maxProcessMemory,
        maxCpu: options.maxCpu,
        timeout: options.timeout || this.options.defaultTimeout,
        resolve: resolve as (value: unknown) => void,
        reject,
        createdAt: Date.now(),
        queuedAt: Date.now(),
      }

      this.pendingTasks.set(task.id, task)
      this.stats.queuedTasks++

      // Add to queue
      this.addToQueue(task)
    })
  }

  /**
   * Determine specialization for a task
   */
  private determineSpecialization(taskType: string, data: unknown): ProcessSpecialization {
    // Check for CPU-intensive tasks
    const cpuTasks = ['crypto', 'hash', 'compression', 'encoding', 'decoding', 'compute']
    if (cpuTasks.some(t => taskType.includes(t))) {
      return 'cpu'
    }

    // Check for memory-intensive tasks
    const memoryTasks = ['sort', 'filter-large', 'aggregate', 'matrix', 'buffer']
    if (memoryTasks.some(t => taskType.includes(t))) {
      return 'memory'
    }

    // Check for I/O-intensive tasks
    const ioTasks = ['file-read', 'file-write', 'database', 'stream', 'parse']
    if (ioTasks.some(t => taskType.includes(t))) {
      return 'io'
    }

    return 'general'
  }

  /**
   * Add task to queue
   */
  private addToQueue(task: ProcessTask): void {
    // Insert based on priority
    let inserted = false

    for (let i = 0; i < this.taskQueue.length; i++) {
      if (this.comparePriority(task.priority, this.taskQueue[i].priority) > 0) {
        this.taskQueue.splice(i, 0, task)
        inserted = true
        break
      }
    }

    if (!inserted) {
      this.taskQueue.push(task)
    }

    // Try to process queue
    setImmediate(() => this.processQueue())
  }

  /**
   * Compare task priorities
   */
  private comparePriority(p1: string, p2: string): number {
    const priorities = ['critical', 'high', 'normal', 'low']
    const i1 = priorities.indexOf(p1)
    const i2 = priorities.indexOf(p2)
    return i2 - i1
  }

  /**
   * Process task queue
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0) {
      return
    }

    // Find available process
    const availableProcess = this.findAvailableProcess()
    if (!availableProcess) {
      return
    }

    // Get next task
    const task = this.taskQueue.shift()!
    this.stats.queuedTasks--

    // Execute task
    this.executeTask(availableProcess, task)
  }

  /**
   * Find an available process
   */
  private findAvailableProcess(): ProcessWorkerInfo | null {
    // Prefer idle process with matching specialization
    for (const [id, process] of this.processes) {
      if (process.state === 'idle') {
        return process
      }
    }

    return null
  }

  /**
   * Execute a task on a process
   */
  private executeTask(workerInfo: ProcessWorkerInfo, task: ProcessTask): void {
    // Update worker state
    workerInfo.state = 'busy'
    workerInfo.currentTaskId = task.id
    workerInfo.lastActivityAt = Date.now()

    this.stats.idleProcesses--
    this.stats.busyProcesses++
    this.stats.activeBySpecialization[workerInfo.specialization]++

    // Send task to worker
    const ipcMessage: IpcMessage = {
      type: 'task',
      taskId: task.id,
      taskType: task.type,
      data: task.data,
      options: task.options,
    }

    // Set timeout if specified
    const timeout = task.timeout || this.options.defaultTimeout

    const timeoutHandle = setTimeout(() => {
      this.handleTaskTimeout(workerInfo.id, task.id)
    }, timeout)

    // Store timeout handle for cleanup
    ;(task as any).timeoutHandle = timeoutHandle

    workerInfo.process.send(ipcMessage)

    this.emit('taskStarted', task.id, workerInfo.id)
  }

  /**
   * Handle task result
   */
  private handleTaskResult(
    processId: string,
    taskId: string,
    result: unknown,
    duration: number,
    memoryUsage?: number,
    cpuUsage?: number,
  ): void {
    const workerInfo = this.processes.get(processId)
    const task = this.pendingTasks.get(taskId)

    if (!workerInfo || !task) {
      return
    }

    // Clear timeout
    if ((task as any).timeoutHandle) {
      clearTimeout((task as any).timeoutHandle)
    }

    // Update worker state
    workerInfo.state = 'idle'
    workerInfo.currentTaskId = undefined
    workerInfo.tasksCompleted++
    workerInfo.lastActivityAt = Date.now()

    // Update task history
    workerInfo.taskHistory.push({
      taskId,
      duration,
      success: true,
      timestamp: Date.now(),
    })

    // Update average duration
    const recentTasks = workerInfo.taskHistory.slice(-20)
    workerInfo.avgTaskDuration = recentTasks.reduce((sum, t) => sum + t.duration, 0) / recentTasks.length

    // Update affinity
    if (this.options.enableSharedMemory && task.type) {
      if (!workerInfo.affinity.includes(task.type)) {
        workerInfo.affinity.push(task.type)
      }
    }

    // Update statistics
    this.stats.totalTasksProcessed++
    this.stats.busyProcesses--
    this.stats.idleProcesses++
    this.stats.activeBySpecialization[workerInfo.specialization]--

    // Resolve task
    this.pendingTasks.delete(taskId)
    task.resolve(result)

    // Process next task
    this.processQueue()

    this.emit('taskCompleted', taskId, processId, duration)
  }

  /**
   * Handle task error
   */
  private handleTaskError(processId: string, taskId: string, error: { message: string, stack?: string }): void {
    const workerInfo = this.processes.get(processId)
    const task = this.pendingTasks.get(taskId)

    if (!workerInfo || !task) {
      return
    }

    // Clear timeout
    if ((task as any).timeoutHandle) {
      clearTimeout((task as any).timeoutHandle)
    }

    // Update worker state
    workerInfo.state = 'idle'
    workerInfo.currentTaskId = undefined
    workerInfo.lastActivityAt = Date.now()

    // Update statistics
    this.stats.busyProcesses--
    this.stats.idleProcesses++
    this.stats.activeBySpecialization[workerInfo.specialization]--

    // Reject task
    this.pendingTasks.delete(taskId)
    task.reject(new Error(error.message))

    // Process next task
    this.processQueue()

    this.emit('taskFailed', taskId, processId, error)
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(processId: string, taskId: string): void {
    const workerInfo = this.processes.get(processId)
    if (!workerInfo) {
      return
    }

    // Mark process as failed and terminate it
    this.emit('taskTimeout', taskId, processId)

    // Terminate and replace process
    this.terminateProcess(processId).then(() => {
      // Create replacement process
      this.spawnWorker(workerInfo.specialization)
    })
  }

  /**
   * Handle process exit
   */
  private handleProcessExit(processId: string, code: number, signal: string): void {
    const workerInfo = this.processes.get(processId)
    if (!workerInfo) {
      return
    }

    // If worker was busy, fail the current task
    if (workerInfo.currentTaskId && workerInfo.state === 'busy') {
      const task = this.pendingTasks.get(workerInfo.currentTaskId)
      if (task) {
        this.pendingTasks.delete(workerInfo.currentTaskId)
        task.reject(new Error(`Process exited with code ${code} and signal ${signal}`))
      }
    }

    // Remove from processes
    this.processes.delete(processId)
    this.stats.activeProcesses--
    this.stats.processesBySpecialization[workerInfo.specialization]--

    if (workerInfo.state === 'busy') {
      this.stats.busyProcesses--
      this.stats.activeBySpecialization[workerInfo.specialization]--
    }

    this.emit('processExited', processId, code, signal)

    // Create replacement process if needed
    if (!this.terminated) {
      this.spawnWorker(workerInfo.specialization)
    }
  }

  /**
   * Handle process error
   */
  private handleProcessError(processId: string, error: Error): void {
    this.emit('processError', processId, error)

    // The exit handler will handle cleanup
  }

  /**
   * Terminate a process
   */
  async terminateProcess(processId: string): Promise<void> {
    const workerInfo = this.processes.get(processId)
    if (!workerInfo) {
      return
    }

    workerInfo.state = 'terminating'

    try {
      // Send graceful shutdown message
      workerInfo.process.send({ type: 'shutdown' })

      // Wait for graceful exit or force kill after timeout
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          workerInfo.process.kill('SIGTERM')
          setTimeout(() => {
            workerInfo.process.kill('SIGKILL')
            resolve()
          }, 5000).unref()
          timeout.unref()
        }, 5000).unref()

        workerInfo.process.once('exit', () => {
          clearTimeout(timeout)
          resolve()
        })
      })
    }
    catch (error) {
      // Force kill if graceful shutdown fails
      try {
        workerInfo.process.kill('SIGKILL')
      }
      catch {
        // Process already dead
      }
    }

    this.processes.delete(processId)
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateStats()
      this.emit('statsUpdated', this.getStats())
    }, this.options.monitoringInterval)
  }

  /**
   * Start heartbeat checking
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now()
      const deadProcesses: string[] = []

      for (const [id, process] of this.processes) {
        // Check for stale processes (no activity for 2 minutes)
        if (now - process.lastActivityAt > 120000 && process.state === 'busy') {
          deadProcesses.push(id)
          continue
        }

        // Send ping
        try {
          process.process.send({ type: 'ping' })
        }
        catch {
          deadProcesses.push(id)
        }
      }

      // Terminate dead processes
      for (const id of deadProcesses) {
        this.terminateProcess(id)
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    let totalMemory = 0
    let totalCpu = 0
    let activeCount = 0

    for (const process of this.processes.values()) {
      if (process.state !== 'terminated') {
        activeCount++
        totalMemory += process.memoryUsage || 0
        totalCpu += process.cpuUsage || 0
      }
    }

    this.stats.activeProcesses = activeCount
    this.stats.idleProcesses = this.processes.size - this.stats.busyProcesses
    this.stats.totalMemoryUsage = totalMemory
    this.stats.avgMemoryUsage = activeCount > 0 ? totalMemory / activeCount : 0
    this.stats.avgCpuUsage = activeCount > 0 ? Math.min(totalCpu / activeCount, 1) : 0

    // Calculate throughput
    const oneMinuteAgo = Date.now() - 60000
    let tasksInMinute = 0

    for (const process of this.processes.values()) {
      tasksInMinute += process.taskHistory.filter(t => t.timestamp >= oneMinuteAgo).length
    }

    this.stats.throughput = tasksInMinute / 60
  }

  /**
   * Get process pool statistics
   */
  getStats(): ProcessPoolStats {
    return { ...this.stats }
  }

  /**
   * Get all process worker info
   */
  getAllProcesses(): ProcessWorkerInfo[] {
    return Array.from(this.processes.values())
  }

  /**
   * Get processes by specialization
   */
  getProcessesBySpecialization(specialization: ProcessSpecialization): ProcessWorkerInfo[] {
    return Array.from(this.processes.values()).filter(p => p.specialization === specialization)
  }

  /**
   * Terminate all processes and shutdown
   */
  async shutdown(): Promise<void> {
    if (this.terminated) {
      return
    }

    this.terminated = true

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    // Clear pending tasks
    for (const task of this.pendingTasks.values()) {
      task.reject(new Error('Process pool shutdown'))
    }
    this.pendingTasks.clear()
    this.taskQueue = []

    // Terminate all processes
    const terminationPromises = Array.from(this.processes.keys()).map(id =>
      this.terminateProcess(id),
    )

    await Promise.all(terminationPromises)

    // Clean up temp directory
    try {
      if (existsSync(this.ipcTempDir)) {
        rmSync(this.ipcTempDir, { recursive: true, force: true })
      }
    }
    catch (error) {
      console.error('Failed to clean up IPC temp directory:', error)
    }

    this.emit('shutdown')
  }

  /**
   * Generate unique process ID
   */
  private generateProcessId(specialization: ProcessSpecialization): string {
    return `${specialization}-process_${++this.processIdCounter}_${Date.now()}`
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `process-task_${++this.taskIdCounter}_${Date.now()}`
  }
}

/**
 * Create a process pool
 */
export function createProcessPool(options?: ProcessPoolOptions): ProcessPool {
  return new ProcessPool(options)
}
