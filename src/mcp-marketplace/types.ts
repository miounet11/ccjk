/**
 * MCP Marketplace Plugin Manager Types
 *
 * Type definitions for the plugin management system including
 * installation, updates, dependencies, and configuration.
 */

/**
 * Plugin installation options
 */
export interface InstallOptions {
  /** Specific version to install (semver) */
  version?: string
  /** Force reinstall even if already installed */
  force?: boolean
  /** Skip dependency installation */
  skipDependencies?: boolean
  /** Install globally (user-level) vs project-level */
  global?: boolean
  /** Perform dry run without actual installation */
  dryRun?: boolean
}

/**
 * Plugin installation result
 */
export interface InstallResult {
  /** Whether installation succeeded */
  success: boolean
  /** Plugin package ID */
  packageId: string
  /** Installed version */
  version: string
  /** List of installed dependency package IDs */
  installedDependencies: string[]
  /** Warning messages during installation */
  warnings: string[]
  /** Error message if installation failed */
  error?: string
  /** Path where plugin was installed */
  installedPath?: string
  /** Backup path if previous version was backed up */
  backupPath?: string
}

/**
 * Plugin update result
 */
export interface UpdateResult {
  /** Whether update succeeded */
  success: boolean
  /** Plugin package ID */
  packageId: string
  /** Previous version */
  previousVersion: string
  /** New version after update */
  newVersion: string
  /** Warning messages during update */
  warnings: string[]
  /** Error message if update failed */
  error?: string
  /** Backup path for rollback */
  backupPath?: string
}

/**
 * Batch update result
 */
export interface BatchUpdateResult {
  /** Total plugins checked */
  totalChecked: number
  /** Number of plugins updated */
  updated: number
  /** Number of plugins that failed to update */
  failed: number
  /** Individual update results */
  results: UpdateResult[]
  /** Plugins that were skipped (already up to date) */
  skipped: string[]
}

/**
 * Installed plugin information
 */
export interface InstalledPackage {
  /** Plugin package ID */
  packageId: string
  /** Installed version */
  version: string
  /** Installation timestamp (ISO 8601) */
  installedAt: string
  /** Last updated timestamp (ISO 8601) */
  updatedAt: string
  /** Installation path */
  path: string
  /** Whether plugin is enabled */
  enabled: boolean
  /** Whether installed globally */
  global: boolean
  /** Plugin dependencies */
  dependencies: string[]
  /** Plugin configuration */
  config?: PluginConfig
  /** Checksum for integrity verification */
  checksum?: string
  /** Previous version for rollback */
  previousVersion?: string
  /** Backup path for rollback */
  backupPath?: string
}

/**
 * Dependency check result
 */
export interface DependencyCheck {
  /** Plugin package ID */
  packageId: string
  /** Whether all dependencies are satisfied */
  satisfied: boolean
  /** List of missing dependencies */
  missing: string[]
  /** List of outdated dependencies */
  outdated: DependencyInfo[]
  /** List of conflicting dependencies */
  conflicts: DependencyConflict[]
  /** Resolved dependency tree */
  resolved: ResolvedDependency[]
}

/**
 * Dependency information
 */
export interface DependencyInfo {
  /** Dependency package ID */
  packageId: string
  /** Required version range */
  requiredVersion: string
  /** Currently installed version (if any) */
  installedVersion?: string
  /** Latest available version */
  latestVersion?: string
}

/**
 * Dependency conflict information
 */
export interface DependencyConflict {
  /** Conflicting package ID */
  packageId: string
  /** Version required by parent */
  requiredBy: string
  /** Required version */
  requiredVersion: string
  /** Conflicting version */
  conflictingVersion: string
  /** Conflict resolution suggestion */
  resolution?: string
}

/**
 * Resolved dependency in the tree
 */
export interface ResolvedDependency {
  /** Package ID */
  packageId: string
  /** Resolved version */
  version: string
  /** Depth in dependency tree */
  depth: number
  /** Parent package ID */
  parent?: string
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  /** Plugin-specific settings */
  settings: Record<string, unknown>
  /** Environment variables */
  env?: Record<string, string>
  /** Custom MCP server configuration */
  mcpConfig?: McpServerPluginConfig
  /** Auto-start on load */
  autoStart?: boolean
  /** Priority order (lower = higher priority) */
  priority?: number
}

/**
 * MCP server plugin configuration
 */
export interface McpServerPluginConfig {
  /** Command to run the MCP server */
  command: string
  /** Command arguments */
  args?: string[]
  /** Environment variables */
  env?: Record<string, string>
  /** Working directory */
  cwd?: string
}

/**
 * Plugin verification result
 */
export interface VerificationResult {
  /** Whether verification passed */
  valid: boolean
  /** Plugin package ID */
  packageId: string
  /** Verification checks performed */
  checks: VerificationCheck[]
  /** Overall integrity status */
  integrity: 'valid' | 'corrupted' | 'modified' | 'unknown'
  /** Timestamp of verification */
  verifiedAt: string
}

