#!/usr/bin/env node
/**
 * CCJK Monitoring System Demo
 *
 * This script demonstrates the monitoring capabilities of CCJK
 */

import { setTimeout } from 'node:timers/promises'
import ansis from 'ansis'
import {
  createReporter,
  getMetricsCollector,
  getPerformanceTracker,
} from '../src/monitoring'

console.log(ansis.bold.cyan('CCJK Monitoring System Demo'))
console.log(ansis.dim('─'.repeat(60)))
console.log('')

// Initialize tracker and collector
const tracker = getPerformanceTracker()
const collector = getMetricsCollector()

// Set up default thresholds
tracker.setupDefaultThresholds()

// Subscribe to events
tracker.on('threshold:exceeded', (event) => {
  console.log(`${ansis.yellow('⚠')} Threshold exceeded: ${event.data.message}`)
})

tracker.on('error:recorded', (event) => {
  console.log(`${ansis.red('✖')} Error recorded: ${event.data.type} - ${event.data.message}`)
})

console.log(ansis.green('✓ Monitoring system initialized'))
console.log('')

// Demo: Simulate command execution
async function demoCommands() {
  console.log(ansis.bold.white('Demo: Command Execution Tracking'))
  console.log('')

  for (let i = 0; i < 5; i++) {
    const command = ['init', 'update', 'config', 'doctor', 'help'][i % 5]
    const duration = 100 + Math.random() * 4000 // 100ms to 4s

    const id = collector.startCommand(command)
    await setTimeout(duration)

    const success = Math.random() > 0.2 // 80% success rate
    collector.endCommand(id, success ? 'success' : 'failed')

    console.log(`  Command: ${command} | Duration: ${duration.toFixed(0)}ms | Status: ${success ? ansis.green('✓') : ansis.red('✗')}`)
  }

  console.log('')
}

// Demo: Simulate API calls
async function demoApiCalls() {
  console.log(ansis.bold.white('Demo: API Call Monitoring'))
  console.log('')

  const providers = ['anthropic', 'openai', 'gemini']

  for (let i = 0; i < 10; i++) {
    const provider = providers[i % providers.length]
    const latency = 100 + Math.random() * 2000 // 100ms to 2s

    const id = collector.startApiCall(provider, '/v1/chat/completions')
    await setTimeout(latency)

    const success = Math.random() > 0.1 // 90% success rate
    collector.endApiCall(id, success ? 'success' : 'failed', {
      statusCode: success ? 200 : 500,
      tokensUsed: Math.floor(100 + Math.random() * 900),
      cached: Math.random() > 0.8, // 20% cache hits
    })

    console.log(`  API: ${provider} | Latency: ${latency.toFixed(0)}ms | Tokens: ${Math.floor(latency / 10)} | Status: ${success ? ansis.green('✓') : ansis.red('✗')}`)
  }

  console.log('')
}

// Demo: Simulate errors
function demoErrors() {
  console.log(ansis.bold.white('Demo: Error Tracking'))
  console.log('')

  const errorTypes = ['APIError', 'ValidationError', 'TimeoutError', 'ParseError']
  const severities = ['low', 'medium', 'high', 'critical'] as const

  for (let i = 0; i < 8; i++) {
    const type = errorTypes[i % errorTypes.length]
    const severity = severities[Math.floor(Math.random() * severities.length)]

    collector.recordError(type, `Sample ${type} occurred with severity ${severity}`, {
      severity,
      context: { attempt: i },
    })

    console.log(`  Error: ${type} | Severity: ${severity}`)
  }

  console.log('')
}

