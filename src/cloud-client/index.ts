/**
 * CCJK Cloud Client Module
 *
 * Main entry point for cloud client functionality
 * @module cloud-client
 */

// Import classes
import type { CloudClient } from './client'
import type {
  BatchTemplateRequest,
  BatchTemplateResponse,
  HealthCheckResponse,
  ProjectAnalysisRequest,
  ProjectAnalysisResponse,
  TemplateResponse,
  UsageReport,
  UsageReportResponse,
} from './types'

// Import dependencies
import consola from 'consola'
import { CachedCloudClient, CloudCache } from './cache'
import { createCloudClient } from './client'
// Import recommendations
import { getCloudMcpRecommendations, getCloudRecommendations, getCloudSkillRecommendations } from './recommendations'

import { RetryableCloudClient } from './retry'
import { initializeTelemetry } from './telemetry'

// Import v8 Templates Client
import { createTemplatesClient, getTemplatesClient, TemplatesClient } from './templates-client'

// Export caching
export { CachedCloudClient, CloudCache } from './cache'

// Export core client
export { CloudClient, createCloudClient } from './client'

// Export DTO types and converters
export type {
  AgentConfig,
  AnalysisCompletedData,
  BatchTelemetryData,
  ErrorOccurredData,
  HookConfig,
  McpServerConfig,
  RawBatchTemplateResponse,
  RawProjectAnalysisResponse,
  RawRecommendation,
  RawTemplate,
  RecommendationAcceptedData,
  RecommendationConfig,
  RecommendationShownData,
  SkillConfig,
  TelemetryEventData,
  TemplateDownloadData,
  TemplateParameterValue,
  WorkflowConfig,
} from './dto'
export {
  convertBatchTemplateResponse,
  convertConfig,
  convertParameterDefault,
  convertProjectAnalysisResponse,
  convertRecommendation,
  convertTemplate,
  convertTemplateParameter,
  extractString,
  isRecommendationConfig,
  isTelemetryEventData,
  isTemplateParameterValue,
  validateBatchTemplateRequest,
  validateProjectAnalysisRequest,
  validateUsageReport,
} from './dto'

// Export standardized error handling
export {
  CloudError,
  CloudErrorCode,
  CloudErrorFactory,
  formatErrorForLogging,
  getRetryDelay,
  handleCloudError,
  isAuthError,
  isRateLimitError,
  isRetryableError,
  isRetryableErrorCode,
} from './errors'
export type { CloudErrorMetadata } from './errors'

// Miaoda backend client
export {
  createMiaodaClient,
  MiaodaClient,
  parseResponse as parseMiaodaResponse,
} from './miaoda-client'

export type {
  LlmMessage,
  LlmOptions,
  MiaodaClientConfig,
  MiaodaUser,
  ParsedResponse,
  QuotaInfo,
  StreamCallbacks,
  TokenPair,
} from './miaoda-client'

// Ratings API
export {
  createRating,
  getSkillRatings,
  isDuplicateRatingError,
  isSkillNotFoundError,
  isUnauthorizedError,
  ratingsApi,
  RatingsApiError,
  RatingsApiErrorCode,
} from './ratings-api.js'

// Export recommendations
export {
  getCloudMcpRecommendations,
  getCloudRecommendations,
  getCloudSkillRecommendations,
}

// Export v8 Templates Client
export {
  createTemplatesClient,
  getTemplatesClient,
  TemplatesClient,
}
export type {
  CreateRatingData,
  CreateRatingResponse,
  GetSkillRatingsParams,
  GetSkillRatingsResponse,
  RatingSortOption,
} from './ratings-api.js'

// Export retry logic
export { RetryableCloudClient, retryUtils, withRetry } from './retry'

// Skills Marketplace API
export { skillsMarketplaceApi } from './skills-marketplace-api.js'

/**
 * Fallback Cloud Client with Local Fallback Support
 *
 * When the API is unavailable, falls back to local recommendations
 */
export class FallbackCloudClient {
  private client: CloudClient
  private fallbackEnabled: boolean

  constructor(client: CloudClient, fallbackEnabled = true) {
    this.client = client
    this.fallbackEnabled = fallbackEnabled
  }

  /**
   * Analyze project with fallback
   */
  async analyzeProject(request: ProjectAnalysisRequest): Promise<ProjectAnalysisResponse> {
    try {
      return await this.client.analyzeProject(request)
    }
    catch (error) {
      if (this.fallbackEnabled) {
        consola.warn('Cloud API unavailable, using local recommendations')
        return this.getLocalRecommendations(request)
      }
      throw error
    }
  }

