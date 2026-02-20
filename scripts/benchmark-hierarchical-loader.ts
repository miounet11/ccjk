/**
 * Benchmark for Hierarchical Context Loader
 *
 * Tests performance of L0/L1/L2 tiered loading system
 */

import { existsSync, unlinkSync } from 'node:fs'
import { join } from 'pathe'
import { ContextPersistence } from '../src/context/persistence'
import { HierarchicalContextLoader } from '../src/context/hierarchical-loader'
import type { CompressedContext } from '../src/context/types'
import { CompressionAlgorithm, CompressionStrategy } from '../src/context/types'

interface BenchmarkResult {
  operation: string
  iterations: number
  totalTime: number
  avgTime: number
  opsPerSecond: number
}

class HierarchicalLoaderBenchmark {
  private persistence: ContextPersistence
  private loader: HierarchicalContextLoader
  private dbPath: string
  private projectHash = 'benchmark-project'

  constructor() {
    this.dbPath = join(process.cwd(), 'benchmark-hierarchical.db')
    this.cleanup()
    this.persistence = new ContextPersistence(this.dbPath)
    this.loader = new HierarchicalContextLoader(this.persistence, this.projectHash)
  }

  cleanup(): void {
    const files = [this.dbPath, `${this.dbPath}-shm`, `${this.dbPath}-wal`]
    for (const file of files) {
      if (existsSync(file)) {
        unlinkSync(file)
      }
    }
  }

  close(): void {
    this.persistence.close()
    this.cleanup()
  }

  /**
   * Create test contexts across all tiers
   */
  async setupTestData(hotCount: number, warmCount: number, coldCount: number): Promise<void> {
    const now = Date.now()

    console.log(`Creating ${hotCount} hot, ${warmCount} warm, ${coldCount} cold contexts...`)

    // Create hot contexts (<1 day)
    for (let i = 0; i < hotCount; i++) {
      const context: CompressedContext = {
        id: `hot-${i}`,
        compressed: `Hot context content ${i}`.repeat(10),
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 200,
        compressedTokens: 100,
        compressionRatio: 0.5,
        compressedAt: now - Math.random() * 23 * 60 * 60 * 1000, // Random within last 23 hours
      }
      this.persistence.saveContext(context, this.projectHash, `Original hot ${i}`)
    }

    // Create warm contexts (1-7 days)
    for (let i = 0; i < warmCount; i++) {
      const context: CompressedContext = {
        id: `warm-${i}`,
        compressed: `Warm context content ${i}`.repeat(10),
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 200,
        compressedTokens: 100,
        compressionRatio: 0.5,
        compressedAt: now - (1 + Math.random() * 6) * 24 * 60 * 60 * 1000, // 1-7 days
      }
      this.persistence.saveContext(context, this.projectHash, `Original warm ${i}`)
    }

    // Create cold contexts (>7 days)
    for (let i = 0; i < coldCount; i++) {
      const context: CompressedContext = {
        id: `cold-${i}`,
        compressed: `Cold context content ${i}`.repeat(10),
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 200,
        compressedTokens: 100,
        compressionRatio: 0.5,
        compressedAt: now - (7 + Math.random() * 30) * 24 * 60 * 60 * 1000, // 7-37 days
      }
      this.persistence.saveContext(context, this.projectHash, `Original cold ${i}`)
    }

    // Initialize L0 cache
    this.loader.refreshL0Cache()
    console.log('Test data created successfully\n')
  }

  /**
   * Benchmark L0 (hot) cache access
   */
  async benchmarkL0Access(iterations: number): Promise<BenchmarkResult> {
    const hotContexts = this.loader.getHotContexts()
    if (hotContexts.length === 0) {
      throw new Error('No hot contexts available for benchmark')
    }

    const startTime = performance.now()

    for (let i = 0; i < iterations; i++) {
      const contextId = hotContexts[i % hotContexts.length].id
      await this.loader.getContext(contextId)
    }

    const endTime = performance.now()
    const totalTime = endTime - startTime

    return {
      operation: 'L0 Cache Access',
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      opsPerSecond: (iterations / totalTime) * 1000,
    }
  }

  /**
   * Benchmark L1 (warm) database access
   */
  async benchmarkL1Access(iterations: number): Promise<BenchmarkResult> {
    const warmContexts = this.loader.getWarmContexts(100)
    if (warmContexts.length === 0) {
      throw new Error('No warm contexts available for benchmark')
    }

    // Clear L0 cache to force L1 access
    this.loader.clearL0Cache()

    const startTime = performance.now()

    for (let i = 0; i < iterations; i++) {
      const contextId = warmContexts[i % warmContexts.length].id
      await this.loader.getContext(contextId)
    }

    const endTime = performance.now()
    const totalTime = endTime - startTime

    return {
      operation: 'L1 Database Access',
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      opsPerSecond: (iterations / totalTime) * 1000,
    }
  }

  /**
   * Benchmark L2 (cold) lazy loading
   */
  async benchmarkL2LazyLoad(batches: number, batchSize: number): Promise<BenchmarkResult> {
    const startTime = performance.now()

    for (let i = 0; i < batches; i++) {
      await this.loader.lazyColdContexts(i * batchSize, batchSize)
    }

    const endTime = performance.now()
    const totalTime = endTime - startTime
    const totalContexts = batches * batchSize

    return {
      operation: 'L2 Lazy Loading',
      iterations: totalContexts,
      totalTime,
      avgTime: totalTime / totalContexts,
      opsPerSecond: (totalContexts / totalTime) * 1000,
    }
  }

