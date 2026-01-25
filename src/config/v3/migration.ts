/**
 * Configuration Manager V3 - Migration System
 *
 * Handles automatic migration from older configuration versions
 */

import type { CcjkConfig } from '../unified/types'
import type { ConfigV3, MigrationResult } from './types'

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import dayjs from 'dayjs'
import { join } from 'pathe'
import { parse } from 'smol-toml'
import { CCJK_CONFIG_DIR, CCJK_CONFIG_FILE, CLAUDE_DIR, DEFAULT_CODE_TOOL_TYPE } from '../../constants'
import { copyFile, ensureDir, readFile, writeFileAtomic } from '../../utils/fs-operations'
import { readJsonConfig } from '../../utils/json-config'

// ============================================================================
// Migration Types
// ============================================================================

/**
 * Migration function signature
 */
type MigrationFn = (config: unknown) => ConfigV3

/**
 * Migration definition
 */
interface Migration {
  fromVersion: string
  toVersion: string
  description: string
  migrate: MigrationFn
}

/**
 * Legacy config detection result
 */
interface LegacyConfigInfo {
  type: 'v1-json' | 'v2-toml' | 'unified' | 'unknown'
  path: string
  version?: string
}

// ============================================================================
// Version Constants
// ============================================================================

const CURRENT_VERSION = '3.0.0'

const LEGACY_CONFIG_PATHS = [
  join(CLAUDE_DIR, '.zcf-config.json'),
  join(homedir(), '.zcf.json'),
  join(homedir(), '.ufomiao', 'zcf', 'config.toml'),
  CCJK_CONFIG_FILE,
]

// ============================================================================
// Migration Definitions
// ============================================================================

/**
 * Registered migrations
 */
const MIGRATIONS: Migration[] = [
  {
    fromVersion: '1.x',
    toVersion: '3.0.0',
    description: 'Migrate from legacy JSON config to V3',
    migrate: migrateFromV1,
  },
  {
    fromVersion: '2.x',
    toVersion: '3.0.0',
    description: 'Migrate from TOML config to V3',
    migrate: migrateFromV2,
  },
  {
    fromVersion: '4.x',
    toVersion: '3.0.0',
    description: 'Migrate from unified config to V3',
    migrate: migrateFromUnified,
  },
]

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Migrate from V1 JSON config
 */
function migrateFromV1(config: unknown): ConfigV3 {
  const legacy = config as Record<string, unknown>

  return createDefaultConfigV3({
    general: {
      preferredLang: (legacy.preferredLang as 'zh-CN' | 'en') || 'en',
      templateLang: legacy.templateLang as 'zh-CN' | 'en',
      aiOutputLang: legacy.aiOutputLang as string,
      currentTool: (legacy.codeToolType as any) || DEFAULT_CODE_TOOL_TYPE,
    },
    tools: {
      claudeCode: {
        enabled: true,
        outputStyles: (legacy.outputStyles as string[]) || [],
        defaultOutputStyle: legacy.defaultOutputStyle as string,
        currentProfile: (legacy.currentProfileId as string) || '',
        profiles: {},
      },
      codex: {
        enabled: legacy.codeToolType === 'codex',
        systemPromptStyle: (legacy.systemPromptStyle as string) || 'senior-architect',
      },
    },
  })
}

/**
 * Migrate from V2 TOML config
 */
function migrateFromV2(config: unknown): ConfigV3 {
  const legacy = config as Record<string, unknown>
  const general = legacy.general as Record<string, unknown> || {}
  const claudeCode = legacy.claudeCode as Record<string, unknown> || {}
  const codex = legacy.codex as Record<string, unknown> || {}

  return createDefaultConfigV3({
    general: {
      preferredLang: (general.preferredLang as 'zh-CN' | 'en') || 'en',
      templateLang: general.templateLang as 'zh-CN' | 'en',
      aiOutputLang: general.aiOutputLang as string,
      currentTool: (general.currentTool as any) || DEFAULT_CODE_TOOL_TYPE,
    },
    tools: {
      claudeCode: {
        enabled: claudeCode.enabled !== false,
        installType: (claudeCode.installType as 'global' | 'local') || 'global',
        outputStyles: (claudeCode.outputStyles as string[]) || [],
        defaultOutputStyle: claudeCode.defaultOutputStyle as string,
        currentProfile: (claudeCode.currentProfile as string) || '',
        profiles: (claudeCode.profiles as Record<string, any>) || {},
        version: claudeCode.version as string,
      },
      codex: {
        enabled: codex.enabled === true,
        systemPromptStyle: (codex.systemPromptStyle as string) || 'senior-architect',
      },
    },
  })
}

/**
 * Migrate from unified config (v4.x)
 */
