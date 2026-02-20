#!/usr/bin/env tsx
/**
 * FTS5 Search Performance Benchmark
 * Measures search performance and compares with traditional SQL queries
 */

import { existsSync, rmSync } from 'node:fs'
import { join } from 'pathe'
import { CompressionAlgorithm, CompressionStrategy } from '../src/context/types'
import type { CompressedContext } from '../src/context/types'
import { ContextPersistence } from '../src/context/persistence'

interface BenchmarkResult {
  operation: string
  iterations: number
  totalTime: number
  avgTime: number
  minTime: number
  maxTime: number
  resultsCount: number
}

/**
 * Generate sample contexts for benchmarking
 */
function generateSampleContexts(count: number): Array<{
  context: CompressedContext
  projectHash: string
  content: string
}> {
  const topics = [
    'authentication JWT tokens security OAuth2',
    'database migration PostgreSQL schema updates',
    'React component testing Jest library',
    'API endpoint documentation OpenAPI REST',
    'performance optimization caching lazy loading',
    'TypeScript type definitions interfaces generics',
    'Docker containerization deployment Kubernetes',
    'GraphQL queries mutations subscriptions',
    'WebSocket real-time communication',
    'Redis caching session storage',
  ]

  const contexts: Array<{
    context: CompressedContext
    projectHash: string
    content: string
  }> = []

  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length]
    const projectNum = (i % 5) + 1

    contexts.push({
      context: {
        id: `ctx-${i}`,
        compressed: `Compressed: ${topic} - context ${i}`,
        algorithm: CompressionAlgorithm.SEMANTIC,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000 + Math.floor(Math.random() * 500),
        compressedTokens: 300 + Math.floor(Math.random() * 200),
        compressionRatio: 0.6 + Math.random() * 0.2,
        compressedAt: Date.now() - Math.floor(Math.random() * 86400000 * 30), // Random within 30 days
      },
      projectHash: `project-${projectNum}`,
      content: `Full content about ${topic}. This is context number ${i} with detailed information about the topic. It includes implementation details, best practices, and code examples.`,
    })
  }

  return contexts
}

/**
 * Run benchmark for a specific operation
 */
function benchmark(
  name: string,
  operation: () => any,
  iterations: number,
): BenchmarkResult {
  const times: number[] = []
  let resultsCount = 0

  // Warm-up
  for (let i = 0; i < 3; i++) {
    operation()
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    const result = operation()
    const end = performance.now()
    times.push(end - start)

    if (i === 0 && Array.isArray(result)) {
      resultsCount = result.length
    }
  }

  const totalTime = times.reduce((a, b) => a + b, 0)
  const avgTime = totalTime / iterations
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)

  return {
    operation: name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    resultsCount,
  }
}

/**
 * Format benchmark result
 */
function formatResult(result: BenchmarkResult): string {
  return `
${result.operation}:
  Iterations: ${result.iterations}
  Total Time: ${result.totalTime.toFixed(2)}ms
  Avg Time: ${result.avgTime.toFixed(2)}ms
  Min Time: ${result.minTime.toFixed(2)}ms
  Max Time: ${result.maxTime.toFixed(2)}ms
  Results: ${result.resultsCount} items
  Throughput: ${(1000 / result.avgTime).toFixed(2)} ops/sec
  `
}

/**
 * Main benchmark runner
 */
