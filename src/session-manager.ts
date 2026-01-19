/**
 * Session Manager Module
 *
 * Provides comprehensive session management for CCJK including:
 * - Session creation and lifecycle management
 * - API provider and key management per session
 * - Conversation history tracking
 * - Session persistence and restoration
 */

import type { CodeToolType } from './constants'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SessionHistoryEntry {
  timestamp: Date
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens?: number
}

export interface Session {
  id: string
  name?: string
  provider?: string
  apiKey?: string
  apiUrl?: string
  model?: string
  codeType?: CodeToolType
  createdAt: Date
  lastUsedAt: Date
  history: SessionHistoryEntry[]
  metadata?: Record<string, any>
}

export interface SessionListOptions {
  sortBy?: 'name' | 'createdAt' | 'lastUsedAt'
  order?: 'asc' | 'desc'
  limit?: number
}

export interface SessionManagerOptions {
  sessionsDir?: string
  autoCleanupDays?: number
}

// ============================================================================
// Session Manager Class
// ============================================================================

export class SessionManager {
  private sessionsDir: string
  private autoCleanupDays: number

  constructor(options: SessionManagerOptions = {}) {
    this.sessionsDir = options.sessionsDir || join(homedir(), '.ccjk', 'sessions')
    this.autoCleanupDays = options.autoCleanupDays || 30
  }

  /**
   * Initialize sessions directory
   */
  private async ensureSessionsDir(): Promise<void> {
    if (!existsSync(this.sessionsDir)) {
      await mkdir(this.sessionsDir, { recursive: true })
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Get session file path
   */
  private getSessionPath(sessionId: string): string {
    return join(this.sessionsDir, `${sessionId}.json`)
  }

  /**
   * Create a new session
   */
  async createSession(
    name?: string,
    provider?: string,
    apiKey?: string,
    options?: {
      apiUrl?: string
      model?: string
      codeType?: CodeToolType
      metadata?: Record<string, any>
    },
  ): Promise<Session> {
    await this.ensureSessionsDir()

    const session: Session = {
      id: this.generateSessionId(),
      name,
      provider,
      apiKey,
      apiUrl: options?.apiUrl,
      model: options?.model,
      codeType: options?.codeType,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      history: [],
      metadata: options?.metadata,
    }

    await this.saveSession(session)
    return session
  }

  /**
   * Save session to storage
   */
  async saveSession(session: Session): Promise<void> {
    await this.ensureSessionsDir()

    const sessionPath = this.getSessionPath(session.id)
    const sessionData = {
      ...session,
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
      history: session.history.map(entry => ({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
      })),
    }

    await writeFile(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8')
  }

  /**
   * Load session by ID or name
   */
  async loadSession(nameOrId: string): Promise<Session | null> {
    await this.ensureSessionsDir()

    // Try to load by ID first
    let sessionPath = this.getSessionPath(nameOrId)

    if (!existsSync(sessionPath)) {
      // Try to find by name
      const sessions = await this.listSessions()
      const found = sessions.find(s => s.name === nameOrId)

      if (!found) {
        return null
      }

      sessionPath = this.getSessionPath(found.id)
    }

    try {
      const content = await readFile(sessionPath, 'utf-8')
      const data = JSON.parse(content)

      return {
        ...data,
        createdAt: new Date(data.createdAt),
        lastUsedAt: new Date(data.lastUsedAt),
        history: data.history.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        })),
      }
    }
    catch (error) {
      console.error(`Failed to load session ${nameOrId}:`, error)
      return null
    }
  }

  /**
   * List all sessions
   */
  async listSessions(options: SessionListOptions = {}): Promise<Session[]> {
    await this.ensureSessionsDir()

    try {
      const files = await readdir(this.sessionsDir)
      const sessionFiles = files.filter(f => f.endsWith('.json'))

      const sessions: Session[] = []
      for (const file of sessionFiles) {
        const sessionPath = join(this.sessionsDir, file)
        try {
          const content = await readFile(sessionPath, 'utf-8')
          const data = JSON.parse(content)

          sessions.push({
            ...data,
            createdAt: new Date(data.createdAt),
            lastUsedAt: new Date(data.lastUsedAt),
            history: data.history.map((entry: any) => ({
              ...entry,
              timestamp: new Date(entry.timestamp),
            })),
          })
        }
        catch (error) {
          console.error(`Failed to load session file ${file}:`, error)
        }
      }

      // Sort sessions
      const sortBy = options.sortBy || 'lastUsedAt'
      const order = options.order || 'desc'

      sessions.sort((a, b) => {
        let comparison = 0

        if (sortBy === 'name') {
          comparison = (a.name || a.id).localeCompare(b.name || b.id)
        }
        else if (sortBy === 'createdAt') {
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
        }
        else if (sortBy === 'lastUsedAt') {
          comparison = a.lastUsedAt.getTime() - b.lastUsedAt.getTime()
        }

        return order === 'asc' ? comparison : -comparison
      })

      // Apply limit
      if (options.limit && options.limit > 0) {
        return sessions.slice(0, options.limit)
      }

      return sessions
    }
    catch (error) {
      console.error('Failed to list sessions:', error)
      return []
    }
  }

