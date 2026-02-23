/**
 * Skills API Types
 *
 * Unified type definitions for skill sync and marketplace operations
 *
 * @module cloud-client/skills/types
 */

// ============================================================================
// Common Types
// ============================================================================

/**
 * Skill privacy level
 */
export type SkillPrivacy = 'public' | 'private' | 'team' | 'unlisted'

/**
 * Skill category
 */
export type SkillCategory = string

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Skill metadata
 */
export interface SkillMetadata {
  /** Author name */
  author: string
  /** Description */
  description: string
  /** Tags */
  tags: string[]
  /** Category */
  category: string
  /** Download count */
  downloads?: number
  /** Star/like count */
  stars?: number
  /** Minimum CCJK version required */
  minCcjkVersion?: string
}

// ============================================================================
// List Skills
// ============================================================================

/**
 * List skills request
 */
export interface SkillListRequest {
  /** Filter by privacy level */
  privacy?: SkillPrivacy
  /** Filter by author */
  author?: string
  /** Filter by tags */
  tags?: string[]
  /** Search query */
  query?: string
  /** Page number (1-indexed) */
  page?: number
  /** Page size */
  pageSize?: number
  /** Sort by field */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'version' | 'downloads' | 'stars'
  /** Sort direction */
  sortDir?: SortDirection
}

/**
 * Skill summary (for list responses)
 */
export interface SkillSummary {
  /** Skill ID */
  id: string
  /** Skill name */
  name: string
  /** Version */
  version: string
  /** Content (SKILL.md) */
  content: string
  /** Metadata */
  metadata: SkillMetadata
  /** Privacy level */
  privacy: SkillPrivacy
  /** Checksum */
  checksum: string
  /** Created timestamp */
  createdAt: string
  /** Updated timestamp */
  updatedAt: string
}

/**
 * List skills response
 */
export interface SkillListResponse {
  /** Array of skills */
  skills: SkillSummary[]
  /** Total count */
  total: number
  /** Current page */
  page: number
  /** Page size */
  pageSize: number
  /** Total pages */
  totalPages: number
}

// ============================================================================
// Get Skill
// ============================================================================

/**
 * Get skill request
 */
export interface SkillGetRequest {
  /** Skill ID */
  skillId: string
  /** Specific version (optional) */
  version?: string
}

/**
 * Full skill details
 */
export interface SkillDetails {
  /** Skill ID */
  id: string
  /** Skill name */
  name: string
  /** Version */
  version: string
  /** Content (SKILL.md) */
  content: string
  /** Metadata */
  metadata: SkillMetadata
  /** Privacy level */
  privacy: SkillPrivacy
  /** Checksum */
  checksum: string
  /** Created timestamp */
  createdAt: string
  /** Updated timestamp */
  updatedAt: string
}

/**
 * Get skill response
 */
export interface SkillGetResponse {
  /** Skill details */
  skill: SkillDetails
}

// ============================================================================
// Upload Skill
// ============================================================================

/**
 * Upload skill request
 */
export interface SkillUploadRequest {
  /** Skill name */
  name: string
  /** Version */
  version: string
  /** Content (SKILL.md) */
  content: string
  /** Metadata */
  metadata: SkillMetadata
  /** Privacy level */
  privacy: SkillPrivacy
  /** Checksum */
  checksum: string
}

/**
 * Upload skill response
 */
export interface SkillUploadResponse {
  /** Uploaded skill details */
  skill: SkillDetails
  /** Success message */
  message?: string
}

// ============================================================================
// Download Skill
// ============================================================================

/**
 * Download skill request
 */
export interface SkillDownloadRequest {
  /** Skill ID */
  skillId: string
  /** Specific version (optional) */
  version?: string
}

/**
 * Download skill response
 */
export interface SkillDownloadResponse {
  /** Skill details with content */
  skill: SkillDetails
}

// ============================================================================
// Update Skill
// ============================================================================

/**
 * Update skill request
 */
export interface SkillUpdateRequest {
  /** Skill ID */
  skillId: string
  /** New version (optional) */
  version?: string
  /** New content (optional) */
  content?: string
  /** New metadata (optional) */
  metadata?: Partial<SkillMetadata>
  /** New privacy level (optional) */
  privacy?: SkillPrivacy
  /** New checksum (optional) */
  checksum?: string
}

/**
 * Update skill response
 */
export interface SkillUpdateResponse {
  /** Updated skill details */
  skill: SkillDetails
  /** Success message */
  message?: string
}

// ============================================================================
// Delete Skill
// ============================================================================

/**
 * Delete skill request
 */
export interface SkillDeleteRequest {
  /** Skill ID */
  skillId: string
}

/**
 * Delete skill response
 */
export interface SkillDeleteResponse {
  /** Success indicator */
  success: boolean
  /** Success message */
  message?: string
}

// ============================================================================
// Response Validation
// ============================================================================

/**
 * Validate skill list response
 */
export function validateSkillListResponse(data: unknown): data is SkillListResponse {
  if (!data || typeof data !== 'object')
    return false

  const obj = data as Record<string, unknown>

  return (
    Array.isArray(obj.skills)
    && typeof obj.total === 'number'
    && typeof obj.page === 'number'
    && typeof obj.pageSize === 'number'
    && typeof obj.totalPages === 'number'
  )
}

/**
 * Validate skill get response
 */
export function validateSkillGetResponse(data: unknown): data is SkillGetResponse {
  if (!data || typeof data !== 'object')
    return false

  const obj = data as Record<string, unknown>

  return (
    obj.skill !== undefined
    && typeof obj.skill === 'object'
    && obj.skill !== null
  )
}

/**
 * Validate skill upload response
 */
export function validateSkillUploadResponse(data: unknown): data is SkillUploadResponse {
  if (!data || typeof data !== 'object')
    return false

  const obj = data as Record<string, unknown>

  return (
    obj.skill !== undefined
    && typeof obj.skill === 'object'
    && obj.skill !== null
  )
}

/**
 * Validate skill download response
 */
export function validateSkillDownloadResponse(data: unknown): data is SkillDownloadResponse {
  if (!data || typeof data !== 'object')
    return false

  const obj = data as Record<string, unknown>

  return (
    obj.skill !== undefined
    && typeof obj.skill === 'object'
    && obj.skill !== null
  )
}

/**
 * Validate skill details
 */
export function validateSkillDetails(data: unknown): data is SkillDetails {
  if (!data || typeof data !== 'object')
    return false

  const obj = data as Record<string, unknown>

  return (
    typeof obj.id === 'string'
    && typeof obj.name === 'string'
    && typeof obj.version === 'string'
    && typeof obj.content === 'string'
    && typeof obj.checksum === 'string'
  )
}
