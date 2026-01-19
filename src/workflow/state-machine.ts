/**
 * Workflow State Machine
 *
 * Manages workflow phase transitions and session lifecycle
 * Following Superpowers 5-phase methodology
 */

import type {
  PhaseTransition,
  WorkflowEvents,
  WorkflowPersistenceState,
  WorkflowPhase,
  WorkflowSession,
  WorkflowStatus,
  WorkflowTask,
} from './types'
import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'pathe'
import { PHASE_CONFIGS, WORKFLOW_PERSISTENCE_VERSION } from './types'

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `wf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * State machine options
 */
export interface StateMachineOptions {
  /** Path to persist workflow state */
  persistPath?: string

  /** Auto-save on state changes */
  autoSave?: boolean

  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<StateMachineOptions> = {
  persistPath: join(homedir(), '.ccjk', 'workflow-state.json'),
  autoSave: true,
  verbose: false,
}

/**
 * WorkflowStateMachine - Manages workflow sessions and phase transitions
 *
 * @example
 * ```typescript
 * const machine = new WorkflowStateMachine()
 *
 * // Create a new workflow session
 * const session = machine.createSession({
 *   name: 'Add user authentication',
 *   description: 'Implement OAuth2 login flow'
 * })
 *
 * // Transition to next phase
 * machine.transitionTo(session.id, 'planning')
 *
 * // Listen to events
 * machine.on('phase:changed', (session, transition) => {
 *   console.log(`Phase changed: ${transition.from} -> ${transition.to}`)
 * })
 * ```
 */
export class WorkflowStateMachine extends EventEmitter {
  private sessions: Map<string, WorkflowSession> = new Map()
  private options: Required<StateMachineOptions>

  constructor(options: StateMachineOptions = {}) {
    super()
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.loadState()
  }

  // ==========================================================================
  // Session Management
  // ==========================================================================

  /**
   * Create a new workflow session
   *
   * @param params - Session parameters
   * @param params.name - Session name
   * @param params.description - Optional session description
   * @param params.initialPhase - Optional initial workflow phase
   * @param params.branch - Optional git branch name
   * @param params.skills - Optional list of skill IDs to use
   * @param params.metadata - Optional additional metadata
   * @returns Created session
   */
  createSession(params: {
    name: string
    description?: string
    initialPhase?: WorkflowPhase
    branch?: string
    skills?: string[]
    metadata?: Record<string, any>
  }): WorkflowSession {
    const session: WorkflowSession = {
      id: generateId(),
      name: params.name,
      description: params.description || '',
      currentPhase: params.initialPhase || 'brainstorming',
      status: 'active',
      tasks: [],
      phaseHistory: [{
        from: null,
        to: params.initialPhase || 'brainstorming',
        timestamp: new Date(),
        reason: 'Session created',
        triggeredBy: 'system',
      }],
      branch: params.branch,
      skills: params.skills || [],
      metadata: params.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.sessions.set(session.id, session)
    this.emit('session:created', session)
    this.log(`Created session: ${session.id} - ${session.name}`)
    this.saveState()

    return session
  }

  /**
   * Get a session by ID
   */
  getSession(id: string): WorkflowSession | null {
    return this.sessions.get(id) || null
  }

  /**
   * Get all sessions
   */
  getAllSessions(): WorkflowSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): WorkflowSession[] {
    return this.getAllSessions().filter(s => s.status === 'active' || s.status === 'paused')
  }

  /**
   * Update session metadata
   */
  updateSession(id: string, updates: Partial<Pick<WorkflowSession, 'name' | 'description' | 'metadata' | 'branch' | 'worktreePath'>>): WorkflowSession {
    const session = this.getSessionOrThrow(id)

    Object.assign(session, updates, { updatedAt: new Date() })
    this.saveState()

    return session
  }

  /**
   * Delete a session
   */
  deleteSession(id: string): boolean {
    const session = this.sessions.get(id)
    if (!session) {
      return false
    }

    this.sessions.delete(id)
    this.log(`Deleted session: ${id}`)
    this.saveState()

    return true
  }

  // ==========================================================================
  // Phase Transitions
  // ==========================================================================

  /**
   * Transition to a new phase
   *
   * @param sessionId - Session ID
   * @param targetPhase - Target phase
   * @param reason - Reason for transition
   * @returns Updated session
   * @throws Error if transition is not allowed
   */
  transitionTo(
    sessionId: string,
    targetPhase: WorkflowPhase,
    reason?: string,
  ): WorkflowSession {
    const session = this.getSessionOrThrow(sessionId)

    // Validate transition
    this.validateTransition(session, targetPhase)

    const oldPhase = session.currentPhase
    const transition: PhaseTransition = {
      from: oldPhase,
      to: targetPhase,
      timestamp: new Date(),
      reason: reason || `Transition from ${oldPhase} to ${targetPhase}`,
      triggeredBy: 'user',
    }

    session.currentPhase = targetPhase
    session.phaseHistory.push(transition)
    session.updatedAt = new Date()

    this.emit('phase:changed', session, transition)
    this.log(`Phase transition: ${oldPhase} -> ${targetPhase} (${session.name})`)
    this.saveState()

    return session
  }

  /**
   * Check if a transition is allowed
   */
  canTransitionTo(sessionId: string, targetPhase: WorkflowPhase): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    const currentConfig = PHASE_CONFIGS[session.currentPhase]
    return currentConfig.allowedTransitions.includes(targetPhase)
  }

  /**
   * Get allowed transitions for a session
   */
  getAllowedTransitions(sessionId: string): WorkflowPhase[] {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return []
    }

    return PHASE_CONFIGS[session.currentPhase].allowedTransitions
  }

  /**
   * Auto-advance to next phase if conditions are met
   */
  autoAdvance(sessionId: string): WorkflowSession | null {
    const session = this.getSessionOrThrow(sessionId)
    const currentConfig = PHASE_CONFIGS[session.currentPhase]

    // Don't auto-advance if confirmation is required
    if (currentConfig.requiresConfirmation) {
      return null
    }

    // Check if all tasks in current phase are completed
    const phaseTasks = this.getTasksForPhase(session, session.currentPhase)
    const allCompleted = phaseTasks.every(t => t.status === 'completed')

    if (!allCompleted || phaseTasks.length === 0) {
      return null
    }

    // Get next phase
    const nextPhase = currentConfig.allowedTransitions[0]
    if (!nextPhase) {
      return null
    }

    return this.transitionTo(sessionId, nextPhase, 'Auto-advanced after task completion')
  }

  // ==========================================================================
  // Session Status Management
  // ==========================================================================

  /**
   * Pause a session
   */
  pauseSession(sessionId: string): WorkflowSession {
    const session = this.getSessionOrThrow(sessionId)

    if (session.status !== 'active') {
      throw new Error(`Cannot pause session with status: ${session.status}`)
    }

    return this.changeSessionStatus(session, 'paused')
  }

  /**
   * Resume a paused session
   */
  resumeSession(sessionId: string): WorkflowSession {
    const session = this.getSessionOrThrow(sessionId)

    if (session.status !== 'paused') {
      throw new Error(`Cannot resume session with status: ${session.status}`)
    }

    return this.changeSessionStatus(session, 'active')
  }

  /**
   * Complete a session
   */
  completeSession(sessionId: string): WorkflowSession {
    const session = this.getSessionOrThrow(sessionId)

    if (session.status !== 'active') {
      throw new Error(`Cannot complete session with status: ${session.status}`)
    }

    session.completedAt = new Date()
    const updated = this.changeSessionStatus(session, 'completed')
    this.emit('workflow:completed', updated)

    return updated
  }

  /**
   * Fail a session
   */
  failSession(sessionId: string, error: string): WorkflowSession {
    const session = this.getSessionOrThrow(sessionId)

    session.error = error
    const updated = this.changeSessionStatus(session, 'failed')
    this.emit('workflow:failed', updated, error)

    return updated
  }

  /**
   * Cancel a session
   */
  cancelSession(sessionId: string): WorkflowSession {
    const session = this.getSessionOrThrow(sessionId)

    if (session.status === 'completed' || session.status === 'failed') {
      throw new Error(`Cannot cancel session with status: ${session.status}`)
    }

    return this.changeSessionStatus(session, 'cancelled')
  }

  // ==========================================================================
  // Task Management
  // ==========================================================================

  /**
   * Add a task to a session
   */
  addTask(sessionId: string, task: Omit<WorkflowTask, 'id' | 'createdAt' | 'status'>): WorkflowTask {
    const session = this.getSessionOrThrow(sessionId)

    const newTask: WorkflowTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'pending',
      createdAt: new Date(),
    }

    session.tasks.push(newTask)
    session.updatedAt = new Date()

    this.emit('task:created', session, newTask)
    this.saveState()

    return newTask
  }

  /**
   * Update task status
   */
  updateTaskStatus(sessionId: string, taskId: string, status: WorkflowTask['status']): WorkflowTask {
    const session = this.getSessionOrThrow(sessionId)
    const task = session.tasks.find(t => t.id === taskId)

    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    const oldStatus = task.status
    task.status = status

    if (status === 'running' && !task.startedAt) {
      task.startedAt = new Date()
    }

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      task.completedAt = new Date()
      if (task.startedAt) {
        task.actualMinutes = Math.round((task.completedAt.getTime() - task.startedAt.getTime()) / 60000)
      }
    }

    session.updatedAt = new Date()

    this.emit('task:status', session, task, oldStatus, status)

    if (status === 'completed') {
      this.emit('task:completed', session, task)
    }
    else if (status === 'failed') {
      this.emit('task:failed', session, task, task.error || 'Unknown error')
    }

    this.saveState()

    return task
  }

  /**
   * Get tasks for a specific phase
   */
  getTasksForPhase(session: WorkflowSession, phase: WorkflowPhase): WorkflowTask[] {
    // Tasks are associated with phases via metadata or skill mapping
    return session.tasks.filter(t => t.metadata?.phase === phase)
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(sessionId: string): WorkflowTask[] {
    const session = this.getSessionOrThrow(sessionId)
    return session.tasks.filter(t => t.status === 'pending' || t.status === 'queued')
  }

  /**
   * Get running tasks
   */
  getRunningTasks(sessionId: string): WorkflowTask[] {
    const session = this.getSessionOrThrow(sessionId)
    return session.tasks.filter(t => t.status === 'running')
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================

  /**
   * Save state to disk
   */
  saveState(): void {
    if (!this.options.autoSave) {
      return
    }

    const state: WorkflowPersistenceState = {
      version: WORKFLOW_PERSISTENCE_VERSION,
      sessions: Array.from(this.sessions.values()),
      lastUpdated: new Date(),
    }

    try {
      const dir = dirname(this.options.persistPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      writeFileSync(
        this.options.persistPath,
        JSON.stringify(state, null, 2),
        'utf-8',
      )

      this.log(`State saved to ${this.options.persistPath}`)
    }
    catch (error) {
      console.error('Failed to save workflow state:', error)
    }
  }

  /**
   * Load state from disk
   */
  loadState(): void {
    try {
      if (!existsSync(this.options.persistPath)) {
        this.log('No existing state file found')
        return
      }

      const content = readFileSync(this.options.persistPath, 'utf-8')
      const state: WorkflowPersistenceState = JSON.parse(content)

      // Version migration if needed
      if (state.version !== WORKFLOW_PERSISTENCE_VERSION) {
        this.log(`Migrating state from version ${state.version} to ${WORKFLOW_PERSISTENCE_VERSION}`)
        // Add migration logic here when needed
      }

      // Restore sessions
      this.sessions.clear()
      for (const session of state.sessions) {
        // Convert date strings back to Date objects
        session.createdAt = new Date(session.createdAt)
        session.updatedAt = new Date(session.updatedAt)
        if (session.completedAt) {
          session.completedAt = new Date(session.completedAt)
        }

        for (const task of session.tasks) {
          task.createdAt = new Date(task.createdAt)
          if (task.startedAt)
            task.startedAt = new Date(task.startedAt)
          if (task.completedAt)
            task.completedAt = new Date(task.completedAt)
        }

        for (const transition of session.phaseHistory) {
          transition.timestamp = new Date(transition.timestamp)
        }

        this.sessions.set(session.id, session)
      }

      this.log(`Loaded ${this.sessions.size} sessions from state file`)
    }
    catch (error) {
      console.error('Failed to load workflow state:', error)
    }
  }

  /**
   * Clear all state
   */
  clearState(): void {
    this.sessions.clear()
    this.saveState()
    this.log('State cleared')
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get workflow statistics
   */
  getStats(): {
    totalSessions: number
    activeSessions: number
    completedSessions: number
    failedSessions: number
    totalTasks: number
    completedTasks: number
    averageTaskDuration: number
  } {
    const sessions = this.getAllSessions()
    const allTasks = sessions.flatMap(s => s.tasks)
    const completedTasks = allTasks.filter(t => t.status === 'completed' && t.actualMinutes)

    const avgDuration = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0) / completedTasks.length
      : 0

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      failedSessions: sessions.filter(s => s.status === 'failed').length,
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      averageTaskDuration: Math.round(avgDuration * 10) / 10,
    }
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private getSessionOrThrow(id: string): WorkflowSession {
    const session = this.sessions.get(id)
    if (!session) {
      throw new Error(`Session not found: ${id}`)
    }
    return session
  }

  private validateTransition(session: WorkflowSession, targetPhase: WorkflowPhase): void {
    if (session.status !== 'active') {
      throw new Error(`Cannot transition session with status: ${session.status}`)
    }

    const currentConfig = PHASE_CONFIGS[session.currentPhase]
    if (!currentConfig.allowedTransitions.includes(targetPhase)) {
      throw new Error(
        `Invalid transition: ${session.currentPhase} -> ${targetPhase}. `
        + `Allowed: ${currentConfig.allowedTransitions.join(', ')}`,
      )
    }
  }

  private changeSessionStatus(session: WorkflowSession, newStatus: WorkflowStatus): WorkflowSession {
    const oldStatus = session.status
    session.status = newStatus
    session.updatedAt = new Date()

    this.emit('session:status', session, oldStatus, newStatus)
    this.log(`Session status: ${oldStatus} -> ${newStatus} (${session.name})`)
    this.saveState()

    return session
  }

  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[WorkflowStateMachine] ${message}`)
    }
  }

  // ==========================================================================
  // Type-safe Event Emitter
  // ==========================================================================

  on<K extends keyof WorkflowEvents>(event: K, listener: WorkflowEvents[K]): this {
    return super.on(event, listener as any)
  }

  emit<K extends keyof WorkflowEvents>(event: K, ...args: Parameters<WorkflowEvents[K]>): boolean {
    return super.emit(event, ...args)
  }

  once<K extends keyof WorkflowEvents>(event: K, listener: WorkflowEvents[K]): this {
    return super.once(event, listener as any)
  }

  off<K extends keyof WorkflowEvents>(event: K, listener: WorkflowEvents[K]): this {
    return super.off(event, listener as any)
  }
}

/**
 * Singleton instance
 */
let instance: WorkflowStateMachine | null = null

/**
 * Get the workflow state machine instance
 */
export function getWorkflowStateMachine(options?: StateMachineOptions): WorkflowStateMachine {
  if (!instance) {
    instance = new WorkflowStateMachine(options)
  }
  return instance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetWorkflowStateMachine(): void {
  instance = null
}
