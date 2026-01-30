/**
 * EventBus Tests
 *
 * Comprehensive test suite for the EventBus implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventBus, createEventBus } from '../../src/orchestrator/events'
import type { OrchestratorEventType } from '../../src/orchestrator/types'

describe('EventBus', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = createEventBus()
  })

  describe('createEventBus', () => {
    it('should create an EventBus instance', () => {
      expect(eventBus).toBeDefined()
      expect(eventBus.emit).toBeDefined()
      expect(eventBus.on).toBeDefined()
      expect(eventBus.off).toBeDefined()
    })
  })

  describe('emit and on', () => {
    it('should emit events to subscribers', async () => {
      const handler = vi.fn()
      eventBus.on('workflow:start', handler)

      await eventBus.emit('workflow:start', { workflowId: 'test-workflow' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'workflow:start',
          data: { workflowId: 'test-workflow' },
        })
      )
    })

    it('should support multiple subscribers for same event', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      eventBus.on('workflow:start', handler1)
      eventBus.on('workflow:start', handler2)

      await eventBus.emit('workflow:start', { id: 'test' })

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should not call handlers for different event types', async () => {
      const handler = vi.fn()
      eventBus.on('workflow:start', handler)

      await eventBus.emit('workflow:complete', {})

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('off', () => {
    it('should unsubscribe handler using subscription object', async () => {
      const handler = vi.fn()
      const subscription = eventBus.on('workflow:start', handler)
      subscription.unsubscribe()

      await eventBus.emit('workflow:start', {})

      expect(handler).not.toHaveBeenCalled()
    })

    it('should remove all listeners for an event', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      eventBus.on('workflow:start', handler1)
      eventBus.on('workflow:start', handler2)

      eventBus.off('workflow:start')

      await eventBus.emit('workflow:start', {})

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })
  })

  describe('once', () => {
    it('should only call handler once', async () => {
      const handler = vi.fn()
      eventBus.once('workflow:start', handler)

      await eventBus.emit('workflow:start', { first: true })
      await eventBus.emit('workflow:start', { second: true })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { first: true },
        })
      )
    })
  })

  describe('wildcard subscriptions', () => {
    it('should support wildcard event subscriptions', async () => {
      const handler = vi.fn()
      eventBus.on('workflow:*', handler)

      await eventBus.emit('workflow:start', { id: 'test' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'workflow:start',
          data: { id: 'test' },
        })
      )
    })

    it('should match multiple events with wildcard', async () => {
      const handler = vi.fn()
      eventBus.on('workflow:*', handler)

      await eventBus.emit('workflow:start', {})
      await eventBus.emit('workflow:complete', {})

      expect(handler).toHaveBeenCalledTimes(2)
    })
  })

  describe('priority', () => {
    it('should call higher priority listeners first', async () => {
      const callOrder: number[] = []

      eventBus.on('workflow:start', () => { callOrder.push(1) }, { priority: 1 })
      eventBus.on('workflow:start', () => { callOrder.push(2) }, { priority: 2 })
      eventBus.on('workflow:start', () => { callOrder.push(0) }, { priority: 0 })

      await eventBus.emit('workflow:start', {})

      expect(callOrder).toEqual([2, 1, 0])
    })
  })

  describe('history', () => {
    it('should record event history', async () => {
      await eventBus.emit('workflow:start', { id: 'test' })

      const history = eventBus.getHistory()

      expect(history).toHaveLength(1)
      expect(history[0]).toMatchObject({
        event: 'workflow:start',
        data: { id: 'test' },
      })
    })

    it('should filter history', async () => {
      await eventBus.emit('workflow:start', {})
      await eventBus.emit('workflow:complete', {})
      await eventBus.emit('task:start', {})

      const workflowHistory = eventBus.getHistory(
        entry => entry.event.toString().startsWith('workflow:')
      )

      expect(workflowHistory).toHaveLength(2)
    })

    it('should clear history', async () => {
      await eventBus.emit('workflow:start', {})
      eventBus.clearHistory()

      expect(eventBus.getHistory()).toHaveLength(0)
    })
  })

  describe('utility methods', () => {
    it('should return registered event types', () => {
      eventBus.on('workflow:start', () => {})
      eventBus.on('workflow:complete', () => {})

      const types = eventBus.getEventTypes()

      expect(types).toContain('workflow:start')
      expect(types).toContain('workflow:complete')
    })

    it('should return listener count', () => {
      eventBus.on('workflow:start', () => {})
      eventBus.on('workflow:start', () => {})

      expect(eventBus.getListenerCount('workflow:start')).toBe(2)
      expect(eventBus.getListenerCount('workflow:complete')).toBe(0)
    })

    it('should remove all listeners', () => {
      eventBus.on('workflow:start', () => {})
      eventBus.on('workflow:complete', () => {})

      eventBus.removeAllListeners()

      expect(eventBus.getEventTypes()).toHaveLength(0)
    })
  })

  describe('waitFor', () => {
    it('should wait for an event', async () => {
      const promise = eventBus.waitFor('workflow:complete')

      // Emit after a short delay
      setTimeout(() => {
        eventBus.emit('workflow:complete', { result: 'success' })
      }, 10)

      const event = await promise

      expect(event.type).toBe('workflow:complete')
      expect(event.data).toEqual({ result: 'success' })
    })

    it('should timeout if event not received', async () => {
      await expect(
        eventBus.waitFor('workflow:complete', 50)
      ).rejects.toThrow('Timeout waiting for event')
    })
  })

  describe('scoped event bus', () => {
    it('should create scoped event bus', () => {
      const scoped = eventBus.createScope('agent')

      expect(scoped).toBeDefined()
      expect(scoped.on).toBeDefined()
      expect(scoped.emit).toBeDefined()
    })

    it('should prefix events with namespace', async () => {
      const handler = vi.fn()
      const scoped = eventBus.createScope('agent')

      // Subscribe on parent with full scoped name
      eventBus.on('agent.workflow:start' as OrchestratorEventType, handler)

      // Emit from scoped bus
      await scoped.emit('workflow:start', { id: 'test' })

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })
})
