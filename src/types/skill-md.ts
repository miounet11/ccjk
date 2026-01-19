/**
 * SKILL.md Type Definitions
 *
 * Defines the structure for Superpowers-compatible SKILL.md files
 * with automatic activation support and "Use when..." triggers.
 *
 * @module types/skill-md
 */

import type { SupportedLang } from '../constants.js'

/**
 * Skill category types for organization and discovery
 */
export type SkillCategory
  = | 'dev' // Development workflows
    | 'git' // Git operations
    | 'review' // Code review
    | 'testing' // Testing workflows
    | 'docs' // Documentation
    | 'devops' // DevOps operations
    | 'planning' // Planning and design
    | 'debugging' // Debugging workflows
    | 'custom' // User-defined

/**
 * Skill difficulty levels for user guidance
 */
export type SkillDifficulty = 'beginner' | 'intermediate' | 'advanced'

/**
 * Skill priority (1-10, higher = more priority)
 * Used to resolve conflicts when multiple skills match
 */
export type SkillPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

/**
 * Subagent execution context mode
 *
 * - `fork`: Execute in isolated context (new conversation)
 * - `inherit`: Execute in parent context (shared conversation)
 */
export type SubagentContextMode = 'fork' | 'inherit'

/**
 * Hook types for skill lifecycle events
 *
 * Hooks allow skills to execute custom logic at specific points
 * during skill execution and tool usage.
 */
export type HookType
  = | 'PreToolUse' // Before any tool is used
    | 'PostToolUse' // After any tool is used
    | 'SubagentStart' // When a subagent starts
    | 'SubagentStop' // When a subagent stops
    | 'PermissionRequest' // When permission is requested
    | 'SkillActivate' // When skill is activated
    | 'SkillComplete' // When skill completes

/**
 * Hook definition for skill lifecycle events
 *
 * Hooks can execute commands or scripts at specific points
 * during skill execution.
 *
 * @example
 * ```yaml
 * hooks:
 *   - type: PreToolUse
 *     matcher: "Bash(npm *)"
 *     command: "echo 'Running npm command'"
 *     timeout: 5
 * ```
 */
export interface Hook {
  /** Hook type (lifecycle event) */
  type: HookType

  /**
   * Pattern to match for conditional execution
   * Supports wildcards (e.g., "Bash(npm *)", "mcp__*")
   */
  matcher?: string

  /** Shell command to execute */
  command?: string

  /** Inline script to execute */
  script?: string

  /**
   * Timeout in seconds
   * @default 30
   */
  timeout?: number
}

/**
 * Skill output definition
 *
 * Defines outputs that a skill produces, which can be
 * files, variables, or artifacts.
 *
 * @example
 * ```yaml
 * outputs:
 *   - name: report
 *     type: file
 *     path: ./output/report.md
 *     description: Generated analysis report
 * ```
 */
export interface SkillOutput {
  /** Output name (identifier) */
  name: string

  /**
   * Output type
   * - `file`: File output
   * - `variable`: Variable/environment output
   * - `artifact`: Artifact output
   */
  type: 'file' | 'variable' | 'artifact'

  /** Output path (for file type) */
  path?: string

  /** Output description */
  description?: string
}

/**
 * Subagent execution context
 *
 * Tracks the execution state of a subagent (child skill).
 * Used for managing nested skill executions.
 */
export interface SubagentContext {
  /** Unique subagent ID */
  id: string

  /** Parent subagent ID (if nested) */
  parentId?: string

  /**
   * Execution mode
   * - `fork`: Isolated execution
   * - `inherit`: Shared context with parent
   */
  mode: SubagentContextMode

  /** Skill being executed */
  skill: SkillMdFile

  /** Conversation transcript */
  transcript: string[]

  /** Execution start time */
  startedAt: Date

  /** Execution end time (if completed) */
  endedAt?: Date
}

