/**
 * CCJK Cloud Notification Service
 *
 * Provides cloud-based notification functionality for task completion alerts.
 * Integrates with the CCJK Cloud Service (api.claudehome.cn) for device binding,
 * notification sending, and reply polling.
 *
 * @module services/cloud-notification
 */

import type {
  BindRequest,
  BindResponse,
  NotifyRequest,
  NotifyResponse,
  PollResponse,
} from '../cloud-client/notifications/types'
import type { DeviceInfo } from '../utils/notification/token'
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { createDefaultGateway } from '../cloud-client/gateway'
import {
  validateBindRequest,
  validateBindResponse,
  validateNotifyRequest,
  validateNotifyResponse,
  validatePollResponse,
} from '../cloud-client/notifications/types'
import { writeFileAtomic } from '../utils/fs-operations'
import { getDeviceInfo } from '../utils/notification/token'
import { CLOUD_ENDPOINTS } from '../constants'

// ============================================================================
// Constants
// ============================================================================

const CLOUD_API_BASE_URL = CLOUD_ENDPOINTS.MAIN.BASE_URL
const _DEFAULT_TIMEOUT = 30000 // 30 seconds
const POLL_TIMEOUT = 60000 // 60 seconds for long-polling
const TOKEN_FILE_PATH = join(homedir(), '.ccjk', 'cloud-token.json')

// ============================================================================
// Types
// ============================================================================

/**
 * Cloud token storage format
 */
export interface CloudTokenStorage {
  /** Device token for authentication */
  deviceToken: string
  /** Device ID assigned by cloud service */
  deviceId?: string
  /** Binding code used for initial binding */
  bindingCode?: string
  /** Timestamp when token was created */
  createdAt: string
  /** Timestamp when token was last used */
  lastUsedAt?: string
  /** Device information */
  deviceInfo?: DeviceInfo
}

// Note: BindRequest and BindResponse are now imported from cloud-client/notifications/types

/**
 * Notification options
 */
export interface NotifyOptions {
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
  actions?: Array<{
    id: string
    label: string
    value: string
  }>
}

// Re-export types from cloud-client for backward compatibility
export type { BindRequest, BindResponse, NotifyRequest, NotifyResponse, PollResponse } from '../cloud-client/notifications/types'

/**
 * Reply from user
 */
export interface CloudReply {
  /** Reply content */
  content: string
  /** Timestamp */
  timestamp: Date
  /** Related notification ID */
  notificationId?: string
  /** Action ID if user clicked a button */
  actionId?: string
}

/**
 * Cloud API response wrapper
 */
export interface CloudApiResponse<T = unknown> {
  /** Whether request was successful */
  success: boolean
  /** Response data */
  data?: T
  /** Error message */
  error?: string
  /** Error code */
  code?: string
}

// ============================================================================
// CCJKCloudClient Class
// ============================================================================

/**
 * CCJK Cloud Client
 *
 * Handles communication with the CCJK Cloud Service for notifications.
 * Implements device binding, notification sending, and reply polling.
 *
 * @example
 * ```typescript
 * const client = new CCJKCloudClient()
 *
 * // Bind device with code from mobile app
 * await client.bind('ABC123', { name: 'My Mac', platform: 'darwin' })
 *
 * // Send notification
 * await client.notify({
 *   title: 'Task Completed',
 *   body: 'Your build has finished successfully!'
 * })
 *
 * // Ask user and wait for reply
 * const reply = await client.ask('Continue with deployment?')
 * console.log('User replied:', reply.content)
 * ```
 */
export class CCJKCloudClient {
  private baseUrl: string
  private deviceToken: string | null = null
  private deviceId: string | null = null
  private gateway = createDefaultGateway()

  /**
   * Create a new CCJKCloudClient instance
   *
   * @param baseUrl - Cloud API base URL (default: https://api.claudehome.cn)
   */
  constructor(baseUrl: string = CLOUD_API_BASE_URL) {
    this.baseUrl = baseUrl
    this.loadToken()
  }

  // ==========================================================================
  // Token Management
  // ==========================================================================

