/**
 * Hook Registry Tests
 */

import type { Hook } from '../../../../src/utils/hooks/types.js'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createHookRegistry,
  getGlobalRegistry,
  HookRegistry,
  resetGlobalRegistry,
} from '../../../../src/utils/hooks/registry.js'

describe('hookRegistry', () => {
  let registry: HookRegistry

  const createTestHook = (overrides?: Partial<Hook>): Hook => ({
    id: 'test-hook',
    name: 'Test Hook',
    description: 'A test hook',
    type: 'pre-tool-use',
    priority: 5,
    enabled: true,
    source: 'builtin',
    version: '1.0.0',
    tags: ['test'],
    action: {
      execute: () => ({
        success: true,
        status: 'success' as const,
        durationMs: 0,
        continueChain: true,
      }),
      timeout: 5000,
      continueOnError: true,
    },
    ...overrides,
  })

  beforeEach(() => {
    registry = new HookRegistry()
  })

  describe('register', () => {
    it('should register a hook successfully', () => {
      const hook = createTestHook()
      const result = registry.register(hook)

      expect(result).toBe(true)
      expect(registry.get(hook.id)).toBeDefined()
    })

    it('should not overwrite existing hook without overwrite option', () => {
      const hook1 = createTestHook({ name: 'Hook 1' })
      const hook2 = createTestHook({ name: 'Hook 2' })

      registry.register(hook1)
      const result = registry.register(hook2)

      expect(result).toBe(false)
      expect(registry.get(hook1.id)?.hook.name).toBe('Hook 1')
    })

    it('should overwrite existing hook with overwrite option', () => {
      const hook1 = createTestHook({ name: 'Hook 1' })
      const hook2 = createTestHook({ name: 'Hook 2' })

      registry.register(hook1)
      const result = registry.register(hook2, { overwrite: true })

      expect(result).toBe(true)
      expect(registry.get(hook1.id)?.hook.name).toBe('Hook 2')
    })

    it('should respect enabled option', () => {
      const hook = createTestHook({ enabled: true })
      registry.register(hook, { enabled: false })

      expect(registry.get(hook.id)?.hook.enabled).toBe(false)
    })

    it('should index hook by type', () => {
      const hook = createTestHook({ type: 'post-tool-use' })
      registry.register(hook)

      const hooks = registry.getHooksForType('post-tool-use')
      expect(hooks).toHaveLength(1)
      expect(hooks[0].id).toBe(hook.id)
    })

    it('should index hook by tool', () => {
      const hook = createTestHook({
        condition: { tool: 'Read' },
      })
      registry.register(hook)

      const hooks = registry.getHooksForTool('Read')
      expect(hooks).toHaveLength(1)
      expect(hooks[0].id).toBe(hook.id)
    })
  })

  describe('unregister', () => {
    it('should unregister a hook successfully', () => {
      const hook = createTestHook()
      registry.register(hook)

      const result = registry.unregister(hook.id)

      expect(result).toBe(true)
      expect(registry.get(hook.id)).toBeUndefined()
    })

    it('should return false for non-existent hook', () => {
      const result = registry.unregister('non-existent')
      expect(result).toBe(false)
    })

    it('should remove hook from type index', () => {
      const hook = createTestHook({ type: 'skill-activate' })
      registry.register(hook)
      registry.unregister(hook.id)

      const hooks = registry.getHooksForType('skill-activate')
      expect(hooks).toHaveLength(0)
    })
  })

  describe('get', () => {
    it('should return hook entry for existing hook', () => {
      const hook = createTestHook()
      registry.register(hook)

      const entry = registry.get(hook.id)

      expect(entry).toBeDefined()
      expect(entry?.hook.id).toBe(hook.id)
      expect(entry?.executionCount).toBe(0)
    })

    it('should return undefined for non-existent hook', () => {
      const entry = registry.get('non-existent')
      expect(entry).toBeUndefined()
    })
  })

  describe('getHooksForType', () => {
    it('should return hooks sorted by priority', () => {
      registry.register(createTestHook({ id: 'hook-1', priority: 3 }))
      registry.register(createTestHook({ id: 'hook-2', priority: 8 }))
      registry.register(createTestHook({ id: 'hook-3', priority: 5 }))

      const hooks = registry.getHooksForType('pre-tool-use')

      expect(hooks).toHaveLength(3)
      expect(hooks[0].id).toBe('hook-2') // priority 8
      expect(hooks[1].id).toBe('hook-3') // priority 5
      expect(hooks[2].id).toBe('hook-1') // priority 3
    })

    it('should return empty array for type with no hooks', () => {
      const hooks = registry.getHooksForType('error')
      expect(hooks).toHaveLength(0)
    })
  })

  describe('filter', () => {
    beforeEach(() => {
      registry.register(createTestHook({
        id: 'hook-1',
        type: 'pre-tool-use',
        enabled: true,
        source: 'builtin',
        tags: ['validation'],
        priority: 5,
      }))
      registry.register(createTestHook({
        id: 'hook-2',
        type: 'post-tool-use',
        enabled: false,
        source: 'plugin',
        tags: ['logging'],
        priority: 3,
      }))
      registry.register(createTestHook({
        id: 'hook-3',
        type: 'pre-tool-use',
        enabled: true,
        source: 'user',
        tags: ['validation', 'custom'],
        priority: 8,
      }))
    })

    it('should filter by type', () => {
      const hooks = registry.filter({ type: 'pre-tool-use' })
      expect(hooks).toHaveLength(2)
    })

    it('should filter by enabled status', () => {
      const hooks = registry.filter({ enabled: true })
      expect(hooks).toHaveLength(2)
    })

    it('should filter by source', () => {
      const hooks = registry.filter({ source: 'builtin' })
      expect(hooks).toHaveLength(1)
      expect(hooks[0].id).toBe('hook-1')
    })

    it('should filter by tags (AND logic)', () => {
      const hooks = registry.filter({ tags: ['validation'] })
      expect(hooks).toHaveLength(2)

      const hooks2 = registry.filter({ tags: ['validation', 'custom'] })
      expect(hooks2).toHaveLength(1)
      expect(hooks2[0].id).toBe('hook-3')
    })

    it('should filter by priority range', () => {
      const hooks = registry.filter({ priorityRange: { min: 5 } })
      expect(hooks).toHaveLength(2)

      const hooks2 = registry.filter({ priorityRange: { max: 5 } })
      expect(hooks2).toHaveLength(2)

      const hooks3 = registry.filter({ priorityRange: { min: 4, max: 6 } })
      expect(hooks3).toHaveLength(1)
      expect(hooks3[0].id).toBe('hook-1')
    })

    it('should combine multiple filters', () => {
      const hooks = registry.filter({
        type: 'pre-tool-use',
        enabled: true,
        tags: ['validation'],
      })
      expect(hooks).toHaveLength(2)
    })
  })

  describe('enable/disable', () => {
    it('should enable a hook', () => {
      const hook = createTestHook({ enabled: false })
      registry.register(hook)

      const result = registry.enable(hook.id)

      expect(result).toBe(true)
      expect(registry.get(hook.id)?.hook.enabled).toBe(true)
    })

    it('should disable a hook', () => {
      const hook = createTestHook({ enabled: true })
      registry.register(hook)

      const result = registry.disable(hook.id)

      expect(result).toBe(true)
      expect(registry.get(hook.id)?.hook.enabled).toBe(false)
    })

    it('should return false for non-existent hook', () => {
      expect(registry.enable('non-existent')).toBe(false)
      expect(registry.disable('non-existent')).toBe(false)
    })
  })

  describe('updateStats', () => {
    it('should update execution count', () => {
      const hook = createTestHook()
      registry.register(hook)

      registry.updateStats(hook.id, true)
      registry.updateStats(hook.id, true)

      const entry = registry.get(hook.id)
      expect(entry?.executionCount).toBe(2)
      expect(entry?.failureCount).toBe(0)
    })

    it('should update failure count', () => {
      const hook = createTestHook()
      registry.register(hook)

      registry.updateStats(hook.id, false)

      const entry = registry.get(hook.id)
      expect(entry?.executionCount).toBe(1)
      expect(entry?.failureCount).toBe(1)
    })

    it('should update last executed timestamp', () => {
      const hook = createTestHook()
      registry.register(hook)

      const before = new Date()
      registry.updateStats(hook.id, true)
      const after = new Date()

      const entry = registry.get(hook.id)
      expect(entry?.lastExecutedAt).toBeDefined()
      expect(entry?.lastExecutedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(entry?.lastExecutedAt!.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      registry.register(createTestHook({
        id: 'hook-1',
        type: 'pre-tool-use',
        enabled: true,
        source: 'builtin',
      }))
      registry.register(createTestHook({
        id: 'hook-2',
        type: 'post-tool-use',
        enabled: false,
        source: 'plugin',
      }))

      registry.updateStats('hook-1', true)
      registry.updateStats('hook-1', true)
      registry.updateStats('hook-2', false)

      const stats = registry.getStatistics()

      expect(stats.totalHooks).toBe(2)
      expect(stats.enabledHooks).toBe(1)
      expect(stats.disabledHooks).toBe(1)
      expect(stats.totalExecutions).toBe(3)
      expect(stats.totalFailures).toBe(1)
      expect(stats.hooksByType['pre-tool-use']).toBe(1)
      expect(stats.hooksByType['post-tool-use']).toBe(1)
      expect(stats.hooksBySource.builtin).toBe(1)
      expect(stats.hooksBySource.plugin).toBe(1)
    })
  })

  describe('clear', () => {
    it('should remove all hooks', () => {
      registry.register(createTestHook({ id: 'hook-1' }))
      registry.register(createTestHook({ id: 'hook-2' }))

      registry.clear()

      expect(registry.getAll()).toHaveLength(0)
    })
  })

  describe('getAll', () => {
    it('should return all hooks', () => {
      registry.register(createTestHook({ id: 'hook-1' }))
      registry.register(createTestHook({ id: 'hook-2' }))

      const hooks = registry.getAll()

      expect(hooks).toHaveLength(2)
    })
  })
})

describe('global Registry', () => {
  beforeEach(() => {
    resetGlobalRegistry()
  })

  it('should return same instance', () => {
    const registry1 = getGlobalRegistry()
    const registry2 = getGlobalRegistry()

    expect(registry1).toBe(registry2)
  })

  it('should reset global registry', () => {
    const registry1 = getGlobalRegistry()
    registry1.register({
      id: 'test',
      name: 'Test',
      type: 'error',
      enabled: true,
      source: 'builtin',
      action: { execute: () => {} },
    })

    resetGlobalRegistry()
    const registry2 = getGlobalRegistry()

    expect(registry2.getAll()).toHaveLength(0)
  })
})

describe('createHookRegistry', () => {
  it('should create new registry instance', () => {
    const registry1 = createHookRegistry()
    const registry2 = createHookRegistry()

    expect(registry1).not.toBe(registry2)
  })
})
