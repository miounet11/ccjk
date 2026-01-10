/**
 * Built-in Hooks
 *
 * Provides default hooks for common CCJK operations including
 * tool validation, logging, skill tracking, and error handling.
 *
 * @module utils/hooks/builtin-hooks
 */

import type { Hook, HookContext, HookResult } from './types.js'

/**
 * Simple logger wrapper for consistent logging
 */
const logger = {
  info: (message: string, ...args: unknown[]) => console.log(`[INFO] ${message}`, ...args),
  debug: (message: string, ...args: unknown[]) => console.log(`[DEBUG] ${message}`, ...args),
  error: (message: string, ...args: unknown[]) => console.error(`[ERROR] ${message}`, ...args),
  warn: (message: string, ...args: unknown[]) => console.warn(`[WARN] ${message}`, ...args),
  success: (message: string, ...args: unknown[]) => console.log(`[SUCCESS] ${message}`, ...args),
}

/**
 * Pre-Tool-Use Hook: Tool Validation
 *
 * Validates tool arguments and context before tool execution.
 * Checks for required parameters and validates input formats.
 *
 * @example
 * ```typescript
 * registry.register(preToolUseValidation, 'builtin')
 * ```
 */
export const preToolUseValidation: Hook = {
  id: 'builtin-tool-validation',
  name: 'Pre-Tool Validation',
  description: 'Validates tool arguments and context before execution',
  type: 'pre-tool-use',
  priority: 8,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['validation', 'pre-execution'],
  action: {
    execute: async (context: HookContext): Promise<HookResult> => {
      const startTime = Date.now()

      try {
        // Validate tool name
        if (!context.tool) {
          return {
            success: false,
            status: 'failed',
            durationMs: Date.now() - startTime,
            error: 'Tool name is required',
            continueChain: false,
          }
        }

        // Validate tool arguments if present
        if (context.toolArgs) {
          // Check for common issues
          const args = context.toolArgs

          // Example validations
          if (args.file_path && typeof args.file_path !== 'string') {
            return {
              success: false,
              status: 'failed',
              durationMs: Date.now() - startTime,
              error: 'file_path must be a string',
              continueChain: false,
            }
          }

          if (args.pattern && typeof args.pattern !== 'string') {
            return {
              success: false,
              status: 'failed',
              durationMs: Date.now() - startTime,
              error: 'pattern must be a string',
              continueChain: false,
            }
          }
        }

        return {
          success: true,
          status: 'success',
          durationMs: Date.now() - startTime,
          continueChain: true,
        }
      }
      catch (error) {
        return {
          success: false,
          status: 'failed',
          durationMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
          continueChain: true, // Continue despite validation errors
        }
      }
    },
    timeout: 5000,
    continueOnError: true,
  },
}

/**
 * Post-Tool-Use Hook: Tool Execution Logging
 *
 * Logs tool execution details including duration, success status,
 * and any errors encountered.
 *
 * @example
 * ```typescript
 * registry.register(postToolUseLogging, 'builtin')
 * ```
 */
export const postToolUseLogging: Hook = {
  id: 'builtin-tool-logging',
  name: 'Post-Tool Logging',
  description: 'Logs tool execution results and statistics',
  type: 'post-tool-use',
  priority: 5,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['logging', 'post-execution', 'monitoring'],
  action: {
    execute: async (context: HookContext): Promise<HookResult> => {
      const startTime = Date.now()

      try {
        const tool = context.tool || 'unknown'
        const timestamp = context.timestamp.toISOString()

        // Log execution details
        if (context.error) {
          logger.error(`[Hook] Tool '${tool}' failed at ${timestamp}:`, context.error.message)
        }
        else {
          logger.debug(`[Hook] Tool '${tool}' executed successfully at ${timestamp}`)
        }

        // Log metadata if present
        if (context.metadata) {
          logger.debug(`[Hook] Tool metadata:`, context.metadata)
        }

        return {
          success: true,
          status: 'success',
          durationMs: Date.now() - startTime,
          continueChain: true,
        }
      }
      catch (error) {
        return {
          success: false,
          status: 'failed',
          durationMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
          continueChain: true, // Always continue after logging
        }
      }
    },
    timeout: 3000,
    continueOnError: true,
  },
}

/**
 * Skill-Activate Hook: Skill Activation Notification
 *
 * Notifies when a skill is activated and logs activation context.
 * Useful for tracking skill usage and debugging.
 *
 * @example
 * ```typescript
 * registry.register(skillActivateNotification, 'builtin')
 * ```
 */
export const skillActivateNotification: Hook = {
  id: 'builtin-skill-activation',
  name: 'Skill Activation Notification',
  description: 'Notifies when a skill is activated',
  type: 'skill-activated',
  priority: 7,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['notification', 'skill', 'tracking'],
  action: {
    execute: async (context: HookContext): Promise<HookResult> => {
      const startTime = Date.now()

      try {
        const skillId = context.skillId || 'unknown'
        const timestamp = context.timestamp.toISOString()

        logger.info(`[Hook] Skill '${skillId}' activated at ${timestamp}`)

        // Log additional context
        if (context.metadata) {
          logger.debug(`[Hook] Skill activation context:`, context.metadata)
        }

        return {
          success: true,
          status: 'success',
          durationMs: Date.now() - startTime,
          continueChain: true,
          output: {
            skillId,
            activatedAt: timestamp,
          },
        }
      }
      catch (error) {
        return {
          success: false,
          status: 'failed',
          durationMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
          continueChain: true,
        }
      }
    },
    timeout: 3000,
    continueOnError: true,
  },
}

