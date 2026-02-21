/**
 * Compression Metrics Example
 * Demonstrates how to use compression metrics tracking and display
 */

import { ContextManager } from '../manager'
import { MetricsDisplay } from '../metrics-display'
import type { ContextData } from '../types'

/**
 * Example 1: Basic compression with metrics display
 */
export async function basicCompressionWithMetrics() {
  console.log('\n=== Example 1: Basic Compression with Metrics ===')

  // Create context manager with persistence enabled
  const manager = new ContextManager({
    enablePersistence: true,
    projectHash: 'my-project',
  })

  // Create a context to compress
  const context: ContextData = {
    id: 'example-1',
    content: `
      This is a sample context that contains code, documentation, and conversation history.
      It will be compressed to save tokens and reduce API costs.

      function example() {
        console.log('Hello, world!');
        return 42;
      }

      The compression system uses intelligent algorithms to preserve important information
      while removing redundancy and unnecessary verbosity.
    `.repeat(10),
    timestamp: Date.now(),
  }

  // Compress the context
  const startTime = Date.now()
  const compressed = await manager.compress(context)
  const timeTaken = Date.now() - startTime

  // Display compression result
  MetricsDisplay.displayCompressionResult(
    compressed.originalTokens,
    compressed.compressedTokens,
    compressed.compressionRatio,
    timeTaken,
  )

  console.log('\nCompression Details:')
  console.log(`  Original: ${compressed.originalTokens} tokens`)
  console.log(`  Compressed: ${compressed.compressedTokens} tokens`)
  console.log(`  Saved: ${compressed.originalTokens - compressed.compressedTokens} tokens`)
  console.log(`  Ratio: ${Math.round(compressed.compressionRatio * 100)}%`)
  console.log(`  Time: ${timeTaken}ms`)
}

/**
 * Example 2: Multiple compressions with cumulative statistics
 */
export async function multipleCompressionsWithStats() {
  console.log('\n=== Example 2: Multiple Compressions with Statistics ===')

  const manager = new ContextManager({
    enablePersistence: true,
    projectHash: 'my-project',
  })

  // Compress multiple contexts
  console.log('\nCompressing contexts...')
  for (let i = 0; i < 5; i++) {
    const context: ContextData = {
      id: `example-2-${i}`,
      content: `Context ${i}: `.repeat(50) + 'Some important data. '.repeat(100),
      timestamp: Date.now(),
    }

    const startTime = Date.now()
    const compressed = await manager.compress(context)
    const timeTaken = Date.now() - startTime

    MetricsDisplay.displayCompressionResult(
      compressed.originalTokens,
      compressed.compressedTokens,
      compressed.compressionRatio,
      timeTaken,
    )
  }

  // Display cumulative statistics
  const stats = manager.getCompressionMetricsStats()
  if (stats) {
    MetricsDisplay.displayCompressionStats(stats)
  }
}

/**
 * Example 3: Compression metrics table
 */
export async function compressionMetricsTable() {
  console.log('\n=== Example 3: Compression Metrics Table ===')

  const manager = new ContextManager({
    enablePersistence: true,
    projectHash: 'my-project',
  })

  // Compress contexts with different strategies
  const strategies = ['conservative', 'balanced', 'aggressive'] as const

  for (const strategy of strategies) {
    const context: ContextData = {
      id: `example-3-${strategy}`,
      content: `Testing ${strategy} compression strategy. `.repeat(100),
      timestamp: Date.now(),
    }

    await manager.compress(context, { strategy })
  }

  // Get recent metrics
  const metrics = manager.getRecentCompressionMetrics(10)

  // Display as table
  MetricsDisplay.displayCompressionTable(metrics)
}

/**
 * Example 4: Compact metrics display for dashboard
 */
export async function compactMetricsDisplay() {
  console.log('\n=== Example 4: Compact Metrics Display ===')

  const manager = new ContextManager({
    enablePersistence: true,
    projectHash: 'my-project',
  })

  // Compress some contexts
  for (let i = 0; i < 3; i++) {
    const context: ContextData = {
      id: `example-4-${i}`,
      content: 'Dashboard example content. '.repeat(50),
      timestamp: Date.now(),
    }
    await manager.compress(context)
  }

  // Get statistics
  const stats = manager.getCompressionMetricsStats()
  if (stats) {
    // Display compact version (suitable for status dashboard)
    const lines = MetricsDisplay.displayCompactCompressionStats(stats)
    console.log('\n' + lines.join('\n'))
  }
}

/**
 * Example 5: Cost savings calculation
 */
export async function costSavingsExample() {
  console.log('\n=== Example 5: Cost Savings Calculation ===')

  const manager = new ContextManager({
    enablePersistence: true,
    projectHash: 'my-project',
  })

  // Simulate a day's worth of compressions
  console.log('\nSimulating compressions...')
  for (let i = 0; i < 20; i++) {
    const context: ContextData = {
      id: `cost-example-${i}`,
      content: 'Large context content. '.repeat(200),
      timestamp: Date.now(),
    }
    await manager.compress(context)
  }

  // Get statistics
  const stats = manager.getCompressionMetricsStats()
  if (stats) {
    console.log('\n💰 Cost Savings Analysis:')
    console.log(`  Total Tokens Saved: ${MetricsDisplay.formatTokenCount(stats.totalTokensSaved)}`)
    console.log(`  Estimated Cost Savings: ${MetricsDisplay.formatCost(stats.estimatedCostSavings)}`)
    console.log('\n  Breakdown:')
    console.log(`    Session (24h): ${MetricsDisplay.formatCost(stats.sessionStats?.costSavings || 0)}`)
    console.log(`    Weekly (7d):   ${MetricsDisplay.formatCost(stats.weeklyStats?.costSavings || 0)}`)
    console.log(`    Monthly (30d): ${MetricsDisplay.formatCost(stats.monthlyStats?.costSavings || 0)}`)
    console.log('\n  Note: Based on $0.015 per 1K tokens (Claude Opus pricing)')
  }
}

/**
 * Example 6: Real-time compression monitoring
 */
export async function realtimeMonitoring() {
  console.log('\n=== Example 6: Real-time Compression Monitoring ===')

  const manager = new ContextManager({
    enablePersistence: true,
    projectHash: 'my-project',
  })

  console.log('\nMonitoring compressions in real-time...')

  // Compress contexts and display results immediately
  for (let i = 0; i < 5; i++) {
    const context: ContextData = {
      id: `monitor-${i}`,
      content: `Context ${i}: `.repeat(30) + 'Data. '.repeat(80),
      timestamp: Date.now(),
    }

    const startTime = Date.now()
    const compressed = await manager.compress(context)
    const timeTaken = Date.now() - startTime

    // Display result with progress bar
    const bar = MetricsDisplay.createCompressionBar(compressed.compressionRatio)
    console.log(`\n[${i + 1}/5] ${bar} ${Math.round(compressed.compressionRatio * 100)}%`)
    console.log(`      ${MetricsDisplay.formatTokenCount(compressed.originalTokens)} → ${MetricsDisplay.formatTokenCount(compressed.compressedTokens)} (${MetricsDisplay.formatTime(timeTaken)})`)

    // Small delay to simulate real-time processing
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n✅ Monitoring complete')
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    await basicCompressionWithMetrics()
    await multipleCompressionsWithStats()
    await compressionMetricsTable()
    await compactMetricsDisplay()
    await costSavingsExample()
    await realtimeMonitoring()

    console.log('\n✅ All examples completed successfully!')
  }
  catch (error) {
    console.error('\n❌ Error running examples:', error)
  }
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error)
}
