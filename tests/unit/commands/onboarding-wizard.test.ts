import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 用临时目录替身 ~/.ccjk，测试在沙箱内不再触碰真实用户目录
const CCJK_DIR = mkdtempSync(join(tmpdir(), 'ccjk-onboard-test-'))
const ONBOARDING_FILE = join(CCJK_DIR, 'onboarding.json')
const CONFIG_FILE = join(CCJK_DIR, 'config.toml')

vi.mock('../../../src/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/constants')>()
  return {
    ...actual,
    CCJK_CONFIG_DIR: CCJK_DIR,
    CCJK_CONFIG_FILE: CONFIG_FILE,
  }
})

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    changeLanguage: vi.fn().mockResolvedValue(undefined),
  }
})

const inquirer = (await import('inquirer')).default

describe('onboarding-wizard', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    if (existsSync(ONBOARDING_FILE)) rmSync(ONBOARDING_FILE, { force: true })
    if (existsSync(CONFIG_FILE)) rmSync(CONFIG_FILE, { force: true })
  })

  afterEach(() => {
    if (existsSync(ONBOARDING_FILE)) rmSync(ONBOARDING_FILE, { force: true })
    if (existsSync(CONFIG_FILE)) rmSync(CONFIG_FILE, { force: true })
  })

  it('首次进入先选语言再选工具，并写入 onboarding 状态', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ lang: 'zh-CN' })
      .mockResolvedValueOnce({ tool: 'codex' })

    const { runOnboardingWizard, isOnboardingCompleted } = await import('../../../src/commands/onboarding-wizard')

    await runOnboardingWizard()

    expect(isOnboardingCompleted()).toBe(true)
    const state = JSON.parse(readFileSync(ONBOARDING_FILE, 'utf-8'))
    expect(state.completed).toBe(true)
    expect(state.completedSteps).toEqual([1, 2])
    expect(inquirer.prompt).toHaveBeenCalledTimes(2)
  })

  it('已完成 onboarding 时跳过向导', async () => {
    writeFileSync(ONBOARDING_FILE, JSON.stringify({ completed: true, completedAt: new Date().toISOString() }), 'utf-8')

    const { runOnboardingWizard } = await import('../../../src/commands/onboarding-wizard')
    await runOnboardingWizard()

    expect(inquirer.prompt).not.toHaveBeenCalled()
  })

  it('支持四种开发工具含 grok', async () => {
    const { STARTUP_CODE_TOOL_CHOICES } = await import('../../../src/utils/code-type-resolver')
    expect(STARTUP_CODE_TOOL_CHOICES).toEqual(['clavue', 'claude-code', 'codex', 'grok'])
  })
})