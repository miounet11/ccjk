/**
 * Tests for Zero-Config Activator Module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}))

vi.mock('../../../src/utils/zero-config/auto-install', () => ({
  autoInstallSuperpowers: vi.fn(),
  getInstallationStatus: vi.fn(),
}))

vi.mock('../../../src/utils/zero-config/skill-loader', () => ({
  loadCoreSkills: vi.fn(),
}))

describe('zero-config/activator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkActivationStatus', () => {
    it('should return needsActivation=true when not activated', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File not found')
      })

      const { checkActivationStatus } = await import('../../../src/utils/zero-config/activator')
      const status = checkActivationStatus()

      expect(status.isInstalled).toBe(true)
      expect(status.needsActivation).toBe(true)
      expect(status.coreSkillsLoaded).toBe(false)
      expect(status.loadedSkills).toEqual([])
    })

    it('should return needsActivation=false when already activated', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const savedState = {
        isInstalled: true,
        coreSkillsLoaded: true,
        loadedSkills: ['agent-browser', 'tdd', 'debugging', 'code-review', 'git-worktrees'],
        needsActivation: false,
        lastActivation: new Date().toISOString(),
      }

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedState))

      const { checkActivationStatus } = await import('../../../src/utils/zero-config/activator')
      const status = checkActivationStatus()

      expect(status.isInstalled).toBe(true)
      expect(status.needsActivation).toBe(false)
      expect(status.coreSkillsLoaded).toBe(true)
      expect(status.loadedSkills).toHaveLength(5)
    })

    it('should return needsActivation=true when not installed', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const { checkActivationStatus } = await import('../../../src/utils/zero-config/activator')
      const status = checkActivationStatus()

      expect(status.isInstalled).toBe(false)
      expect(status.needsActivation).toBe(true)
      expect(status.coreSkillsLoaded).toBe(false)
    })

    it('should handle corrupted state file', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json')

      const { checkActivationStatus } = await import('../../../src/utils/zero-config/activator')
      const status = checkActivationStatus()

      expect(status.isInstalled).toBe(true)
      expect(status.needsActivation).toBe(true)
      expect(status.coreSkillsLoaded).toBe(false)
    })
  })

  describe('activateSuperpowers', () => {
    it('should activate successfully when not installed', async () => {
      const fs = await import('node:fs')
      const { autoInstallSuperpowers } = await import('../../../src/utils/zero-config/auto-install')
      const { loadCoreSkills } = await import('../../../src/utils/zero-config/skill-loader')

      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(autoInstallSuperpowers).mockResolvedValue(true)
      vi.mocked(loadCoreSkills).mockResolvedValue([
        { skill: 'agent-browser', success: true },
        { skill: 'tdd', success: true },
        { skill: 'debugging', success: true },
        { skill: 'code-review', success: true },
        { skill: 'git-worktrees', success: true },
      ])

      const { activateSuperpowers } = await import('../../../src/utils/zero-config/activator')
      const status = await activateSuperpowers('en')

      expect(autoInstallSuperpowers).toHaveBeenCalledWith('en')
      expect(loadCoreSkills).toHaveBeenCalled()
      expect(status.isInstalled).toBe(true)
      expect(status.coreSkillsLoaded).toBe(true)
      expect(status.needsActivation).toBe(false)
      expect(status.loadedSkills).toHaveLength(5)
    })

    it('should skip installation if already installed', async () => {
      const fs = await import('node:fs')
      const { autoInstallSuperpowers } = await import('../../../src/utils/zero-config/auto-install')
      const { loadCoreSkills } = await import('../../../src/utils/zero-config/skill-loader')

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('No state file')
      })
      vi.mocked(loadCoreSkills).mockResolvedValue([
        { skill: 'agent-browser', success: true },
        { skill: 'tdd', success: true },
        { skill: 'debugging', success: true },
        { skill: 'code-review', success: true },
        { skill: 'git-worktrees', success: true },
      ])

      const { activateSuperpowers } = await import('../../../src/utils/zero-config/activator')
      const status = await activateSuperpowers('en')

      expect(autoInstallSuperpowers).not.toHaveBeenCalled()
      expect(loadCoreSkills).toHaveBeenCalled()
      expect(status.isInstalled).toBe(true)
      expect(status.coreSkillsLoaded).toBe(true)
    })

    it('should return early if already activated', async () => {
      const fs = await import('node:fs')
      const { autoInstallSuperpowers } = await import('../../../src/utils/zero-config/auto-install')
      const { loadCoreSkills } = await import('../../../src/utils/zero-config/skill-loader')

      vi.mocked(fs.existsSync).mockReturnValue(true)

      const savedState = {
        isInstalled: true,
        coreSkillsLoaded: true,
        loadedSkills: ['agent-browser', 'tdd', 'debugging', 'code-review', 'git-worktrees'],
        needsActivation: false,
        lastActivation: new Date().toISOString(),
      }

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedState))

      const { activateSuperpowers } = await import('../../../src/utils/zero-config/activator')
      const status = await activateSuperpowers('en')

      expect(autoInstallSuperpowers).not.toHaveBeenCalled()
      expect(loadCoreSkills).not.toHaveBeenCalled()
      expect(status.needsActivation).toBe(false)
    })

    it('should handle installation failure', async () => {
      const fs = await import('node:fs')
      const { autoInstallSuperpowers } = await import('../../../src/utils/zero-config/auto-install')
      const { loadCoreSkills } = await import('../../../src/utils/zero-config/skill-loader')

      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(autoInstallSuperpowers).mockResolvedValue(false)

      const { activateSuperpowers } = await import('../../../src/utils/zero-config/activator')
      const status = await activateSuperpowers('en')

      expect(autoInstallSuperpowers).toHaveBeenCalled()
      expect(loadCoreSkills).not.toHaveBeenCalled()
      expect(status.isInstalled).toBe(false)
      expect(status.needsActivation).toBe(true)
    })

    it('should handle partial skill loading', async () => {
      const fs = await import('node:fs')
      const { loadCoreSkills } = await import('../../../src/utils/zero-config/skill-loader')

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('No state')
      })
      vi.mocked(loadCoreSkills).mockResolvedValue([
        { skill: 'agent-browser', success: true },
        { skill: 'tdd', success: true },
        { skill: 'debugging', success: false, error: 'Not found' },
        { skill: 'code-review', success: true },
        { skill: 'git-worktrees', success: false, error: 'Not found' },
      ])

      const { activateSuperpowers } = await import('../../../src/utils/zero-config/activator')
      const status = await activateSuperpowers('en')

      expect(status.isInstalled).toBe(true)
      expect(status.coreSkillsLoaded).toBe(false)
      expect(status.loadedSkills).toEqual(['agent-browser', 'tdd', 'code-review'])
    })
  })

  describe('forceReactivation', () => {
    it('should clear activation state and reactivate', async () => {
      const fs = await import('node:fs')
      const { autoInstallSuperpowers } = await import('../../../src/utils/zero-config/auto-install')
      const { loadCoreSkills } = await import('../../../src/utils/zero-config/skill-loader')

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(autoInstallSuperpowers).mockResolvedValue(true)
      vi.mocked(loadCoreSkills).mockResolvedValue([
        { skill: 'agent-browser', success: true },
        { skill: 'tdd', success: true },
        { skill: 'debugging', success: true },
        { skill: 'code-review', success: true },
        { skill: 'git-worktrees', success: true },
      ])

      const { forceReactivation } = await import('../../../src/utils/zero-config/activator')
      await forceReactivation('en')

      expect(fs.unlinkSync).toHaveBeenCalled()
      expect(loadCoreSkills).toHaveBeenCalled()
    })
  })
})
