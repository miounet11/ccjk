/**
 * Tests for sync queue manager
 */

import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createSyncQueueManager,
  SyncQueueManager,
} from '../../../src/utils/context/sync-queue'

describe('sync-queue', () => {
  let testDir: string
  let queueManager: SyncQueueManager

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `ccjk-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })

    queueManager = new SyncQueueManager(testDir)
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  })

  describe('syncQueueManager', () => {
    describe('initialize', () => {
      it('should create queue directory', async () => {
        await queueManager.initialize()

        const fs = await import('node:fs')
        expect(fs.existsSync(testDir)).toBe(true)
      })

      it('should not fail if directory already exists', async () => {
        await queueManager.initialize()
        await queueManager.initialize()

        const fs = await import('node:fs')
        expect(fs.existsSync(testDir)).toBe(true)
      })
    })

    describe('enqueue', () => {
      it('should add item to queue', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: { test: 'data' },
        })

        expect(item.id).toBeDefined()
        expect(item.type).toBe('session')
        expect(item.sessionId).toBe('test-session')
        expect(item.status).toBe('pending')
        expect(item.retries).toBe(0)
        expect(item.createdAt).toBeDefined()
      })

      it('should generate unique IDs', async () => {
        const item1 = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-1',
          data: {},
        })

        const item2 = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-2',
          data: {},
        })

        expect(item1.id).not.toBe(item2.id)
      })

      it('should save item to disk', async () => {
        const item = await queueManager.enqueue({
          type: 'summary',
          sessionId: 'test-session',
          data: { summary: 'test' },
        })

        const retrieved = await queueManager.getItem(item.id)

        expect(retrieved).toEqual(item)
      })
    })

    describe('dequeue', () => {
      it('should return null for empty queue', async () => {
        const item = await queueManager.dequeue()

        expect(item).toBeNull()
      })

      it('should return oldest pending item', async () => {
        const item1 = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-1',
          data: {},
        })

        // Wait a bit to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10))

        await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-2',
          data: {},
        })

        const dequeued = await queueManager.dequeue()

        expect(dequeued?.id).toBe(item1.id)
      })

      it('should skip non-pending items', async () => {
        const item1 = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-1',
          data: {},
        })

        await queueManager.markSyncing(item1.id)

        const item2 = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-2',
          data: {},
        })

        const dequeued = await queueManager.dequeue()

        expect(dequeued?.id).toBe(item2.id)
      })
    })

    describe('getItem', () => {
      it('should return item by ID', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        const retrieved = await queueManager.getItem(item.id)

        expect(retrieved).toEqual(item)
      })

      it('should return null for non-existent item', async () => {
        const item = await queueManager.getItem('non-existent')

        expect(item).toBeNull()
      })
    })

    describe('updateItem', () => {
      it('should update item properties', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        const updated = await queueManager.updateItem(item.id, {
          status: 'syncing',
        })

        expect(updated?.status).toBe('syncing')
      })

      it('should return null for non-existent item', async () => {
        const updated = await queueManager.updateItem('non-existent', {
          status: 'syncing',
        })

        expect(updated).toBeNull()
      })

      it('should persist updates to disk', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        await queueManager.updateItem(item.id, {
          status: 'syncing',
        })

        const retrieved = await queueManager.getItem(item.id)

        expect(retrieved?.status).toBe('syncing')
      })
    })

    describe('markSyncing', () => {
      it('should mark item as syncing', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        const updated = await queueManager.markSyncing(item.id)

        expect(updated?.status).toBe('syncing')
      })
    })

    describe('markSynced', () => {
      it('should mark item as synced', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        const updated = await queueManager.markSynced(item.id)

        expect(updated?.status).toBe('synced')
      })
    })

    describe('markFailed', () => {
      it('should mark item as failed', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        const updated = await queueManager.markFailed(item.id, 'Test error')

        expect(updated?.status).toBe('failed')
        expect(updated?.lastError).toBe('Test error')
        expect(updated?.retries).toBe(1)
        expect(updated?.nextRetry).toBeDefined()
      })

      it('should increment retry count', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        await queueManager.markFailed(item.id, 'Error 1')
        const updated = await queueManager.markFailed(item.id, 'Error 2')

        expect(updated?.retries).toBe(2)
      })

      it('should set next retry time', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        const before = Date.now()
        const updated = await queueManager.markFailed(item.id, 'Test error', 5000)
        const after = Date.now()

        expect(updated?.nextRetry).toBeDefined()

        const nextRetryTime = new Date(updated!.nextRetry!).getTime()
        expect(nextRetryTime).toBeGreaterThanOrEqual(before + 5000)
        expect(nextRetryTime).toBeLessThanOrEqual(after + 5000 + 100) // Allow 100ms tolerance
      })
    })

    describe('removeItem', () => {
      it('should remove item from queue', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        const removed = await queueManager.removeItem(item.id)

        expect(removed).toBe(true)

        const retrieved = await queueManager.getItem(item.id)

        expect(retrieved).toBeNull()
      })

      it('should return false for non-existent item', async () => {
        const removed = await queueManager.removeItem('non-existent')

        expect(removed).toBe(false)
      })
    })

    describe('listItems', () => {
      it('should list all items', async () => {
        await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-1',
          data: {},
        })

        await queueManager.enqueue({
          type: 'summary',
          sessionId: 'test-2',
          data: {},
        })

        const items = await queueManager.listItems()

        expect(items).toHaveLength(2)
      })

      it('should filter by status', async () => {
        const item1 = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-1',
          data: {},
        })

        await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-2',
          data: {},
        })

        await queueManager.markSynced(item1.id)

        const pending = await queueManager.listItems({ status: 'pending' })
        const synced = await queueManager.listItems({ status: 'synced' })

        expect(pending).toHaveLength(1)
        expect(synced).toHaveLength(1)
      })

      it('should filter by sessionId', async () => {
        await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-1',
          data: {},
        })

        await queueManager.enqueue({
          type: 'summary',
          sessionId: 'test-2',
          data: {},
        })

        const items = await queueManager.listItems({ sessionId: 'test-1' })

        expect(items).toHaveLength(1)
        expect(items[0].sessionId).toBe('test-1')
      })

      it('should filter by type', async () => {
        await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-1',
          data: {},
        })

        await queueManager.enqueue({
          type: 'summary',
          sessionId: 'test-2',
          data: {},
        })

        const sessions = await queueManager.listItems({ type: 'session' })
        const summaries = await queueManager.listItems({ type: 'summary' })

        expect(sessions).toHaveLength(1)
        expect(summaries).toHaveLength(1)
      })

      it('should return empty array for empty queue', async () => {
        const items = await queueManager.listItems()

        expect(items).toEqual([])
      })
    })

    describe('getRetryableItems', () => {
      it('should return failed items ready for retry', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        // Mark as failed with past retry time
        await queueManager.markFailed(item.id, 'Test error', -1000)

        const retryable = await queueManager.getRetryableItems()

        expect(retryable).toHaveLength(1)
        expect(retryable[0].id).toBe(item.id)
      })

      it('should not return items with future retry time', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        // Mark as failed with future retry time
        await queueManager.markFailed(item.id, 'Test error', 60000)

        const retryable = await queueManager.getRetryableItems()

        expect(retryable).toHaveLength(0)
      })
    })

    describe('cleanupSynced', () => {
      it('should remove old synced items', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        await queueManager.markSynced(item.id)

        // Wait a bit to ensure the item is actually old
        await new Promise(resolve => setTimeout(resolve, 100))

        // Clean up items older than 0ms (all items)
        const removed = await queueManager.cleanupSynced(0)

        expect(removed).toBe(1)

        const items = await queueManager.listItems()

        expect(items).toHaveLength(0)
      })

      it('should not remove recent synced items', async () => {
        const item = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        await queueManager.markSynced(item.id)

        // Clean up items older than 1 hour
        const removed = await queueManager.cleanupSynced(60 * 60 * 1000)

        expect(removed).toBe(0)

        const items = await queueManager.listItems()

        expect(items).toHaveLength(1)
      })

      it('should not remove non-synced items', async () => {
        await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-session',
          data: {},
        })

        const removed = await queueManager.cleanupSynced(0)

        expect(removed).toBe(0)
      })
    })

    describe('getStats', () => {
      it('should return queue statistics', async () => {
        const item1 = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-1',
          data: {},
        })

        const item2 = await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-2',
          data: {},
        })

        await queueManager.markSyncing(item1.id)
        await queueManager.markFailed(item2.id, 'Test error', -1000)

        const stats = await queueManager.getStats()

        expect(stats.total).toBe(2)
        expect(stats.pending).toBe(0)
        expect(stats.syncing).toBe(1)
        expect(stats.synced).toBe(0)
        expect(stats.failed).toBe(1)
        expect(stats.retryable).toBe(1)
      })

      it('should return zero stats for empty queue', async () => {
        const stats = await queueManager.getStats()

        expect(stats.total).toBe(0)
        expect(stats.pending).toBe(0)
        expect(stats.syncing).toBe(0)
        expect(stats.synced).toBe(0)
        expect(stats.failed).toBe(0)
        expect(stats.retryable).toBe(0)
      })
    })

    describe('clearQueue', () => {
      it('should remove all items', async () => {
        await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-1',
          data: {},
        })

        await queueManager.enqueue({
          type: 'session',
          sessionId: 'test-2',
          data: {},
        })

        const removed = await queueManager.clearQueue()

        expect(removed).toBe(2)

        const items = await queueManager.listItems()

        expect(items).toHaveLength(0)
      })

      it('should return 0 for empty queue', async () => {
        const removed = await queueManager.clearQueue()

        expect(removed).toBe(0)
      })
    })
  })

  describe('factory function', () => {
    it('should create sync queue manager', () => {
      const manager = createSyncQueueManager(testDir)

      expect(manager).toBeInstanceOf(SyncQueueManager)
    })
  })
})
