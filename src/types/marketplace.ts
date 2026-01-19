/**
 * CCJK Marketplace Type Definitions
 *
 * Defines the structure for the plugin marketplace ecosystem
 * including packages, registry, installation, and distribution.
 *
 * @module types/marketplace
 */

import type { SupportedLang } from '../constants.js'

/**
 * Package category types
 *
 * Defines the types of packages available in the marketplace.
 */
export type PackageCategory
  = | 'plugin' // Full plugins with code
    | 'skill' // SKILL.md files
    | 'workflow' // Workflow templates
    | 'agent' // Agent definitions
    | 'mcp-service' // MCP service configurations
    | 'output-style' // Output style templates
    | 'bundle' // Collection of multiple items

/**
 * Package verification status
 *
 * Indicates the trust level and verification status of a package.
 */
export type VerificationStatus
  = | 'verified' // Officially verified by CCJK team
    | 'community' // Community contributed and reviewed
    | 'unverified' // Not yet reviewed

/**
 * Marketplace package metadata
 *
 * Complete metadata for a package in the marketplace.
 * This is the primary data structure for package discovery and installation.
 *
 * @example
 * ```typescript
 * const package: MarketplacePackage = {
 *   id: 'ccjk-git-workflow',
 *   name: 'Git Workflow Pro',
 *   version: '1.2.0',
 *   description: {
 *     'en': 'Advanced git workflow automation',
 *     'zh-CN': '高级 Git 工作流自动化'
 *   },
 *   author: 'CCJK Team',
 *   license: 'MIT',
 *   keywords: ['git', 'workflow', 'automation'],
 *   category: 'workflow',
 *   downloads: 1500,
 *   rating: 4.8,
 *   ratingCount: 42,
 *   verified: 'verified',
 *   createdAt: '2025-01-01T00:00:00Z',
 *   updatedAt: '2025-01-10T00:00:00Z',
 *   ccjkVersion: '>=3.5.0'
 * }
 * ```
 */
export interface MarketplacePackage {
  /** Unique package identifier (kebab-case) */
  id: string

  /** Display name */
  name: string

  /** Semantic version (e.g., "1.2.0") */
  version: string

  /** Localized descriptions */
  description: Record<SupportedLang, string>

  /** Package author */
  author: string

  /** Author email */
  authorEmail?: string

  /** Repository URL (GitHub, GitLab, etc.) */
  repository?: string

  /** Homepage URL */
  homepage?: string

  /** License identifier (SPDX format) */
  license: string

  /** Search keywords */
  keywords: string[]

  /** Package category */
  category: PackageCategory

  /** Total download count */
  downloads: number

  /** Average rating (1-5) */
  rating: number

  /** Number of ratings */
  ratingCount: number

  /** Verification status */
  verified: VerificationStatus

  /** Creation timestamp (ISO 8601) */
  createdAt: string

  /** Last update timestamp (ISO 8601) */
  updatedAt: string

  /** Package dependencies (package-id: version) */
  dependencies?: Record<string, string>

  /** Minimum CCJK version required (semver range) */
  ccjkVersion: string

  /** Supported code tools */
  supportedTools?: ('claude-code' | 'codex' | 'aider')[]

  /** Package size in bytes */
  size?: number

  /** SHA256 checksum for integrity verification */
  checksum?: string

  /** Preview images (URLs) */
  screenshots?: string[]

  /** Changelog URL or markdown */
  changelog?: string

  /** README content (markdown) */
  readme?: string

  /** Download URL for package archive */
  downloadUrl?: string
}

/**
 * Marketplace search options
 *
 * Configuration for searching and filtering packages in the marketplace.
 *
 * @example
 * ```typescript
 * const options: MarketplaceSearchOptions = {
 *   query: 'git workflow',
 *   category: 'workflow',
 *   verified: 'verified',
 *   sortBy: 'downloads',
 *   sortDir: 'desc',
 *   limit: 20
 * }
 * ```
 */
export interface MarketplaceSearchOptions {
  /** Search query (matches name, description, keywords) */
  query?: string

  /** Filter by category */
  category?: PackageCategory

  /** Filter by author */
  author?: string

  /** Filter by verification status */
  verified?: VerificationStatus

