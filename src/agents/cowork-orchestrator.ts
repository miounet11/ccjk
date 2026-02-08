/**
 * Cowork-Inspired Multi-Agent Orchestration System
 *
 * Based on Claude Cowork architecture (January 2026):
 * - Parallel sub-agent execution with independent contexts
 * - Real-time progress tracking via Sidebar-style events
 * - Task delegation with async completion
 * - Sub-agent health monitoring
 *
 * @see https://claude.com/resources/tutorials/claude-cowork-a-research-preview
 */

import type { EnhancedWorkerPool } from '../concurrency/enhanced-worker-pool.js'
import type { ProcessPool } from '../concurrency/process-pool.js'
import { EventEmitter } from 'node:events'
import { nanoid } from 'nanoid'

// ============================================================================
// Type Definitions
// ============================================================================

export interface SubAgentTask {
  id: string
  type: 'file' | 'web' | 'data' | 'analysis' | 'general'
  description: string
  input: unknown
  priority: number
  dependencies?: string[] // Task IDs this task depends on
  timeout?: number
  retryPolicy?: RetryPolicy
}

export interface RetryPolicy {
  maxAttempts: number
  backoffMs: number
  retryableErrors: string[]
}

export interface SubAgentConfig {
  id: string
  name: string
  type: SubAgentType
  executionMode: ExecutionMode
  maxConcurrentTasks: number
  contextIsolation: 'strict' | 'shared' | 'inherit'
  capabilities: string[]
}

export type SubAgentType
  = | 'file-agent' // Local file operations
    | 'web-agent' // Browser automation
    | 'data-agent' // Data processing
    | 'analysis-agent' // Code/document analysis
    | 'general-agent' // General purpose

export type ExecutionMode = 'worker-thread' | 'process' | 'inline'

export interface SubAgentInstance {
  id: string
  config: SubAgentConfig
  state: AgentState
  currentTask?: SubAgentTask
  completedTasks: number
  failedTasks: number
  avgTaskDuration: number
  startTime: number
  lastActivity: number
}

export type AgentState = 'idle' | 'busy' | 'error' | 'terminated'

export interface TaskProgress {
  taskId: string
  agentId: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number // 0-100
  message?: string
  result?: unknown
  error?: Error
  startTime: number
  endTime?: number
  steps?: TaskStep[]
}

export interface TaskStep {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  message?: string
  startTime?: number
  endTime?: number
}

export interface OrchestrationPlan {
  id: string
  description: string
  tasks: SubAgentTask[]
  taskDependencies: Map<string, string[]> // taskId -> dependent task IDs
  executionStrategy: ExecutionStrategy
  timeout?: number
}

export type ExecutionStrategy
  = | 'parallel' // Execute all independent tasks in parallel
    | 'sequential' // Execute tasks one by one
    | 'hierarchical' // Execute based on dependency tree
    | 'pipeline' // Stream data through pipeline stages
    | 'map-reduce' // Map phase then reduce phase

export interface OrchestrationResult {
  planId: string
  success: boolean
  completedTasks: Map<string, unknown>
  failedTasks: Map<string, Error>
  totalDuration: number
  taskResults: TaskProgress[]
}

// ============================================================================
// Progress Event Types (Sidebar-style streaming)
// ============================================================================

export interface ProgressEvent {
  type: ProgressEventType
  timestamp: number
  data: unknown
}

export type ProgressEventType
  = | 'agent.created'
    | 'agent.terminated'
    | 'task.created'
    | 'task.started'
    | 'task.progress'
    | 'task.completed'
    | 'task.failed'
    | 'task.retry'
    | 'plan.started'
    | 'plan.completed'
    | 'plan.failed'
    | 'agent.pool.scaled'

export interface TaskProgressEvent extends ProgressEvent {
  type: 'task.progress' | 'task.started' | 'task.completed' | 'task.failed'
  data: TaskProgress
}

