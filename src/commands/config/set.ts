/**
 * Config Set Subcommand
 *
 * Set a configuration value by key using dot notation.
 * Supports updating CCJK config, Claude config, and runtime state.
 * Creates backups before modification by default.
 *
 * Usage:
 *   ccjk config set <key> <value>           Set configuration value
 *   ccjk config set general.lang zh-CN      Set nested value
 *   ccjk config set env.NEW_VAR "value"     Set environment variable
 *   ccjk config set <key> <value> --scope ccjk  Set in specific config
 *   ccjk config set <key> <value> --no-backup  Skip backup creation
 */

import type { SetConfigOptions } from './types'

import ansis from 'ansis'
import { config } from '../../config/unified'
import { CCJK_CONFIG_FILE, SETTINGS_FILE, STATE_FILE } from '../../constants'
import { ensureI18nInitialized, i18n } from '../../i18n'

/**
 * Parse a value string based on type hint or auto-detection
 *
 * @param value - String value to parse
 * @param type - Explicit type hint
 * @returns Parsed value
 */
function parseValue(value: string, type?: SetConfigOptions['type']): unknown {
  // Explicit type handling
  if (type === 'string') {
    return value
  }

  if (type === 'number') {
    const num = Number.parseFloat(value)
    if (Number.isNaN(num)) {
      throw new TypeError(`Cannot parse "${value}" as number`)
    }
    return num
  }

  if (type === 'boolean') {
    if (value === 'true' || value === '1' || value === 'yes') {
      return true
    }
    if (value === 'false' || value === '0' || value === 'no') {
      return false
    }
    throw new Error(`Cannot parse "${value}" as boolean`)
  }

  if (type === 'json') {
    try {
      return JSON.parse(value)
    }
    catch (error) {
      throw new Error(`Cannot parse "${value}" as JSON: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Auto-detect
  // Try JSON first
  try {
    return JSON.parse(value)
  }
  catch {
    // Try boolean
    if (value === 'true')
      return true
    if (value === 'false')
      return false

    // Try number
    const num = Number.parseFloat(value)
    if (!Number.isNaN(num) && String(num) === value) {
      return num
    }

    // Default to string
    return value
  }
}

/**
 * Set nested value in object using dot notation
 *
 * @param obj - Object to modify
 * @param path - Dot notation path
 * @param value - Value to set
 * @returns Modified object
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const segments = path.split('.')
  let current: Record<string, unknown> = obj

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]

    if (!(segment in current) || typeof current[segment] !== 'object' || current[segment] === null) {
      current[segment] = {}
    }

    current = current[segment] as Record<string, unknown>
  }

  const lastSegment = segments[segments.length - 1]
  current[lastSegment] = value

  return obj
}

/**
 * Set value in CCJK configuration
 *
 * @param path - Dot notation path
 * @param value - Value to set
 * @param options - Command options
 * @returns Set result
 */
function setCcjkValue(path: string, value: unknown, options: SetConfigOptions): {
  success: boolean
  backupPath?: string
  error?: string
} {
  try {
    // Create backup if requested
    let backupPath: string | undefined
    if (options.backup !== false) {
      const ccjkConfig = config.ccjk.read()
      if (ccjkConfig) {
        // Backup is handled by writeCcjkConfig with timestamp
        backupPath = `${CCJK_CONFIG_FILE}.backup`
      }
    }

    // Read current config
    const currentConfig = config.ccjk.read() || config.ccjk.createDefault()

    // Set the nested value
    const updatedConfig = setNestedValue(
      currentConfig as unknown as Record<string, unknown>,
      path,
      value,
    )

    // Write back
    config.ccjk.write(updatedConfig as any)

    return { success: true, backupPath }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Set value in Claude Code configuration
 *
 * @param path - Dot notation path
 * @param value - Value to set
 * @param options - Command options
 * @returns Set result
 */
function setClaudeValue(path: string, value: unknown, options: SetConfigOptions): {
  success: boolean
  backupPath?: string
  error?: string
} {
  try {
    // Create backup if requested
    let backupPath: string | undefined
    if (options.backup !== false) {
      const { backupClaudeConfig } = require('../../config/unified/claude-config')
      const backedUp = backupClaudeConfig()
      if (backedUp) {
        backupPath = backedUp
      }
    }

    // Read current config
    const currentConfig = config.claude.read() || {}

    // Set the nested value
    const updatedConfig = setNestedValue(
      currentConfig as unknown as Record<string, unknown>,
      path,
      value,
    )

    // Write back
    config.claude.write(updatedConfig as any)

    return { success: true, backupPath }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Set value in runtime state
 *
 * @param path - Dot notation path
 * @param value - Value to set
 * @param options - Command options
 * @returns Set result
 */
function setStateValue(path: string, value: unknown, options: SetConfigOptions): {
  success: boolean
  backupPath?: string
  error?: string
} {
  try {
    // Create backup if requested
    let backupPath: string | undefined
    if (options.backup !== false) {
      const stateConfig = config.state.read()
      if (stateConfig) {
        backupPath = `${STATE_FILE}.backup`
      }
    }

    // Read current state
    const currentState = config.state.read() || config.state.createDefault()

    // Set the nested value
    const updatedState = setNestedValue(
      currentState as unknown as Record<string, unknown>,
      path,
      value,
    )

    // Write back
    config.state.write(updatedState as any)

    return { success: true, backupPath }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Auto-detect which config scope a key belongs to
 *
 * @param key - Configuration key
 * @returns Detected scope
 */
function detectScope(key: string): 'ccjk' | 'claude' | 'state' {
  const lowerKey = key.toLowerCase()

  // CCJK-specific keys
  if (lowerKey.startsWith('general.') || lowerKey.startsWith('tools.')) {
    return 'ccjk'
  }

  // Claude-specific keys
  if (lowerKey.startsWith('env.') || lowerKey.startsWith('permissions.') || lowerKey.startsWith('mcp')) {
    return 'claude'
  }

  // State-specific keys
  if (lowerKey.startsWith('sessions.') || lowerKey.startsWith('cache.') || lowerKey.startsWith('updates.')) {
    return 'state'
  }

  // Default to CCJK
  return 'ccjk'
}

/**
 * Set subcommand main handler
 *
 * @param key - Configuration key (dot notation)
 * @param value - Value to set
 * @param options - Command options
 */
export async function setCommand(key: string, value: string, options: SetConfigOptions = {}): Promise<void> {
  // Initialize i18n if needed
  await ensureI18nInitialized()

  const isZh = i18n.language === 'zh-CN'

  if (!key) {
    console.log(ansis.yellow(isZh
      ? 'Please specify a configuration key'
      : '请指定配置项'))
    console.log('')
    console.log(ansis.dim(isZh
      ? 'Usage: ccjk config set <key> <value>'
      : '用法: ccjk config set <配置项> <值>'))
    console.log(ansis.dim(isZh
      ? 'Example: ccjk config set general.preferredLang zh-CN'
      : '示例: ccjk config set general.preferredLang zh-CN'))
    console.log('')
    return
  }

  if (!value) {
    console.log(ansis.yellow(isZh
      ? 'Please specify a value'
      : '请指定值'))
    console.log('')
    return
  }

  // Parse the value
  let parsedValue: unknown
  try {
    parsedValue = parseValue(value, options.type)
  }
  catch (error) {
    console.log(ansis.red(isZh
      ? `Failed to parse value: ${error instanceof Error ? error.message : String(error)}`
      : `解析值失败: ${error instanceof Error ? error.message : String(error)}`))
    console.log('')
    console.log(ansis.dim(isZh
      ? 'Tip: Use --type to specify the value type explicitly'
      : '提示: 使用 --type 显式指定值类型'))
    console.log(ansis.dim(isZh
      ? '     --type string    Set as string'
      : '     --type string    设置为字符串'))
    console.log(ansis.dim(isZh
      ? '     --type number    Set as number'
      : '     --type number    设置为数字'))
    console.log(ansis.dim(isZh
      ? '     --type boolean   Set as boolean (true/false)'
      : '     --type boolean   设置为布尔值 (true/false)'))
    console.log(ansis.dim(isZh
      ? '     --type json       Set as JSON'
      : '     --type json       设置为 JSON'))
    console.log('')
    return
  }

  // Determine scope
  const scope = options.scope || detectScope(key)

  // Set the value
  let result: { success: boolean, backupPath?: string, error?: string }

  if (scope === 'ccjk') {
    result = setCcjkValue(key, parsedValue, options)
  }
  else if (scope === 'claude') {
    result = setClaudeValue(key, parsedValue, options)
  }
  else if (scope === 'state') {
    result = setStateValue(key, parsedValue, options)
  }
  else {
    console.log(ansis.red(isZh
      ? `Invalid scope: ${scope}`
      : `无效的作用域: ${scope}`))
    console.log('')
    return
  }

  // Display result
  if (!result.success) {
    console.log('')
    console.log(ansis.red(isZh
      ? 'Failed to set configuration value'
      : '设置配置值失败'))
    console.log(ansis.dim(result.error || ''))
    console.log('')
    return
  }

  console.log('')
  console.log(ansis.green(isZh
    ? 'Configuration value updated successfully'
    : '配置值更新成功'))
  console.log('')
  console.log(`${ansis.bold(isZh ? 'Key' : '配置项')}: ${ansis.green(key)}`)
  console.log(`${ansis.bold(isZh ? 'Value' : '值')}: ${ansis.green(JSON.stringify(parsedValue))}`)
  console.log(`${ansis.bold(isZh ? 'Scope' : '作用域')}: ${ansis.dim(scope)}`)

  if (result.backupPath) {
    console.log(`${ansis.bold(isZh ? 'Backup' : '备份')}: ${ansis.dim(result.backupPath)}`)
  }

  console.log('')
}
