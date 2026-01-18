/**
 * Shared types for CCJK Ink components
 */

export interface Session {
  id: string
  name: string
  status: 'running' | 'waiting' | 'stopped' | 'error'
  startTime: Date
  lastActivity: Date
  agentCount: number
  taskCount: number
}

export interface Agent {
  id: string
  role: string
  status: 'idle' | 'working' | 'waiting' | 'error' | 'completed'
  currentTask?: string
  progress: number
  startTime: Date
  completedTasks: number
  totalTasks: number
}

export interface LogEntry {
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'debug' | 'success'
  source: string
  message: string
}

export interface ProgressItem {
  id: string
  label: string
  current: number
  total: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
}
