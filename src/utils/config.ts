import type { AiOutputLanguage } from '../constants'
import type { ApiConfig, ClaudeSettings } from '../types/config'
import type { ModelEnvKey } from './config.model-keys'
import type { CopyDirOptions } from './fs-operations'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import dayjs from 'dayjs'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { AI_OUTPUT_LANGUAGES, CLAUDE_VSC_CONFIG_FILE, type CodeToolType } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { addCompletedOnboarding, setPrimaryApiKey } from './claude-config'
import { normalizeClaudeFamilySettings } from './claude-settings-normalizer'
import { clearModelEnv, MODEL_ENV_KEYS } from './config.model-keys'
import {
  saveProviderProfile,
  generateProfileId as generateClavueProfileId,
  readClavueJson,
  writeClavueJson,
  listProviderProfiles,
  getActiveProviderProfileId,
  createModelRouting,
} from './clavue-provider-profile'
import {
  copyDir,
  copyFile,
  ensureDir,
  exists,
  writeFile,
} from './fs-operations'
import { readJsonConfig, writeJsonConfig } from './json-config'
import { deepMerge } from './object-utils'
import { mergeAndCleanPermissions } from './permission-cleaner'
import { activeSettingsFile, resolveClaudeFamilySettingsTarget } from './runtime-settings'

export type { ApiConfig } from '../types/config'

export { activeSettingsFile }

export function ensureClaudeDir(codeTool?: CodeToolType): void {
  ensureDir(resolveClaudeFamilySettingsTarget(codeTool).configDir)
}

export function backupExistingConfig(codeTool?: CodeToolType): string | null {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  if (!exists(target.configDir)) {
    return null
  }

  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const backupBaseDir = join(target.configDir, target.runtimeBackupDirName)
  const backupDir = join(backupBaseDir, `backup_${timestamp}`)

  ensureDir(backupDir)

  const filter: CopyDirOptions['filter'] = (path) => {
    return !path.includes('/backup') && !path.includes('/backups')
  }

  copyDir(target.configDir, backupDir, { filter })

  return backupDir
}

export function copyConfigFiles(onlyMd: boolean = false, codeTool?: CodeToolType): void {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  const currentFilePath = fileURLToPath(import.meta.url)
  const distDir = dirname(dirname(currentFilePath))
  const rootDir = dirname(distDir)
  const baseTemplateDir = join(rootDir, 'templates', 'claude-code')

  if (!onlyMd) {
    const baseSettingsPath = join(baseTemplateDir, 'common', 'settings.json')
    if (exists(baseSettingsPath)) {
      mergeSettingsFile(baseSettingsPath, target.settingsFile, target.codeTool)
    }
  }
}

/**
 * Read default settings.json configuration from template directory
 */
function getDefaultSettings(): ClaudeSettings {
  try {
    // Get template directory path
    const currentFilePath = fileURLToPath(import.meta.url)
    const distDir = dirname(dirname(currentFilePath))
    const rootDir = dirname(distDir)
    const templateSettingsPath = join(rootDir, 'templates', 'claude-code', 'common', 'settings.json')

    return readJsonConfig<ClaudeSettings>(templateSettingsPath) || {}
  }
  catch (error) {
    console.error('Failed to read template settings', error)
    return {}
  }
}

export function configureApi(apiConfig: ApiConfig | null, codeTool?: CodeToolType): ApiConfig | null {
  if (!apiConfig)
    return null

  const target = resolveClaudeFamilySettingsTarget(codeTool)

  // Get default configuration from template
  let settings = getDefaultSettings()

  // Merge with existing user configuration if available
  const existingSettings = readJsonConfig<ClaudeSettings>(target.settingsFile)
  if (existingSettings) {
    // Use deepMerge for deep merge, preserving user's custom configuration
    settings = deepMerge(settings, existingSettings)
  }

  // Ensure env object exists
  if (!settings.env) {
    settings.env = {}
  }

  // Update API configuration based on auth type
  if (apiConfig.authType === 'api_key') {
    settings.env.ANTHROPIC_API_KEY = apiConfig.key
    // Remove auth token if switching to API key
    delete settings.env.ANTHROPIC_AUTH_TOKEN
  }
  else if (apiConfig.authType === 'auth_token') {
    settings.env.ANTHROPIC_AUTH_TOKEN = apiConfig.key
    // Remove API key if switching to auth token
    delete settings.env.ANTHROPIC_API_KEY
  }

  // Always update URL if provided
  if (apiConfig.url) {
    settings.env.ANTHROPIC_BASE_URL = apiConfig.url
  }

  normalizeClaudeFamilySettings(settings, { codeTool: target.codeTool })
  writeJsonConfig(target.settingsFile, settings)

  if (apiConfig.authType) {
    try {
      setPrimaryApiKey(target.codeTool)
    }
    catch (error) {
      ensureI18nInitialized()
      console.error(i18n.t('mcp:primaryApiKeySetFailed'), error)
      // Don't fail the API configuration
    }
  }

  // Add hasCompletedOnboarding flag after successful API configuration
  try {
    addCompletedOnboarding(target.codeTool)
  }
  catch (error) {
    // Log error but don't fail the API configuration
    console.error('Failed to set onboarding flag', error)
  }

  // Clavue 9.x: also write provider profile for composite model support
  if (target.codeTool === 'clavue' && apiConfig.url && apiConfig.key) {
    try {
      const profileId = generateClavueProfileId('ccjk-default')
      saveProviderProfile({
        id: profileId,
        name: 'ccjk-default',
        baseUrl: apiConfig.url,
        authType: apiConfig.authType || 'api_key',
        apiKey: apiConfig.key,
        setAsActive: true,
      })
    }
    catch {
      // Non-critical: provider profile write is optional enhancement
    }
  }

  return apiConfig
}

