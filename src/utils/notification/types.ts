/**
 * CCJK Notification System - Type Definitions
 *
 * Provides type definitions for the notification system that supports
 * multiple channels (Feishu, WeChat Work, Email, SMS) and cloud service integration.
 */

// ============================================================================
// Notification Channels
// ============================================================================

/**
 * Supported notification channels
 */
export type NotificationChannel = 'feishu' | 'wechat' | 'email' | 'sms'

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

/**
 * Notification types
 */
export type NotificationType
  = | 'task_started'
    | 'task_progress'
    | 'task_completed'
    | 'task_failed'
    | 'task_cancelled'
    | 'system'

// ============================================================================
// Channel Configurations
// ============================================================================

/**
 * Feishu (Lark) channel configuration
 */
export interface FeishuConfig {
  enabled: boolean
  /** Feishu bot webhook URL */
  webhookUrl: string
  /** Optional: Webhook secret for signature verification */
  secret?: string
}

/**
 * WeChat Work channel configuration
 */
export interface WechatConfig {
  enabled: boolean
  /** WeChat Work Corp ID */
  corpId: string
  /** WeChat Work Agent ID */
  agentId: string
  /** WeChat Work Agent Secret */
  secret: string
}

/**
 * Email channel configuration
 */
export interface EmailConfig {
  enabled: boolean
  /** Email address to receive notifications */
  address: string
}

/**
 * SMS channel configuration
 */
export interface SmsConfig {
  enabled: boolean
  /** Phone number to receive SMS */
  phone: string
  /** Country code (default: +86) */
  countryCode?: string
}

/**
 * All channel configurations
 */
export interface ChannelConfigs {
  feishu?: FeishuConfig
  wechat?: WechatConfig
  email?: EmailConfig
  sms?: SmsConfig
}

// ============================================================================
// Main Configuration
// ============================================================================

/**
 * Main notification configuration stored in ~/.ccjk/config.toml
 */
export interface NotificationConfig {
  /** Whether notification system is enabled */
  enabled: boolean
  /** Device token for cloud service authentication */
  deviceToken: string
  /** Task duration threshold in minutes before sending notification */
  threshold: number
  /** Cloud service API endpoint */
  cloudEndpoint?: string
  /** Channel configurations */
  channels: ChannelConfigs
  /** Quiet hours configuration */
  quietHours?: QuietHoursConfig
}

/**
 * Quiet hours configuration - no notifications during these hours
 */
export interface QuietHoursConfig {
  enabled: boolean
  /** Start hour (0-23) */
  startHour: number
  /** End hour (0-23) */
  endHour: number
  /** Timezone (e.g., 'Asia/Shanghai') */
  timezone?: string
}

/**
 * Default notification configuration
 */
export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  enabled: false,
  deviceToken: '',
  threshold: 10, // 10 minutes
  cloudEndpoint: 'https://api.claudehome.cn',
  channels: {},
  quietHours: {
    enabled: false,
    startHour: 22,
    endHour: 8,
  },
}

// ============================================================================
// Task Status
// ============================================================================

/**
 * Task execution status
 */
export type TaskStatusType = 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'

/**
 * Task status information
 */
export interface TaskStatus {
  /** Unique task identifier */
  taskId: string
  /** Task description (from user prompt) */
  description: string
  /** Task start time */
  startTime: Date
  /** Current task status */
  status: TaskStatusType
  /** Task duration in milliseconds */
  duration?: number
  /** Task result summary */
  result?: string
  /** Error message if failed */
  error?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

// ============================================================================
// Notification Messages
// ============================================================================

/**
 * Notification action button
 */
export interface NotificationAction {
  /** Action identifier */
  id: string
  /** Button label */
  label: string
  /** Action value to send back */
  value: string
  /** Whether this is the primary action */
  primary?: boolean
}

/**
 * Notification message to send
 */
export interface NotificationMessage {
  /** Message type */
  type: NotificationType
  /** Task status information */
  task: TaskStatus
  /** Optional action buttons */
  actions?: NotificationAction[]
  /** Message priority */
  priority?: NotificationPriority
  /** Custom title override (auto-generated from type if not provided) */
  title?: string
  /** Custom body/message content (auto-generated from task if not provided) */
  body?: string
}

/**
 * Notification send result
 */
export interface NotificationResult {
  /** Whether notification was sent successfully */
  success: boolean
  /** Channel used */
  channel: NotificationChannel
  /** Timestamp when sent */
  sentAt: Date
  /** Error message if failed */
  error?: string
  /** Message ID from the channel */
  messageId?: string
}

// ============================================================================
// User Reply
// ============================================================================

/**
 * User reply received from notification channel
 */
export interface UserReply {
  /** Related task ID */
  taskId: string
  /** Reply content */
  content: string
  /** Channel the reply came from */
  channel: NotificationChannel
  /** Reply timestamp */
  timestamp: Date
  /** Action ID if user clicked a button */
  actionId?: string
  /** Raw reply data from channel */
  rawData?: Record<string, unknown>
}

/**
 * Reply handler callback
 */
export type ReplyHandler = (reply: UserReply) => Promise<void> | void

// ============================================================================
// Cloud Service Types
// ============================================================================

/**
 * Device registration request
 */
export interface DeviceRegisterRequest {
  /** Device name (optional) */
  name?: string
  /** Operating system platform */
  platform: string
  /** CCJK version */
  version: string
  /** Initial configuration */
  config?: Partial<NotificationConfig>
}

/**
 * Device registration response
 */
export interface DeviceRegisterResponse {
  /** Generated device token */
  token: string
  /** Device ID */
  deviceId: string
  /** Registration timestamp */
  registeredAt: string
}

/**
 * Task report request to cloud service
 */
export interface TaskReportRequest {
  /** Task status */
  task: TaskStatus
  /** Channels to notify */
  channels: NotificationChannel[]
}

/**
 * Cloud channel configuration format (array-based for cloud API)
 *
 * This format is used when syncing channel configurations with the cloud service.
 * The cloud API expects channels as an array rather than an object keyed by channel type.
 */
export interface CloudChannelConfig {
  /** Channel type identifier */
  type: NotificationChannel
  /** Whether the channel is enabled */
  enabled: boolean
  /** Channel-specific configuration data */
  config: Record<string, unknown>
}

/**
 * Cloud device info response
 *
 * Response from GET /device/info endpoint
 */
export interface CloudDeviceInfo {
  /** Device ID */
  deviceId: string
  /** Device name */
  name: string
  /** Operating system platform */
  platform: string
  /** Enabled channel types */
  channels: NotificationChannel[]
  /** Last seen timestamp */
  lastSeen: string
}

/**
 * Cloud service API response
 */
export interface CloudApiResponse<T = unknown> {
  /** Whether request was successful */
  success: boolean
  /** Response data */
  data?: T
  /** Error message if failed */
  error?: string
  /** Error code */
  code?: string
}

// ============================================================================
// WebSocket Events
// ============================================================================

/**
 * WebSocket event types
 */
export type WebSocketEventType
  = | 'connected'
    | 'disconnected'
    | 'reply'
    | 'notification_sent'
    | 'error'

/**
 * WebSocket event payload
 */
export interface WebSocketEvent {
  type: WebSocketEventType
  data?: unknown
  timestamp: Date
}

/**
 * WebSocket connection state
 */
export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  /** Whether configuration is valid */
  valid: boolean
  /** Validation errors */
  errors: ConfigValidationError[]
  /** Validation warnings */
  warnings: string[]
}

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  /** Field path (e.g., 'channels.feishu.webhookUrl') */
  field: string
  /** Error message */
  message: string
  /** Error code */
  code: string
}

