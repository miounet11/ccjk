import type {
  CloudProvider,
  DownloadResult,
  GitHubGistConfig,
  ItemMetadata,
  RemoteItem,
  UploadResult,
} from './types'
/**
 * GitHub Gist Cloud Storage Adapter
 *
 * Implements cloud storage using GitHub Gists.
 * Supports private and public gists with automatic rate limiting handling.
 *
 * @module cloud-sync/adapters/github-gist-adapter
 */

import { Buffer } from 'node:buffer'
import { CloudAdapter } from './base-adapter'
import { AdapterError } from './types'

/**
 * GitHub Gist API response types
 */
interface GistFile {
  filename: string
  type: string
  language: string | null
  raw_url: string
  size: number
  truncated: boolean
  content?: string
}

interface GistResponse {
  id: string
  url: string
  html_url: string
  files: Record<string, GistFile>
  public: boolean
  created_at: string
  updated_at: string
  description: string | null
  owner?: {
    login: string
  }
}

interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}

/**
 * CCJK metadata stored in gist description
 */
interface CcjkGistMetadata {
  ccjk: true
  key: string
  checksum: string
  metadata?: Record<string, unknown>
}

/**
 * GitHub Gist adapter for cloud storage
 *
 * Uses GitHub Gists as a cloud storage backend.
 * Each item is stored as a separate gist with metadata in the description.
 */
export class GitHubGistAdapter extends CloudAdapter<GitHubGistConfig> {
  readonly provider: CloudProvider = 'github-gist'

