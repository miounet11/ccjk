/**
 * CCJK 2.0 - Three-Layer Traceability Framework Types
 */

/**
 * 追溯层级
 */
export enum TraceabilityLayer {
  L1_ERROR = 'L1', // 表面错误
  L2_PATTERN = 'L2', // 设计模式
  L3_DOMAIN = 'L3', // 领域约束
}

/**
 * 错误分类
 */
export interface ErrorClassification {
  layer: TraceabilityLayer
  errorType: string
  errorCode?: string
  errorMessage: string
  stackTrace?: string
  confidence: number // 分类置信度 0-1
  timestamp: string
}

/**
 * 设计模式匹配
 */
export interface PatternMatch {
  patternId: string
  patternName: string
  description: string
  layer: TraceabilityLayer
  matched: boolean
  confidence: number
  context: Record<string, any>
}

/**
 * 领域约束
 */
export interface DomainConstraint {
  constraintId: string
  domain: string // 领域：web, cli, fintech, etc.
  rule: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  violated: boolean
  context: Record<string, any>
}

/**
 * 追溯链
 */
export interface TraceabilityChain {
  chainId: string
  inputError: ErrorClassification
  patterns: PatternMatch[]
  constraints: DomainConstraint[]
  recommendedSolution: Solution
  timestamp: string
}

/**
 * 推荐解决方案
 */
export interface Solution {
  solutionId: string
  type: 'architectural' | 'implementation' | 'configuration'
  title: string
  description: string
  steps: string[]
  rationale: string
  tradeoffs: string[]
  priority: 'low' | 'medium' | 'high'
}

/**
 * 追溯分析结果
 */
export interface TraceabilityAnalysis {
  success: boolean
  chain: TraceabilityChain
  analysisTime: number // 分析耗时（ms）
  confidence: number // 整体置信度
  timestamp: string
}
