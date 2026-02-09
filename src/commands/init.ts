import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import type { McpServerConfig } from '../types'
import type { ApiConfigDefinition, ClaudeCodeProfile } from '../types/claude-code-config'
import type { CodexProvider } from '../utils/code-tools/codex'
import { existsSync } from 'node:fs'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { version } from '../../package.json'
import { getMcpServices, MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { WORKFLOW_CONFIG_BASE } from '../config/workflows'
import { API_DEFAULT_URL, CODE_TOOL_BANNERS, DEFAULT_CODE_TOOL_TYPE, SETTINGS_FILE } from '../constants'
import { i18n } from '../i18n'
import { displayBannerWithInfo, padToDisplayWidth } from '../utils/banner'
import { readZcfConfig, updateZcfConfig } from '../utils/ccjk-config'
import { backupCcrConfig, configureCcrProxy, createDefaultCcrConfig, readCcrConfig, setupCcrConfiguration, writeCcrConfig } from '../utils/ccr/config'
import { installCcr, isCcrInstalled } from '../utils/ccr/installer'
import {
  addCompletedOnboarding,
  backupMcpConfig,
  buildMcpServerConfig,
  fixWindowsMcpConfig,
  mergeMcpServers,
  readMcpConfig,
  setPrimaryApiKey,
  writeMcpConfig,
} from '../utils/claude-config'
import { runCodexFullInit } from '../utils/code-tools/codex'
import { resolveCodeType } from '../utils/code-type-resolver'
import { installCometixLine, isCometixLineInstalled } from '../utils/cometix/installer'
import {
  applyAiLanguageDirective,
  backupExistingConfig,
  configureApi,
  copyConfigFiles,
  ensureClaudeDir,
  getExistingApiConfig,
  promptApiConfigurationAction,
  switchToOfficialLogin,
} from '../utils/config'
import {
  displayMigrationResult,
  migrateSettingsForTokenRetrieval,
  needsMigration,
  promptMigration,
} from '../utils/config-migration'
import { configureApiCompletely, modifyApiConfigPartially } from '../utils/config-operations'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { getInstallationStatus, installClaudeCode } from '../utils/installer'
import { selectMcpServices } from '../utils/mcp-selector'
import { configureOutputStyle } from '../utils/output-style'
import { isTermux, isWindows } from '../utils/platform'
import { addNumbersToChoices } from '../utils/prompt-helpers'
import { resolveAiOutputLanguage } from '../utils/prompts'
import { checkSuperpowersInstalled, installSuperpowers } from '../utils/superpowers/installer'
import { promptBoolean } from '../utils/toggle-prompt'
import { formatApiKeyDisplay } from '../utils/validator'
import { checkClaudeCodeVersionAndPrompt } from '../utils/version-checker'
import { selectAndInstallWorkflows } from '../utils/workflow-installer'

export interface InitOptions {
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  force?: boolean
  skipBanner?: boolean
  skipPrompt?: boolean
  codeType?: CodeToolType | string // Accept abbreviations like 'cc', 'cx'
  smart?: boolean // New: Enable smart generation mode
  yes?: boolean // Skip confirmation prompts
  // Non-interactive parameters
  configAction?: 'new' | 'backup' | 'merge' | 'docs-only' | 'skip'
  apiType?: 'auth_token' | 'api_key' | 'ccr_proxy' | 'skip'
  apiKey?: string // Used for both API key and auth token
  apiUrl?: string
  apiModel?: string // Primary API model (e.g., claude-sonnet-4-5)
  apiHaikuModel?: string // Default Haiku model
  apiSonnetModel?: string // Default Sonnet model
  apiOpusModel?: string // Default Opus model
  provider?: string // API provider preset (302ai, glm, minimax, kimi, custom)
  mcpServices?: string[] | string | boolean
  workflows?: string[] | string | boolean
  outputStyles?: string[] | string | boolean
  defaultOutputStyle?: string
  allLang?: string // New: unified language parameter
  installCometixLine?: string | boolean // New: CCometixLine installation control
  installSuperpowers?: string | boolean // New: Superpowers installation control
  // Multi-configuration parameters
  apiConfigs?: string // JSON string for multiple API configurations
  apiConfigsFile?: string // Path to JSON file with API configurations
}

export async function validateSkipPromptOptions(options: InitOptions): Promise<void> {
  // Apply --all-lang logic first
  if (options.allLang) {
    if (options.allLang === 'zh-CN' || options.allLang === 'en') {
      // Use allLang for config and AI output language parameters
      options.configLang = options.allLang as SupportedLang
      options.aiOutputLang = options.allLang
    }
    else {
      // Use en for config-lang, allLang for ai-output-lang
      options.configLang = 'en'
      options.aiOutputLang = options.allLang
    }
  }

  // Validate and process provider parameter
  if (options.provider) {
    const { getValidProviderIds, getProviderPreset } = await import('../config/api-providers')
    const validProviders = [...getValidProviderIds(), 'custom']

    if (!validProviders.includes(options.provider)) {
      throw new Error(
        i18n.t('errors:invalidProvider', {
          provider: options.provider,
          validProviders: validProviders.join(', '),
        }),
      )
    }

    // Auto-set apiType based on provider preset's authType
    if (!options.apiType) {
      const preset = options.provider !== 'custom' ? getProviderPreset(options.provider) : null
      options.apiType = preset?.claudeCode?.authType || 'api_key'
    }
  }

  // Set defaults
  if (!options.configAction) {
    options.configAction = 'backup'
  }
  // Parse outputStyles parameter
  if (typeof options.outputStyles === 'string') {
    if (options.outputStyles === 'skip') {
      options.outputStyles = false
    }
    else if (options.outputStyles === 'all') {
      options.outputStyles = ['speed-coder', 'senior-architect', 'pair-programmer']
    }
    else {
      options.outputStyles = options.outputStyles.split(',').map(s => s.trim())
    }
  }
  if (options.outputStyles === undefined) {
    options.outputStyles = ['speed-coder', 'senior-architect', 'pair-programmer']
  }

  // Set default output style
  if (!options.defaultOutputStyle) {
    options.defaultOutputStyle = 'senior-architect'
  }
  // Parse installCometixLine parameter
  if (typeof options.installCometixLine === 'string') {
    options.installCometixLine = options.installCometixLine.toLowerCase() === 'true'
  }
  if (options.installCometixLine === undefined) {
    options.installCometixLine = true
  }

  // Parse installSuperpowers parameter
  if (typeof options.installSuperpowers === 'string') {
    options.installSuperpowers = options.installSuperpowers.toLowerCase() === 'true'
  }
  if (options.installSuperpowers === undefined) {
    options.installSuperpowers = false // Default to false (opt-in)
  }

  // Validate configAction
  if (options.configAction && !['new', 'backup', 'merge', 'docs-only', 'skip'].includes(options.configAction)) {
    throw new Error(
      i18n.t('errors:invalidConfigAction', { value: options.configAction }),
    )
  }

  // Validate apiType
  if (options.apiType && !['auth_token', 'api_key', 'ccr_proxy', 'skip'].includes(options.apiType)) {
    throw new Error(
      i18n.t('errors:invalidApiType', { value: options.apiType }),
    )
  }

  // Validate multi-configuration parameters
  if (options.apiConfigs && options.apiConfigsFile) {
    throw new Error(i18n.t('multi-config:conflictingParams'))
  }

  // Validate API model parameters
  const modelParams: Array<[string, unknown]> = [
    ['apiModel', options.apiModel],
    ['apiHaikuModel', options.apiHaikuModel],
    ['apiSonnetModel', options.apiSonnetModel],
    ['apiOpusModel', options.apiOpusModel],
  ]
  for (const [key, value] of modelParams) {
    if (value !== undefined && typeof value !== 'string') {
      if (key === 'apiModel')
        throw new Error(i18n.t('errors:invalidApiModel', { value }))
      throw new Error(i18n.t('errors:invalidModelParam', { key, value }))
    }
  }

  // Validate required API parameters (both use apiKey now)
  if (options.apiType === 'api_key' && !options.apiKey) {
    throw new Error(i18n.t('errors:apiKeyRequiredForApiKey'))
  }

  if (options.apiType === 'auth_token' && !options.apiKey) {
    throw new Error(i18n.t('errors:apiKeyRequiredForAuthToken'))
  }

  // Parse and validate MCP services
  if (typeof options.mcpServices === 'string') {
    if (options.mcpServices === 'skip') {
      options.mcpServices = false
    }
    else if (options.mcpServices === 'all') {
      options.mcpServices = MCP_SERVICE_CONFIGS.filter(s => !s.requiresApiKey).map(s => s.id)
    }
    else {
      options.mcpServices = options.mcpServices.split(',').map(s => s.trim())
    }
  }
  if (Array.isArray(options.mcpServices)) {
    const validServices = MCP_SERVICE_CONFIGS.map(s => s.id)
    for (const service of options.mcpServices) {
      if (!validServices.includes(service)) {
        throw new Error(i18n.t('errors:invalidMcpService', { service, validServices: validServices.join(', ') }))
      }
    }
  }

  // Parse and validate output styles
  if (Array.isArray(options.outputStyles)) {
    const validStyles = ['speed-coder', 'senior-architect', 'pair-programmer', 'default', 'explanatory', 'learning']
    for (const style of options.outputStyles) {
      if (!validStyles.includes(style)) {
        throw new Error(i18n.t('errors:invalidOutputStyle', { style, validStyles: validStyles.join(', ') }))
      }
    }
  }

  // Validate default output style
  if (options.defaultOutputStyle) {
    const validStyles = ['speed-coder', 'senior-architect', 'pair-programmer', 'default', 'explanatory', 'learning']
    if (!validStyles.includes(options.defaultOutputStyle)) {
      throw new Error(i18n.t('errors:invalidDefaultOutputStyle', { style: options.defaultOutputStyle, validStyles: validStyles.join(', ') }))
    }
  }

  // Parse and validate workflows
  if (typeof options.workflows === 'string') {
    if (options.workflows === 'skip') {
      options.workflows = false
    }
    else if (options.workflows === 'all') {
      options.workflows = WORKFLOW_CONFIG_BASE.map(w => w.id)
    }
    else {
      options.workflows = options.workflows.split(',').map(s => s.trim())
    }
  }
  if (Array.isArray(options.workflows)) {
    const validWorkflows = WORKFLOW_CONFIG_BASE.map(w => w.id)
    for (const workflow of options.workflows) {
      if (!validWorkflows.includes(workflow)) {
        throw new Error(i18n.t('errors:invalidWorkflow', { workflow, validWorkflows: validWorkflows.join(', ') }))
      }
    }
  }

  // Set default MCP services (use "all" as explicit default)
  if (options.mcpServices === undefined) {
    options.mcpServices = 'all'
    // Convert "all" to actual service array
    options.mcpServices = MCP_SERVICE_CONFIGS.filter(s => !s.requiresApiKey).map(s => s.id)
  }

  // Set default workflows (use "all" as explicit default)
  if (options.workflows === undefined) {
    options.workflows = 'all'
    // Convert "all" to actual workflow array
    options.workflows = WORKFLOW_CONFIG_BASE.map(w => w.id)
  }
}

/**
 * Simplified one-click initialization
 * Uses smart defaults to minimize user interaction
 * @param options - Init options
 */
export async function simplifiedInit(options: InitOptions = {}): Promise<void> {
  try {
    console.log(ansis.bold.green('\n🚀 CCJK One-Click Installation\n'))

    // Step 1: Detect smart defaults
    const { smartDefaults } = await import('../config/smart-defaults')
    const defaults = await smartDefaults.detect()

    // Step 2: Validate detected defaults
    const validation = smartDefaults.validateDefaults(defaults)
    if (!validation.valid) {
      console.log(ansis.yellow('⚠ Environment issues detected:'))
      validation.issues.forEach((issue) => {
        console.log(ansis.gray(`  • ${issue}`))
      })
      console.log('')
    }

    // Step 3: Configure API provider
    if (!defaults.apiKey && !options.skipPrompt) {
      console.log(ansis.yellow('⚠ No API key detected in environment'))
      console.log('')

      // Show provider selection
      const { showApiConfigMenu } = await import('./api-config-selector')
      const apiResult = await showApiConfigMenu(
        i18n.language === 'zh-CN' ? '🔑 选择 API 配置方式' : '🔑 Select API Configuration',
      )

      if (apiResult.cancelled) {
        console.log(ansis.yellow(i18n.language === 'zh-CN' ? '⚠ 已跳过 API 配置，稍后可通过菜单选项 3 配置' : '⚠ API config skipped, configure later via menu option 3'))
      }
      else if (apiResult.apiKey) {
        defaults.apiKey = apiResult.apiKey
        defaults.apiProvider = apiResult.provider || 'anthropic'
      }
    }

    // Step 4: Set up options with smart defaults
    options.skipPrompt = true
    options.skipBanner = true
    if (defaults.apiKey) {
      options.apiType = 'api_key'
      options.apiKey = defaults.apiKey
      if (defaults.apiProvider && defaults.apiProvider !== 'anthropic') {
        options.provider = defaults.apiProvider
      }
    }
    options.mcpServices = defaults.mcpServices
    options.workflows = defaults.skills.map(skill => skill.replace('ccjk:', '')) // Remove ccjk: prefix
    options.codeType = defaults.codeToolType || 'claude-code'
    options.configAction = 'backup'
    options.installCometixLine = defaults.tools.cometix
    options.installSuperpowers = false
    options.outputStyles = ['senior-architect'] // Use valid output style
    options.defaultOutputStyle = 'senior-architect'

    // Step 5: Display installation summary
    console.log(ansis.gray('📋 Installation Summary:'))
    console.log(ansis.gray(`  • Platform: ${defaults.platform}`))
    console.log(ansis.gray(`  • Code Tool: ${defaults.codeToolType}`))
    console.log(ansis.gray(`  • API Provider: ${defaults.apiProvider}`))
    console.log(ansis.gray(`  • MCP Services: ${defaults.mcpServices.join(', ')}`))
    console.log(ansis.gray(`  • Skills: ${defaults.skills.length} selected`))
    console.log(ansis.gray(`  • Agents: ${defaults.agents.length} selected`))
    console.log('')

    // Step 6: Run full init with smart defaults
    console.log(ansis.gray('🔧 Installing with smart defaults...\n'))

    const startTime = Date.now()
    await init(options)
    const duration = Math.round((Date.now() - startTime) / 1000)

    // Step 7: Success message with timing
    console.log('')
    console.log(ansis.bold.green('✅ Installation Complete!'))
    console.log(ansis.gray(`⏱️  Completed in ${duration} seconds\n`))

    console.log(ansis.bold.cyan('🎯 Quick Start:'))
    console.log(ansis.gray('  1. Open your project directory'))
    console.log(ansis.gray('  2. Run: claude'))
    console.log(ansis.gray('  3. Start coding with AI assistance!\n'))

    console.log(ansis.gray('💡 Advanced Options:'))
    console.log(ansis.gray('  • npx ccjk menu    - Interactive configuration'))
    console.log(ansis.gray('  • npx ccjk update  - Update workflows'))
    console.log(ansis.gray('  • npx ccjk ccr     - Configure proxy'))
    console.log('')
  }
  catch (error) {
    console.error(ansis.red('❌ Installation failed:'), error instanceof Error ? error.message : error)
    throw error
  }
}

/**
 * Handle Superpowers installation
 * @param options - Init options
 */
async function handleSuperpowersInstallation(options: InitOptions): Promise<void> {
  try {
    // Check if already installed
    const status = await checkSuperpowersInstalled()

    if (status.installed) {
      console.log(ansis.green(`✔ ${i18n.t('superpowers:alreadyInstalled')}`))
      if (status.version) {
        console.log(ansis.gray(`  ${i18n.t('superpowers:status.version', { version: status.version })}`))
      }
      if (status.skillCount) {
        console.log(ansis.gray(`  ${i18n.t('superpowers:status.skillCount', { count: status.skillCount })}`))
      }
      return
    }

    // Determine if we should install
    let shouldInstall = false

    if (options.skipPrompt) {
      // Use the installSuperpowers option (default: false)
      shouldInstall = options.installSuperpowers === true
    }
    else {
      // Show interactive prompt with description
      console.log(ansis.green(`\n${i18n.t('superpowers:title')}`))
      console.log(ansis.gray(i18n.t('superpowers:description')))
      console.log(ansis.gray(i18n.t('superpowers:installPromptDescription')))

      shouldInstall = await promptBoolean({
        message: i18n.t('superpowers:installPrompt'),
        defaultValue: false,
      })
    }

    if (!shouldInstall) {
      console.log(ansis.yellow(i18n.t('common:skip')))
      return
    }

    // Install Superpowers
    const result = await installSuperpowers({
      lang: i18n.language as SupportedLang,
      skipPrompt: options.skipPrompt,
    })

    if (result.success) {
      console.log(ansis.green(`✔ ${result.message}`))
    }
    else {
      console.error(ansis.red(`✖ ${result.message}`))
      if (result.error) {
        console.error(ansis.gray(`  ${result.error}`))
      }
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`${i18n.t('superpowers:installFailed')}: ${errorMessage}`))
  }
}

