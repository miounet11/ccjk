/**
 * Hook Registry
 *
 * Manages global hook registration, storage, and retrieval.
 * Provides indexing by type, tool, and other criteria for efficient lookup.
 *
 * @module utils/hooks/registry
 */

import type {
  Hook,
  HookFilterOptions,
  HookRegistrationOptions,
  HookRegistryEntry,
  HookRegistryState,
  HookResult,
  HookStatistics,
  HookType,
} from './types.js'

/**
 * Hook Registry
 *
 * Central registry for managing hooks across the CCJK system.
 * Provides registration, retrieval, filtering, and statistics tracking.
 *
 * @example
 * ```typescript
 * const registry = new HookRegistry()
 * registry.register(myHook, 'my-plugin')
 * const hooks = registry.getHooksForType('pre-tool-use')
 * ```
 */
export class HookRegistry {
  private state: HookRegistryState

  /**
   * Create a new hook registry
   */
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
   * Adds a hook to the registry with optional overwrite support.
   * Updates all relevant indexes for efficient lookup.
   *
   * @param hook - Hook to register
   * @param source - Source identifier (e.g., 'builtin', 'my-plugin', 'user')
   * @param options - Registration options
   * @throws Error if hook already exists and overwrite is false
   *
   * @example
   * ```typescript
   * registry.register(hook, 'my-plugin', { overwrite: true })
   * ```
   */
  register(
    hook: Hook,
    source: string,
    options?: HookRegistrationOptions,
  ): void {
    // Check if hook already exists
    if (this.state.hooks.has(hook.id) && !options?.overwrite) {
      throw new Error(`Hook with id '${hook.id}' already exists. Use overwrite option to replace.`)
    }

    // Apply enabled option
    const finalHook = {
      ...hook,
      enabled: options?.enabled ?? hook.enabled,
    }

    // Create registry entry
    const entry: HookRegistryEntry = {
      hook: finalHook,
      registeredAt: new Date(),
      source: options?.source ?? source,
      executionCount: 0,
      failureCount: 0,
    }

    // Add to main registry
    this.state.hooks.set(hook.id, entry)

    // Update type index
    const typeHooks = this.state.hooksByType.get(hook.type) || []
    if (!typeHooks.includes(hook.id)) {
      typeHooks.push(hook.id)
      this.state.hooksByType.set(hook.type, typeHooks)
    }

    // Update tool index if condition specifies tool
    if (hook.condition?.tool) {
      const toolPattern = typeof hook.condition.tool === 'string'
        ? hook.condition.tool
        : hook.condition.tool.source
      const toolHooks = this.state.hooksByTool.get(toolPattern) || []
      if (!toolHooks.includes(hook.id)) {
        toolHooks.push(hook.id)
        this.state.hooksByTool.set(toolPattern, toolHooks)
      }
    }

    // Update timestamp
    this.state.lastUpdated = new Date()
  }

  /**
   * Unregister a hook
   *
   * Removes a hook from the registry and all indexes.
   *
   * @param hookId - ID of hook to unregister
   * @returns True if hook was found and removed
   *
   * @example
   * ```typescript
   * if (registry.unregister('my-hook')) {
   *   console.log('Hook removed')
   * }
   * ```
   */
  unregister(hookId: string): boolean {
    const entry = this.state.hooks.get(hookId)
    if (!entry) {
      return false
    }

    const hook = entry.hook

    // Remove from main registry
    this.state.hooks.delete(hookId)

    // Remove from type index
    const typeHooks = this.state.hooksByType.get(hook.type)
    if (typeHooks) {
      const index = typeHooks.indexOf(hookId)
      if (index > -1) {
        typeHooks.splice(index, 1)
      }
      if (typeHooks.length === 0) {
        this.state.hooksByType.delete(hook.type)
      }
    }

    // Remove from tool index
    if (hook.condition?.tool) {
      const toolPattern = typeof hook.condition.tool === 'string'
        ? hook.condition.tool
        : hook.condition.tool.source
      const toolHooks = this.state.hooksByTool.get(toolPattern)
      if (toolHooks) {
        const index = toolHooks.indexOf(hookId)
        if (index > -1) {
          toolHooks.splice(index, 1)
        }
        if (toolHooks.length === 0) {
          this.state.hooksByTool.delete(toolPattern)
        }
      }
    }

    // Update timestamp
    this.state.lastUpdated = new Date()

    return true
  }

  /**
   * Get hooks for a specific type
   *
   * Returns all hooks registered for the given type, sorted by priority.
   *
   * @param type - Hook type
   * @returns Array of hooks
   *
   * @example
   * ```typescript
   * const preToolHooks = registry.getHooksForType('pre-tool-use')
   * ```
   */
  getHooksForType(type: HookType): Hook[] {
    const hookIds = this.state.hooksByType.get(type) || []
    const hooks = hookIds
      .map(id => this.state.hooks.get(id)?.hook)
      .filter((hook): hook is Hook => hook !== undefined)

    // Sort by priority (higher first)
    return hooks.sort((a, b) => {
      const priorityA = a.priority ?? 5
      const priorityB = b.priority ?? 5
      return priorityB - priorityA
    })
  }

