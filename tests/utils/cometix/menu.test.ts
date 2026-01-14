import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showCometixMenu } from '../../../src/utils/cometix/menu'

// Mock all dependencies
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    ensureI18nInitialized: vi.fn(),
  }
})

vi.mock('../../../src/utils/error-handler', () => ({
  handleExitPromptError: vi.fn(),
  handleGeneralError: vi.fn(),
}))

vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

vi.mock('../../../src/utils/cometix/commands', () => ({
  runCometixPrintConfig: vi.fn(),
  runCometixTuiConfig: vi.fn(),
}))

vi.mock('../../../src/utils/cometix/installer', () => ({
  installCometixLine: vi.fn(),
}))

describe('cometix menu', () => {
  let consoleLogSpy: any
  let mockPrompt: any
  let mockPromptBoolean: any
  let mockInstallCometixLine: any
  let mockRunCometixPrintConfig: any
  let mockRunCometixTuiConfig: any
  let mockHandleExitPromptError: any
  let mockHandleGeneralError: any

  beforeEach(async () => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Import mocked modules
    mockPrompt = (await import('inquirer')).default.prompt
    const togglePrompt = await import('../../../src/utils/toggle-prompt')
    mockPromptBoolean = togglePrompt.promptBoolean
    const installer = await import('../../../src/utils/cometix/installer')
    mockInstallCometixLine = installer.installCometixLine
    const commands = await import('../../../src/utils/cometix/commands')
    mockRunCometixPrintConfig = commands.runCometixPrintConfig
    mockRunCometixTuiConfig = commands.runCometixTuiConfig
    const errorHandler = await import('../../../src/utils/error-handler')
    mockHandleExitPromptError = errorHandler.handleExitPromptError
    mockHandleGeneralError = errorHandler.handleGeneralError
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  describe('showCometixMenu', () => {
    it('should display menu and handle option 1 (install/update)', async () => {
      mockPrompt.mockResolvedValueOnce({ choice: '1' })
      mockPromptBoolean.mockResolvedValueOnce(false) // Don't continue

      const result = await showCometixMenu()

      expect(mockPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input',
          name: 'choice',
        }),
      )
      expect(mockInstallCometixLine).toHaveBeenCalled()
      expect(mockPromptBoolean).toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('should display menu and handle option 2 (print config)', async () => {
      mockPrompt.mockResolvedValueOnce({ choice: '2' })
      mockPromptBoolean.mockResolvedValueOnce(false) // Don't continue

      const result = await showCometixMenu()

      expect(mockRunCometixPrintConfig).toHaveBeenCalled()
      expect(mockPromptBoolean).toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('should display menu and handle option 3 (TUI config)', async () => {
      mockPrompt.mockResolvedValueOnce({ choice: '3' })
      mockPromptBoolean.mockResolvedValueOnce(false) // Don't continue

      const result = await showCometixMenu()

      expect(mockRunCometixTuiConfig).toHaveBeenCalled()
      expect(mockPromptBoolean).toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('should display menu and handle option 0 (back)', async () => {
      mockPrompt.mockResolvedValueOnce({ choice: '0' })

      const result = await showCometixMenu()

      expect(mockInstallCometixLine).not.toHaveBeenCalled()
      expect(mockRunCometixPrintConfig).not.toHaveBeenCalled()
      expect(mockRunCometixTuiConfig).not.toHaveBeenCalled()
      expect(mockPromptBoolean).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('should loop back to menu when user chooses to continue', async () => {
      mockPrompt
        .mockResolvedValueOnce({ choice: '1' }) // First choice
        .mockResolvedValueOnce({ choice: '0' }) // Second choice (back)
      mockPromptBoolean.mockResolvedValueOnce(true) // Continue in menu

      const result = await showCometixMenu()

      expect(mockInstallCometixLine).toHaveBeenCalledTimes(1)
      expect(mockPromptBoolean).toHaveBeenCalledTimes(1)
      expect(mockPrompt).toHaveBeenCalledTimes(2)
      expect(result).toBe(false)
    })

    it('should handle exit prompt error', async () => {
      const exitError = new Error('User force closed the prompt')
      mockPrompt.mockRejectedValueOnce(exitError)
      mockHandleExitPromptError.mockReturnValueOnce(true) // Indicate it was an exit error

      const result = await showCometixMenu()

      expect(mockHandleExitPromptError).toHaveBeenCalledWith(exitError)
      expect(mockHandleGeneralError).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('should handle general error', async () => {
      const generalError = new Error('Something went wrong')
      mockPrompt.mockRejectedValueOnce(generalError)
      mockHandleExitPromptError.mockReturnValueOnce(false) // Not an exit error

      const result = await showCometixMenu()

      expect(mockHandleExitPromptError).toHaveBeenCalledWith(generalError)
      expect(mockHandleGeneralError).toHaveBeenCalledWith(generalError)
      expect(result).toBe(false)
    })

    it('should validate menu choice correctly', async () => {
      let validateFn: any

      mockPrompt.mockImplementationOnce((questions: any) => {
        validateFn = questions.validate
        return Promise.resolve({ choice: '1' })
      })
      mockPromptBoolean.mockResolvedValueOnce(false)

      await showCometixMenu()

      // Test valid choices
      expect(await validateFn('1')).toBe(true)
      expect(await validateFn('2')).toBe(true)
      expect(await validateFn('3')).toBe(true)
      expect(await validateFn('0')).toBe(true)

      // Test invalid choice
      const invalidResult = await validateFn('5')
      expect(invalidResult).not.toBe(true) // Should return error message
    })

    it('should display menu title and options', async () => {
      mockPrompt.mockResolvedValueOnce({ choice: '0' })

      await showCometixMenu()

      // Verify console.log was called to display menu
      expect(consoleLogSpy).toHaveBeenCalled()
      // Check that menu formatting was displayed (borders, options, etc.)
      const calls = consoleLogSpy.mock.calls.map((call: any) => call[0])
      const output = calls.join('\n')
      expect(output).toContain('═') // Menu border
    })

    it('should handle error during install operation', async () => {
      const installError = new Error('Installation failed')
      mockPrompt.mockResolvedValueOnce({ choice: '1' })
      mockInstallCometixLine.mockRejectedValueOnce(installError)
      mockHandleExitPromptError.mockReturnValueOnce(false)

      const result = await showCometixMenu()

      expect(mockInstallCometixLine).toHaveBeenCalled()
      expect(mockHandleGeneralError).toHaveBeenCalledWith(installError)
      expect(result).toBe(false)
    })

    it('should handle error during print config operation', async () => {
      const printError = new Error('Print config failed')
      mockPrompt.mockResolvedValueOnce({ choice: '2' })
      mockRunCometixPrintConfig.mockRejectedValueOnce(printError)
      mockHandleExitPromptError.mockReturnValueOnce(false)

      const result = await showCometixMenu()

      expect(mockRunCometixPrintConfig).toHaveBeenCalled()
      expect(mockHandleGeneralError).toHaveBeenCalledWith(printError)
      expect(result).toBe(false)
    })

    it('should handle error during TUI config operation', async () => {
      const tuiError = new Error('TUI config failed')
      mockPrompt.mockResolvedValueOnce({ choice: '3' })
      mockRunCometixTuiConfig.mockRejectedValueOnce(tuiError)
      mockHandleExitPromptError.mockReturnValueOnce(false)

      const result = await showCometixMenu()

      expect(mockRunCometixTuiConfig).toHaveBeenCalled()
      expect(mockHandleGeneralError).toHaveBeenCalledWith(tuiError)
      expect(result).toBe(false)
    })
  })
})
