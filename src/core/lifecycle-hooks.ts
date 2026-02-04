/**
 * CCJK Lifecycle Hooks System
 *
 * Comprehensive hook system for CLI lifecycle events.
 * Integrates with skills, agents, and the command system.
 *
 * Lifecycle Events:
 * 1. Setup - CLI startup initialization
 * 2. PreCommand - Before command execution
 * 3. PostCommand - After command completion
 * 4. PreToolUse - Before tool invocation
 * 5. PostToolUse - After tool completion
 * 6. SkillActivate - Skill activation
 * 7. SkillComplete - Skill completion
 * 8. AgentStart - Agent initialization
 * 9. AgentStop - Agent termination
 * 10. Error - Error handling
 * 11. Shutdown - CLI shutdown
 *
 * @module core/lifecycle-hooks
 */

import type { CCJKHookType, HookHandler, HookContext as BridgeHookContext } from './hook-skill-bridge'
import { getHookSkillBridge, triggerHooks } from './hook-skill-bridge'

// Re-export HookContext from hook-skill-bridge for convenience
export type { HookContext } from './hook-skill-bridge'

// ============================================================================
// Hook Types for Lifecycle Integration
// ============================================================================

/**
 * Hook execution phase
 */
export type HookPhase = 'pre-execution' | 'post-execution' | 'on-error'

/**
 * Hook execution result
 */
export interface HookResult {
  success: boolean
  message?: string
  data?: Record<string, unknown>
  error?: Error
}

/**
 * Lifecycle hook interface
 */
export interface LifecycleHook {
  readonly name: string
  readonly phase: HookPhase
  readonly priority?: number
  execute(context: BridgeHookContext): Promise<HookResult>
}

// ============================================================================
// Types
// ============================================================================

/**
 * Lifecycle phase
 */
export type LifecyclePhase
  = | 'startup'
    | 'ready'
    | 'running'
    | 'shutting_down'
    | 'shutdown'

/**
 * Lifecycle state
 */
export interface LifecycleState {
  phase: LifecyclePhase
  startTime: number
  lastEventTime: number
  commandCount: number
  errorCount: number
  activeAgents: Set<string>
  activeSkills: Set<string>
}

/**
 * Hook registration options
 */
export interface HookOptions {
  priority?: number
  matcher?: string | RegExp
  once?: boolean
  enabled?: boolean
}

// ============================================================================
// Lifecycle Manager
// ============================================================================

/**
 * Lifecycle Manager
 *
 * Manages the CLI lifecycle and coordinates hook execution.
 */
class LifecycleManager {
  private state: LifecycleState
  private onceHooks: Set<string> = new Set()
  private shutdownHandlers: Array<() => Promise<void>> = []

  constructor() {
    this.state = {
      phase: 'startup',
      startTime: Date.now(),
      lastEventTime: Date.now(),
      commandCount: 0,
      errorCount: 0,
      activeAgents: new Set(),
      activeSkills: new Set(),
    }

    // Register process handlers
    this.registerProcessHandlers()
  }

