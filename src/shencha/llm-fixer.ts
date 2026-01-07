import type { LLMClient } from './llm-scanner'
import type {
  EvaluatedIssue,
  FileChange,
  FixPlan,
  FixResult,
  GeneratedFix,
} from './types'

/**
 * Get location info from issue
 */
function getLocationInfo(issue: EvaluatedIssue): { file: string, startLine: number, endLine: number, snippet: string } {
  if (typeof issue.location === 'object' && issue.location) {
    return {
      file: issue.location.file || issue.file,
      startLine: issue.location.startLine || issue.line || 1,
      endLine: issue.location.endLine || issue.line || 1,
      snippet: issue.location.snippet || issue.snippet || '',
    }
  }
  return {
    file: issue.file,
    startLine: issue.line || 1,
    endLine: issue.line || 1,
    snippet: issue.snippet || '',
  }
}

/**
 * LLM Fixer - Generates and applies fixes autonomously
 */
export class LLMFixer {
  private llmClient: LLMClient

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient
  }

  /**
   * LLM generates fix code (no templates)
   */
  async generateFix(issue: EvaluatedIssue, plan: FixPlan, currentCode: string): Promise<GeneratedFix> {
    const stepsStr = (plan.steps || []).map(s => typeof s === 'string' ? s : s.action).join(', ')
    const prompt = `Generate a fix for this issue:

Issue: ${issue.title}
Type: ${issue.type || issue.category}
Severity: ${issue.adjustedSeverity || issue.severity}
File: ${issue.file}

Fix Plan:
- Approach: ${plan.approach}
- Steps: ${stepsStr}

Current code:
\`\`\`
${currentCode}
\`\`\`

Problem area (lines ${issue.line || 0}):
\`\`\`
${issue.snippet || ''}
\`\`\`

Generate the fixed code:
1. Apply the fix according to the plan
2. Maintain code style and conventions
3. Preserve all existing functionality
4. Add comments only if necessary for clarity

Return JSON:
{
  "fixedCode": "the complete fixed code for the entire file",
  "changes": [
    {
      "startLine": number,
      "endLine": number,
      "oldCode": "original code",
      "newCode": "replacement code",
      "explanation": "what was changed and why"
    }
  ],
  "imports": ["any new imports needed"],
  "warnings": ["any warnings about the fix"]
}`

    const response = await this.llmClient.complete(prompt)
    return this.parseGeneratedFix(issue, plan, response)
  }

  /**
   * Apply fix with rollback capability
   */
  async applyFix(
    fix: GeneratedFix,
    writeFile: (path: string, content: string) => Promise<void>,
    readFile: (path: string) => Promise<string>,
  ): Promise<FixResult> {
    const startTime = Date.now()
    const filePath = fix.filePath || ''
    const fixedCode = fix.fixedCode || ''

    try {
      // Read current content for backup
      const originalContent = await readFile(filePath)

      // Apply the fix
      await writeFile(filePath, fixedCode)

      return {
        fix,
        fixId: fix.id,
        success: true,
        appliedAt: new Date(),
        duration: Date.now() - startTime,
        originalContent,
        newContent: fixedCode,
        appliedChanges: fix.changes,
        failedChanges: [],
        backupPaths: [],
        changesApplied: fix.changes.length,
      }
    }
    catch (error) {
      return {
        fix,
        fixId: fix.id,
        success: false,
        appliedAt: new Date(),
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        appliedChanges: [],
        failedChanges: [],
        backupPaths: [],
        changesApplied: 0,
      }
    }
  }

  /**
   * Rollback a fix
   */
  async rollbackFix(
    result: FixResult,
    writeFile: (path: string, content: string) => Promise<void>,
    filePath: string,
  ): Promise<boolean> {
    if (!result.originalContent) {
      return false
    }

    try {
      await writeFile(filePath, result.originalContent)
      return true
    }
    catch {
      return false
    }
  }

  /**
   * Generate fix for multiple issues in same file
   */
  async generateBatchFix(
    issues: EvaluatedIssue[],
    plans: FixPlan[],
    currentCode: string,
    filePath: string,
  ): Promise<GeneratedFix> {
    const issueDescriptions = issues.map((issue, idx) => {
      const loc = getLocationInfo(issue)
      return `
Issue ${idx + 1}: ${issue.title}
Lines: ${loc.startLine}-${loc.endLine}
Plan: ${plans[idx]?.approach || 'No plan'}
Snippet:
\`\`\`
${loc.snippet}
\`\`\`
`
    }).join('\n')

    const prompt = `Generate fixes for multiple issues in the same file:

File: ${filePath}

${issueDescriptions}

Current code:
\`\`\`
${currentCode}
\`\`\`

Generate a single fixed version that addresses ALL issues:
1. Apply all fixes without conflicts
2. Maintain code style and conventions
3. Preserve all existing functionality
4. Handle overlapping changes carefully

Return JSON:
{
  "fixedCode": "the complete fixed code",
  "changes": [
    {
      "issueIndex": 0,
      "startLine": number,
      "endLine": number,
      "oldCode": "original",
      "newCode": "replacement",
      "explanation": "what was changed"
    }
  ],
  "imports": ["new imports"],
  "warnings": ["any warnings"]
}`

    const response = await this.llmClient.complete(prompt)
    return this.parseBatchFix(issues, plans, filePath, response)
  }

  /**
   * Suggest alternative fixes
   */
  async suggestAlternatives(issue: EvaluatedIssue, currentCode: string): Promise<GeneratedFix[]> {
    const loc = getLocationInfo(issue)
    const prompt = `Suggest alternative fixes for this issue:

Issue: ${issue.title}
Type: ${issue.type}
Description: ${issue.description}
File: ${loc.file}

Problem code:
\`\`\`
${loc.snippet}
\`\`\`

Full context:
\`\`\`
${currentCode.slice(0, 5000)}
\`\`\`

Provide 2-3 alternative fix approaches:
1. Most conservative (minimal changes)
2. Recommended (balanced approach)
3. Most thorough (comprehensive fix)

Return JSON array:
[
  {
    "approach": "conservative",
    "description": "what this approach does",
    "fixedCode": "the fixed code snippet",
    "pros": ["advantages"],
    "cons": ["disadvantages"]
  }
]`

    const response = await this.llmClient.complete(prompt)
    return this.parseAlternatives(issue, response)
  }

  /**
   * Parse generated fix from LLM response
   */
  private parseGeneratedFix(issue: EvaluatedIssue, plan: FixPlan, response: string): GeneratedFix {
    try {
      const json = this.extractJson(response)
      const changes: FileChange[] = (json.changes || []).map((c: any) => ({
        path: issue.file,
        type: 'modify' as const,
        startLine: c.startLine,
        endLine: c.endLine,
        before: c.oldCode,
        after: c.newCode,
        explanation: c.explanation,
      }))
      return {
        id: `fix-${issue.id}-${Date.now()}`,
        plan,
        filePath: issue.file,
        fixedCode: json.fixedCode || '',
        changes,
        imports: json.imports || [],
        warnings: json.warnings || [],
        generatedAt: new Date(),
        commitMessage: `fix: ${issue.title}`,
        approach: plan.approach,
      }
    }
    catch {
      return {
        id: `fix-${issue.id}-${Date.now()}`,
        plan,
        filePath: issue.file,
        fixedCode: '',
        changes: [],
        imports: [],
        warnings: ['Failed to parse LLM response'],
        generatedAt: new Date(),
        commitMessage: `fix: ${issue.title}`,
        approach: plan.approach,
      }
    }
  }

  /**
   * Parse batch fix from LLM response
   */
  private parseBatchFix(
    issues: EvaluatedIssue[],
    plans: FixPlan[],
    filePath: string,
    response: string,
  ): GeneratedFix {
    const defaultPlan: FixPlan = {
      issueId: issues.map(i => i.id).join(','),
      approach: 'batch',
      filesToModify: [filePath],
      expectedChanges: '',
      rollbackStrategy: '',
      testsToRun: [],
    }
    try {
      const json = this.extractJson(response)
      const changes: FileChange[] = (json.changes || []).map((c: any) => ({
        path: filePath,
        type: 'modify' as const,
        startLine: c.startLine,
        endLine: c.endLine,
        before: c.oldCode,
        after: c.newCode,
        explanation: c.explanation,
      }))
      return {
        id: `batch-fix-${Date.now()}`,
        plan: plans[0] || defaultPlan,
        filePath,
        fixedCode: json.fixedCode || '',
        changes,
        imports: json.imports || [],
        warnings: json.warnings || [],
        generatedAt: new Date(),
        commitMessage: `fix: batch fix for ${issues.length} issues`,
        approach: 'batch',
      }
    }
    catch {
      return {
        id: `batch-fix-${Date.now()}`,
        plan: plans[0] || defaultPlan,
        filePath,
        fixedCode: '',
        changes: [],
        imports: [],
        warnings: ['Failed to parse batch fix'],
        generatedAt: new Date(),
        commitMessage: `fix: batch fix for ${issues.length} issues`,
        approach: 'batch',
      }
    }
  }

  /**
   * Parse alternatives from LLM response
   */
  private parseAlternatives(issue: EvaluatedIssue, response: string): GeneratedFix[] {
    const loc = getLocationInfo(issue)
    const defaultPlan: FixPlan = {
      issueId: issue.id,
      approach: 'alternative',
      filesToModify: [loc.file],
      expectedChanges: '',
      rollbackStrategy: '',
      testsToRun: [],
    }
    try {
      const json = this.extractJson(response)
      if (!Array.isArray(json))
        return []

      return json.map((alt: any, idx: number) => ({
        id: `alt-${issue.id}-${idx}-${Date.now()}`,
        plan: defaultPlan,
        filePath: loc.file,
        fixedCode: alt.fixedCode || '',
        changes: [],
        imports: [],
        warnings: alt.cons || [],
        generatedAt: new Date(),
        commitMessage: `fix: ${issue.title} (${alt.approach || 'alternative'})`,
        approach: alt.approach || 'alternative',
        description: alt.description,
        pros: alt.pros,
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
