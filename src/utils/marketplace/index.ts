/**
 * Marketplace Module
 *
 * Provides marketplace functionality for CCJK including:
 * - Package registry access and caching
 * - Package search and discovery
 * - Package metadata retrieval
 * - Featured and categorized package listings
 * - Package installation and lifecycle management
 * - Package updates and dependency resolution
 *
 * @module utils/marketplace
 */

// Dependency resolver exports
export {
  detectCircularDependencies,
  flattenDependencyTree,
  getUniqueDependencies,
  isVersionCompatible,
  resolveDependencies,
} from './dependency-resolver.js'

// Installer exports
export {
  checkForUpdates,
  disablePackage,
  enablePackage,
  getInstalledPackage,
  getInstalledPackages,
  installPackage,
  isPackageInstalled,
  uninstallPackage,
  updatePackage,
} from './installer.js'

// Registry exports
export {
  fetchRemoteRegistry,
  getCacheFilePath,
  getFeaturedPackages,
  getPackage,
  getPackagesByCategory,
  getPackageVersions,
  getRegistry,
  isCacheValid,
  readCachedRegistry,
  searchPackages,
  writeCacheRegistry,
} from './registry.js'
