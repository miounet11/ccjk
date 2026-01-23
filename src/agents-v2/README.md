# CCJK Agents-v2

A high-performance Redis-based distributed agent communication system for CCJK 2.0.

## Features

- **Redis-based Architecture**: Built on Redis for high performance and reliability
- **Message Bus**: Unified message routing with request-response, broadcast, and pub-sub patterns
- **Priority Queues**: Message prioritization with urgent, high, normal, and low priorities
- **Agent Registry**: Dynamic agent discovery and registration with skill-based routing
- **Performance Optimized**: Sub-100ms P95 latency, 1000+ msg/s throughput, 10,000+ concurrent connections
- **Connection Pooling**: Efficient Redis connection management with automatic reconnection
- **Monitoring**: Built-in metrics collection and performance monitoring
- **TypeScript**: Full TypeScript support with comprehensive type definitions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent System                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Agent A   │    │   Agent B   │    │   Agent C   │    │
│  │ (Worker)    │    │ (Specialist)│    │ (Coordinator)│    │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    │
│         │                  │                  │            │
│  ╔══════▼══════════════════▼══════════════════▼══════╗    │
│  ║            Message Bus (Redis)                    ║    │
│  ╠═══════════════════════════════════════════════════╣    │
│  ║  • Message Router  • Priority Queue               ║    │
│  ║  • Pub/Sub System  • Agent Registry               ║    │
│  ║  • Connection Pool • Metrics                      ║    │
│  ╚═══════════════════════════════════════════════════╝    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Installation

```bash
npm install ioredis uuid
```

### Basic Usage

```typescript
import { createAgentSystem } from './index.js';

// Create the agent system
const system = await createAgentSystem();
const { redis, registry, messageBus } = system;

// Connect to message bus
await messageBus.connect();

// Register an agent
const agent = {
  id: 'agent-001',
  name: 'Code Analysis Agent',
  type: 'worker',
  status: 'active',
  metadata: {
    version: '1.0.0',
    platform: 'node',
    capabilities: ['code_analysis'],
    tags: ['developer-tools'],
    lastSeen: new Date().toISOString(),
  },
  expertise: {
    agentId: 'agent-001',
    domains: ['software-development'],
    capabilities: ['code_analysis', 'bug_detection'],
    performanceMetrics: {
      avgResponseTime: 150,
      successRate: 0.98,
      totalRequests: 0,
      totalErrors: 0,
    },
  },
};

await registry.register(agent);

// Send a request
const request = {
  id: 'req-001',
  type: 'request',
  from: 'client-001',
  to: 'agent-001',
  method: 'analyze',
  params: { code: 'console.log("Hello")' },
  priority: 'normal',
  timestamp: new Date().toISOString(),
};

const response = await messageBus.sendAndWait(request);
console.log('Response:', response);

// Cleanup
await messageBus.disconnect();
await redis.quit();
```

## Configuration

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  redis: {
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0,
    keyPrefix: 'ccjk:',
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
```

### Environment Variables

- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password
- `REDIS_DB`: Redis database number (default: 0)
- `REDIS_KEY_PREFIX`: Key prefix for Redis keys (default: ccjk:)

## API Reference

### Agent Registry

```typescript
const registry = createAgentRegistry(redis, { keyPrefix: 'agents:' });

// Register an agent
await registry.register(agent);

// Get agent by ID
const agent = await registry.get('agent-001');

// List agents with filters
const workers = await registry.list({
  domain: 'software-development',
  capability: 'code_analysis',
  status: 'active',
  limit: 10,
});

// Update agent status
await registry.updateStatus('agent-001', 'busy');

// Add skill to agent
await registry.addSkill('agent-001', skill);

// Find agents by skill
const agents = await registry.findBySkill('analyze-code');
```

### Message Bus

```typescript
const messageBus = createMessageBus(config);

// Connect
await messageBus.connect();

// Send direct message
await messageBus.send(message);

// Send request and wait for response
const response = await messageBus.sendAndWait(request, { timeout: 5000 });

// Broadcast message
await messageBus.broadcast(broadcastMessage);

// Subscribe to messages
await messageBus.subscribe('pattern', handler);

// Get metrics
const metrics = await messageBus.getMetrics();
```

### Priority Queue

```typescript
const queue = createMessageQueue(redis, { keyPrefix: 'queue:' });

// Enqueue message
await queue.enqueue('my-queue', message);

// Dequeue message (highest priority first)
const message = await queue.dequeue('my-queue');

// Peek at messages without removing
const messages = await queue.peek('my-queue', 10);

// Get queue statistics
const stats = await queue.getStats('my-queue');

// Remove expired messages
const removed = await queue.removeExpiredMessages('my-queue');

// Retry from dead letter queue
const retried = await queue.retryFromDeadLetter('my-queue');
```

### PubSub

```typescript
const pubsub = createPubSub(redis, { keyPrefix: 'pubsub:' });

// Publish message
await pubsub.publish('channel-name', message);

// Subscribe to channel
await pubsub.subscribe('channel-name', handler);

// Subscribe to pattern
await pubsub.subscribePattern('channel:*', handler);

// Get message history
const history = await pubsub.getMessageHistory('channel-name', 10);

// Get channel metrics
const metrics = await pubsub.getChannelMetrics('channel-name');
```

## Message Types

### Request Message
```typescript
interface RequestMessage {
  id: string;
  type: 'request';
  from: string;
  to: string;
  method: string;
  params: any;
  correlationId?: string;
  payload: any;
  priority: MessagePriority;
  timestamp: string;
}
```

### Response Message
```typescript
interface ResponseMessage {
  id: string;
  type: 'response';
  from: string;
  to?: string;
  correlationId?: string;
  status: 'success' | 'error' | 'timeout';
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  priority: MessagePriority;
  timestamp: string;
}
```

### Broadcast Message
```typescript
interface BroadcastMessage {
  id: string;
  type: 'broadcast';
  from: string;
  topic: string;
  payload: any;
  priority: MessagePriority;
  timestamp: string;
}
```

## Performance

The system is designed for high-performance distributed communication:

- **Latency**: <100ms P95
- **Throughput**: 1000+ messages/second
- **Concurrency**: 10,000+ simultaneous connections
- **Queue Capacity**: 10,000 messages per queue
- **Connection Pool**: 5-50 connections with automatic scaling

## Error Handling

The system includes comprehensive error handling:

```typescript
try {
  await messageBus.sendAndWait(request);
} catch (error) {
  if (error instanceof MessageTimeoutError) {
    console.log('Request timed out');
  } else if (error instanceof AgentNotFoundError) {
    console.log('Agent not found');
  } else {
    console.log('Message bus error:', error.message);
  }
}
```

## Monitoring

Built-in metrics collection:

```typescript
// Get message bus metrics
const metrics = await messageBus.getMetrics();
console.log('Messages sent:', metrics.messagesSent);
console.log('Messages received:', metrics.messagesReceived);
console.log('Error rate:', metrics.errorRate);
console.log('Queue depth:', metrics.queueDepth);
```

## Examples

See `example.ts` for comprehensive usage examples including:
- Setting up the agent system
- Request-response communication
- Broadcast messaging
- Priority queues
- Message routing
- Metrics and monitoring

## License

This is part of the CCJK project and follows the same licensing terms. See the main project for details.