/**
 * CCJK Cloud Plugin Recommendation System
 *
 * This module provides cloud-based plugin management with:
 * - Dynamic plugin recommendations based on project context
 * - Cloud plugin search and discovery
 * - Local caching for offline support
 * - Plugin installation and management
 *
 * @module cloud-plugins
 */

// =============================================================================
// Constants (re-export from main constants)
// =============================================================================
export {
  CCJK_CLOUD_PLUGINS_API,
  CCJK_CLOUD_PLUGINS_CACHE_DIR,
  CCJK_CLOUD_PLUGINS_CACHE_FILE,
  CCJK_CLOUD_PLUGINS_DIR,
  CCJK_CLOUD_PLUGINS_INSTALLED_DIR,
  CLOUD_PLUGINS_CACHE_TTL,
  CLOUD_PLUGINS_MAX_CACHE_SIZE,
} from '../constants'

// =============================================================================
// Local Cache
// =============================================================================
export {
  CACHE_CONFIG,
  clearPluginCache,
  getCacheStats,
  getDefaultCache,
  isCacheExpired,
  loadCachedPlugins,
  LocalPluginCache,
  updatePluginCache,
} from './cache'

// =============================================================================
// Cloud Client
// =============================================================================
export {
  CloudRecommendationClient,
  createCloudClient,
  createMockClient,
  getDefaultCloudClient,
} from './cloud-client'

// Alias for backward compatibility
export { getDefaultCloudClient as getCloudClient } from './cloud-client'

export type {
  CloudApiResponse as CloudClientApiResponse,
  CloudClientOptions,
  PluginSearchParams as CloudPluginSearchParams,
  RecommendationContext as CloudRecommendationContext,
  RecommendationResult as CloudRecommendationResult,
  PluginCategoryInfo,
  PluginDownloadResult,
} from './cloud-client'

// =============================================================================
// Plugin Manager
// =============================================================================
export {
  CloudPluginManager,
  getCloudPluginManager,
} from './manager'

// =============================================================================
// Recommendation Engine
// =============================================================================
export {
  RecommendationEngine,
} from './recommendation-engine'

// =============================================================================
// Types
// =============================================================================
export type {
  CacheStats,
  CloudApiResponse,
  CloudPlugin,
  CloudPluginCache,
  PluginCategory,
  PluginInstallOptions,
  PluginInstallResult,
  PluginRecommendation,
  PluginSearchParams,
  RecommendationContext,
  RecommendationResult,
  UserPreferences,
} from './types'
