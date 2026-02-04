/**
 * Authentication manager for api.claudehome.cn
 * Handles OAuth2 flows, JWT tokens, and API keys
 */

import type {
  RefreshTokenResponse,
  TokenResponse,
} from './types.js'
import {
  AuthenticationError,
} from './types.js'

export interface AuthConfig {
  accessToken?: string
  refreshToken?: string
  apiKey?: string
  tokenRefreshThreshold?: number // milliseconds before expiry to refresh
}

export class AuthManager {
  private config: AuthConfig = {}
  private tokenExpiryTime = 0

  constructor(
    private baseURL: string,
    private timeout: number = 30000,
  ) {}

  /**
   * Set authentication tokens
   */
  setTokens(accessToken: string, refreshToken: string, expiresIn?: number): void {
    this.config.accessToken = accessToken
    this.config.refreshToken = refreshToken

    if (expiresIn) {
      this.tokenExpiryTime = Date.now() + expiresIn * 1000
    }
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.config.accessToken ?? null
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.config.refreshToken ?? null
  }

  /**
   * Check if token is expired or will expire soon
   */
  private isTokenExpired(): boolean {
    const threshold = this.config.tokenRefreshThreshold ?? 60000 // 1 minute before expiry
    return Date.now() >= this.tokenExpiryTime - threshold
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    const refreshToken = this.config.refreshToken

    if (!refreshToken) {
      throw new AuthenticationError('No refresh token available')
    }

    try {
      const response = await this.request<RefreshTokenResponse>(
        '/auth/refresh',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        },
      )

      this.setTokens(response.accessToken, refreshToken, response.expiresIn)

      return response.accessToken
    }
    catch (error) {
      this.clearTokens()
      throw new AuthenticationError('Failed to refresh access token')
    }
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidToken(): Promise<string> {
    let token = this.getAccessToken()

    if (!token) {
      throw new AuthenticationError('No access token available')
    }

    if (this.isTokenExpired()) {
      token = await this.refreshAccessToken()
    }

    return token
  }

  /**
   * Set API key for authentication
   */
  setApiKey(key: string): void {
    this.config.apiKey = key
  }

  /**
   * Get API key
   */
  getApiKey(): string | null {
    return this.config.apiKey ?? null
  }

  /**
   * Clear all authentication credentials
   */
  clearTokens(): void {
    this.config.accessToken = undefined
    this.config.refreshToken = undefined
    this.tokenExpiryTime = 0
  }

  clearApiKey(): void {
    this.config.apiKey = undefined
  }

