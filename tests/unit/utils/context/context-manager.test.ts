/**
 * Unit tests for Context Manager
 * Tests the main orchestrator for the Context Compression System
 */

import type { Message } from '../../../../src/utils/context/context-manager'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextManager } from '../../../../src/utils/context/context-manager'

// Mock dependencies
vi.mock('../../../../src/utils/context/config-manager', () => ({
  ConfigManager: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue({
      enabled: true,
      autoSummarize: true,
      contextThreshold: 100000,
      maxContextTokens: 150000,
      summaryModel: 'haiku',
      cloudSync: { enabled: false },
      cleanup: { maxSessionAge: 30, maxStorageSize: 500, autoCleanup: true },
      storage: { baseDir: '/tmp/test', sessionsDir: 'sessions', syncQueueDir: 'sync-queue' },
    }),
    get: vi.fn().mockResolvedValue({
      enabled: true,
      autoSummarize: true,
      contextThreshold: 100000,
      maxContextTokens: 150000,
      summaryModel: 'haiku',
      cloudSync: { enabled: false },
      cleanup: { maxSessionAge: 30, maxStorageSize: 500, autoCleanup: true },
      storage: { baseDir: '/tmp/test', sessionsDir: 'sessions', syncQueueDir: 'sync-queue' },
    }),
    update: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('../../../../src/utils/context/session-manager', () => ({
  SessionManager: vi.fn().mockImplementation(() => {
    let currentSession: any = null
    return {
      createSession: vi.fn().mockImplementation(() => {
        currentSession = {
          id: 'test-session-id',
          projectPath: '/test/project',
          projectHash: 'test-hash',
          startTime: new Date(),
          status: 'active',
          tokenCount: 5000,
          fcCount: 3,
          summaries: [],
        }
        return currentSession
      }),
      getCurrentSession: vi.fn().mockImplementation(() => currentSession),
      completeSession: vi.fn().mockImplementation(() => {
        if (currentSession) {
          const completed = {
            ...currentSession,
            endTime: new Date(),
            status: 'completed',
          }
          currentSession = null
          return completed
        }
        return null
      }),
      getAllSessions: vi.fn().mockReturnValue([]),
      addFunctionCall: vi.fn().mockResolvedValue(undefined),
      generateSessionSummary: vi.fn().mockReturnValue('Test session summary'),
      isThresholdExceeded: vi.fn().mockReturnValue(false),
      getContextUsage: vi.fn().mockReturnValue(0.5),
      getRemainingTokens: vi.fn().mockReturnValue(75000),
      getThresholdLevel: vi.fn().mockReturnValue('normal'),
      updateConfig: vi.fn(),
      on: vi.fn(),
    }
  }),
}))

vi.mock('../../../../src/utils/context/storage-manager', () => ({
  StorageManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockResolvedValue({
      meta: {
        id: 'storage-session-id',
        projectPath: '/test/project',
        projectHash: 'test-hash',
        startTime: new Date().toISOString(),
        status: 'active',
        tokenCount: 0,
        summaryTokens: 0,
        fcCount: 0,
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      },
      path: '/tmp/test/sessions/storage-session-id',
      fcLogPath: '/tmp/test/sessions/storage-session-id/fc-log.jsonl',
      summaryPath: '/tmp/test/sessions/storage-session-id/summary.md',
    }),
    getSession: vi.fn().mockResolvedValue(null),
    updateSession: vi.fn().mockResolvedValue(undefined),
    completeSession: vi.fn().mockResolvedValue(undefined),
    saveSummary: vi.fn().mockResolvedValue(undefined),
    getSummary: vi.fn().mockResolvedValue(null),
    listSessions: vi.fn().mockResolvedValue([]),
    cleanOldSessions: vi.fn().mockResolvedValue({ sessionsRemoved: 0, bytesFreed: 0 }),
  })),
}))

vi.mock('../../../../src/utils/context/summarizer', () => ({
  Summarizer: vi.fn().mockImplementation(() => ({
    updateConfig: vi.fn(),
  })),
}))

