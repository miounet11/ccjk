/**
 * Context Migration Tests
 */

import { existsSync, rmSync } from 'node:fs'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ContextCache } from '../cache'
import { CompressionAlgorithm, CompressionStrategy } from '../types'
import type { CompressedContext } from '../types'
import {
  migrateCacheToPersistence,
  restoreCacheFromPersistence,
  syncCacheAndPersistence,
  verifyMigration,
} from '../migration'
import { ContextPersistence } from '../persistence'

describe('Context Migration', () => {
  let cache: ContextCache
  let persistence: ContextPersistence
  let testDbPath: string
  const projectHash = 'test-project-hash'

  beforeEach(() => {
    cache = new ContextCache()
    testDbPath = join(process.cwd(), '.test-migration.db')
    persistence = new ContextPersistence(testDbPath)
  })

  afterEach(() => {
    cache.clear()
    persistence.close()
    if (existsSync(testDbPath)) {
      rmSync(testDbPath, { force: true })
    }
    if (existsSync(`${testDbPath}-wal`)) {
      rmSync(`${testDbPath}-wal`, { force: true })
    }
    if (existsSync(`${testDbPath}-shm`)) {
      rmSync(`${testDbPath}-shm`, { force: true })
    }
  })

  describe('migrateCacheToPersistence', () => {
    it('should migrate cache entries to persistence', async () => {
      // Add contexts to cache
      const contexts: CompressedContext[] = [
        {
          id: 'cache-1',
          compressed: 'content-1',
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000,
          compressedTokens: 200,
          compressionRatio: 0.8,
          compressedAt: Date.now(),
        },
        {
          id: 'cache-2',
          compressed: 'content-2',
          algorithm: CompressionAlgorithm.LZ,
          strategy: CompressionStrategy.AGGRESSIVE,
          originalTokens: 2000,
          compressedTokens: 300,
          compressionRatio: 0.85,
          compressedAt: Date.now(),
        },
      ]

      contexts.forEach(c => cache.set(c.id, c))

      // Migrate
      const result = await migrateCacheToPersistence(cache, projectHash, persistence)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(2)
      expect(result.failedCount).toBe(0)
      expect(result.errors).toHaveLength(0)

      // Verify persistence
      const persisted1 = persistence.getContext('cache-1')
      const persisted2 = persistence.getContext('cache-2')

      expect(persisted1).toBeTruthy()
      expect(persisted2).toBeTruthy()
      expect(persisted1?.compressed).toBe('content-1')
      expect(persisted2?.compressed).toBe('content-2')
    })

    it('should handle empty cache', async () => {
      const result = await migrateCacheToPersistence(cache, projectHash, persistence)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(0)
      expect(result.failedCount).toBe(0)
    })

    it('should report duration', async () => {
      const context: CompressedContext = {
        id: 'test',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }

      cache.set(context.id, context)

      const result = await migrateCacheToPersistence(cache, projectHash, persistence)

      expect(result.duration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('restoreCacheFromPersistence', () => {
    it('should restore cache from persistence', async () => {
      // Add contexts to persistence
      const contexts: CompressedContext[] = [
        {
          id: 'persist-1',
          compressed: 'content-1',
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000,
          compressedTokens: 200,
          compressionRatio: 0.8,
          compressedAt: Date.now(),
        },
        {
          id: 'persist-2',
          compressed: 'content-2',
          algorithm: CompressionAlgorithm.SEMANTIC,
          strategy: CompressionStrategy.CONSERVATIVE,
          originalTokens: 1500,
          compressedTokens: 400,
          compressionRatio: 0.733,
          compressedAt: Date.now(),
        },
      ]

      contexts.forEach(c => persistence.saveContext(c, projectHash))

      // Restore to cache
      const result = await restoreCacheFromPersistence(cache, projectHash, persistence)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(2)
      expect(result.failedCount).toBe(0)

      // Verify cache
      const cached1 = cache.get('persist-1')
      const cached2 = cache.get('persist-2')

      expect(cached1).toBeTruthy()
      expect(cached2).toBeTruthy()
      expect(cached1?.compressed).toBe('content-1')
      expect(cached2?.compressed).toBe('content-2')
    })

    it('should respect limit parameter', async () => {
      // Add many contexts
      for (let i = 0; i < 10; i++) {
        const context: CompressedContext = {
          id: `persist-${i}`,
          compressed: `content-${i}`,
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000,
          compressedTokens: 200,
          compressionRatio: 0.8,
          compressedAt: Date.now() + i,
        }
        persistence.saveContext(context, projectHash)
      }

      // Restore with limit
      const result = await restoreCacheFromPersistence(cache, projectHash, persistence, 5)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(5)
      expect(cache.count()).toBe(5)
    })

    it('should handle empty persistence', async () => {
      const result = await restoreCacheFromPersistence(cache, projectHash, persistence)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(0)
      expect(result.failedCount).toBe(0)
    })
  })

  describe('syncCacheAndPersistence', () => {
    it('should sync cache and persistence bidirectionally', async () => {
      // Add context to cache
      const cacheContext: CompressedContext = {
        id: 'cache-only',
        compressed: 'cache-content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }
      cache.set(cacheContext.id, cacheContext)

      // Add context to persistence
      const persistContext: CompressedContext = {
        id: 'persist-only',
        compressed: 'persist-content',
        algorithm: CompressionAlgorithm.LZ,
        strategy: CompressionStrategy.AGGRESSIVE,
        originalTokens: 2000,
        compressedTokens: 300,
        compressionRatio: 0.85,
        compressedAt: Date.now(),
      }
      persistence.saveContext(persistContext, projectHash)

      // Sync
      const result = await syncCacheAndPersistence(cache, projectHash, persistence)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBeGreaterThan(0)

      // Verify both directions
      expect(cache.get('persist-only')).toBeTruthy()
      expect(persistence.getContext('cache-only')).toBeTruthy()
    })
  })

  describe('verifyMigration', () => {
    it('should verify migration integrity', async () => {
      // Add same contexts to both
      const sharedContext: CompressedContext = {
        id: 'shared',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }

      cache.set(sharedContext.id, sharedContext)
      persistence.saveContext(sharedContext, projectHash)

      // Add cache-only context
      const cacheOnly: CompressedContext = {
        id: 'cache-only',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }
      cache.set(cacheOnly.id, cacheOnly)

      // Add persistence-only context
      const persistOnly: CompressedContext = {
        id: 'persist-only',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }
      persistence.saveContext(persistOnly, projectHash)

      // Verify
      const verification = await verifyMigration(cache, projectHash, persistence)

      expect(verification.cacheCount).toBe(2)
      expect(verification.persistenceCount).toBe(2)
      expect(verification.matched).toBe(1)
      expect(verification.cacheOnly).toBe(1)
      expect(verification.persistenceOnly).toBe(1)
    })

    it('should handle perfect sync', async () => {
      const context: CompressedContext = {
        id: 'synced',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }

      cache.set(context.id, context)
      persistence.saveContext(context, projectHash)

      const verification = await verifyMigration(cache, projectHash, persistence)

      expect(verification.matched).toBe(1)
      expect(verification.cacheOnly).toBe(0)
      expect(verification.persistenceOnly).toBe(0)
    })
  })
})
