/**
 * Registry Module - Multi-source version query system
 *
 * This module provides robust npm package version querying with intelligent
 * fallback across multiple registry sources (npm, taobao, huawei, github).
 *
 * @module registry
 */

export {
  // Cache management
  clearVersionCache,

  getCacheStats,
  // Core functions
  getLatestVersionWithFallback,

  getPreferredSources,
  getReachableRegistries,
  // China detection
  isChinaUser,
  // Diagnostics
  isRegistryReachable,

  queryVersionFromRegistry,

  queryVersionFromSource,
  // Constants
  REGISTRIES,

  // Types
  type RegistrySource,
  type VersionQueryResult,
} from './npm-registry'
