/**
 * Brain Router - Zero-Config Automatic Execution System
 *
 * Main entry point for the intelligent routing system.
 * Users just type what they want - the system handles everything.
 *
 * Features:
 * - Automatic intent detection
 * - Automatic skill creation
 * - Automatic agent spawning
 * - Automatic MCP tool selection
 * - Automatic routing (mayor/plan/feature/direct)
 *
 * Zero configuration needed. Zero manual intervention needed.
 */

import type { ExecutionResult } from './auto-executor'
import { EventEmitter } from 'node:events'
import { getGlobalCliInterceptor } from './cli-interceptor'

/**
 * Brain Router - Main orchestrator
 */
export class BrainRouter extends EventEmitter {
  private interceptor = getGlobalCliInterceptor({
    enabled: true,
    autoExecute: true,
    showIntent: true,
    verbose: false,
  })

  constructor() {
    super()

    // Forward events
    this.interceptor.on('intercept:started', (data) => {
      this.emit('router:started', data)
    })

    this.interceptor.on('intercept:completed', (data) => {
      this.emit('router:completed', data)
    })

    this.interceptor.on('intercept:failed', (data) => {
      this.emit('router:failed', data)
    })

    this.interceptor.on('intercept:bypassed', (data) => {
      this.emit('router:bypassed', data)
    })
  }

  /**
   * Process user input - main entry point
   *
   * This is the ONLY function users/CLI need to call.
   * Everything else is automatic.
   */
  async process(userInput: string): Promise<{
    handled: boolean
    result?: ExecutionResult
    passthrough?: boolean
    message: string
  }> {
    try {
      // Intercept and route
      const interceptionResult = await this.interceptor.intercept(userInput)

      // If bypassed, pass through to normal Claude Code
      if (interceptionResult.bypassed) {
        return {
          handled: false,
          passthrough: true,
          message: `Passing through to Claude Code: ${interceptionResult.bypassReason}`,
        }
      }

      // If intercepted and executed
      if (interceptionResult.intercepted && interceptionResult.executionResult) {
        return {
          handled: true,
          result: interceptionResult.executionResult,
          message: interceptionResult.executionResult.message,
        }
      }

      // Fallback
      return {
        handled: false,
        passthrough: true,
        message: 'No interception needed',
      }
    }
    catch (error) {
      this.emit('router:error', { error, input: userInput })
      throw error
    }
  }

  /**
   * Enable automatic routing
   */
  enable(): void {
    this.interceptor.enable()
    this.emit('router:enabled')
  }

  /**
   * Disable automatic routing
   */
  disable(): void {
    this.interceptor.disable()
    this.emit('router:disabled')
  }

  /**
   * Check if router is enabled
   */
  isEnabled(): boolean {
    return this.interceptor.isEnabled()
  }
}

// Global singleton instance
let globalRouter: BrainRouter | null = null

/**
 * Get global brain router instance
 */
export function getGlobalBrainRouter(): BrainRouter {
  if (!globalRouter) {
    globalRouter = new BrainRouter()
  }
  return globalRouter
}

/**
 * Reset global router (for testing)
 */
export function resetGlobalBrainRouter(): void {
  globalRouter = null
}

/**
 * Main entry point - process user input with zero config
 *
 * Usage in CLI:
 * ```typescript
 * import { processUserInput } from './brain/router'
 *
 * const result = await processUserInput(userInput)
 * if (result.handled) {
 *   // Brain system handled it
 *   console.log(result.message)
 * } else {
 *   // Pass to normal Claude Code
 *   await normalClaudeCodeExecution(userInput)
 * }
 * ```
 */
export async function processUserInput(userInput: string) {
  const router = getGlobalBrainRouter()
  return await router.process(userInput)
}

export type { ExecutionResult } from './auto-executor'
// Re-export types
export type { InterceptionResult } from './cli-interceptor'
export type { AnalyzedIntent, ComplexityLevel, IntentType } from './intent-router'
