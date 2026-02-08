/**
 * Auto Session Saver
 *
 * Automatically saves sessions based on configurable triggers:
 * - Message count threshold
 * - Time interval
 * - Exit/shutdown events
 * - Crash recovery support
 *
 * Part of the Zero-Participation Automation system.
 *
 * @module brain/auto-session-saver
 */

import type { SessionHistoryEntry } from './session-manager'
import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { SessionManager } from './session-manager'

// ============================================================================
// Types
// ============================================================================

/**
 * Auto-save trigger types
 */
export type AutoSaveTrigger
  = | 'message_count'
    | 'time_interval'
    | 'exit'
    | 'crash_recovery'
    | 'manual'
    | 'context_compact'

/**
 * Auto-save event data
 */
export interface AutoSaveEvent {
  trigger: AutoSaveTrigger
  sessionId: string
  timestamp: number
  messageCount: number
  success: boolean
  error?: Error
}

/**
 * Crash recovery data
 */
export interface CrashRecoveryData {
  sessionId: string
  lastSaveTime: number
  messageCount: number
  pendingMessages: SessionHistoryEntry[]
  contextSnapshot?: string
}

/**
 * Auto Session Saver configuration
 */
export interface AutoSessionSaverConfig {
  /** Number of messages before auto-save (default: 10) */
  messageThreshold?: number

  /** Time interval for auto-save in milliseconds (default: 5 minutes) */
  saveIntervalMs?: number

  /** Enable crash recovery (default: true) */
  enableCrashRecovery?: boolean

  /** Directory for crash recovery files */
  recoveryDir?: string

  /** Callback when auto-save occurs */
  onAutoSave?: (event: AutoSaveEvent) => void

  /** Callback when crash recovery is available */
  onCrashRecoveryAvailable?: (data: CrashRecoveryData) => void

  /** Custom session manager instance */
  sessionManager?: SessionManager
}

/**
 * Auto Session Saver statistics
 */
export interface AutoSessionSaverStats {
  totalSaves: number
  savesByTrigger: Record<AutoSaveTrigger, number>
  lastSaveTime: number | null
  lastSaveTrigger: AutoSaveTrigger | null
  messagesSinceLastSave: number
  crashRecoveriesPerformed: number
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MESSAGE_THRESHOLD = 10
const DEFAULT_SAVE_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const RECOVERY_FILE_PREFIX = 'crash-recovery-'

// ============================================================================
// Auto Session Saver Class
// ============================================================================

/**
 * Auto Session Saver
 *
 * Automatically saves sessions to prevent data loss.
 * Supports multiple trigger types and crash recovery.
 *
 * @example
 * ```typescript
 * const saver = new AutoSessionSaver({
 *   messageThreshold: 10,
 *   saveIntervalMs: 5 * 60 * 1000,
 *   onAutoSave: (event) => console.log('Auto-saved:', event),
 * })
 *
 * // Start monitoring
 * saver.start(sessionId)
 *
 * // Track messages
 * saver.onMessage(message)
 *
 * // Stop on exit
 * await saver.stop()
 * ```
 */
export class AutoSessionSaver extends EventEmitter {
  private config: Required<Omit<AutoSessionSaverConfig, 'onAutoSave' | 'onCrashRecoveryAvailable' | 'sessionManager'>>
  private callbacks: Pick<AutoSessionSaverConfig, 'onAutoSave' | 'onCrashRecoveryAvailable'>
  private sessionManager: SessionManager

  private currentSessionId: string | null = null
  private messageCount = 0
  private messagesSinceLastSave = 0
  private pendingMessages: SessionHistoryEntry[] = []
  private saveTimer: ReturnType<typeof setInterval> | null = null
  private lastSaveTime: number | null = null
  private isRunning = false
  private isSaving = false

  private stats: AutoSessionSaverStats = {
    totalSaves: 0,
    savesByTrigger: {
      message_count: 0,
      time_interval: 0,
      exit: 0,
      crash_recovery: 0,
      manual: 0,
      context_compact: 0,
    },
    lastSaveTime: null,
    lastSaveTrigger: null,
    messagesSinceLastSave: 0,
    crashRecoveriesPerformed: 0,
  }

