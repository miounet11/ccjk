/**
 * Plugin source types
 */
export type PluginSourceType = 'ccjk' | 'native' | 'local' | 'npm' | 'git'

/**
 * Plugin status
 */
export type PluginStatus = 'installed' | 'available' | 'outdated' | 'disabled'

/**
 * Plugin statistics
 */
export interface PluginStats {
  downloads?: number
  rating?: number
  reviews?: number
}

/**
 * Unified plugin interface
 */
export interface UnifiedPlugin {
  /** Unique plugin ID */
  id: string
  /** Plugin name */
  name: string
  /** Plugin version */
  version: string
  /** Plugin source type */
  source: PluginSourceType
  /** Plugin description */
  description?: string
  /** Plugin author */
  author?: string
  /** Plugin category */
  category?: string
  /** Plugin status */
  status?: PluginStatus
  /** Commands provided by this plugin */
  commands?: string[]
  /** Skills provided by this plugin */
  skills?: string[]
  /** Features provided by this plugin */
  features?: string[]
  /** Plugin tags */
  tags?: string[]
  /** Plugin homepage URL */
  homepage?: string
  /** Plugin repository URL */
  repository?: string
  /** Plugin dependencies */
  dependencies?: string[]
  /** Plugin metadata */
  metadata?: Record<string, unknown>
  /** Whether the plugin is enabled */
  enabled?: boolean
  /** Whether the plugin is verified */
  verified?: boolean
  /** Plugin rating (0-5) */
  rating?: number
  /** Plugin statistics */
  stats?: PluginStats
  /** Installation timestamp */
  installedAt?: string
  /** Last update timestamp */
  updatedAt?: string
  /** Marketplace source (for native plugins) */
  marketplace?: string
}

/**
 * Search options for plugin queries
 */
export interface SearchOptions {
  /** Search query string */
  query?: string
  /** Filter by category */
  category?: string
  /** Filter by tags */
  tags?: string[]
  /** Filter by source types */
  sources?: PluginSourceType[]
  /** Maximum number of results */
  limit?: number
  /** Offset for pagination */
  offset?: number
  /** Sort field */
  sortBy?: 'name' | 'downloads' | 'rating' | 'updated'
  /** Sort order */
  sortOrder?: 'asc' | 'desc'
}

/**
 * Install options
 */
export interface InstallOptions {
  /** Target version to install */
  version?: string
  /** Force reinstall even if already installed */
  force?: boolean
  /** Skip dependency installation */
  skipDependencies?: boolean
  /** Auto-enable after installation */
  autoEnable?: boolean
}

/**
 * Result of an install operation
 */
export interface InstallResult {
  /** Whether the operation succeeded */
  success: boolean
  /** The installed plugin (if successful) */
  plugin?: UnifiedPlugin
  /** Error message (if failed) */
  error?: string
  /** Warning messages */
  warnings?: string[]
}

/**
 * Result of an uninstall operation
 */
export interface UninstallResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Error message (if failed) */
  error?: string
}

/**
 * Result of an update operation
 */
export interface UpdateResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Previous version */
  previousVersion?: string
  /** New version */
  newVersion?: string
  /** The updated plugin (if successful) */
  plugin?: UnifiedPlugin
  /** Error message (if failed) */
  error?: string
}

/**
 * Plugin source adapter interface
 */
export interface PluginSourceAdapter {
  /** Get the source type this adapter handles */
  getSourceType: () => PluginSourceType
  /** Search for plugins */
  search: (options: SearchOptions) => Promise<UnifiedPlugin[]>
  /** Get a specific plugin by ID */
  getPlugin: (id: string) => Promise<UnifiedPlugin | null>
  /** Install a plugin */
  install: (id: string, options: InstallOptions) => Promise<InstallResult>
  /** Uninstall a plugin */
  uninstall: (id: string) => Promise<UninstallResult>
  /** Update a plugin */
  update: (id: string) => Promise<UpdateResult>
  /** List installed plugins from this source */
  listInstalled: () => Promise<UnifiedPlugin[]>
  /** Check if a plugin is installed */
  isInstalled: (id: string) => Promise<boolean>
}

/**
 * Native marketplace configuration
 */
export interface NativeMarketplace {
  /** Marketplace name */
  name: string
  /** GitHub repository (owner/repo format) */
  repo: string
  /** Marketplace URL */
  url: string
  /** Whether this is the default marketplace */
  isDefault: boolean
  /** Last sync timestamp */
  lastSync?: string
  /** Number of plugins in this marketplace */
  pluginCount?: number
}

/**
 * Unified plugin manager configuration
 */
export interface UnifiedPluginConfig {
  /** Default source for plugin operations */
  defaultSource: PluginSourceType | 'auto'
  /** Enable automatic updates */
  autoUpdate: boolean
  /** Enable plugin verification */
  verifyPlugins: boolean
  /** Cache duration in milliseconds */
  cacheDuration: number
  /** Native marketplaces */
  marketplaces: NativeMarketplace[]
}
