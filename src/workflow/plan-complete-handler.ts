/**
 * Plan Complete Handler
 *
 * 处理 Plan 阶段完成后的流程
 * 集成 Plan 持久化和上下文清理建议
 */

import type { ContextState } from '../context/compact-advisor.js'
import type { PlanDocument, PlanTask } from './plan-persistence.js'
import { getCompactAdvisor } from '../context/compact-advisor.js'
import { estimateTokens } from '../utils/context/token-estimator.js'
import { getPlanPersistenceManager } from './plan-persistence.js'

// ============================================================================
// Types
// ============================================================================

export interface PlanCompleteOptions {
  /** Plan 名称 */
  name: string

  /** Plan 内容（Markdown） */
  content: string

  /** 来源 Skill */
  sourceSkill?: string

  /** 关联的工作流会话 ID */
  sessionId?: string

  /** 当前上下文状态（可选，用于生成建议） */
  contextState?: Partial<ContextState>

  /** 任务列表 */
  tasks?: PlanTask[]

  /** 关键决策 */
  keyDecisions?: string[]

  /** 涉及的文件 */
  affectedFiles?: string[]
}

export interface PlanCompleteResult {
  /** 保存的 Plan 文档 */
  plan: PlanDocument

  /** Plan 文件路径 */
  planPath: string

  /** 上下文清理建议 */
  suggestion: {
    shouldCompact: boolean
    message: string
    usagePercent: number
  }

  /** 格式化的输出（可直接显示给用户） */
  output: string
}

// ============================================================================
// Plan Complete Handler
// ============================================================================

/**
 * 处理 Plan 完成
 *
 * @example
 * ```typescript
 * const result = await handlePlanComplete({
 *   name: '用户评论功能',
 *   content: planMarkdown,
 *   sourceSkill: 'ccjk:feat',
 *   tasks: [
 *     { title: '创建数据模型', completed: false },
 *     { title: '实现 API 接口', completed: false },
 *   ]
 * })
 *
 * console.log(result.output)
 * ```
 */
export async function handlePlanComplete(options: PlanCompleteOptions): Promise<PlanCompleteResult> {
  const {
    name,
    content,
    sourceSkill,
    sessionId,
    contextState,
    tasks,
    keyDecisions,
    affectedFiles,
  } = options

  // 1. 估算 Plan 内容的 Token 数
  const tokenEstimate = estimateTokens(content)

  // 2. 保存 Plan 文档
  const planManager = getPlanPersistenceManager()
  const plan = planManager.savePlan({
    name,
    content,
    sourceSkill,
    sessionId,
    metadata: {
      tokenEstimate,
      planningMessages: contextState?.messageCount,
      keyDecisions,
      affectedFiles,
      tasks,
    },
  })

  // 3. 获取 Plan 文件路径
  const planPath = `${planManager.getProjectPlanDir()}/${name.replace(/[<>:"/\\|?*\s]/g, '-')}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.md`

  // 4. 生成上下文清理建议
  const advisor = getCompactAdvisor()

  // 构建上下文状态
  const fullContextState: ContextState = {
    currentTokens: contextState?.currentTokens || tokenEstimate * 3, // 估算：Plan 内容 * 3 为总对话
    maxTokens: contextState?.maxTokens || 200000,
    messageCount: contextState?.messageCount || 50,
    planningMessageCount: contextState?.planningMessageCount || contextState?.messageCount,
  }

  const suggestion = advisor.generatePlanCompleteSuggestion(plan, fullContextState)

  // 5. 生成格式化输出
  const output = advisor.generateSuggestionOutput(suggestion, planPath)

  return {
    plan,
    planPath,
    suggestion: {
      shouldCompact: suggestion.shouldCompact,
      message: suggestion.message,
      usagePercent: suggestion.usagePercent,
    },
    output,
  }
}

/**
 * 从 Plan 内容中提取任务列表
 */
export function extractTasksFromPlan(content: string): PlanTask[] {
  const tasks: PlanTask[] = []

  // 匹配 Markdown 任务列表格式
  // - [ ] 任务标题
  // - [x] 已完成任务
  const taskPattern = /^[-*]\s*\[([ x])\]\s*(.+)$/gim
  let match

  while ((match = taskPattern.exec(content)) !== null) {
    const completed = match[1].toLowerCase() === 'x'
    const title = match[2].trim()

    // 检测优先级标记
    let priority: PlanTask['priority']
    if (title.includes('(high)') || title.includes('(高)') || title.includes('🔴')) {
      priority = 'high'
    }
    else if (title.includes('(low)') || title.includes('(低)') || title.includes('🟢')) {
      priority = 'low'
    }
    else {
      priority = 'medium'
    }

    tasks.push({
      title: title.replace(/\((high|medium|low|[高中低])\)/gi, '').trim(),
      completed,
      priority,
    })
  }

  return tasks
}

/**
 * 从 Plan 内容中提取关键决策
 */
export function extractDecisionsFromPlan(content: string): string[] {
  const decisions: string[] = []

  // 查找"关键决策"或"Key Decisions"部分
  const decisionSectionPattern = /##\s*(关键决策|Key Decisions|决策|Decisions)\s*\n([\s\S]*?)(?=\n##|$)/i
  const sectionMatch = content.match(decisionSectionPattern)

  if (sectionMatch) {
    const sectionContent = sectionMatch[2]
    // 提取列表项
    const listPattern = /^[-*]\s*(.+)$/gm
    let match
    while ((match = listPattern.exec(sectionContent)) !== null) {
      decisions.push(match[1].trim())
    }
  }

  // 也查找内联决策标记
  const inlinePattern = /(?:决定|决策|选择|采用|推荐|建议)[：:]\s*(.+?)(?=[。.!！?\n]|$)/g
  let inlineMatch
  while ((inlineMatch = inlinePattern.exec(content)) !== null) {
    const decision = inlineMatch[1].trim()
    if (decision.length > 5 && decision.length < 200 && !decisions.includes(decision)) {
      decisions.push(decision)
    }
  }

  return decisions.slice(0, 10) // 最多 10 条
}

/**
 * 从 Plan 内容中提取涉及的文件
 */
export function extractFilesFromPlan(content: string): string[] {
  const files: string[] = []

  // 匹配文件路径模式
  const filePatterns = [
    /`([^`]+\.[a-z]{1,5})`/gi, // `file.ts`
    /(?:src|lib|app|pages|components|utils|services)\/[\w\-./]+\.[a-z]{1,5}/gi, // src/xxx/file.ts
    /(?:创建|修改|更新|删除|Create|Modify|Update|Delete)[：:\s]*`?([^`\n]+\.[a-z]{1,5})`?/gi,
  ]

  for (const pattern of filePatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const file = match[1] || match[0]
      if (file && !files.includes(file) && file.length < 100) {
        files.push(file)
      }
    }
  }

  return [...new Set(files)].slice(0, 20) // 去重，最多 20 个
}

// ============================================================================
// Export
// ============================================================================

export {
  getCompactAdvisor,
  getPlanPersistenceManager,
}
