/**
 * User Skills API Client
 *
 * API client for managing user's installed skills
 * Base URL: https://api.claudehome.cn/api/v1
 * Authentication: Bearer Token
 */

import type {
  ApiResponse,
  InstallResponse,
  InstallSkillRequest,
  Quota,
  RecommendationsParams,
  RecommendationsResponse,
  UninstallResponse,
  UpdateResponse,
  UpdateSkillRequest,
  UserSkill,
  UserSkillsResponse,
} from './skills-marketplace-types'
import { SkillsMarketplaceApiError } from './skills-marketplace-api'

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = 'https://api.claudehome.cn/api/v1'

/**
 * Request options for authenticated requests
 */
export interface AuthRequestOptions {
  /** Bearer token for authentication */
  token: string
  /** AbortController signal for request cancellation */
  signal?: AbortSignal
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number
}

// ============================================================================
// HTTP Utilities
// ============================================================================

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, unknown>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  return url.toString()
}

/**
 * Make authenticated HTTP request to the API
 */
async function authenticatedRequest<T>(
  method: string,
  endpoint: string,
  options: AuthRequestOptions,
  body?: unknown,
): Promise<T> {
  const { token, signal, timeout = 30000 } = options
  const url = buildUrl(endpoint)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // Use provided signal or our timeout controller
  const requestSignal = signal || controller.signal

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: requestSignal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorData: unknown
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      let errorCode: string | undefined

      try {
        errorData = await response.json()
        if (typeof errorData === 'object' && errorData !== null) {
          const err = errorData as Record<string, unknown>
          if (typeof err.error === 'string') {
            errorMessage = err.error
          }
          if (typeof err.code === 'string') {
            errorCode = err.code
          }
        }
      }
      catch {
        // Ignore JSON parse errors for error response
      }

      throw new SkillsMarketplaceApiError(errorMessage, response.status, errorCode, errorData)
    }

    const apiResponse = (await response.json()) as ApiResponse<T>

    if (!apiResponse.success) {
      throw new SkillsMarketplaceApiError(
        apiResponse.error || 'Request failed',
        response.status,
        apiResponse.code,
      )
    }

    if (!apiResponse.data) {
      throw new SkillsMarketplaceApiError(
        'No data in response',
        response.status,
        'NO_DATA',
      )
    }

    return apiResponse.data
  }
  catch (error) {
    clearTimeout(timeoutId)

    // Re-throw API errors
    if (error instanceof SkillsMarketplaceApiError) {
      throw error
    }

    // Handle abort errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SkillsMarketplaceApiError('Request was cancelled', 0, 'ABORT_ERROR')
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new SkillsMarketplaceApiError(
        'Network error: Unable to connect to the API',
        0,
        'NETWORK_ERROR',
      )
    }

    // Handle other errors
    throw new SkillsMarketplaceApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      0,
      'UNKNOWN_ERROR',
    )
  }
}

// ============================================================================
// User Skills API
// ============================================================================

/**
 * Get user's installed skills
 *
 * @param userId - User ID
 * @param options - Authentication and request options
 * @returns User's installed skills with quota information
 *
 * @example
 * ```typescript
 * const result = await getUserSkills('user123', { token: 'auth-token' })
 * console.log(result.skills) // Array of installed skills
 * console.log(result.quota) // Quota information
 * ```
 */
export async function getUserSkills(
  userId: string,
  options: AuthRequestOptions,
): Promise<UserSkillsResponse> {
  if (!userId || userId.trim() === '') {
    throw new SkillsMarketplaceApiError(
      'User ID is required',
      400,
      'INVALID_PARAMS',
    )
  }

  return authenticatedRequest<UserSkillsResponse>(
    'GET',
    `/users/${userId}/skills`,
    options,
  )
}

/**
 * Install a skill for a user
 *
 * @param userId - User ID
 * @param request - Installation request with skill ID
 * @param options - Authentication and request options
 * @returns Installation result with updated quota
 *
 * @example
 * ```typescript
 * const result = await installSkill(
 *   'user123',
 *   { skillId: 'git-commit', userTier: 'pro' },
 *   { token: 'auth-token' }
 * )
 * console.log(result.skillId) // Installed skill ID
 * console.log(result.quota) // Updated quota
 * ```
 */
