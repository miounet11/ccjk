/**
 * Ratings API Client
 *
 * Handles all rating-related API calls for the skills marketplace.
 * Provides functionality for fetching and creating skill ratings.
 *
 * @module ratings-api
 */

import type {
  ApiResponse,
  Pagination,
  Rating,
  RatingSummary,
} from './skills-marketplace-types'

/** Sort options for ratings */
export type RatingSortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'

/** Base URL for the API */
const API_BASE_URL = 'https://api.claudehome.cn/api/v1'

/**
 * Parameters for fetching skill ratings
 */
export interface GetSkillRatingsParams {
  /** Page number (1-indexed) */
  page?: number
  /** Number of items per page */
  limit?: number
  /** Sort order for ratings */
  sort?: RatingSortOption
}

/**
 * Response structure for getSkillRatings
 */
export interface GetSkillRatingsResponse {
  /** List of ratings */
  ratings: Rating[]
  /** Summary statistics for the skill's ratings */
  summary: RatingSummary
  /** Pagination information */
  pagination: Pagination
}

/**
 * Data required to create a new rating
 */
export interface CreateRatingData {
  /** ID of the user creating the rating */
  userId: string
  /** Rating value (1-5 stars) */
  rating: number
  /** Optional review text */
  review?: string
}

/**
 * Response structure for createRating
 */
export interface CreateRatingResponse {
  /** Unique identifier for the rating */
  id: number
  /** ID of the skill being rated */
  skillId: string
  /** ID of the user who created the rating */
  userId: string
  /** Rating value (1-5 stars) */
  rating: number
  /** Review text or null if not provided */
  review: string | null
  /** Number of users who found this rating helpful */
  helpful: number
  /** ISO 8601 timestamp of when the rating was created */
  createdAt: string
}

/**
 * Error codes specific to ratings API
 */
export enum RatingsApiErrorCode {
  /** User has already rated this skill */
  DUPLICATE_RATING = 'DUPLICATE_RATING',
  /** Rating value is invalid (not 1-5) */
  INVALID_RATING_VALUE = 'INVALID_RATING_VALUE',
  /** Skill not found */
  SKILL_NOT_FOUND = 'SKILL_NOT_FOUND',
  /** Authentication required */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** Network or server error */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Unknown error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for ratings API errors
 */
export class RatingsApiError extends Error {
  constructor(
    message: string,
    public readonly code: RatingsApiErrorCode,
    public readonly statusCode?: number,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'RatingsApiError'
  }
}

/**
 * Validates that a rating value is within the valid range (1-5)
 *
 * @param rating - The rating value to validate
 * @throws {RatingsApiError} If the rating is not a valid value
 */
function validateRating(rating: number): void {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new RatingsApiError(
      `Invalid rating value: ${rating}. Rating must be an integer between 1 and 5.`,
      RatingsApiErrorCode.INVALID_RATING_VALUE,
    )
  }
}

/**
 * Builds query string from parameters object
 *
 * @param params - Object containing query parameters
 * @returns URL-encoded query string
 */
function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.append(key, String(value))
    }
  }

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

/**
 * Handles API response and extracts data or throws appropriate error
 *
 * @param response - Fetch response object
 * @param context - Context string for error messages
 * @returns Parsed response data
 * @throws {RatingsApiError} If the response indicates an error
 */
async function handleResponse<T>(response: Response, context: string): Promise<T> {
  if (!response.ok) {
    let errorData: { error?: string, code?: string, message?: string } = {}

    try {
      errorData = await response.json() as { error?: string, code?: string, message?: string }
    }
    catch {
      // Response body is not JSON
    }

    const errorMessage = errorData.message || errorData.error || `${context} failed`
    const errorCode = mapHttpStatusToErrorCode(response.status, errorData.code)

    throw new RatingsApiError(
      errorMessage,
      errorCode,
      response.status,
      errorData,
    )
  }

  try {
    const data = await response.json() as ApiResponse<T>

    if (data.success === false) {
      throw new RatingsApiError(
        data.error || `${context} failed`,
        RatingsApiErrorCode.UNKNOWN_ERROR,
        response.status,
      )
    }

    return data.data as T
  }
  catch (error) {
    if (error instanceof RatingsApiError) {
      throw error
    }
    throw new RatingsApiError(
      `Failed to parse response for ${context}`,
      RatingsApiErrorCode.UNKNOWN_ERROR,
      response.status,
    )
  }
}

