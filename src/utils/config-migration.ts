/**
 * Configuration Migration Utility
 * Fixes problematic settings that interfere with Claude Code token retrieval
 */

import type { ClaudeSettings } from '../types/config'
import ansis from 'ansis'
import { SETTINGS_FILE } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { ClaudeCodeConfigManager } from './claude-code-config-manager'
import { backupExistingConfig } from './config'
import { exists } from './fs-operations'
import { readJsonConfig, writeJsonConfig } from './json-config'
import { normalizeAdaptiveModelSettings } from './model-env-helper'

export interface MigrationResult {
  success: boolean
  changes: string[]
  backupPath: string | null
  errors: string[]
}

/**
 * Migrate settings.json to fix token retrieval issues
 *
 * Fixes:
 * 1. Removes CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC (breaks token retrieval)
 * 2. Reduces excessive MCP_TIMEOUT values (> 20000ms)
 *
 * @returns Migration result with changes made
 */
export function migrateSettingsForTokenRetrieval(): MigrationResult {
  ensureI18nInitialized()

  const result: MigrationResult = {
    success: false,
    changes: [],
    backupPath: null,
    errors: [],
  }

  try {
    // Check if settings file exists
    if (!exists(SETTINGS_FILE)) {
      result.errors.push(i18n.t('common:fileNotFound', { file: 'settings.json' }))
      return result
    }

    // Read current settings
    const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    if (!settings) {
      result.errors.push(i18n.t('common:failedToReadFile', { file: 'settings.json' }))
      return result
    }

    let modified = false
    const hadDefaultModelSentinel = (settings as any).model === 'default'
    const hadEmptyModelEnv = Boolean(settings.env && [
      settings.env.ANTHROPIC_MODEL,
      settings.env.ANTHROPIC_SMALL_FAST_MODEL,
      settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
      settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL,
      settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    ].some(value => typeof value === 'string' && value.trim() === ''))

    normalizeAdaptiveModelSettings(settings)

    if (hadDefaultModelSentinel) {
      result.changes.push('Removed stale settings.model = "default" sentinel so Claude Code falls back to native auto-selection')
      modified = true
    }

    if (hadEmptyModelEnv) {
      result.changes.push('Removed empty model environment variables left by the template/config merge path')
      modified = true
    }

    // Check for problematic environment variables
    if (settings.env) {
      // Issue 1: Remove CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
      if ('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC' in settings.env) {
        delete settings.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
        result.changes.push('Removed CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC (was blocking token retrieval)')
        modified = true
      }

      // Issue 2: Fix excessive MCP_TIMEOUT
      if (settings.env.MCP_TIMEOUT) {
        const timeout = Number.parseInt(settings.env.MCP_TIMEOUT as string, 10)
        if (!Number.isNaN(timeout) && timeout > 20000) {
          const oldValue = settings.env.MCP_TIMEOUT
          settings.env.MCP_TIMEOUT = '15000'
          result.changes.push(`Reduced MCP_TIMEOUT from ${oldValue}ms to 15000ms (was causing slow failures)`)
          modified = true
        }
      }

      if (settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL && !settings.env.ANTHROPIC_SMALL_FAST_MODEL) {
        settings.env.ANTHROPIC_SMALL_FAST_MODEL = settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL
        result.changes.push('Restored ANTHROPIC_SMALL_FAST_MODEL from defaultHaikuModel so Claude Code can auto-route lightweight requests again')
        modified = true
      }
    }

    if (settings.model && (
      settings.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL
      || settings.env?.ANTHROPIC_DEFAULT_SONNET_MODEL
      || settings.env?.ANTHROPIC_DEFAULT_OPUS_MODEL
    )) {
      delete settings.model
      result.changes.push('Removed stale settings.model override because adaptive default model variants are configured')
      modified = true
    }

    const profileConfig = ClaudeCodeConfigManager.readConfig()
    if (profileConfig) {
      const hasAdaptiveProfiles = Object.entries(profileConfig.profiles).some(([_profileId, profile]) =>
        Boolean(profile.primaryModel || profile.defaultHaikuModel || profile.defaultSonnetModel || profile.defaultOpusModel),
      )

      if (hasAdaptiveProfiles) {
        result.changes.push('Preserved profile-level primaryModel values; migration now keeps primary routing and restores fast-model compatibility instead of deleting them')
      }
    }

    // If no changes needed, return success
    if (!modified) {
      result.success = true
      return result
    }

    // Create backup before modifying
    const backupPath = backupExistingConfig()
    if (backupPath) {
      result.backupPath = backupPath
    }
    else {
      result.errors.push('Failed to create backup (continuing anyway)')
    }

    // Write updated settings
    writeJsonConfig(SETTINGS_FILE, settings)
    result.success = true

    return result
  }
  catch (error) {
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`)
    return result
  }
}

/**
 * Check if migration is needed
 * @returns true if problematic settings detected
 */
export function needsMigration(): boolean {
  try {
    if (!exists(SETTINGS_FILE)) {
      return false
    }

    const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    if (!settings || !settings.env) {
      return false
    }

    // Check for problematic settings
    const hasProblematicVar = 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC' in settings.env
    const hasExcessiveTimeout = settings.env.MCP_TIMEOUT
      && Number.parseInt(settings.env.MCP_TIMEOUT as string, 10) > 20000
    const hasAdaptiveModelDefaults = Boolean(
      settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL
      || settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL
      || settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    )
    const isMissingFastModelCompat = Boolean(
      settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL && !settings.env.ANTHROPIC_SMALL_FAST_MODEL,
    )
    const hasPinnedAdaptiveOverride = Boolean(settings.model && hasAdaptiveModelDefaults)

    const hasProfilePinnedAdaptiveOverride = false

    return Boolean(hasProblematicVar || hasExcessiveTimeout || hasPinnedAdaptiveOverride || hasProfilePinnedAdaptiveOverride || isMissingFastModelCompat)
  }
  catch {
    return false
  }
}

/**
 * Display migration result to user
 */
export function displayMigrationResult(result: MigrationResult): void {
  ensureI18nInitialized()

  if (result.success) {
    if (result.changes.length > 0) {
      console.log(ansis.green(`\n✅ ${i18n.t('common:configurationFixed')}\n`))

      console.log(ansis.bold('Changes made:'))
      for (const change of result.changes) {
        console.log(ansis.gray(`  • ${change}`))
      }

      if (result.backupPath) {
        console.log(ansis.gray(`\n📦 Backup created: ${result.backupPath}`))
      }

      console.log(ansis.yellow('\n⚠️  Please restart Claude Code CLI for changes to take effect.\n'))
    }
    else {
      console.log(ansis.green(`\n✅ ${i18n.t('common:noMigrationNeeded')}\n`))
    }
  }
  else {
    console.log(ansis.red(`\n❌ ${i18n.t('common:migrationFailed')}\n`))

    if (result.errors.length > 0) {
      console.log(ansis.bold('Errors:'))
      for (const error of result.errors) {
        console.log(ansis.red(`  • ${error}`))
      }
    }

    if (result.backupPath) {
      console.log(ansis.gray(`\n📦 Backup available at: ${result.backupPath}`))
      console.log(ansis.gray('You can restore with: cp <backup-path>/settings.json ~/.claude/settings.json\n'))
    }
  }
}

/**
 * Interactive migration prompt
 * @returns true if user wants to migrate
 */
export async function promptMigration(): Promise<boolean> {
  ensureI18nInitialized()

  const inquirer = await import('inquirer')

  console.log(ansis.yellow('\n⚠️  Problematic configuration detected!\n'))
  console.log(ansis.gray('Your settings.json contains configurations that prevent Claude Code'))
  console.log(ansis.gray('from retrieving token counts, causing /compact failures.\n'))

  const { shouldMigrate } = await inquirer.default.prompt<{ shouldMigrate: boolean }>({
    type: 'confirm',
    name: 'shouldMigrate',
    message: 'Would you like to fix these issues automatically? (backup will be created)',
    default: true,
  })

  return shouldMigrate
}

/**
 * Get list of problematic settings
 */
export function getProblematicSettings(): string[] {
  const problems: string[] = []

  try {
    if (!exists(SETTINGS_FILE)) {
      return problems
    }

    const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    if (!settings || !settings.env) {
      return problems
    }

    if ('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC' in settings.env) {
      problems.push('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: Blocks token retrieval API calls')
    }

    if (settings.env.MCP_TIMEOUT) {
      const timeout = Number.parseInt(settings.env.MCP_TIMEOUT as string, 10)
      if (!Number.isNaN(timeout) && timeout > 20000) {
        problems.push(`MCP_TIMEOUT: ${timeout}ms is too high (recommended: 10000-15000ms)`)
      }
    }
  }
  catch {
    // Ignore errors
  }

  return problems
}
