/**
 * Context analyzer tests
 */

import { describe, expect, it, vi } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import type { CcjkSkill } from '../../src/skills/types'
import { analyzeProjectContext, recommendSkillsForContext } from '../../src/skills/context-analyzer'

// Mock fs functions
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}))

describe('Context Analyzer', () => {
  const mockSkills: CcjkSkill[] = [
    {
      id: 'git-commit',
      name: { en: 'Git Commit', 'zh-CN': 'Git 提交' },
      description: { en: 'Smart commit', 'zh-CN': '智能提交' },
      category: 'git',
      triggers: ['/commit'],
      template: '# Git Commit',
      enabled: true,
      version: '1.0.0',
      tags: ['git'],
    },
    {
      id: 'ts-debug',
      name: { en: 'TypeScript Debug', 'zh-CN': 'TypeScript 调试' },
      description: { en: 'Debug TS', 'zh-CN': '调试 TS' },
      category: 'dev',
      triggers: ['/ts-debug'],
      template: '# TS Debug',
      enabled: true,
      version: '1.0.0',
      tags: ['typescript', 'debug'],
    },
    {
      id: 'write-tests',
      name: { en: 'Write Tests', 'zh-CN': '编写测试' },
      description: { en: 'Write tests', 'zh-CN': '编写测试' },
      category: 'testing',
      triggers: ['/test'],
      template: '# Tests',
      enabled: true,
      version: '1.0.0',
      tags: ['testing'],
    },
    {
      id: 'write-docs',
      name: { en: 'Write Docs', 'zh-CN': '编写文档' },
      description: { en: 'Write docs', 'zh-CN': '编写文档' },
      category: 'docs',
      triggers: ['/docs'],
      template: '# Docs',
      enabled: true,
      version: '1.0.0',
      tags: ['docs'],
    },
  ]

  describe('analyzeProjectContext', () => {
    it('should detect Git project', () => {
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return path.includes('.git')
      })
      vi.mocked(readdirSync).mockReturnValue([])

      const context = analyzeProjectContext('/test')
      expect(context.hasGit).toBe(true)
    })

    it('should detect TypeScript project', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(readdirSync).mockReturnValue(['index.ts', 'tsconfig.json'] as any)

      const context = analyzeProjectContext('/test')
      expect(context.languages).toContain('typescript')
    })

    it('should detect Python project', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(readdirSync).mockReturnValue(['main.py', 'requirements.txt'] as any)

      const context = analyzeProjectContext('/test')
      expect(context.languages).toContain('python')
    })

    it('should detect package manager', () => {
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return path.includes('pnpm-lock.yaml')
      })
      vi.mocked(readdirSync).mockReturnValue([])

      const context = analyzeProjectContext('/test')
      expect(context.packageManager).toBe('pnpm')
    })

    it('should detect test files', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(readdirSync).mockReturnValue(['index.test.ts', 'vitest.config.ts'] as any)

      const context = analyzeProjectContext('/test')
      expect(context.hasTests).toBe(true)
    })

    it('should detect documentation', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(readdirSync).mockReturnValue(['README.md', 'docs'] as any)

      const context = analyzeProjectContext('/test')
      expect(context.hasDocs).toBe(true)
    })

    it('should detect React framework', () => {
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return path.includes('package.json')
      })
      vi.mocked(readdirSync).mockReturnValue(['package.json'] as any)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        dependencies: { react: '^18.0.0' },
      }))

      const context = analyzeProjectContext('/test')
      expect(context.frameworks).toContain('react')
    })
  })

  describe('recommendSkillsForContext', () => {
    it('should recommend Git skills for Git projects', () => {
      const context = {
        hasGit: true,
        languages: [],
        frameworks: [],
        hasTests: false,
        hasDocs: false,
      }

      const recommended = recommendSkillsForContext(context, mockSkills)
      expect(recommended.some(s => s.id === 'git-commit')).toBe(true)
    })

    it('should recommend TypeScript skills for TS projects', () => {
      const context = {
        hasGit: false,
        languages: ['typescript'],
        frameworks: [],
        hasTests: false,
        hasDocs: false,
      }

      const recommended = recommendSkillsForContext(context, mockSkills)
      expect(recommended.some(s => s.id === 'ts-debug')).toBe(true)
    })

    it('should recommend testing skills for projects with tests', () => {
      const context = {
        hasGit: false,
        languages: [],
        frameworks: [],
        hasTests: true,
        hasDocs: false,
      }

      const recommended = recommendSkillsForContext(context, mockSkills)
      expect(recommended.some(s => s.id === 'write-tests')).toBe(true)
    })

    it('should recommend docs skills for projects without docs', () => {
      const context = {
        hasGit: false,
        languages: [],
        frameworks: [],
        hasTests: false,
        hasDocs: false,
      }

      const recommended = recommendSkillsForContext(context, mockSkills)
      expect(recommended.some(s => s.id === 'write-docs')).toBe(true)
    })

    it('should skip disabled skills', () => {
      const context = {
        hasGit: true,
        languages: [],
        frameworks: [],
        hasTests: false,
        hasDocs: false,
      }

      const disabledSkills = mockSkills.map(s => ({ ...s, enabled: false }))
      const recommended = recommendSkillsForContext(context, disabledSkills)
      expect(recommended).toEqual([])
    })
  })
})