/**
 * Validate notification configuration
 */
export function validateNotificationConfig(config: Partial<NotificationConfig>): ConfigValidationResult {
  const errors: ConfigValidationError[] = []
  const warnings: string[] = []

  // Check threshold
  if (config.threshold !== undefined) {
    if (config.threshold < 1) {
      errors.push({
        field: 'threshold',
        message: 'Threshold must be at least 1 minute',
        code: 'THRESHOLD_TOO_LOW',
      })
    }
    if (config.threshold > 1440) {
      warnings.push('Threshold is set to more than 24 hours')
    }
  }

  // Check Feishu config
  if (config.channels?.feishu?.enabled) {
    if (!config.channels.feishu.webhookUrl) {
      errors.push({
        field: 'channels.feishu.webhookUrl',
        message: 'Feishu webhook URL is required when enabled',
        code: 'FEISHU_WEBHOOK_REQUIRED',
      })
    }
    else if (!config.channels.feishu.webhookUrl.startsWith('https://')) {
      errors.push({
        field: 'channels.feishu.webhookUrl',
        message: 'Feishu webhook URL must use HTTPS',
        code: 'FEISHU_WEBHOOK_INVALID',
      })
    }
  }

  // Check WeChat config
  if (config.channels?.wechat?.enabled) {
    if (!config.channels.wechat.corpId) {
      errors.push({
        field: 'channels.wechat.corpId',
        message: 'WeChat Work Corp ID is required when enabled',
        code: 'WECHAT_CORPID_REQUIRED',
      })
    }
    if (!config.channels.wechat.agentId) {
      errors.push({
        field: 'channels.wechat.agentId',
        message: 'WeChat Work Agent ID is required when enabled',
        code: 'WECHAT_AGENTID_REQUIRED',
      })
    }
    if (!config.channels.wechat.secret) {
      errors.push({
        field: 'channels.wechat.secret',
        message: 'WeChat Work Secret is required when enabled',
        code: 'WECHAT_SECRET_REQUIRED',
      })
    }
  }

  // Check Email config
  if (config.channels?.email?.enabled) {
    if (!config.channels.email.address) {
      errors.push({
        field: 'channels.email.address',
        message: 'Email address is required when enabled',
        code: 'EMAIL_ADDRESS_REQUIRED',
      })
    }
    else if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(config.channels.email.address)) {
      errors.push({
        field: 'channels.email.address',
        message: 'Invalid email address format',
        code: 'EMAIL_ADDRESS_INVALID',
      })
    }
  }

  // Check SMS config
  if (config.channels?.sms?.enabled) {
    if (!config.channels.sms.phone) {
      errors.push({
        field: 'channels.sms.phone',
        message: 'Phone number is required when enabled',
        code: 'SMS_PHONE_REQUIRED',
      })
    }
    else if (!/^\d{10,15}$/.test(config.channels.sms.phone.replace(/\D/g, ''))) {
      errors.push({
        field: 'channels.sms.phone',
        message: 'Invalid phone number format',
        code: 'SMS_PHONE_INVALID',
      })
    }
  }

  // Check quiet hours
  if (config.quietHours?.enabled) {
    if (config.quietHours.startHour < 0 || config.quietHours.startHour > 23) {
      errors.push({
        field: 'quietHours.startHour',
        message: 'Start hour must be between 0 and 23',
        code: 'QUIET_HOURS_INVALID',
      })
    }
    if (config.quietHours.endHour < 0 || config.quietHours.endHour > 23) {
      errors.push({
        field: 'quietHours.endHour',
        message: 'End hour must be between 0 and 23',
        code: 'QUIET_HOURS_INVALID',
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
