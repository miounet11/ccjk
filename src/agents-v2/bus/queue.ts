/**
 * CCJK Agents-v2 Message Queue
 * Priority-based message queue using Redis Sorted Sets
 */

import type { IMessageQueue, Message, MessagePriority } from '../types.js'
import type { Redis } from 'ioredis'

export interface QueueStats {
  size: number
  priorityDistribution: Record<MessagePriority, number>
  oldestMessage: Date | null
  newestMessage: Date | null
}

export class MessageQueue implements IMessageQueue {
  private redis: Redis
  private keyPrefix: string
  private defaultQueue: string
  private priorityScores: Record<MessagePriority, number>

  constructor(redis: Redis, keyPrefix = 'ccjk:queue:', defaultQueue = 'default') {
    this.redis = redis
    this.keyPrefix = keyPrefix
    this.defaultQueue = defaultQueue

    // Priority scores (higher = more important)
    this.priorityScores = {
      urgent: 1000,
      high: 750,
      normal: 500,
      low: 250,
    }
  }

  private getQueueKey(queue: string): string {
    return `${this.keyPrefix}${queue}`
  }

  private getPriorityKey(queue: string, priority: MessagePriority): string {
    return `${this.keyPrefix}${queue}:priority:${priority}`
  }

  private getScore(message: Message): number {
    const baseScore = this.priorityScores[message.priority] || 500

    // Add timestamp for FIFO ordering within priority
    const timestamp = new Date(message.timestamp).getTime()

    // Use baseScore * 1e13 + timestamp to maintain priority groups
    // This ensures all urgent messages come before high, etc.
    // while maintaining FIFO within each priority
    return baseScore * 1e13 + timestamp
  }

  async enqueue(queue: string, message: Message): Promise<void> {
    const queueKey = this.getQueueKey(queue)
    const priorityKey = this.getPriorityKey(queue, message.priority)
    const score = this.getScore(message)
    const messageData = JSON.stringify(message)

    // Add to sorted set
    await this.redis.zadd(queueKey, score, messageData)

    // Add to priority index (for statistics)
    await this.redis.pfadd(priorityKey, message.id)

    // Update TTL for message if specified
    if (message.ttl) {
      const expireAt = Math.floor(Date.now() / 1000) + message.ttl
      await this.redis.zadd(`${queueKey}:ttl`, expireAt, message.id)
    }
  }

  async dequeue(queue: string): Promise<Message | null> {
    const queueKey = this.getQueueKey(queue)

    // Remove and return the highest priority message
    const result = await this.redis.zpopmax(queueKey)

    if (!result || result.length === 0) {
      return null
    }

    const [messageData, score] = result

    try {
      const message: Message = JSON.parse(messageData)

      // Note: Priority index uses HyperLogLog (pfadd) which doesn't support removal
      // The count will be approximate and may include dequeued messages

      // Remove from TTL tracking
      await this.redis.zrem(`${queueKey}:ttl`, message.id)

      return message
    }
    catch (error) {
      console.error('Failed to parse message from queue:', error)
      return null
    }
  }

  async peek(queue: string, count = 10): Promise<Message[]> {
    const queueKey = this.getQueueKey(queue)

    // Get top N messages without removing them (highest priority first)
    const results = await this.redis.zrevrange(queueKey, 0, count - 1)

    return results.map((messageData) => {
      try {
        return JSON.parse(messageData) as Message
      }
      catch (error) {
        console.error('Failed to parse message:', error)
        return null
      }
    }).filter((msg): msg is Message => msg !== null)
  }

  async size(queue: string): Promise<number> {
    const queueKey = this.getQueueKey(queue)
    return await this.redis.zcard(queueKey)
  }

  async purge(queue: string): Promise<void> {
    const queueKey = this.getQueueKey(queue)

    // Remove all messages
    await this.redis.del(queueKey)

    // Remove priority indices
    const priorities: MessagePriority[] = ['urgent', 'high', 'normal', 'low']
    for (const priority of priorities) {
      await this.redis.del(this.getPriorityKey(queue, priority))
    }

    // Remove TTL tracking
    await this.redis.del(`${queueKey}:ttl`)
  }

