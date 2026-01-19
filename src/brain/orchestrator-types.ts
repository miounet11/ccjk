/**
 * CCJK Brain Orchestrator Type Definitions
 *
 * Defines types for the brain orchestrator system that coordinates
 * multiple AI agents to accomplish complex tasks through intelligent
 * task decomposition, parallel execution, and result aggregation.
 *
 * @module brain/orchestrator-types
 */

import type { AgentCapability, CloudAgent } from '../types/agent.js'
import type { AgentRole } from './types.js'

/**
 * Task priority levels
 *
 * Determines execution order when multiple tasks are ready.
 */
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low'

/**
 * Task execution status
 *
 * Tracks the lifecycle of a task through the system.
 */
export type TaskStatus
  = | 'pending' // Waiting to be executed
    | 'ready' // Dependencies satisfied, ready to execute
    | 'running' // Currently executing
    | 'completed' // Successfully completed
    | 'failed' // Execution failed
    | 'cancelled' // Cancelled by user or system
    | 'blocked' // Blocked by failed dependencies

/**
 * Agent execution status
 *
 * Tracks the state of an agent instance.
 */
export type AgentStatus
  = | 'idle' // Not currently executing
    | 'busy' // Executing a task
    | 'error' // Encountered an error
    | 'terminated' // Shut down

/**
 * Conflict resolution strategy
 *
 * Determines how to handle conflicting results from multiple agents.
 */
export type ConflictResolutionStrategy
  = | 'first-wins' // Use first completed result
    | 'last-wins' // Use last completed result
    | 'vote' // Use majority vote
    | 'merge' // Attempt to merge results
    | 'manual' // Require manual resolution
    | 'highest-confidence' // Use result with highest confidence score

/**
 * Task dependency type
 *
 * Defines the relationship between tasks.
 */
export type DependencyType
  = | 'sequential' // Must complete before dependent task starts
    | 'data' // Provides data to dependent task
    | 'conditional' // Dependent task only runs if condition met
    | 'parallel' // Can run in parallel but must complete before dependent

/**
 * Task decomposition strategy
 *
 * Determines how complex tasks are broken down.
 */
export type DecompositionStrategy
  = | 'sequential' // Break into sequential steps
    | 'parallel' // Break into parallel subtasks
    | 'hierarchical' // Break into nested subtasks
    | 'pipeline' // Break into data pipeline stages
    | 'map-reduce' // Break into map and reduce phases

/**
 * Task definition
 *
 * Represents a unit of work to be executed by an agent.
 */
export interface Task {
  /** Unique task identifier */
  id: string

  /** Human-readable task name */
  name: string

  /** Detailed task description */
  description: string

  /** Task type/category */
  type: string

  /** Task priority */
  priority: TaskPriority

  /** Current execution status */
  status: TaskStatus

  /** Required capabilities to execute this task */
  requiredCapabilities: AgentCapability[]

  /** Task input data */
  input: TaskInput

  /** Task output data (populated after completion) */
  output?: TaskOutput

  /** Task dependencies */
  dependencies: TaskDependency[]

  /** Estimated execution time in milliseconds */
  estimatedDuration?: number

  /** Actual execution time in milliseconds */
  actualDuration?: number

  /** Maximum retry attempts */
  maxRetries: number

  /** Current retry count */
  retryCount: number

  /** Timeout in milliseconds */
  timeout?: number

  /** Task metadata */
  metadata: TaskMetadata

  /** Assigned agent ID */
  assignedAgentId?: string

  /** Task creation timestamp */
  createdAt: string

  /** Task start timestamp */
  startedAt?: string

  /** Task completion timestamp */
  completedAt?: string

  /** Error information (if failed) */
  error?: TaskError

  /** Task progress (0-100) */
  progress: number

  /** Child tasks (for hierarchical decomposition) */
  children?: Task[]

  /** Parent task ID (for hierarchical decomposition) */
  parentId?: string
}

/**
 * Task input data
 *
 * Data provided to the task for execution.
 */
export interface TaskInput {
  /** Input parameters */
  parameters: Record<string, unknown>

  /** Input files */
  files?: string[]

  /** Context from previous tasks */
  context?: Record<string, unknown>

  /** User instructions */
  instructions?: string

  /** Additional constraints */
  constraints?: string[]
}

