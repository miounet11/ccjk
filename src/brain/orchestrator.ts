/**
 * CCJK Brain Orchestrator
 *
 * Central coordinator for the brain system that manages task decomposition,
 * agent lifecycle, parallel execution, result aggregation, and error recovery.
 *
 * @module brain/orchestrator
 */

import type { AgentCapability, CloudAgent } from '../types/agent.js'
import type { SkillMdFile } from '../types/skill-md.js'
import type {
  AgentDispatcherOptions,
  ParallelAgentExecution,
  ParallelExecutionResult,
} from './agent-dispatcher.js'
import type {
  ForkContextConfig,
  ForkContextOptions,
  ForkContextResult,
} from './agent-fork.js'
import type {
  AgentInstance,
  AgentSelectionCriteria,
  DecompositionStrategy,
  OrchestrationMetrics,
  OrchestrationPlan,
  OrchestrationResult,
  OrchestratorConfig,
  OrchestratorState,
  Task,
  TaskError,
  TaskOutput,
} from './orchestrator-types.js'
import type { AgentRole } from './types.js'
import { EventEmitter } from 'node:events'
import { nanoid } from 'nanoid'
import { AgentDispatcher } from './agent-dispatcher.js'
import { AgentForkManager } from './agent-fork.js'
import { ResultAggregator } from './result-aggregator.js'
import { TaskDecomposer } from './task-decomposer.js'
import { executionTracer } from './execution-tracer.js'
import { taskPersistence } from './task-persistence.js'
import { contextLoader } from './context-loader.js'

/**
 * Convert AgentCapability array to string array of capability IDs
 */
function fromAgentCapabilities(capabilities: AgentCapability[]): string[] {
  return capabilities.map(cap => cap.id)
}

/**
 * Convert string array of capability IDs to AgentCapability array
 */
function toAgentCapabilities(capabilities: string[]): AgentCapability[] {
  return capabilities.map(id => ({
    id,
    name: id,
    model: 'sonnet' as const,
    specialties: [id],
    strength: 0.8,
    costFactor: 1.0,
  }))
}

/**
 * Orchestrator events
 */
export interface OrchestratorEvents {
  'plan:created': (plan: OrchestrationPlan) => void
  'plan:started': (planId: string) => void
  'plan:completed': (result: OrchestrationResult) => void
  'plan:failed': (planId: string, error: Error) => void
  'task:created': (task: Task) => void
  'task:started': (task: Task) => void
  'task:progress': (task: Task, progress: number) => void
  'task:completed': (task: Task) => void
  'task:failed': (task: Task, error: TaskError) => void
  'task:cancelled': (task: Task) => void
  'agent:created': (agent: AgentInstance) => void
  'agent:assigned': (agent: AgentInstance, task: Task) => void
  'agent:completed': (agent: AgentInstance, task: Task) => void
  'agent:error': (agent: AgentInstance, error: Error) => void
  'agent:terminated': (agent: AgentInstance) => void
  'error': (error: Error) => void
  // Fork context events (v3.8)
  'fork:created': (forkId: string, skill: SkillMdFile) => void
  'fork:started': (forkId: string) => void
  'fork:completed': (forkId: string, result: ForkContextResult) => void
  'fork:failed': (forkId: string, error: string) => void
  'fork:cancelled': (forkId: string) => void
  // Parallel execution events (v3.8)
  'parallel:started': (executionId: string) => void
  'parallel:completed': (executionId: string, result: ParallelExecutionResult) => void
  'parallel:failed': (executionId: string, error: string) => void
}

/**
 * Extended orchestrator configuration with fork context support (v3.8)
 */
export interface ExtendedOrchestratorConfig extends OrchestratorConfig {
  /** Fork context manager options */
  forkContextOptions?: ForkContextOptions

  /** Agent dispatcher options */
  dispatcherOptions?: AgentDispatcherOptions

  /** Enable fork context execution */
  enableForkContext?: boolean

  /** Enable agent dispatcher */
  enableDispatcher?: boolean
}

