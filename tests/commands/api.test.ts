import { beforeEach, describe, expect, it, vi } from 'vitest'

const runConfigWizard = vi.fn()

vi.mock('../../src/utils/api-router', () => ({
  displayCurrentStatus: vi.fn(),
  getAllPresets: vi.fn(() => []),
  quickSetup: vi.fn(),
  runConfigWizard,
  testApiConnection: vi.fn(),
}))

vi.mock('../../src/utils/banner', () => ({
  COLORS: {
    primary: (value: string) => value,
    accent: (value: string) => value,
    secondary: (value: string) => value,
  },
  STATUS: {
    error: (value: string) => value,
    success: (value: string) => value,
  },
}))

vi.mock('../../src/i18n', () => ({
  format: (template: string, values?: Record<string, string>) => {
    if (!values) {
      return template
    }

    return Object.entries(values).reduce((result, [key, value]) => {
      return result.replace(new RegExp(`{${key}}`, 'g'), value)
    }, template)
  },
  i18n: {
    language: 'en',
    t: vi.fn((key: string) => key),
  },
  resolveSupportedLanguage: (language?: string | null) => {
    const effectiveLanguage = language || 'en'
    return typeof effectiveLanguage === 'string' && effectiveLanguage.toLowerCase().startsWith('zh')
      ? 'zh-CN'
      : 'en'
  },
}))

vi.mock('ansis', () => ({
  default: {
    green: (value: string) => value,
    gray: (value: string) => value,
  },
}))

describe('api command language resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the active UI language for the wizard when lang is omitted', async () => {
    const { i18n } = await import('../../src/i18n')
    const { apiCommand } = await import('../../src/commands/api')

    i18n.language = 'zh-CN'

    await apiCommand('wizard', [], {})

    expect(runConfigWizard).toHaveBeenCalledWith('zh-CN')
  })

  it('normalizes zh locale variants to zh-CN', async () => {
    const { i18n } = await import('../../src/i18n')
    const { apiCommand } = await import('../../src/commands/api')

    i18n.language = 'zh-Hans'

    await apiCommand('wizard', [], {})

    expect(runConfigWizard).toHaveBeenCalledWith('zh-CN')
  })

  it('keeps an explicit language override', async () => {
    const { i18n } = await import('../../src/i18n')
    const { apiCommand } = await import('../../src/commands/api')

    i18n.language = 'zh-CN'

    await apiCommand('wizard', [], { lang: 'en' })

    expect(runConfigWizard).toHaveBeenCalledWith('en')
  })
})
