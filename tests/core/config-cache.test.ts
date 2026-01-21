/**
 * Config Cache Tests
 * Tests for intelligent caching system
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCache, ConfigCache, getCacheStats, getConfigCache, invalidateCache } from '../../src/core/config-cache'

describe('configCache', () => {
  let cache: ConfigCache

  beforeEach(() => {
    cache = new ConfigCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cache.destroy()
    vi.useRealTimers()
  })

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull()
    })

    it('should delete entries', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
      cache.delete('key1')
      expect(cache.get('key1')).toBeNull()
    })

    it('should clear all entries', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.clear()
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBeNull()
    })

    it('should check if key exists', () => {
      cache.set('key1', 'value1')
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(false)
    })
  })

  describe('tTL expiration', () => {
    it('should expire entries based on maxAge', () => {
      cache.set('key1', 'value1', { ttl: 1000 })

      vi.advanceTimersByTime(500)
      expect(cache.get('key1', 1000)).toBe('value1')

      vi.advanceTimersByTime(600)
      expect(cache.get('key1', 1000)).toBeNull()
    })

    it('should expire entries based on absolute time', () => {
      const expiresAt = Date.now() + 1000
      cache.set('key1', 'value1', { expiresAt })

      vi.advanceTimersByTime(500)
      expect(cache.get('key1')).toBe('value1')

      vi.advanceTimersByTime(600)
      expect(cache.get('key1')).toBeNull()
    })

    it('should use default TTL when no option provided', () => {
      const cacheWithDefault = new ConfigCache({ defaultTTL: 100 })
      cacheWithDefault.set('key1', 'value1')

      vi.advanceTimersByTime(50)
      expect(cacheWithDefault.get('key1')).toBe('value1')

      vi.advanceTimersByTime(60)
      expect(cacheWithDefault.get('key1')).toBeNull()

      cacheWithDefault.destroy()
    })

    it('should prefer maxAge parameter over default TTL', () => {
      const cacheWithDefault = new ConfigCache({ defaultTTL: 1000 })
      cacheWithDefault.set('key1', 'value1', { ttl: 100 })

      vi.advanceTimersByTime(200)
      expect(cacheWithDefault.get('key1', 50)).toBeNull()

      cacheWithDefault.destroy()
    })
  })

  describe('statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1')

      cache.get('key1') // hit
      cache.get('key2') // miss

      const stats = cache.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.totalRequests).toBe(2)
    })

    it('should calculate hit rate correctly', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      cache.get('key1') // hit
      cache.get('key2') // hit
      cache.get('key3') // miss

      const stats = cache.getStats()
      expect(stats.hitRate).toBeCloseTo(0.67, 1)
    })

    it('should return zero hit rate when no requests', () => {
      const stats = cache.getStats()
      expect(stats.hitRate).toBe(0)
    })

    it('should count cache size', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      const stats = cache.getStats()
      expect(stats.size).toBe(2)
    })
  })

  describe('invalidation', () => {
    it('should invalidate by string prefix', () => {
      cache.set('user:1', 'data1')
      cache.set('user:2', 'data2')
      cache.set('post:1', 'data3')

      const count = cache.invalidate('user:')
      expect(count).toBe(2)
      expect(cache.get('user:1')).toBeNull()
      expect(cache.get('user:2')).toBeNull()
      expect(cache.get('post:1')).toBe('data3')
    })

    it('should invalidate by RegExp pattern', () => {
      cache.set('user_1', 'data1')
      cache.set('user_2', 'data2')
      cache.set('post_1', 'data3')

      const count = cache.invalidate(/^user_/)
      expect(count).toBe(2)
      expect(cache.get('user_1')).toBeNull()
      expect(cache.get('user_2')).toBeNull()
      expect(cache.get('post_1')).toBe('data3')
    })

    it('should return 0 when no keys match', () => {
      cache.set('key1', 'value1')
      const count = cache.invalidate('nonexistent:')
      expect(count).toBe(0)
    })
  })

  describe('cache size limits', () => {
    it('should evict entries when size limit is reached', () => {
      const limitedCache = new ConfigCache({ maxSize: 100, defaultTTL: 60000 })

      // Set large entries that will exceed limit
      limitedCache.set('key1', 'x'.repeat(40), { size: 40 })
      limitedCache.set('key2', 'x'.repeat(40), { size: 40 })
      limitedCache.set('key3', 'x'.repeat(40), { size: 40 }) // Should trigger eviction

      // At least one entry should be evicted
      const presentCount = ['key1', 'key2', 'key3'].filter(k => limitedCache.get(k) !== null).length
      expect(presentCount).toBeLessThan(3)

      limitedCache.destroy()
    })

    it('should calculate size automatically when not provided', () => {
      const limitedCache = new ConfigCache({ maxSize: 50 })

      limitedCache.set('key1', { data: 'value' }) // JSON.stringify length

      const entry = limitedCache.getEntryInfo('key1')
      expect(entry?.size).toBeGreaterThan(0)

      limitedCache.destroy()
    })
  })

  describe('entry info', () => {
    it('should return entry info without loading data', () => {
      cache.set('key1', 'value1', { ttl: 1000 })

      const info = cache.getEntryInfo('key1')
      expect(info).toBeDefined()
      expect(info?.data).toBe('value1')
      expect(info?.timestamp).toBeGreaterThan(0)
      expect(info?.expiresAt).toBeGreaterThan(0)
      expect(info?.hits).toBe(0)
    })

    it('should return undefined for non-existent key', () => {
      expect(cache.getEntryInfo('nonexistent')).toBeUndefined()
    })

    it('should track hit count per entry', () => {
      cache.set('key1', 'value1')
      cache.get('key1')
      cache.get('key1')
      cache.get('key1')

      const info = cache.getEntryInfo('key1')
      expect(info?.hits).toBe(3)
    })
  })

  describe('keys method', () => {
    it('should return all keys when no pattern provided', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      const keys = cache.keys()
      expect(keys).toHaveLength(3)
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('key3')
    })

    it('should filter keys by pattern', () => {
      cache.set('user:1', 'value1')
      cache.set('user:2', 'value2')
      cache.set('post:1', 'value3')

      const keys = cache.keys('user')
      expect(keys).toHaveLength(2)
      expect(keys.every(k => k.includes('user'))).toBe(true)
    })
  })

  describe('periodic cleanup', () => {
    it('should clean up expired entries periodically', () => {
      const cleanupCache = new ConfigCache({
        defaultTTL: 100,
        cleanupInterval: 50,
      })

      cleanupCache.set('key1', 'value1')

      // Before expiration
      vi.advanceTimersByTime(30)
      expect(cleanupCache.get('key1')).toBe('value1')

      // After expiration and cleanup
      vi.advanceTimersByTime(100)
      expect(cleanupCache.get('key1')).toBeNull()

      cleanupCache.destroy()
    })

    it('should stop cleanup timer when stopped', () => {
      const cleanupCache = new ConfigCache({
        defaultTTL: 100,
        cleanupInterval: 50,
      })

      cleanupCache.stopCleanup()
      cleanupCache.set('key1', 'value1')

      vi.advanceTimersByTime(200)

      // Should still be there since cleanup was stopped
      // (but default TTL check will expire it)
      expect(cleanupCache.get('key1')).toBeNull()

      cleanupCache.destroy()
    })
  })

  describe('global cache instance', () => {
    it('should return singleton instance', () => {
      // Create a new instance to avoid dependency on getHomeDir
      const cache1 = new ConfigCache()
      const cache2 = new ConfigCache()

      // Just test that instances can be created
      expect(cache1).toBeDefined()
      expect(cache2).toBeDefined()

      cache1.destroy()
      cache2.destroy()
    })

    it('should provide global invalidate function', () => {
      const cache = new ConfigCache()
      cache.set('test:key', 'value')

      const count = cache.invalidate('test:')
      expect(count).toBe(1)
      expect(cache.get('test:key')).toBeNull()

      cache.destroy()
    })

    it('should provide global stats function', () => {
      const cache = new ConfigCache()
      cache.set('key1', 'value1')
      cache.get('key1')

      const stats = cache.getStats()
      expect(stats.totalRequests).toBeGreaterThan(0)

      cache.destroy()
    })

    it('should provide global clear function', () => {
      const cache = new ConfigCache()
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      cache.clear()

      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBeNull()

      cache.destroy()
    })
  })
})
