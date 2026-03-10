/**
 * MCP Unified Command
 * 统一的 MCP 管理命令，整合 doctor、profile、market 功能
 *
 * 使用方式:
 *   ccjk mcp doctor   - 健康检查
 *   ccjk mcp profile  - 配置预设管理
 *   ccjk mcp market   - MCP 市场
 *   ccjk mcp release  - 释放闲置服务
 *   ccjk mcp status   - 快速状态查看
 */

import type { CodeToolType, SupportedLang } from '../constants'
import ansis from 'ansis'
import { isCodeToolType } from '../constants'
import { i18n } from '../i18n'
import { readZcfConfig } from '../utils/ccjk-config'

// Re-export release from utils
export { mcpRelease } from '../utils/mcp-release'
// Re-export from individual modules for backward compatibility
export { mcpDoctor } from './mcp-doctor'
export { mcpInstall, mcpList, mcpSearch, mcpUninstall } from './mcp-market'

export { listProfiles, mcpProfile, showCurrentProfile, useProfile } from './mcp-profile'

export interface McpCommandOptions {
  lang?: SupportedLang
  tool?: CodeToolType
  verbose?: boolean
}

function resolveMcpTool(options: McpCommandOptions = {}): 'claude-code' | 'codex' {
  if (options.tool === 'codex' || options.tool === 'claude-code') {
    return options.tool
  }

  const zcfConfig = readZcfConfig()
  if (zcfConfig?.codeToolType && isCodeToolType(zcfConfig.codeToolType)) {
    return zcfConfig.codeToolType === 'codex' ? 'codex' : 'claude-code'
  }

  return 'claude-code'
}

function getServiceTier(
  serviceId: string,
  tiers: Record<string, 'core' | 'ondemand' | 'scenario'>,
): 'core' | 'ondemand' | 'scenario' {
  const directMatch = tiers[serviceId]
  if (directMatch) {
    return directMatch
  }

  const caseInsensitiveMatch = Object.entries(tiers).find(
    ([id]) => id.toLowerCase() === serviceId.toLowerCase(),
  )

  return caseInsensitiveMatch?.[1] || 'ondemand'
}

/**
 * MCP 快速状态查看
 */
export async function mcpStatus(options: McpCommandOptions = {}): Promise<void> {
  const { readMcpConfig } = await import('../utils/claude-config')
  const { readCodexConfig } = await import('../utils/code-tools/codex')
  const { checkMcpPerformance, formatPerformanceWarning } = await import('../utils/mcp-performance')
  const { MCP_SERVICE_TIERS } = await import('../config/mcp-tiers')

  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'
  const targetTool = resolveMcpTool(options)
  const services = targetTool === 'codex'
    ? (readCodexConfig()?.mcpServices || []).map(service => service.id)
    : Object.keys((await readMcpConfig())?.mcpServers || {})

  console.log('')
  console.log(ansis.bold.cyan(isZh
    ? `⚡ ${targetTool === 'codex' ? 'Codex' : 'Claude Code'} MCP 快速状态`
    : `⚡ ${targetTool === 'codex' ? 'Codex' : 'Claude Code'} MCP Quick Status`))
  console.log(ansis.dim('─'.repeat(40)))

  // 分类统计
  let coreCount = 0
  let ondemandCount = 0
  let scenarioCount = 0

  for (const svc of services) {
    const tier = getServiceTier(svc, MCP_SERVICE_TIERS)
    if (tier === 'core')
      coreCount++
    else if (tier === 'ondemand')
      ondemandCount++
    else scenarioCount++
  }

  console.log('')
  console.log(`${ansis.green('●')} ${isZh ? '核心服务' : 'Core'}: ${coreCount}`)
  console.log(`${ansis.yellow('●')} ${isZh ? '按需服务' : 'On-demand'}: ${ondemandCount}`)
  console.log(`${ansis.green('●')} ${isZh ? '场景服务' : 'Scenario'}: ${scenarioCount}`)
  console.log(`${ansis.dim('─')} ${isZh ? '总计' : 'Total'}: ${services.length}`)

  // 性能检查
  const perfResult = checkMcpPerformance(services.length)
  if (perfResult) {
    console.log('')
    console.log(formatPerformanceWarning(perfResult, lang))
  }
  else {
    console.log('')
    console.log(ansis.green(isZh ? '✓ 性能状态良好' : '✓ Performance OK'))
  }

  console.log('')
  console.log(ansis.dim(isZh
    ? `提示: 使用 ccjk mcp doctor${targetTool === 'codex' ? ' -T codex' : ''} 查看详细诊断`
    : `Tip: Use ccjk mcp doctor${targetTool === 'codex' ? ' -T codex' : ''} for detailed diagnostics`))
}

/**
 * 显示 MCP 命令帮助
 */
export function mcpHelp(options: McpCommandOptions = {}): void {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🔧 MCP 管理命令' : '🔧 MCP Management Commands'))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')

  const commands = [
    {
      cmd: 'ccjk mcp status',
      desc: isZh ? '快速查看 MCP 状态' : 'Quick MCP status overview',
    },
    {
      cmd: 'ccjk mcp doctor',
      desc: isZh ? '健康检查与性能诊断' : 'Health check and diagnostics',
    },
    {
      cmd: 'ccjk mcp profile [name]',
      desc: isZh ? '切换配置预设 (minimal/development/full)' : 'Switch profile (minimal/development/full)',
    },
    {
      cmd: 'ccjk mcp profile use minimal -T codex',
      desc: isZh ? '切换 Codex 启动时加载的 MCP 组合' : 'Switch the MCP set loaded on Codex startup',
    },
    {
      cmd: 'ccjk mcp release',
      desc: isZh ? '释放闲置服务' : 'Release idle services',
    },
    {
      cmd: 'ccjk mcp market',
      desc: isZh ? 'MCP 服务市场' : 'MCP service marketplace',
    },
    {
      cmd: 'ccjk mcp list',
      desc: isZh ? '列出已安装服务' : 'List installed services',
    },
  ]

  for (const { cmd, desc } of commands) {
    console.log(`  ${ansis.green(cmd)}`)
    console.log(`    ${ansis.dim(desc)}`)
    console.log('')
  }

  console.log(ansis.dim('─'.repeat(50)))
  console.log(ansis.dim(isZh
    ? '💡 推荐: 使用 minimal 预设可显著提升性能'
    : '💡 Tip: Use minimal profile for best performance'))
}
