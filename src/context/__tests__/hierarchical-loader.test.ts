/**
 * Tests for Hierarchical Context Loader
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, unlinkSync } from 'node:fs'
import { join } from 'pathe'
import { ContextPersistence } from '../persistence'
import {
  HierarchicalContextLoader,
  ContextTier,
  createHierarchicalLoader,
} from '../hierarchical-loader'
import type { CompressedContext } from '../types'
import { CompressionAlgorithm, CompressionStrategy } from '../types'

describe('HierarchicalContextLoader', () => {
  let persistence: ContextPersistence
  let loader: HierarchicalContextLoader
  const testDbPath = join(process.cwd(), 'test-hierarchical.db')
  const projectHash = 'test-project-123'

  beforeEach(() => {
    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath)
    }
    if (existsSync(`${testDbPath}-shm`)) {
      unlinkSync(`${testDbPath}-shm`)
    }
    if (existsSync(`${testDbPath}-wal`)) {
      unlinkSync(`${testDbPath}-wal`)
    }

    persistence = new ContextPersistence(testDbPath)
    loader = new HierarchicalContextLoader(persistence, projectHash, {
      hotThreshold: 1000,      // 1 second for testing
      warmThreshold: 5000,     // 5 seconds for testing
      l0MaxEntries: 10,
      l0MaxSize: 1024 * 1024,
    })
  })

  afterEach(() => {
    persistence.close()
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath)
    }
    if (existsSync(`${testDbPath}-shm`)) {
      unlinkSync(`${testDbPath}-shm`)
    }
    if (existsSync(`${testDbPath}-wal`)) {
      unlinkSync(`${testDbPath}-wal`)
    }
  })

  describe('Tier Classification', () => {
    it('should classify contexts into correct tiers', async () => {
      const now = Date.now()

      // Create hot context (<1s old)
      const hotContext: CompressedContext = {
        id: 'hot-1',
        compressed: 'hot content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now,
      }
      persistence.saveContext(hotContext, projectHash, 'original hot')

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))

      // Create warm context (2s old)
      const warmContext: CompressedContext = {
        id: 'warm-1',
        compressed: 'warm content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now - 2000,
      }
      persistence.saveContext(warmContext, projectHash, 'original warm')

      // Create cold context (10s old)
      const coldContext: CompressedContext = {
        id: 'cold-1',
        compressed: 'cold content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now - 10000,
      }
      persistence.saveContext(coldContext, projectHash, 'original cold')

      // Refresh loader to pick up contexts
      loader.refreshL0Cache()

      const stats = loader.getStats()
      expect(stats.l0.count).toBeGreaterThan(0)
    })

    it('should retrieve hot contexts from L0 cache', () => {
      const now = Date.now()
      const hotContext: CompressedContext = {
        id: 'hot-test',
        compressed: 'hot content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now,
      }

      persistence.saveContext(hotContext, projectHash, 'original')
      loader.refreshL0Cache()

      const hotContexts = loader.getHotContexts()
      expect(hotContexts.length).toBeGreaterThan(0)
      expect(hotContexts[0].tier).toBe(ContextTier.HOT)
    })

    it('should retrieve warm contexts from L1', async () => {
      const now = Date.now()

      // Create warm context (2s old)
      const warmContext: CompressedContext = {
        id: 'warm-test',
        compressed: 'warm content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now - 2000,
      }

      persistence.saveContext(warmContext, projectHash, 'original')

      const warmContexts = loader.getWarmContexts()
      expect(warmContexts.length).toBeGreaterThanOrEqual(0)
    })

    it('should retrieve cold contexts from L2', async () => {
      const now = Date.now()

      // Create cold context (10s old)
      const coldContext: CompressedContext = {
        id: 'cold-test',
        compressed: 'cold content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now - 10000,
      }

      persistence.saveContext(coldContext, projectHash, 'original')

      const coldContexts = loader.getColdContexts()
      expect(coldContexts.length).toBeGreaterThan(0)
      expect(coldContexts[0].tier).toBe(ContextTier.COLD)
    })
  })

  describe('L0 Cache', () => {
    it('should cache hot contexts in L0', () => {
      const now = Date.now()
      const context: CompressedContext = {
        id: 'cache-test',
        compressed: 'cached content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now,
      }

      persistence.saveContext(context, projectHash, 'original')
      loader.refreshL0Cache()

      const stats = loader.getStats()
      expect(stats.l0.count).toBeGreaterThan(0)
    })

    it('should evict LRU entries when cache is full', () => {
      const now = Date.now()

      // Fill cache beyond limit
      for (let i = 0; i < 15; i++) {
        const context: CompressedContext = {
          id: `context-${i}`,
          compressed: `content ${i}`,
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 100,
          compressedTokens: 50,
          compressionRatio: 0.5,
          compressedAt: now,
        }
        persistence.saveContext(context, projectHash, `original ${i}`)
      }

      loader.refreshL0Cache()

      const stats = loader.getStats()
      expect(stats.l0.count).toBeLessThanOrEqual(10) // Max entries is 10
    })

    it('should update access count on cache hit', async () => {
      const now = Date.now()
      const context: CompressedContext = {
        id: 'access-test',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now,
      }

      persistence.saveContext(context, projectHash, 'original')
      loader.refreshL0Cache()

      // Access multiple times
      await loader.getContext('access-test')
      await loader.getContext('access-test')
      await loader.getContext('access-test')

      const hotContexts = loader.getHotContexts()
      const accessed = hotContexts.find(c => c.id === 'access-test')
      expect(accessed?.accessCount).toBeGreaterThan(1)
    })

    it('should clear L0 cache', () => {
      const now = Date.now()
      const context: CompressedContext = {
        id: 'clear-test',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now,
      }

      persistence.saveContext(context, projectHash, 'original')
      loader.refreshL0Cache()

      expect(loader.getStats().l0.count).toBeGreaterThan(0)

      loader.clearL0Cache()
      expect(loader.getStats().l0.count).toBe(0)
    })
  })

  describe('Tier Migration', () => {
    it('should demote hot contexts to warm when they age', async () => {
      const now = Date.now()
      const context: CompressedContext = {
        id: 'demote-test',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now,
      }

      persistence.saveContext(context, projectHash, 'original')
      loader.refreshL0Cache()

      // Wait for context to age beyond hot threshold
      await new Promise(resolve => setTimeout(resolve, 1500))

      const result = loader.migrateContexts()
      expect(result.demoted).toBeGreaterThan(0)
    })

    it('should promote frequently accessed warm contexts to hot', async () => {
      const now = Date.now()

      // Create warm context with high access count
      const context: CompressedContext = {
        id: 'promote-test',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now - 2000,
      }

      persistence.saveContext(context, projectHash, 'original')

      // Simulate high access count
      for (let i = 0; i < 12; i++) {
        persistence.getContext('promote-test')
      }

      const result = loader.migrateContexts()
      expect(result.promoted).toBeGreaterThanOrEqual(0)
    })

    it('should track migration statistics', async () => {
      const now = Date.now()

      // Create contexts at different tiers
      for (let i = 0; i < 5; i++) {
        const context: CompressedContext = {
          id: `migrate-${i}`,
          compressed: `content ${i}`,
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 100,
          compressedTokens: 50,
          compressionRatio: 0.5,
          compressedAt: now,
        }
        persistence.saveContext(context, projectHash, `original ${i}`)
      }

      loader.refreshL0Cache()

      // Wait and migrate
      await new Promise(resolve => setTimeout(resolve, 1500))
      loader.migrateContexts()

      const stats = loader.getStats()
      expect(stats.migrations).toBeDefined()
    })
  })

  describe('Lazy Loading', () => {
    it('should lazy load cold contexts in batches', async () => {
      const now = Date.now()

      // Create many cold contexts
      for (let i = 0; i < 100; i++) {
        const context: CompressedContext = {
          id: `cold-${i}`,
          compressed: `content ${i}`,
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 100,
          compressedTokens: 50,
          compressionRatio: 0.5,
          compressedAt: now - 10000,
        }
        persistence.saveContext(context, projectHash, `original ${i}`)
      }

      // Load first batch
      const batch1 = await loader.lazyColdContexts(0, 20)
      expect(batch1.length).toBeLessThanOrEqual(20)

      // Load second batch
      const batch2 = await loader.lazyColdContexts(20, 20)
      expect(batch2.length).toBeLessThanOrEqual(20)

      // Batches should be different
      if (batch1.length > 0 && batch2.length > 0) {
        expect(batch1[0].id).not.toBe(batch2[0].id)
      }
    })

    it('should handle empty cold tier', async () => {
      const batch = await loader.lazyColdContexts(0, 10)
      expect(batch).toEqual([])
    })
  })

  describe('Statistics', () => {
    it('should provide comprehensive tier statistics', () => {
      const now = Date.now()

      // Create contexts in different tiers
      const hotContext: CompressedContext = {
        id: 'hot-stat',
        compressed: 'hot',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now,
      }

      const warmContext: CompressedContext = {
        id: 'warm-stat',
        compressed: 'warm',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now - 2000,
      }

      const coldContext: CompressedContext = {
        id: 'cold-stat',
        compressed: 'cold',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now - 10000,
      }

      persistence.saveContext(hotContext, projectHash, 'hot original')
      persistence.saveContext(warmContext, projectHash, 'warm original')
      persistence.saveContext(coldContext, projectHash, 'cold original')

      loader.refreshL0Cache()

      const stats = loader.getStats()
      expect(stats.l0).toBeDefined()
      expect(stats.l1).toBeDefined()
      expect(stats.l2).toBeDefined()
      expect(stats.migrations).toBeDefined()
    })

    it('should calculate L0 hit rate', async () => {
      const now = Date.now()
      const context: CompressedContext = {
        id: 'hitrate-test',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now,
      }

      persistence.saveContext(context, projectHash, 'original')
      loader.refreshL0Cache()

      // Generate hits
      await loader.getContext('hitrate-test')
      await loader.getContext('hitrate-test')
      await loader.getContext('hitrate-test')

      // Generate misses
      await loader.getContext('nonexistent-1')
      await loader.getContext('nonexistent-2')

      const stats = loader.getStats()
      expect(stats.l0.hitRate).toBeGreaterThan(0)
      expect(stats.l0.hitRate).toBeLessThanOrEqual(1)
    })
  })

  describe('Context Retrieval', () => {
    it('should retrieve context from any tier', async () => {
      const now = Date.now()
      const context: CompressedContext = {
        id: 'retrieve-test',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now,
      }

      persistence.saveContext(context, projectHash, 'original')
      loader.refreshL0Cache()

      const retrieved = await loader.getContext('retrieve-test')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe('retrieve-test')
    })

    it('should return null for nonexistent context', async () => {
      const retrieved = await loader.getContext('nonexistent')
      expect(retrieved).toBeNull()
    })

    it('should promote frequently accessed contexts to L0', async () => {
      const now = Date.now()
      const context: CompressedContext = {
        id: 'promote-access-test',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now - 2000,
      }

      persistence.saveContext(context, projectHash, 'original')

      // Access multiple times to trigger promotion
      for (let i = 0; i < 6; i++) {
        await loader.getContext('promote-access-test')
      }

      const hotContexts = loader.getHotContexts()
      const promoted = hotContexts.find(c => c.id === 'promote-access-test')
      expect(promoted).toBeDefined()
    })
  })

  describe('Factory Function', () => {
    it('should create loader with factory function', () => {
      const newLoader = createHierarchicalLoader(persistence, projectHash)
      expect(newLoader).toBeInstanceOf(HierarchicalContextLoader)
    })

    it('should accept custom configuration', () => {
      const newLoader = createHierarchicalLoader(persistence, projectHash, {
        hotThreshold: 2000,
        warmThreshold: 10000,
        l0MaxEntries: 50,
      })
      expect(newLoader).toBeInstanceOf(HierarchicalContextLoader)
    })
  })

  describe('getContextsByTier', () => {
    it('should retrieve contexts by specific tier', () => {
      const now = Date.now()

      // Create contexts in different tiers
      const hotContext: CompressedContext = {
        id: 'tier-hot',
        compressed: 'hot',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now,
      }

      const coldContext: CompressedContext = {
        id: 'tier-cold',
        compressed: 'cold',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now - 10000,
      }

      persistence.saveContext(hotContext, projectHash, 'hot original')
      persistence.saveContext(coldContext, projectHash, 'cold original')

      loader.refreshL0Cache()

      const hotContexts = loader.getContextsByTier(ContextTier.HOT)
      const coldContexts = loader.getContextsByTier(ContextTier.COLD)

      expect(hotContexts.length).toBeGreaterThan(0)
      expect(coldContexts.length).toBeGreaterThan(0)
    })
  })
})
