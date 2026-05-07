import { beforeEach, describe, expect, it, vi } from 'vitest';

const prompt = vi.fn();
const promptBoolean = vi.fn();
const promptCustomModels = vi.fn();
const readZcfConfig = vi.fn();
const readClavueConfig = vi.fn();
const setMyclaudeProviderProfiles = vi.fn();
const syncMyclaudeProviderProfilesFromCurrentClaudeConfig = vi.fn();
const addProfile = vi.fn();
const switchProfile = vi.fn();
const applyProfileSettings = vi.fn();

vi.mock('inquirer', () => ({
  default: {
    prompt,
  },
}));

vi.mock('ansis', () => ({
  default: {
    gray: (value: string) => value,
    green: (value: string) => value,
    red: (value: string) => value,
    yellow: (value: string) => value,
  },
}));

vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    language: 'zh-CN',
    t: vi.fn((key: string) => key),
  },
}));

vi.mock('../../src/config/api-providers', () => ({
  getApiProviders: vi.fn(() => []),
}));

vi.mock('../../src/utils/ccjk-config', () => ({
  readZcfConfig,
}));

vi.mock('../../src/utils/clavue-config', () => ({
  readClavueConfig,
  setMyclaudeProviderProfiles,
  syncMyclaudeProviderProfilesFromCurrentClaudeConfig,
}));

vi.mock('../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    generateProfileId: vi.fn((name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '-')),
    getProfileByName: vi.fn(() => null),
    addProfile,
    switchProfile,
    applyProfileSettings,
  },
}));

vi.mock('../../src/utils/features', () => ({
  promptCustomModels,
}));

vi.mock('../../src/utils/toggle-prompt', () => ({
  promptBoolean,
}));

vi.mock('../../src/utils/validator', () => ({
  validateApiKey: vi.fn(() => ({ isValid: true })),
}));

