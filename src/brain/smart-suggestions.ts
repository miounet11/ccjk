/**
 * Smart Suggestions - 智能提示系统
 * 在合适的时机主动提示用户使用高级功能
 */

import type { SupportedLang } from '../constants'
import type { ConversationContext, GitStatus } from './practice-enforcer'

export interface Suggestion {
  actionId: number
  actionName: string
  reason: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  icon: string
}

export interface ContextAnalysis {
  complexity: number // 0-1
  hasTests: boolean
  linesChanged: number
  filesChanged: number
  failedAttempts: number
  isDebugging: boolean
  isPreparing ToCommit: boolean
  isLargeFeature: boolean
}

/**
 * 智能提示系统
 */
export class SmartSuggestions {
  private lang: SupportedLang

  constructor(lang: SupportedLang = 'zh-CN') {
    this.lang = lang
  }

  /**
   * 分析当前情况并生成建议
   */
  async analyze(context: ConversationContext): Promise<Suggestion[]> {
    const analysis = await this.analyzeContext(context)
    const suggestions: Suggestion[] = []

    // 规则 1: 多次修复失败 → 系统性调试
    if (analysis.failedAttempts >= 2) {
      suggestions.push({
        actionId: 5,
        actionName: 'Debug Issue',
        reason: this.t('suggestions.debug.multipleFailures', { count: analysis.failedAttempts }),
        priority: 'HIGH',
        icon: '🐛',
      })
    }

    // 规则 2: 复杂功能 → 计划驱动开发
    if (analysis.isLargeFeature && analysis.complexity > 0.7) {
      suggestions.push({
        actionId: 4,
        actionName: 'Plan Feature',
        reason: this.t('suggestions.plan.complexFeature'),
        priority: 'MEDIUM',
        icon: '📋',
      })
    }

    // 规则 3: 大量变更 → 代码审查
    if (analysis.isPreparingToCommit && analysis.linesChanged > 100) {
      suggestions.push({
        actionId: 2,
        actionName: 'Code Review',
        reason: this.t('suggestions.review.largeChanges', { lines: analysis.linesChanged }),
        priority: 'MEDIUM',
        icon: '🔍',
      })
    }

    // 规则 4: 新代码无测试 → TDD
    if (!analysis.hasTests && analysis.filesChanged > 0) {
      suggestions.push({
        actionId: 3,
        actionName: 'Write Tests',
        reason: this.t('suggestions.test.noTests'),
        priority: 'HIGH',
        icon: '✅',
      })
    }

    // 规则 5: 正在调试 → 系统性调试
    if (analysis.isDebugging && analysis.failedAttempts === 0) {
      suggestions.push({
        actionId: 5,
        actionName: 'Debug Issue',
        reason: this.t('suggestions.debug.systematic'),
        priority: 'LOW',
        icon: '🐛',
      })
    }

    // 规则 6: 准备提交 → 验证代码
    if (analysis.isPreparingToCommit) {
      suggestions.push({
        actionId: 7,
        actionName: 'Verify Code',
        reason: this.t('suggestions.verify.beforeCommit'),
        priority: 'MEDIUM',
        icon: '✓',
      })
    }

    // 按优先级排序
    return this.sortByPriority(suggestions)
  }

  /**
   * 分析上下文
   */
  private async analyzeContext(context: ConversationContext): Promise<ContextAnalysis> {
    const conversation = context.messages.map(m => m.content).join('\n').toLowerCase()

    // 计算复杂度
    const complexity = this.estimateComplexity(conversation)

    // 检查是否有测试
    const hasTests = context.recentFiles.some(f =>
      f.includes('.test.') || f.includes('.spec.'),
    )

    // 计算变更量
    const linesChanged = await this.estimateLinesChanged(context.gitStatus)
    const filesChanged = context.recentFiles.length

    // 检测失败次数
    const failedAttempts = context.failedAttempts || 0

    // 检测是否在调试
    const isDebugging = this.detectDebugging(conversation)

    // 检测是否准备提交
    const isPreparingToCommit = this.detectPreparingToCommit(conversation)

    // 检测是否是大型功能
    const isLargeFeature = this.detectLargeFeature(conversation, filesChanged)

    return {
      complexity,
      hasTests,
      linesChanged,
      filesChanged,
      failedAttempts,
      isDebugging,
      isPreparingToCommit,
      isLargeFeature,
    }
  }

  /**
   * 估算复杂度 (0-1)
   */
  private estimateComplexity(conversation: string): number {
    let score = 0

    // 关键词权重
    const complexityIndicators = [
      { keywords: ['complex', 'complicated', '复杂'], weight: 0.3 },
      { keywords: ['multiple', 'many', 'several', '多个', '很多'], weight: 0.2 },
      { keywords: ['integration', 'api', 'database', '集成', '数据库'], weight: 0.2 },
      { keywords: ['authentication', 'authorization', '认证', '授权'], weight: 0.2 },
      { keywords: ['async', 'concurrent', 'parallel', '异步', '并发'], weight: 0.1 },
    ]

    for (const indicator of complexityIndicators) {
      if (indicator.keywords.some(k => conversation.includes(k))) {
        score += indicator.weight
      }
    }

    return Math.min(score, 1)
  }

