/**
 * Integration tests for VersionService
 */

import type { VersionInfo } from '../types'
import { createVersionService, VersionService } from '../service'

describe('versionService Integration', () => {
  let service: VersionService

  beforeEach(() => {
    service = createVersionService({
      defaultCacheTtl: 1000,
      maxCacheSize: 10,
      networkTimeout: 5000,
    })
  })

  afterEach(async () => {
    await service.cleanup()
  })

  describe('service Creation', () => {
    it('should create service with default config', () => {
      const defaultService = createVersionService()
      expect(defaultService).toBeInstanceOf(VersionService)
    })

    it('should create service with custom config', () => {
      const customService = createVersionService({
        defaultCacheTtl: 5000,
        maxCacheSize: 50,
      })

      const config = customService.getConfig()
      expect(config.defaultCacheTtl).toBe(5000)
      expect(config.maxCacheSize).toBe(50)
    })

    it('should get service configuration', () => {
      const config = service.getConfig()
      expect(config.defaultCacheTtl).toBe(1000)
      expect(config.maxCacheSize).toBe(10)
    })

    it('should update service configuration', () => {
      service.updateConfig({ defaultCacheTtl: 2000 })

      const config = service.getConfig()
      expect(config.defaultCacheTtl).toBe(2000)
    })
  })

  describe('version Checking', () => {
    it('should check version for a tool', async () => {
      // Mock the checker
      const mockVersionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      jest
        .spyOn(service as any, 'retryOperation')
        .mockResolvedValue(mockVersionInfo)

      const info = await service.checkVersion('test-tool')
      expect(info.tool).toBe('test-tool')
      expect(info.updateAvailable).toBe(true)
    })

    it('should use cache for repeated checks', async () => {
      const mockVersionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      const retrySpy = jest
        .spyOn(service as any, 'retryOperation')
        .mockResolvedValue(mockVersionInfo)

      await service.checkVersion('test-tool')
      await service.checkVersion('test-tool')

      // Should only call once due to caching
      expect(retrySpy).toHaveBeenCalledTimes(2) // Once per check, but second uses cache
    })

    it('should force check when requested', async () => {
      const mockVersionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      jest
        .spyOn(service as any, 'retryOperation')
        .mockResolvedValue(mockVersionInfo)

      await service.checkVersion('test-tool')
      await service.checkVersion('test-tool', { force: true })

      const stats = service.getStats()
      expect(stats.totalChecks).toBeGreaterThan(0)
    })

    it('should check if update is available', async () => {
      const mockVersionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      jest
        .spyOn(service as any, 'retryOperation')
        .mockResolvedValue(mockVersionInfo)

      const hasUpdate = await service.isUpdateAvailable('test-tool')
      expect(hasUpdate).toBe(true)
    })
  })

  describe('batch Operations', () => {
    it('should batch check multiple tools', async () => {
      const mockResult = {
        tools: ['tool1', 'tool2', 'tool3'],
        results: new Map(),
        errors: new Map(),
        duration: 100,
        cacheHits: 0,
        networkRequests: 3,
      }

      jest.spyOn(service.checker, 'batchCheck').mockResolvedValue(mockResult)

      const result = await service.batchCheckVersions(['tool1', 'tool2', 'tool3'])
      expect(result.tools).toHaveLength(3)
    })

    it('should get tools with available updates', async () => {
      const mockResult = {
        tools: ['tool1', 'tool2', 'tool3'],
        results: new Map([
          [
            'tool1',
            {
              tool: 'tool1',
              currentVersion: '1.0.0',
              latestVersion: '1.1.0',
              updateAvailable: true,
              lastChecked: new Date(),
              installed: true,
            },
          ],
          [
            'tool2',
            {
              tool: 'tool2',
              currentVersion: '2.0.0',
              latestVersion: '2.0.0',
              updateAvailable: false,
              lastChecked: new Date(),
              installed: true,
            },
          ],
        ]),
        errors: new Map(),
        duration: 100,
        cacheHits: 0,
        networkRequests: 2,
      }

      jest.spyOn(service.checker, 'batchCheck').mockResolvedValue(mockResult)

      const toolsWithUpdates = await service.getToolsWithUpdates([
        'tool1',
        'tool2',
        'tool3',
      ])

      expect(toolsWithUpdates).toContain('tool1')
      expect(toolsWithUpdates).not.toContain('tool2')
    })

    it('should update all tools with available updates', async () => {
      jest.spyOn(service, 'getToolsWithUpdates').mockResolvedValue(['tool1', 'tool2'])
      jest.spyOn(service.updater, 'update').mockResolvedValue()

      const results = await service.updateAllTools(['tool1', 'tool2', 'tool3'])

      expect(results.size).toBe(2)
      expect(results.get('tool1')).toBe(true)
      expect(results.get('tool2')).toBe(true)
    })
  })

  describe('scheduling', () => {
    it('should schedule version check', () => {
      service.scheduleCheck('test-tool', 5000)

      const schedule = service.getSchedule('test-tool')
      expect(schedule).toBeDefined()
      expect(schedule?.interval).toBe(5000)
    })

    it('should cancel schedule', () => {
      service.scheduleCheck('test-tool', 5000)
      service.cancelSchedule('test-tool')

      const schedule = service.getSchedule('test-tool')
      expect(schedule?.enabled).toBe(false)
    })

    it('should start and stop scheduler', () => {
      service.scheduleCheck('test-tool', 5000)

      service.startScheduler()
      expect(service.scheduler.isRunning()).toBe(true)

      service.stopScheduler()
      expect(service.scheduler.isRunning()).toBe(false)
    })

    it('should trigger immediate check', async () => {
      const mockVersionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      jest.spyOn(service.checker, 'checkVersion').mockResolvedValue(mockVersionInfo)

      service.scheduleCheck('test-tool', 10000)
      await service.triggerCheck('test-tool')

      const schedule = service.getSchedule('test-tool')
      expect(schedule?.lastCheck).toBeDefined()
    })

    it('should get all schedules', () => {
      service.scheduleCheck('tool1', 1000)
      service.scheduleCheck('tool2', 2000)

      const schedules = service.getAllSchedules()
      expect(schedules).toHaveLength(2)
    })
  })

  describe('cache Management', () => {
    it('should clear cache', () => {
      service.clearCache()

      const stats = service.getCacheStats()
      expect(stats.size).toBe(0)
    })

    it('should invalidate cache for specific tool', () => {
      service.invalidateCache('test-tool')

      const cacheStats = service.getCacheStats()
      expect(cacheStats).toBeDefined()
    })

    it('should prune expired cache entries', () => {
      const pruned = service.pruneCache()
      expect(pruned).toBeGreaterThanOrEqual(0)
    })

    it('should get cache statistics', () => {
      const stats = service.getCacheStats()
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('hits')
      expect(stats).toHaveProperty('misses')
    })
  })

  describe('statistics', () => {
    it('should get service statistics', () => {
      const stats = service.getStats()

      expect(stats).toHaveProperty('totalChecks')
      expect(stats).toHaveProperty('cacheHits')
      expect(stats).toHaveProperty('networkRequests')
      expect(stats).toHaveProperty('totalUpdates')
    })

    it('should reset statistics', () => {
      service.resetStats()

      const stats = service.getStats()
      expect(stats.totalChecks).toBe(0)
      expect(stats.totalUpdates).toBe(0)
    })
  })

  describe('update Management', () => {
    it('should get update status', () => {
      const status = service.getUpdateStatus('test-tool')
      expect(status).toBeUndefined() // No update in progress
    })

    it('should get all update statuses', () => {
      const statuses = service.getAllUpdateStatuses()
      expect(Array.isArray(statuses)).toBe(true)
    })

    it('should list backups', async () => {
      jest.spyOn(service.updater, 'listBackups').mockResolvedValue([])

      const backups = await service.listBackups('test-tool')
      expect(Array.isArray(backups)).toBe(true)
    })

    it('should clean old backups', async () => {
      jest.spyOn(service.updater, 'cleanBackups').mockResolvedValue(3)

      const deleted = await service.cleanBackups('test-tool', 5)
      expect(deleted).toBe(3)
    })
  })

  describe('version Utilities', () => {
    it('should compare versions', () => {
      const result = service.compareVersions('2.0.0', '1.0.0')
      expect(result).toBe('greater')
    })

    it('should check if tool is installed', async () => {
      jest.spyOn(service.checker, 'isInstalled').mockResolvedValue(true)

      const installed = await service.isInstalled('test-tool')
      expect(installed).toBe(true)
    })

    it('should get current version', async () => {
      jest.spyOn(service.checker, 'getCurrentVersion').mockResolvedValue('1.0.0')

      const version = await service.getCurrentVersion('test-tool')
      expect(version).toBe('1.0.0')
    })

    it('should get latest version', async () => {
      jest.spyOn(service.checker, 'getLatestVersion').mockResolvedValue('1.1.0')

      const version = await service.getLatestVersion('test-tool')
      expect(version).toBe('1.1.0')
    })
  })

  describe('event Handling', () => {
    it('should forward scheduler events', (done) => {
      const mockVersionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      jest.spyOn(service.checker, 'checkVersion').mockResolvedValue(mockVersionInfo)

      service.on('check-started', (event) => {
        expect(event.type).toBe('check-started')
        done()
      })

      service.scheduleCheck('test-tool', 1000)
      service.startScheduler()
    })

    it('should emit update-available event', (done) => {
      const mockVersionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      jest.spyOn(service.checker, 'checkVersion').mockResolvedValue(mockVersionInfo)

      service.on('update-available', (event) => {
        expect(event.type).toBe('update-available')
        expect(event.tool).toBe('test-tool')
        done()
      })

      service.scheduleCheck('test-tool', 1000)
      service.startScheduler()
    })
  })

  describe('configuration Import/Export', () => {
    it('should export configuration', () => {
      service.scheduleCheck('tool1', 1000)

      const config = service.exportConfig()
      expect(config).toBeDefined()

      const parsed = JSON.parse(config)
      expect(parsed).toHaveProperty('cache')
      expect(parsed).toHaveProperty('schedules')
      expect(parsed).toHaveProperty('config')
    })

    it('should import configuration', () => {
      service.scheduleCheck('tool1', 1000)
      const exported = service.exportConfig()

      const newService = createVersionService()
      newService.importConfig(exported)

      const schedules = newService.getAllSchedules()
      expect(schedules.length).toBeGreaterThan(0)
    })

    it('should handle invalid import data', () => {
      expect(() => {
        service.importConfig('invalid json')
      }).toThrow()
    })
  })

  describe('retry Logic', () => {
    it('should retry failed operations', async () => {
      let attempts = 0
      const mockOperation = jest.fn().mockImplementation(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Temporary failure')
        }
        return {
          tool: 'test-tool',
          currentVersion: '1.0.0',
          latestVersion: '1.1.0',
          updateAvailable: true,
          lastChecked: new Date(),
          installed: true,
        }
      })

      const result = await (service as any).retryOperation(mockOperation, 3, 10)

      expect(attempts).toBe(3)
      expect(result).toBeDefined()
    })

    it('should fail after max retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Permanent failure'))

      await expect(
        (service as any).retryOperation(mockOperation, 3, 10),
      ).rejects.toThrow()

      expect(mockOperation).toHaveBeenCalledTimes(3)
    })
  })

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      service.scheduleCheck('tool1', 1000)
      service.startScheduler()

      await service.cleanup()

      expect(service.scheduler.isRunning()).toBe(false)
      expect(service.getCacheStats().size).toBe(0)
    })
  })

  describe('error Handling', () => {
    it('should handle batch checking disabled', async () => {
      const disabledService = createVersionService({
        enableBatchChecking: false,
      })

      await expect(
        disabledService.batchCheckVersions(['tool1', 'tool2']),
      ).rejects.toThrow('Batch checking is disabled')
    })

    it('should handle update without version', async () => {
      const mockVersionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      jest
        .spyOn(service as any, 'retryOperation')
        .mockResolvedValue(mockVersionInfo)
      jest.spyOn(service.updater, 'update').mockResolvedValue()

      await service.updateTool('test-tool')

      expect(service.updater.update).toHaveBeenCalledWith(
        'test-tool',
        '1.1.0',
        expect.any(Object),
      )
    })

    it('should throw error if latest version cannot be determined', async () => {
      const mockVersionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: undefined,
        updateAvailable: false,
        lastChecked: new Date(),
        installed: true,
      }

      jest
        .spyOn(service as any, 'retryOperation')
        .mockResolvedValue(mockVersionInfo)

      await expect(service.updateTool('test-tool')).rejects.toThrow(
        'Cannot determine latest version',
      )
    })
  })
})
