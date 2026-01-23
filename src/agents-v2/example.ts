/**
 * CCJK Agents-v2 Usage Example
 * Demonstrates how to use the distributed agent communication system
 */

import {
  createAgentSystem,
  DEFAULT_CONFIG,
  type Agent,
  type AgentSkill,
  type RequestMessage,
  type ResponseMessage,
  type BroadcastMessage,
} from './index.js';

// Example 1: Setting up the agent system
async function example1_Setup() {
  console.log('=== Example 1: Setting up Agent System ===\n');

  // Create the agent system with default configuration
  const system = await createAgentSystem();
  const { redis, registry, messageBus, router, queue, pubsub } = system;

  try {
    // Connect to Redis
    await messageBus.connect();
    console.log('✓ Connected to message bus');

    // Define an agent
    const agent: Agent = {
      id: 'agent-001',
      name: 'Code Analysis Agent',
      type: 'worker',
      status: 'active',
      metadata: {
        version: '1.0.0',
        platform: 'node',
        capabilities: ['code_analysis', 'bug_detection'],
        tags: ['developer-tools', 'analysis'],
        lastSeen: new Date().toISOString(),
      },
      expertise: {
        agentId: 'agent-001',
        domains: ['software-development', 'testing'],
        capabilities: ['code_analysis', 'bug_detection', 'refactoring'],
        performanceMetrics: {
          avgResponseTime: 150,
          successRate: 0.98,
          totalRequests: 0,
          totalErrors: 0,
        },
      },
    };

    // Register the agent
    await registry.register(agent);
    console.log('✓ Registered agent:', agent.name);

    // Define a skill
    const skill: AgentSkill = {
      id: 'analyze-code',
      name: 'Analyze Code',
      description: 'Analyzes code quality and detects potential bugs',
      category: 'code_analysis',
      parameters: [
        {
          name: 'code',
          type: 'string',
          required: true,
        },
        {
          name: 'language',
          type: 'string',
          required: false,
          default: 'typescript',
        },
      ],
      handler: async (params, context) => {
        const { code, language } = params;
        // Simulate code analysis
        return {
          issues: [],
          complexity: 'low',
          suggestions: ['Consider adding type annotations'],
        };
      },
    };

    // Add skill to agent
    await registry.addSkill(agent.id, skill);
    console.log('✓ Added skill:', skill.name);

    // List agents
    const agents = await registry.list();
    console.log(`✓ Total agents: ${agents.length}`);

    // Get agent skills
    const skills = await registry.getSkills(agent.id);
    console.log(`✓ Agent has ${skills.length} skills`);

  } finally {
    // Cleanup
    await messageBus.disconnect();
    await redis.quit();
    console.log('✓ Disconnected and cleaned up');
  }
}

// Example 2: Request-Response Communication
async function example2_RequestResponse() {
  console.log('\n=== Example 2: Request-Response Communication ===\n');

  const system = await createAgentSystem();
  const { redis, registry, messageBus } = system;

  try {
    await messageBus.connect();

    // Register a service agent
    const serviceAgent: Agent = {
      id: 'service-001',
      name: 'Calculation Service',
      type: 'specialist',
      status: 'active',
      metadata: {
        version: '1.0.0',
        platform: 'node',
        capabilities: ['math', 'calculations'],
        tags: ['service'],
        lastSeen: new Date().toISOString(),
      },
      expertise: {
        agentId: 'service-001',
        domains: ['mathematics'],
        capabilities: ['calculations', 'statistics'],
        performanceMetrics: {
          avgResponseTime: 50,
          successRate: 1.0,
          totalRequests: 0,
          totalErrors: 0,
        },
      },
    };

    await registry.register(serviceAgent);

    // Subscribe to the service agent's queue
    await messageBus.subscribe('service-001', async (message) => {
      console.log('Service received message:', message.type);

      if (message.type === 'request') {
        const request = message as RequestMessage;

        // Process the request
        const result = {
          operation: request.method,
          params: request.params,
          result: eval(`${request.params.a} ${request.method} ${request.params.b}`), // Simple eval for demo
        };

        // Send response
        const response: ResponseMessage = {
          id: `response-${Date.now()}`,
          type: 'response',
          from: 'service-001',
          to: request.from,
          correlationId: request.correlationId,
          payload: result,
          priority: 'normal',
          timestamp: new Date().toISOString(),
          status: 'success',
        };

        await messageBus.send(response);
      }
    });

    // Create a request
    const request: RequestMessage = {
      id: `request-${Date.now()}`,
      type: 'request',
      from: 'client-001',
      to: 'service-001',
      method: 'add',
      params: { a: 5, b: 3 },
      payload: {},
      priority: 'normal',
      timestamp: new Date().toISOString(),
    };

    // Send request and wait for response
    console.log('Sending request...');
    const response = await messageBus.sendAndWait(request, { timeout: 5000 });

    console.log('✓ Received response:', response.payload);
    console.log('✓ Response time:', Date.now() - new Date(request.timestamp).getTime(), 'ms');

  } finally {
    await messageBus.disconnect();
    await redis.quit();
  }
}

