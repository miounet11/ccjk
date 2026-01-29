/**
 * Memory Manager Tests
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { MemoryManager } from '../../src/memory/manager'
import type { MemoryEntry, MemorySource } from '../../src/types/memory'
import fs from 'fs-extra'
import path from 'pathe'
import os from 'node:os'

describe('MemoryManager', () => {
  let manager: MemoryManager
  let testStoragePath: string

  beforeEach(async () => {
    testStoragePath = path.join(os.tmpdir(), `ccjk-memory-test-${Date.now()}`)
    manager = new MemoryManager({
      enabled: true,
      storagePath: testStoragePath,
      autoCapture: true,
      autoInject: true,
    })
    await manager.initialize()
  })

  afterEach(async () => {
    await fs.remove(testStoragePath)
  })

  describe('initialization', () => {
    it('should create storage directory', async () => {
      const exists = await fs.pathExists(testStoragePath)
      expect(exists).toBe(true)
    })
  })

  describe('store and retrieve', () => {
    it('should store a memory entry', async () => {
      const source: MemorySource = {
        sessionId: 'test-session-1',
        timestamp: Date.now(),
        project: 'test-project',
      }

      const entry = await manager.store(
        'Use TypeScript for better type safety',
        'decision',
        'high',
        'project',
        ['typescript', 'architecture'],
        source,
      )

      expect(entry).toBeDefined()
      expect(entry.id).toBeDefined()
      expect(entry.type).toBe('decision')
      expect(entry.importance).toBe('high')
    })

    it('should retrieve stored memory by ID', async () => {
      const source: MemorySource = {
        sessionId: 'test-session-2',
        timestamp: Date.now(),
      }

      const stored = await manager.store(
        'Always validate user input',
        'pattern',
        'critical',
        'global',
        ['security', 'validation'],
        source,
      )

      const retrieved = manager.get(stored.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.content).toBe('Always validate user input')
    })
  })

  describe('search', () => {
    it('should search memories by text', async () => {
      const source: MemorySource = {
        sessionId: 'test-session-3',
        timestamp: Date.now(),
      }

      await manager.store(
        'Use React hooks for state management',
        'pattern',
        'medium',
        'project',
        ['react', 'hooks'],
        source,
      )

      const results = manager.search('React')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('statistics', () => {
    it('should return memory statistics', async () => {
      const stats = manager.getStats()
      expect(stats).toBeDefined()
      expect(typeof stats.totalCount).toBe('number')
    })
  })

  describe('clear', () => {
    it('should clear all memories', async () => {
      const source: MemorySource = {
        sessionId: 'test-session-4',
        timestamp: Date.now(),
      }

      await manager.store(
        'Test memory',
        'context',
        'low',
        'session',
        ['test'],
        source,
      )

      manager.clear()
      const stats = manager.getStats()
      expect(stats.totalCount).toBe(0)
    })
  })

  describe('export and import', () => {
    it('should export memories', async () => {
      const source: MemorySource = {
        sessionId: 'test-session-5',
        timestamp: Date.now(),
      }

      await manager.store(
        'Export test memory',
        'learning',
        'medium',
        'global',
        ['export'],
        source,
      )

      const exported = manager.export()
      expect(exported).toBeDefined()
      expect(exported.memories.length).toBeGreaterThan(0)
    })

    it('should import memories', async () => {
      const source: MemorySource = {
        sessionId: 'test-session-6',
        timestamp: Date.now(),
      }

      await manager.store(
        'Import test memory',
        'workflow',
        'high',
        'project',
        ['import'],
        source,
      )

      const exported = manager.export()
      manager.clear()

      manager.import(exported, false)
      const stats = manager.getStats()
      expect(stats.totalCount).toBeGreaterThan(0)
    })
  })
})
