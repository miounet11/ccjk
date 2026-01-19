/**
 * MCP Service Release Utilities
 * Tools for releasing idle MCP services and managing service lifecycle
 */

import type { SupportedLang } from '../constants'
import { execSync } from 'node:child_process'
import process from 'node:process'
import ansis from 'ansis'
import { MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { isCoreService, MCP_SERVICE_TIERS } from '../config/mcp-tiers'
import { i18n } from '../i18n'
import { backupMcpConfig, readMcpConfig, writeMcpConfig } from '../utils/claude-config'

export interface McpReleaseOptions {
  lang?: SupportedLang
  force?: boolean
  tier?: 'ondemand' | 'scenario' | 'all'
  service?: string
  dryRun?: boolean
}

export interface ReleaseResult {
  success: boolean
  releasedServices: string[]
  skippedServices: string[]
  errors: string[]
}

/**
 * Get list of services that can be released
 */
export function getReleasableServices(configuredServices: string[], tier?: 'ondemand' | 'scenario' | 'all'): string[] {
  return configuredServices.filter((serviceId) => {
    // Never release core services unless forced
    if (isCoreService(serviceId)) {
      return false
    }

    const serviceTier = MCP_SERVICE_TIERS[serviceId] || 'ondemand'

    if (tier === 'all') {
      return true
    }

    if (tier) {
      return serviceTier === tier
    }

    // Default: release ondemand and scenario services
    return serviceTier === 'ondemand' || serviceTier === 'scenario'
  })
}

/**
 * Release (disable) specified MCP services
 */
export async function releaseServices(
  servicesToRelease: string[],
  options: McpReleaseOptions = {},
): Promise<ReleaseResult> {
  const result: ReleaseResult = {
    success: true,
    releasedServices: [],
    skippedServices: [],
    errors: [],
  }

  if (servicesToRelease.length === 0) {
    return result
  }

  // Read current config
  const config = readMcpConfig()
  if (!config?.mcpServers) {
    result.errors.push('No MCP configuration found')
    result.success = false
    return result
  }

  // Backup before modifying
  if (!options.dryRun) {
    backupMcpConfig()
  }

  const newServers = { ...config.mcpServers }

  for (const serviceId of servicesToRelease) {
    // Check if service is core and not forced
    if (isCoreService(serviceId) && !options.force) {
      result.skippedServices.push(serviceId)
      continue
    }

    // Check if service exists in config
    if (!newServers[serviceId]) {
      result.skippedServices.push(serviceId)
      continue
    }

    // Remove service from config
    if (!options.dryRun) {
      delete newServers[serviceId]
    }
    result.releasedServices.push(serviceId)
  }

  // Write updated config
  if (!options.dryRun && result.releasedServices.length > 0) {
    try {
      writeMcpConfig({ ...config, mcpServers: newServers })
    }
    catch (error) {
      result.errors.push(`Failed to write config: ${error}`)
      result.success = false
    }
  }

  return result
}

/**
 * Release all non-core services
 */
export async function releaseAllNonCore(options: McpReleaseOptions = {}): Promise<ReleaseResult> {
  const config = readMcpConfig()
  const configuredServices = config?.mcpServers ? Object.keys(config.mcpServers) : []

  const releasable = getReleasableServices(configuredServices, 'all')
  return releaseServices(releasable, options)
}

/**
 * Release services by tier
 */
export async function releaseByTier(
  tier: 'ondemand' | 'scenario',
  options: McpReleaseOptions = {},
): Promise<ReleaseResult> {
  const config = readMcpConfig()
  const configuredServices = config?.mcpServers ? Object.keys(config.mcpServers) : []

  const releasable = getReleasableServices(configuredServices, tier)
  return releaseServices(releasable, options)
}

/**
 * Quick release command - release all non-core services
 */
export async function mcpRelease(options: McpReleaseOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🧹 MCP 服务释放' : '🧹 MCP Service Release'))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')

  // Read current config
  const config = readMcpConfig()
  const configuredServices = config?.mcpServers ? Object.keys(config.mcpServers) : []

  if (configuredServices.length === 0) {
    console.log(ansis.yellow(isZh ? '没有配置任何 MCP 服务' : 'No MCP services configured'))
    return
  }

  // Determine which services to release
  let servicesToRelease: string[]

  if (options.service) {
    // Release specific service
    servicesToRelease = [options.service]
  }
  else if (options.tier) {
    // Release by tier
    servicesToRelease = getReleasableServices(configuredServices, options.tier)
  }
  else {
    // Default: release all non-core services
    servicesToRelease = getReleasableServices(configuredServices, 'all')
  }

  if (servicesToRelease.length === 0) {
    console.log(ansis.green(isZh ? '✔ 没有可释放的服务' : '✔ No services to release'))
    return
  }

  // Show what will be released
  console.log(isZh ? '将释放以下服务:' : 'Services to release:')
  for (const serviceId of servicesToRelease) {
    const tier = MCP_SERVICE_TIERS[serviceId] || 'ondemand'
    console.log(`  ${ansis.yellow('•')} ${serviceId} ${ansis.dim(`[${tier}]`)}`)
  }
  console.log('')

  if (options.dryRun) {
    console.log(ansis.green(isZh ? '(模拟运行 - 不会实际修改配置)' : '(Dry run - no changes will be made)'))
    return
  }

  // Perform release
  const result = await releaseServices(servicesToRelease, options)

  if (result.success) {
    console.log(ansis.green(`✔ ${isZh ? '已释放' : 'Released'} ${result.releasedServices.length} ${isZh ? '个服务' : 'services'}`))

    if (result.skippedServices.length > 0) {
      console.log(ansis.yellow(`${isZh ? '跳过' : 'Skipped'}: ${result.skippedServices.join(', ')}`))
    }

    // Show remaining services
    const remaining = configuredServices.filter(s => !result.releasedServices.includes(s))
    console.log('')
    console.log(ansis.dim(`${isZh ? '剩余服务' : 'Remaining services'}: ${remaining.length}`))
    if (remaining.length > 0) {
      console.log(ansis.dim(`  ${remaining.join(', ')}`))
    }

    console.log('')
    console.log(ansis.yellow(isZh
      ? '⚠️ 请重启 Claude Code 以使更改生效'
      : '⚠️ Please restart Claude Code for changes to take effect'))
  }
  else {
    console.log(ansis.red(`✖ ${isZh ? '释放失败' : 'Release failed'}`))
    for (const error of result.errors) {
      console.log(ansis.red(`  ${error}`))
    }
  }
}

