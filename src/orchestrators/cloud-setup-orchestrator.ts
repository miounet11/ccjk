/**
 * Cloud Setup Orchestrator *
 * Orchestrates cloud-powered setup with AI recommendations for optimal CCJK configuration
 * @module orchestrators/cloud-setup-orchestrator
 */

import type { SupportedLang } from '../constants'
import type { ProjectAnalysis } from '../analyzers/types'
import type {
  ProjectAnalysisRequest,
  ProjectAnalysisResponse,
  Recommendation,
  TemplateResponse,
  BatchTemplateResponse,
  UsageReportResponse
} from '../cloud-client/types'
import type { CcjkSkillsOptions } from '../commands/ccjk-skills'
import type { CcjkMcpOptions } from '../commands/ccjk-mcp'
import type { CcjkAgentsOptions } from '../commands/ccjk-agents'
import type { CcjkHooksOptions } from '../commands/ccjk-hooks'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import consola from 'consola'
import ansis from 'ansis'
import { createHash } from 'node:crypto'
import { ccjkSkills } from '../commands/ccjk-skills'
import { ccjkMcp } from '../commands/ccjk-mcp'
import { ccjkAgents } from '../commands/ccjk-agents'
import { ccjkHooks } from '../commands/ccjk-hooks'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

// Read package.json for version
const __dirname = dirname(fileURLToPath(import.meta.url))
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'))
const CCJK_VERSION = packageJson.version
import { analyzeProject } from '../analyzers'
import { createCompleteCloudClient, type FallbackCloudClient } from '../cloud-client'
import { i18n } from '../i18n'
import { extractString } from '../utils/i18n-helpers'

// ============================================================================
// Types
// ============================================================================

export interface CloudSetupOptions {
  /** Language for UI */
  lang?: SupportedLang
  /** Cloud strategy */
  strategy?: 'cloud-smart' | 'cloud-conservative' | 'local-fallback'
  /** Use cloud recommendations (default: true) */
  useCloud?: boolean
  /** Cloud endpoint */
  cloudEndpoint?: string
  /** Cache strategy */
  cacheStrategy?: 'aggressive' | 'normal' | 'disabled'
  /** Show recommendation reasons */
  showRecommendationReason?: boolean
  /** Show confidence scores */
  showConfidence?: boolean
  /** Show comparison with community */
  showComparison?: boolean
  /** Submit telemetry (default: true) */
  submitTelemetry?: boolean
  /** Include feedback after installation */
  includeFeedback?: boolean
  /** Generate report */
  generateReport?: boolean
  /** Report format */
  reportFormat?: 'markdown' | 'json' | 'html'
  /** Target directory */
  targetDir?: string
  /** Interactive mode */
  interactive?: boolean
  /** Dry run mode */
  dryRun?: boolean
  /** Force mode */
  force?: boolean
}

export interface CloudSetupResult {
  /** Success status */
  success: boolean
  /** Cloud request ID */
  requestId: string
  /** Cloud confidence score */
  confidence: number
  /** Installed resources */
  installed: {
    skills: string[]
    mcpServices: string[]
    agents: string[]
    hooks: string[]
  }
  /** Skipped resources */
  skipped: {
    skills: string[]
    mcpServices: string[]
    agents: string[]
    hooks: string[]
  }
  /** Failed resources */
  failed: {
    skills: Array<{ id: string; error: string }>
    mcpServices: Array<{ id: string; error: string }>
    agents: Array<{ id: string; error: string }>
    hooks: Array<{ id: string; error: string }>
  }
  /** Duration in milliseconds */
  duration: number
  /** Cloud insights */
  insights?: CloudInsights
  /** Community comparison */
  communityComparison?: CommunityComparison
  /** Report path */
  reportPath?: string
}

export interface CloudRecommendations {
  /** Skills recommendations */
  skills: Recommendation[]
  /** MCP services recommendations */
  mcpServices: Recommendation[]
  /** Agent recommendations */
  agents: Recommendation[]
  /** Hook recommendations */
  hooks: Recommendation[]
  /** Overall confidence score */
  confidence: number
  /** Project fingerprint */
  fingerprint: string
  /** Cloud insights */
  insights: CloudInsights
}

