import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReadJsonConfig = vi.fn();
const mockWriteJsonConfig = vi.fn();
const mockReadClaudeConfig = vi.fn();

vi.mock('../../src/utils/json-config', () => ({
  backupJsonConfig: vi.fn(),
  readJsonConfig: mockReadJsonConfig,
  writeJsonConfig: mockWriteJsonConfig,
}));

vi.mock('../../src/utils/platform', () => ({
  getMcpCommand: vi.fn((command: string) => [command]),
  isWindows: vi.fn(() => false),
}));

vi.mock('../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    readConfig: mockReadClaudeConfig,
  },
}));

vi.mock('../../src/utils/fs-operations', () => ({
  copyFile: vi.fn(),
  ensureDir: vi.fn(),
  exists: vi.fn(() => false),
}));

describe('clavue-config sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    });
    mockReadJsonConfig.mockImplementation((path?: string) => path?.includes('settings.json')
      ? {
          statusLine: {},
          env: {},
          baseUrl: 'https://stale.example.com/v1',
          apiKey: 'sk-stale',
          authToken: 'token-stale',
          defaultModel: 'stale-default',
          preferredModel: 'stale-preferred',
        }
      : { mcpServers: {} });

    const { syncMyclaudeProviderProfilesFromCurrentClaudeConfig } = await import('../../src/utils/clavue-config');
    const result = syncMyclaudeProviderProfilesFromCurrentClaudeConfig();

    expect(result.activeProfileId).toBe('ccjk-ttqq');
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
    });
    expect(result.profiles).toHaveLength(1);

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
              presetId: 'claude_code_heritage',
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
    );
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
    );
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.not.objectContaining({
        baseUrl: expect.anything(),
        apiKey: expect.anything(),
        authToken: expect.anything(),
        defaultModel: expect.anything(),
        preferredModel: expect.anything(),
      }),
    );
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.objectContaining({
        env: expect.objectContaining({
          ANTHROPIC_BASE_URL: 'https://router.example.com',
          ANTHROPIC_CUSTOM_MODEL_OPTION: 'claude-sonnet-4-6',
          ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4-5',
          ANTHROPIC_SMALL_FAST_MODEL: 'claude-haiku-4-5',
          ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4-6',
          ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-opus-4-6',
          CLAUDE_CODE_SUBAGENT_MODEL: 'claude-sonnet-4-6',
        }),
      }),
    );
    const settingsWrite = mockWriteJsonConfig.mock.calls.find(([path]) => String(path).includes('settings.json'))?.[1];
    expect(settingsWrite.statusLine).toBeUndefined();
    expect(settingsWrite.env).not.toHaveProperty('ANTHROPIC_API_KEY');
    expect(settingsWrite.env).not.toHaveProperty('ANTHROPIC_AUTH_TOKEN');
    // settings.model and env.ANTHROPIC_MODEL must NOT be set when adaptive routing is configured —
    // both override ANTHROPIC_DEFAULT_*_MODEL and re-trigger the migration loop.
    expect(settingsWrite.model).toBeUndefined();
    expect(settingsWrite.env).not.toHaveProperty('ANTHROPIC_MODEL');
  });

  it('clears Clavue runtime profiles when no Claude-family config exists', async () => {
    mockReadClaudeConfig.mockReturnValue(null);
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
        });

    const { syncMyclaudeProviderProfilesFromCurrentClaudeConfig } = await import('../../src/utils/clavue-config');
    const result = syncMyclaudeProviderProfilesFromCurrentClaudeConfig();

    expect(result).toEqual({
      activeProfileId: '',
      activeProfile: null,
      profiles: [],
    });
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.clavue.json'),
      { mcpServers: {}, keepMe: true },
    );
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.not.objectContaining({
        baseUrl: expect.anything(),
        apiKey: expect.anything(),
        defaultModel: expect.anything(),
        preferredModel: expect.anything(),
      }),
    );
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.objectContaining({
        env: expect.objectContaining({
          ANTHROPIC_MODEL: '',
        }),
      }),
    );
  });

  it('preserves manual Clavue profiles when clearing CCJK-synced state', async () => {
    mockReadClaudeConfig.mockReturnValue(null);
    mockReadJsonConfig.mockImplementation((path?: string) => {
      if (path?.includes('settings.json')) {
        return { env: {} };
      }
      if (path?.includes('.credentials.json')) {
        return {
          providerProfiles: {
            manual: { credential: 'sk-manual', authType: 'api_key' },
            ccjk: { credential: 'sk-ccjk', authType: 'api_key' },
          },
        };
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
      };
    });

    const { syncMyclaudeProviderProfilesFromCurrentClaudeConfig } = await import('../../src/utils/clavue-config');
    syncMyclaudeProviderProfilesFromCurrentClaudeConfig();

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
    );
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.credentials.json'),
      expect.objectContaining({
        providerProfiles: {
          manual: { credential: 'sk-manual', authType: 'api_key' },
        },
      }),
    );
  });

  it('normalizes Clavue provider mode when profiles are written directly', async () => {
    mockReadJsonConfig.mockReturnValue({ mcpServers: {} });

    const { setMyclaudeProviderProfiles } = await import('../../src/utils/clavue-config');
    setMyclaudeProviderProfiles([
      {
        id: 'primary',
        name: 'Primary',
        provider: 'custom',
        apiKey: 'sk-test',
        baseUrl: 'https://router.example.com/v1',
        authType: 'api_key',
      },
    ], 'primary');

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
            modelRouting: expect.objectContaining({
              presetId: 'gpt_5_4_codex',
            }),
          }),
        ],
      }),
    );
  });

  it('marks mixed Clavue model routing as hybrid-compatible custom routing', async () => {
    mockReadJsonConfig.mockReturnValue({ mcpServers: {} });

    const { setMyclaudeProviderProfiles } = await import('../../src/utils/clavue-config');
    setMyclaudeProviderProfiles([
      {
        id: 'hybrid',
        name: 'Hybrid',
        provider: 'custom',
        apiKey: 'sk-test',
        baseUrl: 'https://router.example.com/v1',
        authType: 'api_key',
        primaryModel: 'gpt-5.4',
        defaultHaikuModel: 'claude-haiku-4-5',
        defaultSonnetModel: 'gpt-5.3-codex',
        defaultOpusModel: 'claude-opus-4-6',
      },
    ], 'hybrid');

    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.clavue.json'),
      expect.objectContaining({
        clavueProviderProfiles: [
          expect.objectContaining({
            id: 'ccjk-hybrid',
            modelMode: 'hybrid_compatible',
            modelRouting: expect.objectContaining({
              presetId: 'custom',
              primaryModel: 'gpt-5.4',
              smallFastModel: 'claude-haiku-4-5',
              generalModel: 'gpt-5.3-codex',
              planModel: 'claude-opus-4-6',
            }),
          }),
        ],
      }),
    );
  });

  it('preserves a quick-selected Clavue model exactly across every routing slot', async () => {
    mockReadJsonConfig.mockReturnValue({ mcpServers: {} });

    const { setMyclaudeProviderProfiles } = await import('../../src/utils/clavue-config');
    setMyclaudeProviderProfiles([
      {
        id: 'quick',
        name: 'Quick',
        provider: 'custom',
        apiKey: 'sk-test',
        baseUrl: 'https://router.example.com/v1',
        authType: 'api_key',
        model: 'GPT-5.4-EXACT',
        fastModel: 'GPT-5.4-EXACT',
        primaryModel: 'GPT-5.4-EXACT',
        defaultHaikuModel: 'GPT-5.4-EXACT',
        defaultSonnetModel: 'GPT-5.4-EXACT',
        defaultOpusModel: 'GPT-5.4-EXACT',
      },
    ], 'quick');

    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.clavue.json'),
      expect.objectContaining({
        clavueProviderProfiles: [
          expect.objectContaining({
            id: 'ccjk-quick',
            modelRouting: {
              presetId: 'gpt_5_4_codex',
              primaryModel: 'GPT-5.4-EXACT',
              subagentModel: '',
              smallFastModel: 'GPT-5.4-EXACT',
              planModel: 'GPT-5.4-EXACT',
              exploreModel: 'GPT-5.4-EXACT',
              generalModel: 'GPT-5.4-EXACT',
              teamModel: 'GPT-5.4-EXACT',
              guideModel: 'GPT-5.4-EXACT',
            },
          }),
        ],
      }),
    );
  });

  it('syncs a Clavue model menu selection into the active native profile exactly', async () => {
    mockReadJsonConfig.mockImplementation((path?: string) => {
      if (path?.includes('settings.json')) {
        return { env: {} };
      }
      return {
        mcpServers: {},
        clavueActiveProviderProfileId: 'ccjk-quick',
        clavueProviderProfiles: [
          {
            id: 'ccjk-quick',
            name: 'Quick',
            providerId: 'custom',
            modelMode: 'openai_native',
            baseUrl: 'https://router.example.com/v1',
            authType: 'api_key',
            modelRouting: {
              presetId: 'custom',
              primaryModel: 'stale-primary',
              subagentModel: '',
              smallFastModel: 'stale-fast',
              planModel: 'stale-plan',
              exploreModel: 'stale-explore',
              generalModel: 'stale-general',
              teamModel: 'stale-team',
              guideModel: 'stale-guide',
            },
            provenance: {
              kind: 'imported',
              sourceId: 'ccjk',
              externalProfileId: 'quick',
            },
          },
        ],
      };
    });

    const { syncClavueActiveProviderModelSelection } = await import('../../src/utils/clavue-config');
    expect(syncClavueActiveProviderModelSelection({ selectedModel: '  GPT-5.4-EXACT  ' })).toBe(true);

    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.clavue.json'),
      expect.objectContaining({
        clavueActiveProviderProfileId: 'ccjk-quick',
        clavueProviderProfiles: [
          expect.objectContaining({
            id: 'ccjk-quick',
            modelMode: 'openai_native',
            modelRouting: {
              presetId: 'gpt_5_4_codex',
              primaryModel: 'GPT-5.4-EXACT',
              subagentModel: '',
              smallFastModel: 'GPT-5.4-EXACT',
              planModel: 'GPT-5.4-EXACT',
              exploreModel: 'GPT-5.4-EXACT',
              generalModel: 'GPT-5.4-EXACT',
              teamModel: 'GPT-5.4-EXACT',
              guideModel: 'GPT-5.4-EXACT',
            },
          }),
        ],
      }),
    );
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.objectContaining({
        env: expect.objectContaining({
          ANTHROPIC_CUSTOM_MODEL_OPTION: 'GPT-5.4-EXACT',
          ANTHROPIC_DEFAULT_HAIKU_MODEL: 'GPT-5.4-EXACT',
          ANTHROPIC_SMALL_FAST_MODEL: 'GPT-5.4-EXACT',
          ANTHROPIC_DEFAULT_SONNET_MODEL: 'GPT-5.4-EXACT',
          ANTHROPIC_DEFAULT_OPUS_MODEL: 'GPT-5.4-EXACT',
        }),
      }),
    );
    const menuSettingsWrite = mockWriteJsonConfig.mock.calls.find(([path]) => String(path).includes('settings.json'))?.[1];
    // settings.model and env.ANTHROPIC_MODEL must stay unset when ANTHROPIC_DEFAULT_*_MODEL is configured.
    expect(menuSettingsWrite.model).toBeUndefined();
    expect(menuSettingsWrite.env).not.toHaveProperty('ANTHROPIC_MODEL');
  });

  it('locks Clavue custom primary model selection across missing routing slots', async () => {
    mockReadJsonConfig.mockImplementation((path?: string) => path?.includes('settings.json')
      ? { env: {} }
      : {
          mcpServers: {},
          clavueActiveProviderProfileId: 'manual',
          clavueProviderProfiles: [
            {
              id: 'manual',
              name: 'Manual',
              providerId: 'custom',
              modelMode: 'openai_native',
              baseUrl: 'https://router.example.com/v1',
              authType: 'api_key',
              modelRouting: {
                presetId: 'custom',
                primaryModel: 'old',
                subagentModel: '',
                smallFastModel: 'old',
                planModel: 'old',
                exploreModel: 'old',
                generalModel: 'old',
                teamModel: 'old',
                guideModel: 'old',
              },
            },
          ],
        });

    const { syncClavueActiveProviderModelSelection } = await import('../../src/utils/clavue-config');
    expect(syncClavueActiveProviderModelSelection({ primaryModel: 'MiniMax-M2' })).toBe(true);

    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.clavue.json'),
      expect.objectContaining({
        clavueProviderProfiles: [
          expect.objectContaining({
            id: 'manual',
            modelRouting: expect.objectContaining({
              primaryModel: 'MiniMax-M2',
              smallFastModel: 'MiniMax-M2',
              planModel: 'MiniMax-M2',
              generalModel: 'MiniMax-M2',
            }),
          }),
        ],
      }),
    );
  });

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
    });
    mockReadJsonConfig.mockImplementation((path?: string) => {
      if (path?.includes('settings.json')) {
        return { env: {} };
      }
      if (path?.includes('.credentials.json')) {
        return { providerProfiles: {} };
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
      };
    });

    const { syncMyclaudeProviderProfilesFromCurrentClaudeConfig } = await import('../../src/utils/clavue-config');
    const result = syncMyclaudeProviderProfilesFromCurrentClaudeConfig();

    expect(result.activeProfileId).toBe('ccjk-primary');

    const clavueWrite = mockWriteJsonConfig.mock.calls.find(([path]) => String(path).includes('.clavue.json'))?.[1];
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
            presetId: 'gpt_5_4_codex',
            primaryModel: 'gpt-5.4',
          },
        },
      ],
    });
    expect(clavueWrite.clavueProviderProfiles[0]).not.toHaveProperty('provenance');
  });

  it('preserves Clavue built-in provider ids and manual credentials on direct provider writes', async () => {
    mockReadJsonConfig.mockImplementation((path?: string) => {
      if (path?.includes('settings.json')) {
        return { env: {} };
      }
      if (path?.includes('.credentials.json')) {
        return {
          providerProfiles: {
            'glm': { credential: 'sk-manual', authType: 'api_key' },
            'ccjk-old': { credential: 'sk-old', authType: 'api_key' },
          },
        };
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
      };
    });

    const { setMyclaudeProviderProfiles } = await import('../../src/utils/clavue-config');
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
    ], 'glm');

    expect(activeId).toBe('ccjk-glm');
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
              presetId: 'gpt_5_4_codex',
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
    );
    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.credentials.json'),
      expect.objectContaining({
        providerProfiles: {
          'glm': { credential: 'sk-manual', authType: 'api_key' },
          'ccjk-glm': { credential: 'sk-ccjk', authType: 'api_key' },
        },
      }),
    );
  });

  it('auto-binds codex-rigor-mode when active profile uses a GPT-5/Codex model', async () => {
    mockReadClaudeConfig.mockReturnValue({
      currentProfileId: 'gpt5',
      profiles: {
        gpt5: {
          name: 'GPT5',
          authType: 'api_key',
          provider: 'custom',
          apiKey: 'sk-x',
          baseUrl: 'https://router.example.com/v1',
          primaryModel: 'gpt-5.5-high',
        },
      },
    });
    mockReadJsonConfig.mockImplementation((path?: string) => path?.includes('settings.json')
      ? { env: {} }
      : { mcpServers: {} });

    const { syncMyclaudeProviderProfilesFromCurrentClaudeConfig } = await import('../../src/utils/clavue-config');
    syncMyclaudeProviderProfilesFromCurrentClaudeConfig();

    const settingsWrite = mockWriteJsonConfig.mock.calls.find(([p]) => String(p).includes('settings.json'))?.[1];
    expect(settingsWrite.outputStyle).toBe('codex-rigor-mode');
    expect(settingsWrite.__ccjk).toEqual({ autoOutputStyle: true });
  });

  it('does not override a user-picked outputStyle for GPT-5 profiles', async () => {
    mockReadClaudeConfig.mockReturnValue({
      currentProfileId: 'gpt5',
      profiles: {
        gpt5: { name: 'GPT5', authType: 'api_key', provider: 'custom', apiKey: 'sk-x', primaryModel: 'gpt-5.5-high' },
      },
    });
    mockReadJsonConfig.mockImplementation((path?: string) => path?.includes('settings.json')
      ? { env: {}, outputStyle: 'linus-mode' }
      : { mcpServers: {} });

    const { syncMyclaudeProviderProfilesFromCurrentClaudeConfig } = await import('../../src/utils/clavue-config');
    syncMyclaudeProviderProfilesFromCurrentClaudeConfig();

    const settingsWrite = mockWriteJsonConfig.mock.calls.find(([p]) => String(p).includes('settings.json'))?.[1];
    expect(settingsWrite.outputStyle).toBe('linus-mode');
    expect(settingsWrite.__ccjk).toBeUndefined();
  });

  it('drops the auto-applied outputStyle when switching off Codex models', async () => {
    mockReadClaudeConfig.mockReturnValue({
      currentProfileId: 'sonnet',
      profiles: {
        sonnet: { name: 'Sonnet', authType: 'api_key', provider: 'anthropic', apiKey: 'sk-x', primaryModel: 'claude-sonnet-4-6' },
      },
    });
    // Previous run had ccjk auto-applied codex-rigor-mode.
    mockReadJsonConfig.mockImplementation((path?: string) => path?.includes('settings.json')
      ? { env: {}, outputStyle: 'codex-rigor-mode', __ccjk: { autoOutputStyle: true } }
      : { mcpServers: {} });

    const { syncMyclaudeProviderProfilesFromCurrentClaudeConfig } = await import('../../src/utils/clavue-config');
    syncMyclaudeProviderProfilesFromCurrentClaudeConfig();

    const settingsWrite = mockWriteJsonConfig.mock.calls.find(([p]) => String(p).includes('settings.json'))?.[1];
    expect(settingsWrite.outputStyle).toBeUndefined();
    expect(settingsWrite.__ccjk).toBeUndefined();
  });
});
