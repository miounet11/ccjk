/**
 * Agent Fork Context System for CCJK v3.8
 *
 * Implements Claude Code CLI 2.1.0's fork context feature, allowing skills
 * to run in isolated sub-agent contexts with proper session management,
 * tool filtering, and hook lifecycle integration.
 *
 * @module brain/agent-fork
 */

import type {
  SkillMdFile,
  SkillMdMetadata,
  SubagentContextMode,
} from '../types/skill-md'
import type {
  OrchestrationResult,
  Task,
  TaskOutput,
} from './orchestrator-types'
import type { AgentRole } from './types'
import { nanoid } from 'nanoid'
import { resolve } from 'pathe'

/**
 * Fork context execution configuration
 */
export interface ForkContextConfig {
  /** Unique fork context identifier */
  id: string

  /** Parent context ID (if nested) */
  parentId?: string

  /** Session ID for Claude Code context tracking */
  sessionId: string

  /** Skill metadata to use for this fork */
  skill: SkillMdFile

  /** Agent type to execute the skill */
  agentType?: string

  /** Agent role for this fork */
  agentRole?: AgentRole

  /** Execution mode (fork or inherit) */
  mode: SubagentContextMode

  /** Working directory for this fork */
  workingDirectory: string

  /** Environment variables for this fork */
  env: Record<string, string>

  /** Disallowed tools (filtered from parent context) */
  disallowedTools?: string[]

  /** Allowed tools (explicitly allowed) */
  allowedTools?: string[]

  /** Fork-specific timeout in milliseconds */
  timeout?: number

  /** Maximum retries */
  maxRetries?: number

  /** Verbose logging */
  verbose?: boolean

  /** Hook definitions scoped to this fork */
  hooks?: ForkHook[]

  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Hook scoped to a fork context
 */
export interface ForkHook {
  /** Hook type (PreToolUse, PostToolUse, Stop) */
  type: 'PreToolUse' | 'PostToolUse' | 'Stop'

  /** Pattern to match for conditional execution */
  matcher?: string

  /** Shell command to execute */
  command?: string

  /** Inline script to execute */
  script?: string

  /** Timeout in seconds */
  timeout?: number

  /** Whether hook is enabled */
  enabled?: boolean
}

/**
 * Fork context state
 */
export interface ForkContextState {
  /** Unique fork identifier */
  id: string

  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled'

  /** Task being executed */
  task?: Task

  /** Execution result */
  result?: ForkContextResult

  /** Execution transcript */
  transcript: ForkTranscriptEntry[]

  /** Started timestamp */
  startedAt: Date

  /** Ended timestamp */
  endedAt?: Date

  /** Error if failed */
  error?: string

  /** Child fork contexts */
  children: string[]
}

/**
 * Fork context transcript entry
 */
export interface ForkTranscriptEntry {
  /** Entry timestamp */
  timestamp: Date

  /** Entry type */
  type: 'user' | 'assistant' | 'tool' | 'system' | 'hook' | 'error'

  /** Content */
  content: string

  /** Tool name (if tool entry) */
  toolName?: string

  /** Hook type (if hook entry) */
  hookType?: string

  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Fork context execution result
 */
export interface ForkContextResult {
  /** Whether execution succeeded */
  success: boolean

  /** Task output */
  output?: TaskOutput

  /** Generated files */
  files?: string[]

  /** Execution duration in milliseconds */
  durationMs: number

  /** Final transcript */
  transcript: ForkTranscriptEntry[]

  /** Error message (if failed) */
  error?: string

  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Fork context options
 */
export interface ForkContextOptions {
  /** Default timeout in milliseconds */
  defaultTimeout?: number

  /** Maximum concurrent forks */
  maxConcurrentForks?: number

  /** Enable transcript saving */
  enableTranscriptSaving?: boolean

  /** Transcript output directory */
  transcriptDir?: string

  /** Enable hook execution */
  enableHooks?: boolean

  /** Hook timeout in seconds */
  defaultHookTimeout?: number