export async function installSkill(
  userId: string,
  request: InstallSkillRequest,
  options: AuthRequestOptions,
): Promise<InstallResponse> {
  if (!userId || userId.trim() === '') {
    throw new SkillsMarketplaceApiError(
      'User ID is required',
      400,
      'INVALID_PARAMS',
    )
  }

  if (!request.skillId || request.skillId.trim() === '') {
    throw new SkillsMarketplaceApiError(
      'Skill ID is required',
      400,
      'INVALID_PARAMS',
    )
  }

  return authenticatedRequest<InstallResponse>(
    'POST',
    `/users/${userId}/skills`,
    options,
    request,
  )
}

/**
 * Uninstall a skill for a user
 *
 * @param userId - User ID
 * @param skillId - Skill ID to uninstall
 * @param options - Authentication and request options
 * @returns Uninstallation result with updated quota
 *
 * @example
 * ```typescript
 * const result = await uninstallSkill(
 *   'user123',
 *   'git-commit',
 *   { token: 'auth-token' }
 * )
 * console.log(result.skillId) // Uninstalled skill ID
 * console.log(result.quota) // Updated quota
 * ```
 */
export async function uninstallSkill(
  userId: string,
  skillId: string,
  options: AuthRequestOptions,
): Promise<UninstallResponse> {
  if (!userId || userId.trim() === '') {
    throw new SkillsMarketplaceApiError(
      'User ID is required',
      400,
      'INVALID_PARAMS',
    )
  }

  if (!skillId || skillId.trim() === '') {
    throw new SkillsMarketplaceApiError(
      'Skill ID is required',
      400,
      'INVALID_PARAMS',
    )
  }

  return authenticatedRequest<UninstallResponse>(
    'DELETE',
    `/users/${userId}/skills/${skillId}`,
    options,
  )
}

/**
 * Update a user's skill configuration
 *
 * @param userId - User ID
 * @param skillId - Skill ID to update
 * @param request - Update request with new configuration
 * @param options - Authentication and request options
 * @returns Updated skill information
 *
 * @example
 * ```typescript
 * const result = await updateSkill(
 *   'user123',
 *   'git-commit',
 *   { isEnabled: true, config: { autoSign: true } },
 *   { token: 'auth-token' }
 * )
 * console.log(result.isEnabled) // New enabled status
 * console.log(result.config) // Updated configuration
 * ```
 */
export async function updateSkill(
  userId: string,
  skillId: string,
  request: UpdateSkillRequest,
  options: AuthRequestOptions,
): Promise<UpdateResponse> {
  if (!userId || userId.trim() === '') {
    throw new SkillsMarketplaceApiError(
      'User ID is required',
      400,
      'INVALID_PARAMS',
    )
  }

  if (!skillId || skillId.trim() === '') {
    throw new SkillsMarketplaceApiError(
      'Skill ID is required',
      400,
      'INVALID_PARAMS',
    )
  }

  if (!request.isEnabled && !request.config) {
    throw new SkillsMarketplaceApiError(
      'At least one of isEnabled or config must be provided',
      400,
      'INVALID_PARAMS',
    )
  }

  return authenticatedRequest<UpdateResponse>(
    'PATCH',
    `/users/${userId}/skills/${skillId}`,
    options,
    request,
  )
}

/**
 * Get personalized skill recommendations for a user
 *
 * @param userId - User ID
 * @param params - Recommendation parameters
 * @param options - Authentication and request options
 * @returns Personalized skill recommendations
 *
 * @example
 * ```typescript
 * const result = await getRecommendations(
 *   'user123',
 *   { limit: 5, excludeInstalled: true },
 *   { token: 'auth-token' }
 * )
 * console.log(result.recommendations) // Array of recommended skills
 * console.log(result.basedOn) // Recommendation basis
 * ```
 */
