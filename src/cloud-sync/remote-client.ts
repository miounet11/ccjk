/**
 * Remote Client for CCJK v3.8 Teleport System
 *
 * Provides remote API client for:
 * - Session sync protocol
 * - Cloud session storage
 * - Web <-> CLI session migration
 * - Session attribution tracking
 */

import type { SessionData, TeleportOptions } from './teleport'

// ============================================================================
// Types and Interfaces
// ============================================================================

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  metadata?: {
    timestamp: string
    requestId: string
    version: string
  }
}

export interface SessionSyncRequest {
  sessionId: string
  data: SessionData
  options?: TeleportOptions
  checksum?: string
}

export interface SessionSyncResponse {
  transferId: string
  url?: string
  expiresAt?: string
  checksum?: string
}

export interface RemoteClientConfig {
  baseUrl: string
  apiKey?: string
  timeout?: number
  maxRetries?: number
  version?: string
}

export interface SessionAttribution {
  sessionId: string
  source: 'web' | 'cli' | 'api'
  userId?: string
  deviceId?: string
  timestamp: string
  url?: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// Remote Client
// ============================================================================

export class RemoteClient {
  private config: RemoteClientConfig
  private deviceId: string

  constructor(config: RemoteClientConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      version: 'v1',
      ...config,
    }

    this.deviceId = this.getOrCreateDeviceId()
  }