export interface CloudInsights {
  /** Key insights */
  insights: string[]
  /** Productivity improvements */
  productivityImprovements: Array<{
    resource: string
    improvement: number // percentage
    reason: string
  }>
  /** Next recommendations */
  nextRecommendations: string[]
  /** Community stats */
  communityStats?: {
    similarProjects: number
    topInstallations: Array<{ id: string; percentage: number }>
  }
}

export interface CommunityComparison {
  /** Community size */
  communitySize: number
  /** Top 10% configurations */
  top10Config: string[]
  /** Your configuration */
  yourConfig: string[]
  /** Comparison score */
  score: number // 0-100
  /** Suggestions */
  suggestions: string[]
}

export interface MergedRecommendations {
  /** Merged skills */
  skills: Recommendation[]
  /** Merged MCP services */
  mcpServices: Recommendation[]
  /** Merged agents */
  agents: Recommendation[]
  /** Merged hooks */
  hooks: Recommendation[]
  /** Source (cloud/local) */
  source: 'cloud' | 'local'
  /** Confidence score */
  confidence: number
}

// ============================================================================
// Cloud Setup Orchestrator
// ============================================================================

export class CloudSetupOrchestrator {
  private cloudClient: FallbackCloudClient
  private logger = consola.withTag('cloud-setup')
  private startTime = Date.now()

  constructor(options: CloudSetupOptions = {}) {
    this.cloudClient = createCompleteCloudClient({
      endpoint: options.cloudEndpoint,
      cacheEnabled: options.cacheStrategy !== 'disabled',
      language: options.lang,
    })
  }

  /**
   * Execute cloud-powered setup
   */
  async executeCloudSetup(options: CloudSetupOptions): Promise<CloudSetupResult> {
    this.logger.info('Starting cloud-powered setup')

    try {
      // Step 1: Analyze project
      const analysis = await this.analyzeProject(options)

      // Step 2: Get cloud recommendations
      const recommendations = await this.getCloudRecommendations(analysis, options)

      // Step 3: Display recommendations with insights
      if (options.interactive !== false) {
        await this.displayRecommendationInsights(recommendations, options)
      }

      // Step 4: Get user confirmation
      const confirmed = await this.getUserConfirmation(recommendations, options)
      if (!confirmed) {
        return {
          success: false,
          requestId: recommendations.insights ? 'user-cancelled' : 'no-recommendations',
          confidence: recommendations.confidence || 0,
          installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
          skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
          failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
          duration: Date.now() - this.startTime,
        }
      }

      // Step 5: Batch download templates
      const templates = await this.downloadTemplates(recommendations, options)

      // Step 6: Execute installation (parallel)
      const result = await this.executeInstallation(recommendations, templates, options)

      // Step 7: Upload telemetry
      if (options.submitTelemetry !== false) {
        await this.uploadTelemetry(result)
      }

      // Step 8: Generate report
      if (options.generateReport) {
        result.reportPath = await this.generateReport(result, recommendations, options)
      }

      return result
    }
    catch (error) {
      this.logger.error('Cloud setup failed:', error)
      throw error
    }
  }

  /**
   * Analyze project with deep inspection
   */
  private async analyzeProject(options: CloudSetupOptions): Promise<ProjectAnalysis> {
    if (options.interactive !== false) {
      console.log(ansis.bold(`\n  ${i18n.t('cloud-setup:analyzingProject')}`))
    }

    const analysis = await analyzeProject(options.targetDir || process.cwd(), {
      analyzeTransitiveDeps: true,
      // Use default maxFilesToScan of 10000 for better large project support
      analyzeGitHistory: true,
      analyzeTeamMetrics: true,
    })

    // Generate project fingerprint
    const fingerprint = this.generateProjectFingerprint(analysis)
    analysis.fingerprint = fingerprint

    if (options.interactive !== false) {
      this.displayProjectInfo(analysis)
    }

    return analysis
  }

