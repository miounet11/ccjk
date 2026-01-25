/**
 * CCJK Skills V3 - Unified Type Definitions
 *
 * Consolidates V1 (CcjkSkill) and V2 (CognitiveProtocol) into a unified system
 * with enhanced features for hot-reload, dependency management, and migration.
 *
 * @module skills-v3/types
 */

import type { SupportedLang } from '../constants'

// ============================================================================
// Core Enums
// ============================================================================

/**
 * Skill category types for organization and discovery
 */
export type SkillCategory =
  | 'dev'       // Development workflows
  | 'git'       // Git operations
  | 'review'    // Code review
  | 'testing'   // Testing workflows
  | 'docs'      // Documentation
  | 'devops'    // DevOps operations
  | 'planning'  // Planning and design
  | 'debugging' // Debugging workflows
  | 'seo'       // SEO optimization
  | 'custom'    // User-defined

/**
 * Skill source types
 */
export type SkillSource = 'builtin' | 'user' | 'marketplace' | 'migrated'

/**
 * Skill format version
 */
export type SkillVersion = 'v1' | 'v2' | 'v3'

/**
 * Skill priority (1-10, higher = more priority)
 */
export type SkillPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

/**
 * Skill difficulty levels
 */
export type SkillDifficulty = 'beginner' | 'intermediate' | 'advanced'

/**
 * Hot reload event types
 */
export type HotReloadEventType =
  | 'add'
  | 'change'
  | 'unlink'
  | 'error'
  | 'ready'

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Localized string type
 */
export type LocalizedString = Record<'en' | 'zh-CN', string>

/**
 * Unified Skill V3 Interface
 *
 * This is the core skill definition that unifies V1 and V2 formats.
 */
export interface SkillV3 {
  /** Unique skill identifier (kebab-case) */
  id: string

  /** Semantic version (e.g., "1.0.0") */
  version: string

  /** Skill metadata */
  metadata: SkillV3Metadata

  /** Command triggers (e.g., ['/commit', '/gc']) */
  triggers: string[]

  /** Skill template content (markdown) */
  template: string

  /** Optional configuration */
  config?: SkillV3Config

  /** Skill dependencies */
  dependencies?: string[]
}

/**
 * Skill V3 Metadata
 */
export interface SkillV3Metadata {
  /** Localized skill name */
  name: LocalizedString

  /** Localized skill description */
  description: LocalizedString

  /** Skill category */
  category: SkillCategory

  /** Tags for search/filtering */
  tags: string[]

  /** Author information */
  author?: string

  /** Skill difficulty level */
  difficulty?: SkillDifficulty

  /** Priority for conflict resolution (1-10) */
  priority?: SkillPriority

  /** Use when conditions (natural language) */
  useWhen?: string[]

  /** Whether skill can auto-activate */
  autoActivate?: boolean

  /** Whether skill is user-invocable */
  userInvocable?: boolean

  /** Related skill IDs */
  relatedSkills?: string[]

  /** Minimum CCJK version required */
  ccjkVersion?: string
}

/**
 * Skill V3 Configuration
 */
export interface SkillV3Config {
  /** Allowed tools for this skill */
  allowedTools?: string[]

  /** Required permissions */
  permissions?: string[]

  /** Execution timeout in seconds */
  timeout?: number

  /** Associated agent IDs */
  agents?: string[]

  /** Execution context mode */
  contextMode?: 'fork' | 'inherit'

  /** Lifecycle hooks */
  hooks?: SkillHook[]

  /** Skill outputs */
  outputs?: SkillOutput[]

  /** Custom configuration */
  custom?: Record<string, unknown>
}

/**
 * Skill lifecycle hook
 */
export interface SkillHook {
  /** Hook type */
  type:
    | 'PreToolUse'
    | 'PostToolUse'
    | 'SubagentStart'
    | 'SubagentStop'
    | 'PermissionRequest'
    | 'SkillActivate'
    | 'SkillComplete'

  /** Pattern matcher */
  matcher?: string

  /** Shell command to execute */
  command?: string

  /** Inline script */
  script?: string

  /** Timeout in seconds */
  timeout?: number
}

/**
 * Skill output definition
 */
export interface SkillOutput {
  /** Output name */
  name: string

  /** Output type */
  type: 'file' | 'variable' | 'artifact'

  /** Output path (for file type) */
  path?: string

  /** Output description */
  description?: string
}

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Skill registry entry
 */
export interface SkillRegistryEntry {
  /** Skill definition */
  skill: SkillV3

  /** File path */
  filePath: string

