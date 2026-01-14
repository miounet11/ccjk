/**
 * CCJK Providers Command
 * Manage API providers - list, health check, and recommendations
 */

import type { CodeToolType } from '../constants'
import ansis from 'ansis'
import { getApiProviderPresets } from '../config/api-providers'
import { i18n } from '../i18n'
import { ProviderHealthMonitor } from '../utils/provider-health'

export interface ProvidersOptions {
  lang?: string
  codeType?: CodeToolType
  verbose?: boolean
}

/**
 * List all available API providers
 */
export async function listProviders(options: ProvidersOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const codeType = (options.codeType || 'claude-code') as CodeToolType

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '📋 可用的 API 供应商' : '📋 Available API Providers'))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')

  try {
    const providers = await getApiProviderPresets(codeType)

    if (providers.length === 0) {
      console.log(ansis.yellow(isZh ? '未找到供应商' : 'No providers found'))
      console.log('')
      return
    }

    // Group by cloud vs local
    const cloudProviders = providers.filter(p => p.isCloud)
    const localProviders = providers.filter(p => !p.isCloud)

    if (cloudProviders.length > 0) {
      console.log(ansis.bold.green(isZh ? '☁️  云端供应商' : '☁️  Cloud Providers'))
      console.log('')
      for (const provider of cloudProviders) {
        displayProvider(provider, codeType, options.verbose || false, isZh)
      }
    }

    if (localProviders.length > 0) {
      if (cloudProviders.length > 0) {
        console.log('')
      }
      console.log(ansis.bold.blue(isZh ? '💾 本地供应商' : '💾 Local Providers'))
      console.log('')
      for (const provider of localProviders) {
        displayProvider(provider, codeType, options.verbose || false, isZh)
      }
    }

    console.log('')
    console.log(ansis.dim('─'.repeat(60)))
    console.log(ansis.dim(isZh
      ? `总计: ${providers.length} 个供应商 (${cloudProviders.length} 云端, ${localProviders.length} 本地)`
      : `Total: ${providers.length} providers (${cloudProviders.length} cloud, ${localProviders.length} local)`))
    console.log('')
  }
  catch (error) {
    console.error(ansis.red(isZh ? '❌ 获取供应商列表失败' : '❌ Failed to fetch providers'))
    if (options.verbose && error instanceof Error) {
      console.error(ansis.dim(error.message))
    }
    console.log('')
  }
}

/**
 * Display a single provider
 */
function displayProvider(provider: any, codeType: CodeToolType, verbose: boolean, isZh: boolean): void {
  const config = codeType === 'codex' ? provider.codex : provider.claudeCode

  console.log(`  ${ansis.bold(provider.name)} ${ansis.dim(`(${provider.id})`)}`)

  if (provider.description) {
    console.log(`    ${ansis.dim(provider.description)}`)
  }

  if (config) {
    console.log(`    ${ansis.cyan(isZh ? '接口地址' : 'Base URL')}: ${config.baseUrl}`)

    if (codeType === 'claude-code' && config.authType) {
      console.log(`    ${ansis.cyan(isZh ? '认证方式' : 'Auth Type')}: ${config.authType}`)
    }

    if (codeType === 'codex' && config.wireApi) {
      console.log(`    ${ansis.cyan(isZh ? '协议类型' : 'Wire API')}: ${config.wireApi}`)
    }

    if (verbose) {
      if (config.defaultModels && config.defaultModels.length > 0) {
        console.log(`    ${ansis.cyan(isZh ? '默认模型' : 'Default Models')}: ${config.defaultModels.join(', ')}`)
      }
      if (config.defaultModel) {
        console.log(`    ${ansis.cyan(isZh ? '默认模型' : 'Default Model')}: ${config.defaultModel}`)
      }
      if (provider.website) {
        console.log(`    ${ansis.cyan(isZh ? '官网' : 'Website')}: ${provider.website}`)
      }
    }
  }

  console.log('')
}

/**
 * Check health of all providers
 */
