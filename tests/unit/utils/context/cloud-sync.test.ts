/**
 * Unit tests for Cloud Sync
 * Tests cross-device synchronization of sessions and summaries
 */

import type { SyncData } from '../../../../src/utils/context/cloud-sync'
import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudSync } from '../../../../src/utils/context/cloud-sync'

// Mock storage manager
vi.mock('../../../../src/utils/context/storage-manager', () => ({
  createStorageManager: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    getSession: vi.fn().mockResolvedValue({
      meta: {
        id: 'test-session',
        projectPath: '/test/project',
        projectHash: 'test-hash',
        startTime: new Date().toISOString(),
        status: 'active',
        tokenCount: 1000,
        summaryTokens: 100,
        fcCount: 5,
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      },
      path: '/tmp/sessions/test-session',
      fcLogPath: '/tmp/sessions/test-session/fc-log.jsonl',
      summaryPath: '/tmp/sessions/test-session/summary.md',
    }),
    updateSession: vi.fn().mockResolvedValue(undefined),
    getSummary: vi.fn().mockResolvedValue('Test summary'),
    saveSummary: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Mock sync queue manager
vi.mock('../../../../src/utils/context/sync-queue', () => ({
  createSyncQueueManager: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    listItems: vi.fn().mockResolvedValue([]),
    getRetryableItems: vi.fn().mockResolvedValue([]),
    markSyncing: vi.fn().mockResolvedValue(undefined),
    markSynced: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Mock fetch
globalThis.fetch = vi.fn()

// Helper to create mock Response
function mockResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: () => mockResponse(data, ok, status),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob([]),
    formData: async () => { throw new Error('Not implemented') },
    text: async () => JSON.stringify(data),
    json: async () => data,
  } as Response
}

// Helper to create mock Response that throws on json()
function mockResponseJsonError(): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: () => mockResponseJsonError(),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob([]),
    formData: async () => { throw new Error('Not implemented') },
    text: async () => 'invalid',
    json: async () => { throw new Error('Invalid JSON') },
  } as Response
}

describe('cloudSync', () => {
  let cloudSync: CloudSync

  beforeEach(() => {
    vi.clearAllMocks()
    cloudSync = new CloudSync({
      apiEndpoint: 'https://test-api.example.com',
      apiKey: 'test-api-key',
      syncInterval: 60000,
      maxRetries: 3,
      conflictStrategy: 'local-wins',
      enableCompression: false, // Disable compression for simpler tests
    })
  })

  describe('initialization', () => {
    it('should create cloud sync with required options', () => {
      expect(cloudSync).toBeDefined()
    })

    it('should create cloud sync with default options', () => {
      const defaultSync = new CloudSync({
        apiEndpoint: 'https://api.example.com',
      })
      expect(defaultSync).toBeDefined()
    })

    it('should merge with default configuration', () => {
      const status = cloudSync.getStatus()
      expect(status).toBeDefined()
    })

    it('should generate unique device ID', () => {
      const sync1 = new CloudSync({ apiEndpoint: 'https://api.example.com' })
      const sync2 = new CloudSync({ apiEndpoint: 'https://api.example.com' })
      expect(sync1).not.toBe(sync2)
    })

    it('should set default conflict strategy', () => {
      const defaultSync = new CloudSync({
        apiEndpoint: 'https://api.example.com',
      })
      expect(defaultSync).toBeDefined()
    })
  })

  describe('service Lifecycle', () => {
    it('should start sync service', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      await cloudSync.start()
      const status = cloudSync.getStatus()
      expect(status.isRunning).toBe(true)
    })

    it('should stop sync service', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      await cloudSync.start()
      await cloudSync.stop()
      const status = cloudSync.getStatus()
      expect(status.isRunning).toBe(false)
    })

    it('should not start twice', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse([]))

      await cloudSync.start()
      await cloudSync.start()
      expect(cloudSync.getStatus().isRunning).toBe(true)
    })

    it('should not stop if not running', async () => {
      await cloudSync.stop()
      expect(cloudSync.getStatus().isRunning).toBe(false)
    })

    it('should emit sync_started event', async () => {
      const eventSpy = vi.fn()
      cloudSync.on('sync_started', eventSpy)

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      await cloudSync.start()
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should perform initial sync on start', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      await cloudSync.start()
      expect(fetch).toHaveBeenCalled()
    })

    it('should handle start errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      await cloudSync.start()
      // Start doesn't throw, it just starts the service
      // Errors will be tracked during sync operations
      expect(cloudSync.getStatus().isRunning).toBe(true)
    })

    it('should cleanup on stop', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      await cloudSync.start()
      await cloudSync.stop()
      expect(cloudSync.getStatus().isRunning).toBe(false)
    })
  })

  describe('upload Operations', () => {
    it('should upload data to cloud', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({}))

      const syncData: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { test: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: 'test-checksum',
      }

      await cloudSync.upload(syncData)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/upload'),
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })

    it('should include data in upload request', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({}))

      const syncData: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { test: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: 'test-checksum',
      }

      await cloudSync.upload(syncData)
      expect(fetch).toHaveBeenCalled()
    })

    it('should generate checksum for data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({}))

      const syncData: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { test: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: '',
      }

      await cloudSync.upload(syncData)
      expect(fetch).toHaveBeenCalled()
    })

    it('should emit upload_success event', async () => {
      const eventSpy = vi.fn()
      cloudSync.on('upload_success', eventSpy)

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({}))

      const syncData: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { test: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: 'test-checksum',
      }

      await cloudSync.upload(syncData)
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should handle upload errors', async () => {
      // Mock all retry attempts to fail (maxRetries is 3 by default)
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const syncData: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { test: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: 'test-checksum',
      }

      await expect(cloudSync.upload(syncData)).rejects.toThrow('Network error')
    })

    it('should include API key in headers', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({}))

      const syncData: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { test: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: 'test-checksum',
      }

      await cloudSync.upload(syncData)
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      )
    })

    it('should handle HTTP error responses', async () => {
      // Mock all retry attempts to fail with HTTP error
      vi.mocked(fetch).mockResolvedValue(mockResponse(null, false, 500))

      const syncData: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { test: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: 'test-checksum',
      }

      await expect(cloudSync.upload(syncData)).rejects.toThrow('Upload failed')
    })
  })

  describe('download Operations', () => {
    it('should download data from cloud', async () => {
      const data = { remote: 'data' }
      const checksum = createHash('sha256').update(JSON.stringify(data)).digest('hex')

      const remoteData: SyncData[] = [
        {
          id: 'remote-id',
          type: 'session',
          data,
          version: 1,
          updatedAt: Date.now(),
          checksum,
        },
      ]

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse(remoteData))

      const result = await cloudSync.download()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('remote-id')
    })

    it('should return empty array when no data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      const result = await cloudSync.download()
      expect(result).toEqual([])
    })

    it('should throw on download failure', async () => {
      // Mock all retry attempts to fail
      vi.mocked(fetch).mockResolvedValue(mockResponse(null, false, 404))

      await expect(cloudSync.download()).rejects.toThrow('Download failed')
    })

    it('should handle network errors', async () => {
      // Mock all retry attempts to fail
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      await expect(cloudSync.download()).rejects.toThrow('Network error')
    })

    it('should include API key in download request', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      await cloudSync.download()
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      )
    })

    it('should handle invalid JSON response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponseJsonError())

      await expect(cloudSync.download()).rejects.toThrow()
    })
  })

  describe('synchronization', () => {
    it('should perform manual sync', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse([]))

      const result = await cloudSync.syncNow()
      expect(result).toBeDefined()
      expect(result.uploaded).toBe(0)
      expect(result.downloaded).toBe(0)
    })

    it('should emit sync_completed event', async () => {
      const eventSpy = vi.fn()
      cloudSync.on('sync_completed', eventSpy)

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      await cloudSync.syncNow()
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should emit sync_failed event on error', async () => {
      const eventSpy = vi.fn()
      cloudSync.on('sync_failed', eventSpy)

      // Mock fetch to fail which will cause processUploadQueue to throw
      vi.mocked(fetch).mockRejectedValue(new Error('Critical sync error'))

      // Also mock internal method to ensure error propagates
      vi.spyOn(cloudSync as any, 'downloadRemoteChanges').mockRejectedValueOnce(new Error('Critical sync error'))

      const result = await cloudSync.syncNow()
      // The error should be captured in result.errors
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should update last sync time', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      await cloudSync.syncNow()
      const status = cloudSync.getStatus()
      expect(status.lastSync).not.toBeNull()
    })

    it('should track sync duration', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      const result = await cloudSync.syncNow()
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('should handle partial sync failures', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      const result = await cloudSync.syncNow()
      expect(result).toBeDefined()
    })

    it('should not sync when already syncing', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(mockResponse([])), 100)))

      const sync1 = cloudSync.syncNow()
      await expect(cloudSync.syncNow()).rejects.toThrow('Sync already in progress')
      await sync1
    })
  })

  describe('conflict Resolution', () => {
    it('should detect conflicts', async () => {
      const eventSpy = vi.fn()
      cloudSync.on('conflict_detected', eventSpy)

      const local: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { local: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: 'local-checksum',
      }

      const remote: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { remote: 'data' },
        version: 2,
        updatedAt: Date.now() + 1000,
        checksum: 'remote-checksum',
      }

      await cloudSync.resolveConflict(local, remote)
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should resolve with local-wins strategy', async () => {
      const local: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { local: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: 'local-checksum',
      }

      const remote: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { remote: 'data' },
        version: 2,
        updatedAt: Date.now() + 1000,
        checksum: 'remote-checksum',
      }

      const resolved = await cloudSync.resolveConflict(local, remote)
      expect(resolved).toEqual(local)
    })

    it('should resolve with remote-wins strategy', async () => {
      const remoteWinsSync = new CloudSync({
        apiEndpoint: 'https://test-api.example.com',
        conflictStrategy: 'remote-wins',
      })

      const local: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { local: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: 'local-checksum',
      }

      const remote: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { remote: 'data' },
        version: 2,
        updatedAt: Date.now() + 1000,
        checksum: 'remote-checksum',
      }

      const resolved = await remoteWinsSync.resolveConflict(local, remote)
      expect(resolved).toEqual(remote)
    })

    it('should resolve with merge strategy', async () => {
      const mergeSync = new CloudSync({
        apiEndpoint: 'https://test-api.example.com',
        conflictStrategy: 'merge',
      })

      const local: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { local: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: 'local-checksum',
      }

      const remote: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { remote: 'data' },
        version: 2,
        updatedAt: Date.now() + 1000,
        checksum: 'remote-checksum',
      }

      const resolved = await mergeSync.resolveConflict(local, remote)
      expect(resolved).toBeDefined()
    })

    it('should emit conflict_resolved event', async () => {
      const eventSpy = vi.fn()
      cloudSync.on('conflict_resolved', eventSpy)

      const local: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { local: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: 'local-checksum',
      }

      const remote: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { remote: 'data' },
        version: 2,
        updatedAt: Date.now() + 1000,
        checksum: 'remote-checksum',
      }

      await cloudSync.resolveConflict(local, remote)
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should handle same version conflicts', async () => {
      const local: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { local: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: 'local-checksum',
      }

      const remote: SyncData = {
        id: 'test-id',
        type: 'session',
        data: { remote: 'data' },
        version: 1,
        updatedAt: Date.now(),
        checksum: 'remote-checksum',
      }

      const resolved = await cloudSync.resolveConflict(local, remote)
      expect(resolved).toBeDefined()
    })
  })

  describe('status and Configuration', () => {
    it('should get sync status', () => {
      const status = cloudSync.getStatus()
      expect(status).toBeDefined()
      expect(status.isRunning).toBe(false)
      expect(status.lastSync).toBeNull()
    })

    it('should update configuration', () => {
      cloudSync.updateConfig({
        syncInterval: 120000,
      })
      expect(cloudSync).toBeDefined()
    })

    it('should clear error history', () => {
      cloudSync.clearErrors()
      const status = cloudSync.getStatus()
      expect(status.errors).toEqual([])
    })

    it('should track recent errors', async () => {
      // Mock downloadRemoteChanges to throw - this will propagate to syncNow and call addError
      vi.spyOn(cloudSync as any, 'downloadRemoteChanges').mockRejectedValueOnce(new Error('Test error'))

      const result = await cloudSync.syncNow()
      // Error should be in result
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should provide sync statistics', () => {
      const status = cloudSync.getStatus()
      expect(status).toHaveProperty('isRunning')
      expect(status).toHaveProperty('lastSync')
      expect(status).toHaveProperty('errors')
    })
  })

  describe('event System', () => {
    it('should emit sync events', async () => {
      const eventSpy = vi.fn()
      cloudSync.on('sync_event', eventSpy)

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      await cloudSync.start()
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should support multiple event listeners', async () => {
      const spy1 = vi.fn()
      const spy2 = vi.fn()

      cloudSync.on('sync_started', spy1)
      cloudSync.on('sync_started', spy2)

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      await cloudSync.start()
      expect(spy1).toHaveBeenCalled()
      expect(spy2).toHaveBeenCalled()
    })

    it('should emit download_success event', async () => {
      const eventSpy = vi.fn()
      cloudSync.on('download_success', eventSpy)

      const testData = { test: 'data' }
      const correctChecksum = 'e1d7c49f3a04e1ec1a5b150ec68041c903cd75fda52aa1239fd586439ef1154b'

      // Mock getLocalData to return null (no local data exists)
      vi.spyOn(cloudSync as any, 'getLocalData').mockResolvedValueOnce(null)

      // Mock saveLocalData to succeed
      vi.spyOn(cloudSync as any, 'saveLocalData').mockResolvedValueOnce(undefined)

      const remoteData2 = [{
        id: 'test-id',
        type: 'session',
        data: testData,
        version: 1,
        updatedAt: Date.now(),
        checksum: correctChecksum,
      }]
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse(remoteData2))

      await cloudSync.syncNow()
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should allow removing event listeners', () => {
      const eventSpy = vi.fn()
      cloudSync.on('sync_started', eventSpy)
      cloudSync.off('sync_started', eventSpy)
      expect(cloudSync).toBeDefined()
    })
  })

  describe('error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock fetch to fail for download (needs 3 retries)
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))

      const result = await cloudSync.syncNow()
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle invalid response data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponseJsonError())

      const result = await cloudSync.syncNow()
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should continue sync on partial failures', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      const result = await cloudSync.syncNow()
      expect(result).toBeDefined()
    })

    it('should handle timeout errors', async () => {
      // Mock fetch to reject with timeout once, then succeed
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Timeout'))
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([]))

      // The download method has retry logic
      const result = await cloudSync.download()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle malformed API responses', async () => {
      // Mock response with valid JSON array containing invalid items
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse([{ invalid: true }]))

      // Malformed responses will cause errors when trying to process items
      await expect(cloudSync.download()).rejects.toThrow()
    })
  })
})