  /**
   * Generate project fingerprint
   */
  private generateProjectFingerprint(analysis: ProjectAnalysis): string {
    const hash = createHash('sha256')

    // Hash key project characteristics - ensure all values are strings
    const directDeps = analysis.dependencies?.direct || []
    const depNames = directDeps.map(d => d.name).join(',')
    const devDepNames = directDeps.filter(d => d.isDev).map(d => d.name).join(',')
    const frameworkNames = analysis.frameworks?.map(f => f.name).join(',') || ''
    const languageNames = analysis.languages?.map(l => l.language).join(',') || ''

    hash.update(depNames)
    hash.update(devDepNames)
    hash.update(analysis.projectType || '')
    hash.update(frameworkNames)
    hash.update(languageNames)

    return hash.digest('hex')
  }

  /**
   * Display project information
   */
  private displayProjectInfo(analysis: ProjectAnalysis): void {
    console.log(`    ${ansis.dim(i18n.t('cloud-setup:projectFingerprint'))}: ${analysis.fingerprint?.substring(0, 8)}...`)
    console.log(`    ${ansis.dim(i18n.t('cloud-setup:projectType'))}: ${analysis.projectType}`)

    if (analysis.frameworks.length > 0) {
      console.log(`    ${ansis.dim(i18n.t('cloud-setup:frameworks'))}: ${analysis.frameworks.map(f => f.name).join(', ')}`)
    }

    if (analysis.languages.length > 0) {
      console.log(`    ${ansis.dim(i18n.t('cloud-setup:languages'))}: ${analysis.languages.map(l => l.language).join(', ')}`)
    }

    if (analysis.teamMetrics) {
      console.log(`    ${ansis.dim(i18n.t('cloud-setup:teamSize'))}: ${analysis.teamMetrics.contributors} contributors`)
    }
  }

  /**
   * Get recommendations from cloud
   */
  private async getCloudRecommendations(
    analysis: ProjectAnalysis,
    options: CloudSetupOptions
  ): Promise<CloudRecommendations> {
    if (options.useCloud === false) {
      return this.getLocalRecommendations(analysis)
    }

    if (options.interactive !== false) {
      console.log(`\n  ${ansis.bold(i18n.t('cloud-setup:gettingRecommendations'))}`)
    }

    // Prepare request - convert DependencyAnalysis to Record<string, string>
    const request: ProjectAnalysisRequest = {
      projectRoot: options.targetDir || process.cwd(),
      language: options.lang,
      ccjkVersion: CCJK_VERSION,
    }

    // Add dependencies if available
    if (analysis.dependencies?.direct && analysis.dependencies.direct.length > 0) {
      const deps: Record<string, string> = {}
      const devDeps: Record<string, string> = {}

      for (const dep of analysis.dependencies.direct) {
        if (dep.isDev) {
          devDeps[dep.name] = dep.version || '*'
        } else {
          deps[dep.name] = dep.version || '*'
        }
      }

      // Only add if non-empty
      if (Object.keys(deps).length > 0) {
        request.dependencies = deps
      }
      if (Object.keys(devDeps).length > 0) {
        request.devDependencies = devDeps
      }
    }

    // Add git remote if available
    if (analysis.gitRemote) {
      request.gitRemote = analysis.gitRemote
    }

    try {
      const response = await this.cloudClient.analyzeProject(request)

      // Categorize recommendations
      const recommendations: CloudRecommendations = {
        skills: response.recommendations.filter(r => r.category === 'workflow'),
        mcpServices: response.recommendations.filter(r => r.category === 'mcp'),
        agents: response.recommendations.filter(r => r.category === 'agent'),
        hooks: response.recommendations.filter(r => r.category === 'tool'),
        confidence: this.calculateConfidence(response.recommendations),
        fingerprint: analysis.fingerprint || '',
        insights: this.extractInsights(response),
      }

      return recommendations
    }
    catch (error) {
      this.logger.warn('Failed to get cloud recommendations, using local fallback')
      return this.getLocalRecommendations(analysis)
    }
  }

