/**
 * CLI Hook - Seamless Integration with Existing CLI
 *
 * This hook integrates the Brain Router into the existing CCJK CLI
 * without breaking any existing functionality.
 *
 * Installation:
 * 1. Import this hook in the main CLI entry point
 * 2. Call setupBrainHook() during initialization
 * 3. All user input will be automatically intercepted and routed
 */

import type { ExecutionResult } from '../router'
import { EventEmitter } from 'node:events'
import { processUserInput } from '../router'

/**
 * Hook configuration
 */
export interface BrainHookConfig {
  enabled: boolean // Default: true
  silent: boolean // Default: false (show what's happening)
  fallbackToClaudeCode: boolean // Default: true
}

/**
 * Hook result
 */
export interface HookResult {
  intercepted: boolean
  handled: boolean
  executionResult?: ExecutionResult
  shouldContinue: boolean // Should continue to Claude Code?
  message?: string
  /**
   * Additional context injected into the model via PreToolUse hook.
   * Claude Code 2.1+ passes this string to the model alongside the tool call.
   * Use this to inject task state, session context, or brain insights
   * without blocking the tool execution.
   */
  additionalContext?: string
}

/**
 * Brain CLI Hook
 */
export class BrainCliHook extends EventEmitter {
  private config: Required<BrainHookConfig>
  private initialized = false

  constructor(config: Partial<BrainHookConfig> = {}) {
    super()

    this.config = {
      enabled: config.enabled !== undefined ? config.enabled : true,
      silent: config.silent !== undefined ? config.silent : false,
      fallbackToClaudeCode: config.fallbackToClaudeCode !== undefined ? config.fallbackToClaudeCode : true,
    }
  }

