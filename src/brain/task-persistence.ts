/**
 * Task Persistence
 *
 * SQLite-based task persistence for Brain System.
 * Inspired by Intent Engine's minimal footprint approach.
 *
 * @module brain/task-persistence
 */

import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'pathe'
import type { Task } from './orchestrator-types'

/**
 * Persisted task
 */
export interface PersistedTask {
  id: string
  sessionId: string
  name: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: number
  dependencies: string[] // Task IDs this task depends on
  input: string // JSON
  output?: string // JSON
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
  metadata: string // JSON
}

/**
 * Task context for restoration
 */
export interface TaskContext {
  sessionId: string
  tasks: PersistedTask[]
  metadata: Record<string, any>
}

/**
 * Task Persistence Manager
 */
export class TaskPersistence {
  private db: Database.Database
  private dbPath: string

  constructor(dbPath?: string) {
    // Default to ~/.ccjk/brain.db
    this.dbPath = dbPath || join(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.ccjk',
      'brain.db',
    )

    // Ensure directory exists
    const dir = dirname(this.dbPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    // Open database
    this.db = new Database(this.dbPath)

    // Initialize schema
    this.initSchema()
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 0,
        dependencies TEXT NOT NULL DEFAULT '[]',
        input TEXT NOT NULL,
        output TEXT,
        error TEXT,
        created_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER,
        metadata TEXT NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
    `)
  }

  /**
   * Save a task
   */
  saveTask(task: Task, sessionId: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tasks (
        id, session_id, name, description, status, priority,
        dependencies, input, output, error,
        created_at, started_at, completed_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      task.id,
      sessionId,
      task.name,
      task.description || null,
      task.status || 'pending',
      task.priority || 0,
      JSON.stringify(task.dependencies || []),
      JSON.stringify(task.input || {}),
      task.output ? JSON.stringify(task.output) : null,
      task.error ? JSON.stringify(task.error) : null,
      Date.now(),
      null,
      null,
      JSON.stringify(task.metadata || {}),
    )
  }

  /**
   * Update task status
   */
  updateTaskStatus(
    taskId: string,
    status: 'pending' | 'running' | 'completed' | 'failed',
    output?: any,
    error?: Error,
  ): void {
    const now = Date.now()
    const updates: string[] = ['status = ?']
    const params: any[] = [status]

    if (status === 'running') {
      updates.push('started_at = ?')
      params.push(now)
    }

    if (status === 'completed' || status === 'failed') {
      updates.push('completed_at = ?')
      params.push(now)
    }

    if (output) {
      updates.push('output = ?')
      params.push(JSON.stringify(output))
    }

    if (error) {
      updates.push('error = ?')
      params.push(JSON.stringify({ message: error.message, stack: error.stack }))
    }

    params.push(taskId)

    const stmt = this.db.prepare(`
      UPDATE tasks SET ${updates.join(', ')} WHERE id = ?
    `)

    stmt.run(...params)
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): PersistedTask | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks WHERE id = ?
    `)

    const row = stmt.get(taskId) as any
    if (!row) return undefined

    return this.rowToTask(row)
  }

  /**
   * Get all tasks for a session
   */
  getSessionTasks(sessionId: string): PersistedTask[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks WHERE session_id = ? ORDER BY created_at ASC
    `)

    const rows = stmt.all(sessionId) as any[]
    return rows.map(row => this.rowToTask(row))
  }

  /**
   * Get task dependencies
   */
  getDependencies(taskId: string): PersistedTask[] {
    const task = this.getTask(taskId)
    if (!task || task.dependencies.length === 0) {
      return []
    }

    const placeholders = task.dependencies.map(() => '?').join(',')
    const stmt = this.db.prepare(`
      SELECT * FROM tasks WHERE id IN (${placeholders})
    `)

    const rows = stmt.all(...task.dependencies) as any[]
    return rows.map(row => this.rowToTask(row))
  }

  /**
   * Restore context for a session
   */
  restoreContext(sessionId: string): TaskContext | null {
    const tasks = this.getSessionTasks(sessionId)
    if (tasks.length === 0) {
      return null
    }

    const sessionStmt = this.db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `)

    const sessionRow = sessionStmt.get(sessionId) as any
    const metadata = sessionRow ? JSON.parse(sessionRow.metadata) : {}

    return {
      sessionId,
      tasks,
      metadata,
    }
  }

  /**
   * Create or update session
   */
  saveSession(sessionId: string, metadata: Record<string, any> = {}): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (id, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?)
    `)

    const now = Date.now()
    stmt.run(sessionId, now, now, JSON.stringify(metadata))
  }

  /**
   * List recent sessions
   */
  listSessions(limit: number = 10): Array<{ id: string, createdAt: number, metadata: Record<string, any> }> {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?
    `)

    const rows = stmt.all(limit) as any[]
    return rows.map(row => ({
      id: row.id,
      createdAt: row.created_at,
      metadata: JSON.parse(row.metadata),
    }))
  }

  /**
   * Clean up old sessions
   */
  cleanup(keepDays: number = 7): number {
    const cutoff = Date.now() - (keepDays * 24 * 60 * 60 * 1000)

    // Delete old tasks
    const deleteTasksStmt = this.db.prepare(`
      DELETE FROM tasks WHERE created_at < ?
    `)
    const tasksResult = deleteTasksStmt.run(cutoff)

    // Delete old sessions
    const deleteSessionsStmt = this.db.prepare(`
      DELETE FROM sessions WHERE created_at < ?
    `)
    const sessionsResult = deleteSessionsStmt.run(cutoff)

    return tasksResult.changes + sessionsResult.changes
  }

  /**
   * Close database
   */
  close(): void {
    this.db.close()
  }

  /**
   * Convert database row to PersistedTask
   */
  private rowToTask(row: any): PersistedTask {
    return {
      id: row.id,
      sessionId: row.session_id,
      name: row.name,
      description: row.description,
      status: row.status,
      priority: row.priority,
      dependencies: JSON.parse(row.dependencies),
      input: row.input,
      output: row.output,
      error: row.error,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      metadata: row.metadata,
    }
  }
}

/**
 * Global task persistence instance
 */
export const taskPersistence = new TaskPersistence()
