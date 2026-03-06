/**
 * Practice Enforcer - 最佳实践执行器
 * 自动检测用户是否违反了 Superpowers 定义的最佳实践
 */

import type { SupportedLang } from '../constants'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export type ViolationSeverity = 'ERROR' | 'WARNING' | 'INFO'

export interface Violation {
  type: string
  message: string
  severity: ViolationSeverity
  suggestion?: string
  actionId?: number // 建议的快捷操作
}

export interface ConversationContext {
  messages: Array<{ role: string, content: string }>
  recentFiles: string[]
  gitStatus?: GitStatus
  failedAttempts?: number
}

export interface GitStatus {
  modified: string[]
  added: string[]
  deleted: string[]
  untracked: string[]
}

/**
 * 最佳实践执行器
 */
export class PracticeEnforcer {
  private lang: SupportedLang
  private violationHistory: Map<string, number> = new Map()

  constructor(lang: SupportedLang = 'zh-CN') {
    this.lang = lang
  }

  /**
   * 检查所有可能的违规
   */
  async checkAll(context: ConversationContext): Promise<Violation[]> {
    const violations: Violation[] = []

    // TDD 违规检测
    const tddViolations = await this.checkTDDViolations(context)
    violations.push(...tddViolations)

    // Debug 违规检测
    const debugViolations = await this.checkDebugViolations(context)
    violations.push(...debugViolations)

    // Commit 违规检测
    const commitViolations = await this.checkCommitViolations(context)
    violations.push(...commitViolations)

    // Code Review 违规检测
    const reviewViolations = await this.checkReviewViolations(context)
    violations.push(...reviewViolations)

    return violations
  }

