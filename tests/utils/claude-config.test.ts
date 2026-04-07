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

describe('claude-config myclaude sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('syncs current Claude-family profile into myclaude runtime config', async () => {
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
    mockReadJsonConfig.mockImplementation((path?: string) => path?.includes('settings.json') ? { env: {} } : { mcpServers: {} })

    const { syncMyclaudeProviderProfilesFromCurrentClaudeConfig } = await import('../../src/utils/claude-config')
    const result = syncMyclaudeProviderProfilesFromCurrentClaudeConfig()

    expect(result.activeProfileId).toBe('ttqq')
    expect(result.activeProfile).toMatchObject({
      id: 'ttqq',
      name: 'TTQQ',
      provider: 'custom',
      baseUrl: 'https://router.example.com/v1',
      primaryModel: 'claude-sonnet-4-6',
      defaultHaikuModel: 'claude-haiku-4-5',
      defaultSonnetModel: 'claude-sonnet-4-6',
      defaultOpusModel: 'claude-opus-4-6',
    })
    expect(result.profiles).toHaveLength(1)

    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.claude.json'),
      expect.objectContaining({
        myclaudeActiveProviderProfileId: 'ttqq',
        myclaudeProviderProfiles: [
          expect.objectContaining({
            id: 'ttqq',
            name: 'TTQQ',
            provider: 'custom',
            model: 'claude-sonnet-4-6',
            fastModel: 'claude-haiku-4-5',
          }),
        ],
      }),
    )
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.objectContaining({
        env: expect.objectContaining({
          ANTHROPIC_API_KEY: 'sk-test',
          ANTHROPIC_BASE_URL: 'https://router.example.com/v1',
          ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4-5',
          ANTHROPIC_SMALL_FAST_MODEL: 'claude-haiku-4-5',
          ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4-6',
          ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-opus-4-6',
        }),
      }),
    )
  })

  it('clears myclaude runtime profiles when no Claude-family config exists', async () => {
    mockReadClaudeConfig.mockReturnValue(null)
    mockReadJsonConfig.mockImplementation((path?: string) => path?.includes('settings.json')
      ? {
          env: {
            ANTHROPIC_API_KEY: 'sk-legacy',
            ANTHROPIC_BASE_URL: 'https://legacy.example.com',
            ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4-5',
          },
          model: 'claude-sonnet-4-6',
        }
      : {
          mcpServers: {},
          myclaudeProviderProfiles: [{ id: 'legacy', name: 'Legacy', provider: 'custom' }],
          myclaudeActiveProviderProfileId: 'legacy',
        })

    const { syncMyclaudeProviderProfilesFromCurrentClaudeConfig } = await import('../../src/utils/claude-config')
    const result = syncMyclaudeProviderProfilesFromCurrentClaudeConfig()

    expect(result).toEqual({
      activeProfileId: '',
      activeProfile: null,
      profiles: [],
    })
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.claude.json'),
      { mcpServers: {} },
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
})
