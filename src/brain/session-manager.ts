/**
 * Enhanced Session Manager for CCJK v3.8
 *
 * Provides comprehensive session management including:
 * - Named session capability with Git branch association
 * - Session persistence to ~/.claude/sessions/
 * - Session resume by name or ID
 * - Git branch filtering and forked session grouping
 * - Fork point tracking for session relationships
 */

import type { CodeToolType } from '../constants'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import * as path from 'node:path'
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

export interface GitInfo {
  branch?: string
  commitHash?: string
  forkPoint?: string // Commit hash where this session was forked from another
  remoteUrl?: string
  isDetached?: boolean
  rootPath?: string // Git repository root path
}

export interface SessionMetadata {
  tags?: string[]
  color?: string // For visual identification in UI
  pinned?: boolean
  archived?: boolean
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
  gitInfo?: GitInfo
  metadata?: SessionMetadata
  forkedFrom?: string // Parent session ID if forked
  forks?: string[] // IDs of sessions forked from this one
}

export interface SessionListOptions {
  sortBy?: 'name' | 'createdAt' | 'lastUsedAt'
  order?: 'asc' | 'desc'
  limit?: number
  branch?: string // Filter by Git branch
  includeArchived?: boolean
}

export interface SessionManagerOptions {
  sessionsDir?: string
  autoCleanupDays?: number
}

export interface SessionForkOptions {
  name?: string
  branch?: string // New branch name if creating a new branch
  copyHistory?: boolean
}

// ============================================================================
// Session Manager Class
// ============================================================================

export class SessionManager {
  private sessionsDir: string
  private autoCleanupDays: number

  constructor(options: SessionManagerOptions = {}) {
    this.sessionsDir = options.sessionsDir || join(homedir(), '.claude', 'sessions')
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
   * Get current Git information
   */
  private getGitInfo(): GitInfo | undefined {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim()

      const commitHash = execSync('git rev-parse HEAD', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim()

      let remoteUrl: string | undefined
      try {
        remoteUrl = execSync('git config --get remote.origin.url', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        }).trim() || undefined
      }
      catch {
        // No remote configured
      }

      return {
        branch: branch === 'HEAD' ? undefined : branch,
        commitHash,
        remoteUrl,
        isDetached: branch === 'HEAD',
      }
    }
    catch {
      return undefined
    }
  }

  /**
   * Create a new session with optional naming
   */
  async createSession(
    name?: string,
    provider?: string,
    apiKey?: string,
    options?: {
      apiUrl?: string
      model?: string
      codeType?: CodeToolType
      metadata?: SessionMetadata
      gitInfo?: GitInfo
    },
  ): Promise<Session> {
    await this.ensureSessionsDir()

    const gitInfo = options?.gitInfo || this.getGitInfo()

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
      gitInfo,
      metadata: options?.metadata,
      forks: [],
    }

