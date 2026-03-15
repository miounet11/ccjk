import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import type { McpServerConfig } from '../types'
import type { ApiConfigDefinition, ClaudeCodeProfile } from '../types/claude-code-config'
import type { CodexProvider } from '../utils/code-tools/codex'
import { existsSync } from 'node:fs'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { getMcpServices, MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { WORKFLOW_CONFIG_BASE } from '../config/workflows'
import {
  API_DEFAULT_URL,
  CODE_TOOL_BANNERS,
  DEFAULT_CODE_TOOL_TYPE,
  SETTINGS_FILE,
} from '../constants'
import { i18n } from '../i18n'
import { displayBannerWithInfo, padToDisplayWidth } from '../utils/banner'
import { readZcfConfig, updateZcfConfig } from '../utils/ccjk-config'
import {
  backupCcrConfig,
  configureCcrProxy,
  createDefaultCcrConfig,
  readCcrConfig,
  setupCcrConfiguration,
  writeCcrConfig,
} from '../utils/ccr/config'
import { installCcr, isCcrInstalled } from '../utils/ccr/installer'
import {
  addCompletedOnboarding,
  backupMcpConfig,
  buildMcpServerConfig,
  fixWindowsMcpConfig,
  readMcpConfig,
  replaceMcpServers,
  setPrimaryApiKey,
  syncMcpPermissions,
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
import { displayError } from '../utils/error-formatter'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { getInstallationStatus, installClaudeCode } from '../utils/installer'
import { selectMcpServices } from '../utils/mcp-selector'
import { parseOrchestrationLevel, writeOrchestrationPolicy } from '../utils/orchestration'
import { configureOutputStyle } from '../utils/output-style'
import { isTermux, isWindows } from '../utils/platform'
import { ProgressTracker } from '../utils/progress-tracker'
import { addNumbersToChoices } from '../utils/prompt-helpers'
import { resolveAiOutputLanguage } from '../utils/prompts'
import { getRuntimeVersion } from '../utils/runtime-package'
import { checkSuperpowersInstalled, installSuperpowers } from '../utils/superpowers/installer'
import { promptBoolean } from '../utils/toggle-prompt'
import { formatApiKeyDisplay } from '../utils/validator'
import { checkClaudeCodeVersionAndPrompt } from '../utils/version-checker'
import { selectAndInstallWorkflows } from '../utils/workflow-installer'

const ccjkVersion = getRuntimeVersion()

export interface InitOptions {
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  force?: boolean
  skipBanner?: boolean
  skipPrompt?: boolean
  silent?: boolean // Silent mode - fully non-interactive with smart defaults
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
  skills?: string[] // Skill IDs to install (e.g., 'git-commit', 'code-review')
  outputStyles?: string[] | string | boolean
  defaultOutputStyle?: string
  allLang?: string // New: unified language parameter
  installCometixLine?: string | boolean // New: CCometixLine installation control
  installSuperpowers?: string | boolean // New: Superpowers installation control
  installAgentBrowser?: string | boolean // New: Agent Browser installation control
  orchestration?: 'off' | 'minimal' | 'standard' | 'max' | string
  initSource?: 'init' | 'simplified-init' | 'silent-init'
  // Multi-configuration parameters
  apiConfigs?: string // JSON string for multiple API configurations
  apiConfigsFile?: string // Path to JSON file with API configurations
}


// Re-export extracted modules for backward compatibility
export { validateSkipPromptOptions, simplifiedInit, silentInit, smartInit } from './init-variants'
export { handleMultiConfigurations, validateApiConfigs, saveSingleConfigToToml, convertSingleConfigToProfile } from './init-multi-config'

import { handleSuperpowersInstallation, validateSkipPromptOptions, silentInit, smartInit } from './init-variants'
import { handleMultiConfigurations, saveSingleConfigToToml } from './init-multi-config'

export async function init(options: InitOptions = {}): Promise<void> {
  options.initSource = options.initSource || 'init'
  options.orchestration = parseOrchestrationLevel(options.orchestration)

  // Clean up legacy zcf namespace directories to prevent duplicate skills/agents
  try {
    const { cleanupZcfNamespace } = await import('../utils/cleanup-migration.js')
    const { removed } = cleanupZcfNamespace()
    if (removed.length > 0) {
      console.log(ansis.dim(`Cleaned up legacy zcf namespace: ${removed.join(', ')}`))
    }
  }
  catch {
    // Silent fail - cleanup is best-effort
  }

  // Handle silent mode
  if (options.silent) {
    return await silentInit(options)
  }

  // Handle smart generation mode
  if (options.smart) {
    return await smartInit(options)
  }

  // Validate options if in skip-prompt mode (outside try-catch to allow errors to propagate in tests)
  if (options.skipPrompt) {
    await validateSkipPromptOptions(options)
  }

  try {
    // Initialize progress tracker
    const tracker = new ProgressTracker([
      'Reading configuration',
      'Selecting code tool',
      'Configuring API',
      'Installing MCP services',
      'Setting up workflows',
      'Finalizing setup',
    ])

    // Only show progress in interactive mode
    if (!options.skipPrompt && !options.skipBanner) {
      tracker.start()
    }

    // Step 2: Read CCJK config once for multiple uses
    if (!options.skipPrompt && !options.skipBanner)
      tracker.nextStep()
    const zcfConfig = readZcfConfig()

    // Step 3: Select code tool
    if (!options.skipPrompt && !options.skipBanner)
      tracker.nextStep()
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
        const { configureIncrementalManagement }
          = await import('../utils/claude-code-incremental-manager')
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
              : options.skipPrompt
                ? 'skip'
                : undefined

      const customApiConfig
        = !hasApiConfigs && options.apiType === 'api_key' && options.apiKey
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
        version: ccjkVersion,
        preferredLang: i18n.language as SupportedLang, // CCJK界面语言
        templateLang: configLang, // 模板语言
        aiOutputLang:
          resolvedAiOutputLang ?? options.aiOutputLang ?? zcfConfig?.aiOutputLang ?? 'en',
        codeToolType,
      })
      console.log(ansis.green(i18n.t('codex:setupComplete')))
      return
    }

    // Step 4: Select AI output language
    const aiOutputLang = await resolveAiOutputLanguage(
      i18n.language as SupportedLang,
      options.aiOutputLang,
      zcfConfig,
      options.skipPrompt,
    )

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

    const isNewInstall = !existsSync(SETTINGS_FILE)

    if (!options.skipPrompt && (isNewInstall || ['backup', 'merge', 'new'].includes(action))) {
      const isZh = i18n.language === 'zh-CN'
      console.log('')
      console.log(
        ansis.bold.cyan(
          isZh
            ? '💎 顶级大神编排理念（默认首选）'
            : '💎 Expert Workflow Orchestration (Default First Choice)',
        ),
      )
      console.log(
        ansis.dim(
          isZh
            ? '可同步优化规划、验证、子代理与规则执行质量，建议首次安装立即启用。'
            : 'Improves planning, verification, subagent strategy, and rule execution quality. Recommended on first install.',
        ),
      )

      const { orchestrationChoice } = await inquirer.prompt<{
        orchestrationChoice: 'off' | 'minimal' | 'standard' | 'max'
      }>({
        type: 'list',
        name: 'orchestrationChoice',
        message: isZh ? '请选择默认编排级别：' : 'Select default orchestration level:',
        default: 'max',
        choices: addNumbersToChoices([
          {
            name: isZh
              ? '顶级模式（推荐）- 最大化质量与流程约束'
              : 'Expert Mode (Recommended) - Maximum quality and workflow enforcement',
            value: 'max',
          },
          {
            name: isZh ? '标准模式 - 平衡质量与速度' : 'Standard Mode - Balanced quality and speed',
            value: 'standard',
          },
          {
            name: isZh
              ? '轻量模式 - 更少流程，更快执行'
              : 'Minimal Mode - Lighter process, faster execution',
            value: 'minimal',
          },
          {
            name: isZh ? '关闭 - 不启用编排策略' : 'Off - Disable orchestration policy',
            value: 'off',
          },
        ]),
      })

      options.orchestration = orchestrationChoice
      console.log(
        ansis.green(
          `✔ ${isZh ? '已设为默认首选' : 'Set as default first choice'}: ${orchestrationChoice}`,
        ),
      )
    }

    // Step 6: Configure API (skip if only updating docs)
    if (!options.skipPrompt && !options.skipBanner)
      tracker.nextStep('Configuring API')
    let apiConfig = null
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
        await configureOutputStyle(options.outputStyles as string[], options.defaultOutputStyle)
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
    const hasModelParams
      = options.apiModel || options.apiHaikuModel || options.apiSonnetModel || options.apiOpusModel
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
    if (!options.skipPrompt && !options.skipBanner)
      tracker.nextStep('Installing MCP services')
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
                adjusted.args[idx + 1]
                  = (codeToolType as CodeToolType) === 'codex' ? 'codex' : 'ide-assistant'
              }
              else {
                adjusted.args.push(
                  '--context',
                  (codeToolType as CodeToolType) === 'codex' ? 'codex' : 'ide-assistant',
                )
              }
              config = adjusted
            }

            // Handle services that require API key
            if (service.requiresApiKey) {
              if (options.skipPrompt) {
                // In skip-prompt mode, skip services that require API keys
                console.log(
                  ansis.yellow(`${i18n.t('common:skip')}: ${service.name} (requires API key)`),
                )
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

                config = buildMcpServerConfig(
                  service.config,
                  response.apiKey,
                  service.apiKeyPlaceholder,
                  service.apiKeyEnvVar,
                )
              }
            }

            newServers[service.id] = config
          }

          // Replace MCP servers with clean slate (init flow removes stale services)
          const existingConfig = readMcpConfig()
          let mergedConfig = replaceMcpServers(existingConfig, newServers)

          // Fix Windows config if needed
          mergedConfig = fixWindowsMcpConfig(mergedConfig)

          // Write the config with error handling
          try {
            writeMcpConfig(mergedConfig)
            syncMcpPermissions()

            // MCP gatekeeper disabled: each MCP call forks bash+node even when
            // no gatekeeper config exists. Enable manually: ccjk mcp --gatekeeper

            console.log(ansis.green(`✔ ${i18n.t('mcp:mcpConfigSuccess')}`))

            // Check and display performance warning
            const { checkMcpPerformance, formatPerformanceWarning }
              = await import('../utils/mcp-performance')
            const serviceCount = Object.keys(newServers).length
            const perfWarning = checkMcpPerformance(serviceCount)
            if (perfWarning) {
              console.log('')
              console.log(formatPerformanceWarning(perfWarning, i18n.language as 'en' | 'zh-CN'))
            }
          }
          catch (error) {
            displayError(error as Error, 'MCP configuration')
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

    let agentBrowserReady = false

    // Step 11.55: Agent Browser installation (default enabled)
    try {
      const isZh = i18n.language === 'zh-CN'
      let shouldInstallAgentBrowser = false

      if (options.skipPrompt) {
        shouldInstallAgentBrowser = options.installAgentBrowser !== false
      }
      else {
        shouldInstallAgentBrowser = await promptBoolean({
          message: isZh
            ? '安装 Agent Browser 浏览器自动化模块？（推荐，浏览器任务可无缝使用）'
            : 'Install Agent Browser module? (recommended for seamless browser automation)',
          defaultValue: true,
        })
      }

      if (shouldInstallAgentBrowser) {
        const { checkAgentBrowserInstalled, installAgentBrowser }
          = await import('../utils/agent-browser/installer')
        const installed = await checkAgentBrowserInstalled()
        const success = installed ? true : await installAgentBrowser()

        if (success) {
          const { addSkill } = await import('../skills/manager')
          const { browserSkill } = await import('../utils/agent-browser/skill')
          addSkill(browserSkill)
          agentBrowserReady = true
          console.log(
            ansis.green(
              `✔ ${isZh ? 'Agent Browser 已就绪，浏览器 Skill 已启用' : 'Agent Browser ready, browser skill enabled'}`,
            ),
          )
          console.log(
            ansis.gray(
              `  ${isZh ? '可直接使用:' : 'Use directly:'} ccjk browser start https://example.com`,
            ),
          )
        }
      }
      else {
        console.log(
          ansis.yellow(
            isZh ? '⚠ 已跳过 Agent Browser 安装' : '⚠ Agent Browser installation skipped',
          ),
        )
      }
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log(ansis.gray(`ℹ Agent Browser setup skipped: ${msg}`))
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

    try {
      const finalOrchestrationLevel = parseOrchestrationLevel(options.orchestration)
      const policyPath = writeOrchestrationPolicy({
        level: finalOrchestrationLevel,
        language: configLang as SupportedLang,
        source: options.initSource,
      })
      console.log(
        ansis.green(`✔ Workflow orchestration: ${finalOrchestrationLevel} (${policyPath})`),
      )
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log(ansis.gray(`ℹ Workflow orchestration skipped: ${msg}`))
    }

    // Step 12: Save ccjk config
    if (!options.skipPrompt && !options.skipBanner)
      tracker.nextStep('Finalizing setup')
    updateZcfConfig({
      version: ccjkVersion,
      preferredLang: i18n.language as SupportedLang, // CCJK界面语言
      templateLang: configLang, // 模板语言
      aiOutputLang: aiOutputLang as AiOutputLanguage | string,
      codeToolType,
    })

    // Step 12.1: Ask to import recommended environment variables and permissions (if not skip-prompt)
    if (!options.skipPrompt) {
      const { importRecommendedEnv, importRecommendedPermissions }
        = await import('../utils/simple-config')
      const confirmImport = await promptBoolean({
        message:
          i18n.t('configuration:recommendImportEnvPerm')
          || '导入 CCJK 推荐的环境变量和权限配置？（推荐，可减少权限弹窗）',
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
          console.log(
            ansis.green(`✔ ${i18n.t('configuration:permissionsImportSuccess') || '权限配置已导入'}`),
          )
        }
        catch (error) {
          console.error(
            ansis.yellow(`⚠ ${i18n.t('configuration:permissionsImportFailed')}: ${error}`),
          )
        }

        console.log() // Add blank line
      }
    }

    // Step 13: Success message with enhanced guidance
    if (!options.skipPrompt && !options.skipBanner)
      tracker.complete()
    console.log('')
    console.log(
      ansis.bold.green('╔══════════════════════════════════════════════════════════════╗'),
    )
    console.log(
      ansis.bold.green('║')
      + ansis.bold.white(padToDisplayWidth(`  ${i18n.t('configuration:setupCompleteTitle')}`, 62))
      + ansis.bold.green('║'),
    )
    console.log(
      ansis.bold.green('╠══════════════════════════════════════════════════════════════╣'),
    )
    console.log(
      `${ansis.bold.green('║')}                                                              ${ansis.bold.green('║')}`,
    )
    console.log(
      ansis.bold.green('║')
      + ansis.green(padToDisplayWidth(`  ${i18n.t('configuration:nextSteps')}`, 62))
      + ansis.bold.green('║'),
    )
    console.log(
      `${ansis.bold.green('║')}                                                              ${ansis.bold.green('║')}`,
    )
    console.log(
      ansis.bold.green('║')
      + padToDisplayWidth(`  ${i18n.t('configuration:guidanceStep1')}`, 62)
      + ansis.bold.green('║'),
    )
    console.log(
      ansis.bold.green('║')
      + ansis.dim(padToDisplayWidth(`     ${i18n.t('configuration:guidanceStep1Detail')}`, 62))
      + ansis.bold.green('║'),
    )
    console.log(
      ansis.bold.green('║')
      + ansis.dim(padToDisplayWidth(`     ${i18n.t('configuration:guidanceStep1Detail2')}`, 62))
      + ansis.bold.green('║'),
    )
    console.log(
      `${ansis.bold.green('║')}                                                              ${ansis.bold.green('║')}`,
    )
    console.log(
      ansis.bold.green('║')
      + padToDisplayWidth(`  ${i18n.t('configuration:guidanceStep2')}`, 62)
      + ansis.bold.green('║'),
    )
    console.log(
      ansis.bold.green('║')
      + ansis.green(padToDisplayWidth(`     ${i18n.t('configuration:guidanceStep2Example')}`, 62))
      + ansis.bold.green('║'),
    )
    console.log(
      `${ansis.bold.green('║')}                                                              ${ansis.bold.green('║')}`,
    )
    console.log(
      ansis.bold.green('║')
      + padToDisplayWidth(`  ${i18n.t('configuration:guidanceStep3')} `, 44)
      + ansis.yellow(padToDisplayWidth(i18n.t('configuration:guidanceStep3Command'), 18))
      + ansis.bold.green('║'),
    )
    console.log(
      ansis.bold.green('║')
      + padToDisplayWidth(`  ${i18n.t('configuration:guidanceStep4')} `, 44)
      + ansis.yellow(padToDisplayWidth(i18n.t('configuration:guidanceStep4Command'), 18))
      + ansis.bold.green('║'),
    )
    console.log(
      `${ansis.bold.green('║')}                                                              ${ansis.bold.green('║')}`,
    )
    console.log(
      ansis.bold.green('╚══════════════════════════════════════════════════════════════╝'),
    )

    if (isNewInstall || ['backup', 'merge', 'new'].includes(action)) {
      const isZh = i18n.language === 'zh-CN'
      console.log(
        ansis.cyan(
          isZh ? '🧠 上下文优化已启用（默认）' : '🧠 Context optimization is enabled (default)',
        ),
      )
      console.log(
        ansis.dim(
          isZh
            ? '   建议立即运行: ccjk morning  查看健康分与收益摘要'
            : '   Recommended now: ccjk morning  to view health score and value summary',
        ),
      )
      console.log(
        ansis.dim(
          isZh
            ? '   深度复盘: ccjk review  | 上下文详情: ccjk context --show'
            : '   Deep review: ccjk review  | Context details: ccjk context --show',
        ),
      )

      if (agentBrowserReady) {
        console.log(
          ansis.cyan(
            isZh ? '🌐 浏览器自动化已就绪（无缝）' : '🌐 Browser automation is ready (seamless)',
          ),
        )
        console.log(
          ansis.dim(
            isZh
              ? '   直接开始: ccjk browser start https://example.com'
              : '   Start directly: ccjk browser start https://example.com',
          ),
        )
        console.log(
          ansis.dim(
            isZh
              ? '   常用操作: ccjk browser status  |  ccjk browser stop'
              : '   Common actions: ccjk browser status  |  ccjk browser stop',
          ),
        )
      }
    }

    console.log('')
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      displayError(error as Error, 'Initialization')
      handleGeneralError(error)
    }
  }
}

