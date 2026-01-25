/**
 * CCJK Agents V3 - Communication System
 *
 * Inter-agent communication with request-response, publish-subscribe,
 * broadcast patterns, and optional message encryption.
 *
 * @module agents-v3/communication
 */

import { EventEmitter } from 'node:events'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { nanoid } from 'nanoid'
import type {
  AgentId,
  ChannelId,
  Message,
  MessageHandler,
  MessageId,
  MessageType,
  Priority,
  Subscription,
  SubscriptionOptions,
} from './types.js'

/**
 * Communication configuration
 */
export interface CommunicationConfig {
  /** Enable message encryption */
  enableEncryption: boolean

  /** Encryption key (required if encryption enabled) */
  encryptionKey?: string

  /** Message timeout in milliseconds */
  messageTimeoutMs: number

  /** Maximum message size in bytes */
  maxMessageSize: number

  /** Enable message persistence */
  enablePersistence: boolean

  /** Maximum pending messages per channel */
  maxPendingMessages: number

  /** Message TTL in milliseconds */
  defaultTtlMs: number

  /** Enable message acknowledgment */
  enableAcknowledgment: boolean

  /** Acknowledgment timeout in milliseconds */
  ackTimeoutMs: number
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CommunicationConfig = {
  enableEncryption: false,
  messageTimeoutMs: 30000,
  maxMessageSize: 1024 * 1024, // 1MB
  enablePersistence: false,
  maxPendingMessages: 1000,
  defaultTtlMs: 60000,
  enableAcknowledgment: true,
  ackTimeoutMs: 5000,
}

/**
 * Communication events
 */
export interface CommunicationEvents {
  'message:sent': (message: Message) => void
  'message:received': (message: Message) => void
  'message:delivered': (messageId: MessageId) => void
  'message:expired': (messageId: MessageId) => void
  'message:error': (messageId: MessageId, error: string) => void
  'channel:created': (channelId: ChannelId) => void
  'channel:deleted': (channelId: ChannelId) => void
  'subscription:added': (subscription: Subscription) => void
  'subscription:removed': (subscriptionId: string) => void
}

/**
 * Pending request for request-response pattern
 */
interface PendingRequest {
  messageId: MessageId
  resolve: (response: Message) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

/**
 * Channel information
 */
interface Channel {
  id: ChannelId
  name: string
  subscriptions: Map<string, Subscription>
  messageQueue: Message[]
  createdAt: number
}

/**
 * Communication Manager
 *
 * Handles all inter-agent communication with support for multiple
 * messaging patterns and optional encryption.
 */
export class Communication extends EventEmitter {
  private readonly config: CommunicationConfig
  private readonly channels: Map<ChannelId, Channel> = new Map()
  private readonly pendingRequests: Map<MessageId, PendingRequest> = new Map()
  private readonly messageHistory: Message[] = []
  private readonly encryptionKey?: Buffer
  private readonly algorithm = 'aes-256-gcm'

  constructor(config: Partial<CommunicationConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Initialize encryption key if enabled
    if (this.config.enableEncryption) {
      if (!this.config.encryptionKey) {
        throw new Error('Encryption key required when encryption is enabled')
      }
      this.encryptionKey = scryptSync(this.config.encryptionKey, 'salt', 32)
    }

    // Create default channels
    this.createChannel('system', 'System channel')
    this.createChannel('broadcast', 'Broadcast channel')
  }

  // ============================================================================
  // Channel Management
  // ============================================================================

  /**
   * Create a new channel
   */
  createChannel(id: ChannelId, name: string): Channel {
    if (this.channels.has(id)) {
      return this.channels.get(id)!
    }

    const channel: Channel = {
      id,
      name,
      subscriptions: new Map(),
      messageQueue: [],
      createdAt: Date.now(),
    }

    this.channels.set(id, channel)
    this.emit('channel:created', id)

    return channel
  }

  /**
   * Delete a channel
   */
  deleteChannel(id: ChannelId): boolean {
    if (id === 'system' || id === 'broadcast') {
      return false // Cannot delete system channels
    }

    const channel = this.channels.get(id)
    if (!channel) {
      return false
    }

    // Unsubscribe all
    for (const subscription of channel.subscriptions.values()) {
      subscription.unsubscribe()
    }

    this.channels.delete(id)
    this.emit('channel:deleted', id)

    return true
  }

  /**
   * Get channel by ID
   */
  getChannel(id: ChannelId): Channel | undefined {
    return this.channels.get(id)
  }