  constructor(config: AutoSessionSaverConfig = {}) {
    super()

    this.config = {
      messageThreshold: config.messageThreshold ?? DEFAULT_MESSAGE_THRESHOLD,
      saveIntervalMs: config.saveIntervalMs ?? DEFAULT_SAVE_INTERVAL_MS,
      enableCrashRecovery: config.enableCrashRecovery ?? true,
      recoveryDir: config.recoveryDir ?? join(homedir(), '.claude', 'recovery'),
    }

    this.callbacks = {
      onAutoSave: config.onAutoSave,
      onCrashRecoveryAvailable: config.onCrashRecoveryAvailable,
    }

    this.sessionManager = config.sessionManager ?? new SessionManager()

    // Register process handlers for graceful shutdown
    this.registerProcessHandlers()
  }

  // ==========================================================================
  // Lifecycle Methods
  // ==========================================================================

  /**
   * Start auto-save monitoring for a session
   */
  async start(sessionId: string): Promise<void> {
    if (this.isRunning) {
      await this.stop()
    }

    this.currentSessionId = sessionId
    this.messageCount = 0
    this.messagesSinceLastSave = 0
    this.pendingMessages = []
    this.lastSaveTime = Date.now()
    this.isRunning = true

    // Check for crash recovery
    if (this.config.enableCrashRecovery) {
      await this.checkCrashRecovery(sessionId)
    }

    // Start interval timer
    this.saveTimer = setInterval(
      () => this.triggerSave('time_interval'),
      this.config.saveIntervalMs,
    )

    // Write initial recovery file
    await this.writeRecoveryFile()

    this.emit('started', { sessionId })
  }

  /**
   * Stop auto-save monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    // Clear interval timer
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
      this.saveTimer = null
    }

    // Final save on exit
    if (this.currentSessionId && this.messagesSinceLastSave > 0) {
      await this.triggerSave('exit')
    }

    // Clean up recovery file
    await this.cleanupRecoveryFile()

    this.isRunning = false
    this.currentSessionId = null

    this.emit('stopped')
  }

  // ==========================================================================
  // Message Tracking
  // ==========================================================================

  /**
   * Track a new message
   */
  async onMessage(message: SessionHistoryEntry): Promise<void> {
    if (!this.isRunning || !this.currentSessionId) {
      return
    }

    this.messageCount++
    this.messagesSinceLastSave++
    this.pendingMessages.push(message)
    this.stats.messagesSinceLastSave = this.messagesSinceLastSave

    // Update recovery file
    await this.writeRecoveryFile()

    // Check if we should auto-save
    if (this.messagesSinceLastSave >= this.config.messageThreshold) {
      await this.triggerSave('message_count')
    }
  }

  /**
   * Track multiple messages at once
   */
  async onMessages(messages: SessionHistoryEntry[]): Promise<void> {
    for (const message of messages) {
      await this.onMessage(message)
    }
  }

  // ==========================================================================
  // Save Operations
  // ==========================================================================

  /**
   * Trigger a save operation
   */
  async triggerSave(trigger: AutoSaveTrigger): Promise<boolean> {
    if (!this.currentSessionId || this.isSaving) {
      return false
    }

    // Skip if no pending messages (except for exit/manual triggers)
    if (this.messagesSinceLastSave === 0 && trigger !== 'exit' && trigger !== 'manual') {
      return false
    }

    this.isSaving = true

    const event: AutoSaveEvent = {
      trigger,
      sessionId: this.currentSessionId,
      timestamp: Date.now(),
      messageCount: this.messagesSinceLastSave,
      success: false,
    }

    try {
      // Load current session
      const session = await this.sessionManager.loadSession(this.currentSessionId)

      if (!session) {
        throw new Error(`Session not found: ${this.currentSessionId}`)
      }

      // Add pending messages to session history
      session.history.push(...this.pendingMessages)
      session.lastUsedAt = new Date()

      // Save session
      await this.sessionManager.saveSession(session)

      // Update state
      this.pendingMessages = []
      this.messagesSinceLastSave = 0
      this.lastSaveTime = Date.now()

      // Update stats
      this.stats.totalSaves++
      this.stats.savesByTrigger[trigger]++
      this.stats.lastSaveTime = this.lastSaveTime
      this.stats.lastSaveTrigger = trigger
      this.stats.messagesSinceLastSave = 0

      // Update recovery file
      await this.writeRecoveryFile()

      event.success = true
      this.emit('saved', event)
      this.callbacks.onAutoSave?.(event)

      return true
    }
    catch (error) {
      event.error = error instanceof Error ? error : new Error(String(error))
      this.emit('save-error', event)
      this.callbacks.onAutoSave?.(event)

      return false
    }
    finally {
      this.isSaving = false
    }
  }

