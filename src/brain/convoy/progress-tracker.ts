/**
 * Progress Tracker for Convoys
 *
 * Provides real-time progress visualization and tracking for convoy execution.
 *
 * @module brain/convoy/progress-tracker
 */

import type { Convoy, ConvoyManager, ConvoyTask } from './convoy-manager'
import { EventEmitter } from 'node:events'

/**
 * Progress update event
 */
export interface ProgressUpdate {
  convoyId: string
  convoyName: string
  progress: number
  status: Convoy['status']
  totalTasks: number
  completedTasks: number
  failedTasks: number
  inProgressTasks: number
  pendingTasks: number
  currentTasks: ConvoyTask[]
  estimatedCompletion?: Date
  elapsedTime: number
  averageTaskTime: number
}

/**
 * Progress tracker configuration
 */
export interface ProgressTrackerConfig {
  /** Update interval in milliseconds (default: 1000) */
  updateInterval?: number

  /** Enable console output (default: false) */
  consoleOutput?: boolean

  /** Progress bar width (default: 40) */
  progressBarWidth?: number
}

/**
 * Progress Tracker
 *
 * Tracks and visualizes convoy progress in real-time.
 */
export class ProgressTracker extends EventEmitter {
  private readonly config: Required<ProgressTrackerConfig>
  private readonly convoyManager: ConvoyManager
  private readonly trackedConvoys: Map<string, NodeJS.Timeout> = new Map()
  private readonly taskStartTimes: Map<string, number> = new Map()
  private readonly taskDurations: Map<string, number[]> = new Map()

  constructor(convoyManager: ConvoyManager, config: ProgressTrackerConfig = {}) {
    super()
    this.convoyManager = convoyManager
    this.config = {
      updateInterval: config.updateInterval ?? 1000,
      consoleOutput: config.consoleOutput ?? false,
      progressBarWidth: config.progressBarWidth ?? 40,
    }

    this.setupEventListeners()
  }

  /**
   * Start tracking a convoy
   */
  track(convoyId: string): void {
    if (this.trackedConvoys.has(convoyId)) {
      return
    }

    const interval = setInterval(() => {
      this.emitProgress(convoyId)
    }, this.config.updateInterval)

    this.trackedConvoys.set(convoyId, interval)
    this.taskDurations.set(convoyId, [])

    // Emit initial progress
    this.emitProgress(convoyId)
  }

  /**
   * Stop tracking a convoy
   */
  untrack(convoyId: string): void {
    const interval = this.trackedConvoys.get(convoyId)
    if (interval) {
      clearInterval(interval)
      this.trackedConvoys.delete(convoyId)
    }
    this.taskDurations.delete(convoyId)
  }

  /**
   * Get current progress for a convoy
   */
  getProgress(convoyId: string): ProgressUpdate | null {
    const convoy = this.convoyManager.get(convoyId)
    if (!convoy)
      return null

    return this.buildProgressUpdate(convoy)
  }

  /**
   * Get progress bar string
   */
  getProgressBar(convoyId: string): string {
    const convoy = this.convoyManager.get(convoyId)
    if (!convoy)
      return ''

    return this.buildProgressBar(convoy.progress)
  }

  /**
   * Get formatted progress string
   */
  getFormattedProgress(convoyId: string): string {
    const update = this.getProgress(convoyId)
    if (!update)
      return 'Convoy not found'

    const lines = [
      `${update.convoyName} [${update.convoyId}]`,
      this.buildProgressBar(update.progress),
      `Status: ${this.formatStatus(update.status)}`,
      `Progress: ${update.progress}% (${update.completedTasks}/${update.totalTasks})`,
    ]

    if (update.inProgressTasks > 0) {
      lines.push(`In Progress: ${update.inProgressTasks}`)
    }

    if (update.failedTasks > 0) {
      lines.push(`Failed: ${update.failedTasks}`)
    }

    if (update.currentTasks.length > 0) {
      lines.push('\nCurrent Tasks:')
      for (const task of update.currentTasks) {
        lines.push(`  - ${task.title} (${task.assignedTo ?? 'unassigned'})`)
      }
    }

    if (update.estimatedCompletion) {
      lines.push(`\nETA: ${this.formatTime(update.estimatedCompletion.getTime() - Date.now())}`)
    }

    lines.push(`Elapsed: ${this.formatTime(update.elapsedTime)}`)

    return lines.join('\n')
  }

