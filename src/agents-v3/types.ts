/**
 * CCJK Agents V3 - Type Definitions
 *
 * Unified type system for the Agent V3 orchestration system.
 *
 * @module agents-v3/types
 */

// ============================================================================
// Basic Types
// ============================================================================

/**
 * Unique identifier type
 */
export type AgentId = string
export type TaskId = string
export type MessageId = string
export type ChannelId = string

/**
 * Priority levels for tasks and messages
 */
export type Priority = 'low' | 'normal' | 'high' | 'critical'

/**
 * Agent status
 */
export type AgentStatus = 'idle' | 'busy' | 'paused' | 'error' | 'terminated'

/**
 * Task status
 */
export type TaskStatus
  = | 'pending'
    | 'queued'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'timeout'
    | 'retrying'

/**
 * Orchestrator status
 */
export type OrchestratorStatus
  = | 'idle'
    | 'running'
    | 'paused'
    | 'shutting_down'
    | 'error'

// ============================================================================
// Agent Types
// ============================================================================

/**
 * Agent capabilities
 */
export type AgentCapability
  = | 'code-generation'
    | 'code-review'
    | 'testing'
    | 'documentation'
    | 'research'
    | 'analysis'
    | 'refactoring'
    | 'debugging'
    | 'deployment'
    | 'monitoring'
    | string

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Agent unique identifier */
  id?: AgentId

  /** Agent name */
  name: string

  /** Agent type/role */
  type: string

  /** Agent capabilities */
  capabilities: AgentCapability[]

  /** Maximum concurrent tasks */
  maxConcurrentTasks?: number

  /** Task timeout in milliseconds */
  taskTimeout?: number

  /** Priority level */
  priority?: Priority

  /** Custom metadata */
  metadata?: Record<string, unknown>

  /** Resource limits */
  resources?: {
    maxMemory?: number
    maxCpu?: number
    maxTokens?: number
  }

  /** Retry configuration */
  retry?: {
    maxAttempts: number
    backoffMultiplier: number
    initialDelayMs: number
    maxDelayMs: number
  }
}

/**
 * Agent instance
 */
export interface AgentInstance {
  /** Unique identifier */
  id: AgentId

  /** Agent configuration */
  config: AgentConfig

  /** Current status */
  status: AgentStatus

  /** Current task ID if busy */
  currentTaskId?: TaskId

  /** Task queue */
  taskQueue: TaskId[]

  /** Metrics */
  metrics: AgentMetrics

  /** Creation timestamp */
  createdAt: number

  /** Last activity timestamp */
  lastActivityAt: number

  /** Error information if in error state */
  error?: AgentError
}

/**
 * Agent metrics
 */
export interface AgentMetrics {
  /** Total tasks executed */
  tasksExecuted: number

  /** Successful tasks */
  tasksSucceeded: number

  /** Failed tasks */
  tasksFailed: number

  /** Average task duration in ms */
  avgTaskDuration: number

  /** Success rate (0-1) */
  successRate: number

  /** Total execution time in ms */
  totalExecutionTime: number

  /** Current load (0-1) */
  load: number

  /** Last updated timestamp */
  lastUpdated: number
}

/**
 * Agent error
 */
export interface AgentError {
  /** Error code */
  code: string

  /** Error message */
  message: string

  /** Stack trace */
  stack?: string

  /** Timestamp */
  timestamp: number

  /** Is recoverable */
  recoverable: boolean

  /** Recovery attempts */
  recoveryAttempts: number
}

// ============================================================================
// Task Types
// ============================================================================

/**
 * Task definition
 */
export interface Task {
  /** Unique identifier */
  id: TaskId

  /** Task name */
  name: string

  /** Task description */
  description?: string

  /** Task type */
  type: string

  /** Task priority */
  priority: Priority

  /** Required capabilities */
  requiredCapabilities: AgentCapability[]

  /** Task input data */
  input: Record<string, unknown>

