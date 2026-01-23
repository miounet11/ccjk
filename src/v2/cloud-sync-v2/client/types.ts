/**
 * API Types for api.claudehome.cn v1
 * Complete TypeScript type definitions for all API endpoints
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ListOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface SearchQuery {
  query?: string;
  categories?: string[];
  tags?: string[];
  language?: string;
  minRating?: number;
  sortBy?: 'relevance' | 'rating' | 'downloads' | 'updated';
  page?: number;
  pageSize?: number;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface OAuthState {
  state: string;
  provider: 'github' | 'google';
  redirectUri: string;
}

// ============================================================================
// Skill Types
// ============================================================================

export interface UploadSkillRequest {
  name: string;
  description: string;
  content: string | Buffer;
  version: string;
  language: string;
  category?: string;
  tags?: string[];
  isPublic: boolean;
  dependencies?: string[];
}

export interface UploadSkillResponse {
  skillId: string;
  version: string;
  downloadUrl: string;
  publishedAt: string;
}

export interface SkillDetails {
  id: string;
  name: string;
  description: string;
  version: string;
  language: string;
  category: string;
  tags: string[];
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  stats: {
    downloads: number;
    rating: number;
    ratingCount: number;
    views: number;
  };
  isPublic: boolean;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface UpdateSkillRequest {
  name?: string;
  description?: string;
  content?: string | Buffer;
  version?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  dependencies?: string[];
}

export interface SkillList extends PaginatedResponse<SkillDetails> {}

// ============================================================================
// Marketplace Types
// ============================================================================

export interface SearchResults extends PaginatedResponse<SkillDetails> {
  facets?: {
    categories: { name: string; count: number }[];
    tags: { name: string; count: number }[];
    languages: { code: string; count: number }[];
  };
}

export interface TrendingSkills {
  period: 'daily' | 'weekly' | 'monthly';
  skills: SkillDetails[];
}

export interface RecommendedSkills {
  algorithm: 'collaborative' | 'content-based' | 'hybrid';
  skills: SkillDetails[];
  reasons?: string[];
}

export interface FeaturedSkills {
  banner: string;
  title: string;
  description: string;
  skills: SkillDetails[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  skillCount: number;
  subcategories?: Category[];
}

export interface Categories {
  categories: Category[];
}

// ============================================================================
// Sync Types
// ============================================================================

export interface ClientSkillState {
  skillId: string;
  version: string;
  lastSyncedAt: string;
  checksum: string;
}

export interface DeltaUpdate {
  skillId: string;
  action: 'create' | 'update' | 'delete';
  version: string;
  content?: string;
  checksum?: string;
  updatedAt: string;
}

export interface DeltaResponse {
  updates: DeltaUpdate[];
  lastSyncAt: string;
  serverTime: string;
}

export interface SyncStatus {
  lastSyncAt: string | null;
  totalSkills: number;
  syncedSkills: number;
  pendingConflicts: number;
  status: 'synced' | 'syncing' | 'conflict' | 'error';
}

export interface ConflictResolution {
  skillId: string;
  resolution: 'keep_local' | 'keep_remote' | 'merge';
  mergedContent?: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface AnalyticsEvent {
  eventType: 'download' | 'view' | 'rating' | 'search' | 'install' | 'uninstall';
  skillId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface SkillAnalytics {
  skillId: string;
  period: 'daily' | 'weekly' | 'monthly';
  stats: {
    views: number;
    downloads: number;
    installs: number;
    uninstalls: number;
    rating: number;
    ratingCount: number;
  };
  trends: {
    date: string;
    views: number;
    downloads: number;
  }[];
}

export interface UserAnalytics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  stats: {
    totalSkills: number;
    publicSkills: number;
    totalDownloads: number;
    totalViews: number;
    avgRating: number;
  };
  topSkills: {
    skillId: string;
    name: string;
    downloads: number;
    rating: number;
  }[];
}

// ============================================================================
// Community Types
// ============================================================================

export interface Review {
  id: string;
  skillId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  helpful: number;
}

export interface CreateReviewRequest {
  skillId: string;
  rating: number;
  title: string;
  content: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  content?: string;
}

export interface ReviewList extends PaginatedResponse<Review> {}

export interface Comment {
  id: string;
  skillId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  likes: number;
  replies?: Comment[];
}

export interface CreateCommentRequest {
  skillId: string;
  content: string;
  parentId?: string;
}

export interface CommentList extends PaginatedResponse<Comment> {}

export interface Report {
  id: string;
  entityType: 'skill' | 'review' | 'comment' | 'user';
  entityId: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reportedBy: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface CreateReportRequest {
  entityType: 'skill' | 'review' | 'comment' | 'user';
  entityId: string;
  reason: string;
  description: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class APIError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Authorization failed') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends APIError {
  constructor(errors: Record<string, string[]>) {
    super('Validation failed', 422, 'VALIDATION_ERROR', { errors });
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends APIError {
  constructor(
    public retryAfter: number,
    message: string = 'Rate limit exceeded'
  ) {
    super(message, 429, 'RATE_LIMIT_ERROR', { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class ServerError extends APIError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'SERVER_ERROR');
    this.name = 'ServerError';
  }
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  signal?: AbortSignal;
}

export interface RequestConfig {
  method: string;
  path: string;
  body?: any;
  options?: RequestOptions;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface CacheConfig {
  enabled: boolean;
  defaultTTL: number;
  maxSize: number;
}

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  etag?: string;
}
