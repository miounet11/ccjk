/**
 * Postmortem Analyzer - Git 历史分析与 Postmortem 生成
 * 分析 fix commits，自动生成专业的尸检报告
 */

import type {
  CommitInfo,
  DetectionPattern,
  FixCommitAnalysis,
  PostmortemCategory,
  PostmortemReport,
  PostmortemSeverity,
} from './types'
import { execSync } from 'node:child_process'
import * as path from 'node:path'
import * as process from 'node:process'

// ============================================================================
// Git Analysis
// ============================================================================

/**
 * 获取 fix 类型的 commits
 */
export function getFixCommits(options: {
  since?: string
  until?: string
  limit?: number
  cwd?: string
}): CommitInfo[] {
  const { since, until, limit = 100, cwd = process.cwd() } = options

  let gitCmd = 'git log --pretty=format:"%H|%h|%s|%an|%ai" --name-only'

  if (since) {
    gitCmd += ` ${since}..${until || 'HEAD'}`
  }

  gitCmd += ` -n ${limit}`

  try {
    const output = execSync(gitCmd, { cwd, encoding: 'utf-8' })
    return parseGitLog(output)
  }
  catch {
    return []
  }
}

/**
 * 解析 git log 输出
 */
function parseGitLog(output: string): CommitInfo[] {
  const commits: CommitInfo[] = []
  const entries = output.trim().split('\n\n')

  for (const entry of entries) {
    const lines = entry.split('\n')
    if (lines.length === 0)
      continue

    const [firstLine, ...fileLines] = lines
    const parts = firstLine.split('|')

    if (parts.length < 5)
      continue

    const [hash, shortHash, message, author, date] = parts
    const files = fileLines.filter(f => f.trim())

    // 只保留 fix 类型的 commits
    if (isFixCommit(message)) {
      commits.push({
        hash,
        shortHash,
        message,
        author,
        date,
        files,
      })
    }
  }

  return commits
}

/**
 * 判断是否为 fix commit
 */
