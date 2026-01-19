/**
 * Workflow System Types
 *
 * Superpowers-style workflow management for CCJK
 * Implements 5-phase development workflow with subagent orchestration
 */

import type { SubagentConfig, SubagentState } from '../utils/subagent/types'

// ============================================================================
// Workflow Phases
// ============================================================================

/**
 * Workflow phases following Superpowers methodology
 *
 * 1. brainstorming - Explore ideas, gather requirements
 * 2. planning - Create detailed implementation plan
 * 3. implementation - Execute tasks via subagents
 * 4. review - Two-stage code review
 * 5. finishing - Final cleanup and merge
 */
export type WorkflowPhase
  = | 'brainstorming'
    | 'planning'
    | 'implementation'
    | 'review'
    | 'finishing'

/**
 * Phase metadata and configuration
 */
export interface PhaseConfig {
  /** Phase identifier */
  phase: WorkflowPhase

  /** Human-readable name */
  name: Record<string, string>

  /** Phase description */
  description: Record<string, string>

  /** Skills to auto-activate in this phase */
  autoActivateSkills: string[]

  /** Allowed transitions from this phase */
  allowedTransitions: WorkflowPhase[]

  /** Whether this phase requires user confirmation to proceed */
  requiresConfirmation: boolean

  /** Maximum duration in minutes (0 = unlimited) */
  maxDuration: number
}

/**
 * Default phase configurations
 */
export const PHASE_CONFIGS: Record<WorkflowPhase, PhaseConfig> = {
  brainstorming: {
    phase: 'brainstorming',
    name: {
      'en': 'Brainstorming',
      'zh-CN': '头脑风暴',
      'ja-JP': 'ブレインストーミング',
      'ko-KR': '브레인스토밍',
    },
    description: {
      'en': 'Explore ideas and gather requirements',
      'zh-CN': '探索想法，收集需求',
      'ja-JP': 'アイデアを探求し、要件を収集する',
      'ko-KR': '아이디어 탐색 및 요구사항 수집',
    },
    autoActivateSkills: ['brainstorming', 'requirements'],
    allowedTransitions: ['planning'],
    requiresConfirmation: true,
    maxDuration: 30,
  },
  planning: {
    phase: 'planning',
    name: {
      'en': 'Planning',
      'zh-CN': '规划',
      'ja-JP': '計画',
      'ko-KR': '계획',
    },
    description: {
      'en': 'Create detailed implementation plan with bite-sized tasks',
      'zh-CN': '创建详细的实施计划，分解为小任务',
      'ja-JP': '詳細な実装計画を作成し、小さなタスクに分解する',
      'ko-KR': '세부 구현 계획 작성 및 작은 작업으로 분해',
    },
    autoActivateSkills: ['planning', 'task-breakdown'],
    allowedTransitions: ['implementation', 'brainstorming'],
    requiresConfirmation: true,
    maxDuration: 60,
  },
  implementation: {
    phase: 'implementation',
    name: {
      'en': 'Implementation',
      'zh-CN': '实现',
      'ja-JP': '実装',
      'ko-KR': '구현',
    },
    description: {
      'en': 'Execute tasks via subagents with TDD approach',
      'zh-CN': '通过子代理执行任务，采用 TDD 方法',
      'ja-JP': 'TDDアプローチでサブエージェントを介してタスクを実行',
      'ko-KR': 'TDD 접근 방식으로 서브에이전트를 통해 작업 실행',
    },
    autoActivateSkills: ['implementation', 'tdd', 'coding'],
    allowedTransitions: ['review', 'planning'],
    requiresConfirmation: false,
    maxDuration: 0, // Unlimited
  },
  review: {
    phase: 'review',
    name: {
      'en': 'Code Review',
      'zh-CN': '代码审查',
      'ja-JP': 'コードレビュー',
      'ko-KR': '코드 리뷰',
    },
    description: {
      'en': 'Two-stage review: spec compliance + code quality',
      'zh-CN': '两阶段审查：规格符合性 + 代码质量',
      'ja-JP': '2段階レビュー：仕様準拠 + コード品質',
      'ko-KR': '2단계 검토: 사양 준수 + 코드 품질',
    },
    autoActivateSkills: ['code-review', 'quality-check'],
    allowedTransitions: ['finishing', 'implementation'],
    requiresConfirmation: true,
    maxDuration: 30,
  },
  finishing: {
    phase: 'finishing',
    name: {
      'en': 'Finishing',
      'zh-CN': '收尾',
      'ja-JP': '仕上げ',
      'ko-KR': '마무리',
    },
    description: {
      'en': 'Final cleanup, documentation, and merge',
      'zh-CN': '最终清理、文档和合并',
      'ja-JP': '最終クリーンアップ、ドキュメント、マージ',
      'ko-KR': '최종 정리, 문서화 및 병합',
    },
    autoActivateSkills: ['finishing', 'documentation'],
    allowedTransitions: [],
    requiresConfirmation: true,
    maxDuration: 15,
  },
}

