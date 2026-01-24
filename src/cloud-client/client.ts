/**
 * Cloud Client Implementation
 *
 * Main HTTP client for CCJK Cloud API v1.0.0
 * @module cloud-client/client
 */

import type { $Fetch } from 'ofetch'
import { ofetch } from 'ofetch'
import consola from 'consola'
import type {
  ProjectAnalysisRequest,
  ProjectAnalysisResponse,
  TemplateResponse,
  BatchTemplateRequest,
  BatchTemplateResponse,
  UsageReport,
  UsageReportResponse,
  HealthCheckResponse,
  CloudClientConfig,
} from './types'
import { CloudClientError } from './types'

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
        'User-Agent': `CCJK/${this.config.version || '8.0.0'}`,
        ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
      },
      retry: this.config.enableRetry ? this.config.maxRetries : 0,
      retryDelay: (context) => this.calculateRetryDelay(context.options.retry || 0),
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
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        throw CloudClientError.timeout(this.config.timeout || 10000)
      }

      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        throw CloudClientError.network(error)
      }
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
   * POST /v1/analyze
   *
   * @param request - Project analysis request
   * @returns Project analysis response with recommendations
   */
  async analyzeProject(request: ProjectAnalysisRequest): Promise<ProjectAnalysisResponse> {
    try {
      consola.debug('Analyzing project:', request.projectRoot)

      const response = await this.fetch<ProjectAnalysisResponse>('/api/v8/analysis/projects', {
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
   * GET /v1/templates/:id
   *
   * @param id - Template identifier
   * @param language - Language for translations (optional)
   * @returns Template response
   */
  async getTemplate(id: string, language?: string): Promise<TemplateResponse> {
    try {
      consola.debug('Fetching template:', id)

      const response = await this.fetch<TemplateResponse>(`/v1/templates/${encodeURIComponent(id)}`, {
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
   * POST /v1/templates/batch
   *
   * @param request - Batch template request
   * @returns Batch template response
   */
  async getBatchTemplates(request: BatchTemplateRequest): Promise<BatchTemplateResponse> {
    try {
      consola.debug('Fetching batch templates:', request.ids.length)

      const response = await this.fetch<BatchTemplateResponse>('/api/v8/templates/batch', {
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
   * POST /v1/report
   *
   * @param report - Usage report payload
   * @returns Usage report response
   */
  async reportUsage(report: UsageReport): Promise<UsageReportResponse> {
    try {
      consola.debug('Reporting usage:', report.metricType)

      const response = await this.fetch<UsageReportResponse>('/api/v8/telemetry/installation', {
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
   * GET /v1/health
   *
   * @returns Health check response
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      consola.debug('Checking API health')

      const response = await this.fetch<HealthCheckResponse>('/api/v8/health', {
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
          'User-Agent': `CCJK/${this.config.version || '8.0.0'}`,
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        retry: this.config.enableRetry ? this.config.maxRetries : 0,
        retryDelay: (context) => this.calculateRetryDelay(context.options.retry || 0),
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
    version: '8.0.0',
    enableCache: true,
    enableRetry: true,
    maxRetries: 3,
    enableTelemetry: true,
    ...config,
  })
}
