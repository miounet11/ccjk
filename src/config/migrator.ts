/**
 * Configuration migrator for Claude Code CLI 2.0-2.1
 * Handles migration from legacy configurations to new schema
 */

import type { ClaudeSettings, FileSuggestionConfig, ThinkingConfig } from '../types/config'
import { SETTINGS_FILE } from '../constants'
import { exists } from '../utils/fs-operations'
import { readJsonConfig, writeJsonConfig } from '../utils/json-config'
import { deepMerge } from '../utils/object-utils'

/**
 * Migration version for tracking
 */
export const MIGRATION_VERSION = '3.8.0'

/**
 * Legacy configuration interface for migration
 */
interface LegacyClaudeSettings {
  model?: 'opus' | 'sonnet' | 'sonnet[1m]' | 'custom'
  env?: {
    ANTHROPIC_API_KEY?: string
    ANTHROPIC_AUTH_TOKEN?: string
    ANTHROPIC_BASE_URL?: string
    [key: string]: string | undefined
  }
  permissions?: {
    allow?: string[]
  }
  chat?: {
    alwaysApprove?: string[]
  }
  experimental?: {
    [key: string]: any
  }
  statusLine?: {
    type: 'command'
    command: string
    padding?: number
  }
  outputStyle?: string
  mcpServers?: Record<string, any>
  [key: string]: any
}

/**
 * Default values for new Claude Code CLI 2.0-2.1 fields
 */
export const DEFAULT_SETTINGS_V2: Partial<ClaudeSettings> = {
  // Response language - empty means use system default
  language: '',

  // Plans directory - null means use default location
  plansDirectory: null,

  // Show turn duration - default false for cleaner output
  showTurnDuration: false,

  // Respect gitignore - default true for safety
  respectGitignore: true,

  // Auto-enable MCP servers after 5 uses
  auto: {
    mcp: 5,
  },

  // Default agent - empty means use Claude's default
  agent: '',

  // Thinking configuration
  thinking: {
    enabled: false,
    budgetTokens: 10240,
  },

  // File suggestion using git
  fileSuggestion: {
    command: 'git',
  },

  // Security defaults
  allowUnsandboxedCommands: false,
  disallowedTools: [],

  // Attribution - empty means no custom attribution
  attribution: '',

  // Index configuration for context management
  index: {
    maxFiles: 10000,
    maxFileSize: 2097152, // 2MB
  },

  // Browser automation - default false for security
  allowBrowser: false,
}

/**
 * Validate configuration schema
 * Returns validation errors if any
 */
export function validateConfig(config: ClaudeSettings): string[] {
  const errors: string[] = []

  // Validate model if set
  if (config.model && !['opus', 'sonnet', 'sonnet[1m]', 'custom', 'default'].includes(config.model)) {
    errors.push(`Invalid model: ${config.model}`)
  }

  // Validate thinking budget
  if (config.thinking?.budgetTokens !== undefined) {
    if (typeof config.thinking.budgetTokens !== 'number' || config.thinking.budgetTokens < 0) {
      errors.push('thinking.budgetTokens must be a positive number')
    }
  }

  // Validate auto.mcp
  if (config.auto?.mcp !== undefined) {
    if (typeof config.auto.mcp !== 'number' || config.auto.mcp < 0) {
      errors.push('auto.mcp must be a positive number')
    }
  }

  // Validate index.maxFiles
  if (config.index?.maxFiles !== undefined) {
    if (typeof config.index.maxFiles !== 'number' || config.index.maxFiles < 0) {
      errors.push('index.maxFiles must be a positive number')
    }
  }

  // Validate index.maxFileSize
  if (config.index?.maxFileSize !== undefined) {
    if (typeof config.index.maxFileSize !== 'number' || config.index.maxFileSize < 0) {
      errors.push('index.maxFileSize must be a positive number')
    }
  }

  // Validate disallowedTools is an array
  if (config.disallowedTools && !Array.isArray(config.disallowedTools)) {
    errors.push('disallowedTools must be an array')
  }

  return errors
}

/**
 * Migrate legacy configuration to new schema
 * Preserves user settings while adding new defaults
 */
