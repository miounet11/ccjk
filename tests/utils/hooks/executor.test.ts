/**
 * Tests for Hook Executor
 *
 * @module tests/utils/hooks/executor
 */

import type { Hook, HookContext } from '../../../src/utils/hooks/types.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { HookExecutor } from '../../../src/utils/hooks/executor.js'
import { HookRegistry } from '../../../src/utils/hooks/registry.js'

describe('hookExecutor', () => {
  let registry: HookRegistry
  let executor: HookExecutor

  beforeEach(() => {
    registry = new HookRegistry()
    executor = new HookExecutor(registry)
  })

  describe('tool hooks', () => {
    it('should execute pre-tool-use hooks', async () => {
      const executionLog: string[] = []

      const hook: Hook = {
        id: 'pre-tool-hook',
        name: 'Pre Tool Hook',
        description: 'Pre tool hook',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async (context: HookContext) => {
            executionLog.push(`pre-tool: ${context.tool}`)
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook, 'test')

      await executor.executePreToolUse('test-tool', '/test')

      expect(executionLog).toContain('pre-tool: test-tool')
    })

    it('should execute post-tool-use hooks', async () => {
      const executionLog: string[] = []

      const hook: Hook = {
        id: 'post-tool-hook',
        name: 'Post Tool Hook',
        description: 'Post tool hook',
        type: 'post-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async (context: HookContext) => {
            executionLog.push(`post-tool: ${context.tool}`)
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook, 'test')

      await executor.executePostToolUse('test-tool', '/test')

      expect(executionLog).toContain('post-tool: test-tool')
    })

    it('should pass error context to post-tool-use hooks', async () => {
      let capturedError: Error | undefined

      const hook: Hook = {
        id: 'post-tool-hook',
        name: 'Post Tool Hook',
        description: 'Post tool hook',
        type: 'post-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async (context: HookContext) => {
            capturedError = context.error
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook, 'test')

      const testError = new Error('Tool execution failed')
      await executor.executePostToolUse('test-tool', '/test', testError)

      expect(capturedError).toBeDefined()
      expect(capturedError?.message).toBe('Tool execution failed')
    })
  })

  describe('skill hooks', () => {
    it('should execute skill-activated hooks', async () => {
      const executionLog: string[] = []

      const hook: Hook = {
        id: 'skill-activated-hook',
        name: 'Skill Activated Hook',
        description: 'Skill activated hook',
        type: 'skill-activated',
        enabled: true,
        priority: 100,
        action: {
          execute: async (context: HookContext) => {
            executionLog.push(`skill-activated: ${context.skillId}`)
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook, 'test')

      await executor.executeSkillActivated('test-skill', '/test')

      expect(executionLog).toContain('skill-activated: test-skill')
    })

    it('should execute skill-completed hooks', async () => {
      const executionLog: string[] = []

      const hook: Hook = {
        id: 'skill-completed-hook',
        name: 'Skill Completed Hook',
        description: 'Skill completed hook',
        type: 'skill-completed',
        enabled: true,
        priority: 100,
        action: {
          execute: async (context: HookContext) => {
            executionLog.push(`skill-completed: ${context.skillId}`)
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook, 'test')

      await executor.executeSkillCompleted('test-skill', '/test')

      expect(executionLog).toContain('skill-completed: test-skill')
    })

    it('should pass error context to skill-completed hooks', async () => {
      let capturedError: Error | undefined

      const hook: Hook = {
        id: 'skill-completed-hook',
        name: 'Skill Completed Hook',
        description: 'Skill completed hook',
        type: 'skill-completed',
        enabled: true,
        priority: 100,
        action: {
          execute: async (context: HookContext) => {
            capturedError = context.error
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook, 'test')

      const testError = new Error('Skill execution failed')
      await executor.executeSkillCompleted('test-skill', '/test', testError)

      expect(capturedError).toBeDefined()
      expect(capturedError?.message).toBe('Skill execution failed')
    })
  })

  describe('workflow hooks', () => {
    it('should execute workflow-started hooks', async () => {
      const executionLog: string[] = []

      const hook: Hook = {
        id: 'workflow-started-hook',
        name: 'Workflow Started Hook',
        description: 'Workflow started hook',
        type: 'workflow-started',
        enabled: true,
        priority: 100,
        action: {
          execute: async (context: HookContext) => {
            executionLog.push(`workflow-started: ${context.workflowId}`)
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook, 'test')

      await executor.executeWorkflowStarted('test-workflow', '/test')

      expect(executionLog).toContain('workflow-started: test-workflow')
    })

    it('should execute workflow-completed hooks', async () => {
      const executionLog: string[] = []

      const hook: Hook = {
        id: 'workflow-completed-hook',
        name: 'Workflow Completed Hook',
        description: 'Workflow completed hook',
        type: 'workflow-completed',
        enabled: true,
        priority: 100,
        action: {
          execute: async (context: HookContext) => {
            executionLog.push(`workflow-completed: ${context.workflowId}`)
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook, 'test')

      await executor.executeWorkflowCompleted('test-workflow', '/test')

      expect(executionLog).toContain('workflow-completed: test-workflow')
    })

    it('should pass error context to workflow-completed hooks', async () => {
      let capturedError: Error | undefined

      const hook: Hook = {
        id: 'workflow-completed-hook',
        name: 'Workflow Completed Hook',
        description: 'Workflow completed hook',
        type: 'workflow-completed',
        enabled: true,
        priority: 100,
        action: {
          execute: async (context: HookContext) => {
            capturedError = context.error
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook, 'test')

      const testError = new Error('Workflow execution failed')
      await executor.executeWorkflowCompleted('test-workflow', '/test', testError)

      expect(capturedError).toBeDefined()
      expect(capturedError?.message).toBe('Workflow execution failed')
    })
  })

  describe('error hooks', () => {
    it('should execute on-error hooks', async () => {
      const executionLog: string[] = []

      const hook: Hook = {
        id: 'error-hook',
        name: 'Error Hook',
        description: 'Error hook',
        type: 'on-error',
        enabled: true,
        priority: 100,
        action: {
          execute: async (context: HookContext) => {
            executionLog.push(`error: ${context.error?.message}`)
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook, 'test')

      const testError = new Error('Test error')
      await executor.executeOnError(testError, '/test')

      expect(executionLog).toContain('error: Test error')
    })

    it('should handle errors in error hooks gracefully', async () => {
      const hook: Hook = {
        id: 'error-hook',
        name: 'Error Hook',
        description: 'Error hook',
        type: 'on-error',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => {
            throw new Error('Error in error hook')
          },
        },
      }

      registry.register(hook, 'test')

      const testError = new Error('Test error')
      // Should not throw
      await expect(executor.executeOnError(testError, '/test')).resolves.not.toThrow()
    })
  })

  describe('config hooks', () => {
    it('should execute config-changed hooks', async () => {
      const executionLog: string[] = []

      const hook: Hook = {
        id: 'config-changed-hook',
        name: 'Config Changed Hook',
        description: 'Config changed hook',
        type: 'config-changed',
        enabled: true,
        priority: 100,
        action: {
          execute: async (context: HookContext) => {
            executionLog.push(`config-changed: ${context.configKey}`)
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook, 'test')

      await executor.executeConfigChanged('test-config', '/test')

      expect(executionLog).toContain('config-changed: test-config')
    })
  })

  describe('metadata handling', () => {
    it('should pass metadata to hooks', async () => {
      let capturedMetadata: Record<string, unknown> | undefined

      const hook: Hook = {
        id: 'metadata-hook',
        name: 'Metadata Hook',
        description: 'Metadata hook',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async (context: HookContext) => {
            capturedMetadata = context.metadata
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(hook, 'test')

      const metadata = { key: 'value', count: 42 }
      await executor.executePreToolUse('test-tool', '/test', metadata)

      expect(capturedMetadata).toEqual(metadata)
    })
  })

  describe('execution results', () => {
    it('should return execution results', async () => {
      const hook: Hook = {
        id: 'result-hook',
        name: 'Result Hook',
        description: 'Result hook',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100,
        action: {
          execute: async () => {
            return {
              success: true,
              status: 'success',
              durationMs: 100,
              continueChain: true,
              output: { result: 'test-output' },
            }
          },
        },
      }

      registry.register(hook, 'test')

      const results = await executor.executePreToolUse('test-tool', '/test')

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
      expect(results[0].output).toEqual({ result: 'test-output' })
    })

    it('should collect results from multiple hooks', async () => {
      const hook1: Hook = {
        id: 'hook-1',
        name: 'Hook 1',
        description: 'Hook 1',
        type: 'pre-tool-use',
        enabled: true,
        priority: 200, // Higher priority executes first
        action: {
          execute: async () => {
            return {
              success: true,
              status: 'success',
              durationMs: 50,
              continueChain: true,
              output: { hook: 'hook-1' },
            }
          },
        },
      }

      const hook2: Hook = {
        id: 'hook-2',
        name: 'Hook 2',
        description: 'Hook 2',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100, // Lower priority executes second
        action: {
          execute: async () => {
            return {
              success: true,
              status: 'success',
              durationMs: 75,
              continueChain: true,
              output: { hook: 'hook-2' },
            }
          },
        },
      }

      registry.register(hook1, 'test')
      registry.register(hook2, 'test')

      const results = await executor.executePreToolUse('test-tool', '/test')

      expect(results).toHaveLength(2)
      // Higher priority (200) executes before lower priority (100)
      expect(results[0].output).toEqual({ hook: 'hook-1' })
      expect(results[1].output).toEqual({ hook: 'hook-2' })
    })
  })

  describe('error handling', () => {
    it('should handle hook execution errors', async () => {
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

      const results = await executor.executePreToolUse('test-tool', '/test')

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].status).toBe('failed')
      expect(results[0].error).toBe('Hook execution failed')
    })

    it('should continue executing other hooks after error', async () => {
      const executionLog: string[] = []

      const errorHook: Hook = {
        id: 'error-hook',
        name: 'Error Hook',
        description: 'Error hook',
        type: 'pre-tool-use',
        enabled: true,
        priority: 100, // Lower priority executes second
        action: {
          execute: async () => {
            executionLog.push('error-hook')
            throw new Error('Hook execution failed')
          },
        },
      }

      const successHook: Hook = {
        id: 'success-hook',
        name: 'Success Hook',
        description: 'Success hook',
        type: 'pre-tool-use',
        enabled: true,
        priority: 200, // Higher priority executes first
        action: {
          execute: async () => {
            executionLog.push('success-hook')
            return { success: true, status: 'success', durationMs: 0, continueChain: true }
          },
        },
      }

      registry.register(errorHook, 'test')
      registry.register(successHook, 'test')

      const results = await executor.executePreToolUse('test-tool', '/test')

      // Higher priority (200) executes before lower priority (100)
      expect(executionLog).toEqual(['success-hook', 'error-hook'])
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
    })
  })
})
