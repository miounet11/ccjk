/**
 * Brain Module - Main Entry Point
 * Unified interface for agent communication, task management, and health monitoring
 */

import type {
  AgentContext,
  AgentResult,
  AgentMessage as BaseAgentMessage,
} from './agents/base-agent'
import type {
  AgentRole,
  BrainConfig,
  HealthStatus,
  MessagePriority,
  TaskDefinition,
} from './types'
import process from 'node:process'
import { AgentRegistry, AgentState, BaseAgent } from './agents/base-agent'
import { CodeAgent } from './agents/code-agent'
import { getHealthMonitor, HealthMonitor, resetHealthMonitor } from './health-monitor'
import { getMetricsCollector, MetricsCollector, resetMetricsCollector } from './metrics'
import { createSelfHealingSystem, SelfHealingSystem } from './self-healing'
import { TaskQueue } from './task-queue'

/**
 * Brain execution result
 */
export interface BrainResult<T = unknown> {
  success: boolean
  data?: T
  error?: Error
  message?: string
  metadata?: Record<string, unknown>
}

/**
 * Brain execution options
 */
export interface BrainExecuteOptions {
  /**
   * Agent role to execute the task (default: auto-detect)
   */
  agent?: AgentRole

  /**
   * Task priority (default: 'normal')
   */
  priority?: MessagePriority

  /**
   * Task timeout in milliseconds (default: 60000)
   */
  timeout?: number

  /**
   * Maximum retry attempts (default: 3)
   */
  maxRetries?: number

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>
}

/**
 * Brain initialization options
 */
export interface BrainInitOptions {
  /**
   * Working directory (default: process.cwd())
   */
  workingDirectory?: string

  /**
   * Project root directory (default: process.cwd())
   */
  projectRoot?: string

  /**
   * Language (default: 'en')
   */
  language?: string

  /**
   * Enable verbose logging (default: false)
   */
  verbose?: boolean

  /**
   * Task queue concurrency (default: 5)
   */
  concurrency?: number

  /**
   * Enable health monitoring (default: true)
   */
  enableHealthMonitoring?: boolean

  /**
   * Brain configuration
   */
  config?: Partial<BrainConfig>
}

/**
 * Brain statistics
 */
export interface BrainStats {
  /**
   * Total agents registered
   */
  totalAgents: number

  /**
   * Active agents
   */
  activeAgents: number

  /**
   * Total tasks executed
   */
  totalTasks: number

  /**
   * Pending tasks
   */
  pendingTasks: number

  /**
   * Completed tasks
   */
  completedTasks: number

  /**
   * Failed tasks
   */
  failedTasks: number

  /**
   * Average task execution time (ms)
   */
  averageExecutionTime: number

  /**
   * Health monitoring statistics
   */
  health: {
    totalAgents: number
    healthyAgents: number
    degradedAgents: number
    unhealthyAgents: number
    deadAgents: number
  }
}

/**
 * Brain - Main orchestration class for agent system
 */
export class Brain {
  private initialized = false
  private context: AgentContext
  private registry: AgentRegistry
  private taskQueue: TaskQueue
  private healthMonitor?: HealthMonitor
  private metricsCollector?: MetricsCollector
  private options: Required<BrainInitOptions>
  private messageHistory: BaseAgentMessage[] = []

  constructor(options: BrainInitOptions = {}) {
    const cwd = process.cwd()
    const env = process.env
    this.options = {
      workingDirectory: options.workingDirectory ?? cwd,
      projectRoot: options.projectRoot ?? cwd,
      language: options.language ?? 'en',
      verbose: options.verbose ?? false,
      concurrency: options.concurrency ?? 5,
      enableHealthMonitoring: options.enableHealthMonitoring ?? true,
      config: options.config ?? {},
    }

    // Initialize context
    this.context = {
      workingDirectory: this.options.workingDirectory,
      projectRoot: this.options.projectRoot,
      language: this.options.language,
      environment: env as Record<string, string>,
      history: this.messageHistory,
    }

    // Initialize registry
    this.registry = new AgentRegistry()

    // Initialize task queue
    this.taskQueue = new TaskQueue({
      concurrency: this.options.concurrency,
      defaultTimeout: 60000,
      defaultMaxRetries: 3,
      autoStart: true,
    })

    // Initialize health monitor
    if (this.options.enableHealthMonitoring) {
      this.healthMonitor = getHealthMonitor({
        heartbeatTimeout: 30000,
        checkInterval: 10000,
        autoRestart: true,
      })

      // Initialize metrics collector
      this.metricsCollector = getMetricsCollector({
        maxRecords: 1000,
        retentionPeriod: 3600000, // 1 hour
      })

      // Initialize self-healing system
    }
  }

