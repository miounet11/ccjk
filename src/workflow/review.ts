/**
 * Two-Stage Code Review System
 *
 * Implements Superpowers-style code review:
 * - Stage 1: Spec Compliance - Does the code meet the requirements?
 * - Stage 2: Code Quality - Is the code well-written?
 */

import type {
  ReviewIssue,
  ReviewSeverity,
  StageReviewResult,
  TaskReview,
  WorkflowSession,
  WorkflowTask,
} from './types'

/**
 * Review configuration
 */
export interface ReviewConfig {
  /** Maximum review iterations before escalation */
  maxIterations: number

  /** Whether to auto-fix minor issues */
  autoFixMinor: boolean

  /** Severity threshold for blocking (issues at or above this level block approval) */
  blockingThreshold: ReviewSeverity

  /** Enable verbose logging */
  verbose: boolean
}

/**
 * Default review configuration
 */
export const DEFAULT_REVIEW_CONFIG: ReviewConfig = {
  maxIterations: 3,
  autoFixMinor: true,
  blockingThreshold: 'major',
  verbose: false,
}

/**
 * Review context for analysis
 */
export interface ReviewContext {
  /** The task being reviewed */
  task: WorkflowTask

  /** The workflow session */
  session: WorkflowSession

  /** Original requirements/spec */
  spec: string

  /** Files modified by the task */
  modifiedFiles: string[]

  /** File contents (path -> content) */
  fileContents: Map<string, string>

  /** Previous review results (for iterations) */
  previousReviews?: TaskReview
}

/**
 * Spec compliance check result
 */
export interface SpecComplianceCheck {
  /** Requirement ID or description */
  requirement: string

  /** Whether the requirement is met */
  met: boolean

  /** Evidence or explanation */
  evidence: string

  /** Related file paths */
  relatedFiles?: string[]
}

/**
 * Code quality check categories
 */
export type QualityCategory
  = | 'naming' // Variable/function naming
    | 'structure' // Code structure and organization
    | 'error-handling' // Error handling patterns
    | 'performance' // Performance considerations
    | 'security' // Security best practices
    | 'testing' // Test coverage and quality
    | 'documentation' // Comments and documentation
    | 'style' // Code style consistency

/**
 * Code quality check result
 */
export interface QualityCheck {
  /** Quality category */
  category: QualityCategory

  /** Check name */
  name: string

  /** Whether the check passed */
  passed: boolean

  /** Severity if failed */
  severity?: ReviewSeverity

  /** Description of the issue or success */
  description: string

  /** File path (if applicable) */
  filePath?: string

  /** Line number (if applicable) */
  lineNumber?: number

  /** Suggested fix */
  suggestion?: string
}

/**
 * Two-Stage Review System
 *
 * @example
 * ```typescript
 * const reviewer = new TwoStageReviewer()
 *
 * // Perform full review
 * const result = await reviewer.review({
 *   task,
 *   session,
 *   spec: 'Implement user login with OAuth2',
 *   modifiedFiles: ['src/auth/login.ts'],
 *   fileContents: new Map([['src/auth/login.ts', '...']])
 * })
 *
 * if (result.status === 'passed') {
 *   console.log('Review passed!')
 * } else {
 *   console.log('Issues found:', result.specCompliance?.issues)
 * }
 * ```
 */
export class TwoStageReviewer {
  private config: ReviewConfig

  constructor(config: Partial<ReviewConfig> = {}) {
    this.config = { ...DEFAULT_REVIEW_CONFIG, ...config }
  }

  // ==========================================================================
  // Main Review Flow
  // ==========================================================================

