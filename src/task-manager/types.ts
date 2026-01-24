/**
 * Task Management System Types
 * 任务管理系统类型定义
 *
 * @version 8.0.0
 * @module task-manager
 */

/**
 * Task status enum
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'

/**
 * Task priority enum
 */
export type TaskPriority = 'high' | 'medium' | 'low'

/**
 * Task interface
 */
export interface Task {
  id: string
  name: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dependsOn: string[]         // IDs of tasks this task depends on
  dependents: string[]        // IDs of tasks that depend on this task
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
  completedAt?: string
  startedAt?: string
  duration?: number           // in milliseconds
}

/**
 * Task dependency interface
 */
export interface TaskDependency {
  taskId: string
  dependsOn: string[]
}

/**
 * Create task options
 */
export interface CreateTaskOptions {
  name: string
  description?: string
  priority?: TaskPriority
  dependsOn?: string[]
  metadata?: Record<string, any>
}

/**
 * Update task options
 */
export interface UpdateTaskOptions {
  name?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  metadata?: Record<string, any>
  // Internal system-generated fields (not for direct user input)
  completedAt?: string
  startedAt?: string
  duration?: number
}

/**
 * Task graph node for dependency visualization
 */
export interface TaskGraphNode {
  id: string
  name: string
  status: TaskStatus
  priority: TaskPriority
  level: number              // Topological level
  dependencies: string[]
}

/**
 * Task scheduler result
 */
export interface TaskSchedule {
  order: Task[]              // Topological order
  parallelGroups: Task[][]   // Tasks that can run in parallel
  blocked: Task[]            // Tasks waiting for dependencies
}

/**
 * Task manager options
 */
export interface TaskManagerOptions {
  storageType: 'local' | 'cloud'
  cloudEndpoint?: string
  maxHistorySize?: number
  enableNotifications?: boolean
}

/**
 * Task search options
 */
export interface TaskSearchOptions {
  status?: TaskStatus
  priority?: TaskPriority
  nameContains?: string
  limit?: number
  offset?: number
}

/**
 * Task statistics
 */
export interface TaskStats {
  total: number
  byStatus: Record<TaskStatus, number>
  byPriority: Record<TaskPriority, number>
  completionRate: number    // 0-100
  averageDuration?: number
}
