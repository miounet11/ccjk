/**
 * CCJK Orchestrator Type Definitions
 *
 * Comprehensive type system for the orchestrator module including:
 * - Task management and execution
 * - Agent coordination and communication
 * - Workflow orchestration
 * - Hook system
 * - MCP integration
 * - State management
 * - Error handling
 *
 * @module orchestrator/types
 */

// ============================================================================
// Task Types
// ============================================================================

/**
 * Supported task types in the orchestrator
 */
export type TaskType = 'skill' | 'agent' | 'workflow' | 'hook' | 'mcp'

/**
 * Task execution status
 */
export type TaskStatus =
  | 'pending'    // Task is queued but not started
  | 'running'    // Task is currently executing
  | 'completed'  // Task finished successfully
  | 'failed'     // Task encountered an error
  | 'cancelled'  // Task was cancelled before completion
  | 'skipped'    // Task was skipped due to conditions

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

/**
 * Base task interface
 */
export interface Task {
  /** Unique task identifier */
  id: string

  /** Task type */
  type: TaskType

  /** Human-readable task name */
  name: string

  /** Detailed task description */
  description?: string

  /** Current execution status */
  status: TaskStatus

  /** Task priority */
  priority: TaskPriority

  /** Task dependencies (IDs of tasks that must complete first) */
  dependencies: string[]

  /** Task input data */
  input: Record<string, unknown>

  /** Task output data (populated after execution) */
  output?: Record<string, unknown>

  /** Error information if task failed */
  error?: TaskError

  /** Task metadata */
  metadata: TaskMetadata

  /** Retry configuration */
  retry?: RetryConfig

  /** Timeout in milliseconds */
  timeout?: number

  /** Condition for task execution */
  condition?: TaskCondition
}

/**
 * Task metadata
 */
export interface TaskMetadata {
  /** Task creation timestamp */
  createdAt: Date

  /** Task start timestamp */
  startedAt?: Date

  /** Task completion timestamp */
  completedAt?: Date

  /** Task duration in milliseconds */
  duration?: number

  /** Number of retry attempts */
  retryCount: number

  /** Agent or executor that ran the task */
  executor?: string

  /** Additional custom metadata */
  custom?: Record<string, unknown>
}

/**
 * Task error information
 */
export interface TaskError {
  /** Error code */
  code: string

  /** Error message */
  message: string

  /** Error stack trace */
  stack?: string

  /** Original error object */
  original?: Error

  /** Whether error is recoverable */
  recoverable: boolean
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number

  /** Delay between retries in milliseconds */
  delay: number

  /** Backoff strategy */
  backoff: 'fixed' | 'exponential' | 'linear'

  /** Maximum delay for exponential backoff */
  maxDelay?: number

  /** Retry only on specific error codes */
  retryOn?: string[]
}

/**
 * Task execution condition
 */
export interface TaskCondition {
  /** Condition type */
  type: 'always' | 'on_success' | 'on_failure' | 'custom'

  /** Custom condition function (for type='custom') */
  evaluate?: (context: ExecutionContext) => boolean | Promise<boolean>
}

// ============================================================================
// Agent Types
// ============================================================================

/**
 * Agent role in the orchestrator
 */
export type AgentRole =
  | 'coordinator'  // Manages overall workflow
  | 'executor'     // Executes specific tasks
  | 'monitor'      // Monitors execution and health
  | 'optimizer'    // Optimizes performance and resources

/**
 * Agent status
 */
export type AgentStatus =
  | 'idle'         // Agent is available
  | 'busy'         // Agent is executing a task
  | 'paused'       // Agent is temporarily paused
  | 'stopped'      // Agent is stopped
  | 'error'        // Agent encountered an error

/**
 * Agent capability
 */
export interface AgentCapability {
  /** Capability name */
  name: string

  /** Capability version */
  version: string

  /** Supported task types */
  supportedTaskTypes: TaskType[]

  /** Maximum concurrent tasks */
  maxConcurrency: number

  /** Additional capability metadata */
  metadata?: Record<string, unknown>
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Agent unique identifier */
  id: string

  /** Agent name */
  name: string

  /** Agent role */
  role: AgentRole

  /** Agent capabilities */
  capabilities: AgentCapability[]

  /** Maximum concurrent tasks */
  maxConcurrentTasks: number

  /** Agent-specific configuration */
  config?: Record<string, unknown>
}

/**
 * Agent instance
 */
export interface Agent {
  /** Agent configuration */
  config: AgentConfig

