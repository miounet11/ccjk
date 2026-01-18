/**
 * CCJK Agent Orchestrator
 *
 * Multi-agent orchestration system for coordinating AI agents in various workflow patterns.
 * Supports sequential, parallel, and pipeline execution modes with comprehensive event tracking.
 *
 * @module core/agent-orchestrator
 */

import type { AgentDefinition } from '../types/agent.js'
import { EventEmitter } from 'node:events'

/**
 * Supported AI models for agents
 */
export type AgentModel = 'opus' | 'sonnet' | 'haiku' | 'inherit'

/**
 * Agent configuration
 *
 * Defines an agent's role, model, and behavior in the orchestration system.
 */
export interface AgentConfig {
  /** Agent role/identifier */
  role: string

  /** AI model to use */
  model: AgentModel

  /** System prompt defining agent behavior */
  systemPrompt: string

  /** Agent definition (optional, for advanced configuration) */
  definition?: AgentDefinition

  /** Temperature setting (0-1) */
  temperature?: number

  /** Max tokens for responses */
  maxTokens?: number

  /** Custom instructions */
  customInstructions?: string[]

  /** Timeout in milliseconds */
  timeout?: number

  /** Retry attempts on failure */
  retryAttempts?: number

  /** Retry delay in milliseconds */
  retryDelay?: number
}

/**
 * Workflow execution types
 */
export type WorkflowType = 'sequential' | 'parallel' | 'pipeline'

/**
 * Workflow configuration
 *
 * Defines how agents are orchestrated to complete a task.
 */
export interface WorkflowConfig {
  /** Workflow type */
  type: WorkflowType

  /** Agents participating in the workflow */
  agents: AgentConfig[]

  /** Shared context for all agents */
  context?: Record<string, unknown>

  /** Workflow timeout in milliseconds */
  timeout?: number

  /** Whether to continue on agent failure */
  continueOnError?: boolean

  /** Maximum parallel executions (for parallel workflows) */
  maxParallel?: number

  /** Workflow metadata */
  metadata?: {
    name?: string
    description?: string
    version?: string
    author?: string
  }
}

/**
 * Task input for agent execution
 */
export interface Task {
  /** Task identifier */
  id: string

  /** Task description */
  description: string

  /** Task input data */
  input: unknown

  /** Task context */
  context?: Record<string, unknown>

  /** Task metadata */
  metadata?: Record<string, unknown>

  /** Task priority (1-10) */
  priority?: number

  /** Task deadline (ISO 8601) */
  deadline?: string
}

/**
 * Agent execution result
 */
export interface AgentResult {
  /** Agent role */
  role: string

  /** Execution success status */
  success: boolean

  /** Result data */
  data: unknown

  /** Error message (if failed) */
  error?: string

  /** Execution duration in milliseconds */
  durationMs: number

  /** Execution timestamp */
  timestamp: string

  /** Agent metadata */
  metadata?: Record<string, unknown>

  /** Retry count */
  retryCount?: number
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  /** Workflow success status */
  success: boolean

  /** Individual agent results */
  results: AgentResult[]

  /** Merged result data */
  data: unknown

  /** Error message (if failed) */
  error?: string

  /** Total execution duration in milliseconds */
  durationMs: number

  /** Execution timestamp */
  timestamp: string

  /** Workflow metadata */
  metadata?: Record<string, unknown>
}

/**
 * Agent execution events
 */
export interface AgentEvents {
  'workflow:start': (task: Task) => void
  'workflow:complete': (result: WorkflowResult) => void
  'workflow:error': (error: Error) => void
  'agent:start': (data: { role: string, task: Task }) => void
  'agent:complete': (data: { role: string, result: AgentResult }) => void
  'agent:error': (data: { role: string, error: Error }) => void
  'agent:retry': (data: { role: string, attempt: number, error: Error }) => void
  'progress': (data: { current: number, total: number, percentage: number }) => void
}

/**
 * Agent interface for execution
 */
export interface Agent {
  /** Agent configuration */
  config: AgentConfig

