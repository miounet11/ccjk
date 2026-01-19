/**
 * Session Manager
 * Manages context compression sessions with threshold detection
 */

import type {
  FCSummary,
  Session,
  SessionConfig,
  SessionEvent,
  SessionEventType,
  ThresholdLevel,
} from '../../types/context'
import type { Summarizer } from './summarizer'
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { createSummarizer } from './summarizer'
import {
  calculateContextUsage,
  estimateTokens,
  getRemainingTokens,
  isThresholdExceeded,
} from './token-estimator'

/**
 * Default session configuration
 */
const DEFAULT_SESSION_CONFIG: SessionConfig = {
  contextThreshold: 0.8, // 80%
  maxContextTokens: 200000,
  summaryModel: 'haiku',
  autoSummarize: true,
}

/**
 * Session manager class
 */
export class SessionManager extends EventEmitter {
  private currentSession: Session | null = null
  private config: SessionConfig
  private summarizer: Summarizer
  private sessionHistory: Session[] = []

  constructor(config: Partial<SessionConfig> = {}) {
    super()

    this.config = { ...DEFAULT_SESSION_CONFIG, ...config }
    this.summarizer = createSummarizer({
      model: this.config.summaryModel,
    })
  }

  /**
   * Create new session
   */
  createSession(projectPath: string): Session {
    // Complete current session if exists
    if (this.currentSession) {
      this.completeSession()
    }

    // Generate project hash
    const projectHash = this.generateProjectHash(projectPath)

    // Create new session
    const session: Session = {
      id: this.generateSessionId(),
      projectPath,
      projectHash,
      startTime: new Date(),
      status: 'active',
      tokenCount: 0,
      fcCount: 0,
      summaries: [],
    }

    this.currentSession = session
    this.emitEvent('session_created', session.id, { session })

    return session
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.currentSession
  }

  /**
   * Add function call summary to current session
   */
  async addFunctionCall(
    fcName: string,
    fcArgs: Record<string, any>,
    fcResult: string,
  ): Promise<FCSummary | null> {
    if (!this.currentSession) {
      throw new Error('No active session')
    }

    // Generate FC ID
    const fcId = this.generateFcId(fcName, fcArgs)

    // Auto-summarize if enabled
    let summary: FCSummary | null = null
    if (this.config.autoSummarize) {
      summary = await this.summarizer.summarize({
        fcId,
        fcName,
        fcArgs,
        fcResult,
      })

      // Add to session
      this.currentSession.summaries.push(summary)
      this.currentSession.tokenCount += summary.tokens
    }
    else {
      // Estimate tokens without summarization
      const tokens = estimateTokens(fcResult)
      this.currentSession.tokenCount += tokens
    }

    this.currentSession.fcCount++

    // Check thresholds
    this.checkThresholds()

    // Emit event
    if (summary) {
      this.emitEvent('fc_summarized', this.currentSession.id, { summary })
    }

    return summary
  }

  /**
   * Check context thresholds
   */
  private checkThresholds(): void {
    if (!this.currentSession)
      return

    const level = this.getThresholdLevel()

    if (level === 'warning') {
      this.emitEvent('threshold_warning', this.currentSession.id, {
        usage: this.getContextUsage(),
        remaining: this.getRemainingTokens(),
      })
    }
    else if (level === 'critical') {
      this.emitEvent('threshold_critical', this.currentSession.id, {
        usage: this.getContextUsage(),
        remaining: this.getRemainingTokens(),
        sessionSummary: this.generateSessionSummary(),
      })
    }
  }

  /**
   * Get threshold level
   */
  getThresholdLevel(): ThresholdLevel {
    if (!this.currentSession)
      return 'normal'

    const usage = this.getContextUsage()

    if (usage >= this.config.contextThreshold * 100) {
      return 'critical'
    }
    if (usage >= (this.config.contextThreshold - 0.1) * 100) {
      return 'warning'
    }

    return 'normal'
  }

  /**
   * Get context usage percentage
   */
  getContextUsage(): number {
    if (!this.currentSession)
      return 0

    return calculateContextUsage(
      this.currentSession.tokenCount,
      this.config.maxContextTokens,
    )
  }

  /**
   * Get remaining tokens
   */
  getRemainingTokens(): number {
    if (!this.currentSession)
      return this.config.maxContextTokens

    return getRemainingTokens(
      this.currentSession.tokenCount,
      this.config.maxContextTokens,
    )
  }

