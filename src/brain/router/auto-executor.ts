/**
 * Auto Executor - Fully Automatic Execution Engine
 *
 * Automatically handles:
 * - Skill creation when needed
 * - Agent spawning when needed
 * - MCP tool selection when needed
 * - Task routing and execution
 *
 * Users don't need to do anything - the system handles everything.
 */

import type { AskUserAnswer, AskUserQuestion, AskUserQuestionHandler } from './ask-user-question'
import type { ExecutionTelemetry, ExecutionTelemetrySummary, TelemetryEvent } from './execution-telemetry'
import type { AnalyzedIntent, IntentType } from './intent-router'
import { EventEmitter } from 'node:events'
import { getGlobalConvoyManager } from '../convoy/convoy-manager'
import { getGlobalMayorAgent } from '../mayor/mayor-agent'
import { getGlobalMailboxManager } from '../messaging/persistent-mailbox'
import { getMetricsCollector } from '../metrics'
import { getGlobalStateManager } from '../persistence/git-backed-state'
import { promptUserQuestion } from './ask-user-question'
import { getGlobalExecutionTelemetry } from './execution-telemetry'
import { getGlobalIntentRouter } from './intent-router'

type ExecutionRoute = 'mayor' | 'plan' | 'feature' | 'direct'

interface RouteResult {
  route: ExecutionRoute
  intent: AnalyzedIntent
  shouldExecute: boolean
  message: string
}

interface RouteResolutionResult {
  route: ExecutionRoute
  intent: AnalyzedIntent
  elicitationAsked: boolean
  userSelectedRoute: boolean
}

interface IntentRouterLike {
  route(input: string): Promise<RouteResult>
}

interface McpToolProfile {
  tool: string
  keywords: string[]
  basePriority: number
  intentBoost?: Partial<Record<IntentType, number>>
}

const MCP_TOOL_PROFILES: McpToolProfile[] = [
  {
    tool: 'filesystem',
    keywords: ['file', 'directory', 'folder', 'workspace', 'path', 'read', 'write'],
    basePriority: 5,
    intentBoost: {
      feature: 2,
      refactor: 2,
      bug_fix: 2,
    },
  },
  {
    tool: 'github',
    keywords: ['github', 'repository', 'repo', 'pr', 'pull request', 'issue', 'commit'],
    basePriority: 4,
    intentBoost: {
      feature: 1,
      bug_fix: 1,
    },
  },
  {
    tool: 'web-search',
    keywords: ['search', 'research', 'web', 'documentation', 'docs', 'latest', 'reference'],
    basePriority: 3,
    intentBoost: {
      question: 2,
      plan: 1,
    },
  },
  {
    tool: 'context7',
    keywords: ['library', 'framework', 'package', 'sdk', 'api docs', 'best practice'],
    basePriority: 4,
    intentBoost: {
      feature: 2,
      plan: 2,
      question: 1,
    },
  },
  {
    tool: 'ide',
    keywords: ['diagnostic', 'error', 'lint', 'typecheck', 'compile', 'warning'],
    basePriority: 3,
    intentBoost: {
      bug_fix: 2,
      refactor: 1,
    },
  },
  {
    tool: 'playwright',
    keywords: ['browser', 'webpage', 'e2e', 'ui test', 'automation', 'screenshot'],
    basePriority: 2,
    intentBoost: {
      feature: 1,
      bug_fix: 1,
    },
  },
]

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean
  route: ExecutionRoute
  intent: AnalyzedIntent
  convoyId?: string
  agentsCreated: string[]
  skillsCreated: string[]
  mcpToolsUsed: string[]
  message: string
  insights?: ExecutionInsights
  details?: any
}

export interface ExecutionInsights {
  decisionProfile: 'automatic' | 'user_guided'
  routeDecision: {
    initial: ExecutionRoute
    final: ExecutionRoute
    elicitationAsked: boolean
    userSelectedRoute: boolean
  }
  mcpSelection: {
    selected: string[]
    candidates: string[]
    truncated: boolean
    reason: string
  }
  telemetry: {
    totalDurationMs: number
    eventCount: number
  }
}

