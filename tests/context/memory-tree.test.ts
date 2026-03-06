import { existsSync, unlinkSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryTree } from '../../src/context/memory-tree'

const TEST_DB = '/tmp/test-memory-tree.db'

describe('memoryTree', () => {
  let tree: MemoryTree

  beforeEach(async () => {
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB)
    }
    tree = new MemoryTree(TEST_DB)
    await tree.init()
  })

  afterEach(() => {
    tree.close()
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB)
    }
  })

  describe('node management', () => {
    it('adds and retrieves nodes', async () => {
      const id = await tree.addNode({
        content: 'Test content',
        summary: 'Test summary',
        confidence: 0.8,
        priority: 'P1',
      })

      const node = await tree.getNode(id)
      expect(node).toBeDefined()
      expect(node?.content).toBe('Test content')
      expect(node?.confidence).toBe(0.8)
    })

    it('updates confidence', async () => {
      const id = await tree.addNode({
        content: 'Original',
        summary: 'Original summary',
        confidence: 0.5,
        priority: 'P2',
      })

      await tree.updateConfidence(id, 0.4)

      const node = await tree.getNode(id)
      expect(node?.confidence).toBe(0.9)
    })
  })

  describe('full-text search', () => {
    beforeEach(async () => {
      await tree.addNode({
        content: 'How to implement authentication in Node.js',
        summary: 'Authentication implementation guide',
        confidence: 0.8,
        priority: 'P1',
      })

      await tree.addNode({
        content: 'Database schema design for users table',
        summary: 'User database schema',
        confidence: 0.7,
        priority: 'P2',
      })

      await tree.addNode({
        content: 'API endpoint for user authentication',
        summary: 'Auth API endpoint',
        confidence: 0.9,
        priority: 'P1',
      })
    })

    it('searches by keyword', async () => {
      const results = await tree.search('authentication', { limit: 5 })

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].content).toContain('authentication')
    })

    it('ranks by BM25 score', async () => {
      const results = await tree.search('authentication', { limit: 5 })

      // Results should be ordered by relevance (lower rank = better)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeLessThanOrEqual(results[i].score)
      }
    })

    it('boosts confidence on access', async () => {
      const results = await tree.search('database', { limit: 1 })
      const id = results[0].id
      const originalConfidence = results[0].confidence

      await tree.recordAccess(id)

      const node = await tree.getNode(id)
      expect(node?.confidence).toBeGreaterThan(originalConfidence)
    })
  })

  describe('confidence decay', () => {
    it('decays nodes over time', async () => {
      const id = await tree.addNode({
        content: 'Old content',
        summary: 'Old summary',
        confidence: 0.8,
        priority: 'P1',
      })

      const decayed = await tree.applyDecay(0.1)

      expect(decayed).toBeGreaterThan(0)

      const node = await tree.getNode(id)
      expect(node?.confidence).toBeCloseTo(0.7, 5)
    })

    it('does not go below 0', async () => {
      await tree.addNode({
        content: 'Low confidence',
        summary: 'Low summary',
        confidence: 0.05,
        priority: 'P1',
      })

      await tree.applyDecay(0.1)

      const nodes = await tree.getAllNodes()
      expect(nodes[0].confidence).toBe(0)
    })
  })

  describe('archival', () => {
    it('archives low-confidence nodes', async () => {
      await tree.addNode({
        content: 'Low confidence',
        summary: 'Low confidence summary',
        confidence: 0.2,
        priority: 'P2',
      })

      const archived = await tree.archiveLowConfidence(0.3)

      expect(archived).toBe(1)

      const stats = await tree.getStats()
      expect(stats.totalNodes).toBe(0)
    })
  })

  describe('statistics', () => {
    beforeEach(async () => {
      await tree.addNode({
        content: 'Green',
        summary: 'Green',
        confidence: 0.9,
        priority: 'P0',
      })

      await tree.addNode({
        content: 'Yellow',
        summary: 'Yellow',
        confidence: 0.6,
        priority: 'P1',
      })

      await tree.addNode({
        content: 'Brown',
        summary: 'Brown',
        confidence: 0.4,
        priority: 'P2',
      })
    })

    it('calculates stats correctly', async () => {
      const stats = await tree.getStats()

      expect(stats.totalNodes).toBe(3)
      expect(stats.greenLeaves).toBe(1)
      expect(stats.yellowLeaves).toBe(1)
      expect(stats.brownLeaves).toBe(1)
      expect(stats.byPriority.P0).toBe(1)
      expect(stats.byPriority.P1).toBe(1)
      expect(stats.byPriority.P2).toBe(1)
    })
  })
})