export async function getRecommendations(
  userId: string,
  params: RecommendationsParams = {},
  options: AuthRequestOptions,
): Promise<RecommendationsResponse> {
  if (!userId || userId.trim() === '') {
    throw new SkillsMarketplaceApiError(
      'User ID is required',
      400,
      'INVALID_PARAMS',
    )
  }

  const endpoint = `/users/${userId}/recommendations`
  const url = buildUrl(endpoint, params as Record<string, unknown>)

  const { token, signal, timeout = 30000 } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  const requestSignal = signal || controller.signal

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      signal: requestSignal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorData: unknown
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      let errorCode: string | undefined

      try {
        errorData = await response.json()
        if (typeof errorData === 'object' && errorData !== null) {
          const err = errorData as Record<string, unknown>
          if (typeof err.error === 'string') {
            errorMessage = err.error
          }
          if (typeof err.code === 'string') {
            errorCode = err.code
          }
        }
      }
      catch {
        // Ignore JSON parse errors
      }

      throw new SkillsMarketplaceApiError(errorMessage, response.status, errorCode, errorData)
    }

    const apiResponse = (await response.json()) as ApiResponse<RecommendationsResponse>

    if (!apiResponse.success || !apiResponse.data) {
      throw new SkillsMarketplaceApiError(
        apiResponse.error || 'Request failed',
        response.status,
        apiResponse.code,
      )
    }

    return apiResponse.data
  }
  catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof SkillsMarketplaceApiError) {
      throw error
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new SkillsMarketplaceApiError('Request was cancelled', 0, 'ABORT_ERROR')
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new SkillsMarketplaceApiError(
        'Network error: Unable to connect to the API',
        0,
        'NETWORK_ERROR',
      )
    }

    throw new SkillsMarketplaceApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      0,
      'UNKNOWN_ERROR',
    )
  }
}

/**
 * Get user's quota information
 *
 * @param userId - User ID
 * @param options - Authentication and request options
 * @returns User's quota information
 *
 * @example
 * ```typescript
 * const quota = await getUserQuota('user123', { token: 'auth-token' })
 * console.log(quota.used) // Number of installed skills
 * console.log(quota.limit) // Maximum allowed skills
 * console.log(quota.remaining) // Remaining slots
 * ```
 */
