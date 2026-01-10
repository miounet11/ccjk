import type { SupportedLang } from '../constants'
import type { AgentExtension, McpServiceExtension, WorkflowExtension } from '../plugins/types'
import type { CcjkSkill } from '../skills/types'

/**
 * Plugin category types
 */
export type PluginCategory = 'dev' | 'seo' | 'devops' | 'testing' | 'docs' | 'ai' | 'security' | 'performance' | 'custom'

/**
 * Cloud plugin definition
 * Represents a plugin available from the cloud registry
 */
export interface CloudPlugin {
  /** Unique plugin identifier */
  id: string
  /** Localized plugin name */
  name: Record<SupportedLang, string>
  /** Localized plugin description */
  description: Record<SupportedLang, string>
  /** Plugin category */
  category: PluginCategory
  /** Plugin version (semver) */
  version: string
  /** Plugin author */
  author: string
  /** Total download count */
  downloads: number
  /** Average rating (0-5) */
  rating: number
  /** Search and filter tags */
  tags: string[]
  /** Plugin dependencies (other plugin IDs) */
  dependencies?: string[]
  /** Plugin size in bytes */
  size: number
  /** Creation timestamp (ISO 8601) */
  createdAt: string
  /** Last update timestamp (ISO 8601) */
  updatedAt: string

  // Plugin content extensions
  /** Skills provided by this plugin */
  skills?: CcjkSkill[]
  /** Agents provided by this plugin */
  agents?: AgentExtension[]
  /** Workflows provided by this plugin */
  workflows?: WorkflowExtension[]
  /** MCP services provided by this plugin */
  mcpServices?: McpServiceExtension[]
}

/**
 * Recommendation context for intelligent plugin suggestions
 * Used to provide personalized plugin recommendations based on project and user preferences
 */
export interface RecommendationContext {
  /** Detected project type (e.g., 'nextjs', 'vue', 'react', 'node', 'python') */
  projectType?: string
  /** Primary programming language */
  language?: string
  /** Detected frameworks in the project */
  frameworks?: string[]
  /** Detected programming languages */
  languages?: string[]
  /** Detected build tools */
  buildTools?: string[]
  /** Detected test frameworks */
  testFrameworks?: string[]
  /** Has TypeScript */
  hasTypeScript?: boolean
  /** Has Docker */
  hasDocker?: boolean
  /** Has monorepo setup */
  hasMonorepo?: boolean
  /** Package manager */
  packageManager?: string
  /** CI/CD systems */
  cicd?: string[]
  /** Project root directory */
  rootDir?: string
  /** Recommended categories based on detection */
  recommendedCategories?: PluginCategory[]
  /** Recommended tags based on detection */
  recommendedTags?: string[]
  /** Already installed plugin IDs */
  existingPlugins?: string[]
  /** User preferences for recommendations */
  userPreferences?: UserPreferences
}

/**
 * User preferences for plugin recommendations
 */
export interface UserPreferences {
  /** Preferred plugin categories */
  preferredCategories?: PluginCategory[]
  /** Categories to exclude from recommendations */
  excludedCategories?: PluginCategory[]
  /** User's preferred language for UI */
  preferredLanguage: SupportedLang
}

/**
 * Single plugin recommendation with scoring details
 */
export interface PluginRecommendation {
  /** The recommended plugin */
  plugin: CloudPlugin
  /** Relevance score (0-100) */
  score: number
  /** Localized explanation for the recommendation */
  reason: Record<SupportedLang, string>
  /** Confidence score (0-1) */
  confidence: number
  /** Tags that matched the context */
  matchingTags: string[]
  /** Categories that matched the context */
  matchingCategories: PluginCategory[]
  /** Whether the plugin is already installed */
  isInstalled: boolean
}

/**
 * Plugin recommendation result
 * Contains recommended plugins with reasoning and confidence scores
 */
export interface RecommendationResult {
  /** List of plugin recommendations with scores */
  recommendations: PluginRecommendation[]
  /** The context used for recommendations */
  context: RecommendationContext
  /** Total plugins evaluated */
  totalEvaluated: number
  /** Source of recommendations */
  source: 'local' | 'cloud' | 'hybrid'
  /** Timestamp of the recommendation */
  timestamp: string
}

/**
 * Cloud plugin cache structure
 * Used to cache plugin data locally to reduce API calls
 */
export interface CloudPluginCache {
  /** Cache format version */
  version: string
  /** Cached plugin list */
  plugins: CloudPlugin[]
  /** Timestamp when cache was created (ISO 8601) */
  createdAt: string
  /** Timestamp when cache expires (ISO 8601) */
  expiresAt: string
  /** Timestamp when cache was last updated (ISO 8601) */
  lastUpdated: string
  /** Total number of plugins in cache */
  totalPlugins: number
}

/**
 * Cache statistics
 * Provides information about the current state of the plugin cache
 */
export interface CacheStats {
  /** Total number of plugins in cache */
  totalPlugins: number
  /** Total cache size in bytes */
  cacheSize: number
  /** Timestamp when cache was last updated (ISO 8601) */
  lastUpdated: string | null
  /** Timestamp when cache expires (ISO 8601) */
  expiresAt: string | null
  /** Whether the cache is expired */
  isExpired: boolean
  /** Number of cached plugin contents */
  cachedContents: number
}

/**
 * Plugin installation options
 */
export interface PluginInstallOptions {
  /** Force reinstall even if already installed */
  force?: boolean
  /** Skip installing plugin dependencies */
  skipDependencies?: boolean
  /** Perform dry run without actual installation */
  dryRun?: boolean
}

/**
 * Plugin installation result
 */
export interface PluginInstallResult {
  /** Plugin ID that was installed */
  pluginId: string
  /** Whether installation succeeded */
  success: boolean
  /** Path where plugin was installed */
  installedPath?: string
  /** Error message if installation failed */
  error?: string
  /** List of dependency plugin IDs that were installed */
  dependencies?: string[]
}

/**
 * Generic cloud API response wrapper
 * @template T - The type of data returned in the response
 */
export interface CloudApiResponse<T> {
  /** Whether the API call succeeded */
  success: boolean
  /** Response data (present if success is true) */
  data?: T
  /** Error information (present if success is false) */
  error?: {
    /** Error code */
    code: string
    /** Error message */
    message: string
  }
  /** Additional metadata about the response */
  meta?: {
    /** Total number of items (for paginated responses) */
    total?: number
    /** Current page number */
    page?: number
    /** Number of items per page */
    pageSize?: number
  }
}

/**
 * Plugin search parameters
 * Used to filter and sort plugins in the cloud registry
 */
export interface PluginSearchParams {
  /** Search query string */
  query?: string
  /** Filter by category */
  category?: PluginCategory
  /** Filter by tags (AND logic) */
  tags?: string[]
  /** Sort field */
  sortBy?: 'downloads' | 'rating' | 'updated' | 'name'
  /** Sort order */
  order?: 'asc' | 'desc'
  /** Page number (1-indexed) */
  page?: number
  /** Number of items per page */
  pageSize?: number
}