/**
 * Auto executor configuration
 */
export interface AutoExecutorConfig {
  autoCreateSkills: boolean // Default: true
  autoCreateAgents: boolean // Default: true
  autoSelectMcp: boolean // Default: true
  enableElicitation: boolean // Default: true
  maxMcpTools: number // Default: 3
  askUserQuestion: AskUserQuestionHandler // Default: promptUserQuestion
  intentRouter: IntentRouterLike // Default: global intent router
  telemetry: ExecutionTelemetry // Default: global execution telemetry
  verbose: boolean // Default: false
}

/**
 * Skill requirement detection
 */
interface SkillRequirement {
  needed: boolean
  skillName: string
  skillType: 'code' | 'analysis' | 'integration' | 'deployment'
  reason: string
}

/**
 * Agent requirement detection
 */
interface AgentRequirement {
  needed: boolean
  agentType: 'architect' | 'specialist' | 'engineer' | 'devops'
  domain: string
  reason: string
}

/**
 * MCP tool requirement detection
 */
interface McpRequirement {
  needed: boolean
  tools: string[]
  reason: string
  candidates: string[]
}

/**
 * Auto Executor - Fully automatic execution with zero user intervention
 */
export class AutoExecutor extends EventEmitter {
  private config: Required<AutoExecutorConfig>
  private metricsCollector = getMetricsCollector()

  constructor(config: Partial<AutoExecutorConfig> = {}) {
    super()

    this.config = {
      autoCreateSkills: config.autoCreateSkills !== undefined ? config.autoCreateSkills : true,
      autoCreateAgents: config.autoCreateAgents !== undefined ? config.autoCreateAgents : true,
      autoSelectMcp: config.autoSelectMcp !== undefined ? config.autoSelectMcp : true,
      enableElicitation: config.enableElicitation !== undefined ? config.enableElicitation : true,
      maxMcpTools: config.maxMcpTools !== undefined ? Math.max(1, config.maxMcpTools) : 3,
      askUserQuestion: config.askUserQuestion || promptUserQuestion,
      intentRouter: config.intentRouter || getGlobalIntentRouter(),
      telemetry: config.telemetry || getGlobalExecutionTelemetry(),
      verbose: config.verbose !== undefined ? config.verbose : false,
    }
  }

