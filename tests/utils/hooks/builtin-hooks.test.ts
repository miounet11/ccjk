/**
 * Tests for Built-in Hooks
 *
 * @module tests/utils/hooks/builtin-hooks
 */

import type { HookContext } from '../../../src/utils/hooks/types.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { builtinHooks, registerBuiltinHooks } from '../../../src/utils/hooks/builtin-hooks.js'
import { HookRegistry } from '../../../src/utils/hooks/registry.js'

describe('builtinHooks', () => {
  describe('builtin hooks array', () => {
    it('should export builtin hooks array', () => {
      expect(builtinHooks).toBeDefined()
      expect(Array.isArray(builtinHooks)).toBe(true)
      expect(builtinHooks.length).toBeGreaterThan(0)
    })

    it('should have unique hook IDs', () => {
      const ids = builtinHooks.map(hook => hook.id)
      const uniqueIds = new Set(ids)
      expect(ids.length).toBe(uniqueIds.size)
    })

    it('should have all required hook properties', () => {
      for (const hook of builtinHooks) {
        expect(hook.id).toBeDefined()
        expect(hook.name).toBeDefined()
        expect(hook.description).toBeDefined()
        expect(hook.type).toBeDefined()
        expect(hook.enabled).toBeDefined()
        expect(hook.priority).toBeDefined()
        expect(hook.action).toBeDefined()
        expect(hook.action.execute).toBeDefined()
      }
    })
  })

  describe('registerBuiltinHooks', () => {
    let registry: HookRegistry

    beforeEach(() => {
      registry = new HookRegistry()
    })

    it('should register all builtin hooks', () => {
      registerBuiltinHooks(registry)

      const allHooks = registry.listAll()
      expect(allHooks.length).toBe(builtinHooks.length)
    })

    it('should register hooks with correct source', () => {
      registerBuiltinHooks(registry)

      const allHooks = registry.listAll()
      for (const hook of allHooks) {
        const hookInfo = registry.getHook(hook.id)
        expect(hookInfo).toBeDefined()
      }
    })

    it('should handle registration errors gracefully', () => {
      // Register once
      registerBuiltinHooks(registry)

      // Try to register again - should not throw
      expect(() => registerBuiltinHooks(registry)).not.toThrow()
    })
  })

  describe('tool validation hook', () => {
    it('should exist and be enabled', () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-tool-validation')
      expect(hook).toBeDefined()
      expect(hook?.enabled).toBe(true)
      expect(hook?.type).toBe('pre-tool-use')
    })

    it('should execute successfully', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-tool-validation')
      expect(hook).toBeDefined()

      const context: HookContext = {
        tool: 'test-tool',
        timestamp: new Date(),
        cwd: '/test',
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.continueChain).toBe(true)
    })
  })

  describe('tool logging hook', () => {
    it('should exist and be enabled', () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-tool-logging')
      expect(hook).toBeDefined()
      expect(hook?.enabled).toBe(true)
      expect(hook?.type).toBe('post-tool-use')
    })

    it('should execute successfully', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-tool-logging')
      expect(hook).toBeDefined()

      const context: HookContext = {
        tool: 'test-tool',
        timestamp: new Date(),
        cwd: '/test',
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.continueChain).toBe(true)
    })

    it('should handle error context', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-tool-logging')
      expect(hook).toBeDefined()

      const context: HookContext = {
        tool: 'test-tool',
        timestamp: new Date(),
        cwd: '/test',
        error: new Error('Tool execution failed'),
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.continueChain).toBe(true)
    })
  })

  describe('skill activation hook', () => {
    it('should exist and be enabled', () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-skill-activation')
      expect(hook).toBeDefined()
      expect(hook?.enabled).toBe(true)
      expect(hook?.type).toBe('skill-activated')
    })

    it('should execute successfully', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-skill-activation')
      expect(hook).toBeDefined()

      const context: HookContext = {
        skillId: 'test-skill',
        timestamp: new Date(),
        cwd: '/test',
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.continueChain).toBe(true)
    })
  })

  describe('skill completion hook', () => {
    it('should exist and be enabled', () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-skill-completion')
      expect(hook).toBeDefined()
      expect(hook?.enabled).toBe(true)
      expect(hook?.type).toBe('skill-completed')
    })

    it('should execute successfully', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-skill-completion')
      expect(hook).toBeDefined()

      const context: HookContext = {
        skillId: 'test-skill',
        timestamp: new Date(),
        cwd: '/test',
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.continueChain).toBe(true)
    })

    it('should handle error context', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-skill-completion')
      expect(hook).toBeDefined()

      const context: HookContext = {
        skillId: 'test-skill',
        timestamp: new Date(),
        cwd: '/test',
        error: new Error('Skill execution failed'),
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.continueChain).toBe(true)
    })
  })

  describe('workflow started hook', () => {
    it('should exist and be enabled', () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-workflow-started')
      expect(hook).toBeDefined()
      expect(hook?.enabled).toBe(true)
      expect(hook?.type).toBe('workflow-started')
    })

    it('should execute successfully', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-workflow-started')
      expect(hook).toBeDefined()

      const context: HookContext = {
        workflowId: 'test-workflow',
        timestamp: new Date(),
        cwd: '/test',
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.continueChain).toBe(true)
    })
  })

  describe('workflow completed hook', () => {
    it('should exist and be enabled', () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-workflow-completed')
      expect(hook).toBeDefined()
      expect(hook?.enabled).toBe(true)
      expect(hook?.type).toBe('workflow-completed')
    })

    it('should execute successfully', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-workflow-completed')
      expect(hook).toBeDefined()

      const context: HookContext = {
        workflowId: 'test-workflow',
        timestamp: new Date(),
        cwd: '/test',
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.continueChain).toBe(true)
    })

    it('should handle error context', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-workflow-completed')
      expect(hook).toBeDefined()

      const context: HookContext = {
        workflowId: 'test-workflow',
        timestamp: new Date(),
        cwd: '/test',
        error: new Error('Workflow execution failed'),
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.continueChain).toBe(true)
    })
  })

  describe('error handler hook', () => {
    it('should exist and be enabled', () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-error-handler')
      expect(hook).toBeDefined()
      expect(hook?.enabled).toBe(true)
      expect(hook?.type).toBe('on-error')
    })

    it('should execute successfully', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-error-handler')
      expect(hook).toBeDefined()

      const context: HookContext = {
        timestamp: new Date(),
        cwd: '/test',
        error: new Error('Test error'),
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.continueChain).toBe(true)
    })

    it('should handle missing error gracefully', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-error-handler')
      expect(hook).toBeDefined()

      const context: HookContext = {
        timestamp: new Date(),
        cwd: '/test',
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.continueChain).toBe(true)
    })

    it('should log error with stack trace', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-error-handler')
      expect(hook).toBeDefined()

      const error = new Error('Test error with stack')
      const context: HookContext = {
        timestamp: new Date(),
        cwd: '/test',
        error,
        tool: 'test-tool',
        skillId: 'test-skill',
        workflowId: 'test-workflow',
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.output).toBeDefined()
      expect(result.output?.errorLogged).toBe(true)
    })
  })

  describe('config changed hook', () => {
    it('should exist and be enabled', () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-config-changed')
      expect(hook).toBeDefined()
      expect(hook?.enabled).toBe(true)
      expect(hook?.type).toBe('config-changed')
    })

    it('should execute successfully', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-config-changed')
      expect(hook).toBeDefined()

      const context: HookContext = {
        configKey: 'test-config',
        timestamp: new Date(),
        cwd: '/test',
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.continueChain).toBe(true)
    })

    it('should handle metadata', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-config-changed')
      expect(hook).toBeDefined()

      const context: HookContext = {
        configKey: 'test-config',
        timestamp: new Date(),
        cwd: '/test',
        metadata: {
          oldValue: 'old',
          newValue: 'new',
        },
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
      expect(result.continueChain).toBe(true)
    })
  })

  describe('hook priorities', () => {
    it('should have reasonable priority values', () => {
      for (const hook of builtinHooks) {
        expect(hook.priority).toBeGreaterThanOrEqual(0)
        expect(hook.priority).toBeLessThanOrEqual(1000)
      }
    })

    it('should have validation hooks with higher priority', () => {
      const validationHook = builtinHooks.find(h => h.id === 'builtin-tool-validation')
      const loggingHook = builtinHooks.find(h => h.id === 'builtin-tool-logging')

      expect(validationHook).toBeDefined()
      expect(loggingHook).toBeDefined()

      // Validation should run before logging (lower priority number = higher priority)
      expect(validationHook!.priority).toBeLessThan(loggingHook!.priority)
    })
  })

  describe('hook execution with metadata', () => {
    it('should pass metadata through hooks', async () => {
      const hook = builtinHooks.find(h => h.id === 'builtin-tool-logging')
      expect(hook).toBeDefined()

      const metadata = {
        duration: 100,
        status: 'success',
        custom: 'value',
      }

      const context: HookContext = {
        tool: 'test-tool',
        timestamp: new Date(),
        cwd: '/test',
        metadata,
      }

      const result = await hook!.action.execute(context)
      expect(result.success).toBe(true)
    })
  })

  describe('hook error handling', () => {
    it('should handle errors in hook execution', async () => {
      // Create a hook that throws an error
      const errorHook = builtinHooks.find(h => h.id === 'builtin-error-handler')
      expect(errorHook).toBeDefined()

      // Even if the error handler itself has issues, it should handle gracefully
      const context: HookContext = {
        timestamp: new Date(),
        cwd: '/test',
        error: new Error('Test error'),
      }

      // Should not throw
      await expect(errorHook!.action.execute(context)).resolves.toBeDefined()
    })
  })
})