async function main() {
  console.log('=== FTS5 Search Performance Benchmark ===')
  console.log()

  const testDbPath = join(process.cwd(), '.benchmark-fts5.db')

  // Clean up existing database
  if (existsSync(testDbPath)) {
    rmSync(testDbPath, { force: true })
  }

  const persistence = new ContextPersistence(testDbPath)

  // Generate and insert test data
  console.log('Generating test data...')
  const contextCounts = [100, 1000, 5000]

  for (const count of contextCounts) {
    console.log(`\n--- Dataset: ${count} contexts ---`)

    // Clear database
    persistence.close()
    if (existsSync(testDbPath)) {
      rmSync(testDbPath, { force: true })
    }
    if (existsSync(`${testDbPath}-wal`)) {
      rmSync(`${testDbPath}-wal`, { force: true })
    }
    if (existsSync(`${testDbPath}-shm`)) {
      rmSync(`${testDbPath}-shm`, { force: true })
    }

    const newPersistence = new ContextPersistence(testDbPath)

    const contexts = generateSampleContexts(count)
    console.log(`Inserting ${count} contexts...`)
    const insertStart = Date.now()
    for (const { context, projectHash, content } of contexts) {
      newPersistence.saveContext(context, projectHash, content)
    }
    const insertTime = Date.now() - insertStart
    console.log(`Insert completed in ${insertTime}ms (${(count / insertTime * 1000).toFixed(0)} contexts/sec)\n`)

    // Simulate access patterns for hot/warm/cold
    for (let i = 0; i < Math.min(10, count); i++) {
      for (let j = 0; j < 5; j++) {
        newPersistence.getContext(`ctx-${i}`)
      }
    }

    const results: BenchmarkResult[] = []

    // Benchmark 1: Single keyword search
    results.push(
      benchmark(
        'Single keyword search ("authentication")',
        () => newPersistence.searchContexts('authentication'),
        100,
      ),
    )

    // Benchmark 2: Multi-keyword search
    results.push(
      benchmark(
        'Multi-keyword search ("database migration")',
        () => newPersistence.searchContexts('database migration'),
        100,
      ),
    )

    // Benchmark 3: Phrase search
    results.push(
      benchmark(
        'Phrase search ("\"React component\"")',
        () => newPersistence.searchContexts('"React component"'),
        100,
      ),
    )

    // Benchmark 4: Boolean AND
    results.push(
      benchmark(
        'Boolean AND ("performance AND optimization")',
        () => newPersistence.searchContexts('performance AND optimization'),
        100,
      ),
    )

    // Benchmark 5: Boolean OR
    results.push(
      benchmark(
        'Boolean OR ("JWT OR OAuth2")',
        () => newPersistence.searchContexts('JWT OR OAuth2'),
        100,
      ),
    )

    // Benchmark 6: Complex query
    results.push(
      benchmark(
        'Complex query ("(authentication OR security) AND JWT")',
        () => newPersistence.searchContexts('(authentication OR security) AND JWT'),
        100,
      ),
    )

    // Benchmark 7: Search with project filter
    results.push(
      benchmark(
        'Search with project filter',
        () => newPersistence.searchContexts('API', { projectHash: 'project-1' }),
        100,
      ),
    )

    // Benchmark 8: Search with limit
    results.push(
      benchmark(
        'Search with limit (10 results)',
        () => newPersistence.searchContexts('context', { limit: 10 }),
        100,
      ),
    )

    // Benchmark 9: Hot contexts query
    results.push(
      benchmark(
        'Hot contexts query',
        () => newPersistence.getHotContexts('project-1', 10),
        100,
      ),
    )

    // Benchmark 10: Warm contexts query
    results.push(
      benchmark(
        'Warm contexts query',
        () => newPersistence.getWarmContexts('project-1', 10),
        100,
      ),
    )

    // Benchmark 11: Cold contexts query
    results.push(
      benchmark(
        'Cold contexts query',
        () => newPersistence.getColdContexts('project-1', 10),
        100,
      ),
    )

    // Benchmark 12: Traditional query (for comparison)
    results.push(
      benchmark(
        'Traditional query (getProjectContexts)',
        () => newPersistence.getProjectContexts('project-1', { limit: 10 }),
        100,
      ),
    )

    // Display results
    console.log('\nBenchmark Results:')
    console.log('=' .repeat(60))
    for (const result of results) {
      console.log(formatResult(result))
    }

    // Calculate statistics
    const searchResults = results.slice(0, 8)
    const avgSearchTime = searchResults.reduce((sum, r) => sum + r.avgTime, 0) / searchResults.length
    const hotWarmColdResults = results.slice(8, 11)
    const avgHotWarmColdTime = hotWarmColdResults.reduce((sum, r) => sum + r.avgTime, 0) / hotWarmColdResults.length

    console.log('\nSummary Statistics:')
    console.log('=' .repeat(60))
    console.log(`Average FTS5 search time: ${avgSearchTime.toFixed(2)}ms`)
    console.log(`Average hot/warm/cold query time: ${avgHotWarmColdTime.toFixed(2)}ms`)
    console.log(`Traditional query time: ${results[11].avgTime.toFixed(2)}ms`)
    console.log(`FTS5 vs Traditional: ${(results[11].avgTime / avgSearchTime).toFixed(2)}x`)

    // Performance assessment
    console.log('\nPerformance Assessment:')
    console.log('=' .repeat(60))
    if (avgSearchTime < 10) {
      console.log('✓ Excellent: FTS5 search < 10ms')
    }
    else if (avgSearchTime < 50) {
      console.log('✓ Good: FTS5 search < 50ms')
    }
    else if (avgSearchTime < 100) {
      console.log('⚠ Acceptable: FTS5 search < 100ms')
    }
    else {
      console.log('✗ Slow: FTS5 search > 100ms - consider optimization')
    }

    if (avgHotWarmColdTime < 5) {
      console.log('✓ Excellent: Hot/warm/cold queries < 5ms')
    }
    else if (avgHotWarmColdTime < 20) {
      console.log('✓ Good: Hot/warm/cold queries < 20ms')
    }
    else {
      console.log('⚠ Slow: Hot/warm/cold queries > 20ms - check indexes')
    }

    newPersistence.close()
  }

  // Clean up
  if (existsSync(testDbPath)) {
    rmSync(testDbPath, { force: true })
  }
  if (existsSync(`${testDbPath}-wal`)) {
    rmSync(`${testDbPath}-wal`, { force: true })
  }
  if (existsSync(`${testDbPath}-shm`)) {
    rmSync(`${testDbPath}-shm`, { force: true })
  }

  console.log('\n=== Benchmark Complete ===')
}

// Run benchmark
main().catch((error) => {
  console.error('Benchmark failed:', error)
  process.exit(1)
})
