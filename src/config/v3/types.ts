/**
 * Configuration Manager V3 - Type Definitions
 *
 * Core types for the V3 configuration system with full type safety
 */

import type { CodeToolType, SupportedLang } from '../../constants'

// ============================================================================
// Core Configuration Types
// ============================================================================

/**
 * Environment type for multi-environment support
 */
export type Environment = 'dev' | 'prod' | 'test'

/**
 * Configuration change event handler
 */
export type ConfigChangeHandler = (event: ConfigChangeEvent) => void

/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  path: string
  oldValue: unknown
  newValue: unknown
  timestamp: Date
  source: 'file' | 'api' | 'migration'
}

/**
 * Validation result from schema validation
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/**
 * Validation error detail
 */
export interface ValidationError {
  path: string
  message: string
  code: ValidationErrorCode
  value?: unknown
  expected?: string
}

/**
 * Validation warning detail
 */
export interface ValidationWarning {
  path: string
  message: string
  suggestion?: string
}

/**
 * Validation error codes
 */
export type ValidationErrorCode
  = | 'REQUIRED_FIELD'
    | 'INVALID_TYPE'
    | 'INVALID_FORMAT'
    | 'INVALID_ENUM'
    | 'INVALID_URL'
    | 'INVALID_API_KEY'
    | 'MIN_LENGTH'
    | 'MAX_LENGTH'
    | 'PATTERN_MISMATCH'
    | 'CUSTOM_VALIDATION'

/**
 * Migration result from config migration
 */
export interface MigrationResult {
  success: boolean
  fromVersion: string
  toVersion: string
  migratedPaths: string[]
  backupPath?: string
  errors: string[]
  warnings: string[]
}

/**
 * Configuration diff result
 */
export interface ConfigDiff {
  added: DiffEntry[]
  removed: DiffEntry[]
  changed: DiffEntry[]
}

/**
 * Single diff entry
 */
export interface DiffEntry {
  path: string
  oldValue?: unknown
  newValue?: unknown
}

// ============================================================================
// Schema Types
// ============================================================================

/**
 * JSON Schema field types
 */
export type SchemaFieldType
  = | 'string'
    | 'number'
    | 'boolean'
    | 'object'
    | 'array'
    | 'null'

/**
 * Schema field definition
 */
export interface SchemaField {
  type: SchemaFieldType | SchemaFieldType[]
  required?: boolean
  default?: unknown
  description?: string
  enum?: unknown[]
  pattern?: string
  format?: 'url' | 'email' | 'api-key' | 'date-time' | 'uri'
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  items?: SchemaField
  properties?: Record<string, SchemaField>
  additionalProperties?: boolean | SchemaField
}

/**
 * Complete schema definition
 */
export interface ConfigSchema {
  $schema?: string
  type: 'object'
  properties: Record<string, SchemaField>
  required?: string[]
  additionalProperties?: boolean
}

// ============================================================================
// Configuration Data Types
// ============================================================================

/**
 * V3 Configuration root structure
 */
export interface ConfigV3 {
  $version: string
  $environment: Environment
  $lastUpdated: string

  general: GeneralConfigV3
  tools: ToolsConfigV3
  api: ApiConfigV3
  features: FeaturesConfigV3
}

/**
 * General configuration section
 */
export interface GeneralConfigV3 {
  preferredLang: SupportedLang
  templateLang?: SupportedLang
  aiOutputLang?: string
  currentTool: CodeToolType
  theme?: 'light' | 'dark' | 'auto'
}

/**
 * Tools configuration section
 */
export interface ToolsConfigV3 {
  claudeCode: ClaudeCodeConfigV3
  codex: CodexConfigV3
  aider?: ToolConfigBase
  continue?: ToolConfigBase
  cline?: ToolConfigBase
  cursor?: ToolConfigBase
}

/**
 * Base tool configuration
 */
export interface ToolConfigBase {
  enabled: boolean
  installType?: 'global' | 'local'
  version?: string
}

/**
 * Claude Code specific configuration
 */
export interface ClaudeCodeConfigV3 extends ToolConfigBase {
  outputStyles: string[]
  defaultOutputStyle?: string
  currentProfile?: string
  profiles: Record<string, ProfileConfigV3>
}

/**
 * Profile configuration
 */
export interface ProfileConfigV3 {
  name: string
  description?: string
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * Codex specific configuration
 */
export interface CodexConfigV3 extends ToolConfigBase {
  systemPromptStyle: string
  model?: string
}

/**
 * API configuration section
 */
export interface ApiConfigV3 {
  anthropic?: ApiEndpointConfig
  openai?: ApiEndpointConfig
  custom?: ApiEndpointConfig[]
}

/**
 * API endpoint configuration
 */
export interface ApiEndpointConfig {
  baseUrl: string
  apiKey?: string
  timeout?: number
  retries?: number
}

/**
 * Features configuration section
 */
export interface FeaturesConfigV3 {
  hotReload: boolean
  autoMigration: boolean
  telemetry: boolean
  experimentalFeatures: string[]
}

// ============================================================================
// Manager Interface
// ============================================================================

/**
 * Configuration Manager V3 Interface
 */
export interface IConfigManagerV3 {
  /**
   * Get configuration value by path
   */
  get: <T>(path: string) => T

  /**
   * Set configuration value by path
   */
  set: (path: string, value: unknown) => void

  /**
   * Validate current configuration
   */
  validate: () => ValidationResult

  /**
   * Migrate configuration from older versions
   */
  migrate: () => MigrationResult

  /**
   * Watch for configuration changes
   * @returns Unsubscribe function
   */
  watch: (callback: ConfigChangeHandler) => () => void

  /**
   * Export configuration as JSON string
   */
  export: () => string

  /**
   * Import configuration from JSON string
   */
  import: (data: string) => void

  /**
   * Get configuration diff between current and provided config
   */
  diff: (other: Partial<ConfigV3>) => ConfigDiff

  /**
   * Reset configuration to defaults
   */
  reset: () => void

  /**
   * Get current environment
   */
  getEnvironment: () => Environment

  /**
   * Set current environment
   */
  setEnvironment: (env: Environment) => void
}

/**
 * Partial configuration for updates
 */
export type PartialConfigV3 = {
  [K in keyof ConfigV3]?: ConfigV3[K] extends object
    ? Partial<ConfigV3[K]>
    : ConfigV3[K]
}
