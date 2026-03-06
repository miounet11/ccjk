/**
 * API CLI - Non-interactive API configuration
 * Extends existing api.ts with full CLI support
 */

import type { SupportedLang } from '../constants'
import ansis from 'ansis'
import { i18n } from '../i18n'
import { getAllPresets } from '../utils/api-router'
import { configureApi, getExistingApiConfig } from '../utils/config'

export interface ApiConfigureOptions {
  provider?: string
  key?: string
  url?: string
  model?: string
  fastModel?: string
  interactive?: boolean
  yes?: boolean
  lang?: SupportedLang
}

export interface ApiSwitchOptions {
  lang?: SupportedLang
}

export interface ApiListOptions {
  json?: boolean
  lang?: SupportedLang
}

/**
 * Configure API settings non-interactively
 */
export async function apiConfigure(options: ApiConfigureOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  // Interactive mode - delegate to existing wizard
  if (options.interactive !== false && !options.provider) {
    const { runConfigWizard } = await import('../utils/api-router')
    await runConfigWizard(lang)
    return
  }

  // Non-interactive mode - require provider
  if (!options.provider) {
    console.log(ansis.red(isZh ? '错误: 必须指定 --provider' : 'Error: --provider is required'))
    console.log(ansis.dim(isZh
      ? '用法: ccjk api configure --provider <name> --key <key>'
      : 'Usage: ccjk api configure --provider <name> --key <key>'))
    process.exit(1)
  }

  // Find provider preset
  const presets = getAllPresets()
  const preset = presets.find(p =>
    p.id === options.provider
    || p.name.toLowerCase() === options.provider?.toLowerCase(),
  )

  if (!preset) {
    console.log(ansis.red(isZh
      ? `错误: 未知的提供商 "${options.provider}"`
      : `Error: Unknown provider "${options.provider}"`))
    console.log(ansis.dim(isZh
      ? '提示: 使用 ccjk api list 查看可用提供商'
      : 'Tip: Use ccjk api list to see available providers'))
    process.exit(1)
  }

  // Require API key if provider requires it
  if (preset.requiresApiKey && !options.key) {
    console.log(ansis.red(isZh ? '错误: 必须指定 --key' : 'Error: --key is required'))
    process.exit(1)
  }

  // Confirm if not --yes
  if (!options.yes) {
    const inquirer = await import('inquirer')
    const { confirm } = await inquirer.default.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: isZh
        ? `确认配置 ${preset.name}?`
        : `Configure ${preset.name}?`,
      default: true,
    }])

    if (!confirm) {
      console.log(ansis.yellow(isZh ? '已取消' : 'Cancelled'))
      return
    }
  }

  // Build config
  const config: any = {
    type: 'api_key',
    apiKey: options.key,
    apiUrl: options.url || preset.baseUrl,
    model: options.model || preset.defaultModel,
  }

  if (options.fastModel) {
    config.fastModel = options.fastModel
  }

  // Apply configuration
  const result = configureApi(config)

  if (result) {
    console.log(ansis.green(isZh
      ? `✓ 已配置 ${preset.name}`
      : `✓ Configured ${preset.name}`))
    console.log(ansis.dim(isZh
      ? '提示: 重启 Claude Code 以应用更改'
      : 'Tip: Restart Claude Code to apply changes'))
  }
  else {
    console.log(ansis.red(isZh ? '✗ 配置失败' : '✗ Configuration failed'))
    process.exit(1)
  }
}

/**
 * List API configurations
 */
export async function apiList(options: ApiListOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  const config = getExistingApiConfig()

  if (options.json) {
    console.log(JSON.stringify({
      current: config,
      available: getAllPresets().map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        requiresApiKey: p.requiresApiKey,
      })),
    }, null, 2))
    return
  }

  // Text output
  console.log('')
  console.log(ansis.bold.cyan(isZh ? '📋 API 配置' : '📋 API Configuration'))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')

  if (config) {
    console.log(ansis.green(isZh ? '当前配置:' : 'Current configuration:'))
    const apiUrl = (config as any).apiUrl
    const model = (config as any).model
    if (apiUrl) {
      console.log(`  ${ansis.dim('URL:')} ${apiUrl}`)
    }
    if (model) {
      console.log(`  ${ansis.dim('Model:')} ${model}`)
    }
  }
  else {
    console.log(ansis.yellow(isZh ? '未配置 API' : 'No API configured'))
  }

  console.log('')
  console.log(ansis.dim(isZh
    ? '提示: 使用 ccjk api configure --provider <name> 配置 API'
    : 'Tip: Use ccjk api configure --provider <name> to configure API'))
}
