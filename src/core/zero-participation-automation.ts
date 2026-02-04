/**
 * Zero-Participation Automation (ZPA)
 *
 * Core orchestrator for automated session management:
 * - Auto Session Saver: Automatic session persistence
 * - Auto Compact Manager: Intelligent context compaction
 * - Context Overflow Detector: Proactive overflow prevention
 *
 * Design Philosophy:
 * - Zero user intervention required
 * - Seamless background operation
 * - Graceful degradation on errors
 * - Full crash recovery support
 *
 * @module core/zero-participation-automation
 */

import type { AutoSaveEvent, AutoSessionSaver, AutoSessionSaverConfig, CrashRecoveryData } from '../brain/auto-session-saver'
import type { ContextOverflowConfig, OverflowPrediction, PredictiveContextDetector, UsageStats } from '../brain/context-overflow-detector'
import type { SessionHistoryEntry } from '../brain/session-manager'
import type { AutoCompactManager, AutoCompactManagerConfig, CompactResult } from './auto-compact-manager'
import { EventEmitter } from 'node:events'
import { getAutoSessionSaver } from '../brain/auto-session-saver'
import { getContextDetector } from '../brain/context-overflow-detector'
import { getAutoCompactManager } from './auto-compact-manager'

// ============================================================================
// Types
// ============================================================================

/**
 * ZPA event types
 */
export type ZPAEventType
  = | 'session-saved'
    | 'session-save-error'
    | 'context-warning'
    | 'context-critical'
    | 'compact-triggered'
    | 'compact-completed'
    | 'compact-error'
    | 'crash-recovery-available'
    | 'crash-recovered'
    | 'prediction-updated'

/**
 * ZPA event data
 */
export interface ZPAEvent {
  type: ZPAEventType
  timestamp: number
  data: unknown
}

/**
 * ZPA configuration
 */
export interface ZPAConfig {
  /** Enable auto session saving (default: true) */
  enableAutoSave?: boolean

  /** Enable auto context compaction (default: true) */
  enableAutoCompact?: boolean

  /** Enable crash recovery (default: true) */
  enableCrashRecovery?: boolean

  /** Auto session saver configuration */
  autoSaveConfig?: AutoSessionSaverConfig

  /** Auto compact manager configuration */
  autoCompactConfig?: AutoCompactManagerConfig

  /** Context overflow detector configuration */
  contextDetectorConfig?: ContextOverflowConfig

  /** Callback for ZPA events */
  onEvent?: (event: ZPAEvent) => void

  /** Callback for user notifications */
  onNotify?: (message: string, level: 'info' | 'warning' | 'error') => void
}

/**
 * ZPA status
 */
export interface ZPAStatus {
  isRunning: boolean
  currentSessionId: string | null
  autoSaveEnabled: boolean
  autoCompactEnabled: boolean
  crashRecoveryEnabled: boolean
  lastSaveTime: number | null
  lastCompactTime: number | null
  pendingMessages: number
  contextUsage: UsageStats | null
  prediction: OverflowPrediction | null
}

/**
 * ZPA statistics
 */
export interface ZPAStats {
  totalSaves: number
  totalCompactions: number
  totalCrashRecoveries: number
  tokensSaved: number
  messagesSummarized: number
  uptime: number
}

// ============================================================================
// Zero-Participation Automation Class
// ============================================================================

/**
 * Zero-Participation Automation
 *
 * Orchestrates all automated session management features.
 *
 * @example
 * ```typescript
 * const zpa = new ZeroParticipationAutomation({
 *   enableAutoSave: true,
 *   enableAutoCompact: true,
 *   onNotify: (msg, level) => console.log(`[${level}] ${msg}`),
 * })
 *
 * // Start monitoring
 * await zpa.start(sessionId)
 *
 * // Track messages
 * await zpa.onMessage(userMessage)
 * await zpa.onMessage(assistantMessage)
 *
 * // Stop on exit
 * await zpa.stop()
 * ```
 */
