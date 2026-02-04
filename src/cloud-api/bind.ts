/**
 * CCJK Cloud API Device Binding Client
 *
 * Handles device binding via 6-digit codes.
 *
 * @module cloud-api/bind
 */

import type {
  CloudApiClientConfig,
  DeleteDeviceResponse,
  GenerateBindCodeResponse,
  GetBindCodeStatusResponse,
  GetDevicesResponse,
  UseBindCodeRequest,
  UseBindCodeResponse,
} from '../types/cloud-api'
import { CloudApiError } from '../types/cloud-api'

/**
 * Device binding client
 */
export class BindClient {
  private config: Required<CloudApiClientConfig>

  constructor(config: Required<CloudApiClientConfig>) {
    this.config = config
  }

  /**
   * Update session token
   */
  setSessionToken(token: string): void {
    this.config.sessionToken = token
  }

  /**
   * Generate a 6-digit bind code (requires user auth)
   *
   * @returns Generated bind code
   */
  async generate(): Promise<GenerateBindCodeResponse> {
    const response = await this.fetch('/bind/generate', {
      method: 'POST',
    }, true)

    return response.json() as Promise<GenerateBindCodeResponse>
  }

  /**
   * Use a bind code to register device
   *
   * @param request - Bind code and device info
   * @returns Device token and ID
   */
  async use(request: UseBindCodeRequest): Promise<UseBindCodeResponse> {
    const response = await this.fetch('/bind/use', {
      method: 'POST',
      body: JSON.stringify(request),
    })

    return response.json() as Promise<UseBindCodeResponse>
  }

  /**
   * Get bind code status (requires user auth)
   *
   * @param code - Bind code to check
   * @returns Bind code status
   */
  async getStatus(code: string): Promise<GetBindCodeStatusResponse> {
    const response = await this.fetch(`/bind/status/${code}`, {}, true)
    return response.json() as Promise<GetBindCodeStatusResponse>
  }

  /**
   * Get user's devices (requires user auth)
   *
   * @returns List of devices
   */
  async getDevices(): Promise<GetDevicesResponse> {
    const response = await this.fetch('/bind/devices', {}, true)
    return response.json() as Promise<GetDevicesResponse>
  }

  /**
   * Delete a device (requires user auth)
   *
   * @param deviceId - Device ID to delete
   * @returns Delete result
   */
  async deleteDevice(deviceId: string): Promise<DeleteDeviceResponse> {
    const response = await this.fetch(`/bind/devices/${deviceId}`, {
      method: 'DELETE',
    }, true)

    return response.json() as Promise<DeleteDeviceResponse>
  }

  /**
   * Make request to API
   */
  private async fetch(
    path: string,
    options: RequestInit = {},
    requireAuth = false,
  ): Promise<Response> {
    if (requireAuth && !this.config.sessionToken) {
      throw new CloudApiError('Session token is required', 'UNAUTHORIZED')
    }

    const url = `${this.config.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    }

    if (requireAuth && this.config.sessionToken) {
      headers.Authorization = `Bearer ${this.config.sessionToken}`
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
      if (body.error) {
        message = body.error
      }
    }
    catch {
      // Ignore parse errors
    }

    switch (response.status) {
      case 400:
        if (message.includes('expired')) {
          throw new CloudApiError(message, 'BIND_CODE_EXPIRED', response.status)
        }
        if (message.includes('used')) {
          throw new CloudApiError(message, 'BIND_CODE_USED', response.status)
        }
        throw new CloudApiError(message, 'VALIDATION_ERROR', response.status)
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
