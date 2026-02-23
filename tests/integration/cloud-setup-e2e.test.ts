/**
 * Cloud Setup End-to-End Integration Tests
 *
 * Tests complete cloud setup workflows:
 * - Full setup flow (analyze → recommend → download → install)
 * - Fallback to local recommendations
 * - Error recovery
 * - Performance benchmarks
 *
 * @module tests/integration/cloud-setup-e2e
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudSetupOrchestrator } from '../../src/orchestrators/cloud-setup-orchestrator'
import type {
  BatchTemplateResponse,
  ProjectAnalysisResponse,
} from '../../src/cloud-client/types'
import type { CloudApiResponse } from '../../src/services/cloud/api-client'
import {
  createMockAnalysisResponse,
  createMockBatchTemplateResponse,
  createMockRecommendation,
  createTestGateway,
  MockCloudServer,
} from '../helpers/cloud-mock'

// Mock gateway storage
let globalMockGateway: any = null

// Mock dependencies
vi.mock('../../src/cloud-client/gateway', () => {
  return {
    CloudApiGateway: vi.fn().mockImplementation(() => globalMockGateway),
    createDefaultGateway: vi.fn(() => globalMockGateway),
  }
})

vi.mock('../../src/analyzers', () => ({
  analyzeProject: vi.fn(() =>
    Promise.resolve({
      projectType: 'typescript-react',
      dependencies: {
        direct: [
          { name: 'react', version: '18.0.0', isDev: false },
          { name: 'typescript', version: '5.0.0', isDev: true },
        ],
      },
      frameworks: [{ name: 'react', version: '18.0.0' }],
      languages: [{ language: 'TypeScript', percentage: 80 }],
      fingerprint: 'test-fingerprint',
    }),
  ),
}))

vi.mock('../../src/commands/ccjk-skills', () => ({
  ccjkSkills: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../src/commands/ccjk-mcp', () => ({
  ccjkMcp: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../src/commands/ccjk-agents', () => ({
  ccjkAgents: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../src/commands/ccjk-hooks', () => ({
  ccjkHooks: vi.fn(() => Promise.resolve()),
}))

describe('Cloud Setup E2E Integration Tests', () => {
  let mockServer: MockCloudServer
  let orchestrator: CloudSetupOrchestrator

  beforeEach(() => {
    mockServer = new MockCloudServer()
    const testSetup = createTestGateway(mockServer)

    // Set the mock gateway globally
    globalMockGateway = testSetup.gateway

    orchestrator = new CloudSetupOrchestrator({
      lang: 'en',
      useCloud: true,
      submitTelemetry: false,
    })
  })

  afterEach(() => {
    mockServer.reset()
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Test Suite 1: Complete Setup Flow
  // ==========================================================================

  describe('Complete Setup Flow', () => {
    it('should complete full cloud setup successfully', async () => {
      // Arrange - Mock analysis response
      const analysisResponse: CloudApiResponse<ProjectAnalysisResponse> = {
        success: true,
        data: createMockAnalysisResponse({
          requestId: 'e2e-test-1',
          recommendations: [
            createMockRecommendation({
              id: 'ts-best-practices',
              category: 'skill',
              relevanceScore: 0.98,
            }),
            createMockRecommendation({
              id: 'react-patterns',
              category: 'skill',
              relevanceScore: 0.95,
            }),
          ],
        }),
      }
      mockServer.setResponse('analysis.projects', analysisResponse)

      // Arrange - Mock template download
      const templateResponse: CloudApiResponse<BatchTemplateResponse> = {
        success: true,
        data: createMockBatchTemplateResponse(['ts-best-practices', 'react-patterns']),
      }
      mockServer.setResponse('templates.batch', templateResponse)

      // Act
      const result = await orchestrator.executeCloudSetup({
        interactive: false,
        useCloud: true,
        submitTelemetry: false,
        generateReport: false,
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.duration).toBeGreaterThan(0)
      expect(result.installed.skills.length).toBeGreaterThanOrEqual(0)
    }, 30000) // 30 second timeout for E2E test

    it('should handle large project analysis', async () => {
      // Arrange - Large project with many dependencies
      const largeAnalysisResponse: CloudApiResponse<ProjectAnalysisResponse> = {
        success: true,
        data: createMockAnalysisResponse({
          recommendations: Array.from({ length: 20 }, (_, i) =>
            createMockRecommendation({
              id: `skill-${i}`,
              category: 'skill',
              relevanceScore: 0.9 - i * 0.01,
            }),
          ),
        }),
      }
      mockServer.setResponse('analysis.projects', largeAnalysisResponse)

      const templateIds = Array.from({ length: 20 }, (_, i) => `skill-${i}`)
      const templateResponse: CloudApiResponse<BatchTemplateResponse> = {
        success: true,
        data: createMockBatchTemplateResponse(templateIds),
      }
      mockServer.setResponse('templates.batch', templateResponse)

      // Act
      const startTime = Date.now()
      const result = await orchestrator.executeCloudSetup({
        interactive: false,
        useCloud: true,
        submitTelemetry: false,
      })
      const duration = Date.now() - startTime

      // Assert
      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(15000) // Should complete within 15 seconds
    }, 30000)

    it('should generate report when requested', async () => {
      // Arrange
      const analysisResponse: CloudApiResponse<ProjectAnalysisResponse> = {
        success: true,
        data: createMockAnalysisResponse(),
      }
      mockServer.setResponse('analysis.projects', analysisResponse)

      const templateResponse: CloudApiResponse<BatchTemplateResponse> = {
        success: true,
        data: createMockBatchTemplateResponse(['ts-best-practices']),
      }
      mockServer.setResponse('templates.batch', templateResponse)

      // Act
      const result = await orchestrator.executeCloudSetup({
        interactive: false,
        useCloud: true,
        submitTelemetry: false,
        generateReport: true,
        reportFormat: 'markdown',
      })

      // Assert
      expect(result.reportPath).toBeDefined()
      if (result.reportPath) {
        expect(result.reportPath).toMatch(/\.md$/)
      }
    }, 30000)
  })

  // ==========================================================================
  // Test Suite 2: Fallback Scenarios
  // ==========================================================================

  describe('Fallback to Local Recommendations', () => {
    it('should fallback to local when cloud is unavailable', async () => {
      // Arrange - Simulate cloud unavailability
      mockServer.enableFailures(1.0)

      // Act
      const result = await orchestrator.executeWithFallback({
        interactive: false,
        useCloud: true,
        submitTelemetry: false,
      })

      // Assert - Should still complete with local recommendations
      expect(result).toBeDefined()
      expect(result.confidence).toBeLessThan(100) // Local has lower confidence
    }, 30000)

    it('should fallback on network timeout', async () => {
      // Arrange - Simulate network timeout
      mockServer.setLatency(15000) // 15 second delay
      const timeoutResponse: CloudApiResponse<ProjectAnalysisResponse> = {
        success: false,
        error: 'Network timeout',
        code: 'TIMEOUT',
      }
      mockServer.setResponse('analysis.projects', timeoutResponse)

      // Act
      const result = await orchestrator.executeWithFallback({
        interactive: false,
        useCloud: true,
        submitTelemetry: false,
      })

      // Assert
      expect(result).toBeDefined()
      expect(result.duration).toBeGreaterThan(0)
    }, 30000)

    it('should use local recommendations when explicitly disabled', async () => {
      // Act
      const result = await orchestrator.executeCloudSetup({
        interactive: false,
        useCloud: false, // Explicitly disable cloud
        submitTelemetry: false,
      })

      // Assert
      expect(result).toBeDefined()
      expect(result.confidence).toBeLessThanOrEqual(70) // Local confidence cap
    }, 30000)
  })

  // ==========================================================================
  // Test Suite 3: Error Recovery
  // ==========================================================================

  describe('Error Recovery', () => {
    it('should recover from partial template download failure', async () => {
      // Arrange - Analysis succeeds
      const analysisResponse: CloudApiResponse<ProjectAnalysisResponse> = {
        success: true,
        data: createMockAnalysisResponse({
          recommendations: [
            createMockRecommendation({ id: 'skill-1', category: 'skill' }),
            createMockRecommendation({ id: 'skill-2', category: 'skill' }),
            createMockRecommendation({ id: 'skill-3', category: 'skill' }),
          ],
        }),
      }
      mockServer.setResponse('analysis.projects', analysisResponse)

      // Arrange - Partial template download (some missing)
      const templateResponse: CloudApiResponse<BatchTemplateResponse> = {
        success: true,
        data: createMockBatchTemplateResponse(['skill-1', 'skill-2'], {
          notFound: ['skill-3'],
        }),
      }
      mockServer.setResponse('templates.batch', templateResponse)

      // Act
      const result = await orchestrator.executeCloudSetup({
        interactive: false,
        useCloud: true,
        submitTelemetry: false,
      })

      // Assert - Should still succeed with available templates
      expect(result.success).toBe(true)
      expect(result.installed.skills.length + result.failed.skills.length).toBeGreaterThan(0)
    }, 30000)

    it('should handle installation failures gracefully', async () => {
      // Arrange
      const analysisResponse: CloudApiResponse<ProjectAnalysisResponse> = {
        success: true,
        data: createMockAnalysisResponse(),
      }
      mockServer.setResponse('analysis.projects', analysisResponse)

      const templateResponse: CloudApiResponse<BatchTemplateResponse> = {
        success: true,
        data: createMockBatchTemplateResponse(['skill-1']),
      }
      mockServer.setResponse('templates.batch', templateResponse)

      // Mock installation failure
      const { ccjkSkills } = require('../../src/commands/ccjk-skills')
      ccjkSkills.mockRejectedValueOnce(new Error('Installation failed'))

      // Act
      const result = await orchestrator.executeCloudSetup({
        interactive: false,
        useCloud: true,
        submitTelemetry: false,
      })

      // Assert - Should complete but report failures
      expect(result).toBeDefined()
      expect(result.failed.skills.length).toBeGreaterThan(0)
    }, 30000)
  })

  // ==========================================================================
  // Test Suite 4: Performance Benchmarks
  // ==========================================================================

  describe('Performance Benchmarks', () => {
    it('should complete setup within performance targets', async () => {
      // Arrange
      const analysisResponse: CloudApiResponse<ProjectAnalysisResponse> = {
        success: true,
        data: createMockAnalysisResponse(),
      }
      mockServer.setResponse('analysis.projects', analysisResponse)

      const templateResponse: CloudApiResponse<BatchTemplateResponse> = {
        success: true,
        data: createMockBatchTemplateResponse(['skill-1', 'skill-2']),
      }
      mockServer.setResponse('templates.batch', templateResponse)

      // Act
      const startTime = Date.now()
      const result = await orchestrator.executeCloudSetup({
        interactive: false,
        useCloud: true,
        submitTelemetry: false,
      })
      const totalDuration = Date.now() - startTime

      // Assert - Performance targets from CLAUDE.md
      expect(totalDuration).toBeLessThan(10000) // < 10s total
      expect(result.duration).toBeLessThan(10000)
    }, 30000)

    it('should handle concurrent requests efficiently', async () => {
      // Arrange
      const analysisResponse: CloudApiResponse<ProjectAnalysisResponse> = {
        success: true,
        data: createMockAnalysisResponse(),
      }
      mockServer.setResponse('analysis.projects', analysisResponse)

      const templateResponse: CloudApiResponse<BatchTemplateResponse> = {
        success: true,
        data: createMockBatchTemplateResponse(['skill-1']),
      }
      mockServer.setResponse('templates.batch', templateResponse)

      // Act - Run multiple setups concurrently
      const startTime = Date.now()
      const results = await Promise.all([
        orchestrator.executeCloudSetup({
          interactive: false,
          useCloud: true,
          submitTelemetry: false,
        }),
        orchestrator.executeCloudSetup({
          interactive: false,
          useCloud: true,
          submitTelemetry: false,
        }),
        orchestrator.executeCloudSetup({
          interactive: false,
          useCloud: true,
          submitTelemetry: false,
        }),
      ])
      const totalDuration = Date.now() - startTime

      // Assert - Should complete all within reasonable time
      expect(results).toHaveLength(3)
      expect(totalDuration).toBeLessThan(20000) // < 20s for 3 concurrent
      results.forEach((result) => {
        expect(result).toBeDefined()
      })
    }, 40000)
  })
})
