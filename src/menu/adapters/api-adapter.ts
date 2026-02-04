/**
 * API 配置管理适配器
 *
 * 核心卖点：一键配置 API，开始使用 Claude
 *
 * 功能：
 * - 检测当前 API 配置状态
 * - 提供多种配置方式（官方登录、自定义、CCR、提供商选择）
 * - 与 api-providers 模块集成
 * - 支持配置切换和管理
 */

import type { ApiStatus } from '../types.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'pathe'

/**
 * 检测 API 配置状态
 */
export async function detectApiStatus(): Promise<ApiStatus> {
  // 检测环境变量
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      configured: true,
      mode: 'custom',
      provider: 'Anthropic',
    }
  }

  // 检测 Claude 配置文件
  const homeDir = process.env.HOME || process.env.USERPROFILE || ''
  const claudeConfigPath = join(homeDir, '.claude', 'config.json')

  if (existsSync(claudeConfigPath)) {
    try {
      const content = readFileSync(claudeConfigPath, 'utf-8')
      const config = JSON.parse(content)

      if (config.apiKey || config.api_key) {
        return {
          configured: true,
          mode: 'custom',
          provider: config.provider || 'Custom',
          baseUrl: config.baseUrl || config.base_url,
        }
      }

      // 检测是否使用官方登录
      if (config.oauth || config.session) {
        return {
          configured: true,
          mode: 'official',
          provider: 'Anthropic',
        }
      }
    }
    catch {
      // 忽略解析错误
    }
  }

  // 检测 CCJK 配置
  const ccjkConfigPath = join(homeDir, '.ccjk', 'config.json')
  if (existsSync(ccjkConfigPath)) {
    try {
      const content = readFileSync(ccjkConfigPath, 'utf-8')
      const config = JSON.parse(content)

      if (config.apiProvider) {
        return {
          configured: true,
          mode: config.apiProvider === 'ccr' ? 'ccr' : 'custom',
          provider: config.apiProvider,
          baseUrl: config.apiBaseUrl,
        }
      }
    }
    catch {
      // 忽略解析错误
    }
  }

  return {
    configured: false,
    mode: 'none',
  }
}

/**
 * 获取 API 配置摘要
 */
export function getApiStatusSummary(status: ApiStatus, locale: string = 'zh-CN'): string {
  const isZh = locale === 'zh-CN'

  if (!status.configured) {
    return isZh ? '⚠️ 未配置 API' : '⚠️ API not configured'
  }

  switch (status.mode) {
    case 'official':
      return isZh ? '✓ 官方登录' : '✓ Official login'
    case 'ccr':
      return isZh ? '✓ CCR 代理' : '✓ CCR Proxy'
    case 'custom':
      return isZh
        ? `✓ ${status.provider || '自定义'}`
        : `✓ ${status.provider || 'Custom'}`
    default:
      return isZh ? '✓ 已配置' : '✓ Configured'
  }
}

/**
 * API 配置选项
 */
export interface ApiConfigOption {
  id: string
  label: string
  description: string
  icon: string
  recommended?: boolean
  handler: () => Promise<void>
}

/**
 * 获取 API 配置选项列表
 */
export function getApiConfigOptions(locale: string = 'zh-CN'): ApiConfigOption[] {
  const isZh = locale === 'zh-CN'

  return [
    {
      id: 'official',
      label: isZh ? '使用官方登录' : 'Use Official Login',
      description: isZh ? '推荐新用户使用，无需配置 API Key' : 'Recommended for new users, no API key needed',
      icon: '✨',
      recommended: true,
      handler: async () => {
        // 调用官方登录流程
        console.log(isZh ? '正在启动官方登录...' : 'Starting official login...')
      },
    },
    {
      id: 'custom',
      label: isZh ? '自定义 API 配置' : 'Custom API Configuration',
      description: isZh ? '配置 API Key 和 URL' : 'Configure API Key and URL',
      icon: '⚙️',
      handler: async () => {
        const { runWizard } = await import('../../commands/api.js')
        await runWizard()
      },
    },
    {
      id: 'ccr',
      label: isZh ? '使用 CCR 代理' : 'Use CCR Proxy',
      description: isZh ? '通过代理访问 API' : 'Access API through proxy',
      icon: '🌐',
      handler: async () => {
        const { runCcrMenuFeature } = await import('../../utils/tools.js')
        await runCcrMenuFeature()
      },
    },
    {
      id: 'provider',
      label: isZh ? '选择 API 提供商' : 'Select API Provider',
      description: isZh ? '302.AI、GLM、Kimi 等' : '302.AI, GLM, Kimi, etc.',
      icon: '🏪',
      handler: async () => {
        const { runConfigWizard } = await import('../../utils/api-router/index.js')
        await runConfigWizard(isZh ? 'zh-CN' : 'en')
      },
    },
    {
      id: 'switch',
      label: isZh ? '切换 API 配置' : 'Switch API Configuration',
      description: isZh ? '在多个配置间切换' : 'Switch between configurations',
      icon: '🔄',
      handler: async () => {
        const { configSwitchCommand } = await import('../../commands/config-switch.js')
        await configSwitchCommand({ codeType: 'claude-code' })
      },
    },
  ]
}

/**
 * 显示 API 配置菜单
 */