/**
 * SKILL.md frontmatter metadata
 *
 * Defines the YAML frontmatter structure for SKILL.md files.
 * Compatible with Superpowers-style skill definitions and Claude Code 2.1.x.
 *
 * @example
 * ```yaml
 * ---
 * name: git-commit
 * description: Intelligent git commit workflow
 * version: 1.0.0
 * category: git
 * triggers: ['/commit', '/gc']
 * use_when:
 *   - User wants to commit changes
 *   - When working on git operations
 * auto_activate: true
 * priority: 8
 * allowed_tools: ['Bash(git *)', 'Read', 'Write']
 * context: inherit
 * agent: git-specialist
 * user_invocable: true
 * timeout: 300
 * hooks:
 *   - type: SkillActivate
 *     command: git status
 *   - type: PreToolUse
 *     matcher: 'Bash(git commit *)'
 *     script: echo "Committing changes..."
 * permissions: ['file:read', 'file:write', 'bash:execute']
 * outputs:
 *   - name: commit_hash
 *     type: variable
 *     description: Git commit SHA
 * ---
 * ```
 */
export interface SkillMdMetadata {
  /** Unique skill identifier (kebab-case) */
  name: string

  /** Brief description of the skill */
  description: string

  /** Semantic version (e.g., "1.0.0") */
  version: string

  /** Skill author */
  author?: string

  /** Skill category for organization */
  category: SkillCategory

  /**
   * Command triggers (e.g., ['/commit', '/gc'])
   * These are explicit commands users can type to activate the skill
   */
  triggers: string[]

  /**
   * Superpowers-style activation conditions
   * Natural language descriptions of when this skill should activate
   *
   * @example
   * ["User wants to commit changes", "When working on git operations"]
   */
  use_when: string[]

  /**
   * Whether skill can auto-activate based on context
   * If true, the skill can be suggested/activated automatically
   * when use_when conditions match
   */
  auto_activate?: boolean

  /**
   * Priority for activation conflicts (1-10)
   * Higher priority skills are preferred when multiple skills match
   * @default 5
   */
  priority?: SkillPriority

  /**
   * Required agent IDs
   * List of CCJK agents that should be active for this skill
   */
  agents?: string[]

  /** Skill difficulty level */
  difficulty?: SkillDifficulty

  /**
   * Related skill IDs
   * Skills that are commonly used together or are alternatives
   */
  related_skills?: string[]

  /**
   * Minimum CCJK version required
   * Semantic version string (e.g., "3.5.0")
   */
  ccjk_version?: string

  /** Tags for discovery and search */
  tags?: string[]

  /**
   * Allowed tools for this skill
   *
   * Restricts which tools the skill can use. Supports wildcards.
   * If not specified, all tools are allowed.
   *
   * @example
   * ["Bash(npm *)", "Bash(git *)", "mcp__*", "Read", "Write"]
   */
  allowed_tools?: string[]

  /**
   * Subagent execution context mode
   *
   * - `fork`: Execute in isolated context (new conversation)
   * - `inherit`: Execute in parent context (shared conversation)
   *
   * @default "inherit"
   */
  context?: SubagentContextMode

  /**
   * Agent type to execute this skill
   *
   * Specifies which agent should handle this skill execution.
   * If not specified, uses the default agent.
   *
   * @example "typescript-expert", "python-specialist"
   */
  agent?: string

  /**
   * Whether skill is user-invocable
   *
   * Controls if the skill appears in user menus and can be
   * directly invoked by users.
   *
   * @default true
   */
  user_invocable?: boolean

  /**
   * Execution hooks
   *
   * Lifecycle hooks that execute at specific points during
   * skill execution. Useful for setup, teardown, and monitoring.
   *
   * @example
   * ```yaml
   * hooks:
   *   - type: SkillActivate
   *     command: "echo 'Skill starting'"
   *   - type: PreToolUse
   *     matcher: "Bash(npm *)"
   *     script: "npm config list"
   * ```
   */
  hooks?: Hook[]

