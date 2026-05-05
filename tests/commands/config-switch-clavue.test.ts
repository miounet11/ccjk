import { beforeEach, describe, expect, it, vi } from 'vitest';

const readCcjkConfig = vi.fn();
const readClavueConfig = vi.fn();
const setMyclaudeActiveProviderProfile = vi.fn();
const switchClaudeProfile = vi.fn();
const switchToProvider = vi.fn();
const switchToOfficialLogin = vi.fn();

vi.mock('../../src/config/unified', () => ({
  config: {
    ccjk: {
      read: readCcjkConfig,
    },
    claude: {
      read: vi.fn(() => null),
    },
  },
}));

vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    language: 'en',
    t: vi.fn((key: string) => key),
  },
}));

vi.mock('../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    switchProfile: switchClaudeProfile,
    switchToOfficial: vi.fn(),
    switchToCcr: vi.fn(),
    getProfileById: vi.fn(),
  },
}));

vi.mock('../../src/utils/claude-config', () => ({
  readClavueConfig,
  setMyclaudeActiveProviderProfile,
}));

vi.mock('../../src/utils/code-tools/codex', () => ({
  listCodexProviders: vi.fn(() => [
    {
      id: '302-ai',
      name: '302 AI',
      baseUrl: 'https://api.302.ai/v1',
      tempEnvKey: '302_AI_API_KEY',
    },
  ]),
  readCodexConfig: vi.fn(),
  switchToOfficialLogin,
  switchToProvider,
}));

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
}));

describe('config switch Clavue support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    switchToProvider.mockResolvedValue(true);
    switchToOfficialLogin.mockResolvedValue(true);
    readCcjkConfig.mockReturnValue({
      general: {
        currentTool: 'clavue',
      },
    });
    readClavueConfig.mockReturnValue({
      clavueActiveProviderProfileId: 'ccjk-ttqq',
      clavueProviderProfiles: [
        {
          id: 'ccjk-ttqq',
          name: 'TTQQ',
          providerId: 'ttqq',
          baseUrl: 'https://ttqq.example.com/v1',
          authType: 'api_key',
          modelRouting: {
            primaryModel: 'gpt-5.4',
            smallFastModel: 'gpt-5.4',
            generalModel: 'gpt-5.4',
            planModel: 'gpt-5.4',
          },
          provenance: {
            kind: 'imported',
            sourceId: 'ccjk',
            externalProfileId: 'ttqq-imported',
          },
        },
        {
          id: 'manual-glm',
          name: 'GLM Native',
          providerId: 'glm',
          baseUrl: 'https://glm.example.com/v1',
          authType: 'auth_token',
          modelRouting: {
            primaryModel: 'glm-4.6',
            smallFastModel: 'glm-4.5-air',
            generalModel: 'glm-4.6',
            planModel: 'glm-z1-air',
          },
        },
      ],
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('switches the active Clavue native provider profile by provider id', async () => {
    const { switchCommand } = await import('../../src/commands/config/switch');

    await switchCommand('glm', { codeType: 'clavue' });

    expect(setMyclaudeActiveProviderProfile).toHaveBeenCalledWith('manual-glm');
    expect(switchClaudeProfile).not.toHaveBeenCalled();
  });

  it('switches Clavue to official mode without touching Claude Code profiles', async () => {
    const { switchCommand } = await import('../../src/commands/config/switch');

    await switchCommand('official', { codeType: 'clavue' });

    expect(setMyclaudeActiveProviderProfile).toHaveBeenCalledWith(undefined);
    expect(switchClaudeProfile).not.toHaveBeenCalled();
  });

  it('lists Clavue provider profiles when code type is Clavue', async () => {
    const { switchCommand } = await import('../../src/commands/config/switch');

    await switchCommand(undefined, { codeType: 'clavue', list: true });

    const output = vi.mocked(console.log).mock.calls.flat().join('\n');
    expect(output).toContain('Clavue Provider Profiles');
    expect(output).toContain('manual-glm');
    expect(output).toContain('glm-4.6, glm-4.5-air, glm-z1-air');
    expect(switchClaudeProfile).not.toHaveBeenCalled();
  });

  it('switches Codex providers through native Codex auth path', async () => {
    const { switchCommand } = await import('../../src/commands/config/switch');

    await switchCommand('302-ai', { codeType: 'codex' });

    expect(switchToProvider).toHaveBeenCalledWith('302-ai');
    expect(setMyclaudeActiveProviderProfile).not.toHaveBeenCalled();
    expect(switchClaudeProfile).not.toHaveBeenCalled();
  });

  it('switches Codex official mode through native Codex auth path', async () => {
    const { switchCommand } = await import('../../src/commands/config/switch');

    await switchCommand('official', { codeType: 'codex' });

    expect(switchToOfficialLogin).toHaveBeenCalled();
    expect(setMyclaudeActiveProviderProfile).not.toHaveBeenCalled();
    expect(switchClaudeProfile).not.toHaveBeenCalled();
  });
});
