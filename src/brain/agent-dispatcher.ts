/**
 * Agent Dispatcher System for CCJK v3.8
 *
 * Routes tasks to appropriate agent types based on skill configuration,
 * handles tool filtering, model inheritance, and supports parallel agent
 * execution for improved performance.
 *
 * @module brain/agent-dispatcher
 */

import type { AgentCapability, CloudAgent } from '../types/agent'
import type { SkillMdFile, SubagentContextMode } from '../types/skill-md'
import type {
  AgentInstance,
  AgentMetrics,
  OrchestrationResult,
  Task,
  TaskOutput,
} from './orchestrator-types'
import type { AgentRole } from './types'
import { nanoid } from 'nanoid'

/**
 * Agent dispatch configuration
 */
export interface AgentDispatchConfig {
  /** Agent type to dispatch to */
  agentType: string

  /** Agent role (for CCJK brain agents) */
  agentRole?: AgentRole

  /** Cloud agent definition (if using cloud agents) */
  cloudAgent?: CloudAgent

  /** Execution mode (fork or inherit) */
  mode: SubagentContextMode

  /** Session ID for fork context */
  sessionId?: string

  /** Disallowed tools (filtered from parent context) */
  disallowedTools?: string[]

  /** Allowed tools (explicitly allowed) */
  allowedTools?: string[]

  /** Working directory */
  workingDirectory: string

  /** Environment variables */
  env: Record<string, string>

  /** Timeout in milliseconds */
  timeout?: number

  /** Maximum retries */
  maxRetries?: number

  /** Verbose logging */
  verbose?: boolean
}

/**
 * Agent dispatch result
 */
export interface AgentDispatchResult {
  /** Whether dispatch succeeded */
  success: boolean

  /** Agent instance that was dispatched to */
  agent?: AgentInstance

  /** Task output */
  output?: TaskOutput

  /** Execution duration in milliseconds */
  durationMs: number

  /** Error message (if failed) */
  error?: string

  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Parallel agent execution configuration
 */
export interface ParallelAgentExecution {
  /** Unique execution ID */
  id: string

  /** Tasks to execute in parallel */
  tasks: Array<{
    task: Task
    config: AgentDispatchConfig
  }>

  /** Maximum parallel executions */
  maxParallel?: number

  /** Stop on first error */
  stopOnError?: boolean

  /** Aggregate results */
  aggregateResults?: boolean
}

/**
 * Parallel agent execution result
 */
export interface ParallelExecutionResult {
  /** Execution ID */
  id: string

  /** Whether all executions succeeded */
  success: boolean

  /** Individual results */
  results: AgentDispatchResult[]

  /** Total duration in milliseconds */
  durationMs: number

  /** Number of successful executions */
  successfulCount: number

  /** Number of failed executions */
  failedCount: number

  /** Aggregated output (if requested) */
  aggregatedOutput?: TaskOutput
}

/**
 * Agent filter criteria
 */
export interface AgentFilterCriteria {
  /** Required capabilities */
  capabilities?: AgentCapability[]

  /** Agent type pattern (supports wildcards) */
  agentType?: string

  /** Agent role */
  agentRole?: AgentRole

  /** Minimum success rate */
  minSuccessRate?: number

  /** Maximum current load */
  maxCurrentLoad?: number

  /** Has specific tool access */
  hasTool?: string

  /** Exclude specific agent types */
  excludeTypes?: string[]
}

/**
 * Agent dispatcher options
 */
export interface AgentDispatcherOptions {
  /** Default timeout in milliseconds */
  defaultTimeout?: number

  /** Maximum parallel executions */
  maxParallelExecutions?: number

  /** Enable load balancing */
  enableLoadBalancing?: boolean

  /** Enable agent caching */
  enableAgentCaching?: boolean

  /** Agent cache TTL in milliseconds */
  agentCacheTtl?: number

  /** Verbose logging */
  verbose?: boolean

  /** Custom agent type mappings */
  agentTypeMappings?: Record<string, AgentRole>
}

/**
 * Agent registry entry
 */
interface AgentRegistryEntry {
  /** Agent instance */
  agent: AgentInstance

