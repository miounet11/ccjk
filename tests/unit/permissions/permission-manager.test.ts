/**
 * Tests for Permission Manager
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getPermissionManager, PermissionManager, resetPermissionManager } from '../../../src/permissions/permission-manager'

describe('permissionManager', () => {
  let testConfigPath: string
  let testDir: string

  beforeEach(() => {
    // Create a temporary directory for test config
    testDir = join(tmpdir(), `ccjk-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    testConfigPath = join(testDir, 'config.json')

    // Reset singleton
    resetPermissionManager()
  })

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }

    // Reset singleton
    resetPermissionManager()
  })

  describe('constructor and initialization', () => {
    it('should create a new PermissionManager instance', () => {
      const manager = new PermissionManager(testConfigPath)
      expect(manager).toBeInstanceOf(PermissionManager)
    })

    it('should load permissions from existing config file', () => {
      // Create a config file with permissions
      const config = {
        permissions: {
          allow: ['Provider(302ai:*)'],
          deny: ['Provider(*:admin)'],
        },
      }
      writeFileSync(testConfigPath, JSON.stringify(config, null, 2))

      const manager = new PermissionManager(testConfigPath)
      const permissions = manager.listPermissions()

      expect(permissions).toHaveLength(2)
      expect(permissions.some(p => p.pattern === 'Provider(302ai:*)' && p.type === 'allow')).toBe(true)
      expect(permissions.some(p => p.pattern === 'Provider(*:admin)' && p.type === 'deny')).toBe(true)
    })

    it('should handle missing config file gracefully', () => {
      const manager = new PermissionManager(testConfigPath)
      const permissions = manager.listPermissions()
      expect(permissions).toHaveLength(0)
    })

    it('should handle invalid config file gracefully', () => {
      writeFileSync(testConfigPath, 'invalid json')
      const manager = new PermissionManager(testConfigPath)
      const permissions = manager.listPermissions()
      expect(permissions).toHaveLength(0)
    })
  })

  describe('checkPermission', () => {
    it('should deny by default when no rules match', () => {
      const manager = new PermissionManager(testConfigPath)
      const result = manager.checkPermission('read', 'Provider(302ai)')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('default deny')
    })

    it('should allow when matching allow rule exists', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
      })

      const result = manager.checkPermission('read', 'Provider(302ai)')
      expect(result.allowed).toBe(true)
      expect(result.matchedRule?.pattern).toBe('Provider(302ai:*)')
    })

    it('should deny when matching deny rule exists', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'deny',
        pattern: 'Provider(*:admin)',
        scope: 'global',
      })

      const result = manager.checkPermission('admin', 'Provider(302ai)')
      expect(result.allowed).toBe(false)
      expect(result.matchedRule?.pattern).toBe('Provider(*:admin)')
    })

    it('should prioritize deny rules over allow rules', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(*:*)',
        scope: 'global',
      })
      manager.addPermission({
        type: 'deny',
        pattern: 'Provider(*:admin)',
        scope: 'global',
      })

      const result = manager.checkPermission('admin', 'Provider(302ai)')
      expect(result.allowed).toBe(false)
      expect(result.matchedRule?.type).toBe('deny')
    })

    it('should handle wildcard patterns correctly', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(*:read)',
        scope: 'global',
      })

      expect(manager.checkPermission('read', 'Provider(302ai)').allowed).toBe(true)
      expect(manager.checkPermission('read', 'Provider(glm)').allowed).toBe(true)
      expect(manager.checkPermission('write', 'Provider(302ai)').allowed).toBe(false)
    })
  })

  describe('matchPattern', () => {
    it('should match exact patterns', () => {
      const manager = new PermissionManager(testConfigPath)
      expect(manager.matchPattern('Provider(302ai:read)', 'Provider(302ai):read')).toBe(true)
      expect(manager.matchPattern('Provider(302ai:read)', 'Provider(302ai):write')).toBe(false)
    })

    it('should match wildcard * patterns', () => {
      const manager = new PermissionManager(testConfigPath)
      expect(manager.matchPattern('Provider(*:*)', 'Provider(302ai):read')).toBe(true)
      expect(manager.matchPattern('Provider(302ai:*)', 'Provider(302ai):read')).toBe(true)
      expect(manager.matchPattern('Provider(*:read)', 'Provider(302ai):read')).toBe(true)
    })

    it('should match wildcard ? patterns', () => {
      const manager = new PermissionManager(testConfigPath)
      expect(manager.matchPattern('Provider(302a?:read)', 'Provider(302ai):read')).toBe(true)
      expect(manager.matchPattern('Provider(302a?:read)', 'Provider(302ab):read')).toBe(true)
      expect(manager.matchPattern('Provider(302a?:read)', 'Provider(302abc):read')).toBe(false)
    })

    it('should be case insensitive', () => {
      const manager = new PermissionManager(testConfigPath)
      expect(manager.matchPattern('Provider(302ai:read)', 'Provider(302AI):READ')).toBe(true)
      expect(manager.matchPattern('PROVIDER(302AI:READ)', 'provider(302ai):read')).toBe(true)
    })
  })

  describe('addPermission', () => {
    it('should add a new permission', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
      })

      const permissions = manager.listPermissions()
      expect(permissions).toHaveLength(1)
      expect(permissions[0].pattern).toBe('Provider(302ai:*)')
    })

    it('should update existing permission with same pattern and type', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
        description: 'First',
      })
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
        description: 'Second',
      })

      const permissions = manager.listPermissions()
      expect(permissions).toHaveLength(1)
      expect(permissions[0].description).toBe('Second')
    })

    it('should save permissions to config file', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
      })

      expect(existsSync(testConfigPath)).toBe(true)

      // Create a new manager to verify persistence
      const newManager = new PermissionManager(testConfigPath)
      const permissions = newManager.listPermissions()
      expect(permissions).toHaveLength(1)
    })
  })

  describe('removePermission', () => {
    it('should remove permission by pattern', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
      })

      const removed = manager.removePermission('Provider(302ai:*)')
      expect(removed).toBe(1)
      expect(manager.listPermissions()).toHaveLength(0)
    })

    it('should remove permission by pattern and type', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
      })
      manager.addPermission({
        type: 'deny',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
      })

      const removed = manager.removePermission('Provider(302ai:*)', 'allow')
      expect(removed).toBe(1)
      expect(manager.listPermissions()).toHaveLength(1)
      expect(manager.listPermissions()[0].type).toBe('deny')
    })

    it('should return 0 when pattern not found', () => {
      const manager = new PermissionManager(testConfigPath)
      const removed = manager.removePermission('Provider(nonexistent:*)')
      expect(removed).toBe(0)
    })
  })

  describe('listPermissions', () => {
    it('should list all permissions', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
      })
      manager.addPermission({
        type: 'deny',
        pattern: 'Provider(*:admin)',
        scope: 'global',
      })

      const permissions = manager.listPermissions()
      expect(permissions).toHaveLength(2)
    })

    it('should filter by type', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
      })
      manager.addPermission({
        type: 'deny',
        pattern: 'Provider(*:admin)',
        scope: 'global',
      })

      const allowPermissions = manager.listPermissions('allow')
      expect(allowPermissions).toHaveLength(1)
      expect(allowPermissions[0].type).toBe('allow')
    })

    it('should filter by scope', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
      })

      const globalPermissions = manager.listPermissions(undefined, 'global')
      expect(globalPermissions).toHaveLength(1)
      expect(globalPermissions[0].scope).toBe('global')
    })
  })

  describe('clearPermissions', () => {
    it('should clear all permissions', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
      })
      manager.addPermission({
        type: 'deny',
        pattern: 'Provider(*:admin)',
        scope: 'global',
      })

      manager.clearPermissions()
      expect(manager.listPermissions()).toHaveLength(0)
    })

    it('should clear permissions by type', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
      })
      manager.addPermission({
        type: 'deny',
        pattern: 'Provider(*:admin)',
        scope: 'global',
      })

      manager.clearPermissions('allow')
      const permissions = manager.listPermissions()
      expect(permissions).toHaveLength(1)
      expect(permissions[0].type).toBe('deny')
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
      })
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(glm:*)',
        scope: 'global',
      })
      manager.addPermission({
        type: 'deny',
        pattern: 'Provider(*:admin)',
        scope: 'global',
      })

      const stats = manager.getStats()
      expect(stats.total).toBe(3)
      expect(stats.allow).toBe(2)
      expect(stats.deny).toBe(1)
    })
  })

  describe('exportPermissions', () => {
    it('should export permissions to JSON format', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(302ai:*)',
        scope: 'global',
      })
      manager.addPermission({
        type: 'deny',
        pattern: 'Provider(*:admin)',
        scope: 'global',
      })

      const exported = manager.exportPermissions()
      expect(exported.allow).toEqual(['Provider(302ai:*)'])
      expect(exported.deny).toEqual(['Provider(*:admin)'])
    })
  })

  describe('importPermissions', () => {
    it('should import permissions from JSON format', () => {
      const manager = new PermissionManager(testConfigPath)
      const config = {
        allow: ['Provider(302ai:*)'],
        deny: ['Provider(*:admin)'],
      }

      manager.importPermissions(config)
      const permissions = manager.listPermissions()
      expect(permissions).toHaveLength(2)
    })

    it('should replace existing permissions when merge is false', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(existing:*)',
        scope: 'global',
      })

      const config = {
        allow: ['Provider(302ai:*)'],
        deny: [],
      }

      manager.importPermissions(config, false)
      const permissions = manager.listPermissions()
      expect(permissions).toHaveLength(1)
      expect(permissions[0].pattern).toBe('Provider(302ai:*)')
    })

    it('should merge with existing permissions when merge is true', () => {
      const manager = new PermissionManager(testConfigPath)
      manager.addPermission({
        type: 'allow',
        pattern: 'Provider(existing:*)',
        scope: 'global',
      })

      const config = {
        allow: ['Provider(302ai:*)'],
        deny: [],
      }

      manager.importPermissions(config, true)
      const permissions = manager.listPermissions()
      expect(permissions.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('getPermissionManager singleton', () => {
    it('should return the same instance', () => {
      const manager1 = getPermissionManager(testConfigPath)
      const manager2 = getPermissionManager(testConfigPath)
      expect(manager1).toBe(manager2)
    })

    it('should reset singleton', () => {
      const manager1 = getPermissionManager(testConfigPath)
      resetPermissionManager()
      const manager2 = getPermissionManager(testConfigPath)
      expect(manager1).not.toBe(manager2)
    })
  })
})
