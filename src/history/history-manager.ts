/**
 * History Manager
 * 历史管理器
 *
 * @version 8.0.0
 * @module history
 */

import type {
  HistoryEntry,
  HistoryEntryType,
  HistoryManagerOptions,
  HistorySearchOptions,
  HistoryStats,
} from './types'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

/**
 * History Manager class
 */
export class HistoryManager {
  private entries: HistoryEntry[]
  private storagePath: string
  private storageType: 'local' | 'cloud'
  private cloudEndpoint?: string
  private maxSize: number

  constructor(options?: HistoryManagerOptions) {
    this.entries = []
    this.storageType = options?.storageType || 'local'
    this.cloudEndpoint = options?.cloudEndpoint
    this.maxSize = options?.maxSize || 10000
    this.storagePath = path.join(os.homedir(), '.claude', 'history.json')
  }

  /**
   * Initialize history manager
   */
  async initialize(): Promise<void> {
    await this.load()
  }

  /**
   * Add a history entry
   */
  async add(
    type: HistoryEntryType,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<HistoryEntry> {
    const entry: HistoryEntry = {
      id: this.generateId(),
      type,
      content,
      timestamp: new Date().toISOString(),
      metadata,
    }

    this.entries.unshift(entry) // Add to beginning

    // Enforce max size
    if (this.entries.length > this.maxSize) {
      this.entries = this.entries.slice(0, this.maxSize)
    }

    await this.save()

    return entry
  }

  /**
   * Search history
   */
  async search(options?: HistorySearchOptions): Promise<HistoryEntry[]> {
    let results = [...this.entries]

    // Filter by type
    if (options?.type) {
      results = results.filter(e => e.type === options.type)
    }

    // Filter by session
    if (options?.sessionId) {
      results = results.filter(e => e.sessionId === options.sessionId)
    }

    // Filter by query
    if (options?.query) {
      const query = options.query.toLowerCase()
      results = results.filter(e =>
        e.content.toLowerCase().includes(query),
      )
    }

    // Filter by date range
    if (options?.startDate) {
      const startTime = new Date(options.startDate).getTime()
      results = results.filter(e => new Date(e.timestamp).getTime() >= startTime)
    }

    if (options?.endDate) {
      const endTime = new Date(options.endDate).getTime()
      results = results.filter(e => new Date(e.timestamp).getTime() <= endTime)
    }

    // Apply pagination
    if (options?.offset !== undefined) {
      results = results.slice(options.offset)
    }

    if (options?.limit !== undefined) {
      results = results.slice(0, options.limit)
    }

    return results
  }

  /**
   * Get recent entries
   */
  async getRecent(limit: number = 10, type?: HistoryEntryType): Promise<HistoryEntry[]> {
    return await this.search({ type, limit })
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<HistoryStats> {
    const byType: Record<HistoryEntryType, number> = {
      command: 0,
      prompt: 0,
      session: 0,
    }

    const commandCounts = new Map<string, number>()
    const sessions = new Set<string>()

    for (const entry of this.entries) {
      byType[entry.type]++

      if (entry.type === 'command') {
        const count = commandCounts.get(entry.content) || 0
        commandCounts.set(entry.content, count + 1)
      }

      if (entry.sessionId) {
        sessions.add(entry.sessionId)
      }
    }

    // Get most used commands
    const mostUsedCommands = Array.from(commandCounts.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      total: this.entries.length,
      byType,
      mostUsedCommands,
      recentSessions: Array.from(sessions).slice(0, 10),
    }
  }

  /**
   * Clear all history
   */
  async clear(): Promise<void> {
    this.entries = []
    await this.save()
  }

  /**
   * Clear old entries
   */
  async clearOld(daysOld: number): Promise<number> {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000)
    const originalLength = this.entries.length

    this.entries = this.entries.filter(e =>
      new Date(e.timestamp).getTime() > cutoffTime,
    )

    const removed = originalLength - this.entries.length

    if (removed > 0) {
      await this.save()
    }

    return removed
  }

  /**
   * Load history from storage
   */
  private async load(): Promise<void> {
    if (this.storageType === 'local') {
      await this.loadFromLocal()
    }
    else {
      await this.loadFromCloud()
    }
  }

  /**
   * Save history to storage
   */
  private async save(): Promise<void> {
    if (this.storageType === 'local') {
      await this.saveToLocal()
    }
    else {
      await this.saveToCloud()
    }
  }

  /**
   * Load from local file
   */
  private async loadFromLocal(): Promise<void> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8')
      this.entries = JSON.parse(data)
    }
    catch (error) {
      // File doesn't exist, start with empty history
      this.entries = []
    }
  }

  /**
   * Save to local file
   */
  private async saveToLocal(): Promise<void> {
    const dir = path.dirname(this.storagePath)
    await fs.mkdir(dir, { recursive: true })

    await fs.writeFile(
      this.storagePath,
      JSON.stringify(this.entries, null, 2),
      'utf-8',
    )
  }

  /**
   * Load from cloud
   */
  private async loadFromCloud(): Promise<void> {
    // TODO: Implement cloud API
  }

  /**
   * Save to cloud
   */
  private async saveToCloud(): Promise<void> {
    // TODO: Implement cloud API
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
