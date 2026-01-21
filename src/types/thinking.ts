/**
 * Thinking Mode Type Definitions
 *
 * Types for Claude Code CLI 2.0.67+ thinking mode integration.
 * Supports Opus 4.5 with default enablement and budget tokens configuration.
 */

/**
 * Thinking mode settings within Claude Code settings.json
 */
export interface ThinkingModeSettings {
  /**
   * Enable thinking mode for supported models (default: true for Opus 4.5)
   */
  enabled: boolean

  /**
   * Budget tokens for thinking mode (default: 20000)
   * Range: 1000 - 200000
   */
  budgetTokens: number

  /**
   * Inherit thinking mode for sub-agents (default: true)
   * When enabled, sub-agents will use a reduced budget based on subAgentReduction
   */
  inheritForSubAgents: boolean

  /**
   * Reduction factor for sub-agent budget (default: 0.5)
   * Sub-agents get budgetTokens * subAgentReduction tokens
   * Range: 0.1 - 1.0
   */
  subAgentReduction: number

  /**
   * Always use thinking mode, even for simple tasks (default: false)
   * When false, thinking mode is only used for medium and complex tasks
   */
  alwaysUseThinking: boolean
}

/**
 * Complete thinking mode configuration for settings.json
 */
export interface ThinkingModeConfig {
  thinking: ThinkingModeSettings
}

/**
 * Thinking mode task complexity levels
 */
export type ThinkingTaskComplexity = 'simple' | 'medium' | 'complex'

/**
 * Thinking mode status for display
 */
export interface ThinkingModeStatus {
  enabled: boolean
  budgetTokens: number
  inheritForSubAgents: boolean
  subAgentBudget: number
  alwaysUseThinking: boolean
  supportedModels: readonly string[]
  summary: string
}

/**
 * Thinking mode command options
 */
export interface ThinkingCommandOptions {
  lang?: 'zh-CN' | 'en'
  json?: boolean
  verbose?: boolean
}

/**
 * Thinking mode toggle action
 */
export type ThinkingToggleAction = 'enable' | 'disable' | 'toggle' | 'status'

/**
 * Thinking mode budget configuration
 */
export interface ThinkingBudgetConfig {
  tokens: number
  subAgentReduction?: number
}

/**
 * Thinking mode validation result
 */
export interface ThinkingValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Legacy thinking mode settings (for migration)
 */
export interface LegacyThinkingSettings {
  thinkingModeEnabled?: boolean
  thinking_enabled?: boolean
  thinkingBudget?: number
  thinking_budget?: number
}
