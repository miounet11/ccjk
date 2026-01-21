/**
 * Command Registry Types
 */

import type { CliCommand } from 'cac'

/**
 * Command category for organization
 */
export type CommandCategory = 'core' | 'config' | 'tools' | 'advanced' | 'deprecated'

/**
 * Command execution options
 */
export interface CommandExecuteOptions {
  /** Raw command line arguments */
  args?: string[]
  /** Environment variables */
  env?: Record<string, string>
}

/**
 * Command registration options
 */
export interface CommandRegistrationOptions {
  /** Whether to show in help */
  showInHelp?: boolean
  /** Whether command requires confirmation */
  requireConfirmation?: boolean
}

/**
 * Command result
 */
export type CommandResult = void | Promise<void>

/**
 * Lazy command import result
 */
export interface LazyCommandModule {
  default?: () => CommandResult
  handler?: () => CommandResult
}
