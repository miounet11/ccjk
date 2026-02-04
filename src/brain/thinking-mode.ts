/**
 * Thinking Mode - Claude Code CLI 2.0.67+ Integration
 *
 * Manages thinking mode toggle state for Opus 4.5 with default enablement.
 * Supports budget tokens configuration and sub-agent inheritance logic.
 *
 * Context: Claude Code CLI 2.0.67+ introduced thinking mode, enabled by default
 * for Opus 4.5. This module provides CCJK integration for managing this feature.
 *
 * @module brain/thinking-mode
 */

import type { ThinkingModeConfig, ThinkingModeSettings } from '../types/thinking'
import { SETTINGS_FILE } from '../constants'
import { i18n } from '../i18n'
import { readJsonConfig, writeJsonConfig } from '../utils/json-config'

/**
 * Default thinking mode budget tokens for Opus 4.5
 * Claude Code defaults to 20000 tokens for thinking mode
 */
export const DEFAULT_BUDGET_TOKENS = 20000

/**
 * Minimum allowed budget tokens
 */
export const MIN_BUDGET_TOKENS = 1000

/**
 * Maximum allowed budget tokens
 */
export const MAX_BUDGET_TOKENS = 200000

/**
 * Models that support thinking mode (Opus 4.5+)
 */
export const THINKING_SUPPORTED_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-sonnet-20250114',
  'claude-3-7-opus-20250219', // Opus 4.5 - default enabled
  'claude-opus-4',
  'opus-4',
] as const

/**
 * Default thinking mode configuration
 */
export const DEFAULT_THINKING_CONFIG: ThinkingModeSettings = {
  enabled: true,
  budgetTokens: DEFAULT_BUDGET_TOKENS,
  inheritForSubAgents: true,
  subAgentReduction: 0.5, // Sub-agents get 50% of parent budget
  alwaysUseThinking: false, // Only for complex tasks
}

/**
 * Thinking mode state manager
 */
export class ThinkingModeManager {
  private config: ThinkingModeSettings
  private configPath: string

  constructor(configPath: string = SETTINGS_FILE) {
    this.configPath = configPath
    this.config = this.loadConfig()
  }

  /**
   * Load thinking mode configuration from settings.json
   */
  loadConfig(): ThinkingModeSettings {
    const settings = readJsonConfig<any>(this.configPath)
    const thinkingConfig = settings?.thinking || {}

    // Merge with defaults to ensure all fields exist
    return {
      enabled: thinkingConfig.enabled ?? DEFAULT_THINKING_CONFIG.enabled,
      budgetTokens: thinkingConfig.budgetTokens ?? DEFAULT_THINKING_CONFIG.budgetTokens,
      inheritForSubAgents: thinkingConfig.inheritForSubAgents ?? DEFAULT_THINKING_CONFIG.inheritForSubAgents,
      subAgentReduction: thinkingConfig.subAgentReduction ?? DEFAULT_THINKING_CONFIG.subAgentReduction,
      alwaysUseThinking: thinkingConfig.alwaysUseThinking ?? DEFAULT_THINKING_CONFIG.alwaysUseThinking,
    }
  }

  /**
   * Save thinking mode configuration to settings.json
   */
  saveConfig(): void {
    const settings = readJsonConfig<any>(this.configPath) || {}

    // Update thinking section
    settings.thinking = this.config

    writeJsonConfig(this.configPath, settings)
  }

  /**
   * Get current thinking mode configuration
   */
  getConfig(): ThinkingModeSettings {
    return { ...this.config }
  }

  /**
   * Check if thinking mode is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Enable or disable thinking mode
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    this.saveConfig()
  }

  /**
   * Get budget tokens
   */
  getBudgetTokens(): number {
    return this.config.budgetTokens
  }

  /**
   * Set budget tokens with validation
   */
  setBudgetTokens(tokens: number): { success: boolean, error?: string } {
    if (tokens < MIN_BUDGET_TOKENS) {
      return {
        success: false,
        error: `Budget tokens must be at least ${MIN_BUDGET_TOKENS}`,
      }
    }

    if (tokens > MAX_BUDGET_TOKENS) {
      return {
        success: false,
        error: `Budget tokens cannot exceed ${MAX_BUDGET_TOKENS}`,
      }
    }

    this.config.budgetTokens = tokens
    this.saveConfig()

    return { success: true }
  }

  /**
   * Check if sub-agents should inherit thinking mode
   */
  isInheritForSubAgents(): boolean {
    return this.config.inheritForSubAgents
  }

  /**
   * Enable or disable sub-agent inheritance
   */
  setInheritForSubAgents(inherit: boolean): void {
    this.config.inheritForSubAgents = inherit
    this.saveConfig()
  }

  /**
   * Get sub-agent budget reduction factor
   */
  getSubAgentReduction(): number {
    return this.config.subAgentReduction
  }

  /**
   * Set sub-agent budget reduction factor (0.1 - 1.0)
   */
  setSubAgentReduction(reduction: number): { success: boolean, error?: string } {
    if (reduction < 0.1 || reduction > 1.0) {
      return {
        success: false,
        error: 'Reduction factor must be between 0.1 and 1.0',
      }
    }

    this.config.subAgentReduction = reduction
    this.saveConfig()

    return { success: true }
  }

  /**
   * Calculate budget for sub-agent based on reduction factor
   */
  calculateSubAgentBudget(): number {
    return Math.floor(this.config.budgetTokens * this.config.subAgentReduction)
  }

  /**
   * Check if always using thinking mode (even for simple tasks)
   */
  isAlwaysUseThinking(): boolean {
    return this.config.alwaysUseThinking
  }

