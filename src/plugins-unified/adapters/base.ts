import type {
  InstallOptions,
  InstallResult,
  PluginSourceAdapter,
  PluginSourceType,
  SearchOptions,
  UnifiedPlugin,
  UninstallResult,
  UpdateResult,
} from '../types'

/**
 * Abstract base class for plugin source adapters.
 * Provides common functionality and defines the interface that all adapters must implement.
 */
export abstract class BasePluginAdapter implements PluginSourceAdapter {
  protected abstract sourceType: PluginSourceType

  /**
   * Get the source type this adapter handles
   */
  getSourceType(): PluginSourceType {
    return this.sourceType
  }

  /**
   * Search for plugins matching the given options
   */
  abstract search(options: SearchOptions): Promise<UnifiedPlugin[]>

  /**
   * Get a specific plugin by ID
   */
  abstract getPlugin(id: string): Promise<UnifiedPlugin | null>

  /**
   * Install a plugin
   */
  abstract install(id: string, options: InstallOptions): Promise<InstallResult>

  /**
   * Uninstall a plugin
   */
  abstract uninstall(id: string): Promise<UninstallResult>

  /**
   * Update a plugin to the latest version
   */
  abstract update(id: string): Promise<UpdateResult>

  /**
   * List all installed plugins from this source
   */
  abstract listInstalled(): Promise<UnifiedPlugin[]>

  /**
   * Check if a plugin is installed
   */
  abstract isInstalled(id: string): Promise<boolean>

  /**
   * Normalize a plugin ID to a consistent format
   * Converts to lowercase and replaces invalid characters with hyphens
   */
  protected normalizePluginId(id: string): string {
    return id.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  }

  /**
   * Validate a plugin object has required fields
   */
  protected async validatePlugin(plugin: UnifiedPlugin): Promise<boolean> {
    // Check required fields
    if (!plugin.id || typeof plugin.id !== 'string') {
      return false
    }

    if (!plugin.name || typeof plugin.name !== 'string') {
      return false
    }

    if (!plugin.version || typeof plugin.version !== 'string') {
      return false
    }

    if (!plugin.source || !['ccjk', 'native'].includes(plugin.source)) {
      return false
    }

    // Validate version format (semver-like)
    const versionRegex = /^\d+\.\d+\.\d+(-[a-z0-9.]+)?(\+[a-z0-9.]+)?$/i
    if (!versionRegex.test(plugin.version)) {
      return false
    }

    return true
  }

  /**
   * Create a standardized error result for install operations
   */
  protected createInstallError(message: string): InstallResult {
    return {
      success: false,
      error: message,
    }
  }

  /**
   * Create a standardized error result for uninstall operations
   */
  protected createUninstallError(message: string): UninstallResult {
    return {
      success: false,
      error: message,
    }
  }

  /**
   * Create a standardized error result for update operations
   */
  protected createUpdateError(message: string): UpdateResult {
    return {
      success: false,
      error: message,
    }
  }
}
