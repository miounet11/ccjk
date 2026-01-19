/**
 * Context Intelligence System
 * 智能上下文管理系统 - 对标 Claude Code /compact 机制
 *
 * 核心理念：
 * 1. 压缩而非删除 - 保留关键信息，压缩冗余内容
 * 2. 分层管理 - Hot/Warm/Cold 三层存储
 * 3. 智能摘要 - 自动生成会话摘要
 * 4. 可恢复 - 归档内容可随时恢复
 */

import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SessionMessage {
  uuid: string
  parentUuid?: string
  type: 'user' | 'assistant'
  timestamp: string
  message: {
    role: string
    content: string | ContentBlock[]
  }
  toolUseResult?: {
    stdout?: string
    stderr?: string
  }
  metadata?: Record<string, unknown>
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  name?: string
  input?: unknown
  content?: string
}

export interface SessionSummary {
  id: string
  createdAt: string
  updatedAt: string
  messageCount: number
  tokenEstimate: number
  keyDecisions: string[]
  codeChanges: CodeChange[]
  topics: string[]
  summary: string
}

export interface CodeChange {
  file: string
  action: 'create' | 'modify' | 'delete'
  description: string
}

export interface ContextLayer {
  hot: SessionMessage[] // 当前活跃上下文
  warm: SessionSummary[] // 压缩后的摘要
  cold: string[] // 归档文件路径
}

export interface CompactOptions {
  keepLastN?: number // 保留最近 N 条消息
  summarizeThreshold?: number // 超过此数量触发摘要
  archiveThreshold?: number // 超过此数量触发归档
  preserveDecisions?: boolean // 保留关键决策
  preserveCodeChanges?: boolean // 保留代码变更
}

export interface CompactResult {
  originalMessages: number
  compactedMessages: number
  summaryGenerated: boolean
  archived: boolean
  tokensSaved: number
  summary?: SessionSummary
}

// ============================================================================
// Context Analyzer - 上下文分析器
// ============================================================================

export class ContextAnalyzer {
  /**
   * 分析消息重要性
   */
  static analyzeImportance(message: SessionMessage): number {
    let score = 0
    const content = this.extractTextContent(message)

    // 关键决策标记
    if (this.containsDecision(content))
      score += 30

    // 代码变更
    if (this.containsCodeChange(message))
      score += 25

    // 错误/问题解决
    if (this.containsErrorResolution(content))
      score += 20

    // 用户明确指令
    if (message.type === 'user' && content.length > 50)
      score += 15

    // 工具调用结果
    if (message.toolUseResult)
      score += 10

    // 时间衰减（越新越重要）
    const age = Date.now() - new Date(message.timestamp).getTime()
    const hourAge = age / (1000 * 60 * 60)
    score += Math.max(0, 20 - hourAge * 2)

    return Math.min(100, score)
  }

  /**
   * 提取文本内容
   */
  static extractTextContent(message: SessionMessage): string {
    const content = message.message.content
    if (typeof content === 'string')
      return content

    return content
      .filter((block): block is ContentBlock & { text: string } =>
        block.type === 'text' && typeof block.text === 'string',
      )
      .map(block => block.text)
      .join('\n')
  }

  /**
   * 检测是否包含决策
   */
  static containsDecision(content: string): boolean {
    const decisionPatterns = [
      /决定|决策|选择|采用|使用|方案/,
      /decide|decision|choose|adopt|use|approach/i,
      /我们应该|建议|推荐/,
      /should|recommend|suggest/i,
      /✅|✔|确定|confirmed/i,
    ]
    return decisionPatterns.some(p => p.test(content))
  }

  /**
   * 检测是否包含代码变更
   */
  static containsCodeChange(message: SessionMessage): boolean {
    const content = message.message.content
    if (typeof content === 'string')
      return false

    return content.some(block =>
      block.type === 'tool_use'
      && ['Write', 'Edit', 'Bash'].includes(block.name || ''),
    )
  }

