/**
 * Background Task Manager for CCJK v3.8
 *
 * Provides unified background task management with:
 * - Ctrl+B unified backgrounding for bash and agent commands
 * - Parallel bash + agent execution
 * - TaskOutputTool result collection
 * - Progress notifications
 * - Task state persistence
 */

import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// ============================================================================
// Types and Interfaces
// ============================================================================

export type TaskType = 'bash' | 'agent' | 'mixed'
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface TaskOutput {
  stdout?: string
  stderr?: string
  error?: string
  exitCode?: number
  duration?: number // Duration in milliseconds
}

export interface BackgroundTask {
  id: string
  type: TaskType
  command?: string // For bash tasks
  agentName?: string // For agent tasks
  args?: string[]
  status: TaskStatus
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  output?: TaskOutput
  progress?: number // 0-100
  pid?: number
  exitCode?: number
  metadata?: Record<string, unknown>
}

export interface TaskOptions {
  name?: string
  priority?: 'low' | 'normal' | 'high'
  timeout?: number // Timeout in milliseconds
  cwd?: string
  env?: Record<string, string>
  silent?: boolean // Don't show notifications
  persist?: boolean // Persist output to disk
}

export interface TaskNotification {
  taskId: string
  type: 'started' | 'progress' | 'completed' | 'failed' | 'cancelled'
  message: string
  progress?: number
  output?: string
}

// ============================================================================
// Background Task Manager
// ============================================================================

export class BackgroundTaskManager {
  private tasks: Map<string, BackgroundTask> = new Map()
  private processes: Map<string, ChildProcess> = new Map()
  private storageDir: string
  private notificationCallbacks: Set<(notification: TaskNotification) => void> = new Set()
  private maxConcurrentTasks: number
  private activeTaskCount: number = 0