/**
 * Individual verification check
 */
export interface VerificationCheck {
  /** Check name */
  name: string
  /** Whether check passed */
  passed: boolean
  /** Check details or error message */
  message?: string
}

/**
 * Plugin manager events
 */
export type PluginManagerEvent
  = | 'install:start'
    | 'install:progress'
    | 'install:complete'
    | 'install:error'
    | 'uninstall:start'
    | 'uninstall:complete'
    | 'uninstall:error'
    | 'update:start'
    | 'update:progress'
    | 'update:complete'
    | 'update:error'
    | 'enable:change'
    | 'config:change'
    | 'rollback:start'
    | 'rollback:complete'
    | 'rollback:error'

/**
 * Event payload for install:start
 */
export interface InstallStartPayload {
  packageId: string
  version?: string
  options: InstallOptions
}

/**
 * Event payload for install:progress
 */
export interface InstallProgressPayload {
  packageId: string
  phase: 'downloading' | 'extracting' | 'installing' | 'configuring' | 'verifying'
  progress: number // 0-100
  message?: string
}

/**
 * Event payload for install:complete
 */
export interface InstallCompletePayload {
  result: InstallResult
}

/**
 * Event payload for install:error
 */
export interface InstallErrorPayload {
  packageId: string
  error: Error
}

/**
 * Plugin registry entry (from marketplace)
 */
export interface PluginRegistryEntry {
  /** Plugin package ID */
  packageId: string
  /** Plugin name */
  name: string
  /** Plugin description */
  description: string
  /** Latest version */
  latestVersion: string
  /** All available versions */
  versions: string[]
  /** Plugin author */
  author: string
  /** Plugin license */
  license: string
  /** Plugin homepage */
  homepage?: string
  /** Plugin repository */
  repository?: string
  /** Plugin dependencies */
  dependencies?: Record<string, string>
  /** Plugin keywords/tags */
  keywords?: string[]
  /** Download count */
  downloads: number
  /** Plugin checksum by version */
  checksums: Record<string, string>
  /** Created timestamp */
  createdAt: string
  /** Updated timestamp */
  updatedAt: string
}

/**
 * Plugin manifest (package.json equivalent)
 */
export interface PluginManifest {
  /** Plugin package ID */
  packageId: string
  /** Plugin version */
  version: string
  /** Plugin name */
  name: string
  /** Plugin description */
  description: string
  /** Plugin author */
  author: string
  /** Plugin license */
  license: string
  /** Main entry point */
  main?: string
  /** Plugin dependencies */
  dependencies?: Record<string, string>
  /** MCP server configuration */
  mcpServer?: McpServerPluginConfig
  /** Plugin configuration schema */
  configSchema?: Record<string, unknown>
  /** Minimum CCJK version required */
  ccjkVersion?: string
  /** Plugin keywords */
  keywords?: string[]
}

/**
 * Installed plugins registry
 */
export interface InstalledPluginsRegistry {
  /** Registry version */
  version: string
  /** Installed plugins map */
  plugins: Record<string, InstalledPackage>
  /** Last updated timestamp */
  updatedAt: string
}

// ============================================================================
// Marketplace Client Types
// ============================================================================

/**
 * MCP Package category
 */
export type MCPCategory
  = | 'ai-tools'
    | 'dev-tools'
    | 'productivity'
    | 'data-processing'
    | 'integrations'
    | 'utilities'

/**
 * Verification status for packages
 */
export type VerificationStatus = 'verified' | 'unverified' | 'pending' | 'rejected'

/**
 * Sort options for search results
 */
export type SortOption = 'relevance' | 'downloads' | 'rating' | 'updated' | 'name'

/**
 * Localized string (supports multiple languages)
 */
export interface LocalizedString {
  'zh-CN': string
  'en': string
}

/**
 * Package dependency
 */
export interface Dependency {
  /** Dependency package ID */
  id: string
  /** Required version range (semver) */
  version: string
}

/**
 * Package permission requirement
 */
export interface Permission {
  /** Permission type */
  type: 'filesystem' | 'network' | 'shell' | 'env'
  /** Permission scope (optional, e.g., specific paths or env vars) */
  scope?: string
  /** Reason for requiring this permission */
  reason: LocalizedString
}

/**
 * Package compatibility information
 */
export interface CompatibilityInfo {
  /** Minimum CCJK version required */
  minCcjkVersion?: string
  /** Supported platforms */
  platforms?: Array<'darwin' | 'linux' | 'win32' | 'android'>
  /** Supported code tools */
  codeTools?: string[]
  /** Node.js version requirement */
  nodeVersion?: string
}

/**
 * MCP Package information
 */
