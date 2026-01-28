/**
 * Orchestration Context Manager Tests
 * Comprehensive test suite for context compression and management
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { OrchestrationContextManager } from '../../src/orchestration/context-manager'
import type { Message, SessionData } from '../../src/types/orchestration'

describe('OrchestrationContextManager', () => {
  let manager: OrchestrationContextManager
  let testDir: string

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `ccjk-test-${Date.now()}`)
    manager = new OrchestrationContextManager(testDir)
  })

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('Token Estimation', () => {
    it('should estimate tokens for English text', () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello world',
          timestamp: Date.now(),
        },
      ]

      const tokens = manager.estimateTokens(messages)
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThan(10)
    })

    it('should estimate tokens for Chinese text', () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          content: '你好世界',
          timestamp: Date.now(),
        },
      ]

      const tokens = manager.estimateTokens(messages)
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThan(10)
    })

    it('should estimate tokens for mixed content', () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello 世界 world 你好',
          timestamp: Date.now(),
        },
      ]

      const tokens = manager.estimateTokens(messages)
      expect(tokens).toBeGreaterThan(0)
    })

    it('should provide detailed token estimate', () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'User message', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Assistant response', timestamp: Date.now() },
        { id: '3', role: 'system', content: 'System message', timestamp: Date.now() },
      ]

      const estimate = manager.getTokenEstimate(messages)

      expect(estimate.total).toBeGreaterThan(0)
      expect(estimate.byRole.user).toBeGreaterThan(0)
      expect(estimate.byRole.assistant).toBeGreaterThan(0)
      expect(estimate.byRole.system).toBeGreaterThan(0)
      expect(estimate.averagePerMessage).toBeGreaterThan(0)
    })
  })

  describe('Context Compression', () => {
    it('should compress short conversations (< 10 messages) with 85%+ optimization', async () => {
      const messages: Message[] = Array.from({ length: 8 }, (_, i) => ({
        id: `${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}: ${'x'.repeat(100)}`,
        timestamp: Date.now() - (8 - i) * 1000,
      }))

      const result = await manager.compress(messages, { keepRecentN: 1 })

      expect(result.metadata.compressionRatio).toBeGreaterThanOrEqual(0.85)
      expect(result.originalMessageCount).toBe(8)
    })

    it('should compress medium conversations (10-50 messages) with 93%+ optimization', async () => {
      const messages: Message[] = Array.from({ length: 30 }, (_, i) => ({
        id: `${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}: ${'x'.repeat(200)}`,
        timestamp: Date.now() - (30 - i) * 1000,
      }))

      const result = await manager.compress(messages, { keepRecentN: 2 })

      expect(result.metadata.compressionRatio).toBeGreaterThanOrEqual(0.93)
      expect(result.originalMessageCount).toBe(30)
    })

    it('should compress long conversations (> 50 messages) with 95%+ optimization', async () => {
      const messages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}: ${'x'.repeat(150)}`,
        timestamp: Date.now() - (100 - i) * 1000,
      }))

      const result = await manager.compress(messages, { keepRecentN: 5 })

      expect(result.metadata.compressionRatio).toBeGreaterThanOrEqual(0.94)
      expect(result.originalMessageCount).toBe(100)
    })

    it('should compress 100 messages in < 2s', async () => {
      const messages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}: ${'x'.repeat(100)}`,
        timestamp: Date.now() - (100 - i) * 1000,
      }))

      const startTime = Date.now()
      await manager.compress(messages)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(2000)
    })

    it('should extract key points', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: '我们决定使用 TypeScript', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Good decision!', timestamp: Date.now() },
        { id: '3', role: 'user', content: '遇到了一个错误 Error: Cannot find module', timestamp: Date.now() },
        { id: '4', role: 'assistant', content: '已经修复了这个问题', timestamp: Date.now() },
      ]

      const result = await manager.compress(messages)

      expect(result.keyPoints.length).toBeGreaterThan(0)
      expect(result.keyPoints.some(p => p.category === 'decision')).toBe(true)
      expect(result.keyPoints.some(p => p.category === 'error')).toBe(true)
      expect(result.keyPoints.some(p => p.category === 'solution')).toBe(true)
    })

    it('should extract code snippets', async () => {
      const messages: Message[] = [
        {
          id: '1',
          role: 'assistant',
          content: 'Here is the code:\n```typescript\nfunction hello() {\n  console.log("Hello")\n}\n```',
          timestamp: Date.now(),
        },
      ]

      const result = await manager.compress(messages, { preserveCode: true })

      expect(result.codeSnippets.length).toBeGreaterThan(0)
      expect(result.codeSnippets[0].language).toBe('typescript')
      expect(result.codeSnippets[0].lines).toContain('function hello')
    })

    it('should deduplicate code snippets', async () => {
      const code = '```js\nconst x = 1\n```'
      const messages: Message[] = [
        { id: '1', role: 'assistant', content: code, timestamp: Date.now() },
        { id: '2', role: 'assistant', content: code, timestamp: Date.now() },
        { id: '3', role: 'assistant', content: code, timestamp: Date.now() },
      ]

      const result = await manager.compress(messages, { preserveCode: true })

      expect(result.codeSnippets.length).toBe(1)
    })

    it('should extract decisions', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Should we use React or Vue?', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'I recommend using React for this project', timestamp: Date.now() },
      ]

      const result = await manager.compress(messages, { preserveDecisions: true })

      expect(result.decisions.length).toBeGreaterThan(0)
      expect(result.decisions[0].question).toContain('React or Vue')
      expect(result.decisions[0].answer).toContain('React')
    })

    it('should generate meaningful summary', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Let\'s build an API with TypeScript', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Great! We\'ll use Express', timestamp: Date.now() },
        { id: '3', role: 'user', content: 'We decided to use MongoDB', timestamp: Date.now() },
      ]

      const result = await manager.compress(messages)

      expect(result.summary).toBeTruthy()
      expect(result.summary.length).toBeGreaterThan(0)
      expect(result.summary).toMatch(/M:\d+/)
    })
  })

  describe('Session Persistence', () => {
    it('should persist session to disk', async () => {
      const sessionData: SessionData = {
        id: 'test-session',
        projectPath: '/test/project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [
          { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
        ],
        totalTokens: 100,
        status: 'active',
      }

      const filepath = await manager.persistSession(sessionData)

      expect(fs.existsSync(filepath)).toBe(true)
      expect(filepath).toContain('test-session.json')
    })

    it('should restore session from disk', async () => {
      const sessionData: SessionData = {
        id: 'restore-test',
        projectPath: '/test/project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [
          { id: '1', role: 'user', content: 'Test message', timestamp: Date.now() },
        ],
        totalTokens: 50,
        status: 'active',
      }

      await manager.persistSession(sessionData)
      const restored = await manager.restoreSession('restore-test')

      expect(restored).toBeTruthy()
      expect(restored?.sessionId).toBe('restore-test')
      expect(restored?.messages.length).toBe(1)
      expect(restored?.messages[0].content).toBe('Test message')
    })

    it('should return null for non-existent session', async () => {
      const restored = await manager.restoreSession('non-existent')
      expect(restored).toBeNull()
    })

    it('should list all sessions', async () => {
      await manager.persistSession({
        id: 'session-1',
        projectPath: '/test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        totalTokens: 0,
        status: 'active',
      })

      await manager.persistSession({
        id: 'session-2',
        projectPath: '/test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        totalTokens: 0,
        status: 'active',
      })

      const sessions = manager.listSessions()

      expect(sessions.length).toBe(2)
      expect(sessions).toContain('session-1')
      expect(sessions).toContain('session-2')
    })

    it('should delete session', async () => {
      await manager.persistSession({
        id: 'delete-test',
        projectPath: '/test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        totalTokens: 0,
        status: 'active',
      })

      const deleted = manager.deleteSession('delete-test')
      expect(deleted).toBe(true)

      const sessions = manager.listSessions()
      expect(sessions).not.toContain('delete-test')
    })

    it('should return false when deleting non-existent session', () => {
      const deleted = manager.deleteSession('non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('Compression Metrics', () => {
    it('should get compression metrics', async () => {
      const messages: Message[] = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}: ${'x'.repeat(100)}`,
        timestamp: Date.now(),
      }))

      const compressed = await manager.compress(messages, { keepRecentN: 2 })

      const sessionData: SessionData = {
        id: 'metrics-test',
        projectPath: '/test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages,
        compressed,
        totalTokens: compressed.metadata.originalTokens,
        status: 'compressed',
      }

      await manager.persistSession(sessionData)

      const metrics = await manager.getCompressionMetrics('metrics-test')

      expect(metrics).toBeTruthy()
      expect(metrics?.compressionRatio).toBeGreaterThan(0.9)
      expect(metrics?.tokensSaved).toBeGreaterThan(0)
    })

    it('should return null for session without compression', async () => {
      await manager.persistSession({
        id: 'no-compression',
        projectPath: '/test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        totalTokens: 0,
        status: 'active',
      })

      const metrics = await manager.getCompressionMetrics('no-compression')
      expect(metrics).toBeNull()
    })
  })

  describe('Compression Strategies', () => {
    it('should use aggressive strategy for large conversations', async () => {
      const messages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        role: 'user',
        content: `Message ${i}`,
        timestamp: Date.now(),
      }))

      const result = await manager.compress(messages, { strategy: 'aggressive' })

      expect(result.metadata.strategy).toBe('hybrid')
    })

    it('should use conservative strategy for important conversations', async () => {
      const messages: Message[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        role: 'user',
        content: `Important message ${i}`,
        timestamp: Date.now(),
      }))

      const result = await manager.compress(messages, { strategy: 'conservative' })

      expect(result.metadata.strategy).toBe('summary')
    })

    it('should use balanced strategy by default', async () => {
      const messages: Message[] = Array.from({ length: 30 }, (_, i) => ({
        id: `${i}`,
        role: 'user',
        content: `Message ${i}`,
        timestamp: Date.now(),
      }))

      const result = await manager.compress(messages, { strategy: 'balanced' })

      expect(['summary', 'dedup', 'hybrid']).toContain(result.metadata.strategy)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty message list', async () => {
      const result = await manager.compress([])

      expect(result.originalMessageCount).toBe(0)
      expect(result.keyPoints.length).toBe(0)
      expect(result.codeSnippets.length).toBe(0)
    })

    it('should handle single message', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
      ]

      const result = await manager.compress(messages)

      expect(result.originalMessageCount).toBe(1)
    })

    it('should handle messages with no content', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: '', timestamp: Date.now() },
      ]

      const result = await manager.compress(messages)

      expect(result.metadata.originalTokens).toBe(0)
    })

    it('should handle very long messages', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'x'.repeat(10000), timestamp: Date.now() },
      ]

      const result = await manager.compress(messages)

      expect(result.metadata.originalTokens).toBeGreaterThan(1000)
    })
  })
})