export function mergeConfigs(sourceFile: string, targetFile: string): void {
  if (!exists(sourceFile))
    return

  const target = readJsonConfig<ClaudeSettings>(targetFile) || {}
  const source = readJsonConfig<ClaudeSettings>(sourceFile) || {}

  // Deep merge logic
  const merged = deepMerge(target, source)

  writeJsonConfig(targetFile, merged)
}

/**
 * Update custom model configuration using environment variables
 * @param primaryModel - Primary model name for general tasks
 * @param haikuModel - Default Haiku model (optional)
 * @param sonnetModel - Default Sonnet model (optional)
 * @param opusModel - Default Opus model (optional)
 */
export function updateCustomModel(
  primaryModel?: string,
  haikuModel?: string,
  sonnetModel?: string,
  opusModel?: string,
  codeTool?: CodeToolType,
): void {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  // Skip if both models are empty
  if (!primaryModel?.trim() && !haikuModel?.trim() && !sonnetModel?.trim() && !opusModel?.trim()) {
    return
  }

  let settings = getDefaultSettings()

  const existingSettings = readJsonConfig<ClaudeSettings>(target.settingsFile)
  if (existingSettings) {
    settings = existingSettings
  }

  // Delete model field for custom configuration
  delete settings.model

  // Initialize env object if it doesn't exist
  settings.env = settings.env || {}

  // Clean existing model-related environment variables
  clearModelEnv(settings.env)

  // Set environment variables only if values are provided
  if (primaryModel?.trim()) {
    settings.env.ANTHROPIC_MODEL = primaryModel.trim()
  }
  if (haikuModel?.trim())
    settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = haikuModel.trim()
  if (sonnetModel?.trim())
    settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL = sonnetModel.trim()
  if (opusModel?.trim())
    settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL = opusModel.trim()

  normalizeClaudeFamilySettings(settings, { codeTool: target.codeTool })
  writeJsonConfig(target.settingsFile, settings)

  // Clavue 9.x: update provider profile modelRouting for composite model support
  if (target.codeTool === 'clavue') {
    updateClavueProviderModelRouting(primaryModel, haikuModel, sonnetModel, opusModel)
  }
}

/**
 * Update the active Clavue provider profile's modelRouting slots.
 * Creates a new profile if none exists.
 */
function updateClavueProviderModelRouting(
  primaryModel?: string,
  haikuModel?: string,
  sonnetModel?: string,
  opusModel?: string,
): void {
  try {
    const activeId = getActiveProviderProfileId()
    const profiles = listProviderProfiles()
    const existingProfile = activeId ? profiles.find(p => p.id === activeId) : profiles[0]

    const modelRouting = createModelRouting({
      primaryModel: primaryModel?.trim() || existingProfile?.modelRouting?.primaryModel || '',
      haikuModel: haikuModel?.trim() || existingProfile?.modelRouting?.smallFastModel || '',
      sonnetModel: sonnetModel?.trim() || existingProfile?.modelRouting?.subagentModel || '',
      opusModel: opusModel?.trim() || existingProfile?.modelRouting?.planModel || '',
    })

    if (existingProfile) {
      saveProviderProfile({
        id: existingProfile.id,
        name: existingProfile.name,
        baseUrl: existingProfile.baseUrl,
        authType: existingProfile.authType,
        apiKey: '', // credential already stored, don't overwrite
        modelRouting,
        modelMode: existingProfile.modelMode,
        apiDialectMode: existingProfile.apiDialectMode,
        setAsActive: true,
      })
    }
  }
  catch {
    // Non-critical: modelRouting update is optional enhancement
  }
}