  /**
   * Permission rules
   *
   * Defines what permissions this skill requires.
   * Used for security and access control.
   *
   * @example
   * ["file:read", "file:write", "network:http", "bash:execute"]
   */
  permissions?: string[]

  /**
   * Execution timeout in seconds
   *
   * Maximum time allowed for skill execution.
   * If exceeded, execution is terminated.
   *
   * @default 300 (5 minutes)
   */
  timeout?: number

  /**
   * Skill outputs
   *
   * Defines what outputs this skill produces.
   * Useful for chaining skills and understanding results.
   *
   * @example
   * ```yaml
   * outputs:
   *   - name: report
   *     type: file
   *     path: ./output/report.md
   *   - name: status
   *     type: variable
   * ```
   */
  outputs?: SkillOutput[]
}

/**
 * Parsed SKILL.md file
 *
 * Represents a complete SKILL.md file with parsed frontmatter
 * and markdown content.
 */
export interface SkillMdFile {
  /** Parsed frontmatter metadata */
  metadata: SkillMdMetadata

  /** Markdown content (without frontmatter) */
  content: string

  /** Original file path */
  filePath: string

  /** File modification time */
  modifiedAt?: Date
}

/**
 * Context for skill activation matching
 *
 * Provides environmental and contextual information
 * for determining if a skill should be activated.
 */
export interface SkillActivationContext {
  /** User's message or command */
  userMessage: string

  /** Current file being edited */
  currentFile?: string

  /** Detected project type (e.g., "typescript", "python") */
  projectType?: string

  /** Recent commands executed */
  recentCommands?: string[]

  /** Current git branch */
  gitBranch?: string

  /** Whether in a git repository */
  isGitRepo?: boolean

  /** Current working directory */
  cwd?: string

  /** User's preferred language */
  lang?: SupportedLang
}

/**
 * Result of skill activation check
 *
 * Contains information about whether a skill should be activated
 * and why.
 */
export interface SkillActivationResult {
  /** Whether a skill should be activated */
  shouldActivate: boolean

  /** The matched skill (if any) */
  matchedSkill?: SkillMdFile

  /** The trigger that matched (if any) */
  matchedTrigger?: string

  /** The use_when condition that matched (if any) */
  matchedUseWhen?: string

  /**
   * Confidence score (0-1)
   * Higher scores indicate stronger matches
   */
  confidence: number

  /** Reason for activation/non-activation */
  reason?: string
}

/**
 * Skill validation result
 *
 * Contains validation errors and warnings for a SKILL.md file.
 */
export interface SkillValidationResult {
  /** Whether the skill is valid */
  valid: boolean

  /** Validation errors (prevent installation) */
  errors: SkillValidationError[]

  /** Validation warnings (allow installation but notify user) */
  warnings: SkillValidationWarning[]
}

/**
 * Skill validation error
 *
 * Represents a critical validation error that prevents
 * skill installation or activation.
 */
export interface SkillValidationError {
  /** Error field (e.g., "metadata.name") */
  field: string

  /** Human-readable error message */
  message: string

  /** Error code for programmatic handling */
  code: string
}

/**
 * Skill validation warning
 *
 * Represents a non-critical validation issue that
 * should be brought to user's attention.
 */
export interface SkillValidationWarning {
  /** Warning field (e.g., "metadata.priority") */
  field: string

  /** Human-readable warning message */
  message: string

  /** Warning code for programmatic handling */
  code: string
}

/**
 * Skill installation options
 *
 * Configuration for installing a SKILL.md file.
 */
export interface SkillInstallOptions {
  /**
   * Target directory for installation
   * @default "~/.claude/skills"
   */
  targetDir?: string

  /**
   * Overwrite existing skill with same name
   * @default false
   */
  overwrite?: boolean

  /**
   * Install skill dependencies (if any)
   * @default true
   */
  installDependencies?: boolean

  /** Language for templates and messages */
  lang?: SupportedLang
}

