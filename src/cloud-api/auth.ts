/**
 * CCJK Cloud API Authentication Client
 *
 * Handles user authentication via email verification.
 *
 * @module cloud-api/auth
 */

import type {
  CloudApiClientConfig,
  GetMeResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  VerifyRequest,
  VerifyResponse,
} from '../types/cloud-api'
import { CloudApiError } from '../types/cloud-api'

/**
 * Authentication client for user login/logout
 */
export class AuthClient {
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
   * Send verification code to email
   *
   * @param email - User email address
   * @returns Login response with success status
   */
  async login(email: string): Promise<LoginResponse> {
    const request: LoginRequest = { email }
    const response = await this.fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(request),
    })

    return response.json()
  }

  /**
   * Verify email with code
   *
   * @param email - User email address
   * @param code - Verification code
   * @returns Verify response with session token
   */
  async verify(email: string, code: string): Promise<VerifyResponse> {
    const request: VerifyRequest = { email, code }
    const response = await this.fetch('/auth/verify', {
      method: 'POST',
      body: JSON.stringify(request),
    })

    return response.json()
  }

  /**
   * Get current user information
   *
   * @returns Current user info
   */
  async me(): Promise<GetMeResponse> {
    const response = await this.fetch('/auth/me', {}, true)
    return response.json()
  }

  /**
   * Logout current session
   *
   * @returns Logout response
   */
  async logout(): Promise<LogoutResponse> {
    const response = await this.fetch('/auth/logout', {
      method: 'POST',
    }, true)

    return response.json()
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
