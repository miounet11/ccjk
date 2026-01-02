import type {
  FileChange,
  FixResult,
  GeneratedFix,
  NewIssue,
  Regression,
  VerifyResult,
} from './types'
import type { LLMClient } from './llm-scanner'

/**
 * LLM Verifier - Verifies fixes and checks for regressions
 */
export class LLMVerifier {
  private llmClient: LLMClient

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient
  }

  /**
   * LLM reads fixed code and verifies correctness
   */
  async verifyCodeCorrectness(
    fix: GeneratedFix,
    originalCode: string,
    newCode: string,
  ): Promise<VerifyResult> {
    const prompt = `Verify that this fix is correct:

Original Issue: ${fix.issueId}
Fix Approach: ${fix.approach}
File: ${fix.filePath}

Original Code:
\`\`\`
${originalCode}
\`\`\`

Fixed Code:
\`\`\`
${newCode}
\`\`\`

Changes Made:
${fix.changes.map(c => `- Lines ${c.startLine}-${c.endLine}: ${c.explanation}`).join('\n')}

Verify:
1. Does the fix address the original issue?
2. Is the fix syntactically correct?
3. Does it preserve existing functionality?
4. Are there any logic errors introduced?
5. Are edge cases handled properly?
6. Is the code style consistent?

Return JSON:
{
  "isCorrect": boolean,
  "issueResolved": boolean,
  "syntaxValid": boolean,
  "functionalityPreserved": boolean,
  "logicErrors": ["any logic errors found"],
  "edgeCasesHandled": boolean,
  "styleConsistent": boolean,
  "confidence": 0.0 to 1.0,
  "reasoning": "explanation",
  "suggestions": ["improvements if any"]
}`

    const response = await this.llmClient.complete(prompt)
    return this.parseVerifyResult(fix, response)
  }

  /**
   * LLM checks for regressions
   */
  async checkForRegressions(changes: FileChange[]): Promise<Regression[]> {
    const changesDescription = changes.map(c => `
File: ${c.file}
Before:
\`\`\`
${c.before.slice(0, 2000)}
\`\`\`
After:
\`\`\`
${c.after.slice(0, 2000)}
\`\`\`
`).join('\n---\n')

    const prompt = `Check these code changes for potential regressions:

${changesDescription}

Look for:
1. Broken functionality
2. Changed behavior that might affect other code
3. Removed features
4. Modified APIs or interfaces
5. Changed error handling
6. Performance degradation patterns
7. Missing null/undefined checks

Return JSON array of regressions found:
[
  {
    "file": "file path",
    "type": "functional" | "api" | "performance" | "error-handling",
    "severity": "critical" | "high" | "medium" | "low",
    "description": "what might regress",
    "location": {
      "startLine": number,
      "endLine": number
    },
    "impact": "what could be affected",
    "suggestion": "how to verify or fix"
  }
]

Return empty array if no regressions found.`

    const response = await this.llmClient.complete(prompt)
    return this.parseRegressions(response)
  }

  /**
   * LLM validates no new issues introduced
   */
  async validateNoNewIssues(changes: FileChange[]): Promise<NewIssue[]> {
    const changesDescription = changes.map(c => `
File: ${c.file}
New Code:
\`\`\`
${c.after.slice(0, 3000)}
\`\`\`
`).join('\n---\n')

    const prompt = `Scan the new code for any issues that might have been introduced:

${changesDescription}

Check for:
1. Security vulnerabilities (injection, XSS, etc.)
2. Performance issues (N+1, memory leaks, etc.)
3. Code quality problems (complexity, duplication)
4. Potential bugs (null references, off-by-one, etc.)
5. Best practice violations
6. Missing error handling

Return JSON array of new issues:
[
  {
    "file": "file path",
    "type": "security" | "performance" | "quality" | "bug",
    "severity": "critical" | "high" | "medium" | "low",
    "title": "brief title",
    "description": "detailed description",
    "location": {
      "startLine": number,
      "endLine": number,
      "snippet": "relevant code"
    },
    "wasIntroducedByFix": boolean,
    "suggestion": "how to fix"
  }
]

Return empty array if no new issues found.`

    const response = await this.llmClient.complete(prompt)
    return this.parseNewIssues(response)
  }

  /**
   * Run comprehensive verification
   */
  async runFullVerification(
    fix: GeneratedFix,
    result: FixResult,
    readFile: (path: string) => Promise<string>,
  ): Promise<{
    verifyResult: VerifyResult
    regressions: Regression[]
    newIssues: NewIssue[]
    overallSuccess: boolean
  }> {
    // Get current file content
    const currentContent = await readFile(fix.filePath)

    // Verify correctness
    const verifyResult = await this.verifyCodeCorrectness(
      fix,
      result.originalContent || '',
      currentContent,
    )

    // Check for regressions
    const changes: FileChange[] = [{
      file: fix.filePath,
      before: result.originalContent || '',
      after: currentContent,
    }]
    const regressions = await this.checkForRegressions(changes)

    // Check for new issues
    const newIssues = await this.validateNoNewIssues(changes)

    // Determine overall success
    const overallSuccess =
      verifyResult.isCorrect
      && verifyResult.issueResolved
      && regressions.filter(r => r.severity === 'critical' || r.severity === 'high').length === 0
      && newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0

    return {
      verifyResult,
      regressions,
      newIssues,
      overallSuccess,
    }
  }

  /**
   * Generate verification report
   */
  generateReport(verification: {
    verifyResult: VerifyResult
    regressions: Regression[]
    newIssues: NewIssue[]
    overallSuccess: boolean
  }): string {
    const lines: string[] = []

    lines.push('# Fix Verification Report')
    lines.push('')
    lines.push(`## Overall Status: ${verification.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`)
    lines.push('')

    // Correctness
    lines.push('## Correctness Check')
    lines.push(`- Issue Resolved: ${verification.verifyResult.issueResolved ? '✅' : '❌'}`)
    lines.push(`- Syntax Valid: ${verification.verifyResult.syntaxValid ? '✅' : '❌'}`)
    lines.push(`- Functionality Preserved: ${verification.verifyResult.functionalityPreserved ? '✅' : '❌'}`)
    lines.push(`- Confidence: ${(verification.verifyResult.confidence * 100).toFixed(0)}%`)
    lines.push('')

    if (verification.verifyResult.logicErrors.length > 0) {
      lines.push('### Logic Errors')
      verification.verifyResult.logicErrors.forEach(e => lines.push(`- ${e}`))
      lines.push('')
    }

    // Regressions
    if (verification.regressions.length > 0) {
      lines.push('## Potential Regressions')
      verification.regressions.forEach((r) => {
        lines.push(`### [${r.severity.toUpperCase()}] ${r.type}`)
        lines.push(r.description)
        lines.push(`Impact: ${r.impact}`)
        lines.push(`Suggestion: ${r.suggestion}`)
        lines.push('')
      })
    }

    // New Issues
    if (verification.newIssues.length > 0) {
      lines.push('## New Issues Introduced')
      verification.newIssues.forEach((i) => {
        lines.push(`### [${i.severity.toUpperCase()}] ${i.title}`)
        lines.push(i.description)
        lines.push(`Suggestion: ${i.suggestion}`)
        lines.push('')
      })
    }

    // Suggestions
    if (verification.verifyResult.suggestions.length > 0) {
      lines.push('## Suggestions')
      verification.verifyResult.suggestions.forEach(s => lines.push(`- ${s}`))
    }

    return lines.join('\n')
  }

  /**
   * Parse verify result from LLM response
   */
  private parseVerifyResult(fix: GeneratedFix, response: string): VerifyResult {
    try {
      const json = this.extractJson(response)
      return {
        fixId: fix.id,
        isCorrect: json.isCorrect ?? false,
        issueResolved: json.issueResolved ?? false,
        syntaxValid: json.syntaxValid ?? true,
        functionalityPreserved: json.functionalityPreserved ?? true,
        logicErrors: json.logicErrors || [],
        edgeCasesHandled: json.edgeCasesHandled ?? true,
        styleConsistent: json.styleConsistent ?? true,
        confidence: json.confidence ?? 0.5,
        reasoning: json.reasoning || '',
        suggestions: json.suggestions || [],
        verifiedAt: new Date(),
      }
    }
    catch {
      return {
        fixId: fix.id,
        isCorrect: false,
        issueResolved: false,
        syntaxValid: true,
        functionalityPreserved: true,
        logicErrors: ['Could not parse verification result'],
        edgeCasesHandled: false,
        styleConsistent: true,
        confidence: 0,
        reasoning: '',
        suggestions: [],
        verifiedAt: new Date(),
      }
    }
  }

  /**
   * Parse regressions from LLM response
   */
  private parseRegressions(response: string): Regression[] {
    try {
      const json = this.extractJson(response)
      if (!Array.isArray(json))
        return []

      return json.map((r: any) => ({
        file: r.file || '',
        type: r.type || 'functional',
        severity: r.severity || 'medium',
        description: r.description || '',
        location: r.location || { startLine: 0, endLine: 0 },
        impact: r.impact || '',
        suggestion: r.suggestion || '',
      }))
    }
    catch {
      return []
    }
  }

  /**
   * Parse new issues from LLM response
   */
  private parseNewIssues(response: string): NewIssue[] {
    try {
      const json = this.extractJson(response)
      if (!Array.isArray(json))
        return []

      return json.map((i: any) => ({
        file: i.file || '',
        type: i.type || 'quality',
        severity: i.severity || 'medium',
        title: i.title || '',
        description: i.description || '',
        location: i.location || {},
        wasIntroducedByFix: i.wasIntroducedByFix ?? true,
        suggestion: i.suggestion || '',
      }))
    }
    catch {
      return []
    }
  }

  /**
   * Extract JSON from LLM response
   */
  private extractJson(response: string): any {
    const jsonMatch = response.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return JSON.parse(response)
  }
}
