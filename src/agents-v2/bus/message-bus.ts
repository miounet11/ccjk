/**
 * CCJK Agents-v2 Message Bus
 * Redis-based message communication system
 */

import type {
  BroadcastMessage,
  CommunicationMetrics,
  IMessageBus,
  Message,
  MessageAck,
  MessageBusConfig,
  MessageHandler,
  MessageOptions,
  MessagePriority,
  RequestMessage,
  ResponseMessage,
} from '../types.js'
import { Redis } from 'ioredis'
import { v4 as uuidv4 } from 'uuid'
import { MessageTimeoutError } from '../types.js'

export class MessageBus implements IMessageBus {
  private redis: Redis
  private publisher: Redis
  private subscriber: Redis
  private config: MessageBusConfig
  private connected: boolean
  private handlers: Map<string, Set<MessageHandler>>
  private metrics: CommunicationMetrics
  private pendingRequests: Map<string, {
    resolve: (value: ResponseMessage) => void
    reject: (error: Error) => void
    timeout: NodeJS.Timeout
  }>

  private metricsInterval?: NodeJS.Timeout

  constructor(config: MessageBusConfig) {
    this.config = config
    this.connected = false
    this.handlers = new Map()
    this.pendingRequests = new Map()
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesFailed: 0,
      avgLatency: 0,
      avgResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      queueDepth: 0,
    }