  /**
   * Execute user request automatically
   */
  async execute(userInput: string): Promise<ExecutionResult> {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const startedAt = Date.now()

    this.emit('execution:started', { input: userInput })
    this.config.telemetry.record({
      executionId,
      phase: 'execution',
      action: 'start',
      success: true,
      metadata: {
        inputLength: userInput.length,
      },
    })

    try {
      // Step 1: Analyze intent
      const routeStart = Date.now()
      const routeResult = await this.config.intentRouter.route(userInput)
      this.config.telemetry.record({
        executionId,
        phase: 'intent',
        action: 'route',
        success: true,
        durationMs: Date.now() - routeStart,
        metadata: {
          initialRoute: routeResult.route,
          confidence: routeResult.intent.confidence,
          intentType: routeResult.intent.type,
          complexity: routeResult.intent.complexity,
        },
      })

      const elicitationResult = await this.resolveRouteWithElicitation(
        routeResult.route,
        routeResult.intent,
        executionId,
      )
      const route = elicitationResult.route
      const intent = elicitationResult.intent

      this.log(`Intent analyzed: ${intent.type} (${intent.complexity})`)
      this.log(`Suggested route: ${route}`)

      // Step 2: Detect requirements
      const skillDetectStart = Date.now()
      const skillReq = await this.detectSkillRequirement(userInput, intent)
      this.config.telemetry.record({
        executionId,
        phase: 'skill',
        action: 'detect',
        success: true,
        durationMs: Date.now() - skillDetectStart,
        metadata: {
          needed: skillReq.needed,
          reason: skillReq.reason,
        },
      })

      const agentDetectStart = Date.now()
      const agentReq = await this.detectAgentRequirement(userInput, intent)
      this.config.telemetry.record({
        executionId,
        phase: 'agent',
        action: 'detect',
        success: true,
        durationMs: Date.now() - agentDetectStart,
        metadata: {
          needed: agentReq.needed,
          reason: agentReq.reason,
        },
      })

      const mcpDetectStart = Date.now()
      const mcpReq = await this.detectMcpRequirement(userInput, intent)
      this.config.telemetry.record({
        executionId,
        phase: 'mcp',
        action: 'detect',
        success: true,
        durationMs: Date.now() - mcpDetectStart,
        metadata: {
          needed: mcpReq.needed,
          selectedTools: mcpReq.tools,
          candidates: mcpReq.candidates,
          reason: mcpReq.reason,
        },
      })

      const agentsCreated: string[] = []
      const skillsCreated: string[] = []
      const mcpToolsUsed: string[] = []

      // Step 3: Auto-create skills if needed
      if (this.config.autoCreateSkills && skillReq.needed) {
        this.log(`Auto-creating skill: ${skillReq.skillName}`)
        const skillCreateStart = Date.now()
        const skillId = await this.autoCreateSkill(skillReq)
        skillsCreated.push(skillId)
        this.config.telemetry.record({
          executionId,
          phase: 'skill',
          action: 'create',
          success: true,
          durationMs: Date.now() - skillCreateStart,
          metadata: {
            skillId,
            skillName: skillReq.skillName,
          },
        })
        this.emit('skill:created', { skillId, skillReq })
      }

      // Step 4: Auto-create agents if needed
      if (this.config.autoCreateAgents && agentReq.needed) {
        this.log(`Auto-creating agent: ${agentReq.domain}`)
        const agentCreateStart = Date.now()
        const agentId = await this.autoCreateAgent(agentReq)
        agentsCreated.push(agentId)
        this.config.telemetry.record({
          executionId,
          phase: 'agent',
          action: 'create',
          success: true,
          durationMs: Date.now() - agentCreateStart,
          metadata: {
            agentId,
            agentType: agentReq.agentType,
            domain: agentReq.domain,
          },
        })
        this.emit('agent:created', { agentId, agentReq })
      }

      // Step 5: Auto-select MCP tools if needed
      if (this.config.autoSelectMcp && mcpReq.needed) {
        this.log(`Auto-selecting MCP tools: ${mcpReq.tools.join(', ')}`)
        mcpToolsUsed.push(...mcpReq.tools)
        this.config.telemetry.record({
          executionId,
          phase: 'mcp',
          action: 'select',
          success: true,
          metadata: {
            tools: mcpReq.tools,
            candidates: mcpReq.candidates,
          },
        })
        this.emit('mcp:selected', { tools: mcpReq.tools, mcpReq })
      }

      // Step 6: Execute based on route
      let result: ExecutionResult
      const routeExecutionStart = Date.now()

      switch (route) {
        case 'mayor':
          result = await this.executeMayor(userInput, intent, agentsCreated, skillsCreated, mcpToolsUsed)
          break
        case 'plan':
          result = await this.executePlan(userInput, intent, agentsCreated, skillsCreated, mcpToolsUsed)
          break
        case 'feature':
          result = await this.executeFeature(userInput, intent, agentsCreated, skillsCreated, mcpToolsUsed)
          break
        case 'direct':
          result = await this.executeDirect(userInput, intent, agentsCreated, skillsCreated, mcpToolsUsed)
          break
        default:
          throw new Error(`Unknown route: ${route}`)
      }

      const routeDuration = Date.now() - routeExecutionStart
      this.config.telemetry.record({
        executionId,
        phase: 'route',
        action: route,
        success: true,
        durationMs: routeDuration,
        metadata: {
          intentType: intent.type,
          complexity: intent.complexity,
        },
      })

      const totalDuration = Date.now() - startedAt
      this.metricsCollector.recordResponseTime('auto-executor', totalDuration)
      this.metricsCollector.recordTaskCompletion('auto-executor', true, totalDuration)

      this.config.telemetry.record({
        executionId,
        phase: 'execution',
        action: 'complete',
        success: true,
        durationMs: totalDuration,
        metadata: {
          route,
          agentsCreated: agentsCreated.length,
          skillsCreated: skillsCreated.length,
          mcpToolsUsed: mcpToolsUsed.length,
        },
      })

      result.insights = this.buildExecutionInsights({
        initialRoute: routeResult.route,
        resolvedRoute: route,
        elicitationAsked: elicitationResult.elicitationAsked,
        userSelectedRoute: elicitationResult.userSelectedRoute,
        mcpReq,
        totalDurationMs: totalDuration,
        executionId,
      })

      this.emit('execution:completed', result)
      return result
    }
    catch (error) {
      const totalDuration = Date.now() - startedAt
      const errorMessage = this.getErrorMessage(error)

      this.metricsCollector.recordResponseTime('auto-executor', totalDuration)
      this.metricsCollector.recordTaskCompletion('auto-executor', false, totalDuration)
      this.metricsCollector.recordError('auto-executor', 'execution_error', errorMessage)

      this.config.telemetry.record({
        executionId,
        phase: 'execution',
        action: 'complete',
        success: false,
        durationMs: totalDuration,
        metadata: {
          error: errorMessage,
        },
      })

      this.emit('execution:failed', { error, input: userInput })
      throw error
    }
  }

