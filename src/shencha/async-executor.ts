import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'pathe'
import type {
  AuditCycle,
  AuditReport,
  EvaluatedIssue,
  ExecutionPlan,
  FixPlan,
  FixResult,
  GeneratedFix,
  Issue,
  ProjectContext,
  ScanResult,
} from './types'
import { LLMScanner, type LLMClient } from './llm-scanner'
import { LLMDecisionEngine } from './llm-decision'
import { LLMFixer } from './llm-fixer'
import { LLMVerifier } from './llm-verifier'
import { CCJK_CONFIG_DIR } from '../constants'

/**
 * Async job status
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * Async job
 */
export interface AsyncJob {
  id: string
  type: 'scan' | 'evaluate' | 'plan' | 'fix' | 'verify'
  status: JobStatus
  target?: string
  progress: number
  startedAt?: Date
  completedAt?: Date
  result?: any
  error?: string
}

/**
 * Execution config
 */
export interface ExecutionConfig {
  maxConcurrency: number
  autoFix: boolean
  requireReview: boolean
  stopOnCritical: boolean
  cycleDuration: number // hours
  reportDir: string
}

/**
 * Default execution config
 */
const DEFAULT_CONFIG: ExecutionConfig = {
  maxConcurrency: 3,
  autoFix: false,
  requireReview: true,
  stopOnCritical: true,
  cycleDuration: 72,
  reportDir: join(CCJK_CONFIG_DIR, 'shencha', 'reports'),
}

/**
 * Async ShenCha Executor - Fully LLM-orchestrated execution
 */
export class AsyncShenChaExecutor {
  private llmClient: LLMClient
  private scanner: LLMScanner
  private decision: LLMDecisionEngine
  private fixer: LLMFixer
  private verifier: LLMVerifier
  private config: ExecutionConfig
  private jobs: Map<string, AsyncJob> = new Map()
  private isRunning: boolean = false
  private currentCycle: AuditCycle | null = null

  constructor(llmClient: LLMClient, config: Partial<ExecutionConfig> = {}) {
    this.llmClient = llmClient
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.scanner = new LLMScanner(llmClient)
    this.decision = new LLMDecisionEngine(llmClient)
    this.fixer = new LLMFixer(llmClient)
    this.verifier = new LLMVerifier(llmClient)

    // Ensure report directory exists
    if (!existsSync(this.config.reportDir)) {
      mkdirSync(this.config.reportDir, { recursive: true })
    }
  }

  /**
   * LLM decides execution order
   */
  async planExecution(scanResults: ScanResult[]): Promise<ExecutionPlan> {
    const allIssues = scanResults.flatMap(r => r.issues)

    const prompt = `Plan the execution order for fixing these issues:

Total Issues: ${allIssues.length}
By Severity:
- Critical: ${allIssues.filter(i => i.severity === 'critical').length}
- High: ${allIssues.filter(i => i.severity === 'high').length}
- Medium: ${allIssues.filter(i => i.severity === 'medium').length}
- Low: ${allIssues.filter(i => i.severity === 'low').length}

Issues Summary:
${allIssues.slice(0, 20).map(i => `- [${i.severity}] ${i.title} (${i.location.file})`).join('\n')}
${allIssues.length > 20 ? `... and ${allIssues.length - 20} more` : ''}

Create an execution plan considering:
1. Fix critical issues first
2. Group related issues together
3. Consider dependencies between fixes
4. Estimate total time needed

Return JSON:
{
  "phases": [
    {
      "name": "phase name",
      "description": "what this phase does",
      "issueIds": ["ids of issues to fix"],
      "parallel": boolean,
      "estimatedMinutes": number
    }
  ],
  "totalEstimatedMinutes": number,
  "recommendations": ["strategic recommendations"]
}`

    const response = await this.llmClient.complete(prompt)
    return this.parseExecutionPlan(response, allIssues)
  }