  /** Process a task */
  process: (task: Task) => Promise<AgentResult>

  /** Validate agent configuration */
  validate: () => boolean

  /** Get agent status */
  getStatus: () => 'idle' | 'busy' | 'error'
}

/**
 * Agent Orchestrator
 *
 * Coordinates multiple AI agents in various workflow patterns.
 * Supports sequential, parallel, and pipeline execution with event tracking.
 */
export class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, Agent> = new Map()
  private config: WorkflowConfig
  private isExecuting = false

  constructor(config: WorkflowConfig) {
    super()
    this.config = config
    this.initializeAgents()
  }

  /**
   * Initialize agents from configuration
   */
  private initializeAgents(): void {
    for (const agentConfig of this.config.agents) {
      const agent = this.createAgent(agentConfig)
      this.agents.set(agentConfig.role, agent)
    }
  }

  /**
   * Create an agent instance
   */
  private createAgent(config: AgentConfig): Agent {
    return {
      config,
      process: async (task: Task): Promise<AgentResult> => {
        const startTime = Date.now()
        let retryCount = 0
        const maxRetries = config.retryAttempts ?? 0

        while (retryCount <= maxRetries) {
          try {
            // Simulate agent processing (in real implementation, this would call Claude API)
            const result = await this.executeAgent(config, task)

            return {
              role: config.role,
              success: true,
              data: result,
              durationMs: Date.now() - startTime,
              timestamp: new Date().toISOString(),
              retryCount,
            }
          }
          catch (error) {
            retryCount++

            if (retryCount <= maxRetries) {
              this.emit('agent:retry', {
                role: config.role,
                attempt: retryCount,
                error: error as Error,
              })

              // Wait before retry
              if (config.retryDelay) {
                await new Promise(resolve => setTimeout(resolve, config.retryDelay))
              }
            }
            else {
              return {
                role: config.role,
                success: false,
                data: null,
                error: (error as Error).message,
                durationMs: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                retryCount: retryCount - 1,
              }
            }
          }
        }

        // Should never reach here, but TypeScript needs it
        throw new Error('Unexpected execution path')
      },
      validate: (): boolean => {
        return !!(config.role && config.model && config.systemPrompt)
      },
      getStatus: (): 'idle' | 'busy' | 'error' => {
        return 'idle'
      },
    }
  }

  /**
   * Execute an agent (placeholder for actual implementation)
   */
  private async executeAgent(config: AgentConfig, task: Task): Promise<unknown> {
    // In real implementation, this would:
    // 1. Call Claude API with the agent's system prompt
    // 2. Pass the task input and context
    // 3. Return the agent's response

    // For now, return a mock result
    return {
      role: config.role,
      model: config.model,
      response: `Processed task: ${task.description}`,
      input: task.input,
    }
  }

  /**
   * Execute a task using the configured workflow
   */
  async execute(task: Task): Promise<WorkflowResult> {
    if (this.isExecuting) {
      throw new Error('Orchestrator is already executing a task')
    }

    this.isExecuting = true
    const startTime = Date.now()

    try {
      this.emit('workflow:start', task)

      let result: WorkflowResult

      switch (this.config.type) {
        case 'sequential':
          result = await this.executeSequential(task)
          break
        case 'parallel':
          result = await this.executeParallel(task)
          break
        case 'pipeline':
          result = await this.executePipeline(task)
          break
        default:
          throw new Error(`Unknown workflow type: ${this.config.type}`)
      }

      result.durationMs = Date.now() - startTime
      result.timestamp = new Date().toISOString()

      this.emit('workflow:complete', result)
      return result
    }
    catch (error) {
      this.emit('workflow:error', error as Error)
      throw error
    }
    finally {
      this.isExecuting = false
    }
  }

  /**
   * Execute agents sequentially
   *
   * Each agent processes the output of the previous agent.
   */
  private async executeSequential(task: Task): Promise<WorkflowResult> {
    const results: AgentResult[] = []
    let currentTask = task
    let success = true

    for (let i = 0; i < this.config.agents.length; i++) {
      const agentConfig = this.config.agents[i]
      const agent = this.agents.get(agentConfig.role)

      if (!agent) {
        throw new Error(`Agent not found: ${agentConfig.role}`)
      }

      this.emit('agent:start', { role: agentConfig.role, task: currentTask })
      this.emit('progress', {
        current: i + 1,
        total: this.config.agents.length,
        percentage: ((i + 1) / this.config.agents.length) * 100,
      })

      const result = await agent.process(currentTask)
      results.push(result)

      this.emit('agent:complete', { role: agentConfig.role, result })

      if (!result.success) {
        success = false
        if (!this.config.continueOnError) {
          break
        }
      }

      // Pass result to next agent
      currentTask = {
        ...currentTask,
        input: result.data,
        context: {
          ...currentTask.context,
          previousAgent: agentConfig.role,
          previousResult: result,
        },
      }
    }

    return {
      success,
      results,
      data: results[results.length - 1]?.data,
      durationMs: 0, // Will be set by execute()
      timestamp: new Date().toISOString(),
      metadata: this.config.metadata,
    }
  }

  /**
   * Execute agents in parallel
   *
   * All agents process the same input simultaneously.
   */
  private async executeParallel(task: Task): Promise<WorkflowResult> {
    const maxParallel = this.config.maxParallel ?? this.config.agents.length
    const results: AgentResult[] = []
    const agentConfigs = [...this.config.agents]

    // Process agents in batches
    for (let i = 0; i < agentConfigs.length; i += maxParallel) {
      const batch = agentConfigs.slice(i, i + maxParallel)
      const batchPromises = batch.map(async (agentConfig) => {
        const agent = this.agents.get(agentConfig.role)

        if (!agent) {
          throw new Error(`Agent not found: ${agentConfig.role}`)
        }

        this.emit('agent:start', { role: agentConfig.role, task })

        const result = await agent.process(task)

        this.emit('agent:complete', { role: agentConfig.role, result })

        return result
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      this.emit('progress', {
        current: Math.min(i + maxParallel, agentConfigs.length),
        total: agentConfigs.length,
        percentage: (Math.min(i + maxParallel, agentConfigs.length) / agentConfigs.length) * 100,
      })
    }

    const success = results.every(r => r.success) || this.config.continueOnError === true
    const mergedData = this.mergeResults(results)

    return {
      success,
      results,
      data: mergedData,
      durationMs: 0, // Will be set by execute()
      timestamp: new Date().toISOString(),
      metadata: this.config.metadata,
    }
  }

  /**
   * Execute agents in pipeline mode
   *
   * Similar to sequential, but with explicit data transformation between stages.
   */
  private async executePipeline(task: Task): Promise<WorkflowResult> {
    const results: AgentResult[] = []
    let pipelineData = task.input
    let success = true

    for (let i = 0; i < this.config.agents.length; i++) {
      const agentConfig = this.config.agents[i]
      const agent = this.agents.get(agentConfig.role)

      if (!agent) {
        throw new Error(`Agent not found: ${agentConfig.role}`)
      }

      const stageTask: Task = {
        ...task,
        id: `${task.id}-stage-${i}`,
        input: pipelineData,
        context: {
          ...task.context,
          stage: i,
          totalStages: this.config.agents.length,
          previousStages: results.map(r => ({ role: r.role, data: r.data })),
        },
      }

      this.emit('agent:start', { role: agentConfig.role, task: stageTask })
      this.emit('progress', {
        current: i + 1,
        total: this.config.agents.length,
        percentage: ((i + 1) / this.config.agents.length) * 100,
      })

      const result = await agent.process(stageTask)
      results.push(result)

      this.emit('agent:complete', { role: agentConfig.role, result })

      if (!result.success) {
        success = false
        if (!this.config.continueOnError) {
          break
        }
      }

      // Transform data for next stage
      pipelineData = this.transformPipelineData(result.data, agentConfig.role)
    }

    return {
      success,
      results,
      data: pipelineData,
      durationMs: 0, // Will be set by execute()
      timestamp: new Date().toISOString(),
      metadata: this.config.metadata,
    }
  }

  /**
   * Merge results from parallel execution
   */
  private mergeResults(results: AgentResult[]): unknown {
    // Default merge strategy: combine all results into an object
    const merged: Record<string, unknown> = {}

    for (const result of results) {
      merged[result.role] = result.data
    }

    return merged
  }

  /**
   * Transform data between pipeline stages
   */
  private transformPipelineData(data: unknown, _sourceRole: string): unknown {
    // Default transformation: pass through
    // In real implementation, this could apply role-specific transformations
    return data
  }

  /**
   * Get workflow configuration
   */
  getConfig(): WorkflowConfig {
    return { ...this.config }
  }

  /**
   * Get agent by role
   */
  getAgent(role: string): Agent | undefined {
    return this.agents.get(role)
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Check if orchestrator is executing
   */
  isRunning(): boolean {
    return this.isExecuting
  }

  /**
   * Validate workflow configuration
   */
  validate(): { valid: boolean, errors: string[] } {
    const errors: string[] = []

    if (!this.config.type) {
      errors.push('Workflow type is required')
    }

    if (!this.config.agents || this.config.agents.length === 0) {
      errors.push('At least one agent is required')
    }

    for (const agentConfig of this.config.agents) {
      if (!agentConfig.role) {
        errors.push('Agent role is required')
      }

      if (!agentConfig.model) {
        errors.push(`Agent ${agentConfig.role}: model is required`)
      }

      if (!agentConfig.systemPrompt) {
        errors.push(`Agent ${agentConfig.role}: systemPrompt is required`)
      }

      const agent = this.agents.get(agentConfig.role)
      if (agent && !agent.validate()) {
        errors.push(`Agent ${agentConfig.role}: validation failed`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Update workflow configuration
   */
  updateConfig(config: Partial<WorkflowConfig>): void {
    this.config = { ...this.config, ...config }

    // Reinitialize agents if agents config changed
    if (config.agents) {
      this.agents.clear()
      this.initializeAgents()
    }
  }

  /**
   * Add an agent to the workflow
   */
  addAgent(agentConfig: AgentConfig, position?: number): void {
    const agent = this.createAgent(agentConfig)
    this.agents.set(agentConfig.role, agent)

    if (position !== undefined && position >= 0 && position <= this.config.agents.length) {
      this.config.agents.splice(position, 0, agentConfig)
    }
    else {
      this.config.agents.push(agentConfig)
    }
  }

  /**
   * Remove an agent from the workflow
   */
  removeAgent(role: string): boolean {
    const removed = this.agents.delete(role)

    if (removed) {
      this.config.agents = this.config.agents.filter(a => a.role !== role)
    }

    return removed
  }

  /**
   * Clear all agents
   */
  clearAgents(): void {
    this.agents.clear()
    this.config.agents = []
  }

  /**
   * Reset orchestrator state
   */
  reset(): void {
    this.isExecuting = false
    this.removeAllListeners()
  }
}

/**
 * Create a workflow orchestrator with the given configuration
 */
export function createOrchestrator(config: WorkflowConfig): AgentOrchestrator {
  return new AgentOrchestrator(config)
}

/**
 * Create a sequential workflow
 */
export function createSequentialWorkflow(agents: AgentConfig[], options?: Partial<WorkflowConfig>): AgentOrchestrator {
  return new AgentOrchestrator({
    type: 'sequential',
    agents,
    ...options,
  })
}

/**
 * Create a parallel workflow
 */
export function createParallelWorkflow(agents: AgentConfig[], options?: Partial<WorkflowConfig>): AgentOrchestrator {
  return new AgentOrchestrator({
    type: 'parallel',
    agents,
    ...options,
  })
}

/**
 * Create a pipeline workflow
 */
export function createPipelineWorkflow(agents: AgentConfig[], options?: Partial<WorkflowConfig>): AgentOrchestrator {
  return new AgentOrchestrator({
    type: 'pipeline',
    agents,
    ...options,
  })
}
