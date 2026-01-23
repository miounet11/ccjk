/**
 * LevelDB Storage
 *
 * Persistent storage using LevelDB for precomputed data.
 * Supports compression, automatic compaction, and atomic writes.
 */

import level from 'level'
import type { CacheEntry } from '../types.js'
import { gzipSync, gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'

/**
 * LevelDB storage class
 */
export class LevelDBStorage {
  private db: level.LevelDB
  private compressionEnabled: boolean

  constructor(dbPath: string, compressionEnabled = true) {
    this.db = level(dbPath, { valueEncoding: 'json' })
    this.compressionEnabled = compressionEnabled
  }

  /**
   * Store a cache entry
   */
  async put(entry: CacheEntry): Promise<void> {
    const dataToStore = { ...entry }

    if (this.compressionEnabled && shouldCompress(entry.type)) {
      dataToStore.data = compressData(entry.data)
      dataToStore.compressed = true
    }

    await this.db.put(entry.key, dataToStore)
  }

  /**
   * Retrieve a cache entry
   */
  async get(key: string): Promise<CacheEntry | null> {
    try {
      const entry = (await this.db.get(key)) as CacheEntry

      // Decompress if needed
      if (entry.compressed) {
        entry.data = decompressData(entry.data)
        entry.compressed = false
      }

      return entry
    }
    catch (error: any) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null
      }
      throw error
    }
  }

  /**
   * Delete a cache entry
   */
  async del(key: string): Promise<void> {
    await this.db.del(key)
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    try {
      await this.db.get(key)
      return true
    }
    catch (error: any) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return false
      }
      throw error
    }
  }

  /**
   * Get all entries matching a prefix
   */
  async getByPrefix(prefix: string): Promise<CacheEntry[]> {
    const entries: CacheEntry[] = []

    for await (const [key, value] of this.db.iterator()) {
      if (key.startsWith(prefix)) {
        let entry = value as CacheEntry

        // Decompress if needed
        if (entry.compressed) {
          entry.data = decompressData(entry.data)
          entry.compressed = false
        }

        entries.push(entry)
      }
    }

    return entries
  }

  /**
   * Batch write multiple entries
   */
  async batch(entries: CacheEntry[]): Promise<void> {
    const ops = entries.map(entry => ({
      type: 'put',
      key: entry.key,
      value: entry,
    }))

    await this.db.batch(ops as any)
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    await this.db.clear()
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.close()
  }

  /**
   * Get approximate database size
   */
  async getSize(): Promise<number> {
    let count = 0
    for await (const _ of this.db.iterator()) {
      count++
    }
    return count
  }

  /**
   * Compact database
   */
  async compact(): Promise<void> {
    // LevelDB automatic compaction is enabled by default
    // This is a placeholder for manual compaction if needed
  }

  /**
   * Generate checksum for data
   */
  generateChecksum(data: any): string {
    const json = JSON.stringify(data)
    return createHash('sha256').update(json).digest('hex')
  }

  /**
   * Verify checksum
   */
  verifyChecksum(entry: CacheEntry): boolean {
    const calculated = this.generateChecksum(entry.data)
    return calculated === entry.checksum
  }
}

/**
 * Check if data type should be compressed
 */
function shouldCompress(type: string): boolean {
  // Compress AST and call-graph data as they tend to be large
  return type === 'ast' || type === 'call-graph'
}

/**
 * Compress data using gzip
 */
function compressData(data: any): string {
  const json = JSON.stringify(data)
  const compressed = gzipSync(Buffer.from(json, 'utf-8'))
  return compressed.toString('base64')
}

/**
 * Decompress data from gzip
 */
function decompressData(compressedData: string): any {
  const buffer = Buffer.from(compressedData, 'base64')
  const decompressed = gunzipSync(buffer)
  return JSON.parse(decompressed.toString('utf-8'))
}