// Example 3: Broadcast Messaging
async function example3_Broadcast() {
  console.log('\n=== Example 3: Broadcast Messaging ===\n');

  const system = await createAgentSystem();
  const { redis, registry, messageBus, pubsub } = system;

  try {
    await messageBus.connect();

    // Register multiple agents
    const agents: Agent[] = [
      {
        id: 'worker-001',
        name: 'Worker 1',
        type: 'worker',
        status: 'active',
        metadata: {
          version: '1.0.0',
          platform: 'node',
          capabilities: ['processing'],
          tags: ['worker'],
          lastSeen: new Date().toISOString(),
        },
        expertise: {
          agentId: 'worker-001',
          domains: ['processing'],
          capabilities: ['processing'],
          performanceMetrics: {
            avgResponseTime: 100,
            successRate: 1.0,
            totalRequests: 0,
            totalErrors: 0,
          },
        },
      },
      {
        id: 'worker-002',
        name: 'Worker 2',
        type: 'worker',
        status: 'active',
        metadata: {
          version: '1.0.0',
          platform: 'node',
          capabilities: ['processing'],
          tags: ['worker'],
          lastSeen: new Date().toISOString(),
        },
        expertise: {
          agentId: 'worker-002',
          domains: ['processing'],
          capabilities: ['processing'],
          performanceMetrics: {
            avgResponseTime: 100,
            successRate: 1.0,
            totalRequests: 0,
            totalErrors: 0,
          },
        },
      },
    ];

    for (const agent of agents) {
      await registry.register(agent);
    }

    // Subscribe workers to broadcast channel
    const receivedMessages: string[] = [];

    for (const agent of agents) {
      await pubsub.subscribe('task-updates', async (message) => {
        console.log(`${agent.name} received broadcast:`, message.payload);
        receivedMessages.push(agent.id);
      });
    }

    // Broadcast a message
    const broadcast: BroadcastMessage = {
      id: `broadcast-${Date.now()}`,
      type: 'broadcast',
      from: 'coordinator-001',
      topic: 'task-updates',
      payload: {
        type: 'system-update',
        message: 'New task available for processing',
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
      timestamp: new Date().toISOString(),
    };

    console.log('Broadcasting message to all workers...');
    await messageBus.broadcast(broadcast);

    // Wait a bit for message delivery
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`✓ Message delivered to ${receivedMessages.length} workers`);

  } finally {
    await messageBus.disconnect();
    await redis.quit();
  }
}

// Example 4: Priority Queue
async function example4_PriorityQueue() {
  console.log('\n=== Example 4: Priority Queue ===\n');

  const system = await createAgentSystem();
  const { redis, queue } = system;

  try {
    // Add messages with different priorities
    const messages = [
      { id: 'msg-1', type: 'task', payload: 'low priority task', priority: 'low' as const, timestamp: new Date().toISOString() },
      { id: 'msg-2', type: 'task', payload: 'urgent task', priority: 'urgent' as const, timestamp: new Date().toISOString() },
      { id: 'msg-3', type: 'task', payload: 'normal task', priority: 'normal' as const, timestamp: new Date().toISOString() },
      { id: 'msg-4', type: 'task', payload: 'high priority task', priority: 'high' as const, timestamp: new Date().toISOString() },
    ];

    console.log('Enqueuing messages with different priorities...');
    for (const message of messages) {
      await queue.enqueue('tasks', message);
      console.log(`  - Enqueued: ${message.payload} (${message.priority})`);
    }

    // Get queue stats
    const stats = await queue.getStats('tasks');
    console.log('\nQueue statistics:');
    console.log(`  Total size: ${stats.size}`);
    console.log(`  Priority distribution:`, stats.priorityDistribution);

    // Peek at top messages
    console.log('\nTop messages (should be urgent first):');
    const topMessages = await queue.peek('tasks', 3);
    for (const msg of topMessages) {
      console.log(`  - ${msg.payload} (${msg.priority})`);
    }

    // Dequeue messages (should come out in priority order)
    console.log('\nDequeuing messages:');
    let message;
    let count = 0;
    while ((message = await queue.dequeue('tasks')) && count < 4) {
      console.log(`  - ${message.payload} (${message.priority})`);
      count++;
    }

    console.log('\n✓ Messages dequeued in priority order');

  } finally {
    await redis.quit();
  }
}

