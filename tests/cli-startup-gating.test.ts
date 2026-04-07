import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const mockBootstrapCloudServices = vi.fn()
  const mockRegisterSpecialCommands = vi.fn(async () => {})
  const mockRunHealthAlertsCheck = vi.fn(async () => {})
  const mockShowCommandDiscoveryBanner = vi.fn(async () => {})
  const mockShowStartupSpinner = vi.fn(async () => ({ stop: mockSpinnerStop }))
  const mockSpinnerStop = vi.fn()
  const mockTryQuickProviderLaunch = vi.fn(async () => false)
  const mockExecuteSlashCommand = vi.fn(async () => false)
  const mockHandleIntentRecognition = vi.fn(async () => false)
  const mockAutoInitBrainHooks = vi.fn(async () => {})
  const mockRunAutoFixOnStartup = vi.fn(async () => {})
  const mockAutoCheckUpdates = vi.fn()
  const mockRunMigration = vi.fn()

  const mockCommand = {
    alias: vi.fn(),
    option: vi.fn(),
    allowUnknownOptions: vi.fn(),
    action: vi.fn(),
  }

  const mockCli = {
    command: vi.fn(),
    help: vi.fn(),
    version: vi.fn(),
    parse: vi.fn(),
  }

  const resetCli = () => {
    mockCommand.alias.mockReset().mockImplementation(() => mockCommand)
    mockCommand.option.mockReset().mockImplementation(() => mockCommand)
    mockCommand.allowUnknownOptions.mockReset().mockImplementation(() => mockCommand)
    mockCommand.action.mockReset().mockImplementation(() => mockCommand)
    mockCli.command.mockReset().mockImplementation(() => mockCommand)
    mockCli.help.mockReset()
    mockCli.version.mockReset()
    mockCli.parse.mockReset()
  }

  resetCli()

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
    mockRunHealthAlertsCheck,
    mockRunMigration,
    mockShowCommandDiscoveryBanner,
    mockShowStartupSpinner,
    mockSpinnerStop,
    mockTryQuickProviderLaunch,
    resetCli,
  }
})

vi.mock('../src/cli-helpers', () => ({
  bootstrapCloudServices: mocks.mockBootstrapCloudServices,
  customizeHelpLazy: vi.fn((sections: unknown[]) => sections),
  registerSpecialCommands: mocks.mockRegisterSpecialCommands,
  runHealthAlertsCheck: mocks.mockRunHealthAlertsCheck,
  showCommandDiscoveryBanner: mocks.mockShowCommandDiscoveryBanner,
  showStartupSpinner: mocks.mockShowStartupSpinner,
  tryQuickProviderLaunch: mocks.mockTryQuickProviderLaunch,
}))

vi.mock('../src/config/migrator', () => ({
  runMigration: mocks.mockRunMigration,
}))

vi.mock('../src/brain/hooks/auto-init', () => ({
  autoInitBrainHooks: mocks.mockAutoInitBrainHooks,
}))

vi.mock('../src/core/auto-fix', () => ({
  runAutoFixOnStartup: mocks.mockRunAutoFixOnStartup,
}))

vi.mock('../src/core/auto-upgrade', () => ({
  autoCheckUpdates: mocks.mockAutoCheckUpdates,
}))

vi.mock('../src/commands/slash-commands', () => ({
  executeSlashCommand: mocks.mockExecuteSlashCommand,
}))

vi.mock('../src/core/intent-engine', () => ({
  handleIntentRecognition: mocks.mockHandleIntentRecognition,
}))

vi.mock('cac', () => ({
  default: vi.fn(() => mocks.mockCli),
}))

describe('cli startup takeover gating', () => {
  const originalArgv = process.argv

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.resetCli()
    mocks.mockShowStartupSpinner.mockResolvedValue({ stop: mocks.mockSpinnerStop })
    mocks.mockTryQuickProviderLaunch.mockResolvedValue(false)
    mocks.mockExecuteSlashCommand.mockResolvedValue(false)
    mocks.mockHandleIntentRecognition.mockResolvedValue(false)
    process.argv = [...originalArgv]
  })

  it('keeps cloud bootstrap limited to explicit command paths', async () => {
    const { bootstrapCloudServices, shouldBootstrapCloudServicesForArgs } = await vi.importActual<typeof import('../src/cli-helpers')>('../src/cli-helpers')
    const setImmediateSpy = vi.spyOn(global, 'setImmediate').mockImplementation((() => 0) as any)

    expect(shouldBootstrapCloudServicesForArgs([])).toBe(false)
    expect(shouldBootstrapCloudServicesForArgs(['--lang', 'en'])).toBe(false)
    expect(shouldBootstrapCloudServicesForArgs(['/status'])).toBe(false)
    expect(shouldBootstrapCloudServicesForArgs(['fix', 'bug'])).toBe(false)
    expect(shouldBootstrapCloudServicesForArgs(['status'])).toBe(true)
    expect(shouldBootstrapCloudServicesForArgs(['--lang', 'en', 'status'])).toBe(true)
    expect(shouldBootstrapCloudServicesForArgs(['--lang=en', 'status'])).toBe(true)

    process.argv = ['node', 'ccjk', 'fix', 'bug']
    bootstrapCloudServices()
    expect(setImmediateSpy).not.toHaveBeenCalled()

    process.argv = ['node', 'ccjk', '--lang', 'en', 'status']
    bootstrapCloudServices()
    expect(setImmediateSpy).toHaveBeenCalledTimes(1)

    setImmediateSpy.mockRestore()
  })

  it('preserves explicit slash-command startup handling', async () => {
    process.argv = ['node', 'ccjk', '/status']
    mocks.mockExecuteSlashCommand.mockResolvedValue(true)

    const { runLazyCli } = await import('../src/cli-lazy')
    await runLazyCli()

    expect(mocks.mockBootstrapCloudServices).toHaveBeenCalledTimes(1)
    expect(mocks.mockExecuteSlashCommand).toHaveBeenCalledWith('/status')
    expect(mocks.mockHandleIntentRecognition).not.toHaveBeenCalled()
    expect(mocks.mockCli.parse).not.toHaveBeenCalled()
  })

  it('stops auto intent takeover for ordinary arguments', async () => {
    process.argv = ['node', 'ccjk', 'fix', 'bug']

    const { runLazyCli } = await import('../src/cli-lazy')
    await runLazyCli()

    expect(mocks.mockBootstrapCloudServices).toHaveBeenCalledTimes(1)
    expect(mocks.mockExecuteSlashCommand).not.toHaveBeenCalled()
    expect(mocks.mockHandleIntentRecognition).not.toHaveBeenCalled()
    expect(mocks.mockCli.parse).toHaveBeenCalledTimes(1)
  })
})
