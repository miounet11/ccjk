/**
 * Version Sync Module
 *
 * Tracks Claude Code version changes and adapts features accordingly.
 *
 * @module version-sync
 */

export {
  adaptMCPConfig,
  adaptPlansDirectory,
  FEATURES,
  generateMigrationGuide,
  getFeature,
  getFeaturesForVersion,
  getNewFeatures,
  getRecommendedConfig,
  isFeatureAvailable,
  validateConfig,
} from './adapter'
export type { Feature } from './adapter'

export {
  autoAdaptConfig,
  formatCompatibilityReport,
  formatUpgradeRecommendation,
  generateCompatibilityReport,
  generateUpgradeRecommendation,
  isStableVersion,
  isSupportedVersion,
} from './compatibility'
export type { CompatibilityReport, UpgradeRecommendation } from './compatibility'

export {
  clearCache,
  compareVersions,
  detectVersion,
  getVersionHistory,
  hasVersionChanged,
  isVersionAtLeast,
} from './tracker'
export type { VersionHistory, VersionInfo } from './tracker'
