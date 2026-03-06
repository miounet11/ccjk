/**
 * Hooks Integration - Hooks 集成
 * 通过 hooks 提供更好的推荐体验
 */

import type { SupportedLang } from '../constants'
import type { ConversationContext } from './practice-enforcer'
import { PracticeEnforcer } from './practice-enforcer'
import { skillTrigger } from './skill-trigger'
import { smartSuggestions } from './smart-suggestions'

export interface HookContext {
  userInput: string
  conversationHistory: Array<{ role: string, content: string }>
  recentFiles: string[]
  gitStatus?: any
}

export interface HookResponse {
  shouldBlock: boolean
  message?: string
  suggestions?: string[]
  autoExecute?: string
}

/**
 * Hooks 集成管理器
 */
export class HooksIntegration {
  private lang: SupportedLang
  private enforcer: PracticeEnforcer

  constructor(lang: SupportedLang = 'zh-CN') {
    this.lang = lang
    this.enforcer = new PracticeEnforcer(lang)
  }

  /**
   * 用户输入提交前的 Hook
   * 在用户按下回车前触发，可以：
   * 1. 自动识别意图并建议技能
   * 2. 检测违规并警告
   * 3. 自动执行高置信度的技能
   */
  async onUserPromptSubmit(context: HookContext): Promise<HookResponse> {
    const responses: HookResponse[] = []

    // 1. 技能触发检测
    const skillMatch = skillTrigger.getBestMatch(context.userInput)
    if (skillMatch) {
      // 高置信度自动执行
      if (skillTrigger.shouldAutoExecute(skillMatch)) {
        return {
          shouldBlock: false,
          autoExecute: skillTrigger.generateSkillCommand(skillMatch),
          message: this.t('hooks.autoExecuting', {
            skill: skillMatch.skillName,
            confidence: Math.round(skillMatch.confidence * 100),
          }),
        }
      }

      // 中等置信度建议
      if (skillMatch.confidence > 0.5) {
        responses.push({
          shouldBlock: false,
          message: skillTrigger.generateSuggestion(skillMatch),
        })
      }
    }

    // 2. 最佳实践检测
    const conversationContext: ConversationContext = {
      messages: context.conversationHistory,
      recentFiles: context.recentFiles,
      gitStatus: context.gitStatus,
    }

    const violations = await this.enforcer.checkAll(conversationContext)

    // 严重违规阻止
    const criticalViolations = violations.filter(v => v.severity === 'ERROR')
    if (criticalViolations.length > 0) {
      return {
        shouldBlock: true,
        message: this.formatViolations(criticalViolations),
        suggestions: criticalViolations
          .filter(v => v.actionId)
          .map(v => `输入 ${v.actionId} - ${v.suggestion}`),
      }
    }

    // 警告级违规提示
    const warnings = violations.filter(v => v.severity === 'WARNING')
    if (warnings.length > 0) {
      responses.push({
        shouldBlock: false,
        message: this.formatViolations(warnings),
        suggestions: warnings
          .filter(v => v.actionId)
          .map(v => `输入 ${v.actionId} - ${v.suggestion}`),
      })
    }

    // 3. 智能建议
    const suggestions = await smartSuggestions.analyze(conversationContext)
    if (suggestions.length > 0) {
      responses.push({
        shouldBlock: false,
        message: smartSuggestions.formatSuggestions(suggestions.slice(0, 2)),
      })
    }

    // 合并响应
    return this.mergeResponses(responses)
  }

