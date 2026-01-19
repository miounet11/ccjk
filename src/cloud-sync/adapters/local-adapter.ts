import type {
  CloudProvider,
  DownloadResult,
  ItemMetadata,
  LocalConfig,
  RemoteItem,
  UploadResult,
} from './types'
/**
 * Local File System Cloud Storage Adapter
 *
 * Implements cloud storage interface using local file system.
 * Useful for testing, offline mode, and local backups.
 *
 * @module cloud-sync/adapters/local-adapter
 */

import { Buffer } from 'node:buffer'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'pathe'
import { CloudAdapter } from './base-adapter'
import { AdapterError } from './types'

/**
 * Metadata file extension
 */
const META_EXTENSION = '.ccjk-meta.json'

/**
 * Local metadata structure
 */
interface LocalMetadata {
  checksum: string
  contentType?: string
  createdAt: string
  updatedAt: string
  custom?: Record<string, unknown>
}

/**
 * Local file system adapter for cloud storage
 *
 * Simulates cloud storage behavior using the local file system.
 * Stores files and metadata in a specified base directory.
 */
export class LocalAdapter extends CloudAdapter<LocalConfig> {
  readonly provider: CloudProvider = 'local'

  private baseDir: string = ''

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  async connect(config: LocalConfig): Promise<void> {
    this.config = config
    this.baseDir = config.baseDir

    try {
      // Ensure base directory exists
      if (!existsSync(this.baseDir)) {
        mkdirSync(this.baseDir, { recursive: true })
      }

      // Verify we can write to the directory
      const testFile = join(this.baseDir, '.ccjk-test')
      writeFileSync(testFile, 'test')
      rmSync(testFile)

      this.connected = true
    }
    catch (error) {
      throw new AdapterError(
        `Failed to initialize local storage: ${error instanceof Error ? error.message : String(error)}`,
        'CONNECTION_FAILED',
        this.provider,
        error instanceof Error ? error : undefined,
      )
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.config = null
    this.baseDir = ''
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  async upload(key: string, data: Buffer, metadata?: Record<string, unknown>): Promise<UploadResult> {
    this.ensureConnected()

    const normalizedKey = this.normalizeKey(key)
    const filePath = this.getFilePath(normalizedKey)
    const metaPath = filePath + META_EXTENSION
    const checksum = this.calculateChecksum(data)

    try {
      // Ensure parent directory exists
      const parentDir = dirname(filePath)
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true })
      }

      // Check if file exists for createdAt
      let createdAt = this.getCurrentTimestamp()
      if (existsSync(metaPath)) {
        try {
          const existingMeta = JSON.parse(readFileSync(metaPath, 'utf-8')) as LocalMetadata
          createdAt = existingMeta.createdAt
        }
        catch {
          // Ignore parse errors
        }
      }

      // Write file
      writeFileSync(filePath, data)

      // Write metadata
      const localMeta: LocalMetadata = {
        checksum,
        contentType: 'application/octet-stream',
        createdAt,
        updatedAt: this.getCurrentTimestamp(),
        custom: metadata,
      }
      writeFileSync(metaPath, JSON.stringify(localMeta, null, 2))

      this.reportProgress('upload', normalizedKey, data.length, data.length)

      return {
        success: true,
        key: normalizedKey,
        size: data.length,
        checksum,
        uploadedAt: localMeta.updatedAt,
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
    const filePath = this.getFilePath(normalizedKey)
    const metaPath = filePath + META_EXTENSION

    try {
      if (!existsSync(filePath)) {
        throw new AdapterError(
          `Item not found: ${normalizedKey}`,
          'NOT_FOUND',
          this.provider,
        )
      }

      const data = readFileSync(filePath)
      const checksum = this.calculateChecksum(data)
      const stats = statSync(filePath)

      this.reportProgress('download', normalizedKey, data.length, data.length)

      // Read metadata if exists
      let metadata: ItemMetadata = {
        updatedAt: stats.mtime.toISOString(),
      }

      if (existsSync(metaPath)) {
        try {
          const localMeta = JSON.parse(readFileSync(metaPath, 'utf-8')) as LocalMetadata
          metadata = {
            contentType: localMeta.contentType,
            custom: localMeta.custom,
            createdAt: localMeta.createdAt,
            updatedAt: localMeta.updatedAt,
            etag: localMeta.checksum,
          }
        }
        catch {
          // Ignore parse errors
        }
      }

      return {
        success: true,
        data,
        size: data.length,
        checksum,
        lastModified: stats.mtime.toISOString(),
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
    const filePath = this.getFilePath(normalizedKey)
    const metaPath = filePath + META_EXTENSION

    if (!existsSync(filePath)) {
      throw new AdapterError(
        `Item not found: ${normalizedKey}`,
        'NOT_FOUND',
        this.provider,
      )
    }

    try {
      rmSync(filePath)

      // Also delete metadata file if exists
      if (existsSync(metaPath)) {
        rmSync(metaPath)
      }
    }
    catch (error) {
      throw new AdapterError(
        `Failed to delete item: ${error instanceof Error ? error.message : String(error)}`,
        'PERMISSION_DENIED',
        this.provider,
        error instanceof Error ? error : undefined,
      )
    }
  }

  async list(prefix?: string): Promise<RemoteItem[]> {
    this.ensureConnected()

    const normalizedPrefix = prefix ? this.normalizeKey(prefix) : ''
    const searchDir = normalizedPrefix
      ? join(this.baseDir, normalizedPrefix)
      : this.baseDir

    const items: RemoteItem[] = []

    try {
      this.listRecursive(searchDir, normalizedPrefix, items)
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []
      }
      throw error
    }

    return items
  }

  async getMetadata(key: string): Promise<ItemMetadata> {
    this.ensureConnected()

    const normalizedKey = this.normalizeKey(key)
    const filePath = this.getFilePath(normalizedKey)
    const metaPath = filePath + META_EXTENSION

    if (!existsSync(filePath)) {
      throw new AdapterError(
        `Item not found: ${normalizedKey}`,
        'NOT_FOUND',
        this.provider,
      )
    }

    const stats = statSync(filePath)
    let metadata: ItemMetadata = {
      updatedAt: stats.mtime.toISOString(),
      createdAt: stats.birthtime.toISOString(),
    }

    if (existsSync(metaPath)) {
      try {
        const localMeta = JSON.parse(readFileSync(metaPath, 'utf-8')) as LocalMetadata
        metadata = {
          contentType: localMeta.contentType,
          custom: localMeta.custom,
          createdAt: localMeta.createdAt,
          updatedAt: localMeta.updatedAt,
          etag: localMeta.checksum,
        }
      }
      catch {
        // Ignore parse errors
      }
    }

    return metadata
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Get full file path for a key
   */
  private getFilePath(key: string): string {
    return join(this.baseDir, key)
  }

  /**
   * Recursively list files in directory
   */
  private listRecursive(dir: string, prefix: string, items: RemoteItem[]): void {
    if (!existsSync(dir)) {
      return
    }

    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      // Skip metadata files
      if (entry.name.endsWith(META_EXTENSION)) {
        continue
      }

      // Skip hidden files
      if (entry.name.startsWith('.')) {
        continue
      }

      const fullPath = join(dir, entry.name)
      const key = relative(this.baseDir, fullPath).replace(/\\/g, '/')

      if (entry.isDirectory()) {
        // Add directory entry
        const stats = statSync(fullPath)
        items.push({
          key,
          name: entry.name,
          size: 0,
          isDirectory: true,
          lastModified: stats.mtime.toISOString(),
        })

        // Recurse into directory
        this.listRecursive(fullPath, prefix, items)
      }
      else {
        // Add file entry
        const stats = statSync(fullPath)
        const metaPath = fullPath + META_EXTENSION

        let metadata: ItemMetadata = {
          updatedAt: stats.mtime.toISOString(),
        }

        if (existsSync(metaPath)) {
          try {
            const localMeta = JSON.parse(readFileSync(metaPath, 'utf-8')) as LocalMetadata
            metadata = {
              contentType: localMeta.contentType,
              custom: localMeta.custom,
              createdAt: localMeta.createdAt,
              updatedAt: localMeta.updatedAt,
              etag: localMeta.checksum,
            }
          }
          catch {
            // Ignore parse errors
          }
        }

        items.push({
          key,
          name: entry.name,
          size: stats.size,
          isDirectory: false,
          lastModified: stats.mtime.toISOString(),
          checksum: metadata.etag,
          metadata,
        })
      }
    }
  }
}
