/**
 * Hook Executor Tests
 */

import type { Hook, HookContext, HookResult } from '../../../../src/utils/hooks/types.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createHookExecutor,
  HookExecutor,
} from '../../../../src/utils/hooks/executor.js'

describe('hookExecutor', () => {
  let executor: HookExecutor

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
      execute: vi.fn(() => ({
        success: true,
        status: 'success' as const,
        durationMs: 0,
        continueChain: true,
      })),
      timeout: 5000,
      continueOnError: true,
    },
    ...overrides,
  })

  const createTestContext = (overrides?: Partial<HookContext>): HookContext => ({
    type: 'pre-tool-use',
    timestamp: new Date(),
    ...overrides,
  })

  beforeEach(() => {
    executor = new HookExecutor()
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('should execute a hook successfully', async () => {
      const hook = createTestHook()
      const context = createTestContext()

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(true)
      expect(result.status).toBe('success')
      expect(hook.action.execute).toHaveBeenCalledWith(context)
    })

    it('should skip disabled hooks', async () => {
      const hook = createTestHook({ enabled: false })
      const context = createTestContext()

      const result = await executor.execute(hook, context)

      expect(result.status).toBe('skipped')
      expect(hook.action.execute).not.toHaveBeenCalled()
    })

    it('should skip hooks when condition is not met', async () => {
      const hook = createTestHook({
        condition: { tool: 'Write' },
      })
      const context = createTestContext({ tool: 'Read' })

      const result = await executor.execute(hook, context)

      expect(result.status).toBe('skipped')
      expect(hook.action.execute).not.toHaveBeenCalled()
    })

    it('should execute hooks when condition is met', async () => {
      const hook = createTestHook({
        condition: { tool: 'Read' },
      })
      const context = createTestContext({ tool: 'Read' })

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(true)
      expect(hook.action.execute).toHaveBeenCalled()
    })

    it('should handle regex conditions', async () => {
      const hook = createTestHook({
        condition: { tool: /^Read/ },
      })
      const context = createTestContext({ tool: 'ReadFile' })

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(true)
      expect(hook.action.execute).toHaveBeenCalled()
    })

    it('should handle custom conditions', async () => {
      const customCondition = vi.fn(() => true)
      const hook = createTestHook({
        condition: { custom: customCondition },
      })
      const context = createTestContext()

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(true)
      expect(customCondition).toHaveBeenCalledWith(context)
    })

    it('should handle execution errors', async () => {
      const hook = createTestHook({
        action: {
          execute: vi.fn(() => {
            throw new Error('Test error')
          }),
          timeout: 5000,
          continueOnError: true,
        },
      })
      const context = createTestContext()

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
      expect(result.error).toBe('Test error')
    })

    it('should handle timeout', async () => {
      const hook = createTestHook({
        action: {
          execute: vi.fn((): Promise<void> => new Promise(resolve => setTimeout(resolve, 1000))),
          timeout: 50,
          continueOnError: true,
        },
      })
      const context = createTestContext()

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(false)
      expect(result.status).toBe('timeout')
    })

    it('should track duration', async () => {
      const hook = createTestHook({
        action: {
          execute: vi.fn((): Promise<HookResult> => new Promise(resolve => setTimeout(() => resolve({
            success: true,
            status: 'success' as const,
            durationMs: 0,
            continueChain: true,
          }), 50))),
          timeout: 5000,
          continueOnError: true,
        },
      })
      const context = createTestContext()

      const result = await executor.execute(hook, context)

      expect(result.durationMs).toBeGreaterThanOrEqual(40)
    })

    it('should pass modified context from hook result', async () => {
      const hook = createTestHook({
        action: {
          execute: vi.fn(() => ({
            success: true,
            status: 'success' as const,
            durationMs: 0,
            continueChain: true,
            modifiedContext: { metadata: { custom: 'value' } },
          })),
          timeout: 5000,
          continueOnError: true,
        },
      })
      const context = createTestContext()

      const result = await executor.execute(hook, context)

      expect(result.modifiedContext).toEqual({ metadata: { custom: 'value' } })
    })
  })

  describe('executeChain', () => {
    it('should execute hooks in priority order', async () => {
      const executionOrder: string[] = []

      const hook1 = createTestHook({
        id: 'hook-1',
        priority: 3,
        action: {
          execute: vi.fn(() => {
            executionOrder.push('hook-1')
            return { success: true, status: 'success' as const, durationMs: 0, continueChain: true }
          }),
          timeout: 5000,
          continueOnError: true,
        },
      })

      const hook2 = createTestHook({
        id: 'hook-2',
        priority: 8,
        action: {
          execute: vi.fn(() => {
            executionOrder.push('hook-2')
            return { success: true, status: 'success' as const, durationMs: 0, continueChain: true }
          }),
          timeout: 5000,
          continueOnError: true,
        },
      })

      const hook3 = createTestHook({
        id: 'hook-3',
        priority: 5,
        action: {
          execute: vi.fn(() => {
            executionOrder.push('hook-3')
            return { success: true, status: 'success' as const, durationMs: 0, continueChain: true }
          }),
          timeout: 5000,
          continueOnError: true,
        },
      })

      const context = createTestContext()
      await executor.executeChain([hook1, hook2, hook3], context)

      expect(executionOrder).toEqual(['hook-2', 'hook-3', 'hook-1'])
    })

    it('should stop chain when continueChain is false', async () => {
      const hook1 = createTestHook({
        id: 'hook-1',
        priority: 10,
        action: {
          execute: vi.fn(() => ({
            success: true,
            status: 'success' as const,
            durationMs: 0,
            continueChain: false,
          })),
          timeout: 5000,
          continueOnError: true,
        },
      })

      const hook2 = createTestHook({
        id: 'hook-2',
        priority: 5,
      })

      const context = createTestContext()
      const result = await executor.executeChain([hook1, hook2], context)

      expect(result.executedCount).toBe(1)
      expect(hook2.action.execute).not.toHaveBeenCalled()
    })

    it('should stop chain on error when stopOnError is true', async () => {
      const hook1 = createTestHook({
        id: 'hook-1',
        priority: 10,
        action: {
          execute: vi.fn(() => {
            throw new Error('Test error')
          }),
          timeout: 5000,
          continueOnError: true,
        },
      })

      const hook2 = createTestHook({
        id: 'hook-2',
        priority: 5,
      })

      const context = createTestContext()
      const result = await executor.executeChain([hook1, hook2], context, { stopOnError: true })

      expect(result.failedCount).toBe(1)
      expect(hook2.action.execute).not.toHaveBeenCalled()
    })

    it('should continue chain on error when stopOnError is false', async () => {
      const hook1 = createTestHook({
        id: 'hook-1',
        priority: 10,
        action: {
          execute: vi.fn(() => {
            throw new Error('Test error')
          }),
          timeout: 5000,
          continueOnError: true,
        },
      })

      const hook2 = createTestHook({
        id: 'hook-2',
        priority: 5,
      })

      const context = createTestContext()
      const result = await executor.executeChain([hook1, hook2], context, { stopOnError: false })

      expect(result.failedCount).toBe(1)
      expect(result.executedCount).toBe(1)
      expect(hook2.action.execute).toHaveBeenCalled()
    })

    it('should accumulate context modifications', async () => {
      const hook1 = createTestHook({
        id: 'hook-1',
        priority: 10,
        action: {
          execute: vi.fn(() => ({
            success: true,
            status: 'success' as const,
            durationMs: 0,
            continueChain: true,
            modifiedContext: { metadata: { key1: 'value1' } },
          })),
          timeout: 5000,
          continueOnError: true,
        },
      })

      const hook2 = createTestHook({
        id: 'hook-2',
        priority: 5,
        action: {
          execute: vi.fn(() => ({
            success: true,
            status: 'success' as const,
            durationMs: 0,
            continueChain: true,
            modifiedContext: { metadata: { key2: 'value2' } },
          })),
          timeout: 5000,
          continueOnError: true,
        },
      })

      const context = createTestContext()
      const result = await executor.executeChain([hook1, hook2], context)

      expect(result.finalContext.metadata).toEqual({ key2: 'value2' })
    })

    it('should return correct statistics', async () => {
      const hook1 = createTestHook({ id: 'hook-1', priority: 10 })
      const hook2 = createTestHook({ id: 'hook-2', priority: 5, enabled: false })
      const hook3 = createTestHook({
        id: 'hook-3',
        priority: 3,
        action: {
          execute: vi.fn(() => {
            throw new Error('Test error')
          }),
          timeout: 5000,
          continueOnError: true,
        },
      })

      const context = createTestContext()
      const result = await executor.executeChain([hook1, hook2, hook3], context)

      expect(result.executedCount).toBe(1)
      expect(result.skippedCount).toBe(1)
      expect(result.failedCount).toBe(1)
      expect(result.results).toHaveLength(3)
    })

    it('should execute hooks in parallel when parallel option is true', async () => {
      const startTime = Date.now()

      const createDelayedHook = (id: string, delay: number) => createTestHook({
        id,
        priority: 5,
        action: {
          execute: vi.fn((): Promise<HookResult> => new Promise(resolve => setTimeout(() => resolve({
            success: true,
            status: 'success' as const,
            durationMs: delay,
            continueChain: true,
          }), delay))),
          timeout: 5000,
          continueOnError: true,
        },
      })

      const hooks = [
        createDelayedHook('hook-1', 50),
        createDelayedHook('hook-2', 50),
        createDelayedHook('hook-3', 50),
      ]

      const context = createTestContext()
      await executor.executeChain(hooks, context, { parallel: true })

      const elapsed = Date.now() - startTime

      // Parallel execution should be faster than sequential (150ms)
      expect(elapsed).toBeLessThan(150)
    })
  })

  describe('condition checking', () => {
    it('should check skillId condition', async () => {
      const hook = createTestHook({
        condition: { skillId: 'test-skill' },
      })
      const context = createTestContext({ skillId: 'test-skill' })

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(true)
    })

    it('should check workflowId condition', async () => {
      const hook = createTestHook({
        condition: { workflowId: 'test-workflow' },
      })
      const context = createTestContext({ workflowId: 'test-workflow' })

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(true)
    })

    it('should check configKey condition', async () => {
      const hook = createTestHook({
        condition: { configKey: 'test-config' },
      })
      const context = createTestContext({ configKey: 'test-config' })

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(true)
    })

    it('should handle async custom conditions', async () => {
      const customCondition = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return true
      })
      const hook = createTestHook({
        condition: { custom: customCondition },
      })
      const context = createTestContext()

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(true)
    })
  })
})

describe('createHookExecutor', () => {
  it('should create executor with default timeout', () => {
    const executor = createHookExecutor()
    expect(executor).toBeInstanceOf(HookExecutor)
  })

  it('should create executor with custom timeout', () => {
    const executor = createHookExecutor({ defaultTimeout: 10000 })
    expect(executor).toBeInstanceOf(HookExecutor)
  })
})
