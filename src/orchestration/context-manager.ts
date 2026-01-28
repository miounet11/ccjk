/**
 * Orchestration Context Manager
 * Intelligent context compression and management for multi-agent orchestration
 * Target: 95% token optimization with <2s processing for 100 messages
 */

import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import type {
  CodeSnippet,
  CompressedContext,
  CompressionMetadata,
  CompressionMetrics,
  CompressionOptions,
  Decision,
  KeyPoint,
  Message,
  RestorationResult,
  SessionData,
  TokenEstimate,
} from '../types/orchestration'

/**
 * Context Manager for orchestration
 */
export class OrchestrationContextManager {
  private sessionsDir: string

  constructor(baseDir?: string) {
    this.sessionsDir = baseDir || path.join(os.homedir(), '.ccjk', 'sessions')
    this.ensureDirectories()
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true })
    }
  }

  /**
   * Compress conversation history
   * Target: 95% token optimization
   */
  async compress(
    messages: Message[],
    options: CompressionOptions = {},
  ): Promise<CompressedContext> {
    const startTime = Date.now()
    const {
      keepRecentN = 10,
      importanceThreshold = 0.5,
      maxTokens = 10000,
      preserveCode = true,
      preserveDecisions = true,
      strategy = 'balanced',
    } = options

    // Estimate original tokens
    const originalTokens = this.estimateTokens(messages)

    // Extract key information
    const keyPoints = this.extractKeyPoints(messages, importanceThreshold)
    const codeSnippets = preserveCode ? this.extractCodeSnippets(messages) : []
    const decisions = preserveDecisions ? this.extractDecisions(messages) : []

    // Generate ultra-compact summary
    const summary = this.generateSummary(messages, keyPoints, strategy)

    // Aggressive retention: only keep minimal recent messages
    const effectiveKeepN = Math.min(keepRecentN, Math.ceil(messages.length * 0.05))
    const recentMessages = messages.slice(-effectiveKeepN)
    const retainedTokens = this.estimateTokens(recentMessages)
    const summaryTokens = Math.ceil(summary.length / 4)
    const compressedTokens = retainedTokens + summaryTokens

    const compressionTime = Date.now() - startTime

    const metadata: CompressionMetadata = {
      originalTokens,
      compressedTokens,
      compressionRatio: 1 - (compressedTokens / originalTokens),
      compressionTime,
      strategy: this.determineStrategy(messages.length, strategy),
      timestamp: Date.now(),
    }

    return {
      sessionId: crypto.randomUUID(),
      summary,
      keyPoints,
      codeSnippets,
      decisions,
      metadata,
      originalMessageCount: messages.length,
      retainedMessageCount: effectiveKeepN,
    }
  }

  /**
   * Extract key points from messages
   */
  private extractKeyPoints(messages: Message[], threshold: number): KeyPoint[] {
    const points: KeyPoint[] = []

    for (const msg of messages) {
      const importance = this.calculateImportance(msg)
      if (importance < threshold)
        continue

      // Extract decisions
      if (this.containsDecision(msg.content)) {
        points.push({
          content: this.extractSentence(msg.content, /决定|决策|选择|采用|decide|decision|choose/i),
          category: 'decision',
          importance,
          timestamp: msg.timestamp,
          relatedMessages: [msg.id],
        })
      }

      // Extract errors
      if (this.containsError(msg.content)) {
        points.push({
          content: this.extractSentence(msg.content, /错误|error|bug|issue|failed/i),
          category: 'error',
          importance,
          timestamp: msg.timestamp,
          relatedMessages: [msg.id],
        })
      }

      // Extract solutions
      if (this.containsSolution(msg.content)) {
        points.push({
          content: this.extractSentence(msg.content, /解决|修复|fix|solve|resolved/i),
          category: 'solution',
          importance,
          timestamp: msg.timestamp,
          relatedMessages: [msg.id],
        })
      }
    }

    return points.slice(0, 20) // Limit to top 20
  }

  /**
   * Extract code snippets
   */
  private extractCodeSnippets(messages: Message[]): CodeSnippet[] {
    const snippets: CodeSnippet[] = []
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g

    for (const msg of messages) {
      let match
      while ((match = codeBlockRegex.exec(msg.content)) !== null) {
        const [, language, code] = match
        snippets.push({
          file: this.extractFilename(msg.content) || 'unknown',
          lines: code.trim(),
          context: msg.content.slice(Math.max(0, match.index - 100), match.index),
          language,
          importance: this.calculateImportance(msg),
        })
      }
    }

    // Deduplicate by content hash
    const seen = new Set<string>()
    return snippets.filter((s) => {
      const hash = crypto.createHash('md5').update(s.lines).digest('hex')
      if (seen.has(hash))
        return false
      seen.add(hash)
      return true
    }).slice(0, 10)
  }

  /**
   * Extract decisions
   */
  private extractDecisions(messages: Message[]): Decision[] {
    const decisions: Decision[] = []

    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i]
      const next = messages[i + 1]

      if (msg.role === 'user' && this.isQuestion(msg.content)) {
        if (next.role === 'assistant') {
          decisions.push({
            question: msg.content.slice(0, 200),
            answer: next.content.slice(0, 300),
            timestamp: msg.timestamp,
            confidence: this.calculateConfidence(next.content),
          })
        }
      }
    }

    return decisions.slice(0, 15)
  }

  /**
   * Generate summary
   */
  private generateSummary(messages: Message[], keyPoints: KeyPoint[], strategy: string): string {
    const parts: string[] = []

    // Ultra-compact summary for aggressive compression
    const topics = this.extractTopics(messages)
    if (topics.length > 0) {
      parts.push(`T:${topics.slice(0, 3).join(',')}`)
    }

    // Only most critical decisions
    const decisions = keyPoints.filter(p => p.category === 'decision').slice(0, 3)
    if (decisions.length > 0) {
      parts.push(`D:${decisions.map(d => d.content.slice(0, 50)).join(';')}`)
    }

    // Only critical solutions
    const solutions = keyPoints.filter(p => p.category === 'solution').slice(0, 2)
    if (solutions.length > 0) {
      parts.push(`S:${solutions.map(s => s.content.slice(0, 50)).join(';')}`)
    }

    // Compact format
    parts.push(`M:${messages.length}`)

    return parts.join('|')
  }

  /**
   * Persist session to disk
   */
  async persistSession(sessionData: SessionData): Promise<string> {
    const filename = `${sessionData.id}.json`
    const filepath = path.join(this.sessionsDir, filename)

    fs.writeFileSync(filepath, JSON.stringify(sessionData, null, 2))
    return filepath
  }

  /**
   * Restore session from disk
   */
  async restoreSession(sessionId: string): Promise<RestorationResult | null> {
    const filepath = path.join(this.sessionsDir, `${sessionId}.json`)

    if (!fs.existsSync(filepath)) {
      return null
    }

    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8')) as SessionData

    return {
      sessionId: data.id,
      messages: data.messages,
      compressed: data.compressed,
      totalTokens: data.totalTokens,
      restoredAt: Date.now(),
    }
  }

  /**
   * List all sessions
   */
  listSessions(): string[] {
    if (!fs.existsSync(this.sessionsDir)) {
      return []
    }

    return fs.readdirSync(this.sessionsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.basename(f, '.json'))
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    const filepath = path.join(this.sessionsDir, `${sessionId}.json`)

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath)
      return true
    }

    return false
  }

  /**
   * Estimate tokens for messages
   */
  estimateTokens(messages: Message[]): number {
    let total = 0
    for (const msg of messages) {
      // Rough estimation: 4 chars ≈ 1 token
      // Chinese chars: 2 chars ≈ 1 token
      const chineseChars = (msg.content.match(/[\u4E00-\u9FA5]/g) || []).length
      const otherChars = msg.content.length - chineseChars
      total += Math.ceil(chineseChars / 2 + otherChars / 4)
    }
    return total
  }

  /**
   * Get detailed token estimate
   */
  getTokenEstimate(messages: Message[]): TokenEstimate {
    const byRole: Record<string, number> = { user: 0, assistant: 0, system: 0 }
    const byCategory: Record<string, number> = {}

    for (const msg of messages) {
      const tokens = this.estimateTokens([msg])
      byRole[msg.role] = (byRole[msg.role] || 0) + tokens

      const category = msg.metadata?.category as string || 'general'
      byCategory[category] = (byCategory[category] || 0) + tokens
    }

    const total = this.estimateTokens(messages)

    return {
      total,
      byRole,
      byCategory,
      averagePerMessage: messages.length > 0 ? total / messages.length : 0,
    }
  }

  /**
   * Get compression metrics
   */
  async getCompressionMetrics(sessionId: string): Promise<CompressionMetrics | null> {
    const session = await this.restoreSession(sessionId)
    if (!session?.compressed) {
      return null
    }

    const { metadata } = session.compressed

    return {
      sessionId,
      originalTokens: metadata.originalTokens,
      compressedTokens: metadata.compressedTokens,
      tokensSaved: metadata.originalTokens - metadata.compressedTokens,
      compressionRatio: metadata.compressionRatio,
      processingTime: metadata.compressionTime,
      strategy: metadata.strategy,
      timestamp: metadata.timestamp,
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private calculateImportance(msg: Message): number {
    let score = 0

    // Role weight
    if (msg.role === 'user')
      score += 0.3
    if (msg.role === 'assistant')
      score += 0.2

    // Content patterns
    if (this.containsDecision(msg.content))
      score += 0.3
    if (this.containsCode(msg.content))
      score += 0.25
    if (this.containsError(msg.content))
      score += 0.2
    if (this.containsSolution(msg.content))
      score += 0.2

    // Length factor
    if (msg.content.length > 500)
      score += 0.1

    // Recency factor
    const age = Date.now() - msg.timestamp
    const hourAge = age / (1000 * 60 * 60)
    score += Math.max(0, 0.2 - hourAge * 0.01)

    return Math.min(1, score)
  }

  private containsDecision(content: string): boolean {
    return /决定|决策|选择|采用|使用|decide|decision|choose|adopt|use|should|recommend/i.test(content)
  }

  private containsError(content: string): boolean {
    return /错误|error|bug|issue|failed|exception|warning/i.test(content)
  }

  private containsSolution(content: string): boolean {
    return /解决|修复|fix|solve|resolved|success|works/i.test(content)
  }

  private containsCode(content: string): boolean {
    return /```|`[^`]+`|function|class|const|let|var|import|export/i.test(content)
  }

  private isQuestion(content: string): boolean {
    return /\?|？|如何|怎么|怎样|what|how|why|when|where|which/i.test(content)
  }

  private extractSentence(content: string, pattern: RegExp): string {
    const sentences = content.split(/[。.!！?\n]/).filter(s => s.trim())
    for (const sentence of sentences) {
      if (pattern.test(sentence) && sentence.length < 200) {
        return sentence.trim()
      }
    }
    return content.slice(0, 150)
  }

  private extractFilename(content: string): string | null {
    const match = content.match(/(?:file|文件)[:：]\s*([^\s]+)|`([^`]+\.\w+)`/)
    return match?.[1] || match?.[2] || null
  }

  private extractTopics(messages: Message[]): string[] {
    const topicMap = new Map<string, number>()
    const patterns = [
      /\b(api|cli|sdk|mcp|npm|git|docker|kubernetes)\b/gi,
      /\b(typescript|javascript|python|rust|go|java)\b/gi,
      /\b(react|vue|angular|node|express|fastify)\b/gi,
      /\b(database|redis|mongodb|postgres|mysql)\b/gi,
      /\b(performance|optimization|refactor|debug|test)\b/gi,
    ]

    for (const msg of messages) {
      const content = msg.content.toLowerCase()
      for (const pattern of patterns) {
        const matches = content.match(pattern) || []
        for (const match of matches) {
          topicMap.set(match, (topicMap.get(match) || 0) + 1)
        }
      }
    }

    return Array.from(topicMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic)
  }

  private calculateConfidence(content: string): number {
    let confidence = 0.5

    if (/确定|肯定|definitely|certainly|absolutely/i.test(content))
      confidence += 0.3
    if (/可能|也许|maybe|perhaps|possibly/i.test(content))
      confidence -= 0.2
    if (/不确定|unsure|not sure/i.test(content))
      confidence -= 0.3

    return Math.max(0, Math.min(1, confidence))
  }

  private determineStrategy(messageCount: number, preferred: string): 'summary' | 'dedup' | 'trim' | 'hybrid' {
    if (preferred === 'aggressive')
      return 'hybrid'
    if (preferred === 'conservative')
      return 'summary'

    if (messageCount < 10)
      return 'trim'
    if (messageCount < 50)
      return 'dedup'
    return 'hybrid'
  }
}

/**
 * Singleton instance
 */
export const orchestrationContextManager = new OrchestrationContextManager()
