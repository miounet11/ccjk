/**
 * Unified API Configuration Selector
 *
 * Provides a consistent API configuration interface for both:
 * - Quick setup flow
 * - Main menu API management
 *
 * This ensures users have the same experience regardless of entry point.
 */

import type { CodeToolType } from '../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { i18n } from '../i18n'
import { ClaudeCodeConfigManager } from '../utils/claude-code-config-manager'
import { configureApiFeature, handleCustomApiMode } from '../utils/features'
import { configSwitchCommand } from './config-switch'
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType } from '../constants'
import { readZcfConfig } from '../utils/ccjk-config'

/**
 * API configuration mode selected by user
 */
export type ApiConfigMode = 'official' | 'custom' | 'ccr' | 'switch' | 'view' | 'skip'

/**
 * API configuration result
 */
export interface ApiConfigResult {
  mode: ApiConfigMode
  apiKey?: string
  provider?: string
  success: boolean
  cancelled: boolean
}

/**
 * Get current code tool type from config
 */
function getCurrentCodeTool(): CodeToolType {
  const config = readZcfConfig()
  if (config?.codeToolType && isCodeToolType(config.codeToolType)) {
    return config.codeToolType
  }
  return DEFAULT_CODE_TOOL_TYPE
}

/**
 * Show unified API configuration menu
 *
 * @param title - Optional custom title for the menu
 * @returns API configuration result
 */
export async function showApiConfigMenu(title?: string): Promise<ApiConfigResult> {
  const lang = i18n.language
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(title || (isZh ? '🔑 API 配置管理' : '🔑 API Configuration')))
  console.log('')

  const choices = [
    { name: isZh ? '1. 使用官方登录（不配置 API）' : '1. Use Official Login (No API Config)', value: 'official' },
    { name: isZh ? '2. 自定义 API 配置' : '2. Custom API Configuration', value: 'custom' },
    { name: isZh ? '3. 使用 CCR 代理' : '3. Use CCR Proxy', value: 'ccr' },
    { name: isZh ? '4. 切换 API 配置' : '4. Switch API Configuration', value: 'switch' },
    { name: isZh ? '5. 查看当前配置' : '5. View Current Configuration', value: 'view' },
    { name: isZh ? '6. 跳过 API 配置' : '6. Skip API Configuration', value: 'skip' },
  ]

  const { choice } = await inquirer.prompt<{ choice: ApiConfigMode }>({
    type: 'list',
    name: 'choice',
    message: isZh ? '请选择 API 配置模式:' : 'Select API configuration mode:',
    choices,
    pageSize: 10,
  })

  const codeTool = getCurrentCodeTool()

  switch (choice) {
    case 'official':
      return await handleOfficialLogin(codeTool, isZh)

    case 'custom':
      return await handleCustomConfig(isZh)

    case 'ccr':
      return await handleCcrProxy(codeTool, isZh)

    case 'switch':
      return await handleConfigSwitch(codeTool)

    case 'view':
      return await handleViewConfig(codeTool)

    case 'skip':
      return { mode: 'skip', success: true, cancelled: false }

    default:
      return { mode: 'skip', success: true, cancelled: false }
  }
}

/**
 * Handle official login selection
 */
async function handleOfficialLogin(codeTool: CodeToolType, isZh: boolean): Promise<ApiConfigResult> {
  if (codeTool === 'claude-code') {
    const result = await ClaudeCodeConfigManager.switchToOfficial()
    if (result.success) {
      console.log('')
      console.log(ansis.green(isZh ? '✅ 已切换到官方登录' : '✅ Switched to official login'))
      console.log('')
      return { mode: 'official', success: true, cancelled: false }
    } else {
      console.log('')
      console.log(ansis.red(isZh ? `❌ 切换失败: ${result.error}` : `❌ Failed to switch: ${result.error}`))
      console.log('')
      return { mode: 'official', success: false, cancelled: false }
    }
  } else {
    console.log('')
    console.log(ansis.yellow(isZh ? '⚠️ 当前代码工具不支持此功能' : '⚠️ Current code tool does not support this feature'))
    console.log('')
    return { mode: 'official', success: false, cancelled: false }
  }
}