  /** Current agent status */
  status: AgentStatus

  /** Currently executing tasks */
  activeTasks: string[]

  /** Agent statistics */
  stats: AgentStats

  /** Execute a task */
  execute: (task: Task, context: ExecutionContext) => Promise<TaskResult>

  /** Pause agent execution */
  pause: () => Promise<void>

  /** Resume agent execution */
  resume: () => Promise<void>

  /** Stop agent */
  stop: () => Promise<void>

  /** Check if agent can handle task */
  canHandle: (task: Task) => boolean
}

/**
 * Agent statistics
 */
export interface AgentStats {
  /** Total tasks executed */
  tasksExecuted: number

  /** Total tasks failed */
  tasksFailed: number

  /** Total execution time in milliseconds */
  totalExecutionTime: number

  /** Average execution time in milliseconds */
  averageExecutionTime: number

  /** Last activity timestamp */
  lastActivity?: Date
}

// ============================================================================
// Workflow Types
// ============================================================================

/**
 * Workflow execution strategy
 */
export type WorkflowStrategy =
  | 'sequential'   // Execute tasks one by one
  | 'parallel'     // Execute all tasks concurrently
  | 'dag'          // Execute based on dependency graph
  | 'dynamic'      // Determine execution order dynamically

/**
 * Workflow status
 */
export type WorkflowStatus =
  | 'pending'      // Workflow not started
  | 'running'      // Workflow is executing
  | 'completed'    // Workflow finished successfully
  | 'failed'       // Workflow encountered an error
  | 'cancelled'    // Workflow was cancelled
  | 'paused'       // Workflow is paused

/**
 * Workflow definition
 */
export interface Workflow {
  /** Unique workflow identifier */
  id: string

  /** Workflow name */
  name: string

  /** Workflow description */
  description?: string

  /** Workflow version */
  version: string

  /** Execution strategy */
  strategy: WorkflowStrategy

  /** Tasks in the workflow */
  tasks: Task[]

  /** Workflow-level hooks */
  hooks?: WorkflowHooks

  /** Workflow configuration */
  config?: WorkflowConfig

  /** Workflow metadata */
  metadata?: Record<string, unknown>
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  /** Maximum execution time in milliseconds */
  timeout?: number

  /** Maximum retry attempts for the entire workflow */
  maxRetries?: number

  /** Continue on task failure */
  continueOnError?: boolean

  /** Maximum concurrent tasks (for parallel strategy) */
  maxConcurrency?: number

  /** Workflow-specific settings */
  settings?: Record<string, unknown>
}

/**
 * Workflow execution instance
 */
export interface WorkflowExecution {
  /** Execution unique identifier */
  id: string

  /** Workflow being executed */
  workflow: Workflow

  /** Current execution status */
  status: WorkflowStatus

  /** Execution context */
  context: ExecutionContext

  /** Task execution results */
  taskResults: Map<string, TaskResult>

  /** Execution start time */
  startedAt?: Date

  /** Execution completion time */
  completedAt?: Date

  /** Execution duration in milliseconds */
  duration?: number

  /** Execution error if failed */
  error?: TaskError
}

/**
 * Workflow hooks
 */
export interface WorkflowHooks {
  /** Called before workflow starts */
  onStart?: (context: ExecutionContext) => Promise<void> | void

  /** Called before each task */
  onTaskStart?: (task: Task, context: ExecutionContext) => Promise<void> | void

  /** Called after each task */
  onTaskComplete?: (task: Task, result: TaskResult, context: ExecutionContext) => Promise<void> | void

  /** Called when a task fails */
  onTaskError?: (task: Task, error: TaskError, context: ExecutionContext) => Promise<void> | void

  /** Called when workflow completes */
  onComplete?: (context: ExecutionContext) => Promise<void> | void

  /** Called when workflow fails */
  onError?: (error: TaskError, context: ExecutionContext) => Promise<void> | void

  /** Called when workflow is cancelled */
  onCancel?: (context: ExecutionContext) => Promise<void> | void
}

// ============================================================================
// Execution Types
// ============================================================================

/**
 * Execution context shared across tasks and agents
 */
export interface ExecutionContext {
  /** Execution unique identifier */
  executionId: string

  /** Workflow being executed */
  workflowId: string

  /** Shared state across tasks */
  state: Map<string, unknown>

  /** Execution variables */
  variables: Record<string, unknown>

  /** Logger instance */
  logger: Logger

  /** Event emitter for execution events */
  events: EventEmitter