  /**
   * Perform full two-stage review
   */
  async review(context: ReviewContext): Promise<TaskReview> {
    const review: TaskReview = {
      taskId: context.task.id,
      status: 'in-progress',
      iterations: (context.previousReviews?.iterations || 0) + 1,
      maxIterations: this.config.maxIterations,
    }

    this.log(`Starting review iteration ${review.iterations} for task: ${context.task.title}`)

    // Stage 1: Spec Compliance
    this.log('Stage 1: Spec Compliance Review')
    review.specCompliance = await this.reviewSpecCompliance(context)

    // If Stage 1 fails with blockers, don't proceed to Stage 2
    if (!review.specCompliance.passed && this.hasBlockingIssues(review.specCompliance.issues)) {
      review.status = 'failed'
      this.log('Stage 1 failed with blocking issues, skipping Stage 2')
      return review
    }

    // Stage 2: Code Quality
    this.log('Stage 2: Code Quality Review')
    review.codeQuality = await this.reviewCodeQuality(context)

    // Determine overall status
    review.status = this.determineOverallStatus(review)
    this.log(`Review completed with status: ${review.status}`)

    return review
  }

  /**
   * Review only spec compliance (Stage 1)
   */
  async reviewSpecCompliance(context: ReviewContext): Promise<StageReviewResult> {
    const issues: ReviewIssue[] = []
    const checks = await this.performSpecComplianceChecks(context)

    // Convert checks to issues
    for (const check of checks) {
      if (!check.met) {
        issues.push({
          id: `spec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          stage: 'spec-compliance',
          severity: 'major', // Spec violations are major by default
          title: `Requirement not met: ${check.requirement}`,
          description: check.evidence,
          filePath: check.relatedFiles?.[0],
          resolved: false,
        })
      }
    }

    const passed = issues.filter(i => this.isBlocking(i.severity)).length === 0

    return {
      stage: 'spec-compliance',
      passed,
      issues,
      summary: this.generateSpecComplianceSummary(checks, issues),
      reviewedAt: new Date(),
    }
  }

  /**
   * Review only code quality (Stage 2)
   */
  async reviewCodeQuality(context: ReviewContext): Promise<StageReviewResult> {
    const issues: ReviewIssue[] = []
    const checks = await this.performCodeQualityChecks(context)

    // Convert failed checks to issues
    for (const check of checks) {
      if (!check.passed) {
        issues.push({
          id: `quality-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          stage: 'code-quality',
          severity: check.severity || 'minor',
          title: `${check.category}: ${check.name}`,
          description: check.description,
          filePath: check.filePath,
          lineNumber: check.lineNumber,
          suggestion: check.suggestion,
          resolved: false,
        })
      }
    }

    const passed = issues.filter(i => this.isBlocking(i.severity)).length === 0

    return {
      stage: 'code-quality',
      passed,
      issues,
      summary: this.generateCodeQualitySummary(checks, issues),
      reviewedAt: new Date(),
    }
  }

  // ==========================================================================
  // Spec Compliance Checks
  // ==========================================================================

  /**
   * Perform spec compliance checks
   * This is a framework - actual checks would be implemented based on the spec
   */
  private async performSpecComplianceChecks(context: ReviewContext): Promise<SpecComplianceCheck[]> {
    const checks: SpecComplianceCheck[] = []

    // Parse requirements from spec
    const requirements = this.parseRequirements(context.spec)

    for (const req of requirements) {
      const check = await this.checkRequirement(req, context)
      checks.push(check)
    }

    // Add default checks
    checks.push(...await this.performDefaultSpecChecks(context))

    return checks
  }

  /**
   * Parse requirements from spec text
   */
  private parseRequirements(spec: string): string[] {
    const requirements: string[] = []

    // Split by common requirement patterns
    const lines = spec.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      // Match numbered requirements: "1. Do something"
      if (/^\d+\.\s+/.test(trimmed)) {
        requirements.push(trimmed.replace(/^\d+\.\s+/, ''))
      }
      // Match bullet points: "- Do something" or "* Do something"
      else if (/^[-*]\s+/.test(trimmed)) {
        requirements.push(trimmed.replace(/^[-*]\s+/, ''))
      }
      // Match "must", "should", "shall" statements
      else if (/\b(?:must|should|shall|need to|required to)\b/i.test(trimmed)) {
        requirements.push(trimmed)
      }
    }

    // If no structured requirements found, treat the whole spec as one requirement
    if (requirements.length === 0 && spec.trim()) {
      requirements.push(spec.trim())
    }