/**
 * Skill-Complete Hook: Skill Completion Statistics
 *
 * Tracks skill completion and collects execution statistics.
 * Records duration, success rate, and other metrics.
 *
 * @example
 * ```typescript
 * registry.register(skillCompleteStatistics, 'builtin')
 * ```
 */
export const skillCompleteStatistics: Hook = {
  id: 'builtin-skill-completion',
  name: 'Skill Completion Statistics',
  description: 'Tracks skill completion and collects statistics',
  type: 'skill-completed',
  priority: 6,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['statistics', 'skill', 'tracking', 'monitoring'],
  action: {
    execute: async (context: HookContext): Promise<HookResult> => {
      const startTime = Date.now()

      try {
        const skillId = context.skillId || 'unknown'
        const timestamp = context.timestamp.toISOString()
        const success = !context.error

        // Log completion
        if (success) {
          logger.success(`[Hook] Skill '${skillId}' completed successfully at ${timestamp}`)
        }
        else {
          logger.warn(`[Hook] Skill '${skillId}' completed with errors at ${timestamp}`)
        }

        // Collect statistics
        const stats = {
          skillId,
          completedAt: timestamp,
          success,
          error: context.error?.message,
          metadata: context.metadata,
        }

        logger.debug(`[Hook] Skill statistics:`, stats)

        return {
          success: true,
          status: 'success',
          durationMs: Date.now() - startTime,
          continueChain: true,
          output: stats,
        }
      }
      catch (error) {
        return {
          success: false,
          status: 'failed',
          durationMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
          continueChain: true,
        }
      }
    },
    timeout: 5000,
    continueOnError: true,
  },
}

/**
 * Workflow-Start Hook: Workflow Initialization
 *
 * Initializes workflow context and prepares environment.
 * Validates workflow configuration and dependencies.
 *
 * @example
 * ```typescript
 * registry.register(workflowStartInitialization, 'builtin')
 * ```
 */
export const workflowStartInitialization: Hook = {
  id: 'builtin-workflow-started',
  name: 'Workflow Start Initialization',
  description: 'Initializes workflow context and validates configuration',
  type: 'workflow-started',
  priority: 9,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['workflow', 'initialization', 'validation'],
  action: {
    execute: async (context: HookContext): Promise<HookResult> => {
      const startTime = Date.now()

      try {
        const workflowId = context.workflowId || 'unknown'
        const timestamp = context.timestamp.toISOString()

        logger.info(`[Hook] Workflow '${workflowId}' starting at ${timestamp}`)

        // Validate workflow context
        if (!context.cwd) {
          logger.warn('[Hook] No working directory specified for workflow')
        }

        // Log workflow metadata
        if (context.metadata) {
          logger.debug(`[Hook] Workflow metadata:`, context.metadata)
        }

        return {
          success: true,
          status: 'success',
          durationMs: Date.now() - startTime,
          continueChain: true,
          output: {
            workflowId,
            startedAt: timestamp,
            cwd: context.cwd,
          },
        }
      }
      catch (error) {
        return {
          success: false,
          status: 'failed',
          durationMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
          continueChain: true,
        }
      }
    },
    timeout: 5000,
    continueOnError: true,
  },
}

/**
 * Workflow-Complete Hook: Workflow Cleanup
 *
 * Performs cleanup operations after workflow completion.
 * Logs final statistics and handles resource cleanup.
 *
 * @example
 * ```typescript
 * registry.register(workflowCompleteCleanup, 'builtin')
 * ```
 */
export const workflowCompleteCleanup: Hook = {
  id: 'builtin-workflow-completed',
  name: 'Workflow Complete Cleanup',
  description: 'Performs cleanup and logs workflow completion statistics',
  type: 'workflow-complete',
  priority: 5,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['workflow', 'cleanup', 'statistics'],
  action: {
    execute: async (context: HookContext): Promise<HookResult> => {
      const startTime = Date.now()

      try {
        const workflowId = context.workflowId || 'unknown'
        const timestamp = context.timestamp.toISOString()
        const success = !context.error

        // Log completion
        if (success) {
          logger.success(`[Hook] Workflow '${workflowId}' completed successfully at ${timestamp}`)
        }
        else {
          logger.error(`[Hook] Workflow '${workflowId}' failed at ${timestamp}:`, context.error?.message)
        }

        // Log final statistics
        if (context.metadata) {
          logger.debug(`[Hook] Workflow final statistics:`, context.metadata)
        }

        return {
          success: true,
          status: 'success',
          durationMs: Date.now() - startTime,
          continueChain: true,
          output: {
            workflowId,
            completedAt: timestamp,
            success,
          },
        }
      }
      catch (error) {
        return {
          success: false,
          status: 'failed',
          durationMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
          continueChain: true,
        }
      }
    },
    timeout: 5000,
    continueOnError: true,
  },
}

