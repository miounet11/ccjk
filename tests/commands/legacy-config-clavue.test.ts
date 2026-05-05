import { beforeEach, describe, expect, it, vi } from 'vitest';

const existsSync = vi.fn();
const readFileSync = vi.fn();
const writeFileSync = vi.fn();
const readZcfConfig = vi.fn();
const backupExistingConfig = vi.fn();

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync,
    readFileSync,
    writeFileSync,
  };
});

vi.mock('../../src/utils/ccjk-config', () => ({
  readZcfConfig,
}));

vi.mock('../../src/utils/config', () => ({
  backupExistingConfig,
}));

vi.mock('../../src/i18n', () => ({
  i18n: {
    language: 'en',
    t: vi.fn((key: string) => key),
  },
}));

vi.mock('../../src/config/api-providers', () => ({
  getApiProviderPresets: vi.fn(() => []),
}));

describe('legacy config command Clavue routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readZcfConfig.mockReturnValue({ codeToolType: 'clavue' });
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify({ env: { EXISTING: '1' } }));
    backupExistingConfig.mockReturnValue('/tmp/clavue-backup');
  });

  it('sets values in Clavue settings when Clavue is selected explicitly', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { setConfig } = await import('../../src/commands/config');

    await setConfig('env.TEST_VALUE', '"ok"', { codeType: 'clavue' });

    expect(backupExistingConfig).toHaveBeenCalledWith('clavue');
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.clavue/settings.json'),
      expect.stringContaining('"TEST_VALUE": "ok"'),
      'utf-8',
    );
    expect(String(writeFileSync.mock.calls[0][0])).not.toContain('.claude/settings.json');

    logSpy.mockRestore();
  });

  it('lists Clavue settings from the active runtime path', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { listConfig } = await import('../../src/commands/config');

    await listConfig({ codeType: 'clavue' });

    const output = logSpy.mock.calls.flat().join('\n');
    expect(readFileSync).toHaveBeenCalledWith(expect.stringContaining('.clavue/settings.json'), 'utf-8');
    expect(output).toContain('Clavue Configuration');
    expect(output).toContain('.clavue/settings.json');

    logSpy.mockRestore();
  });
});
