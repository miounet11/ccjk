/**
 * CCJK Context Management Service
 *
 * High-level service for managing conversation context, sessions,
 * and token optimization.
 *
 * @module services/context-service
 */

import type { CloudApiClient } from '../cloud-api/client'
import type {
  AddMessageRequest,
  CompactOptions,
  CompactResult,
  ContentBlock,
  ContextUsageStats,
  CreateSessionRequest,
  ListMessagesParams,
  ListSessionsParams,
  Session,
  SessionListItem,
  SessionMessage,
  SessionSummary,
  UpdateSessionRequest,
} from '../types/context-api'

/**
 * Context service configuration
 */
export interface ContextServiceConfig {
  /** Warning threshold percentage (0-100) */
  warningThreshold?: number
  /** Critical threshold percentage (0-100) */
  criticalThreshold?: number
  /** Auto-compact when reaching critical threshold */
  autoCompact?: boolean
  /** Default compact options */
  defaultCompactOptions?: CompactOptions
  /** Callback when context reaches warning threshold */
  onWarning?: (stats: ContextUsageStats) => void
  /** Callback when context reaches critical threshold */
  onCritical?: (stats: ContextUsageStats) => void
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ContextServiceConfig> = {
  warningThreshold: 70,
  criticalThreshold: 90,
  autoCompact: false,
  defaultCompactOptions: {
    keepLastN: 10,
    preserveDecisions: true,
    preserveCodeChanges: true,
    generateSummary: true,
  },
  onWarning: () => {},
  onCritical: () => {},
}

/**
 * Context management service
 *
 * Provides high-level operations for managing conversation context,
 * including session management, message handling, and token optimization.
 */
export class ContextService {
  private client: CloudApiClient
  private config: Required<ContextServiceConfig>
  private currentSessionId: string | null = null
  private cachedStats: ContextUsageStats | null = null
  private statsLastUpdated: number = 0
  private readonly STATS_CACHE_TTL = 5000 // 5 seconds

  constructor(client: CloudApiClient, config: ContextServiceConfig = {}) {
    this.client = client
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Get the current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId
  }

  /**
   * Set the current session ID
   */
  setCurrentSessionId(sessionId: string | null): void {
    this.currentSessionId = sessionId
    this.invalidateStatsCache()
  }

  /**
   * List all sessions
   */
  async listSessions(params: ListSessionsParams = {}): Promise<SessionListItem[]> {
    const response = await this.client.sessions.list(params)
    return response.data.sessions
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<Session> {
    const response = await this.client.sessions.get(sessionId)
    return response.data.session
  }

  /**
   * Create a new session
   */
  async createSession(request: CreateSessionRequest = {}): Promise<Session> {
    const response = await this.client.sessions.create(request)
    return response.data.session
  }

  /**
   * Update a session
   */
  async updateSession(sessionId: string, request: UpdateSessionRequest): Promise<Session> {
    const response = await this.client.sessions.update(sessionId, request)
    return response.data.session
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.client.sessions.delete(sessionId)
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null
      this.invalidateStatsCache()
    }
  }

  /**
   * Fork a session
   */
  async forkSession(sessionId: string, name?: string): Promise<Session> {
    const response = await this.client.sessions.fork(sessionId, name)
    return response.data.session
  }

  /**
   * Archive a session
   */
  async archiveSession(sessionId: string): Promise<Session> {
    const response = await this.client.sessions.archive(sessionId)
    return response.data.session
  }

  /**
   * Restore an archived session
   */
  async restoreSession(sessionId: string): Promise<Session> {
    const response = await this.client.sessions.restore(sessionId)
    return response.data.session
  }

  // ============================================================================
  // Message Management
  // ============================================================================

  /**
   * List messages in the current session
   */
  async listMessages(params: ListMessagesParams = {}): Promise<SessionMessage[]> {
    this.ensureCurrentSession()
    const response = await this.client.context.listMessages(this.currentSessionId!, params)
    return response.data.messages
  }

  /**
   * Add a message to the current session
   *
   * Automatically checks context usage and triggers warnings/compaction.
   */
  async addMessage(request: AddMessageRequest): Promise<{
    message: SessionMessage
    stats: ContextUsageStats
  }> {
    this.ensureCurrentSession()

    const response = await this.client.context.addMessage(this.currentSessionId!, request)
    const { message, contextStats } = response.data

    // Update cached stats
    this.cachedStats = contextStats
    this.statsLastUpdated = Date.now()

    // Check thresholds
    await this.checkThresholds(contextStats)

    return { message, stats: contextStats }
  }

  /**
   * Add a user message
   */
  async addUserMessage(content: string | ContentBlock[]): Promise<{
    message: SessionMessage
    stats: ContextUsageStats
  }> {
    return this.addMessage({
      type: 'user',
      role: 'user',
      content,
    })
  }

  /**
   * Add an assistant message
   */
  async addAssistantMessage(content: string | ContentBlock[]): Promise<{
    message: SessionMessage
    stats: ContextUsageStats
  }> {
    return this.addMessage({
      type: 'assistant',
      role: 'assistant',
      content,
    })
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    this.ensureCurrentSession()
    await this.client.context.deleteMessage(this.currentSessionId!, messageId)
    this.invalidateStatsCache()
  }

  // ============================================================================
  // Context Statistics
  // ============================================================================

