/**
 * CCJK Cloud API Context Client
 *
 * Handles context management, messages, summaries, and compression.
 *
 * @module cloud-api/context
 */

import type { CloudApiClientConfig } from '../types/cloud-api'
import type {
  AddMessageRequest,
  AddMessageResponse,
  ArchiveDetailResponse,
  ArchiveListResponse,
  CompactOptions,
  CompactResult,
  GetContextStatsResponse,
  GetSummaryResponse,
  ListMessagesParams,
  ListMessagesResponse,
  ListSummariesResponse,
  TokenEstimateRequest,
  TokenEstimateResponse,
} from '../types/context-api'
import { ContextApiError } from '../types/context-api'

/**
 * Context API client
 *
 * Handles messages, summaries, archives, and context statistics.
 */
export class ContextClient {
  private config: Required<CloudApiClientConfig>

  constructor(config: Required<CloudApiClientConfig>) {
    this.config = config
  }

  // ============================================================================
  // Messages
  // ============================================================================

  /**
   * List messages in a session
   *
   * @param sessionId - Session ID
   * @param params - Query parameters
   * @returns List of messages
   */
  async listMessages(sessionId: string, params: ListMessagesParams = {}): Promise<ListMessagesResponse> {
    const queryParams = new URLSearchParams()

    if (params.limit !== undefined)
      queryParams.set('limit', String(params.limit))
    if (params.offset !== undefined)
      queryParams.set('offset', String(params.offset))
    if (params.before)
      queryParams.set('before', params.before)
    if (params.after)
      queryParams.set('after', params.after)
    if (params.role)
      queryParams.set('role', params.role)
    if (params.type)
      queryParams.set('type', params.type)
    if (params.minImportance !== undefined)
      queryParams.set('min_importance', String(params.minImportance))
    if (params.since)
      queryParams.set('since', params.since)

    const query = queryParams.toString()
    const path = `/api/v8/sessions/${sessionId}/messages${query ? `?${query}` : ''}`

    const response = await this.fetch(path)
    return response.json()
  }

