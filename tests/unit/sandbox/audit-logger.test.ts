/**
 * Unit tests for AuditLogger
 */

import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuditLogger } from '../../../src/sandbox/audit-logger.js'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  unlink: vi.fn(),
}))

describe('auditLogger', () => {
  const mockAuditDir = '/mock/audit'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(mkdir).mockResolvedValue(undefined)
    vi.mocked(writeFile).mockResolvedValue(undefined)
    vi.mocked(readFile).mockResolvedValue('')
    vi.mocked(readdir).mockResolvedValue([])
    vi.mocked(unlink).mockResolvedValue(undefined)
  })

  describe('initialize', () => {
    it('should create audit directory if not exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      const logger = new AuditLogger(mockAuditDir)

      await logger.initialize()

      expect(mkdir).toHaveBeenCalledWith(mockAuditDir, { recursive: true })
    })

    it('should not create directory if already exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      const logger = new AuditLogger(mockAuditDir)

      await logger.initialize()

      expect(mkdir).not.toHaveBeenCalled()
    })

    it('should not initialize if disabled', async () => {
      const logger = new AuditLogger(mockAuditDir, false)

      await logger.initialize()

      expect(mkdir).not.toHaveBeenCalled()
    })
  })

  describe('logRequest', () => {
    it('should log request with metadata', async () => {
      const logger = new AuditLogger(mockAuditDir)
      const request = { method: 'GET', url: '/api/data' }
      const metadata = { userId: 'user1' }

      const id = await logger.logRequest(request, metadata)

      expect(id).toBeTruthy()
      expect(writeFile).toHaveBeenCalled()

      const writeCall = vi.mocked(writeFile).mock.calls[0]
      const logEntry = JSON.parse(writeCall[1] as string)

      expect(logEntry.type).toBe('request')
      expect(logEntry.data).toEqual(request)
      expect(logEntry.metadata).toEqual(metadata)
    })

    it('should not log if disabled', async () => {
      const logger = new AuditLogger(mockAuditDir, false)

      const id = await logger.logRequest({ test: 'data' })

      expect(id).toBe('')
      expect(writeFile).not.toHaveBeenCalled()
    })
  })

  describe('logResponse', () => {
    it('should log response with metadata', async () => {
      const logger = new AuditLogger(mockAuditDir)
      const response = { status: 200, data: 'success' }
      const metadata = { requestId: 'req-123' }

      const id = await logger.logResponse(response, metadata)

      expect(id).toBeTruthy()
      expect(writeFile).toHaveBeenCalled()

      const writeCall = vi.mocked(writeFile).mock.calls[0]
      const logEntry = JSON.parse(writeCall[1] as string)

      expect(logEntry.type).toBe('response')
      expect(logEntry.data).toEqual(response)
      expect(logEntry.metadata).toEqual(metadata)
    })
  })

  describe('logError', () => {
    it('should log error with context', async () => {
      const logger = new AuditLogger(mockAuditDir)
      const error = new Error('Test error')
      const context = { operation: 'test' }

      const id = await logger.logError(error, context)

      expect(id).toBeTruthy()
      expect(writeFile).toHaveBeenCalled()

      const writeCall = vi.mocked(writeFile).mock.calls[0]
      const logEntry = JSON.parse(writeCall[1] as string)

      expect(logEntry.type).toBe('error')
      expect(logEntry.error?.message).toBe('Test error')
      expect(logEntry.data).toEqual(context)
    })

    it('should include error stack and code', async () => {
      const logger = new AuditLogger(mockAuditDir)
      const error = new Error('Test error') as any
      error.code = 'ERR_TEST'

      await logger.logError(error)

      const writeCall = vi.mocked(writeFile).mock.calls[0]
      const logEntry = JSON.parse(writeCall[1] as string)

      expect(logEntry.error?.stack).toBeTruthy()
      expect(logEntry.error?.code).toBe('ERR_TEST')
    })
  })

  describe('getAuditLogs', () => {
    it('should return all logs', async () => {
      const logger = new AuditLogger(mockAuditDir)
      const mockLogs = [
        { id: '1', type: 'request', timestamp: 1000, data: {} },
        { id: '2', type: 'response', timestamp: 2000, data: {} },
      ]

      vi.mocked(readdir).mockResolvedValue(['audit-2024-01-01.jsonl'] as any)
      vi.mocked(readFile).mockResolvedValue(
        mockLogs.map(log => JSON.stringify(log)).join('\n'),
      )

      const logs = await logger.getAuditLogs()

      expect(logs).toHaveLength(2)
      expect(logs[0].id).toBe('2') // Sorted by timestamp desc
      expect(logs[1].id).toBe('1')
    })

    it('should filter by type', async () => {
      const logger = new AuditLogger(mockAuditDir)
      const mockLogs = [
        { id: '1', type: 'request', timestamp: 1000, data: {} },
        { id: '2', type: 'error', timestamp: 2000, data: {} },
      ]

      vi.mocked(readdir).mockResolvedValue(['audit-2024-01-01.jsonl'] as any)
      vi.mocked(readFile).mockResolvedValue(
        mockLogs.map(log => JSON.stringify(log)).join('\n'),
      )

      const logs = await logger.getAuditLogs({ type: 'error' })

      expect(logs).toHaveLength(1)
      expect(logs[0].type).toBe('error')
    })

    it('should filter by time range', async () => {
      const logger = new AuditLogger(mockAuditDir)
      const mockLogs = [
        { id: '1', type: 'request', timestamp: 1000, data: {} },
        { id: '2', type: 'request', timestamp: 2000, data: {} },
        { id: '3', type: 'request', timestamp: 3000, data: {} },
      ]

      vi.mocked(readdir).mockResolvedValue(['audit-2024-01-01.jsonl'] as any)
      vi.mocked(readFile).mockResolvedValue(
        mockLogs.map(log => JSON.stringify(log)).join('\n'),
      )

      const logs = await logger.getAuditLogs({
        startTime: 1500,
        endTime: 2500,
      })

      expect(logs).toHaveLength(1)
      expect(logs[0].id).toBe('2')
    })

    it('should apply limit', async () => {
      const logger = new AuditLogger(mockAuditDir)
      const mockLogs = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        type: 'request',
        timestamp: i * 1000,
        data: {},
      }))

      vi.mocked(readdir).mockResolvedValue(['audit-2024-01-01.jsonl'] as any)
      vi.mocked(readFile).mockResolvedValue(
        mockLogs.map(log => JSON.stringify(log)).join('\n'),
      )

      const logs = await logger.getAuditLogs({ limit: 5 })

      expect(logs).toHaveLength(5)
    })

    it('should return empty array if disabled', async () => {
      const logger = new AuditLogger(mockAuditDir, false)

      const logs = await logger.getAuditLogs()

      expect(logs).toEqual([])
    })
  })

  describe('clearLogs', () => {
    it('should delete all log files', async () => {
      const logger = new AuditLogger(mockAuditDir)

      vi.mocked(readdir).mockResolvedValue([
        'audit-2024-01-01.jsonl',
        'audit-2024-01-02.jsonl',
      ] as any)

      const count = await logger.clearLogs()

      expect(count).toBe(2)
      expect(unlink).toHaveBeenCalledTimes(2)
    })

    it('should delete only old log files', async () => {
      const logger = new AuditLogger(mockAuditDir)

      vi.mocked(readdir).mockResolvedValue([
        'audit-2024-01-01.jsonl',
        'audit-2024-12-31.jsonl',
      ] as any)

      const olderThan = new Date('2024-06-01').getTime()
      const count = await logger.clearLogs(olderThan)

      expect(count).toBe(1)
      expect(unlink).toHaveBeenCalledTimes(1)
    })

    it('should return 0 if disabled', async () => {
      const logger = new AuditLogger(mockAuditDir, false)

      const count = await logger.clearLogs()

      expect(count).toBe(0)
    })
  })

  describe('getStats', () => {
    it('should return statistics', async () => {
      const logger = new AuditLogger(mockAuditDir)
      const mockLogs = [
        { id: '1', type: 'request', timestamp: 1000, data: {} },
        { id: '2', type: 'request', timestamp: 2000, data: {} },
        { id: '3', type: 'response', timestamp: 3000, data: {} },
        { id: '4', type: 'error', timestamp: 4000, data: {} },
      ]

      vi.mocked(readdir).mockResolvedValue(['audit-2024-01-01.jsonl'] as any)
      vi.mocked(readFile).mockResolvedValue(
        mockLogs.map(log => JSON.stringify(log)).join('\n'),
      )

      const stats = await logger.getStats()

      expect(stats.totalEntries).toBe(4)
      expect(stats.byType.request).toBe(2)
      expect(stats.byType.response).toBe(1)
      expect(stats.byType.error).toBe(1)
      expect(stats.oldestEntry).toBe(1000)
      expect(stats.newestEntry).toBe(4000)
    })
  })

  describe('setEnabled', () => {
    it('should enable logging', () => {
      const logger = new AuditLogger(mockAuditDir, false)

      logger.setEnabled(true)

      expect(logger.isEnabled()).toBe(true)
    })

    it('should disable logging', () => {
      const logger = new AuditLogger(mockAuditDir, true)

      logger.setEnabled(false)

      expect(logger.isEnabled()).toBe(false)
    })
  })

  describe('getAuditDir', () => {
    it('should return audit directory path', () => {
      const logger = new AuditLogger(mockAuditDir)

      expect(logger.getAuditDir()).toBe(mockAuditDir)
    })
  })
})
