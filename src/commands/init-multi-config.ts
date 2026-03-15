/**
 * Init Multi-Configuration Handlers
 * Extracted from init.ts — handles multi-API configuration setup,
 * profile conversion, and provider management.
 */
import type { CodeToolType } from '../constants'
import type { ApiConfigDefinition, ClaudeCodeProfile } from '../types/claude-code-config'
import type { CodexProvider } from '../utils/code-tools/codex'
import ansis from 'ansis'
import { API_DEFAULT_URL } from '../constants'
import { i18n } from '../i18n'
import { displayError } from '../utils/error-formatter'
import type { InitOptions } from './init'

/**
 * Handle multi-configuration API setup
 * @param options - Command line options
 * @param codeToolType - Target code tool type
 */
export async function handleMultiConfigurations(
  options: InitOptions,
  codeToolType: CodeToolType,
): Promise<void> {
  const { ensureI18nInitialized } = await import('../i18n')
  ensureI18nInitialized()

  try {
    let configs: ApiConfigDefinition[] = []

    // Parse API configurations from JSON string
    if (options.apiConfigs) {
      try {
        configs = JSON.parse(options.apiConfigs) as ApiConfigDefinition[]
      }
      catch (error) {
        throw new Error(
          i18n.t('multi-config:invalidJson', {
            error: error instanceof Error ? error.message : String(error),
          }),
        )
      }
    }

    // Parse API configurations from file
    if (options.apiConfigsFile) {
      try {
        const { readFile } = await import('../utils/fs-operations')
        const fileContent = readFile(options.apiConfigsFile)
        configs = JSON.parse(fileContent) as ApiConfigDefinition[]
      }
      catch (error) {
        throw new Error(
          i18n.t('multi-config:fileReadFailed', {
            error: error instanceof Error ? error.message : String(error),
          }),
        )
      }
    }

    // Validate configurations
    await validateApiConfigs(configs)

    // Process configurations based on code tool type
    if (codeToolType === 'claude-code') {
      await handleClaudeCodeConfigs(configs)
    }
    else if (codeToolType === 'codex') {
      await handleCodexConfigs(configs)
    }

    console.log(ansis.green(`✔ ${i18n.t('multi-config:configsAddedSuccessfully')}`))
  }
  catch (error) {
    displayError(error as Error, 'Multi-config setup')
    throw error
  }
}

/**
 * Validate API configurations
 * @param configs - Array of API configurations to validate
 */
export async function validateApiConfigs(configs: ApiConfigDefinition[]): Promise<void> {
  if (!Array.isArray(configs)) {
    throw new TypeError(i18n.t('multi-config:mustBeArray'))
  }

  const { getValidProviderIds } = await import('../config/api-providers')
  const validProviders = [...getValidProviderIds(), 'custom']
  const names = new Set<string>()

  for (const config of configs) {
    // Auto-infer type from provider
    if (config.provider && !config.type) {
      config.type = 'api_key'
    }

    // Auto-generate name from provider
    if (config.provider && !config.name) {
      config.name = config.provider.toUpperCase()
    }

    // Validate provider or type must be present
    if (!config.provider && !config.type) {
      throw new Error(i18n.t('multi-config:providerOrTypeRequired'))
    }

    // Validate provider if specified
    if (config.provider && !validProviders.includes(config.provider)) {
      throw new Error(
        i18n.t('errors:invalidProvider', {
          provider: config.provider,
          validProviders: validProviders.join(', '),
        }),
      )
    }

    // Validate name is present (after auto-generation)
    if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
      throw new Error(i18n.t('multi-config:mustHaveValidName'))
    }

    // Validate type is valid
    if (!['api_key', 'auth_token', 'ccr_proxy'].includes(config.type!)) {
      throw new Error(i18n.t('multi-config:invalidAuthType', { type: config.type }))
    }

    // Validate name uniqueness
    if (names.has(config.name)) {
      throw new Error(i18n.t('multi-config:duplicateName', { name: config.name }))
    }
    names.add(config.name)

    // Validate API key for non-CCR types
    if (config.type !== 'ccr_proxy' && !config.key) {
      throw new Error(i18n.t('multi-config:configApiKeyRequired', { name: config.name }))
    }
  }
}

/**
 * Handle Claude Code API configurations
 * @param configs - Array of API configurations
 */
