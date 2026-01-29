/**
 * Context Checker Middleware for CCJK
 *
 * Proactively checks context usage before executing complex tasks
 * to prevent truncation issues.
 *
 * @module middleware/context-checker
 */

import type { ContextWindowAnalysis } from '../core/mcp-search'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeContextWindowUsage } from '../core/mcp-search'

// ============================================================================
// Types
// ============================================================================

/**
 * Context check result
 */
export interface ContextCheckResult {
  /** Whether execution can proceed */
  canProceed: boolean

  /** Warning level: none, low, medium, high, critical */
  level: 'none' | 'low' | 'medium' | 'high' | 'critical'

  /** Usage percentage */
  usagePercent: number

  /** Suggested action */
  suggestion?: string

  /** Whether state was auto-saved */
  stateSaved?: boolean

  /** Path to saved state */
  statePath?: string
}

/**
 * Context checker options
 */
export interface ContextCheckerOptions {
  /** Threshold for low warning (default: 50%) */
  lowThreshold?: number

  /** Threshold for medium warning (default: 70%) */
  mediumThreshold?: number

  /** Threshold for high warning (default: 85%) */
  highThreshold?: number

  /** Threshold for critical (block execution) (default: 95%) */
  criticalThreshold?: number

  /** Auto-save state when high threshold reached */
  autoSaveState?: boolean

  /** State save directory */
  stateSaveDir?: string

  /** Verbose logging */
  verbose?: boolean
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_OPTIONS: Required<ContextCheckerOptions> = {
  lowThreshold: 50,
  mediumThreshold: 70,
  highThreshold: 85,
  criticalThreshold: 95,
  autoSaveState: true,
  stateSaveDir: '.ccjk/state',
  verbose: false,
}

// ============================================================================
// Context Checker Class
// ============================================================================

/**
 * Context Checker
 *
 * Monitors context window usage and provides warnings/suggestions
 * before executing tasks that might fail due to context overflow.
 */
export class ContextChecker {
  private options: Required<ContextCheckerOptions>
  private lastCheck: ContextCheckResult | null = null
  private checkCount = 0

