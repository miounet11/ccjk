import type { SupportedLang } from '../constants'
import type { McpServerConfig } from '../types'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { getMcpServices } from '../config/mcp-services'
import { LANG_LABELS, SUPPORTED_LANGS } from '../constants'
import { changeLanguage, ensureI18nInitialized, i18n } from '../i18n'
import { readZcfConfig, updateZcfConfig } from './ccjk-config'
import { setupCcrConfiguration } from './ccr/config'
import { installCcr, isCcrInstalled } from './ccr/installer'
import {
  backupMcpConfig,
  buildMcpServerConfig,
  fixWindowsMcpConfig,
  mergeMcpServers,
  readMcpConfig,
  writeMcpConfig,
} from './claude-config'
import {
  applyAiLanguageDirective,
  configureApi,
  getExistingApiConfig,
  getExistingModelConfig,
  promptApiConfigurationAction,
  switchToOfficialLogin,
  updateCustomModel,
  updateDefaultModel,
} from './config'
import { modifyApiConfigPartially } from './config-operations'
import { selectMcpServices } from './mcp-selector'
import { configureOutputStyle } from './output-style'
import { isWindows } from './platform'
import { addNumbersToChoices } from './prompt-helpers'
import { importRecommendedEnv, importRecommendedPermissions, openSettingsJson } from './simple-config'
import { promptBoolean } from './toggle-prompt'
import { formatApiKeyDisplay, validateApiKey } from './validator'

// Helper function to handle cancelled operations
async function handleCancellation(): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.yellow(i18n.t('common:cancelled')))
}

// Handle official login mode
async function handleOfficialLoginMode(): Promise<void> {
  ensureI18nInitialized()
  const success = switchToOfficialLogin()
  if (success) {
    console.log(ansis.green(`✔ ${i18n.t('api:officialLoginConfigured')}`))
  }
  else {
    console.log(ansis.red(i18n.t('api:officialLoginFailed')))
  }
}

// Handle custom API configuration mode
export async function handleCustomApiMode(): Promise<void> {
  ensureI18nInitialized()

  // Get current code tool type from CCJK config
  const zcfConfig = readZcfConfig()
  const codeToolType = zcfConfig?.codeToolType || 'claude-code'

  // For Claude Code, use the new incremental configuration management
  if (codeToolType === 'claude-code') {
    const { configureIncrementalManagement } = await import('../utils/claude-code-incremental-manager')
    await configureIncrementalManagement()
    return
  }

  // For other tools, keep the existing logic
  const existingConfig = getExistingApiConfig()

  if (existingConfig) {
    // Use common configuration action selection
    const configAction = await promptApiConfigurationAction()

    if (configAction === 'keep-existing') {
      console.log(ansis.green(`✔ ${i18n.t('api:keepExistingConfig')}`))
      return
    }
    else if (configAction === 'modify-partial') {
      // Call existing partial configuration modification function
      await modifyApiConfigPartially(existingConfig)
      return
    }
    // For 'modify-all', continue with full reconfiguration
  }

  const { apiChoice } = await inquirer.prompt<{ apiChoice: string }>({
    type: 'list',
    name: 'apiChoice',
    message: i18n.t('api:configureApi'),
    choices: addNumbersToChoices([
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
      { name: i18n.t('api:skipApi'), value: 'skip' },
    ]),
  })

  if (!apiChoice || apiChoice === 'skip') {
    await handleCancellation()
    return
  }

  const { url } = await inquirer.prompt<{ url: string }>({
    type: 'input',
    name: 'url',
    message: `${i18n.t('api:enterApiUrl')}${i18n.t('common:emptyToSkip')}`,
    validate: (value) => {
      if (!value) {
        return true
      }
      try {
        void new URL(value)
        return true
      }
      catch {
        return i18n.t('api:invalidUrl')
      }
    },
  })

  if (url === undefined || !url) {
    await handleCancellation()
    return
  }

  const keyMessage = apiChoice === 'auth_token'
    ? `${i18n.t('api:enterAuthToken')}${i18n.t('common:emptyToSkip')}`
    : `${i18n.t('api:enterApiKey')}${i18n.t('common:emptyToSkip')}`
  const { key } = await inquirer.prompt<{ key: string }>({
    type: 'input',
    name: 'key',
    message: keyMessage,
    validate: (value) => {
      if (!value) {
        return true
      }

      const validation = validateApiKey(value)
      if (!validation.isValid) {
        return validation.error || i18n.t('api:invalidKeyFormat')
      }

      return true
    },
  })

  if (key === undefined || !key) {
    await handleCancellation()
    return
  }

  const apiConfig = { url, key, authType: apiChoice as 'auth_token' | 'api_key' }
  const configuredApi = configureApi(apiConfig)

  if (configuredApi) {
    console.log(ansis.green(`✔ ${i18n.t('api:apiConfigSuccess')}`))
    console.log(ansis.gray(`  URL: ${configuredApi.url}`))
    console.log(ansis.gray(`  Key: ${formatApiKeyDisplay(configuredApi.key)}`))
  }
}

