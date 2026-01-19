/**
 * Session Manager Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSessionManager, SessionManager } from '../../../src/utils/context/session-manager'

// Mock summarizer
vi.mock('../../../src/utils/context/summarizer', () => ({
  createSummarizer: vi.fn(() => ({
    summarize: vi.fn().mockResolvedValue({
      fcId: 'test-fc-id',
      fcName: 'testFunction',
      summary: 'Test summary',
      tokens: 10,
      timestamp: new Date(),
    }),
    updateConfig: vi.fn(),
  })),
  Summarizer: vi.fn(),
}))

describe('session-manager', () => {
  let sessionManager: SessionManager

  beforeEach(() => {
    vi.clearAllMocks()
    sessionManager = createSessionManager()
  })

  describe('createSessionManager', () => {
    it('should create session manager with default config', () => {
      const manager = createSessionManager()
      expect(manager).toBeInstanceOf(SessionManager)
    })

    it('should create session manager with custom config', () => {
      const manager = createSessionManager({
        contextThreshold: 0.9,
        maxContextTokens: 300000,
        summaryModel: 'user-default',
        autoSummarize: false,
      })

      expect(manager).toBeInstanceOf(SessionManager)
      const config = manager.getConfig()
      expect(config.contextThreshold).toBe(0.9)
      expect(config.maxContextTokens).toBe(300000)
      expect(config.summaryModel).toBe('user-default')
      expect(config.autoSummarize).toBe(false)
    })
  })

  describe('createSession', () => {
    it('should create new session', () => {
      const session = sessionManager.createSession('/test/project')

      expect(session).toHaveProperty('id')
      expect(session).toHaveProperty('projectPath', '/test/project')
      expect(session).toHaveProperty('projectHash')
      expect(session).toHaveProperty('startTime')
      expect(session).toHaveProperty('status', 'active')
      expect(session).toHaveProperty('tokenCount', 0)
      expect(session).toHaveProperty('fcCount', 0)
      expect(session).toHaveProperty('summaries')
      expect(session.summaries).toHaveLength(0)
    })

    it('should complete previous session when creating new one', () => {
      const session1 = sessionManager.createSession('/test/project1')
      const session2 = sessionManager.createSession('/test/project2')

      expect(session1.id).not.toBe(session2.id)
      expect(sessionManager.getCurrentSession()?.id).toBe(session2.id)
    })

    it('should emit session_created event', () => {
      const eventSpy = vi.fn()
      sessionManager.on('session_created', eventSpy)

      sessionManager.createSession('/test/project')

      expect(eventSpy).toHaveBeenCalled()
    })
  })

  describe('getCurrentSession', () => {
    it('should return null when no session exists', () => {
      const session = sessionManager.getCurrentSession()
      expect(session).toBeNull()
    })

    it('should return current session', () => {
      const created = sessionManager.createSession('/test/project')
      const current = sessionManager.getCurrentSession()

      expect(current).toEqual(created)
    })
  })

  describe('addFunctionCall', () => {
    beforeEach(() => {
      sessionManager.createSession('/test/project')
    })

    it('should add function call with auto-summarization', async () => {
      const summary = await sessionManager.addFunctionCall(
        'readFile',
        { path: '/test/file.txt' },
        'File content',
      )

      expect(summary).toBeDefined()
      expect(summary?.fcName).toBe('testFunction')
      expect(summary?.summary).toBe('Test summary')

      const session = sessionManager.getCurrentSession()
      expect(session?.fcCount).toBe(1)
      expect(session?.summaries).toHaveLength(1)
      expect(session?.tokenCount).toBeGreaterThan(0)
    })

    it('should add function call without auto-summarization', async () => {
      const manager = createSessionManager({ autoSummarize: false })
      manager.createSession('/test/project')

      const summary = await manager.addFunctionCall(
        'writeFile',
        { path: '/test/file.txt' },
        'Success',
      )

      expect(summary).toBeNull()

      const session = manager.getCurrentSession()
      expect(session?.fcCount).toBe(1)
      expect(session?.summaries).toHaveLength(0)
      expect(session?.tokenCount).toBeGreaterThan(0)
    })

    it('should throw error when no active session', async () => {
      const manager = createSessionManager()

      await expect(
        manager.addFunctionCall('test', {}, 'result'),
      ).rejects.toThrow('No active session')
    })

    it('should emit fc_summarized event', async () => {
      const eventSpy = vi.fn()
      sessionManager.on('fc_summarized', eventSpy)

      await sessionManager.addFunctionCall('test', {}, 'result')

      expect(eventSpy).toHaveBeenCalled()
    })
  })

  describe('threshold detection', () => {
    it('should detect warning threshold', async () => {
      const manager = createSessionManager({
        maxContextTokens: 1000,
        contextThreshold: 0.8,
      })

      const eventSpy = vi.fn()
      manager.on('threshold_warning', eventSpy)

      manager.createSession('/test/project')

      // Add enough function calls to reach warning threshold (70%)
      for (let i = 0; i < 70; i++) {
        await manager.addFunctionCall('test', {}, 'x'.repeat(40))
      }

      // Warning should be emitted at some point
      expect(manager.getThresholdLevel()).toBe('warning')
    })

    it('should detect critical threshold', async () => {
      const manager = createSessionManager({
        maxContextTokens: 1000,
        contextThreshold: 0.8,
      })

      const eventSpy = vi.fn()
      manager.on('threshold_critical', eventSpy)

      manager.createSession('/test/project')

      // Add enough function calls to reach critical threshold (80%)
      for (let i = 0; i < 80; i++) {
        await manager.addFunctionCall('test', {}, 'x'.repeat(40))
      }

      expect(manager.getThresholdLevel()).toBe('critical')
    })
  })

  describe('getThresholdLevel', () => {
    it('should return normal when below threshold', () => {
      sessionManager.createSession('/test/project')
      expect(sessionManager.getThresholdLevel()).toBe('normal')
    })

    it('should return normal when no session', () => {
      expect(sessionManager.getThresholdLevel()).toBe('normal')
    })
  })

  describe('getContextUsage', () => {
    it('should return 0 when no session', () => {
      expect(sessionManager.getContextUsage()).toBe(0)
    })

    it('should calculate usage percentage', async () => {
      const manager = createSessionManager({ maxContextTokens: 1000 })
      manager.createSession('/test/project')

      await manager.addFunctionCall('test', {}, 'x'.repeat(400))

      const usage = manager.getContextUsage()
      expect(usage).toBeGreaterThan(0)
      expect(usage).toBeLessThan(100)
    })
  })

  describe('getRemainingTokens', () => {
    it('should return max tokens when no session', () => {
      expect(sessionManager.getRemainingTokens()).toBe(200000)
    })

    it('should calculate remaining tokens', async () => {
      sessionManager.createSession('/test/project')
      await sessionManager.addFunctionCall('test', {}, 'x'.repeat(400))

      const remaining = sessionManager.getRemainingTokens()
      expect(remaining).toBeLessThan(200000)
      expect(remaining).toBeGreaterThan(0)
    })
  })

  describe('isThresholdExceeded', () => {
    it('should return false when below threshold', () => {
      sessionManager.createSession('/test/project')
      expect(sessionManager.isThresholdExceeded()).toBe(false)
    })

    it('should return false when no session', () => {
      expect(sessionManager.isThresholdExceeded()).toBe(false)
    })
  })

  describe('generateSessionSummary', () => {
    it('should generate summary for active session', async () => {
      sessionManager.createSession('/test/project')
      await sessionManager.addFunctionCall('test1', {}, 'result1')
      await sessionManager.addFunctionCall('test2', {}, 'result2')

      const summary = sessionManager.generateSessionSummary()

      expect(summary).toContain('Session Summary')
      expect(summary).toContain('/test/project')
      expect(summary).toContain('Function Calls: 2')
      expect(summary).toContain('Function Call Summaries')
    })

    it('should return message when no session', () => {
      const summary = sessionManager.generateSessionSummary()
      expect(summary).toBe('No active session')
    })
  })

  describe('completeSession', () => {
    it('should complete current session', () => {
      sessionManager.createSession('/test/project')
      const completed = sessionManager.completeSession()

      expect(completed).toBeDefined()
      expect(completed?.status).toBe('completed')
      expect(completed?.endTime).toBeDefined()
      expect(sessionManager.getCurrentSession()).toBeNull()
    })

    it('should return null when no session', () => {
      const completed = sessionManager.completeSession()
      expect(completed).toBeNull()
    })

    it('should emit session_completed event', () => {
      const eventSpy = vi.fn()
      sessionManager.on('session_completed', eventSpy)

      sessionManager.createSession('/test/project')
      sessionManager.completeSession()

      expect(eventSpy).toHaveBeenCalled()
    })
  })

  describe('archiveSession', () => {
    it('should archive completed session', () => {
      sessionManager.createSession('/test/project')
      const session = sessionManager.completeSession()

      const archived = sessionManager.archiveSession(session!.id)

      expect(archived).toBe(true)
    })

    it('should return false for non-existent session', () => {
      const archived = sessionManager.archiveSession('non-existent')
      expect(archived).toBe(false)
    })

    it('should emit session_archived event', () => {
      const eventSpy = vi.fn()
      sessionManager.on('session_archived', eventSpy)

      sessionManager.createSession('/test/project')
      const session = sessionManager.completeSession()
      sessionManager.archiveSession(session!.id)

      expect(eventSpy).toHaveBeenCalled()
    })
  })

  describe('getSession', () => {
    it('should get current session by id', () => {
      const created = sessionManager.createSession('/test/project')
      const retrieved = sessionManager.getSession(created.id)

      expect(retrieved).toEqual(created)
    })

    it('should get completed session by id', () => {
      sessionManager.createSession('/test/project')
      const completed = sessionManager.completeSession()
      const retrieved = sessionManager.getSession(completed!.id)

      expect(retrieved).toEqual(completed)
    })

    it('should return null for non-existent session', () => {
      const retrieved = sessionManager.getSession('non-existent')
      expect(retrieved).toBeNull()
    })
  })

  describe('getAllSessions', () => {
    it('should return empty array when no sessions', () => {
      const sessions = sessionManager.getAllSessions()
      expect(sessions).toHaveLength(0)
    })

    it('should return all sessions including current', () => {
      sessionManager.createSession('/test/project1')
      sessionManager.completeSession()
      sessionManager.createSession('/test/project2')

      const sessions = sessionManager.getAllSessions()
      expect(sessions).toHaveLength(2)
    })
  })

  describe('getSessionsByProject', () => {
    it('should return sessions for specific project', () => {
      sessionManager.createSession('/test/project1')
      sessionManager.completeSession()
      sessionManager.createSession('/test/project1')
      sessionManager.completeSession()
      sessionManager.createSession('/test/project2')

      const sessions = sessionManager.getSessionsByProject('/test/project1')
      expect(sessions).toHaveLength(2)
    })

    it('should return empty array for project with no sessions', () => {
      const sessions = sessionManager.getSessionsByProject('/test/project')
      expect(sessions).toHaveLength(0)
    })
  })

  describe('clearHistory', () => {
    it('should clear session history', () => {
      sessionManager.createSession('/test/project1')
      sessionManager.completeSession()
      sessionManager.createSession('/test/project2')
      sessionManager.completeSession()

      sessionManager.clearHistory()

      const sessions = sessionManager.getAllSessions()
      expect(sessions).toHaveLength(0)
    })
  })

  describe('updateConfig', () => {
    it('should update configuration', () => {
      sessionManager.updateConfig({
        contextThreshold: 0.9,
        maxContextTokens: 300000,
      })

      const config = sessionManager.getConfig()
      expect(config.contextThreshold).toBe(0.9)
      expect(config.maxContextTokens).toBe(300000)
    })

    it('should update summarizer when model changes', () => {
      sessionManager.updateConfig({ summaryModel: 'user-default' })

      const config = sessionManager.getConfig()
      expect(config.summaryModel).toBe('user-default')
    })
  })

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = sessionManager.getConfig()

      expect(config).toHaveProperty('contextThreshold')
      expect(config).toHaveProperty('maxContextTokens')
      expect(config).toHaveProperty('summaryModel')
      expect(config).toHaveProperty('autoSummarize')
    })
  })

  describe('getSummarizer', () => {
    it('should return summarizer instance', () => {
      const summarizer = sessionManager.getSummarizer()
      expect(summarizer).toBeDefined()
    })
  })
})