  /** Abort signal for cancellation */
  signal: AbortSignal

  /** Parent execution context (for nested workflows) */
  parent?: ExecutionContext
}

/**
 * Task execution result
 */
export interface TaskResult {
  /** Task that was executed */
  taskId: string

  /** Execution status */
  status: TaskStatus

  /** Output data */
  output?: Record<string, unknown>

  /** Error if task failed */
  error?: TaskError

  /** Execution duration in milliseconds */
  duration: number

  /** Number of retry attempts */
  retryCount: number

  /** Additional result metadata */
  metadata?: Record<string, unknown>
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Hook execution phase
 */
export type HookPhase =
  | 'before'       // Before main action
  | 'after'        // After main action
  | 'error'        // On error
  | 'finally'      // Always executed

/**
 * Hook definition
 */
export interface Hook {
  /** Hook unique identifier */
  id: string

  /** Hook name */
  name: string

  /** Execution phase */
  phase: HookPhase

  /** Hook priority (higher = earlier execution) */
  priority: number

  /** Hook handler function */
  handler: HookHandler

  /** Hook condition */
  condition?: (context: ExecutionContext) => boolean | Promise<boolean>

  /** Hook metadata */
  metadata?: Record<string, unknown>
}

/**
 * Hook handler function
 */
export type HookHandler = (
  context: ExecutionContext,
  data?: unknown
) => Promise<void> | void

// ============================================================================
// MCP Integration Types
// ============================================================================

/**
 * MCP service configuration
 */
export interface MCPServiceConfig {
  /** Service name */
  name: string

  /** Service command */
  command: string

  /** Service arguments */
  args?: string[]

  /** Environment variables */
  env?: Record<string, string>

  /** Service metadata */
  metadata?: Record<string, unknown>
}

/**
 * MCP task configuration
 */
export interface MCPTask extends Task {
  type: 'mcp'

  /** MCP service to use */
  service: string

  /** MCP tool to invoke */
  tool: string

  /** Tool parameters */
  parameters: Record<string, unknown>
}

// ============================================================================
// State Management Types
// ============================================================================

/**
 * Orchestrator state
 */
export interface OrchestratorState {
  /** Active workflow executions */
  executions: Map<string, WorkflowExecution>

  /** Registered agents */
  agents: Map<string, Agent>

  /** Registered workflows */
  workflows: Map<string, Workflow>

  /** Registered hooks */
  hooks: Map<string, Hook[]>

  /** Global configuration */
  config: OrchestratorConfig

  /** Orchestrator statistics */
  stats: OrchestratorStats
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** Maximum concurrent workflow executions */
  maxConcurrentExecutions: number

  /** Maximum concurrent tasks per workflow */
  maxConcurrentTasks: number

  /** Default task timeout in milliseconds */
  defaultTaskTimeout: number

  /** Default workflow timeout in milliseconds */
  defaultWorkflowTimeout: number

  /** Enable execution persistence */
  persistExecutions: boolean

  /** Execution history retention in days */
  retentionDays: number

  /** Additional configuration */
  custom?: Record<string, unknown>
}

/**
 * Orchestrator statistics
 */
export interface OrchestratorStats {
  /** Total workflows executed */
  workflowsExecuted: number

  /** Total workflows failed */
  workflowsFailed: number

  /** Total tasks executed */
  tasksExecuted: number

  /** Total tasks failed */
  tasksFailed: number

  /** Average workflow execution time */
  averageWorkflowTime: number

  /** Average task execution time */
  averageTaskTime: number

  /** Uptime in milliseconds */
  uptime: number
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Orchestrator event types
 */
export type OrchestratorEventType =
  | 'workflow:start'
  | 'workflow:complete'
  | 'workflow:error'
  | 'workflow:cancel'
  | 'task:start'
  | 'task:complete'
  | 'task:error'
  | 'task:retry'
  | 'agent:register'
  | 'agent:unregister'
  | 'agent:status'
  | 'hook:execute'

/**
 * Orchestrator event
 */
export interface OrchestratorEvent {
  /** Event type */
  type: OrchestratorEventType

  /** Event timestamp */
  timestamp: Date

  /** Event data */
  data: unknown

