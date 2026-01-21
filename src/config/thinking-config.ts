/**
 * Thinking Mode Configuration Module
 *
 * Provides JSON schema validation, configuration merging logic,
 * and migration from legacy settings for Claude Code CLI 2.0.67+
 * thinking mode integration.
 *
 * @module config/thinking-config
 */

import type { ThinkingModeConfig, ThinkingModeSettings } from '../types/thinking'
import { SETTINGS_FILE } from '../constants'
import { readJsonConfig, writeJsonConfig } from '../utils/json-config'
import { deepMerge } from '../utils/object-utils'

/**
 * JSON Schema for thinking mode configuration
 */
export const THINKING_MODE_SCHEMA = {
  type: 'object',
  properties: {
    thinking: {
      type: 'object',
      description: 'Claude Code CLI 2.0.67+ thinking mode configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable thinking mode for supported models (default: true for Opus 4.5)',
          default: true,
        },
        budgetTokens: {
          type: 'number',
          description: 'Budget tokens for thinking mode (default: 20000)',
          minimum: 1000,
          maximum: 200000,
          default: 20000,
        },
        inheritForSubAgents: {
          type: 'boolean',
          description: 'Inherit thinking mode for sub-agents',
          default: true,
        },
        subAgentReduction: {
          type: 'number',
          description: 'Reduction factor for sub-agent budget (0.1 - 1.0)',
          minimum: 0.1,
          maximum: 1.0,
          default: 0.5,
        },
        alwaysUseThinking: {
          type: 'boolean',
          description: 'Always use thinking mode, even for simple tasks',
          default: false,
        },
      },
      required: ['enabled', 'budgetTokens', 'inheritForSubAgents', 'subAgentReduction', 'alwaysUseThinking'],
    },
  },
} as const

/**
 * Default thinking mode settings
 */
export const DEFAULT_THINKING_SETTINGS: ThinkingModeSettings = {
  enabled: true,
  budgetTokens: 20000,
  inheritForSubAgents: true,
  subAgentReduction: 0.5,
  alwaysUseThinking: false,
}

/**
 * Get thinking mode configuration from settings.json
 */
export function getThinkingModeConfig(): ThinkingModeConfig | null {
  const settings = readJsonConfig<any>(SETTINGS_FILE)

  if (!settings?.thinking) {
    return null
  }

  return {
    thinking: {
      enabled: settings.thinking.enabled ?? DEFAULT_THINKING_SETTINGS.enabled,
      budgetTokens: settings.thinking.budgetTokens ?? DEFAULT_THINKING_SETTINGS.budgetTokens,
      inheritForSubAgents: settings.thinking.inheritForSubAgents ?? DEFAULT_THINKING_SETTINGS.inheritForSubAgents,
      subAgentReduction: settings.thinking.subAgentReduction ?? DEFAULT_THINKING_SETTINGS.subAgentReduction,
      alwaysUseThinking: settings.thinking.alwaysUseThinking ?? DEFAULT_THINKING_SETTINGS.alwaysUseThinking,
    },
  }
}

/**
 * Set thinking mode configuration in settings.json
 */
export function setThinkingModeConfig(config: ThinkingModeConfig): void {
  const settings = readJsonConfig<any>(SETTINGS_FILE) || {}

  // Merge with existing settings
  const merged = deepMerge(settings, config)

  writeJsonConfig(SETTINGS_FILE, merged)
}

/**
 * Update thinking mode settings
 */
export function updateThinkingModeSettings(updates: Partial<ThinkingModeSettings>): void {
  const settings = readJsonConfig<any>(SETTINGS_FILE) || {}

  // Ensure thinking object exists
  if (!settings.thinking) {
    settings.thinking = { ...DEFAULT_THINKING_SETTINGS }
  }

  // Merge updates
  settings.thinking = {
    ...settings.thinking,
    ...updates,
  }

  writeJsonConfig(SETTINGS_FILE, settings)
}

/**
 * Merge thinking mode configuration with existing settings
 * Preserves user customizations while adding new fields
 */
export function mergeThinkingModeConfig(
  templateConfig: ThinkingModeConfig,
  userSettings: any,
): ThinkingModeConfig {
  const userThinking = userSettings?.thinking || {}
  const templateThinking = templateConfig.thinking

  const mergedThinking: ThinkingModeSettings = {
    enabled: userThinking.enabled ?? templateThinking.enabled,
    budgetTokens: userThinking.budgetTokens ?? templateThinking.budgetTokens,
    inheritForSubAgents: userThinking.inheritForSubAgents ?? templateThinking.inheritForSubAgents,
    subAgentReduction: userThinking.subAgentReduction ?? templateThinking.subAgentReduction,
    alwaysUseThinking: userThinking.alwaysUseThinking ?? templateThinking.alwaysUseThinking,
  }

  return {
    thinking: mergedThinking,
  }
}

/**
 * Validate thinking mode configuration against schema
 */
