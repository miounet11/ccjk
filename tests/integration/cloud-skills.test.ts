/**
 * Cloud Skills Integration Tests
 *
 * Tests for skills marketplace and synchronization:
 * - Skills list retrieval
 * - Skills search
 * - Skills download
 * - Skills upload
 * - Pagination
 *
 * @module tests/integration/cloud-skills
 */

import type { CloudApiResponse } from '../../src/services/cloud/api-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  assertErrorResponse,
  assertSuccessResponse,
  createTestGateway,
  MockCloudServer,
} from '../helpers/cloud-mock'

// Skills API types
interface Skill {
  id: string
  name: string
  description: string
  version: string
  author: string
  tags: string[]
  downloads: number
  rating: number
}

interface SkillsListResponse {
  skills: Skill[]
  total: number
  page: number
  pageSize: number
}

interface SkillDownloadResponse {
  skillId: string
  content: string
  version: string
}

interface SkillUploadResponse {
  skillId: string
  success: boolean
  message: string
}

describe('cloud Skills Integration Tests', () => {
  let mockServer: MockCloudServer
  let gateway: any

  beforeEach(() => {
    mockServer = new MockCloudServer()
    const testSetup = createTestGateway(mockServer)
    gateway = testSetup.gateway
  })

  afterEach(() => {
    mockServer.reset()
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Test Suite 1: Skills List
  // ==========================================================================

  describe('skills List', () => {
    it('should successfully retrieve skills list', async () => {
      // Arrange
      const mockSkills: Skill[] = [
        {
          id: 'skill-1',
          name: 'TypeScript Helper',
          description: 'TypeScript development utilities',
          version: '1.0.0',
          author: 'CCJK Team',
          tags: ['typescript', 'utility'],
          downloads: 1000,
          rating: 4.5,
        },
        {
          id: 'skill-2',
          name: 'React Patterns',
          description: 'Common React design patterns',
          version: '2.1.0',
          author: 'Community',
          tags: ['react', 'patterns'],
          downloads: 2500,
          rating: 4.8,
        },
      ]

      const mockResponse: CloudApiResponse<SkillsListResponse> = {
        success: true,
        data: {
          skills: mockSkills,
          total: 2,
          page: 1,
          pageSize: 10,
        },
      }
      mockServer.setResponse('skills.list', mockResponse)

      // Act
      const response = await gateway.request<SkillsListResponse>(
        'skills.list',
        {
          method: 'GET',
          query: { page: 1, pageSize: 10 },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.skills).toHaveLength(2)
      expect(response.data.total).toBe(2)
      expect(response.data.skills[0].id).toBe('skill-1')
    })

    it('should handle empty skills list', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<SkillsListResponse> = {
        success: true,
        data: {
          skills: [],
          total: 0,
          page: 1,
          pageSize: 10,
        },
      }
      mockServer.setResponse('skills.list', mockResponse)

      // Act
      const response = await gateway.request<SkillsListResponse>(
        'skills.list',
        {
          method: 'GET',
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.skills).toHaveLength(0)
      expect(response.data.total).toBe(0)
    })

    it('should handle authentication failure', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<SkillsListResponse> = {
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      }
      mockServer.setResponse('skills.list', mockResponse)

      // Act
      const response = await gateway.request<SkillsListResponse>(
        'skills.list',
        {
          method: 'GET',
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('UNAUTHORIZED')
    })

    it('should handle pagination correctly', async () => {
      // Arrange - Page 1
      const page1Response: CloudApiResponse<SkillsListResponse> = {
        success: true,
        data: {
          skills: [
            {
              id: 'skill-1',
              name: 'Skill 1',
              description: 'First skill',
              version: '1.0.0',
              author: 'Author',
              tags: [],
              downloads: 100,
              rating: 4.0,
            },
          ],
          total: 25,
          page: 1,
          pageSize: 10,
        },
      }
      mockServer.setResponse('skills.list', page1Response)

      // Act - Page 1
      const response1 = await gateway.request<SkillsListResponse>(
        'skills.list',
        {
          method: 'GET',
          query: { page: 1, pageSize: 10 },
        },
      )

      // Assert - Page 1
      assertSuccessResponse(response1)
      expect(response1.data.page).toBe(1)
      expect(response1.data.total).toBe(25)

      // Arrange - Page 2
      const page2Response: CloudApiResponse<SkillsListResponse> = {
        success: true,
        data: {
          skills: [
            {
              id: 'skill-11',
              name: 'Skill 11',
              description: 'Eleventh skill',
              version: '1.0.0',
              author: 'Author',
              tags: [],
              downloads: 100,
              rating: 4.0,
            },
          ],
          total: 25,
          page: 2,
          pageSize: 10,
        },
      }
      mockServer.setResponse('skills.list', page2Response)

      // Act - Page 2
      const response2 = await gateway.request<SkillsListResponse>(
        'skills.list',
        {
          method: 'GET',
          query: { page: 2, pageSize: 10 },
        },
      )

      // Assert - Page 2
      assertSuccessResponse(response2)
      expect(response2.data.page).toBe(2)
      expect(response2.data.skills[0].id).toBe('skill-11')
    })
  })

  // ==========================================================================
  // Test Suite 2: Skills Download
  // ==========================================================================

  describe('skills Download', () => {
    it('should successfully download a skill', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<SkillDownloadResponse> = {
        success: true,
        data: {
          skillId: 'skill-1',
          content: '# Skill Content\n\nThis is the skill content.',
          version: '1.0.0',
        },
      }
      mockServer.setResponse('skills.download', mockResponse)

      // Act
      const response = await gateway.request<SkillDownloadResponse>(
        'skills.download',
        {
          method: 'GET',
          query: { skillId: 'skill-1' },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.skillId).toBe('skill-1')
      expect(response.data.content).toContain('Skill Content')
      expect(response.data.version).toBe('1.0.0')
    })

    it('should handle skill not found', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<SkillDownloadResponse> = {
        success: false,
        error: 'Skill not found',
        code: 'NOT_FOUND',
      }
      mockServer.setResponse('skills.download', mockResponse)

      // Act
      const response = await gateway.request<SkillDownloadResponse>(
        'skills.download',
        {
          method: 'GET',
          query: { skillId: 'non-existent' },
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('NOT_FOUND')
    })

    it('should handle download timeout', async () => {
      // Arrange
      mockServer.setLatency(10000)
      const mockResponse: CloudApiResponse<SkillDownloadResponse> = {
        success: false,
        error: 'Download timeout',
        code: 'TIMEOUT',
      }
      mockServer.setResponse('skills.download', mockResponse)

      // Act
      const response = await gateway.request<SkillDownloadResponse>(
        'skills.download',
        {
          method: 'GET',
          query: { skillId: 'skill-1' },
          timeout: 2000,
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('TIMEOUT')
    })

    it('should handle corrupted skill content', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<SkillDownloadResponse> = {
        success: false,
        error: 'Skill content is corrupted',
        code: 'CORRUPTED_CONTENT',
      }
      mockServer.setResponse('skills.download', mockResponse)

      // Act
      const response = await gateway.request<SkillDownloadResponse>(
        'skills.download',
        {
          method: 'GET',
          query: { skillId: 'corrupted-skill' },
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('CORRUPTED_CONTENT')
    })
  })

  // ==========================================================================
  // Test Suite 3: Skills Upload
  // ==========================================================================

  describe('skills Upload', () => {
    it('should successfully upload a skill', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<SkillUploadResponse> = {
        success: true,
        data: {
          skillId: 'new-skill-1',
          success: true,
          message: 'Skill uploaded successfully',
        },
      }
      mockServer.setResponse('skills.upload', mockResponse)

      // Act
      const response = await gateway.request<SkillUploadResponse>(
        'skills.upload',
        {
          method: 'POST',
          body: {
            name: 'New Skill',
            description: 'A new skill',
            content: '# New Skill Content',
            version: '1.0.0',
            tags: ['new', 'test'],
          },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.success).toBe(true)
      expect(response.data.skillId).toBe('new-skill-1')
    })

    it('should handle validation errors', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<SkillUploadResponse> = {
        success: false,
        error: 'Invalid skill format',
        code: 'VALIDATION_ERROR',
      }
      mockServer.setResponse('skills.upload', mockResponse)

      // Act
      const response = await gateway.request<SkillUploadResponse>(
        'skills.upload',
        {
          method: 'POST',
          body: {
            name: '', // Invalid: empty name
            content: '',
          },
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('VALIDATION_ERROR')
    })

    it('should handle authentication failure', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<SkillUploadResponse> = {
        success: false,
        error: 'Authentication required to upload skills',
        code: 'UNAUTHORIZED',
      }
      mockServer.setResponse('skills.upload', mockResponse)

      // Act
      const response = await gateway.request<SkillUploadResponse>(
        'skills.upload',
        {
          method: 'POST',
          body: {
            name: 'Test Skill',
            content: 'Content',
          },
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('UNAUTHORIZED')
    })

    it('should handle duplicate skill names', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<SkillUploadResponse> = {
        success: false,
        error: 'Skill with this name already exists',
        code: 'DUPLICATE_NAME',
      }
      mockServer.setResponse('skills.upload', mockResponse)

      // Act
      const response = await gateway.request<SkillUploadResponse>(
        'skills.upload',
        {
          method: 'POST',
          body: {
            name: 'Existing Skill',
            content: 'Content',
          },
        },
      )

      // Assert
      assertErrorResponse(response)
      expect(response.code).toBe('DUPLICATE_NAME')
    })
  })

  // ==========================================================================
  // Test Suite 4: Skills Search and Filtering
  // ==========================================================================

  describe('skills Search and Filtering', () => {
    it('should search skills by keyword', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<SkillsListResponse> = {
        success: true,
        data: {
          skills: [
            {
              id: 'skill-ts',
              name: 'TypeScript Helper',
              description: 'TypeScript utilities',
              version: '1.0.0',
              author: 'Author',
              tags: ['typescript'],
              downloads: 500,
              rating: 4.5,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        },
      }
      mockServer.setResponse('skills.list', mockResponse)

      // Act
      const response = await gateway.request<SkillsListResponse>(
        'skills.list',
        {
          method: 'GET',
          query: { search: 'typescript' },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.skills).toHaveLength(1)
      expect(response.data.skills[0].name).toContain('TypeScript')
    })

    it('should filter skills by tags', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<SkillsListResponse> = {
        success: true,
        data: {
          skills: [
            {
              id: 'skill-react',
              name: 'React Patterns',
              description: 'React design patterns',
              version: '1.0.0',
              author: 'Author',
              tags: ['react', 'patterns'],
              downloads: 1000,
              rating: 4.8,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        },
      }
      mockServer.setResponse('skills.list', mockResponse)

      // Act
      const response = await gateway.request<SkillsListResponse>(
        'skills.list',
        {
          method: 'GET',
          query: { tags: 'react,patterns' },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.skills[0].tags).toContain('react')
      expect(response.data.skills[0].tags).toContain('patterns')
    })

    it('should handle no results found', async () => {
      // Arrange
      const mockResponse: CloudApiResponse<SkillsListResponse> = {
        success: true,
        data: {
          skills: [],
          total: 0,
          page: 1,
          pageSize: 10,
        },
      }
      mockServer.setResponse('skills.list', mockResponse)

      // Act
      const response = await gateway.request<SkillsListResponse>(
        'skills.list',
        {
          method: 'GET',
          query: { search: 'nonexistent-keyword' },
        },
      )

      // Assert
      assertSuccessResponse(response)
      expect(response.data.skills).toHaveLength(0)
      expect(response.data.total).toBe(0)
    })
  })
})
