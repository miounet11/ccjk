/**
 * MCP Doctor Command
 * Health check and diagnostics for MCP services
 */

import type { SupportedLang } from '../constants'
import ansis from 'ansis'
import { getMcpTierConfig, getServicesByTier, MCP_SERVICE_TIERS } from '../config/mcp-tiers'
import { i18n } from '../i18n'
import { readMcpConfig } from '../utils/claude-config'
import {
  analyzeServices,
  calculateResourceUsage,
  checkMcpPerformance,
  formatPerformanceWarning,
  getOptimizationSuggestions,
} from '../utils/mcp-performance'

export interface McpDoctorOptions {
  lang?: SupportedLang
  verbose?: boolean
  service?: string
}

/**
 * Health status for a service
 */
export interface ServiceHealthStatus {
  serviceId: string
  status: 'healthy' | 'warning' | 'error' | 'unknown'
  tier: string
  autoStart: boolean
  idleTimeout?: number
  issues: string[]
  suggestions: string[]
}

/**
 * Check health of a specific service
 */
function checkServiceHealth(serviceId: string, configuredServices: string[]): ServiceHealthStatus {
  const tierConfig = getMcpTierConfig(serviceId)
  const tier = MCP_SERVICE_TIERS[serviceId] || 'ondemand'
  const isConfigured = configuredServices.includes(serviceId)

  const issues: string[] = []
  const suggestions: string[] = []
  let status: ServiceHealthStatus['status'] = 'healthy'

  // Check if service is configured but not in tier system
  if (isConfigured && !MCP_SERVICE_TIERS[serviceId]) {
    issues.push('Service not in tier system (using default: ondemand)')
    status = 'warning'
  }

  // Check for potential conflicts
  if (serviceId === 'Playwright' && configuredServices.includes('puppeteer')) {
    issues.push('Both Playwright and Puppeteer are enabled')
    suggestions.push('Consider using only one browser automation service')
    status = 'warning'
  }

  if (serviceId === 'puppeteer' && configuredServices.includes('Playwright')) {
    issues.push('Both Puppeteer and Playwright are enabled')
    suggestions.push('Consider using only one browser automation service')
    status = 'warning'
  }

  // Check scenario services that might not be needed
  if (tier === 'scenario' && isConfigured) {
    suggestions.push('Scenario service - consider disabling when not needed')
  }

  return {
    serviceId,
    status,
    tier,
    autoStart: tierConfig.autoStart,
    idleTimeout: tierConfig.idleTimeout,
    issues,
    suggestions,
  }
}

/**
 * Run MCP health check
 */
