import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '../../../src/i18n'
import {
  checkSuperpowersInstalled,
  getClaudePluginDir,
  getSuperpowersPath,
  getSuperpowersSkills,
  installSuperpowers,
  installSuperpowersViaGit,
  uninstallSuperpowers,
  updateSuperpowers,
} from '../../../src/utils/superpowers/installer'

// Mock modules before importing
const mockNodeFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
}))

const mockNodeFsPromises = vi.hoisted(() => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  mkdir: vi.fn(),
  rm: vi.fn(),
}))

const mockNodeUtil = vi.hoisted(() => ({
  promisify: vi.fn((fn: any) => fn),
}))

const mockExecAsync = vi.hoisted(() => vi.fn())

const mockI18n = vi.hoisted(() => ({
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('node:fs', () => mockNodeFs)
vi.mock('node:fs/promises', () => mockNodeFsPromises)
vi.mock('node:util', () => mockNodeUtil)
vi.mock('node:child_process', () => ({
  exec: mockExecAsync,
}))
vi.mock('../../../src/i18n', () => mockI18n)

describe('superpowers Installer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup promisify to return our mock
    mockNodeUtil.promisify.mockReturnValue(mockExecAsync)
  })

  describe('getClaudePluginDir', () => {
    it('should return the correct plugin directory path', () => {
      const expected = join(homedir(), '.claude', 'plugins')
      expect(getClaudePluginDir()).toBe(expected)
    })
  })

  describe('getSuperpowersPath', () => {
    it('should return the correct superpowers path', () => {
      const expected = join(homedir(), '.claude', 'plugins', 'superpowers')
      expect(getSuperpowersPath()).toBe(expected)
    })
  })

  describe('checkSuperpowersInstalled', () => {
    it('should return installed: false when directory does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = await checkSuperpowersInstalled()

      expect(result.installed).toBe(false)
      expect(result.version).toBeUndefined()
      expect(result.path).toBeUndefined()
    })

    it('should return installed: true with version when package.json exists', async () => {
      const superpowersPath = getSuperpowersPath()
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return path === superpowersPath || path === join(superpowersPath, 'package.json') || path === join(superpowersPath, 'skills')
      })
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        version: '1.2.3',
      }))
      vi.mocked(readdir).mockResolvedValue([
        { name: 'skill1', isDirectory: () => true },
        { name: 'skill2', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
      ] as any)

      const result = await checkSuperpowersInstalled()

      expect(result.installed).toBe(true)
      expect(result.version).toBe('1.2.3')
      expect(result.skillCount).toBe(2)
      expect(result.path).toBe(superpowersPath)
    })

    it('should return installed: true without version when package.json does not exist', async () => {
      const superpowersPath = getSuperpowersPath()
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return path === superpowersPath
      })

      const result = await checkSuperpowersInstalled()

      expect(result.installed).toBe(true)
      expect(result.version).toBeUndefined()
      expect(result.path).toBe(superpowersPath)
    })

    it('should return installed: true without version on parse error', async () => {
      const superpowersPath = getSuperpowersPath()
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return path === superpowersPath || path === join(superpowersPath, 'package.json')
      })
      vi.mocked(readFile).mockRejectedValue(new Error('File not found'))

      const result = await checkSuperpowersInstalled()

      expect(result.installed).toBe(true)
      expect(result.version).toBeUndefined()
      expect(result.path).toBe(superpowersPath)
    })

    it('should count skills correctly when skills directory exists', async () => {
      const superpowersPath = getSuperpowersPath()
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return path === superpowersPath || path === join(superpowersPath, 'package.json') || path === join(superpowersPath, 'skills')
      })
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ version: '2.0.0' }))
      vi.mocked(readdir).mockResolvedValue([
        { name: 'brainstorming', isDirectory: () => true },
        { name: 'debugging', isDirectory: () => true },
        { name: 'testing', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false },
      ] as any)

      const result = await checkSuperpowersInstalled()

      expect(result.skillCount).toBe(3)
    })

    it('should handle missing skills directory gracefully', async () => {
      const superpowersPath = getSuperpowersPath()
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return path === superpowersPath || path === join(superpowersPath, 'package.json')
      })
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ version: '1.0.0' }))

      const result = await checkSuperpowersInstalled()

      expect(result.installed).toBe(true)
      expect(result.skillCount).toBe(0)
    })
  })

  describe('getSuperpowersSkills', () => {
    it('should return empty array when not installed', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const skills = await getSuperpowersSkills()

      expect(skills).toEqual([])
    })

    it('should return skill names when installed', async () => {
      const superpowersPath = getSuperpowersPath()
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return path === superpowersPath || path === join(superpowersPath, 'skills')
      })
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ version: '1.0.0' }))
      vi.mocked(readdir).mockResolvedValue([
        { name: 'brainstorming', isDirectory: () => true },
        { name: 'debugging', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false },
      ] as any)

      const skills = await getSuperpowersSkills()

      expect(skills).toContain('brainstorming')
      expect(skills).toContain('debugging')
      expect(skills).not.toContain('README.md')
      expect(skills).toHaveLength(2)
    })

    it('should return empty array when skills directory does not exist', async () => {
      const superpowersPath = getSuperpowersPath()
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return path === superpowersPath
      })

      const skills = await getSuperpowersSkills()

      expect(skills).toEqual([])
    })

    it('should return empty array on readdir error', async () => {
      const superpowersPath = getSuperpowersPath()
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return path === superpowersPath || path === join(superpowersPath, 'skills')
      })
      vi.mocked(readdir).mockRejectedValue(new Error('Permission denied'))

      const skills = await getSuperpowersSkills()

      expect(skills).toEqual([])
    })

    it('should filter out non-directory entries', async () => {
      const superpowersPath = getSuperpowersPath()
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return path === superpowersPath || path === join(superpowersPath, 'skills')
      })
      vi.mocked(readdir).mockResolvedValue([
        { name: 'skill1', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
        { name: 'skill2', isDirectory: () => true },
        { name: 'image.png', isDirectory: () => false },
      ] as any)

      const skills = await getSuperpowersSkills()

      expect(skills).toEqual(['skill1', 'skill2'])
    })
  })

  describe('installSuperpowers', () => {
    it('should return success if already installed', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(i18n.t).mockReturnValue('Already installed')

      const result = await installSuperpowers({ lang: 'en' })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Already installed')
      expect(i18n.t).toHaveBeenCalledWith('superpowers:alreadyInstalled')
    })

    it('should install via git clone when not installed', async () => {
      // First call: not installed, subsequent calls: installed
      vi.mocked(existsSync).mockReturnValueOnce(false).mockReturnValue(true)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' })
      vi.mocked(i18n.t).mockImplementation(((key: any) => {
        if (key === 'superpowers:installSuccess')
          return 'Install success'
        if (key === 'superpowers:cloning')
          return 'Cloning'
        return key
      }) as any)

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await installSuperpowers({ lang: 'en' })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Install success')

      consoleSpy.mockRestore()
    })

    it('should return error if git clone fails', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      mockExecAsync.mockRejectedValue(new Error('Git clone failed'))
      vi.mocked(i18n.t).mockReturnValue('Install failed')

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await installSuperpowers({ lang: 'en' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Git clone failed')

      consoleSpy.mockRestore()
    })
  })

  describe('installSuperpowersViaGit', () => {
    it('should clone repository and install successfully', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' })
      vi.mocked(i18n.t).mockImplementation(((key: any) => {
        if (key === 'superpowers:installSuccess')
          return 'Install success'
        if (key === 'superpowers:cloning')
          return 'Cloning'
        return key
      }) as any)

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await installSuperpowersViaGit()

      expect(result.success).toBe(true)
      expect(result.message).toBe('Install success')
      expect(consoleSpy).toHaveBeenCalledWith('Cloning')

      consoleSpy.mockRestore()
    })

    it('should return error if git clone fails', async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined)
      mockExecAsync.mockRejectedValue(new Error('Git clone failed'))
      vi.mocked(i18n.t).mockReturnValue('Install failed')

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await installSuperpowersViaGit()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Git clone failed')

      consoleSpy.mockRestore()
    })

    it('should return error if plugin not found after cloning', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' })
      vi.mocked(i18n.t).mockReturnValue('Install failed')

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await installSuperpowersViaGit()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Install failed')

      consoleSpy.mockRestore()
    })
  })

  describe('uninstallSuperpowers', () => {
    it('should return success if not installed', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(i18n.t).mockReturnValue('Not installed')

      const result = await uninstallSuperpowers()

      expect(result.success).toBe(true)
      expect(result.message).toBe('Not installed')
      expect(i18n.t).toHaveBeenCalledWith('superpowers:notInstalled')
    })

    it('should remove directory and return success', async () => {
      // First call: installed, second call for rm check: exists, third call: not installed
      vi.mocked(existsSync).mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValue(false)
      vi.mocked(rm).mockResolvedValue(undefined)
      vi.mocked(i18n.t).mockReturnValue('Uninstall success')

      const result = await uninstallSuperpowers()

      expect(result.success).toBe(true)
      expect(result.message).toBe('Uninstall success')
    })

    it('should return error if rm fails', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(rm).mockRejectedValue(new Error('Cannot remove directory'))
      vi.mocked(i18n.t).mockReturnValue('Uninstall failed')

      const result = await uninstallSuperpowers()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot remove directory')
    })

    it('should return error if plugin still exists after uninstall', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(rm).mockResolvedValue(undefined)
      vi.mocked(i18n.t).mockReturnValue('Uninstall failed')

      const result = await uninstallSuperpowers()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Uninstall failed')
    })
  })

  describe('updateSuperpowers', () => {
    it('should return error if not installed', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(i18n.t).mockReturnValue('Not installed')

      const result = await updateSuperpowers()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Not installed')
      expect(i18n.t).toHaveBeenCalledWith('superpowers:notInstalled')
    })

    it('should update via git pull', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' })
      vi.mocked(i18n.t).mockReturnValue('Update success')

      const result = await updateSuperpowers()

      expect(result.success).toBe(true)
      expect(result.message).toBe('Update success')
    })

    it('should return error if git pull fails', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      mockExecAsync.mockRejectedValue(new Error('Git pull failed'))
      vi.mocked(i18n.t).mockReturnValue('Update failed')

      const result = await updateSuperpowers()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Git pull failed')
    })
  })
})
