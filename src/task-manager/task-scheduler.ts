/**
 * Task Scheduler
 * 任务调度器
 *
 * @version 8.0.0
 * @module task-manager
 */

import type { Task, TaskSchedule } from './types'
import { TaskDependencyTracker } from './dependency-tracker'

/**
 * Task Scheduler class
 */
export class TaskScheduler {
  private dependencyTracker: TaskDependencyTracker

  constructor() {
    this.dependencyTracker = new TaskDependencyTracker()
  }

  /**
   * Create execution schedule for tasks
   */
  createSchedule(tasks: Task[]): TaskSchedule {
    // Filter out completed and cancelled tasks
    const activeTasks = tasks.filter(
      t => t.status !== 'completed' && t.status !== 'cancelled',
    )

    // Get execution order
    const order = this.dependencyTracker.getExecutionOrder(activeTasks)

    // Get parallel groups
    const parallelGroups = this.dependencyTracker.getParallelGroups(activeTasks)

    // Get blocked tasks
    const blocked = activeTasks.filter((task) => {
      if (task.dependsOn.length === 0) {
        return false
      }

      // Check if any dependency is not completed
      return task.dependsOn.some((depId) => {
        const depTask = tasks.find(t => t.id === depId)
        return depTask && depTask.status !== 'completed'
      })
    })

    return {
      order,
      parallelGroups,
      blocked,
    }
  }

  /**
   * Get next available tasks (no blocking dependencies)
   */
  getNextAvailableTasks(tasks: Task[]): Task[] {
    return tasks.filter((task) => {
      // Must be pending
      if (task.status !== 'pending') {
        return false
      }

      // No dependencies or all dependencies completed
      if (task.dependsOn.length === 0) {
        return true
      }

      return task.dependsOn.every((depId) => {
        const depTask = tasks.find(t => t.id === depId)
        return depTask?.status === 'completed'
      })
    })
  }

  /**
   * Suggest optimal execution order based on priority and dependencies
   */
  suggestOptimalOrder(tasks: Task[]): Task[] {
    const available = this.getNextAvailableTasks(tasks)

    // Sort by priority (high > medium > low)
    const priorityWeight = { high: 3, medium: 2, low: 1 }

    return available.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority]
      if (priorityDiff !== 0) {
        return priorityDiff
      }

      // Then by creation time (older first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }
}
