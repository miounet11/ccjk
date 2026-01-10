/**
 * Built-in Hooks Module
 *
 * Provides default hooks for common CCJK operations.
 *
 * @module utils/hooks/builtin-hooks
 */

import type { HookRegistry } from './registry.js'

import type { Hook, HookContext, HookResult } from './types.js'
import process from 'node:process'

/**
 * Pre-tool-use validation hook
 *
 * Validates tool arguments before execution.
 */
export const preToolUseValidation: Hook = {
  id: 'builtin:pre-tool-use-validation',
  name: 'Pre-Tool-Use Validation',
  description: 'Validates tool arguments before execution',
  type: 'pre-tool-use',
  priority: 10,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['validation', 'tool'],
  action: {
    execute: (context: HookContext): HookResult => {
      // Basic validation - ensure tool name exists
      if (!context.tool) {
        return {
          success: false,
          status: 'failed',
          durationMs: 0,
          error: 'Tool name is required',
          continueChain: false,
        }
      }

      return {
        success: true,
        status: 'success',
        durationMs: 0,
        continueChain: true,
      }
    },
    timeout: 5000,
    continueOnError: false,
  },
}

/**
 * Post-tool-use logging hook
 *
 * Logs tool execution results.
 */
export const postToolUseLogging: Hook = {
  id: 'builtin:post-tool-use-logging',
  name: 'Post-Tool-Use Logging',
  description: 'Logs tool execution results',
  type: 'post-tool-use',
  priority: 1,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['logging', 'tool'],
  action: {
    execute: (context: HookContext): HookResult => {
      // Log tool execution (in production, this would use a proper logger)
      if (process.env.DEBUG) {
        console.log(`[Hook] Tool executed: ${context.tool}`)
      }

      return {
        success: true,
        status: 'success',
        durationMs: 0,
        continueChain: true,
      }
    },
    timeout: 5000,
    continueOnError: true,
  },
}

/**
 * Skill activation notification hook
 *
 * Notifies when a skill is activated.
 */
export const skillActivateNotification: Hook = {
  id: 'builtin:skill-activate-notification',
  name: 'Skill Activation Notification',
  description: 'Notifies when a skill is activated',
  type: 'skill-activate',
  priority: 5,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['notification', 'skill'],
  action: {
    execute: (context: HookContext): HookResult => {
      if (process.env.DEBUG) {
        console.log(`[Hook] Skill activated: ${context.skillId}`)
      }

      return {
        success: true,
        status: 'success',
        durationMs: 0,
        continueChain: true,
      }
    },
    timeout: 5000,
    continueOnError: true,
  },
}

/**
 * Skill completion statistics hook
 *
 * Collects statistics when a skill completes.
 */
export const skillCompleteStatistics: Hook = {
  id: 'builtin:skill-complete-statistics',
  name: 'Skill Completion Statistics',
  description: 'Collects statistics when a skill completes',
  type: 'skill-complete',
  priority: 1,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['statistics', 'skill'],
  action: {
    execute: (context: HookContext): HookResult => {
      // In production, this would update statistics storage
      if (process.env.DEBUG) {
        console.log(`[Hook] Skill completed: ${context.skillId}`)
      }

      return {
        success: true,
        status: 'success',
        durationMs: 0,
        continueChain: true,
      }
    },
    timeout: 5000,
    continueOnError: true,
  },
}

/**
 * Workflow start initialization hook
 *
 * Initializes resources when a workflow starts.
 */
export const workflowStartInitialization: Hook = {
  id: 'builtin:workflow-start-initialization',
  name: 'Workflow Start Initialization',
  description: 'Initializes resources when a workflow starts',
  type: 'workflow-start',
  priority: 10,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['initialization', 'workflow'],
  action: {
    execute: (context: HookContext): HookResult => {
      if (process.env.DEBUG) {
        console.log(`[Hook] Workflow started: ${context.workflowId}`)
      }

      return {
        success: true,
        status: 'success',
        durationMs: 0,
        continueChain: true,
        modifiedContext: {
          metadata: {
            ...context.metadata,
            workflowStartedAt: new Date().toISOString(),
          },
        },
      }
    },
    timeout: 10000,
    continueOnError: false,
  },
}

/**
 * Workflow completion cleanup hook
 *
 * Cleans up resources when a workflow completes.
 */
export const workflowCompleteCleanup: Hook = {
  id: 'builtin:workflow-complete-cleanup',
  name: 'Workflow Completion Cleanup',
  description: 'Cleans up resources when a workflow completes',
  type: 'workflow-complete',
  priority: 1,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['cleanup', 'workflow'],
  action: {
    execute: (context: HookContext): HookResult => {
      if (process.env.DEBUG) {
        console.log(`[Hook] Workflow completed: ${context.workflowId}`)
      }

      return {
        success: true,
        status: 'success',
        durationMs: 0,
        continueChain: true,
      }
    },
    timeout: 10000,
    continueOnError: true,
  },
}

/**
 * Configuration change logger hook
 *
 * Logs configuration changes.
 */
export const configChangeLogger: Hook = {
  id: 'builtin:config-change-logger',
  name: 'Configuration Change Logger',
  description: 'Logs configuration changes',
  type: 'config-change',
  priority: 5,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['logging', 'config'],
  action: {
    execute: (context: HookContext): HookResult => {
      if (process.env.DEBUG) {
        console.log(`[Hook] Config changed: ${context.configKey}`)
      }

      return {
        success: true,
        status: 'success',
        durationMs: 0,
        continueChain: true,
      }
    },
    timeout: 5000,
    continueOnError: true,
  },
}

/**
 * Global error handler hook
 *
 * Handles errors globally.
 */
export const globalErrorHandler: Hook = {
  id: 'builtin:global-error-handler',
  name: 'Global Error Handler',
  description: 'Handles errors globally',
  type: 'error',
  priority: 10,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['error', 'handler'],
  action: {
    execute: (context: HookContext): HookResult => {
      // Log error (in production, this would use a proper error tracking service)
      if (context.error) {
        console.error(`[Hook] Error occurred: ${context.error.message}`)
      }

      return {
        success: true,
        status: 'success',
        durationMs: 0,
        continueChain: true,
      }
    },
    timeout: 5000,
    continueOnError: true,
  },
}

/**
 * All built-in hooks
 */
export const builtinHooks: Hook[] = [
  preToolUseValidation,
  postToolUseLogging,
  skillActivateNotification,
  skillCompleteStatistics,
  workflowStartInitialization,
  workflowCompleteCleanup,
  configChangeLogger,
  globalErrorHandler,
]

/**
 * Register all built-in hooks
 *
 * @param registry - Hook registry to register hooks in
 */
export function registerBuiltinHooks(registry: HookRegistry): void {
  for (const hook of builtinHooks) {
    registry.register(hook, { source: 'builtin' })
  }
}
