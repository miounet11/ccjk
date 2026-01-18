/**
 * CCJK Workflow Executor
 *
 * Executes workflow templates with context management and result aggregation.
 * Provides high-level interface for running predefined workflows.
 *
 * @module workflows/executor
 */

import type { AgentOrchestrator, Task, WorkflowConfig, WorkflowResult } from '../core/agent-orchestrator.js'
import type { WorkflowTemplate, WorkflowTemplateId } from './templates.js'
import { createOrchestrator } from '../core/agent-orchestrator.js'
import { getWorkflowTemplate } from './templates.js'

/**
 * Workflow execution options
 */
export interface WorkflowExecutionOptions {
  /** Workflow template ID or custom config */
  workflow: WorkflowTemplateId | WorkflowConfig

  /** Task input data */
  input: unknown

  /** Additional context */
  context?: Record<string, unknown>

  /** Task description */
  description?: string

  /** Task priority */
  priority?: number

  /** Task deadline */
  deadline?: string

  /** Override workflow timeout */
  timeout?: number

  /** Override continue on error */
  continueOnError?: boolean

  /** Custom variable values for template */
  variables?: Record<string, unknown>

  /** Progress callback */
  onProgress?: (data: { current: number, total: number, percentage: number }) => void

  /** Agent start callback */
  onAgentStart?: (data: { role: string, task: Task }) => void

  /** Agent complete callback */
  onAgentComplete?: (data: { role: string, result: any }) => void

  /** Agent error callback */
  onAgentError?: (data: { role: string, error: Error }) => void
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  /** Workflow template (if using template) */
  template?: WorkflowTemplate

  /** Workflow configuration */
  config: WorkflowConfig

  /** Orchestrator instance */
  orchestrator: AgentOrchestrator

  /** Execution start time */
  startTime: number

  /** Task being executed */
  task: Task

  /** Execution options */
  options: WorkflowExecutionOptions
}

/**
 * Workflow execution summary
 */
export interface WorkflowExecutionSummary {
  /** Workflow name */
  workflowName: string

  /** Execution success */
  success: boolean

  /** Total duration in milliseconds */
  durationMs: number

  /** Number of agents executed */
  agentsExecuted: number

  /** Number of successful agents */
  agentsSucceeded: number

  /** Number of failed agents */
  agentsFailed: number

  /** Agent execution details */
  agentDetails: Array<{
    role: string
    success: boolean
    durationMs: number
    error?: string
  }>

  /** Final result data */
  result: unknown

  /** Execution timestamp */
  timestamp: string
}

/**
 * Workflow Executor
 *
 * High-level interface for executing workflow templates with context management.
 */
export class WorkflowExecutor {
  private activeContexts: Map<string, WorkflowContext> = new Map()
  private executionHistory: WorkflowExecutionSummary[] = []
  private maxHistorySize = 100

  /**
   * Execute a workflow
   */
  async execute(options: WorkflowExecutionOptions): Promise<WorkflowResult> {
    const context = await this.prepareContext(options)

    try {
      // Set up event listeners
      this.setupEventListeners(context, options)

      // Execute workflow
      const result = await context.orchestrator.execute(context.task)

      // Store execution summary
      this.storeExecutionSummary(context, result)

      return result
    }
    finally {
      // Clean up context
      this.activeContexts.delete(context.task.id)
    }
  }

  /**
   * Execute a workflow template by ID
   */
  async executeTemplate(
    templateId: WorkflowTemplateId,
    input: unknown,
    options?: Partial<WorkflowExecutionOptions>,
  ): Promise<WorkflowResult> {
    const template = getWorkflowTemplate(templateId)

    if (!template) {
      throw new Error(`Workflow template not found: ${templateId}`)
    }

    return this.execute({
      workflow: templateId,
      input,
      description: template.description,
      ...options,
    })
  }

  /**
   * Execute a custom workflow configuration
   */
  async executeCustom(
    config: WorkflowConfig,
    input: unknown,
    options?: Partial<WorkflowExecutionOptions>,
  ): Promise<WorkflowResult> {
    return this.execute({
      workflow: config,
      input,
      description: config.metadata?.description || 'Custom workflow',
      ...options,
    })
  }

