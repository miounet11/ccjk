/**
 * Context Overflow Detector
 *
 * Proactive detection and management of context window overflow.
 * Uses tiktoken-like approximation for token estimation and provides
 * configurable thresholds for warning and critical alerts.
 *
 * Enhanced for Zero-Participation Automation:
 * - Real-time token monitoring
 * - Predictive overflow detection
 * - Auto-trigger compact at thresholds
 * - Integration with Auto Session Saver
 *
 * @module brain/context-overflow-detector
 */

/**
 * Usage statistics for context tracking
 */
export interface UsageStats {
  /** Estimated total tokens used in current context */
  estimatedTokens: number
  /** Maximum tokens allowed in context window */
  maxTokens: number
  /** Percentage of context window used (0-100) */
  usagePercentage: number
  /** Number of conversation turns tracked */
  turnCount: number
  /** Timestamp of last compaction, null if never compacted */
  lastCompactedAt: Date | null
}

/**
 * Configuration options for the detector
 */
export interface ContextOverflowConfig {
  /** Maximum tokens in context window (default: 200000 for Claude) */
  maxTokens?: number
  /** Warning threshold percentage (default: 80) */
  warningThreshold?: number
  /** Critical threshold percentage (default: 90) */
  criticalThreshold?: number
  /** Characters per token approximation (default: 4) */
  charsPerToken?: number
  /** Callback when warning threshold is reached */
  onWarning?: (stats: UsageStats) => void
  /** Callback when critical threshold is reached */
  onCritical?: (stats: UsageStats) => void
  /** Callback for auto-compact triggering */
  onAutoCompact?: (stats: UsageStats) => Promise<void> | void
}

/**
 * Turn data for tracking individual conversation turns
 */
interface TurnData {
  inputTokens: number
  outputTokens: number
  timestamp: Date
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<ContextOverflowConfig, 'onWarning' | 'onCritical' | 'onAutoCompact'>> = {
  maxTokens: 200000, // Claude's context window
  warningThreshold: 80,
  criticalThreshold: 90,
  charsPerToken: 4, // tiktoken-like approximation
}

/**
 * Proactive context overflow detector
 *
 * Tracks token usage across conversation turns and provides
 * early warning when approaching context limits.
 *
 * @example
 * ```typescript
 * const detector = new ContextOverflowDetector({
 *   maxTokens: 200000,
 *   onWarning: (stats) => console.warn('Context at', stats.usagePercentage, '%'),
 *   onAutoCompact: async (stats) => await compactContext()
 * })
 *
 * // Track each turn
 * detector.trackUsage(userInput, assistantOutput)
 *
 * // Check if compaction is needed
 * if (detector.suggestCompaction()) {
 *   await performCompaction()
 *   detector.markCompacted()
 * }
 * ```
 */
export class ContextOverflowDetector {
  private config: Required<Omit<ContextOverflowConfig, 'onWarning' | 'onCritical' | 'onAutoCompact'>>
  private callbacks: Pick<ContextOverflowConfig, 'onWarning' | 'onCritical' | 'onAutoCompact'>
  private turns: TurnData[] = []
  private totalInputTokens = 0
  private totalOutputTokens = 0
  private lastCompactedAt: Date | null = null
  private warningTriggered = false
  private criticalTriggered = false

  constructor(config: ContextOverflowConfig = {}) {
    this.config = {
      maxTokens: config.maxTokens ?? DEFAULT_CONFIG.maxTokens,
      warningThreshold: config.warningThreshold ?? DEFAULT_CONFIG.warningThreshold,
      criticalThreshold: config.criticalThreshold ?? DEFAULT_CONFIG.criticalThreshold,
      charsPerToken: config.charsPerToken ?? DEFAULT_CONFIG.charsPerToken,
    }
    this.callbacks = {
      onWarning: config.onWarning,
      onCritical: config.onCritical,
      onAutoCompact: config.onAutoCompact,
    }
  }

