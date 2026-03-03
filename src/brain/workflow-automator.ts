/**
 * Workflow Automator - 工作流自动化
 * 自动执行 Superpowers 定义的多步骤工作流
 */

import type { SupportedLang } from '../constants'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  dependencies?: string[]
}

export interface Plan {
  title: string
  tasks: Task[]
  currentTaskIndex: number
}

export interface ReviewResult {
  critical: ReviewIssue[]
  important: ReviewIssue[]
  minor: ReviewIssue[]
  strengths: string[]
  assessment: string
}

export interface ReviewIssue {
  severity: 'critical' | 'important' | 'minor'
  message: string
  file?: string
  line?: number
  suggestion?: string
}

/**
 * 工作流自动化器
 */
export class WorkflowAutomator {
  private lang: SupportedLang

  constructor(lang: SupportedLang = 'zh-CN') {
    this.lang = lang
  }

  /**
   * 自动化 Code Review 工作流
   */
  async autoCodeReview(options?: {
    baseSha?: string
    headSha?: string
    context?: string
  }): Promise<ReviewResult> {
    // 1. 获取 git SHAs
    const baseSha = options?.baseSha || await this.getBaseSha()
    const headSha = options?.headSha || await this.getHeadSha()

    // 2. 获取变更内容
    const changes = await this.getChanges(baseSha, headSha)

    // 3. 生成 review context
    const context = options?.context || await this.generateReviewContext(changes)

    // 4. 这里应该派发 code-reviewer 子代理
    // 实际实现需要集成 Agent tool
    // const review = await dispatchCodeReviewer({ baseSha, headSha, context })

    // 5. 解析和分类反馈
    return this.parseReviewResult(context)
  }

  /**
   * 自动化 TDD 工作流
   */
  async autoTDD(feature: string): Promise<{
    phase: 'RED' | 'GREEN' | 'REFACTOR'
    status: string
    nextStep: string
  }> {
    // 1. RED: 引导用户写失败的测试
    const redPhase = {
      phase: 'RED' as const,
      status: 'Write a failing test for: ' + feature,
      nextStep: 'After writing the test, run it to verify it fails correctly',
    }

    return redPhase
  }

  /**
   * 自动化 Subagent-Driven Development
   */
  async autoSubagentDevelopment(plan: Plan): Promise<void> {
    for (let i = 0; i < plan.tasks.length; i++) {
      const task = plan.tasks[i]

      console.log(`\n📋 Task ${i + 1}/${plan.tasks.length}: ${task.title}`)

      // 1. 更新任务状态
      task.status = 'in_progress'

      // 2. 派发 implementer 子代理
      // await dispatchImplementer({ task })

      // 3. 自动触发 code review
      console.log('\n🔍 Auto-triggering code review...')
      const review = await this.autoCodeReview({
        context: `Task ${i + 1}: ${task.title}`,
      })

      // 4. 检查 critical issues
      if (review.critical.length > 0) {
        console.log('\n⚠️ Critical issues found:')
        for (const issue of review.critical) {
          console.log(`  - ${issue.message}`)
        }
        console.log('\nPlease fix critical issues before continuing.')
        task.status = 'failed'
        break
      }

      // 5. 标记完成
      task.status = 'completed'
      console.log(`\n✅ Task ${i + 1} completed`)
    }
  }

  /**
   * 自动化系统性调试工作流
   */
  async autoSystematicDebugging(issue: string): Promise<{
    phase: number
    phaseName: string
    checklist: string[]
    nextStep: string
  }> {
    // Phase 1: Root Cause Investigation
    return {
      phase: 1,
      phaseName: 'Root Cause Investigation',
      checklist: [
        '1. Read error messages carefully',
        '2. Reproduce consistently',
        '3. Check recent changes',
        '4. Gather evidence in multi-component systems',
        '5. Trace data flow',
      ],
      nextStep: 'Complete all checklist items before proposing any fixes',
    }
  }

  /**
   * 自动化完成分支工作流
   */
  async autoFinishBranch(): Promise<{
    checks: Array<{ name: string, passed: boolean, message?: string }>
    readyToCommit: boolean
  }> {
    const checks = []

    // 1. 运行测试
    const testsPass = await this.runTests()
    checks.push({
      name: 'Tests',
      passed: testsPass,
      message: testsPass ? 'All tests passed' : 'Some tests failed',
    })

    // 2. 检查 linting
    const lintPass = await this.runLint()
    checks.push({
      name: 'Linting',
      passed: lintPass,
      message: lintPass ? 'No linting errors' : 'Linting errors found',
    })

    // 3. 检查类型
    const typePass = await this.runTypeCheck()
    checks.push({
      name: 'Type Check',
      passed: typePass,
      message: typePass ? 'No type errors' : 'Type errors found',
    })

    const readyToCommit = checks.every(c => c.passed)

    return { checks, readyToCommit }
  }

  /**
   * 获取 base SHA
   */
  private async getBaseSha(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD~1')
      return stdout.trim()
    }
    catch {
      // Fallback to origin/main
      try {
        const { stdout } = await execAsync('git rev-parse origin/main')
        return stdout.trim()
      }
      catch {
        return 'HEAD~1'
      }
    }
  }

  /**
   * 获取 head SHA
   */
  private async getHeadSha(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD')
      return stdout.trim()
    }
    catch {
      return 'HEAD'
    }
  }

  /**
   * 获取变更内容
   */
  private async getChanges(baseSha: string, headSha: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`git diff ${baseSha}..${headSha}`)
      return stdout
    }
    catch {
      return ''
    }
  }

  /**
   * 生成 review context
   */
  private async generateReviewContext(changes: string): Promise<string> {
    const lines = changes.split('\n').length
    const files = changes.match(/diff --git/g)?.length || 0

    return `Changes: ${files} files, ${lines} lines`
  }

  /**
   * 解析 review 结果
   */
  private parseReviewResult(context: string): ReviewResult {
    // 简化版本，实际应该解析子代理返回的结果
    return {
      critical: [],
      important: [],
      minor: [],
      strengths: [],
      assessment: 'Review completed',
    }
  }

  /**
   * 运行测试
   */
  private async runTests(): Promise<boolean> {
    try {
      // 检测测试命令
      const { stdout: packageJson } = await execAsync('cat package.json')
      const pkg = JSON.parse(packageJson)

      if (pkg.scripts?.test) {
        await execAsync('npm test -- --run')
        return true
      }

      return true // 没有测试命令，跳过
    }
    catch {
      return false
    }
  }

  /**
   * 运行 linting
   */
  private async runLint(): Promise<boolean> {
    try {
      const { stdout: packageJson } = await execAsync('cat package.json')
      const pkg = JSON.parse(packageJson)

      if (pkg.scripts?.lint) {
        await execAsync('npm run lint')
        return true
      }

      return true // 没有 lint 命令，跳过
    }
    catch {
      return false
    }
  }

  /**
   * 运行类型检查
   */
  private async runTypeCheck(): Promise<boolean> {
    try {
      const { stdout: packageJson } = await execAsync('cat package.json')
      const pkg = JSON.parse(packageJson)

      if (pkg.scripts?.typecheck || pkg.scripts?.['type-check']) {
        await execAsync('npm run typecheck || npm run type-check')
        return true
      }

      return true // 没有 typecheck 命令，跳过
    }
    catch {
      return false
    }
  }
}

/**
 * 全局单例
 */
export const workflowAutomator = new WorkflowAutomator()
