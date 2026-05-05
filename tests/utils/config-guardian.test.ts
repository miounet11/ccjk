import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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

describe('config guardian repair', () => {
  beforeEach(async () => {
    testHome = mkdtempSync(join(tmpdir(), 'ccjk-guardian-'));
    vi.resetModules();
    const { initI18n } = await import('../../src/i18n');
    await initI18n('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(testHome, { recursive: true, force: true });
  });

  it('repairs expected commands from current workflow templates', async () => {
    const commandsDir = join(testHome, '.claude', 'commands', 'ccjk');
    const { ConfigGuardian } = await import('../../src/utils/config-guardian/guardian');

    const status = await new ConfigGuardian({ commandsDir }).check(true);

    expect(status.healthy).toBe(true);
    expect(status.repair?.failedFiles).toEqual([]);
    expect(existsSync(join(commandsDir, 'feat.md'))).toBe(true);
    expect(readFileSync(join(commandsDir, 'feat.md'), 'utf-8')).toContain('/ccjk:feat');
    expect(readFileSync(join(commandsDir, 'goal.md'), 'utf-8')).toContain('/ccjk:goal');
    expect(readFileSync(join(commandsDir, 'git-commit.md'), 'utf-8')).toContain('Claude Command: Commit');
  });
});
