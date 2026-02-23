/**
 * Unified Skills API Client
 *
 * Provides unified interface for skill sync and marketplace operations
 * using CloudApiGateway for consistent authentication and error handling.
 *
 * @module cloud-client/skills/client
 */

import type { CloudApiResponse } from '../../services/cloud/api-client'
import type { CloudApiGateway } from '../gateway'
import type {
  SkillDeleteRequest,
  SkillDeleteResponse,
  SkillDownloadRequest,
  SkillDownloadResponse,
  SkillGetRequest,
  SkillGetResponse,
  SkillListRequest,
  SkillListResponse,
  SkillUpdateRequest,
  SkillUpdateResponse,
  SkillUploadRequest,
  SkillUploadResponse,
} from './types'
import {
  validateSkillDownloadResponse,
  validateSkillGetResponse,
  validateSkillListResponse,
  validateSkillUploadResponse,
} from './types'
import { CloudError, CloudErrorFactory } from '../errors'

// ============================================================================
// Skills API Client
// ============================================================================

/**
 * Unified Skills API Client
 *
 * Provides consistent interface for all skill operations with:
 * - Unified authentication via Gateway
 * - Standardized error handling
 * - Response validation
 * - Type safety
 *
 * @example
 * ```typescript
 * const gateway = createGateway({ authToken: 'your-token' })
 * const client = new SkillsApiClient(gateway)
 *
 * // List skills
 * const response = await client.list({ privacy: 'public' })
 * if (response.success) {
 *   console.log(response.data.skills)
 * }
 *
 * // Upload skill
 * const uploadResponse = await client.upload({
 *   name: 'my-skill',
 *   version: '1.0.0',
 *   content: '# My Skill...',
 *   metadata: { author: 'me' },
 *   privacy: 'private',
 *   checksum: 'abc123'
 * })
 * ```
 */
export class SkillsApiClient {
  private gateway: CloudApiGateway

  constructor(gateway: CloudApiGateway) {
    this.gateway = gateway
  }

  // ==========================================================================
  // List Skills
  // ==========================================================================

  /**
   * List skills from cloud
   *
   * @param request - List request parameters
   * @returns List response with skills array
   *
   * @example
   * ```typescript
   * const response = await client.list({
   *   privacy: 'public',
   *   page: 1,
   *   pageSize: 20
   * })
   * ```
   */
  async list(
    request: SkillListRequest = {},
  ): Promise<CloudApiResponse<SkillListResponse>> {
    try {
      const response = await this.gateway.request<SkillListResponse>(
        'skills.list',
        {
          method: 'GET',
          query: this.buildListQuery(request),
        },
      )

      // Validate response
      if (response.success && response.data) {
        if (!validateSkillListResponse(response.data)) {
          throw CloudErrorFactory.schemaMismatch(
            'Invalid skill list response format',
            { context: { request } },
          )
        }
      }

      return response
    }
    catch (error) {
      if (error instanceof CloudError) {
        throw error
      }
      throw CloudErrorFactory.unknown(error, {
        context: { operation: 'skills.list', request },
      })
    }
  }

  // ==========================================================================
  // Get Skill
  // ==========================================================================

  /**
   * Get skill details by ID
   *
   * @param request - Get request with skill ID
   * @returns Skill details
   *
   * @example
   * ```typescript
   * const response = await client.get({
   *   skillId: 'my-skill',
   *   version: '1.0.0'
   * })
   * ```
   */
  async get(
    request: SkillGetRequest,
  ): Promise<CloudApiResponse<SkillGetResponse>> {
    try {
      // Validate request
      if (!request.skillId || request.skillId.trim() === '') {
        throw CloudErrorFactory.validation('Skill ID is required')
      }

      const query: Record<string, string> = {}
      if (request.version) {
        query.version = request.version
      }

      const response = await this.gateway.request<SkillGetResponse>(
        'skills.download',
        {
          method: 'GET',
          query: {
            skillId: request.skillId,
            ...query,
          },
        },
      )

      // Validate response
      if (response.success && response.data) {
        if (!validateSkillGetResponse(response.data)) {
          throw CloudErrorFactory.schemaMismatch(
            'Invalid skill get response format',
            { context: { request } },
          )
        }
      }

      return response
    }
    catch (error) {
      if (error instanceof CloudError) {
        throw error
      }
      throw CloudErrorFactory.unknown(error, {
        context: { operation: 'skills.get', request },
      })
    }
  }

  // ==========================================================================
  // Upload Skill
  // ==========================================================================

  /**
   * Upload skill to cloud
   *
   * @param request - Upload request with skill data
   * @returns Upload response with skill details
   *
   * @example
   * ```typescript
   * const response = await client.upload({
   *   name: 'my-skill',
   *   version: '1.0.0',
   *   content: '# My Skill...',
   *   metadata: { author: 'me', description: 'A skill' },
   *   privacy: 'private',
   *   checksum: 'abc123'
   * })
   * ```
   */
  async upload(
    request: SkillUploadRequest,
  ): Promise<CloudApiResponse<SkillUploadResponse>> {
    try {
      // Validate request
      this.validateUploadRequest(request)

      const response = await this.gateway.request<SkillUploadResponse>(
        'skills.upload',
        {
          method: 'POST',
          body: request,
        },
      )

      // Validate response
      if (response.success && response.data) {
        if (!validateSkillUploadResponse(response.data)) {
          throw CloudErrorFactory.schemaMismatch(
            'Invalid skill upload response format',
            { context: { request } },
          )
        }
      }

      return response
    }
    catch (error) {
      if (error instanceof CloudError) {
        throw error
      }
      throw CloudErrorFactory.unknown(error, {
        context: { operation: 'skills.upload', request },
      })
    }
  }

