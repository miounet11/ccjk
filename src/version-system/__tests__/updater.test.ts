/**
 * Tests for VersionUpdater
 */

import type { UpdateStatus } from '../types'
import { promises as fs } from 'node:fs'
import { VersionUpdater } from '../updater'
import { vi } from 'vitest'


// Mock child_process and fs
vi.mock('child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    copyFile: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
  },
}))

describe('versionUpdater', () => {
  let updater: VersionUpdater

  beforeEach(() => {
    updater = new VersionUpdater()
    vi.clearAllMocks()
  })

  describe('update Commands', () => {
    it('should generate correct update command for npm tools', () => {
      const command = updater.getUpdateCommand('claude-code', '1.2.3')
      expect(command).toContain('npm install -g')
      expect(command).toContain('claude-code@1.2.3')
    })

    it('should generate latest version command when no version specified', () => {
      const command = updater.getUpdateCommand('claude-code')
      expect(command).toContain('@latest')
    })

    it('should generate correct command for pip tools', () => {
      const command = updater.getUpdateCommand('aider', '1.0.0')
      expect(command).toContain('pip install --upgrade')
      expect(command).toContain('aider-chat==1.0.0')
    })

    it('should handle tools without specific commands', () => {
      const command = updater.getUpdateCommand('unknown-tool', '1.0.0')
      expect(command).toContain('npm install -g')
      expect(command).toContain('unknown-tool@1.0.0')
    })
  })

  describe('update Status', () => {
    it('should track update status', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: 'success', stderr: '' })
      })

      const statuses: UpdateStatus[] = []
      const updatePromise = updater.update('test-tool', '1.0.0', {
        onProgress: status => statuses.push({ ...status }),
      })

      await updatePromise

      expect(statuses.length).toBeGreaterThan(0)
      expect(statuses[0].status).toBe('checking')
      expect(statuses[statuses.length - 1].status).toBe('completed')
    })

    it('should report progress during update', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: 'success', stderr: '' })
      })

      const progressValues: number[] = []
      await updater.update('test-tool', '1.0.0', {
        onProgress: status => progressValues.push(status.progress),
      })

      expect(progressValues.length).toBeGreaterThan(0)
      expect(progressValues[0]).toBe(0)
      expect(progressValues[progressValues.length - 1]).toBe(100)
    })

    it('should get current update status', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        setTimeout(() => callback(null, { stdout: 'success', stderr: '' }), 100)
      })

      const updatePromise = updater.update('test-tool', '1.0.0')

      // Check status while update is in progress
      await new Promise(resolve => setTimeout(resolve, 10))
      const status = updater.getUpdateStatus('test-tool')

      expect(status).toBeDefined()
      expect(status?.tool).toBe('test-tool')

      await updatePromise
    })

    it('should get all update statuses', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        setTimeout(() => callback(null, { stdout: 'success', stderr: '' }), 100)
      })

      const promise1 = updater.update('tool1', '1.0.0')
      const promise2 = updater.update('tool2', '1.0.0')

      await new Promise(resolve => setTimeout(resolve, 10))
      const statuses = updater.getAllUpdateStatuses()

      expect(statuses.length).toBe(2)

      await Promise.all([promise1, promise2])
    })
  })

  describe('backup and Rollback', () => {
    it('should create backup when requested', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        if (cmd.includes('which')) {
          callback(null, { stdout: '/usr/local/bin/test-tool', stderr: '' })
        }
        else {
          callback(null, { stdout: 'success', stderr: '' })
        }
      });

      (fs.mkdir as vi.Mock).mockResolvedValue(undefined);
      (fs.copyFile as vi.Mock).mockResolvedValue(undefined);
      (fs.writeFile as vi.Mock).mockResolvedValue(undefined)

      await updater.update('test-tool', '1.0.0', { backup: true })

      expect(fs.mkdir).toHaveBeenCalled()
      expect(fs.copyFile).toHaveBeenCalled()
      expect(fs.writeFile).toHaveBeenCalled()
    })

    it('should list available backups', async () => {
      (fs.readdir as vi.Mock).mockResolvedValue([
        'test-tool-2024-01-01.backup',
        'test-tool-2024-01-02.backup',
        'other-tool-2024-01-01.backup',
      ])

      const backups = await updater.listBackups('test-tool')

      expect(backups).toHaveLength(2)
      expect(backups[0]).toContain('test-tool')
    })

    it('should clean old backups', async () => {
      (fs.readdir as vi.Mock).mockResolvedValue([
        'test-tool-2024-01-01.backup',
        'test-tool-2024-01-02.backup',
        'test-tool-2024-01-03.backup',
        'test-tool-2024-01-04.backup',
        'test-tool-2024-01-05.backup',
        'test-tool-2024-01-06.backup',
      ]);

      (fs.unlink as vi.Mock).mockResolvedValue(undefined)

      const deleted = await updater.cleanBackups('test-tool', 3)

      expect(deleted).toBe(3)
      expect(fs.unlink).toHaveBeenCalledTimes(6) // 3 backups + 3 metadata files
    })
  })

  describe('error Handling', () => {
    it('should handle update failures', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(new Error('Update failed'), null)
      })

      await expect(updater.update('test-tool', '1.0.0')).rejects.toThrow()

      const stats = updater.getStats()
      expect(stats.failedUpdates).toBe(1)
    })

    it('should set error status on failure', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(new Error('Update failed'), null)
      })

      let finalStatus: UpdateStatus | undefined

      try {
        await updater.update('test-tool', '1.0.0', {
          onProgress: (status) => {
            finalStatus = status
          },
        })
      }
      catch (error) {
        // Expected
      }

      expect(finalStatus?.status).toBe('failed')
      expect(finalStatus?.error).toBeDefined()
    })

    it('should prevent concurrent updates for same tool', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        setTimeout(() => callback(null, { stdout: 'success', stderr: '' }), 100)
      })

      const promise1 = updater.update('test-tool', '1.0.0')
      const promise2 = updater.update('test-tool', '1.0.0')

      await expect(promise2).rejects.toThrow('already in progress')
      await promise1
    })

    it('should handle timeout', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        // Never call callback to simulate timeout
      })

      await expect(
        updater.update('test-tool', '1.0.0', { timeout: 100 }),
      ).rejects.toThrow()
    })
  })

  describe('statistics', () => {
    it('should track update statistics', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: 'success', stderr: '' })
      })

      await updater.update('tool1', '1.0.0')
      await updater.update('tool2', '1.0.0')

      const stats = updater.getStats()
      expect(stats.totalUpdates).toBe(2)
      expect(stats.successfulUpdates).toBe(2)
      expect(stats.failedUpdates).toBe(0)
    })

    it('should calculate success rate', async () => {
      const mockExec = require('node:child_process').exec
      mockExec
        .mockImplementationOnce((cmd: string, callback: Function) => {
          callback(null, { stdout: 'success', stderr: '' })
        })
        .mockImplementationOnce((cmd: string, callback: Function) => {
          callback(new Error('Failed'), null)
        })

      await updater.update('tool1', '1.0.0')
      try {
        await updater.update('tool2', '1.0.0')
      }
      catch (error) {
        // Expected
      }

      const stats = updater.getStats()
      expect(stats.successRate).toBe(0.5)
    })

    it('should calculate average update time', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        setTimeout(() => callback(null, { stdout: 'success', stderr: '' }), 50)
      })

      await updater.update('tool1', '1.0.0')
      await updater.update('tool2', '1.0.0')

      const stats = updater.getStats()
      expect(stats.averageUpdateTime).toBeGreaterThan(0)
    })

    it('should reset statistics', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: 'success', stderr: '' })
      })

      await updater.update('tool1', '1.0.0')

      let stats = updater.getStats()
      expect(stats.totalUpdates).toBe(1)

      updater.resetStats()

      stats = updater.getStats()
      expect(stats.totalUpdates).toBe(0)
      expect(stats.successfulUpdates).toBe(0)
    })
  })

  describe('version Verification', () => {
    it('should verify installation after update', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        if (cmd.includes('--version')) {
          callback(null, { stdout: 'version 1.0.0', stderr: '' })
        }
        else {
          callback(null, { stdout: 'success', stderr: '' })
        }
      })

      await updater.update('test-tool', '1.0.0')

      const stats = updater.getStats()
      expect(stats.successfulUpdates).toBe(1)
    })

    it('should fail if version mismatch after update', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        if (cmd.includes('--version')) {
          callback(null, { stdout: 'version 0.9.0', stderr: '' })
        }
        else {
          callback(null, { stdout: 'success', stderr: '' })
        }
      })

      await expect(updater.update('test-tool', '1.0.0')).rejects.toThrow(
        'Version mismatch',
      )
    })
  })

  describe('can Update Check', () => {
    it('should check if tool can be updated', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        if (cmd.includes('which')) {
          callback(null, { stdout: '/usr/local/bin/test-tool', stderr: '' })
        }
      })

      const canUpdate = await updater.canUpdate('test-tool')
      expect(canUpdate).toBe(true)
    })

    it('should return false if tool not found', async () => {
      const mockExec = require('node:child_process').exec
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(new Error('not found'), null)
      })

      const canUpdate = await updater.canUpdate('non-existent-tool')
      expect(canUpdate).toBe(false)
    })
  })
})
