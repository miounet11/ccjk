/**
 * CCJK Agents-v2 Message Router
 * Routes messages between agents based on patterns and rules
 */

import Redis from 'ioredis';
import type {
  Message,
  IMessageRouter,
  Agent,
} from '../types.js';

export interface RouteRule {
  pattern: string;
  target: string | string[];
  priority: number;
  condition?: (message: Message) => boolean;
  metadata?: Record<string, any>;
}

export class MessageRouter implements IMessageRouter {
  private redis: Redis;
  private keyPrefix: string;
  private routes: Map<string, RouteRule[]>;
  private cache: Map<string, string[]>;
  private cacheTimeout: number;
  private lastCacheUpdate: number;

  constructor(redis: Redis, keyPrefix = 'ccjk:router:', cacheTimeout = 5000) {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
    this.routes = new Map();
    this.cache = new Map();
    this.cacheTimeout = cacheTimeout;
    this.lastCacheUpdate = 0;
  }

  private getRouteKey(pattern: string): string {
    return `${this.keyPrefix}route:${pattern}`;
  }

  private getTargetsKey(pattern: string): string {
    return `${this.keyPrefix}targets:${pattern}`;
  }

  async route(message: Message): Promise<string[]> {
    // Check cache first
    if (Date.now() - this.lastCacheUpdate > this.cacheTimeout) {
      await this.refreshCache();
    }

    const targets: string[] = [];

    // If message has a specific recipient, use it
    if (message.to) {
      return [message.to];
    }

    // Find matching routes
    for (const [pattern, rule] of this.routes.entries()) {
      if (this.matchesPattern(message, pattern)) {
        const routeTargets = this.cache.get(pattern);
        if (routeTargets) {
          targets.push(...routeTargets);
        }
      }
    }

    // Remove duplicates
    return [...new Set(targets)];
  }

  async addRoute(pattern: string, target: string | string[]): Promise<void> {
    const targetsKey = this.getTargetsKey(pattern);
    const targets = Array.isArray(target) ? target : [target];

    // Store in Redis
    await this.redis.sadd(targetsKey, ...targets);

    // Add to local routes
    if (!this.routes.has(pattern)) {
      this.routes.set(pattern, [{
        pattern,
        target: targets,
        priority: 0,
      }]);
    }

    // Update cache
    await this.refreshCache();
  }

  async removeRoute(pattern: string): Promise<void> {
    const targetsKey = this.getTargetsKey(pattern);

    // Remove from Redis
    await this.redis.del(targetsKey);

    // Remove from local routes
    this.routes.delete(pattern);

    // Update cache
    await this.refreshCache();
  }

  async getRoutes(): Promise<Record<string, string[]>> {
    await this.refreshCache();

    const result: Record<string, string[]> = {};
    for (const [pattern, targets] of this.cache.entries()) {
      result[pattern] = targets;
    }

    return result;
  }

  private matchesPattern(message: Message, pattern: string): boolean {
    // Simple pattern matching
    // Can be extended with regex, wildcards, etc.

    // Match by message type
    if (pattern.startsWith('type:')) {
      const type = pattern.substring(5);
      return message.type === type;
    }

    // Match by priority
    if (pattern.startsWith('priority:')) {
      const priority = pattern.substring(9);
      return message.priority === priority;
    }

    // Match by topic (for broadcast messages)
    if (pattern.startsWith('topic:')) {
      const topic = pattern.substring(6);
      return (message as any).topic === topic;
    }

    // Match by domain (custom message field)
    if (pattern.startsWith('domain:')) {
      const domain = pattern.substring(7);
      return message.payload?.domain === domain;
    }

    // Wildcard matching
    if (pattern === '*') {
      return true;
    }

    return false;
  }

  private async refreshCache(): Promise<void> {
    const keys = await this.redis.keys(`${this.keyPrefix}targets:*`);
    this.cache.clear();

    for (const key of keys) {
      const pattern = key.substring(this.getTargetsKey('').length);
      const members = await this.redis.smembers(key);
      this.cache.set(pattern, members);
    }

    this.lastCacheUpdate = Date.now();
  }

  async addConditionalRoute(
    pattern: string,
    target: string | string[],
    condition: (message: Message) => boolean,
    priority = 0
  ): Promise<void> {
    const targetsKey = this.getTargetsKey(pattern);
    const targets = Array.isArray(target) ? target : [target];

    // Store in Redis
    await this.redis.sadd(targetsKey, ...targets);

    // Add route metadata
    const metadataKey = this.getRouteKey(pattern);
    await this.redis.hset(metadataKey, 'priority', priority.toString());

    // Add to local routes with condition
    this.routes.set(pattern, [{
      pattern,
      target: targets,
      priority,
      condition,
      metadata: { conditional: true },
    }]);

    // Update cache
    await this.refreshCache();
  }

  async getRouteInfo(pattern: string): Promise<RouteRule | null> {
    const rules = this.routes.get(pattern);
    if (!rules || rules.length === 0) {
      return null;
    }

    return rules[0];
  }

  async getAllRoutePatterns(): Promise<string[]> {
    const keys = await this.redis.keys(`${this.keyPrefix}targets:*`);
    return keys.map(key => key.substring(this.getTargetsKey('').length));
  }

  async clearRoutes(): Promise<void> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    this.routes.clear();
    this.cache.clear();
  }

  async optimizeRoutes(): Promise<void> {
    // Remove duplicate targets
    const patterns = await this.getAllRoutePatterns();

    for (const pattern of patterns) {
      const targets = await this.redis.smembers(this.getTargetsKey(pattern));
      const uniqueTargets = [...new Set(targets)];

      if (uniqueTargets.length !== targets.length) {
        await this.redis.del(this.getTargetsKey(pattern));
        await this.redis.sadd(this.getTargetsKey(pattern), ...uniqueTargets);
      }
    }

    await this.refreshCache();
  }

  async getRouteStatistics(): Promise<{
    totalRoutes: number;
    totalTargets: number;
    averageTargetsPerRoute: number;
  }> {
    const patterns = await this.getAllRoutePatterns();
    let totalTargets = 0;

    for (const pattern of patterns) {
      const targets = await this.redis.smembers(this.getTargetsKey(pattern));
      totalTargets += targets.length;
    }

    return {
      totalRoutes: patterns.length,
      totalTargets,
      averageTargetsPerRoute: patterns.length > 0 ? totalTargets / patterns.length : 0,
    };
  }
}

export function createMessageRouter(
  redis: Redis,
  config?: {
    keyPrefix?: string;
    cacheTimeout?: number;
  }
): MessageRouter {
  return new MessageRouter(
    redis,
    config?.keyPrefix,
    config?.cacheTimeout
  );
}