  /**
   * Start a new audit cycle
   */
  async startCycle(context: ProjectContext): Promise<AuditCycle> {
    const cycleId = `cycle-${Date.now()}`

    this.currentCycle = {
      id: cycleId,
      startedAt: new Date(),
      status: 'running',
      context,
      scanResults: [],
      evaluatedIssues: [],
      fixResults: [],
      report: null,
    }

    this.isRunning = true

    // Run the cycle asynchronously
    this.runCycleAsync(this.currentCycle).catch(error => {
      if (this.currentCycle) {
        this.currentCycle.status = 'failed'
        this.currentCycle.error = error.message
      }
    })

    return this.currentCycle
  }

  /**
   * Run full audit cycle asynchronously
   */
  private async runCycleAsync(cycle: AuditCycle): Promise<void> {
    const readFile = async (path: string) => readFileSync(path, 'utf-8')
    const writeFile = async (path: string, content: string) => writeFileSync(path, content)

    try {
      // Phase 1: Scan
      this.updateCyclePhase(cycle, 'scanning')
      cycle.scanResults = await this.scanner.scanAll(cycle.context, readFile)

      // Phase 2: Evaluate
      this.updateCyclePhase(cycle, 'evaluating')
      const allIssues = cycle.scanResults.flatMap(r => r.issues)
      cycle.evaluatedIssues = await this.decision.evaluateAll(allIssues)

      // Check for critical issues
      const criticalIssues = cycle.evaluatedIssues.filter(
        i => i.adjustedSeverity === 'critical'
      )
      if (criticalIssues.length > 0 && this.config.stopOnCritical) {
        cycle.status = 'paused'
        cycle.pauseReason = `${criticalIssues.length} critical issues require review`
        return
      }

      // Phase 3: Plan and Fix (if auto-fix enabled)
      if (this.config.autoFix) {
        this.updateCyclePhase(cycle, 'fixing')

        for (const issue of cycle.evaluatedIssues) {
          const fixDecision = await this.decision.shouldAutoFix(issue)

          if (fixDecision.canAutoFix && !fixDecision.requiresReview) {
            const plan = await this.decision.planFix(issue)
            const currentCode = await readFile(issue.location.file)
            const fix = await this.fixer.generateFix(issue, plan, currentCode)
            const result = await this.fixer.applyFix(fix, writeFile, readFile)

            // Verify
            if (result.success) {
              const verification = await this.verifier.runFullVerification(fix, result, readFile)
              if (!verification.overallSuccess) {
                // Rollback
                await this.fixer.rollbackFix(result, writeFile, issue.location.file)
                result.success = false
                result.error = 'Verification failed'
              }
            }

            cycle.fixResults.push({ issue, plan, fix, result })
          }
        }
      }

      // Phase 4: Generate Report
      this.updateCyclePhase(cycle, 'reporting')
      cycle.report = await this.generateReport(cycle)

      // Save report
      const reportPath = join(
        this.config.reportDir,
        `report-${cycle.id}.json`
      )
      writeFileSync(reportPath, JSON.stringify(cycle.report, null, 2))

      cycle.status = 'completed'
      cycle.completedAt = new Date()
    }
    catch (error) {
      cycle.status = 'failed'
      cycle.error = error instanceof Error ? error.message : 'Unknown error'
      throw error
    }
    finally {
      this.isRunning = false
    }
  }

  /**
   * Update cycle phase
   */
  private updateCyclePhase(cycle: AuditCycle, phase: string): void {
    cycle.currentPhase = phase
  }