export interface MCPPackage {
  /** Unique package ID */
  id: string
  /** Package name */
  name: string
  /** Current version */
  version: string
  /** Package description */
  description: LocalizedString
  /** Package author */
  author: string
  /** Repository URL */
  repository?: string
  /** Homepage URL */
  homepage?: string
  /** Download count */
  downloads: number
  /** Average rating (0-5) */
  rating: number
  /** Number of ratings */
  ratingCount: number
  /** Package tags */
  tags: string[]
  /** Package category */
  category: MCPCategory
  /** Compatibility information */
  compatibility: CompatibilityInfo
  /** Package dependencies */
  dependencies: Dependency[]
  /** Required permissions */
  permissions: Permission[]
  /** Whether package is verified */
  verified: boolean
  /** Verification status */
  verificationStatus: VerificationStatus
  /** Package size in bytes */
  size: number
  /** License type */
  license: string
  /** Keywords for search */
  keywords?: string[]
  /** Published timestamp */
  publishedAt: string
  /** Last updated timestamp */
  updatedAt: string
}

/**
 * Category information
 */
export interface CategoryInfo {
  /** Category ID */
  id: MCPCategory
  /** Category name */
  name: LocalizedString
  /** Category description */
  description: LocalizedString
  /** Number of packages in category */
  count: number
  /** Category icon (emoji or URL) */
  icon?: string
}

/**
 * Version information for a package
 */
export interface VersionInfo {
  /** Version number */
  version: string
  /** Release notes */
  releaseNotes?: LocalizedString
  /** Published timestamp */
  publishedAt: string
  /** Whether this is a pre-release */
  prerelease?: boolean
  /** Download count for this version */
  downloads?: number
  /** Package size in bytes */
  size?: number
  /** Checksum for integrity verification */
  checksum?: string
}

/**
 * Update information for an installed package
 */
export interface UpdateInfo {
  /** Package ID */
  packageId: string
  /** Current installed version */
  currentVersion: string
  /** Latest available version */
  latestVersion: string
  /** Whether update is available */
  updateAvailable: boolean
  /** Whether this is a breaking change */
  breaking?: boolean
  /** Update priority (critical, recommended, optional) */
  priority?: 'critical' | 'recommended' | 'optional'
  /** Release notes for the update */
  releaseNotes?: LocalizedString
}

/**
 * Search options
 */
export interface SearchOptions {
  /** Search query */
  query?: string
  /** Filter by category */
  category?: MCPCategory
  /** Filter by tags */
  tags?: string[]
  /** Sort by field */
  sortBy?: SortOption
  /** Sort order */
  sortOrder?: 'asc' | 'desc'
  /** Filter verified packages only */
  verified?: boolean
  /** Filter by verification status */
  verificationStatus?: VerificationStatus
  /** Filter by author */
  author?: string
  /** Filter by platform */
  platform?: string
  /** Filter by code tool */
  codeTool?: string
  /** Minimum rating filter */
  minRating?: number
  /** Page number (1-indexed) */
  page?: number
  /** Results per page */
  limit?: number
}

/**
 * Search result
 */
export interface SearchResult {
  /** Matching packages */
  packages: MCPPackage[]
  /** Total number of results */
  total: number
  /** Current page */
  page: number
  /** Results per page */
  limit: number
  /** Total pages */
  totalPages: number
  /** Whether there are more results */
  hasMore: boolean
}

/**
 * Marketplace API response wrapper
 */
export interface MarketplaceApiResponse<T> {
  /** Whether request succeeded */
  success: boolean
  /** Response data (if successful) */
  data?: T
  /** Error information (if failed) */
  error?: {
    code: string
    message: string
  }
  /** Response timestamp */
  timestamp: string
}

/**
 * Marketplace cache structure
 */
export interface MarketplaceCache {
  /** Cache version */
  version: string
  /** Cached packages */
  packages: MCPPackage[]
  /** Cached categories */
  categories: CategoryInfo[]
  /** Cache creation timestamp */
  createdAt: string
  /** Cache expiration timestamp */
  expiresAt: string
  /** Last updated timestamp */
  lastUpdated: string
}

/**
 * Cache statistics
 */
export interface MarketplaceCacheStats {
  /** Total cached packages */
  totalPackages: number
  /** Cache size in bytes */
  cacheSize: number
  /** Last updated timestamp */
  lastUpdated: string | null
  /** Cache expiration timestamp */
  expiresAt: string | null
  /** Whether cache is expired */
  isExpired: boolean
  /** Number of cached categories */
  cachedCategories: number
}

/**
 * Marketplace client options
 */
export interface MarketplaceClientOptions {
  /** Base API URL */
  baseUrl?: string
  /** API key for authentication */
  apiKey?: string
  /** Request timeout in milliseconds */
  timeout?: number
  /** Enable offline mode (use cache only) */
  offlineMode?: boolean
  /** Enable debug logging */
  enableLogging?: boolean
  /** Maximum retry attempts */
  maxRetries?: number
  /** Retry delay in milliseconds */
  retryDelay?: number
  /** Cache TTL in milliseconds */
  cacheTTL?: number
  /** Enable request deduplication */
  enableDeduplication?: boolean
  /** Throttle interval in milliseconds */
  throttleInterval?: number
}
