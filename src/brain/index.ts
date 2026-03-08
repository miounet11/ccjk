/**
 * Brain Module - Main Entry Point
 * Unified interface for agent communication, task management, and health monitoring
 */

import type {
  AgentContext,
  AgentResult,
  AgentMessage as BaseAgentMessage,
} from './agents/base-agent'
import type { TaskPriority } from './task-queue'
import type {
  AgentRole,
  BrainConfig,
  HealthStatus,
} from './types'
import type { TaskContext } from './capability-router'
import { getSmartRouter } from './smart-router'
import { getTelemetry } from './telemetry'
import process from 'node:process'
import { AgentRegistry, AgentState, BaseAgent } from './agents/base-agent'
import { CodeAgent } from './agents/code-agent'
import { getHealthMonitor, HealthMonitor, resetHealthMonitor } from './health-monitor'
import { trackMessage, trackToolCall } from './hooks/context-monitor'
import { getMetricsCollector, MetricsCollector, resetMetricsCollector } from './metrics'
import { PracticeEnforcer } from './practice-enforcer'
import { createSelfHealingSystem, SelfHealingSystem } from './self-healing'
import { skillTrigger } from './skill-trigger'
import { smartSuggestions } from './smart-suggestions'
import { superpowersRouter } from './superpowers-router'
import { TaskQueue } from './task-queue'
import { workflowAutomator } from './workflow-automator'

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
  priority?: TaskPriority

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
  private smartRouter = getSmartRouter()
  private telemetry = getTelemetry()

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

    // Track message for context monitoring
    trackMessage()

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

      // Track tool call for context monitoring
      trackToolCall()

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
          agentId: agent.getName(),
          cpuUsage: 0,
          memoryUsage: 0,
          avgResponseTime: 0,
          errorRate: 0,
          tasksCompleted: 1,
          tasksFailed: 0,
          lastUpdated: new Date().toISOString(),
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
   * 智能路由 - 根据任务复杂度决定使用哪个能力层级
   * @since v13.4.0
   */
  async routeTask(input: string, context?: Partial<TaskContext>) {
    return this.smartRouter.route(input, context)
  }

  /**
   * 记录任务执行结果（用于遥测）
   * @since v13.4.0
   */
  async recordTaskExecution(
    decision: any,
    result: {
      success: boolean
      actualSteps: number
      duration: number
      effectScore: number
    },
  ) {
    return this.smartRouter.recordExecution(decision, result)
  }

  /**
   * 获取遥测统计
   * @since v13.4.0
   */
  async getTelemetryStats() {
    return this.telemetry.getStats()
  }

  /**
   * 更新路由配置
   * @since v13.4.0
   */
  updateRouterConfig(config: Partial<BrainConfig>) {
    this.smartRouter.updateConfig({
      capabilityPreference: config.capabilityPreference,
      autoSubagentThreshold: config.autoSubagentThreshold,
      maxParallelAgents: config.maxParallelAgents,
      enableTelemetry: config.enableTelemetry,
      showReasoning: config.showDecisionReasoning,
    })
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
      return 'architect'
    }

    // Default to coordinator
    return 'coordinator'
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
  AgentResult,
  BrainConfig,
  HealthStatus,
  TaskPriority,
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

// ============================================================================
// AGENT FORK CONTEXT SYSTEM (v3.8)
// ============================================================================

/**
 * Agent Fork Context - Claude Code CLI 2.1.0 fork context isolation
 *
 * The fork context system provides:
 * - Isolated sub-agent contexts for skill execution
 * - Session ID injection (${CLAUDE_SESSION_ID})
 * - Hook lifecycle management (PreToolUse, PostToolUse, Stop)
 * - Tool filtering (allowedTools, disallowedTools)
 * - Fork context state management and transcription
 */

export {
  AgentDispatcher,
  createAgentDispatcher,
  getGlobalDispatcher,
  resetGlobalDispatcher,
} from './agent-dispatcher.js'

export type {
  AgentDispatchConfig,
  AgentDispatcherOptions,
  AgentDispatchResult,
  AgentFilterCriteria,
  ParallelAgentExecution,
  ParallelExecutionResult,
} from './agent-dispatcher.js'

export {
  AgentForkManager,
  createAgentForkManager,
  generateSessionId,
  getGlobalForkManager,
  parseSkillForkConfig,
  resetGlobalForkManager,
} from './agent-fork.js'