  /** Filter by supported tool */
  supportedTool?: 'claude-code' | 'codex' | 'aider'

  /** Sort field */
  sortBy?: 'downloads' | 'rating' | 'updated' | 'name' | 'created'

  /** Sort direction */
  sortDir?: 'asc' | 'desc'

  /** Results limit */
  limit?: number

  /** Results offset (for pagination) */
  offset?: number

  /** Filter by keywords (AND logic) */
  keywords?: string[]

  /** Minimum rating (1-5) */
  minRating?: number

  /** Minimum CCJK version compatibility */
  minCcjkVersion?: string
}

/**
 * Marketplace search result
 *
 * Contains search results with pagination information.
 */
export interface MarketplaceSearchResult {
  /** Matching packages */
  packages: MarketplacePackage[]

  /** Total count (before pagination) */
  total: number

  /** Current offset */
  offset: number

  /** Current limit */
  limit: number

  /** Search query used */
  query?: string

  /** Applied filters */
  filters?: Partial<MarketplaceSearchOptions>
}

/**
 * Marketplace registry
 *
 * Complete registry of all available packages.
 * This is the main data structure for the marketplace backend.
 */
export interface MarketplaceRegistry {
  /** Registry version (semantic version) */
  version: string

  /** Last updated timestamp (ISO 8601) */
  lastUpdated: string

  /** Registry URL */
  url: string

  /** All packages */
  packages: MarketplacePackage[]

  /** Featured package IDs */
  featured?: string[]

  /** Categories with package counts */
  categories: Record<PackageCategory, number>

  /** Total downloads across all packages */
  totalDownloads?: number

  /** Registry metadata */
  metadata?: {
    /** Registry name */
    name: string
    /** Registry description */
    description: string
    /** Registry maintainer */
    maintainer: string
  }
}

/**
 * Package installation options
 *
 * Configuration for installing a package from the marketplace.
 *
 * @example
 * ```typescript
 * const options: PackageInstallOptions = {
 *   version: '1.2.0',
 *   force: false,
 *   installDependencies: true,
 *   lang: 'zh-CN'
 * }
 * ```
 */
export interface PackageInstallOptions {
  /** Specific version to install (defaults to latest) */
  version?: string

  /** Force reinstall even if already installed */
  force?: boolean

  /** Install dependencies automatically */
  installDependencies?: boolean

  /** Skip verification check */
  skipVerification?: boolean

  /** Target directory (defaults to ~/.ccjk/packages) */
  targetDir?: string

  /** Language for templates and messages */
  lang?: SupportedLang

  /** Code tool type for compatibility check */
  codeToolType?: 'claude-code' | 'codex' | 'aider'

  /** Skip checksum verification */
  skipChecksum?: boolean
}

/**
 * Package installation result
 *
 * Contains information about the installation outcome.
 */
export interface PackageInstallResult {
  /** Whether installation succeeded */
  success: boolean

  /** Installed package */
  package: MarketplacePackage

  /** Installation path */
  installedPath?: string

  /** Installed dependencies */
  dependencies?: PackageInstallResult[]

  /** Error message (if failed) */
  error?: string

  /** Warnings during installation */
  warnings?: string[]

  /** Installation duration in milliseconds */
  durationMs?: number

  /** Whether package was already installed */
  alreadyInstalled?: boolean
}

/**
 * Installed package info
 *
 * Represents a package that has been installed locally.
 */
export interface InstalledPackage {
  /** Package metadata */
  package: MarketplacePackage

  /** Installation path */
  path: string

  /** Installation timestamp (ISO 8601) */
  installedAt: string

  /** Installation source */
  source: 'marketplace' | 'local' | 'git'

  /** Whether package is enabled */
  enabled: boolean

  /** User configuration overrides */
  config?: Record<string, unknown>

  /** Last used timestamp */
  lastUsed?: string

  /** Usage count */
  usageCount?: number
}

/**
 * Package update info
 *
 * Contains information about an available package update.
 */
export interface PackageUpdateInfo {
  /** Package ID */
  id: string

  /** Current version */
  currentVersion: string

  /** Latest version */
  latestVersion: string

  /** Whether update has breaking changes */
  breaking: boolean

  /** Changelog summary */
  changelog?: string

  /** Update size in bytes */
  size?: number