export async function checkProvidersHealth(options: ProvidersOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const codeType = (options.codeType || 'claude-code') as CodeToolType

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🏥 供应商健康检查' : '🏥 Provider Health Check'))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')

  try {
    const providers = await getApiProviderPresets(codeType)

    if (providers.length === 0) {
      console.log(ansis.yellow(isZh ? '未找到供应商' : 'No providers found'))
      console.log('')
      return
    }

    // Initialize health monitor
    const monitor = new ProviderHealthMonitor({
      timeout: 5000,
      degradedLatencyThreshold: 1000,
      unhealthyLatencyThreshold: 3000,
    })

    monitor.setProviders(providers)

    console.log(ansis.dim(isZh ? '正在检查供应商健康状态...' : 'Checking provider health...'))
    console.log('')

    // Check all providers
    const results = await Promise.all(
      providers.map(async (provider) => {
        const result = await monitor.checkHealth(provider)
        return { provider, result }
      }),
    )

    // Display results
    for (const { provider, result } of results) {
      const statusIcon = result.success
        ? ansis.green('✅')
        : ansis.red('❌')

      const latencyColor = result.latency < 1000
        ? ansis.green
        : result.latency < 3000
          ? ansis.yellow
          : ansis.red

      console.log(`${statusIcon} ${ansis.bold(provider.name)}`)

      if (result.success) {
        console.log(`    ${ansis.cyan(isZh ? '延迟' : 'Latency')}: ${latencyColor(`${result.latency}ms`)}`)
        console.log(`    ${ansis.green(isZh ? '状态: 正常' : 'Status: Healthy')}`)
      }
      else {
        console.log(`    ${ansis.red(isZh ? '状态: 不可用' : 'Status: Unavailable')}`)
        if (result.error) {
          console.log(`    ${ansis.dim(isZh ? '错误' : 'Error')}: ${result.error}`)
        }
      }

      console.log('')
    }

    // Summary
    const healthyCount = results.filter(r => r.result.success).length
    const unhealthyCount = results.length - healthyCount

    console.log(ansis.dim('─'.repeat(60)))
    console.log(ansis.bold(isZh ? '摘要' : 'Summary'))
    console.log(`  ${ansis.green('✅')} ${isZh ? '健康' : 'Healthy'}: ${healthyCount}`)
    console.log(`  ${ansis.red('❌')} ${isZh ? '不可用' : 'Unavailable'}: ${unhealthyCount}`)
    console.log('')
  }
  catch (error) {
    console.error(ansis.red(isZh ? '❌ 健康检查失败' : '❌ Health check failed'))
    if (options.verbose && error instanceof Error) {
      console.error(ansis.dim(error.message))
    }
    console.log('')
  }
}

/**
 * Recommend the best provider based on health metrics
 */
