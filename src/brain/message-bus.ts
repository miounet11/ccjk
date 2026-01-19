/**
 * Message Bus - Pub/Sub system for Agent communication
 *
 * Features:
 * - Publish/Subscribe pattern
 * - Message routing and filtering
 * - Message persistence
 * - Synchronous and asynchronous message handling
 * - Dead letter queue for failed messages
 * - Message history and statistics
 */

import type {
  AgentMessage,
  AgentRole,
  BrainConfig,
  MessageBusStats,
  MessageFilter,
  MessageHandler,
  MessagePriority,
  MessageStatus,
  MessageStorage,
  MessageType,
  Subscription,
  SubscriptionOptions,
} from './types'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'pathe'

/**
 * Default configuration for message bus
 */
const DEFAULT_CONFIG: BrainConfig = {
  enablePersistence: false,
  maxHistorySize: 1000,
  messageRetentionTime: 24 * 60 * 60 * 1000, // 24 hours
  enableLogging: true,
  logLevel: 'info',
  enableValidation: true,
  maxMessageSize: 1024 * 1024, // 1MB
  enableDeadLetterQueue: true,
}

/**
 * File-based message storage implementation
 */
class FileMessageStorage implements MessageStorage {
  private filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
    this.ensureDirectory()
  }

  private ensureDirectory(): void {
    const dir = dirname(this.filePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  async save(message: AgentMessage): Promise<void> {
    try {
      const messages = await this.load()
      messages.push(message)
      writeFileSync(this.filePath, JSON.stringify(messages, null, 2), 'utf-8')
    }
    catch (error) {
      console.error('Failed to save message:', error)
      throw error
    }
  }

  async load(filter?: MessageFilter): Promise<AgentMessage[]> {
    try {
      if (!existsSync(this.filePath)) {
        return []
      }

      const content = readFileSync(this.filePath, 'utf-8')
      const messages = JSON.parse(content) as AgentMessage[]

      if (filter) {
        return messages.filter(filter)
      }

      return messages
    }
    catch (error) {
      console.error('Failed to load messages:', error)
      return []
    }
  }

  async delete(messageId: string): Promise<void> {
    try {
      const messages = await this.load()
      const filtered = messages.filter(msg => msg.id !== messageId)
      writeFileSync(this.filePath, JSON.stringify(filtered, null, 2), 'utf-8')
    }
    catch (error) {
      console.error('Failed to delete message:', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8')
    }
    catch (error) {
      console.error('Failed to clear messages:', error)
      throw error
    }
  }

  async getStats(): Promise<{ count: number, size: number }> {
    try {
      if (!existsSync(this.filePath)) {
        return { count: 0, size: 0 }
      }

      const messages = await this.load()
      const content = readFileSync(this.filePath, 'utf-8')

      return {
        count: messages.length,
        size: Buffer.byteLength(content, 'utf-8'),
      }
    }
    catch (error) {
      console.error('Failed to get storage stats:', error)
      return { count: 0, size: 0 }
    }
  }
}

/**
 * Message Bus implementation
 */
export class MessageBus {
  private config: BrainConfig
  private subscriptions: Map<string, Subscription>
  private messageHistory: AgentMessage[]
  private deadLetterQueue: AgentMessage[]
  private storage?: MessageStorage
  private stats: MessageBusStats

  constructor(config: Partial<BrainConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.subscriptions = new Map()
    this.messageHistory = []
    this.deadLetterQueue = []

    // Initialize storage if persistence is enabled
    if (this.config.enablePersistence && this.config.persistencePath) {
      this.storage = new FileMessageStorage(this.config.persistencePath)
      this.loadPersistedMessages()
    }

    // Initialize statistics
    this.stats = {
      totalMessages: 0,
      messagesByType: {} as Record<MessageType, number>,
      messagesByStatus: {} as Record<MessageStatus, number>,
      activeSubscriptions: 0,
      historySize: 0,
      deadLetterQueueSize: 0,
      avgProcessingTime: 0,
    }

    // Start cleanup interval
    this.startCleanupInterval()
  }

  /**
   * Publish a message to the bus
   */
  async publish<T = any>(
    type: MessageType,
    from: AgentRole,
    to: AgentRole | AgentRole[] | 'all',
    subject: string,
    payload: T,
    options: {
      priority?: MessagePriority
      correlationId?: string
      replyTo?: AgentRole
      metadata?: Record<string, any>
    } = {},
  ): Promise<string> {
    const message: AgentMessage<T> = {
      id: randomUUID(),
      type,
      from,
      to,
      subject,
      payload,
      priority: options.priority || 'normal',
      status: 'pending',
      timestamp: Date.now(),
      correlationId: options.correlationId,
      replyTo: options.replyTo,
      metadata: options.metadata,
    }

    // Validate message
    if (this.config.enableValidation) {
      this.validateMessage(message)
    }

    // Log message
    this.logMessage('publish', message)

    // Update statistics
    this.updateStats(message)

    // Add to history
    this.addToHistory(message)

    // Persist message
    if (this.storage) {
      await this.storage.save(message)
    }

    // Route message to subscribers
    await this.routeMessage(message)

    return message.id
  }

  /**
   * Subscribe to messages
   */
  subscribe(
    subscriber: AgentRole,
    handler: MessageHandler,
    options: SubscriptionOptions = {},
  ): Subscription {
    const subscription: Subscription = {
      id: randomUUID(),
      subscriber,
      options,
      handler,
      createdAt: Date.now(),
      unsubscribe: () => this.unsubscribe(subscription.id),
    }

    this.subscriptions.set(subscription.id, subscription)
    this.stats.activeSubscriptions = this.subscriptions.size

    this.log('info', `Agent ${subscriber} subscribed with ID ${subscription.id}`)

    return subscription
  }

  /**
   * Unsubscribe from messages
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      this.subscriptions.delete(subscriptionId)
      this.stats.activeSubscriptions = this.subscriptions.size
      this.log('info', `Subscription ${subscriptionId} removed`)
    }
  }

  /**
   * Get message by ID
   */
  getMessage(messageId: string): AgentMessage | undefined {
    return this.messageHistory.find(msg => msg.id === messageId)
  }

  /**
   * Get messages by filter
   */
  getMessages(filter: MessageFilter): AgentMessage[] {
    return this.messageHistory.filter(filter)
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    error?: { code: string, message: string, stack?: string },
  ): Promise<void> {
    const message = this.getMessage(messageId)
    if (message) {
      message.status = status
      if (error) {
        message.error = error
      }

      // Move to dead letter queue if failed
      if (status === 'failed' && this.config.enableDeadLetterQueue) {
        this.deadLetterQueue.push(message)
        this.stats.deadLetterQueueSize = this.deadLetterQueue.length
      }

      // Update statistics
      this.stats.messagesByStatus[status] = (this.stats.messagesByStatus[status] || 0) + 1

      // Persist update
      if (this.storage) {
        await this.storage.save(message)
      }

      this.log('debug', `Message ${messageId} status updated to ${status}`)
    }
  }

  /**
   * Get message bus statistics
   */
  getStats(): MessageBusStats {
    return { ...this.stats }
  }

  /**
   * Clear message history
   */
  async clearHistory(): Promise<void> {
    this.messageHistory = []
    this.stats.historySize = 0

    if (this.storage) {
      await this.storage.clear()
    }

    this.log('info', 'Message history cleared')
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = []
    this.stats.deadLetterQueueSize = 0
    this.log('info', 'Dead letter queue cleared')
  }

  /**
   * Get dead letter queue messages
   */
  getDeadLetterQueue(): AgentMessage[] {
    return [...this.deadLetterQueue]
  }

  /**
   * Shutdown message bus
   */
  async shutdown(): Promise<void> {
    this.log('info', 'Shutting down message bus')

    // Unsubscribe all
    this.subscriptions.clear()
    this.stats.activeSubscriptions = 0

    // Final persistence
    if (this.storage && this.messageHistory.length > 0) {
      for (const message of this.messageHistory) {
        await this.storage.save(message)
      }
    }

    this.log('info', 'Message bus shutdown complete')
  }

  /**
   * Route message to subscribers
   */
  private async routeMessage(message: AgentMessage): Promise<void> {
    const startTime = Date.now()
    const matchingSubscriptions = this.findMatchingSubscriptions(message)

    this.log('debug', `Routing message ${message.id} to ${matchingSubscriptions.length} subscribers`)

    for (const subscription of matchingSubscriptions) {
      try {
        // Update message status
        message.status = 'processing'

        // Handle message
        if (subscription.options.async) {
          await subscription.handler(message)
        }
        else {
          subscription.handler(message)
        }

        // Update message status
        message.status = 'completed'
      }
      catch (error) {
        this.log('error', `Error handling message ${message.id} in subscription ${subscription.id}:`, error)

        // Update message status
        await this.updateMessageStatus(message.id, 'failed', {
          code: 'HANDLER_ERROR',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
      }
    }

    // Update average processing time
    const processingTime = Date.now() - startTime
    this.stats.avgProcessingTime = (this.stats.avgProcessingTime + processingTime) / 2
  }

  /**
   * Find subscriptions matching the message
   */
  private findMatchingSubscriptions(message: AgentMessage): Subscription[] {
    const matching: Subscription[] = []
    const subscriptions = Array.from(this.subscriptions.values())

    for (const subscription of subscriptions) {
      // Check if message is addressed to this subscriber
      const isAddressed = message.to === 'all'
        || message.to === subscription.subscriber
        || (Array.isArray(message.to) && message.to.includes(subscription.subscriber))

      if (!isAddressed) {
        continue
      }

      // Apply filters
      if (!this.matchesSubscriptionFilters(message, subscription.options)) {
        continue
      }

      matching.push(subscription)
    }

    return matching
  }

  /**
   * Check if message matches subscription filters
   */
  private matchesSubscriptionFilters(
    message: AgentMessage,
    options: SubscriptionOptions,
  ): boolean {
    // Filter by type
    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type]
      if (!types.includes(message.type)) {
        return false
      }
    }

    // Filter by sender
    if (options.from) {
      const senders = Array.isArray(options.from) ? options.from : [options.from]
      if (!senders.includes(message.from)) {
        return false
      }
    }

    // Filter by priority
    if (options.priority) {
      const priorities = Array.isArray(options.priority) ? options.priority : [options.priority]
      if (!priorities.includes(message.priority)) {
        return false
      }
    }

    // Custom filter
    if (options.filter && !options.filter(message)) {
      return false
    }

    return true
  }

  /**
   * Validate message
   */
  private validateMessage(message: AgentMessage): void {
    if (!message.id) {
      throw new Error('Message ID is required')
    }

    if (!message.type) {
      throw new Error('Message type is required')
    }

    if (!message.from) {
      throw new Error('Message sender is required')
    }

    if (!message.to) {
      throw new Error('Message recipient is required')
    }

    if (!message.subject) {
      throw new Error('Message subject is required')
    }

    // Check message size
    if (this.config.maxMessageSize) {
      const messageSize = Buffer.byteLength(JSON.stringify(message), 'utf-8')
      if (messageSize > this.config.maxMessageSize) {
        throw new Error(`Message size ${messageSize} exceeds maximum ${this.config.maxMessageSize}`)
      }
    }
  }

  /**
   * Add message to history
   */
  private addToHistory(message: AgentMessage): void {
    this.messageHistory.push(message)
    this.stats.historySize = this.messageHistory.length

    // Trim history if needed
    if (this.messageHistory.length > this.config.maxHistorySize) {
      this.messageHistory.shift()
      this.stats.historySize = this.messageHistory.length
    }
  }

  /**
   * Update statistics
   */
  private updateStats(message: AgentMessage): void {
    this.stats.totalMessages++
    this.stats.messagesByType[message.type] = (this.stats.messagesByType[message.type] || 0) + 1
    this.stats.messagesByStatus[message.status] = (this.stats.messagesByStatus[message.status] || 0) + 1
  }

  /**
   * Load persisted messages
   */
  private async loadPersistedMessages(): Promise<void> {
    if (!this.storage) {
      return
    }

    try {
      const messages = await this.storage.load()
      this.messageHistory = messages
      this.stats.historySize = messages.length
      this.log('info', `Loaded ${messages.length} persisted messages`)
    }
    catch (error) {
      this.log('error', 'Failed to load persisted messages:', error)
    }
  }

  /**
   * Start cleanup interval for old messages
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now()
      const retentionTime = this.config.messageRetentionTime

      // Remove old messages from history
      this.messageHistory = this.messageHistory.filter(
        msg => now - msg.timestamp < retentionTime,
      )
      this.stats.historySize = this.messageHistory.length

      // Remove old messages from dead letter queue
      this.deadLetterQueue = this.deadLetterQueue.filter(
        msg => now - msg.timestamp < retentionTime,
      )
      this.stats.deadLetterQueueSize = this.deadLetterQueue.length

      this.log('debug', 'Cleanup completed')
    }, 60 * 60 * 1000) // Run every hour
  }

  /**
   * Log message
   */
  private logMessage(action: string, message: AgentMessage): void {
    if (!this.config.enableLogging) {
      return
    }

    const logLevel = this.config.logLevel
    const shouldLog = logLevel === 'debug'
      || (logLevel === 'info' && ['publish', 'subscribe'].includes(action))
      || (logLevel === 'warn' && message.priority === 'high')
      || (logLevel === 'error' && message.status === 'failed')

    if (shouldLog) {
      this.log('debug', `[${action}] ${message.type} from ${message.from} to ${message.to}: ${message.subject}`)
    }
  }

  /**
   * Internal logging
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    if (!this.config.enableLogging) {
      return
    }

    const levels = ['debug', 'info', 'warn', 'error']
    const configLevel = levels.indexOf(this.config.logLevel)
    const messageLevel = levels.indexOf(level)

    if (messageLevel >= configLevel) {
      console[level](`[MessageBus] ${message}`, ...args)
    }
  }
}

/**
 * Create a new message bus instance
 */
export function createMessageBus(config?: Partial<BrainConfig>): MessageBus {
  return new MessageBus(config)
}

/**
 * Singleton message bus instance
 */
let globalMessageBus: MessageBus | null = null

/**
 * Get or create global message bus instance
 */
export function getMessageBus(config?: Partial<BrainConfig>): MessageBus {
  if (!globalMessageBus) {
    globalMessageBus = new MessageBus(config)
  }
  return globalMessageBus
}

/**
 * Reset global message bus instance
 */
export function resetMessageBus(): void {
  if (globalMessageBus) {
    globalMessageBus.shutdown()
    globalMessageBus = null
  }
}