export async function showApiConfigMenu(locale: string = 'zh-CN'): Promise<void> {
  const inquirer = (await import('inquirer')).default
  const ansis = (await import('ansis')).default
  const isZh = locale === 'zh-CN'

  // 获取当前状态
  const status = await detectApiStatus()
  const statusSummary = getApiStatusSummary(status, locale)

  console.log('')
  console.log(ansis.bold(isZh ? '🔑 API 配置管理' : '🔑 API Configuration'))
  console.log(ansis.dim(isZh ? '一键配置 API，开始使用 Claude' : 'One-click API setup, start using Claude'))
  console.log('')
  console.log(ansis.dim(isZh ? '当前状态: ' : 'Current status: ') + statusSummary)
  console.log('')

  // 获取选项
  const options = getApiConfigOptions(locale)

  // 构建选择列表
  const choices = options.map((opt, index) => ({
    name: `${opt.icon} ${opt.label}${opt.recommended ? ansis.green(' (推荐)') : ''}\n   ${ansis.dim(opt.description)}`,
    value: opt.id,
    short: opt.label,
  }))

  // 添加返回选项
  choices.push({
    name: `${ansis.dim('←')} ${isZh ? '返回' : 'Back'}`,
    value: 'back',
    short: 'Back',
  })

  const { selection } = await inquirer.prompt<{ selection: string }>([
    {
      type: 'list',
      name: 'selection',
      message: isZh ? '请选择:' : 'Select:',
      choices,
      pageSize: 10,
    },
  ])

  if (selection === 'back') {
    return
  }

  // 执行选中的选项
  const selectedOption = options.find(opt => opt.id === selection)
  if (selectedOption) {
    await selectedOption.handler()
  }
}

/**
 * 快速配置 API（一键配置）
 */
export async function quickApiSetup(locale: string = 'zh-CN'): Promise<boolean> {
  const inquirer = (await import('inquirer')).default
  const ansis = (await import('ansis')).default
  const isZh = locale === 'zh-CN'

  console.log('')
  console.log(ansis.bold(isZh ? '⚡ 快速配置 API' : '⚡ Quick API Setup'))
  console.log(ansis.dim(isZh ? '只需 2 步，即可开始使用 Claude' : 'Just 2 steps to start using Claude'))
  console.log('')

  try {
    // 导入 setup wizard
    const { createWizard } = await import('../../api-providers/wizard/setup-wizard.js')
    const wizard = createWizard()

    // Step 1: 选择提供商
    const step1 = wizard.getStep1()
    console.log(ansis.cyan(`Step 1: ${step1.title}`))
    console.log(ansis.dim(step1.description))
    console.log('')

    const providerField = step1.fields[0]
    const providerChoices = providerField.options?.filter(opt => opt.value !== '---').map(opt => ({
      name: `${opt.label}\n   ${ansis.dim(opt.description || '')}`,
      value: opt.value,
      short: opt.label,
    })) || []

    const { provider } = await inquirer.prompt<{ provider: string }>([
      {
        type: 'list',
        name: 'provider',
        message: isZh ? '选择 AI 提供商:' : 'Select AI Provider:',
        choices: providerChoices,
        pageSize: 10,
      },
    ])

    wizard.setProvider(provider)

    // Step 2: 输入 API Key
    const step2 = wizard.getStep2(provider)
    console.log('')
    console.log(ansis.cyan(`Step 2: ${step2.title}`))
    console.log(ansis.dim(step2.description))
    console.log('')

    const credentials: Record<string, string> = {}

    for (const field of step2.fields) {
      if (field.type === 'password') {
        const { value } = await inquirer.prompt<{ value: string }>([
          {
            type: 'password',
            name: 'value',
            message: `${field.label}:`,
            mask: '*',
          },
        ])
        credentials[field.name] = value
      }
      else if (field.type === 'select' && field.options) {
        const { value } = await inquirer.prompt<{ value: string }>([
          {
            type: 'list',
            name: 'value',
            message: `${field.label}:`,
            choices: field.options.map(opt => ({
              name: opt.label,
              value: opt.value,
            })),
            default: field.defaultValue,
          },
        ])
        credentials[field.name] = value
      }
      else {
        const { value } = await inquirer.prompt<{ value: string }>([
          {
            type: 'input',
            name: 'value',
            message: `${field.label}:`,
            default: field.defaultValue,
          },
        ])
        credentials[field.name] = value
      }
    }

    await wizard.setCredentials(credentials)

    // 测试连接
    console.log('')
    console.log(ansis.dim(isZh ? '正在测试连接...' : 'Testing connection...'))

    const testResult = await wizard.testConnection()

    if (testResult.success) {
      console.log(ansis.green(`✓ ${testResult.message}`))

      // 完成配置
      const setup = await wizard.complete()

      console.log('')
      console.log(ansis.green.bold(isZh ? '🎉 配置完成！' : '🎉 Configuration complete!'))
      console.log(ansis.dim(isZh ? `提供商: ${setup.provider}` : `Provider: ${setup.provider}`))
      console.log(ansis.dim(isZh ? `模型: ${setup.model}` : `Model: ${setup.model}`))

      return true
    }
    else {
      console.log(ansis.red(`✗ ${testResult.message}`))
      if (testResult.suggestions) {
        console.log(ansis.yellow(isZh ? '建议:' : 'Suggestions:'))
        testResult.suggestions.forEach(s => console.log(`  - ${s}`))
      }
      return false
    }
  }
  catch (error) {
    const ansis = (await import('ansis')).default
    console.log(ansis.red(isZh ? '配置失败' : 'Configuration failed'))
    console.log(ansis.dim(String(error)))
    return false
  }
}

/**
 * 检查是否需要配置 API
 */
export async function needsApiSetup(): Promise<boolean> {
  const status = await detectApiStatus()
  return !status.configured
}

/**
 * 获取推荐的配置方式
 */
export function getRecommendedSetupMethod(locale: string = 'zh-CN'): ApiConfigOption {
  const options = getApiConfigOptions(locale)
  return options.find(opt => opt.recommended) || options[0]
}
