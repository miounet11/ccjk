/**
 * Skills Marketplace API Types
 *
 * Type definitions for the CCJK Skills Marketplace API.
 * Base URL: https://api.claudehome.cn/api/v1
 *
 * @module cloud-client/skills-marketplace-types
 */

// ============================================
// Generic API Response Types
// ============================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean
  /** Response data (present on success) */
  data?: T
  /** Error message (present on failure) */
  error?: string
  /** Error code (present on failure) */
  code?: string
}

/**
 * Pagination information
 */
export interface Pagination {
  /** Current page number (1-indexed) */
  page: number
  /** Number of items per page */
  limit: number
  /** Total number of items */
  total: number
  /** Total number of pages */
  totalPages: number
  /** Whether there are more pages */
  hasNext: boolean
}

/**
 * User quota information
 */
export interface Quota {
  /** Number of skills currently installed */
  used: number
  /** Maximum number of skills allowed */
  limit: number
  /** Remaining skill slots */
  remaining: number
  /** User's subscription tier */
  tier: 'free' | 'pro' | 'enterprise'
}

// ============================================
// Skill Types
// ============================================

/**
 * Skill category enumeration
 */
export type SkillCategory
  = | 'development'
    | 'productivity'
    | 'writing'
    | 'analysis'
    | 'automation'
    | 'integration'
    | 'utility'
    | 'other'

/**
 * Skill provider enumeration
 */
export type SkillProvider
  = | 'official'
    | 'community'
    | 'verified'
    | 'third-party'

/**
 * Skill status enumeration
 */
export type SkillStatus
  = | 'active'
    | 'deprecated'
    | 'beta'
    | 'archived'

/**
 * Supported AI agents
 */
export type SupportedAgent
  = | 'claude-code'
    | 'codex'
    | 'aider'
    | 'continue'
    | 'cline'
    | 'cursor'

/**
 * Skill metadata
 */
export interface SkillMetadata {
  /** Minimum required version */
  minVersion?: string
  /** Maximum supported version */
  maxVersion?: string
  /** Required dependencies */
  dependencies?: string[]
  /** Skill configuration schema */
  configSchema?: Record<string, unknown>
  /** Additional custom metadata */
  [key: string]: unknown
}

/**
 * Complete skill information
 */
export interface Skill {
  /** Unique skill identifier */
  skillId: string
  /** Skill name (English) */
  name: string
  /** URL-friendly slug */
  slug: string
  /** Skill name (Chinese) */
  nameZh: string
  /** Description (English) */
  descriptionEn: string
  /** Description (Chinese) */
  descriptionZh: string
  /** Source repository name */
  repo: string
  /** Source repository URL */
  repoUrl: string
  /** GitHub stars count */
  stars: number
  /** Total cloud install count */
  installCount: number
  /** Local install count (from CLI) */
  localInstallCount: number
  /** Skill category */
  category: SkillCategory
  /** Skill tags for filtering */
  tags: string[]
  /** Skill provider type */
  provider: SkillProvider
  /** Whether this is an official Anthropic skill */
  isOfficial: boolean
  /** Whether this skill is verified */
  isVerified: boolean
  /** Whether this skill is currently trending */
  isTrending: boolean
  /** Trending rank (null if not trending) */
  trendingRank: number | null
  /** Trigger command (e.g., "/commit") */
  trigger: string
  /** Alternative trigger aliases */
  aliases: string[]
  /** CLI installation command */
  installCommand: string
  /** List of supported AI agents */
  supportedAgents: SupportedAgent[]
  /** Average rating (1-5) */
  ratingAvg: number
  /** Total number of ratings */
  ratingCount: number
  /** Number of times searched */
  searchCount: number
  /** Current skill status */
  status: SkillStatus
  /** Additional metadata */
  metadata: SkillMetadata
  /** Creation timestamp (ISO 8601) */
  createdAt: string
  /** Last update timestamp (ISO 8601) */
  updatedAt: string
}

/**
 * User's installed skill with usage information
 */
export interface UserSkill {
  /** Skill identifier */
  skillId: string
  /** Skill name */
  name: string
  /** Installation timestamp (ISO 8601) */
  installedAt: string
  /** Last usage timestamp (ISO 8601, null if never used) */
  lastUsedAt: string | null
  /** Total usage count */
  usageCount: number
  /** Whether the skill is enabled */
  isEnabled: boolean
  /** User's custom configuration */
  config: Record<string, unknown>
}

// ============================================
// Rating Types
// ============================================

/**
 * Skill rating/review
 */
export interface Rating {
  /** Unique rating identifier */
  id: string
  /** User ID who created the rating */
  userId: string
  /** Display name of the user */
  userName: string
  /** Skill being rated */
  skillId: string
  /** Rating value (1-5) */
  rating: number
  /** Optional review text */
  review: string | null
  /** Number of users who found this helpful */
  helpful: number
  /** Creation timestamp (ISO 8601) */
  createdAt: string
  /** Last update timestamp (ISO 8601) */
  updatedAt: string
}

/**
 * Rating summary statistics
 */