  /**
   * List all channels
   */
  listChannels(): Channel[] {
    return Array.from(this.channels.values())
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Subscribe to a channel
   */
  subscribe(
    channelId: ChannelId,
    subscriberId: AgentId | string,
    handler: MessageHandler,
    options: SubscriptionOptions = {},
  ): Subscription {
    let channel = this.channels.get(channelId)
    if (!channel) {
      channel = this.createChannel(channelId, channelId)
    }

    const subscriptionId = nanoid()

    const subscription: Subscription = {
      id: subscriptionId,
      channel: channelId,
      subscriberId,
      options,
      handler,
      createdAt: Date.now(),
      unsubscribe: () => this.unsubscribe(subscriptionId),
    }

    channel.subscriptions.set(subscriptionId, subscription)
    this.emit('subscription:added', subscription)

    // Process any pending messages
    this.processPendingMessages(channel, subscription)

    return subscription
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const channel of this.channels.values()) {
      if (channel.subscriptions.has(subscriptionId)) {
        channel.subscriptions.delete(subscriptionId)
        this.emit('subscription:removed', subscriptionId)
        return true
      }
    }
    return false
  }

  /**
   * Get subscriptions for a subscriber
   */
  getSubscriptions(subscriberId: AgentId | string): Subscription[] {
    const subscriptions: Subscription[] = []

    for (const channel of this.channels.values()) {
      for (const subscription of channel.subscriptions.values()) {
        if (subscription.subscriberId === subscriberId) {
          subscriptions.push(subscription)
        }
      }
    }

    return subscriptions
  }

  // ============================================================================
  // Request-Response Pattern
  // ============================================================================

  /**
   * Send a request and wait for response
   */
  async request<T = unknown, R = unknown>(
    to: AgentId,
    subject: string,
    payload: T,
    options: {
      timeout?: number
      priority?: Priority
      channel?: ChannelId
    } = {},
  ): Promise<Message<R>> {
    const messageId = nanoid()
    const replyChannel = `reply:${messageId}`

    // Create reply channel
    this.createChannel(replyChannel, `Reply channel for ${messageId}`)

    const message = this.createMessage<T>({
      type: 'request',
      channel: options.channel || 'system',
      from: 'orchestrator',
      to,
      subject,
      payload,
      priority: options.priority || 'normal',
      correlationId: messageId,
      replyTo: replyChannel,
    })

    return new Promise<Message<R>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId)
        this.deleteChannel(replyChannel)
        reject(new Error(`Request timeout after ${options.timeout || this.config.messageTimeoutMs}ms`))
      }, options.timeout || this.config.messageTimeoutMs)

      const pendingRequest: PendingRequest = {
        messageId,
        resolve: resolve as (response: Message) => void,
        reject,
        timeout,
      }

      this.pendingRequests.set(messageId, pendingRequest)

      // Subscribe to reply channel
      this.subscribe(replyChannel, 'orchestrator', (response) => {
        if (response.correlationId === messageId) {
          clearTimeout(timeout)
          this.pendingRequests.delete(messageId)
          this.deleteChannel(replyChannel)
          resolve(response as Message<R>)
        }
      })

