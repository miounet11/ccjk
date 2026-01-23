/**
 * CCJK Agents-v2
 * Redis-based distributed agent communication system
 */

// Types
export * from './types.js';

// Core components
export { AgentRegistry, createAgentRegistry } from './registry.js';
export { MessageBus, createMessageBus } from './bus/message-bus.js';
export { MessageRouter, createMessageRouter } from './bus/router.js';
export { MessageQueue, createMessageQueue } from './bus/queue.js';
export { PubSub, createPubSub } from './bus/pubsub.js';

// Default configuration
export const DEFAULT_CONFIG = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
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
};

// Helper function to create a complete agent system
export async function createAgentSystem(config = DEFAULT_CONFIG) {
  const Redis = (await import('ioredis')).default;

  // Create Redis connection
  const redis = new Redis(config.redis);

  // Create components
  const registry = createAgentRegistry(redis, {
    keyPrefix: config.redis.keyPrefix + 'agents:',
  });

  const messageBus = createMessageBus(config);
  const router = createMessageRouter(redis, {
    keyPrefix: config.redis.keyPrefix + 'router:',
  });
  const queue = createMessageQueue(redis, {
    keyPrefix: config.redis.keyPrefix + 'queue:',
  });
  const pubsub = createPubSub(redis, {
    keyPrefix: config.redis.keyPrefix + 'pubsub:',
  });

  return {
    redis,
    registry,
    messageBus,
    router,
    queue,
    pubsub,
  };
}

// Re-export for convenience
export { Redis } from 'ioredis';