import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockBootstrapCloudServices = vi.fn();
  const mockRegisterSpecialCommands = vi.fn(async () => {});
  const mockRunHealthAlertsCheck = vi.fn(async () => {});
  const mockShowCommandDiscoveryBanner = vi.fn(async () => {});
  const mockShowStartupSpinner = vi.fn(async () => ({ stop: mockSpinnerStop }));
  const mockSpinnerStop = vi.fn();
  const mockTryQuickProviderLaunch = vi.fn(async () => false);
  const mockExecuteSlashCommand = vi.fn(async () => false);
  const mockHandleIntentRecognition = vi.fn(async () => false);
  const mockAutoInitBrainHooks = vi.fn(async () => {});
  const mockRunAutoFixOnStartup = vi.fn(async () => {});
  const mockAutoCheckUpdates = vi.fn();
  const mockRunMigration = vi.fn();
  const mockRunCloudBootstrapWorker = vi.fn(async () => {});
  const mockReadZcfConfigAsync = vi.fn(async () => null);
  const mockSelectScriptLanguage = vi.fn(async () => 'zh-CN');
  const mockInitI18n = vi.fn(async () => {});
  const mockChangeLanguage = vi.fn(async () => {});
  const mockShowMainMenu = vi.fn(async () => {});
  const mockChildUnref = vi.fn();
  const mockSpawn = vi.fn(() => ({ unref: mockChildUnref }));

  const mockCommand = {
    alias: vi.fn(),
    option: vi.fn(),
    allowUnknownOptions: vi.fn(),
    action: vi.fn(),
  };

  const mockCli = {
    command: vi.fn(),
    help: vi.fn(),
    version: vi.fn(),
    parse: vi.fn(),
  };

  const resetCli = () => {
    mockCommand.alias.mockReset().mockImplementation(() => mockCommand);
    mockCommand.option.mockReset().mockImplementation(() => mockCommand);
    mockCommand.allowUnknownOptions.mockReset().mockImplementation(() => mockCommand);
    mockCommand.action.mockReset().mockImplementation(() => mockCommand);
    mockCli.command.mockReset().mockImplementation(() => mockCommand);
    mockCli.help.mockReset();
    mockCli.version.mockReset();
    mockCli.parse.mockReset().mockImplementation(() => {
      if (process.argv.slice(2).length === 0) {
        const defaultAction = mockCommand.action.mock.calls[0]?.[0];
        if (typeof defaultAction === 'function') {
          return defaultAction({});
        }
      }
      return undefined;
    });
  };

  resetCli();

  return {
    mockAutoCheckUpdates,
    mockAutoInitBrainHooks,
    mockBootstrapCloudServices,
    mockCli,
    mockCommand,
    mockExecuteSlashCommand,
    mockHandleIntentRecognition,
    mockRegisterSpecialCommands,
    mockRunAutoFixOnStartup,
    mockReadZcfConfigAsync,
    mockRunCloudBootstrapWorker,
    mockRunHealthAlertsCheck,
    mockRunMigration,
    mockSelectScriptLanguage,
    mockShowCommandDiscoveryBanner,
    mockShowMainMenu,
    mockShowStartupSpinner,
    mockInitI18n,
    mockChangeLanguage,
    mockSpinnerStop,
    mockSpawn,
    mockTryQuickProviderLaunch,
    mockChildUnref,
    resetCli,
  };
});

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawn: mocks.mockSpawn,
  };
});

vi.mock('../src/cli-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/cli-helpers')>();
  return {
    ...actual,
    bootstrapCloudServices: mocks.mockBootstrapCloudServices,
    customizeHelpLazy: vi.fn((sections: unknown[]) => sections),
    registerSpecialCommands: mocks.mockRegisterSpecialCommands,
    runHealthAlertsCheck: mocks.mockRunHealthAlertsCheck,
    runCloudBootstrapWorker: mocks.mockRunCloudBootstrapWorker,
    showCommandDiscoveryBanner: mocks.mockShowCommandDiscoveryBanner,
    showStartupSpinner: mocks.mockShowStartupSpinner,
    tryQuickProviderLaunch: mocks.mockTryQuickProviderLaunch,
  };
});

vi.mock('../src/config/migrator', () => ({
  runMigration: mocks.mockRunMigration,
}));

vi.mock('../src/brain/hooks/auto-init', () => ({
  autoInitBrainHooks: mocks.mockAutoInitBrainHooks,
}));

