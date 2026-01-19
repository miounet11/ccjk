/**
 * Cloud Configuration Sync Tests
 *
 * Tests for cloud configuration synchronization functionality.
 */

import type { CloudSyncEvent } from '../src/cloud-config-sync'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudConfigSync } from '../src/cloud-config-sync'

// Mock fetch globally
globalThis.fetch = vi.fn()

describe('cloudConfigSync', () => {
  let sync: CloudConfigSync

  beforeEach(() => {
    vi.clearAllMocks()

    sync = new CloudConfigSync({
      syncInterval: 1000, // 1 second for testing
      timeout: 500,
      syncOnStart: false,
    })
  })

  afterEach(() => {
    sync.stopSync()
  })

  it('should create a CloudConfigSync instance', () => {
    expect(sync).toBeInstanceOf(CloudConfigSync)
  })

  it('should start and stop sync', () => {
    expect(sync.isActive()).toBe(false)

    sync.startSync()
    expect(sync.isActive()).toBe(true)

    sync.stopSync()
    expect(sync.isActive()).toBe(false)
  })

  it('should fetch configuration from cloud', async () => {
    const mockData = [
      { id: 'test-provider', name: 'Test Provider' },
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    } as Response)

    const updatePromise = new Promise<CloudSyncEvent>((resolve) => {
      sync.once('config-updated', resolve)
    })

    await sync.forceSync()

    const event = await updatePromise

    expect(event.type).toBe('config-updated')
    expect(event.data).toEqual(mockData)
    expect(fetch).toHaveBeenCalled()
  })

  it('should handle fetch errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const failPromise = new Promise<CloudSyncEvent>((resolve) => {
      sync.once('sync-failed', resolve)
    })

    await expect(sync.forceSync()).rejects.toThrow()

    const event = await failPromise

    expect(event.type).toBe('sync-failed')
    expect(event.error).toBeInstanceOf(Error)
  })

  it('should retry on failure', async () => {
    const mockData = [{ id: 'test' }]

    // Fail first two attempts, succeed on third
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      } as Response)

    await sync.forceSync()

    // Should have made 3 attempts
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('should detect configuration changes', async () => {
    const mockData1 = [{ id: 'provider1' }]
    const mockData2 = [{ id: 'provider2' }]

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData1 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData2 }),
      } as Response)

    const updates: CloudSyncEvent[] = []
    sync.on('config-updated', (event) => {
      updates.push(event)
    })

    await sync.forceSync()
    await sync.forceSync()

    // Should emit update events for both syncs since data changed
    expect(updates.length).toBe(2)
    expect(updates[0].data).toEqual(mockData1)
    expect(updates[1].data).toEqual(mockData2)
  })

  it('should not emit update if config unchanged', async () => {
    const mockData = [{ id: 'provider1' }]

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    } as Response)

    const updates: CloudSyncEvent[] = []
    sync.on('config-updated', (event) => {
      updates.push(event)
    })

    await sync.forceSync()
    await sync.forceSync()

    // Should only emit one update since data didn't change
    expect(updates.length).toBe(1)
  })

  it('should track sync statistics', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response)
      .mockRejectedValueOnce(new Error('Fail'))

    await sync.forceSync()
    await expect(sync.forceSync()).rejects.toThrow()

    const stats = sync.getStats()

    expect(stats.totalSyncs).toBe(2)
    expect(stats.successfulSyncs).toBe(1)
    expect(stats.failedSyncs).toBe(1)
    expect(stats.lastError).toBeInstanceOf(Error)
    expect(stats.lastSuccessAt).toBeInstanceOf(Date)
  })

  it('should support onConfigUpdate callback', async () => {
    const mockData = [{ id: 'test' }]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    } as Response)

    const callback = vi.fn()
    const unsubscribe = sync.onConfigUpdate(callback)

    await sync.forceSync()

    expect(callback).toHaveBeenCalled()
    expect(callback.mock.calls[0][0].data).toEqual(mockData)

    // Unsubscribe
    unsubscribe()
    callback.mockClear()

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [{ id: 'new' }] }),
    } as Response)

    await sync.forceSync()

    expect(callback).not.toHaveBeenCalled()
  })

  it('should emit sync lifecycle events', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response)

    const events: string[] = []

    sync.on('sync-started', () => events.push('started'))
    sync.on('sync-completed', () => events.push('completed'))

    await sync.forceSync()

    expect(events).toEqual(['started', 'completed'])
  })

  it('should handle API errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response)

    await expect(sync.forceSync()).rejects.toThrow('500')
  })

  it('should handle malformed API responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, error: { message: 'Invalid request' } }),
    } as Response)

    await expect(sync.forceSync()).rejects.toThrow('Invalid request')
  })

  it('should respect timeout', async () => {
    const slowSync = new CloudConfigSync({
      timeout: 100,
      maxRetries: 1,
    })

    // Mock a slow response
    vi.mocked(fetch).mockImplementationOnce(
      () => new Promise<Response>(resolve => setTimeout(() => resolve({} as Response), 500)),
    )

    await expect(slowSync.forceSync()).rejects.toThrow()

    slowSync.stopSync()
  })

  it('should perform periodic sync', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response)

    const periodicSync = new CloudConfigSync({
      syncInterval: 200,
      syncOnStart: false,
    })

    const syncs: CloudSyncEvent[] = []
    periodicSync.on('sync-completed', (event) => {
      syncs.push(event)
    })

    periodicSync.startSync()

    // Wait for multiple sync cycles
    await new Promise(resolve => setTimeout(resolve, 500))

    periodicSync.stopSync()

    // Should have performed at least 2 syncs
    expect(syncs.length).toBeGreaterThanOrEqual(2)
  })
})
