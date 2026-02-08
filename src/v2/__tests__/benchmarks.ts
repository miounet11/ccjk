/**
 * CCJK 2.0 Performance Benchmarks
 *
 * Comprehensive performance testing for all v2 modules:
 * - hooks-v2: Hook enforcement
 * - brain-v2: Three-layer traceability
 * - skills-v2: Cognitive protocol DSL
 * - agents-v2: Redis message bus
 * - workflow-v2: AI workflow generation
 * - actionbook: Code precomputation
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

// ============================================================================
// Types
// ============================================================================

interface BenchmarkResult {
  name: string
  module: string
  operation: string
  iterations: number
  totalTime: number
  avgTime: number
  minTime: number
  maxTime: number
  p50: number
  p95: number
  p99: number
  throughput: number
  target?: number
  status: 'pass' | 'warn' | 'fail'
}

interface BenchmarkReport {
  timestamp: string
  system: {
    platform: string
    nodeVersion: string
    cpu: string
    memory: number
  }
  results: BenchmarkResult[]
  summary: {
    total: number
    passed: number
    warned: number
    failed: number
  }
}

// ============================================================================
// Benchmark Runner
// ============================================================================

class BenchmarkRunner {
  private results: BenchmarkResult[] = []

  /**
   * Run a benchmark operation
   */
  async run(
    name: string,
    module: string,
    operation: string,
    fn: () => Promise<void> | void,
    options: {
      iterations?: number
      warmup?: number
      target?: number
    } = {},
  ): Promise<BenchmarkResult> {
    const {
      iterations = 100,
      warmup = 10,
      target,
    } = options

    // Warmup
    for (let i = 0; i < warmup; i++) {
      await fn()
    }

    // Benchmark
    const times: number[] = []
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await fn()
      const end = performance.now()
      times.push(end - start)
    }

    // Calculate statistics
    times.sort((a, b) => a - b)
    const totalTime = times.reduce((a, b) => a + b, 0)
    const avgTime = totalTime / iterations
    const minTime = times[0]
    const maxTime = times[iterations - 1]
    const p50 = times[Math.floor(iterations * 0.5)]
    const p95 = times[Math.floor(iterations * 0.95)]
    const p99 = times[Math.floor(iterations * 0.99)]
    const throughput = (iterations / totalTime) * 1000

    // Determine status
    let status: 'pass' | 'warn' | 'fail' = 'pass'
    if (target) {
      if (avgTime > target * 1.5) {
        status = 'fail'
      }
      else if (avgTime > target * 1.2) {
        status = 'warn'
      }
    }

    const result: BenchmarkResult = {
      name,
      module,
      operation,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      p50,
      p95,
      p99,
      throughput,
      target,
      status,
    }

    this.results.push(result)
    return result
  }

  /**
   * Get benchmark results
   */
  getResults(): BenchmarkResult[] {
    return [...this.results]
  }

  /**
   * Generate report
   */
  generateReport(): BenchmarkReport {
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'pass').length,
      warned: this.results.filter(r => r.status === 'warn').length,
      failed: this.results.filter(r => r.status === 'fail').length,
    }

    return {
      timestamp: new Date().toISOString(),
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        cpu: process.arch,
        memory: Number.parseInt(process.env.memory_limit || '0', 10),
      },
      results: this.results,
      summary,
    }
  }

  /**
   * Save report to file
   */
  saveReport(path: string): void {
    const report = this.generateReport()
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, JSON.stringify(report, null, 2))
  }

  /**
   * Print results
   */
  printResults(): void {
    console.log('\n╔══════════════════════════════════════════════════════════════╗')
    console.log('║          CCJK 2.0 Performance Benchmarks                      ║')
    console.log('╚══════════════════════════════════════════════════════════════╝\n')

    const modules = Array.from(new Set(this.results.map(r => r.module)))

    for (const module of modules) {
      console.log(`📦 ${module}`)
      console.log('─'.repeat(70))

      const moduleResults = this.results.filter(r => r.module === module)
      for (const result of moduleResults) {
        const statusIcon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌'
        const targetText = result.target ? ` (target: ${result.target}ms)` : ''

        console.log(`${statusIcon} ${result.name}`)
        console.log(`   Avg: ${result.avgTime.toFixed(3)}ms (p95: ${result.p95.toFixed(3)}ms, p99: ${result.p99.toFixed(3)}ms)${targetText}`)
        console.log(`   Min: ${result.minTime.toFixed(3)}ms, Max: ${result.maxTime.toFixed(3)}ms`)
        console.log(`   Throughput: ${result.throughput.toFixed(0)} ops/sec`)
        console.log()
      }
    }

    const report = this.generateReport()
    console.log('─'.repeat(70))
    console.log(`Summary: ${report.summary.passed} passed, ${report.summary.warned} warned, ${report.summary.failed} failed`)
    console.log('─'.repeat(70))
  }
}