describe('claude-code incremental manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readZcfConfig.mockReturnValue({ codeToolType: 'clavue' });
    readClavueConfig.mockReturnValue({ mcpServers: {} });
    promptBoolean.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    promptCustomModels.mockResolvedValue({
      primaryModel: 'gpt-5-codex',
      haikuModel: 'gpt-5-codex',
      sonnetModel: 'gpt-5-codex',
      opusModel: 'gpt-5-codex',
    });
    addProfile.mockResolvedValue({ success: true, addedProfile: { id: 'custom-profile', name: 'Custom Profile' } });
    switchProfile.mockResolvedValue({ success: true });
  });

  it('asks model route mode before custom model slots when adding a direct Clavue profile', async () => {
    const { addProfileDirect } = await import('../../src/utils/claude-code-incremental-manager');

    prompt
      .mockResolvedValueOnce({ selectedProvider: 'custom' })
      .mockResolvedValueOnce({
        profileName: 'Custom Profile',
        authType: 'api_key',
        baseUrl: 'https://router.example.com',
        apiKey: 'sk-test',
      })
      .mockResolvedValueOnce({ mode: 'openai-native' });

    await addProfileDirect();

    expect(prompt).toHaveBeenNthCalledWith(3, [expect.objectContaining({
      name: 'mode',
      message: '请选择模型路由模式:',
      choices: expect.arrayContaining([
        expect.objectContaining({ value: 'openai-native' }),
        expect.objectContaining({ value: 'official' }),
        expect.objectContaining({ value: 'ccr-proxy' }),
      ]),
    })]);
    expect(promptCustomModels).toHaveBeenCalledWith(
      'gpt-5-codex',
      'gpt-5-codex',
      'gpt-5-codex',
      'gpt-5-codex',
    );
    expect(addProfile).not.toHaveBeenCalled();
    expect(setMyclaudeProviderProfiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'custom-profile',
        name: 'Custom Profile',
        provider: 'custom',
        apiKey: 'sk-test',
        baseUrl: 'https://router.example.com',
        authType: 'api_key',
        mode: 'openai-native',
        primaryModel: 'gpt-5-codex',
        defaultHaikuModel: 'gpt-5-codex',
        defaultSonnetModel: 'gpt-5-codex',
        defaultOpusModel: 'gpt-5-codex',
      }),
    ], undefined);
    expect(syncMyclaudeProviderProfilesFromCurrentClaudeConfig).not.toHaveBeenCalled();
  });

  it('preserves existing active managed Clavue profile when new profile is not default', async () => {
    readClavueConfig.mockReturnValue({
      mcpServers: {},
      clavueActiveProviderProfileId: 'ccjk-existing',
      clavueProviderProfiles: [
        {
          id: 'ccjk-existing',
          name: 'Existing',
          providerId: 'custom',
          authType: 'api_key',
          modelMode: 'anthropic_native',
          baseUrl: 'https://existing.example.com',
          modelRouting: {
            presetId: 'claude_code_heritage',
            primaryModel: 'claude-sonnet-4-6',
            subagentModel: '',
            smallFastModel: 'claude-haiku-4-5-20251001',
            planModel: 'claude-opus-4-6',
            exploreModel: 'claude-sonnet-4-6',
            generalModel: 'claude-sonnet-4-6',
            teamModel: 'claude-sonnet-4-6',
            guideModel: 'claude-opus-4-6',
          },
          provenance: {
            kind: 'imported',
            sourceId: 'ccjk',
            externalProfileId: 'existing',
          },
        },
      ],
    });
    const { addProfileDirect } = await import('../../src/utils/claude-code-incremental-manager');

    prompt
      .mockResolvedValueOnce({ selectedProvider: 'custom' })
      .mockResolvedValueOnce({
        profileName: 'Custom Profile',
        authType: 'api_key',
        baseUrl: 'https://router.example.com',
        apiKey: 'sk-test',
      })
      .mockResolvedValueOnce({ mode: 'openai-native' });

    await addProfileDirect();

    expect(setMyclaudeProviderProfiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'existing',
        name: 'Existing',
        mode: 'official',
        primaryModel: 'claude-sonnet-4-6',
      }),
      expect.objectContaining({
        id: 'custom-profile',
        name: 'Custom Profile',
        mode: 'openai-native',
        primaryModel: 'gpt-5-codex',
      }),
    ], 'existing');
  });

  it('preserves existing manual Clavue active profile when new profile is not default', async () => {
    readClavueConfig.mockReturnValue({
      mcpServers: {},
      clavueActiveProviderProfileId: 'manual',
      clavueProviderProfiles: [
        {
          id: 'manual',
          name: 'Manual',
          providerId: 'custom',
          authType: 'api_key',
          modelMode: 'anthropic_native',
          modelRouting: {
            presetId: 'claude_code_heritage',
            primaryModel: 'claude-sonnet-4-6',
            subagentModel: '',
            smallFastModel: 'claude-haiku-4-5-20251001',
            planModel: 'claude-opus-4-6',
            exploreModel: 'claude-sonnet-4-6',
            generalModel: 'claude-sonnet-4-6',
            teamModel: 'claude-sonnet-4-6',
            guideModel: 'claude-opus-4-6',
          },
        },
      ],
    });
    const { addProfileDirect } = await import('../../src/utils/claude-code-incremental-manager');

    prompt
      .mockResolvedValueOnce({ selectedProvider: 'custom' })
      .mockResolvedValueOnce({
        profileName: 'Custom Profile',
        authType: 'api_key',
        baseUrl: 'https://router.example.com',
        apiKey: 'sk-test',
      })
      .mockResolvedValueOnce({ mode: 'openai-native' });

    await addProfileDirect();

    expect(setMyclaudeProviderProfiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'custom-profile',
        name: 'Custom Profile',
      }),
    ], 'manual');
  });

  it('sets the new Clavue profile active when requested as default', async () => {
    promptBoolean.mockReset();
    promptBoolean.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const { addProfileDirect } = await import('../../src/utils/claude-code-incremental-manager');

    prompt
      .mockResolvedValueOnce({ selectedProvider: 'custom' })
      .mockResolvedValueOnce({
        profileName: 'Hybrid Profile',
        authType: 'api_key',
        baseUrl: 'https://router.example.com',
        apiKey: 'sk-test',
      })
      .mockResolvedValueOnce({ mode: 'ccr-proxy' });
    promptCustomModels.mockResolvedValueOnce({
      primaryModel: 'gpt-5-codex',
      haikuModel: 'claude-haiku-4-5-20251001',
      sonnetModel: 'gpt-5-codex',
      opusModel: 'claude-opus-4-6',
    });

    await addProfileDirect();

    expect(setMyclaudeProviderProfiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'hybrid-profile',
        name: 'Hybrid Profile',
        mode: 'ccr-proxy',
        primaryModel: 'gpt-5-codex',
        defaultHaikuModel: 'claude-haiku-4-5-20251001',
        defaultSonnetModel: 'gpt-5-codex',
        defaultOpusModel: 'claude-opus-4-6',
      }),
    ], 'hybrid-profile');
  });
});
