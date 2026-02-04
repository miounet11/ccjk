/**
 * CCJK All Command Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudSetupOrchestrator } from '../../orchestrators/cloud-setup-orchestrator'
import { ccjkAll } from '../ccjk-all'

// Mock dependencies
vi.mock('../../cloud-client', () => ({
  createCompleteCloudClient: vi.fn(() => ({
    healthCheck: vi.fn().mockResolvedValue({ version: '1.0.0' }),
  })),
}))

vi.mock('../../i18n', () => ({
  ensureI18nInitialized: vi.fn(() => Promise.resolve()),
  i18n: {
    changeLanguage: vi.fn(),
    language: 'en',
    t: vi.fn((key: string) => key),
  },
}))

describe('ccjkAll', () => {
  let mockExecuteWithFallback: any

  beforeEach(() => {
    vi.clearAllMocks()
    // Spy on CloudSetupOrchestrator prototype
    mockExecuteWithFallback = vi.spyOn(CloudSetupOrchestrator.prototype, 'executeWithFallback')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('basic functionality', () => {
    it('should execute successfully with default options', async () => {
      const mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 95,
        installed: { skills: ['ts-best-practices'], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 5000,
        insights: {
          insights: ['Cloud recommendations generated'],
          productivityImprovements: [],
          nextRecommendations: [],
        },
      }

      mockExecuteWithFallback.mockResolvedValue(mockResult)

      const result = await ccjkAll()

      expect(result).toEqual(mockResult)
    })

    it('should handle cloud unavailability gracefully', async () => {
      mockExecuteWithFallback.mockResolvedValue({
        success: true,
        requestId: 'fallback-request',
        confidence: 70,
        installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 1000,
      })

      const result = await ccjkAll({ skipCloudCheck: false })

      expect(result).toBeDefined()
    })

    it('should handle JSON output mode', async () => {
      const mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 95,
        installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 1000,
      }

      mockExecuteWithFallback.mockResolvedValue(mockResult)

      const result = await ccjkAll({ json: true })

      expect(result).toEqual(mockResult)
    })

    it('should handle quiet mode', async () => {
      const mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 95,
        installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 1000,
      }

      mockExecuteWithFallback.mockResolvedValue(mockResult)

      const result = await ccjkAll({ quiet: true })

      expect(result).toEqual(mockResult)
    })
  })

  describe('error handling', () => {
    it('should handle orchestrator failure gracefully', async () => {
      const error = new Error('Setup failed')
      mockExecuteWithFallback.mockRejectedValue(error)

      await expect(ccjkAll()).rejects.toThrow('Setup failed')
    })

    it('should handle network errors with user-friendly message', async () => {
      const networkError = new Error('Network error')
      networkError.code = 'ENOTFOUND'
      mockExecuteWithFallback.mockRejectedValue(networkError)

      await expect(ccjkAll()).rejects.toThrow()
    })

    it('should handle JSON error output', async () => {
      const error = new Error('Test error')
      mockExecuteWithFallback.mockRejectedValue(error)

      const result = await ccjkAll({ json: true, quiet: true }).catch(e => e)

      expect(result).toBeInstanceOf(Error)
    })
  })

  describe('help and version', () => {
    it('should display help', async () => {
      const result = await ccjkAll({ help: true })

      expect(result).toBeUndefined()
    })

    it('should display version', async () => {
      const result = await ccjkAll({ version: true })

      expect(result).toBeUndefined()
    })
  })

  describe('language support', () => {
    it('should change language', async () => {
      const mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 95,
        installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 1000,
      }

      mockExecuteWithFallback.mockResolvedValue(mockResult)

      await ccjkAll({ lang: 'zh-CN' })
    })
  })

  describe('strategy options', () => {
    it('should use cloud-smart strategy', async () => {
      const mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 95,
        installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 1000,
      }

      mockExecuteWithFallback.mockResolvedValue(mockResult)

      const result = await ccjkAll({ strategy: 'cloud-smart' })

      expect(result).toEqual(mockResult)
    })

    it('should use local-fallback strategy', async () => {
      const mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 70,
        installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 1000,
      }

      mockExecuteWithFallback.mockResolvedValue(mockResult)

      const result = await ccjkAll({ strategy: 'local-fallback' })

      expect(result).toEqual(mockResult)
    })
  })

  describe('report generation', () => {
    it('should generate markdown report', async () => {
      const mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 95,
        installed: { skills: ['ts-best-practices'], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 5000,
        insights: {
          insights: ['Cloud recommendations generated'],
          productivityImprovements: [],
          nextRecommendations: [],
        },
      }

      mockExecuteWithFallback.mockResolvedValue(mockResult)

      const result = await ccjkAll({ generateReport: true, quiet: true })

      expect(result).toEqual(mockResult)
    })

    it('should generate JSON report', async () => {
      const mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 95,
        installed: { skills: ['ts-best-practices'], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 5000,
      }

      mockExecuteWithFallback.mockResolvedValue(mockResult)

      const result = await ccjkAll({ json: true, generateReport: true })

      expect(result).toEqual(mockResult)
    })
  })
})
