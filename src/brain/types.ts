/**
 * Core Types for Brain System
 *
 * @module brain/types
 */

/**
 * Agent roles
 */
export type AgentRole
  = | 'researcher'
    | 'architect'
    | 'coder'
    | 'debugger'
    | 'tester'
    | 'reviewer'
    | 'writer'
    | 'analyst'
    | 'coordinator'
    | 'specialist'

/**
 * Agent state
 */
export interface AgentState {
  /** Agent ID */
  agentId: string

  /** Agent role */
  role: AgentRole

  /** Agent status */
  status: 'idle' | 'active' | 'paused' | 'completed' | 'failed'

  /** Current task */
  currentTask?: string

  /** Task history */
  taskHistory: string[]

  /** Agent memory/context */
  memory: Record<string, any>

  /** Creation timestamp */
  createdAt: string

  /** Last updated timestamp */
  updatedAt: string

  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'skipped'

/**
 * Notification type
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

/**
 * Notification
 */
export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  metadata?: Record<string, any>
}

/**
 * Message types for inter-agent communication
 */
export type MessageType
  = | 'request'
    | 'response'
    | 'notification'
    | 'event'
    | 'command'
    | 'query'
    | 'error'

/**
 * Message priority levels
 */
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent'

/**
 * Message status
 */
export type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Agent message for inter-agent communication
 */
export interface AgentMessage<T = any> {
  id: string
  type: MessageType
  from: AgentRole
  to: AgentRole | AgentRole[] | 'all'
  subject: string
  payload: T
  priority: MessagePriority
  status: MessageStatus
  timestamp: number
  correlationId?: string
  replyTo?: AgentRole
  metadata?: Record<string, any>
  error?: {
    code: string
    message: string
    stack?: string
  }
}

/**
 * Message filter function
 */
export type MessageFilter = (message: AgentMessage) => boolean

/**
 * Message handler function
 */
export type MessageHandler = (message: AgentMessage) => void | Promise<void>

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  type?: MessageType | MessageType[]
  from?: AgentRole | AgentRole[]
  priority?: MessagePriority | MessagePriority[]
  filter?: MessageFilter
  async?: boolean
}

/**
 * Message subscription
 */
export interface Subscription {
  id: string
  subscriber: AgentRole
  options: SubscriptionOptions
  handler: MessageHandler
  createdAt: number
  unsubscribe: () => void
}

/**
 * Message storage interface
 */
export interface MessageStorage {
  save(message: AgentMessage): Promise<void>
  load(filter?: MessageFilter): Promise<AgentMessage[]>
  delete(messageId: string): Promise<void>
  clear(): Promise<void>
  getStats(): Promise<{ count: number, size: number }>
}

/**
 * Message bus statistics
 */
export interface MessageBusStats {
  totalMessages: number
  messagesByType: Record<MessageType, number>
  messagesByStatus: Record<MessageStatus, number>
  activeSubscriptions: number
  historySize: number
  deadLetterQueueSize: number
  avgProcessingTime: number
}

/**
 * Brain configuration
 */
export interface BrainConfig {
  enablePersistence?: boolean
  persistencePath?: string
  maxHistorySize?: number
  messageRetentionTime?: number
  enableLogging?: boolean
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  enableValidation?: boolean
  maxMessageSize?: number
  enableDeadLetterQueue?: boolean
}

/**
 * Agent metrics for monitoring
 */
export interface AgentMetrics {
  /** Agent ID */
  agentId: string
  /** Error rate (0-1) */
  errorRate: number
  /** CPU usage percentage (0-100) */
  cpuUsage: number
  /** Memory usage percentage (0-100) */
  memoryUsage: number
  /** Tasks completed */
  tasksCompleted: number
  /** Tasks failed */
  tasksFailed: number
  /** Average response time in ms */
  avgResponseTime: number
  /** Last updated timestamp */
  lastUpdated: string
}

/**
 * Recovery action types
 */
export type RecoveryAction
  = | 'restart'
    | 'retry'
    | 'skip'
    | 'escalate'
    | 'rollback'
    | 'throttle'
    | 'scale_down'
    | 'notify'

/**
 * Recovery strategy
 */
export interface RecoveryStrategy {
  /** Strategy name */
  name: string
  /** Actions to take */
  actions: RecoveryAction[]
  /** Maximum retry attempts */
  maxRetries: number
  /** Backoff multiplier */
  backoffMultiplier: number
  /** Initial delay in ms */
  initialDelay: number
  /** Maximum delay in ms */
  maxDelay: number
  /** Conditions to trigger this strategy */
  conditions: {
    errorRate?: number
    cpuThreshold?: number
    memoryThreshold?: number
  }
}

/**
 * Self-healing configuration
 */
export interface SelfHealingConfig {
  /** Enable self-healing */
  enabled: boolean
  /** Health check interval in ms */
  healthCheckInterval: number
  /** Error rate threshold to trigger recovery */
  errorRateThreshold: number
  /** CPU usage threshold */
  cpuThreshold: number
  /** Memory usage threshold */
  memoryThreshold: number
  /** Recovery strategies */
  strategies: RecoveryStrategy[]
  /** Enable automatic recovery */
  autoRecover: boolean
  /** Maximum recovery attempts */
  maxRecoveryAttempts: number
}

/**
 * Health status for agents
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded' | 'dead' | 'unknown'

/**
 * Monitor configuration
 */
export interface MonitorConfig {
  /** Heartbeat timeout in ms */
  heartbeatTimeout: number
  /** Health check interval in ms */
  checkInterval: number
  /** Maximum restart attempts */
  maxRestartAttempts: number
  /** Restart cooldown in ms */
  restartCooldown: number
  /** Degraded threshold (0-1) */
  degradedThreshold: number
  /** Enable auto-restart */
  autoRestart: boolean
}