  /** Task output data */
  output?: TaskOutput

  /** Task status */
  status: TaskStatus

  /** Assigned agent ID */
  assignedAgentId?: AgentId

  /** Task dependencies (other task IDs) */
  dependencies?: TaskId[]

  /** Task timeout in milliseconds */
  timeout?: number

  /** Retry configuration */
  retry?: TaskRetryConfig

  /** Current retry count */
  retryCount: number

  /** Task progress (0-100) */
  progress: number

  /** Checkpoint data for recovery */
  checkpoint?: TaskCheckpoint

  /** Task affinity (prefer specific agent) */
  affinity?: {
    agentId?: AgentId
    agentType?: string
    capabilities?: AgentCapability[]
  }

  /** Creation timestamp */
  createdAt: number

  /** Start timestamp */
  startedAt?: number

  /** Completion timestamp */
  completedAt?: number

  /** Error information */
  error?: TaskError

  /** Custom metadata */
  metadata?: Record<string, unknown>
}

/**
 * Task output
 */
export interface TaskOutput {
  /** Output data */
  data: unknown

  /** Confidence score (0-1) */
  confidence?: number

  /** Warnings */
  warnings?: string[]

  /** Metadata */
  metadata?: Record<string, unknown>
}

/**
 * Task error
 */
export interface TaskError {
  /** Error code */
  code: string

  /** Error message */
  message: string

  /** Stack trace */
  stack?: string

  /** Is recoverable */
  recoverable: boolean

  /** Suggested recovery action */
  recoveryAction?: RecoveryAction
}

/**
 * Task retry configuration
 */
export interface TaskRetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number

  /** Backoff multiplier */
  backoffMultiplier: number

  /** Initial delay in milliseconds */
  initialDelayMs: number

  /** Maximum delay in milliseconds */
  maxDelayMs: number

  /** Retry on specific error codes */
  retryOnCodes?: string[]

  /** Do not retry on specific error codes */
  noRetryOnCodes?: string[]
}

/**
 * Task checkpoint for recovery
 */
export interface TaskCheckpoint {
  /** Checkpoint ID */
  id: string

  /** Checkpoint data */
  data: unknown

  /** Progress at checkpoint */
  progress: number

  /** Timestamp */
  timestamp: number

  /** Metadata */
  metadata?: Record<string, unknown>
}

/**
 * Task result
 */
export interface TaskResult {
  /** Task ID */
  taskId: TaskId

  /** Success flag */
  success: boolean

  /** Task output */
  output?: TaskOutput

  /** Error if failed */
  error?: TaskError

  /** Duration in milliseconds */
  durationMs: number

  /** Retry count */
  retryCount: number

  /** Agent ID that executed the task */
  agentId?: AgentId
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message types for communication
 */
export type MessageType
  = | 'request'
    | 'response'
    | 'event'
    | 'broadcast'
    | 'command'
    | 'notification'
    | 'heartbeat'
    | 'error'

/**
 * Message structure
 */
export interface Message<T = unknown> {
  /** Unique identifier */
  id: MessageId

  /** Message type */
  type: MessageType

  /** Channel/topic */
  channel: ChannelId

  /** Sender ID */
  from: AgentId | 'orchestrator' | 'system'

  /** Recipient ID(s) */
  to: AgentId | AgentId[] | 'all' | 'broadcast'

  /** Message subject */
  subject: string

  /** Message payload */
  payload: T

  /** Priority */
  priority: Priority

  /** Correlation ID for request-response */
  correlationId?: MessageId

  /** Reply-to channel */
  replyTo?: ChannelId

  /** Timestamp */
  timestamp: number

  /** Time-to-live in milliseconds */
  ttl?: number

  /** Is encrypted */
  encrypted?: boolean

  /** Metadata */
  metadata?: Record<string, unknown>
}

/**
 * Message handler
 */
export type MessageHandler<T = unknown> = (
  message: Message<T>,
) => void | Promise<void>

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /** Filter by message type */
  type?: MessageType | MessageType[]

