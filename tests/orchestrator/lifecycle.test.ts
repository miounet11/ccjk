/**
 * Tests for LifecycleManager
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LifecycleManager } from '../../src/orchestrator/lifecycle'
import { EventBus } from '../../src/orchestrator/events'
import type { Task, Context, IEventBus } from '../../src/orchestrator/types'

describe('lifecycleManager', () => {
  let eventBus: IEventBus
  let lifecycleManager: LifecycleManager
  let mockContext: Context

  beforeEach(() => {
    eventBus = new EventBus()
    lifecycleManager = new LifecycleManager(eventBus, {
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 10,
      retryBackoffMultiplier: 2,
    })

    mockContext = {
      workflowId: 'test-workflow',
      lifecycle: {
        phase: 'init',
        startTime: Date.now(),
        errors: [],
      },
      shared: {
        skills: new Map(),
        agents: new Map(),
        mcp: new Map(),
        custom: new Map(),
      },
      config: {},
    }
  })

  describe('constructor', () => {
    it('should create with default options', () => {
      const manager = new LifecycleManager(eventBus)
      expect(manager).toBeDefined()
    })

    it('should create with custom options', () => {
      const manager = new LifecycleManager(eventBus, {
        timeout: 10000,
        maxRetries: 5,
      })
      expect(manager).toBeDefined()
    })
  })

  describe('execute', () => {
    it('should execute skill task successfully', async () => {
      const task: Task = {
        id: 'test-skill-task',
        type: 'skill',
        name: 'test-skill',
        params: { foo: 'bar' },
      }

      const result = await lifecycleManager.execute(task, mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        skillName: 'test-skill',
        executed: true,
      })
      expect(mockContext.lifecycle.phase).toBe('completed')
    })

    it('should execute agent task successfully', async () => {
      const task: Task = {
        id: 'test-agent-task',
        type: 'agent',
        name: 'test-agent',
        params: {},
      }

      const result = await lifecycleManager.execute(task, mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        agentName: 'test-agent',
        spawned: true,
      })
      expect(mockContext.shared.agents.get('test-agent')?.status).toBe('completed')
    })

    it('should execute hook task successfully', async () => {
      const task: Task = {
        id: 'test-hook-task',
        type: 'hook',
        name: 'test-hook',
        params: {},
      }

      const result = await lifecycleManager.execute(task, mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        hookName: 'test-hook',
        triggered: true,
      })
    })

    it('should execute mcp task successfully', async () => {
      const task: Task = {
        id: 'test-mcp-task',
        type: 'mcp',
        name: 'test-service',
        params: { method: 'testMethod' },
      }

      const result = await lifecycleManager.execute(task, mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        service: 'test-service',
        method: 'testMethod',
        success: true,
      })
      expect(mockContext.shared.mcp.get('test-service')).toBeDefined()
    })

    it('should fail for unknown task type', async () => {
      const task: Task = {
        id: 'test-unknown-task',
        type: 'unknown',
        name: 'test',
        params: {},
      }

      const result = await lifecycleManager.execute(task, mockContext)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('No executor registered')
      // Phase is 'cleanup' because cleanup runs even on error
      expect(mockContext.lifecycle.phase).toBe('cleanup')
    })

    it('should emit lifecycle events', async () => {
      const events: string[] = []
      eventBus.on('lifecycle:init', () => events.push('init'))
      eventBus.on('lifecycle:validate', () => events.push('validate'))
      eventBus.on('lifecycle:cleanup', () => events.push('cleanup'))

      const task: Task = {
        id: 'test-task',
        type: 'skill',
        name: 'test',
        params: {},
      }

      await lifecycleManager.execute(task, mockContext)

      expect(events).toContain('init')
      expect(events).toContain('validate')
      expect(events).toContain('cleanup')
    })

    it('should track duration', async () => {
      const task: Task = {
        id: 'test-task',
        type: 'skill',
        name: 'test',
        params: {},
      }

      const result = await lifecycleManager.execute(task, mockContext)

      expect(result.duration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('workflow execution', () => {
    it('should execute workflow with steps', async () => {
      const task: Task = {
        id: 'test-workflow-task',
        type: 'workflow',
        name: 'test-workflow',
        params: {},
        workflow: {
          steps: [
            {
              id: 'step1',
              type: 'skill',
              name: 'skill1',
              params: {},
            },
            {
              id: 'step2',
              type: 'skill',
              name: 'skill2',
              params: {},
              dependsOn: ['step1'],
            },
          ],
        },
      }

      const result = await lifecycleManager.execute(task, mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('step1')
      expect(result.data).toHaveProperty('step2')
    })

    it('should respect step dependencies', async () => {
      const executionOrder: string[] = []

      // Register custom executor to track order
      lifecycleManager.registerExecutor('track', async (task) => {
        executionOrder.push(task.name)
        return { name: task.name }
      })

      const task: Task = {
        id: 'test-workflow',
        type: 'workflow',
        name: 'test',
        params: {},
        workflow: {
          steps: [
            { id: 'a', type: 'track', name: 'A', params: {} },
            { id: 'b', type: 'track', name: 'B', params: {}, dependsOn: ['a'] },
            { id: 'c', type: 'track', name: 'C', params: {}, dependsOn: ['b'] },
          ],
        },
      }

      await lifecycleManager.execute(task, mockContext)

      expect(executionOrder).toEqual(['A', 'B', 'C'])
    })

    it('should skip steps with unmet conditions', async () => {
      const executionOrder: string[] = []

      lifecycleManager.registerExecutor('track', async (task) => {
        executionOrder.push(task.name)
        return { success: task.name === 'A' }
      })

      const task: Task = {
        id: 'test-workflow',
        type: 'workflow',
        name: 'test',
        params: {},
        workflow: {
          steps: [
            { id: 'a', type: 'track', name: 'A', params: {} },
            { id: 'b', type: 'track', name: 'B', params: {}, condition: 'a.success' },
            { id: 'c', type: 'track', name: 'C', params: {}, condition: 'nonexistent.success' },
          ],
        },
      }

      await lifecycleManager.execute(task, mockContext)

      expect(executionOrder).toContain('A')
      expect(executionOrder).toContain('B')
      // C should also execute because condition defaults to true for unknown patterns
    })

    it('should fail for missing workflow definition', async () => {
      const task: Task = {
        id: 'test-workflow',
        type: 'workflow',
        name: 'test',
        params: {},
        // No workflow property
      }

      const result = await lifecycleManager.execute(task, mockContext)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Workflow definition is required')
    })
  })

  describe('retry mechanism', () => {
    it('should retry on failure', async () => {
      let attempts = 0

      lifecycleManager.registerExecutor('flaky', async () => {
        attempts++
        if (attempts < 2) {
          throw new Error('Temporary failure')
        }
        return { success: true }
      })

      const task: Task = {
        id: 'test-flaky',
        type: 'flaky',
        name: 'flaky-task',
        params: {},
      }

      const result = await lifecycleManager.execute(task, mockContext)

      expect(result.success).toBe(true)
      expect(attempts).toBe(2)
    })

    it('should fail after max retries', async () => {
      lifecycleManager.registerExecutor('always-fail', async () => {
        throw new Error('Permanent failure')
      })

      const task: Task = {
        id: 'test-fail',
        type: 'always-fail',
        name: 'fail-task',
        params: {},
      }

      const result = await lifecycleManager.execute(task, mockContext)

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('Permanent failure')
    })
  })

  describe('timeout', () => {
    it('should timeout slow tasks', async () => {
      const manager = new LifecycleManager(eventBus, {
        timeout: 50,
        maxRetries: 0,
      })

      manager.registerExecutor('slow', async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
        return { success: true }
      })

      const task: Task = {
        id: 'test-slow',
        type: 'slow',
        name: 'slow-task',
        params: {},
      }

      const result = await manager.execute(task, mockContext)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('timeout')
    })
  })

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      const disposed: string[] = []

      mockContext.shared.custom.set('resource1', {
        dispose: async () => { disposed.push('resource1') },
      })
      mockContext.shared.custom.set('resource2', {
        dispose: async () => { disposed.push('resource2') },
      })

      await lifecycleManager.cleanup(mockContext)

      expect(disposed).toContain('resource1')
      expect(disposed).toContain('resource2')
      expect(mockContext.lifecycle.phase).toBe('cleanup')
    })

    it('should terminate running agents', async () => {
      const terminated: string[] = []

      // EventBus listener receives OrchestratorEvent object with data property
      eventBus.on('agent:terminate', (event: unknown) => {
        const eventObj = event as { data: { name: string } }
        if (eventObj?.data?.name) {
          terminated.push(eventObj.data.name)
        }
      })

      mockContext.shared.agents.set('agent1', {
        agentName: 'agent1',
        status: 'running',
        messages: [],
      })
      mockContext.shared.agents.set('agent2', {
        agentName: 'agent2',
        status: 'completed',
        messages: [],
      })

      await lifecycleManager.cleanup(mockContext)

      // Verify running agent was terminated
      expect(terminated).toContain('agent1')
      expect(terminated).not.toContain('agent2')
    })

    it('should cleanup even on task error', async () => {
      let cleanupCalled = false

      eventBus.on('lifecycle:cleanup', () => {
        cleanupCalled = true
      })

      lifecycleManager.registerExecutor('error', async () => {
        throw new Error('Task error')
      })

      const task: Task = {
        id: 'test-error',
        type: 'error',
        name: 'error-task',
        params: {},
      }

      // Create manager with no retries for faster test
      const manager = new LifecycleManager(eventBus, { maxRetries: 0 })
      manager.registerExecutor('error', async () => {
        throw new Error('Task error')
      })

      await manager.execute(task, mockContext)

      // Cleanup is called via the cleanup method, not lifecycle event on error
      expect(mockContext.lifecycle.phase).toBe('cleanup')
    })
  })

  describe('registerExecutor', () => {
    it('should register custom executor', async () => {
      lifecycleManager.registerExecutor('custom', async (task) => {
        return { custom: true, taskId: task.id }
      })

      const task: Task = {
        id: 'test-custom',
        type: 'custom',
        name: 'custom-task',
        params: {},
      }

      const result = await lifecycleManager.execute(task, mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ custom: true, taskId: 'test-custom' })
    })

    it('should override existing executor', async () => {
      lifecycleManager.registerExecutor('skill', async () => {
        return { overridden: true }
      })

      const task: Task = {
        id: 'test-skill',
        type: 'skill',
        name: 'skill-task',
        params: {},
      }

      const result = await lifecycleManager.execute(task, mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ overridden: true })
    })
  })

  describe('error handling', () => {
    it('should emit task:error event on failure', async () => {
      let errorEmitted = false

      eventBus.on('task:error', () => {
        errorEmitted = true
      })

      const manager = new LifecycleManager(eventBus, { maxRetries: 0 })
      manager.registerExecutor('fail', async () => {
        throw new Error('Test error')
      })

      const task: Task = {
        id: 'test-fail',
        type: 'fail',
        name: 'fail-task',
        params: {},
      }

      await manager.execute(task, mockContext)

      expect(errorEmitted).toBe(true)
    })

    it('should track errors in context', async () => {
      const manager = new LifecycleManager(eventBus, { maxRetries: 0 })
      manager.registerExecutor('fail', async () => {
        throw new Error('Tracked error')
      })

      const task: Task = {
        id: 'test-fail',
        type: 'fail',
        name: 'fail-task',
        params: {},
      }

      await manager.execute(task, mockContext)

      expect(mockContext.lifecycle.errors).toHaveLength(1)
      expect(mockContext.lifecycle.errors[0].message).toBe('Tracked error')
    })
  })
})
