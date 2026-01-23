/**
 * Test server for integration testing
 * Provides mock server infrastructure for testing
 */

import { vi } from 'vitest'

export class TestServer {
  private port: number
  private server: any
  private routes: Map<string, Function>

  constructor(port = 0) {
    this.port = port
    this.routes = new Map()
  }

  /**
   * Start test server
   */
  async start(): Promise<number> {
    // Mock implementation
    this.server = {
      listen: vi.fn((port, callback) => callback()),
      close: vi.fn((callback) => callback()),
    }
    return this.port || Math.floor(Math.random() * 10000) + 10000
  }

  /**
   * Stop test server
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.close()
    }
  }

  /**
   * Add route handler
   */
  addRoute(path: string, handler: Function): void {
    this.routes.set(path, handler)
  }

  /**
   * Mock Redis server
   */
  static createMockRedis(): any {
    const mockClient = {
      connect: vi.fn().mockResolvedValue(true),
      disconnect: vi.fn().mockResolvedValue(true),
      publish: vi.fn().mockResolvedValue(1),
      subscribe: vi.fn().mockResolvedValue('subscription-id'),
      unsubscribe: vi.fn().mockResolvedValue(true),
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      hset: vi.fn(),
      hget: vi.fn(),
      hgetall: vi.fn(),
      incr: vi.fn(),
      expire: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
      ping: vi.fn().mockResolvedValue('PONG'),
      flushdb: vi.fn().mockResolvedValue('OK'),
      info: vi.fn().mockResolvedValue('redis_version:7.0.0'),
    }

    return mockClient
  }

  /**
   * Mock HTTP server
   */
  static createMockHttpServer(): any {
    const mockServer = {
      listen: vi.fn((port, callback) => {
        if (callback) callback()
        return { port: port || 3000 }
      }),
      close: vi.fn((callback) => {
        if (callback) callback()
      }),
      on: vi.fn(),
      emit: vi.fn(),
    }

    return mockServer
  }

  /**
   * Mock WebSocket server
   */
  static createMockWebSocketServer(): any {
    const mockWSServer = {
      on: vi.fn(),
      emit: vi.fn(),
      broadcast: vi.fn(),
      clients: new Set(),
      close: vi.fn(),
    }

    return mockWSServer
  }

  /**
   * Create test database
   */
  static createMockDatabase(): any {
    const mockDB = {
      connect: vi.fn().mockResolvedValue(true),
      disconnect: vi.fn().mockResolvedValue(true),
      query: vi.fn(),
      transaction: vi.fn(),
      createTable: vi.fn(),
      dropTable: vi.fn(),
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    return mockDB
  }

  /**
   * Create mock file system
   */
  static createMockFileSystem(): any {
    const mockFS = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      exists: vi.fn(),
      mkdir: vi.fn(),
      rmdir: vi.fn(),
      unlink: vi.fn(),
      readdir: vi.fn(),
      stat: vi.fn(),
    }

    return mockFS
  }

  /**
   * Create test metrics collector
   */
  static createMetricsCollector(): any {
    const metrics = {
      counters: new Map(),
      timers: new Map(),
      gauges: new Map(),
    }

    return {
      increment: vi.fn((name, value = 1) => {
        metrics.counters.set(name, (metrics.counters.get(name) || 0) + value)
      }),
      timer: vi.fn((name, duration) => {
        if (!metrics.timers.has(name)) {
          metrics.timers.set(name, [])
        }
        metrics.timers.get(name).push(duration)
      }),
      gauge: vi.fn((name, value) => {
        metrics.gauges.set(name, value)
      }),
      getMetrics: vi.fn(() => metrics),
      reset: vi.fn(() => {
        metrics.counters.clear()
        metrics.timers.clear()
        metrics.gauges.clear()
      }),
    }
  }
}

/**
 * Test client for making requests to test server
 */
export class TestClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * Make GET request
   */
  async get(path: string): Promise<any> {
    // Mock implementation
    return {
      status: 200,
      data: { message: 'GET request successful' },
    }
  }

  /**
   * Make POST request
   */
  async post(path: string, data: any): Promise<any> {
    // Mock implementation
    return {
      status: 201,
      data: { message: 'POST request successful', received: data },
    }
  }

  /**
   * Make WebSocket connection
   */
  async connectWebSocket(path: string): Promise<any> {
    // Mock implementation
    return {
      on: vi.fn(),
      emit: vi.fn(),
      close: vi.fn(),
      send: vi.fn(),
    }
  }

  /**
   * Connect to Redis
   */
  async connectRedis(host: string, port: number): Promise<any> {
    return TestServer.createMockRedis()
  }
}