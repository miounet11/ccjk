/**
 * Integration Tests for Zero-Config Module
 *
 * Tests the complete activation flow from detection to skill loading
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock all dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  readdirSync: vi.fn(),
}))

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}))

vi.mock('../../../src/utils/superpowers/installer', () => ({
  installSuperpowers: vi.fn(),
  updateSuperpowers: vi.fn(),
}))

describe('zero-config integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('complete activation flow', () => {
    it('should perform full activation on first run', async () => {
      const fs = await import('node:fs')
      const { installSuperpowers } = await import('../../../src/utils/superpowers/installer')

      // Setup: Superpowers not installed initially
      let installCalled = false
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        if (pathStr.includes('.activation-state.json'))
          return false
        if (!installCalled)
          return false
        // After installation, everything exists
        return true
      })

      vi.mocked(installSuperpowers).mockImplementation(async () => {
        installCalled = true
        return { success: true, message: 'Installed' }
      })

      vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        const skillName = pathStr.split('/').slice(-2, -1)[0]
        return JSON.stringify({
          name: skillName,
          version: '1.0.0',
        })
      })

      const writeFileSpy = vi.mocked(fs.writeFileSync)

      // Execute activation
      const { activateSuperpowers } = await import('../../../src/utils/zero-config/activator')
      const status = await activateSuperpowers('zh-CN')

      // Verify results
      expect(installSuperpowers).toHaveBeenCalledWith({
        lang: 'zh-CN',
        skipPrompt: true,
      })
      expect(status.isInstalled).toBe(true)
      expect(status.coreSkillsLoaded).toBe(true)
      expect(status.loadedSkills).toHaveLength(5)
      expect(writeFileSpy).toHaveBeenCalled() // Activation state saved
    })

    it('should skip installation if already activated', async () => {
      const fs = await import('node:fs')
      const { installSuperpowers } = await import('../../../src/utils/superpowers/installer')

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        isInstalled: true,
        coreSkillsLoaded: true,
        loadedSkills: ['agent-browser', 'tdd', 'debugging', 'code-review', 'git-worktrees'],
        needsActivation: false,
        lastActivation: new Date().toISOString(),
      }))

      const { activateSuperpowers } = await import('../../../src/utils/zero-config/activator')
      const status = await activateSuperpowers('zh-CN')

      expect(installSuperpowers).not.toHaveBeenCalled()
      expect(status.needsActivation).toBe(false)
    })

    it('should handle partial installation gracefully', async () => {
      const fs = await import('node:fs')
      const { installSuperpowers } = await import('../../../src/utils/superpowers/installer')

      // Superpowers installed but some skills missing
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        // No activation state
        if (pathStr.includes('.activation-state.json'))
          return false
        // Superpowers dir exists
        if (pathStr.includes('plugins/superpowers') && !pathStr.includes('skills'))
          return true
        // Skills dir exists
        if (pathStr.endsWith('skills'))
          return true
        // Only agent-browser and tdd exist (both dir and skill.json)
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

      const { activateSuperpowers } = await import('../../../src/utils/zero-config/activator')
      const status = await activateSuperpowers('zh-CN')

      expect(installSuperpowers).not.toHaveBeenCalled() // Already installed
      expect(status.isInstalled).toBe(true)
      expect(status.coreSkillsLoaded).toBe(false) // Not all skills loaded
      expect(status.loadedSkills).toHaveLength(2) // Only 2 skills available
    })
  })

  describe('status checking and reporting', () => {
    it('should accurately report installation status', async () => {
      const fs = await import('node:fs')

      // Superpowers installed, only first 2 skills exist
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        // Superpowers dir exists
        if (pathStr.includes('plugins/superpowers') && !pathStr.includes('skills'))
          return true
        // Skills dir exists
        if (pathStr.endsWith('skills'))
          return true
        // Only agent-browser and tdd exist (both dir and skill.json)
        return pathStr.includes('agent-browser') || pathStr.includes('tdd')
      })

      const { getInstallationStatus } = await import('../../../src/utils/zero-config/auto-install')
      const status = getInstallationStatus()

      expect(status.superpowersInstalled).toBe(true)
      expect(status.coreSkillsInstalled).toBe(false)
      expect(status.missingSkills).toEqual(['debugging', 'code-review', 'git-worktrees'])
    })

    it('should check core skills status individually', async () => {
      const fs = await import('node:fs')

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
  })

  describe('error recovery', () => {
    it('should recover from installation failure', async () => {
      const fs = await import('node:fs')
      const { installSuperpowers } = await import('../../../src/utils/superpowers/installer')

      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(installSuperpowers).mockResolvedValue({
        success: false,
        message: 'Installation failed',
        error: 'Network timeout',
      })

      const { activateSuperpowers } = await import('../../../src/utils/zero-config/activator')
      const status = await activateSuperpowers('zh-CN')

      expect(status.isInstalled).toBe(false)
      expect(status.needsActivation).toBe(true)
      // Should not throw error
    })

    it('should handle corrupted activation state', async () => {
      const fs = await import('node:fs')

      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        if (pathStr.includes('.activation-state.json'))
          return true
        if (pathStr.includes('plugins/superpowers'))
          return true
        return false
      })
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json{')

      const { checkActivationStatus } = await import('../../../src/utils/zero-config/activator')
      const status = checkActivationStatus()

      // Should return safe default state
      expect(status.isInstalled).toBe(true)
      expect(status.needsActivation).toBe(true)
    })

    it('should handle missing skills during load', async () => {
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
      const results = await loadCoreSkills('zh-CN')

      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      expect(successful).toHaveLength(2)
      expect(failed).toHaveLength(3)
      expect(failed.every(r => r.error === 'Skill not installed')).toBe(true)
    })
  })

  describe('force reactivation', () => {
    it('should clear state and reactivate', async () => {
      const fs = await import('node:fs')

      let stateCleared = false

      // Everything exists
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        // State file exists before clearing, not after
        if (pathStr.includes('.activation-state.json')) {
          return !stateCleared
        }
        return true
      })

      vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        if (pathStr.includes('.activation-state.json')) {
          return JSON.stringify({
            isInstalled: true,
            coreSkillsLoaded: false, // Old state
            loadedSkills: [],
            needsActivation: false,
          })
        }
        const skillName = pathStr.split('/').slice(-2, -1)[0]
        return JSON.stringify({
          name: skillName,
          version: '1.0.0',
        })
      })

      const unlinkSpy = vi.mocked(fs.unlinkSync).mockImplementation(() => {
        stateCleared = true
      })
      const writeSpy = vi.mocked(fs.writeFileSync)

      const { forceReactivation } = await import('../../../src/utils/zero-config/activator')
      const result = await forceReactivation('en')

      expect(unlinkSpy).toHaveBeenCalled()
      expect(writeSpy).toHaveBeenCalled() // New state written
      expect(result.coreSkillsLoaded).toBe(true) // Should be fully loaded now
    })
  })
})
