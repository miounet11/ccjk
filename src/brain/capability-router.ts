/**
 * Capability Router - 能力层级决策引擎
 *
 * 根据任务复杂度自动选择合适的执行方式
 */

/** 能力层级 0-5 */
export type CapabilityLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface TaskContext {
  /** 用户输入 */
  input: string

  /** 对话轮次 */
  conversationTurns: number

  /** 当前工作目录 */
  cwd: string

  /** 是否有未提交的更改 */
  hasUncommittedChanges: boolean

  /** 最近失败次数 */
  recentFailures: number
}

export interface TaskDecision {
  /** 能力层级 */
  level: CapabilityLevel

  /** 决策理由 */
  reasoning: string

  /** 预期步数 */
  expectedSteps: number

  /** 预期耗时（秒） */
  expectedDuration: number

  /** 复杂度评分 1-10 */
  complexity: number
}

/**
 * 决策核心逻辑
 */
export function decideCapability(context: TaskContext): TaskDecision {
  const { input, conversationTurns, hasUncommittedChanges, recentFailures } = context

  const lower = input.toLowerCase()

  // Level 0: 纯文本推理
  if (
    lower.includes('解释') ||
    lower.includes('什么是') ||
    lower.includes('为什么') ||
    lower.includes('如何理解')
  ) {
    return {
      level: 0,
      reasoning: '纯文本推理任务',
      expectedSteps: 1,
      expectedDuration: 5,
      complexity: 1,
    }
  }

  // Level 1: Skill执行
  if (lower.startsWith('/') || lower.includes('commit') || lower.includes('review')) {
    return {
      level: 1,
      reasoning: 'Skill快捷指令',
      expectedSteps: 1,
      expectedDuration: 10,
      complexity: 2,
    }
  }

  // Level 2: 单文件操作
  if (
    (lower.includes('修改') || lower.includes('fix') || lower.includes('更新')) &&
    !lower.includes('所有') &&
    !lower.includes('批量')
  ) {
    return {
      level: 2,
      reasoning: '单文件修改',
      expectedSteps: 3,
      expectedDuration: 20,
      complexity: 3,
    }
  }

  // Level 3: 多文件协调
  if (
    lower.includes('重构') ||
    lower.includes('批量') ||
    lower.includes('所有') ||
    (lower.includes('添加') && lower.includes('功能'))
  ) {
    return {
      level: 3,
      reasoning: '多文件协调操作',
      expectedSteps: 8,
      expectedDuration: 60,
      complexity: 6,
    }
  }

  // Level 4: 复杂任务（考虑用subagent）
  if (
    lower.includes('分析整个') ||
    lower.includes('全局') ||
    lower.includes('架构') ||
    lower.includes('迁移')
  ) {
    return {
      level: 4,
      reasoning: '复杂任务，建议subagent',
      expectedSteps: 15,
      expectedDuration: 180,
      complexity: 8,
    }
  }

  // Level 5: 极复杂任务（必须用subagent）
  if (
    lower.includes('完全重写') ||
    lower.includes('从零开始') ||
    lower.includes('大规模')
  ) {
    return {
      level: 5,
      reasoning: '极复杂任务，必须subagent',
      expectedSteps: 30,
      expectedDuration: 600,
      complexity: 10,
    }
  }

  // 默认：根据上下文判断
  const complexity = Math.min(
    10,
    3 + conversationTurns * 0.5 + recentFailures * 2 + (hasUncommittedChanges ? 1 : 0),
  )

  if (complexity >= 8) {
    return {
      level: 4,
      reasoning: '上下文复杂度高',
      expectedSteps: 12,
      expectedDuration: 120,
      complexity: Math.round(complexity),
    }
  }

  if (complexity >= 5) {
    return {
      level: 3,
      reasoning: '中等复杂度任务',
      expectedSteps: 6,
      expectedDuration: 45,
      complexity: Math.round(complexity),
    }
  }

  return {
    level: 2,
    reasoning: '标准操作',
    expectedSteps: 3,
    expectedDuration: 20,
    complexity: Math.round(complexity),
  }
}

/**
 * 获取能力层级名称
 */
export function getCapabilityName(level: CapabilityLevel): string {
  const names: Record<CapabilityLevel, string> = {
    0: '纯文本推理',
    1: 'Skill执行',
    2: '单文件操作',
    3: '多文件协调',
    4: '复杂任务',
    5: '极复杂任务',
  }
  return names[level]
}
