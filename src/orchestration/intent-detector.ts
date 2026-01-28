/**
 * Intent Detector
 *
 * Analyzes user input to detect the intent behind a request.
 * Supports multilingual keyword matching (English, Chinese) and confidence scoring.
 * Performance target: < 500ms per detection.
 */

import type {
  DetectedIntent,
  DetectionContext,
  IntentAnalysis,
  IntentKeywords,
} from '../types/orchestration'
import { IntentType } from '../types/orchestration'

/**
 * Keyword patterns for each intent type.
 * Weights: primary keywords (2.0), secondary keywords (1.0), negative keywords (-1.5)
 */
const INTENT_KEYWORDS: Record<IntentType, IntentKeywords> = {
  [IntentType.CODE_REVIEW]: {
    primary: {
      en: ['review', 'code review', 'inspect', 'audit', 'check code', 'analyze code', 'quality check'],
      zh: ['审查', '代码审查', '检查', '审核', '审查代码', '代码检查', '质量检查'],
    },
    secondary: {
      en: ['improve', 'better', 'best practices', 'clean code', 'refactor', 'optimize'],
      zh: ['改进', '优化', '最佳实践', '整洁代码', '重构'],
    },
    negative: {
      en: ['write', 'create', 'implement', 'add feature', 'new feature'],
      zh: ['编写', '创建', '实现', '添加功能', '新功能'],
    },
  },

  [IntentType.FEATURE_DEVELOPMENT]: {
    primary: {
      en: ['implement', 'develop', 'create feature', 'add feature', 'build', 'new feature', 'feature request'],
      zh: ['实现', '开发', '添加功能', '构建', '新功能', '功能开发'],
    },
    secondary: {
      en: ['feature', 'functionality', 'capability', 'user story', 'requirement'],
      zh: ['功能', '特性', '用户故事', '需求'],
    },
    negative: {
      en: ['fix', 'debug', 'test', 'document', 'review'],
      zh: ['修复', '调试', '测试', '文档', '审查'],
    },
  },

  [IntentType.BUG_FIX]: {
    primary: {
      en: ['fix', 'bug', 'error', 'debug', 'issue', 'resolve', 'patch', 'troubleshoot'],
      zh: ['修复', '错误', '调试', '问题', '解决', '补丁', '故障排除'],
    },
    secondary: {
      en: ['not working', 'broken', 'crash', 'fail', 'exception', 'wrong'],
      zh: ['不工作', '坏了', '崩溃', '失败', '异常', '错误'],
    },
    negative: {
      en: ['test', 'review', 'document', 'create', 'implement'],
      zh: ['测试', '审查', '文档', '创建', '实现'],
    },
  },

  [IntentType.TESTING]: {
    primary: {
      en: ['test', 'testing', 'tdd', 'unit test', 'integration test', 'test coverage', 'write test'],
      zh: ['测试', '单元测试', '集成测试', '测试覆盖率', '编写测试'],
    },
    secondary: {
      en: ['spec', 'specification', 'assert', 'verify', 'validate', 'mock', 'stub'],
      zh: ['规范', '断言', '验证', '确认', '模拟'],
    },
    negative: {
      en: ['review', 'document', 'implement', 'create feature'],
      zh: ['审查', '文档', '实现', '创建功能'],
    },
  },

  [IntentType.DOCUMENTATION]: {
    primary: {
      en: ['document', 'documentation', 'readme', 'docstring', 'comment', 'write doc', 'api doc'],
      zh: ['文档', '说明文档', '注释', '编写文档', 'API文档'],
    },
    secondary: {
      en: ['explain', 'describe', 'guide', 'tutorial', 'example', 'usage'],
      zh: ['解释', '描述', '指南', '教程', '示例', '用法'],
    },
    negative: {
      en: ['test', 'review', 'implement', 'fix', 'refactor'],
      zh: ['测试', '审查', '实现', '修复', '重构'],
    },
  },

  [IntentType.REFACTORING]: {
    primary: {
      en: ['refactor', 'restructure', 'reorganize', 'clean up', 'simplify', 'rearchitecture'],
      zh: ['重构', '重组', '清理', '简化', '架构重设计'],
    },
    secondary: {
      en: ['improve structure', 'better design', 'code smell', 'technical debt', 'maintainability'],
      zh: ['改进结构', '更好设计', '代码异味', '技术债务', '可维护性'],
    },
    negative: {
      en: ['add feature', 'new functionality', 'implement feature'],
      zh: ['添加功能', '新功能', '实现功能'],
    },
  },

  [IntentType.OPTIMIZATION]: {
    primary: {
      en: ['optimize', 'performance', 'speed up', 'efficient', 'faster', 'improve performance'],
      zh: ['优化', '性能', '加速', '高效', '更快', '提升性能'],
    },
    secondary: {
      en: ['memory', 'cpu', 'latency', 'throughput', 'resource', 'scaling'],
      zh: ['内存', 'CPU', '延迟', '吞吐量', '资源', '扩展'],
    },
    negative: {
      en: ['add feature', 'new functionality', 'create'],
      zh: ['添加功能', '新功能', '创建'],
    },
  },

  [IntentType.INQUIRY]: {
    primary: {
      en: ['what', 'how', 'why', 'explain', 'tell me', 'show me', 'help me understand', '?'],
      zh: ['什么', '如何', '为什么', '解释', '告诉我', '展示给我', '帮我理解', '？'],
    },
    secondary: {
      en: ['understand', 'learn', 'clarify', 'describe', 'overview'],
      zh: ['理解', '学习', '澄清', '描述', '概览'],
    },
    negative: {
      en: ['do', 'implement', 'fix', 'create', 'write', 'test'],
      zh: ['做', '实现', '修复', '创建', '编写', '测试'],
    },
  },
}