/**
 * Handle custom API configuration
 */
async function handleCustomConfig(isZh: boolean): Promise<ApiConfigResult> {
  try {
    // Directly call handleCustomApiMode to avoid duplicate menu
    await handleCustomApiMode()
    return { mode: 'custom', success: true, cancelled: false }
  } catch {
    return { mode: 'custom', success: false, cancelled: false }
  }
}

/**
 * Handle CCR proxy selection
 */
async function handleCcrProxy(codeTool: CodeToolType, isZh: boolean): Promise<ApiConfigResult> {
  if (codeTool === 'claude-code') {
    const result = await ClaudeCodeConfigManager.switchToCcr()
    if (result.success) {
      console.log('')
      console.log(ansis.green(isZh ? '✅ 已切换到 CCR 代理' : '✅ Switched to CCR proxy'))
      console.log('')
      return { mode: 'ccr', success: true, cancelled: false }
    } else {
      console.log('')
      console.log(ansis.red(isZh ? `❌ 切换失败: ${result.error}` : `❌ Failed to switch: ${result.error}`))
      console.log('')
      return { mode: 'ccr', success: false, cancelled: false }
    }
  } else {
    console.log('')
    console.log(ansis.yellow(isZh ? '⚠️ 当前代码工具不支持此功能' : '⚠️ Current code tool does not support this feature'))
    console.log('')
    return { mode: 'ccr', success: false, cancelled: false }
  }
}

/**
 * Handle configuration switch
 */
async function handleConfigSwitch(codeTool: CodeToolType): Promise<ApiConfigResult> {
  try {
    await configSwitchCommand({ codeType: codeTool })
    return { mode: 'switch', success: true, cancelled: false }
  } catch {
    return { mode: 'switch', success: false, cancelled: false }
  }
}

/**
 * Handle view configuration
 */
async function handleViewConfig(codeTool: CodeToolType): Promise<ApiConfigResult> {
  try {
    await configSwitchCommand({ codeType: codeTool, list: true })
    return { mode: 'view', success: true, cancelled: false }
  } catch {
    return { mode: 'view', success: false, cancelled: false }
  }
}

/**
 * Quick API configuration for quick-setup flow
 *
 * Simplified version that only returns API key and provider
 * without full menu navigation
 *
 * @param skipPrompt - If true, use defaults without prompting
 * @param defaultProvider - Default provider to use
 * @param defaultApiKey - Default API key to use
 * @returns API key and provider, or undefined if skipped/cancelled
 */
export async function quickApiConfig(options: {
  skipPrompt?: boolean
  defaultProvider?: string
  defaultApiKey?: string
  detectedApiKey?: string
}): Promise<{ apiKey?: string; provider?: string } | undefined> {
  const isZh = i18n.language === 'zh-CN'

  // If default values provided and skipPrompt, use them
  if (options.skipPrompt && options.defaultApiKey) {
    return {
      apiKey: options.defaultApiKey,
      provider: options.defaultProvider || 'anthropic',
    }
  }

  // If detected API key exists, ask if user wants to use it
  if (options.detectedApiKey && !options.skipPrompt) {
    const { useDetected } = await inquirer.prompt<{ useDetected: boolean }>({
      type: 'confirm',
      name: 'useDetected',
      message: isZh
        ? `使用检测到的 API 密钥 (${options.detectedApiKey.substring(0, 12)}...)?`
        : `Use detected API key (${options.detectedApiKey.substring(0, 12)}...)?`,
      default: true,
    })

    if (useDetected) {
      return {
        apiKey: options.detectedApiKey,
        provider: options.defaultProvider || 'anthropic',
      }
    }
  }

  // Show full API configuration menu
  const result = await showApiConfigMenu()

  if (result.cancelled || result.mode === 'skip') {
    return undefined
  }

  // For custom/switch modes, user would have configured through configureApiFeature
  // We need to read the resulting configuration
  // For now, return success marker
  return { apiKey: '__configured__', provider: options.defaultProvider || 'anthropic' }
}
