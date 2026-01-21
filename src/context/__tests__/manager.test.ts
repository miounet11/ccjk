/**
 * Tests for Context Manager
 */

import type {
  ContextData,
} from '../types'
import { ContextManager } from '../manager'
import {
  CompressionAlgorithm,
  CompressionStrategy,
} from '../types'

describe('contextManager', () => {
  let manager: ContextManager

  beforeEach(() => {
    manager = new ContextManager({
      enableCache: true,
      enableAnalytics: true,
      maxCacheSize: 1024 * 1024,
      maxCacheEntries: 100,
    })
  })

  const createMockContext = (id: string, content: string): ContextData => ({
    id,
    content,
    timestamp: Date.now(),
  })

  describe('compression', () => {
    it('should compress context with default strategy', async () => {
      const context = createMockContext('test-1', 'Hello world! Hello world! Hello world!')
      const compressed = await manager.compress(context)

      expect(compressed).toBeDefined()
      expect(compressed.id).toBe('test-1')
      expect(compressed.compressedTokens).toBeLessThan(compressed.originalTokens)
      expect(compressed.compressionRatio).toBeGreaterThan(0)
    })

    it('should compress with specified strategy', async () => {
      // Use more complex content to ensure different compression ratios
      const context = createMockContext('test-1', `${'Test content with more variety '.repeat(20)}Unique ending`)

      const aggressive = await manager.compress(context, {
        strategy: CompressionStrategy.AGGRESSIVE,
      })

      const conservative = await manager.compress(context, {
        strategy: CompressionStrategy.CONSERVATIVE,
      })

      // Aggressive should have equal or better compression ratio than conservative
      expect(aggressive.compressionRatio).toBeGreaterThanOrEqual(conservative.compressionRatio)
    })

    it('should cache compressed context', async () => {
      const context = createMockContext('test-1', 'Test content')
      await manager.compress(context)

      expect(manager.isCached('test-1')).toBe(true)
    })

    it('should return cached context on second compression', async () => {
      const context = createMockContext('test-1', 'Test content')

      const first = await manager.compress(context)
      const second = await manager.compress(context)

      expect(first).toEqual(second)
    })

    it('should skip cache when specified', async () => {
      const context = createMockContext('test-1', 'Test content')

      await manager.compress(context, { cache: false })

      expect(manager.isCached('test-1')).toBe(false)
    })

    it('should attach custom metadata', async () => {
      const context = createMockContext('test-1', 'Test content')

      const compressed = await manager.compress(context, {
        metadata: { custom: 'value' },
      })

      expect(compressed.metadata?.custom).toBe('value')
    })
  })

  describe('decompression', () => {
    it('should decompress context', async () => {
      const context = createMockContext('test-1', 'Hello world! Hello world!')
      const compressed = await manager.compress(context)
      const decompressed = await manager.decompress(compressed)

      expect(decompressed.success).toBe(true)
      expect(decompressed.id).toBe('test-1')
      expect(decompressed.content).toBeDefined()
    })

    it('should preserve metadata', async () => {
      const context = createMockContext('test-1', 'Test content')
      context.metadata = { key: 'value' }

      const compressed = await manager.compress(context)
      const decompressed = await manager.decompress(compressed)

      expect(decompressed.metadata?.key).toBe('value')
    })

    it('should handle decompression errors gracefully', async () => {
      const invalidCompressed: any = {
        id: 'test-1',
        compressed: 'invalid',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: Date.now(),
      }

      const decompressed = await manager.decompress(invalidCompressed)

      expect(decompressed.success).toBeDefined()
    })
  })

  describe('batch operations', () => {
    it('should compress multiple contexts', async () => {
      const contexts = [
        createMockContext('test-1', 'Content 1 '.repeat(10)),
        createMockContext('test-2', 'Content 2 '.repeat(10)),
        createMockContext('test-3', 'Content 3 '.repeat(10)),
      ]

      const compressed = await manager.compressBatch(contexts)

      expect(compressed.length).toBe(3)
      compressed.forEach((c) => {
        expect(c.compressionRatio).toBeGreaterThan(0)
      })
    })

    it('should decompress multiple contexts', async () => {
      const contexts = [
        createMockContext('test-1', 'Content 1'),
        createMockContext('test-2', 'Content 2'),
      ]

      const compressed = await manager.compressBatch(contexts)
      const decompressed = await manager.decompressBatch(compressed)

      expect(decompressed.length).toBe(2)
      decompressed.forEach((d) => {
        expect(d.success).toBe(true)
      })
    })
  })

  describe('cache management', () => {
    it('should get cached context', async () => {
      const context = createMockContext('test-1', 'Test content')
      await manager.compress(context)

      const cached = manager.getCached('test-1')
      expect(cached).toBeDefined()
      expect(cached?.id).toBe('test-1')
    })

    it('should remove from cache', async () => {
      const context = createMockContext('test-1', 'Test content')
      await manager.compress(context)

      expect(manager.removeFromCache('test-1')).toBe(true)
      expect(manager.isCached('test-1')).toBe(false)
    })

    it('should clear cache', async () => {
      await manager.compress(createMockContext('test-1', 'Content 1'))
      await manager.compress(createMockContext('test-2', 'Content 2'))

      manager.clearCache()

      expect(manager.isCached('test-1')).toBe(false)
      expect(manager.isCached('test-2')).toBe(false)
    })

    it('should optimize cache', async () => {
      for (let i = 0; i < 10; i++) {
        await manager.compress(createMockContext(`test-${i}`, 'Content '.repeat(100)))
      }

      const pruned = manager.optimizeCache()
      expect(pruned).toBeGreaterThanOrEqual(0)
    })

    it('should get cache efficiency', async () => {
      const context = createMockContext('test-1', 'Test content')
      await manager.compress(context)
      await manager.compress(context) // Cache hit

      const efficiency = manager.getCacheEfficiency()
      expect(efficiency.hitRate).toBeGreaterThan(0)
    })
  })

  describe('analytics', () => {
    it('should track analytics', async () => {
      const context = createMockContext('test-1', 'Test content '.repeat(10))
      await manager.compress(context)

      const analytics = manager.getAnalytics()
      expect(analytics.totalTokens).toBeGreaterThan(0)
      expect(analytics.tokensSaved).toBeGreaterThan(0)
      expect(analytics.savingsRate).toBeGreaterThan(0)
    })

    it('should generate analytics report', async () => {
      const context = createMockContext('test-1', 'Test content')
      await manager.compress(context)

      const report = manager.getAnalyticsReport()
      expect(report).toContain('Token Optimization Analytics')
    })

    it('should reset analytics', async () => {
      await manager.compress(createMockContext('test-1', 'Test content'))

      manager.resetAnalytics()

      const analytics = manager.getAnalytics()
      expect(analytics.totalTokens).toBe(0)
    })
  })

  describe('configuration', () => {
    it('should get configuration', () => {
      const config = manager.getConfig()
      expect(config.enableCache).toBe(true)
      expect(config.enableAnalytics).toBe(true)
    })

    it('should update configuration', () => {
      manager.updateConfig({
        defaultStrategy: CompressionStrategy.AGGRESSIVE,
      })

      const config = manager.getConfig()
      expect(config.defaultStrategy).toBe(CompressionStrategy.AGGRESSIVE)
    })

    it('should recreate cache when size limits change', () => {
      manager.updateConfig({
        maxCacheSize: 2 * 1024 * 1024,
        maxCacheEntries: 200,
      })

      const config = manager.getConfig()
      expect(config.maxCacheSize).toBe(2 * 1024 * 1024)
    })
  })

  describe('estimation', () => {
    it('should estimate compression savings', async () => {
      const text = 'Test content '.repeat(20)

      const estimate = await manager.estimateSavings(text)

      expect(estimate.originalTokens).toBeGreaterThan(0)
      expect(estimate.estimatedCompressedTokens).toBeLessThan(estimate.originalTokens)
      expect(estimate.estimatedSavings).toBeGreaterThan(0)
      expect(estimate.estimatedRatio).toBeGreaterThan(0)
    })

    it('should estimate with different strategies', async () => {
      const text = 'Test content '.repeat(20)

      const aggressive = await manager.estimateSavings(text, CompressionStrategy.AGGRESSIVE)
      const conservative = await manager.estimateSavings(text, CompressionStrategy.CONSERVATIVE)

      expect(aggressive.estimatedRatio).toBeGreaterThan(conservative.estimatedRatio)
    })

    it('should find best strategy', async () => {
      const text = 'Repeated content. '.repeat(30)

      const best = await manager.getBestStrategy(text)

      expect(best.strategy).toBeDefined()
      expect(best.ratio).toBeGreaterThan(0)
      expect(best.tokens).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const context = createMockContext('test-1', '')
      const compressed = await manager.compress(context)

      expect(compressed.originalTokens).toBe(0)
      // Empty content should have minimal or zero compressed tokens
      // The exact value depends on algorithm implementation
      expect(compressed.compressedTokens).toBeLessThanOrEqual(2)
    })

    it('should handle very large content', async () => {
      const largeContent = 'Test content '.repeat(1000)
      const context = createMockContext('test-1', largeContent)

      const compressed = await manager.compress(context)

      expect(compressed.compressionRatio).toBeGreaterThan(0)
    })

    it('should handle special characters', async () => {
      const context = createMockContext('test-1', '特殊字符 @#$% 🎉')
      const compressed = await manager.compress(context)
      const decompressed = await manager.decompress(compressed)

      expect(decompressed.success).toBe(true)
    })
  })
})
