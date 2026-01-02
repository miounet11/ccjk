import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'pathe'
import ansis from 'ansis'
import dayjs from 'dayjs'
import { CLAUDE_DIR, SETTINGS_FILE, ClAUDE_CONFIG_FILE, CLAUDE_VSC_CONFIG_FILE, CCJK_CONFIG_DIR } from '../constants'
import { STATUS, boxify } from './banner'

/**
 * Config file location
 */
export interface ConfigLocation {
  path: string
  type: 'global' | 'legacy' | 'project' | 'custom'
  exists: boolean
  size?: number
  modifiedAt?: Date
  content?: any
}

/**
 * Config difference
 */
export interface ConfigDiff {
  key: string
  files: string[]
  values: Record<string, any>
  conflicting: boolean
}

/**
 * Consolidated config result
 */
export interface ConsolidatedConfig {
  success: boolean
  config: any
  mergedFrom: string[]
  conflicts: ConfigDiff[]
  backupPaths: string[]
}

/**
 * All possible config locations
 */
const CONFIG_LOCATIONS: Array<{ path: string, type: ConfigLocation['type'] }> = [
  { path: SETTINGS_FILE, type: 'global' },
  { path: ClAUDE_CONFIG_FILE, type: 'legacy' },
  { path: CLAUDE_VSC_CONFIG_FILE, type: 'global' },
  { path: join(homedir(), '.config', 'claude-code', 'settings.json'), type: 'global' },
]

/**
 * Detect all config files
 */
export function detectAllConfigs(projectDir?: string): ConfigLocation[] {
  const locations: ConfigLocation[] = []

  // Check global locations
  for (const loc of CONFIG_LOCATIONS) {
    const exists = existsSync(loc.path)
    const location: ConfigLocation = {
      path: loc.path,
      type: loc.type,
      exists,
    }

    if (exists) {
      try {
        const stat = statSync(loc.path)
        location.size = stat.size
        location.modifiedAt = stat.mtime

        const content = readFileSync(loc.path, 'utf-8')
        location.content = JSON.parse(content)
      }
      catch {
        // File exists but couldn't read
      }
    }

    locations.push(location)
  }

  // Check project-level configs
  if (projectDir) {
    const projectConfigs = [
      join(projectDir, '.claude', 'settings.json'),
      join(projectDir, 'claude.json'),
      join(projectDir, '.claude.json'),
    ]

    for (const path of projectConfigs) {
      const exists = existsSync(path)
      const location: ConfigLocation = {
        path,
        type: 'project',
        exists,
      }

      if (exists) {
        try {
          const stat = statSync(path)
          location.size = stat.size
          location.modifiedAt = stat.mtime

          const content = readFileSync(path, 'utf-8')
          location.content = JSON.parse(content)
        }
        catch {
          // File exists but couldn't read
        }
      }

      locations.push(location)
    }
  }

  // Check custom CLAUDE_CONFIG_PATH
  const customPath = process.env.CLAUDE_CONFIG_PATH
  if (customPath && !locations.some(l => l.path === customPath)) {
    const exists = existsSync(customPath)
    const location: ConfigLocation = {
      path: customPath,
      type: 'custom',
      exists,
    }

    if (exists) {
      try {
        const stat = statSync(customPath)
        location.size = stat.size
        location.modifiedAt = stat.mtime

        const content = readFileSync(customPath, 'utf-8')
        location.content = JSON.parse(content)
      }
      catch {
        // File exists but couldn't read
      }
    }

    locations.push(location)
  }

  return locations
}

/**
 * Compare configs and find differences
 */
export function compareConfigs(configs: ConfigLocation[]): ConfigDiff[] {
  const existingConfigs = configs.filter(c => c.exists && c.content)
  if (existingConfigs.length < 2)
    return []

  const allKeys = new Set<string>()
  const keyValues: Record<string, Record<string, any>> = {}

  // Collect all keys and their values
  for (const config of existingConfigs) {
    if (!config.content)
      continue

    const flattenObject = (obj: any, prefix = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flattenObject(value, fullKey)
        }
        else {
          allKeys.add(fullKey)
          if (!keyValues[fullKey]) {
            keyValues[fullKey] = {}
          }
          keyValues[fullKey][config.path] = value
        }
      }
    }

    flattenObject(config.content)
  }

  // Find conflicts
  const diffs: ConfigDiff[] = []

  for (const key of allKeys) {
    const values = keyValues[key]
    const files = Object.keys(values)

    if (files.length < 2)
      continue

    // Check if values are different
    const uniqueValues = new Set(files.map(f => JSON.stringify(values[f])))
    if (uniqueValues.size > 1) {
      diffs.push({
        key,
        files,
        values,
        conflicting: true,
      })
    }
  }

  return diffs
}

/**
 * Create backup of config file
 */
function backupConfig(path: string): string | null {
  if (!existsSync(path))
    return null

  const backupDir = join(CCJK_CONFIG_DIR, 'backups', dayjs().format('YYYY-MM-DD_HH-mm-ss'))
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true })
  }

  const filename = path.replace(/[\/\\]/g, '_')
  const backupPath = join(backupDir, filename)

  copyFileSync(path, backupPath)
  return backupPath
}

