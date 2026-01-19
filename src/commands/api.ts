import type { SupportedLang } from '../constants'
/**
 * CCJK API Command
 * Unified API configuration for Claude Code
 */
import ansis from 'ansis'
import { format, i18n } from '../i18n'
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
  console.log(COLORS.primary('║') + COLORS.accent(`                    ${i18n.t('api:providersTitle')}                    `.slice(0, 60)) + COLORS.primary('║'))
  console.log(COLORS.primary('╚═══════════════════════════════════════════════════════════════╝'))
  console.log('')

  // Group by category
  const categories = {
    'official': i18n.t('api:categoryOfficial'),
    'openai-compatible': i18n.t('api:categoryOpenaiCompatible'),
    'chinese': i18n.t('api:categoryChinese'),
    'free': i18n.t('api:categoryFree'),
    'local': i18n.t('api:categoryLocal'),
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
      console.log(`    ${keyIcon} ${ansis.green(preset.id.padEnd(15))} ${name}`)
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
  _lang: SupportedLang = 'en',
): void {
  const result = quickSetup(providerId, apiKey)

  if (result.success) {
    console.log(STATUS.success(format(i18n.t('api:configSuccess'), { provider: result.provider || providerId })))
  }
  else {
    console.log(STATUS.error(format(i18n.t('api:configFailed'), { error: result.error || 'Unknown error' })))
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
        console.log(STATUS.error(i18n.t('api:setupUsage')))
        console.log(ansis.gray(`  ${i18n.t('api:setupExample')}`))
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