// Handle CCR proxy mode
async function handleCcrProxyMode(): Promise<void> {
  ensureI18nInitialized()

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
  }
}

// Handle switch config mode
async function handleSwitchConfigMode(): Promise<void> {
  ensureI18nInitialized()

  // Import and call the interactive switch function from config-switch command
  const { configSwitchCommand } = await import('../commands/config-switch')
  await configSwitchCommand({ codeType: 'claude-code' })
}

// Configure API
export async function configureApiFeature(): Promise<void> {
  ensureI18nInitialized()

  // New API configuration mode selection
  const { mode } = await inquirer.prompt<{ mode: string }>({
    type: 'list',
    name: 'mode',
    message: i18n.t('api:apiModePrompt'),
    choices: addNumbersToChoices([
      { name: i18n.t('api:apiModeOfficial'), value: 'official' },
      { name: i18n.t('api:apiModeCustom'), value: 'custom' },
      { name: i18n.t('api:apiModeCcr'), value: 'ccr' },
      { name: i18n.t('api:apiModeSwitch'), value: 'switch' },
      { name: i18n.t('api:apiModeSkip'), value: 'skip' },
    ]),
  })

  if (!mode || mode === 'skip') {
    await handleCancellation()
    return
  }

  switch (mode) {
    case 'official':
      await handleOfficialLoginMode()
      break
    case 'custom':
      await handleCustomApiMode()
      break
    case 'ccr':
      await handleCcrProxyMode()
      break
    case 'switch':
      await handleSwitchConfigMode()
      break
    default:
      await handleCancellation()
      break
  }
}

// Configure MCP
export async function configureMcpFeature(): Promise<void> {
  ensureI18nInitialized()

  // Check if Windows needs fix
  if (isWindows()) {
    const fixWindows = await promptBoolean({
      message: i18n.t('configuration:fixWindowsMcp') || 'Fix Windows MCP configuration?',
      defaultValue: true,
    })

    if (fixWindows) {
      const existingConfig = readMcpConfig() || { mcpServers: {} }
      const fixedConfig = fixWindowsMcpConfig(existingConfig)
      writeMcpConfig(fixedConfig)
      console.log(ansis.green(`✔ ${i18n.t('configuration:windowsMcpConfigFixed')}`))
    }
  }

  // Use common MCP selector
  const selectedServices = await selectMcpServices()

  if (!selectedServices) {
    return
  }

  if (selectedServices.length > 0) {
    const mcpBackupPath = backupMcpConfig()
    if (mcpBackupPath) {
      console.log(ansis.gray(`✔ ${i18n.t('mcp:mcpBackupSuccess')}: ${mcpBackupPath}`))
    }

    const newServers: Record<string, McpServerConfig> = {}

    for (const serviceId of selectedServices) {
      const service = (await getMcpServices()).find(s => s.id === serviceId)
      if (!service)
        continue

      let config = service.config

      if (service.requiresApiKey) {
        const { apiKey } = await inquirer.prompt<{ apiKey: string }>({
          type: 'input',
          name: 'apiKey',
          message: service.apiKeyPrompt!,
          validate: async (value: string) => !!value || i18n.t('api:keyRequired'),
        })

        if (apiKey) {
          config = buildMcpServerConfig(service.config, apiKey, service.apiKeyPlaceholder, service.apiKeyEnvVar)
        }
        else {
          continue
        }
      }

      newServers[service.id] = config
    }

    const existingConfig = readMcpConfig()
    let mergedConfig = mergeMcpServers(existingConfig, newServers)
    mergedConfig = fixWindowsMcpConfig(mergedConfig)

    writeMcpConfig(mergedConfig)
    console.log(ansis.green(`✔ ${i18n.t('mcp:mcpConfigSuccess')}`))
  }
}

