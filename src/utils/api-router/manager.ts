import type {
  ApiConfigResult,
} from './types'
/**
 * CCJK API Router - Unified Manager
 * Provides a unified interface for all API routing modes
 */
import ansis from 'ansis'
import inquirer from 'inquirer'
import {
  getAllPresets,
  getChinesePresets,
  getPresetById,
  getRecommendedPresets,
} from './presets'
import {
  configureOfficialMode,
  configureSimpleMode,
  configureWithPreset,
  detectCurrentMode,
  getCurrentConfig,
} from './simple-mode'

// Re-export for convenience
export {
  getAllPresets,
  getChinesePresets,
  getPresetById,
  getPresetsByCategory,
  getRecommendedPresets,
} from './presets'

export {
  clearApiConfig,
  configureOfficialMode,
  configureSimpleMode,
  configureWithPreset,
  detectCurrentMode,
  getCurrentConfig,
  quickSetup,
  validateApiKey,
} from './simple-mode'

/**
 * Display current API configuration status
 */
export function displayCurrentStatus(lang: 'en' | 'zh-CN' = 'en'): void {
  const { mode, provider } = detectCurrentMode()
  const config = getCurrentConfig()

  console.log('')
  console.log(ansis.green('═'.repeat(50)))
  console.log(ansis.bold.cyan(lang === 'zh-CN' ? '  当前 API 配置' : '  Current API Configuration'))
  console.log(ansis.green('═'.repeat(50)))
  console.log('')

  if (mode === 'none') {
    console.log(ansis.yellow(lang === 'zh-CN' ? '  ⚠ 未配置 API' : '  ⚠ No API configured'))
    console.log('')
    return
  }

  // Mode
  const modeLabels = {
    official: lang === 'zh-CN' ? '官方 Anthropic' : 'Official Anthropic',
    simple: lang === 'zh-CN' ? '简单模式 (API 中转)' : 'Simple Mode (API Proxy)',
    ccr: lang === 'zh-CN' ? 'CCR 高级路由' : 'CCR Advanced Router',
  }
  console.log(`  ${ansis.bold(lang === 'zh-CN' ? '模式:' : 'Mode:')} ${ansis.green(modeLabels[mode])}`)

  // Provider
  if (provider) {
    const preset = getPresetById(provider)
    const providerName = preset
      ? (lang === 'zh-CN' ? preset.nameZh : preset.name)
      : provider
    console.log(`  ${ansis.bold(lang === 'zh-CN' ? '提供商:' : 'Provider:')} ${ansis.green(providerName)}`)
  }

  // Base URL (masked)
  if (config?.ANTHROPIC_BASE_URL) {
    console.log(`  ${ansis.bold('Base URL:')} ${ansis.gray(config.ANTHROPIC_BASE_URL)}`)
  }

  // API Key (masked)
  if (config?.ANTHROPIC_API_KEY) {
    const masked = `${config.ANTHROPIC_API_KEY.substring(0, 10)}...`
    console.log(`  ${ansis.bold('API Key:')} ${ansis.gray(masked)}`)
  }

  console.log('')
}

/**
 * Interactive API configuration wizard
 */
export async function runConfigWizard(lang: 'en' | 'zh-CN' = 'en'): Promise<ApiConfigResult> {
  console.log('')
  console.log(ansis.green('═'.repeat(50)))
  console.log(ansis.bold.cyan(lang === 'zh-CN' ? '  API 配置向导' : '  API Configuration Wizard'))
  console.log(ansis.green('═'.repeat(50)))
  console.log('')

  // Step 1: Choose configuration mode
  const modeChoices = [
    {
      name: lang === 'zh-CN'
        ? '1. 快速配置 (推荐) - 选择预设提供商'
        : '1. Quick Setup (Recommended) - Choose preset provider',
      value: 'quick' as const,
    },
    {
      name: lang === 'zh-CN'
        ? '2. 官方 Anthropic API - 直接连接 Anthropic'
        : '2. Official Anthropic API - Direct connection',
      value: 'official' as const,
    },
    {
      name: lang === 'zh-CN'
        ? '3. 自定义配置 - 手动输入 API 地址和密钥'
        : '3. Custom Configuration - Manual API URL and key',
      value: 'custom' as const,
    },
    {
      name: lang === 'zh-CN'
        ? '4. CCR 高级路由 - 完整 Claude Code Router 配置'
        : '4. CCR Advanced Router - Full Claude Code Router setup',
      value: 'ccr' as const,
    },
  ]

  const { mode } = await inquirer.prompt<{ mode: 'quick' | 'official' | 'custom' | 'ccr' }>({
    type: 'list',
    name: 'mode',
    message: lang === 'zh-CN' ? '选择配置模式:' : 'Select configuration mode:',
    choices: modeChoices,
  })

  switch (mode) {
    case 'quick':
      return await runQuickSetup(lang)
    case 'official':
      return await runOfficialSetup(lang)
    case 'custom':
      return await runCustomSetup(lang)
    case 'ccr':
      return await runCcrSetup(lang)
    default:
      return { success: false, mode: 'simple', error: 'Unknown mode' }
  }
}

