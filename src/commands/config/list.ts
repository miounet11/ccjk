/**
 * Config List Subcommand
 *
 * Lists configuration values from all CCJK configuration sources.
 *
 * Configuration sources:
 * - ~/.ccjk/config.toml - CCJK preferences
 * - ~/.claude/settings.json - Claude Code native config
 * - ~/.ccjk/state.json - Runtime state
 *
 * Usage:
 *   ccjk config list                    List all configurations
 *   ccjk config list --scope ccjk       List only CCJK config
 *   ccjk config list --scope claude     List only Claude config
 *   ccjk config list --scope state      List only runtime state
 *   ccjk config list --json             Output as JSON
 *   ccjk config list --verbose          Show detailed information
 */

import type { ListConfigOptions } from './types'

import ansis from 'ansis'
import { config } from '../../config/unified'
import { CCJK_CONFIG_FILE, SETTINGS_FILE, STATE_FILE } from '../../constants'
import { ensureI18nInitialized, i18n } from '../../i18n'

/**
 * Mask sensitive values in configuration
 *
 * @param key - Configuration key
 * @param value - Configuration value
 * @returns Masked value if sensitive, original otherwise
 */
function maskSensitiveValue(key: string, value: unknown): unknown {
  const sensitiveKeys = [
    'apiKey',
    'authToken',
    'password',
    'secret',
    'token',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_AUTH_TOKEN',
  ]

  const isSensitive = sensitiveKeys.some(sensitive =>
    key.toLowerCase().includes(sensitive.toLowerCase()),
  )

  if (isSensitive && typeof value === 'string' && value.length > 0) {
    return value.length > 8
      ? `${value.slice(0, 4)}...${value.slice(-4)}`
      : '****'
  }

  return value
}

/**
 * Display a configuration section with formatted output
 *
 * @param title - Section title
 * @param data - Configuration data
 * @param indent - Indentation level
 */
function displaySection(title: string, data: Record<string, unknown>, indent = 0): void {
  const prefix = '  '.repeat(indent)
  console.log(`${prefix}${ansis.bold.cyan(title)}`)
  console.log(`${prefix}${ansis.dim('─'.repeat(Math.max(40, 60 - indent * 2)))}`)
  console.log('')

  displayValue(data, indent + 1)
  console.log('')
}

/**
 * Display configuration value with proper formatting
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
    if (value.length === 0) {
      console.log(`${prefix}${ansis.dim('[]')}`)
    }
    else {
      console.log(`${prefix}${ansis.dim('[')}`)
      for (const item of value) {
        displayValue(item, indent + 1)
      }
      console.log(`${prefix}${ansis.dim(']')}`)
    }
  }
  else if (typeof value === 'object') {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const maskedVal = maskSensitiveValue(key, val)
      if (maskedVal !== undefined && maskedVal !== null) {
        console.log(`${prefix}${ansis.bold(key)}:`)

        if (typeof maskedVal === 'object' && !Array.isArray(maskedVal)) {
          displayValue(maskedVal, indent + 1)
        }
        else {
          displayValue(maskedVal, indent + 1)
        }
      }
    }
  }
  else {
    console.log(`${prefix}${String(value)}`)
  }
}

/**
 * List CCJK configuration
 *
 * @param ccjkConfig - CCJK configuration object
 * @param options - Command options
 */
function listCcjkConfig(ccjkConfig: Record<string, unknown> | null, options: ListConfigOptions): void {
  const isZh = i18n.language === 'zh-CN'

  if (!ccjkConfig) {
    console.log(ansis.yellow(isZh
      ? 'No CCJK configuration found'
      : '未找到 CCJK 配置'))
    console.log(ansis.dim(`  ${CCJK_CONFIG_FILE}`))
    console.log('')
    return
  }

  if (options.json) {
    console.log(JSON.stringify(ccjkConfig, null, 2))
    return
  }

  console.log('')
  console.log(ansis.bold.cyan(isZh ? 'CCJK Configuration' : 'CCJK 配置'))
  console.log(ansis.dim(`~/.ccjk/config.toml`))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')

  // Display version info
  console.log(`${ansis.bold('version:')} ${ccjkConfig.version || 'N/A'}`)
  console.log(`${ansis.bold('lastUpdated:')} ${ccjkConfig.lastUpdated || 'N/A'}`)
  console.log('')

  // Display general section
  if (ccjkConfig.general) {
    displaySection(isZh ? 'General' : '通用配置', ccjkConfig.general as Record<string, unknown>)
  }

  // Display tools section
  if (ccjkConfig.tools) {
    displaySection(isZh ? 'Tools' : '工具配置', ccjkConfig.tools as Record<string, unknown>)
  }
}

/**
 * List Claude Code configuration
 *
 * @param claudeConfig - Claude Code configuration object
 * @param options - Command options
 */