  constructor(options: ContextCheckerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Check context usage before execution
   *
   * @param mcpServers - MCP server configuration
   * @param model - Model being used
   * @returns Check result
   */
  async check(
    mcpServers?: Record<string, any>,
    model?: string,
  ): Promise<ContextCheckResult> {
    this.checkCount++

    // Analyze current context usage
    const analysis = analyzeContextWindowUsage({
      mcpServers,
      model,
    })

    const usagePercent = analysis.percentageUsed
    const result = this.evaluateUsage(usagePercent, analysis)

    this.lastCheck = result

    // Log based on level
    this.logResult(result)

    return result
  }

  /**
   * Evaluate usage and determine action
   */
  private evaluateUsage(
    usagePercent: number,
    analysis: ContextWindowAnalysis,
  ): ContextCheckResult {
    const { lowThreshold, mediumThreshold, highThreshold, criticalThreshold } = this.options

    // Critical: Block execution
    if (usagePercent >= criticalThreshold) {
      const statePath = this.options.autoSaveState
        ? this.saveState(analysis, 'critical')
        : undefined

      return {
        canProceed: false,
        level: 'critical',
        usagePercent,
        suggestion: '上下文使用率过高，请执行 /compact 清理后重试',
        stateSaved: !!statePath,
        statePath,
      }
    }

    // High: Warn strongly, auto-save state
    if (usagePercent >= highThreshold) {
      const statePath = this.options.autoSaveState
        ? this.saveState(analysis, 'high')
        : undefined

      return {
        canProceed: true,
        level: 'high',
        usagePercent,
        suggestion: '上下文使用率较高，建议尽快执行 /compact',
        stateSaved: !!statePath,
        statePath,
      }
    }

    // Medium: Gentle warning
    if (usagePercent >= mediumThreshold) {
      return {
        canProceed: true,
        level: 'medium',
        usagePercent,
        suggestion: '上下文使用率中等，可考虑执行 /compact',
      }
    }

    // Low: Just a note
    if (usagePercent >= lowThreshold) {
      return {
        canProceed: true,
        level: 'low',
        usagePercent,
      }
    }

    // None: All good
    return {
      canProceed: true,
      level: 'none',
      usagePercent,
    }
  }

  /**
   * Save current state for recovery
   */
  private saveState(
    analysis: ContextWindowAnalysis,
    reason: string,
  ): string | undefined {
    try {
      const stateDir = join(process.cwd(), this.options.stateSaveDir)

      if (!existsSync(stateDir)) {
        mkdirSync(stateDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `context-state-${reason}-${timestamp}.json`
      const filepath = join(stateDir, filename)

      const state = {
        timestamp: new Date().toISOString(),
        reason,
        analysis: {
          contextWindow: analysis.contextWindow,
          toolDescriptionSize: analysis.toolDescriptionSize,
          percentageUsed: analysis.percentageUsed,
          threshold: analysis.threshold,
          shouldDefer: analysis.shouldDefer,
        },
        serviceBreakdown: analysis.serviceBreakdown,
        checkCount: this.checkCount,
      }

      writeFileSync(filepath, JSON.stringify(state, null, 2))

      if (this.options.verbose) {
        console.log(`💾 状态已保存到: ${filepath}`)
      }

      return filepath
    }
    catch (error) {
      if (this.options.verbose) {
        console.error('保存状态失败:', error)
      }
      return undefined
    }
  }

  /**
   * Log check result to console
   */
  private logResult(result: ContextCheckResult): void {
    const { level, usagePercent, suggestion, stateSaved, statePath } = result

    // Format usage bar
    const barLength = 20
    const filledLength = Math.round((usagePercent / 100) * barLength)
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength)

    switch (level) {
      case 'critical':
        console.log('')
        console.log('🚨 上下文使用率过高！')
        console.log(`   [${bar}] ${usagePercent.toFixed(1)}%`)
        console.log('')
        console.log(`   ${suggestion}`)
        if (stateSaved) {
          console.log(`   💾 状态已自动保存到: ${statePath}`)
        }
        console.log('')
        break

      case 'high':
        console.log('')
        console.log('⚠️ 上下文使用率较高')
        console.log(`   [${bar}] ${usagePercent.toFixed(1)}%`)
        console.log(`   ${suggestion}`)
        if (stateSaved) {
          console.log(`   💾 状态已自动保存`)
        }
        console.log('')
        break

      case 'medium':
        if (this.options.verbose) {
          console.log(`💡 上下文: [${bar}] ${usagePercent.toFixed(1)}% - ${suggestion}`)
        }
        break

      case 'low':
        if (this.options.verbose) {
          console.log(`📊 上下文: [${bar}] ${usagePercent.toFixed(1)}%`)
        }
        break

      case 'none':
        // Silent when usage is low
        break
    }
  }

  /**
   * Get last check result
   */
  getLastCheck(): ContextCheckResult | null {
    return this.lastCheck
  }

  /**
   * Get check count
   */
  getCheckCount(): number {
    return this.checkCount
  }

  /**
   * Reset checker state
   */
  reset(): void {
    this.lastCheck = null
    this.checkCount = 0
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Global context checker instance
 */
let globalChecker: ContextChecker | null = null

/**
 * Get or create global context checker
 */
export function getContextChecker(options?: ContextCheckerOptions): ContextChecker {
  if (!globalChecker) {
    globalChecker = new ContextChecker(options)
  }
  return globalChecker
}

/**
 * Quick context check before execution
 *
 * @param mcpServers - MCP server configuration
 * @param model - Model being used
 * @returns Check result
 */
export async function checkContextBeforeExecution(
  mcpServers?: Record<string, any>,
  model?: string,
): Promise<ContextCheckResult> {
  const checker = getContextChecker()
  return checker.check(mcpServers, model)
}

/**
 * Check and throw if context is critical
 *
 * @param mcpServers - MCP server configuration
 * @param model - Model being used
 * @throws Error if context usage is critical
 */
export async function ensureContextAvailable(
  mcpServers?: Record<string, any>,
  model?: string,
): Promise<void> {
  const result = await checkContextBeforeExecution(mcpServers, model)

  if (!result.canProceed) {
    throw new Error(
      `上下文使用率过高 (${result.usagePercent.toFixed(1)}%)。\n` +
      `请执行 /compact 清理上下文后重试。\n` +
      (result.statePath ? `状态已保存到: ${result.statePath}` : ''),
    )
  }
}

/**
 * Reset global context checker
 */
export function resetContextChecker(): void {
  if (globalChecker) {
    globalChecker.reset()
    globalChecker = null
  }
}
