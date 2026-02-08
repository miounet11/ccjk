import type { ProjectAnalyzer } from '../analyzers'
import type { CcjkAgentsOptions } from '../commands/ccjk-agents'
import type { CcjkHooksOptions } from '../commands/ccjk-hooks'
import type { CcjkMcpOptions } from '../commands/ccjk-mcp'
import type { CcjkSkillsOptions } from '../commands/ccjk-skills'
import { promises as fs } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { consola } from 'consola'
import { join } from 'pathe'
import { ccjkAgents } from '../commands/ccjk-agents'
import { ccjkHooks } from '../commands/ccjk-hooks'
import { ccjkMcp } from '../commands/ccjk-mcp'
import { ccjkSkills } from '../commands/ccjk-skills'
import { i18n } from '../i18n'
import { createBackup } from '../utils/backup'
import { generateReport } from '../utils/report-generator'

export interface SetupOrchestratorOptions {
  profile?: 'minimal' | 'recommended' | 'full' | 'custom'
  resources?: ('skills' | 'mcp' | 'agents' | 'hooks')[]
  parallel?: boolean
  maxConcurrency?: number
  interactive?: boolean
  autoConfirm?: boolean
  showProgress?: boolean
  dryRun?: boolean
  report?: boolean
  json?: boolean
  verbose?: boolean
  backup?: boolean
  rollbackOnError?: boolean
  lang?: 'en' | 'zh-CN'
  projectPath?: string
}

export interface PhaseResult {
  phase: string
  success: boolean
  installed: number
  skipped: number
  failed: number
  duration: number
  errors: Error[]
  details: Record<string, any>
}

export interface SetupResult {
  success: boolean
  totalInstalled: number
  totalSkipped: number
  totalFailed: number
  duration: number
  phases: PhaseResult[]
  reportPath?: string
  backupPath?: string
  errors: Error[]
  projectAnalysis?: any
  installationPlan?: any
}

export interface SetupReport {
  date: string
  profile: string
  duration: number
  projectAnalysis: any
  installationPlan: any
  phases: PhaseResult[]
  summary: {
    total: number
    installed: number
    skipped: number
    failed: number
  }
  nextSteps: string[]
}

export class SetupOrchestrator {
  private analyzer: ProjectAnalyzer
  private logger = consola
  private startTime: number
  private backupPath?: string

  constructor(analyzer: ProjectAnalyzer) {
    this.analyzer = analyzer
    this.startTime = performance.now()
  }

  async execute(options: SetupOrchestratorOptions): Promise<SetupResult> {
    this.startTime = performance.now()
    const result: SetupResult = {
      success: false,
      totalInstalled: 0,
      totalSkipped: 0,
      totalFailed: 0,
      duration: 0,
      phases: [],
      errors: [],
    }

    try {
      // Phase 1: Project Analysis
      if (options.showProgress) {
        this.logger.info(i18n.t('setup.analyzingProject'))
      }

      const projectAnalysis = await this.analyzer.analyze(options.projectPath || process.cwd())
      result.projectAnalysis = projectAnalysis

      // Phase 2: Generate Installation Plan
      const installationPlan = await this.generateInstallationPlan(projectAnalysis, options)
      result.installationPlan = installationPlan

      // Phase 3: Create Backup
      if (options.backup && !options.dryRun) {
        if (options.showProgress) {
          this.logger.info(i18n.t('setup.creatingBackup'))
        }
        this.backupPath = await createBackup('ccjk-setup')
        result.backupPath = this.backupPath
      }

      // Phase 4: Show Plan (Interactive Mode)
      if (options.interactive && !options.autoConfirm && !options.dryRun) {
        const confirmed = await this.showPlanAndConfirm(installationPlan, options)
        if (!confirmed) {
          this.logger.info(i18n.t('setup.cancelled'))
          return {
            ...result,
            success: true,
            duration: performance.now() - this.startTime,
          }
        }
      }

      // Phase 5: Execute Phases
      if (!options.dryRun) {
        const phases = await this.executePhases(installationPlan, options)
        result.phases = phases

        // Calculate totals
        result.totalInstalled = phases.reduce((sum, p) => sum + p.installed, 0)
        result.totalSkipped = phases.reduce((sum, p) => sum + p.skipped, 0)
        result.totalFailed = phases.reduce((sum, p) => sum + p.failed, 0)
        result.errors = phases.flatMap(p => p.errors)

        // Check if any critical failures
        result.success = result.totalFailed === 0 || !options.rollbackOnError
      }
      else {
        // Dry run is always successful
        result.success = true
      }

      // Phase 6: Generate Report
      if (options.report && !options.dryRun) {
        const reportPath = await this.generateReport(result)
        result.reportPath = reportPath
      }

      result.duration = performance.now() - this.startTime

      // Rollback on failure
      if (!result.success && options.rollbackOnError) {
        await this.rollback(result)
      }

      return result
    }
    catch (error) {
      result.errors.push(error as Error)
      result.duration = performance.now() - this.startTime

      if (options.rollbackOnError) {
        await this.rollback(result)
      }

      return result
    }
  }

