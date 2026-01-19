/**
 * Postmortem Intelligence System - Type Definitions
 * 尸检报告智能系统 - 类型定义
 */

// ============================================================================
// Core Types
// ============================================================================

export type PostmortemSeverity = 'critical' | 'high' | 'medium' | 'low'

export type PostmortemCategory
  = | 'type-safety'
    | 'error-handling'
    | 'performance'
    | 'security'
    | 'logic-error'
    | 'race-condition'
    | 'memory-leak'
    | 'api-misuse'
    | 'configuration'
    | 'dependency'
    | 'other'

export type PostmortemStatus = 'active' | 'resolved' | 'monitoring' | 'archived'

// ============================================================================
// Postmortem Report
// ============================================================================

export interface PostmortemReport {
  /** 唯一标识符，格式: PM-XXX */
  id: string

  /** 简短标题 */
  title: string

  /** 严重程度 */
  severity: PostmortemSeverity

  /** 问题类别 */
  category: PostmortemCategory

  /** 状态 */
  status: PostmortemStatus

  /** 创建时间 */
  createdAt: string

  /** 更新时间 */
  updatedAt: string

  /** 相关的 Git 提交 */
  relatedCommits: CommitInfo[]

  /** 影响的版本范围 */
  affectedVersions: {
    from: string
    to: string
  }

  /** 问题描述 */
  description: string

  /** 根本原因分析 */
  rootCause: string[]

  /** 修复方案 */
  solution: {
    description: string
    codeExample?: {
      bad: string
      good: string
    }
  }

  /** 预防措施 */
  preventionMeasures: string[]

  /** AI 开发指令 - 注入到 CLAUDE.md */
  aiDirectives: string[]

  /** 检测模式 - 用于自动检测 */
  detectionPatterns: DetectionPattern[]

  /** 相关文件 */
  relatedFiles: string[]

  /** 标签 */
  tags: string[]

  /** 元数据 */
  metadata: Record<string, unknown>
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface CommitInfo {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
  files: string[]
}

export interface DetectionPattern {
  /** 模式类型 */
  type: 'regex' | 'ast' | 'semantic'

  /** 模式内容 */
  pattern: string

  /** 描述 */
  description: string

  /** 适用的文件类型 */
  fileTypes: string[]

  /** 严重程度 */
  severity: PostmortemSeverity
}

// ============================================================================
// Index & Summary
// ============================================================================

export interface PostmortemIndex {
  /** 版本 */
  version: string

  /** 最后更新时间 */
  lastUpdated: string

  /** 总数统计 */
  stats: {
    total: number
    bySeverity: Record<PostmortemSeverity, number>
    byCategory: Record<PostmortemCategory, number>
    byStatus: Record<PostmortemStatus, number>
  }

  /** 所有报告的元数据 */
  reports: PostmortemMeta[]
}

export interface PostmortemMeta {
  id: string
  title: string
  severity: PostmortemSeverity
  category: PostmortemCategory
  status: PostmortemStatus
  createdAt: string
  filePath: string
}

export interface ReleaseSummary {
  /** 版本号 */
  version: string

  /** 发布时间 */
  releaseDate: string

  /** 包含的 fix commits 数量 */
  fixCommitCount: number

  /** 新增的 Postmortem */
  newPostmortems: string[]

  /** 更新的 Postmortem */
  updatedPostmortems: string[]

  /** 摘要 */
  summary: string

  /** 关键教训 */
  keyLessons: string[]
}

// ============================================================================
// Analysis Types
// ============================================================================

export interface FixCommitAnalysis {
  commit: CommitInfo
  bugType: PostmortemCategory
  severity: PostmortemSeverity
  rootCause: string
  solution: string
  preventionSuggestions: string[]
  relatedPostmortems: string[]
}

export interface CodeCheckResult {
  file: string
  line: number
  column: number
  pattern: DetectionPattern
  postmortemId: string
  message: string
  suggestion: string
}

export interface PostmortemCheckReport {
  timestamp: string
  filesChecked: number
  issuesFound: CodeCheckResult[]
  summary: {
    critical: number
    high: number
    medium: number
    low: number
  }
  passed: boolean
}

// ============================================================================
// CLAUDE.md Integration
// ============================================================================

export interface ClaudeMdInjection {
  /** 注入的部分标识 */
  sectionId: string

  /** 标题 */
  title: string

  /** 内容 */
  content: string

  /** 优先级 (决定显示顺序) */
  priority: number

  /** 来源 Postmortem IDs */
  sourcePostmortems: string[]

  /** 最后更新时间 */
  lastUpdated: string
}

// ============================================================================
// Configuration
// ============================================================================

export interface PostmortemConfig {
  /** 是否启用 */
  enabled: boolean

  /** Postmortem 目录 */
  directory: string

  /** 自动同步到 CLAUDE.md */
  autoSyncToClaudeMd: boolean

  /** 同步的最大条目数 */
  maxSyncItems: number

  /** 只同步指定严重程度以上的 */
  minSyncSeverity: PostmortemSeverity

  /** 检测模式配置 */
  detection: {
    enabled: boolean
    excludePatterns: string[]
    includePatterns: string[]
  }

  /** AI 分析配置 */
  aiAnalysis: {
    provider: 'claude' | 'openai' | 'local'
    model?: string
    maxTokens?: number
  }
}

// ============================================================================
// Event Types (for hooks)
// ============================================================================

export interface PostmortemEvent {
  type: 'created' | 'updated' | 'resolved' | 'triggered'
  postmortemId: string
  timestamp: string
  details: Record<string, unknown>
}

export interface PostmortemHook {
  event: PostmortemEvent['type']
  handler: (event: PostmortemEvent) => Promise<void>
}