export async function recommendProvider(options: ProvidersOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const codeType = (options.codeType || 'claude-code') as CodeToolType

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🎯 供应商推荐' : '🎯 Provider Recommendation'))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')

  try {
    const providers = await getApiProviderPresets(codeType)

    if (providers.length === 0) {
      console.log(ansis.yellow(isZh ? '未找到供应商' : 'No providers found'))
      console.log('')
      return
    }

    // Initialize health monitor
    const monitor = new ProviderHealthMonitor({
      timeout: 5000,
      degradedLatencyThreshold: 1000,
      unhealthyLatencyThreshold: 3000,
    })

    monitor.setProviders(providers)

    console.log(ansis.dim(isZh ? '正在分析供应商性能...' : 'Analyzing provider performance...'))
    console.log('')

    // Check all providers
    await Promise.all(
      providers.map(async (provider) => {
        const result = await monitor.checkHealth(provider)
        // Update health data is handled internally by monitor
        return result
      }),
    )

    // Get sorted providers by health
    const sortedProviders = monitor.getProvidersByHealth()
    const bestProvider = sortedProviders[0]

    if (!bestProvider) {
      console.log(ansis.yellow(isZh ? '无法确定最佳供应商' : 'Unable to determine best provider'))
      console.log('')
      return
    }

    // Display recommendation
    console.log(ansis.bold.green(isZh ? '🏆 推荐供应商' : '🏆 Recommended Provider'))
    console.log('')
    console.log(`  ${ansis.bold.cyan(bestProvider.name)} ${ansis.dim(`(${bestProvider.id})`)}`)

    if (bestProvider.description) {
      console.log(`  ${ansis.dim(bestProvider.description)}`)
    }

    const health = monitor.getProviderHealth(bestProvider.id)
    if (health) {
      console.log('')
      console.log(ansis.bold(isZh ? '性能指标' : 'Performance Metrics'))
      console.log(`  ${ansis.cyan(isZh ? '延迟' : 'Latency')}: ${health.latency.toFixed(0)}ms`)
      console.log(`  ${ansis.cyan(isZh ? '成功率' : 'Success Rate')}: ${(health.successRate * 100).toFixed(1)}%`)
      console.log(`  ${ansis.cyan(isZh ? '状态' : 'Status')}: ${getStatusDisplay(health.status, isZh)}`)
    }

    // Show top 3 alternatives
    if (sortedProviders.length > 1) {
      console.log('')
      console.log(ansis.bold(isZh ? '备选供应商' : 'Alternative Providers'))
      console.log('')

      for (let i = 1; i < Math.min(4, sortedProviders.length); i++) {
        const provider = sortedProviders[i]
        const health = monitor.getProviderHealth(provider.id)

        console.log(`  ${i}. ${ansis.bold(provider.name)} ${ansis.dim(`(${provider.id})`)}`)
        if (health) {
          console.log(`     ${ansis.dim(`${health.latency.toFixed(0)}ms | ${(health.successRate * 100).toFixed(1)}% | ${health.status}`)}`)
        }
      }
    }

    console.log('')
    console.log(ansis.dim('─'.repeat(60)))
    console.log(ansis.dim(isZh
      ? '💡 提示: 使用 "ccjk config set provider <id>" 切换供应商'
      : '💡 Tip: Use "ccjk config set provider <id>" to switch provider'))
    console.log('')
  }
  catch (error) {
    console.error(ansis.red(isZh ? '❌ 推荐失败' : '❌ Recommendation failed'))
    if (options.verbose && error instanceof Error) {
      console.error(ansis.dim(error.message))
    }
    console.log('')
  }
}

/**
 * Get status display string
 */
function getStatusDisplay(status: string, isZh: boolean): string {
  const statusMap: Record<string, { en: string, zh: string, color: (s: string) => string }> = {
    healthy: { en: 'Healthy', zh: '健康', color: ansis.green },
    degraded: { en: 'Degraded', zh: '降级', color: ansis.yellow },
    unhealthy: { en: 'Unhealthy', zh: '不健康', color: ansis.red },
    unknown: { en: 'Unknown', zh: '未知', color: ansis.dim },
  }

  const info = statusMap[status] || statusMap.unknown
  const text = isZh ? info.zh : info.en
  return info.color(text)
}

/**
 * Main providers command handler
 */
export async function providersCommand(action: string, options: ProvidersOptions = {}): Promise<void> {
  switch (action) {
    case 'list':
    case 'ls':
      await listProviders(options)
      break

    case 'health':
    case 'check':
      await checkProvidersHealth(options)
      break

    case 'recommend':
    case 'rec':
      await recommendProvider(options)
      break

    default: {
      // Show help
      const isZh = i18n.language === 'zh-CN'
      console.log('')
      console.log(ansis.bold.cyan(isZh ? '📦 供应商管理命令' : '📦 Provider Management Commands'))
      console.log('')
      console.log(`  ${ansis.cyan('ccjk providers list')}        ${isZh ? '列出所有供应商' : 'List all providers'}`)
      console.log(`  ${ansis.cyan('ccjk providers health')}      ${isZh ? '检查供应商健康状态' : 'Check provider health'}`)
      console.log(`  ${ansis.cyan('ccjk providers recommend')}   ${isZh ? '推荐最佳供应商' : 'Recommend best provider'}`)
      console.log('')
      console.log(ansis.bold(isZh ? '选项' : 'Options'))
      console.log(`  ${ansis.green('--code-type, -T')} <type>   ${isZh ? '代码工具类型 (claude-code, codex)' : 'Code tool type (claude-code, codex)'}`)
      console.log(`  ${ansis.green('--verbose, -v')}            ${isZh ? '详细输出' : 'Verbose output'}`)
      console.log('')
    }
  }
}
