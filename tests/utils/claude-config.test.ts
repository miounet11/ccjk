import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockReadJsonConfig = vi.fn()
const mockWriteJsonConfig = vi.fn()
const mockReadClaudeConfig = vi.fn()

vi.mock('../../src/utils/json-config', () => ({
  backupJsonConfig: vi.fn(),
  readJsonConfig: mockReadJsonConfig,
  writeJsonConfig: mockWriteJsonConfig,
}))

vi.mock('../../src/utils/platform', () => ({
  getMcpCommand: vi.fn((command: string) => [command]),
  isWindows: vi.fn(() => false),
}))

vi.mock('../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    readConfig: mockReadClaudeConfig,
  },
}))

describe('claude-config Clavue sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('syncs current Claude-family profile into Clavue runtime config', async () => {
    mockReadClaudeConfig.mockReturnValue({
      currentProfileId: 'ttqq',
      profiles: {
        ttqq: {
          name: 'TTQQ',
          authType: 'api_key',
          provider: 'custom',
          apiKey: 'sk-test',
          baseUrl: 'https://router.example.com/v1',
          primaryModel: 'claude-sonnet-4-6',
          defaultHaikuModel: 'claude-haiku-4-5',
          defaultSonnetModel: 'claude-sonnet-4-6',
          defaultOpusModel: 'claude-opus-4-6',
        },
      },
    })
    mockReadJsonConfig.mockImplementation((path?: string) => path?.includes('settings.json')
      ? {
          env: {},
          baseUrl: 'https://stale.example.com/v1',
          apiKey: 'sk-stale',
          authToken: 'token-stale',
          defaultModel: 'stale-default',
          preferredModel: 'stale-preferred',
        }
      : { mcpServers: {} })

    const { syncMyclaudeProviderProfilesFromCurrentClaudeConfig } = await import('../../src/utils/claude-config')
    const result = syncMyclaudeProviderProfilesFromCurrentClaudeConfig()

    expect(result.activeProfileId).toBe('ccjk-ttqq')
    expect(result.activeProfile).toMatchObject({
      id: 'ttqq',
      name: 'TTQQ',
      provider: 'custom',
      baseUrl: 'https://router.example.com/v1',
      mode: 'openai-native',
      primaryModel: 'claude-sonnet-4-6',
      defaultHaikuModel: 'claude-haiku-4-5',
      defaultSonnetModel: 'claude-sonnet-4-6',
      defaultOpusModel: 'claude-opus-4-6',
    })
    expect(result.profiles).toHaveLength(1)

    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.clavue.json'),
      expect.objectContaining({
        clavueActiveProviderProfileId: 'ccjk-ttqq',
        clavueProviderProfiles: [
          expect.objectContaining({
            id: 'ccjk-ttqq',
            name: 'TTQQ',
            providerId: 'custom',
            modelMode: 'anthropic_native',
            baseUrl: 'https://router.example.com',
            authType: 'api_key',
            modelRouting: expect.objectContaining({
              presetId: 'custom',
              primaryModel: 'claude-sonnet-4-6',
              smallFastModel: 'claude-haiku-4-5',
              planModel: 'claude-opus-4-6',
              generalModel: 'claude-sonnet-4-6',
            }),
            provenance: expect.objectContaining({
              kind: 'imported',
              sourceId: 'ccjk',
              externalProfileId: 'ttqq',
            }),
          }),
        ],
      }),
    )
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.credentials.json'),
      expect.objectContaining({
        providerProfiles: {
          'ccjk-ttqq': {
            credential: 'sk-test',
            authType: 'api_key',
          },
        },
      }),
    )
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.not.objectContaining({
        baseUrl: expect.anything(),
        apiKey: expect.anything(),
        authToken: expect.anything(),
        defaultModel: expect.anything(),
        preferredModel: expect.anything(),
      }),
    )
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.objectContaining({
        env: expect.objectContaining({
          ANTHROPIC_BASE_URL: 'https://router.example.com',
          ANTHROPIC_MODEL: 'claude-sonnet-4-6',
          ANTHROPIC_CUSTOM_MODEL_OPTION: 'claude-sonnet-4-6',
          ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4-5',
          ANTHROPIC_SMALL_FAST_MODEL: 'claude-haiku-4-5',
          ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4-6',
          ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-opus-4-6',
          CLAUDE_CODE_SUBAGENT_MODEL: 'claude-sonnet-4-6',
        }),
        model: 'claude-sonnet-4-6',
      }),
    )
    const settingsWrite = mockWriteJsonConfig.mock.calls.find(([path]) => String(path).includes('settings.json'))?.[1]
    expect(settingsWrite.env).not.toHaveProperty('ANTHROPIC_API_KEY')
    expect(settingsWrite.env).not.toHaveProperty('ANTHROPIC_AUTH_TOKEN')
  })

  it('clears Clavue runtime profiles when no Claude-family config exists', async () => {
    mockReadClaudeConfig.mockReturnValue(null)
    mockReadJsonConfig.mockImplementation((path?: string) => path?.includes('settings.json')
      ? {
          env: {
            ANTHROPIC_API_KEY: 'sk-legacy',
            ANTHROPIC_BASE_URL: 'https://legacy.example.com',
            ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4-5',
          },
          model: 'claude-sonnet-4-6',
          baseUrl: 'https://stale.example.com',
          apiKey: 'sk-stale',
          defaultModel: 'stale-default',
          preferredModel: 'stale-preferred',
        }
      : {
          mcpServers: {},
          clavueProviderProfiles: [
            {
              id: 'native',
              name: 'Native',
              providerId: 'custom',
              provenance: {
                kind: 'imported',
                sourceId: 'ccjk',
              },
            },
          ],
          clavueActiveProviderProfileId: 'native',
          myclaudeProviderProfiles: [{ id: 'legacy', name: 'Legacy', provider: 'custom' }],
          myclaudeActiveProviderProfileId: 'legacy',
          keepMe: true,
        })

    const { syncMyclaudeProviderProfilesFromCurrentClaudeConfig } = await import('../../src/utils/claude-config')
    const result = syncMyclaudeProviderProfilesFromCurrentClaudeConfig()

    expect(result).toEqual({
      activeProfileId: '',
      activeProfile: null,
      profiles: [],
    })
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.clavue.json'),
      { mcpServers: {}, keepMe: true },
    )
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.not.objectContaining({
        baseUrl: expect.anything(),
        apiKey: expect.anything(),
        defaultModel: expect.anything(),
        preferredModel: expect.anything(),
      }),
    )
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.objectContaining({
        env: expect.objectContaining({
          ANTHROPIC_MODEL: '',
        }),
      }),
    )
  })

  it('preserves manual Clavue profiles when clearing CCJK-synced state', async () => {
    mockReadClaudeConfig.mockReturnValue(null)
    mockReadJsonConfig.mockImplementation((path?: string) => {
      if (path?.includes('settings.json')) {
        return { env: {} }
      }
      if (path?.includes('.credentials.json')) {
        return {
          providerProfiles: {
            manual: { credential: 'sk-manual', authType: 'api_key' },
            ccjk: { credential: 'sk-ccjk', authType: 'api_key' },
          },
        }
      }
      return {
        mcpServers: {},
        clavueProviderProfiles: [
          {
            id: 'manual',
            name: 'Manual',
            providerId: 'custom',
            modelMode: 'openai_native',
            baseUrl: 'https://manual.example.com',
            authType: 'api_key',
            modelRouting: {
              presetId: 'custom',
              primaryModel: 'gpt-5.4',
              subagentModel: '',
              smallFastModel: 'gpt-5.4',
              planModel: 'gpt-5.4',
              exploreModel: 'gpt-5.4',
              generalModel: 'gpt-5.4',
              teamModel: 'gpt-5.4',
              guideModel: 'gpt-5.4',
            },
          },
          {
            id: 'ccjk',
            name: 'CCJK',
            providerId: 'custom',
            modelMode: 'openai_native',
            baseUrl: 'https://ccjk.example.com',
            authType: 'api_key',
            modelRouting: {
              presetId: 'custom',
              primaryModel: 'gpt-5.4',
              subagentModel: '',
              smallFastModel: 'gpt-5.4',
              planModel: 'gpt-5.4',
              exploreModel: 'gpt-5.4',
              generalModel: 'gpt-5.4',
              teamModel: 'gpt-5.4',
              guideModel: 'gpt-5.4',
            },
            provenance: {
              kind: 'imported',
              sourceId: 'ccjk',
            },
          },
        ],
        clavueActiveProviderProfileId: 'ccjk',
      }
    })

    const { syncMyclaudeProviderProfilesFromCurrentClaudeConfig } = await import('../../src/utils/claude-config')
    syncMyclaudeProviderProfilesFromCurrentClaudeConfig()

    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.clavue.json'),
      expect.objectContaining({
        clavueActiveProviderProfileId: 'manual',
        clavueProviderProfiles: [
          expect.objectContaining({
            id: 'manual',
          }),
        ],
      }),
    )
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.credentials.json'),
      expect.objectContaining({
        providerProfiles: {
          manual: { credential: 'sk-manual', authType: 'api_key' },
        },
      }),
    )
  })

  it('normalizes Clavue provider mode when profiles are written directly', async () => {
    mockReadJsonConfig.mockReturnValue({ mcpServers: {} })

    const { setMyclaudeProviderProfiles } = await import('../../src/utils/claude-config')
    setMyclaudeProviderProfiles([
      {
        id: 'primary',
        name: 'Primary',
        provider: 'custom',
        apiKey: 'sk-test',
        baseUrl: 'https://router.example.com/v1',
        authType: 'api_key',
      },
    ], 'primary')

    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.clavue.json'),
      expect.objectContaining({
        clavueActiveProviderProfileId: 'ccjk-primary',
        clavueProviderProfiles: [
          expect.objectContaining({
            id: 'ccjk-primary',
            providerId: 'custom',
            modelMode: 'openai_native',
            baseUrl: 'https://router.example.com',
          }),
        ],
      }),
    )
  })

  it('does not overwrite existing Clavue-native profiles when syncing matching CCJK profiles', async () => {
    mockReadClaudeConfig.mockReturnValue({
      currentProfileId: 'primary',
      profiles: {
        primary: {
          name: 'Primary',
          authType: 'api_key',
          provider: 'custom',
          apiKey: 'sk-new',
          baseUrl: 'https://router.example.com/v1/messages',
          primaryModel: 'gpt-5.4',
        },
      },
    })
    mockReadJsonConfig.mockImplementation((path?: string) => {
      if (path?.includes('settings.json')) {
        return { env: {} }
      }
      if (path?.includes('.credentials.json')) {
        return { providerProfiles: {} }
      }
      return {
        mcpServers: {},
        clavueProviderProfiles: [
          {
            id: 'primary',
            name: 'Primary',
            providerId: 'custom',
            modelMode: 'openai_native',
            baseUrl: 'https://router.example.com',
            authType: 'api_key',
            modelRouting: {
              presetId: 'custom',
              primaryModel: 'gpt-5.1',
              subagentModel: '',
              smallFastModel: 'gpt-5.1',
              planModel: 'gpt-5.1',
              exploreModel: 'gpt-5.1',
              generalModel: 'gpt-5.1',
              teamModel: 'gpt-5.1',
              guideModel: 'gpt-5.1',
            },
            createdAt: 123,
          },
        ],
      }
    })

    const { syncMyclaudeProviderProfilesFromCurrentClaudeConfig } = await import('../../src/utils/claude-config')
    const result = syncMyclaudeProviderProfilesFromCurrentClaudeConfig()

    expect(result.activeProfileId).toBe('ccjk-primary')

    const clavueWrite = mockWriteJsonConfig.mock.calls.find(([path]) => String(path).includes('.clavue.json'))?.[1]
    expect(clavueWrite).toMatchObject({
      clavueActiveProviderProfileId: 'ccjk-primary',
      clavueProviderProfiles: [
        {
          id: 'primary',
          baseUrl: 'https://router.example.com',
          createdAt: 123,
        },
        {
          id: 'ccjk-primary',
          providerId: 'custom',
          baseUrl: 'https://router.example.com',
          provenance: {
            kind: 'imported',
            sourceId: 'ccjk',
            externalProfileId: 'primary',
          },
          modelRouting: {
            primaryModel: 'gpt-5.4',
          },
        },
      ],
    })
    expect(clavueWrite.clavueProviderProfiles[0]).not.toHaveProperty('provenance')
  })

  it('preserves Clavue built-in provider ids and manual credentials on direct provider writes', async () => {
    mockReadJsonConfig.mockImplementation((path?: string) => {
      if (path?.includes('settings.json')) {
        return { env: {} }
      }
      if (path?.includes('.credentials.json')) {
        return {
          providerProfiles: {
            'glm': { credential: 'sk-manual', authType: 'api_key' },
            'ccjk-old': { credential: 'sk-old', authType: 'api_key' },
          },
        }
      }
      return {
        mcpServers: {},
        clavueActiveProviderProfileId: 'glm',
        clavueProviderProfiles: [
          {
            id: 'glm',
            name: 'GLM Native',
            providerId: 'glm',
            modelMode: 'openai_native',
            baseUrl: 'https://native.bigmodel.cn/api/paas/v4',
            authType: 'api_key',
            modelRouting: {
              presetId: 'custom',
              primaryModel: 'glm-4.6',
              subagentModel: '',
              smallFastModel: 'glm-4.5-air',
              planModel: 'glm-4.6',
              exploreModel: 'glm-4.6',
              generalModel: 'glm-4.6',
              teamModel: 'glm-4.6',
              guideModel: 'glm-4.6',
            },
          },
          {
            id: 'ccjk-old',
            name: 'Old CCJK',
            providerId: 'custom',
            modelMode: 'openai_native',
            baseUrl: 'https://old.example.com',
            authType: 'api_key',
            modelRouting: {
              presetId: 'custom',
              primaryModel: 'gpt-5.1',
              subagentModel: '',
              smallFastModel: 'gpt-5.1',
              planModel: 'gpt-5.1',
              exploreModel: 'gpt-5.1',
              generalModel: 'gpt-5.1',
              teamModel: 'gpt-5.1',
              guideModel: 'gpt-5.1',
            },
            provenance: {
              kind: 'imported',
              sourceId: 'ccjk',
              externalProfileId: 'old',
            },
          },
        ],
      }
    })

    const { setMyclaudeProviderProfiles } = await import('../../src/utils/claude-config')
    const activeId = setMyclaudeProviderProfiles([
      {
        id: 'glm',
        name: 'GLM',
        provider: 'glm',
        apiKey: 'sk-ccjk',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        authType: 'api_key',
        primaryModel: 'glm-4.6',
        defaultHaikuModel: 'glm-4.5-air',
        defaultSonnetModel: 'glm-4.6',
      },
    ], 'glm')

    expect(activeId).toBe('ccjk-glm')
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.clavue.json'),
      expect.objectContaining({
        clavueActiveProviderProfileId: 'ccjk-glm',
        clavueProviderProfiles: [
          expect.objectContaining({
            id: 'glm',
            name: 'GLM Native',
            providerId: 'glm',
          }),
          expect.objectContaining({
            id: 'ccjk-glm',
            name: 'GLM',
            providerId: 'glm',
            baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
            modelRouting: expect.objectContaining({
              primaryModel: 'glm-4.6',
              smallFastModel: 'glm-4.5-air',
            }),
            provenance: expect.objectContaining({
              kind: 'imported',
              sourceId: 'ccjk',
              externalProfileId: 'glm',
            }),
          }),
        ],
      }),
    )
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.credentials.json'),
      expect.objectContaining({
        providerProfiles: {
          'glm': { credential: 'sk-manual', authType: 'api_key' },
          'ccjk-glm': { credential: 'sk-ccjk', authType: 'api_key' },
        },
      }),
    )
  })
})