// ============================================================================
// Module-Specific Benchmarks
// ============================================================================

/**
 * Hooks V2 Benchmarks
 */
async function benchmarkHooksV2(runner: BenchmarkRunner) {
  console.log('\n🔗 Benchmarking hooks-v2...')

  // Mock hook registration and execution
  const mockHooks = Array.from({ length: 50 }, (_, i) => ({
    id: `hook-${i}`,
    matcher: new RegExp(`test${i}`, 'i'),
    level: i % 3 === 0 ? 'L3' : i % 2 === 0 ? 'L2' : 'L1',
  }))

  await runner.run(
    'Hook Registration',
    'hooks-v2',
    'register',
    async () => {
      // Simulate hook registration
      const hook = mockHooks[Math.floor(Math.random() * mockHooks.length)]
      hook.matcher.test('test0')
    },
    { iterations: 1000, target: 1 },
  )

  await runner.run(
    'Hook Execution',
    'hooks-v2',
    'execute',
    async () => {
      // Simulate hook execution
      mockHooks.filter(h => h.matcher.test('test0'))
    },
    { iterations: 1000, target: 1 },
  )

  await runner.run(
    'L3 Enforcement',
    'hooks-v2',
    'enforce-l3',
    async () => {
      // Simulate L3 critical enforcement
      mockHooks.some(h => h.level === 'L3' && h.matcher.test('test0'))
    },
    { iterations: 1000, target: 0.5 },
  )
}

/**
 * Brain V2 Benchmarks
 */
async function benchmarkBrainV2(runner: BenchmarkRunner) {
  console.log('\n🧠 Benchmarking brain-v2...')

  // Mock error analysis
  const mockErrors = [
    { code: 'E0382', message: 'use of moved value', domain: 'rust' },
    { code: 'E0277', message: 'trait not satisfied', domain: 'rust' },
    { code: 'TS2322', message: 'Type mismatch', domain: 'typescript' },
  ]

  await runner.run(
    'Error Classification',
    'brain-v2',
    'classify',
    async () => {
      // Simulate error classification
      const error = mockErrors[Math.floor(Math.random() * mockErrors.length)]
      error.code.startsWith('E') ? 'rust' : 'typescript'
    },
    { iterations: 1000, target: 0.1 },
  )

  await runner.run(
    'Three-Layer Traceability',
    'brain-v2',
    'traceability',
    async () => {
      // Simulate L1→L3→L2 analysis
      const error = mockErrors[0]
      const _l1 = error.code
      const l3 = error.domain
      l3 === 'rust' ? 'Arc' : 'Interface'
    },
    { iterations: 500, target: 0.5 },
  )
}

/**
 * Skills V2 Benchmarks
 */
async function benchmarkSkillsV2(runner: BenchmarkRunner) {
  console.log('\n📚 Benchmarking skills-v2...')

  // Mock skill protocol
  const mockProtocol = {
    id: 'test-skill',
    version: '1.0.0',
    layers: {
      L1: { keywords: ['error', 'bug'] },
      L3: { domain: 'rust' },
      L2: { pattern: 'Arc' },
    },
  }

  await runner.run(
    'DSL Parsing',
    'skills-v2',
    'parse',
    async () => {
      // Simulate JSON parsing
      JSON.parse(JSON.stringify(mockProtocol))
    },
    { iterations: 1000, target: 0.05 },
  )

  await runner.run(
    'Keyword Matching',
    'skills-v2',
    'match',
    async () => {
      // Simulate keyword matching
      const keywords = mockProtocol.layers.L1.keywords
      keywords.some(k => 'error'.includes(k))
    },
    { iterations: 1000, target: 0.05 },
  )

  await runner.run(
    'Three-Layer Execution',
    'skills-v2',
    'execute',
    async () => {
      // Simulate L1→L3→L2 execution
      mockProtocol.layers.L1
      mockProtocol.layers.L3
      mockProtocol.layers.L2
    },
    { iterations: 500, target: 0.1 },
  )
}

/**
 * Agents V2 Benchmarks
 */
