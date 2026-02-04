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

export {
  getHotReloadManager,
  getHotReloadStats,
  HotReloadManager,
  hotReloadManager,
  resetHotReloadManager,
  startHotReload,
  stopHotReload,
} from './hot-reload'

// ============================================================================
// Parser
// ============================================================================

export {
  getSkillMigrator,
  migrateDirectory,
  migrateFile,
  resetSkillMigrator,
  SkillMigrator,
} from './migrator'

// ============================================================================
// Registry
// ============================================================================

export {
  getSkillParser,
  isSkillFile,
  parseSkillContent,
  parseSkillFile,
  resetSkillParser,
  SkillParser,
} from './parser'

// ============================================================================
// Loader
// ============================================================================

export {
  getDefaultSkillDirectories,
  getSkillLoader,
  loadAllSkills,
  loadAndRegisterSkills,
  loadSkillsFromDirectory,
  resetSkillLoader,
  SkillLoader,
} from './skill-loader'

// ============================================================================
// Migrator
// ============================================================================

export {
  disableSkill,
  enableSkill,
  getSkillManager,
  getSkillStats,
  getSkill as getSkillV3,
  listSkills,
  loadAllSkills as loadAllSkillsV3,
  registerSkill as registerSkillV3,
  resetSkillManager,
  searchSkills,
  SkillManager,
} from './skill-manager'

// ============================================================================
// Hot Reload
// ============================================================================

export {
  getSkillById,
  getSkillRegistry,
  getSkillsByTrigger,
  lookupSkills,
  registerSkill,
  resetSkillRegistry,
  SkillRegistry,
} from './skill-registry'

// ============================================================================
// Manager
// ============================================================================

export * from './types'

// ============================================================================
// Convenience Re-exports
// ============================================================================

// Re-export commonly used types for direct import
export type {
  DependencyResolution,
  HotReloadEvent,
  HotReloadStats,
  LoadResult,
  LocalizedString,
  MigrationReport,
  MigrationResult,
  ParseResult,
  RegistryStats,
  SkillRegistryEntry,
  SkillV3,
  SkillV3Config,
  SkillV3Metadata,
} from './types'
