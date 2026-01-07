import type { SupportedLang } from '../constants'
/**
 * CCJK API Command
 * Unified API configuration for Claude Code
 */
import ansis from 'ansis'
import {
  displayCurrentStatus,
  getAllPresets,
  quickSetup,
  runConfigWizard,
  testApiConnection,
} from '../utils/api-router'
import { COLORS, STATUS } from '../utils/banner'

/**
 * API command options
 */
export interface ApiCommandOptions {
  lang?: SupportedLang
  provider?: string
  key?: string
  url?: string
  test?: boolean
}

/**
 * List available providers
 */
export function listProviders(lang: SupportedLang = 'en'): void {
  const presets = getAllPresets()

  console.log('')
  console.log(COLORS.primary('╔═══════════════════════════════════════════════════════════════╗'))
  console.log(COLORS.primary('║') + COLORS.accent(lang === 'zh-CN'
    ? '                    可用 API 提供商                          '
    : '                  Available API Providers                    ') + COLORS.primary('║'))
  console.log(COLORS.primary('╚═══════════════════════════════════════════════════════════════╝'))
  console.log('')

  // Group by category
  const categories = {
    'official': lang === 'zh-CN' ? '官方' : 'Official',
    'openai-compatible': lang === 'zh-CN' ? 'OpenAI 兼容' : 'OpenAI Compatible',
    'chinese': lang === 'zh-CN' ? '国内服务' : 'Chinese Providers',
    'free': lang === 'zh-CN' ? '免费' : 'Free Tier',
    'local': lang === 'zh-CN' ? '本地' : 'Local',
  }

  for (const [category, label] of Object.entries(categories)) {
    const categoryPresets = presets.filter(p => p.category === category)
    if (categoryPresets.length === 0)
      continue

    console.log(COLORS.secondary(`  ${label}:`))
    for (const preset of categoryPresets) {
      const name = lang === 'zh-CN' ? preset.nameZh : preset.name
      const desc = lang === 'zh-CN' ? preset.descriptionZh : preset.description
      const keyIcon = preset.requiresApiKey ? '🔑' : '🆓'
      console.log(`    ${keyIcon} ${ansis.cyan(preset.id.padEnd(15))} ${name}`)
      console.log(ansis.gray(`       ${desc}`))
    }
    console.log('')
  }
}

/**
 * Quick setup with provider and key
 */
export function setupApi(
  providerId: string,
  apiKey: string,
  lang: SupportedLang = 'en',
): void {
  const result = quickSetup(providerId, apiKey)

  if (result.success) {
    console.log(STATUS.success(lang === 'zh-CN'
      ? `API 配置成功! 提供商: ${result.provider}`
      : `API configured successfully! Provider: ${result.provider}`))
  }
  else {
    console.log(STATUS.error(lang === 'zh-CN'
      ? `API 配置失败: ${result.error}`
      : `API configuration failed: ${result.error}`))
  }
}

/**
 * Show current status
 */
export function showStatus(lang: SupportedLang = 'en'): void {
  displayCurrentStatus(lang)
}

/**
 * Test API connection
 */
export async function testApi(lang: SupportedLang = 'en'): Promise<void> {
  await testApiConnection(lang)
}

/**
 * Interactive wizard
 */
export async function runWizard(lang: SupportedLang = 'en'): Promise<void> {
  await runConfigWizard(lang)
}

/**
 * Main API command handler
 */
export async function apiCommand(
  action: string = 'wizard',
  args: string[] = [],
  options: ApiCommandOptions = {},
): Promise<void> {
  const lang = options.lang || 'en'

  switch (action) {
    case 'list':
    case 'ls':
    case 'providers':
      listProviders(lang)
      break

    case 'setup':
    case 'set':
      if (options.provider && options.key) {
        setupApi(options.provider, options.key, lang)
      }
      else if (args.length >= 2) {
        setupApi(args[0], args[1], lang)
      }
      else {
        console.log(STATUS.error(lang === 'zh-CN'
          ? '用法: ccjk api setup <provider> <api-key>'
          : 'Usage: ccjk api setup <provider> <api-key>'))
        console.log(ansis.gray(lang === 'zh-CN'
          ? '  例如: ccjk api setup deepseek sk-xxx'
          : '  Example: ccjk api setup deepseek sk-xxx'))
      }
      break

    case 'status':
    case 's':
      showStatus(lang)
      break

    case 'test':
    case 't':
      await testApi(lang)
      break

    case 'wizard':
    case 'w':
    case 'config':
    default:
      await runWizard(lang)
      break
  }
}

export default apiCommand
