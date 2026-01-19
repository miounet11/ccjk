/**
 * Session Storage Module
 *
 * Provides persistent storage for session data with:
 * - JSON file-based storage
 * - Automatic cleanup of expired sessions
 * - Storage optimization and compression
 * - Backup and recovery mechanisms
 */

import type { Session } from './session-manager'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface StorageOptions {
  storageDir?: string
  maxSessions?: number
  autoCleanupDays?: number
  enableBackup?: boolean
  backupDir?: string
}

export interface StorageStats {
  totalSessions: number
  totalSize: number
  oldestSession?: Date
  newestSession?: Date
  averageHistoryLength: number
}

// ============================================================================
// Session Storage Class
// ============================================================================

export class SessionStorage {
  private storageDir: string
  private backupDir: string
  private maxSessions: number
  private autoCleanupDays: number
  private enableBackup: boolean

  constructor(options: StorageOptions = {}) {
    this.storageDir = options.storageDir || join(homedir(), '.ccjk', 'sessions')
    this.backupDir = options.backupDir || join(homedir(), '.ccjk', 'sessions-backup')
    this.maxSessions = options.maxSessions || 100
    this.autoCleanupDays = options.autoCleanupDays || 30
    this.enableBackup = options.enableBackup ?? true
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    if (!existsSync(this.storageDir)) {
      await mkdir(this.storageDir, { recursive: true })
    }

    if (this.enableBackup && !existsSync(this.backupDir)) {
      await mkdir(this.backupDir, { recursive: true })
    }
  }

