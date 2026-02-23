/**
 * Cloud Client - Notification DTOs
 *
 * Type-safe request/response definitions for notification API endpoints.
 * Aligns with CloudApiGateway routes: notifications.bind, notifications.send, notifications.poll
 *
 * @module cloud-client/notifications/types
 */

import type { DeviceInfo } from '../../utils/notification/token'

// ============================================================================
// Bind Endpoint (/bind/use)
// ============================================================================

/**
 * Bind request payload
 *
 * POST /bind/use
 */
export interface BindRequest {
  /** Binding code from mobile app */
  code: string
  /** Device information */
  deviceInfo: DeviceInfo
}

/**
 * Bind response data
 *
 * Response from POST /bind/use
 */
export interface BindResponseData {
  /** Device token for authentication */
  deviceToken: string
  /** Device ID assigned by cloud service */
  deviceId: string
}

/**
 * Bind response (wrapped in CloudApiResponse)
 */
export interface BindResponse {
  success: boolean
  data?: BindResponseData
  error?: string
  code?: string
}

// ============================================================================
// Notify Endpoint (/notify)
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
}

/**
 * Notify request payload
 *
 * POST /notify
 */
export interface NotifyRequest {
  /** Notification title */
  title: string
  /** Notification body/content */
  body: string
  /** Notification type */
  type?: 'info' | 'success' | 'warning' | 'error'
  /** Task ID for tracking */
  taskId?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
  /** Action buttons */
  actions?: NotificationAction[]
}

/**
 * Notify response data
 *
 * Response from POST /notify
 */
export interface NotifyResponseData {
  /** Notification ID */
  notificationId: string
}

/**
 * Notify response (wrapped in CloudApiResponse)
 */
export interface NotifyResponse {
  success: boolean
  data?: NotifyResponseData
  error?: string
  code?: string
}

// ============================================================================
// Poll Endpoint (/reply/poll)
// ============================================================================

/**
 * Reply from user
 */
export interface ReplyData {
  /** Reply content */
  content: string
  /** Timestamp (ISO string) */
  timestamp: string
  /** Related notification ID */
  notificationId?: string
  /** Action ID if user clicked a button */
  actionId?: string
}

/**
 * Poll request query parameters
 *
 * GET /reply/poll?timeout=60000
 */
export interface PollRequest {
  /** Timeout in milliseconds */
  timeout?: number
}

/**
 * Poll response data
 *
 * Response from GET /reply/poll
 */
export interface PollResponseData {
  /** User reply (null if timeout) */
  reply: ReplyData | null
}

/**
 * Poll response (wrapped in CloudApiResponse)
 */
export interface PollResponse {
  success: boolean
  data?: PollResponseData
  error?: string
  code?: string
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate bind request
 */
export function validateBindRequest(
  request: BindRequest,
): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  if (!request.code || typeof request.code !== 'string') {
    errors.push('code is required and must be a string')
  }
  else if (request.code.length < 4) {
    errors.push('code must be at least 4 characters')
  }

  if (!request.deviceInfo || typeof request.deviceInfo !== 'object') {
    errors.push('deviceInfo is required and must be an object')
  }
  else {
    if (!request.deviceInfo.name || typeof request.deviceInfo.name !== 'string') {
      errors.push('deviceInfo.name is required and must be a string')
    }
    if (!request.deviceInfo.platform || typeof request.deviceInfo.platform !== 'string') {
      errors.push('deviceInfo.platform is required and must be a string')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate notify request
 */
export function validateNotifyRequest(
  request: NotifyRequest,
): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  if (!request.title || typeof request.title !== 'string') {
    errors.push('title is required and must be a string')
  }
  else if (request.title.length > 200) {
    errors.push('title must be 200 characters or less')
  }

  if (!request.body || typeof request.body !== 'string') {
    errors.push('body is required and must be a string')
  }
  else if (request.body.length > 4000) {
    errors.push('body must be 4000 characters or less')
  }

  if (request.type && !['info', 'success', 'warning', 'error'].includes(request.type)) {
    errors.push('type must be one of: info, success, warning, error')
  }

  if (request.actions) {
    if (!Array.isArray(request.actions)) {
      errors.push('actions must be an array')
    }
    else {
      request.actions.forEach((action, index) => {
        if (!action.id || typeof action.id !== 'string') {
          errors.push(`actions[${index}].id is required and must be a string`)
        }
        if (!action.label || typeof action.label !== 'string') {
          errors.push(`actions[${index}].label is required and must be a string`)
        }
        if (!action.value || typeof action.value !== 'string') {
          errors.push(`actions[${index}].value is required and must be a string`)
        }
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate bind response
 */
export function validateBindResponse(
  response: BindResponse,
): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  if (typeof response.success !== 'boolean') {
    errors.push('success is required and must be a boolean')
  }

  if (response.success) {
    if (!response.data) {
      errors.push('data is required when success is true')
    }
    else {
      if (!response.data.deviceToken || typeof response.data.deviceToken !== 'string') {
        errors.push('data.deviceToken is required and must be a string')
      }
      if (!response.data.deviceId || typeof response.data.deviceId !== 'string') {
        errors.push('data.deviceId is required and must be a string')
      }
    }
  }
  else {
    if (!response.error || typeof response.error !== 'string') {
      errors.push('error is required when success is false')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate notify response
 */
export function validateNotifyResponse(
  response: NotifyResponse,
): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  if (typeof response.success !== 'boolean') {
    errors.push('success is required and must be a boolean')
  }

  if (response.success) {
    if (!response.data) {
      errors.push('data is required when success is true')
    }
    else {
      if (!response.data.notificationId || typeof response.data.notificationId !== 'string') {
        errors.push('data.notificationId is required and must be a string')
      }
    }
  }
  else {
    if (!response.error || typeof response.error !== 'string') {
      errors.push('error is required when success is false')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate poll response
 */
export function validatePollResponse(
  response: PollResponse,
): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  if (typeof response.success !== 'boolean') {
    errors.push('success is required and must be a boolean')
  }

  if (response.success) {
    if (!response.data) {
      errors.push('data is required when success is true')
    }
    else if (response.data.reply !== null) {
      const reply = response.data.reply
      if (!reply.content || typeof reply.content !== 'string') {
        errors.push('data.reply.content is required and must be a string')
      }
      if (!reply.timestamp || typeof reply.timestamp !== 'string') {
        errors.push('data.reply.timestamp is required and must be a string')
      }
    }
  }
  else {
    if (!response.error || typeof response.error !== 'string') {
      errors.push('error is required when success is false')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
