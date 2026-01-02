import type {
  EvaluatedIssue,
  FixDecision,
  FixPlan,
  Issue,
} from './types'
import type { LLMClient } from './llm-scanner'

/**
 * LLM Decision Engine - Makes autonomous decisions about issues
 */
export class LLMDecisionEngine {
  private llmClient: LLMClient

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient
  }

  /**
   * LLM evaluates and prioritizes an issue
   */
  async evaluateIssue(issue: Issue): Promise<EvaluatedIssue> {
    const prompt = `Evaluate this code issue:

Issue: ${issue.title}
Type: ${issue.type}
Severity: ${issue.severity}
Description: ${issue.description}
Location: ${issue.location.file}:${issue.location.startLine}
Code:
\`\`\`
${issue.location.snippet}
\`\`\`
Suggestion: ${issue.suggestion}

Evaluate:
1. Is this a real issue or false positive? (confidence 0-1)
2. What is the actual severity? (critical/high/medium/low)
3. What is the priority for fixing? (1-10, 10 = most urgent)
4. What is the estimated effort? (trivial/small/medium/large)
5. What are the risks of not fixing?
6. Are there related issues to consider?

Return JSON:
{
  "isRealIssue": boolean,
  "adjustedSeverity": "critical" | "high" | "medium" | "low",
  "priority": 1-10,
  "effort": "trivial" | "small" | "medium" | "large",
  "risks": ["list of risks"],
  "relatedPatterns": ["patterns to check for similar issues"],
  "reasoning": "explanation"
}`

    const response = await this.llmClient.complete(prompt)
    return this.parseEvaluation(issue, response)
  }

  /**
   * LLM decides if auto-fix is safe
   */
  async shouldAutoFix(issue: EvaluatedIssue): Promise<FixDecision> {
    const prompt = `Should we auto-fix this issue?

Issue: ${issue.title}
Severity: ${issue.adjustedSeverity}
Priority: ${issue.priority}
Effort: ${issue.effort}
Risks: ${issue.risks.join(', ')}

Code:
\`\`\`
${issue.location.snippet}
\`\`\`

Suggested fix: ${issue.suggestion}

Consider:
1. Can this be fixed automatically without breaking functionality?
2. Is the fix straightforward or does it require context?
3. Could the fix introduce new bugs?
4. Does it need human review first?
5. Are there tests that would catch regressions?

Return JSON:
{
  "canAutoFix": boolean,
  "requiresReview": boolean,
  "riskLevel": "low" | "medium" | "high",
  "reasoning": "explanation",
  "conditions": ["conditions that must be true for safe auto-fix"],
  "alternatives": ["alternative approaches if auto-fix is risky"]
}`

    const response = await this.llmClient.complete(prompt)
    return this.parseFixDecision(response)
  }

  /**
   * LLM creates a fix plan
   */
  async planFix(issue: EvaluatedIssue): Promise<FixPlan> {
    const prompt = `Create a fix plan for this issue:

Issue: ${issue.title}
Type: ${issue.type}
Severity: ${issue.adjustedSeverity}
File: ${issue.location.file}
Lines: ${issue.location.startLine}-${issue.location.endLine}

Current code:
\`\`\`
${issue.location.snippet}
\`\`\`

Suggested approach: ${issue.suggestion}

Create a detailed fix plan:
1. What exact changes are needed?
2. What is the step-by-step approach?
3. What validations should run after?
4. What could go wrong?
5. How to roll back if needed?

Return JSON:
{
  "approach": "description of fix approach",
  "steps": [
    {
      "order": 1,
      "action": "description",
      "target": "file or component",
      "changes": "what to change"
    }
  ],
  "validations": ["how to verify the fix worked"],
  "rollbackPlan": "how to undo if needed",
  "sideEffects": ["potential side effects to watch for"],
  "testStrategy": "how to test the fix"
}`

    const response = await this.llmClient.complete(prompt)
    return this.parseFixPlan(issue, response)
  }

  /**
   * Batch evaluate multiple issues
   */
  async evaluateAll(issues: Issue[]): Promise<EvaluatedIssue[]> {
    const evaluated: EvaluatedIssue[] = []

    for (const issue of issues) {
      try {
        const result = await this.evaluateIssue(issue)
        if (result.isRealIssue) {
          evaluated.push(result)
        }
      }
      catch (error) {
        console.warn(`Could not evaluate issue ${issue.id}: ${error}`)
      }
    }

    // Sort by priority
    evaluated.sort((a, b) => b.priority - a.priority)

    return evaluated
  }

  /**
   * Parse evaluation from LLM response
   */
  private parseEvaluation(issue: Issue, response: string): EvaluatedIssue {
    try {
      const json = this.extractJson(response)
      return {
        ...issue,
        isRealIssue: json.isRealIssue ?? true,
        adjustedSeverity: json.adjustedSeverity || issue.severity,
        priority: json.priority || 5,
        effort: json.effort || 'medium',
        risks: json.risks || [],
        relatedPatterns: json.relatedPatterns || [],
        reasoning: json.reasoning || '',
      }
    }
    catch {
      return {
        ...issue,
        isRealIssue: true,
        adjustedSeverity: issue.severity,
        priority: 5,
        effort: 'medium',
        risks: [],
        relatedPatterns: [],
        reasoning: '',
      }
    }
  }

  /**
   * Parse fix decision from LLM response
   */
  private parseFixDecision(response: string): FixDecision {
    try {
      const json = this.extractJson(response)
      return {
        canAutoFix: json.canAutoFix ?? false,
        requiresReview: json.requiresReview ?? true,
        riskLevel: json.riskLevel || 'medium',
        reasoning: json.reasoning || '',
        conditions: json.conditions || [],
        alternatives: json.alternatives || [],
      }
    }
    catch {
      return {
        canAutoFix: false,
        requiresReview: true,
        riskLevel: 'high',
        reasoning: 'Could not parse decision',
        conditions: [],
        alternatives: [],
      }
    }
  }

  /**
   * Parse fix plan from LLM response
   */
  private parseFixPlan(issue: EvaluatedIssue, response: string): FixPlan {
    try {
      const json = this.extractJson(response)
      return {
        issueId: issue.id,
        approach: json.approach || '',
        steps: json.steps || [],
        validations: json.validations || [],
        rollbackPlan: json.rollbackPlan || '',
        sideEffects: json.sideEffects || [],
        testStrategy: json.testStrategy || '',
        estimatedDuration: this.estimateDuration(issue.effort),
      }
    }
    catch {
      return {
        issueId: issue.id,
        approach: issue.suggestion || '',
        steps: [],
        validations: [],
        rollbackPlan: '',
        sideEffects: [],
        testStrategy: '',
        estimatedDuration: 0,
      }
    }
  }

  /**
   * Extract JSON from LLM response
   */
  private extractJson(response: string): any {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return JSON.parse(response)
  }

  /**
   * Estimate duration based on effort
   */
  private estimateDuration(effort: string): number {
    const durations: Record<string, number> = {
      trivial: 5,
      small: 15,
      medium: 60,
      large: 240,
    }
    return durations[effort] || 60
  }
}
