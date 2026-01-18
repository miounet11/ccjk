/**
 * Modern Clack-based Prompt System
 * Beautiful, user-friendly prompts for CCJK v4.0.0
 */

import type { SupportedLang } from '../constants'
import type {
  ApiConfigOptions,
  ConfirmOptions,
  FeatureOption,
  MultiSelectOption,
  PasswordInputOptions,
  ProjectSetupConfig,
  SelectOption,
  TextInputOptions,
} from './types'
import process from 'node:process'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { AI_OUTPUT_LANGUAGES, getAiOutputLanguageLabel, LANG_LABELS, SUPPORTED_LANGS } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'

/**
 * Initialize the prompt system with intro message
 */
export function initPrompts(title: string = 'CCJK Setup'): void {
  p.intro(pc.bgCyan(pc.black(` ${title} `)))
}

/**
 * Show outro message
 */
export function outroPrompts(message: string = '🎉 Setup complete!'): void {
  p.outro(pc.green(message))
}

/**
 * Handle cancellation
 */
export function handleCancel(): never {
  ensureI18nInitialized()
  p.cancel(pc.red(i18n.t('common:cancelled')))
  process.exit(0)
}

/**
 * Check if prompt was cancelled
 */
export function isCancel(value: unknown): boolean {
  return p.isCancel(value)
}

/**
 * Show a note message
 */
export function note(message: string, title?: string): void {
  p.note(message, title)
}

/**
 * Show a log message
 */
export function log(message: string): void {
  p.log.message(message)
}

/**
 * Show a warning message
 */
export function warn(message: string): void {
  p.log.warn(pc.yellow(message))
}

/**
 * Show an error message
 */
export function error(message: string): void {
  p.log.error(pc.red(message))
}

/**
 * Show a success message
 */
export function success(message: string): void {
  p.log.success(pc.green(message))
}

/**
 * Show a step message
 */
export function step(message: string): void {
  p.log.step(message)
}

/**
 * Text input prompt
 */
export async function promptText(options: TextInputOptions): Promise<string> {
  const result = await p.text({
    message: options.message,
    placeholder: options.placeholder,
    initialValue: options.initialValue,
    defaultValue: options.defaultValue,
    validate: options.validate,
  })

  if (isCancel(result)) {
    handleCancel()
  }

  return result as string
}

/**
 * Password input prompt
 */
export async function promptPassword(options: PasswordInputOptions): Promise<string> {
  const result = await p.password({
    message: options.message,
    validate: options.validate,
  })

  if (isCancel(result)) {
    handleCancel()
  }

  return result as string
}

/**
 * Confirmation prompt
 */
export async function promptConfirm(options: ConfirmOptions): Promise<boolean> {
  const result = await p.confirm({
    message: options.message,
    initialValue: options.initialValue ?? false,
    active: options.active,
    inactive: options.inactive,
  })

  if (isCancel(result)) {
    handleCancel()
  }

  return result as boolean
}

/**
 * Select prompt
 */
export async function promptSelect<T = string>(
  message: string,
  options: SelectOption<T>[],
  initialValue?: T,
): Promise<T> {
  const result = await p.select({
    message,
    options: options.map(opt => ({
      value: opt.value,
      label: opt.label,
      hint: opt.hint,
    })) as any,
    initialValue,
  })

  if (isCancel(result)) {
    handleCancel()
  }

  return result as T
}

/**
 * Multi-select prompt
 */
export async function promptMultiSelect<T = string>(
  message: string,
  options: MultiSelectOption<T>[],
  config?: {
    required?: boolean
    cursorAt?: T
  },
): Promise<T[]> {
  const result = await p.multiselect({
    message,
    options: options.map(opt => ({
      value: opt.value,
      label: opt.label,
      hint: opt.hint,
    })) as any,
    required: config?.required ?? false,
    cursorAt: config?.cursorAt,
  })

  if (isCancel(result)) {
    handleCancel()
  }

  return result as T[]
}

/**
 * Spinner for long-running operations
 */
export function spinner(): ReturnType<typeof p.spinner> {
  return p.spinner()
}

/**
 * Main project setup wizard using p.group()
 */
