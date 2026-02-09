import { existsSync, readFileSync } from 'node:fs'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectSmartDefaults, needsApiKeyPrompt, smartDefaults, SmartDefaultsDetector } from '../../src/config/smart-defaults'

// Mock node:fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}))

// Mock node:os
vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}))

// Mock platform detection
vi.mock('../../src/utils/platform', () => ({
  getPlatform: vi.fn(() => 'linux'),
}))

describe('smartDefaultsDetector', () => {
  let detector: SmartDefaultsDetector
  const originalEnv = process.env

  beforeEach(() => {
    detector = new SmartDefaultsDetector()
    process.env = { ...originalEnv }
    vi.clearAllMocks()

    // Setup default mocks
    vi.mocked(existsSync).mockReturnValue(false)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('detect()', () => {
    it('should detect basic environment defaults', async () => {
      const defaults = await detector.detect()

      expect(defaults).toMatchObject({
        platform: 'linux',
        homeDir: '/mock/home',
        mcpServices: ['context7', 'mcp-deepwiki', 'open-websearch', 'sqlite'],
        skills: [
          'ccjk:git-commit',
          'ccjk:feat',
          'ccjk:workflow',
          'ccjk:init-project',
          'ccjk:git-worktree',
        ],
        agents: ['typescript-cli-architect', 'ccjk-testing-specialist'],
        workflows: {
          outputStyle: 'engineer-professional',
          gitWorkflow: 'conventional-commits',
          sixStepWorkflow: true,
        },
        tools: {
          ccr: false,
          cometix: false,
          ccusage: false,
        },
      })
    })

    it('should detect API key from environment variables', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test123'

      const defaults = await detector.detect()

      expect(defaults.apiKey).toBe('sk-ant-test123')
      expect(defaults.apiProvider).toBe('anthropic')
    })

    it('should detect API key from Claude Code config', async () => {
      // Clear env vars so config file detection is tested
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.CLAUDE_API_KEY
      delete process.env.API_KEY

      vi.mocked(existsSync).mockImplementation((path) => {
        return path === join('/mock/home', '.config', 'claude', 'config.json')
      })
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        apiKey: 'sk-ant-config123',
      }))

      const defaults = await detector.detect()

      expect(defaults.apiKey).toBe('sk-ant-config123')
      expect(defaults.apiProvider).toBe('anthropic')
    })

    it('should detect code tool type from ~/.claude', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === join('/mock/home', '.claude')
      })

      const defaults = await detector.detect()

      expect(defaults.codeToolType).toBe('claude-code')
    })

    it('should detect code tool type from ~/.config/claude', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === join('/mock/home', '.config', 'claude')
      })

      const defaults = await detector.detect()

      expect(defaults.codeToolType).toBe('claude-code')
    })

    it('should detect installed tools', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === join('/mock/home', '.local', 'bin', 'ccr')
          || path === join('/mock/home', '.local', 'bin', 'cometix')
          || path === join('/mock/home', '.local', 'bin', 'ccusage')
      })

      const defaults = await detector.detect()

      expect(defaults.tools.ccr).toBe(true)
      expect(defaults.tools.cometix).toBe(true)
      expect(defaults.tools.ccusage).toBe(true)
    })
  })

  describe('getRecommendedMcpServices()', () => {
    it('should return core services for unknown platform', () => {
      const services = detector.getRecommendedMcpServices('unknown')
      expect(services).toEqual(['context7', 'mcp-deepwiki', 'open-websearch'])
    })

    it('should return platform-specific services for macOS', () => {
      const services = detector.getRecommendedMcpServices('darwin')
      expect(services).toEqual(['context7', 'mcp-deepwiki', 'open-websearch', 'Playwright', 'sqlite'])
    })

    it('should return platform-specific services for Linux', () => {
      const services = detector.getRecommendedMcpServices('linux')
      expect(services).toEqual(['context7', 'mcp-deepwiki', 'open-websearch', 'sqlite'])
    })

    it('should return platform-specific services for Windows', () => {
      const services = detector.getRecommendedMcpServices('win32')
      expect(services).toEqual(['context7', 'mcp-deepwiki', 'open-websearch', 'Playwright', 'sqlite'])
    })
  })

  describe('getRecommendedSkills()', () => {
    it('should return beginner skills', () => {
      const skills = detector.getRecommendedSkills('beginner')
      expect(skills).toEqual([
        'ccjk:git-commit',
        'ccjk:init-project',
        'ccjk:workflow',
      ])
    })

    it('should return intermediate skills', () => {
      const skills = detector.getRecommendedSkills('intermediate')
      expect(skills).toEqual([
        'ccjk:git-commit',
        'ccjk:init-project',
        'ccjk:feat',
        'ccjk:workflow',
        'ccjk:git-worktree',
      ])
    })

    it('should return advanced skills', () => {
      const skills = detector.getRecommendedSkills('advanced')
      expect(skills).toEqual([
        'ccjk:git-commit',
        'ccjk:init-project',
        'ccjk:feat',
        'ccjk:workflow',
        'ccjk:git-worktree',
        'ccjk:git-rollback',
        'ccjk:git-cleanBranches',
      ])
    })

    it('should default to intermediate skills', () => {
      const skills = detector.getRecommendedSkills()
      expect(skills).toEqual([
        'ccjk:git-commit',
        'ccjk:init-project',
        'ccjk:feat',
        'ccjk:workflow',
        'ccjk:git-worktree',
      ])
    })
  })

  describe('validateDefaults()', () => {
    it('should validate correct defaults', () => {
      const defaults = {
        platform: 'linux',
        homeDir: '/mock/home',
        apiKey: 'sk-ant-test123',
        apiProvider: 'anthropic',
        mcpServices: ['filesystem'],
        skills: ['ccjk:git-commit'],
        agents: ['typescript-cli-architect'],
        codeToolType: 'claude-code',
        workflows: {
          outputStyle: 'engineer-professional',
          gitWorkflow: 'conventional-commits',
          sixStepWorkflow: true,
        },
        tools: {
          ccr: false,
          cometix: false,
          ccusage: false,
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)

      const result = detector.validateDefaults(defaults)

      expect(result.valid).toBe(true)
      expect(result.issues).toEqual([])
    })

    it('should detect invalid API key format', () => {
      const defaults = {
        platform: 'linux',
        homeDir: '/mock/home',
        apiKey: 'invalid-key',
        apiProvider: 'anthropic',
        mcpServices: ['filesystem'],
        skills: ['ccjk:git-commit'],
        agents: ['typescript-cli-architect'],
        codeToolType: 'claude-code',
        workflows: {
          outputStyle: 'engineer-professional',
          gitWorkflow: 'conventional-commits',
          sixStepWorkflow: true,
        },
        tools: {
          ccr: false,
          cometix: false,
          ccusage: false,
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)

      const result = detector.validateDefaults(defaults)

      expect(result.valid).toBe(false)
      expect(result.issues).toContain('API key format appears invalid (should start with sk-ant-)')
    })

    it('should detect unsupported platform', () => {
      const defaults = {
        platform: 'unsupported',
        homeDir: '/mock/home',
        apiKey: 'sk-ant-test123',
        apiProvider: 'anthropic',
        mcpServices: ['filesystem'],
        skills: ['ccjk:git-commit'],
        agents: ['typescript-cli-architect'],
        codeToolType: 'claude-code',
        workflows: {
          outputStyle: 'engineer-professional',
          gitWorkflow: 'conventional-commits',
          sixStepWorkflow: true,
        },
        tools: {
          ccr: false,
          cometix: false,
          ccusage: false,
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)

      const result = detector.validateDefaults(defaults)

      expect(result.valid).toBe(false)
      expect(result.issues).toContain('Platform unsupported may not be fully supported')
    })

    it('should detect inaccessible home directory', () => {
      const defaults = {
        platform: 'linux',
        homeDir: '/mock/home',
        apiKey: 'sk-ant-test123',
        apiProvider: 'anthropic',
        mcpServices: ['filesystem'],
        skills: ['ccjk:git-commit'],
        agents: ['typescript-cli-architect'],
        codeToolType: 'claude-code',
        workflows: {
          outputStyle: 'engineer-professional',
          gitWorkflow: 'conventional-commits',
          sixStepWorkflow: true,
        },
        tools: {
          ccr: false,
          cometix: false,
          ccusage: false,
        },
      }

      vi.mocked(existsSync).mockReturnValue(false)

      const result = detector.validateDefaults(defaults)

      expect(result.valid).toBe(false)
      expect(result.issues).toContain('Home directory is not accessible')
    })
  })
})

describe('smart-defaults', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    // Clear environment variables
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENROUTER_API_KEY
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('detectSmartDefaults', () => {
    it('should return enhanced default values when no API key is detected', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const defaults = await detectSmartDefaults()

      expect(defaults).toMatchObject({
        platform: 'linux',
        homeDir: '/mock/home',
        mcpServices: ['context7', 'mcp-deepwiki', 'open-websearch', 'sqlite'],
        skills: [
          'ccjk:git-commit',
          'ccjk:feat',
          'ccjk:workflow',
          'ccjk:init-project',
          'ccjk:git-worktree',
        ],
        agents: ['typescript-cli-architect', 'ccjk-testing-specialist'],
        codeToolType: 'claude-code',
        workflows: {
          outputStyle: 'engineer-professional',
          gitWorkflow: 'conventional-commits',
          sixStepWorkflow: true,
        },
        tools: {
          ccr: false,
          cometix: false,
          ccusage: false,
        },
      })
    })

    it('should detect ANTHROPIC_API_KEY from environment', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
      vi.mocked(existsSync).mockReturnValue(false)

      const defaults = await detectSmartDefaults()

      expect(defaults.apiProvider).toBe('anthropic')
      expect(defaults.apiKey).toBe('sk-ant-test-key')
    })

    it('should read API key from existing Claude Code config', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === join('/mock/home', '.config', 'claude', 'config.json')
      })
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ apiKey: 'sk-ant-config-key' }))

      const defaults = await detectSmartDefaults()

      expect(defaults.apiProvider).toBe('anthropic')
      expect(defaults.apiKey).toBe('sk-ant-config-key')
    })

    it('should prioritize environment variable over config file', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-env-key'
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === join('/mock/home', '.config', 'claude', 'config.json')
      })
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ apiKey: 'sk-ant-config-key' }))

      const defaults = await detectSmartDefaults()

      expect(defaults.apiProvider).toBe('anthropic')
      expect(defaults.apiKey).toBe('sk-ant-env-key')
    })

    it('should handle invalid JSON in config file gracefully', async () => {
      // Clear env vars so only config file is tested
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.CLAUDE_API_KEY
      delete process.env.API_KEY

      vi.mocked(existsSync).mockImplementation((path) => {
        return path === join('/mock/home', '.config', 'claude', 'config.json')
      })
      vi.mocked(readFileSync).mockReturnValue('invalid json')

      const defaults = await detectSmartDefaults()

      expect(defaults.apiProvider).toBeUndefined() // No key means no provider
      expect(defaults.apiKey).toBeUndefined()
    })

    it('should detect claude-code as code tool type when ~/.claude exists', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === join('/mock/home', '.claude')
      })

      const defaults = await detectSmartDefaults()

      expect(defaults.codeToolType).toBe('claude-code')
    })

    it('should detect codex as code tool type when .codex exists', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        return path === join('/mock/home', '.codex')
      })

      const defaults = await detectSmartDefaults()

      expect(defaults.codeToolType).toBe('codex')
    })

    it('should default to claude-code when no tool is detected', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const defaults = await detectSmartDefaults()

      expect(defaults.codeToolType).toBe('claude-code')
    })
  })

  describe('needsApiKeyPrompt', () => {
    it('should return true when no API provider is set', () => {
      const defaults = {
        platform: 'linux',
        homeDir: '/mock/home',
        mcpServices: [],
        skills: [],
        agents: [],
        codeToolType: 'claude-code',
        workflows: {
          outputStyle: 'engineer-professional',
          gitWorkflow: 'conventional-commits',
          sixStepWorkflow: true,
        },
        tools: {
          ccr: false,
          cometix: false,
          ccusage: false,
        },
      }

      expect(needsApiKeyPrompt(defaults)).toBe(true)
    })

    it('should return true when API provider is set but no key', () => {
      const defaults = {
        platform: 'linux',
        homeDir: '/mock/home',
        apiProvider: 'anthropic',
        mcpServices: [],
        skills: [],
        agents: [],
        codeToolType: 'claude-code',
        workflows: {
          outputStyle: 'engineer-professional',
          gitWorkflow: 'conventional-commits',
          sixStepWorkflow: true,
        },
        tools: {
          ccr: false,
          cometix: false,
          ccusage: false,
        },
      }

      expect(needsApiKeyPrompt(defaults)).toBe(true)
    })

    it('should return false when both provider and key are set', () => {
      const defaults = {
        platform: 'linux',
        homeDir: '/mock/home',
        apiProvider: 'anthropic',
        apiKey: 'sk-ant-test-key',
        mcpServices: [],
        skills: [],
        agents: [],
        codeToolType: 'claude-code',
        workflows: {
          outputStyle: 'engineer-professional',
          gitWorkflow: 'conventional-commits',
          sixStepWorkflow: true,
        },
        tools: {
          ccr: false,
          cometix: false,
          ccusage: false,
        },
      }

      expect(needsApiKeyPrompt(defaults)).toBe(false)
    })
  })

  describe('smartDefaults singleton', () => {
    it('should be an instance of SmartDefaultsDetector', () => {
      expect(smartDefaults).toBeInstanceOf(SmartDefaultsDetector)
    })

    it('should provide the same interface as the class', async () => {
      expect(typeof smartDefaults.detect).toBe('function')
      expect(typeof smartDefaults.validateDefaults).toBe('function')
      expect(typeof smartDefaults.getRecommendedMcpServices).toBe('function')
      expect(typeof smartDefaults.getRecommendedSkills).toBe('function')
    })
  })
})
