/**
 * CCJK Cloud API Templates Client
 *
 * Handles v8 Templates API for skills, MCP, agents, and hooks.
 *
 * @module cloud-api/templates
 */

import type {
  BatchGetTemplatesRequest,
  BatchGetTemplatesResponse,
  CloudApiClientConfig,
  GetTemplateResponse,
  ListTemplatesParams,
  ListTemplatesResponse,
  SearchTemplatesParams,
  TemplateItem,
} from '../types/cloud-api'
import { CloudApiError } from '../types/cloud-api'

/**
 * Templates client for v8 Templates API
 */
export class TemplatesClient {
  private config: Required<CloudApiClientConfig>

  constructor(config: Required<CloudApiClientConfig>) {
    this.config = config
  }

  /**
   * List templates with optional filters
   *
   * @param params - Query parameters
   * @returns List of templates
   */
  async list(params: ListTemplatesParams = {}): Promise<ListTemplatesResponse> {
    const searchParams = new URLSearchParams()

    if (params.type)
      searchParams.set('type', params.type)
    if (params.category)
      searchParams.set('category', params.category)
    if (params.tags)
      searchParams.set('tags', params.tags)
    if (params.is_official !== undefined)
      searchParams.set('is_official', String(params.is_official))
    if (params.is_featured !== undefined)
      searchParams.set('is_featured', String(params.is_featured))
    if (params.sortBy)
      searchParams.set('sortBy', params.sortBy)
    if (params.limit !== undefined)
      searchParams.set('limit', String(params.limit))
    if (params.offset !== undefined)
      searchParams.set('offset', String(params.offset))

    const query = searchParams.toString()
    const path = query ? `/api/v8/templates?${query}` : '/api/v8/templates'

    const response = await this.fetch(path)
    return response.json() as Promise<ListTemplatesResponse>
  }

  /**
   * Get a single template by ID
   *
   * @param templateId - Template ID
   * @returns Template details
   */
  async get(templateId: string): Promise<GetTemplateResponse> {
    const response = await this.fetch(`/api/v8/templates/${templateId}`)
    return response.json() as Promise<GetTemplateResponse>
  }

  /**
   * Batch get templates by IDs
   *
   * @param request - Batch request with IDs
   * @returns Templates map
   */
  async batch(request: BatchGetTemplatesRequest): Promise<BatchGetTemplatesResponse> {
    const response = await this.fetch('/api/v8/templates/batch', {
      method: 'POST',
      body: JSON.stringify(request),
    })

    return response.json() as Promise<BatchGetTemplatesResponse>
  }

  /**
   * Search templates
   *
   * @param params - Search parameters
   * @returns Search results
   */
  async search(params: SearchTemplatesParams): Promise<ListTemplatesResponse> {
    const searchParams = new URLSearchParams()
    searchParams.set('query', params.query)

    if (params.type)
      searchParams.set('type', params.type)
    if (params.limit !== undefined)
      searchParams.set('limit', String(params.limit))

    const response = await this.fetch(`/api/v8/templates/search?${searchParams}`)
    return response.json() as Promise<ListTemplatesResponse>
  }

  /**
   * Get featured templates
   *
   * @param limit - Number of templates to return
   * @returns Featured templates
   */
  async featured(limit = 10): Promise<ListTemplatesResponse> {
    const response = await this.fetch(`/api/v8/templates/featured?limit=${limit}`)
    return response.json() as Promise<ListTemplatesResponse>
  }

  /**
   * Get popular templates
   *
   * @param limit - Number of templates to return
   * @returns Popular templates
   */
  async popular(limit = 20): Promise<ListTemplatesResponse> {
    const response = await this.fetch(`/api/v8/templates/popular?limit=${limit}`)
    return response.json() as Promise<ListTemplatesResponse>
  }

  /**
   * Get specialist agents by category
   *
   * @param category - Agent category (e.g., 'frontend', 'backend')
   * @returns List of specialist agents
   */
  async getSpecialistAgents(category?: string): Promise<TemplateItem[]> {
    const params: ListTemplatesParams = { type: 'agent', limit: 50 }
    if (category)
      params.category = category

    const response = await this.list(params)
    return response.data?.items || []
  }

  /**
   * Get official MCP servers
   *
   * @returns List of official MCP servers
   */
  async getOfficialMcpServers(): Promise<TemplateItem[]> {
    const response = await this.list({
      type: 'mcp',
      is_official: true,
      limit: 50,
    })

    return response.data?.items || []
  }

  /**
   * Make request to API
   */
  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.config.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
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
      const body = await response.json() as { message?: string }
      if (body && typeof body === 'object' && 'message' in body && body.message) {
        message = body.message
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