  /** Release date */
  releaseDate?: string
}

/**
 * Package distribution format (ccjk.json)
 *
 * Manifest file included in every package archive.
 * This file defines the package structure and installation behavior.
 *
 * @example
 * ```json
 * {
 *   "$schema": "https://api.claudehome.cn/schemas/package-manifest.json",
 *   "name": "git-workflow-pro",
 *   "version": "1.2.0",
 *   "description": "Advanced git workflow automation",
 *   "ccjkVersion": ">=3.5.0",
 *   "type": "workflow",
 *   "workflows": ["workflows/*.md"],
 *   "i18n": {
 *     "zh-CN": "i18n/zh-CN.json",
 *     "en": "i18n/en.json"
 *   }
 * }
 * ```
 */
export interface PackageManifest {
  /** JSON schema URL for validation */
  $schema?: string

  /** Package name (must match package ID) */
  name: string

  /** Package version (semantic version) */
  version: string

  /** Package description */
  description: string

  /** Minimum CCJK version required */
  ccjkVersion: string

  /** Package type */
  type: PackageCategory

  /** Package author */
  author?: string

  /** License identifier */
  license?: string

  /** Repository URL */
  repository?: string

  /** Main entry point (for plugins) */
  main?: string

  /** Skill files glob pattern */
  skills?: string[]

  /** Agent files glob pattern */
  agents?: string[]

  /** Workflow files glob pattern */
  workflows?: string[]

  /** Output style files glob pattern */
  outputStyles?: string[]

  /** MCP service configurations */
  mcpServices?: string[]

  /** i18n files (language: path) */
  i18n?: Record<SupportedLang, string>

  /** Post-install script (relative path) */
  postInstall?: string

  /** Pre-uninstall script (relative path) */
  preUninstall?: string

  /** Package dependencies */
  dependencies?: Record<string, string>

  /** Files to include (glob patterns) */
  files?: string[]

  /** Files to exclude (glob patterns) */
  exclude?: string[]

  /** Package configuration schema */
  configSchema?: Record<string, unknown>
}

/**
 * Registry cache configuration
 *
 * Configuration for caching marketplace registry data.
 */
export interface RegistryCacheConfig {
  /** Cache directory */
  cacheDir: string

  /** Cache TTL in seconds */
  ttl: number

  /** Whether to use cache */
  enabled: boolean

  /** Maximum cache size in bytes */
  maxSize?: number

  /** Cache strategy */
  strategy?: 'memory' | 'disk' | 'hybrid'
}

/**
 * Marketplace API client options
 *
 * Configuration for the marketplace API client.
 */
export interface MarketplaceClientOptions {
  /** Registry URL */
  registryUrl: string

  /** Request timeout in milliseconds */
  timeout?: number

  /** Cache configuration */
  cache?: RegistryCacheConfig

  /** User agent string */
  userAgent?: string

  /** API authentication token */
  authToken?: string

  /** Retry configuration */
  retry?: {
    /** Maximum retry attempts */
    maxAttempts: number
    /** Delay between retries in milliseconds */
    delay: number
  }
}

/**
 * Package rating submission
 *
 * User-submitted rating for a package.
 */
export interface PackageRating {
  /** Package ID */
  packageId: string

  /** Rating value (1-5) */
  rating: number

  /** Optional review text */
  review?: string

  /** Reviewer ID (anonymous if not provided) */
  reviewerId?: string

  /** Review timestamp */
  timestamp?: string

  /** Reviewer name (for display) */
  reviewerName?: string
}

/**
 * Package publish options
 *
 * Configuration for publishing a package to the marketplace.
 *
 * @example
 * ```typescript
 * const options: PackagePublishOptions = {
 *   packageDir: '/path/to/package',
 *   registryUrl: 'https://marketplace.api.claudehome.cn',
 *   authToken: 'your-auth-token',
 *   access: 'public'
 * }
 * ```
 */
export interface PackagePublishOptions {
  /** Package directory containing ccjk.json */
  packageDir: string

  /** Registry URL (defaults to official registry) */
  registryUrl?: string

  /** Authentication token */
  authToken?: string

  /** Dry run (validate only, don't publish) */
  dryRun?: boolean

  /** Access level */
  access?: 'public' | 'private'