  /** Last used timestamp */
  lastUsed: Date

  /** Usage count */
  usageCount: number

  /** Cache expiry */
  expiresAt?: Date
}

/**
 * Default agent type mappings for CCJK
 */
const DEFAULT_AGENT_TYPE_MAPPINGS: Record<string, AgentRole> = {
  'typescript': 'coder',
  'typescript-cli': 'coder',
  'ts-cli-architect': 'architect',
  'ts-architect': 'architect',

  'i18n': 'specialist',
  'internationalization': 'specialist',
  'i18n-specialist': 'specialist',

  'tools': 'specialist',
  'integration': 'specialist',
  'tools-integration': 'specialist',

  'template': 'specialist',
  'templating': 'specialist',
  'template-engine': 'specialist',

  'config': 'architect',
  'configuration': 'architect',
  'config-architect': 'architect',

  'testing': 'tester',
  'test': 'tester',
  'testing-specialist': 'tester',

  'devops': 'specialist',
  'deployment': 'specialist',
  'devops-engineer': 'specialist',

  'code': 'coder',
  'general': 'coordinator',
  'default': 'coordinator',
}

/**
 * Default dispatcher options
 */
const DEFAULT_DISPATCHER_OPTIONS: Required<AgentDispatcherOptions> = {
  defaultTimeout: 300000,
  maxParallelExecutions: 5,
  enableLoadBalancing: true,
  enableAgentCaching: true,
  agentCacheTtl: 3600000, // 1 hour
  verbose: false,
  agentTypeMappings: DEFAULT_AGENT_TYPE_MAPPINGS,
}

/**
 * Agent Dispatcher Class
 *
 * Routes tasks to appropriate agents and manages agent lifecycle.
 */
export class AgentDispatcher {
  private options: Required<AgentDispatcherOptions>
  private agentRegistry: Map<string, AgentRegistryEntry> = new Map()
  private cloudAgents: Map<string, CloudAgent> = new Map()
  private activeExecutions: Map<string, Promise<AgentDispatchResult>> = new Map()

  constructor(options: AgentDispatcherOptions = {}) {
    this.options = {
      ...DEFAULT_DISPATCHER_OPTIONS,
      ...options,
      agentTypeMappings: {
        ...DEFAULT_AGENT_TYPE_MAPPINGS,
        ...options.agentTypeMappings,
      },
    }
  }

  /**
   * Register a cloud agent
   *
   * @param agentType - Agent type identifier
   * @param agent - Cloud agent definition
   */
  registerCloudAgent(agentType: string, agent: CloudAgent): void {
    this.cloudAgents.set(agentType, agent)

    if (this.options.verbose) {
      console.log(`[AgentDispatcher] Registered cloud agent: ${agentType}`)
    }
  }

  /**
   * Unregister a cloud agent
   *
   * @param agentType - Agent type identifier
   */
  unregisterCloudAgent(agentType: string): void {
    this.cloudAgents.delete(agentType)

    if (this.options.verbose) {
      console.log(`[AgentDispatcher] Unregistered cloud agent: ${agentType}`)
    }
  }

  /**
   * Dispatch a task to an agent based on skill configuration
   *
   * @param task - Task to execute
   * @param skill - Skill file with agent configuration
   * @param executeFn - Execution function
   * @returns Dispatch result
   */
  async dispatch(
    task: Task,
    skill: SkillMdFile,
    executeFn: (config: AgentDispatchConfig) => Promise<OrchestrationResult>,
  ): Promise<AgentDispatchResult> {
    const startTime = Date.now()

    try {
      // Build dispatch config from skill
      const config = this.buildDispatchConfig(skill)

      // Select agent
      const agent = await this.selectAgent(config)

      if (!agent) {
        return {
          success: false,
          durationMs: Date.now() - startTime,
          error: `No suitable agent found for type: ${config.agentType}`,
        }
      }

      // Update agent status
      agent.status = 'busy'
      agent.currentTask = task

      // Execute task
      const result = await this.executeWithAgent(agent, task, config, executeFn)

      // Update agent metrics
      agent.status = 'idle'
      agent.currentTask = undefined
      this.updateAgentMetrics(agent, task, result.success)

      // Cache agent if enabled
      if (this.options.enableAgentCaching) {
        this.cacheAgent(agent)
      }

      return {
        success: result.success,
        agent,
        output: result.results?.aggregated as TaskOutput,
        durationMs: Date.now() - startTime,
        metadata: {
          agentType: config.agentType,
          agentRole: config.agentRole,
          sessionId: config.sessionId,
        },
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: errorMessage,
      }
    }
  }

