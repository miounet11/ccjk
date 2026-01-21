/**
 * Config Subcommand Types
 *
 * Type definitions for the consolidated config command system in CCJK v4.
 * These types support all config subcommands: api, switch, list, get, set.
 */

import type { CodeToolType, SupportedLang } from '../../constants'

/**
 * Common options for all config subcommands
 */
export interface BaseConfigOptions {
  /** Display language (zh-CN, en) */
  lang?: SupportedLang
  /** Output as JSON */
  json?: boolean
}

/**
 * API subcommand options
 */
export interface ApiConfigOptions extends BaseConfigOptions {
  /** Code tool type (claude-code, codex) */
  codeType?: CodeToolType
  /** List available providers */
  list?: boolean
  /** Show current API configuration */
  show?: boolean
}

/**
 * API provider configuration
 */
export interface ApiProviderConfig {
  /** Provider unique identifier */
  id: string
  /** Provider display name */
  name: string
  /** Base URL for API requests */
  baseUrl: string
  /** Authentication type */
  authType: 'api_key' | 'auth_token' | 'oauth'
  /** API key or token value */
  apiKey?: string
  /** Default models for this provider */
  defaultModels?: string[]
  /** Provider description */
  description?: string
  /** Whether this is a cloud-provided provider */
  isCloud?: boolean
}

/**
 * Switch subcommand options
 */
export interface SwitchConfigOptions extends BaseConfigOptions {
  /** Code tool type (claude-code, codex) */
  codeType?: CodeToolType
  /** List available configurations */
  list?: boolean
}

/**
 * Configuration profile (for Claude Code)
 */
export interface ConfigProfile {
  /** Profile unique identifier */
  id: string
  /** Profile display name */
  name: string
  /** Authentication type */
  authType: 'api_key' | 'auth_token' | 'oauth' | 'ccr_proxy'
  /** Base URL */
  baseUrl?: string
  /** Model configuration */
  model?: string
  /** Whether this is the current profile */
  isCurrent?: boolean
}

/**
 * List subcommand options
 */
export interface ListConfigOptions extends BaseConfigOptions {
  /** Configuration scope to list */
  scope?: 'all' | 'ccjk' | 'claude' | 'state'
  /** Show detailed information */
  verbose?: boolean
}

/**
 * Get subcommand options
 */
export interface GetConfigOptions extends BaseConfigOptions {
  /** Show value source file */
  showSource?: boolean
}

/**
 * Set subcommand options
 */
export interface SetConfigOptions extends BaseConfigOptions {
  /** Configuration scope to set value in */
  scope?: 'ccjk' | 'claude' | 'auto'
  /** Create backup before modification */
  backup?: boolean
  /** Value type (auto-detected by default) */
  type?: 'string' | 'number' | 'boolean' | 'json'
}

/**
 * Configuration value result with source information
 */
export interface ConfigValueResult {
  /** The value */
  value: unknown
  /** Source configuration file */
  source: 'ccjk' | 'claude' | 'state'
  /** Full path to source file */
  sourcePath: string
  /** Dot notation path */
  path: string
}

/**
 * Configuration list result
 */
export interface ConfigListResult {
  /** CCJK configuration (~/.ccjk/config.toml) */
  ccjk?: Record<string, unknown> | null
  /** Claude Code configuration (~/.claude/settings.json) */
  claude?: Record<string, unknown> | null
  /** Runtime state (~/.ccjk/state.json) */
  state?: Record<string, unknown> | null
}

/**
 * Set operation result
 */
export interface ConfigSetResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Path that was set */
  path: string
  /** New value */
  value: unknown
  /** Backup path if created */
  backupPath?: string
  /** Error message if failed */
  error?: string
}

/**
 * Validation error for configuration values
 */
export interface ConfigValueError {
  /** Path to the invalid value */
  path: string
  /** Error message */
  message: string
  /** Error code for i18n lookup */
  code?: string
}

/**
 * Parsed dot notation path
 */
export interface ParsedPath {
  /** Full path string */
  full: string
  /** Individual path segments */
  segments: string[]
  /** Determined scope (auto-detected) */
  scope: 'ccjk' | 'claude' | 'state'
}
