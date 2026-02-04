/**
 * CCJK Agents-v2 PubSub
 * Redis-based publish-subscribe messaging system
 */

import type { IPubSub, Message, MessageHandler } from '../types.js'
import type { Redis } from 'ioredis'

export interface SubscriptionOptions {
  pattern?: boolean
  buffer?: boolean
  priority?: number
  filter?: (message: Message) => boolean
  maxConcurrent?: number
}

export interface PubSubMetrics {
  channels: number
  subscribers: number
  messagesPublished: number
  messagesReceived: number
  messagesFiltered: number
  errors: number
}

export class PubSub implements IPubSub {
  private redis: Redis
  private publisher: Redis
  private subscriber: Redis
  private keyPrefix: string
  private subscriptions: Map<string, Set<MessageHandler>>
  private patternSubscriptions: Map<string, Set<MessageHandler>>
  private handlers: Map<MessageHandler, SubscriptionOptions>
  private metrics: PubSubMetrics
  private messageCounters: Map<string, number>
  private rateLimiters: Map<string, { count: number, resetTime: number }>

  constructor(redis: Redis, keyPrefix = 'ccjk:pubsub:') {
    this.redis = redis
    this.keyPrefix = keyPrefix
    this.subscriptions = new Map()
    this.patternSubscriptions = new Map()
    this.handlers = new Map()
    this.metrics = {
      channels: 0,
      subscribers: 0,
      messagesPublished: 0,
      messagesReceived: 0,
      messagesFiltered: 0,
      errors: 0,
    }
    this.messageCounters = new Map()
    this.rateLimiters = new Map()

    // Create separate connections for pub/sub
    this.publisher = redis.duplicate()
    this.subscriber = redis.duplicate()

    // Set up subscription handling
    this.setupSubscriptionHandlers()
  }

  private getChannelKey(channel: string): string {
    return `${this.keyPrefix}channel:${channel}`
  }

  private getSubscriptionKey(channel: string): string {
    return `${this.keyPrefix}sub:${channel}`
  }

  private getMetricsKey(): string {
    return `${this.keyPrefix}metrics`
  }

