import { nanoid } from 'nanoid'
import type { ContextData, ContextSnapshot } from './types'

/**
 * Context Store Options
 */
export interface ContextStoreOptions {
  /**
   * Maximum number of contexts to keep in memory
   * @default 1000
   */
  maxContexts?: number

  /**
   * Context TTL in milliseconds (0 = no expiration)
   * @default 3600000 (1 hour)
   */
  ttl?: number

  /**
   * Enable automatic cleanup of expired contexts
   * @default true
   */
  autoCleanup?: boolean

  /**
   * Cleanup interval in milliseconds
   * @default 300000 (5 minutes)
   */
  cleanupInterval?: number
}

/**
 * Context Entry with metadata
 */
interface ContextEntry {
  id: string
  data: ContextData
  createdAt: number
  updatedAt: number
  expiresAt: number | null
  version: number
}

/**
 * Context metadata returned by getMetadata
 */
export interface ContextMetadata {
  id: string
  createdAt: number
  updatedAt: number
  expiresAt: number | null
  version: number
}

/**
 * Lock for thread-safe operations
 */
class AsyncLock {
  private locked = false
  private queue: Array<() => void> = []

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true
        resolve()
      }
      else {
        this.queue.push(resolve)
      }
    })
  }

  release(): void {
    const next = this.queue.shift()
    if (next) {
      next()
    }
    else {
      this.locked = false
    }
  }

  async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    }
    finally {
      this.release()
    }
  }
}

/**
 * Context Store for managing task execution contexts
 *
 * Features:
 * - CRUD operations for contexts
 * - Deep merging of context data
 * - Context snapshots and restoration
 * - Automatic expiration and cleanup
 * - Thread-safe operations with locking
 * - Memory management with size limits
 */
export class ContextStore {
  private contexts = new Map<string, ContextEntry>()
  private lock = new AsyncLock()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private options: Required<ContextStoreOptions>

  constructor(options: ContextStoreOptions = {}) {
    this.options = {
      maxContexts: options.maxContexts ?? 1000,
      ttl: options.ttl ?? 3600000, // 1 hour
      autoCleanup: options.autoCleanup ?? true,
      cleanupInterval: options.cleanupInterval ?? 300000, // 5 minutes
    }

    if (this.options.autoCleanup) {
      this.startAutoCleanup()
    }
  }

  /**
   * Create a new context
   */
  async create(data: ContextData = {}): Promise<string> {
    return this.lock.runExclusive(async () => {
      const id = nanoid()
      const now = Date.now()
      const entry: ContextEntry = {
        id,
        data: this.deepClone(data),
        createdAt: now,
        updatedAt: now,
        expiresAt: this.options.ttl > 0 ? now + this.options.ttl : null,
        version: 1,
      }

      // Enforce size limit
      if (this.contexts.size >= this.options.maxContexts) {
        this.evictOldest()
      }

      this.contexts.set(id, entry)
      return id
    })
  }

  /**
   * Get context data by ID
   */
  async get(id: string): Promise<ContextData | null> {
    return this.lock.runExclusive(async () => {
      const entry = this.contexts.get(id)
      if (!entry) {
        return null
      }

      // Check expiration
      if (this.isExpired(entry)) {
        this.contexts.delete(id)
        return null
      }

      return this.deepClone(entry.data)
    })
  }

  /**
   * Update context data (deep merge)
   */
  async update(id: string, data: Partial<ContextData>): Promise<boolean> {
    return this.lock.runExclusive(async () => {
      const entry = this.contexts.get(id)
      if (!entry) {
        return false
      }

      // Check expiration
      if (this.isExpired(entry)) {
        this.contexts.delete(id)
        return false
      }

      // Deep merge
      entry.data = this.deepMerge(entry.data, data)
      entry.updatedAt = Date.now()
      entry.version += 1

      // Refresh TTL
      if (this.options.ttl > 0) {
        entry.expiresAt = Date.now() + this.options.ttl
      }

      return true
    })
  }

  /**
   * Set context data (replace)
   */
  async set(id: string, data: ContextData): Promise<boolean> {
    return this.lock.runExclusive(async () => {
      const entry = this.contexts.get(id)
      if (!entry) {
        return false
      }

      // Check expiration
      if (this.isExpired(entry)) {
        this.contexts.delete(id)
        return false
      }

      entry.data = this.deepClone(data)
      entry.updatedAt = Date.now()
      entry.version += 1

      // Refresh TTL
      if (this.options.ttl > 0) {
        entry.expiresAt = Date.now() + this.options.ttl
      }

      return true
    })
  }

  /**
   * Delete a context
   */
  async delete(id: string): Promise<boolean> {
    return this.lock.runExclusive(async () => {
      return this.contexts.delete(id)
    })
  }

