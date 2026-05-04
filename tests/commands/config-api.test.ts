import { beforeEach, describe, expect, it, vi } from 'vitest'

const getApiProvidersAsync = vi.fn()
const getClaudeApiConfig = vi.fn()
const setClaudeApiConfig = vi.fn()
const setMyclaudeProviderProfiles = vi.fn()
const readClavueConfig = vi.fn()
const readJsonConfig = vi.fn()
const ensureI18nInitialized = vi.fn()

vi.mock('../../src/config/api-providers', () => ({
  getApiProvidersAsync,
}))

vi.mock('../../src/config/unified/claude-config', () => ({
  getApiConfig: getClaudeApiConfig,
  setApiConfig: setClaudeApiConfig,
}))

vi.mock('../../src/utils/claude-config', () => ({
  readClavueConfig,
  setMyclaudeProviderProfiles,
}))

vi.mock('../../src/utils/json-config', () => ({
  readJsonConfig,
}))

vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized,
  i18n: {
    language: 'en',
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('ansis', () => ({
  default: {
    bold: Object.assign((value: string) => value, {
      cyan: (value: string) => value,
    }),
    cyan: (value: string) => value,
    dim: (value: string) => value,
    green: (value: string) => value,
    red: (value: string) => value,
    yellow: (value: string) => value,
  },
}))

const glmProvider = {
  id: 'glm',
  name: 'GLM',
  supportedCodeTools: ['claude-code', 'clavue'],
  claudeCode: {
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    authType: 'auth_token',
    defaultModels: ['glm-4.6', 'glm-4.5-air', 'glm-4.6', 'glm-z1-air'],
  },
}

const exactProvider = {
  id: 'exact',
  name: 'Exact Provider',
  supportedCodeTools: ['claude-code', 'clavue'],
  claudeCode: {
    baseUrl: 'https://exact.example.com/api/anthropic',
    authType: 'api_key',
    defaultModels: [
      '  GPT-5.4-EXACT  ',
      'gpt-5.3-codex-spark',
      'MiniMax-M2',
      'Claude-Opus-4.6',
    ],
  },
}

describe('config api command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getApiProvidersAsync.mockResolvedValue([glmProvider])
    getClaudeApiConfig.mockReturnValue(null)
    readClavueConfig.mockReturnValue(null)
    readJsonConfig.mockReturnValue(null)
  })

  it('writes Clavue custom API provider profiles with model routing slots', async () => {
    const { apiCommand } = await import('../../src/commands/config/api')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await apiCommand(['glm', 'sk-test'], { codeType: 'clavue' })

    expect(setClaudeApiConfig).not.toHaveBeenCalled()
    expect(setMyclaudeProviderProfiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'glm',
        provider: 'glm',
        apiKey: 'sk-test',
        baseUrl: 'https://open.bigmodel.cn/api/anthropic',
        authType: 'auth_token',
        primaryModel: 'glm-4.6',
        defaultHaikuModel: 'glm-4.5-air',
        defaultSonnetModel: 'glm-4.6',
        defaultOpusModel: 'glm-z1-air',
      }),
    ], 'glm')

    const output = logSpy.mock.calls.flat().join('\n')
    expect(output).toContain('Clavue')
    expect(output).not.toContain('use Claude Code with the configured provider')
    logSpy.mockRestore()
  })

  it('keeps Clavue provider default model slots as exact IDs without fuzzy matching', async () => {
    getApiProvidersAsync.mockResolvedValue([exactProvider])
    const { apiCommand } = await import('../../src/commands/config/api')

    await apiCommand(['exact', 'sk-test'], { codeType: 'clavue' })

    expect(setMyclaudeProviderProfiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'exact',
        provider: 'exact',
        primaryModel: 'GPT-5.4-EXACT',
        defaultHaikuModel: 'gpt-5.3-codex-spark',
        defaultSonnetModel: 'MiniMax-M2',
        defaultOpusModel: 'Claude-Opus-4.6',
      }),
    ], 'exact')
  })

  it('shows Clavue current API from native provider profile credentials', async () => {
    const { apiCommand } = await import('../../src/commands/config/api')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    readClavueConfig.mockReturnValue({
      clavueActiveProviderProfileId: 'ccjk-glm',
      clavueProviderProfiles: [
        {
          id: 'ccjk-glm',
          name: 'GLM',
          providerId: 'glm',
          baseUrl: 'https://open.bigmodel.cn/api/anthropic',
          authType: 'auth_token',
        },
      ],
    })
    readJsonConfig.mockReturnValue({
      providerProfiles: {
        'ccjk-glm': {
          credential: 'sk-test-1234',
          authType: 'auth_token',
        },
      },
    })

    await apiCommand([], { codeType: 'clavue', show: true })

    const output = logSpy.mock.calls.flat().join('\n')
    expect(output).toContain('Base URL:')
    expect(output).toContain('https://open.bigmodel.cn/api/anthropic')
    expect(output).toContain('Auth Type:')
    expect(output).toContain('auth_token')
    expect(output).toContain('sk-t...1234')
    expect(output).toContain('Provider:')
    expect(output).toContain('GLM')

    logSpy.mockRestore()
  })
})
