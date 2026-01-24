/**
 * Task Manager Module
 * 任务管理模块入口
 *
 * @version 8.0.0
 * @module task-manager
 */

export { TaskManager } from './task-manager'
export { TaskDependencyTracker } from './dependency-tracker'
export { TaskScheduler } from './task-scheduler'
export { TaskStorage } from './task-storage'

export type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskDependency,
  TaskGraphNode,
  TaskSchedule,
  CreateTaskOptions,
  UpdateTaskOptions,
  TaskManagerOptions,
  TaskSearchOptions,
  TaskStats,
} from './types'