/**
 * Task output data
 *
 * Results produced by task execution.
 */
export interface TaskOutput {
  /** Output data */
  data: Record<string, unknown>

  /** Generated files */
  files?: string[]

  /** Output artifacts */
  artifacts?: TaskArtifact[]

  /** Execution logs */
  logs?: string[]

  /** Confidence score (0-1) */
  confidence?: number

  /** Output metadata */
  metadata?: Record<string, unknown>
}

/**
 * Task artifact
 *
 * A file or resource produced by task execution.
 */
export interface TaskArtifact {
  /** Artifact type */
  type: 'file' | 'directory' | 'url' | 'data'

  /** Artifact path or URL */
  path: string

  /** Artifact description */
  description?: string

  /** MIME type */
  mimeType?: string

  /** File size in bytes */
  size?: number

  /** Checksum */
  checksum?: string
}

/**
 * Task dependency
 *
 * Defines a dependency relationship between tasks.
 */
export interface TaskDependency {
  /** ID of the task this depends on */
  taskId: string

  /** Dependency type */
  type: DependencyType

  /** Whether this is a required dependency */
  required: boolean

  /** Condition for conditional dependencies */
  condition?: DependencyCondition

  /** Data mapping for data dependencies */
  dataMapping?: Record<string, string>
}

/**
 * Dependency condition
 *
 * Condition that must be met for a conditional dependency.
 */
export interface DependencyCondition {
  /** Field to check */
  field: string

  /** Comparison operator */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains'

  /** Value to compare against */
  value: unknown
}

/**
 * Task metadata
 *
 * Additional information about the task.
 */
export interface TaskMetadata {
  /** Task tags */
  tags: string[]

  /** Task category */
  category?: string

  /** User who created the task */
  createdBy?: string

  /** Custom metadata */
  custom?: Record<string, unknown>
}

/**
 * Task error
 *
 * Information about a task execution error.
 */
export interface TaskError {
  /** Error code */
  code: string

  /** Error message */
  message: string

  /** Error stack trace */
  stack?: string

  /** Whether error is recoverable */
  recoverable: boolean

  /** Suggested recovery action */
  recoveryAction?: string

  /** Original error object */
  originalError?: unknown
}

/**
 * Agent instance
 *
 * A running instance of an agent.
 */
export interface AgentInstance {
  /** Instance identifier */
  id: string

  /** Agent role */
  role: AgentRole

  /** Agent definition */
  agent: CloudAgent

  /** Current status */
  status: AgentStatus

  /** Currently executing task */
  currentTask?: Task

  /** Task execution history */
  taskHistory: TaskExecutionRecord[]

  /** Agent capabilities */
  capabilities: AgentCapability[]

  /** Agent performance metrics */
  metrics: AgentMetrics

  /** Instance creation timestamp */
  createdAt: string

  /** Last activity timestamp */
  lastActivityAt?: string

  /** Instance configuration */
  config: AgentInstanceConfig
}

/**
 * Agent instance configuration
 *
 * Configuration for an agent instance.
 */
export interface AgentInstanceConfig {
  /** Maximum concurrent tasks */
  maxConcurrentTasks: number

  /** Task timeout in milliseconds */
  taskTimeout: number

  /** Enable detailed logging */
  verboseLogging: boolean

  /** Custom configuration */
  custom?: Record<string, unknown>
}

/**
 * Task execution record
 *
 * Historical record of a task execution.
 */
export interface TaskExecutionRecord {
  /** Task ID */
  taskId: string

  /** Task name */
  taskName: string

  /** Execution status */
  status: TaskStatus

  /** Start timestamp */
  startedAt: string

  /** Completion timestamp */
  completedAt?: string

  /** Execution duration in milliseconds */
  duration?: number

  /** Whether execution succeeded */
  success: boolean

  /** Error message (if failed) */
  error?: string
}

/**
 * Agent performance metrics
 *
 * Performance statistics for an agent instance.
 */
export interface AgentMetrics {
  /** Total tasks executed */
  tasksExecuted: number

  /** Tasks completed successfully */
  tasksSucceeded: number

  /** Tasks failed */
  tasksFailed: number

  /** Average task duration in milliseconds */
  avgTaskDuration: number

  /** Success rate (0-1) */
  successRate: number

