/**
 * CCJK Cloud API Sessions Client
 *
 * Handles session management API endpoints.
 *
 * @module cloud-api/sessions
 */

import type { CloudApiClientConfig } from '../types/cloud-api'
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  DeleteSessionResponse,
  GetSessionResponse,
  ListSessionsParams,
  ListSessionsResponse,
  UpdateSessionRequest,
  UpdateSessionResponse,
} from '../types/context-api'
import { ContextApiError } from '../types/context-api'

/**
 * Sessions API client
 */
export class SessionsClient {
  private config: Required<CloudApiClientConfig>

  constructor(config: Required<CloudApiClientConfig>) {
    this.config = config
  }

  /**
   * List all sessions
   *
   * @param params - Query parameters for filtering and pagination
   * @returns List of sessions
   */
  async list(params: ListSessionsParams = {}): Promise<ListSessionsResponse> {
    const queryParams = new URLSearchParams()

    if (params.status)
      queryParams.set('status', params.status)
    if (params.sortBy)
      queryParams.set('sortBy', params.sortBy)
    if (params.order)
      queryParams.set('order', params.order)
    if (params.limit !== undefined)
      queryParams.set('limit', String(params.limit))
    if (params.offset !== undefined)
      queryParams.set('offset', String(params.offset))
    if (params.search)
      queryParams.set('search', params.search)
    if (params.tags?.length)
      queryParams.set('tags', params.tags.join(','))
    if (params.gitBranch)
      queryParams.set('gitBranch', params.gitBranch)

    const query = queryParams.toString()
    const path = `/api/sessions${query ? `?${query}` : ''}`

    const response = await this.fetch(path)
    return response.json() as Promise<ListSessionsResponse>
  }

  /**
   * Get a session by ID
   *
   * @param sessionId - Session ID
   * @returns Session details
   */
  async get(sessionId: string): Promise<GetSessionResponse> {
    const response = await this.fetch(`/api/sessions/${sessionId}`)
    return response.json() as Promise<GetSessionResponse>
  }

  /**
   * Create a new session
   *
   * @param request - Session creation data
   * @returns Created session
   */
  async create(request: CreateSessionRequest): Promise<CreateSessionResponse> {
    const response = await this.fetch('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    return response.json() as Promise<CreateSessionResponse>
  }

  /**
   * Update a session
   *
   * @param sessionId - Session ID
   * @param request - Update data
   * @returns Updated session
   */
  async update(sessionId: string, request: UpdateSessionRequest): Promise<UpdateSessionResponse> {
    const response = await this.fetch(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    })
    return response.json() as Promise<UpdateSessionResponse>
  }

  /**
   * Delete a session
   *
   * @param sessionId - Session ID
   * @returns Delete confirmation
   */
  async delete(sessionId: string): Promise<DeleteSessionResponse> {
    const response = await this.fetch(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
    })
    return response.json() as Promise<DeleteSessionResponse>
  }

  /**
   * Fork a session
   *
   * @param sessionId - Session ID to fork from
   * @param name - Optional name for the forked session
   * @returns Created forked session
   */
  async fork(sessionId: string, name?: string): Promise<CreateSessionResponse> {
    const response = await this.fetch(`/api/sessions/${sessionId}/fork`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    return response.json() as Promise<CreateSessionResponse>
  }

  /**
   * Archive a session
   *
   * @param sessionId - Session ID
   * @returns Updated session
   */
  async archive(sessionId: string): Promise<UpdateSessionResponse> {
    return this.update(sessionId, { status: 'archived' })
  }

  /**
   * Restore an archived session
   *
   * @param sessionId - Session ID
   * @returns Updated session
   */
  async restore(sessionId: string): Promise<UpdateSessionResponse> {
    return this.update(sessionId, { status: 'active' })
  }

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
      const body = await response.json() as any
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
      code = 'SESSION_NOT_FOUND'
    }

    throw new ContextApiError(message, code as any, response.status)
  }
}
