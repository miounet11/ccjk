/**
 * Tests for Hook Registry
 *
 * @module tests/utils/hooks/registry
 */

import type { Hook, HookContext } from '../../../src/utils/hooks/types.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { HookExecutor } from '../../../src/utils/hooks/executor.js'
import { HookRegistry } from '../../../src/utils/hooks/registry.js'

describe('hookRegistry', () => {
  let registry: HookRegistry
  let executor: HookExecutor

  beforeEach(() => {
    registry = new HookRegistry()
    executor = new HookExecutor()
  })

  describe('hook registration', () => {
    it('should register a hook successfully', () => {
      const hook: Hook = {
        id: 'test-hook',
        name: 'Test Hook',
        description: 'A test hook',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      registry.register(hook, 'test')
      const hooks = registry.getHooksForType('pre-tool-use')
      expect(hooks).toHaveLength(1)
      expect(hooks[0].id).toBe('test-hook')
    })

    it('should prevent duplicate hook registration', () => {
      const hook: Hook = {
        id: 'duplicate-hook',
        name: 'Duplicate Hook',
        description: 'A duplicate hook',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      registry.register(hook, 'test')
      expect(() => registry.register(hook, 'test')).toThrow()
    })

    it('should register multiple hooks of different types', () => {
      const preHook: Hook = {
        id: 'pre-hook',
        name: 'Pre Hook',
        description: 'Pre hook',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      const postHook: Hook = {
        id: 'post-hook',
        name: 'Post Hook',
        description: 'Post hook',
        type: 'post-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      registry.register(preHook, 'test')
      registry.register(postHook, 'test')

      expect(registry.getHooksForType('pre-tool-use')).toHaveLength(1)
      expect(registry.getHooksForType('post-tool-use')).toHaveLength(1)
    })
  })

  describe('hook unregistration', () => {
    it('should unregister a hook successfully', () => {
      const hook: Hook = {
        id: 'test-hook',
        name: 'Test Hook',
        description: 'A test hook',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      registry.register(hook, 'test')
      expect(registry.getHooksForType('pre-tool-use')).toHaveLength(1)

      registry.unregister('test-hook')
      expect(registry.getHooksForType('pre-tool-use')).toHaveLength(0)
    })

    it('should return false when unregistering non-existent hook', () => {
      const result = registry.unregister('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('hook retrieval', () => {
    it('should get hooks by type', () => {
      const hook1: Hook = {
        id: 'hook-1',
        name: 'Hook 1',
        description: 'Hook 1',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      const hook2: Hook = {
        id: 'hook-2',
        name: 'Hook 2',
        description: 'Hook 2',
        type: 'pre-tool-use',
        enabled: true,
        priority: 200,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      registry.register(hook1, 'test')
      registry.register(hook2, 'test')

      const hooks = registry.getHooksForType('pre-tool-use')
      expect(hooks).toHaveLength(2)
    })

    it('should return hooks sorted by priority', () => {
      const hook1: Hook = {
        id: 'hook-1',
        name: 'Hook 1',
        description: 'Hook 1',
        type: 'pre-tool-use',
        enabled: true,
        priority: 200,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      const hook2: Hook = {
        id: 'hook-2',
        name: 'Hook 2',
        description: 'Hook 2',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      registry.register(hook1, 'test')
      registry.register(hook2, 'test')

      const hooks = registry.getHooksForType('pre-tool-use')
      expect(hooks[0].id).toBe('hook-1') // Higher priority first (200 > 100)
      expect(hooks[1].id).toBe('hook-2')
    })

    it('should filter enabled hooks correctly', () => {
      const enabledHook: Hook = {
        id: 'enabled-hook',
        name: 'Enabled Hook',
        description: 'Enabled hook',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      const disabledHook: Hook = {
        id: 'disabled-hook',
        name: 'Disabled Hook',
        description: 'Disabled hook',
        type: 'pre-tool-use',
        enabled: false,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      registry.register(enabledHook, 'test')
      registry.register(disabledHook, 'test')

      // getHooksForType returns all hooks, use filterHooks to get only enabled
      const allHooks = registry.getHooksForType('pre-tool-use')
      expect(allHooks).toHaveLength(2)

      const enabledHooks = registry.filterHooks({ type: 'pre-tool-use', enabled: true })
      expect(enabledHooks).toHaveLength(1)
      expect(enabledHooks[0].id).toBe('enabled-hook')
    })
  })

  describe('hook execution', () => {
    it('should execute hooks in priority order', async () => {
      const executionOrder: string[] = []

      const hook1: Hook = {
        id: 'hook-1',
        name: 'Hook 1',
        description: 'Hook 1',
        type: 'pre-tool-use',
        enabled: true,
        priority: 200,
        action: {
          execute: async () => {
            executionOrder.push('hook-1')
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      const hook2: Hook = {
        id: 'hook-2',
        name: 'Hook 2',
        description: 'Hook 2',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => {
            executionOrder.push('hook-2')
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook1, 'test')
      registry.register(hook2, 'test')

      const context: HookContext = {
        type: 'pre-tool-use',
        tool: 'test-tool',
        timestamp: new Date(),
        cwd: '/test',
      }

      const hooks = registry.getHooksForType('pre-tool-use')
      await executor.executeChain(hooks, context)

      // Higher priority (200) executes before lower priority (100)
      expect(executionOrder).toEqual(['hook-1', 'hook-2'])
    })

    it('should stop execution when continueChain is false', async () => {
      const executionOrder: string[] = []

      const hook1: Hook = {
        id: 'hook-1',
        name: 'Hook 1',
        description: 'Hook 1',
        type: 'pre-tool-use',
        enabled: true,
        priority: 200,
        action: {
          execute: async () => {
            executionOrder.push('hook-1')
            return { success: true, status: 'success', durationMs: 0, continueChain: false }
          },
        },
      }

      const hook2: Hook = {
        id: 'hook-2',
        name: 'Hook 2',
        description: 'Hook 2',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => {
            executionOrder.push('hook-2')
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook1, 'test')
      registry.register(hook2, 'test')

      const context: HookContext = {
        type: 'pre-tool-use',
        tool: 'test-tool',
        timestamp: new Date(),
        cwd: '/test',
      }

      const hooks = registry.getHooksForType('pre-tool-use')
      const result = await executor.executeChain(hooks, context)

      // Only hook-1 should execute (higher priority), then chain stops
      expect(executionOrder).toEqual(['hook-1'])
      expect(result.executedCount).toBe(1)
    })

    it('should handle hook execution errors gracefully', async () => {
      const hook: Hook = {
        id: 'error-hook',
        name: 'Error Hook',
        description: 'Error hook',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => {
            throw new Error('Hook execution failed')
          },
        },
      }

      registry.register(hook, 'test')

      const context: HookContext = {
        type: 'pre-tool-use',
        tool: 'test-tool',
        timestamp: new Date(),
        cwd: '/test',
      }

      const hooks = registry.getHooksForType('pre-tool-use')
      const result = await executor.executeChain(hooks, context)

      expect(result.failedCount).toBe(1)
      expect(result.success).toBe(false)
    })
  })

  describe('hook enabling/disabling', () => {
    it('should enable a hook', () => {
      const hook: Hook = {
        id: 'test-hook',
        name: 'Test Hook',
        description: 'A test hook',
        type: 'pre-tool-use',
        enabled: false,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      registry.register(hook, 'test')
      // getHooksForType returns all hooks regardless of enabled status
      expect(registry.getHooksForType('pre-tool-use')).toHaveLength(1)
      expect(registry.filterHooks({ type: 'pre-tool-use', enabled: true })).toHaveLength(0)

      registry.setEnabled('test-hook', true)
      expect(registry.filterHooks({ type: 'pre-tool-use', enabled: true })).toHaveLength(1)
    })

    it('should disable a hook', () => {
      const hook: Hook = {
        id: 'test-hook',
        name: 'Test Hook',
        description: 'A test hook',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      registry.register(hook, 'test')
      expect(registry.filterHooks({ type: 'pre-tool-use', enabled: true })).toHaveLength(1)

      registry.setEnabled('test-hook', false)
      expect(registry.filterHooks({ type: 'pre-tool-use', enabled: true })).toHaveLength(0)
    })
  })

  describe('hook listing', () => {
    it('should list all registered hooks', () => {
      const hook1: Hook = {
        id: 'hook-1',
        name: 'Hook 1',
        description: 'Hook 1',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      const hook2: Hook = {
        id: 'hook-2',
        name: 'Hook 2',
        description: 'Hook 2',
        type: 'post-tool-use',
        enabled: false,
        priority: 200,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      registry.register(hook1, 'test')
      registry.register(hook2, 'test')

      const allHooks = registry.getAllHooks()
      expect(allHooks).toHaveLength(2)
    })

    it('should get hook by id', () => {
      const hook: Hook = {
        id: 'test-hook',
        name: 'Test Hook',
        description: 'A test hook',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      registry.register(hook, 'test')

      const retrieved = registry.getHook('test-hook')
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('test-hook')
    })

    it('should return undefined for non-existent hook', () => {
      const retrieved = registry.getHook('non-existent')
      expect(retrieved).toBeUndefined()
    })
  })

  describe('hook clearing', () => {
    it('should clear all hooks', () => {
      const hook1: Hook = {
        id: 'hook-1',
        name: 'Hook 1',
        description: 'Hook 1',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      const hook2: Hook = {
        id: 'hook-2',
        name: 'Hook 2',
        description: 'Hook 2',
        type: 'post-tool-use',
        enabled: true,
        priority: 200,
        action: {
          execute: async () => ({ success: true, status: 'success', durationMs: 0, continueChain: true }),
        },
      }

      registry.register(hook1, 'test')
      registry.register(hook2, 'test')

      expect(registry.getAllHooks()).toHaveLength(2)

      registry.clear()

      expect(registry.getAllHooks()).toHaveLength(0)
    })
  })
})
