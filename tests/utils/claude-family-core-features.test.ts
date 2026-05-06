import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let testHome = '';

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return {
    ...actual,
    homedir: vi.fn(() => testHome),
  };
});

vi.mock('../../src/utils/ccr/installer', () => ({
  installCcr: vi.fn(),
  isCcrInstalled: vi.fn(() => Promise.resolve({ isInstalled: true, hasCorrectPackage: true })),
}));

vi.mock('../../src/utils/platform', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils/platform')>('../../src/utils/platform');
  return {
    ...actual,
    commandExists: vi.fn(() => Promise.resolve(true)),
  };
});

describe('claude-family core feature installer', () => {
  beforeEach(async () => {
    testHome = mkdtempSync(join(tmpdir(), 'ccjk-core-features-'));
    vi.resetModules();
    const { initI18n } = await import('../../src/i18n');
    await initI18n('en');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(testHome, { recursive: true, force: true });
  });

  it('installs Clavue workflows, MCP, permissions, output styles, and keeps CCR ready', async () => {
    const clavueDir = join(testHome, '.clavue');
    mkdirSync(clavueDir, { recursive: true });
    writeFileSync(join(clavueDir, 'settings.json'), JSON.stringify({ permissions: { allow: ['Read(*)'] } }));
    writeFileSync(join(clavueDir, '.clavue.json'), JSON.stringify({ hasCompletedOnboarding: true }));

    const { ensureClaudeFamilyCoreFeatures, inspectClaudeFamilyCoreFeatures } = await import('../../src/utils/claude-family-core-features');

    const results = await ensureClaudeFamilyCoreFeatures({ codeTool: 'clavue', installCcr: false });
    const state = await inspectClaudeFamilyCoreFeatures('clavue');

    expect(results.map(result => result.feature)).toEqual([
      'workflows',
      'mcp',
      'permissions',
      'output-styles',
      'native-goals',
      'ccr',
    ]);
    expect(results.find(result => result.feature === 'native-goals')).toMatchObject({
      status: 'already-present',
      message: 'Clavue native /goal available',
    });
    expect(existsSync(join(clavueDir, 'commands', 'ccjk', 'feat.md'))).toBe(true);
    expect(existsSync(join(clavueDir, 'commands', 'ccjk', 'goal.md'))).toBe(true);
    expect(existsSync(join(clavueDir, 'output-styles', 'linus-mode.md'))).toBe(true);

    const runtimeConfig = JSON.parse(readFileSync(join(clavueDir, '.clavue.json'), 'utf-8'));
    expect(runtimeConfig.mcpServers.context7).toBeDefined();

    const settings = JSON.parse(readFileSync(join(clavueDir, 'settings.json'), 'utf-8'));
    expect(settings.permissions.allow).toContain('Read(*)');
    expect(settings.permissions.allow).toContain('mcp__context7__*');
    expect(settings.permissions.defaultMode).toBe('bypassPermissions');
    expect(settings.permissions.trustedOperatorMode).toBe(true);
    expect(settings.permissions.ask).toContain('Bash(git push:*)');
    expect(settings.permissions.ask).toContain('Bash(rm:*)');
    expect(settings.outputStyle).toBe('linus-mode');
    expect(state.mcp.missing).toEqual([]);
    expect(state.permissions.missing).toEqual([]);
    expect(state.outputStyles.missing).toEqual([]);
  });
});
