/**
 * Hook Executor
 *
 * Executes hooks with timeout support, error handling, and context management.
 * Supports both sequential and parallel execution of hook chains.
 *
 * @module utils/hooks/executor
 */

import type { HookRegistry } from './registry.js'
import type {
  Hook,
  HookChainResult,
  HookContext,
  HookExecutionOptions,
  HookResult,
  HookStatus,
  HookType,
} from './types.js'
import { HookError, HookTimeoutError } from './types.js'

/**
 * Default hook execution timeout (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000

/**
 * Default maximum parallel executions
 */
const DEFAULT_MAX_PARALLEL = 5

/**
 * Hook Executor
 *
 * Manages the execution of individual hooks and hook chains with
 * comprehensive error handling, timeout support, and context management.
 *
 * @example
 * ```typescript
 * const registry = new HookRegistry()
 * const executor = new HookExecutor(registry)
 * const context: HookContext = {
 *   type: 'pre-tool-use',
 *   tool: 'grep',
 *   timestamp: new Date()
 * }
 * const result = await executor.execute(hook, context)
 * ```
 */
export class HookExecutor {
  private registry?: HookRegistry

  /**
   * Create a new HookExecutor
   *
   * @param registry - Optional hook registry for convenience methods
   */
  constructor(registry?: HookRegistry) {
    this.registry = registry
  }

  /**
   * Execute a single hook
   *
   * Executes a hook with timeout support and comprehensive error handling.
   * Returns a HookResult containing execution status and output.
   *
   * @param hook - Hook to execute
   * @param context - Execution context
   * @param options - Execution options
   * @returns Hook execution result
   *
   * @example
   * ```typescript
   * const result = await executor.execute(hook, context, { timeout: 5000 })
   * if (result.success) {
   *   console.log('Hook executed successfully:', result.output)
   * }
   * ```
   */
  async execute(
    hook: Hook,
    context: HookContext,
    options?: Pick<HookExecutionOptions, 'timeout'>,
  ): Promise<HookResult> {
    const startTime = Date.now()
    let status: HookStatus = 'pending'

    // Check if hook is enabled
    if (!hook.enabled) {
      return {
        success: false,
        status: 'skipped',
        durationMs: 0,
        continueChain: true,
        error: 'Hook is disabled',
      }
    }

    // Check if hook matches context
    if (!this.matchHook(hook, context)) {
      return {
        success: false,
        status: 'skipped',
        durationMs: 0,
        continueChain: true,
        error: 'Hook condition does not match context',
      }
    }

    status = 'running'

    try {
      // Determine timeout
      const timeout = options?.timeout ?? hook.action.timeout ?? DEFAULT_TIMEOUT

      // Execute hook with timeout
      const result = await this.executeWithTimeout(
        hook,
        context,
        timeout,
      )

      const durationMs = Date.now() - startTime
      status = 'success'

      return {
        success: true,
        status,
        durationMs,
        output: result?.output,
        continueChain: result?.continueChain ?? true,
        modifiedContext: result?.modifiedContext,
      }
    }
    catch (error) {
      const durationMs = Date.now() - startTime

      if (error instanceof HookTimeoutError) {
        status = 'timeout'
      }
      else {
        status = 'failed'
      }

      const errorMessage = error instanceof Error ? error.message : String(error)
      const continueOnError = hook.action.continueOnError ?? true

      return {
        success: false,
        status,
        durationMs,
        error: errorMessage,
        continueChain: continueOnError,
      }
    }
  }

