/**
 * Auto Compact Manager
 *
 * Intelligent context compaction management that:
 * - Preserves recent conversation turns
 * - Summarizes historical context
 * - Saves full history to session before compacting
 * - Integrates with Context Overflow Detector
 *
 * Part of the Zero-Participation Automation system.
 *
 * @module core/auto-compact-manager
 */

import type { SessionHistoryEntry } from '../brain/session-manager'
import type { UsageStats } from '../brain/context-overflow-detector'
import { EventEmitter } from 'node:events'
import { getAutoSessionSaver } from '../brain/auto-session-saver'

// ============================================================================
// Types
// ============================================================================

/**
 * Compact strategy types
 */
export type CompactStrategy =
  | 'preserve_recent'      // Keep recent N turns, summarize rest
  | 'summarize_all'        // Summarize everything
  | 'sliding_window'       // Keep sliding window of context
  | 'importance_based'     // Keep important messages based on scoring

/**
 * Message importance level
 */
export type MessageImportance = 'critical' | 'high' | 'medium' | 'low'

/**
 * Compact options
 */
export interface CompactOptions {
  /** Number of recent turns to preserve (default: 5) */
  preserveRecent?: number

  /** Whether to summarize history (default: true) */
  summarizeHistory?: boolean

  /** Whether to save to session before compact (default: true) */
  saveToSession?: boolean

  /** Compact strategy (default: 'preserve_recent') */
  strategy?: CompactStrategy

  /** Target token count after compaction */
  targetTokens?: number

  /** Custom summarizer function */
  summarizer?: (messages: SessionHistoryEntry[]) => Promise<string>
}

/**
 * Compact result
 */
export interface CompactResult {
  /** Whether compaction was successful */
  success: boolean

  /** Number of messages before compaction */
  messagesBefore: number

  /** Number of messages after compaction */
  messagesAfter: number

  /** Estimated tokens before compaction */
  tokensBefore: number

  /** Estimated tokens after compaction */
  tokensAfter: number

  /** Generated summary (if any) */
  summary?: string

  /** Preserved messages */
  preservedMessages: SessionHistoryEntry[]

  /** Error if failed */
  error?: Error
}

/**
 * Auto Compact Manager configuration
 */
export interface AutoCompactManagerConfig {
  /** Default number of turns to preserve */
  defaultPreserveRecent?: number

  /** Default compact strategy */
  defaultStrategy?: CompactStrategy

  /** Warning threshold percentage (triggers preparation) */
  warningThreshold?: number

  /** Critical threshold percentage (triggers auto-compact) */
  criticalThreshold?: number

  /** Characters per token for estimation */
  charsPerToken?: number

  /** Callback when compact is triggered */
  onCompact?: (result: CompactResult) => void

  /** Callback when warning threshold is reached */
  onWarning?: (stats: UsageStats) => void

  /** Custom summarizer function */
  summarizer?: (messages: SessionHistoryEntry[]) => Promise<string>
}

/**
 * Auto Compact Manager statistics
 */
export interface AutoCompactManagerStats {
  totalCompactions: number
  totalTokensSaved: number
  totalMessagesSummarized: number
  lastCompactionTime: number | null
  averageTokenReduction: number
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PRESERVE_RECENT = 5
const DEFAULT_WARNING_THRESHOLD = 80
const DEFAULT_CRITICAL_THRESHOLD = 90
const DEFAULT_CHARS_PER_TOKEN = 4

// ============================================================================
// Auto Compact Manager Class
// ============================================================================

/**
 * Auto Compact Manager
 *
 * Manages intelligent context compaction to prevent overflow.
 *
 * @example
 * ```typescript
 * const manager = new AutoCompactManager({
 *   defaultPreserveRecent: 5,
 *   onCompact: (result) => console.log('Compacted:', result),
 * })
 *
 * // Compact with options
 * const result = await manager.compact(messages, {
 *   preserveRecent: 5,
 *   summarizeHistory: true,
 *   saveToSession: true,
 * })
 * ```
 */
export class AutoCompactManager extends EventEmitter {
  private config: Required<Omit<AutoCompactManagerConfig, 'onCompact' | 'onWarning' | 'summarizer'>>
  private callbacks: Pick<AutoCompactManagerConfig, 'onCompact' | 'onWarning' | 'summarizer'>

  private stats: AutoCompactManagerStats = {
    totalCompactions: 0,
    totalTokensSaved: 0,
    totalMessagesSummarized: 0,
    lastCompactionTime: null,
    averageTokenReduction: 0,
  }

