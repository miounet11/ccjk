/**
 * Convoy Work Tracking System
 *
 * Provides task grouping, progress tracking, and notifications for multi-agent work.
 * Inspired by Gastown's Convoy system for coordinating multiple agents on related tasks.
 *
 * @module brain/convoy/convoy-manager
 */

import { EventEmitter } from 'node:events'
import { nanoid } from 'nanoid'
import { getGlobalStateManager, type GitBackedStateManager } from '../persistence/git-backed-state'

/**
 * Convoy status
 */
export type ConvoyStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'paused'

/**
 * Task status within convoy
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'skipped'

/**
 * Task in convoy
 */
export interface ConvoyTask {
  /** Task ID */
  id: string

  /** Task title */
  title: string

  /** Task description */
  description: string

  /** Task status */
  status: TaskStatus

  /** Assigned agent ID */
  assignedTo?: string

  /** Task dependencies (IDs of tasks that must complete first) */
  dependsOn: string[]

  /** Task result */
  result?: any

  /** Error message if failed */
  error?: string

  /** Start timestamp */
  startedAt?: string

  /** Completion timestamp */
  completedAt?: string

  /** Task metadata */
  metadata?: Record<string, any>
}

/**
 * Convoy structure
 */
export interface Convoy {
  /** Unique convoy ID */
  id: string

  /** Convoy name */
  name: string

  /** Convoy description */
  description: string

  /** Tasks in convoy */
  tasks: ConvoyTask[]

  /** Convoy status */
  status: ConvoyStatus

  /** Progress percentage (0-100) */
  progress: number

  /** Total tasks count */
  totalTasks: number

  /** Completed tasks count */
  completedTasks: number

  /** Failed tasks count */
  failedTasks: number

  /** Cancelled tasks count */
  cancelledTasks: number

  /** Skipped tasks count */
  skippedTasks: number

  /** Creation timestamp */
  createdAt: string

  /** Start timestamp */
  startedAt?: string

  /** Completion timestamp */
  completedAt?: string

  /** Creator agent/user ID */
  createdBy: string

  /** Notification settings */
  notifications: {
    onComplete: boolean
    onFailure: boolean
    onProgress: boolean
    notifyHuman: boolean
  }

  /** Convoy metadata */
  metadata?: Record<string, any>

  /** Tags for categorization */
  tags: string[]
}

/**
 * Convoy creation options
 */
export interface CreateConvoyOptions {
  /** Convoy description */
  description?: string

  /** Creator ID */
  createdBy?: string

  /** Notify on completion */
  notifyOnComplete?: boolean

  /** Notify on failure */
  notifyOnFailure?: boolean

  /** Notify on progress updates */
  notifyOnProgress?: boolean

  /** Notify human user */
  notifyHuman?: boolean

  /** Tags */
  tags?: string[]

  /** Metadata */
  metadata?: Record<string, any>
}

/**
 * Task creation options
 */
export interface CreateTaskOptions {
  /** Task description */
  description?: string

  /** Assigned agent ID */
  assignedTo?: string

  /** Task dependencies */
  dependsOn?: string[]

  /** Metadata */
  metadata?: Record<string, any>
}

/**
 * Convoy events
 */
export interface ConvoyEvents {
  'convoy:created': (convoy: Convoy) => void
  'convoy:started': (convoy: Convoy) => void
  'convoy:completed': (convoy: Convoy) => void
  'convoy:failed': (convoy: Convoy) => void
  'convoy:cancelled': (convoy: Convoy) => void
  'convoy:paused': (convoy: Convoy) => void
  'convoy:resumed': (convoy: Convoy) => void
  'convoy:progress': (convoy: Convoy, progress: number) => void
  'task:started': (convoy: Convoy, task: ConvoyTask) => void
  'task:completed': (convoy: Convoy, task: ConvoyTask) => void
  'task:failed': (convoy: Convoy, task: ConvoyTask) => void
  'task:cancelled': (convoy: Convoy, task: ConvoyTask) => void
  'task:skipped': (convoy: Convoy, task: ConvoyTask) => void
  'error': (error: Error) => void
}

/**
 * Convoy Manager
 *
 * Manages convoys (groups of related tasks) with:
 * - Task grouping and organization
 * - Progress tracking
 * - Dependency management
 * - Notifications
 * - Git-backed persistence
 */
export class ConvoyManager extends EventEmitter {
  private readonly stateManager: GitBackedStateManager
  private readonly convoys: Map<string, Convoy> = new Map()
  private initialized = false

