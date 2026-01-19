/**
 * Tests for Zero-Config Auto-Install Module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}))

vi.mock('../../../src/utils/superpowers/installer', () => ({
  installSuperpowers: vi.fn(),
  updateSuperpowers: vi.fn(),
}))

describe('zero-config/auto-install', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('autoInstallSuperpowers', () => {
    it('should install Superpowers if not installed', async () => {
      const fs = await import('node:fs')
      const { installSuperpowers } = await import('../../../src/utils/superpowers/installer')

      // Initially not installed, then installed after call
      let installCalled = false
      vi.mocked(fs.existsSync).mockImplementation(() => {
        return installCalled
      })

      vi.mocked(installSuperpowers).mockImplementation(async () => {
        installCalled = true
        return { success: true, message: 'Installed successfully' }
      })

      const { autoInstallSuperpowers } = await import('../../../src/utils/zero-config/auto-install')
      const result = await autoInstallSuperpowers('zh-CN')

      expect(installSuperpowers).toHaveBeenCalledWith({
        lang: 'zh-CN',
        skipPrompt: true,
      })
      expect(result).toBe(true)
    })

    it('should return true if already installed', async () => {
      const fs = await import('node:fs')
      const { installSuperpowers } = await import('../../../src/utils/superpowers/installer')

      vi.mocked(fs.existsSync).mockReturnValue(true)

      const { autoInstallSuperpowers } = await import('../../../src/utils/zero-config/auto-install')
      const result = await autoInstallSuperpowers('zh-CN')

      expect(installSuperpowers).not.toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should return false if installation fails', async () => {
      const fs = await import('node:fs')
      const { installSuperpowers } = await import('../../../src/utils/superpowers/installer')

      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(installSuperpowers).mockResolvedValue({
        success: false,
        message: 'Installation failed',
        error: 'Network error',
      })

      const { autoInstallSuperpowers } = await import('../../../src/utils/zero-config/auto-install')
      const result = await autoInstallSuperpowers('zh-CN')

      expect(result).toBe(false)
    })

    it('should handle exceptions gracefully', async () => {
      const fs = await import('node:fs')
      const { installSuperpowers } = await import('../../../src/utils/superpowers/installer')

      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(installSuperpowers).mockRejectedValue(new Error('Network timeout'))

      const { autoInstallSuperpowers } = await import('../../../src/utils/zero-config/auto-install')
      const result = await autoInstallSuperpowers('zh-CN')

      expect(result).toBe(false)
    })
  })

  describe('getInstallationStatus', () => {
    it('should report fully installed status', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const { getInstallationStatus } = await import('../../../src/utils/zero-config/auto-install')
      const status = getInstallationStatus()

      expect(status.superpowersInstalled).toBe(true)
      expect(status.coreSkillsInstalled).toBe(true)
      expect(status.needsInstall).toBe(false)
      expect(status.missingSkills).toEqual([])
    })

    it('should report not installed status', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const { getInstallationStatus } = await import('../../../src/utils/zero-config/auto-install')
      const status = getInstallationStatus()

      expect(status.superpowersInstalled).toBe(false)
      expect(status.coreSkillsInstalled).toBe(false)
      expect(status.needsInstall).toBe(true)
      expect(status.missingSkills).toEqual([
        'agent-browser',
        'tdd',
        'debugging',
        'code-review',
        'git-worktrees',
      ])
    })

    it('should list missing skills when partially installed', async () => {
      const fs = await import('node:fs')

      // Superpowers installed, only agent-browser and tdd exist
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        if (pathStr.includes('plugins/superpowers') && !pathStr.includes('skills'))
          return true
        if (pathStr.endsWith('skills'))
          return true
        return pathStr.includes('agent-browser') || pathStr.includes('tdd')
      })

      const { getInstallationStatus } = await import('../../../src/utils/zero-config/auto-install')
      const status = getInstallationStatus()

      expect(status.superpowersInstalled).toBe(true)
      expect(status.coreSkillsInstalled).toBe(false)
      expect(status.needsInstall).toBe(true)
      expect(status.missingSkills).toEqual(['debugging', 'code-review', 'git-worktrees'])
    })

    it('should handle missing skills directory', async () => {
      const fs = await import('node:fs')

      // Superpowers directory exists but skills directory doesn't
      // isSuperpowersInstalled checks BOTH directories, so it should return false
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        // Only the base superpowers directory exists
        if (pathStr.includes('plugins/superpowers') && !pathStr.includes('skills'))
          return true
        // Skills directory and all skill paths don't exist
        return false
      })

      const { getInstallationStatus } = await import('../../../src/utils/zero-config/auto-install')
      const status = getInstallationStatus()

      // Since skills directory doesn't exist, isSuperpowersInstalled returns false
      expect(status.superpowersInstalled).toBe(false)
      expect(status.coreSkillsInstalled).toBe(false)
      expect(status.needsInstall).toBe(true)
      expect(status.missingSkills).toEqual([
        'agent-browser',
        'tdd',
        'debugging',
        'code-review',
        'git-worktrees',
      ])
    })
  })

  describe('needsAutoInstall', () => {
    it('should return true when not installed', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const { needsAutoInstall } = await import('../../../src/utils/zero-config/auto-install')
      expect(needsAutoInstall()).toBe(true)
    })

    it('should return false when fully installed', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const { needsAutoInstall } = await import('../../../src/utils/zero-config/auto-install')
      expect(needsAutoInstall()).toBe(false)
    })

    it('should return true when skills are missing', async () => {
      const fs = await import('node:fs')

      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        if (pathStr.includes('plugins/superpowers') && !pathStr.includes('skills'))
          return true
        if (pathStr.endsWith('skills'))
          return true
        // Only agent-browser exists
        return pathStr.includes('agent-browser')
      })

      const { needsAutoInstall } = await import('../../../src/utils/zero-config/auto-install')
      expect(needsAutoInstall()).toBe(true)
    })
  })

  describe('reinstallForMissingSkills', () => {
    it('should return true if no skills missing', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const { reinstallForMissingSkills } = await import('../../../src/utils/zero-config/auto-install')
      const result = await reinstallForMissingSkills('zh-CN')

      expect(result).toBe(true)
    })

    it('should update if Superpowers installed but skills missing', async () => {
      const fs = await import('node:fs')
      const { updateSuperpowers } = await import('../../../src/utils/superpowers/installer')

      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        if (pathStr.includes('plugins/superpowers') && !pathStr.includes('skills'))
          return true
        if (pathStr.endsWith('skills'))
          return true
        // Only agent-browser exists
        return pathStr.includes('agent-browser')
      })

      vi.mocked(updateSuperpowers).mockResolvedValue({
        success: true,
        message: 'Updated successfully',
      })

      const { reinstallForMissingSkills } = await import('../../../src/utils/zero-config/auto-install')
      const result = await reinstallForMissingSkills('zh-CN')

      expect(updateSuperpowers).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should do full install if Superpowers not installed', async () => {
      const fs = await import('node:fs')
      const { installSuperpowers } = await import('../../../src/utils/superpowers/installer')

      // Not installed initially
      let installCalled = false
      vi.mocked(fs.existsSync).mockImplementation(() => installCalled)

      vi.mocked(installSuperpowers).mockImplementation(async () => {
        installCalled = true
        return { success: true, message: 'Installed' }
      })

      const { reinstallForMissingSkills } = await import('../../../src/utils/zero-config/auto-install')
      const result = await reinstallForMissingSkills('zh-CN')

      expect(installSuperpowers).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should handle update failures gracefully', async () => {
      const fs = await import('node:fs')
      const { updateSuperpowers } = await import('../../../src/utils/superpowers/installer')

      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        if (pathStr.includes('plugins/superpowers') && !pathStr.includes('skills'))
          return true
        if (pathStr.endsWith('skills'))
          return true
        return pathStr.includes('agent-browser')
      })

      vi.mocked(updateSuperpowers).mockResolvedValue({
        success: false,
        message: 'Update failed',
      })

      const { reinstallForMissingSkills } = await import('../../../src/utils/zero-config/auto-install')
      const result = await reinstallForMissingSkills('zh-CN')

      expect(result).toBe(false)
    })

    it('should handle exceptions gracefully', async () => {
      const fs = await import('node:fs')

      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString()
        if (pathStr.includes('plugins/superpowers') && !pathStr.includes('skills'))
          return true
        if (pathStr.endsWith('skills'))
          return true
        return pathStr.includes('agent-browser')
      })

      // Mock updateSuperpowers to throw
      vi.doMock('../../../src/utils/superpowers/installer', () => ({
        installSuperpowers: vi.fn(),
        updateSuperpowers: vi.fn().mockRejectedValue(new Error('Git error')),
      }))

      const { reinstallForMissingSkills } = await import('../../../src/utils/zero-config/auto-install')
      const result = await reinstallForMissingSkills('zh-CN')

      expect(result).toBe(false)
    })
  })
})