/**
 * Maps HTTP status codes to appropriate error codes
 *
 * @param status - HTTP status code
 * @param serverCode - Optional error code from server response
 * @returns Appropriate RatingsApiErrorCode
 */
function mapHttpStatusToErrorCode(status: number, serverCode?: string): RatingsApiErrorCode {
  // Check server-provided error code first
  if (serverCode === 'DUPLICATE_RATING') {
    return RatingsApiErrorCode.DUPLICATE_RATING
  }

  // Map HTTP status codes
  switch (status) {
    case 401:
      return RatingsApiErrorCode.UNAUTHORIZED
    case 404:
      return RatingsApiErrorCode.SKILL_NOT_FOUND
    case 409:
      return RatingsApiErrorCode.DUPLICATE_RATING
    case 422:
      return RatingsApiErrorCode.INVALID_RATING_VALUE
    default:
      return RatingsApiErrorCode.UNKNOWN_ERROR
  }
}

/**
 * Fetches ratings for a specific skill
 *
 * Retrieves a paginated list of ratings along with summary statistics
 * and rating distribution. This endpoint does not require authentication.
 *
 * @param skillId - The unique identifier of the skill
 * @param params - Optional parameters for pagination and sorting
 * @returns Promise resolving to ratings list, summary, and pagination info
 * @throws {RatingsApiError} If the request fails
 *
 * @example
 * ```typescript
 * // Fetch first page of ratings sorted by most recent
 * const result = await getSkillRatings('skill-123', {
 *   page: 1,
 *   limit: 10,
 *   sort: 'recent'
 * });
 *
 * console.log(`Average rating: ${result.summary.avgRating}`);
 * console.log(`Total ratings: ${result.summary.totalRatings}`);
 * ```
 */
export async function getSkillRatings(
  skillId: string,
  params: GetSkillRatingsParams = {},
): Promise<GetSkillRatingsResponse> {
  if (!skillId || typeof skillId !== 'string') {
    throw new RatingsApiError(
      'Skill ID is required and must be a string',
      RatingsApiErrorCode.INVALID_RATING_VALUE,
    )
  }

  const queryString = buildQueryString({
    page: params.page,
    limit: params.limit,
    sort: params.sort,
  })

  const url = `${API_BASE_URL}/skills/${encodeURIComponent(skillId)}/ratings${queryString}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    return await handleResponse<GetSkillRatingsResponse>(response, 'Get skill ratings')
  }
  catch (error) {
    if (error instanceof RatingsApiError) {
      throw error
    }

    throw new RatingsApiError(
      `Network error while fetching ratings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      RatingsApiErrorCode.NETWORK_ERROR,
    )
  }
}

/**
 * Creates a new rating for a skill
 *
 * Submits a rating (1-5 stars) and optional review for a skill.
 * Requires authentication via Bearer token. Each user can only
 * rate a skill once; attempting to rate again will result in a
 * DUPLICATE_RATING error.
 *
 * @param skillId - The unique identifier of the skill to rate
 * @param data - Rating data including userId, rating value, and optional review
 * @param token - Bearer token for authentication
 * @returns Promise resolving to the created rating
 * @throws {RatingsApiError} If validation fails, user is unauthorized, or duplicate rating exists
 *
 * @example
 * ```typescript
 * // Create a 5-star rating with review
 * const rating = await createRating(
 *   'skill-123',
 *   {
 *     userId: 'user-456',
 *     rating: 5,
 *     review: 'Excellent skill! Very helpful for my workflow.'
 *   },
 *   'your-auth-token'
 * );
 *
 * console.log(`Rating created with ID: ${rating.id}`);
 * ```
 *
 * @example
 * ```typescript
 * // Create a rating without review
 * const rating = await createRating(
 *   'skill-123',
 *   { userId: 'user-456', rating: 4 },
 *   'your-auth-token'
 * );
 * ```
 */
