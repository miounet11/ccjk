import type { SupportedLang } from '../../../src/constants'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanupLegacyPersonalityFiles,
  clearGlobalOutputStyle,
  configureOutputStyle,
  copyOutputStyles,
  getAvailableOutputStyles,
  hasLegacyPersonalityFiles,
  setGlobalDefaultOutputStyle,
} from '../../../src/utils/output-style'
import { promptBoolean } from '../../../src/utils/toggle-prompt'

// Mock dependencies
vi.mock('../../../src/utils/fs-operations', () => ({
  ensureDir: vi.fn(),
  copyFile: vi.fn(),
  exists: vi.fn(),
  removeFile: vi.fn(),
}))
vi.mock('../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))
vi.mock('../../../src/utils/ccjk-config', () => ({
  readCcjkConfig: vi.fn(() => ({ codeToolType: 'claude-code' })),
  updateCcjkConfig: vi.fn(),
}))
vi.mock('../../../src/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/constants')>()
  return {
    ...actual,
    CLAUDE_DIR: '/test/claude',
    SETTINGS_FILE: '/test/claude/settings.json',
  }
})
// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    // Only mock initialization functions to avoid setup issues in tests
    ensureI18nInitialized: vi.fn(),
  }
})
vi.mock('inquirer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('inquirer')>()
  return {
    ...actual,
    default: {
      prompt: vi.fn(),
    },
  }
})

vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

// Declare mock types
let mockFsOperations: any
let mockJsonConfig: any
let mockCcjkConfig: any
let mockInquirer: any