  /**
   * Estimate token count for a given text
   *
   * Uses tiktoken-like approximation where approximately
   * 4 characters equals 1 token. This is a reasonable
   * approximation for English text and code.
   *
   * @param text - The text to estimate tokens for
   * @returns Estimated token count
   */
  estimateTokenCount(text: string): number {
    if (!text || text.length === 0) {
      return 0
    }

    // Base estimation: chars / charsPerToken
    const baseEstimate = Math.ceil(text.length / this.config.charsPerToken)

    // Adjust for special patterns that typically use more tokens
    let adjustment = 0

    // Code blocks tend to have more tokens due to syntax
    const codeBlockMatches = text.match(/```[\s\S]*?```/g)
    if (codeBlockMatches) {
      // Code typically has ~20% more tokens than plain text
      const codeLength = codeBlockMatches.reduce((sum, block) => sum + block.length, 0)
      adjustment += Math.ceil(codeLength * 0.05 / this.config.charsPerToken)
    }

    // URLs and paths tend to tokenize poorly
    const urlMatches = text.match(/https?:\/\/\S+/g)
    if (urlMatches) {
      const urlLength = urlMatches.reduce((sum, url) => sum + url.length, 0)
      adjustment += Math.ceil(urlLength * 0.1 / this.config.charsPerToken)
    }

    // JSON/structured data has more tokens
    const jsonMatches = text.match(/\{[\s\S]*?\}/g)
    if (jsonMatches) {
      const jsonLength = jsonMatches.reduce((sum, json) => sum + json.length, 0)
      adjustment += Math.ceil(jsonLength * 0.05 / this.config.charsPerToken)
    }

    // Whitespace-heavy content (indentation) uses fewer tokens
    const whitespaceRatio = (text.match(/\s/g)?.length ?? 0) / text.length
    if (whitespaceRatio > 0.3) {
      adjustment -= Math.ceil(baseEstimate * 0.05)
    }

    return Math.max(1, baseEstimate + adjustment)
  }

  /**
   * Track token usage for a conversation turn
   *
   * Records input and output tokens and triggers callbacks
   * if thresholds are exceeded.
   *
   * @param input - User input text
   * @param output - Assistant output text
   */
  trackUsage(input: string, output: string): void {
    const inputTokens = this.estimateTokenCount(input)
    const outputTokens = this.estimateTokenCount(output)

    this.turns.push({
      inputTokens,
      outputTokens,
      timestamp: new Date(),
    })

    this.totalInputTokens += inputTokens
    this.totalOutputTokens += outputTokens

    // Check thresholds and trigger callbacks
    this.checkThresholds()
  }

  /**
   * Check if context is approaching the limit
   *
   * @param threshold - Custom threshold percentage (default: warning threshold)
   * @returns True if usage exceeds the threshold
   */
  isApproachingLimit(threshold?: number): boolean {
    const effectiveThreshold = threshold ?? this.config.warningThreshold
    const stats = this.getUsageStats()
    return stats.usagePercentage >= effectiveThreshold
  }

  /**
   * Get current usage statistics
   *
   * @returns Current usage stats including tokens, percentage, and turn count
   */
  getUsageStats(): UsageStats {
    const estimatedTokens = this.totalInputTokens + this.totalOutputTokens
    const usagePercentage = (estimatedTokens / this.config.maxTokens) * 100

    return {
      estimatedTokens,
      maxTokens: this.config.maxTokens,
      usagePercentage: Math.min(100, Math.round(usagePercentage * 100) / 100),
      turnCount: this.turns.length,
      lastCompactedAt: this.lastCompactedAt,
    }
  }

  /**
   * Suggest whether compaction should be performed
   *
   * Returns true if:
   * - Usage exceeds critical threshold, OR
   * - Usage exceeds warning threshold AND more than 10 turns since last compaction
   *
   * @returns True if compaction is recommended
   */
  suggestCompaction(): boolean {
    const stats = this.getUsageStats()

    // Always suggest at critical threshold
    if (stats.usagePercentage >= this.config.criticalThreshold) {
      return true
    }

    // Suggest at warning threshold if many turns since last compaction
    if (stats.usagePercentage >= this.config.warningThreshold) {
      const turnsSinceCompaction = this.getTurnsSinceCompaction()
      return turnsSinceCompaction >= 10
    }

    return false
  }

  /**
   * Reset all tracking data
   *
   * Clears all turn history and resets token counts.
   * Does not reset the lastCompactedAt timestamp.
   */
  reset(): void {
    this.turns = []
    this.totalInputTokens = 0
    this.totalOutputTokens = 0
    this.warningTriggered = false
    this.criticalTriggered = false
  }

  /**
   * Mark that compaction was performed
   *
   * Updates the lastCompactedAt timestamp and resets
   * threshold triggers to allow re-triggering.
   */
  markCompacted(): void {
    this.lastCompactedAt = new Date()
    this.warningTriggered = false
    this.criticalTriggered = false
  }

  /**
   * Get detailed turn-by-turn breakdown
   *
   * @returns Array of turn data with token counts and timestamps
   */
  getTurnBreakdown(): ReadonlyArray<Readonly<TurnData>> {
    return this.turns.map(turn => ({ ...turn }))
  }