export async function init(options: InitOptions = {}): Promise<void> {
  // Handle smart generation mode
  if (options.smart) {
    return await smartInit(options)
  }

  // Validate options if in skip-prompt mode (outside try-catch to allow errors to propagate in tests)
  if (options.skipPrompt) {
    await validateSkipPromptOptions(options)
  }

  try {
    // Step 2: Read CCJK config once for multiple uses
    const zcfConfig = readZcfConfig()

    // Step 3: Select code tool
    let codeToolType: CodeToolType
    try {
      codeToolType = await resolveCodeType(options.codeType)
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(ansis.red(`${i18n.t('errors:generalError')} ${errorMessage}`))
      // Fallback to default value
      codeToolType = DEFAULT_CODE_TOOL_TYPE
    }
    options.codeType = codeToolType

    // Add the new API configuration mode selection function
    async function selectApiConfigurationMode(): Promise<string> {
      const { apiMode } = await inquirer.prompt<{ apiMode: string }>({
        type: 'list',
        name: 'apiMode',
        message: i18n.t('api:selectApiMode'),
        choices: [
          {
            name: i18n.t('api:useOfficialLogin'),
            value: 'official',
          },
          {
            name: i18n.t('api:customApiConfig'),
            value: 'custom',
          },
          {
            name: i18n.t('api:useCcrProxy'),
            value: 'ccr',
          },
          {
            name: i18n.t('api:skipApi'),
            value: 'skip',
          },
        ],
      })
      return apiMode
    }

    async function handleCustomApiConfiguration(existingConfig: any): Promise<any> {
      // For Claude Code, always use the new incremental configuration management
      if (codeToolType === 'claude-code') {
        const { configureIncrementalManagement } = await import('../utils/claude-code-incremental-manager')
        await configureIncrementalManagement()
        return null
      }

      // For Codex or other tools, keep the existing logic
      if (existingConfig) {
        // Handle existing configuration with smart choices using common function
        const customConfigAction = await promptApiConfigurationAction()

        if (customConfigAction === 'modify-partial') {
          await modifyApiConfigPartially(existingConfig)
          return null // No need to configure again
        }
        else if (customConfigAction === 'modify-all') {
          return await configureApiCompletely()
        }
        else if (customConfigAction === 'keep-existing') {
          try {
            addCompletedOnboarding()
          }
          catch (error) {
            console.error(ansis.red(i18n.t('errors:failedToSetOnboarding')), error)
          }
          // Set primaryApiKey for third-party API (Claude Code 2.0 requirement)
          try {
            setPrimaryApiKey()
          }
          catch (error) {
            const { ensureI18nInitialized, i18n: i18nModule } = await import('../i18n')
            ensureI18nInitialized()
            console.error(i18nModule.t('mcp:primaryApiKeySetFailed'), error)
          }
          return null
        }
      }
      else {
        // No existing config, show standard choices
        const { apiChoice } = await inquirer.prompt<{ apiChoice: string }>({
          type: 'list',
          name: 'apiChoice',
          message: i18n.t('api:configureApi'),
          choices: [
            {
              name: `${i18n.t('api:useAuthToken')} - ${ansis.gray(i18n.t('api:authTokenDesc'))}`,
              value: 'auth_token',
              short: i18n.t('api:useAuthToken'),
            },
            {
              name: `${i18n.t('api:useApiKey')} - ${ansis.gray(i18n.t('api:apiKeyDesc'))}`,
              value: 'api_key',
              short: i18n.t('api:useApiKey'),
            },
          ],
        })

        if (!apiChoice) {
          console.log(ansis.yellow(i18n.t('common:cancelled')))
          process.exit(0)
        }

        return await configureApiCompletely(apiChoice as 'auth_token' | 'api_key')
      }
    }

    // Display banner based on selected code tool
    if (!options.skipBanner) {
      displayBannerWithInfo(CODE_TOOL_BANNERS[codeToolType] || 'CCJK')
    }

    // Show Termux environment info if detected
    if (isTermux()) {
      console.log(ansis.yellow(`\nℹ ${i18n.t('installation:termuxDetected')}`))
      console.log(ansis.gray(i18n.t('installation:termuxEnvironmentInfo')))
    }

    // Step 2.1: Select config language with intelligent detection (skip duplicate prompts for Codex)
    let configLang = options.configLang
    if (codeToolType === 'codex') {
      if (!configLang) {
        if (options.skipPrompt) {
          configLang = zcfConfig?.templateLang || 'en'
        }
        else {
          configLang = zcfConfig?.templateLang || (i18n.language as SupportedLang) || 'en'
        }
      }
    }
    else {
      if (!configLang) {
        const { resolveTemplateLanguage } = await import('../utils/prompts')
        configLang = await resolveTemplateLanguage(
          options.configLang,
          zcfConfig,
          options.skipPrompt,
        )
      }
    }

    if (!configLang) {
      configLang = 'en'
    }

    if (codeToolType === 'codex') {
      if (options.skipPrompt)
        process.env.CCJK_CODEX_SKIP_PROMPT_SINGLE_BACKUP = 'true'

      const hasApiConfigs = Boolean(options.apiConfigs || options.apiConfigsFile)

      // Map InitOptions to CodexFullInitOptions
      const apiMode = hasApiConfigs
        ? 'skip' // Multi-config already handles providers; skip built-in API setup
        : options.apiType === 'auth_token'
          ? 'official'
          : options.apiType === 'api_key'
            ? 'custom'
            : options.apiType === 'skip'
              ? 'skip'
              : options.skipPrompt ? 'skip' : undefined

      const customApiConfig = (!hasApiConfigs && options.apiType === 'api_key' && options.apiKey)
        ? {
            type: 'api_key' as const,
            token: options.apiKey,
            baseUrl: options.apiUrl,
            model: options.apiModel, // Add model parameter for Codex
          }
        : undefined

      // Convert workflows parameter to string array
      let selectedWorkflows: string[] | undefined
      if (Array.isArray(options.workflows)) {
        selectedWorkflows = options.workflows
      }
      else if (typeof options.workflows === 'string') {
        selectedWorkflows = [options.workflows]
      }
      else if (options.workflows === true) {
        selectedWorkflows = [] // Empty array means install all workflows
      }

      // Handle multi-config providers before running full init
      if (hasApiConfigs) {
        await handleMultiConfigurations(options, 'codex')
      }

      const resolvedAiOutputLang = await runCodexFullInit({
        aiOutputLang: options.aiOutputLang,
        skipPrompt: options.skipPrompt,
        apiMode,
        customApiConfig,
        workflows: selectedWorkflows,
      })
      updateZcfConfig({
        version,
        preferredLang: i18n.language as SupportedLang, // CCJK界面语言
        templateLang: configLang, // 模板语言
        aiOutputLang: resolvedAiOutputLang
          ?? options.aiOutputLang
          ?? zcfConfig?.aiOutputLang
          ?? 'en',
        codeToolType,
      })
      console.log(ansis.green(i18n.t('codex:setupComplete')))
      return
    }

    // Step 4: Select AI output language
    const aiOutputLang = await resolveAiOutputLanguage(i18n.language as SupportedLang, options.aiOutputLang, zcfConfig, options.skipPrompt)

    // Step 4: Check and handle Claude Code installation
    const installationStatus = await getInstallationStatus()

    // Handle installations (including none or existing)
    if (installationStatus.hasGlobal) {
      // Global installation exists - verify and ensure symlink
      const { verifyInstallation, displayVerificationResult } = await import('../utils/installer')
      const verification = await verifyInstallation('claude-code')
      if (verification.symlinkCreated) {
        console.log(ansis.green(`✔ ${i18n.t('installation:alreadyInstalled')}`))
        displayVerificationResult(verification, 'claude-code')
      }
      else if (!verification.success) {
        // If verification failed, try to install
        console.log(ansis.yellow(`⚠ ${i18n.t('installation:verificationFailed')}`))
        if (verification.error) {
          console.log(ansis.gray(`  ${verification.error}`))
        }
      }
    }
    else {
      // No installation found - install Claude Code
      if (options.skipPrompt) {
        // In skip-prompt mode, auto-install Claude Code with npm (skip method selection)
        await installClaudeCode(true)
      }
      else {
        const shouldInstall = await promptBoolean({
          message: i18n.t('installation:installPrompt'),
          defaultValue: true,
        })

        if (shouldInstall) {
          // In interactive mode, allow method selection
          await installClaudeCode(false)
        }
        else {
          console.log(ansis.yellow(i18n.t('common:skip')))
        }
      }
    }

    // Step 4.5: Check for Claude Code updates (if any installation exists)
    if (installationStatus.hasGlobal) {
      // Skip version check if Claude Code was just installed (it's already latest)
      await checkClaudeCodeVersionAndPrompt(options.skipPrompt)
    }

    // Step 5: Handle existing config
    ensureClaudeDir()

    // Step 5.1: Check for problematic config and offer migration
    if (existsSync(SETTINGS_FILE) && needsMigration()) {
      if (options.skipPrompt) {
        // Auto-migrate in non-interactive mode
        console.log(ansis.yellow('\n⚠️  Problematic configuration detected. Auto-fixing...\n'))
        const result = migrateSettingsForTokenRetrieval()
        displayMigrationResult(result)
      }
      else {
        // Interactive migration prompt
        const shouldMigrate = await promptMigration()
        if (shouldMigrate) {
          const result = migrateSettingsForTokenRetrieval()
          displayMigrationResult(result)
        }
      }
    }

    let action = 'new' // default action for new installation

    if (existsSync(SETTINGS_FILE) && !options.force) {
      if (options.skipPrompt) {
        // In skip-prompt mode, use configAction option (default: backup)
        action = options.configAction || 'backup'
        if (action === 'skip') {
          console.log(ansis.yellow(i18n.t('common:skip')))
          return
        }
      }
      else {
        const { action: userAction } = await inquirer.prompt<{ action: string }>({
          type: 'list',
          name: 'action',
          message: i18n.t('configuration:existingConfig'),
          choices: addNumbersToChoices([
            { name: i18n.t('configuration:backupAndOverwrite'), value: 'backup' },
            { name: i18n.t('configuration:updateDocsOnly'), value: 'docs-only' },
            { name: i18n.t('configuration:mergeConfig'), value: 'merge' },
            { name: i18n.t('common:skip'), value: 'skip' },
          ]),
        })

        if (!userAction) {
          console.log(ansis.yellow(i18n.t('common:cancelled')))
          process.exit(0)
        }

        action = userAction

        // Handle special cases early
        if (action === 'skip') {
          console.log(ansis.yellow(i18n.t('common:skip')))
          return
        }
      }
    }
    else if (options.skipPrompt && options.configAction) {
      action = options.configAction
    }

    // Step 6: Configure API (skip if only updating docs)
    let apiConfig = null
    const isNewInstall = !existsSync(SETTINGS_FILE)
    if (action !== 'docs-only' && (isNewInstall || ['backup', 'merge', 'new'].includes(action))) {
      // In skip-prompt mode, handle API configuration directly
      if (options.skipPrompt) {
        // Handle multi-configuration parameters (priority over traditional single config)
        if (options.apiConfigs || options.apiConfigsFile) {
          await handleMultiConfigurations(options, codeToolType)
          apiConfig = null // Multi-config handles its own API configuration
        }
        else if (options.provider && options.apiKey) {
          // Handle provider-based configuration
          const { getProviderPreset } = await import('../config/api-providers')
          const preset = options.provider !== 'custom' ? getProviderPreset(options.provider) : null

          apiConfig = {
            authType: preset?.claudeCode?.authType || 'api_key',
            key: options.apiKey,
            url: preset?.claudeCode?.baseUrl || options.apiUrl || API_DEFAULT_URL,
          }

          // Apply provider preset models if available
          if (preset?.claudeCode?.defaultModels && preset.claudeCode.defaultModels.length > 0) {
            const [primary, haiku, sonnet, opus] = preset.claudeCode.defaultModels
            options.apiModel = options.apiModel || primary
            options.apiHaikuModel = options.apiHaikuModel || haiku
            options.apiSonnetModel = options.apiSonnetModel || sonnet
            options.apiOpusModel = options.apiOpusModel || opus
          }

          // Save configuration to CCJK TOML config for persistence and switching
          await saveSingleConfigToToml(apiConfig, options.provider, options)
        }
        else if (options.apiType === 'auth_token' && options.apiKey) {
          apiConfig = {
            authType: 'auth_token' as const,
            key: options.apiKey,
            url: options.apiUrl || API_DEFAULT_URL,
          }

          // Save configuration to CCJK TOML config for persistence and switching
          await saveSingleConfigToToml(apiConfig, undefined, options)
        }
        else if (options.apiType === 'api_key' && options.apiKey) {
          apiConfig = {
            authType: 'api_key' as const,
            key: options.apiKey,
            url: options.apiUrl || API_DEFAULT_URL,
          }

          // Save configuration to CCJK TOML config for persistence and switching
          await saveSingleConfigToToml(apiConfig, undefined, options)
        }
        else if (options.apiType === 'ccr_proxy') {
          // Handle CCR proxy configuration in skip-prompt mode
          const ccrStatus = await isCcrInstalled()
          if (!ccrStatus.hasCorrectPackage) {
            await installCcr()
          }
          else {
            console.log(ansis.green(`✔ ${i18n.t('ccr:ccrAlreadyInstalled')}`))
          }

          // Backup existing CCR config if exists
          const existingCcrConfig = readCcrConfig()
          if (existingCcrConfig) {
            const backupPath = await backupCcrConfig()
            if (backupPath) {
              console.log(ansis.gray(`✔ ${i18n.t('ccr:ccrBackupSuccess')}: ${backupPath}`))
            }
          }

          // Create default skip configuration (empty providers - user configures in UI)
          const defaultCcrConfig = createDefaultCcrConfig()

          // Write CCR config
          writeCcrConfig(defaultCcrConfig)
          console.log(ansis.green(`✔ ${i18n.t('ccr:ccrConfigSuccess')}`))

          // Configure proxy in settings.json
          await configureCcrProxy(defaultCcrConfig)
          console.log(ansis.green(`✔ ${i18n.t('ccr:proxyConfigSuccess')}`))

          // Add onboarding flag
          try {
            addCompletedOnboarding()
          }
          catch (error) {
            console.error(ansis.red(i18n.t('errors:failedToSetOnboarding')), error)
          }

          apiConfig = null // CCR sets up its own proxy config
        }
      }
      else {
        // Check for existing API configuration
        const existingApiConfig = getExistingApiConfig()

        // Use unified API configuration mode selection
        const apiMode = await selectApiConfigurationMode()

        switch (apiMode) {
          case 'official': {
            // Handle official login
            const success = switchToOfficialLogin()
            if (success) {
              console.log(ansis.green(`✔ ${i18n.t('api:officialLoginConfigured')}`))
              apiConfig = null // No need for API config
            }
            else {
              console.log(ansis.red(i18n.t('api:officialLoginFailed')))
            }
            break
          }

          case 'custom':
            // Handle custom API configuration with smart existing config handling
            apiConfig = await handleCustomApiConfiguration(existingApiConfig)
            break

          case 'ccr': {
            // Handle CCR proxy configuration
            const ccrStatus = await isCcrInstalled()
            if (!ccrStatus.hasCorrectPackage) {
              await installCcr()
            }
            else {
              console.log(ansis.green(`✔ ${i18n.t('ccr:ccrAlreadyInstalled')}`))
            }

            // Setup CCR configuration
            const ccrConfigured = await setupCcrConfiguration()
            if (ccrConfigured) {
              console.log(ansis.green(`✔ ${i18n.t('ccr:ccrSetupComplete')}`))
              // CCR configuration already sets up the proxy in settings.json
              // addCompletedOnboarding is already called inside setupCcrConfiguration
              apiConfig = null // No need for traditional API config
            }
            break
          }

          case 'skip':
            // Skip API configuration
            apiConfig = null
            break

          default:
            console.log(ansis.yellow(i18n.t('common:cancelled')))
            process.exit(0)
        }
      }
    }

    // Step 7: Execute the chosen action
    if (['backup', 'docs-only', 'merge'].includes(action)) {
      const backupDir = backupExistingConfig()
      if (backupDir) {
        console.log(ansis.gray(`✔ ${i18n.t('configuration:backupSuccess')}: ${backupDir}`))
      }
    }

    if (action === 'docs-only') {
      // Only copy base config files without agents/commands
      copyConfigFiles(true)
      // Select and install workflows
      if (options.skipPrompt) {
        // Use provided workflows or default to all workflows, skip if false
        if (options.workflows !== false) {
          await selectAndInstallWorkflows(configLang!, options.workflows as string[])
        }
      }
      else {
        await selectAndInstallWorkflows(configLang!)
      }
    }
    else if (['backup', 'merge', 'new'].includes(action)) {
      // Copy all base config files
      copyConfigFiles(false)
      // Select and install workflows
      if (options.skipPrompt) {
        // Use provided workflows or default to all workflows, skip if false
        if (options.workflows !== false) {
          await selectAndInstallWorkflows(configLang!, options.workflows as string[])
        }
      }
      else {
        await selectAndInstallWorkflows(configLang!)
      }
    }

    // Step 8: Apply language directive to CLAUDE.md
    applyAiLanguageDirective(aiOutputLang as AiOutputLanguage | string)
    // Step 8.5: Configure Output Styles
    if (options.skipPrompt) {
      // Use provided output styles and default
      if (options.outputStyles !== false) {
        await configureOutputStyle(
          options.outputStyles as string[],
          options.defaultOutputStyle,
        )
      }
    }
    else {
      await configureOutputStyle()
    }

    // Step 9: Apply API configuration (skip if only updating docs)
    if (apiConfig && action !== 'docs-only') {
      const configuredApi = configureApi(apiConfig as any)
      if (configuredApi) {
        console.log(ansis.green(`✔ ${i18n.t('api:apiConfigSuccess')}`))
        console.log(ansis.gray(`  URL: ${configuredApi.url}`))
        console.log(ansis.gray(`  Key: ${formatApiKeyDisplay(configuredApi.key)}`))
        // addCompletedOnboarding is now called inside configureApi
      }
    }

    // Step 9.5: Configure API models if provided (Claude Code only)
    const hasModelParams = options.apiModel || options.apiHaikuModel || options.apiSonnetModel || options.apiOpusModel
    if (hasModelParams && action !== 'docs-only' && codeToolType === 'claude-code') {
      if (options.skipPrompt) {
        // In skip-prompt mode, configure models
        const { updateCustomModel } = await import('../utils/config')
        updateCustomModel(
          options.apiModel || undefined,
          options.apiHaikuModel || undefined,
          options.apiSonnetModel || undefined,
          options.apiOpusModel || undefined,
        )
        console.log(ansis.green(`✔ ${i18n.t('api:modelConfigSuccess')}`))
        if (options.apiModel) {
          console.log(ansis.gray(`  ${i18n.t('api:primaryModel')}: ${options.apiModel}`))
        }
        if (options.apiHaikuModel)
          console.log(ansis.gray(`  Haiku: ${options.apiHaikuModel}`))
        if (options.apiSonnetModel)
          console.log(ansis.gray(`  Sonnet: ${options.apiSonnetModel}`))
        if (options.apiOpusModel)
          console.log(ansis.gray(`  Opus: ${options.apiOpusModel}`))
      }
    }

    // Step 10: Configure MCP services (skip if only updating docs)
    if (action !== 'docs-only') {
      let shouldConfigureMcp = false

      if (options.skipPrompt) {
        // In skip-prompt mode, configure MCP only if services are not explicitly disabled
        shouldConfigureMcp = options.mcpServices !== false
      }
      else {
        const userChoice = await promptBoolean({
          message: i18n.t('mcp:configureMcp'),
          defaultValue: true,
        })

        shouldConfigureMcp = userChoice
      }

      if (shouldConfigureMcp) {
        // Show Windows-specific notice
        if (isWindows()) {
          console.log(ansis.green(`ℹ ${i18n.t('installation:windowsDetected')}`))
        }

        // Use common MCP selector or skip-prompt services
        let selectedServices: string[] | undefined

        if (options.skipPrompt) {
          selectedServices = options.mcpServices as string[]
        }
        else {
          selectedServices = await selectMcpServices()
          if (selectedServices === undefined) {
            process.exit(0)
          }
        }

        if (selectedServices.length > 0) {
          // Backup existing MCP config if exists
          const mcpBackupPath = backupMcpConfig()
          if (mcpBackupPath) {
            console.log(ansis.gray(`✔ ${i18n.t('mcp:mcpBackupSuccess')}: ${mcpBackupPath}`))
          }

          // Build MCP server configs
          const newServers: Record<string, McpServerConfig> = {}

          for (const serviceId of selectedServices) {
            const services = await getMcpServices()
            const service = services.find(s => s.id === serviceId)
            if (!service)
              continue

            let config = service.config

            // Special handling: serena context differs by code tool
            if (service.id === 'serena' && Array.isArray(config.args)) {
              const adjusted = { ...config, args: [...(config.args || [])] }
              const idx = adjusted.args.indexOf('--context')
              if (idx >= 0 && idx + 1 < adjusted.args.length) {
                adjusted.args[idx + 1] = (codeToolType as CodeToolType === 'codex') ? 'codex' : 'ide-assistant'
              }
              else {
                adjusted.args.push('--context', (codeToolType as CodeToolType === 'codex') ? 'codex' : 'ide-assistant')
              }
              config = adjusted
            }

            // Handle services that require API key
            if (service.requiresApiKey) {
              if (options.skipPrompt) {
                // In skip-prompt mode, skip services that require API keys
                console.log(ansis.yellow(`${i18n.t('common:skip')}: ${service.name} (requires API key)`))
                continue
              }
              else {
                const response = await inquirer.prompt<{ apiKey: string }>({
                  type: 'input',
                  name: 'apiKey',
                  message: service.apiKeyPrompt!,
                  validate: (value: string) => !!value || i18n.t('api:keyRequired'),
                })

                if (!response.apiKey) {
                  console.log(ansis.yellow(`${i18n.t('common:skip')}: ${service.name}`))
                  continue
                }

                config = buildMcpServerConfig(service.config, response.apiKey, service.apiKeyPlaceholder, service.apiKeyEnvVar)
              }
            }

            newServers[service.id] = config
          }

          // Merge with existing config
          const existingConfig = readMcpConfig()
          let mergedConfig = mergeMcpServers(existingConfig, newServers)

          // Fix Windows config if needed
          mergedConfig = fixWindowsMcpConfig(mergedConfig)

          // Write the config with error handling
          try {
            writeMcpConfig(mergedConfig)
            console.log(ansis.green(`✔ ${i18n.t('mcp:mcpConfigSuccess')}`))

            // Check and display performance warning
            const { checkMcpPerformance, formatPerformanceWarning } = await import('../utils/mcp-performance')
            const serviceCount = Object.keys(newServers).length
            const perfWarning = checkMcpPerformance(serviceCount)
            if (perfWarning) {
              console.log('')
              console.log(formatPerformanceWarning(perfWarning, i18n.language as 'en' | 'zh-CN'))
            }
          }
          catch (error) {
            console.error(ansis.red(`${i18n.t('errors:failedToWriteMcpConfig')} ${error}`))
          }
        }
      }
    }

    // Step 11: CCometixLine installation
    const cometixInstalled = await isCometixLineInstalled()
    if (!cometixInstalled) {
      let shouldInstallCometix = false

      if (options.skipPrompt) {
        // Use installCometixLine option or default to true
        shouldInstallCometix = options.installCometixLine !== false
      }
      else {
        const userChoice = await promptBoolean({
          message: i18n.t('cometix:installCometixPrompt'),
          defaultValue: true,
        })

        shouldInstallCometix = userChoice
      }

      if (shouldInstallCometix) {
        await installCometixLine()
      }
      else {
        console.log(ansis.yellow(i18n.t('cometix:cometixSkipped')))
      }
    }
    else {
      console.log(ansis.green(`✔ ${i18n.t('cometix:cometixAlreadyInstalled')}`))
    }

    // Step 11.5: Superpowers installation (optional)
    if (!options.skipPrompt || options.installSuperpowers) {
      await handleSuperpowersInstallation(options)
    }

    // Step 11.6: Smart Guide injection (auto-enable for better UX)
    try {
      const { injectSmartGuide } = await import('../utils/smart-guide')
      const smartGuideSuccess = await injectSmartGuide(configLang as SupportedLang)
      if (smartGuideSuccess) {
        console.log(ansis.green(`✔ ${i18n.t('smartGuide:enabled')}`))
      }
    }
    catch {
      // Silent fail - smart guide is optional
      console.log(ansis.gray(`ℹ ${i18n.t('smartGuide:skipped')}`))
    }

    // Step 12: Save ccjk config
    updateZcfConfig({
      version,
      preferredLang: i18n.language as SupportedLang, // CCJK界面语言
      templateLang: configLang, // 模板语言
      aiOutputLang: aiOutputLang as AiOutputLanguage | string,
      codeToolType,
    })

    // Step 12.1: Ask to import recommended environment variables and permissions (if not skip-prompt)
    if (!options.skipPrompt) {
      const { importRecommendedEnv, importRecommendedPermissions } = await import('../utils/simple-config')
      const confirmImport = await promptBoolean({
        message: i18n.t('configuration:recommendImportEnvPerm') || '导入 CCJK 推荐的环境变量和权限配置？（推荐，可减少权限弹窗）',
        defaultValue: true,
      })

      if (confirmImport) {
        // Import environment variables
        try {
          await importRecommendedEnv()
          console.log(ansis.green(`✔ ${i18n.t('configuration:envImportSuccess')}`))
        }
        catch (error) {
          console.error(ansis.yellow(`⚠ ${i18n.t('configuration:envImportFailed')}: ${error}`))
        }

        // Import permissions
        try {
          await importRecommendedPermissions()
          console.log(ansis.green(`✔ ${i18n.t('configuration:permissionsImportSuccess') || '权限配置已导入'}`))
        }
        catch (error) {
          console.error(ansis.yellow(`⚠ ${i18n.t('configuration:permissionsImportFailed')}: ${error}`))
        }

        console.log() // Add blank line
      }
    }

    // Step 13: Success message with enhanced guidance
    console.log('')
    console.log(ansis.bold.green('╔══════════════════════════════════════════════════════════════╗'))
    console.log(ansis.bold.green('║') + ansis.bold.white(padToDisplayWidth(`  ${i18n.t('configuration:setupCompleteTitle')}`, 62)) + ansis.bold.green('║'))
    console.log(ansis.bold.green('╠══════════════════════════════════════════════════════════════╣'))
    console.log(`${ansis.bold.green('║')}                                                              ${ansis.bold.green('║')}`)
    console.log(ansis.bold.green('║') + ansis.green(padToDisplayWidth(`  ${i18n.t('configuration:nextSteps')}`, 62)) + ansis.bold.green('║'))
    console.log(`${ansis.bold.green('║')}                                                              ${ansis.bold.green('║')}`)
    console.log(ansis.bold.green('║') + padToDisplayWidth(`  ${i18n.t('configuration:guidanceStep1')}`, 62) + ansis.bold.green('║'))
    console.log(ansis.bold.green('║') + ansis.dim(padToDisplayWidth(`     ${i18n.t('configuration:guidanceStep1Detail')}`, 62)) + ansis.bold.green('║'))
    console.log(ansis.bold.green('║') + ansis.dim(padToDisplayWidth(`     ${i18n.t('configuration:guidanceStep1Detail2')}`, 62)) + ansis.bold.green('║'))
    console.log(`${ansis.bold.green('║')}                                                              ${ansis.bold.green('║')}`)
    console.log(ansis.bold.green('║') + padToDisplayWidth(`  ${i18n.t('configuration:guidanceStep2')}`, 62) + ansis.bold.green('║'))
    console.log(ansis.bold.green('║') + ansis.green(padToDisplayWidth(`     ${i18n.t('configuration:guidanceStep2Example')}`, 62)) + ansis.bold.green('║'))
    console.log(`${ansis.bold.green('║')}                                                              ${ansis.bold.green('║')}`)
    console.log(ansis.bold.green('║') + padToDisplayWidth(`  ${i18n.t('configuration:guidanceStep3')} `, 44) + ansis.yellow(padToDisplayWidth(i18n.t('configuration:guidanceStep3Command'), 18)) + ansis.bold.green('║'))
    console.log(ansis.bold.green('║') + padToDisplayWidth(`  ${i18n.t('configuration:guidanceStep4')} `, 44) + ansis.yellow(padToDisplayWidth(i18n.t('configuration:guidanceStep4Command'), 18)) + ansis.bold.green('║'))
    console.log(`${ansis.bold.green('║')}                                                              ${ansis.bold.green('║')}`)
    console.log(ansis.bold.green('╚══════════════════════════════════════════════════════════════╝'))
    console.log('')
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}

/**
 * Handle multi-configuration API setup
 * @param options - Command line options
 * @param codeToolType - Target code tool type
 */
export async function handleMultiConfigurations(options: InitOptions, codeToolType: CodeToolType): Promise<void> {
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
        throw new Error(i18n.t('multi-config:invalidJson', { error: error instanceof Error ? error.message : String(error) }))
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
        throw new Error(i18n.t('multi-config:fileReadFailed', { error: error instanceof Error ? error.message : String(error) }))
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
    console.error(ansis.red(`${i18n.t('multi-config:configsFailed')}: ${error instanceof Error ? error.message : String(error)}`))
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
      throw new Error(i18n.t('errors:invalidProvider', {
        provider: config.provider,
        validProviders: validProviders.join(', '),
      }))
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
async function handleClaudeCodeConfigs(configs: ApiConfigDefinition[]): Promise<void> {
  const { ClaudeCodeConfigManager } = await import('../utils/claude-code-config-manager')
  const addedProfiles: ClaudeCodeProfile[] = []

  for (const config of configs) {
    if (config.type === 'ccr_proxy') {
      throw new Error(i18n.t('multi-config:ccrProxyReserved', { name: config.name }))
    }

    const profile = await convertToClaudeCodeProfile(config)
    const result = await ClaudeCodeConfigManager.addProfile(profile)

    if (!result.success) {
      throw new Error(i18n.t('multi-config:configProfileAddFailed', { name: config.name, error: result.error }))
    }

    const storedProfile = result.addedProfile
      || ClaudeCodeConfigManager.getProfileByName(config.name!)
      || profile
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
    const profile = addedProfiles.find(p => p.name === defaultConfig.name)
      || ClaudeCodeConfigManager.getProfileByName(defaultConfig.name!)
    if (profile && profile.id) {
      await ClaudeCodeConfigManager.switchProfile(profile.id)
      await ClaudeCodeConfigManager.applyProfileSettings(profile)
      console.log(ansis.green(`✔ ${i18n.t('multi-config:defaultProfileSet', { name: defaultConfig.name })}`))
    }
  }

  // Sync CCR configuration if needed
  await ClaudeCodeConfigManager.syncCcrProfile()
}

/**
 * Handle Codex API configurations
 * @param configs - Array of API configurations
 */
async function handleCodexConfigs(configs: ApiConfigDefinition[]): Promise<void> {
  // Import Codex provider management functions
  const { addProviderToExisting } = await import('../utils/code-tools/codex-provider-manager')

  const addedProviderIds: string[] = []
  for (const config of configs) {
    try {
      const provider = await convertToCodexProvider(config)
      const result = await addProviderToExisting(provider, config.key || '')

      if (!result.success) {
        throw new Error(i18n.t('multi-config:providerAddFailed', { name: config.name, error: result.error }))
      }

      addedProviderIds.push(provider.id)
      console.log(ansis.green(`✔ ${i18n.t('multi-config:providerAdded', { name: config.name })}`))
    }
    catch (error) {
      console.error(ansis.red(i18n.t('multi-config:providerAddFailed', {
        name: config.name,
        error: error instanceof Error ? error.message : String(error),
      })))
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
      console.log(ansis.green(`✔ ${i18n.t('multi-config:defaultProviderSet', { name: displayName })}`))
    }
    else {
      console.log(ansis.red(i18n.t('multi-config:providerAddFailed', { name: displayName, error: 'provider not added' })))
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
async function saveSingleConfigToToml(
  apiConfig: { authType: 'api_key' | 'auth_token', key: string, url?: string },
  provider?: string,
  options?: { apiModel?: string, apiHaikuModel?: string, apiSonnetModel?: string, apiOpusModel?: string },
): Promise<void> {
  try {
    const { ClaudeCodeConfigManager } = await import('../utils/claude-code-config-manager')
    const profile = await convertSingleConfigToProfile(apiConfig, provider, options)
    const result = await ClaudeCodeConfigManager.addProfile(profile)

    if (result.success) {
      const savedProfile = result.addedProfile || ClaudeCodeConfigManager.getProfileByName(profile.name) || profile
      // Set as default and apply settings
      if (savedProfile.id) {
        await ClaudeCodeConfigManager.switchProfile(savedProfile.id)
        await ClaudeCodeConfigManager.applyProfileSettings(savedProfile)
      }
      console.log(ansis.green(`✔ ${i18n.t('configuration:singleConfigSaved', { name: profile.name })}`))
    }
    else {
      console.warn(ansis.yellow(`${i18n.t('configuration:singleConfigSaveFailed')}: ${result.error}`))
    }
  }
  catch (error) {
    console.warn(ansis.yellow(`${i18n.t('configuration:singleConfigSaveFailed')}: ${error instanceof Error ? error.message : String(error)}`))
  }
}

async function convertSingleConfigToProfile(
  apiConfig: { authType: 'api_key' | 'auth_token', key: string, url?: string },
  provider?: string,
  options?: { apiModel?: string, apiHaikuModel?: string, apiSonnetModel?: string, apiOpusModel?: string },
): Promise<ClaudeCodeProfile> {
  const { ClaudeCodeConfigManager } = await import('../utils/claude-code-config-manager')

  // Generate configuration name based on provider or use default
  const configName = provider && provider !== 'custom'
    ? provider
    : 'custom-config'

  // Apply provider preset if specified
  let baseUrl = apiConfig.url || API_DEFAULT_URL
  let primaryModel = options?.apiModel
  let defaultHaikuModel = options?.apiHaikuModel
  let defaultSonnetModel = options?.apiSonnetModel
  let defaultOpusModel = options?.apiOpusModel
  let authType = apiConfig.authType

  if (provider && provider !== 'custom') {
    const { getProviderPreset } = await import('../config/api-providers')
    const preset = getProviderPreset(provider)

    if (preset?.claudeCode) {
      baseUrl = apiConfig.url || preset.claudeCode.baseUrl
      authType = preset.claudeCode.authType
      if (preset.claudeCode.defaultModels && preset.claudeCode.defaultModels.length > 0) {
        const [p, h, s, o] = preset.claudeCode.defaultModels
        primaryModel = primaryModel || p
        defaultHaikuModel = defaultHaikuModel || h
        defaultSonnetModel = defaultSonnetModel || s
        defaultOpusModel = defaultOpusModel || o
      }
    }
  }

  const profile: ClaudeCodeProfile = {
    name: configName,
    authType,
    apiKey: apiConfig.key,
    baseUrl,
    primaryModel,
    defaultHaikuModel,
    defaultSonnetModel,
    defaultOpusModel,
    id: ClaudeCodeConfigManager.generateProfileId(configName),
  }

  return profile
}

async function convertToClaudeCodeProfile(config: ApiConfigDefinition): Promise<ClaudeCodeProfile> {
  const { ClaudeCodeConfigManager } = await import('../utils/claude-code-config-manager')

  // Apply provider preset if specified
  let baseUrl = config.url
  let primaryModel = config.primaryModel
  let defaultHaikuModel = config.defaultHaikuModel
  let defaultSonnetModel = config.defaultSonnetModel
  let defaultOpusModel = config.defaultOpusModel
  let authType = config.type || 'api_key'

  if (config.provider && config.provider !== 'custom') {
    const { getProviderPreset } = await import('../config/api-providers')
    const preset = getProviderPreset(config.provider)

    if (preset?.claudeCode) {
      baseUrl = baseUrl || preset.claudeCode.baseUrl
      authType = preset.claudeCode.authType
      if (preset.claudeCode.defaultModels && preset.claudeCode.defaultModels.length > 0) {
        const [p, h, s, o] = preset.claudeCode.defaultModels
        primaryModel = primaryModel || p
        defaultHaikuModel = defaultHaikuModel || h
        defaultSonnetModel = defaultSonnetModel || s
        defaultOpusModel = defaultOpusModel || o
      }
    }
  }

  const profile: ClaudeCodeProfile = {
    name: config.name!,
    authType,
    apiKey: config.key,
    baseUrl,
    primaryModel,
    defaultHaikuModel,
    defaultSonnetModel,
    defaultOpusModel,
    id: ClaudeCodeConfigManager.generateProfileId(config.name!),
  }

  return profile
}

/**
 * Convert API config definition to Codex provider
 * @param config - API configuration definition
 */
async function convertToCodexProvider(config: ApiConfigDefinition): Promise<CodexProvider> {
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
export async function smartInit(options: InitOptions = {}): Promise<void> {
  try {
    console.log(ansis.bold.green('\n🧠 Smart Initialization Mode\n'))
    console.log(ansis.gray('Analyzing your project to generate optimal configuration...\n'))

    // Step 1: Analyze project
    const { analyzeProject } = await import('../generation')
    const analysis = await analyzeProject()

    console.log(ansis.cyan('📊 Project Analysis:'))
    console.log(ansis.gray(`  • Type: ${analysis.projectType}`))
    console.log(ansis.gray(`  • Languages: ${analysis.techStack.languages.join(', ')}`))
    console.log(ansis.gray(`  • Runtime: ${analysis.techStack.runtime}`))
    if (analysis.frameworks.length > 0) {
      console.log(ansis.gray(`  • Frameworks: ${analysis.frameworks.join(', ')}`))
    }
    if (analysis.buildTool) {
      console.log(ansis.gray(`  • Build Tool: ${analysis.buildTool}`))
    }
    console.log(ansis.gray(`  • Has Tests: ${analysis.hasTests ? 'Yes' : 'No'}`))
    console.log(ansis.gray(`  • Has Database: ${analysis.hasDatabase ? 'Yes' : 'No'}`))
    console.log(ansis.gray(`  • Has API: ${analysis.hasApi ? 'Yes' : 'No'}`))
    if (analysis.cicd.length > 0) {
      console.log(ansis.gray(`  • CI/CD: ${analysis.cicd.join(', ')}`))
    }
    console.log('')

    // Step 2: Select templates
    const { selectTemplates } = await import('../generation')
    const selection = await selectTemplates(analysis)

    console.log(ansis.cyan('🎯 Template Selection:'))
    console.log(ansis.gray(`  • Agents: ${selection.agents.length} selected`))
    for (const agent of selection.agents) {
      console.log(ansis.gray(`    - ${agent.name} (${agent.category})`))
    }
    console.log(ansis.gray(`  • Skills: ${selection.skills.length} selected`))
    for (const skill of selection.skills) {
      console.log(ansis.gray(`    - ${skill.name} (${skill.category})`))
    }
    console.log('')

    console.log(ansis.cyan('💡 Reasoning:'))
    console.log(ansis.gray(selection.reasoning.split('\n').map(line => `  ${line}`).join('\n')))
    console.log('')

    // Step 3: Confirm with user (unless skip-prompt or --yes)
    if (!options.skipPrompt && !options.yes) {
      const shouldContinue = await promptBoolean({
        message: 'Proceed with this configuration?',
        defaultValue: true,
      })

      if (!shouldContinue) {
        console.log(ansis.yellow('Smart initialization cancelled.'))
        return
      }
    }

    // Step 4: Generate and install configurations
    console.log(ansis.gray('\n🔧 Generating configurations...\n'))

    const { generateConfigs, writeConfigs } = await import('../generation')
    const config = await generateConfigs(selection)

    // Write configurations
    await writeConfigs(config)

    console.log(ansis.green('✔ Configurations generated successfully!'))
    console.log(ansis.gray(`  • ${config.agents.length} agents installed`))
    console.log(ansis.gray(`  • ${config.skills.length} skills installed`))
    console.log('')

    // Step 5: Run standard init with smart defaults
    console.log(ansis.gray('Running standard initialization...\n'))

    // Set smart defaults for standard init
    options.smart = false // Disable smart mode to avoid recursion
    options.skipPrompt = options.skipPrompt ?? false // Keep interactive unless explicitly disabled

    // Run standard init
    await init(options)

    // Step 6: Success message
    console.log('')
    console.log(ansis.bold.green('✅ Smart Initialization Complete!'))
    console.log('')
    console.log(ansis.cyan('🎯 What was configured:'))
    console.log(ansis.gray('  • Project-specific agents and skills'))
    console.log(ansis.gray('  • Claude Code base configuration'))
    console.log(ansis.gray('  • MCP services'))
    console.log(ansis.gray('  • Workflows and output styles'))
    console.log('')
    console.log(ansis.cyan('🚀 Next Steps:'))
    console.log(ansis.gray('  1. Run: claude'))
    console.log(ansis.gray('  2. Start coding with AI assistance!'))
    console.log(ansis.gray('  3. Use generated skills with their triggers'))
    console.log('')
  }
  catch (error) {
    console.error(ansis.red('❌ Smart initialization failed:'), error instanceof Error ? error.message : error)
    throw error
  }
}