  /** Verbose logging */
  verbose?: boolean
}

/**
 * Fork context manager events
 */
export interface ForkContextEvents {
  /** Emitted when a fork context is created */
  created: (fork: ForkContextState) => void

  /** Emitted when a fork context starts execution */
  started: (fork: ForkContextState) => void

  /** Emitted when a fork context completes */
  completed: (fork: ForkContextState, result: ForkContextResult) => void

  /** Emitted when a fork context fails */
  failed: (fork: ForkContextState, error: string) => void

  /** Emitted when a fork context times out */
  timeout: (fork: ForkContextState) => void

  /** Emitted when a fork context is cancelled */
  cancelled: (fork: ForkContextState) => void

  /** Emitted when a transcript entry is added */
  transcript: (fork: ForkContextState, entry: ForkTranscriptEntry) => void

  /** Emitted when status changes */
  statusChange: (fork: ForkContextState, oldStatus: ForkContextState['status'], newStatus: ForkContextState['status']) => void
}

/**
 * Hook context for fork
 *
 * Simplified version for fork context hook execution.
 */
export interface ForkHookContext {
  /** Fork context ID */
  forkId: string

  /** Skill metadata */
  skill: SkillMdMetadata

  /** Agent type (if specified) */
  agentType?: string

  /** Working directory */
  workingDirectory: string

  /** Session ID */
  sessionId: string
}

/**
 * Default fork context options
 */
const DEFAULT_FORK_OPTIONS: Required<ForkContextOptions> = {
  defaultTimeout: 300000, // 5 minutes
  maxConcurrentForks: 10,
  enableTranscriptSaving: true,
  transcriptDir: process.env.HOME ? resolve(process.env.HOME, '.claude', 'fork-transcripts') : resolve('.claude', 'fork-transcripts'),
  enableHooks: true,
  defaultHookTimeout: 30,
  verbose: false,
}

/**
 * Session ID environment variable name
 */
const SESSION_ID_ENV_VAR = 'CLAUDE_SESSION_ID'

/**
 * Generate a unique session ID for fork context
 */
export function generateSessionId(): string {
  return `ccjk-fork-${Date.now()}-${nanoid(8)}`
}

/**
 * Parse skill frontmatter to extract fork context configuration
 *
 * @param skill - Parsed SKILL.md file
 * @returns Fork context configuration options
 */
export function parseSkillForkConfig(skill: SkillMdFile): Omit<Partial<ForkContextConfig>, 'id' | 'sessionId'> {
  const config: Omit<Partial<ForkContextConfig>, 'id' | 'sessionId'> = {
    skill,
  }

  const metadata = skill.metadata

  // Extract context mode
  if (metadata.context) {
    config.mode = metadata.context
  }

  // Extract agent type
  if (metadata.agent) {
    config.agentType = metadata.agent
  }

  // Extract allowed tools
  if (metadata.allowed_tools) {
    config.allowedTools = metadata.allowed_tools
  }

  // Extract hooks
  if (metadata.hooks) {
    config.hooks = metadata.hooks.map(h => ({
      type: h.type as ForkHook['type'],
      matcher: h.matcher,
      command: h.command,
      script: h.script,
      timeout: h.timeout,
      enabled: true,
    }))
  }

  // Extract timeout
  if (metadata.timeout) {
    config.timeout = metadata.timeout * 1000 // Convert to milliseconds
  }

  return config
}

/**
 * Agent Fork Context Manager
 *
 * Manages the lifecycle of fork contexts for isolated agent execution.
 */
export class AgentForkManager {
  private options: Required<ForkContextOptions>
  private forks: Map<string, ForkContextState> = new Map()
  private listeners: Map<keyof ForkContextEvents, Set<(...args: any[]) => any>> = new Map()
  private activeForksCount = 0

  constructor(options: ForkContextOptions = {}) {
    this.options = { ...DEFAULT_FORK_OPTIONS, ...options }
  }