  /**
   * Get average tokens per turn
   *
   * @returns Average tokens (input + output) per turn
   */
  getAverageTokensPerTurn(): number {
    if (this.turns.length === 0) {
      return 0
    }
    const stats = this.getUsageStats()
    return Math.round(stats.estimatedTokens / this.turns.length)
  }

  /**
   * Estimate remaining turns before hitting limit
   *
   * @param targetPercentage - Target usage percentage (default: critical threshold)
   * @returns Estimated number of turns remaining
   */
  estimateRemainingTurns(targetPercentage?: number): number {
    const target = targetPercentage ?? this.config.criticalThreshold
    const avgTokensPerTurn = this.getAverageTokensPerTurn()

    if (avgTokensPerTurn === 0) {
      return Number.POSITIVE_INFINITY
    }

    const stats = this.getUsageStats()
    const targetTokens = (target / 100) * this.config.maxTokens
    const remainingTokens = targetTokens - stats.estimatedTokens

    if (remainingTokens <= 0) {
      return 0
    }

    return Math.floor(remainingTokens / avgTokensPerTurn)
  }

  /**
   * Update configuration dynamically
   *
   * @param newConfig - Partial configuration to update
   */
  updateConfig(newConfig: Partial<ContextOverflowConfig>): void {
    if (newConfig.maxTokens !== undefined) {
      this.config.maxTokens = newConfig.maxTokens
    }
    if (newConfig.warningThreshold !== undefined) {
      this.config.warningThreshold = newConfig.warningThreshold
    }
    if (newConfig.criticalThreshold !== undefined) {
      this.config.criticalThreshold = newConfig.criticalThreshold
    }
    if (newConfig.charsPerToken !== undefined) {
      this.config.charsPerToken = newConfig.charsPerToken
    }
    if (newConfig.onWarning !== undefined) {
      this.callbacks.onWarning = newConfig.onWarning
    }
    if (newConfig.onCritical !== undefined) {
      this.callbacks.onCritical = newConfig.onCritical
    }
    if (newConfig.onAutoCompact !== undefined) {
      this.callbacks.onAutoCompact = newConfig.onAutoCompact
    }
  }

  /**
   * Check thresholds and trigger callbacks
   */
  private checkThresholds(): void {
    const stats = this.getUsageStats()

    // Check critical threshold first
    if (stats.usagePercentage >= this.config.criticalThreshold) {
      if (!this.criticalTriggered) {
        this.criticalTriggered = true
        this.callbacks.onCritical?.(stats)

        // Trigger auto-compact at critical level
        if (this.callbacks.onAutoCompact) {
          void Promise.resolve(this.callbacks.onAutoCompact(stats))
        }
      }
    }
    // Then check warning threshold
    else if (stats.usagePercentage >= this.config.warningThreshold) {
      if (!this.warningTriggered) {
        this.warningTriggered = true
        this.callbacks.onWarning?.(stats)
      }
    }
  }

  /**
   * Get number of turns since last compaction
   */
  private getTurnsSinceCompaction(): number {
    if (!this.lastCompactedAt) {
      return this.turns.length
    }

    return this.turns.filter(turn => turn.timestamp > this.lastCompactedAt!).length
  }
}

/**
 * Create a pre-configured detector for Claude models
 *
 * @param config - Optional configuration overrides
 * @returns Configured ContextOverflowDetector instance
 */
export function createClaudeDetector(config?: Partial<ContextOverflowConfig>): ContextOverflowDetector {
  return new ContextOverflowDetector({
    maxTokens: 200000, // Claude's context window
    warningThreshold: 80,
    criticalThreshold: 90,
    ...config,
  })
}

/**
 * Create a pre-configured detector for GPT-4 models
 *
 * @param config - Optional configuration overrides
 * @returns Configured ContextOverflowDetector instance
 */
export function createGPT4Detector(config?: Partial<ContextOverflowConfig>): ContextOverflowDetector {
  return new ContextOverflowDetector({
    maxTokens: 128000, // GPT-4 Turbo context window
    warningThreshold: 80,
    criticalThreshold: 90,
    ...config,
  })
}

/**
 * Create a pre-configured detector for smaller context windows
 *
 * @param maxTokens - Maximum tokens for the model
 * @param config - Optional configuration overrides
 * @returns Configured ContextOverflowDetector instance
 */
export function createCustomDetector(
  maxTokens: number,
  config?: Partial<Omit<ContextOverflowConfig, 'maxTokens'>>,
): ContextOverflowDetector {
  return new ContextOverflowDetector({
    maxTokens,
    warningThreshold: 80,
    criticalThreshold: 90,
    ...config,
  })
}

// ============================================================================
// Enhanced Predictive Analysis
// ============================================================================

/**
 * Prediction result for context overflow
 */
export interface OverflowPrediction {
  /** Predicted turns until warning threshold */
  turnsUntilWarning: number
  /** Predicted turns until critical threshold */
  turnsUntilCritical: number
  /** Predicted turns until overflow */
  turnsUntilOverflow: number
  /** Confidence level (0-1) based on data points */
  confidence: number
  /** Recommended action */
  recommendation: 'none' | 'prepare' | 'compact_soon' | 'compact_now'
  /** Current usage trend */
  trend: 'stable' | 'increasing' | 'decreasing'
}

/**
 * Enhanced detector with predictive capabilities
 */
export class PredictiveContextDetector extends ContextOverflowDetector {
  private recentTokenRates: number[] = []
  private readonly maxRateSamples = 10

