/**
 * Context Compression System - End-to-End Integration Tests
 * Tests the complete flow from message input to compression and retrieval
 */

import type {
  StorageManager,
  SyncQueueManager,
} from '../../src/utils/context'
import type {
  FCLogEntry,
} from '../../src/utils/context/storage-types'
import * as fs from 'node:fs'

import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ConfigManager,
  createStorageManager,
  createSyncQueueManager,
  estimateTokens,
  generateProjectHash,
  getProjectIdentity,
} from '../../src/utils/context'
import { SessionManager } from '../../src/utils/context/session-manager'

describe('context Compression System - Integration Tests', () => {
  let tempDir: string
  let configManager: ConfigManager
  let storageManager: StorageManager
  let sessionManager: SessionManager
  let syncQueue: SyncQueueManager

  beforeEach(async () => {
    // Create temp directory for test data
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccjk-integration-'))

    // Initialize all managers with correct signatures
    configManager = new ConfigManager(path.join(tempDir, 'config.json'))
    storageManager = createStorageManager(tempDir)
    await storageManager.initialize()

    // Initialize session manager with config (disable auto-summarize for testing)
    sessionManager = new SessionManager({
      contextThreshold: 0.8,
      maxContextTokens: 200000,
      summaryModel: 'haiku',
      autoSummarize: false, // Disable for testing to avoid API calls
    })

    // Initialize sync queue with directory path
    syncQueue = createSyncQueueManager(path.join(tempDir, 'sync-queue'))
    await syncQueue.initialize()
  })

  afterEach(async () => {
    // Cleanup
    sessionManager?.completeSession()

    // Remove temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }

    vi.restoreAllMocks()
  })

  describe('full Workflow Integration', () => {
    it('should create session and track function calls', async () => {
      // 1. Generate project hash (async function returns ProjectIdentity)
      const projectPath = '/test/project'
      const projectIdentity = await generateProjectHash(projectPath)
      expect(projectIdentity).toBeTruthy()
      expect(typeof projectIdentity.hash).toBe('string')

      // 2. Create new session using SessionManager
      const session = sessionManager.createSession(projectPath)
      expect(session).toBeTruthy()
      expect(session.id).toBeTruthy()
      expect(session.projectPath).toBe(projectPath)

      // 3. Add function calls to session (3 arguments: name, args, result)
      await sessionManager.addFunctionCall(
        'Read',
        { file_path: '/test/file.ts' },
        'const x = 1;',
      )

      await sessionManager.addFunctionCall(
        'Write',
        { file_path: '/test/file.ts', content: 'const x = 2;' },
        'File written successfully',
      )

      // 4. Verify session state
      const currentSession = sessionManager.getCurrentSession()
      expect(currentSession).toBeTruthy()
      expect(currentSession?.fcCount).toBe(2)
      expect(currentSession?.tokenCount).toBeGreaterThan(0)
    })

    it('should track token usage and context threshold', async () => {
      const projectPath = '/test/project'
      sessionManager.createSession(projectPath)

      // Add many function calls to increase token count
      const longOutput = 'This is a test output with some content. '.repeat(100)

      for (let i = 0; i < 10; i++) {
        await sessionManager.addFunctionCall(
          'Read',
          { file_path: `/test/file${i}.ts` },
          `${longOutput} File ${i}`,
        )
      }

      // Check context usage
      const usage = sessionManager.getContextUsage()
      expect(usage).toBeGreaterThan(0)

      // Check threshold level
      const level = sessionManager.getThresholdLevel()
      expect(['normal', 'warning', 'critical']).toContain(level)

      // Check remaining tokens
      const remaining = sessionManager.getRemainingTokens()
      expect(remaining).toBeGreaterThan(0)
    })

    it('should generate session summary', async () => {
      const projectPath = '/test/project'
      sessionManager.createSession(projectPath)

      // Add some function calls
      await sessionManager.addFunctionCall(
        'Read',
        { file_path: '/test/file.ts' },
        'const x = 1;',
      )

      await sessionManager.addFunctionCall(
        'Grep',
        { pattern: 'TODO', path: '/test' },
        'Found 5 matches',
      )

      // Generate summary
      const summary = sessionManager.generateSessionSummary()
      expect(summary).toBeTruthy()
      expect(summary.length).toBeGreaterThan(0)
    })

    it('should complete session and archive it', async () => {
      const projectPath = '/test/project'
      const session = sessionManager.createSession(projectPath)
      const sessionId = session.id

      // Add a function call
      await sessionManager.addFunctionCall(
        'Read',
        { file_path: '/test/file.ts' },
        'const x = 1;',
      )

      // Complete the session
      const completedSession = sessionManager.completeSession()
      expect(completedSession).toBeTruthy()
      expect(completedSession?.status).toBe('completed')

      // Current session should be null
      expect(sessionManager.getCurrentSession()).toBeNull()

      // Session should be in history
      const retrievedSession = sessionManager.getSession(sessionId)
      expect(retrievedSession).toBeTruthy()
      expect(retrievedSession?.id).toBe(sessionId)
    })

    it('should manage multiple sessions in history', async () => {
      // Create and complete multiple sessions
      for (let i = 0; i < 3; i++) {
        sessionManager.createSession(`/test/project${i}`)

        await sessionManager.addFunctionCall(
          'Read',
          { file_path: `/test/file${i}.ts` },
          `Content ${i}`,
        )

        sessionManager.completeSession()
      }

      // Get all sessions
      const allSessions = sessionManager.getAllSessions()
      expect(allSessions).toHaveLength(3)

      // Get sessions by project
      const projectSessions = sessionManager.getSessionsByProject('/test/project1')
      expect(projectSessions).toHaveLength(1)
      expect(projectSessions[0].projectPath).toBe('/test/project1')
    })

    it('should handle config updates', () => {
      const initialConfig = sessionManager.getConfig()
      expect(initialConfig.contextThreshold).toBe(0.8)

      // Update config
      sessionManager.updateConfig({
        contextThreshold: 0.9,
        maxContextTokens: 150000,
      })

      const updatedConfig = sessionManager.getConfig()
      expect(updatedConfig.contextThreshold).toBe(0.9)
      expect(updatedConfig.maxContextTokens).toBe(150000)
    })

    it('should clear session history', async () => {
      // Create and complete a session
      sessionManager.createSession('/test/project')
      await sessionManager.addFunctionCall(
        'Read',
        { file_path: '/test/file.ts' },
        'content',
      )
      sessionManager.completeSession()

      // Verify session exists
      expect(sessionManager.getAllSessions()).toHaveLength(1)

      // Clear history
      sessionManager.clearHistory()

      // Verify history is cleared
      expect(sessionManager.getAllSessions()).toHaveLength(0)
    })
  })

  describe('token Estimation Integration', () => {
    it('should estimate tokens for various content types', () => {
      // Simple text
      const simpleTokens = estimateTokens('Hello, world!')
      expect(simpleTokens).toBeGreaterThan(0)

      // Code content
      const codeContent = `
        function fibonacci(n: number): number {
          if (n <= 1) return n;
          return fibonacci(n - 1) + fibonacci(n - 2);
        }
      `
      const codeTokens = estimateTokens(codeContent)
      expect(codeTokens).toBeGreaterThan(simpleTokens)

      // Long content
      const longContent = 'This is a test sentence. '.repeat(100)
      const longTokens = estimateTokens(longContent)
      expect(longTokens).toBeGreaterThan(codeTokens)
    })

    it('should handle empty and edge cases', () => {
      expect(estimateTokens('')).toBe(0)
      expect(estimateTokens('   ')).toBeGreaterThanOrEqual(0)
      expect(estimateTokens('a')).toBeGreaterThan(0)
    })

    it('should handle Chinese characters', () => {
      const chineseText = '你好世界'
      const englishText = 'Hello World'

      const chineseTokens = estimateTokens(chineseText)
      const englishTokens = estimateTokens(englishText)

      // Both should have tokens
      expect(chineseTokens).toBeGreaterThan(0)
      expect(englishTokens).toBeGreaterThan(0)
    })
  })

  describe('config Manager Integration', () => {
    it('should save and load configuration', async () => {
      // Load default config
      const config = await configManager.load()
      expect(config).toBeTruthy()
      expect(config.enabled).toBeDefined()

      // Update config
      configManager.update({
        contextThreshold: 50000,
        summaryModel: 'haiku',
      })

      // Save config
      await configManager.save()

      // Create new manager and load
      const newConfigManager = new ConfigManager(path.join(tempDir, 'config.json'))
      const loadedConfig = await newConfigManager.load()

      expect(loadedConfig.contextThreshold).toBe(50000)
      expect(loadedConfig.summaryModel).toBe('haiku')
    })

    it('should provide default values', async () => {
      const config = await configManager.load()
      expect(config.enabled).toBeDefined()
      expect(config.autoSummarize).toBeDefined()
      expect(config.contextThreshold).toBeDefined()
      expect(config.maxContextTokens).toBeDefined()
    })
  })

  describe('storage Manager Integration', () => {
    it('should create and retrieve sessions', async () => {
      // Create session via storage manager
      const session = await storageManager.createSession(tempDir, 'Test session')

      expect(session).toBeTruthy()
      expect(session.meta.id).toBeTruthy()
      expect(session.meta.description).toBe('Test session')
      expect(session.meta.status).toBe('active')

      // Get session (sessionId, projectHash)
      const projectIdentity = await getProjectIdentity(tempDir)
      const retrieved = await storageManager.getSession(session.meta.id, projectIdentity.hash)

      expect(retrieved).toBeTruthy()
      expect(retrieved?.meta.id).toBe(session.meta.id)
    })

    it('should append and read FC logs', async () => {
      // Create session first
      const session = await storageManager.createSession(tempDir, 'FC Log Test')
      const projectIdentity = await getProjectIdentity(tempDir)

      // Create FC log entry
      const fcLog: FCLogEntry = {
        ts: new Date().toISOString(),
        id: `fc-${Date.now()}`,
        fc: 'Read',
        args: { file_path: '/test/file.ts' },
        result: 'file contents here',
        tokens: 150,
        duration: 100,
        summary: 'Read file /test/file.ts',
        status: 'success',
      }

      // Append FC log (sessionId, entry, projectHash?)
      await storageManager.appendFCLog(session.meta.id, fcLog, projectIdentity.hash)

      // Read FC logs using getFCLogsArray
      const logs = await storageManager.getFCLogsArray(session.meta.id, undefined, projectIdentity.hash)

      expect(logs).toHaveLength(1)
      expect(logs[0].fc).toBe('Read')
      expect(logs[0].status).toBe('success')
    })

    it('should list sessions by project', async () => {
      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        await storageManager.createSession(tempDir, `Session ${i}`)
      }

      // List sessions
      const projectIdentity = await getProjectIdentity(tempDir)
      const sessions = await storageManager.listSessions({ projectHash: projectIdentity.hash })

      expect(sessions.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('sync Queue Integration', () => {
    it('should queue and process sync operations', async () => {
      // Add items to sync queue
      const item1 = await syncQueue.enqueue({
        type: 'session',
        sessionId: 'test-session-1',
        data: { test: true },
      })

      const item2 = await syncQueue.enqueue({
        type: 'fc-log',
        sessionId: 'test-session-1',
        data: { test: true },
      })

      expect(item1.id).toBeTruthy()
      expect(item2.id).toBeTruthy()

      // Get queue stats
      const stats = await syncQueue.getStats()
      expect(stats.pending).toBeGreaterThanOrEqual(2)
    })

    it('should dequeue items in order', async () => {
      // Clear any existing items first by draining the queue
      let existing = await syncQueue.dequeue()
      while (existing) {
        await syncQueue.markSynced(existing.id)
        existing = await syncQueue.dequeue()
      }

      // Use unique marker to identify our test items
      const testMarker = `test-${Date.now()}`

      // Add items with unique marker
      // Add small delay between enqueues to ensure different timestamps
      await syncQueue.enqueue({
        type: 'session',
        sessionId: `${testMarker}-1`,
        data: { order: 1, marker: testMarker },
      })

      // Wait 10ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10))

      await syncQueue.enqueue({
        type: 'session',
        sessionId: `${testMarker}-2`,
        data: { order: 2, marker: testMarker },
      })

      // Dequeue first item
      const first = await syncQueue.dequeue()
      expect(first).toBeTruthy()
      expect((first?.data as any).marker).toBe(testMarker)
      expect((first?.data as any).order).toBe(1)

      // Mark first as synced so it's no longer pending
      if (first) {
        await syncQueue.markSynced(first.id)
      }

      // Now dequeue should return second item
      const second = await syncQueue.dequeue()
      expect(second).toBeTruthy()
      expect((second?.data as any).marker).toBe(testMarker)
      expect((second?.data as any).order).toBe(2)
    })

    it('should update item status', async () => {
      const item = await syncQueue.enqueue({
        type: 'session',
        sessionId: 'test-status',
        data: {},
      })

      // Mark as syncing
      const syncing = await syncQueue.markSyncing(item.id)
      expect(syncing?.status).toBe('syncing')

      // Mark as synced
      const synced = await syncQueue.markSynced(item.id)
      expect(synced?.status).toBe('synced')
    })

    it('should handle failed items with retry', async () => {
      const item = await syncQueue.enqueue({
        type: 'session',
        sessionId: 'test-fail',
        data: {},
      })

      // Mark as failed
      const failed = await syncQueue.markFailed(item.id, 'Network error')
      expect(failed?.status).toBe('failed')
      expect(failed?.lastError).toBe('Network error')
      expect(failed?.retries).toBe(1)
    })

    it('should clear queue', async () => {
      // Add items
      await syncQueue.enqueue({ type: 'session', sessionId: 'test-1', data: {} })
      await syncQueue.enqueue({ type: 'session', sessionId: 'test-2', data: {} })

      // Clear queue
      const cleared = await syncQueue.clearQueue()
      expect(cleared).toBeGreaterThanOrEqual(2)

      // Verify empty
      const stats = await syncQueue.getStats()
      expect(stats.total).toBe(0)
    })
  })

  describe('project Hash Integration', () => {
    it('should generate consistent hashes for same path', async () => {
      const identity1 = await generateProjectHash('/test/project')
      const identity2 = await generateProjectHash('/test/project')
      expect(identity1.hash).toBe(identity2.hash)
    })

    it('should generate different hashes for different paths', async () => {
      const identity1 = await generateProjectHash('/test/project1')
      const identity2 = await generateProjectHash('/test/project2')
      expect(identity1.hash).not.toBe(identity2.hash)
    })

    it('should get project identity with path and hash', async () => {
      const identity = await getProjectIdentity(tempDir)

      expect(identity).toBeTruthy()
      expect(identity.hash).toBeTruthy()
      expect(identity.path).toBe(tempDir)
    })

    it('should handle edge cases', async () => {
      const empty = await generateProjectHash('')
      expect(empty.hash).toBeTruthy()

      const root = await generateProjectHash('/')
      expect(root.hash).toBeTruthy()

      const long = await generateProjectHash('/a/very/long/path/to/project')
      expect(long.hash).toBeTruthy()
    })
  })

  describe('end-to-End Workflow', () => {
    it('should complete full compression workflow', async () => {
      // 1. Create session
      const projectPath = tempDir
      const session = sessionManager.createSession(projectPath)
      expect(session).toBeTruthy()

      // 2. Simulate multiple function calls
      const functionCalls = [
        { name: 'Read', args: { file: 'a.ts' }, result: 'content a' },
        { name: 'Grep', args: { pattern: 'test' }, result: 'matches' },
        { name: 'Write', args: { file: 'b.ts' }, result: 'written' },
        { name: 'Bash', args: { cmd: 'npm test' }, result: 'passed' },
      ]

      for (const fc of functionCalls) {
        await sessionManager.addFunctionCall(fc.name, fc.args, fc.result)
      }

      // 3. Check session state
      const currentSession = sessionManager.getCurrentSession()
      expect(currentSession?.fcCount).toBe(4)
      expect(currentSession?.tokenCount).toBeGreaterThan(0)

      // 4. Generate summary
      const summary = sessionManager.generateSessionSummary()
      expect(summary).toContain('Session')

      // 5. Complete session
      const completed = sessionManager.completeSession()
      expect(completed?.status).toBe('completed')

      // 6. Verify session is archived
      const archived = sessionManager.getSession(session.id)
      expect(archived).toBeTruthy()
    })

    it('should handle concurrent operations', async () => {
      // Create session
      sessionManager.createSession(tempDir)

      // Add multiple function calls concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        sessionManager.addFunctionCall(
          `Tool${i}`,
          { index: i },
          `Result ${i}`,
        ))

      await Promise.all(promises)

      // Verify all were added
      const session = sessionManager.getCurrentSession()
      expect(session?.fcCount).toBe(10)
    })
  })
})