  /**
   * Register process event handlers
   */
  private registerProcessHandlers(): void {
    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown('SIGINT'))
    process.on('SIGTERM', () => this.shutdown('SIGTERM'))

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      this.handleError(error, 'uncaughtException')
    })

    process.on('unhandledRejection', (reason) => {
      this.handleError(reason as Error, 'unhandledRejection')
    })
  }

  // ==========================================================================
  // Lifecycle Methods
  // ==========================================================================

  /**
   * Initialize the lifecycle (called on CLI startup)
   */
  async initialize(): Promise<void> {
    this.state.phase = 'startup'
    this.state.startTime = Date.now()

    // Trigger Setup hooks
    await triggerHooks('Setup', {
      source: 'lifecycle',
      data: {
        phase: 'startup',
        timestamp: this.state.startTime,
      },
    })

    this.state.phase = 'ready'
  }

  /**
   * Mark lifecycle as running
   */
  markRunning(): void {
    this.state.phase = 'running'
  }

  /**
   * Shutdown the lifecycle
   */
  async shutdown(signal?: string): Promise<void> {
    if (this.state.phase === 'shutting_down' || this.state.phase === 'shutdown') {
      return
    }

    this.state.phase = 'shutting_down'

    // Trigger Shutdown hooks
    await triggerHooks('Shutdown', {
      source: 'lifecycle',
      data: {
        signal,
        uptime: Date.now() - this.state.startTime,
        commandCount: this.state.commandCount,
        errorCount: this.state.errorCount,
      },
    })

    // Run shutdown handlers
    for (const handler of this.shutdownHandlers) {
      try {
        await handler()
      }
      catch (error) {
        console.error('Shutdown handler error:', error)
      }
    }

    this.state.phase = 'shutdown'
  }

  /**
   * Register a shutdown handler
   */
  onShutdown(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler)
  }

  // ==========================================================================
  // Command Lifecycle
  // ==========================================================================

  /**
   * Before command execution
   */
  async beforeCommand(
    commandName: string,
    args: string[],
    options: Record<string, unknown>,
  ): Promise<void> {
    this.state.lastEventTime = Date.now()

    await triggerHooks('PreCommand', {
      source: 'command',
      command: {
        name: commandName,
        args,
        options,
      },
    })
  }

  /**
   * After command execution
   */
  async afterCommand(
    commandName: string,
    args: string[],
    options: Record<string, unknown>,
    result?: unknown,
    error?: Error,
  ): Promise<void> {
    this.state.commandCount++
    this.state.lastEventTime = Date.now()

    if (error) {
      this.state.errorCount++
    }

    await triggerHooks('PostCommand', {
      source: 'command',
      command: {
        name: commandName,
        args,
        options,
      },
      data: {
        result,
        error: error ? { message: error.message, stack: error.stack } : undefined,
        success: !error,
      },
    })
  }

  // ==========================================================================
  // Tool Lifecycle
  // ==========================================================================

  /**
   * Before tool use
   */
  async beforeToolUse(
    toolName: string,
    args?: Record<string, unknown>,
  ): Promise<void> {
    this.state.lastEventTime = Date.now()

    await triggerHooks('PreToolUse', {
      source: 'tool',
      tool: {
        name: toolName,
        args,
      },
    })
  }

  /**
   * After tool use
   */
  async afterToolUse(
    toolName: string,
    args?: Record<string, unknown>,
    result?: unknown,
    error?: Error,
  ): Promise<void> {
    this.state.lastEventTime = Date.now()

    if (error) {
      this.state.errorCount++
    }

    await triggerHooks('PostToolUse', {
      source: 'tool',
      tool: {
        name: toolName,
        args,
        result,
      },
      error: error ? { message: error.message, stack: error.stack } : undefined,
    })
  }

  // ==========================================================================
  // Skill Lifecycle
  // ==========================================================================

  /**
   * Skill activation
   */
  async skillActivate(
    skillId: string,
    skillName: string,
    trigger?: string,
  ): Promise<void> {
    this.state.activeSkills.add(skillId)
    this.state.lastEventTime = Date.now()

    await triggerHooks('SkillActivate', {
      source: 'skill',
      skill: {
        id: skillId,
        name: skillName,
        trigger,
      },
    })
  }

  /**
   * Skill completion
   */
  async skillComplete(
    skillId: string,
    skillName: string,
    result?: unknown,
    error?: Error,
  ): Promise<void> {
    this.state.activeSkills.delete(skillId)
    this.state.lastEventTime = Date.now()

    if (error) {
      this.state.errorCount++
    }

    await triggerHooks('SkillComplete', {
      source: 'skill',
      skill: {
        id: skillId,
        name: skillName,
      },
      data: {
        result,
        success: !error,
      },
      error: error ? { message: error.message, stack: error.stack } : undefined,
    })
  }

  // ==========================================================================
  // Agent Lifecycle
  // ==========================================================================

  /**
   * Agent start
   */
  async agentStart(agentId: string, agentName: string): Promise<void> {
    this.state.activeAgents.add(agentId)
    this.state.lastEventTime = Date.now()

    await triggerHooks('AgentStart', {
      source: 'agent',
      agent: {
        id: agentId,
        name: agentName,
      },
    })
  }

  /**
   * Agent stop
   */
  async agentStop(
    agentId: string,
    agentName: string,
    result?: unknown,
    error?: Error,
  ): Promise<void> {
    this.state.activeAgents.delete(agentId)
    this.state.lastEventTime = Date.now()

    if (error) {
      this.state.errorCount++
    }

    await triggerHooks('AgentStop', {
      source: 'agent',
      agent: {
        id: agentId,
        name: agentName,
      },
      data: {
        result,
        success: !error,
      },
      error: error ? { message: error.message, stack: error.stack } : undefined,
    })
  }

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  /**
   * Handle error
   */
  async handleError(error: Error, source: string = 'unknown'): Promise<void> {
    this.state.errorCount++
    this.state.lastEventTime = Date.now()

    await triggerHooks('Error', {
      source,
      error: {
        message: error.message,
        stack: error.stack,
      },
    })
  }

  // ==========================================================================
  // State Access
  // ==========================================================================

  /**
   * Get current lifecycle state
   */
  getState(): Readonly<LifecycleState> {
    return {
      ...this.state,
      activeAgents: new Set(this.state.activeAgents),
      activeSkills: new Set(this.state.activeSkills),
    }
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.state.startTime
  }

  /**
   * Check if lifecycle is ready
   */
  isReady(): boolean {
    return this.state.phase === 'ready' || this.state.phase === 'running'
  }

  /**
   * Check if lifecycle is shutting down
   */
  isShuttingDown(): boolean {
    return this.state.phase === 'shutting_down' || this.state.phase === 'shutdown'
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let lifecycleInstance: LifecycleManager | null = null

/**
 * Get the singleton lifecycle manager
 */
export function getLifecycleManager(): LifecycleManager {
  if (!lifecycleInstance) {
    lifecycleInstance = new LifecycleManager()
  }
  return lifecycleInstance
}

/**
 * Initialize the lifecycle manager
 */
export async function initLifecycle(): Promise<LifecycleManager> {
  const manager = getLifecycleManager()
  await manager.initialize()
  return manager
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Register a hook for a lifecycle event
 */
export function onLifecycleEvent(
  event: CCJKHookType,
  handler: HookHandler,
  options: HookOptions = {},
): string {
  const bridge = getHookSkillBridge()
  return bridge.registerHook({
    type: event,
    handler,
    matcher: options.matcher,
    priority: options.priority ?? 50,
    enabled: options.enabled ?? true,
    source: 'user',
  })
}

/**
 * Register a hook that triggers a skill
 */
export function onLifecycleEventTriggerSkill(
  event: CCJKHookType,
  skillId: string,
  options: HookOptions = {},
): string {
  const bridge = getHookSkillBridge()
  return bridge.registerSkillTriggerHook(event, skillId, {
    matcher: options.matcher,
    priority: options.priority,
  })
}

/**
 * Shorthand for common lifecycle hooks
 */
export const lifecycle = {
  /**
   * Register a setup hook (runs on CLI startup)
   */
  onSetup: (handler: HookHandler, options?: HookOptions) =>
    onLifecycleEvent('Setup', handler, options),

  /**
   * Register a pre-command hook
   */
  onPreCommand: (handler: HookHandler, options?: HookOptions) =>
    onLifecycleEvent('PreCommand', handler, options),

  /**
   * Register a post-command hook
   */
  onPostCommand: (handler: HookHandler, options?: HookOptions) =>
    onLifecycleEvent('PostCommand', handler, options),

  /**
   * Register a pre-tool-use hook
   */
  onPreToolUse: (handler: HookHandler, options?: HookOptions) =>
    onLifecycleEvent('PreToolUse', handler, options),

  /**
   * Register a post-tool-use hook
   */
  onPostToolUse: (handler: HookHandler, options?: HookOptions) =>
    onLifecycleEvent('PostToolUse', handler, options),

  /**
   * Register a skill-activate hook
   */
  onSkillActivate: (handler: HookHandler, options?: HookOptions) =>
    onLifecycleEvent('SkillActivate', handler, options),

  /**
   * Register a skill-complete hook
   */
  onSkillComplete: (handler: HookHandler, options?: HookOptions) =>
    onLifecycleEvent('SkillComplete', handler, options),

  /**
   * Register an agent-start hook
   */
  onAgentStart: (handler: HookHandler, options?: HookOptions) =>
    onLifecycleEvent('AgentStart', handler, options),

  /**
   * Register an agent-stop hook
   */
  onAgentStop: (handler: HookHandler, options?: HookOptions) =>
    onLifecycleEvent('AgentStop', handler, options),

  /**
   * Register an error hook
   */
  onError: (handler: HookHandler, options?: HookOptions) =>
    onLifecycleEvent('Error', handler, options),

  /**
   * Register a shutdown hook
   */
  onShutdown: (handler: HookHandler, options?: HookOptions) =>
    onLifecycleEvent('Shutdown', handler, options),
}

// ============================================================================
// Built-in Hooks
// ============================================================================

/**
 * Register built-in CCJK hooks
 */
export function registerBuiltinHooks(): void {
  const bridge = getHookSkillBridge()

  // Log startup
  bridge.registerHook({
    type: 'Setup',
    handler: async (ctx) => {
      if (process.env.CCJK_DEBUG) {
        console.log(`[CCJK] Lifecycle started at ${new Date(ctx.timestamp).toISOString()}`)
      }
    },
    priority: 100,
    enabled: true,
    source: 'builtin',
  })

  // Log errors
  bridge.registerHook({
    type: 'Error',
    handler: async (ctx) => {
      if (process.env.CCJK_DEBUG && ctx.error) {
        console.error(`[CCJK] Error: ${ctx.error.message}`)
      }
    },
    priority: 100,
    enabled: true,
    source: 'builtin',
  })

  // Log shutdown
  bridge.registerHook({
    type: 'Shutdown',
    handler: async (ctx) => {
      if (process.env.CCJK_DEBUG) {
        console.log(`[CCJK] Lifecycle shutdown. Uptime: ${ctx.data?.uptime}ms`)
      }
    },
    priority: 100,
    enabled: true,
    source: 'builtin',
  })
}