  /** Total execution time in milliseconds */
  totalExecutionTime: number

  /** Average confidence score */
  avgConfidence: number

  /** Last updated timestamp */
  lastUpdated: string
}

/**
 * Orchestration plan
 *
 * A plan for executing a complex task through multiple agents.
 */
export interface OrchestrationPlan {
  /** Plan identifier */
  id: string

  /** Plan name */
  name: string

  /** Plan description */
  description: string

  /** Root task */
  rootTask: Task

  /** All tasks in the plan */
  tasks: Task[]

  /** Task execution graph */
  executionGraph: TaskExecutionGraph

  /** Required agents */
  requiredAgents: AgentRequirement[]

  /** Decomposition strategy used */
  decompositionStrategy: DecompositionStrategy

  /** Estimated total duration in milliseconds */
  estimatedDuration: number

  /** Plan creation timestamp */
  createdAt: string

  /** Plan metadata */
  metadata: Record<string, unknown>
}

/**
 * Task execution graph
 *
 * Directed acyclic graph representing task dependencies.
 */
export interface TaskExecutionGraph {
  /** Graph nodes (tasks) */
  nodes: TaskGraphNode[]

  /** Graph edges (dependencies) */
  edges: TaskGraphEdge[]

  /** Execution stages (for parallel execution) */
  stages: TaskStage[]
}

/**
 * Task graph node
 *
 * A node in the task execution graph.
 */
export interface TaskGraphNode {
  /** Task ID */
  taskId: string

  /** Node level in the graph */
  level: number

  /** Whether this is a leaf node */
  isLeaf: boolean

  /** Whether this is a root node */
  isRoot: boolean

  /** Incoming edges */
  incomingEdges: string[]

  /** Outgoing edges */
  outgoingEdges: string[]
}

/**
 * Task graph edge
 *
 * An edge in the task execution graph.
 */
export interface TaskGraphEdge {
  /** Edge identifier */
  id: string

  /** Source task ID */
  from: string

  /** Target task ID */
  to: string

  /** Dependency type */
  type: DependencyType

  /** Edge weight (for optimization) */
  weight: number
}

/**
 * Task execution stage
 *
 * A stage in the execution plan where tasks can run in parallel.
 */
export interface TaskStage {
  /** Stage number */
  stage: number

  /** Tasks in this stage */
  tasks: string[]

  /** Estimated stage duration */
  estimatedDuration: number
}

/**
 * Agent requirement
 *
 * Specification for an agent needed to execute the plan.
 */
export interface AgentRequirement {
  /** Required capabilities */
  capabilities: AgentCapability[]

  /** Minimum number of instances */
  minInstances: number

  /** Maximum number of instances */
  maxInstances: number

  /** Preferred agent IDs */
  preferredAgents?: string[]

  /** Required tools */
  requiredTools?: string[]
}

/**
 * Orchestration result
 *
 * Result of executing an orchestration plan.
 */
export interface OrchestrationResult {
  /** Plan ID */
  planId: string

  /** Whether execution succeeded */
  success: boolean

  /** Execution status */
  status: 'completed' | 'partial' | 'failed' | 'cancelled'

  /** Completed tasks */
  completedTasks: string[]

  /** Failed tasks */
  failedTasks: string[]

  /** Cancelled tasks */
  cancelledTasks: string[]

  /** Aggregated results */
  results: Record<string, TaskOutput>

  /** Execution metrics */
  metrics: OrchestrationMetrics

  /** Execution errors */
  errors: TaskError[]

  /** Execution warnings */
  warnings: string[]

  /** Start timestamp */
  startedAt: string

  /** Completion timestamp */
  completedAt?: string

  /** Total duration in milliseconds */
  duration?: number
}

/**
 * Orchestration metrics
 *
 * Performance metrics for an orchestration execution.
 */
export interface OrchestrationMetrics {
  /** Total tasks */
  totalTasks: number

  /** Tasks completed */
  tasksCompleted: number

  /** Tasks failed */
  tasksFailed: number

  /** Tasks cancelled */
  tasksCancelled: number

  /** Success rate */
  successRate: number

  /** Average task duration */
  avgTaskDuration: number

  /** Total execution time */
  totalExecutionTime: number