export function migrateConfig(legacy: LegacyClaudeSettings): ClaudeSettings {
  const migrated: ClaudeSettings = { ...legacy }

  // Ensure permissions.deny exists (new in 2.0)
  if (migrated.permissions && !migrated.permissions.deny) {
    migrated.permissions.deny = []
  }

  // Add new fields with defaults if not present
  if (migrated.language === undefined) {
    migrated.language = DEFAULT_SETTINGS_V2.language
  }

  if (migrated.plansDirectory === undefined) {
    migrated.plansDirectory = DEFAULT_SETTINGS_V2.plansDirectory
  }

  if (migrated.showTurnDuration === undefined) {
    migrated.showTurnDuration = DEFAULT_SETTINGS_V2.showTurnDuration
  }

  if (migrated.respectGitignore === undefined) {
    migrated.respectGitignore = DEFAULT_SETTINGS_V2.respectGitignore
  }

  if (migrated.auto === undefined) {
    migrated.auto = { ...DEFAULT_SETTINGS_V2.auto }
  }

  if (migrated.agent === undefined) {
    migrated.agent = DEFAULT_SETTINGS_V2.agent
  }

  if (migrated.thinking === undefined) {
    migrated.thinking = { ...DEFAULT_SETTINGS_V2.thinking as ThinkingConfig }
  }

  if (migrated.fileSuggestion === undefined) {
    migrated.fileSuggestion = { ...DEFAULT_SETTINGS_V2.fileSuggestion as FileSuggestionConfig }
  }

  if (migrated.allowUnsandboxedCommands === undefined) {
    migrated.allowUnsandboxedCommands = DEFAULT_SETTINGS_V2.allowUnsandboxedCommands
  }

  if (migrated.disallowedTools === undefined) {
    migrated.disallowedTools = [...(DEFAULT_SETTINGS_V2.disallowedTools || [])]
  }

  if (migrated.attribution === undefined) {
    migrated.attribution = DEFAULT_SETTINGS_V2.attribution
  }

  if (migrated.index === undefined) {
    migrated.index = { ...DEFAULT_SETTINGS_V2.index }
  }

  if (migrated.allowBrowser === undefined) {
    migrated.allowBrowser = DEFAULT_SETTINGS_V2.allowBrowser
  }

  return migrated
}

/**
 * Read and migrate configuration file
 * Returns migrated config with validation status
 */
export function readMigratedConfig(): {
  config: ClaudeSettings | null
  wasMigrated: boolean
  validationErrors: string[]
} {
  if (!exists(SETTINGS_FILE)) {
    return {
      config: null,
      wasMigrated: false,
      validationErrors: [],
    }
  }

  const config = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
  if (!config) {
    return {
      config: null,
      wasMigrated: false,
      validationErrors: [],
    }
  }

  // Check if migration is needed
  const needsMigration = (
    config.language === undefined
    || config.plansDirectory === undefined
    || config.showTurnDuration === undefined
    || config.respectGitignore === undefined
    || config.auto === undefined
    || config.agent === undefined
    || config.thinking === undefined
    || config.fileSuggestion === undefined
    || config.allowUnsandboxedCommands === undefined
    || config.disallowedTools === undefined
    || config.attribution === undefined
    || config.index === undefined
    || config.allowBrowser === undefined
    || (config.permissions && config.permissions.deny === undefined)
  )

  const migrated = needsMigration ? migrateConfig(config) : config
  const validationErrors = validateConfig(migrated)

  return {
    config: migrated,
    wasMigrated: needsMigration,
    validationErrors,
  }
}

/**
 * Inject default values into configuration
 * Useful for creating new configurations or ensuring all fields exist
 */
export function injectDefaults(config: Partial<ClaudeSettings>): ClaudeSettings {
  return deepMerge(DEFAULT_SETTINGS_V2, config) as ClaudeSettings
}

/**
 * Save configuration with migration
 * Automatically migrates before saving if needed
 */
export function saveConfigWithMigration(config: ClaudeSettings): {
  success: boolean
  validationErrors: string[]
} {
  const validationErrors = validateConfig(config)

  if (validationErrors.length > 0) {
    return {
      success: false,
      validationErrors,
    }
  }

  try {
    writeJsonConfig(SETTINGS_FILE, config)
    return {
      success: true,
      validationErrors: [],
    }
  }
  catch (error) {
    validationErrors.push(`Failed to save config: ${error}`)
    return {
      success: false,
      validationErrors,
    }
  }
}

/**
 * Run migration on existing configuration file
 * Returns migration result
 */
export function runMigration(): {
  success: boolean
  wasMigrated: boolean
  validationErrors: string[]
  backupPath?: string
} {
  const { config, wasMigrated, validationErrors } = readMigratedConfig()

  if (!config) {
    return {
      success: false,
      wasMigrated: false,
      validationErrors: ['No configuration file found'],
    }
  }

  if (!wasMigrated && validationErrors.length === 0) {
    return {
      success: true,
      wasMigrated: false,
      validationErrors: [],
    }
  }

  const result = saveConfigWithMigration(config)

  return {
    success: result.success,
    wasMigrated,
    validationErrors: result.validationErrors,
  }
}

/**
 * Check if configuration needs migration
 */
export function needsMigration(): boolean {
  if (!exists(SETTINGS_FILE)) {
    return false
  }

  const config = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
  if (!config) {
    return false
  }

  return (
    config.language === undefined
    || config.plansDirectory === undefined
    || config.showTurnDuration === undefined
    || config.respectGitignore === undefined
    || config.auto === undefined
    || config.agent === undefined
    || config.thinking === undefined
    || config.fileSuggestion === undefined
    || config.allowUnsandboxedCommands === undefined
    || config.disallowedTools === undefined
    || config.attribution === undefined
    || config.index === undefined
    || config.allowBrowser === undefined
    || (config.permissions && config.permissions.deny === undefined)
  )
}

/**
 * Get migration version info
 */
export function getMigrationInfo(): {
  version: string
  needsMigration: boolean
  configExists: boolean
} {
  return {
    version: MIGRATION_VERSION,
    needsMigration: needsMigration(),
    configExists: exists(SETTINGS_FILE),
  }
}