/**
 * Deep merge objects
 */
function deepMerge(target: any, source: any): any {
  const result = { ...target }

  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge(result[key] || {}, value)
    }
    else {
      result[key] = value
    }
  }

  return result
}

/**
 * Consolidate configs into a single file
 */
export function consolidateConfigs(
  configs: ConfigLocation[],
  strategy: 'merge' | 'newest' | 'interactive' = 'merge',
): ConsolidatedConfig {
  const existingConfigs = configs.filter(c => c.exists && c.content)

  if (existingConfigs.length === 0) {
    return {
      success: false,
      config: {},
      mergedFrom: [],
      conflicts: [],
      backupPaths: [],
    }
  }

  if (existingConfigs.length === 1) {
    return {
      success: true,
      config: existingConfigs[0].content,
      mergedFrom: [existingConfigs[0].path],
      conflicts: [],
      backupPaths: [],
    }
  }

  const backupPaths: string[] = []
  let mergedConfig: any = {}

  if (strategy === 'newest') {
    // Sort by modification time, newest first
    existingConfigs.sort((a, b) => {
      const timeA = a.modifiedAt?.getTime() || 0
      const timeB = b.modifiedAt?.getTime() || 0
      return timeB - timeA
    })

    mergedConfig = existingConfigs[0].content
  }
  else {
    // Merge strategy: start from oldest, apply newer on top
    existingConfigs.sort((a, b) => {
      const timeA = a.modifiedAt?.getTime() || 0
      const timeB = b.modifiedAt?.getTime() || 0
      return timeA - timeB
    })

    for (const config of existingConfigs) {
      mergedConfig = deepMerge(mergedConfig, config.content)
    }
  }

  // Create backups
  for (const config of existingConfigs) {
    const backupPath = backupConfig(config.path)
    if (backupPath) {
      backupPaths.push(backupPath)
    }
  }

  // Find remaining conflicts
  const conflicts = compareConfigs(configs)

  return {
    success: true,
    config: mergedConfig,
    mergedFrom: existingConfigs.map(c => c.path),
    conflicts,
    backupPaths,
  }
}

/**
 * Write consolidated config to primary location
 */
export function writeConsolidatedConfig(config: any): boolean {
  try {
    // Ensure directory exists
    if (!existsSync(CLAUDE_DIR)) {
      mkdirSync(CLAUDE_DIR, { recursive: true })
    }

    writeFileSync(SETTINGS_FILE, JSON.stringify(config, null, 2))
    return true
  }
  catch {
    return false
  }
}

/**
 * Remove redundant config files (after consolidation)
 */
export function removeRedundantConfigs(configs: ConfigLocation[], keepPath: string = SETTINGS_FILE): string[] {
  const removed: string[] = []

  for (const config of configs) {
    if (config.exists && config.path !== keepPath && config.type === 'legacy') {
      try {
        // Just rename to .bak instead of deleting
        const bakPath = `${config.path}.bak`
        if (existsSync(config.path)) {
          copyFileSync(config.path, bakPath)
          const fs = require('node:fs')
          fs.unlinkSync(config.path)
          removed.push(config.path)
        }
      }
      catch {
        // Skip if can't remove
      }
    }
  }

  return removed
}

/**
 * Display config scan results
 */
export function displayConfigScan(configs: ConfigLocation[]): void {
  const existingConfigs = configs.filter(c => c.exists)

  console.log(ansis.cyan('\n═══════════ Config Files Detected ═══════════\n'))

  if (existingConfigs.length === 0) {
    console.log(STATUS.info('No config files found'))
    return
  }

  for (const config of configs) {
    if (!config.exists) {
      console.log(STATUS.pending(`${config.path} (not found)`))
      continue
    }

    const sizeKB = config.size ? (config.size / 1024).toFixed(1) : '?'
    const modified = config.modifiedAt ? dayjs(config.modifiedAt).format('YYYY-MM-DD HH:mm') : 'unknown'
    const typeLabel = config.type === 'global' ? 'primary' : config.type

    if (config.type === 'global' && config.path === SETTINGS_FILE) {
      console.log(STATUS.success(`${config.path}`))
      console.log(ansis.gray(`     (${typeLabel}, ${sizeKB}KB, modified ${modified})`))
    }
    else if (config.type === 'legacy') {
      console.log(STATUS.warning(`${config.path}`))
      console.log(ansis.gray(`     (${typeLabel}, ${sizeKB}KB, modified ${modified})`))
    }
    else {
      console.log(STATUS.info(`${config.path}`))
      console.log(ansis.gray(`     (${typeLabel}, ${sizeKB}KB, modified ${modified})`))
    }
  }

  // Show conflicts if any
  const conflicts = compareConfigs(configs)
  if (conflicts.length > 0) {
    console.log(ansis.yellow(`\nConflicts found: ${conflicts.length}`))
    for (const conflict of conflicts.slice(0, 5)) {
      console.log(ansis.yellow(`  - ${conflict.key}: differs in ${conflict.files.length} files`))
    }
    if (conflicts.length > 5) {
      console.log(ansis.gray(`  ... and ${conflicts.length - 5} more`))
    }
  }

  console.log('')
}
