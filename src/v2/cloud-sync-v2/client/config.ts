/**
 * Configuration for api.claudehome.cn client
 */

export interface ClientConfig {
  baseURL: string
  timeout: number
  retryConfig: RetryConfig
  cacheConfig: CacheConfig
  auth?: AuthConfig
}

export interface RetryConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: string[]
}

export interface CacheConfig {
  enabled: boolean
  defaultTTL: number // milliseconds
  maxSize: number // maximum number of cache entries
}

export interface AuthConfig {
  accessToken?: string
  refreshToken?: string
  apiKey?: string
  tokenRefreshThreshold?: number // milliseconds before expiry to refresh
}

export const DEFAULT_CONFIG: ClientConfig = {
  baseURL: 'https://api.claudehome.cn/v1',
  timeout: 30000,
  retryConfig: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'EHOSTUNREACH',
      'EPIPE',
      'EAI_AGAIN',
      'RATE_LIMIT_ERROR',
      'SERVER_ERROR',
    ],
  },
  cacheConfig: {
    enabled: true,
    defaultTTL: 300000, // 5 minutes
    maxSize: 100,
  },
}

/**
 * API endpoint paths
 */
export const API_PATHS = {
  // Auth
  AUTH_GITHUB: '/auth/github',
  AUTH_GITHUB_CALLBACK: '/auth/github/callback',
  AUTH_GOOGLE: '/auth/google',
  AUTH_GOOGLE_CALLBACK: '/auth/google/callback',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_VERIFY: '/auth/verify',

  // Skills
  SKILLS: '/skills',
  SKILL_DETAILS: (id: string) => `/skills/${id}`,
  SKILL_DOWNLOAD: (id: string) => `/skills/${id}/download`,
  SKILL_UPDATE: (id: string) => `/skills/${id}`,
  SKILL_DELETE: (id: string) => `/skills/${id}`,
  SKILLS_USER: (userId: string) => `/users/${userId}/skills`,

  // Marketplace
  MARKETPLACE_SEARCH: '/marketplace/search',
  MARKETPLACE_TRENDING: '/marketplace/trending',
  MARKETPLACE_RECOMMENDED: '/marketplace/recommended',
  MARKETPLACE_FEATURED: '/marketplace/featured',
  MARKETPLACE_CATEGORIES: '/marketplace/categories',

  // Sync
  SYNC_STATUS: '/sync/status',
  SYNC_DELTA: '/sync/delta',
  SYNC_CONFLICT: (id: string) => `/sync/conflict/${id}`,

  // Analytics
  ANALYTICS_EVENT: '/analytics/events',
  ANALYTICS_SKILL: (id: string) => `/analytics/skills/${id}`,
  ANALYTICS_USER: (id: string) => `/analytics/users/${id}`,

  // Community
  REVIEWS: '/reviews',
  REVIEW_DETAILS: (id: string) => `/reviews/${id}`,
  REVIEW_UPDATE: (id: string) => `/reviews/${id}`,
  REVIEW_DELETE: (id: string) => `/reviews/${id}`,
  SKILL_REVIEWS: (id: string) => `/skills/${id}/reviews`,

  COMMENTS: '/comments',
  COMMENT_DETAILS: (id: string) => `/comments/${id}`,
  COMMENT_UPDATE: (id: string) => `/comments/${id}`,
  COMMENT_DELETE: (id: string) => `/comments/${id}`,
  SKILL_COMMENTS: (id: string) => `/skills/${id}/comments`,

  REPORTS: '/reports',
  REPORT_DETAILS: (id: string) => `/reports/${id}`,
} as const