  /**
   * 检测是否包含错误解决
   */
  static containsErrorResolution(content: string): boolean {
    const patterns = [
      /修复|解决|fix|resolve|solved/i,
      /错误|error|bug|issue/i,
      /成功|success|works|working/i,
    ]
    return patterns.filter(p => p.test(content)).length >= 2
  }

  /**
   * 提取关键决策
   */
  static extractDecisions(messages: SessionMessage[]): string[] {
    const decisions: string[] = []

    for (const msg of messages) {
      const content = this.extractTextContent(msg)
      if (this.containsDecision(content)) {
        // 提取决策相关的句子
        const sentences = content.split(/[。.!！?\n]/).filter(s => s.trim())
        for (const sentence of sentences) {
          if (this.containsDecision(sentence) && sentence.length < 200) {
            decisions.push(sentence.trim())
          }
        }
      }
    }

    // 去重并限制数量
    return [...new Set(decisions)].slice(0, 10)
  }

  /**
   * 提取代码变更
   */
  static extractCodeChanges(messages: SessionMessage[]): CodeChange[] {
    const changes: CodeChange[] = []

    for (const msg of messages) {
      const content = msg.message.content
      if (typeof content === 'string')
        continue

      for (const block of content) {
        if (block.type === 'tool_use') {
          const input = block.input as Record<string, unknown>

          if (block.name === 'Write' && input?.file_path) {
            changes.push({
              file: String(input.file_path),
              action: 'create',
              description: `Created file`,
            })
          }
          else if (block.name === 'Edit' && input?.file_path) {
            changes.push({
              file: String(input.file_path),
              action: 'modify',
              description: `Modified file`,
            })
          }
        }
      }
    }

    // 合并同一文件的多次变更
    const merged = new Map<string, CodeChange>()
    for (const change of changes) {
      const existing = merged.get(change.file)
      if (existing) {
        existing.action = 'modify'
      }
      else {
        merged.set(change.file, change)
      }
    }

    return Array.from(merged.values())
  }

  /**
   * 提取主题
   */
  static extractTopics(messages: SessionMessage[]): string[] {
    const topicKeywords = new Map<string, number>()

    for (const msg of messages) {
      const content = this.extractTextContent(msg).toLowerCase()

      // 技术关键词
      const techPatterns = [
        /\b(mcp|api|cli|sdk|npm|git|docker)\b/gi,
        /\b(typescript|javascript|python|rust|go)\b/gi,
        /\b(react|vue|angular|node|express)\b/gi,
        /\b(database|cache|redis|mongodb|postgres)\b/gi,
        /\b(performance|optimization|refactor|debug)\b/gi,
      ]

      for (const pattern of techPatterns) {
        const matches = content.match(pattern) || []
        for (const match of matches) {
          const key = match.toLowerCase()
          topicKeywords.set(key, (topicKeywords.get(key) || 0) + 1)
        }
      }
    }

    // 按频率排序，取前 5 个
    return Array.from(topicKeywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic)
  }

  /**
   * 估算 token 数量
   */
  static estimateTokens(messages: SessionMessage[]): number {
    let totalChars = 0

    for (const msg of messages) {
      const content = this.extractTextContent(msg)
      totalChars += content.length

      // 工具结果
      if (msg.toolUseResult?.stdout) {
        totalChars += msg.toolUseResult.stdout.length
      }
    }

    // 粗略估算：4 字符 ≈ 1 token
    return Math.ceil(totalChars / 4)
  }
}

// ============================================================================
// Context Manager - 上下文管理器
// ============================================================================

export class ContextManager {
  private claudeDir: string
  private projectsDir: string
  private archiveDir: string
  private summaryDir: string

  constructor() {
    this.claudeDir = path.join(os.homedir(), '.claude')
    this.projectsDir = path.join(this.claudeDir, 'projects')
    this.archiveDir = path.join(this.claudeDir, 'archive')
    this.summaryDir = path.join(this.claudeDir, 'summaries')

    // 确保目录存在
    this.ensureDirectories()
  }