export interface AgentPoolEvent extends ProgressEvent {
  type: 'agent.pool.scaled'
  data: {
    previousSize: number
    newSize: number
    reason: string
  }
}

// ============================================================================
// Main Orchestrator Class
// ============================================================================

export class CoworkOrchestrator extends EventEmitter {
  // Sub-agent management
  private agents = new Map<string, SubAgentInstance>()
  private agentConfigs: SubAgentConfig[]

  // Task management
  private taskQueue: SubAgentTask[] = []
  private runningTasks = new Map<string, TaskProgress>()
  private completedTasks = new Map<string, TaskProgress>()

  // Execution pools
  private workerPool?: EnhancedWorkerPool
  private processPool?: ProcessPool

  // Configuration
  private config: OrchestratorConfig

  // Active orchestration
  private activePlan?: OrchestrationPlan
  private planStartTime = 0

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super()

    this.config = {
      maxConcurrentAgents: config.maxConcurrentAgents ?? 4,
      maxConcurrentTasks: config.maxConcurrentTasks ?? 16,
      taskTimeout: config.taskTimeout ?? 30000,
      heartbeatInterval: config.heartbeatInterval ?? 1000,
      enableProgressStreaming: config.enableProgressStreaming ?? true,
      ...config,
    }

    this.agentConfigs = this.defaultAgentConfigs()

    // Start heartbeat for monitoring
    this.startHeartbeat()
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Create a new orchestration plan from a task description
   */
  async createPlan(
    description: string,
    strategy: ExecutionStrategy = 'hierarchical',
  ): Promise<OrchestrationPlan> {
    const planId = nanoid()

    // Analyze description and decompose into tasks
    const tasks = await this.decomposeTask(description)

    // Build dependency graph
    const dependencies = this.buildDependencyGraph(tasks)

    const plan: OrchestrationPlan = {
      id: planId,
      description,
      tasks,
      taskDependencies: dependencies,
      executionStrategy: strategy,
      timeout: this.config.taskTimeout * tasks.length,
    }

    this.emit('plan.created', { planId, description, taskCount: tasks.length })

    return plan
  }

  /**
   * Execute an orchestration plan with real-time progress tracking
   */
  async executePlan(
    plan: OrchestrationPlan,
    options: ExecutionOptions = {},
  ): Promise<OrchestrationResult> {
    this.activePlan = plan
    this.planStartTime = Date.now()

    this.emit('plan.started', {
      type: 'plan.started',
      timestamp: Date.now(),
      data: { planId: plan.id, taskCount: plan.tasks.length },
    } as ProgressEvent)

    try {
      // Initialize agents if needed
      await this.ensureAgentsAvailable()

      let result: OrchestrationResult

      switch (plan.executionStrategy) {
        case 'parallel':
          result = await this.executeParallel(plan, options)
          break
        case 'sequential':
          result = await this.executeSequential(plan, options)
          break
        case 'hierarchical':
          result = await this.executeHierarchical(plan, options)
          break
        case 'pipeline':
          result = await this.executePipeline(plan, options)
          break
        case 'map-reduce':
          result = await this.executeMapReduce(plan, options)
          break
        default:
          throw new Error(`Unknown execution strategy: ${plan.executionStrategy}`)
      }

      this.emit('plan.completed', {
        type: 'plan.completed',
        timestamp: Date.now(),
        data: {
          planId: plan.id,
          success: result.success,
          duration: result.totalDuration,
          completedTasks: result.completedTasks.size,
          failedTasks: result.failedTasks.size,
        },
      } as ProgressEvent)

      return result
    }
    catch (error) {
      this.emit('plan.failed', {
        type: 'plan.failed',
        timestamp: Date.now(),
        data: { planId: plan.id, error },
      } as ProgressEvent)

      throw error
    }
  }

