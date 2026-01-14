/**
 * Storage manager for CCJK Context Compression System
 * Handles all persistent storage operations for sessions, logs, and summaries
 */

import type {
  CleanupResult,
  CurrentSessionPointer,
  FCLogEntry,
  FCLogQueryOptions,
  Session,
  SessionListOptions,
  SessionMeta,
  StorageStats,
} from './storage-types'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { createInterface } from 'node:readline'
import { dirname, join } from 'pathe'
import { getProjectIdentity } from './project-hash'

/**
 * Storage manager class
 * Provides atomic operations for session and log management
 */
export class StorageManager {
  private baseDir: string
  private sessionsDir: string
  private initialized = false

  constructor(baseDir?: string) {
    this.baseDir = baseDir || join(homedir(), '.ccjk', 'context')
    this.sessionsDir = join(this.baseDir, 'sessions')
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    // Create base directories
    await mkdir(this.baseDir, { recursive: true })
    await mkdir(this.sessionsDir, { recursive: true })

    this.initialized = true
  }

  /**
   * Create a new session
   *
   * @param projectPath - Absolute path to project directory
   * @param description - Optional session description
   * @returns Created session
   */
  async createSession(projectPath: string, description?: string): Promise<Session> {
    await this.initialize()

    // Get project identity
    const identity = await getProjectIdentity(projectPath)

    // Create session ID
    const sessionId = this.generateSessionId()

    // Create session directory structure
    const projectDir = join(this.sessionsDir, identity.hash)
    const sessionDir = join(projectDir, sessionId)

    await mkdir(sessionDir, { recursive: true })

    // Create session metadata
    const meta: SessionMeta = {
      id: sessionId,
      projectPath: identity.path,
      projectHash: identity.hash,
      startTime: new Date().toISOString(),
      status: 'active',
      tokenCount: 0,
      summaryTokens: 0,
      fcCount: 0,
      version: this.getCcjkVersion(),
      description,
      lastUpdated: new Date().toISOString(),
    }

    // Write metadata
    const metaPath = join(sessionDir, 'meta.json')
    await this.writeJsonAtomic(metaPath, meta)

    // Create empty FC log file
    const fcLogPath = join(sessionDir, 'fc-log.jsonl')
    await writeFile(fcLogPath, '', 'utf-8')

    // Update current session pointer
    await this.setCurrentSession(identity.hash, sessionId)

    const session: Session = {
      meta,
      path: sessionDir,
      fcLogPath,
      summaryPath: join(sessionDir, 'summary.md'),
    }

    return session
  }

  /**
   * Get session by ID
   *
   * @param sessionId - Session identifier
   * @param projectHash - Optional project hash for faster lookup
   * @returns Session or null if not found
   */
  async getSession(sessionId: string, projectHash?: string): Promise<Session | null> {
    await this.initialize()

    try {
      let sessionDir: string

      if (projectHash) {
        // Direct lookup
        sessionDir = join(this.sessionsDir, projectHash, sessionId)
      }
      else {
        // Search all project directories
        const projectDirs = await readdir(this.sessionsDir)

        for (const dir of projectDirs) {
          const candidateDir = join(this.sessionsDir, dir, sessionId)
          if (existsSync(candidateDir)) {
            sessionDir = candidateDir
            break
          }
        }

        if (!sessionDir!) {
          return null
        }
      }

      if (!existsSync(sessionDir)) {
        return null
      }

      // Read metadata
      const metaPath = join(sessionDir, 'meta.json')
      const meta = await this.readJson<SessionMeta>(metaPath)

      if (!meta) {
        return null
      }

      return {
        meta,
        path: sessionDir,
        fcLogPath: join(sessionDir, 'fc-log.jsonl'),
        summaryPath: join(sessionDir, 'summary.md'),
      }
    }
    catch {
      return null
    }
  }

  /**
   * Update session metadata
   *
   * @param session - Session with updated metadata
   */
  async updateSession(session: Session): Promise<void> {
    await this.initialize()

    // Update lastUpdated timestamp
    session.meta.lastUpdated = new Date().toISOString()

    // Write metadata atomically
    const metaPath = join(session.path, 'meta.json')
    await this.writeJsonAtomic(metaPath, session.meta)
  }