  /** Parallel efficiency (0-1) */
  parallelEfficiency: number

  /** Agent utilization (0-1) */
  agentUtilization: number
}

/**
 * Conflict resolution context
 *
 * Context for resolving conflicts between task results.
 */
export interface ConflictResolutionContext {
  /** Conflicting task IDs */
  conflictingTasks: string[]

  /** Conflicting results */
  results: TaskOutput[]

  /** Resolution strategy */
  strategy: ConflictResolutionStrategy

  /** Conflict type */
  conflictType: 'data' | 'file' | 'decision' | 'state'

  /** Conflict description */
  description: string

  /** Resolution metadata */
  metadata?: Record<string, unknown>
}

/**
 * Conflict resolution result
 *
 * Result of resolving a conflict.
 */
export interface ConflictResolutionResult {
  /** Whether conflict was resolved */
  resolved: boolean

  /** Resolved result */
  result?: TaskOutput

  /** Resolution method used */
  method: string

  /** Confidence in resolution (0-1) */
  confidence: number

  /** Resolution explanation */
  explanation?: string

  /** Discarded results */
  discarded?: TaskOutput[]
}

/**
 * Orchestrator configuration
 *
 * Configuration for the brain orchestrator.
 */
export interface OrchestratorConfig {
  /** Maximum concurrent tasks */
  maxConcurrentTasks: number

  /** Maximum concurrent agents */
  maxConcurrentAgents: number

  /** Default task timeout in milliseconds */
  defaultTaskTimeout: number

  /** Default task retry count */
  defaultRetryCount: number

  /** Enable automatic retry on failure */
  autoRetry: boolean

  /** Conflict resolution strategy */
  conflictResolutionStrategy: ConflictResolutionStrategy

  /** Enable parallel execution */
  enableParallelExecution: boolean

  /** Enable task result caching */
  enableCaching: boolean

  /** Cache TTL in milliseconds */
  cacheTtl: number

  /** Enable detailed logging */
  verboseLogging: boolean

  /** Custom configuration */
  custom?: Record<string, unknown>
}

/**
 * Orchestrator state
 *
 * Current state of the orchestrator.
 */
export interface OrchestratorState {
  /** Current orchestration plan */
  currentPlan?: OrchestrationPlan

  /** Active tasks */
  activeTasks: Map<string, Task>

  /** Active agents */
  activeAgents: Map<string, AgentInstance>

  /** Task queue */
  taskQueue: Task[]

  /** Completed tasks */
  completedTasks: Map<string, Task>

  /** Failed tasks */
  failedTasks: Map<string, Task>

  /** Orchestrator status */
  status: 'idle' | 'planning' | 'executing' | 'paused' | 'error'

  /** Execution start time */
  startTime?: string

  /** Total tasks processed */
  totalTasksProcessed: number

  /** Current metrics */
  metrics: OrchestrationMetrics
}

/**
 * Task decomposition result
 *
 * Result of decomposing a complex task.
 */
export interface TaskDecompositionResult {
  /** Original task */
  originalTask: Task

  /** Decomposed subtasks */
  subtasks: Task[]

  /** Task dependencies */
  dependencies: TaskDependency[]

  /** Decomposition strategy used */
  strategy: DecompositionStrategy

  /** Execution graph */
  executionGraph: TaskExecutionGraph

  /** Estimated total duration */
  estimatedDuration: number

  /** Decomposition metadata */
  metadata: Record<string, unknown>
}

/**
 * Agent selection criteria
 *
 * Criteria for selecting an agent to execute a task.
 */
export interface AgentSelectionCriteria {
  /** Required capabilities */
  requiredCapabilities: AgentCapability[]

  /** Preferred agent IDs */
  preferredAgents?: string[]

  /** Minimum success rate */
  minSuccessRate?: number

  /** Maximum current load */
  maxCurrentLoad?: number

  /** Selection strategy */
  strategy: 'best-fit' | 'least-loaded' | 'round-robin' | 'random' | 'fastest'
}

/**
 * Agent selection result
 *
 * Result of agent selection.
 */
export interface AgentSelectionResult {
  /** Selected agent */
  agent: AgentInstance

  /** Selection score */
  score: number

  /** Selection reason */
  reason: string

  /** Alternative agents */
  alternatives?: AgentInstance[]
}