  /**
   * Force an immediate save
   */
  async forceSave(): Promise<boolean> {
    return this.triggerSave('manual')
  }

  /**
   * Save before context compact
   */
  async saveBeforeCompact(): Promise<boolean> {
    return this.triggerSave('context_compact')
  }

  // ==========================================================================
  // Crash Recovery
  // ==========================================================================

  /**
   * Check for crash recovery data
   */
  private async checkCrashRecovery(sessionId: string): Promise<void> {
    if (!this.config.enableCrashRecovery) {
      return
    }

    const recoveryPath = this.getRecoveryFilePath(sessionId)

    if (!existsSync(recoveryPath)) {
      return
    }

    try {
      const content = await readFile(recoveryPath, 'utf-8')
      const recoveryData: CrashRecoveryData = JSON.parse(content)

      // Check if there are pending messages to recover
      if (recoveryData.pendingMessages && recoveryData.pendingMessages.length > 0) {
        this.emit('crash-recovery-available', recoveryData)
        this.callbacks.onCrashRecoveryAvailable?.(recoveryData)
      }
    }
    catch (_error) {
      // Recovery file is corrupted, clean it up
      await this.cleanupRecoveryFile()
    }
  }

  /**
   * Recover from crash
   */
  async recoverFromCrash(sessionId: string): Promise<boolean> {
    const recoveryPath = this.getRecoveryFilePath(sessionId)

    if (!existsSync(recoveryPath)) {
      return false
    }

    try {
      const content = await readFile(recoveryPath, 'utf-8')
      const recoveryData: CrashRecoveryData = JSON.parse(content)

      if (!recoveryData.pendingMessages || recoveryData.pendingMessages.length === 0) {
        await this.cleanupRecoveryFile()
        return false
      }

      // Load session
      const session = await this.sessionManager.loadSession(sessionId)

      if (!session) {
        return false
      }

      // Restore pending messages
      const restoredMessages = recoveryData.pendingMessages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }))

      session.history.push(...restoredMessages)
      session.lastUsedAt = new Date()

      // Save session
      await this.sessionManager.saveSession(session)

      // Update stats
      this.stats.crashRecoveriesPerformed++

      // Clean up recovery file
      await this.cleanupRecoveryFile()

      this.emit('crash-recovered', {
        sessionId,
        messagesRecovered: restoredMessages.length,
      })

