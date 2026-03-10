/**
 * Cloud Client Implementation
 *
 * Main HTTP client for CCJK Cloud API
 * @module cloud-client/client
 */

import type { $Fetch } from 'ofetch'
import type {
  BatchTemplateRequest,
  BatchTemplateResponse,
  ClientIdentity,
  CloudClientConfig,
  DeviceRegistrationRequest,
  DeviceRegistrationResponse,
  HealthCheckResponse,
  HandshakeRequest,
  HandshakeResponse,
  ProjectAnalysisRequest,
  ProjectAnalysisResponse,
  SyncRequest,
  SyncResponse,
  TemplateResponse,
  UsageReport,
  UsageReportResponse,
} from './types'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import consola from 'consola'
import { ofetch } from 'ofetch'
import { CloudClientError } from './types'
import { CLOUD_ENDPOINTS } from '../constants'

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url))
let CCJK_VERSION = '9.0.0' // fallback
try {
  const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'))
  CCJK_VERSION = packageJson.version
}
catch {
  // Use fallback version
}

/**
 * API version prefix for all endpoints
 * All API paths should use this prefix for consistency
 */
const API_PREFIX = '/api/v1'
const HEALTH_PATH = `${API_PREFIX}/health`
const CLIENT_USAGE_STATE_DIR = join(homedir(), '.ccjk')
const CLIENT_USAGE_STATE_FILE = join(CLIENT_USAGE_STATE_DIR, 'cloud-client-identity.json')

interface StoredClientIdentity {
  anonymousUserId: string
  deviceId: string
}

/**
 * Cloud Client Class
 *
 * Provides methods to interact with the CCJK Cloud API
 */
export class CloudClient {
  private fetch: $Fetch
  private config: CloudClientConfig
  private identity: ClientIdentity

