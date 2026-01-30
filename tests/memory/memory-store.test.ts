/**
 * Memory Store Tests
 */

import type { MemoryEntry } from '../../src/types/memory'
import { existsSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryStore } from '../../src/memory/store'

describe('memoryStore', () => {
  let store: MemoryStore
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `memory-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
    store = new MemoryStore({ storagePath: testDir })
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  const createTestMemory = (overrides: Partial<Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'lastAccessed'>> = {}): Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'lastAccessed'> => ({
    type: 'decision',
    content: 'Test memory content',
    summary: 'Test summary',
    importance: 'medium',
    scope: 'project',
    tags: ['test'],
    source: {
      sessionId: 'test-session',
      timestamp: Date.now(),
      project: 'test-project',
    },
    metadata: {},
    archived: false,
    ...overrides,
  })

  describe('create', () => {
    it('should create a memory entry', () => {
      const memory = store.create(createTestMemory())

      expect(memory).toBeDefined()
      expect(memory.id).toBeDefined()
      expect(memory.content).toBe('Test memory content')
      expect(memory.type).toBe('decision')
      expect(memory.createdAt).toBeDefined()
      expect(memory.updatedAt).toBeDefined()
      expect(memory.accessCount).toBe(0)
    })

    it('should generate unique IDs', () => {
      const memory1 = store.create(createTestMemory())
      const memory2 = store.create(createTestMemory())

      expect(memory1.id).not.toBe(memory2.id)
    })
  })

  describe('get', () => {
    it('should retrieve a memory by ID', () => {
      const created = store.create(createTestMemory())
      const retrieved = store.get(created.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.content).toBe(created.content)
    })

    it('should return undefined for non-existent ID', () => {
      const result = store.get('non-existent-id')
      expect(result).toBeUndefined()
    })

    it('should increment access count on get', () => {
      const created = store.create(createTestMemory())
      expect(created.accessCount).toBe(0)

      store.get(created.id)
      const retrieved = store.get(created.id)

      expect(retrieved?.accessCount).toBeGreaterThan(0)
    })
  })

  describe('update', () => {
    it('should update a memory', () => {
      const created = store.create(createTestMemory())
      const updated = store.update(created.id, { content: 'Updated content' })

      expect(updated).toBeDefined()
      expect(updated?.content).toBe('Updated content')
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt)
    })

    it('should return undefined for non-existent ID', () => {
      const result = store.update('non-existent-id', { content: 'test' })
      expect(result).toBeUndefined()
    })
  })

  describe('delete', () => {
    it('should delete a memory', () => {
      const created = store.create(createTestMemory())
      const deleted = store.delete(created.id)

      expect(deleted).toBe(true)
      expect(store.get(created.id)).toBeUndefined()
    })

    it('should return false for non-existent ID', () => {
      const result = store.delete('non-existent-id')
      expect(result).toBe(false)
    })
  })

  describe('getByType', () => {
    beforeEach(() => {
      store.create(createTestMemory({ type: 'decision', tags: ['architecture'] }))
      store.create(createTestMemory({ type: 'pattern', tags: ['testing'] }))
      store.create(createTestMemory({ type: 'preference', scope: 'global' }))
      store.create(createTestMemory({ type: 'decision', importance: 'high' }))
    })

    it('should get memories by type', () => {
      const results = store.getByType('decision')
      expect(results.length).toBe(2)
      expect(results.every(r => r.type === 'decision')).toBe(true)
    })
  })

  describe('getByScope', () => {
    beforeEach(() => {
      store.create(createTestMemory({ scope: 'global' }))
      store.create(createTestMemory({ scope: 'project' }))
      store.create(createTestMemory({ scope: 'session' }))
    })

    it('should get memories by scope', () => {
      const results = store.getByScope('global')
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results.every(r => r.scope === 'global')).toBe(true)
    })
  })

  describe('getByTag', () => {
    beforeEach(() => {
      store.create(createTestMemory({ tags: ['architecture', 'design'] }))
      store.create(createTestMemory({ tags: ['testing'] }))
      store.create(createTestMemory({ tags: ['architecture'] }))
    })

    it('should get memories by tag', () => {
      const results = store.getByTag('architecture')
      expect(results.length).toBe(2)
      expect(results.every(r => r.tags.includes('architecture'))).toBe(true)
    })
  })

  describe('getByProject', () => {
    beforeEach(() => {
      store.create(createTestMemory({ source: { sessionId: 's1', timestamp: Date.now(), project: 'project-a' } }))
      store.create(createTestMemory({ source: { sessionId: 's2', timestamp: Date.now(), project: 'project-b' } }))
      store.create(createTestMemory({ source: { sessionId: 's3', timestamp: Date.now(), project: 'project-a' } }))
    })

    it('should get memories by project', () => {
      const results = store.getByProject('project-a')
      expect(results.length).toBe(2)
      expect(results.every(r => r.source.project === 'project-a')).toBe(true)
    })
  })

  describe('getByImportance', () => {
    beforeEach(() => {
      store.create(createTestMemory({ importance: 'high' }))
      store.create(createTestMemory({ importance: 'medium' }))
      store.create(createTestMemory({ importance: 'high' }))
    })

    it('should get memories by importance', () => {
      const results = store.getByImportance('high')
      expect(results.length).toBe(2)
      expect(results.every(r => r.importance === 'high')).toBe(true)
    })
  })

  describe('search', () => {
    beforeEach(() => {
      store.create(createTestMemory({ content: 'unique searchable content xyz' }))
      store.create(createTestMemory({ content: 'another memory' }))
      store.create(createTestMemory({ summary: 'searchable summary' }))
    })

    it('should search memories by text', () => {
      const results = store.search('searchable')
      expect(results.length).toBe(2)
    })

    it('should search case-insensitively', () => {
      const results = store.search('SEARCHABLE')
      expect(results.length).toBe(2)
    })
  })

  describe('export/import', () => {
    it('should export memories', () => {
      store.create(createTestMemory())
      store.create(createTestMemory())

      const exported = store.export()

      expect(exported).toBeDefined()
      expect(exported.memories).toBeDefined()
      expect(exported.memories.length).toBe(2)
      expect(exported.exportedAt).toBeDefined()
      expect(exported.version).toBe('1.0.0')
    })

    it('should import memories with merge', async () => {
      store.create(createTestMemory({ content: 'Original' }))

      const exported = store.export()

      // Create a new store and import
      const importDir = join(tmpdir(), `memory-import-${Date.now()}`)
      await mkdir(importDir, { recursive: true })
      const importStore = new MemoryStore({ storagePath: importDir })
      importStore.create(createTestMemory({ content: 'Existing' }))

      importStore.import(exported, true)

      const all = importStore.getAll()
      expect(all.length).toBe(2)

      await rm(importDir, { recursive: true, force: true })
    })
  })

  describe('getStats', () => {
    it('should return statistics', () => {
      store.create(createTestMemory({ type: 'decision' }))
      store.create(createTestMemory({ type: 'pattern' }))

      const stats = store.getStats()

      expect(stats).toBeDefined()
      expect(stats.totalCount).toBe(2)
      expect(stats.byType).toBeDefined()
      expect(stats.byType.decision).toBe(1)
      expect(stats.byType.pattern).toBe(1)
    })
  })

  describe('clear', () => {
    it('should clear all memories', () => {
      store.create(createTestMemory())
      store.create(createTestMemory())

      expect(store.getAll().length).toBe(2)

      store.clear()

      expect(store.getAll().length).toBe(0)
    })
  })
})
