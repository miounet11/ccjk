/**
 * CCJK Agent Type Definitions
 *
 * Defines the structure for AI agent definitions and cloud synchronization.
 * Agents are reusable AI configurations that can be shared across devices
 * and teams through the CCJK Cloud Service.
 *
 * @module types/agent
 */

import type { SupportedLang } from '../constants.js'

/**
 * Agent category types
 *
 * Categorizes agents by their primary function.
 */
export type AgentCategory
  = | 'coding' // Code generation and modification
    | 'review' // Code review and analysis
    | 'testing' // Test generation and validation
    | 'docs' // Documentation generation
    | 'debugging' // Bug finding and fixing
    | 'optimization' // Performance and quality optimization
    | 'security' // Security auditing
    | 'architecture' // System design and architecture
    | 'general' // General purpose agents

/**
 * Agent privacy level
 *
 * Controls who can access and use the agent.
 */
export type AgentPrivacy
  = | 'private' // Only accessible by the creator
    | 'team' // Accessible by team members
    | 'public' // Publicly available in marketplace

/**
 * Agent capability types
 *
 * Defines what the agent can do.
 */
export type AgentCapability
  = | 'code-generation' // Generate new code
    | 'code-modification' // Modify existing code
    | 'code-analysis' // Analyze code quality
    | 'test-generation' // Generate tests
    | 'documentation' // Write documentation
    | 'debugging' // Find and fix bugs
    | 'refactoring' // Refactor code
    | 'security-audit' // Security analysis
    | 'performance-analysis' // Performance optimization
    | 'architecture-design' // System design
    | 'code-review' // Review code changes
    | 'api-design' // Design APIs

/**
 * Agent tool types
 *
 * External tools the agent can use.
 */
export type AgentTool
  = | 'bash' // Execute bash commands
    | 'read' // Read files
    | 'write' // Write files
    | 'edit' // Edit files
    | 'grep' // Search in files
    | 'glob' // Find files by pattern
    | 'web-search' // Search the web
    | 'web-fetch' // Fetch web content
    | 'mcp' // Use MCP services

/**
 * Agent definition
 *
 * Core configuration for an AI agent.
 */
export interface AgentDefinition {
  /** Agent role/persona */
  role: string

  /** System prompt that defines agent behavior */
  systemPrompt: string

  /** Capabilities the agent has */
  capabilities: AgentCapability[]

  /** Tools the agent can use */
  tools: AgentTool[]

  /** Constraints and limitations */
  constraints: string[]

  /** Example interactions (optional) */
  examples?: Array<{
    user: string
    assistant: string
  }>

  /** Temperature setting (0-1) */
  temperature?: number

  /** Max tokens for responses */
  maxTokens?: number

  /** Custom instructions */
  customInstructions?: string[]
}

/**
 * Agent metadata
 *
 * Information about the agent for discovery and management.
 */
export interface AgentMetadata {
  /** Agent author */
  author: string

  /** Author email */
  authorEmail?: string

  /** Localized descriptions */
  description: Record<SupportedLang, string>

  /** Search tags */
  tags: string[]

  /** Agent category */
  category: AgentCategory

  /** Creation timestamp (ISO 8601) */
  createdAt: string

  /** Last update timestamp (ISO 8601) */
  updatedAt: string

  /** Usage count */
  usageCount: number

  /** Average rating (1-5) */
  rating: number

  /** Number of ratings */
  ratingCount: number

  /** Repository URL */
  repository?: string

  /** Homepage URL */
  homepage?: string

  /** License identifier (SPDX format) */
  license?: string

  /** Minimum CCJK version required */
  ccjkVersion?: string

  /** Compatible code tools */
  compatibleTools?: ('claude-code' | 'codex' | 'aider')[]
}

/**
 * Cloud agent
 *
 * Complete agent configuration with cloud sync capabilities.
 */
export interface CloudAgent {
  /** Unique agent identifier */
  id: string

  /** Display name */
  name: string

  /** Semantic version */
  version: string

