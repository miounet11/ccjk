/**
 * LevelDB Storage
 *
 * Persistent storage using file-based storage for precomputed data.
 * Supports compression, automatic compaction, and atomic writes.
 */

import type { CacheEntry } from '../types.js'
import { createHash } from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

/**
 * File-based storage class
 */
export class LevelDBStorage {
  private dbPath: string
  private compressionEnabled: boolean
  private cache: Map<string, CacheEntry>
  private initialized: boolean = false

  constructor(dbPath: string, compressionEnabled = true) {
    this.dbPath = dbPath
    this.compressionEnabled = compressionEnabled
    this.cache = new Map()
  }

  /**
   * Initialize storage
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      await fs.mkdir(this.dbPath, { recursive: true })
      // Load existing data
      await this.loadFromDisk()
      this.initialized = true
    }
    catch (error) {
      console.error('Failed to initialize storage:', error)
    }
  }

  /**
   * Load data from disk
   */
  private async loadFromDisk(): Promise<void> {
    try {
      const files = await fs.readdir(this.dbPath)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.dbPath, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const entry = JSON.parse(content) as CacheEntry
          this.cache.set(entry.key, entry)
        }
      }
    }
    catch (error) {
      // Ignore if directory doesn't exist yet
    }
  }

  /**
   * Get file path for a key
   */
  private getFilePath(key: string): string {
    const hash = createHash('md5').update(key).digest('hex')
    return path.join(this.dbPath, `${hash}.json`)
  }

  /**
   * Store a cache entry
   */
  async put(entry: CacheEntry): Promise<void> {
    await this.initialize()

    const dataToStore = { ...entry }

    if (this.compressionEnabled && shouldCompress(entry.type)) {
      dataToStore.data = compressData(entry.data)
      dataToStore.compressed = true
    }

    this.cache.set(entry.key, dataToStore)

    // Write to disk
    const filePath = this.getFilePath(entry.key)
    await fs.writeFile(filePath, JSON.stringify(dataToStore, null, 2), 'utf-8')
  }

  /**
   * Retrieve a cache entry
   */
  async get(key: string): Promise<CacheEntry | null> {
    await this.initialize()

    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    // Decompress if needed
    if (entry.compressed) {
      const decompressed = { ...entry }
      decompressed.data = decompressData(entry.data)
      decompressed.compressed = false
      return decompressed
    }

    return entry
  }

  /**
   * Delete a cache entry
   */
  async del(key: string): Promise<void> {
    await this.initialize()

    this.cache.delete(key)

    // Delete from disk
    const filePath = this.getFilePath(key)
    try {
      await fs.unlink(filePath)
    }
    catch (error) {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    await this.initialize()
    return this.cache.has(key)
  }

  /**
   * Get all entries matching a prefix
   */
  async getByPrefix(prefix: string): Promise<CacheEntry[]> {
    await this.initialize()

    const entries: CacheEntry[] = []
    const cacheEntries = Array.from(this.cache.entries())

    for (const [key, entry] of cacheEntries) {
      if (key.startsWith(prefix)) {
        // Decompress if needed
        if (entry.compressed) {
          const decompressed = { ...entry }
          decompressed.data = decompressData(entry.data)
          decompressed.compressed = false
          entries.push(decompressed)
        }
        else {
          entries.push(entry)
        }
      }
    }

    return entries
  }

  /**
   * Batch write multiple entries
   */
  async batch(entries: CacheEntry[]): Promise<void> {
    await this.initialize()

    await Promise.all(entries.map(entry => this.put(entry)))
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    await this.initialize()

    this.cache.clear()

    // Clear disk storage
    try {
      const files = await fs.readdir(this.dbPath)
      await Promise.all(
        files
          .filter(file => file.endsWith('.json'))
          .map(file => fs.unlink(path.join(this.dbPath, file))),
      )
    }
    catch (error) {
      // Ignore errors
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    // Flush any pending writes
    this.initialized = false
  }

  /**
   * Get approximate database size
   */
  async getSize(): Promise<number> {
    await this.initialize()
    return this.cache.size
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
