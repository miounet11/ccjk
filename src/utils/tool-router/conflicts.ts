/**
 * Tool Conflicts - 工具冲突检测和解决
 * 检测和解决 Skills 与 MCP 工具之间的冲突
 */

export interface ToolConflict {
  skillName: string
  mcpToolName: string
  conflictType: ConflictType
  resolution: ConflictResolution
  reason: string
}

export enum ConflictType {
  DUPLICATE_FUNCTIONALITY = 'duplicate_functionality',
  OVERLAPPING_SCOPE = 'overlapping_scope',
  RESOURCE_CONTENTION = 'resource_contention',
  INCOMPATIBLE_BEHAVIOR = 'incompatible_behavior',
}

export enum ConflictResolution {
  PREFER_SKILL = 'prefer_skill',
  PREFER_MCP = 'prefer_mcp',
  MERGE = 'merge',
  DISABLE_MCP = 'disable_mcp',
  USER_CHOICE = 'user_choice',
}

export interface ConflictRule {
  pattern: RegExp | string
  mcpPattern: RegExp | string
  resolution: ConflictResolution
  reason: string
}

/**
 * 工具冲突检测器
 */
export class ConflictDetector {
  private rules: ConflictRule[] = []

  constructor() {
    this.initializeDefaultRules()
  }

  /**
   * 初始化默认冲突规则
   */
  private initializeDefaultRules(): void {
    this.rules = [
      // 浏览器相关冲突
      {
        pattern: /^browser_/,
        mcpPattern: /^mcp__Playwright__/,
        resolution: ConflictResolution.PREFER_SKILL,
        reason: 'Built-in Agent Browser is preferred over Playwright MCP',
      },
      // 文件操作冲突
      {
        pattern: /^(Read|Write|Edit)$/,
        mcpPattern: /^mcp__.*__(read|write|edit)_file$/i,
        resolution: ConflictResolution.PREFER_SKILL,
        reason: 'Built-in file operations are more efficient',
      },
      // 搜索冲突
      {
        pattern: /^(Grep|Glob)$/,
        mcpPattern: /^mcp__.*__(search|find|grep)$/i,
        resolution: ConflictResolution.PREFER_SKILL,
        reason: 'Built-in search tools are optimized for the codebase',
      },
      // Web 搜索冲突
      {
        pattern: /^WebSearch$/,
        mcpPattern: /^mcp__.*__web_search$/i,
        resolution: ConflictResolution.PREFER_SKILL,
        reason: 'Built-in web search has better integration',
      },
    ]
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: ConflictRule): void {
    this.rules.push(rule)
  }

  /**
   * 检测冲突
   */
  detectConflicts(skillNames: string[], mcpToolNames: string[]): ToolConflict[] {
    const conflicts: ToolConflict[] = []

    for (const skillName of skillNames) {
      for (const mcpToolName of mcpToolNames) {
        const conflict = this.checkConflict(skillName, mcpToolName)
        if (conflict) {
          conflicts.push(conflict)
        }
      }
    }

    return conflicts
  }

  /**
   * 检查单个冲突
   */
  private checkConflict(skillName: string, mcpToolName: string): ToolConflict | null {
    for (const rule of this.rules) {
      const skillMatch = this.matchPattern(skillName, rule.pattern)
      const mcpMatch = this.matchPattern(mcpToolName, rule.mcpPattern)

      if (skillMatch && mcpMatch) {
        return {
          skillName,
          mcpToolName,
          conflictType: ConflictType.DUPLICATE_FUNCTIONALITY,
          resolution: rule.resolution,
          reason: rule.reason,
        }
      }
    }

    return null
  }

  /**
   * 匹配模式
   */
  private matchPattern(value: string, pattern: RegExp | string): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(value)
    }
    return value === pattern || value.includes(pattern)
  }
}

/**
 * 冲突解决器
 */
export class ConflictResolver {
  private detector: ConflictDetector

  constructor() {
    this.detector = new ConflictDetector()
  }