  /**
   * Set always use thinking mode
   */
  setAlwaysUseThinking(always: boolean): void {
    this.config.alwaysUseThinking = always
    this.saveConfig()
  }

  /**
   * Check if thinking mode is supported for the given model
   */
  isModelSupported(model: string): boolean {
    return THINKING_SUPPORTED_MODELS.some(m => model.includes(m))
  }

  /**
   * Generate thinking mode flags for Claude Code CLI
   */
  generateCliFlags(): string[] {
    if (!this.config.enabled) {
      return []
    }

    const flags: string[] = []

    // Add thinking budget token flag
    flags.push(`--thinking-budget-tokens=${this.config.budgetTokens}`)

    // Add thinking enabled flag
    flags.push('--thinking=true')

    return flags
  }

  /**
   * Get thinking mode status for display
   */
  getStatus(enabledOnly: boolean = false): ThinkingModeStatus {
    const isZh = i18n.language === 'zh-CN'

    return {
      enabled: this.config.enabled,
      budgetTokens: this.config.budgetTokens,
      inheritForSubAgents: this.config.inheritForSubAgents,
      subAgentBudget: this.calculateSubAgentBudget(),
      alwaysUseThinking: this.config.alwaysUseThinking,
      supportedModels: THINKING_SUPPORTED_MODELS,
      summary: this.config.enabled
        ? isZh
          ? `Thinking Mode 已启用 (${this.config.budgetTokens} tokens)`
          : `Thinking Mode enabled (${this.config.budgetTokens} tokens)`
        : isZh
          ? 'Thinking Mode 已禁用'
          : 'Thinking Mode disabled',
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_THINKING_CONFIG }
    this.saveConfig()
  }

  /**
   * Merge configuration with existing settings
   */
  mergeConfig(partial: Partial<ThinkingModeSettings>): void {
    this.config = {
      ...this.config,
      ...partial,
    }
    this.saveConfig()
  }
}

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
 * Global thinking mode manager instance
 */
let globalThinkingManager: ThinkingModeManager | null = null

/**
 * Get or create the global thinking mode manager
 */
export function getThinkingManager(configPath?: string): ThinkingModeManager {
  if (!globalThinkingManager) {
    globalThinkingManager = new ThinkingModeManager(configPath)
  }

  return globalThinkingManager
}

/**
 * Reset the global thinking mode manager (for testing)
 */
export function resetThinkingManager(): void {
  globalThinkingManager = null
}

/**
 * Check if thinking mode should be used for a given task
 * @param taskComplexity - 'simple', 'medium', or 'complex'
 * @param model - The model being used
 */
export function shouldUseThinkingMode(
  taskComplexity: 'simple' | 'medium' | 'complex',
  model?: string,
): boolean {
  const manager = getThinkingManager()

  if (!manager.isEnabled()) {
    return false
  }

  // Check model support if specified
  if (model && !manager.isModelSupported(model)) {
    return false
  }

  // Always use thinking if configured
  if (manager.isAlwaysUseThinking()) {
    return true
  }

  // Use thinking for medium and complex tasks
  return taskComplexity === 'medium' || taskComplexity === 'complex'
}

/**
 * Create thinking mode configuration for Claude Code settings.json
 */
export function createThinkingSettings(
  enabled: boolean = true,
  budgetTokens?: number,
): ThinkingModeConfig {
  return {
    thinking: {
      enabled,
      budgetTokens: budgetTokens || DEFAULT_BUDGET_TOKENS,
      inheritForSubAgents: DEFAULT_THINKING_CONFIG.inheritForSubAgents,
      subAgentReduction: DEFAULT_THINKING_CONFIG.subAgentReduction,
      alwaysUseThinking: DEFAULT_THINKING_CONFIG.alwaysUseThinking,
    },
  }
}

/**
 * Validate thinking mode configuration
 */
export function validateThinkingConfig(
  config: Partial<ThinkingModeSettings>,
): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  if (config.budgetTokens !== undefined) {
    if (config.budgetTokens < MIN_BUDGET_TOKENS) {
      errors.push(`Budget tokens must be at least ${MIN_BUDGET_TOKENS}`)
    }
    if (config.budgetTokens > MAX_BUDGET_TOKENS) {
      errors.push(`Budget tokens cannot exceed ${MAX_BUDGET_TOKENS}`)
    }
  }

  if (config.subAgentReduction !== undefined) {
    if (config.subAgentReduction < 0.1 || config.subAgentReduction > 1.0) {
      errors.push('Sub-agent reduction factor must be between 0.1 and 1.0')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Migrate legacy thinking mode settings to new format
 */
export function migrateLegacySettings(
  settings: any,
): Partial<ThinkingModeSettings> | null {
  // Check for legacy settings
  const legacyEnabled = settings?.thinkingModeEnabled ?? settings?.thinking_enabled
  const legacyBudget = settings?.thinkingBudget ?? settings?.thinking_budget

  if (legacyEnabled === undefined && legacyBudget === undefined) {
    return null
  }

  return {
    enabled: legacyEnabled ?? DEFAULT_THINKING_CONFIG.enabled,
    budgetTokens: legacyBudget ?? DEFAULT_THINKING_CONFIG.budgetTokens,
    inheritForSubAgents: DEFAULT_THINKING_CONFIG.inheritForSubAgents,
    subAgentReduction: DEFAULT_THINKING_CONFIG.subAgentReduction,
    alwaysUseThinking: DEFAULT_THINKING_CONFIG.alwaysUseThinking,
  }
}
