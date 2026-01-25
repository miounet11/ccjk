/**
 * Context Optimization System
 * Main entry point for token optimization
 */

export * from './analytics'
export { TokenAnalyticsTracker } from './analytics'
export * from './cache'
export { ContextCache } from './cache'
export * from './compression'

export * from './manager'
// Re-export main classes for convenience
export { ContextManager } from './manager'
export * from './types'

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

// Startup initialization
export {
  getPlanModeStatus,
  initializeContextFeatures,
  isPlanModeAvailable,
} from './startup'
