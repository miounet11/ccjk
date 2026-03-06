/**
 * Cloud API Mock Helpers
 *
 * Provides mock utilities for testing cloud API integration
 * without depending on real API endpoints.
 *
 * @module tests/helpers/cloud-mock
 */

import type {
  BatchTemplateResponse,
  HealthCheckResponse,
  ProjectAnalysisResponse,
  Recommendation,
  TemplateResponse,
  UsageReportResponse,
} from '../../src/cloud-client/types'
import type {
  BindResponse,
  CloudReply,
  NotifyResponse,
} from '../../src/services/cloud-notification'
import type { CloudApiResponse } from '../../src/services/cloud/api-client'

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Create mock project analysis response
 */
export function createMockAnalysisResponse(
  overrides?: Partial<ProjectAnalysisResponse>,
): ProjectAnalysisResponse {
  return {
    requestId: `req_${Date.now()}`,
    recommendations: [
      createMockRecommendation({ id: 'ts-best-practices', category: 'skill' }),
      createMockRecommendation({ id: 'react-patterns', category: 'skill' }),
    ],
    projectType: 'typescript-react',
    frameworks: ['react', 'typescript'],
    ...overrides,
  }
}

/**
 * Create mock recommendation
 */
export function createMockRecommendation(
  overrides?: Partial<Recommendation>,
): Recommendation {
  return {
    id: 'mock-recommendation',
    name: { 'en': 'Mock Recommendation', 'zh-CN': '模拟推荐' },
    description: { 'en': 'A mock recommendation for testing', 'zh-CN': '用于测试的模拟推荐' },
    category: 'skill',
    relevanceScore: 0.95,
    tags: ['test', 'mock'],
    ...overrides,
  }
}

/**
 * Create mock template response
 */
export function createMockTemplate(
  overrides?: Partial<TemplateResponse>,
): TemplateResponse {
  return {
    id: 'mock-template',
    type: 'workflow',
    name: { 'en': 'Mock Template', 'zh-CN': '模拟模板' },
    description: { 'en': 'A mock template for testing', 'zh-CN': '用于测试的模拟模板' },
    content: '# Mock Template Content',
    version: '1.0.0',
    author: 'Test Author',
    tags: ['test'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create mock batch template response
 */
export function createMockBatchTemplateResponse(
  templateIds: string[],
  overrides?: Partial<BatchTemplateResponse>,
): BatchTemplateResponse {
  const templates: Record<string, TemplateResponse> = {}

  templateIds.forEach((id) => {
    templates[id] = createMockTemplate({ id })
  })

  return {
    requestId: `batch_${Date.now()}`,
    templates,
    notFound: [],
    ...overrides,
  }
}

/**
 * Create mock health check response
 */
export function createMockHealthResponse(
  overrides?: Partial<HealthCheckResponse>,
): HealthCheckResponse {
  return {
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create mock usage report response
 */
export function createMockUsageReportResponse(
  overrides?: Partial<UsageReportResponse>,
): UsageReportResponse {
  return {
    success: true,
    requestId: `usage_${Date.now()}`,
    message: 'Telemetry received',
    ...overrides,
  }
}

/**
 * Create mock bind response
 */
export function createMockBindResponse(
  overrides?: Partial<BindResponse>,
): BindResponse {
  return {
    success: true,
    deviceToken: `token_${Date.now()}`,
    deviceId: `device_${Date.now()}`,
    ...overrides,
  }
}

/**
 * Create mock notification response
 */
export function createMockNotifyResponse(
  overrides?: Partial<NotifyResponse>,
): NotifyResponse {
  return {
    success: true,
    notificationId: `notif_${Date.now()}`,
    ...overrides,
  }
}

/**
 * Create mock cloud reply
 */
export function createMockCloudReply(
  overrides?: Partial<CloudReply>,
): CloudReply {
  return {
    content: 'Mock reply content',
    timestamp: new Date(),
    notificationId: `notif_${Date.now()}`,
    ...overrides,
  }
}

// ============================================================================
// Mock Server Setup
// ============================================================================

/**
 * Mock server state
 */
interface MockServerState {
  responses: Map<string, any>
  requestLog: Array<{ path: string, method: string, body?: any }>
  latency: number
  shouldFail: boolean
  failureRate: number
}

/**
 * Create a mock server for testing
 */
export class MockCloudServer {
  private state: MockServerState = {
    responses: new Map(),
    requestLog: [],
    latency: 0,
    shouldFail: false,
    failureRate: 0,
  }

  /**
   * Set mock response for a specific endpoint
   */
  setResponse<T>(path: string, response: CloudApiResponse<T>): void {
    this.state.responses.set(path, response)
  }

  /**
   * Set mock latency (in milliseconds)
   */
  setLatency(ms: number): void {
    this.state.latency = ms
  }

  /**
   * Enable failure mode
   */
  enableFailures(rate: number = 1.0): void {
    this.state.shouldFail = true
    this.state.failureRate = rate
  }

  /**
   * Disable failure mode
   */
  disableFailures(): void {
    this.state.shouldFail = false
    this.state.failureRate = 0
  }

  /**
   * Get request log
   */
  getRequestLog(): Array<{ path: string, method: string, body?: any }> {
    return [...this.state.requestLog]
  }

  /**
   * Clear request log
   */
  clearRequestLog(): void {
    this.state.requestLog = []
  }

  /**
   * Reset all mock state
   */
  reset(): void {
    this.state.responses.clear()
    this.state.requestLog = []
    this.state.latency = 0
    this.state.shouldFail = false
    this.state.failureRate = 0
  }

  /**
   * Simulate a request to the mock server
   */
  async request<T>(
    path: string,
    method: string,
    body?: any,
  ): Promise<CloudApiResponse<T>> {
    // Log the request
    this.state.requestLog.push({ path, method, body })

    // Simulate latency
    if (this.state.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.state.latency))
    }

    // Simulate failures
    if (this.state.shouldFail && Math.random() < this.state.failureRate) {
      return {
        success: false,
        error: 'Mock server failure',
        code: 'MOCK_ERROR',
      }
    }

    // Return mock response
    const response = this.state.responses.get(path)
    if (response) {
      return response
    }

    // Default success response
    return {
      success: true,
      data: {} as T,
    }
  }
}

// ============================================================================
// Test Gateway Factory
// ============================================================================

/**
 * Create a test gateway with mock responses
 */
export function createTestGateway(mockServer?: MockCloudServer) {
  const server = mockServer || new MockCloudServer()

  return {
    gateway: {
      request: async <T>(route: string, options: any) => {
        return server.request<T>(route, options.method, options.body)
      },
      setAuthToken: () => {},
      getConfig: () => ({}),
    },
    mockServer: server,
  }
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a response is successful
 */
export function assertSuccessResponse<T>(
  response: CloudApiResponse<T>,
): asserts response is CloudApiResponse<T> & { success: true, data: T } {
  if (!response.success) {
    throw new Error(`Expected success response, got error: ${response.error}`)
  }
  if (!response.data) {
    throw new Error('Expected data in success response')
  }
}

/**
 * Assert that a response is an error
 */
export function assertErrorResponse<T>(
  response: CloudApiResponse<T>,
): asserts response is CloudApiResponse<T> & { success: false, error: string } {
  if (response.success) {
    throw new Error('Expected error response, got success')
  }
  if (!response.error) {
    throw new Error('Expected error message in error response')
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100,
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`)
}
