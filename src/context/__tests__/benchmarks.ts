/**
 * Performance Benchmarks for Context Optimization System
 */

import type { ContextData } from '../types'
import { ContextManager } from '../manager'
import { CompressionStrategy } from '../types'

interface BenchmarkResult {
  name: string
  iterations: number
  totalTime: number
  avgTime: number
  minTime: number
  maxTime: number
  throughput: number
}

interface CompressionBenchmark extends BenchmarkResult {
  originalTokens: number
  compressedTokens: number
  compressionRatio: number
  tokensSaved: number
}

/**
 * Benchmark runner
 */
class BenchmarkRunner {
  private manager: ContextManager

  constructor() {
    this.manager = new ContextManager({
      enableCache: false, // Disable cache for fair benchmarks
      enableAnalytics: true,
    })
  }

  /**
   * Run compression benchmark
   */
  async benchmarkCompression(
    name: string,
    content: string,
    strategy: CompressionStrategy,
    iterations: number = 100,
  ): Promise<CompressionBenchmark> {
    const times: number[] = []
    let totalOriginalTokens = 0
    let totalCompressedTokens = 0

    for (let i = 0; i < iterations; i++) {
      const context: ContextData = {
        id: `bench-${i}`,
        content,
        timestamp: Date.now(),
      }

      const startTime = performance.now()
      const compressed = await this.manager.compress(context, { strategy, cache: false })
      const endTime = performance.now()

      times.push(endTime - startTime)
      totalOriginalTokens += compressed.originalTokens
      totalCompressedTokens += compressed.compressedTokens
    }

    const totalTime = times.reduce((a, b) => a + b, 0)
    const avgTime = totalTime / iterations
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)

    const avgOriginalTokens = totalOriginalTokens / iterations
    const avgCompressedTokens = totalCompressedTokens / iterations
    const compressionRatio = 1 - (avgCompressedTokens / avgOriginalTokens)
    const tokensSaved = avgOriginalTokens - avgCompressedTokens

    // Throughput: tokens per second
    const throughput = (totalOriginalTokens / totalTime) * 1000

    return {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      throughput,
      originalTokens: avgOriginalTokens,
      compressedTokens: avgCompressedTokens,
      compressionRatio,
      tokensSaved,
    }
  }

  /**
   * Run decompression benchmark
   */
  async benchmarkDecompression(
    name: string,
    content: string,
    strategy: CompressionStrategy,
    iterations: number = 100,
  ): Promise<BenchmarkResult> {
    // First compress the content
    const context: ContextData = {
      id: 'bench-decompress',
      content,
      timestamp: Date.now(),
    }

    const compressed = await this.manager.compress(context, { strategy, cache: false })

    // Now benchmark decompression
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      await this.manager.decompress(compressed)
      const endTime = performance.now()

      times.push(endTime - startTime)
    }

    const totalTime = times.reduce((a, b) => a + b, 0)
    const avgTime = totalTime / iterations
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const throughput = (iterations / totalTime) * 1000

    return {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      throughput,
    }
  }

  /**
   * Run cache benchmark
   */
  async benchmarkCache(
    name: string,
    content: string,
    iterations: number = 1000,
  ): Promise<{
    withCache: BenchmarkResult
    withoutCache: BenchmarkResult
    speedup: number
  }> {
    // Benchmark with cache
    const cacheManager = new ContextManager({ enableCache: true })
    const context: ContextData = {
      id: 'bench-cache',
      content,
      timestamp: Date.now(),
    }

    const withCacheTimes: number[] = []
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      await cacheManager.compress(context)
      const endTime = performance.now()
      withCacheTimes.push(endTime - startTime)
    }

    // Benchmark without cache
    const noCacheManager = new ContextManager({ enableCache: false })
    const withoutCacheTimes: number[] = []
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      await noCacheManager.compress(context, { cache: false })
      const endTime = performance.now()
      withoutCacheTimes.push(endTime - startTime)
    }

    const withCacheTotal = withCacheTimes.reduce((a, b) => a + b, 0)
    const withoutCacheTotal = withoutCacheTimes.reduce((a, b) => a + b, 0)

    const speedup = withoutCacheTotal / withCacheTotal

    return {
      withCache: {
        name: `${name} (with cache)`,
        iterations,
        totalTime: withCacheTotal,
        avgTime: withCacheTotal / iterations,
        minTime: Math.min(...withCacheTimes),
        maxTime: Math.max(...withCacheTimes),
        throughput: (iterations / withCacheTotal) * 1000,
      },
      withoutCache: {
        name: `${name} (without cache)`,
        iterations,
        totalTime: withoutCacheTotal,
        avgTime: withoutCacheTotal / iterations,
        minTime: Math.min(...withoutCacheTimes),
        maxTime: Math.max(...withoutCacheTimes),
        throughput: (iterations / withoutCacheTotal) * 1000,
      },
      speedup,
    }
  }

  /**
   * Format benchmark result
   */
  formatResult(result: BenchmarkResult): string {
    return `
${result.name}:
  Iterations: ${result.iterations}
  Total Time: ${result.totalTime.toFixed(2)}ms
  Avg Time: ${result.avgTime.toFixed(2)}ms
  Min Time: ${result.minTime.toFixed(2)}ms
  Max Time: ${result.maxTime.toFixed(2)}ms
  Throughput: ${result.throughput.toFixed(2)} ops/sec
`
  }

  /**
   * Format compression benchmark result
   */
  formatCompressionResult(result: CompressionBenchmark): string {
    return `
${result.name}:
  Iterations: ${result.iterations}
  Total Time: ${result.totalTime.toFixed(2)}ms
  Avg Time: ${result.avgTime.toFixed(2)}ms
  Min Time: ${result.minTime.toFixed(2)}ms
  Max Time: ${result.maxTime.toFixed(2)}ms
  Throughput: ${result.throughput.toFixed(2)} tokens/sec

  Compression Metrics:
  Original Tokens: ${result.originalTokens.toFixed(0)}
  Compressed Tokens: ${result.compressedTokens.toFixed(0)}
  Compression Ratio: ${(result.compressionRatio * 100).toFixed(2)}%
  Tokens Saved: ${result.tokensSaved.toFixed(0)}
`
  }
}