  /**
   * Resolve route with optional structured elicitation.
   * This keeps model autonomy but lets users disambiguate complex intent.
   */
  private async resolveRouteWithElicitation(
    suggestedRoute: ExecutionRoute,
    intent: AnalyzedIntent,
    executionId: string,
  ): Promise<RouteResolutionResult> {
    if (!this.config.enableElicitation || !this.shouldAskRouteQuestion(intent)) {
      return {
        route: suggestedRoute,
        intent,
        elicitationAsked: false,
        userSelectedRoute: false,
      }
    }

    const question = this.buildRouteQuestion(suggestedRoute, intent)
    const askStart = Date.now()
    const answer = await this.config.askUserQuestion(question)

    this.config.telemetry.record({
      executionId,
      phase: 'elicitation',
      action: 'route-choice',
      success: true,
      durationMs: Date.now() - askStart,
      metadata: {
        asked: true,
        suggestedRoute,
        answered: Boolean(answer),
        selected: answer?.value,
      },
    })

    if (!answer) {
      return {
        route: suggestedRoute,
        intent,
        elicitationAsked: true,
        userSelectedRoute: false,
      }
    }

    return this.applyRouteAnswer(suggestedRoute, intent, answer)
  }

  private shouldAskRouteQuestion(intent: AnalyzedIntent): boolean {
    if (intent.complexity === 'trivial' || intent.complexity === 'simple') {
      return false
    }

    const lowConfidence = intent.confidence < 0.65
    const multiRouteIndicators = intent.requiresPlanning && intent.requiresMultipleAgents
    return lowConfidence || multiRouteIndicators
  }

  private buildRouteQuestion(
    suggestedRoute: ExecutionRoute,
    intent: AnalyzedIntent,
  ): AskUserQuestion {
    const routeLabels: Record<ExecutionRoute, string> = {
      direct: 'Direct execution',
      feature: 'Feature implementation',
      plan: 'Plan first',
      mayor: 'Multi-agent orchestration',
    }

    const options = [
      {
        value: suggestedRoute,
        label: `Use recommended: ${routeLabels[suggestedRoute]}`,
        description: `Best guess from intent analysis (confidence ${Math.round(intent.confidence * 100)}%)`,
      },
      {
        value: 'plan',
        label: routeLabels.plan,
        description: 'Start with architecture and implementation plan',
      },
      {
        value: 'feature',
        label: routeLabels.feature,
        description: 'Implement directly with focused feature workflow',
      },
      {
        value: 'direct',
        label: routeLabels.direct,
        description: 'Run quickly without extra orchestration',
      },
      {
        value: 'mayor',
        label: routeLabels.mayor,
        description: 'Use specialized agents for decomposition and coordination',
      },
    ].filter((option, index, arr) => arr.findIndex(x => x.value === option.value) === index)

    return {
      id: 'execution-route-choice',
      prompt: 'How should I execute this request?',
      options,
      defaultValue: suggestedRoute,
    }
  }

