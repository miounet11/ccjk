/**
 * Hook Registry Module
 *
 * Manages registration and retrieval of hooks in the CCJK system.
 *
 * @module utils/hooks/registry
 */

import type {
  Hook,
  HookFilterOptions,
  HookRegistrationOptions,
  HookRegistryEntry,
  HookRegistryState,
  HookStatistics,
  HookType,
} from './types.js'

/**
 * Hook Registry
 *
 * Central registry for managing hooks in the system.
 */
export class HookRegistry {
  private state: HookRegistryState

  constructor() {
    this.state = {
      version: '1.0.0',
      hooks: new Map(),
      hooksByType: new Map(),
      hooksByTool: new Map(),
      lastUpdated: new Date(),
    }
  }

  /**
   * Register a hook
   *
   * @param hook - Hook to register
   * @param options - Registration options
   * @returns Whether registration was successful
   */
  register(hook: Hook, options?: HookRegistrationOptions): boolean {
    const existingEntry = this.state.hooks.get(hook.id)

    if (existingEntry && !options?.overwrite) {
      return false
    }

    const entry: HookRegistryEntry = {
      hook: {
        ...hook,
        enabled: options?.enabled ?? hook.enabled,
      },
      registeredAt: new Date(),
      source: options?.source ?? hook.source,
      executionCount: 0,
      failureCount: 0,
    }

    this.state.hooks.set(hook.id, entry)

    // Index by type
    const typeHooks = this.state.hooksByType.get(hook.type) ?? []
    if (!typeHooks.includes(hook.id)) {
      typeHooks.push(hook.id)
      this.state.hooksByType.set(hook.type, typeHooks)
    }

    // Index by tool if applicable
    if (hook.condition?.tool && typeof hook.condition.tool === 'string') {
      const toolHooks = this.state.hooksByTool.get(hook.condition.tool) ?? []
      if (!toolHooks.includes(hook.id)) {
        toolHooks.push(hook.id)
        this.state.hooksByTool.set(hook.condition.tool, toolHooks)
      }
    }

    this.state.lastUpdated = new Date()
    return true
  }

  /**
   * Unregister a hook
   *
   * @param hookId - ID of hook to unregister
   * @returns Whether unregistration was successful
   */
  unregister(hookId: string): boolean {
    const entry = this.state.hooks.get(hookId)
    if (!entry) {
      return false
    }

    this.state.hooks.delete(hookId)

    // Remove from type index
    const typeHooks = this.state.hooksByType.get(entry.hook.type)
    if (typeHooks) {
      const index = typeHooks.indexOf(hookId)
      if (index !== -1) {
        typeHooks.splice(index, 1)
      }
    }

    // Remove from tool index
    if (entry.hook.condition?.tool && typeof entry.hook.condition.tool === 'string') {
      const toolHooks = this.state.hooksByTool.get(entry.hook.condition.tool)
      if (toolHooks) {
        const index = toolHooks.indexOf(hookId)
        if (index !== -1) {
          toolHooks.splice(index, 1)
        }
      }
    }

    this.state.lastUpdated = new Date()
    return true
  }

  /**
   * Get a hook by ID
   *
   * @param hookId - Hook ID
   * @returns Hook entry or undefined
   */
  get(hookId: string): HookRegistryEntry | undefined {
    return this.state.hooks.get(hookId)
  }