    await this.saveSession(session)
    return session
  }

  /**
   * Fork an existing session
   * Creates a new session with a copy of the parent's history and metadata
   */
  async forkSession(
    parentId: string,
    options: SessionForkOptions = {},
  ): Promise<Session | null> {
    const parent = await this.loadSession(parentId)
    if (!parent) {
      return null
    }

    await this.ensureSessionsDir()

    const gitInfo = this.getGitInfo()

    const forkedSession: Session = {
      id: this.generateSessionId(),
      name: options.name || `${parent.name || parent.id} (fork)`,
      provider: parent.provider,
      apiKey: parent.apiKey,
      apiUrl: parent.apiUrl,
      model: parent.model,
      codeType: parent.codeType,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      history: options.copyHistory ? [...parent.history] : [],
      gitInfo: options.branch
        ? { ...gitInfo, branch: options.branch }
        : gitInfo,
      metadata: {
        ...parent.metadata,
        tags: [...(parent.metadata?.tags || []), 'fork'],
      },
      forkedFrom: parent.id,
      forks: [],
    }

    // Track fork point in Git info
    if (parent.gitInfo?.commitHash) {
      forkedSession.gitInfo = {
        ...forkedSession.gitInfo,
        forkPoint: parent.gitInfo.commitHash,
      }
    }

    // Update parent's fork list
    if (!parent.forks) {
      parent.forks = []
    }
    parent.forks.push(forkedSession.id)
    await this.saveSession(parent)

    await this.saveSession(forkedSession)
    return forkedSession
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
   * List all sessions with optional filtering
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

          const session: Session = {
            ...data,
            createdAt: new Date(data.createdAt),
            lastUsedAt: new Date(data.lastUsedAt),
            history: data.history.map((entry: any) => ({
              ...entry,
              timestamp: new Date(entry.timestamp),
            })),
          }

          // Filter by archived status
          if (!options.includeArchived && session.metadata?.archived) {
            continue
          }

          // Filter by Git branch
          if (options.branch && session.gitInfo?.branch !== options.branch) {
            continue
          }

          sessions.push(session)
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
          // Pinned sessions always come first
          if (a.metadata?.pinned && !b.metadata?.pinned) {
            return -1
          }
          if (!a.metadata?.pinned && b.metadata?.pinned) {
            return 1
          }
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
   * List sessions grouped by Git branch
   */
  async listSessionsByBranch(): Promise<Map<string, Session[]>> {
    const sessions = await this.listSessions()
    const branchMap = new Map<string, Session[]>()

    for (const session of sessions) {
      const branch = session.gitInfo?.branch || 'no-branch'

      if (!branchMap.has(branch)) {
        branchMap.set(branch, [])
      }

      branchMap.get(branch)!.push(session)
    }

    return branchMap
  }

  /**
   * List forked sessions grouped by parent
   */
  async listForkedSessions(): Promise<Map<string, Session[]>> {
    const sessions = await this.listSessions({ includeArchived: true })
    const forkMap = new Map<string, Session[]>()

    for (const session of sessions) {
      if (session.forkedFrom) {
        if (!forkMap.has(session.forkedFrom)) {
          forkMap.set(session.forkedFrom, [])
        }

        forkMap.get(session.forkedFrom)!.push(session)
      }
    }

    return forkMap
  }

  /**
   * Delete session by ID or name
   */
  async deleteSession(nameOrId: string): Promise<boolean> {
    const session = await this.loadSession(nameOrId)

    if (!session) {
      return false
    }

    // Remove from parent's fork list
    if (session.forkedFrom) {
      const parent = await this.loadSession(session.forkedFrom)
      if (parent?.forks) {
        parent.forks = parent.forks.filter(id => id !== session.id)
        await this.saveSession(parent)
      }
    }

    const sessionPath = this.getSessionPath(session.id)

    try {
      await unlink(sessionPath)
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
   * Pin/unpin a session
   */
  async togglePin(sessionId: string, pinned?: boolean): Promise<boolean> {
    const session = await this.loadSession(sessionId)

    if (!session) {
      return false
    }

    session.metadata = session.metadata || {}
    session.metadata.pinned = pinned ?? !session.metadata.pinned
    session.lastUsedAt = new Date()

    await this.saveSession(session)
    return true
  }

  /**
   * Archive/unarchive a session
   */
  async toggleArchive(sessionId: string, archived?: boolean): Promise<boolean> {
    const session = await this.loadSession(sessionId)

    if (!session) {
      return false
    }

    session.metadata = session.metadata || {}
    session.metadata.archived = archived ?? !session.metadata.archived
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
   * Search sessions by content or metadata
   */
  async searchSessions(query: string): Promise<Session[]> {
    const sessions = await this.listSessions()
    const lowerQuery = query.toLowerCase()

    return sessions.filter(session =>
      session.name?.toLowerCase().includes(lowerQuery)
      || session.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      || session.history.some(entry =>
        entry.content.toLowerCase().includes(lowerQuery),
      ),
    )
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
    pinnedCount: number
    archivedCount: number
    forkedCount: number
  }> {
    const sessions = await this.listSessions({ includeArchived: true })

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalHistoryEntries: 0,
        pinnedCount: 0,
        archivedCount: 0,
        forkedCount: 0,
      }
    }

    const totalHistoryEntries = sessions.reduce((sum, s) => sum + s.history.length, 0)
    const sortedByCreated = [...sessions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const sortedByUsed = [...sessions].sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime())

    const pinnedCount = sessions.filter(s => s.metadata?.pinned).length
    const archivedCount = sessions.filter(s => s.metadata?.archived).length
    const forkedCount = sessions.filter(s => s.forkedFrom).length

    return {
      totalSessions: sessions.length,
      totalHistoryEntries,
      oldestSession: sortedByCreated[0]?.createdAt,
      newestSession: sortedByCreated[sortedByCreated.length - 1]?.createdAt,
      mostRecentlyUsed: sortedByUsed[0]?.lastUsedAt,
      pinnedCount,
      archivedCount,
      forkedCount,
    }
  }

  /**
   * Clean up old sessions (older than autoCleanupDays)
   * Preserves pinned sessions
   */
  async cleanupOldSessions(): Promise<number> {
    const sessions = await this.listSessions({ includeArchived: true })
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.autoCleanupDays)

    let deletedCount = 0

    for (const session of sessions) {
      // Skip pinned sessions
      if (session.metadata?.pinned) {
        continue
      }

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
        forks: [],
      }

      await this.saveSession(session)
      return session
    }
    catch (error) {
      console.error('Failed to import session:', error)
      return null
    }
  }

  /**
   * Get active Git branches in the repository
   */
  async getGitBranches(): Promise<string[]> {
    try {
      const branches = execSync('git branch --format \'%(refname:short)\'', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      })

      return branches.trim().split('\n').filter(Boolean)
    }
    catch {
      return []
    }
  }

  /**
   * Get session by Git branch
   */
  async getSessionsByBranch(branch: string): Promise<Session[]> {
    return this.listSessions({ branch, sortBy: 'lastUsedAt', order: 'desc' })
  }

  /**
   * Update session's Git information
   */
  async updateGitInfo(sessionId: string): Promise<boolean> {
    const session = await this.loadSession(sessionId)

    if (!session) {
      return false
    }

    session.gitInfo = this.getGitInfo()
    session.lastUsedAt = new Date()

    await this.saveSession(session)
    return true
  }

  /**
   * Merge sessions (combine history from multiple sessions)
   */
  async mergeSessions(sourceIds: string[], targetName?: string): Promise<Session | null> {
    const sources = await Promise.all(
      sourceIds.map(id => this.loadSession(id)),
    )

    const validSources = sources.filter((s): s is Session => s !== null)

    if (validSources.length === 0) {
      return null
    }

    const mergedSession = await this.createSession(
      targetName || `Merged ${validSources.length} sessions`,
      validSources[0].provider,
      validSources[0].apiKey,
      {
        apiUrl: validSources[0].apiUrl,
        model: validSources[0].model,
        codeType: validSources[0].codeType,
        metadata: {
          tags: ['merged'],
        },
      },
    )

    // Combine all histories, sorted by timestamp
    const allHistory = validSources.flatMap(s => s.history)
    allHistory.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    mergedSession.history = allHistory
    await this.saveSession(mergedSession)

    return mergedSession
  }
}

