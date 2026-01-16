/**
 * CCJK Config Command
 * Enhanced configuration management - get, set, list, reset
 */

import type { CodeToolType } from '../constants'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { getApiProviderPresets } from '../config/api-providers'
import { SETTINGS_FILE } from '../constants'
import { i18n } from '../i18n'
import { backupExistingConfig } from '../utils/config'

export interface ConfigOptions {
  lang?: string
  codeType?: CodeToolType
  global?: boolean
  json?: boolean
}

/**
 * Get configuration value
 */
export async function getConfig(key: string, options: ConfigOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  try {
    const config = readClaudeConfig()

    if (!config) {
      console.log(ansis.yellow(isZh ? '⚠️  配置文件不存在' : '⚠️  Configuration file not found'))
      console.log(ansis.dim(isZh ? '运行 "ccjk init" 初始化配置' : 'Run "ccjk init" to initialize configuration'))
      console.log('')
      return
    }

    // Parse key path (e.g., "mcpServers.filesystem.command")
    const value = getNestedValue(config, key)

    if (value === undefined) {
      console.log(ansis.yellow(isZh ? `⚠️  配置项 "${key}" 不存在` : `⚠️  Configuration key "${key}" not found`))
      console.log('')
      return
    }

    // Display value
    if (options.json) {
      console.log(JSON.stringify(value, null, 2))
    }
    else {
      console.log('')
      console.log(ansis.bold.cyan(isZh ? `📋 配置项: ${key}` : `📋 Configuration: ${key}`))
      console.log(ansis.dim('─'.repeat(60)))
      console.log('')
      displayValue(value, 0)
      console.log('')
    }
  }
  catch (error) {
    console.error(ansis.red(isZh ? '❌ 读取配置失败' : '❌ Failed to read configuration'))
    if (error instanceof Error) {
      console.error(ansis.dim(error.message))
    }
    console.log('')
  }
}

/**
 * Set configuration value
 */
export async function setConfig(key: string, value: string, _options: ConfigOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  try {
    const config = readClaudeConfig()

    if (!config) {
      console.log(ansis.yellow(isZh ? '⚠️  配置文件不存在' : '⚠️  Configuration file not found'))
      console.log(ansis.dim(isZh ? '运行 "ccjk init" 初始化配置' : 'Run "ccjk init" to initialize configuration'))
      console.log('')
      return
    }

    // Backup existing config
    const backupPath = backupExistingConfig()
    if (backupPath) {
      console.log(ansis.dim(isZh ? `📦 已备份配置到: ${backupPath}` : `📦 Configuration backed up to: ${backupPath}`))
    }

    // Parse value (try JSON first, then string)
    let parsedValue: any = value
    try {
      parsedValue = JSON.parse(value)
    }
    catch {
      // Keep as string
    }

    // Set nested value
    setNestedValue(config, key, parsedValue)

    // Write config
    writeClaudeConfig(config)

    console.log('')
    console.log(ansis.green(isZh ? `✅ 配置项 "${key}" 已更新` : `✅ Configuration "${key}" updated`))
    console.log('')
    console.log(ansis.bold(isZh ? '新值:' : 'New value:'))
    displayValue(parsedValue, 0)
    console.log('')
  }
  catch (error) {
    console.error(ansis.red(isZh ? '❌ 设置配置失败' : '❌ Failed to set configuration'))
    if (error instanceof Error) {
      console.error(ansis.dim(error.message))
    }
    console.log('')
  }
}

/**
 * List all configuration
 */
export async function listConfig(options: ConfigOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  try {
    const config = readClaudeConfig()

    if (!config) {
      console.log(ansis.yellow(isZh ? '⚠️  配置文件不存在' : '⚠️  Configuration file not found'))
      console.log(ansis.dim(isZh ? '运行 "ccjk init" 初始化配置' : 'Run "ccjk init" to initialize configuration'))
      console.log('')
      return
    }

    if (options.json) {
      console.log(JSON.stringify(config, null, 2))
      return
    }

    console.log('')
    console.log(ansis.bold.cyan(isZh ? '📋 Claude Code 配置' : '📋 Claude Code Configuration'))
    console.log(ansis.dim('─'.repeat(60)))
    console.log('')

    // Display key sections
    displayConfigSection(isZh ? 'API 配置' : 'API Configuration', {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey ? '***' : undefined,
      authToken: config.authToken ? '***' : undefined,
      model: config.model,
      fastModel: config.fastModel,
    }, isZh)

    if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
      displayConfigSection(isZh ? 'MCP 服务' : 'MCP Services', {
        count: Object.keys(config.mcpServers).length,
        services: Object.keys(config.mcpServers),
      }, isZh)
    }

    if (config.customInstructions) {
      displayConfigSection(isZh ? '自定义指令' : 'Custom Instructions', {
        length: config.customInstructions.length,
        preview: `${config.customInstructions.substring(0, 100)}...`,
      }, isZh)
    }

    console.log('')
    console.log(ansis.dim('─'.repeat(60)))
    console.log(ansis.dim(isZh ? `配置文件: ${SETTINGS_FILE}` : `Config file: ${SETTINGS_FILE}`))
    console.log('')
  }
  catch (error) {
    console.error(ansis.red(isZh ? '❌ 读取配置失败' : '❌ Failed to read configuration'))
    if (error instanceof Error) {
      console.error(ansis.dim(error.message))
    }
    console.log('')
  }
}