  /**
   * Save session to storage
   */
  async save(session: Session): Promise<void> {
    await this.initialize()

    const sessionPath = join(this.storageDir, `${session.id}.json`)

    // Create backup if enabled and file exists
    if (this.enableBackup && existsSync(sessionPath)) {
      await this.createBackup(session.id)
    }

    // Serialize session data
    const sessionData = this.serializeSession(session)

    // Write to file
    await writeFile(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8')

    // Check if cleanup is needed
    await this.autoCleanup()
  }

  /**
   * Load session from storage
   */
  async load(sessionId: string): Promise<Session | null> {
    const sessionPath = join(this.storageDir, `${sessionId}.json`)

    if (!existsSync(sessionPath)) {
      return null
    }

    try {
      const content = await readFile(sessionPath, 'utf-8')
      const data = JSON.parse(content)
      return this.deserializeSession(data)
    }
    catch (error) {
      console.error(`Failed to load session ${sessionId}:`, error)

      // Try to restore from backup
      if (this.enableBackup) {
        return await this.restoreFromBackup(sessionId)
      }

      return null
    }
  }

  /**
   * Delete session from storage
   */
  async delete(sessionId: string): Promise<boolean> {
    const sessionPath = join(this.storageDir, `${sessionId}.json`)

    if (!existsSync(sessionPath)) {
      return false
    }

    try {
      // Create backup before deletion
      if (this.enableBackup) {
        await this.createBackup(sessionId)
      }

      await unlink(sessionPath)
      return true
    }
    catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error)
      return false
    }
  }

  /**
   * List all session IDs
   */
  async listSessionIds(): Promise<string[]> {
    await this.initialize()

    try {
      const files = await readdir(this.storageDir)
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
    }
    catch (error) {
      console.error('Failed to list sessions:', error)
      return []
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    const sessionIds = await this.listSessionIds()

    if (sessionIds.length === 0) {
      return {
        totalSessions: 0,
        totalSize: 0,
        averageHistoryLength: 0,
      }
    }

    let totalSize = 0
    let totalHistoryLength = 0
    let oldestDate: Date | undefined
    let newestDate: Date | undefined

    for (const sessionId of sessionIds) {
      const sessionPath = join(this.storageDir, `${sessionId}.json`)

      try {
        const stats = await stat(sessionPath)
        totalSize += stats.size

        const session = await this.load(sessionId)
        if (session) {
          totalHistoryLength += session.history.length

          if (!oldestDate || session.createdAt < oldestDate) {
            oldestDate = session.createdAt
          }

          if (!newestDate || session.createdAt > newestDate) {
            newestDate = session.createdAt
          }
        }
      }
      catch (error) {
        console.error(`Failed to get stats for session ${sessionId}:`, error)
      }
    }

    return {
      totalSessions: sessionIds.length,
      totalSize,
      oldestSession: oldestDate,
      newestSession: newestDate,
      averageHistoryLength: totalHistoryLength / sessionIds.length,
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanup(daysOld?: number): Promise<number> {
    const cutoffDays = daysOld ?? this.autoCleanupDays
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - cutoffDays)

    const sessionIds = await this.listSessionIds()
    let deletedCount = 0

    for (const sessionId of sessionIds) {
      const session = await this.load(sessionId)

      if (session && session.lastUsedAt < cutoffDate) {
        const deleted = await this.delete(sessionId)
        if (deleted) {
          deletedCount++
        }
      }
    }

    return deletedCount
  }

  /**
   * Automatic cleanup when max sessions exceeded
   */
  private async autoCleanup(): Promise<void> {
    const sessionIds = await this.listSessionIds()

    if (sessionIds.length <= this.maxSessions) {
      return
    }

    // Load all sessions and sort by last used date
    const sessions: Array<{ id: string, lastUsedAt: Date }> = []

    for (const sessionId of sessionIds) {
      const session = await this.load(sessionId)
      if (session) {
        sessions.push({ id: session.id, lastUsedAt: session.lastUsedAt })
      }
    }

    // Sort by last used (oldest first)
    sessions.sort((a, b) => a.lastUsedAt.getTime() - b.lastUsedAt.getTime())

    // Delete oldest sessions to get under limit
    const toDelete = sessions.length - this.maxSessions
    for (let i = 0; i < toDelete; i++) {
      await this.delete(sessions[i].id)
    }
  }

  /**
   * Create backup of session
   */
  private async createBackup(sessionId: string): Promise<void> {
    if (!this.enableBackup) {
      return
    }

    const sessionPath = join(this.storageDir, `${sessionId}.json`)
    const backupPath = join(this.backupDir, `${sessionId}-${Date.now()}.json`)

    if (!existsSync(sessionPath)) {
      return
    }

    try {
      const content = await readFile(sessionPath, 'utf-8')
      await writeFile(backupPath, content, 'utf-8')

      // Keep only last 5 backups per session
      await this.cleanupBackups(sessionId, 5)
    }
    catch (error) {
      console.error(`Failed to create backup for session ${sessionId}:`, error)
    }
  }

  /**
   * Restore session from backup
   */
  private async restoreFromBackup(sessionId: string): Promise<Session | null> {
    if (!this.enableBackup) {
      return null
    }

    try {
      const files = await readdir(this.backupDir)
      const backups = files
        .filter(f => f.startsWith(`${sessionId}-`) && f.endsWith('.json'))
        .sort()
        .reverse()

      if (backups.length === 0) {
        return null
      }

      // Try to restore from most recent backup
      const backupPath = join(this.backupDir, backups[0])
      const content = await readFile(backupPath, 'utf-8')
      const data = JSON.parse(content)

      return this.deserializeSession(data)
    }
    catch (error) {
      console.error(`Failed to restore session ${sessionId} from backup:`, error)
      return null
    }
  }

  /**
   * Clean up old backups
   */
  private async cleanupBackups(sessionId: string, keepCount: number): Promise<void> {
    try {
      const files = await readdir(this.backupDir)
      const backups = files
        .filter(f => f.startsWith(`${sessionId}-`) && f.endsWith('.json'))
        .sort()
        .reverse()

      // Delete old backups
      for (let i = keepCount; i < backups.length; i++) {
        const backupPath = join(this.backupDir, backups[i])
        await unlink(backupPath)
      }
    }
    catch (error) {
      console.error(`Failed to cleanup backups for session ${sessionId}:`, error)
    }
  }

  /**
   * Serialize session for storage
   */
  private serializeSession(session: Session): any {
    return {
      ...session,
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
      history: session.history.map(entry => ({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
      })),
    }
  }

  /**
   * Deserialize session from storage
   */
  private deserializeSession(data: any): Session {
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

  /**
   * Export all sessions
   */
  async exportAll(): Promise<Session[]> {
    const sessionIds = await this.listSessionIds()
    const sessions: Session[] = []

    for (const sessionId of sessionIds) {
      const session = await this.load(sessionId)
      if (session) {
        sessions.push(session)
      }
    }

    return sessions
  }

  /**
   * Import sessions
   */
  async importAll(sessions: Session[]): Promise<number> {
    let importedCount = 0

    for (const session of sessions) {
      try {
        await this.save(session)
        importedCount++
      }
      catch (error) {
        console.error(`Failed to import session ${session.id}:`, error)
      }
    }

    return importedCount
  }

  /**
   * Clear all sessions
   */
  async clear(): Promise<number> {
    const sessionIds = await this.listSessionIds()
    let deletedCount = 0

    for (const sessionId of sessionIds) {
      const deleted = await this.delete(sessionId)
      if (deleted) {
        deletedCount++
      }
    }

    return deletedCount
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let storageInstance: SessionStorage | null = null

/**
 * Get singleton storage instance
 */
export function getSessionStorage(options?: StorageOptions): SessionStorage {
  if (!storageInstance) {
    storageInstance = new SessionStorage(options)
  }
  return storageInstance
}

/**
 * Reset singleton instance (mainly for testing)
 */
export function resetSessionStorage(): void {
  storageInstance = null
}