  constructor(stateManager?: GitBackedStateManager) {
    super()
    this.stateManager = stateManager ?? getGlobalStateManager()
  }

  /**
   * Initialize convoy manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    await this.stateManager.initialize()
    await this.loadConvoys()

    this.initialized = true
  }

  /**
   * Create new convoy
   */
  async create(name: string, options: CreateConvoyOptions = {}): Promise<Convoy> {
    await this.ensureInitialized()

    const convoy: Convoy = {
      id: `cv-${nanoid(6)}`,
      name,
      description: options.description ?? '',
      tasks: [],
      status: 'pending',
      progress: 0,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      skippedTasks: 0,
      createdAt: new Date().toISOString(),
      createdBy: options.createdBy ?? 'system',
      notifications: {
        onComplete: options.notifyOnComplete ?? false,
        onFailure: options.notifyOnFailure ?? true,
        onProgress: options.notifyOnProgress ?? false,
        notifyHuman: options.notifyHuman ?? false,
      },
      metadata: options.metadata,
      tags: options.tags ?? [],
    }

    this.convoys.set(convoy.id, convoy)
    await this.persistConvoy(convoy)

    this.emit('convoy:created', convoy)
    return convoy
  }

  /**
   * Add task to convoy
   */
  async addTask(
    convoyId: string,
    title: string,
    options: CreateTaskOptions = {},
  ): Promise<ConvoyTask> {
    await this.ensureInitialized()

    const convoy = this.convoys.get(convoyId)
    if (!convoy) {
      throw new Error(`Convoy not found: ${convoyId}`)
    }

    const task: ConvoyTask = {
      id: `task-${nanoid(6)}`,
      title,
      description: options.description ?? '',
      status: 'pending',
      assignedTo: options.assignedTo,
      dependsOn: options.dependsOn ?? [],
      metadata: options.metadata,
    }

    convoy.tasks.push(task)
    convoy.totalTasks = convoy.tasks.length
    this.updateProgress(convoy)

    await this.persistConvoy(convoy)
    return task
  }

  /**
   * Add multiple tasks to convoy
   */
  async addTasks(
    convoyId: string,
    tasks: Array<{ title: string, options?: CreateTaskOptions }>,
  ): Promise<ConvoyTask[]> {
    const addedTasks: ConvoyTask[] = []

    for (const { title, options } of tasks) {
      const task = await this.addTask(convoyId, title, options)
      addedTasks.push(task)
    }

    return addedTasks
  }

  /**
   * Start convoy execution
   */
  async start(convoyId: string): Promise<void> {
    await this.ensureInitialized()

    const convoy = this.convoys.get(convoyId)
    if (!convoy) {
      throw new Error(`Convoy not found: ${convoyId}`)
    }

    if (convoy.status !== 'pending' && convoy.status !== 'paused') {
      throw new Error(`Cannot start convoy in status: ${convoy.status}`)
    }

    convoy.status = 'in_progress'
    convoy.startedAt = convoy.startedAt ?? new Date().toISOString()

    await this.persistConvoy(convoy)
    this.emit('convoy:started', convoy)
  }

