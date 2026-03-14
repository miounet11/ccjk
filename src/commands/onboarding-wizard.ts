import type { SupportedLang } from '../constants'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import {
  CCJK_CONFIG_DIR,
  DEFAULT_CODE_TOOL_TYPE,
  LANG_LABELS,
  SUPPORTED_LANGS,
} from '../constants'
import { changeLanguage } from '../i18n'
import { readZcfConfig, updateZcfConfig } from '../utils/ccjk-config'
import { addNumbersToChoices } from '../utils/prompt-helpers'
import { getRuntimeVersion } from '../utils/runtime-package'

const ONBOARDING_STATE_FILE = join(CCJK_CONFIG_DIR, 'onboarding.json')
const PRIMARY_ONBOARDING_TOOLS = ['claude-code', 'codex'] as const

type OnboardingCodeTool = (typeof PRIMARY_ONBOARDING_TOOLS)[number]

const LANGUAGE_SELECTION_MESSAGES = {
  selectLanguage: 'Select CCJK display language / 选择 CCJK 显示语言',
} as const

const TOOL_LABELS: Record<OnboardingCodeTool, { en: string, zh: string }> = {
  'claude-code': {
    en: 'Claude Code',
    zh: 'Claude Code',
  },
  'codex': {
    en: 'Codex',
    zh: 'Codex',
  },
}

export interface OnboardingState {
  completed: boolean
  completedAt: string
  completedSteps?: number[]
  version?: string
}

interface OnboardingOptions {
  reset?: boolean
  preferredCodeTool?: string
}

function isSupportedLang(value: unknown): value is SupportedLang {
  return SUPPORTED_LANGS.includes(value as SupportedLang)
}

function isPrimaryOnboardingTool(value: unknown): value is OnboardingCodeTool {
  return PRIMARY_ONBOARDING_TOOLS.includes(value as OnboardingCodeTool)
}

function resolveOnboardingCodeTool(value?: unknown): OnboardingCodeTool {
  if (isPrimaryOnboardingTool(value)) {
    return value
  }

  return DEFAULT_CODE_TOOL_TYPE === 'codex' ? 'codex' : 'claude-code'
}

function getToolLabel(tool: OnboardingCodeTool, lang: SupportedLang): string {
  return lang === 'zh-CN' ? TOOL_LABELS[tool].zh : TOOL_LABELS[tool].en
}

function getLanguageLabel(lang: SupportedLang): string {
  return LANG_LABELS[lang]
}

function readSavedLanguage(): SupportedLang | null {
  const savedConfig = readZcfConfig()
  return isSupportedLang(savedConfig?.preferredLang) ? savedConfig.preferredLang : null
}

async function ensureOnboardingLanguageSelection(force = false): Promise<SupportedLang> {
  const savedConfig = readZcfConfig()
  const savedLanguage = readSavedLanguage()
  const defaultLanguage = savedLanguage || 'en'

  if (savedLanguage && !force) {
    await changeLanguage(savedLanguage)
    return savedLanguage
  }

  const { lang } = await inquirer.prompt<{ lang: SupportedLang }>({
    type: 'list',
    name: 'lang',
    message: LANGUAGE_SELECTION_MESSAGES.selectLanguage,
    choices: addNumbersToChoices(SUPPORTED_LANGS.map(language => ({
      name: LANG_LABELS[language],
      value: language,
    }))),
    default: SUPPORTED_LANGS.indexOf(defaultLanguage),
  })

  const selectedLanguage = isSupportedLang(lang) ? lang : defaultLanguage

  updateZcfConfig({
    version: getRuntimeVersion(),
    preferredLang: selectedLanguage,
    templateLang: savedConfig?.templateLang || selectedLanguage,
  })
  await changeLanguage(selectedLanguage)

  return selectedLanguage
}