export async function promptProjectSetup(): Promise<ProjectSetupConfig> {
  ensureI18nInitialized()

  initPrompts(i18n.t('cli:setupWizard'))

  const config = await p.group(
    {
      projectName: () =>
        p.text({
          message: i18n.t('cli:projectNamePrompt'),
          placeholder: 'my-awesome-project',
          validate: (value) => {
            if (!value)
              return i18n.t('cli:projectNameRequired')
            if (!/^[\w-]+$/.test(value))
              return i18n.t('cli:projectNameInvalid')
          },
        }),

      codeType: () =>
        p.select({
          message: i18n.t('cli:selectCodeType'),
          options: [
            {
              value: 'claude-code',
              label: pc.cyan('Claude Code'),
              hint: i18n.t('cli:claudeCodeHint'),
            },
            {
              value: 'codex',
              label: pc.magenta('Codex'),
              hint: i18n.t('cli:codexHint'),
            },
          ],
          initialValue: 'claude-code',
        }),

      language: () =>
        p.select({
          message: i18n.t('language:selectScriptLang'),
          options: SUPPORTED_LANGS.map(lang => ({
            value: lang,
            label: LANG_LABELS[lang],
            hint: i18n.t(`language:configLangHint.${lang}`),
          })),
          initialValue: 'en' as SupportedLang,
        }),

      aiOutputLanguage: ({ results }) =>
        p.select({
          message: i18n.t('language:selectAiOutputLang'),
          options: Object.entries(AI_OUTPUT_LANGUAGES).map(([key]) => ({
            value: key,
            label: getAiOutputLanguageLabel(key as any),
          })) as any,
          initialValue: results.language || 'en',
        }),

      features: () =>
        p.multiselect({
          message: i18n.t('cli:selectFeatures'),
          options: [
            {
              value: 'mcp',
              label: pc.blue('MCP Services'),
              hint: i18n.t('cli:mcpHint'),
            },
            {
              value: 'workflows',
              label: pc.green('AI Workflows'),
              hint: i18n.t('cli:workflowsHint'),
            },
            {
              value: 'ccr',
              label: pc.yellow('CCR Proxy'),
              hint: i18n.t('cli:ccrHint'),
            },
            {
              value: 'cometix',
              label: pc.magenta('Cometix Status Line'),
              hint: i18n.t('cli:cometixHint'),
            },
          ],
          required: false,
        }),
    },
    {
      onCancel: () => {
        handleCancel()
      },
    },
  )

  return config as ProjectSetupConfig
}

/**
 * API configuration wizard
 */
export async function promptApiConfiguration(): Promise<ApiConfigOptions> {
  ensureI18nInitialized()

  note(i18n.t('api:configureApiNote'), pc.cyan(i18n.t('api:apiConfiguration')))

  const apiType = await promptSelect<ApiConfigOptions['type']>(
    i18n.t('api:selectAuthMethod'),
    [
      {
        value: 'auth_token',
        label: pc.green('Auth Token (OAuth)'),
        hint: i18n.t('api:authTokenDesc'),
      },
      {
        value: 'api_key',
        label: pc.blue('API Key'),
        hint: i18n.t('api:apiKeyDesc'),
      },
      {
        value: 'ccr_proxy',
        label: pc.yellow('CCR Proxy'),
        hint: i18n.t('api:ccrProxyDesc'),
      },
      {
        value: 'skip',
        label: pc.gray('Skip'),
        hint: i18n.t('api:skipApiDesc'),
      },
    ],
  )

  if (apiType === 'skip') {
    return { type: 'skip' }
  }

  if (apiType === 'auth_token') {
    const authToken = await promptPassword({
      message: i18n.t('api:enterAuthToken'),
      validate: (value) => {
        if (!value)
          return i18n.t('api:authTokenRequired')
      },
    })

    return { type: 'auth_token', authToken }
  }

  if (apiType === 'api_key') {
    const provider = await promptSelect(
      i18n.t('api:selectProvider'),
      [
        { value: 'anthropic', label: 'Anthropic', hint: 'Official Claude API' },
        { value: '302ai', label: '302.AI', hint: 'Chinese proxy service' },
        { value: 'glm', label: 'GLM', hint: 'Zhipu AI' },
        { value: 'minimax', label: 'MiniMax', hint: 'MiniMax AI' },
        { value: 'kimi', label: 'Kimi', hint: 'Moonshot AI' },
        { value: 'custom', label: 'Custom', hint: 'Custom provider' },
      ],
    )

    const apiKey = await promptPassword({
      message: i18n.t('api:enterApiKey'),
      validate: (value) => {
        if (!value)
          return i18n.t('api:apiKeyRequired')
      },
    })

    return { type: 'api_key', apiKey, provider }
  }

  if (apiType === 'ccr_proxy') {
    const host = await promptText({
      message: i18n.t('api:enterCcrHost'),
      placeholder: 'localhost',
      defaultValue: 'localhost',
      validate: (value) => {
        if (!value)
          return i18n.t('api:ccrHostRequired')
      },
    })

    const portStr = await promptText({
      message: i18n.t('api:enterCcrPort'),
      placeholder: '8787',
      defaultValue: '8787',
      validate: (value) => {
        const port = Number.parseInt(value, 10)
        if (Number.isNaN(port) || port < 1 || port > 65535)
          return i18n.t('api:ccrPortInvalid')
      },
    })

    return {
      type: 'ccr_proxy',
      ccrProxy: {
        host,
        port: Number.parseInt(portStr, 10),
      },
    }
  }

  return { type: 'skip' }
}