  private applyRouteAnswer(
    suggestedRoute: ExecutionRoute,
    intent: AnalyzedIntent,
    answer: AskUserAnswer,
  ): RouteResolutionResult {
    const selectedRoute = ['direct', 'feature', 'plan', 'mayor'].includes(answer.value)
      ? answer.value as ExecutionRoute
      : suggestedRoute

    if (selectedRoute === suggestedRoute) {
      return {
        route: suggestedRoute,
        intent,
        elicitationAsked: true,
        userSelectedRoute: false,
      }
    }

    return {
      route: selectedRoute,
      intent: {
        ...intent,
        suggestedRoute: selectedRoute,
        reasoning: `${intent.reasoning} • User selected route: ${selectedRoute}`,
      },
      elicitationAsked: true,
      userSelectedRoute: true,
    }
  }

  /**
   * Detect if a new skill is needed
   */
  private async detectSkillRequirement(input: string, intent: AnalyzedIntent): Promise<SkillRequirement> {
    const normalized = input.toLowerCase()

    // Check for specific technology/framework mentions
    const technologies = [
      { name: 'react', type: 'code' as const },
      { name: 'vue', type: 'code' as const },
      { name: 'angular', type: 'code' as const },
      { name: 'docker', type: 'deployment' as const },
      { name: 'kubernetes', type: 'deployment' as const },
      { name: 'graphql', type: 'integration' as const },
      { name: 'websocket', type: 'integration' as const },
      { name: 'oauth', type: 'integration' as const },
      { name: 'jwt', type: 'integration' as const },
    ]

    for (const tech of technologies) {
      if (normalized.includes(tech.name)) {
        return {
          needed: true,
          skillName: `${tech.name}-specialist`,
          skillType: tech.type,
          reason: `Detected ${tech.name} technology requirement`,
        }
      }
    }

    // Check for domain-specific requirements
    if (normalized.includes('authentication') || normalized.includes('auth')) {
      return {
        needed: true,
        skillName: 'authentication-specialist',
        skillType: 'integration',
        reason: 'Authentication system requires specialized skill',
      }
    }

    if (normalized.includes('database') || normalized.includes('sql')) {
      return {
        needed: true,
        skillName: 'database-specialist',
        skillType: 'code',
        reason: 'Database operations require specialized skill',
      }
    }

    if (normalized.includes('api') && normalized.includes('design')) {
      return {
        needed: true,
        skillName: 'api-architect',
        skillType: 'analysis',
        reason: 'API design requires architectural skill',
      }
    }

    // For complex tasks, might need a custom skill
    if (intent.complexity === 'very_complex' || intent.complexity === 'complex') {
      return {
        needed: true,
        skillName: `custom-${intent.type}-specialist`,
        skillType: 'code',
        reason: `Complex ${intent.type} task requires specialized skill`,
      }
    }

    return {
      needed: false,
      skillName: '',
      skillType: 'code',
      reason: 'No specialized skill needed',
    }
  }

