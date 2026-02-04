/**
 * CCJK Agents-v2
 * Redis-based distributed agent communication system
 */

export { createMessageBus, MessageBus } from './bus/message-bus.js'

export { createPubSub, PubSub } from './bus/pubsub.js'
export { createMessageQueue, MessageQueue } from './bus/queue.js'
export { createMessageRouter, MessageRouter } from './bus/router.js'
// Core components
export { AgentRegistry, createAgentRegistry } from './registry.js'
// Types
export * from './types.js'

// Default configuration
export const DEFAULT_CONFIG = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number.parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: Number.parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'ccjk:',
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxmemoryPolicy: 'allkeys-lru',
    lazyfreeLazyEviction: true,
  },
  pool: {
    min: 5,
    max: 50,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
  performance: {
    maxQueueSize: 10000,
    flushInterval: 1000,
    batchSize: 100,
    compressionThreshold: 1024,
  },
  monitoring: {
    enabled: true,
    metricsInterval: 5000,
    slowQueryThreshold: 100,
  },
}

// Helper function to create a complete agent system
export async function createAgentSystem(config = DEFAULT_CONFIG) {
  const Redis = (await import('ioredis')).default
  const { createAgentRegistry: createRegistry } = await import('./registry.js')
  const { createMessageBus: createBus } = await import('./bus/message-bus.js')
  const { createMessageRouter: createRouter } = await import('./bus/router.js')
  const { createMessageQueue: createQueue } = await import('./bus/queue.js')
  const { createPubSub: createPub } = await import('./bus/pubsub.js')

  // Create Redis connection
  const redis = new Redis(config.redis)

  // Create components
  const registry = createRegistry(redis, {
    keyPrefix: `${config.redis.keyPrefix}agents:`,
  })

  const messageBus = createBus(config)
  const router = createRouter(redis, {
    keyPrefix: `${config.redis.keyPrefix}router:`,
  })
  const queue = createQueue(redis, {
    keyPrefix: `${config.redis.keyPrefix}queue:`,
  })
  const pubsub = createPub(redis, {
    keyPrefix: `${config.redis.keyPrefix}pubsub:`,
  })

  return {
    redis,
    registry,
    messageBus,
    router,
    queue,
    pubsub,
  }
}

// Re-export for convenience
export type { Redis } from 'ioredis'
