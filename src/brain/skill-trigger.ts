/**
 * Skill Trigger - 智能技能触发系统
 * 通过自然语言识别自动触发对应的 skills
 */

import type { SupportedLang } from '../constants'

export interface SkillTrigger {
  skillName: string
  patterns: RegExp[]
  keywords: string[]
  priority: number
  description: string
}

export interface TriggerMatch {
  skillName: string
  confidence: number
  matchedPattern?: string
  extractedParams?: Record<string, string>
}

/**
 * 技能触发规则定义
 */
export const SKILL_TRIGGERS: SkillTrigger[] = [
  // 浏览器相关
  {
    skillName: 'browser',
    patterns: [
      /(?:访问|打开|浏览|查看|去)\s*(?:网站|网页|页面|链接|网址)?\s*[：:]\s*(.+)/,
      /(?:访问|打开|浏览|查看|去)\s+(.+?(?:\.com|\.cn|\.org|\.net|\.io|http).*)/i,
      /(?:search|google|搜索)\s+(.+)/i,
      /(?:open|visit|browse|go to)\s+(.+)/i,
    ],
    keywords: ['访问', '打开', '浏览', '查看', '去', '看看', '想看', '网站', '网页', '链接', '网址', 'http', 'https', 'www', '.com', '.cn', 'github'],
    priority: 10,
    description: '浏览器访问和搜索',
  },

  // Git 提交相关
  {
    skillName: 'commit',
    patterns: [
      /(?:提交|commit)\s*(?:代码|更改|变更)?/i,
      /(?:git\s+commit|git\s+push)/i,
      /(?:保存|save)\s*(?:代码|更改)/i,
    ],
    keywords: ['提交', 'commit', 'push', '保存代码', 'git'],
    priority: 9,
    description: 'Git 提交操作',
  },

  // 代码审查相关
  {
    skillName: 'review',
    patterns: [
      /(?:审查|review|检查)\s*(?:代码|code)/i,
      /(?:code\s+review|pr\s+review)/i,
      /(?:看看|检查)\s*(?:这段|这些)?\s*代码/,
    ],
    keywords: ['审查', 'review', '检查代码', 'pr', 'code review'],
    priority: 8,
    description: '代码审查',
  },

  // 测试相关
  {
    skillName: 'test',
    patterns: [
      /(?:写|添加|创建)\s*(?:测试|test)/i,
      /(?:test|测试)\s*(?:这个|这段)?\s*(?:功能|代码|函数)?/i,
      /(?:tdd|测试驱动)/i,
    ],
    keywords: ['测试', 'test', 'tdd', '单元测试', '集成测试'],
    priority: 8,
    description: '编写测试',
  },

  // 调试相关
  {
    skillName: 'debug',
    patterns: [
      /(?:调试|debug|修复|fix)\s*(?:这个|这段)?\s*(?:bug|问题|错误)/i,
      /(?:为什么|why)\s*(?:不工作|不行|失败|报错)/i,
      /(?:出错|报错|error|exception)/i,
    ],
    keywords: ['调试', 'debug', '修复', 'bug', '错误', '问题', 'error', 'exception'],
    priority: 9,
    description: '调试问题',
  },

  // 规划相关
  {
    skillName: 'plan',
    patterns: [
      /(?:规划|plan|设计)\s*(?:这个|一个)?\s*(?:功能|feature)/i,
      /(?:实现|implement|开发)\s+(?:一个|新的)?\s*(.+)/i,
      /(?:怎么|如何)\s*(?:实现|做|开发)\s*(.+)/,
    ],
    keywords: ['规划', 'plan', '设计', '实现', '功能', 'feature', '开发', '认证', '登录', '怎么', '如何'],
    priority: 7,
    description: '功能规划',
  },

  // 文档相关
  {
    skillName: 'docs',
    patterns: [
      /(?:写|生成|创建)\s*(?:文档|doc|readme)/i,
      /(?:文档|documentation|readme)/i,
      /(?:注释|comment)\s*(?:这段|这些)?\s*代码/i,
    ],
    keywords: ['文档', 'doc', 'readme', '注释', 'documentation'],
    priority: 6,
    description: '编写文档',
  },

  // 头脑风暴相关
  {
    skillName: 'brainstorm',
    patterns: [
      /(?:头脑风暴|brainstorm|探索|想法)/i,
      /(?:有什么|还有|其他)\s*(?:方案|方法|办法|思路)/,
      /(?:比较|对比)\s*(?:方案|方法)/,
    ],
    keywords: ['头脑风暴', 'brainstorm', '探索', '方案', '思路', '想法'],
    priority: 6,
    description: '头脑风暴',
  },

  // 验证相关
  {
    skillName: 'verify',
    patterns: [
      /(?:验证|verify|检查|check)\s*(?:代码|质量)/i,
      /(?:运行|run)\s*(?:测试|test|检查)/i,
      /(?:确保|make sure|ensure)/i,
    ],
    keywords: ['验证', 'verify', '检查', 'check', '质量'],
    priority: 7,
    description: '验证代码',
  },

  // Superpowers 技能相关
  {
    skillName: 'superpowers:systematic-debugging',
    patterns: [
      /(?:系统性|systematic)\s*(?:调试|debug)/i,
      /(?:根因|root cause)\s*(?:分析|investigation)/i,
    ],
    keywords: ['系统性调试', 'systematic debugging', '根因分析', 'root cause'],
    priority: 10,
    description: '系统性调试',
  },

  {
    skillName: 'superpowers:test-driven-development',
    patterns: [
      /(?:tdd|测试驱动|test-driven)/i,
      /(?:red-green-refactor)/i,
    ],
    keywords: ['tdd', '测试驱动', 'test-driven', 'red-green-refactor'],
    priority: 10,
    description: '测试驱动开发',
  },
]