// Demo: Simulate agent tasks
async function demoAgentTasks() {
  console.log(ansis.bold.white('Demo: Agent Task Tracking'))
  console.log('')

  const agents = [
    { id: 'typescript-cli-architect', name: 'TypeScript CLI Architect' },
    { id: 'ccjk-i18n-specialist', name: 'CCJK i18n Specialist' },
    { id: 'ccjk-tools-integration-specialist', name: 'CCJK Tools Integration Specialist' },
  ]

  const taskTypes = ['analysis', 'implementation', 'testing', 'documentation']

  for (let i = 0; i < 6; i++) {
    const agent = agents[i % agents.length]
    const taskType = taskTypes[i % taskTypes.length]
    const duration = 500 + Math.random() * 5000 // 0.5s to 5.5s

    const id = collector.startAgentTask(
      agent.id,
      agent.name,
      taskType,
    )

    await setTimeout(duration)

    const success = Math.random() > 0.15 // 85% success rate
    collector.endAgentTask(id, success ? 'success' : 'failed', {
      tokensUsed: Math.floor(500 + Math.random() * 4500),
    })

    console.log(`  Agent: ${agent.name.slice(0, 25).padEnd(25)} | Task: ${taskType.padEnd(15)} | Duration: ${duration.toFixed(0)}ms`)
  }

  console.log('')
}

// Demo: Memory snapshots
async function demoMemory() {
  console.log(ansis.bold.white('Demo: Memory Monitoring'))
  console.log('')

  // Start automatic memory monitoring
  tracker.startMemoryMonitoring(1000) // Snapshot every second

  // Simulate memory pressure
  const data: string[] = []
  for (let i = 0; i < 100; i++) {
    data.push('x'.repeat(10000)) // 10KB each
    if (i % 20 === 0) {
      const mem = collector.takeMemorySnapshot()
      console.log(`  Snapshot: Heap ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB (${(mem.heapUsedPercent * 100).toFixed(1)}%)`)
    }
  }

  // Clear data
  data.length = 0

  // Take final snapshot
  const finalMem = collector.takeMemorySnapshot()
  console.log(`  Final: Heap ${(finalMem.heapUsed / 1024 / 1024).toFixed(1)}MB`)

  tracker.stopMemoryMonitoring()
  console.log('')
}

// Demo: Generate report
async function demoReport() {
  console.log(ansis.bold.white('Demo: Generate Performance Report'))
  console.log('')

  const reporter = createReporter({
    timeRange: 'daily',
    includeTrends: true,
    includeAnomalies: true,
  })

  const report = reporter.generateReport()
  const reportText = reporter.formatReportAsText(report)

  console.log(ansis.dim('─'.repeat(60)))
  console.log(reportText)
  console.log('')
}

// Main demo function
async function main() {
  // Run demos
  await demoCommands()
  await demoApiCalls()
  demoErrors()
  await demoAgentTasks()
  await demoMemory()
  await demoReport()

  // Display summary
  console.log(ansis.bold.cyan('Demo Summary'))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')

  // Command stats
  const cmdStats = collector.getCommandStats()
  console.log(`Commands: ${cmdStats.reduce((sum, s) => sum + s.totalExecutions, 0)} total`)

  // API stats
  const apiStats = collector.getApiStats()
  console.log(`API Calls: ${apiStats.reduce((sum, a) => sum + a.totalCalls, 0)} total`)

  // Error stats
  const errorStats = collector.getErrorStats()
  console.log(`Errors: ${errorStats.totalErrors} total`)

  // Memory stats
  const memStats = collector.getMemoryStats()
  console.log(`Memory: ${(memStats.current.heapUsed / 1024 / 1024).toFixed(1)}MB used`)

  // Agent stats
  const agentStats = collector.getAgentStats()
  console.log(`Agent Tasks: ${agentStats.reduce((sum, a) => sum + a.totalTasks, 0)} total`)

  console.log('')
  console.log(ansis.green('✓ Demo completed'))
  console.log('')
  console.log(ansis.dim('To see the real-time dashboard, run: ccjk monitor'))
  console.log('')
}

// Run the demo
main().catch((error) => {
  console.error(ansis.red('Demo failed:'), error)
  process.exit(1)
})