// Configure default model
export async function configureDefaultModelFeature(): Promise<void> {
  ensureI18nInitialized()

  // Check for existing model configuration
  const existingModel = getExistingModelConfig()

  if (existingModel) {
    // Display existing configuration
    console.log(`\n${ansis.green(`ℹ ${i18n.t('configuration:existingModelConfig') || 'Existing model configuration'}`)}`)
    const modelDisplay
      = existingModel === 'default'
        ? i18n.t('configuration:defaultModelOption') || 'Default (Let Claude Code choose)'
        : existingModel.charAt(0).toUpperCase() + existingModel.slice(1)
    console.log(ansis.gray(`  ${i18n.t('configuration:currentModel') || 'Current model'}: ${modelDisplay}\n`))

    // Ask user what to do with existing config
    const modify = await promptBoolean({
      message: i18n.t('configuration:modifyModel') || 'Modify model configuration?',
      defaultValue: false,
    })

    if (!modify) {
      console.log(ansis.green(`✔ ${i18n.t('configuration:keepModel') || 'Keeping existing model configuration'}`))
      return
    }
  }

  const { model } = await inquirer.prompt<{ model: 'opus' | 'sonnet' | 'sonnet[1m]' | 'default' | 'custom' }>({
    type: 'list',
    name: 'model',
    message: i18n.t('configuration:selectDefaultModel') || 'Select default model',
    choices: addNumbersToChoices([
      {
        name: i18n.t('configuration:defaultModelOption') || 'Default - Let Claude Code choose',
        value: 'default' as const,
      },
      {
        name: i18n.t('configuration:opusModelOption') || 'Opus - Only use opus, high token consumption, use with caution',
        value: 'opus' as const,
      },
      {
        name: i18n.t('configuration:sonnet1mModelOption') || 'Sonnet 1M - 1M context version',
        value: 'sonnet[1m]' as const,
      },
      {
        name: i18n.t('configuration:customModelOption') || 'Custom - Specify custom model names',
        value: 'custom' as const,
      },
    ]),
    default: existingModel ? ['default', 'opus', 'sonnet[1m]', 'custom'].indexOf(existingModel) : 0,
  })

  if (!model) {
    await handleCancellation()
    return
  }

  if (model === 'custom') {
    // Handle custom model input
    const { primaryModel, haikuModel, sonnetModel, opusModel } = await promptCustomModels()

    // Check if all inputs are skipped
    if (!primaryModel.trim() && !haikuModel.trim() && !sonnetModel.trim() && !opusModel.trim()) {
      console.log(ansis.yellow(`⚠ ${i18n.t('configuration:customModelSkipped') || 'Custom model configuration skipped'}`))
      return
    }

    // Use the new updateCustomModel function to handle environment variables
    updateCustomModel(primaryModel, haikuModel, sonnetModel, opusModel)
    console.log(ansis.green(`✔ ${i18n.t('configuration:customModelConfigured') || 'Custom model configuration completed'}`))
    return
  }

  updateDefaultModel(model)
  console.log(ansis.green(`✔ ${i18n.t('configuration:modelConfigured') || 'Default model configured'}`))
}

/**
 * Prompt user for custom model names
 * @returns Object containing primaryModel and default model strings (may be empty for skip)
 */
export async function promptCustomModels(
  defaultPrimaryModel?: string,
  defaultHaikuModel?: string,
  defaultSonnetModel?: string,
  defaultOpusModel?: string,
): Promise<{ primaryModel: string, haikuModel: string, sonnetModel: string, opusModel: string }> {
  const { primaryModel } = await inquirer.prompt<{ primaryModel: string }>({
    type: 'input',
    name: 'primaryModel',
    message: `${i18n.t('configuration:enterPrimaryModel')}${i18n.t('common:emptyToSkip')}`,
    default: defaultPrimaryModel || '',
  })

  const { haikuModel } = await inquirer.prompt<{ haikuModel: string }>({
    type: 'input',
    name: 'haikuModel',
    message: `${i18n.t('configuration:enterHaikuModel')}${i18n.t('common:emptyToSkip')}`,
    default: defaultHaikuModel || '',
  })

  const { sonnetModel } = await inquirer.prompt<{ sonnetModel: string }>({
    type: 'input',
    name: 'sonnetModel',
    message: `${i18n.t('configuration:enterSonnetModel')}${i18n.t('common:emptyToSkip')}`,
    default: defaultSonnetModel || '',
  })

  const { opusModel } = await inquirer.prompt<{ opusModel: string }>({
    type: 'input',
    name: 'opusModel',
    message: `${i18n.t('configuration:enterOpusModel')}${i18n.t('common:emptyToSkip')}`,
    default: defaultOpusModel || '',
  })

  return { primaryModel, haikuModel, sonnetModel, opusModel }
}