  /** Agent definition */
  definition: AgentDefinition

  /** Agent metadata */
  metadata: AgentMetadata

  /** Privacy level */
  privacy: AgentPrivacy

  /** Cloud sync ID (assigned by server) */
  cloudId?: string

  /** Sync status */
  syncStatus?: 'synced' | 'outdated' | 'local-only' | 'conflict'

  /** Last sync timestamp */
  lastSyncAt?: string
}

/**
 * Agent template
 *
 * Pre-configured agent template with customizable variables.
 */
export interface AgentTemplate {
  /** Template identifier */
  id: string

  /** Template name */
  name: string

  /** Template category */
  category: AgentCategory

  /** Localized descriptions */
  description: Record<SupportedLang, string>

  /** Base agent definition */
  definition: AgentDefinition

  /** Customizable variables */
  variables: AgentTemplateVariable[]

  /** Template tags */
  tags: string[]

  /** Template author */
  author: string

  /** Template version */
  version: string

  /** Usage examples */
  examples?: string[]
}

/**
 * Agent template variable
 *
 * Defines a customizable variable in an agent template.
 */
export interface AgentTemplateVariable {
  /** Variable name (used in template) */
  name: string

  /** Localized label */
  label: Record<SupportedLang, string>

  /** Localized description */
  description: Record<SupportedLang, string>

  /** Variable type */
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect'

  /** Default value */
  default?: string | number | boolean | string[]

  /** Required variable */
  required: boolean

  /** Options for select/multiselect */
  options?: Array<{
    value: string
    label: Record<SupportedLang, string>
  }>

  /** Validation pattern (regex) */
  pattern?: string

  /** Placeholder text */
  placeholder?: Record<SupportedLang, string>
}

/**
 * Agent installation options
 */
export interface AgentInstallOptions {
  /** Specific version to install */
  version?: string

  /** Force reinstall */
  force?: boolean

  /** Target directory */
  targetDir?: string

  /** Language for templates */
  lang?: SupportedLang

  /** Code tool type */
  codeToolType?: 'claude-code' | 'codex' | 'aider'

  /** Custom variable values */
  variables?: Record<string, string | number | boolean | string[]>
}

/**
 * Agent installation result
 */
export interface AgentInstallResult {
  /** Whether installation succeeded */
  success: boolean

  /** Installed agent */
  agent: CloudAgent

  /** Installation path */
  installedPath?: string

  /** Error message (if failed) */
  error?: string

  /** Warnings during installation */
  warnings?: string[]

  /** Installation duration in milliseconds */
  durationMs?: number

  /** Whether agent was already installed */
  alreadyInstalled?: boolean
}

/**
 * Installed agent info
 */
export interface InstalledAgent {
  /** Agent data */
  agent: CloudAgent

  /** Installation path */
  path: string

  /** Installation timestamp */
  installedAt: string

  /** Installation source */
  source: 'cloud' | 'local' | 'template'

  /** Whether agent is enabled */
  enabled: boolean

  /** User configuration overrides */
  config?: Record<string, unknown>

  /** Last used timestamp */
  lastUsed?: string

  /** Usage count */
  usageCount?: number
}

/**
 * Agent sync options
 */
export interface AgentSyncOptions {
  /** Sync direction */
  direction?: 'push' | 'pull' | 'both'

  /** Force sync (overwrite conflicts) */
  force?: boolean

  /** Specific agent IDs to sync */
  agentIds?: string[]

  /** Include private agents */
  includePrivate?: boolean

  /** Dry run (don't actually sync) */
  dryRun?: boolean

  /** Language for messages */
  lang?: SupportedLang
}

/**
 * Agent sync result
 */
export interface AgentSyncResult {
  /** Whether sync succeeded */
  success: boolean

  /** Agents pushed to cloud */
  pushed: string[]

  /** Agents pulled from cloud */
  pulled: string[]

  /** Agents with conflicts */
  conflicts: Array<{
    agentId: string
    reason: string
  }>