export async function createRating(
  skillId: string,
  data: CreateRatingData,
  token: string,
): Promise<CreateRatingResponse> {
  // Validate inputs
  if (!skillId || typeof skillId !== 'string') {
    throw new RatingsApiError(
      'Skill ID is required and must be a string',
      RatingsApiErrorCode.INVALID_RATING_VALUE,
    )
  }

  if (!token || typeof token !== 'string') {
    throw new RatingsApiError(
      'Authentication token is required',
      RatingsApiErrorCode.UNAUTHORIZED,
    )
  }

  if (!data.userId || typeof data.userId !== 'string') {
    throw new RatingsApiError(
      'User ID is required and must be a string',
      RatingsApiErrorCode.INVALID_RATING_VALUE,
    )
  }

  // Validate rating value (1-5)
  validateRating(data.rating)

  const url = `${API_BASE_URL}/skills/${encodeURIComponent(skillId)}/ratings`

  const requestBody = {
    userId: data.userId,
    rating: data.rating,
    ...(data.review !== undefined && { review: data.review }),
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    })

    return await handleResponse<CreateRatingResponse>(response, 'Create rating')
  }
  catch (error) {
    if (error instanceof RatingsApiError) {
      throw error
    }

    throw new RatingsApiError(
      `Network error while creating rating: ${error instanceof Error ? error.message : 'Unknown error'}`,
      RatingsApiErrorCode.NETWORK_ERROR,
    )
  }
}

/**
 * Checks if an error is a duplicate rating error
 *
 * Utility function to easily check if a rating creation failed
 * because the user has already rated the skill.
 *
 * @param error - The error to check
 * @returns True if the error indicates a duplicate rating
 *
 * @example
 * ```typescript
 * try {
 *   await createRating(skillId, data, token);
 * } catch (error) {
 *   if (isDuplicateRatingError(error)) {
 *     console.log('You have already rated this skill');
 *   } else {
 *     throw error;
 *   }
 * }
 * ```
 */
export function isDuplicateRatingError(error: unknown): boolean {
  return (
    error instanceof RatingsApiError
    && error.code === RatingsApiErrorCode.DUPLICATE_RATING
  )
}

/**
 * Checks if an error is an authentication error
 *
 * @param error - The error to check
 * @returns True if the error indicates unauthorized access
 */
export function isUnauthorizedError(error: unknown): boolean {
  return (
    error instanceof RatingsApiError
    && error.code === RatingsApiErrorCode.UNAUTHORIZED
  )
}

/**
 * Checks if an error is a skill not found error
 *
 * @param error - The error to check
 * @returns True if the error indicates the skill was not found
 */
export function isSkillNotFoundError(error: unknown): boolean {
  return (
    error instanceof RatingsApiError
    && error.code === RatingsApiErrorCode.SKILL_NOT_FOUND
  )
}

/**
 * Ratings API object for convenient access to all rating functions
 *
 * @example
 * ```typescript
 * import { ratingsApi } from './ratings-api';
 *
 * // Get ratings
 * const ratings = await ratingsApi.getSkillRatings('skill-123');
 *
 * // Create rating
 * const newRating = await ratingsApi.createRating('skill-123', data, token);
 * ```
 */
export const ratingsApi = {
  getSkillRatings,
  createRating,
  isDuplicateRatingError,
  isUnauthorizedError,
  isSkillNotFoundError,
}