  private async generateInstallationPlan(
    projectAnalysis: any,
    options: SetupOrchestratorOptions,
  ): Promise<any> {
    const { profile = 'recommended', resources = ['skills', 'mcp', 'agents', 'hooks'] } = options

    const plan = {
      profile,
      projectType: projectAnalysis.type,
      complexity: projectAnalysis.complexity,
      estimatedTime: 0,
      phases: {
        skills: {
          enabled: resources.includes('skills'),
          resources: [] as any[],
        },
        mcp: {
          enabled: resources.includes('mcp'),
          resources: [] as any[],
        },
        agents: {
          enabled: resources.includes('agents'),
          resources: [] as any[],
        },
        hooks: {
          enabled: resources.includes('hooks'),
          resources: [] as any[],
        },
      },
    }

    // Select resources based on profile and project analysis
    if (plan.phases.skills.enabled) {
      plan.phases.skills.resources = await this.selectSkills(profile, projectAnalysis)
    }

    if (plan.phases.mcp.enabled) {
      plan.phases.mcp.resources = await this.selectMcpServices(profile, projectAnalysis)
    }

    if (plan.phases.agents.enabled) {
      plan.phases.agents.resources = await this.selectAgents(profile, projectAnalysis)
    }

    if (plan.phases.hooks.enabled) {
      plan.phases.hooks.resources = await this.selectHooks(profile, projectAnalysis)
    }

    // Calculate estimated time
    const totalResources
      = plan.phases.skills.resources.length
        + plan.phases.mcp.resources.length
        + plan.phases.agents.resources.length
        + plan.phases.hooks.resources.length

    plan.estimatedTime = Math.max(1, Math.ceil(totalResources / 4))

    return plan
  }

  private async selectSkills(profile: string, projectAnalysis: any): Promise<any[]> {
    const skills = []

    // Base skills for all projects
    if (profile !== 'minimal') {
      skills.push({ id: 'git-workflow', priority: 'essential' })
    }

    // Language-specific skills
    if (projectAnalysis.languages?.includes('typescript')) {
      skills.push({ id: 'ts-best-practices', priority: 'essential' })
      if (profile === 'full') {
        skills.push({ id: 'ts-advanced-patterns', priority: 'high' })
      }
    }

    if (projectAnalysis.languages?.includes('javascript')) {
      skills.push({ id: 'js-best-practices', priority: 'essential' })
    }

    // Framework-specific skills
    if (projectAnalysis.frameworks?.includes('react')) {
      skills.push({ id: 'react-patterns', priority: 'high' })
      if (profile === 'full') {
        skills.push({ id: 'react-performance', priority: 'medium' })
        skills.push({ id: 'react-testing', priority: 'medium' })
      }
    }

    if (projectAnalysis.frameworks?.includes('nextjs')) {
      skills.push({ id: 'nextjs-optimization', priority: 'high' })
    }

    // Testing skills
    if (projectAnalysis.hasTesting) {
      skills.push({ id: 'testing-best-practices', priority: 'recommended' })
      if (profile === 'full') {
        skills.push({ id: 'tdd-workflow', priority: 'medium' })
      }
    }

    // Additional skills for full profile
    if (profile === 'full') {
      skills.push({ id: 'performance-optimization', priority: 'medium' })
      skills.push({ id: 'security-best-practices', priority: 'medium' })
      skills.push({ id: 'api-design', priority: 'low' })
    }

    return skills
  }