// Configure AI memory - View and manage Claude's memory (CLAUDE.md, Postmortem, etc.)
export async function configureAiMemoryFeature(): Promise<void> {
  ensureI18nInitialized()
  const isZh = i18n.language === 'zh-CN'

  const { option } = await inquirer.prompt<{ option: string }>({
    type: 'list',
    name: 'option',
    message: isZh ? '选择 AI 记忆管理选项' : 'Select AI memory management option',
    choices: addNumbersToChoices([
      {
        name: isZh ? '📄 查看全局 CLAUDE.md（系统提示）' : '📄 View global CLAUDE.md (system prompt)',
        value: 'viewGlobalClaudeMd',
      },
      {
        name: isZh ? '📁 查看项目 CLAUDE.md' : '📁 View project CLAUDE.md',
        value: 'viewProjectClaudeMd',
      },
      {
        name: isZh ? '🔬 查看 Postmortem（历史 Bug 经验）' : '🔬 View Postmortem (bug lessons learned)',
        value: 'viewPostmortem',
      },
      {
        name: isZh ? '✏️ 编辑全局 CLAUDE.md' : '✏️ Edit global CLAUDE.md',
        value: 'editGlobalClaudeMd',
      },
      {
        name: isZh ? '🌐 配置 AI 输出语言' : '🌐 Configure AI output language',
        value: 'language',
      },
      {
        name: isZh ? '🎨 配置输出风格' : '🎨 Configure output style',
        value: 'outputStyle',
      },
    ]),
  })

  if (!option) {
    return
  }

  const { readFileSync, existsSync, writeFileSync } = await import('node:fs')
  const { homedir } = await import('node:os')
  const { join } = await import('pathe')
  const { execSync } = await import('node:child_process')
  const nodeProcess = await import('node:process')
  const cwd = nodeProcess.default.cwd()

  const globalClaudeMdPath = join(homedir(), '.claude', 'CLAUDE.md')
  const projectClaudeMdPath = join(cwd, 'CLAUDE.md')
  const localClaudeMdPath = join(cwd, '.claude', 'CLAUDE.md')

  switch (option) {
    case 'viewGlobalClaudeMd': {
      if (existsSync(globalClaudeMdPath)) {
        console.log(ansis.green.bold(`\n📄 ${isZh ? '全局 CLAUDE.md 内容' : 'Global CLAUDE.md Content'}:`))
        console.log(ansis.dim('─'.repeat(60)))
        const content = readFileSync(globalClaudeMdPath, 'utf-8')
        console.log(content)
        console.log(ansis.dim('─'.repeat(60)))
        console.log(ansis.gray(`${isZh ? '路径' : 'Path'}: ${globalClaudeMdPath}`))
      }
      else {
        console.log(ansis.yellow(`\n⚠️ ${isZh ? '全局 CLAUDE.md 不存在' : 'Global CLAUDE.md does not exist'}`))
        console.log(ansis.gray(`${isZh ? '预期路径' : 'Expected path'}: ${globalClaudeMdPath}`))
      }
      break
    }

    case 'viewProjectClaudeMd': {
      // Check both project root and .claude directory
      let foundPath: string | null = null
      if (existsSync(projectClaudeMdPath)) {
        foundPath = projectClaudeMdPath
      }
      else if (existsSync(localClaudeMdPath)) {
        foundPath = localClaudeMdPath
      }

      if (foundPath) {
        console.log(ansis.green.bold(`\n📁 ${isZh ? '项目 CLAUDE.md 内容' : 'Project CLAUDE.md Content'}:`))
        console.log(ansis.dim('─'.repeat(60)))
        const content = readFileSync(foundPath, 'utf-8')
        console.log(content)
        console.log(ansis.dim('─'.repeat(60)))
        console.log(ansis.gray(`${isZh ? '路径' : 'Path'}: ${foundPath}`))
      }
      else {
        console.log(ansis.yellow(`\n⚠️ ${isZh ? '项目 CLAUDE.md 不存在' : 'Project CLAUDE.md does not exist'}`))
        console.log(ansis.gray(`${isZh ? '已检查路径' : 'Checked paths'}:`))
        console.log(ansis.gray(`  - ${projectClaudeMdPath}`))
        console.log(ansis.gray(`  - ${localClaudeMdPath}`))
      }
      break
    }

    case 'viewPostmortem': {
      const postmortemDir = join(cwd, '.postmortem')
      if (existsSync(postmortemDir)) {
        console.log(ansis.green.bold(`\n🔬 ${isZh ? 'Postmortem 报告' : 'Postmortem Reports'}:`))
        console.log(ansis.dim('─'.repeat(60)))

        const { readdirSync } = await import('node:fs')
        const files = readdirSync(postmortemDir).filter(f => f.endsWith('.md'))

        if (files.length === 0) {
          console.log(ansis.yellow(isZh ? '暂无 Postmortem 报告' : 'No postmortem reports yet'))
        }
        else {
          console.log(ansis.green(`${isZh ? '找到' : 'Found'} ${files.length} ${isZh ? '个报告' : 'reports'}:\n`))

          // Let user select a report to view
          const { selectedFile } = await inquirer.prompt<{ selectedFile: string }>({
            type: 'list',
            name: 'selectedFile',
            message: isZh ? '选择要查看的报告' : 'Select a report to view',
            choices: [
              ...files.map(f => ({ name: f, value: f })),
              { name: isZh ? '返回' : 'Back', value: 'back' },
            ],
          })

          if (selectedFile !== 'back') {
            const reportPath = join(postmortemDir, selectedFile)
            const content = readFileSync(reportPath, 'utf-8')
            console.log(ansis.dim('─'.repeat(60)))
            console.log(content)
            console.log(ansis.dim('─'.repeat(60)))
          }
        }

        console.log(ansis.gray(`\n${isZh ? '目录' : 'Directory'}: ${postmortemDir}`))
        console.log(ansis.gray(`💡 ${isZh ? '运行 `ccjk postmortem init` 从历史 fix commits 生成报告' : 'Run `ccjk postmortem init` to generate reports from fix commits'}`))
      }
      else {
        console.log(ansis.yellow(`\n⚠️ ${isZh ? 'Postmortem 目录不存在' : 'Postmortem directory does not exist'}`))
        console.log(ansis.gray(`💡 ${isZh ? '运行 `ccjk postmortem init` 初始化 Postmortem 系统' : 'Run `ccjk postmortem init` to initialize the Postmortem system'}`))
      }
      break
    }

    case 'editGlobalClaudeMd': {
      // Determine editor
      const editor = nodeProcess.default.env.EDITOR || nodeProcess.default.env.VISUAL || 'vi'

      if (!existsSync(globalClaudeMdPath)) {
        // Create directory if needed
        const claudeDir = join(homedir(), '.claude')
        const { mkdirSync } = await import('node:fs')
        if (!existsSync(claudeDir)) {
          mkdirSync(claudeDir, { recursive: true })
        }
        // Create empty file
        writeFileSync(globalClaudeMdPath, `# Claude Global Memory\n\n<!-- Add your global instructions here -->\n`)
        console.log(ansis.green(`✅ ${isZh ? '已创建全局 CLAUDE.md' : 'Created global CLAUDE.md'}`))
      }

      console.log(ansis.green(`\n📝 ${isZh ? '正在打开编辑器...' : 'Opening editor...'}`))
      console.log(ansis.gray(`${isZh ? '编辑器' : 'Editor'}: ${editor}`))
      console.log(ansis.gray(`${isZh ? '文件' : 'File'}: ${globalClaudeMdPath}`))

      try {
        execSync(`${editor} "${globalClaudeMdPath}"`, { stdio: 'inherit' })
        console.log(ansis.green(`\n✅ ${isZh ? '编辑完成' : 'Edit complete'}`))
      }
      catch {
        console.log(ansis.yellow(`\n⚠️ ${isZh ? '编辑器退出' : 'Editor exited'}`))
      }
      break
    }

    case 'language': {
      const zcfConfig = readZcfConfig()
      const existingLang = zcfConfig?.aiOutputLang

      // Show existing language configuration if any
      if (existingLang) {
        console.log(
          `\n${
            ansis.green(`ℹ ${i18n.t('configuration:existingLanguageConfig') || 'Existing AI output language configuration'}`)}`,
        )
        console.log(ansis.gray(`  ${i18n.t('configuration:currentLanguage') || 'Current language'}: ${existingLang}\n`))

        const modify = await promptBoolean({
          message: i18n.t('configuration:modifyLanguage') || 'Modify AI output language?',
          defaultValue: false,
        })

        if (!modify) {
          console.log(ansis.green(`✔ ${i18n.t('configuration:keepLanguage') || 'Keeping existing language configuration'}`))
          return
        }
      }

      // Ask user to select language (don't use resolveAiOutputLanguage to avoid auto-skip)
      const { selectAiOutputLanguage } = await import('./prompts')
      const aiOutputLang = await selectAiOutputLanguage()

      applyAiLanguageDirective(aiOutputLang)
      updateZcfConfig({ aiOutputLang })
      console.log(ansis.green(`✔ ${i18n.t('configuration:aiLanguageConfigured') || 'AI output language configured'}`))
      break
    }

    case 'outputStyle': {
      await configureOutputStyle()
      break
    }
  }
}