      return true
    }
    catch (error) {
      console.error('Failed to recover from crash:', error)
      return false
    }
  }

  /**
   * Write recovery file
   */
  private async writeRecoveryFile(): Promise<void> {
    if (!this.config.enableCrashRecovery || !this.currentSessionId) {
      return
    }

    try {
      await this.ensureRecoveryDir()

      const recoveryData: CrashRecoveryData = {
        sessionId: this.currentSessionId,
        lastSaveTime: this.lastSaveTime ?? Date.now(),
        messageCount: this.messageCount,
        pendingMessages: this.pendingMessages,
      }

      const recoveryPath = this.getRecoveryFilePath(this.currentSessionId)
      await writeFile(recoveryPath, JSON.stringify(recoveryData, null, 2), 'utf-8')
    }
    catch (error) {
      console.error('Failed to write recovery file:', error)
    }
  }

  /**
   * Clean up recovery file
   */
  private async cleanupRecoveryFile(): Promise<void> {
    if (!this.currentSessionId) {
      return
    }

    const recoveryPath = this.getRecoveryFilePath(this.currentSessionId)

    if (existsSync(recoveryPath)) {
      try {
        await unlink(recoveryPath)
      }
      catch (_error) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Get recovery file path
   */
  private getRecoveryFilePath(sessionId: string): string {
    return join(this.config.recoveryDir, `${RECOVERY_FILE_PREFIX}${sessionId}.json`)
  }

  /**
   * Ensure recovery directory exists
   */
  private async ensureRecoveryDir(): Promise<void> {
    if (!existsSync(this.config.recoveryDir)) {
      await mkdir(this.config.recoveryDir, { recursive: true })
    }
  }

  // ==========================================================================
  // Process Handlers
  // ==========================================================================

  /**
   * Register process event handlers
   */
  private registerProcessHandlers(): void {
    // Handle graceful shutdown
    const shutdownHandler = async () => {
      await this.stop()
    }

    process.on('SIGINT', shutdownHandler)
    process.on('SIGTERM', shutdownHandler)

    // Handle before exit
    process.on('beforeExit', async () => {
      if (this.isRunning) {
        await this.stop()
      }
    })
  }

  // ==========================================================================
  // Statistics and State
  // ==========================================================================

  /**
   * Get current statistics
   */
  getStats(): AutoSessionSaverStats {
    return { ...this.stats }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalSaves: 0,
      savesByTrigger: {
        message_count: 0,
        time_interval: 0,
        exit: 0,
        crash_recovery: 0,
        manual: 0,
        context_compact: 0,
      },
      lastSaveTime: null,
      lastSaveTrigger: null,
      messagesSinceLastSave: 0,
      crashRecoveriesPerformed: 0,
    }
  }

  /**
   * Check if auto-saver is running
   */
  isActive(): boolean {
    return this.isRunning
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId
  }

  /**
   * Get pending message count
   */
  getPendingMessageCount(): number {
    return this.pendingMessages.length
  }

  /**
   * Get time since last save
   */
  getTimeSinceLastSave(): number | null {
    if (!this.lastSaveTime) {
      return null
    }
    return Date.now() - this.lastSaveTime
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AutoSessionSaverConfig>): void {
    if (config.messageThreshold !== undefined) {
      this.config.messageThreshold = config.messageThreshold
    }
    if (config.saveIntervalMs !== undefined) {
      this.config.saveIntervalMs = config.saveIntervalMs

      // Restart timer with new interval
      if (this.saveTimer) {
        clearInterval(this.saveTimer)
        this.saveTimer = setInterval(
          () => this.triggerSave('time_interval'),
          this.config.saveIntervalMs,
        )
      }
    }
    if (config.enableCrashRecovery !== undefined) {
      this.config.enableCrashRecovery = config.enableCrashRecovery
    }
    if (config.recoveryDir !== undefined) {
      this.config.recoveryDir = config.recoveryDir
    }
    if (config.onAutoSave !== undefined) {
      this.callbacks.onAutoSave = config.onAutoSave
    }
    if (config.onCrashRecoveryAvailable !== undefined) {
      this.callbacks.onCrashRecoveryAvailable = config.onCrashRecoveryAvailable
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let autoSessionSaverInstance: AutoSessionSaver | null = null

/**
 * Get the singleton Auto Session Saver instance
 */
export function getAutoSessionSaver(config?: AutoSessionSaverConfig): AutoSessionSaver {
  if (!autoSessionSaverInstance) {
    autoSessionSaverInstance = new AutoSessionSaver(config)
  }
  return autoSessionSaverInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetAutoSessionSaver(): void {
  if (autoSessionSaverInstance) {
    autoSessionSaverInstance.stop().catch(() => {})
    autoSessionSaverInstance = null
  }
}

/**
 * Create a new Auto Session Saver instance
 */
export function createAutoSessionSaver(config?: AutoSessionSaverConfig): AutoSessionSaver {
  return new AutoSessionSaver(config)
}
