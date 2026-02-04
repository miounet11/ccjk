/**
 * Configuration Migrators
 *
 * Migration scripts for converting legacy config formats to the new unified system
 */

import type { ClaudeSettings } from '../../../types/config'
import type { ZcfTomlConfig } from '../../../types/toml-config'
import type { CcjkConfig, ConfigScope } from '../types'
import type { LegacyConfig, MigrationOptions, MigrationResult, MigrationStep } from './types'

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import dayjs from 'dayjs'
import { join } from 'pathe'
import { parse } from 'smol-toml'
import {
  CCJK_CONFIG_FILE,
  CLAUDE_DIR,
  LEGACY_ZCF_CONFIG_FILES,
  SETTINGS_FILE,
} from '../../../constants'
import { copyFile, ensureDir, readFile } from '../../../utils/fs-operations'
import { readJsonConfig } from '../../../utils/json-config'
import { writeCcjkConfig } from '../ccjk-config'
import { writeClaudeConfig } from '../claude-config'
import { createDefaultState, STATE_FILE, writeState } from '../state-manager'

/**
 * Detect legacy configuration files
 */
export function detectLegacyConfigs(): LegacyConfig[] {
  const legacy: LegacyConfig[] = []

  // Check for legacy ZCF JSON configs
  for (const path of LEGACY_ZCF_CONFIG_FILES) {
    if (existsSync(path)) {
      legacy.push({
        type: path.endsWith('.json') ? 'zcf-json' : 'zcf-toml',
        path,
      })
    }
  }

  // Check for legacy Claude settings in different locations
  const legacyClaudePaths = [
    join(homedir(), '.claude', 'config.json'),
    join(homedir(), '.claude.json'),
  ]
  for (const path of legacyClaudePaths) {
    if (existsSync(path)) {
      legacy.push({
        type: 'claude-settings',
        path,
      })
    }
  }

  return legacy
}

/**
 * Create backup before migration
 */
export function createMigrationBackup(scopes: ConfigScope[]): string | null {
  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const backupDir = join(CLAUDE_DIR, 'backup', `migration_${timestamp}`)

  try {
    ensureDir(backupDir)

    const backups: string[] = []

    if (scopes.includes('ccjk') || scopes.includes('all')) {
      if (existsSync(CCJK_CONFIG_FILE)) {
        const backupPath = join(backupDir, 'config.toml')
        copyFile(CCJK_CONFIG_FILE, backupPath)
        backups.push(backupPath)
      }
    }

    if (scopes.includes('claude') || scopes.includes('all')) {
      if (existsSync(SETTINGS_FILE)) {
        const backupPath = join(backupDir, 'settings.json')
        copyFile(SETTINGS_FILE, backupPath)
        backups.push(backupPath)
      }
    }

    if (scopes.includes('state') || scopes.includes('all')) {
      if (existsSync(STATE_FILE)) {
        const backupPath = join(backupDir, 'state.json')
        copyFile(STATE_FILE, backupPath)
        backups.push(backupPath)
      }
    }

    return backups.length > 0 ? backupDir : null
  }
  catch (error) {
    console.error('Failed to create migration backup:', error)
    return null
  }
}

/**
 * Migrate legacy ZCF JSON config to new CCJK TOML format
 */
export async function migrateZcfJsonToCcjk(
  legacyPath: string,
  options: MigrationOptions = {},
): Promise<MigrationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Read legacy config
    const legacyData = readJsonConfig<any>(legacyPath)
    if (!legacyData) {
      return {
        success: false,
        migratedScopes: [],
        errors: ['Failed to read legacy ZCF config'],
        warnings,
      }
    }

    // Create new config from legacy data
    const newConfig: CcjkConfig = {
      version: '4.0.0',
      lastUpdated: new Date().toISOString(),
      general: {
        preferredLang: legacyData.preferredLang || 'en',
        templateLang: legacyData.templateLang,
        aiOutputLang: legacyData.aiOutputLang,
        currentTool: legacyData.codeToolType || 'claude-code',
      },
      tools: {
        claudeCode: {
          enabled: true,
          installType: legacyData.claudeCodeInstallation?.type || 'global',
          outputStyles: legacyData.outputStyles || [],
          defaultOutputStyle: legacyData.defaultOutputStyle,
          currentProfile: legacyData.currentProfileId || '',
          profiles: legacyData.claudeCode?.profiles || {},
        },
        codex: {
          enabled: legacyData.codeToolType === 'codex',
          systemPromptStyle: legacyData.systemPromptStyle || 'senior-architect',
        },
      },
    }

    // Write new config
    if (!options.dryRun) {
      writeCcjkConfig(newConfig)
    }

    warnings.push(`Migrated ZCF config from ${legacyPath}`)

    return {
      success: true,
      migratedScopes: ['ccjk'],
      errors,
      warnings,
    }
  }
  catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
    return {
      success: false,
      migratedScopes: [],
      errors,
      warnings,
    }
  }
}