  private isCompacting = false

  constructor(config: AutoCompactManagerConfig = {}) {
    super()

    this.config = {
      defaultPreserveRecent: config.defaultPreserveRecent ?? DEFAULT_PRESERVE_RECENT,
      defaultStrategy: config.defaultStrategy ?? 'preserve_recent',
      warningThreshold: config.warningThreshold ?? DEFAULT_WARNING_THRESHOLD,
      criticalThreshold: config.criticalThreshold ?? DEFAULT_CRITICAL_THRESHOLD,
      charsPerToken: config.charsPerToken ?? DEFAULT_CHARS_PER_TOKEN,
    }

    this.callbacks = {
      onCompact: config.onCompact,
      onWarning: config.onWarning,
      summarizer: config.summarizer,
    }
  }

  // ==========================================================================
  // Compact Operations
  // ==========================================================================

  /**
   * Perform context compaction
   */
  async compact(
    messages: SessionHistoryEntry[],
    options: CompactOptions = {},
  ): Promise<CompactResult> {
    if (this.isCompacting) {
      return {
        success: false,
        messagesBefore: messages.length,
        messagesAfter: messages.length,
        tokensBefore: this.estimateTokens(messages),
        tokensAfter: this.estimateTokens(messages),
        preservedMessages: messages,
        error: new Error('Compaction already in progress'),
      }
    }

    this.isCompacting = true

    const preserveRecent = options.preserveRecent ?? this.config.defaultPreserveRecent
    const summarizeHistory = options.summarizeHistory ?? true
    const saveToSession = options.saveToSession ?? true
    const strategy = options.strategy ?? this.config.defaultStrategy

    const tokensBefore = this.estimateTokens(messages)

    try {
      // Save to session before compacting
      if (saveToSession) {
        const autoSaver = getAutoSessionSaver()
        await autoSaver.saveBeforeCompact()
      }

      let result: CompactResult

      switch (strategy) {
        case 'preserve_recent':
          result = await this.compactPreserveRecent(messages, preserveRecent, summarizeHistory, options.summarizer)
          break
        case 'summarize_all':
          result = await this.compactSummarizeAll(messages, options.summarizer)
          break
        case 'sliding_window':
          result = await this.compactSlidingWindow(messages, options.targetTokens)
          break
        case 'importance_based':
          result = await this.compactImportanceBased(messages, options.targetTokens)
          break
        default:
          result = await this.compactPreserveRecent(messages, preserveRecent, summarizeHistory, options.summarizer)
      }

      // Update statistics
      this.updateStats(tokensBefore, result.tokensAfter, messages.length - result.messagesAfter)

      this.emit('compacted', result)
      this.callbacks.onCompact?.(result)

      return result
    }
    catch (error) {
      const result: CompactResult = {
        success: false,
        messagesBefore: messages.length,
        messagesAfter: messages.length,
        tokensBefore,
        tokensAfter: tokensBefore,
        preservedMessages: messages,
        error: error instanceof Error ? error : new Error(String(error)),
      }

      this.emit('compact-error', result)
      return result
    }
    finally {
      this.isCompacting = false
    }
  }

  /**
   * Compact using preserve_recent strategy
   */
  private async compactPreserveRecent(
    messages: SessionHistoryEntry[],
    preserveRecent: number,
    summarizeHistory: boolean,
    customSummarizer?: (messages: SessionHistoryEntry[]) => Promise<string>,
  ): Promise<CompactResult> {
    const messagesBefore = messages.length

    // Split messages into history and recent
    const splitIndex = Math.max(0, messages.length - preserveRecent * 2) // *2 for user+assistant pairs
    const historyMessages = messages.slice(0, splitIndex)
    const recentMessages = messages.slice(splitIndex)

    let summary: string | undefined
    const preservedMessages: SessionHistoryEntry[] = []

    // Generate summary of history
    if (summarizeHistory && historyMessages.length > 0) {
      const summarizer = customSummarizer ?? this.callbacks.summarizer ?? this.defaultSummarizer
      summary = await summarizer(historyMessages)

      // Add summary as system message
      preservedMessages.push({
        timestamp: new Date(),
        role: 'system',
        content: `[Context Summary]\n${summary}`,
        tokens: this.estimateTokensForText(summary),
      })
    }

    // Add recent messages
    preservedMessages.push(...recentMessages)

    const tokensAfter = this.estimateTokens(preservedMessages)

    return {
      success: true,
      messagesBefore,
      messagesAfter: preservedMessages.length,
      tokensBefore: this.estimateTokens(messages),
      tokensAfter,
      summary,
      preservedMessages,
    }
  }

