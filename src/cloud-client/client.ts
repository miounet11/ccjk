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
  CloudClientConfig,
  HealthCheckResponse,
  ProjectAnalysisRequest,
  ProjectAnalysisResponse,
  TemplateResponse,
  UsageReport,
  UsageReportResponse,
} from './types'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import consola from 'consola'
import { ofetch } from 'ofetch'
import { CloudClientError } from './types'

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

/**
 * Cloud Client Class
 *
 * Provides methods to interact with the CCJK Cloud API
 */
export class CloudClient {
  private fetch: $Fetch
  private config: CloudClientConfig

  constructor(config: CloudClientConfig) {
    this.config = {
      timeout: 10000,
      enableRetry: true,
      maxRetries: 3,
      enableTelemetry: true,
      ...config,
    }

    this.fetch = ofetch.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'User-Agent': `CCJK/${this.config.version || CCJK_VERSION}`,
        ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
      },
      retry: this.config.enableRetry ? this.config.maxRetries : 0,
      retryDelay: context => this.calculateRetryDelay(context.options.retry || 0),
    })
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delays = [100, 200, 400, 800]
    return delays[Math.min(attempt, delays.length - 1)]
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

      const response = await this.fetch<ProjectAnalysisResponse>(`${API_PREFIX}/analysis/projects`, {
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
   * Report usage metrics
   *
   * POST /api/v1/telemetry/installation
   *
   * @param report - Usage report payload
   * @returns Usage report response
   */
  async reportUsage(report: UsageReport): Promise<UsageReportResponse> {
    try {
      consola.debug('Reporting usage:', report.metricType)

      const response = await this.fetch<UsageReportResponse>(`${API_PREFIX}/telemetry/installation`, {
        method: 'POST',
        body: report,
      })

      consola.debug('Usage report accepted')

      return response
    }
    catch (error) {
      // Don't throw on telemetry errors, just log
      consola.warn('Failed to report usage:', error)
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

      const response = await this.fetch<HealthCheckResponse>(`${API_PREFIX}/health`, {
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

    // Update fetch instance with new config
    if (config.baseURL || config.timeout || config.apiKey) {
      this.fetch = ofetch.create({
        baseURL: this.config.baseURL,
        timeout: this.config.timeout,
        headers: {
          'User-Agent': `CCJK/${this.config.version || CCJK_VERSION}`,
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
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
}

/**
 * Create a default cloud client instance
 */
export function createCloudClient(config?: Partial<CloudClientConfig>): CloudClient {
  return new CloudClient({
    baseURL: 'https://api.claudehome.cn',
    timeout: 10000,
    version: CCJK_VERSION,
    enableCache: true,
    enableRetry: true,
    maxRetries: 3,
    enableTelemetry: true,
    ...config,
  })
}
