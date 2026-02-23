/**
 * Unified Skills API Client Tests
 *
 * Tests for the unified skills API client with consistent
 * authentication and error handling.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CloudApiGateway } from '../../src/cloud-client/gateway'
import { createSkillsClient } from '../../src/cloud-client/skills/client'
import type {
  SkillDeleteResponse,
  SkillDownloadResponse,
  SkillGetResponse,
  SkillListResponse,
  SkillUploadResponse,
} from '../../src/cloud-client/skills/types'
import { CloudError, CloudErrorCode } from '../../src/cloud-client/errors'

// ============================================================================
// Mock Gateway
// ============================================================================

const createMockGateway = (): CloudApiGateway => {
  return {
    request: vi.fn(),
    setAuthToken: vi.fn(),
    getConfig: vi.fn(() => ({
      timeout: 30000,
      authToken: 'test-token',
      enableVersionFallback: true,
    })),
  } as unknown as CloudApiGateway
}

// ============================================================================
// Test Data
// ============================================================================

const mockSkillDetails = {
  id: 'test-skill',
  name: 'Test Skill',
  version: '1.0.0',
  content: '# Test Skill\n\nA test skill',
  metadata: {
    author: 'Test Author',
    description: 'A test skill',
    tags: ['test'],
    category: 'development' as const,
  },
  privacy: 'private' as const,
  checksum: 'abc123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockSkillSummary = {
  id: 'test-skill',
  name: 'Test Skill',
  version: '1.0.0',
  author: 'Test Author',
  description: 'A test skill',
  tags: ['test'],
  category: 'development' as const,
  privacy: 'private' as const,
  checksum: 'abc123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

// ============================================================================
// List Skills Tests
// ============================================================================

describe('SkillsApiClient - list', () => {
  let gateway: CloudApiGateway
  let client: ReturnType<typeof createSkillsClient>

  beforeEach(() => {
    gateway = createMockGateway()
    client = createSkillsClient(gateway)
  })

  it('should list skills successfully', async () => {
    const mockResponse: SkillListResponse = {
      skills: [mockSkillSummary],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    }

    vi.mocked(gateway.request).mockResolvedValue({
      success: true,
      data: mockResponse,
    })

    const response = await client.list({
      privacy: 'private',
      page: 1,
      pageSize: 20,
    })

    expect(response.success).toBe(true)
    expect(response.data).toEqual(mockResponse)
    expect(gateway.request).toHaveBeenCalledWith('skills.list', {
      method: 'GET',
      query: {
        privacy: 'private',
        page: 1,
        pageSize: 20,
      },
    })
  })

  it('should handle list with filters', async () => {
    const mockResponse: SkillListResponse = {
      skills: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    }

    vi.mocked(gateway.request).mockResolvedValue({
      success: true,
      data: mockResponse,
    })

    await client.list({
      privacy: 'public',
      author: 'test-author',
      tags: ['test', 'demo'],
      query: 'search term',
      sortBy: 'name',
      sortDir: 'asc',
    })

    expect(gateway.request).toHaveBeenCalledWith('skills.list', {
      method: 'GET',
      query: {
        privacy: 'public',
        author: 'test-author',
        tags: 'test,demo',
        query: 'search term',
        sortBy: 'name',
        sortDir: 'asc',
      },
    })
  })

  it('should throw CloudError on invalid response format', async () => {
    vi.mocked(gateway.request).mockResolvedValue({
      success: true,
      data: { invalid: 'format' },
    })

    await expect(client.list()).rejects.toThrow(CloudError)
    await expect(client.list()).rejects.toMatchObject({
      code: CloudErrorCode.SCHEMA_MISMATCH,
    })
  })

  it('should handle network errors', async () => {
    vi.mocked(gateway.request).mockRejectedValue(
      new Error('Network error'),
    )

    await expect(client.list()).rejects.toThrow(CloudError)
  })
})

// ============================================================================
// Get Skill Tests
// ============================================================================

describe('SkillsApiClient - get', () => {
  let gateway: CloudApiGateway
  let client: ReturnType<typeof createSkillsClient>

  beforeEach(() => {
    gateway = createMockGateway()
    client = createSkillsClient(gateway)
  })

  it('should get skill successfully', async () => {
    const mockResponse: SkillGetResponse = {
      skill: mockSkillDetails,
    }

    vi.mocked(gateway.request).mockResolvedValue({
      success: true,
      data: mockResponse,
    })

    const response = await client.get({
      skillId: 'test-skill',
    })

    expect(response.success).toBe(true)
    expect(response.data).toEqual(mockResponse)
    expect(gateway.request).toHaveBeenCalledWith('skills.download', {
      method: 'GET',
      query: {
        skillId: 'test-skill',
      },
    })
  })

  it('should get skill with version', async () => {
    const mockResponse: SkillGetResponse = {
      skill: mockSkillDetails,
    }

    vi.mocked(gateway.request).mockResolvedValue({
      success: true,
      data: mockResponse,
    })

    await client.get({
      skillId: 'test-skill',
      version: '1.0.0',
    })

    expect(gateway.request).toHaveBeenCalledWith('skills.download', {
      method: 'GET',
      query: {
        skillId: 'test-skill',
        version: '1.0.0',
      },
    })
  })

  it('should validate skill ID', async () => {
    await expect(
      client.get({ skillId: '' }),
    ).rejects.toThrow(CloudError)

    await expect(
      client.get({ skillId: '' }),
    ).rejects.toMatchObject({
      code: CloudErrorCode.VALIDATION_ERROR,
    })
  })

  it('should handle not found errors', async () => {
    vi.mocked(gateway.request).mockResolvedValue({
      success: false,
      error: 'Skill not found',
      code: 'NOT_FOUND',
    })

    const response = await client.get({ skillId: 'nonexistent' })

    expect(response.success).toBe(false)
    expect(response.error).toBe('Skill not found')
  })
})

// ============================================================================
// Upload Skill Tests
// ============================================================================

describe('SkillsApiClient - upload', () => {
  let gateway: CloudApiGateway
  let client: ReturnType<typeof createSkillsClient>

  beforeEach(() => {
    gateway = createMockGateway()
    client = createSkillsClient(gateway)
  })

  it('should upload skill successfully', async () => {
    const mockResponse: SkillUploadResponse = {
      skill: mockSkillDetails,
      message: 'Skill uploaded successfully',
    }

    vi.mocked(gateway.request).mockResolvedValue({
      success: true,
      data: mockResponse,
    })

    const response = await client.upload({
      name: 'Test Skill',
      version: '1.0.0',
      content: '# Test Skill',
      metadata: {
        author: 'Test Author',
        description: 'A test skill',
      },
      privacy: 'private',
      checksum: 'abc123',
    })

    expect(response.success).toBe(true)
    expect(response.data).toEqual(mockResponse)
    expect(gateway.request).toHaveBeenCalledWith('skills.upload', {
      method: 'POST',
      body: expect.objectContaining({
        name: 'Test Skill',
        version: '1.0.0',
      }),
    })
  })

  it('should validate required fields', async () => {
    await expect(
      client.upload({
        name: '',
        version: '1.0.0',
        content: 'content',
        metadata: { author: 'author' },
        privacy: 'private',
        checksum: 'abc',
      }),
    ).rejects.toThrow(CloudError)

    await expect(
      client.upload({
        name: 'name',
        version: '',
        content: 'content',
        metadata: { author: 'author' },
        privacy: 'private',
        checksum: 'abc',
      }),
    ).rejects.toThrow(CloudError)

    await expect(
      client.upload({
        name: 'name',
        version: '1.0.0',
        content: '',
        metadata: { author: 'author' },
        privacy: 'private',
        checksum: 'abc',
      }),
    ).rejects.toThrow(CloudError)
  })

  it('should handle authentication errors', async () => {
    vi.mocked(gateway.request).mockResolvedValue({
      success: false,
      error: 'Unauthorized',
      code: 'AUTH_ERROR',
    })

    const response = await client.upload({
      name: 'Test',
      version: '1.0.0',
      content: 'content',
      metadata: { author: 'author' },
      privacy: 'private',
      checksum: 'abc',
    })

    expect(response.success).toBe(false)
    expect(response.code).toBe('AUTH_ERROR')
  })
})

// ============================================================================
// Download Skill Tests
// ============================================================================

describe('SkillsApiClient - download', () => {
  let gateway: CloudApiGateway
  let client: ReturnType<typeof createSkillsClient>

  beforeEach(() => {
    gateway = createMockGateway()
    client = createSkillsClient(gateway)
  })

  it('should download skill successfully', async () => {
    const mockResponse: SkillDownloadResponse = {
      skill: mockSkillDetails,
    }

    vi.mocked(gateway.request).mockResolvedValue({
      success: true,
      data: mockResponse,
    })

    const response = await client.download({
      skillId: 'test-skill',
    })

    expect(response.success).toBe(true)
    expect(response.data?.skill.content).toBe(mockSkillDetails.content)
  })

  it('should validate skill ID', async () => {
    await expect(
      client.download({ skillId: '' }),
    ).rejects.toThrow(CloudError)
  })
})

// ============================================================================
// Update Skill Tests
// ============================================================================

describe('SkillsApiClient - update', () => {
  let gateway: CloudApiGateway
  let client: ReturnType<typeof createSkillsClient>

  beforeEach(() => {
    gateway = createMockGateway()
    client = createSkillsClient(gateway)
  })

  it('should update skill successfully', async () => {
    vi.mocked(gateway.request).mockResolvedValue({
      success: true,
      data: {
        skill: mockSkillDetails,
        message: 'Updated',
      },
    })

    const response = await client.update({
      skillId: 'test-skill',
      version: '1.1.0',
      content: '# Updated content',
    })

    expect(response.success).toBe(true)
    expect(gateway.request).toHaveBeenCalledWith('skills.upload', {
      method: 'PUT',
      body: expect.objectContaining({
        skillId: 'test-skill',
        version: '1.1.0',
      }),
    })
  })

  it('should validate skill ID', async () => {
    await expect(
      client.update({ skillId: '', version: '1.0.0' }),
    ).rejects.toThrow(CloudError)
  })
})

// ============================================================================
// Delete Skill Tests
// ============================================================================

describe('SkillsApiClient - delete', () => {
  let gateway: CloudApiGateway
  let client: ReturnType<typeof createSkillsClient>

  beforeEach(() => {
    gateway = createMockGateway()
    client = createSkillsClient(gateway)
  })

  it('should delete skill successfully', async () => {
    const mockResponse: SkillDeleteResponse = {
      success: true,
      message: 'Skill deleted',
    }

    vi.mocked(gateway.request).mockResolvedValue({
      success: true,
      data: mockResponse,
    })

    const response = await client.delete({
      skillId: 'test-skill',
    })

    expect(response.success).toBe(true)
    expect(gateway.request).toHaveBeenCalledWith('skills.upload', {
      method: 'DELETE',
      query: {
        skillId: 'test-skill',
      },
    })
  })

  it('should validate skill ID', async () => {
    await expect(
      client.delete({ skillId: '' }),
    ).rejects.toThrow(CloudError)
  })
})

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('SkillsApiClient - error handling', () => {
  let gateway: CloudApiGateway
  let client: ReturnType<typeof createSkillsClient>

  beforeEach(() => {
    gateway = createMockGateway()
    client = createSkillsClient(gateway)
  })

  it('should handle rate limit errors', async () => {
    vi.mocked(gateway.request).mockResolvedValue({
      success: false,
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT',
    })

    const response = await client.list()

    expect(response.success).toBe(false)
    expect(response.code).toBe('RATE_LIMIT')
  })

  it('should handle server errors', async () => {
    vi.mocked(gateway.request).mockResolvedValue({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
    })

    const response = await client.list()

    expect(response.success).toBe(false)
    expect(response.code).toBe('SERVER_ERROR')
  })

  it('should wrap unknown errors in CloudError', async () => {
    vi.mocked(gateway.request).mockRejectedValue(
      new Error('Unknown error'),
    )

    await expect(client.list()).rejects.toThrow(CloudError)
    await expect(client.list()).rejects.toMatchObject({
      code: CloudErrorCode.UNKNOWN_ERROR,
    })
  })
})