  /**
   * Compact using summarize_all strategy
   */
  private async compactSummarizeAll(
    messages: SessionHistoryEntry[],
    customSummarizer?: (messages: SessionHistoryEntry[]) => Promise<string>,
  ): Promise<CompactResult> {
    const messagesBefore = messages.length
    const tokensBefore = this.estimateTokens(messages)

    const summarizer = customSummarizer ?? this.callbacks.summarizer ?? this.defaultSummarizer
    const summary = await summarizer(messages)

    const preservedMessages: SessionHistoryEntry[] = [{
      timestamp: new Date(),
      role: 'system',
      content: `[Full Context Summary]\n${summary}`,
      tokens: this.estimateTokensForText(summary),
    }]

    return {
      success: true,
      messagesBefore,
      messagesAfter: 1,
      tokensBefore,
      tokensAfter: this.estimateTokens(preservedMessages),
      summary,
      preservedMessages,
    }
  }

  /**
   * Compact using sliding_window strategy
   */
  private async compactSlidingWindow(
    messages: SessionHistoryEntry[],
    targetTokens?: number,
  ): Promise<CompactResult> {
    const messagesBefore = messages.length
    const tokensBefore = this.estimateTokens(messages)
    const target = targetTokens ?? Math.floor(tokensBefore * 0.5)

    const preservedMessages: SessionHistoryEntry[] = []
    let currentTokens = 0

    // Add messages from the end until we reach target
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      const msgTokens = msg.tokens ?? this.estimateTokensForText(msg.content)

      if (currentTokens + msgTokens > target) {
        break
      }

      preservedMessages.unshift(msg)
      currentTokens += msgTokens
    }

    return {
      success: true,
      messagesBefore,
      messagesAfter: preservedMessages.length,
      tokensBefore,
      tokensAfter: currentTokens,
      preservedMessages,
    }
  }