  // ==========================================================================
  // Download Skill
  // ==========================================================================

  /**
   * Download skill from cloud
   *
   * @param request - Download request with skill ID
   * @returns Download response with skill content
   *
   * @example
   * ```typescript
   * const response = await client.download({
   *   skillId: 'my-skill',
   *   version: '1.0.0'
   * })
   * ```
   */
  async download(
    request: SkillDownloadRequest,
  ): Promise<CloudApiResponse<SkillDownloadResponse>> {
    try {
      // Validate request
      if (!request.skillId || request.skillId.trim() === '') {
        throw CloudErrorFactory.validation('Skill ID is required')
      }

      const query: Record<string, string> = {
        skillId: request.skillId,
      }
      if (request.version) {
        query.version = request.version
      }

      const response = await this.gateway.request<SkillDownloadResponse>(
        'skills.download',
        {
          method: 'GET',
          query,
        },
      )

      // Validate response
      if (response.success && response.data) {
        if (!validateSkillDownloadResponse(response.data)) {
          throw CloudErrorFactory.schemaMismatch(
            'Invalid skill download response format',
            { context: { request } },
          )
        }
      }

      return response
    }
    catch (error) {
      if (error instanceof CloudError) {
        throw error
      }
      throw CloudErrorFactory.unknown(error, {
        context: { operation: 'skills.download', request },
      })
    }
  }

  // ==========================================================================
  // Update Skill
  // ==========================================================================

  /**
   * Update skill in cloud
   *
   * @param request - Update request with skill ID and changes
   * @returns Update response with updated skill
   *
   * @example
   * ```typescript
   * const response = await client.update({
   *   skillId: 'my-skill',
   *   version: '1.1.0',
   *   content: '# Updated content...'
   * })
   * ```
   */
  async update(
    request: SkillUpdateRequest,
  ): Promise<CloudApiResponse<SkillUpdateResponse>> {
    try {
      // Validate request
      if (!request.skillId || request.skillId.trim() === '') {
        throw CloudErrorFactory.validation('Skill ID is required')
      }

      const response = await this.gateway.request<SkillUpdateResponse>(
        'skills.upload',
        {
          method: 'PUT',
          body: request,
        },
      )

      return response
    }
    catch (error) {
      if (error instanceof CloudError) {
        throw error
      }
      throw CloudErrorFactory.unknown(error, {
        context: { operation: 'skills.update', request },
      })
    }
  }

  // ==========================================================================
  // Delete Skill
  // ==========================================================================

  /**
   * Delete skill from cloud
   *
   * @param request - Delete request with skill ID
   * @returns Delete response
   *
   * @example
   * ```typescript
   * const response = await client.delete({
   *   skillId: 'my-skill'
   * })
   * ```
   */
  async delete(
    request: SkillDeleteRequest,
  ): Promise<CloudApiResponse<SkillDeleteResponse>> {
    try {
      // Validate request
      if (!request.skillId || request.skillId.trim() === '') {
        throw CloudErrorFactory.validation('Skill ID is required')
      }

      const response = await this.gateway.request<SkillDeleteResponse>(
        'skills.upload',
        {
          method: 'DELETE',
          query: {
            skillId: request.skillId,
          },
        },
      )

      return response
    }
    catch (error) {
      if (error instanceof CloudError) {
        throw error
      }
      throw CloudErrorFactory.unknown(error, {
        context: { operation: 'skills.delete', request },
      })
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Build query parameters for list request
   */
  private buildListQuery(request: SkillListRequest): Record<string, string | number | boolean> {
    const query: Record<string, string | number | boolean> = {}

    if (request.privacy)
      query.privacy = request.privacy
    if (request.author)
      query.author = request.author
    if (request.tags && request.tags.length > 0)
      query.tags = request.tags.join(',')
    if (request.query)
      query.query = request.query
    if (request.page)
      query.page = request.page
    if (request.pageSize)
      query.pageSize = request.pageSize
    if (request.sortBy)
      query.sortBy = request.sortBy
    if (request.sortDir)
      query.sortDir = request.sortDir

    return query
  }

  /**
   * Validate upload request
   */
  private validateUploadRequest(request: SkillUploadRequest): void {
    const errors: string[] = []

    if (!request.name || request.name.trim() === '')
      errors.push('Skill name is required')

    if (!request.version || request.version.trim() === '')
      errors.push('Skill version is required')

    if (!request.content || request.content.trim() === '')
      errors.push('Skill content is required')

    if (!request.metadata)
      errors.push('Skill metadata is required')
    else if (!request.metadata.author || request.metadata.author.trim() === '')
      errors.push('Skill author is required')

    if (!request.privacy)
      errors.push('Skill privacy level is required')

    if (!request.checksum || request.checksum.trim() === '')
      errors.push('Skill checksum is required')

    if (errors.length > 0) {
      throw CloudErrorFactory.validation(
        `Invalid upload request: ${errors.join(', ')}`,
      )
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new SkillsApiClient instance
 *
 * @param gateway - CloudApiGateway instance
 * @returns SkillsApiClient instance
 *
 * @example
 * ```typescript
 * const gateway = createGateway({ authToken: 'your-token' })
 * const client = createSkillsClient(gateway)
 * ```
 */
export function createSkillsClient(gateway: CloudApiGateway): SkillsApiClient {
  return new SkillsApiClient(gateway)
}