  /**
   * Initialize the hook
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    // Initialize all brain systems
    const { getGlobalStateManager } = await import('../persistence/git-backed-state')
    const { getGlobalMailboxManager } = await import('../messaging/persistent-mailbox')
    const { getGlobalConvoyManager } = await import('../convoy/convoy-manager')

    const stateManager = getGlobalStateManager()
    const mailboxManager = getGlobalMailboxManager()
    const convoyManager = getGlobalConvoyManager()

    await stateManager.initialize()
    await mailboxManager.initialize()
    await convoyManager.initialize()

    this.initialized = true
    this.emit('hook:initialized')

    if (!this.config.silent) {
      console.log('🧠 Brain system initialized - automatic routing enabled')
    }
  }

  /**
   * Process user input through the hook
   */
  async processInput(userInput: string): Promise<HookResult> {
    if (!this.config.enabled) {
      return {
        intercepted: false,
        handled: false,
        shouldContinue: true,
        message: 'Hook disabled',
      }
    }

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      // Process through brain router
      const result = await processUserInput(userInput)

      // If handled by brain system
      if (result.handled && result.result) {
        this.emit('hook:handled', { input: userInput, result: result.result })

        // Show result to user
        if (!this.config.silent) {
          this.displayResult(result.result)
        }

        return {
          intercepted: true,
          handled: true,
          executionResult: result.result,
          shouldContinue: false, // Don't pass to Claude Code
          message: result.message,
        }
      }

      // If passthrough (simple query, system command, etc.)
      if (result.passthrough) {
        this.emit('hook:passthrough', { input: userInput, reason: result.message })

        // Inject brain context via PreToolUse additionalContext (Claude Code 2.1+)
        const additionalContext = this.config.silent ? undefined : await this.buildAdditionalContext()

        return {
          intercepted: true,
          handled: false,
          shouldContinue: true, // Pass to Claude Code
          message: result.message,
          additionalContext,
        }
      }

      // Fallback
      return {
        intercepted: false,
        handled: false,
        shouldContinue: this.config.fallbackToClaudeCode,
        message: 'No interception',
      }
    }
    catch (error) {
      this.emit('hook:error', { error, input: userInput })

      // On error, fallback to Claude Code if enabled
      if (this.config.fallbackToClaudeCode) {
        console.error('Brain system error, falling back to Claude Code:', error)
        return {
          intercepted: true,
          handled: false,
          shouldContinue: true,
          message: 'Error - falling back to Claude Code',
        }
      }

      throw error
    }
  }

  /**
   * Display execution result to user
   */
  private displayResult(result: ExecutionResult): void {
    console.log(`\n${'='.repeat(60)}`)
    console.log('🧠 Brain System Result')
    console.log('='.repeat(60))
    console.log()

    // Route info
    const routeEmoji = {
      mayor: '👔',
      plan: '📋',
      feature: '⚡',
      direct: '🚀',
    }
    console.log(`${routeEmoji[result.route]} Route: ${result.route.toUpperCase()}`)
    console.log(`📊 Complexity: ${result.intent.complexity}`)
    console.log(`🎯 Intent: ${result.intent.type}`)
    console.log()

    // Auto-created resources
    if (result.agentsCreated.length > 0) {
      console.log('🤖 Agents Created:')
      for (const agent of result.agentsCreated) {
        console.log(`   ✓ ${agent}`)
      }
      console.log()
    }

    if (result.skillsCreated.length > 0) {
      console.log('🎓 Skills Created:')
      for (const skill of result.skillsCreated) {
        console.log(`   ✓ ${skill}`)
      }
      console.log()
    }

    if (result.mcpToolsUsed.length > 0) {
      console.log('🔧 MCP Tools Selected:')
      for (const tool of result.mcpToolsUsed) {
        console.log(`   ✓ ${tool}`)
      }
      console.log()
    }

    // Convoy info
    if (result.convoyId) {
      console.log(`📦 Convoy: ${result.convoyId}`)
      console.log()
    }

    // Message
    console.log('💬 Message:')
    console.log(`   ${result.message}`)
    console.log()

    console.log('='.repeat(60))
    console.log()
  }

  /**
   * Build additional context string for PreToolUse hook injection.
   * Provides brain insights (task state, session context) to the model
   * without blocking tool execution. Claude Code 2.1+ feature.
   */
  private async buildAdditionalContext(): Promise<string | undefined> {
    try {
      // Load L0 context summary (ultra-lightweight, ~100 tokens)
      const { loadContextAtDepth } = await import('../context-loader')
      const ctx = await loadContextAtDepth('L0')
      if (ctx.totalTokens > 0) {
        return `[Brain Context: ${ctx.layers.size} layers, ~${ctx.totalTokens} tokens, depth=${ctx.depth}]`
      }
      return undefined
    }
    catch {
      return undefined // Never block on context build failure
    }
  }

  /**
   * Enable the hook
   */
  enable(): void {
    this.config.enabled = true
    this.emit('hook:enabled')
  }

  /**
   * Disable the hook
   */
  disable(): void {
    this.config.enabled = false
    this.emit('hook:disabled')
  }

  /**
   * Check if hook is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }
}

// Global singleton instance
let globalHook: BrainCliHook | null = null

/**
 * Get global brain CLI hook instance
 */
export function getGlobalBrainHook(config?: Partial<BrainHookConfig>): BrainCliHook {
  if (!globalHook) {
    globalHook = new BrainCliHook(config)
  }
  return globalHook
}

/**
 * Setup brain hook - call this during CLI initialization
 *
 * Usage in main CLI file:
 * ```typescript
 * import { setupBrainHook } from './brain/integration/cli-hook'
 *
 * // During CLI initialization
 * await setupBrainHook()
 * ```
 */
export async function setupBrainHook(config?: Partial<BrainHookConfig>): Promise<BrainCliHook> {
  const hook = getGlobalBrainHook(config)
  await hook.initialize()
  return hook
}

/**
 * Process CLI input - main integration point
 *
 * Usage in CLI input handler:
 * ```typescript
 * import { processCliInput } from './brain/integration/cli-hook'
 *
 * // In your input handler
 * const result = await processCliInput(userInput)
 * if (result.shouldContinue) {
 *   // Pass to normal Claude Code execution
 *   await executeClaudeCode(userInput)
 * }
 * // Otherwise, brain system already handled it
 * ```
 */
export async function processCliInput(userInput: string): Promise<HookResult> {
  const hook = getGlobalBrainHook()
  return await hook.processInput(userInput)
}

/**
 * Reset global hook (for testing)
 */
export function resetGlobalBrainHook(): void {
  globalHook = null
}
