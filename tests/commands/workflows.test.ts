import { beforeEach, describe, expect, it, vi } from 'vitest'
import { manageWorkflows, showWorkflows } from '../../src/commands/workflows'

// Mock dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../src/commands/update', () => ({
  update: vi.fn(),
}))

describe('workflows command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('showWorkflows', () => {
    it('should display empty state when no workflows installed', async () => {
      const { existsSync } = await import('node:fs')
      vi.mocked(existsSync).mockReturnValue(false)

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await showWorkflows()

      expect(consoleSpy).toHaveBeenCalled()
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      expect(output).toContain('工作流管理')
      expect(output).toContain('未安装任何工作流')

      consoleSpy.mockRestore()
    })

    it('should display installed workflows with metadata', async () => {
      const { existsSync, readdirSync } = await import('node:fs')
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readdirSync).mockReturnValue([
        { name: 'workflow.md', isDirectory: () => false } as any,
        { name: 'feat.md', isDirectory: () => false } as any,
        { name: 'git-commit.md', isDirectory: () => false } as any,
      ])

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await showWorkflows()

      expect(consoleSpy).toHaveBeenCalled()
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      expect(output).toContain('已安装工作流')
      expect(output).toContain('/workflow')
      expect(output).toContain('/feat')
      expect(output).toContain('/git-commit')

      consoleSpy.mockRestore()
    })

    it('should handle nested workflow directories', async () => {
      const { existsSync, readdirSync } = await import('node:fs')
      vi.mocked(existsSync).mockReturnValue(true)

      // Mock directory structure with nested folders
      vi.mocked(readdirSync).mockImplementation((path: any) => {
        if (path.includes('git')) {
          return [
            { name: 'commit.md', isDirectory: () => false } as any,
            { name: 'rollback.md', isDirectory: () => false } as any,
          ]
        }
        return [
          { name: 'git', isDirectory: () => true } as any,
          { name: 'workflow.md', isDirectory: () => false } as any,
        ]
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await showWorkflows()

      expect(consoleSpy).toHaveBeenCalled()
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      expect(output).toContain('/git:commit')
      expect(output).toContain('/git:rollback')

      consoleSpy.mockRestore()
    })

    it('should display workflow tags correctly', async () => {
      const { existsSync, readdirSync } = await import('node:fs')
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readdirSync).mockReturnValue([
        { name: 'workflow.md', isDirectory: () => false } as any,
        { name: 'git-commit.md', isDirectory: () => false } as any,
      ])

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await showWorkflows()

      expect(consoleSpy).toHaveBeenCalled()
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      // workflow has '推荐' and '核心' tags
      // git-commit has '热门' and 'Git' tags
      expect(output).toMatch(/推荐|热门|核心|Git/)

      consoleSpy.mockRestore()
    })

    it('should handle file system errors gracefully', async () => {
      const { existsSync, readdirSync } = await import('node:fs')
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readdirSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await showWorkflows()

      // Should not throw, should display empty state
      expect(consoleSpy).toHaveBeenCalled()
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      expect(output).toContain('工作流管理')

      consoleSpy.mockRestore()
    })
  })

  describe('manageWorkflows', () => {
    it('should show workflows and return on back action', async () => {
      const { existsSync } = await import('node:fs')
      const inquirer = await import('inquirer')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(inquirer.default.prompt).mockResolvedValue({ action: 'back' })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await manageWorkflows()

      expect(inquirer.default.prompt).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should call update command when update action selected', async () => {
      const { existsSync } = await import('node:fs')
      const inquirer = await import('inquirer')
      const { update } = await import('../../src/commands/update')

      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(inquirer.default.prompt).mockResolvedValue({ action: 'update' })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await manageWorkflows()

      expect(update).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should display workflow content when view action selected', async () => {
      const { existsSync, readdirSync, readFileSync } = await import('node:fs')
      const inquirer = await import('inquirer')

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readdirSync).mockReturnValue([
        { name: 'workflow.md', isDirectory: () => false } as any,
      ])
      vi.mocked(readFileSync).mockReturnValue('# Workflow Content\n\nThis is a test workflow.')

      vi.mocked(inquirer.default.prompt)
        .mockResolvedValueOnce({ action: 'view' })
        .mockResolvedValueOnce({ selected: '/home/user/.claude/commands/workflow.md' })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await manageWorkflows()

      expect(readFileSync).toHaveBeenCalled()
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      expect(output).toContain('Workflow Content')

      consoleSpy.mockRestore()
    })

    it('should truncate long workflow content', async () => {
      const { existsSync, readdirSync, readFileSync } = await import('node:fs')
      const inquirer = await import('inquirer')

      const longContent = 'x'.repeat(2000)
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readdirSync).mockReturnValue([
        { name: 'workflow.md', isDirectory: () => false } as any,
      ])
      vi.mocked(readFileSync).mockReturnValue(longContent)

      vi.mocked(inquirer.default.prompt)
        .mockResolvedValueOnce({ action: 'view' })
        .mockResolvedValueOnce({ selected: '/home/user/.claude/commands/workflow.md' })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await manageWorkflows()

      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      expect(output).toContain('内容已截断')

      consoleSpy.mockRestore()
    })

    it('should handle missing workflow file gracefully', async () => {
      const { existsSync, readdirSync } = await import('node:fs')
      const inquirer = await import('inquirer')

      vi.mocked(existsSync)
        .mockReturnValueOnce(true) // commands dir exists
        .mockReturnValueOnce(false) // selected file doesn't exist

      vi.mocked(readdirSync).mockReturnValue([
        { name: 'workflow.md', isDirectory: () => false } as any,
      ])

      vi.mocked(inquirer.default.prompt)
        .mockResolvedValueOnce({ action: 'view' })
        .mockResolvedValueOnce({ selected: '/home/user/.claude/commands/workflow.md' })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await manageWorkflows()

      // Should not throw error
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
