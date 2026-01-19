/**
 * Hooks System
 *
 * Complete hook execution system for CCJK, providing extensible
 * event-driven workflows and tool integrations.
 *
 * @module utils/hooks
 *
 * @example
 * ```typescript
 * import { getGlobalRegistry, createHookExecutor, registerBuiltinHooks } from './hooks'
 *
 * // Get global registry and register built-in hooks
 * const registry = getGlobalRegistry()
 * registerBuiltinHooks(registry)
 *
 * // Create executor
 * const executor = createHookExecutor()
 *
 * // Execute hooks
 * const context = {
 *   type: 'pre-tool-use',
 *   tool: 'grep',
 *   timestamp: new Date()
 * }
 * const hooks = registry.getHooksForType('pre-tool-use')
 * const result = await executor.executeChain(hooks, context)
 * ```
 */

// Imports for initializeHooksSystem
import { registerBuiltinHooks } from './builtin-hooks.js'
import { createHookExecutor } from './executor.js'
import { getGlobalRegistry } from './registry.js'

// Export built-in hooks
export {
  builtinHooks,
  configChangeLogger,
  globalErrorHandler,
  postToolUseLogging,
  preToolUseValidation,
  registerBuiltinHooks,
  skillActivateNotification,
  skillCompleteStatistics,
  // Task notification hooks
  taskCompleteNotification,
  taskFailedNotification,
  taskProgressNotification,
  taskStartNotification,
  workflowCompleteCleanup,
  workflowStartInitialization,
} from './builtin-hooks.js'

// Export executor
export {
  createHookExecutor,
  HookExecutor,
} from './executor.js'

// Export registry
export {
  createHookRegistry,
  getGlobalRegistry,
  HookRegistry,
  resetGlobalRegistry,
} from './registry.js'

// Export types
export type {
  Hook,
  HookAction,
  HookChainResult,
  HookCondition,
  HookContext,
  HookExecutionOptions,
  HookFilterOptions,
  HookPriority,
  HookRegistrationOptions,
  HookRegistryEntry,
  HookRegistryState,
  HookResult,
  HookStatistics,
  HookStatus,
  HookType,
} from './types.js'

export {
  HookError,
  HookTimeoutError,
} from './types.js'

/**
 * Initialize the hooks system
 *
 * Convenience function to set up the complete hooks system with
 * built-in hooks registered and ready to use.
 *
 * @param options - Initialization options
 * @param options.registerBuiltins - Whether to register built-in hooks
 * @returns Initialized registry and executor
 *
 * @example
 * ```typescript
 * import { initializeHooksSystem } from './hooks'
 *
 * const { registry, executor } = initializeHooksSystem({
 *   registerBuiltins: true
 * })
 *
 * // Use registry and executor
 * const hooks = registry.getHooksForType('pre-tool-use')
 * const result = await executor.executeChain(hooks, context)
 * ```
 */
export function initializeHooksSystem(options?: {
  /**
   * Whether to register built-in hooks
   * @default true
   */
  registerBuiltins?: boolean
}): {
  registry: import('./registry.js').HookRegistry
  executor: import('./executor.js').HookExecutor
} {
  const registry = getGlobalRegistry()
  const executor = createHookExecutor()

  // Register built-in hooks by default
  if (options?.registerBuiltins !== false) {
    registerBuiltinHooks(registry)
  }

  return { registry, executor }
}
