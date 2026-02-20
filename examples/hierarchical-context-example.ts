/**
 * Example: Hierarchical Context Loading
 *
 * Demonstrates L0/L1/L2 tiered context loading with the CCJK context system.
 */

import { ContextManager } from '../src/context'
import type { ContextData } from '../src/context/types'
import { CompressionStrategy } from '../src/context/types'

async function main() {
  console.log('='.repeat(80))
  console.log('Hierarchical Context Loading Example')
  console.log('='.repeat(80))

  // Initialize context manager with persistence enabled
  const manager = new ContextManager({
    enablePersistence: true,
    projectHash: 'example-project',
    defaultStrategy: CompressionStrategy.BALANCED,
  })

  console.log('\n1. Creating sample contexts...')

  // Create some sample contexts
  const contexts: ContextData[] = [
    {
      id: 'ctx-1',
      content: 'This is a hot context that will be accessed frequently. '.repeat(20),
      timestamp: Date.now(),
      tokenCount: 100,
    },
    {
      id: 'ctx-2',
      content: 'This is another hot context with important information. '.repeat(20),
      timestamp: Date.now(),
      tokenCount: 100,
    },
    {
      id: 'ctx-3',
      content: 'This is a warm context from a few days ago. '.repeat(20),
      timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
      tokenCount: 100,
    },
    {
      id: 'ctx-4',
      content: 'This is a cold context from weeks ago. '.repeat(20),
      timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000, // 14 days ago
      tokenCount: 100,
    },
  ]

  // Compress and store contexts
  for (const context of contexts) {
    await manager.compress(context)
  }

  console.log(`✓ Created ${contexts.length} contexts`)

  // Refresh hot cache to load recent contexts
  manager.refreshHotCache()

  console.log('\n2. Accessing contexts by tier...')

  // Get hot contexts (L0 - in memory)
  const hotContexts = manager.getHotContexts()
  console.log(`\nL0 (Hot) Tier: ${hotContexts.length} contexts`)
  for (const ctx of hotContexts) {
    console.log(`  - ${ctx.id} (accessed ${ctx.accessCount} times)`)
  }

  // Get warm contexts (L1 - indexed in DB)
  const warmContexts = manager.getWarmContexts(10)
  console.log(`\nL1 (Warm) Tier: ${warmContexts.length} contexts`)
  for (const ctx of warmContexts) {
    console.log(`  - ${ctx.id} (accessed ${ctx.accessCount} times)`)
  }

  // Get cold contexts (L2 - lazy loaded)
  const coldContexts = manager.getColdContexts(10)
  console.log(`\nL2 (Cold) Tier: ${coldContexts.length} contexts`)
  for (const ctx of coldContexts) {
    console.log(`  - ${ctx.id} (accessed ${ctx.accessCount} times)`)
  }

  console.log('\n3. Demonstrating lazy loading...')

  // Lazy load cold contexts in batches
  const batch1 = await manager.lazyColdContexts(0, 2)
  console.log(`\nBatch 1 (offset 0, limit 2): ${batch1.length} contexts`)
  for (const ctx of batch1) {
    console.log(`  - ${ctx.id}`)
  }

  const batch2 = await manager.lazyColdContexts(2, 2)
  console.log(`\nBatch 2 (offset 2, limit 2): ${batch2.length} contexts`)
  for (const ctx of batch2) {
    console.log(`  - ${ctx.id}`)
  }

  console.log('\n4. Accessing contexts (triggers promotion)...')

  // Access a context multiple times to trigger promotion
  const loader = manager.getHierarchicalLoader()
  if (loader) {
    for (let i = 0; i < 5; i++) {
      await loader.getContext('ctx-3')
    }
    console.log('\n✓ Accessed ctx-3 five times')
  }

  console.log('\n5. Running tier migration...')

  // Migrate contexts between tiers
  const migrationResult = manager.migrateContextTiers()
  console.log(`\nMigration Results:`)
  console.log(`  Promoted: ${migrationResult.promoted} contexts`)
  console.log(`  Demoted: ${migrationResult.demoted} contexts`)

  console.log('\n6. Tier statistics...')

  // Get comprehensive statistics
  const stats = manager.getTierStats()
  if (stats) {
    console.log('\nL0 (Hot) Statistics:')
    console.log(`  Count: ${stats.l0.count}`)
    console.log(`  Size: ${(stats.l0.size / 1024).toFixed(2)} KB`)
    console.log(`  Hit Rate: ${(stats.l0.hitRate * 100).toFixed(2)}%`)

    console.log('\nL1 (Warm) Statistics:')
    console.log(`  Count: ${stats.l1.count}`)
    console.log(`  Avg Access Age: ${(stats.l1.avgAccessTime / 1000 / 60 / 60).toFixed(2)} hours`)

    console.log('\nL2 (Cold) Statistics:')
    console.log(`  Count: ${stats.l2.count}`)
    console.log(`  Avg Access Age: ${(stats.l2.avgAccessTime / 1000 / 60 / 60 / 24).toFixed(2)} days`)

    console.log('\nMigration History:')
    console.log(`  Hot → Warm: ${stats.migrations.hotToWarm}`)
    console.log(`  Warm → Cold: ${stats.migrations.warmToCold}`)
    console.log(`  Cold → Warm: ${stats.migrations.coldToWarm}`)
    console.log(`  Warm → Hot: ${stats.migrations.warmToHot}`)
  }

  console.log('\n7. Performance comparison...')

  // Measure L0 access time (hot)
  const l0Start = performance.now()
  for (let i = 0; i < 100; i++) {
    manager.getCached('ctx-1')
  }
  const l0Time = performance.now() - l0Start
  console.log(`\nL0 (Hot) Access: ${(l0Time / 100).toFixed(4)} ms per access`)
  console.log(`  Throughput: ${(100 / l0Time * 1000).toFixed(0)} ops/sec`)

  // Measure L1/L2 access time (from persistence)
  if (loader) {
    const l1Start = performance.now()
    for (let i = 0; i < 10; i++) {
      await loader.getContext('ctx-4')
    }
    const l1Time = performance.now() - l1Start
    console.log(`\nL1/L2 Access: ${(l1Time / 10).toFixed(4)} ms per access`)
    console.log(`  Throughput: ${(10 / l1Time * 1000).toFixed(0)} ops/sec`)
    console.log(`  Speedup: ${(l1Time / l0Time * 10).toFixed(1)}x faster for L0`)
  }

  console.log('\n8. Cache management...')

  // Get cache efficiency
  const efficiency = manager.getCacheEfficiency()
  console.log('\nCache Efficiency:')
  console.log(`  Hit Rate: ${(efficiency.hitRate * 100).toFixed(2)}%`)
  console.log(`  Avg Access Count: ${efficiency.avgAccessCount.toFixed(2)}`)
  console.log(`  Utilization: ${(efficiency.utilizationRate * 100).toFixed(2)}%`)

  // Optimize cache
  const pruned = manager.optimizeCache()
  console.log(`\n✓ Optimized cache (pruned ${pruned} entries)`)

  console.log('\n' + '='.repeat(80))
  console.log('Example completed successfully!')
  console.log('='.repeat(80))
}

// Run example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { main }
