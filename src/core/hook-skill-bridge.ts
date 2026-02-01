/**
 * Hook-Skill Bridge
 *
 * Enables hooks to trigger skills and skills to register hooks.
 * This creates a powerful integration between the hook lifecycle
 * and the skill execution system.
 *
 * Hook Types:
 * - Setup: Triggered on CLI startup
 * - PreCommand: Before any command executes
 * - PostCommand: After command completes
 * - PreToolUse: Before a tool is used
 * - PostToolUse: After a tool completes
 * - SkillActivate: When a skill is activated
 * - SkillComplete: When a skill completes
 * - Error: When an error occurs
 *
 * @module core/hook-skill-bridge
 */

import type { Hook, SkillMdFile } from '../types/skill-md'
import { EventEmitter } from 'node:events'

// ============================================================================
// Types
// ============================================================================

/**
 * Extended hook types for CCJK
 */
export type CCJKHookType =
  | 'Setup' // CLI startup
  | 'PreCommand' // Before command
  | 'PostCommand' // After command
  | 'PreToolUse' // Before tool use
  | 'PostToolUse' // After tool use
  | 'SkillActivate' // Skill activation
  | 'SkillComplete' // Skill completion
  | 'AgentStart' // Agent starts
  | 'AgentStop' // Agent stops
  | 'Error' // Error occurred
  | 'Shutdown' // CLI shutdown

/**
 * Hook execution context
 */
export interface HookContext {
  type: CCJKHookType
  timestamp: number
  source: string
  data?: Record<string, unknown>
  tool?: {
    name: string
    args?: Record<string, unknown>
    result?: unknown
  }
  command?: {
    name: string
    args?: string[]
    options?: Record<string, unknown>
  }
  skill?: {
    id: string
    name: string
    trigger?: string
  }
  agent?: {
    id: string
    name: string
  }
  error?: {
    message: string
    stack?: string
  }
}

/**
 * Hook handler function
 */
export type HookHandler = (context: HookContext) => Promise<void> | void

/**
 * Skill trigger from hook
 */
export interface SkillTrigger {
  skillId: string
  args?: string
  condition?: (context: HookContext) => boolean
}

/**
 * Registered hook
 */
export interface RegisteredHook {
  id: string
  type: CCJKHookType
  matcher?: string | RegExp
  handler?: HookHandler
  skillTrigger?: SkillTrigger
  priority: number
  enabled: boolean
  source: 'builtin' | 'skill' | 'user' | 'plugin'
}

// ============================================================================
// Hook-Skill Bridge
// ============================================================================

/**
 * Hook-Skill Bridge
 *
 * Central system for managing hooks and their integration with skills.
 */
export class HookSkillBridge extends EventEmitter {
  private hooks: Map<string, RegisteredHook> = new Map()
  private hooksByType: Map<CCJKHookType, Set<string>> = new Map()
  private skillRegistry: Map<string, SkillMdFile> = new Map()
  private executionQueue: Array<{ hook: RegisteredHook, context: HookContext }> = []
  private isProcessing = false

  constructor() {
    super()
    this.initializeHookTypes()
  }

  /**
   * Initialize hook type sets
   */
  private initializeHookTypes(): void {
    const types: CCJKHookType[] = [
      'Setup', 'PreCommand', 'PostCommand',
      'PreToolUse', 'PostToolUse',
      'SkillActivate', 'SkillComplete',
      'AgentStart', 'AgentStop',
      'Error', 'Shutdown',
    ]

    for (const type of types) {
      this.hooksByType.set(type, new Set())
    }
  }

  // ==========================================================================
  // Hook Registration
  // ==========================================================================

  /**
   * Register a hook
   */
  registerHook(hook: Omit<RegisteredHook, 'id'> & { id?: string }): string {
    const id = hook.id || this.generateHookId()

    const registeredHook: RegisteredHook = {
      ...hook,
      id,
      priority: hook.priority ?? 50,
      enabled: hook.enabled ?? true,
    }

    this.hooks.set(id, registeredHook)

    // Add to type index
    const typeSet = this.hooksByType.get(hook.type)
    if (typeSet) {
      typeSet.add(id)
    }

    this.emit('hook:registered', registeredHook)
    return id
  }

  /**
   * Register a hook that triggers a skill
   */
  registerSkillTriggerHook(
    type: CCJKHookType,
    skillId: string,
    options: {
      matcher?: string | RegExp
      args?: string
      condition?: (context: HookContext) => boolean
      priority?: number
    } = {},
  ): string {
    return this.registerHook({
      type,
      matcher: options.matcher,
      skillTrigger: {
        skillId,
        args: options.args,
        condition: options.condition,
      },
      priority: options.priority ?? 50,
      enabled: true,
      source: 'skill',
    })
  }

