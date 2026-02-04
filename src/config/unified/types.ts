/**
 * Unified Configuration Types for CCJK v4
 *
 * This module defines the core types for the unified configuration system that
 * replaces the 3 overlapping config systems (config.ts, ccjk-config.ts, claude-code-config-manager.ts)
 */

import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../../constants'
import type { ClaudeCodeProfile } from '../../types/claude-code-config'
import type { ClaudeSettings } from '../../types/config'

/**
 * Configuration scope determines where config is read from/written to
 */
export type ConfigScope
  = | 'ccjk' // ~/.ccjk/config.toml - CCJK preferences
    | 'claude' // ~/.claude/settings.json - Claude Code native config
    | 'state' // ~/.ccjk/state.json - Runtime state
    | 'all' // All config files

/**
 * Configuration operation types for tracking and logging
 */
export type ConfigOperation
  = | 'read'
    | 'write'
    | 'merge'
    | 'backup'
    | 'migrate'
    | 'validate'
    | 'delete'

/**
 * Configuration merge strategy
 */
export type MergeStrategy
  = | 'replace' // Replace existing with new
    | 'merge' // Deep merge, new values override
    | 'preserve' // Keep existing values, only add new
    | 'ask' // Prompt user for conflict resolution

/**
 * Configuration priority for conflict resolution
 */
export type ConfigPriority = 'user' | 'template' | 'system'

/**
 * Validation result for configuration
 */
export interface ValidationResult {
  valid: boolean
  errors: ConfigValidationError[]
  warnings: ConfigValidationError[]
}

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  path: string // Dot-notation path to the field
  message: string
  code?: string // Error code for i18n
  value?: unknown
}

/**
 * Backup result from configuration backup operation
 */
export interface BackupResult {
  success: boolean
  backupPath?: string
  timestamp: Date
  scopes: ConfigScope[]
  error?: string
}

/**
 * Configuration migration result
 */
export interface MigrationResult {
  success: boolean
  migratedScopes: ConfigScope[]
  backupPath?: string
  errors: string[]
  warnings: string[]
}

/**
 * Unified configuration combining all config sources
 */
export interface UnifiedConfig {
  // CCJK-specific configuration (from ~/.ccjk/config.toml)
  ccjk: CcjkConfig

  // Claude Code settings (from ~/.claude/settings.json)
  claude: ClaudeSettings

  // Runtime state (from ~/.ccjk/state.json)
  state: RuntimeState
}

/**
 * CCJK configuration section (stored in ~/.ccjk/config.toml)
 * This consolidates the ZcfTomlConfig structure
 */
export interface CcjkConfig {
  version: string
  lastUpdated: string

  // General CCJK preferences
  general: GeneralConfig

  // Tool-specific configurations
  tools: ToolsConfig
}

/**
 * General CCJK preferences
 */
export interface GeneralConfig {
  preferredLang: SupportedLang
  templateLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  currentTool: CodeToolType
  /**
   * Auto-grant MCP permissions when installing MCP services
   * - undefined: not yet asked (will prompt on first MCP install)
   * - true: always auto-grant permissions
   * - false: never auto-grant (user prefers manual approval)
   */
  autoGrantMcpPermissions?: boolean
}

/**
 * Tool configurations supporting multiple code tools
 */
export interface ToolsConfig {
  // Claude Code configuration
  claudeCode: ClaudeCodeToolConfig

  // Codex configuration
  codex: CodexToolConfig

  // Future tool support (aider, continue, cline, cursor)
  aider?: AiderToolConfig
  continue?: ContinueToolConfig
  cline?: ClineToolConfig
  cursor?: CursorToolConfig
}

/**
 * Claude Code tool configuration
 */
export interface ClaudeCodeToolConfig {
  enabled: boolean
  installType: 'global' | 'local'
  installMethod?: 'npm' | 'homebrew' | 'curl' | 'powershell' | 'cmd' | 'native'
  outputStyles: string[]
  defaultOutputStyle?: string
  currentProfile?: string
  profiles: Record<string, ClaudeCodeProfile>
  version?: string
}

/**
 * Codex tool configuration
 */
export interface CodexToolConfig {
  enabled: boolean
  systemPromptStyle: string
  installMethod?: 'npm' | 'homebrew' | 'native'
  envKeyMigrated?: boolean
}

