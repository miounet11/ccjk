/**
 * History Management System Types
 * 历史管理系统类型定义
 *
 * @version 8.0.0
 * @module history
 */

/**
 * History entry type
 */
export type HistoryEntryType = 'command' | 'prompt' | 'session'

/**
 * History entry interface
 */
export interface HistoryEntry {
  id: string
  type: HistoryEntryType
  content: string
  timestamp: string
  sessionId?: string
  metadata?: Record<string, any>
}

/**
 * History search options
 */
export interface HistorySearchOptions {
  type?: HistoryEntryType
  query?: string
  sessionId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

/**
 * History statistics
 */
export interface HistoryStats {
  total: number
  byType: Record<HistoryEntryType, number>
  mostUsedCommands: Array<{ command: string, count: number }>
  recentSessions: string[]
}

/**
 * History manager options
 */
export interface HistoryManagerOptions {
  storageType: 'local' | 'cloud'
  cloudEndpoint?: string
  maxSize?: number
  enableSync?: boolean
}