/**
 * Reset configuration
 */
export async function resetConfig(_options: ConfigOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  try {
    const config = readClaudeConfig()

    if (!config) {
      console.log(ansis.yellow(isZh ? '⚠️  配置文件不存在' : '⚠️  Configuration file not found'))
      console.log('')
      return
    }

    // Confirm reset
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: isZh ? '确定要重置配置吗？这将删除所有自定义设置。' : 'Are you sure you want to reset configuration? This will remove all custom settings.',
      default: false,
    })

    if (!confirm) {
      console.log(ansis.yellow(isZh ? '已取消' : 'Cancelled'))
      console.log('')
      return
    }

    // Backup existing config
    const backupPath = backupExistingConfig()
    if (backupPath) {
      console.log(ansis.dim(isZh ? `📦 已备份配置到: ${backupPath}` : `📦 Configuration backed up to: ${backupPath}`))
    }

    // Create minimal config
    const minimalConfig = {
      completedOnboarding: true,
    }

    writeClaudeConfig(minimalConfig)

    console.log('')
    console.log(ansis.green(isZh ? '✅ 配置已重置' : '✅ Configuration reset'))
    console.log(ansis.dim(isZh ? '运行 "ccjk init" 重新配置' : 'Run "ccjk init" to reconfigure'))
    console.log('')
  }
  catch (error) {
    console.error(ansis.red(isZh ? '❌ 重置配置失败' : '❌ Failed to reset configuration'))
    if (error instanceof Error) {
      console.error(ansis.dim(error.message))
    }
    console.log('')
  }
}

/**
 * Set provider configuration
 */
export async function setProvider(providerId: string, options: ConfigOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const codeType = (options.codeType || 'claude-code') as CodeToolType

  try {
    // Get available providers
    const providers = await getApiProviderPresets(codeType)
    const provider = providers.find(p => p.id === providerId)

    if (!provider) {
      console.log(ansis.yellow(isZh ? `⚠️  供应商 "${providerId}" 不存在` : `⚠️  Provider "${providerId}" not found`))
      console.log('')
      console.log(ansis.dim(isZh ? '可用的供应商:' : 'Available providers:'))
      for (const p of providers) {
        console.log(`  - ${p.id} (${p.name})`)
      }
      console.log('')
      return
    }

    const config = readClaudeConfig()

    if (!config) {
      console.log(ansis.yellow(isZh ? '⚠️  配置文件不存在' : '⚠️  Configuration file not found'))
      console.log(ansis.dim(isZh ? '运行 "ccjk init" 初始化配置' : 'Run "ccjk init" to initialize configuration'))
      console.log('')
      return
    }

    // Backup existing config
    const backupPath = backupExistingConfig()
    if (backupPath) {
      console.log(ansis.dim(isZh ? `📦 已备份配置到: ${backupPath}` : `📦 Configuration backed up to: ${backupPath}`))
    }

    // Update config based on code tool type
    if (codeType === 'claude-code' && provider.claudeCode) {
      config.baseUrl = provider.claudeCode.baseUrl

      // Set default models if available
      if (provider.claudeCode.defaultModels && provider.claudeCode.defaultModels.length > 0) {
        config.model = provider.claudeCode.defaultModels[0]
        if (provider.claudeCode.defaultModels.length > 1) {
          config.fastModel = provider.claudeCode.defaultModels[1]
        }
      }
    }

    // Write config
    writeClaudeConfig(config)

    console.log('')
    console.log(ansis.green(isZh ? `✅ 已切换到供应商: ${provider.name}` : `✅ Switched to provider: ${provider.name}`))
    console.log('')
    console.log(ansis.bold(isZh ? '配置详情:' : 'Configuration details:'))
    console.log(`  ${ansis.green(isZh ? '供应商' : 'Provider')}: ${provider.name}`)
    console.log(`  ${ansis.green(isZh ? '接口地址' : 'Base URL')}: ${config.baseUrl}`)
    if (config.model) {
      console.log(`  ${ansis.green(isZh ? '主模型' : 'Primary Model')}: ${config.model}`)
    }
    if (config.fastModel) {
      console.log(`  ${ansis.green(isZh ? '快速模型' : 'Fast Model')}: ${config.fastModel}`)
    }
    console.log('')
    console.log(ansis.dim(isZh ? '💡 提示: 请确保已设置正确的 API 密钥或认证令牌' : '💡 Tip: Make sure to set the correct API key or auth token'))
    console.log('')
  }
  catch (error) {
    console.error(ansis.red(isZh ? '❌ 设置供应商失败' : '❌ Failed to set provider'))
    if (error instanceof Error) {
      console.error(ansis.dim(error.message))
    }
    console.log('')
  }
}

