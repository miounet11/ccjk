import { beforeEach, describe, expect, it, vi } from 'vitest'

const prompt = vi.fn()

vi.mock('inquirer', () => {
  class Separator {
    value: string

    constructor(value: string) {
      this.value = value
    }
  }

  return {
    default: {
      prompt,
      Separator,
    },
  }
})

vi.mock('ansis', () => ({
  default: {
    bold: {
      cyan: (value: string) => value,
    },
    cyan: (value: string) => value,
    gray: (value: string) => value,
    green: (value: string) => value,
    red: (value: string) => value,
    yellow: (value: string) => value,
  },
}))

vi.mock('../../src/i18n', () => ({
  i18n: {
    language: 'en',
  },
}))

vi.mock('../../src/utils/api-router/presets', () => ({
  getAllPresets: vi.fn(() => []),
  getChinesePresets: vi.fn(() => []),
  getPresetById: vi.fn(),
  getRecommendedPresets: vi.fn(() => []),
}))

vi.mock('../../src/utils/api-router/simple-mode', () => ({
  clearApiConfig: vi.fn(),
  configureOfficialMode: vi.fn(),
  configureSimpleMode: vi.fn(),
  configureWithPreset: vi.fn(),
  detectCurrentMode: vi.fn(() => ({ mode: 'none', provider: undefined })),
  getCurrentConfig: vi.fn(() => undefined),
  quickSetup: vi.fn(),
  validateApiKey: vi.fn(),
}))

describe('api router manager language resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses Chinese wizard copy for zh-CN when lang is omitted', async () => {
    const { i18n } = await import('../../src/i18n')
    const { runConfigWizard } = await import('../../src/utils/api-router/manager')

    i18n.language = 'zh-CN'
    prompt.mockRejectedValueOnce(new Error('stop'))

    await expect(runConfigWizard()).rejects.toThrow('stop')
    expect(prompt).toHaveBeenCalledWith(expect.objectContaining({
      message: '选择配置模式:',
      choices: [
        expect.objectContaining({
          name: '1. 自定义配置 - 手动输入 API 地址和密钥',
          value: 'custom',
        }),
        expect.objectContaining({
          name: '2. 官方 Anthropic API - 直接连接 Anthropic',
          value: 'official',
        }),
        expect.objectContaining({
          name: '3. CCR 高级路由 - 完整 Claude Code Router 配置',
          value: 'ccr',
        }),
        expect.objectContaining({
          name: '4. 快速配置 (推荐) - 选择预设提供商',
          value: 'quick',
        }),
      ],
    }))
  })

  it('normalizes zh locale variants to Chinese wizard copy', async () => {
    const { i18n } = await import('../../src/i18n')
    const { runConfigWizard } = await import('../../src/utils/api-router/manager')

    i18n.language = 'zh-Hans'
    prompt.mockRejectedValueOnce(new Error('stop'))

    await expect(runConfigWizard()).rejects.toThrow('stop')
    expect(prompt).toHaveBeenCalledWith(expect.objectContaining({
      message: '选择配置模式:',
    }))
  })
})