  /**
   * TDD 违规检测
   */
  async checkTDDViolations(context: ConversationContext): Promise<Violation[]> {
    const violations: Violation[] = []

    // 检测：新代码但没有测试
    const hasNewCode = context.recentFiles.some(f =>
      !f.includes('.test.')
      && !f.includes('.spec.')
      && (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx')),
    )

    const hasNewTests = context.recentFiles.some(f =>
      f.includes('.test.') || f.includes('.spec.'),
    )

    if (hasNewCode && !hasNewTests) {
      violations.push({
        type: 'TDD_NO_TESTS',
        message: this.t('violations.tdd.noTests'),
        severity: 'ERROR',
        suggestion: this.t('violations.tdd.noTestsSuggestion'),
        actionId: 3,
      })
    }

    // 检测：先写实现再写测试
    const conversation = context.messages.map(m => m.content).join('\n').toLowerCase()
    const hasImplementationFirst = this.detectImplementationFirst(conversation)

    if (hasImplementationFirst) {
      violations.push({
        type: 'TDD_IMPLEMENTATION_FIRST',
        message: this.t('violations.tdd.implementationFirst'),
        severity: 'ERROR',
        suggestion: this.t('violations.tdd.implementationFirstSuggestion'),
        actionId: 3,
      })
    }

    // 检测：测试立即通过（没有看到失败）
    const hasTestPassedImmediately = this.detectTestPassedImmediately(conversation)

    if (hasTestPassedImmediately) {
      violations.push({
        type: 'TDD_NO_RED_PHASE',
        message: this.t('violations.tdd.noRedPhase'),
        severity: 'WARNING',
        suggestion: this.t('violations.tdd.noRedPhaseSuggestion'),
        actionId: 3,
      })
    }

    return violations
  }

  /**
   * Debug 违规检测
   */
  async checkDebugViolations(context: ConversationContext): Promise<Violation[]> {
    const violations: Violation[] = []
    const conversation = context.messages.map(m => m.content).join('\n').toLowerCase()

    // 检测：直接提出修复而没有根因分析
    const hasFixProposal = this.detectFixProposal(conversation)
    const hasRootCauseAnalysis = this.detectRootCauseAnalysis(conversation)

    if (hasFixProposal && !hasRootCauseAnalysis) {
      violations.push({
        type: 'DEBUG_NO_ROOT_CAUSE',
        message: this.t('violations.debug.noRootCause'),
        severity: 'ERROR',
        suggestion: this.t('violations.debug.noRootCauseSuggestion'),
        actionId: 5,
      })
    }

    // 检测：多次修复失败
    const failedAttempts = context.failedAttempts || 0

    if (failedAttempts >= 2) {
      violations.push({
        type: 'DEBUG_MULTIPLE_FAILURES',
        message: this.t('violations.debug.multipleFailures', { count: failedAttempts }),
        severity: 'WARNING',
        suggestion: this.t('violations.debug.multipleFailuresSuggestion'),
        actionId: 5,
      })
    }

    if (failedAttempts >= 3) {
      violations.push({
        type: 'DEBUG_ARCHITECTURE_ISSUE',
        message: this.t('violations.debug.architectureIssue'),
        severity: 'ERROR',
        suggestion: this.t('violations.debug.architectureIssueSuggestion'),
      })
    }

    return violations
  }

  /**
   * Commit 违规检测
   */
  async checkCommitViolations(context: ConversationContext): Promise<Violation[]> {
    const violations: Violation[] = []

    if (!context.gitStatus) {
      return violations
    }

    const totalChanges = context.gitStatus.modified.length
      + context.gitStatus.added.length
      + context.gitStatus.deleted.length

    // 检测：大量变更但没有测试
    if (totalChanges > 5) {
      const hasTestChanges = [...context.gitStatus.modified, ...context.gitStatus.added]
        .some(f => f.includes('.test.') || f.includes('.spec.'))

      if (!hasTestChanges) {
        violations.push({
          type: 'COMMIT_NO_TESTS',
          message: this.t('violations.commit.noTests'),
          severity: 'WARNING',
          suggestion: this.t('violations.commit.noTestsSuggestion'),
          actionId: 3,
        })
      }
    }

    // 检测：大量变更建议 code review
    if (totalChanges > 10) {
      violations.push({
        type: 'COMMIT_LARGE_CHANGES',
        message: this.t('violations.commit.largeChanges'),
        severity: 'INFO',
        suggestion: this.t('violations.commit.largeChangesSuggestion'),
        actionId: 2,
      })
    }

    return violations
  }

  /**
   * Code Review 违规检测
   */
  async checkReviewViolations(context: ConversationContext): Promise<Violation[]> {
    const violations: Violation[] = []
    const conversation = context.messages.map(m => m.content).join('\n').toLowerCase()

    // 检测：准备合并但没有 review
    const hasMergeIntent = conversation.includes('merge')
      || conversation.includes('合并')
      || conversation.includes('pr')
      || conversation.includes('pull request')

    const hasReview = conversation.includes('review')
      || conversation.includes('审查')

    if (hasMergeIntent && !hasReview && context.gitStatus) {
      const totalChanges = context.gitStatus.modified.length
        + context.gitStatus.added.length

      if (totalChanges > 5) {
        violations.push({
          type: 'REVIEW_BEFORE_MERGE',
          message: this.t('violations.review.beforeMerge'),
          severity: 'WARNING',
          suggestion: this.t('violations.review.beforeMergeSuggestion'),
          actionId: 2,
        })
      }
    }

    return violations
  }

  /**
   * 检测是否先写了实现代码
   */
  private detectImplementationFirst(conversation: string): boolean {
    // 关键词：实现、完成、写好了
    const implementationKeywords = [
      'implemented',
      'completed',
      'finished',
      'wrote',
      '实现了',
      '完成了',
      '写好了',
    ]

    // 关键词：测试
    const testKeywords = [
      'test',
      'spec',
      '测试',
    ]

    // 查找第一次提到实现和测试的位置
    let firstImplementation = Number.POSITIVE_INFINITY
    let firstTest = Number.POSITIVE_INFINITY

    for (const keyword of implementationKeywords) {
      const index = conversation.indexOf(keyword)
      if (index !== -1 && index < firstImplementation) {
        firstImplementation = index
      }
    }

    for (const keyword of testKeywords) {
      const index = conversation.indexOf(keyword)
      if (index !== -1 && index < firstTest) {
        firstTest = index
      }
    }

    // 如果先提到实现，再提到测试，则违规
    return firstImplementation < firstTest
  }

  /**
   * 检测测试是否立即通过
   */
  private detectTestPassedImmediately(conversation: string): boolean {
    // 查找测试通过的模式，但没有先失败
    const passPattern = /(test.*pass|pass.*test|✓|✅|all.*pass|测试.*通过|通过.*测试)/i
    const failPattern = /(test.*fail|fail.*test|✗|❌|测试.*失败|失败.*测试)/i

    const hasPass = passPattern.test(conversation)
    const hasFail = failPattern.test(conversation)

    // 如果有通过但没有失败，可能违规
    return hasPass && !hasFail
  }

  /**
   * 检测是否提出了修复方案
   */
  private detectFixProposal(conversation: string): boolean {
    const fixKeywords = [
      'fix',
      'solve',
      'resolve',
      'change',
      'modify',
      '修复',
      '解决',
      '改成',
      '修改',
    ]

    return fixKeywords.some(keyword => conversation.includes(keyword))
  }

  /**
   * 检测是否进行了根因分析
   */
  private detectRootCauseAnalysis(conversation: string): boolean {
    const analysisKeywords = [
      'root cause',
      'because',
      'reason',
      'why',
      'investigate',
      'analyze',
      '根本原因',
      '根因',
      '因为',
      '原因',
      '为什么',
      '调查',
      '分析',
    ]

    return analysisKeywords.some(keyword => conversation.includes(keyword))
  }

  /**
   * 获取 Git 状态
   */
  async getGitStatus(): Promise<GitStatus | null> {
    try {
      const { stdout } = await execAsync('git status --porcelain')
      const lines = stdout.trim().split('\n').filter(Boolean)

      const status: GitStatus = {
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
      }

      for (const line of lines) {
        const statusCode = line.substring(0, 2)
        const file = line.substring(3)

        if (statusCode.includes('M'))
          status.modified.push(file)
        if (statusCode.includes('A'))
          status.added.push(file)
        if (statusCode.includes('D'))
          status.deleted.push(file)
        if (statusCode.includes('?'))
          status.untracked.push(file)
      }

      return status
    }
    catch {
      return null
    }
  }

  /**
   * 记录违规历史
   */
  recordViolation(type: string): void {
    const count = this.violationHistory.get(type) || 0
    this.violationHistory.set(type, count + 1)
  }

  /**
   * 获取违规次数
   */
  getViolationCount(type: string): number {
    return this.violationHistory.get(type) || 0
  }

  /**
   * 清除违规历史
   */
  clearHistory(): void {
    this.violationHistory.clear()
  }

  /**
   * 国际化辅助函数
   */
  private t(key: string, params?: Record<string, any>): string {
    // 简化版本，实际应该使用 i18n
    const messages: Record<string, Record<string, string>> = {
      'zh-CN': {
        'violations.tdd.noTests': '⚠️ 检测到新代码但没有对应的测试文件',
        'violations.tdd.noTestsSuggestion': '建议：输入 3 启动 TDD 工作流，先写测试再写实现',
        'violations.tdd.implementationFirst': '❌ 检测到先写了实现代码再写测试',
        'violations.tdd.implementationFirstSuggestion': '这违反了 TDD 原则。建议：删除实现代码，输入 3 重新开始',
        'violations.tdd.noRedPhase': '⚠️ 测试立即通过，没有看到 RED 阶段',
        'violations.tdd.noRedPhaseSuggestion': '如果测试立即通过，说明可能测试的是已有功能，或测试无效',
        'violations.debug.noRootCause': '❌ 检测到直接提出修复方案，但没有进行根因分析',
        'violations.debug.noRootCauseSuggestion': '建议：输入 5 启动系统性调试，先完成 Phase 1: Root Cause Investigation',
        'violations.debug.multipleFailures': `⚠️ 检测到 ${params?.count || 0} 次修复失败`,
        'violations.debug.multipleFailuresSuggestion': '建议：输入 5 启动系统性调试，重新分析根本原因',
        'violations.debug.architectureIssue': '🚨 3 次以上修复失败，这可能是架构问题',
        'violations.debug.architectureIssueSuggestion': '建议：停止继续修复，质疑当前架构设计，考虑重构',
        'violations.commit.noTests': '⚠️ 大量代码变更但没有测试',
        'violations.commit.noTestsSuggestion': '建议：输入 3 添加测试，确保代码质量',
        'violations.commit.largeChanges': '💡 检测到大量代码变更',
        'violations.commit.largeChangesSuggestion': '建议：输入 2 进行代码审查，确保变更质量',
        'violations.review.beforeMerge': '⚠️ 准备合并但没有进行代码审查',
        'violations.review.beforeMergeSuggestion': '建议：输入 2 进行代码审查，避免问题进入主分支',
      },
      'en': {
        'violations.tdd.noTests': '⚠️ New code detected without corresponding tests',
        'violations.tdd.noTestsSuggestion': 'Suggestion: Enter 3 to start TDD workflow, write tests first',
        'violations.tdd.implementationFirst': '❌ Implementation written before tests',
        'violations.tdd.implementationFirstSuggestion': 'This violates TDD principles. Suggestion: Delete implementation, enter 3 to restart',
        'violations.tdd.noRedPhase': '⚠️ Test passed immediately, no RED phase observed',
        'violations.tdd.noRedPhaseSuggestion': 'If test passes immediately, it may be testing existing functionality or invalid',
        'violations.debug.noRootCause': '❌ Fix proposed without root cause analysis',
        'violations.debug.noRootCauseSuggestion': 'Suggestion: Enter 5 for systematic debugging, complete Phase 1: Root Cause Investigation first',
        'violations.debug.multipleFailures': `⚠️ ${params?.count || 0} failed fix attempts detected`,
        'violations.debug.multipleFailuresSuggestion': 'Suggestion: Enter 5 for systematic debugging, re-analyze root cause',
        'violations.debug.architectureIssue': '🚨 3+ failed fixes, this may be an architectural issue',
        'violations.debug.architectureIssueSuggestion': 'Suggestion: Stop fixing, question current architecture, consider refactoring',
        'violations.commit.noTests': '⚠️ Large code changes without tests',
        'violations.commit.noTestsSuggestion': 'Suggestion: Enter 3 to add tests, ensure code quality',
        'violations.commit.largeChanges': '💡 Large code changes detected',
        'violations.commit.largeChangesSuggestion': 'Suggestion: Enter 2 for code review, ensure change quality',
        'violations.review.beforeMerge': '⚠️ Preparing to merge without code review',
        'violations.review.beforeMergeSuggestion': 'Suggestion: Enter 2 for code review, avoid issues in main branch',
      },
    }

    return messages[this.lang]?.[key] || key
  }
}