  /**
   * 文件变更后的 Hook
   * 在文件被修改后触发，可以：
   * 1. 检测是否需要测试
   * 2. 检测是否需要文档更新
   * 3. 提示代码审查
   */
  async onFileChange(files: string[]): Promise<HookResponse> {
    const responses: HookResponse[] = []

    // 检测新代码无测试
    const hasNewCode = files.some(f =>
      !f.includes('.test.')
      && !f.includes('.spec.')
      && (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx')),
    )

    const hasNewTests = files.some(f =>
      f.includes('.test.') || f.includes('.spec.'),
    )

    if (hasNewCode && !hasNewTests) {
      responses.push({
        shouldBlock: false,
        message: this.t('hooks.fileChange.noTests'),
        suggestions: ['输入 3 - 使用 TDD 工作流'],
      })
    }

    // 检测 API 变更需要文档更新
    const hasApiChange = files.some(f =>
      f.includes('api') || f.includes('interface') || f.includes('type'),
    )

    if (hasApiChange) {
      responses.push({
        shouldBlock: false,
        message: this.t('hooks.fileChange.apiChange'),
        suggestions: ['输入 8 - 更新文档'],
      })
    }

    return this.mergeResponses(responses)
  }

  /**
   * Git 提交前的 Hook
   * 在 git commit 前触发，可以：
   * 1. 运行测试
   * 2. 检查代码质量
   * 3. 验证提交消息
   */
  async onPreCommit(context: HookContext): Promise<HookResponse> {
    const responses: HookResponse[] = []

    // 检查是否有未提交的测试
    const hasUncommittedTests = context.recentFiles.some(f =>
      f.includes('.test.') || f.includes('.spec.'),
    )

    if (!hasUncommittedTests) {
      responses.push({
        shouldBlock: true,
        message: this.t('hooks.preCommit.noTests'),
        suggestions: ['输入 3 - 添加测试', '输入 7 - 验证代码'],
      })
    }

    // 建议代码审查
    if (context.recentFiles.length > 5) {
      responses.push({
        shouldBlock: false,
        message: this.t('hooks.preCommit.largeChanges'),
        suggestions: ['输入 2 - 代码审查'],
      })
    }

    return this.mergeResponses(responses)
  }

  /**
   * 测试失败后的 Hook
   * 在测试失败后触发，可以：
   * 1. 记录失败次数
   * 2. 建议系统性调试
   * 3. 检测是否需要架构讨论
   */
  async onTestFailure(failureCount: number): Promise<HookResponse> {
    if (failureCount >= 3) {
      return {
        shouldBlock: true,
        message: this.t('hooks.testFailure.multipleFailures', { count: failureCount }),
        suggestions: [
          '输入 5 - 系统性调试',
          '考虑架构重构',
        ],
      }
    }

    if (failureCount >= 2) {
      return {
        shouldBlock: false,
        message: this.t('hooks.testFailure.twoFailures'),
        suggestions: ['输入 5 - 系统性调试'],
      }
    }

    return { shouldBlock: false }
  }

  /**
   * 合并多个响应
   */
  private mergeResponses(responses: HookResponse[]): HookResponse {
    if (responses.length === 0) {
      return { shouldBlock: false }
    }

    if (responses.length === 1) {
      return responses[0]
    }

    // 如果有任何阻止，则阻止
    const shouldBlock = responses.some(r => r.shouldBlock)

    // 合并消息
    const messages = responses
      .filter(r => r.message)
      .map(r => r.message)
      .join('\n\n')

    // 合并建议
    const suggestions = responses
      .flatMap(r => r.suggestions || [])
      .filter((s, i, arr) => arr.indexOf(s) === i) // 去重

    // 自动执行（只取第一个）
    const autoExecute = responses.find(r => r.autoExecute)?.autoExecute

    return {
      shouldBlock,
      message: messages || undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      autoExecute,
    }
  }

  /**
   * 格式化违规信息
   */
  private formatViolations(violations: any[]): string {
    if (violations.length === 0) {
      return ''
    }

    let message = ''

    for (const violation of violations) {
      const icon = violation.severity === 'ERROR' ? '❌' : '⚠️'
      message += `${icon} ${violation.message}\n`
      if (violation.suggestion) {
        message += `   💡 ${violation.suggestion}\n`
      }
      message += '\n'
    }

    return message.trim()
  }

  /**
   * 国际化辅助函数
   */
  private t(key: string, params?: Record<string, any>): string {
    const messages: Record<string, Record<string, string>> = {
      'zh-CN': {
        'hooks.autoExecuting': `🚀 自动执行: ${params?.skill} (置信度: ${params?.confidence}%)`,
        'hooks.fileChange.noTests': '⚠️ 检测到新代码但没有测试文件',
        'hooks.fileChange.apiChange': '💡 检测到 API 变更，建议更新文档',
        'hooks.preCommit.noTests': '❌ 提交前必须添加测试',
        'hooks.preCommit.largeChanges': '💡 大量变更，建议进行代码审查',
        'hooks.testFailure.multipleFailures': `🚨 ${params?.count || 0} 次测试失败，这可能是架构问题`,
        'hooks.testFailure.twoFailures': '⚠️ 2 次测试失败，建议使用系统性调试',
      },
      'en': {
        'hooks.autoExecuting': `🚀 Auto-executing: ${params?.skill} (confidence: ${params?.confidence}%)`,
        'hooks.fileChange.noTests': '⚠️ New code detected without test files',
        'hooks.fileChange.apiChange': '💡 API changes detected, suggest updating documentation',
        'hooks.preCommit.noTests': '❌ Tests required before commit',
        'hooks.preCommit.largeChanges': '💡 Large changes, suggest code review',
        'hooks.testFailure.multipleFailures': `🚨 ${params?.count || 0} test failures, this may be an architectural issue`,
        'hooks.testFailure.twoFailures': '⚠️ 2 test failures, suggest systematic debugging',
      },
    }

    return messages[this.lang]?.[key] || key
  }
}

/**
 * 全局单例
 */
export const hooksIntegration = new HooksIntegration()
