/**
 * Cloud sync queue management for CCJK Context Compression System
 * Prepares infrastructure for future cloud synchronization
 */

import type { SyncQueueItem, SyncStatus } from './storage-types'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'pathe'

/**
 * Sync queue manager class
 */
export class SyncQueueManager {
  private queueDir: string

  constructor(queueDir: string) {
    this.queueDir = queueDir
  }

  /**
   * Initialize sync queue directory
   */
  async initialize(): Promise<void> {
    if (!existsSync(this.queueDir)) {
      await mkdir(this.queueDir, { recursive: true })
    }
  }

  /**
   * Add item to sync queue
   *
   * @param item - Sync queue item to add
   * @returns Added item with generated ID
   */
  async enqueue(
    item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'status' | 'retries'>,
  ): Promise<SyncQueueItem> {
    await this.initialize()

    const queueItem: SyncQueueItem = {
      ...item,
      id: this.generateQueueId(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      retries: 0,
    }

    const filePath = this.getQueueItemPath(queueItem.id)
    await writeFile(filePath, JSON.stringify(queueItem, null, 2), 'utf-8')

    return queueItem
  }

  /**
   * Get next pending item from queue
   *
   * @returns Next pending item or null if queue is empty
   */
  async dequeue(): Promise<SyncQueueItem | null> {
    const items = await this.listItems({ status: 'pending' })

    if (items.length === 0) {
      return null
    }

    // Sort by creation time (oldest first)
    items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    return items[0]
  }

  /**
   * Get specific queue item
   *
   * @param id - Queue item ID
   * @returns Queue item or null if not found
   */
  async getItem(id: string): Promise<SyncQueueItem | null> {
    await this.initialize()

    try {
      const filePath = this.getQueueItemPath(id)

      if (!existsSync(filePath)) {
        return null
      }

      const content = await readFile(filePath, 'utf-8')
      return JSON.parse(content) as SyncQueueItem
    }
    catch {
      return null
    }
  }

  /**
   * Update queue item status
   *
   * @param id - Queue item ID
   * @param updates - Partial updates to apply
   */
  async updateItem(
    id: string,
    updates: Partial<Omit<SyncQueueItem, 'id'>>,
  ): Promise<SyncQueueItem | null> {
    await this.initialize()

    const item = await this.getItem(id)

    if (!item) {
      return null
    }

    const updatedItem: SyncQueueItem = {
      ...item,
      ...updates,
    }

    const filePath = this.getQueueItemPath(id)
    await writeFile(filePath, JSON.stringify(updatedItem, null, 2), 'utf-8')

    return updatedItem
  }

  /**
   * Mark item as syncing
   *
   * @param id - Queue item ID
   */
  async markSyncing(id: string): Promise<SyncQueueItem | null> {
    return this.updateItem(id, { status: 'syncing' })
  }

  /**
   * Mark item as synced
   *
   * @param id - Queue item ID
   */
  async markSynced(id: string): Promise<SyncQueueItem | null> {
    return this.updateItem(id, { status: 'synced' })
  }

  /**
   * Mark item as failed
   *
   * @param id - Queue item ID
   * @param error - Error message
   * @param retryDelay - Delay before next retry in milliseconds
   */
  async markFailed(
    id: string,
    error: string,
    retryDelay = 60000,
  ): Promise<SyncQueueItem | null> {
    const item = await this.getItem(id)

    if (!item) {
      return null
    }

    const nextRetry = new Date(Date.now() + retryDelay).toISOString()

    return this.updateItem(id, {
      status: 'failed',
      lastError: error,
      retries: item.retries + 1,
      nextRetry,
    })
  }

  /**
   * Remove item from queue
   *
   * @param id - Queue item ID
   */
  async removeItem(id: string): Promise<boolean> {
    try {
      const filePath = this.getQueueItemPath(id)

      if (!existsSync(filePath)) {
        return false
      }

      await unlink(filePath)
      return true
    }
    catch {
      return false
    }
  }

  /**
   * List queue items with optional filtering
   *
   * @param options - Filter options
   * @param options.status - Filter by sync status
   * @param options.sessionId - Filter by session ID
   * @param options.type - Filter by item type
   * @returns Array of queue items
   */
  async listItems(options?: {
    status?: SyncStatus
    sessionId?: string
    type?: SyncQueueItem['type']
  }): Promise<SyncQueueItem[]> {
    try {
      if (!existsSync(this.queueDir)) {
        return []
      }

      const files = await readdir(this.queueDir)
      const items: SyncQueueItem[] = []

      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue
        }

        try {
          const filePath = join(this.queueDir, file)
          const content = await readFile(filePath, 'utf-8')
          const item = JSON.parse(content) as SyncQueueItem

          // Apply filters
          if (options?.status && item.status !== options.status) {
            continue
          }

          if (options?.sessionId && item.sessionId !== options.sessionId) {
            continue
          }

          if (options?.type && item.type !== options.type) {
            continue
          }

          items.push(item)
        }
        catch {
          // Skip invalid files
          continue
        }
      }

      return items
    }
    catch {
      return []
    }
  }

  /**
   * Get items ready for retry
   * Returns failed items where nextRetry time has passed
   */
  async getRetryableItems(): Promise<SyncQueueItem[]> {
    const failedItems = await this.listItems({ status: 'failed' })
    const now = new Date().toISOString()

    return failedItems.filter(item =>
      item.nextRetry && item.nextRetry <= now,
    )
  }

  /**
   * Clean up synced items older than specified age
   *
   * @param maxAge - Maximum age in milliseconds
   * @returns Number of items removed
   */
  async cleanupSynced(maxAge: number): Promise<number> {
    const syncedItems = await this.listItems({ status: 'synced' })
    const cutoffTime = new Date(Date.now() - maxAge).toISOString()
    let removed = 0

    for (const item of syncedItems) {
      if (item.createdAt < cutoffTime) {
        const success = await this.removeItem(item.id)
        if (success) {
          removed++
        }
      }
    }

    return removed
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    total: number
    pending: number
    syncing: number
    synced: number
    failed: number
    retryable: number
  }> {
    const allItems = await this.listItems()
    const retryableItems = await this.getRetryableItems()

    return {
      total: allItems.length,
      pending: allItems.filter(i => i.status === 'pending').length,
      syncing: allItems.filter(i => i.status === 'syncing').length,
      synced: allItems.filter(i => i.status === 'synced').length,
      failed: allItems.filter(i => i.status === 'failed').length,
      retryable: retryableItems.length,
    }
  }

  /**
   * Clear entire queue
   * WARNING: This removes all items regardless of status
   */
  async clearQueue(): Promise<number> {
    const items = await this.listItems()
    let removed = 0

    for (const item of items) {
      const success = await this.removeItem(item.id)
      if (success) {
        removed++
      }
    }

    return removed
  }

  /**
   * Generate unique queue item ID
   */
  private generateQueueId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10)
    return `${timestamp}-${random}`
  }

  /**
   * Get file path for queue item
   */
  private getQueueItemPath(id: string): string {
    return join(this.queueDir, `${id}.json`)
  }
}

/**
 * Create a new sync queue manager
 *
 * @param queueDir - Directory for sync queue storage
 * @returns Sync queue manager instance
 */
export function createSyncQueueManager(queueDir: string): SyncQueueManager {
  return new SyncQueueManager(queueDir)
}