export function validateThinkingModeConfig(
  config: unknown,
): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  if (typeof config !== 'object' || config === null) {
    return {
      valid: false,
      errors: ['Configuration must be an object'],
    }
  }

  const thinking = (config as any).thinking

  if (typeof thinking !== 'object' || thinking === null) {
    return {
      valid: false,
      errors: ['thinking field must be an object'],
    }
  }

  // Validate enabled
  if ('enabled' in thinking && typeof thinking.enabled !== 'boolean') {
    errors.push('thinking.enabled must be a boolean')
  }

  // Validate budgetTokens
  if ('budgetTokens' in thinking) {
    if (typeof thinking.budgetTokens !== 'number') {
      errors.push('thinking.budgetTokens must be a number')
    }
    else if (thinking.budgetTokens < 1000) {
      errors.push('thinking.budgetTokens must be at least 1000')
    }
    else if (thinking.budgetTokens > 200000) {
      errors.push('thinking.budgetTokens cannot exceed 200000')
    }
  }

  // Validate inheritForSubAgents
  if ('inheritForSubAgents' in thinking && typeof thinking.inheritForSubAgents !== 'boolean') {
    errors.push('thinking.inheritForSubAgents must be a boolean')
  }

  // Validate subAgentReduction
  if ('subAgentReduction' in thinking) {
    if (typeof thinking.subAgentReduction !== 'number') {
      errors.push('thinking.subAgentReduction must be a number')
    }
    else if (thinking.subAgentReduction < 0.1 || thinking.subAgentReduction > 1.0) {
      errors.push('thinking.subAgentReduction must be between 0.1 and 1.0')
    }
  }

  // Validate alwaysUseThinking
  if ('alwaysUseThinking' in thinking && typeof thinking.alwaysUseThinking !== 'boolean') {
    errors.push('thinking.alwaysUseThinking must be a boolean')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Migration configuration for legacy thinking mode settings
 */
interface LegacyThinkingSettings {
  thinkingModeEnabled?: boolean
  thinking_enabled?: boolean
  thinkingBudget?: number
  thinking_budget?: number
  thinkingMode?: {
    enabled?: boolean
    budgetTokens?: number
  }
}

/**
 * Migrate legacy thinking mode settings to new format
 */
export function migrateLegacyThinkingSettings(
  legacySettings: LegacyThinkingSettings,
): ThinkingModeSettings {
  return {
    enabled:
      legacySettings.thinkingModeEnabled
      ?? legacySettings.thinking_enabled
      ?? legacySettings.thinkingMode?.enabled
      ?? DEFAULT_THINKING_SETTINGS.enabled,
    budgetTokens:
      legacySettings.thinkingBudget
      ?? legacySettings.thinking_budget
      ?? legacySettings.thinkingMode?.budgetTokens
      ?? DEFAULT_THINKING_SETTINGS.budgetTokens,
    inheritForSubAgents: DEFAULT_THINKING_SETTINGS.inheritForSubAgents,
    subAgentReduction: DEFAULT_THINKING_SETTINGS.subAgentReduction,
    alwaysUseThinking: DEFAULT_THINKING_SETTINGS.alwaysUseThinking,
  }
}

/**
 * Check if settings contain legacy thinking mode configuration
 */
export function hasLegacyThinkingSettings(settings: any): boolean {
  return !!(
    settings?.thinkingModeEnabled
    || settings?.thinking_enabled
    || settings?.thinkingBudget
    || settings?.thinking_budget
    || settings?.thinkingMode
  )
}

/**
 * Apply migration from legacy settings to new format
 */
export function applyThinkingModeMigration(settings: any): void {
  if (!hasLegacyThinkingSettings(settings)) {
    return
  }

  // Extract legacy settings
  const legacy: LegacyThinkingSettings = {
    thinkingModeEnabled: settings.thinkingModeEnabled,
    thinking_enabled: settings.thinking_enabled,
    thinkingBudget: settings.thinkingBudget,
    thinking_budget: settings.thinking_budget,
    thinkingMode: settings.thinkingMode,
  }

  // Migrate to new format
  const newSettings = migrateLegacyThinkingSettings(legacy)

  // Remove legacy keys
  delete settings.thinkingModeEnabled
  delete settings.thinking_enabled
  delete settings.thinkingBudget
  delete settings.thinking_budget
  delete settings.thinkingMode

  // Set new format
  settings.thinking = newSettings

  // Save updated settings
  writeJsonConfig(SETTINGS_FILE, settings)
}

/**
 * Initialize thinking mode configuration with defaults
 */
export function initializeThinkingModeConfig(): void {
  const settings = readJsonConfig<any>(SETTINGS_FILE) || {}

  // Skip if already configured
  if (settings.thinking) {
    return
  }

  // Check for legacy settings and migrate
  if (hasLegacyThinkingSettings(settings)) {
    applyThinkingModeMigration(settings)
    return
  }

  // Initialize with defaults
  settings.thinking = { ...DEFAULT_THINKING_SETTINGS }

  writeJsonConfig(SETTINGS_FILE, settings)
}

/**
 * Export thinking mode configuration for Claude Code CLI
 * Generates the appropriate flags and environment variables
 */
export function exportThinkingModeForCLI(settings?: ThinkingModeSettings): {
  flags: string[]
  env: Record<string, string>
} {
  const config = settings || getThinkingModeConfig()?.thinking || DEFAULT_THINKING_SETTINGS

  const flags: string[] = []
  const env: Record<string, string> = {}

  if (config.enabled) {
    flags.push('--thinking=true')
    flags.push(`--thinking-budget-tokens=${config.budgetTokens}`)
  }

  if (config.alwaysUseThinking) {
    flags.push('--thinking-always=true')
  }

  // Sub-agent inheritance is handled at application level
  // via the config object, not CLI flags

  return { flags, env }
}

/**
 * Calculate effective thinking mode budget
 * Takes into account sub-agent reduction if applicable
 */
export function calculateEffectiveBudget(
  settings: ThinkingModeSettings,
  isSubAgent: boolean = false,
): number {
  if (isSubAgent && settings.inheritForSubAgents) {
    return Math.floor(settings.budgetTokens * settings.subAgentReduction)
  }

  return settings.budgetTokens
}