// ============================================================================
// Task Types
// ============================================================================

/**
 * Task status
 */
export type TaskStatus
  = | 'pending' // Not started
    | 'queued' // In queue, waiting for execution
    | 'running' // Currently executing
    | 'review' // Awaiting review
    | 'approved' // Review passed
    | 'rejected' // Review failed, needs rework
    | 'completed' // Successfully completed
    | 'failed' // Failed with error
    | 'cancelled' // Cancelled by user

/**
 * Task priority levels
 */
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'

/**
 * A single task in the workflow
 */
export interface WorkflowTask {
  /** Unique task identifier */
  id: string

  /** Parent task ID (for subtasks) */
  parentId?: string

  /** Task title */
  title: string

  /** Detailed description */
  description: string

  /** Current status */
  status: TaskStatus

  /** Priority level */
  priority: TaskPriority

  /** Estimated duration in minutes */
  estimatedMinutes: number

  /** Actual duration in minutes */
  actualMinutes?: number

  /** Dependencies (task IDs that must complete first) */
  dependencies: string[]

  /** Associated skill ID */
  skillId?: string

  /** Subagent state (when running) */
  subagentState?: SubagentState

  /** Review results */
  review?: TaskReview

  /** Task metadata */
  metadata: Record<string, any>

  /** Created timestamp */
  createdAt: Date

  /** Started timestamp */
  startedAt?: Date

  /** Completed timestamp */
  completedAt?: Date

  /** Error message (if failed) */
  error?: string

  /** Output/result of the task */
  output?: string

  /** Files modified by this task */
  modifiedFiles?: string[]
}

// ============================================================================
// Review Types
// ============================================================================

/**
 * Review stage
 */
export type ReviewStage = 'spec-compliance' | 'code-quality'

/**
 * Review severity levels
 */
export type ReviewSeverity = 'blocker' | 'major' | 'minor' | 'suggestion'

/**
 * Single review issue
 */
export interface ReviewIssue {
  /** Issue ID */
  id: string

  /** Review stage where issue was found */
  stage: ReviewStage

  /** Severity level */
  severity: ReviewSeverity

  /** Issue title */
  title: string

  /** Detailed description */
  description: string

  /** File path (if applicable) */
  filePath?: string

  /** Line number (if applicable) */
  lineNumber?: number

  /** Suggested fix */
  suggestion?: string

  /** Whether this issue is resolved */
  resolved: boolean
}

/**
 * Review result for a single stage
 */
export interface StageReviewResult {
  /** Review stage */
  stage: ReviewStage

  /** Whether the review passed */
  passed: boolean

  /** Issues found */
  issues: ReviewIssue[]

  /** Review summary */
  summary: string

  /** Reviewer notes */
  notes?: string

  /** Review timestamp */
  reviewedAt: Date
}

/**
 * Complete task review (both stages)
 */
export interface TaskReview {
  /** Task ID */
  taskId: string

  /** Stage 1: Spec compliance review */
  specCompliance?: StageReviewResult

  /** Stage 2: Code quality review */
  codeQuality?: StageReviewResult

  /** Overall review status */
  status: 'pending' | 'in-progress' | 'passed' | 'failed'

  /** Number of review iterations */
  iterations: number

  /** Maximum allowed iterations */
  maxIterations: number
}

// ============================================================================
// Workflow Session Types
// ============================================================================

/**
 * Workflow session status
 */
export type WorkflowStatus
  = | 'active' // Currently running
    | 'paused' // Paused by user
    | 'completed' // Successfully completed
    | 'failed' // Failed with error
    | 'cancelled' // Cancelled by user