/**
 * Main config command handler
 */
export async function configCommand(action: string, args: string[], options: ConfigOptions = {}): Promise<void> {
  switch (action) {
    case 'get':
      if (args.length === 0) {
        const isZh = i18n.language === 'zh-CN'
        console.log(ansis.yellow(isZh ? '⚠️  请指定配置项' : '⚠️  Please specify a configuration key'))
        console.log(ansis.dim(isZh ? '用法: ccjk config get <key>' : 'Usage: ccjk config get <key>'))
        console.log('')
        return
      }
      await getConfig(args[0], options)
      break

    case 'set':
      if (args.length < 2) {
        const isZh = i18n.language === 'zh-CN'
        console.log(ansis.yellow(isZh ? '⚠️  请指定配置项和值' : '⚠️  Please specify key and value'))
        console.log(ansis.dim(isZh ? '用法: ccjk config set <key> <value>' : 'Usage: ccjk config set <key> <value>'))
        console.log('')
        return
      }
      await setConfig(args[0], args.slice(1).join(' '), options)
      break

    case 'list':
    case 'ls':
      await listConfig(options)
      break

    case 'reset':
      await resetConfig(options)
      break

    case 'provider':
      if (args.length === 0) {
        const isZh = i18n.language === 'zh-CN'
        console.log(ansis.yellow(isZh ? '⚠️  请指定供应商 ID' : '⚠️  Please specify provider ID'))
        console.log(ansis.dim(isZh ? '用法: ccjk config provider <id>' : 'Usage: ccjk config provider <id>'))
        console.log('')
        return
      }
      await setProvider(args[0], options)
      break

    default: {
      // Show help
      const isZh = i18n.language === 'zh-CN'
      console.log('')
      console.log(ansis.bold.cyan(isZh ? '⚙️  配置管理命令' : '⚙️  Configuration Management Commands'))
      console.log('')
      console.log(`  ${ansis.green('ccjk config get <key>')}           ${isZh ? '获取配置项' : 'Get configuration value'}`)
      console.log(`  ${ansis.green('ccjk config set <key> <value>')}  ${isZh ? '设置配置项' : 'Set configuration value'}`)
      console.log(`  ${ansis.green('ccjk config list')}                ${isZh ? '列出所有配置' : 'List all configuration'}`)
      console.log(`  ${ansis.green('ccjk config reset')}               ${isZh ? '重置配置' : 'Reset configuration'}`)
      console.log(`  ${ansis.green('ccjk config provider <id>')}      ${isZh ? '切换供应商' : 'Switch provider'}`)
      console.log('')
      console.log(ansis.bold(isZh ? '选项' : 'Options'))
      console.log(`  ${ansis.green('--code-type, -T')} <type>   ${isZh ? '代码工具类型 (claude-code, codex)' : 'Code tool type (claude-code, codex)'}`)
      console.log(`  ${ansis.green('--json, -j')}               ${isZh ? 'JSON 格式输出' : 'JSON format output'}`)
      console.log('')
      console.log(ansis.bold(isZh ? '示例' : 'Examples'))
      console.log(`  ${ansis.dim('ccjk config get baseUrl')}`)
      console.log(`  ${ansis.dim('ccjk config set model "claude-3-5-sonnet-20241022"')}`)
      console.log(`  ${ansis.dim('ccjk config provider glm')}`)
      console.log('')
    }
  }
}

// Helper functions

/**
 * Get Claude configuration file path
 */
function getClaudeConfigPath(): string {
  return SETTINGS_FILE
}

/**
 * Read Claude configuration
 */