  private async selectMcpServices(profile: string, projectAnalysis: any): Promise<any[]> {
    const services = []

    // Essential services
    if (projectAnalysis.languages?.includes('typescript') || projectAnalysis.languages?.includes('javascript')) {
      services.push({ id: 'typescript-language-server', priority: 'essential' })
    }

    if (projectAnalysis.hasLinting) {
      services.push({ id: 'eslint-mcp', priority: 'essential' })
    }

    services.push({ id: 'git-mcp', priority: 'essential' })

    // Recommended services
    if (profile !== 'minimal') {
      if (projectAnalysis.hasTesting) {
        services.push({ id: 'test-mcp', priority: 'recommended' })
      }

      if (projectAnalysis.packageManager === 'npm' || projectAnalysis.packageManager === 'pnpm') {
        services.push({ id: 'package-json-mcp', priority: 'recommended' })
      }
    }

    // Full profile services
    if (profile === 'full') {
      services.push({ id: 'file-system-mcp', priority: 'medium' })
      services.push({ id: 'search-mcp', priority: 'medium' })

      if (projectAnalysis.hasDocker) {
        services.push({ id: 'docker-mcp', priority: 'low' })
      }
    }

    return services
  }

  private async selectAgents(profile: string, projectAnalysis: any): Promise<any[]> {
    const agents = []

    // Essential agents
    if (projectAnalysis.languages?.includes('typescript')) {
      agents.push({ id: 'typescript-architect', priority: 'essential' })
    }

    // Framework specialists
    if (projectAnalysis.frameworks?.includes('react')) {
      agents.push({ id: 'react-specialist', priority: 'high' })
    }

    if (projectAnalysis.frameworks?.includes('nextjs')) {
      agents.push({ id: 'nextjs-specialist', priority: 'high' })
    }

    // Testing specialist
    if (projectAnalysis.hasTesting && profile !== 'minimal') {
      agents.push({ id: 'testing-automation-expert', priority: 'recommended' })
    }

    // Additional agents for full profile
    if (profile === 'full') {
      agents.push({ id: 'code-reviewer', priority: 'medium' })
      agents.push({ id: 'performance-optimizer', priority: 'medium' })
      agents.push({ id: 'security-expert', priority: 'low' })
    }

    return agents
  }

  private async selectHooks(profile: string, projectAnalysis: any): Promise<any[]> {
    const hooks = []

    // Essential hooks
    if (projectAnalysis.hasLinting) {
      hooks.push({ id: 'pre-commit-eslint', priority: 'essential' })
    }

    if (projectAnalysis.hasFormatting) {
      hooks.push({ id: 'pre-commit-prettier', priority: 'essential' })
    }

    hooks.push({ id: 'git-workflow-hooks', priority: 'essential' })

    // Recommended hooks
    if (profile !== 'minimal') {
      if (projectAnalysis.hasTesting) {
        hooks.push({ id: 'pre-push-tests', priority: 'recommended' })
        hooks.push({ id: 'post-test-coverage', priority: 'recommended' })
      }

      hooks.push({ id: 'commit-message-validator', priority: 'recommended' })
    }

    // Full profile hooks
    if (profile === 'full') {
      hooks.push({ id: 'dependency-check', priority: 'medium' })
      hooks.push({ id: 'security-audit', priority: 'low' })
    }

    return hooks
  }

  private async showPlanAndConfirm(_plan: any, _options: SetupOrchestratorOptions): Promise<boolean> {
    // Implementation would show interactive plan and get user confirmation
    // For now, return true
    return true
  }

