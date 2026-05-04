import { beforeEach, describe, expect, it, vi } from 'vitest'

const readCcjk = vi.fn()
const writeCcjk = vi.fn()
const createDefaultCcjk = vi.fn()
const readState = vi.fn()
const writeState = vi.fn()
const createDefaultState = vi.fn()
const readClaudeConfig = vi.fn()
const writeClaudeConfig = vi.fn()
const backupClaudeConfig = vi.fn()
const readZcfConfig = vi.fn()

vi.mock('../../src/config/unified', () => ({
  config: {
    ccjk: {
      read: readCcjk,
      write: writeCcjk,
      createDefault: createDefaultCcjk,
    },
    state: {
      read: readState,
      write: writeState,
      createDefault: createDefaultState,
    },
  },
}))

vi.mock('../../src/config/unified/claude-config', () => ({
  readClaudeConfig,
  writeClaudeConfig,
  backupClaudeConfig,
}))

vi.mock('../../src/utils/ccjk-config', () => ({
  readZcfConfig,
}))

vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    language: 'en',
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('ansis', () => ({
  default: {
    bold: Object.assign((value: string) => value, {
      cyan: (value: string) => value,
    }),
    cyan: (value: string) => value,
    dim: (value: string) => value,
    green: (value: string) => value,
    red: (value: string) => value,
    yellow: (value: string) => value,
  },
}))

describe('consolidated config commands Clavue runtime routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readCcjk.mockReturnValue(null)
    readState.mockReturnValue(null)
    createDefaultCcjk.mockReturnValue({})
    createDefaultState.mockReturnValue({})
    readClaudeConfig.mockReturnValue({
      env: {
        ANTHROPIC_BASE_URL: 'https://clavue.example.com',
      },
    })
    backupClaudeConfig.mockReturnValue('/tmp/home/.clavue/backup/settings.backup.json')
    readZcfConfig.mockReturnValue({ codeToolType: 'clavue' })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('lists the Clavue settings file when code type is Clavue', async () => {
    const { listCommand } = await import('../../src/commands/config/list')

    await listCommand({ codeType: 'clavue', verbose: true })

    expect(readClaudeConfig).toHaveBeenCalledWith(expect.stringContaining('.clavue/settings.json'))
    const output = vi.mocked(console.log).mock.calls.flat().join('\n')
    expect(output).toContain('Clavue')
    expect(output).toContain('.clavue/settings.json')
    expect(output).not.toContain('.claude/settings.json')
  })

  it('gets values from the Clavue settings file with source path', async () => {
    const { getCommand } = await import('../../src/commands/config/get')

    await getCommand('env.ANTHROPIC_BASE_URL', { codeType: 'clavue', showSource: true })

    expect(readClaudeConfig).toHaveBeenCalledWith(expect.stringContaining('.clavue/settings.json'))
    const output = vi.mocked(console.log).mock.calls.flat().join('\n')
    expect(output).toContain('https://clavue.example.com')
    expect(output).toContain('clavue')
    expect(output).toContain('.clavue/settings.json')
  })

  it('sets values in the Clavue settings file when the scope is Claude-family', async () => {
    const { setCommand } = await import('../../src/commands/config/set')

    await setCommand('env.TEST_VALUE', 'ok', { codeType: 'clavue' })

    expect(backupClaudeConfig).toHaveBeenCalledWith(expect.stringContaining('.clavue/settings.json'))
    expect(writeClaudeConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        env: expect.objectContaining({
          ANTHROPIC_BASE_URL: 'https://clavue.example.com',
          TEST_VALUE: 'ok',
        }),
      }),
      {},
      expect.stringContaining('.clavue/settings.json'),
    )
  })
})
