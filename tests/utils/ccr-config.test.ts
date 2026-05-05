import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  homeDir: '',
}));

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return {
    ...actual,
    homedir: () => mockState.homeDir,
  };
});

describe('configureCcrProxy', () => {
  let tempHome: string;

  function settingsPath(): string {
    return join(tempHome, '.claude', 'settings.json');
  }

  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'ccjk-ccr-config-'));
    mockState.homeDir = tempHome;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tempHome, { recursive: true, force: true });
  });

  it('clears stale top-level runtime fields and writes CCR env config', async () => {
    mkdirSync(join(tempHome, '.claude'), { recursive: true });
    writeFileSync(settingsPath(), JSON.stringify({
      apiKey: 'sk-stale',
      authToken: 'token-stale',
      defaultModel: 'stale-default',
      preferredModel: 'stale-preferred',
      statusLine: {},
      env: {
        ANTHROPIC_AUTH_TOKEN: 'token-stale',
      },
    }, null, 2));

    const { configureCcrProxy } = await import('../../src/utils/ccr/config');

    await configureCcrProxy({
      Providers: [],
      Router: { default: 'test,model' },
      HOST: '127.0.0.1',
      PORT: 8787,
      APIKEY: 'sk-ccr',
    });

    const settings = JSON.parse(readFileSync(settingsPath(), 'utf-8'));
    expect(settings.apiKey).toBeUndefined();
    expect(settings.authToken).toBeUndefined();
    expect(settings.defaultModel).toBeUndefined();
    expect(settings.preferredModel).toBeUndefined();
    expect(settings.statusLine).toBeUndefined();
    expect(settings.env).toMatchObject({
      ANTHROPIC_BASE_URL: 'http://127.0.0.1:8787',
      ANTHROPIC_API_KEY: 'sk-ccr',
    });
    expect(settings.env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
  });
});