function readClaudeConfig(): any | null {
  if (!existsSync(SETTINGS_FILE)) {
    return null
  }

  try {
    const content = readFileSync(SETTINGS_FILE, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return null
  }
}

/**
 * Write Claude configuration
 */
function writeClaudeConfig(config: any): void {
  writeFileSync(SETTINGS_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * Get nested value from object
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[key]
  }

  return current
}

/**
 * Set nested value in object
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
}

/**
 * Display value with proper formatting
 */
function displayValue(value: any, indent: number): void {
  const prefix = '  '.repeat(indent)

  if (value === null) {
    console.log(`${prefix}${ansis.dim('null')}`)
  }
  else if (typeof value === 'boolean') {
    console.log(`${prefix}${ansis.green(value.toString())}`)
  }
  else if (typeof value === 'number') {
    console.log(`${prefix}${ansis.yellow(value.toString())}`)
  }
  else if (typeof value === 'string') {
    console.log(`${prefix}${ansis.green(value)}`)
  }
  else if (Array.isArray(value)) {
    console.log(`${prefix}${ansis.dim('[')}`)
    for (const item of value) {
      displayValue(item, indent + 1)
    }
    console.log(`${prefix}${ansis.dim(']')}`)
  }
  else if (typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      console.log(`${prefix}${ansis.bold(key)}:`)
      displayValue(val, indent + 1)
    }
  }
  else {
    console.log(`${prefix}${value}`)
  }
}

/**
 * Display configuration section
 */
function displayConfigSection(title: string, data: any, _isZh: boolean): void {
  console.log(ansis.bold(title))
  console.log('')

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        console.log(`  ${ansis.green(key)}: ${value.join(', ')}`)
      }
      else {
        console.log(`  ${ansis.green(key)}: ${value}`)
      }
    }
  }

  console.log('')
}

/**
 * Unset a configuration value
 */
export async function unsetConfig(key: string, _options: ConfigOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  if (!key) {
    console.log(ansis.yellow(isZh ? '⚠️  请指定配置项' : '⚠️  Please specify a configuration key'))
    return
  }

  const config = readClaudeConfig()
  const keys = key.split('.')
  let current: any = config

  // Navigate to parent
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === undefined) {
      console.log(ansis.yellow(isZh ? `⚠️  配置项 "${key}" 不存在` : `⚠️  Configuration key "${key}" does not exist`))
      return
    }
    current = current[keys[i]]
  }

  const lastKey = keys[keys.length - 1]
  if (current[lastKey] === undefined) {
    console.log(ansis.yellow(isZh ? `⚠️  配置项 "${key}" 不存在` : `⚠️  Configuration key "${key}" does not exist`))
    return
  }

  delete current[lastKey]
  writeClaudeConfig(config)

  console.log(ansis.green(isZh ? `✅ 已删除配置项: ${key}` : `✅ Removed configuration: ${key}`))
}

/**
 * Open config file in editor
 */
export async function editConfig(_options: ConfigOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const configPath = getClaudeConfigPath()

  const editor = process.env.EDITOR || process.env.VISUAL || 'vi'

  console.log(ansis.green(isZh ? `📝 正在打开配置文件: ${configPath}` : `📝 Opening config file: ${configPath}`))

  const { spawn } = await import('node:child_process')
  const child = spawn(editor, [configPath], { stdio: 'inherit' })

  child.on('exit', (code) => {
    if (code === 0) {
      console.log(ansis.green(isZh ? '✅ 配置文件已保存' : '✅ Config file saved'))
    }
  })
}

/**
 * Validate configuration
 */
export async function validateConfig(_options: ConfigOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  console.log(ansis.green(isZh ? '🔍 正在验证配置...' : '🔍 Validating configuration...'))
  console.log('')

  const config = readClaudeConfig()
  const errors: string[] = []
  const warnings: string[] = []

  // Check required fields
  if (!config.apiKey) {
    errors.push(isZh ? 'apiKey 未设置' : 'apiKey is not set')
  }

  if (!config.baseUrl) {
    warnings.push(isZh ? 'baseUrl 未设置，将使用默认值' : 'baseUrl is not set, will use default')
  }

  // Check model format
  if (config.model && typeof config.model !== 'string') {
    errors.push(isZh ? 'model 格式无效' : 'model format is invalid')
  }

  // Display results
  if (errors.length === 0 && warnings.length === 0) {
    console.log(ansis.green(isZh ? '✅ 配置验证通过' : '✅ Configuration is valid'))
  }
  else {
    if (errors.length > 0) {
      console.log(ansis.red(isZh ? '❌ 错误:' : '❌ Errors:'))
      for (const error of errors) {
        console.log(ansis.red(`  • ${error}`))
      }
      console.log('')
    }

    if (warnings.length > 0) {
      console.log(ansis.yellow(isZh ? '⚠️  警告:' : '⚠️  Warnings:'))
      for (const warning of warnings) {
        console.log(ansis.yellow(`  • ${warning}`))
      }
    }
  }
}