  /**
   * Detect if a new agent is needed
   */
  private async detectAgentRequirement(input: string, intent: AnalyzedIntent): Promise<AgentRequirement> {
    const normalized = input.toLowerCase()

    // Check for architecture needs
    if (normalized.includes('architecture') || normalized.includes('design system')) {
      return {
        needed: true,
        agentType: 'architect',
        domain: 'System Architecture',
        reason: 'Architectural design requires architect agent',
      }
    }

    // Check for DevOps needs
    if (normalized.includes('deploy') || normalized.includes('ci/cd') || normalized.includes('docker')) {
      return {
        needed: true,
        agentType: 'devops',
        domain: 'DevOps & Deployment',
        reason: 'Deployment tasks require DevOps agent',
      }
    }

    // Check for specialized domains
    const specializations = [
      { keywords: ['security', 'encryption', 'auth'], domain: 'Security' },
      { keywords: ['performance', 'optimize', 'cache'], domain: 'Performance' },
      { keywords: ['test', 'testing', 'qa'], domain: 'Testing' },
      { keywords: ['ui', 'ux', 'design', 'frontend'], domain: 'Frontend' },
      { keywords: ['api', 'backend', 'server'], domain: 'Backend' },
      { keywords: ['database', 'sql', 'query'], domain: 'Database' },
    ]

    for (const spec of specializations) {
      if (spec.keywords.some(kw => normalized.includes(kw))) {
        return {
          needed: true,
          agentType: 'specialist',
          domain: spec.domain,
          reason: `${spec.domain} tasks require specialized agent`,
        }
      }
    }

    // For complex multi-step tasks, need an engineer
    if (intent.estimatedSteps > 5) {
      return {
        needed: true,
        agentType: 'engineer',
        domain: 'Implementation',
        reason: 'Multi-step implementation requires engineer agent',
      }
    }

    return {
      needed: false,
      agentType: 'engineer',
      domain: '',
      reason: 'Existing agents can handle this task',
    }
  }

  /**
   * Detect which MCP tools are needed
   */
  private async detectMcpRequirement(input: string, intent: AnalyzedIntent): Promise<McpRequirement> {
    const normalized = input.toLowerCase()
    const scoredTools = MCP_TOOL_PROFILES
      .map((profile) => {
        const matchedKeywords = profile.keywords.filter(keyword => normalized.includes(keyword))
        if (matchedKeywords.length === 0) {
          return null
        }

        const intentBoost = profile.intentBoost?.[intent.type] ?? 0
        const complexityBoost = intent.complexity === 'complex' || intent.complexity === 'very_complex' ? 1 : 0
        const score = profile.basePriority + (matchedKeywords.length * 2) + intentBoost + complexityBoost

        return {
          tool: profile.tool,
          score,
        }
      })
      .filter((item): item is { tool: string, score: number } => item !== null)
      .sort((a, b) => b.score - a.score)

    const candidates = scoredTools.map(item => item.tool)
    const tools = scoredTools
      .slice(0, this.config.maxMcpTools)
      .map(item => item.tool)

    return {
      needed: tools.length > 0,
      tools,
      candidates,
      reason: tools.length > 0
        ? (candidates.length > tools.length
            ? `Selected top ${tools.length}/${candidates.length} MCP tools by capability score: ${tools.join(', ')}`
            : `Requires MCP tools: ${tools.join(', ')}`)
        : 'No MCP tools needed',
    }
  }

  /**
   * Auto-create a skill
   */
  private async autoCreateSkill(req: SkillRequirement): Promise<string> {
    // Generate skill ID
    const skillId = `skill-${req.skillName}-${Date.now()}`

    // Create skill definition
    const skillDefinition = {
      id: skillId,
      name: req.skillName,
      type: req.skillType,
      description: `Auto-generated skill for ${req.reason}`,
      capabilities: this.generateSkillCapabilities(req),
      createdAt: new Date().toISOString(),
      autoGenerated: true,
    }

    // Save skill to state
    const stateManager = getGlobalStateManager()
    await stateManager.initialize()

    // Create skill worktree
    await stateManager.createAgentWorktree(skillId)

    // Save skill definition
    await stateManager.saveState(skillId, {
      agentId: skillId,
      status: 'active',
      currentTask: 'Ready',
      memory: { skillDefinition },
    })

    this.log(`Skill created: ${skillId}`)

    return skillId
  }

