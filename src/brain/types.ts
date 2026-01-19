/**
 * Core type definitions for Agent communication system
 */

/**
 * Message priority levels
 */
export type MessagePriority = 'low' | 'normal' | 'high' | 'critical'

/**
 * Message status
 */
export type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

/**
 * Agent roles in the system
 */
export type AgentRole
  = | 'typescript-cli-architect'
    | 'ccjk-i18n-specialist'
    | 'ccjk-tools-integration-specialist'
    | 'ccjk-template-engine'
    | 'ccjk-config-architect'
    | 'ccjk-testing-specialist'
    | 'ccjk-devops-engineer'
    | 'system'
    | 'user'

/**
 * Message types for different communication patterns
 */
export type MessageType
  = | 'task' // Task assignment
    | 'query' // Information request
    | 'response' // Response to query
    | 'notification' // Event notification
    | 'error' // Error report
    | 'status' // Status update
    | 'command' // Direct command
    | 'broadcast' // Broadcast to all agents

/**
 * Agent message structure
 */
export interface AgentMessage<T = any> {
  /** Unique message identifier */
  id: string

  /** Message type */
  type: MessageType

  /** Sender agent role */
  from: AgentRole

  /** Recipient agent role(s) */
  to: AgentRole | AgentRole[] | 'all'

  /** Message subject/title */
  subject: string

  /** Message payload */
  payload: T

  /** Message priority */
  priority: MessagePriority

  /** Message status */
  status: MessageStatus

  /** Timestamp when message was created */
  timestamp: number

  /** Optional correlation ID for request-response pattern */
  correlationId?: string

  /** Optional reply-to address for responses */
  replyTo?: AgentRole

  /** Optional metadata */
  metadata?: Record<string, any>

  /** Optional error information */
  error?: {
    code: string
    message: string
    stack?: string
  }
}

/**
 * Task definition for agent work
 */
export interface TaskDefinition {
  /** Unique task identifier */
  id: string

  /** Task name */
  name: string

  /** Task description */
  description: string

  /** Task type */
  type: 'analysis' | 'implementation' | 'testing' | 'documentation' | 'review' | 'deployment'

  /** Assigned agent role */
  assignedTo: AgentRole

  /** Task priority */
  priority: MessagePriority

  /** Task status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked'

  /** Task dependencies (other task IDs) */
  dependencies?: string[]

  /** Task input data */
  input?: Record<string, any>

  /** Task output data */
  output?: Record<string, any>

  /** Task creation timestamp */
  createdAt: number

  /** Task start timestamp */
  startedAt?: number

  /** Task completion timestamp */
  completedAt?: number

  /** Task deadline */
  deadline?: number

  /** Task progress (0-100) */
  progress?: number

  /** Task error information */
  error?: {
    code: string
    message: string
    stack?: string
  }
}

/**
 * Agent state information
 */
export interface AgentState {
  /** Agent role */
  role: AgentRole

  /** Agent status */
  status: 'idle' | 'busy' | 'offline' | 'error'

  /** Current task ID if busy */
  currentTask?: string

  /** Task queue */
  taskQueue: string[]

  /** Agent capabilities */
  capabilities: string[]

  /** Agent load (0-100) */
  load: number

  /** Last activity timestamp */
  lastActivity: number

  /** Agent metadata */
  metadata?: Record<string, any>
}

/**
 * Message bus configuration
 */
export interface BrainConfig {
  /** Enable message persistence */
  enablePersistence: boolean

  /** Persistence file path */
  persistencePath?: string

  /** Maximum message history size */
  maxHistorySize: number

  /** Message retention time in milliseconds */
  messageRetentionTime: number

  /** Enable message logging */
  enableLogging: boolean

  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error'

  /** Enable message validation */
  enableValidation: boolean

  /** Maximum message size in bytes */
  maxMessageSize?: number

  /** Enable dead letter queue */
  enableDeadLetterQueue: boolean

  /** Dead letter queue path */
  deadLetterQueuePath?: string
}

