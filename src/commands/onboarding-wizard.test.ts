import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrompt = vi.fn()
const mockChangeLanguage = vi.fn()
const mockReadZcfConfig = vi.fn()
const mockUpdateZcfConfig = vi.fn()

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: mockPrompt,
  },
}))

vi.mock('../i18n', () => ({
  changeLanguage: mockChangeLanguage,
  i18n: {
    language: 'en',
  },
}))

vi.mock('../utils/ccjk-config', () => ({
  readZcfConfig: mockReadZcfConfig,
  updateZcfConfig: mockUpdateZcfConfig,
}))

vi.mock('../utils/runtime-package', () => ({
  getRuntimeVersion: () => '13.5.4',
}))

describe('runOnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(readFileSync).mockReturnValue('{}')
    vi.mocked(mkdirSync).mockImplementation(() => undefined as never)
    vi.mocked(writeFileSync).mockImplementation(() => undefined as never)
    mockReadZcfConfig.mockReturnValue(null)
  })

  it('prompts for language and tool, then persists a Codex-first onboarding choice', async () => {
    mockPrompt
      .mockResolvedValueOnce({ lang: 'zh-CN' })
      .mockResolvedValueOnce({ tool: 'codex' })

    const { runOnboardingWizard } = await import('./onboarding-wizard')
    await runOnboardingWizard()

    expect(mockPrompt).toHaveBeenCalledTimes(2)
    expect(mockPrompt.mock.calls[0][0].message).toContain('Select CCJK display language')
    expect(mockPrompt.mock.calls[1][0].message).toBe('选择代码工具')
    expect(mockUpdateZcfConfig).toHaveBeenNthCalledWith(1, {
      version: '13.5.4',
      preferredLang: 'zh-CN',
      templateLang: 'zh-CN',
    })
    expect(mockUpdateZcfConfig).toHaveBeenNthCalledWith(2, {
      version: '13.5.4',
      codeToolType: 'codex',
    })
    expect(mockChangeLanguage).toHaveBeenCalledWith('zh-CN')
  })

  it('skips prompts when language exists and the caller preselects Codex', async () => {
    mockReadZcfConfig.mockReturnValue({
      preferredLang: 'en',
      codeToolType: 'claude-code',
      version: '13.5.3',
    })

    const { runOnboardingWizard } = await import('./onboarding-wizard')
    await runOnboardingWizard({ preferredCodeTool: 'codex' })

    expect(mockPrompt).not.toHaveBeenCalled()
    expect(mockChangeLanguage).toHaveBeenCalledWith('en')
    expect(mockUpdateZcfConfig).toHaveBeenCalledWith({
      version: '13.5.4',
      codeToolType: 'codex',
    })
  })
})
