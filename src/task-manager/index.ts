/**
 * Task Manager Module
 * 任务管理模块入口
 *
 * @version 8.0.0
 * @module task-manager
 */

export { TaskDependencyTracker } from './dependency-tracker'
export { TaskManager } from './task-manager'
export { TaskScheduler } from './task-scheduler'
export { TaskStorage } from './task-storage'

export type {
  CreateTaskOptions,
  Task,
  TaskDependency,
  TaskGraphNode,
  TaskManagerOptions,
  TaskPriority,
  TaskSchedule,
  TaskSearchOptions,
  TaskStats,
  TaskStatus,
  UpdateTaskOptions,
} from './types'
