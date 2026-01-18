/**
 * Tests for Modern Clack-based Prompt System
 */

import * as p from '@clack/prompts'
import { describe, expect, it, vi } from 'vitest'

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  isCancel: vi.fn(value => value === Symbol.for('clack.cancel')),
  note: vi.fn(),
  log: {
    message: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    step: vi.fn(),
  },
  text: vi.fn(),
  password: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  })),
  group: vi.fn(),
}))

// Mock picocolors
vi.mock('picocolors', () => ({
  default: {
    bgCyan: (str: string) => str,
    black: (str: string) => str,
    green: (str: string) => str,
    red: (str: string) => str,
    yellow: (str: string) => str,
    blue: (str: string) => str,
    cyan: (str: string) => str,
    magenta: (str: string) => str,
    gray: (str: string) => str,
    dim: (str: string) => str,
  },
}))

// Mock i18n
vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

describe('modern Prompt System', () => {
  describe('basic Prompts', () => {
    it('should initialize prompts with intro', async () => {
      const { initPrompts } = await import('../../src/prompts/modern')

      initPrompts('Test Setup')

      expect(p.intro).toHaveBeenCalledWith(' Test Setup ')
    })

    it('should show outro message', async () => {
      const { outroPrompts } = await import('../../src/prompts/modern')

      outroPrompts('Done!')

      expect(p.outro).toHaveBeenCalledWith('Done!')
    })

    it('should handle cancellation', async () => {
      const { handleCancel } = await import('../../src/prompts/modern')

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })

      expect(() => handleCancel()).toThrow('process.exit called')
      expect(p.cancel).toHaveBeenCalled()

      mockExit.mockRestore()
    })

    it('should check if value is cancelled', async () => {
      const { isCancel } = await import('../../src/prompts/modern')

      const cancelSymbol = Symbol.for('clack.cancel')
      expect(isCancel(cancelSymbol)).toBe(true)
      expect(isCancel('not cancelled')).toBe(false)
    })
  })

  describe('text Input', () => {
    it('should prompt for text input', async () => {
      const { promptText } = await import('../../src/prompts/modern')

      vi.mocked(p.text).mockResolvedValue('test-project')

      const result = await promptText({
        message: 'Enter project name',
        placeholder: 'my-project',
      })

      expect(result).toBe('test-project')
      expect(p.text).toHaveBeenCalledWith({
        message: 'Enter project name',
        placeholder: 'my-project',
        initialValue: undefined,
        defaultValue: undefined,
        validate: undefined,
      })
    })

    it('should validate text input', async () => {
      const { promptText } = await import('../../src/prompts/modern')

      const validate = vi.fn((value: string) => {
        if (!value)
          return 'Required'
      })

      vi.mocked(p.text).mockResolvedValue('valid-input')

      await promptText({
        message: 'Enter value',
        validate,
      })

      expect(p.text).toHaveBeenCalledWith({
        message: 'Enter value',
        placeholder: undefined,
        initialValue: undefined,
        defaultValue: undefined,
        validate,
      })
    })
  })

  describe('password Input', () => {
    it('should prompt for password', async () => {
      const { promptPassword } = await import('../../src/prompts/modern')

      vi.mocked(p.password).mockResolvedValue('secret123')

      const result = await promptPassword({
        message: 'Enter password',
      })

      expect(result).toBe('secret123')
      expect(p.password).toHaveBeenCalledWith({
        message: 'Enter password',
        validate: undefined,
      })
    })
  })

  describe('confirmation', () => {
    it('should prompt for confirmation', async () => {
      const { promptConfirm } = await import('../../src/prompts/modern')

      vi.mocked(p.confirm).mockResolvedValue(true)

      const result = await promptConfirm({
        message: 'Continue?',
        initialValue: false,
      })

      expect(result).toBe(true)
      expect(p.confirm).toHaveBeenCalledWith({
        message: 'Continue?',
        initialValue: false,
        active: undefined,
        inactive: undefined,
      })
    })
  })

  describe('select', () => {
    it('should prompt for selection', async () => {
      const { promptSelect } = await import('../../src/prompts/modern')

      vi.mocked(p.select).mockResolvedValue('option1')

      const result = await promptSelect(
        'Choose option',
        [
          { value: 'option1', label: 'Option 1' },
          { value: 'option2', label: 'Option 2' },
        ],
      )

      expect(result).toBe('option1')
      expect(p.select).toHaveBeenCalled()
    })
  })

  describe('multi-select', () => {
    it('should prompt for multi-selection', async () => {
      const { promptMultiSelect } = await import('../../src/prompts/modern')

      vi.mocked(p.multiselect).mockResolvedValue(['opt1', 'opt2'])

      const result = await promptMultiSelect(
        'Choose options',
        [
          { value: 'opt1', label: 'Option 1' },
          { value: 'opt2', label: 'Option 2' },
          { value: 'opt3', label: 'Option 3' },
        ],
      )

      expect(result).toEqual(['opt1', 'opt2'])
      expect(p.multiselect).toHaveBeenCalled()
    })
  })

  describe('project Setup Wizard', () => {
    it('should run project setup wizard', async () => {
      const { promptProjectSetup } = await import('../../src/prompts/modern')

      vi.mocked(p.group).mockResolvedValue({
        projectName: 'test-project',
        codeType: 'claude-code',
        language: 'en',
        aiOutputLanguage: 'en',
        features: ['mcp', 'workflows'],
      })

      const result = await promptProjectSetup()

      expect(result).toEqual({
        projectName: 'test-project',
        codeType: 'claude-code',
        language: 'en',
        aiOutputLanguage: 'en',
        features: ['mcp', 'workflows'],
      })
      expect(p.group).toHaveBeenCalled()
    })
  })

  describe('aPI Configuration', () => {
    it('should configure API with auth token', async () => {
      const { promptApiConfiguration } = await import('../../src/prompts/modern')

      vi.mocked(p.select).mockResolvedValue('auth_token')
      vi.mocked(p.password).mockResolvedValue('token123')

      const result = await promptApiConfiguration()

      expect(result).toEqual({
        type: 'auth_token',
        authToken: 'token123',
      })
    })

    it('should configure API with API key', async () => {
      const { promptApiConfiguration } = await import('../../src/prompts/modern')

      vi.mocked(p.select)
        .mockResolvedValueOnce('api_key')
        .mockResolvedValueOnce('anthropic')
      vi.mocked(p.password).mockResolvedValue('sk-key123')

      const result = await promptApiConfiguration()

      expect(result).toEqual({
        type: 'api_key',
        apiKey: 'sk-key123',
        provider: 'anthropic',
      })
    })

    it('should skip API configuration', async () => {
      const { promptApiConfiguration } = await import('../../src/prompts/modern')

      vi.mocked(p.select).mockResolvedValue('skip')

      const result = await promptApiConfiguration()

      expect(result).toEqual({ type: 'skip' })
    })
  })

  describe('feature Selection', () => {
    it('should select features', async () => {
      const { promptFeatureSelection } = await import('../../src/prompts/modern')

      vi.mocked(p.multiselect).mockResolvedValue(['mcp', 'ccr'])

      const result = await promptFeatureSelection([
        { value: 'mcp', label: 'MCP Services' },
        { value: 'workflows', label: 'Workflows' },
        { value: 'ccr', label: 'CCR Proxy' },
      ])

      expect(result).toEqual(['mcp', 'ccr'])
    })
  })

  describe('language Selection', () => {
    it('should select language', async () => {
      const { promptLanguageSelection } = await import('../../src/prompts/modern')

      vi.mocked(p.select).mockResolvedValue('zh-CN')

      const result = await promptLanguageSelection()

      expect(result).toBe('zh-CN')
    })

    it('should select AI output language', async () => {
      const { promptAiOutputLanguage } = await import('../../src/prompts/modern')

      vi.mocked(p.select).mockResolvedValue('en')

      const result = await promptAiOutputLanguage('en')

      expect(result).toBe('en')
    })

    it('should handle custom AI output language', async () => {
      const { promptAiOutputLanguage } = await import('../../src/prompts/modern')

      vi.mocked(p.select).mockResolvedValue('custom')
      vi.mocked(p.text).mockResolvedValue('Japanese')

      const result = await promptAiOutputLanguage()

      expect(result).toBe('Japanese')
    })
  })

  describe('progress Helpers', () => {
    it('should execute task with progress', async () => {
      const { withProgress } = await import('../../src/prompts/modern')

      const task = vi.fn().mockResolvedValue('result')
      const result = await withProgress('Processing...', task)

      expect(result).toBe('result')
      expect(task).toHaveBeenCalled()
    })

    it('should handle task failure', async () => {
      const { withProgress } = await import('../../src/prompts/modern')

      const task = vi.fn().mockRejectedValue(new Error('Task failed'))

      await expect(withProgress('Processing...', task)).rejects.toThrow('Task failed')
    })

    it('should execute multiple steps', async () => {
      const { withSteps } = await import('../../src/prompts/modern')

      const steps = [
        { message: 'Step 1', task: vi.fn().mockResolvedValue('result1') },
        { message: 'Step 2', task: vi.fn().mockResolvedValue('result2') },
      ]

      const results = await withSteps(steps)

      expect(results).toEqual(['result1', 'result2'])
      expect(steps[0].task).toHaveBeenCalled()
      expect(steps[1].task).toHaveBeenCalled()
    })
  })
})