  /**
   * Execute a single task with progress tracking
   */
  async executeTask(task: SubAgentTask): Promise<unknown> {
    const agent = await this.assignAgent(task)

    const progress: TaskProgress = {
      taskId: task.id,
      agentId: agent.id,
      status: 'running',
      progress: 0,
      message: `Starting: ${task.description}`,
      startTime: Date.now(),
      steps: [],
    }

    this.runningTasks.set(task.id, progress)
    this.emitTaskProgress(progress)

    try {
      const result = await this.runTaskOnAgent(agent, task, (update) => {
        progress.progress = update.progress ?? 0
        progress.message = update.message
        progress.steps = update.steps
        this.emitTaskProgress(progress)
      })

      progress.status = 'completed'
      progress.progress = 100
      progress.result = result
      progress.endTime = Date.now()

      this.runningTasks.delete(task.id)
      this.completedTasks.set(task.id, progress)
      this.emitTaskProgress(progress)

      agent.completedTasks++
      agent.avgTaskDuration = this.updateAvgDuration(
        agent.avgTaskDuration,
        progress.endTime! - progress.startTime,
        agent.completedTasks,
      )

      return result
    }
    catch (error) {
      progress.status = 'failed'
      progress.error = error as Error
      progress.endTime = Date.now()

      this.runningTasks.delete(task.id)
      this.completedTasks.set(task.id, progress)
      this.emitTaskProgress(progress)

      agent.failedTasks++

      // Retry if configured
      if (task.retryPolicy && this.shouldRetry(error as Error, task.retryPolicy)) {
        return this.retryTask(task)
      }

      throw error
    }
    finally {
      agent.state = 'idle'
      agent.currentTask = undefined
      agent.lastActivity = Date.now()
    }
  }

  /**
   * Get real-time progress for all tasks
   */
  getAllProgress(): TaskProgress[] {
    return [
      ...Array.from(this.runningTasks.values()),
      ...Array.from(this.completedTasks.values()),
      ...this.taskQueue.map(task => ({
        taskId: task.id,
        agentId: '',
        status: 'queued' as const,
        progress: 0,
        message: task.description,
        startTime: Date.now(),
      })),
    ]
  }

  /**
   * Get progress for a specific task
   */
  getTaskProgress(taskId: string): TaskProgress | undefined {
    return this.runningTasks.get(taskId) || this.completedTasks.get(taskId)
  }

  /**
   * Get agent pool status
   */
  getAgentStatus(): SubAgentInstance[] {
    return Array.from(this.agents.values())
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.runningTasks.get(taskId)
    if (!task) {
      return false
    }

    const agent = this.agents.get(task.agentId)
    if (agent) {
      agent.state = 'idle'
      agent.currentTask = undefined
    }

    this.runningTasks.delete(taskId)

    this.emit('task.failed', {
      type: 'task.failed',
      timestamp: Date.now(),
      data: { ...task, status: 'cancelled' as const },
    } as ProgressEvent)

    return true
  }

  /**
   * Scale the agent pool
   */
  async scaleAgentPool(targetSize: number, reason = 'manual'): Promise<void> {
    const currentSize = this.agents.size

    if (targetSize > currentSize) {
      // Add agents
      for (let i = 0; i < targetSize - currentSize; i++) {
        const config = this.selectAgentConfig()
        const agent = await this.createAgent(config)
        this.agents.set(agent.id, agent)
      }
    }
    else if (targetSize < currentSize) {
      // Remove idle agents
      const idleAgents = Array.from(this.agents.values())
        .filter(a => a.state === 'idle')
        .slice(0, currentSize - targetSize)

      for (const agent of idleAgents) {
        await this.terminateAgent(agent.id)
      }
    }

    this.emit('agent.pool.scaled', {
      type: 'agent.pool.scaled',
      timestamp: Date.now(),
      data: { previousSize: currentSize, newSize: this.agents.size, reason },
    } as AgentPoolEvent)
  }