/**
 * Message handler function type
 */
export type MessageHandler<T = any> = (message: AgentMessage<T>) => void | Promise<void>

/**
 * Message filter function type
 */
export type MessageFilter = (message: AgentMessage) => boolean

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /** Filter messages by type */
  type?: MessageType | MessageType[]

  /** Filter messages by sender */
  from?: AgentRole | AgentRole[]

  /** Filter messages by priority */
  priority?: MessagePriority | MessagePriority[]

  /** Custom filter function */
  filter?: MessageFilter

  /** Handle messages asynchronously */
  async?: boolean
}

/**
 * Subscription handle
 */
export interface Subscription {
  /** Unique subscription identifier */
  id: string

  /** Subscriber agent role */
  subscriber: AgentRole

  /** Subscription options */
  options: SubscriptionOptions

  /** Message handler */
  handler: MessageHandler

  /** Subscription creation timestamp */
  createdAt: number

  /** Unsubscribe function */
  unsubscribe: () => void
}

/**
 * Message bus statistics
 */
export interface MessageBusStats {
  /** Total messages sent */
  totalMessages: number

  /** Messages by type */
  messagesByType: Record<MessageType, number>

  /** Messages by status */
  messagesByStatus: Record<MessageStatus, number>

  /** Active subscriptions count */
  activeSubscriptions: number

  /** Message history size */
  historySize: number

  /** Dead letter queue size */
  deadLetterQueueSize: number

  /** Average message processing time in ms */
  avgProcessingTime: number
}

/**
 * Persistence storage interface
 */
export interface MessageStorage {
  /** Save message to storage */
  save: (message: AgentMessage) => Promise<void>

  /** Load messages from storage */
  load: (filter?: MessageFilter) => Promise<AgentMessage[]>

  /** Delete message from storage */
  delete: (messageId: string) => Promise<void>

  /** Clear all messages from storage */
  clear: () => Promise<void>

  /** Get storage statistics */
  getStats: () => Promise<{ count: number, size: number }>
}

/**
 * Agent metrics for monitoring
 */
export interface AgentMetrics {
  cpuUsage: number // 0-1
  memoryUsage: number // 0-1
  avgResponseTime: number // milliseconds
  errorRate: number // 0-1
  taskCount: number
  successRate: number // 0-1
  timestamp: number
}

/**
 * Health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'dead' | 'unknown'

/**
 * Monitor configuration
 */
export interface MonitorConfig {
  heartbeatTimeout: number // milliseconds
  checkInterval: number // milliseconds
  maxRestartAttempts: number
  restartCooldown: number // milliseconds
  degradedThreshold: number // 0-1
  autoRestart: boolean
}

/**
 * Metric snapshot
 */
export interface MetricSnapshot {
  metricName: string
  agentId: string
  timestamp: number
  current: number
  min: number
  max: number
  avg: number
  count: number
}

/**
 * Task metrics
 */
export interface TaskMetrics {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  avgDuration: number // milliseconds
  successRate: number // 0-1
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  cpuUsage: number // 0-1
  memoryUsage: number // 0-1
  responseTime: number // milliseconds
  errorCount: number
  requestCount: number
  timestamp: number
}

/**
 * Recovery action types
 */
export type RecoveryAction = 'restart' | 'reset_state' | 'clear_cache' | 'scale_resources' | 'failover'

/**
 * Recovery strategy
 */
export interface RecoveryStrategy {
  actions: RecoveryAction[]
  timeout: number // milliseconds
}

/**
 * Self-healing configuration
 */
export interface SelfHealingConfig {
  enableAutoRecovery: boolean
  maxRecoveryAttempts: number
  recoveryTimeout: number // milliseconds
  degradationThreshold: number // 0-1
  alertThreshold: 'info' | 'warning' | 'error' | 'critical'
  enableDegradation: boolean
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  agentId: string
  healthy: boolean
  status: HealthStatus
  lastHeartbeat: number
  timeSinceLastHeartbeat: number
  issues: string[]
}
