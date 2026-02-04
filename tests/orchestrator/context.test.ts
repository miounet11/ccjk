import type { ContextStore } from '../../src/orchestrator/context'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createContextStore } from '../../src/orchestrator/context'

describe('contextStore', () => {
  let store: ContextStore

  beforeEach(() => {
    store = createContextStore({
      maxContexts: 10,
      ttl: 1000, // 1 second for testing
      autoCleanup: false, // Disable for predictable tests
    })
  })

  afterEach(() => {
    store.destroy()
  })

  describe('create', () => {
    it('should create a new context with empty data', async () => {
      const id = await store.create()
      expect(id).toBeTruthy()
      expect(typeof id).toBe('string')

      const data = await store.get(id)
      expect(data).toEqual({})
    })

    it('should create a new context with initial data', async () => {
      const initialData = { foo: 'bar', count: 42 }
      const id = await store.create(initialData)

      const data = await store.get(id)
      expect(data).toEqual(initialData)
    })

    it('should create contexts with unique IDs', async () => {
      const id1 = await store.create()
      const id2 = await store.create()
      expect(id1).not.toBe(id2)
    })

    it('should enforce max contexts limit', async () => {
      const ids: string[] = []

      // Create 10 contexts (at limit)
      for (let i = 0; i < 10; i++) {
        ids.push(await store.create({ index: i }))
      }

      expect(await store.size()).toBe(10)

      // Create one more (should evict oldest)
      const newId = await store.create({ index: 10 })
      expect(await store.size()).toBe(10)

      // First context should be evicted
      expect(await store.has(ids[0])).toBe(false)
      expect(await store.has(newId)).toBe(true)
    })
  })

  describe('get', () => {
    it('should return null for non-existent context', async () => {
      const data = await store.get('non-existent')
      expect(data).toBeNull()
    })

    it('should return cloned data (not reference)', async () => {
      const original = { nested: { value: 42 } }
      const id = await store.create(original)

      const data = await store.get(id)
      expect(data).toEqual(original)

      // Modify returned data
      data!.nested.value = 100

      // Original should be unchanged
      const data2 = await store.get(id)
      expect(data2!.nested.value).toBe(42)
    })

    it('should return null for expired context', async () => {
      const id = await store.create({ foo: 'bar' })

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100))

      const data = await store.get(id)
      expect(data).toBeNull()
    })
  })

  describe('update', () => {
    it('should update context with new data (deep merge)', async () => {
      const id = await store.create({
        user: { name: 'Alice', age: 30 },
        settings: { theme: 'dark' },
      })

      const success = await store.update(id, {
        user: { age: 31 },
        settings: { language: 'en' },
      })

      expect(success).toBe(true)

      const data = await store.get(id)
      expect(data).toEqual({
        user: { name: 'Alice', age: 31 },
        settings: { theme: 'dark', language: 'en' },
      })
    })

    it('should return false for non-existent context', async () => {
      const success = await store.update('non-existent', { foo: 'bar' })
      expect(success).toBe(false)
    })

    it('should return false for expired context', async () => {
      const id = await store.create({ foo: 'bar' })

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100))

      const success = await store.update(id, { foo: 'baz' })
      expect(success).toBe(false)
    })

    it('should refresh TTL on update', async () => {
      const id = await store.create({ foo: 'bar' })

      // Wait 600ms (more than half TTL)
      await new Promise(resolve => setTimeout(resolve, 600))

      // Update (should refresh TTL)
      await store.update(id, { foo: 'baz' })

      // Wait another 600ms (total 1200ms, but TTL was refreshed)
      await new Promise(resolve => setTimeout(resolve, 600))

      // Should still exist
      const data = await store.get(id)
      expect(data).not.toBeNull()
      expect(data!.foo).toBe('baz')
    })
  })

  describe('set', () => {
    it('should replace context data completely', async () => {
      const id = await store.create({
        user: { name: 'Alice', age: 30 },
        settings: { theme: 'dark' },
      })

      const success = await store.set(id, {
        user: { name: 'Bob' },
      })

      expect(success).toBe(true)

      const data = await store.get(id)
      expect(data).toEqual({
        user: { name: 'Bob' },
      })
      // settings should be gone
      expect(data!.settings).toBeUndefined()
    })

    it('should return false for non-existent context', async () => {
      const success = await store.set('non-existent', { foo: 'bar' })
      expect(success).toBe(false)
    })
  })

  describe('delete', () => {
    it('should delete an existing context', async () => {
      const id = await store.create({ foo: 'bar' })
      expect(await store.has(id)).toBe(true)

      const success = await store.delete(id)
      expect(success).toBe(true)
      expect(await store.has(id)).toBe(false)
    })

    it('should return false for non-existent context', async () => {
      const success = await store.delete('non-existent')
      expect(success).toBe(false)
    })
  })

  describe('has', () => {
    it('should return true for existing context', async () => {
      const id = await store.create({ foo: 'bar' })
      expect(await store.has(id)).toBe(true)
    })

    it('should return false for non-existent context', async () => {
      expect(await store.has('non-existent')).toBe(false)
    })

    it('should return false for expired context', async () => {
      const id = await store.create({ foo: 'bar' })

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100))

      expect(await store.has(id)).toBe(false)
    })
  })

  describe('size', () => {
    it('should return 0 for empty store', async () => {
      expect(await store.size()).toBe(0)
    })

    it('should return correct count', async () => {
      await store.create({ a: 1 })
      await store.create({ b: 2 })
      await store.create({ c: 3 })

      expect(await store.size()).toBe(3)
    })
  })

  describe('clear', () => {
    it('should remove all contexts', async () => {
      await store.create({ a: 1 })
      await store.create({ b: 2 })
      await store.create({ c: 3 })

      expect(await store.size()).toBe(3)

      await store.clear()

      expect(await store.size()).toBe(0)
    })
  })

  describe('keys', () => {
    it('should return all context IDs', async () => {
      const id1 = await store.create({ a: 1 })
      const id2 = await store.create({ b: 2 })
      const id3 = await store.create({ c: 3 })

      const keys = await store.keys()

      expect(keys).toHaveLength(3)
      expect(keys).toContain(id1)
      expect(keys).toContain(id2)
      expect(keys).toContain(id3)
    })
  })

  describe('snapshot', () => {
    it('should create a snapshot of context', async () => {
      const id = await store.create({ foo: 'bar', count: 42 })

      const snapshot = await store.snapshot(id)

      expect(snapshot).not.toBeNull()
      expect(snapshot!.id).toBeTruthy()
      expect(snapshot!.data).toEqual({ foo: 'bar', count: 42 })
      expect(snapshot!.timestamp).toBeLessThanOrEqual(Date.now())
      expect(snapshot!.version).toBe(1)
    })

    it('should return null for non-existent context', async () => {
      const snapshot = await store.snapshot('non-existent')
      expect(snapshot).toBeNull()
    })

    it('should capture version correctly after updates', async () => {
      const id = await store.create({ foo: 'bar' })
      await store.update(id, { foo: 'baz' })
      await store.update(id, { count: 1 })

      const snapshot = await store.snapshot(id)

      expect(snapshot!.version).toBe(3)
    })
  })

  describe('restore', () => {
    it('should restore context from snapshot', async () => {
      const id = await store.create({ foo: 'bar', count: 42 })
      const snapshot = await store.snapshot(id)

      // Modify context
      await store.set(id, { foo: 'changed', other: 'data' })

      // Restore from snapshot
      const success = await store.restore(id, snapshot!)

      expect(success).toBe(true)

      const data = await store.get(id)
      expect(data).toEqual({ foo: 'bar', count: 42 })
    })

    it('should return false for non-existent context', async () => {
      const snapshot = {
        id: 'snap-1',
        data: { foo: 'bar' },
        timestamp: Date.now(),
        version: 1,
      }

      const success = await store.restore('non-existent', snapshot)
      expect(success).toBe(false)
    })
  })

  describe('getMetadata', () => {
    it('should return metadata for existing context', async () => {
      const id = await store.create({ foo: 'bar' })

      const metadata = await store.getMetadata(id)

      expect(metadata).not.toBeNull()
      expect(metadata!.id).toBe(id)
      expect(metadata!.version).toBe(1)
      expect(metadata!.createdAt).toBeLessThanOrEqual(Date.now())
      expect(metadata!.updatedAt).toBeLessThanOrEqual(Date.now())
    })

    it('should return null for non-existent context', async () => {
      const metadata = await store.getMetadata('non-existent')
      expect(metadata).toBeNull()
    })

    it('should track version increments', async () => {
      const id = await store.create({ foo: 'bar' })
      await store.update(id, { foo: 'baz' })
      await store.set(id, { new: 'data' })

      const metadata = await store.getMetadata(id)

      expect(metadata!.version).toBe(3)
    })
  })

  describe('cleanup', () => {
    it('should remove expired contexts', async () => {
      const id1 = await store.create({ a: 1 })
      const id2 = await store.create({ b: 2 })

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Create a new context (not expired)
      const id3 = await store.create({ c: 3 })

      const removed = await store.cleanup()

      expect(removed).toBe(2)
      expect(await store.has(id1)).toBe(false)
      expect(await store.has(id2)).toBe(false)
      expect(await store.has(id3)).toBe(true)
    })
  })

  describe('deep merge', () => {
    it('should handle arrays correctly', async () => {
      const id = await store.create({
        items: [1, 2, 3],
      })

      await store.update(id, {
        items: [4, 5],
      })

      const data = await store.get(id)
      // Arrays should be replaced, not merged
      expect(data!.items).toEqual([4, 5])
    })

    it('should handle null values', async () => {
      const id = await store.create({
        value: { nested: 'data' },
      })

      await store.update(id, {
        value: null,
      })

      const data = await store.get(id)
      expect(data!.value).toBeNull()
    })

    it('should handle deeply nested objects', async () => {
      const id = await store.create({
        level1: {
          level2: {
            level3: {
              value: 'original',
            },
          },
        },
      })

      await store.update(id, {
        level1: {
          level2: {
            level3: {
              newValue: 'added',
            },
          },
        },
      })

      const data = await store.get(id)
      expect(data!.level1.level2.level3).toEqual({
        value: 'original',
        newValue: 'added',
      })
    })
  })

  describe('thread safety', () => {
    it('should handle concurrent operations safely', async () => {
      const id = await store.create({ count: 0 })

      // Perform many concurrent updates
      const updates = Array.from({ length: 100 }, (_, i) =>
        store.update(id, { count: i + 1 }))

      await Promise.all(updates)

      // All updates should have completed
      const data = await store.get(id)
      expect(data).not.toBeNull()
      // The final count should be one of the update values
      expect(typeof data!.count).toBe('number')
    })

    it('should handle concurrent create and delete', async () => {
      const operations: Promise<any>[] = []

      // Create and delete concurrently
      for (let i = 0; i < 50; i++) {
        operations.push(
          store.create({ index: i }).then(id => store.delete(id)),
        )
      }

      await Promise.all(operations)

      // Store should be empty or have only remaining contexts
      const size = await store.size()
      expect(size).toBeLessThanOrEqual(50)
    })
  })

  describe('no TTL mode', () => {
    let noTtlStore: ContextStore

    beforeEach(() => {
      noTtlStore = createContextStore({
        ttl: 0, // No expiration
        autoCleanup: false,
      })
    })

    afterEach(() => {
      noTtlStore.destroy()
    })

    it('should not expire contexts when TTL is 0', async () => {
      const id = await noTtlStore.create({ foo: 'bar' })

      // Wait some time
      await new Promise(resolve => setTimeout(resolve, 100))

      const data = await noTtlStore.get(id)
      expect(data).not.toBeNull()
      expect(data!.foo).toBe('bar')
    })
  })

  describe('auto cleanup', () => {
    it('should automatically clean up expired contexts', async () => {
      const autoCleanupStore = createContextStore({
        ttl: 500,
        autoCleanup: true,
        cleanupInterval: 200,
      })

      const id = await autoCleanupStore.create({ foo: 'bar' })
      expect(await autoCleanupStore.has(id)).toBe(true)

      // Wait for TTL + cleanup interval
      await new Promise(resolve => setTimeout(resolve, 800))

      // Context should be cleaned up
      expect(await autoCleanupStore.has(id)).toBe(false)

      autoCleanupStore.destroy()
    })
  })
})