  private apiBaseUrl: string = 'https://api.github.com'
  private rateLimitInfo: RateLimitInfo | null = null
  private gistCache: Map<string, string> = new Map() // key -> gist ID

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  async connect(config: GitHubGistConfig): Promise<void> {
    this.config = config

    if (config.apiBaseUrl) {
      this.apiBaseUrl = config.apiBaseUrl.replace(/\/+$/, '')
    }

    // Validate token by fetching user info
    try {
      const response = await this.makeRequest('/user')

      if (!response.ok) {
        if (response.status === 401) {
          throw new AdapterError(
            'Invalid GitHub token',
            'AUTHENTICATION_FAILED',
            this.provider,
          )
        }
        throw new AdapterError(
          `Failed to connect to GitHub: ${response.statusText}`,
          'CONNECTION_FAILED',
          this.provider,
        )
      }

      // Build initial cache of CCJK gists
      await this.buildGistCache()

      this.connected = true
    }
    catch (error) {
      if (error instanceof AdapterError) {
        throw error
      }
      throw new AdapterError(
        `Failed to connect to GitHub: ${error instanceof Error ? error.message : String(error)}`,
        'CONNECTION_FAILED',
        this.provider,
        error instanceof Error ? error : undefined,
      )
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.config = null
    this.gistCache.clear()
    this.rateLimitInfo = null
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  async upload(key: string, data: Buffer, metadata?: Record<string, unknown>): Promise<UploadResult> {
    this.ensureConnected()

    const normalizedKey = this.normalizeKey(key)
    const checksum = this.calculateChecksum(data)
    const content = data.toString('base64')

    // Prepare gist metadata
    const gistMetadata: CcjkGistMetadata = {
      ccjk: true,
      key: normalizedKey,
      checksum,
      metadata,
    }

    const filename = this.keyToFilename(normalizedKey)
    const existingGistId = this.gistCache.get(normalizedKey)

    try {
      let response: Response

      if (existingGistId) {
        // Update existing gist
        response = await this.makeRequest(`/gists/${existingGistId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            description: JSON.stringify(gistMetadata),
            files: {
              [filename]: { content },
            },
          }),
        })
      }
      else {
        // Create new gist
        response = await this.makeRequest('/gists', {
          method: 'POST',
          body: JSON.stringify({
            description: JSON.stringify(gistMetadata),
            public: !(this.config?.isPrivate ?? true),
            files: {
              [filename]: { content },
            },
          }),
        })
      }

      if (!response.ok) {
        throw await this.handleErrorResponse(response)
      }

      const gistResponse = await response.json() as GistResponse
      const gist = gistResponse

      // Update cache
      this.gistCache.set(normalizedKey, gist.id)

      this.reportProgress('upload', normalizedKey, data.length, data.length)

      return {
        success: true,
        key: normalizedKey,
        size: data.length,
        checksum,
        uploadedAt: gist.updated_at,
        providerMetadata: {
          gistId: gist.id,
          htmlUrl: gist.html_url,
        },
      }
    }
    catch (error) {
      if (error instanceof AdapterError) {
        throw error
      }
      return {
        success: false,
        key: normalizedKey,
        size: 0,
        checksum: '',
        uploadedAt: this.getCurrentTimestamp(),
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async download(key: string): Promise<DownloadResult> {
    this.ensureConnected()

    const normalizedKey = this.normalizeKey(key)
    const gistId = this.gistCache.get(normalizedKey)

    if (!gistId) {
      throw new AdapterError(
        `Item not found: ${normalizedKey}`,
        'NOT_FOUND',
        this.provider,
      )
    }

    try {
      const response = await this.makeRequest(`/gists/${gistId}`)

      if (!response.ok) {
        throw await this.handleErrorResponse(response)
      }

      const gist = await response.json() as GistResponse
      const filename = this.keyToFilename(normalizedKey)
      const file = gist.files[filename]

      if (!file) {
        throw new AdapterError(
          `File not found in gist: ${filename}`,
          'NOT_FOUND',
          this.provider,
        )
      }

      // Get content - may need to fetch from raw_url if truncated
      let content: string
      if (file.truncated && file.raw_url) {
        const rawResponse = await this.fetchWithTimeout(file.raw_url, {
          headers: {
            Authorization: `Bearer ${this.config!.token}`,
          },
        })
        content = await rawResponse.text()
      }
      else {
        content = file.content || ''
      }

      const data = Buffer.from(content, 'base64')
      const checksum = this.calculateChecksum(data)

      this.reportProgress('download', normalizedKey, data.length, data.length)

      // Parse metadata from description
      let gistMetadata: CcjkGistMetadata | undefined
      try {
        if (gist.description) {
          gistMetadata = JSON.parse(gist.description) as CcjkGistMetadata
        }
      }
      catch {
        // Ignore parse errors
      }

      return {
        success: true,
        data,
        size: data.length,
        checksum,
        lastModified: gist.updated_at,
        metadata: {
          contentType: file.type,
          custom: gistMetadata?.metadata,
          createdAt: gist.created_at,
          updatedAt: gist.updated_at,
        },
      }
    }
    catch (error) {
      if (error instanceof AdapterError) {
        throw error
      }
      return {
        success: false,
        data: Buffer.alloc(0),
        size: 0,
        checksum: '',
        lastModified: this.getCurrentTimestamp(),
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async delete(key: string): Promise<void> {
    this.ensureConnected()

    const normalizedKey = this.normalizeKey(key)
    const gistId = this.gistCache.get(normalizedKey)

    if (!gistId) {
      throw new AdapterError(
        `Item not found: ${normalizedKey}`,
        'NOT_FOUND',
        this.provider,
      )
    }

    const response = await this.makeRequest(`/gists/${gistId}`, {
      method: 'DELETE',
    })

    if (!response.ok && response.status !== 204) {
      throw await this.handleErrorResponse(response)
    }

    this.gistCache.delete(normalizedKey)
  }

  async list(prefix?: string): Promise<RemoteItem[]> {
    this.ensureConnected()

    const items: RemoteItem[] = []
    const normalizedPrefix = prefix ? this.normalizeKey(prefix) : ''

    for (const [key, gistId] of this.gistCache.entries()) {
      if (!normalizedPrefix || key.startsWith(normalizedPrefix)) {
        try {
          const response = await this.makeRequest(`/gists/${gistId}`)

          if (response.ok) {
            const gist = await response.json() as GistResponse
            const filename = this.keyToFilename(key)
            const file = gist.files[filename]

            if (file) {
              let gistMetadata: CcjkGistMetadata | undefined
              try {
                if (gist.description) {
                  gistMetadata = JSON.parse(gist.description) as CcjkGistMetadata
                }
              }
              catch {
                // Ignore parse errors
              }

              items.push({
                key,
                name: filename,
                size: file.size,
                isDirectory: false,
                lastModified: gist.updated_at,
                checksum: gistMetadata?.checksum,
                metadata: {
                  contentType: file.type,
                  custom: gistMetadata?.metadata,
                  createdAt: gist.created_at,
                  updatedAt: gist.updated_at,
                },
              })
            }
          }
        }
        catch {
          // Skip items that fail to fetch
        }
      }
    }

    return items
  }

  async getMetadata(key: string): Promise<ItemMetadata> {
    this.ensureConnected()

    const normalizedKey = this.normalizeKey(key)
    const gistId = this.gistCache.get(normalizedKey)

    if (!gistId) {
      throw new AdapterError(
        `Item not found: ${normalizedKey}`,
        'NOT_FOUND',
        this.provider,
      )
    }

    const response = await this.makeRequest(`/gists/${gistId}`)

    if (!response.ok) {
      throw await this.handleErrorResponse(response)
    }

    const gist = await response.json() as GistResponse
    const filename = this.keyToFilename(normalizedKey)
    const file = gist.files[filename]

    if (!file) {
      throw new AdapterError(
        `File not found in gist: ${filename}`,
        'NOT_FOUND',
        this.provider,
      )
    }

    let gistMetadata: CcjkGistMetadata | undefined
    try {
      if (gist.description) {
        gistMetadata = JSON.parse(gist.description) as CcjkGistMetadata
      }
    }
    catch {
      // Ignore parse errors
    }

    return {
      contentType: file.type,
      custom: gistMetadata?.metadata,
      createdAt: gist.created_at,
      updatedAt: gist.updated_at,
      etag: gistMetadata?.checksum,
    }
  }

  // ===========================================================================
  // Rate Limiting
  // ===========================================================================

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo
  }

  /**
   * Check if rate limited and wait if necessary
   */
  private async checkRateLimit(): Promise<void> {
    if (this.rateLimitInfo && this.rateLimitInfo.remaining === 0) {
      const now = Date.now() / 1000
      const waitTime = (this.rateLimitInfo.reset - now) * 1000

      if (waitTime > 0) {
        throw new AdapterError(
          `Rate limited. Reset in ${Math.ceil(waitTime / 1000)} seconds`,
          'RATE_LIMITED',
          this.provider,
        )
      }
    }
  }

  /**
   * Update rate limit info from response headers
   */
  private updateRateLimitInfo(response: Response): void {
    const limit = response.headers.get('x-ratelimit-limit')
    const remaining = response.headers.get('x-ratelimit-remaining')
    const reset = response.headers.get('x-ratelimit-reset')

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: Number.parseInt(limit, 10),
        remaining: Number.parseInt(remaining, 10),
        reset: Number.parseInt(reset, 10),
      }
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Make authenticated request to GitHub API
   */
  private async makeRequest(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    await this.checkRateLimit()

    const url = this.apiBaseUrl + path
    const response = await this.fetchWithTimeout(url, {
      ...options,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${this.config!.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    this.updateRateLimitInfo(response)

    return response
  }

  /**
   * Build cache of CCJK gists
   */
  private async buildGistCache(): Promise<void> {
    this.gistCache.clear()

    let page = 1
    const perPage = 100

    while (true) {
      const response = await this.makeRequest(
        `/gists?per_page=${perPage}&page=${page}`,
      )

      if (!response.ok) {
        break
      }

      const gists = await response.json() as GistResponse[]

      if (gists.length === 0) {
        break
      }

      for (const gist of gists) {
        try {
          if (gist.description) {
            const metadata = JSON.parse(gist.description) as CcjkGistMetadata
            if (metadata.ccjk && metadata.key) {
              this.gistCache.set(metadata.key, gist.id)
            }
          }
        }
        catch {
          // Not a CCJK gist, skip
        }
      }

      if (gists.length < perPage) {
        break
      }

      page++
    }
  }

  /**
   * Convert key to valid gist filename
   */
  private keyToFilename(key: string): string {
    // Replace path separators with underscores and add extension
    return `${key.replace(/\//g, '_')}.b64`
  }

  /**
   * Handle error response from GitHub API
   */
  private async handleErrorResponse(response: Response): Promise<AdapterError> {
    let message = response.statusText
    try {
      const body = await response.json() as { message?: string }
      if (body.message) {
        message = body.message
      }
    }
    catch {
      // Ignore parse errors
    }

    switch (response.status) {
      case 401:
        return new AdapterError(message, 'AUTHENTICATION_FAILED', this.provider)
      case 403:
        if (this.rateLimitInfo?.remaining === 0) {
          return new AdapterError(message, 'RATE_LIMITED', this.provider)
        }
        return new AdapterError(message, 'PERMISSION_DENIED', this.provider)
      case 404:
        return new AdapterError(message, 'NOT_FOUND', this.provider)
      case 422:
        return new AdapterError(message, 'INVALID_CONFIG', this.provider)
      default:
        return new AdapterError(message, 'UNKNOWN_ERROR', this.provider)
    }
  }
}
