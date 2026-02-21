import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { SETTINGS_FILE } from '../../src/constants'
import { zeroConfig } from '../../src/commands/zero-config'

// Mock dependencies
vi.mock('node:fs')
vi.mock('../../src/utils/fs-operations')
vi.mock('inquirer')

const mockExistsSync = vi.mocked(existsSync)
const mockReadFileSync = vi.mocked(readFileSync)

describe('zero-config command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('list presets', () => {
    it('should list all available presets', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await zeroConfig({ list: true })

      expect(consoleSpy).toHaveBeenCalled()
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      expect(output).toContain('max')
      expect(output).toContain('dev')
      expect(output).toContain('safe')

      consoleSpy.mockRestore()
    })
  })

  describe('apply preset', () => {
    it('should handle non-existent preset', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await zeroConfig({ preset: 'invalid' })

      expect(consoleErrorSpy).toHaveBeenCalled()
      const errorOutput = consoleErrorSpy.mock.calls[0][0]
      expect(errorOutput).toContain('not found')

      consoleErrorSpy.mockRestore()
    })

    it('should apply max preset', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }))

      const { writeFileAtomic } = await import('../../src/utils/fs-operations')
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {})

      await zeroConfig({ preset: 'max', skipBackup: true })

      expect(writeFileSpy).toHaveBeenCalled()
      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string)
      expect(writtenContent.permissions.allow).toContain('Bash(npm *)')
      expect(writtenContent.permissions.allow).toContain('Bash(git *)')
      expect(writtenContent.permissions.allow).toContain('Read(*)')
    })

    it('should apply dev preset', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }))

      const { writeFileAtomic } = await import('../../src/utils/fs-operations')
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {})

      await zeroConfig({ preset: 'dev', skipBackup: true })

      expect(writeFileSpy).toHaveBeenCalled()
      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string)
      expect(writtenContent.permissions.allow).toContain('Bash(npm *)')
      expect(writtenContent.permissions.allow).toContain('Bash(git *)')
      expect(writtenContent.permissions.allow).not.toContain('Bash(docker *)')
    })

    it('should apply safe preset', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }))

      const { writeFileAtomic } = await import('../../src/utils/fs-operations')
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {})

      await zeroConfig({ preset: 'safe', skipBackup: true })

      expect(writeFileSpy).toHaveBeenCalled()
      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string)
      expect(writtenContent.permissions.allow).toContain('Read(*)')
      expect(writtenContent.permissions.allow).not.toContain('Write(*)')
      expect(writtenContent.permissions.allow).not.toContain('Edit(*)')
    })

    it('should merge with existing permissions', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: {
          allow: ['Bash(custom-command *)', 'MCP(custom-server:tool)'],
        },
      }))

      const { writeFileAtomic } = await import('../../src/utils/fs-operations')
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {})

      await zeroConfig({ preset: 'dev', skipBackup: true })

      expect(writeFileSpy).toHaveBeenCalled()
      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string)
      expect(writtenContent.permissions.allow).toContain('Bash(custom-command *)')
      expect(writtenContent.permissions.allow).toContain('MCP(custom-server:tool)')
      expect(writtenContent.permissions.allow).toContain('Bash(npm *)')
    })

    it('should create backup by default', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }))

      const { writeFileAtomic, ensureDir } = await import('../../src/utils/fs-operations')
      const ensureDirSpy = vi.mocked(ensureDir).mockImplementation(() => {})
      vi.mocked(writeFileAtomic).mockImplementation(() => {})

      await zeroConfig({ preset: 'dev' })

      // Should create backup directory
      expect(ensureDirSpy).toHaveBeenCalled()
    })
  })

  describe('permission validation', () => {
    it('should not include dangerous bash patterns', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }))

      const { writeFileAtomic } = await import('../../src/utils/fs-operations')
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {})

      await zeroConfig({ preset: 'max', skipBackup: true })

      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string)
      expect(writtenContent.permissions.allow).not.toContain('Bash(rm *)')
      expect(writtenContent.permissions.allow).not.toContain('Bash(sudo *)')
      expect(writtenContent.permissions.allow).not.toContain('Bash(passwd *)')
    })

    it('should include all file operation permissions in max preset', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        permissions: { allow: [] },
      }))

      const { writeFileAtomic } = await import('../../src/utils/fs-operations')
      const writeFileSpy = vi.mocked(writeFileAtomic).mockImplementation(() => {})

      await zeroConfig({ preset: 'max', skipBackup: true })

      const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string)
      expect(writtenContent.permissions.allow).toContain('Read(*)')
      expect(writtenContent.permissions.allow).toContain('Edit(*)')
      expect(writtenContent.permissions.allow).toContain('Write(*)')
      expect(writtenContent.permissions.allow).toContain('NotebookEdit(*)')
    })
  })
})