  /**
   * Complete a session
   *
   * @param sessionId - Session identifier
   * @param projectHash - Optional project hash
   */
  async completeSession(sessionId: string, projectHash?: string): Promise<boolean> {
    const session = await this.getSession(sessionId, projectHash)

    if (!session) {
      return false
    }

    session.meta.status = 'completed'
    session.meta.endTime = new Date().toISOString()

    await this.updateSession(session)
    return true
  }

  /**
   * Archive a session
   *
   * @param sessionId - Session identifier
   * @param projectHash - Optional project hash
   */
  async archiveSession(sessionId: string, projectHash?: string): Promise<boolean> {
    const session = await this.getSession(sessionId, projectHash)

    if (!session) {
      return false
    }

    session.meta.status = 'archived'
    await this.updateSession(session)
    return true
  }

  /**
   * List sessions with optional filtering
   *
   * @param options - Query options
   * @returns Array of session metadata
   */
  async listSessions(options?: SessionListOptions): Promise<SessionMeta[]> {
    await this.initialize()

    const sessions: SessionMeta[] = []

    try {
      // Determine which project directories to scan
      const projectDirs = options?.projectHash
        ? [options.projectHash]
        : await readdir(this.sessionsDir)

      for (const projectDir of projectDirs) {
        const projectPath = join(this.sessionsDir, projectDir)

        if (!existsSync(projectPath)) {
          continue
        }

        const sessionDirs = await readdir(projectPath)

        for (const sessionDir of sessionDirs) {
          // Skip current.json pointer file
          if (sessionDir === 'current.json') {
            continue
          }

          const metaPath = join(projectPath, sessionDir, 'meta.json')

          if (!existsSync(metaPath)) {
            continue
          }

          const meta = await this.readJson<SessionMeta>(metaPath)

          if (!meta) {
            continue
          }

          // Apply filters
          if (options?.status && meta.status !== options.status) {
            continue
          }

          sessions.push(meta)
        }
      }

      // Apply sorting
      if (options?.sortBy) {
        const sortKey = options.sortBy
        const order = options.sortOrder || 'desc'

        sessions.sort((a, b) => {
          const aVal = a[sortKey]
          const bVal = b[sortKey]

          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return order === 'asc'
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal)
          }

          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return order === 'asc' ? aVal - bVal : bVal - aVal
          }

          return 0
        })
      }

      // Apply limit
      if (options?.limit && options.limit > 0) {
        return sessions.slice(0, options.limit)
      }

      return sessions
    }
    catch {
      return []
    }
  }

  /**
   * Append function call log entry
   *
   * @param sessionId - Session identifier
   * @param entry - FC log entry
   * @param projectHash - Optional project hash
   */
  async appendFCLog(
    sessionId: string,
    entry: FCLogEntry,
    projectHash?: string,
  ): Promise<void> {
    await this.initialize()

    const session = await this.getSession(sessionId, projectHash)

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    // Append to JSONL file (one JSON object per line)
    const line = `${JSON.stringify(entry)}\n`
    await writeFile(session.fcLogPath, line, { flag: 'a', encoding: 'utf-8' })

    // Update session metadata
    session.meta.fcCount++
    session.meta.tokenCount += entry.tokens
    await this.updateSession(session)
  }

  /**
   * Get function call logs as async generator
   * Efficiently streams large log files
   *
   * @param sessionId - Session identifier
   * @param options - Query options
   * @param projectHash - Optional project hash
   */
  async* getFCLogs(
    sessionId: string,
    options?: FCLogQueryOptions,
    projectHash?: string,
  ): AsyncGenerator<FCLogEntry> {
    await this.initialize()

    const session = await this.getSession(sessionId, projectHash)

    if (!session || !existsSync(session.fcLogPath)) {
      return
    }

    const fileStream = createReadStream(session.fcLogPath, { encoding: 'utf-8' })
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    })

    let count = 0

    for await (const line of rl) {
      if (!line.trim()) {
        continue
      }

      try {
        const entry = JSON.parse(line) as FCLogEntry

        // Apply filters
        if (options?.startTime && entry.ts < options.startTime) {
          continue
        }

        if (options?.endTime && entry.ts > options.endTime) {
          continue
        }

        if (options?.functionName && entry.fc !== options.functionName) {
          continue
        }

        if (options?.status && entry.status !== options.status) {
          continue
        }

        yield entry

        count++

        // Apply limit
        if (options?.limit && count >= options.limit) {
          break
        }
      }
      catch {
        // Skip invalid lines
        continue
      }
    }
  }

  /**
   * Get all FC logs as array
   * Use getFCLogs() generator for large files
   *
   * @param sessionId - Session identifier
   * @param options - Query options
   * @param projectHash - Optional project hash
   */
  async getFCLogsArray(
    sessionId: string,
    options?: FCLogQueryOptions,
    projectHash?: string,
  ): Promise<FCLogEntry[]> {
    const logs: FCLogEntry[] = []

    for await (const entry of this.getFCLogs(sessionId, options, projectHash)) {
      logs.push(entry)
    }

    return logs
  }

  /**
   * Save session summary
   *
   * @param sessionId - Session identifier
   * @param summary - Markdown summary content
   * @param projectHash - Optional project hash
   */
  async saveSummary(
    sessionId: string,
    summary: string,
    projectHash?: string,
  ): Promise<void> {
    await this.initialize()

    const session = await this.getSession(sessionId, projectHash)

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    await this.writeFileAtomic(session.summaryPath, summary)
  }

  /**
   * Get session summary
   *
   * @param sessionId - Session identifier
   * @param projectHash - Optional project hash
   * @returns Summary content or null if not found
   */
  async getSummary(sessionId: string, projectHash?: string): Promise<string | null> {
    await this.initialize()

    const session = await this.getSession(sessionId, projectHash)

    if (!session || !existsSync(session.summaryPath)) {
      return null
    }

    try {
      return await readFile(session.summaryPath, 'utf-8')
    }
    catch {
      return null
    }
  }

  /**
   * Get current session for a project
   *
   * @param projectHash - Project hash identifier
   * @returns Current session or null
   */
  async getCurrentSession(projectHash: string): Promise<Session | null> {
    await this.initialize()

    const pointerPath = join(this.sessionsDir, projectHash, 'current.json')

    if (!existsSync(pointerPath)) {
      return null
    }

    try {
      const pointer = await this.readJson<CurrentSessionPointer>(pointerPath)

      if (!pointer) {
        return null
      }

      return this.getSession(pointer.sessionId, projectHash)
    }
    catch {
      return null
    }
  }

  /**
   * Set current session for a project
   *
   * @param projectHash - Project hash identifier
   * @param sessionId - Session identifier
   */
  async setCurrentSession(projectHash: string, sessionId: string): Promise<void> {
    await this.initialize()

    const projectDir = join(this.sessionsDir, projectHash)
    await mkdir(projectDir, { recursive: true })

    const pointer: CurrentSessionPointer = {
      sessionId,
      lastUpdated: new Date().toISOString(),
    }

    const pointerPath = join(projectDir, 'current.json')
    await this.writeJsonAtomic(pointerPath, pointer)
  }

  /**
   * Delete a session
   *
   * @param sessionId - Session identifier
   * @param projectHash - Optional project hash
   * @returns True if deleted successfully
   */
  async deleteSession(sessionId: string, projectHash?: string): Promise<boolean> {
    await this.initialize()

    const session = await this.getSession(sessionId, projectHash)

    if (!session) {
      return false
    }

    try {
      // Delete session directory recursively
      await this.deleteDirectory(session.path)
      return true
    }
    catch {
      return false
    }
  }

  /**
   * Clean up old sessions
   *
   * @param maxAge - Maximum age in milliseconds
   * @returns Cleanup result
   */
  async cleanOldSessions(maxAge: number): Promise<CleanupResult> {
    await this.initialize()

    const startTime = Date.now()
    const cutoffTime = new Date(Date.now() - maxAge).toISOString()

    const allSessions = await this.listSessions()
    const removedSessionIds: string[] = []
    let bytesFreed = 0

    for (const meta of allSessions) {
      // Skip active sessions
      if (meta.status === 'active') {
        continue
      }

      // Check if session is old enough
      const sessionTime = meta.endTime || meta.lastUpdated
      if (sessionTime >= cutoffTime) {
        continue
      }

      // Get session size
      const session = await this.getSession(meta.id, meta.projectHash)
      if (session) {
        const size = await this.getDirectorySize(session.path)
        bytesFreed += size

        // Delete session
        const deleted = await this.deleteSession(meta.id, meta.projectHash)
        if (deleted) {
          removedSessionIds.push(meta.id)
        }
      }
    }

    return {
      sessionsRemoved: removedSessionIds.length,
      bytesFreed,
      removedSessionIds,
      duration: Date.now() - startTime,
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    await this.initialize()

    const allSessions = await this.listSessions()

    const stats: StorageStats = {
      totalSessions: allSessions.length,
      activeSessions: 0,
      completedSessions: 0,
      archivedSessions: 0,
      totalSize: 0,
      totalTokens: 0,
      totalFCs: 0,
      pendingSyncItems: 0,
    }

    let oldestTime: string | undefined
    let newestTime: string | undefined

    for (const meta of allSessions) {
      // Count by status
      if (meta.status === 'active')
        stats.activeSessions++
      else if (meta.status === 'completed')
        stats.completedSessions++
      else if (meta.status === 'archived')
        stats.archivedSessions++

      // Accumulate totals
      stats.totalTokens += meta.tokenCount
      stats.totalFCs += meta.fcCount

      // Track oldest/newest
      if (!oldestTime || meta.startTime < oldestTime) {
        oldestTime = meta.startTime
      }
      if (!newestTime || meta.startTime > newestTime) {
        newestTime = meta.startTime
      }
    }

    stats.oldestSession = oldestTime
    stats.newestSession = newestTime

    // Calculate total size
    try {
      stats.totalSize = await this.getDirectorySize(this.baseDir)
    }
    catch {
      stats.totalSize = 0
    }

    return stats
  }

  /**
   * Write JSON file atomically
   * Writes to temp file first, then renames
   */
  private async writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
    const content = JSON.stringify(data, null, 2)
    await this.writeFileAtomic(filePath, content)
  }

  /**
   * Write file atomically
   * Writes to temp file first, then renames
   */
  private async writeFileAtomic(filePath: string, content: string): Promise<void> {
    const dir = dirname(filePath)
    const tempPath = join(tmpdir(), `ccjk-${Date.now()}-${Math.random().toString(36).substring(2)}.tmp`)

    try {
      // Write to temp file
      await writeFile(tempPath, content, 'utf-8')

      // Ensure target directory exists
      await mkdir(dir, { recursive: true })

      // Atomic rename
      await rename(tempPath, filePath)
    }
    catch (error) {
      // Clean up temp file on error
      try {
        await unlink(tempPath)
      }
      catch {
        // Ignore cleanup errors
      }
      throw error
    }
  }

  /**
   * Read JSON file safely
   */
  private async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const content = await readFile(filePath, 'utf-8')
      return JSON.parse(content) as T
    }
    catch {
      return null
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `session-${timestamp}-${random}`
  }

  /**
   * Get CCJK version
   */
  private getCcjkVersion(): string {
    try {
      // Try to read package.json synchronously
      const pkgPath = join(__dirname, '../../../package.json')
      if (existsSync(pkgPath)) {
        const pkgContent = readFileSync(pkgPath, 'utf-8')
        const pkg = JSON.parse(pkgContent)
        return pkg.version || 'unknown'
      }
    }
    catch {
      // Fallback
    }
    return 'unknown'
  }

  /**
   * Get directory size recursively
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0

    try {
      const entries = await readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name)

        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath)
        }
        else if (entry.isFile()) {
          const stats = await stat(fullPath)
          totalSize += stats.size
        }
      }
    }
    catch {
      // Ignore errors
    }

    return totalSize
  }

  /**
   * Delete directory recursively
   */
  private async deleteDirectory(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      return
    }

    const entries = await readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)

      if (entry.isDirectory()) {
        await this.deleteDirectory(fullPath)
      }
      else {
        await unlink(fullPath)
      }
    }

    // Remove the directory itself
    const fsp = await import('node:fs/promises')
    await fsp.rm(dirPath, { recursive: true })
  }
}

/**
 * Create a new storage manager instance
 *
 * @param baseDir - Optional base directory for storage
 * @returns Storage manager instance
 */
export function createStorageManager(baseDir?: string): StorageManager {
  return new StorageManager(baseDir)
}

/**
 * Global storage manager instance
 */
let globalStorageManager: StorageManager | null = null

/**
 * Get global storage manager instance
 */
export function getStorageManager(): StorageManager {
  if (!globalStorageManager) {
    globalStorageManager = new StorageManager()
  }
  return globalStorageManager
}
