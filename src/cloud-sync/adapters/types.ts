import type { Buffer } from 'node:buffer'
/**
 * Cloud Storage Adapter Type Definitions
 *
 * Defines types for cloud storage adapters supporting multiple providers.
 *
 * @module cloud-sync/adapters/types
 */

/**
 * Supported cloud storage providers
 */
export type CloudProvider = 'github-gist' | 'webdav' | 'local'

/**
 * Base provider configuration
 */
export interface BaseProviderConfig {
  /** Provider type */
  provider: CloudProvider
  /** Connection timeout in milliseconds */
  timeout?: number
  /** Maximum retry attempts */
  maxRetries?: number
}

/**
 * GitHub Gist provider configuration
 */
export interface GitHubGistConfig extends BaseProviderConfig {
  provider: 'github-gist'
  /** GitHub personal access token */
  token: string
  /** Whether to create private gists (default: true) */
  isPrivate?: boolean
  /** GitHub API base URL (for enterprise) */
  apiBaseUrl?: string
}

/**
 * WebDAV provider configuration
 */
export interface WebDAVConfig extends BaseProviderConfig {
  provider: 'webdav'
  /** WebDAV server URL */
  serverUrl: string
  /** Username for authentication */
  username: string
  /** Password for authentication */
  password: string
  /** Base path on the server */
  basePath?: string
}

/**
 * Local file system provider configuration
 */
export interface LocalConfig extends BaseProviderConfig {
  provider: 'local'
  /** Base directory for storage */
  baseDir: string
}

/**
 * Union type for all provider configurations
 */
export type ProviderConfig = GitHubGistConfig | WebDAVConfig | LocalConfig

/**
 * Upload operation result
 */
export interface UploadResult {
  /** Whether upload succeeded */
  success: boolean
  /** Remote key/path of the uploaded item */
  key: string
  /** Size in bytes */
  size: number
  /** Content checksum (SHA-256) */
  checksum: string
  /** Upload timestamp (ISO 8601) */
  uploadedAt: string
  /** Provider-specific metadata */
  providerMetadata?: Record<string, unknown>
  /** Error message if failed */
  error?: string
}

/**
 * Download operation result
 */
export interface DownloadResult {
  /** Whether download succeeded */
  success: boolean
  /** Downloaded data */
  data: Buffer
  /** Size in bytes */
  size: number
  /** Content checksum (SHA-256) */
  checksum: string
  /** Last modified timestamp (ISO 8601) */
  lastModified: string
  /** Item metadata */
  metadata?: ItemMetadata
  /** Error message if failed */
  error?: string
}

/**
 * Remote item information
 */
export interface RemoteItem {
  /** Item key/path */
  key: string
  /** Item name */
  name: string
  /** Size in bytes */
  size: number
  /** Whether item is a directory */
  isDirectory: boolean
  /** Last modified timestamp (ISO 8601) */
  lastModified: string
  /** Content checksum (if available) */
  checksum?: string
  /** Item metadata */
  metadata?: ItemMetadata
}

/**
 * Item metadata
 */
export interface ItemMetadata {
  /** Content type/MIME type */
  contentType?: string
  /** Custom metadata */
  custom?: Record<string, unknown>
  /** Creation timestamp (ISO 8601) */
  createdAt?: string
  /** Last modified timestamp (ISO 8601) */
  updatedAt?: string
  /** ETag for caching */
  etag?: string
}

/**
 * Progress callback for upload/download operations
 */
export type ProgressCallback = (progress: ProgressInfo) => void

/**
 * Progress information
 */
export interface ProgressInfo {
  /** Operation type */
  operation: 'upload' | 'download'
  /** Item key/path */
  key: string
  /** Bytes transferred */
  bytesTransferred: number
  /** Total bytes (if known) */
  totalBytes?: number
  /** Progress percentage (0-100) */
  percentage?: number
}

/**
 * Adapter error types
 */
export type AdapterErrorCode
  = | 'CONNECTION_FAILED'
    | 'AUTHENTICATION_FAILED'
    | 'NOT_FOUND'
    | 'PERMISSION_DENIED'
    | 'RATE_LIMITED'
    | 'QUOTA_EXCEEDED'
    | 'NETWORK_ERROR'
    | 'TIMEOUT'
    | 'INVALID_CONFIG'
    | 'UNKNOWN_ERROR'

/**
 * Adapter error class
 */
export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly code: AdapterErrorCode,
    public readonly provider: CloudProvider,
    public readonly cause?: Error,
  ) {
    super(message)
    this.name = 'AdapterError'
  }
}
