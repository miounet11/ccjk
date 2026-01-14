/**
 * Context Manager - Main Controller
 * Orchestrates all subsystems of the Context Compression System
 *
 * This is the primary entry point for the context compression system,
 * providing a unified API for CLI wrappers and external integrations.
 */

import type {
  SessionEvent,
  SessionEventType,
  Session as SessionType,
  ThresholdLevel,
} from '../../types/context'
import type { Session, SessionMeta } from './storage-types'
import { EventEmitter } from 'node:events'
import { ConfigManager } from './config-manager'
import { SessionManager } from './session-manager'
import { StorageManager } from './storage-manager'
import { Summarizer } from './summarizer'
import { estimateTokens } from './token-estimator'

/**
 * Context Manager options
 */
export interface ContextManagerOptions {
  /** Path to configuration file */
  configPath?: string
  /** Enable automatic compression when threshold is reached */
  autoCompress?: boolean
  /** Token threshold to trigger compression (0-1 = percentage) */
  compressionThreshold?: number
  /** Maximum number of messages to keep in history */
  maxHistoryLength?: number
  /** Base directory for storage */
  storageBaseDir?: string
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Message structure for context tracking
 */
export interface Message {
  /** Message role */
  role: 'user' | 'assistant' | 'system'
  /** Message content */
  content: string
  /** Message timestamp */
  timestamp?: number
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Context statistics
 */
export interface ContextStats {
  /** Current token count */
  currentTokens: number
  /** Tokens saved through compression */
  compressedTokens: number
  /** Compression ratio (0-1) */
  compressionRatio: number
  /** Total number of sessions */
  sessionCount: number
  /** Total messages processed */
  totalMessages: number
  /** Last compression timestamp */
  lastCompression: number | null
  /** Current threshold level */
  thresholdLevel: ThresholdLevel
  /** Context usage percentage */
  contextUsage: number
}

/**
 * Context event types
 */
export type ContextEvent
  = | 'session:start'
    | 'session:end'
    | 'message:added'
    | 'compression:start'
    | 'compression:complete'
    | 'threshold:reached'
    | 'error'

/**
 * Event handler function type
 */
export type EventHandler = (data: any) => void

/**
 * Summary result from compression
 */
export interface Summary {
  /** Summary content in markdown format */
  content: string
  /** Original token count before compression */
  originalTokens: number
  /** Compressed token count */
  compressedTokens: number
  /** Compression ratio */
  compressionRatio: number
  /** Number of function calls summarized */
  fcCount: number
  /** Timestamp of compression */
  timestamp: Date
}

/**
 * Context Manager Class
 *
 * Main orchestrator for the Context Compression System.
 * Manages lifecycle of all subsystems and provides unified API.
 *
 * @example
 * ```typescript
 * const manager = new ContextManager({
 *   autoCompress: true,
 *   compressionThreshold: 0.8
 * })
 *
 * await manager.initialize()
 * const session = await manager.startSession('/path/to/project')
 * await manager.addMessage({ role: 'user', content: 'Hello' })
 *
 * if (manager.shouldCompress()) {
 *   const summary = await manager.compress()
 *   console.log(summary.content)
 * }
 * ```
 */
export class ContextManager extends EventEmitter {
  private sessionManager: SessionManager
  private summarizer: Summarizer
  private configManager: ConfigManager
  private storageManager: StorageManager

  private options: Omit<Required<ContextManagerOptions>, 'configPath' | 'storageBaseDir'> & {
    configPath?: string
    storageBaseDir?: string
  }

  private initialized = false
  private currentStorageSession: Session | null = null
  private messageHistory: Message[] = []
  private totalMessages = 0
  private lastCompressionTime: number | null = null
  private compressedTokens = 0

  /**
   * Create a new Context Manager instance
   *
   * @param options - Configuration options
   */
  constructor(options: ContextManagerOptions = {}) {
    super()

    // Set default options
    this.options = {
      configPath: options.configPath,
      autoCompress: options.autoCompress ?? true,
      compressionThreshold: options.compressionThreshold ?? 0.8,
      maxHistoryLength: options.maxHistoryLength ?? 100,
      storageBaseDir: options.storageBaseDir,
      debug: options.debug ?? false,
    }

    // Initialize subsystems (lazy initialization)
    this.configManager = new ConfigManager(this.options.configPath)
    this.storageManager = new StorageManager(this.options.storageBaseDir)
    this.sessionManager = new SessionManager()
    this.summarizer = new Summarizer()

    // Setup event forwarding from session manager
    this.setupEventForwarding()
  }

