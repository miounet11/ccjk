/**
 * CCJK Agents V3 - Orchestrator
 *
 * Main orchestrator that coordinates the agent pool, task scheduler,
 * error recovery, and communication systems.
 *
 * @module agents-v3/orchestrator
 */

import type { AgentPool } from './agent-pool.js'
import type { Communication } from './communication.js'
import type { ErrorRecovery } from './error-recovery.js'
import type { TaskScheduler } from './task-scheduler.js'
import type {
  AgentConfig,
  AgentId,
  AgentInstance,
  AgentStatus,
  DeepPartial,
  Message,
  OrchestratorConfig,
  OrchestratorStatus,
  OrchestratorStatusInfo,
  RecoveryStrategy,
  Task,
  TaskId,
  TaskResult,
} from './types.js'
import { nanoid } from 'nanoid'
import { createAgentPool } from './agent-pool.js'
import { createCommunication } from './communication.js'
import { createErrorRecovery } from './error-recovery.js'
import { createTaskScheduler } from './task-scheduler.js'

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  scheduler: {
    maxConcurrentTasks: 10,
    defaultTimeoutMs: 300000,
    enablePriorityQueue: true,
    enableLoadBalancing: true,
    loadBalancingStrategy: 'least-loaded',
    enableTaskAffinity: true,
    processingIntervalMs: 100,
    staleTaskThresholdMs: 600000,
  },
  pool: {
    minAgents: 1,
    maxAgents: 10,
    idleTimeoutMs: 60000,
    scaleUpThreshold: 0.8,
    scaleDownThreshold: 0.2,
    healthCheckIntervalMs: 30000,
    agentCreationTimeoutMs: 10000,
  },
  recovery: {
    enabled: true,
    maxAttempts: 3,
    strategies: [],
  },
  communication: {
    enableEncryption: false,
    messageTimeoutMs: 30000,
    maxMessageSize: 1024 * 1024,
  },
  logging: {
    enabled: true,
    level: 'info',
    verbose: false,
  },
  metrics: {
    enabled: true,
    collectIntervalMs: 60000,
  },
}

// ============================================================================
// Orchestrator Events
// ============================================================================

export interface OrchestratorV3Events {
  // Agent events
  'agent:spawned': (agent: AgentInstance) => void
  'agent:terminated': (agentId: AgentId, reason: string) => void
  'agent:error': (agentId: AgentId, error: Error) => void
  'agent:recovered': (agentId: AgentId) => void

  // Task events
  'task:dispatched': (task: Task) => void
  'task:started': (task: Task) => void
  'task:progress': (taskId: TaskId, progress: number) => void
  'task:completed': (result: TaskResult) => void
  'task:failed': (taskId: TaskId, error: Error) => void
  'task:timeout': (taskId: TaskId) => void
  'task:cancelled': (taskId: TaskId) => void
  'task:retrying': (taskId: TaskId, attempt: number) => void

  // Message events
  'message:sent': (message: Message) => void
  'message:received': (message: Message) => void

  // Recovery events
  'recovery:started': (taskId: TaskId, strategy: string) => void
  'recovery:success': (taskId: TaskId) => void
  'recovery:failed': (taskId: TaskId, reason: string) => void

  // System events
  'orchestrator:started': () => void
  'orchestrator:stopped': () => void
  'orchestrator:error': (error: Error) => void
  'orchestrator:status': (status: OrchestratorStatus) => void
}

// ============================================================================
// Orchestrator V3
// ============================================================================

/**
 * Orchestrator V3 - Unified Agent Orchestration System
 *
 * This is the main entry point for the Agent V3 system, providing
 * a unified interface for agent management, task execution, and
 * inter-agent communication.
 *
 * @example
 * ```typescript
 * const orchestrator = new OrchestratorV3({
 *   pool: { minAgents: 2, maxAgents: 5 },
 *   scheduler: { maxConcurrentTasks: 20 }
 * })
 *
 * await orchestrator.start()
 *
 * const result = await orchestrator.dispatch({
 *   name: 'my-task',
 *   type: 'code-generation',
 *   requiredCapabilities: ['code-generation'],
 *   input: { prompt: 'Write a function' }
 * })
 *
 * await orchestrator.stop()
 * ```
 */