/**
 * Aider tool configuration
 */
export interface AiderToolConfig {
  enabled: boolean
  installMethod?: 'pip' | 'native'
}

/**
 * Continue tool configuration
 */
export interface ContinueToolConfig {
  enabled: boolean
  installMethod?: 'pip' | 'native'
}

/**
 * Cline tool configuration
 */
export interface ClineToolConfig {
  enabled: boolean
  installMethod?: 'vscode' | 'native'
}

/**
 * Cursor tool configuration
 */
export interface CursorToolConfig {
  enabled: boolean
  installMethod?: 'curl' | 'native'
}

/**
 * Runtime state (stored in ~/.ccjk/state.json)
 * This is transient state that doesn't need to be in the main config
 */
export interface RuntimeState {
  version: string
  lastUpdated: string

  // Session tracking
  sessions: SessionState[]

  // Cache management
  cache: CacheState

  // Update tracking
  updates: UpdateState
}

/**
 * Session tracking state
 */
export interface SessionState {
  id: string
  startTime: string
  lastActivity: string
  tool: CodeToolType
  lang: SupportedLang
  profile?: string
}

/**
 * Cache state management
 */
export interface CacheState {
  lastCleanup: string
  size: number
  maxAge: number // TTL in milliseconds
}

/**
 * Update tracking state
 */
export interface UpdateState {
  lastCheck: string
  lastVersion: string
  currentVersion: string
  updateAvailable: boolean
}

/**
 * Partial configuration for updates
 */
export type PartialCcjkConfig = Partial<CcjkConfig> & {
  general?: Partial<GeneralConfig>
  tools?: Partial<ToolsConfig> & {
    claudeCode?: Partial<ClaudeCodeToolConfig>
    codex?: Partial<CodexToolConfig>
    aider?: Partial<AiderToolConfig>
    continue?: Partial<ContinueToolConfig>
    cline?: Partial<ClineToolConfig>
    cursor?: Partial<CursorToolConfig>
  }
}

/**
 * Partial runtime state for updates
 */
export type PartialRuntimeState = Partial<RuntimeState> & {
  sessions?: Partial<SessionState>[]
  cache?: Partial<CacheState>
  updates?: Partial<UpdateState>
}

/**
 * Configuration read options
 */
export interface ConfigReadOptions {
  scope?: ConfigScope
  validate?: boolean
  defaults?: boolean // Apply defaults if missing
}

/**
 * Configuration write options
 */
export interface ConfigWriteOptions {
  scope?: ConfigScope
  backup?: boolean
  validate?: boolean
  merge?: boolean | MergeStrategy
  atomic?: boolean
}

/**
 * Configuration merge options
 */
export interface ConfigMergeOptions {
  strategy?: MergeStrategy
  priority?: ConfigPriority
  arrayMerge?: 'replace' | 'concat' | 'unique'
  deep?: boolean
}

/**
 * Configuration migration options
 */
export interface ConfigMigrateOptions {
  backup?: boolean
  dryRun?: boolean
  force?: boolean
  legacyPaths?: string[]
}

/**
 * Configuration backup options
 */
export interface ConfigBackupOptions {
  scopes?: ConfigScope[]
  timestamp?: boolean
  compress?: boolean
}

/**
 * Credential storage types
 */
export type CredentialType = 'api_key' | 'auth_token' | 'ccr_proxy' | 'oauth'

/**
 * Stored credential
 */
export interface StoredCredential {
  id: string
  type: CredentialType
  name: string
  encrypted: boolean
  createdAt: string
  lastUsed?: string
  metadata?: Record<string, unknown>
}

/**
 * Configuration event types for observability
 */
export type ConfigEventType
  = | 'config_read'
    | 'config_written'
    | 'config_merged'
    | 'config_validated'
    | 'config_backed_up'
    | 'config_migrated'
    | 'config_error'

/**
 * Configuration event
 */
export interface ConfigEvent {
  type: ConfigEventType
  scope: ConfigScope
  timestamp: Date
  operation: ConfigOperation
  success: boolean
  error?: string
  metadata?: Record<string, unknown>
}

/**
 * Configuration manager event listener
 */
export type ConfigEventListener = (event: ConfigEvent) => void