  clearAll(): void {
    this.clearTokens()
    this.clearApiKey()
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.config.accessToken || this.config.apiKey)
  }

  /**
   * Get authorization header value
   */
  async getAuthorizationHeader(): Promise<string | null> {
    // API key takes precedence
    const apiKey = this.getApiKey()
    if (apiKey) {
      return `Bearer ${apiKey}`
    }

    // Try to get valid access token
    try {
      const token = await this.getValidToken()
      return `Bearer ${token}`
    }
    catch {
      return null
    }
  }

  /**
   * Authorize with GitHub OAuth2
   * Generates authorization URL
   */
  authorizeWithGitHub(
    redirectUri: string,
    scopes: string[] = ['read:user', 'user:email'],
  ): string {
    const state = this.generateState()
    const params = new URLSearchParams({
      client_id: 'github-client-id', // This would come from server config
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      state,
    })

    return `${this.baseURL}/auth/github?${params.toString()}`
  }

  /**
   * Handle GitHub OAuth2 callback
   */
  async handleGitHubCallback(
    code: string,
    state: string,
  ): Promise<TokenResponse> {
    return this.request<TokenResponse>('/auth/github/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state }),
    })
  }

  /**
   * Authorize with Google OAuth2
   * Generates authorization URL
   */
  authorizeWithGoogle(
    redirectUri: string,
    scopes: string[] = ['openid', 'profile', 'email'],
  ): string {
    const state = this.generateState()
    const params = new URLSearchParams({
      client_id: 'google-client-id', // This would come from server config
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      state,
      response_type: 'code',
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Handle Google OAuth2 callback
   */
  async handleGoogleCallback(
    code: string,
    state: string,
  ): Promise<TokenResponse> {
    return this.request<TokenResponse>('/auth/google/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state }),
    })
  }

  /**
   * Verify current authentication
   */
  async verifyAuth(): Promise<boolean> {
    try {
      const token = await this.getValidToken()
      await this.request<{ valid: boolean }>('/auth/verify', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      return true
    }
    catch {
      return false
    }
  }

  /**
   * Make authenticated request to refresh token endpoint
   */
  private async request<T>(
    path: string,
    options: RequestInit,
  ): Promise<T> {
    const url = `${this.baseURL}${path}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string }
        throw new AuthenticationError(error.message || 'Authentication failed')
      }

      return await response.json() as T
    }
    catch (error: unknown) {
      clearTimeout(timeoutId)

      if (error instanceof AuthenticationError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AuthenticationError('Request timeout')
      }

      throw new AuthenticationError('Network error during authentication')
    }
  }

  /**
   * Generate random state for OAuth2 flow
   */
  private generateState(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Get current auth config (for persistence)
   */
  getConfig(): AuthConfig {
    return {
      accessToken: this.config.accessToken,
      refreshToken: this.config.refreshToken,
      apiKey: this.config.apiKey,
      tokenRefreshThreshold: this.config.tokenRefreshThreshold,
    }
  }

  /**
   * Restore auth config
   */
  setConfig(config: AuthConfig): void {
    this.config = { ...config }
  }
}

/**
 * Auth token storage for persistence
 */
export class AuthTokenStorage {
  constructor(private storageKey: string = 'ccjk_auth_tokens') {}

  async save(config: AuthConfig): Promise<void> {
    // Check for browser environment
    const isBrowser = typeof globalThis !== 'undefined' && 'localStorage' in globalThis
    if (isBrowser) {
      // Browser environment
      const encrypted = await this.encrypt(JSON.stringify(config))
      ;(globalThis as any).localStorage.setItem(this.storageKey, encrypted)
    }
    else if (typeof process !== 'undefined') {
      // Node.js environment
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const os = await import('node:os')

      const configDir = path.join(os.homedir(), '.ccjk')
      const configPath = path.join(configDir, `${this.storageKey}.json`)

      await fs.mkdir(configDir, { recursive: true })
      await fs.writeFile(configPath, JSON.stringify(config, null, 2))
    }
  }

  async load(): Promise<AuthConfig | null> {
    // Check for browser environment
    const isBrowser = typeof globalThis !== 'undefined' && 'localStorage' in globalThis
    if (isBrowser) {
      // Browser environment
      const encrypted = (globalThis as any).localStorage.getItem(this.storageKey)
      if (!encrypted)
        return null

      const decrypted = await this.decrypt(encrypted)
      return JSON.parse(decrypted)
    }
    else if (typeof process !== 'undefined') {
      // Node.js environment
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const os = await import('node:os')

      const configPath = path.join(os.homedir(), '.ccjk', `${this.storageKey}.json`)

      try {
        const content = await fs.readFile(configPath, 'utf-8')
        return JSON.parse(content)
      }
      catch {
        return null
      }
    }

    return null
  }

  async clear(): Promise<void> {
    // Check for browser environment
    const isBrowser = typeof globalThis !== 'undefined' && 'localStorage' in globalThis
    if (isBrowser) {
      ;(globalThis as any).localStorage.removeItem(this.storageKey)
    }
    else if (typeof process !== 'undefined') {
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const os = await import('node:os')

      const configPath = path.join(os.homedir(), '.ccjk', `${this.storageKey}.json`)

      try {
        await fs.unlink(configPath)
      }
      catch {
        // Ignore if file doesn't exist
      }
    }
  }

  private async encrypt(data: string): Promise<string> {
    // Simple encoding for now - should use proper encryption in production
    return Buffer.from(data).toString('base64')
  }

  private async decrypt(data: string): Promise<string> {
    return Buffer.from(data, 'base64').toString('utf-8')
  }
}

/**
 * Auto-refresh token manager
 */
export class AutoRefreshManager {
  private refreshTimer?: ReturnType<typeof setInterval>

  constructor(
    private authManager: AuthManager,
    private checkInterval: number = 60000, // Check every minute
  ) {}

  start(): void {
    this.stop()

    this.refreshTimer = setInterval(async () => {
      try {
        const token = this.authManager.getAccessToken()
        if (token) {
          // Check if token needs refresh
          // This would use the isTokenExpired method if it were public
          await this.authManager.getValidToken()
        }
      }
      catch (error) {
        console.error('Auto-refresh failed:', error)
      }
    }, this.checkInterval)
  }

  stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }
  }
}
