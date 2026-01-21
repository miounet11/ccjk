/**
 * Unified Configuration System - Main Entry Point
 *
 * This module provides the primary API for CCJK v4's unified configuration system.
 * It replaces the three overlapping config systems (config.ts, ccjk-config.ts,
 * claude-code-config-manager.ts) with a single, cohesive interface.
 *
 * Configuration File Responsibilities:
 * - ~/.ccjk/config.toml - CCJK preferences (lang, tool type, profiles)
 * - ~/.claude/settings.json - Claude Code native config
 * - ~/.ccjk/state.json - Runtime state (sessions, cache)
 * - ~/.ccjk/credentials.json - Encrypted API keys/tokens
 *
 * @example
 * ```typescript
 * import { config } from '@/config/unified'
 *
 * // Read configuration
 * const ccjkConfig = config.ccjk.read()
 * const claudeConfig = config.claude.read()
 * const state = config.state.read()
 *
 * // Write configuration
 * config.ccjk.write({ general: { preferredLang: 'zh-CN' } })
 *
 * // Merge configurations
 * const merged = config.merge.configs(templateConfig, userConfig, { strategy: 'merge' })
 *
 * // Run migrations
 * await config.migrate.run()
 * ```
 */

import type { ClaudeSettings as ClaudeSettingsType } from '../../types/config'
// Type exports - re-export from types module
import type { CcjkConfig, ConfigScope, RuntimeState, ValidationResult } from './types'

import { createDefaultCcjkConfig, getCcjkConfig, readCcjkConfig, updateCcjkConfig, validateCcjkConfig, writeCcjkConfig } from './ccjk-config'
import { getClaudeConfig, mergeClaudeSettings as mergeClaudeSettingsImpl, readClaudeConfig, updateClaudeConfig, validateClaudeConfig, writeClaudeConfig } from './claude-config'
import { deleteCredential, hasCredential, initializeCredentials, listCredentials, retrieveCredential, storeCredential } from './credentials'
import { mergeConfigs, validateMergedConfig } from './merger'
import { detectLegacyConfigs, getMigrationStatus, needsMigration, runMigrations } from './migration'
import { createDefaultState, getState, readState, updateState, validateState, writeState } from './state-manager'

// Re-export ClaudeSettings from existing types
export type { ClaudeSettings } from '../../types/config'

// CCJK Configuration Manager (config.toml)
export * from './ccjk-config'

// Claude Code Configuration Manager (settings.json)
export * from './claude-config'

// Credential Manager
export * from './credentials'

// Smart Configuration Merger
export * from './merger'

// Migration System
export * from './migration'

// Runtime State Manager (state.json)
export * from './state-manager'

export * from './types'

/**
 * Unified Configuration Manager
 *
 * Provides a single entry point for all configuration operations
 * across CCJK, Claude Code, and runtime state.
 */
export const config = {
  /**
   * CCJK Configuration (~/.ccjk/config.toml)
   */
  ccjk: {
    /**
     * Read CCJK configuration
     */
    read: readCcjkConfig,

    /**
     * Write CCJK configuration
     */
    write: writeCcjkConfig,

    /**
     * Update CCJK configuration with partial changes
     */
    update: updateCcjkConfig,

    /**
     * Get or create CCJK configuration (with defaults)
     */
    get: getCcjkConfig,

    /**
     * Create default CCJK configuration
     */
    createDefault: createDefaultCcjkConfig,

    /**
     * Validate CCJK configuration
     */
    validate: validateCcjkConfig,
  },

  /**
   * Claude Code Configuration (~/.claude/settings.json)
   */
  claude: {
    /**
     * Read Claude Code settings
     */
    read: readClaudeConfig,

    /**
     * Write Claude Code settings
     */
    write: writeClaudeConfig,

    /**
     * Update Claude Code settings with partial changes
     */
    update: updateClaudeConfig,

    /**
     * Get or create Claude Code configuration
     */
    get: getClaudeConfig,

    /**
     * Merge template settings into existing configuration
     */
    mergeTemplate: mergeClaudeSettingsImpl,

    /**
     * Validate Claude Code configuration
     */
    validate: validateClaudeConfig,
  },

  /**
   * Runtime State (~/.ccjk/state.json)
   */
  state: {
    /**
     * Read runtime state
     */
    read: readState,

    /**
     * Write runtime state
     */
    write: writeState,

    /**
     * Update runtime state with partial changes
     */
    update: updateState,

    /**
     * Get or create runtime state
     */
    get: getState,

    /**
     * Create default runtime state
     */
    createDefault: createDefaultState,

    /**
     * Validate runtime state
     */
    validate: validateState,
  },

  /**
   * Smart configuration merging
   */
  merge: {
    /**
     * Generic merge with conflict resolution
     */
    configs: mergeConfigs,

    /**
     * Validate merged configuration
     */
    validate: validateMergedConfig,
  },

  /**
   * Credential management
   */
  credentials: {
    /**
     * Initialize credential system
     */
    init: initializeCredentials,

    /**
     * Store a credential
     */
    store: storeCredential,

    /**
     * Retrieve a credential value
     */
    get: retrieveCredential,

    /**
     * Check if credential exists
     */
    has: hasCredential,

    /**
     * List all credentials
     */
    list: listCredentials,

    /**
     * Delete a credential
     */
    delete: deleteCredential,
  },

  /**
   * Configuration migration
   */
  migrate: {
    /**
     * Run all pending migrations
     */
    run: runMigrations,

    /**
     * Check if migration is needed
     */
    needsMigration,

    /**
     * Get migration status
     */
    getStatus: getMigrationStatus,

    /**
     * Detect legacy configuration files
     */
    detectLegacy: detectLegacyConfigs,
  },

  /**
   * Unified read across all scopes
   */
  readAll: (): {
    ccjk: CcjkConfig | null
    claude: ClaudeSettingsType | null
    state: RuntimeState | null
  } => ({
    ccjk: readCcjkConfig(),
    claude: readClaudeConfig(),
    state: readState(),
  }),

  /**
   * Check if initialization is needed
   */
  needsInit: (): boolean => {
    return !readCcjkConfig() && !readClaudeConfig()
  },

  /**
   * Initialize all configuration files with defaults
   */
  init: async (options: { lang?: 'zh-CN' | 'en', force?: boolean } = {}): Promise<void> => {
    const { lang = 'en', force = false } = options

    // Run migrations first if needed
    if (needsMigration()) {
      await runMigrations({ backup: true })
    }

    // Initialize CCJK config if missing or forced
    if (!readCcjkConfig() || force) {
      writeCcjkConfig(createDefaultCcjkConfig(lang))
    }

    // Initialize Claude config if missing or forced
    if (!readClaudeConfig() || force) {
      writeClaudeConfig({})
    }

    // Initialize state if missing or forced
    if (!readState() || force) {
      writeState(createDefaultState())
    }

    // Initialize credentials
    await initializeCredentials()
  },

  /**
   * Validate all configuration files
   */
  validate: (): {
    ccjk: ReturnType<typeof validateCcjkConfig>
    claude: ReturnType<typeof validateClaudeConfig>
    state: ReturnType<typeof validateState>
    valid: boolean
  } => {
    const ccjkValidation = validateCcjkConfig(readCcjkConfig())
    const claudeValidation = validateClaudeConfig(readClaudeConfig())
    const stateValidation = validateState(readState())

    return {
      ccjk: ccjkValidation,
      claude: claudeValidation,
      state: stateValidation,
      valid: ccjkValidation.valid && claudeValidation.valid && stateValidation.valid,
    }
  },
}

/**
 * Default export for convenience
 */
export default config