      // Send the request
      this.send(message)
    })
  }

  /**
   * Send a response to a request
   */
  respond<T = unknown>(
    originalMessage: Message,
    payload: T,
    options: {
      priority?: Priority
    } = {},
  ): void {
    if (!originalMessage.replyTo) {
      throw new Error('Original message has no replyTo channel')
    }

    const response = this.createMessage<T>({
      type: 'response',
      channel: originalMessage.replyTo,
      from: originalMessage.to as AgentId,
      to: originalMessage.from,
      subject: `Re: ${originalMessage.subject}`,
      payload,
      priority: options.priority || originalMessage.priority,
      correlationId: originalMessage.correlationId || originalMessage.id,
    })

    this.send(response)
  }

  // ============================================================================
  // Publish-Subscribe Pattern
  // ============================================================================

  /**
   * Publish a message to a channel
   */
  publish<T = unknown>(
    channelId: ChannelId,
    subject: string,
    payload: T,
    options: {
      from?: AgentId | string
      priority?: Priority
      ttl?: number
    } = {},
  ): Message<T> {
    const message = this.createMessage<T>({
      type: 'event',
      channel: channelId,
      from: options.from || 'system',
      to: 'broadcast',
      subject,
      payload,
      priority: options.priority || 'normal',
      ttl: options.ttl || this.config.defaultTtlMs,
    })

    this.send(message)

    return message
  }

  // ============================================================================
  // Broadcast Pattern
  // ============================================================================

  /**
   * Broadcast a message to all agents
   */
  broadcast<T = unknown>(
    subject: string,
    payload: T,
    options: {
      from?: AgentId | string
      priority?: Priority
      excludeAgents?: AgentId[]
    } = {},
  ): Message<T> {
    const message = this.createMessage<T>({
      type: 'broadcast',
      channel: 'broadcast',
      from: options.from || 'system',
      to: 'all',
      subject,
      payload,
      priority: options.priority || 'normal',
      metadata: {
        excludeAgents: options.excludeAgents,
      },
    })

    this.send(message)

    return message
  }

  // ============================================================================
  // Direct Messaging
  // ============================================================================

  /**
   * Send a direct message to an agent
   */
  sendDirect<T = unknown>(
    to: AgentId,
    subject: string,
    payload: T,
    options: {
      from?: AgentId | string
      priority?: Priority
      type?: MessageType
    } = {},
  ): Message<T> {
    const message = this.createMessage<T>({
      type: options.type || 'notification',
      channel: `agent:${to}`,
      from: options.from || 'orchestrator',
      to,
      subject,
      payload,
      priority: options.priority || 'normal',
    })

    // Ensure agent channel exists
    this.createChannel(`agent:${to}`, `Direct channel for ${to}`)

    this.send(message)

    return message
  }

  /**
   * Send a command to an agent
   */
  sendCommand<T = unknown>(
    to: AgentId,
    command: string,
    payload: T,
    options: {
      from?: AgentId | string
      priority?: Priority
    } = {},
  ): Message<T> {
    return this.sendDirect(to, command, payload, {
      ...options,
      type: 'command',
      priority: options.priority || 'high',
    })
  }

  // ============================================================================
  // Core Messaging
  // ============================================================================

  /**
   * Send a message
   */
  send<T = unknown>(message: Message<T>): void {
    // Validate message size
    const messageSize = JSON.stringify(message).length
    if (messageSize > this.config.maxMessageSize) {
      this.emit('message:error', message.id, 'Message exceeds maximum size')
      return
    }

    // Encrypt if enabled
    let processedMessage = message
    if (this.config.enableEncryption && this.encryptionKey) {
      processedMessage = this.encryptMessage(message)
    }

    // Get channel
    let channel = this.channels.get(message.channel)
    if (!channel) {
      channel = this.createChannel(message.channel, message.channel)
    }

    // Store in history
    this.messageHistory.push(processedMessage)

    // Emit sent event
    this.emit('message:sent', processedMessage)

    // Deliver to subscribers
    this.deliverMessage(channel, processedMessage)
  }

  /**
   * Deliver message to channel subscribers
   */
  private deliverMessage(channel: Channel, message: Message): void {
    let delivered = false

    for (const subscription of channel.subscriptions.values()) {
      if (this.shouldDeliver(message, subscription)) {
        try {
          // Decrypt if needed
          let deliveredMessage = message
          if (message.encrypted && this.encryptionKey) {
            deliveredMessage = this.decryptMessage(message)
          }

          // Handle async or sync
          if (subscription.options.async) {
            Promise.resolve(subscription.handler(deliveredMessage)).catch(err => {
              this.emit('message:error', message.id, err.message)
            })
          } else {
            subscription.handler(deliveredMessage)
          }

          delivered = true
        } catch (error) {
          this.emit('message:error', message.id, (error as Error).message)
        }
      }
    }

    if (delivered) {
      this.emit('message:delivered', message.id)
    } else {
      // Queue message for later delivery
      if (channel.messageQueue.length < this.config.maxPendingMessages) {
        channel.messageQueue.push(message)
      }
    }
  }

  /**
   * Check if message should be delivered to subscription
   */
  private shouldDeliver(message: Message, subscription: Subscription): boolean {
    const opts = subscription.options

    // Check message type filter
    if (opts.type) {
      const types = Array.isArray(opts.type) ? opts.type : [opts.type]
      if (!types.includes(message.type)) {
        return false
      }
    }

    // Check sender filter
    if (opts.from) {
      const senders = Array.isArray(opts.from) ? opts.from : [opts.from]
      if (!senders.includes(message.from as AgentId)) {
        return false
      }
    }

    // Check priority filter
    if (opts.priority) {
      const priorities = Array.isArray(opts.priority) ? opts.priority : [opts.priority]
      if (!priorities.includes(message.priority)) {
        return false
      }
    }

    // Check recipient
    if (message.to !== 'all' && message.to !== 'broadcast') {
      const recipients = Array.isArray(message.to) ? message.to : [message.to]
      if (!recipients.includes(subscription.subscriberId as AgentId)) {
        return false
      }
    }

    // Check exclude list
    const excludeAgents = message.metadata?.excludeAgents as AgentId[] | undefined
    if (excludeAgents?.includes(subscription.subscriberId as AgentId)) {
      return false
    }

    // Check custom filter
    if (opts.filter && !opts.filter(message)) {
      return false
    }

    return true
  }

  /**
   * Process pending messages for a new subscription
   */
  private processPendingMessages(channel: Channel, subscription: Subscription): void {
    const now = Date.now()
    const validMessages: Message[] = []

    for (const message of channel.messageQueue) {
      // Check TTL
      if (message.ttl && now - message.timestamp > message.ttl) {
        this.emit('message:expired', message.id)
        continue
      }

      validMessages.push(message)

      if (this.shouldDeliver(message, subscription)) {
        try {
          let deliveredMessage = message
          if (message.encrypted && this.encryptionKey) {
            deliveredMessage = this.decryptMessage(message)
          }
          subscription.handler(deliveredMessage)
        } catch (error) {
          this.emit('message:error', message.id, (error as Error).message)
        }
      }
    }

    channel.messageQueue = validMessages
  }

  // ============================================================================
  // Message Creation
  // ============================================================================

  /**
   * Create a message
   */
  private createMessage<T>(params: {
    type: MessageType
    channel: ChannelId
    from: AgentId | 'orchestrator' | 'system'
    to: AgentId | AgentId[] | 'all' | 'broadcast'
    subject: string
    payload: T
    priority: Priority
    correlationId?: MessageId
    replyTo?: ChannelId
    ttl?: number
    metadata?: Record<string, unknown>
  }): Message<T> {
    return {
      id: nanoid(),
      type: params.type,
      channel: params.channel,
      from: params.from,
      to: params.to,
      subject: params.subject,
      payload: params.payload,
      priority: params.priority,
      correlationId: params.correlationId,
      replyTo: params.replyTo,
      timestamp: Date.now(),
      ttl: params.ttl,
      metadata: params.metadata,
    }
  }

  // ============================================================================
  // Encryption
  // ============================================================================

  /**
   * Encrypt a message
   */
  private encryptMessage<T>(message: Message<T>): Message<T> {
    if (!this.encryptionKey) {
      return message
    }

    const iv = randomBytes(16)
    const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv)

    const payloadStr = JSON.stringify(message.payload)
    let encrypted = cipher.update(payloadStr, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    return {
      ...message,
      payload: {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      } as unknown as T,
      encrypted: true,
    }
  }

  /**
   * Decrypt a message
   */
  private decryptMessage<T>(message: Message<T>): Message<T> {
    if (!this.encryptionKey || !message.encrypted) {
      return message
    }

    const encryptedPayload = message.payload as unknown as {
      encrypted: string
      iv: string
      authTag: string
    }

    const iv = Buffer.from(encryptedPayload.iv, 'hex')
    const authTag = Buffer.from(encryptedPayload.authTag, 'hex')
    const decipher = createDecipheriv(this.algorithm, this.encryptionKey, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedPayload.encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return {
      ...message,
      payload: JSON.parse(decrypted) as T,
      encrypted: false,
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get message history
   */
  getMessageHistory(options: {
    channel?: ChannelId
    from?: AgentId
    to?: AgentId
    type?: MessageType
    limit?: number
  } = {}): Message[] {
    let messages = [...this.messageHistory]

    if (options.channel) {
      messages = messages.filter(m => m.channel === options.channel)
    }

    if (options.from) {
      messages = messages.filter(m => m.from === options.from)
    }

    if (options.to) {
      messages = messages.filter(m => {
        if (Array.isArray(m.to)) {
          return m.to.includes(options.to!)
        }
        return m.to === options.to || m.to === 'all' || m.to === 'broadcast'
      })
    }

    if (options.type) {
      messages = messages.filter(m => m.type === options.type)
    }

    if (options.limit) {
      messages = messages.slice(-options.limit)
    }

    return messages
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory.length = 0
  }

  /**
   * Get communication statistics
   */
  getStats(): {
    totalChannels: number
    totalSubscriptions: number
    totalMessages: number
    pendingRequests: number
    pendingMessages: number
  } {
    let totalSubscriptions = 0
    let pendingMessages = 0

    for (const channel of this.channels.values()) {
      totalSubscriptions += channel.subscriptions.size
      pendingMessages += channel.messageQueue.length
    }

    return {
      totalChannels: this.channels.size,
      totalSubscriptions,
      totalMessages: this.messageHistory.length,
      pendingRequests: this.pendingRequests.size,
      pendingMessages,
    }
  }
}

/**
 * Create a communication instance
 */
export function createCommunication(config?: Partial<CommunicationConfig>): Communication {
  return new Communication(config)
}