  /**
   * Create a new fork context from a skill
   *
   * @param skill - Parsed SKILL.md file
   * @param overrides - Optional configuration overrides
   * @returns Fork context state
   */
  createFork(
    skill: SkillMdFile,
    overrides: Partial<ForkContextConfig> = {},
  ): ForkContextState {
    const skillConfig = parseSkillForkConfig(skill)

    // Ensure required fields are set
    const config: ForkContextConfig = {
      id: overrides.id || nanoid(),
      sessionId: overrides.sessionId || generateSessionId(),
      workingDirectory: overrides.workingDirectory || skillConfig.workingDirectory || process.cwd(),
      env: overrides.env || skillConfig.env || { ...process.env } as Record<string, string>,
      mode: overrides.mode || skillConfig.mode || 'fork',
      skill,
      // Optional fields
      ...(overrides.parentId && { parentId: overrides.parentId }),
      ...(skillConfig.agentType && { agentType: skillConfig.agentType }),
      ...(skillConfig.agentRole && { agentRole: skillConfig.agentRole }),
      ...(skillConfig.disallowedTools && { disallowedTools: skillConfig.disallowedTools }),
      ...(skillConfig.allowedTools && { allowedTools: skillConfig.allowedTools }),
      ...(skillConfig.timeout && { timeout: skillConfig.timeout }),
      ...(skillConfig.hooks && { hooks: skillConfig.hooks }),
      ...(overrides.verbose !== undefined && { verbose: overrides.verbose }),
      ...(skillConfig.metadata && { metadata: skillConfig.metadata }),
      ...(overrides.metadata && { metadata: overrides.metadata }),
    }

    // Inject session ID into environment
    config.env[SESSION_ID_ENV_VAR] = config.sessionId

    this.checkConcurrentLimit()

    const fork: ForkContextState = {
      id: config.id,
      status: 'pending',
      transcript: [],
      startedAt: new Date(),
      children: [],
    }

    this.forks.set(config.id, fork)

    if (this.options.verbose) {
      console.log(`[AgentForkManager] Created fork: ${config.id} (session: ${config.sessionId})`)
    }

    this.emit('created', fork)
    return fork
  }

  /**
   * Execute a fork context
   *
   * @param forkId - Fork context ID
   * @param task - Task to execute
   * @param executeFn - Execution function
   * @returns Execution result
   */
  async executeFork(
    forkId: string,
    task: Task,
    executeFn: (context: ForkContextConfig) => Promise<OrchestrationResult>,
  ): Promise<ForkContextResult> {
    const fork = this.getForkOrThrow(forkId)

    // Update status
    this.changeStatus(forkId, 'running')
    fork.task = task

    this.addTranscript(forkId, {
      timestamp: new Date(),
      type: 'system',
      content: `Starting fork execution: ${task.name}`,
      metadata: { taskId: task.id },
    })

    const startTime = Date.now()
    const config = this.buildForkConfig(forkId)

    try {
      // Execute with timeout
      const timeout = config.timeout ?? this.options.defaultTimeout

      const result = await this.executeWithTimeout(
        () => this.executeWithHooks(forkId, task, executeFn),
        timeout,
      )

      fork.endedAt = new Date()
      fork.result = {
        success: true,
        durationMs: Date.now() - startTime,
        transcript: fork.transcript,
        output: result.results as any,
      }

      this.changeStatus(forkId, 'completed')
      this.emit('completed', fork, fork.result)

      if (this.options.enableTranscriptSaving) {
        this.saveTranscript(forkId)
      }

      return fork.result
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      fork.endedAt = new Date()
      fork.error = errorMessage

      fork.result = {
        success: false,
        durationMs: Date.now() - startTime,
        transcript: fork.transcript,
        error: errorMessage,
      }

      this.changeStatus(forkId, 'failed')
      this.emit('failed', fork, errorMessage)

      if (this.options.enableTranscriptSaving) {
        this.saveTranscript(forkId)
      }

      return fork.result
    }
  }

