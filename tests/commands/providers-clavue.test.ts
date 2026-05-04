import { beforeEach, describe, expect, it, vi } from 'vitest'

const getApiProviderPresets = vi.fn()

vi.mock('../../src/config/api-providers', () => ({
  getApiProviderPresets,
}))

vi.mock('../../src/i18n', () => ({
  i18n: {
    language: 'en',
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('ansis', () => ({
  default: {
    bold: Object.assign((value: string) => value, {
      blue: (value: string) => value,
      cyan: (value: string) => value,
      green: (value: string) => value,
    }),
    cyan: (value: string) => value,
    dim: (value: string) => value,
    green: (value: string) => value,
    red: (value: string) => value,
    yellow: (value: string) => value,
  },
}))

describe('providers command Clavue support', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getApiProviderPresets.mockResolvedValue([
      {
        id: 'glm',
        name: 'GLM',
        supportedCodeTools: ['claude-code', 'clavue'],
        claudeCode: {
          baseUrl: 'https://open.bigmodel.cn/api/anthropic',
          authType: 'auth_token',
          defaultModels: ['glm-4.6'],
        },
        description: 'GLM provider',
      },
    ])
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shows Claude-family auth metadata when listing Clavue providers', async () => {
    const { listProviders } = await import('../../src/commands/providers')

    await listProviders({ codeType: 'clavue', verbose: true })

    expect(getApiProviderPresets).toHaveBeenCalledWith('clavue')
    const output = vi.mocked(console.log).mock.calls.flat().join('\n')
    expect(output).toContain('Base URL')
    expect(output).toContain('https://open.bigmodel.cn/api/anthropic')
    expect(output).toContain('Auth Type')
    expect(output).toContain('auth_token')
    expect(output).toContain('Default Models')
    expect(output).toContain('glm-4.6')
  })

  it('includes Clavue in providers help code type text', async () => {
    const { providersCommand } = await import('../../src/commands/providers')

    await providersCommand('help')

    const output = vi.mocked(console.log).mock.calls.flat().join('\n')
    expect(output).toContain('claude-code, clavue, codex')
  })
})