  /**
   * Get local fallback recommendations
   */
  private getLocalRecommendations(analysis: ProjectAnalysis): CloudRecommendations {
    const recommendations: Recommendation[] = []

    // TypeScript projects
    if (analysis.devDependencies?.typescript) {
      recommendations.push({
        id: 'ts-best-practices',
        name: { en: 'TypeScript Best Practices', 'zh-CN': 'TypeScript 最佳实践' },
        description: { en: 'Essential for TypeScript 5.3+ strict mode', 'zh-CN': 'TypeScript 5.3+ 严格模式必备' },
        category: 'workflow',
        relevanceScore: 0.98,
        tags: ['typescript', 'type-checking'],
      })
    }

    // React projects
    if (analysis.dependencies?.react) {
      recommendations.push({
        id: 'react-design-patterns',
        name: { en: 'React Design Patterns', 'zh-CN': 'React 设计模式' },
        description: { en: 'React 18+ hooks and composition', 'zh-CN': 'React 18+ Hooks 和组合' },
        category: 'workflow',
        relevanceScore: 0.95,
        tags: ['react', 'hooks', 'frontend'],
      })
    }

    // Next.js projects
    if (analysis.dependencies?.next) {
      recommendations.push({
        id: 'nextjs-optimization',
        name: { en: 'Next.js Optimization', 'zh-CN': 'Next.js 优化' },
        description: { en: 'App router and server components', 'zh-CN': 'App Router 和服务器组件' },
        category: 'workflow',
        relevanceScore: 0.92,
        tags: ['nextjs', 'ssr', 'performance'],
      })
    }

    // Node.js projects
    if (analysis.dependencies?.express || analysis.dependencies?.fastify) {
      recommendations.push({
        id: 'nodejs-workflow',
        name: { en: 'Node.js Workflow', 'zh-CN': 'Node.js 工作流' },
        description: { en: 'Node.js development tools', 'zh-CN': 'Node.js 开发工具' },
        category: 'workflow',
        relevanceScore: 0.90,
        tags: ['nodejs', 'backend'],
      })
    }

    return {
      skills: recommendations.filter(r => r.category === 'workflow'),
      mcpServices: [],
      agents: [],
      hooks: [],
      confidence: 0.7,
      fingerprint: analysis.fingerprint || '',
      insights: {
        insights: [i18n.t('cloud-setup:localFallbackUsed')],
        productivityImprovements: [],
        nextRecommendations: [],
      },
    }
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(recommendations: Recommendation[]): number {
    if (recommendations.length === 0) return 0

    const avgScore = recommendations.reduce((sum, r) => sum + r.relevanceScore, 0) / recommendations.length
    return Math.round(avgScore * 100)
  }

  /**
   * Extract insights from response
   */
  private extractInsights(response: ProjectAnalysisResponse): CloudInsights {
    return {
      insights: [
        i18n.t('cloud-setup:cloudRecommendationsGenerated'),
      ],
      productivityImprovements: [],
      nextRecommendations: [],
      communityStats: {
        similarProjects: 0,
        topInstallations: [],
      },
    }
  }

  /**
   * Display recommendation insights
   */
  private async displayRecommendationInsights(
    recommendations: CloudRecommendations,
    options: CloudSetupOptions
  ): Promise<void> {
    if (options.interactive === false) return

    console.log(`\n  ${ansis.bold(i18n.t('cloud-setup:cloudRecommendations'))} ${ansis.dim(`(${i18n.t('cloud-setup:confidence')} ${recommendations.confidence}%)`)}`)
    console.log('')

    // Display skills
    if (recommendations.skills.length > 0) {
      console.log(`  ${ansis.bold(i18n.t('cloud-setup:skills'))} (${recommendations.skills.length}):`)
      for (const skill of recommendations.skills) {
        const confidence = options.showConfidence ? ` [${Math.round(skill.relevanceScore * 100)}%]` : ''
        const skillName = extractString(skill.name, skill.id, i18n.language as SupportedLang)
        const skillDesc = extractString(skill.description, '', i18n.language as SupportedLang)
        const reason = options.showRecommendationReason && skillDesc ? ` - ${skillDesc}` : ''
        console.log(`    ${ansis.green('✓')} ${skillName}${ansis.dim(confidence)}${ansis.dim(reason)}`)
      }
    }

    // Display MCP services
    if (recommendations.mcpServices.length > 0) {
      console.log(`\n  ${ansis.bold(i18n.t('cloud-setup:mcpServices'))} (${recommendations.mcpServices.length}):`)
      for (const service of recommendations.mcpServices) {
        const confidence = options.showConfidence ? ` [${Math.round(service.relevanceScore * 100)}%]` : ''
        const serviceName = extractString(service.name, service.id, i18n.language as SupportedLang)
        const serviceDesc = extractString(service.description, '', i18n.language as SupportedLang)
        const reason = options.showRecommendationReason && serviceDesc ? ` - ${serviceDesc}` : ''
        console.log(`    ${ansis.green('✓')} ${serviceName}${ansis.dim(confidence)}${ansis.dim(reason)}`)
      }
    }

    // Display agents
    if (recommendations.agents.length > 0) {
      console.log(`\n  ${ansis.bold(i18n.t('cloud-setup:agents'))} (${recommendations.agents.length}):`)
      for (const agent of recommendations.agents) {
        const confidence = options.showConfidence ? ` [${Math.round(agent.relevanceScore * 100)}%]` : ''
        const agentName = extractString(agent.name, agent.id, i18n.language as SupportedLang)
        const agentDesc = extractString(agent.description, '', i18n.language as SupportedLang)
        const reason = options.showRecommendationReason && agentDesc ? ` - ${agentDesc}` : ''
        console.log(`    ${ansis.green('✓')} ${agentName}${ansis.dim(confidence)}${ansis.dim(reason)}`)
      }
    }

    // Display hooks
    if (recommendations.hooks.length > 0) {
      console.log(`\n  ${ansis.bold(i18n.t('cloud-setup:hooks'))} (${recommendations.hooks.length}):`)
      for (const hook of recommendations.hooks) {
        const confidence = options.showConfidence ? ` [${Math.round(hook.relevanceScore * 100)}%]` : ''
        const hookName = extractString(hook.name, hook.id, i18n.language as SupportedLang)
        const hookDesc = extractString(hook.description, '', i18n.language as SupportedLang)
        const reason = options.showRecommendationReason && hookDesc ? ` - ${hookDesc}` : ''
        console.log(`    ${ansis.green('✓')} ${hookName}${ansis.dim(confidence)}${ansis.dim(reason)}`)
      }
    }

    // Display insights
    if (recommendations.insights?.insights && recommendations.insights.insights.length > 0) {
      console.log(`\n  ${ansis.bold(i18n.t('cloud-setup:insights'))}:`)
      for (const insight of recommendations.insights.insights) {
        console.log(`    ${ansis.cyan('💡')} ${insight}`)
      }
    }

    // Display productivity improvements
    if (recommendations.insights?.productivityImprovements && recommendations.insights.productivityImprovements.length > 0) {
      console.log(`\n  ${ansis.bold(i18n.t('cloud-setup:productivityImprovements'))}:`)
      for (const improvement of recommendations.insights.productivityImprovements) {
        console.log(`    ${ansis.green('↑')} ${improvement.resource}: +${improvement.improvement}% ${improvement.reason}`)
      }
    }
  }

  /**
   * Get user confirmation
   */
  private async getUserConfirmation(
    recommendations: CloudRecommendations,
    options: CloudSetupOptions
  ): Promise<boolean> {
    if (options.interactive === false) return true

    const totalResources = recommendations.skills.length +
      recommendations.mcpServices.length +
      recommendations.agents.length +
      recommendations.hooks.length

    if (totalResources === 0) {
      console.log(`\n  ${ansis.yellow(i18n.t('cloud-setup:noRecommendations'))}`)
      return false
    }

    try {
      // Dynamic import of inquirer
      const inquirerModule = await import('inquirer')
      const inquirer = inquirerModule.default || inquirerModule

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: i18n.t('cloud-setup:installResources', { count: totalResources }),
          default: true,
        },
      ])