export class ZeroParticipationAutomation extends EventEmitter {
  private config: Required<Omit<ZPAConfig, 'autoSaveConfig' | 'autoCompactConfig' | 'contextDetectorConfig' | 'onEvent' | 'onNotify'>>
  private callbacks: Pick<ZPAConfig, 'onEvent' | 'onNotify'>

  private autoSaver: AutoSessionSaver
  private autoCompactManager: AutoCompactManager
  private contextDetector: PredictiveContextDetector

  private isRunning = false
  private currentSessionId: string | null = null
  private startTime: number | null = null
  private messageHistory: SessionHistoryEntry[] = []

  private stats: ZPAStats = {
    totalSaves: 0,
    totalCompactions: 0,
    totalCrashRecoveries: 0,
    tokensSaved: 0,
    messagesSummarized: 0,
    uptime: 0,
  }

  constructor(config: ZPAConfig = {}) {
    super()

    this.config = {
      enableAutoSave: config.enableAutoSave ?? true,
      enableAutoCompact: config.enableAutoCompact ?? true,
      enableCrashRecovery: config.enableCrashRecovery ?? true,
    }

    this.callbacks = {
      onEvent: config.onEvent,
      onNotify: config.onNotify,
    }

    // Initialize components
    this.autoSaver = getAutoSessionSaver({
      ...config.autoSaveConfig,
      enableCrashRecovery: this.config.enableCrashRecovery,
      onAutoSave: this.handleAutoSave.bind(this),
      onCrashRecoveryAvailable: this.handleCrashRecoveryAvailable.bind(this),
    })

    this.autoCompactManager = getAutoCompactManager({
      ...config.autoCompactConfig,
      onCompact: this.handleCompact.bind(this),
      onWarning: this.handleContextWarning.bind(this),
    })

    this.contextDetector = getContextDetector({
      ...config.contextDetectorConfig,
      onWarning: this.handleContextWarning.bind(this),
      onCritical: this.handleContextCritical.bind(this),
      onAutoCompact: this.handleAutoCompactTrigger.bind(this),
    })
  }

  // ==========================================================================
  // Lifecycle Methods
  // ==========================================================================

  /**
   * Start ZPA monitoring for a session
   */
  async start(sessionId: string): Promise<void> {
    if (this.isRunning) {
      await this.stop()
    }

    this.currentSessionId = sessionId
    this.startTime = Date.now()
    this.messageHistory = []
    this.isRunning = true

    // Start auto saver
    if (this.config.enableAutoSave) {
      await this.autoSaver.start(sessionId)
    }

    // Reset context detector
    this.contextDetector.reset()

    this.notify('ZPA started', 'info')
    this.emit('started', { sessionId })
  }

  /**
   * Stop ZPA monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    // Stop auto saver
    if (this.config.enableAutoSave) {
      await this.autoSaver.stop()
    }

    // Update uptime
    if (this.startTime) {
      this.stats.uptime += Date.now() - this.startTime
    }

    this.isRunning = false
    this.currentSessionId = null
    this.startTime = null

    this.notify('ZPA stopped', 'info')
    this.emit('stopped')
  }

  // ==========================================================================
  // Message Tracking
  // ==========================================================================

  /**
   * Track a new message
   */
  async onMessage(message: SessionHistoryEntry): Promise<void> {
    if (!this.isRunning) {
      return
    }

    // Add to history
    this.messageHistory.push(message)

    // Track with auto saver
    if (this.config.enableAutoSave) {
      await this.autoSaver.onMessage(message)
    }

    // Track with context detector
    if (message.role === 'user' || message.role === 'assistant') {
      // Find the paired message
      const lastUserMsg = this.messageHistory
        .filter(m => m.role === 'user')
        .pop()
      const lastAssistantMsg = this.messageHistory
        .filter(m => m.role === 'assistant')
        .pop()

      if (lastUserMsg && lastAssistantMsg) {
        this.contextDetector.trackUsage(lastUserMsg.content, lastAssistantMsg.content)

        // Check for auto-compact
        if (this.config.enableAutoCompact) {
          const prediction = this.contextDetector.predictOverflow()
          this.emitEvent('prediction-updated', prediction)

          if (prediction.recommendation === 'compact_now') {
            await this.triggerAutoCompact()
          }
        }
      }
    }
  }

