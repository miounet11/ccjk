import type {
  CloudProvider,
  DownloadResult,
  ItemMetadata,
  RemoteItem,
  UploadResult,
  WebDAVConfig,
} from './types'
/**
 * WebDAV Cloud Storage Adapter
 *
 * Implements cloud storage using WebDAV protocol.
 * Compatible with Nextcloud, ownCloud, Jianguoyun (Nutstore), and other WebDAV servers.
 *
 * @module cloud-sync/adapters/webdav-adapter
 */

import { Buffer } from 'node:buffer'
import { CloudAdapter } from './base-adapter'
import { AdapterError } from './types'

/**
 * WebDAV XML namespace
 * Currently unused but reserved for future XML parsing enhancements
 */
// const DAV_NS = 'DAV:'

/**
 * WebDAV adapter for cloud storage
 *
 * Uses standard WebDAV protocol for cloud storage operations.
 * Supports basic authentication and common WebDAV servers.
 */
export class WebDAVAdapter extends CloudAdapter<WebDAVConfig> {
  readonly provider: CloudProvider = 'webdav'

  private serverUrl: string = ''
  private basePath: string = ''
  private authHeader: string = ''

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  async connect(config: WebDAVConfig): Promise<void> {
    this.config = config
    this.serverUrl = config.serverUrl.replace(/\/+$/, '')
    this.basePath = config.basePath ? `/${config.basePath.replace(/^\/+|\/+$/g, '')}` : ''

    // Create basic auth header
    const credentials = `${config.username}:${config.password}`
    this.authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`

    // Test connection with PROPFIND on root
    try {
      const response = await this.makeRequest(this.basePath || '/', {
        method: 'PROPFIND',
        headers: {
          Depth: '0',
        },
      })

      if (!response.ok && response.status !== 207) {
        if (response.status === 401) {
          throw new AdapterError(
            'Invalid WebDAV credentials',
            'AUTHENTICATION_FAILED',
            this.provider,
          )
        }
        throw new AdapterError(
          `Failed to connect to WebDAV server: ${response.statusText}`,
          'CONNECTION_FAILED',
          this.provider,
        )
      }

      // Ensure base directory exists
      if (this.basePath) {
        await this.ensureDirectory(this.basePath)
      }

      this.connected = true
    }
    catch (error) {
      if (error instanceof AdapterError) {
        throw error
      }
      throw new AdapterError(
        `Failed to connect to WebDAV server: ${error instanceof Error ? error.message : String(error)}`,
        'CONNECTION_FAILED',
        this.provider,
        error instanceof Error ? error : undefined,
      )
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.config = null
    this.serverUrl = ''
    this.basePath = ''
    this.authHeader = ''
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  async upload(key: string, data: Buffer, metadata?: Record<string, unknown>): Promise<UploadResult> {
    this.ensureConnected()

    const normalizedKey = this.normalizeKey(key)
    const remotePath = this.getRemotePath(normalizedKey)
    const checksum = this.calculateChecksum(data)

    try {
      // Ensure parent directories exist
      const parentPath = remotePath.substring(0, remotePath.lastIndexOf('/'))
      if (parentPath) {
        await this.ensureDirectory(parentPath)
      }

      // Upload file
      const response = await this.makeRequest(remotePath, {
        method: 'PUT',
        body: data,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(data.length),
        },
      })

      if (!response.ok && response.status !== 201 && response.status !== 204) {
        throw await this.handleErrorResponse(response)
      }

      this.reportProgress('upload', normalizedKey, data.length, data.length)

      // Store metadata as a separate .meta file if provided
      if (metadata && Object.keys(metadata).length > 0) {
        const metaPath = `${remotePath}.meta`
        const metaData = Buffer.from(JSON.stringify({ checksum, ...metadata }))
        await this.makeRequest(metaPath, {
          method: 'PUT',
          body: metaData,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      }

      return {
        success: true,
        key: normalizedKey,
        size: data.length,
        checksum,
        uploadedAt: this.getCurrentTimestamp(),
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
    const remotePath = this.getRemotePath(normalizedKey)

    try {
      const response = await this.makeRequest(remotePath, {
        method: 'GET',
      })

      if (!response.ok) {
        throw await this.handleErrorResponse(response)
      }

      const arrayBuffer = await response.arrayBuffer()
      const data = Buffer.from(arrayBuffer)
      const checksum = this.calculateChecksum(data)

      this.reportProgress('download', normalizedKey, data.length, data.length)

      // Try to get metadata
      let metadata: ItemMetadata = {}
      try {
        const metaResponse = await this.makeRequest(`${remotePath}.meta`, {
          method: 'GET',
        })
        if (metaResponse.ok) {
          const metaText = await metaResponse.text()
          const metaJson = JSON.parse(metaText)
          metadata = {
            custom: metaJson,
            etag: metaJson.checksum,
          }
        }
      }
      catch {
        // Metadata file doesn't exist, that's fine
      }

      // Get last modified from PROPFIND
      const propResponse = await this.makeRequest(remotePath, {
        method: 'PROPFIND',
        headers: { Depth: '0' },
      })

      let lastModified = this.getCurrentTimestamp()
      if (propResponse.ok || propResponse.status === 207) {
        const propText = await propResponse.text()
        const lastModMatch = propText.match(/<d:getlastmodified>([^<]+)<\/d:getlastmodified>/i)
          || propText.match(/<getlastmodified[^>]*>([^<]+)<\/getlastmodified>/i)
        if (lastModMatch) {
          lastModified = new Date(lastModMatch[1]).toISOString()
        }
      }

      return {
        success: true,
        data,
        size: data.length,
        checksum,
        lastModified,
        metadata,
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
    const remotePath = this.getRemotePath(normalizedKey)

    const response = await this.makeRequest(remotePath, {
      method: 'DELETE',
    })

    if (!response.ok && response.status !== 204 && response.status !== 404) {
      throw await this.handleErrorResponse(response)
    }

    // Also try to delete metadata file
    try {
      await this.makeRequest(`${remotePath}.meta`, {
        method: 'DELETE',
      })
    }
    catch {
      // Ignore errors deleting metadata
    }
  }

  async list(prefix?: string): Promise<RemoteItem[]> {
    this.ensureConnected()

    const normalizedPrefix = prefix ? this.normalizeKey(prefix) : ''
    const remotePath = this.getRemotePath(normalizedPrefix) || this.basePath || '/'

    try {
      const response = await this.makeRequest(remotePath, {
        method: 'PROPFIND',
        headers: {
          Depth: '1',
        },
        body: this.buildPropfindBody(),
      })

      if (!response.ok && response.status !== 207) {
        if (response.status === 404) {
          return []
        }
        throw await this.handleErrorResponse(response)
      }

      const text = await response.text()
      return this.parsePropfindResponse(text, normalizedPrefix)
    }
    catch (error) {
      if (error instanceof AdapterError && error.code === 'NOT_FOUND') {
        return []
      }
      throw error
    }
  }

  async getMetadata(key: string): Promise<ItemMetadata> {
    this.ensureConnected()

    const normalizedKey = this.normalizeKey(key)
    const remotePath = this.getRemotePath(normalizedKey)

    const response = await this.makeRequest(remotePath, {
      method: 'PROPFIND',
      headers: {
        Depth: '0',
      },
      body: this.buildPropfindBody(),
    })

    if (!response.ok && response.status !== 207) {
      throw await this.handleErrorResponse(response)
    }

    const text = await response.text()
    const items = this.parsePropfindResponse(text, '')

    if (items.length === 0) {
      throw new AdapterError(
        `Item not found: ${normalizedKey}`,
        'NOT_FOUND',
        this.provider,
      )
    }

    return items[0].metadata || {}
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Make authenticated request to WebDAV server
   */
  private async makeRequest(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const url = this.serverUrl + path
    return this.fetchWithTimeout(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        ...options.headers,
      },
    })
  }

  /**
   * Get full remote path for a key
   */
  private getRemotePath(key: string): string {
    if (!key) {
      return this.basePath
    }
    return `${this.basePath}/${key}`
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  private async ensureDirectory(path: string): Promise<void> {
    const parts = path.split('/').filter(Boolean)
    let currentPath = ''

    for (const part of parts) {
      currentPath += `/${part}`

      // Check if directory exists
      const checkResponse = await this.makeRequest(currentPath, {
        method: 'PROPFIND',
        headers: { Depth: '0' },
      })

      if (checkResponse.status === 404) {
        // Create directory
        const mkcolResponse = await this.makeRequest(currentPath, {
          method: 'MKCOL',
        })

        if (!mkcolResponse.ok && mkcolResponse.status !== 201) {
          // Directory might have been created by another process
          if (mkcolResponse.status !== 405) {
            throw new AdapterError(
              `Failed to create directory: ${currentPath}`,
              'PERMISSION_DENIED',
              this.provider,
            )
          }
        }
      }
    }
  }

  /**
   * Build PROPFIND request body
   */
  private buildPropfindBody(): string {
    return '<?xml version="1.0" encoding="utf-8"?>'
      + '<d:propfind xmlns:d="DAV:">'
      + '<d:prop>'
      + '<d:displayname/>'
      + '<d:getcontentlength/>'
      + '<d:getcontenttype/>'
      + '<d:getlastmodified/>'
      + '<d:getetag/>'
      + '<d:resourcetype/>'
      + '</d:prop>'
      + '</d:propfind>'
  }

  /**
   * Parse PROPFIND response XML
   */
  private parsePropfindResponse(xml: string, prefix: string): RemoteItem[] {
    const items: RemoteItem[] = []

    // Simple regex-based XML parsing (avoiding external dependencies)
    const responseRegex = /<d:response[^>]*>([\s\S]*?)<\/d:response>/gi
    let match: RegExpExecArray | null = responseRegex.exec(xml)

    while (match !== null) {
      const responseXml = match[1]

      // Extract href
      const hrefMatch = responseXml.match(/<d:href[^>]*>([^<]+)<\/d:href>/i)
      if (!hrefMatch) {
        match = responseRegex.exec(xml)
        continue
      }

      const href = decodeURIComponent(hrefMatch[1])

      // Skip if it's a .meta file
      if (href.endsWith('.meta')) {
        match = responseRegex.exec(xml)
        continue
      }

      // Extract properties
      const isCollection = /<d:resourcetype[^>]*>[\s\S]*<d:collection/i.test(responseXml)

      const displayNameMatch = responseXml.match(/<d:displayname[^>]*>([^<]*)<\/d:displayname>/i)
      const sizeMatch = responseXml.match(/<d:getcontentlength[^>]*>([^<]*)<\/d:getcontentlength>/i)
      const contentTypeMatch = responseXml.match(/<d:getcontenttype[^>]*>([^<]*)<\/d:getcontenttype>/i)
      const lastModMatch = responseXml.match(/<d:getlastmodified[^>]*>([^<]*)<\/d:getlastmodified>/i)
      const etagMatch = responseXml.match(/<d:getetag[^>]*>([^<]*)<\/d:getetag>/i)

      // Calculate key from href
      let key = href
      if (this.basePath && key.startsWith(this.basePath)) {
        key = key.substring(this.basePath.length)
      }
      key = key.replace(/^\/+|\/+$/g, '')

      // Skip the root directory itself
      if (!key) {
        match = responseRegex.exec(xml)
        continue
      }

      // Skip if doesn't match prefix
      if (prefix && !key.startsWith(prefix)) {
        match = responseRegex.exec(xml)
        continue
      }

      const name = displayNameMatch ? displayNameMatch[1] : key.split('/').pop() || key

      items.push({
        key,
        name,
        size: sizeMatch ? Number.parseInt(sizeMatch[1], 10) : 0,
        isDirectory: isCollection,
        lastModified: lastModMatch ? new Date(lastModMatch[1]).toISOString() : this.getCurrentTimestamp(),
        metadata: {
          contentType: contentTypeMatch ? contentTypeMatch[1] : undefined,
          etag: etagMatch ? etagMatch[1].replace(/"/g, '') : undefined,
        },
      })

      match = responseRegex.exec(xml)
    }

    return items
  }

  /**
   * Handle error response from WebDAV server
   */
  private async handleErrorResponse(response: Response): Promise<AdapterError> {
    const message = response.statusText || 'Unknown error'

    switch (response.status) {
      case 401:
        return new AdapterError(message, 'AUTHENTICATION_FAILED', this.provider)
      case 403:
        return new AdapterError(message, 'PERMISSION_DENIED', this.provider)
      case 404:
        return new AdapterError(message, 'NOT_FOUND', this.provider)
      case 507:
        return new AdapterError(message, 'QUOTA_EXCEEDED', this.provider)
      default:
        return new AdapterError(message, 'UNKNOWN_ERROR', this.provider)
    }
  }
}