export interface RatingSummary {
  /** Average rating */
  average: number
  /** Total number of ratings */
  count: number
  /** Distribution by star count */
  distribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

// ============================================
// Request Parameter Types
// ============================================

/**
 * Parameters for marketplace listing
 */
export interface MarketplaceParams {
  /** Page number (1-indexed, default: 1) */
  page?: number
  /** Items per page (default: 20, max: 100) */
  limit?: number
  /** Filter by category */
  category?: SkillCategory
  /** Filter by provider */
  provider?: SkillProvider
  /** Sort order */
  sort?: 'popular' | 'newest' | 'rating' | 'trending' | 'name'
  /** Filter official skills only */
  isOfficial?: boolean
  /** Filter trending skills only */
  isTrending?: boolean
}

/**
 * Parameters for skill search
 */
export interface SearchParams {
  /** Search query string */
  q: string
  /** Filter by category */
  category?: SkillCategory
  /** Filter by provider */
  provider?: SkillProvider
  /** Maximum results (default: 20) */
  limit?: number
  /** Offset for pagination (default: 0) */
  offset?: number
}

/**
 * Parameters for search suggestions
 */
export interface SuggestionsParams {
  /** Partial search query */
  q: string
  /** Maximum suggestions (default: 10) */
  limit?: number
}

/**
 * Parameters for trending skills
 */
export interface TrendingParams {
  /** Maximum results (default: 10) */
  limit?: number
}

/**
 * Parameters for skill recommendations
 */
export interface RecommendationsParams {
  /** User ID for personalization */
  userId?: string
  /** Maximum recommendations (default: 10) */
  limit?: number
  /** Exclude already installed skills */
  excludeInstalled?: boolean
}

/**
 * Parameters for ratings listing
 */
export interface RatingsParams {
  /** Page number (1-indexed, default: 1) */
  page?: number
  /** Items per page (default: 20) */
  limit?: number
  /** Sort order */
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'
}

// ============================================
// Request Body Types
// ============================================

/**
 * Request to install a skill
 */
export interface InstallSkillRequest {
  /** Skill ID to install */
  skillId: string
  /** User's subscription tier (for quota validation) */
  userTier?: 'free' | 'pro' | 'enterprise'
}

/**
 * Request to update a user's skill
 */
export interface UpdateSkillRequest {
  /** Enable or disable the skill */
  isEnabled?: boolean
  /** Custom configuration */
  config?: Record<string, unknown>
}

/**
 * Request to create a rating
 */
export interface CreateRatingRequest {
  /** User ID creating the rating */
  userId: string
  /** Rating value (1-5) */
  rating: number
  /** Optional review text */
  review?: string
}

// ============================================
// Response Data Types
// ============================================

/**
 * Available filter options
 */
export interface MarketplaceFilters {
  /** Available categories */
  categories: SkillCategory[]
  /** Available providers */
  providers: SkillProvider[]
  /** Available sort options */
  sortOptions: string[]
}

/**
 * Response for marketplace listing
 */
export interface MarketplaceResponse {
  /** List of skills */
  skills: Skill[]
  /** Pagination information */
  pagination: Pagination
  /** Available filter options */
  filters: MarketplaceFilters
}

/**
 * Response for skill search
 */
export interface SearchResponse {
  /** Search results */
  results: Skill[]
  /** Total matching results */
  total: number
  /** Original search query */
  query: string
}

/**
 * Search suggestion item
 */
export interface Suggestion {
  /** Suggested text */
  text: string
  /** Suggestion type */
  type: 'skill' | 'category' | 'tag'
  /** Related skill ID (if type is 'skill') */
  skillId?: string
}

/**
 * Response for search suggestions
 */
export interface SuggestionsResponse {
  /** List of suggestions */
  suggestions: Suggestion[]
}

/**
 * Response for trending skills
 */
export interface TrendingResponse {
  /** List of trending skills */
  trending: Skill[]
}

/**
 * Recommendation basis information
 */
export interface RecommendationBasis {
  /** Basis type */
  type: 'similar_users' | 'installed_skills' | 'popular' | 'category'
  /** Related skill IDs or categories */
  related: string[]
}

/**
 * Response for skill recommendations
 */
export interface RecommendationsResponse {
  /** List of recommended skills */
  recommendations: Skill[]
  /** Total available recommendations */
  total: number
  /** Basis for recommendations */
  basedOn: RecommendationBasis[]
}

/**
 * Response for user's installed skills
 */
export interface UserSkillsResponse {
  /** List of user's installed skills */
  skills: UserSkill[]
  /** Total installed skills count */
  total: number
  /** User's quota information */
  quota: Quota
}

/**
 * Response for skill installation
 */
export interface InstallResponse {
  /** Installed skill ID */
  skillId: string
  /** Installation timestamp (ISO 8601) */
  installedAt: string
  /** Updated quota information */
  quota: Quota
}

/**
 * Response for skill uninstallation
 */
export interface UninstallResponse {
  /** Uninstalled skill ID */
  skillId: string
  /** Uninstallation timestamp (ISO 8601) */
  uninstalledAt: string
  /** Updated quota information */
  quota: Quota
}

/**
 * Response for skill update
 */
export interface UpdateResponse {
  /** Updated skill ID */
  skillId: string
  /** New enabled status */
  isEnabled: boolean
  /** Updated configuration */
  config: Record<string, unknown>
  /** Update timestamp (ISO 8601) */
  updatedAt: string
}

/**
 * Response for ratings listing
 */
export interface RatingsResponse {
  /** List of ratings */
  ratings: Rating[]
  /** Rating summary statistics */
  summary: RatingSummary
  /** Pagination information */
  pagination: Pagination
}

/**
 * Response for creating a rating
 */
export interface CreateRatingResponse {
  /** Created rating ID */
  id: string
  /** Skill ID */
  skillId: string
  /** User ID */
  userId: string
  /** Rating value */
  rating: number
  /** Review text */
  review: string | null
  /** Helpful count (starts at 0) */
  helpful: number
  /** Creation timestamp (ISO 8601) */
  createdAt: string
}