function isFixCommit(message: string): boolean {
  const fixPatterns = [
    /^fix[(:]/i,
    /^bugfix[(:]/i,
    /^hotfix[(:]/i,
    /\bfix\b/i,
    /\bbug\b/i,
    /\brepair\b/i,
    /\bresolve\b/i,
    /\bcorrect\b/i,
    /修复/,
    /修正/,
    /解决/,
    /bug/i,
  ]

  return fixPatterns.some(p => p.test(message))
}

// ============================================================================
// Commit Analysis
// ============================================================================

/**
 * 分析单个 fix commit
 */
export function analyzeFixCommit(commit: CommitInfo, cwd: string = process.cwd()): FixCommitAnalysis {
  // 获取 commit 的 diff
  const diff = getCommitDiff(commit.hash, cwd)

  // 分析 bug 类型
  const bugType = detectBugType(commit.message, diff)

  // 分析严重程度
  const severity = detectSeverity(commit.message, diff, commit.files)

  // 提取根本原因
  const rootCause = extractRootCause(commit.message, diff)

  // 提取解决方案
  const solution = extractSolution(diff)

  // 生成预防建议
  const preventionSuggestions = generatePreventionSuggestions(bugType, diff)

  return {
    commit,
    bugType,
    severity,
    rootCause,
    solution,
    preventionSuggestions,
    relatedPostmortems: [],
  }
}

/**
 * 获取 commit 的 diff
 */
function getCommitDiff(hash: string, cwd: string): string {
  try {
    return execSync(`git show ${hash} --pretty="" --patch`, {
      cwd,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 10, // 10MB
    })
  }
  catch {
    return ''
  }
}

/**
 * 检测 bug 类型
 */
function detectBugType(message: string, diff: string): PostmortemCategory {
  const content = `${message}\n${diff}`.toLowerCase()

  const patterns: Array<{ category: PostmortemCategory, patterns: RegExp[] }> = [
    {
      category: 'type-safety',
      patterns: [
        /null|undefined|cannot read|typeerror/,
        /类型|空值|未定义/,
        /optional chaining|\?\./,
        /strict.*null|null.*check/,
      ],
    },
    {
      category: 'error-handling',
      patterns: [
        /try.*catch|exception|throw|error.*handling/,
        /unhandled.*rejection|promise.*reject/,
        /异常|错误处理|捕获/,
      ],
    },
    {
      category: 'performance',
      patterns: [
        /performance|slow|timeout|memory|leak/,
        /optimize|optimization|cache/,
        /性能|优化|缓存|内存/,
      ],
    },
    {
      category: 'security',
      patterns: [
        /security|xss|csrf|injection|auth/,
        /vulnerability|exploit|sanitize/,
        /安全|漏洞|注入|认证/,
      ],
    },
    {
      category: 'race-condition',
      patterns: [
        /race.*condition|concurrent|async.*await/,
        /deadlock|mutex|lock/,
        /竞态|并发|死锁/,
      ],
    },
    {
      category: 'logic-error',
      patterns: [
        /logic|incorrect|wrong.*result/,
        /逻辑|错误结果|计算错误/,
      ],
    },
    {
      category: 'api-misuse',
      patterns: [
        /api.*usage|incorrect.*call|wrong.*parameter/,
        /接口|调用错误|参数错误/,
      ],
    },
    {
      category: 'configuration',
      patterns: [
        /config|setting|environment|env/,
        /配置|环境|设置/,
      ],
    },
    {
      category: 'dependency',
      patterns: [
        /dependency|package|version|upgrade/,
        /依赖|版本|升级/,
      ],
    },
  ]

  for (const { category, patterns: categoryPatterns } of patterns) {
    if (categoryPatterns.some(p => p.test(content))) {
      return category
    }
  }

  return 'other'
}

/**
 * 检测严重程度
 */
function detectSeverity(message: string, diff: string, files: string[]): PostmortemSeverity {
  const content = `${message}\n${diff}`.toLowerCase()

  // Critical 指标
  if (
    /critical|crash|data.*loss|security.*vuln/i.test(content)
    || files.some(f => /auth|security|payment/i.test(f))
  ) {
    return 'critical'
  }

  // High 指标
  if (
    /breaking|major|important|urgent/i.test(content)
    || files.length > 10
  ) {
    return 'high'
  }

  // Medium 指标
  if (
    /moderate|minor.*issue/i.test(content)
    || files.length > 3
  ) {
    return 'medium'
  }

  return 'low'
}

/**
 * 提取根本原因
 */
function extractRootCause(message: string, diff: string): string {
  // 从 commit message 中提取
  const causePatterns = [
    /caused by[:\s]+(.+)/i,
    /root cause[:\s]+(.+)/i,
    /because[:\s]+(.+)/i,
    /due to[:\s]+(.+)/i,
    /原因[：:]\s*(.+)/,
    /由于\s*(.+)/,
  ]

  for (const pattern of causePatterns) {
    const match = message.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  // 从 diff 分析
  const removedLines = diff.match(/^-[^-].*/gm) || []
  const addedLines = diff.match(/^\+[^+].*/gm) || []

  if (removedLines.length > 0 && addedLines.length > 0) {
    return `代码变更: 移除 ${removedLines.length} 行, 新增 ${addedLines.length} 行`
  }

  return '需要进一步分析'
}

/**
 * 提取解决方案
 */
function extractSolution(diff: string): string {
  const addedLines = diff.match(/^\+[^+].*/gm) || []

  if (addedLines.length === 0) {
    return '删除了问题代码'
  }

  if (addedLines.length <= 5) {
    return addedLines.map(l => l.substring(1)).join('\n')
  }

  return `新增 ${addedLines.length} 行代码修复问题`
}

/**
 * 生成预防建议
 */
function generatePreventionSuggestions(bugType: PostmortemCategory, _diff: string): string[] {
  const suggestions: Record<PostmortemCategory, string[]> = {
    'type-safety': [
      '启用 TypeScript strict 模式',
      '使用可选链操作符 (?.) 进行空值检查',
      '为所有外部数据添加运行时验证',
      '使用 zod 或 io-ts 进行类型验证',
    ],
    'error-handling': [
      '为所有异步操作添加 try-catch',
      '实现全局错误处理中间件',
      '添加错误边界组件 (React)',
      '使用 Result 类型替代异常',
    ],
    'performance': [
      '添加性能监控和告警',
      '实现缓存策略',
      '使用懒加载和代码分割',
      '定期进行性能测试',
    ],
    'security': [
      '实施安全代码审查',
      '使用安全扫描工具',
      '遵循 OWASP 安全指南',
      '定期更新依赖',
    ],
    'race-condition': [
      '使用适当的锁机制',
      '避免共享可变状态',
      '使用原子操作',
      '添加并发测试',
    ],
    'logic-error': [
      '增加单元测试覆盖',
      '实施代码审查',
      '添加断言和不变量检查',
      '使用形式化验证工具',
    ],
    'api-misuse': [
      '完善 API 文档',
      '添加参数验证',
      '提供使用示例',
      '实现 API 版本控制',
    ],
    'configuration': [
      '使用配置验证',
      '提供默认配置',
      '文档化所有配置项',
      '实现配置热重载',
    ],
    'dependency': [
      '锁定依赖版本',
      '定期更新依赖',
      '使用依赖扫描工具',
      '测试依赖升级',
    ],
    'memory-leak': [
      '实现资源清理',
      '使用内存分析工具',
      '避免循环引用',
      '定期进行内存测试',
    ],
    'other': [
      '增加测试覆盖',
      '实施代码审查',
      '完善文档',
    ],
  }

  return suggestions[bugType] || suggestions.other
}

// ============================================================================
// Postmortem Generation
// ============================================================================

/**
 * 从分析结果生成 Postmortem 报告
 */
export function generatePostmortem(
  analyses: FixCommitAnalysis[],
  existingIds: string[],
): PostmortemReport[] {
  // 按类型分组
  const grouped = groupByCategory(analyses)
  const reports: PostmortemReport[] = []

  let nextId = getNextId(existingIds)

  for (const [category, categoryAnalyses] of Object.entries(grouped)) {
    // 合并相似的分析
    const merged = mergeAnalyses(categoryAnalyses)

    for (const analysis of merged) {
      const id = `PM-${String(nextId++).padStart(3, '0')}`

      const report: PostmortemReport = {
        id,
        title: generateTitle(analysis),
        severity: analysis.severity,
        category: analysis.bugType,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        relatedCommits: [analysis.commit],
        affectedVersions: {
          from: 'unknown',
          to: 'unknown',
        },
        description: generateDescription(analysis),
        rootCause: [analysis.rootCause],
        solution: {
          description: analysis.solution,
        },
        preventionMeasures: analysis.preventionSuggestions,
        aiDirectives: generateAiDirectives(analysis),
        detectionPatterns: generateDetectionPatterns(analysis),
        relatedFiles: analysis.commit.files,
        tags: [category, analysis.severity],
        metadata: {
          generatedBy: 'ccjk-postmortem',
          version: '1.0.0',
        },
      }

      reports.push(report)
    }
  }

  return reports
}

/**
 * 按类别分组
 */
function groupByCategory(analyses: FixCommitAnalysis[]): Record<string, FixCommitAnalysis[]> {
  const grouped: Record<string, FixCommitAnalysis[]> = {}

  for (const analysis of analyses) {
    const category = analysis.bugType
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(analysis)
  }

  return grouped
}

/**
 * 合并相似的分析
 */
function mergeAnalyses(analyses: FixCommitAnalysis[]): FixCommitAnalysis[] {
  // 简单实现：如果文件重叠超过 50%，则合并
  const merged: FixCommitAnalysis[] = []

  for (const analysis of analyses) {
    const similar = merged.find(m =>
      calculateFileOverlap(m.commit.files, analysis.commit.files) > 0.5,
    )

    if (similar) {
      // 合并到已有的分析
      similar.commit.files = Array.from(new Set([...similar.commit.files, ...analysis.commit.files]))
      similar.preventionSuggestions = Array.from(new Set([...similar.preventionSuggestions, ...analysis.preventionSuggestions]))
    }
    else {
      merged.push({ ...analysis })
    }
  }

  return merged
}

/**
 * 计算文件重叠率
 */
function calculateFileOverlap(files1: string[], files2: string[]): number {
  const set1 = new Set(files1)
  const set2 = new Set(files2)
  const intersection = Array.from(set1).filter(f => set2.has(f))
  const union = new Set([...files1, ...files2])

  return intersection.length / union.size
}

/**
 * 获取下一个 ID
 */
function getNextId(existingIds: string[]): number {
  const numbers = existingIds
    .map(id => Number.parseInt(id.replace('PM-', ''), 10))
    .filter(n => !Number.isNaN(n))

  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1
}

/**
 * 生成标题
 */
function generateTitle(analysis: FixCommitAnalysis): string {
  const categoryTitles: Record<PostmortemCategory, string> = {
    'type-safety': '类型安全问题',
    'error-handling': '错误处理缺失',
    'performance': '性能问题',
    'security': '安全漏洞',
    'race-condition': '竞态条件',
    'logic-error': '逻辑错误',
    'api-misuse': 'API 使用不当',
    'configuration': '配置问题',
    'dependency': '依赖问题',
    'memory-leak': '内存泄漏',
    'other': '其他问题',
  }

  const baseTitle = categoryTitles[analysis.bugType] || '未分类问题'

  // 从 commit message 提取更具体的描述
  const message = analysis.commit.message
  const specificPart = message.replace(/^(fix|bugfix|hotfix)[(:]\s*/i, '').split('\n')[0]

  if (specificPart && specificPart.length < 50) {
    return `${baseTitle}: ${specificPart}`
  }

  return baseTitle
}

/**
 * 生成描述
 */
function generateDescription(analysis: FixCommitAnalysis): string {
  return `
在 ${analysis.commit.date} 发现并修复了一个 ${analysis.bugType} 类型的问题。

**提交信息**: ${analysis.commit.message}

**影响文件**:
${analysis.commit.files.map(f => `- ${f}`).join('\n')}

**根本原因**: ${analysis.rootCause}
`.trim()
}

/**
 * 生成 AI 指令
 */
function generateAiDirectives(analysis: FixCommitAnalysis): string[] {
  const directives: string[] = []

  // 基于类别的通用指令
  const categoryDirectives: Record<PostmortemCategory, string[]> = {
    'type-safety': [
      '处理外部数据时必须进行空值检查',
      '使用 TypeScript 严格模式',
      '避免使用 any 类型',
    ],
    'error-handling': [
      '所有异步操作必须有错误处理',
      '提供有意义的错误消息',
      '实现优雅降级',
    ],
    'performance': [
      '避免在循环中进行 I/O 操作',
      '使用适当的缓存策略',
      '注意大数据集的处理',
    ],
    'security': [
      '验证所有用户输入',
      '使用参数化查询',
      '不要在日志中记录敏感信息',
    ],
    'race-condition': [
      '注意异步操作的执行顺序',
      '使用适当的同步机制',
      '避免共享可变状态',
    ],
    'logic-error': [
      '添加边界条件检查',
      '使用断言验证假设',
      '编写单元测试覆盖边界情况',
    ],
    'api-misuse': [
      '查阅 API 文档确认正确用法',
      '检查参数类型和范围',
      '处理所有可能的返回值',
    ],
    'configuration': [
      '提供合理的默认值',
      '验证配置值的有效性',
      '文档化配置选项',
    ],
    'dependency': [
      '检查依赖的兼容性',
      '阅读更新日志',
      '在升级前进行测试',
    ],
    'memory-leak': [
      '及时清理不再使用的资源',
      '避免循环引用',
      '使用 WeakMap/WeakSet',
    ],
    'other': [
      '仔细审查代码变更',
      '添加适当的测试',
    ],
  }

  directives.push(...(categoryDirectives[analysis.bugType] || categoryDirectives.other))

  // 基于文件的特定指令
  for (const file of analysis.commit.files) {
    if (file.includes('api') || file.includes('service')) {
      directives.push(`修改 ${path.basename(file)} 时注意 API 兼容性`)
    }
    if (file.includes('config')) {
      directives.push(`修改配置文件时确保向后兼容`)
    }
  }

  return Array.from(new Set(directives))
}

/**
 * 生成检测模式
 */
function generateDetectionPatterns(analysis: FixCommitAnalysis): DetectionPattern[] {
  const patterns: DetectionPattern[] = []

  const categoryPatterns: Record<PostmortemCategory, DetectionPattern[]> = {
    'type-safety': [
      {
        type: 'regex',
        pattern: '\\.\\w+\\.\\w+\\.\\w+(?!\\?)',
        description: '连续属性访问未使用可选链',
        fileTypes: ['.ts', '.tsx', '.js', '.jsx'],
        severity: 'medium',
      },
      {
        type: 'regex',
        pattern: 'as any',
        description: '使用 any 类型断言',
        fileTypes: ['.ts', '.tsx'],
        severity: 'low',
      },
    ],
    'error-handling': [
      {
        type: 'regex',
        pattern: 'catch\\s*\\(\\s*\\w*\\s*\\)\\s*\\{\\s*\\}',
        description: '空的 catch 块',
        fileTypes: ['.ts', '.tsx', '.js', '.jsx'],
        severity: 'high',
      },
      {
        type: 'regex',
        pattern: '\\.then\\([^)]+\\)(?!\\.catch)',
        description: 'Promise 未处理 rejection',
        fileTypes: ['.ts', '.tsx', '.js', '.jsx'],
        severity: 'medium',
      },
    ],
    'performance': [
      {
        type: 'regex',
        pattern: 'for\\s*\\([^)]+\\)\\s*\\{[^}]*await',
        description: '循环中使用 await',
        fileTypes: ['.ts', '.tsx', '.js', '.jsx'],
        severity: 'medium',
      },
    ],
    'security': [
      {
        type: 'regex',
        pattern: 'innerHTML\\s*=',
        description: '直接设置 innerHTML 可能导致 XSS',
        fileTypes: ['.ts', '.tsx', '.js', '.jsx'],
        severity: 'high',
      },
      {
        type: 'regex',
        pattern: 'eval\\s*\\(',
        description: '使用 eval 存在安全风险',
        fileTypes: ['.ts', '.tsx', '.js', '.jsx'],
        severity: 'critical',
      },
    ],
    'race-condition': [],
    'logic-error': [],
    'api-misuse': [],
    'configuration': [],
    'dependency': [],
    'memory-leak': [
      {
        type: 'regex',
        pattern: 'addEventListener\\([^)]+\\)(?![\\s\\S]*removeEventListener)',
        description: '添加事件监听器但未移除',
        fileTypes: ['.ts', '.tsx', '.js', '.jsx'],
        severity: 'medium',
      },
    ],
    'other': [],
  }

  patterns.push(...(categoryPatterns[analysis.bugType] || []))

  return patterns
}

// ============================================================================
// Export
// ============================================================================

export const PostmortemAnalyzer = {
  getFixCommits,
  analyzeFixCommit,
  generatePostmortem,
}