  /**
   * Benchmark tier migration
   */
  async benchmarkTierMigration(iterations: number): Promise<BenchmarkResult> {
    const startTime = performance.now()

    for (let i = 0; i < iterations; i++) {
      this.loader.migrateContexts()
    }

    const endTime = performance.now()
    const totalTime = endTime - startTime

    return {
      operation: 'Tier Migration',
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      opsPerSecond: (iterations / totalTime) * 1000,
    }
  }

  /**
   * Benchmark cache refresh
   */
  async benchmarkCacheRefresh(iterations: number): Promise<BenchmarkResult> {
    const startTime = performance.now()

    for (let i = 0; i < iterations; i++) {
      this.loader.refreshL0Cache()
    }

    const endTime = performance.now()
    const totalTime = endTime - startTime

    return {
      operation: 'L0 Cache Refresh',
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      opsPerSecond: (iterations / totalTime) * 1000,
    }
  }

  /**
   * Benchmark mixed workload (realistic usage)
   */
  async benchmarkMixedWorkload(iterations: number): Promise<BenchmarkResult> {
    const hotContexts = this.loader.getHotContexts()
    const warmContexts = this.loader.getWarmContexts(50)
    const coldContexts = this.loader.getColdContexts(50)

    const startTime = performance.now()

    for (let i = 0; i < iterations; i++) {
      const rand = Math.random()

      if (rand < 0.7 && hotContexts.length > 0) {
        // 70% hot access
        const contextId = hotContexts[i % hotContexts.length].id
        await this.loader.getContext(contextId)
      }
      else if (rand < 0.9 && warmContexts.length > 0) {
        // 20% warm access
        const contextId = warmContexts[i % warmContexts.length].id
        await this.loader.getContext(contextId)
      }
      else if (coldContexts.length > 0) {
        // 10% cold access
        const contextId = coldContexts[i % coldContexts.length].id
        await this.loader.getContext(contextId)
      }
    }

    const endTime = performance.now()
    const totalTime = endTime - startTime

    return {
      operation: 'Mixed Workload (70/20/10)',
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      opsPerSecond: (iterations / totalTime) * 1000,
    }
  }

  /**
   * Print benchmark results
   */
  printResults(results: BenchmarkResult[]): void {
    console.log('\n' + '='.repeat(80))
    console.log('HIERARCHICAL CONTEXT LOADER BENCHMARK RESULTS')
    console.log('='.repeat(80))

    for (const result of results) {
      console.log(`\n${result.operation}:`)
      console.log(`  Iterations:     ${result.iterations.toLocaleString()}`)
      console.log(`  Total Time:     ${result.totalTime.toFixed(2)} ms`)
      console.log(`  Avg Time:       ${result.avgTime.toFixed(4)} ms`)
      console.log(`  Ops/Second:     ${result.opsPerSecond.toFixed(0).toLocaleString()}`)
    }

    console.log('\n' + '='.repeat(80))
  }

  /**
   * Print tier statistics
   */
  printStats(): void {
    const stats = this.loader.getStats()

    console.log('\n' + '='.repeat(80))
    console.log('TIER STATISTICS')
    console.log('='.repeat(80))

    console.log('\nL0 (Hot) Tier:')
    console.log(`  Count:          ${stats.l0.count}`)
    console.log(`  Size:           ${(stats.l0.size / 1024).toFixed(2)} KB`)
    console.log(`  Hit Rate:       ${(stats.l0.hitRate * 100).toFixed(2)}%`)

    console.log('\nL1 (Warm) Tier:')
    console.log(`  Count:          ${stats.l1.count}`)
    console.log(`  Avg Access Age: ${(stats.l1.avgAccessTime / 1000 / 60 / 60).toFixed(2)} hours`)

    console.log('\nL2 (Cold) Tier:')
    console.log(`  Count:          ${stats.l2.count}`)
    console.log(`  Avg Access Age: ${(stats.l2.avgAccessTime / 1000 / 60 / 60 / 24).toFixed(2)} days`)

    console.log('\nMigrations:')
    console.log(`  Hot → Warm:     ${stats.migrations.hotToWarm}`)
    console.log(`  Warm → Cold:    ${stats.migrations.warmToCold}`)
    console.log(`  Cold → Warm:    ${stats.migrations.coldToWarm}`)
    console.log(`  Warm → Hot:     ${stats.migrations.warmToHot}`)

    console.log('\n' + '='.repeat(80))
  }
}

/**
 * Run benchmarks
 */
async function runBenchmarks() {
  console.log('Starting Hierarchical Context Loader Benchmarks...\n')

  const benchmark = new HierarchicalLoaderBenchmark()

  try {
    // Setup test data
    await benchmark.setupTestData(100, 500, 1000)

    // Print initial stats
    benchmark.printStats()

    const results: BenchmarkResult[] = []

    // Run benchmarks
    console.log('\nRunning benchmarks...\n')

    console.log('1. L0 Cache Access...')
    results.push(await benchmark.benchmarkL0Access(10000))

    console.log('2. L1 Database Access...')
    results.push(await benchmark.benchmarkL1Access(1000))

    console.log('3. L2 Lazy Loading...')
    results.push(await benchmark.benchmarkL2LazyLoad(20, 50))

    console.log('4. Tier Migration...')
    results.push(await benchmark.benchmarkTierMigration(100))

    console.log('5. Cache Refresh...')
    results.push(await benchmark.benchmarkCacheRefresh(100))

    console.log('6. Mixed Workload...')
    results.push(await benchmark.benchmarkMixedWorkload(5000))

    // Print results
    benchmark.printResults(results)

    // Print final stats
    benchmark.printStats()
  }
  finally {
    benchmark.close()
  }

  console.log('\nBenchmarks completed successfully!')
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks().catch(console.error)
}

export { HierarchicalLoaderBenchmark, runBenchmarks }
