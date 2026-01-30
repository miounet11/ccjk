/**
 * Memory Marketplace Integration Tests
 */

import { describe, expect, it } from 'vitest'
import {
  MemoryMarketplace,
  MemoryPackBuilder,
} from '../../src/memory/marketplace-integration'

describe('memoryMarketplace', () => {
  describe('memoryPackBuilder', () => {
    it('should build a memory pack', () => {
      const pack = new MemoryPackBuilder()
        .name('Test Pack')
        .description('A test memory pack')
        .author('Test Author')
        .version('1.0.0')
        .category('development')
        .tags(['test', 'example'])
        .license('MIT')
        .build()

      expect(pack.metadata.name).toBe('Test Pack')
      expect(pack.metadata.description).toBe('A test memory pack')
      expect(pack.metadata.author).toBe('Test Author')
      expect(pack.metadata.version).toBe('1.0.0')
      expect(pack.metadata.category).toBe('development')
      expect(pack.metadata.tags).toEqual(['test', 'example'])
      expect(pack.metadata.license).toBe('MIT')
      expect(pack.metadata.id).toBeDefined()
      expect(pack.metadata.downloads).toBe(0)
      expect(pack.metadata.rating).toBe(0)
    })

    it('should add memories to pack', () => {
      const memory = {
        id: 'test-memory',
        type: 'pattern' as const,
        scope: 'global' as const,
        importance: 'high' as const,
        content: 'Test content',
        summary: 'Test summary',
        tags: ['test'],
        source: { sessionId: 'test', timestamp: Date.now() },
        relatedIds: [],
        accessCount: 0,
        lastAccessed: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        archived: false,
        metadata: {},
      }

      const pack = new MemoryPackBuilder()
        .name('Test Pack')
        .author('Author')
        .version('1.0.0')
        .addMemory(memory)
        .build()

      expect(pack.memories.length).toBe(1)
      expect(pack.memories[0].id).toBe('test-memory')
      expect(pack.metadata.memoryCount).toBe(1)
    })

    it('should add multiple memories', () => {
      const memories = [
        {
          id: 'memory-1',
          type: 'decision' as const,
          scope: 'project' as const,
          importance: 'high' as const,
          content: 'Decision 1',
          summary: 'Decision 1',
          tags: [],
          source: { sessionId: 'test', timestamp: Date.now() },
          relatedIds: [],
          accessCount: 0,
          lastAccessed: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          archived: false,
          metadata: {},
        },
        {
          id: 'memory-2',
          type: 'pattern' as const,
          scope: 'global' as const,
          importance: 'medium' as const,
          content: 'Pattern 1',
          summary: 'Pattern 1',
          tags: [],
          source: { sessionId: 'test', timestamp: Date.now() },
          relatedIds: [],
          accessCount: 0,
          lastAccessed: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          archived: false,
          metadata: {},
        },
      ]

      const pack = new MemoryPackBuilder()
        .name('Multi Memory Pack')
        .author('Author')
        .version('1.0.0')
        .addMemories(memories)
        .build()

      expect(pack.memories.length).toBe(2)
      expect(pack.metadata.memoryCount).toBe(2)
    })

    it('should set readme and changelog', () => {
      const pack = new MemoryPackBuilder()
        .name('Documented Pack')
        .author('Author')
        .version('1.0.0')
        .setReadme('# README\n\nThis is a test pack.')
        .setChangelog('## 1.0.0\n\n- Initial release')
        .build()

      expect(pack.readme).toBe('# README\n\nThis is a test pack.')
      expect(pack.changelog).toBe('## 1.0.0\n\n- Initial release')
    })

    it('should throw error if name is missing', () => {
      expect(() => {
        new MemoryPackBuilder()
          .author('Author')
          .version('1.0.0')
          .build()
      }).toThrow('Pack name is required')
    })

    it('should throw error if author is missing', () => {
      expect(() => {
        new MemoryPackBuilder()
          .name('Test')
          .version('1.0.0')
          .build()
      }).toThrow('Pack author is required')
    })

    it('should throw error if version is missing', () => {
      expect(() => {
        new MemoryPackBuilder()
          .name('Test')
          .author('Author')
          .build()
      }).toThrow('Pack version is required')
    })

    it('should use default values', () => {
      const pack = new MemoryPackBuilder()
        .name('Minimal Pack')
        .author('Author')
        .version('1.0.0')
        .build()

      expect(pack.metadata.category).toBe('general')
      expect(pack.metadata.language).toBe('en')
      expect(pack.metadata.license).toBe('MIT')
      expect(pack.metadata.tags).toEqual([])
      expect(pack.metadata.description).toBe('')
    })
  })

  describe('memoryMarketplace', () => {
    it('should create marketplace client with default config', () => {
      const marketplace = new MemoryMarketplace()
      expect(marketplace).toBeDefined()
    })

    it('should create marketplace client with custom config', () => {
      const marketplace = new MemoryMarketplace({
        apiUrl: 'https://custom.api.com',
        apiKey: 'test-key',
        timeout: 60000,
      })
      expect(marketplace).toBeDefined()
    })

    it('should throw error when publishing without API key', async () => {
      const marketplace = new MemoryMarketplace()
      const pack = new MemoryPackBuilder()
        .name('Test')
        .author('Author')
        .version('1.0.0')
        .build()

      await expect(marketplace.publish(pack as any)).rejects.toThrow(
        'API key required to publish memory packs',
      )
    })

    it('should throw error when updating without API key', async () => {
      const marketplace = new MemoryMarketplace()

      await expect(marketplace.update('pack-id', {})).rejects.toThrow(
        'API key required to update memory packs',
      )
    })

    it('should throw error when deleting without API key', async () => {
      const marketplace = new MemoryMarketplace()

      await expect(marketplace.delete('pack-id')).rejects.toThrow(
        'API key required to delete memory packs',
      )
    })

    it('should throw error when rating without API key', async () => {
      const marketplace = new MemoryMarketplace()

      await expect(marketplace.rate('pack-id', 5)).rejects.toThrow(
        'API key required to rate memory packs',
      )
    })

    it('should validate rating range', async () => {
      const marketplace = new MemoryMarketplace({ apiKey: 'test-key' })

      await expect(marketplace.rate('pack-id', 0)).rejects.toThrow(
        'Rating must be between 1 and 5',
      )

      await expect(marketplace.rate('pack-id', 6)).rejects.toThrow(
        'Rating must be between 1 and 5',
      )
    })
  })
})