  /**
   * Execute fork with hooks
   *
   * @param forkId - Fork context ID
   * @param task - Task to execute
   * @param executeFn - Execution function
   * @returns Execution result
   */
  private async executeWithHooks(
    forkId: string,
    task: Task,
    executeFn: (context: ForkContextConfig) => Promise<OrchestrationResult>,
  ): Promise<OrchestrationResult> {
    const config = this.buildForkConfig(forkId)

    // Execute PreToolUse hooks before execution
    if (this.options.enableHooks && config.hooks) {
      for (const hook of config.hooks) {
        if (hook.type === 'PreToolUse' && this.shouldExecuteHook(hook, 'start')) {
          await this.executeHook(forkId, hook, 'start')
        }
      }
    }

    // Execute the main task
    const result = await executeFn(config)

    // Execute PostToolUse hooks after execution
    if (this.options.enableHooks && config.hooks) {
      for (const hook of config.hooks) {
        if (hook.type === 'PostToolUse' && this.shouldExecuteHook(hook, 'complete')) {
          await this.executeHook(forkId, hook, 'complete')
        }
      }
    }

    return result
  }

  /**
   * Execute a single hook
   *
   * @param forkId - Fork context ID
   * @param hook - Hook to execute
   * @param trigger - Trigger event
   */
  private async executeHook(
    forkId: string,
    hook: ForkHook,
    trigger: string,
  ): Promise<void> {
    if (hook.enabled === false) {
      return
    }

    const _fork = this.getForkOrThrow(forkId)
    const timeout = (hook.timeout ?? this.options.defaultHookTimeout) * 1000

    this.addTranscript(forkId, {
      timestamp: new Date(),
      type: 'hook',
      content: `Executing ${hook.type} hook`,
      hookType: hook.type,
      metadata: { trigger, matcher: hook.matcher },
    })

    try {
      await this.executeWithTimeout(async () => {
        if (hook.command) {
          const { exec } = await import('tinyexec')
          const execOptions = { env: this.buildForkConfig(forkId).env }
          await exec('sh', ['-c', hook.command], execOptions as any)
        }
        else if (hook.script) {
          // For inline scripts, we could use eval or a separate process
          // For security, we'll execute via a separate node process
          const { exec } = await import('tinyexec')
          const execOptions = { env: this.buildForkConfig(forkId).env }
          await exec('node', ['-e', hook.script], execOptions as any)
        }
      }, timeout)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.addTranscript(forkId, {
        timestamp: new Date(),
        type: 'error',
        content: `Hook execution failed: ${message}`,
        hookType: hook.type,
      })
    }
  }

  /**
   * Check if a hook should be executed
   *
   * @param hook - Hook definition
   * @param trigger - Trigger event
   * @returns Whether to execute
   */
  private shouldExecuteHook(hook: ForkHook, trigger: string): boolean {
    if (!hook.matcher) {
      return true
    }

    // Simple pattern matching
    // For more complex matching, integrate with the hooks system
    const pattern = hook.matcher.replace(/\*/g, '.*')
    const regex = new RegExp(pattern)
    return regex.test(trigger)
  }

  /**
   * Execute with timeout
   *
   * @param fn - Function to execute
   * @param timeout - Timeout in milliseconds
   * @returns Function result
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Execution timed out after ${timeout}ms`)), timeout),
      ),
    ])
  }

  /**
   * Build fork configuration from state
   *
   * @param forkId - Fork context ID
   * @returns Fork configuration
   */
  private buildForkConfig(forkId: string): ForkContextConfig {
    const _fork = this.getForkOrThrow(forkId)

    // Get the skill config that was used to create this fork
    // In a real implementation, we'd store the config with the state
    const skill = this.findSkillForFork(forkId)

    return {
      id: forkId,
      sessionId: this.getSessionIdForFork(forkId),
      skill,
      workingDirectory: process.cwd(),
      env: { ...process.env, [SESSION_ID_ENV_VAR]: this.getSessionIdForFork(forkId) } as Record<string, string>,
      mode: 'fork',
    }
  }

  /**
   * Find the skill for a fork (placeholder implementation)
   *
   * @param forkId - Fork context ID
   * @returns Skill file
   */
  private findSkillForFork(_forkId: string): SkillMdFile {
    // This would be implemented by storing the skill with the fork state
    // For now, return a minimal skill
    return {
      metadata: {
        name: 'unknown',
        description: 'Unknown skill',
        version: '1.0.0',
        category: 'custom',
        triggers: [],
        use_when: [],
      },
      content: '',
      filePath: '',
    }
  }

