/**
 * Session Management Enhancements
 * 会话管理增强
 *
 * @version 8.0.0
 * @module session-manager
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { spawn } from 'node:child_process'

/**
 * Session metadata
 */
export interface SessionMetadata {
  id: string
  name?: string
  parentId?: string
  createdAt: string
  updatedAt: string
  forkCount: number
  remoteUrl?: string
  commitHash?: string
}

/**
 * Session data
 */
export interface Session {
  metadata: SessionMetadata
  context: Record<string, any>
  history: any[]
}

/**
 * Session snapshot
 */
export interface SessionSnapshot {
  id: string
  timestamp: string
  description?: string
}

/**
 * Enhanced Session Manager
 */
export class SessionManager {
  private sessionsPath: string
  private snapshotsPath: string
  private currentSessionId?: string
  private cloudEndpoint?: string

  constructor(cloudEndpoint?: string) {
    this.sessionsPath = path.join(os.homedir(), '.claude', 'sessions')
    this.snapshotsPath = path.join(this.sessionsPath, 'snapshots')
    this.cloudEndpoint = cloudEndpoint
  }

  /**
   * Initialize session manager
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.sessionsPath, { recursive: true })
    await fs.mkdir(this.snapshotsPath, { recursive: true })
  }

  /**
   * Save session with optional name
   */
  async saveSession(name?: string): Promise<SessionMetadata> {
    if (!this.currentSessionId) {
      this.currentSessionId = this.generateSessionId()
    }

    const sessionPath = path.join(this.sessionsPath, `${this.currentSessionId}.json`)

    let session: Session
    try {
      const data = await fs.readFile(sessionPath, 'utf-8')
      session = JSON.parse(data)
    } catch {
      session = {
        metadata: {
          id: this.currentSessionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          forkCount: 0,
        },
        context: {},
        history: [],
      }
    }

    // Update metadata
    session.metadata.id = this.currentSessionId
    session.metadata.updatedAt = new Date().toISOString()
    if (name) {
      session.metadata.name = name
    }

    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2), 'utf-8')

    return session.metadata
  }

  /**
   * Load session by ID or name
   */
  async loadSession(identifier: string): Promise<Session | null> {
    // Try to find by name first
    const session = await this.findSessionByName(identifier)
    if (session) {
      return session
    }

    // Try by ID
    const sessionPath = path.join(this.sessionsPath, `${identifier}.json`)
    try {
      const data = await fs.readFile(sessionPath, 'utf-8')
      const loaded = JSON.parse(data)
      this.currentSessionId = identifier
      return loaded
    } catch {
      return null
    }
  }

  /**
   * Fork current session
   */
  async forkSession(name?: string): Promise<string> {
    if (!this.currentSessionId) {
      throw new Error('No active session to fork')
    }

    const parentSession = await this.loadSession(this.currentSessionId)
    if (!parentSession) {
      throw new Error('Parent session not found')
    }

    // Increment fork count
    parentSession.metadata.forkCount++

    // Create new session
    const newSessionId = this.generateSessionId()
    const newSession: Session = {
      ...parentSession,
      metadata: {
        ...parentSession.metadata,
        id: newSessionId,
        parentId: this.currentSessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        forkCount: 0,
        name: name || `${parentSession.metadata.name || 'Session'} (fork)`,
      },
    }

    await this.saveSessionToFile(newSessionId, newSession)
    await this.saveSessionToFile(this.currentSessionId, parentSession)

    return newSessionId
  }

  /**
   * Rewind session to a previous snapshot
   */
  async rewindSession(steps: number): Promise<Session | null> {
    if (!this.currentSessionId) {
      throw new Error('No active session')
    }

    const snapshots = await this.listSnapshots(this.currentSessionId)
    if (snapshots.length < steps) {
      throw new Error(`Cannot rewind ${steps} steps, only ${snapshots.length} snapshots available`)
    }

    const targetSnapshot = snapshots[steps - 1]
    const snapshotPath = path.join(this.snapshotsPath, `${targetSnapshot.id}.json`)

    try {
      const data = await fs.readFile(snapshotPath, 'utf-8')
      const session = JSON.parse(data)
      await this.saveSessionToFile(this.currentSessionId, session)
      return session
    } catch {
      return null
    }
  }

  /**
   * Create session snapshot
   */
  async createSnapshot(description?: string): Promise<string> {
    if (!this.currentSessionId) {
      throw new Error('No active session')
    }

    const session = await this.loadSession(this.currentSessionId)
    if (!session) {
      throw new Error('Current session not found')
    }

    const snapshotId = this.generateSnapshotId()
    const snapshot: SessionSnapshot = {
      id: snapshotId,
      timestamp: new Date().toISOString(),
      description,
    }

    const snapshotPath = path.join(this.snapshotsPath, `${snapshotId}.json`)
    await fs.writeFile(snapshotPath, JSON.stringify(session, null, 2), 'utf-8')

    return snapshotId
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<SessionMetadata[]> {
    const files = await fs.readdir(this.sessionsPath)
    const sessions: SessionMetadata[] = []

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue
      }

      try {
        const sessionPath = path.join(this.sessionsPath, file)
        const data = await fs.readFile(sessionPath, 'utf-8')
        const session = JSON.parse(data) as Session
        sessions.push(session.metadata)
      } catch {
        // Skip invalid sessions
      }
    }

    return sessions.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  /**
   * List remote sessions
   */
  async listRemoteSessions(): Promise<SessionMetadata[]> {
    if (!this.cloudEndpoint) {
      throw new Error('Cloud endpoint not configured')
    }

    // TODO: Implement cloud API call
    // const response = await fetch(`${this.cloudEndpoint}/api/v1/sessions/remote`)
    // return await response.json()

    return []
  }

  /**
   * Rename session
   */
  async renameSession(sessionId: string, newName: string): Promise<boolean> {
    const session = await this.loadSession(sessionId)
    if (!session) {
      return false
    }

    session.metadata.name = newName
    session.metadata.updatedAt = new Date().toISOString()

    await this.saveSessionToFile(sessionId, session)
    return true
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const sessionPath = path.join(this.sessionsPath, `${sessionId}.json`)

    try {
      await fs.unlink(sessionPath)

      // Clean up snapshots
      const snapshots = await this.listSnapshots(sessionId)
      for (const snapshot of snapshots) {
        const snapshotPath = path.join(this.snapshotsPath, `${snapshot.id}.json`)
        await fs.unlink(snapshotPath).catch(() => {})
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * List snapshots for a session
   */
  async listSnapshots(sessionId: string): Promise<SessionSnapshot[]> {
    try {
      const files = await fs.readdir(this.snapshotsPath)
      const snapshots: SessionSnapshot[] = []

      for (const file of files) {
        if (!file.startsWith(`${sessionId}-`) || !file.endsWith('.json')) {
          continue
        }

        try {
          const snapshotPath = path.join(this.snapshotsPath, file)
          const data = await fs.readFile(snapshotPath, 'utf-8')
          const snapshot = JSON.parse(data) as SessionSnapshot
          snapshots.push(snapshot)
        } catch {
          // Skip invalid snapshots
        }
      }

      return snapshots.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    } catch {
      return []
    }
  }

  /**
   * Find session by name
   */
  private async findSessionByName(name: string): Promise<Session | null> {
    const sessions = await this.listSessions()

    for (const metadata of sessions) {
      if (metadata.name === name) {
        return await this.loadSession(metadata.id)
      }
    }

    return null
  }

  /**
   * Save session to file
   */
  private async saveSessionToFile(sessionId: string, session: Session): Promise<void> {
    const sessionPath = path.join(this.sessionsPath, `${sessionId}.json`)
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2), 'utf-8')
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique snapshot ID
   */
  private generateSnapshotId(): string {
    const sessionId = this.currentSessionId || 'unknown'
    return `${sessionId}-snap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export { SessionManager }