  /**
   * Delete session by ID or name
   */
  async deleteSession(nameOrId: string): Promise<boolean> {
    const session = await this.loadSession(nameOrId)

    if (!session) {
      return false
    }

    const sessionPath = this.getSessionPath(session.id)

    try {
      const fs = await import('node:fs/promises')
      await fs.unlink(sessionPath)
      return true
    }
    catch (error) {
      console.error(`Failed to delete session ${nameOrId}:`, error)
      return false
    }
  }

  /**
   * Rename session
   */
  async renameSession(oldName: string, newName: string): Promise<boolean> {
    const session = await this.loadSession(oldName)

    if (!session) {
      return false
    }

    session.name = newName
    session.lastUsedAt = new Date()

    await this.saveSession(session)
    return true
  }

  /**
   * Add history entry to session
   */
  async addHistoryEntry(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    tokens?: number,
  ): Promise<boolean> {
    const session = await this.loadSession(sessionId)

    if (!session) {
      return false
    }

    session.history.push({
      timestamp: new Date(),
      role,
      content,
      tokens,
    })

    session.lastUsedAt = new Date()
    await this.saveSession(session)
    return true
  }

  /**
   * Update session metadata
   */
  async updateSession(
    sessionId: string,
    updates: Partial<Omit<Session, 'id' | 'createdAt' | 'history'>>,
  ): Promise<boolean> {
    const session = await this.loadSession(sessionId)

    if (!session) {
      return false
    }

    Object.assign(session, updates)
    session.lastUsedAt = new Date()

    await this.saveSession(session)
    return true
  }

  /**
   * Clean up old sessions (older than autoCleanupDays)
   */
  async cleanupOldSessions(): Promise<number> {
    const sessions = await this.listSessions()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.autoCleanupDays)

    let deletedCount = 0

    for (const session of sessions) {
      if (session.lastUsedAt < cutoffDate) {
        const deleted = await this.deleteSession(session.id)
        if (deleted) {
          deletedCount++
        }
      }
    }

    return deletedCount
  }

  /**
   * Get session statistics
   */
  async getStatistics(): Promise<{
    totalSessions: number
    totalHistoryEntries: number
    oldestSession?: Date
    newestSession?: Date
    mostRecentlyUsed?: Date
  }> {
    const sessions = await this.listSessions()

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalHistoryEntries: 0,
      }
    }

    const totalHistoryEntries = sessions.reduce((sum, s) => sum + s.history.length, 0)
    const sortedByCreated = [...sessions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const sortedByUsed = [...sessions].sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime())

    return {
      totalSessions: sessions.length,
      totalHistoryEntries,
      oldestSession: sortedByCreated[0]?.createdAt,
      newestSession: sortedByCreated[sortedByCreated.length - 1]?.createdAt,
      mostRecentlyUsed: sortedByUsed[0]?.lastUsedAt,
    }
  }

  /**
   * Export session to JSON
   */
  async exportSession(sessionId: string): Promise<string | null> {
    const session = await this.loadSession(sessionId)

    if (!session) {
      return null
    }

    return JSON.stringify(session, null, 2)
  }

  /**
   * Import session from JSON
   */
  async importSession(jsonData: string): Promise<Session | null> {
    try {
      const data = JSON.parse(jsonData)

      // Generate new ID to avoid conflicts
      const session: Session = {
        ...data,
        id: this.generateSessionId(),
        createdAt: new Date(data.createdAt),
        lastUsedAt: new Date(),
        history: data.history.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        })),
      }

      await this.saveSession(session)
      return session
    }
    catch (error) {
      console.error('Failed to import session:', error)
      return null
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let sessionManagerInstance: SessionManager | null = null

/**
 * Get singleton session manager instance
 */
export function getSessionManager(options?: SessionManagerOptions): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager(options)
  }
  return sessionManagerInstance
}

/**
 * Reset singleton instance (mainly for testing)
 */
export function resetSessionManager(): void {
  sessionManagerInstance = null
}
