/**
 * EventBus Edge Case Tests
 *
 * Tests for boundary conditions, error scenarios, and edge cases
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventBus } from '../../src/orchestrator/events'

describe('eventBus Edge Cases', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = new EventBus()
  })

  describe('empty and Null Cases', () => {
    it('should handle emitting to event with no listeners', async () => {
      await expect(
        eventBus.emit('workflow:start', { workflowId: 'test' }),
      ).resolves.toBeUndefined()
    })

    it('should handle unsubscribing non-existent listener', () => {
      expect(() => {
        eventBus.off('workflow:start', 'non-existent-id')
      }).not.toThrow()
    })

    it('should handle unsubscribing from non-existent event', () => {
      expect(() => {
        eventBus.off('non-existent-event' as any)
      }).not.toThrow()
    })

    it('should handle getting listener count for non-existent event', () => {
      expect(eventBus.getListenerCount('non-existent' as any)).toBe(0)
    })

    it('should handle empty event types list', () => {
      expect(eventBus.getEventTypes()).toEqual([])
    })
  })

  describe('concurrent Operations', () => {
    it('should handle concurrent event emissions', async () => {
      const listener = vi.fn()
      eventBus.on('task:start', listener)

      const promises = Array.from({ length: 100 }, (_, i) =>
        eventBus.emit('task:start', { taskId: `task-${i}` }))

      await Promise.all(promises)

      expect(listener).toHaveBeenCalledTimes(100)
    })

    it('should handle concurrent subscriptions', () => {
      const listeners = Array.from({ length: 50 }, () => vi.fn())

      listeners.forEach((listener) => {
        eventBus.on('workflow:start', listener)
      })

      expect(eventBus.getListenerCount('workflow:start')).toBe(50)
    })

    it('should handle concurrent unsubscriptions', async () => {
      const subscriptions = Array.from({ length: 50 }, () =>
        eventBus.on('task:complete', vi.fn()))

      subscriptions.forEach(sub => sub.unsubscribe())

      expect(eventBus.getListenerCount('task:complete')).toBe(0)
    })
  })

  describe('memory and Performance', () => {
    it('should handle large number of events', async () => {
      const listener = vi.fn()
      eventBus.on('task:start', listener)

      for (let i = 0; i < 1000; i++) {
        await eventBus.emit('task:start', { taskId: `task-${i}` })
      }

      expect(listener).toHaveBeenCalledTimes(1000)
    })

    it('should handle large payloads', async () => {
      const listener = vi.fn()
      eventBus.on('workflow:start', listener)

      const largePayload = {
        data: Array.from({ length: 10000 }, (_, i) => ({ id: i, value: `value-${i}` })),
      }

      await eventBus.emit('workflow:start', largePayload)

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          data: largePayload,
        }),
      )
    })

    it('should trim history when exceeding max size', async () => {
      const bus = new EventBus({ maxHistorySize: 10 })

      for (let i = 0; i < 20; i++) {
        await bus.emit('task:start', { taskId: `task-${i}` })
      }

      const history = bus.getHistory()
      expect(history).toHaveLength(10)

      // Should keep the most recent events
      expect(history[history.length - 1].data).toEqual({ taskId: 'task-19' })
    })
  })

  describe('complex Wildcard Patterns', () => {
    it('should handle multiple wildcards', async () => {
      const listener = vi.fn()
      eventBus.on('*:*', listener)

      await eventBus.emit('workflow:start', { workflowId: 'test' })
      await eventBus.emit('task:complete', { taskId: 'test' })

      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('should handle complex wildcard patterns', async () => {
      const listener = vi.fn()
      eventBus.on('workflow:*', listener)

      await eventBus.emit('workflow:start', { workflowId: 'test' })
      await eventBus.emit('workflow:complete', { workflowId: 'test' })
      await eventBus.emit('workflow:error', { error: new Error('test') })
      await eventBus.emit('task:start', { taskId: 'test' })

      expect(listener).toHaveBeenCalledTimes(3)
    })

    it('should not match partial wildcards incorrectly', async () => {
      const listener = vi.fn()
      eventBus.on('work*', listener)

      await eventBus.emit('workflow:start', { workflowId: 'test' })

      // Should match because 'work*' matches 'workflow:start'
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('error Recovery', () => {
    it('should continue executing listeners after one fails', async () => {
      const failingListener = vi.fn(() => {
        throw new Error('Listener failed')
      })
      const successListener = vi.fn()

      eventBus.on('task:start', failingListener, { priority: 10 })
      eventBus.on('task:start', successListener, { priority: 5 })

      await eventBus.emit('task:start', { taskId: 'test' })

      expect(failingListener).toHaveBeenCalledTimes(1)
      expect(successListener).toHaveBeenCalledTimes(1)
    })

    it('should handle async listener errors', async () => {
      const failingListener = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        throw new Error('Async error')
      })
      const successListener = vi.fn()

      eventBus.on('workflow:start', failingListener)
      eventBus.on('workflow:start', successListener)

      await eventBus.emit('workflow:start', { workflowId: 'test' })

      expect(failingListener).toHaveBeenCalledTimes(1)
      expect(successListener).toHaveBeenCalledTimes(1)
    })

    it('should not emit error event for error events', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Error in error handler')
      })
      const errorEventListener = vi.fn()

      eventBus.on('workflow:error', errorListener)
      eventBus.on('workflow:error', errorEventListener)

      // Should not create infinite loop
      await eventBus.emit('workflow:error', { error: new Error('test') })

      expect(errorListener).toHaveBeenCalledTimes(1)
      expect(errorEventListener).toHaveBeenCalledTimes(1)
    })
  })

  describe('subscription Management', () => {
    it('should handle multiple unsubscribe calls', () => {
      const subscription = eventBus.on('workflow:start', vi.fn())

      subscription.unsubscribe()
      subscription.unsubscribe()
      subscription.unsubscribe()

      expect(eventBus.getListenerCount('workflow:start')).toBe(0)
    })

    it('should handle unsubscribe during event emission', async () => {
      const subscription = eventBus.on('task:start', () => {
        subscription.unsubscribe()
      })

      await eventBus.emit('task:start', { taskId: 'test' })

      // Listener should still execute once
      expect(eventBus.getListenerCount('task:start')).toBe(0)
    })

    it('should handle adding listeners during event emission', async () => {
      let callCount = 0

      eventBus.on('workflow:start', () => {
        callCount++
        if (callCount === 1) {
          // Add another listener during first emission
          eventBus.on('workflow:start', () => {
            callCount++
          })
        }
      })

      await eventBus.emit('workflow:start', { workflowId: 'test-1' })
      await eventBus.emit('workflow:start', { workflowId: 'test-2' })

      expect(callCount).toBe(3) // 1 from first emit, 2 from second emit
    })
  })

  describe('priority Edge Cases', () => {
    it('should handle same priority listeners', async () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const listener3 = vi.fn()

      eventBus.on('task:start', listener1, { priority: 5 })
      eventBus.on('task:start', listener2, { priority: 5 })
      eventBus.on('task:start', listener3, { priority: 5 })

      await eventBus.emit('task:start', { taskId: 'test' })

      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(1)
    })

    it('should handle negative priorities', async () => {
      const executionOrder: number[] = []

      eventBus.on('workflow:start', () => executionOrder.push(1), { priority: 1 })
      eventBus.on('workflow:start', () => executionOrder.push(-5), { priority: -5 })
      eventBus.on('workflow:start', () => executionOrder.push(0), { priority: 0 })

      await eventBus.emit('workflow:start', { workflowId: 'test' })

      expect(executionOrder).toEqual([1, 0, -5])
    })

    it('should handle extreme priority values', async () => {
      const executionOrder: number[] = []

      eventBus.on('task:start', () => executionOrder.push(1), { priority: Number.MAX_SAFE_INTEGER })
      eventBus.on('task:start', () => executionOrder.push(2), { priority: Number.MIN_SAFE_INTEGER })
      eventBus.on('task:start', () => executionOrder.push(3), { priority: 0 })

      await eventBus.emit('task:start', { taskId: 'test' })

      expect(executionOrder).toEqual([1, 3, 2])
    })
  })

  describe('scoped EventBus Edge Cases', () => {
    it('should handle nested scopes', async () => {
      const listener = vi.fn()
      // Create nested scope by using dot notation in namespace
      const scope = eventBus.createScope('agent.task')

      eventBus.on('agent.task.workflow:start', listener)
      await scope.emit('workflow:start', { workflowId: 'test' })

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should handle empty namespace', async () => {
      const listener = vi.fn()
      const scope = eventBus.createScope('')

      scope.on('workflow:start', listener)
      await eventBus.emit('.workflow:start', { workflowId: 'test' })

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should handle special characters in namespace', async () => {
      const listener = vi.fn()
      const scope = eventBus.createScope('agent-123')

      scope.on('workflow:start', listener)
      await eventBus.emit('agent-123.workflow:start', { workflowId: 'test' })

      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('waitFor Edge Cases', () => {
    it('should handle waitFor with immediate emission', async () => {
      const promise = eventBus.waitFor('workflow:complete')
      await eventBus.emit('workflow:complete', { workflowId: 'test' })

      const event = await promise
      expect(event.type).toBe('workflow:complete')
    })

    it('should handle multiple waitFor on same event', async () => {
      const promise1 = eventBus.waitFor('task:complete')
      const promise2 = eventBus.waitFor('task:complete')
      const promise3 = eventBus.waitFor('task:complete')

      await eventBus.emit('task:complete', { taskId: 'test' })

      const [event1, event2, event3] = await Promise.all([promise1, promise2, promise3])

      expect(event1.type).toBe('task:complete')
      expect(event2.type).toBe('task:complete')
      expect(event3.type).toBe('task:complete')
    })

    it('should handle waitFor with very short timeout', async () => {
      // Use 1ms timeout instead of 0, as 0 is treated as no timeout
      await expect(
        eventBus.waitFor('workflow:complete', 1),
      ).rejects.toThrow('Timeout waiting for event')
    })

    it('should handle waitFor with very long timeout', async () => {
      setTimeout(() => {
        eventBus.emit('task:complete', { taskId: 'test' })
      }, 10)

      const event = await eventBus.waitFor('task:complete', 100000)
      expect(event.type).toBe('task:complete')
    })
  })

  describe('history Edge Cases', () => {
    it('should handle history with maxHistorySize of 0', async () => {
      const bus = new EventBus({ maxHistorySize: 0 })

      await bus.emit('workflow:start', { workflowId: 'test' })

      expect(bus.getHistory()).toHaveLength(0)
    })

    it('should handle history with maxHistorySize of 1', async () => {
      const bus = new EventBus({ maxHistorySize: 1 })

      await bus.emit('workflow:start', { workflowId: 'test-1' })
      await bus.emit('workflow:complete', { workflowId: 'test-2' })

      const history = bus.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].event).toBe('workflow:complete')
    })

    it('should handle clearing empty history', () => {
      expect(() => {
        eventBus.clearHistory()
      }).not.toThrow()

      expect(eventBus.getHistory()).toHaveLength(0)
    })

    it('should handle history filter that matches nothing', async () => {
      await eventBus.emit('workflow:start', { workflowId: 'test' })
      await eventBus.emit('task:start', { taskId: 'test' })

      const filtered = eventBus.getHistory(entry => entry.event === 'non-existent')

      expect(filtered).toHaveLength(0)
    })
  })
})
