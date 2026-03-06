/**
 * Context Optimization System
 * Main entry point for token optimization
 */

export * from './analytics'
export { TokenAnalyticsTracker } from './analytics'
export * from './cache'
export { ContextCache } from './cache'
// Compact Advisor
export {
  CompactAdvisor,
  DEFAULT_COMPACT_CONFIG,
  getCompactAdvisor,
  resetCompactAdvisor,
} from './compact-advisor'
export type {
  CompactAdvisorConfig,
  CompactReason,
  CompactSuggestion,
  ContextAction,
  ContextState,
} from './compact-advisor'
export * from './compression'
export * from './health-alerts'
export {
  AlertSeverity,
  createHealthAlertsManager,
  HealthAlertsManager,
  runStartupHealthCheck,
} from './health-alerts'
export * from './health-check'
export {
  createHealthMonitor,
  DatabaseHealthMonitor,
  HealthStatus,
} from './health-check'
export * from './hierarchical-loader'
export { createHierarchicalLoader, HierarchicalContextLoader } from './hierarchical-loader'
export * from './manager'
// Re-export main classes for convenience
export { ContextManager } from './manager'

export * from './metrics-display'
export { MetricsDisplay } from './metrics-display'
export * from './migration'
export {
  migrateCacheToPersistence,
  restoreCacheFromPersistence,
  syncCacheAndPersistence,
  verifyMigration,
} from './migration'

export * from './persistence'
export { ContextPersistence, createContextPersistence, getContextPersistence } from './persistence'

// Startup initialization
export {
  getPlanModeStatus,
  initializeContextFeatures,
  isPlanModeAvailable,
} from './startup'

export * from './types'
