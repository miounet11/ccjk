/**
 * Tests for Token Analytics Tracker
 */

import type {
  CacheStats,
  CompressedContext,
} from '../types'
import { TokenAnalyticsTracker } from '../analytics'
import {
  CompressionAlgorithm,
  CompressionStrategy,
} from '../types'

describe('tokenAnalyticsTracker', () => {
  let tracker: TokenAnalyticsTracker

  beforeEach(() => {
    tracker = new TokenAnalyticsTracker()
  })

  const createMockContext = (
    originalTokens: number,
    compressedTokens: number,
    algorithm: CompressionAlgorithm = CompressionAlgorithm.COMBINED,
    strategy: CompressionStrategy = CompressionStrategy.BALANCED,
  ): CompressedContext => ({
    id: `test-${Date.now()}`,
    compressed: 'compressed',
    algorithm,
    strategy,
    originalTokens,
    compressedTokens,
    compressionRatio: 1 - (compressedTokens / originalTokens),
    compressedAt: Date.now(),
  })

  describe('recording operations', () => {
    it('should record compression operation', () => {
      const context = createMockContext(1000, 200)
      tracker.recordCompression(context, 10)

      const analytics = tracker.getAnalytics()
      expect(analytics.totalTokens).toBe(1000)
      expect(analytics.tokensSaved).toBe(800)
      expect(analytics.savingsRate).toBe(0.8)
    })

    it('should record multiple compressions', () => {
      tracker.recordCompression(createMockContext(1000, 200), 10)
      tracker.recordCompression(createMockContext(500, 100), 5)

      const analytics = tracker.getAnalytics()
      expect(analytics.totalTokens).toBe(1500)
      expect(analytics.tokensSaved).toBe(1200)
    })

    it('should record decompression operation', () => {
      tracker.recordDecompression(5)
      tracker.recordDecompression(10)

      const analytics = tracker.getAnalytics()
      expect(analytics.performance.totalOperations).toBe(2)
    })

    it('should track compression times', () => {
      tracker.recordCompression(createMockContext(1000, 200), 10)
      tracker.recordCompression(createMockContext(1000, 200), 20)

      const analytics = tracker.getAnalytics()
      expect(analytics.performance.avgCompressionTime).toBe(15)
    })

    it('should track decompression times', () => {
      tracker.recordDecompression(5)
      tracker.recordDecompression(15)

      const analytics = tracker.getAnalytics()
      expect(analytics.performance.avgDecompressionTime).toBe(10)
    })
  })

  describe('compression statistics', () => {
    it('should track statistics by algorithm', () => {
      tracker.recordCompression(
        createMockContext(1000, 200, CompressionAlgorithm.LZ),
        10,
      )
      tracker.recordCompression(
        createMockContext(500, 100, CompressionAlgorithm.SEMANTIC),
        5,
      )

      const stats = tracker.getCompressionStats()
      expect(stats.byAlgorithm[CompressionAlgorithm.LZ]).toBeDefined()
      expect(stats.byAlgorithm[CompressionAlgorithm.SEMANTIC]).toBeDefined()
    })

    it('should track statistics by strategy', () => {
      tracker.recordCompression(
        createMockContext(1000, 200, CompressionAlgorithm.COMBINED, CompressionStrategy.AGGRESSIVE),
        10,
      )
      tracker.recordCompression(
        createMockContext(500, 150, CompressionAlgorithm.COMBINED, CompressionStrategy.CONSERVATIVE),
        5,
      )

      const stats = tracker.getCompressionStats()
      expect(stats.byStrategy[CompressionStrategy.AGGRESSIVE]).toBeDefined()
      expect(stats.byStrategy[CompressionStrategy.CONSERVATIVE]).toBeDefined()
    })

    it('should calculate average compression ratio', () => {
      tracker.recordCompression(createMockContext(1000, 200), 10) // 80% ratio
      tracker.recordCompression(createMockContext(1000, 400), 10) // 60% ratio

      const stats = tracker.getCompressionStats()
      expect(stats.averageCompressionRatio).toBeCloseTo(0.7, 2)
    })

    it('should track total contexts', () => {
      tracker.recordCompression(createMockContext(1000, 200), 10)
      tracker.recordCompression(createMockContext(500, 100), 5)

      const stats = tracker.getCompressionStats()
      expect(stats.totalContexts).toBe(2)
    })
  })

  describe('cache statistics', () => {
    it('should update cache statistics', () => {
      const cacheStats: CacheStats = {
        totalEntries: 10,
        totalSize: 1024,
        hits: 50,
        misses: 10,
        hitRate: 0.833,
        evictions: 2,
      }

      tracker.updateCacheStats(cacheStats)

      const analytics = tracker.getAnalytics()
      expect(analytics.cacheStats).toEqual(cacheStats)
    })
  })

  describe('performance summary', () => {
    it('should calculate performance metrics', () => {
      tracker.recordCompression(createMockContext(1000, 200), 10)
      tracker.recordCompression(createMockContext(1000, 200), 20)
      tracker.recordDecompression(5)

      const perf = tracker.getPerformanceSummary()
      expect(perf.avgCompressionTime).toBe(15)
      expect(perf.avgDecompressionTime).toBe(5)
      expect(perf.totalOperations).toBe(3)
      expect(perf.compressionThroughput).toBeGreaterThan(0)
    })

    it('should handle no operations', () => {
      const perf = tracker.getPerformanceSummary()
      expect(perf.avgCompressionTime).toBe(0)
      expect(perf.avgDecompressionTime).toBe(0)
      expect(perf.totalOperations).toBe(0)
    })
  })

  describe('reset', () => {
    it('should reset all statistics', () => {
      tracker.recordCompression(createMockContext(1000, 200), 10)
      tracker.recordDecompression(5)

      tracker.reset()

      const analytics = tracker.getAnalytics()
      expect(analytics.totalTokens).toBe(0)
      expect(analytics.tokensSaved).toBe(0)
      expect(analytics.performance.totalOperations).toBe(0)
    })
  })

  describe('export and reporting', () => {
    it('should export to JSON', () => {
      tracker.recordCompression(createMockContext(1000, 200), 10)

      const json = tracker.exportToJSON()
      expect(json).toBeDefined()
      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('should generate human-readable report', () => {
      tracker.recordCompression(createMockContext(1000, 200), 10)

      const report = tracker.getReport()
      expect(report).toContain('Token Optimization Analytics')
      expect(report).toContain('Total Tokens Processed')
      expect(report).toContain('Savings Rate')
    })

    it('should include all sections in report', () => {
      tracker.recordCompression(createMockContext(1000, 200), 10)
      tracker.recordDecompression(5)

      const cacheStats: CacheStats = {
        totalEntries: 5,
        totalSize: 1024,
        hits: 10,
        misses: 2,
        hitRate: 0.833,
        evictions: 1,
      }
      tracker.updateCacheStats(cacheStats)

      const report = tracker.getReport()
      expect(report).toContain('Overall Statistics')
      expect(report).toContain('Compression Statistics')
      expect(report).toContain('Performance')
      expect(report).toContain('Cache Statistics')
    })
  })

  describe('edge cases', () => {
    it('should handle zero tokens', () => {
      tracker.recordCompression(createMockContext(0, 0), 0)

      const analytics = tracker.getAnalytics()
      expect(analytics.savingsRate).toBe(0)
    })

    it('should handle large numbers', () => {
      tracker.recordCompression(createMockContext(1000000, 200000), 100)

      const analytics = tracker.getAnalytics()
      expect(analytics.totalTokens).toBe(1000000)
      expect(analytics.tokensSaved).toBe(800000)
    })

    it('should limit stored compression times', () => {
      // Record more than 1000 compressions
      for (let i = 0; i < 1500; i++) {
        tracker.recordCompression(createMockContext(100, 20), 10)
      }

      const analytics = tracker.getAnalytics()
      // Should still calculate average correctly
      expect(analytics.performance.avgCompressionTime).toBe(10)
    })
  })
})