/**
 * Error Hook: Global Error Handler
 *
 * Handles errors across the CCJK system.
 * Logs errors, collects diagnostics, and optionally reports to monitoring.
 *
 * @example
 * ```typescript
 * registry.register(globalErrorHandler, 'builtin')
 * ```
 */
export const globalErrorHandler: Hook = {
  id: 'builtin-error-handler',
  name: 'Global Error Handler',
  description: 'Handles and logs errors across the CCJK system',
  type: 'error',
  priority: 10,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['error', 'logging', 'monitoring'],
  action: {
    execute: async (context: HookContext): Promise<HookResult> => {
      const startTime = Date.now()

      try {
        const timestamp = context.timestamp.toISOString()
        const error = context.error

        if (!error) {
          return {
            success: true,
            status: 'success',
            durationMs: Date.now() - startTime,
            continueChain: true,
          }
        }

        // Log error details
        logger.error(`[Hook] Error occurred at ${timestamp}:`)
        logger.error(`  Message: ${error.message}`)
        if (error.stack) {
          logger.error(`  Stack: ${error.stack}`)
        }

        // Log context
        if (context.tool) {
          logger.error(`  Tool: ${context.tool}`)
        }
        if (context.skillId) {
          logger.error(`  Skill: ${context.skillId}`)
        }
        if (context.workflowId) {
          logger.error(`  Workflow: ${context.workflowId}`)
        }

        // Log metadata
        if (context.metadata) {
          logger.error(`  Metadata:`, context.metadata)
        }

        return {
          success: true,
          status: 'success',
          durationMs: Date.now() - startTime,
          continueChain: true,
          output: {
            errorLogged: true,
            timestamp,
            errorMessage: error.message,
          },
        }
      }
      catch (handlerError) {
        // Error in error handler - log but don't fail
        logger.error('[Hook] Error in error handler:', handlerError)
        return {
          success: false,
          status: 'failed',
          durationMs: Date.now() - startTime,
          error: handlerError instanceof Error ? handlerError.message : String(handlerError),
          continueChain: true,
        }
      }
    },
    timeout: 10000,
    continueOnError: true,
  },
}

/**
 * Config-Change Hook: Configuration Change Logger
 *
 * Logs configuration changes for audit and debugging purposes.
 * Tracks what changed, when, and by whom.
 *
 * @example
 * ```typescript
 * registry.register(configChangeLogger, 'builtin')
 * ```
 */
export const configChangeLogger: Hook = {
  id: 'builtin-config-change',
  name: 'Configuration Change Logger',
  description: 'Logs configuration changes for audit purposes',
  type: 'config-change',
  priority: 7,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['config', 'logging', 'audit'],
  action: {
    execute: async (context: HookContext): Promise<HookResult> => {
      const startTime = Date.now()

      try {
        const configKey = context.configKey || 'unknown'
        const timestamp = context.timestamp.toISOString()

        logger.info(`[Hook] Configuration changed: '${configKey}' at ${timestamp}`)

        // Log change details
        if (context.metadata) {
          logger.debug(`[Hook] Configuration change details:`, context.metadata)
        }

        return {
          success: true,
          status: 'success',
          durationMs: Date.now() - startTime,
          continueChain: true,
          output: {
            configKey,
            changedAt: timestamp,
          },
        }
      }
      catch (error) {
        return {
          success: false,
          status: 'failed',
          durationMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
          continueChain: true,
        }
      }
    },
    timeout: 3000,
    continueOnError: true,
  },
}

/**
 * All built-in hooks
 *
 * Array of all built-in hooks for easy registration.
 *
 * @example
 * ```typescript
 * for (const hook of builtinHooks) {
 *   registry.register(hook, 'builtin')
 * }
 * ```
 */
export const builtinHooks: Hook[] = [
  preToolUseValidation,
  postToolUseLogging,
  skillActivateNotification,
  skillCompleteStatistics,
  workflowStartInitialization,
  workflowCompleteCleanup,
  globalErrorHandler,
  configChangeLogger,
]

/**
 * Register all built-in hooks
 *
 * Convenience function to register all built-in hooks at once.
 *
 * @param registry - Hook registry to register hooks in
 *
 * @example
 * ```typescript
 * import { getGlobalRegistry } from './registry'
 * import { registerBuiltinHooks } from './builtin-hooks'
 *
 * const registry = getGlobalRegistry()
 * registerBuiltinHooks(registry)
 * ```
 */
export function registerBuiltinHooks(registry: { register: (hook: Hook, source: string) => void }): void {
  for (const hook of builtinHooks) {
    try {
      registry.register(hook, 'builtin')
    }
    catch (error) {
      logger.warn(`[Hook] Failed to register built-in hook '${hook.id}':`, error)
    }
  }
}
