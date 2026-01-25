/**
 * CCJK Agents V3 - Agent Pool Manager
 *
 * Manages a pool of agent instances with automatic scaling,
 * health monitoring, and load balancing.
 *
 * @module agents-v3/agent-pool
 */

import { EventEmitter } from 'node:events'
import { nanoid } from 'nanoid'
import type {
  AgentConfig,
  AgentError,
  AgentId,
  AgentInstance,
  AgentMetrics,
  AgentPoolConfig,
  AgentPoolStats,
  AgentStatus,
  TaskId,
} from './types.js'

/**
 * Default pool configuration
 */
const DEFAULT_POOL_CONFIG: AgentPoolConfig = {
  minAgents: 1,
  maxAgents: 10,
  idleTimeoutMs: 60000,
  scaleUpThreshold: 0.8,
  scaleDownThreshold: 0.2,
  healthCheckIntervalMs: 30000,
  agentCreationTimeoutMs: 10000,
}

/**
 * Agent pool events
 */
export interface AgentPoolEvents {
  'agent:created': (agent: AgentInstance) => void
  'agent:terminated': (agentId: AgentId, reason: string) => void
  'agent:error': (agentId: AgentId, error: AgentError) => void
  'agent:recovered': (agentId: AgentId) => void
  'agent:status': (agentId: AgentId, status: AgentStatus) => void
  'pool:scaled-up': (count: number) => void
  'pool:scaled-down': (count: number) => void
  'pool:health-check': (stats: AgentPoolStats) => void
}

/**
 * Agent factory function type
 */
export type AgentFactory = (config: AgentConfig) => Promise<AgentInstance>

/**
 * Agent Pool Manager
 *
 * Manages lifecycle of agent instances including creation, termination,
 * health monitoring, and automatic scaling.
 */
export class AgentPool extends EventEmitter {
  private readonly config: AgentPoolConfig
  private readonly agents: Map<AgentId, AgentInstance> = new Map()
  private readonly agentsByType: Map<string, Set<AgentId>> = new Map()
  private readonly idleTimers: Map<AgentId, NodeJS.Timeout> = new Map()
  private healthCheckTimer?: NodeJS.Timeout
  private isRunning = false
  private agentFactory?: AgentFactory

  constructor(config: Partial<AgentPoolConfig> = {}) {
    super()
    this.config = { ...DEFAULT_POOL_CONFIG, ...config }
  }

  /**
   * Start the agent pool
   */
  async start(factory?: AgentFactory): Promise<void> {
    if (this.isRunning) {
      return
    }

    this.agentFactory = factory
    this.isRunning = true

    // Start health check timer
    this.healthCheckTimer = setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheckIntervalMs,
    )