export class OrchestratorV3 {
  private readonly config: OrchestratorConfig
  private readonly pool: AgentPool
  private readonly scheduler: TaskScheduler
  private readonly recovery: ErrorRecovery
  private readonly communication: Communication

  private isRunning = false
  private status: OrchestratorStatus = 'idle'
  private startedAt = 0
  private readonly taskExecutors: Map<string, (task: Task, agent: AgentInstance) => Promise<TaskResult>> = new Map()
  private lastError?: { message: string, timestamp: number }

  constructor(config: DeepPartial<OrchestratorConfig> = {}) {
    // Merge configuration
    this.config = this.mergeConfig(DEFAULT_ORCHESTRATOR_CONFIG, config)

    // Initialize components
    this.pool = createAgentPool(this.config.pool)
    this.scheduler = createTaskScheduler(this.config.scheduler)
    this.recovery = createErrorRecovery(this.config.recovery)
    this.communication = createCommunication(this.config.communication)

    // Setup event forwarding
    this.setupEventForwarding()
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    this.status = 'running'
    this.startedAt = Date.now()
    this.isRunning = true

    this.log('info', 'Starting Orchestrator V3')

    try {
      // Start agent pool
      await this.pool.start(this.createAgentFactory())

      // Start task scheduler
      this.scheduler.start(this.executeTask.bind(this), {
        getAvailableAgent: (type: string) => this.pool.getAvailableAgent(type),
        getAgentByCapabilities: (capabilities: string[]) =>
          this.pool.getAgentByCapabilities(capabilities),
        getLeastLoadedAgent: (type?: string) => this.pool.getLeastLoadedAgent(type),
        assignTask: (agentId: AgentId, taskId: TaskId) =>
          this.pool.assignTask(agentId, taskId),
        completeTask: (agentId: AgentId, taskId: TaskId, success: boolean, durationMs: number) =>
          this.pool.completeTask(agentId, taskId, success, durationMs),
      })

      this.emit('orchestrator:started')
      this.emit('orchestrator:status', 'running')
      this.log('info', 'Orchestrator V3 started')
    }
    catch (error) {
      this.status = 'error'
      this.handleError(error as Error)
      throw error
    }
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.status = 'shutting_down'
    this.log('info', 'Stopping Orchestrator V3')

    try {
      // Stop components in reverse order
      await this.scheduler.stop()
      await this.pool.stop()
      this.recovery.stop()

      this.isRunning = false
      this.status = 'idle'

      this.emit('orchestrator:stopped')
      this.emit('orchestrator:status', 'idle')
      this.log('info', 'Orchestrator V3 stopped')
    }
    catch (error) {
      this.status = 'error'
      this.handleError(error as Error)
      throw error
    }
  }

  // ============================================================================
  // Agent Management
  // ============================================================================

  /**
   * Spawn a new agent
   */
  async spawn(config: AgentConfig): Promise<AgentInstance> {
    if (!this.isRunning) {
      throw new Error('Orchestrator is not running')
    }

    const agent = await this.pool.spawn(config)
    this.log('info', `Spawned agent: ${agent.id} (${agent.config.name})`)

    // Broadcast agent creation
    this.communication.broadcast('agent:spawned', {
      agentId: agent.id,
      name: agent.config.name,
      type: agent.config.type,
    })

    return agent
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: AgentId): AgentInstance | undefined {
    return this.pool.getAgent(agentId)
  }

  /**
   * Get all agents
   */
  getAgents(): AgentInstance[] {
    return this.pool.getAllAgents()
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: AgentStatus): AgentInstance[] {
    return this.pool.getAgentsByStatus(status)
  }

  /**
   * Terminate an agent
   */
  async terminateAgent(agentId: AgentId, reason: string = 'manual'): Promise<void> {
    await this.pool.terminateAgent(agentId, reason)
    this.log('info', `Terminated agent: ${agentId} (${reason})`)
  }

  // ============================================================================
  // Task Management
  // ============================================================================

