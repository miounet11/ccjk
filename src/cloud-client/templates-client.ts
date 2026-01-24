/**
 * CCJK Cloud Templates Client
 *
 * Client for v8 Templates API - unified template management for Agent, MCP, Skill, Hook
 * @module cloud-client/templates-client
 */

import { ofetch } from 'ofetch'
import type { $Fetch } from 'ofetch'
import consola from 'consola'

// ============================================================================
// Types
// ============================================================================

export type TemplateType = 'skill' | 'mcp' | 'agent' | 'hook'

export interface Template {
  // Basic info
  id: string
  type: TemplateType
  name_en: string
  name_zh_cn?: string
  description_en?: string
  description_zh_cn?: string
  category: string
  tags: string[]

  // Version info
  author?: string
  version: string
  repository_url?: string
  npm_package?: string
  install_command?: string
  documentation_url?: string

  // Configuration
  config_schema?: Record<string, unknown>
  requirements?: string[]
  compatibility?: {
    platforms?: string[]
    frameworks?: string[]
    languages?: string[]
    [key: string]: unknown
  }

  // Usage examples
  usage_examples?: Array<{
    title: string
    description: string
    code: string
  }>

  // Status flags
  is_official: boolean
  is_featured: boolean
  is_verified: boolean

  // Statistics
  download_count: number
  rating_average: number
  rating_count: number

  // Timestamps
  last_updated?: string
  created_at: string
  updated_at: string
}

export interface TemplateSearchParams {
  query?: string
  type?: TemplateType
  category?: string
  tags?: string[]
  is_official?: boolean
  is_featured?: boolean
  is_verified?: boolean
  sortBy?: 'name_en' | 'download_count' | 'rating_average' | 'updated_at'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface TemplateListResponse {
  items: Template[]
  total: number
  limit: number
  offset: number
}

export interface BatchTemplateRequest {
  ids: string[]
  language?: 'en' | 'zh-CN'
  includeStats?: boolean
}

export interface BatchTemplateResponse {
  requestId: string
  templates: Record<string, Template>
  notFound: string[]
  stats?: {
    totalTemplates: number
    cacheHits: number
    cacheMisses: number
    cacheSize: number
  }
}

export interface TemplatesClientConfig {
  baseURL?: string
  timeout?: number
  language?: 'en' | 'zh-CN'
}

// ============================================================================
// Templates Client
// ============================================================================

/**
 * CCJK Cloud Templates Client
 *
 * Provides methods to interact with the v8 Templates API
 */
export class TemplatesClient {
  private fetch: $Fetch
  private baseURL: string
  private language: 'en' | 'zh-CN'
  private logger = consola.withTag('templates-client')

  constructor(config: TemplatesClientConfig = {}) {
    this.baseURL = config.baseURL || 'https://api.claudehome.cn'
    this.language = config.language || 'en'

    this.fetch = ofetch.create({
      baseURL: this.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'User-Agent': 'CCJK/8.2.0',
      },
      retry: 2,
    })
  }

  // ==========================================================================
  // Single Template
  // ==========================================================================

  /**
   * Get a single template by ID
   */
  async getTemplate(templateId: string): Promise<Template | null> {
    try {
      this.logger.debug(`Fetching template: ${templateId}`)

      const response = await this.fetch<{ code: number; data: Template }>(
        `/api/v8/templates/${encodeURIComponent(templateId)}`
      )

      if (response.code === 200 && response.data) {
        return response.data
      }
      return null
    } catch (error) {
      this.logger.warn(`Failed to fetch template ${templateId}:`, error)
      return null
    }
  }

  // ==========================================================================
  // Batch Templates
  // ==========================================================================

  /**
   * Batch get templates by IDs
   */
  async getTemplates(
    ids: string[],
    language?: 'en' | 'zh-CN'
  ): Promise<BatchTemplateResponse> {
    try {
      this.logger.debug(`Batch fetching ${ids.length} templates`)

      const response = await this.fetch<BatchTemplateResponse>(
        '/api/v8/templates/batch',
        {
          method: 'POST',
          body: {
            ids,
            language: language || this.language,
            includeStats: true,
          },
        }
      )

      return {
        requestId: response.requestId || '',
        templates: response.templates || {},
        notFound: response.notFound || [],
        stats: response.stats,
      }
    } catch (error) {
      this.logger.warn('Failed to batch fetch templates:', error)
      return {
        requestId: '',
        templates: {},
        notFound: ids,
      }
    }
  }

  // ==========================================================================
  // Search & List
  // ==========================================================================

  /**
   * Search templates
   */
  async searchTemplates(
    query: string,
    params: Omit<TemplateSearchParams, 'query'> = {}
  ): Promise<TemplateListResponse> {
    try {
      this.logger.debug(`Searching templates: ${query}`)

      const searchParams = this.buildSearchParams({ ...params, query })

      const response = await this.fetch<{ code: number; data: TemplateListResponse }>(
        `/api/v8/templates/search?${searchParams}`
      )

      if (response.code === 200 && response.data) {
        return response.data
      }

      return { items: [], total: 0, limit: 20, offset: 0 }
    } catch (error) {
      this.logger.warn('Failed to search templates:', error)
      return { items: [], total: 0, limit: 20, offset: 0 }
    }
  }

