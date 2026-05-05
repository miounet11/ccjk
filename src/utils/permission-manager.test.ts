import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_HOME = join(tmpdir(), 'ccjk-permission-manager-test');
const CCJK_CONFIG_DIR = join(TEST_HOME, '.ccjk');
const SETTINGS_FILE = join(TEST_HOME, '.claude', 'settings.json');
const CLAVUE_DIR = join(TEST_HOME, '.clavue');

vi.mock('../constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../constants')>();
  return {
    ...actual,
    CCJK_CONFIG_DIR,
    SETTINGS_FILE,
    CLAVUE_DIR,
  };
});

describe('permission-manager Clavue compatibility', () => {
  const originalClavueConfigDir = process.env.CLAVUE_CONFIG_DIR;
  const originalDisableLegacyClaudeConfig = process.env.CLAVUE_DISABLE_LEGACY_CLAUDE_CONFIG;

  beforeEach(() => {
    vi.resetModules();
    rmSync(TEST_HOME, { recursive: true, force: true });
    mkdirSync(join(TEST_HOME, '.claude'), { recursive: true });
    mkdirSync(CLAVUE_DIR, { recursive: true });
    mkdirSync(CCJK_CONFIG_DIR, { recursive: true });
    delete process.env.CLAVUE_CONFIG_DIR;
    delete process.env.CLAVUE_DISABLE_LEGACY_CLAUDE_CONFIG;
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
    if (originalClavueConfigDir === undefined) {
      delete process.env.CLAVUE_CONFIG_DIR;
    }
    else {
      process.env.CLAVUE_CONFIG_DIR = originalClavueConfigDir;
    }
    if (originalDisableLegacyClaudeConfig === undefined) {
      delete process.env.CLAVUE_DISABLE_LEGACY_CLAUDE_CONFIG;
    }
    else {
      process.env.CLAVUE_DISABLE_LEGACY_CLAUDE_CONFIG = originalDisableLegacyClaudeConfig;
    }
  });

  it('normalizes Claude/Clavue permission shape without crashing display', async () => {
    writeFileSync(join(CLAVUE_DIR, 'settings.json'), JSON.stringify({
      permissions: {
        allow: ['Read(**)', 'Edit(**)', 'Bash(git status:*)'],
        deny: ['Bash(rm:*)'],
        additionalDirectories: ['/tmp/example'],
      },
    }));

    const { displayPermissions, readPermissions } = await import('./permission-manager');

    expect(readPermissions()).toMatchObject({
      allowed: ['file-read', 'file-write', 'git-operations'],
      denied: ['file-delete'],
      trustedDirectories: ['/tmp/example'],
      autoApprovePatterns: [],
    });
    expect(() => displayPermissions()).not.toThrow();
  });

  it('prefers the CCJK bridge file over runtime settings', async () => {
    writeFileSync(join(CLAVUE_DIR, 'settings.json'), JSON.stringify({
      permissions: {
        allow: ['Read(**)'],
        additionalDirectories: ['/tmp/from-clavue'],
      },
    }));
    writeFileSync(join(CCJK_CONFIG_DIR, 'permissions.json'), JSON.stringify({
      allowed: ['node-execution'],
      denied: ['network-access'],
      trustedDirectories: ['/tmp/from-ccjk'],
      autoApprovePatterns: ['*.ts'],
    }));

    const { readPermissions } = await import('./permission-manager');

    expect(readPermissions()).toEqual({
      allowed: ['node-execution'],
      denied: ['network-access'],
      trustedDirectories: ['/tmp/from-ccjk'],
      autoApprovePatterns: ['*.ts'],
    });
  });

  it('trusts directories by writing only to the CCJK bridge file', async () => {
    writeFileSync(SETTINGS_FILE, JSON.stringify({
      permissions: {
        allow: ['Read(**)'],
      },
    }));

    const { trustDirectory, readPermissions } = await import('./permission-manager');

    expect(trustDirectory('/tmp/current-workspace')).toBe(true);
    expect(readPermissions().trustedDirectories).toContain('/tmp/current-workspace');
  });

  it('repairs the bridge file with the development preset and current workspace', async () => {
    const { repairPermissions, readPermissions } = await import('./permission-manager');

    expect(repairPermissions('/tmp/current-workspace')).toBe(true);
    expect(readPermissions()).toMatchObject({
      allowed: ['file-read', 'file-write', 'git-operations', 'npm-commands', 'node-execution', 'mcp-server'],
      denied: ['system-commands', 'network-access', 'file-delete'],
      trustedDirectories: ['/tmp/current-workspace'],
      autoApprovePatterns: ['*.ts', '*.js', '*.json', '*.md', '*.css', '*.html'],
    });
  });
});
