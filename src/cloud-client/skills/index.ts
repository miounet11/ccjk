/**
 * Skills API Module
 *
 * Unified skills API client with consistent authentication and error handling
 *
 * @module cloud-client/skills
 */

// Export types
export type {
  SkillCategory,
  SkillDeleteRequest,
  SkillDeleteResponse,
  SkillDetails,
  SkillDownloadRequest,
  SkillDownloadResponse,
  SkillGetRequest,
  SkillGetResponse,
  SkillListRequest,
  SkillListResponse,
  SkillMetadata,
  SkillPrivacy,
  SkillSummary,
  SkillUpdateRequest,
  SkillUpdateResponse,
  SkillUploadRequest,
  SkillUploadResponse,
  SortDirection,
} from './types'

// Export validation functions
export {
  validateSkillDetails,
  validateSkillDownloadResponse,
  validateSkillGetResponse,
  validateSkillListResponse,
  validateSkillUploadResponse,
} from './types'

// Export client
export { createSkillsClient, SkillsApiClient } from './client'
