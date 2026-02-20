/**
 * Context Persistence Tests
 */

import { existsSync, rmSync } from 'node:fs'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CompressionAlgorithm, CompressionStrategy } from '../types'
import type { CompressedContext } from '../types'
import { ContextPersistence } from '../persistence'

describe('ContextPersistence', () => {
  let persistence: ContextPersistence
  let testDbPath: string

  beforeEach(() => {
    // Use a temporary database for testing
    testDbPath = join(process.cwd(), '.test-contexts.db')
    persistence = new ContextPersistence(testDbPath)
  })

  afterEach(() => {
    // Clean up
    persistence.close()
    if (existsSync(testDbPath)) {
      rmSync(testDbPath, { force: true })
    }
    // Clean up WAL files
    if (existsSync(`${testDbPath}-wal`)) {
      rmSync(`${testDbPath}-wal`, { force: true })
    }
    if (existsSync(`${testDbPath}-shm`)) {
      rmSync(`${testDbPath}-shm`, { force: true })
    }
  })

  describe('saveContext', () => {
    it('should save a compressed context', () => {
      const context: CompressedContext = {
        id: 'test-1',
        compressed: 'compressed content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        metadata: { test: true },
        compressedAt: Date.now(),
      }

      persistence.saveContext(context, 'project-hash-1', 'original content')

      const retrieved = persistence.getContext('test-1')
      expect(retrieved).toBeTruthy()
      expect(retrieved?.id).toBe('test-1')
      expect(retrieved?.compressed).toBe('compressed content')
      expect(retrieved?.projectHash).toBe('project-hash-1')
    })

    it('should update access count on duplicate save', () => {
      const context: CompressedContext = {
        id: 'test-2',
        compressed: 'content',
        algorithm: CompressionAlgorithm.LZ,
        strategy: CompressionStrategy.AGGRESSIVE,
        originalTokens: 500,
        compressedTokens: 100,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }

      persistence.saveContext(context, 'project-hash-1')
      const first = persistence.getContext('test-2')
      expect(first?.accessCount).toBe(2) // 1 from save, 1 from get

      persistence.saveContext(context, 'project-hash-1')
      const second = persistence.getContext('test-2')
      expect(second?.accessCount).toBe(4) // Previous 2 + 1 from save + 1 from get
    })
  })

  describe('getContext', () => {
    it('should retrieve saved context', () => {
      const context: CompressedContext = {
        id: 'test-3',
        compressed: 'test content',
        algorithm: CompressionAlgorithm.SEMANTIC,
        strategy: CompressionStrategy.CONSERVATIVE,
        originalTokens: 800,
        compressedTokens: 300,
        compressionRatio: 0.625,
        compressedAt: Date.now(),
      }

      persistence.saveContext(context, 'project-hash-1')
      const retrieved = persistence.getContext('test-3')

      expect(retrieved).toBeTruthy()
      expect(retrieved?.id).toBe('test-3')
      expect(retrieved?.originalTokens).toBe(800)
      expect(retrieved?.compressedTokens).toBe(300)
    })

    it('should return null for non-existent context', () => {
      const retrieved = persistence.getContext('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should update last accessed time', () => {
      const context: CompressedContext = {
        id: 'test-4',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }

      persistence.saveContext(context, 'project-hash-1')
      const first = persistence.getContext('test-4')
      const firstAccessed = first?.lastAccessed

      // Wait a bit
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
      return delay(10).then(() => {
        const second = persistence.getContext('test-4')
        expect(second?.lastAccessed).toBeGreaterThan(firstAccessed!)
      })
    })
  })

  describe('getProjectContexts', () => {
    beforeEach(() => {
      // Add multiple contexts for testing
      for (let i = 0; i < 5; i++) {
        const context: CompressedContext = {
          id: `test-${i}`,
          compressed: `content-${i}`,
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000 + i * 100,
          compressedTokens: 200 + i * 20,
          compressionRatio: 0.8,
          compressedAt: Date.now() + i * 1000,
        }
        persistence.saveContext(context, 'project-hash-1')
      }
    })

    it('should retrieve all contexts for a project', () => {
      const contexts = persistence.getProjectContexts('project-hash-1')
      expect(contexts).toHaveLength(5)
    })

    it('should apply limit', () => {
      const contexts = persistence.getProjectContexts('project-hash-1', { limit: 3 })
      expect(contexts).toHaveLength(3)
    })

    it('should sort by timestamp descending by default', () => {
      const contexts = persistence.getProjectContexts('project-hash-1')
      expect(contexts[0].id).toBe('test-4')
      expect(contexts[4].id).toBe('test-0')
    })

    it('should sort by timestamp ascending', () => {
      const contexts = persistence.getProjectContexts('project-hash-1', {
        sortBy: 'timestamp',
        sortOrder: 'asc',
      })
      expect(contexts[0].id).toBe('test-0')
      expect(contexts[4].id).toBe('test-4')
    })
  })

  describe('deleteContext', () => {
    it('should delete a context', () => {
      const context: CompressedContext = {
        id: 'test-delete',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }

      persistence.saveContext(context, 'project-hash-1')
      expect(persistence.getContext('test-delete')).toBeTruthy()

      const deleted = persistence.deleteContext('test-delete')
      expect(deleted).toBe(true)
      expect(persistence.getContext('test-delete')).toBeNull()
    })

    it('should return false for non-existent context', () => {
      const deleted = persistence.deleteContext('non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('deleteProjectContexts', () => {
    beforeEach(() => {
      // Add contexts for multiple projects
      for (let i = 0; i < 3; i++) {
        const context: CompressedContext = {
          id: `project1-${i}`,
          compressed: `content-${i}`,
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000,
          compressedTokens: 200,
          compressionRatio: 0.8,
          compressedAt: Date.now(),
        }
        persistence.saveContext(context, 'project-hash-1')
      }

      for (let i = 0; i < 2; i++) {
        const context: CompressedContext = {
          id: `project2-${i}`,
          compressed: `content-${i}`,
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000,
          compressedTokens: 200,
          compressionRatio: 0.8,
          compressedAt: Date.now(),
        }
        persistence.saveContext(context, 'project-hash-2')
      }
    })

    it('should delete all contexts for a project', () => {
      const deleted = persistence.deleteProjectContexts('project-hash-1')
      expect(deleted).toBe(3)

      const remaining = persistence.getProjectContexts('project-hash-1')
      expect(remaining).toHaveLength(0)

      // Other project should be unaffected
      const other = persistence.getProjectContexts('project-hash-2')
      expect(other).toHaveLength(2)
    })
  })

  describe('getStats', () => {
    beforeEach(() => {
      const contexts: CompressedContext[] = [
        {
          id: 'stats-1',
          compressed: 'content',
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000,
          compressedTokens: 200,
          compressionRatio: 0.8,
          compressedAt: Date.now(),
        },
        {
          id: 'stats-2',
          compressed: 'content',
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 2000,
          compressedTokens: 400,
          compressionRatio: 0.8,
          compressedAt: Date.now(),
        },
      ]

      contexts.forEach(c => persistence.saveContext(c, 'project-hash-1'))
    })

    it('should return correct statistics', () => {
      const stats = persistence.getStats('project-hash-1')

      expect(stats.totalContexts).toBe(2)
      expect(stats.totalOriginalTokens).toBe(3000)
      expect(stats.totalCompressedTokens).toBe(600)
      expect(stats.averageCompressionRatio).toBeCloseTo(0.8, 2)
    })

    it('should return global statistics', () => {
      const stats = persistence.getStats()
      expect(stats.totalContexts).toBeGreaterThanOrEqual(2)
    })
  })

  describe('cleanup', () => {
    it('should remove old contexts', () => {
      const oldContext: CompressedContext = {
        id: 'old-context',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
      }

      const newContext: CompressedContext = {
        id: 'new-context',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }

      persistence.saveContext(oldContext, 'project-hash-1')
      persistence.saveContext(newContext, 'project-hash-1')

      // Clean up contexts older than 7 days
      const removed = persistence.cleanup(7 * 24 * 60 * 60 * 1000)
      expect(removed).toBe(1)

      expect(persistence.getContext('old-context')).toBeNull()
      expect(persistence.getContext('new-context')).toBeTruthy()
    })
  })

  describe('project management', () => {
    it('should register a project', () => {
      persistence.registerProject('project-hash-1', '/path/to/project', 'Test Project')

      const project = persistence.getProject('project-hash-1')
      expect(project).toBeTruthy()
      expect(project.path).toBe('/path/to/project')
      expect(project.name).toBe('Test Project')
    })

    it('should list all projects', () => {
      persistence.registerProject('project-1', '/path/1', 'Project 1')
      persistence.registerProject('project-2', '/path/2', 'Project 2')

      const projects = persistence.listProjects()
      expect(projects.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('import/export', () => {
    it('should export and import contexts', () => {
      const context: CompressedContext = {
        id: 'export-test',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }

      persistence.saveContext(context, 'project-hash-1')

      // Export
      const exported = persistence.exportContexts('project-hash-1')
      expect(exported).toHaveLength(1)
      expect(exported[0].id).toBe('export-test')

      // Delete and import
      persistence.deleteContext('export-test')
      expect(persistence.getContext('export-test')).toBeNull()

      const imported = persistence.importContexts(exported)
      expect(imported).toBe(1)
      expect(persistence.getContext('export-test')).toBeTruthy()
    })
  })
})