export async function handleClaudeCodeConfigs(configs: ApiConfigDefinition[]): Promise<void> {
  const { ClaudeCodeConfigManager } = await import('../utils/claude-code-config-manager')
  const addedProfiles: ClaudeCodeProfile[] = []

  for (const config of configs) {
    if (config.type === 'ccr_proxy') {
      throw new Error(i18n.t('multi-config:ccrProxyReserved', { name: config.name }))
    }

    const profile = await convertToClaudeCodeProfile(config)
    const result = await ClaudeCodeConfigManager.addProfile(profile)

    if (!result.success) {
      throw new Error(
        i18n.t('multi-config:configProfileAddFailed', { name: config.name, error: result.error }),
      )
    }

    const storedProfile
      = result.addedProfile || ClaudeCodeConfigManager.getProfileByName(config.name!) || profile
    addedProfiles.push(storedProfile)

    console.log(ansis.green(`✔ ${i18n.t('multi-config:profileAdded', { name: config.name })}`))
  }

  if (addedProfiles.length > 0) {
    const summary = addedProfiles
      .map(profile => `${profile.name} [${profile.authType}]`)
      .join(', ')
    console.log(ansis.gray(`  • ${ClaudeCodeConfigManager.CONFIG_FILE}: ${summary}`))
  }

  // Set default profile if specified
  const defaultConfig = configs.find(c => c.default)
  if (defaultConfig) {
    const profile
      = addedProfiles.find(p => p.name === defaultConfig.name)
        || ClaudeCodeConfigManager.getProfileByName(defaultConfig.name!)
    if (profile && profile.id) {
      await ClaudeCodeConfigManager.switchProfile(profile.id)
      await ClaudeCodeConfigManager.applyProfileSettings(profile)
      console.log(
        ansis.green(`✔ ${i18n.t('multi-config:defaultProfileSet', { name: defaultConfig.name })}`),
      )
    }
  }

  // Sync CCR configuration if needed
  await ClaudeCodeConfigManager.syncCcrProfile()
}

/**
 * Handle Codex API configurations
 * @param configs - Array of API configurations
 */