  /** Skip validation checks */
  skipValidation?: boolean

  /** Tag for this release (e.g., 'latest', 'beta') */
  tag?: string
}

/**
 * Package publish result
 *
 * Contains information about the publish outcome.
 */
export interface PackagePublishResult {
  /** Whether publish succeeded */
  success: boolean

  /** Published package info */
  package?: MarketplacePackage

  /** Package URL in marketplace */
  url?: string

  /** Error message (if failed) */
  error?: string

  /** Validation warnings */
  warnings?: string[]

  /** Publish duration in milliseconds */
  durationMs?: number
}

/**
 * Package validation result
 *
 * Result of validating a package before installation or publishing.
 */
export interface PackageValidationResult {
  /** Whether package is valid */
  valid: boolean

  /** Validation errors (prevent installation/publish) */
  errors: PackageValidationError[]

  /** Validation warnings (allow but notify) */
  warnings: PackageValidationWarning[]

  /** Package manifest (if parsed successfully) */
  manifest?: PackageManifest
}

/**
 * Package validation error
 *
 * Critical error that prevents package installation or publishing.
 */
export interface PackageValidationError {
  /** Error field (e.g., "manifest.version") */
  field: string

  /** Human-readable error message */
  message: string

  /** Error code for programmatic handling */
  code: string

  /** Suggested fix (if available) */
  fix?: string
}

/**
 * Package validation warning
 *
 * Non-critical issue that should be brought to user's attention.
 */
export interface PackageValidationWarning {
  /** Warning field (e.g., "manifest.license") */
  field: string

  /** Human-readable warning message */
  message: string

  /** Warning code for programmatic handling */
  code: string

  /** Suggested improvement (if available) */
  suggestion?: string
}

/**
 * Package uninstall options
 *
 * Configuration for uninstalling a package.
 */
export interface PackageUninstallOptions {
  /** Remove dependencies if not used by other packages */
  removeDependencies?: boolean

  /** Force uninstall even if other packages depend on it */
  force?: boolean

  /** Keep user configuration */
  keepConfig?: boolean

  /** Language for messages */
  lang?: SupportedLang
}

/**
 * Package uninstall result
 *
 * Contains information about the uninstall outcome.
 */
export interface PackageUninstallResult {
  /** Whether uninstall succeeded */
  success: boolean

  /** Uninstalled package ID */
  packageId: string

  /** Uninstalled dependencies */
  dependencies?: string[]

  /** Error message (if failed) */
  error?: string

  /** Warnings during uninstall */
  warnings?: string[]
}

/**
 * Package statistics
 *
 * Usage and performance statistics for a package.
 */
export interface PackageStatistics {
  /** Package ID */
  packageId: string

  /** Total downloads */
  downloads: number

  /** Downloads in last 7 days */
  downloadsWeek: number

  /** Downloads in last 30 days */
  downloadsMonth: number

  /** Average rating */
  rating: number

  /** Number of ratings */
  ratingCount: number

  /** Number of active installations */
  activeInstalls: number

  /** Last updated timestamp */
  lastUpdated: string
}

/**
 * Marketplace category info
 *
 * Information about a package category.
 */
export interface MarketplaceCategoryInfo {
  /** Category identifier */
  id: PackageCategory

  /** Localized category name */
  name: Record<SupportedLang, string>

  /** Localized category description */
  description: Record<SupportedLang, string>

  /** Number of packages in category */
  packageCount: number

  /** Category icon (emoji or URL) */
  icon?: string
}

/**
 * Package dependency tree
 *
 * Represents the dependency tree for a package.
 */
export interface PackageDependencyTree {
  /** Root package */
  package: MarketplacePackage

  /** Direct dependencies */
  dependencies: PackageDependencyNode[]

  /** Total dependency count (including transitive) */
  totalCount: number

  /** Whether there are circular dependencies */
  hasCircular: boolean
}

/**
 * Package dependency node
 *
 * A node in the dependency tree.
 */
export interface PackageDependencyNode {
  /** Package info */
  package: MarketplacePackage

  /** Required version range */
  versionRange: string

  /** Nested dependencies */
  dependencies: PackageDependencyNode[]

  /** Whether this is a circular dependency */
  circular?: boolean
}
