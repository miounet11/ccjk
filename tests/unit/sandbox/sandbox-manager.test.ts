/**
 * Integration tests for SandboxManager
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SandboxManager } from '../../../src/sandbox/sandbox-manager.js'

// Mock the dependencies
vi.mock('../../../src/sandbox/audit-logger.js', () => ({
  AuditLogger: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    setEnabled: vi.fn(),
    logRequest: vi.fn().mockResolvedValue(undefined),
    logResponse: vi.fn().mockResolvedValue(undefined),
    logError: vi.fn().mockResolvedValue(undefined),
    getAuditLogs: vi.fn().mockResolvedValue([]),
    clearLogs: vi.fn().mockResolvedValue(0),
    isEnabled: vi.fn().mockReturnValue(true),
  })),
}))

vi.mock('../../../src/sandbox/data-masker.js', () => ({
  DataMasker: vi.fn().mockImplementation(() => ({
    maskSensitiveFields: vi.fn((data: any) => {
      // Simple mock masking
      const masked = { ...data }
      if (masked.apiKey) {
        const key = masked.apiKey
        masked.apiKey = `${key.slice(0, 4)}${'*'.repeat(key.length - 6)}${key.slice(-2)}`
      }
      if (masked.token) {
        const token = masked.token
        masked.token = `${token.slice(0, 4)}${'*'.repeat(token.length - 8)}${token.slice(-4)}`
      }
      return masked
    }),
  })),
}))

vi.mock('../../../src/sandbox/rate-limiter.js', () => ({
  RateLimiter: vi.fn().mockImplementation((maxRequests: number) => {
    const requests: Map<string, number[]> = new Map()
    const config = { maxRequests }

    return {
      checkLimit: vi.fn((key: string) => {
        const now = Date.now()
        const userRequests = requests.get(key) || []
        const recentRequests = userRequests.filter(t => now - t < 60000)
        return recentRequests.length < config.maxRequests
      }),
      recordRequest: vi.fn((key: string) => {
        const userRequests = requests.get(key) || []
        userRequests.push(Date.now())
        requests.set(key, userRequests)
      }),
      updateConfig: vi.fn((maxReqs: number) => {
        config.maxRequests = maxReqs
      }),
      getConfig: vi.fn(() => config),
      getRemainingQuota: vi.fn((key: string) => {
        const userRequests = requests.get(key) || []
        return config.maxRequests - userRequests.length
      }),
      reset: vi.fn((key: string) => {
        requests.delete(key)
      }),
    }
  }),
}))

describe('sandboxManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with default configuration', () => {
      const manager = new SandboxManager()

      const status = manager.getStatus()
      expect(status.enabled).toBe(false)
      expect(status.config.isolateRequests).toBe(true)
      expect(status.config.maskSensitiveData).toBe(true)
      expect(status.config.auditLog).toBe(true)
      expect(status.config.maxRequestsPerMinute).toBe(60)
    })

    it('should create instance with custom configuration', () => {
      const manager = new SandboxManager({
        isolateRequests: false,
        maskSensitiveData: false,
        maxRequestsPerMinute: 100,
      })

      const config = manager.getConfig()
      expect(config.isolateRequests).toBe(false)
      expect(config.maskSensitiveData).toBe(false)
      expect(config.maxRequestsPerMinute).toBe(100)
    })
  })

  describe('enable', () => {
    it('should enable sandbox with default configuration', async () => {
      const manager = new SandboxManager()

      await manager.enable()

      const status = manager.getStatus()
      expect(status.enabled).toBe(true)
    })

    it('should enable sandbox with custom configuration', async () => {
      const manager = new SandboxManager()

      await manager.enable({
        isolateRequests: false,
        maskSensitiveData: true,
        auditLog: false,
        maxRequestsPerMinute: 100,
      })

      const status = manager.getStatus()
      expect(status.enabled).toBe(true)
      expect(status.config.isolateRequests).toBe(false)
      expect(status.config.maskSensitiveData).toBe(true)
      expect(status.config.auditLog).toBe(false)
      expect(status.config.maxRequestsPerMinute).toBe(100)
    })
  })

  describe('disable', () => {
    it('should disable sandbox', async () => {
      const manager = new SandboxManager()

      await manager.enable()
      manager.disable()

      const status = manager.getStatus()
      expect(status.enabled).toBe(false)
    })
  })

  describe('wrapRequest', () => {
    it('should wrap request when enabled', async () => {
      const manager = new SandboxManager()
      await manager.enable()

      const request = { method: 'GET', url: '/api/data' }
      const result = await manager.wrapRequest(request)

      expect(result.requestId).toBeTruthy()
      expect(result.requestId).toMatch(/^req-/)
      expect(result.timestamp).toBeTruthy()
    })

    it('should wrap request when disabled (passthrough)', async () => {
      const manager = new SandboxManager()

      const request = { method: 'GET', url: '/api/data' }
      const result = await manager.wrapRequest(request)

      expect(result.requestId).toBeTruthy()
      expect(result.original).toEqual(request)
    })

    it('should increment request counter when enabled', async () => {
      const manager = new SandboxManager()
      await manager.enable()

      await manager.wrapRequest({ test: 'data1' })
      await manager.wrapRequest({ test: 'data2' })

      const status = manager.getStatus()
      expect(status.stats.totalRequests).toBe(2)
    })

    it('should not increment counter when disabled', async () => {
      const manager = new SandboxManager()

      await manager.wrapRequest({ test: 'data' })

      const status = manager.getStatus()
      expect(status.stats.totalRequests).toBe(0)
    })
  })

  describe('unwrapResponse', () => {
    it('should unwrap response when enabled', async () => {
      const manager = new SandboxManager()
      await manager.enable()

      const response = { status: 200, data: 'success' }
      const result = await manager.unwrapResponse(response, 'req-123')

      expect(result.requestId).toBe('req-123')
      expect(result.timestamp).toBeTruthy()
    })

    it('should increment response counter when enabled', async () => {
      const manager = new SandboxManager()
      await manager.enable()

      await manager.unwrapResponse({ status: 200 }, 'req-1')
      await manager.unwrapResponse({ status: 200 }, 'req-2')

      const status = manager.getStatus()
      expect(status.stats.totalResponses).toBe(2)
    })
  })

  describe('logError', () => {
    it('should log error when enabled', async () => {
      const manager = new SandboxManager()
      await manager.enable()

      const error = new Error('Test error')
      await manager.logError(error, { operation: 'test' })

      const status = manager.getStatus()
      expect(status.stats.totalErrors).toBe(1)
    })

    it('should increment error counter', async () => {
      const manager = new SandboxManager()
      await manager.enable()

      await manager.logError(new Error('Error 1'))
      await manager.logError(new Error('Error 2'))

      const status = manager.getStatus()
      expect(status.stats.totalErrors).toBe(2)
    })

    it('should not log when disabled', async () => {
      const manager = new SandboxManager()

      await manager.logError(new Error('Test'))

      const status = manager.getStatus()
      expect(status.stats.totalErrors).toBe(0)
    })
  })

  describe('getAuditLogs', () => {
    it('should return empty array when disabled', async () => {
      const manager = new SandboxManager()

      const logs = await manager.getAuditLogs()

      expect(logs).toEqual([])
    })
  })

  describe('clearAuditLogs', () => {
    it('should return 0 when disabled', async () => {
      const manager = new SandboxManager()

      const count = await manager.clearAuditLogs()

      expect(count).toBe(0)
    })
  })

  describe('updateConfig', () => {
    it('should update configuration', async () => {
      const manager = new SandboxManager()
      await manager.enable()

      await manager.updateConfig({
        maxRequestsPerMinute: 120,
        maskSensitiveData: false,
      })

      const config = manager.getConfig()
      expect(config.maxRequestsPerMinute).toBe(120)
      expect(config.maskSensitiveData).toBe(false)
    })
  })

  describe('getStatus', () => {
    it('should return complete status', async () => {
      const manager = new SandboxManager()
      await manager.enable()

      await manager.wrapRequest({ test: 'data' })
      await manager.unwrapResponse({ status: 200 }, 'req-1')
      await manager.logError(new Error('Test'))

      const status = manager.getStatus()

      expect(status.enabled).toBe(true)
      expect(status.config).toBeDefined()
      expect(status.stats.totalRequests).toBe(1)
      expect(status.stats.totalResponses).toBe(1)
      expect(status.stats.totalErrors).toBe(1)
    })
  })

  describe('resetStats', () => {
    it('should reset all statistics', async () => {
      const manager = new SandboxManager()
      await manager.enable()

      await manager.wrapRequest({ test: 'data' })
      await manager.unwrapResponse({ status: 200 }, 'req-1')
      await manager.logError(new Error('Test'))

      manager.resetStats()

      const status = manager.getStatus()
      expect(status.stats.totalRequests).toBe(0)
      expect(status.stats.totalResponses).toBe(0)
      expect(status.stats.totalErrors).toBe(0)
    })
  })

  describe('component accessors', () => {
    it('should return data masker instance', () => {
      const manager = new SandboxManager()

      const masker = manager.getDataMasker()

      expect(masker).toBeDefined()
    })

    it('should return audit logger instance', () => {
      const manager = new SandboxManager()

      const logger = manager.getAuditLogger()

      expect(logger).toBeDefined()
    })

    it('should return rate limiter instance', () => {
      const manager = new SandboxManager()

      const limiter = manager.getRateLimiter()

      expect(limiter).toBeDefined()
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete request-response cycle', async () => {
      const manager = new SandboxManager()
      await manager.enable({
        isolateRequests: true,
        maskSensitiveData: true,
        auditLog: true,
        maxRequestsPerMinute: 60,
      })

      // Wrap request
      const request = {
        method: 'POST',
        url: '/api/data',
        data: { username: 'john' },
      }

      const wrappedReq = await manager.wrapRequest(request, { userId: 'user1' })
      expect(wrappedReq.requestId).toBeTruthy()

      // Unwrap response
      const response = {
        status: 200,
        data: { message: 'success' },
      }

      const unwrappedRes = await manager.unwrapResponse(response, wrappedReq.requestId)
      expect(unwrappedRes.requestId).toBe(wrappedReq.requestId)

      // Check statistics
      const status = manager.getStatus()
      expect(status.stats.totalRequests).toBe(1)
      expect(status.stats.totalResponses).toBe(1)
    })

    it('should handle error during request processing', async () => {
      const manager = new SandboxManager()
      await manager.enable({ auditLog: true })

      const request = { test: 'data' }
      const wrappedReq = await manager.wrapRequest(request)

      // Simulate error
      const error = new Error('Processing failed')
      await manager.logError(error, { requestId: wrappedReq.requestId })

      const status = manager.getStatus()
      expect(status.stats.totalRequests).toBe(1)
      expect(status.stats.totalErrors).toBe(1)
    })
  })
})