/**
 * Feature selection wizard
 */
export async function promptFeatureSelection(
  availableFeatures: FeatureOption[],
): Promise<string[]> {
  ensureI18nInitialized()

  note(i18n.t('cli:featureSelectionNote'), pc.cyan(i18n.t('cli:features')))

  const features = await promptMultiSelect(
    i18n.t('cli:selectFeatures'),
    availableFeatures.map(f => ({
      value: f.value,
      label: f.label,
      hint: f.hint,
      selected: f.selected,
    })),
    {
      required: false,
    },
  )

  return features
}

/**
 * Confirmation dialog with beautiful styling
 */
export async function promptConfirmation(
  message: string,
  options?: {
    initialValue?: boolean
    active?: string
    inactive?: string
  },
): Promise<boolean> {
  return promptConfirm({
    message,
    initialValue: options?.initialValue ?? false,
    active: options?.active,
    inactive: options?.inactive,
  })
}

/**
 * Language selection prompt
 */
export async function promptLanguageSelection(): Promise<SupportedLang> {
  const lang = await promptSelect<SupportedLang>(
    'Select CCJK display language / 选择CCJK显示语言',
    SUPPORTED_LANGS.map(l => ({
      value: l,
      label: LANG_LABELS[l],
    })),
    'en',
  )

  return lang
}

/**
 * AI output language selection
 */
export async function promptAiOutputLanguage(defaultLang?: string): Promise<string> {
  ensureI18nInitialized()

  const lang = await promptSelect(
    i18n.t('language:selectAiOutputLang'),
    Object.entries(AI_OUTPUT_LANGUAGES).map(([key]) => ({
      value: key,
      label: getAiOutputLanguageLabel(key as any),
    })),
    defaultLang || 'en',
  )

  // If custom language selected, ask for the specific language
  if (lang === 'custom') {
    const customLang = await promptText({
      message: i18n.t('language:enterCustomLanguage'),
      validate: (value) => {
        if (!value)
          return i18n.t('language:languageRequired')
      },
    })

    return customLang
  }

  return lang
}

/**
 * Show a progress bar (simulated with spinner)
 */
export async function withProgress<T>(
  message: string,
  task: () => Promise<T>,
): Promise<T> {
  const s = spinner()
  s.start(message)

  try {
    const result = await task()
    s.stop(pc.green('✓ Done'))
    return result
  }
  catch (err) {
    s.stop(pc.red('✗ Failed'))
    throw err
  }
}

/**
 * Show multiple steps with progress
 */
export async function withSteps<T>(
  steps: Array<{ message: string, task: () => Promise<T> }>,
): Promise<T[]> {
  const results: T[] = []

  for (let i = 0; i < steps.length; i++) {
    const { message, task } = steps[i]
    step(`${i + 1}/${steps.length} ${message}`)

    const s = spinner()
    s.start(message)

    try {
      const result = await task()
      s.stop(pc.green('✓'))
      results.push(result)
    }
    catch (err) {
      s.stop(pc.red('✗'))
      throw err
    }
  }

  return results
}