vi.mock('../../../../src/utils/context/token-estimator', () => ({
  estimateTokens: vi.fn((text: string) => Math.ceil(text.length / 4)),
}))

describe('contextManager', () => {
  let manager: ContextManager

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new ContextManager({
      autoCompress: true,
      compressionThreshold: 0.8,
      debug: false,
    })
  })

  describe('initialization', () => {
    it('should create manager with default options', () => {
      const defaultManager = new ContextManager()
      expect(defaultManager).toBeDefined()
    })

    it('should create manager with custom options', () => {
      const customManager = new ContextManager({
        autoCompress: false,
        compressionThreshold: 0.9,
        maxHistoryLength: 50,
        debug: true,
      })
      expect(customManager).toBeDefined()
    })

    it('should initialize all subsystems', async () => {
      await manager.initialize()
      expect(manager).toBeDefined()
    })

    it('should not initialize twice', async () => {
      await manager.initialize()
      await manager.initialize() // Should not throw
      expect(manager).toBeDefined()
    })

    it('should throw error if initialization fails', async () => {
      const failManager = new ContextManager()
      const configManager = failManager.getConfigManager()
      vi.spyOn(configManager, 'load').mockRejectedValueOnce(new Error('Config load failed'))

      await expect(failManager.initialize()).rejects.toThrow('Failed to initialize Context Manager')
    })
  })

  describe('session Management', () => {
    beforeEach(async () => {
      await manager.initialize()
    })

    it('should start a new session', async () => {
      const session = await manager.startSession('/test/project')
      expect(session).toBeDefined()
      expect(session.id).toBe('test-session-id')
      expect(session.projectPath).toBe('/test/project')
    })

    it('should start session with default project path', async () => {
      const session = await manager.startSession()
      expect(session).toBeDefined()
      expect(session.id).toBe('test-session-id')
    })

    it('should emit session:start event', async () => {
      const eventSpy = vi.fn()
      manager.on('session:start', eventSpy)

      await manager.startSession('/test/project')
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session-id',
          projectPath: '/test/project',
        }),
      )
    })

    it('should get current session', async () => {
      await manager.startSession('/test/project')
      const session = manager.getCurrentSession()
      expect(session).toBeDefined()
      expect(session?.id).toBe('test-session-id')
    })

    it('should end current session', async () => {
      await manager.startSession('/test/project')
      const completedSession = await manager.endSession()
      expect(completedSession).toBeDefined()
      expect(completedSession?.status).toBe('completed')
    })

    it('should emit session:end event', async () => {
      const eventSpy = vi.fn()
      manager.on('session:end', eventSpy)

      await manager.startSession('/test/project')
      await manager.endSession()
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should return null when ending non-existent session', async () => {
      const sessionManager = manager.getSessionManager()
      vi.spyOn(sessionManager, 'getCurrentSession').mockReturnValueOnce(null)

      const result = await manager.endSession()
      expect(result).toBeNull()
    })

    it('should throw error if starting session fails', async () => {
      const storageManager = manager.getStorageManager()
      vi.spyOn(storageManager, 'createSession').mockRejectedValueOnce(new Error('Storage error'))

      await expect(manager.startSession('/test/project')).rejects.toThrow('Failed to start session')
    })
  })

  describe('message Management', () => {
    beforeEach(async () => {
      await manager.initialize()
      await manager.startSession('/test/project')
    })

    it('should add user message', async () => {
      const message: Message = {
        role: 'user',
        content: 'Hello, Claude!',
      }

      await manager.addMessage(message)
      expect(manager).toBeDefined()
    })

    it('should add assistant message', async () => {
      const message: Message = {
        role: 'assistant',
        content: 'Hello! How can I help you?',
      }

      await manager.addMessage(message)
      expect(manager).toBeDefined()
    })

    it('should add timestamp to message if not provided', async () => {
      const message: Message = {
        role: 'user',
        content: 'Test message',
      }

      await manager.addMessage(message)
      expect(manager).toBeDefined()
    })

    it('should emit message:added event', async () => {
      const eventSpy = vi.fn()
      manager.on('message:added', eventSpy)

      const message: Message = {
        role: 'user',
        content: 'Test message',
      }

      await manager.addMessage(message)
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session-id',
          message: expect.objectContaining({
            role: 'user',
            content: 'Test message',
          }),
        }),
      )
    })

    it('should handle function call messages', async () => {
      const message: Message = {
        role: 'assistant',
        content: 'Function result',
        metadata: {
          isFunctionCall: true,
          functionName: 'testFunction',
          arguments: { arg1: 'value1' },
        },
      }

      await manager.addMessage(message)
      const sessionManager = manager.getSessionManager()
      expect(sessionManager.addFunctionCall).toHaveBeenCalled()
    })

    it('should throw error if no active session', async () => {
      const sessionManager = manager.getSessionManager()
      vi.spyOn(sessionManager, 'getCurrentSession').mockReturnValueOnce(null)

      const message: Message = {
        role: 'user',
        content: 'Test',
      }

      await expect(manager.addMessage(message)).rejects.toThrow('No active session')
    })

    it('should trim message history when exceeding max length', async () => {
      const shortManager = new ContextManager({ maxHistoryLength: 2 })
      await shortManager.initialize()
      await shortManager.startSession('/test/project')

      await shortManager.addMessage({ role: 'user', content: 'Message 1' })
      await shortManager.addMessage({ role: 'user', content: 'Message 2' })
      await shortManager.addMessage({ role: 'user', content: 'Message 3' })

      expect(shortManager).toBeDefined()
    })
  })

  describe('compression', () => {
    beforeEach(async () => {
      await manager.initialize()
      await manager.startSession('/test/project')
    })

    it('should check if compression is needed', () => {
      const shouldCompress = manager.shouldCompress()
      expect(typeof shouldCompress).toBe('boolean')
    })

    it('should emit threshold:reached event when threshold exceeded', () => {
      const eventSpy = vi.fn()
      manager.on('threshold:reached', eventSpy)

      const sessionManager = manager.getSessionManager()
      vi.spyOn(sessionManager, 'isThresholdExceeded').mockReturnValueOnce(true)

      manager.shouldCompress()
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should execute compression', async () => {
      const summary = await manager.compress()
      expect(summary).toBeDefined()
      expect(summary.content).toBe('Test session summary')
      expect(summary.originalTokens).toBe(5000)
    })

    it('should emit compression:start event', async () => {
      const eventSpy = vi.fn()
      manager.on('compression:start', eventSpy)

      await manager.compress()
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session-id',
          tokenCount: 5000,
        }),
      )
    })

    it('should emit compression:complete event', async () => {
      const eventSpy = vi.fn()
      manager.on('compression:complete', eventSpy)

      await manager.compress()
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session-id',
          summary: expect.objectContaining({
            content: 'Test session summary',
          }),
        }),
      )
    })

    it('should throw error if no active session to compress', async () => {
      const sessionManager = manager.getSessionManager()
      vi.spyOn(sessionManager, 'getCurrentSession').mockReturnValueOnce(null)

      await expect(manager.compress()).rejects.toThrow('No active session to compress')
    })

    it('should auto-compress when threshold reached', async () => {
      const sessionManager = manager.getSessionManager()
      vi.spyOn(sessionManager, 'isThresholdExceeded').mockReturnValue(true)

      const compressSpy = vi.spyOn(manager, 'compress')

      await manager.addMessage({ role: 'user', content: 'Test message' })
      expect(compressSpy).toHaveBeenCalled()
    })

    it('should not auto-compress when disabled', async () => {
      const noAutoManager = new ContextManager({ autoCompress: false })
      await noAutoManager.initialize()
      await noAutoManager.startSession('/test/project')

      const sessionManager = noAutoManager.getSessionManager()
      vi.spyOn(sessionManager, 'isThresholdExceeded').mockReturnValue(true)

      const compressSpy = vi.spyOn(noAutoManager, 'compress')

      await noAutoManager.addMessage({ role: 'user', content: 'Test message' })
      expect(compressSpy).not.toHaveBeenCalled()
    })
  })

  describe('context Retrieval', () => {
    beforeEach(async () => {
      await manager.initialize()
      await manager.startSession('/test/project')
    })

    it('should get optimized context', async () => {
      const context = await manager.getOptimizedContext()
      expect(context).toBe('Test session summary')
    })

    it('should return saved summary if available', async () => {
      const storageManager = manager.getStorageManager()
      vi.spyOn(storageManager, 'getSummary').mockResolvedValueOnce('Saved summary')

      const context = await manager.getOptimizedContext()
      expect(context).toBe('Saved summary')
    })

    it('should return empty string if no session', async () => {
      const sessionManager = manager.getSessionManager()
      vi.spyOn(sessionManager, 'getCurrentSession').mockReturnValueOnce(null)

      const context = await manager.getOptimizedContext()
      expect(context).toBe('')
    })

    it('should fallback to generated summary on error', async () => {
      const storageManager = manager.getStorageManager()
      vi.spyOn(storageManager, 'getSummary').mockRejectedValueOnce(new Error('Storage error'))

      const context = await manager.getOptimizedContext()
      expect(context).toBe('Test session summary')
    })
  })

  describe('statistics', () => {
    beforeEach(async () => {
      await manager.initialize()
      await manager.startSession('/test/project')
    })

    it('should get current statistics', () => {
      const stats = manager.getStats()
      expect(stats).toBeDefined()
      expect(stats.currentTokens).toBe(5000)
      expect(stats.sessionCount).toBe(0)
      expect(stats.totalMessages).toBe(0)
    })

    it('should track compressed tokens', async () => {
      await manager.compress()
      const stats = manager.getStats()
      expect(stats.compressedTokens).toBeGreaterThan(0)
    })

    it('should track total messages', async () => {
      await manager.addMessage({ role: 'user', content: 'Test 1' })
      await manager.addMessage({ role: 'user', content: 'Test 2' })

      const stats = manager.getStats()
      expect(stats.totalMessages).toBe(2)
    })

    it('should return last compression time', async () => {
      await manager.compress()
      const stats = manager.getStats()
      expect(stats.lastCompression).not.toBeNull()
    })
  })

  describe('project Sessions', () => {
    beforeEach(async () => {
      await manager.initialize()
    })

    it('should get project sessions', async () => {
      const sessions = await manager.getProjectSessions('/test/project')
      expect(Array.isArray(sessions)).toBe(true)
    })

    it('should filter sessions by project path', async () => {
      const storageManager = manager.getStorageManager()
      vi.spyOn(storageManager, 'listSessions').mockResolvedValueOnce([
        {
          id: 'session-1',
          projectPath: '/test/project',
          projectHash: 'hash-1',
          startTime: new Date().toISOString(),
          status: 'completed',
          tokenCount: 1000,
          summaryTokens: 100,
          fcCount: 5,
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
        },
        {
          id: 'session-2',
          projectPath: '/other/project',
          projectHash: 'hash-2',
          startTime: new Date().toISOString(),
          status: 'completed',
          tokenCount: 2000,
          summaryTokens: 200,
          fcCount: 10,
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
        },
      ])

      const sessions = await manager.getProjectSessions('/test/project')
      expect(sessions).toHaveLength(1)
      expect(sessions[0].projectPath).toBe('/test/project')
    })

    it('should handle errors gracefully', async () => {
      const storageManager = manager.getStorageManager()
      vi.spyOn(storageManager, 'listSessions').mockRejectedValueOnce(new Error('Storage error'))

      const sessions = await manager.getProjectSessions('/test/project')
      expect(sessions).toEqual([])
    })
  })

  describe('cleanup', () => {
    beforeEach(async () => {
      await manager.initialize()
    })

    it('should cleanup old sessions', async () => {
      const result = await manager.cleanupOldSessions(30)
      expect(result).toBeDefined()
      expect(result.sessionsRemoved).toBe(0)
      expect(result.bytesFreed).toBe(0)
    })

    it('should use default max age', async () => {
      const result = await manager.cleanupOldSessions()
      expect(result).toBeDefined()
    })

    it('should handle cleanup errors gracefully', async () => {
      const storageManager = manager.getStorageManager()
      vi.spyOn(storageManager, 'cleanOldSessions').mockRejectedValueOnce(new Error('Cleanup error'))

      const result = await manager.cleanupOldSessions(30)
      expect(result.sessionsRemoved).toBe(0)
      expect(result.bytesFreed).toBe(0)
    })

    it('should cleanup manager resources', async () => {
      await manager.startSession('/test/project')

      const sessionBefore = manager.getCurrentSession()
      expect(sessionBefore).not.toBeNull()

      await manager.cleanup()

      const sessionAfter = manager.getCurrentSession()
      expect(sessionAfter).toBeNull()
    })

    it('should remove all event listeners on cleanup', async () => {
      const eventSpy = vi.fn()
      manager.on('session:start', eventSpy)

      await manager.cleanup()
      await manager.initialize()
      await manager.startSession('/test/project')

      expect(eventSpy).not.toHaveBeenCalled()
    })
  })

  describe('configuration Updates', () => {
    beforeEach(async () => {
      await manager.initialize()
    })

    it('should update configuration', async () => {
      await manager.updateConfig({ compressionThreshold: 0.9 })
      expect(manager).toBeDefined()
    })

    it('should update config manager when threshold changes', async () => {
      const configManager = manager.getConfigManager()
      const updateSpy = vi.spyOn(configManager, 'update')

      await manager.updateConfig({ compressionThreshold: 0.9 })
      expect(updateSpy).toHaveBeenCalled()
    })

    it('should handle update errors', async () => {
      const configManager = manager.getConfigManager()
      vi.spyOn(configManager, 'update').mockRejectedValueOnce(new Error('Update failed'))

      await expect(manager.updateConfig({ compressionThreshold: 0.9 })).rejects.toThrow('Failed to update config')
    })
  })

  describe('error Handling', () => {
    it('should throw error when not initialized', async () => {
      const uninitializedManager = new ContextManager()
      await expect(uninitializedManager.startSession('/test/project')).rejects.toThrow('Context Manager not initialized')
    })

    it('should emit error events', async () => {
      await manager.initialize()
      const errorSpy = vi.fn()
      manager.on('error', errorSpy)

      const storageManager = manager.getStorageManager()
      vi.spyOn(storageManager, 'createSession').mockRejectedValueOnce(new Error('Storage error'))

      await expect(manager.startSession('/test/project')).rejects.toThrow()
      expect(errorSpy).toHaveBeenCalled()
    })
  })

  describe('event System', () => {
    beforeEach(async () => {
      await manager.initialize()
    })

    it('should forward session events', async () => {
      const eventSpy = vi.fn()
      manager.on('session:start', eventSpy)

      await manager.startSession('/test/project')
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should support multiple event listeners', async () => {
      const spy1 = vi.fn()
      const spy2 = vi.fn()

      manager.on('session:start', spy1)
      manager.on('session:start', spy2)

      await manager.startSession('/test/project')
      expect(spy1).toHaveBeenCalled()
      expect(spy2).toHaveBeenCalled()
    })
  })

  describe('subsystem Access', () => {
    it('should provide access to storage manager', () => {
      const storageManager = manager.getStorageManager()
      expect(storageManager).toBeDefined()
    })

    it('should provide access to session manager', () => {
      const sessionManager = manager.getSessionManager()
      expect(sessionManager).toBeDefined()
    })

    it('should provide access to summarizer', () => {
      const summarizer = manager.getSummarizer()
      expect(summarizer).toBeDefined()
    })

    it('should provide access to config manager', () => {
      const configManager = manager.getConfigManager()
      expect(configManager).toBeDefined()
    })
  })
})