/**
 * Update the default model configuration in settings.json
 * @param model - The model type to set: opus, sonnet, sonnet[1m], default, or custom
 * Note: 'custom' model type is handled differently - it should use environment variables instead
 */
export function updateDefaultModel(
  model: 'opus' | 'sonnet' | 'sonnet[1m]' | 'default' | 'custom',
  codeTool?: CodeToolType,
): void {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  let settings = getDefaultSettings()

  const existingSettings = readJsonConfig<ClaudeSettings>(target.settingsFile)
  if (existingSettings) {
    settings = existingSettings
  }

  // Ensure env object exists
  if (!settings.env) {
    settings.env = {}
  }

  // Clean model-related environment variables unless caller manages custom values
  if (model !== 'custom') {
    clearModelEnv(settings.env)
  }

  if (model === 'default' || model === 'custom') {
    delete settings.model
  }
  else {
    settings.model = model
  }

  normalizeClaudeFamilySettings(settings, { codeTool: target.codeTool })
  writeJsonConfig(target.settingsFile, settings)
}

/**
 * Merge settings.json intelligently
 * Preserves user's environment variables and custom configurations
 */
export function mergeSettingsFile(templatePath: string, targetPath: string, codeTool?: CodeToolType): void {
  try {
    // Read template settings
    const templateSettings = readJsonConfig<ClaudeSettings>(templatePath)
    if (!templateSettings) {
      console.error('Failed to read template settings')
      return
    }

    // If target doesn't exist, just copy template
    if (!exists(targetPath)) {
      writeJsonConfig(targetPath, templateSettings)
      return
    }

    // Read existing settings
    const existingSettings = readJsonConfig<ClaudeSettings>(targetPath) || {}

    // Special handling for env variables - preserve all user's env vars
    const mergedEnv = {
      ...(templateSettings.env || {}), // Template env vars first
      ...(existingSettings.env || {}), // User's env vars override (preserving API keys, etc.)
    }

    // Merge settings with special handling for arrays
    const mergedSettings = deepMerge(templateSettings, existingSettings, {
      mergeArrays: true,
      arrayMergeStrategy: 'unique',
    })

    // Ensure user's env vars are preserved
    mergedSettings.env = mergedEnv

    // Handle permissions.allow array specially to avoid duplicates and clean invalid entries
    if (mergedSettings.permissions && mergedSettings.permissions.allow) {
      mergedSettings.permissions.allow = mergeAndCleanPermissions(
        templateSettings.permissions?.allow,
        existingSettings.permissions?.allow,
      )
    }

    normalizeClaudeFamilySettings(mergedSettings, { codeTool })
    writeJsonConfig(targetPath, mergedSettings)
  }
  catch (error) {
    console.error('Failed to merge settings', error)
    // If merge fails, preserve existing file
    if (exists(targetPath)) {
      console.log('Preserving existing settings')
    }
    else {
      // If no existing file and merge failed, copy template as fallback
      copyFile(templatePath, targetPath)
    }
  }
}

/**
 * Get existing model configuration from settings.json
 */
export function getExistingModelConfig(codeTool?: CodeToolType): 'opus' | 'sonnet' | 'sonnet[1m]' | 'default' | 'custom' | null {
  const settings = readJsonConfig<ClaudeSettings>(activeSettingsFile(codeTool))

  if (!settings) {
    return null
  }

  // Check if using custom model configuration via environment variables
  const hasModelEnv = MODEL_ENV_KEYS.some((key: ModelEnvKey) => settings.env?.[key])
  if (hasModelEnv) {
    return 'custom'
  }

  // If model field doesn't exist, it means using default
  if (!settings.model) {
    return 'default'
  }

  const validModels: Array<'opus' | 'sonnet' | 'sonnet[1m]'> = ['opus', 'sonnet', 'sonnet[1m]']
  if (validModels.includes(settings.model as any)) {
    return settings.model as 'opus' | 'sonnet' | 'sonnet[1m]'
  }

  // Fallback to default if value is invalid
  return 'default'
}

/**
 * Get existing API configuration from settings.json
 */