  /**
   * Initialize all subsystems
   * Must be called before using the manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      this.debug('Initializing Context Manager...')

      // Load configuration
      const config = await this.configManager.load()
      this.debug('Configuration loaded:', config)

      // Initialize storage
      await this.storageManager.initialize()
      this.debug('Storage initialized')

      // Update session manager with config
      this.sessionManager.updateConfig({
        contextThreshold: config.contextThreshold / config.maxContextTokens,
        maxContextTokens: config.maxContextTokens,
        summaryModel: config.summaryModel,
        autoSummarize: config.autoSummarize,
      })

      // Update summarizer with config
      this.summarizer.updateConfig({
        model: config.summaryModel,
      })

      this.initialized = true
      this.debug('Context Manager initialized successfully')
    }
    catch (error) {
      const errorMsg = `Failed to initialize Context Manager: ${error instanceof Error ? error.message : String(error)}`
      this.emit('error', new Error(errorMsg))
      throw new Error(errorMsg)
    }
  }

  /**
   * Start a new session or resume existing session
   *
   * @param projectPath - Absolute path to project directory
   * @returns Session information
   */
  async startSession(projectPath?: string): Promise<SessionType> {
    this.ensureInitialized()

    try {
      // Use current directory if no path provided
      const nodeProcess = await import('node:process')
      const path = projectPath || nodeProcess.cwd()
      this.debug(`Starting session for project: ${path}`)

      // Create session in session manager
      const sessionManagerSession = this.sessionManager.createSession(path)

      // Create session in storage
      this.currentStorageSession = await this.storageManager.createSession(
        path,
        'Context compression session',
      )

      // Reset message history
      this.messageHistory = []

      // Emit event
      this.emit('session:start', {
        sessionId: sessionManagerSession.id,
        projectPath: path,
      })

      this.debug(`Session started: ${sessionManagerSession.id}`)

      return sessionManagerSession
    }
    catch (error) {
      const errorMsg = `Failed to start session: ${error instanceof Error ? error.message : String(error)}`
      this.emit('error', new Error(errorMsg))
      throw new Error(errorMsg)
    }
  }

  /**
   * Add a message to the current session
   *
   * @param message - Message to add
   */
  async addMessage(message: Message): Promise<void> {
    this.ensureInitialized()

    const currentSession = this.sessionManager.getCurrentSession()
    if (!currentSession) {
      throw new Error('No active session. Call startSession() first.')
    }

    try {
      // Add timestamp if not provided
      const timestampedMessage: Message = {
        ...message,
        timestamp: message.timestamp || Date.now(),
      }

      // Add to history
      this.messageHistory.push(timestampedMessage)
      this.totalMessages++

      // Estimate tokens for the message
      const tokens = estimateTokens(message.content)

      // If this is a function call result, add to session manager
      if (message.metadata?.isFunctionCall) {
        await this.sessionManager.addFunctionCall(
          message.metadata.functionName as string,
          message.metadata.arguments as Record<string, any>,
          message.content,
        )
      }

      // Emit event
      this.emit('message:added', {
        sessionId: currentSession.id,
        message: timestampedMessage,
        tokens,
      })

      // Check if auto-compression is needed
      if (this.options.autoCompress && this.shouldCompress()) {
        this.debug('Auto-compression threshold reached')
        await this.compress()
      }

      // Trim history if needed
      if (this.messageHistory.length > this.options.maxHistoryLength) {
        const removed = this.messageHistory.splice(
          0,
          this.messageHistory.length - this.options.maxHistoryLength,
        )
        this.debug(`Trimmed ${removed.length} messages from history`)
      }
    }
    catch (error) {
      const errorMsg = `Failed to add message: ${error instanceof Error ? error.message : String(error)}`
      this.emit('error', new Error(errorMsg))
      throw new Error(errorMsg)
    }
  }

  /**
   * Check if compression should be triggered
   *
   * @returns True if compression is recommended
   */
  shouldCompress(): boolean {
    this.ensureInitialized()

    const currentSession = this.sessionManager.getCurrentSession()
    if (!currentSession) {
      return false
    }

    // Check if threshold is exceeded
    const isExceeded = this.sessionManager.isThresholdExceeded()

    // Emit event if threshold reached
    if (isExceeded) {
      this.emit('threshold:reached', {
        sessionId: currentSession.id,
        usage: this.sessionManager.getContextUsage(),
        remaining: this.sessionManager.getRemainingTokens(),
      })
    }

    return isExceeded
  }