  /**
   * Add a message to a session
   *
   * @param sessionId - Session ID
   * @param request - Message data
   * @returns Added message with context stats
   */
  async addMessage(sessionId: string, request: AddMessageRequest): Promise<AddMessageResponse> {
    const response = await this.fetch(`/api/v8/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
    return response.json()
  }

  /**
   * Delete a message from a session
   *
   * @param sessionId - Session ID
   * @param messageId - Message UUID
   * @returns Success status
   */
  async deleteMessage(sessionId: string, messageId: string): Promise<{ success: boolean, message: string }> {
    const response = await this.fetch(`/api/v8/sessions/${sessionId}/messages/${messageId}`, {
      method: 'DELETE',
    })
    return response.json()
  }

  // ============================================================================
  // Summaries
  // ============================================================================

  /**
   * Get the latest summary for a session
   *
   * @param sessionId - Session ID
   * @returns Latest summary
   */
  async getSummary(sessionId: string): Promise<GetSummaryResponse> {
    const response = await this.fetch(`/api/v8/sessions/${sessionId}/summary`)
    return response.json()
  }

  /**
   * List all summaries for a session
   *
   * @param sessionId - Session ID
   * @returns List of summaries
   */
  async listSummaries(sessionId: string): Promise<ListSummariesResponse> {
    const response = await this.fetch(`/api/v8/sessions/${sessionId}/summaries`)
    return response.json()
  }

  /**
   * Get a specific summary by ID
   *
   * @param sessionId - Session ID
   * @param summaryId - Summary ID
   * @returns Summary details
   */
  async getSummaryById(sessionId: string, summaryId: string): Promise<GetSummaryResponse> {
    const response = await this.fetch(`/api/v8/sessions/${sessionId}/summaries/${summaryId}`)
    return response.json()
  }

  // ============================================================================
  // Context Statistics
  // ============================================================================

  /**
   * Get context usage statistics for a session
   *
   * @param sessionId - Session ID
   * @returns Context usage stats
   */
  async getStats(sessionId: string): Promise<GetContextStatsResponse> {
    const response = await this.fetch(`/api/v8/context/stats?session_id=${encodeURIComponent(sessionId)}`)
    return response.json()
  }

  /**
   * Get session-specific statistics
   *
   * @param sessionId - Session ID
   * @returns Session stats
   */
  async getSessionStats(sessionId: string): Promise<GetContextStatsResponse> {
    const response = await this.fetch(`/api/v8/sessions/${sessionId}/stats`)
    return response.json()
  }

  /**
   * Estimate tokens for content
   *
   * @param request - Content to estimate
   * @returns Token estimate
   */
  async estimateTokens(request: TokenEstimateRequest): Promise<TokenEstimateResponse> {
    const response = await this.fetch('/api/v8/context/estimate', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    return response.json()
  }

  // ============================================================================
  // Compression
  // ============================================================================

  /**
   * Compact a session (compress context)
   *
   * @param sessionId - Session ID
   * @param options - Compact options
   * @returns Compact result
   */
  async compact(sessionId: string, options: CompactOptions = {}): Promise<CompactResult> {
    // Convert camelCase to snake_case for backend API
    const body: Record<string, unknown> = {}
    if (options.keepLastN !== undefined)
      body.keep_last_n = options.keepLastN
    if (options.archiveThreshold !== undefined)
      body.archive_threshold = options.archiveThreshold
    if (options.preserveDecisions !== undefined)
      body.preserve_decisions = options.preserveDecisions
    if (options.preserveCodeChanges !== undefined)
      body.preserve_code_changes = options.preserveCodeChanges
    if (options.generateSummary !== undefined)
      body.generate_summary = options.generateSummary

    const response = await this.fetch(`/api/v8/sessions/${sessionId}/compact`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return response.json()
  }

  // ============================================================================
  // Archives
  // ============================================================================

  /**
   * List archives for a session
   *
   * @param sessionId - Session ID
   * @returns List of archives
   */
  async listArchives(sessionId: string): Promise<ArchiveListResponse> {
    const response = await this.fetch(`/api/v8/sessions/${sessionId}/archives`)
    return response.json()
  }

  /**
   * Get archive details with messages
   *
   * @param sessionId - Session ID
   * @param archiveId - Archive ID
   * @returns Archive with messages
   */
  async getArchive(sessionId: string, archiveId: string): Promise<ArchiveDetailResponse> {
    const response = await this.fetch(`/api/v8/sessions/${sessionId}/archives/${archiveId}`)
    return response.json()
  }

  /**
   * Delete an archive
   *
   * @param sessionId - Session ID
   * @param archiveId - Archive ID
   * @returns Success status
   */
  async deleteArchive(sessionId: string, archiveId: string): Promise<{ success: boolean, message: string }> {
    const response = await this.fetch(`/api/v8/sessions/${sessionId}/archives/${archiveId}`, {
      method: 'DELETE',
    })
    return response.json()
  }

  // ============================================================================
  // Auto Save
  // ============================================================================

  /**
   * Trigger auto-save for a session
   *
   * @param sessionId - Session ID
   * @param trigger - Auto-save trigger type
   * @returns Auto-save result
   */
  async triggerAutoSave(
    sessionId: string,
    trigger: 'interval' | 'message_count' | 'exit' | 'manual' = 'manual',
  ): Promise<{
    success: boolean
    data: {
      savedAt: string
      messageCount: number
    }
  }> {
    const response = await this.fetch(`/api/v8/sessions/${sessionId}/auto-save`, {
      method: 'POST',
      body: JSON.stringify({ trigger }),
    })
    return response.json()
  }

  // ============================================================================
  // Crash Recovery
  // ============================================================================

  /**
   * Get unrecovered crash data
   *
   * @returns Recovery data if available
   */
  async getRecoveryData(): Promise<{
    success: boolean
    data: {
      items: Array<{
        id: string
        sessionId: string
        pendingMessages: unknown[]
        contextSnapshot: unknown
        createdAt: string
      }>
    }
  }> {
    const response = await this.fetch('/api/v8/recovery')
    return response.json()
  }

  /**
   * Save crash recovery data
   *
   * @param sessionId - Session ID
   * @param pendingMessages - Messages to save
   * @param contextSnapshot - Context snapshot
   * @returns Save result
   */
  async saveRecoveryData(
    sessionId: string,
    pendingMessages: unknown[],
    contextSnapshot?: unknown,
  ): Promise<{ success: boolean, data: { id: string } }> {
    const response = await this.fetch('/api/v8/recovery/save', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        pending_messages: pendingMessages,
        context_snapshot: contextSnapshot,
      }),
    })
    return response.json()
  }

  /**
   * Mark recovery data as recovered
   *
   * @param recoveryId - Recovery record ID
   * @returns Recovery result
   */
  async markRecovered(recoveryId: string): Promise<{
    success: boolean
    message: string
  }> {
    const response = await this.fetch(`/api/v8/recovery/${recoveryId}/recover`, {
      method: 'POST',
    })
    return response.json()
  }

  /**
   * Cleanup old recovery data
   *
   * @param days - Days to keep (default 7)
   * @returns Cleanup result
   */
  async cleanupRecoveryData(days: number = 7): Promise<{
    success: boolean
    data: { deletedCount: number }
  }> {
    const response = await this.fetch(`/api/v8/recovery/cleanup?days=${days}`, {
      method: 'DELETE',
    })
    return response.json()
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Make request to API
   */
  private async fetch(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    if (!this.config.deviceToken) {
      throw new ContextApiError('Device token is required', 'UNAUTHORIZED')
    }

    const url = `${this.config.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.deviceToken}`,
      ...this.config.headers,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        await this.handleError(response)
      }

      return response
    }
    catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof ContextApiError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ContextApiError('Request timeout', 'TIMEOUT')
      }

      throw new ContextApiError(
        error instanceof Error ? error.message : 'Network error',
        'NETWORK_ERROR',
      )
    }
  }

  /**
   * Handle error response
   */
  private async handleError(response: Response): Promise<never> {
    let message = response.statusText
    let code: string = 'UNKNOWN_ERROR'

    try {
      const body = await response.json()
      if (body.error) {
        message = body.error.message || body.error
        code = body.error.code || code
      }
      else if (body.message) {
        message = body.message
      }
    }
    catch {
      // Use default message
    }

    // Map HTTP status to error code
    if (response.status === 401) {
      code = 'UNAUTHORIZED'
    }
    else if (response.status === 404) {
      if (message.toLowerCase().includes('message')) {
        code = 'MESSAGE_NOT_FOUND'
      }
      else if (message.toLowerCase().includes('archive')) {
        code = 'ARCHIVE_NOT_FOUND'
      }
      else if (message.toLowerCase().includes('summary')) {
        code = 'SUMMARY_NOT_FOUND'
      }
      else {
        code = 'SESSION_NOT_FOUND'
      }
    }

    throw new ContextApiError(message, code as any, response.status)
  }
}