// ============================================================================
// AGENT DISPATCHER SYSTEM (v3.8)
// ============================================================================

/**
 * Agent Dispatcher - Skill-based agent routing and execution
 *
 * The dispatcher system provides:
 * - Agent type to role mapping
 * - Cloud agent registration and management
 * - Tool filtering and validation
 * - Parallel agent execution
 * - Agent caching and load balancing
 */

export type {
  ForkContextConfig,
  ForkContextOptions,
  ForkContextResult,
  ForkContextState,
  ForkHook,
  ForkTranscriptEntry,
} from './agent-fork.js'

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

// ============================================================================
// ORCHESTRATOR SYSTEM
// ============================================================================

/**
 * Brain Orchestrator - Advanced multi-agent coordination system
 *
 * The orchestrator provides intelligent task decomposition, parallel execution,
 * and result aggregation for complex multi-agent workflows.
 */

export {
  AutoSessionSaver,
  createAutoSessionSaver,
  getAutoSessionSaver,
  resetAutoSessionSaver,
} from './auto-session-saver'
export type {
  AutoSaveEvent,
  AutoSessionSaverStats as AutoSaverStats,
  AutoSessionSaverConfig,
  CrashRecoveryData,
} from './auto-session-saver'

export {
  ContextOverflowDetector,
  createClaudeDetector,
  createCustomDetector,
  createGPT4Detector,
  createPredictiveClaudeDetector,
  getContextDetector,
  PredictiveContextDetector,
  resetContextDetector,
} from './context-overflow-detector'

export type {
  ContextOverflowConfig,
  OverflowPrediction,
  UsageStats,
} from './context-overflow-detector'

export {
  ConvoyManager,
  getGlobalConvoyManager,
  resetGlobalConvoyManager,
} from './convoy/convoy-manager'
export type {
  Convoy,
  ConvoyStatus,
  ConvoyTask,
  CreateConvoyOptions,
  CreateTaskOptions,
} from './convoy/convoy-manager'

export {
  createProgressCallback,
  ProgressTracker,
} from './convoy/progress-tracker'

export type {
  ProgressTrackerConfig,
  ProgressUpdate,
} from './convoy/progress-tracker'
export type { HealthCheckResult, HeartbeatRecord } from './health-monitor'

export { HooksIntegration, hooksIntegration } from './hooks-integration'
export type { HookContext, HookResponse } from './hooks-integration'

export {
  getStats as getContextMonitorStats,
  resetStats as resetContextMonitor,
  trackMessage,
  trackToolCall,
} from './hooks/context-monitor'

// ============================================================================
// SKILL HOT RELOAD SYSTEM (v3.8)
// ============================================================================

/**
 * Skill Hot Reload System - Automatic skill file watching and reloading
 *
 * The skill hot-reload system provides:
 * - Automatic parsing of SKILL.md files with YAML frontmatter
 * - In-memory registry with hot-swap capability
 * - File system watching with chokidar
 * - Event-driven architecture via MessageBus
 * - Dependency tracking between skills
 */

export {
  getGlobalMayorAgent,
  MayorAgent,
  resetGlobalMayorAgent,
} from './mayor/mayor-agent'

export type {
  Intent,
  MayorAgentConfig,
  MayorResponse,
  TaskPlan,
} from './mayor/mayor-agent'

export {
  getGlobalMailboxManager,
  PersistentMailboxManager,
  resetGlobalMailboxManager,
} from './messaging/persistent-mailbox'

export type {
  Mailbox,
  Message,
  SendMessageOptions,
} from './messaging/persistent-mailbox'