  /**
   * Get the session ID for a fork
   *
   * @param forkId - Fork context ID
   * @returns Session ID
   */
  private getSessionIdForFork(_forkId: string): string {
    return generateSessionId()
  }

  /**
   * Add a transcript entry to a fork
   *
   * @param forkId - Fork context ID
   * @param entry - Transcript entry
   */
  addTranscript(forkId: string, entry: Omit<ForkTranscriptEntry, 'timestamp'> & { timestamp?: Date }): void {
    const fork = this.getForkOrThrow(forkId)

    const fullEntry: ForkTranscriptEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date(),
    }

    fork.transcript.push(fullEntry)

    if (this.options.verbose) {
      console.log(`[AgentForkManager] Transcript [${forkId}] ${fullEntry.type}: ${fullEntry.content.substring(0, 100)}`)
    }

    this.emit('transcript', fork, fullEntry)
  }

  /**
   * Save fork transcript to file
   *
   * @param forkId - Fork context ID
   * @returns Saved file path
   */
  saveTranscript(forkId: string): string {
    const fork = this.getForkOrThrow(forkId)
    const fs = require('node:fs/promises')
    const { join } = require('pathe')

    const filename = `fork-${fork.id}-${Date.now()}.json`
    const filePath = join(this.options.transcriptDir, filename)

    fs.mkdir(this.options.transcriptDir, { recursive: true })
      .then(() => fs.writeFile(filePath, JSON.stringify({
        forkId: fork.id,
        status: fork.status,
        transcript: fork.transcript,
        startedAt: fork.startedAt,
        endedAt: fork.endedAt,
        result: fork.result,
      }, null, 2)))
      .catch(console.error)

    return filePath
  }

  /**
   * Get a fork context by ID
   *
   * @param forkId - Fork context ID
   * @returns Fork state or null
   */
  getFork(forkId: string): ForkContextState | null {
    return this.forks.get(forkId) || null
  }

  /**
   * Cancel a running fork
   *
   * @param forkId - Fork context ID
   */
  cancel(forkId: string): void {
    const fork = this.getForkOrThrow(forkId)

    if (fork.status === 'completed' || fork.status === 'failed') {
      throw new Error(`Cannot cancel fork ${forkId} with status: ${fork.status}`)
    }

    fork.endedAt = new Date()
    this.changeStatus(forkId, 'cancelled')

    if (this.options.verbose) {
      console.log(`[AgentForkManager] Cancelled fork: ${forkId}`)
    }

    this.emit('cancelled', fork)
  }

  /**
   * Remove a fork context
   *
   * @param forkId - Fork context ID
   * @returns True if removed
   */
  remove(forkId: string): boolean {
    const fork = this.forks.get(forkId)
    if (!fork) {
      return false
    }

    this.forks.delete(forkId)
    this.activeForksCount--

    if (this.options.verbose) {
      console.log(`[AgentForkManager] Removed fork: ${forkId}`)
    }

    return true
  }

  /**
   * Clear finished forks
   *
   * @returns Number cleared
   */
  clearFinished(): number {
    const toRemove = Array.from(this.forks.values()).filter(
      f => ['completed', 'failed', 'cancelled', 'timeout'].includes(f.status),
    )

    toRemove.forEach(f => this.remove(f.id))

    if (this.options.verbose) {
      console.log(`[AgentForkManager] Cleared ${toRemove.length} finished forks`)
    }

    return toRemove.length
  }

  /**
   * Get all forks
   *
   * @returns Array of fork states
   */
  listAll(): ForkContextState[] {
    return Array.from(this.forks.values())
  }

  /**
   * Get active forks
   *
   * @returns Array of active fork states
   */
  listActive(): ForkContextState[] {
    return Array.from(this.forks.values()).filter(
      f => f.status === 'running' || f.status === 'pending',
    )
  }