    // Create minimum agents
    await this.ensureMinimumAgents()
  }

  /**
   * Stop the agent pool
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false

    // Clear health check timer
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = undefined
    }

    // Clear all idle timers
    for (const timer of this.idleTimers.values()) {
      clearTimeout(timer)
    }
    this.idleTimers.clear()

    // Terminate all agents
    const terminatePromises = Array.from(this.agents.keys()).map(id =>
      this.terminateAgent(id, 'pool_shutdown'),
    )
    await Promise.all(terminatePromises)
  }

  /**
   * Spawn a new agent
   */
  async spawn(config: AgentConfig): Promise<AgentInstance> {
    if (this.agents.size >= this.config.maxAgents) {
      throw new Error(`Agent pool at maximum capacity (${this.config.maxAgents})`)
    }

    const agent = await this.createAgent(config)
    this.registerAgent(agent)

    this.emit('agent:created', agent)
    return agent
  }

  /**
   * Get an available agent by type
   */
  getAvailableAgent(type: string): AgentInstance | undefined {
    const typeAgents = this.agentsByType.get(type)
    if (!typeAgents) {
      return undefined
    }

    for (const agentId of typeAgents) {
      const agent = this.agents.get(agentId)
      if (agent && agent.status === 'idle') {
        return agent
      }
    }

    return undefined
  }

  /**
   * Get an available agent by capabilities
   */
  getAgentByCapabilities(capabilities: string[]): AgentInstance | undefined {
    for (const agent of this.agents.values()) {
      if (agent.status !== 'idle') {
        continue
      }

      const hasAllCapabilities = capabilities.every(cap =>
        agent.config.capabilities.includes(cap),
      )

      if (hasAllCapabilities) {
        return agent
      }
    }

    return undefined
  }

  /**
   * Get the least loaded agent
   */
  getLeastLoadedAgent(type?: string): AgentInstance | undefined {
    let leastLoaded: AgentInstance | undefined
    let minLoad = Infinity

    for (const agent of this.agents.values()) {
      if (type && agent.config.type !== type) {
        continue
      }

      if (agent.status === 'terminated' || agent.status === 'error') {
        continue
      }

      if (agent.metrics.load < minLoad) {
        minLoad = agent.metrics.load
        leastLoaded = agent
      }
    }

    return leastLoaded
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: AgentId): AgentInstance | undefined {
    return this.agents.get(agentId)
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentInstance[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: AgentStatus): AgentInstance[] {
    return Array.from(this.agents.values()).filter(a => a.status === status)
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: AgentId, status: AgentStatus): void {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return
    }

    const previousStatus = agent.status
    agent.status = status
    agent.lastActivityAt = Date.now()

    // Handle idle timeout
    if (status === 'idle') {
      this.startIdleTimer(agentId)
    } else {
      this.clearIdleTimer(agentId)
    }

    if (previousStatus !== status) {
      this.emit('agent:status', agentId, status)
    }
  }

  /**
   * Assign task to agent
   */
  assignTask(agentId: AgentId, taskId: TaskId): boolean {
    const agent = this.agents.get(agentId)
    if (!agent || agent.status !== 'idle') {
      return false
    }

    agent.currentTaskId = taskId
    agent.taskQueue.push(taskId)
    this.updateAgentStatus(agentId, 'busy')

    return true
  }

  /**
   * Complete task on agent
   */
  completeTask(agentId: AgentId, taskId: TaskId, success: boolean, durationMs: number): void {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return
    }

    // Update metrics
    agent.metrics.tasksExecuted++
    if (success) {
      agent.metrics.tasksSucceeded++
    } else {
      agent.metrics.tasksFailed++
    }

    agent.metrics.totalExecutionTime += durationMs
    agent.metrics.avgTaskDuration =
      agent.metrics.totalExecutionTime / agent.metrics.tasksExecuted
    agent.metrics.successRate =
      agent.metrics.tasksSucceeded / agent.metrics.tasksExecuted
    agent.metrics.lastUpdated = Date.now()

    // Remove task from queue
    const taskIndex = agent.taskQueue.indexOf(taskId)
    if (taskIndex !== -1) {
      agent.taskQueue.splice(taskIndex, 1)
    }

    // Update current task
    if (agent.currentTaskId === taskId) {
      agent.currentTaskId = agent.taskQueue[0]
    }

    // Update status
    if (agent.taskQueue.length === 0) {
      this.updateAgentStatus(agentId, 'idle')
    }

    // Update load
    this.updateAgentLoad(agentId)
  }

  /**
   * Report agent error
   */
  reportError(agentId: AgentId, error: AgentError): void {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return
    }

    agent.error = error
    this.updateAgentStatus(agentId, 'error')
    this.emit('agent:error', agentId, error)

    // Attempt recovery if recoverable
    if (error.recoverable) {
      this.attemptRecovery(agentId)
    }
  }

  /**
   * Terminate an agent
   */
  async terminateAgent(agentId: AgentId, reason: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return
    }

    // Clear idle timer
    this.clearIdleTimer(agentId)

    // Update status
    agent.status = 'terminated'

    // Remove from type index
    const typeAgents = this.agentsByType.get(agent.config.type)
    if (typeAgents) {
      typeAgents.delete(agentId)
      if (typeAgents.size === 0) {
        this.agentsByType.delete(agent.config.type)
      }
    }

    // Remove from agents map
    this.agents.delete(agentId)

    this.emit('agent:terminated', agentId, reason)

    // Ensure minimum agents
    if (this.isRunning) {
      await this.ensureMinimumAgents()
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): AgentPoolStats {
    const stats: AgentPoolStats = {
      totalAgents: this.agents.size,
      idleAgents: 0,
      busyAgents: 0,
      errorAgents: 0,
      avgLoad: 0,
      agentsByType: {},
      agentsByStatus: {
        idle: 0,
        busy: 0,
        paused: 0,
        error: 0,
        terminated: 0,
      },
    }

    let totalLoad = 0

    for (const agent of this.agents.values()) {
      // Count by status
      stats.agentsByStatus[agent.status]++

      if (agent.status === 'idle') {
        stats.idleAgents++
      } else if (agent.status === 'busy') {
        stats.busyAgents++
      } else if (agent.status === 'error') {
        stats.errorAgents++
      }

      // Count by type
      const type = agent.config.type
      stats.agentsByType[type] = (stats.agentsByType[type] || 0) + 1

      // Sum load
      totalLoad += agent.metrics.load
    }

    stats.avgLoad = this.agents.size > 0 ? totalLoad / this.agents.size : 0

    return stats
  }

  /**
   * Scale up the pool
   */
  async scaleUp(count: number = 1): Promise<AgentInstance[]> {
    const created: AgentInstance[] = []
    const toCreate = Math.min(count, this.config.maxAgents - this.agents.size)

    for (let i = 0; i < toCreate; i++) {
      try {
        const agent = await this.spawn({
          name: `agent-${nanoid(8)}`,
          type: 'default',
          capabilities: [],
        })
        created.push(agent)
      } catch (error) {
        // Log error but continue
        console.error('Failed to create agent during scale up:', error)
      }
    }

    if (created.length > 0) {
      this.emit('pool:scaled-up', created.length)
    }

    return created
  }

  /**
   * Scale down the pool
   */
  async scaleDown(count: number = 1): Promise<void> {
    const idleAgents = this.getAgentsByStatus('idle')
    const toTerminate = Math.min(
      count,
      idleAgents.length,
      this.agents.size - this.config.minAgents,
    )

    for (let i = 0; i < toTerminate; i++) {
      await this.terminateAgent(idleAgents[i].id, 'scale_down')
    }

    if (toTerminate > 0) {
      this.emit('pool:scaled-down', toTerminate)
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Create a new agent instance
   */
  private async createAgent(config: AgentConfig): Promise<AgentInstance> {
    const now = Date.now()
    const id = config.id || nanoid()

    // Use factory if available
    if (this.agentFactory) {
      return this.agentFactory({ ...config, id })
    }

    // Create default agent instance
    const agent: AgentInstance = {
      id,
      config: {
        ...config,
        id,
        maxConcurrentTasks: config.maxConcurrentTasks ?? 1,
        taskTimeout: config.taskTimeout ?? 300000,
        priority: config.priority ?? 'normal',
        retry: config.retry ?? {
          maxAttempts: 3,
          backoffMultiplier: 2,
          initialDelayMs: 1000,
          maxDelayMs: 30000,
        },
      },
      status: 'idle',
      taskQueue: [],
      metrics: this.createEmptyMetrics(),
      createdAt: now,
      lastActivityAt: now,
    }

    return agent
  }

  /**
   * Register an agent in the pool
   */
  private registerAgent(agent: AgentInstance): void {
    this.agents.set(agent.id, agent)

    // Add to type index
    let typeAgents = this.agentsByType.get(agent.config.type)
    if (!typeAgents) {
      typeAgents = new Set()
      this.agentsByType.set(agent.config.type, typeAgents)
    }
    typeAgents.add(agent.id)

    // Start idle timer
    this.startIdleTimer(agent.id)
  }

  /**
   * Create empty metrics
   */
  private createEmptyMetrics(): AgentMetrics {
    return {
      tasksExecuted: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      avgTaskDuration: 0,
      successRate: 0,
      totalExecutionTime: 0,
      load: 0,
      lastUpdated: Date.now(),
    }
  }

  /**
   * Start idle timer for an agent
   */
  private startIdleTimer(agentId: AgentId): void {
    this.clearIdleTimer(agentId)

    // Don't set timer if we're at minimum agents
    if (this.agents.size <= this.config.minAgents) {
      return
    }

    const timer = setTimeout(() => {
      this.terminateAgent(agentId, 'idle_timeout')
    }, this.config.idleTimeoutMs)

    this.idleTimers.set(agentId, timer)
  }

  /**
   * Clear idle timer for an agent
   */
  private clearIdleTimer(agentId: AgentId): void {
    const timer = this.idleTimers.get(agentId)
    if (timer) {
      clearTimeout(timer)
      this.idleTimers.delete(agentId)
    }
  }

  /**
   * Update agent load
   */
  private updateAgentLoad(agentId: AgentId): void {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return
    }

    const maxTasks = agent.config.maxConcurrentTasks ?? 1
    agent.metrics.load = agent.taskQueue.length / maxTasks
  }

  /**
   * Ensure minimum agents are running
   */
  private async ensureMinimumAgents(): Promise<void> {
    const deficit = this.config.minAgents - this.agents.size
    if (deficit > 0) {
      await this.scaleUp(deficit)
    }
  }

  /**
   * Perform health check on all agents
   */
  private performHealthCheck(): void {
    const now = Date.now()
    const stats = this.getStats()

    // Check for stale agents
    for (const agent of this.agents.values()) {
      const timeSinceActivity = now - agent.lastActivityAt

      // Check for stuck busy agents
      if (agent.status === 'busy' && timeSinceActivity > (agent.config.taskTimeout ?? 300000)) {
        this.reportError(agent.id, {
          code: 'AGENT_STUCK',
          message: 'Agent appears to be stuck',
          timestamp: now,
          recoverable: true,
          recoveryAttempts: 0,
        })
      }
    }

    // Auto-scale based on load
    if (stats.avgLoad > this.config.scaleUpThreshold) {
      this.scaleUp(1)
    } else if (stats.avgLoad < this.config.scaleDownThreshold) {
      this.scaleDown(1)
    }

    this.emit('pool:health-check', stats)
  }

  /**
   * Attempt to recover an agent
   */
  private async attemptRecovery(agentId: AgentId): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent || !agent.error) {
      return
    }

    agent.error.recoveryAttempts++

    // Simple recovery: reset to idle
    if (agent.error.recoveryAttempts <= 3) {
      agent.error = undefined
      agent.currentTaskId = undefined
      agent.taskQueue = []
      this.updateAgentStatus(agentId, 'idle')
      this.emit('agent:recovered', agentId)
    } else {
      // Too many recovery attempts, terminate
      await this.terminateAgent(agentId, 'recovery_failed')
    }
  }
}

/**
 * Create an agent pool instance
 */
export function createAgentPool(config?: Partial<AgentPoolConfig>): AgentPool {
  return new AgentPool(config)
}