  /**
   * Get context usage statistics
   *
   * Uses caching to reduce API calls.
   */
  async getStats(forceRefresh = false): Promise<ContextUsageStats> {
    this.ensureCurrentSession()

    // Return cached stats if still valid
    if (
      !forceRefresh
      && this.cachedStats
      && Date.now() - this.statsLastUpdated < this.STATS_CACHE_TTL
    ) {
      return this.cachedStats
    }

    const response = await this.client.context.getStats(this.currentSessionId!)
    this.cachedStats = response.data
    this.statsLastUpdated = Date.now()

    return response.data
  }

  /**
   * Estimate tokens for content
   */
  async estimateTokens(content: string | ContentBlock[]): Promise<number> {
    const response = await this.client.context.estimateTokens({ content })
    return response.data.estimatedTokens
  }

  /**
   * Check if context is approaching limits
   */
  async isContextNearLimit(): Promise<{
    warning: boolean
    critical: boolean
    stats: ContextUsageStats
  }> {
    const stats = await this.getStats()
    return {
      warning: stats.usagePercentage >= this.config.warningThreshold,
      critical: stats.usagePercentage >= this.config.criticalThreshold,
      stats,
    }
  }

  // ============================================================================
  // Compression
  // ============================================================================

  /**
   * Compact the current session
   */
  async compact(options?: CompactOptions): Promise<CompactResult['data']> {
    this.ensureCurrentSession()

    const mergedOptions = { ...this.config.defaultCompactOptions, ...options }
    const response = await this.client.context.compact(this.currentSessionId!, mergedOptions)

    // Invalidate stats cache after compaction
    this.invalidateStatsCache()

    return response.data
  }

  /**
   * Auto-compact if needed
   *
   * Returns true if compaction was performed.
   */
  async autoCompactIfNeeded(): Promise<boolean> {
    const { critical } = await this.isContextNearLimit()

    if (critical && this.config.autoCompact) {
      await this.compact()
      return true
    }

    return false
  }

  // ============================================================================
  // Summaries
  // ============================================================================

  /**
   * Get the latest summary for the current session
   */
  async getSummary(): Promise<SessionSummary | null> {
    this.ensureCurrentSession()

    try {
      const response = await this.client.context.getSummary(this.currentSessionId!)
      return response.data.summary
    }
    catch (error: any) {
      if (error.code === 'SUMMARY_NOT_FOUND') {
        return null
      }
      throw error
    }
  }

  /**
   * List all summaries for the current session
   */
  async listSummaries(): Promise<SessionSummary[]> {
    this.ensureCurrentSession()
    const response = await this.client.context.listSummaries(this.currentSessionId!)
    return response.data.summaries
  }

  // ============================================================================
  // Archives
  // ============================================================================

  /**
   * List archives for the current session
   */
  async listArchives(): Promise<{ id: string, messageCount: number, createdAt: string }[]> {
    this.ensureCurrentSession()
    const response = await this.client.context.listArchives(this.currentSessionId!)
    return response.data.archives
  }

  /**
   * Get archive messages
   */
  async getArchiveMessages(archiveId: string): Promise<SessionMessage[]> {
    this.ensureCurrentSession()
    const response = await this.client.context.getArchive(this.currentSessionId!, archiveId)
    return response.data.messages
  }

  // ============================================================================
  // Crash Recovery
  // ============================================================================

  /**
   * Check for crash recovery data
   */
  async checkRecovery(): Promise<{
    available: boolean
    sessionId?: string
    messageCount?: number
  }> {
    this.ensureCurrentSession()
    const response = await this.client.context.checkRecovery(this.currentSessionId!)
    return {
      available: response.data.available,
      sessionId: response.data.recoveryData?.sessionId,
      messageCount: response.data.recoveryData?.messageCount,
    }
  }

  /**
   * Apply crash recovery
   */
  async applyRecovery(): Promise<number> {
    this.ensureCurrentSession()
    const response = await this.client.context.applyRecovery(this.currentSessionId!)
    this.invalidateStatsCache()
    return response.data.messagesRecovered
  }

  /**
   * Dismiss crash recovery
   */
  async dismissRecovery(): Promise<void> {
    this.ensureCurrentSession()
    await this.client.context.dismissRecovery(this.currentSessionId!)
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<ContextServiceConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<ContextServiceConfig> {
    return { ...this.config }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Ensure a current session is set
   */
  private ensureCurrentSession(): void {
    if (!this.currentSessionId) {
      throw new Error('No current session. Call setCurrentSessionId() first.')
    }
  }

  /**
   * Invalidate the stats cache
   */
  private invalidateStatsCache(): void {
    this.cachedStats = null
    this.statsLastUpdated = 0
  }

  /**
   * Check thresholds and trigger callbacks
   */
  private async checkThresholds(stats: ContextUsageStats): Promise<void> {
    if (stats.usagePercentage >= this.config.criticalThreshold) {
      this.config.onCritical(stats)

      if (this.config.autoCompact) {
        await this.compact()
      }
    }
    else if (stats.usagePercentage >= this.config.warningThreshold) {
      this.config.onWarning(stats)
    }
  }
}

/**
 * Create a context service instance
 */
export function createContextService(
  client: CloudApiClient,
  config?: ContextServiceConfig,
): ContextService {
  return new ContextService(client, config)
}
