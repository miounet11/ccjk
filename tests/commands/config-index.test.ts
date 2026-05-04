import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiCommand = vi.fn()
const switchCommand = vi.fn()
const listCommand = vi.fn()
const getCommand = vi.fn()
const setCommand = vi.fn()

vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    language: 'en',
  },
}))

vi.mock('../../src/commands/config/api', () => ({
  apiCommand,
}))

vi.mock('../../src/commands/config/switch', () => ({
  switchCommand,
}))

vi.mock('../../src/commands/config/list', () => ({
  listCommand,
}))

vi.mock('../../src/commands/config/get', () => ({
  getCommand,
}))

vi.mock('../../src/commands/config/set', () => ({
  setCommand,
}))

vi.mock('ansis', () => ({
  default: {
    bold: {
      cyan: (value: string) => value,
    },
    green: (value: string) => value,
  },
}))

describe('config command router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes code type into the API subcommand', async () => {
    const { configCommand } = await import('../../src/commands/config/index')

    await configCommand(['api', 'glm', 'sk-test'], { codeType: 'clavue' })

    expect(apiCommand).toHaveBeenCalledWith(['glm', 'sk-test'], {
      lang: undefined,
      json: undefined,
      codeType: 'clavue',
    })
  })

  it('passes code type into the switch subcommand', async () => {
    const { configCommand } = await import('../../src/commands/config/index')

    await configCommand(['switch', 'official'], { codeType: 'clavue' })

    expect(switchCommand).toHaveBeenCalledWith('official', {
      lang: undefined,
      json: undefined,
      codeType: 'clavue',
    })
  })

  it('passes code type into list/get/set subcommands', async () => {
    const { configCommand } = await import('../../src/commands/config/index')

    await configCommand(['list'], { codeType: 'clavue' })
    await configCommand(['get', 'env.ANTHROPIC_BASE_URL'], { codeType: 'clavue' })
    await configCommand(['set', 'env.TEST_VALUE', 'ok'], { codeType: 'clavue' })

    expect(listCommand).toHaveBeenCalledWith({
      lang: undefined,
      json: undefined,
      codeType: 'clavue',
    })
    expect(getCommand).toHaveBeenCalledWith('env.ANTHROPIC_BASE_URL', {
      lang: undefined,
      json: undefined,
      codeType: 'clavue',
    })
    expect(setCommand).toHaveBeenCalledWith('env.TEST_VALUE', 'ok', {
      lang: undefined,
      json: undefined,
      codeType: 'clavue',
    })
  })
})