  /**
   * Get hooks for a specific type
   *
   * @param type - Hook type
   * @returns Array of hooks sorted by priority
   */
  getHooksForType(type: HookType): Hook[] {
    const hookIds = this.state.hooksByType.get(type) ?? []
    return hookIds
      .map(id => this.state.hooks.get(id)?.hook)
      .filter((hook): hook is Hook => hook !== undefined)
      .sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5))
  }

  /**
   * Get hooks for a specific tool
   *
   * @param tool - Tool name
   * @returns Array of hooks sorted by priority
   */
  getHooksForTool(tool: string): Hook[] {
    const hookIds = this.state.hooksByTool.get(tool) ?? []
    return hookIds
      .map(id => this.state.hooks.get(id)?.hook)
      .filter((hook): hook is Hook => hook !== undefined)
      .sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5))
  }

  /**
   * Filter hooks based on options
   *
   * @param options - Filter options
   * @returns Array of matching hooks
   */
  filter(options: HookFilterOptions): Hook[] {
    let hooks = Array.from(this.state.hooks.values()).map(entry => entry.hook)

    if (options.type) {
      hooks = hooks.filter(h => h.type === options.type)
    }

    if (options.enabled !== undefined) {
      hooks = hooks.filter(h => h.enabled === options.enabled)
    }

    if (options.source) {
      hooks = hooks.filter(h => h.source === options.source)
    }

    if (options.tags && options.tags.length > 0) {
      hooks = hooks.filter(h =>
        options.tags!.every(tag => h.tags?.includes(tag)),
      )
    }

    if (options.priorityRange) {
      const { min, max } = options.priorityRange
      hooks = hooks.filter((h) => {
        const priority = h.priority ?? 5
        if (min !== undefined && priority < min)
          return false
        if (max !== undefined && priority > max)
          return false
        return true
      })
    }

    return hooks.sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5))
  }

  /**
   * Enable a hook
   *
   * @param hookId - Hook ID
   * @returns Whether operation was successful
   */
  enable(hookId: string): boolean {
    const entry = this.state.hooks.get(hookId)
    if (!entry)
      return false
    entry.hook.enabled = true
    this.state.lastUpdated = new Date()
    return true
  }

  /**
   * Disable a hook
   *
   * @param hookId - Hook ID
   * @returns Whether operation was successful
   */
  disable(hookId: string): boolean {
    const entry = this.state.hooks.get(hookId)
    if (!entry)
      return false
    entry.hook.enabled = false
    this.state.lastUpdated = new Date()
    return true
  }

  /**
   * Update hook execution statistics
   *
   * @param hookId - Hook ID
   * @param success - Whether execution was successful
   * @param result - Execution result
   */
  updateStats(hookId: string, success: boolean, result?: unknown): void {
    const entry = this.state.hooks.get(hookId)
    if (!entry)
      return

    entry.executionCount++
    if (!success) {
      entry.failureCount++
    }
    entry.lastExecutedAt = new Date()
    entry.lastResult = result as HookRegistryEntry['lastResult']
  }

  /**
   * Get registry statistics
   *
   * @returns Hook statistics
   */
  getStatistics(): HookStatistics {
    const entries = Array.from(this.state.hooks.values())
    const hooks = entries.map(e => e.hook)

    const hooksByType: Record<HookType, number> = {
      'pre-tool-use': 0,
      'post-tool-use': 0,
      'skill-activate': 0,
      'skill-complete': 0,
      'workflow-start': 0,
      'workflow-complete': 0,
      'config-change': 0,
      'error': 0,
      'task-start': 0,
      'task-complete': 0,
      'task-failed': 0,
      'task-progress': 0,
    }

    const hooksBySource: Record<string, number> = {}

    for (const hook of hooks) {
      hooksByType[hook.type]++
      hooksBySource[hook.source] = (hooksBySource[hook.source] ?? 0) + 1
    }

    const totalExecutions = entries.reduce((sum, e) => sum + e.executionCount, 0)
    const totalFailures = entries.reduce((sum, e) => sum + e.failureCount, 0)

    const mostExecuted = entries
      .filter(e => e.executionCount > 0)
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 5)
      .map(e => ({ hookId: e.hook.id, executionCount: e.executionCount }))

    const mostFailed = entries
      .filter(e => e.failureCount > 0)
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 5)
      .map(e => ({ hookId: e.hook.id, failureCount: e.failureCount }))

    return {
      totalHooks: hooks.length,
      enabledHooks: hooks.filter(h => h.enabled).length,
      disabledHooks: hooks.filter(h => !h.enabled).length,
      totalExecutions,
      totalFailures,
      averageExecutionMs: 0, // Would need to track this separately
      hooksByType,
      hooksBySource,
      mostExecuted,
      mostFailed,
    }
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.state.hooks.clear()
    this.state.hooksByType.clear()
    this.state.hooksByTool.clear()
    this.state.lastUpdated = new Date()
  }

  /**
   * Get all hooks
   *
   * @returns Array of all hooks
   */
  getAll(): Hook[] {
    return Array.from(this.state.hooks.values()).map(entry => entry.hook)
  }
}

// Global registry instance
let globalRegistry: HookRegistry | null = null

/**
 * Get the global hook registry
 *
 * @returns Global hook registry instance
 */
export function getGlobalRegistry(): HookRegistry {
  if (!globalRegistry) {
    globalRegistry = new HookRegistry()
  }
  return globalRegistry
}

/**
 * Reset the global hook registry
 *
 * Useful for testing.
 */
export function resetGlobalRegistry(): void {
  globalRegistry = null
}

/**
 * Create a new hook registry
 *
 * @returns New hook registry instance
 */
export function createHookRegistry(): HookRegistry {
  return new HookRegistry()
}