  /**
   * Generate skill capabilities based on requirement
   */
  private generateSkillCapabilities(req: SkillRequirement): string[] {
    const capabilitiesMap = {
      code: ['write_code', 'review_code', 'refactor_code', 'debug_code'],
      analysis: ['analyze_requirements', 'design_architecture', 'create_diagrams', 'document_design'],
      integration: ['integrate_apis', 'configure_services', 'test_integration', 'handle_auth'],
      deployment: ['deploy_application', 'configure_infrastructure', 'setup_ci_cd', 'monitor_services'],
    }

    return capabilitiesMap[req.skillType] || ['general_task']
  }

  /**
   * Auto-create an agent
   */
  private async autoCreateAgent(req: AgentRequirement): Promise<string> {
    // Generate agent ID
    const agentId = `agent-${req.agentType}-${Date.now()}`

    // Create agent definition
    const agentDefinition = {
      id: agentId,
      name: `${req.domain} ${req.agentType}`,
      type: req.agentType,
      domain: req.domain,
      status: 'active',
      model: req.agentType === 'architect' ? 'opus' : 'sonnet',
      capabilities: this.generateAgentCapabilities(req),
      createdAt: new Date().toISOString(),
      autoGenerated: true,
    }

    // Save agent to state
    const stateManager = getGlobalStateManager()
    await stateManager.initialize()

    // Create agent worktree
    await stateManager.createAgentWorktree(agentId)

    // Save agent definition
    await stateManager.saveState(agentId, {
      agentId,
      status: 'active',
      currentTask: 'Ready',
      memory: { agentDefinition },
    })

    // Create mailbox for agent
    const mailboxManager = getGlobalMailboxManager()
    await mailboxManager.initialize()
    await mailboxManager.createMailbox(agentId)

    this.log(`Agent created: ${agentId}`)

    return agentId
  }

  /**
   * Generate agent capabilities based on requirement
   */
  private generateAgentCapabilities(req: AgentRequirement): string[] {
    const capabilitiesMap = {
      architect: ['design_architecture', 'create_plans', 'review_design', 'make_decisions'],
      specialist: ['deep_expertise', 'solve_complex_problems', 'optimize_solutions', 'provide_guidance'],
      engineer: ['implement_features', 'write_code', 'test_code', 'fix_bugs'],
      devops: ['deploy_applications', 'manage_infrastructure', 'setup_pipelines', 'monitor_systems'],
    }

    return capabilitiesMap[req.agentType] || ['general_task']
  }

  /**
   * Execute via Mayor Agent
   */
  private async executeMayor(
    input: string,
    intent: AnalyzedIntent,
    agentsCreated: string[],
    skillsCreated: string[],
    mcpToolsUsed: string[],
  ): Promise<ExecutionResult> {
    this.log('Executing via Mayor Agent')

    const mayor = getGlobalMayorAgent({
      autoCreateConvoy: true,
      autoSpawnWorkers: true,
      monitorProgress: true,
      notifyHuman: true,
    })

    // Process request through Mayor
    const response = await mayor.processRequest(input)

    return {
      success: true,
      route: 'mayor',
      intent,
      convoyId: response.convoyId,
      agentsCreated,
      skillsCreated,
      mcpToolsUsed,
      message: response.message,
      details: response,
    }
  }

  /**
   * Execute via Plan Mode
   */
  private async executePlan(
    input: string,
    intent: AnalyzedIntent,
    agentsCreated: string[],
    skillsCreated: string[],
    mcpToolsUsed: string[],
  ): Promise<ExecutionResult> {
    this.log('Executing via Plan Mode')

    // Create a convoy for planning
    const convoyManager = getGlobalConvoyManager()
    await convoyManager.initialize()

    const convoy = await convoyManager.create(`Plan: ${input.substring(0, 50)}`, {
      description: input,
      createdBy: 'auto-executor',
    })

    // Add planning tasks
    await convoyManager.addTask(convoy.id, 'Analyze requirements')
    await convoyManager.addTask(convoy.id, 'Design architecture')
    await convoyManager.addTask(convoy.id, 'Create implementation plan')

    await convoyManager.start(convoy.id)

    return {
      success: true,
      route: 'plan',
      intent,
      convoyId: convoy.id,
      agentsCreated,
      skillsCreated,
      mcpToolsUsed,
      message: `Planning convoy created: ${convoy.id}`,
      details: { convoy },
    }
  }

