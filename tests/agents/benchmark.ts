/**
 * Multi-Agent Orchestration Performance Benchmark
 */

import type { OrchestratorTask } from '../../src/types/agent.js'
import { MultiAgentOrchestrator } from '../../src/agents/multi-agent-orchestrator.js'

interface BenchmarkResult {
  taskType: string
  agentCount: number
  totalTime: number
  overheadTime: number
  totalTokens: number
  success: boolean
}

async function runBenchmark(): Promise<BenchmarkResult[]> {
  const orchestrator = new MultiAgentOrchestrator()
  const results: BenchmarkResult[] = []

  // Benchmark 1: Simple task (1 agent)
  const simpleTask: OrchestratorTask = {
    id: 'bench-1',
    description: 'Simple TypeScript task',
    complexity: 'simple',
    requiredSpecialties: ['typescript'],
  }

  const simpleResult = await orchestrator.orchestrate(simpleTask)
  const simpleMetrics = orchestrator.getMetrics(simpleResult)
  results.push({
    taskType: 'Simple (1 agent)',
    agentCount: simpleMetrics.agentCount,
    totalTime: simpleMetrics.totalTime,
    overheadTime: simpleMetrics.overheadTime,
    totalTokens: simpleMetrics.totalTokens,
    success: simpleResult.resolution.success,
  })

  // Benchmark 2: Medium task (2-3 agents)
  const mediumTask: OrchestratorTask = {
    id: 'bench-2',
    description: 'Medium complexity task',
    complexity: 'medium',
    requiredSpecialties: ['typescript', 'i18next'],
  }

  const mediumResult = await orchestrator.orchestrate(mediumTask)
  const mediumMetrics = orchestrator.getMetrics(mediumResult)
  results.push({
    taskType: 'Medium (2-3 agents)',
    agentCount: mediumMetrics.agentCount,
    totalTime: mediumMetrics.totalTime,
    overheadTime: mediumMetrics.overheadTime,
    totalTokens: mediumMetrics.totalTokens,
    success: mediumResult.resolution.success,
  })

  // Benchmark 3: Complex task (4-5 agents)
  const complexTask: OrchestratorTask = {
    id: 'bench-3',
    description: 'Complex multi-phase task',
    complexity: 'complex',
    requiredSpecialties: ['typescript', 'i18next', 'testing', 'configuration'],
  }

  const complexResult = await orchestrator.orchestrate(complexTask)
  const complexMetrics = orchestrator.getMetrics(complexResult)
  results.push({
    taskType: 'Complex (4-5 agents)',
    agentCount: complexMetrics.agentCount,
    totalTime: complexMetrics.totalTime,
    overheadTime: complexMetrics.overheadTime,
    totalTokens: complexMetrics.totalTokens,
    success: complexResult.resolution.success,
  })

  return results
}

function printResults(results: BenchmarkResult[]): void {
  console.log('\n' + '='.repeat(80))
  console.log('Multi-Agent Orchestration Performance Benchmark')
  console.log('='.repeat(80))
  console.log()

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.taskType}`)
    console.log(`   Agents:        ${result.agentCount}`)
    console.log(`   Total Time:    ${result.totalTime}ms`)
    console.log(`   Overhead:      ${result.overheadTime}ms ${result.overheadTime < 1000 ? '✅' : '❌'}`)
    console.log(`   Tokens:        ${result.totalTokens}`)
    console.log(`   Success:       ${result.success ? '✅' : '❌'}`)
    console.log()
  })

  // Summary
  const avgOverhead = results.reduce((sum, r) => sum + r.overheadTime, 0) / results.length
  const allUnder1s = results.every(r => r.overheadTime < 1000)

  console.log('='.repeat(80))
  console.log('Summary')
  console.log('='.repeat(80))
  console.log(`Average Overhead:     ${avgOverhead.toFixed(2)}ms`)
  console.log(`All Under 1s Target:  ${allUnder1s ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Total Tests:          ${results.length}`)
  console.log(`Success Rate:         ${results.filter(r => r.success).length}/${results.length}`)
  console.log('='.repeat(80))
  console.log()
}

// Run benchmark if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmark()
    .then(printResults)
    .catch(console.error)
}

export { runBenchmark, printResults }
