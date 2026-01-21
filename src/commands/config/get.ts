/**
 * Config Get Subcommand
 *
 * Get a configuration value by key using dot notation.
 * Supports reading from CCJK config, Claude config, and runtime state.
 *
 * Usage:
 *   ccjk config get <key>                Get configuration value
 *   ccjk config get general.lang         Get nested value
 *   ccjk config get env.ANTHROPIC_BASE_URL  Get env var
 *   ccjk config get <key> --show-source  Show value source file
 *   ccjk config get <key> --json         Output as JSON
 */

import type { GetConfigOptions } from './types'

import ansis from 'ansis'
import { config } from '../../config/unified'
import { CCJK_CONFIG_FILE, SETTINGS_FILE, STATE_FILE } from '../../constants'
import { ensureI18nInitialized, i18n } from '../../i18n'

/**
 * Get nested value from object using dot notation
 *
 * @param obj - Object to read from
 * @param path - Dot notation path
 * @returns Value at path or undefined if not found
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) {
    return undefined
  }

  const segments = path.split('.')
  let current: unknown = obj

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (typeof current !== 'object') {
      return undefined
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

/**
 * Search for a value across all configuration sources
 *
 * @param path - Dot notation path to search for
 * @param options - Command options
 * @returns The found value with source information, or null
 */
function findValueAcrossSources(path: string, options: GetConfigOptions): {
  value: unknown
  source: 'ccjk' | 'claude' | 'state'
  sourcePath: string
} | null {
  // Try CCJK config first
  const ccjkConfig = config.ccjk.read()
  const ccjkValue = ccjkConfig ? getNestedValue(ccjkConfig, path) : undefined
  if (ccjkValue !== undefined) {
    return {
      value: ccjkValue,
      source: 'ccjk',
      sourcePath: CCJK_CONFIG_FILE,
    }
  }

  // Try Claude Code config
  const claudeConfig = config.claude.read()
  const claudeValue = claudeConfig ? getNestedValue(claudeConfig, path) : undefined
  if (claudeValue !== undefined) {
    return {
      value: claudeValue,
      source: 'claude',
      sourcePath: SETTINGS_FILE,
    }
  }

  // Try runtime state
  const stateConfig = config.state.read()
  const stateValue = stateConfig ? getNestedValue(stateConfig, path) : undefined
  if (stateValue !== undefined) {
    return {
      value: stateValue,
      source: 'state',
      sourcePath: STATE_FILE,
    }
  }

  return null
}

/**
 * Display a value with proper formatting
 *
 * @param value - Value to display
 * @param indent - Indentation level
 */
function displayValue(value: unknown, indent = 0): void {
  const prefix = '  '.repeat(indent)

  if (value === null) {
    console.log(`${prefix}${ansis.dim('null')}`)
  }
  else if (typeof value === 'boolean') {
    console.log(`${prefix}${ansis.green(value.toString())}`)
  }
  else if (typeof value === 'number') {
    console.log(`${prefix}${ansis.yellow(value.toString())}`)
  }
  else if (typeof value === 'string') {
    console.log(`${prefix}${ansis.green(value)}`)
  }
  else if (Array.isArray(value)) {
    console.log(`${prefix}${ansis.dim('[')}`)
    for (const item of value) {
      displayValue(item, indent + 1)
    }
    console.log(`${prefix}${ansis.dim(']')}`)
  }
  else if (typeof value === 'object') {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      console.log(`${prefix}${ansis.bold(key)}:`)
      displayValue(val, indent + 1)
    }
  }
  else {
    console.log(`${prefix}${String(value)}`)
  }
}

/**
 * Get subcommand main handler
 *
 * @param key - Configuration key (dot notation)
 * @param options - Command options
 */
export async function getCommand(key: string, options: GetConfigOptions = {}): Promise<void> {
  // Initialize i18n if needed
  await ensureI18nInitialized()

  const isZh = i18n.language === 'zh-CN'

  if (!key) {
    console.log(ansis.yellow(isZh
      ? 'Please specify a configuration key'
      : '请指定配置项'))
    console.log('')
    console.log(ansis.dim(isZh
      ? 'Usage: ccjk config get <key>'
      : '用法: ccjk config get <配置项>'))
    console.log(ansis.dim(isZh
      ? 'Example: ccjk config get general.preferredLang'
      : '示例: ccjk config get general.preferredLang'))
    console.log('')
    return
  }

  // Search for the value
  const result = findValueAcrossSources(key, options)

  if (!result) {
    console.log('')
    console.log(ansis.yellow(isZh
      ? `Configuration key "${key}" not found`
      : `未找到配置项 "${key}"`))
    console.log('')
    console.log(ansis.dim(isZh
      ? 'Tip: Use "ccjk config list" to see all available keys'
      : '提示: 使用 "ccjk config list" 查看所有可用的配置项'))
    console.log('')
    return
  }

  // Display the result
  if (options.json) {
    console.log(JSON.stringify({
      key,
      value: result.value,
      source: result.source,
      sourcePath: result.sourcePath,
    }, null, 2))
  }
  else {
    console.log('')
    console.log(ansis.bold.cyan(isZh ? 'Configuration Value' : '配置值'))
    console.log(ansis.dim('─'.repeat(60)))
    console.log('')
    console.log(`${ansis.bold(isZh ? 'Key' : '配置项')}: ${ansis.green(key)}`)
    console.log(`${ansis.bold(isZh ? 'Value' : '值')}:`)
    displayValue(result.value, 1)

    if (options.showSource) {
      console.log('')
      console.log(`${ansis.bold(isZh ? 'Source' : '来源')}: ${ansis.dim(result.source)}`)
      console.log(`${ansis.bold(isZh ? 'File' : '文件')}: ${ansis.dim(result.sourcePath)}`)
    }

    console.log('')
  }
}