  constructor(config: CloudClientConfig) {
    this.config = {
      timeout: 10000,
      enableRetry: true,
      maxRetries: 3,
      enableTelemetry: true,
      enableUsageAnalytics: true,
      autoHandshake: true,
      ...config,
    }
    this.identity = this.resolveIdentity()

    this.fetch = ofetch.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.getDefaultHeaders(),
      retry: this.config.enableRetry ? this.config.maxRetries : 0,
      retryDelay: context => this.calculateRetryDelay(context.options.retry || 0),
    })
  }

  private getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': `CCJK/${this.identity.clientVersion}`,
      'X-CCJK-Version': this.identity.clientVersion,
      'X-Anonymous-User-Id': this.identity.anonymousUserId,
    }

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`
    }

    if (this.identity.deviceToken) {
      headers['X-Device-Token'] = this.identity.deviceToken
    }

    return headers
  }

  private resolveIdentity(): ClientIdentity {
    const storedIdentity = this.loadOrCreateStoredIdentity()
    const clientVersion = this.config.version || CCJK_VERSION

    return {
      anonymousUserId: this.config.anonymousUserId || storedIdentity.anonymousUserId,
      deviceId: this.config.deviceId || storedIdentity.deviceId,
      clientVersion,
      platform: this.config.platform || process.platform,
      deviceToken: this.config.deviceToken,
    }
  }

  private loadOrCreateStoredIdentity(): StoredClientIdentity {
    try {
      if (existsSync(CLIENT_USAGE_STATE_FILE)) {
        const stored = JSON.parse(readFileSync(CLIENT_USAGE_STATE_FILE, 'utf-8')) as Partial<StoredClientIdentity>
        if (stored.anonymousUserId && stored.deviceId) {
          return {
            anonymousUserId: stored.anonymousUserId,
            deviceId: stored.deviceId,
          }
        }
      }
    }
    catch (error) {
      consola.debug('Failed to read stored cloud client identity:', error)
    }

    const generated: StoredClientIdentity = {
      anonymousUserId: process.env.CCJK_ANONYMOUS_USER_ID || randomUUID(),
      deviceId: process.env.CCJK_DEVICE_ID || randomUUID(),
    }

    try {
      mkdirSync(CLIENT_USAGE_STATE_DIR, { recursive: true })
      writeFileSync(CLIENT_USAGE_STATE_FILE, JSON.stringify(generated, null, 2))
    }
    catch (error) {
      consola.debug('Failed to persist cloud client identity:', error)
    }

    return generated
  }

  private buildAnalyticsPayload<
    T extends { deviceId?: string, platform?: string, clientVersion?: string },
  >(payload?: T): DeviceRegistrationRequest & T {
    return {
      deviceId: payload?.deviceId || this.identity.deviceId,
      platform: payload?.platform || this.identity.platform,
      clientVersion: payload?.clientVersion || this.identity.clientVersion,
      ...payload,
    } as DeviceRegistrationRequest & T
  }

  private canSendUsageAnalytics(): boolean {
    return this.config.enableUsageAnalytics !== false
  }

  getIdentity(): ClientIdentity {
    return { ...this.identity }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delays = [100, 200, 400, 800]
    return delays[Math.min(attempt, delays.length - 1)]
  }

  /**
   * Parse server response — handles all 5 response formats from Miaoda API:
   * 1. { success: true, data: {} }  — auth/user/config/admin modules
   * 2. { success: false, error: { message } }  — error from above modules
   * 3. { data: {} }  — usage/license/skill modules
   * 4. bare object  — subscription/llm/storage modules
   * 5. { error: "..." }  — bare error
   */
  parseResponse<T>(raw: unknown): T {
    if (raw === null || raw === undefined)
      return raw as T
    const r = raw as Record<string, unknown>
    if (r.success === false) {
      const msg = (r.error as any)?.message || (r as any).message || (r as any).error || 'Unknown error'
      throw new CloudClientError('API_ERROR', String(msg))
    }
    if (r.success === true && 'data' in r)
      return r.data as T
    if (!('success' in r) && 'data' in r)
      return r.data as T
    if (typeof r.error === 'string' && !('data' in r))
      throw new CloudClientError('API_ERROR', r.error)
    return raw as T
  }

  /**
   * Handle fetch errors and convert to CloudClientError
   */
  private handleError(error: unknown, context: string): never {
    if (error instanceof CloudClientError) {
      throw error
    }

    if (error instanceof Error) {
      // Extract HTTP status and response data if available
      const errorMessage = error.message || ''

      // Check for timeout errors
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        throw CloudClientError.timeout(this.config.timeout || 10000)
      }

      // Check for network errors
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
        throw CloudClientError.network(error)
      }

      // Extract HTTP status code from error message
      const statusMatch = errorMessage.match(/(\d{3})\s+/)
      const statusCode = statusMatch ? Number.parseInt(statusMatch[1]) : undefined

      // Try to parse response body from error
      let responseDetails = errorMessage
      try {
        // ofetch might include response data in the error message
        if (errorMessage.includes(':')) {
          const parts = errorMessage.split(':')
          if (parts.length > 1) {
            responseDetails = parts.slice(1).join(':').trim()
          }
        }
      }
      catch {
        // Ignore parsing errors
      }

      consola.warn(`Cloud API error in ${context}:`, {
        statusCode,
        message: responseDetails,
        originalError: error,
      })

      // Throw appropriate error based on status code
      if (statusCode) {
        throw CloudClientError.fromResponse(statusCode, responseDetails)
      }

      throw new CloudClientError(
        'UNKNOWN_ERROR',
        `Unexpected error during ${context}: ${responseDetails}`,
        undefined,
        error,
      )
    }

    consola.warn(`Cloud API error in ${context}:`, error)

    throw new CloudClientError(
      'UNKNOWN_ERROR',
      `Unexpected error during ${context}`,
      undefined,
      error,
    )
  }

  /**
   * Analyze project and get recommendations
   *
   * POST /api/v1/analysis/projects
   *
   * @param request - Project analysis request
   * @returns Project analysis response with recommendations
   */
  async analyzeProject(request: ProjectAnalysisRequest): Promise<ProjectAnalysisResponse> {
    try {
      consola.debug('Analyzing project:', request.projectRoot)

      // Server endpoint: POST /api/v1/specs (Miaoda spec system)
      const response = await this.fetch<ProjectAnalysisResponse>(`${API_PREFIX}/specs`, {
        method: 'POST',
        body: request,
      })

      consola.debug(`Received ${response.recommendations.length} recommendations`)

      return response
    }
    catch (error) {
      this.handleError(error, 'project analysis')
    }
  }

  /**
   * Get a single template by ID
   *
   * GET /api/v1/templates/:id
   *
   * @param id - Template identifier
   * @param language - Language for translations (optional)
   * @returns Template response
   */
  async getTemplate(id: string, language?: string): Promise<TemplateResponse> {
    try {
      consola.debug('Fetching template:', id)

      const response = await this.fetch<TemplateResponse>(`${API_PREFIX}/templates/${encodeURIComponent(id)}`, {
        method: 'GET',
        params: language ? { language } : undefined,
      })

      consola.debug(`Template ${id} fetched successfully`)

      return response
    }
    catch (error) {
      this.handleError(error, `template fetch: ${id}`)
    }
  }

  /**
   * Get multiple templates in batch
   *
   * POST /api/v1/templates/batch
   *
   * @param request - Batch template request
   * @returns Batch template response
   */
  async getBatchTemplates(request: BatchTemplateRequest): Promise<BatchTemplateResponse> {
    try {
      consola.debug('Fetching batch templates:', request.ids.length)

      const response = await this.fetch<BatchTemplateResponse>(`${API_PREFIX}/templates/batch`, {
        method: 'POST',
        body: request,
      })

      consola.debug(`Fetched ${Object.keys(response.templates).length} templates`)

      return response
    }
    catch (error) {
      this.handleError(error, 'batch template fetch')
    }
  }

  /**
   * Report usage metrics (non-blocking with short timeout)
   *
   * POST /api/v1/telemetry/installation
   *
   * @param report - Usage report payload
   * @returns Usage report response
   */
  async reportUsage(report: UsageReport): Promise<UsageReportResponse> {
    if (!this.canSendUsageAnalytics()) {
      return {
        success: false,
        requestId: '',
        message: 'Usage analytics disabled',
      }
    }

    try {
      consola.debug('Reporting usage:', report.metricType)

      const payload = {
        ...report,
        deviceId: report.deviceId || this.identity.deviceId,
        platform: report.platform || this.identity.platform,
        clientVersion: report.clientVersion || report.ccjkVersion || this.identity.clientVersion,
      }

      // Use short timeout for telemetry (5s)
      const response = await this.fetch<UsageReportResponse>(`${API_PREFIX}/usage/current`, {
        method: 'POST',
        body: payload,
        timeout: 5000, // 5s timeout - telemetry should be fast
      })

      consola.debug('Usage report accepted')

      return response
    }
    catch (error) {
      // Silent failure - don't throw on telemetry errors
      consola.debug('Failed to report usage (non-blocking):', error)
      return {
        success: false,
        requestId: '',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Check API health status
   *
   * GET /api/v1/health
   *
   * @returns Health check response
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      consola.debug('Checking API health')

      const response = await this.fetch<HealthCheckResponse>(HEALTH_PATH, {
        method: 'GET',
      })

      consola.debug(`API health: ${response.status}`)

      return response
    }
    catch (error) {
      this.handleError(error, 'health check')
    }
  }

  /**
   * Update client configuration
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<CloudClientConfig>): void {
    this.config = { ...this.config, ...config }
    this.identity = this.resolveIdentity()

    // Update fetch instance with new config
    if (config.baseURL || config.timeout || config.apiKey || config.version || config.deviceToken || config.anonymousUserId || config.deviceId || config.platform) {
      this.fetch = ofetch.create({
        baseURL: this.config.baseURL,
        timeout: this.config.timeout,
        headers: this.getDefaultHeaders(),
        retry: this.config.enableRetry ? this.config.maxRetries : 0,
        retryDelay: context => this.calculateRetryDelay(context.options.retry || 0),
      })
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CloudClientConfig {
    return { ...this.config }
  }

  async registerDevice(payload?: Partial<DeviceRegistrationRequest>): Promise<DeviceRegistrationResponse> {
    if (!this.canSendUsageAnalytics()) {
      return {
        success: false,
        message: 'Usage analytics disabled',
      }
    }

    try {
      return await this.fetch<DeviceRegistrationResponse>('/device/register', {
        method: 'POST',
        body: this.buildAnalyticsPayload(payload),
        timeout: 5000,
      })
    }
    catch (error) {
      consola.debug('Failed to register device (non-blocking):', error)
      return {
        success: false,
        requestId: '',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async handshake(payload?: Partial<HandshakeRequest>): Promise<HandshakeResponse> {
    if (!this.canSendUsageAnalytics()) {
      return {
        success: false,
        message: 'Usage analytics disabled',
      }
    }

    try {
      return await this.fetch<HandshakeResponse>(`${API_PREFIX}/handshake`, {
        method: 'POST',
        body: this.buildAnalyticsPayload(payload),
        timeout: 5000,
      })
    }
    catch (error) {
      consola.debug('Failed to send handshake (non-blocking):', error)
      return {
        success: false,
        requestId: '',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async syncClientUsage(payload?: Partial<SyncRequest>): Promise<SyncResponse> {
    if (!this.canSendUsageAnalytics()) {
      return {
        success: false,
        message: 'Usage analytics disabled',
      }
    }

    try {
      return await this.fetch<SyncResponse>(`${API_PREFIX}/sync`, {
        method: 'POST',
        body: this.buildAnalyticsPayload(payload),
        timeout: 5000,
      })
    }
    catch (error) {
      consola.debug('Failed to sync client usage (non-blocking):', error)
      return {
        success: false,
        requestId: '',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/**
 * Create a default cloud client instance
 */
export function createCloudClient(config?: Partial<CloudClientConfig>): CloudClient {
  return new CloudClient({
    baseURL: CLOUD_ENDPOINTS.MAIN.BASE_URL,
    timeout: 10000,
    version: CCJK_VERSION,
    enableCache: true,
    enableRetry: true,
    maxRetries: 3,
    enableTelemetry: true,
    ...config,
  })
}
