/**
 * Tests for VersionChecker
 */

import type { VersionInfo } from '../types'
import { VersionCache } from '../cache'
import { VersionChecker } from '../checker'

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
}))

describe('versionChecker', () => {
  let checker: VersionChecker
  let cache: VersionCache

  beforeEach(() => {
    cache = new VersionCache()
    checker = new VersionChecker(cache)
    jest.clearAllMocks()
  })

  describe('version Comparison', () => {
    it('should compare versions correctly', () => {
      expect(checker.compareVersions('2.0.0', '1.0.0')).toBe('greater')
      expect(checker.compareVersions('1.0.0', '2.0.0')).toBe('less')
      expect(checker.compareVersions('1.0.0', '1.0.0')).toBe('equal')
    })

    it('should handle different version formats', () => {
      expect(checker.compareVersions('1.2.3', '1.2.2')).toBe('greater')
      expect(checker.compareVersions('1.2', '1.2.0')).toBe('equal')
      expect(checker.compareVersions('2.0', '1.9.9')).toBe('greater')
    })

    it('should return invalid for malformed versions', () => {
      expect(checker.compareVersions('invalid', '1.0.0')).toBe('invalid')
      expect(checker.compareVersions('1.0.0', 'invalid')).toBe('invalid')
    })
  })

  describe('cache Integration', () => {
    it('should use cached version info', async () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('test-tool', versionInfo)

      const result = await checker.checkVersion('test-tool')
      expect(result).toEqual(versionInfo)

      const stats = checker.getStats()
      expect(stats.cacheHits).toBe(1)
      expect(stats.networkRequests).toBe(0)
    })

    it('should bypass cache when force is true', async () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('test-tool', versionInfo)

      // Mock the check to avoid actual network calls
      jest.spyOn(checker as any, 'performCheck').mockResolvedValue(versionInfo)

      await checker.checkVersion('test-tool', { force: true })

      const stats = checker.getStats()
      expect(stats.cacheHits).toBe(0)
    })

    it('should invalidate cache for a tool', async () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('test-tool', versionInfo)
      expect(cache.has('test-tool')).toBe(true)

      checker.invalidateCache('test-tool')
      expect(cache.has('test-tool')).toBe(false)
    })

    it('should clear all cache', () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('tool1', versionInfo)
      cache.set('tool2', versionInfo)

      expect(cache.size()).toBe(2)

      checker.clearCache()
      expect(cache.size()).toBe(0)
    })
  })

  describe('batch Checking', () => {
    it('should batch check multiple tools', async () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      // Cache some tools
      cache.set('tool1', versionInfo)
      cache.set('tool2', versionInfo)

      // Mock check for uncached tool
      jest.spyOn(checker as any, 'performCheck').mockResolvedValue(versionInfo)

      const result = await checker.batchCheck(['tool1', 'tool2', 'tool3'])

      expect(result.tools).toHaveLength(3)
      expect(result.results.size).toBeGreaterThan(0)
      expect(result.cacheHits).toBe(2)
    })

    it('should handle errors in batch check', async () => {
      jest
        .spyOn(checker as any, 'performCheck')
        .mockRejectedValue(new Error('Check failed'))

      const result = await checker.batchCheck(['tool1', 'tool2'])

      expect(result.errors.size).toBeGreaterThan(0)
    })

    it('should measure batch check duration', async () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('tool1', versionInfo)
      cache.set('tool2', versionInfo)

      const result = await checker.batchCheck(['tool1', 'tool2'])

      expect(result.duration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('statistics', () => {
    it('should track check statistics', async () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('tool1', versionInfo)

      await checker.checkVersion('tool1') // Cache hit

      const stats = checker.getStats()
      expect(stats.totalChecks).toBe(1)
      expect(stats.cacheHits).toBe(1)
      expect(stats.networkRequests).toBe(0)
    })

    it('should calculate average check time', async () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('tool1', versionInfo)
      cache.set('tool2', versionInfo)

      await checker.checkVersion('tool1')
      await checker.checkVersion('tool2')

      const stats = checker.getStats()
      expect(stats.averageCheckTime).toBeGreaterThanOrEqual(0)
    })

    it('should reset statistics', async () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('tool1', versionInfo)
      await checker.checkVersion('tool1')

      let stats = checker.getStats()
      expect(stats.totalChecks).toBe(1)

      checker.resetStats()

      stats = checker.getStats()
      expect(stats.totalChecks).toBe(0)
      expect(stats.cacheHits).toBe(0)
    })
  })

  describe('concurrent Checks', () => {
    it('should deduplicate concurrent checks for same tool', async () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      let checkCount = 0
      jest.spyOn(checker as any, 'performCheck').mockImplementation(async () => {
        checkCount++
        await new Promise(resolve => setTimeout(resolve, 100))
        return versionInfo
      })

      // Start multiple concurrent checks
      const promises = [
        checker.checkVersion('test-tool', { force: true }),
        checker.checkVersion('test-tool', { force: true }),
        checker.checkVersion('test-tool', { force: true }),
      ]

      await Promise.all(promises)

      // Should only perform one actual check
      expect(checkCount).toBe(1)
    })
  })

  describe('error Handling', () => {
    it('should track failed checks', async () => {
      jest
        .spyOn(checker as any, 'performCheck')
        .mockRejectedValue(new Error('Check failed'))

      try {
        await checker.checkVersion('test-tool', { force: true })
      }
      catch (error) {
        // Expected
      }

      const stats = checker.getStats()
      expect(stats.failedChecks).toBe(1)
    })

    it('should handle timeout errors', async () => {
      jest.spyOn(checker as any, 'performCheck').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
        throw new Error('Timeout')
      })

      await expect(
        checker.checkVersion('test-tool', { force: true, timeout: 100 }),
      ).rejects.toThrow()
    })
  })

  describe('version Parsing', () => {
    it('should parse version from various formats', () => {
      const parseVersion = (checker as any).parseVersion.bind(checker)

      expect(parseVersion('version 1.2.3')).toBe('1.2.3')
      expect(parseVersion('v1.2.3')).toBe('1.2.3')
      expect(parseVersion('1.2.3')).toBe('1.2.3')
      expect(parseVersion('node version 14.17.0')).toBe('14.17.0')
    })

    it('should return undefined for unparseable output', () => {
      const parseVersion = (checker as any).parseVersion.bind(checker)

      expect(parseVersion('no version here')).toBeUndefined()
      expect(parseVersion('')).toBeUndefined()
    })
  })

  describe('cache Access', () => {
    it('should provide access to cache instance', () => {
      const cacheInstance = checker.getCache()
      expect(cacheInstance).toBe(cache)
    })

    it('should get cache statistics', () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('tool1', versionInfo)

      const stats = checker.getStats()
      expect(stats.cacheStats).toBeDefined()
      expect(stats.cacheStats.size).toBe(1)
    })
  })
})