  /**
   * Get fork statistics
   *
   * @returns Statistics
   */
  getStats(): {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    timeout: number
    cancelled: number
    active: number
  } {
    const forks = Array.from(this.forks.values())
    return {
      total: forks.length,
      pending: forks.filter(f => f.status === 'pending').length,
      running: forks.filter(f => f.status === 'running').length,
      completed: forks.filter(f => f.status === 'completed').length,
      failed: forks.filter(f => f.status === 'failed').length,
      timeout: forks.filter(f => f.status === 'timeout').length,
      cancelled: forks.filter(f => f.status === 'cancelled').length,
      active: forks.filter(f => f.status === 'running' || f.status === 'pending').length,
    }
  }

  /**
   * Register event listener
   *
   * @param event - Event name
   * @param listener - Event listener
   */
  on<K extends keyof ForkContextEvents>(event: K, listener: ForkContextEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }

  /**
   * Unregister event listener
   *
   * @param event - Event name
   * @param listener - Event listener
   */
  off<K extends keyof ForkContextEvents>(event: K, listener: ForkContextEvents[K]): void {
    const set = this.listeners.get(event)
    if (set) {
      set.delete(listener)
    }
  }

  /**
   * Emit event
   *
   * @param event - Event name
   * @param args - Event arguments
   */
  private emit<K extends keyof ForkContextEvents>(event: K, ...args: Parameters<ForkContextEvents[K]>): void {
    const set = this.listeners.get(event)
    if (set) {
      const listenersArray = Array.from(set)
      for (const listener of listenersArray) {
        try {
          (listener as any)(...args)
        }
        catch (error) {
          console.error(`[AgentForkManager] Error in ${event} listener:`, error)
        }
      }
    }
  }

  /**
   * Change fork status and emit event
   *
   * @param forkId - Fork context ID
   * @param newStatus - New status
   */
  private changeStatus(forkId: string, newStatus: ForkContextState['status']): void {
    const fork = this.getForkOrThrow(forkId)
    const oldStatus = fork.status
    fork.status = newStatus

    if (oldStatus === 'pending' && newStatus === 'running') {
      this.activeForksCount++
    }
    else if (oldStatus === 'running' && ['completed', 'failed', 'cancelled', 'timeout'].includes(newStatus)) {
      this.activeForksCount--
    }

    this.emit('statusChange', fork, oldStatus, newStatus)
  }

  /**
   * Check concurrent limit
   *
   * @throws Error if limit reached
   */
  private checkConcurrentLimit(): void {
    if (this.activeForksCount >= this.options.maxConcurrentForks) {
      throw new Error(
        `Maximum concurrent forks limit reached (${this.options.maxConcurrentForks}). `
        + `Active: ${this.activeForksCount}`,
      )
    }
  }

  /**
   * Get fork or throw error
   *
   * @param forkId - Fork context ID
   * @returns Fork state
   * @throws Error if not found
   */
  private getForkOrThrow(forkId: string): ForkContextState {
    const fork = this.forks.get(forkId)
    if (!fork) {
      throw new Error(`Fork not found: ${forkId}`)
    }
    return fork
  }

  /**
   * Clean up all forks
   */
  cleanup(): void {
    this.forks.clear()
    this.listeners.clear()
    this.activeForksCount = 0
  }
}

/**
 * Create a new agent fork manager
 *
 * @param options - Manager options
 * @returns New manager instance
 */
export function createAgentForkManager(options?: ForkContextOptions): AgentForkManager {
  return new AgentForkManager(options)
}

/**
 * Global fork manager instance
 */
let globalForkManager: AgentForkManager | null = null

/**
 * Get or create global fork manager
 *
 * @param options - Manager options (only used on first call)
 * @returns Global fork manager
 */
export function getGlobalForkManager(options?: ForkContextOptions): AgentForkManager {
  if (!globalForkManager) {
    globalForkManager = new AgentForkManager(options)
  }
  return globalForkManager
}

/**
 * Reset global fork manager
 */
export function resetGlobalForkManager(): void {
  if (globalForkManager) {
    globalForkManager.cleanup()
    globalForkManager = null
  }
}