  /**
   * 解决冲突并返回应该使用的工具列表
   */
  resolve(
    skillNames: string[],
    mcpToolNames: string[],
  ): { enabledSkills: string[], enabledMcpTools: string[], disabledMcpTools: string[] } {
    const conflicts = this.detector.detectConflicts(skillNames, mcpToolNames)

    const disabledMcpTools = new Set<string>()

    for (const conflict of conflicts) {
      switch (conflict.resolution) {
        case ConflictResolution.PREFER_SKILL:
        case ConflictResolution.DISABLE_MCP:
          disabledMcpTools.add(conflict.mcpToolName)
          break
        case ConflictResolution.PREFER_MCP:
          // MCP 优先，不禁用
          break
        case ConflictResolution.MERGE:
        case ConflictResolution.USER_CHOICE:
          // 需要用户决定或合并，暂时保留两者
          break
      }
    }

    return {
      enabledSkills: skillNames,
      enabledMcpTools: mcpToolNames.filter(name => !disabledMcpTools.has(name)),
      disabledMcpTools: Array.from(disabledMcpTools),
    }
  }

  /**
   * 获取冲突报告
   */
  getConflictReport(skillNames: string[], mcpToolNames: string[]): string {
    const conflicts = this.detector.detectConflicts(skillNames, mcpToolNames)

    if (conflicts.length === 0) {
      return 'No conflicts detected between Skills and MCP tools.'
    }

    const lines = ['Tool Conflicts Detected:', '']

    for (const conflict of conflicts) {
      lines.push(`• ${conflict.skillName} ↔ ${conflict.mcpToolName}`)
      lines.push(`  Type: ${conflict.conflictType}`)
      lines.push(`  Resolution: ${conflict.resolution}`)
      lines.push(`  Reason: ${conflict.reason}`)
      lines.push('')
    }

    return lines.join('\n')
  }
}

export default ConflictResolver

// ============================================
// Convenience functions for index.ts exports
// ============================================

export interface ToolAvailability {
  tool: string
  available: boolean
  reason?: string
  alternative?: string
}

const defaultDetector = new ConflictDetector()
const defaultResolver = new ConflictResolver()

/**
 * Check if a tool is available
 */
export function checkToolAvailability(toolName: string, mcpTools: string[]): ToolAvailability {
  const conflicts = defaultDetector.detectConflicts([toolName], mcpTools)
  if (conflicts.length === 0) {
    return { tool: toolName, available: true }
  }
  const conflict = conflicts[0]
  return {
    tool: toolName,
    available: conflict.resolution !== ConflictResolution.DISABLE_MCP,
    reason: conflict.reason,
    alternative: conflict.skillName,
  }
}

/**
 * Detect conflicts between skills and MCP tools
 */
export function detectConflicts(skillNames: string[], mcpToolNames: string[]): ToolConflict[] {
  return defaultDetector.detectConflicts(skillNames, mcpToolNames)
}

/**
 * Format a conflict report
 */
export function formatConflictReport(skillNames: string[], mcpToolNames: string[]): string {
  return defaultResolver.getConflictReport(skillNames, mcpToolNames)
}

/**
 * Generate suggestions for resolving conflicts
 */
export function generateSuggestions(conflicts: ToolConflict[]): string[] {
  return conflicts.map((c) => {
    switch (c.resolution) {
      case ConflictResolution.PREFER_SKILL:
        return `Use built-in "${c.skillName}" instead of "${c.mcpToolName}": ${c.reason}`
      case ConflictResolution.PREFER_MCP:
        return `Use MCP tool "${c.mcpToolName}" for this task`
      case ConflictResolution.DISABLE_MCP:
        return `Disable "${c.mcpToolName}" to avoid conflicts`
      default:
        return `Review conflict between "${c.skillName}" and "${c.mcpToolName}"`
    }
  })
}

/**
 * Get available tools in a category
 */
export function getAvailableToolsInCategory(
  category: string,
  skillNames: string[],
  mcpToolNames: string[],
): string[] {
  const result = defaultResolver.resolve(skillNames, mcpToolNames)
  // Filter by category pattern
  const categoryPattern = new RegExp(category, 'i')
  return [
    ...result.enabledSkills.filter(s => categoryPattern.test(s)),
    ...result.enabledMcpTools.filter(t => categoryPattern.test(t)),
  ]
}

/**
 * Resolve a single conflict
 */
export function resolveConflict(conflict: ToolConflict): string {
  switch (conflict.resolution) {
    case ConflictResolution.PREFER_SKILL:
      return conflict.skillName
    case ConflictResolution.PREFER_MCP:
      return conflict.mcpToolName
    case ConflictResolution.DISABLE_MCP:
      return conflict.skillName
    default:
      return conflict.skillName // Default to skill
  }
}
