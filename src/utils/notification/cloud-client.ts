/**
 * CCJK Notification System - Cloud Service Client
 *
 * HTTP client for communicating with the CCJK Cloud Service.
 * Handles device registration, notification sending, and reply polling.
 */

import type {
  CloudApiResponse,
  DeviceRegisterRequest,
  DeviceRegisterResponse,
  NotificationChannel,
  NotificationMessage,
  NotificationResult,
  NotificationType,
  UserReply,
} from './types'
import { loadNotificationConfig, updateNotificationConfig } from './config'
import { getDeviceInfo } from './token'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CLOUD_ENDPOINT = 'https://api.claudehome.cn'
const REQUEST_TIMEOUT = 30000 // 30 seconds
const POLL_TIMEOUT = 60000 // 60 seconds for long-polling

// ============================================================================
// Cloud Client Class
// ============================================================================

/**
 * Cloud Service Client
 *
 * Handles all communication with the CCJK Cloud Service.
 */
export class CloudClient {
  private static instance: CloudClient | null = null

  private endpoint: string = DEFAULT_CLOUD_ENDPOINT
  private deviceToken: string = ''
  private isPolling: boolean = false
  private pollAbortController: AbortController | null = null

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): CloudClient {
    if (!CloudClient.instance) {
      CloudClient.instance = new CloudClient()
    }
    return CloudClient.instance
  }

  /**
   * Initialize the cloud client
   */
  async initialize(): Promise<void> {
    const config = await loadNotificationConfig()
    this.endpoint = config.cloudEndpoint || DEFAULT_CLOUD_ENDPOINT
    this.deviceToken = config.deviceToken
  }

  /**
   * Set the cloud endpoint
   */
  setEndpoint(endpoint: string): void {
    this.endpoint = endpoint
  }

  /**
   * Set the device token
   */
  setDeviceToken(token: string): void {
    this.deviceToken = token
  }

  // ==========================================================================
  // Device Registration
  // ==========================================================================

  /**
   * Register this device with the cloud service
   */
  async registerDevice(name?: string): Promise<DeviceRegisterResponse> {
    const deviceInfo = getDeviceInfo()
    const config = await loadNotificationConfig()

    // Convert channels to array format for API
    const channelsArray = this.convertChannelsToArray(config.channels as Record<string, unknown>)

    const request: DeviceRegisterRequest = {
      name: name || deviceInfo.name,
      platform: deviceInfo.platform,
      version: '1.0.0', // Static version for cloud client
      config: {
        channels: channelsArray as any,
        threshold: config.threshold,
      },
    }

    const response = await this.request<DeviceRegisterResponse>(
      '/device/register',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
    )

    if (response.success && response.data) {
      // Save the token to config
      await updateNotificationConfig({
        deviceToken: response.data.token,
      })
      this.deviceToken = response.data.token
      return response.data
    }

    throw new Error(response.error || 'Failed to register device')
  }

  /**
   * Get device info from cloud service
   */
  async getDeviceInfo(): Promise<Record<string, unknown>> {
    const response = await this.request<Record<string, unknown>>(
      '/device/info',
      { method: 'GET' },
    )

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to get device info')
  }

  /**
   * Update device channels on cloud service
   */
  async updateChannels(channels: Record<string, unknown>): Promise<void> {
    // Convert object format to array format for API
    const channelsArray = this.convertChannelsToArray(channels)

    const response = await this.request(
      '/device/channels',
      {
        method: 'PUT',
        body: JSON.stringify({ channels: channelsArray }),
      },
    )

    if (!response.success) {
      throw new Error(response.error || 'Failed to update channels')
    }
  }

  // ==========================================================================
  // Notification Sending
  // ==========================================================================

  /**
   * Send a notification through the cloud service
   */
  async sendNotification(
    message: NotificationMessage,
    channels?: NotificationChannel[],
  ): Promise<NotificationResult[]> {
    const config = await loadNotificationConfig()

    // Get enabled channels if not specified
    const targetChannels = channels || this.getEnabledChannelsFromConfig(config.channels as Record<string, { enabled?: boolean }>)

    if (targetChannels.length === 0) {
      return []
    }

    // Generate title and body from message
    const title = message.title || this.generateTitle(message.type)
    const body = this.generateBody(message)

    const response = await this.request<{
      notificationId: string
      results: NotificationResult[]
    }>(
      '/notify',
      {
        method: 'POST',
        body: JSON.stringify({
          type: message.type,
          title,
          body,
          task: message.task,
          channels: targetChannels,
          actions: message.actions,
          priority: message.priority,
        }),
      },
    )

    if (response.success && response.data) {
      return response.data.results
    }

    // Return error results for all channels
    return targetChannels.map(channel => ({
      success: false,
      channel,
      sentAt: new Date(),
      error: response.error || 'Failed to send notification',
    }))
  }

  /**
   * Send a test notification
   */
  async sendTestNotification(): Promise<NotificationResult[]> {
    const response = await this.request<{
      notificationId: string
      results: NotificationResult[]
    }>(
      '/notify/test',
      { method: 'POST' },
    )

    if (response.success && response.data) {
      return response.data.results
    }

    throw new Error(response.error || 'Failed to send test notification')
  }

  // ==========================================================================
  // Reply Polling
  // ==========================================================================

  /**
   * Start polling for replies
   *
   * @param onReply - Callback when a reply is received
   * @param onError - Callback when an error occurs
   */
  startPolling(
    onReply: (reply: UserReply) => void,
    onError?: (error: Error) => void,
  ): void {
    if (this.isPolling) {
      return
    }

    this.isPolling = true
    this.pollLoop(onReply, onError)
  }

  /**
   * Stop polling for replies
   */
  stopPolling(): void {
    this.isPolling = false
    if (this.pollAbortController) {
      this.pollAbortController.abort()
      this.pollAbortController = null
    }
  }

  /**
   * Poll loop for replies
   */
  private async pollLoop(
    onReply: (reply: UserReply) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    while (this.isPolling) {
      try {
        const reply = await this.pollForReply()
        if (reply) {
          onReply(reply)
        }
      }
      catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Polling was stopped
          break
        }
        onError?.(error instanceof Error ? error : new Error(String(error)))
        // Wait before retrying on error
        await this.sleep(5000)
      }
    }
  }

  /**
   * Poll for a single reply (long-polling)
   */
  async pollForReply(): Promise<UserReply | null> {
    this.pollAbortController = new AbortController()

    try {
      const response = await this.request<{
        reply: UserReply | null
      }>(
        '/reply/poll',
        {
          method: 'GET',
          signal: this.pollAbortController.signal,
          timeout: POLL_TIMEOUT,
        },
      )

      if (response.success && response.data?.reply) {
        return {
          ...response.data.reply,
          timestamp: new Date(response.data.reply.timestamp),
        }
      }

      return null
    }
    finally {
      this.pollAbortController = null
    }
  }

  /**
   * Get reply for a specific notification
   */
  async getReply(notificationId: string): Promise<UserReply | null> {
    const response = await this.request<{
      reply: UserReply | null
    }>(
      `/reply/${notificationId}`,
      { method: 'GET' },
    )

    if (response.success && response.data?.reply) {
      return {
        ...response.data.reply,
        timestamp: new Date(response.data.reply.timestamp),
      }
    }

    return null
  }

  // ==========================================================================
  // HTTP Request Helper
  // ==========================================================================

  /**
   * Make an HTTP request to the cloud service
   */
  private async request<T>(
    path: string,
    options: {
      method: string
      body?: string
      signal?: AbortSignal
      timeout?: number
    },
  ): Promise<CloudApiResponse<T>> {
    const url = `${this.endpoint}${path}`
    const timeout = options.timeout || REQUEST_TIMEOUT

    // Create timeout abort controller if no signal provided
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout)

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': this.deviceToken,
        },
        body: options.body,
        signal: options.signal || timeoutController.signal,
      })

      clearTimeout(timeoutId)

      const data = await response.json() as CloudApiResponse<T>

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          code: data.code,
        }
      }

      return data
    }
    catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw error // Re-throw abort errors
        }
        return {
          success: false,
          error: error.message,
          code: 'NETWORK_ERROR',
        }
      }

      return {
        success: false,
        error: String(error),
        code: 'UNKNOWN_ERROR',
      }
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get enabled channels from config
   */
  private getEnabledChannelsFromConfig(
    channels: Record<string, { enabled?: boolean }>,
  ): NotificationChannel[] {
    const enabledChannels: NotificationChannel[] = []

    for (const [name, channelConfig] of Object.entries(channels)) {
      if (channelConfig?.enabled) {
        enabledChannels.push(name as NotificationChannel)
      }
    }

    return enabledChannels
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Convert channels from object format to array format
   *
   * Converts from: { feishu: { enabled: true, webhookUrl: "..." } }
   * To: [{ type: "feishu", enabled: true, config: { webhookUrl: "..." } }]
   */
  private convertChannelsToArray(channels: Record<string, unknown>): Array<{
    type: string
    enabled: boolean
    config: Record<string, unknown>
  }> {
    const result: Array<{
      type: string
      enabled: boolean
      config: Record<string, unknown>
    }> = []

    for (const [channelType, channelData] of Object.entries(channels)) {
      if (channelData && typeof channelData === 'object') {
        const { enabled, ...config } = channelData as Record<string, unknown>
        result.push({
          type: channelType,
          enabled: Boolean(enabled),
          config,
        })
      }
    }

    return result
  }

  /**
   * Generate notification title based on type
   */
  private generateTitle(type: NotificationType): string {
    const titles: Record<NotificationType, string> = {
      task_started: 'Task Started',
      task_progress: 'Task Progress',
      task_completed: 'Task Completed',
      task_failed: 'Task Failed',
      task_cancelled: 'Task Cancelled',
      system: 'System Notification',
    }
    return titles[type] || 'Notification'
  }

  /**
   * Generate notification body from message
   */
  private generateBody(message: NotificationMessage): string {
    const { task } = message
    const lines: string[] = []

    lines.push(`**Task**: ${task.description}`)
    lines.push(`**Status**: ${task.status}`)

    if (task.duration) {
      const minutes = Math.floor(task.duration / 60000)
      const seconds = Math.floor((task.duration % 60000) / 1000)
      lines.push(`**Duration**: ${minutes}m ${seconds}s`)
    }

    if (task.result) {
      lines.push(`**Result**: ${task.result}`)
    }

    if (task.error) {
      lines.push(`**Error**: ${task.error}`)
    }

    return lines.join('\n')
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    if (CloudClient.instance) {
      CloudClient.instance.stopPolling()
      CloudClient.instance = null
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the cloud client instance
 */
export function getCloudClient(): CloudClient {
  return CloudClient.getInstance()
}

/**
 * Initialize the cloud client
 */
export async function initializeCloudClient(): Promise<void> {
  const client = getCloudClient()
  await client.initialize()
}

/**
 * Register device with cloud service
 */
export async function registerDevice(name?: string): Promise<DeviceRegisterResponse> {
  const client = getCloudClient()
  await client.initialize()
  return client.registerDevice(name)
}

/**
 * Send notification through cloud service
 */
export async function sendCloudNotification(
  message: NotificationMessage,
  channels?: NotificationChannel[],
): Promise<NotificationResult[]> {
  const client = getCloudClient()
  await client.initialize()
  return client.sendNotification(message, channels)
}

/**
 * Start polling for replies
 */
export function startReplyPolling(
  onReply: (reply: UserReply) => void,
  onError?: (error: Error) => void,
): void {
  const client = getCloudClient()
  client.startPolling(onReply, onError)
}

/**
 * Stop polling for replies
 */
export function stopReplyPolling(): void {
  const client = getCloudClient()
  client.stopPolling()
}