export async function mcpDoctor(options: McpDoctorOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🔍 MCP 健康检查' : '🔍 MCP Health Check'))
  console.log(ansis.dim('═'.repeat(60)))
  console.log('')

  // Read current MCP config
  const config = readMcpConfig()
  const configuredServices = config?.mcpServers ? Object.keys(config.mcpServers) : []

  // 1. Service Count Analysis
  console.log(ansis.bold(isZh ? '📊 服务统计' : '📊 Service Statistics'))
  console.log(ansis.dim('─'.repeat(40)))

  const coreServices = getServicesByTier('core')
  const ondemandServices = getServicesByTier('ondemand')
  const scenarioServices = getServicesByTier('scenario')

  const configuredCore = configuredServices.filter(s => coreServices.includes(s))
  const configuredOndemand = configuredServices.filter(s => ondemandServices.includes(s))
  const configuredScenario = configuredServices.filter(s => scenarioServices.includes(s))

  console.log(`  ${isZh ? '总计' : 'Total'}: ${ansis.bold(configuredServices.length.toString())} ${isZh ? '个服务' : 'services'}`)
  console.log(`  ${ansis.green('Core')}: ${configuredCore.length}/${coreServices.length}`)
  console.log(`  ${ansis.yellow('OnDemand')}: ${configuredOndemand.length}/${ondemandServices.length}`)
  console.log(`  ${ansis.green('Scenario')}: ${configuredScenario.length}/${scenarioServices.length}`)
  console.log('')

  // 2. Performance Warning
  const perfWarning = checkMcpPerformance(configuredServices.length)
  if (perfWarning) {
    console.log(ansis.bold(isZh ? '⚠️ 性能警告' : '⚠️ Performance Warning'))
    console.log(ansis.dim('─'.repeat(40)))
    console.log(formatPerformanceWarning(perfWarning, lang))
    console.log('')
  }

  // 3. Resource Usage Estimate
  const resourceUsage = calculateResourceUsage(configuredServices.length)
  console.log(ansis.bold(isZh ? '💻 资源使用估算' : '💻 Resource Usage Estimate'))
  console.log(ansis.dim('─'.repeat(40)))

  const ratingColors = {
    low: ansis.green,
    medium: ansis.yellow,
    high: ansis.red,
    critical: ansis.bgRed.white,
  }
  const ratingLabels = {
    low: isZh ? '低' : 'Low',
    medium: isZh ? '中' : 'Medium',
    high: isZh ? '高' : 'High',
    critical: isZh ? '严重' : 'Critical',
  }

  console.log(`  ${isZh ? '内存' : 'Memory'}: ~${resourceUsage.memory.value}${resourceUsage.memory.unit}`)
  console.log(`  ${isZh ? 'CPU' : 'CPU'}: ~${resourceUsage.cpu.value}${resourceUsage.cpu.unit}`)
  console.log(`  ${isZh ? '评级' : 'Rating'}: ${ratingColors[resourceUsage.rating](ratingLabels[resourceUsage.rating])}`)
  console.log('')

  // 4. Service Health Details (if verbose or specific service)
  if (options.verbose || options.service) {
    console.log(ansis.bold(isZh ? '🔧 服务详情' : '🔧 Service Details'))
    console.log(ansis.dim('─'.repeat(40)))

    const servicesToCheck = options.service
      ? [options.service]
      : configuredServices

    for (const serviceId of servicesToCheck) {
      const health = checkServiceHealth(serviceId, configuredServices)

      const statusIcon = {
        healthy: ansis.green('✔'),
        warning: ansis.yellow('⚠'),
        error: ansis.red('✖'),
        unknown: ansis.gray('?'),
      }

      const tierColor = {
        core: ansis.green,
        ondemand: ansis.yellow,
        scenario: ansis.green,
      }

      console.log(`  ${statusIcon[health.status]} ${ansis.bold(serviceId)}`)
      console.log(`    ${isZh ? '层级' : 'Tier'}: ${(tierColor[health.tier as keyof typeof tierColor] || ansis.gray)(health.tier)}`)

      if (health.idleTimeout) {
        console.log(`    ${isZh ? '空闲超时' : 'Idle Timeout'}: ${health.idleTimeout}s`)
      }

      if (health.issues.length > 0) {
        for (const issue of health.issues) {
          console.log(`    ${ansis.yellow('!')} ${issue}`)
        }
      }

      if (health.suggestions.length > 0) {
        for (const suggestion of health.suggestions) {
          console.log(`    ${ansis.dim('→')} ${suggestion}`)
        }
      }

      console.log('')
    }
  }

  // 5. Optimization Suggestions
  const suggestions = getOptimizationSuggestions(configuredServices)
  if (suggestions.length > 0) {
    console.log(ansis.bold(isZh ? '💡 优化建议' : '💡 Optimization Suggestions'))
    console.log(ansis.dim('─'.repeat(40)))

    for (const suggestion of suggestions) {
      console.log(`  • ${suggestion}`)
    }
    console.log('')
  }

  // 6. Quick Actions
  console.log(ansis.bold(isZh ? '🚀 快速操作' : '🚀 Quick Actions'))
  console.log(ansis.dim('─'.repeat(40)))
  console.log(`  ${ansis.green('ccjk mcp profile use minimal')} - ${isZh ? '切换到极简模式' : 'Switch to minimal mode'}`)
  console.log(`  ${ansis.green('ccjk mcp profile list')} - ${isZh ? '查看所有预设' : 'View all profiles'}`)
  console.log(`  ${ansis.green('ccjk mcp release')} - ${isZh ? '释放空闲服务' : 'Release idle services'}`)
  console.log('')

  // Summary
  console.log(ansis.dim('═'.repeat(60)))
  const summaryStatus = perfWarning?.level === 'critical'
    ? ansis.red(isZh ? '需要优化' : 'Needs Optimization')
    : perfWarning?.level === 'warning'
      ? ansis.yellow(isZh ? '建议优化' : 'Optimization Recommended')
      : ansis.green(isZh ? '状态良好' : 'Healthy')

  console.log(`${isZh ? '总体状态' : 'Overall Status'}: ${summaryStatus}`)
  console.log('')
}

/**
 * Analyze services for detailed report
 */
export async function analyzeServicesDetailed(options: McpDoctorOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  const config = readMcpConfig()
  const configuredServices = config?.mcpServers ? Object.keys(config.mcpServers) : []

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '📋 服务分析报告' : '📋 Service Analysis Report'))
  console.log(ansis.dim('═'.repeat(60)))
  console.log('')

  const analysis = analyzeServices(configuredServices)

  // Group by tier
  const byTier: Record<string, typeof analysis> = {
    core: [],
    ondemand: [],
    scenario: [],
  }

  for (const a of analysis) {
    if (byTier[a.tier]) {
      byTier[a.tier].push(a)
    }
  }

  for (const [tier, services] of Object.entries(byTier)) {
    if (services.length === 0)
      continue

    const tierLabel = {
      core: isZh ? '核心服务' : 'Core Services',
      ondemand: isZh ? '按需服务' : 'On-Demand Services',
      scenario: isZh ? '场景服务' : 'Scenario Services',
    }

    console.log(ansis.bold(tierLabel[tier as keyof typeof tierLabel]))
    console.log(ansis.dim('─'.repeat(40)))

    for (const service of services) {
      console.log(`  ${ansis.green('•')} ${service.serviceId}`)
      if (service.idleTimeout) {
        console.log(`    ${ansis.dim(isZh ? `空闲超时: ${service.idleTimeout}秒` : `Idle timeout: ${service.idleTimeout}s`)}`)
      }
      if (service.recommendation) {
        console.log(`    ${ansis.dim(isZh ? service.recommendationZh : service.recommendation)}`)
      }
    }
    console.log('')
  }
}