/**
 * Quick setup with preset providers
 */
async function runQuickSetup(lang: 'en' | 'zh-CN'): Promise<ApiConfigResult> {
  // Show recommended presets first
  const recommended = getRecommendedPresets()
  const chinese = getChinesePresets().filter(p => !recommended.find(r => r.id === p.id))
  const all = getAllPresets()

  const choices = [
    new inquirer.Separator(lang === 'zh-CN' ? '─── 推荐 ───' : '─── Recommended ───'),
    ...recommended.map((p, i) => ({
      name: `${i + 1}. ${lang === 'zh-CN' ? p.nameZh : p.name} - ${lang === 'zh-CN' ? p.descriptionZh : p.description}`,
      value: p.id,
    })),
    new inquirer.Separator(lang === 'zh-CN' ? '─── 国内服务 ───' : '─── Chinese Providers ───'),
    ...chinese.map((p, i) => ({
      name: `${recommended.length + i + 1}. ${lang === 'zh-CN' ? p.nameZh : p.name} - ${lang === 'zh-CN' ? p.descriptionZh : p.description}`,
      value: p.id,
    })),
    new inquirer.Separator(lang === 'zh-CN' ? '─── 更多 ───' : '─── More ───'),
    {
      name: lang === 'zh-CN' ? '查看所有提供商...' : 'View all providers...',
      value: '__all__',
    },
  ]

  const { providerId } = await inquirer.prompt<{ providerId: string }>({
    type: 'list',
    name: 'providerId',
    message: lang === 'zh-CN' ? '选择 API 提供商:' : 'Select API provider:',
    choices,
    pageSize: 15,
  })

  // If user wants to see all providers
  let finalProviderId = providerId
  if (providerId === '__all__') {
    const allChoices = all.map((p, i) => ({
      name: `${i + 1}. [${p.category}] ${lang === 'zh-CN' ? p.nameZh : p.name}`,
      value: p.id,
    }))

    const result = await inquirer.prompt<{ providerId: string }>({
      type: 'list',
      name: 'providerId',
      message: lang === 'zh-CN' ? '选择提供商:' : 'Select provider:',
      choices: allChoices,
      pageSize: 20,
    })
    finalProviderId = result.providerId
  }

  const preset = getPresetById(finalProviderId)
  if (!preset) {
    return { success: false, mode: 'simple', error: 'Provider not found' }
  }

  // Show provider instructions
  console.log('')
  console.log(ansis.green(`📋 ${lang === 'zh-CN' ? preset.nameZh : preset.name}`))
  if (preset.instructions) {
    console.log(ansis.gray(`   ${lang === 'zh-CN' ? preset.instructions.zh : preset.instructions.en}`))
  }
  console.log('')

  // Get API key if required
  let apiKey = ''
  if (preset.requiresApiKey) {
    const { key } = await inquirer.prompt<{ key: string }>({
      type: 'password',
      name: 'key',
      message: lang === 'zh-CN' ? '输入 API 密钥:' : 'Enter API key:',
      mask: '*',
      validate: (value) => {
        if (!value)
          return lang === 'zh-CN' ? 'API 密钥不能为空' : 'API key is required'
        return true
      },
    })
    apiKey = key
  }

  // Configure
  const result = configureWithPreset(preset, apiKey)

  if (result.success) {
    console.log('')
    console.log(ansis.green(`✔ ${lang === 'zh-CN' ? 'API 配置成功!' : 'API configured successfully!'}`))
    console.log(ansis.gray(`  ${lang === 'zh-CN' ? '提供商:' : 'Provider:'} ${lang === 'zh-CN' ? preset.nameZh : preset.name}`))
    console.log(ansis.gray(`  ${lang === 'zh-CN' ? '默认模型:' : 'Default model:'} ${preset.defaultModel}`))
    console.log('')
  }

  return result
}

/**
 * Official Anthropic API setup
 */
