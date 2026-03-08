/**
 * Brain Config Command - 配置能力路由系统
 */

import { getSmartRouter } from '../brain/smart-router'
import type { RouterConfig } from '../brain/smart-router'

export interface BrainConfigOptions {
  preference?: number
  threshold?: number
  maxAgents?: number
  telemetry?: string
  reasoning?: string
  show?: boolean
  reset?: boolean
}

export async function brainConfigCommand(options: BrainConfigOptions): Promise<void> {
  try {
    const router = getSmartRouter()

    // 显示当前配置
    if (options.show) {
      const config = router.getConfig()
      console.log('\n⚙️  Current Brain Configuration:\n')
      console.log(`  能力偏好: ${config.capabilityPreference}/5`)
      console.log(`  自动Subagent阈值: ${config.autoSubagentThreshold}/10`)
      console.log(`  最大并行Agent: ${config.maxParallelAgents}`)
      console.log(`  遥测: ${config.enableTelemetry ? '启用' : '禁用'}`)
      console.log(`  显示决策理由: ${config.showReasoning ? '启用' : '禁用'}`)
      console.log()
      return
    }

    // 重置配置
    if (options.reset) {
      router.updateConfig({
        capabilityPreference: 2,
        autoSubagentThreshold: 7,
        maxParallelAgents: 3,
        enableTelemetry: true,
        showReasoning: true,
      })
      console.log('✅ Configuration reset to defaults')
      return
    }

    // 更新配置
    const updates: Partial<RouterConfig> = {}

    if (options.preference !== undefined) {
      if (options.preference < 1 || options.preference > 5) {
        console.error('❌ Preference must be between 1 and 5')
        process.exit(1)
      }
      updates.capabilityPreference = options.preference
    }

    if (options.threshold !== undefined) {
      if (options.threshold < 1 || options.threshold > 10) {
        console.error('❌ Threshold must be between 1 and 10')
        process.exit(1)
      }
      updates.autoSubagentThreshold = options.threshold
    }

    if (options.maxAgents !== undefined) {
      if (options.maxAgents < 1 || options.maxAgents > 10) {
        console.error('❌ Max agents must be between 1 and 10')
        process.exit(1)
      }
      updates.maxParallelAgents = options.maxAgents
    }

    if (options.telemetry !== undefined) {
      updates.enableTelemetry = options.telemetry === 'on'
    }

    if (options.reasoning !== undefined) {
      updates.showReasoning = options.reasoning === 'on'
    }

    if (Object.keys(updates).length === 0) {
      console.log('No configuration changes specified. Use --show to see current config.')
      return
    }

    router.updateConfig(updates)
    console.log('✅ Configuration updated:')
    for (const [key, value] of Object.entries(updates)) {
      console.log(`  ${key}: ${value}`)
    }
  }
  catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