  /**
   * Start a task
   */
  async startTask(convoyId: string, taskId: string, assignedTo?: string): Promise<void> {
    await this.ensureInitialized()

    const convoy = this.convoys.get(convoyId)
    if (!convoy) {
      throw new Error(`Convoy not found: ${convoyId}`)
    }

    const task = convoy.tasks.find(t => t.id === taskId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    // Check dependencies
    const unmetDeps = this.getUnmetDependencies(convoy, task)
    if (unmetDeps.length > 0) {
      throw new Error(`Task has unmet dependencies: ${unmetDeps.join(', ')}`)
    }

    task.status = 'in_progress'
    task.startedAt = new Date().toISOString()
    if (assignedTo) {
      task.assignedTo = assignedTo
    }

    // Start convoy if not started
    if (convoy.status === 'pending') {
      convoy.status = 'in_progress'
      convoy.startedAt = new Date().toISOString()
    }

    await this.persistConvoy(convoy)
    this.emit('task:started', convoy, task)
  }

  /**
   * Complete a task
   */
  async completeTask(convoyId: string, taskId: string, result?: any): Promise<void> {
    await this.ensureInitialized()

    const convoy = this.convoys.get(convoyId)
    if (!convoy) {
      throw new Error(`Convoy not found: ${convoyId}`)
    }

    const task = convoy.tasks.find(t => t.id === taskId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    task.status = 'completed'
    task.completedAt = new Date().toISOString()
    task.result = result

    convoy.completedTasks++
    this.updateProgress(convoy)
    this.checkConvoyCompletion(convoy)

    await this.persistConvoy(convoy)
    this.emit('task:completed', convoy, task)

    if (convoy.notifications.onProgress) {
      this.emit('convoy:progress', convoy, convoy.progress)
    }
  }

  /**
   * Fail a task
   */
  async failTask(convoyId: string, taskId: string, error: string): Promise<void> {
    await this.ensureInitialized()

    const convoy = this.convoys.get(convoyId)
    if (!convoy) {
      throw new Error(`Convoy not found: ${convoyId}`)
    }

    const task = convoy.tasks.find(t => t.id === taskId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    task.status = 'failed'
    task.completedAt = new Date().toISOString()
    task.error = error

    convoy.failedTasks++
    this.updateProgress(convoy)

    // Skip dependent tasks
    await this.skipDependentTasks(convoy, taskId)

    this.checkConvoyCompletion(convoy)

    await this.persistConvoy(convoy)
    this.emit('task:failed', convoy, task)

    if (convoy.notifications.onFailure) {
      this.emit('convoy:failed', convoy)
    }
  }

  /**
   * Cancel a task
   */
  async cancelTask(convoyId: string, taskId: string): Promise<void> {
    await this.ensureInitialized()

    const convoy = this.convoys.get(convoyId)
    if (!convoy) {
      throw new Error(`Convoy not found: ${convoyId}`)
    }

    const task = convoy.tasks.find(t => t.id === taskId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    task.status = 'cancelled'
    task.completedAt = new Date().toISOString()

    convoy.cancelledTasks++
    this.updateProgress(convoy)

    // Skip dependent tasks
    await this.skipDependentTasks(convoy, taskId)

    this.checkConvoyCompletion(convoy)

    await this.persistConvoy(convoy)
    this.emit('task:cancelled', convoy, task)
  }

  /**
   * Pause convoy
   */
  async pause(convoyId: string): Promise<void> {
    await this.ensureInitialized()

    const convoy = this.convoys.get(convoyId)
    if (!convoy) {
      throw new Error(`Convoy not found: ${convoyId}`)
    }

    if (convoy.status !== 'in_progress') {
      throw new Error(`Cannot pause convoy in status: ${convoy.status}`)
    }

    convoy.status = 'paused'
    await this.persistConvoy(convoy)
    this.emit('convoy:paused', convoy)
  }

  /**
   * Resume convoy
   */
  async resume(convoyId: string): Promise<void> {
    await this.ensureInitialized()

    const convoy = this.convoys.get(convoyId)
    if (!convoy) {
      throw new Error(`Convoy not found: ${convoyId}`)
    }

    if (convoy.status !== 'paused') {
      throw new Error(`Cannot resume convoy in status: ${convoy.status}`)
    }

    convoy.status = 'in_progress'
    await this.persistConvoy(convoy)
    this.emit('convoy:resumed', convoy)
  }

  /**
   * Cancel convoy
   */
  async cancel(convoyId: string): Promise<void> {
    await this.ensureInitialized()

    const convoy = this.convoys.get(convoyId)
    if (!convoy) {
      throw new Error(`Convoy not found: ${convoyId}`)
    }

    convoy.status = 'cancelled'
    convoy.completedAt = new Date().toISOString()

    // Cancel all pending tasks
    for (const task of convoy.tasks) {
      if (task.status === 'pending' || task.status === 'in_progress') {
        task.status = 'cancelled'
        task.completedAt = new Date().toISOString()
        convoy.cancelledTasks++
      }
    }

    this.updateProgress(convoy)
    await this.persistConvoy(convoy)
    this.emit('convoy:cancelled', convoy)
  }

  /**
   * Get convoy by ID
   */
  get(convoyId: string): Convoy | undefined {
    return this.convoys.get(convoyId)
  }

  /**
   * List all convoys
   */
  list(filter?: {
    status?: ConvoyStatus
    createdBy?: string
    tags?: string[]
  }): Convoy[] {
    let convoys = Array.from(this.convoys.values())

    if (filter) {
      if (filter.status) {
        convoys = convoys.filter(c => c.status === filter.status)
      }
      if (filter.createdBy) {
        convoys = convoys.filter(c => c.createdBy === filter.createdBy)
      }
      if (filter.tags && filter.tags.length > 0) {
        convoys = convoys.filter(c =>
          filter.tags!.some(tag => c.tags.includes(tag)),
        )
      }
    }

    return convoys.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }

  /**
   * Get active convoys
   */
  getActive(): Convoy[] {
    return this.list({ status: 'in_progress' })
  }

  /**
   * Get next available tasks (no unmet dependencies)
   */
  getNextTasks(convoyId: string): ConvoyTask[] {
    const convoy = this.convoys.get(convoyId)
    if (!convoy) return []

    return convoy.tasks.filter((task) => {
      if (task.status !== 'pending') return false
      return this.getUnmetDependencies(convoy, task).length === 0
    })
  }

  /**
   * Get convoy summary
   */
  getSummary(convoyId: string): string {
    const convoy = this.convoys.get(convoyId)
    if (!convoy) return 'Convoy not found'

    const lines = [
      `Convoy: ${convoy.name} (${convoy.id})`,
      `Status: ${convoy.status}`,
      `Progress: ${convoy.progress}%`,
      `Tasks: ${convoy.completedTasks}/${convoy.totalTasks} completed`,
    ]

    if (convoy.failedTasks > 0) {
      lines.push(`Failed: ${convoy.failedTasks}`)
    }

    if (convoy.cancelledTasks > 0) {
      lines.push(`Cancelled: ${convoy.cancelledTasks}`)
    }

    if (convoy.skippedTasks > 0) {
      lines.push(`Skipped: ${convoy.skippedTasks}`)
    }

    return lines.join('\n')
  }

  /**
   * Delete convoy
   */
  async delete(convoyId: string): Promise<boolean> {
    await this.ensureInitialized()

    const convoy = this.convoys.get(convoyId)
    if (!convoy) return false

    this.convoys.delete(convoyId)
    // Note: We don't delete from git to preserve history

    return true
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  private updateProgress(convoy: Convoy): void {
    const processed = convoy.completedTasks + convoy.failedTasks + convoy.cancelledTasks + convoy.skippedTasks
    convoy.progress = convoy.totalTasks > 0
      ? Math.round((processed / convoy.totalTasks) * 100)
      : 0
  }

  private checkConvoyCompletion(convoy: Convoy): void {
    const processed = convoy.completedTasks + convoy.failedTasks + convoy.cancelledTasks + convoy.skippedTasks

    if (processed === convoy.totalTasks) {
      convoy.completedAt = new Date().toISOString()

      if (convoy.failedTasks === 0 && convoy.cancelledTasks === 0) {
        convoy.status = 'completed'
        if (convoy.notifications.onComplete) {
          this.emit('convoy:completed', convoy)
        }
      }
      else {
        convoy.status = 'failed'
        if (convoy.notifications.onFailure) {
          this.emit('convoy:failed', convoy)
        }
      }
    }
  }

  private getUnmetDependencies(convoy: Convoy, task: ConvoyTask): string[] {
    return task.dependsOn.filter((depId) => {
      const depTask = convoy.tasks.find(t => t.id === depId)
      return !depTask || depTask.status !== 'completed'
    })
  }

  private async skipDependentTasks(convoy: Convoy, failedTaskId: string): Promise<void> {
    for (const task of convoy.tasks) {
      if (task.status === 'pending' && task.dependsOn.includes(failedTaskId)) {
        task.status = 'skipped'
        task.completedAt = new Date().toISOString()
        task.error = `Skipped due to failed dependency: ${failedTaskId}`
        convoy.skippedTasks++

        this.emit('task:skipped', convoy, task)

        // Recursively skip tasks that depend on this one
        await this.skipDependentTasks(convoy, task.id)
      }
    }
  }

  private async loadConvoys(): Promise<void> {
    // Load convoys from state manager
    for (const agentId of this.stateManager.getAgentIds()) {
      if (agentId.startsWith('convoy-')) {
        const state = await this.stateManager.loadState(agentId)
        if (state) {
          const convoy = state as unknown as Convoy
          this.convoys.set(convoy.id, convoy)
        }
      }
    }
  }

  private async persistConvoy(convoy: Convoy): Promise<void> {
    await this.stateManager.createAgentWorktree(`convoy-${convoy.id}`)
    await this.stateManager.saveState(`convoy-${convoy.id}`, convoy as any)
  }
}

// ========================================================================
// Singleton Instance
// ========================================================================

let globalConvoyManager: ConvoyManager | null = null

/**
 * Get global convoy manager instance
 */
export function getGlobalConvoyManager(): ConvoyManager {
  if (!globalConvoyManager) {
    globalConvoyManager = new ConvoyManager()
  }
  return globalConvoyManager
}

/**
 * Reset global convoy manager (for testing)
 */
export function resetGlobalConvoyManager(): void {
  globalConvoyManager = null
}