function listClaudeConfig(claudeConfig: Record<string, unknown> | null, options: ListConfigOptions): void {
  const isZh = i18n.language === 'zh-CN'

  if (!claudeConfig) {
    console.log(ansis.yellow(isZh
      ? 'No Claude Code configuration found'
      : '未找到 Claude Code 配置'))
    console.log(ansis.dim(`  ${SETTINGS_FILE}`))
    console.log('')
    return
  }

  if (options.json) {
    console.log(JSON.stringify(claudeConfig, null, 2))
    return
  }

  console.log('')
  console.log(ansis.bold.cyan(isZh ? 'Claude Code Configuration' : 'Claude Code 配置'))
  console.log(ansis.dim(`~/.claude/settings.json`))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')

  // Display each top-level section
  for (const [key, value] of Object.entries(claudeConfig)) {
    if (key === 'env') {
      // Special handling for env vars - mask sensitive values
      console.log(`${ansis.bold.cyan(key)}:`)
      console.log('')
      for (const [envKey, envVal] of Object.entries(value as Record<string, unknown>)) {
        const maskedVal = maskSensitiveValue(envKey, envVal)
        console.log(`  ${ansis.green(envKey)}: ${ansis.dim(String(maskedVal))}`)
      }
      console.log('')
    }
    else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      displaySection(key, value as Record<string, unknown>)
    }
    else {
      console.log(`${ansis.bold(key)}:`)
      displayValue(value, 1)
      console.log('')
    }
  }
}

/**
 * List runtime state
 *
 * @param stateConfig - Runtime state object
 * @param options - Command options
 */
function listStateConfig(stateConfig: Record<string, unknown> | null, options: ListConfigOptions): void {
  const isZh = i18n.language === 'zh-CN'

  if (!stateConfig) {
    console.log(ansis.yellow(isZh
      ? 'No runtime state found'
      : '未找到运行时状态'))
    console.log(ansis.dim(`  ${STATE_FILE}`))
    console.log('')
    return
  }

  if (options.json) {
    console.log(JSON.stringify(stateConfig, null, 2))
    return
  }

  console.log('')
  console.log(ansis.bold.cyan(isZh ? 'Runtime State' : '运行时状态'))
  console.log(ansis.dim(`~/.ccjk/state.json`))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')

  // Display version info
  console.log(`${ansis.bold('version:')} ${stateConfig.version || 'N/A'}`)
  console.log(`${ansis.bold('lastUpdated:')} ${stateConfig.lastUpdated || 'N/A'}`)
  console.log('')

  // Display sessions
  if (stateConfig.sessions && Array.isArray(stateConfig.sessions)) {
    console.log(`${ansis.bold.cyan(isZh ? 'Sessions' : '会话')}`)
    console.log('')
    console.log(`  ${ansis.green('count:')} ${stateConfig.sessions.length}`)
    console.log('')
  }

  // Display cache info
  if (stateConfig.cache) {
    displaySection(isZh ? 'Cache' : '缓存', stateConfig.cache as Record<string, unknown>)
  }

  // Display updates info
  if (stateConfig.updates) {
    displaySection(isZh ? 'Updates' : '更新', stateConfig.updates as Record<string, unknown>)
  }
}

/**
 * List subcommand main handler
 *
 * @param options - Command options
 */
export async function listCommand(options: ListConfigOptions = {}): Promise<void> {
  // Initialize i18n if needed
  await ensureI18nInitialized()

  const isZh = i18n.language === 'zh-CN'

  // Read all configurations
  const allConfigs = config.readAll()

  // Determine which scopes to display
  const scopes = options.scope === 'all' || !options.scope
    ? ['ccjk', 'claude', 'state']
    : [options.scope]

  // Display each requested scope
  for (const scope of scopes) {
    if (scope === 'ccjk') {
      listCcjkConfig(allConfigs.ccjk as unknown as Record<string, unknown> | null, options)
    }
    else if (scope === 'claude') {
      listClaudeConfig(allConfigs.claude as unknown as Record<string, unknown> | null, options)
    }
    else if (scope === 'state') {
      listStateConfig(allConfigs.state as unknown as Record<string, unknown> | null, options)
    }
  }

  // Display file paths summary
  if (!options.json && options.verbose) {
    console.log('')
    console.log(ansis.dim('─'.repeat(60)))
    console.log(ansis.dim(isZh ? 'Configuration files:' : '配置文件:'))
    console.log(ansis.dim(`  CCJK:      ${CCJK_CONFIG_FILE}`))
    console.log(ansis.dim(`  Claude:    ${SETTINGS_FILE}`))
    console.log(ansis.dim(`  State:     ${STATE_FILE}`))
    console.log('')
  }
}