  /**
   * Execute via Feature Mode
   */
  private async executeFeature(
    input: string,
    intent: AnalyzedIntent,
    agentsCreated: string[],
    skillsCreated: string[],
    mcpToolsUsed: string[],
  ): Promise<ExecutionResult> {
    this.log('Executing via Feature Mode')

    // Create a convoy for feature implementation
    const convoyManager = getGlobalConvoyManager()
    await convoyManager.initialize()

    const convoy = await convoyManager.create(`Feature: ${input.substring(0, 50)}`, {
      description: input,
      createdBy: 'auto-executor',
    })

    // Add feature tasks
    await convoyManager.addTask(convoy.id, 'Implement feature')
    await convoyManager.addTask(convoy.id, 'Write tests')
    await convoyManager.addTask(convoy.id, 'Update documentation')

    await convoyManager.start(convoy.id)

    return {
      success: true,
      route: 'feature',
      intent,
      convoyId: convoy.id,
      agentsCreated,
      skillsCreated,
      mcpToolsUsed,
      message: `Feature convoy created: ${convoy.id}`,
      details: { convoy },
    }
  }

  /**
   * Execute directly
   */
  private async executeDirect(
    input: string,
    intent: AnalyzedIntent,
    agentsCreated: string[],
    skillsCreated: string[],
    mcpToolsUsed: string[],
  ): Promise<ExecutionResult> {
    this.log('Executing directly')

    return {
      success: true,
      route: 'direct',
      intent,
      agentsCreated,
      skillsCreated,
      mcpToolsUsed,
      message: `Direct execution: ${input}`,
      details: { input },
    }
  }

  private buildExecutionInsights(options: {
    initialRoute: ExecutionRoute
    resolvedRoute: ExecutionRoute
    elicitationAsked: boolean
    userSelectedRoute: boolean
    mcpReq: McpRequirement
    totalDurationMs: number
    executionId: string
  }): ExecutionInsights {
    return {
      decisionProfile: options.userSelectedRoute ? 'user_guided' : 'automatic',
      routeDecision: {
        initial: options.initialRoute,
        final: options.resolvedRoute,
        elicitationAsked: options.elicitationAsked,
        userSelectedRoute: options.userSelectedRoute,
      },
      mcpSelection: {
        selected: options.mcpReq.tools,
        candidates: options.mcpReq.candidates,
        truncated: options.mcpReq.candidates.length > options.mcpReq.tools.length,
        reason: options.mcpReq.reason,
      },
      telemetry: {
        totalDurationMs: options.totalDurationMs,
        eventCount: this.getExecutionTelemetryEventCount(options.executionId),
      },
    }
  }

  private getExecutionTelemetryEventCount(executionId: string): number {
    return this.config.telemetry
      .getRecent(500)
      .filter(event => event.executionId === executionId)
      .length
  }

  /**
   * Get aggregated execution telemetry.
   */
  getTelemetrySummary(): ExecutionTelemetrySummary {
    return this.config.telemetry.summarize()
  }

  /**
   * Get recent execution telemetry events.
   */
  getTelemetryEvents(limit = 50): TelemetryEvent[] {
    return this.config.telemetry.getRecent(limit)
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  /**
   * Log message if verbose
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[AutoExecutor] ${message}`)
    }
  }
}

// Global singleton instance
let globalExecutor: AutoExecutor | null = null

/**
 * Get global auto executor instance
 */
export function getGlobalAutoExecutor(config?: Partial<AutoExecutorConfig>): AutoExecutor {
  if (!globalExecutor) {
    globalExecutor = new AutoExecutor(config)
  }
  return globalExecutor
}

/**
 * Reset global executor (for testing)
 */
export function resetGlobalAutoExecutor(): void {
  globalExecutor = null
}