  /**
   * Execute compression on current session
   *
   * @returns Summary of compression
   */
  async compress(): Promise<Summary> {
    this.ensureInitialized()

    const currentSession = this.sessionManager.getCurrentSession()
    if (!currentSession) {
      throw new Error('No active session to compress')
    }

    try {
      this.debug('Starting compression...')

      // Emit compression start event
      this.emit('compression:start', {
        sessionId: currentSession.id,
        tokenCount: currentSession.tokenCount,
      })

      // Generate session summary
      const summaryContent = this.sessionManager.generateSessionSummary()
      const originalTokens = currentSession.tokenCount
      const compressedTokens = estimateTokens(summaryContent)
      const compressionRatio = compressedTokens / originalTokens

      // Save summary to storage
      if (this.currentStorageSession) {
        await this.storageManager.saveSummary(
          this.currentStorageSession.meta.id,
          summaryContent,
          this.currentStorageSession.meta.projectHash,
        )
      }

      // Update statistics
      this.compressedTokens += originalTokens - compressedTokens
      this.lastCompressionTime = Date.now()

      const summary: Summary = {
        content: summaryContent,
        originalTokens,
        compressedTokens,
        compressionRatio,
        fcCount: currentSession.fcCount,
        timestamp: new Date(),
      }

      // Emit compression complete event
      this.emit('compression:complete', {
        sessionId: currentSession.id,
        summary,
      })

      this.debug(`Compression complete. Ratio: ${(compressionRatio * 100).toFixed(1)}%`)

      return summary
    }
    catch (error) {
      const errorMsg = `Failed to compress context: ${error instanceof Error ? error.message : String(error)}`
      this.emit('error', new Error(errorMsg))
      throw new Error(errorMsg)
    }
  }

  /**
   * Get optimized context for new conversation
   * Returns compressed summary if available, otherwise full context
   *
   * @returns Optimized context string
   */
  async getOptimizedContext(): Promise<string> {
    this.ensureInitialized()

    const currentSession = this.sessionManager.getCurrentSession()
    if (!currentSession) {
      return ''
    }

    try {
      // Try to get saved summary first
      if (this.currentStorageSession) {
        const summary = await this.storageManager.getSummary(
          this.currentStorageSession.meta.id,
          this.currentStorageSession.meta.projectHash,
        )

        if (summary) {
          this.debug('Using saved summary for context')
          return summary
        }
      }

      // Fall back to generating summary
      this.debug('Generating fresh summary for context')
      return this.sessionManager.generateSessionSummary()
    }
    catch (error) {
      this.debug(`Failed to get optimized context: ${error}`)
      return this.sessionManager.generateSessionSummary()
    }
  }

  /**
   * Get current statistics
   *
   * @returns Context statistics
   */
  getStats(): ContextStats {
    this.ensureInitialized()

    const currentSession = this.sessionManager.getCurrentSession()
    const allSessions = this.sessionManager.getAllSessions()

    return {
      currentTokens: currentSession?.tokenCount || 0,
      compressedTokens: this.compressedTokens,
      compressionRatio: currentSession
        ? this.compressedTokens / (currentSession.tokenCount + this.compressedTokens)
        : 0,
      sessionCount: allSessions.length,
      totalMessages: this.totalMessages,
      lastCompression: this.lastCompressionTime,
      thresholdLevel: this.sessionManager.getThresholdLevel(),
      contextUsage: this.sessionManager.getContextUsage(),
    }
  }

  /**
   * End current session
   *
   * @returns Completed session or null
   */
  async endSession(): Promise<SessionType | null> {
    this.ensureInitialized()

    const currentSession = this.sessionManager.getCurrentSession()
    if (!currentSession) {
      return null
    }

    try {
      this.debug(`Ending session: ${currentSession.id}`)

      // Complete session in session manager
      const completedSession = this.sessionManager.completeSession()

      // Complete session in storage
      if (this.currentStorageSession) {
        await this.storageManager.completeSession(
          this.currentStorageSession.meta.id,
          this.currentStorageSession.meta.projectHash,
        )
      }

      // Emit event
      this.emit('session:end', {
        sessionId: currentSession.id,
        summary: this.sessionManager.generateSessionSummary(),
      })

      // Clear current storage session
      this.currentStorageSession = null

      this.debug('Session ended successfully')

      return completedSession
    }
    catch (error) {
      const errorMsg = `Failed to end session: ${error instanceof Error ? error.message : String(error)}`
      this.emit('error', new Error(errorMsg))
      throw new Error(errorMsg)
    }
  }

  /**
   * Get all sessions for a project
   *
   * @param projectPath - Project path
   * @returns Array of session metadata
   */
  async getProjectSessions(projectPath: string): Promise<SessionMeta[]> {
    this.ensureInitialized()

    try {
      const sessions = await this.storageManager.listSessions({ projectHash: undefined })
      return sessions.filter(s => s.projectPath === projectPath)
    }
    catch (error) {
      this.debug(`Failed to get project sessions: ${error}`)
      return []
    }
  }