/**
 * Restore released services (re-enable)
 */
export async function restoreServices(
  serviceIds: string[],
  options: McpReleaseOptions = {},
): Promise<ReleaseResult> {
  const result: ReleaseResult = {
    success: true,
    releasedServices: [], // In this context, means "restored"
    skippedServices: [],
    errors: [],
  }

  // Read current config
  const config = readMcpConfig()
  if (!config) {
    result.errors.push('No MCP configuration found')
    result.success = false
    return result
  }

  // Backup before modifying
  if (!options.dryRun) {
    backupMcpConfig()
  }

  const newServers = { ...config.mcpServers }

  for (const serviceId of serviceIds) {
    // Check if service already exists
    if (newServers[serviceId]) {
      result.skippedServices.push(serviceId)
      continue
    }

    // Find service config
    const serviceConfig = MCP_SERVICE_CONFIGS.find(s => s.id === serviceId)
    if (!serviceConfig) {
      result.errors.push(`Unknown service: ${serviceId}`)
      continue
    }

    // Add service to config
    if (!options.dryRun) {
      newServers[serviceId] = serviceConfig.config
    }
    result.releasedServices.push(serviceId)
  }

  // Write updated config
  if (!options.dryRun && result.releasedServices.length > 0) {
    try {
      writeMcpConfig({ ...config, mcpServers: newServers })
    }
    catch (error) {
      result.errors.push(`Failed to write config: ${error}`)
      result.success = false
    }
  }

  return result
}

/**
 * Kill running MCP processes (for immediate release)
 * Note: This is a more aggressive approach that kills processes
 */
export function killMcpProcesses(): { killed: number, errors: string[] } {
  const result = { killed: 0, errors: [] as string[] }

  try {
    // Find and kill npx processes running MCP servers
    // This is platform-specific and may need adjustment
    const platform = process.platform

    if (platform === 'darwin' || platform === 'linux') {
      try {
        // Kill npx processes related to MCP
        execSync('pkill -f "@anthropic-ai/mcp-server" 2>/dev/null || true', { stdio: 'ignore' })
        execSync('pkill -f "@upstash/context7-mcp" 2>/dev/null || true', { stdio: 'ignore' })
        execSync('pkill -f "@playwright/mcp" 2>/dev/null || true', { stdio: 'ignore' })
        execSync('pkill -f "open-websearch" 2>/dev/null || true', { stdio: 'ignore' })
        execSync('pkill -f "mcp-deepwiki" 2>/dev/null || true', { stdio: 'ignore' })
        result.killed = 1 // We don't know exact count
      }
      catch {
        // pkill returns non-zero if no processes found, which is fine
      }
    }
    else if (platform === 'win32') {
      try {
        // Windows equivalent
        execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq *mcp*" 2>nul || exit 0', { stdio: 'ignore' })
        result.killed = 1
      }
      catch {
        // taskkill may fail if no matching processes
      }
    }
  }
  catch (error) {
    result.errors.push(`Failed to kill processes: ${error}`)
  }

  return result
}
