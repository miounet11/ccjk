/**
 * Workflow System
 *
 * Superpowers-style workflow management for CCJK
 *
 * Features:
 * - 5-phase development workflow (brainstorming → planning → implementation → review → finishing)
 * - Subagent orchestration with parallel execution
 * - Two-stage code review (spec compliance + code quality)
 * - Git worktree isolation for parallel development
 *
 * @example
 * ```typescript
 * import {
 *   getWorkflowStateMachine,
 *   getScheduler,
 *   TwoStageReviewer
 * } from './workflow'
 *
 * // Create a workflow session
 * const machine = getWorkflowStateMachine()
 * const session = machine.createSession({
 *   name: 'Add user authentication',
 *   description: 'Implement OAuth2 login flow'
 * })
 *
 * // Add tasks
 * machine.addTask(session.id, {
 *   title: 'Create auth service',
 *   description: 'Implement OAuth2 authentication service',
 *   priority: 'high',
 *   estimatedMinutes: 30,
 *   dependencies: [],
 *   metadata: { phase: 'implementation' }
 * })
 *
 * // Queue tasks for execution
 * const scheduler = getScheduler()
 * scheduler.queueTasks(session, session.tasks)
 * scheduler.start()
 *
 * // Listen to events
 * scheduler.on('task:completed', (task, result) => {
 *   console.log(`Task ${task.title} completed!`)
 * })
 *
 * // Transition phases
 * machine.transitionTo(session.id, 'review')
 * ```
 */

// Review
// ============================================================================
// CLI Convenience Functions
// ============================================================================

import type { WorkflowPhase, WorkflowSession } from './types'
import { getScheduler as _getScheduler } from './scheduler'
import { getWorkflowStateMachine as _getWorkflowStateMachine } from './state-machine'

export {
  canRetryReview,
  createTaskReview,
  DEFAULT_REVIEW_CONFIG,
  formatReviewResult,
  getUnresolvedIssues,
  TwoStageReviewer,
} from './review'

export type {
  QualityCategory,
  QualityCheck,
  ReviewConfig,
  ReviewContext,
  SpecComplianceCheck,
} from './review'

// Scheduler
export {
  createTasksFromPlan,
  getScheduler,
  resetScheduler,
  SubagentScheduler,
} from './scheduler'

export type { SchedulerEvents } from './scheduler'

// Skill
export {
  getWorkflowSkill,
  getWorkflowSkillTemplate,
  workflowSkill,
} from './skill'

// State Machine
export {
  getWorkflowStateMachine,
  resetWorkflowStateMachine,
  WorkflowStateMachine,
} from './state-machine'

export type { StateMachineOptions } from './state-machine'

// Types
export type {
  PhaseConfig,
  PhaseTransition,
  ReviewIssue,
  ReviewSeverity,
  ReviewStage,
  SchedulerConfig,
  StageReviewResult,
  TaskExecutionContext,
  TaskPriority,
  TaskReview,
  TaskStatus,
  WorkflowEvents,
  WorkflowPersistenceState,
  WorkflowPhase,
  WorkflowSession,
  WorkflowStatus,
  WorkflowTask,
} from './types'

export {
  DEFAULT_SCHEDULER_CONFIG,
  PHASE_CONFIGS,
  WORKFLOW_PERSISTENCE_VERSION,
} from './types'

/**
 * Configuration for creating a new workflow
 */
export interface CreateWorkflowOptions {
  name: string
  description: string
  branch?: string
  skills?: string[]
  metadata?: Record<string, unknown>
}

/**
 * Create a new workflow with the given configuration
 */
export function createWorkflow(options: CreateWorkflowOptions): WorkflowSession {
  const machine = _getWorkflowStateMachine()
  return machine.createSession(options)
}

/**
 * Get workflow state by ID
 */
export function getWorkflowState(workflowId: string): WorkflowSession | null {
  const machine = _getWorkflowStateMachine()
  return machine.getSession(workflowId)
}

/**
 * List all workflows
 */
export function listWorkflows(): WorkflowSession[] {
  const machine = _getWorkflowStateMachine()
  return machine.getAllSessions()
}

/**
 * Transition workflow to a new phase
 */
export function transitionWorkflow(workflowId: string, phase: WorkflowPhase): void {
  const machine = _getWorkflowStateMachine()
  machine.transitionTo(workflowId, phase)
}

/**
 * Get scheduler statistics
 */
export function getSchedulerStats(): {
  activeWorkflows: number
  queuedTasks: number
  completedTasks: number
  failedTasks: number
  totalAgents: number
  uptime: number
} {
  const scheduler = _getScheduler()
  const stats = scheduler.getStats()
  return {
    activeWorkflows: stats.activeTasks,
    queuedTasks: stats.queuedTasks,
    completedTasks: stats.completedTasks,
    failedTasks: stats.failedTasks,
    totalAgents: stats.totalAgents,
    uptime: stats.uptime,
  }
}

/**
 * Pause the scheduler
 */
export function pauseScheduler(): void {
  const scheduler = _getScheduler()
  scheduler.pause()
}

/**
 * Resume the scheduler
 */
export function resumeScheduler(): void {
  const scheduler = _getScheduler()
  scheduler.resume()
}

/**
 * Cancel all tasks for a workflow
 */
export function cancelAllTasks(workflowId: string): void {
  const scheduler = _getScheduler()
  scheduler.cancelWorkflow(workflowId)
}
