/**
 * Quick Provider Launch Command
 *
 * Enables fast API provider configuration via shortcodes.
 * Usage: npx ccjk <shortcode> (e.g., npx ccjk 302)
 *
 * @module commands/quick-provider
 */

import type { ProviderRegistry, QuickLaunchConfig, QuickLaunchOptions } from '../types/provider'
import ansis from 'ansis'
import inquirer from 'inquirer'
import ora from 'ora'
import { getProviderRegistry } from '../services/provider-registry'
import { isValidApiUrl } from '../types/provider'

// ============================================================================
// Constants
// ============================================================================

const KNOWN_COMMANDS = new Set([
  // Core commands
  '',
  'init',
  'update',
  'doctor',
  'help',
  'menu',
  // Quick setup commands (must be before 'quick' deprecated)
  'quick-setup',
  'quick',
  'qs',
  // Extended commands
  'serve',
  'mcp',
  'browser',
  'interview',
  'commit',
  'config',
  'daemon',
  'providers',
  'task',
  'tasks',
  'keybinding',
  'kb',
  'history',
  'hist',
  'ccr',
  'vim',
  'permissions',
  'perm',
  'zero-config',
  'zc',
  'skills',
  'sk',
  'skill',
  'agent',
  'ag',
  'ccu',
  'stats',
  'uninstall',
  'check-updates',
  'check',
  'config-switch',
  'cs',
  'workflows',
  'wf',
  'notification',
  'notify',
  'session',
  'context',
  'ctx',
  'api',
  'team',
  'thinking',
  'think',
  'agent-teams',
  'teams',
  'postmortem',
  'pm',
  'claude',
  'monitor',
  'paradigm',
  'trace',
  'status',
  'st',
  'boost',
  'evolution',
  // CCJK v8 commands
  'ccjk:mcp',
  'ccjk-mcp',
  'ccjk:skills',
  'ccjk-skills',
  'ccjk:agents',
  'ccjk-agents',
  'ccjk:hooks',
  'ccjk-hooks',
  'ccjk:all',
  'ccjk-all',
  'ccjk:setup',
  'ccjk-setup',
  // Special commands
  'cloud',
  'system',
  'sys',
  'plugin',
  'completion',
  // Deprecated but still recognized
  'skills-sync',
  'agents-sync',
  'marketplace',
  'deep',
  'setup',
  'sync',
  'versions',
  'upgrade',
  'config-scan',
  'workspace',
])

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a string is a known CLI command
 */
export function isKnownCommand(arg: string): boolean {
  if (!arg)
    return true
  if (arg.startsWith('-'))
    return true // Options are not shortcodes
  return KNOWN_COMMANDS.has(arg.toLowerCase())
}

/**
 * Check if a string could be a provider shortcode
 */
export function couldBeShortcode(arg: string): boolean {
  if (!arg)
    return false
  if (arg.startsWith('-'))
    return false
  if (isKnownCommand(arg))
    return false
  // Basic format check (2-20 chars, alphanumeric with hyphens)
  return /^[a-z0-9][a-z0-9-]{0,18}[a-z0-9]?$/i.test(arg)
}

// ============================================================================
// Main Quick Launch Function
// ============================================================================

/**
 * Quick provider launch entry point
 *
 * Handles the `npx ccjk <shortcode>` flow:
 * 1. Query cloud registry for shortcode
 * 2. If found: confirm and configure
 * 3. If not found: offer to create
 *
 * @param shortcode - Provider shortcode (e.g., "302", "glm")
 * @param options - Launch options
 * @returns true if handled, false to fall through to menu
 */
export async function quickProviderLaunch(
  shortcode: string,
  options: QuickLaunchOptions = {},
): Promise<boolean> {
  const registry = getProviderRegistry()
  const normalizedCode = shortcode.toLowerCase().trim()

  console.log() // Empty line for spacing

  // Show lookup spinner
  const spinner = ora({
    text: ansis.gray(`正在查询供应商 "${normalizedCode}"...`),
    color: 'cyan',
  }).start()

  try {
    const provider = await registry.getProvider(normalizedCode)
    spinner.stop()

    if (provider) {
      // Provider found - show confirmation flow
      return await handleExistingProvider(provider, options)
    }
    else {
      // Provider not found - offer to create
      return await handleNewProvider(normalizedCode, options)
    }
  }
  catch (error) {
    spinner.fail(ansis.red('查询失败'))
    console.error(ansis.gray(error instanceof Error ? error.message : '网络错误'))
    return false
  }
}

// ============================================================================
// Existing Provider Flow
// ============================================================================

/**
 * Handle existing provider confirmation and configuration
 */
