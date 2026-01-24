/**
 * Task Manager
 * 任务管理器核心实现
 *
 * @version 8.0.0
 * @module task-manager
 */

import type {
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskOptions,
  UpdateTaskOptions,
  TaskDependency,
  TaskSchedule,
  TaskSearchOptions,
  TaskStats,
  TaskGraphNode,
  TaskManagerOptions,
} from './types'
import { TaskDependencyTracker } from './dependency-tracker'
import { TaskScheduler } from './task-scheduler'
import { TaskStorage } from './task-storage'

/**
 * Task Manager class
 */
export class TaskManager {
  private storage: TaskStorage
  private dependencyTracker: TaskDependencyTracker
  private scheduler: TaskScheduler

  constructor(options?: TaskManagerOptions) {
    this.storage = new TaskStorage(options)
    this.dependencyTracker = new TaskDependencyTracker()
    this.scheduler = new TaskScheduler()
  }

  /**
   * Create a new task
   */
  async createTask(options: CreateTaskOptions): Promise<Task> {
    const now = new Date().toISOString()
    const task: Task = {
      id: this.generateTaskId(),
      name: options.name,
      description: options.description,
      status: 'pending',
      priority: options.priority || 'medium',
      dependsOn: options.dependsOn || [],
      dependents: [],
      metadata: options.metadata || {},
      createdAt: now,
      updatedAt: now,
    }

    // Check for circular dependencies
    if (options.dependsOn && options.dependsOn.length > 0) {
      const hasCycle = await this.detectCircularDependency(task.id, options.dependsOn)
      if (hasCycle) {
        throw new Error('Circular dependency detected')
      }
    }

    // Save task (returns task with id from server)
    const savedTask = await this.storage.saveTask(task)
    // Use returned task in case id was changed by cloud storage
    const finalTask = savedTask || task

    // Update dependents
    if (options.dependsOn && options.dependsOn.length > 0) {
      await this.updateDependents(finalTask)
    }

    return finalTask
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: UpdateTaskOptions): Promise<Task | null> {
    // For cloud storage, use the storage's updateTask method
    if (this.storage['storageType'] === 'cloud') {
      const updated = await this.storage.updateTask(taskId, updates)
      if (updated && updates.status === 'completed') {
        await this.updateBlockedTasks(taskId)
      }
      return updated
    }

    // For local storage - existing logic
    const task = await this.storage.getTask(taskId)
    if (!task) {
      return null
    }

    // Check if status is being changed to completed
    if (updates.status === 'completed' && task.status !== 'completed') {
      updates.completedAt = new Date().toISOString()
      if (task.startedAt) {
        updates.duration = Date.now() - new Date(task.startedAt).getTime()
      }
    }

    // Check if task is being started
    if (updates.status === 'in_progress' && task.status !== 'in_progress') {
      updates.startedAt = new Date().toISOString()
    }

    const updatedTask: Task = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Check if blocking other tasks
    if (updates.status === 'completed') {
      await this.updateBlockedTasks(taskId)
    }

    const saved = await this.storage.saveTask(updatedTask)
    return saved
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<boolean> {
    // Remove from dependencies
    await this.removeDependencies(taskId)

    // Delete task
    return await this.storage.deleteTask(taskId)
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<Task | null> {
    return await this.storage.getTask(taskId)
  }

  /**
   * List all tasks
   */
  async listTasks(options?: TaskSearchOptions): Promise<Task[]> {
    return await this.storage.searchTasks(options)
  }

  /**
   * Add a dependency between tasks
   * @param taskId - The task that depends on another
   * @param dependsOnId - The task it depends on
   */
  async addDependency(taskId: string, dependsOnId: string): Promise<boolean> {
    // Check if both tasks exist
    const task = await this.getTask(taskId)
    const dependsOnTask = await this.getTask(dependsOnId)

    if (!task || !dependsOnTask) {
      throw new Error('Task not found')
    }

    // Check circular dependency
    const wouldBeCircular = await this.dependencyTracker.detectCircular(taskId, [dependsOnId])
    if (wouldBeCircular) {
      throw new Error('Adding this dependency would create a circular dependency')
    }

    // Add dependency
    if (!task.dependsOn.includes(dependsOnId)) {
      task.dependsOn.push(dependsOnId)
      await this.storage.saveTask(task)
    }

    // Update dependents on the other task
    if (!dependsOnTask.dependents.includes(taskId)) {
      dependsOnTask.dependents.push(taskId)
      await this.storage.saveTask(dependsOnTask)
    }

    return true
  }

  /**
   * Remove a dependency between tasks
   * @param taskId - The task that depends on another
   * @param dependsOnId - The dependency to remove
   */
  async removeDependency(taskId: string, dependsOnId: string): Promise<boolean> {
    const task = await this.getTask(taskId)
    const dependsOnTask = await this.getTask(dependsOnId)

    if (!task || !dependsOnTask) {
      throw new Error('Task not found')
    }

    // Remove from dependsOn
    const beforeCount = task.dependsOn.length
    task.dependsOn = task.dependsOn.filter(id => id !== dependsOnId)

    // Remove from dependents
    dependsOnTask.dependents = dependsOnTask.dependents.filter(id => id !== taskId)

    // Save both tasks if changed
    if (task.dependsOn.length < beforeCount) {
      await Promise.all([
        this.storage.saveTask(task),
        this.storage.saveTask(dependsOnTask),
      ])
      return true
    }

    return false
  }

  /**
   * Get dependency graph for a task
   * @param taskId - The task to get dependency graph for
   */
  async getDependencyGraph(taskId: string): Promise<{ nodes: TaskGraphNode[] }> {
    const allTasks = await this.listTasks()

    // If specific task requested, get all tasks in its dependency chain
    const task = allTasks.find(t => t.id === taskId)
    const tasksToShow = task ? await this.getAllDependencies(taskId, allTasks) : allTasks

    const nodes = this.dependencyTracker.buildGraph(tasksToShow)
    return { nodes }
  }

  /**
   * Get all tasks in dependency chain recursively
   */
  private async getAllDependencies(taskId: string, allTasks: Task[]): Promise<Task[]> {
    const result = new Set<Task>()
    const visited = new Set<string>()

    const collect = (id: string) => {
      if (visited.has(id)) return
      visited.add(id)

      const task = allTasks.find(t => t.id === id)
      if (task) {
        result.add(task)
        task.dependsOn.forEach(depId => collect(depId))
      }
    }

    collect(taskId)
    return Array.from(result)
  }

  /**
   * Get task statistics
   */
  async getStats(): Promise<TaskStats> {
    const tasks = await this.listTasks()

    const byStatus: Record<TaskStatus, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
      cancelled: 0,
    }

    const byPriority: Record<TaskPriority, number> = {
      high: 0,
      medium: 0,
      low: 0,
    }

    let totalDuration = 0
    let completedCount = 0

    for (const task of tasks) {
      byStatus[task.status]++
      byPriority[task.priority]++

      if (task.duration && task.status === 'completed') {
        totalDuration += task.duration
        completedCount++
      }
    }

    const averageDuration = completedCount > 0
      ? Math.round(totalDuration / completedCount)
      : undefined

    return {
      total: tasks.length,
      byStatus,
      byPriority,
      completionRate: Math.round((byStatus.completed / tasks.length) * 100),
      averageDuration,
    }
  }

  /**
   * Get task schedule (execution order)
   */
  async getSchedule(): Promise<TaskSchedule> {
    const tasks = await this.listTasks()
    return this.scheduler.createSchedule(tasks)
  }

  /**
   * Detect circular dependencies
   */
  async detectCircularDependency(taskId: string, dependsOn: string[]): Promise<boolean> {
    return await this.dependencyTracker.detectCircular(taskId, dependsOn)
  }

  /**
   * Update dependents when a task is created/updated
   */
  private async updateDependents(task: Task): Promise<void> {
    if (!task.dependsOn || task.dependsOn.length === 0) {
      return
    }

    for (const dependencyId of task.dependsOn) {
      const dependencyTask = await this.getTask(dependencyId)
      if (dependencyTask) {
        if (!dependencyTask.dependents.includes(task.id)) {
          dependencyTask.dependents.push(task.id)
          await this.storage.saveTask(dependencyTask)
        }
      }
    }
  }

  /**
   * Update blocked tasks when a task is completed
   */
  private async updateBlockedTasks(completedTaskId: string): Promise<void> {
    const tasks = await this.listTasks()

    for (const task of tasks) {
      if (task.dependsOn.includes(completedTaskId) && task.status === 'blocked') {
        // Check if all dependencies are completed
        const allCompleted = task.dependsOn.every(async (depId) => {
          const depTask = await this.getTask(depId)
          return depTask?.status === 'completed'
        })

        if (allCompleted) {
          await this.updateTask(task.id, { status: 'pending' })
        }
      }
    }
  }

  /**
   * Remove dependencies when a task is deleted
   */
  private async removeDependencies(taskId: string): Promise<void> {
    const tasks = await this.listTasks()

    for (const task of tasks) {
      // Remove from dependsOn
      if (task.dependsOn.includes(taskId)) {
        task.dependsOn = task.dependsOn.filter(id => id !== taskId)
        await this.storage.saveTask(task)
      }

      // Remove from dependents
      if (task.dependents.includes(taskId)) {
        task.dependents = task.dependents.filter(id => id !== taskId)
        await this.storage.saveTask(task)
      }
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  }
}