  private setupSubscriptionHandlers(): void {
    // Regular message handler
    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message).catch((error) => {
        console.error('Error handling message:', error)
        this.metrics.errors++
      })
    })

    // Pattern message handler
    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.handlePatternMessage(pattern, channel, message).catch((error) => {
        console.error('Error handling pattern message:', error)
        this.metrics.errors++
      })
    })

    // Error handlers
    this.subscriber.on('error', (error) => {
      console.error('Subscriber error:', error)
      this.metrics.errors++
    })

    this.publisher.on('error', (error) => {
      console.error('Publisher error:', error)
      this.metrics.errors++
    })
  }

  async publish(channel: string, message: Message): Promise<void> {
    const channelKey = this.getChannelKey(channel)
    const messageData = JSON.stringify(message)

    try {
      // Publish to Redis
      const subscribers = await this.publisher.publish(channelKey, messageData)

      // Update metrics
      this.metrics.messagesPublished++
      this.messageCounters.set(channel, (this.messageCounters.get(channel) || 0) + 1)

      // Store message for replay if needed
      await this.storeMessage(channel, message)

      console.debug(`Published message to channel ${channel}: ${subscribers} subscribers`)
    }
    catch (error) {
      console.error('Failed to publish message:', error)
      this.metrics.errors++
      throw error
    }
  }

  async subscribe(channel: string, handler: MessageHandler, options: SubscriptionOptions = {}): Promise<void> {
    const channelKey = this.getChannelKey(channel)

    // Add handler to local registry
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set())
    }
    this.subscriptions.get(channel)!.add(handler)

    // Store options
    this.handlers.set(handler, options)

    // Subscribe to Redis channel
    await this.subscriber.subscribe(channelKey)

    // Update metrics
    this.updateMetrics()

    console.debug(`Subscribed to channel: ${channel}`)
  }

  async subscribePattern(pattern: string, handler: MessageHandler, options: SubscriptionOptions = {}): Promise<void> {
    // Add handler to pattern registry
    if (!this.patternSubscriptions.has(pattern)) {
      this.patternSubscriptions.set(pattern, new Set())
    }
    this.patternSubscriptions.get(pattern)!.add(handler)

    // Store options
    this.handlers.set(handler, options)

    // Subscribe to Redis pattern
    await this.subscriber.psubscribe(pattern)

    // Update metrics
    this.updateMetrics()

    console.debug(`Subscribed to pattern: ${pattern}`)
  }

  async unsubscribe(channel: string): Promise<void> {
    const channelKey = this.getChannelKey(channel)

    // Remove all handlers for this channel
    const handlers = this.subscriptions.get(channel)
    if (handlers) {
      for (const handler of Array.from(handlers)) {
        this.handlers.delete(handler)
      }
    }

    this.subscriptions.delete(channel)

    // Unsubscribe from Redis
    await this.subscriber.unsubscribe(channelKey)

    // Update metrics
    this.updateMetrics()

    console.debug(`Unsubscribed from channel: ${channel}`)
  }

  async unsubscribePattern(pattern: string): Promise<void> {
    // Remove all handlers for this pattern
    const handlers = this.patternSubscriptions.get(pattern)
    if (handlers) {
      for (const handler of Array.from(handlers)) {
        this.handlers.delete(handler)
      }
    }

    this.patternSubscriptions.delete(pattern)

    // Unsubscribe from Redis
    await this.subscriber.punsubscribe(pattern)

    // Update metrics
    this.updateMetrics()

    console.debug(`Unsubscribed from pattern: ${pattern}`)
  }

  async getChannels(): Promise<string[]> {
    // Get all subscribed channels from local registry
    return Array.from(this.subscriptions.keys())
  }

  async getSubscribers(channel: string): Promise<number> {
    const channelKey = this.getChannelKey(channel)

    // Get subscriber count from Redis
    const info = await this.redis.pubsub('NUMSUB', channelKey) as unknown[]
    return (info[1] as number) || 0
  }

  private async handleMessage(channel: string, messageData: string): Promise<void> {
    try {
      const message: Message = JSON.parse(messageData)
      const channelName = this.extractChannelName(channel)

      this.metrics.messagesReceived++

      // Get handlers for this channel
      const handlers = this.subscriptions.get(channelName)
      if (!handlers || handlers.size === 0) {
        return
      }

      // Process message with handlers
      await this.processMessageWithHandlers(message, handlers)
    }
    catch (error) {
      console.error('Error processing message:', error)
      this.metrics.errors++
    }
  }

  private async handlePatternMessage(pattern: string, channel: string, messageData: string): Promise<void> {
    try {
      const message: Message = JSON.parse(messageData)
      const channelName = this.extractChannelName(channel)

      this.metrics.messagesReceived++

      // Get handlers for this pattern
      const handlers = this.patternSubscriptions.get(pattern)
      if (!handlers || handlers.size === 0) {
        return
      }

      // Process message with handlers
      await this.processMessageWithHandlers(message, handlers)
    }
    catch (error) {
      console.error('Error processing pattern message:', error)
      this.metrics.errors++
    }
  }

  private async processMessageWithHandlers(message: Message, handlers: Set<MessageHandler>): Promise<void> {
    const promises: Promise<void>[] = []

    for (const handler of Array.from(handlers)) {
      const options = this.handlers.get(handler) || {}

      // Apply filter if specified
      if (options.filter && !options.filter(message)) {
        this.metrics.messagesFiltered++
        continue
      }

      // Check rate limit if specified
      if (options.maxConcurrent) {
        const currentCount = this.getHandlerConcurrency(handler)
        if (currentCount >= options.maxConcurrent) {
          continue
        }
        this.incrementHandlerConcurrency(handler)
      }

      // Process message
      const promise = handler(message).finally(() => {
        if (options.maxConcurrent) {
          this.decrementHandlerConcurrency(handler)
        }
      })

      promises.push(promise)
    }

    await Promise.allSettled(promises)
  }

  private extractChannelName(channel: string): string {
    const prefix = this.getChannelKey('')
    return channel.startsWith(prefix) ? channel.substring(prefix.length) : channel
  }

  private async storeMessage(channel: string, message: Message): Promise<void> {
    // Store last N messages for replay capability
    const historyKey = `${this.getChannelKey(channel)}:history`
    const messageData = JSON.stringify({
      message,
      storedAt: Date.now(),
    })

    // Add to history with timestamp score
    await this.redis.zadd(historyKey, Date.now(), messageData)

    // Keep only last 100 messages
    await this.redis.zremrangebyrank(historyKey, 0, -101)

    // Set TTL on history (24 hours)
    await this.redis.expire(historyKey, 24 * 60 * 60)
  }

  async getMessageHistory(channel: string, count = 10): Promise<Array<{
    message: Message
    storedAt: Date
  }>> {
    const historyKey = `${this.getChannelKey(channel)}:history`

    const results = await this.redis.zrevrange(historyKey, 0, count - 1)

    return results.map((data) => {
      try {
        const { message, storedAt } = JSON.parse(data)
        return {
          message,
          storedAt: new Date(storedAt),
        }
      }
      catch (error) {
        console.error('Failed to parse message history:', error)
        return null
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null)
  }

  private updateMetrics(): void {
    this.metrics.channels = this.subscriptions.size + this.patternSubscriptions.size
    this.metrics.subscribers = Array.from(this.subscriptions.values())
      .reduce((sum, handlers) => sum + handlers.size, 0)
      + Array.from(this.patternSubscriptions.values())
        .reduce((sum, handlers) => sum + handlers.size, 0)
  }

  private getHandlerConcurrency(handler: MessageHandler): number {
    const key = `handler:${handler.toString()}`
    const data = this.rateLimiters.get(key)
    return data ? data.count : 0
  }

  private incrementHandlerConcurrency(handler: MessageHandler): void {
    const key = `handler:${handler.toString()}`
    const data = this.rateLimiters.get(key) || { count: 0, resetTime: Date.now() + 1000 }
    data.count++
    this.rateLimiters.set(key, data)

    // Clean up old entries
    if (this.rateLimiters.size > 1000) {
      this.cleanupRateLimiters()
    }
  }

  private decrementHandlerConcurrency(handler: MessageHandler): void {
    const key = `handler:${handler.toString()}`
    const data = this.rateLimiters.get(key)
    if (data) {
      data.count = Math.max(0, data.count - 1)
      if (data.count === 0) {
        this.rateLimiters.delete(key)
      }
    }
  }

  private cleanupRateLimiters(): void {
    const now = Date.now()
    for (const [key, data] of this.rateLimiters.entries()) {
      if (data.resetTime < now && data.count === 0) {
        this.rateLimiters.delete(key)
      }
    }
  }

  getMetrics(): PubSubMetrics {
    return { ...this.metrics }
  }

  async clearChannel(channel: string): Promise<void> {
    const channelKey = this.getChannelKey(channel)
    const historyKey = `${channelKey}:history`

    // Clear history
    await this.redis.del(historyKey)

    // Clear subscription count
    this.messageCounters.delete(channel)
  }

  async getChannelMetrics(channel: string): Promise<{
    messagesPublished: number
    subscribers: number
    historySize: number
  }> {
    const channelKey = this.getChannelKey(channel)
    const historyKey = `${channelKey}:history`

    const [messagesPublished, subscribers, historySize] = await Promise.all([
      this.messageCounters.get(channel) || 0,
      this.getSubscribers(channel),
      this.redis.zcard(historyKey),
    ])

    return {
      messagesPublished,
      subscribers,
      historySize,
    }
  }

  async flushMetrics(): Promise<void> {
    // Reset metrics
    this.metrics = {
      channels: this.metrics.channels,
      subscribers: this.metrics.subscribers,
      messagesPublished: 0,
      messagesReceived: 0,
      messagesFiltered: 0,
      errors: 0,
    }

    // Clear message counters
    this.messageCounters.clear()
  }
}

export function createPubSub(
  redis: Redis,
  config?: {
    keyPrefix?: string
  },
): PubSub {
  return new PubSub(redis, config?.keyPrefix)
}
