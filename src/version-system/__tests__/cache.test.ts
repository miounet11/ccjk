/**
 * Tests for VersionCache
 */

import type { VersionInfo } from '../types'
import { VersionCache } from '../cache'

describe('versionCache', () => {
  let cache: VersionCache

  beforeEach(() => {
    cache = new VersionCache(5, 1000) // Max 5 items, 1 second TTL
  })

  describe('basic Operations', () => {
    it('should store and retrieve version info', () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('test-tool', versionInfo)
      const retrieved = cache.get('test-tool')

      expect(retrieved).toEqual(versionInfo)
    })

    it('should return null for non-existent entries', () => {
      const result = cache.get('non-existent')
      expect(result).toBeNull()
    })

    it('should check if entry exists', () => {
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
      expect(cache.has('non-existent')).toBe(false)
    })

    it('should invalidate cache entry', () => {
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

      cache.invalidate('test-tool')
      expect(cache.has('test-tool')).toBe(false)
    })

    it('should clear all entries', () => {
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

      cache.clear()
      expect(cache.size()).toBe(0)
    })
  })

  describe('tTL and Expiration', () => {
    it('should expire entries after TTL', async () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('test-tool', versionInfo, 100) // 100ms TTL

      expect(cache.has('test-tool')).toBe(true)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(cache.has('test-tool')).toBe(false)
    })

    it('should prune expired entries', async () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('tool1', versionInfo, 100)
      cache.set('tool2', versionInfo, 5000)

      expect(cache.size()).toBe(2)

      await new Promise(resolve => setTimeout(resolve, 150))

      const pruned = cache.prune()
      expect(pruned).toBe(1)
      expect(cache.size()).toBe(1)
    })

    it('should refresh cache entry TTL', () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('test-tool', versionInfo, 100)
      const refreshed = cache.refresh('test-tool', 5000)

      expect(refreshed).toBe(true)
      expect(cache.has('test-tool')).toBe(true)
    })

    it('should get time to expiry', () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('test-tool', versionInfo, 5000)
      const ttl = cache.getTimeToExpiry('test-tool')

      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(5000)
    })

    it('should identify expiring entries', async () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('tool1', versionInfo, 200)
      cache.set('tool2', versionInfo, 5000)

      await new Promise(resolve => setTimeout(resolve, 50))

      const expiring = cache.getExpiringSoon(300)
      expect(expiring).toContain('tool1')
      expect(expiring).not.toContain('tool2')
    })
  })

  describe('lRU Behavior', () => {
    it('should evict oldest entry when cache is full', () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      // Fill cache to max size (5)
      for (let i = 1; i <= 5; i++) {
        cache.set(`tool${i}`, versionInfo)
      }

      expect(cache.size()).toBe(5)

      // Add one more, should evict tool1
      cache.set('tool6', versionInfo)

      expect(cache.size()).toBe(5)
      expect(cache.has('tool1')).toBe(false)
      expect(cache.has('tool6')).toBe(true)
    })

    it('should move accessed entry to end', () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      // Fill cache
      for (let i = 1; i <= 5; i++) {
        cache.set(`tool${i}`, versionInfo)
      }

      // Access tool1 (moves to end)
      cache.get('tool1')

      // Add new entry, should evict tool2 (now oldest)
      cache.set('tool6', versionInfo)

      expect(cache.has('tool1')).toBe(true)
      expect(cache.has('tool2')).toBe(false)
    })
  })

  describe('statistics', () => {
    it('should track cache hits and misses', () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('test-tool', versionInfo)

      cache.get('test-tool') // Hit
      cache.get('non-existent') // Miss

      const stats = cache.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBe(0.5)
    })

    it('should calculate hit rate correctly', () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('test-tool', versionInfo)

      cache.get('test-tool') // Hit
      cache.get('test-tool') // Hit
      cache.get('non-existent') // Miss

      const hitRate = cache.getHitRate()
      expect(hitRate).toBeCloseTo(0.667, 2)
    })
  })

  describe('batch Operations', () => {
    it('should batch get multiple tools', () => {
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
      cache.set('tool3', versionInfo)

      const results = cache.batchGet(['tool1', 'tool2', 'tool4'])

      expect(results.size).toBe(2)
      expect(results.has('tool1')).toBe(true)
      expect(results.has('tool2')).toBe(true)
      expect(results.has('tool4')).toBe(false)
    })

    it('should batch set multiple tools', () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      const entries = new Map<string, VersionInfo>()
      entries.set('tool1', versionInfo)
      entries.set('tool2', versionInfo)
      entries.set('tool3', versionInfo)

      cache.batchSet(entries)

      expect(cache.size()).toBe(3)
      expect(cache.has('tool1')).toBe(true)
      expect(cache.has('tool2')).toBe(true)
      expect(cache.has('tool3')).toBe(true)
    })
  })

  describe('import/Export', () => {
    it('should export cache to JSON', () => {
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

      const json = cache.export()
      const data = JSON.parse(json)

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
    })

    it('should import cache from JSON', () => {
      const versionInfo: VersionInfo = {
        tool: 'test-tool',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        lastChecked: new Date(),
        installed: true,
      }

      cache.set('tool1', versionInfo)
      const json = cache.export()

      const newCache = new VersionCache()
      newCache.import(json)

      expect(newCache.size()).toBe(1)
      expect(newCache.has('tool1')).toBe(true)
    })
  })

  describe('utility Methods', () => {
    it('should get cached tools list', () => {
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
      cache.set('tool3', versionInfo)

      const tools = cache.getCachedTools()
      expect(tools).toHaveLength(3)
      expect(tools).toContain('tool1')
      expect(tools).toContain('tool2')
      expect(tools).toContain('tool3')
    })
  })
})