  /**
   * Initialize the Brain system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Brain is already initialized')
    }

    this.log('Initializing Brain system...')

    try {
      // Register default agents
      await this.registerDefaultAgents()

      // Start health monitoring
      if (this.healthMonitor) {
        this.healthMonitor.start()
        this.log('Health monitoring started')
      }

      // Initialize all registered agents
      await this.initializeAgents()

      this.initialized = true
      this.log('Brain system initialized successfully')
    }
    catch (error) {
      this.log(`Failed to initialize Brain: ${error instanceof Error ? error.message : String(error)}`, 'error')
      throw error
    }
  }

  /**
   * Execute a task using the Brain system
   */
  async execute(command: string, options: BrainExecuteOptions = {}): Promise<BrainResult> {
    if (!this.initialized) {
      throw new Error('Brain is not initialized. Call initialize() first.')
    }

    this.log(`Executing command: ${command}`)

    try {
      // Determine which agent to use
      const agentRole = options.agent ?? this.detectAgentForCommand(command)
      const agent = this.getAgentByRole(agentRole)

      if (!agent) {
        throw new Error(`No agent found for role: ${agentRole}`)
      }

      // Record heartbeat if health monitoring is enabled
      if (this.healthMonitor) {
        this.healthMonitor.recordHeartbeat(agent.getName())
      }

      // Execute task through task queue
      const result = await this.taskQueue.add(
        async () => {
          return agent.process(command, {
            ...options.metadata,
            priority: options.priority,
          })
        },
        {
          priority: options.priority ?? 'normal',
          timeout: options.timeout ?? 60000,
          maxRetries: options.maxRetries ?? 3,
          metadata: options.metadata,
        },
      )

      // Record successful heartbeat
      if (this.healthMonitor && result.success) {
        this.healthMonitor.recordHeartbeat(agent.getName(), {
          cpuUsage: 0,
          memoryUsage: 0,
          avgResponseTime: 0,
          errorRate: 0,
          taskCount: 1,
          successRate: 1,
          timestamp: Date.now(),
        })
      }

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        message: result.message,
        metadata: {
          agent: agent.getName(),
          agentRole,
          ...result.metadata,
        },
      }
    }
    catch (error) {
      this.log(`Execution failed: ${error instanceof Error ? error.message : String(error)}`, 'error')
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        message: `Failed to execute command: ${command}`,
      }
    }
  }

  /**
   * Get Brain statistics
   */
  getStats(): BrainStats {
    const queueStats = this.taskQueue.getStats()
    const healthStats = this.healthMonitor?.getStatistics() ?? {
      totalAgents: 0,
      healthyAgents: 0,
      degradedAgents: 0,
      unhealthyAgents: 0,
      deadAgents: 0,
    }

    return {
      totalAgents: this.registry.size(),
      activeAgents: this.registry.getAll().filter(a => a.getState() !== AgentState.IDLE).length,
      totalTasks: queueStats.totalTasks,
      pendingTasks: queueStats.pendingTasks,
      completedTasks: queueStats.completedTasks,
      failedTasks: queueStats.failedTasks,
      averageExecutionTime: queueStats.averageExecutionTime,
      health: healthStats,
    }
  }

  /**
   * Get agent health status
   */
  getAgentHealth(agentName: string): {
    healthy: boolean
    status: HealthStatus
    lastHeartbeat: number
    timeSinceLastHeartbeat: number
    issues: string[]
  } | null {
    if (!this.healthMonitor) {
      return null
    }

    return this.healthMonitor.getHealthStatus(agentName)
  }

  /**
   * Get agent metrics
   */
  getAgentMetrics(agentName: string): ReturnType<MetricsCollector['getAgentMetrics']> | null {
    if (!this.metricsCollector) {
      return null
    }

    return this.metricsCollector.getAgentMetrics(agentName)
  }

  /**
   * Get all registered agents
   */
  getAgents(): BaseAgent[] {
    return this.registry.getAll()
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): BaseAgent | undefined {
    return this.registry.get(name)
  }

  /**
   * Register a custom agent
   */
  registerAgent(agent: BaseAgent): void {
    this.registry.register(agent)
    this.log(`Registered agent: ${agent.getName()}`)
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(name: string): void {
    this.registry.unregister(name)
    if (this.healthMonitor) {
      this.healthMonitor.removeAgent(name)
    }
    if (this.metricsCollector) {
      this.metricsCollector.clearAgentMetrics(name)
    }
    this.log(`Unregistered agent: ${name}`)
  }

  /**
   * Shutdown the Brain system
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return
    }

    this.log('Shutting down Brain system...')

    try {
      // Stop health monitoring
      if (this.healthMonitor) {
        this.healthMonitor.stop()
        this.log('Health monitoring stopped')
      }

      // Clear metrics
      if (this.metricsCollector) {
        this.metricsCollector.clearAll()
        this.log('Metrics cleared')
      }

      // Wait for all tasks to complete
      await this.taskQueue.drain()
      this.log('All tasks completed')

      // Cleanup all agents
      const agents = this.registry.getAll()
      for (const agent of agents) {
        await agent.cleanup()
        this.log(`Cleaned up agent: ${agent.getName()}`)
      }

      // Clear registry
      this.registry.clear()

      // Reset health monitor and metrics collector
      resetHealthMonitor()
      resetMetricsCollector()

      this.initialized = false
      this.log('Brain system shutdown complete')
    }
    catch (error) {
      this.log(`Error during shutdown: ${error instanceof Error ? error.message : String(error)}`, 'error')
      throw error
    }
  }

  /**
   * Check if Brain is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get message history
   */
  getHistory(): BaseAgentMessage[] {
    return [...this.messageHistory]
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = []
  }

  /**
   * Register default agents
   */
  private async registerDefaultAgents(): Promise<void> {
    this.log('Registering default agents...')

    // Register Code Agent
    const codeAgent = new CodeAgent(this.context)
    this.registry.register(codeAgent)
    this.log('Registered Code Agent')

    // Additional agents can be registered here
  }

  /**
   * Initialize all registered agents
   */
  private async initializeAgents(): Promise<void> {
    const agents = this.registry.getAll()
    this.log(`Initializing ${agents.length} agents...`)

    for (const agent of agents) {
      try {
        await agent.initialize()
        this.log(`Initialized agent: ${agent.getName()}`)
      }
      catch (error) {
        this.log(`Failed to initialize agent ${agent.getName()}: ${error instanceof Error ? error.message : String(error)}`, 'error')
        throw error
      }
    }
  }

  /**
   * Detect which agent should handle the command
   */
  private detectAgentForCommand(command: string): AgentRole {
    const lowerCommand = command.toLowerCase()

    // Code-related commands
    if (
      lowerCommand.includes('analyze')
      || lowerCommand.includes('review')
      || lowerCommand.includes('refactor')
      || lowerCommand.includes('code')
      || lowerCommand.includes('performance')
      || lowerCommand.includes('metrics')
    ) {
      return 'typescript-cli-architect'
    }

    // Default to system
    return 'system'
  }

  /**
   * Get agent by role
   */
  private getAgentByRole(role: AgentRole): BaseAgent | undefined {
    // For now, we map roles to agent names
    // This can be extended with a more sophisticated mapping
    const roleToAgentName: Record<string, string> = {
      'typescript-cli-architect': 'code-agent',
      'ccjk-i18n-specialist': 'code-agent',
      'ccjk-tools-integration-specialist': 'code-agent',
      'ccjk-template-engine': 'code-agent',
      'ccjk-config-architect': 'code-agent',
      'ccjk-testing-specialist': 'code-agent',
      'ccjk-devops-engineer': 'code-agent',
      'system': 'code-agent',
    }

    const agentName = roleToAgentName[role]
    return agentName ? this.registry.get(agentName) : undefined
  }

  /**
   * Log message (if verbose mode enabled)
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (this.options.verbose) {
      const prefix = '[Brain]'
      switch (level) {
        case 'warn':
          console.warn(`${prefix} ${message}`)
          break
        case 'error':
          console.error(`${prefix} ${message}`)
          break
        default:
          console.log(`${prefix} ${message}`)
      }
    }
  }
}

/**
 * Create a Brain instance with default options
 */
export function createBrain(options?: BrainInitOptions): Brain {
  return new Brain(options)
}

// Re-export types and classes for convenience
export type {
  AgentContext,
  AgentResult,
  BrainConfig,
  HealthStatus,
  MessagePriority,
  TaskDefinition,
}

export {
  AgentRegistry,
  AgentState,
  BaseAgent,
  CodeAgent,
  createSelfHealingSystem,
  getHealthMonitor,
  getMetricsCollector,
  HealthMonitor,
  MetricsCollector,
  resetHealthMonitor,
  resetMetricsCollector,
  SelfHealingSystem,
  TaskQueue,
}

export type {
  CodeAnalysisResult,
  CodeIssue,
  CodeMetrics,
  CodeSuggestion,
  PerformanceAnalysis,
  PerformanceBottleneck,
  PerformanceRecommendation,
  RefactoringPlan,
  RefactoringStep,
} from './agents/code-agent'

export type { HealthCheckResult, HeartbeatRecord } from './health-monitor'
// Orchestrator type definitions
export type {
  AgentInstance,
  AgentInstanceConfig,
  AgentMetrics,
  AgentRequirement,
  AgentSelectionCriteria,
  AgentSelectionResult,
  AgentStatus,
  ConflictResolutionContext,
  ConflictResolutionResult,
  ConflictResolutionStrategy,
  DecompositionStrategy,
  DependencyCondition,
  DependencyType,
  OrchestrationMetrics,
  OrchestrationPlan,
  OrchestrationResult,
  OrchestratorConfig,
  OrchestratorState,
  Task as OrchestratorTask,
  TaskPriority as OrchestratorTaskPriority,
  TaskArtifact,
  TaskDecompositionResult,
  TaskDependency,
  TaskError,
  TaskExecutionGraph,
  TaskExecutionRecord,
  TaskGraphEdge,
  TaskGraphNode,
  TaskInput,
  TaskMetadata,
  TaskOutput,
  TaskStage,
  TaskStatus,
} from './orchestrator-types.js'
// Core orchestrator
export { BrainOrchestrator } from './orchestrator.js'

// ============================================================================
// NEW ORCHESTRATOR SYSTEM
// ============================================================================

/**
 * Brain Orchestrator - Advanced multi-agent coordination system
 *
 * The orchestrator provides intelligent task decomposition, parallel execution,
 * and result aggregation for complex multi-agent workflows.
 */

export type { OrchestratorEvents } from './orchestrator.js'
// Result aggregation
export { ResultAggregator } from './result-aggregator.js'

export type {
  AggregationContext,
  AggregationResult,
  ResultAggregationOptions,
  ResultValidator,
  ValidationResult,
} from './result-aggregator.js'
// Task decomposition
export { TaskDecomposer } from './task-decomposer.js'

export type { TaskDecompositionOptions } from './task-decomposer.js'
// Re-export specific types from other modules to avoid conflicts
export type { Task as QueueTask, TaskPriority as QueueTaskPriority, TaskOptions, TaskQueueOptions, TaskQueueStats } from './task-queue'

// Re-export all types from types module
export * from './types'
