/**
 * Task Persistence
 *
 * SQLite-based task persistence for Brain System.
 * Inspired by Intent Engine's minimal footprint approach.
 *
 * Enhanced with:
 * - Dependency tracking and graph building
 * - Task execution recovery on restart
 * - Topological sort for task ordering
 * - Task metrics (execution time, success rate)
 * - Decision log for audit trail
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
 * Task dependency relationship
 */
export interface TaskDependency {
  taskId: string
  dependsOnId: string
  dependencyType: 'sequential' | 'data' | 'conditional' | 'parallel'
  required: boolean
  createdAt: number
}

/**
 * Task metrics
 */
export interface TaskMetrics {
  taskId: string
  sessionId: string
  executionTime: number // milliseconds
  retryCount: number
  success: boolean
  errorType?: string
  timestamp: number
}

/**
 * Decision log entry
 */
export interface DecisionLog {
  id: string
  sessionId: string
  taskId?: string
  decision: string
  reasoning: string
  context: string // JSON
  outcome?: string
  timestamp: number
}

/**
 * Task execution graph node
 */
export interface TaskGraphNode {
  id: string
  name: string
  status: string
  level: number // Topological level
  dependencies: string[]
  dependents: string[]
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
 * Recovery state for interrupted tasks
 */
export interface RecoveryState {
  sessionId: string
  pendingTasks: PersistedTask[]
  runningTasks: PersistedTask[]
  completedTasks: PersistedTask[]
  failedTasks: PersistedTask[]
  dependencyGraph: TaskGraphNode[]
  nextExecutable: PersistedTask[]
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

