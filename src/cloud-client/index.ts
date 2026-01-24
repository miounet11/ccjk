/**
 * CCJK Cloud Client Module
 *
 * Main entry point for cloud client functionality
 * @module cloud-client
 */

// Import dependencies
import consola from 'consola'

// Import classes
import { CloudClient, createCloudClient } from './client'
import { CloudCache, CachedCloudClient } from './cache'
import { RetryableCloudClient } from './retry'
import { initializeTelemetry } from './telemetry'

// Import recommendations
import { getCloudRecommendations, getCloudSkillRecommendations, getCloudMcpRecommendations } from './recommendations'
import { getCloudRecommendedHooks, submitHookAnalytics, getCommunityHooks } from './hook-recommendations.js'

// Import v8 Templates Client
import { TemplatesClient, getTemplatesClient, createTemplatesClient } from './templates-client'

// Export types
export * from './types'

// Export core client
export { CloudClient, createCloudClient } from './client'

// Export caching
export { CloudCache, CachedCloudClient } from './cache'

// Export retry logic
export { RetryableCloudClient, withRetry, retryUtils } from './retry'

// Export telemetry
export {
  TelemetryReporter,
  initializeTelemetry,
  getTelemetry,
  stopTelemetry,
  trackEvent,
  telemetryUtils,
} from './telemetry'

// Export recommendations
export {
  getCloudRecommendations,
  getCloudSkillRecommendations,
  getCloudMcpRecommendations,
  getCloudRecommendedHooks,
  submitHookAnalytics,
  getCommunityHooks,
}

// Export v8 Templates Client
export {
  TemplatesClient,
  getTemplatesClient,
  createTemplatesClient,
}
export type {
  Template,
  TemplateType as V8TemplateType,
  TemplateSearchParams,
  TemplateListResponse,
  BatchTemplateRequest as V8BatchTemplateRequest,
  BatchTemplateResponse as V8BatchTemplateResponse,
  TemplatesClientConfig,
} from './templates-client'

// Re-export all interfaces for convenience
export type {
  ProjectAnalysisRequest,
  ProjectAnalysisResponse,
  Recommendation,
  TemplateResponse,
  BatchTemplateRequest,
  BatchTemplateResponse,
  UsageReport,
  UsageReportResponse,
  HealthCheckResponse,
  CloudClientError,
  CacheEntry,
  TemplateParameter,
  TemplateType,
  MetricType,
} from './types'

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
  async analyzeProject(request: any): Promise<any> {
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
  async getTemplate(id: string, language?: string): Promise<any> {
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
  async getBatchTemplates(request: any): Promise<any> {
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
  async reportUsage(report: any): Promise<any> {
    return this.client.reportUsage(report)
  }

  /**
   * Health check (no fallback)
   */
  async healthCheck(): Promise<any> {
    return this.client.healthCheck()
  }

  /**
   * Get local fallback recommendations
   */
  private getLocalRecommendations(request: any): any {
    // Basic local recommendations based on project type
    const recommendations = []

    // TypeScript projects
    if (request.devDependencies?.typescript || request.devDependencies?.tslib) {
      recommendations.push({
        id: 'typescript-workflow',
        name: { 'en': 'TypeScript Workflow', 'zh-CN': 'TypeScript 工作流' },
        description: { 'en': 'Enhanced TypeScript support', 'zh-CN': '增强的 TypeScript 支持' },
        category: 'workflow',
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
        category: 'workflow',
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
        category: 'workflow',
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
        category: 'workflow',
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
  private getLocalTemplate(id: string, language?: string): any {
    // Basic local templates
    const templates: Record<string, any> = {
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
  private getLocalBatchTemplates(request: any): any {
    const templates: Record<string, any> = {}
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
  private detectProjectType(request: any): string {
    if (request.dependencies?.react) return 'react'
    if (request.dependencies?.vue) return 'vue'
    if (request.dependencies?.express) return 'nodejs'
    if (request.devDependencies?.typescript) return 'typescript'
    return 'generic'
  }

  /**
   * Detect frameworks
   */
  private detectFrameworks(request: any): string[] {
    const frameworks: string[] = []
    const deps = { ...request.dependencies, ...request.devDependencies }

    if (deps.react) frameworks.push('react')
    if (deps.vue) frameworks.push('vue')
    if (deps.angular) frameworks.push('angular')
    if (deps.svelte) frameworks.push('svelte')
    if (deps.express) frameworks.push('express')
    if (deps.fastify) frameworks.push('fastify')
    if (deps.typescript) frameworks.push('typescript')
    if (deps.webpack) frameworks.push('webpack')
    if (deps.vite) frameworks.push('vite')

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