/**
 * Configuration for intent detection behavior.
 */
interface DetectorConfig {
  /** Minimum confidence threshold for intent detection */
  minConfidence: number

  /** Maximum number of alternative intents to return */
  maxAlternatives: number

  /** Weight for keyword matching */
  keywordWeight: number

  /** Weight for context matching */
  contextWeight: number

  /** Weight for historical patterns */
  historyWeight: number
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: DetectorConfig = {
  minConfidence: 0.3,
  maxAlternatives: 2,
  keywordWeight: 0.7,
  contextWeight: 0.2,
  historyWeight: 0.1,
}

/**
 * Intent Detector class for analyzing user input and detecting intent.
 */
export class IntentDetector {
  private config: DetectorConfig

  constructor(config: Partial<DetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Detect the primary intent from user input.
   *
   * @param input - User input text
   * @param context - Optional detection context
   * @returns Detected intent with confidence score
   *
   * Performance target: < 500ms
   */
  detectIntent(input: string, context?: DetectionContext): DetectedIntent {
    const startTime = Date.now()

    // Normalize input
    const normalizedInput = input.toLowerCase().trim()

    // Calculate scores for each intent
    const intentScores = this.calculateIntentScores(normalizedInput, context)

    // Sort by confidence score
    const sortedIntents = Array.from(intentScores.entries()).sort((a, b) => b[1] - a[1])

    // Get top intent
    const [topIntent, topScore] = sortedIntents[0]

    // Get matched keywords
    const matchedKeywords = this.extractMatchedKeywords(normalizedInput, topIntent)

    // Get alternative intents (always provide if there are other non-zero scores)
    const alternatives = sortedIntents
      .slice(1, this.config.maxAlternatives + 1)
      .filter(([_, score]) => score > 0.1) // Very low threshold to show alternatives
      .map(([intent, confidence]) => ({ intent, confidence }))

    const detectedIntent: DetectedIntent = {
      intent: topIntent,
      confidence: topScore,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      matchedKeywords,
      timestamp: Date.now(),
    }

    // Performance monitoring
    const duration = Date.now() - startTime
    if (duration > 500) {
      console.warn(`Intent detection exceeded target: ${duration}ms`)
    }

    return detectedIntent
  }

  /**
   * Perform detailed intent analysis with full breakdown.
   *
   * @param input - User input text
   * @param context - Optional detection context
   * @returns Complete intent analysis
   */
  analyze(input: string, context?: DetectionContext): IntentAnalysis {
    const normalizedInput = input.toLowerCase().trim()
    const intent = this.detectIntent(input, context)

    // Collect all matches
    const matches = this.collectAllMatches(normalizedInput)

    // Calculate confidence breakdown
    const keywordScore = this.calculateKeywordScore(normalizedInput, intent.intent)
    const contextScore = this.calculateContextScore(normalizedInput, context, intent.intent)
    const historyScore = this.calculateHistoryScore(context, intent.intent)

    const finalScore = (keywordScore * this.config.keywordWeight)
      + (contextScore * this.config.contextWeight)
      + (historyScore * this.config.historyWeight)

    return {
      intent,
      analysis: {
        input: normalizedInput,
        context: context || {},
        matches,
        confidenceBreakdown: {
          keywordScore,
          contextScore,
          historyScore,
          finalScore,
        },
      },
    }
  }

  /**
   * Calculate confidence scores for all intents.
   */
  private calculateIntentScores(
    input: string,
    context?: DetectionContext,
  ): Map<IntentType, number> {
    const scores = new Map<IntentType, number>()

    for (const intent of Object.values(IntentType)) {
      const keywordScore = this.calculateKeywordScore(input, intent)
      const contextScore = this.calculateContextScore(input, context, intent)
      const historyScore = this.calculateHistoryScore(context, intent)

      const finalScore = (keywordScore * this.config.keywordWeight)
        + (contextScore * this.config.contextWeight)
        + (historyScore * this.config.historyWeight)

      scores.set(intent, finalScore)
    }

    return scores
  }

  /**
   * Calculate keyword matching score for a specific intent.
   */
  private calculateKeywordScore(input: string, intent: IntentType): number {
    const keywords = INTENT_KEYWORDS[intent]
    if (!keywords)
      return 0

    let score = 0

    // Check primary keywords (weight: 2.0)
    for (const keyword of [...keywords.primary.en, ...keywords.primary.zh]) {
      if (input.includes(keyword.toLowerCase())) {
        score += 2.0
      }
    }

    // Check secondary keywords (weight: 1.0)
    for (const keyword of [...keywords.secondary.en, ...keywords.secondary.zh]) {
      if (input.includes(keyword.toLowerCase())) {
        score += 1.0
      }
    }

    // Check negative keywords (weight: -1.5)
    if (keywords.negative) {
      for (const keyword of [...keywords.negative.en, ...keywords.negative.zh]) {
        if (input.includes(keyword.toLowerCase())) {
          score -= 1.5
        }
      }
    }

    // Normalize to 0-1 range (divide by 3 instead of 5 for more generous scoring)
    return Math.min(Math.max(score / 3, 0), 1)
  }

  /**
   * Calculate context-based score for a specific intent.
   */
  private calculateContextScore(
    input: string,
    context?: DetectionContext,
    intent?: IntentType,
  ): number {
    if (!context)
      return 0.5 // Neutral score when no context

    let score = 0.5

    // Check git context
    if (context.gitInfo?.hasChanges) {
      if (intent === IntentType.CODE_REVIEW || intent === IntentType.BUG_FIX) {
        score += 0.2
      }
    }

    // Check active files
    if (context.activeFiles && context.activeFiles.length > 0) {
      const testFiles = context.activeFiles.filter(f =>
        f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__'),
      )

      if (testFiles.length > 0 && intent === IntentType.TESTING) {
        score += 0.3
      }
    }

    // Check history
    if (context.history && context.history.length > 0) {
      const recentHistory = context.history.slice(-3)
      const hasRecentTest = recentHistory.some(h =>
        h.includes('test') || h.includes('spec'),
      )

      if (hasRecentTest && intent === IntentType.TESTING) {
        score += 0.2
      }
    }

    return Math.min(score, 1)
  }

  /**
   * Calculate historical pattern score.
   */
  private calculateHistoryScore(
    context?: DetectionContext,
    intent?: IntentType,
  ): number {
    if (!context?.previousIntents || context.previousIntents.length === 0) {
      return 0.5 // Neutral score
    }

    // Check if the same intent was detected recently
    const recentSameIntents = context.previousIntents.filter(
      i => i.intent === intent && (Date.now() - i.timestamp) < 300000, // 5 minutes
    )

    if (recentSameIntents.length > 0) {
      return 0.8 // High confidence if same intent detected recently
    }

    return 0.5
  }

  /**
   * Extract matched keywords for a specific intent.
   */
  private extractMatchedKeywords(input: string, intent: IntentType): string[] {
    const keywords = INTENT_KEYWORDS[intent]
    if (!keywords)
      return []

    const matched: string[] = []

    // Check all keyword types
    const allKeywords = [
      ...keywords.primary.en,
      ...keywords.primary.zh,
      ...keywords.secondary.en,
      ...keywords.secondary.zh,
    ]

    for (const keyword of allKeywords) {
      if (input.includes(keyword.toLowerCase())) {
        matched.push(keyword)
      }
    }

    return matched
  }

  /**
   * Collect all keyword matches across all intents.
   */
  private collectAllMatches(input: string): Array<{
    keyword: string
    intent: IntentType
    weight: number
  }> {
    const matches: Array<{ keyword: string, intent: IntentType, weight: number }> = []

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      // Primary keywords (weight: 2.0)
      for (const keyword of [...keywords.primary.en, ...keywords.primary.zh]) {
        if (input.includes(keyword.toLowerCase())) {
          matches.push({ keyword, intent: intent as IntentType, weight: 2.0 })
        }
      }

      // Secondary keywords (weight: 1.0)
      for (const keyword of [...keywords.secondary.en, ...keywords.secondary.zh]) {
        if (input.includes(keyword.toLowerCase())) {
          matches.push({ keyword, intent: intent as IntentType, weight: 1.0 })
        }
      }
    }

    return matches
  }
}

/**
 * Convenience function to detect intent without instantiating the class.
 *
 * @param input - User input text
 * @param context - Optional detection context
 * @returns Detected intent
 */
export function detectIntent(input: string, context?: DetectionContext): DetectedIntent {
  const detector = new IntentDetector()
  return detector.detectIntent(input, context)
}

/**
 * Convenience function to perform full intent analysis.
 *
 * @param input - User input text
 * @param context - Optional detection context
 * @returns Complete intent analysis
 */
export function analyzeIntent(input: string, context?: DetectionContext): IntentAnalysis {
  const detector = new IntentDetector()
  return detector.analyze(input, context)
}