// Example 5: Message Routing
async function example5_Routing() {
  console.log('\n=== Example 5: Message Routing ===\n');

  const system = await createAgentSystem();
  const { redis, router } = system;

  try {
    // Add routing rules
    await router.addRoute('type:request', 'request-handler');
    await router.addRoute('type:response', 'response-handler');
    await router.addRoute('priority:urgent', 'urgent-handler');
    await router.addRoute('topic:alerts', 'alert-handler');

    console.log('✓ Added routing rules');

    // Get all routes
    const routes = await router.getRoutes();
    console.log('\nAll routes:');
    for (const [pattern, targets] of Object.entries(routes)) {
      console.log(`  ${pattern} -> ${targets.join(', ')}`);
    }

    // Get routing statistics
    const stats = await router.getRouteStatistics();
    console.log('\nRouting statistics:');
    console.log(`  Total routes: ${stats.totalRoutes}`);
    console.log(`  Total targets: ${stats.totalTargets}`);
    console.log(`  Average targets per route: ${stats.averageTargetsPerRoute.toFixed(2)}`);

  } finally {
    await redis.quit();
  }
}

// Example 6: Metrics and Monitoring
async function example6_Metrics() {
  console.log('\n=== Example 6: Metrics and Monitoring ===\n');

  const system = await createAgentSystem();
  const { redis, registry, messageBus } = system;

  try {
    await messageBus.connect();

    // Register an agent
    const agent: Agent = {
      id: 'agent-metrics',
      name: 'Metrics Agent',
      type: 'monitor',
      status: 'active',
      metadata: {
        version: '1.0.0',
        platform: 'node',
        capabilities: ['monitoring'],
        tags: ['monitor'],
        lastSeen: new Date().toISOString(),
      },
      expertise: {
        agentId: 'agent-metrics',
        domains: ['monitoring'],
        capabilities: ['monitoring', 'metrics'],
        performanceMetrics: {
          avgResponseTime: 75,
          successRate: 0.99,
          totalRequests: 100,
          totalErrors: 1,
        },
      },
    };

    await registry.register(agent);

    // Update agent metrics
    await registry.updateMetrics(agent.id, {
      avgResponseTime: 82,
      totalRequests: 105,
      successRate: 0.985,
    });

    console.log('✓ Updated agent metrics');

    // Get message bus metrics
    const metrics = await messageBus.getMetrics();
    console.log('\nMessage bus metrics:');
    console.log(`  Messages sent: ${metrics.messagesSent}`);
    console.log(`  Messages received: ${metrics.messagesReceived}`);
    console.log(`  Messages failed: ${metrics.messagesFailed}`);
    console.log(`  Average latency: ${metrics.avgLatency.toFixed(2)}ms`);
    console.log(`  Queue depth: ${metrics.queueDepth}`);

    // Get updated agent info
    const updatedAgent = await registry.get(agent.id);
    if (updatedAgent) {
      console.log('\nAgent performance metrics:');
      console.log(`  Average response time: ${updatedAgent.expertise.performanceMetrics.avgResponseTime}ms`);
      console.log(`  Success rate: ${(updatedAgent.expertise.performanceMetrics.successRate * 100).toFixed(1)}%`);
      console.log(`  Total requests: ${updatedAgent.expertise.performanceMetrics.totalRequests}`);
      console.log(`  Total errors: ${updatedAgent.expertise.performanceMetrics.totalErrors}`);
    }

  } finally {
    await messageBus.disconnect();
    await redis.quit();
  }
}

// Run all examples
async function main() {
  try {
    await example1_Setup();
    await example2_RequestResponse();
    await example3_Broadcast();
    await example4_PriorityQueue();
    await example5_Routing();
    await example6_Metrics();

    console.log('\n=== All examples completed successfully! ===\n');
  } catch (error) {
    console.error('Example failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  example1_Setup,
  example2_RequestResponse,
  example3_Broadcast,
  example4_PriorityQueue,
  example5_Routing,
  example6_Metrics,
};