  /**
   * Track a conversation turn (user + assistant pair)
   */
  async onTurn(userMessage: string, assistantMessage: string): Promise<void> {
    const userEntry: SessionHistoryEntry = {
      timestamp: new Date(),
      role: 'user',
      content: userMessage,
    }

    const assistantEntry: SessionHistoryEntry = {
      timestamp: new Date(),
      role: 'assistant',
      content: assistantMessage,
    }

    await this.onMessage(userEntry)
    await this.onMessage(assistantEntry)
  }

  // ==========================================================================
  // Auto Compact
  // ==========================================================================

  /**
   * Trigger auto compact
   */
  async triggerAutoCompact(): Promise<CompactResult | null> {
    if (!this.config.enableAutoCompact || this.messageHistory.length === 0) {
      return null
    }

    this.notify('Auto-compacting context...', 'info')

    const result = await this.autoCompactManager.compact(this.messageHistory, {
      preserveRecent: 5,
      summarizeHistory: true,
      saveToSession: this.config.enableAutoSave,
    })

    if (result.success) {
      // Update message history with compacted version
      this.messageHistory = result.preservedMessages

      // Reset context detector with new baseline
      this.contextDetector.reset()

      // Re-track preserved messages
      for (let i = 0; i < this.messageHistory.length - 1; i += 2) {
        const user = this.messageHistory[i]
        const assistant = this.messageHistory[i + 1]
        if (user && assistant) {
          this.contextDetector.trackUsage(user.content, assistant.content)
        }
      }

      this.stats.totalCompactions++
      this.stats.tokensSaved += result.tokensBefore - result.tokensAfter
      this.stats.messagesSummarized += result.messagesBefore - result.messagesAfter

      this.notify(`Context compacted: ${result.messagesBefore} → ${result.messagesAfter} messages`, 'info')
    }
    else {
      this.notify(`Compact failed: ${result.error?.message}`, 'error')
    }

    return result
  }

  /**
   * Force save current session
   */
  async forceSave(): Promise<boolean> {
    if (!this.config.enableAutoSave) {
      return false
    }
    return this.autoSaver.forceSave()
  }

  /**
   * Recover from crash
   */
  async recoverFromCrash(): Promise<boolean> {
    if (!this.currentSessionId || !this.config.enableCrashRecovery) {
      return false
    }

    const recovered = await this.autoSaver.recoverFromCrash(this.currentSessionId)

    if (recovered) {
      this.stats.totalCrashRecoveries++
      this.notify('Session recovered from crash', 'info')
    }

    return recovered
  }

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  /**
   * Handle auto save event
   */
  private handleAutoSave(event: AutoSaveEvent): void {
    if (event.success) {
      this.stats.totalSaves++
      this.emitEvent('session-saved', event)
    }
    else {
      this.emitEvent('session-save-error', event)
    }
  }

  /**
   * Handle crash recovery available
   */
  private handleCrashRecoveryAvailable(data: CrashRecoveryData): void {
    this.notify('Crash recovery data available', 'warning')
    this.emitEvent('crash-recovery-available', data)
  }

  /**
   * Handle context warning
   */
  private handleContextWarning(stats: UsageStats): void {
    this.notify(`Context usage at ${stats.usagePercentage.toFixed(1)}%`, 'warning')
    this.emitEvent('context-warning', stats)
  }

  /**
   * Handle context critical
   */
  private handleContextCritical(stats: UsageStats): void {
    this.notify(`Context usage critical: ${stats.usagePercentage.toFixed(1)}%`, 'error')
    this.emitEvent('context-critical', stats)
  }

  /**
   * Handle auto compact trigger
   */
  private async handleAutoCompactTrigger(stats: UsageStats): Promise<void> {
    this.emitEvent('compact-triggered', stats)
    await this.triggerAutoCompact()
  }