  /** Agents skipped */
  skipped: string[]

  /** Error message (if failed) */
  error?: string

  /** Sync duration in milliseconds */
  durationMs?: number
}

/**
 * Agent search options
 */
export interface AgentSearchOptions {
  /** Search query */
  query?: string

  /** Filter by category */
  category?: AgentCategory

  /** Filter by author */
  author?: string

  /** Filter by tags */
  tags?: string[]

  /** Filter by capabilities */
  capabilities?: AgentCapability[]

  /** Filter by privacy */
  privacy?: AgentPrivacy

  /** Sort field */
  sortBy?: 'downloads' | 'rating' | 'updated' | 'name' | 'created'

  /** Sort direction */
  sortDir?: 'asc' | 'desc'

  /** Results limit */
  limit?: number

  /** Results offset */
  offset?: number

  /** Minimum rating */
  minRating?: number

  /** Language for results */
  lang?: SupportedLang
}

/**
 * Agent search result
 */
export interface AgentSearchResult {
  /** Matching agents */
  agents: CloudAgent[]

  /** Total count (before pagination) */
  total: number

  /** Current offset */
  offset: number

  /** Current limit */
  limit: number

  /** Search query used */
  query?: string

  /** Applied filters */
  filters?: Partial<AgentSearchOptions>
}

/**
 * Agent validation result
 */
export interface AgentValidationResult {
  /** Whether agent is valid */
  valid: boolean

  /** Validation errors */
  errors: Array<{
    field: string
    message: string
    code: string
  }>

  /** Validation warnings */
  warnings: Array<{
    field: string
    message: string
    code: string
  }>
}

/**
 * Agent export options
 */
export interface AgentExportOptions {
  /** Export format */
  format?: 'json' | 'yaml' | 'markdown'

  /** Include metadata */
  includeMetadata?: boolean

  /** Include usage stats */
  includeStats?: boolean

  /** Output file path */
  outputPath?: string

  /** Pretty print */
  pretty?: boolean
}

/**
 * Agent import options
 */
export interface AgentImportOptions {
  /** Source file path */
  sourcePath: string

  /** Source format */
  format?: 'json' | 'yaml' | 'markdown'

  /** Overwrite existing */
  overwrite?: boolean

  /** Validate before import */
  validate?: boolean

  /** Language for messages */
  lang?: SupportedLang
}

/**
 * Agent statistics
 */
export interface AgentStatistics {
  /** Agent ID */
  agentId: string

  /** Total usage count */
  totalUsage: number

  /** Usage in last 7 days */
  usageWeek: number

  /** Usage in last 30 days */
  usageMonth: number

  /** Average rating */
  rating: number

  /** Number of ratings */
  ratingCount: number

  /** Number of active installations */
  activeInstalls: number

  /** Last used timestamp */
  lastUsed?: string

  /** Average session duration (seconds) */
  avgSessionDuration?: number
}

/**
 * Agent rating submission
 */
export interface AgentRating {
  /** Agent ID */
  agentId: string

  /** Rating value (1-5) */
  rating: number

  /** Optional review text */
  review?: string

  /** Reviewer ID */
  reviewerId?: string

  /** Review timestamp */
  timestamp?: string

  /** Reviewer name */
  reviewerName?: string
}

/**
 * Agent version info
 */
export interface AgentVersionInfo {
  /** Version number */
  version: string

  /** Release date */
  releaseDate: string

  /** Changelog */
  changelog?: string

  /** Breaking changes */
  breaking: boolean

  /** Download URL */
  downloadUrl?: string

  /** Checksum */
  checksum?: string
}

/**
 * Agent update info
 */
export interface AgentUpdateInfo {
  /** Agent ID */
  agentId: string

  /** Current version */
  currentVersion: string

  /** Latest version */
  latestVersion: string

  /** Whether update has breaking changes */
  breaking: boolean

  /** Changelog summary */
  changelog?: string

  /** Release date */
  releaseDate?: string
}
