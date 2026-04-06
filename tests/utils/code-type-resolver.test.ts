import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockReadZcfConfigAsync = vi.fn()
const mockUpdateZcfConfig = vi.fn()
const mockDetectCodeToolType = vi.fn()
const mockPrompt = vi.fn()
let mockLanguage = 'en'

vi.mock('../../src/utils/ccjk-config', () => ({
  readZcfConfigAsync: mockReadZcfConfigAsync,
  updateZcfConfig: mockUpdateZcfConfig,
}))

vi.mock('../../src/config/smart-defaults', () => ({
  detectCodeToolType: mockDetectCodeToolType,
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: mockPrompt,
  },
  prompt: mockPrompt,
}))

vi.mock('ansis', () => ({
  default: {
    cyan: (value: string) => value,
  },
}))

vi.mock('../../src/i18n', () => ({
  i18n: {
    get language() {
      return mockLanguage
    },
    t: (key: string, params?: Record<string, unknown>) => `${key}${params ? ` ${JSON.stringify(params)}` : ''}`,
  },
}))

describe('code type resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockLanguage = 'en'
    mockReadZcfConfigAsync.mockResolvedValue(null)
    mockDetectCodeToolType.mockReturnValue('myclaude')
  })

  it('resolves explicit myclaude alias without prompting and persists it', async () => {
    const { resolveStartupCodeType } = await import('../../src/utils/code-type-resolver')

    await expect(resolveStartupCodeType({ codeTypeParam: 'mc', interactive: true })).resolves.toBe('myclaude')

    expect(mockPrompt).not.toHaveBeenCalled()
    expect(mockUpdateZcfConfig).toHaveBeenCalledWith({ codeToolType: 'myclaude' })
  })

  it('uses stored code tool without prompting', async () => {
    mockReadZcfConfigAsync.mockResolvedValue({ codeToolType: 'codex' })

    const { resolveStartupCodeType } = await import('../../src/utils/code-type-resolver')

    await expect(resolveStartupCodeType({ interactive: true })).resolves.toBe('codex')

    expect(mockPrompt).not.toHaveBeenCalled()
    expect(mockUpdateZcfConfig).not.toHaveBeenCalled()
  })

  it('prompts with myclaude first and default selected when interactive', async () => {
    mockPrompt.mockResolvedValue({ codeToolType: 'claude-code' })

    const { resolveStartupCodeType, STARTUP_CODE_TOOL_CHOICES } = await import('../../src/utils/code-type-resolver')

    await expect(resolveStartupCodeType({ interactive: true })).resolves.toBe('claude-code')

    expect(STARTUP_CODE_TOOL_CHOICES).toEqual(['myclaude', 'claude-code', 'codex'])
    expect(mockPrompt).toHaveBeenCalledTimes(1)

    const promptConfig = mockPrompt.mock.calls[0][0]
    expect(promptConfig.default).toBe(0)
    expect(promptConfig.choices.map((choice: { value: string }) => choice.value)).toEqual([
      'myclaude',
      'claude-code',
      'codex',
    ])
    expect(mockUpdateZcfConfig).toHaveBeenCalledWith({ codeToolType: 'claude-code' })
  })

  it('falls back to detection without prompting in non-interactive mode', async () => {
    mockDetectCodeToolType.mockReturnValue('myclaude')

    const { resolveStartupCodeType } = await import('../../src/utils/code-type-resolver')

    await expect(resolveStartupCodeType({ interactive: false })).resolves.toBe('myclaude')

    expect(mockPrompt).not.toHaveBeenCalled()
    expect(mockUpdateZcfConfig).not.toHaveBeenCalled()
  })
})
