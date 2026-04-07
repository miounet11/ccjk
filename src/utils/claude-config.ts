import type { ClaudeConfiguration, McpServerConfig, MyclaudeProviderMode, MyclaudeProviderProfile } from '../types'
import type { ClaudeCodeConfigData, ClaudeCodeProfile } from '../types/claude-code-config'

export interface MyclaudeProviderSyncResult {
  activeProfileId: string
  activeProfile: MyclaudeProviderProfile | null
  profiles: MyclaudeProviderProfile[]
}
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'pathe'
import { ClAUDE_CONFIG_FILE, CLAUDE_DIR, CLAUDE_VSC_CONFIG_FILE, SETTINGS_FILE } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { backupJsonConfig, readJsonConfig, writeJsonConfig } from './json-config'
import { deepClone } from './object-utils'
import { getMcpCommand, isWindows } from './platform'
import { overwriteModelSettings } from './config'
import { ClaudeCodeConfigManager } from './claude-code-config-manager'

export function getMcpConfigPath(): string {
  return ClAUDE_CONFIG_FILE
}

export function readMcpConfig(): ClaudeConfiguration | null {
  return readJsonConfig<ClaudeConfiguration>(ClAUDE_CONFIG_FILE)
}

export function writeMcpConfig(config: ClaudeConfiguration): void {
  writeJsonConfig(ClAUDE_CONFIG_FILE, config)
}

export function backupMcpConfig(): string | null {
  const backupBaseDir = join(CLAUDE_DIR, 'backup')
  return backupJsonConfig(ClAUDE_CONFIG_FILE, backupBaseDir)
}

export function mergeMcpServers(
  existing: ClaudeConfiguration | null,
  newServers: Record<string, McpServerConfig>,
): ClaudeConfiguration {
  const config: ClaudeConfiguration = existing || { mcpServers: {} }

  if (!config.mcpServers) {
    config.mcpServers = {}
  }

  // Merge new servers into existing config
  Object.assign(config.mcpServers, newServers)

  return config
}

/**
 * Replace MCP servers entirely (clean install, no leftover services)
 * Unlike mergeMcpServers, this removes services not in the new set.
 */
export function replaceMcpServers(
  existing: ClaudeConfiguration | null,
  newServers: Record<string, McpServerConfig>,
): ClaudeConfiguration {
  const config: ClaudeConfiguration = existing ? { ...existing } : { mcpServers: {} }
  config.mcpServers = { ...newServers }
  return config
}

function applyPlatformCommand(config: McpServerConfig): void {
  // Only process if command exists (avoid wrapping configs without command, e.g., SSE services)
  if (isWindows() && config.command) {
    const mcpCmd = getMcpCommand(config.command)
    // Only modify if command needs Windows wrapper (cmd /c)
    if (mcpCmd[0] === 'cmd') {
      config.command = mcpCmd[0]
      config.args = [...mcpCmd.slice(1), ...(config.args || [])]
    }
  }
}

export function buildMcpServerConfig(
  baseConfig: McpServerConfig,
  apiKey?: string,
  placeholder: string = 'YOUR_EXA_API_KEY',
  envVarName?: string,
): McpServerConfig {
  // Deep clone the config to avoid mutation
  const config = deepClone(baseConfig)

  // Apply platform-specific command
  applyPlatformCommand(config)

  if (!apiKey) {
    return config
  }

  // New approach: If environment variable name is specified, set it directly
  if (envVarName && config.env) {
    config.env[envVarName] = apiKey
    return config // Return early for env-based configuration
  }

  // Legacy approach: Replace placeholder in args and URL
  if (config.args) {
    config.args = config.args.map((arg: string) => arg.replace(placeholder, apiKey))
  }

  if (config.url) {
    config.url = config.url.replace(placeholder, apiKey)
  }

  return config
}

export function fixWindowsMcpConfig(config: ClaudeConfiguration): ClaudeConfiguration {
  if (!isWindows() || !config.mcpServers) {
    return config
  }

  const fixed = { ...config }

  // Fix each MCP server configuration
  for (const [, serverConfig] of Object.entries(fixed.mcpServers)) {
    if (serverConfig && typeof serverConfig === 'object' && 'command' in serverConfig) {
      applyPlatformCommand(serverConfig)
    }
  }

  return fixed
}

