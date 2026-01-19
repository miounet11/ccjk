/**
 * Recommendation Engine
 *
 * Intelligent plugin recommendation system that analyzes project context
 * and suggests relevant plugins from cloud registry or local cache.
 *
 * Features:
 * - Project type detection (Next.js, Vue, Node, Python, etc.)
 * - Context-aware recommendations based on frameworks and tools
 * - Hybrid cloud/local recommendation support
 * - Relevance scoring and confidence calculation
 * - Multi-language recommendation reasons
 * - Offline mode with local recommendations
 *
 * @module cloud-plugins/recommendation-engine
 */

import type { SupportedLang } from '../constants'
import type { LocalPluginCache } from './cache'
import type { CloudRecommendationClient } from './cloud-client'
import type {
  CloudPlugin,
  PluginCategory,
  PluginRecommendation,
  RecommendationContext,
  RecommendationResult,
} from './types'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { join } from 'pathe'
import { detectProject } from '../utils/auto-config/detector'

/**
 * Project detector interface
 * Defines how to detect different project types and what to recommend
 */
interface ProjectDetector {
  /** Project type identifier */
  type: string
  /** Detection function */
  detect: (files: string[], pkg?: any) => boolean
  /** Recommended plugin categories for this project type */
  recommendedCategories: PluginCategory[]
  /** Recommended tags for this project type */
  recommendedTags: string[]
  /** Detection priority (higher = checked first) */
  priority?: number
}

/**
 * Project detection rules
 * Defines how to detect different project types and what to recommend
 */
const PROJECT_DETECTORS: ProjectDetector[] = [
  {
    type: 'nextjs',
    detect: (files, pkg) =>
      files.includes('next.config.js')
      || files.includes('next.config.mjs')
      || files.includes('next.config.ts')
      || pkg?.dependencies?.next
      || pkg?.devDependencies?.next,
    recommendedCategories: ['dev', 'seo', 'performance'],
    recommendedTags: ['react', 'nextjs', 'ssr', 'seo', 'frontend'],
    priority: 10,
  },
  {
    type: 'nuxt',
    detect: (files, pkg) =>
      files.includes('nuxt.config.js')
      || files.includes('nuxt.config.ts')
      || pkg?.dependencies?.nuxt
      || pkg?.devDependencies?.nuxt,
    recommendedCategories: ['dev', 'seo', 'performance'],
    recommendedTags: ['vue', 'nuxt', 'ssr', 'seo', 'frontend'],
    priority: 10,
  },
  {
    type: 'vue',
    detect: (files, pkg) =>
      files.includes('vue.config.js')
      || files.includes('vite.config.ts')
      || files.includes('vite.config.js')
      || pkg?.dependencies?.vue
      || pkg?.devDependencies?.vue,
    recommendedCategories: ['dev', 'testing', 'performance'],
    recommendedTags: ['vue', 'vite', 'frontend', 'spa'],
    priority: 9,
  },
  {
    type: 'react',
    detect: (_files, pkg) =>
      pkg?.dependencies?.react || pkg?.devDependencies?.react,
    recommendedCategories: ['dev', 'testing', 'performance'],
    recommendedTags: ['react', 'frontend', 'spa'],
    priority: 9,
  },
  {
    type: 'angular',
    detect: (files, pkg) =>
      files.includes('angular.json')
      || pkg?.dependencies?.['@angular/core']
      || pkg?.devDependencies?.['@angular/core'],
    recommendedCategories: ['dev', 'testing'],
    recommendedTags: ['angular', 'frontend', 'spa', 'typescript'],
    priority: 9,
  },
  {
    type: 'node-backend',
    detect: (_files, pkg) => {
      const hasBackendFramework
        = pkg?.dependencies?.express
          || pkg?.dependencies?.fastify
          || pkg?.dependencies?.['@nestjs/core']
          || pkg?.dependencies?.koa
          || pkg?.dependencies?.hono
      const noFrontendFramework
        = !pkg?.dependencies?.react
          && !pkg?.dependencies?.vue
          && !pkg?.dependencies?.next
          && !pkg?.dependencies?.nuxt
      return hasBackendFramework && noFrontendFramework
    },
    recommendedCategories: ['dev', 'testing', 'devops', 'security'],
    recommendedTags: ['nodejs', 'backend', 'api', 'server'],
    priority: 8,
  },
  {
    type: 'python',
    detect: files =>
      files.includes('requirements.txt')
      || files.includes('pyproject.toml')
      || files.includes('setup.py')
      || files.includes('Pipfile'),
    recommendedCategories: ['dev', 'ai', 'testing'],
    recommendedTags: ['python', 'ml', 'data', 'backend'],
    priority: 8,
  },
  {
    type: 'django',
    detect: (files, _pkg) =>
      files.includes('manage.py') || files.includes('requirements.txt'),
    recommendedCategories: ['dev', 'testing', 'security'],
    recommendedTags: ['python', 'django', 'backend', 'web'],
    priority: 9,
  },
  {
    type: 'fastapi',
    detect: files => files.includes('requirements.txt'),
    recommendedCategories: ['dev', 'testing', 'docs'],
    recommendedTags: ['python', 'fastapi', 'backend', 'api'],
    priority: 8,
  },
  {
    type: 'rust',
    detect: files => files.includes('Cargo.toml'),
    recommendedCategories: ['dev', 'testing', 'performance'],
    recommendedTags: ['rust', 'systems', 'performance'],
    priority: 7,
  },
  {
    type: 'go',
    detect: files => files.includes('go.mod'),
    recommendedCategories: ['dev', 'testing', 'devops'],
    recommendedTags: ['go', 'golang', 'backend', 'microservices'],
    priority: 7,
  },
  {
    type: 'monorepo',
    detect: (files, pkg) =>
      files.includes('pnpm-workspace.yaml')
      || files.includes('lerna.json')
      || files.includes('nx.json')
      || pkg?.workspaces != null,
    recommendedCategories: ['dev', 'devops', 'testing'],
    recommendedTags: ['monorepo', 'workspace', 'tooling'],
    priority: 6,
  },
  {
    type: 'docker',
    detect: files =>
      files.includes('Dockerfile') || files.includes('docker-compose.yml'),
    recommendedCategories: ['devops', 'testing'],
    recommendedTags: ['docker', 'containers', 'deployment'],
    priority: 5,
  },
  {
    type: 'typescript',
    detect: files => files.includes('tsconfig.json'),
    recommendedCategories: ['dev', 'testing'],
    recommendedTags: ['typescript', 'types', 'tooling'],
    priority: 4,
  },
]

