/**
 * Configuration Manager V3 - Main Entry Point
 *
 * Unified configuration system with:
 * - Singleton pattern management
 * - JSON Schema validation
 * - Automatic migration from older versions
 * - File change hot reload
 * - Multi-environment support (dev/prod/test)
 * - Configuration diff comparison
 *
 * @example
 * ```typescript
 * import { configV3 } from '@/config/v3'
 *
 * // Get configuration value
 * const lang = configV3.get<string>('general.preferredLang')
 *
 * // Set configuration value
 * configV3.set('general.theme', 'dark')
 *
 * // Validate configuration
 * const result = configV3.validate()
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors)
 * }
 *
 * // Watch for changes
 * const unsubscribe = configV3.watch((event) => {
 *   console.log(`Config changed: ${event.path}`)
 * })
 *
 * // Export/Import
 * const exported = configV3.export()
 * configV3.import(exported)
 *
 * // Environment management
 * configV3.setEnvironment('dev')
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Core types
  ConfigChangeEvent,
  ConfigChangeHandler,
  ConfigDiff,
  ConfigV3,
  DiffEntry,
  Environment,
  IConfigManagerV3,
  MigrationResult,
  PartialConfigV3,
  ValidationError,
  ValidationErrorCode,
  ValidationResult,
  ValidationWarning,

  // Schema types
  ConfigSchema,
  SchemaField,
  SchemaFieldType,

  // Config section types
  ApiConfigV3,
  ApiEndpointConfig,
  ClaudeCodeConfigV3,
  CodexConfigV3,
  FeaturesConfigV3,
  GeneralConfigV3,
  ProfileConfigV3,
  ToolConfigBase,
  ToolsConfigV3,
} from './types'

// ============================================================================
// Core Manager Exports
// ============================================================================

export {
  ConfigManagerV3,
  createConfigManager,
  exportConfig,
  getAllConfig,
  getConfig,
  getConfigManager,
  getEnvironment,
  importConfig,
  setConfig,
  setEnvironment,
  validateCurrentConfig,
  watchConfig,
} from './config-manager'

// ============================================================================
// Schema Validator Exports
// ============================================================================

export {
  CONFIG_SCHEMA,
  createValidator,
  isValidConfig,
  SchemaValidator,
  validateConfig,
} from './schema-validator'

// ============================================================================
// Migration Exports
// ============================================================================

export {
  createDefaultConfigV3,
  createMigrationBackup,
  detectLegacyConfig,
  getMigrationStatus,
  needsMigration,
  runMigration,
} from './migration'

// ============================================================================
// Hot Reload Exports
// ============================================================================

export {
  createHotReloadManager,
  getHotReloadManager,
  HotReloadManager,
  onConfigChange,
  startHotReload,
  stopHotReload,
} from './hot-reload'

export type { HotReloadOptions } from './hot-reload'

// ============================================================================
// Default Export - Singleton Instance
// ============================================================================

import { getConfigManager } from './config-manager'

/**
 * Default configuration manager instance
 *
 * This is the recommended way to access configuration in most cases.
 */
export const configV3 = {
  /**
   * Get configuration value by path
   * @example configV3.get<string>('general.preferredLang')
   */
  get: <T>(path: string): T => getConfigManager().get<T>(path),

  /**
   * Set configuration value by path
   * @example configV3.set('general.theme', 'dark')
   */
  set: (path: string, value: unknown): void => getConfigManager().set(path, value),

  /**
   * Validate current configuration
   */
  validate: () => getConfigManager().validate(),

  /**
   * Run configuration migration
   */
  migrate: () => getConfigManager().migrate(),

  /**
   * Watch for configuration changes
   * @returns Unsubscribe function
   */
  watch: (callback: Parameters<typeof getConfigManager>['0'] extends undefined
    ? ReturnType<typeof getConfigManager>['watch'] extends (cb: infer C) => unknown ? C : never
    : never) => getConfigManager().watch(callback as any),

  /**
   * Export configuration as JSON string
   */
  export: () => getConfigManager().export(),

  /**
   * Import configuration from JSON string
   */
  import: (data: string) => getConfigManager().import(data),

  /**
   * Get configuration diff
   */
  diff: (other: Parameters<ReturnType<typeof getConfigManager>['diff']>[0]) =>
    getConfigManager().diff(other),

  /**
   * Reset configuration to defaults
   */
  reset: () => getConfigManager().reset(),

  /**
   * Get current environment
   */
  getEnvironment: () => getConfigManager().getEnvironment(),

  /**
   * Set current environment
   */
  setEnvironment: (env: 'dev' | 'prod' | 'test') => getConfigManager().setEnvironment(env),

  /**
   * Get full configuration object
   */
  getAll: () => getConfigManager().getAll(),

  /**
   * Reload configuration from file
   */
  reload: () => getConfigManager().reload(),

  /**
   * Start hot reload watching
   */
  startHotReload: () => getConfigManager().startHotReload(),

  /**
   * Stop hot reload watching
   */
  stopHotReload: () => getConfigManager().stopHotReload(),

  /**
   * Get configuration file path
   */
  getConfigPath: () => getConfigManager().getConfigPath(),

  /**
   * Access the underlying manager instance
   */
  getInstance: () => getConfigManager(),
}

export default configV3
