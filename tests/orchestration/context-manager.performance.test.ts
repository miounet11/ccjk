/**
 * Performance Test for Context Manager
 * Validates compression effectiveness and speed
 */

import type { Message } from '../../src/types/orchestration'
import { describe, expect, it } from 'vitest'
import { OrchestrationContextManager } from '../../src/orchestration/context-manager'

describe('context Manager Performance Tests', () => {
  const manager = new OrchestrationContextManager()

  describe('compression Effectiveness', () => {
    it('should achieve 94%+ compression for 100 messages', async () => {
      const messages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}: This is a detailed technical discussion about implementing features, debugging errors, and making architectural decisions. The conversation includes code examples, API discussions, and problem-solving strategies. ${'word '.repeat(20)}`,
        timestamp: Date.now() - (100 - i) * 1000,
      }))

      const result = await manager.compress(messages, { strategy: 'aggressive' })

      console.log(`\nPerformance Test - 100 Messages:`)
      console.log(`  Original tokens: ${result.metadata.originalTokens}`)
      console.log(`  Compressed tokens: ${result.metadata.compressedTokens}`)
      console.log(`  Compression ratio: ${(result.metadata.compressionRatio * 100).toFixed(2)}%`)
      console.log(`  Target: 94%+`)
      console.log(`  Status: ${result.metadata.compressionRatio >= 0.94 ? '✓ PASS' : '✗ FAIL'}`)

      expect(result.metadata.compressionRatio).toBeGreaterThanOrEqual(0.94)
    })

    it('should process 100 messages in < 2s', async () => {
      const messages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        role: 'user',
        content: `Message ${i}: ${'x'.repeat(200)}`,
        timestamp: Date.now() + i,
      }))

      const startTime = Date.now()
      await manager.compress(messages)
      const duration = Date.now() - startTime

      console.log(`\nSpeed Test - 100 Messages:`)
      console.log(`  Processing time: ${duration}ms`)
      console.log(`  Target: < 2000ms`)
      console.log(`  Status: ${duration < 2000 ? '✓ PASS' : '✗ FAIL'}`)

      expect(duration).toBeLessThan(2000)
    })

    it('should demonstrate scalability from 10 to 1000 messages', async () => {
      const sizes = [10, 50, 100, 500, 1000]

      console.log('\nScalability Test:')

      for (const size of sizes) {
        const messages: Message[] = Array.from({ length: size }, (_, i) => ({
          id: `${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}: ${'content '.repeat(10)}`,
          timestamp: Date.now() + i,
        }))

        const startTime = Date.now()
        const result = await manager.compress(messages)
        const duration = Date.now() - startTime

        console.log(`  ${size} messages:`)
        console.log(`    Time: ${duration}ms`)
        console.log(`    Ratio: ${(result.metadata.compressionRatio * 100).toFixed(2)}%`)
        console.log(`    Throughput: ${(size / (duration / 1000)).toFixed(0)} msg/s`)

        expect(duration).toBeLessThan(5000) // All should complete in < 5s
      }
    })
  })

  describe('compression Quality', () => {
    it('should preserve critical information (decisions, errors, solutions)', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'We decided to use TypeScript for type safety', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Excellent choice. TypeScript provides...', timestamp: Date.now() },
        { id: '3', role: 'user', content: 'Error: Cannot find module @types/node', timestamp: Date.now() },
        { id: '4', role: 'assistant', content: 'Solution: Run npm install --save-dev @types/node', timestamp: Date.now() },
        { id: '5', role: 'user', content: 'Great, that fixed it!', timestamp: Date.now() },
      ]

      const result = await manager.compress(messages, {
        preserveDecisions: true,
        preserveCode: true,
      })

      console.log('\nQuality Test - Information Preservation:')
      console.log(`  Decisions extracted: ${result.decisions.length}`)
      console.log(`  Key points extracted: ${result.keyPoints.length}`)
      console.log(`  Summary: ${result.summary}`)

      expect(result.keyPoints.length).toBeGreaterThan(0)
      expect(result.summary.length).toBeGreaterThan(0)
    })

    it('should deduplicate code snippets effectively', async () => {
      const code = '```typescript\nconst x = 1\n```'
      const messages: Message[] = [
        { id: '1', role: 'assistant', content: code, timestamp: Date.now() },
        { id: '2', role: 'assistant', content: code, timestamp: Date.now() },
        { id: '3', role: 'assistant', content: code, timestamp: Date.now() },
        { id: '4', role: 'assistant', content: code, timestamp: Date.now() },
        { id: '5', role: 'assistant', content: code, timestamp: Date.now() },
      ]

      const result = await manager.compress(messages, { preserveCode: true })

      console.log('\nDeduplication Test:')
      console.log(`  Original code blocks: 5`)
      console.log(`  After deduplication: ${result.codeSnippets.length}`)
      console.log(`  Reduction: ${((5 - result.codeSnippets.length) / 5 * 100).toFixed(0)}%`)

      expect(result.codeSnippets.length).toBe(1)
    })
  })

  describe('memory Efficiency', () => {
    it('should maintain low memory footprint', async () => {
      const messages: Message[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        role: 'user',
        content: `Message ${i}: ${'data '.repeat(50)}`,
        timestamp: Date.now() + i,
      }))

      const before = process.memoryUsage().heapUsed
      await manager.compress(messages)
      const after = process.memoryUsage().heapUsed

      const memoryUsed = (after - before) / 1024 / 1024 // Convert to MB

      console.log('\nMemory Efficiency Test - 1000 Messages:')
      console.log(`  Memory used: ${memoryUsed.toFixed(2)} MB`)
      console.log(`  Target: < 50 MB`)
      console.log(`  Status: ${memoryUsed < 50 ? '✓ PASS' : '✗ FAIL'}`)

      expect(memoryUsed).toBeLessThan(50)
    })
  })

  describe('real-World Scenarios', () => {
    it('should handle typical AI coding session', async () => {
      const messages: Message[] = [
        // Initial requirements
        { id: '1', role: 'user', content: 'I need to build a REST API with Node.js and TypeScript', timestamp: Date.now() - 3600000 },
        { id: '2', role: 'assistant', content: 'I recommend using Express with TypeScript for type safety', timestamp: Date.now() - 3590000 },

        // Technical discussion
        { id: '3', role: 'user', content: 'What about database?', timestamp: Date.now() - 3500000 },
        { id: '4', role: 'assistant', content: 'PostgreSQL with Prisma ORM is a solid choice', timestamp: Date.now() - 3490000 },

        // Implementation phase
        { id: '5', role: 'user', content: 'Show me the project structure', timestamp: Date.now() - 3000000 },
        { id: '6', role: 'assistant', content: 'Here\'s the recommended structure...', timestamp: Date.now() - 2990000 },

        // Errors encountered
        { id: '7', role: 'user', content: 'Error: Cannot find module express', timestamp: Date.now() - 2000000 },
        { id: '8', role: 'assistant', content: 'Run: npm install express', timestamp: Date.now() - 1990000 },

        // Decision made
        { id: '9', role: 'user', content: 'We decided to use JWT for authentication', timestamp: Date.now() - 1000000 },
        { id: '10', role: 'assistant', content: 'Good decision. JWT provides stateless authentication', timestamp: Date.now() - 990000 },

        // Solution provided
        { id: '11', role: 'user', content: 'How to handle errors?', timestamp: Date.now() - 500000 },
        { id: '12', role: 'assistant', content: 'Use error handling middleware with try-catch', timestamp: Date.now() - 490000 },

        // Code examples
        { id: '13', role: 'assistant', content: '```typescript\napp.use((err, req, res, next) => {\n  console.error(err.stack)\n  res.status(500).send("Something broke!")\n})\n```', timestamp: Date.now() - 400000 },
        { id: '14', role: 'user', content: 'Perfect, that works!', timestamp: Date.now() - 300000 },

        // More discussion...
        ...Array.from({ length: 50 }, (_, i) => ({
          id: `${15 + i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Additional discussion point ${i}: Exploring various implementation details and considerations`,
          timestamp: Date.now() - (50 - i) * 10000,
        })),
      ]

      const result = await manager.compress(messages, {
        strategy: 'balanced',
        preserveCode: true,
        preserveDecisions: true,
      })

      console.log('\nReal-World Scenario - AI Coding Session:')
      console.log(`  Total messages: ${result.originalMessageCount}`)
      console.log(`  Session duration: ~1 hour`)
      console.log(`  Original tokens: ${result.metadata.originalTokens}`)
      console.log(`  Compressed tokens: ${result.metadata.compressedTokens}`)
      console.log(`  Compression: ${(result.metadata.compressionRatio * 100).toFixed(2)}%`)
      console.log(`  Processing time: ${result.metadata.compressionTime}ms`)
      console.log(`  Key decisions extracted: ${result.decisions.length}`)
      console.log(`  Code snippets: ${result.codeSnippets.length}`)
      console.log(`  Key points: ${result.keyPoints.length}`)

      expect(result.metadata.compressionRatio).toBeGreaterThanOrEqual(0.85)
      expect(result.metadata.compressionTime).toBeLessThan(1000)
      expect(result.decisions.length).toBeGreaterThan(0)
    })
  })
})
