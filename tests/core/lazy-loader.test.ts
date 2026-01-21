/**
 * Lazy Loader Tests
 * Tests for progressive module loading system
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LazyLoader } from '../../src/core/lazy-loader'

describe('lazyLoader', () => {
  beforeEach(() => {
    LazyLoader.clearCache()
    vi.clearAllMocks()
  })

  afterEach(() => {
    LazyLoader.clearCache()
  })

  describe('getLoadOrder', () => {
    it('should return load order array', () => {
      const order = LazyLoader.getLoadOrder()

      expect(Array.isArray(order)).toBe(true)
      expect(order.length).toBeGreaterThan(0)
      expect(order[0]).toBe('src/utils/config')
    })

    it('should include all expected modules', () => {
      const order = LazyLoader.getLoadOrder()

      expect(order).toContain('src/utils/config')
      expect(order).toContain('src/utils/platform')
      expect(order).toContain('src/commands/init')
      expect(order).toContain('src/commands/menu')
    })
  })

  describe('getStats', () => {
    it('should return statistics', () => {
      const stats = LazyLoader.getStats()

      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('loaded')
      expect(stats).toHaveProperty('loading')
      expect(stats).toHaveProperty('failed')
      expect(stats).toHaveProperty('cached')
    })

    it('should have initial stats', () => {
      const stats = LazyLoader.getStats()
      expect(stats.total).toBeGreaterThan(0)
      expect(stats.loaded).toBe(0)
      expect(stats.loading).toBe(0)
      expect(stats.failed).toBe(0)
    })
  })

  describe('clearCache', () => {
    it('should not throw', () => {
      expect(() => LazyLoader.clearCache()).not.toThrow()
    })

    it('should reset stats', () => {
      LazyLoader.clearCache()
      const stats = LazyLoader.getStats()
      expect(stats.loaded).toBe(0)
      expect(stats.failed).toBe(0)
    })
  })

  describe('isLoaded', () => {
    it('should return false for non-loaded modules', () => {
      expect(LazyLoader.isLoaded('src/commands/test')).toBe(false)
    })

    it('should return false for unknown modules', () => {
      expect(LazyLoader.isLoaded('nonexistent')).toBe(false)
    })
  })

  describe('preloadCommonCommands', () => {
    it('should schedule preload without blocking', async () => {
      const start = Date.now()
      await LazyLoader.preloadCommonCommands()
      const duration = Date.now() - start

      // Should return quickly (scheduling, not loading)
      expect(duration).toBeLessThan(200)
    })
  })
})
