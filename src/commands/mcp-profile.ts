/**
 * MCP Profile Command
 * Manage MCP service profiles for different use cases
 */

import type { CodeToolType, SupportedLang } from '../constants'
import type { CodexConfigData, CodexMcpService } from '../utils/code-tools/codex'
import ansis from 'ansis'
import { isCodeToolType } from '../constants'
import { getProfileById, getProfileDescription, getProfileIds, getProfileName, MCP_PROFILES } from '../config/mcp-profiles'
import { MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { i18n } from '../i18n'
import { backupMcpConfig, readMcpConfig, writeMcpConfig } from '../utils/claude-config'
import { readZcfConfig } from '../utils/ccjk-config'
import { backupCodexComplete, readCodexConfig, writeCodexConfig } from '../utils/code-tools/codex'
import { applyCodexPlatformCommand } from '../utils/code-tools/codex-platform'
import { checkMcpPerformance, formatPerformanceWarning } from '../utils/mcp-performance'
import { getSystemRoot, isWindows } from '../utils/platform'

export interface McpProfileOptions {
  lang?: SupportedLang
  tool?: CodeToolType
}

type ProfileTool = 'claude-code' | 'codex'

function resolveProfileTool(options: McpProfileOptions = {}): ProfileTool {
  if (options.tool === 'codex' || options.tool === 'claude-code') {
    return options.tool
  }

  const zcfConfig = readZcfConfig()
  if (zcfConfig?.codeToolType && isCodeToolType(zcfConfig.codeToolType)) {
    return zcfConfig.codeToolType === 'codex' ? 'codex' : 'claude-code'
  }

  return 'claude-code'
}

function getToolDisplayName(tool: ProfileTool, isZh: boolean): string {
  if (tool === 'codex') {
    return 'Codex'
  }
  return isZh ? 'Claude Code' : 'Claude Code'
}

function getConfiguredServiceIds(tool: ProfileTool): string[] {
  if (tool === 'codex') {
    const config = readCodexConfig()
    return (config?.mcpServices || []).map(service => service.id)
  }

  const config = readMcpConfig()
  return config?.mcpServers ? Object.keys(config.mcpServers) : []
}

function buildCodexProfileService(serviceId: string): CodexMcpService | null {
  const serviceConfig = MCP_SERVICE_CONFIGS.find(service => service.id.toLowerCase() === serviceId.toLowerCase())
  if (!serviceConfig) {
    return null
  }

  let command = serviceConfig.config.command || serviceId
  let args = (serviceConfig.config.args || []).map(arg => String(arg))

  if (serviceId === 'serena') {
    const idx = args.indexOf('--context')
    if (idx >= 0 && idx + 1 < args.length) {
      args[idx + 1] = 'codex'
    }
    else {
      args.push('--context', 'codex')
    }
  }

  const normalizedService: CodexMcpService = {
    id: serviceId.toLowerCase(),
    command,
    args,
  }
  applyCodexPlatformCommand(normalizedService)

  const env = { ...(serviceConfig.config.env || {}) }
  if (isWindows()) {
    const systemRoot = getSystemRoot()
    if (systemRoot) {
      env.SYSTEMROOT = systemRoot
    }
  }

  return {
    id: normalizedService.id,
    command: normalizedService.command,
    args: normalizedService.args || [],
    env: Object.keys(env).length > 0 ? env : undefined,
    startup_timeout_sec: 30,
  }
}

function backupProfileConfig(tool: ProfileTool): string | null {
  return tool === 'codex' ? backupCodexComplete() : backupMcpConfig()
}

function writeProfileForTool(tool: ProfileTool, servicesToEnable: string[]): void {
  if (tool === 'codex') {
    const existingConfig = readCodexConfig()
    const mcpServices = servicesToEnable
      .map(buildCodexProfileService)
      .filter((service): service is CodexMcpService => service !== null)

    const newConfig: CodexConfigData = {
      model: existingConfig?.model || null,
      modelProvider: existingConfig?.modelProvider || null,
      providers: existingConfig?.providers || [],
      mcpServices,
      managed: true,
      otherConfig: existingConfig?.otherConfig || [],
      modelProviderCommented: existingConfig?.modelProviderCommented,
    }

    writeCodexConfig(newConfig)
    return
  }

  const newServers: Record<string, any> = {}
  for (const serviceId of servicesToEnable) {
    const serviceConfig = MCP_SERVICE_CONFIGS.find(s => s.id.toLowerCase() === serviceId.toLowerCase())
    if (serviceConfig) {
      newServers[serviceId] = serviceConfig.config
    }
  }

  const existingConfig = readMcpConfig() || {}
  writeMcpConfig({
    ...existingConfig,
    mcpServers: newServers,
  })
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
  const tool = resolveProfileTool(options)
  const toolName = getToolDisplayName(tool, isZh)

  const currentServices = getConfiguredServiceIds(tool)
  const normalizedServices = currentServices.map(service => service.toLowerCase())

  console.log('')
  console.log(ansis.bold.cyan(isZh
    ? `📊 当前 ${toolName} MCP 配置状态`
    : `📊 Current ${toolName} MCP Configuration`))
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
    return profile.services.every(s => normalizedServices.includes(s.toLowerCase()))
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
  const tool = resolveProfileTool(options)
  const toolName = getToolDisplayName(tool, isZh)

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

  const backupPath = backupProfileConfig(tool)
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
  writeProfileForTool(tool, servicesToEnable)

  const profileName = getProfileName(profile, lang)
  console.log(ansis.green(`✔ ${isZh ? '已为' : 'Switched'} ${toolName}${isZh ? ' 切换到配置预设' : ' profile'}: ${profileName}`))
  console.log(ansis.dim(`  ${isZh ? '已启用服务' : 'Enabled services'}: ${servicesToEnable.length}`))

  // Show performance warning if applicable
  const warning = checkMcpPerformance(servicesToEnable.length)
  if (warning) {
    console.log('')
    console.log(formatPerformanceWarning(warning, lang))
  }

  console.log('')
  console.log(ansis.yellow(isZh
    ? `⚠️ 请重启 ${toolName} 以使更改生效`
    : `⚠️ Please restart ${toolName} for changes to take effect`))
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
