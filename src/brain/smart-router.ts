/**
 * Smart Router - 智能任务路由系统
 *
 * 整合能力决策、遥测追踪、自动执行
 */

import type { CapabilityLevel, TaskContext, TaskDecision } from './capability-router'
import { decideCapability, getCapabilityName } from './capability-router'
import type { TaskLog } from './telemetry'
import { getTelemetry } from './telemetry'

export interface RouterConfig {
  /** 能力偏好 (1=优先简单, 5=优先复杂) */
  capabilityPreference: number

  /** 自动subagent阈值 (复杂度>=此值才自动用subagent) */
  autoSubagentThreshold: number

  /** 最大并行agent数 */
  maxParallelAgents: number

  /** 是否启用遥测 */
  enableTelemetry: boolean

  /** 是否显示决策理由 */
  showReasoning: boolean
}

export interface RouterResult {
  /** 决策结果 */
  decision: TaskDecision

  /** 是否应该执行 */
  shouldExecute: boolean

  /** 执行建议 */
  executionAdvice: string
}

export class SmartRouter {
  private config: RouterConfig
  private recentFailures = 0

  constructor(config: Partial<RouterConfig> = {}) {
    this.config = {
      capabilityPreference: config.capabilityPreference ?? 2,
      autoSubagentThreshold: config.autoSubagentThreshold ?? 7,
      maxParallelAgents: config.maxParallelAgents ?? 3,
      enableTelemetry: config.enableTelemetry ?? true,
      showReasoning: config.showReasoning ?? true,
    }
  }

  /**
   * 路由任务到合适的能力层级
   */
  async route(input: string, context: Partial<TaskContext> = {}): Promise<RouterResult> {
    const fullContext: TaskContext = {
      input,
      conversationTurns: context.conversationTurns ?? 0,
      cwd: context.cwd ?? process.cwd(),
      hasUncommittedChanges: context.hasUncommittedChanges ?? false,
      recentFailures: this.recentFailures,
    }

    // 决策
    const decision = decideCapability(fullContext)

    // 应用用户偏好
    const adjustedDecision = this.applyPreference(decision)

    // 生成执行建议
    const executionAdvice = this.generateAdvice(adjustedDecision)

    // 显示决策理由
    if (this.config.showReasoning) {
      console.log(`\n[Brain Router] 决策: ${getCapabilityName(adjustedDecision.level)}`)
      console.log(`  理由: ${adjustedDecision.reasoning}`)
      console.log(`  预期: ${adjustedDecision.expectedSteps}步 / ${adjustedDecision.expectedDuration}s`)
      console.log(`  复杂度: ${adjustedDecision.complexity}/10\n`)
    }

    return {
      decision: adjustedDecision,
      shouldExecute: this.shouldExecute(adjustedDecision),
      executionAdvice,
    }
  }

  /**
   * 应用用户偏好调整决策
   */
  private applyPreference(decision: TaskDecision): TaskDecision {
    const { capabilityPreference, autoSubagentThreshold } = this.config

    // 偏好简单 (1-2): 降级复杂任务
    if (capabilityPreference <= 2 && decision.level >= 3) {
      if (decision.complexity < autoSubagentThreshold) {
        return {
          ...decision,
          level: 2, // 降级到主Agent
          reasoning: `${decision.reasoning} (用户偏好简单，降级到主Agent)`,
        }
      }
    }

    // 偏好复杂 (4-5): 升级中等任务
    if (capabilityPreference >= 4 && decision.level === 2) {
      if (decision.complexity >= 5) {
        return {
          ...decision,
          level: 3, // 升级到Subagent
          reasoning: `${decision.reasoning} (用户偏好复杂，升级到Subagent)`,
        }
      }
    }

    return decision
  }

  /**
   * 判断是否应该执行
   */
  private shouldExecute(decision: TaskDecision): boolean {
    // 纯文本推理和Skill总是执行
    if (decision.level <= 1) return true

    // 主Agent总是执行
    if (decision.level === 2) return true

    // Subagent需要检查阈值
    if (decision.level === 3) {
      return decision.complexity >= this.config.autoSubagentThreshold
    }

    // 多Agent和长寿Session需要用户确认
    return false
  }

  /**
   * 生成执行建议
   */
  private generateAdvice(decision: TaskDecision): string {
    switch (decision.level) {
      case 0:
        return '直接回答，无需工具调用'
      case 1:
        return '使用Skill执行，单步完成'
      case 2:
        return '主Agent处理，预计3-5步完成'
      case 3:
        return `启动Subagent，预计${decision.expectedSteps}步完成`
      case 4:
        return '需要多Agent协作，建议用户确认'
      case 5:
        return '需要长寿Session，建议用户确认'
      default:
        return '未知层级'
    }
  }

  /**
   * 记录任务执行结果
   */
  async recordExecution(
    decision: TaskDecision,
    result: {
      success: boolean
      actualSteps: number
      duration: number
      effectScore: number
    },
  ): Promise<void> {
    if (!this.config.enableTelemetry) return

    const telemetry = getTelemetry()

    const log: TaskLog = {
      timestamp: new Date().toISOString(),
      task: decision.reasoning,
      level: decision.level,
      actualSteps: result.actualSteps,
      duration: result.duration,
      success: result.success,
      effectScore: result.effectScore,
      recommendation: this.generateRecommendation(decision, result),
    }

    await telemetry.logTask(log)

    // 更新失败计数
    if (!result.success) {
      this.recentFailures++
    } else {
      this.recentFailures = 0
    }
  }

  /**
   * 生成下次建议
   */
  private generateRecommendation(
    decision: TaskDecision,
    result: { success: boolean; effectScore: number },
  ): string {
    if (!result.success) {
      return `失败，下次考虑升级到Level ${decision.level + 1}`
    }

    if (result.effectScore < 7) {
      return `效果一般，下次考虑调整策略`
    }

    return `效果良好，继续使用Level ${decision.level}`
  }

  /**
   * 获取配置
   */
  getConfig(): RouterConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 重置失败计数
   */
  resetFailures(): void {
    this.recentFailures = 0
  }
}

// 全局单例
let globalRouter: SmartRouter | null = null

export function getSmartRouter(): SmartRouter {
  if (!globalRouter) {
    globalRouter = new SmartRouter()
  }
  return globalRouter
}

export function resetSmartRouter(): void {
  globalRouter = null
}