  constructor(options: {
    storageDir?: string
    maxConcurrentTasks?: number
  } = {}) {
    this.storageDir = options.storageDir || join(homedir(), '.claude', 'background-tasks')
    this.maxConcurrentTasks = options.maxConcurrentTasks || 4

    // Ensure storage directory exists
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true })
    }

    // Load persisted tasks
    this.loadPersistedTasks()
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${randomBytes(4).toString('hex')}`
  }

  /**
   * Get task file path
   */
  private getTaskPath(taskId: string): string {
    return join(this.storageDir, `${taskId}.json`)
  }

  /**
   * Persist task to disk
   */
  private persistTask(task: BackgroundTask): void {
    if (!task.metadata?.persist) {
      return
    }

    try {
      const taskPath = this.getTaskPath(task.id)
      writeFileSync(taskPath, JSON.stringify({
        ...task,
        createdAt: task.createdAt.toISOString(),
        startedAt: task.startedAt?.toISOString(),
        completedAt: task.completedAt?.toISOString(),
      }, null, 2), 'utf-8')
    }
    catch (error) {
      console.error(`Failed to persist task ${task.id}:`, error)
    }
  }

  /**
   * Load persisted tasks from disk
   */
  private loadPersistedTasks(): void {
    try {
      const { readdirSync } = require('node:fs')
      const files = readdirSync(this.storageDir)

      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue
        }

        try {
          const taskPath = join(this.storageDir, file)
          const data = JSON.parse(readFileSync(taskPath, 'utf-8'))

          const task: BackgroundTask = {
            ...data,
            createdAt: new Date(data.createdAt),
            startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
            completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
          }

          // Only keep non-completed tasks or recently completed ones
          const isRecent = task.completedAt
            ? Date.now() - task.completedAt.getTime() < 24 * 60 * 60 * 1000 // 24 hours
            : true

          if (isRecent && task.status !== 'completed') {
            this.tasks.set(task.id, task)
          }
          else if (!isRecent) {
            // Clean up old task files
            unlinkSync(taskPath)
          }
        }
        catch {
          // Skip invalid task files
        }
      }
    }
    catch {
      // Storage directory might not exist yet
    }
  }

  /**
   * Notify listeners of task updates
   */
  private notify(notification: TaskNotification): void {
    for (const callback of this.notificationCallbacks) {
      try {
        callback(notification)
      }
      catch (error) {
        console.error('Notification callback error:', error)
      }
    }
  }

  /**
   * Register a notification callback
   */
  onNotification(callback: (notification: TaskNotification) => void): () => void {
    this.notificationCallbacks.add(callback)
    return () => this.notificationCallbacks.delete(callback)
  }

  /**
   * Execute a bash command in the background
   */
  async executeBash(
    command: string,
    args: string[],
    options: TaskOptions = {},
  ): Promise<string> {
    const taskId = this.generateTaskId()
    const task: BackgroundTask = {
      id: taskId,
      type: 'bash',
      command,
      args,
      status: 'pending',
      createdAt: new Date(),
      metadata: {
        name: options.name,
        priority: options.priority || 'normal',
        persist: options.persist ?? true,
      },
    }

    this.tasks.set(taskId, task)

    // Wait for available slot
    while (this.activeTaskCount >= this.maxConcurrentTasks) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.activeTaskCount++

    return new Promise<string>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeout,
      })

      this.processes.set(taskId, child)

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('spawn', () => {
        task.status = 'running'
        task.startedAt = new Date()
        task.pid = child.pid
        this.notify({
          taskId,
          type: 'started',
          message: `Started: ${command} ${args.join(' ')}`,
        })
        this.persistTask(task)
      })

      child.on('close', (code) => {
        this.activeTaskCount--
        this.processes.delete(taskId)

        task.status = code === 0 ? 'completed' : 'failed'
        task.completedAt = new Date()
        task.exitCode = code ?? undefined
        task.output = {
          stdout,
          stderr,
          exitCode: code ?? undefined,
          duration: task.completedAt.getTime() - task.startedAt!.getTime(),
        }

        this.notify({
          taskId,
          type: task.status === 'completed' ? 'completed' : 'failed',
          message: task.status === 'completed'
            ? `Completed: ${command}`
            : `Failed: ${command} (exit code: ${code})`,
          output: stdout || stderr,
        })

        this.persistTask(task)

        if (code === 0) {
          resolve(stdout)
        }
        else {
          const error = new Error(`Command failed with exit code ${code}`)
          ;(error as any).stdout = stdout
          ;(error as any).stderr = stderr
          ;(error as any).exitCode = code
          reject(error)
        }
      })

      child.on('error', (error) => {
        this.activeTaskCount--
        this.processes.delete(taskId)

        task.status = 'failed'
        task.completedAt = new Date()
        task.output = {
          error: error.message,
        }

        this.notify({
          taskId,
          type: 'failed',
          message: `Error: ${error.message}`,
        })

        this.persistTask(task)
        reject(error)
      })
    })
  }

  /**
   * Execute an agent in the background
   */
  async executeAgent(
    agentName: string,
    input: unknown,
    options: TaskOptions = {},
  ): Promise<unknown> {
    const taskId = this.generateTaskId()
    const task: BackgroundTask = {
      id: taskId,
      type: 'agent',
      agentName,
      status: 'pending',
      createdAt: new Date(),
      metadata: {
        name: options.name,
        priority: options.priority || 'normal',
        input,
        persist: options.persist ?? true,
      },
    }

    this.tasks.set(taskId, task)

    // Wait for available slot
    while (this.activeTaskCount >= this.maxConcurrentTasks) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.activeTaskCount++

    return new Promise((resolve, reject) => {
      // Agent execution simulation
      // In real implementation, this would call the actual agent
      task.status = 'running'
      task.startedAt = new Date()

      this.notify({
        taskId,
        type: 'started',
        message: `Agent ${agentName} started`,
      })

      // Simulate agent work
      // In real implementation, integrate with actual agent system
      setTimeout(() => {
        this.activeTaskCount--

        task.status = 'completed'
        task.completedAt = new Date()
        task.progress = 100

        this.notify({
          taskId,
          type: 'completed',
          message: `Agent ${agentName} completed`,
        })

        this.persistTask(task)
        resolve({ result: 'Agent execution completed' })
      }, 1000)
    })
  }

  /**
   * Execute bash + agent in parallel
   */
  async executeParallel(
    bashCommand?: { command: string, args: string[] },
    agentCall?: { agentName: string, input: unknown },
    options: TaskOptions = {},
  ): Promise<{
    bashResult?: { stdout: string, stderr: string, exitCode: number }
    agentResult?: unknown
  }> {
    const results: {
      bashResult?: { stdout: string, stderr: string, exitCode: number }
      agentResult?: unknown
    } = {}

    const promises: Promise<void>[] = []

    if (bashCommand) {
      promises.push(
        this.executeBash(bashCommand.command, bashCommand.args, options)
          .then((stdout) => {
            results.bashResult = {
              stdout,
              stderr: '',
              exitCode: 0,
            }
          })
          .catch((error) => {
            results.bashResult = {
              stdout: error.stdout || '',
              stderr: error.stderr || error.message,
              exitCode: error.exitCode || 1,
            }
          }),
      )
    }

    if (agentCall) {
      promises.push(
        this.executeAgent(agentCall.agentName, agentCall.input, options)
          .then((result) => {
            results.agentResult = result
          })
          .catch(() => {
            // Agent error handling
          }),
      )
    }

    await Promise.all(promises)
    return results
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * Get all tasks
   */
  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): BackgroundTask[] {
    return this.getAllTasks().filter(t => t.status === status)
  }

  /**
   * Get tasks by type
   */
  getTasksByType(type: TaskType): BackgroundTask[] {
    return this.getAllTasks().filter(t => t.type === type)
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'running') {
      return false
    }

    const process = this.processes.get(taskId)
    if (process) {
      process.kill('SIGTERM')

      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 500))

      // Force kill if still running
      if (this.processes.has(taskId)) {
        process.kill('SIGKILL')
      }
    }

    task.status = 'cancelled'
    task.completedAt = new Date()

    this.notify({
      taskId,
      type: 'cancelled',
      message: `Task ${taskId} cancelled`,
    })

    this.persistTask(task)
    return true
  }

  /**
   * Clean up completed/failed tasks
   */
  cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now()
    let cleaned = 0

    for (const [taskId, task] of this.tasks) {
      const shouldClean = task.completedAt
        ? now - task.completedAt.getTime() > olderThanMs
        : now - task.createdAt.getTime() > olderThanMs * 2

      if (shouldClean) {
        this.tasks.delete(taskId)

        // Clean up task file
        try {
          const taskPath = this.getTaskPath(taskId)
          if (existsSync(taskPath)) {
            unlinkSync(taskPath)
          }
        }
        catch {
          // Ignore cleanup errors
        }

        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Get task statistics
   */
  getStatistics(): {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
  } {
    const tasks = this.getAllTasks()

    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    }
  }

  /**
   * Get task output
   */
  getTaskOutput(taskId: string): TaskOutput | undefined {
    return this.tasks.get(taskId)?.output
  }

  /**
   * Update task progress
   */
  updateProgress(taskId: string, progress: number, message?: string): void {
    const task = this.tasks.get(taskId)
    if (!task) {
      return
    }

    task.progress = Math.max(0, Math.min(100, progress))

    this.notify({
      taskId,
      type: 'progress',
      message: message || `Progress: ${task.progress}%`,
      progress: task.progress,
    })
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let backgroundManagerInstance: BackgroundTaskManager | null = null

/**
 * Get singleton background task manager instance
 */
export function getBackgroundManager(options?: {
  storageDir?: string
  maxConcurrentTasks?: number
}): BackgroundTaskManager {
  if (!backgroundManagerInstance) {
    backgroundManagerInstance = new BackgroundTaskManager(options)
  }
  return backgroundManagerInstance
}

/**
 * Reset singleton instance (mainly for testing)
 */
export function resetBackgroundManager(): void {
  backgroundManagerInstance = null
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Execute command in background with Ctrl+B support
 */
export async function executeBackground(
  command: string,
  args: string[] = [],
  options: TaskOptions = {},
): Promise<string> {
  const manager = getBackgroundManager()
  return manager.executeBash(command, args, options)
}

/**
 * Execute agent in background
 */
export async function executeAgentBackground(
  agentName: string,
  input: unknown,
  options: TaskOptions = {},
): Promise<unknown> {
  const manager = getBackgroundManager()
  return manager.executeAgent(agentName, input, options)
}

/**
 * List background tasks
 */
export function listBackgroundTasks(): BackgroundTask[] {
  const manager = getBackgroundManager()
  return manager.getAllTasks()
}

/**
 * Cancel background task
 */
export async function cancelBackgroundTask(taskId: string): Promise<boolean> {
  const manager = getBackgroundManager()
  return manager.cancelTask(taskId)
}

/**
 * Get background task output
 */
export function getBackgroundTaskOutput(taskId: string): TaskOutput | undefined {
  const manager = getBackgroundManager()
  return manager.getTaskOutput(taskId)
}