// Change script language
export async function changeScriptLanguageFeature(currentLang: SupportedLang): Promise<SupportedLang> {
  ensureI18nInitialized()

  const { lang } = await inquirer.prompt<{ lang: SupportedLang }>({
    type: 'list',
    name: 'lang',
    message: i18n.t('language:selectScriptLang'),
    choices: addNumbersToChoices(
      SUPPORTED_LANGS.map(l => ({
        name: LANG_LABELS[l],
        value: l,
      })),
    ),
    default: SUPPORTED_LANGS.indexOf(currentLang),
  })

  if (!lang) {
    return currentLang
  }

  updateZcfConfig({ preferredLang: lang })

  await changeLanguage(lang)

  console.log(ansis.green(`✔ ${i18n.t('language:languageChanged') || 'Language changed'}`))

  return lang
}

// Configure Codex default model
export async function configureCodexDefaultModelFeature(): Promise<void> {
  ensureI18nInitialized()

  // Check for existing Codex configuration
  const { readCodexConfig } = await import('./code-tools/codex')
  const existingConfig = readCodexConfig()

  const currentModel = existingConfig?.model

  if (currentModel) {
    // Display existing configuration
    console.log(`\n${ansis.green(`ℹ ${i18n.t('configuration:existingModelConfig') || 'Existing model configuration'}`)}`)
    const modelDisplay = currentModel === 'gpt-5-codex'
      ? 'GPT-5-Codex'
      : currentModel === 'gpt-5'
        ? 'GPT-5'
        : currentModel.charAt(0).toUpperCase() + currentModel.slice(1)
    console.log(ansis.gray(`  ${i18n.t('configuration:currentModel') || 'Current model'}: ${modelDisplay}\n`))

    // Ask user what to do with existing config
    const modify = await promptBoolean({
      message: i18n.t('configuration:modifyModel') || 'Modify model configuration?',
      defaultValue: false,
    })

    if (!modify) {
      console.log(ansis.green(`✔ ${i18n.t('configuration:keepModel') || 'Keeping existing model configuration'}`))
      return
    }
  }

  const { model } = await inquirer.prompt<{ model: 'gpt-5' | 'gpt-5-codex' | 'custom' }>({
    type: 'list',
    name: 'model',
    message: i18n.t('configuration:selectDefaultModel') || 'Select default model',
    choices: addNumbersToChoices([
      {
        name: i18n.t('configuration:codexModelOptions.gpt5'),
        value: 'gpt-5' as const,
      },
      {
        name: i18n.t('configuration:codexModelOptions.gpt5Codex'),
        value: 'gpt-5-codex' as const,
      },
      {
        name: i18n.t('configuration:codexModelOptions.custom'),
        value: 'custom' as const,
      },
    ]),
    default: currentModel ? ['gpt-5', 'gpt-5-codex', 'custom'].indexOf(currentModel as any) : 1, // Default to gpt-5-codex
  })

  if (!model) {
    await handleCancellation()
    return
  }

  if (model === 'custom') {
    // Handle custom model input
    const { customModel } = await inquirer.prompt<{ customModel: string }>({
      type: 'input',
      name: 'customModel',
      message: `${i18n.t('configuration:enterCustomModel')}${i18n.t('common:emptyToSkip')}`,
      default: '',
    })

    if (!customModel.trim()) {
      console.log(ansis.yellow(`⚠ ${i18n.t('configuration:customModelSkipped') || 'Custom model configuration skipped'}`))
      return
    }

    // Update Codex config with custom model
    await updateCodexModelProvider(customModel.trim())
    console.log(ansis.green(`✔ ${i18n.t('configuration:customModelConfigured') || 'Custom model configuration completed'}`))
    return
  }

  // Update Codex config with selected model
  await updateCodexModelProvider(model)
  console.log(ansis.green(`✔ ${i18n.t('configuration:modelConfigured') || 'Default model configured'}`))
}