  /**
   * Stop all tracking
   */
  stopAll(): void {
    const convoyIds = Array.from(this.trackedConvoys.keys())
    for (const convoyId of convoyIds) {
      this.untrack(convoyId)
    }
  }

  /**
   * Destroy tracker
   */
  destroy(): void {
    this.stopAll()
    this.removeAllListeners()
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private setupEventListeners(): void {
    this.convoyManager.on('task:started', (convoy, task) => {
      this.taskStartTimes.set(task.id, Date.now())
    })

    this.convoyManager.on('task:completed', (convoy, task) => {
      const startTime = this.taskStartTimes.get(task.id)
      if (startTime) {
        const duration = Date.now() - startTime
        const durations = this.taskDurations.get(convoy.id) ?? []
        durations.push(duration)
        this.taskDurations.set(convoy.id, durations)
        this.taskStartTimes.delete(task.id)
      }
    })

    this.convoyManager.on('convoy:completed', (convoy) => {
      this.untrack(convoy.id)
    })

    this.convoyManager.on('convoy:failed', (convoy) => {
      this.untrack(convoy.id)
    })

    this.convoyManager.on('convoy:cancelled', (convoy) => {
      this.untrack(convoy.id)
    })
  }

  private emitProgress(convoyId: string): void {
    const update = this.getProgress(convoyId)
    if (update) {
      this.emit('progress', update)

      if (this.config.consoleOutput) {
        console.log(this.getFormattedProgress(convoyId))
      }
    }
  }

  private buildProgressUpdate(convoy: Convoy): ProgressUpdate {
    const inProgressTasks = convoy.tasks.filter(t => t.status === 'in_progress').length
    const pendingTasks = convoy.tasks.filter(t => t.status === 'pending').length
    const currentTasks = convoy.tasks.filter(t => t.status === 'in_progress')

    const durations = this.taskDurations.get(convoy.id) ?? []
    const averageTaskTime = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    const elapsedTime = convoy.startedAt
      ? Date.now() - new Date(convoy.startedAt).getTime()
      : 0

    let estimatedCompletion: Date | undefined
    if (averageTaskTime > 0 && pendingTasks > 0) {
      const remainingTime = (pendingTasks + inProgressTasks) * averageTaskTime
      estimatedCompletion = new Date(Date.now() + remainingTime)
    }

    return {
      convoyId: convoy.id,
      convoyName: convoy.name,
      progress: convoy.progress,
      status: convoy.status,
      totalTasks: convoy.totalTasks,
      completedTasks: convoy.completedTasks,
      failedTasks: convoy.failedTasks,
      inProgressTasks,
      pendingTasks,
      currentTasks,
      estimatedCompletion,
      elapsedTime,
      averageTaskTime,
    }
  }

  private buildProgressBar(progress: number): string {
    const width = this.config.progressBarWidth
    const filled = Math.round((progress / 100) * width)
    const empty = width - filled

    const filledChar = '█'
    const emptyChar = '░'

    return `[${filledChar.repeat(filled)}${emptyChar.repeat(empty)}] ${progress}%`
  }

  private formatStatus(status: Convoy['status']): string {
    const statusMap: Record<Convoy['status'], string> = {
      pending: '⏳ Pending',
      in_progress: '🔄 In Progress',
      completed: '✅ Completed',
      failed: '❌ Failed',
      cancelled: '🚫 Cancelled',
      paused: '⏸️ Paused',
    }
    return statusMap[status] ?? status
  }

  private formatTime(ms: number): string {
    if (ms < 0)
      return '0s'

    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }
}

/**
 * Create a simple progress callback
 */
export function createProgressCallback(
  callback: (update: ProgressUpdate) => void,
): (convoyManager: ConvoyManager, convoyId: string) => () => void {
  return (convoyManager: ConvoyManager, convoyId: string) => {
    const tracker = new ProgressTracker(convoyManager)
    tracker.on('progress', callback)
    tracker.track(convoyId)

    return () => {
      tracker.destroy()
    }
  }
}
