/**
 * Integration tests for SandboxManager
 */

import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SandboxManager } from '../../../src/sandbox/sandbox-manager.js'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  unlink: vi.fn(),
}))

describe('sandboxManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(mkdir).mockResolvedValue(undefined)
    vi.mocked(writeFile).mockResolvedValue(undefined)
    vi.mocked(readFile).mockResolvedValue('')
    vi.mocked(readdir).mockResolvedValue([])
    vi.mocked(unlink).mockResolvedValue(undefined)
  })

  describe('enable', () => {
    it('should enable sandbox with default configuration', async () => {
      const manager = new SandboxManager('/mock/audit')

      await manager.enable()

      const status = manager.getStatus()
      expect(status.enabled).toBe(true)
      expect(status.config.isolateRequests).toBe(true)
      expect(status.config.maskSensitiveData).toBe(true)
      expect(status.config.auditLog).toBe(true)
      expect(status.config.maxRequestsPerMinute).toBe(60)
    })

    it('should enable sandbox with custom configuration', async () => {
      const manager = new SandboxManager('/mock/audit')

      await manager.enable({
        isolateRequests: false,
        maskSensitiveData: true,
        auditLog: false,
        maxRequestsPerMinute: 100,
      })

      const status = manager.getStatus()
      expect(status.config.isolateRequests).toBe(false)
      expect(status.config.maskSensitiveData).toBe(true)
      expect(status.config.auditLog).toBe(false)
      expect(status.config.maxRequestsPerMinute).toBe(100)
    })

    it('should initialize audit logger when enabled', async () => {
      const manager = new SandboxManager('/mock/audit')

      await manager.enable({ auditLog: true })

      expect(mkdir).toHaveBeenCalled()
    })
  })

  describe('disable', () => {
    it('should disable sandbox', async () => {
      const manager = new SandboxManager('/mock/audit')

      await manager.enable()
      manager.disable()

      const status = manager.getStatus()
      expect(status.enabled).toBe(false)
    })

    it('should reset statistics on disable', async () => {
      const manager = new SandboxManager('/mock/audit')

      await manager.enable()
      await manager.processRequest({ test: 'data' })
      manager.disable()

      const status = manager.getStatus()
      expect(status.stats.totalRequests).toBe(0)
    })
  })

  describe('processRequest', () => {
    it('should process request when enabled', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable()

      const request = { method: 'GET', url: '/api/data' }
      const result = await manager.processRequest(request)

      expect(result.allowed).toBe(true)
      expect(result.requestId).toBeTruthy()
    })

    it('should mask sensitive data in request', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable({ maskSensitiveData: true })

      const request = {
        method: 'POST',
        apiKey: 'sk-1234567890abcdef',
        data: { username: 'john' },
      }

      const result = await manager.processRequest(request)

      expect(result.maskedRequest?.apiKey).toMatch(/^sk-1\*+ef$/)
      expect(result.maskedRequest?.data.username).toBe('john')
    })

    it('should enforce rate limiting', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable({ maxRequestsPerMinute: 2 })

      const request = { test: 'data' }

      // First two requests should succeed
      const result1 = await manager.processRequest(request, 'user1')
      const result2 = await manager.processRequest(request, 'user1')

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)

      // Third request should be rate limited
      const result3 = await manager.processRequest(request, 'user1')

      expect(result3.allowed).toBe(false)
      expect(result3.rateLimited).toBe(true)
    })

    it('should log request to audit log', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable({ auditLog: true })

      const request = { method: 'GET', url: '/api/data' }
      await manager.processRequest(request)

      expect(writeFile).toHaveBeenCalled()
    })

    it('should increment request counter', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable()

      await manager.processRequest({ test: 'data' })
      await manager.processRequest({ test: 'data' })

      const status = manager.getStatus()
      expect(status.stats.totalRequests).toBe(2)
    })

    it('should not process when disabled', async () => {
      const manager = new SandboxManager('/mock/audit')

      const result = await manager.processRequest({ test: 'data' })

      expect(result.allowed).toBe(true)
      expect(result.requestId).toBeFalsy()
    })
  })

  describe('processResponse', () => {
    it('should process response when enabled', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable()

      const response = { status: 200, data: 'success' }
      const result = await manager.processResponse(response, 'req-123')

      expect(result.responseId).toBeTruthy()
    })

    it('should mask sensitive data in response', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable({ maskSensitiveData: true })

      const response = {
        status: 200,
        token: 'secret-token-12345',
        data: { message: 'success' },
      }

      const result = await manager.processResponse(response)

      expect(result.maskedResponse?.token).toMatch(/^secr\*+2345$/)
      expect(result.maskedResponse?.data.message).toBe('success')
    })

    it('should log response to audit log', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable({ auditLog: true })

      const response = { status: 200, data: 'success' }
      await manager.processResponse(response, 'req-123')

      expect(writeFile).toHaveBeenCalled()
    })

    it('should increment response counter', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable()

      await manager.processResponse({ status: 200 })
      await manager.processResponse({ status: 200 })

      const status = manager.getStatus()
      expect(status.stats.totalResponses).toBe(2)
    })
  })

  describe('handleError', () => {
    it('should handle error when enabled', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable()

      const error = new Error('Test error')
      const result = await manager.handleError(error, { operation: 'test' })

      expect(result.errorId).toBeTruthy()
    })

    it('should log error to audit log', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable({ auditLog: true })

      const error = new Error('Test error')
      await manager.handleError(error)

      expect(writeFile).toHaveBeenCalled()
    })

    it('should increment error counter', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable()

      await manager.handleError(new Error('Error 1'))
      await manager.handleError(new Error('Error 2'))

      const status = manager.getStatus()
      expect(status.stats.totalErrors).toBe(2)
    })
  })

  describe('getAuditLogs', () => {
    it('should return audit logs', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable({ auditLog: true })

      const mockLogs = [
        { id: '1', type: 'request', timestamp: 1000, data: {} },
        { id: '2', type: 'response', timestamp: 2000, data: {} },
      ]

      vi.mocked(readdir).mockResolvedValue(['audit-2024-01-01.jsonl'] as any)
      vi.mocked(readFile).mockResolvedValue(
        mockLogs.map(log => JSON.stringify(log)).join('\n'),
      )

      const logs = await manager.getAuditLogs()

      expect(logs).toHaveLength(2)
    })

    it('should return empty array when disabled', async () => {
      const manager = new SandboxManager('/mock/audit')

      const logs = await manager.getAuditLogs()

      expect(logs).toEqual([])
    })
  })

  describe('clearAuditLogs', () => {
    it('should clear audit logs', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable({ auditLog: true })

      vi.mocked(readdir).mockResolvedValue([
        'audit-2024-01-01.jsonl',
        'audit-2024-01-02.jsonl',
      ] as any)

      const count = await manager.clearAuditLogs()

      expect(count).toBe(2)
    })

    it('should return 0 when disabled', async () => {
      const manager = new SandboxManager('/mock/audit')

      const count = await manager.clearAuditLogs()

      expect(count).toBe(0)
    })
  })

  describe('updateConfig', () => {
    it('should update configuration', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable()

      await manager.updateConfig({
        maxRequestsPerMinute: 120,
        maskSensitiveData: false,
      })

      const status = manager.getStatus()
      expect(status.config.maxRequestsPerMinute).toBe(120)
      expect(status.config.maskSensitiveData).toBe(false)
    })

    it('should update rate limiter configuration', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable({ maxRequestsPerMinute: 10 })

      await manager.updateConfig({ maxRequestsPerMinute: 20 })

      const limiter = manager.getRateLimiter()
      const config = limiter.getConfig()
      expect(config.maxRequests).toBe(20)
    })

    it('should update audit logger state', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable({ auditLog: true })

      await manager.updateConfig({ auditLog: false })

      const logger = manager.getAuditLogger()
      expect(logger.isEnabled()).toBe(false)
    })
  })

  describe('getStatus', () => {
    it('should return complete status', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable()

      await manager.processRequest({ test: 'data' })
      await manager.processResponse({ status: 200 })
      await manager.handleError(new Error('Test'))

      const status = manager.getStatus()

      expect(status.enabled).toBe(true)
      expect(status.config).toBeDefined()
      expect(status.stats.totalRequests).toBe(1)
      expect(status.stats.totalResponses).toBe(1)
      expect(status.stats.totalErrors).toBe(1)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete request-response cycle', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable({
        isolateRequests: true,
        maskSensitiveData: true,
        auditLog: true,
        maxRequestsPerMinute: 60,
      })

      // Process request
      const request = {
        method: 'POST',
        url: '/api/data',
        apiKey: 'sk-1234567890abcdef',
        data: { username: 'john' },
      }

      const reqResult = await manager.processRequest(request, 'user1')
      expect(reqResult.allowed).toBe(true)
      expect(reqResult.maskedRequest?.apiKey).toMatch(/^sk-1\*+ef$/)

      // Process response
      const response = {
        status: 200,
        token: 'response-token-12345',
        data: { message: 'success' },
      }

      const resResult = await manager.processResponse(response, reqResult.requestId)
      expect(resResult.maskedResponse?.token).toMatch(/^resp\*+2345$/)

      // Check statistics
      const status = manager.getStatus()
      expect(status.stats.totalRequests).toBe(1)
      expect(status.stats.totalResponses).toBe(1)
    })

    it('should handle rate limiting across multiple users', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable({ maxRequestsPerMinute: 2 })

      const request = { test: 'data' }

      // User1: 2 requests (should succeed)
      await manager.processRequest(request, 'user1')
      await manager.processRequest(request, 'user1')

      // User2: 2 requests (should succeed)
      await manager.processRequest(request, 'user2')
      await manager.processRequest(request, 'user2')

      // User1: 3rd request (should fail)
      const result1 = await manager.processRequest(request, 'user1')
      expect(result1.rateLimited).toBe(true)

      // User2: 3rd request (should fail)
      const result2 = await manager.processRequest(request, 'user2')
      expect(result2.rateLimited).toBe(true)

      const status = manager.getStatus()
      expect(status.stats.rateLimitHits).toBe(2)
    })

    it('should handle error during request processing', async () => {
      const manager = new SandboxManager('/mock/audit')
      await manager.enable({ auditLog: true })

      const request = { test: 'data' }
      const reqResult = await manager.processRequest(request)

      // Simulate error
      const error = new Error('Processing failed')
      await manager.handleError(error, { requestId: reqResult.requestId })

      const status = manager.getStatus()
      expect(status.stats.totalRequests).toBe(1)
      expect(status.stats.totalErrors).toBe(1)
    })
  })
})
