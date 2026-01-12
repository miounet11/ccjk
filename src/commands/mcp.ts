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
import { i18n } from '../i18n'

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

/**
 * MCP 快速状态查看
 */
export async function mcpStatus(options: McpCommandOptions = {}): Promise<void> {
  const { readMcpConfig } = await import('../utils/claude-config')
  const { checkMcpPerformance, formatPerformanceWarning } = await import('../utils/mcp-performance')
  const { MCP_SERVICE_TIERS } = await import('../config/mcp-tiers')

  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '⚡ MCP 快速状态' : '⚡ MCP Quick Status'))
  console.log(ansis.dim('─'.repeat(40)))

  const config = await readMcpConfig()
  const services = Object.keys(config?.mcpServers || {})

  // 分类统计
  let coreCount = 0
  let ondemandCount = 0
  let scenarioCount = 0

  for (const svc of services) {
    const tier = MCP_SERVICE_TIERS[svc] || 'ondemand'
    if (tier === 'core')
      coreCount++
    else if (tier === 'ondemand')
      ondemandCount++
    else scenarioCount++
  }

  console.log('')
  console.log(`${ansis.green('●')} ${isZh ? '核心服务' : 'Core'}: ${coreCount}`)
  console.log(`${ansis.yellow('●')} ${isZh ? '按需服务' : 'On-demand'}: ${ondemandCount}`)
  console.log(`${ansis.blue('●')} ${isZh ? '场景服务' : 'Scenario'}: ${scenarioCount}`)
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
    ? '提示: 使用 ccjk mcp doctor 查看详细诊断'
    : 'Tip: Use ccjk mcp doctor for detailed diagnostics'))
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
      desc: isZh ? '切换配置预设 (minimal/dev/full)' : 'Switch profile (minimal/dev/full)',
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