function migrateFromUnified(config: unknown): ConfigV3 {
  const unified = config as CcjkConfig

  return createDefaultConfigV3({
    general: {
      preferredLang: unified.general?.preferredLang || 'en',
      templateLang: unified.general?.templateLang,
      aiOutputLang: unified.general?.aiOutputLang as string,
      currentTool: unified.general?.currentTool || DEFAULT_CODE_TOOL_TYPE,
    },
    tools: {
      claudeCode: {
        enabled: unified.tools?.claudeCode?.enabled !== false,
        installType: unified.tools?.claudeCode?.installType || 'global',
        outputStyles: unified.tools?.claudeCode?.outputStyles || [],
        defaultOutputStyle: unified.tools?.claudeCode?.defaultOutputStyle,
        currentProfile: unified.tools?.claudeCode?.currentProfile || '',
        profiles: transformProfiles(unified.tools?.claudeCode?.profiles || {}),
        version: unified.tools?.claudeCode?.version,
      },
      codex: {
        enabled: unified.tools?.codex?.enabled === true,
        systemPromptStyle: unified.tools?.codex?.systemPromptStyle || 'senior-architect',
      },
    },
  })
}

/**
 * Transform profiles to V3 format
 */
function transformProfiles(profiles: Record<string, unknown>): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(profiles)) {
    if (typeof value === 'object' && value !== null) {
      result[key] = {
        name: key,
        settings: value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }
  }

  return result
}

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Detect legacy configuration files
 */
export function detectLegacyConfig(): LegacyConfigInfo | null {
  for (const path of LEGACY_CONFIG_PATHS) {
    if (!existsSync(path)) {
      continue
    }

    try {
      if (path.endsWith('.json')) {
        const content = readJsonConfig<Record<string, unknown>>(path)
        if (content) {
          // Check for V1 JSON format
          if ('preferredLang' in content || 'codeToolType' in content) {
            return { type: 'v1-json', path, version: '1.x' }
          }
        }
      }
      else if (path.endsWith('.toml')) {
        const content = readFile(path)
        const parsed = parse(content) as Record<string, unknown>

        // Check version field
        const version = parsed.version as string

        if (version?.startsWith('4.')) {
          return { type: 'unified', path, version }
        }
        else if (parsed.general || parsed.claudeCode) {
          return { type: 'v2-toml', path, version: version || '2.x' }
        }
      }
    }
    catch {
      // Continue to next path
    }
  }

  return null
}

/**
 * Check if migration is needed
 */
export function needsMigration(): boolean {
  const legacy = detectLegacyConfig()
  if (!legacy) {
    return false
  }

  // Check if V3 config already exists
  const v3ConfigPath = join(CCJK_CONFIG_DIR, 'config.v3.json')
  if (existsSync(v3ConfigPath)) {
    try {
      const v3Config = readJsonConfig<ConfigV3>(v3ConfigPath)
      if (v3Config?.$version === CURRENT_VERSION) {
        return false
      }
    }
    catch {
      // V3 config is corrupted, need migration
    }
  }

  return true
}

// ============================================================================
// Backup Functions
// ============================================================================

/**
 * Create backup before migration
 */
export function createMigrationBackup(): string | null {
  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const backupDir = join(CCJK_CONFIG_DIR, 'backups', `migration_${timestamp}`)

  try {
    ensureDir(backupDir)

    const backedUp: string[] = []

    for (const path of LEGACY_CONFIG_PATHS) {
      if (existsSync(path)) {
        const filename = path.split('/').pop() || 'config'
        const backupPath = join(backupDir, filename)
        copyFile(path, backupPath)
        backedUp.push(path)
      }
    }

    return backedUp.length > 0 ? backupDir : null
  }
  catch (error) {
    console.error('Failed to create migration backup:', error)
    return null
  }
}

// ============================================================================
// Migration Execution
// ============================================================================

/**
 * Run configuration migration
 */
