/**
 * Mock backend API for integration testing
 * Simulates CCJK backend services without external dependencies
 */

export class MockBackend {
  private endpoints: Map<string, (...args: any[]) => any> = new Map()
  private authToken: string | null = null
  private rateLimitRemaining = 1000
  private requestLog: any[] = []

  constructor(private baseUrl: string = 'https://api.ccjk.com') {}

  /**
   * Register API endpoint
   */
  registerEndpoint(method: string, path: string, handler: (...args: any[]) => any): void {
    const key = `${method.toUpperCase()}:${path}`
    this.endpoints.set(key, handler)
  }

  /**
   * Make API request
   */
  async request(method: string, path: string, data?: any, headers?: any): Promise<any> {
    const key = `${method.toUpperCase()}:${path}`
    const handler = this.endpoints.get(key)

    // Log request
    this.requestLog.push({
      method,
      path,
      data,
      headers,
      timestamp: new Date(),
    })

    if (!handler) {
      return {
        status: 404,
        data: { error: 'Endpoint not found' },
      }
    }

    // Check rate limit
    if (this.rateLimitRemaining <= 0) {
      return {
        status: 429,
        data: { error: 'Rate limit exceeded' },
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Date.now() + 3600000,
        },
      }
    }

    this.rateLimitRemaining--

    // Check authentication
    if (path !== '/auth/login' && !this.authToken) {
      return {
        status: 401,
        data: { error: 'Authentication required' },
      }
    }

    try {
      const result = await handler(data, headers)
      return {
        status: result.status || 200,
        data: result.data || result,
        headers: {
          'X-RateLimit-Remaining': this.rateLimitRemaining.toString(),
          ...result.headers,
        },
      }
    }
    catch (error) {
      return {
        status: 500,
        data: { error: error.message },
      }
    }
  }

  /**
   * Authenticate
   */
  async authenticate(credentials: any): Promise<any> {
    this.registerEndpoint('POST', '/auth/login', async (data) => {
      if (data.username === 'test' && data.password === 'test123') {
        this.authToken = 'mock-jwt-token'
        return {
          status: 200,
          data: {
            token: this.authToken,
            user: { id: 'user-123', name: 'Test User' },
            expiresAt: Date.now() + 86400000,
          },
        }
      }
      throw new Error('Invalid credentials')
    })

    return this.request('POST', '/auth/login', credentials)
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<any> {
    this.registerEndpoint('GET', '/user/profile', async () => {
      return {
        status: 200,
        data: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          plan: 'premium',
          credits: 1000,
        },
      }
    })

    return this.request('GET', '/user/profile', null, {
      Authorization: `Bearer ${this.authToken}`,
    })
  }

  /**
   * Get available skills
   */
  async getSkills(): Promise<any> {
    this.registerEndpoint('GET', '/skills', async () => {
      return {
        status: 200,
        data: {
          skills: [
            {
              id: 'skill-001',
              name: 'Performance Analyzer',
              category: 'analysis',
              layer: 'L2',
              description: 'Analyzes code performance',
            },
            {
              id: 'skill-002',
              name: 'Security Scanner',
              category: 'security',
              layer: 'L3',
              description: 'Scans for security issues',
            },
          ],
          total: 2,
        },
      }
    })

    return this.request('GET', '/skills', null, {
      Authorization: `Bearer ${this.authToken}`,
    })
  }

  /**
   * Execute skill
   */
  async executeSkill(skillId: string, input: any): Promise<any> {
    this.registerEndpoint('POST', `/skills/${skillId}/execute`, async (_data) => {
      return {
        status: 200,
        data: {
          executionId: 'exec-123',
          skillId,
          status: 'completed',
          result: {
            analysis: 'complete',
            issues: 5,
            suggestions: 3,
          },
          executionTime: 2340,
        },
      }
    })

    return this.request('POST', `/skills/${skillId}/execute`, input, {
      Authorization: `Bearer ${this.authToken}`,
    })
  }

  /**
   * Get workflow templates
   */
  async getWorkflowTemplates(): Promise<any> {
    this.registerEndpoint('GET', '/workflows/templates', async () => {
      return {
        status: 200,
        data: {
          templates: [
            {
              id: 'template-001',
              name: 'Code Review Workflow',
              description: 'Automated code review process',
              steps: ['analyze', 'review', 'suggest'],
            },
            {
              id: 'template-002',
              name: 'Performance Optimization',
              description: 'Performance analysis and optimization',
              steps: ['profile', 'analyze', 'optimize'],
            },
          ],
        },
      }
    })

    return this.request('GET', '/workflows/templates', null, {
      Authorization: `Bearer ${this.authToken}`,
    })
  }

  /**
   * Create workflow
   */
  async createWorkflow(template: any): Promise<any> {
    this.registerEndpoint('POST', '/workflows', async (data) => {
      return {
        status: 201,
        data: {
          workflowId: 'workflow-123',
          status: 'created',
          template: data,
          createdAt: new Date(),
        },
      }
    })

    return this.request('POST', '/workflows', template, {
      Authorization: `Bearer ${this.authToken}`,
    })
  }

  /**
   * Get agent status
   */
  async getAgentStatus(agentId: string): Promise<any> {
    this.registerEndpoint('GET', `/agents/${agentId}/status`, async () => {
      return {
        status: 200,
        data: {
          agentId,
          status: 'online',
          lastSeen: Date.now(),
          load: 0.45,
          tasksCompleted: 1234,
        },
      }
    })

    return this.request('GET', `/agents/${agentId}/status`, null, {
      Authorization: `Bearer ${this.authToken}`,
    })
  }

  /**
   * Get analytics data
   */
  async getAnalytics(timeRange: string): Promise<any> {
    this.registerEndpoint('GET', `/analytics`, async (params) => {
      return {
        status: 200,
        data: {
          timeRange: params.timeRange,
          metrics: {
            totalWorkflows: 1523,
            averageExecutionTime: 2340,
            successRate: 0.94,
            topSkills: ['Performance Analyzer', 'Security Scanner'],
          },
          trends: {
            workflows: { current: 1523, previous: 1234, change: 23.4 },
            performance: { current: 2340, previous: 2650, change: -11.7 },
          },
        },
      }
    })

    return this.request('GET', `/analytics?timeRange=${timeRange}`, null, {
      Authorization: `Bearer ${this.authToken}`,
    })
  }

  /**
   * Get request log
   */
  getRequestLog(): any[] {
    return [...this.requestLog]
  }

  /**
   * Clear request log
   */
  clearRequestLog(): void {
    this.requestLog = []
  }

  /**
   * Simulate network delay
   */
  async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Simulate network failure
   */
  simulateNetworkFailure(probability = 0.1): boolean {
    return Math.random() < probability
  }

  /**
   * Reset mock backend
   */
  reset(): void {
    this.endpoints.clear()
    this.authToken = null
    this.rateLimitRemaining = 1000
    this.requestLog = []
  }

  /**
   * Set rate limit
   */
  setRateLimit(limit: number): void {
    this.rateLimitRemaining = limit
  }

  /**
   * Get current rate limit
   */
  getRateLimitRemaining(): number {
    return this.rateLimitRemaining
  }
}