  /**
   * Track usage with rate calculation
   */
  override trackUsage(input: string, output: string): void {
    const inputTokens = this.estimateTokenCount(input)
    const outputTokens = this.estimateTokenCount(output)
    const totalTokens = inputTokens + outputTokens

    // Track token rate
    this.recentTokenRates.push(totalTokens)
    if (this.recentTokenRates.length > this.maxRateSamples) {
      this.recentTokenRates.shift()
    }

    super.trackUsage(input, output)
  }

  /**
   * Get overflow prediction
   */
  predictOverflow(): OverflowPrediction {
    const stats = this.getUsageStats()
    const avgTokensPerTurn = this.getAverageTokensPerTurn()

    // Calculate confidence based on data points
    const confidence = Math.min(1, this.recentTokenRates.length / this.maxRateSamples)

    // Calculate trend
    const trend = this.calculateTrend()

    // Calculate turns until thresholds
    const turnsUntilWarning = this.calculateTurnsUntil(80, avgTokensPerTurn, stats)
    const turnsUntilCritical = this.calculateTurnsUntil(90, avgTokensPerTurn, stats)
    const turnsUntilOverflow = this.calculateTurnsUntil(100, avgTokensPerTurn, stats)

    // Determine recommendation
    let recommendation: OverflowPrediction['recommendation'] = 'none'

    if (stats.usagePercentage >= 90) {
      recommendation = 'compact_now'
    }
    else if (stats.usagePercentage >= 80 || turnsUntilCritical <= 3) {
      recommendation = 'compact_soon'
    }
    else if (stats.usagePercentage >= 70 || turnsUntilWarning <= 5) {
      recommendation = 'prepare'
    }

    return {
      turnsUntilWarning,
      turnsUntilCritical,
      turnsUntilOverflow,
      confidence,
      recommendation,
      trend,
    }
  }

  /**
   * Calculate turns until a threshold
   */
  private calculateTurnsUntil(
    targetPercentage: number,
    avgTokensPerTurn: number,
    stats: UsageStats,
  ): number {
    if (avgTokensPerTurn === 0) {
      return Number.POSITIVE_INFINITY
    }

    const targetTokens = (targetPercentage / 100) * stats.maxTokens
    const remainingTokens = targetTokens - stats.estimatedTokens

    if (remainingTokens <= 0) {
      return 0
    }

    return Math.floor(remainingTokens / avgTokensPerTurn)
  }

  /**
   * Calculate usage trend
   */
  private calculateTrend(): OverflowPrediction['trend'] {
    if (this.recentTokenRates.length < 3) {
      return 'stable'
    }

    const recent = this.recentTokenRates.slice(-3)
    const older = this.recentTokenRates.slice(0, -3)

    if (older.length === 0) {
      return 'stable'
    }

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100

    if (changePercent > 10) {
      return 'increasing'
    }
    else if (changePercent < -10) {
      return 'decreasing'
    }

    return 'stable'
  }

  /**
   * Reset with rate tracking
   */
  override reset(): void {
    super.reset()
    this.recentTokenRates = []
  }
}

/**
 * Create a predictive detector for Claude models
 */
export function createPredictiveClaudeDetector(
  config?: Partial<ContextOverflowConfig>,
): PredictiveContextDetector {
  return new PredictiveContextDetector({
    maxTokens: 200000,
    warningThreshold: 80,
    criticalThreshold: 90,
    ...config,
  })
}

// ============================================================================
// Singleton Instance
// ============================================================================

let contextDetectorInstance: PredictiveContextDetector | null = null

/**
 * Get the singleton context detector instance
 */
export function getContextDetector(
  config?: Partial<ContextOverflowConfig>,
): PredictiveContextDetector {
  if (!contextDetectorInstance) {
    contextDetectorInstance = createPredictiveClaudeDetector(config)
  }
  return contextDetectorInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetContextDetector(): void {
  contextDetectorInstance = null
}
