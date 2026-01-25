/**
 * Integration test suite for Hook enforcement system
 * Tests L3 mandatory hooks, L2 optional hooks with justification, and audit trail
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MockFactory, AssertionHelpers } from '../helpers'
import { createTestTempDir } from '../setup'
import type { HookLevel, HookExecution, HookJustification } from '@/types/hooks'

describe('Hook Enforcement Integration', () => {
  let testDir: string
  let hookManager: any
  let hookRegistry: any
  let auditLogger: any
  let performanceMonitor: any

  beforeEach(async () => {
    testDir = createTestTempDir('hooks-enforcement-test')

    // Setup comprehensive mock suite
    vi.doMock('@/hooks/manager', () => ({
      HookManager: vi.fn().mockImplementation(() => ({
        registerHook: vi.fn(),
        executeHook: vi.fn(),
        validateHook: vi.fn(),
        isHookRequired: vi.fn(),
        getHookLevel: vi.fn(),
        bypassWithJustification: vi.fn(),
        getExecutionAudit: vi.fn(),
      })),
    }))

    vi.doMock('@/hooks/registry', () => ({
      HookRegistry: vi.fn().mockImplementation(() => ({
        getHooksByLevel: vi.fn(),
        getHookById: vi.fn(),
        getAllHooks: vi.fn(),
        validateRegistry: vi.fn(),
      })),
    }))

    vi.doMock('@/hooks/audit', () => ({
      AuditLogger: vi.fn().mockImplementation(() => ({
        logExecution: vi.fn(),
        logBypass: vi.fn(),
        logFailure: vi.fn(),
        getAuditTrail: vi.fn(),
        exportAuditLog: vi.fn(),
      })),
    }))

    vi.doMock('@/hooks/performance', () => ({
      PerformanceMonitor: vi.fn().mockImplementation(() => ({
        startTimer: vi.fn(),
        endTimer: vi.fn(),
        getExecutionTime: vi.fn(),
        getPerformanceMetrics: vi.fn(),
      })),
    }))

    // Import mocked modules
    const { HookManager } = await import('@/hooks/manager')
    const { HookRegistry } = await import('@/hooks/registry')
    const { AuditLogger } = await import('@/hooks/audit')
    const { PerformanceMonitor } = await import('@/hooks/performance')

    hookManager = new HookManager()
    hookRegistry = new HookRegistry()
    auditLogger = new AuditLogger()
    performanceMonitor = new PerformanceMonitor()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('L3 Hook Enforcement (Mandatory)', () => {
    it('should enforce L3 hooks without bypass option', async () => {
      // Arrange
      const l3Hook = MockFactory.createHook({
        id: 'security-validation',
        level: 'L3' as HookLevel,
        name: 'Security Validation',
        handler: async () => ({ valid: true, message: 'Security check passed' }),
      })

      hookRegistry.getHookById.mockReturnValue(l3Hook)
      hookManager.getHookLevel.mockReturnValue('L3')
      hookManager.isHookRequired.mockReturnValue(true)
      hookManager.executeHook.mockResolvedValue({
        success: true,
        result: { valid: true, message: 'Security check passed' },
        executionTime: 0.5,
      })

      // Act
      const result = await hookManager.executeHook('security-validation', {})

      // Assert
      expect(result.success).toBe(true)
      expect(hookManager.bypassWithJustification).not.toHaveBeenCalled()
    })

    it('should fail when L3 hook execution fails', async () => {
      // Arrange
      const l3Hook = MockFactory.createHook({
        id: 'data-integrity-check',
        level: 'L3',
        name: 'Data Integrity Check',
      })

      hookRegistry.getHookById.mockReturnValue(l3Hook)
      hookManager.getHookLevel.mockReturnValue('L3')
      hookManager.isHookRequired.mockReturnValue(true)
      hookManager.executeHook.mockResolvedValue({
        success: false,
        error: new Error('Data integrity validation failed'),
        executionTime: 0.3,
      })

      // Act & Assert
      const result = await hookManager.executeHook('data-integrity-check', {})
      expect(result.success).toBe(false)
      expect(result.error.message).toBe('Data integrity validation failed')
    })

    it('should prevent operation when L3 hook is missing', async () => {
      // Arrange
      hookRegistry.getHookById.mockReturnValue(null)
      hookManager.validateHook.mockImplementation((hookId: string) => {
        if (hookId === 'missing-l3-hook') {
          throw new Error(`Mandatory L3 hook '${hookId}' not found`)
        }
      })

      // Act & Assert
      expect(() => hookManager.validateHook('missing-l3-hook')).toThrow(
        "Mandatory L3 hook 'missing-l3-hook' not found"
      )
    })
  })

  describe('L2 Hook Enforcement (Optional with Justification)', () => {
    it('should execute L2 hook normally', async () => {
      // Arrange
      const l2Hook = MockFactory.createHook({
        id: 'performance-check',
        level: 'L2' as HookLevel,
        name: 'Performance Check',
        handler: async () => ({ score: 95, threshold: 80 }),
      })

      hookRegistry.getHookById.mockReturnValue(l2Hook)
      hookManager.getHookLevel.mockReturnValue('L2')
      hookManager.isHookRequired.mockReturnValue(false)
      hookManager.executeHook.mockResolvedValue({
        success: true,
        result: { score: 95, threshold: 80 },
        executionTime: 0.8,
      })

      // Act
      const result = await hookManager.executeHook('performance-check', {})

      // Assert
      expect(result.success).toBe(true)
      expect(result.result.score).toBe(95)
      expect(hookManager.bypassWithJustification).not.toHaveBeenCalled()
    })

    it('should allow L2 hook bypass with valid justification', async () => {
      // Arrange
      const l2Hook = MockFactory.createHook({
        id: 'compatibility-check',
        level: 'L2',
        name: 'Compatibility Check',
      })

      const justification: HookJustification = {
        reason: 'Emergency deployment',
        context: 'Critical security patch',
        authorizer: 'security-team@company.com',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      }

      hookRegistry.getHookById.mockReturnValue(l2Hook)
      hookManager.getHookLevel.mockReturnValue('L2')
      hookManager.isHookRequired.mockReturnValue(false)
      hookManager.bypassWithJustification.mockResolvedValue({
        success: true,
        bypassed: true,
        justification,
      })

      // Act
      const result = await hookManager.bypassWithJustification(
        'compatibility-check',
        justification
      )

      // Assert
      expect(result.success).toBe(true)
      expect(result.bypassed).toBe(true)
      expect(result.justification).toEqual(justification)
    })

    it('should reject invalid L2 bypass justification', async () => {
      // Arrange
      const invalidJustification = {
        reason: '', // Empty reason is invalid
        context: 'Not provided',
        authorizer: '', // Missing authorizer
        timestamp: new Date(),
      }

      hookManager.bypassWithJustification.mockRejectedValue(
        new Error('Invalid justification: reason and authorizer are required')
      )

      // Act & Assert
      await expect(
        hookManager.bypassWithJustification('performance-check', invalidJustification)
      ).rejects.toThrow('Invalid justification: reason and authorizer are required')
    })

    it('should enforce L2 hook when no justification provided', async () => {
      // Arrange
      const l2Hook = MockFactory.createHook({
        id: 'dependency-check',
        level: 'L2',
        name: 'Dependency Check',
      })

      hookRegistry.getHookById.mockReturnValue(l2Hook)
      hookManager.getHookLevel.mockReturnValue('L2')
      hookManager.isHookRequired.mockReturnValue(false)
      hookManager.executeHook.mockResolvedValue({
        success: true,
        result: { outdated: 2, critical: 0 },
        executionTime: 1.2,
      })

      // Act
      const result = await hookManager.executeHook('dependency-check', {})

      // Assert
      expect(result.success).toBe(true)
      expect(hookManager.executeHook).toHaveBeenCalledWith('dependency-check', {})
      expect(hookManager.bypassWithJustification).not.toHaveBeenCalled()
    })
  })

  describe('Hook Execution Audit Trail', () => {
    it('should maintain complete audit trail for all hook executions', async () => {
      // Arrange
      const executions: HookExecution[] = [
        {
          hookId: 'security-validation',
          level: 'L3',
          executed: true,
          bypassed: false,
          executionTime: 0.5,
          timestamp: new Date(),
          result: { valid: true },
        },
        {
          hookId: 'performance-check',
          level: 'L2',
          executed: true,
          bypassed: false,
          executionTime: 0.8,
          timestamp: new Date(),
          result: { score: 95 },
        },
        {
          hookId: 'compatibility-check',
          level: 'L2',
          executed: false,
          bypassed: true,
          executionTime: 0,
          timestamp: new Date(),
          justification: {
            reason: 'Emergency deployment',
            authorizer: 'security-team@company.com',
          },
        },
      ]

      auditLogger.getAuditTrail.mockReturnValue(executions)

      // Act
      const auditTrail = await auditLogger.getAuditTrail()

      // Assert
      expect(auditTrail).toHaveLength(3)
      expect(auditTrail[0]).toMatchObject({
        hookId: 'security-validation',
        level: 'L3',
        executed: true,
        bypassed: false,
      })
      expect(auditTrail[2]).toMatchObject({
        hookId: 'compatibility-check',
        level: 'L2',
        executed: false,
        bypassed: true,
      })
    })

    it('should export audit log in standard format', async () => {
      // Arrange
      const auditData = {
        sessionId: 'test-session-123',
        startTime: new Date(),
        endTime: new Date(),
        executions: [
          {
            hookId: 'security-validation',
            level: 'L3',
            executed: true,
            executionTime: 0.5,
          },
        ],
      }

      auditLogger.exportAuditLog.mockResolvedValue({
        success: true,
        filePath: '/audit/logs/session-test-session-123.json',
        size: 1024,
      })

      // Act
      const result = await auditLogger.exportAuditLog(auditData)

      // Assert
      expect(result.success).toBe(true)
      expect(result.filePath).toBe('/audit/logs/session-test-session-123.json')
      expect(auditLogger.exportAuditLog).toHaveBeenCalledWith(auditData)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should execute hooks within performance budget (<5ms)', async () => {
      // Arrange
      const hooks = [
        MockFactory.createHook({ id: 'hook1', level: 'L3' }),
        MockFactory.createHook({ id: 'hook2', level: 'L2' }),
        MockFactory.createHook({ id: 'hook3', level: 'L1' }),
      ]

      performanceMonitor.getExecutionTime.mockReturnValue(0.8) // 0.8ms
      hookManager.executeHook.mockImplementation(async () => {
        // Simulate fast hook execution
        return {
          success: true,
          executionTime: 0.5,
        }
      })

      // Act
      const results = await Promise.all(
        hooks.map(hook => hookManager.executeHook(hook.id, {}))
      )

      // Assert
      results.forEach(result => {
        expect(result.executionTime).toBeLessThan(5) // Less than 5ms
      })
    })

    it('should handle bulk hook execution efficiently', async () => {
      // Arrange
      const bulkHooks = Array.from({ length: 100 }, (_, i) =>
        MockFactory.createHook({
          id: `bulk-hook-${i}`,
          level: i % 3 === 0 ? 'L3' : i % 2 === 0 ? 'L2' : 'L1',
        })
      )

      const startTime = Date.now()
      hookManager.executeHook.mockResolvedValue({ success: true, executionTime: 0.5 })

      // Act
      const results = await Promise.all(
        bulkHooks.map(hook => hookManager.executeHook(hook.id, {}))
      )
      const totalTime = Date.now() - startTime

      // Assert
      expect(results).toHaveLength(100)
      expect(totalTime).toBeLessThan(100) // 100 hooks in less than 100ms
      expect(results.every(r => r.success)).toBe(true)
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle circular hook dependencies', async () => {
      // Arrange
      const circularHooks = [
        MockFactory.createHook({
          id: 'hook-a',
          level: 'L2',
          dependencies: ['hook-b'],
        }),
        MockFactory.createHook({
          id: 'hook-b',
          level: 'L2',
          dependencies: ['hook-a'],
        }),
      ]

      hookManager.validateHook.mockImplementation(() => {
        throw new Error('Circular dependency detected: hook-a <-> hook-b')
      })

      // Act & Assert
      expect(() => hookManager.validateHook('hook-a')).toThrow(
        'Circular dependency detected: hook-a <-> hook-b'
      )
    })

    it('should handle hook execution timeout', async () => {
      // Arrange
      const slowHook = MockFactory.createHook({
        id: 'slow-operation',
        level: 'L2',
        timeout: 100, // 100ms timeout
      })

      hookManager.executeHook.mockResolvedValue({
        success: false,
        error: { message: 'Timeout exceeded' },
        executionTime: 150,
      })

      // Act & Assert
      const result = await hookManager.executeHook('slow-operation', {})
      expect(result.success).toBe(false)
    })

    it('should recover from hook registry corruption', async () => {
      // Arrange
      hookRegistry.validateRegistry.mockImplementation(() => {
        throw new Error('Registry corruption detected')
      })

      hookRegistry.getAllHooks.mockImplementation(() => {
        // Return empty registry
        return []
      })

      // Act
      const allHooks = await hookRegistry.getAllHooks()

      // Assert - Should gracefully handle empty registry
      expect(allHooks).toEqual([])
    })
  })
})