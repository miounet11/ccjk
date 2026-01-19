/**
 * Hook System Type Definitions
 *
 * Defines types for the CCJK hook execution system, enabling
 * extensible event-driven workflows and tool integrations.
 *
 * @module utils/hooks/types
 */

import type { SupportedLang } from '../../constants.js'

/**
 * Hook type enumeration
 *
 * Defines the lifecycle events where hooks can be attached.
 */
export type HookType
  = | 'pre-tool-use' // Before a tool is executed
    | 'post-tool-use' // After a tool completes
    | 'skill-activate' // When a skill is activated
    | 'skill-complete' // When a skill completes
    | 'workflow-start' // When a workflow starts
    | 'workflow-complete' // When a workflow completes
    | 'config-change' // When configuration changes
    | 'error' // When an error occurs
    | 'task-start' // When a task starts (for notifications)
    | 'task-complete' // When a task completes (for notifications)
    | 'task-failed' // When a task fails (for notifications)
    | 'task-progress' // When task progress is updated (for notifications)

/**
 * Hook execution priority (1-10)
 *
 * Higher priority hooks execute first.
 * Default priority is 5.
 */
export type HookPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

/**
 * Hook execution status
 */
export type HookStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'timeout'

/**
 * Hook context
 *
 * Provides environmental and contextual information for hook execution.
 */
export interface HookContext {
  /** Hook type being executed */
  type: HookType

  /** Tool name (for tool-related hooks) */
  tool?: string

  /** Tool arguments (for tool-related hooks) */
  toolArgs?: Record<string, unknown>

  /** Skill ID (for skill-related hooks) */
  skillId?: string

  /** Workflow ID (for workflow-related hooks) */
  workflowId?: string

  /** Configuration key (for config-related hooks) */
  configKey?: string

  /** Error object (for error hooks) */
  error?: Error

  /** Task ID (for task-related hooks) */
  taskId?: string

  /** Task description (for task-related hooks) */
  taskDescription?: string

  /** Task result (for task-complete hooks) */
  taskResult?: string

  /** Task duration in milliseconds (for task-related hooks) */
  taskDuration?: number

  /** User's preferred language */
  lang?: SupportedLang

  /** Current working directory */
  cwd?: string

  /** Additional metadata */
  metadata?: Record<string, unknown>

  /** Timestamp when context was created */
  timestamp: Date
}

/**
 * Hook execution result
 *
 * Contains information about the outcome of a hook execution.
 */
export interface HookResult {
  /** Whether hook executed successfully */
  success: boolean

  /** Hook execution status */
  status: HookStatus

  /** Hook execution duration in milliseconds */
  durationMs: number

  /** Output data from hook (if any) */
  output?: unknown

  /** Error message (if failed) */
  error?: string

  /** Whether to continue executing remaining hooks */
  continueChain: boolean

  /** Modified context (hooks can modify context for subsequent hooks) */
  modifiedContext?: Partial<HookContext>
}

/**
 * Hook chain execution result
 *
 * Contains aggregated results from executing multiple hooks.
 */
export interface HookChainResult {
  /** Whether all hooks executed successfully */
  success: boolean

  /** Total execution duration in milliseconds */
  totalDurationMs: number

  /** Individual hook results */
  results: Array<{
    hookId: string
    result: HookResult
  }>

  /** Number of hooks executed */
  executedCount: number

  /** Number of hooks skipped */
  skippedCount: number

  /** Number of hooks failed */
  failedCount: number

  /** Final context after all hooks */
  finalContext: HookContext
}

/**
 * Hook condition
 *
 * Defines when a hook should be executed based on context matching.
 */
export interface HookCondition {
  /** Tool name pattern (supports wildcards) */
  tool?: string | RegExp

  /** Skill ID pattern (supports wildcards) */
  skillId?: string | RegExp

  /** Workflow ID pattern (supports wildcards) */
  workflowId?: string | RegExp

  /** Configuration key pattern (supports wildcards) */
  configKey?: string | RegExp

  /** Custom condition function */
  custom?: (context: HookContext) => boolean | Promise<boolean>
}

/**
 * Hook action
 *
 * Defines the action to be executed when a hook is triggered.
 */
export interface HookAction {
  /**
   * Hook action function
   *
   * @param context - Hook execution context
   * @returns Hook result or void (void is treated as success)
   */
  execute: (context: HookContext) => Promise<HookResult | void> | HookResult | void

  /**
   * Timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number

  /**
   * Whether to continue chain on error
   * @default true
   */
  continueOnError?: boolean
}

/**
 * Hook definition
 *
 * Complete definition of a hook including metadata, conditions, and actions.
 */
export interface Hook {
  /** Unique hook identifier */
  id: string

  /** Hook name */
  name: string

  /** Hook description */
  description?: string

  /** Hook type */
  type: HookType