  /**
   * Get hooks for a specific tool
   *
   * Returns all hooks that match the given tool name.
   *
   * @param tool - Tool name
   * @returns Array of hooks
   *
   * @example
   * ```typescript
   * const grepHooks = registry.getHooksForTool('grep')
   * ```
   */
  getHooksForTool(tool: string): Hook[] {
    const hooks: Hook[] = []

    // Check exact matches
    const exactHookIds = this.state.hooksByTool.get(tool) || []
    for (const id of exactHookIds) {
      const entry = this.state.hooks.get(id)
      if (entry) {
        hooks.push(entry.hook)
      }
    }

    // Check pattern matches
    for (const [pattern, hookIds] of this.state.hooksByTool.entries()) {
      if (pattern !== tool && this.matchToolPattern(pattern, tool)) {
        for (const id of hookIds) {
          const entry = this.state.hooks.get(id)
          if (entry && !hooks.some(h => h.id === id)) {
            hooks.push(entry.hook)
          }
        }
      }
    }

    // Sort by priority (higher first)
    return hooks.sort((a, b) => {
      const priorityA = a.priority ?? 5
      const priorityB = b.priority ?? 5
      return priorityB - priorityA
    })
  }

  /**
   * Get a specific hook by ID
   *
   * @param hookId - Hook ID
   * @returns Hook or undefined if not found
   *
   * @example
   * ```typescript
   * const hook = registry.getHook('my-hook')
   * ```
   */
  getHook(hookId: string): Hook | undefined {
    return this.state.hooks.get(hookId)?.hook
  }

  /**
   * Get all hooks
   *
   * @returns Array of all registered hooks
   *
   * @example
   * ```typescript
   * const allHooks = registry.getAllHooks()
   * ```
   */
  getAllHooks(): Hook[] {
    return Array.from(this.state.hooks.values()).map(entry => entry.hook)
  }

  /**
   * List all hooks with their registry entries
   *
   * @returns Array of all registry entries
   *
   * @example
   * ```typescript
   * const entries = registry.listAll()
   * ```
   */
  listAll(): HookRegistryEntry[] {
    return Array.from(this.state.hooks.values())
  }

  /**
   * Filter hooks by criteria
   *
   * Returns hooks matching the specified filter options.
   *
   * @param options - Filter options
   * @returns Array of matching hooks
   *
   * @example
   * ```typescript
   * const hooks = registry.filterHooks({
   *   type: 'pre-tool-use',
   *   enabled: true,
   *   tags: ['validation']
   * })
   * ```
   */
  filterHooks(options: HookFilterOptions): Hook[] {
    let hooks = this.getAllHooks()

    // Filter by type
    if (options.type) {
      hooks = hooks.filter(h => h.type === options.type)
    }

    // Filter by tool
    if (options.tool) {
      hooks = hooks.filter(h =>
        h.condition?.tool
        && this.matchToolPattern(
          typeof h.condition.tool === 'string'
            ? h.condition.tool
            : h.condition.tool.source,
          options.tool!,
        ),
      )
    }

    // Filter by skill ID
    if (options.skillId) {
      hooks = hooks.filter(h =>
        h.condition?.skillId
        && this.matchPattern(
          typeof h.condition.skillId === 'string'
            ? h.condition.skillId
            : h.condition.skillId.source,
          options.skillId!,
        ),
      )
    }

    // Filter by workflow ID
    if (options.workflowId) {
      hooks = hooks.filter(h =>
        h.condition?.workflowId
        && this.matchPattern(
          typeof h.condition.workflowId === 'string'
            ? h.condition.workflowId
            : h.condition.workflowId.source,
          options.workflowId!,
        ),
      )
    }

    // Filter by enabled status
    if (options.enabled !== undefined) {
      hooks = hooks.filter(h => h.enabled === options.enabled)
    }

    // Filter by source
    if (options.source) {
      hooks = hooks.filter((h) => {
        const entry = this.state.hooks.get(h.id)
        return entry?.source === options.source
      })
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      hooks = hooks.filter(h =>
        h.tags && options.tags!.every(tag => h.tags!.includes(tag)),
      )
    }

    // Filter by priority range
    if (options.priorityRange) {
      hooks = hooks.filter((h) => {
        const priority = h.priority ?? 5
        const min = options.priorityRange!.min ?? 1
        const max = options.priorityRange!.max ?? 10
        return priority >= min && priority <= max
      })
    }

    return hooks
  }

  /**
   * Enable or disable a hook
   *
   * @param hookId - Hook ID
   * @param enabled - Whether to enable or disable
   * @returns True if hook was found and updated
   *
   * @example
   * ```typescript
   * registry.setEnabled('my-hook', false)
   * ```
   */
  setEnabled(hookId: string, enabled: boolean): boolean {
    const entry = this.state.hooks.get(hookId)
    if (!entry) {
      return false
    }

    entry.hook.enabled = enabled
    this.state.lastUpdated = new Date()
    return true
  }

