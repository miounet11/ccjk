import type { SupportedLang } from '../constants'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { version } from '../../package.json'
import {
  CCJK_CONFIG_DIR,
  LANG_LABELS,
  SUPPORTED_LANGS,
} from '../constants'
import { STARTUP_CODE_TOOL_CHOICES } from '../utils/code-type-resolver'
import { changeLanguage } from '../i18n'
import { readCcjkConfig, updateCcjkConfig } from '../utils/ccjk-config'
import { addNumbersToChoices } from '../utils/prompt-helpers'

const ONBOARDING_STATE_FILE = join(CCJK_CONFIG_DIR, 'onboarding.json')

export type OnboardingCodeTool = (typeof STARTUP_CODE_TOOL_CHOICES)[number]

const LANGUAGE_SELECTION_MESSAGES = {
  selectLanguage: 'Select CCJK display language / 选择 CCJK 显示语言',
} as const

const TOOL_LABELS: Record<OnboardingCodeTool, { en: string, zh: string }> = {
  'clavue': { en: 'Clavue', zh: 'Clavue' },
  'claude-code': { en: 'Claude Code', zh: 'Claude Code' },
  'codex': { en: 'Codex', zh: 'Codex' },
  'grok': { en: 'Grok CLI', zh: 'Grok CLI' },
}

export interface OnboardingState {
  completed: boolean
  completedAt: string
  completedSteps?: number[]
  version?: string
}

export interface OnboardingOptions {
  reset?: boolean
  preferredCodeTool?: string
}

function isSupportedLang(value: unknown): value is SupportedLang {
  return SUPPORTED_LANGS.includes(value as SupportedLang)
}

function isPrimaryOnboardingTool(value: unknown): value is OnboardingCodeTool {
  return STARTUP_CODE_TOOL_CHOICES.includes(value as OnboardingCodeTool)
}

function resolveOnboardingCodeTool(value?: unknown): OnboardingCodeTool {
  if (isPrimaryOnboardingTool(value)) {
    return value
  }
  return 'clavue'
}

function getToolLabel(tool: OnboardingCodeTool, lang: SupportedLang): string {
  return lang === 'zh-CN' ? TOOL_LABELS[tool].zh : TOOL_LABELS[tool].en
}

function getLanguageLabel(lang: SupportedLang): string {
  return LANG_LABELS[lang]
}

function readSavedLanguage(): SupportedLang | null {
  const savedConfig = readCcjkConfig()
  return isSupportedLang(savedConfig?.preferredLang) ? savedConfig.preferredLang : null
}

async function ensureOnboardingLanguageSelection(force = false): Promise<SupportedLang> {
  const savedConfig = readCcjkConfig()
  const savedLanguage = readSavedLanguage()
  const defaultLanguage = savedLanguage || 'zh-CN'

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

  updateCcjkConfig({
    version,
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
  const savedConfig = readCcjkConfig()
  const preferredTool = resolveOnboardingCodeTool(options.preferredCodeTool)
  const defaultTool = resolveOnboardingCodeTool(savedConfig?.codeToolType || preferredTool)

  if (options.preferredCodeTool && isPrimaryOnboardingTool(options.preferredCodeTool)) {
    updateCcjkConfig({
      version,
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
        name: `${getToolLabel('clavue', lang)} - ${isZh ? 'Clavue 控制中心（默认推荐）' : 'Clavue control center (recommended)'}`,
        value: 'clavue',
      },
      {
        name: `${getToolLabel('claude-code', lang)} - ${isZh ? 'Claude Code 控制中心' : 'Claude Code control center'}`,
        value: 'claude-code',
      },
      {
        name: `${getToolLabel('codex', lang)} - ${isZh ? 'Codex 控制中心' : 'Codex control center'}`,
        value: 'codex',
      },
      {
        name: `${getToolLabel('grok', lang)} - ${isZh ? 'Grok CLI 状态 / 配置 / 启动' : 'Grok CLI status, config, and launch'}`,
        value: 'grok',
      },
    ]),
    default: STARTUP_CODE_TOOL_CHOICES.indexOf(defaultTool),
  })

  const selectedTool = resolveOnboardingCodeTool(tool)

  updateCcjkConfig({
    version,
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
    const saved = readCcjkConfig()
    if (saved?.preferredLang) {
      await changeLanguage(saved.preferredLang)
    }
    return
  }

  if (options.reset) {
    writeOnboardingState({ completed: false, completedAt: '', completedSteps: [] })
  }

  const selectedLanguage = await ensureOnboardingLanguageSelection(options.reset === true)
  const isZh = selectedLanguage === 'zh-CN'

  console.log('')
  console.log(ansis.bold.green(isZh ? '欢迎使用 CCJK · 中国龍配置向导' : 'Welcome to CCJK · Jade Dragon setup'))
  console.log(ansis.dim(isZh
    ? '   先选择显示语言和代码工具；进入菜单后，按 W 走快捷向导，按 H 先做环境体检。'
    : '   Choose language and code tool first; in the menu, press W for setup or H for a doctor check.'))
  console.log(ansis.dim(isZh
    ? '   建议顺序：语言 → 工具 → 快捷向导 → API/MCP/权限 → 医生复查。'
    : '   Suggested path: language → tool → quick wizard → API/MCP/permissions → doctor re-check.'))
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
    version,
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