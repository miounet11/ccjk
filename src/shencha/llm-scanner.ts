import type {
  Issue,
  IssueSeverity,
  IssueType,
  ProjectContext,
  ScanResult,
  ScanStrategy,
  ScanTarget,
} from './types'

/**
 * LLM Scanner - Fully LLM-driven code scanning
 * No predefined rules - LLM autonomously discovers what to scan
 */
export class LLMScanner {
  private llmClient: LLMClient

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient
  }

  /**
   * LLM autonomously discovers what to scan
   */
  async discoverScanTargets(context: ProjectContext): Promise<ScanTarget[]> {
    const prompt = `Analyze this project and identify scan targets:

Project: ${context.projectName}
Root: ${context.rootDir}
Languages: ${context.languages.join(', ')}
Frameworks: ${context.frameworks.join(', ')}

File structure summary:
${context.fileStructure.slice(0, 50).join('\n')}
${context.fileStructure.length > 50 ? `... and ${context.fileStructure.length - 50} more files` : ''}

Identify:
1. Critical code paths that need security auditing
2. Files with potential performance issues
3. Code that might have quality problems
4. Configuration files that need validation

For each target, provide:
- path: file or directory path
- type: 'file' | 'directory' | 'pattern'
- priority: 'critical' | 'high' | 'medium' | 'low'
- reason: why this should be scanned

Return as JSON array.`

    const response = await this.llmClient.complete(prompt)
    return this.parseTargets(response)
  }

  /**
   * LLM decides how to scan each target
   */
  async determineScanStrategy(target: ScanTarget): Promise<ScanStrategy> {
    const prompt = `Determine the best scanning strategy for:

Target: ${target.path}
Type: ${target.type}
Priority: ${target.priority}
Reason: ${target.reason}

What should we look for? Consider:
1. Security vulnerabilities (injection, XSS, auth issues)
2. Performance problems (N+1 queries, memory leaks, slow algorithms)
3. Code quality (complexity, duplication, dead code)
4. Best practices violations
5. Potential bugs and edge cases

Return a scanning strategy as JSON:
{
  "focusAreas": ["security", "performance", "quality"],
  "patterns": ["regex patterns to search for"],
  "checks": ["specific things to verify"],
  "depth": "shallow" | "deep" | "comprehensive"
}`

    const response = await this.llmClient.complete(prompt)
    return this.parseStrategy(response)
  }

  /**
   * LLM executes scan with dynamic approach
   */
  async executeScan(target: ScanTarget, strategy: ScanStrategy, fileContent: string): Promise<ScanResult> {
    const prompt = `Scan this code for issues:

File: ${target.path}
Focus Areas: ${strategy.focusAreas.join(', ')}
Checks: ${strategy.checks.join(', ')}
Depth: ${strategy.depth}

Code:
\`\`\`
${fileContent.slice(0, 10000)}
${fileContent.length > 10000 ? '\n... [truncated]' : ''}
\`\`\`

Analyze and identify all issues. For each issue provide:
{
  "id": "unique-id",
  "type": "security" | "performance" | "quality" | "bug" | "style",
  "severity": "critical" | "high" | "medium" | "low",
  "title": "brief title",
  "description": "detailed description",
  "location": {
    "file": "path",
    "startLine": number,
    "endLine": number,
    "snippet": "code snippet"
  },
  "suggestion": "how to fix",
  "confidence": 0.0 to 1.0
}

Return as JSON array of issues. Be thorough but avoid false positives.`

    const response = await this.llmClient.complete(prompt)
    const issues = this.parseIssues(response, target.path)

    return {
      target,
      strategy,
      issues,
      scannedAt: new Date(),
      duration: 0,
      linesScanned: fileContent.split('\n').length,
    }
  }

  /**
   * Batch scan multiple targets
   */
  async scanAll(
    context: ProjectContext,
    readFile: (path: string) => Promise<string>,
  ): Promise<ScanResult[]> {
    const targets = await this.discoverScanTargets(context)
    const results: ScanResult[] = []

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    targets.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    for (const target of targets) {
      if (target.type === 'file') {
        try {
          const strategy = await this.determineScanStrategy(target)
          const content = await readFile(target.path)
          const result = await this.executeScan(target, strategy, content)
          results.push(result)
        }
        catch (error) {
          // Skip files that can't be read
          console.warn(`Could not scan ${target.path}: ${error}`)
        }
      }
    }

    return results
  }

  /**
   * Parse targets from LLM response
   */
  private parseTargets(response: string): ScanTarget[] {
    try {
      const json = this.extractJson(response)
      return json.map((t: any) => ({
        path: t.path,
        type: t.type || 'file',
        priority: t.priority || 'medium',
        reason: t.reason || '',
      }))
    }
    catch {
      return []
    }
  }

  /**
   * Parse strategy from LLM response
   */
  private parseStrategy(response: string): ScanStrategy {
    try {
      const json = this.extractJson(response)
      return {
        focusAreas: json.focusAreas || ['security', 'quality'],
        patterns: json.patterns || [],
        checks: json.checks || [],
        depth: json.depth || 'deep',
      }
    }
    catch {
      return {
        focusAreas: ['security', 'quality'],
        patterns: [],
        checks: [],
        depth: 'deep',
      }
    }
  }

  /**
   * Parse issues from LLM response
   */
  private parseIssues(response: string, filePath: string): Issue[] {
    try {
      const json = this.extractJson(response)
      if (!Array.isArray(json))
        return []

      return json.map((i: any, idx: number) => ({
        id: i.id || `issue-${idx}`,
        type: this.mapIssueType(i.type),
        severity: this.mapSeverity(i.severity),
        title: i.title || 'Untitled issue',
        description: i.description || '',
        location: {
          file: i.location?.file || filePath,
          startLine: i.location?.startLine || 1,
          endLine: i.location?.endLine || i.location?.startLine || 1,
          snippet: i.location?.snippet || '',
        },
        suggestion: i.suggestion || '',
        confidence: i.confidence || 0.5,
        detectedAt: new Date(),
        status: 'open' as const,
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
    // Try to find JSON in the response
    const jsonMatch = response.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return JSON.parse(response)
  }

  /**
   * Map string to IssueType
   */
  private mapIssueType(type: string): IssueType {
    const typeMap: Record<string, IssueType> = {
      security: 'security',
      performance: 'performance',
      quality: 'quality',
      bug: 'bug',
      style: 'style',
    }
    return typeMap[type?.toLowerCase()] || 'quality'
  }

  /**
   * Map string to IssueSeverity
   */
  private mapSeverity(severity: string): IssueSeverity {
    const severityMap: Record<string, IssueSeverity> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
    }
    return severityMap[severity?.toLowerCase()] || 'medium'
  }
}

/**
 * LLM Client interface for scanner
 */
export interface LLMClient {
  complete(prompt: string): Promise<string>
}

/**
 * Create a mock LLM client for testing
 */
export function createMockLLMClient(): LLMClient {
  return {
    async complete(prompt: string): Promise<string> {
      // Return empty array for testing
      return '[]'
    },
  }
}