/**
 * Workflow session - represents a complete development workflow
 */
export interface WorkflowSession {
  /** Unique session identifier */
  id: string

  /** Session name/title */
  name: string

  /** Session description */
  description: string

  /** Current workflow phase */
  currentPhase: WorkflowPhase

  /** Session status */
  status: WorkflowStatus

  /** All tasks in this workflow */
  tasks: WorkflowTask[]

  /** Phase history with timestamps */
  phaseHistory: PhaseTransition[]

  /** Git branch for this workflow */
  branch?: string

  /** Git worktree path */
  worktreePath?: string

  /** Associated skill IDs */
  skills: string[]

  /** Session metadata */
  metadata: Record<string, any>

  /** Created timestamp */
  createdAt: Date

  /** Last updated timestamp */
  updatedAt: Date

  /** Completed timestamp */
  completedAt?: Date

  /** Error message (if failed) */
  error?: string
}

/**
 * Phase transition record
 */
export interface PhaseTransition {
  /** From phase */
  from: WorkflowPhase | null

  /** To phase */
  to: WorkflowPhase

  /** Transition timestamp */
  timestamp: Date

  /** Reason for transition */
  reason?: string

  /** User who triggered transition */
  triggeredBy?: 'user' | 'auto' | 'system'
}

// ============================================================================
// Scheduler Types
// ============================================================================

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  /** Maximum concurrent tasks */
  maxConcurrent: number

  /** Default task timeout in minutes */
  defaultTimeout: number

  /** Whether to auto-retry failed tasks */
  autoRetry: boolean

  /** Maximum retry attempts */
  maxRetries: number

  /** Delay between retries in seconds */
  retryDelay: number

  /** Whether to use git worktrees for isolation */
  useWorktrees: boolean

  /** Worktree base path */
  worktreeBasePath?: string
}

/**
 * Default scheduler configuration
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  maxConcurrent: 3,
  defaultTimeout: 5,
  autoRetry: true,
  maxRetries: 2,
  retryDelay: 5,
  useWorktrees: true,
}

/**
 * Task execution context
 */
export interface TaskExecutionContext {
  /** Task being executed */
  task: WorkflowTask

  /** Workflow session */
  session: WorkflowSession

  /** Subagent configuration */
  subagentConfig: SubagentConfig

  /** Working directory */
  workingDir: string

  /** Environment variables */
  env: Record<string, string>

  /** Timeout in milliseconds */
  timeout: number
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Workflow event types
 */
export interface WorkflowEvents {
  /** Session created */
  'session:created': (session: WorkflowSession) => void

  /** Session status changed */
  'session:status': (session: WorkflowSession, oldStatus: WorkflowStatus, newStatus: WorkflowStatus) => void

  /** Phase changed */
  'phase:changed': (session: WorkflowSession, transition: PhaseTransition) => void

  /** Task created */
  'task:created': (session: WorkflowSession, task: WorkflowTask) => void

  /** Task status changed */
  'task:status': (session: WorkflowSession, task: WorkflowTask, oldStatus: TaskStatus, newStatus: TaskStatus) => void

  /** Task completed */
  'task:completed': (session: WorkflowSession, task: WorkflowTask) => void

  /** Task failed */
  'task:failed': (session: WorkflowSession, task: WorkflowTask, error: string) => void

  /** Review started */
  'review:started': (session: WorkflowSession, task: WorkflowTask, stage: ReviewStage) => void

  /** Review completed */
  'review:completed': (session: WorkflowSession, task: WorkflowTask, result: StageReviewResult) => void

  /** Workflow completed */
  'workflow:completed': (session: WorkflowSession) => void

  /** Workflow failed */
  'workflow:failed': (session: WorkflowSession, error: string) => void
}

// ============================================================================
// Persistence Types
// ============================================================================

/**
 * Workflow state for persistence
 */
export interface WorkflowPersistenceState {
  /** Version for migration */
  version: number

  /** Active sessions */
  sessions: WorkflowSession[]

  /** Last updated timestamp */
  lastUpdated: Date
}

/**
 * Current persistence version
 */
export const WORKFLOW_PERSISTENCE_VERSION = 1