  /** Execution context */
  context?: ExecutionContext
}

// ============================================================================
// Logger Types
// ============================================================================

/**
 * Log level
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Logger interface
 */
export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void
  info: (message: string, meta?: Record<string, unknown>) => void
  warn: (message: string, meta?: Record<string, unknown>) => void
  error: (message: string, error?: Error, meta?: Record<string, unknown>) => void
}

// ============================================================================
// Event Emitter Types
// ============================================================================

/**
 * Event emitter interface
 */
export interface EventEmitter {
  on: (event: OrchestratorEventType, listener: (event: OrchestratorEvent) => void) => void
  off: (event: OrchestratorEventType, listener: (event: OrchestratorEvent) => void) => void
  emit: (event: OrchestratorEventType, data: unknown) => void
  once: (event: OrchestratorEventType, listener: (event: OrchestratorEvent) => void) => void
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Make specific properties required
 */
export type RequireProps<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Make specific properties optional
 */
export type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// ============================================================================
// Context Types
// ============================================================================

/**
 * Context data structure (flexible key-value store)
 */
export type ContextData = Record<string, unknown>

/**
 * Context snapshot for backup and restoration
 */
export interface ContextSnapshot {
  /** Snapshot unique identifier */
  id: string

  /** Context data at snapshot time */
  data: ContextData

  /** Snapshot creation timestamp */
  timestamp: number

  /** Context version at snapshot time */
  version: number
}

// ============================================================================
// Context Store Types
// ============================================================================

/**
 * Context configuration
 */
export interface ContextConfig {
  /** Maximum number of snapshots to retain */
  maxSnapshots?: number

  /** Enable automatic snapshots */
  autoSnapshot?: boolean

  /** Snapshot interval in milliseconds */
  snapshotInterval?: number

  /** Enable persistence */
  persist?: boolean

  /** Persistence path */
  persistPath?: string
}

/**
 * Context interface for orchestrator
 */
export interface Context {
  /** Context unique identifier */
  id: string

  /** Context data */
  data: ContextData

  /** Context version */
  version: number

  /** Context creation timestamp */
  createdAt: Date

  /** Context last update timestamp */
  updatedAt: Date

  /** Context metadata */
  metadata?: Record<string, unknown>
}

/**
 * Shared state across orchestrator components
 */
export interface SharedState {
  /** State data */
  data: Map<string, unknown>

  /** State version */
  version: number

  /** Last update timestamp */
  updatedAt: Date
}

// ============================================================================
// Lifecycle Types
// ============================================================================

/**
 * Lifecycle phase
 */
export type LifecyclePhase =
  | 'initializing'
  | 'ready'
  | 'running'
  | 'pausing'
  | 'paused'
  | 'resuming'
  | 'stopping'
  | 'stopped'
  | 'error'

/**
 * Lifecycle state
 */
export interface LifecycleState {
  /** Current phase */
  phase: LifecyclePhase

  /** Phase start timestamp */
  startedAt: Date

  /** Previous phase */
  previousPhase?: LifecyclePhase

  /** Error if in error phase */
  error?: Error
}

// ============================================================================
// Dependency Types
// ============================================================================

/**
 * Dependency type
 */
export type DependencyType = 'skill' | 'agent' | 'hook' | 'mcp' | 'config' | 'service'

/**
 * Dependency definition
 */
export interface Dependency {
  /** Dependency unique identifier */
  id: string

  /** Dependency type */
  type: DependencyType

  /** Dependency name */
  name: string

  /** Dependency version constraint */
  version?: string

  /** Whether dependency is optional */
  optional?: boolean

  /** Dependency configuration */
  config?: Record<string, unknown>
}

/**
 * Resolved dependency
 */
export interface ResolvedDependency {
  /** Original dependency definition */
  dependency: Dependency

  /** Resolved instance */
  instance: unknown

  /** Resolution timestamp */
  resolvedAt: Date

  /** Resolution metadata */
  metadata?: Record<string, unknown>
}

/**
 * Dependency resolver function type
 */
export type DependencyResolverFn = (
  dependency: Dependency
) => Promise<unknown> | unknown

// ============================================================================
// Event Bus Types
// ============================================================================

/**
 * Event type (extended from OrchestratorEventType)
 */
export type EventType =
  | OrchestratorEventType
  | 'context:update'
  | 'context:snapshot'
  | 'lifecycle:change'
  | 'dependency:resolve'
  | 'dependency:error'
  | 'skill:execute'
  | 'skill:complete'
  | 'mcp:call'
  | 'mcp:response'
  | string // Allow custom event types

/**
 * Event payload
 */
export interface EventPayload<T = unknown> {
  /** Event type */
  type: EventType

  /** Event data */
  data: T

  /** Event timestamp */
  timestamp: Date

  /** Event source */
  source?: string