export function addCompletedOnboarding(): void {
  try {
    // Read existing config or create new one
    let config = readMcpConfig()
    if (!config) {
      config = { mcpServers: {} }
    }

    // Check if already set to avoid redundant operations
    if (config.hasCompletedOnboarding === true) {
      return // Already set, no need to update
    }

    // Add hasCompletedOnboarding flag
    config.hasCompletedOnboarding = true

    // Write updated config
    writeMcpConfig(config)
  }
  catch (error) {
    console.error('Failed to add onboarding flag', error)
    throw error
  }
}

/**
 * Ensures that an API key is in the approved list and not in the rejected list
 * @param config - Claude configuration object
 * @param apiKey - The API key to manage
 * @returns Updated configuration with API key properly approved
 */
export function ensureApiKeyApproved(config: ClaudeConfiguration, apiKey: string): ClaudeConfiguration {
  // Handle invalid inputs gracefully
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return config
  }

  // Truncate API key to maximum 20 characters for storage in customApiKeyResponses
  const truncatedApiKey = apiKey.substring(0, 20)

  const updatedConfig = { ...config }

  // Initialize customApiKeyResponses if it doesn't exist
  if (!updatedConfig.customApiKeyResponses) {
    updatedConfig.customApiKeyResponses = {
      approved: [],
      rejected: [],
    }
  }

  // Ensure approved and rejected arrays exist
  if (!Array.isArray(updatedConfig.customApiKeyResponses.approved)) {
    updatedConfig.customApiKeyResponses.approved = []
  }
  if (!Array.isArray(updatedConfig.customApiKeyResponses.rejected)) {
    updatedConfig.customApiKeyResponses.rejected = []
  }

  // Remove from rejected list if present
  const rejectedIndex = updatedConfig.customApiKeyResponses.rejected.indexOf(truncatedApiKey)
  if (rejectedIndex > -1) {
    updatedConfig.customApiKeyResponses.rejected.splice(rejectedIndex, 1)
  }

  // Add to approved list if not already present
  if (!updatedConfig.customApiKeyResponses.approved.includes(truncatedApiKey)) {
    updatedConfig.customApiKeyResponses.approved.push(truncatedApiKey)
  }

  return updatedConfig
}

/**
 * Removes an API key from the rejected list
 * @param config - Claude configuration object
 * @param apiKey - The API key to remove from rejected list
 * @returns Updated configuration with API key removed from rejected list
 */
export function removeApiKeyFromRejected(config: ClaudeConfiguration, apiKey: string): ClaudeConfiguration {
  // Handle missing customApiKeyResponses
  if (!config.customApiKeyResponses || !Array.isArray(config.customApiKeyResponses.rejected)) {
    return config
  }

  // Truncate API key to maximum 20 characters for storage in customApiKeyResponses
  const truncatedApiKey = apiKey.substring(0, 20)

  const updatedConfig = { ...config }

  // Ensure customApiKeyResponses exists after spreading
  if (updatedConfig.customApiKeyResponses) {
    const rejectedIndex = updatedConfig.customApiKeyResponses.rejected.indexOf(truncatedApiKey)

    if (rejectedIndex > -1) {
      updatedConfig.customApiKeyResponses.rejected.splice(rejectedIndex, 1)
    }
  }

  return updatedConfig
}

/**
 * Manages API key approval status by reading config, updating it, and writing it back
 * @param apiKey - The API key to ensure is approved (e.g., 'sk-ccjk-x-ccr')
 */
export function manageApiKeyApproval(apiKey: string): void {
  try {
    // Read existing config or create new one
    let config = readMcpConfig()
    if (!config) {
      config = { mcpServers: {} }
    }

    // Ensure the API key is approved
    const updatedConfig = ensureApiKeyApproved(config, apiKey)

    // Write updated config
    writeMcpConfig(updatedConfig)
  }
  catch (error) {
    ensureI18nInitialized()
    console.error(i18n.t('mcp:apiKeyApprovalFailed'), error)
    // Don't throw error to avoid breaking the main flow
    // This is a nice-to-have feature, not critical
  }
}

/**
 * Sets the primaryApiKey field in ~/.claude/config.json (VSCode extension config)
 * This is required for Claude Code 2.0 to properly recognize third-party API configurations
 * and prevent redirecting to official login page
 */