  /**
   * 估算变更行数
   */
  private async estimateLinesChanged(gitStatus?: GitStatus): Promise<number> {
    if (!gitStatus)
      return 0

    // 简化估算：每个文件平均 50 行
    const totalFiles = gitStatus.modified.length +
                      gitStatus.added.length +
                      gitStatus.deleted.length

    return totalFiles * 50
  }

  /**
   * 检测是否在调试
   */
  private detectDebugging(conversation: string): boolean {
    const debugKeywords = [
      'bug',
      'error',
      'issue',
      'problem',
      'fix',
      'debug',
      '错误',
      '问题',
      '修复',
      '调试',
    ]

    return debugKeywords.some(k => conversation.includes(k))
  }

  /**
   * 检测是否准备提交
   */
  private detectPreparingToCommit(conversation: string): boolean {
    const commitKeywords = [
      'commit',
      'push',
      'merge',
      'pr',
      'pull request',
      '提交',
      '推送',
      '合并',
    ]

    return commitKeywords.some(k => conversation.includes(k))
  }

  /**
   * 检测是否是大型功能
   */
  private detectLargeFeature(conversation: string, filesChanged: number): boolean {
    const largeFeatureKeywords = [
      'feature',
      'implement',
      'build',
      'create',
      'system',
      '功能',
      '实现',
      '构建',
      '创建',
      '系统',
    ]

    const hasLargeFeatureKeyword = largeFeatureKeywords.some(k => conversation.includes(k))
    const hasManyFiles = filesChanged > 3

    return hasLargeFeatureKeyword && hasManyFiles
  }

  /**
   * 按优先级排序
   */
  private sortByPriority(suggestions: Suggestion[]): Suggestion[] {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }

    return suggestions.sort((a, b) => {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  /**
   * 格式化建议为用户友好的消息
   */
  formatSuggestions(suggestions: Suggestion[]): string {
    if (suggestions.length === 0) {
      return ''
    }

    let message = this.t('suggestions.header') + '\n\n'

    for (const suggestion of suggestions) {
      const priority = this.formatPriority(suggestion.priority)
      message += `${suggestion.icon} ${priority} **${suggestion.actionName}** (输入 ${suggestion.actionId})\n`
      message += `   ${suggestion.reason}\n\n`
    }

    return message
  }

  /**
   * 格式化优先级
   */
  private formatPriority(priority: 'HIGH' | 'MEDIUM' | 'LOW'): string {
    const priorities: Record<string, Record<string, string>> = {
      'zh-CN': {
        HIGH: '🔴 高优先级',
        MEDIUM: '🟡 中优先级',
        LOW: '🟢 低优先级',
      },
      'en': {
        HIGH: '🔴 High Priority',
        MEDIUM: '🟡 Medium Priority',
        LOW: '🟢 Low Priority',
      },
    }

    return priorities[this.lang]?.[priority] || priority
  }

  /**
   * 国际化辅助函数
   */
  private t(key: string, params?: Record<string, any>): string {
    const messages: Record<string, Record<string, string>> = {
      'zh-CN': {
        'suggestions.header': '💡 智能建议',
        'suggestions.debug.multipleFailures': `检测到 ${params?.count || 0} 次修复失败，建议使用系统性调试方法`,
        'suggestions.debug.systematic': '建议使用系统性调试方法，避免盲目尝试',
        'suggestions.plan.complexFeature': '这是一个复杂功能，建议先规划再实现',
        'suggestions.review.largeChanges': `变更较大（约 ${params?.lines || 0} 行），建议进行代码审查`,
        'suggestions.test.noTests': '检测到新代码但没有测试，建议使用 TDD',
        'suggestions.verify.beforeCommit': '提交前建议验证代码质量',
      },
      'en': {
        'suggestions.header': '💡 Smart Suggestions',
        'suggestions.debug.multipleFailures': `${params?.count || 0} failed attempts detected, suggest systematic debugging`,
        'suggestions.debug.systematic': 'Suggest using systematic debugging to avoid blind attempts',
        'suggestions.plan.complexFeature': 'This is a complex feature, suggest planning before implementation',
        'suggestions.review.largeChanges': `Large changes (~${params?.lines || 0} lines), suggest code review`,
        'suggestions.test.noTests': 'New code without tests detected, suggest using TDD',
        'suggestions.verify.beforeCommit': 'Suggest verifying code quality before commit',
      },
    }

    return messages[this.lang]?.[key] || key
  }
}

/**
 * 全局单例
 */
export const smartSuggestions = new SmartSuggestions()
