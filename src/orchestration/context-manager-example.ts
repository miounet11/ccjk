/**
 * Context Manager Usage Examples
 * Demonstrates compression effectiveness and usage patterns
 */

import { OrchestrationContextManager } from './context-manager'
import type { Message, SessionData } from '../types/orchestration'

/**
 * Example 1: Basic Compression
 */
async function basicCompressionExample() {
  const manager = new OrchestrationContextManager()

  // Create sample conversation
  const messages: Message[] = [
    { id: '1', role: 'user', content: 'How do I implement authentication in TypeScript?', timestamp: Date.now() - 10000 },
    { id: '2', role: 'assistant', content: 'I recommend using JWT tokens with bcrypt for password hashing...', timestamp: Date.now() - 9000 },
    { id: '3', role: 'user', content: 'Can you show me the code?', timestamp: Date.now() - 8000 },
    { id: '4', role: 'assistant', content: '```typescript\nimport jwt from "jsonwebtoken"\n```', timestamp: Date.now() - 7000 },
    { id: '5', role: 'user', content: 'We decided to use this approach', timestamp: Date.now() - 6000 },
  ]

  // Compress
  const result = await manager.compress(messages, {
    keepRecentN: 2,
    preserveCode: true,
    preserveDecisions: true,
  })

  console.log('Basic Compression Results:')
  console.log(`Original messages: ${result.originalMessageCount}`)
  console.log(`Retained messages: ${result.retainedMessageCount}`)
  console.log(`Original tokens: ${result.metadata.originalTokens}`)
  console.log(`Compressed tokens: ${result.metadata.compressedTokens}`)
  console.log(`Compression ratio: ${(result.metadata.compressionRatio * 100).toFixed(2)}%`)
  console.log(`Processing time: ${result.metadata.compressionTime}ms`)
  console.log(`\nSummary: ${result.summary}`)
  console.log(`\nKey points: ${result.keyPoints.length}`)
  console.log(`Code snippets: ${result.codeSnippets.length}`)
  console.log(`Decisions: ${result.decisions.length}`)
}

/**
 * Example 2: Large Conversation Compression
 */
async function largeConversationExample() {
  const manager = new OrchestrationContextManager()

  // Simulate 100-message conversation
  const messages: Message[] = Array.from({ length: 100 }, (_, i) => ({
    id: `${i}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i}: This is a detailed message with technical content about implementing features, debugging issues, and making architectural decisions. ${'x'.repeat(100)}`,
    timestamp: Date.now() - (100 - i) * 1000,
  }))

  const startTime = Date.now()
  const result = await manager.compress(messages, {
    strategy: 'aggressive',
  })
  const duration = Date.now() - startTime

  console.log('\nLarge Conversation Compression:')
  console.log(`Messages: ${result.originalMessageCount}`)
  console.log(`Original tokens: ${result.metadata.originalTokens}`)
  console.log(`Compressed tokens: ${result.metadata.compressedTokens}`)
  console.log(`Tokens saved: ${result.metadata.originalTokens - result.metadata.compressedTokens}`)
  console.log(`Compression ratio: ${(result.metadata.compressionRatio * 100).toFixed(2)}%`)
  console.log(`Processing time: ${duration}ms`)
  console.log(`Performance: ${duration < 2000 ? '✓ PASS' : '✗ FAIL'} (target: < 2000ms)`)
}

/**
 * Example 3: Session Persistence
 */
async function sessionPersistenceExample() {
  const manager = new OrchestrationContextManager()

  // Create and compress conversation
  const messages: Message[] = [
    { id: '1', role: 'user', content: 'Let\'s build a REST API', timestamp: Date.now() },
    { id: '2', role: 'assistant', content: 'Great! We\'ll use Express and TypeScript', timestamp: Date.now() },
  ]

  const compressed = await manager.compress(messages)

  // Create session
  const session: SessionData = {
    id: 'demo-session',
    projectPath: '/demo/project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages,
    compressed,
    totalTokens: compressed.metadata.originalTokens,
    status: 'compressed',
  }

  // Persist
  const filepath = await manager.persistSession(session)
  console.log(`\nSession persisted to: ${filepath}`)

  // Restore
  const restored = await manager.restoreSession('demo-session')
  console.log(`Session restored: ${restored?.sessionId}`)
  console.log(`Messages: ${restored?.messages.length}`)
  console.log(`Total tokens: ${restored?.totalTokens}`)

  // Cleanup
  manager.deleteSession('demo-session')
}

/**
 * Example 4: Compression Strategies Comparison
 */
async function strategyComparisonExample() {
  const manager = new OrchestrationContextManager()

  const messages: Message[] = Array.from({ length: 50 }, (_, i) => ({
    id: `${i}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i}: ${'x'.repeat(150)}`,
    timestamp: Date.now() - (50 - i) * 1000,
  }))

  console.log('\nStrategy Comparison:')

  for (const strategy of ['aggressive', 'balanced', 'conservative'] as const) {
    const result = await manager.compress(messages, { strategy })
    console.log(`\n${strategy.toUpperCase()}:`)
    console.log(`  Compression ratio: ${(result.metadata.compressionRatio * 100).toFixed(2)}%`)
    console.log(`  Tokens saved: ${result.metadata.originalTokens - result.metadata.compressedTokens}`)
    console.log(`  Strategy used: ${result.metadata.strategy}`)
  }
}

/**
 * Example 5: Token Estimation
 */
async function tokenEstimationExample() {
  const manager = new OrchestrationContextManager()

  const messages: Message[] = [
    { id: '1', role: 'user', content: 'Hello world', timestamp: Date.now() },
    { id: '2', role: 'assistant', content: '你好世界', timestamp: Date.now() },
    { id: '3', role: 'system', content: 'System message', timestamp: Date.now() },
  ]

  const estimate = manager.getTokenEstimate(messages)

  console.log('\nToken Estimation:')
  console.log(`Total tokens: ${estimate.total}`)
  console.log(`By role:`)
  console.log(`  User: ${estimate.byRole.user}`)
  console.log(`  Assistant: ${estimate.byRole.assistant}`)
  console.log(`  System: ${estimate.byRole.system}`)
  console.log(`Average per message: ${estimate.averagePerMessage.toFixed(2)}`)
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('='.repeat(60))
  console.log('Context Manager Examples')
  console.log('='.repeat(60))

  await basicCompressionExample()
  await largeConversationExample()
  await sessionPersistenceExample()
  await strategyComparisonExample()
  await tokenEstimationExample()

  console.log('\n' + '='.repeat(60))
  console.log('All examples completed!')
  console.log('='.repeat(60))
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error)
}

export {
  basicCompressionExample,
  largeConversationExample,
  sessionPersistenceExample,
  strategyComparisonExample,
  tokenEstimationExample,
  runAllExamples,
}
