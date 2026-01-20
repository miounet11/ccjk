/**
 * MCP Cloud Service Types
 * Core type definitions for the MCP service integration system
 */

/**
 * MCP Service metadata
 */
export interface MCPService {
  id: string
  name: string
  package: string
  version: string
  description: string
  category: string[]
  tags: string[]
  author: string
  homepage: string
  repository: string
  license: string
  downloads: number
  rating: number
  reviews: number
  trending: boolean
  featured: boolean
  dependencies: string[]
  compatibility: {
    node: string
    os: string[]
  }
  installation: {
    command: string
    config: any
  }
  examples: string[]
  documentation: string
  lastUpdated: string
  verified: boolean
}

/**
 * Detailed service information
 */
export interface MCPServiceDetail extends MCPService {
  readme: string
  changelog: string
  screenshots: string[]
  videos: string[]
  tutorials: string[]
  useCases: string[]
  integrations: string[]
  pricing?: {
    free: boolean
    plans?: Array<{
      name: string
      price: number
      features: string[]
    }>
  }
  support: {
    email?: string
    discord?: string
    github?: string
    documentation?: string
  }
  metrics: {
    responseTime: number
    uptime: number
    errorRate: number
  }
}

/**
 * User profile for recommendations
 */
export interface UserProfile {
  id: string
  techStack: string[]
  projectTypes: string[]
  usagePatterns: Record<string, number>
  installedServices: string[]
  preferences: {
    categories: string[]
    tags: string[]
  }
  experience: 'beginner' | 'intermediate' | 'advanced'
}

/**
 * Search filters
 */
export interface SearchFilters {
  categories?: string[]
  tags?: string[]
  minRating?: number
  minDownloads?: number
  verified?: boolean
  trending?: boolean
  featured?: boolean
  compatibility?: {
    node?: string
    os?: string[]
  }
  license?: string[]
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated' | 'name'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * Service ratings
 */
export interface ServiceRatings {
  serviceId: string
  averageRating: number
  totalReviews: number
  distribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
  recentReviews: Array<{
    userId: string
    username: string
    rating: number
    comment: string
    date: string
    helpful: number
  }>
}

/**
 * Installation options
 */
export interface InstallOptions {
  version?: string
  global?: boolean
  dev?: boolean
  force?: boolean
  skipDependencies?: boolean
  configPath?: string
  autoConfig?: boolean
}

/**
 * Installation result
 */
export interface InstallResult {
  success: boolean
  serviceId: string
  version: string
  installedAt: string
  configPath?: string
  error?: string
  warnings?: string[]
  dependencies?: Array<{
    name: string
    version: string
    installed: boolean
  }>
}

/**
 * Batch installation result
 */
export interface BatchInstallResult {
  success: boolean
  installed: string[]
  failed: Array<{
    serviceId: string
    error: string
  }>
  totalTime: number
}

/**
 * Uninstall result
 */
export interface UninstallResult {
  success: boolean
  serviceId: string
  removedAt: string
  error?: string
  warnings?: string[]
}

/**
 * Update information
 */
export interface UpdateInfo {
  serviceId: string
  currentVersion: string
  latestVersion: string
  releaseNotes: string
  breaking: boolean
  size: number
  publishedAt: string
}

/**
 * Update result
 */
export interface UpdateResult {
  success: boolean
  serviceId: string
  fromVersion: string
  toVersion: string
  updatedAt: string
  error?: string
  warnings?: string[]
  rollbackAvailable: boolean
}

/**
 * Rollback result
 */
export interface RollbackResult {
  success: boolean
  serviceId: string
  fromVersion: string
  toVersion: string
  rolledBackAt: string
  error?: string
}

/**
 * Service bundle
 */
export interface ServiceBundle {
  id: string
  name: string
  description: string
  icon: string
  services: Array<{
    serviceId: string
    version?: string
    required: boolean
  }>
  category: string
  downloads: number
  rating: number
  featured: boolean
}

/**
 * Usage statistics
 */
export interface UsageStats {
  serviceId: string
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  averageResponseTime: number
  lastUsed: string
  mostUsedFeatures: Array<{
    feature: string
    count: number
  }>
  dailyUsage: Array<{
    date: string
    calls: number
  }>
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  serviceId: string
  averageResponseTime: number
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  uptime: number
  lastChecked: string
}

/**
 * Service combo recommendation
 */
export interface ServiceCombo {
  name: string
  description: string
  services: string[]
  useCase: string
  popularity: number
  rating: number
}

/**
 * Cloud API configuration
 */
export interface CloudAPIConfig {
  baseUrl: string
  apiKey?: string
  timeout: number
  retries: number
  cacheEnabled: boolean
  cacheTTL: number
}

/**
 * Cache entry
 */
export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * Sync status
 */
export interface SyncStatus {
  lastSync: string
  nextSync: string
  status: 'idle' | 'syncing' | 'error'
  servicesCount: number
  error?: string
}

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  serviceId: string
  action: string
  timestamp: string
  metadata?: Record<string, any>
  userId?: string
  sessionId?: string
}

/**
 * Marketplace state
 */
export interface MarketplaceState {
  services: MCPService[]
  trending: MCPService[]
  featured: MCPService[]
  categories: string[]
  tags: string[]
  lastUpdated: string
}