export function setPrimaryApiKey(): void {
  try {
    // Read existing VSCode config or create new one
    let config = readJsonConfig<{ primaryApiKey?: string }>(CLAUDE_VSC_CONFIG_FILE)
    if (!config) {
      config = {}
    }

    // Set primaryApiKey to "ccjk" for third-party API identification
    config.primaryApiKey = 'ccjk'

    // Write updated config to ~/.claude/config.json
    writeJsonConfig(CLAUDE_VSC_CONFIG_FILE, config)
  }
  catch (error) {
    ensureI18nInitialized()
    console.error(i18n.t('mcp:primaryApiKeySetFailed'), error)
    // Don't throw error to avoid breaking the main flow
    // This is important but shouldn't block the configuration process
  }
}

export function setMyclaudeProviderProfiles(profiles: MyclaudeProviderProfile[], activeProfileId?: string): void {
  const config = readMcpConfig() || { mcpServers: {} }
  config.myclaudeProviderProfiles = profiles
  config.myclaudeActiveProviderProfileId = activeProfileId ?? profiles[0]?.id
  writeMcpConfig(config)
}

export function setMyclaudeActiveProviderProfile(activeProfileId?: string): void {
  const config = readMcpConfig() || { mcpServers: {} }
  config.myclaudeActiveProviderProfileId = activeProfileId ?? ''
  writeMcpConfig(config)
}

function detectMyclaudeProviderMode(profile: Pick<MyclaudeProviderProfile, 'authType' | 'baseUrl'>): MyclaudeProviderMode {
  if (profile.authType === 'ccr_proxy') {
    return 'ccr-proxy'
  }
  if (profile.baseUrl) {
    return 'openai-native'
  }
  return 'official'
}

export function describeMyclaudeProviderProfile(profile: Partial<MyclaudeProviderProfile>): Pick<MyclaudeProviderProfile, 'mode' | 'source' | 'sourceDetail' | 'routeFamily' | 'pathLabel' | 'routingStrategy' | 'strategyNote'> {
  const mode = detectMyclaudeProviderMode({
    authType: profile.authType,
    baseUrl: profile.baseUrl,
  })

  const hasAdaptiveRouting = Boolean(profile.defaultHaikuModel || profile.defaultSonnetModel || profile.defaultOpusModel)
  const hasPrimaryModel = Boolean(profile.primaryModel || profile.model)

  const routeFamily = mode === 'ccr-proxy'
    ? 'CCR-proxy'
    : mode === 'openai-native'
      ? 'OpenAI-native'
      : 'Anthropic-native'

  const pathLabel = mode === 'ccr-proxy'
    ? profile.baseUrl ? `Claude-family route through CCR · ${profile.baseUrl}` : 'Claude-family route through CCR'
    : mode === 'openai-native'
      ? profile.baseUrl ? `OpenAI-family route through a compatible gateway · ${profile.baseUrl}` : 'OpenAI-family route through a compatible gateway'
      : 'Official Anthropic route'

  const routingStrategy = hasAdaptiveRouting
    ? 'Custom routing'
    : hasPrimaryModel
      ? 'Single-model override'
      : 'Native runtime default'

  const strategyNote = hasAdaptiveRouting
    ? 'Advanced custom routing. Validate carefully when mixing model families.'
    : hasPrimaryModel
      ? 'Primary model is pinned for the active profile.'
      : 'Runtime follows the official provider defaults.'

  return {
    mode,
    source: 'Imported from ccjk',
    sourceDetail: 'Reusable profile imported from the compatible ccjk configuration.',
    routeFamily,
    pathLabel,
    routingStrategy,
    strategyNote,
  }
}

function toMyclaudeProviderProfile(
  profile: ClaudeCodeProfile,
  existing?: MyclaudeProviderProfile,
): MyclaudeProviderProfile {
  return {
    id: profile.id || existing?.id || profile.name,
    name: profile.name,
    provider: profile.provider || existing?.provider || 'custom',
    apiKey: profile.apiKey,
    baseUrl: profile.baseUrl,
    model: profile.primaryModel,
    fastModel: profile.defaultHaikuModel,
    authType: profile.authType,
    primaryModel: profile.primaryModel,
    defaultHaikuModel: profile.defaultHaikuModel,
    defaultSonnetModel: profile.defaultSonnetModel,
    defaultOpusModel: profile.defaultOpusModel,
    ...describeMyclaudeProviderProfile({
      authType: profile.authType,
      baseUrl: profile.baseUrl,
      model: profile.primaryModel,
      primaryModel: profile.primaryModel,
      defaultHaikuModel: profile.defaultHaikuModel,
      defaultSonnetModel: profile.defaultSonnetModel,
      defaultOpusModel: profile.defaultOpusModel,
    }),
  }
}

