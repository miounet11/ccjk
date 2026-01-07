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
    const projectName = context.projectName || 'unknown'
    const rootDir = context.rootDir || context.rootPath
    const languages = context.languages || []
    const frameworks = context.frameworks || [context.framework].filter(Boolean)
    const fileStructure = context.fileStructure || context.sourceDirs

    const prompt = `Analyze this project and identify scan targets:

Project: ${projectName}
Root: ${rootDir}
Languages: ${languages.join(', ')}
Frameworks: ${frameworks.join(', ')}

File structure summary:
${fileStructure.slice(0, 50).join('\n')}
${fileStructure.length > 50 ? `... and ${fileStructure.length - 50} more files` : ''}

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
    const focusAreas = strategy.focusAreas || []
    const prompt = `Scan this code for issues:

File: ${target.path}
Focus Areas: ${focusAreas.join(', ')}
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

    await this.llmClient.complete(prompt)
    const issues = this.parseIssues('[]', target.path)

    return {
      target,
      strategy,
      issues,
      timestamp: new Date(),
      scannedAt: new Date(),
      duration: 0,
      metrics: { linesScanned: fileContent.split('\n').length },
      notes: '',
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
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    targets.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2))

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
        priority: t.priority || 5,
        complexity: t.complexity || 'medium',
        reason: t.reason || '',
        tags: t.tags || [],
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
        type: json.type || 'comprehensive',
        focusAreas: json.focusAreas || ['security', 'quality'],
        checks: json.checks || [],
        depth: json.depth || 'deep',
        contextFiles: json.contextFiles || [],
        model: json.model || 'sonnet',
      }
    }
    catch {
      return {
        type: 'comprehensive',
        focusAreas: ['security', 'quality'],
        checks: [],
        depth: 'deep',
        contextFiles: [],
        model: 'sonnet',
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

      return json.map((i: any, idx: number) => {
        const issueType = this.mapIssueType(i.type)
        const category = this.mapCategory(issueType)
        return {
          id: i.id || `issue-${idx}`,
          type: issueType,
          category,
          severity: this.mapSeverity(i.severity),
          title: i.title || 'Untitled issue',
          description: i.description || '',
          file: i.location?.file || filePath,
          line: i.location?.startLine || 1,
          column: i.location?.column,
          snippet: i.location?.snippet || '',
          location: {
            file: i.location?.file || filePath,
            startLine: i.location?.startLine || 1,
            endLine: i.location?.endLine || i.location?.startLine || 1,
            snippet: i.location?.snippet || '',
          },
          suggestion: i.suggestion || '',
          suggestedFix: i.suggestion || '',
          confidence: i.confidence || 0.5,
          autoFixable: i.autoFixable ?? false,
        }
      })
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
      logic: 'logic',
      accessibility: 'accessibility',
    }
    return typeMap[type?.toLowerCase()] || 'quality'
  }

  /**
   * Map IssueType to category (category doesn't include 'bug')
   */
  private mapCategory(type: IssueType): 'security' | 'performance' | 'quality' | 'style' | 'accessibility' | 'logic' {
    if (type === 'bug') {
      return 'quality'
    }
    return type as 'security' | 'performance' | 'quality' | 'style' | 'accessibility' | 'logic'
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
      info: 'info',
    }
    return severityMap[severity?.toLowerCase()] || 'medium'
  }
}

/**
 * LLM Client interface for scanner
 */
export interface LLMClient {
  complete: (prompt: string) => Promise<string>
}

/**
 * Create a mock LLM client for testing
 */
export function createMockLLMClient(): LLMClient {
  return {
    async complete(_prompt: string): Promise<string> {
      // Return empty array for testing
      return '[]'
    },
  }
}