  private ensureDirectories(): void {
    for (const dir of [this.archiveDir, this.summaryDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }
  }

  /**
   * 获取当前项目的会话文件
   */
  getProjectSessions(projectPath?: string): string[] {
    const projectKey = projectPath
      ? projectPath.replace(/\//g, '-').replace(/^-/, '')
      : this.detectCurrentProject()

    const projectDir = path.join(this.projectsDir, projectKey)

    if (!fs.existsSync(projectDir)) {
      return []
    }

    return fs.readdirSync(projectDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => path.join(projectDir, f))
  }

  /**
   * 检测当前项目
   */
  private detectCurrentProject(): string {
    const cwd = process.cwd()
    return cwd.replace(/\//g, '-').replace(/^-/, '')
  }

  /**
   * 读取会话消息
   */
  readSessionMessages(sessionFile: string): SessionMessage[] {
    if (!fs.existsSync(sessionFile)) {
      return []
    }

    const content = fs.readFileSync(sessionFile, 'utf-8')
    const lines = content.trim().split('\n').filter(l => l.trim())

    return lines.map((line) => {
      try {
        return JSON.parse(line) as SessionMessage
      }
      catch {
        return null
      }
    }).filter((msg): msg is SessionMessage => msg !== null)
  }

  /**
   * 压缩会话 - 核心功能
   */
  async compact(sessionFile: string, options: CompactOptions = {}): Promise<CompactResult> {
    const {
      keepLastN = 20,
      archiveThreshold = 200,
      preserveDecisions = true,
      preserveCodeChanges = true,
    } = options

    const messages = this.readSessionMessages(sessionFile)
    const originalCount = messages.length
    const originalTokens = ContextAnalyzer.estimateTokens(messages)

    if (messages.length <= keepLastN) {
      return {
        originalMessages: originalCount,
        compactedMessages: originalCount,
        summaryGenerated: false,
        archived: false,
        tokensSaved: 0,
      }
    }

    // 分析所有消息的重要性
    const scoredMessages = messages.map(msg => ({
      message: msg,
      score: ContextAnalyzer.analyzeImportance(msg),
    }))

    // 分离要保留的消息
    const recentMessages = messages.slice(-keepLastN)
    const olderMessages = messages.slice(0, -keepLastN)

    // 从旧消息中提取重要内容
    const importantOlder = scoredMessages
      .slice(0, -keepLastN)
      .filter(m => m.score >= 50)
      .map(m => m.message)

    // 生成摘要
    const summary = this.generateSummary(olderMessages)

    // 保存摘要
    this.saveSummary(sessionFile, summary)

    // 是否需要归档
    let archived = false
    if (originalCount >= archiveThreshold) {
      this.archiveSession(sessionFile, olderMessages)
      archived = true
    }

    // 构建压缩后的会话
    const compactedMessages: SessionMessage[] = []

    // 添加摘要消息（作为系统上下文）
    compactedMessages.push(this.createSummaryMessage(summary))

    // 添加重要的旧消息
    if (preserveDecisions || preserveCodeChanges) {
      compactedMessages.push(...importantOlder.slice(0, 10))
    }

    // 添加最近的消息
    compactedMessages.push(...recentMessages)

    // 写回压缩后的会话
    this.writeSession(sessionFile, compactedMessages)

    const compactedTokens = ContextAnalyzer.estimateTokens(compactedMessages)

    return {
      originalMessages: originalCount,
      compactedMessages: compactedMessages.length,
      summaryGenerated: true,
      archived,
      tokensSaved: originalTokens - compactedTokens,
      summary,
    }
  }

  /**
   * 生成会话摘要
   */
  generateSummary(messages: SessionMessage[]): SessionSummary {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    const keyDecisions = ContextAnalyzer.extractDecisions(messages)
    const codeChanges = ContextAnalyzer.extractCodeChanges(messages)
    const topics = ContextAnalyzer.extractTopics(messages)
    const tokenEstimate = ContextAnalyzer.estimateTokens(messages)

    // 生成文本摘要
    const summaryParts: string[] = []

    if (topics.length > 0) {
      summaryParts.push(`主要话题: ${topics.join(', ')}`)
    }

    if (keyDecisions.length > 0) {
      summaryParts.push(`关键决策:\n${keyDecisions.map(d => `  - ${d}`).join('\n')}`)
    }

    if (codeChanges.length > 0) {
      summaryParts.push(`代码变更:\n${codeChanges.map(c => `  - ${c.action}: ${c.file}`).join('\n')}`)
    }

    return {
      id,
      createdAt: now,
      updatedAt: now,
      messageCount: messages.length,
      tokenEstimate,
      keyDecisions,
      codeChanges,
      topics,
      summary: summaryParts.join('\n\n'),
    }
  }

  /**
   * 保存摘要
   */
  private saveSummary(sessionFile: string, summary: SessionSummary): string {
    const sessionId = path.basename(sessionFile, '.jsonl')
    const summaryFile = path.join(this.summaryDir, `${sessionId}-${summary.id}.json`)

    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2))
    return summaryFile
  }

  /**
   * 归档会话
   */
  private archiveSession(sessionFile: string, messages: SessionMessage[]): string {
    const sessionId = path.basename(sessionFile, '.jsonl')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const archiveFile = path.join(this.archiveDir, `${sessionId}-${timestamp}.jsonl`)

    const content = messages.map(m => JSON.stringify(m)).join('\n')
    fs.writeFileSync(archiveFile, content)

    return archiveFile
  }

  /**
   * 创建摘要消息
   */
  private createSummaryMessage(summary: SessionSummary): SessionMessage {
    return {
      uuid: crypto.randomUUID(),
      type: 'assistant',
      timestamp: new Date().toISOString(),
      message: {
        role: 'assistant',
        content: `[会话摘要 - ${summary.messageCount} 条消息已压缩]\n\n${summary.summary}`,
      },
      metadata: {
        isSummary: true,
        summaryId: summary.id,
        originalMessageCount: summary.messageCount,
        originalTokenEstimate: summary.tokenEstimate,
      },
    }
  }

  /**
   * 写入会话
   */
  private writeSession(sessionFile: string, messages: SessionMessage[]): void {
    const content = messages.map(m => JSON.stringify(m)).join('\n')
    fs.writeFileSync(sessionFile, content)
  }

  /**
   * 获取会话状态
   */
  getSessionStatus(sessionFile: string): {
    messageCount: number
    tokenEstimate: number
    oldestMessage: string
    newestMessage: string
    needsCompact: boolean
  } {
    const messages = this.readSessionMessages(sessionFile)
    const tokenEstimate = ContextAnalyzer.estimateTokens(messages)

    return {
      messageCount: messages.length,
      tokenEstimate,
      oldestMessage: messages[0]?.timestamp || 'N/A',
      newestMessage: messages[messages.length - 1]?.timestamp || 'N/A',
      needsCompact: messages.length > 50 || tokenEstimate > 50000,
    }
  }

  /**
   * 列出所有摘要
   */
  listSummaries(): SessionSummary[] {
    if (!fs.existsSync(this.summaryDir)) {
      return []
    }

    return fs.readdirSync(this.summaryDir)
      .filter(f => f.endsWith('.json'))
      .map((f) => {
        try {
          const content = fs.readFileSync(path.join(this.summaryDir, f), 'utf-8')
          return JSON.parse(content) as SessionSummary
        }
        catch {
          return null
        }
      })
      .filter((s): s is SessionSummary => s !== null)
  }

  /**
   * 恢复归档的会话
   */
  restoreArchive(archiveFile: string, targetSession: string): boolean {
    if (!fs.existsSync(archiveFile)) {
      return false
    }

    const archiveContent = fs.readFileSync(archiveFile, 'utf-8')
    const currentContent = fs.existsSync(targetSession)
      ? fs.readFileSync(targetSession, 'utf-8')
      : ''

    // 合并归档内容和当前内容
    const merged = `${archiveContent}\n${currentContent}`
    fs.writeFileSync(targetSession, merged.trim())

    return true
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const contextManager = new ContextManager()