  /** Filter by sender */
  from?: AgentId | AgentId[]

  /** Filter by priority */
  priority?: Priority | Priority[]

  /** Custom filter function */
  filter?: (message: Message) => boolean

  /** Handle asynchronously */
  async?: boolean
}

/**
 * Subscription handle
 */
export interface Subscription {
  /** Subscription ID */
  id: string

  /** Channel */
  channel: ChannelId

  /** Subscriber ID */
  subscriberId: AgentId | string

  /** Options */
  options: SubscriptionOptions

  /** Handler */
  handler: MessageHandler

  /** Creation timestamp */
  createdAt: number

  /** Unsubscribe function */
  unsubscribe: () => void
}

// ============================================================================
// Error Recovery Types
// ============================================================================

/**
 * Recovery action types
 */
export type RecoveryAction
  = | 'retry'
    | 'restart_agent'
    | 'reassign_task'
    | 'checkpoint_restore'
    | 'graceful_degrade'
    | 'dead_letter'
    | 'escalate'
    | 'ignore'

/**
 * Recovery strategy
 */
export interface RecoveryStrategy {
  /** Strategy name */
  name: string

  /** Actions to take in order */
  actions: RecoveryAction[]

  /** Maximum recovery attempts */
  maxAttempts: number

  /** Timeout for recovery */
  timeoutMs: number

  /** Conditions for this strategy */
  conditions?: {
    errorCodes?: string[]
    taskTypes?: string[]
    agentTypes?: string[]
  }
}

/**
 * Dead letter entry
 */
export interface DeadLetterEntry {
  /** Entry ID */
  id: string

  /** Original task */
  task: Task

  /** Error that caused failure */
  error: TaskError

  /** Recovery attempts made */
  recoveryAttempts: RecoveryAttempt[]

  /** Timestamp */
  timestamp: number

  /** Reason for dead letter */
  reason: string
}

/**
 * Recovery attempt record
 */
export interface RecoveryAttempt {
  /** Attempt number */
  attempt: number

  /** Action taken */
  action: RecoveryAction

  /** Success flag */
  success: boolean

  /** Error if failed */
  error?: string

  /** Duration in ms */
  durationMs: number

  /** Timestamp */
  timestamp: number
}

// ============================================================================
// Scheduler Types
// ============================================================================

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  /** Maximum concurrent tasks */
  maxConcurrentTasks: number

  /** Default task timeout */
  defaultTimeoutMs: number

  /** Enable priority queue */
  enablePriorityQueue: boolean

  /** Enable load balancing */
  enableLoadBalancing: boolean

  /** Load balancing strategy */
  loadBalancingStrategy: 'round-robin' | 'least-loaded' | 'best-fit' | 'random'

  /** Enable task affinity */
  enableTaskAffinity: boolean

  /** Queue processing interval */
  processingIntervalMs: number

  /** Stale task threshold */
  staleTaskThresholdMs: number
}

/**
 * Scheduler statistics
 */
export interface SchedulerStats {
  /** Total tasks scheduled */
  totalScheduled: number

  /** Tasks in queue */
  queuedTasks: number

  /** Running tasks */
  runningTasks: number

  /** Completed tasks */
  completedTasks: number

  /** Failed tasks */
  failedTasks: number

  /** Average wait time in ms */
  avgWaitTimeMs: number

  /** Average execution time in ms */
  avgExecutionTimeMs: number

  /** Throughput (tasks/second) */
  throughput: number

  /** Queue by priority */
  queueByPriority: Record<Priority, number>
}

// ============================================================================
// Pool Types
// ============================================================================

/**
 * Agent pool configuration
 */
export interface AgentPoolConfig {
  /** Minimum agents */
  minAgents: number

  /** Maximum agents */
  maxAgents: number

  /** Idle timeout before scaling down */
  idleTimeoutMs: number