  /**
   * Load token from storage file
   */
  private loadToken(): void {
    try {
      if (existsSync(TOKEN_FILE_PATH)) {
        const data = readFileSync(TOKEN_FILE_PATH, 'utf-8')
        const storage: CloudTokenStorage = JSON.parse(data)
        this.deviceToken = storage.deviceToken
        this.deviceId = storage.deviceId || null
      }
    }
    catch {
      // Token file doesn't exist or is invalid
      this.deviceToken = null
      this.deviceId = null
    }
  }

  /**
   * Save token to storage file
   */
  private saveToken(storage: CloudTokenStorage): void {
    try {
      const dir = join(homedir(), '.ccjk')
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileAtomic(TOKEN_FILE_PATH, JSON.stringify(storage, null, 2))
    }
    catch (error) {
      throw new Error(`Failed to save token: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Check if device is bound
   */
  isBound(): boolean {
    return this.deviceToken !== null && this.deviceToken.length > 0
  }

  /**
   * Get current device token
   */
  getDeviceToken(): string | null {
    return this.deviceToken
  }

  /**
   * Get current device ID
   */
  getDeviceId(): string | null {
    return this.deviceId
  }

  /**
   * Clear stored token (unbind device)
   */
  clearToken(): void {
    this.deviceToken = null
    this.deviceId = null
    try {
      if (existsSync(TOKEN_FILE_PATH)) {
        unlinkSync(TOKEN_FILE_PATH)
      }
    }
    catch {
      // Ignore errors when deleting token file
    }
  }

  // ==========================================================================
  // Device Binding
  // ==========================================================================

  /**
   * Bind device using a binding code
   *
   * The binding code is obtained from the CCJK mobile app or web dashboard.
   * Once bound, the device can send and receive notifications.
   *
   * @param code - Binding code from mobile app
   * @param deviceInfo - Optional device information (auto-detected if not provided)
   * @returns Bind response with device token
   *
   * @example
   * ```typescript
   * const client = new CCJKCloudClient()
   * const result = await client.bind('ABC123')
   * if (result.success) {
   *   console.log('Device bound successfully!')
   * }
   * ```
   */
  async bind(code: string, deviceInfo?: Partial<DeviceInfo>): Promise<BindResponse> {
    const info = deviceInfo
      ? { ...getDeviceInfo(), ...deviceInfo }
      : getDeviceInfo()

    // Validate request
    const requestPayload: BindRequest = {
      code,
      deviceInfo: info,
    }
    const requestValidation = validateBindRequest(requestPayload)
    if (!requestValidation.valid) {
      return {
        success: false,
        error: `Invalid bind request: ${requestValidation.errors.join(', ')}`,
        code: 'VALIDATION_ERROR',
      }
    }

    // Make request through gateway
    const response = await this.gateway.request<{
      deviceToken: string
      deviceId: string
    }>('notifications.bind', {
      method: 'POST',
      body: requestPayload,
      authToken: this.deviceToken || undefined,
    })

    // Validate response
    const responseValidation = validateBindResponse(response as BindResponse)
    if (!responseValidation.valid) {
      return {
        success: false,
        error: `Invalid bind response: ${responseValidation.errors.join(', ')}`,
        code: 'RESPONSE_VALIDATION_ERROR',
      }
    }

    if (response.success && response.data) {
      this.deviceToken = response.data.deviceToken
      this.deviceId = response.data.deviceId

      // Update gateway auth token
      this.gateway.setAuthToken(response.data.deviceToken)

      // Save token to storage
      this.saveToken({
        deviceToken: response.data.deviceToken,
        deviceId: response.data.deviceId,
        bindingCode: code,
        createdAt: new Date().toISOString(),
        deviceInfo: info,
      })

      return {
        success: true,
        data: {
          deviceToken: response.data.deviceToken,
          deviceId: response.data.deviceId,
        },
      }
    }

    return {
      success: false,
      error: response.error || 'Failed to bind device',
      code: response.code,
    }
  }

  // ==========================================================================
  // Notification Sending
  // ==========================================================================

  /**
   * Send a notification to the user
   *
   * @param options - Notification options
   * @returns Notification response
   *
   * @example
   * ```typescript
   * const client = new CCJKCloudClient()
   * await client.notify({
   *   title: 'Build Complete',
   *   body: 'Your project has been built successfully!',
   *   type: 'success'
   * })
   * ```
   */
  async notify(options: NotifyOptions): Promise<NotifyResponse> {
    if (!this.deviceToken) {
      return {
        success: false,
        error: 'Device not bound. Please run "ccjk notification bind <code>" first.',
        code: 'NOT_BOUND',
      }
    }

    // Validate request
    const requestPayload: NotifyRequest = {
      title: options.title,
      body: options.body,
      type: options.type || 'info',
      taskId: options.taskId,
      metadata: options.metadata,
      actions: options.actions,
    }
    const requestValidation = validateNotifyRequest(requestPayload)
    if (!requestValidation.valid) {
      return {
        success: false,
        error: `Invalid notify request: ${requestValidation.errors.join(', ')}`,
        code: 'VALIDATION_ERROR',
      }
    }

    // Make request through gateway
    const response = await this.gateway.request<{
      notificationId: string
    }>('notifications.send', {
      method: 'POST',
      body: requestPayload,
      authToken: this.deviceToken,
    })

    // Validate response
    const responseValidation = validateNotifyResponse(response as NotifyResponse)
    if (!responseValidation.valid) {
      return {
        success: false,
        error: `Invalid notify response: ${responseValidation.errors.join(', ')}`,
        code: 'RESPONSE_VALIDATION_ERROR',
      }
    }

    if (response.success && response.data) {
      return {
        success: true,
        data: {
          notificationId: response.data.notificationId,
        },
      }
    }

    return {
      success: false,
      error: response.error || 'Failed to send notification',
      code: response.code,
    }
  }

  // ==========================================================================
  // Reply Polling
  // ==========================================================================

  /**
   * Wait for a reply from the user
   *
   * Uses long-polling to wait for a user reply. The timeout parameter
   * controls how long to wait before returning null.
   *
   * @param timeout - Timeout in milliseconds (default: 30000)
   * @returns User reply or null if timeout
   *
   * @example
   * ```typescript
   * const client = new CCJKCloudClient()
   * const reply = await client.waitForReply(60000) // Wait up to 60 seconds
   * if (reply) {
   *   console.log('User replied:', reply.content)
   * }
   * ```
   */
  async waitForReply(timeout: number = POLL_TIMEOUT): Promise<CloudReply | null> {
    if (!this.deviceToken) {
      throw new Error('Device not bound. Please run "ccjk notification bind <code>" first.')
    }

    // Make request through gateway
    const response = await this.gateway.request<{
      reply: {
        content: string
        timestamp: string
        notificationId?: string
        actionId?: string
      } | null
    }>('notifications.poll', {
      method: 'GET',
      query: { timeout },
      authToken: this.deviceToken,
      timeout,
    })

    // Validate response
    const responseValidation = validatePollResponse(response as PollResponse)
    if (!responseValidation.valid) {
      throw new Error(`Invalid poll response: ${responseValidation.errors.join(', ')}`)
    }

    // If request failed, throw error
    if (!response.success) {
      throw new Error(response.error || 'Failed to poll for reply')
    }

    if (response.data?.reply) {
      return {
        content: response.data.reply.content,
        timestamp: new Date(response.data.reply.timestamp),
        notificationId: response.data.reply.notificationId,
        actionId: response.data.reply.actionId,
      }
    }

    return null
  }

  // ==========================================================================
  // Ask and Wait
  // ==========================================================================

  /**
   * Ask the user a question and wait for their reply
   *
   * This is a convenience method that combines notify() and waitForReply().
   * It sends a notification with the question and waits for the user to respond.
   *
   * @param question - Question to ask the user
   * @param options - Additional notification options
   * @param timeout - Timeout in milliseconds (default: 60000)
   * @returns User reply
   *
   * @example
   * ```typescript
   * const client = new CCJKCloudClient()
   * const reply = await client.ask('Deploy to production?', {
   *   actions: [
   *     { id: 'yes', label: 'Yes', value: 'yes' },
   *     { id: 'no', label: 'No', value: 'no' }
   *   ]
   * })
   * if (reply.actionId === 'yes') {
   *   // Proceed with deployment
   * }
   * ```
   */
  async ask(
    question: string,
    options?: Partial<NotifyOptions>,
    timeout: number = POLL_TIMEOUT,
  ): Promise<CloudReply> {
    // Send the question as a notification
    const notifyResult = await this.notify({
      title: options?.title || 'CCJK Question',
      body: question,
      type: 'info',
      ...options,
    })

    if (!notifyResult.success) {
      throw new Error(notifyResult.error || 'Failed to send question')
    }

    // Wait for reply
    const reply = await this.waitForReply(timeout)

    if (!reply) {
      throw new Error('No reply received within timeout')
    }

    return reply
  }

  // ==========================================================================
  // Status Check
  // ==========================================================================

  /**
   * Get binding status and device information
   *
   * @returns Binding status information
   */
  async getStatus(): Promise<{
    bound: boolean
    deviceId?: string
    deviceInfo?: DeviceInfo
    lastUsed?: string
  }> {
    if (!this.deviceToken) {
      return { bound: false }
    }

    try {
      // Try to load stored info
      if (existsSync(TOKEN_FILE_PATH)) {
        const data = readFileSync(TOKEN_FILE_PATH, 'utf-8')
        const storage: CloudTokenStorage = JSON.parse(data)
        return {
          bound: true,
          deviceId: storage.deviceId,
          deviceInfo: storage.deviceInfo,
          lastUsed: storage.lastUsedAt,
        }
      }
    }
    catch {
      // Ignore errors
    }

    return {
      bound: true,
      deviceId: this.deviceId || undefined,
    }
  }

  // Note: HTTP requests now handled by CloudApiGateway
}

// ============================================================================
// Singleton Instance
// ============================================================================

let cloudClientInstance: CCJKCloudClient | null = null

/**
 * Get the singleton CCJKCloudClient instance
 */
export function getCloudNotificationClient(): CCJKCloudClient {
  if (!cloudClientInstance) {
    cloudClientInstance = new CCJKCloudClient()
  }
  return cloudClientInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetCloudNotificationClient(): void {
  cloudClientInstance = null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Bind device using a binding code
 *
 * @param code - Binding code from mobile app
 * @param deviceInfo - Optional device information
 * @returns Bind response
 */
export async function bindDevice(
  code: string,
  deviceInfo?: Partial<DeviceInfo>,
): Promise<BindResponse> {
  const client = getCloudNotificationClient()
  return client.bind(code, deviceInfo)
}

/**
 * Send a notification
 *
 * @param options - Notification options
 * @returns Notification response
 */
export async function sendNotification(options: NotifyOptions): Promise<NotifyResponse> {
  const client = getCloudNotificationClient()
  return client.notify(options)
}

/**
 * Wait for a reply from the user
 *
 * @param timeout - Timeout in milliseconds
 * @returns User reply or null
 */
export async function waitForReply(timeout?: number): Promise<CloudReply | null> {
  const client = getCloudNotificationClient()
  return client.waitForReply(timeout)
}

/**
 * Ask the user a question and wait for reply
 *
 * @param question - Question to ask
 * @param options - Additional options
 * @param timeout - Timeout in milliseconds
 * @returns User reply
 */
export async function askUser(
  question: string,
  options?: Partial<NotifyOptions>,
  timeout?: number,
): Promise<CloudReply> {
  const client = getCloudNotificationClient()
  return client.ask(question, options, timeout)
}

/**
 * Check if device is bound
 */
export function isDeviceBound(): boolean {
  const client = getCloudNotificationClient()
  return client.isBound()
}

/**
 * Get binding status
 */
export async function getBindingStatus(): Promise<{
  bound: boolean
  deviceId?: string
  deviceInfo?: DeviceInfo
  lastUsed?: string
}> {
  const client = getCloudNotificationClient()
  return client.getStatus()
}

/**
 * Unbind device (clear token)
 */
export function unbindDevice(): void {
  const client = getCloudNotificationClient()
  client.clearToken()
}
