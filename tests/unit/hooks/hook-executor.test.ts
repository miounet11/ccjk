/**
 * Hook executor tests
 */

import type { PreRequestContext } from '../../../src/hooks/hook-context'
import type { Hook } from '../../../src/types/hooks'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HookExecutor } from '../../../src/hooks/hook-executor'
import { HookType } from '../../../src/types/hooks'

describe('hookExecutor', () => {
  let executor: HookExecutor

  beforeEach(() => {
    executor = new HookExecutor()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('should execute a simple echo command successfully', async () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test"',
        timeout: 5000,
      }

      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(true)
      expect(result.stdout).toBe('test')
      expect(result.exitCode).toBe(0)
      expect(result.executionTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle command failure', async () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'exit 1',
        timeout: 5000,
      }

      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
    })

    it('should handle timeout', async () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'sleep 10',
        timeout: 100, // 100ms timeout
      }

      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('timed out')
    })

    it('should skip disabled hooks', async () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test"',
        enabled: false,
      }

      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(true)
      expect(result.executionTime).toBe(0)
      expect(result.stderr).toBe('Hook is disabled')
    })

    it('should pass context via environment variable', async () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'node -e "console.log(JSON.parse(process.env.CCJK_HOOK_CONTEXT).provider)"',
        timeout: 5000,
      }

      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'test-provider',
        model: 'test-model',
      }

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(true)
      expect(result.stdout).toBe('test-provider')
    })

    it('should use default timeout when not specified', async () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test"',
      }

      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(true)
    })

    it('should cap timeout at maximum value', async () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test"',
        timeout: 999999, // Exceeds max timeout
      }

      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      const result = await executor.execute(hook, context)

      expect(result.success).toBe(true)
    })
  })

  describe('executeAsync', () => {
    it('should execute hook asynchronously without waiting', () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'echo "async test"',
        async: true,
      }

      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      // Should not throw and should return immediately
      expect(() => {
        executor.executeAsync(hook, context)
      }).not.toThrow()
    })

    it('should not throw on async execution failure', () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'exit 1',
        async: true,
      }

      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      // Should not throw even if command fails
      expect(() => {
        executor.executeAsync(hook, context)
      }).not.toThrow()
    })
  })
})