  /**
   * Compact using importance_based strategy
   */
  private async compactImportanceBased(
    messages: SessionHistoryEntry[],
    targetTokens?: number,
  ): Promise<CompactResult> {
    const messagesBefore = messages.length
    const tokensBefore = this.estimateTokens(messages)
    const target = targetTokens ?? Math.floor(tokensBefore * 0.5)

    // Score messages by importance
    const scoredMessages = messages.map((msg, index) => ({
      message: msg,
      index,
      score: this.scoreMessageImportance(msg, index, messages.length),
    }))

    // Sort by score (highest first)
    scoredMessages.sort((a, b) => b.score - a.score)

    // Select messages until we reach target tokens
    const selectedIndices = new Set<number>()
    let currentTokens = 0

    for (const { message, index } of scoredMessages) {
      const msgTokens = message.tokens ?? this.estimateTokensForText(message.content)

      if (currentTokens + msgTokens > target) {
        continue
      }

      selectedIndices.add(index)
      currentTokens += msgTokens
    }

    // Preserve original order
    const preservedMessages = messages.filter((_, index) => selectedIndices.has(index))

    return {
      success: true,
      messagesBefore,
      messagesAfter: preservedMessages.length,
      tokensBefore,
      tokensAfter: currentTokens,
      preservedMessages,
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Default summarizer function
   */
  private async defaultSummarizer(messages: SessionHistoryEntry[]): Promise<string> {
    // Simple extractive summary
    const userMessages = messages.filter(m => m.role === 'user')
    const assistantMessages = messages.filter(m => m.role === 'assistant')

    const topics: string[] = []

    // Extract key topics from user messages
    for (const msg of userMessages.slice(-5)) {
      const firstLine = msg.content.split('\n')[0].slice(0, 100)
      if (firstLine.trim()) {
        topics.push(`- User asked: ${firstLine}`)
      }
    }

    // Extract key actions from assistant messages
    for (const msg of assistantMessages.slice(-3)) {
      const firstLine = msg.content.split('\n')[0].slice(0, 100)
      if (firstLine.trim()) {
        topics.push(`- Assistant: ${firstLine}`)
      }
    }

    return [
      `Conversation summary (${messages.length} messages):`,
      '',
      ...topics,
      '',
      `Total turns: ${Math.floor(messages.length / 2)}`,
    ].join('\n')
  }

  /**
   * Score message importance
   */
  private scoreMessageImportance(
    message: SessionHistoryEntry,
    index: number,
    totalMessages: number,
  ): number {
    let score = 0

    // Recency bonus (more recent = higher score)
    const recencyScore = (index / totalMessages) * 50
    score += recencyScore

    // Role bonus
    if (message.role === 'system') {
      score += 30 // System messages are important
    }
    else if (message.role === 'user') {
      score += 20 // User messages slightly more important
    }
    else {
      score += 15
    }

    // Content-based scoring
    const content = message.content.toLowerCase()

    // Code blocks are important
    if (content.includes('```')) {
      score += 15
    }

    // Error messages are important
    if (content.includes('error') || content.includes('failed')) {
      score += 10
    }

    // Questions are important
    if (content.includes('?')) {
      score += 5
    }

    // Short messages are less important
    if (message.content.length < 50) {
      score -= 10
    }

    return Math.max(0, score)
  }

  /**
   * Estimate tokens for messages
   */
  private estimateTokens(messages: SessionHistoryEntry[]): number {
    return messages.reduce((total, msg) => {
      return total + (msg.tokens ?? this.estimateTokensForText(msg.content))
    }, 0)
  }

  /**
   * Estimate tokens for text
   */
  private estimateTokensForText(text: string): number {
    if (!text) return 0
    return Math.ceil(text.length / this.config.charsPerToken)
  }

  /**
   * Update statistics
   */
  private updateStats(tokensBefore: number, tokensAfter: number, messagesSummarized: number): void {
    const tokensSaved = tokensBefore - tokensAfter

    this.stats.totalCompactions++
    this.stats.totalTokensSaved += tokensSaved
    this.stats.totalMessagesSummarized += messagesSummarized
    this.stats.lastCompactionTime = Date.now()

    // Calculate running average
    this.stats.averageTokenReduction =
      this.stats.totalTokensSaved / this.stats.totalCompactions
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Check if compaction is needed based on usage stats
   */
  shouldCompact(stats: UsageStats): boolean {
    return stats.usagePercentage >= this.config.criticalThreshold
  }

  /**
   * Check if warning should be triggered
   */
  shouldWarn(stats: UsageStats): boolean {
    return stats.usagePercentage >= this.config.warningThreshold
  }

  /**
   * Handle usage stats update
   */
  handleUsageUpdate(stats: UsageStats): void {
    if (this.shouldWarn(stats) && !this.shouldCompact(stats)) {
      this.emit('warning', stats)
      this.callbacks.onWarning?.(stats)
    }
  }

  /**
   * Get statistics
   */
  getStats(): AutoCompactManagerStats {
    return { ...this.stats }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalCompactions: 0,
      totalTokensSaved: 0,
      totalMessagesSummarized: 0,
      lastCompactionTime: null,
      averageTokenReduction: 0,
    }
  }

  /**
   * Check if currently compacting
   */
  isCurrentlyCompacting(): boolean {
    return this.isCompacting
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AutoCompactManagerConfig>): void {
    if (config.defaultPreserveRecent !== undefined) {
      this.config.defaultPreserveRecent = config.defaultPreserveRecent
    }
    if (config.defaultStrategy !== undefined) {
      this.config.defaultStrategy = config.defaultStrategy
    }
    if (config.warningThreshold !== undefined) {
      this.config.warningThreshold = config.warningThreshold
    }
    if (config.criticalThreshold !== undefined) {
      this.config.criticalThreshold = config.criticalThreshold
    }
    if (config.charsPerToken !== undefined) {
      this.config.charsPerToken = config.charsPerToken
    }
    if (config.onCompact !== undefined) {
      this.callbacks.onCompact = config.onCompact
    }
    if (config.onWarning !== undefined) {
      this.callbacks.onWarning = config.onWarning
    }
    if (config.summarizer !== undefined) {
      this.callbacks.summarizer = config.summarizer
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let autoCompactManagerInstance: AutoCompactManager | null = null

/**
 * Get the singleton Auto Compact Manager instance
 */
export function getAutoCompactManager(config?: AutoCompactManagerConfig): AutoCompactManager {
  if (!autoCompactManagerInstance) {
    autoCompactManagerInstance = new AutoCompactManager(config)
  }
  return autoCompactManagerInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetAutoCompactManager(): void {
  autoCompactManagerInstance = null
}

/**
 * Create a new Auto Compact Manager instance
 */
export function createAutoCompactManager(config?: AutoCompactManagerConfig): AutoCompactManager {
  return new AutoCompactManager(config)
}