vi.mock('../src/core/auto-fix', () => ({
  runAutoFixOnStartup: mocks.mockRunAutoFixOnStartup,
}));

vi.mock('../src/core/auto-upgrade', () => ({
  autoCheckUpdates: mocks.mockAutoCheckUpdates,
}));

vi.mock('../src/commands/slash-commands', () => ({
  executeSlashCommand: mocks.mockExecuteSlashCommand,
}));

vi.mock('../src/utils/ccjk-config', () => ({
  readZcfConfigAsync: mocks.mockReadZcfConfigAsync,
}));

vi.mock('../src/utils/prompts', () => ({
  selectScriptLanguage: mocks.mockSelectScriptLanguage,
}));

vi.mock('../src/i18n', () => ({
  initI18n: mocks.mockInitI18n,
  changeLanguage: mocks.mockChangeLanguage,
}));

vi.mock('../src/commands/menu/index', () => ({
  showMainMenu: mocks.mockShowMainMenu,
}));

vi.mock('../src/core/intent-engine', () => ({
  handleIntentRecognition: mocks.mockHandleIntentRecognition,
}));

vi.mock('cac', () => ({
  default: vi.fn(() => mocks.mockCli),
}));

describe('cli startup takeover gating', () => {
  const originalArgv = process.argv;

  function expectMaintenanceSkipped(): void {
    expect(mocks.mockRunMigration).not.toHaveBeenCalled();
    expect(mocks.mockAutoInitBrainHooks).not.toHaveBeenCalled();
    expect(mocks.mockRunAutoFixOnStartup).not.toHaveBeenCalled();
    expect(mocks.mockAutoCheckUpdates).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.resetCli();
    mocks.mockShowStartupSpinner.mockResolvedValue({ stop: mocks.mockSpinnerStop });
    mocks.mockTryQuickProviderLaunch.mockResolvedValue(false);
    mocks.mockExecuteSlashCommand.mockResolvedValue(false);
    mocks.mockHandleIntentRecognition.mockResolvedValue(false);
    mocks.mockReadZcfConfigAsync.mockResolvedValue(null);
    mocks.mockSelectScriptLanguage.mockResolvedValue('zh-CN');
    process.argv = [...originalArgv];
  });

  it('keeps cloud bootstrap limited to explicit command paths', async () => {
    const { bootstrapCloudServices, shouldBootstrapCloudServicesForArgs } = await vi.importActual<typeof import('../src/cli-helpers')>('../src/cli-helpers');

    expect(shouldBootstrapCloudServicesForArgs([])).toBe(false);
    expect(shouldBootstrapCloudServicesForArgs(['--lang', 'en'])).toBe(false);
    expect(shouldBootstrapCloudServicesForArgs(['/status'])).toBe(false);
    expect(shouldBootstrapCloudServicesForArgs(['fix', 'bug'])).toBe(false);
    expect(shouldBootstrapCloudServicesForArgs(['status'])).toBe(false);
    expect(shouldBootstrapCloudServicesForArgs(['doctor', '--code-type', 'clavue', '--json'])).toBe(false);
    expect(shouldBootstrapCloudServicesForArgs(['zero-config', 'dev', '--code-type', 'clavue'])).toBe(false);
    expect(shouldBootstrapCloudServicesForArgs(['--lang', 'en', 'cloud', 'skills', 'sync'])).toBe(true);
    expect(shouldBootstrapCloudServicesForArgs(['--lang=en', 'cloud', 'skills', 'sync'])).toBe(true);

    process.argv = ['node', 'ccjk', 'fix', 'bug'];
    bootstrapCloudServices();
    expect(mocks.mockSpawn).not.toHaveBeenCalled();

    process.argv = ['node', 'ccjk', '--lang', 'en', 'cloud', 'skills', 'sync'];
    bootstrapCloudServices();
    expect(mocks.mockSpawn).toHaveBeenCalledTimes(1);
    expect(mocks.mockSpawn).toHaveBeenCalledWith(
      process.execPath,
      ['ccjk', '__ccjk-cloud-bootstrap'],
      expect.objectContaining({
        detached: true,
        stdio: 'ignore',
        env: expect.objectContaining({
          CCJK_CLOUD_BOOTSTRAP_WORKER: '1',
        }),
      }),
    );
    expect(mocks.mockChildUnref).toHaveBeenCalledTimes(1);
  });

  it('runs cloud bootstrap worker as a dedicated path', async () => {
    process.argv = ['node', 'ccjk', '__ccjk-cloud-bootstrap'];

    const { runLazyCli } = await import('../src/cli-lazy');
    await runLazyCli();

    expect(mocks.mockRunCloudBootstrapWorker).toHaveBeenCalledTimes(1);
    expect(mocks.mockShowStartupSpinner).not.toHaveBeenCalled();
    expect(mocks.mockBootstrapCloudServices).not.toHaveBeenCalled();
    expect(mocks.mockCli.parse).not.toHaveBeenCalled();
  });

  it('preserves explicit slash-command startup handling', async () => {
    process.argv = ['node', 'ccjk', '/status'];
    mocks.mockExecuteSlashCommand.mockResolvedValue(true);

    const { runLazyCli } = await import('../src/cli-lazy');
    await runLazyCli();

    expect(mocks.mockBootstrapCloudServices).not.toHaveBeenCalled();
    expectMaintenanceSkipped();
    expect(mocks.mockExecuteSlashCommand).toHaveBeenCalledWith('/status');
    expect(mocks.mockHandleIntentRecognition).not.toHaveBeenCalled();
    expect(mocks.mockCli.parse).not.toHaveBeenCalled();
  });

  it('skips eager maintenance for ordinary text arguments', async () => {
    process.argv = ['node', 'ccjk', 'fix', 'bug'];

    const { runLazyCli } = await import('../src/cli-lazy');
    await runLazyCli();

    expect(mocks.mockBootstrapCloudServices).not.toHaveBeenCalled();
    expectMaintenanceSkipped();
    expect(mocks.mockTryQuickProviderLaunch).not.toHaveBeenCalled();
    expect(mocks.mockExecuteSlashCommand).not.toHaveBeenCalled();
    expect(mocks.mockHandleIntentRecognition).not.toHaveBeenCalled();
    expect(mocks.mockCli.parse).toHaveBeenCalledTimes(1);
  });

  it('skips cloud bootstrap for diagnostic status commands', async () => {
    process.argv = ['node', 'ccjk', 'status'];

    const { runLazyCli } = await import('../src/cli-lazy');
    await runLazyCli();

    expect(mocks.mockBootstrapCloudServices).not.toHaveBeenCalled();
    expectMaintenanceSkipped();
    expect(mocks.mockTryQuickProviderLaunch).not.toHaveBeenCalled();
    expect(mocks.mockCli.parse).toHaveBeenCalledTimes(1);
  });

  it('checks single unknown tokens as quick-provider shortcodes without maintenance', async () => {
    process.argv = ['node', 'ccjk', '302'];
    mocks.mockTryQuickProviderLaunch.mockResolvedValue(true);

    const { runLazyCli } = await import('../src/cli-lazy');
    await runLazyCli();

    expect(mocks.mockBootstrapCloudServices).not.toHaveBeenCalled();
    expectMaintenanceSkipped();
    expect(mocks.mockTryQuickProviderLaunch).toHaveBeenCalledTimes(1);
    expect(mocks.mockCli.parse).not.toHaveBeenCalled();
  });

  it('prompts for display language on first default interactive startup', async () => {
    process.argv = ['node', 'ccjk'];

    const { runLazyCli } = await import('../src/cli-lazy');
    await runLazyCli();

    expect(mocks.mockBootstrapCloudServices).not.toHaveBeenCalled();
    expectMaintenanceSkipped();
    expect(mocks.mockTryQuickProviderLaunch).not.toHaveBeenCalled();
    expect(mocks.mockReadZcfConfigAsync).toHaveBeenCalledTimes(1);
    expect(mocks.mockSelectScriptLanguage).toHaveBeenCalledTimes(1);
    expect(mocks.mockInitI18n).toHaveBeenCalledWith('zh-CN');
    expect(mocks.mockShowMainMenu).toHaveBeenCalledWith({ codeType: undefined });
    expect(mocks.mockCli.parse).toHaveBeenCalledTimes(1);
  });

  it('skips eager maintenance on help paths', async () => {
    process.argv = ['node', 'ccjk', '--help'];

    const { runLazyCli } = await import('../src/cli-lazy');
    await runLazyCli();

    expect(mocks.mockBootstrapCloudServices).not.toHaveBeenCalled();
    expectMaintenanceSkipped();
    expect(mocks.mockTryQuickProviderLaunch).not.toHaveBeenCalled();
    expect(mocks.mockCli.parse).toHaveBeenCalledTimes(1);
  });
});
