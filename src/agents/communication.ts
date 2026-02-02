/**
 * Agent Communication Protocol
 *
 * Enhanced version that handles message passing between agents with support for:
 * - Message queuing and delivery
 * - Broadcasting
 * - Handler registration
 * - Message history and statistics
 * - Retry logic
 */

import type { OrchestratorMessage } from '../types/agent.js'

// Extended message interface for enhanced features
interface AgentMessage extends OrchestratorMessage {
  id: string
  status: 'pending' | 'sent' | 'processed' | 'failed'
  retries: number
  deliveredAt?: number
  processedAt?: number
  error?: string
}

type MessageHandler = (message: AgentMessage) => void | Promise<void>
type MessageQueue = Map<string, AgentMessage[]>

interface CommunicationConfig {
  maxRetries: number
  timeout: number
  enableBroadcasting: boolean
}

const DEFAULT_CONFIG: CommunicationConfig = {
  maxRetries: 3,
  timeout: 30000,
  enableBroadcasting: true,
}

export class AgentCommunication {
  private config: CommunicationConfig
  private messageQueue: MessageQueue = new Map()
  private handlers: Map<string, MessageHandler[]> = new Map()
  private messageHistory: AgentMessage[] = []
  private legacyQueue: AgentMessage[] = [] // For backward compatibility

  constructor(config: Partial<CommunicationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Send a message (backward compatible with original API)
   */
  send(from: string, to: string, type: 'request' | 'response' | 'notification', payload: any): void {
    this.sendMessage(from, to, type, payload).catch(console.error)
  }

  /**
   * Send a message asynchronously (enhanced API)
   */
  async sendMessage(
    from: string,
    to: string,
    type: string,
    payload: unknown
  ): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      from,
      to,
      type: type as any,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    }

    // Add to queue
    if (!this.messageQueue.has(to)) {
      this.messageQueue.set(to, [])
    }
    this.messageQueue.get(to)!.push(message)

    // Add to legacy queue for backward compatibility
    this.legacyQueue.push(message)

    // Add to history
    this.messageHistory.push(message)

    // Trigger handlers
    await this.triggerHandlers(to, message)

    // Update message status only if not already failed by handlers
    if (message.status !== 'failed') {
      message.status = 'sent'
      message.deliveredAt = Date.now()
    }