  /**
   * Get template with fallback
   */
  async getTemplate(id: string, language?: string): Promise<TemplateResponse> {
    try {
      return await this.client.getTemplate(id, language)
    }
    catch (error) {
      if (this.fallbackEnabled) {
        consola.warn('Cloud API unavailable, using local template')
        return this.getLocalTemplate(id, language)
      }
      throw error
    }
  }

  /**
   * Get batch templates with fallback
   */
  async getBatchTemplates(request: BatchTemplateRequest): Promise<BatchTemplateResponse> {
    try {
      return await this.client.getBatchTemplates(request)
    }
    catch (error) {
      if (this.fallbackEnabled) {
        consola.warn('Cloud API unavailable, using local templates')
        return this.getLocalBatchTemplates(request)
      }
      throw error
    }
  }

  /**
   * Report usage (no fallback)
   */
  async reportUsage(report: UsageReport): Promise<UsageReportResponse> {
    return this.client.reportUsage(report)
  }

  /**
   * Health check (no fallback)
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return this.client.healthCheck()
  }

  /**
   * Get local fallback recommendations
   */
  private getLocalRecommendations(request: ProjectAnalysisRequest): ProjectAnalysisResponse {
    // Basic local recommendations based on project type
    const recommendations = []

    // TypeScript projects
    if (request.devDependencies?.typescript || request.devDependencies?.tslib) {
      recommendations.push({
        id: 'typescript-workflow',
        name: { 'en': 'TypeScript Workflow', 'zh-CN': 'TypeScript 工作流' },
        description: { 'en': 'Enhanced TypeScript support', 'zh-CN': '增强的 TypeScript 支持' },
        category: 'skill' as const,
        relevanceScore: 0.9,
        installCommand: 'ccjk config switch typescript',
        tags: ['typescript', 'type-checking'],
      })
    }

    // React projects
    if (request.dependencies?.react || request.dependencies?.['react-dom']) {
      recommendations.push({
        id: 'react-workflow',
        name: { 'en': 'React Workflow', 'zh-CN': 'React 工作流' },
        description: { 'en': 'React development tools', 'zh-CN': 'React 开发工具' },
        category: 'skill' as const,
        relevanceScore: 0.95,
        installCommand: 'ccjk config switch react',
        tags: ['react', 'jsx', 'frontend'],
      })
    }

    // Node.js projects
    if (request.dependencies?.express || request.dependencies?.fastify) {
      recommendations.push({
        id: 'nodejs-workflow',
        name: { 'en': 'Node.js Workflow', 'zh-CN': 'Node.js 工作流' },
        description: { 'en': 'Node.js development tools', 'zh-CN': 'Node.js 开发工具' },
        category: 'skill' as const,
        relevanceScore: 0.9,
        installCommand: 'ccjk config switch nodejs',
        tags: ['nodejs', 'backend', 'server'],
      })
    }

    // Git projects
    if (request.gitRemote) {
      recommendations.push({
        id: 'git-workflow',
        name: { 'en': 'Git Workflow', 'zh-CN': 'Git 工作流' },
        description: { 'en': 'Git best practices', 'zh-CN': 'Git 最佳实践' },
        category: 'skill' as const,
        relevanceScore: 0.8,
        installCommand: 'ccjk config switch git',
        tags: ['git', 'vcs'],
      })
    }

    return {
      requestId: 'local-fallback',
      recommendations,
      projectType: this.detectProjectType(request),
      frameworks: this.detectFrameworks(request),
    }
  }