  /** Whether skill is enabled */
  enabled: boolean

  /** Skill source */
  source: SkillSource

  /** Original format version (for migrated skills) */
  originalVersion?: SkillVersion

  /** Registration timestamp */
  registeredAt: number

  /** Last modified timestamp */
  modifiedAt: number

  /** Estimated token count */
  estimatedTokens: number

  /** Dependent skills (skills that depend on this one) */
  dependents: Set<string>

  /** Checksum for change detection */
  checksum: string
}

/**
 * Registry lookup options
 */
export interface RegistryLookupOptions {
  /** Filter by enabled status */
  enabled?: boolean

  /** Filter by category */
  category?: SkillCategory

  /** Filter by source */
  source?: SkillSource

  /** Filter by user invocable */
  userInvocable?: boolean

  /** Filter by auto activate */
  autoActivate?: boolean

  /** Filter by agent */
  agent?: string

  /** Search in name, description, tags */
  search?: string

  /** Filter by tags */
  tags?: string[]

  /** Limit results */
  limit?: number

  /** Sort by field */
  sortBy?: 'name' | 'priority' | 'registeredAt' | 'modifiedAt'

  /** Sort direction */
  sortDir?: 'asc' | 'desc'
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  /** Total number of registered skills */
  totalSkills: number

  /** Number of enabled skills */
  enabledSkills: number

  /** Number of disabled skills */
  disabledSkills: number

  /** Skills by category */
  byCategory: Record<SkillCategory, number>

  /** Skills by source */
  bySource: Record<SkillSource, number>

  /** Total estimated tokens */
  totalTokens: number

  /** Most recently registered skill */
  lastRegistered?: string

  /** Most recently modified skill */
  lastModified?: string
}

// ============================================================================
// Hot Reload Types
// ============================================================================

/**
 * Hot reload configuration
 */
export interface HotReloadConfig {
  /** Paths to watch */
  watchPaths: string[]

  /** Watch home directory skills */
  watchHomeSkills: boolean

  /** Watch local directory skills */
  watchLocalSkills: boolean

  /** Recursive watching */
  recursive: boolean

  /** Debounce delay in ms */
  debounceDelay: number

  /** Ignore initial add events */
  ignoreInitial: boolean

  /** Verbose logging */
  verbose: boolean

  /** Auto-register on add */
  autoRegister: boolean

  /** Auto-unregister on unlink */
  autoUnregister: boolean

  /** Custom ignore patterns */
  ignored?: (string | RegExp)[]
}

/**
 * Hot reload event
 */
export interface HotReloadEvent {
  /** Event type */
  type: HotReloadEventType

  /** File path */
  filePath: string

  /** Timestamp */
  timestamp: number

  /** Skill entry (for add/change) */
  entry?: SkillRegistryEntry

  /** Previous entry (for change) */
  previousEntry?: SkillRegistryEntry

  /** Error message (for error) */
  error?: string
}

/**
 * Hot reload statistics
 */
export interface HotReloadStats {
  /** Number of watched files */
  watchedFiles: number

  /** Number of registered skills */
  registeredSkills: number

  /** Total add events */
  totalAdds: number

  /** Total change events */
  totalChanges: number

  /** Total unlink events */
  totalUnlinks: number

  /** Total errors */
  totalErrors: number

  /** Whether watching */
  isWatching: boolean

  /** Last event timestamp */
  lastEventAt?: number
}

// ============================================================================
// Migration Types
// ============================================================================

/**
 * Migration result
 */
export interface MigrationResult {
  /** Whether migration succeeded */
  success: boolean

  /** Migrated skill (if successful) */
  skill?: SkillV3

  /** Original format version */
  originalVersion: SkillVersion

  /** Source file path */
  sourcePath: string

  /** Warnings during migration */
  warnings: string[]

  /** Error message (if failed) */
  error?: string
}

/**
 * Migration report
 */
export interface MigrationReport {
  /** Total skills found */
  totalFound: number

  /** Successfully migrated */
  successCount: number

  /** Failed migrations */
  failedCount: number

  /** Skipped (already V3) */
  skippedCount: number

  /** Individual results */
  results: MigrationResult[]

  /** Migration timestamp */
  timestamp: number

  /** Duration in ms */
  durationMs: number
}

/**
 * V1 Skill format (from src/skills/types.ts)
 */
export interface SkillV1 {
  id: string
  name: Record<SupportedLang, string>
  description: Record<SupportedLang, string>
  category: SkillCategory
  triggers: string[]
  template: string
  agents?: string[]
  enabled: boolean
  version: string
  author?: string
  tags?: string[]
}

