/**
 * CCJK Brain Orchestrator
 *
 * Central coordinator for the brain system that manages task decomposition,
 * agent lifecycle, parallel execution, result aggregation, and error recovery.
 *
 * @module brain/orchestrator
 */

import type { AgentCapability, CloudAgent } from '../types/agent.js'
import type {
  AgentInstance,
  AgentSelectionCriteria,
  AgentSelectionResult,
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
import { ResultAggregator } from './result-aggregator.js'
import { TaskDecomposer } from './task-decomposer.js'

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
}

/**
 * Brain orchestrator class
 *
 * Coordinates multiple agents to execute complex tasks through intelligent
 * decomposition, parallel execution, and result aggregation.
 */
export class BrainOrchestrator extends EventEmitter {
  private readonly config: Required<OrchestratorConfig>
  private readonly taskDecomposer: TaskDecomposer
  private readonly resultAggregator: ResultAggregator
  private readonly state: OrchestratorState
  private readonly availableAgents: Map<AgentRole, CloudAgent>

  constructor(config: Partial<OrchestratorConfig> = {}) {
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
    try {
      this.state.status = 'planning'
      this.log(`Starting orchestration for task: ${task.name}`)

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

      return result
    }
    catch (error) {
      this.state.status = 'error'
      const err = error instanceof Error ? error : new Error(String(error))
      this.emit('error', err)

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

    // Create plan
    const plan: OrchestrationPlan = {
      id: nanoid(),
      name: `Plan for ${task.name}`,
      description: `Orchestration plan to execute: ${task.description}`,
      rootTask: task,
      tasks: decomposition.subtasks,
      executionGraph: decomposition.executionGraph,
      requiredAgents,
      decompositionStrategy: decomposition.strategy,
      estimatedDuration: decomposition.estimatedDuration,
      createdAt: new Date().toISOString(),
      metadata: {
        taskCount: decomposition.subtasks.length,
        complexity: decomposition.metadata.complexity,
      },
    }

    this.log(`Created plan with ${plan.tasks.length} tasks`)
    return plan
  }

  /**
   * Execute an orchestration plan
   *
   * @param plan - Plan to execute
   * @returns Orchestration result
   */
  private async executePlan(plan: OrchestrationPlan): Promise<OrchestrationResult> {
    const startTime = Date.now()
    const completedTasks: string[] = []
    const failedTasks: string[] = []
    const cancelledTasks: string[] = []
    const errors: TaskError[] = []
    const warnings: string[] = []

    try {
      // Execute tasks stage by stage
      for (const stage of plan.executionGraph.stages) {
        this.log(`Executing stage ${stage.stage} with ${stage.tasks.length} tasks`)

        const stageTasks = stage.tasks
          .map(taskId => plan.tasks.find(t => t.id === taskId))
          .filter((t): t is Task => t !== undefined)

        // Execute tasks in parallel if enabled
        if (this.config.enableParallelExecution && stageTasks.length > 1) {
          await this.executeTasksParallel(stageTasks)
        }
        else {
          await this.executeTasksSequential(stageTasks)
        }

        // Check task results
        for (const task of stageTasks) {
          if (task.status === 'completed') {
            completedTasks.push(task.id)
          }
          else if (task.status === 'failed') {
            failedTasks.push(task.id)
            if (task.error) {
              errors.push(task.error)
            }
          }
          else if (task.status === 'cancelled') {
            cancelledTasks.push(task.id)
          }
        }

        // Stop if critical tasks failed
        if (failedTasks.length > 0 && this.hasCriticalFailures(stageTasks)) {
          warnings.push('Critical task failures detected, stopping execution')
          break
        }
      }

      // Aggregate results
      const completedTaskObjects = plan.tasks.filter(t => completedTasks.includes(t.id))
      const aggregationResult = await this.resultAggregator.aggregate(completedTaskObjects)

      if (!aggregationResult.success) {
        warnings.push(...aggregationResult.warnings)
      }

      // Calculate metrics
      const duration = Date.now() - startTime
      const metrics = this.calculateMetrics(plan, completedTasks, failedTasks, cancelledTasks, duration)

      // Determine overall status
      const status = this.determineStatus(completedTasks, failedTasks, cancelledTasks, plan.tasks.length)

      return {
        planId: plan.id,
        success: status === 'completed',
        status,
        completedTasks,
        failedTasks,
        cancelledTasks,
        results: aggregationResult.output ? { aggregated: aggregationResult.output } : {},
        metrics,
        errors,
        warnings,
        startedAt: this.state.startTime!,
        completedAt: new Date().toISOString(),
        duration,
      }
    }
    catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      errors.push({
        code: 'ORCHESTRATION_ERROR',
        message: err.message,
        stack: err.stack,
        recoverable: false,
      })

      return {
        planId: plan.id,
        success: false,
        status: 'failed',
        completedTasks,
        failedTasks,
        cancelledTasks,
        results: {},
        metrics: this.calculateMetrics(plan, completedTasks, failedTasks, cancelledTasks, Date.now() - startTime),
        errors,
        warnings,
        startedAt: this.state.startTime!,
        completedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Execute tasks in parallel
   *
   * @param tasks - Tasks to execute
   */
  private async executeTasksParallel(tasks: Task[]): Promise<void> {
    const promises = tasks.map(task => this.executeTask(task))
    await Promise.allSettled(promises)
  }

  /**
   * Execute tasks sequentially
   *
   * @param tasks - Tasks to execute
   */
  private async executeTasksSequential(tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      await this.executeTask(task)
    }
  }

  /**
   * Execute a single task
   *
   * @param task - Task to execute
   */
  private async executeTask(task: Task): Promise<void> {
    try {
      // Check if dependencies are satisfied
      if (!this.areDependenciesSatisfied(task)) {
        task.status = 'blocked'
        this.log(`Task ${task.name} is blocked by dependencies`)
        return
      }

      // Update task status
      task.status = 'running'
      task.startedAt = new Date().toISOString()
      this.state.activeTasks.set(task.id, task)
      this.emit('task:started', task)

      // Select agent for task
      const agentSelection = await this.selectAgent(task)
      if (!agentSelection) {
        throw new Error(`No suitable agent found for task: ${task.name}`)
      }

      // Assign task to agent
      const agentInstance = agentSelection.agent
      agentInstance.currentTask = task
      agentInstance.status = 'busy'
      task.assignedAgentId = agentInstance.id
      this.emit('agent:assigned', agentInstance, task)

      // Execute task with timeout
      const timeout = task.timeout ?? this.config.defaultTaskTimeout
      const output = await this.executeWithTimeout(
        () => this.executeTaskWithAgent(task, agentInstance),
        timeout,
      )

      // Update task with output
      task.output = output
      task.status = 'completed'
      task.completedAt = new Date().toISOString()
      task.actualDuration = Date.now() - new Date(task.startedAt).getTime()
      task.progress = 100

      // Update agent
      agentInstance.status = 'idle'
      agentInstance.currentTask = undefined
      agentInstance.lastActivityAt = new Date().toISOString()
      this.updateAgentMetrics(agentInstance, task, true)

      // Move to completed
      this.state.activeTasks.delete(task.id)
      this.state.completedTasks.set(task.id, task)
      this.state.totalTasksProcessed++

      this.emit('task:completed', task)
      this.emit('agent:completed', agentInstance, task)
    }
    catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const taskError: TaskError = {
        code: 'TASK_EXECUTION_ERROR',
        message: err.message,
        stack: err.stack,
        recoverable: this.config.autoRetry && task.retryCount < task.maxRetries,
      }

      task.error = taskError
      task.status = 'failed'
      task.completedAt = new Date().toISOString()

      // Update agent if assigned
      if (task.assignedAgentId) {
        const agent = this.state.activeAgents.get(task.assignedAgentId)
        if (agent) {
          agent.status = 'idle'
          agent.currentTask = undefined
          this.updateAgentMetrics(agent, task, false)
        }
      }

      // Retry if enabled
      if (taskError.recoverable) {
        task.retryCount++
        this.log(`Retrying task ${task.name} (attempt ${task.retryCount}/${task.maxRetries})`)
        await this.executeTask(task)
        return
      }

      this.state.activeTasks.delete(task.id)
      this.state.failedTasks.set(task.id, task)
      this.state.totalTasksProcessed++

      this.emit('task:failed', task, taskError)
    }
  }

  /**
   * Execute task with an agent (placeholder for actual execution)
   *
   * @param task - Task to execute
   * @param agent - Agent instance
   * @returns Task output
   */
  private async executeTaskWithAgent(task: Task, agent: AgentInstance): Promise<TaskOutput> {
    // This is a placeholder implementation
    // In a real system, this would invoke the actual agent to perform the task

    this.log(`Agent ${agent.role} executing task: ${task.name}`)

    // Simulate task execution
    await this.sleep(Math.random() * 1000 + 500)

    // Return mock output
    return {
      data: {
        taskId: task.id,
        taskName: task.name,
        executedBy: agent.role,
        result: 'Task completed successfully',
      },
      confidence: 0.85 + Math.random() * 0.15,
      logs: [
        `Task ${task.name} started`,
        `Processing with agent ${agent.role}`,
        `Task ${task.name} completed`,
      ],
      metadata: {
        executionTime: Date.now(),
        agentId: agent.id,
      },
    }
  }

  /**
   * Execute a function with timeout
   *
   * @param fn - Function to execute
   * @param timeout - Timeout in milliseconds
   * @returns Function result
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number,
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Task execution timeout')), timeout),
      ),
    ])
  }

  /**
   * Check if task dependencies are satisfied
   *
   * @param task - Task to check
   * @returns Whether dependencies are satisfied
   */
  private areDependenciesSatisfied(task: Task): boolean {
    for (const dep of task.dependencies) {
      const depTask = this.state.completedTasks.get(dep.taskId)
      if (!depTask || depTask.status !== 'completed') {
        if (dep.required) {
          return false
        }
      }
    }
    return true
  }

  /**
   * Select an agent to execute a task
   *
   * @param task - Task to execute
   * @returns Selected agent or undefined
   */
  private async selectAgent(task: Task): Promise<AgentSelectionResult | undefined> {
    const criteria: AgentSelectionCriteria = {
      requiredCapabilities: task.requiredCapabilities,
      strategy: 'best-fit',
    }

    // Find available agents with required capabilities
    const candidates: AgentInstance[] = []

    for (const [role, agent] of this.availableAgents) {
      // Check if agent has required capabilities
      const hasCapabilities = task.requiredCapabilities.every(cap =>
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
    const selected = this.selectBestAgent(candidates, criteria)

    return {
      agent: selected,
      score: 1.0,
      reason: 'Best fit for required capabilities',
      alternatives: candidates.filter(c => c !== selected),
    }
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
      capabilities: agent.definition.capabilities,
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
    for (const task of this.state.activeTasks.values()) {
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
    for (const agent of this.state.activeAgents.values()) {
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
}