  /**
   * Check if threshold is exceeded
   */
  isThresholdExceeded(): boolean {
    if (!this.currentSession)
      return false

    return isThresholdExceeded(
      this.currentSession.tokenCount,
      this.config.maxContextTokens,
      this.config.contextThreshold,
    )
  }

  /**
   * Generate session summary for continuation
   */
  generateSessionSummary(): string {
    if (!this.currentSession) {
      return 'No active session'
    }

    const session = this.currentSession
    const lines: string[] = []

    lines.push('# Session Summary')
    lines.push('')
    lines.push(`Project: ${session.projectPath}`)
    lines.push(`Session ID: ${session.id}`)
    lines.push(`Duration: ${this.getSessionDuration()}`)
    lines.push(`Function Calls: ${session.fcCount}`)
    lines.push(`Token Usage: ${session.tokenCount} / ${this.config.maxContextTokens} (${this.getContextUsage().toFixed(1)}%)`)
    lines.push('')

    if (session.summaries.length > 0) {
      lines.push('## Function Call Summaries')
      lines.push('')

      for (const summary of session.summaries) {
        lines.push(`- **${summary.fcName}**: ${summary.summary}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Get session duration
   */
  private getSessionDuration(): string {
    if (!this.currentSession)
      return '0s'

    const start = this.currentSession.startTime.getTime()
    const end = this.currentSession.endTime?.getTime() || Date.now()
    const duration = Math.floor((end - start) / 1000)

    if (duration < 60)
      return `${duration}s`
    if (duration < 3600)
      return `${Math.floor(duration / 60)}m ${duration % 60}s`

    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  /**
   * Complete current session
   */
  completeSession(): Session | null {
    if (!this.currentSession)
      return null

    this.currentSession.status = 'completed'
    this.currentSession.endTime = new Date()

    // Add to history
    this.sessionHistory.push(this.currentSession)

    // Emit event
    this.emitEvent('session_completed', this.currentSession.id, {
      session: this.currentSession,
      summary: this.generateSessionSummary(),
    })

    const completedSession = this.currentSession
    this.currentSession = null

    return completedSession
  }

  /**
   * Archive session
   */
  archiveSession(sessionId: string): boolean {
    const session = this.sessionHistory.find(s => s.id === sessionId)
    if (!session)
      return false

    session.status = 'archived'
    this.emitEvent('session_archived', sessionId, { session })

    return true
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | null {
    if (this.currentSession?.id === sessionId) {
      return this.currentSession
    }

    return this.sessionHistory.find(s => s.id === sessionId) || null
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Session[] {
    const sessions = [...this.sessionHistory]
    if (this.currentSession) {
      sessions.push(this.currentSession)
    }
    return sessions
  }

  /**
   * Get sessions by project
   */
  getSessionsByProject(projectPath: string): Session[] {
    const projectHash = this.generateProjectHash(projectPath)
    return this.getAllSessions().filter(s => s.projectHash === projectHash)
  }

  /**
   * Clear session history
   */
  clearHistory(): void {
    this.sessionHistory = []
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...config }

    // Update summarizer if model changed
    if (config.summaryModel) {
      this.summarizer.updateConfig({ model: config.summaryModel })
    }
  }

  /**
   * Get configuration
   */
  getConfig(): SessionConfig {
    return { ...this.config }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Generate project hash
   */
  private generateProjectHash(projectPath: string): string {
    return createHash('md5').update(projectPath).digest('hex').substring(0, 8)
  }

  /**
   * Generate function call ID
   */
  private generateFcId(fcName: string, fcArgs: Record<string, any>): string {
    const data = `${fcName}_${JSON.stringify(fcArgs)}_${Date.now()}`
    return createHash('md5').update(data).digest('hex').substring(0, 12)
  }

  /**
   * Emit session event
   */
  private emitEvent(
    type: SessionEventType,
    sessionId: string,
    data?: any,
  ): void {
    const event: SessionEvent = {
      type,
      sessionId,
      timestamp: new Date(),
      data,
    }

    this.emit('session_event', event)
    this.emit(type, event)
  }

  /**
   * Get summarizer instance
   */
  getSummarizer(): Summarizer {
    return this.summarizer
  }
}

/**
 * Create session manager instance
 */
export function createSessionManager(
  config?: Partial<SessionConfig>,
): SessionManager {
  return new SessionManager(config)
}
