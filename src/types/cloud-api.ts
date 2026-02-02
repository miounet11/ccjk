/**
 * CCJK Cloud API Types
 *
 * Type definitions for the CCJK Cloud API client.
 * Based on CLIENT_API_DOC.md specification.
 *
 * @module types/cloud-api
 */

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string
}

/**
 * Login response
 */
export interface LoginResponse {
  success: boolean
  message: string
  /** Development only - verification code */
  _dev_code?: string
}

/**
 * Verify request payload
 */
export interface VerifyRequest {
  email: string
  code: string
}

/**
 * User information
 */
export interface User {
  id: string
  email: string
}

/**
 * Verify response
 */
export interface VerifyResponse {
  success: boolean
  data: {
    token: string
    expiresAt: string
    user: User
  }
}

/**
 * Get current user response
 */
export interface GetMeResponse {
  success: boolean
  data: {
    user: User
  }
}

/**
 * Logout response
 */
export interface LogoutResponse {
  success: boolean
  message: string
}

// ============================================================================
// Device Binding Types
// ============================================================================

/**
 * Generate bind code response
 */
export interface GenerateBindCodeResponse {
  success: boolean
  data: {
    code: string
    expiresAt: string
    expiresIn: number
  }
}

/**
 * Device information for binding
 */
export interface DeviceInfo {
  name: string
  platform: string
  hostname: string
  version: string
}

/**
 * Use bind code request
 */
export interface UseBindCodeRequest {
  code: string
  device: DeviceInfo
}

/**
 * Use bind code response
 */
export interface UseBindCodeResponse {
  success: boolean
  data: {
    deviceId: string
    deviceToken: string
    userId: string
    message: string
  }
}

/**
 * Bind code status
 */
export type BindCodeStatus = 'pending' | 'bound' | 'expired'

/**
 * Get bind code status response
 */
export interface GetBindCodeStatusResponse {
  success: boolean
  data: {
    status: BindCodeStatus
    expiresAt?: string
    device?: {
      id: string
      name: string
      platform: string
    }
  }
}

/**
 * Channel configuration
 */
export interface ChannelConfig {
  type: NotificationChannel
  enabled: boolean
  configured: boolean
}

/**
 * Device in list
 */
export interface DeviceListItem {
  id: string
  name: string
  platform: string
  hostname: string
  version: string
  createdAt: string
  lastSeenAt: string
  channels: ChannelConfig[]
}

/**
 * Get devices response
 */
export interface GetDevicesResponse {
  success: boolean
  data: {
    devices: DeviceListItem[]
  }
}

/**
 * Delete device response
 */
export interface DeleteDeviceResponse {
  success: boolean
  message: string
}

// ============================================================================
// Device Management Types
// ============================================================================

/**
 * Register device request
 */
export interface RegisterDeviceRequest {
  token?: string
  name: string
  platform: string
  hostname: string
  version: string
}

/**
 * Register device response
 */
export interface RegisterDeviceResponse {
  success: boolean
  data: {
    deviceId: string
    token: string
    isNew: boolean
  }
}

/**
 * Channel detail configuration
 */
export interface ChannelDetailConfig {
  type: NotificationChannel
  enabled: boolean
  config: Record<string, string>
}

/**
 * Device info response
 */
export interface GetDeviceInfoResponse {
  success: boolean
  data: {
    id: string
    name: string
    platform: string
    hostname: string
    version: string
    userId: string
    createdAt: string
    lastSeenAt: string
    channels: ChannelConfig[]
  }
}

/**
 * Get device channels response
 */
export interface GetDeviceChannelsResponse {
  success: boolean
  data: {
    channels: ChannelDetailConfig[]
  }
}

/**
 * Update device channels request
 */
export interface UpdateDeviceChannelsRequest {
  channels: ChannelDetailConfig[]
}

/**
 * Update device channels response
 */
export interface UpdateDeviceChannelsResponse {
  success: boolean
  message: string
}

/**
 * Regenerate token response
 */