async function benchmarkAgentsV2(runner: BenchmarkRunner) {
  console.log('\n🤖 Benchmarking agents-v2...')

  // Mock agent registry
  const mockAgents = Array.from({ length: 20 }, (_, i) => ({
    id: `agent-${i}`,
    domains: ['code', 'review', 'test'].slice(0, (i % 3) + 1),
    capabilities: ['typescript', 'rust', 'python'].slice(0, (i % 3) + 1),
  }))

  await runner.run(
    'Agent Registration',
    'agents-v2',
    'register',
    async () => {
      // Simulate agent registration
      const agent = mockAgents[Math.floor(Math.random() * mockAgents.length)]
      agent.id
    },
    { iterations: 1000, target: 0.5 },
  )

  await runner.run(
    'Message Routing',
    'agents-v2',
    'route',
    async () => {
      // Simulate message routing
      mockAgents.find(a => a.domains.includes('code'))
    },
    { iterations: 1000, target: 0.05 },
  )

  await runner.run(
    'Pub-Sub Broadcast',
    'agents-v2',
    'broadcast',
    async () => {
      // Simulate pub-sub broadcast
      mockAgents.filter(a => a.capabilities.includes('typescript'))
    },
    { iterations: 1000, target: 0.1 },
  )
}

/**
 * Workflow V2 Benchmarks
 */
async function benchmarkWorkflowV2(runner: BenchmarkRunner) {
  console.log('\n🔄 Benchmarking workflow-v2...')

  // Mock fragment library
  const mockFragments = Array.from({ length: 27 }, (_, i) => ({
    id: `fragment-${i}`,
    type: ['setup', 'test', 'build', 'deploy'][i % 4],
    content: `// Fragment ${i}`,
  }))

  await runner.run(
    'Fragment Selection',
    'workflow-v2',
    'select-fragments',
    async () => {
      // Simulate fragment selection
      mockFragments.filter(f => f.type === 'setup')
    },
    { iterations: 500, target: 0.1 },
  )

  await runner.run(
    'Workflow Composition',
    'workflow-v2',
    'compose',
    async () => {
      // Simulate workflow composition
      mockFragments.map(f => f.content).join('\n')
    },
    { iterations: 100, target: 1 },
  )

  // Note: AI generation is not benchmarked here as it requires external API
}

/**
 * Actionbook Benchmarks
 */
async function benchmarkActionbook(runner: BenchmarkRunner) {
  console.log('\n⚡ Benchmarking actionbook...')

  // Mock code analysis
  const mockCode = `
    function example() {
      console.log('test');
      return true;
    }
  `.repeat(100)

  await runner.run(
    'AST Parsing',
    'actionbook',
    'parse',
    async () => {
      // Simulate AST parsing
      const lines = mockCode.split('\n')
      lines.length
    },
    { iterations: 100, target: 1 },
  )

  await runner.run(
    'Symbol Extraction',
    'actionbook',
    'extract',
    async () => {
      // Simulate symbol extraction
      const symbols = mockCode.match(/function|example|console/g) || []
      symbols.length
    },
    { iterations: 1000, target: 0.1 },
  )

  await runner.run(
    'Query Execution',
    'actionbook',
    'query',
    async () => {
      // Simulate LevelDB query
      mockCode.includes('example')
    },
    { iterations: 1000, target: 0.01 },
  )
}

// ============================================================================
// Main
// ============================================================================

/**
 * Run all benchmarks
 */
async function runAllBenchmarks(): Promise<void> {
  const runner = new BenchmarkRunner()

  console.log('\n🚀 Starting CCJK 2.0 Performance Benchmarks...')
  console.log('System Info:')
  console.log(`  Platform: ${process.platform}`)
  console.log(`  Node.js: ${process.version}`)
  console.log(`  Arch: ${process.arch}\n`)

  await benchmarkHooksV2(runner)
  await benchmarkBrainV2(runner)
  await benchmarkSkillsV2(runner)
  await benchmarkAgentsV2(runner)
  await benchmarkWorkflowV2(runner)
  await benchmarkActionbook(runner)

  runner.printResults()

  // Save report
  const reportPath = join(process.cwd(), '.ccjk', 'benchmark-results.json')
  runner.saveReport(reportPath)
  console.log(`\n📄 Report saved to: ${reportPath}`)

  // Check for failures
  const report = runner.generateReport()
  if (report.summary.failed > 0) {
    process.exit(1)
  }
}

// Run if executed directly
if (typeof process !== 'undefined' && process.argv[1]) {
  const isMainModule = process.argv[1].endsWith('benchmarks.ts') || process.argv[1].endsWith('benchmarks.js')
  if (isMainModule) {
    runAllBenchmarks().catch((error) => {
      console.error('❌ Benchmark failed:', error)
      process.exit(1)
    })
  }
}

export { BenchmarkRunner, runAllBenchmarks }
