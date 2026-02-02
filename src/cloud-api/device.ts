/**
 * CCJK Cloud API Device Management Client
 *
 * Handles device registration and management.
 *
 * @module cloud-api/device
 */

import type {
  CloudApiClientConfig,
  DeleteDeviceResponse,
  GetDeviceChannelsResponse,
  GetDeviceInfoResponse,
  RegenerateTokenResponse,
  RegisterDeviceRequest,
  RegisterDeviceResponse,
  UpdateDeviceChannelsRequest,
  UpdateDeviceChannelsResponse,
} from '../types/cloud-api'
import { CloudApiError } from '../types/cloud-api'

/**
 * Device management client
 */
export class DeviceClient {
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
   * Register a new device or update existing
   *
   * @param request - Device registration info
   * @returns Device ID and token
   */
  async register(request: RegisterDeviceRequest): Promise<RegisterDeviceResponse> {
    const response = await this.fetch('/device/register', {
      method: 'POST',
      body: JSON.stringify(request),
    })

    return response.json()
  }

  /**
   * Get current device information
   *
   * @returns Device info
   */
  async getInfo(): Promise<GetDeviceInfoResponse> {
    const response = await this.fetch('/device/info', {}, true)
    return response.json()
  }

  /**
   * Get device notification channels
   *
   * @returns Channel configurations
   */
  async getChannels(): Promise<GetDeviceChannelsResponse> {
    const response = await this.fetch('/device/channels', {}, true)
    return response.json()
  }

  /**
   * Update device notification channels
   *
   * @param request - Channel configurations
   * @returns Update result
   */
  async updateChannels(request: UpdateDeviceChannelsRequest): Promise<UpdateDeviceChannelsResponse> {
    const response = await this.fetch('/device/channels', {
      method: 'PUT',
      body: JSON.stringify(request),
    }, true)

    return response.json()
  }

  /**
   * Regenerate device token
   *
   * @returns New device token
   */
  async regenerateToken(): Promise<RegenerateTokenResponse> {
    const response = await this.fetch('/device/token', {
      method: 'POST',
    }, true)

    return response.json()
  }

  /**
   * Delete current device
   *
   * @returns Delete result
   */
  async delete(): Promise<DeleteDeviceResponse> {
    const response = await this.fetch('/device', {
      method: 'DELETE',
    }, true)

    return response.json()
  }

  /**
   * Make authenticated request
   */
  private async fetch(
    path: string,
    options: RequestInit = {},
    requireAuth = false,
  ): Promise<Response> {
    if (requireAuth && !this.config.deviceToken) {
      throw new CloudApiError('Device token is required', 'UNAUTHORIZED')
    }

    const url = `${this.config.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    }

    if (requireAuth && this.config.deviceToken) {
      headers['X-Device-Token'] = this.config.deviceToken
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
        throw new CloudApiError(message, 'DEVICE_NOT_FOUND', response.status)
      case 429:
        throw new CloudApiError(message, 'RATE_LIMITED', response.status)
      default:
        throw new CloudApiError(message, 'INTERNAL_ERROR', response.status)
    }
  }
}