export function getExistingApiConfig(codeTool?: CodeToolType): ApiConfig | null {
  const settings = readJsonConfig<ClaudeSettings>(activeSettingsFile(codeTool))

  if (!settings || !settings.env) {
    return null
  }

  const { ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL } = settings.env

  // Check if any API configuration exists
  if (!ANTHROPIC_BASE_URL && !ANTHROPIC_API_KEY && !ANTHROPIC_AUTH_TOKEN) {
    return null
  }

  // Determine auth type based on which key is present
  let authType: 'auth_token' | 'api_key' | undefined
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
    url: ANTHROPIC_BASE_URL || '',
    key: key || '',
    authType,
  }
}

export function applyAiLanguageDirective(aiOutputLang: AiOutputLanguage | string, codeTool?: CodeToolType): void {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  const instructionsFile = target.instructionsFile

  // Prepare the language directive
  let directive = ''
  if (aiOutputLang === 'custom') {
    // Custom language will be handled by the caller
    return
  }
  else if (AI_OUTPUT_LANGUAGES[aiOutputLang as AiOutputLanguage]) {
    directive = AI_OUTPUT_LANGUAGES[aiOutputLang as AiOutputLanguage].directive
  }
  else {
    // It's a custom language string
    directive = `Always respond in ${aiOutputLang}`
  }

  ensureDir(target.configDir)
  writeFile(instructionsFile, directive)
}

/**
 * Switch to official login mode - remove all third-party API configurations
 * Removes: ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_API_KEY from settings.json
 * Removes: primaryApiKey from ~/.claude/config.json
 */
export function switchToOfficialLogin(codeTool?: CodeToolType): boolean {
  try {
    ensureI18nInitialized()
    const target = resolveClaudeFamilySettingsTarget(codeTool)

    const settings = readJsonConfig<ClaudeSettings>(target.settingsFile) || {}
    if (settings.env) {
      delete settings.env.ANTHROPIC_BASE_URL
      delete settings.env.ANTHROPIC_AUTH_TOKEN
      delete settings.env.ANTHROPIC_API_KEY
    }
    normalizeClaudeFamilySettings(settings, { codeTool: target.codeTool })
    writeJsonConfig(target.settingsFile, settings)

    if (target.codeTool === 'claude-code') {
      const vscConfig = readJsonConfig<{ primaryApiKey?: string }>(CLAUDE_VSC_CONFIG_FILE)
      if (vscConfig) {
        delete vscConfig.primaryApiKey
        writeJsonConfig(CLAUDE_VSC_CONFIG_FILE, vscConfig)
      }
    }

    // Clavue 9.x: also clear provider profiles when switching to official login
    if (target.codeTool === 'clavue') {
      try {
        const clavueJson = readClavueJson()
        clavueJson.clavueProviderProfiles = []
        clavueJson.activeProviderProfileId = undefined
        writeClavueJson(clavueJson)
      }
      catch {
        // Non-critical cleanup
      }
    }

    console.log(i18n.t('api:officialLoginConfigured'))
    return true
  }
  catch (error) {
    ensureI18nInitialized()
    console.error(i18n.t('api:officialLoginFailed'), error)
    return false
  }
}

/**
 * Prompt user for API configuration action when existing config is found
 * Returns the user's choice for how to handle existing configuration
 */
export async function promptApiConfigurationAction(): Promise<'modify-partial' | 'modify-all' | 'keep-existing' | null> {
  ensureI18nInitialized()

  const existingConfig = getExistingApiConfig()

  // If no existing config, return null
  if (!existingConfig) {
    return null
  }

  // Display existing configuration
  console.log(`\n${ansis.blue(`ℹ ${i18n.t('api:existingApiConfig')}`)}`)
  console.log(ansis.gray(`  ${i18n.t('api:apiConfigUrl')}: ${existingConfig.url || 'N/A'}`))
  console.log(ansis.gray(`  ${i18n.t('api:apiConfigKey')}: ${existingConfig.key ? `***${existingConfig.key.slice(-4)}` : 'N/A'}`))
  console.log(ansis.gray(`  ${i18n.t('api:apiConfigAuthType')}: ${existingConfig.authType || 'N/A'}\n`))

  const { choice } = await inquirer.prompt<{ choice: 'modify-partial' | 'modify-all' | 'keep-existing' | undefined }>({
    type: 'list',
    name: 'choice',
    message: i18n.t('api:selectCustomConfigAction'),
    choices: [
      {
        name: i18n.t('api:modifyPartialConfig'),
        value: 'modify-partial',
      },
      {
        name: i18n.t('api:modifyAllConfig'),
        value: 'modify-all',
      },
      {
        name: i18n.t('api:keepExistingConfig'),
        value: 'keep-existing',
      },
    ],
  })

  return choice || null
}
