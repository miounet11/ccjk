import { beforeEach, describe, expect, it, vi } from 'vitest'

const prompt = vi.fn()

vi.mock('inquirer', () => ({
  default: {
    prompt,
  },
}))

vi.mock('ansis', () => ({
  default: {
    bold: {
      cyan: (value: string) => value,
    },
    cyan: (value: string) => value,
    green: (value: string) => value,
    red: (value: string) => value,
    yellow: (value: string) => value,
  },
}))

vi.mock('../../src/i18n', () => ({
  i18n: {
    language: 'zh-CN',
  },
}))

vi.mock('../../src/utils/ccjk-config', () => ({
  readZcfConfig: vi.fn(() => ({ codeToolType: 'claude-code' })),
}))

vi.mock('../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    switchToOfficial: vi.fn(),
    switchToCcr: vi.fn(),
  },
}))

vi.mock('../../src/utils/features', () => ({
  handleCustomApiMode: vi.fn(),
}))

vi.mock('../../src/commands/config-switch', () => ({
  configSwitchCommand: vi.fn(),
}))

describe('api config selector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the restored 4-option menu with custom config as default', async () => {
    const { showApiConfigMenu } = await import('../../src/commands/api-config-selector')

    prompt.mockResolvedValueOnce({ choice: 'skip' })

    await showApiConfigMenu()

    expect(prompt).toHaveBeenCalledWith(expect.objectContaining({
      message: '请选择 API 配置模式:',
      default: 'custom',
      choices: [
        { name: '使用官方登录', value: 'official' },
        { name: '自定义 API 配置', value: 'custom' },
        { name: '使用 CCR 代理', value: 'ccr' },
        { name: '跳过（稍后手动配置）', value: 'skip' },
      ],
    }))
  })

  it('routes custom selection to the legacy custom API management flow', async () => {
    const { showApiConfigMenu } = await import('../../src/commands/api-config-selector')
    const { handleCustomApiMode } = await import('../../src/utils/features')

    prompt.mockResolvedValueOnce({ choice: 'custom' })

    await showApiConfigMenu(undefined, { context: 'menu' })

    expect(handleCustomApiMode).toHaveBeenCalledTimes(1)
  })
})
