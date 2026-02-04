/**
 * Mock Redis implementation for integration testing
 * Provides realistic Redis behavior without external dependencies
 */

import { vi } from 'vitest'

export class MockRedis {
  private data: Map<string, any> = new Map()
  private hashes: Map<string, Map<string, any>> = new Map()
  private pubsub: Map<string, Function[]> = new Map()
  private connected = false
  private messageId = 0

  constructor(private options: any = {}) {}

  /**
   * Connect to Redis
   */
  async connect(): Promise<boolean> {
    this.connected = true
    return true
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<boolean> {
    this.connected = false
    return true
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    if (!this.connected)
      throw new Error('Redis not connected')
    return this.data.get(key) || null
  }

  /**
   * Set key-value pair
   */
  async set(key: string, value: string, options?: any): Promise<string> {
    if (!this.connected)
      throw new Error('Redis not connected')
    this.data.set(key, value)

    if (options?.EX) {
      setTimeout(() => this.data.delete(key), options.EX * 1000)
    }

    return 'OK'
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<number> {
    if (!this.connected)
      throw new Error('Redis not connected')
    return this.data.delete(key) ? 1 : 0
  }

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: any): Promise<number> {
    if (!this.connected)
      throw new Error('Redis not connected')
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map())
    }
    const hash = this.hashes.get(key)!
    const isNew = !hash.has(field)
    hash.set(field, value)
    return isNew ? 1 : 0
  }

  /**
   * Get hash field
   */
  async hget(key: string, field: string): Promise<any> {
    if (!this.connected)
      throw new Error('Redis not connected')
    const hash = this.hashes.get(key)
    return hash ? hash.get(field) : null
  }

  /**
   * Get all hash fields
   */
  async hgetall(key: string): Promise<Record<string, any>> {
    if (!this.connected)
      throw new Error('Redis not connected')
    const hash = this.hashes.get(key)
    if (!hash)
      return {}

    const result: Record<string, any> = {}
    hash.forEach((value, field) => {
      result[field] = value
    })
    return result
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: string): Promise<number> {
    if (!this.connected)
      throw new Error('Redis not connected')
    const subscribers = this.pubsub.get(channel) || []

    // Simulate async message delivery
    setImmediate(() => {
      subscribers.forEach((listener) => {
        listener(channel, message)
      })
    })

    return subscribers.length
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, listener: Function): Promise<string> {
    if (!this.connected)
      throw new Error('Redis not connected')
    if (!this.pubsub.has(channel)) {
      this.pubsub.set(channel, [])
    }
    this.pubsub.get(channel)!.push(listener)
    return `sub-${++this.messageId}`
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel: string, listener?: Function): Promise<boolean> {
    if (!this.connected)
      throw new Error('Redis not connected')
    const subscribers = this.pubsub.get(channel)
    if (!subscribers)
      return false

    if (listener) {
      const index = subscribers.indexOf(listener)
      if (index > -1) {
        subscribers.splice(index, 1)
      }
    }
    else {
      this.pubsub.delete(channel)
    }

    return true
  }

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    if (!this.connected)
      throw new Error('Redis not connected')
    const current = Number.parseInt(this.data.get(key) || '0')
    const next = current + 1
    this.data.set(key, next.toString())
    return next
  }

  /**
   * Set key expiration
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.connected)
      throw new Error('Redis not connected')
    setTimeout(() => this.data.delete(key), seconds * 1000)
    return true
  }

  /**
   * Ping Redis
   */
  async ping(): Promise<string> {
    if (!this.connected)
      throw new Error('Redis not connected')
    return 'PONG'
  }

  /**
   * Flush database
   */
  async flushdb(): Promise<string> {
    if (!this.connected)
      throw new Error('Redis not connected')
    this.data.clear()
    this.hashes.clear()
    this.pubsub.clear()
    return 'OK'
  }

  /**
   * Get Redis info
   */
  async info(): Promise<string> {
    return `redis_version:7.0.0
connected_clients:1
used_memory:1024
role:master
`
  }

  /**
   * Create event emitter interface
   */
  on(event: string, handler: Function): void {
    // Mock implementation
  }

  /**
   * Emit event
   */
  emit(event: string, ...args: any[]): void {
    // Mock implementation
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Get all keys
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.connected)
      throw new Error('Redis not connected')
    const regex = new RegExp(pattern.replace('*', '.*'))
    return Array.from(this.data.keys()).filter(key => regex.test(key))
  }

  /**
   * Get memory usage
   */
  async memoryUsage(key: string): Promise<number> {
    if (!this.connected)
      throw new Error('Redis not connected')
    const value = this.data.get(key)
    if (!value)
      return 0
    return Buffer.byteLength(value, 'utf8')
  }

  /**
   * Create queue
   */
  async createQueue(name: string, options: any = {}): Promise<any> {
    const queue = {
      name,
      length: 0,
      push: vi.fn(async (item: any) => {
        queue.length++
        return queue.length
      }),
      pop: vi.fn(async () => {
        if (queue.length > 0) {
          queue.length--
          return { id: 'item-1', data: 'test' }
        }
        return null
      }),
      size: vi.fn(() => queue.length),
      clear: vi.fn(async () => {
        queue.length = 0
      }),
    }

    return queue
  }

  /**
   * Create stream
   */
  async createStream(name: string, options: any = {}): Promise<any> {
    const stream = {
      name,
      add: vi.fn(async (data: any) => {
        return { id: `${Date.now()}-0`, data }
      }),
      read: vi.fn(async () => {
        return []
      }),
      length: vi.fn(() => 0),
    }

    return stream
  }
}

/**
 * Create mock Redis instance
 */
export function createMockRedis(options: any = {}): MockRedis {
  return new MockRedis(options)
}

/**
 * Create Redis cluster mock
 */
export function createMockRedisCluster(nodes: any[]): any {
  const cluster = {
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(true),
    nodes: nodes.map(() => createMockRedis()),
    getNodeByKey: vi.fn((key: string) => createMockRedis()),
    failover: vi.fn().mockResolvedValue(true),
  }

  return cluster
}

/**
 * Create Redis sentinel mock
 */
export function createMockRedisSentinel(sentinels: any[]): any {
  const sentinel = {
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(true),
    getMaster: vi.fn().mockResolvedValue(createMockRedis()),
    getSlaves: vi.fn().mockResolvedValue([createMockRedis()]),
    failover: vi.fn().mockResolvedValue(true),
  }

  return sentinel
}