  /**
   * Prepare execution context
   */
  private async prepareContext(options: WorkflowExecutionOptions): Promise<WorkflowContext> {
    let template: WorkflowTemplate | undefined
    let config: WorkflowConfig

    // Load workflow configuration
    if (typeof options.workflow === 'string') {
      template = getWorkflowTemplate(options.workflow)

      if (!template) {
        throw new Error(`Workflow template not found: ${options.workflow}`)
      }

      config = this.applyTemplateVariables(template.config, options.variables)
    }
    else {
      config = options.workflow
    }

    // Apply option overrides
    if (options.timeout !== undefined) {
      config.timeout = options.timeout
    }

    if (options.continueOnError !== undefined) {
      config.continueOnError = options.continueOnError
    }

    // Merge context
    const mergedContext = {
      ...config.context,
      ...options.context,
      executionId: this.generateExecutionId(),
      startTime: Date.now(),
    }

    config.context = mergedContext

    // Create orchestrator
    const orchestrator = createOrchestrator(config)

    // Validate configuration
    const validation = orchestrator.validate()
    if (!validation.valid) {
      throw new Error(`Invalid workflow configuration: ${validation.errors.join(', ')}`)
    }

    // Create task
    const task: Task = {
      id: mergedContext.executionId as string,
      description: options.description || 'Workflow execution',
      input: options.input,
      context: mergedContext,
      priority: options.priority,
      deadline: options.deadline,
    }

    // Create context
    const context: WorkflowContext = {
      template,
      config,
      orchestrator,
      startTime: Date.now(),
      task,
      options,
    }

    // Store active context
    this.activeContexts.set(task.id, context)

    return context
  }

  /**
   * Apply template variables to configuration
   */
  private applyTemplateVariables(
    config: WorkflowConfig,
    variables?: Record<string, unknown>,
  ): WorkflowConfig {
    if (!variables || Object.keys(variables).length === 0) {
      return config
    }

    // Deep clone config
    const clonedConfig = JSON.parse(JSON.stringify(config))

    // Replace variables in system prompts
    for (const agent of clonedConfig.agents) {
      if (agent.systemPrompt) {
        agent.systemPrompt = this.replaceVariables(agent.systemPrompt, variables)
      }

      if (agent.customInstructions) {
        agent.customInstructions = agent.customInstructions.map((instruction: string) =>
          this.replaceVariables(instruction, variables),
        )
      }
    }

    return clonedConfig
  }

  /**
   * Replace variables in text
   */
  private replaceVariables(text: string, variables: Record<string, unknown>): string {
    let result = text

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      result = result.replace(new RegExp(placeholder, 'g'), String(value))
    }

    return result
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(context: WorkflowContext, options: WorkflowExecutionOptions): void {
    const { orchestrator } = context

    if (options.onProgress) {
      orchestrator.on('progress', options.onProgress)
    }

    if (options.onAgentStart) {
      orchestrator.on('agent:start', options.onAgentStart)
    }

    if (options.onAgentComplete) {
      orchestrator.on('agent:complete', options.onAgentComplete)
    }

    if (options.onAgentError) {
      orchestrator.on('agent:error', options.onAgentError)
    }
  }

  /**
   * Store execution summary
   */
  private storeExecutionSummary(context: WorkflowContext, result: WorkflowResult): void {
    const summary: WorkflowExecutionSummary = {
      workflowName: context.template?.name || context.config.metadata?.name || 'Custom Workflow',
      success: result.success,
      durationMs: result.durationMs,
      agentsExecuted: result.results.length,
      agentsSucceeded: result.results.filter(r => r.success).length,
      agentsFailed: result.results.filter(r => !r.success).length,
      agentDetails: result.results.map(r => ({
        role: r.role,
        success: r.success,
        durationMs: r.durationMs,
        error: r.error,
      })),
      result: result.data,
      timestamp: result.timestamp,
    }

    this.executionHistory.push(summary)

    // Trim history if needed
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.shift()
    }
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Get active execution contexts
   */
  getActiveContexts(): WorkflowContext[] {
    return Array.from(this.activeContexts.values())
  }