/**
 * Recommendation Engine
 *
 * Main class for generating intelligent plugin recommendations
 */
export class RecommendationEngine {
  private cloudClient: CloudRecommendationClient
  private cache: LocalPluginCache

  /**
   * Create a new recommendation engine
   *
   * @param cloudClient - Client for fetching cloud recommendations
   * @param cache - Local plugin cache
   */
  constructor(cloudClient: CloudRecommendationClient, cache: LocalPluginCache) {
    this.cloudClient = cloudClient
    this.cache = cache
  }

  /**
   * Get plugin recommendations for a project
   *
   * Analyzes the project and returns personalized plugin recommendations
   * with scoring, reasoning, and confidence levels.
   *
   * @param projectPath - Path to project directory (defaults to cwd)
   * @returns Recommendation result with scored plugins
   */
  async getRecommendations(projectPath?: string): Promise<RecommendationResult> {
    const context = await this.detectProjectContext(projectPath || process.cwd())

    // Try cloud recommendations first
    let recommendations: PluginRecommendation[] = []
    let source: 'cloud' | 'local' | 'hybrid' = 'local'

    try {
      // Try to get cloud recommendations
      const cloudResult = await this.cloudClient.getRecommendations({
        codeToolType: 'claude-code',
        language: context.language as 'zh-CN' | 'en' | undefined,
        installedPlugins: context.existingPlugins,
        limit: 20,
      })
      if (cloudResult.success && cloudResult.data) {
        // Convert cloud result to PluginRecommendation format
        recommendations = cloudResult.data.plugins.map(plugin => ({
          plugin,
          score: cloudResult.data!.scores[plugin.id] || 50,
          reason: {
            'en': cloudResult.data!.reasons[plugin.id] || 'Recommended by cloud service',
            'zh-CN': cloudResult.data!.reasons[plugin.id] || '云服务推荐',
          },
          confidence: (cloudResult.data!.scores[plugin.id] || 50) / 100,
          matchingTags: [],
          matchingCategories: [],
          isInstalled: context.existingPlugins?.includes(plugin.id) || false,
        }))
        source = 'cloud'
      }
    }
    catch {
      // Fall back to local recommendations
      console.warn('Cloud recommendations unavailable, using local cache')
    }

    // If cloud failed or unavailable, use local recommendations
    if (recommendations.length === 0) {
      const localResult = this.getLocalRecommendations(context)
      recommendations = localResult.recommendations
      source = 'local'
    }

    // Merge with local recommendations for hybrid approach
    if (source === 'cloud') {
      const localResult = this.getLocalRecommendations(context)
      recommendations = this.mergeRecommendations(
        { recommendations, context, totalEvaluated: 0, source: 'cloud', timestamp: '' },
        localResult,
      ).recommendations
      source = 'hybrid'
    }

    // Filter out already installed plugins
    recommendations = this.filterInstalledPlugins(recommendations)

    // Sort by score (descending)
    recommendations.sort((a, b) => b.score - a.score)

    return {
      recommendations,
      context,
      totalEvaluated: recommendations.length,
      source,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Detect project context from directory
   *
   * Analyzes project files and structure to determine frameworks,
   * languages, tools, and recommended plugin categories.
   *
   * @param projectPath - Path to project directory
   * @returns Project context for recommendations
   */
  async detectProjectContext(projectPath: string): Promise<RecommendationContext> {
    // Use existing detector from auto-config
    const projectInfo = detectProject(projectPath)

    // Get list of files in project root
    const files = existsSync(projectPath) ? readdirSync(projectPath) : []

    // Read package.json if exists
    let packageJson: any
    try {
      const pkgPath = join(projectPath, 'package.json')
      if (existsSync(pkgPath)) {
        packageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      }
    }
    catch {
      // Ignore package.json read errors
    }

    // Detect project type using detectors
    let detectedType: string | undefined
    const recommendedCategories: PluginCategory[] = []
    const recommendedTags: string[] = []

    // Sort detectors by priority
    const sortedDetectors = [...PROJECT_DETECTORS].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    )

    for (const detector of sortedDetectors) {
      if (detector.detect(files, packageJson)) {
        if (!detectedType) {
          detectedType = detector.type
        }
        recommendedCategories.push(...detector.recommendedCategories)
        recommendedTags.push(...detector.recommendedTags)
      }
    }

    // Get installed plugins (from cache metadata)
    const existingPlugins: string[] = []

    return {
      projectType: detectedType || projectInfo.type,
      language: projectInfo.languages[0],
      frameworks: projectInfo.frameworks,
      languages: projectInfo.languages,
      buildTools: projectInfo.buildTools,
      testFrameworks: projectInfo.testFrameworks,
      hasTypeScript: projectInfo.hasTypeScript,
      hasDocker: projectInfo.hasDocker,
      hasMonorepo: projectInfo.hasMonorepo,
      packageManager: projectInfo.packageManager,
      cicd: projectInfo.cicd,
      rootDir: projectPath,
      recommendedCategories: [...new Set(recommendedCategories)],
      recommendedTags: [...new Set(recommendedTags)],
      existingPlugins,
    }
  }

  /**
   * Generate local recommendations without cloud service
   *
   * Uses cached plugins and project context to generate recommendations
   * entirely offline.
   *
   * @param context - Project context
   * @returns Local recommendation result
   */
  getLocalRecommendations(context: RecommendationContext): RecommendationResult {
    const allPlugins = this.cache.getCachedPlugins()
    const recommendations: PluginRecommendation[] = []

    for (const plugin of allPlugins) {
      const score = this.calculateRelevanceScore(plugin, context)

      // Only include plugins with score > 0
      if (score > 0) {
        const matchingTags = this.getMatchingTags(plugin, context)
        const matchingCategories = this.getMatchingCategories(plugin, context)
        const confidence = this.calculateConfidence(score, matchingTags.length, matchingCategories.length)
        const isInstalled = context.existingPlugins?.includes(plugin.id) || false

        recommendations.push({
          plugin,
          score,
          reason: this.generateReason(plugin, context, matchingTags, matchingCategories),
          confidence,
          matchingTags,
          matchingCategories,
          isInstalled,
        })
      }
    }

    return {
      recommendations: recommendations.sort((a, b) => b.score - a.score),
      context,
      totalEvaluated: allPlugins.length,
      source: 'local',
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Merge cloud and local recommendations
   *
   * Combines recommendations from both sources, deduplicates,
   * and re-scores based on combined signals.
   *
   * @param cloud - Cloud recommendations
   * @param local - Local recommendations
   * @returns Merged recommendation result
   */
  mergeRecommendations(
    cloud: RecommendationResult,
    local: RecommendationResult,
  ): RecommendationResult {
    const merged = new Map<string, PluginRecommendation>()

    // Add cloud recommendations
    for (const rec of cloud.recommendations) {
      merged.set(rec.plugin.id, rec)
    }

    // Merge with local recommendations
    for (const rec of local.recommendations) {
      const existing = merged.get(rec.plugin.id)
      if (existing) {
        // Average the scores and take max confidence
        existing.score = Math.round((existing.score + rec.score) / 2)
        existing.confidence = Math.max(existing.confidence, rec.confidence)
        // Merge matching tags and categories
        existing.matchingTags = [...new Set([...existing.matchingTags, ...rec.matchingTags])]
        existing.matchingCategories = [...new Set([...existing.matchingCategories, ...rec.matchingCategories])]
      }
      else {
        merged.set(rec.plugin.id, rec)
      }
    }

    return {
      recommendations: Array.from(merged.values()).sort((a, b) => b.score - a.score),
      context: cloud.context,
      totalEvaluated: cloud.totalEvaluated + local.totalEvaluated,
      source: 'hybrid',
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Filter out already installed plugins
   *
   * @param recommendations - Plugin recommendations
   * @returns Filtered recommendations (non-installed only)
   */
  filterInstalledPlugins(recommendations: PluginRecommendation[]): PluginRecommendation[] {
    return recommendations.filter(rec => !rec.isInstalled)
  }

  /**
   * Calculate relevance score for a plugin
   *
   * Scores are based on:
   * - Category match (40 points)
   * - Tag match (30 points)
   * - Framework match (20 points)
   * - Language match (10 points)
   *
   * @param plugin - Plugin to score
   * @param context - Project context
   * @returns Relevance score (0-100)
   */
  calculateRelevanceScore(plugin: CloudPlugin, context: RecommendationContext): number {
    let score = 0

    // Category match (40 points max)
    if (context.recommendedCategories?.includes(plugin.category)) {
      score += 40
    }

    // Tag match (30 points max, 5 per tag)
    const matchingTags = this.getMatchingTags(plugin, context)
    score += Math.min(matchingTags.length * 5, 30)

    // Framework match (20 points max, 10 per framework)
    if (context.frameworks) {
      for (const framework of context.frameworks) {
        if (plugin.tags.some(tag => tag.toLowerCase().includes(framework.toLowerCase()))) {
          score += 10
        }
      }
      score = Math.min(score, 60) // Cap at 60 after framework bonus
    }

    // Language match (10 points max)
    if (context.languages) {
      for (const lang of context.languages) {
        if (plugin.tags.some(tag => tag.toLowerCase().includes(lang.toLowerCase()))) {
          score += 10
          break
        }
      }
    }

    return Math.min(score, 100)
  }

  /**
   * Get matching tags between plugin and context
   *
   * @param plugin - Plugin to check
   * @param context - Project context
   * @returns Array of matching tags
   */
  private getMatchingTags(plugin: CloudPlugin, context: RecommendationContext): string[] {
    const contextTags = context.recommendedTags || []
    return plugin.tags.filter(tag =>
      contextTags.some(ctag => ctag.toLowerCase() === tag.toLowerCase()),
    )
  }

  /**
   * Get matching categories between plugin and context
   *
   * @param plugin - Plugin to check
   * @param context - Project context
   * @returns Array of matching categories
   */
  private getMatchingCategories(plugin: CloudPlugin, context: RecommendationContext): PluginCategory[] {
    const contextCategories = context.recommendedCategories || []
    return contextCategories.includes(plugin.category) ? [plugin.category] : []
  }

  /**
   * Calculate confidence level for recommendation
   *
   * Confidence is based on:
   * - Number of matching signals
   * - Score magnitude
   * - Plugin popularity (downloads, rating)
   *
   * @param score - Relevance score
   * @param matchingTagsCount - Number of matching tags
   * @param matchingCategoriesCount - Number of matching categories
   * @returns Confidence level (0-1)
   */
  private calculateConfidence(
    score: number,
    matchingTagsCount: number,
    matchingCategoriesCount: number,
  ): number {
    // Base confidence from score
    let confidence = score / 100

    // Boost for multiple matching signals
    const signalCount = matchingTagsCount + matchingCategoriesCount
    if (signalCount >= 3) {
      confidence += 0.1
    }
    if (signalCount >= 5) {
      confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Generate localized recommendation reason
   *
   * Creates human-readable explanation for why a plugin is recommended.
   *
   * @param _plugin - Recommended plugin (unused, reserved for future use)
   * @param context - Project context
   * @param matchingTags - Matching tags
   * @param matchingCategories - Matching categories
   * @returns Localized reason strings
   */
  private generateReason(
    _plugin: CloudPlugin,
    context: RecommendationContext,
    matchingTags: string[],
    matchingCategories: PluginCategory[],
  ): Record<SupportedLang, string> {
    const reasons: Record<SupportedLang, string> = {
      'en': '',
      'zh-CN': '',
    }

    // Build reason parts
    const reasonParts: { 'en': string[], 'zh-CN': string[] } = { 'en': [], 'zh-CN': [] }

    // Project type match
    if (context.projectType) {
      reasonParts.en.push(`Recommended for ${context.projectType} projects`)
      reasonParts['zh-CN'].push(`推荐用于 ${context.projectType} 项目`)
    }

    // Category match
    if (matchingCategories.length > 0) {
      const categoryNames = matchingCategories.join(', ')
      reasonParts.en.push(`Matches ${categoryNames} category`)
      reasonParts['zh-CN'].push(`匹配 ${categoryNames} 类别`)
    }

    // Tag match
    if (matchingTags.length > 0) {
      const tagList = matchingTags.slice(0, 3).join(', ')
      reasonParts.en.push(`Relevant tags: ${tagList}`)
      reasonParts['zh-CN'].push(`相关标签: ${tagList}`)
    }

    // Framework match
    if (context.frameworks && context.frameworks.length > 0) {
      const frameworks = context.frameworks.slice(0, 2).join(', ')
      reasonParts.en.push(`Works with ${frameworks}`)
      reasonParts['zh-CN'].push(`适用于 ${frameworks}`)
    }

    // Combine reason parts
    reasons.en = reasonParts.en.join('. ')
    reasons['zh-CN'] = reasonParts['zh-CN'].join('。')

    // Fallback if no specific reasons
    if (!reasons.en) {
      reasons.en = 'General purpose plugin for your project'
      reasons['zh-CN'] = '适用于您项目的通用插件'
    }

    return reasons
  }

  /**
   * Get recommendations based on tags
   *
   * @param tags - Tags to match
   * @returns Matching plugins
   */
  getTagBasedRecommendations(tags: string[]): CloudPlugin[] {
    const allPlugins = this.cache.getCachedPlugins()
    return allPlugins.filter(plugin =>
      tags.some(tag => plugin.tags.includes(tag)),
    )
  }

  /**
   * Get recommendations based on category
   *
   * @param category - Category to match
   * @returns Matching plugins
   */
  getCategoryBasedRecommendations(category: PluginCategory): CloudPlugin[] {
    const allPlugins = this.cache.getCachedPlugins()

    return allPlugins.filter(plugin => plugin.category === category)
  }
}