/**
 * Create mock backend instance
 */
export function createMockBackend(baseUrl?: string): MockBackend {
  return new MockBackend(baseUrl)
}

/**
 * Mock API responses
 */
export const mockResponses = {
  auth: {
    login: {
      success: {
        status: 200,
        data: {
          token: 'mock-jwt-token',
          user: { id: 'user-123', name: 'Test User' },
        },
      },
      failure: {
        status: 401,
        data: { error: 'Invalid credentials' },
      },
    },
  },
  skills: {
    list: {
      status: 200,
      data: {
        skills: [
          { id: 'skill-001', name: 'Analyzer', category: 'analysis' },
          { id: 'skill-002', name: 'Optimizer', category: 'optimization' },
        ],
      },
    },
    execute: {
      status: 200,
      data: {
        executionId: 'exec-123',
        status: 'completed',
        result: { success: true },
      },
    },
  },
  workflows: {
    create: {
      status: 201,
      data: {
        workflowId: 'workflow-123',
        status: 'created',
      },
    },
    status: {
      status: 200,
      data: {
        workflowId: 'workflow-123',
        status: 'running',
        progress: 65,
      },
    },
  },
  errors: {
    rateLimit: {
      status: 429,
      data: { error: 'Rate limit exceeded' },
      headers: {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Date.now() + 3600000,
      },
    },
    serverError: {
      status: 500,
      data: { error: 'Internal server error' },
    },
    notFound: {
      status: 404,
      data: { error: 'Resource not found' },
    },
  },
}

/**
 * Mock WebSocket backend
 */
export class MockWebSocketBackend {
  private connections: Map<string, any> = new Map()
  private channels: Map<string, Set<string>> = new Map()

  /**
   * Handle connection
   */
  handleConnection(connectionId: string, socket: any): void {
    this.connections.set(connectionId, socket)

    socket.on('subscribe', (channel: string) => {
      this.subscribe(connectionId, channel)
    })

    socket.on('unsubscribe', (channel: string) => {
      this.unsubscribe(connectionId, channel)
    })

    socket.on('publish', (channel: string, data: any) => {
      this.publish(channel, data)
    })
  }

  /**
   * Subscribe to channel
   */
  subscribe(connectionId: string, channel: string): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set())
    }
    this.channels.get(channel)!.add(connectionId)

    const socket = this.connections.get(connectionId)
    if (socket) {
      socket.emit('subscribed', { channel })
    }
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(connectionId: string, channel: string): void {
    const channelSet = this.channels.get(channel)
    if (channelSet) {
      channelSet.delete(connectionId)
      if (channelSet.size === 0) {
        this.channels.delete(channel)
      }
    }

    const socket = this.connections.get(connectionId)
    if (socket) {
      socket.emit('unsubscribed', { channel })
    }
  }

  /**
   * Publish to channel
   */
  publish(channel: string, data: any): void {
    const subscribers = this.channels.get(channel)
    if (subscribers) {
      subscribers.forEach((connectionId) => {
        const socket = this.connections.get(connectionId)
        if (socket) {
          socket.emit('message', { channel, data })
        }
      })
    }
  }

  /**
   * Get channel subscribers
   */
  getChannelSubscribers(channel: string): number {
    return this.channels.get(channel)?.size || 0
  }

  /**
   * Get total connections
   */
  getConnectionCount(): number {
    return this.connections.size
  }

  /**
   * Disconnect
   */
  disconnect(connectionId: string): void {
    this.connections.delete(connectionId)

    // Remove from all channels
    this.channels.forEach((subscribers) => {
      subscribers.delete(connectionId)
    })
  }

  /**
   * Reset
   */
  reset(): void {
    this.connections.clear()
    this.channels.clear()
  }
}

/**
 * Create mock WebSocket backend
 */
export function createMockWebSocketBackend(): MockWebSocketBackend {
  return new MockWebSocketBackend()
}