  /**
   * Shutdown all agents
   */
  async shutdown(): Promise<void> {
    for (const agentId of this.agents.keys()) {
      await this.terminateAgent(agentId)
    }
    this.removeAllListeners()
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private defaultAgentConfigs(): SubAgentConfig[] {
    return [
      {
        id: 'file-agent',
        name: 'File Operations Agent',
        type: 'file-agent',
        executionMode: 'inline',
        maxConcurrentTasks: 4,
        contextIsolation: 'strict',
        capabilities: ['read', 'write', 'search', 'analyze'],
      },
      {
        id: 'web-agent',
        name: 'Web Automation Agent',
        type: 'web-agent',
        executionMode: 'process',
        maxConcurrentTasks: 2,
        contextIsolation: 'strict',
        capabilities: ['browse', 'scrape', 'fill', 'click', 'screenshot'],
      },
      {
        id: 'data-agent',
        name: 'Data Processing Agent',
        type: 'data-agent',
        executionMode: 'worker-thread',
        maxConcurrentTasks: 4,
        contextIsolation: 'shared',
        capabilities: ['parse', 'transform', 'aggregate', 'validate'],
      },
      {
        id: 'analysis-agent',
        name: 'Code Analysis Agent',
        type: 'analysis-agent',
        executionMode: 'worker-thread',
        maxConcurrentTasks: 2,
        contextIsolation: 'inherit',
        capabilities: ['analyze', 'review', 'refactor', 'optimize'],
      },
      {
        id: 'general-agent',
        name: 'General Purpose Agent',
        type: 'general-agent',
        executionMode: 'inline',
        maxConcurrentTasks: 8,
        contextIsolation: 'inherit',
        capabilities: ['*'],
      },
    ]
  }

  private selectAgentConfig(): SubAgentConfig {
    // Select config based on current pool balance
    const typeCounts = new Map<SubAgentType, number>()

    for (const agent of this.agents.values()) {
      const count = typeCounts.get(agent.config.type) ?? 0
      typeCounts.set(agent.config.type, count + 1)
    }

    // Prefer general agents for default
    return this.agentConfigs.find(c => c.type === 'general-agent')
      || this.agentConfigs[0]!
  }

  private async createAgent(config: SubAgentConfig): Promise<SubAgentInstance> {
    const agent: SubAgentInstance = {
      id: `${config.id}-${nanoid(6)}`,
      config,
      state: 'idle',
      completedTasks: 0,
      failedTasks: 0,
      avgTaskDuration: 0,
      startTime: Date.now(),
      lastActivity: Date.now(),
    }

    this.emit('agent.created', {
      type: 'agent.created',
      timestamp: Date.now(),
      data: { agentId: agent.id, type: config.type },
    } as ProgressEvent)

    return agent
  }

  private async terminateAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return
    }

    // Cancel running task if any
    if (agent.currentTask) {
      await this.cancelTask(agent.currentTask.id)
    }

    this.agents.delete(agentId)