/**
 * Brain orchestrator class
 *
 * Coordinates multiple agents to execute complex tasks through intelligent
 * decomposition, parallel execution, and result aggregation.
 *
 * v3.8 adds support for fork context isolation and agent dispatching.
 */
export class BrainOrchestrator extends EventEmitter {
  private readonly config: Required<ExtendedOrchestratorConfig>
  private readonly taskDecomposer: TaskDecomposer
  private readonly resultAggregator: ResultAggregator
  private readonly state: OrchestratorState
  private readonly availableAgents: Map<AgentRole, CloudAgent>
  private readonly forkManager: AgentForkManager
  private readonly dispatcher: AgentDispatcher

  constructor(config: Partial<ExtendedOrchestratorConfig> = {}) {
    super()

    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks ?? 10,
      maxConcurrentAgents: config.maxConcurrentAgents ?? 5,
      defaultTaskTimeout: config.defaultTaskTimeout ?? 300000, // 5 minutes
      defaultRetryCount: config.defaultRetryCount ?? 3,
      autoRetry: config.autoRetry ?? true,
      conflictResolutionStrategy: config.conflictResolutionStrategy ?? 'highest-confidence',
      enableParallelExecution: config.enableParallelExecution ?? true,
      enableCaching: config.enableCaching ?? false,
      cacheTtl: config.cacheTtl ?? 3600000, // 1 hour
      verboseLogging: config.verboseLogging ?? false,
      custom: config.custom ?? {},
      // v3.8 options
      forkContextOptions: config.forkContextOptions ?? {},
      dispatcherOptions: config.dispatcherOptions ?? {},
      enableForkContext: config.enableForkContext ?? true,
      enableDispatcher: config.enableDispatcher ?? true,
    }

    this.taskDecomposer = new TaskDecomposer({
      strategy: 'hierarchical',
      maxDepth: 5,
      maxParallelTasks: this.config.maxConcurrentTasks,
      enableOptimization: true,
    })

    this.resultAggregator = new ResultAggregator({
      defaultStrategy: this.config.conflictResolutionStrategy,
      autoDetectConflicts: true,
      enableValidation: true,
      enableMerging: true,
    })

    this.state = {
      activeTasks: new Map(),
      activeAgents: new Map(),
      taskQueue: [],
      completedTasks: new Map(),
      failedTasks: new Map(),
      status: 'idle',
      totalTasksProcessed: 0,
      metrics: this.createEmptyMetrics(),
    }

    this.availableAgents = new Map()

    // Initialize fork manager (v3.8)
    this.forkManager = new AgentForkManager(this.config.forkContextOptions)
    this.setupForkManagerEvents()