  /**
   * Clean up old sessions
   *
   * @param maxAgeDays - Maximum age in days
   * @returns Cleanup result
   */
  async cleanupOldSessions(maxAgeDays: number = 30): Promise<{
    sessionsRemoved: number
    bytesFreed: number
  }> {
    this.ensureInitialized()

    try {
      const maxAge = maxAgeDays * 24 * 60 * 60 * 1000 // Convert to milliseconds
      const result = await this.storageManager.cleanOldSessions(maxAge)

      this.debug(`Cleaned up ${result.sessionsRemoved} sessions, freed ${result.bytesFreed} bytes`)

      return {
        sessionsRemoved: result.sessionsRemoved,
        bytesFreed: result.bytesFreed,
      }
    }
    catch (error) {
      this.debug(`Failed to cleanup sessions: ${error}`)
      return { sessionsRemoved: 0, bytesFreed: 0 }
    }
  }

  /**
   * Update configuration
   *
   * @param updates - Partial configuration updates
   */
  async updateConfig(updates: Partial<ContextManagerOptions>): Promise<void> {
    this.ensureInitialized()

    try {
      // Update local options
      Object.assign(this.options, updates)

      // Update config manager
      if (updates.compressionThreshold !== undefined) {
        const config = await this.configManager.get()
        await this.configManager.update({
          contextThreshold: updates.compressionThreshold * config.maxContextTokens,
        })
      }

      this.debug('Configuration updated')
    }
    catch (error) {
      const errorMsg = `Failed to update config: ${error instanceof Error ? error.message : String(error)}`
      this.emit('error', new Error(errorMsg))
      throw new Error(errorMsg)
    }
  }

  /**
   * Clean up resources
   * Should be called when shutting down
   */
  async cleanup(): Promise<void> {
    try {
      this.debug('Cleaning up Context Manager...')

      // End current session if active
      const currentSession = this.sessionManager.getCurrentSession()
      if (currentSession) {
        await this.endSession()
      }

      // Clear message history
      this.messageHistory = []

      // Remove all event listeners
      this.removeAllListeners()

      this.initialized = false
      this.debug('Context Manager cleaned up')
    }
    catch (error) {
      this.debug(`Cleanup error: ${error}`)
    }
  }

  /**
   * Setup event forwarding from session manager
   */
  private setupEventForwarding(): void {
    // Forward session events
    this.sessionManager.on('session_event', (event: SessionEvent) => {
      this.debug(`Session event: ${event.type}`)

      // Map session events to context events
      const eventMap: Record<SessionEventType, ContextEvent | null> = {
        session_created: 'session:start',
        session_completed: 'session:end',
        threshold_warning: 'threshold:reached',
        threshold_critical: 'threshold:reached',
        fc_summarized: null, // Internal event, don't forward
        session_archived: null, // Internal event, don't forward
      }

      const contextEvent = eventMap[event.type]
      if (contextEvent) {
        this.emit(contextEvent, event.data)
      }
    })
  }

  /**
   * Ensure manager is initialized
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Context Manager not initialized. Call initialize() first.')
    }
  }

  /**
   * Debug logging helper
   */
  private debug(...args: any[]): void {
    if (this.options.debug) {
      console.log('[ContextManager]', ...args)
    }
  }

  /**
   * Get current session (for testing/debugging)
   */
  getCurrentSession(): SessionType | null {
    return this.sessionManager.getCurrentSession()
  }

  /**
   * Get storage manager (for advanced usage)
   */
  getStorageManager(): StorageManager {
    return this.storageManager
  }

  /**
   * Get session manager (for advanced usage)
   */
  getSessionManager(): SessionManager {
    return this.sessionManager
  }

  /**
   * Get summarizer (for advanced usage)
   */
  getSummarizer(): Summarizer {
    return this.summarizer
  }

  /**
   * Get config manager (for advanced usage)
   */
  getConfigManager(): ConfigManager {
    return this.configManager
  }
}

/**
 * Create a new Context Manager instance
 *
 * @param options - Configuration options
 * @returns Context Manager instance
 */
export function createContextManager(options?: ContextManagerOptions): ContextManager {
  return new ContextManager(options)
}

/**
 * Global context manager instance (singleton pattern)
 */
let globalContextManager: ContextManager | null = null

/**
 * Get global context manager instance
 * Creates one if it doesn't exist
 *
 * @param options - Configuration options (only used on first call)
 * @returns Global context manager instance
 */
export function getContextManager(options?: ContextManagerOptions): ContextManager {
  if (!globalContextManager) {
    globalContextManager = new ContextManager(options)
  }
  return globalContextManager
}

/**
 * Reset global context manager
 * Useful for testing
 */
export function resetGlobalContextManager(): void {
  if (globalContextManager) {
    globalContextManager.cleanup().catch(() => {})
    globalContextManager = null
  }
}
