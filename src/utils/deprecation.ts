/**
 * Deprecation Warning System
 *
 * Provides deprecation warnings for commands and features that will be removed
 */

import ansis from 'ansis'
import { getTranslation } from '../i18n'

/**
 * Deprecation warning information
 */
export interface DeprecationWarning {
  /** Command or feature name */
  command: string
  /** Version where deprecated */
  deprecatedIn: string
  /** Version where will be removed */
  removedIn: string
  /** Suggested replacement */
  replacement: string
  /** Reason for deprecation */
  reason: string
}

/**
 * All deprecated commands and their information
 */
export const DEPRECATED_COMMANDS: Record<string, DeprecationWarning> = {
  'daemon': {
    command: 'daemon',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'session',
    reason: 'Remote control feature is over-engineered for a CLI tool',
  },
  'claude-wrapper': {
    command: 'claude-wrapper',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'init',
    reason: 'Transparent wrapper has low usage',
  },
  'claude-md': {
    command: 'claude-md',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'init',
    reason: 'CLAUDE.md generation is now part of init',
  },
  'rename': {
    command: 'rename',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'Use file system directly',
    reason: 'Unclear use case and low usage',
  },
  'subagent-workflow': {
    command: 'subagent-workflow',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'Use agent command',
    reason: 'Complex workflow with unclear value',
  },
  'team': {
    command: 'team',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'Use session management',
    reason: 'Collaboration features are unused',
  },
  'plugin': {
    command: 'plugin',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'Use cloud services',
    reason: 'Replaced by cloud-based plugin system',
  },
  'lsp': {
    command: 'lsp',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'Use IDE built-in LSP',
    reason: 'LSP management has low usage',
  },
  'background': {
    command: 'background',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'session',
    reason: 'Background execution merged into session management',
  },
  'session-resume': {
    command: 'session-resume',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'ccjk session restore',
    reason: 'Consolidated into session command',
  },
  'mcp-doctor': {
    command: 'mcp-doctor',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'ccjk mcp doctor',
    reason: 'Use subcommand instead',
  },
  'mcp-profile': {
    command: 'mcp-profile',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'ccjk mcp profile',
    reason: 'Use subcommand instead',
  },
  'mcp-market': {
    command: 'mcp-market',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'ccjk mcp search',
    reason: 'Use subcommand instead',
  },
  'mcp-search': {
    command: 'mcp-search',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'ccjk mcp search',
    reason: 'Use subcommand instead',
  },
  'skills-sync': {
    command: 'skills-sync',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'ccjk skills sync',
    reason: 'Use subcommand instead',
  },
  'agents-sync': {
    command: 'agents-sync',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'cc cloud sync',
    reason: 'Replaced by cloud sync',
  },
  'marketplace': {
    command: 'marketplace',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'ccjk cloud',
    reason: 'Replaced by cloud services',
  },
  'cloud-plugins': {
    command: 'cloud-plugins',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'ccjk cloud',
    reason: 'Consolidated into cloud command',
  },
  'hooks-sync': {
    command: 'hooks-sync',
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'ccjk cloud hooks',
    reason: 'Consolidated into cloud command',
  },
}

/**
 * Check if a command is deprecated
 */
export function isDeprecated(command: string): boolean {
  return command in DEPRECATED_COMMANDS
}

/**
 * Get deprecation information for a command
 */
export function getDeprecationInfo(command: string): DeprecationWarning | null {
  return DEPRECATED_COMMANDS[command] || null
}

/**
 * Show deprecation warning for a command
 */
export function showDeprecationWarning(command: string): void {
  const info = getDeprecationInfo(command)
  if (!info)
    return

  const t = getTranslation()

  // Warning header
  console.warn(ansis.yellow.bold(`⚠️  ${t('deprecation.warning')}`))
  console.warn()

  // Command info
  console.warn(ansis.yellow(`   ${t('deprecation.command')}: ${ansis.bold(info.command)}`))
  console.warn(ansis.dim(`   ${t('deprecation.deprecatedIn')}: ${info.deprecatedIn}`))
  console.warn(ansis.dim(`   ${t('deprecation.removedIn')}: ${ansis.red.bold(info.removedIn)}`))
  console.warn()

  // Replacement
  if (info.replacement) {
    console.warn(ansis.green(`   ${t('deprecation.replacement')}: ${ansis.bold(info.replacement)}`))
    console.warn()
  }

  // Reason
  if (info.reason) {
    console.warn(ansis.dim(`   ${t('deprecation.reason')}: ${info.reason}`))
    console.warn()
  }

  // Footer
  console.warn(ansis.dim(`   ───────────────────────────────────────────`))
  console.warn()
}

/**
 * Log deprecated command usage (for telemetry, optional)
 */
export function logDeprecatedUsage(command: string): void {
  // TODO: Add telemetry logging if user has opted in
  // For now, just log to console in debug mode
  if (process.env.CCJK_DEBUG) {
    console.debug(`[Deprecated] Command used: ${command}`)
  }
}

/**
 * Get all deprecated commands
 */
export function getAllDeprecated(): DeprecationWarning[] {
  return Object.values(DEPRECATED_COMMANDS)
}

/**
 * Get commands that will be removed in a specific version
 */
export function getCommandsRemovedIn(version: string): DeprecationWarning[] {
  return getAllDeprecated().filter(d => d.removedIn === version)
}