  /**
   * Get local fallback template
   */
  private getLocalTemplate(id: string, _language?: string): TemplateResponse {
    // Basic local templates
    const templates: Record<string, TemplateResponse> = {
      'basic-workflow': {
        id: 'basic-workflow',
        type: 'workflow',
        name: { 'en': 'Basic Workflow', 'zh-CN': '基础工作流' },
        description: { 'en': 'Basic development workflow', 'zh-CN': '基础开发工作流' },
        content: JSON.stringify({
          name: 'basic',
          steps: ['init', 'test', 'build', 'deploy'],
        }, null, 2),
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }

    return templates[id] || {
      id,
      type: 'workflow',
      name: { 'en': 'Unknown Template', 'zh-CN': '未知模板' },
      description: { 'en': 'Template not found', 'zh-CN': '模板未找到' },
      content: '{}',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Get local fallback batch templates
   */
  private getLocalBatchTemplates(request: BatchTemplateRequest): BatchTemplateResponse {
    const templates: Record<string, TemplateResponse> = {}
    const notFound: string[] = []

    for (const id of request.ids) {
      try {
        templates[id] = this.getLocalTemplate(id, request.language)
      }
      catch {
        notFound.push(id)
      }
    }

    return {
      requestId: 'local-fallback',
      templates,
      notFound,
    }
  }

  /**
   * Detect project type
   */
  private detectProjectType(request: ProjectAnalysisRequest): string {
    if (request.dependencies?.react)
      return 'react'
    if (request.dependencies?.vue)
      return 'vue'
    if (request.dependencies?.express)
      return 'nodejs'
    if (request.devDependencies?.typescript)
      return 'typescript'
    return 'generic'
  }

  /**
   * Detect frameworks
   */
  private detectFrameworks(request: ProjectAnalysisRequest): string[] {
    const frameworks: string[] = []
    const deps = { ...request.dependencies, ...request.devDependencies }

    if (deps.react)
      frameworks.push('react')
    if (deps.vue)
      frameworks.push('vue')
    if (deps.angular)
      frameworks.push('angular')
    if (deps.svelte)
      frameworks.push('svelte')
    if (deps.express)
      frameworks.push('express')
    if (deps.fastify)
      frameworks.push('fastify')
    if (deps.typescript)
      frameworks.push('typescript')
    if (deps.webpack)
      frameworks.push('webpack')
    if (deps.vite)
      frameworks.push('vite')

    return frameworks
  }
}

/**
 * Create a complete cloud client with all features
 */
export function createCompleteCloudClient(config?: Partial<import('./types').CloudClientConfig>) {
  // Create base client
  const baseClient = createCloudClient(config)

  // Add retry wrapper
  const retryClient = new RetryableCloudClient(baseClient)

  // Add cache wrapper
  const cache = new CloudCache(baseClient.getConfig())
  const cachedClient = new CachedCloudClient(retryClient.getClient(), cache)

  // Add fallback wrapper
  const fallbackClient = new FallbackCloudClient(cachedClient.getClient())

  // Initialize telemetry
  initializeTelemetry(baseClient)

  return fallbackClient
}

/**
 * Export default client factory
 */
// Skills Marketplace API Types
export type {
  ApiResponse,
  CreateRatingRequest,
  InstallSkillRequest,
  MarketplaceFilters,
  MarketplaceParams,
  MarketplaceResponse,
  Pagination,
  Quota,
  Rating,
  RatingsParams,
  RatingSummary,
  RecommendationsParams,
  SearchParams,
  SearchResponse,
  Skill,
  SkillCategory,
  SkillMetadata,
  SkillProvider,
  SkillStatus,
  SuggestionsParams,
  SupportedAgent,
  TrendingParams,
  UpdateSkillRequest,
  UserSkill,
} from './skills-marketplace-types.js'

// Unified Skills API
export * from './skills/index.js'

// Export telemetry
export {
  getTelemetry,
  initializeTelemetry,
  stopTelemetry,
  TelemetryReporter,
  telemetryUtils,
  trackEvent,
} from './telemetry'
export type {
  Template,
  TemplateListResponse,
  TemplatesClientConfig,
  TemplateSearchParams,
  BatchTemplateRequest as V8BatchTemplateRequest,
  BatchTemplateResponse as V8BatchTemplateResponse,
  TemplateType as V8TemplateType,
} from './templates-client'

// Export types
export * from './types'

// Re-export all interfaces for convenience
export type {
  BatchTemplateRequest,
  BatchTemplateResponse,
  CacheEntry,
  CloudClientError,
  HealthCheckResponse,
  MetricType,
  ProjectAnalysisRequest,
  ProjectAnalysisResponse,
  Recommendation,
  TemplateParameter,
  TemplateResponse,
  TemplateType,
  UsageReport,
  UsageReportResponse,
} from './types'

// User Skills API
export type { AuthRequestOptions } from './user-skills-api.js'
export {
  canInstallMore,
  getDisabledSkills,
  getEnabledSkills,
  getQuotaUsagePercentage,
  getRecommendations,
  getUserQuota,
  getUserSkills,
  installSkill,
  isSkillInstalled,
  sortByLastUsed,
  sortByUsage,
  uninstallSkill,
  updateSkill,
  userSkillsApi,
} from './user-skills-api.js'

export default {
  createClient: createCompleteCloudClient,
  createCloudClient,
  createCachedClient: (config?: Partial<import('./types').CloudClientConfig>) => {
    const client = createCloudClient(config)
    const cache = new CloudCache(client.getConfig())
    return new CachedCloudClient(client, cache)
  },
  createRetryableClient: (config?: Partial<import('./types').CloudClientConfig>) => {
    const client = createCloudClient(config)
    return new RetryableCloudClient(client)
  },
  createFallbackClient: (config?: Partial<import('./types').CloudClientConfig>) => {
    const client = createCloudClient(config)
    return new FallbackCloudClient(client)
  },
}