      CREATE TABLE IF NOT EXISTS task_dependencies (
        task_id TEXT NOT NULL,
        depends_on_id TEXT NOT NULL,
        dependency_type TEXT NOT NULL DEFAULT 'sequential',
        required INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (task_id, depends_on_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_task_deps_task ON task_dependencies(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_deps_depends ON task_dependencies(depends_on_id);

      CREATE TABLE IF NOT EXISTS task_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        execution_time INTEGER NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        success INTEGER NOT NULL,
        error_type TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_metrics_task ON task_metrics(task_id);
      CREATE INDEX IF NOT EXISTS idx_metrics_session ON task_metrics(session_id);
      CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON task_metrics(timestamp);

      CREATE TABLE IF NOT EXISTS decision_log (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        task_id TEXT,
        decision TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        context TEXT NOT NULL DEFAULT '{}',
        outcome TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_decision_session ON decision_log(session_id);
      CREATE INDEX IF NOT EXISTS idx_decision_task ON decision_log(task_id);
      CREATE INDEX IF NOT EXISTS idx_decision_timestamp ON decision_log(timestamp);
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
   * Add task dependency
   */
  addDependency(
    taskId: string,
    dependsOnId: string,
    type: 'sequential' | 'data' | 'conditional' | 'parallel' = 'sequential',
    required: boolean = true,
  ): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO task_dependencies (task_id, depends_on_id, dependency_type, required, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(taskId, dependsOnId, type, required ? 1 : 0, Date.now())
  }

  /**
   * Remove task dependency
   */
  removeDependency(taskId: string, dependsOnId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_id = ?
    `)

    stmt.run(taskId, dependsOnId)
  }

  /**
   * Get task dependencies
   */
  getTaskDependencies(taskId: string): TaskDependency[] {
    const stmt = this.db.prepare(`
      SELECT * FROM task_dependencies WHERE task_id = ?
    `)

    const rows = stmt.all(taskId) as any[]
    return rows.map(row => ({
      taskId: row.task_id,
      dependsOnId: row.depends_on_id,
      dependencyType: row.dependency_type,
      required: row.required === 1,
      createdAt: row.created_at,
    }))
  }

  /**
   * Get tasks that depend on this task
   */
  getDependentTasks(taskId: string): PersistedTask[] {
    const stmt = this.db.prepare(`
      SELECT t.* FROM tasks t
      INNER JOIN task_dependencies td ON t.id = td.task_id
      WHERE td.depends_on_id = ?
    `)

    const rows = stmt.all(taskId) as any[]
    return rows.map(row => this.rowToTask(row))
  }

  /**
   * Build dependency graph for session
   */
  buildDependencyGraph(sessionId: string): TaskGraphNode[] {
    const tasks = this.getSessionTasks(sessionId)
    const nodes: TaskGraphNode[] = []

    for (const task of tasks) {
      const dependencies = this.getTaskDependencies(task.id)
      const dependents = this.getDependentTasks(task.id)

      nodes.push({
        id: task.id,
        name: task.name,
        status: task.status,
        level: this.calculateTopologicalLevel(task.id, sessionId),
        dependencies: dependencies.map(d => d.dependsOnId),
        dependents: dependents.map(d => d.id),
      })
    }

    return nodes.sort((a, b) => a.level - b.level)
  }

  /**
   * Calculate topological level for a task
   */
  private calculateTopologicalLevel(taskId: string, sessionId: string): number {
    const visited = new Set<string>()
    const calculating = new Set<string>()

    const calculate = (id: string): number => {
      if (visited.has(id)) {
        return 0
      }

      if (calculating.has(id)) {
        // Circular dependency detected
        return 0
      }

      calculating.add(id)

      const deps = this.getTaskDependencies(id)
      if (deps.length === 0) {
        visited.add(id)
        calculating.delete(id)
        return 0
      }

      let maxLevel = -1
      for (const dep of deps) {
        const depLevel = calculate(dep.dependsOnId)
        maxLevel = Math.max(maxLevel, depLevel)
      }

      visited.add(id)
      calculating.delete(id)
      return maxLevel + 1
    }

    return calculate(taskId)
  }

  /**
   * Get tasks in topological order
   */
  getTopologicalOrder(sessionId: string): PersistedTask[] {
    const graph = this.buildDependencyGraph(sessionId)
    const tasks = this.getSessionTasks(sessionId)
    const taskMap = new Map(tasks.map(t => [t.id, t]))

    return graph
      .sort((a, b) => a.level - b.level)
      .map(node => taskMap.get(node.id)!)
      .filter(Boolean)
  }

  /**
   * Get next executable tasks (no pending dependencies)
   */
  getNextExecutableTasks(sessionId: string): PersistedTask[] {
    const tasks = this.getSessionTasks(sessionId)
    const executable: PersistedTask[] = []

    for (const task of tasks) {
      if (task.status !== 'pending') {
        continue
      }

      const deps = this.getTaskDependencies(task.id)
      const allCompleted = deps.every((dep) => {
        const depTask = this.getTask(dep.dependsOnId)
        return depTask && depTask.status === 'completed'
      })

      if (allCompleted) {
        executable.push(task)
      }
    }

    return executable
  }

  /**
   * Recover execution state for interrupted session
   */
  recoverExecutionState(sessionId: string): RecoveryState {
    const tasks = this.getSessionTasks(sessionId)
    const graph = this.buildDependencyGraph(sessionId)

    return {
      sessionId,
      pendingTasks: tasks.filter(t => t.status === 'pending'),
      runningTasks: tasks.filter(t => t.status === 'running'),
      completedTasks: tasks.filter(t => t.status === 'completed'),
      failedTasks: tasks.filter(t => t.status === 'failed'),
      dependencyGraph: graph,
      nextExecutable: this.getNextExecutableTasks(sessionId),
    }
  }

  /**
   * Record task metrics
   */
  recordMetrics(metrics: Omit<TaskMetrics, 'timestamp'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO task_metrics (task_id, session_id, execution_time, retry_count, success, error_type, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      metrics.taskId,
      metrics.sessionId,
      metrics.executionTime,
      metrics.retryCount,
      metrics.success ? 1 : 0,
      metrics.errorType || null,
      Date.now(),
    )
  }

  /**
   * Get task metrics
   */
  getTaskMetrics(taskId: string): TaskMetrics[] {
    const stmt = this.db.prepare(`
      SELECT * FROM task_metrics WHERE task_id = ? ORDER BY timestamp DESC
    `)

    const rows = stmt.all(taskId) as any[]
    return rows.map(row => ({
      taskId: row.task_id,
      sessionId: row.session_id,
      executionTime: row.execution_time,
      retryCount: row.retry_count,
      success: row.success === 1,
      errorType: row.error_type,
      timestamp: row.timestamp,
    }))
  }

  /**
   * Get aggregated metrics for session
   */
  getSessionMetrics(sessionId: string): {
    totalTasks: number
    completedTasks: number
    failedTasks: number
    avgExecutionTime: number
    successRate: number
    totalRetries: number
  } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed,
        AVG(execution_time) as avg_time,
        SUM(retry_count) as total_retries
      FROM task_metrics
      WHERE session_id = ?
    `)

    const row = stmt.get(sessionId) as any
    if (!row || row.total === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        avgExecutionTime: 0,
        successRate: 0,
        totalRetries: 0,
      }
    }

    return {
      totalTasks: row.total,
      completedTasks: row.completed,
      failedTasks: row.failed,
      avgExecutionTime: Math.round(row.avg_time || 0),
      successRate: row.total > 0 ? row.completed / row.total : 0,
      totalRetries: row.total_retries || 0,
    }
  }

  /**
   * Log a decision
   */
  logDecision(log: Omit<DecisionLog, 'timestamp'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO decision_log (id, session_id, task_id, decision, reasoning, context, outcome, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      log.id,
      log.sessionId,
      log.taskId || null,
      log.decision,
      log.reasoning,
      log.context,
      log.outcome || null,
      Date.now(),
    )
  }

  /**
   * Update decision outcome
   */
  updateDecisionOutcome(decisionId: string, outcome: string): void {
    const stmt = this.db.prepare(`
      UPDATE decision_log SET outcome = ? WHERE id = ?
    `)

    stmt.run(outcome, decisionId)
  }

  /**
   * Get decision log for session
   */
  getDecisionLog(sessionId: string): DecisionLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM decision_log WHERE session_id = ? ORDER BY timestamp ASC
    `)

    const rows = stmt.all(sessionId) as any[]
    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      taskId: row.task_id,
      decision: row.decision,
      reasoning: row.reasoning,
      context: row.context,
      outcome: row.outcome,
      timestamp: row.timestamp,
    }))
  }

  /**
   * Get decision log for task
   */
  getTaskDecisionLog(taskId: string): DecisionLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM decision_log WHERE task_id = ? ORDER BY timestamp ASC
    `)

    const rows = stmt.all(taskId) as any[]
    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      taskId: row.task_id,
      decision: row.decision,
      reasoning: row.reasoning,
      context: row.context,
      outcome: row.outcome,
      timestamp: row.timestamp,
    }))
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependency(taskId: string, dependsOnId: string): boolean {
    const visited = new Set<string>()
    const stack = new Set<string>()

    const hasCycle = (currentId: string): boolean => {
      if (stack.has(currentId)) {
        return true
      }

      if (visited.has(currentId)) {
        return false
      }

      visited.add(currentId)
      stack.add(currentId)

      const deps = this.getTaskDependencies(currentId)
      for (const dep of deps) {
        if (hasCycle(dep.dependsOnId)) {
          return true
        }
      }

      stack.delete(currentId)
      return false
    }

    // Check if adding this dependency would create a cycle
    // Temporarily add the dependency and check
    const tempDeps = this.getTaskDependencies(taskId)
    tempDeps.push({
      taskId,
      dependsOnId,
      dependencyType: 'sequential',
      required: true,
      createdAt: Date.now(),
    })

    return hasCycle(taskId)
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