  /**
   * Hook priority (1-10)
   * Higher priority hooks execute first
   * @default 5
   */
  priority?: HookPriority

  /** Condition for hook execution */
  condition?: HookCondition

  /** Hook action */
  action: HookAction

  /** Whether hook is enabled */
  enabled: boolean

  /** Hook source (builtin, plugin, user) */
  source: 'builtin' | 'plugin' | 'user'

  /** Hook version */
  version?: string

  /** Hook author */
  author?: string

  /** Tags for categorization */
  tags?: string[]

  /** Hook metadata */
  metadata?: Record<string, unknown>
}

/**
 * Hook registration options
 *
 * Options for registering a hook in the registry.
 */
export interface HookRegistrationOptions {
  /** Whether to overwrite existing hook with same ID */
  overwrite?: boolean

  /** Whether to enable hook immediately */
  enabled?: boolean

  /** Source identifier (e.g., plugin name) */
  source?: string
}

/**
 * Hook registry entry
 *
 * Represents a hook in the registry with additional metadata.
 */
export interface HookRegistryEntry {
  /** Hook definition */
  hook: Hook

  /** Registration timestamp */
  registeredAt: Date

  /** Source identifier (e.g., plugin name, 'builtin', 'user') */
  source: string

  /** Number of times hook has been executed */
  executionCount: number

  /** Number of times hook has failed */
  failureCount: number

  /** Last execution timestamp */
  lastExecutedAt?: Date

  /** Last execution result */
  lastResult?: HookResult
}

/**
 * Hook registry state
 *
 * Complete state of the hook registry.
 */
export interface HookRegistryState {
  /** Registry version */
  version: string

  /** All registered hooks */
  hooks: Map<string, HookRegistryEntry>

  /** Hooks indexed by type */
  hooksByType: Map<HookType, string[]>

  /** Hooks indexed by tool */
  hooksByTool: Map<string, string[]>

  /** Last updated timestamp */
  lastUpdated: Date
}

/**
 * Hook execution options
 *
 * Options for executing a hook or hook chain.
 */
export interface HookExecutionOptions {
  /**
   * Timeout in milliseconds
   * Overrides individual hook timeouts
   */
  timeout?: number

  /**
   * Whether to stop chain on first error
   * @default false
   */
  stopOnError?: boolean

  /**
   * Whether to execute hooks in parallel
   * @default false (sequential execution)
   */
  parallel?: boolean

  /**
   * Maximum number of parallel executions
   * Only used when parallel is true
   * @default 5
   */
  maxParallel?: number

  /**
   * Whether to skip disabled hooks
   * @default true
   */
  skipDisabled?: boolean
}

/**
 * Hook filter options
 *
 * Options for filtering hooks in the registry.
 */
export interface HookFilterOptions {
  /** Filter by hook type */
  type?: HookType

  /** Filter by tool name */
  tool?: string

  /** Filter by skill ID */
  skillId?: string

  /** Filter by workflow ID */
  workflowId?: string

  /** Filter by enabled status */
  enabled?: boolean

  /** Filter by source */
  source?: 'builtin' | 'plugin' | 'user'

  /** Filter by tags (AND logic) */
  tags?: string[]

  /** Filter by priority range */
  priorityRange?: {
    min?: HookPriority
    max?: HookPriority
  }
}

/**
 * Hook statistics
 *
 * Statistical information about hook executions.
 */
export interface HookStatistics {
  /** Total number of registered hooks */
  totalHooks: number

  /** Number of enabled hooks */
  enabledHooks: number

  /** Number of disabled hooks */
  disabledHooks: number

  /** Total executions across all hooks */
  totalExecutions: number

  /** Total failures across all hooks */
  totalFailures: number

  /** Average execution time in milliseconds */
  averageExecutionMs: number

  /** Hooks by type */
  hooksByType: Record<HookType, number>

  /** Hooks by source */
  hooksBySource: Record<string, number>

  /** Most executed hooks */
  mostExecuted: Array<{
    hookId: string
    executionCount: number
  }>

  /** Most failed hooks */
  mostFailed: Array<{
    hookId: string
    failureCount: number
  }>
}

/**
 * Hook error
 *
 * Custom error type for hook-related errors.
 */
export class HookError extends Error {
  constructor(
    message: string,
    public readonly hookId: string,
    public readonly context: HookContext,
    public readonly originalError?: Error,
  ) {
    super(message)
    this.name = 'HookError'
  }
}

/**
 * Hook timeout error
 *
 * Error thrown when a hook execution times out.
 */
export class HookTimeoutError extends HookError {
  constructor(
    hookId: string,
    timeout: number,
    context: HookContext,
  ) {
    super(`Hook '${hookId}' timed out after ${timeout}ms`, hookId, context)
    this.name = 'HookTimeoutError'
  }
}