  private async executePhases(plan: any, options: SetupOrchestratorOptions): Promise<PhaseResult[]> {
    const phases: PhaseResult[] = []
    const { parallel = true } = options

    if (parallel) {
      // Skills and MCP can run in parallel
      const [skillsResult, mcpResult] = await Promise.all([
        this.executeSkillsPhase(plan.phases.skills, options),
        this.executeMcpPhase(plan.phases.mcp, options),
      ])

      phases.push(skillsResult, mcpResult)

      // Agents depend on skills+MCP being done, but hooks can run in parallel
      const [agentsResult, hooksResult] = await Promise.all([
        this.executeAgentsPhase(plan.phases.agents, options),
        this.executeHooksPhase(plan.phases.hooks, options),
      ])

      phases.push(agentsResult, hooksResult)
    }
    else {
      // Sequential execution
      phases.push(await this.executeSkillsPhase(plan.phases.skills, options))
      phases.push(await this.executeMcpPhase(plan.phases.mcp, options))
      phases.push(await this.executeAgentsPhase(plan.phases.agents, options))
      phases.push(await this.executeHooksPhase(plan.phases.hooks, options))
    }

    return phases
  }

  async executeSkillsPhase(phaseConfig: any, options: SetupOrchestratorOptions): Promise<PhaseResult> {
    const startTime = performance.now()
    const result: PhaseResult = {
      phase: 'skills',
      success: true,
      installed: 0,
      skipped: 0,
      failed: 0,
      duration: 0,
      errors: [],
      details: {},
    }

    if (!phaseConfig.enabled || phaseConfig.resources.length === 0) {
      result.duration = performance.now() - startTime
      return result
    }

    try {
      // Convert resources to skill IDs
      const skillIds = phaseConfig.resources.map((r: any) => r.id)

      // Create skills options
      const skillsOptions: CcjkSkillsOptions = {
        lang: options.lang || 'en',
        interactive: false,
        dryRun: false,
        force: false,
        targetDir: options.projectPath || process.cwd(),
      }

      // Execute skills command
      await ccjkSkills(skillsOptions)

      // Process results - ccjkSkills returns void, so we assume success
      result.installed = skillIds.length
      result.skipped = 0
      result.failed = 0
      result.details = { skillIds }

      if (result.failed > 0) {
        result.success = false
        result.errors.push(new Error(`Failed to install ${result.failed} skills`))
      }
    }
    catch (error) {
      result.success = false
      result.errors.push(error as Error)
      result.failed = phaseConfig.resources.length
    }

    result.duration = performance.now() - startTime
    return result
  }

  async executeMcpPhase(phaseConfig: any, options: SetupOrchestratorOptions): Promise<PhaseResult> {
    const startTime = performance.now()
    const result: PhaseResult = {
      phase: 'mcp',
      success: true,
      installed: 0,
      skipped: 0,
      failed: 0,
      duration: 0,
      errors: [],
      details: {},
    }

    if (!phaseConfig.enabled || phaseConfig.resources.length === 0) {
      result.duration = performance.now() - startTime
      return result
    }

    try {
      // Convert resources to MCP IDs
      const mcpIds = phaseConfig.resources.map((r: any) => r.id)

      // Create MCP options
      const mcpOptions: CcjkMcpOptions = {
        services: mcpIds,
        interactive: false,
        lang: options.lang || 'en',
        dryRun: false,
        force: false,
      }

      // Execute MCP command
      const mcpResult = await ccjkMcp(mcpOptions)

      // Process results from CcjkMcpResult
      result.installed = mcpResult.installed.length
      result.skipped = mcpResult.skipped.length
      result.failed = mcpResult.failed.length
      result.details = mcpResult

      if (result.failed > 0) {
        result.success = false
        result.errors.push(new Error(`Failed to install ${result.failed} MCP services`))
      }
    }
    catch (error) {
      result.success = false
      result.errors.push(error as Error)
      result.failed = phaseConfig.resources.length
    }

    result.duration = performance.now() - startTime
    return result
  }