// Configure Codex AI memory (output language and system prompt style)
export async function configureCodexAiMemoryFeature(): Promise<void> {
  ensureI18nInitialized()

  const { option } = await inquirer.prompt<{ option: string }>({
    type: 'list',
    name: 'option',
    message: i18n.t('configuration:selectMemoryOption') || 'Select configuration option',
    choices: addNumbersToChoices([
      {
        name: i18n.t('configuration:configureAiLanguage') || 'Configure AI output language',
        value: 'language',
      },
      {
        name: i18n.t('configuration:configureSystemPromptStyle') || 'Configure global AI system prompt style',
        value: 'systemPrompt',
      },
    ]),
  })

  if (!option) {
    return
  }

  if (option === 'language') {
    const zcfConfig = readZcfConfig()
    const existingLang = zcfConfig?.aiOutputLang

    // Show existing language configuration if any
    if (existingLang) {
      console.log(
        `\n${
          ansis.green(`ℹ ${i18n.t('configuration:existingLanguageConfig') || 'Existing AI output language configuration'}`)
        }`,
      )
      console.log(ansis.gray(`  ${i18n.t('configuration:currentLanguage') || 'Current language'}: ${existingLang}\n`))

      const modify = await promptBoolean({
        message: i18n.t('configuration:modifyLanguage') || 'Modify AI output language?',
        defaultValue: false,
      })

      if (!modify) {
        console.log(ansis.green(`✔ ${i18n.t('configuration:keepLanguage') || 'Keeping existing language configuration'}`))

        // Even when not modifying, ensure AGENTS.md has language directive
        await ensureLanguageDirectiveInAgents(existingLang)
        return
      }
    }

    // Ask user to select language
    const { selectAiOutputLanguage } = await import('./prompts')
    const aiOutputLang = await selectAiOutputLanguage()

    // Update AGENTS.md with language directive
    await updateCodexLanguageDirective(aiOutputLang)
    updateZcfConfig({ aiOutputLang })
    console.log(ansis.green(`✔ ${i18n.t('configuration:aiLanguageConfigured') || 'AI output language configured'}`))
  }
  else if (option === 'systemPrompt') {
    // Get current AI output language from config
    const zcfConfig = readZcfConfig()
    const currentLang = zcfConfig?.aiOutputLang || 'English'

    // Regenerate system prompt with current language and style selection
    const { runCodexSystemPromptSelection } = await import('./code-tools/codex')
    await runCodexSystemPromptSelection()

    // Ensure language directive is preserved after system prompt change
    await ensureLanguageDirectiveInAgents(currentLang)

    console.log(ansis.green(`✔ ${i18n.t('configuration:systemPromptConfigured')}`))
  }
}