  /**
   * Record hook execution
   *
   * Updates execution statistics for a hook.
   *
   * @param hookId - Hook ID
   * @param result - Execution result
   *
   * @example
   * ```typescript
   * registry.recordExecution('my-hook', result)
   * ```
   */
  recordExecution(hookId: string, result: HookResult): void {
    const entry = this.state.hooks.get(hookId)
    if (!entry) {
      return
    }

    entry.executionCount++
    if (!result.success) {
      entry.failureCount++
    }
    entry.lastExecutedAt = new Date()
    entry.lastResult = result
  }

  /**
   * Get hook statistics
   *
   * Returns comprehensive statistics about registered hooks and their executions.
   *
   * @returns Hook statistics
   *
   * @example
   * ```typescript
   * const stats = registry.getStatistics()
   * console.log(`Total hooks: ${stats.totalHooks}`)
   * ```
   */
  getStatistics(): HookStatistics {
    const entries = Array.from(this.state.hooks.values())

    const totalHooks = entries.length
    const enabledHooks = entries.filter(e => e.hook.enabled).length
    const disabledHooks = totalHooks - enabledHooks

    const totalExecutions = entries.reduce((sum, e) => sum + e.executionCount, 0)
    const totalFailures = entries.reduce((sum, e) => sum + e.failureCount, 0)

    const totalDuration = entries.reduce((sum, e) =>
      sum + (e.lastResult?.durationMs ?? 0), 0)
    const averageExecutionMs = totalExecutions > 0 ? totalDuration / totalExecutions : 0

    const hooksByType: Record<HookType, number> = {
      'pre-tool-use': 0,
      'post-tool-use': 0,
      'skill-activate': 0,
      'skill-complete': 0,
      'workflow-start': 0,
      'workflow-complete': 0,
      'config-change': 0,
      'error': 0,
    }

    const hooksBySource: Record<string, number> = {}

    for (const entry of entries) {
      hooksByType[entry.hook.type]++
      hooksBySource[entry.source] = (hooksBySource[entry.source] || 0) + 1
    }

    const mostExecuted = entries
      .filter(e => e.executionCount > 0)
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 10)
      .map(e => ({
        hookId: e.hook.id,
        executionCount: e.executionCount,
      }))

    const mostFailed = entries
      .filter(e => e.failureCount > 0)
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 10)
      .map(e => ({
        hookId: e.hook.id,
        failureCount: e.failureCount,
      }))

    return {
      totalHooks,
      enabledHooks,
      disabledHooks,
      totalExecutions,
      totalFailures,
      averageExecutionMs,
      hooksByType,
      hooksBySource,
      mostExecuted,
      mostFailed,
    }
  }

  /**
   * Clear all hooks
   *
   * Removes all hooks from the registry.
   *
   * @example
   * ```typescript
   * registry.clear()
   * ```
   */
  clear(): void {
    this.state.hooks.clear()
    this.state.hooksByType.clear()
    this.state.hooksByTool.clear()
    this.state.lastUpdated = new Date()
  }

  /**
   * Get registry state
   *
   * Returns the complete registry state (useful for debugging).
   *
   * @returns Registry state
   */
  getState(): HookRegistryState {
    return this.state
  }

  /**
   * Match a tool pattern against a tool name
   *
   * @private
   * @param pattern - Pattern to match
   * @param tool - Tool name
   * @returns True if pattern matches tool
   */
  private matchToolPattern(pattern: string, tool: string): boolean {
    return this.matchPattern(pattern, tool)
  }

  /**
   * Match a pattern against a value
   *
   * @private
   * @param pattern - Pattern to match
   * @param value - Value to match
   * @returns True if pattern matches value
   */
  private matchPattern(pattern: string, value: string): boolean {
    // Support wildcards
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
        .replace(/\*/g, '.*') // Convert * to .*
      return new RegExp(`^${regexPattern}$`).test(value)
    }

    // Exact match
    return pattern === value
  }
}

/**
 * Global hook registry instance
 */
let globalRegistry: HookRegistry | null = null

/**
 * Get the global hook registry
 *
 * Returns the singleton global registry instance.
 *
 * @returns Global hook registry
 *
 * @example
 * ```typescript
 * const registry = getGlobalRegistry()
 * registry.register(myHook, 'my-plugin')
 * ```
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
 * Creates a new global registry instance (useful for testing).
 *
 * @example
 * ```typescript
 * resetGlobalRegistry()
 * ```
 */
export function resetGlobalRegistry(): void {
  globalRegistry = new HookRegistry()
}

/**
 * Create a new hook registry instance
 *
 * @returns New HookRegistry instance
 *
 * @example
 * ```typescript
 * const registry = createHookRegistry()
 * ```
 */
export function createHookRegistry(): HookRegistry {
  return new HookRegistry()
}