  /**
   * Generate audit report
   */
  async generateReport(cycle: AuditCycle): Promise<AuditReport> {
    const totalIssues = cycle.evaluatedIssues.length
    const fixedIssues = cycle.fixResults.filter(r => r.result.success).length
    const failedFixes = cycle.fixResults.filter(r => !r.result.success).length

    const bySeverity = {
      critical: cycle.evaluatedIssues.filter(i => i.adjustedSeverity === 'critical').length,
      high: cycle.evaluatedIssues.filter(i => i.adjustedSeverity === 'high').length,
      medium: cycle.evaluatedIssues.filter(i => i.adjustedSeverity === 'medium').length,
      low: cycle.evaluatedIssues.filter(i => i.adjustedSeverity === 'low').length,
    }

    const byType = {
      security: cycle.evaluatedIssues.filter(i => i.type === 'security').length,
      performance: cycle.evaluatedIssues.filter(i => i.type === 'performance').length,
      quality: cycle.evaluatedIssues.filter(i => i.type === 'quality').length,
      bug: cycle.evaluatedIssues.filter(i => i.type === 'bug').length,
      style: cycle.evaluatedIssues.filter(i => i.type === 'style').length,
    }

    // Calculate health score
    const healthScore = this.calculateHealthScore(cycle)

    return {
      cycleId: cycle.id,
      generatedAt: new Date(),
      summary: {
        totalIssues,
        fixedIssues,
        failedFixes,
        pendingReview: totalIssues - fixedIssues - failedFixes,
        bySeverity,
        byType,
        healthScore,
      },
      issues: cycle.evaluatedIssues,
      fixes: cycle.fixResults.map(r => ({
        issueId: r.issue.id,
        success: r.result.success,
        error: r.result.error,
      })),
      recommendations: this.generateRecommendations(cycle),
      duration: cycle.completedAt
        ? cycle.completedAt.getTime() - cycle.startedAt.getTime()
        : 0,
    }
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(cycle: AuditCycle): number {
    let score = 100

    for (const issue of cycle.evaluatedIssues) {
      switch (issue.adjustedSeverity) {
        case 'critical':
          score -= 20
          break
        case 'high':
          score -= 10
          break
        case 'medium':
          score -= 5
          break
        case 'low':
          score -= 2
          break
      }
    }

    // Bonus for fixed issues
    const fixedCount = cycle.fixResults.filter(r => r.result.success).length
    score += fixedCount * 5

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(cycle: AuditCycle): string[] {
    const recommendations: string[] = []

    const critical = cycle.evaluatedIssues.filter(i => i.adjustedSeverity === 'critical')
    if (critical.length > 0) {
      recommendations.push(`Address ${critical.length} critical issues immediately`)
    }

    const security = cycle.evaluatedIssues.filter(i => i.type === 'security')
    if (security.length > 0) {
      recommendations.push(`Review ${security.length} security issues for vulnerabilities`)
    }

    const performance = cycle.evaluatedIssues.filter(i => i.type === 'performance')
    if (performance.length > 5) {
      recommendations.push('Consider performance optimization sprint')
    }

    return recommendations
  }

  /**
   * Parse execution plan from LLM response
   */
  private parseExecutionPlan(response: string, issues: Issue[]): ExecutionPlan {
    try {
      const json = this.extractJson(response)
      return {
        phases: json.phases || [],
        totalEstimatedMinutes: json.totalEstimatedMinutes || 0,
        recommendations: json.recommendations || [],
        issues,
      }
    }
    catch {
      return {
        phases: [{
          name: 'Default',
          description: 'Process all issues',
          issueIds: issues.map(i => i.id),
          parallel: false,
          estimatedMinutes: issues.length * 5,
        }],
        totalEstimatedMinutes: issues.length * 5,
        recommendations: [],
        issues,
      }
    }
  }

  /**
   * Extract JSON from response
   */
  private extractJson(response: string): any {
    const match = response.match(/\{[\s\S]*\}/)
    if (match) {
      return JSON.parse(match[0])
    }
    return JSON.parse(response)
  }

  /**
   * Get current cycle status
   */
  getCycleStatus(): AuditCycle | null {
    return this.currentCycle
  }

  /**
   * Stop current cycle
   */
  stopCycle(): void {
    if (this.currentCycle) {
      this.currentCycle.status = 'cancelled'
      this.isRunning = false
    }
  }

  /**
   * Resume paused cycle
   */
  async resumeCycle(): Promise<void> {
    if (this.currentCycle && this.currentCycle.status === 'paused') {
      this.currentCycle.status = 'running'
      // Continue from where we left off
      // Implementation depends on what phase was paused
    }
  }

  /**
   * Check if executor is running
   */
  isExecuting(): boolean {
    return this.isRunning
  }
}

/**
 * Create executor instance
 */
export function createExecutor(
  llmClient: LLMClient,
  config?: Partial<ExecutionConfig>,
): AsyncShenChaExecutor {
  return new AsyncShenChaExecutor(llmClient, config)
}
