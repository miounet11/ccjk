/**
 * Configuration Migration Types
 *
 * Type definitions for configuration migration system
 */

import type { ConfigScope } from '../types'

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean
  migratedScopes: ConfigScope[]
  backupPath?: string
  errors: string[]
  warnings: string[]
}

/**
 * Migration options
 */
export interface MigrationOptions {
  backup?: boolean
  dryRun?: boolean
  force?: boolean
  legacyPaths?: string[]
}

/**
 * Legacy configuration format detection
 */
export interface LegacyConfig {
  type: 'zcf-json' | 'zcf-toml' | 'claude-settings' | 'ccjk-state'
  path: string
  version?: string
}

/**
 * Migration step definition
 */
export interface MigrationStep {
  name: string
  description: string
  version: string
  detect: () => boolean | Promise<boolean>
  migrate: () => Promise<MigrationResult>
  rollback?: () => Promise<void>
}

/**
 * Migration state tracking
 */
export interface MigrationState {
  lastMigration: string
  completedSteps: string[]
  pendingSteps: string[]
}