  /**
   * Dispatch to multiple agents in parallel
   *
   * @param execution - Parallel execution configuration
   * @param executeFn - Execution function
   * @returns Parallel execution result
   */
  async dispatchParallel(
    execution: ParallelAgentExecution,
    executeFn: (config: AgentDispatchConfig) => Promise<OrchestrationResult>,
  ): Promise<ParallelExecutionResult> {
    const startTime = Date.now()
    const results: AgentDispatchResult[] = []
    let successfulCount = 0
    let failedCount = 0

    const maxParallel = execution.maxParallel ?? this.options.maxParallelExecutions

    // Process in batches
    for (let i = 0; i < execution.tasks.length; i += maxParallel) {
      const batch = execution.tasks.slice(i, i + maxParallel)

      const batchResults = await Promise.allSettled(
        batch.map(async ({ task, config }) => {
          const result = await this.executeDispatch(task, config, executeFn)
          if (result.success) {
            successfulCount++
          }
          else {
            failedCount++
            if (execution.stopOnError) {
              throw new Error(`Execution failed: ${result.error}`)
            }
          }
          return result
        }),
      )

      for (const batchResult of batchResults) {
        if (batchResult.status === 'fulfilled') {
          results.push(batchResult.value)
        }
        else {
          results.push({
            success: false,
            durationMs: Date.now() - startTime,
            error: batchResult.reason?.message || 'Unknown error',
          })
          failedCount++
        }
      }
    }

    const success = failedCount === 0

    return {
      id: execution.id,
      success,
      results,
      durationMs: Date.now() - startTime,
      successfulCount,
      failedCount,
      aggregatedOutput: execution.aggregateResults ? this.aggregateOutputs(results) : undefined,
    }
  }