async function selectOnboardingCodeTool(
  lang: SupportedLang,
  options: OnboardingOptions = {},
): Promise<OnboardingCodeTool> {
  const savedConfig = readZcfConfig()
  const preferredTool = resolveOnboardingCodeTool(options.preferredCodeTool)
  const defaultTool = resolveOnboardingCodeTool(savedConfig?.codeToolType || preferredTool)

  if (options.preferredCodeTool && isPrimaryOnboardingTool(options.preferredCodeTool)) {
    updateZcfConfig({
      version: getRuntimeVersion(),
      codeToolType: options.preferredCodeTool,
    })
    return options.preferredCodeTool
  }

  const isZh = lang === 'zh-CN'
  const { tool } = await inquirer.prompt<{ tool: OnboardingCodeTool }>({
    type: 'list',
    name: 'tool',
    message: isZh ? '选择代码工具' : 'Choose your code tool',
    choices: addNumbersToChoices([
      {
        name: `${getToolLabel('claude-code', lang)} - ${isZh ? '完整 CCJK 控制中心，默认推荐' : 'Full CCJK control center, default choice'}`,
        value: 'claude-code',
      },
      {
        name: `${getToolLabel('codex', lang)} - ${isZh ? 'Codex 专属控制中心、Provider / MCP / Memory 配置' : 'Codex-specific control center for provider, MCP, and memory setup'}`,
        value: 'codex',
      },
    ]),
    default: PRIMARY_ONBOARDING_TOOLS.indexOf(defaultTool),
  })

  const selectedTool = resolveOnboardingCodeTool(tool)

  updateZcfConfig({
    version: getRuntimeVersion(),
    codeToolType: selectedTool,
  })

  return selectedTool
}

export function readOnboardingState(): OnboardingState | null {
  try {
    if (!existsSync(ONBOARDING_STATE_FILE))
      return null
    return JSON.parse(readFileSync(ONBOARDING_STATE_FILE, 'utf-8')) as OnboardingState
  }
  catch {
    return null
  }
}

function writeOnboardingState(state: OnboardingState): void {
  try {
    if (!existsSync(CCJK_CONFIG_DIR)) {
      mkdirSync(CCJK_CONFIG_DIR, { recursive: true })
    }
    writeFileSync(ONBOARDING_STATE_FILE, JSON.stringify(state, null, 2))
  }
  catch {
    // silently fail
  }
}

export function isOnboardingCompleted(): boolean {
  const state = readOnboardingState()
  return state?.completed === true
}

export async function runOnboardingWizard(options: OnboardingOptions = {}): Promise<void> {
  if (isOnboardingCompleted() && !options.reset) {
    return
  }

  if (options.reset) {
    writeOnboardingState({ completed: false, completedAt: '', completedSteps: [] })
  }

  const selectedLanguage = await ensureOnboardingLanguageSelection(options.reset === true)
  const isZh = selectedLanguage === 'zh-CN'

  console.log('')
  console.log(ansis.bold.yellow(isZh ? '🎉 欢迎使用 CCJK！' : '🎉 Welcome to CCJK!'))
  console.log(ansis.dim(isZh
    ? '   先确认语言和代码工具，再进入对应控制中心。'
    : '   Confirm language and code tool first, then enter the matching control center.'))
  console.log('')

  console.log(ansis.bold(`${isZh ? '步骤 1/2' : 'Step 1/2'}: ${isZh ? '显示语言' : 'Display language'}`))
  console.log(ansis.green(`  ✔ ${getLanguageLabel(selectedLanguage)}`))
  console.log('')

  console.log(ansis.bold(`${isZh ? '步骤 2/2' : 'Step 2/2'}: ${isZh ? '代码工具' : 'Code tool'}`))
  const selectedTool = await selectOnboardingCodeTool(selectedLanguage, options)
  console.log(ansis.green(`  ✔ ${getToolLabel(selectedTool, selectedLanguage)}`))
  console.log('')

  writeOnboardingState({
    completed: true,
    completedAt: new Date().toISOString(),
    completedSteps: [1, 2],
    version: getRuntimeVersion(),
  })

  console.log(
    ansis.bold.green(
      isZh
        ? `✅ 正在进入 ${getToolLabel(selectedTool, selectedLanguage)} 控制中心...`
        : `✅ Loading ${getToolLabel(selectedTool, selectedLanguage)} control center...`,
    ),
  )
  console.log('')
}

export type { OnboardingCodeTool }
