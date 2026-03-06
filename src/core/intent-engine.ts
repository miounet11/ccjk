/**
 * Intent Recognition Engine
 * 智能意图识别引擎 - 分析用户输入并自动路由到对应的 skill
 */

import process from 'node:process'

// ============================================================================
// 意图识别规则
// ============================================================================

interface IntentRule {
  keywords: string[] // 关键词列表
  skill: string // 对应的 skill 名称
  confidence: number // 置信度阈值 (0-1)
  description: string // 规则描述
}

const INTENT_RULES: IntentRule[] = [
  {
    keywords: ['commit', '提交', '提交代码', 'git commit', '保存更改'],
    skill: 'commit',
    confidence: 0.9,
    description: 'Smart commit with AI-generated messages',
  },
  {
    keywords: ['github', 'gh', 'pr', 'pull request', 'merge request', '合并请求'],
    skill: 'github',
    confidence: 0.85,
    description: 'GitHub operations',
  },
  {
    keywords: ['review', '审查', 'code review', '代码审查', '检查代码'],
    skill: 'review',
    confidence: 0.85,
    description: 'Code review',
  },
  {
    keywords: ['test', '测试', 'run test', '运行测试', 'testing'],
    skill: 'test',
    confidence: 0.8,
    description: 'Run tests',
  },
  {
    keywords: ['doc', '文档', 'documentation', '生成文档', 'generate doc'],
    skill: 'doc',
    confidence: 0.8,
    description: 'Generate documentation',
  },
  {
    keywords: ['deploy', '部署', 'deployment', '发布', 'release'],
    skill: 'deploy',
    confidence: 0.85,
    description: 'Deploy application',
  },
  {
    keywords: ['fix', '修复', 'bug', 'debug', '调试', 'error', '错误'],
    skill: 'fix',
    confidence: 0.75,
    description: 'Fix bugs and errors',
  },
  {
    keywords: ['refactor', '重构', 'optimize', '优化', 'improve', '改进'],
    skill: 'refactor',
    confidence: 0.75,
    description: 'Refactor code',
  },
]

// ============================================================================
// 意图识别结果
// ============================================================================

export interface IntentMatch {
  skill: string
  confidence: number
  description: string
  matchedKeywords: string[]
}

// ============================================================================
// 意图识别函数
// ============================================================================

/**
 * 分析用户输入，识别意图
 * @param input 用户输入的命令行参数
 * @returns 匹配的意图，如果没有匹配则返回 null
 */
export function recognizeIntent(input: string): IntentMatch | null {
  const normalizedInput = input.toLowerCase().trim()

  let bestMatch: IntentMatch | null = null
  let highestScore = 0

  for (const rule of INTENT_RULES) {
    const matchedKeywords: string[] = []
    let score = 0

    // 检查每个关键词是否在输入中
    for (const keyword of rule.keywords) {
      if (normalizedInput.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword)
        // 完全匹配得分更高
        if (normalizedInput === keyword.toLowerCase()) {
          score += 1.0
        }
        else {
          score += 0.5
        }
      }
    }

    // 计算置信度：匹配的关键词数量 / 总关键词数量
    const confidence = score / rule.keywords.length

    // 如果置信度超过阈值，且得分高于当前最佳匹配
    if (confidence >= rule.confidence && score > highestScore) {
      highestScore = score
      bestMatch = {
        skill: rule.skill,
        confidence,
        description: rule.description,
        matchedKeywords,
      }
    }
  }

  return bestMatch
}

/**
 * 检查用户输入是否应该触发 skill
 * @param args 命令行参数数组
 * @returns 如果应该触发 skill，返回 IntentMatch，否则返回 null
 */
export function shouldTriggerSkill(args: string[]): IntentMatch | null {
  // 如果已经是 skill 命令，不需要再识别
  if (args.length > 0 && args[0].startsWith('/')) {
    return null
  }

  // 如果是已知的 CLI 命令，不需要识别
  const knownCommands = [
    'init',
    'update',
    'doctor',
    'help',
    'mcp',
    'skill',
    'agent',
    'hook',
    'memory',
    'quick-setup',
    'config',
    'template',
    'brain',
    'session',
  ]
  if (args.length > 0 && knownCommands.includes(args[0])) {
    return null
  }

  // 合并所有参数为一个字符串进行分析
  const input = args.join(' ')
  return recognizeIntent(input)
}

/**
 * 执行 skill
 * @param skillName skill 名称
 * @param originalArgs 原始命令行参数
 */
export async function executeSkill(skillName: string, _originalArgs: string[]): Promise<boolean> {
  try {
    // 动态导入 skill 执行器
    const { executeSlashCommand } = await import('../commands/slash-commands')

    // 构造 skill 命令
    const skillCommand = `/${skillName}`

    // 执行 skill
    const handled = await executeSlashCommand(skillCommand)
    return handled
  }
  catch (error) {
    console.error(`Failed to execute skill "${skillName}":`, error)
    return false
  }
}

/**
 * 智能意图识别入口
 * 在 CLI 启动时调用，自动识别用户意图并路由到对应的 skill
 */
export async function handleIntentRecognition(): Promise<boolean> {
  const args = process.argv.slice(2)

  // 检查是否应该触发 skill
  const intent = shouldTriggerSkill(args)

  if (!intent) {
    return false // 没有匹配的意图，继续正常的 CLI 流程
  }

  // 高置信度匹配：直接执行
  if (intent.confidence >= 0.9) {
    console.log(`🎯 Detected intent: ${intent.description}`)
    console.log(`   Executing skill: /${intent.skill}\n`)
    return await executeSkill(intent.skill, args)
  }

  // 中等置信度匹配：询问用户
  if (intent.confidence >= 0.7) {
    console.log(`🤔 Did you mean: /${intent.skill} (${intent.description})?`)
    console.log(`   Matched keywords: ${intent.matchedKeywords.join(', ')}`)
    console.log(`   Confidence: ${(intent.confidence * 100).toFixed(0)}%\n`)

    // TODO: 添加用户确认逻辑
    // 目前直接执行
    return await executeSkill(intent.skill, args)
  }

  // 低置信度：不处理
  return false
}