/**
 * Migrate ZCF TOML config to new CCJK format
 */
export async function migrateZcfTomlToCcjk(
  legacyPath: string,
  options: MigrationOptions = {},
): Promise<MigrationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Read legacy TOML config
    const content = readFile(legacyPath)
    const legacyData = parse(content) as unknown as ZcfTomlConfig

    if (!legacyData) {
      return {
        success: false,
        migratedScopes: [],
        errors: ['Failed to parse legacy ZCF TOML config'],
        warnings,
      }
    }

    // Create new config from legacy TOML data
    const newConfig: CcjkConfig = {
      version: '4.0.0',
      lastUpdated: new Date().toISOString(),
      general: {
        preferredLang: legacyData.general?.preferredLang || 'en',
        templateLang: legacyData.general?.templateLang,
        aiOutputLang: legacyData.general?.aiOutputLang,
        currentTool: legacyData.general?.currentTool || 'claude-code',
      },
      tools: {
        claudeCode: {
          enabled: legacyData.claudeCode?.enabled ?? true,
          installType: legacyData.claudeCode?.installType || 'global',
          installMethod: legacyData.claudeCode?.installMethod,
          outputStyles: legacyData.claudeCode?.outputStyles || [],
          defaultOutputStyle: legacyData.claudeCode?.defaultOutputStyle,
          currentProfile: legacyData.claudeCode?.currentProfile || '',
          profiles: (legacyData.claudeCode?.profiles || {}) as Record<string, any>,
          version: legacyData.claudeCode?.version,
        },
        codex: {
          enabled: legacyData.codex?.enabled ?? false,
          systemPromptStyle: legacyData.codex?.systemPromptStyle || 'senior-architect',
          installMethod: legacyData.codex?.installMethod,
          envKeyMigrated: legacyData.codex?.envKeyMigrated,
        },
      },
    }

    // Write new config
    if (!options.dryRun) {
      writeCcjkConfig(newConfig)
    }

    warnings.push(`Migrated ZCF TOML config from ${legacyPath}`)

    return {
      success: true,
      migratedScopes: ['ccjk'],
      errors,
      warnings,
    }
  }
  catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
    return {
      success: false,
      migratedScopes: [],
      errors,
      warnings,
    }
  }
}

/**
 * Migrate Claude settings.json
 */
