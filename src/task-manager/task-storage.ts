/**
 * Task Storage
 * 任务存储层
 *
 * @version 8.0.0
 * @module task-manager
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import type { Task, TaskManagerOptions, TaskSearchOptions } from './types'

/**
 * Task Storage class
 */
export class TaskStorage {
  private storageType: 'local' | 'cloud'
  private storagePath: string
  private cloudEndpoint?: string
  private cache: Map<string, Task>

  constructor(options?: TaskManagerOptions) {
    this.storageType = options?.storageType || 'local'
    this.cloudEndpoint = options?.cloudEndpoint
    this.storagePath = path.join(os.homedir(), '.claude', 'tasks.json')
    this.cache = new Map()
  }

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    if (this.storageType === 'local') {
      await this.ensureStorageDir()
      await this.loadCache()
    }
  }

  /**
   * Save a task (create new or update existing)
   * Returns the saved task (may have different ID from cloud)
   */
  async saveTask(task: Task): Promise<Task> {
    if (this.storageType === 'local') {
      this.cache.set(task.id, task)
      await this.saveToLocal()
      return task
    } else {
      // Always POST for now (creates new task)
      const savedTask = await this.saveToCloud(task)
      if (savedTask) {
        this.cache.set(savedTask.id, savedTask)
        return savedTask
      }
      return task
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    if (this.storageType === 'local') {
      const existing = this.cache.get(taskId)
      if (!existing) return null

      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
      this.cache.set(taskId, updated)
      await this.saveToLocal()
      return updated
    } else {
      return await this.updateInCloud(taskId, updates)
    }
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<Task | null> {
    // Cloud storage: always fetch from server for fresh data
    if (this.storageType === 'cloud') {
      return await this.getFromCloud(taskId)
    }

    // Local storage: check cache first
    if (this.cache.has(taskId)) {
      return this.cache.get(taskId)!
    }

    // Load from local storage
    await this.loadCache()
    return this.cache.get(taskId) || null
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const existed = this.cache.has(taskId)
    this.cache.delete(taskId)

    if (this.storageType === 'local') {
      await this.saveToLocal()
    } else {
      await this.deleteFromCloud(taskId)
    }

    return existed
  }

  /**
   * Search tasks
   */
  async searchTasks(options?: TaskSearchOptions): Promise<Task[]> {
    // Cloud storage
    if (this.storageType === 'cloud') {
      return await this.searchFromCloud(options)
    }

    // Local storage
    await this.loadCache()

    let tasks = Array.from(this.cache.values())

    // Apply filters
    if (options?.status) {
      tasks = tasks.filter(t => t.status === options.status)
    }

    if (options?.priority) {
      tasks = tasks.filter(t => t.priority === options.priority)
    }

    if (options?.nameContains) {
      const query = options.nameContains.toLowerCase()
      tasks = tasks.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      )
    }

    // Sort by creation time (newest first)
    tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Apply pagination
    if (options?.offset !== undefined) {
      tasks = tasks.slice(options.offset)
    }

    if (options?.limit !== undefined) {
      tasks = tasks.slice(0, options.limit)
    }

    return tasks
  }

  /**
   * Clear all tasks
   */
  async clearAll(): Promise<void> {
    this.cache.clear()

    if (this.storageType === 'local') {
      await this.saveToLocal()
    }
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    const dir = path.dirname(this.storagePath)
    try {
      await fs.mkdir(dir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Load cache from local storage
   */
  private async loadCache(): Promise<void> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8')
      const tasks: Task[] = JSON.parse(data)
      this.cache.clear()
      for (const task of tasks) {
        this.cache.set(task.id, task)
      }
    } catch (error) {
      // File doesn't exist or is invalid, start with empty cache
      this.cache.clear()
    }
  }

  /**
   * Save cache to local storage
   */
  private async saveToLocal(): Promise<void> {
    const tasks = Array.from(this.cache.values())
    const data = JSON.stringify(tasks, null, 2)
    await fs.writeFile(this.storagePath, data, 'utf-8')
  }

  /**
   * Save task to cloud (POST - creates new)
   */
  private async saveToCloud(task: Task): Promise<Task | null> {
    if (!this.cloudEndpoint) {
      throw new Error('Cloud endpoint not configured')
    }

    try {
      const response = await fetch(`${this.cloudEndpoint}/api/v8/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CCJK_API_KEY || 'test'}`,
        },
        body: JSON.stringify({
          name: task.name,
          description: task.description,
          priority: task.priority,
          status: task.status,
          dependsOn: task.dependsOn,
          metadata: task.metadata,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to save task to cloud: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.code !== 0) {
        throw new Error(`Cloud API error: ${result.message}`)
      }

      // Transform response to match our Task interface
      const cloudTask = result.data
      if (!cloudTask) return null

      return {
        id: cloudTask.id,
        name: cloudTask.name,
        description: cloudTask.description || '',
        status: cloudTask.status,
        priority: cloudTask.priority,
        dependsOn: cloudTask.depends_on || [],
        dependents: cloudTask.dependents || [],
        metadata: cloudTask.metadata || {},
        createdAt: cloudTask.created_at,
        updatedAt: cloudTask.updated_at,
        completedAt: cloudTask.completed_at,
        startedAt: cloudTask.started_at,
        duration: cloudTask.duration,
      }
    } catch (error) {
      console.error('Error saving task to cloud:', error)
      throw error
    }
  }

  /**
   * Get task from cloud
   */
  private async getFromCloud(taskId: string): Promise<Task | null> {
    if (!this.cloudEndpoint) {
      throw new Error('Cloud endpoint not configured')
    }

    try {
      const response = await fetch(`${this.cloudEndpoint}/api/v8/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.CCJK_API_KEY || 'test'}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to get task from cloud: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.code !== 0) {
        throw new Error(`Cloud API error: ${result.message}`)
      }

      // Transform response data to match our Task interface
      const cloudTask = result.data
      if (!cloudTask) return null

      return {
        id: cloudTask.id,
        name: cloudTask.name,
        description: cloudTask.description || '',
        status: cloudTask.status,
        priority: cloudTask.priority,
        dependsOn: cloudTask.depends_on || [],
        dependents: cloudTask.dependents || [],
        metadata: cloudTask.metadata || {},
        createdAt: cloudTask.created_at,
        updatedAt: cloudTask.updated_at,
        completedAt: cloudTask.completed_at,
        startedAt: cloudTask.started_at,
        duration: cloudTask.duration,
      }
    } catch (error) {
      console.error('Error getting task from cloud:', error)
      return null
    }
  }

  /**
   * Delete task from cloud
   */
  private async deleteFromCloud(taskId: string): Promise<void> {
    if (!this.cloudEndpoint) {
      throw new Error('Cloud endpoint not configured')
    }

    try {
      const response = await fetch(`${this.cloudEndpoint}/api/v8/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.CCJK_API_KEY || 'test'}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete task from cloud: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.code !== 0) {
        throw new Error(`Cloud API error: ${result.message}`)
      }
    } catch (error) {
      console.error('Error deleting task from cloud:', error)
      throw error
    }
  }

  /**
   * Search tasks from cloud API
   */
  private async searchFromCloud(options?: TaskSearchOptions): Promise<Task[]> {
    if (!this.cloudEndpoint) {
      throw new Error('Cloud endpoint not configured')
    }

    try {
      // Build query string
      const params = new URLSearchParams()

      if (options?.status) {
        params.append('status', options.status)
      }

      if (options?.priority) {
        params.append('priority', options.priority)
      }

      if (options?.nameContains) {
        params.append('query', options.nameContains)
      }

      if (options?.limit !== undefined) {
        params.append('limit', options.limit.toString())
      }

      if (options?.offset !== undefined) {
        params.append('offset', options.offset.toString())
      }

      const url = `${this.cloudEndpoint}/api/v8/tasks?${params.toString()}`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${process.env.CCJK_API_KEY || 'test'}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to search tasks from cloud: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.code !== 0) {
        throw new Error(`Cloud API error: ${result.message}`)
      }

      // Transform response format: { data: { items: [...], total, limit, offset } }
      const cloudTasks = result.data?.items || []

      // Map database field names to our Task interface
      return cloudTasks.map((task: any) => ({
        id: task.id,
        name: task.name,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        dependsOn: task.depends_on || [],
        dependents: task.dependents || [],
        metadata: task.metadata || {},
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        completedAt: task.completed_at,
        startedAt: task.started_at,
        duration: task.duration,
      }))
    } catch (error) {
      console.error('Error searching tasks from cloud:', error)
      return []
    }
  }

  /**
   * Update task in cloud (PUT - updates existing)
   */
  private async updateInCloud(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    if (!this.cloudEndpoint) {
      throw new Error('Cloud endpoint not configured')
    }

    try {
      const response = await fetch(`${this.cloudEndpoint}/api/v8/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CCJK_API_KEY || 'test'}`,
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error(`Failed to update task in cloud: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.code !== 0) {
        throw new Error(`Cloud API error: ${result.message}`)
      }

      // Fetch the updated task to return full data
      return await this.getFromCloud(taskId)
    } catch (error) {
      console.error('Error updating task in cloud:', error)
      throw error
    }
  }
}