async function handleExistingProvider(
  provider: ProviderRegistry,
  options: QuickLaunchOptions,
): Promise<boolean> {
  // Display provider info
  console.log(ansis.cyan.bold(`\n🚀 快速配置: ${provider.name}`))
  console.log(ansis.gray('─'.repeat(40)))
  console.log(`   ${ansis.yellow('短码:')} ${provider.shortcode}`)
  console.log(`   ${ansis.yellow('API URL:')} ${provider.apiUrl}`)
  if (provider.description) {
    console.log(`   ${ansis.yellow('描述:')} ${provider.description}`)
  }
  if (provider.verified) {
    console.log(`   ${ansis.green('✓')} 官方验证`)
  }
  console.log()

  // Confirm usage
  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message: `是否使用 ${ansis.cyan(provider.name)} 作为 API 供应商?`,
      default: true,
    },
  ])

  if (!confirmed) {
    console.log(ansis.gray('\n已取消，进入主菜单...\n'))
    return false // Fall through to main menu
  }

  // Configure API key and model
  const config = await configureProvider(provider, options)

  if (config) {
    await saveProviderConfig(config)
    showSuccessMessage(config)
    return true
  }

  return false
}

// ============================================================================
// New Provider Flow
// ============================================================================

/**
 * Handle new provider creation flow
 */
async function handleNewProvider(
  shortcode: string,
  options: QuickLaunchOptions,
): Promise<boolean> {
  console.log(ansis.yellow(`\n⚠️  供应商 "${shortcode}" 尚未注册`))
  console.log(ansis.gray('该短码在云端注册表中不存在\n'))

  const { createNew } = await inquirer.prompt<{ createNew: boolean }>([
    {
      type: 'confirm',
      name: 'createNew',
      message: '是否创建该供应商?',
      default: false,
    },
  ])

  if (!createNew) {
    console.log(ansis.gray('\n已取消，进入主菜单...\n'))
    return false
  }

  // Collect provider info
  const { name, apiUrl } = await inquirer.prompt<{ name: string, apiUrl: string }>([
    {
      type: 'input',
      name: 'name',
      message: '供应商名称:',
      default: shortcode.toUpperCase(),
      validate: (value: string) => {
        if (!value.trim())
          return '名称不能为空'
        if (value.length > 50)
          return '名称过长（最多50字符）'
        return true
      },
    },
    {
      type: 'input',
      name: 'apiUrl',
      message: 'API URL (如 https://api.example.com/v1):',
      validate: (value: string) => {
        if (!value.trim())
          return 'URL 不能为空'
        if (!isValidApiUrl(value))
          return '请输入有效的 URL（http:// 或 https://）'
        return true
      },
    },
  ])

  // Create in cloud registry
  const spinner = ora('正在注册供应商...').start()

  try {
    const registry = getProviderRegistry()
    const result = await registry.createProvider({
      shortcode,
      name: name.trim(),
      apiUrl: apiUrl.trim(),
    })

    if (result.success && result.data) {
      spinner.succeed(ansis.green('供应商注册成功!'))

      // Continue to configuration
      const config = await configureProvider(result.data, options)
      if (config) {
        await saveProviderConfig(config)
        showSuccessMessage(config)
        return true
      }
    }
    else {
      spinner.fail(ansis.red('注册失败'))
      console.error(ansis.gray(result.error?.message || '未知错误'))

      // Offer to continue with local config anyway
      const { continueLocal } = await inquirer.prompt<{ continueLocal: boolean }>([
        {
          type: 'confirm',
          name: 'continueLocal',
          message: '是否仍然使用此配置（仅本地）?',
          default: true,
        },
      ])

      if (continueLocal) {
        const localProvider: ProviderRegistry = {
          shortcode,
          name: name.trim(),
          apiUrl: apiUrl.trim(),
          verified: false,
          createdAt: new Date().toISOString(),
        }

        const config = await configureProvider(localProvider, options)
        if (config) {
          await saveProviderConfig(config)
          showSuccessMessage(config)
          return true
        }
      }
    }
  }
  catch (error) {
    spinner.fail(ansis.red('注册失败'))
    console.error(ansis.gray(error instanceof Error ? error.message : '网络错误'))
  }

  return false
}

// ============================================================================
// Configuration Flow
// ============================================================================

/**
 * Configure API key and model for a provider
 */
