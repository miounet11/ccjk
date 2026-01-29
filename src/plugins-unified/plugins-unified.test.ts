/**
 * Basic smoke tests for the unified plugin system
 * Run with: npm test -- plugins-unified.test.ts
 */

import { describe, expect, it } from 'vitest'
import { AdapterFactory } from './adapters/factory'
import { ConflictResolver, ConflictType, ResolutionStrategy } from './conflict-resolver'
import type { UnifiedPlugin } from './types'

describe('Unified Plugin System', () => {
  describe('AdapterFactory', () => {
    it('should create CCJK adapter', () => {
      const adapter = AdapterFactory.getAdapter('ccjk')
      expect(adapter).toBeDefined()
      expect(adapter.getSourceType()).toBe('ccjk')
    })

    it('should create native adapter', () => {
      const adapter = AdapterFactory.getAdapter('native')
      expect(adapter).toBeDefined()
      expect(adapter.getSourceType()).toBe('native')
    })

    it('should return same instance for same type (singleton)', () => {
      const adapter1 = AdapterFactory.getAdapter('ccjk')
      const adapter2 = AdapterFactory.getAdapter('ccjk')
      expect(adapter1).toBe(adapter2)
    })

    it('should get all adapters', () => {
      const adapters = AdapterFactory.getAllAdapters()
      expect(adapters).toHaveLength(2)
      expect(adapters.map(a => a.getSourceType())).toContain('ccjk')
      expect(adapters.map(a => a.getSourceType())).toContain('native')
    })

    it('should validate supported types', () => {
      expect(AdapterFactory.isSupported('ccjk')).toBe(true)
      expect(AdapterFactory.isSupported('native')).toBe(true)
      expect(AdapterFactory.isSupported('unknown')).toBe(false)
    })
  })

  describe('ConflictResolver', () => {
    const resolver = new ConflictResolver()

    const createPlugin = (id: string, name: string, commands: string[] = []): UnifiedPlugin => ({
      id,
      name,
      version: '1.0.0',
      source: 'ccjk',
      status: 'installed',
      enabled: true,
      verified: false,
      commands,
    })

    it('should detect command conflicts', () => {
      const plugins = [
        createPlugin('plugin1', 'Plugin 1', ['git', 'commit']),
        createPlugin('plugin2', 'Plugin 2', ['git', 'push']),
      ]

      const conflicts = resolver.detectConflicts(plugins)
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe(ConflictType.COMMAND)
      expect(conflicts[0].resource).toBe('git')
      expect(conflicts[0].plugins).toHaveLength(2)
    })

    it('should not detect conflicts when no overlap', () => {
      const plugins = [
        createPlugin('plugin1', 'Plugin 1', ['git']),
        createPlugin('plugin2', 'Plugin 2', ['npm']),
      ]

      const conflicts = resolver.detectConflicts(plugins)
      expect(conflicts).toHaveLength(0)
    })

    it('should calculate conflict severity', () => {
      const plugins = [
        createPlugin('plugin1', 'Plugin 1', ['git']),
        createPlugin('plugin2', 'Plugin 2', ['git']),
      ]

      const conflicts = resolver.detectConflicts(plugins)
      expect(conflicts[0].severity).toBeGreaterThan(0)
      expect(conflicts[0].severity).toBeLessThanOrEqual(10)
    })

    it('should resolve conflicts with KEEP_FIRST strategy', async () => {
      const plugins = [
        { ...createPlugin('plugin1', 'Plugin 1', ['git']), rating: 4.0 },
        { ...createPlugin('plugin2', 'Plugin 2', ['git']), rating: 5.0 },
      ]

      const conflicts = resolver.detectConflicts(plugins)
      const resolution = await resolver.resolveConflicts(
        conflicts,
        ResolutionStrategy.KEEP_FIRST,
      )

      expect(resolution.success).toBe(true)
      expect(resolution.enabled).toHaveLength(1)
      expect(resolution.enabled[0].id).toBe('plugin1')
      expect(resolution.disabled).toHaveLength(1)
      expect(resolution.disabled[0].id).toBe('plugin2')
    })

    it('should resolve conflicts with KEEP_HIGHEST_RATED strategy', async () => {
      const plugins = [
        { ...createPlugin('plugin1', 'Plugin 1', ['git']), rating: 4.0 },
        { ...createPlugin('plugin2', 'Plugin 2', ['git']), rating: 5.0 },
      ]

      const conflicts = resolver.detectConflicts(plugins)
      const resolution = await resolver.resolveConflicts(
        conflicts,
        ResolutionStrategy.KEEP_HIGHEST_RATED,
      )

      expect(resolution.success).toBe(true)
      expect(resolution.enabled).toHaveLength(1)
      expect(resolution.enabled[0].id).toBe('plugin2') // Higher rating
      expect(resolution.disabled).toHaveLength(1)
      expect(resolution.disabled[0].id).toBe('plugin1')
    })

    it('should resolve conflicts with KEEP_VERIFIED strategy', async () => {
      const plugins = [
        { ...createPlugin('plugin1', 'Plugin 1', ['git']), verified: false },
        { ...createPlugin('plugin2', 'Plugin 2', ['git']), verified: true },
      ]

      const conflicts = resolver.detectConflicts(plugins)
      const resolution = await resolver.resolveConflicts(
        conflicts,
        ResolutionStrategy.KEEP_VERIFIED,
      )

      expect(resolution.success).toBe(true)
      expect(resolution.enabled).toHaveLength(1)
      expect(resolution.enabled[0].id).toBe('plugin2') // Verified
      expect(resolution.disabled).toHaveLength(1)
      expect(resolution.disabled[0].id).toBe('plugin1')
    })

    it('should handle multiple conflicts', () => {
      const plugins = [
        createPlugin('plugin1', 'Plugin 1', ['git', 'npm']),
        createPlugin('plugin2', 'Plugin 2', ['git', 'yarn']),
        createPlugin('plugin3', 'Plugin 3', ['npm', 'pnpm']),
      ]

      const conflicts = resolver.detectConflicts(plugins)
      expect(conflicts.length).toBeGreaterThan(0)

      // Should detect git conflict (plugin1, plugin2)
      const gitConflict = conflicts.find(c => c.resource === 'git')
      expect(gitConflict).toBeDefined()
      expect(gitConflict?.plugins).toHaveLength(2)

      // Should detect npm conflict (plugin1, plugin3)
      const npmConflict = conflicts.find(c => c.resource === 'npm')
      expect(npmConflict).toBeDefined()
      expect(npmConflict?.plugins).toHaveLength(2)
    })
  })
})
