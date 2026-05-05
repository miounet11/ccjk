import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
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

describe('ccjk config compatibility', () => {
  let tempHome: string;

  function configPath(): string {
    return join(tempHome, '.ccjk', 'config.toml');
  }

  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'ccjk-config-'));
    mockState.homeDir = tempHome;
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(tempHome, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('reads partial TOML config without a general section', async () => {
    mkdirSync(join(tempHome, '.ccjk'), { recursive: true });
    writeFileSync(configPath(), [
      '[claudeCode]',
      'currentProfile = "ttqq22"',
      '',
      '[claudeCode.profiles.ttqq22]',
      'name = "ttqq22"',
      'authType = "api_key"',
      'baseUrl = "https://example.com"',
      '',
    ].join('\n'));

    const { readDefaultTomlConfig, readZcfConfig } = await import('../../src/utils/ccjk-config');

    expect(readZcfConfig()).toMatchObject({
      version: '1.0.0',
      preferredLang: 'en',
      templateLang: 'en',
      codeToolType: 'clavue',
      defaultOutputStyle: 'senior-architect',
    });
    expect(readDefaultTomlConfig()?.claudeCode.currentProfile).toBe('ttqq22');
    expect(readDefaultTomlConfig()?.claudeCode.profiles?.ttqq22?.name).toBe('ttqq22');
  });
});