export async function migrateClaudeSettings(
  legacyPath: string,
  options: MigrationOptions = {},
): Promise<MigrationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Read legacy settings
    const legacyData = readJsonConfig<ClaudeSettings>(legacyPath)
    if (!legacyData) {
      return {
        success: false,
        migratedScopes: [],
        errors: ['Failed to read legacy Claude settings'],
        warnings,
      }
    }

    // Copy settings to new location
    if (!options.dryRun) {
      writeClaudeConfig(legacyData)
    }

    warnings.push(`Migrated Claude settings from ${legacyPath}`)

    return {
      success: true,
      migratedScopes: ['claude'],
      errors,
      warnings,
    }
  }
  catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
    return {
      success: false,
      migratedScopes: [],
      errors,
      warnings,
    }
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(
  options: MigrationOptions = {},
): Promise<MigrationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const migratedScopes: ConfigScope[] = []

  // Detect legacy configs
  const legacyConfigs = detectLegacyConfigs()

  if (legacyConfigs.length === 0) {
    warnings.push('No legacy configurations detected')
    return {
      success: true,
      migratedScopes: [],
      errors: [],
      warnings,
    }
  }

  // Create backup
  const backupPath = options.backup !== false
    ? createMigrationBackup(['ccjk', 'claude', 'state']) ?? undefined
    : undefined

  // Run migrations for each legacy config
  for (const legacy of legacyConfigs) {
    let result: MigrationResult

    switch (legacy.type) {
      case 'zcf-json':
        result = await migrateZcfJsonToCcjk(legacy.path, options)
        break
      case 'zcf-toml':
        result = await migrateZcfTomlToCcjk(legacy.path, options)
        break
      case 'claude-settings':
        result = await migrateClaudeSettings(legacy.path, options)
        break
      default:
        continue
    }

    if (result.success) {
      migratedScopes.push(...result.migratedScopes)
      warnings.push(...result.warnings)
    }
    else {
      errors.push(...result.errors)
    }
  }

  // Initialize state if it doesn't exist
  if (!existsSync(STATE_FILE) && !options.dryRun) {
    writeState(createDefaultState())
    migratedScopes.push('state')
  }

  return {
    success: errors.length === 0,
    migratedScopes,
    backupPath: backupPath ?? undefined,
    errors,
    warnings,
  }
}

/**
 * Check if migration is needed
 */
export function needsMigration(): boolean {
  const legacyConfigs = detectLegacyConfigs()
  return legacyConfigs.length > 0
}

/**
 * Get migration status
 */
export function getMigrationStatus(): {
  needsMigration: boolean
  legacyConfigs: LegacyConfig[]
  canMigrate: boolean
} {
  const legacyConfigs = detectLegacyConfigs()
  return {
    needsMigration: legacyConfigs.length > 0,
    legacyConfigs,
    canMigrate: true, // Always can migrate if legacy configs exist
  }
}

/**
 * Clean up legacy config files after successful migration
 */
export function cleanupLegacyConfigs(legacyPaths: string[]): {
  deleted: string[]
  failed: string[]
} {
  const { unlinkSync, existsSync } = require('node:fs')
  const deleted: string[] = []
  const failed: string[] = []

  for (const path of legacyPaths) {
    try {
      if (existsSync(path)) {
        unlinkSync(path)
        deleted.push(path)
      }
    }
    catch {
      failed.push(path)
    }
  }

  return { deleted, failed }
}

/**
 * Migration step definitions
 */
export const MIGRATION_STEPS: MigrationStep[] = [
  {
    name: 'zcf-json-to-ccjk',
    description: 'Migrate legacy ZCF JSON config to new CCJK TOML format',
    version: '4.0.0',
    detect: () => detectLegacyConfigs().some(c => c.type === 'zcf-json'),
    migrate: async () => {
      const zcfJson = detectLegacyConfigs().find(c => c.type === 'zcf-json')
      if (!zcfJson) {
        return { success: true, migratedScopes: [], errors: [], warnings: [] }
      }
      return migrateZcfJsonToCcjk(zcfJson.path)
    },
  },
  {
    name: 'zcf-toml-to-ccjk',
    description: 'Migrate ZCF TOML config to new CCJK format',
    version: '4.0.0',
    detect: () => detectLegacyConfigs().some(c => c.type === 'zcf-toml'),
    migrate: async () => {
      const zcfToml = detectLegacyConfigs().find(c => c.type === 'zcf-toml')
      if (!zcfToml) {
        return { success: true, migratedScopes: [], errors: [], warnings: [] }
      }
      return migrateZcfTomlToCcjk(zcfToml.path)
    },
  },
  {
    name: 'claude-settings-migrate',
    description: 'Ensure Claude settings are in correct location',
    version: '4.0.0',
    detect: () => detectLegacyConfigs().some(c => c.type === 'claude-settings'),
    migrate: async () => {
      const claudeSettings = detectLegacyConfigs().find(c => c.type === 'claude-settings')
      if (!claudeSettings) {
        return { success: true, migratedScopes: [], errors: [], warnings: [] }
      }
      return migrateClaudeSettings(claudeSettings.path)
    },
  },
]