  /** Scale up threshold (load) */
  scaleUpThreshold: number

  /** Scale down threshold (load) */
  scaleDownThreshold: number

  /** Health check interval */
  healthCheckIntervalMs: number

  /** Agent creation timeout */
  agentCreationTimeoutMs: number
}

/**
 * Agent pool statistics
 */
export interface AgentPoolStats {
  /** Total agents */
  totalAgents: number

  /** Idle agents */
  idleAgents: number

  /** Busy agents */
  busyAgents: number

  /** Error agents */
  errorAgents: number

  /** Average load */
  avgLoad: number

  /** Agents by type */
  agentsByType: Record<string, number>

  /** Agents by status */
  agentsByStatus: Record<AgentStatus, number>
}

// ============================================================================
// Orchestrator Types
// ============================================================================

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** Scheduler configuration */
  scheduler: Partial<SchedulerConfig>

  /** Agent pool configuration */
  pool: Partial<AgentPoolConfig>

  /** Error recovery configuration */
  recovery: {
    enabled: boolean
    maxAttempts: number
    strategies: RecoveryStrategy[]
  }

  /** Communication configuration */
  communication: {
    enableEncryption: boolean
    messageTimeoutMs: number
    maxMessageSize: number
  }

  /** Logging configuration */
  logging: {
    enabled: boolean
    level: 'debug' | 'info' | 'warn' | 'error'
    verbose: boolean
  }

  /** Metrics configuration */
  metrics: {
    enabled: boolean
    collectIntervalMs: number
  }
}

/**
 * Orchestrator status information
 */
export interface OrchestratorStatusInfo {
  /** Current status */
  status: OrchestratorStatus

  /** Uptime in milliseconds */
  uptimeMs: number

  /** Start time */
  startedAt: number

  /** Scheduler stats */
  scheduler: SchedulerStats

  /** Pool stats */
  pool: AgentPoolStats

  /** Active tasks count */
  activeTasks: number

  /** Pending tasks count */
  pendingTasks: number

  /** Error count */
  errorCount: number

  /** Last error */
  lastError?: {
    message: string
    timestamp: number
  }
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Orchestrator events
 */
export interface OrchestratorEvents {
  // Agent events
  'agent:spawned': (agent: AgentInstance) => void
  'agent:terminated': (agentId: AgentId, reason: string) => void
  'agent:error': (agentId: AgentId, error: AgentError) => void
  'agent:recovered': (agentId: AgentId) => void
  'agent:status': (agentId: AgentId, status: AgentStatus) => void

  // Task events
  'task:queued': (task: Task) => void
  'task:started': (task: Task) => void
  'task:progress': (taskId: TaskId, progress: number) => void
  'task:completed': (result: TaskResult) => void
  'task:failed': (taskId: TaskId, error: TaskError) => void
  'task:retrying': (taskId: TaskId, attempt: number) => void
  'task:timeout': (taskId: TaskId) => void
  'task:cancelled': (taskId: TaskId) => void
  'task:checkpoint': (taskId: TaskId, checkpoint: TaskCheckpoint) => void

  // Message events
  'message:sent': (message: Message) => void
  'message:received': (message: Message) => void
  'message:error': (messageId: MessageId, error: string) => void

  // Recovery events
  'recovery:started': (taskId: TaskId, strategy: string) => void
  'recovery:success': (taskId: TaskId) => void
  'recovery:failed': (taskId: TaskId, reason: string) => void
  'deadletter:added': (entry: DeadLetterEntry) => void

  // System events
  'orchestrator:started': () => void
  'orchestrator:stopped': () => void
  'orchestrator:error': (error: Error) => void
  'orchestrator:status': (status: OrchestratorStatus) => void
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
 * Async function type
 */
export type AsyncFunction<T = void> = () => Promise<T>

/**
 * Callback function type
 */
export type Callback<T = void> = (error: Error | null, result?: T) => void