/**
 * V2 Skill format (from src/skills-v2/types.ts)
 */
export interface SkillV2 {
  metadata: {
    id: string
    name: string
    version: string
    description: string
    author: string
    tags: string[]
    layer: 'L1' | 'L2' | 'L3'
    priority: number
    dependencies: string[]
  }
  protocol: {
    coreQuestion: string
    traceUp: string
    traceDown: string
    quickReference: Record<string, unknown>
  }
  ast: unknown
  source: string
}

// ============================================================================
// Parser Types
// ============================================================================

/**
 * Parse result
 */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean

  /** Parsed skill (if successful) */
  skill?: SkillV3

  /** Source file path */
  filePath?: string

  /** Detected format version */
  detectedVersion?: SkillVersion

  /** Warnings during parsing */
  warnings: string[]

  /** Error message (if failed) */
  error?: string

  /** Estimated token count */
  estimatedTokens?: number
}

/**
 * Parser options
 */
export interface ParserOptions {
  /** Strict mode - fail on unknown fields */
  strict?: boolean

  /** Validate required fields */
  validate?: boolean

  /** Allow missing optional fields */
  allowMissingOptional?: boolean

  /** Auto-migrate V1/V2 formats */
  autoMigrate?: boolean
}

// ============================================================================
// Loader Types
// ============================================================================

/**
 * Loader options
 */
export interface LoaderOptions {
  /** Directories to scan */
  directories: string[]

  /** Recursive scanning */
  recursive?: boolean

  /** File patterns to match */
  patterns?: string[]

  /** Auto-migrate old formats */
  autoMigrate?: boolean

  /** Skip invalid files */
  skipInvalid?: boolean
}

/**
 * Load result
 */
export interface LoadResult {
  /** Successfully loaded skills */
  skills: SkillV3[]

  /** Failed loads */
  errors: Array<{
    filePath: string
    error: string
  }>

  /** Migrated skills */
  migrated: MigrationResult[]

  /** Total files scanned */
  totalScanned: number

  /** Duration in ms */
  durationMs: number
}

// ============================================================================
// Conflict Types
// ============================================================================

/**
 * Skill conflict
 */
export interface SkillConflict {
  /** Conflict type */
  type: 'trigger' | 'id' | 'dependency'

  /** Conflicting skill IDs */
  skillIds: string[]

  /** Conflict details */
  details: string

  /** Resolution suggestion */
  suggestion?: string
}

/**
 * Dependency resolution result
 */
export interface DependencyResolution {
  /** Whether resolution succeeded */
  success: boolean

  /** Resolved order (topological sort) */
  order: string[]

  /** Missing dependencies */
  missing: Array<{
    skillId: string
    missingDeps: string[]
  }>

  /** Circular dependencies */
  circular: string[][]
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Registry event types
 */
export interface RegistryEvents {
  'skill:registered': (entry: SkillRegistryEntry) => void
  'skill:updated': (oldEntry: SkillRegistryEntry, newEntry: SkillRegistryEntry) => void
  'skill:unregistered': (entry: SkillRegistryEntry) => void
  'skill:enabled': (entry: SkillRegistryEntry) => void
  'skill:disabled': (entry: SkillRegistryEntry) => void
  'registry:cleared': () => void
  'conflict:detected': (conflict: SkillConflict) => void
  'dependency:error': (skillId: string, missingDeps: string[]) => void
}

/**
 * Hot reload event types
 */
export interface HotReloadEvents {
  'add': (event: HotReloadEvent) => void
  'change': (event: HotReloadEvent) => void
  'unlink': (event: HotReloadEvent) => void
  'error': (event: HotReloadEvent) => void
  'ready': (event: HotReloadEvent) => void
  'event': (event: HotReloadEvent) => void
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Skill error types
 */
export enum SkillErrorType {
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MIGRATION_ERROR = 'MIGRATION_ERROR',
  LOAD_ERROR = 'LOAD_ERROR',
  REGISTRY_ERROR = 'REGISTRY_ERROR',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  HOT_RELOAD_ERROR = 'HOT_RELOAD_ERROR',
}

/**
 * Skill error class
 */
export class SkillError extends Error {
  constructor(
    public type: SkillErrorType,
    message: string,
    public details?: Record<string, unknown>,
    public cause?: Error,
  ) {
    super(message)
    this.name = 'SkillError'
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Skill creation input (partial skill for creation)
 */
export type SkillV3Input = DeepPartial<SkillV3> & {
  id: string
  triggers: string[]
  template: string
}