export function runMigration(options: {
  backup?: boolean
  dryRun?: boolean
  force?: boolean
} = {}): MigrationResult {
  const { backup = true, dryRun = false, force = false } = options

  const errors: string[] = []
  const warnings: string[] = []
  const migratedPaths: string[] = []

  // Detect legacy config
  const legacy = detectLegacyConfig()

  if (!legacy && !force) {
    return {
      success: true,
      fromVersion: 'none',
      toVersion: CURRENT_VERSION,
      migratedPaths: [],
      errors: [],
      warnings: ['No legacy configuration found'],
    }
  }

  // Create backup
  let backupPath: string | undefined
  if (backup && !dryRun) {
    backupPath = createMigrationBackup() || undefined
    if (backupPath) {
      warnings.push(`Backup created at: ${backupPath}`)
    }
  }

  if (!legacy) {
    return {
      success: true,
      fromVersion: 'none',
      toVersion: CURRENT_VERSION,
      migratedPaths: [],
      backupPath,
      errors: [],
      warnings,
    }
  }

  try {
    // Read legacy config
    let legacyConfig: unknown

    if (legacy.path.endsWith('.json')) {
      legacyConfig = readJsonConfig(legacy.path)
    }
    else if (legacy.path.endsWith('.toml')) {
      const content = readFile(legacy.path)
      legacyConfig = parse(content)
    }

    if (!legacyConfig) {
      errors.push(`Failed to read legacy config from ${legacy.path}`)
      return {
        success: false,
        fromVersion: legacy.version || 'unknown',
        toVersion: CURRENT_VERSION,
        migratedPaths: [],
        backupPath,
        errors,
        warnings,
      }
    }

    // Find appropriate migration
    const migration = MIGRATIONS.find(m =>
      legacy.version?.startsWith(m.fromVersion.replace('.x', ''))
      || legacy.type === 'v1-json' && m.fromVersion === '1.x'
      || legacy.type === 'v2-toml' && m.fromVersion === '2.x'
      || legacy.type === 'unified' && m.fromVersion === '4.x',
    )

    if (!migration) {
      errors.push(`No migration path found for version ${legacy.version}`)
      return {
        success: false,
        fromVersion: legacy.version || 'unknown',
        toVersion: CURRENT_VERSION,
        migratedPaths: [],
        backupPath,
        errors,
        warnings,
      }
    }

    // Run migration
    const migratedConfig = migration.migrate(legacyConfig)
    migratedPaths.push(legacy.path)

    // Write V3 config
    if (!dryRun) {
      const v3ConfigPath = join(CCJK_CONFIG_DIR, 'config.v3.json')
      ensureDir(CCJK_CONFIG_DIR)
      writeFileAtomic(v3ConfigPath, JSON.stringify(migratedConfig, null, 2))
      migratedPaths.push(v3ConfigPath)
    }

    warnings.push(`Migrated from ${legacy.type} (${legacy.version}) to V3`)

    return {
      success: true,
      fromVersion: legacy.version || 'unknown',
      toVersion: CURRENT_VERSION,
      migratedPaths,
      backupPath,
      errors,
      warnings,
    }
  }
  catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
    return {
      success: false,
      fromVersion: legacy.version || 'unknown',
      toVersion: CURRENT_VERSION,
      migratedPaths,
      backupPath,
      errors,
      warnings,
    }
  }
}

// ============================================================================
// Default Config Factory
// ============================================================================

/**
 * Create default V3 configuration with optional overrides
 */
export function createDefaultConfigV3(overrides?: Partial<ConfigV3>): ConfigV3 {
  const now = new Date().toISOString()

  const defaults: ConfigV3 = {
    $version: CURRENT_VERSION,
    $environment: 'prod',
    $lastUpdated: now,

    general: {
      preferredLang: 'en',
      currentTool: DEFAULT_CODE_TOOL_TYPE,
      theme: 'auto',
    },

    tools: {
      claudeCode: {
        enabled: true,
        installType: 'global',
        outputStyles: ['speed-coder', 'senior-architect', 'pair-programmer'],
        defaultOutputStyle: 'senior-architect',
        currentProfile: '',
        profiles: {},
      },
      codex: {
        enabled: false,
        systemPromptStyle: 'senior-architect',
      },
    },

    api: {
      anthropic: {
        baseUrl: 'https://api.anthropic.com',
        timeout: 30000,
        retries: 3,
      },
    },

    features: {
      hotReload: true,
      autoMigration: true,
      telemetry: false,
      experimentalFeatures: [],
    },
  }

  // Deep merge overrides
  if (overrides) {
    return deepMerge(defaults, overrides) as ConfigV3
  }

  return defaults
}

/**
 * Deep merge utility
 */
function deepMerge(target: unknown, source: unknown): unknown {
  if (source === undefined) {
    return target
  }

  if (typeof source !== 'object' || source === null) {
    return source
  }

  if (Array.isArray(source)) {
    return source
  }

  if (typeof target !== 'object' || target === null) {
    return source
  }

  const result: Record<string, unknown> = { ...target as Record<string, unknown> }

  for (const key of Object.keys(source as Record<string, unknown>)) {
    result[key] = deepMerge(
      (target as Record<string, unknown>)[key],
      (source as Record<string, unknown>)[key],
    )
  }

  return result
}

/**
 * Get migration status
 */
export function getMigrationStatus(): {
  needsMigration: boolean
  legacyConfig: LegacyConfigInfo | null
  currentVersion: string
} {
  const legacy = detectLegacyConfig()

  return {
    needsMigration: needsMigration(),
    legacyConfig: legacy,
    currentVersion: CURRENT_VERSION,
  }
}
