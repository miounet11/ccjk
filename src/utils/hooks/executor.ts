/**
 * Hook Executor Module
 *
 * Executes hooks with proper error handling, timeouts, and chain management.
 *
 * @module utils/hooks/executor
 */

import type {
  Hook,
  HookChainResult,
  HookContext,
  HookExecutionOptions,
  HookResult,
} from './types.js'
import { HookError, HookTimeoutError } from './types.js'

/**
 * Hook Executor
 *
 * Executes hooks with proper error handling and timeout management.
 */
export class HookExecutor {
  private defaultTimeout: number

  constructor(options?: { defaultTimeout?: number }) {
    this.defaultTimeout = options?.defaultTimeout ?? 30000
  }

  /**
   * Execute a single hook
   *
   * @param hook - Hook to execute
   * @param context - Execution context
   * @param options - Execution options
   * @returns Hook result
   */
  async execute(
    hook: Hook,
    context: HookContext,
    options?: HookExecutionOptions,
  ): Promise<HookResult> {
    const startTime = Date.now()
    const timeout = options?.timeout ?? hook.action.timeout ?? this.defaultTimeout

    // Check if hook is enabled
    if (!hook.enabled && options?.skipDisabled !== false) {
      return {
        success: true,
        status: 'skipped',
        durationMs: 0,
        continueChain: true,
      }
    }

    // Check condition
    if (hook.condition) {
      const conditionMet = await this.checkCondition(hook.condition, context)
      if (!conditionMet) {
        return {
          success: true,
          status: 'skipped',
          durationMs: Date.now() - startTime,
          continueChain: true,
        }
      }
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(
        hook,
        context,
        timeout,
      )

      return {
        success: true,
        status: 'success',
        durationMs: Date.now() - startTime,
        output: result?.output,
        continueChain: result?.continueChain ?? true,
        modifiedContext: result?.modifiedContext,
      }
    }
    catch (error) {
      const durationMs = Date.now() - startTime

      if (error instanceof HookTimeoutError) {
        return {
          success: false,
          status: 'timeout',
          durationMs,
          error: error.message,
          continueChain: hook.action.continueOnError ?? true,
        }
      }

      return {
        success: false,
        status: 'failed',
        durationMs,
        error: error instanceof Error ? error.message : String(error),
        continueChain: hook.action.continueOnError ?? true,
      }
    }
  }

  /**
   * Execute a chain of hooks
   *
   * @param hooks - Hooks to execute
   * @param context - Execution context
   * @param options - Execution options
   * @returns Chain result
   */
  async executeChain(
    hooks: Hook[],
    context: HookContext,
    options?: HookExecutionOptions,
  ): Promise<HookChainResult> {
    const startTime = Date.now()
    const results: HookChainResult['results'] = []
    let currentContext = { ...context }
    let executedCount = 0
    let skippedCount = 0
    let failedCount = 0

    // Sort by priority (higher first)
    const sortedHooks = [...hooks].sort((a, b) =>
      (b.priority ?? 5) - (a.priority ?? 5),
    )

    if (options?.parallel) {
      // Parallel execution
      const parallelResults = await this.executeParallel(
        sortedHooks,
        currentContext,
        options,
      )

      for (const { hookId, result } of parallelResults) {
        results.push({ hookId, result })
        if (result.status === 'skipped') {
          skippedCount++
        }
        else if (!result.success) {
          failedCount++
        }
        else {
          executedCount++
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
        else if (!result.success) {
          failedCount++
          if (options?.stopOnError) {
            break
          }
        }
        else {
          executedCount++
        }

        // Apply context modifications
        if (result.modifiedContext) {
          currentContext = { ...currentContext, ...result.modifiedContext }
        }

        // Check if chain should continue
        if (!result.continueChain) {
          break
        }
      }
    }

    return {
      success: failedCount === 0,
      totalDurationMs: Date.now() - startTime,
      results,
      executedCount,
      skippedCount,
      failedCount,
      finalContext: currentContext,
    }
  }

  /**
   * Execute hooks in parallel
   *
   * @param hooks - Hooks to execute
   * @param context - Execution context
   * @param options - Execution options
   * @returns Array of results
   */
  private async executeParallel(
    hooks: Hook[],
    context: HookContext,
    options?: HookExecutionOptions,
  ): Promise<Array<{ hookId: string, result: HookResult }>> {
    const maxParallel = options?.maxParallel ?? 5
    const results: Array<{ hookId: string, result: HookResult }> = []

    // Process in batches
    for (let i = 0; i < hooks.length; i += maxParallel) {
      const batch = hooks.slice(i, i + maxParallel)
      const batchResults = await Promise.all(
        batch.map(async (hook) => {
          const result = await this.execute(hook, context, options)
          return { hookId: hook.id, result }
        }),
      )
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Execute hook with timeout
   *
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
            error instanceof Error ? error.message : String(error),
            hook.id,
            context,
            error instanceof Error ? error : undefined,
          ))
        })
    })
  }

  /**
   * Check if hook condition is met
   *
   * @param condition - Hook condition
   * @param context - Execution context
   * @returns Whether condition is met
   */
  private async checkCondition(
    condition: Hook['condition'],
    context: HookContext,
  ): Promise<boolean> {
    if (!condition)
      return true

    // Check tool condition
    if (condition.tool && context.tool) {
      if (condition.tool instanceof RegExp) {
        if (!condition.tool.test(context.tool))
          return false
      }
      else if (condition.tool !== context.tool) {
        return false
      }
    }

    // Check skill condition
    if (condition.skillId && context.skillId) {
      if (condition.skillId instanceof RegExp) {
        if (!condition.skillId.test(context.skillId))
          return false
      }
      else if (condition.skillId !== context.skillId) {
        return false
      }
    }

    // Check workflow condition
    if (condition.workflowId && context.workflowId) {
      if (condition.workflowId instanceof RegExp) {
        if (!condition.workflowId.test(context.workflowId))
          return false
      }
      else if (condition.workflowId !== context.workflowId) {
        return false
      }
    }

    // Check config condition
    if (condition.configKey && context.configKey) {
      if (condition.configKey instanceof RegExp) {
        if (!condition.configKey.test(context.configKey))
          return false
      }
      else if (condition.configKey !== context.configKey) {
        return false
      }
    }

    // Check custom condition
    if (condition.custom) {
      const customResult = await Promise.resolve(condition.custom(context))
      if (!customResult)
        return false
    }

    return true
  }
}

/**
 * Create a new hook executor
 *
 * @param options - Executor options
 * @param options.defaultTimeout - Default timeout in milliseconds
 * @returns New hook executor instance
 */
export function createHookExecutor(options?: { defaultTimeout?: number }): HookExecutor {
  return new HookExecutor(options)
}