      return confirm
    }
    catch (error) {
      this.logger.error('Failed to prompt user:', error)
      // Fallback to true if inquirer fails
      return true
    }
  }

  /**
   * Download templates in batch
   */
  private async downloadTemplates(
    recommendations: CloudRecommendations,
    options: CloudSetupOptions
  ): Promise<BatchTemplateResponse> {
    if (options.interactive !== false) {
      console.log(`\n  ${ansis.bold(i18n.t('cloud-setup:downloadingTemplates'))}`)
    }

    const allRecommendations = [
      ...recommendations.skills,
      ...recommendations.mcpServices,
      ...recommendations.agents,
      ...recommendations.hooks,
    ]

    const templateIds = allRecommendations.map(r => r.id)

    try {
      const response = await this.cloudClient.getBatchTemplates({
        ids: templateIds,
        language: options.lang,
      })

      if (options.interactive !== false) {
        console.log(`    ${ansis.green('✓')} ${i18n.t('cloud-setup:templatesDownloaded', { count: Object.keys(response.templates).length })}`)
      }

      return response
    }
    catch (error) {
      this.logger.error('Failed to download templates:', error)
      throw error
    }
  }

  /**
   * Execute installation in parallel
   */
  private async executeInstallation(
    recommendations: CloudRecommendations,
    templates: BatchTemplateResponse,
    options: CloudSetupOptions
  ): Promise<CloudSetupResult> {
    if (options.interactive !== false) {
      console.log(`\n  ${ansis.bold(i18n.t('cloud-setup:installingResources'))}`)
    }

    const result: CloudSetupResult = {
      success: true,
      requestId: 'local-execution',
      confidence: recommendations.confidence,
      installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
      skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
      failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
      duration: 0,
      insights: recommendations.insights,
    }

    // Install skills
    if (recommendations.skills.length > 0) {
      await this.installSkills(recommendations.skills, result, options)
    }

    // Install MCP services
    if (recommendations.mcpServices.length > 0) {
      await this.installMcpServices(recommendations.mcpServices, result, options)
    }

    // Install agents
    if (recommendations.agents.length > 0) {
      await this.installAgents(recommendations.agents, result, options)
    }

    // Install hooks
    if (recommendations.hooks.length > 0) {
      await this.installHooks(recommendations.hooks, result, options)
    }

    // Calculate duration (ensure at least 1ms for successful execution)
    result.duration = Math.max(Date.now() - this.startTime, 1)

    // Display summary
    if (options.interactive !== false) {
      this.displaySummary(result, options)
    }

    return result
  }

  /**
   * Install skills
   */
  private async installSkills(
    skills: Recommendation[],
    result: CloudSetupResult,
    options: CloudSetupOptions
  ): Promise<void> {
    if (options.interactive !== false) {
      console.log(`\n  [1/4] ${i18n.t('cloud-setup:installingSkills')}...`)
    }

    const skillsOptions: CcjkSkillsOptions = {
      lang: options.lang,
      interactive: false,
      dryRun: options.dryRun,
      force: options.force,
      targetDir: options.targetDir,
    }

    try {
      // Filter skills by ID
      const skillIds = skills.map(s => s.id)
      process.env.CCJK_SELECTED_SKILLS = JSON.stringify(skillIds)

      await ccjkSkills(skillsOptions)

      result.installed.skills = skillIds

      if (options.interactive !== false) {
        console.log(`    ${ansis.green('✓')} ${skills.length}/${skills.length} (${((Date.now() - this.startTime) / 1000).toFixed(1)}s)`)
      }
    }
    catch (error) {
      this.logger.error('Skills installation failed:', error)
      result.failed.skills = skills.map(s => ({ id: s.id, error: String(error) }))
    }
  }

  /**
   * Install MCP services
   */
  private async installMcpServices(
    services: Recommendation[],
    result: CloudSetupResult,
    options: CloudSetupOptions
  ): Promise<void> {
    if (options.interactive !== false) {
      console.log(`\n  [2/4] ${i18n.t('cloud-setup:configuringMcpServices')}...`)
    }

    const mcpOptions: CcjkMcpOptions = {
      interactive: false,
      services: services.map(s => s.id),
      dryRun: options.dryRun,
      force: options.force,
      lang: options.lang,
    }

    try {
      await ccjkMcp(mcpOptions)
      result.installed.mcpServices = services.map(s => s.id)

      if (options.interactive !== false) {
        console.log(`    ${ansis.green('✓')} ${services.length}/${services.length} (${((Date.now() - this.startTime) / 1000).toFixed(1)}s)`)
      }
    }
    catch (error) {
      this.logger.error('MCP services installation failed:', error)
      result.failed.mcpServices = services.map(s => ({ id: s.id, error: String(error) }))
    }
  }

  /**
   * Install agents
   */
  private async installAgents(
    agents: Recommendation[],
    result: CloudSetupResult,
    options: CloudSetupOptions
  ): Promise<void> {
    if (options.interactive !== false) {
      console.log(`\n  [3/4] ${i18n.t('cloud-setup:creatingAgents')}...`)
    }

    const agentOptions: CcjkAgentsOptions = {
      lang: options.lang,
      interactive: false,
      agents: agents.map(a => a.id),
      dryRun: options.dryRun,
      force: options.force,
    }

    try {
      await ccjkAgents(agentOptions)
      result.installed.agents = agents.map(a => a.id)

      if (options.interactive !== false) {
        console.log(`    ${ansis.green('✓')} ${agents.length}/${agents.length} (${((Date.now() - this.startTime) / 1000).toFixed(1)}s)`)
      }
    }
    catch (error) {
      this.logger.error('Agents installation failed:', error)
      result.failed.agents = agents.map(a => ({ id: a.id, error: String(error) }))
    }
  }

  /**
   * Install hooks
   */
  private async installHooks(
    hooks: Recommendation[],
    result: CloudSetupResult,
    options: CloudSetupOptions
  ): Promise<void> {
    if (options.interactive !== false) {
      console.log(`\n  [4/4] ${i18n.t('cloud-setup:settingUpHooks')}...`)
    }

    const hookOptions: CcjkHooksOptions = {
      lang: options.lang,
      interactive: false,
      hooks: hooks.map(h => h.id),
      dryRun: options.dryRun,
      force: options.force,
    }

    try {
      await ccjkHooks(hookOptions)
      result.installed.hooks = hooks.map(h => h.id)

      if (options.interactive !== false) {
        console.log(`    ${ansis.green('✓')} ${hooks.length}/${hooks.length} (${((Date.now() - this.startTime) / 1000).toFixed(1)}s)`)
      }
    }
    catch (error) {
      this.logger.error('Hooks installation failed:', error)
      result.failed.hooks = hooks.map(h => ({ id: h.id, error: String(error) }))
    }
  }

  /**
   * Display summary
   */
  private displaySummary(result: CloudSetupResult, options: CloudSetupOptions): void {
    console.log('')
    console.log(ansis.green(`  ${i18n.t('cloud-setup:setupComplete')}`))

    const totalInstalled =
      result.installed.skills.length +
      result.installed.mcpServices.length +
      result.installed.agents.length +
      result.installed.hooks.length

    console.log(`  ${i18n.t('cloud-setup:installedResources', { count: totalInstalled, duration: (result.duration / 1000).toFixed(1) })}`)

    // Display cloud feedback
    if (result.insights) {
      console.log(`\n  ${ansis.bold(i18n.t('cloud-setup:cloudFeedback'))}`)
      for (const insight of result.insights.insights) {
        console.log(`    ${ansis.cyan('•')} ${insight}`)
      }
    }

    // Display next steps
    console.log(`\n  ${ansis.bold(i18n.t('cloud-setup:nextSteps'))}`)
    console.log(`    ${ansis.dim('•')} ${i18n.t('cloud-setup:startCoding')}`)
    if (options.showRecommendationReason) {
      console.log(`    ${ansis.dim('•')} ${i18n.t('cloud-setup:viewRecommendations')}`)
    }
    console.log(`    ${ansis.dim('•')} ${i18n.t('cloud-setup:customizeSetup')}`)

    if (result.reportPath) {
      console.log(`\n  ${ansis.dim(i18n.t('cloud-setup:reportGenerated', { path: result.reportPath }))}`)
    }
  }

  /**
   * Upload telemetry
   */
  private async uploadTelemetry(result: CloudSetupResult): Promise<void> {
    try {
      const telemetry = {
        requestId: result.requestId,
        installation: {
          timestamp: Date.now(),
          duration: result.duration,
          selectedResources: [
            ...result.installed.skills.map(id => ({ id, type: 'skill', version: '1.0.0' })),
            ...result.installed.mcpServices.map(id => ({ id, type: 'mcp', version: '1.0.0' })),
            ...result.installed.agents.map(id => ({ id, type: 'agent', version: '1.0.0' })),
            ...result.installed.hooks.map(id => ({ id, type: 'hook', version: '1.0.0' })),
          ],
          skippedResources: [
            ...result.skipped.skills,
            ...result.skipped.mcpServices,
            ...result.skipped.agents,
            ...result.skipped.hooks,
          ],
          failedResources: [
            ...result.failed.skills,
            ...result.failed.mcpServices,
            ...result.failed.agents,
            ...result.failed.hooks,
          ],
        },
        clientInfo: {
          ccjkVersion: CCJK_VERSION,
          os: process.platform,
          nodeVersion: process.version,
        },
        performance: {
          networkLatency: 0,
          cacheHit: false,
          retryCount: 0,
        },
      }

      await this.cloudClient.reportUsage(telemetry)
      this.logger.info('Telemetry uploaded successfully')
    }
    catch (error) {
      this.logger.warn('Failed to upload telemetry:', error)
      // Non-critical, continue
    }
  }

  /**
   * Generate cloud insights report
   */
  private async generateReport(
    result: CloudSetupResult,
    recommendations: CloudRecommendations,
    options: CloudSetupOptions
  ): Promise<string> {
    const reportPath = join(
      process.cwd(),
      `ccjk-setup-report-${new Date().toISOString().replace(/[:.]/g, '-')}.${options.reportFormat || 'md'}`
    )

    let content = ''

    if (options.reportFormat === 'json') {
      content = JSON.stringify({
        timestamp: new Date().toISOString(),
        result,
        recommendations,
        options,
      }, null, 2)
    }
    else {
      // Markdown format
      content = `# CCJK Setup Report (Cloud-Enhanced)\n\n`
      content += `**Date**: ${new Date().toLocaleString()}\n`
      content += `**Strategy**: ${options.strategy || 'cloud-smart'}\n`
      content += `**Cloud Confidence**: ${result.confidence}%\n`
      content += `**Duration**: ${(result.duration / 1000).toFixed(1)}s\n\n`

      content += `## Installed Resources (${Object.values(result.installed).flat().length})\n\n`

      if (result.installed.skills.length > 0) {
        content += `### Skills (${result.installed.skills.length})\n`
        for (const skill of result.installed.skills) {
          content += `- ${skill}\n`
        }
        content += '\n'
      }

      if (result.installed.mcpServices.length > 0) {
        content += `### MCP Services (${result.installed.mcpServices.length})\n`
        for (const service of result.installed.mcpServices) {
          content += `- ${service}\n`
        }
        content += '\n'
      }

      if (result.installed.agents.length > 0) {
        content += `### Agents (${result.installed.agents.length})\n`
        for (const agent of result.installed.agents) {
          content += `- ${agent}\n`
        }
        content += '\n'
      }

      if (result.installed.hooks.length > 0) {
        content += `### Hooks (${result.installed.hooks.length})\n`
        for (const hook of result.installed.hooks) {
          content += `- ${hook}\n`
        }
        content += '\n'
      }

      if (result.insights?.nextRecommendations && result.insights.nextRecommendations.length > 0) {
        content += `## Next Recommendations\n\n`
        for (const rec of result.insights.nextRecommendations) {
          content += `- ${rec}\n`
        }
      }
    }

    await fs.writeFile(reportPath, content, 'utf-8')
    return reportPath
  }

  /**
   * Execute with fallback
   */
  async executeWithFallback(options: CloudSetupOptions): Promise<CloudSetupResult> {
    try {
      // Try cloud first
      return await this.executeCloudSetup(options)
    }
    catch (error: any) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.warn(ansis.yellow(`\n  ${i18n.t('cloud-setup:cloudUnavailable')}`))
        console.warn(`  ${i18n.t('cloud-setup:fallingBackToLocal')}`)

        // Fall back to local setup
        options.useCloud = false
        return await this.executeCloudSetup(options)
      }
      throw error
    }
  }
}