    // Create Redis connections
    this.redis = this.createRedisClient()
    this.publisher = this.createRedisClient()
    this.subscriber = this.createRedisClient()
  }

  private createRedisClient(): Redis {
    const { redis } = this.config
    const client = new Redis({
      host: redis.host,
      port: redis.port,
      password: redis.password,
      db: redis.db,
      maxRetriesPerRequest: redis.maxRetriesPerRequest,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      enableReadyCheck: redis.enableReadyCheck,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    })

    client.on('error', (error) => {
      console.error('Redis client error:', error)
      this.metrics.messagesFailed++
    })

    client.on('connect', () => {
      console.info('Redis client connected')
    })

    client.on('disconnect', () => {
      console.warn('Redis client disconnected')
    })

    return client
  }

  private getChannel(pattern: string): string {
    return `${this.config.redis.keyPrefix}channel:${pattern}`
  }

  private getResponseQueue(agentId: string): string {
    return `${this.config.redis.keyPrefix}response:${agentId}`
  }

  private getAgentQueue(agentId: string): string {
    return `${this.config.redis.keyPrefix}queue:${agentId}`
  }

  private getPriorityScore(priority: MessagePriority): number {
    const scores = {
      urgent: 1000,
      high: 750,
      normal: 500,
      low: 250,
    }
    return scores[priority] || 500
  }

  async connect(): Promise<void> {
    if (this.connected)
      return

    try {
      await Promise.all([
        this.redis.connect(),
        this.publisher.connect(),
        this.subscriber.connect(),
      ])

      // Set up subscription handling
      this.subscriber.on('message', (channel, message) => {
        this.handleMessage(channel, message).catch((error) => {
          console.error('Error handling message:', error)
        })
      })

      this.connected = true

      // Start metrics collection if enabled
      if (this.config.monitoring.enabled) {
        this.startMetricsCollection()
      }

      console.info('Message bus connected successfully')
    }
    catch (error) {
      console.error('Failed to connect message bus:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected)
      return

    try {
      // Clear all pending requests
      for (const { reject, timeout } of Array.from(this.pendingRequests.values())) {
        clearTimeout(timeout)
        reject(new Error('Message bus disconnected'))
      }
      this.pendingRequests.clear()

      // Stop metrics collection
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval)
      }

      await Promise.all([
        this.redis.quit(),
        this.publisher.quit(),
        this.subscriber.quit(),
      ])

      this.connected = false
      console.info('Message bus disconnected')
    }
    catch (error) {
      console.error('Error disconnecting message bus:', error)
      throw error
    }
  }

  async send(message: Message): Promise<void> {
    if (!this.connected) {
      throw new Error('Message bus not connected')
    }

    try {
      const messageData = JSON.stringify(message)

      if (message.to) {
        // Direct message to specific agent
        await this.enqueueMessage(message.to, message)
      }
      else if (message.type === 'broadcast') {
        // Broadcast message
        const channel = this.getChannel((message as BroadcastMessage).topic)
        await this.publisher.publish(channel, messageData)
      }

      this.metrics.messagesSent++
    }
    catch (error) {
      this.metrics.messagesFailed++
      throw error
    }
  }

  async sendAndWait(
    request: RequestMessage,
    options: MessageOptions = {},
  ): Promise<ResponseMessage> {
    if (!this.connected) {
      throw new Error('Message bus not connected')
    }

    const correlationId = options.correlationId || uuidv4()
    request.correlationId = correlationId
    request.timestamp = new Date().toISOString()

    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 30000 // Default 30s
      const timer = setTimeout(() => {
        this.pendingRequests.delete(correlationId)
        reject(new MessageTimeoutError(request.id, timeout))
      }, timeout)

      this.pendingRequests.set(correlationId, {
        resolve,
        reject,
        timeout: timer,
      })

      // Send the request
      this.send(request).catch((error) => {
        clearTimeout(timer)
        this.pendingRequests.delete(correlationId)
        reject(error)
      })

      // Subscribe to response queue
      this.subscribeToResponses()
    })
  }

  async broadcast(message: BroadcastMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('Message bus not connected')
    }

    try {
      const channel = this.getChannel(message.topic)
      const messageData = JSON.stringify(message)

      await this.publisher.publish(channel, messageData)
      this.metrics.messagesSent++
    }
    catch (error) {
      this.metrics.messagesFailed++
      throw error
    }
  }

  async subscribe(pattern: string, handler: MessageHandler): Promise<void> {
    if (!this.connected) {
      throw new Error('Message bus not connected')
    }

    const channel = this.getChannel(pattern)

    // Add handler
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set())
      await this.subscriber.subscribe(channel)
    }

    this.handlers.get(channel)!.add(handler)
  }

  async unsubscribe(pattern: string): Promise<void> {
    const channel = this.getChannel(pattern)

    if (this.handlers.has(channel)) {
      this.handlers.delete(channel)
      await this.subscriber.unsubscribe(channel)
    }
  }

  getMetrics(): CommunicationMetrics {
    return { ...this.metrics }
  }

  async flush(): Promise<void> {
    // Flush any buffered messages
    // This is typically handled by Redis automatically
  }

  private async enqueueMessage(agentId: string, message: Message): Promise<void> {
    const queue = this.getAgentQueue(agentId)
    const messageData = JSON.stringify(message)
    const score = this.getPriorityScore(message.priority)

    await this.redis.zadd(queue, score, messageData)

    // Trim queue if it exceeds max size
    const count = await this.redis.zcard(queue)
    if (count > this.config.performance.maxQueueSize) {
      const removeCount = count - this.config.performance.maxQueueSize
      await this.redis.zremrangebyrank(queue, 0, removeCount - 1)
    }

    this.metrics.queueDepth = await this.redis.zcard(queue)
  }

  private async dequeueMessage(agentId: string): Promise<Message | null> {
    const queue = this.getAgentQueue(agentId)
    const result = await this.redis.zpopmax(queue)

    if (!result || result.length === 0) {
      return null
    }

    const [messageData] = result
    try {
      return JSON.parse(messageData) as Message
    }
    catch (error) {
      console.error('Failed to parse message:', error)
      return null
    }
  }

  private subscribeToResponses(): void {
    const responsePattern = `${this.config.redis.keyPrefix}response:*`

    this.subscriber.psubscribe(responsePattern, (error) => {
      if (error) {
        console.error('Failed to subscribe to responses:', error)
      }
    })

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.handleResponse(channel, message).catch((error) => {
        console.error('Error handling response:', error)
      })
    })
  }

  private async handleMessage(channel: string, messageData: string): Promise<void> {
    try {
      const message: Message = JSON.parse(messageData)
      const handlers = this.handlers.get(channel)

      if (handlers) {
        for (const handler of Array.from(handlers)) {
          await handler(message)
        }
      }

      this.metrics.messagesReceived++
    }
    catch (error) {
      console.error('Error processing message:', error)
      this.metrics.messagesFailed++
    }
  }

  private async handleResponse(channel: string, messageData: string): Promise<void> {
    try {
      const response: ResponseMessage = JSON.parse(messageData)

      if (response.correlationId && this.pendingRequests.has(response.correlationId)) {
        const { resolve, timeout } = this.pendingRequests.get(response.correlationId)!
        clearTimeout(timeout)
        this.pendingRequests.delete(response.correlationId)
        resolve(response)
      }

      this.metrics.messagesReceived++
    }
    catch (error) {
      console.error('Error handling response:', error)
      this.metrics.messagesFailed++
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics()
    }, this.config.monitoring.metricsInterval)
  }

  private async collectMetrics(): Promise<void> {
    // Calculate queue depths
    const keys = await this.redis.keys(`${this.config.redis.keyPrefix}queue:*`)
    let totalQueueDepth = 0

    for (const key of keys) {
      const size = await this.redis.zcard(key)
      totalQueueDepth += size
    }

    this.metrics.queueDepth = totalQueueDepth

    // Calculate throughput (messages per second)
    const _now = Date.now()
    // This would need historical tracking for accurate throughput

    // Calculate error rate
    const total = this.metrics.messagesSent + this.metrics.messagesReceived
    this.metrics.errorRate = total > 0 ? this.metrics.messagesFailed / total : 0
  }

  async acknowledge(messageId: string, status: MessageAck['status']): Promise<void> {
    // Implement message acknowledgment
    // This could publish to an ACK channel or update Redis keys
    const ackMessage: MessageAck = {
      messageId,
      status,
      timestamp: new Date().toISOString(),
    }
    await this.redis.set(`${this.config.redis.keyPrefix}ack:${messageId}`, JSON.stringify(ackMessage), 'EX', 3600)
  }
}

export function createMessageBus(config: MessageBusConfig): MessageBus {
  return new MessageBus(config)
}