// ============================================================================
// Cross-Session Recovery
// ============================================================================

/**
 * Recovery checkpoint data
 */
export interface RecoveryCheckpoint {
  sessionId: string
  timestamp: Date
  historyLength: number
  lastMessagePreview: string
  contextTokens: number
  gitBranch?: string
  workingDirectory: string
}

/**
 * Cross-session recovery manager
 *
 * Provides crash recovery and session continuity features.
 */
export class CrossSessionRecovery {
  private sessionManager: SessionManager
  private checkpointFile: string
  private maxCheckpoints = 10

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager
    this.checkpointFile = path.join(sessionManager['sessionsDir'], '.recovery-checkpoints.json')
  }

  /**
   * Create a recovery checkpoint
   */
  async createCheckpoint(session: Session, contextTokens: number = 0): Promise<void> {
    const checkpoint: RecoveryCheckpoint = {
      sessionId: session.id,
      timestamp: new Date(),
      historyLength: session.history.length,
      lastMessagePreview: this.getLastMessagePreview(session),
      contextTokens,
      gitBranch: session.gitInfo?.branch,
      workingDirectory: session.gitInfo?.rootPath || process.cwd(),
    }

    const checkpoints = await this.loadCheckpoints()
    checkpoints.unshift(checkpoint)

    // Keep only recent checkpoints
    const trimmed = checkpoints.slice(0, this.maxCheckpoints)

    await fs.writeFile(
      this.checkpointFile,
      JSON.stringify(trimmed, null, 2),
      'utf-8',
    )
  }

  /**
   * Get last message preview
   */
  private getLastMessagePreview(session: Session): string {
    const lastEntry = session.history[session.history.length - 1]
    if (!lastEntry) {
      return '(empty session)'
    }

    const preview = lastEntry.content.slice(0, 100)
    return preview.length < lastEntry.content.length ? `${preview}...` : preview
  }

  /**
   * Load recovery checkpoints
   */
  async loadCheckpoints(): Promise<RecoveryCheckpoint[]> {
    try {
      const data = await fs.readFile(this.checkpointFile, 'utf-8')
      const checkpoints = JSON.parse(data)
      return checkpoints.map((cp: any) => ({
        ...cp,
        timestamp: new Date(cp.timestamp),
      }))
    }
    catch {
      return []
    }
  }

  /**
   * Get the most recent checkpoint
   */
  async getLatestCheckpoint(): Promise<RecoveryCheckpoint | null> {
    const checkpoints = await this.loadCheckpoints()
    return checkpoints[0] || null
  }

  /**
   * Get checkpoints for a specific session
   */
  async getSessionCheckpoints(sessionId: string): Promise<RecoveryCheckpoint[]> {
    const checkpoints = await this.loadCheckpoints()
    return checkpoints.filter(cp => cp.sessionId === sessionId)
  }

  /**
   * Recover session from checkpoint
   */
  async recoverFromCheckpoint(checkpoint: RecoveryCheckpoint): Promise<Session | null> {
    return this.sessionManager.loadSession(checkpoint.sessionId)
  }

  /**
   * Find recoverable sessions (sessions with recent activity)
   */
  async findRecoverableSessions(maxAgeHours: number = 24): Promise<Session[]> {
    const sessions = await this.sessionManager.listSessions({
      sortBy: 'lastUsedAt',
      order: 'desc',
    })

    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - maxAgeHours)

    return sessions.filter(s => s.lastUsedAt >= cutoff)
  }

  /**
   * Auto-recover: Find the best session to resume
   */
  async autoRecover(): Promise<Session | null> {
    // First, try the latest checkpoint
    const latestCheckpoint = await this.getLatestCheckpoint()

    if (latestCheckpoint) {
      const session = await this.recoverFromCheckpoint(latestCheckpoint)
      if (session) {
        return session
      }
    }

    // Fall back to most recently used session
    const recentSessions = await this.findRecoverableSessions(1) // Last hour

    if (recentSessions.length > 0) {
      return recentSessions[0]
    }

    return null
  }

  /**
   * Clear all checkpoints
   */
  async clearCheckpoints(): Promise<void> {
    try {
      await fs.unlink(this.checkpointFile)
    }
    catch {
      // File doesn't exist, ignore
    }
  }

  /**
   * Get recovery status
   */
  async getRecoveryStatus(): Promise<{
    hasCheckpoints: boolean
    checkpointCount: number
    latestCheckpoint: RecoveryCheckpoint | null
    recoverableSessions: number
  }> {
    const checkpoints = await this.loadCheckpoints()
    const recoverableSessions = await this.findRecoverableSessions(24)

    return {
      hasCheckpoints: checkpoints.length > 0,
      checkpointCount: checkpoints.length,
      latestCheckpoint: checkpoints[0] || null,
      recoverableSessions: recoverableSessions.length,
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let sessionManagerInstance: SessionManager | null = null
let crossSessionRecoveryInstance: CrossSessionRecovery | null = null

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
 * Get singleton cross-session recovery instance
 */
export function getCrossSessionRecovery(): CrossSessionRecovery {
  if (!crossSessionRecoveryInstance) {
    crossSessionRecoveryInstance = new CrossSessionRecovery(getSessionManager())
  }
  return crossSessionRecoveryInstance
}

/**
 * Reset singleton instance (mainly for testing)
 */
export function resetSessionManager(): void {
  sessionManagerInstance = null
  crossSessionRecoveryInstance = null
}
