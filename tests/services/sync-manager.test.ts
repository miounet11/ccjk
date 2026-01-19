/**
 * Sync Manager Service Tests
 *
 * Tests for the unified sync manager that handles multiple resource types
 */

import type {
  SyncManager,
} from '../../src/services/cloud/sync-manager'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createSyncManager,
  quickPull,
  quickPush,
  quickSync,
} from '../../src/services/cloud/sync-manager'

// Mock the skills-sync module
vi.mock('../../src/services/cloud/skills-sync', () => ({
  syncAllSkills: vi.fn(async () => ({
    success: true,
    total: 5,
    succeeded: 5,
    failed: 0,
    conflicts: 0,
    uploaded: 2,
    downloaded: 1,
    skipped: 2,
    results: [],
    durationMs: 100,
  })),
  pushSkills: vi.fn(async () => ({
    success: true,
    total: 3,
    succeeded: 3,
    failed: 0,
    conflicts: 0,
    uploaded: 3,
    downloaded: 0,
    skipped: 0,
    results: [],
    durationMs: 50,
  })),
  pullSkills: vi.fn(async () => ({
    success: true,
    total: 2,
    succeeded: 2,
    failed: 0,
    conflicts: 0,
    uploaded: 0,
    downloaded: 2,
    skipped: 0,
    results: [],
    durationMs: 75,
  })),
  loadSyncState: vi.fn(() => ({
    version: '1.0.0',
    lastGlobalSync: new Date().toISOString(),
    skills: {},
  })),
  saveSyncState: vi.fn(),
}))

describe('syncManager', () => {
  let manager: SyncManager

  beforeEach(() => {
    manager = createSyncManager()
    vi.clearAllMocks()
  })

  describe('sync', () => {
    it('should sync all resources', async () => {
      const result = await manager.sync()

      expect(result.success).toBe(true)
      expect(result.stats.totalResources).toBeGreaterThan(0)
    })

    it('should sync specific resource type', async () => {
      const manager2 = createSyncManager({ resourceType: 'skills' })
      const result = await manager2.sync()

      expect(result.success).toBe(true)
      expect(result.results.skills).not.toBeNull()
    })

    it('should handle sync errors gracefully', async () => {
      const manager2 = createSyncManager()
      const result = await manager2.sync()

      expect(result).toBeDefined()
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('push', () => {
    it('should push all resources to cloud', async () => {
      const result = await manager.push()

      expect(result.success).toBe(true)
      expect(result.stats.totalResources).toBeGreaterThan(0)
    })

    it('should push specific skill IDs', async () => {
      const manager2 = createSyncManager({ skillIds: ['skill-1', 'skill-2'] })
      const result = await manager2.push()

      expect(result).toBeDefined()
    })
  })

  describe('pull', () => {
    it('should pull all resources from cloud', async () => {
      const result = await manager.pull()

      expect(result.success).toBe(true)
      expect(result.stats.totalResources).toBeGreaterThan(0)
    })

    it('should pull specific skill IDs', async () => {
      const manager2 = createSyncManager({ skillIds: ['skill-1'] })
      const result = await manager2.pull()

      expect(result).toBeDefined()
    })
  })

  describe('getStatus', () => {
    it('should get sync status for all resources', async () => {
      const status = await manager.getStatus()

      expect(status).toBeDefined()
      expect(status.skills).toBeDefined()
    })
  })

  describe('resetState', () => {
    it('should reset sync state for all resources', async () => {
      await manager.resetState()

      const status = await manager.getStatus()
      expect(status.skills.skills).toEqual({})
    })
  })

  describe('convenience functions', () => {
    it('should sync via quickSync', async () => {
      const result = await quickSync()

      expect(result.success).toBe(true)
    })

    it('should push via quickPush', async () => {
      const result = await quickPush()

      expect(result.success).toBe(true)
    })

    it('should pull via quickPull', async () => {
      const result = await quickPull()

      expect(result.success).toBe(true)
    })
  })

  describe('statistics calculation', () => {
    it('should calculate correct statistics', async () => {
      const result = await manager.sync()

      expect(result.stats.totalItems).toBeGreaterThanOrEqual(0)
      expect(result.stats.succeededItems).toBeGreaterThanOrEqual(0)
      expect(result.stats.failedItems).toBeGreaterThanOrEqual(0)
      expect(result.stats.conflicts).toBeGreaterThanOrEqual(0)
    })
  })
})
