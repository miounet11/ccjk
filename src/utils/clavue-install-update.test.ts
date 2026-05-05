import { beforeEach, describe, expect, it, vi } from 'vitest';

const exec = vi.fn();
const oraStart = vi.fn();
const oraSucceed = vi.fn();
const oraFail = vi.fn();
const promptBoolean = vi.fn();
const checkMyclaudeVersion = vi.fn();
const shouldUseSudoForGlobalInstall = vi.fn();
const wrapCommandWithSudo = vi.fn();
const findCommandPath = vi.fn();
const getPlatform = vi.fn();
const getHomebrewCommandPaths = vi.fn();
const isTermux = vi.fn();

vi.mock('tinyexec', () => ({
  exec,
}));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: oraStart.mockReturnValue({
      succeed: oraSucceed,
      fail: oraFail,
      stop: vi.fn(),
    }),
  })),
}));

vi.mock('../i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  format: vi.fn((template: string, values?: Record<string, string>) =>
    values ? `${template} ${JSON.stringify(values)}` : template,
  ),
  i18n: {
    t: vi.fn((key: string) => key),
  },
}));

vi.mock('./platform', () => ({
  commandExists: vi.fn(),
  findCommandPath,
  getHomebrewCommandPaths,
  getPlatform,
  getRecommendedInstallMethods: vi.fn(),
  getTermuxPrefix: vi.fn(() => '/data/data/com.termux/files/usr'),
  getWSLInfo: vi.fn(),
  isTermux,
  isWSL: vi.fn(),
  shouldUseSudoForGlobalInstall,
  wrapCommandWithSudo,
}));

vi.mock('./fs-operations', () => ({
  exists: vi.fn(() => false),
}));

vi.mock('./claude-config', () => ({
  readClavueConfig: vi.fn(() => ({})),
  readMcpConfig: vi.fn(() => ({})),
  writeClavueConfig: vi.fn(),
  writeMcpConfig: vi.fn(),
}));

vi.mock('./toggle-prompt', () => ({
  promptBoolean,
}));

vi.mock('./version-checker', () => ({
  checkCcrVersion: vi.fn(),
  checkClaudeCodeVersion: vi.fn(),
  checkCometixLineVersion: vi.fn(),
  checkMyclaudeVersion,
  fixBrokenNpmSymlink: vi.fn(),
  handleDuplicateInstallations: vi.fn(),
}));

describe('clavue install and update commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exec.mockResolvedValue({ exitCode: 0, stdout: '8.8.94 (Clavue)', stderr: '' });
    promptBoolean.mockResolvedValue(true);
    shouldUseSudoForGlobalInstall.mockReturnValue(false);
    wrapCommandWithSudo.mockReturnValue({
      command: 'npm',
      args: ['install', '-g', 'clavue', '--force'],
      usedSudo: false,
    });
    findCommandPath.mockResolvedValue('/opt/homebrew/bin/clavue');
    getPlatform.mockReturnValue('macos');
    getHomebrewCommandPaths.mockResolvedValue([]);
    isTermux.mockReturnValue(false);
    checkMyclaudeVersion.mockResolvedValue({
      installed: true,
      currentVersion: '8.8.93',
      latestVersion: '8.8.94',
      needsUpdate: true,
    });
  });

  it('advertises the npm package install without the native installer step', async () => {
    const { CODE_TOOL_INFO } = await import('../constants');

    expect(CODE_TOOL_INFO.clavue.installCmd).toBe('npm install -g clavue');
  });

  it('installs Clavue from npm without running native install', async () => {
    const { executeInstallMethod } = await import('./installer');

    const installed = await executeInstallMethod('npm', 'clavue');

    expect(installed).toBe(true);
    expect(exec).toHaveBeenCalledWith('npm', ['install', '-g', 'clavue', '--force']);
    expect(exec).toHaveBeenCalledWith('clavue', ['--version']);
    expect(exec).not.toHaveBeenCalledWith('clavue', ['install', '--force']);
  });

  it('updates Clavue through npm and verifies the CLI without running native install', async () => {
    const { updateMyclaude } = await import('./auto-updater');

    const updated = await updateMyclaude(false, true);

    expect(updated).toBe(true);
    expect(exec).toHaveBeenCalledWith('npm', ['update', '-g', 'clavue']);
    expect(exec).toHaveBeenCalledWith('clavue', ['--version']);
    expect(exec).not.toHaveBeenCalledWith('clavue', ['install', '--force']);
  });
});