    this.emit('agent.terminated', {
      type: 'agent.terminated',
      timestamp: Date.now(),
      data: { agentId, reason: 'shutdown' },
    } as ProgressEvent)
  }

  private async ensureAgentsAvailable(): Promise<void> {
    const targetSize = Math.min(
      this.config.maxConcurrentAgents,
      this.activePlan?.tasks.length ?? 1,
    )

    if (this.agents.size < targetSize) {
      await this.scaleAgentPool(targetSize, 'plan-execution')
    }
  }

  private async assignAgent(task: SubAgentTask): Promise<SubAgentInstance> {
    // Find best agent based on task type and current load
    const capableAgents = Array.from(this.agents.values())
      .filter((agent) => {
        if (agent.state !== 'idle') {
          return false
        }

        // Check capabilities
        const config = agent.config
        return config.capabilities.includes('*') || config.capabilities.some(c => task.type.includes(c))
      })

    if (capableAgents.length === 0) {
      throw new Error(`No available agent for task type: ${task.type}`)
    }

    // Sort by completed tasks (load balancing) and avg duration
    capableAgents.sort((a, b) => {
      const aScore = a.completedTasks / (a.completedTasks + a.failedTasks + 1)
      const bScore = b.completedTasks / (b.completedTasks + b.failedTasks + 1)
      return bScore - aScore
    })

    const agent = capableAgents[0]!
    agent.state = 'busy'
    agent.currentTask = task

    return agent
  }

  private async runTaskOnAgent(
    agent: SubAgentInstance,
    task: SubAgentTask,
    onProgress: (update: Partial<TaskProgress>) => void,
  ): Promise<unknown> {
    // Determine execution based on agent config
    switch (agent.config.executionMode) {
      case 'worker-thread':
        if (this.workerPool) {
          return this.workerPool.exec(task.type, task.input, {
            priority: task.priority as any,
          } as any)
        }
        break
      case 'process':
        if (this.processPool) {
          return this.processPool.execute(task.type, task.input, {
            timeout: task.timeout,
          })
        }
        break
      case 'inline':
        // Execute inline (simplified)
        onProgress({ progress: 50, message: 'Processing...' })
        return { result: `Processed: ${task.description}` }
    }

    // Fallback to inline execution
    onProgress({ progress: 100, message: 'Complete' })
    return { result: 'Task complete' }
  }

  private async decomposeTask(description: string): Promise<SubAgentTask[]> {
    // Simplified task decomposition
    // In production, this would use AI to analyze and decompose

    const keywords = description.toLowerCase()

    if (keywords.includes('analyze') && keywords.includes('code')) {
      return [
        {
          id: nanoid(),
          type: 'file',
          description: 'Find source files',
          input: { pattern: '**/*.ts' },
          priority: 1,
        },
        {
          id: nanoid(),
          type: 'analysis',
          description: 'Analyze code quality',
          input: { task: 'quality-analysis' },
          priority: 2,
          dependencies: [], // Would be filled with actual dependencies
        },
        {
          id: nanoid(),
          type: 'general',
          description: 'Generate report',
          input: { format: 'markdown' },
          priority: 3,
        },
      ]
    }

    if (keywords.includes('search') || keywords.includes('browse')) {
      return [
        {
          id: nanoid(),
          type: 'web',
          description: 'Web search',
          input: { query: description },
          priority: 1,
        },
      ]
    }

    // Default: single general task
    return [
      {
        id: nanoid(),
        type: 'general',
        description,
        input: { description },
        priority: 1,
      },
    ]
  }

  private buildDependencyGraph(tasks: SubAgentTask[]): Map<string, string[]> {
    const deps = new Map<string, string[]>()

    for (const task of tasks) {
      deps.set(task.id, task.dependencies ?? [])
    }

    return deps
  }

  // ========================================================================
  // Execution Strategies
  // ========================================================================

  private async executeParallel(
    plan: OrchestrationPlan,
    _options: ExecutionOptions,
  ): Promise<OrchestrationResult> {
    const completedTasks = new Map<string, unknown>()
    const failedTasks = new Map<string, Error>()
    const taskResults: TaskProgress[] = []

    // Execute all tasks in parallel
    const results = await Promise.allSettled(
      plan.tasks.map(task => this.executeTask(task)),
    )

    for (let i = 0; i < results.length; i++) {
      const task = plan.tasks[i]!
      const result = results[i]!

      if (result.status === 'fulfilled') {
        completedTasks.set(task.id, result.value)
      }
      else {
        failedTasks.set(task.id, result.reason)
      }

      const progress = this.getTaskProgress(task.id)
      if (progress) {
        taskResults.push(progress)
      }
    }

    return {
      planId: plan.id,
      success: failedTasks.size === 0,
      completedTasks,
      failedTasks,
      totalDuration: Date.now() - this.planStartTime,
      taskResults,
    }
  }

  private async executeSequential(
    plan: OrchestrationPlan,
    _options: ExecutionOptions,
  ): Promise<OrchestrationResult> {
    const completedTasks = new Map<string, unknown>()
    const failedTasks = new Map<string, Error>()
    const taskResults: TaskProgress[] = []

    for (const task of plan.tasks) {
      try {
        const result = await this.executeTask(task)
        completedTasks.set(task.id, result)

        const progress = this.getTaskProgress(task.id)
        if (progress) {
          taskResults.push(progress)
        }
      }
      catch (error) {
        failedTasks.set(task.id, error as Error)
        break // Stop on first error for sequential
      }
    }

    return {
      planId: plan.id,
      success: failedTasks.size === 0,
      completedTasks,
      failedTasks,
      totalDuration: Date.now() - this.planStartTime,
      taskResults,
    }
  }

  private async executeHierarchical(
    plan: OrchestrationPlan,
    _options: ExecutionOptions,
  ): Promise<OrchestrationResult> {
    const completedTasks = new Map<string, unknown>()
    const failedTasks = new Map<string, Error>()
    const taskResults: TaskProgress[] = []
    const executed = new Set<string>()

    // Execute based on dependency tree
    const executeTaskWithDeps = async (taskId: string): Promise<void> => {
      if (executed.has(taskId)) {
        return
      }

      const task = plan.tasks.find(t => t.id === taskId)
      if (!task) {
        return
      }

      // Execute dependencies first
      const deps = plan.taskDependencies.get(taskId) ?? []
      for (const depId of deps) {
        await executeTaskWithDeps(depId)
      }

      // Execute this task
      try {
        const result = await this.executeTask(task)
        completedTasks.set(taskId, result)
        executed.add(taskId)

        const progress = this.getTaskProgress(taskId)
        if (progress) {
          taskResults.push(progress)
        }
      }
      catch (error) {
        failedTasks.set(taskId, error as Error)
        executed.add(taskId)
      }
    }

    // Execute all root tasks
    for (const task of plan.tasks) {
      await executeTaskWithDeps(task.id)
    }

    return {
      planId: plan.id,
      success: failedTasks.size === 0,
      completedTasks,
      failedTasks,
      totalDuration: Date.now() - this.planStartTime,
      taskResults,
    }
  }

  private async executePipeline(
    plan: OrchestrationPlan,
    _options: ExecutionOptions,
  ): Promise<OrchestrationResult> {
    const completedTasks = new Map<string, unknown>()
    const failedTasks = new Map<string, Error>()
    const taskResults: TaskProgress[] = []

    let previousResult: unknown = null

    for (const task of plan.tasks) {
      // Pass previous result as input
      const currentInput = typeof task.input === 'object' && task.input !== null
        ? { ...(task.input as Record<string, unknown>), _pipelineInput: previousResult }
        : { _pipelineInput: previousResult, originalInput: task.input }
      task.input = currentInput

      try {
        const result = await this.executeTask(task)
        completedTasks.set(task.id, result)
        previousResult = result

        const progress = this.getTaskProgress(task.id)
        if (progress) {
          taskResults.push(progress)
        }
      }
      catch (error) {
        failedTasks.set(task.id, error as Error)
        break
      }
    }

    return {
      planId: plan.id,
      success: failedTasks.size === 0,
      completedTasks,
      failedTasks,
      totalDuration: Date.now() - this.planStartTime,
      taskResults,
    }
  }

  private async executeMapReduce(
    plan: OrchestrationPlan,
    _options: ExecutionOptions,
  ): Promise<OrchestrationResult> {
    // Simple map-reduce: first half is map, second is reduce
    const midPoint = Math.floor(plan.tasks.length / 2)
    const mapTasks = plan.tasks.slice(0, midPoint)
    const reduceTasks = plan.tasks.slice(midPoint)

    const completedTasks = new Map<string, unknown>()
    const failedTasks = new Map<string, Error>()
    const taskResults: TaskProgress[] = []

    // Map phase: execute all map tasks in parallel
    const mapResults = await Promise.allSettled(
      mapTasks.map(task => this.executeTask(task)),
    )

    const mapData: unknown[] = []

    for (let i = 0; i < mapResults.length; i++) {
      const task = mapTasks[i]!
      const result = mapResults[i]!

      if (result.status === 'fulfilled') {
        completedTasks.set(task.id, result.value)
        mapData.push(result.value)
      }
      else {
        failedTasks.set(task.id, result.reason)
      }

      const progress = this.getTaskProgress(task.id)
      if (progress) {
        taskResults.push(progress)
      }
    }

    // Reduce phase: pass map results to reduce tasks
    for (const task of reduceTasks) {
      const currentInput = typeof task.input === 'object' && task.input !== null
        ? { ...(task.input as Record<string, unknown>), _mapResults: mapData }
        : { _mapResults: mapData, originalInput: task.input }
      task.input = currentInput

      try {
        const result = await this.executeTask(task)
        completedTasks.set(task.id, result)

        const progress = this.getTaskProgress(task.id)
        if (progress) {
          taskResults.push(progress)
        }
      }
      catch (error) {
        failedTasks.set(task.id, error as Error)
      }
    }

    return {
      planId: plan.id,
      success: failedTasks.size === 0,
      completedTasks,
      failedTasks,
      totalDuration: Date.now() - this.planStartTime,
      taskResults,
    }
  }

  // ========================================================================
  // Utilities
  // ========================================================================

  private emitTaskProgress(progress: TaskProgress): void {
    if (this.config.enableProgressStreaming) {
      this.emit('task.progress', {
        type: 'task.progress',
        timestamp: Date.now(),
        data: progress,
      } as TaskProgressEvent)
    }
  }

  private async retryTask(task: SubAgentTask): Promise<unknown> {
    const retryTask = { ...task, id: nanoid() }
    return this.executeTask(retryTask)
  }

  private shouldRetry(error: Error, policy: RetryPolicy): boolean {
    return policy.retryableErrors.some(pattern =>
      error.message.includes(pattern),
    )
  }

  private updateAvgDuration(
    current: number,
    newDuration: number,
    count: number,
  ): number {
    return count === 1 ? newDuration : (current * (count - 1) + newDuration) / count
  }

  private startHeartbeat(): void {
    const interval = setInterval(() => {
      // Check for stale agents
      const now = Date.now()
      const staleThreshold = 60000 // 1 minute

      for (const [_id, agent] of this.agents) {
        if (
          agent.state === 'busy'
          && !agent.currentTask
          && now - agent.lastActivity > staleThreshold
        ) {
          // Reset stale agent
          agent.state = 'idle'
        }
      }

      // Auto-scale based on load
      this.autoScale()
    }, this.config.heartbeatInterval)

    // Cleanup on close
    this.once('shutdown', () => clearInterval(interval))
  }

  private autoScale(): void {
    const idleAgents = Array.from(this.agents.values()).filter(
      a => a.state === 'idle',
    ).length

    const queueLength = this.taskQueue.length

    // Scale up if queue is building
    if (queueLength > idleAgents && this.agents.size < this.config.maxConcurrentAgents) {
      this.scaleAgentPool(this.agents.size + 1, 'auto-scale-up')
    }

    // Scale down if mostly idle
    if (
      idleAgents > this.config.maxConcurrentAgents / 2
      && queueLength === 0
      && this.agents.size > 2
    ) {
      this.scaleAgentPool(this.agents.size - 1, 'auto-scale-down')
    }
  }

  // ========================================================================
  // Pool Integration
  // ========================================================================

  setWorkerPool(pool: EnhancedWorkerPool): void {
    this.workerPool = pool
  }

  setProcessPool(pool: ProcessPool): void {
    this.processPool = pool
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface OrchestratorConfig {
  maxConcurrentAgents: number
  maxConcurrentTasks: number
  taskTimeout: number
  heartbeatInterval: number
  enableProgressStreaming: boolean
}

export interface ExecutionOptions {
  onProgress?: (progress: TaskProgress) => void
  onTaskComplete?: (taskId: string, result: unknown) => void
  onTaskError?: (taskId: string, error: Error) => void
  concurrency?: number
}