  /**
   * Check if context exists
   */
  async has(id: string): Promise<boolean> {
    return this.lock.runExclusive(async () => {
      const entry = this.contexts.get(id)
      if (!entry) {
        return false
      }

      // Check expiration
      if (this.isExpired(entry)) {
        this.contexts.delete(id)
        return false
      }

      return true
    })
  }

  /**
   * Get number of contexts
   */
  async size(): Promise<number> {
    return this.lock.runExclusive(async () => {
      return this.contexts.size
    })
  }

  /**
   * Clear all contexts
   */
  async clear(): Promise<void> {
    return this.lock.runExclusive(async () => {
      this.contexts.clear()
    })
  }

  /**
   * Get all context IDs
   */
  async keys(): Promise<string[]> {
    return this.lock.runExclusive(async () => {
      return Array.from(this.contexts.keys())
    })
  }

  /**
   * Create a snapshot of context
   */
  async snapshot(id: string): Promise<ContextSnapshot | null> {
    return this.lock.runExclusive(async () => {
      const entry = this.contexts.get(id)
      if (!entry) {
        return null
      }

      // Check expiration
      if (this.isExpired(entry)) {
        this.contexts.delete(id)
        return null
      }

      return {
        id: nanoid(),
        data: this.deepClone(entry.data),
        timestamp: Date.now(),
        version: entry.version,
      }
    })
  }

  /**
   * Restore context from snapshot
   */
  async restore(id: string, snapshot: ContextSnapshot): Promise<boolean> {
    return this.lock.runExclusive(async () => {
      const entry = this.contexts.get(id)
      if (!entry) {
        return false
      }

      // Check expiration
      if (this.isExpired(entry)) {
        this.contexts.delete(id)
        return false
      }

      entry.data = this.deepClone(snapshot.data)
      entry.updatedAt = Date.now()
      entry.version += 1

      // Refresh TTL
      if (this.options.ttl > 0) {
        entry.expiresAt = Date.now() + this.options.ttl
      }

      return true
    })
  }

  /**
   * Get context metadata
   */
  async getMetadata(id: string): Promise<ContextMetadata | null> {
    return this.lock.runExclusive(async () => {
      const entry = this.contexts.get(id)
      if (!entry) {
        return null
      }

      // Check expiration
      if (this.isExpired(entry)) {
        this.contexts.delete(id)
        return null
      }

      return {
        id: entry.id,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        expiresAt: entry.expiresAt,
        version: entry.version,
      }
    })
  }

  /**
   * Clean up expired contexts
   */
  async cleanup(): Promise<number> {
    return this.lock.runExclusive(async () => {
      let removed = 0
      const now = Date.now()

      for (const [id, entry] of this.contexts) {
        if (entry.expiresAt !== null && entry.expiresAt <= now) {
          this.contexts.delete(id)
          removed++
        }
      }

      return removed
    })
  }

  /**
   * Destroy the store and clean up resources
   */
  destroy(): void {
    this.stopAutoCleanup()
    this.contexts.clear()
  }

  /**
   * Start automatic cleanup timer
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer) {
      return
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(() => {
        // Ignore cleanup errors
      })
    }, this.options.cleanupInterval)

    // Unref the timer so it doesn't prevent process exit
    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref()
    }
  }

  /**
   * Stop automatic cleanup timer
   */
  private stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: ContextEntry): boolean {
    if (entry.expiresAt === null) {
      return false
    }
    return Date.now() > entry.expiresAt
  }

  /**
   * Evict the oldest context
   */
  private evictOldest(): void {
    let oldest: { id: string, createdAt: number } | null = null

    for (const [id, entry] of this.contexts) {
      if (!oldest || entry.createdAt < oldest.createdAt) {
        oldest = { id, createdAt: entry.createdAt }
      }
    }

    if (oldest) {
      this.contexts.delete(oldest.id)
    }
  }

  /**
   * Deep clone an object
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T
    }

    const cloned = {} as T
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key])
      }
    }

    return cloned
  }

  /**
   * Deep merge two objects
   */
  private deepMerge<T extends Record<string, unknown>>(
    target: T,
    source: Partial<T>,
  ): T {
    const result = this.deepClone(target)

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key]
        const targetValue = result[key]

        if (
          sourceValue !== null
          && typeof sourceValue === 'object'
          && !Array.isArray(sourceValue)
          && targetValue !== null
          && typeof targetValue === 'object'
          && !Array.isArray(targetValue)
        ) {
          // Recursively merge objects
          result[key] = this.deepMerge(
            targetValue as Record<string, unknown>,
            sourceValue as Record<string, unknown>,
          ) as T[Extract<keyof T, string>]
        }
        else {
          // Replace value (including arrays and null)
          result[key] = this.deepClone(sourceValue) as T[Extract<keyof T, string>]
        }
      }
    }

    return result
  }
}

/**
 * Create a new ContextStore instance
 */
export function createContextStore(options?: ContextStoreOptions): ContextStore {
  return new ContextStore(options)
}
