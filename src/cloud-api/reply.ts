/**
 * CCJK Cloud API Reply Client
 *
 * Handles reply polling and management.
 *
 * @module cloud-api/reply
 */

import type {
  CloudApiClientConfig,
  GetReplyHistoryResponse,
  GetReplyResponse,
  ManualReplyRequest,
  ManualReplyResponse,
  PollRepliesResponse,
} from '../types/cloud-api'
import { CloudApiError } from '../types/cloud-api'

/**
 * Poll options
 */
export interface PollOptions {
  /** Timeout in seconds (default: 30) */
  timeout?: number
  /** Since timestamp for filtering */
  since?: string
}

/**
 * Reply client for polling and managing replies
 */
export class ReplyClient {
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
   * Long-poll for new replies
   *
   * @param options - Poll options
   * @returns Replies received
   */
  async poll(options: PollOptions = {}): Promise<PollRepliesResponse> {
    const params = new URLSearchParams()
    if (options.timeout) {
      params.set('timeout', String(options.timeout))
    }
    if (options.since) {
      params.set('since', options.since)
    }

    const query = params.toString()
    const path = query ? `/reply/poll?${query}` : '/reply/poll'

    // Use longer timeout for long-polling
    const pollTimeout = (options.timeout || 30) * 1000 + 5000
    const response = await this.fetch(path, {}, pollTimeout)

    return response.json()
  }

  /**
   * Get reply for a specific notification
   *
   * @param notificationId - Notification ID
   * @returns Reply if exists
   */
  async get(notificationId: string): Promise<GetReplyResponse> {
    const response = await this.fetch(`/reply/${notificationId}`)
    return response.json()
  }

  /**
   * Get reply history
   *
   * @param limit - Number of replies to return (default: 50)
   * @returns Reply history
   */
  async getHistory(limit = 50): Promise<GetReplyHistoryResponse> {
    const response = await this.fetch(`/reply/history?limit=${limit}`)
    return response.json()
  }

  /**
   * Submit a manual reply
   *
   * @param request - Manual reply request
   * @returns Created reply
   */
  async manual(request: ManualReplyRequest): Promise<ManualReplyResponse> {
    const response = await this.fetch('/reply/manual', {
      method: 'POST',
      body: JSON.stringify(request),
    })

    return response.json()
  }

  /**
   * Make authenticated request
   */
  private async fetch(
    path: string,
    options: RequestInit = {},
    timeout?: number,
  ): Promise<Response> {
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
    const timeoutMs = timeout || this.config.timeout
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

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
      const body = await response.json()
      if (body.error) {
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
