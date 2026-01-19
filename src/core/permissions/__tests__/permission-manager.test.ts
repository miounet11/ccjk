/**
 * Tests for Permission Manager
 */

import type { PermissionLevel } from '../types'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PermissionManager } from '../permission-manager'

describe('permissionManager', () => {
  let manager: PermissionManager

  beforeEach(() => {
    manager = PermissionManager.getInstance()
    // Clear all permissions before each test
    manager.clearAllPermissions()
  })

  afterEach(() => {
    // Clean up after each test
    manager.clearAllPermissions()
  })

  describe('singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PermissionManager.getInstance()
      const instance2 = PermissionManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('permission Granting', () => {
    it('should grant permission for a resource', async () => {
      await manager.grantPermission('test-resource', 'read')
      const permission = manager.getPermission('test-resource')

      expect(permission).toBeDefined()
      expect(permission?.resource).toBe('test-resource')
      expect(permission?.level).toBe('read')
    })

    it('should grant permission with metadata', async () => {
      const metadata = { source: 'test', timestamp: Date.now() }
      await manager.grantPermission('test-resource', 'write', metadata)
      const permission = manager.getPermission('test-resource')

      expect(permission?.metadata).toEqual(metadata)
    })

    it('should update existing permission', async () => {
      await manager.grantPermission('test-resource', 'read')
      await manager.grantPermission('test-resource', 'write')

      const permission = manager.getPermission('test-resource')
      expect(permission?.level).toBe('write')
    })
  })

  describe('permission Checking', () => {
    it('should check permission correctly', async () => {
      await manager.grantPermission('test-resource', 'read')

      const hasRead = await manager.checkPermission('test-resource', 'read')
      expect(hasRead).toBe(true)
    })

    it('should deny permission for non-existent resource', async () => {
      const hasPermission = await manager.checkPermission('non-existent', 'read')
      expect(hasPermission).toBe(false)
    })

    it('should respect permission levels', async () => {
      await manager.grantPermission('test-resource', 'read')

      const hasRead = await manager.checkPermission('test-resource', 'read')
      const hasWrite = await manager.checkPermission('test-resource', 'write')

      expect(hasRead).toBe(true)
      expect(hasWrite).toBe(false)
    })

    it('should allow higher permissions to satisfy lower requirements', async () => {
      await manager.grantPermission('test-resource', 'full')

      const hasRead = await manager.checkPermission('test-resource', 'read')
      const hasWrite = await manager.checkPermission('test-resource', 'write')
      const hasFull = await manager.checkPermission('test-resource', 'full')

      expect(hasRead).toBe(true)
      expect(hasWrite).toBe(true)
      expect(hasFull).toBe(true)
    })
  })

  describe('permission Revocation', () => {
    it('should revoke permission', async () => {
      await manager.grantPermission('test-resource', 'read')
      await manager.revokePermission('test-resource')

      const permission = manager.getPermission('test-resource')
      expect(permission).toBeUndefined()
    })

    it('should not throw when revoking non-existent permission', async () => {
      await expect(manager.revokePermission('non-existent')).resolves.not.toThrow()
    })
  })

  describe('permission Listing', () => {
    it('should list all permissions', async () => {
      await manager.grantPermission('resource1', 'read')
      await manager.grantPermission('resource2', 'write')
      await manager.grantPermission('resource3', 'full')

      const permissions = manager.getAllPermissions()
      expect(permissions).toHaveLength(3)
    })

    it('should return empty array when no permissions', () => {
      const permissions = manager.getAllPermissions()
      expect(permissions).toHaveLength(0)
    })
  })

  describe('permission Clearing', () => {
    it('should clear all permissions', async () => {
      await manager.grantPermission('resource1', 'read')
      await manager.grantPermission('resource2', 'write')

      await manager.clearAllPermissions()

      const permissions = manager.getAllPermissions()
      expect(permissions).toHaveLength(0)
    })
  })

  describe('resource Pattern Matching', () => {
    it('should match exact resource', async () => {
      await manager.grantPermission('file:///path/to/file.txt', 'read')

      const hasPermission = await manager.checkPermission('file:///path/to/file.txt', 'read')
      expect(hasPermission).toBe(true)
    })

    it('should match wildcard patterns', async () => {
      await manager.grantPermission('file:///path/to/*', 'read')

      const hasPermission = await manager.checkPermission('file:///path/to/file.txt', 'read')
      expect(hasPermission).toBe(true)
    })

    it('should match protocol patterns', async () => {
      await manager.grantPermission('mcp://*', 'full')

      const hasPermission1 = await manager.checkPermission('mcp://server1', 'read')
      const hasPermission2 = await manager.checkPermission('mcp://server2', 'write')

      expect(hasPermission1).toBe(true)
      expect(hasPermission2).toBe(true)
    })
  })

  describe('permission Levels', () => {
    const levels: PermissionLevel[] = ['none', 'read', 'write', 'full']

    it('should handle all permission levels', async () => {
      for (const level of levels) {
        await manager.grantPermission(`resource-${level}`, level)
        const permission = manager.getPermission(`resource-${level}`)
        expect(permission?.level).toBe(level)
      }
    })

    it('should enforce permission hierarchy', async () => {
      await manager.grantPermission('test-resource', 'write')

      // Write permission should allow read
      const hasRead = await manager.checkPermission('test-resource', 'read')
      expect(hasRead).toBe(true)

      // But not full
      const hasFull = await manager.checkPermission('test-resource', 'full')
      expect(hasFull).toBe(false)
    })
  })

  describe('edge Cases', () => {
    it('should handle empty resource string', async () => {
      await expect(manager.grantPermission('', 'read')).resolves.not.toThrow()
    })

    it('should handle special characters in resource', async () => {
      const resource = 'file:///path/with spaces/and-special_chars.txt'
      await manager.grantPermission(resource, 'read')

      const permission = manager.getPermission(resource)
      expect(permission).toBeDefined()
    })

    it('should handle concurrent permission grants', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(manager.grantPermission(`resource-${i}`, 'read'))
      }

      await Promise.all(promises)

      const permissions = manager.getAllPermissions()
      expect(permissions).toHaveLength(10)
    })
  })

  describe('metadata Handling', () => {
    it('should preserve metadata on permission update', async () => {
      const metadata1 = { source: 'test1' }
      const metadata2 = { source: 'test2', extra: 'data' }

      await manager.grantPermission('test-resource', 'read', metadata1)
      await manager.grantPermission('test-resource', 'write', metadata2)

      const permission = manager.getPermission('test-resource')
      expect(permission?.metadata).toEqual(metadata2)
    })

    it('should handle null metadata', async () => {
      await manager.grantPermission('test-resource', 'read')
      const permission = manager.getPermission('test-resource')
      expect(permission?.metadata).toBeUndefined()
    })
  })

  describe('timestamp Tracking', () => {
    it('should track grant timestamp', async () => {
      const before = Date.now()
      await manager.grantPermission('test-resource', 'read')
      const after = Date.now()

      const permission = manager.getPermission('test-resource')
      expect(permission?.grantedAt).toBeGreaterThanOrEqual(before)
      expect(permission?.grantedAt).toBeLessThanOrEqual(after)
    })

    it('should update timestamp on permission change', async () => {
      await manager.grantPermission('test-resource', 'read')
      const permission1 = manager.getPermission('test-resource')

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10))

      await manager.grantPermission('test-resource', 'write')
      const permission2 = manager.getPermission('test-resource')

      expect(permission2?.grantedAt).toBeGreaterThan(permission1!.grantedAt)
    })
  })
})