describe('output-style', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // Initialize mocked modules
    mockFsOperations = vi.mocked(await import('../../../src/utils/fs-operations'))
    mockJsonConfig = vi.mocked(await import('../../../src/utils/json-config'))
    mockCcjkConfig = vi.mocked(await import('../../../src/utils/ccjk-config'))
    mockInquirer = vi.mocked(await import('inquirer'))

    // Initialize real i18n for test environment
    const { initI18n } = await import('../../../src/i18n')
    await initI18n('zh-CN')
  })

  describe('getAvailableOutputStyles', () => {
    it('should return all available output styles', () => {
      const styles = getAvailableOutputStyles()

      expect(styles).toHaveLength(8)
      expect(styles.map(s => s.id)).toEqual([
        'agents-md-baseline',
        'plan-first',
        'verify-and-ship',
        'surgical-diff',
        'engineer-professional',
        'default',
        'explanatory',
        'learning',
      ])
    })

    it('should have correct custom styles with file paths', () => {
      const styles = getAvailableOutputStyles()
      const customStyles = styles.filter(s => s.isCustom)

      expect(customStyles).toHaveLength(5)
      customStyles.forEach((style) => {
        expect(style.filePath).toBeDefined()
        expect(style.filePath).toContain('.md')
      })
    })

    it('should have correct built-in styles without file paths', () => {
      const styles = getAvailableOutputStyles()
      const builtinStyles = styles.filter(s => !s.isCustom)

      expect(builtinStyles).toHaveLength(3)
      builtinStyles.forEach((style) => {
        expect(style.filePath).toBeUndefined()
      })
    })

    it('should include agents-md-baseline with correct configuration', () => {
      const styles = getAvailableOutputStyles()
      const linusMode = styles.find(s => s.id === 'agents-md-baseline')

      expect(linusMode).toBeDefined()
      expect(linusMode?.isCustom).toBe(true)
      expect(linusMode?.filePath).toBe('agents-md-baseline.md')
    })
  })

  describe('copyOutputStyles', () => {
    it('should copy selected styles to claude directory', async () => {
      const selectedStyles = ['agents-md-baseline', 'engineer-professional']
      const lang: SupportedLang = 'zh-CN'

      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockFsOperations.exists.mockImplementation(() => true)

      await copyOutputStyles(selectedStyles, lang)

      expect(mockFsOperations.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('output-styles'),
      )
      expect(mockFsOperations.copyFile).toHaveBeenCalledTimes(2)
    })

    it('should use shared common/output-styles path for templates', async () => {
      const selectedStyles = ['agents-md-baseline']
      const lang: SupportedLang = 'zh-CN'

      mockFsOperations.ensureDir.mockImplementation(() => {})
      let capturedSourcePath: string | undefined
      mockFsOperations.copyFile.mockImplementation((source: string) => {
        capturedSourcePath = source
      })
      mockFsOperations.exists.mockImplementation(() => true)

      await copyOutputStyles(selectedStyles, lang)

      expect(capturedSourcePath).toBeDefined()
      // Verify the source path uses common/output-styles (shared directory)
      expect(capturedSourcePath).toMatch(/templates[/\\]common[/\\]output-styles[/\\]zh-CN/)
      // Verify it does NOT use the old claude-code specific path
      expect(capturedSourcePath).not.toMatch(/templates[/\\]claude-code[/\\]zh-CN[/\\]output-styles/)
    })

    it('should use shared common/output-styles path for English locale', async () => {
      const selectedStyles = ['agents-md-baseline']
      const lang: SupportedLang = 'en'

      mockFsOperations.ensureDir.mockImplementation(() => {})
      let capturedSourcePath: string | undefined
      mockFsOperations.copyFile.mockImplementation((source: string) => {
        capturedSourcePath = source
      })
      mockFsOperations.exists.mockImplementation(() => true)

      await copyOutputStyles(selectedStyles, lang)

      expect(capturedSourcePath).toBeDefined()
      // Verify the source path uses common/output-styles/en (shared directory)
      expect(capturedSourcePath).toMatch(/templates[/\\]common[/\\]output-styles[/\\]en/)
      // Verify it does NOT use the old claude-code path
      expect(capturedSourcePath).not.toMatch(/templates[/\\]claude-code[/\\]en[/\\]output-styles/)
    })

    it('should skip non-existent template files', async () => {
      const selectedStyles = ['agents-md-baseline']
      const lang: SupportedLang = 'zh-CN'

      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockFsOperations.exists.mockImplementation(() => false) // Template doesn't exist

      await copyOutputStyles(selectedStyles, lang)

      expect(mockFsOperations.copyFile).not.toHaveBeenCalled()
    })

    it('should only copy custom styles (built-in styles have no files)', async () => {
      const selectedStyles = ['agents-md-baseline', 'default', 'explanatory']
      const lang: SupportedLang = 'zh-CN'

      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockFsOperations.exists.mockImplementation(() => true)

      await copyOutputStyles(selectedStyles, lang)

      // Only agents-md-baseline should be copied (custom style)
      expect(mockFsOperations.copyFile).toHaveBeenCalledTimes(1)
    })

    it('should copy agents-md-baseline template correctly', async () => {
      const selectedStyles = ['agents-md-baseline']
      const lang: SupportedLang = 'zh-CN'

      mockFsOperations.ensureDir.mockImplementation(() => {})
      let capturedSourcePath: string | undefined
      let capturedDestPath: string | undefined
      mockFsOperations.copyFile.mockImplementation((source: string, dest: string) => {
        capturedSourcePath = source
        capturedDestPath = dest
      })
      mockFsOperations.exists.mockImplementation(() => true)

      await copyOutputStyles(selectedStyles, lang)

      expect(mockFsOperations.copyFile).toHaveBeenCalledTimes(1)
      expect(capturedSourcePath).toContain('agents-md-baseline.md')
      expect(capturedDestPath).toContain('agents-md-baseline.md')
      expect(capturedSourcePath).toMatch(/templates[/\\]common[/\\]output-styles[/\\]zh-CN/)
    })
  })

  describe('setGlobalDefaultOutputStyle', () => {
    it('should set default output style in settings.json', () => {
      const existingSettings = { env: {} }
      mockJsonConfig.readJsonConfig.mockImplementation(() => existingSettings)
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})

      setGlobalDefaultOutputStyle('agents-md-baseline')

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        expect.objectContaining({
          outputStyle: 'agents-md-baseline',
        }),
      )
    })

    it('should preserve existing settings when setting default style', () => {
      const existingSettings = {
        env: { ANTHROPIC_API_KEY: 'test-key' },
        model: 'opus',
      }
      mockJsonConfig.readJsonConfig.mockImplementation(() => existingSettings)
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})

      setGlobalDefaultOutputStyle('engineer-professional')

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        expect.objectContaining({
          env: { ANTHROPIC_API_KEY: 'test-key' },
          model: 'opus',
          outputStyle: 'engineer-professional',
        }),
      )
    })
  })

  describe('hasLegacyPersonalityFiles', () => {
    it('should detect legacy personality files', () => {
      mockFsOperations.exists = vi.fn((path) => {
        return path.includes('personality.md')
          || path.includes('rules.md')
          || path.includes('technical-guides.md')
          || path.includes('mcp.md')
          || path.includes('language.md')
      })

      const hasLegacy = hasLegacyPersonalityFiles()
      expect(hasLegacy).toBe(true)
    })

    it('should return false when no legacy files exist', () => {
      mockFsOperations.exists.mockImplementation(() => false)

      const hasLegacy = hasLegacyPersonalityFiles()
      expect(hasLegacy).toBe(false)
    })
  })

  describe('cleanupLegacyPersonalityFiles', () => {
    it('should remove legacy personality files', () => {
      mockFsOperations.exists.mockImplementation(() => true)
      mockFsOperations.removeFile.mockImplementation(() => {})

      cleanupLegacyPersonalityFiles()

      expect(mockFsOperations.removeFile).toHaveBeenCalledWith(
        expect.stringContaining('personality.md'),
      )
      expect(mockFsOperations.removeFile).toHaveBeenCalledWith(
        expect.stringContaining('rules.md'),
      )
      expect(mockFsOperations.removeFile).toHaveBeenCalledWith(
        expect.stringContaining('technical-guides.md'),
      )
      expect(mockFsOperations.removeFile).toHaveBeenCalledWith(
        expect.stringContaining('mcp.md'),
      )
      expect(mockFsOperations.removeFile).toHaveBeenCalledWith(
        expect.stringContaining('language.md'),
      )
    })

    it('should only remove files that exist', () => {
      mockFsOperations.exists = vi.fn(path => path.includes('personality.md'))
      mockFsOperations.removeFile = vi.fn()

      cleanupLegacyPersonalityFiles()

      expect(mockFsOperations.removeFile).toHaveBeenCalledTimes(1)
      expect(mockFsOperations.removeFile).toHaveBeenCalledWith(
        expect.stringContaining('personality.md'),
      )
    })
  })

  describe('clearGlobalOutputStyle', () => {
    it('should remove outputStyle key from settings.json', () => {
      const existingSettings = {
        env: { ANTHROPIC_API_KEY: 'test-key' },
        outputStyle: 'agents-md-baseline',
      }
      mockJsonConfig.readJsonConfig.mockImplementation(() => existingSettings)
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})

      clearGlobalOutputStyle()

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        expect.objectContaining({
          env: { ANTHROPIC_API_KEY: 'test-key' },
        }),
      )
      // Verify outputStyle key is not present
      const writtenConfig = mockJsonConfig.writeJsonConfig.mock.calls[0][1]
      expect(writtenConfig).not.toHaveProperty('outputStyle')
    })

    it('should handle settings without existing outputStyle', () => {
      const existingSettings = { env: {} }
      mockJsonConfig.readJsonConfig.mockImplementation(() => existingSettings)
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})

      clearGlobalOutputStyle()

      const writtenConfig = mockJsonConfig.writeJsonConfig.mock.calls[0][1]
      expect(writtenConfig).not.toHaveProperty('outputStyle')
    })
  })

  describe('configureOutputStyle', () => {
    it('should configure output styles in interactive mode', async () => {
      // Mock no legacy files to avoid complex legacy handling
      mockFsOperations.exists = vi.fn((path) => {
        // Only return true for output-styles directory check, false for legacy files
        return path.includes('output-styles')
      })

      mockInquirer.default.prompt = vi.fn()
        .mockResolvedValueOnce({ selectedStyles: ['agents-md-baseline', 'engineer-professional'] })
        .mockResolvedValueOnce({ defaultStyle: 'agents-md-baseline' })
      Object.assign(mockInquirer.default, {
        prompt: mockInquirer.default.prompt,
        prompts: {},
        registerPrompt: vi.fn(),
        restoreDefaultPrompts: vi.fn(),
      })

      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockJsonConfig.readJsonConfig.mockReturnValue({})
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})
      mockCcjkConfig.updateCcjkConfig.mockImplementation(() => {})

      await configureOutputStyle()

      expect(mockInquirer.default.prompt).toHaveBeenCalledTimes(2)
      expect(mockFsOperations.copyFile).toHaveBeenCalledTimes(2)
      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalled()
      expect(mockCcjkConfig.updateCcjkConfig).toHaveBeenCalled()
    })

    it('should handle non-interactive mode with preselected styles', async () => {
      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockFsOperations.exists.mockImplementation(() => true)
      mockJsonConfig.readJsonConfig.mockImplementation(() => ({}))
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})
      mockCcjkConfig.updateCcjkConfig.mockImplementation(() => {})

      await configureOutputStyle(
        ['agents-md-baseline', 'default'], // preselectedStyles
        'agents-md-baseline', // preselectedDefault
      )

      expect(mockInquirer.default.prompt).not.toHaveBeenCalled()
      expect(mockFsOperations.copyFile).toHaveBeenCalledTimes(1) // Only custom styles
      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalled()
      expect(mockCcjkConfig.updateCcjkConfig).toHaveBeenCalled()
    })

    it('should detect and handle legacy files', async () => {
      mockFsOperations.exists = vi.fn((path) => {
        if (path.includes('personality.md'))
          return true
        return path.includes('output-styles')
      })
      mockFsOperations.removeFile.mockImplementation(() => {})
      mockInquirer.default.prompt = vi.fn()
        .mockResolvedValueOnce({ selectedStyles: ['agents-md-baseline'] })
        .mockResolvedValueOnce({ defaultStyle: 'agents-md-baseline' })
      Object.assign(mockInquirer.default, {
        prompt: mockInquirer.default.prompt,
        prompts: {},
        registerPrompt: vi.fn(),
        restoreDefaultPrompts: vi.fn(),
      })
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)

      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockJsonConfig.readJsonConfig.mockImplementation(() => ({}))
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})
      mockCcjkConfig.updateCcjkConfig.mockImplementation(() => {})

      await configureOutputStyle()

      expect(mockFsOperations.removeFile).toHaveBeenCalled()
      // Use i18n to get the translated message instead of hardcoding
      const { i18n } = await import('../../../src/i18n')
      expect(promptBoolean).toHaveBeenCalledWith(expect.objectContaining({
        message: i18n.t('configuration:cleanupLegacyFiles'),
        defaultValue: true,
      }))
    })

    it('should skip legacy cleanup if user declines', async () => {
      mockFsOperations.exists = vi.fn((path) => {
        if (path.includes('personality.md'))
          return true
        return path.includes('output-styles')
      })
      mockFsOperations.removeFile.mockImplementation(() => {})
      mockInquirer.default.prompt = vi.fn()
        .mockResolvedValueOnce({ selectedStyles: ['agents-md-baseline'] })
        .mockResolvedValueOnce({ defaultStyle: 'agents-md-baseline' })
      Object.assign(mockInquirer.default, {
        prompt: mockInquirer.default.prompt,
        prompts: {},
        registerPrompt: vi.fn(),
        restoreDefaultPrompts: vi.fn(),
      })
      vi.mocked(promptBoolean).mockResolvedValueOnce(false)

      mockFsOperations.ensureDir.mockImplementation(() => {})
      mockFsOperations.copyFile.mockImplementation(() => {})
      mockJsonConfig.readJsonConfig.mockImplementation(() => ({}))
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})
      mockCcjkConfig.updateCcjkConfig.mockImplementation(() => {})

      await configureOutputStyle()

      expect(mockFsOperations.removeFile).not.toHaveBeenCalled()
      expect(promptBoolean).toHaveBeenCalled()
    })

    it('should handle empty selection and choosing none (clear output style)', async () => {
      mockFsOperations.exists = vi.fn((path) => {
        return path.includes('output-styles')
      })

      mockInquirer.default.prompt = vi.fn()
        .mockResolvedValueOnce({ selectedStyles: [] }) // No custom styles selected
        .mockResolvedValueOnce({ defaultStyle: '__none__' }) // Choose "none"
      Object.assign(mockInquirer.default, {
        prompt: mockInquirer.default.prompt,
        prompts: {},
        registerPrompt: vi.fn(),
        restoreDefaultPrompts: vi.fn(),
      })

      mockJsonConfig.readJsonConfig.mockImplementation(() => ({ outputStyle: 'agents-md-baseline' }))
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})
      mockCcjkConfig.updateCcjkConfig.mockImplementation(() => {})

      await configureOutputStyle()

      // Should call prompt twice: checkbox for custom styles + list for built-in/none
      expect(mockInquirer.default.prompt).toHaveBeenCalledTimes(2)
      // Should clear outputStyle from settings
      const writtenConfig = mockJsonConfig.writeJsonConfig.mock.calls[0][1]
      expect(writtenConfig).not.toHaveProperty('outputStyle')
      // Should update ccjk config with empty styles and 'none' marker
      expect(mockCcjkConfig.updateCcjkConfig).toHaveBeenCalledWith({
        outputStyles: [],
        defaultOutputStyle: 'none',
      })
    })

    it('should handle empty selection and choosing a built-in style', async () => {
      mockFsOperations.exists = vi.fn((path) => {
        return path.includes('output-styles')
      })

      mockInquirer.default.prompt = vi.fn()
        .mockResolvedValueOnce({ selectedStyles: [] }) // No custom styles selected
        .mockResolvedValueOnce({ defaultStyle: 'explanatory' }) // Choose built-in style
      Object.assign(mockInquirer.default, {
        prompt: mockInquirer.default.prompt,
        prompts: {},
        registerPrompt: vi.fn(),
        restoreDefaultPrompts: vi.fn(),
      })

      mockJsonConfig.readJsonConfig.mockImplementation(() => ({}))
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})
      mockCcjkConfig.updateCcjkConfig.mockImplementation(() => {})

      await configureOutputStyle()

      // Should call prompt twice: checkbox for custom styles + list for built-in/none
      expect(mockInquirer.default.prompt).toHaveBeenCalledTimes(2)
      // Should set the built-in style as outputStyle
      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        expect.objectContaining({ outputStyle: 'explanatory' }),
      )
      // Should update ccjk config with empty styles but with default
      expect(mockCcjkConfig.updateCcjkConfig).toHaveBeenCalledWith({
        outputStyles: [],
        defaultOutputStyle: 'explanatory',
      })
      // Should NOT copy any files
      expect(mockFsOperations.copyFile).not.toHaveBeenCalled()
    })
  })
})