  /**
   * Register hooks from a skill's frontmatter
   */
  registerSkillHooks(skill: SkillMdFile): string[] {
    const hookIds: string[] = []

    if (!skill.metadata.hooks)
      return hookIds

    for (const hook of skill.metadata.hooks) {
      const hookType = this.mapHookType(hook.type)
      if (!hookType)
        continue

      const id = this.registerHook({
        type: hookType,
        matcher: hook.matcher,
        handler: hook.command
          ? async () => {
              await this.executeCommand(hook.command!)
            }
          : hook.script
            ? async () => {
                await this.executeScript(hook.script!)
              }
            : undefined,
        priority: 50,
        enabled: true,
        source: 'skill',
      })

      hookIds.push(id)
    }

    // Store skill reference
    this.skillRegistry.set(skill.metadata.name, skill)

    return hookIds
  }

  /**
   * Unregister a hook
   */
  unregisterHook(id: string): boolean {
    const hook = this.hooks.get(id)
    if (!hook)
      return false

    // Remove from type index
    const typeSet = this.hooksByType.get(hook.type)
    if (typeSet) {
      typeSet.delete(id)
    }

    this.hooks.delete(id)
    this.emit('hook:unregistered', id)
    return true
  }

  /**
   * Unregister all hooks from a skill
   */
  unregisterSkillHooks(skillId: string): number {
    let count = 0

    for (const [id, hook] of this.hooks) {
      if (hook.source === 'skill' && hook.skillTrigger?.skillId === skillId) {
        this.unregisterHook(id)
        count++
      }
    }

    this.skillRegistry.delete(skillId)
    return count
  }

  // ==========================================================================
  // Hook Execution
  // ==========================================================================

