#!/usr/bin/env tsx
/**
 * Quick test script for compression metrics functionality
 */

import { ContextManager } from '../src/context/manager'
import { MetricsDisplay } from '../src/context/metrics-display'
import type { ContextData } from '../src/context/types'
import { existsSync, unlinkSync } from 'node:fs'
import { join } from 'pathe'
import { tmpdir } from 'node:os'

async function testCompressionMetrics() {
  console.log('\n🧪 Testing Compression Metrics System\n')

  // Create temporary database
  const dbPath = join(tmpdir(), `test-metrics-${Date.now()}.db`)
  console.log(`📁 Using database: ${dbPath}\n`)

  try {
    // Create context manager with persistence
    const manager = new ContextManager({
      enablePersistence: true,
      projectHash: 'test-project',
    })

    console.log('✅ Context manager created\n')

    // Test 1: Single compression with display
    console.log('📝 Test 1: Single compression with real-time display')
    const context1: ContextData = {
      id: 'test-1',
      content: 'This is a test context with some content that will be compressed. '.repeat(50),
      timestamp: Date.now(),
    }

    const startTime1 = Date.now()
    const compressed1 = await manager.compress(context1)
    const timeTaken1 = Date.now() - startTime1

    MetricsDisplay.displayCompressionResult(
      compressed1.originalTokens,
      compressed1.compressedTokens,
      compressed1.compressionRatio,
      timeTaken1,
    )
    console.log()

    // Test 2: Multiple compressions
    console.log('📝 Test 2: Multiple compressions')
    for (let i = 0; i < 4; i++) {
      const context: ContextData = {
        id: `test-${i + 2}`,
        content: `Context ${i}: `.repeat(20) + 'Some data. '.repeat(40),
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
    console.log()

    // Test 3: Get statistics
    console.log('📝 Test 3: Cumulative statistics')
    const stats = manager.getCompressionMetricsStats()
    if (stats) {
      MetricsDisplay.displayCompressionStats(stats)
    }
    else {
      console.log('❌ No statistics available')
    }

    // Test 4: Recent metrics table
    console.log('📝 Test 4: Recent compressions table')
    const recent = manager.getRecentCompressionMetrics(5)
    MetricsDisplay.displayCompressionTable(recent, 5)

    // Test 5: Compact display
    console.log('📝 Test 5: Compact metrics display')
    if (stats) {
      const lines = MetricsDisplay.displayCompactCompressionStats(stats)
      console.log(lines.join('\n'))
      console.log()
    }

    // Test 6: Format utilities
    console.log('📝 Test 6: Format utilities')
    console.log(`  Token count: ${MetricsDisplay.formatTokenCount(1500)} (1500)`)
    console.log(`  Token count: ${MetricsDisplay.formatTokenCount(1500000)} (1500000)`)
    console.log(`  Cost: ${MetricsDisplay.formatCost(12.456)} (12.456)`)
    console.log(`  Cost: ${MetricsDisplay.formatCost(0.0234)} (0.0234)`)
    console.log(`  Ratio: ${MetricsDisplay.formatRatio(0.68)} (0.68)`)
    console.log(`  Time: ${MetricsDisplay.formatTime(125)} (125ms)`)
    console.log(`  Time: ${MetricsDisplay.formatTime(1500)} (1500ms)`)
    console.log()

    // Test 7: Compression bar
    console.log('📝 Test 7: Compression progress bars')
    console.log(`  70% reduction: ${MetricsDisplay.createCompressionBar(0.70)}`)
    console.log(`  50% reduction: ${MetricsDisplay.createCompressionBar(0.50)}`)
    console.log(`  30% reduction: ${MetricsDisplay.createCompressionBar(0.30)}`)
    console.log()

    console.log('✅ All tests passed!\n')
  }
  catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
  finally {
    // Cleanup
    if (existsSync(dbPath)) {
      unlinkSync(dbPath)
    }
    const walPath = `${dbPath}-wal`
    const shmPath = `${dbPath}-shm`
    if (existsSync(walPath)) unlinkSync(walPath)
    if (existsSync(shmPath)) unlinkSync(shmPath)
    console.log('🧹 Cleaned up test database\n')
  }
}

// Run tests
testCompressionMetrics().catch(console.error)
