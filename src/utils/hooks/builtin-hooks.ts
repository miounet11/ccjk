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
import {
  completeTaskMonitoring,
  failTaskMonitoring,
  getNotificationManager,
  startTaskMonitoring,
} from '../notification/index.js'

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

// ============================================================================
// Task Notification Hooks
// ============================================================================

/**
 * Task start notification hook
 *
 * Starts task monitoring when a task begins.
 */
export const taskStartNotification: Hook = {
  id: 'builtin:task-start-notification',
  name: 'Task Start Notification',
  description: 'Starts task monitoring for notifications',
  type: 'task-start',
  priority: 10,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['notification', 'task'],
  action: {
    execute: async (context: HookContext): Promise<HookResult> => {
      const startTime = Date.now()

      try {
        if (context.taskId && context.taskDescription) {
          await startTaskMonitoring(context.taskId, context.taskDescription)

          if (process.env.DEBUG) {
            console.log(`[Hook] Task monitoring started: ${context.taskId}`)
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
          continueChain: true, // Don't block task execution on notification failure
        }
      }
    },
    timeout: 5000,
    continueOnError: true,
  },
}

/**
 * Task complete notification hook
 *
 * Sends notification when a task completes successfully.
 */
export const taskCompleteNotification: Hook = {
  id: 'builtin:task-complete-notification',
  name: 'Task Complete Notification',
  description: 'Sends notification when task completes',
  type: 'task-complete',
  priority: 5,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['notification', 'task'],
  action: {
    execute: async (context: HookContext): Promise<HookResult> => {
      const startTime = Date.now()

      try {
        const results = await completeTaskMonitoring(context.taskResult)

        if (process.env.DEBUG) {
          console.log(`[Hook] Task completed, notifications sent: ${results.length}`)
        }

        return {
          success: true,
          status: 'success',
          durationMs: Date.now() - startTime,
          output: { notificationResults: results },
          continueChain: true,
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
    timeout: 30000, // Allow more time for network requests
    continueOnError: true,
  },
}

/**
 * Task failed notification hook
 *
 * Sends notification when a task fails.
 */
export const taskFailedNotification: Hook = {
  id: 'builtin:task-failed-notification',
  name: 'Task Failed Notification',
  description: 'Sends notification when task fails',
  type: 'task-failed',
  priority: 10, // High priority for failure notifications
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['notification', 'task', 'error'],
  action: {
    execute: async (context: HookContext): Promise<HookResult> => {
      const startTime = Date.now()

      try {
        const errorMessage = context.error?.message || 'Unknown error'
        const results = await failTaskMonitoring(errorMessage)

        if (process.env.DEBUG) {
          console.log(`[Hook] Task failed, notifications sent: ${results.length}`)
        }

        return {
          success: true,
          status: 'success',
          durationMs: Date.now() - startTime,
          output: { notificationResults: results },
          continueChain: true,
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
    timeout: 30000,
    continueOnError: true,
  },
}

/**
 * Task progress notification hook
 *
 * Handles task progress updates (e.g., threshold reached).
 */
export const taskProgressNotification: Hook = {
  id: 'builtin:task-progress-notification',
  name: 'Task Progress Notification',
  description: 'Handles task progress updates',
  type: 'task-progress',
  priority: 5,
  enabled: true,
  source: 'builtin',
  version: '1.0.0',
  tags: ['notification', 'task', 'progress'],
  action: {
    execute: async (context: HookContext): Promise<HookResult> => {
      const startTime = Date.now()

      try {
        const manager = getNotificationManager()
        const currentTask = manager.getCurrentTask()

        if (process.env.DEBUG && currentTask) {
          const durationMin = context.taskDuration
            ? Math.round(context.taskDuration / 60000)
            : 0
          console.log(`[Hook] Task progress: ${currentTask.taskId} running for ${durationMin} minutes`)
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
          continueChain: true,
        }
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
  // Task notification hooks
  taskStartNotification,
  taskCompleteNotification,
  taskFailedNotification,
  taskProgressNotification,
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
