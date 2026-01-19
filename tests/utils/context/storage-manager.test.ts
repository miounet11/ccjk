/**
 * Tests for storage manager
 */

import type { FCLogEntry } from '../../../src/utils/context/storage-types'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createStorageManager,
  getStorageManager,
  StorageManager,
} from '../../../src/utils/context/storage-manager'

// Mock project hash module
vi.mock('../../../src/utils/context/project-hash', () => ({
  getProjectIdentity: vi.fn().mockResolvedValue({
    path: '/test/project',
    hash: '0123456789abcdef',
    gitRemote: undefined,
    gitBranch: undefined,
  }),
}))

describe('storage-manager', () => {
  let testDir: string
  let storageManager: StorageManager

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `ccjk-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })

    storageManager = new StorageManager(testDir)
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  })

  describe('storageManager', () => {
    describe('initialize', () => {
      it('should create storage directories', async () => {
        await storageManager.initialize()

        const fs = await import('node:fs')
        expect(fs.existsSync(testDir)).toBe(true)
        expect(fs.existsSync(join(testDir, 'sessions'))).toBe(true)
      })

      it('should not fail if already initialized', async () => {
        await storageManager.initialize()
        await storageManager.initialize()

        const fs = await import('node:fs')
        expect(fs.existsSync(testDir)).toBe(true)
      })
    })

    describe('createSession', () => {
      it('should create new session', async () => {
        const session = await storageManager.createSession('/test/project')

        expect(session.meta.id).toBeDefined()
        expect(session.meta.projectPath).toBe('/test/project')
        expect(session.meta.projectHash).toBe('0123456789abcdef')
        expect(session.meta.status).toBe('active')
        expect(session.meta.tokenCount).toBe(0)
        expect(session.meta.fcCount).toBe(0)
      })

      it('should create session with description', async () => {
        const session = await storageManager.createSession(
          '/test/project',
          'Test session',
        )

        expect(session.meta.description).toBe('Test session')
      })

      it('should create session directory structure', async () => {
        const session = await storageManager.createSession('/test/project')

        const fs = await import('node:fs')
        expect(fs.existsSync(session.path)).toBe(true)
        expect(fs.existsSync(session.fcLogPath)).toBe(true)
        expect(fs.existsSync(join(session.path, 'meta.json'))).toBe(true)
      })

      it('should set current session pointer', async () => {
        const session = await storageManager.createSession('/test/project')

        const current = await storageManager.getCurrentSession('0123456789abcdef')

        expect(current?.meta.id).toBe(session.meta.id)
      })
    })

    describe('getSession', () => {
      it('should retrieve session by ID', async () => {
        const created = await storageManager.createSession('/test/project')

        const retrieved = await storageManager.getSession(
          created.meta.id,
          '0123456789abcdef',
        )

        expect(retrieved?.meta.id).toBe(created.meta.id)
      })

      it('should return null for non-existent session', async () => {
        const session = await storageManager.getSession(
          'non-existent',
          '0123456789abcdef',
        )

        expect(session).toBeNull()
      })

      it('should search all projects if hash not provided', async () => {
        const created = await storageManager.createSession('/test/project')

        const retrieved = await storageManager.getSession(created.meta.id)

        expect(retrieved?.meta.id).toBe(created.meta.id)
      })
    })

    describe('updateSession', () => {
      it('should update session metadata', async () => {
        const session = await storageManager.createSession('/test/project')

        session.meta.tokenCount = 1000
        session.meta.fcCount = 10

        await storageManager.updateSession(session)

        const retrieved = await storageManager.getSession(
          session.meta.id,
          '0123456789abcdef',
        )

        expect(retrieved?.meta.tokenCount).toBe(1000)
        expect(retrieved?.meta.fcCount).toBe(10)
      })

      it('should update lastUpdated timestamp', async () => {
        const session = await storageManager.createSession('/test/project')

        const originalTimestamp = session.meta.lastUpdated

        // Wait a bit to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 10))

        await storageManager.updateSession(session)

        const retrieved = await storageManager.getSession(
          session.meta.id,
          '0123456789abcdef',
        )

        expect(retrieved?.meta.lastUpdated).not.toBe(originalTimestamp)
      })
    })

    describe('completeSession', () => {
      it('should mark session as completed', async () => {
        const session = await storageManager.createSession('/test/project')

        const success = await storageManager.completeSession(
          session.meta.id,
          '0123456789abcdef',
        )

        expect(success).toBe(true)

        const retrieved = await storageManager.getSession(
          session.meta.id,
          '0123456789abcdef',
        )

        expect(retrieved?.meta.status).toBe('completed')
        expect(retrieved?.meta.endTime).toBeDefined()
      })

      it('should return false for non-existent session', async () => {
        const success = await storageManager.completeSession(
          'non-existent',
          '0123456789abcdef',
        )

        expect(success).toBe(false)
      })
    })

    describe('archiveSession', () => {
      it('should mark session as archived', async () => {
        const session = await storageManager.createSession('/test/project')

        const success = await storageManager.archiveSession(
          session.meta.id,
          '0123456789abcdef',
        )

        expect(success).toBe(true)

        const retrieved = await storageManager.getSession(
          session.meta.id,
          '0123456789abcdef',
        )

        expect(retrieved?.meta.status).toBe('archived')
      })
    })

    describe('listSessions', () => {
      it('should list all sessions', async () => {
        await storageManager.createSession('/test/project1')
        await storageManager.createSession('/test/project2')

        const sessions = await storageManager.listSessions()

        expect(sessions).toHaveLength(2)
      })

      it('should filter by project hash', async () => {
        await storageManager.createSession('/test/project')

        const sessions = await storageManager.listSessions({
          projectHash: '0123456789abcdef',
        })

        expect(sessions).toHaveLength(1)
        expect(sessions[0].projectHash).toBe('0123456789abcdef')
      })

      it('should filter by status', async () => {
        const session1 = await storageManager.createSession('/test/project1')
        await storageManager.createSession('/test/project2')

        await storageManager.completeSession(session1.meta.id, '0123456789abcdef')

        const active = await storageManager.listSessions({ status: 'active' })
        const completed = await storageManager.listSessions({ status: 'completed' })

        expect(active).toHaveLength(1)
        expect(completed).toHaveLength(1)
      })

      it('should sort by startTime', async () => {
        const session1 = await storageManager.createSession('/test/project1')

        await new Promise(resolve => setTimeout(resolve, 10))

        const session2 = await storageManager.createSession('/test/project2')

        const ascending = await storageManager.listSessions({
          sortBy: 'startTime',
          sortOrder: 'asc',
        })

        const descending = await storageManager.listSessions({
          sortBy: 'startTime',
          sortOrder: 'desc',
        })

        expect(ascending[0].id).toBe(session1.meta.id)
        expect(descending[0].id).toBe(session2.meta.id)
      })

      it('should limit results', async () => {
        await storageManager.createSession('/test/project1')
        await storageManager.createSession('/test/project2')
        await storageManager.createSession('/test/project3')

        const sessions = await storageManager.listSessions({ limit: 2 })

        expect(sessions).toHaveLength(2)
      })
    })

    describe('appendFCLog', () => {
      it('should append FC log entry', async () => {
        const session = await storageManager.createSession('/test/project')

        const entry: FCLogEntry = {
          ts: new Date().toISOString(),
          id: 'fc-001',
          fc: 'testFunction',
          args: { test: 'arg' },
          result: 'success',
          tokens: 100,
          duration: 50,
          summary: 'Test function call',
          status: 'success',
        }

        await storageManager.appendFCLog(session.meta.id, entry, '0123456789abcdef')

        const logs = await storageManager.getFCLogsArray(
          session.meta.id,
          undefined,
          '0123456789abcdef',
        )

        expect(logs).toHaveLength(1)
        expect(logs[0].id).toBe('fc-001')
      })

      it('should update session metadata', async () => {
        const session = await storageManager.createSession('/test/project')

        const entry: FCLogEntry = {
          ts: new Date().toISOString(),
          id: 'fc-001',
          fc: 'testFunction',
          args: {},
          tokens: 100,
          duration: 50,
          summary: 'Test',
          status: 'success',
        }

        await storageManager.appendFCLog(session.meta.id, entry, '0123456789abcdef')

        const retrieved = await storageManager.getSession(
          session.meta.id,
          '0123456789abcdef',
        )

        expect(retrieved?.meta.fcCount).toBe(1)
        expect(retrieved?.meta.tokenCount).toBe(100)
      })

      it('should throw for non-existent session', async () => {
        const entry: FCLogEntry = {
          ts: new Date().toISOString(),
          id: 'fc-001',
          fc: 'testFunction',
          args: {},
          tokens: 100,
          duration: 50,
          summary: 'Test',
          status: 'success',
        }

        await expect(
          storageManager.appendFCLog('non-existent', entry, '0123456789abcdef'),
        ).rejects.toThrow()
      })
    })

    describe('getFCLogs', () => {
      it('should stream FC logs', async () => {
        const session = await storageManager.createSession('/test/project')

        // Add multiple entries
        for (let i = 0; i < 5; i++) {
          const entry: FCLogEntry = {
            ts: new Date().toISOString(),
            id: `fc-${i}`,
            fc: 'testFunction',
            args: {},
            tokens: 100,
            duration: 50,
            summary: `Test ${i}`,
            status: 'success',
          }

          await storageManager.appendFCLog(session.meta.id, entry, '0123456789abcdef')
        }

        const logs: FCLogEntry[] = []

        for await (const entry of storageManager.getFCLogs(
          session.meta.id,
          undefined,
          '0123456789abcdef',
        )) {
          logs.push(entry)
        }

        expect(logs).toHaveLength(5)
      })

      it('should filter by function name', async () => {
        const session = await storageManager.createSession('/test/project')

        const entry1: FCLogEntry = {
          ts: new Date().toISOString(),
          id: 'fc-1',
          fc: 'function1',
          args: {},
          tokens: 100,
          duration: 50,
          summary: 'Test',
          status: 'success',
        }

        const entry2: FCLogEntry = {
          ts: new Date().toISOString(),
          id: 'fc-2',
          fc: 'function2',
          args: {},
          tokens: 100,
          duration: 50,
          summary: 'Test',
          status: 'success',
        }

        await storageManager.appendFCLog(session.meta.id, entry1, '0123456789abcdef')
        await storageManager.appendFCLog(session.meta.id, entry2, '0123456789abcdef')

        const logs = await storageManager.getFCLogsArray(
          session.meta.id,
          { functionName: 'function1' },
          '0123456789abcdef',
        )

        expect(logs).toHaveLength(1)
        expect(logs[0].fc).toBe('function1')
      })

      it('should limit results', async () => {
        const session = await storageManager.createSession('/test/project')

        for (let i = 0; i < 5; i++) {
          const entry: FCLogEntry = {
            ts: new Date().toISOString(),
            id: `fc-${i}`,
            fc: 'testFunction',
            args: {},
            tokens: 100,
            duration: 50,
            summary: `Test ${i}`,
            status: 'success',
          }

          await storageManager.appendFCLog(session.meta.id, entry, '0123456789abcdef')
        }

        const logs = await storageManager.getFCLogsArray(
          session.meta.id,
          { limit: 3 },
          '0123456789abcdef',
        )

        expect(logs).toHaveLength(3)
      })
    })

    describe('saveSummary', () => {
      it('should save session summary', async () => {
        const session = await storageManager.createSession('/test/project')

        await storageManager.saveSummary(
          session.meta.id,
          '# Test Summary\n\nThis is a test.',
          '0123456789abcdef',
        )

        const summary = await storageManager.getSummary(
          session.meta.id,
          '0123456789abcdef',
        )

        expect(summary).toBe('# Test Summary\n\nThis is a test.')
      })

      it('should throw for non-existent session', async () => {
        await expect(
          storageManager.saveSummary('non-existent', 'Test', '0123456789abcdef'),
        ).rejects.toThrow()
      })
    })

    describe('getSummary', () => {
      it('should return null for non-existent summary', async () => {
        const session = await storageManager.createSession('/test/project')

        const summary = await storageManager.getSummary(
          session.meta.id,
          '0123456789abcdef',
        )

        expect(summary).toBeNull()
      })
    })

    describe('getCurrentSession', () => {
      it('should return current session', async () => {
        const session = await storageManager.createSession('/test/project')

        const current = await storageManager.getCurrentSession('0123456789abcdef')

        expect(current?.meta.id).toBe(session.meta.id)
      })

      it('should return null if no current session', async () => {
        const current = await storageManager.getCurrentSession('nonexistent')

        expect(current).toBeNull()
      })
    })

    describe('setCurrentSession', () => {
      it('should set current session', async () => {
        const session = await storageManager.createSession('/test/project')

        await storageManager.setCurrentSession('0123456789abcdef', session.meta.id)

        const current = await storageManager.getCurrentSession('0123456789abcdef')

        expect(current?.meta.id).toBe(session.meta.id)
      })
    })

    describe('deleteSession', () => {
      it('should delete session', async () => {
        const session = await storageManager.createSession('/test/project')

        const deleted = await storageManager.deleteSession(
          session.meta.id,
          '0123456789abcdef',
        )

        expect(deleted).toBe(true)

        const retrieved = await storageManager.getSession(
          session.meta.id,
          '0123456789abcdef',
        )

        expect(retrieved).toBeNull()
      })

      it('should return false for non-existent session', async () => {
        const deleted = await storageManager.deleteSession(
          'non-existent',
          '0123456789abcdef',
        )

        expect(deleted).toBe(false)
      })
    })

    describe('cleanOldSessions', () => {
      it('should clean old completed sessions', async () => {
        const session = await storageManager.createSession('/test/project')

        await storageManager.completeSession(session.meta.id, '0123456789abcdef')

        // Wait a bit to ensure session is older than cutoff
        await new Promise(resolve => setTimeout(resolve, 10))

        // Clean sessions older than 0ms (all completed sessions)
        const result = await storageManager.cleanOldSessions(0)

        expect(result.sessionsRemoved).toBe(1)
        expect(result.removedSessionIds).toContain(session.meta.id)
      })

      it('should not clean active sessions', async () => {
        await storageManager.createSession('/test/project')

        const result = await storageManager.cleanOldSessions(0)

        expect(result.sessionsRemoved).toBe(0)
      })

      it('should not clean recent sessions', async () => {
        const session = await storageManager.createSession('/test/project')

        await storageManager.completeSession(session.meta.id, '0123456789abcdef')

        // Clean sessions older than 1 hour
        const result = await storageManager.cleanOldSessions(60 * 60 * 1000)

        expect(result.sessionsRemoved).toBe(0)
      })
    })

    describe('getStorageStats', () => {
      it('should return storage statistics', async () => {
        const session1 = await storageManager.createSession('/test/project1')
        await storageManager.createSession('/test/project2')

        await storageManager.completeSession(session1.meta.id, '0123456789abcdef')

        const stats = await storageManager.getStorageStats()

        expect(stats.totalSessions).toBe(2)
        expect(stats.activeSessions).toBe(1)
        expect(stats.completedSessions).toBe(1)
        expect(stats.archivedSessions).toBe(0)
        expect(stats.oldestSession).toBeDefined()
        expect(stats.newestSession).toBeDefined()
      })

      it('should accumulate token and FC counts', async () => {
        const session = await storageManager.createSession('/test/project')

        const entry: FCLogEntry = {
          ts: new Date().toISOString(),
          id: 'fc-001',
          fc: 'testFunction',
          args: {},
          tokens: 100,
          duration: 50,
          summary: 'Test',
          status: 'success',
        }

        await storageManager.appendFCLog(session.meta.id, entry, '0123456789abcdef')

        const stats = await storageManager.getStorageStats()

        expect(stats.totalTokens).toBe(100)
        expect(stats.totalFCs).toBe(1)
      })
    })
  })

  describe('factory functions', () => {
    it('should create storage manager', () => {
      const manager = createStorageManager(testDir)

      expect(manager).toBeInstanceOf(StorageManager)
    })

    it('should get global storage manager', () => {
      const manager1 = getStorageManager()
      const manager2 = getStorageManager()

      expect(manager1).toBe(manager2) // Same instance
    })
  })
})
