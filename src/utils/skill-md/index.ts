/**
 * SKILL.md Utilities Module
 *
 * Provides comprehensive utilities for parsing, validating, and managing
 * SKILL.md files in the CCJK project.
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

// Export all parser functions
export {
  extractSkillMetadata,
  parseSkillMd,
  parseSkillMdFile,
  validateSkillMd,
} from './parser.js'
