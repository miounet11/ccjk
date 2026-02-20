import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { InitOptions } from '../../src/commands/init'

/**
 * Tests for silent init mode
 * Verifies that --silent flag enables fully non-interactive initialization
 */
describe('init command - silent mode', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock environment variables
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-12345678901234567890'
  })

  afterEach(() => {
    // Restore mocks
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    delete process.env.ANTHROPIC_API_KEY
    vi.clearAllMocks()
  })

  it('should detect API key from ANTHROPIC_API_KEY environment variable', async () => {
    const { detectSmartDefaults } = await import('../../src/config/smart-defaults')
    const defaults = await detectSmartDefaults()

    expect(defaults.apiKey).toBe('sk-ant-test-key-12345678901234567890')
    expect(defaults.apiProvider).toBe('anthropic')
  })

  it('should detect API key from CLAUDE_API_KEY environment variable', async () => {
    delete process.env.ANTHROPIC_API_KEY
    process.env.CLAUDE_API_KEY = 'sk-ant-test-key-99999999999999999999'

    const { detectSmartDefaults } = await import('../../src/config/smart-defaults')
    const defaults = await detectSmartDefaults()

    expect(defaults.apiKey).toBe('sk-ant-test-key-99999999999999999999')
    expect(defaults.apiProvider).toBe('anthropic')

    delete process.env.CLAUDE_API_KEY
  })

  it('should auto-select top 3 MCP services based on platform', async () => {
    const { detectSmartDefaults } = await import('../../src/config/smart-defaults')
    const defaults = await detectSmartDefaults()

    expect(defaults.mcpServices).toBeDefined()
    expect(Array.isArray(defaults.mcpServices)).toBe(true)
    expect(defaults.mcpServices.length).toBeGreaterThanOrEqual(3)

    // Top 3 should include core services
    const top3 = defaults.mcpServices.slice(0, 3)
    expect(top3).toContain('context7')
  })

  it('should detect code tool type from filesystem', async () => {
    const { detectCodeToolType } = await import('../../src/config/smart-defaults')
    const codeToolType = detectCodeToolType()

    expect(codeToolType).toBeDefined()
    expect(['claude-code', 'codex']).toContain(codeToolType)
  })

  it('should throw error in silent mode without API key', async () => {
    delete process.env.ANTHROPIC_API_KEY

    const { silentInit } = await import('../../src/commands/init')
    const options: InitOptions = {
      silent: true,
    }

    await expect(silentInit(options)).rejects.toThrow(
      'Silent mode requires ANTHROPIC_API_KEY environment variable',
    )
  })

  it('should set skipPrompt and yes flags in silent mode', async () => {
    const { silentInit } = await import('../../src/commands/init')

    // Mock the init function to capture options
    const initMock = vi.fn()
    vi.doMock('../../src/commands/init', async () => {
      const actual = await vi.importActual('../../src/commands/init')
      return {
        ...actual,
        init: initMock,
      }
    })

    const options: InitOptions = {
      silent: true,
    }

    try {
      await silentInit(options)
    }
    catch {
      // Expected to fail due to mocking
    }

    // Verify options were set correctly
    expect(options.skipPrompt).toBe(true)
    expect(options.yes).toBe(true)
    expect(options.skipBanner).toBe(true)
  })

  it('should produce minimal console output in silent mode', async () => {
    const { silentInit } = await import('../../src/commands/init')

    // Mock init to prevent actual execution
    vi.doMock('../../src/commands/init', async () => {
      const actual = await vi.importActual('../../src/commands/init')
      return {
        ...actual,
        init: vi.fn().mockResolvedValue(undefined),
      }
    })

    const options: InitOptions = {
      silent: true,
    }

    try {
      await silentInit(options)
    }
    catch {
      // Expected to fail due to mocking
    }

    // Verify minimal output (should be less than 10 log calls)
    expect(consoleLogSpy.mock.calls.length).toBeLessThan(10)
  })

  it('should validate smart defaults', async () => {
    const { smartDefaults } = await import('../../src/config/smart-defaults')
    const defaults = await smartDefaults.detect()
    const validation = smartDefaults.validateDefaults(defaults)

    expect(validation).toHaveProperty('valid')
    expect(validation).toHaveProperty('issues')
    expect(Array.isArray(validation.issues)).toBe(true)
  })

  it('should handle platform-specific MCP service recommendations', async () => {
    const { SmartDefaultsDetector } = await import('../../src/config/smart-defaults')
    const detector = new SmartDefaultsDetector()

    // Test different platforms
    const darwinServices = detector.getRecommendedMcpServices('darwin')
    const linuxServices = detector.getRecommendedMcpServices('linux')

    expect(darwinServices).toBeDefined()
    expect(linuxServices).toBeDefined()
    expect(Array.isArray(darwinServices)).toBe(true)
    expect(Array.isArray(linuxServices)).toBe(true)

    // Both should include core services
    expect(darwinServices).toContain('context7')
    expect(linuxServices).toContain('context7')
  })
})