export interface RegenerateTokenResponse {
  success: boolean
  data: {
    token: string
  }
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Notification type
 */
export type NotificationType =
  | 'task_progress'
  | 'task_completed'
  | 'task_failed'
  | 'ask_user'
  | 'custom'

/**
 * Notification channel
 */
export type NotificationChannel = 'feishu' | 'dingtalk' | 'wechat'

/**
 * Send notification request
 */
export interface SendNotificationRequest {
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
  channels?: NotificationChannel[]
  waitReply?: boolean
}

/**
 * Channel send result
 */
export interface ChannelSendResult {
  type: NotificationChannel
  success: boolean
  error?: string
}

/**
 * Send notification response
 */
export interface SendNotificationResponse {
  success: boolean
  data: {
    notificationId: string
    sent: boolean
    channels: ChannelSendResult[]
  }
}

/**
 * Test notification response
 */
export interface TestNotificationResponse {
  success: boolean
  data: {
    notificationId: string
    channels: ChannelSendResult[]
  }
}

/**
 * Notification history item
 */
export interface NotificationHistoryItem {
  id: string
  type: NotificationType
  title: string
  body: string
  status: 'sent' | 'failed' | 'pending'
  createdAt: string
}

/**
 * Get notification history response
 */
export interface GetNotificationHistoryResponse {
  success: boolean
  data: {
    notifications: NotificationHistoryItem[]
  }
}

// ============================================================================
// Reply Types
// ============================================================================

/**
 * Reply item
 */
export interface ReplyItem {
  id: string
  notificationId: string
  channel: NotificationChannel | 'manual'
  content: string
  metadata?: Record<string, unknown>
  createdAt: string
}

/**
 * Poll replies response
 */
export interface PollRepliesResponse {
  success: boolean
  replies: ReplyItem[]
}

/**
 * Reply status
 */
export type ReplyStatus = 'replied' | 'pending' | 'not_found'

/**
 * Get reply response
 */
export interface GetReplyResponse {
  success: boolean
  status: ReplyStatus
  reply?: ReplyItem
}

/**
 * Get reply history response
 */
export interface GetReplyHistoryResponse {
  success: boolean
  replies: ReplyItem[]
}

/**
 * Manual reply request
 */
export interface ManualReplyRequest {
  notificationId: string
  content: string
  channel?: string
}

/**
 * Manual reply response
 */
export interface ManualReplyResponse {
  success: boolean
  reply: ReplyItem
}

// ============================================================================
// v8 Templates API Types
// ============================================================================

/**
 * Template type
 */
export type TemplateType = 'skill' | 'mcp' | 'agent' | 'hook'

/**
 * Template item
 */
export interface TemplateItem {
  id: string
  type: TemplateType
  name_en: string
  name_zh_cn: string
  description_en: string
  description_zh_cn?: string
  category: string
  tags: string[]
  author: string
  version: string
  install_command: string
  requirements?: string[]
  compatibility?: {
    platforms?: string[]
    frameworks?: string[]
  }
  usage_examples?: string[]
  is_official: boolean
  is_featured: boolean
  download_count: number
  rating_average: number
}

/**
 * List templates query parameters
 */
export interface ListTemplatesParams {
  type?: TemplateType
  category?: string
  tags?: string
  is_official?: boolean
  is_featured?: boolean
  sortBy?: 'download_count' | 'rating_average' | 'updated_at'
  limit?: number
  offset?: number
}

/**
 * List templates response
 */
export interface ListTemplatesResponse {
  code: number
  message: string
  data: {
    items: TemplateItem[]
    total: number
    limit: number
    offset: number
  }
}

/**
 * Get template response
 */
export interface GetTemplateResponse {
  code: number
  message: string
  data: TemplateItem
}

/**
 * Batch get templates request
 */
export interface BatchGetTemplatesRequest {
  ids: string[]
  language?: 'en' | 'zh-CN'
}

/**
 * Batch get templates response
 */
export interface BatchGetTemplatesResponse {
  requestId: string
  templates: Record<string, TemplateItem>
  notFound: string[]
}

/**
 * Search templates query parameters
 */
export interface SearchTemplatesParams {
  query: string
  type?: TemplateType
  limit?: number
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * API error response
 */
export interface ApiErrorResponse {
  success: false
  error: string
}

/**
 * Cloud API error codes
 */
export type CloudApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'DEVICE_NOT_FOUND'
  | 'BIND_CODE_EXPIRED'
  | 'BIND_CODE_USED'
  | 'CHANNEL_NOT_CONFIGURED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'

/**
 * Cloud API error
 */
export class CloudApiError extends Error {
  constructor(
    message: string,
    public code: CloudApiErrorCode,
    public statusCode?: number,
  ) {
    super(message)
    this.name = 'CloudApiError'
  }
}

// ============================================================================
// Client Configuration Types
// ============================================================================

/**
 * Cloud API client configuration
 */
export interface CloudApiClientConfig {
  /** Base URL for the API */
  baseUrl?: string
  /** Device token for authentication */
  deviceToken?: string
  /** Session token for user authentication */
  sessionToken?: string
  /** Request timeout in milliseconds */
  timeout?: number
  /** Number of retries for failed requests */
  retries?: number
  /** Custom headers */
  headers?: Record<string, string>
}

/**
 * Credentials storage interface
 */
export interface CloudCredentials {
  deviceToken: string
  deviceId: string
  userId: string
  createdAt: string
}

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface CloudApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: {
    requestId: string
    timestamp: number
  }
}

/**
 * Cloud recommendation from AI analysis
 */
export interface CloudRecommendation {
  id: string
  name: {
    en: string
    'zh-CN': string
  }
  description: {
    en: string
    'zh-CN': string
  }
  category: 'workflow' | 'mcp' | 'agent' | 'tool' | 'skill'
  relevanceScore: number
  tags: string[]
  templateId?: string
  dependencies?: string[]
}

/**
 * Cloud template for skills, workflows, etc.
 */
export interface CloudTemplate {
  id: string
  name: string
  version: string
  content: string
  type: 'skill' | 'workflow' | 'agent' | 'hook' | 'mcp'
  metadata: {
    author: string
    description: string
    tags: string[]
    createdAt: string
    updatedAt: string
  }
}

/**
 * Telemetry payload for anonymous usage statistics
 */
export interface TelemetryPayload {
  sessionId: string
  projectFingerprint: string
  events: TelemetryEvent[]
  metadata: {
    ccjkVersion: string
    platform: string
    nodeVersion: string
    timestamp: number
  }
}

/**
 * Individual telemetry event
 */
export interface TelemetryEvent {
  type: 'setup_started' | 'setup_completed' | 'setup_failed' | 'resource_installed' | 'error'
  timestamp: number
  data?: Record<string, unknown>
}

/**
 * Cloud recommendation response with insights
 */
export interface CloudRecommendationResponse {
  skills: CloudRecommendation[]
  mcpServices: CloudRecommendation[]
  agents: CloudRecommendation[]
  hooks: CloudRecommendation[]
  confidence: number
  fingerprint: string
  insights: CloudInsights
}

/**
 * AI-generated insights about the project
 */
export interface CloudInsights {
  insights: string[]
  productivityImprovements: string[]
  nextRecommendations: string[]
}
