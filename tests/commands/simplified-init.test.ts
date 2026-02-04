import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Note: These tests are limited because simplifiedInit calls init() internally,
 * and ES modules don't allow mocking functions within the same module.
 *
 * We test what we can: error handling and the smart defaults detection flow.
 * Full integration testing of simplifiedInit should be done via E2E tests.
 */

// Mock dependencies
vi.mock('../../src/config/smart-defaults', () => ({
  smartDefaults: {
    detect: vi.fn(),
    validateDefaults: vi.fn(),
  },
}))

vi.mock('../../src/i18n', () => ({
  i18n: {
    t: (key: string, params?: any) => `${key}${params ? ` ${JSON.stringify(params)}` : ''}`,
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
  prompt: vi.fn(),
}))

vi.mock('ansis', () => ({
  default: {
    bold: { green: (s: string) => s, cyan: (s: string) => s },
    yellow: (s: string) => s,
    gray: (s: string) => s,
    red: (s: string) => s,
  },
}))

describe('simplifiedInit', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('error handling', () => {
    it('should handle detection errors gracefully', async () => {
      const smartDefaults = await import('../../src/config/smart-defaults')
      vi.mocked(smartDefaults.smartDefaults.detect).mockRejectedValue(new Error('Detection failed'))

      const { simplifiedInit } = await import('../../src/commands/init')
      await expect(simplifiedInit({ skipPrompt: true })).rejects.toThrow('Detection failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Installation failed'),
        expect.any(String),
      )
    })

    it('should handle validation errors gracefully', async () => {
      const smartDefaults = await import('../../src/config/smart-defaults')
      vi.mocked(smartDefaults.smartDefaults.detect).mockRejectedValue(new Error('Validation error'))

      const { simplifiedInit } = await import('../../src/commands/init')
      await expect(simplifiedInit({ skipPrompt: true })).rejects.toThrow('Validation error')
    })
  })

  describe('smart defaults detection', () => {
    it('should call smartDefaults.detect on initialization', async () => {
      const smartDefaults = await import('../../src/config/smart-defaults')
      vi.mocked(smartDefaults.smartDefaults.detect).mockRejectedValue(new Error('Test stop'))

      const { simplifiedInit } = await import('../../src/commands/init')
      await expect(simplifiedInit({ skipPrompt: true })).rejects.toThrow('Test stop')

      expect(smartDefaults.smartDefaults.detect).toHaveBeenCalled()
    })

    it('should display one-click installation banner', async () => {
      const smartDefaults = await import('../../src/config/smart-defaults')
      vi.mocked(smartDefaults.smartDefaults.detect).mockRejectedValue(new Error('Test stop'))

      const { simplifiedInit } = await import('../../src/commands/init')
      await expect(simplifiedInit({ skipPrompt: true })).rejects.toThrow()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('One-Click Installation'))
    })
  })

  describe('aPI key handling', () => {
    it('should prompt for API key when not detected and skipPrompt is false', async () => {
      const smartDefaults = await import('../../src/config/smart-defaults')
      const inquirer = await import('inquirer')

      const mockDefaults = {
        platform: 'linux',
        homeDir: '/home/user',
        apiProvider: undefined,
        apiKey: undefined,
        mcpServices: ['filesystem'],
        skills: ['ccjk:git-commit'],
        agents: [],
        codeToolType: 'claude-code',
        workflows: {},
        tools: { ccr: false, cometix: false, ccusage: false },
      }

      vi.mocked(smartDefaults.smartDefaults.detect).mockResolvedValue(mockDefaults)
      vi.mocked(smartDefaults.smartDefaults.validateDefaults).mockReturnValue({ valid: true, issues: [] })
      // Make inquirer throw to stop execution after prompt
      vi.mocked(inquirer.default.prompt).mockRejectedValue(new Error('Prompt cancelled'))

      const { simplifiedInit } = await import('../../src/commands/init')
      await expect(simplifiedInit({ skipPrompt: false })).rejects.toThrow('Prompt cancelled')

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No API key detected'))
      expect(inquirer.default.prompt).toHaveBeenCalled()
    })
  })

  describe('validation issues display', () => {
    it('should display validation issues when detected', async () => {
      const smartDefaults = await import('../../src/config/smart-defaults')

      const mockDefaults = {
        platform: 'unsupported',
        homeDir: '/home/user',
        apiProvider: 'anthropic',
        apiKey: 'sk-ant-test',
        mcpServices: ['filesystem'],
        skills: ['ccjk:git-commit'],
        agents: [],
        codeToolType: 'claude-code',
        workflows: {},
        tools: { ccr: false, cometix: false, ccusage: false },
      }

      vi.mocked(smartDefaults.smartDefaults.detect).mockResolvedValue(mockDefaults)
      vi.mocked(smartDefaults.smartDefaults.validateDefaults).mockReturnValue({
        valid: false,
        issues: ['Platform unsupported may not be fully supported'],
      })

      // The test will fail when it tries to call init(), but we can still verify
      // that validation issues are displayed before that point
      const { simplifiedInit } = await import('../../src/commands/init')

      // We expect this to eventually fail (when it calls init), but we want to verify
      // the validation message was shown
      try {
        await simplifiedInit({ skipPrompt: true })
      }
      catch {
        // Expected to fail
      }

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Environment issues detected'))
    })
  })
})
