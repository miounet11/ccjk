/**
 * Tests for Agent Communication Protocol
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentCommunication, createCommunication, MESSAGE_TYPES } from '../../src/agents/communication'

describe('agentCommunication', () => {
  let communication: AgentCommunication
  let handler1: ReturnType<typeof vi.fn>
  let handler2: ReturnType<typeof vi.fn>

  beforeEach(() => {
    communication = new AgentCommunication()
    handler1 = vi.fn()
    handler2 = vi.fn()
  })

  describe('sendMessage', () => {
    it('should send message from one agent to another', async () => {
      const message = await communication.sendMessage('agent-1', 'agent-2', 'test', { data: 'test' })

      expect(message).toBeDefined()
      expect(message.from).toBe('agent-1')
      expect(message.to).toBe('agent-2')
      expect(message.type).toBe('test')
      expect(message.payload).toEqual({ data: 'test' })
      expect(message.status).toBe('sent')
      expect(message).toHaveProperty('id')
      expect(message).toHaveProperty('timestamp')
    })

    it('should add message to recipient queue', async () => {
      await communication.sendMessage('agent-1', 'agent-2', 'test', { data: 'test' })

      const messages = communication.getMessages('agent-2')
      expect(messages).toHaveLength(1)
      expect(messages[0].from).toBe('agent-1')
    })

    it('should trigger handlers for recipient', async () => {
      communication.registerHandler('agent-2', handler1)

      await communication.sendMessage('agent-1', 'agent-2', 'test', { data: 'test' })

      expect(handler1).toHaveBeenCalledTimes(1)
    })

    it('should not trigger handlers for other agents', async () => {
      communication.registerHandler('agent-3', handler1)

      await communication.sendMessage('agent-1', 'agent-2', 'test', { data: 'test' })

      expect(handler1).not.toHaveBeenCalled()
    })
  })

  describe('broadcastMessage', () => {
    it('should broadcast message to all agents except sender', async () => {
      communication.registerHandler('agent-2', handler1)
      communication.registerHandler('agent-3', handler2)

      const messages = await communication.broadcastMessage('agent-1', 'broadcast', { data: 'test' })

      expect(messages.length).toBeGreaterThanOrEqual(2) // At least agent-2 and agent-3
      expect(messages.every(m => m.from === 'agent-1')).toBe(true)
      expect(messages.every(m => m.to !== 'agent-1')).toBe(true)
    })

    it('should respect exclude list', async () => {
      communication.registerHandler('agent-2', handler1)
      communication.registerHandler('agent-3', handler2)

      const messages = await communication.broadcastMessage(
        'agent-1',
        'broadcast',
        { data: 'test' },
        ['agent-2'],
      )

      expect(messages.every(m => m.to !== 'agent-2')).toBe(true)
    })

    it('should include broadcast flag in payload', async () => {
      const messages = await communication.broadcastMessage('agent-1', 'broadcast', { data: 'test' })

      messages.forEach((message) => {
        expect(message.payload).toHaveProperty('broadcast', true)
      })
    })

    it('should throw when broadcasting is disabled', async () => {
      const noBroadcastComm = new AgentCommunication({ enableBroadcasting: false })

      await expect(
        noBroadcastComm.broadcastMessage('agent-1', 'broadcast', { data: 'test' }),
      ).rejects.toThrow('Broadcasting is disabled')
    })
  })

  describe('registerHandler', () => {
    it('should register handler for agent', async () => {
      communication.registerHandler('agent-1', handler1)

      await communication.sendMessage('agent-2', 'agent-1', 'test', { data: 'test' })

      expect(handler1).toHaveBeenCalledTimes(1)
    })

    it('should allow multiple handlers per agent', async () => {
      communication.registerHandler('agent-1', handler1)
      communication.registerHandler('agent-1', handler2)

      await communication.sendMessage('agent-2', 'agent-1', 'test', { data: 'test' })

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })

  describe('unregisterHandler', () => {
    it('should unregister handler', async () => {
      communication.registerHandler('agent-1', handler1)
      communication.unregisterHandler('agent-1', handler1)

      await communication.sendMessage('agent-2', 'agent-1', 'test', { data: 'test' })

      expect(handler1).not.toHaveBeenCalled()
    })

    it('should not affect other handlers', async () => {
      communication.registerHandler('agent-1', handler1)
      communication.registerHandler('agent-1', handler2)
      communication.unregisterHandler('agent-1', handler1)

      await communication.sendMessage('agent-2', 'agent-1', 'test', { data: 'test' })

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })

  describe('getMessages', () => {
    it('should return all messages for agent', async () => {
      await communication.sendMessage('agent-1', 'agent-2', 'test1', { data: 'test1' })
      await communication.sendMessage('agent-1', 'agent-2', 'test2', { data: 'test2' })

      const messages = communication.getMessages('agent-2')
      expect(messages).toHaveLength(2)
    })

    it('should return empty array for agent with no messages', () => {
      const messages = communication.getMessages('non-existent-agent')
      expect(messages).toEqual([])
    })
  })

  describe('getPendingMessages', () => {
    it('should return only pending messages', async () => {
      const msg1 = await communication.sendMessage('agent-1', 'agent-2', 'test1', { data: 'test1' })
      await communication.sendMessage('agent-1', 'agent-2', 'test2', { data: 'test2' })

      await communication.markProcessed(msg1.id)

      const pending = communication.getPendingMessages('agent-2')
      expect(pending).toHaveLength(1)
      expect(pending[0].type).toBe('test2')
    })
  })

  describe('markProcessed', () => {
    it('should mark message as processed', async () => {
      const message = await communication.sendMessage('agent-1', 'agent-2', 'test', { data: 'test' })

      await communication.markProcessed(message.id)

      expect(message.status).toBe('processed')
      expect(message.processedAt).toBeDefined()
    })
  })

  describe('replyToMessage', () => {
    it('should create reply message', async () => {
      const original = await communication.sendMessage('agent-1', 'agent-2', 'test', { data: 'test' })

      const reply = await communication.replyToMessage(original.id, 'agent-2', 'reply', {
        data: 'reply',
      })

      expect(reply.from).toBe('agent-2')
      expect(reply.to).toBe('agent-1')
      expect(reply.type).toBe('reply')
      expect(reply.payload).toHaveProperty('inReplyTo', original.id)
    })

    it('should throw for non-existent message', async () => {
      await expect(
        communication.replyToMessage('non-existent-id', 'agent-2', 'reply', { data: 'reply' }),
      ).rejects.toThrow('Message non-existent-id not found')
    })
  })

  describe('getStats', () => {
    it('should return communication statistics', async () => {
      communication.registerHandler('agent-2', async (msg) => {
        await communication.markProcessed(msg.id)
      })

      await communication.sendMessage('agent-1', 'agent-2', 'test', { data: 'test' })

      const stats = communication.getStats('agent-2')

      expect(stats).toHaveProperty('totalMessages')
      expect(stats).toHaveProperty('sentMessages')
      expect(stats).toHaveProperty('processedMessages')
      expect(stats.totalMessages).toBe(1)
    })

    it('should return global stats when no agent specified', async () => {
      await communication.sendMessage('agent-1', 'agent-2', 'test', { data: 'test' })
      await communication.sendMessage('agent-2', 'agent-3', 'test', { data: 'test' })

      const stats = communication.getStats()

      expect(stats.totalMessages).toBeGreaterThanOrEqual(2)
    })
  })

  describe('getMessageHistory', () => {
    it('should return message history for agent', async () => {
      await communication.sendMessage('agent-1', 'agent-2', 'test', { data: 'test' })

      const history = communication.getMessageHistory('agent-2')

      expect(history.length).toBeGreaterThanOrEqual(1)
      expect(history.every(m => m.from === 'agent-2' || m.to === 'agent-2')).toBe(true)
    })

    it('should respect limit parameter', async () => {
      await communication.sendMessage('agent-1', 'agent-2', 'test1', { data: 'test1' })
      await communication.sendMessage('agent-1', 'agent-2', 'test2', { data: 'test2' })
      await communication.sendMessage('agent-1', 'agent-2', 'test3', { data: 'test3' })

      const history = communication.getMessageHistory('agent-2', 2)

      expect(history).toHaveLength(2)
    })

    it('should return all history when no agent specified', async () => {
      await communication.sendMessage('agent-1', 'agent-2', 'test', { data: 'test' })

      const history = communication.getMessageHistory()

      expect(history.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('clearQueue', () => {
    it('should clear message queue for agent', async () => {
      await communication.sendMessage('agent-1', 'agent-2', 'test', { data: 'test' })

      communication.clearQueue('agent-2')

      const messages = communication.getMessages('agent-2')
      expect(messages).toEqual([])
    })
  })

  describe('clearAllQueues', () => {
    it('should clear all message queues', async () => {
      await communication.sendMessage('agent-1', 'agent-2', 'test', { data: 'test' })
      await communication.sendMessage('agent-2', 'agent-3', 'test', { data: 'test' })

      communication.clearAllQueues()

      // Check that new messages can be sent but old ones are cleared
      await communication.sendMessage('agent-1', 'agent-2', 'test2', { data: 'test2' })
      const messages = communication.getMessages('agent-2')
      expect(messages.length).toBe(1)
      expect(messages[0].type).toBe('test2')
    })
  })

  describe('retryFailedMessages', () => {
    it('should retry failed messages', async () => {
      const failingHandler = vi.fn().mockRejectedValue(new Error('Handler failed'))
      communication.registerHandler('agent-2', failingHandler)

      const message = await communication.sendMessage('agent-1', 'agent-2', 'test', { data: 'test' })

      // Wait for async handler to complete
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(message.status).toBe('failed')

      // Replace with successful handler
      communication.unregisterHandler('agent-2', failingHandler)
      communication.registerHandler('agent-2', handler1)

      await communication.retryFailedMessages('agent-2')

      const messages = communication.getMessages('agent-2')
      const messageWithRetry = messages.find(m => m.id === message.id)
      expect(messageWithRetry?.retries).toBe(1)
    })
  })

  describe('createCommunication', () => {
    it('should create communication instance with default config', () => {
      const comm = createCommunication()

      expect(comm).toBeInstanceOf(AgentCommunication)
    })

    it('should create communication instance with custom config', () => {
      const comm = createCommunication({ maxRetries: 5, timeout: 60000 })

      expect(comm).toBeInstanceOf(AgentCommunication)
    })
  })

  describe('mESSAGE_TYPES', () => {
    it('should have all required message types', () => {
      expect(MESSAGE_TYPES).toHaveProperty('TASK_REQUEST')
      expect(MESSAGE_TYPES).toHaveProperty('TASK_RESPONSE')
      expect(MESSAGE_TYPES).toHaveProperty('STATUS_UPDATE')
      expect(MESSAGE_TYPES).toHaveProperty('ERROR')
      expect(MESSAGE_TYPES).toHaveProperty('COLLABORATION_REQUEST')
      expect(MESSAGE_TYPES).toHaveProperty('COLLABORATION_RESPONSE')
      expect(MESSAGE_TYPES).toHaveProperty('RESULT_SHARE')
      expect(MESSAGE_TYPES).toHaveProperty('FEEDBACK')
      expect(MESSAGE_TYPES).toHaveProperty('HEARTBEAT')
    })

    it('should throw when trying to modify message types', () => {
      expect(() => {
        (MESSAGE_TYPES as any).TASK_REQUEST = 'modified'
      }).toThrow()
      // Values should remain constant
      expect(MESSAGE_TYPES.TASK_REQUEST).toBe('task_request')
    })
  })
})