async function configureProvider(
  provider: ProviderRegistry,
  _options: QuickLaunchOptions,
): Promise<QuickLaunchConfig | null> {
  console.log(ansis.cyan('\n📝 配置 API 凭证'))
  console.log(ansis.gray('─'.repeat(40)))

  // Get API key
  const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
    {
      type: 'password',
      name: 'apiKey',
      message: 'API Key:',
      mask: '*',
      validate: (value: string) => {
        if (!value.trim())
          return 'API Key 不能为空'
        if (value.length < 10)
          return 'API Key 格式不正确'
        return true
      },
    },
  ])

  // Select or input model
  let model: string

  if (provider.models && provider.models.length > 0) {
    // Provider has recommended models - show selection
    const { modelChoice } = await inquirer.prompt<{ modelChoice: string }>([
      {
        type: 'list',
        name: 'modelChoice',
        message: '选择模型:',
        choices: [
          ...provider.models.map(m => ({
            name: m,
            value: m,
          })),
          {
            name: ansis.gray('自定义...'),
            value: '__custom__',
          },
        ],
      },
    ])

    if (modelChoice === '__custom__') {
      const { customModel } = await inquirer.prompt<{ customModel: string }>([
        {
          type: 'input',
          name: 'customModel',
          message: '输入模型名称:',
          validate: (value: string) => {
            if (!value.trim())
              return '模型名称不能为空'
            return true
          },
        },
      ])
      model = customModel
    }
    else {
      model = modelChoice
    }
  }
  else {
    // No recommended models - ask for input
    const { inputModel } = await inquirer.prompt<{ inputModel: string }>([
      {
        type: 'input',
        name: 'inputModel',
        message: '模型名称 (如 gpt-4, claude-3-opus):',
        default: 'gpt-4',
        validate: (value: string) => {
          if (!value.trim())
            return '模型名称不能为空'
          return true
        },
      },
    ])
    model = inputModel
  }

  return {
    shortcode: provider.shortcode,
    provider,
    apiKey: apiKey.trim(),
    model: model.trim(),
  }
}

// ============================================================================
// Save Configuration
// ============================================================================

/**
 * Save provider configuration to Claude Code settings
 */
async function saveProviderConfig(config: QuickLaunchConfig): Promise<void> {
  const spinner = ora('正在保存配置...').start()

  try {
    // Import the configuration utilities
    const { readJsonFile, writeJsonFile } = await import('../utils/fs-operations')
    const { join } = await import('pathe')
    const { homedir } = await import('node:os')
    const { existsSync, mkdirSync } = await import('node:fs')

    // Get Claude Code settings path (~/.claude/settings.json)
    const claudeDir = join(homedir(), '.claude')
    const settingsPath = join(claudeDir, 'settings.json')

    // Ensure directory exists
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true })
    }

    // Read existing settings or create new
    let settings: Record<string, unknown> = {}
    try {
      if (existsSync(settingsPath)) {
        settings = readJsonFile(settingsPath) || {}
      }
    }
    catch {
      // File doesn't exist or invalid, use empty object
    }

    // Update API configuration
    settings.apiProvider = 'custom'
    settings.apiUrl = config.provider.apiUrl
    settings.apiKey = config.apiKey
    settings.model = config.model

    // Also set environment variables for compatibility
    const envConfig = {
      ANTHROPIC_BASE_URL: config.provider.apiUrl,
      ANTHROPIC_API_KEY: config.apiKey,
      ANTHROPIC_MODEL: config.model,
    }

    // Merge env config
    settings.env = {
      ...(settings.env as Record<string, string> || {}),
      ...envConfig,
    }

    // Write settings
    writeJsonFile(settingsPath, settings)

    spinner.succeed(ansis.green('配置已保存'))
  }
  catch (error) {
    spinner.fail(ansis.red('保存失败'))

    // Fallback: show manual configuration instructions
    console.log(ansis.yellow('\n请手动配置:'))
    console.log(ansis.gray('─'.repeat(40)))
    console.log(`${ansis.cyan('API URL:')} ${config.provider.apiUrl}`)
    console.log(`${ansis.cyan('Model:')} ${config.model}`)
    console.log(ansis.gray('\n运行 "ccjk api" 进行手动配置'))

    throw error
  }
}

// ============================================================================
// Success Message
// ============================================================================

/**
 * Show success message after configuration
 */
function showSuccessMessage(config: QuickLaunchConfig): void {
  console.log()
  console.log(ansis.green.bold('✅ 配置完成!'))
  console.log(ansis.gray('─'.repeat(40)))
  console.log(`   ${ansis.yellow('供应商:')} ${config.provider.name}`)
  console.log(`   ${ansis.yellow('API URL:')} ${config.provider.apiUrl}`)
  console.log(`   ${ansis.yellow('模型:')} ${config.model}`)
  console.log()
  console.log(ansis.gray('现在可以开始使用 Claude Code 了'))
  console.log(ansis.gray('运行 "claude" 启动对话'))
  console.log()
}

// ============================================================================
// Exports
// ============================================================================

export {
  configureProvider,
  handleExistingProvider,
  handleNewProvider,
  saveProviderConfig,
}
