import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const TEMP_BASE = join(tmpdir(), 'ccjk-quick-provider-fixed');
const readZcfConfig = vi.fn();
const setMyclaudeProviderProfiles = vi.fn();
const addProviderToExisting = vi.fn();
const switchToProvider = vi.fn();

vi.mock('../../src/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/constants')>();
  const { tmpdir } = require('node:os');
  const { join } = require('node:path');
  const base = join(tmpdir(), 'ccjk-quick-provider-fixed');
  return {
    ...actual,
    SETTINGS_FILE: join(base, 'settings.json'),
    CLAVUE_SETTINGS_FILE: join(base, 'clavue', 'settings.json'),
    CLAVUE_CONFIG_FILE: join(base, 'clavue', '.clavue.json'),
    CLAVUE_CREDENTIALS_FILE: join(base, 'clavue', '.credentials.json'),
  };
});

vi.mock('../../src/utils/ccjk-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/ccjk-config')>();
  return {
    ...actual,
    readZcfConfig,
  };
});

vi.mock('../../src/utils/clavue-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/clavue-config')>();
  return {
    ...actual,
    setMyclaudeProviderProfiles,
  };
});

vi.mock('../../src/utils/code-tools/codex-provider-manager', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/code-tools/codex-provider-manager')>();
  return {
    ...actual,
    addProviderToExisting,
  };
});

vi.mock('../../src/utils/code-tools/codex', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/code-tools/codex')>();
  return {
    ...actual,
    switchToProvider,
  };
});

describe('quick provider config persistence', () => {
  function settingsPath(): string {
    return join(TEMP_BASE, 'settings.json');
  }

  beforeAll(async () => {
    const { initI18n } = await import('../../src/i18n');
    await initI18n('en');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    readZcfConfig.mockReturnValue({ codeToolType: 'claude-code' });
    addProviderToExisting.mockResolvedValue({ success: true });
    switchToProvider.mockResolvedValue(true);
    rmSync(TEMP_BASE, { recursive: true, force: true });
    mkdirSync(TEMP_BASE, { recursive: true });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(TEMP_BASE, { recursive: true, force: true });
  });

  it('writes env-based provider config and removes stale top-level runtime fields', async () => {
    mkdirSync(TEMP_BASE, { recursive: true });
    writeFileSync(settingsPath(), JSON.stringify({
      apiProvider: 'custom',
      apiUrl: 'https://stale.example.com',
      apiKey: 'sk-stale',
      authToken: 'token-stale',
      defaultModel: 'stale-default',
      preferredModel: 'stale-preferred',
      env: {
        ANTHROPIC_AUTH_TOKEN: 'token-stale',
      },
    }, null, 2));

    const { saveProviderConfig } = await import('../../src/commands/quick-provider');

    await saveProviderConfig({
      shortcode: 'glm',
      provider: {
        shortcode: 'glm',
        name: 'GLM',
        apiUrl: 'https://router.example.com/v1',
        verified: true,
        createdAt: new Date().toISOString(),
      },
      apiKey: 'sk-new',
      model: 'gpt-5.4',
    });

    const settings = JSON.parse(readFileSync(settingsPath(), 'utf-8'));
    expect(settings.apiProvider).toBeUndefined();
    expect(settings.apiUrl).toBeUndefined();
    expect(settings.apiKey).toBeUndefined();
    expect(settings.authToken).toBeUndefined();
    expect(settings.defaultModel).toBeUndefined();
    expect(settings.preferredModel).toBeUndefined();
    expect(settings.model).toBe('gpt-5.4');
    expect(settings.env).toMatchObject({
      ANTHROPIC_BASE_URL: 'https://router.example.com/v1',
      ANTHROPIC_API_KEY: 'sk-new',
    });
    expect(settings.env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
  });

  it('writes Clavue native provider profile with exact selected model in every routing slot', async () => {
    readZcfConfig.mockReturnValue({ codeToolType: 'clavue' });

    const { saveProviderConfig } = await import('../../src/commands/quick-provider');

    await saveProviderConfig({
      shortcode: 'ttqq',
      provider: {
        shortcode: 'ttqq',
        name: 'TTQQ',
        apiUrl: 'https://ttqq.inping.com/v1',
        verified: true,
        createdAt: new Date().toISOString(),
      },
      apiKey: 'sk-ttqq',
      model: '  gpt-5.3-codex-spark  ',
    });

    expect(setMyclaudeProviderProfiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'ttqq',
        name: 'TTQQ',
        provider: 'ttqq',
        apiKey: 'sk-ttqq',
        baseUrl: 'https://ttqq.inping.com/v1',
        model: 'gpt-5.3-codex-spark',
        fastModel: 'gpt-5.3-codex-spark',
        primaryModel: 'gpt-5.3-codex-spark',
        defaultHaikuModel: 'gpt-5.3-codex-spark',
        defaultSonnetModel: 'gpt-5.3-codex-spark',
        defaultOpusModel: 'gpt-5.3-codex-spark',
      }),
    ], 'ttqq');
  });

  it('writes Codex provider config and switches to the provider without touching Claude settings', async () => {
    readZcfConfig.mockReturnValue({ codeToolType: 'codex' });

    const { saveProviderConfig } = await import('../../src/commands/quick-provider');

    await saveProviderConfig({
      shortcode: '302.ai',
      provider: {
        shortcode: '302.ai',
        name: '302 AI',
        apiUrl: 'https://api.302.ai/v1',
        verified: true,
        createdAt: new Date().toISOString(),
      },
      apiKey: 'sk-302',
      model: 'gpt-5.3-codex-spark',
    });

    expect(addProviderToExisting).toHaveBeenCalledWith(expect.objectContaining({
      id: '302-ai',
      name: '302 AI',
      baseUrl: 'https://api.302.ai/v1',
      wireApi: 'responses',
      tempEnvKey: '302_AI_API_KEY',
      requiresOpenaiAuth: false,
      model: 'gpt-5.3-codex-spark',
    }), 'sk-302', true);
    expect(switchToProvider).toHaveBeenCalledWith('302-ai');
    expect(setMyclaudeProviderProfiles).not.toHaveBeenCalled();
    expect(existsSync(settingsPath())).toBe(false);
  });

  it('creates settings.json when missing', async () => {
    expect(existsSync(settingsPath())).toBe(false);

    const { saveProviderConfig } = await import('../../src/commands/quick-provider');

    await saveProviderConfig({
      shortcode: 'kimi',
      provider: {
        shortcode: 'kimi',
        name: 'Kimi',
        apiUrl: 'https://kimi.example.com/v1',
        verified: false,
        createdAt: new Date().toISOString(),
      },
      apiKey: 'sk-kimi',
      model: 'kimi-k2',
    });

    const settings = JSON.parse(readFileSync(settingsPath(), 'utf-8'));
    expect(settings.env).toMatchObject({
      ANTHROPIC_BASE_URL: 'https://kimi.example.com/v1',
      ANTHROPIC_API_KEY: 'sk-kimi',
    });
    expect(settings.model).toBe('kimi-k2');
  });
});