function syncMyclaudeActiveProfileToSettings(profile: MyclaudeProviderProfile | null): void {
  const settings = readJsonConfig<Record<string, any>>(SETTINGS_FILE) || {}
  settings.env = settings.env || {}

  if (profile?.authType === 'auth_token') {
    settings.env.ANTHROPIC_AUTH_TOKEN = profile.apiKey
    delete settings.env.ANTHROPIC_API_KEY
  }
  else if (profile?.apiKey) {
    settings.env.ANTHROPIC_API_KEY = profile.apiKey
    delete settings.env.ANTHROPIC_AUTH_TOKEN
  }
  else {
    delete settings.env.ANTHROPIC_API_KEY
    delete settings.env.ANTHROPIC_AUTH_TOKEN
  }

  if (profile?.baseUrl) {
    settings.env.ANTHROPIC_BASE_URL = profile.baseUrl
  }
  else {
    delete settings.env.ANTHROPIC_BASE_URL
  }

  overwriteModelSettings(settings, {
    primaryModel: typeof profile?.primaryModel === 'string' ? profile.primaryModel : typeof profile?.model === 'string' ? profile.model : undefined,
    haikuModel: typeof profile?.defaultHaikuModel === 'string' ? profile.defaultHaikuModel : typeof profile?.fastModel === 'string' ? profile.fastModel : undefined,
    sonnetModel: typeof profile?.defaultSonnetModel === 'string' ? profile.defaultSonnetModel : undefined,
    opusModel: typeof profile?.defaultOpusModel === 'string' ? profile.defaultOpusModel : undefined,
  }, profile ? 'override' : 'reset')

  writeJsonConfig(SETTINGS_FILE, settings)
}

export function syncMyclaudeProviderProfilesFromClaudeConfig(configData: ClaudeCodeConfigData | null): MyclaudeProviderSyncResult {
  if (!configData) {
    clearMyclaudeProviderProfiles()
    return {
      activeProfileId: '',
      activeProfile: null,
      profiles: [],
    }
  }

  const existingProfiles = readMcpConfig()?.myclaudeProviderProfiles || []
  const existingById = new Map(existingProfiles.map(profile => [String(profile.id), profile]))
  const profiles = Object.entries(configData.profiles).map(([id, profile]) => toMyclaudeProviderProfile({ ...profile, id }, existingById.get(id)))
  const activeProfileId = configData.currentProfileId ?? ''
  const activeProfile = profiles.find(profile => profile.id === activeProfileId) || null

  setMyclaudeProviderProfiles(profiles, activeProfileId)
  syncMyclaudeActiveProfileToSettings(activeProfile)

  return {
    activeProfileId,
    activeProfile,
    profiles,
  }
}

export function syncMyclaudeProviderProfilesFromCurrentClaudeConfig(): MyclaudeProviderSyncResult {
  const configData = ClaudeCodeConfigManager.readConfig()
  return syncMyclaudeProviderProfilesFromClaudeConfig(configData)
}

export function clearMyclaudeProviderProfiles(): void {
  const config = readMcpConfig()
  if (config) {
    delete config.myclaudeProviderProfiles
    delete config.myclaudeActiveProviderProfileId
    writeMcpConfig(config)
  }

  syncMyclaudeActiveProfileToSettings(null)
}

export function syncMcpPermissions(): void {
  const mcpConfig = readMcpConfig()
  const mcpServerIds = Object.keys(mcpConfig?.mcpServers || {})

  const settingsPath = join(CLAUDE_DIR, 'settings.json')
  if (!existsSync(settingsPath))
    return

  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
    if (!settings.permissions?.allow)
      return

    // Remove stale mcp__ permissions
    const nonMcpPerms = settings.permissions.allow.filter(
      (p: string) => !p.startsWith('mcp__'),
    )
    // Add current MCP permissions
    const mcpPerms = mcpServerIds.map(id => `mcp__${id}`)
    settings.permissions.allow = [...nonMcpPerms, ...mcpPerms]

    // Use atomic write to prevent corruption and race conditions
    writeJsonConfig(settingsPath, settings)
  }
  catch {}
}