    return message
  }

  /**
   * Broadcast a message to all agents
   */
  async broadcastMessage(
    from: string,
    type: string,
    payload: unknown,
    exclude: string[] = []
  ): Promise<AgentMessage[]> {
    if (!this.config.enableBroadcasting) {
      throw new Error('Broadcasting is disabled')
    }

    const recipients = Array.from(this.handlers.keys()).filter(
      agent => agent !== from && !exclude.includes(agent)
    )

    const messages = await Promise.all(
      recipients.map(to =>
        this.sendMessage(from, to, type, {
          ...(typeof payload === 'object' && payload !== null ? payload : { data: payload }),
          broadcast: true,
          recipientCount: recipients.length,
        } as Record<string, unknown>)
      )
    )

    return messages
  }

  /**
   * Subscribe to messages (backward compatible with original API)
   */
  subscribe(agentId: string, handler: (msg: OrchestratorMessage) => void): void {
    this.registerHandler(agentId, handler as MessageHandler)
  }

  /**
   * Register a message handler
   */
  registerHandler(agentId: string, handler: MessageHandler): void {
    if (!this.handlers.has(agentId)) {
      this.handlers.set(agentId, [])
    }
    this.handlers.get(agentId)!.push(handler)
  }

  /**
   * Unregister a message handler
   */
  unregisterHandler(agentId: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(agentId)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * Get messages for an agent (backward compatible with original API)
   */
  getMessages(agentId: string): OrchestratorMessage[] {
    // Return messages from legacy queue for backward compatibility
    return this.legacyQueue.filter(msg => msg.to === agentId || msg.from === agentId)
  }

  /**
   * Get pending messages for an agent (not yet processed)
   */
  getPendingMessages(agentId: string): AgentMessage[] {
    const messages = this.messageQueue.get(agentId) || []
    return messages.filter(msg => msg.status === 'pending' || msg.status === 'sent')
  }

  /**
   * Mark a message as processed
   */
  async markProcessed(messageId: string): Promise<void> {
    const message = this.findMessage(messageId)
    if (message) {
      message.status = 'processed'
      message.processedAt = Date.now()
    }
  }

  /**
   * Reply to a message
   */
  async replyToMessage(
    originalMessageId: string,
    from: string,
    type: string,
    payload: unknown
  ): Promise<AgentMessage> {
    const originalMessage = this.findMessage(originalMessageId)
    if (!originalMessage) {
      throw new Error(`Message ${originalMessageId} not found`)
    }

    return this.sendMessage(from, originalMessage.from, type, {
      ...(typeof payload === 'object' && payload !== null ? payload : { data: payload }),
      inReplyTo: originalMessageId,
    } as Record<string, unknown>)
  }

  /**
   * Get communication statistics
   */
  getStats(agentId?: string) {
    const relevantMessages = agentId
      ? this.messageHistory.filter(m => m.from === agentId || m.to === agentId)
      : this.messageHistory

    return {
      totalMessages: relevantMessages.length,
      sentMessages: relevantMessages.filter(m => m.status === 'sent').length,
      pendingMessages: relevantMessages.filter(m => m.status === 'pending').length,
      processedMessages: relevantMessages.filter(m => m.status === 'processed').length,
      failedMessages: relevantMessages.filter(m => m.status === 'failed').length,
      averageDeliveryTime: this.calculateAverageDeliveryTime(relevantMessages),
      messageTypes: this.getMessageTypeBreakdown(relevantMessages),
    }
  }

  /**
   * Get message history
   */
  getMessageHistory(agentId?: string, limit?: number): AgentMessage[] {
    let messages = agentId
      ? this.messageHistory.filter(m => m.from === agentId || m.to === agentId)
      : this.messageHistory

    if (limit) {
      messages = messages.slice(-limit)
    }

    return messages
  }

  /**
   * Clear message queue for an agent
   */
  clearQueue(agentId: string): void {
    this.messageQueue.delete(agentId)
    // Also remove from legacy queue for backward compatibility
    this.legacyQueue = this.legacyQueue.filter(msg => msg.to !== agentId && msg.from !== agentId)
  }

  /**
   * Clear all message queues (backward compatible with original API)
   */
  clear(): void {
    this.legacyQueue = []
    this.messageQueue.clear()
    this.messageHistory = []
  }

  /**
   * Clear all queues
   */
  clearAllQueues(): void {
    this.legacyQueue = []
    this.messageQueue.clear()
    this.messageHistory = []
  }

  /**
   * Retry failed messages for an agent
   */
  async retryFailedMessages(agentId: string): Promise<void> {
    const messages = this.messageHistory.filter(
      (msg): msg is AgentMessage =>
        (msg.to === agentId || msg.from === agentId) &&
        msg.status === 'failed' &&
        msg.retries < this.config.maxRetries
    )

    for (const message of messages) {
      message.retries++
      message.status = 'pending'
      await this.triggerHandlers(agentId, message)
    }
  }

  /**
   * Private: Deliver message (backward compatible)
   */
  private deliver(message: OrchestratorMessage): void {
    const handlers = this.handlers.get(message.to)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message as AgentMessage)
        } catch (error) {
          console.error(`Handler error for agent ${message.to}:`, error)
        }
      })
    }
  }

  /**
   * Private: Trigger handlers for a message
   */
  private async triggerHandlers(agentId: string, message: AgentMessage): Promise<void> {
    const handlers = this.handlers.get(agentId)
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(message)
        } catch (error) {
          console.error(`Handler error for agent ${agentId}:`, error)
          message.status = 'failed'
          message.error = error instanceof Error ? error.message : String(error)
        }
      }
    }
  }

  /**
   * Private: Find a message by ID
   */
  private findMessage(messageId: string): AgentMessage | undefined {
    return this.messageHistory.find(m => m.id === messageId)
  }

  /**
   * Private: Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Private: Calculate average delivery time
   */
  private calculateAverageDeliveryTime(messages: AgentMessage[]): number {
    const deliveredMessages = messages.filter(m => m.deliveredAt && m.timestamp)
    if (deliveredMessages.length === 0) return 0

    const totalTime = deliveredMessages.reduce(
      (sum, m) => sum + (m.deliveredAt! - m.timestamp),
      0
    )
    return totalTime / deliveredMessages.length
  }

  /**
   * Private: Get message type breakdown
   */
  private getMessageTypeBreakdown(messages: AgentMessage[]): Record<string, number> {
    const breakdown: Record<string, number> = {}
    for (const message of messages) {
      breakdown[message.type] = (breakdown[message.type] || 0) + 1
    }
    return breakdown
  }
}

/**
 * Create a communication protocol instance with default configuration
 */
export function createCommunication(config?: Partial<CommunicationConfig>): AgentCommunication {
  return new AgentCommunication(config)
}

/**
 * Message type constants (frozen for immutability)
 */
export const MESSAGE_TYPES = Object.freeze({
  TASK_REQUEST: 'task_request',
  TASK_RESPONSE: 'task_response',
  STATUS_UPDATE: 'status_update',
  ERROR: 'error',
  COLLABORATION_REQUEST: 'collaboration_request',
  COLLABORATION_RESPONSE: 'collaboration_response',
  RESULT_SHARE: 'result_share',
  FEEDBACK: 'feedback',
  HEARTBEAT: 'heartbeat',
} as const)