  /**
   * Get or create device ID
   */
  private getOrCreateDeviceId(): string {
    const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('node:fs')
    const { homedir } = require('node:os')
    const { join } = require('node:path')

    const configDir = join(homedir(), '.claude')
    const deviceIdFile = join(configDir, '.device-id')

    try {
      if (existsSync(deviceIdFile)) {
        return readFileSync(deviceIdFile, 'utf-8').trim()
      }

      // Ensure directory exists
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true })
      }

      // Generate new device ID
      const { randomBytes } = require('node:crypto')
      const newDeviceId = `device-${randomBytes(16).toString('hex')}`
      writeFileSync(deviceIdFile, newDeviceId, 'utf-8')

      return newDeviceId
    }
    catch {
      return 'device-unknown'
    }
  }

  /**
   * Make API request
   */
  private async request<T>(
    method: ApiMethod,
    path: string,
    body?: unknown,
    options?: {
      headers?: Record<string, string>
      timeout?: number
    },
  ): Promise<ApiResponse<T>> {
    const fetch = this.createFetch()
    const url = `${this.config.baseUrl}${path}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-ID': this.deviceId,
      'X-Client-Version': this.config.version || 'v1',
      ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
      ...options?.headers,
    }

    const timeout = options?.timeout ?? this.config.timeout

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}`,
          code: String(response.status),
        }
      }

      const data = await response.json() as T
      return {
        success: true,
        data,
      }
    }
    catch (error) {
      if ((error as Error).name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
          code: 'TIMEOUT',
        }
      }

      return {
        success: false,
        error: (error as Error).message || 'Unknown error',
        code: 'NETWORK_ERROR',
      }
    }
  }

  /**
   * Create fetch implementation
   */
  private createFetch(): typeof fetch {
    // Use native fetch if available (Node 18+)
    if (typeof fetch !== 'undefined') {
      return fetch as any
    }

    // Fallback to node-fetch
    try {
      return require('node-fetch')
    }
    catch {
      throw new Error('No fetch implementation available')
    }
  }

  /**
   * Upload session to remote server
   */
  async uploadSession(request: SessionSyncRequest): Promise<ApiResponse<SessionSyncResponse>> {
    const checksum = this.calculateChecksum(request.data)

    return this.request<SessionSyncResponse>('POST', '/sessions/upload', {
      ...request,
      checksum,
    })
  }

  /**
   * Download session from remote server
   */
  async downloadSession(transferId: string): Promise<ApiResponse<SessionData>> {
    return this.request<SessionData>('GET', `/sessions/${transferId}`)
  }

  /**
   * Check session status
   */
  async checkSessionStatus(transferId: string): Promise<ApiResponse<{
    status: 'pending' | 'processing' | 'ready' | 'expired'
    expiresAt?: string
  }>> {
    return this.request('GET', `/sessions/${transferId}/status`)
  }

  /**
   * List user's sessions
   */
  async listSessions(options?: {
    limit?: number
    offset?: number
    source?: 'web' | 'cli' | 'api'
  }): Promise<ApiResponse<{
    sessions: Array<{
      transferId: string
      sessionId?: string
      name?: string
      createdAt: string
      expiresAt?: string
      url?: string
    }>
    total: number
  }>> {
    const params = new URLSearchParams()
    if (options?.limit)
      params.append('limit', String(options.limit))
    if (options?.offset)
      params.append('offset', String(options.offset))
    if (options?.source)
      params.append('source', options.source)

    const queryString = params.toString()
    return this.request('GET', `/sessions?${queryString}`)
  }

  /**
   * Delete session from remote server
   */
  async deleteSession(transferId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request('DELETE', `/sessions/${transferId}`)
  }

  /**
   * Create session attribution
   */
  async createAttribution(attribution: SessionAttribution): Promise<ApiResponse<{
    attributionId: string
    url?: string
  }>> {
    return this.request('POST', '/attributions', attribution)
  }

  /**
   * Get session attribution
   */
  async getAttribution(transferId: string): Promise<ApiResponse<SessionAttribution>> {
    return this.request('GET', `/attributions/${transferId}`)
  }

  /**
   * Calculate checksum for session data
   */
  private calculateChecksum(data: SessionData): string {
    const { createHash } = require('node:crypto')
    const dataStr = JSON.stringify(data)

    return createHash('sha256')
      .update(dataStr)
      .digest('hex')
      .substring(0, 16)
  }

  /**
   * Validate session integrity
   */
  validateSession(data: SessionData, checksum: string): boolean {
    const calculated = this.calculateChecksum(data)
    return calculated === checksum
  }

  /**
   * Sync session with retry logic
   */
  async syncSessionWithRetry(
    request: SessionSyncRequest,
    options?: {
      maxRetries?: number
      retryDelay?: number
    },
  ): Promise<ApiResponse<SessionSyncResponse>> {
    const maxRetries = options?.maxRetries ?? this.config.maxRetries ?? 3
    const retryDelay = options?.retryDelay ?? 1000

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await this.uploadSession(request)

      if (result.success) {
        return result
      }

      // Don't retry on certain errors
      if (result.code === '401' || result.code === '403' || result.code === '404') {
        return result
      }

      lastError = new Error(result.error || 'Upload failed')

      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * 2 ** attempt))
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Failed after retries',
      code: 'MAX_RETRIES_EXCEEDED',
    }
  }

  /**
   * Get client status
   */
  async getStatus(): Promise<ApiResponse<{
    connected: boolean
    version: string
    deviceId: string
    features: string[]
  }>> {
    return this.request('GET', '/status')
  }

  /**
   * Get session URL for sharing
   */
  getShareUrl(transferId: string): string {
    return `${this.config.baseUrl}/share/${transferId}`
  }

  /**
   * Parse share URL to extract transfer ID
   */
  parseShareUrl(url: string): string | null {
    const patterns = [
      new RegExp(`${this.config.baseUrl}/share/([a-zA-Z0-9-]+)`),
      /claude:\/\/teleport\/([a-zA-Z0-9-]+)/,
      /claude\.ai\/teleport\/([a-zA-Z0-9-]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }

    // Try raw transfer ID
    if (/^[a-z0-9-]+$/i.test(url)) {
      return url
    }

    return null
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create remote client with default configuration
 */
export function createRemoteClient(config?: Partial<RemoteClientConfig>): RemoteClient {
  // Default to Claude's API if no base URL provided
  const defaultConfig: RemoteClientConfig = {
    baseUrl: 'https://api.anthropic.com/v1/claude-code',
    timeout: 30000,
    maxRetries: 3,
    version: 'v1',
  }

  return new RemoteClient({ ...defaultConfig, ...config })
}

/**
 * Create client for custom endpoint
 */
export function createCustomClient(
  endpoint: string,
  options?: {
    apiKey?: string
    timeout?: number
  },
): RemoteClient {
  return new RemoteClient({
    baseUrl: endpoint,
    apiKey: options?.apiKey,
    timeout: options?.timeout,
  })
}

// ============================================================================
// Mock Client for Testing
// ============================================================================

export class MockRemoteClient extends RemoteClient {
  private mockSessions: Map<string, SessionData> = new Map()
  private mockAttributions: Map<string, SessionAttribution> = new Map()
  private mockDeviceId: string

  constructor() {
    super({ baseUrl: 'mock://api' })
    this.mockDeviceId = 'mock-device-id'
  }

  async uploadSession(request: SessionSyncRequest): Promise<ApiResponse<SessionSyncResponse>> {
    const transferId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    this.mockSessions.set(transferId, request.data)

    return {
      success: true,
      data: {
        transferId,
        url: `claude://teleport/${transferId}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        checksum: request.checksum,
      },
    }
  }

  async downloadSession(transferId: string): Promise<ApiResponse<SessionData>> {
    const data = this.mockSessions.get(transferId)

    if (!data) {
      return {
        success: false,
        error: 'Session not found',
        code: '404',
      }
    }

    return {
      success: true,
      data,
    }
  }

  async checkSessionStatus(transferId: string): Promise<ApiResponse<any>> {
    const exists = this.mockSessions.has(transferId)

    return {
      success: true,
      data: {
        status: exists ? 'ready' : 'expired',
      },
    }
  }

  async createAttribution(attribution: SessionAttribution): Promise<ApiResponse<any>> {
    const attributionId = `attr-${Date.now()}`
    this.mockAttributions.set(attributionId, attribution)

    return {
      success: true,
      data: {
        attributionId,
        url: `claude://teleport/${attribution.sessionId}`,
      },
    }
  }

  async getAttribution(transferId: string): Promise<ApiResponse<SessionAttribution>> {
    for (const attribution of this.mockAttributions.values()) {
      if (attribution.sessionId === transferId) {
        return {
          success: true,
          data: attribution,
        }
      }
    }

    return {
      success: false,
      error: 'Attribution not found',
      code: '404',
    }
  }

  async getStatus(): Promise<ApiResponse<any>> {
    return {
      success: true,
      data: {
        connected: true,
        version: 'mock-v1',
        deviceId: this.mockDeviceId,
        features: ['upload', 'download', 'attributions'],
      },
    }
  }
}
