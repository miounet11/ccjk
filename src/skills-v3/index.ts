/**
 * CCJK Skills V3 - Module Exports
 *
 * Unified skills system that consolidates V1 and V2 implementations
 * into a single, coherent system with enhanced features.
 *
 * @module skills-v3
 */

// ============================================================================
// Types
// ============================================================================

export * from './types'

// ============================================================================
// Parser
// ============================================================================

export {
  SkillParser,
  getSkillParser,
  resetSkillParser,
  parseSkillFile,
  parseSkillContent,
  isSkillFile,
} from './parser'

// ============================================================================
// Registry
// ============================================================================

export {
  SkillRegistry,
  getSkillRegistry,
  resetSkillRegistry,
  registerSkill,
  lookupSkills,
  getSkillById,
  getSkillsByTrigger,
} from './skill-registry'

// ============================================================================
// Loader
// ============================================================================

export {
  SkillLoader,
  getSkillLoader,
  resetSkillLoader,
  loadAllSkills,
  loadSkillsFromDirectory,
  loadAndRegisterSkills,
  getDefaultSkillDirectories,
} from './skill-loader'

// ============================================================================
// Migrator
// ============================================================================

export {
  SkillMigrator,
  getSkillMigrator,
  resetSkillMigrator,
  migrateFile,
  migrateDirectory,
} from './migrator'

// ============================================================================
// Hot Reload
// ============================================================================

export {
  HotReloadManager,
  getHotReloadManager,
  resetHotReloadManager,
  startHotReload,
  stopHotReload,
  getHotReloadStats,
  hotReloadManager,
} from './hot-reload'

// ============================================================================
// Manager
// ============================================================================

export {
  SkillManager,
  getSkillManager,
  resetSkillManager,
  registerSkill as registerSkillV3,
  getSkill as getSkillV3,
  searchSkills,
  listSkills,
  enableSkill,
  disableSkill,
  loadAllSkills as loadAllSkillsV3,
  getSkillStats,
} from './skill-manager'

// ============================================================================
// Convenience Re-exports
// ============================================================================

// Re-export commonly used types for direct import
export type {
  SkillV3,
  SkillV3Metadata,
  SkillV3Config,
  SkillRegistryEntry,
  ParseResult,
  MigrationResult,
  MigrationReport,
  LoadResult,
  DependencyResolution,
  RegistryStats,
  HotReloadEvent,
  HotReloadStats,
  LocalizedString,
} from './types'