    return requirements
  }

  /**
   * Check a single requirement
   */
  private async checkRequirement(requirement: string, context: ReviewContext): Promise<SpecComplianceCheck> {
    // This is a placeholder - in a real implementation, this would use
    // AI/LLM to analyze whether the code meets the requirement

    // For now, we do basic keyword matching
    const keywords = this.extractKeywords(requirement)
    const relatedFiles: string[] = []
    let evidence = ''
    let met = false

    context.fileContents.forEach((content, filePath) => {
      const matchedKeywords = keywords.filter(kw =>
        content.toLowerCase().includes(kw.toLowerCase()),
      )

      if (matchedKeywords.length > 0) {
        relatedFiles.push(filePath)
        evidence += `Found keywords [${matchedKeywords.join(', ')}] in ${filePath}. `
        met = matchedKeywords.length >= keywords.length * 0.5 // At least 50% keywords found
      }
    })

    if (!met) {
      evidence = `Could not find sufficient evidence for: "${requirement}"`
    }

    return {
      requirement,
      met,
      evidence,
      relatedFiles,
    }
  }

  /**
   * Extract keywords from a requirement
   */
  private extractKeywords(requirement: string): string[] {
    // Remove common words and extract meaningful keywords
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
      'need',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'as',
      'into',
      'through',
      'and',
      'or',
      'but',
      'if',
      'then',
      'else',
      'when',
      'where',
      'how',
      'all',
      'each',
      'every',
      'both',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      'that',
      'this',
      'these',
      'those',
      'it',
      'its',
    ])

    return requirement
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
  }

  /**
   * Perform default spec compliance checks
   */
  private async performDefaultSpecChecks(context: ReviewContext): Promise<SpecComplianceCheck[]> {
    const checks: SpecComplianceCheck[] = []

    // Check: Files were actually modified
    if (context.modifiedFiles.length === 0) {
      checks.push({
        requirement: 'Task should modify at least one file',
        met: false,
        evidence: 'No files were modified by this task',
      })
    }
    else {
      checks.push({
        requirement: 'Task should modify at least one file',
        met: true,
        evidence: `Modified ${context.modifiedFiles.length} file(s)`,
        relatedFiles: context.modifiedFiles,
      })
    }

    // Check: No TODO/FIXME left in code
    let hasTodos = false
    const todoFiles: string[] = []

    context.fileContents.forEach((content, filePath) => {
      if (/\b(?:TODO|FIXME|XXX|HACK)\b/i.test(content)) {
        hasTodos = true
        todoFiles.push(filePath)
      }
    })

    checks.push({
      requirement: 'No unresolved TODO/FIXME comments',
      met: !hasTodos,
      evidence: hasTodos
        ? `Found TODO/FIXME comments in: ${todoFiles.join(', ')}`
        : 'No TODO/FIXME comments found',
      relatedFiles: todoFiles,
    })

    return checks
  }

  // ==========================================================================
  // Code Quality Checks
  // ==========================================================================

  /**
   * Perform code quality checks
   */
  private async performCodeQualityChecks(context: ReviewContext): Promise<QualityCheck[]> {
    const checks: QualityCheck[] = []

    context.fileContents.forEach((content, filePath) => {
      // Skip non-code files
      if (!this.isCodeFile(filePath)) {
        return
      }

      checks.push(...this.checkNaming(filePath, content))
      checks.push(...this.checkStructure(filePath, content))
      checks.push(...this.checkErrorHandling(filePath, content))
      checks.push(...this.checkDocumentation(filePath, content))
      checks.push(...this.checkStyle(filePath, content))
    })

    return checks
  }

  /**
   * Check naming conventions
   */
  private checkNaming(filePath: string, content: string): QualityCheck[] {
    const checks: QualityCheck[] = []

    // Check for single-letter variable names (except common ones like i, j, k, x, y)
    const singleLetterVars = content.match(/\b(const|let|var)\s+([a-z])\s*=/g)
    if (singleLetterVars) {
      const badVars = singleLetterVars.filter(v => !/\b[ijkxyn]\s*=/.test(v))
      if (badVars.length > 0) {
        checks.push({
          category: 'naming',
          name: 'Descriptive variable names',
          passed: false,
          severity: 'minor',
          description: 'Found single-letter variable names that could be more descriptive',
          filePath,
          suggestion: 'Use descriptive names that indicate the variable\'s purpose',
        })
      }
    }

    // Check for very long names (> 40 chars)
    const longNames = content.match(/\b(const|let|var|function)\s+(\w{40,})/g)
    if (longNames && longNames.length > 0) {
      checks.push({
        category: 'naming',
        name: 'Reasonable name length',
        passed: false,
        severity: 'suggestion',
        description: 'Found very long identifier names (>40 characters)',
        filePath,
        suggestion: 'Consider shorter, more concise names',
      })
    }

    return checks
  }

  /**
   * Check code structure
   */
  private checkStructure(filePath: string, content: string): QualityCheck[] {
    const checks: QualityCheck[] = []
    const lines = content.split('\n')

    // Check for very long functions (> 50 lines)
    let functionStart = -1
    let braceCount = 0
    let inFunction = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (/\b(?:function|async\s+function|=>\s*\{)/.test(line) && !inFunction) {
        functionStart = i
        inFunction = true
        braceCount = 0
      }

      if (inFunction) {
        braceCount += (line.match(/\{/g) || []).length
        braceCount -= (line.match(/\}/g) || []).length

        if (braceCount === 0 && functionStart >= 0) {
          const functionLength = i - functionStart + 1
          if (functionLength > 50) {
            checks.push({
              category: 'structure',
              name: 'Function length',
              passed: false,
              severity: 'minor',
              description: `Function starting at line ${functionStart + 1} is ${functionLength} lines long`,
              filePath,
              lineNumber: functionStart + 1,
              suggestion: 'Consider breaking this function into smaller, focused functions',
            })
          }
          inFunction = false
          functionStart = -1
        }
      }
    }

    // Check for deeply nested code (> 4 levels)
    let maxIndent = 0
    for (const line of lines) {
      const indent = line.match(/^(\s*)/)?.[1].length || 0
      const indentLevel = Math.floor(indent / 2) // Assuming 2-space indent
      maxIndent = Math.max(maxIndent, indentLevel)
    }

    if (maxIndent > 4) {
      checks.push({
        category: 'structure',
        name: 'Nesting depth',
        passed: false,
        severity: 'minor',
        description: `Code has ${maxIndent} levels of nesting`,
        filePath,
        suggestion: 'Consider early returns or extracting nested logic into separate functions',
      })
    }

    return checks
  }

  /**
   * Check error handling
   */
  private checkErrorHandling(filePath: string, content: string): QualityCheck[] {
    const checks: QualityCheck[] = []

    // Check for empty catch blocks
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(content)) {
      checks.push({
        category: 'error-handling',
        name: 'Empty catch blocks',
        passed: false,
        severity: 'major',
        description: 'Found empty catch blocks that silently swallow errors',
        filePath,
        suggestion: 'Log the error or handle it appropriately',
      })
    }

    // Check for catch blocks that only log
    if (/catch\s*\([^)]*\)\s*\{\s*console\.(?:log|error)\([^)]*\)\s*\}/.test(content)) {
      checks.push({
        category: 'error-handling',
        name: 'Catch-and-log only',
        passed: false,
        severity: 'minor',
        description: 'Found catch blocks that only log without proper error handling',
        filePath,
        suggestion: 'Consider re-throwing, returning an error state, or proper recovery',
      })
    }

    // Check for async functions without try-catch
    const asyncFunctions = content.match(/async\s+function\s+\w+|async\s+\([^)]*\)\s*=>/g)
    const hasTryCatch = /try\s*\{/.test(content)

    if (asyncFunctions && asyncFunctions.length > 0 && !hasTryCatch) {
      checks.push({
        category: 'error-handling',
        name: 'Async error handling',
        passed: false,
        severity: 'minor',
        description: 'Async functions found without try-catch blocks',
        filePath,
        suggestion: 'Wrap async operations in try-catch or use .catch()',
      })
    }

    return checks
  }

  /**
   * Check documentation
   */
  private checkDocumentation(filePath: string, content: string): QualityCheck[] {
    const checks: QualityCheck[] = []

    // Check for exported functions without JSDoc
    const exportedFunctions = content.match(/export\s+(async\s+)?function\s+\w+/g)
    const jsdocComments = content.match(/\/\*\*[\s\S]*?\*\//g)

    if (exportedFunctions && exportedFunctions.length > 0) {
      const jsdocCount = jsdocComments?.length || 0
      if (jsdocCount < exportedFunctions.length) {
        checks.push({
          category: 'documentation',
          name: 'JSDoc for exports',
          passed: false,
          severity: 'suggestion',
          description: `Found ${exportedFunctions.length} exported functions but only ${jsdocCount} JSDoc comments`,
          filePath,
          suggestion: 'Add JSDoc comments to exported functions',
        })
      }
    }

    return checks
  }

  /**
   * Check code style
   */
  private checkStyle(filePath: string, content: string): QualityCheck[] {
    const checks: QualityCheck[] = []
    const lines = content.split('\n')

    // Check for very long lines (> 120 chars)
    const longLines = lines.filter(line => line.length > 120)
    if (longLines.length > 0) {
      checks.push({
        category: 'style',
        name: 'Line length',
        passed: false,
        severity: 'suggestion',
        description: `Found ${longLines.length} lines exceeding 120 characters`,
        filePath,
        suggestion: 'Break long lines for better readability',
      })
    }

    // Check for console.log statements (should be removed in production)
    if (/console\.log\(/.test(content)) {
      checks.push({
        category: 'style',
        name: 'Console statements',
        passed: false,
        severity: 'minor',
        description: 'Found console.log statements',
        filePath,
        suggestion: 'Remove or replace with proper logging',
      })
    }

    // Check for debugger statements
    if (/\bdebugger\b/.test(content)) {
      checks.push({
        category: 'style',
        name: 'Debugger statements',
        passed: false,
        severity: 'major',
        description: 'Found debugger statements',
        filePath,
        suggestion: 'Remove debugger statements before committing',
      })
    }

    return checks
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Check if a file is a code file
   */
  private isCodeFile(filePath: string): boolean {
    const codeExtensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.mjs',
      '.cjs',
      '.vue',
      '.svelte',
      '.py',
      '.rb',
      '.go',
      '.rs',
      '.java',
      '.kt',
      '.c',
      '.cpp',
      '.h',
      '.hpp',
      '.cs',
      '.fs',
      '.php',
      '.swift',
    ]

    return codeExtensions.some(ext => filePath.endsWith(ext))
  }

  /**
   * Check if a severity level is blocking
   */
  private isBlocking(severity: ReviewSeverity): boolean {
    const severityOrder: ReviewSeverity[] = ['blocker', 'major', 'minor', 'suggestion']
    const thresholdIndex = severityOrder.indexOf(this.config.blockingThreshold)
    const severityIndex = severityOrder.indexOf(severity)

    return severityIndex <= thresholdIndex
  }

  /**
   * Check if issues contain blocking issues
   */
  private hasBlockingIssues(issues: ReviewIssue[]): boolean {
    return issues.some(issue => this.isBlocking(issue.severity))
  }

  /**
   * Determine overall review status
   */
  private determineOverallStatus(review: TaskReview): TaskReview['status'] {
    const specPassed = review.specCompliance?.passed ?? true
    const qualityPassed = review.codeQuality?.passed ?? true

    if (specPassed && qualityPassed) {
      return 'passed'
    }

    return 'failed'
  }

  /**
   * Generate spec compliance summary
   */
  private generateSpecComplianceSummary(checks: SpecComplianceCheck[], issues: ReviewIssue[]): string {
    const passed = checks.filter(c => c.met).length
    const total = checks.length
    const blockers = issues.filter(i => this.isBlocking(i.severity)).length

    let summary = `Spec Compliance: ${passed}/${total} requirements met.`

    if (blockers > 0) {
      summary += ` ${blockers} blocking issue(s) found.`
    }

    return summary
  }

  /**
   * Generate code quality summary
   */
  private generateCodeQualitySummary(checks: QualityCheck[], issues: ReviewIssue[]): string {
    const passed = checks.filter(c => c.passed).length
    const total = checks.length

    const bySeverity = {
      blocker: issues.filter(i => i.severity === 'blocker').length,
      major: issues.filter(i => i.severity === 'major').length,
      minor: issues.filter(i => i.severity === 'minor').length,
      suggestion: issues.filter(i => i.severity === 'suggestion').length,
    }

    let summary = `Code Quality: ${passed}/${total} checks passed.`

    if (issues.length > 0) {
      const parts: string[] = []
      if (bySeverity.blocker > 0)
        parts.push(`${bySeverity.blocker} blocker`)
      if (bySeverity.major > 0)
        parts.push(`${bySeverity.major} major`)
      if (bySeverity.minor > 0)
        parts.push(`${bySeverity.minor} minor`)
      if (bySeverity.suggestion > 0)
        parts.push(`${bySeverity.suggestion} suggestion`)

      summary += ` Issues: ${parts.join(', ')}.`
    }

    return summary
  }

  /**
   * Log message if verbose
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[TwoStageReviewer] ${message}`)
    }
  }
}

/**
 * Create a review for a task
 */
export function createTaskReview(taskId: string, maxIterations: number = 3): TaskReview {
  return {
    taskId,
    status: 'pending',
    iterations: 0,
    maxIterations,
  }
}

/**
 * Check if a review can be retried
 */
export function canRetryReview(review: TaskReview): boolean {
  return review.status === 'failed' && review.iterations < review.maxIterations
}

/**
 * Get all unresolved issues from a review
 */
export function getUnresolvedIssues(review: TaskReview): ReviewIssue[] {
  const issues: ReviewIssue[] = []

  if (review.specCompliance) {
    issues.push(...review.specCompliance.issues.filter(i => !i.resolved))
  }

  if (review.codeQuality) {
    issues.push(...review.codeQuality.issues.filter(i => !i.resolved))
  }

  return issues
}

/**
 * Format review result for display
 */
export function formatReviewResult(review: TaskReview, _locale: string = 'en'): string {
  const lines: string[] = []

  const statusEmoji = {
    'pending': '⏳',
    'in-progress': '🔄',
    'passed': '✅',
    'failed': '❌',
  }

  lines.push(`${statusEmoji[review.status]} Review Status: ${review.status.toUpperCase()}`)
  lines.push(`Iteration: ${review.iterations}/${review.maxIterations}`)
  lines.push('')

  if (review.specCompliance) {
    lines.push(`## Stage 1: Spec Compliance ${review.specCompliance.passed ? '✅' : '❌'}`)
    lines.push(review.specCompliance.summary)

    if (review.specCompliance.issues.length > 0) {
      lines.push('')
      lines.push('Issues:')
      for (const issue of review.specCompliance.issues) {
        const resolved = issue.resolved ? '✓' : '✗'
        lines.push(`  [${resolved}] [${issue.severity}] ${issue.title}`)
        if (issue.description) {
          lines.push(`      ${issue.description}`)
        }
      }
    }
    lines.push('')
  }

  if (review.codeQuality) {
    lines.push(`## Stage 2: Code Quality ${review.codeQuality.passed ? '✅' : '❌'}`)
    lines.push(review.codeQuality.summary)

    if (review.codeQuality.issues.length > 0) {
      lines.push('')
      lines.push('Issues:')
      for (const issue of review.codeQuality.issues) {
        const resolved = issue.resolved ? '✓' : '✗'
        const location = issue.filePath
          ? ` (${issue.filePath}${issue.lineNumber ? `:${issue.lineNumber}` : ''})`
          : ''
        lines.push(`  [${resolved}] [${issue.severity}] ${issue.title}${location}`)
        if (issue.suggestion) {
          lines.push(`      💡 ${issue.suggestion}`)
        }
      }
    }
  }

  return lines.join('\n')
}
