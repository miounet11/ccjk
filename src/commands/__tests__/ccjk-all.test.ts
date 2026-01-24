/**
 * CCJK All Command Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ccjkAll } from '../ccjk-all'
import { CloudSetupOrchestrator } from '../../orchestrators/cloud-setup-orchestrator'
import { createCompleteCloudClient } from '../../cloud-client'

// Mock dependencies
vi.mock('../../orchestrators/cloud-setup-orchestrator', () => ({
  CloudSetupOrchestrator: vi.fn(() => ({
    executeWithFallback: vi.fn(),
    executeCloudSetup: vi.fn(),
  })),
}))

vi.mock('../../cloud-client', () => ({
  createCompleteCloudClient: vi.fn(() => ({
    healthCheck: vi.fn(),
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
  let mockOrchestrator: any
  let mockCloudClient: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockOrchestrator = (CloudSetupOrchestrator as any).mock.results[0]?.value
    mockCloudClient = (createCompleteCloudClient as any).mock.results[0]?.value
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

      mockOrchestrator.executeWithFallback.mockResolvedValue(mockResult)
      mockCloudClient.healthCheck.mockResolvedValue({ version: '1.0.0' })

      const result = await ccjkAll()

      expect(result).toEqual(mockResult)
      expect(CloudSetupOrchestrator).toHaveBeenCalledWith({
        strategy: 'cloud-smart',
        useCloud: true,
        cloudEndpoint: undefined,
        cacheStrategy: 'normal',
        lang: undefined,
      })
    })

    it('should handle cloud unavailability gracefully', async () => {
      mockCloudClient.healthCheck.mockRejectedValue(new Error('Network error'))

      const mockResult = {
        success: true,
        requestId: 'local-fallback',
        confidence: 70,
        installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 3000,
      }

      mockOrchestrator.executeWithFallback.mockResolvedValue(mockResult)

      const result = await ccjkAll({ useCloud: true })

      expect(result).toEqual(mockResult)
      // Should have fallen back to local mode
    })

    it('should handle JSON output mode', async () => {
      const mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 95,
        installed: { skills: ['ts-best-practices'], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 5000,
      }

      mockOrchestrator.executeWithFallback.mockResolvedValue(mockResult)
      mockCloudClient.healthCheck.mockResolvedValue({ version: '1.0.0' })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await ccjkAll({ json: true })

      expect(result).toEqual(mockResult)
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          status: 'starting',
          options: expect.objectContaining({ json: true }),
        })
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          status: 'completed',
          result: mockResult,
          duration: expect.any(Number),
        })
      )

      consoleSpy.mockRestore()
    })

    it('should handle quiet mode', async () => {
      const mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 95,
        installed: { skills: ['ts-best-practices'], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 5000,
      }

      mockOrchestrator.executeWithFallback.mockResolvedValue(mockResult)
      mockCloudClient.healthCheck.mockResolvedValue({ version: '1.0.0' })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await ccjkAll({ quiet: true })

      expect(result).toEqual(mockResult)
      // In quiet mode, should not display header or completion messages
      const output = consoleSpy.mock.calls.map(call => call[0]).join('')
      expect(output).not.toContain('━'.repeat(60))

      consoleSpy.mockRestore()
    })
  })

  describe('error handling', () => {
    it('should handle orchestrator failure', async () => {
      mockOrchestrator.executeWithFallback.mockRejectedValue(new Error('Setup failed'))
      mockCloudClient.healthCheck.mockResolvedValue({ version: '1.0.0' })

      await expect(ccjkAll()).rejects.toThrow('Setup failed')
    })

    it('should handle network errors with user-friendly message', async () => {
      const networkError = new Error('Network error')
      ;(networkError as any).code = 'ENOTFOUND'
      mockOrchestrator.executeWithFallback.mockRejectedValue(networkError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(ccjkAll()).rejects.toThrow('Network error')

      const errorOutput = consoleSpy.mock.calls.map(call => call[0]).join('')
      expect(errorOutput).toContain('Setup failed')
      expect(errorOutput).toContain('Network error')

      consoleSpy.mockRestore()
    })

    it('should handle JSON error output', async () => {
      const error = new Error('Test error')
      mockOrchestrator.executeWithFallback.mockRejectedValue(error)

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await expect(ccjkAll({ json: true })).rejects.toThrow('Test error')

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          status: 'error',
          error: 'Test error',
          duration: expect.any(Number),
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('help and version', () => {
    it('should display help', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await ccjkAll({ help: true })

      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      expect(output).toContain('CCJK All Command Help')
      expect(output).toContain('Usage:')
      expect(output).toContain('Options:')
      expect(output).toContain('Examples:')

      consoleSpy.mockRestore()
    })

    it('should display version', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await ccjkAll({ version: true })

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/ccjk v\d+\.\d+\.\d+/))

      consoleSpy.mockRestore()
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
        duration: 5000,
      }

      mockOrchestrator.executeWithFallback.mockResolvedValue(mockResult)
      mockCloudClient.healthCheck.mockResolvedValue({ version: '1.0.0' })

      await ccjkAll({ lang: 'zh-CN' })

      expect(i18n.changeLanguage).toHaveBeenCalledWith('zh-CN')
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
        duration: 5000,
      }

      mockOrchestrator.executeWithFallback.mockResolvedValue(mockResult)
      mockCloudClient.healthCheck.mockResolvedValue({ version: '1.0.0' })

      await ccjkAll({ strategy: 'cloud-smart' })

      expect(CloudSetupOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: 'cloud-smart',
        })
      )
    })

    it('should use local-fallback strategy', async () => {
      const mockResult = {
        success: true,
        requestId: 'local-fallback',
        confidence: 70,
        installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 3000,
      }

      mockOrchestrator.executeWithFallback.mockResolvedValue(mockResult)

      await ccjkAll({ strategy: 'local-fallback', skipCloudCheck: true })

      expect(CloudSetupOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: 'local-fallback',
        })
      )
    })
  })

  describe('report generation', () => {
    it('should generate markdown report', async () => {
      const mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 95,
        installed: {
          skills: ['ts-best-practices'],
          mcpServices: ['typescript-language-server'],
          agents: [],
          hooks: [],
        },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 5000,
        insights: {
          insights: ['Cloud recommendations generated'],
          productivityImprovements: [],
          nextRecommendations: ['Add testing framework'],
        },
      }

      mockOrchestrator.executeWithFallback.mockResolvedValue(mockResult)
      mockCloudClient.healthCheck.mockResolvedValue({ version: '1.0.0' })

      const result = await ccjkAll({
        generateReport: true,
        reportFormat: 'markdown',
      })

      expect(result.reportPath).toBeDefined()
      expect(result.reportPath).toMatch(/ccjk-setup-report.*\.md$/)
    })

    it('should generate JSON report', async () => {
      const mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 95,
        installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 5000,
      }

      mockOrchestrator.executeWithFallback.mockResolvedValue(mockResult)
      mockCloudClient.healthCheck.mockResolvedValue({ version: '1.0.0' })

      const result = await ccjkAll({
        generateReport: true,
        reportFormat: 'json',
      })

      expect(result.reportPath).toBeDefined()
      expect(result.reportPath).toMatch(/ccjk-setup-report.*\.json$/)
    })
  })
})