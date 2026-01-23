/**
 * CCJK Agents-v2 Types
 * Redis-based distributed agent communication system
 */

export interface Agent {
  id: string;
  name: string;
  type: 'worker' | 'coordinator' | 'specialist' | 'monitor';
  status: 'active' | 'idle' | 'busy' | 'offline' | 'error';
  metadata: {
    version: string;
    platform: string;
    capabilities: string[];
    tags: string[];
    lastSeen: string;
  };
  expertise: AgentExpertise;
}

export interface AgentExpertise {
  agentId: string;
  domains: string[]; // web, cli, testing, etc.
  capabilities: string[]; // code_generation, debugging, etc.
  performanceMetrics: {
    avgResponseTime: number; // milliseconds
    successRate: number; // 0-1
    totalRequests: number;
    totalErrors: number;
  };
}

export interface Message {
  id: string;
  type: 'request' | 'response' | 'broadcast' | 'event';
  from: string;
  to?: string;
  correlationId?: string;
  payload: any;
  priority: MessagePriority;
  timestamp: string;
  ttl?: number; // seconds
  retryCount?: number;
  maxRetries?: number;
}

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface MessageHeaders {
  'x-message-id': string;
  'x-correlation-id': string;
  'x-from': string;
  'x-to'?: string;
  'x-timestamp': string;
  'x-priority': MessagePriority;
  'x-retry-count': number;
}

export interface MessageOptions {
  priority?: MessagePriority;
  ttl?: number;
  correlationId?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface RequestMessage extends Message {
  type: 'request';
  method: string;
  params: any;
}

export interface ResponseMessage extends Message {
  type: 'response';
  status: 'success' | 'error' | 'timeout';
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface BroadcastMessage extends Message {
  type: 'broadcast';
  topic: string;
}

export interface EventMessage extends Message {
  type: 'event';
  event: string;
  data: any;
}

export interface MessageAck {
  messageId: string;
  status: 'delivered' | 'processed' | 'failed';
  timestamp: string;
  error?: string;
}

export interface AgentRegistration {
  agent: Agent;
  ttl: number; // registration TTL in seconds
}

export interface AgentDiscoveryOptions {
  domain?: string;
  capability?: string;
  status?: Agent['status'];
  limit?: number;
}

export interface CommunicationMetrics {
  messagesSent: number;
  messagesReceived: number;
  messagesFailed: number;
  avgLatency: number;
  avgResponseTime: number;
  throughput: number;
  errorRate: number;
  queueDepth: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  maxmemoryPolicy: string;
  lazyfreeLazyEviction: boolean;
}

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
}

export interface MessageBusConfig {
  redis: RedisConfig;
  pool: ConnectionPoolConfig;
  performance: {
    maxQueueSize: number;
    flushInterval: number;
    batchSize: number;
    compressionThreshold: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    slowQueryThreshold: number;
  };
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: SkillParameter[];
  handler: (params: any, context: AgentContext) => Promise<any>;
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  default?: any;
  validation?: (value: any) => boolean;
}

export interface AgentContext {
  agentId: string;
  messageBus: IMessageBus;
  logger: Logger;
  metrics: MetricsCollector;
}

export interface Logger {
  debug: (message: string, meta?: any) => void;
  info: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  error: (message: string, error?: Error, meta?: any) => void;
}

export interface MetricsCollector {
  increment: (metric: string, value?: number, tags?: Record<string, string>) => void;
  timing: (metric: string, value: number, tags?: Record<string, string>) => void;
  gauge: (metric: string, value: number, tags?: Record<string, string>) => void;
  histogram: (metric: string, value: number, tags?: Record<string, string>) => void;
}

export interface IMessageBus {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: Message): Promise<void>;
  sendAndWait(request: RequestMessage, options?: MessageOptions): Promise<ResponseMessage>;
  broadcast(message: BroadcastMessage): Promise<void>;
  subscribe(pattern: string, handler: MessageHandler): Promise<void>;
  unsubscribe(pattern: string): Promise<void>;
  getMetrics(): CommunicationMetrics;
  flush(): Promise<void>;
}

export type MessageHandler = (message: Message) => Promise<void>;

export interface IAgentRegistry {
  register(agent: Agent): Promise<void>;
  unregister(agentId: string): Promise<void>;
  get(agentId: string): Promise<Agent | null>;
  list(options?: AgentDiscoveryOptions): Promise<Agent[]>;
  updateStatus(agentId: string, status: Agent['status']): Promise<void>;
  updateMetrics(agentId: string, metrics: Partial<AgentExpertise['performanceMetrics']>): Promise<void>;
  addSkill(agentId: string, skill: AgentSkill): Promise<void>;
  removeSkill(agentId: string, skillId: string): Promise<void>;
  getSkills(agentId: string): Promise<AgentSkill[]>;
  findBySkill(skillId: string): Promise<Agent[]>;
  heartbeat(agentId: string): Promise<void>;
  cleanup(): Promise<void>;
}

export interface IMessageRouter {
  route(message: Message): Promise<string[]>; // returns target agent IDs
  addRoute(pattern: string, target: string): Promise<void>;
  removeRoute(pattern: string): Promise<void>;
  getRoutes(): Promise<Record<string, string[]>>;
}

export interface IMessageQueue {
  enqueue(queue: string, message: Message): Promise<void>;
  dequeue(queue: string): Promise<Message | null>;
  peek(queue: string, count: number): Promise<Message[]>;
  size(queue: string): Promise<number>;
  purge(queue: string): Promise<void>;
  getPriorityQueues(): Promise<string[]>;
}

export interface IPubSub {
  publish(channel: string, message: Message): Promise<void>;
  subscribe(channel: string, handler: MessageHandler): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  getChannels(): Promise<string[]>;
  getSubscribers(channel: string): Promise<number>;
}

export class MessageBusError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MessageBusError';
  }
}

export class AgentNotFoundError extends MessageBusError {
  constructor(agentId: string) {
    super(`Agent ${agentId} not found`, 'AGENT_NOT_FOUND', { agentId });
  }
}

export class MessageTimeoutError extends MessageBusError {
  constructor(messageId: string, timeout: number) {
    super(`Message ${messageId} timed out after ${timeout}ms`, 'MESSAGE_TIMEOUT', { messageId, timeout });
  }
}

export class QueueFullError extends MessageBusError {
  constructor(queue: string, size: number) {
    super(`Queue ${queue} is full (size: ${size})`, 'QUEUE_FULL', { queue, size });
  }
}