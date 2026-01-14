/**
 * Audit logger module for request/response tracking
 */

import type { AuditLogEntry, AuditLogFilter } from '../types/sandbox.js'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'

/**
 * Default audit log directory
 */
const DEFAULT_AUDIT_DIR = join(homedir(), '.ccjk', 'audit')

/**
 * Audit logger class for tracking requests, responses, and errors
 */
export class AuditLogger {
  private auditDir: string
  private enabled: boolean

  constructor(auditDir?: string, enabled: boolean = true) {
    this.auditDir = auditDir || DEFAULT_AUDIT_DIR
    this.enabled = enabled
  }

  /**
   * Initialize audit directory
   */
  async initialize(): Promise<void> {
    if (!this.enabled) {
      return
    }

    if (!existsSync(this.auditDir)) {
      await mkdir(this.auditDir, { recursive: true })
    }
  }

  /**
   * Log a request
   */
  async logRequest(request: any, metadata?: Record<string, any>): Promise<string> {
    if (!this.enabled) {
      return ''
    }

    const entry: AuditLogEntry = {
      id: this.generateId(),
      type: 'request',
      timestamp: Date.now(),
      data: request,
      metadata,
    }

    await this.writeLogEntry(entry)
    return entry.id
  }

  /**
   * Log a response
   */
  async logResponse(response: any, metadata?: Record<string, any>): Promise<string> {
    if (!this.enabled) {
      return ''
    }

    const entry: AuditLogEntry = {
      id: this.generateId(),
      type: 'response',
      timestamp: Date.now(),
      data: response,
      metadata,
    }

    await this.writeLogEntry(entry)
    return entry.id
  }

  /**
   * Log an error
   */
  async logError(error: Error, context?: Record<string, any>): Promise<string> {
    if (!this.enabled) {
      return ''
    }

    const entry: AuditLogEntry = {
      id: this.generateId(),
      type: 'error',
      timestamp: Date.now(),
      data: context || {},
      error: {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      },
    }

    await this.writeLogEntry(entry)
    return entry.id
  }

  /**
   * Get audit logs with optional filtering
   */
  async getAuditLogs(filter?: AuditLogFilter): Promise<AuditLogEntry[]> {
    if (!this.enabled) {
      return []
    }

    await this.initialize()

    const files = await this.getLogFiles()
    const entries: AuditLogEntry[] = []

    for (const file of files) {
      const fileEntries = await this.readLogFile(file)
      entries.push(...fileEntries)
    }

    // Apply filters
    let filtered = entries

    if (filter?.type) {
      filtered = filtered.filter(entry => entry.type === filter.type)
    }

    if (filter?.startTime) {
      filtered = filtered.filter(entry => entry.timestamp >= filter.startTime!)
    }

    if (filter?.endTime) {
      filtered = filtered.filter(entry => entry.timestamp <= filter.endTime!)
    }

    if (filter?.requestId) {
      filtered = filtered.filter(entry => entry.id === filter.requestId)
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp)

    // Apply limit
    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit)
    }

    return filtered
  }

  /**
   * Clear audit logs
   */
  async clearLogs(olderThan?: number): Promise<number> {
    if (!this.enabled) {
      return 0
    }

    const files = await this.getLogFiles()
    let deletedCount = 0

    for (const file of files) {
      if (olderThan) {
        // Check file date from filename
        const dateMatch = file.match(/audit-(\d{4}-\d{2}-\d{2})\.jsonl/)
        if (dateMatch) {
          const fileDate = new Date(dateMatch[1]).getTime()
          if (fileDate < olderThan) {
            await this.deleteLogFile(file)
            deletedCount++
          }
        }
      }
      else {
        // Delete all logs
        await this.deleteLogFile(file)
        deletedCount++
      }
    }

    return deletedCount
  }

  /**
   * Get audit statistics
   */
  async getStats(): Promise<{
    totalEntries: number
    byType: Record<string, number>
    oldestEntry?: number
    newestEntry?: number
  }> {
    const entries = await this.getAuditLogs()

    const stats = {
      totalEntries: entries.length,
      byType: {
        request: 0,
        response: 0,
        error: 0,
      },
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : undefined,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : undefined,
    }

    for (const entry of entries) {
      stats.byType[entry.type]++
    }

    return stats
  }

  /**
   * Enable or disable audit logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Check if audit logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Get audit directory path
   */
  getAuditDir(): string {
    return this.auditDir
  }

  /**
   * Write a log entry to file
   */
  private async writeLogEntry(entry: AuditLogEntry): Promise<void> {
    await this.initialize()

    const filename = this.getLogFilename()
    const filepath = join(this.auditDir, filename)
    const line = `${JSON.stringify(entry)}\n`

    await writeFile(filepath, line, { flag: 'a' })
  }

  /**
   * Read log entries from a file
   */
  private async readLogFile(filename: string): Promise<AuditLogEntry[]> {
    const filepath = join(this.auditDir, filename)

    try {
      const content = await readFile(filepath, 'utf-8')
      const lines = content.trim().split('\n').filter(line => line.length > 0)

      return lines.map(line => JSON.parse(line) as AuditLogEntry)
    }
    catch (error) {
      console.error(`Failed to read log file ${filename}:`, error)
      return []
    }
  }

  /**
   * Get all log files
   */
  private async getLogFiles(): Promise<string[]> {
    try {
      const files = await readdir(this.auditDir)
      return files.filter(file => file.endsWith('.jsonl'))
    }
    catch {
      return []
    }
  }

  /**
   * Delete a log file
   */
  private async deleteLogFile(filename: string): Promise<void> {
    const filepath = join(this.auditDir, filename)
    const { unlink } = await import('node:fs/promises')
    await unlink(filepath)
  }

  /**
   * Get log filename for current date
   */
  private getLogFilename(): string {
    const date = new Date().toISOString().split('T')[0]
    return `audit-${date}.jsonl`
  }

  /**
   * Generate unique ID for log entry
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}

/**
 * Create an audit logger instance
 */
export function createAuditLogger(auditDir?: string, enabled?: boolean): AuditLogger {
  return new AuditLogger(auditDir, enabled)
}
