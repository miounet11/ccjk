import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../src/utils/environment-cleaner', () => ({
  printCodexRuntimeStatus: vi.fn(),
  printEnvironmentScanReport: vi.fn(() => true),
}))

vi.mock('../../../src/commands/clean', () => ({
  cleanCommand: vi.fn(),
}))

vi.mock('../../../src/commands/probe', () => ({
  probeCommand: vi.fn(),
}))

vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: { t: vi.fn((key: string) => key) },
}))

describe('doctor-hub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('runs scan report when selected', async () => {
    const inquirer = await import('inquirer')
    vi.mocked(inquirer.default.prompt)
      .mockResolvedValueOnce({ action: 'scan' })
      .mockResolvedValueOnce({ action: 'back' })

    const { printEnvironmentScanReport } = await import('../../../src/utils/environment-cleaner')
    const { runDoctorHub } = await import('../../../src/utils/doctor-hub')

    await runDoctorHub('codex')

    expect(printEnvironmentScanReport).toHaveBeenCalled()
  })

  it('runs smart cleanup when selected', async () => {
    const inquirer = await import('inquirer')
    vi.mocked(inquirer.default.prompt)
      .mockResolvedValueOnce({ action: 'smart' })
      .mockResolvedValueOnce({ action: 'back' })

    const { cleanCommand } = await import('../../../src/commands/clean')
    const { runDoctorHub } = await import('../../../src/utils/doctor-hub')

    await runDoctorHub('codex')

    expect(cleanCommand).toHaveBeenCalledWith({ codeType: 'codex' })
  })
})