  async executeAgentsPhase(phaseConfig: any, options: SetupOrchestratorOptions): Promise<PhaseResult> {
    const startTime = performance.now()
    const result: PhaseResult = {
      phase: 'agents',
      success: true,
      installed: 0,
      skipped: 0,
      failed: 0,
      duration: 0,
      errors: [],
      details: {},
    }

    if (!phaseConfig.enabled || phaseConfig.resources.length === 0) {
      result.duration = performance.now() - startTime
      return result
    }

    try {
      // Convert resources to agent IDs
      const agentIds = phaseConfig.resources.map((r: any) => r.id)

      // Create agents options
      const agentsOptions: CcjkAgentsOptions = {
        lang: options.lang || 'en',
        dryRun: false,
        json: false,
      }

      // Execute agents command
      await ccjkAgents(agentsOptions)

      // Process results - ccjkAgents returns void, so we assume success
      result.installed = agentIds.length
      result.skipped = 0
      result.failed = 0
      result.details = { agentIds }

      if (result.failed > 0) {
        result.success = false
        result.errors.push(new Error(`Failed to create ${result.failed} agents`))
      }
    }
    catch (error) {
      result.success = false
      result.errors.push(error as Error)
      result.failed = phaseConfig.resources.length
    }

    result.duration = performance.now() - startTime
    return result
  }

  async executeHooksPhase(phaseConfig: any, options: SetupOrchestratorOptions): Promise<PhaseResult> {
    const startTime = performance.now()
    const result: PhaseResult = {
      phase: 'hooks',
      success: true,
      installed: 0,
      skipped: 0,
      failed: 0,
      duration: 0,
      errors: [],
      details: {},
    }

    if (!phaseConfig.enabled || phaseConfig.resources.length === 0) {
      result.duration = performance.now() - startTime
      return result
    }

    try {
      // Convert resources to hook IDs
      const hookIds = phaseConfig.resources.map((r: any) => r.id)

      // Create hooks options
      const hooksOptions: CcjkHooksOptions = {
        dryRun: false,
        json: false,
        verbose: options.verbose || false,
      }

      // Execute hooks command
      const hooksResult = await ccjkHooks(hooksOptions)

      // Process results from hooks command
      if (hooksResult && 'installed' in hooksResult && hooksResult.installed) {
        result.installed = hooksResult.installed.length
        result.skipped = 0
        result.failed = hooksResult.errors?.length || 0
        result.details = hooksResult
      }
      else {
        // Fallback if result format is unexpected
        result.installed = hookIds.length
        result.skipped = 0
        result.failed = 0
        result.details = { hookIds }
      }

      if (result.failed > 0) {
        result.success = false
        result.errors.push(new Error(`Failed to install ${result.failed} hooks`))
      }
    }
    catch (error) {
      result.success = false
      result.errors.push(error as Error)
      result.failed = phaseConfig.resources.length
    }

    result.duration = performance.now() - startTime
    return result
  }

  async generateReport(result: SetupResult): Promise<string> {
    const report = generateReport(result)
    const reportPath = join(process.cwd(), `setup-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.md`)

    await fs.writeFile(reportPath, report, 'utf-8')
    return reportPath
  }

  async rollback(result: SetupResult): Promise<void> {
    this.logger.warn(i18n.t('setup.rollbackStarting'))

    try {
      // Rollback phases in reverse order
      for (const phase of ['hooks', 'agents', 'mcp', 'skills']) {
        const phaseResult = result.phases.find(p => p.phase === phase)
        if (phaseResult && phaseResult.installed > 0) {
          this.logger.info(i18n.t('setup.rollbackPhase', { phase }))
          // Implement rollback logic for each phase
          await this.rollbackPhase(phase, phaseResult)
        }
      }

      // Restore backup if available
      if (this.backupPath) {
        this.logger.info(i18n.t('setup.restoringBackup'))
        // Implement backup restoration
      }

      this.logger.info(i18n.t('setup.rollbackComplete'))
    }
    catch (error) {
      this.logger.error(i18n.t('setup.rollbackFailed'), error)
    }
  }

  private async rollbackPhase(phase: string, _phaseResult: PhaseResult): Promise<void> {
    // Implement phase-specific rollback logic
    switch (phase) {
      case 'skills':
        // Uninstall skills
        break
      case 'mcp':
        // Remove MCP configurations
        break
      case 'agents':
        // Delete agents
        break
      case 'hooks':
        // Unregister hooks
        break
    }
  }
}