  /**
   * Handle compact result
   */
  private handleCompact(result: CompactResult): void {
    if (result.success) {
      this.emitEvent('compact-completed', result)
    }
    else {
      this.emitEvent('compact-error', result)
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Emit ZPA event
   */
  private emitEvent(type: ZPAEventType, data: unknown): void {
    const event: ZPAEvent = {
      type,
      timestamp: Date.now(),
      data,
    }

    this.emit(type, event)
    this.callbacks.onEvent?.(event)
  }

  /**
   * Send notification
   */
  private notify(message: string, level: 'info' | 'warning' | 'error'): void {
    this.callbacks.onNotify?.(message, level)
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Get current status
   */
  getStatus(): ZPAStatus {
    const contextStats = this.contextDetector.getUsageStats()
    const prediction = this.contextDetector.predictOverflow()

    return {
      isRunning: this.isRunning,
      currentSessionId: this.currentSessionId,
      autoSaveEnabled: this.config.enableAutoSave,
      autoCompactEnabled: this.config.enableAutoCompact,
      crashRecoveryEnabled: this.config.enableCrashRecovery,
      lastSaveTime: this.autoSaver.getStats().lastSaveTime,
      lastCompactTime: this.autoCompactManager.getStats().lastCompactionTime,
      pendingMessages: this.autoSaver.getPendingMessageCount(),
      contextUsage: contextStats,
      prediction,
    }
  }

  /**
   * Get statistics
   */
  getStats(): ZPAStats {
    // Update uptime if running
    let uptime = this.stats.uptime
    if (this.isRunning && this.startTime) {
      uptime += Date.now() - this.startTime
    }

    return {
      ...this.stats,
      uptime,
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalSaves: 0,
      totalCompactions: 0,
      totalCrashRecoveries: 0,
      tokensSaved: 0,
      messagesSummarized: 0,
      uptime: 0,
    }
    this.startTime = this.isRunning ? Date.now() : null
  }

  /**
   * Get context prediction
   */
  getPrediction(): OverflowPrediction {
    return this.contextDetector.predictOverflow()
  }

  /**
   * Get context usage stats
   */
  getContextUsage(): UsageStats {
    return this.contextDetector.getUsageStats()
  }

  /**
   * Check if ZPA is active
   */
  isActive(): boolean {
    return this.isRunning
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ZPAConfig>): void {
    if (config.enableAutoSave !== undefined) {
      this.config.enableAutoSave = config.enableAutoSave
    }
    if (config.enableAutoCompact !== undefined) {
      this.config.enableAutoCompact = config.enableAutoCompact
    }
    if (config.enableCrashRecovery !== undefined) {
      this.config.enableCrashRecovery = config.enableCrashRecovery
    }
    if (config.onEvent !== undefined) {
      this.callbacks.onEvent = config.onEvent
    }
    if (config.onNotify !== undefined) {
      this.callbacks.onNotify = config.onNotify
    }
    if (config.autoSaveConfig) {
      this.autoSaver.updateConfig(config.autoSaveConfig)
    }
    if (config.autoCompactConfig) {
      this.autoCompactManager.updateConfig(config.autoCompactConfig)
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let zpaInstance: ZeroParticipationAutomation | null = null

/**
 * Get the singleton ZPA instance
 */
export function getZPA(config?: ZPAConfig): ZeroParticipationAutomation {
  if (!zpaInstance) {
    zpaInstance = new ZeroParticipationAutomation(config)
  }
  return zpaInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetZPA(): void {
  if (zpaInstance) {
    zpaInstance.stop().catch(() => {})
    zpaInstance = null
  }
}

/**
 * Create a new ZPA instance
 */
export function createZPA(config?: ZPAConfig): ZeroParticipationAutomation {
  return new ZeroParticipationAutomation(config)
}

// ============================================================================
// Convenience Exports
// ============================================================================

export { AutoSessionSaver, getAutoSessionSaver } from '../brain/auto-session-saver'
export { getContextDetector, PredictiveContextDetector } from '../brain/context-overflow-detector'
export { AutoCompactManager, getAutoCompactManager } from './auto-compact-manager'