// Helper function to update Codex model provider
async function updateCodexModelProvider(modelProvider: string): Promise<void> {
  const { readCodexConfig, writeCodexConfig, backupCodexConfig, getBackupMessage } = await import('./code-tools/codex')

  // Create backup before modification
  const backupPath = backupCodexConfig()
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)))
  }

  // Read existing config
  const existingConfig = readCodexConfig()

  // Update model provider
  const updatedConfig = {
    ...existingConfig,
    model: modelProvider, // Set the model field
    modelProvider: existingConfig?.modelProvider || null, // Preserve existing API provider
    providers: existingConfig?.providers || [],
    mcpServices: existingConfig?.mcpServices || [],
    managed: true,
    otherConfig: existingConfig?.otherConfig || [],
    modelProviderCommented: existingConfig?.modelProviderCommented,
  }

  // Write updated config
  writeCodexConfig(updatedConfig)
}

// Helper function to ensure language directive exists in AGENTS.md
const LANG_DIRECTIVE_RE = /\*\*Most Important:\s*Always respond in [^*]+\*\*/i
const LANG_DIRECTIVE_RE_G = /\*\*Most Important:\s*Always respond in [^*]+\*\*\s*/g

const codexLanguageLabels: Record<string, string> = {
  'Chinese': 'Chinese-simplified',
  'English': 'English',
  'zh-CN': 'Chinese-simplified',
  'en': 'English',
}

