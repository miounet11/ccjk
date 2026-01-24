import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ccjkHooks } from '../../src/commands/ccjk-hooks.js'
import { ProjectAnalyzer } from '../../src/analyzers/index.js'
import { hookManager } from '../../src/hooks/hook-manager.js'
import { loadHookTemplates } from '../../src/hooks/template-loader.js'
import { getCloudRecommendedHooks } from '../../src/cloud-client/hook-recommendations.js'
import { validateHookTrigger } from '../../src/hooks/trigger-validator.js'
import { i18n } from '../../src/i18n/index.js'

// Mock dependencies
vi.mock('../../src/analyzers/index.js')
vi.mock('../../src/hooks/hook-manager.js')
vi.mock('../../src/hooks/template-loader.js')
vi.mock('../../src/cloud-client/hook-recommendations.js')
vi.mock('../../src/hooks/trigger-validator.js')
vi.mock('../../src/i18n/index.js')
vi.mock('consola', () => ({
  default: {
    log: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))
vi.mock('@clack/prompts', () => ({
  prompt: vi.fn()
}))

describe('ccjkHooks', () => {
  const mockProjectInfo = {
    type: 'typescript',
    framework: 'react',
    packageManager: 'npm',
    hasTests: true,
    hasLinting: true,
    hasFormatting: true,
    dependencies: ['react', 'react-dom'],
    devDependencies: ['typescript', 'eslint', 'prettier'],
    scripts: { test: 'jest', build: 'tsc' },
    configFiles: ['package.json', 'tsconfig.json']
  }

  const mockHooks = [
    {
      name: 'pre-commit-eslint',
      description: 'Run ESLint on staged files',
      type: 'pre-commit',
      category: 'pre-commit',
      projectTypes: ['typescript', 'javascript'],
      trigger: { matcher: 'git:pre-commit' },
      action: { command: 'eslint', args: ['--fix', '--staged'], timeout: 30000 },
      enabled: true,
      priority: 100
    },
    {
      name: 'pre-commit-prettier',
      description: 'Format code with Prettier',
      type: 'pre-commit',
      category: 'pre-commit',
      projectTypes: ['typescript', 'javascript'],
      trigger: { matcher: 'git:pre-commit' },
      action: { command: 'prettier', args: ['--write', '--staged'], timeout: 15000 },
      enabled: true,
      priority: 90
    },
    {
      name: 'post-test-coverage',
      description: 'Generate coverage report after tests',
      type: 'post-test',
      category: 'post-test',
      projectTypes: ['typescript', 'javascript'],
      trigger: { matcher: 'command:npm test' },
      action: { command: 'npm', args: ['run', 'coverage:report'], timeout: 30000 },
      enabled: true,
      priority: 100
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mocks
    vi.mocked(ProjectAnalyzer).prototype.analyze = vi.fn().mockResolvedValue(mockProjectInfo)
    vi.mocked(loadHookTemplates).mockResolvedValue(mockHooks)
    vi.mocked(getCloudRecommendedHooks).mockResolvedValue([])
    vi.mocked(validateHookTrigger).mockResolvedValue(true)
    vi.mocked(hookManager.registerHook).mockReturnValue(true)
    vi.mocked(i18n.t).mockImplementation((key: string) => key)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('basic functionality', () => {
    it('should analyze project and install recommended hooks', async () => {
      const result = await ccjkHooks({})

      expect(ProjectAnalyzer).toHaveBeenCalled()
      expect(loadHookTemplates).toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('should filter hooks by type', async () => {
      const result = await ccjkHooks({ type: 'pre-commit' })

      expect(loadHookTemplates).toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('should filter hooks by category', async () => {
      const result = await ccjkHooks({ category: 'pre-commit' })

      expect(loadHookTemplates).toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('should exclude specified hooks', async () => {
      const result = await ccjkHooks({ exclude: ['pre-commit-prettier'] })

      expect(loadHookTemplates).toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('should support dry-run mode', async () => {
      const result = await ccjkHooks({ dryRun: true })

      expect(hookManager.registerHook).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('should support JSON output', async () => {
      const result = await ccjkHooks({ json: true })

      expect(result).toEqual({
        success: true,
        installed: ['pre-commit-eslint', 'pre-commit-prettier', 'post-test-coverage'],
        errors: [],
        duration: expect.any(Number),
        hooks: [
          { name: 'pre-commit-eslint', status: 'installed' },
          { name: 'pre-commit-prettier', status: 'installed' },
          { name: 'post-test-coverage', status: 'installed' }
        ]
      })
    })
  })

  describe('error handling', () => {
    it('should handle project analysis failure', async () => {
      vi.mocked(ProjectAnalyzer).prototype.analyze = vi.fn().mockRejectedValue(new Error('Analysis failed'))

      await expect(ccjkHooks({ json: true })).resolves.toEqual({
        success: false,
        error: 'Analysis failed',
        hooks: []
      })
    })

    it('should handle no hooks found', async () => {
      vi.mocked(loadHookTemplates).mockResolvedValue([])

      const result = await ccjkHooks({ json: true })

      expect(result).toEqual({
        success: true,
        hooks: [],
        message: 'No hooks found matching criteria'
      })
    })

    it('should handle hook validation failure', async () => {
      vi.mocked(validateHookTrigger).mockResolvedValue(false)

      const result = await ccjkHooks({ json: true })

      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(3)
    })

    it('should handle hook registration failure', async () => {
      vi.mocked(hookManager.registerHook).mockReturnValue(false)

      const result = await ccjkHooks({ json: true })

      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(3)
    })
  })

  describe('cloud recommendations', () => {
    it('should use cloud recommendations when available', async () => {
      const cloudHooks = [
        {
          name: 'cloud-security-scan',
          description: 'Cloud security scan',
          type: 'pre-commit',
          category: 'pre-commit',
          projectTypes: ['typescript', 'javascript'],
          trigger: { matcher: 'git:pre-commit' },
          action: { command: 'ccjk-cloud', args: ['scan', 'security'], timeout: 30000 },
          enabled: true,
          priority: 200
        }
      ]

      vi.mocked(getCloudRecommendedHooks).mockResolvedValue(cloudHooks)

      const result = await ccjkHooks({ json: true })

      expect(getCloudRecommendedHooks).toHaveBeenCalledWith(mockProjectInfo)
      expect(result.installed).toContain('cloud-security-scan')
    })

    it('should fallback to local templates when cloud fails', async () => {
      vi.mocked(getCloudRecommendedHooks).mockRejectedValue(new Error('Cloud unavailable'))

      const result = await ccjkHooks({ json: true })

      expect(loadHookTemplates).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })
  })

  describe('interactive mode', () => {
    it('should prompt for confirmation in interactive mode', async () => {
      const mockPrompt = vi.fn().mockResolvedValue(true)
      vi.mocked(require('@clack/prompts').prompt).mockImplementation(mockPrompt)

      await ccjkHooks({})

      expect(mockPrompt).toHaveBeenCalledWith({
        type: 'confirm',
        message: 'hooks.installPrompt',
        initial: true
      })
    })

    it('should skip installation if user declines', async () => {
      const mockPrompt = vi.fn().mockResolvedValue(false)
      vi.mocked(require('@clack/prompts').prompt).mockImplementation(mockPrompt)

      await ccjkHooks({})

      expect(hookManager.registerHook).not.toHaveBeenCalled()
    })
  })

  describe('hook filtering', () => {
    it('should filter by enabled status', async () => {
      const result = await ccjkHooks({ enabled: true, json: true })

      expect(result.installed).toHaveLength(3)
    })

    it('should sort by priority', async () => {
      const result = await ccjkHooks({ priority: 95, json: true })

      expect(result.installed).toContain('pre-commit-eslint')
      expect(result.installed).toContain('post-test-coverage')
    })
  })
})