/**
 * Claude Code Configuration Manager
 *
 * Manages ~/.claude/settings.json - Claude Code's native configuration
 * This replaces and enhances functionality from config.ts
 */

import type { ClaudeSettings } from '../../types/config'
import type { ConfigWriteOptions } from './types'

import { join } from 'pathe'
import { CLAUDE_DIR, SETTINGS_FILE } from '../../constants'
import { ensureDir, exists } from '../../utils/fs-operations'
import { readJsonConfig, writeJsonConfig } from '../../utils/json-config'
import { deepMerge } from '../../utils/object-utils'

/**
 * Read Claude Code settings.json configuration
 */
export function readClaudeConfig(configPath: string = SETTINGS_FILE): ClaudeSettings | null {
  try {
    if (!exists(configPath)) {
      return null
    }

    return readJsonConfig<ClaudeSettings>(configPath) || null
  }
  catch (error) {
    console.error(`Failed to read Claude config from ${configPath}:`, error)
    return null
  }
}

/**
 * Write Claude Code settings.json configuration
 */
export function writeClaudeConfig(
  config: ClaudeSettings,
  options: ConfigWriteOptions = {},
  configPath: string = SETTINGS_FILE,
): void {
  try {
    // Ensure directory exists
    ensureDir(CLAUDE_DIR)

    // Write with atomic operation by default
    writeJsonConfig(configPath, config, {
      atomic: options.atomic !== false,
      pretty: true,
      backup: options.backup,
    })
  }
  catch (error) {
    console.error(`Failed to write Claude config to ${configPath}:`, error)
    throw new Error(`Failed to write Claude config: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Update Claude Code configuration with partial changes
 * Performs deep merge to preserve existing settings
 */
export function updateClaudeConfig(
  updates: Partial<ClaudeSettings>,
  options: ConfigWriteOptions = {},
  configPath: string = SETTINGS_FILE,
): ClaudeSettings {
  const existingConfig = readClaudeConfig(configPath) || {}

  // Deep merge to preserve nested structures
  const mergedConfig = deepMerge(existingConfig, updates, {
    mergeArrays: options.merge === 'preserve',
    arrayMergeStrategy: 'unique',
  })

  writeClaudeConfig(mergedConfig, options, configPath)
  return mergedConfig
}

/**
 * Get or create Claude Code configuration
 */
export function getClaudeConfig(configPath: string = SETTINGS_FILE): ClaudeSettings {
  const config = readClaudeConfig(configPath)
  return config || {}
}

/**
 * Validate Claude Code configuration
 */
export function validateClaudeConfig(config: unknown): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Configuration must be an object'] }
  }

  const cfg = config as Partial<ClaudeSettings>

  // Validate model if specified
  if (cfg.model !== undefined) {
    const validModels = ['opus', 'sonnet', 'sonnet[1m]', 'default', 'custom']
    if (!validModels.includes(cfg.model)) {
      errors.push(`Invalid model: ${cfg.model}`)
    }
  }

  // Validate env section if present
  if (cfg.env !== undefined) {
    if (typeof cfg.env !== 'object' || Array.isArray(cfg.env)) {
      errors.push('env must be an object')
    }
  }

  // Validate permissions if present
  if (cfg.permissions !== undefined) {
    if (typeof cfg.permissions !== 'object') {
      errors.push('permissions must be an object')
    }
    else {
      if (cfg.permissions.allow !== undefined && !Array.isArray(cfg.permissions.allow)) {
        errors.push('permissions.allow must be an array')
      }
      if (cfg.permissions.deny !== undefined && !Array.isArray(cfg.permissions.deny)) {
        errors.push('permissions.deny must be an array')
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get API configuration from Claude settings
 */
export function getApiConfig(): { url?: string, key?: string, authType?: 'api_key' | 'auth_token' } | null {
  const config = readClaudeConfig()
  if (!config || !config.env) {
    return null
  }

  const { ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL } = config.env

  if (!ANTHROPIC_BASE_URL && !ANTHROPIC_API_KEY && !ANTHROPIC_AUTH_TOKEN) {
    return null
  }

  let authType: 'api_key' | 'auth_token' | undefined
  let key: string | undefined

  if (ANTHROPIC_AUTH_TOKEN) {
    authType = 'auth_token'
    key = ANTHROPIC_AUTH_TOKEN
  }
  else if (ANTHROPIC_API_KEY) {
    authType = 'api_key'
    key = ANTHROPIC_API_KEY
  }

  return {
    url: ANTHROPIC_BASE_URL,
    key,
    authType,
  }
}

/**
 * Set API configuration in Claude settings
 */
export function setApiConfig(apiConfig: {
  url?: string
  key?: string
  authType?: 'api_key' | 'auth_token'
}): void {
  const updates: Partial<ClaudeSettings> = {
    env: {},
  }

  if (apiConfig.authType === 'api_key' && apiConfig.key) {
    updates.env!.ANTHROPIC_API_KEY = apiConfig.key
    // Remove auth token if switching to API key
    updates.env!.ANTHROPIC_AUTH_TOKEN = undefined
  }
  else if (apiConfig.authType === 'auth_token' && apiConfig.key) {
    updates.env!.ANTHROPIC_AUTH_TOKEN = apiConfig.key
    // Remove API key if switching to auth token
    updates.env!.ANTHROPIC_API_KEY = undefined
  }

  if (apiConfig.url) {
    updates.env!.ANTHROPIC_BASE_URL = apiConfig.url
  }

  updateClaudeConfig(updates)
}

/**
 * Clear API configuration (switch to official login)
 */
export function clearApiConfig(): void {
  const config = readClaudeConfig()
  if (!config || !config.env) {
    return
  }

  delete config.env.ANTHROPIC_BASE_URL
  delete config.env.ANTHROPIC_AUTH_TOKEN
  delete config.env.ANTHROPIC_API_KEY

  writeClaudeConfig(config)
}

/**
 * Get model configuration
 */
export function getModelConfig(): 'opus' | 'sonnet' | 'sonnet[1m]' | 'default' | 'custom' | null {
  const config = readClaudeConfig()
  if (!config) {
    return null
  }

  // Check if using custom model via env vars
  if (config.env?.ANTHROPIC_MODEL
    || config.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL
    || config.env?.ANTHROPIC_DEFAULT_SONNET_MODEL
    || config.env?.ANTHROPIC_DEFAULT_OPUS_MODEL) {
    return 'custom'
  }

  // Check model field
  if (!config.model) {
    return 'default'
  }

  const validModels: Array<'opus' | 'sonnet' | 'sonnet[1m]'> = ['opus', 'sonnet', 'sonnet[1m]']
  if (validModels.includes(config.model as any)) {
    return config.model as 'opus' | 'sonnet' | 'sonnet[1m]'
  }

  return 'default'
}

/**
 * Set model configuration
 */
export function setModelConfig(
  model: 'opus' | 'sonnet' | 'sonnet[1m]' | 'default' | 'custom',
  customModels?: {
    primaryModel?: string
    defaultHaikuModel?: string
    defaultSonnetModel?: string
    defaultOpusModel?: string
  },
): void {
  const updates: Partial<ClaudeSettings> = {}

  if (model === 'default' || model === 'custom') {
    updates.model = undefined
  }
  else {
    updates.model = model
  }

  updates.env = {}

  if (model === 'custom' && customModels) {
    if (customModels.primaryModel) {
      updates.env.ANTHROPIC_MODEL = customModels.primaryModel
    }
    if (customModels.defaultHaikuModel) {
      updates.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = customModels.defaultHaikuModel
    }
    if (customModels.defaultSonnetModel) {
      updates.env.ANTHROPIC_DEFAULT_SONNET_MODEL = customModels.defaultSonnetModel
    }
    if (customModels.defaultOpusModel) {
      updates.env.ANTHROPIC_DEFAULT_OPUS_MODEL = customModels.defaultOpusModel
    }
  }

  updateClaudeConfig(updates)
}

/**
 * Merge settings from template into existing configuration
 * Preserves user's environment variables and custom settings
 */
export function mergeClaudeSettings(
  templateSettings: ClaudeSettings,
  options: { preserveEnv?: boolean, preservePermissions?: boolean } = {},
  configPath: string = SETTINGS_FILE,
): void {
  const existingSettings = readClaudeConfig(configPath) || {}

  // Special handling for env variables - preserve all user's env vars if requested
  if (options.preserveEnv !== false) {
    const mergedEnv = {
      ...(templateSettings.env || {}),
      ...(existingSettings.env || {}),
    }
    templateSettings.env = mergedEnv
  }

  // Deep merge settings
  const mergedSettings = deepMerge(templateSettings, existingSettings, {
    mergeArrays: true,
    arrayMergeStrategy: 'unique',
  })

  writeClaudeConfig(mergedSettings, {}, configPath)
}

/**
 * Backup Claude Code configuration
 */
export function backupClaudeConfig(configPath: string = SETTINGS_FILE): string | null {
  if (!exists(configPath)) {
    return null
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const backupPath = join(CLAUDE_DIR, 'backup', `settings.backup.${timestamp}.json`)

  try {
    const config = readClaudeConfig(configPath)
    if (config) {
      writeJsonConfig(backupPath, config, { pretty: true })
      return backupPath
    }
  }
  catch {
    // Ignore backup errors
  }

  return null
}

/**
 * Add permission to allow list
 */
export function addAllowedPermission(permission: string): void {
  const config = getClaudeConfig()
  if (!config.permissions) {
    config.permissions = {}
  }
  if (!config.permissions.allow) {
    config.permissions.allow = []
  }
  if (!config.permissions.allow.includes(permission)) {
    config.permissions.allow.push(permission)
    writeClaudeConfig(config)
  }
}

/**
 * Remove permission from allow list
 */
export function removeAllowedPermission(permission: string): void {
  const config = getClaudeConfig()
  if (config.permissions?.allow) {
    config.permissions.allow = config.permissions.allow.filter(p => p !== permission)
    writeClaudeConfig(config)
  }
}

/**
 * Add permission to deny list
 */
export function addDeniedPermission(permission: string): void {
  const config = getClaudeConfig()
  if (!config.permissions) {
    config.permissions = {}
  }
  if (!config.permissions.deny) {
    config.permissions.deny = []
  }
  if (!config.permissions.deny.includes(permission)) {
    config.permissions.deny.push(permission)
    writeClaudeConfig(config)
  }
}

/**
 * Remove permission from deny list
 */
export function removeDeniedPermission(permission: string): void {
  const config = getClaudeConfig()
  if (config.permissions?.deny) {
    config.permissions.deny = config.permissions.deny.filter(p => p !== permission)
    writeClaudeConfig(config)
  }
}

/**
 * Set environment variable in Claude settings
 */
export function setEnvVar(key: string, value: string): void {
  const config = getClaudeConfig()
  if (!config.env) {
    config.env = {}
  }
  config.env[key] = value
  writeClaudeConfig(config)
}

/**
 * Get environment variable from Claude settings
 */
export function getEnvVar(key: string): string | undefined {
  const config = readClaudeConfig()
  return config?.env?.[key]
}

/**
 * Remove environment variable from Claude settings
 */
export function removeEnvVar(key: string): void {
  const config = getClaudeConfig()
  if (config?.env) {
    delete config.env[key]
    writeClaudeConfig(config)
  }
}

/**
 * Ensure Claude config directory exists
 */
export function ensureClaudeConfigDir(): void {
  ensureDir(CLAUDE_DIR)
}
