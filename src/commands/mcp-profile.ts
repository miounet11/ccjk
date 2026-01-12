/**
 * MCP Profile Command
 * Manage MCP service profiles for different use cases
 */

import type { SupportedLang } from '../constants'
import ansis from 'ansis'
import { getProfileById, getProfileDescription, getProfileIds, getProfileName, MCP_PROFILES } from '../config/mcp-profiles'
import { MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { i18n } from '../i18n'
import { backupMcpConfig, readMcpConfig, writeMcpConfig } from '../utils/claude-config'
import { checkMcpPerformance, formatPerformanceWarning } from '../utils/mcp-performance'

export interface McpProfileOptions {
  lang?: SupportedLang
}

/**
 * List all available profiles
 */
export async function listProfiles(options: McpProfileOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '📋 可用的 MCP 配置预设' : '📋 Available MCP Profiles'))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')

  for (const profile of MCP_PROFILES) {
    const name = getProfileName(profile, lang)
    const desc = getProfileDescription(profile, lang)
    const serviceCount = profile.services.length === 0
      ? (isZh ? '全部' : 'All')
      : profile.services.length.toString()

    const defaultBadge = profile.isDefault ? ansis.green(isZh ? ' [默认]' : ' [default]') : ''

    console.log(`${ansis.bold.green(profile.id)}${defaultBadge}`)
    console.log(`  ${ansis.white(name)} - ${ansis.dim(desc)}`)
    console.log(`  ${ansis.dim(isZh ? '服务数量' : 'Services')}: ${serviceCount}`)

    if (profile.services.length > 0 && profile.services.length <= 6) {
      console.log(`  ${ansis.dim(profile.services.join(', '))}`)
    }
    console.log('')
  }

  console.log(ansis.dim('─'.repeat(50)))
  console.log(ansis.dim(isZh
    ? '使用 `ccjk mcp profile use <id>` 切换配置'
    : 'Use `ccjk mcp profile use <id>` to switch profile'))
  console.log('')
}

/**
 * Show current profile status
 */
export async function showCurrentProfile(options: McpProfileOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  const config = readMcpConfig()
  const currentServices = config?.mcpServers ? Object.keys(config.mcpServers) : []

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '📊 当前 MCP 配置状态' : '📊 Current MCP Configuration'))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')

  // Show service count
  console.log(`${ansis.bold(isZh ? '已配置服务' : 'Configured Services')}: ${currentServices.length}`)

  if (currentServices.length > 0) {
    console.log(ansis.dim(`  ${currentServices.join(', ')}`))
  }

  // Check performance
  const warning = checkMcpPerformance(currentServices.length)
  if (warning) {
    console.log('')
    console.log(formatPerformanceWarning(warning, lang))
  }

  // Try to match current config to a profile
  const matchedProfile = MCP_PROFILES.find((profile) => {
    if (profile.services.length === 0)
      return false // Skip 'full' profile
    if (profile.services.length !== currentServices.length)
      return false
    return profile.services.every(s => currentServices.includes(s))
  })

  if (matchedProfile) {
    console.log('')
    console.log(`${ansis.bold(isZh ? '匹配预设' : 'Matched Profile')}: ${ansis.green(matchedProfile.id)}`)
  }
  else {
    console.log('')
    console.log(ansis.dim(isZh ? '当前配置不匹配任何预设' : 'Current config does not match any profile'))
  }

  console.log('')
}

/**
 * Switch to a specific profile
 */
export async function useProfile(profileId: string, options: McpProfileOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  const profile = getProfileById(profileId)

  if (!profile) {
    console.log(ansis.red(isZh
      ? `❌ 未找到配置预设: ${profileId}`
      : `❌ Profile not found: ${profileId}`))
    console.log(ansis.dim(isZh
      ? `可用预设: ${getProfileIds().join(', ')}`
      : `Available profiles: ${getProfileIds().join(', ')}`))
    return
  }

  // Backup current config
  const backupPath = backupMcpConfig()
  if (backupPath) {
    console.log(ansis.gray(`✔ ${isZh ? '已备份当前配置' : 'Backed up current config'}: ${backupPath}`))
  }

  // Get services to enable
  let servicesToEnable: string[]
  if (profile.services.length === 0) {
    // 'full' profile - enable all services
    servicesToEnable = MCP_SERVICE_CONFIGS.filter(s => !s.requiresApiKey).map(s => s.id)
  }
  else {
    servicesToEnable = profile.services
  }

  // Build new MCP config
  const newServers: Record<string, any> = {}

  for (const serviceId of servicesToEnable) {
    const serviceConfig = MCP_SERVICE_CONFIGS.find(s => s.id === serviceId)
    if (serviceConfig) {
      newServers[serviceId] = serviceConfig.config
    }
  }

  // Read existing config and update mcpServers
  const existingConfig = readMcpConfig() || {}
  const newConfig = {
    ...existingConfig,
    mcpServers: newServers,
  }

  // Write new config
  writeMcpConfig(newConfig)

  const profileName = getProfileName(profile, lang)
  console.log(ansis.green(`✔ ${isZh ? '已切换到配置预设' : 'Switched to profile'}: ${profileName}`))
  console.log(ansis.dim(`  ${isZh ? '已启用服务' : 'Enabled services'}: ${servicesToEnable.length}`))

  // Show performance warning if applicable
  const warning = checkMcpPerformance(servicesToEnable.length)
  if (warning) {
    console.log('')
    console.log(formatPerformanceWarning(warning, lang))
  }

  console.log('')
  console.log(ansis.yellow(isZh
    ? '⚠️ 请重启 Claude Code 以使更改生效'
    : '⚠️ Please restart Claude Code for changes to take effect'))
}

/**
 * Main profile command handler
 */
export async function mcpProfile(action: string, args: string[], options: McpProfileOptions = {}): Promise<void> {
  switch (action) {
    case 'list':
    case 'ls':
      await listProfiles(options)
      break
    case 'current':
    case 'status':
      await showCurrentProfile(options)
      break
    case 'use':
    case 'switch':
      if (!args[0]) {
        const isZh = (options.lang || i18n.language) === 'zh-CN'
        console.log(ansis.red(isZh ? '请指定配置预设 ID' : 'Please specify a profile ID'))
        console.log(ansis.dim(isZh
          ? `可用预设: ${getProfileIds().join(', ')}`
          : `Available profiles: ${getProfileIds().join(', ')}`))
        return
      }
      await useProfile(args[0], options)
      break
    default: {
      const isZh = (options.lang || i18n.language) === 'zh-CN'
      console.log(ansis.yellow(isZh ? `未知操作: ${action}` : `Unknown action: ${action}`))
      console.log(ansis.dim(isZh
        ? '可用操作: list, current, use <profile-id>'
        : 'Available actions: list, current, use <profile-id>'))
    }
  }
}
