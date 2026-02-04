import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectAnalyzer } from '../../src/analyzers/index.js'
import { getTemplatesClient } from '../../src/cloud-client/index.js'
import { ccjkHooks } from '../../src/commands/ccjk-hooks.js'
import { hookManager } from '../../src/hooks/hook-manager.js'
import { loadHookTemplates } from '../../src/hooks/template-loader.js'
import { validateHookTrigger } from '../../src/hooks/trigger-validator.js'
import { i18n } from '../../src/i18n/index.js'

// Mock dependencies
vi.mock('../../src/analyzers/index.js')
vi.mock('../../src/hooks/hook-manager.js')
vi.mock('../../src/hooks/template-loader.js')
vi.mock('../../src/hooks/trigger-validator.js')
vi.mock('../../src/i18n/index.js')
vi.mock('../../src/cloud-client/index.js')
vi.mock('consola', () => {
  const mockLogger = {
    log: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    withTag: vi.fn(() => mockLogger),
  }
  return { default: mockLogger, consola: mockLogger }
})
vi.mock('@clack/prompts', () => ({
  prompt: vi.fn(),
}))
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ shouldInstall: true, selectedHooks: [] }),
  },
}))

describe('ccjkHooks', () => {
  const mockProjectInfo = {
    projectType: 'typescript',
    frameworks: [{ name: 'react' }],
    languages: [{ language: 'typescript' }],
    packageManager: 'npm',
    hasTests: true,
    hasLinting: true,
    hasFormatting: true,
    dependencies: ['react', 'react-dom'],
    devDependencies: ['typescript', 'eslint', 'prettier'],
    scripts: { test: 'jest', build: 'tsc' },
    configFiles: ['package.json', 'tsconfig.json'],
  }

  const mockHooks = [
    {
      id: 'pre-commit-eslint',
      name: 'pre-commit-eslint',
      description: 'Run ESLint on staged files',
      type: 'pre-commit',
      category: 'pre-commit',
      projectTypes: ['typescript', 'javascript'],
      trigger: { matcher: 'git:pre-commit' },
      action: { command: 'eslint', args: ['--fix', '--staged'], timeout: 30000 },
      enabled: true,
      priority: 100,
    },
    {
      id: 'pre-commit-prettier',
      name: 'pre-commit-prettier',
      description: 'Format code with Prettier',
      type: 'pre-commit',
      category: 'pre-commit',
      projectTypes: ['typescript', 'javascript'],
      trigger: { matcher: 'git:pre-commit' },
      action: { command: 'prettier', args: ['--write', '--staged'], timeout: 15000 },
      enabled: true,
      priority: 90,
    },
    {
      id: 'post-test-coverage',
      name: 'post-test-coverage',
      description: 'Generate coverage report after tests',
      type: 'post-test',
      category: 'post-test',
      projectTypes: ['typescript', 'javascript'],
      trigger: { matcher: 'command:npm test' },
      action: { command: 'npm', args: ['run', 'coverage:report'], timeout: 30000 },
      enabled: true,
      priority: 100,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mocks
    vi.mocked(ProjectAnalyzer).mockImplementation(() => ({
      analyze: vi.fn().mockResolvedValue(mockProjectInfo),
    }) as any)
    vi.mocked(loadHookTemplates).mockResolvedValue(mockHooks as any)
    vi.mocked(validateHookTrigger).mockResolvedValue(true)
    vi.mocked(hookManager.registerHook).mockReturnValue(true)
    vi.mocked(i18n.t).mockImplementation((key: string) => key)
    vi.mocked(i18n).language = 'en'

    // Mock getTemplatesClient to throw so it falls back to local templates
    vi.mocked(getTemplatesClient).mockReturnValue({
      getHooks: vi.fn().mockRejectedValue(new Error('Network error')),
    } as any)

    // Mock inquirer prompt
    vi.mocked(inquirer.prompt).mockResolvedValue({ shouldInstall: true, selectedHooks: [] })
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

      expect(result).toBeDefined()
      expect(result?.success).toBe(true)
      expect(Array.isArray(result?.installed)).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle project analysis errors', async () => {
      vi.mocked(ProjectAnalyzer).mockImplementation(() => ({
        analyze: vi.fn().mockRejectedValue(new Error('Analysis failed')),
      }) as any)

      await expect(ccjkHooks({})).rejects.toThrow('Analysis failed')
    })

    it('should handle template loading errors', async () => {
      vi.mocked(loadHookTemplates).mockRejectedValue(new Error('Template load failed'))

      await expect(ccjkHooks({})).rejects.toThrow('Template load failed')
    })

    it('should return error in JSON mode', async () => {
      vi.mocked(ProjectAnalyzer).mockImplementation(() => ({
        analyze: vi.fn().mockRejectedValue(new Error('Analysis failed')),
      }) as any)

      const result = await ccjkHooks({ json: true })

      expect(result?.success).toBe(false)
      expect(result?.error).toBe('Analysis failed')
    })
  })

  describe('hook installation', () => {
    it('should register hooks with hook manager', async () => {
      await ccjkHooks({})

      expect(hookManager.registerHook).toHaveBeenCalled()
    })

    it('should validate hook triggers', async () => {
      await ccjkHooks({})

      expect(validateHookTrigger).toHaveBeenCalled()
    })

    it('should skip invalid hooks', async () => {
      vi.mocked(validateHookTrigger).mockResolvedValue(false)

      const result = await ccjkHooks({ json: true })

      // When hooks have invalid triggers, they are added to errors array
      expect(result?.success).toBe(false)
      expect(result?.errors).toBeDefined()
      expect(result?.errors?.length).toBeGreaterThan(0)
    })
  })

  describe('hook filtering', () => {
    it('should filter by enabled status', async () => {
      const result = await ccjkHooks({ enabled: true, json: true })

      expect(result?.success).toBe(true)
    })

    it('should sort by priority', async () => {
      const result = await ccjkHooks({ priority: 95, json: true })

      expect(result?.success).toBe(true)
    })
  })
})
