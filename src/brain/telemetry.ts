/**
 * Brain Telemetry System - 效果追踪与量化分析
 *
 * 记录每次任务执行的详细数据，用于：
 * 1. 验证决策是否正确
 * 2. 持续优化方法论
 * 3. 生成使用统计报告
 */

import { existsSync, mkdirSync } from 'node:fs'
import { appendFile, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'
import type { CapabilityLevel } from './capability-router'

export interface TaskLog {
  /** 时间戳 */
  timestamp: string

  /** 任务描述 */
  task: string

  /** 使用的能力层级 */
  level: CapabilityLevel

  /** 实际执行步数 */
  actualSteps: number

  /** 实际耗时（秒） */
  duration: number

  /** 是否成功 */
  success: boolean

  /** 效果评分 (1-10) */
  effectScore: number

  /** 下次建议 */
  recommendation: string

  /** 额外元数据 */
  metadata?: Record<string, unknown>
}

export interface TelemetryStats {
  /** 总任务数 */
  totalTasks: number

  /** 按层级统计 */
  byLevel: Record<
    CapabilityLevel,
    {
      count: number
      successRate: number
      avgDuration: number
      avgEffectScore: number
    }
  >

  /** 最近30天趋势 */
  recentTrend: {
    date: string
    count: number
    successRate: number
  }[]

  /** 建议 */
  recommendations: string[]
}

export class BrainTelemetry {
  private logPath: string

  constructor(logPath?: string) {
    const ccjkDir = join(homedir(), '.ccjk')
    if (!existsSync(ccjkDir)) {
      mkdirSync(ccjkDir, { recursive: true })
    }

    this.logPath = logPath ?? join(ccjkDir, 'task-decision-log.jsonl')
  }

  /**
   * 记录任务执行
   */
  async logTask(log: TaskLog): Promise<void> {
    const line = JSON.stringify({
      ...log,
      timestamp: log.timestamp || new Date().toISOString(),
    })

    await appendFile(this.logPath, `${line}\n`, 'utf-8')

    // 每10个任务自动分析一次
    const stats = await this.getStats()
    if (stats.totalTasks % 10 === 0) {
      await this.analyzeAndUpdate()
    }
  }

  /**
   * 读取所有日志
   */
  async readLogs(): Promise<TaskLog[]> {
    if (!existsSync(this.logPath)) {
      return []
    }

    const content = await readFile(this.logPath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    return lines.map(line => JSON.parse(line) as TaskLog)
  }

  /**
   * 获取统计数据
   */
  async getStats(): Promise<TelemetryStats> {
    const logs = await this.readLogs()

    if (logs.length === 0) {
      return {
        totalTasks: 0,
        byLevel: {} as any,
        recentTrend: [],
        recommendations: [],
      }
    }

    // 按层级统计
    const byLevel: Record<number, TaskLog[]> = {}
    for (const log of logs) {
      if (!byLevel[log.level]) {
        byLevel[log.level] = []
      }
      byLevel[log.level].push(log)
    }

    const levelStats: Record<
      CapabilityLevel,
      {
        count: number
        successRate: number
        avgDuration: number
        avgEffectScore: number
      }
    > = {} as any

    for (const [level, levelLogs] of Object.entries(byLevel)) {
      const successCount = levelLogs.filter(l => l.success).length
      const totalDuration = levelLogs.reduce((sum, l) => sum + l.duration, 0)
      const totalScore = levelLogs.reduce((sum, l) => sum + l.effectScore, 0)

      levelStats[Number(level) as CapabilityLevel] = {
        count: levelLogs.length,
        successRate: successCount / levelLogs.length,
        avgDuration: totalDuration / levelLogs.length,
        avgEffectScore: totalScore / levelLogs.length,
      }
    }

    // 最近30天趋势
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentLogs = logs.filter(
      log => new Date(log.timestamp) >= thirtyDaysAgo,
    )

    const dailyStats = new Map<string, { count: number; success: number }>()
    for (const log of recentLogs) {
      const date = log.timestamp.split('T')[0]
      const stats = dailyStats.get(date) ?? { count: 0, success: 0 }
      stats.count++
      if (log.success) stats.success++
      dailyStats.set(date, stats)
    }

    const recentTrend = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        successRate: stats.success / stats.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 生成建议
    const recommendations = this.generateRecommendations(levelStats)

    return {
      totalTasks: logs.length,
      byLevel: levelStats,
      recentTrend,
      recommendations,
    }
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(
    levelStats: Record<
      CapabilityLevel,
      {
        count: number
        successRate: number
        avgDuration: number
        avgEffectScore: number
      }
    >,
  ): string[] {
    const recommendations: string[] = []

    for (const [level, stats] of Object.entries(levelStats)) {
      const levelNum = Number(level) as CapabilityLevel

      // 成功率低于80%
      if (stats.successRate < 0.8) {
        recommendations.push(
          `Level ${levelNum} 成功率偏低 (${(stats.successRate * 100).toFixed(1)}%)，考虑降级到更简单的层级`,
        )
      }

      // 平均效果评分低于7
      if (stats.avgEffectScore < 7) {
        recommendations.push(
          `Level ${levelNum} 效果评分偏低 (${stats.avgEffectScore.toFixed(1)}/10)，需要优化执行策略`,
        )
      }

      // 平均耗时过长
      if (levelNum <= 2 && stats.avgDuration > 30) {
        recommendations.push(
          `Level ${levelNum} 平均耗时过长 (${stats.avgDuration.toFixed(1)}s)，考虑优化或升级`,
        )
      }
    }

    return recommendations
  }

  /**
   * 分析并更新方法论
   */
  private async analyzeAndUpdate(): Promise<void> {
    const stats = await this.getStats()

    if (stats.recommendations.length > 0) {
      console.log('\n📊 Brain Telemetry Analysis:')
      for (const rec of stats.recommendations) {
        console.log(`  💡 ${rec}`)
      }
      console.log()
    }
  }

  /**
   * 清空日志
   */
  async clear(): Promise<void> {
    if (existsSync(this.logPath)) {
      await appendFile(this.logPath, '', 'utf-8')
    }
  }
}

// 全局单例
let globalTelemetry: BrainTelemetry | null = null

export function getTelemetry(): BrainTelemetry {
  if (!globalTelemetry) {
    globalTelemetry = new BrainTelemetry()
  }
  return globalTelemetry
}

export function resetTelemetry(): void {
  globalTelemetry = null
}