/**
 * 智能技能触发器
 */
export class SkillTriggerEngine {
  private lang: SupportedLang

  constructor(lang: SupportedLang = 'zh-CN') {
    this.lang = lang
  }

  /**
   * 分析用户输入，匹配对应的技能
   */
  analyze(userInput: string): TriggerMatch[] {
    const matches: TriggerMatch[] = []

    for (const trigger of SKILL_TRIGGERS) {
      const match = this.matchTrigger(userInput, trigger)
      if (match) {
        matches.push(match)
      }
    }

    // 按置信度和优先级排序
    return matches.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence
      }
      const aPriority = SKILL_TRIGGERS.find(t => t.skillName === a.skillName)?.priority || 0
      const bPriority = SKILL_TRIGGERS.find(t => t.skillName === b.skillName)?.priority || 0
      return bPriority - aPriority
    })
  }

  /**
   * 匹配单个触发器
   */
  private matchTrigger(userInput: string, trigger: SkillTrigger): TriggerMatch | null {
    let confidence = 0
    let matchedPattern: string | undefined
    const extractedParams: Record<string, string> = {}

    // 1. 正则模式匹配（高权重）
    for (const pattern of trigger.patterns) {
      const match = userInput.match(pattern)
      if (match) {
        confidence += 0.6
        matchedPattern = pattern.source

        // 提取参数
        if (match[1]) {
          extractedParams.param1 = match[1].trim()
        }
        if (match[2]) {
          extractedParams.param2 = match[2].trim()
        }

        break
      }
    }

    // 2. 关键词匹配（中权重）
    const lowerInput = userInput.toLowerCase()
    let keywordMatches = 0
    for (const keyword of trigger.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        keywordMatches++
      }
    }

    if (keywordMatches > 0) {
      confidence += Math.min(keywordMatches * 0.15, 0.4)
    }

    // 3. 置信度阈值
    if (confidence < 0.3) {
      return null
    }

    return {
      skillName: trigger.skillName,
      confidence: Math.min(confidence, 1),
      matchedPattern,
      extractedParams,
    }
  }

  /**
   * 获取最佳匹配
   */
  getBestMatch(userInput: string): TriggerMatch | null {
    const matches = this.analyze(userInput)
    return matches.length > 0 ? matches[0] : null
  }

  /**
   * 生成技能调用建议
   */
  generateSuggestion(match: TriggerMatch): string {
    const trigger = SKILL_TRIGGERS.find(t => t.skillName === match.skillName)
    if (!trigger) {
      return ''
    }

    const confidence = Math.round(match.confidence * 100)

    if (this.lang === 'zh-CN') {
      return `💡 检测到你可能想要 **${trigger.description}** (置信度: ${confidence}%)\n`
        + `建议使用: \`/${match.skillName}\`\n${
          match.extractedParams?.param1 ? `参数: ${match.extractedParams.param1}\n` : ''}`
    }
    else {
      return `💡 Detected you might want to **${trigger.description}** (confidence: ${confidence}%)\n`
        + `Suggest using: \`/${match.skillName}\`\n${
          match.extractedParams?.param1 ? `Params: ${match.extractedParams.param1}\n` : ''}`
    }
  }

  /**
   * 自动执行技能（如果置信度足够高）
   */
  shouldAutoExecute(match: TriggerMatch): boolean {
    // 置信度 > 0.8 且有明确参数时自动执行
    return match.confidence > 0.8 && !!match.extractedParams?.param1
  }

  /**
   * 生成技能调用命令
   */
  generateSkillCommand(match: TriggerMatch): string {
    const params = match.extractedParams?.param1 || ''
    return `/${match.skillName} ${params}`.trim()
  }
}

/**
 * 全局单例
 */
export const skillTrigger = new SkillTriggerEngine()