// Orchestrator type definitions
export type {
  AgentCapability,
  AgentContext,
  AgentInstance,
  AgentInstanceConfig,
  AgentMessage,
  AgentMetrics,
  AgentRequirement,
  AgentSelectionCriteria,
  AgentSelectionResult,
  AgentStatus,
  BaseAgentCapability,
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
// THINKING MODE - Claude Code CLI 2.0.67+ Integration
// ============================================================================

/**
 * Thinking Mode Integration
 *
 * Provides support for Claude Code CLI 2.0.67+ thinking mode feature.
 * Enabled by default for Opus 4.5 with configurable budget tokens.
 */

export type { OrchestratorEvents } from './orchestrator.js'

// ============================================================================
// SESSION MANAGEMENT & ZPA (Zero-Prompt Architecture)
// ============================================================================

/**
 * Session Management System
 *
 * Provides comprehensive session management for CCJK:
 * - Session creation, loading, saving, and forking
 * - Git branch integration
 * - Session search and statistics
 * - Import/export functionality
 */

export type { ExtendedOrchestratorConfig } from './orchestrator.js'

export {
  getGlobalStateManager,
  GitBackedStateManager,
  resetGlobalStateManager,
} from './persistence/git-backed-state'

/**
 * Auto Session Saver
 *
 * Automatic session persistence with crash recovery:
 * - Periodic auto-save with configurable intervals
 * - Crash recovery data management
 * - Event-driven save triggers
 */

export type {
  GitBackedStateConfig,
  StateHistory,
  StateSnapshot,
} from './persistence/git-backed-state'

export { PracticeEnforcer } from './practice-enforcer'

/**
 * Context Overflow Detection
 *
 * Proactive context management with predictive capabilities:
 * - Token usage tracking and estimation
 * - Overflow prediction with configurable thresholds
 * - Auto-compact recommendations
 * - Model-specific presets (Claude, GPT-4, custom)
 */

export type { ConversationContext, GitStatus, Violation, ViolationSeverity } from './practice-enforcer'

// Result aggregation
export { ResultAggregator } from './result-aggregator.js'

/**
 * Auto Compact Manager
 *
 * Intelligent context compaction:
 * - Automatic compaction when thresholds are reached
 * - Multiple compaction strategies
 * - History preservation with summarization
 */

// ============================================================================
// GASTOWN-INSPIRED MULTI-AGENT ORCHESTRATION (v9.4)
// ============================================================================

/**
 * Git-Backed State Persistence
 *
 * Crash-safe agent state management using Git as storage backend:
 * - Git worktrees for isolated agent contexts
 * - Automatic commits on state changes
 * - State snapshots and rollback capability
 * - Multi-device sync via Git remotes
 */

export type {
  AggregationContext,
  AggregationResult,
  ResultAggregationOptions,
  ResultValidator,
  ValidationResult,
} from './result-aggregator.js'

export {
  CrossSessionRecovery,
  getCrossSessionRecovery,
  getSessionManager,
  resetSessionManager,
  SessionManager,
} from './session-manager'

/**
 * Persistent Mailbox System
 *
 * Async message passing between agents:
 * - Crash-safe message persistence
 * - Priority-based message handling
 * - Message expiration and archiving
 * - Search and filtering capabilities
 */

export type {
  RecoveryCheckpoint,
  Session,
  GitInfo as SessionGitInfo,
  SessionHistoryEntry,
  SessionListOptions,
  SessionManagerOptions,
  SessionMetadata,
} from './session-manager'

// Skill Hot Reload
export {
  createSkillHotReload,
  getSkillHotReload,
  getSkillHotReloadStats,
  resetSkillHotReload,
  SkillHotReload,
  startSkillHotReload,
  stopSkillHotReload,
} from './skill-hot-reload'

/**
 * Convoy Task Management
 *
 * Group related tasks with dependency tracking:
 * - Task grouping and progress tracking
 * - Dependency-based execution order
 * - Human notification on completion
 * - Real-time progress visualization
 */

export type {
  HotReloadEvent,
  HotReloadEventType,
  HotReloadOptions,
  HotReloadStats,
  SkillHotReloadEvents,
} from './skill-hot-reload'

// Skill Parser
export { getSkillParser, isSkillFile, parseSkillContent, parseSkillFile, resetSkillParser, SkillParser } from './skill-parser'

export type { FrontmatterParseOptions, SkillParseResult } from './skill-parser'

// Skill Registry
export {
  getSkillById,
  getSkillRegistry,
  getSkillsByTrigger,
  lookupSkills,
  registerSkill,
  resetSkillRegistry,
  SkillRegistry,
} from './skill-registry'

/**
 * Mayor Agent - AI Coordinator
 *
 * Intelligent task orchestration:
 * - Natural language intent analysis
 * - Automatic task plan generation
 * - Worker agent spawning and coordination
 * - Progress monitoring and reporting
 */

export type {
  SkillLookupOptions,
  SkillRegistryEntry,
  SkillRegistryEvents,
  SkillRegistryStats,
} from './skill-registry'

export { SKILL_TRIGGERS, skillTrigger, SkillTriggerEngine } from './skill-trigger'

// ============================================================================
// SUPERPOWERS INTEGRATION - 智能工作流系统
// ============================================================================

/**
 * Superpowers Integration - 专业工作流深度融合
 *
 * 提供:
 * - 自然语言技能触发 (访问 github.com → 自动打开浏览器)
 * - 最佳实践检测和警告 (TDD 违规、Debug 违规等)
 * - 智能建议系统 (根据上下文推荐合适的工作流)
 * - Hooks 集成 (onUserPromptSubmit, onFileChange, onPreCommit 等)
 * - 工作流自动化 (Code Review, TDD, 系统性调试等)
 */

export type { SkillTrigger, TriggerMatch } from './skill-trigger'
export { SmartSuggestions, smartSuggestions } from './smart-suggestions'

export type { ContextAnalysis, Suggestion } from './smart-suggestions'
export { SuperpowersRouter, superpowersRouter } from './superpowers-router'

export type { SuperpowerMapping, SuperpowerSkill } from './superpowers-router'
// Task decomposition
export { TaskDecomposer } from './task-decomposer.js'

export type { TaskDecompositionOptions } from './task-decomposer.js'
// Re-export specific types from other modules to avoid conflicts
export type { Task as QueueTask, TaskPriority as QueueTaskPriority, TaskOptions, TaskQueueOptions, TaskQueueStats } from './task-queue'

// Export all thinking mode types and utilities
export * from './thinking-mode.js'
// Re-export all types from types module
export * from './types'

export { WorkflowAutomator, workflowAutomator } from './workflow-automator'
export type { Plan, ReviewIssue, ReviewResult, Task as WorkflowTask } from './workflow-automator'

// ============================================================================
// CAPABILITY ROUTER & TELEMETRY SYSTEM (v13.4.0)
// ============================================================================

/**
 * Capability Router - 基于方法论的能力分层决策系统
 *
 * 提供:
 * - 最小能力原则 - 永远先用最轻、最确定、最可控的能力
 * - 可量化决策原则 - 每次升级都有明确的量化依据
 * - 可观测闭环原则 - 记录效果，持续迭代
 * - 反熵原则 - 多agent是增熵行为，谨慎使用
 */

export {
  CapabilityLevel,
  decideCapability,
  getCapabilityName,
} from './capability-router'

export type {
  TaskContext,
  TaskDecision,
} from './capability-router'

export {
  BrainTelemetry,
  getTelemetry,
  resetTelemetry,
} from './telemetry'

export type {
  TaskLog,
  TelemetryStats,
} from './telemetry'

export {
  SmartRouter,
  getSmartRouter,
  resetSmartRouter,
} from './smart-router'

export type {
  RouterConfig,
  RouterResult,
} from './smart-router'

/**
 * 统一的智能处理入口
 */
export class CCJKBrain {
  /**
   * 处理用户输入
   * 1. 检测技能触发
   * 2. 检测违规
   * 3. 生成智能建议
   */
  async processUserInput(input: string, context: any) {
    // 1. 技能触发检测
    const skillMatch = skillTrigger.getBestMatch(input)

    // 2. 最佳实践检测
    const enforcer = new PracticeEnforcer()
    const violations = await enforcer.checkAll(context)

    // 3. 智能建议
    const suggestions = await smartSuggestions.analyze(context)

    return {
      skillMatch,
      violations,
      suggestions,
    }
  }

  /**
   * 增强快捷操作
   * 将数字快捷键映射到 Superpowers 工作流
   */
  async enhanceQuickAction(actionId: number, userContext: string) {
    const skill = await superpowersRouter.routeByActionId(actionId)
    if (!skill) {
      return null
    }

    const enhancedPrompt = await superpowersRouter.generateEnhancedPrompt(
      actionId,
      userContext,
    )

    return {
      skill,
      enhancedPrompt,
    }
  }

  /**
   * 自动化工作流
   */
  async automateWorkflow(workflowType: string, params: any) {
    switch (workflowType) {
      case 'code-review':
        return workflowAutomator.autoCodeReview(params)
      case 'tdd':
        return workflowAutomator.autoTDD(params.feature)
      case 'debug':
        return workflowAutomator.autoSystematicDebugging(params.issue)
      case 'finish-branch':
        return workflowAutomator.autoFinishBranch()
      default:
        return null
    }
  }
}

/**
 * 全局单例
 */
export const ccjkBrain = new CCJKBrain()