  async getPriorityQueues(): Promise<string[]> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`)

    // Filter out non-queue keys (metadata, TTL tracking, etc.)
    const queues = new Set<string>()

    for (const key of keys) {
      // Extract queue name from key
      const match = key.match(new RegExp(`^${this.keyPrefix}([^:]+)$`))
      if (match && !match[1].includes('priority')) {
        queues.add(match[1])
      }
    }

    return Array.from(queues)
  }

  async getStats(queue: string): Promise<QueueStats> {
    const queueKey = this.getQueueKey(queue)
    const size = await this.size(queue)

    // Get priority distribution
    const priorityDistribution: Record<MessagePriority, number> = {
      urgent: 0,
      high: 0,
      normal: 0,
      low: 0,
    }

    for (const priority of Object.keys(priorityDistribution) as MessagePriority[]) {
      const priorityKey = this.getPriorityKey(queue, priority)
      priorityDistribution[priority] = await this.redis.pfcount(priorityKey)
    }

    // Get oldest and newest messages
    const oldestResult = await this.redis.zrange(queueKey, 0, 0)
    const newestResult = await this.redis.zrange(queueKey, -1, -1)

    let oldestMessage: Date | null = null
    let newestMessage: Date | null = null

    if (oldestResult.length > 0) {
      try {
        const oldest: Message = JSON.parse(oldestResult[0])
        oldestMessage = new Date(oldest.timestamp)
      }
      catch (error) {
        // Ignore parse errors
      }
    }

    if (newestResult.length > 0) {
      try {
        const newest: Message = JSON.parse(newestResult[0])
        newestMessage = new Date(newest.timestamp)
      }
      catch (error) {
        // Ignore parse errors
      }
    }

    return {
      size,
      priorityDistribution,
      oldestMessage,
      newestMessage,
    }
  }

  async removeExpiredMessages(queue: string): Promise<number> {
    const queueKey = this.getQueueKey(queue)
    const ttlKey = `${queueKey}:ttl`
    const now = Math.floor(Date.now() / 1000)

    // Find expired messages
    const expiredMessages = await this.redis.zrangebyscore(ttlKey, 0, now)

    if (expiredMessages.length === 0) {
      return 0
    }

    // Remove expired messages from main queue
    const pipeline = this.redis.pipeline()

    for (const messageId of expiredMessages) {
      // Find and remove the message from the queue
      const messages = await this.redis.zrange(queueKey, 0, -1)

      for (const messageData of messages) {
        try {
          const message: Message = JSON.parse(messageData)
          if (message.id === messageId) {
            pipeline.zrem(queueKey, messageData)

            // Note: Priority index uses HyperLogLog which doesn't support removal

            break
          }
        }
        catch (error) {
          // Ignore parse errors
        }
      }
    }

    // Remove from TTL tracking
    pipeline.zremrangebyscore(ttlKey, 0, now)

    await pipeline.exec()

    return expiredMessages.length
  }

  async requeue(queue: string, message: Message, newPriority?: MessagePriority): Promise<void> {
    if (newPriority) {
      message.priority = newPriority
    }

    // Increment retry count
    message.retryCount = (message.retryCount || 0) + 1

    await this.enqueue(queue, message)
  }

  async moveToDeadLetter(queue: string, message: string, reason: string): Promise<void> {
    const deadLetterQueue = `${this.keyPrefix}dead-letter:${queue}`
    const timestamp = Date.now()
    const deadLetterData = JSON.stringify({
      message,
      reason,
      timestamp,
    })

    await this.redis.zadd(deadLetterQueue, timestamp, deadLetterData)

    // Set TTL for dead letter messages (e.g., 7 days)
    await this.redis.expire(deadLetterQueue, 7 * 24 * 60 * 60)
  }

  async getDeadLetterMessages(queue: string, count = 10): Promise<Array<{
    message: string
    reason: string
    timestamp: Date
  }>> {
    const deadLetterQueue = `${this.keyPrefix}dead-letter:${queue}`

    const results = await this.redis.zrange(deadLetterQueue, -count, -1, 'REV')

    return results.map((data) => {
      try {
        const { message, reason, timestamp } = JSON.parse(data)
        return {
          message,
          reason,
          timestamp: new Date(timestamp),
        }
      }
      catch (error) {
        console.error('Failed to parse dead letter message:', error)
        return null
      }
    }).filter((msg): msg is NonNullable<typeof msg> => msg !== null)
  }

  async retryFromDeadLetter(queue: string): Promise<number> {
    const deadLetterQueue = `${this.keyPrefix}dead-letter:${queue}`
    const deadLetterMessages = await this.getDeadLetterMessages(queue, 100)

    let retriedCount = 0

    for (const { message } of deadLetterMessages) {
      try {
        const parsedMessage: Message = JSON.parse(message)
        await this.enqueue(queue, parsedMessage)

        // Remove from dead letter queue
        await this.redis.zrem(deadLetterQueue, JSON.stringify({ message, reason: '', timestamp: 0 }))

        retriedCount++
      }
      catch (error) {
        console.error('Failed to retry message:', error)
      }
    }

    return retriedCount
  }
}

export function createMessageQueue(
  redis: Redis,
  config?: {
    keyPrefix?: string
    defaultQueue?: string
  },
): MessageQueue {
  return new MessageQueue(
    redis,
    config?.keyPrefix,
    config?.defaultQueue,
  )
}