    // Initialize agent dispatcher (v3.8)
    this.dispatcher = new AgentDispatcher(this.config.dispatcherOptions)
  }

  /**
   * Register an agent for use by the orchestrator
   *
   * @param role - Agent role
   * @param agent - Agent definition
   */
  registerAgent(role: AgentRole, agent: CloudAgent): void {
    this.availableAgents.set(role, agent)
    this.log(`Registered agent: ${role}`)
  }

  /**
   * Unregister an agent
   *
   * @param role - Agent role
   */
  unregisterAgent(role: AgentRole): void {
    this.availableAgents.delete(role)
    this.log(`Unregistered agent: ${role}`)
  }

  /**
   * Execute a complex task through orchestration
   *
   * @param task - Root task to execute
   * @param strategy - Optional decomposition strategy
   * @returns Orchestration result
   */
  async execute(
    task: Task,
    strategy?: DecompositionStrategy,
  ): Promise<OrchestrationResult> {
    // Start execution trace
    const sessionId = `orchestration-${nanoid()}`
    executionTracer.startSession(sessionId)
    executionTracer.logEvent('agent-start', {
      task: task.name,
      strategy: strategy || 'auto',
    })

    // Save session and task to persistence
    taskPersistence.saveSession(sessionId, {
      rootTask: task.name,
      strategy: strategy || 'auto',
    })
    taskPersistence.saveTask(task, sessionId)

    // Load hierarchical context with token budget (L1 depth for orchestration)
    const context = await contextLoader.load({
      projectRoot: process.cwd(),
      task,
      layers: ['project', 'domain', 'task'],
      tokenBudget: 4_000, // ~L1 depth, keeps orchestration context lean
    })

    // Attach context to task
    task.metadata = task.metadata || {}
    task.metadata.context = contextLoader.formatForLLM(context)

    try {
      this.state.status = 'planning'
      this.log(`Starting orchestration for task: ${task.name}`)
      executionTracer.logDecision('orchestrator', `Planning task: ${task.name}`)

      // Create orchestration plan
      const plan = await this.createPlan(task, strategy)
      this.emit('plan:created', plan)

      // Execute plan
      this.state.status = 'executing'
      this.state.currentPlan = plan
      this.state.startTime = new Date().toISOString()
      this.emit('plan:started', plan.id)

      const result = await this.executePlan(plan)

      this.state.status = 'idle'
      this.emit('plan:completed', result)

      // End execution trace
      executionTracer.logAgentEnd('orchestrator', { success: true })
      executionTracer.endSession(sessionId)

      // Update task status in persistence
      taskPersistence.updateTaskStatus(task.id, 'completed', result)

      return result
    }
    catch (error) {
      this.state.status = 'error'
      const err = error instanceof Error ? error : new Error(String(error))
      this.emit('error', err)

      // Log error in trace
      executionTracer.logError(err, 'orchestrator')
      executionTracer.endSession(sessionId)

      // Update task status in persistence
      taskPersistence.updateTaskStatus(task.id, 'failed', undefined, err)

      return this.createFailedResult(task, err)
    }
  }

  /**
   * Create an orchestration plan from a task
   *
   * @param task - Root task
   * @param strategy - Decomposition strategy
   * @returns Orchestration plan
   */
  private async createPlan(
    task: Task,
    strategy?: DecompositionStrategy,
  ): Promise<OrchestrationPlan> {
    this.log(`Creating orchestration plan for: ${task.name}`)

    // Decompose task into subtasks
    const decomposition = await this.taskDecomposer.decompose(task, strategy)

    // Analyze required agents
    const requiredAgents = this.analyzeRequiredAgents(decomposition.subtasks)

    // Create task execution graph
    const executionGraph = decomposition.executionGraph

    // Calculate estimated duration
    const estimatedDuration = decomposition.estimatedDuration

    // Create orchestration plan
    const plan: OrchestrationPlan = {
      id: nanoid(),
      name: `Plan: ${task.name}`,
      description: `Orchestration plan for ${task.name}`,
      rootTask: task,
      tasks: decomposition.subtasks,
      executionGraph,
      requiredAgents,
      decompositionStrategy: decomposition.strategy,
      estimatedDuration,
      createdAt: new Date().toISOString(),
      metadata: {
        originalTaskId: task.id,
        decompositionMetadata: decomposition.metadata,
      },
    }

    return plan
  }

  /**
   * Execute an orchestration plan
   *
   * @param plan - Orchestration plan to execute
   * @returns Orchestration result
   */
  private async executePlan(plan: OrchestrationPlan): Promise<OrchestrationResult> {
    const startTime = Date.now()
    const completed: string[] = []
    const failed: string[] = []
    const cancelled: string[] = []
    const results: Record<string, TaskOutput> = {}
    const errors: TaskError[] = []
    const warnings: string[] = []

    this.log(`Executing plan: ${plan.id}`)

    // Add tasks to queue
    for (const task of plan.tasks) {
      this.state.taskQueue.push(task)
      this.emit('task:created', task)
    }

    // Execute tasks according to execution graph stages
    for (const stage of plan.executionGraph.stages) {
      const stageTasks = plan.tasks.filter(t => stage.tasks.includes(t.id))

      // Execute tasks in parallel within stage
      const stagePromises = stageTasks.map(async (task) => {
        this.emit('task:started', task)
        task.status = 'running'
        task.startedAt = new Date().toISOString()

        try {
          // Find and assign agent
          const agent = this.selectAgentForTask(task)
          if (!agent) {
            throw new Error(`No available agent for task: ${task.name}`)
          }

          task.assignedAgentId = agent.id
          this.emit('agent:assigned', agent, task)

          // Simulate task execution (in real implementation, this would call the agent)
          await this.executeTask(agent, task)

          // Mark task as completed
          task.status = 'completed'
          task.completedAt = new Date().toISOString()
          task.actualDuration = Date.now() - new Date(task.startedAt).getTime()
          task.progress = 100

          completed.push(task.id)
          this.emit('task:completed', task)

          // Update agent metrics
          this.updateAgentMetrics(agent, task, true)

          if (task.output) {
            results[task.id] = task.output
          }

          return { taskId: task.id, success: true }
        }
        catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          task.status = 'failed'
          task.error = {
            code: 'TASK_EXECUTION_FAILED',
            message: err.message,
            stack: err.stack,
            recoverable: this.config.autoRetry && task.retryCount < task.maxRetries,
          }
          task.completedAt = new Date().toISOString()

          failed.push(task.id)
          this.emit('task:failed', task, task.error)

          if (task.error) {
            errors.push(task.error)
          }

          // Retry if enabled and retries remaining
          if (this.config.autoRetry && task.retryCount < task.maxRetries && task.error?.recoverable) {
            task.retryCount++
            task.status = 'pending'
            warnings.push(`Retrying task ${task.name} (attempt ${task.retryCount}/${task.maxRetries})`)
            return { taskId: task.id, success: false, retry: true }
          }

          return { taskId: task.id, success: false }
        }
      })

      // Wait for all tasks in stage to complete
      await Promise.all(stagePromises)

      // Check for critical failures
      if (this.hasCriticalFailures(stageTasks)) {
        this.log('Critical failure detected, cancelling remaining tasks')
        // Cancel remaining tasks
        for (const remainingTask of plan.tasks.filter(t => t.status === 'pending')) {
          remainingTask.status = 'cancelled'
          cancelled.push(remainingTask.id)
          this.emit('task:cancelled', remainingTask)
        }
        break
      }
    }

    // Calculate duration
    const duration = Date.now() - startTime

    // Calculate metrics
    const metrics = this.calculateMetrics(plan, completed, failed, cancelled, duration)

    // Determine overall status
    const status = this.determineStatus(completed, failed, cancelled, plan.tasks.length)

    // Aggregate results
    const aggregationResult = await this.resultAggregator.aggregate(
      plan.tasks.filter(t => t.output !== undefined),
    )

    // Build results map - use aggregated output if available, otherwise use individual task outputs
    const finalResults: Record<string, TaskOutput> = {}
    for (const task of plan.tasks) {
      if (task.output) {
        finalResults[task.id] = task.output
      }
    }

    // If aggregation produced a merged output, add it as a special entry
    if (aggregationResult.output) {
      finalResults._aggregated = aggregationResult.output
    }

    return {
      planId: plan.id,
      success: status === 'completed',
      status,
      completedTasks: completed,
      failedTasks: failed,
      cancelledTasks: cancelled,
      results: finalResults,
      metrics,
      errors,
      warnings,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      duration,
    }
  }

  /**
   * Select an agent for a task
   *
   * @param task - Task to execute
   * @returns Selected agent instance or undefined
   */
  private selectAgentForTask(task: Task): AgentInstance | undefined {
    const candidates: AgentInstance[] = []

    // Find agents with required capabilities
    const agentEntries = Array.from(this.availableAgents.entries())
    for (const [role, agent] of agentEntries) {
      // Check if agent has required capabilities
      const requiredCaps = fromAgentCapabilities(task.requiredCapabilities)
      const hasCapabilities = requiredCaps.every(cap =>
        agent.definition.capabilities.includes(cap),
      )

      if (!hasCapabilities)
        continue

      // Get or create agent instance
      let instance = Array.from(this.state.activeAgents.values()).find(
        a => a.role === role && a.status === 'idle',
      )

      if (!instance && this.state.activeAgents.size < this.config.maxConcurrentAgents) {
        instance = this.createAgentInstance(role, agent)
      }

      if (instance && instance.status === 'idle') {
        candidates.push(instance)
      }
    }

    if (candidates.length === 0) {
      return undefined
    }

    // Select best candidate based on strategy
    const criteria: AgentSelectionCriteria = {
      requiredCapabilities: task.requiredCapabilities,
      strategy: 'best-fit',
    }
    const selected = this.selectBestAgent(candidates, criteria)

    return selected
  }

  /**
   * Execute a task on an agent
   *
   * @param agent - Agent instance
   * @param task - Task to execute
   */
  private async executeTask(agent: AgentInstance, task: Task): Promise<void> {
    // Mark agent as busy
    agent.status = 'busy'
    agent.currentTask = task
    agent.lastActivityAt = new Date().toISOString()

    // Add to active tasks
    this.state.activeTasks.set(task.id, task)

    // Simulate task execution (in real implementation, delegate to agent)
    // For now, create a placeholder output
    await this.sleep(100) // Simulate some work

    task.output = {
      data: {
        message: `Task ${task.name} completed by ${agent.role}`,
        agentId: agent.id,
      },
      confidence: 0.9,
    }

    // Mark agent as idle
    agent.status = 'idle'
    agent.currentTask = undefined

    // Remove from active tasks
    this.state.activeTasks.delete(task.id)
  }

  /**
   * Select best agent from candidates
   *
   * @param candidates - Candidate agents
   * @param criteria - Selection criteria
   * @returns Selected agent
   */
  private selectBestAgent(
    candidates: AgentInstance[],
    criteria: AgentSelectionCriteria,
  ): AgentInstance {
    switch (criteria.strategy) {
      case 'best-fit':
        // Select agent with highest success rate
        return candidates.reduce((best, current) =>
          current.metrics.successRate > best.metrics.successRate ? current : best,
        )

      case 'least-loaded':
        // Select agent with fewest tasks
        return candidates.reduce((best, current) =>
          current.taskHistory.length < best.taskHistory.length ? current : best,
        )

      case 'fastest':
        // Select agent with lowest average duration
        return candidates.reduce((best, current) =>
          current.metrics.avgTaskDuration < best.metrics.avgTaskDuration ? current : best,
        )

      case 'round-robin':
      case 'random':
      default:
        // Random selection
        return candidates[Math.floor(Math.random() * candidates.length)]
    }
  }

  /**
   * Create an agent instance
   *
   * @param role - Agent role
   * @param agent - Agent definition
   * @returns Agent instance
   */
  private createAgentInstance(role: AgentRole, agent: CloudAgent): AgentInstance {
    const now = new Date().toISOString()

    const instance: AgentInstance = {
      id: nanoid(),
      role,
      agent,
      status: 'idle',
      taskHistory: [],
      capabilities: toAgentCapabilities(agent.definition.capabilities),
      metrics: {
        tasksExecuted: 0,
        tasksSucceeded: 0,
        tasksFailed: 0,
        avgTaskDuration: 0,
        successRate: 0,
        totalExecutionTime: 0,
        avgConfidence: 0,
        lastUpdated: now,
      },
      createdAt: now,
      config: {
        maxConcurrentTasks: 1,
        taskTimeout: this.config.defaultTaskTimeout,
        verboseLogging: this.config.verboseLogging,
      },
    }

    this.state.activeAgents.set(instance.id, instance)
    this.emit('agent:created', instance)

    return instance
  }

  /**
   * Update agent metrics after task execution
   *
   * @param agent - Agent instance
   * @param task - Executed task
   * @param success - Whether task succeeded
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

    if (task.output?.confidence) {
      const totalConfidence = metrics.avgConfidence * (metrics.tasksExecuted - 1) + task.output.confidence
      metrics.avgConfidence = totalConfidence / metrics.tasksExecuted
    }

    metrics.lastUpdated = new Date().toISOString()

    // Add to task history
    agent.taskHistory.push({
      taskId: task.id,
      taskName: task.name,
      status: task.status,
      startedAt: task.startedAt!,
      completedAt: task.completedAt,
      duration: task.actualDuration,
      success,
      error: task.error?.message,
    })
  }

  /**
   * Analyze required agents for tasks
   *
   * @param tasks - Tasks to analyze
   * @returns Agent requirements
   */
  private analyzeRequiredAgents(tasks: Task[]): Array<{
    capabilities: AgentCapability[]
    minInstances: number
    maxInstances: number
  }> {
    const capabilityGroups = new Map<string, AgentCapability[]>()

    for (const task of tasks) {
      const key = task.requiredCapabilities.sort().join(',')
      if (!capabilityGroups.has(key)) {
        capabilityGroups.set(key, task.requiredCapabilities)
      }
    }

    return Array.from(capabilityGroups.values()).map(capabilities => ({
      capabilities,
      minInstances: 1,
      maxInstances: this.config.maxConcurrentAgents,
    }))
  }

  /**
   * Check if there are critical failures
   *
   * @param tasks - Tasks to check
   * @returns Whether there are critical failures
   */
  private hasCriticalFailures(tasks: Task[]): boolean {
    return tasks.some(t => t.status === 'failed' && t.priority === 'critical')
  }

  /**
   * Calculate orchestration metrics
   *
   * @param plan - Orchestration plan
   * @param completed - Completed task IDs
   * @param failed - Failed task IDs
   * @param cancelled - Cancelled task IDs
   * @param duration - Total duration
   * @returns Metrics
   */
  private calculateMetrics(
    plan: OrchestrationPlan,
    completed: string[],
    failed: string[],
    cancelled: string[],
    duration: number,
  ): OrchestrationMetrics {
    const totalTasks = plan.tasks.length
    const tasksCompleted = completed.length
    const tasksFailed = failed.length
    const tasksCancelled = cancelled.length

    const completedTasks = plan.tasks.filter(t => completed.includes(t.id))
    const avgTaskDuration = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.actualDuration ?? 0), 0) / completedTasks.length
      : 0

    const parallelEfficiency = plan.estimatedDuration > 0
      ? Math.min(plan.estimatedDuration / duration, 1)
      : 0

    const agentUtilization = this.state.activeAgents.size > 0
      ? this.state.activeTasks.size / this.state.activeAgents.size
      : 0

    return {
      totalTasks,
      tasksCompleted,
      tasksFailed,
      tasksCancelled,
      successRate: totalTasks > 0 ? tasksCompleted / totalTasks : 0,
      avgTaskDuration,
      totalExecutionTime: duration,
      parallelEfficiency,
      agentUtilization,
    }
  }

  /**
   * Determine overall orchestration status
   *
   * @param completed - Completed task count
   * @param failed - Failed task count
   * @param cancelled - Cancelled task count
   * @param total - Total task count
   * @returns Status
   */
  private determineStatus(
    completed: string[],
    failed: string[],
    cancelled: string[],
    total: number,
  ): 'completed' | 'partial' | 'failed' | 'cancelled' {
    if (completed.length === total) {
      return 'completed'
    }
    if (failed.length === total) {
      return 'failed'
    }
    if (cancelled.length === total) {
      return 'cancelled'
    }
    return 'partial'
  }

  /**
   * Create empty metrics
   *
   * @returns Empty metrics
   */
  private createEmptyMetrics(): OrchestrationMetrics {
    return {
      totalTasks: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksCancelled: 0,
      successRate: 0,
      avgTaskDuration: 0,
      totalExecutionTime: 0,
      parallelEfficiency: 0,
      agentUtilization: 0,
    }
  }

  /**
   * Create failed orchestration result
   *
   * @param task - Root task
   * @param error - Error that occurred
   * @returns Failed result
   */
  private createFailedResult(task: Task, error: Error): OrchestrationResult {
    return {
      planId: 'failed',
      success: false,
      status: 'failed',
      completedTasks: [],
      failedTasks: [task.id],
      cancelledTasks: [],
      results: {},
      metrics: this.createEmptyMetrics(),
      errors: [{
        code: 'ORCHESTRATION_FAILED',
        message: error.message,
        stack: error.stack,
        recoverable: false,
      }],
      warnings: [],
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      duration: 0,
    }
  }

  /**
   * Get current orchestrator state
   *
   * @returns Current state
   */
  getState(): Readonly<OrchestratorState> {
    return { ...this.state }
  }

  /**
   * Pause orchestration
   */
  pause(): void {
    if (this.state.status === 'executing') {
      this.state.status = 'paused'
      this.log('Orchestration paused')
    }
  }

  /**
   * Resume orchestration
   */
  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'executing'
      this.log('Orchestration resumed')
    }
  }

  /**
   * Cancel orchestration
   */
  cancel(): void {
    this.state.status = 'idle'
    const activeTaskValues = Array.from(this.state.activeTasks.values())
    for (const task of activeTaskValues) {
      task.status = 'cancelled'
      this.emit('task:cancelled', task)
    }
    this.state.activeTasks.clear()
    this.log('Orchestration cancelled')
  }

  /**
   * Terminate all agents
   */
  terminateAllAgents(): void {
    const activeAgentValues = Array.from(this.state.activeAgents.values())
    for (const agent of activeAgentValues) {
      agent.status = 'terminated'
      this.emit('agent:terminated', agent)
    }
    this.state.activeAgents.clear()
    this.log('All agents terminated')
  }

  /**
   * Log message if verbose logging is enabled
   *
   * @param message - Message to log
   */
  private log(message: string): void {
    if (this.config.verboseLogging) {
      console.log(`[BrainOrchestrator] ${message}`)
    }
  }

  /**
   * Sleep for specified duration
   *
   * @param ms - Duration in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ========================================================================
  // FORK CONTEXT METHODS (v3.8)
  // ========================================================================

  /**
   * Execute a task in a fork context
   *
   * Creates an isolated sub-agent context for executing a skill-based task.
   *
   * @param skill - Skill file with fork configuration
   * @param task - Task to execute
   * @param executeFn - Execution function
   * @returns Fork context result
   */
  async executeInForkContext(
    skill: SkillMdFile,
    task: Task,
    executeFn: (config: ForkContextConfig) => Promise<OrchestrationResult>,
  ): Promise<ForkContextResult> {
    if (!this.config.enableForkContext) {
      throw new Error('Fork context execution is disabled')
    }

    this.log(`Executing task in fork context: ${task.name} (skill: ${skill.metadata.name})`)

    // Create fork context
    const fork = this.forkManager.createFork(skill)
    this.emit('fork:created', fork.id, skill)

    // Execute in fork
    const result = await this.forkManager.executeFork(fork.id, task, executeFn)

    if (result.success) {
      this.emit('fork:completed', fork.id, result)
    }
    else {
      this.emit('fork:failed', fork.id, result.error || 'Unknown error')
    }

    return result
  }

  /**
   * Execute multiple tasks in parallel fork contexts
   *
   * @param execution - Parallel execution configuration
   * @param executeFn - Execution function
   * @returns Parallel execution result
   */
  async executeParallelForks(
    execution: ParallelAgentExecution,
    executeFn: (config: ForkContextConfig) => Promise<OrchestrationResult>,
  ): Promise<ParallelExecutionResult> {
    this.log(`Executing ${execution.tasks.length} parallel forks`)

    this.emit('parallel:started', execution.id)

    try {
      const result = await this.dispatcher.dispatchParallel(execution, async (config) => {
        // Convert dispatch config to fork config
        const forkConfig: ForkContextConfig = {
          id: nanoid(),
          sessionId: config.sessionId || nanoid(),
          skill: {
            metadata: {
              name: config.agentType,
              description: '',
              version: '1.0.0',
              category: 'custom',
              triggers: [],
              use_when: [],
            },
            content: '',
            filePath: '',
          },
          agentType: config.agentType,
          agentRole: config.agentRole,
          mode: config.mode,
          workingDirectory: config.workingDirectory,
          env: config.env,
          allowedTools: config.allowedTools,
          disallowedTools: config.disallowedTools,
          timeout: config.timeout,
        }

        return executeFn(forkConfig)
      })

      this.emit('parallel:completed', execution.id, result)
      return result
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.emit('parallel:failed', execution.id, errorMessage)

      return {
        id: execution.id,
        success: false,
        results: [],
        durationMs: 0,
        successfulCount: 0,
        failedCount: execution.tasks.length,
      }
    }
  }

  /**
   * Execute a task with agent dispatching
   *
   * Routes the task to the appropriate agent based on skill configuration.
   *
   * @param skill - Skill file with agent configuration
   * @param task - Task to execute
   * @param executeFn - Execution function
   * @returns Dispatch result
   */
  async executeWithAgentDispatch(
    skill: SkillMdFile,
    task: Task,
    executeFn: (config: ForkContextConfig) => Promise<OrchestrationResult>,
  ): Promise<OrchestrationResult> {
    if (!this.config.enableDispatcher) {
      throw new Error('Agent dispatcher is disabled')
    }

    this.log(`Dispatching task: ${task.name} to agent: ${skill.metadata.agent || 'default'}`)

    const dispatchResult = await this.dispatcher.dispatch(task, skill, async (config) => {
      // Convert dispatch config to fork config
      const forkConfig: ForkContextConfig = {
        id: nanoid(),
        sessionId: config.sessionId || nanoid(),
        skill,
        agentType: config.agentType,
        agentRole: config.agentRole,
        mode: config.mode,
        workingDirectory: config.workingDirectory,
        env: config.env,
        allowedTools: config.allowedTools,
        disallowedTools: config.disallowedTools,
        timeout: config.timeout,
      }

      return executeFn(forkConfig)
    })

    if (!dispatchResult.success) {
      throw new Error(dispatchResult.error || 'Agent dispatch failed')
    }

    return dispatchResult.output as unknown as OrchestrationResult
  }

  /**
   * Cancel a running fork context
   *
   * @param forkId - Fork context ID
   */
  cancelFork(forkId: string): void {
    this.forkManager.cancel(forkId)
    this.emit('fork:cancelled', forkId)
    this.log(`Cancelled fork: ${forkId}`)
  }

  /**
   * Get fork context state
   *
   * @param forkId - Fork context ID
   * @returns Fork state or null
   */
  getForkState(forkId: string): ReturnType<AgentForkManager['getFork']> {
    return this.forkManager.getFork(forkId)
  }

  /**
   * Get all active fork contexts
   *
   * @returns Array of active fork states
   */
  getActiveForks(): ReturnType<AgentForkManager['listActive']> {
    return this.forkManager.listActive()
  }

  /**
   * Get fork context statistics
   *
   * @returns Fork statistics
   */
  getForkStats(): ReturnType<AgentForkManager['getStats']> {
    return this.forkManager.getStats()
  }

  /**
   * Get dispatcher statistics
   *
   * @returns Dispatcher statistics
   */
  getDispatcherStats(): ReturnType<AgentDispatcher['getStats']> {
    return this.dispatcher.getStats()
  }

  /**
   * Setup fork manager event handlers
   */
  private setupForkManagerEvents(): void {
    this.forkManager.on('created', (fork) => {
      this.log(`Fork context created: ${fork.id}`)
    })

    this.forkManager.on('started', (fork) => {
      this.log(`Fork context started: ${fork.id}`)
      this.emit('fork:started', fork.id)
    })

    this.forkManager.on('completed', (fork, result) => {
      this.log(`Fork context completed: ${fork.id} (${result.durationMs}ms)`)
    })

    this.forkManager.on('failed', (fork, error) => {
      this.log(`Fork context failed: ${fork.id} - ${error}`)
    })

    this.forkManager.on('timeout', (fork) => {
      this.log(`Fork context timed out: ${fork.id}`)
      this.emit('fork:failed', fork.id, 'Timeout')
    })

    this.forkManager.on('cancelled', (fork) => {
      this.log(`Fork context cancelled: ${fork.id}`)
    })
  }
}