  /** Event metadata */
  metadata?: Record<string, unknown>
}

/**
 * Event listener function
 */
export type EventListener<T = unknown> = (
  payload: EventPayload<T>
) => void | Promise<void>

// ============================================================================
// Agent State Types
// ============================================================================

/**
 * Agent state (runtime state of an agent)
 */
export interface AgentState {
  /** Agent ID */
  agentId: string

  /** Current status */
  status: AgentStatus

  /** Active task IDs */
  activeTasks: string[]

  /** Last activity timestamp */
  lastActivity?: Date

  /** Error if in error state */
  error?: Error

  /** Agent statistics */
  stats: AgentStats
}

// ============================================================================
// MCP Response Types
// ============================================================================

/**
 * MCP response
 */
export interface MCPResponse<T = unknown> {
  /** Response success status */
  success: boolean

  /** Response data */
  data?: T

  /** Error message if failed */
  error?: string

  /** Response metadata */
  metadata?: Record<string, unknown>
}

// ============================================================================
// Orchestrator Interface Types
// ============================================================================

/**
 * Orchestrator options
 */
export interface OrchestratorOptions {
  /** Orchestrator configuration */
  config?: Partial<OrchestratorConfig>

  /** Context configuration */
  contextConfig?: ContextConfig

  /** Enable debug mode */
  debug?: boolean

  /** Custom logger */
  logger?: Logger
}

/**
 * Event bus interface
 */
export interface IEventBus {
  /** Subscribe to an event */
  on<T = unknown>(event: EventType, listener: EventListener<T>): void

  /** Unsubscribe from an event */
  off<T = unknown>(event: EventType, listener: EventListener<T>): void

  /** Emit an event */
  emit<T = unknown>(event: EventType, data: T): void

  /** Subscribe to an event once */
  once<T = unknown>(event: EventType, listener: EventListener<T>): void

  /** Remove all listeners for an event */
  removeAllListeners(event?: EventType): void
}

/**
 * Context store interface
 */
export interface IContextStore {
  /** Create a new context */
  create(data?: ContextData): Promise<string>

  /** Get context data by ID */
  get(id: string): Promise<ContextData | null>

  /** Update context data (deep merge) */
  update(id: string, data: Partial<ContextData>): Promise<boolean>

  /** Set context data (replace) */
  set(id: string, data: ContextData): Promise<boolean>

  /** Delete a context */
  delete(id: string): Promise<boolean>

  /** Check if context exists */
  has(id: string): Promise<boolean>

  /** Get number of contexts */
  size(): Promise<number>

  /** Clear all contexts */
  clear(): Promise<void>

  /** Get all context IDs */
  keys(): Promise<string[]>

  /** Create a snapshot */
  snapshot(id: string): Promise<ContextSnapshot | null>

  /** Restore from snapshot */
  restore(id: string, snapshot: ContextSnapshot): Promise<boolean>
}

/**
 * Task executor function type
 */
export type TaskExecutor = (task: Task, context: Context) => Promise<unknown>

/**
 * Lifecycle manager interface
 */
export interface ILifecycleManager {
  /** Execute a task with full lifecycle */
  execute(task: Task, context: Context): Promise<TaskResult>

  /** Cleanup a context */
  cleanup(context: Context): Promise<void>

  /** Register a task executor */
  registerExecutor(type: string, executor: TaskExecutor): void
}

/**
 * Dependency resolver interface
 */
export interface IDependencyResolver {
  /** Resolve dependencies */
  resolve(deps: Dependency[]): Promise<ResolvedDependency[]>

  /** Register a resolver for a dependency type */
  registerResolver(type: string, resolver: DependencyResolverFn): void

  /** Clear the dependency cache */
  clearCache(): void
}

/**
 * Orchestrator interface
 */
export interface IOrchestrator {
  /** Initialize the orchestrator */
  initialize(): Promise<void>

  /** Execute a task */
  execute(task: Task): Promise<TaskResult>

  /** Execute multiple tasks */
  executeBatch(tasks: Task[]): Promise<TaskResult[]>

  /** Register a task executor */
  registerExecutor(type: string, executor: TaskExecutor): void

  /** Subscribe to an event */
  on(event: EventType | string, listener: (payload: unknown) => void | Promise<void>): void

  /** Unsubscribe from an event */
  off(event: EventType | string, listener: (payload: unknown) => void | Promise<void>): void

  /** Get context data by ID */
  getContext(id: string): Promise<ContextData | null>

  /** Destroy the orchestrator */
  destroy(): Promise<void>
}
