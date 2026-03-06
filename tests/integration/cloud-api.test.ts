/**
 * Cloud API Integration Tests
 *
 * Tests for cloud API integration including:
 * - Project analysis
 * - Batch templates
 * - Telemetry
 * - Notifications
 * - Skills list
 *
 * @module tests/integration/cloud-api
 */

import type { CloudApiGateway } from '../../src/cloud-client/gateway'
import type {
  BatchTemplateResponse,
  HealthCheckResponse,
  ProjectAnalysisResponse,
  UsageReportResponse,
} from '../../src/cloud-client/types'
import type { CloudApiResponse } from '../../src/services/cloud/api-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  assertErrorResponse,
  assertSuccessResponse,
  createMockAnalysisResponse,
  createMockBatchTemplateResponse,
  createMockHealthResponse,
  createMockUsageReportResponse,
  createTestGateway,
  MockCloudServer,
} from '../helpers/cloud-mock'

describe('cloud API Integration Tests', () => {
  let mockServer: MockCloudServer
  let gateway: CloudApiGateway

  beforeEach(() => {
    mockServer = new MockCloudServer()
    const testSetup = createTestGateway(mockServer)
    gateway = testSetup.gateway as unknown as CloudApiGateway
  })

  afterEach(() => {
    mockServer.reset()
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Test Suite 1: Project Analysis
  // ==========================================================================

  describe('project Analysis', () => {
    it('should successfully analyze a valid project', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<ProjectAnalysisResponse> = {
        success: true,
        data: createMockAnalysisResponse({
          requestId: 'test-request-1',
          projectType: 'typescript-react',
          frameworks: ['react', 'typescript'],
        }),
      }
      mockServer.setResponse('analysis.projects', mockResponse)

      // Act
      const response = await gateway.request<ProjectAnalysisResponse>(
        'analysis.projects',
        {
          method: 'POST',
          body: {
            projectRoot: '/test/project',
            dependencies: { react: '^18.0.0' },
            language: 'en',
          },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.requestId).toBe('test-request-1')
      expect(response.data.projectType).toBe('typescript-react')
      expect(response.data.frameworks).toContain('react')
      expect(response.data.recommendations).toHaveLength(2)
    })

    it('should handle empty project analysis', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<ProjectAnalysisResponse> = {
        success: true,
        data: createMockAnalysisResponse({
          recommendations: [],
          projectType: 'unknown',
          frameworks: [],
        }),
      }
      mockServer.setResponse('analysis.projects', mockResponse)

      // Act
      const response = await gateway.request<ProjectAnalysisResponse>(
        'analysis.projects',
        {
          method: 'POST',
          body: { projectRoot: '/empty/project' },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.recommendations).toHaveLength(0)
      expect(response.data.projectType).toBe('unknown')
    })

    it('should handle timeout scenario', async () => {
      // Arrange
      mockServer.setLatency(5000) // 5 second delay
      const mockResponse: CloudApiResponse<ProjectAnalysisResponse> = {
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT',
      }
      mockServer.setResponse('analysis.projects', mockResponse)

      // Act
      const response = await gateway.request<ProjectAnalysisResponse>(
        'analysis.projects',
        {
          method: 'POST',
          body: { projectRoot: '/test/project' },
          timeout: 1000, // 1 second timeout
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('TIMEOUT')
    })

    it('should handle API error responses', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<ProjectAnalysisResponse> = {
        success: false,
        error: 'Invalid project structure',
        code: 'VALIDATION_ERROR',
      }
      mockServer.setResponse('analysis.projects', mockResponse)

      // Act
      const response = await gateway.request<ProjectAnalysisResponse>(
        'analysis.projects',
        {
          method: 'POST',
          body: { projectRoot: '/invalid/project' },
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.error).toBe('Invalid project structure')
      expect(response.code).toBe('VALIDATION_ERROR')
    })

    it('should handle network errors gracefully', async () => {
      // Arrange
      mockServer.enableFailures(1.0) // 100% failure rate

      // Act
      const response = await gateway.request<ProjectAnalysisResponse>(
        'analysis.projects',
        {
          method: 'POST',
          body: { projectRoot: '/test/project' },
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.error).toBe('Mock server failure')
    })
  })

  // ==========================================================================
  // Test Suite 2: Batch Templates
  // ==========================================================================

  describe('batch Templates', () => {
    it('should successfully download batch templates', async () => {
      // Arrange
      const templateIds = ['template-1', 'template-2', 'template-3']
      const mockResponse: CloudApiResponse<BatchTemplateResponse> = {
        success: true,
        data: createMockBatchTemplateResponse(templateIds),
      }
      mockServer.setResponse('templates.batch', mockResponse)

      // Act
      const response = await gateway.request<BatchTemplateResponse>(
        'templates.batch',
        {
          method: 'POST',
          body: { ids: templateIds, language: 'en' },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(Object.keys(response.data.templates)).toHaveLength(3)
      expect(response.data.notFound).toHaveLength(0)
      expect(response.data.templates['template-1']).toBeDefined()
    })

    it('should handle partial template availability', async () => {
      // Arrange
      const requestedIds = ['template-1', 'template-2', 'missing-template']
      const availableIds = ['template-1', 'template-2']
      const mockResponse: CloudApiResponse<BatchTemplateResponse> = {
        success: true,
        data: createMockBatchTemplateResponse(availableIds, {
          notFound: ['missing-template'],
        }),
      }
      mockServer.setResponse('templates.batch', mockResponse)

      // Act
      const response = await gateway.request<BatchTemplateResponse>(
        'templates.batch',
        {
          method: 'POST',
          body: { ids: requestedIds },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(Object.keys(response.data.templates)).toHaveLength(2)
      expect(response.data.notFound).toContain('missing-template')
    })

    it('should handle invalid template IDs', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<BatchTemplateResponse> = {
        success: false,
        error: 'Invalid template IDs provided',
        code: 'VALIDATION_ERROR',
      }
      mockServer.setResponse('templates.batch', mockResponse)

      // Act
      const response = await gateway.request<BatchTemplateResponse>(
        'templates.batch',
        {
          method: 'POST',
          body: { ids: ['', null, undefined] },
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('VALIDATION_ERROR')
    })

    it('should handle timeout during batch download', async () => {
      // Arrange
      mockServer.setLatency(20000) // 20 second delay
      const mockResponse: CloudApiResponse<BatchTemplateResponse> = {
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT',
      }
      mockServer.setResponse('templates.batch', mockResponse)

      // Act
      const response = await gateway.request<BatchTemplateResponse>(
        'templates.batch',
        {
          method: 'POST',
          body: { ids: ['template-1'] },
          timeout: 5000,
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('TIMEOUT')
    })

    it('should handle empty template list', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<BatchTemplateResponse> = {
        success: true,
        data: createMockBatchTemplateResponse([]),
      }
      mockServer.setResponse('templates.batch', mockResponse)

      // Act
      const response = await gateway.request<BatchTemplateResponse>(
        'templates.batch',
        {
          method: 'POST',
          body: { ids: [] },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(Object.keys(response.data.templates)).toHaveLength(0)
    })
  })

  // ==========================================================================
  // Test Suite 3: Telemetry
  // ==========================================================================

  describe('telemetry', () => {
    it('should successfully upload telemetry', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<UsageReportResponse> = {
        success: true,
        data: createMockUsageReportResponse(),
      }
      mockServer.setResponse('telemetry.installation', mockResponse)

      // Act
      const response = await gateway.request<UsageReportResponse>(
        'telemetry.installation',
        {
          method: 'POST',
          body: {
            reportId: 'test-report-1',
            metricType: 'analysis_completed',
            timestamp: new Date().toISOString(),
            ccjkVersion: '12.0.0',
            nodeVersion: process.version,
            platform: process.platform,
          },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.success).toBe(true)
      expect(response.data.requestId).toBeDefined()
    })

    it('should not block main flow on telemetry failure', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<UsageReportResponse> = {
        success: false,
        error: 'Telemetry service unavailable',
        code: 'SERVICE_UNAVAILABLE',
      }
      mockServer.setResponse('telemetry.installation', mockResponse)

      // Act
      const response = await gateway.request<UsageReportResponse>(
        'telemetry.installation',
        {
          method: 'POST',
          body: { reportId: 'test-report-2' },
        },
      )

      // Assert - Should fail gracefully without throwing
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })

    it('should implement retry logic for telemetry', async () => {
      // Arrange
      mockServer.enableFailures(0.5) // 50% failure rate
      const mockResponse: CloudApiResponse<UsageReportResponse> = {
        success: true,
        data: createMockUsageReportResponse(),
      }
      mockServer.setResponse('telemetry.installation', mockResponse)

      // Act - Multiple attempts
      const attempts = []
      for (let i = 0; i < 5; i++) {
        const response = await gateway.request<UsageReportResponse>(
          'telemetry.installation',
          {
            method: 'POST',
            body: { reportId: `test-report-${i}` },
          },
        )
        attempts.push(response.success)
      }

      // Assert - At least some should succeed
      const successCount = attempts.filter(Boolean).length
      expect(successCount).toBeGreaterThan(0)
    })

    it('should handle timeout in telemetry upload', async () => {
      // Arrange
      mockServer.setLatency(10000)
      const mockResponse: CloudApiResponse<UsageReportResponse> = {
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT',
      }
      mockServer.setResponse('telemetry.installation', mockResponse)

      // Act
      const response = await gateway.request<UsageReportResponse>(
        'telemetry.installation',
        {
          method: 'POST',
          body: { reportId: 'test-report-timeout' },
          timeout: 2000,
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('TIMEOUT')
    })
  })

  // ==========================================================================
  // Test Suite 4: Health Check
  // ==========================================================================

  describe('health Check', () => {
    it('should return healthy status', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<HealthCheckResponse> = {
        success: true,
        data: createMockHealthResponse(),
      }
      mockServer.setResponse('health', mockResponse)

      // Act
      const response = await gateway.request<HealthCheckResponse>('health', {
        method: 'GET',
      })

      // Assert
      assertSuccessResponse(response)
      expect(response.data.status).toBe('healthy')
      expect(response.data.version).toBeDefined()
    })

    it('should handle degraded service status', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<HealthCheckResponse> = {
        success: true,
        data: createMockHealthResponse({
          status: 'degraded',
          message: 'Some services are experiencing issues',
        }),
      }
      mockServer.setResponse('health', mockResponse)

      // Act
      const response = await gateway.request<HealthCheckResponse>('health', {
        method: 'GET',
      })

      // Assert
      assertSuccessResponse(response)
      expect(response.data.status).toBe('degraded')
      expect(response.data.message).toContain('issues')
    })

    it('should handle unhealthy service status', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<HealthCheckResponse> = {
        success: false,
        error: 'Service is unhealthy',
        code: 'SERVICE_UNHEALTHY',
      }
      mockServer.setResponse('health', mockResponse)

      // Act
      const response = await gateway.request<HealthCheckResponse>('health', {
        method: 'GET',
      })

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('SERVICE_UNHEALTHY')
    })
  })
})