/**
 * Run all benchmarks
 */
async function runBenchmarks() {
  console.log('=== Context Optimization System Benchmarks ===\n')

  const runner = new BenchmarkRunner()

  // Test data
  const smallText = 'Hello world! '.repeat(10)
  const mediumText = 'This is a test document with repeated content. '.repeat(50)
  const largeText = `
    function example() {
      console.log('test');
      return true;
    }
  `.repeat(100)

  // Compression benchmarks
  console.log('--- Compression Benchmarks ---\n')

  const strategies = [
    CompressionStrategy.CONSERVATIVE,
    CompressionStrategy.BALANCED,
    CompressionStrategy.AGGRESSIVE,
  ]

  for (const strategy of strategies) {
    const result = await runner.benchmarkCompression(
      `${strategy} - Medium Text`,
      mediumText,
      strategy,
      100,
    )
    console.log(runner.formatCompressionResult(result))
  }

  // Size comparison
  console.log('--- Size Comparison ---\n')

  const sizes = [
    { name: 'Small', text: smallText },
    { name: 'Medium', text: mediumText },
    { name: 'Large', text: largeText },
  ]

  for (const { name, text } of sizes) {
    const result = await runner.benchmarkCompression(
      `Balanced - ${name} Text`,
      text,
      CompressionStrategy.BALANCED,
      50,
    )
    console.log(runner.formatCompressionResult(result))
  }

  // Decompression benchmarks
  console.log('--- Decompression Benchmarks ---\n')

  for (const strategy of strategies) {
    const result = await runner.benchmarkDecompression(
      `${strategy} - Decompression`,
      mediumText,
      strategy,
      100,
    )
    console.log(runner.formatResult(result))
  }

  // Cache benchmarks
  console.log('--- Cache Benchmarks ---\n')

  const cacheResult = await runner.benchmarkCache(
    'Cache Performance',
    mediumText,
    1000,
  )

  console.log(runner.formatResult(cacheResult.withCache))
  console.log(runner.formatResult(cacheResult.withoutCache))
  console.log(`Cache Speedup: ${cacheResult.speedup.toFixed(2)}x\n`)

  console.log('=== Benchmarks Complete ===')
}

// Export for testing
export { BenchmarkRunner, runBenchmarks }

// Run if executed directly
if (require.main === module) {
  runBenchmarks().catch(console.error)
}
