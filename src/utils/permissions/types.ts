/**
 * Permission system types for Claude Code 2.1.x wildcard syntax support
 * @module permissions/types
 */

/**
 * Permission action types
 * - allow: Automatically allow the operation
 * - deny: Automatically deny the operation
 * - ask: Prompt user for confirmation
 */
export type PermissionAction = 'allow' | 'deny' | 'ask'

/**
 * Permission rule source types
 * - builtin: Built-in default rules
 * - skill: Rules from skill definitions
 * - user: User-defined rules
 * - project: Project-specific rules
 */
export type PermissionSource = 'builtin' | 'skill' | 'user' | 'project'

/**
 * Permission rule definition
 * Supports Claude Code 2.1.x wildcard patterns:
 * - Bash(npm *): All npm commands
 * - Bash(* install): All install commands
 * - Bash(git * main): Git commands involving main
 * - mcp__server__*: All tools from server
 * - Read: All Read operations
 * - *: All tools
 */
export interface PermissionRule {
  /**
   * Pattern to match against tool invocations
   * Supports wildcards (*) for flexible matching
   * @example "Bash(npm *)" - matches all npm commands
   * @example "mcp__server__*" - matches all tools from server
   */
  pattern: string

  /**
   * Action to take when pattern matches
   */
  action: PermissionAction

  /**
   * Human-readable reason for this rule
   * @example "npm commands are safe for package management"
   */
  reason?: string

  /**
   * Rule priority (higher number = higher priority)
   * Used to resolve conflicts when multiple rules match
   * @default 0
   */
  priority?: number

  /**
   * Source of this rule
   * @default 'user'
   */
  source?: PermissionSource

  /**
   * Optional metadata for tracking and debugging
   */
  metadata?: {
    /**
     * Skill name if rule comes from a skill
     */
    skillName?: string

    /**
     * Timestamp when rule was created
     */
    createdAt?: string

    /**
     * User or system that created the rule
     */
    createdBy?: string

    /**
     * Additional custom metadata
     */
    [key: string]: unknown
  }
}

/**
 * Result of a permission check
 */
export interface PermissionCheckResult {
  /**
   * Whether the operation is allowed
   * - true: Operation can proceed
   * - false: Operation should be blocked or require confirmation
   */
  allowed: boolean

  /**
   * The action determined by the permission system
   */
  action: PermissionAction

  /**
   * The rule that matched (if any)
   */
  matchedRule?: PermissionRule

  /**
   * Reason for the decision
   */
  reason?: string

  /**
   * All rules that were considered (for debugging)
   */
  consideredRules?: PermissionRule[]
}

/**
 * Context for permission checking
 * Provides information about the tool invocation being checked
 */
export interface PermissionContext {
  /**
   * Tool name (e.g., "Bash", "Read", "mcp__server__tool")
   */
  tool: string

  /**
   * Tool arguments as a string
   * For Bash: the command being executed
   * For other tools: serialized arguments
   * @example "npm install express"
   * @example "git push origin main"
   */
  args?: string

  /**
   * Skill name if invoked from a skill
   */
  skill?: string

  /**
   * User identifier
   */
  user?: string

  /**
   * Additional context metadata
   */
  metadata?: {
    /**
     * Working directory
     */
    cwd?: string

    /**
     * Environment variables
     */
    env?: Record<string, string>

    /**
     * Additional custom context
     */
    [key: string]: unknown
  }
}

/**
 * Configuration for permission system
 */
export interface PermissionConfig {
  /**
   * Enable permission checking
   * @default true
   */
  enabled?: boolean

  /**
   * Default action when no rules match
   * @default 'ask'
   */
  defaultAction?: PermissionAction

  /**
   * Enable rule conflict detection
   * @default true
   */
  detectConflicts?: boolean

  /**
   * Enable unreachable rule detection
   * @default true
   */
  detectUnreachable?: boolean

  /**
   * Log permission checks for debugging
   * @default false
   */
  logChecks?: boolean

  /**
   * Custom rule validation function
   */
  validateRule?: (rule: PermissionRule) => boolean
}

/**
 * Permission rule conflict
 * Detected when multiple rules with same priority match the same pattern
 */
export interface PermissionConflict {
  /**
   * The conflicting rules
   */
  rules: PermissionRule[]

  /**
   * Pattern that causes the conflict
   */
  pattern: string

  /**
   * Suggested resolution
   */
  resolution?: string
}

/**
 * Permission rule validation result
 */
export interface PermissionValidationResult {
  /**
   * Whether the rule is valid
   */
  valid: boolean

  /**
   * Validation errors
   */
  errors?: string[]

  /**
   * Validation warnings
   */
  warnings?: string[]
}