export async function getUserQuota(
  userId: string,
  options: AuthRequestOptions,
): Promise<Quota> {
  if (!userId || userId.trim() === '') {
    throw new SkillsMarketplaceApiError(
      'User ID is required',
      400,
      'INVALID_PARAMS',
    )
  }

  return authenticatedRequest<Quota>(
    'GET',
    `/users/${userId}/quota`,
    options,
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a user can install more skills
 *
 * @param quota - User's quota information
 * @returns True if user can install more skills
 *
 * @example
 * ```typescript
 * const quota = await getUserQuota('user123', { token: 'auth-token' })
 * if (canInstallMore(quota)) {
 *   console.log('User can install more skills')
 * }
 * ```
 */
export function canInstallMore(quota: Quota): boolean {
  return quota.remaining > 0
}

/**
 * Get quota usage percentage
 *
 * @param quota - User's quota information
 * @returns Usage percentage (0-100)
 *
 * @example
 * ```typescript
 * const quota = await getUserQuota('user123', { token: 'auth-token' })
 * const usage = getQuotaUsagePercentage(quota)
 * console.log(`Quota usage: ${usage}%`)
 * ```
 */
export function getQuotaUsagePercentage(quota: Quota): number {
  if (quota.limit === 0) {
    return 0
  }
  return Math.round((quota.used / quota.limit) * 100)
}

/**
 * Check if a skill is installed
 *
 * @param skills - User's installed skills
 * @param skillId - Skill ID to check
 * @returns True if skill is installed
 *
 * @example
 * ```typescript
 * const result = await getUserSkills('user123', { token: 'auth-token' })
 * if (isSkillInstalled(result.skills, 'git-commit')) {
 *   console.log('Skill is installed')
 * }
 * ```
 */
export function isSkillInstalled(skills: UserSkill[], skillId: string): boolean {
  return skills.some(skill => skill.skillId === skillId)
}

/**
 * Get enabled skills
 *
 * @param skills - User's installed skills
 * @returns Array of enabled skills
 *
 * @example
 * ```typescript
 * const result = await getUserSkills('user123', { token: 'auth-token' })
 * const enabled = getEnabledSkills(result.skills)
 * console.log(`${enabled.length} skills are enabled`)
 * ```
 */
export function getEnabledSkills(skills: UserSkill[]): UserSkill[] {
  return skills.filter(skill => skill.isEnabled)
}

/**
 * Get disabled skills
 *
 * @param skills - User's installed skills
 * @returns Array of disabled skills
 *
 * @example
 * ```typescript
 * const result = await getUserSkills('user123', { token: 'auth-token' })
 * const disabled = getDisabledSkills(result.skills)
 * console.log(`${disabled.length} skills are disabled`)
 * ```
 */
export function getDisabledSkills(skills: UserSkill[]): UserSkill[] {
  return skills.filter(skill => !skill.isEnabled)
}

/**
 * Sort skills by usage count
 *
 * @param skills - User's installed skills
 * @param order - Sort order (default: 'desc')
 * @returns Sorted array of skills
 *
 * @example
 * ```typescript
 * const result = await getUserSkills('user123', { token: 'auth-token' })
 * const sorted = sortByUsage(result.skills)
 * console.log('Most used skill:', sorted[0].name)
 * ```
 */
export function sortByUsage(
  skills: UserSkill[],
  order: 'asc' | 'desc' = 'desc',
): UserSkill[] {
  return [...skills].sort((a, b) => {
    return order === 'desc'
      ? b.usageCount - a.usageCount
      : a.usageCount - b.usageCount
  })
}

/**
 * Sort skills by last used date
 *
 * @param skills - User's installed skills
 * @param order - Sort order (default: 'desc')
 * @returns Sorted array of skills
 *
 * @example
 * ```typescript
 * const result = await getUserSkills('user123', { token: 'auth-token' })
 * const sorted = sortByLastUsed(result.skills)
 * console.log('Recently used skill:', sorted[0].name)
 * ```
 */
export function sortByLastUsed(
  skills: UserSkill[],
  order: 'asc' | 'desc' = 'desc',
): UserSkill[] {
  return [...skills].sort((a, b) => {
    const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0
    const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0
    return order === 'desc' ? bTime - aTime : aTime - bTime
  })
}

// ============================================================================
// User Skills API Client Object
// ============================================================================

/**
 * User Skills API client object
 *
 * Provides a unified interface for all user skills API methods.
 *
 * @example
 * ```typescript
 * import { userSkillsApi } from './user-skills-api'
 *
 * const options = { token: 'auth-token' }
 *
 * // Get user's skills
 * const skills = await userSkillsApi.getUserSkills('user123', options)
 *
 * // Install a skill
 * const result = await userSkillsApi.installSkill(
 *   'user123',
 *   { skillId: 'git-commit' },
 *   options
 * )
 *
 * // Update skill
 * await userSkillsApi.updateSkill(
 *   'user123',
 *   'git-commit',
 *   { isEnabled: true },
 *   options
 * )
 *
 * // Uninstall skill
 * await userSkillsApi.uninstallSkill('user123', 'git-commit', options)
 *
 * // Get recommendations
 * const recommendations = await userSkillsApi.getRecommendations(
 *   'user123',
 *   { limit: 5 },
 *   options
 * )
 * ```
 */
export const userSkillsApi = {
  getUserSkills,
  installSkill,
  uninstallSkill,
  updateSkill,
  getRecommendations,
  getUserQuota,
  // Utility functions
  canInstallMore,
  getQuotaUsagePercentage,
  isSkillInstalled,
  getEnabledSkills,
  getDisabledSkills,
  sortByUsage,
  sortByLastUsed,
}

export default userSkillsApi