async function runOfficialSetup(lang: 'en' | 'zh-CN'): Promise<ApiConfigResult> {
  console.log('')
  console.log(ansis.green(lang === 'zh-CN'
    ? '📋 官方 Anthropic API'
    : '📋 Official Anthropic API'))
  console.log(ansis.gray(lang === 'zh-CN'
    ? '   从 https://console.anthropic.com/settings/keys 获取 API 密钥'
    : '   Get your API key from https://console.anthropic.com/settings/keys'))
  console.log('')

  const { apiKey } = await inquirer.prompt<{ apiKey: string }>({
    type: 'password',
    name: 'apiKey',
    message: lang === 'zh-CN' ? '输入 Anthropic API 密钥:' : 'Enter Anthropic API key:',
    mask: '*',
    validate: (value) => {
      if (!value)
        return lang === 'zh-CN' ? 'API 密钥不能为空' : 'API key is required'
      if (!value.startsWith('sk-ant-')) {
        return lang === 'zh-CN'
          ? 'Anthropic API 密钥应以 sk-ant- 开头'
          : 'Anthropic API key should start with sk-ant-'
      }
      return true
    },
  })

  const result = configureOfficialMode(apiKey)

  if (result.success) {
    console.log('')
    console.log(ansis.green(`✔ ${lang === 'zh-CN' ? '官方 API 配置成功!' : 'Official API configured successfully!'}`))
    console.log('')
  }

  return result
}

/**
 * Custom API configuration
 */
async function runCustomSetup(lang: 'en' | 'zh-CN'): Promise<ApiConfigResult> {
  console.log('')
  console.log(ansis.green(lang === 'zh-CN'
    ? '📋 自定义 API 配置'
    : '📋 Custom API Configuration'))
  console.log('')

  const { baseUrl } = await inquirer.prompt<{ baseUrl: string }>({
    type: 'input',
    name: 'baseUrl',
    message: lang === 'zh-CN' ? '输入 API Base URL:' : 'Enter API Base URL:',
    validate: (value) => {
      if (!value)
        return lang === 'zh-CN' ? 'URL 不能为空' : 'URL is required'
      if (!value.startsWith('http')) {
        return lang === 'zh-CN' ? 'URL 必须以 http:// 或 https:// 开头' : 'URL must start with http:// or https://'
      }
      return true
    },
  })

  const { apiKey } = await inquirer.prompt<{ apiKey: string }>({
    type: 'password',
    name: 'apiKey',
    message: lang === 'zh-CN' ? '输入 API 密钥:' : 'Enter API key:',
    mask: '*',
    validate: (value) => {
      if (!value)
        return lang === 'zh-CN' ? 'API 密钥不能为空' : 'API key is required'
      return true
    },
  })

  const result = configureSimpleMode({
    mode: 'simple',
    provider: 'custom',
    apiKey,
    baseUrl,
  })

  if (result.success) {
    console.log('')
    console.log(ansis.green(`✔ ${lang === 'zh-CN' ? '自定义 API 配置成功!' : 'Custom API configured successfully!'}`))
    console.log('')
  }

  return result
}

/**
 * CCR Advanced Router setup
 */
async function runCcrSetup(lang: 'en' | 'zh-CN'): Promise<ApiConfigResult> {
  console.log('')
  console.log(ansis.green(lang === 'zh-CN'
    ? '📋 CCR 高级路由配置'
    : '📋 CCR Advanced Router Configuration'))
  console.log(ansis.gray(lang === 'zh-CN'
    ? '   CCR 提供完整的模型路由、转换和多提供商支持'
    : '   CCR provides full model routing, transformation, and multi-provider support'))
  console.log('')

  // Import CCR configuration
  try {
    const { setupCcrConfiguration } = await import('../ccr/config')
    const success = await setupCcrConfiguration()

    return {
      success,
      mode: 'ccr',
      provider: 'ccr',
      message: success
        ? (lang === 'zh-CN' ? 'CCR 配置成功' : 'CCR configured successfully')
        : (lang === 'zh-CN' ? 'CCR 配置失败' : 'CCR configuration failed'),
    }
  }
  catch (error) {
    return {
      success: false,
      mode: 'ccr',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Test API connection
 */
export async function testApiConnection(lang: 'en' | 'zh-CN' = 'en'): Promise<boolean> {
  const config = getCurrentConfig()

  if (!config || (!config.ANTHROPIC_API_KEY && !config.ANTHROPIC_AUTH_TOKEN)) {
    console.log(ansis.yellow(lang === 'zh-CN' ? '⚠ 未配置 API' : '⚠ No API configured'))
    return false
  }

  console.log(ansis.green(lang === 'zh-CN' ? '🔍 测试 API 连接...' : '🔍 Testing API connection...'))

  try {
    // Simple fetch test to the base URL
    const baseUrl = config.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
    const testUrl = baseUrl.includes('v1') ? baseUrl : `${baseUrl}/v1/models`

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'x-api-key': config.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
    })

    if (response.ok || response.status === 401) {
      // 401 means API is reachable but key might be wrong
      console.log(ansis.green(lang === 'zh-CN' ? '✔ API 连接成功' : '✔ API connection successful'))
      return true
    }
    else {
      console.log(ansis.yellow(`⚠ API returned status: ${response.status}`))
      return false
    }
  }
  catch (error) {
    console.log(ansis.red(lang === 'zh-CN' ? '✖ API 连接失败' : '✖ API connection failed'))
    console.log(ansis.gray(`  ${error instanceof Error ? error.message : String(error)}`))
    return false
  }
}