  /**
   * Trigger hooks of a specific type
   */
  async trigger(type: CCJKHookType, context: Partial<HookContext> = {}): Promise<void> {
    const fullContext: HookContext = {
      type,
      timestamp: Date.now(),
      source: 'system',
      ...context,
    }

    const hookIds = this.hooksByType.get(type)
    if (!hookIds || hookIds.size === 0)
      return

    // Get matching hooks sorted by priority
    const matchingHooks = this.getMatchingHooks(type, fullContext)

    // Execute hooks
    for (const hook of matchingHooks) {
      try {
        await this.executeHook(hook, fullContext)
      }
      catch (error) {
        this.emit('hook:error', { hook, error, context: fullContext })

        // Trigger error hook (but prevent infinite loop)
        if (type !== 'Error') {
          await this.trigger('Error', {
            ...fullContext,
            error: {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
          })
        }
      }
    }
  }

  /**
   * Get hooks matching a context
   */
  private getMatchingHooks(type: CCJKHookType, context: HookContext): RegisteredHook[] {
    const hookIds = this.hooksByType.get(type)
    if (!hookIds)
      return []

    const hooks: RegisteredHook[] = []

    for (const id of hookIds) {
      const hook = this.hooks.get(id)
      if (!hook || !hook.enabled)
        continue

      // Check matcher
      if (hook.matcher) {
        const matchTarget = this.getMatchTarget(context)
        if (!this.matchesPattern(matchTarget, hook.matcher)) {
          continue
        }
      }

      // Check skill trigger condition
      if (hook.skillTrigger?.condition) {
        if (!hook.skillTrigger.condition(context)) {
          continue
        }
      }

      hooks.push(hook)
    }

    // Sort by priority (higher first)
    return hooks.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Execute a single hook
   */
  private async executeHook(hook: RegisteredHook, context: HookContext): Promise<void> {
    this.emit('hook:executing', { hook, context })

    // Execute handler if present
    if (hook.handler) {
      await hook.handler(context)
    }

    // Trigger skill if configured
    if (hook.skillTrigger) {
      await this.triggerSkill(hook.skillTrigger, context)
    }

    this.emit('hook:executed', { hook, context })
  }

  /**
   * Trigger a skill from a hook
   */
  private async triggerSkill(trigger: SkillTrigger, context: HookContext): Promise<void> {
    const skill = this.skillRegistry.get(trigger.skillId)

    if (!skill) {
      // Try to load skill dynamically
      try {
        const { getSkillRegistry } = await import('../brain/skill-registry')
        const registry = getSkillRegistry()
        const entry = registry.getById(trigger.skillId)

        if (entry) {
          this.skillRegistry.set(trigger.skillId, {
            metadata: entry.metadata,
            content: entry.content,
            filePath: entry.filePath,
          })
        }
      }
      catch {
        this.emit('skill:not_found', trigger.skillId)
        return
      }
    }

    // Emit skill activation event
    this.emit('skill:triggered', {
      skillId: trigger.skillId,
      args: trigger.args,
      context,
    })

    // The actual skill execution is handled by the skill system
    // This bridge just triggers the activation
    await this.trigger('SkillActivate', {
      ...context,
      skill: {
        id: trigger.skillId,
        name: trigger.skillId,
        trigger: context.type,
      },
    })
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Map skill hook type to CCJK hook type
   */
  private mapHookType(type: Hook['type']): CCJKHookType | null {
    const mapping: Record<Hook['type'], CCJKHookType> = {
      PreToolUse: 'PreToolUse',
      PostToolUse: 'PostToolUse',
      SubagentStart: 'AgentStart',
      SubagentStop: 'AgentStop',
      PermissionRequest: 'PreToolUse',
      SkillActivate: 'SkillActivate',
      SkillComplete: 'SkillComplete',
    }

    return mapping[type] || null
  }

  /**
   * Get match target from context
   */
  private getMatchTarget(context: HookContext): string {
    if (context.tool) {
      return `${context.tool.name}(${JSON.stringify(context.tool.args || {})})`
    }
    if (context.command) {
      return `${context.command.name} ${context.command.args?.join(' ') || ''}`
    }
    if (context.skill) {
      return context.skill.id
    }
    return ''
  }

  /**
   * Check if target matches pattern
   */
  private matchesPattern(target: string, pattern: string | RegExp): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(target)
    }

    // Support wildcard patterns like "Bash(npm *)" or "mcp__*"
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars except *
      .replace(/\*/g, '.*') // Convert * to .*

    return new RegExp(`^${regexPattern}$`).test(target)
  }

  /**
   * Execute a shell command
   */
  private async executeCommand(command: string): Promise<void> {
    const { x } = await import('tinyexec')
    await x('sh', ['-c', command])
  }

  /**
   * Execute a script
   */
  private async executeScript(script: string): Promise<void> {
    // For now, execute as shell script
    await this.executeCommand(script)
  }

  /**
   * Generate unique hook ID
   */
  private generateHookId(): string {
    return `hook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Get all registered hooks
   */
  getHooks(): RegisteredHook[] {
    return Array.from(this.hooks.values())
  }

  /**
   * Get hooks by type
   */
  getHooksByType(type: CCJKHookType): RegisteredHook[] {
    const hookIds = this.hooksByType.get(type)
    if (!hookIds)
      return []

    const hooks: RegisteredHook[] = []
    for (const id of hookIds) {
      const hook = this.hooks.get(id)
      if (hook)
        hooks.push(hook)
    }

    return hooks
  }

  /**
   * Get hook by ID
   */
  getHook(id: string): RegisteredHook | undefined {
    return this.hooks.get(id)
  }

  /**
   * Enable/disable a hook
   */
  setHookEnabled(id: string, enabled: boolean): boolean {
    const hook = this.hooks.get(id)
    if (!hook)
      return false

    hook.enabled = enabled
    this.emit('hook:toggled', { id, enabled })
    return true
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalHooks: number
    enabledHooks: number
    hooksByType: Record<string, number>
    skillsWithHooks: number
  } {
    const hooksByType: Record<string, number> = {}

    for (const [type, ids] of this.hooksByType) {
      hooksByType[type] = ids.size
    }

    let enabledCount = 0
    for (const hook of this.hooks.values()) {
      if (hook.enabled)
        enabledCount++
    }

    return {
      totalHooks: this.hooks.size,
      enabledHooks: enabledCount,
      hooksByType,
      skillsWithHooks: this.skillRegistry.size,
    }
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear()
    for (const set of this.hooksByType.values()) {
      set.clear()
    }
    this.skillRegistry.clear()
    this.emit('hooks:cleared')
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let bridgeInstance: HookSkillBridge | null = null

/**
 * Get the singleton hook-skill bridge
 */
export function getHookSkillBridge(): HookSkillBridge {
  if (!bridgeInstance) {
    bridgeInstance = new HookSkillBridge()
  }
  return bridgeInstance
}

/**
 * Initialize the hook-skill bridge
 */
export function initHookSkillBridge(): HookSkillBridge {
  bridgeInstance = new HookSkillBridge()
  return bridgeInstance
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Register a hook
 */
export function registerHook(
  type: CCJKHookType,
  handler: HookHandler,
  options: { matcher?: string | RegExp, priority?: number } = {},
): string {
  const bridge = getHookSkillBridge()
  return bridge.registerHook({
    type,
    handler,
    matcher: options.matcher,
    priority: options.priority ?? 50,
    enabled: true,
    source: 'user',
  })
}

/**
 * Register a hook that triggers a skill
 */
export function onHookTriggerSkill(
  type: CCJKHookType,
  skillId: string,
  options: { matcher?: string | RegExp, args?: string } = {},
): string {
  const bridge = getHookSkillBridge()
  return bridge.registerSkillTriggerHook(type, skillId, options)
}

/**
 * Trigger hooks
 */
export async function triggerHooks(
  type: CCJKHookType,
  context?: Partial<HookContext>,
): Promise<void> {
  const bridge = getHookSkillBridge()
  await bridge.trigger(type, context)
}

/**
 * Unregister a hook
 */
export function unregisterHook(id: string): boolean {
  const bridge = getHookSkillBridge()
  return bridge.unregisterHook(id)
}