  /**
   * Get execution context by ID
   */
  getContext(executionId: string): WorkflowContext | undefined {
    return this.activeContexts.get(executionId)
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): WorkflowExecutionSummary[] {
    if (limit) {
      return this.executionHistory.slice(-limit)
    }
    return [...this.executionHistory]
  }

  /**
   * Get execution statistics
   */
  getStatistics(): {
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    averageDuration: number
    totalAgentsExecuted: number
  } {
    const total = this.executionHistory.length
    const successful = this.executionHistory.filter(s => s.success).length
    const failed = total - successful
    const avgDuration = total > 0
      ? this.executionHistory.reduce((sum, s) => sum + s.durationMs, 0) / total
      : 0
    const totalAgents = this.executionHistory.reduce((sum, s) => sum + s.agentsExecuted, 0)

    return {
      totalExecutions: total,
      successfulExecutions: successful,
      failedExecutions: failed,
      averageDuration: Math.round(avgDuration),
      totalAgentsExecuted: totalAgents,
    }
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = []
  }

  /**
   * Set maximum history size
   */
  setMaxHistorySize(size: number): void {
    if (size < 1) {
      throw new Error('Max history size must be at least 1')
    }

    this.maxHistorySize = size

    // Trim existing history if needed
    if (this.executionHistory.length > size) {
      this.executionHistory = this.executionHistory.slice(-size)
    }
  }

  /**
   * Cancel an active execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const context = this.activeContexts.get(executionId)

    if (!context) {
      return false
    }

    // In a real implementation, this would signal the orchestrator to stop
    // For now, we just remove the context
    this.activeContexts.delete(executionId)

    return true
  }

  /**
   * Get workflow template information
   */
  getTemplateInfo(templateId: WorkflowTemplateId): WorkflowTemplate | undefined {
    return getWorkflowTemplate(templateId)
  }

  /**
   * Validate workflow configuration
   */
  validateWorkflow(config: WorkflowConfig): { valid: boolean, errors: string[] } {
    try {
      const orchestrator = createOrchestrator(config)
      return orchestrator.validate()
    }
    catch (error) {
      return {
        valid: false,
        errors: [(error as Error).message],
      }
    }
  }

  /**
   * Create a custom workflow from template
   */
  customizeTemplate(
    templateId: WorkflowTemplateId,
    customizations: {
      agents?: Partial<WorkflowConfig['agents']>
      context?: Record<string, unknown>
      timeout?: number
      continueOnError?: boolean
      metadata?: WorkflowConfig['metadata']
    },
  ): WorkflowConfig {
    const template = getWorkflowTemplate(templateId)

    if (!template) {
      throw new Error(`Workflow template not found: ${templateId}`)
    }

    const config = { ...template.config }

    if (customizations.agents) {
      config.agents = [...config.agents, ...customizations.agents.filter((a): a is NonNullable<typeof a> => a !== undefined)]
    }

    if (customizations.context) {
      config.context = { ...config.context, ...customizations.context }
    }

    if (customizations.timeout !== undefined) {
      config.timeout = customizations.timeout
    }

    if (customizations.continueOnError !== undefined) {
      config.continueOnError = customizations.continueOnError
    }

    if (customizations.metadata) {
      config.metadata = { ...config.metadata, ...customizations.metadata }
    }

    return config
  }
}

/**
 * Create a workflow executor instance
 */
export function createExecutor(): WorkflowExecutor {
  return new WorkflowExecutor()
}

/**
 * Global executor instance (singleton)
 */
let globalExecutor: WorkflowExecutor | undefined

/**
 * Get or create global executor instance
 */
export function getGlobalExecutor(): WorkflowExecutor {
  if (!globalExecutor) {
    globalExecutor = new WorkflowExecutor()
  }
  return globalExecutor
}

/**
 * Execute a workflow using global executor
 */
export async function executeWorkflow(options: WorkflowExecutionOptions): Promise<WorkflowResult> {
  return getGlobalExecutor().execute(options)
}

/**
 * Execute a workflow template using global executor
 */
export async function executeWorkflowTemplate(
  templateId: WorkflowTemplateId,
  input: unknown,
  options?: Partial<WorkflowExecutionOptions>,
): Promise<WorkflowResult> {
  return getGlobalExecutor().executeTemplate(templateId, input, options)
}