export async function handleCodexConfigs(configs: ApiConfigDefinition[]): Promise<void> {
  // Import Codex provider management functions
  const { addProviderToExisting } = await import('../utils/code-tools/codex-provider-manager')

  const addedProviderIds: string[] = []
  for (const config of configs) {
    try {
      const provider = await convertToCodexProvider(config)
      const result = await addProviderToExisting(provider, config.key || '')

      if (!result.success) {
        throw new Error(
          i18n.t('multi-config:providerAddFailed', { name: config.name, error: result.error }),
        )
      }

      addedProviderIds.push(provider.id)
      console.log(ansis.green(`✔ ${i18n.t('multi-config:providerAdded', { name: config.name })}`))
    }
    catch (error) {
      console.error(
        ansis.red(
          i18n.t('multi-config:providerAddFailed', {
            name: config.name,
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      )
      throw error
    }
  }

  // Set default provider if specified
  const defaultConfig = configs.find(c => c.default)
  if (defaultConfig) {
    // Import and call Codex provider switching function
    const { switchCodexProvider } = await import('../utils/code-tools/codex')
    const displayName = defaultConfig.name || defaultConfig.provider || 'custom'
    const providerId = displayName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    if (addedProviderIds.includes(providerId)) {
      await switchCodexProvider(providerId)
      console.log(
        ansis.green(`✔ ${i18n.t('multi-config:defaultProviderSet', { name: displayName })}`),
      )
    }
    else {
      console.log(
        ansis.red(
          i18n.t('multi-config:providerAddFailed', {
            name: displayName,
            error: 'provider not added',
          }),
        ),
      )
    }
  }
}

/**
 * Convert API config definition to Claude Code profile
 * @param config - API configuration definition
 */
/**
 * Convert single API configuration to Claude Code profile
 * Used in skip-prompt mode for provider-based or traditional API configurations
 * @param apiConfig - Basic API configuration object
 * @param provider - Optional provider name
 * @param options - Command line options for models
 */
/**
 * Save single API configuration to CCJK TOML config
 * Handles profile creation, switching, and error reporting
 * @param apiConfig - API configuration object
 * @param apiConfig.authType - API authentication type
 * @param apiConfig.key - API key
 * @param apiConfig.url - API URL
 * @param provider - Optional provider name
 * @param options - Command line options for models
 * @param options.apiModel - Primary API model
 * @param options.apiHaikuModel - Default Haiku model
 * @param options.apiSonnetModel - Default Sonnet model
 * @param options.apiOpusModel - Default Opus model
 */
export async function saveSingleConfigToToml(
  apiConfig: { authType: 'api_key' | 'auth_token', key: string, url?: string },
  provider?: string,
  options?: {
    apiModel?: string
    apiHaikuModel?: string
    apiSonnetModel?: string
    apiOpusModel?: string
  },
): Promise<void> {
  try {
    const { ClaudeCodeConfigManager } = await import('../utils/claude-code-config-manager')
    const profile = await convertSingleConfigToProfile(apiConfig, provider, options)
    const result = await ClaudeCodeConfigManager.addProfile(profile)

    if (result.success) {
      const savedProfile
        = result.addedProfile || ClaudeCodeConfigManager.getProfileByName(profile.name) || profile
      // Set as default and apply settings
      if (savedProfile.id) {
        await ClaudeCodeConfigManager.switchProfile(savedProfile.id)
        await ClaudeCodeConfigManager.applyProfileSettings(savedProfile)
      }
      console.log(
        ansis.green(`✔ ${i18n.t('configuration:singleConfigSaved', { name: profile.name })}`),
      )
    }
    else {
      console.warn(
        ansis.yellow(`${i18n.t('configuration:singleConfigSaveFailed')}: ${result.error}`),
      )
    }
  }
  catch (error) {
    console.warn(
      ansis.yellow(
        `${i18n.t('configuration:singleConfigSaveFailed')}: ${error instanceof Error ? error.message : String(error)}`,
      ),
    )
  }
}

export async function buildClaudeCodeProfile(params: {
  name: string
  key: string
  authType: 'api_key' | 'auth_token'
  url?: string
  provider?: string
  primaryModel?: string
  defaultHaikuModel?: string
  defaultSonnetModel?: string
  defaultOpusModel?: string
}): Promise<ClaudeCodeProfile> {
  const { ClaudeCodeConfigManager } = await import('../utils/claude-code-config-manager')

  let {
    url: baseUrl,
    authType,
    primaryModel,
    defaultHaikuModel,
    defaultSonnetModel,
    defaultOpusModel,
  } = params
  baseUrl = baseUrl || API_DEFAULT_URL

  if (params.provider && params.provider !== 'custom') {
    const { getProviderPreset } = await import('../config/api-providers')
    const preset = getProviderPreset(params.provider)

    if (preset?.claudeCode) {
      baseUrl = params.url || preset.claudeCode.baseUrl
      authType = preset.claudeCode.authType
    }
  }

  return {
    name: params.name,
    authType,
    apiKey: params.key,
    baseUrl,
    primaryModel,
    defaultHaikuModel,
    defaultSonnetModel,
    defaultOpusModel,
    id: ClaudeCodeConfigManager.generateProfileId(params.name),
  }
}

export async function convertSingleConfigToProfile(
  apiConfig: { authType: 'api_key' | 'auth_token', key: string, url?: string },
  provider?: string,
  options?: {
    apiModel?: string
    apiHaikuModel?: string
    apiSonnetModel?: string
    apiOpusModel?: string
  },
): Promise<ClaudeCodeProfile> {
  return buildClaudeCodeProfile({
    name: provider && provider !== 'custom' ? provider : 'custom-config',
    key: apiConfig.key,
    authType: apiConfig.authType,
    url: apiConfig.url,
    provider,
    primaryModel: options?.apiModel,
    defaultHaikuModel: options?.apiHaikuModel,
    defaultSonnetModel: options?.apiSonnetModel,
    defaultOpusModel: options?.apiOpusModel,
  })
}

export async function convertToClaudeCodeProfile(config: ApiConfigDefinition): Promise<ClaudeCodeProfile> {
  return buildClaudeCodeProfile({
    name: config.name!,
    key: config.key!,
    authType: (config.type === 'ccr_proxy' ? 'api_key' : config.type) || 'api_key',
    url: config.url,
    provider: config.provider,
    primaryModel: config.primaryModel,
    defaultHaikuModel: config.defaultHaikuModel,
    defaultSonnetModel: config.defaultSonnetModel,
    defaultOpusModel: config.defaultOpusModel,
  })
}

/**
 * Convert API config definition to Codex provider
 * @param config - API configuration definition
 */
export async function convertToCodexProvider(config: ApiConfigDefinition): Promise<CodexProvider> {
  // Apply provider preset if specified
  const displayName = config.name || config.provider || 'custom'
  const providerId = displayName.toLowerCase().replace(/[^a-z0-9]/g, '-')

  let baseUrl = config.url || API_DEFAULT_URL
  let model = config.primaryModel || 'gpt-5-codex'
  let wireApi: 'responses' | 'chat' = 'responses'

  if (config.provider && config.provider !== 'custom') {
    const { getProviderPreset } = await import('../config/api-providers')
    const preset = getProviderPreset(config.provider)

    if (preset?.codex) {
      baseUrl = config.url || preset.codex.baseUrl
      model = config.primaryModel || preset.codex.defaultModel || model
      wireApi = preset.codex.wireApi
    }
  }

  return {
    id: providerId,
    name: displayName,
    baseUrl,
    wireApi,
    tempEnvKey: `${displayName}_API_KEY`.replace(/\W/g, '_').toUpperCase(),
    requiresOpenaiAuth: false,
    model,
  }
}

/**
 * Smart initialization with project analysis and template generation
 * @param options - Init options
 */
