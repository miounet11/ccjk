/**
 * Brain Status Command - 显示能力路由和遥测统计
 */

import type { CapabilityLevel } from '../brain/capability-router'
import { getTelemetry } from '../brain/telemetry'
import { getSmartRouter } from '../brain/smart-router'
import { getCapabilityName } from '../brain/capability-router'

export interface BrainStatusOptions {
  detailed?: boolean
  json?: boolean
}

export async function brainStatusCommand(options: BrainStatusOptions): Promise<void> {
  try {
    const telemetry = getTelemetry()
    const router = getSmartRouter()
    const stats = await telemetry.getStats()
    const config = router.getConfig()

    if (options.json) {
      console.log(JSON.stringify({ stats, config }, null, 2))
      return
    }

    console.log('\n📊 Brain Status Report\n')
    console.log('═'.repeat(60))

    // 配置信息
    console.log('\n⚙️  Router Configuration:')
    console.log(`  能力偏好: ${config.capabilityPreference}/5 (${getPreferenceLabel(config.capabilityPreference)})`)
    console.log(`  自动Subagent阈值: ${config.autoSubagentThreshold}/10`)
    console.log(`  最大并行Agent: ${config.maxParallelAgents}`)
    console.log(`  遥测: ${config.enableTelemetry ? '✅ 启用' : '❌ 禁用'}`)
    console.log(`  显示决策理由: ${config.showReasoning ? '✅ 是' : '❌ 否'}`)

    // 总体统计
    console.log('\n📈 Overall Statistics:')
    console.log(`  总任务数: ${stats.totalTasks}`)

    if (stats.totalTasks === 0) {
      console.log('\n  暂无任务记录')
      console.log('\n═'.repeat(60))
      return
    }

    // 按层级统计
    console.log('\n🎯 By Capability Level:')
    for (const [level, levelStats] of Object.entries(stats.byLevel)) {
      const levelNum = Number(level) as CapabilityLevel
      const name = getCapabilityName(levelNum)
      const successRate = (levelStats.successRate * 100).toFixed(1)
      const avgDuration = levelStats.avgDuration.toFixed(1)
      const avgScore = levelStats.avgEffectScore.toFixed(1)

      console.log(`\n  Level ${level} - ${name}:`)
      console.log(`    任务数: ${levelStats.count}`)
      console.log(`    成功率: ${successRate}% ${getSuccessEmoji(levelStats.successRate)}`)
      console.log(`    平均耗时: ${avgDuration}s`)
      console.log(`    平均评分: ${avgScore}/10 ${getScoreEmoji(levelStats.avgEffectScore)}`)
    }

    // 最近趋势
    if (options.detailed && stats.recentTrend.length > 0) {
      console.log('\n📅 Recent Trend (Last 30 Days):')
      const recentDays = stats.recentTrend.slice(-7) // 最近7天
      for (const day of recentDays) {
        const successRate = (day.successRate * 100).toFixed(1)
        console.log(`  ${day.date}: ${day.count} tasks, ${successRate}% success`)
      }
    }

    // 建议
    if (stats.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      for (const rec of stats.recommendations) {
        console.log(`  • ${rec}`)
      }
    }

    console.log('\n═'.repeat(60))
    console.log()
  }
  catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

function getPreferenceLabel(pref: number): string {
  if (pref <= 2) return '优先简单'
  if (pref >= 4) return '优先复杂'
  return '平衡'
}

function getSuccessEmoji(rate: number): string {
  if (rate >= 0.9) return '🟢'
  if (rate >= 0.7) return '🟡'
  return '🔴'
}

function getScoreEmoji(score: number): string {
  if (score >= 8) return '🌟'
  if (score >= 6) return '👍'
  return '👎'
}