/**
 * Set or update the language directive in Codex AGENTS.md.
 * mode='ensure' only adds if missing; mode='update' always replaces.
 */
async function setCodexLanguageDirective(aiOutputLang: string, mode: 'ensure' | 'update'): Promise<void> {
  const { readFile, writeFileAtomic, exists } = await import('./fs-operations')
  const { backupCodexAgents, getBackupMessage } = await import('./code-tools/codex')
  const { homedir } = await import('node:os')
  const { join } = await import('pathe')

  const CODEX_AGENTS_FILE = join(homedir(), '.codex', 'AGENTS.md')

  if (!exists(CODEX_AGENTS_FILE)) {
    console.log(ansis.yellow(i18n.t('codex:agentsFileNotFound')))
    return
  }

  let content = readFile(CODEX_AGENTS_FILE)
  const langLabel = codexLanguageLabels[aiOutputLang] || aiOutputLang

  if (mode === 'ensure' && LANG_DIRECTIVE_RE.test(content))
    return

  // Backup before modification
  const backupPath = backupCodexAgents()
  if (backupPath)
    console.log(ansis.gray(getBackupMessage(backupPath)))

  // Remove existing directive if present
  content = content.replace(LANG_DIRECTIVE_RE_G, '')

  if (!content.endsWith('\n'))
    content += '\n'
  content += `\n**Most Important:Always respond in ${langLabel}**\n`

  writeFileAtomic(CODEX_AGENTS_FILE, content)

  if (mode === 'ensure')
    console.log(ansis.gray(`  ${i18n.t('configuration:addedLanguageDirective')}: ${langLabel}`))
}

async function ensureLanguageDirectiveInAgents(aiOutputLang: string): Promise<void> {
  return setCodexLanguageDirective(aiOutputLang, 'ensure')
}

async function updateCodexLanguageDirective(aiOutputLang: string): Promise<void> {
  return setCodexLanguageDirective(aiOutputLang, 'update')
}

// Configure environment variables and permissions
export async function configureEnvPermissionFeature(): Promise<void> {
  ensureI18nInitialized()

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'list',
    name: 'choice',
    message: i18n.t('configuration:selectEnvPermissionOption') || 'Select option',
    choices: addNumbersToChoices([
      {
        name: `${i18n.t('configuration:importRecommendedEnv') || 'Import environment'} ${ansis.gray(
          `- ${i18n.t('configuration:importRecommendedEnvDesc') || 'Import env settings'}`,
        )}`,
        value: 'env',
      },
      {
        name: `${i18n.t('configuration:importRecommendedPermissions') || 'Import permissions'} ${ansis.gray(
          `- ${i18n.t('configuration:importRecommendedPermissionsDesc') || 'Import permission settings'}`,
        )}`,
        value: 'permissions',
      },
      {
        name: `${i18n.t('configuration:openSettingsJson') || 'Open settings'} ${ansis.gray(
          `- ${i18n.t('configuration:openSettingsJsonDesc') || 'View settings file'}`,
        )}`,
        value: 'open',
      },
    ]),
  })

  if (!choice) {
    await handleCancellation()
    return
  }

  try {
    switch (choice) {
      case 'env':
        await importRecommendedEnv()
        console.log(ansis.green(`✅ ${i18n.t('configuration:envImportSuccess')}`))
        break
      case 'permissions':
        await importRecommendedPermissions()
        console.log(ansis.green(`✅ ${i18n.t('configuration:permissionsImportSuccess') || 'Permissions imported'}`))
        break
      case 'open':
        console.log(ansis.green(i18n.t('configuration:openingSettingsJson') || 'Opening settings.json...'))
        await openSettingsJson()
        break
    }
  }
  catch (error: any) {
    console.error(ansis.red(`${i18n.t('common:error')}: ${error.message}`))
  }
}
