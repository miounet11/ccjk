/**
 * Miaoda Backend Client
 *
 * Full-featured client for the Miaoda API (http://<host>/api/v1)
 * Handles auth, token refresh, response normalization, LLM, subscriptions, etc.
 *
 * @module cloud-client/miaoda-client
 */

import { ofetch } from 'ofetch'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MiaodaClientConfig {
  baseURL: string
  /** Initial access token (optional) */
  accessToken?: string
  /** Refresh token for auto-renewal */
  refreshToken?: string
  /** Called when 401 and refresh fails — clear local auth state */
  onUnauthorized?: () => void
  /** Timeout for normal requests (ms, default 15000) */
  timeout?: number
  /** Timeout for LLM complete requests (ms, default 120000) */
  llmTimeout?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface MiaodaUser {
  id: string
  email: string
  name?: string
  avatar?: string | null
  plan?: 'free' | 'pro' | 'business'
  emailVerified?: boolean
  createdAt?: string
}

export interface ParsedResponse<T> {
  ok: boolean
  data: T | null
  error: string | null
}

export interface QuotaInfo {
  allowed: number
  remaining: number
  limit: number
  resetAt: string
}

export interface LlmCompleteResponse {
  content: string
  model: string
  usage: { promptTokens: number, completionTokens: number, totalTokens: number }
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmOptions {
  maxTokens?: number
  temperature?: number
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void
  onDone?: () => void
  onError?: (err: Error) => void
}

// ---------------------------------------------------------------------------
// Response normalizer — handles all 5 server response formats
// ---------------------------------------------------------------------------

export function parseResponse<T = unknown>(raw: unknown): ParsedResponse<T> {
  if (raw === null || raw === undefined) {
    return { ok: false, data: null, error: 'Empty response' }
  }

  const r = raw as Record<string, unknown>

  // Format 2 / 5: { success: false, error: { message } | string }
  if (r.success === false) {
    const errObj = r.error
    if (errObj && typeof errObj === 'object' && 'message' in errObj) {
      return { ok: false, data: null, error: String((errObj as any).message) }
    }
    const msg = (r.message ?? r.error) as string | undefined
    return { ok: false, data: null, error: msg ?? 'Unknown error' }
  }

  // Format 5 bare error: { error: "..." } with no data/success
  if (typeof r.error === 'string' && !('data' in r) && !('success' in r)) {
    return { ok: false, data: null, error: r.error }
  }

  // Format 1: { success: true, data: {} }
  if (r.success === true && 'data' in r) {
    return { ok: true, data: r.data as T, error: null }
  }

  // Format 3: { data: {} } — no success field
  if ('data' in r && !('success' in r)) {
    return { ok: true, data: r.data as T, error: null }
  }

  // Format 4: bare object
  return { ok: true, data: raw as T, error: null }
}

// ---------------------------------------------------------------------------
// MiaodaClient
// ---------------------------------------------------------------------------

const API = '/api/v1'

export class MiaodaClient {
  private baseURL: string
  private accessToken: string | null
  private refreshToken: string | null
  private onUnauthorized?: () => void
  private timeout: number
  private llmTimeout: number
  private refreshing: Promise<boolean> | null = null

  constructor(config: MiaodaClientConfig) {
    this.baseURL = config.baseURL.replace(/\/+$/, '')
    this.accessToken = config.accessToken ?? null
    this.refreshToken = config.refreshToken ?? null
    this.onUnauthorized = config.onUnauthorized
    this.timeout = config.timeout ?? 15000
    this.llmTimeout = config.llmTimeout ?? 120000
  }

  // -------------------------------------------------------------------------
  // Token management
  // -------------------------------------------------------------------------

  setTokens(tokens: TokenPair): void {
    this.accessToken = tokens.accessToken
    this.refreshToken = tokens.refreshToken
  }

  clearTokens(): void {
    this.accessToken = null
    this.refreshToken = null
  }

  getAccessToken(): string | null {
    return this.accessToken
  }

  /** Attempt to refresh access token. Returns true on success. */
  private async tryRefresh(): Promise<boolean> {
    if (!this.refreshToken)
      return false
    // Deduplicate concurrent refresh calls
    if (this.refreshing)
      return this.refreshing

    this.refreshing = (async () => {
      try {
        const raw = await ofetch(`${this.baseURL}${API}/auth/refresh`, {
          method: 'POST',
          body: { refreshToken: this.refreshToken },
          timeout: this.timeout,
        })
        const res = parseResponse<TokenPair>(raw)
        if (res.ok && res.data) {
          this.accessToken = res.data.accessToken
          if (res.data.refreshToken)
            this.refreshToken = res.data.refreshToken
          return true
        }
        return false
      }
      catch {
        return false
      }
      finally {
        this.refreshing = null
      }
    })()

    return this.refreshing
  }

  // -------------------------------------------------------------------------
  // Core request helper
  // -------------------------------------------------------------------------

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
    if (this.accessToken)
      h.Authorization = `Bearer ${this.accessToken}`
    return h
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: { timeout?: number, query?: Record<string, string | number>, noPrefix?: boolean } = {},
  ): Promise<ParsedResponse<T>> {
    const prefix = opts.noPrefix ? '' : API
    const url = `${this.baseURL}${prefix}${path}`
    const timeout = opts.timeout ?? this.timeout

    const doFetch = async (): Promise<ParsedResponse<T>> => {
      try {
        const raw = await ofetch(url, {
          method,
          headers: this.headers(),
          body: body !== undefined ? body : undefined,
          query: opts.query,
          timeout,
          // Don't throw on non-2xx so we can parse error bodies
          ignoreResponseError: true,
        })
        return parseResponse<T>(raw)
      }
      catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { ok: false, data: null, error: msg }
      }
    }

    let res = await doFetch()

    // Auto-refresh on 401 then retry once
    if (!res.ok && res.error?.includes('401')) {
      const refreshed = await this.tryRefresh()
      if (refreshed) {
        res = await doFetch()
      }
      else {
        this.clearTokens()
        this.onUnauthorized?.()
      }
    }

    return res
  }

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  /** Normalize auth response — server may return { token } or { tokens: { accessToken } } */
  private extractAndSetToken(data: Record<string, unknown>): void {
    if (data.tokens && typeof data.tokens === 'object') {
      const t = data.tokens as Partial<TokenPair>
      if (t.accessToken) {
        this.accessToken = t.accessToken
        this.refreshToken = t.refreshToken ?? null
      }
    }
    else if (typeof data.token === 'string') {
      this.accessToken = data.token
      this.refreshToken = null
    }
  }

  async register(email: string, password: string): Promise<ParsedResponse<{ token?: string, tokens?: TokenPair, user: MiaodaUser }>> {
    const res = await this.request<{ token?: string, tokens?: TokenPair, user: MiaodaUser }>(
      'POST',
      '/auth/register',
      { email, password },
    )
    if (res.ok && res.data)
      this.extractAndSetToken(res.data as Record<string, unknown>)
    return res
  }

  async login(email: string, password: string): Promise<ParsedResponse<{ token?: string, tokens?: TokenPair, user: MiaodaUser }>> {
    const res = await this.request<{ token?: string, tokens?: TokenPair, user: MiaodaUser }>(
      'POST',
      '/auth/login',
      { email, password },
    )
    if (res.ok && res.data)
      this.extractAndSetToken(res.data as Record<string, unknown>)
    return res
  }

  async refreshTokens(token: string): Promise<ParsedResponse<TokenPair>> {
    const res = await this.request<TokenPair>('POST', '/auth/refresh', { refreshToken: token })
    if (res.ok && res.data)
      this.setTokens(res.data)
    return res
  }

  requestPasswordReset(email: string) {
    return this.request('POST', '/auth/request-password-reset', { email })
  }

  resetPassword(token: string, newPassword: string) {
    return this.request('POST', '/auth/reset-password', { token, newPassword })
  }

  verifyEmail(token: string) {
    return this.request('GET', `/auth/verify-email`, undefined, { query: { token } })
  }

  /** OAuth login — redirect to this URL in browser */
  oauthUrl(provider: 'github' | 'google' | 'microsoft'): string {
    return `${this.baseURL}${API}/auth/oauth/${provider}`
  }

  // -------------------------------------------------------------------------
  // User
  // -------------------------------------------------------------------------

  getProfile() {
    return this.request<MiaodaUser>('GET', '/user/profile')
  }

  saveUserConfig(config: Record<string, unknown>) {
    return this.request('POST', '/user/config', config)
  }

  getUserConfig() {
    return this.request<Record<string, unknown>>('GET', '/user/config')
  }

  deleteUserConfig() {
    return this.request('DELETE', '/user/config')
  }

  // -------------------------------------------------------------------------
  // API Keys
  // -------------------------------------------------------------------------

  getApiKeys() {
    return this.request<unknown[]>('GET', '/user/api-keys')
  }

  createApiKey(name: string, scopes: string[], expiresAt?: string) {
    return this.request('POST', '/user/api-keys', { name, scopes, expiresAt })
  }

  deleteApiKey(id: number) {
    return this.request('DELETE', `/user/api-keys/${id}`)
  }

  // -------------------------------------------------------------------------
  // LLM
  // -------------------------------------------------------------------------

  getModels() {
    return this.request<{ plan: string, models: string[] }>('GET', '/llm/models')
  }

  complete(
    model: string,
    messages: LlmMessage[],
    options?: LlmOptions,
  ): Promise<ParsedResponse<LlmCompleteResponse>> {
    return this.request<LlmCompleteResponse>(
      'POST',
      '/llm/complete',
      { model, messages, ...options },
      { timeout: this.llmTimeout },
    )
  }

  /**
   * SSE streaming completion. Returns an AbortController to cancel.
   */
  stream(
    model: string,
    messages: LlmMessage[],
    callbacks: StreamCallbacks,
    options?: LlmOptions,
  ): AbortController {
    const controller = new AbortController()

    ;(async () => {
      try {
        const res = await fetch(`${this.baseURL}${API}/llm/stream`, {
          method: 'POST',
          headers: this.headers({ Accept: 'text/event-stream' }),
          body: JSON.stringify({ model, messages, ...options }),
          signal: controller.signal,
        })

        if (res.status === 401) {
          const refreshed = await this.tryRefresh()
          if (!refreshed) {
            this.clearTokens()
            this.onUnauthorized?.()
            callbacks.onError?.(new Error('Unauthorized'))
            return
          }
          // Retry with new token — recurse
          this.stream(model, messages, callbacks, options)
          return
        }

        if (!res.ok) {
          callbacks.onError?.(new Error(`HTTP ${res.status}`))
          return
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done)
            break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: '))
              continue
            try {
              const json = JSON.parse(line.slice(6))
              if (json.done) { callbacks.onDone?.(); return }
              if (json.error) { callbacks.onError?.(new Error(json.error)); return }
              if (json.chunk)
                callbacks.onChunk(json.chunk)
            }
            catch { /* ignore malformed SSE lines */ }
          }
        }
        callbacks.onDone?.()
      }
      catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          callbacks.onDone?.()
        }
        else {
          callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
        }
      }
    })()

    return controller
  }

  // -------------------------------------------------------------------------
  // Config (public model list)
  // -------------------------------------------------------------------------

  getConfigModels(membership?: 'free' | 'pro' | 'business') {
    return this.request('GET', '/config/models', undefined, {
      query: membership ? { membership } : undefined,
    })
  }

  // -------------------------------------------------------------------------
  // Usage
  // -------------------------------------------------------------------------

  getUsageSummary() {
    return this.request('GET', '/usage/summary')
  }

  getCurrentUsage() {
    return this.request('GET', '/usage/current')
  }

  // -------------------------------------------------------------------------
  // Subscriptions
  // -------------------------------------------------------------------------

  getSubscription() {
    return this.request('GET', '/subscriptions')
  }

  createSubscription(plan: 'pro' | 'business', billingCycle: 'monthly' | 'yearly', paymentMethodId: string) {
    return this.request('POST', '/subscriptions/create', { plan, billingCycle, paymentMethodId })
  }

  cancelSubscription(immediate = false) {
    return this.request('POST', '/subscriptions/cancel', { immediate })
  }

  changePlan(newPlan: 'free' | 'pro' | 'business', newBillingCycle?: 'monthly' | 'yearly') {
    return this.request('POST', '/subscriptions/change-plan', { newPlan, newBillingCycle })
  }

  // -------------------------------------------------------------------------
  // Licenses
  // -------------------------------------------------------------------------

  verifyLicense(licenseKey: string, deviceFingerprint: string) {
    return this.request('POST', '/licenses/verify', { licenseKey, deviceFingerprint })
  }

  getLicense() {
    return this.request('GET', '/licenses')
  }

  getLicenseDevices() {
    return this.request('GET', '/licenses/devices')
  }

  unbindDevice(fingerprint: string) {
    return this.request('DELETE', `/licenses/devices/${encodeURIComponent(fingerprint)}`)
  }

  // -------------------------------------------------------------------------
  // Skills
  // -------------------------------------------------------------------------

  searchSkills(params: { keyword?: string, category?: string, page?: number, limit?: number } = {}) {
    return this.request('GET', '/skills/search', undefined, { query: params as any })
  }

  getSkillDownloadUrl(id: number) {
    return this.request<{ downloadUrl: string }>('GET', `/skills/${id}/download`)
  }

  reviewSkill(id: number, rating: number, comment?: string) {
    return this.request('POST', `/skills/${id}/review`, { rating, comment })
  }

  publishSkill(formData: FormData) {
    // multipart/form-data — use fetch directly (no Content-Type override)
    const headers: Record<string, string> = {}
    if (this.accessToken)
      headers.Authorization = `Bearer ${this.accessToken}`
    return fetch(`${this.baseURL}/skills/publish`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(r => r.json()).then(parseResponse)
  }

  // -------------------------------------------------------------------------
  // Workspaces
  // -------------------------------------------------------------------------

  getWorkspaces() {
    return this.request('GET', '/workspaces')
  }

  createWorkspace(name: string) {
    return this.request('POST', '/workspaces', { name })
  }

  getWorkspace(id: string) {
    return this.request('GET', `/workspaces/${id}`)
  }

  deleteWorkspace(id: string) {
    return this.request('DELETE', `/workspaces/${id}`)
  }

  getWorkspaceMembers(id: string) {
    return this.request('GET', `/workspaces/${id}/members`)
  }

  addWorkspaceMember(id: string, email: string, role: 'member' | 'admin' = 'member') {
    return this.request('POST', `/workspaces/${id}/members`, { email, role })
  }

  removeWorkspaceMember(workspaceId: string, userId: number) {
    return this.request('DELETE', `/workspaces/${workspaceId}/members/${userId}`)
  }

  // -------------------------------------------------------------------------
  // Specs
  // -------------------------------------------------------------------------

  getSpecs() {
    return this.request('GET', '/specs')
  }

  createSpec(title: string, requirements: string, workspaceId?: string) {
    return this.request('POST', '/specs', { title, requirements, workspaceId })
  }

  getSpec(id: string) {
    return this.request('GET', `/specs/${id}`)
  }

  generateSpecDesign(id: string) {
    return this.request('POST', `/specs/${id}/generate-design`)
  }

  generateSpecTasks(id: string) {
    return this.request('POST', `/specs/${id}/generate-tasks`)
  }

  updateSpecTask(specId: string, taskId: string, status: 'pending' | 'in_progress' | 'completed' | 'blocked') {
    return this.request('PATCH', `/specs/${specId}/tasks/${taskId}`, { status })
  }

  // -------------------------------------------------------------------------
  // Webhooks
  // -------------------------------------------------------------------------

  getWebhooks() {
    return this.request('GET', '/webhooks')
  }

  createWebhook(url: string, events: string[]) {
    return this.request('POST', '/webhooks', { url, events })
  }

  deleteWebhook(id: string) {
    return this.request('DELETE', `/webhooks/${id}`)
  }

  // -------------------------------------------------------------------------
  // Analytics
  // -------------------------------------------------------------------------

  getCostBreakdown(start?: string, end?: string) {
    const query: Record<string, string> = {}
    if (start)
      query.start = start
    if (end)
      query.end = end
    return this.request('GET', '/analytics/cost-breakdown', undefined, { query })
  }

  getForecast() {
    return this.request('GET', '/analytics/forecast')
  }

  getDailyUsage(days = 30) {
    return this.request('GET', '/analytics/daily', undefined, { query: { days } })
  }

  getRoutingHistory(limit = 50, offset = 0) {
    return this.request('GET', '/analytics/routing-history', undefined, { query: { limit, offset } })
  }

  // -------------------------------------------------------------------------
  // Storage
  // -------------------------------------------------------------------------

  getStorageStats() { return this.request('GET', '/storage/stats') }
  getStorageMonitor() { return this.request('GET', '/storage/monitor') }
  compressStorage(dryRun = false) { return this.request('POST', '/storage/compress', { dryRun }) }
  cleanupStorage() { return this.request('POST', '/storage/cleanup') }
  getStorageSnapshots() { return this.request('GET', '/storage/snapshots') }
  deleteStorageSnapshot(snapshotId: string) { return this.request('DELETE', `/storage/snapshots/${snapshotId}`) }
  verifyStorageSnapshot(snapshotId: string) { return this.request('POST', `/storage/snapshots/${snapshotId}/verify`) }
  getStorageHistory() { return this.request('GET', '/storage/history') }
  getStorageConfig() { return this.request('GET', '/storage/config') }
  updateStorageConfig(config: Record<string, unknown>) { return this.request('PUT', '/storage/config', config) }

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------

  health() {
    return this.request('GET', '/health', undefined, { noPrefix: true })
  }

  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  adminGetUsers(page = 1, limit = 20) {
    return this.request('GET', '/admin/users', undefined, { query: { page, limit } })
  }

  adminGetUser(id: number) {
    return this.request('GET', `/admin/users/${id}`)
  }

  adminUpdateUser(id: number, data: Record<string, unknown>) {
    return this.request('PUT', `/admin/users/${id}`, data)
  }

  adminDeleteUser(id: number) {
    return this.request('DELETE', `/admin/users/${id}`)
  }

  adminGetStats() {
    return this.request('GET', '/admin/stats')
  }

  adminGetSystemUsage() {
    return this.request('GET', '/admin/usage')
  }

  adminApproveSkill(id: number) {
    return this.request('POST', `/admin/skills/${id}/approve`)
  }

  adminRejectSkill(id: number, reason: string) {
    return this.request('POST', `/admin/skills/${id}/reject`, { reason })
  }

  // -------------------------------------------------------------------------
  // Storage (additional)
  // -------------------------------------------------------------------------

  extractStorageSnapshot(snapshotId: string, targetPath: string) {
    return this.request('POST', `/storage/snapshots/${snapshotId}/extract`, { targetPath })
  }

  getStorageCleanupStats() {
    return this.request('GET', '/storage/cleanup/stats')
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createMiaodaClient(config: MiaodaClientConfig): MiaodaClient {
  return new MiaodaClient(config)
}
