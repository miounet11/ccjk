/**
 * FTS5 Full-Text Search Tests
 */

import { existsSync, rmSync } from 'node:fs'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CompressionAlgorithm, CompressionStrategy } from '../types'
import type { CompressedContext } from '../types'
import { ContextPersistence } from '../persistence'

describe('FTS5 Full-Text Search', () => {
  let persistence: ContextPersistence
  let testDbPath: string

  beforeEach(() => {
    testDbPath = join(process.cwd(), '.test-fts5.db')
    persistence = new ContextPersistence(testDbPath)

    // Add sample contexts for testing
    const sampleContexts: Array<{ context: CompressedContext, projectHash: string, content: string }> = [
      {
        context: {
          id: 'ctx-1',
          compressed: 'User authentication with JWT tokens',
          algorithm: CompressionAlgorithm.SEMANTIC,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000,
          compressedTokens: 300,
          compressionRatio: 0.7,
          compressedAt: Date.now() - 3600000, // 1 hour ago
          metadata: { tags: ['auth', 'jwt', 'security'] },
        },
        projectHash: 'project-1',
        content: 'Implementing user authentication system using JWT tokens for secure API access',
      },
      {
        context: {
          id: 'ctx-2',
          compressed: 'Database migration scripts',
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.AGGRESSIVE,
          originalTokens: 800,
          compressedTokens: 200,
          compressionRatio: 0.75,
          compressedAt: Date.now() - 7200000, // 2 hours ago
          metadata: { tags: ['database', 'migration'] },
        },
        projectHash: 'project-1',
        content: 'Creating database migration scripts for PostgreSQL schema updates and data transformations',
      },
      {
        context: {
          id: 'ctx-3',
          compressed: 'React component testing',
          algorithm: CompressionAlgorithm.SEMANTIC,
          strategy: CompressionStrategy.CONSERVATIVE,
          originalTokens: 1200,
          compressedTokens: 400,
          compressionRatio: 0.67,
          compressedAt: Date.now() - 10800000, // 3 hours ago
          metadata: { tags: ['react', 'testing', 'frontend'] },
        },
        projectHash: 'project-2',
        content: 'Writing unit tests for React components using Jest and React Testing Library',
      },
      {
        context: {
          id: 'ctx-4',
          compressed: 'API endpoint documentation',
          algorithm: CompressionAlgorithm.LZ,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 900,
          compressedTokens: 250,
          compressionRatio: 0.72,
          compressedAt: Date.now() - 14400000, // 4 hours ago
          metadata: { tags: ['api', 'documentation'] },
        },
        projectHash: 'project-1',
        content: 'Documenting REST API endpoints with OpenAPI specification and example requests',
      },
      {
        context: {
          id: 'ctx-5',
          compressed: 'Performance optimization techniques',
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.AGGRESSIVE,
          originalTokens: 1500,
          compressedTokens: 450,
          compressionRatio: 0.7,
          compressedAt: Date.now() - 18000000, // 5 hours ago
          metadata: { tags: ['performance', 'optimization'] },
        },
        projectHash: 'project-2',
        content: 'Implementing performance optimization techniques including caching, lazy loading, and code splitting',
      },
    ]

    for (const { context, projectHash, content } of sampleContexts) {
      persistence.saveContext(context, projectHash, content)
    }
  })

  afterEach(() => {
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

  describe('searchContexts', () => {
    it('should find contexts by single keyword', () => {
      const results = persistence.searchContexts('authentication')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].id).toBe('ctx-1')
      expect(results[0].rank).toBeDefined()
    })

    it('should find contexts by multiple keywords', () => {
      const results = persistence.searchContexts('database migration')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].id).toBe('ctx-2')
    })

    it('should support phrase search', () => {
      const results = persistence.searchContexts('"React component"')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].id).toBe('ctx-3')
    })

    it('should support AND operator', () => {
      const results = persistence.searchContexts('performance AND optimization')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].id).toBe('ctx-5')
    })

    it('should support OR operator', () => {
      const results = persistence.searchContexts('JWT OR React')
      expect(results.length).toBeGreaterThanOrEqual(2)
      const ids = results.map(r => r.id)
      expect(ids).toContain('ctx-1')
      expect(ids).toContain('ctx-3')
    })

    it('should support NOT operator', () => {
      const results = persistence.searchContexts('API NOT authentication')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].id).toBe('ctx-4')
      expect(results.find(r => r.id === 'ctx-1')).toBeUndefined()
    })

    it('should return empty array for no matches', () => {
      const results = persistence.searchContexts('nonexistent keyword xyz')
      expect(results).toHaveLength(0)
    })

    it('should return empty array for empty query', () => {
      const results = persistence.searchContexts('')
      expect(results).toHaveLength(0)
    })

    it('should include snippets in results', () => {
      const results = persistence.searchContexts('authentication')
      expect(results[0].snippet).toBeDefined()
      expect(results[0].snippet).toContain('<mark>')
      expect(results[0].snippet).toContain('</mark>')
    })

    it('should rank results by relevance', () => {
      const results = persistence.searchContexts('API')
      expect(results.length).toBeGreaterThan(1)
      // Results should be ordered by relevance (BM25 score)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].rank).toBeLessThanOrEqual(results[i + 1].rank)
      }
    })

    it('should filter by project hash', () => {
      const results = persistence.searchContexts('API', { projectHash: 'project-1' })
      expect(results.length).toBeGreaterThan(0)
      results.forEach(r => expect(r.projectHash).toBe('project-1'))
    })

    it('should filter by time range', () => {
      const twoHoursAgo = Date.now() - 7200000
      const results = persistence.searchContexts('database', {
        startTime: twoHoursAgo,
      })
      expect(results.length).toBeGreaterThan(0)
      results.forEach(r => expect(r.timestamp).toBeGreaterThanOrEqual(twoHoursAgo))
    })

    it('should apply limit', () => {
      const results = persistence.searchContexts('API OR React OR database', { limit: 2 })
      expect(results).toHaveLength(2)
    })

    it('should support sorting by timestamp', () => {
      const results = persistence.searchContexts('API OR React', {
        sortBy: 'timestamp',
        sortOrder: 'desc',
      })
      expect(results.length).toBeGreaterThan(1)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].timestamp).toBeGreaterThanOrEqual(results[i + 1].timestamp)
      }
    })

    it('should support sorting by access count', () => {
      // Access some contexts multiple times
      persistence.getContext('ctx-1')
      persistence.getContext('ctx-1')
      persistence.getContext('ctx-2')

      const results = persistence.searchContexts('authentication OR database', {
        sortBy: 'accessCount',
        sortOrder: 'desc',
      })
      expect(results.length).toBeGreaterThan(1)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].accessCount).toBeGreaterThanOrEqual(results[i + 1].accessCount)
      }
    })

    it('should handle special characters in query', () => {
      const results = persistence.searchContexts('API-endpoint')
      expect(results.length).toBeGreaterThanOrEqual(0) // Should not throw
    })

    it('should be case-insensitive', () => {
      const results1 = persistence.searchContexts('AUTHENTICATION')
      const results2 = persistence.searchContexts('authentication')
      expect(results1.length).toBe(results2.length)
      expect(results1[0].id).toBe(results2[0].id)
    })
  })

  describe('Hot/Warm/Cold Context Queries', () => {
    beforeEach(() => {
      // Simulate access patterns
      // Hot: ctx-1 (accessed 5 times recently)
      for (let i = 0; i < 5; i++) {
        persistence.getContext('ctx-1')
      }

      // Warm: ctx-2 (accessed 3 times)
      for (let i = 0; i < 3; i++) {
        persistence.getContext('ctx-2')
      }

      // Cold: ctx-4 (accessed once, older)
      // Already has access_count = 1 from initial save
    })

    it('should get hot contexts', () => {
      const hot = persistence.getHotContexts('project-1', 5)
      expect(hot.length).toBeGreaterThan(0)
      // ctx-1 should be first (most accessed and most recent)
      expect(hot[0].id).toBe('ctx-1')
      expect(hot[0].accessCount).toBeGreaterThan(5) // Initial save + 5 gets
    })

    it('should get warm contexts', () => {
      const warm = persistence.getWarmContexts('project-1', 5)
      expect(warm.length).toBeGreaterThan(0)
      // All should have access_count > 1
      warm.forEach(ctx => expect(ctx.accessCount).toBeGreaterThan(1))
    })

    it('should get cold contexts', () => {
      const cold = persistence.getColdContexts('project-1', 5)
      expect(cold.length).toBeGreaterThan(0)
      // All should have access_count = 1
      cold.forEach(ctx => expect(ctx.accessCount).toBe(1))
      // Should be ordered by timestamp ascending (oldest first)
      for (let i = 0; i < cold.length - 1; i++) {
        expect(cold[i].timestamp).toBeLessThanOrEqual(cold[i + 1].timestamp)
      }
    })

    it('should respect limit parameter', () => {
      const hot = persistence.getHotContexts('project-1', 2)
      expect(hot.length).toBeLessThanOrEqual(2)
    })

    it('should filter by project', () => {
      const hot = persistence.getHotContexts('project-2', 10)
      hot.forEach(ctx => expect(ctx.projectHash).toBe('project-2'))
    })
  })

  describe('FTS5 Trigger Synchronization', () => {
    it('should sync on insert', () => {
      const newContext: CompressedContext = {
        id: 'ctx-new',
        compressed: 'New context for testing',
        algorithm: CompressionAlgorithm.SEMANTIC,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 500,
        compressedTokens: 150,
        compressionRatio: 0.7,
        compressedAt: Date.now(),
      }

      persistence.saveContext(newContext, 'project-1', 'New context content for full-text search')

      const results = persistence.searchContexts('full-text search')
      expect(results.length).toBeGreaterThan(0)
      expect(results.find(r => r.id === 'ctx-new')).toBeDefined()
    })

    it('should sync on update', () => {
      const context = persistence.getContext('ctx-1')
      expect(context).toBeTruthy()

      // Update the context
      const updated: CompressedContext = {
        id: 'ctx-1',
        compressed: 'Updated authentication with OAuth2',
        algorithm: CompressionAlgorithm.SEMANTIC,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 300,
        compressionRatio: 0.7,
        compressedAt: Date.now(),
      }

      persistence.saveContext(updated, 'project-1', 'Updated content with OAuth2 implementation')

      const results = persistence.searchContexts('OAuth2')
      expect(results.length).toBeGreaterThan(0)
      expect(results.find(r => r.id === 'ctx-1')).toBeDefined()
    })

    it('should sync on delete', () => {
      const results1 = persistence.searchContexts('authentication')
      expect(results1.find(r => r.id === 'ctx-1')).toBeDefined()

      persistence.deleteContext('ctx-1')

      const results2 = persistence.searchContexts('authentication')
      expect(results2.find(r => r.id === 'ctx-1')).toBeUndefined()
    })
  })

  describe('Performance', () => {
    it('should handle large result sets efficiently', () => {
      // Add more contexts
      for (let i = 0; i < 100; i++) {
        const context: CompressedContext = {
          id: `perf-${i}`,
          compressed: `Performance test context ${i}`,
          algorithm: CompressionAlgorithm.SEMANTIC,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000,
          compressedTokens: 300,
          compressionRatio: 0.7,
          compressedAt: Date.now(),
        }
        persistence.saveContext(context, 'project-perf', `Content for performance test ${i}`)
      }

      const start = Date.now()
      const results = persistence.searchContexts('performance test', { limit: 50 })
      const duration = Date.now() - start

      expect(results.length).toBe(50)
      expect(duration).toBeLessThan(100) // Should complete in under 100ms
    })

    it('should use indexes for hot context queries', () => {
      const start = Date.now()
      const hot = persistence.getHotContexts('project-1', 10)
      const duration = Date.now() - start

      expect(hot.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(50) // Should be very fast with index
    })
  })
})
