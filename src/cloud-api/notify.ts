/**
 * CCJK Cloud API Notification Client
 *
 * Handles notification sending and history.
 *
 * @module cloud-api/notify
 */

import type {
  CloudApiClientConfig,
  GetNotificationHistoryResponse,
  SendNotificationRequest,
  SendNotificationResponse,
  TestNotificationResponse,
} from '../types/cloud-api'
import { CloudApiError } from '../types/cloud-api'

/**
 * Notification client for sending notifications
 */
export class NotifyClient {
  private config: Required<CloudApiClientConfig>

  constructor(config: Required<CloudApiClientConfig>) {
    this.config = config
  }

  /**
   * Update device token
   */
  setDeviceToken(token: string): void {
    this.config.deviceToken = token
  }

  /**
   * Send a notification
   *
   * @param request - Notification request
   * @returns Send result
   */
  async send(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    const response = await this.fetch('/notify', {
      method: 'POST',
      body: JSON.stringify(request),
    })

    return response.json() as Promise<SendNotificationResponse>
  }

  /**
   * Send a test notification
   *
   * @returns Test result
   */
  async test(): Promise<TestNotificationResponse> {
    const response = await this.fetch('/notify/test', {
      method: 'POST',
    })

    return response.json() as Promise<TestNotificationResponse>
  }

  /**
   * Get notification history
   *
   * @param limit - Number of notifications to return (default: 50)
   * @returns Notification history
   */
  async getHistory(limit = 50): Promise<GetNotificationHistoryResponse> {
    const response = await this.fetch(`/notify/history?limit=${limit}`)

    return response.json() as Promise<GetNotificationHistoryResponse>
  }

  /**
   * Make authenticated request
   */
  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    if (!this.config.deviceToken) {
      throw new CloudApiError('Device token is required', 'UNAUTHORIZED')
    }

    const url = `${this.config.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-Token': this.config.deviceToken,
      ...this.config.headers,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        await this.handleError(response)
      }

      return response
    }
    catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof CloudApiError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new CloudApiError('Request timeout', 'TIMEOUT')
      }

      throw new CloudApiError(
        error instanceof Error ? error.message : 'Network error',
        'NETWORK_ERROR',
      )
    }
  }

  /**
   * Handle error response
   */
  private async handleError(response: Response): Promise<never> {
    let message = response.statusText

    try {
      const body = await response.json() as { error?: string }
      if (body && typeof body === 'object' && 'error' in body && body.error) {
        message = body.error
      }
    }
    catch {
      // Ignore parse errors
    }

    switch (response.status) {
      case 401:
        throw new CloudApiError(message, 'UNAUTHORIZED', response.status)
      case 403:
        throw new CloudApiError(message, 'FORBIDDEN', response.status)
      case 404:
        throw new CloudApiError(message, 'NOT_FOUND', response.status)
      case 429:
        throw new CloudApiError(message, 'RATE_LIMITED', response.status)
      default:
        throw new CloudApiError(message, 'INTERNAL_ERROR', response.status)
    }
  }
}