/**
 * Skill installation result
 *
 * Contains information about the installation outcome.
 */
export interface SkillInstallResult {
  /** Whether installation succeeded */
  success: boolean

  /** Installed skill (if successful) */
  skill?: SkillMdFile

  /** Installation path (if successful) */
  installedPath?: string

  /** Error message (if failed) */
  error?: string
}

/**
 * Skill search options
 *
 * Configuration for searching and filtering skills.
 */
export interface SkillSearchOptions {
  /** Search query (matches name, description, tags) */
  query?: string

  /** Filter by category */
  category?: SkillCategory

  /** Filter by tags (AND logic) */
  tags?: string[]

  /** Filter by auto_activate capability */
  autoActivate?: boolean

  /**
   * Sort by field
   * @default "name"
   */
  sortBy?: 'name' | 'priority' | 'category'

  /**
   * Sort direction
   * @default "asc"
   */
  sortDir?: 'asc' | 'desc'

  /**
   * Limit results
   * @default undefined (no limit)
   */
  limit?: number
}

/**
 * Skill registry entry
 *
 * Represents a skill in the local registry.
 */
export interface SkillRegistryEntry {
  /** Skill ID (same as metadata.name) */
  id: string

  /** Skill metadata */
  metadata: SkillMdMetadata

  /** File path */
  filePath: string

  /**
   * Whether skill is enabled
   * Disabled skills are not considered for activation
   */
  enabled: boolean

  /** Installation source */
  source: 'builtin' | 'marketplace' | 'local'

  /** Installation date */
  installedAt: Date
}

/**
 * Skill registry
 *
 * Local database of installed skills.
 */
export interface SkillRegistry {
  /** Registry version (semantic version) */
  version: string

  /** Last updated timestamp (ISO 8601) */
  lastUpdated: string

  /** Registered skills */
  skills: SkillRegistryEntry[]
}

/**
 * Skill execution context
 *
 * Contains information about a skill execution session.
 */
export interface SkillExecutionContext {
  /** Skill being executed */
  skill: SkillMdFile

  /** Arguments passed to skill (raw string) */
  arguments: string

  /** Activation context */
  activationContext: SkillActivationContext

  /** Execution start time */
  startedAt: Date
}

/**
 * Skill execution result
 *
 * Contains information about the outcome of a skill execution.
 */
export interface SkillExecutionResult {
  /** Whether execution succeeded */
  success: boolean

  /** Execution context */
  context: SkillExecutionContext

  /** Execution end time */
  endedAt: Date

  /** Duration in milliseconds */
  durationMs: number

  /** Output (if any) */
  output?: string

  /** Error (if failed) */
  error?: string
}

/**
 * Skill marketplace entry
 *
 * Represents a skill available in the marketplace.
 */
export interface SkillMarketplaceEntry {
  /** Skill ID */
  id: string

  /** Skill metadata */
  metadata: SkillMdMetadata

  /** Download URL */
  downloadUrl: string

  /** Repository URL (if available) */
  repositoryUrl?: string

  /** Number of downloads */
  downloads: number

  /** Average rating (1-5) */
  rating?: number

  /** Number of ratings */
  ratingCount?: number

  /** Last updated timestamp */
  lastUpdated: string

  /** Whether skill is verified */
  verified: boolean
}

/**
 * Skill update check result
 *
 * Contains information about available skill updates.
 */
export interface SkillUpdateCheckResult {
  /** Whether updates are available */
  hasUpdates: boolean

  /** Skills with available updates */
  updates: SkillUpdateInfo[]
}

/**
 * Skill update information
 *
 * Contains information about a single skill update.
 */
export interface SkillUpdateInfo {
  /** Skill ID */
  skillId: string

  /** Current version */
  currentVersion: string

  /** Latest version */
  latestVersion: string

  /** Update description */
  description?: string

  /** Whether update is breaking */
  breaking: boolean
}
