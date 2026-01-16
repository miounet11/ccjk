/**
 * Tests for Zero-Config Skill Loader
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
}))

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}))

describe('zero-config/skill-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.DEBUG
  })

  describe('loadSkill', () => {
    it('should successfully load an installed skill', async () => {
      const fs = await import('node:fs')

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        name: 'agent-browser',
        version: '1.0.0',
      }))

      const { loadSkill } = await import('../../../src/utils/zero-config/skill-loader')
      const result = await loadSkill('agent-browser')

      expect(result.success).toBe(true)
      expect(result.skill).toBe('agent-browser')
      expect(result.error).toBeUndefined()
    })

    it('should fail if skill not installed', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const { loadSkill } = await import('../../../src/utils/zero-config/skill-loader')
      const result = await loadSkill('missing-skill')

      expect(result.success).toBe(false)
      expect(result.skill).toBe('missing-skill')
      expect(result.error).toBe('Skill not installed')
    })

    it('should fail if skill.json is invalid', async () => {
      const fs = await import('node:fs')

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        // Missing required fields
        description: 'Test skill',
      }))

      const { loadSkill } = await import('../../../src/utils/zero-config/skill-loader')
      const result = await loadSkill('invalid-skill')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid skill.json format')
    })

    it('should handle JSON parse errors', async () => {
      const fs = await import('node:fs')

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json{')

      const { loadSkill } = await import('../../../src/utils/zero-config/skill-loader')
      const result = await loadSkill('corrupt-skill')

      expect(result.success).toBe(false)
      expect(result.error).toContain('JSON')
    })
  })

  describe('loadCoreSkills', () => {
    it('should load all core skills successfully', async () => {
      const fs = await import('node:fs')

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        const skillName = pathStr.split('/').slice(-2, -1)[0]
        return JSON.stringify({
          name: skillName,
          version: '1.0.0',
        })
      })

      const { loadCoreSkills } = await import('../../../src/utils/zero-config/skill-loader')
      const results = await loadCoreSkills('zh-CN')

      expect(results).toHaveLength(5)
      expect(results.every(r => r.success)).toBe(true)
      expect(results.map(r => r.skill)).toEqual([
        'agent-browser',
        'tdd',
        'debugging',
        'code-review',
        'git-worktrees',
      ])
    })

    it('should handle mixed success/failure', async () => {
      const fs = await import('node:fs')

      // Only agent-browser and tdd exist
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        return pathStr.includes('agent-browser') || pathStr.includes('tdd')
      })

      vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        const skillName = pathStr.split('/').slice(-2, -1)[0]
        return JSON.stringify({
          name: skillName,
          version: '1.0.0',
        })
      })

      const { loadCoreSkills } = await import('../../../src/utils/zero-config/skill-loader')
      const results = await loadCoreSkills('en')

      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      expect(successful).toHaveLength(2)
      expect(failed).toHaveLength(3)
      expect(successful.map(r => r.skill)).toEqual(['agent-browser', 'tdd'])
      expect(failed.every(r => r.error === 'Skill not installed')).toBe(true)
    })

    it('should log results in DEBUG mode', async () => {
      process.env.DEBUG = '1'
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        const skillName = pathStr.split('/').slice(-2, -1)[0]
        return JSON.stringify({
          name: skillName,
          version: '1.0.0',
        })
      })

      const { loadCoreSkills } = await import('../../../src/utils/zero-config/skill-loader')
      await loadCoreSkills('zh-CN')

      expect(consoleLogSpy).toHaveBeenCalled()
      consoleLogSpy.mockRestore()
    })
  })

  describe('getCoreSkillsStatus', () => {
    it('should return status for all core skills', async () => {
      const fs = await import('node:fs')

      // Only agent-browser and debugging installed
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        return pathStr.includes('agent-browser') || pathStr.includes('debugging')
      })

      const { getCoreSkillsStatus } = await import('../../../src/utils/zero-config/skill-loader')
      const status = getCoreSkillsStatus()

      expect(status['agent-browser']).toBe(true)
      expect(status.tdd).toBe(false)
      expect(status.debugging).toBe(true)
      expect(status['code-review']).toBe(false)
      expect(status['git-worktrees']).toBe(false)
    })

    it('should return all false when nothing installed', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const { getCoreSkillsStatus } = await import('../../../src/utils/zero-config/skill-loader')
      const status = getCoreSkillsStatus()

      expect(Object.values(status).every(v => v === false)).toBe(true)
    })

    it('should return all true when fully installed', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const { getCoreSkillsStatus } = await import('../../../src/utils/zero-config/skill-loader')
      const status = getCoreSkillsStatus()

      expect(Object.values(status).every(v => v === true)).toBe(true)
    })
  })

  describe('areAllCoreSkillsInstalled', () => {
    it('should return true when all skills installed', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const { areAllCoreSkillsInstalled } = await import('../../../src/utils/zero-config/skill-loader')
      const result = areAllCoreSkillsInstalled()

      expect(result).toBe(true)
    })

    it('should return false when any skill missing', async () => {
      const fs = await import('node:fs')

      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        // All exist except git-worktrees
        return !path.includes('git-worktrees')
      })

      const { areAllCoreSkillsInstalled } = await import('../../../src/utils/zero-config/skill-loader')
      const result = areAllCoreSkillsInstalled()

      expect(result).toBe(false)
    })
  })

  describe('getAllInstalledSkills', () => {
    it('should return list of installed skills', async () => {
      const fs = await import('node:fs')

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'agent-browser', isDirectory: () => true },
        { name: 'tdd', isDirectory: () => true },
        { name: 'custom-skill', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false },
      ] as any)

      const { getAllInstalledSkills } = await import('../../../src/utils/zero-config/skill-loader')
      const skills = getAllInstalledSkills()

      expect(skills).toHaveLength(3)
      expect(skills).toContain('agent-browser')
      expect(skills).toContain('tdd')
      expect(skills).toContain('custom-skill')
      expect(skills).not.toContain('README.md')
    })

    it('should return empty array if skills dir not found', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const { getAllInstalledSkills } = await import('../../../src/utils/zero-config/skill-loader')
      const skills = getAllInstalledSkills()

      expect(skills).toEqual([])
    })

    it('should handle errors gracefully', async () => {
      const fs = await import('node:fs')

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const { getAllInstalledSkills } = await import('../../../src/utils/zero-config/skill-loader')
      const skills = getAllInstalledSkills()

      expect(skills).toEqual([])
    })
  })
})
