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

import type { AnalyzedIntent } from './intent-router'
import { EventEmitter } from 'node:events'
import { getGlobalConvoyManager } from '../convoy/convoy-manager'
import { getGlobalMayorAgent } from '../mayor/mayor-agent'
import { getGlobalMailboxManager } from '../messaging/persistent-mailbox'
import { getGlobalStateManager } from '../persistence/git-backed-state'
import { getGlobalIntentRouter } from './intent-router'

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean
  route: 'mayor' | 'plan' | 'feature' | 'direct'
  intent: AnalyzedIntent
  convoyId?: string
  agentsCreated: string[]
  skillsCreated: string[]
  mcpToolsUsed: string[]
  message: string
  details?: any
}

/**
 * Auto executor configuration
 */
export interface AutoExecutorConfig {
  autoCreateSkills: boolean // Default: true
  autoCreateAgents: boolean // Default: true
  autoSelectMcp: boolean // Default: true
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
}

/**
 * Auto Executor - Fully automatic execution with zero user intervention
 */
export class AutoExecutor extends EventEmitter {
  private config: Required<AutoExecutorConfig>
  private intentRouter = getGlobalIntentRouter()

  constructor(config: Partial<AutoExecutorConfig> = {}) {
    super()

    this.config = {
      autoCreateSkills: config.autoCreateSkills !== undefined ? config.autoCreateSkills : true,
      autoCreateAgents: config.autoCreateAgents !== undefined ? config.autoCreateAgents : true,
      autoSelectMcp: config.autoSelectMcp !== undefined ? config.autoSelectMcp : true,
      verbose: config.verbose !== undefined ? config.verbose : false,
    }
  }

  /**
   * Execute user request automatically
   */
  async execute(userInput: string): Promise<ExecutionResult> {
    this.emit('execution:started', { input: userInput })

    try {
      // Step 1: Analyze intent
      const routeResult = await this.intentRouter.route(userInput)
      const { route, intent } = routeResult

      this.log(`Intent analyzed: ${intent.type} (${intent.complexity})`)
      this.log(`Suggested route: ${route}`)

      // Step 2: Detect requirements
      const skillReq = await this.detectSkillRequirement(userInput, intent)
      const agentReq = await this.detectAgentRequirement(userInput, intent)
      const mcpReq = await this.detectMcpRequirement(userInput, intent)

      const agentsCreated: string[] = []
      const skillsCreated: string[] = []
      const mcpToolsUsed: string[] = []

      // Step 3: Auto-create skills if needed
      if (this.config.autoCreateSkills && skillReq.needed) {
        this.log(`Auto-creating skill: ${skillReq.skillName}`)
        const skillId = await this.autoCreateSkill(skillReq)
        skillsCreated.push(skillId)
        this.emit('skill:created', { skillId, skillReq })
      }

      // Step 4: Auto-create agents if needed
      if (this.config.autoCreateAgents && agentReq.needed) {
        this.log(`Auto-creating agent: ${agentReq.domain}`)
        const agentId = await this.autoCreateAgent(agentReq)
        agentsCreated.push(agentId)
        this.emit('agent:created', { agentId, agentReq })
      }

      // Step 5: Auto-select MCP tools if needed
      if (this.config.autoSelectMcp && mcpReq.needed) {
        this.log(`Auto-selecting MCP tools: ${mcpReq.tools.join(', ')}`)
        mcpToolsUsed.push(...mcpReq.tools)
        this.emit('mcp:selected', { tools: mcpReq.tools, mcpReq })
      }

      // Step 6: Execute based on route
      let result: ExecutionResult

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

      this.emit('execution:completed', result)
      return result
    }
    catch (error) {
      this.emit('execution:failed', { error, input: userInput })
      throw error
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
  private async detectMcpRequirement(input: string, _intent: AnalyzedIntent): Promise<McpRequirement> {
    const normalized = input.toLowerCase()
    const tools: string[] = []

    // File system operations
    if (normalized.includes('file') || normalized.includes('directory') || normalized.includes('folder')) {
      tools.push('filesystem')
    }

    // GitHub operations
    if (normalized.includes('github') || normalized.includes('repository') || normalized.includes('pr')) {
      tools.push('github')
    }

    // Web search/fetch
    if (normalized.includes('search') || normalized.includes('documentation') || normalized.includes('docs')) {
      tools.push('web-search')
    }

    // Browser automation
    if (normalized.includes('browser') || normalized.includes('webpage') || normalized.includes('ui test')) {
      tools.push('playwright')
    }

    // Context7 for library docs
    if (normalized.includes('library') || normalized.includes('framework') || normalized.includes('package')) {
      tools.push('context7')
    }

    // IDE integration
    if (normalized.includes('diagnostic') || normalized.includes('error') || normalized.includes('lint')) {
      tools.push('ide')
    }

    return {
      needed: tools.length > 0,
      tools,
      reason: tools.length > 0 ? `Requires MCP tools: ${tools.join(', ')}` : 'No MCP tools needed',
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
