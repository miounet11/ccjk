/**
 * Core Types for Brain System
 *
 * @module brain/types
 */

/**
 * Agent roles
 */
export type AgentRole =
  | 'researcher'
  | 'architect'
  | 'coder'
  | 'debugger'
  | 'tester'
  | 'reviewer'
  | 'writer'
  | 'analyst'
  | 'coordinator'
  | 'specialist'

/**
 * Agent state
 */
export interface AgentState {
  /** Agent ID */
  agentId: string

  /** Agent role */
  role: AgentRole

  /** Agent status */
  status: 'idle' | 'active' | 'paused' | 'completed' | 'failed'

  /** Current task */
  currentTask?: string

  /** Task history */
  taskHistory: string[]

  /** Agent memory/context */
  memory: Record<string, any>

  /** Creation timestamp */
  createdAt: string

  /** Last updated timestamp */
  updatedAt: string

  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'skipped'

/**
 * Notification type
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

/**
 * Notification
 */
export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  metadata?: Record<string, any>
}
