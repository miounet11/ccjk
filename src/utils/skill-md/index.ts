/**
 * SKILL.md Utilities Module
 *
 * Provides comprehensive utilities for parsing, validating, and managing
 * SKILL.md files in the CCJK project with hot reload support.
 *
 * @module utils/skill-md
 */

// Re-export types for convenience
export type {
  SkillActivationContext,
  SkillActivationResult,
  SkillCategory,
  SkillDifficulty,
  SkillExecutionContext,
  SkillExecutionResult,
  SkillInstallOptions,
  SkillInstallResult,
  SkillMarketplaceEntry,
  SkillMdFile,
  SkillMdMetadata,
  SkillPriority,
  SkillRegistry,
  SkillRegistryEntry,
  SkillSearchOptions,
  SkillUpdateCheckResult,
  SkillUpdateInfo,
  SkillValidationError,
  SkillValidationResult,
  SkillValidationWarning,
} from '../../types/skill-md.js'

// Export cache management
export {
  SkillCache,
} from './cache.js'

export type {
  CachedSkill,
} from './cache.js'
// Export discovery service
export {
  SkillDiscovery,
} from './discovery.js'

export type {
  SkillValidationResultWithPath,
} from './discovery.js'
// Export hot reload system
export {
  SkillHotReloader,
} from './hot-reload.js'

export type {
  HotReloadEvent,
  HotReloadEventType,
  HotReloadOptions,
} from './hot-reload.js'
// Export all parser functions
export {
  extractSkillMetadata,
  parseSkillMd,
  parseSkillMdFile,
  validateSkillMd,
} from './parser.js'
