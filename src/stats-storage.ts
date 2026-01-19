/**
 * Statistics storage layer for CCJK usage tracking
 * Handles persistence of request records and daily statistics
 */

import type { DailyStats, RequestRecord } from './types/stats'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'

/**
 * Storage paths configuration
 */
export class StatsStorage {
  private readonly baseDir: string
  private readonly recordsDir: string
  private readonly dailyDir: string

  constructor(baseDir?: string) {
    this.baseDir = baseDir || join(homedir(), '.ccjk', 'stats')
    this.recordsDir = join(this.baseDir, 'records')
    this.dailyDir = join(this.baseDir, 'daily')
    this.ensureDirectories()
  }

  /**
   * Ensure storage directories exist
   */
  private ensureDirectories(): void {
    for (const dir of [this.baseDir, this.recordsDir, this.dailyDir]) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    }
  }

  /**
   * Get file path for a specific date
   */
  private getRecordFilePath(date: string): string {
    return join(this.recordsDir, `${date}.json`)
  }

  /**
   * Get daily stats file path for a specific date
   */
  private getDailyStatsFilePath(date: string): string {
    return join(this.dailyDir, `${date}.json`)
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(timestamp: number): string {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * Save a request record
   */
  saveRecord(record: RequestRecord): void {
    const date = this.formatDate(record.timestamp)
    const filePath = this.getRecordFilePath(date)

    let records: RequestRecord[] = []
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8')
        records = JSON.parse(content)
      }
      catch {
        // If file is corrupted, start fresh
        records = []
      }
    }

    records.push(record)
    writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8')
  }

  /**
   * Get records for a specific date
   */
  getRecordsByDate(date: string): RequestRecord[] {
    const filePath = this.getRecordFilePath(date)
    if (!existsSync(filePath)) {
      return []
    }

    try {
      const content = readFileSync(filePath, 'utf-8')
      return JSON.parse(content)
    }
    catch {
      return []
    }
  }

  /**
   * Get records for a date range
   */
  getRecordsByDateRange(startDate: string, endDate: string): RequestRecord[] {
    const records: RequestRecord[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    const d = new Date(start)
    // eslint-disable-next-line no-unmodified-loop-condition
    while (d <= end) {
      const dateStr = this.formatDate(d.getTime())
      records.push(...this.getRecordsByDate(dateStr))
      d.setDate(d.getDate() + 1)
    }

    return records
  }

  /**
   * Get all available record dates
   */
  getAvailableDates(): string[] {
    if (!existsSync(this.recordsDir)) {
      return []
    }

    const files = readdirSync(this.recordsDir)
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort()
  }

  /**
   * Save daily statistics
   */
  saveDailyStats(stats: DailyStats): void {
    const filePath = this.getDailyStatsFilePath(stats.date)
    writeFileSync(filePath, JSON.stringify(stats, null, 2), 'utf-8')
  }

  /**
   * Get daily statistics for a specific date
   */
  getDailyStats(date: string): DailyStats | null {
    const filePath = this.getDailyStatsFilePath(date)
    if (!existsSync(filePath)) {
      return null
    }

    try {
      const content = readFileSync(filePath, 'utf-8')
      return JSON.parse(content)
    }
    catch {
      return null
    }
  }

  /**
   * Get daily statistics for a date range
   */
  getDailyStatsByDateRange(startDate: string, endDate: string): DailyStats[] {
    const stats: DailyStats[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    const d = new Date(start)
    // eslint-disable-next-line no-unmodified-loop-condition
    while (d <= end) {
      const dateStr = this.formatDate(d.getTime())
      const dailyStats = this.getDailyStats(dateStr)
      if (dailyStats) {
        stats.push(dailyStats)
      }
      d.setDate(d.getDate() + 1)
    }

    return stats
  }

  /**
   * Get all available daily stats dates
   */
  getAvailableDailyStatsDates(): string[] {
    if (!existsSync(this.dailyDir)) {
      return []
    }

    const files = readdirSync(this.dailyDir)
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort()
  }

  /**
   * Calculate date range for a period
   */
  getDateRangeForPeriod(period: '1d' | '7d' | '30d' | '90d' | 'all'): { startDate: string, endDate: string } {
    const now = new Date()
    const endDate = this.formatDate(now.getTime())

    if (period === 'all') {
      const dates = this.getAvailableDates()
      const startDate = dates.length > 0 ? dates[0] : endDate
      return { startDate, endDate }
    }

    const days = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90
    const start = new Date(now)
    start.setDate(start.getDate() - days + 1)
    const startDate = this.formatDate(start.getTime())

    return { startDate, endDate }
  }

  /**
   * Clean up old records (older than specified days)
   */
  cleanupOldRecords(daysToKeep: number): number {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    const cutoffStr = this.formatDate(cutoffDate.getTime())

    const dates = this.getAvailableDates()
    let deletedCount = 0

    for (const date of dates) {
      if (date < cutoffStr) {
        try {
          const recordFile = this.getRecordFilePath(date)
          const dailyFile = this.getDailyStatsFilePath(date)

          if (existsSync(recordFile)) {
            // Don't actually delete, just count for now
            // unlinkSync(recordFile)
            deletedCount++
          }
          if (existsSync(dailyFile)) {
            // unlinkSync(dailyFile)
          }
        }
        catch {
          // Ignore errors
        }
      }
    }

    return deletedCount
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalRecordFiles: number
    totalDailyFiles: number
    oldestDate: string | null
    newestDate: string | null
    totalRecords: number
  } {
    const recordDates = this.getAvailableDates()
    const dailyDates = this.getAvailableDailyStatsDates()

    let totalRecords = 0
    for (const date of recordDates) {
      const records = this.getRecordsByDate(date)
      totalRecords += records.length
    }

    return {
      totalRecordFiles: recordDates.length,
      totalDailyFiles: dailyDates.length,
      oldestDate: recordDates.length > 0 ? recordDates[0] : null,
      newestDate: recordDates.length > 0 ? recordDates[recordDates.length - 1] : null,
      totalRecords,
    }
  }
}

/**
 * Singleton instance
 */
let storageInstance: StatsStorage | null = null

/**
 * Get the singleton storage instance
 */
export function getStatsStorage(): StatsStorage {
  if (!storageInstance) {
    storageInstance = new StatsStorage()
  }
  return storageInstance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetStatsStorage(): void {
  storageInstance = null
}