  /**
   * Execute a single dispatch
   *
   * @param task - Task to execute
   * @param config - Dispatch configuration
   * @param executeFn - Execution function
   * @returns Dispatch result
   */
  private async executeDispatch(
    task: Task,
    config: AgentDispatchConfig,
    executeFn: (config: AgentDispatchConfig) => Promise<OrchestrationResult>,
  ): Promise<AgentDispatchResult> {
    const startTime = Date.now()

    try {
      const agent = await this.selectAgent(config)

      if (!agent) {
        return {
          success: false,
          durationMs: Date.now() - startTime,
          error: `No suitable agent found for type: ${config.agentType}`,
        }
      }

      agent.status = 'busy'
      agent.currentTask = task

      const result = await this.executeWithAgent(agent, task, config, executeFn)

      agent.status = 'idle'
      agent.currentTask = undefined
      this.updateAgentMetrics(agent, task, result.success)

      return {
        success: result.success,
        agent,
        output: result.results?.aggregated as TaskOutput,
        durationMs: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Execute task with agent
   *
   * @param agent - Agent instance
   * @param task - Task to execute
   * @param config - Dispatch configuration
   * @param executeFn - Execution function
   * @returns Orchestration result
   */
  private async executeWithAgent(
    agent: AgentInstance,
    task: Task,
    config: AgentDispatchConfig,
    executeFn: (config: AgentDispatchConfig) => Promise<OrchestrationResult>,
  ): Promise<OrchestrationResult> {
    // Apply tool filtering
    const filteredConfig = this.applyToolFiltering(config)

    const timeout = filteredConfig.timeout ?? this.options.defaultTimeout
    const softTimeout = Math.floor(timeout * 0.8) // 80% 时发出警告
    const warningTimeout = Math.floor(timeout * 0.6) // 60% 时发出提示

    let _softTimeoutReached = false
    let _warningTimeoutReached = false

    // 60% 超时提示
    const warningTimer = setTimeout(() => {
      _warningTimeoutReached = true
      if (this.options.verbose) {
        console.log(`\n💭 Agent ${agent.id} 正在执行中，请稍候...`)
      }
    }, warningTimeout)

    // 80% 软超时警告
    const softTimer = setTimeout(() => {
      _softTimeoutReached = true
      console.log(`\n⚠️ 任务执行时间较长 (已超过 ${Math.floor(softTimeout / 1000)}s)，可能需要：`)
      console.log(`   1. 等待完成（剩余约 ${Math.floor((timeout - softTimeout) / 1000)}s）`)
      console.log('   2. 使用 Ctrl+C 中断后执行 /compact 清理上下文')
      console.log('   3. 将任务分解为更小的步骤\n')
    }, softTimeout)

    try {
      const result = await Promise.race([
        executeFn(filteredConfig),
        new Promise<OrchestrationResult>((_, reject) =>
          setTimeout(() => {
            reject(new Error('Agent execution timeout'))
          }, timeout),
        ),
      ])

      clearTimeout(warningTimer)
      clearTimeout(softTimer)
      return result
    }
    catch (error) {
      clearTimeout(warningTimer)
      clearTimeout(softTimer)

      // 如果是超时错误，提供更友好的提示
      if (error instanceof Error && error.message === 'Agent execution timeout') {
        const friendlyError = new Error(
          `任务执行超时 (${Math.floor(timeout / 1000)}s)。建议：\n`
          + `  1. 使用 /compact 清理上下文后重试\n`
          + `  2. 将任务分解为更小的步骤\n`
          + `  3. 检查网络连接是否稳定`,
        )
        friendlyError.name = 'TimeoutError'
        throw friendlyError
      }
      throw error
    }
  }

  /**
   * Build dispatch config from skill file
   *
   * @param skill - Skill file
   * @returns Dispatch configuration
   */
  buildDispatchConfig(skill: SkillMdFile): AgentDispatchConfig {
    const metadata = skill.metadata

    // Determine agent type
    const agentType = metadata.agent || 'default'

    // Map agent type to role
    const agentRole = this.mapAgentTypeToRole(agentType)

    return {
      agentType,
      agentRole,
      mode: metadata.context || 'inherit',
      sessionId: this.generateSessionId(),
      disallowedTools: this.extractDisallowedTools(metadata),
      allowedTools: metadata.allowed_tools,
      workingDirectory: process.cwd(),
      env: { ...process.env } as Record<string, string>,
      timeout: metadata.timeout ? metadata.timeout * 1000 : undefined,
      verbose: false,
    }
  }

  /**
   * Map agent type string to AgentRole
   *
   * @param agentType - Agent type string
   * @returns Mapped agent role
   */
  mapAgentTypeToRole(agentType: string): AgentRole | undefined {
    // Try exact match first
    if (this.options.agentTypeMappings[agentType]) {
      return this.options.agentTypeMappings[agentType]
    }

    // Try lowercase match
    const lowerKey = agentType.toLowerCase()
    if (this.options.agentTypeMappings[lowerKey]) {
      return this.options.agentTypeMappings[lowerKey]
    }

    // Check if it's already a valid AgentRole
    const validRoles: AgentRole[] = [
      'researcher',
      'architect',
      'coder',
      'debugger',
      'tester',
      'reviewer',
      'writer',
      'analyst',
      'coordinator',
      'specialist',
    ]

    if (validRoles.includes(agentType as AgentRole)) {
      return agentType as AgentRole
    }

    return undefined
  }

  /**
   * Extract disallowed tools from skill metadata
   *
   * @param metadata - Skill metadata
   * @returns Disallowed tools array
   */
  extractDisallowedTools(metadata: SkillMdFile['metadata']): string[] | undefined {
    // If allowed_tools is specified, everything else is disallowed
    // Otherwise, check for explicit disallowed_tools field if it exists
    if (metadata.allowed_tools) {
      return undefined // Tools are filtered by inclusion, not exclusion
    }

    // Check if skill has a disallowed_tools field
    const skillData = metadata as any
    if (skillData.disallowed_tools && Array.isArray(skillData.disallowed_tools)) {
      return skillData.disallowed_tools
    }

    return undefined
  }

  /**
   * Apply tool filtering to dispatch config
   *
   * @param config - Original dispatch config
   * @returns Filtered dispatch config
   */
  applyToolFiltering(config: AgentDispatchConfig): AgentDispatchConfig {
    const filtered = { ...config }

    // If allowed_tools is specified, use it
    if (config.allowedTools && config.allowedTools.length > 0) {
      filtered.allowedTools = config.allowedTools
    }

    // If disallowed_tools is specified, merge with any existing
    if (config.disallowedTools && config.disallowedTools.length > 0) {
      filtered.disallowedTools = config.disallowedTools
    }

    return filtered
  }

  /**
   * Select an agent for dispatch
   *
   * @param config - Dispatch configuration
   * @returns Selected agent instance or null
   */
  async selectAgent(config: AgentDispatchConfig): Promise<AgentInstance | null> {
    // Try to get from cache first
    if (this.options.enableAgentCaching) {
      const cached = this.getCachedAgent(config)
      if (cached) {
        return cached
      }
    }

    // Find cloud agent
    const cloudAgent = this.cloudAgents.get(config.agentType)
    if (cloudAgent) {
      return this.createAgentInstance(cloudAgent, config)
    }

    // Create a generic agent instance
    return this.createGenericAgent(config)
  }

  /**
   * Create agent instance from cloud agent
   *
   * @param cloudAgent - Cloud agent definition
   * @param config - Dispatch configuration
   * @returns Agent instance
   */
  private createAgentInstance(cloudAgent: CloudAgent, config: AgentDispatchConfig): AgentInstance {
    const now = new Date()

    // Convert string capabilities to AgentCapability objects
    const capabilities: AgentCapability[] = cloudAgent.definition.capabilities.map((cap, index) => ({
      id: `${cloudAgent.id}-cap-${index}`,
      name: cap,
      model: 'inherit' as const,
      specialties: [cap],
      strength: 1.0,
      costFactor: 1.0,
    }))

    return {
      id: nanoid(),
      role: this.mapAgentTypeToRole(config.agentType) || 'coordinator',
      agent: cloudAgent,
      status: 'idle',
      taskHistory: [],
      capabilities,
      metrics: this.createEmptyMetrics(),
      createdAt: now.toISOString(),
      config: {
        maxConcurrentTasks: 1,
        taskTimeout: config.timeout || this.options.defaultTimeout,
        verboseLogging: config.verbose || false,
      },
    }
  }

  /**
   * Create a generic agent instance
   *
   * @param config - Dispatch configuration
   * @returns Agent instance
   */
  private createGenericAgent(config: AgentDispatchConfig): AgentInstance {
    const now = new Date()

    return {
      id: nanoid(),
      role: config.agentRole || 'coordinator',
      agent: {
        id: config.agentType,
        name: config.agentType,
        version: '1.0.0',
        definition: {
          role: config.agentType,
          systemPrompt: `You are a ${config.agentType} agent.`,
          capabilities: [],
          tools: [],
          constraints: [],
        },
        metadata: {
          author: 'CCJK',
          description: { 'en': config.agentType, 'zh-CN': config.agentType },
          category: 'general',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          usageCount: 0,
          rating: 0,
          ratingCount: 0,
        },
        privacy: 'private',
      },
      status: 'idle',
      taskHistory: [],
      capabilities: [],
      metrics: this.createEmptyMetrics(),
      createdAt: now.toISOString(),
      config: {
        maxConcurrentTasks: 1,
        taskTimeout: config.timeout || this.options.defaultTimeout,
        verboseLogging: config.verbose || false,
      },
    }
  }

  /**
   * Create empty metrics object
   *
   * @returns Empty metrics
   */
  private createEmptyMetrics(): AgentMetrics {
    return {
      tasksExecuted: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      avgTaskDuration: 0,
      successRate: 0,
      totalExecutionTime: 0,
      avgConfidence: 0,
      lastUpdated: new Date().toISOString(),
    }
  }

  /**
   * Update agent metrics after execution
   *
   * @param agent - Agent instance
   * @param task - Executed task
   * @param success - Whether execution succeeded
   */
  private updateAgentMetrics(agent: AgentInstance, task: Task, success: boolean): void {
    const metrics = agent.metrics

    metrics.tasksExecuted++
    if (success) {
      metrics.tasksSucceeded++
    }
    else {
      metrics.tasksFailed++
    }

    metrics.successRate = metrics.tasksSucceeded / metrics.tasksExecuted

    if (task.actualDuration) {
      metrics.totalExecutionTime += task.actualDuration
      metrics.avgTaskDuration = metrics.totalExecutionTime / metrics.tasksExecuted
    }

    metrics.lastUpdated = new Date().toISOString()

    // Add to task history
    agent.taskHistory.push({
      taskId: task.id,
      taskName: task.name,
      status: task.status,
      startedAt: task.startedAt || new Date().toISOString(),
      completedAt: task.completedAt,
      duration: task.actualDuration,
      success,
    })
  }

  /**
   * Cache an agent instance
   *
   * @param agent - Agent instance to cache
   */
  private cacheAgent(agent: AgentInstance): void {
    const key = `${agent.role}-${agent.id}`

    this.agentRegistry.set(key, {
      agent,
      lastUsed: new Date(),
      usageCount: 1,
      expiresAt: new Date(Date.now() + this.options.agentCacheTtl),
    })
  }

  /**
   * Get cached agent
   *
   * @param config - Dispatch configuration
   * @returns Cached agent or null
   */
  private getCachedAgent(config: AgentDispatchConfig): AgentInstance | null {
    const role = config.agentRole || 'system'

    // Find a matching cached agent
    const registryEntries = Array.from(this.agentRegistry.entries())
    for (const [key, entry] of registryEntries) {
      if (entry.agent.role === role && entry.agent.status === 'idle') {
        // Check if not expired
        if (entry.expiresAt && entry.expiresAt < new Date()) {
          this.agentRegistry.delete(key)
          continue
        }

        entry.lastUsed = new Date()
        entry.usageCount++

        if (this.options.verbose) {
          console.log(`[AgentDispatcher] Using cached agent: ${key}`)
        }

        return entry.agent
      }
    }

    return null
  }

  /**
   * Aggregate outputs from multiple dispatch results
   *
   * @param results - Dispatch results
   * @returns Aggregated output
   */
  private aggregateOutputs(results: AgentDispatchResult[]): TaskOutput {
    const successfulResults = results.filter(r => r.success && r.output)

    return {
      data: {
        results: successfulResults.map(r => r.output?.data),
        count: successfulResults.length,
        total: results.length,
      },
      files: successfulResults.flatMap(r => r.output?.files || []),
      logs: successfulResults.flatMap(r => r.output?.logs || []),
      confidence: successfulResults.length / results.length,
      metadata: {
        aggregatedAt: new Date().toISOString(),
        sourceResults: results.length,
      },
    }
  }

  /**
   * Generate a unique session ID
   *
   * @returns Session ID
   */
  private generateSessionId(): string {
    return `ccjk-dispatch-${Date.now()}-${nanoid(8)}`
  }

  /**
   * Filter available agents by criteria
   *
   * @param criteria - Filter criteria
   * @returns Filtered agents
   */
  filterAgents(criteria: AgentFilterCriteria): AgentInstance[] {
    const agents: AgentInstance[] = []

    // Add cloud agents
    const cloudAgentsEntries = Array.from(this.cloudAgents.entries())
    for (const [type, cloudAgent] of cloudAgentsEntries) {
      if (this.matchesCriteria(cloudAgent, criteria)) {
        agents.push(this.createAgentInstance(cloudAgent, {
          agentType: type,
          agentRole: this.mapAgentTypeToRole(type),
          mode: 'inherit',
          workingDirectory: process.cwd(),
          env: {},
        }))
      }
    }

    // Add cached agents
    const registryEntries = Array.from(this.agentRegistry.values())
    for (const entry of registryEntries) {
      if (this.matchesInstanceCriteria(entry.agent, criteria)) {
        agents.push(entry.agent)
      }
    }

    return agents
  }

  /**
   * Check if cloud agent matches criteria
   *
   * @param agent - Cloud agent
   * @param criteria - Filter criteria
   * @returns Whether agent matches
   */
  private matchesCriteria(agent: CloudAgent, criteria: AgentFilterCriteria): boolean {
    // Check capabilities
    if (criteria.capabilities && criteria.capabilities.length > 0) {
      const hasAllCapabilities = criteria.capabilities.every((cap) => {
        // Support both string and AgentCapability object
        const capName = typeof cap === 'string' ? cap : cap.name
        return agent.definition.capabilities.includes(capName)
      })
      if (!hasAllCapabilities) {
        return false
      }
    }

    // Check agent type pattern
    if (criteria.agentType) {
      const pattern = new RegExp(criteria.agentType.replace(/\*/g, '.*'))
      if (!pattern.test(agent.id)) {
        return false
      }
    }

    // Check tool access
    if (criteria.hasTool) {
      const hasTool = agent.definition.tools.includes(criteria.hasTool as any)
      if (!hasTool) {
        return false
      }
    }

    return true
  }

  /**
   * Check if agent instance matches criteria
   *
   * @param agent - Agent instance
   * @param criteria - Filter criteria
   * @returns Whether agent matches
   */
  private matchesInstanceCriteria(agent: AgentInstance, criteria: AgentFilterCriteria): boolean {
    // Check agent role
    if (criteria.agentRole && agent.role !== criteria.agentRole) {
      return false
    }

    // Check success rate
    if (criteria.minSuccessRate !== undefined) {
      if (agent.metrics.successRate < criteria.minSuccessRate) {
        return false
      }
    }

    // Check current load
    if (criteria.maxCurrentLoad !== undefined) {
      const load = agent.status === 'busy' ? 1 : 0
      if (load > criteria.maxCurrentLoad) {
        return false
      }
    }

    return true
  }

  /**
   * Clear expired cached agents
   *
   * @returns Number of agents cleared
   */
  clearExpiredCache(): number {
    const now = new Date()
    let cleared = 0

    const registryEntries = Array.from(this.agentRegistry.entries())
    for (const [key, entry] of registryEntries) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.agentRegistry.delete(key)
        cleared++
      }
    }

    if (this.options.verbose && cleared > 0) {
      console.log(`[AgentDispatcher] Cleared ${cleared} expired cached agents`)
    }

    return cleared
  }

  /**
   * Get dispatcher statistics
   *
   * @returns Statistics
   */
  getStats(): {
    registeredCloudAgents: number
    cachedAgents: number
    activeExecutions: number
    totalExecutions: number
  } {
    return {
      registeredCloudAgents: this.cloudAgents.size,
      cachedAgents: this.agentRegistry.size,
      activeExecutions: this.activeExecutions.size,
      totalExecutions: 0, // Would need tracking
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.agentRegistry.clear()
    this.cloudAgents.clear()
    this.activeExecutions.clear()
  }
}

/**
 * Create a new agent dispatcher
 *
 * @param options - Dispatcher options
 * @returns New dispatcher instance
 */
export function createAgentDispatcher(options?: AgentDispatcherOptions): AgentDispatcher {
  return new AgentDispatcher(options)
}

/**
 * Global dispatcher instance
 */
let globalDispatcher: AgentDispatcher | null = null

/**
 * Get or create global dispatcher
 *
 * @param options - Dispatcher options (only used on first call)
 * @returns Global dispatcher
 */
export function getGlobalDispatcher(options?: AgentDispatcherOptions): AgentDispatcher {
  if (!globalDispatcher) {
    globalDispatcher = new AgentDispatcher(options)
  }
  return globalDispatcher
}

/**
 * Reset global dispatcher
 */
export function resetGlobalDispatcher(): void {
  if (globalDispatcher) {
    globalDispatcher.cleanup()
    globalDispatcher = null
  }
}