  /**
   * List templates with filters
   */
  async listTemplates(params: TemplateSearchParams = {}): Promise<TemplateListResponse> {
    try {
      this.logger.debug('Listing templates with params:', params)

      const searchParams = this.buildSearchParams(params)

      const response = await this.fetch<{ code: number; data: TemplateListResponse }>(
        `/api/v8/templates?${searchParams}`
      )

      if (response.code === 200 && response.data) {
        return response.data
      }

      return { items: [], total: 0, limit: 20, offset: 0 }
    } catch (error) {
      this.logger.warn('Failed to list templates:', error)
      return { items: [], total: 0, limit: 20, offset: 0 }
    }
  }

  // ==========================================================================
  // Type-specific Methods
  // ==========================================================================

  /**
   * Get templates by type
   */
  async getTemplatesByType(
    type: TemplateType,
    options: { category?: string; limit?: number; is_official?: boolean } = {}
  ): Promise<Template[]> {
    const { items } = await this.listTemplates({
      type,
      category: options.category,
      limit: options.limit || 50,
      is_official: options.is_official,
    })
    return items
  }

  /**
   * Get specialist agents
   */
  async getSpecialistAgents(category?: string): Promise<Template[]> {
    return this.getTemplatesByType('agent', { category, limit: 50 })
  }

  /**
   * Get official MCP servers
   */
  async getOfficialMcpServers(): Promise<Template[]> {
    return this.getTemplatesByType('mcp', { is_official: true, limit: 50 })
  }

  /**
   * Get skills by category
   */
  async getSkills(category?: string): Promise<Template[]> {
    return this.getTemplatesByType('skill', { category, limit: 50 })
  }

  /**
   * Get hooks by category
   */
  async getHooks(category?: string): Promise<Template[]> {
    return this.getTemplatesByType('hook', { category, limit: 50 })
  }

  // ==========================================================================
  // Featured & Popular
  // ==========================================================================

  /**
   * Get featured templates
   */
  async getFeaturedTemplates(limit = 10): Promise<Template[]> {
    try {
      const response = await this.fetch<{ code: number; data: Template[] }>(
        `/api/v8/templates/featured?limit=${limit}`
      )

      if (response.code === 200 && response.data) {
        return response.data
      }
      return []
    } catch (error) {
      this.logger.warn('Failed to fetch featured templates:', error)
      return []
    }
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit = 20): Promise<Template[]> {
    try {
      const response = await this.fetch<{ code: number; data: Template[] }>(
        `/api/v8/templates/popular?limit=${limit}`
      )

      if (response.code === 200 && response.data) {
        return response.data
      }
      return []
    } catch (error) {
      this.logger.warn('Failed to fetch popular templates:', error)
      return []
    }
  }

  // ==========================================================================
  // Categories
  // ==========================================================================

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const response = await this.fetch<{ code: number; data: string[] }>(
        '/api/v8/templates/categories'
      )

      if (response.code === 200 && response.data) {
        return response.data
      }
      return []
    } catch (error) {
      this.logger.warn('Failed to fetch categories:', error)
      return []
    }
  }

  // ==========================================================================
  // Download Tracking
  // ==========================================================================

  /**
   * Track template download
   */
  async trackDownload(templateId: string): Promise<boolean> {
    try {
      const response = await this.fetch<{ code: number }>(
        `/api/v8/templates/${encodeURIComponent(templateId)}/download`,
        { method: 'POST' }
      )
      return response.code === 200
    } catch (error) {
      this.logger.warn(`Failed to track download for ${templateId}:`, error)
      return false
    }
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Build search params string
   */
  private buildSearchParams(params: TemplateSearchParams): string {
    const searchParams = new URLSearchParams()

    if (params.query) searchParams.set('query', params.query)
    if (params.type) searchParams.set('type', params.type)
    if (params.category) searchParams.set('category', params.category)
    if (params.tags?.length) searchParams.set('tags', params.tags.join(','))
    if (params.is_official !== undefined) searchParams.set('is_official', String(params.is_official))
    if (params.is_featured !== undefined) searchParams.set('is_featured', String(params.is_featured))
    if (params.is_verified !== undefined) searchParams.set('is_verified', String(params.is_verified))
    if (params.sortBy) searchParams.set('sortBy', params.sortBy)
    if (params.order) searchParams.set('order', params.order)
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.offset) searchParams.set('offset', String(params.offset))

    return searchParams.toString()
  }

  /**
   * Extract localized name from template
   */
  getLocalizedName(template: Template, lang?: 'en' | 'zh-CN'): string {
    const language = lang || this.language
    return language === 'zh-CN' && template.name_zh_cn
      ? template.name_zh_cn
      : template.name_en
  }

  /**
   * Extract localized description from template
   */
  getLocalizedDescription(template: Template, lang?: 'en' | 'zh-CN'): string {
    const language = lang || this.language
    return language === 'zh-CN' && template.description_zh_cn
      ? template.description_zh_cn
      : template.description_en || ''
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let templatesClientInstance: TemplatesClient | null = null

/**
 * Get or create the singleton TemplatesClient instance
 */
export function getTemplatesClient(config?: TemplatesClientConfig): TemplatesClient {
  if (!templatesClientInstance) {
    templatesClientInstance = new TemplatesClient(config)
  }
  return templatesClientInstance
}

/**
 * Create a new TemplatesClient instance
 */
export function createTemplatesClient(config?: TemplatesClientConfig): TemplatesClient {
  return new TemplatesClient(config)
}