  /**
   * Dispatch a task for execution
   */
  dispatch(task: Partial<Task> & { name: string, type: string }): Task {
    if (!this.isRunning) {
      throw new Error('Orchestrator is not running')
    }

    const scheduledTask = this.scheduler.schedule(task)

    this.log('info', `Dispatched task: ${scheduledTask.id} (${scheduledTask.name})`)
    this.emit('task:dispatched', scheduledTask)

    // Broadcast task dispatch
    this.communication.broadcast('task:dispatched', {
      taskId: scheduledTask.id,
      name: scheduledTask.name,
      type: scheduledTask.type,
    })

    return scheduledTask
  }

  /**
   * Dispatch a task and wait for result
   */
  async dispatchAndWait(
    task: Partial<Task> & { name: string, type: string },
    timeout?: number,
  ): Promise<TaskResult> {
    const scheduledTask = this.dispatch(task)

    return new Promise<TaskResult>((resolve, reject) => {
      const timeoutMs = timeout || scheduledTask.timeout || this.config.scheduler.defaultTimeoutMs

      const timeoutTimer = setTimeout(() => {
        this.scheduler.cancelTask(scheduledTask.id)
        reject(new Error(`Task timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      // Wait for completion
      const checkInterval = setInterval(() => {
        const result = this.scheduler.getTaskResult(scheduledTask.id)

        if (result) {
          clearTimeout(timeoutTimer)
          clearInterval(checkInterval)
          resolve(result)
        }

        const currentTask = this.scheduler.getTask(scheduledTask.id)
        if (!currentTask || currentTask.status === 'cancelled') {
          clearTimeout(timeoutTimer)
          clearInterval(checkInterval)
          reject(new Error('Task was cancelled'))
        }
      }, 100)
    })
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: TaskId): boolean {
    const cancelled = this.scheduler.cancelTask(taskId)
    if (cancelled) {
      this.log('info', `Cancelled task: ${taskId}`)
      this.emit('task:cancelled', taskId)
    }
    return cancelled
  }

  /**
   * Get task by ID
   */
  getTask(taskId: TaskId): Task | undefined {
    return this.scheduler.getTask(taskId)
  }

  /**
   * Get task result
   */
  getTaskResult(taskId: TaskId): TaskResult | undefined {
    return this.scheduler.getTaskResult(taskId)
  }

  /**
   * Get all pending tasks
   */
  getPendingTasks(): Task[] {
    return this.scheduler.getPendingTasks()
  }

  /**
   * Get all running tasks
   */
  getRunningTasks(): Task[] {
    return this.scheduler.getRunningTasks()
  }

  /**
   * Update task progress
   */
  updateTaskProgress(taskId: TaskId, progress: number): void {
    this.scheduler.updateProgress(taskId, progress)
    this.emit('task:progress', taskId, progress)
  }

  /**
   * Create task checkpoint
   */
  createTaskCheckpoint(taskId: TaskId, data: unknown): void {
    this.scheduler.createCheckpoint(taskId, data)
    const checkpoint = this.recovery.createCheckpoint(taskId, data, 0)
    this.communication.broadcast('checkpoint:created', {
      taskId,
      checkpointId: checkpoint.id,
    })
  }

  // ============================================================================
  // Communication
  // ============================================================================

  /**
   * Send a request to an agent
   */
  async request<T = unknown, R = unknown>(
    to: AgentId,
    subject: string,
    payload: T,
    timeout?: number,
  ): Promise<Message<R>> {
    return this.communication.request(to, subject, payload, { timeout })
  }

  /**
   * Send a direct message to an agent
   */
  send<T = unknown>(to: AgentId, subject: string, payload: T): Message<T> {
    return this.communication.sendDirect(to, subject, payload)
  }

  /**
   * Broadcast a message to all agents
   */
  broadcast<T = unknown>(subject: string, payload: T): Message<T> {
    return this.communication.broadcast(subject, payload)
  }

  /**
   * Subscribe to messages
   */
  subscribe(
    channel: string,
    handler: (message: Message) => void,
    options?: Parameters<typeof Communication.prototype.subscribe>[3],
  ): ReturnType<typeof Communication.prototype.subscribe> {
    return this.communication.subscribe(channel, 'orchestrator', handler, options)
  }

  /**
   * Publish an event
   */
  publish<T = unknown>(channel: string, subject: string, payload: T): Message<T> {
    return this.communication.publish(channel, subject, payload)
  }

  // ============================================================================
  // Status and Statistics
  // ============================================================================

  /**
   * Get orchestrator status
   */
  getStatus(): OrchestratorStatusInfo {
    return {
      status: this.status,
      uptimeMs: this.startedAt > 0 ? Date.now() - this.startedAt : 0,
      startedAt: this.startedAt,
      scheduler: this.scheduler.getStats(),
      pool: this.pool.getStats(),
      activeTasks: this.scheduler.getStats().runningTasks,
      pendingTasks: this.scheduler.getStats().queuedTasks,
      errorCount: this.pool.getStats().errorAgents,
      lastError: this.lastError,
    }
  }

  /**
   * Get scheduler statistics
   */
  getSchedulerStats() {
    return this.scheduler.getStats()
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return this.pool.getStats()
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats() {
    return this.recovery.getStats()
  }

  /**
   * Get communication statistics
   */
  getCommunicationStats() {
    return this.communication.getStats()
  }

  // ============================================================================
  // Error Recovery
  // ============================================================================

  /**
   * Add recovery strategy
   */
  addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.config.recovery.strategies.push(strategy)
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue() {
    return this.recovery.getDeadLetterQueue()
  }

  /**
   * Reprocess dead letter entry
   */
  async reprocessDeadLetter(entryId: string): Promise<TaskResult | null> {
    return this.recovery.reprocessDeadLetter(entryId, async (task) => {
      return this.executeTask(task, this.pool.getAvailableAgent(task.type)!)
    })
  }

  // ============================================================================
  // Task Executor Registration
  // ============================================================================

  /**
   * Register a task executor for a specific task type
   */
  registerExecutor(
    taskType: string,
    executor: (task: Task, agent: AgentInstance) => Promise<TaskResult>,
  ): void {
    this.taskExecutors.set(taskType, executor)
    this.log('info', `Registered executor for task type: ${taskType}`)
  }

  /**
   * Unregister a task executor
   */
  unregisterExecutor(taskType: string): void {
    this.taskExecutors.delete(taskType)
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Execute a task on an agent
   */
  private async executeTask(task: Task, agent: AgentInstance): Promise<TaskResult> {
    const startTime = Date.now()
    this.log('debug', `Executing task ${task.id} on agent ${agent.id}`)

    try {
      // Check for registered executor
      const executor = this.taskExecutors.get(task.type)

      if (executor) {
        // Use registered executor
        const result = await executor(task, agent)
        return result
      }

      // Default executor: send message to agent
      const response = await this.communication.request(
        agent.id,
        `execute:${task.type}`,
        {
          taskId: task.id,
          input: task.input,
        },
        { timeout: task.timeout },
      )

      return {
        taskId: task.id,
        success: true,
        output: response.payload as TaskResult['output'],
        agentId: agent.id,
        durationMs: Date.now() - startTime,
        retryCount: task.retryCount,
      }
    }
    catch (error) {
      const err = error as Error

      // Handle error through recovery
      const taskError = {
        code: 'TASK_EXECUTION_FAILED',
        message: err.message,
        stack: err.stack,
        recoverable: true,
      }

      if (this.config.recovery.enabled) {
        // Create executor wrapper that binds the agent parameter
        const executor = (retryTask: Task) => this.executeTask(retryTask, agent)
        const recoveryResult = await this.recovery.handleError(
          task,
          taskError,
          executor,
        )

        if (recoveryResult) {
          return recoveryResult
        }
      }

      throw error
    }
  }

  /**
   * Create agent factory
   */
  private createAgentFactory() {
    return async (config: AgentConfig): Promise<AgentInstance> => {
      // In a real implementation, this would create actual agent instances
      // For now, we create a simple instance structure
      return {
        id: config.id || nanoid(),
        config,
        status: 'idle',
        taskQueue: [],
        metrics: {
          tasksExecuted: 0,
          tasksSucceeded: 0,
          tasksFailed: 0,
          avgTaskDuration: 0,
          successRate: 0,
          totalExecutionTime: 0,
          load: 0,
          lastUpdated: Date.now(),
        },
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
      }
    }
  }

  /**
   * Setup event forwarding between components
   */
  private setupEventForwarding(): void {
    // Pool events
    this.pool.on('agent:created', agent => this.emit('agent:spawned', agent))
    this.pool.on('agent:terminated', (id, reason) => this.emit('agent:terminated', id, reason))
    this.pool.on('agent:error', (id, error) => {
      this.emit('agent:error', id, new Error(error.message))
    })
    this.pool.on('agent:recovered', id => this.emit('agent:recovered', id))

    // Scheduler events
    this.scheduler.on('task:started', task => this.emit('task:started', task))
    this.scheduler.on('task:completed', result => this.emit('task:completed', result))
    this.scheduler.on('task:failed', (id, error) => this.emit('task:failed', id, error))
    this.scheduler.on('task:timeout', id => this.emit('task:timeout', id))
    this.scheduler.on('task:cancelled', id => this.emit('task:cancelled', id))
    this.scheduler.on('task:retrying', (id, attempt) => this.emit('task:retrying', id, attempt))

    // Recovery events
    this.recovery.on('recovery:started', (id, strategy) => this.emit('recovery:started', id, strategy))
    this.recovery.on('recovery:success', id => this.emit('recovery:success', id))
    this.recovery.on('recovery:failed', (id, reason) => this.emit('recovery:failed', id, reason))

    // Communication events
    this.communication.on('message:sent', msg => this.emit('message:sent', msg))
    this.communication.on('message:received', msg => this.emit('message:received', msg))
  }

  /**
   * Merge configuration
   */
  private mergeConfig(base: OrchestratorConfig, partial: DeepPartial<OrchestratorConfig>): OrchestratorConfig {
    return {
      scheduler: { ...base.scheduler, ...partial.scheduler },
      pool: { ...base.pool, ...partial.pool },
      recovery: {
        enabled: partial.recovery?.enabled ?? base.recovery.enabled,
        maxAttempts: partial.recovery?.maxAttempts ?? base.recovery.maxAttempts,
        strategies: (partial.recovery?.strategies as RecoveryStrategy[] | undefined) ?? base.recovery.strategies,
      },
      communication: { ...base.communication, ...partial.communication },
      logging: { ...base.logging, ...partial.logging },
      metrics: { ...base.metrics, ...partial.metrics },
    }
  }

  /**
   * Handle error
   */
  private handleError(error: Error): void {
    this.lastError = {
      message: error.message,
      timestamp: Date.now(),
    }

    this.log('error', error.message)
    this.emit('orchestrator:error', error)
  }

  /**
   * Log message
   */
  private log(level: string, message: string): void {
    if (!this.config.logging.enabled) {
      return
    }

    const levels = ['debug', 'info', 'warn', 'error']
    const configLevel = this.config.logging.level

    if (levels.indexOf(level) < levels.indexOf(configLevel)) {
      return
    }

    const prefix = `[OrchestratorV3 ${level.toUpperCase()}]`

    if (this.config.logging.verbose) {
      console.log(`${prefix} ${new Date().toISOString()} ${message}`)
    }
    else {
      console.log(`${prefix} ${message}`)
    }
  }

  /**
   * Emit event
   */
  private emit(_event: string, ..._args: unknown[]): void {
    // This would use EventEmitter in a real implementation
    // For now, we'll handle it as a no-op since we can't extend EventEmitter
    // and implement this pattern cleanly in TypeScript
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an orchestrator instance
 */
export function createOrchestrator(config?: DeepPartial<OrchestratorConfig>): OrchestratorV3 {
  return new OrchestratorV3(config)
}

// ============================================================================
// Re-exports
// ============================================================================

export * from './agent-pool.js'
export * from './communication.js'
export * from './error-recovery.js'
export * from './task-scheduler.js'
export * from './types.js'