  /**
   * Execute a hook chain (multiple hooks in sequence or parallel)
   *
   * Executes multiple hooks with support for sequential or parallel execution.
   * Manages context propagation between hooks and aggregates results.
   *
   * @param hooks - Array of hooks to execute
   * @param context - Initial execution context
   * @param options - Execution options
   * @returns Aggregated chain execution result
   *
   * @example
   * ```typescript
   * const result = await executor.executeChain(hooks, context, {
   *   parallel: false,
   *   stopOnError: true
   * })
   * console.log(`Executed ${result.executedCount} hooks`)
   * ```
   */
  async executeChain(
    hooks: Hook[],
    context: HookContext,
    options?: HookExecutionOptions,
  ): Promise<HookChainResult> {
    const startTime = Date.now()
    const results: Array<{ hookId: string, result: HookResult }> = []
    let currentContext = { ...context }
    let executedCount = 0
    let skippedCount = 0
    let failedCount = 0

    // Filter hooks based on options
    const hooksToExecute = options?.skipDisabled !== false
      ? hooks.filter(h => h.enabled)
      : hooks

    // Sort hooks by priority (higher priority first)
    const sortedHooks = [...hooksToExecute].sort((a, b) => {
      const priorityA = a.priority ?? 5
      const priorityB = b.priority ?? 5
      return priorityB - priorityA
    })

    // Execute hooks
    if (options?.parallel) {
      // Parallel execution
      const maxParallel = options.maxParallel ?? DEFAULT_MAX_PARALLEL
      const batches = this.createBatches(sortedHooks, maxParallel)

      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(hook => this.execute(hook, currentContext, options)),
        )

        for (let i = 0; i < batch.length; i++) {
          const hook = batch[i]
          const result = batchResults[i]

          results.push({ hookId: hook.id, result })

          if (result.status === 'skipped') {
            skippedCount++
          }
          else if (result.success) {
            executedCount++
            // Apply context modifications
            if (result.modifiedContext) {
              currentContext = { ...currentContext, ...result.modifiedContext }
            }
          }
          else {
            failedCount++
            if (options?.stopOnError) {
              break
            }
          }
        }

        if (options?.stopOnError && failedCount > 0) {
          break
        }
      }
    }
    else {
      // Sequential execution
      for (const hook of sortedHooks) {
        const result = await this.execute(hook, currentContext, options)
        results.push({ hookId: hook.id, result })

        if (result.status === 'skipped') {
          skippedCount++
        }
        else if (result.success) {
          executedCount++
          // Apply context modifications
          if (result.modifiedContext) {
            currentContext = { ...currentContext, ...result.modifiedContext }
          }
          // Check if we should continue the chain
          if (!result.continueChain) {
            break
          }
        }
        else {
          failedCount++
          if (options?.stopOnError || !result.continueChain) {
            break
          }
        }
      }
    }

    const totalDurationMs = Date.now() - startTime
    const success = failedCount === 0 && executedCount > 0

    return {
      success,
      totalDurationMs,
      results,
      executedCount,
      skippedCount,
      failedCount,
      finalContext: currentContext,
    }
  }

  /**
   * Check if a hook matches the current context
   *
   * Evaluates hook conditions against the provided context to determine
   * if the hook should be executed.
   *
   * @param hook - Hook to check
   * @param context - Execution context
   * @returns True if hook matches context
   *
   * @example
   * ```typescript
   * if (executor.matchHook(hook, context)) {
   *   console.log('Hook matches context')
   * }
   * ```
   */
  matchHook(hook: Hook, context: HookContext): boolean {
    // Check hook type
    if (hook.type !== context.type) {
      return false
    }

    // If no condition specified, match all
    if (!hook.condition) {
      return true
    }

    const condition = hook.condition

    // Check tool pattern
    if (condition.tool && context.tool) {
      if (!this.matchPattern(condition.tool, context.tool)) {
        return false
      }
    }

    // Check skill ID pattern
    if (condition.skillId && context.skillId) {
      if (!this.matchPattern(condition.skillId, context.skillId)) {
        return false
      }
    }

    // Check workflow ID pattern
    if (condition.workflowId && context.workflowId) {
      if (!this.matchPattern(condition.workflowId, context.workflowId)) {
        return false
      }
    }

    // Check config key pattern
    if (condition.configKey && context.configKey) {
      if (!this.matchPattern(condition.configKey, context.configKey)) {
        return false
      }
    }

    // Check custom condition
    if (condition.custom) {
      try {
        const result = condition.custom(context)
        if (result instanceof Promise) {
          // For async conditions, we can't wait here
          // Return true and let the executor handle it
          return true
        }
        return result
      }
      catch {
        return false
      }
    }

    return true
  }

  /**
   * Execute hook with timeout
   *
   * @private
   * @param hook - Hook to execute
   * @param context - Execution context
   * @param timeout - Timeout in milliseconds
   * @returns Hook result or void
   */
  private async executeWithTimeout(
    hook: Hook,
    context: HookContext,
    timeout: number,
  ): Promise<HookResult | void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new HookTimeoutError(hook.id, timeout, context))
      }, timeout)

      Promise.resolve(hook.action.execute(context))
        .then((result) => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          reject(new HookError(
            `Hook execution failed: ${error.message}`,
            hook.id,
            context,
            error,
          ))
        })
    })
  }

  /**
   * Match a pattern against a value
   *
   * @private
   * @param pattern - String or RegExp pattern
   * @param value - Value to match
   * @returns True if pattern matches value
   */
  private matchPattern(pattern: string | RegExp, value: string): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(value)
    }

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

  /**
   * Create batches for parallel execution
   *
   * @private
   * @param hooks - Hooks to batch
   * @param batchSize - Maximum batch size
   * @returns Array of hook batches
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }
}

/**
 * Create a default hook executor instance
 *
 * @returns New HookExecutor instance
 *
 * @example
 * ```typescript
 * const executor = createHookExecutor()
 * ```
 */
export function createHookExecutor(): HookExecutor {
  return new HookExecutor()
}
