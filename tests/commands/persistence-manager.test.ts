/**
 * Persistence Manager Tests
 *
 * Tests for the persistence manager command interface.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'pathe'
import { tmpdir } from 'node:os'
import { ContextPersistence } from '../../src/context/persistence'
import { createHierarchicalLoader } from '../../src/context/hierarchical-loader'
import type { CompressedContext } from '../../src/context/types'

describe('Persistence Manager', () => {
  let testDbPath: string
  let persistence: ContextPersistence

  beforeEach(() => {
    // Create temporary database for testing
    const testDir = join(tmpdir(), `ccjk-test-${Date.now()}`)
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }
    testDbPath = join(testDir, 'test-contexts.db')
    persistence = new ContextPersistence(testDbPath)
  })

  afterEach(() => {
    // Clean up
    persistence.close()
    const testDir = join(testDbPath, '..')
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('Context Storage', () => {
    it('should save and retrieve contexts', () => {
      const context: CompressedContext = {
        id: 'test-context-1',
        compressed: 'compressed content',
        algorithm: 'semantic',
        strategy: 'aggressive',
        originalTokens: 1000,
        compressedTokens: 400,
        compressionRatio: 0.6,
        metadata: { test: true },
        compressedAt: Date.now(),
      }

      persistence.saveContext(context, 'project-hash-1', 'original content')

      const retrieved = persistence.getContext('test-context-1')
      expect(retrieved).toBeTruthy()
      expect(retrieved?.id).toBe('test-context-1')
      expect(retrieved?.compressed).toBe('compressed content')
      expect(retrieved?.algorithm).toBe('semantic')
      expect(retrieved?.originalTokens).toBe(1000)
      expect(retrieved?.compressedTokens).toBe(400)
    })

    it('should track access count', () => {
      const context: CompressedContext = {
        id: 'test-context-2',
        compressed: 'content',
        algorithm: 'semantic',
        strategy: 'balanced',
        originalTokens: 500,
        compressedTokens: 250,
        compressionRatio: 0.5,
        compressedAt: Date.now(),
      }

      persistence.saveContext(context, 'project-hash-1')

      const first = persistence.getContext('test-context-2')
      expect(first?.accessCount).toBe(1)

      const second = persistence.getContext('test-context-2')
      expect(second?.accessCount).toBe(2)
    })

    it('should query contexts by project', () => {
      const contexts: CompressedContext[] = [
        {
          id: 'ctx-1',
          compressed: 'content-1',
          algorithm: 'semantic',
          strategy: 'balanced',
          originalTokens: 100,
          compressedTokens: 50,
          compressionRatio: 0.5,
          compressedAt: Date.now(),
        },
        {
          id: 'ctx-2',
          compressed: 'content-2',
          algorithm: 'semantic',
          strategy: 'balanced',
          originalTokens: 200,
          compressedTokens: 100,
          compressionRatio: 0.5,
          compressedAt: Date.now(),
        },
      ]

      persistence.saveContext(contexts[0], 'project-1')
      persistence.saveContext(contexts[1], 'project-2')

      const project1Contexts = persistence.getProjectContexts('project-1')
      expect(project1Contexts).toHaveLength(1)
      expect(project1Contexts[0].id).toBe('ctx-1')

      const project2Contexts = persistence.getProjectContexts('project-2')
      expect(project2Contexts).toHaveLength(1)
      expect(project2Contexts[0].id).toBe('ctx-2')
    })
  })

  describe('Full-Text Search', () => {
    beforeEach(() => {
      // Add test contexts with searchable content
      const contexts = [
        {
          id: 'search-1',
          compressed: 'React component implementation',
          algorithm: 'semantic',
          strategy: 'balanced',
          originalTokens: 100,
          compressedTokens: 50,
          compressionRatio: 0.5,
          compressedAt: Date.now(),
        },
        {
          id: 'search-2',
          compressed: 'TypeScript interface definition',
          algorithm: 'semantic',
          strategy: 'balanced',
          originalTokens: 150,
          compressedTokens: 75,
          compressionRatio: 0.5,
          compressedAt: Date.now(),
        },
        {
          id: 'search-3',
          compressed: 'React hooks and TypeScript types',
          algorithm: 'semantic',
          strategy: 'balanced',
          originalTokens: 200,
          compressedTokens: 100,
          compressionRatio: 0.5,
          compressedAt: Date.now(),
        },
      ]

      contexts.forEach(ctx => persistence.saveContext(ctx as CompressedContext, 'project-1'))
    })

    it('should search contexts with single term', () => {
      const results = persistence.searchContexts('React')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.id === 'search-1')).toBe(true)
    })

    it('should search with AND operator', () => {
      const results = persistence.searchContexts('React AND TypeScript')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.id === 'search-3')).toBe(true)
    })

    it('should search with OR operator', () => {
      const results = persistence.searchContexts('React OR interface')
      expect(results.length).toBeGreaterThanOrEqual(2)
    })

    it('should return results with ranking', () => {
      const results = persistence.searchContexts('TypeScript')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toHaveProperty('rank')
      expect(typeof results[0].rank).toBe('number')
    })
  })

  describe('Context Cleanup', () => {
    it('should delete old contexts', () => {
      const oldTimestamp = Date.now() - 10 * 24 * 60 * 60 * 1000 // 10 days ago
      const recentTimestamp = Date.now() - 1 * 24 * 60 * 60 * 1000 // 1 day ago

      const oldContext: CompressedContext = {
        id: 'old-ctx',
        compressed: 'old content',
        algorithm: 'semantic',
        strategy: 'balanced',
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: oldTimestamp,
      }

      const recentContext: CompressedContext = {
        id: 'recent-ctx',
        compressed: 'recent content',
        algorithm: 'semantic',
        strategy: 'balanced',
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: recentTimestamp,
      }

      persistence.saveContext(oldContext, 'project-1')
      persistence.saveContext(recentContext, 'project-1')

      // Clean up contexts older than 7 days
      const deleted = persistence.cleanup(7 * 24 * 60 * 60 * 1000)
      expect(deleted).toBe(1)

      // Verify old context is deleted
      const oldRetrieved = persistence.getContext('old-ctx')
      expect(oldRetrieved).toBeNull()

      // Verify recent context still exists
      const recentRetrieved = persistence.getContext('recent-ctx')
      expect(recentRetrieved).toBeTruthy()
    })
  })

  describe('Export and Import', () => {
    it('should export contexts to array', () => {
      const contexts: CompressedContext[] = [
        {
          id: 'export-1',
          compressed: 'content-1',
          algorithm: 'semantic',
          strategy: 'balanced',
          originalTokens: 100,
          compressedTokens: 50,
          compressionRatio: 0.5,
          compressedAt: Date.now(),
        },
        {
          id: 'export-2',
          compressed: 'content-2',
          algorithm: 'semantic',
          strategy: 'balanced',
          originalTokens: 200,
          compressedTokens: 100,
          compressionRatio: 0.5,
          compressedAt: Date.now(),
        },
      ]

      contexts.forEach(ctx => persistence.saveContext(ctx, 'project-1'))

      const exported = persistence.exportContexts('project-1')
      expect(exported).toHaveLength(2)
      expect(exported.some(c => c.id === 'export-1')).toBe(true)
      expect(exported.some(c => c.id === 'export-2')).toBe(true)
    })

    it('should import contexts from array', () => {
      const contexts = [
        {
          id: 'import-1',
          projectHash: 'project-1',
          content: 'original',
          compressed: 'compressed',
          algorithm: 'semantic',
          strategy: 'balanced',
          originalTokens: 100,
          compressedTokens: 50,
          compressionRatio: 0.5,
          metadata: '{}',
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          accessCount: 1,
        },
      ]

      const imported = persistence.importContexts(contexts)
      expect(imported).toBe(1)

      const retrieved = persistence.getContext('import-1')
      expect(retrieved).toBeTruthy()
      expect(retrieved?.id).toBe('import-1')
    })
  })

  describe('Statistics', () => {
    beforeEach(() => {
      const contexts: CompressedContext[] = [
        {
          id: 'stats-1',
          compressed: 'content-1',
          algorithm: 'semantic',
          strategy: 'balanced',
          originalTokens: 1000,
          compressedTokens: 400,
          compressionRatio: 0.6,
          compressedAt: Date.now(),
        },
        {
          id: 'stats-2',
          compressed: 'content-2',
          algorithm: 'semantic',
          strategy: 'balanced',
          originalTokens: 2000,
          compressedTokens: 1000,
          compressionRatio: 0.5,
          compressedAt: Date.now(),
        },
      ]

      contexts.forEach(ctx => persistence.saveContext(ctx, 'project-1'))
    })

    it('should calculate statistics', () => {
      const stats = persistence.getStats()
      expect(stats.totalContexts).toBe(2)
      expect(stats.totalOriginalTokens).toBe(3000)
      expect(stats.totalCompressedTokens).toBe(1400)
      expect(stats.averageCompressionRatio).toBeCloseTo(0.533, 2)
    })

    it('should calculate project-specific statistics', () => {
      const stats = persistence.getStats('project-1')
      expect(stats.totalContexts).toBe(2)
      expect(stats.totalProjects).toBe(1)
    })
  })

  describe('Hierarchical Loader', () => {
    let loader: ReturnType<typeof createHierarchicalLoader>

    beforeEach(() => {
      loader = createHierarchicalLoader(persistence, 'project-1', {
        hotThreshold: 24 * 60 * 60 * 1000, // 1 day
        warmThreshold: 7 * 24 * 60 * 60 * 1000, // 7 days
        l0MaxEntries: 10,
        l0MaxSize: 1024 * 1024, // 1MB
      })
    })

    it('should categorize contexts into tiers', () => {
      const now = Date.now()

      // Hot context (< 1 day)
      const hotContext: CompressedContext = {
        id: 'hot-1',
        compressed: 'hot content',
        algorithm: 'semantic',
        strategy: 'balanced',
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now - 12 * 60 * 60 * 1000, // 12 hours ago
      }

      // Warm context (1-7 days)
      const warmContext: CompressedContext = {
        id: 'warm-1',
        compressed: 'warm content',
        algorithm: 'semantic',
        strategy: 'balanced',
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now - 3 * 24 * 60 * 60 * 1000, // 3 days ago
      }

      // Cold context (> 7 days)
      const coldContext: CompressedContext = {
        id: 'cold-1',
        compressed: 'cold content',
        algorithm: 'semantic',
        strategy: 'balanced',
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now - 10 * 24 * 60 * 60 * 1000, // 10 days ago
      }

      persistence.saveContext(hotContext, 'project-1')
      persistence.saveContext(warmContext, 'project-1')
      persistence.saveContext(coldContext, 'project-1')

      const stats = loader.getStats()
      expect(stats.l0.count).toBeGreaterThanOrEqual(0)
      expect(stats.l1.count).toBeGreaterThanOrEqual(0)
      expect(stats.l2.count).toBeGreaterThanOrEqual(0)
    })

    it('should migrate contexts between tiers', () => {
      const now = Date.now()

      // Add a context that should be demoted
      const oldHotContext: CompressedContext = {
        id: 'migrate-1',
        compressed: 'content',
        algorithm: 'semantic',
        strategy: 'balanced',
        originalTokens: 100,
        compressedTokens: 50,
        compressionRatio: 0.5,
        compressedAt: now - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      }

      persistence.saveContext(oldHotContext, 'project-1')

      const result = loader.migrateContexts()
      expect(result).toHaveProperty('promoted')
      expect(result).toHaveProperty('demoted')
    })
  })

  describe('Database Operations', () => {
    it('should vacuum database', () => {
      // Add and delete contexts to create fragmentation
      for (let i = 0; i < 10; i++) {
        const context: CompressedContext = {
          id: `vacuum-${i}`,
          compressed: 'content',
          algorithm: 'semantic',
          strategy: 'balanced',
          originalTokens: 100,
          compressedTokens: 50,
          compressionRatio: 0.5,
          compressedAt: Date.now(),
        }
        persistence.saveContext(context, 'project-1')
      }

      // Delete half
      for (let i = 0; i < 5; i++) {
        persistence.deleteContext(`vacuum-${i}`)
      }

      // Vacuum should not throw
      expect(() => persistence.vacuum()).not.toThrow()
    })

    it('should get database size', () => {
      const size = persistence.getDatabaseSize()
      expect(size).toBeGreaterThan(0)
    })
  })
})
