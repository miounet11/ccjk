#!/usr/bin/env node
import { join } from 'path'
import {
  loadScenarios,
  runScenario,
  gradeRun,
  writeJsonReports,
  writeHtmlDashboard,
  EvalScenarioReport
} from '../src/core/evals/index.js'

interface RunnerOptions {
  scenario?: string
  suite?: string
  json?: boolean
  html?: boolean
}

async function main() {
  const args = process.argv.slice(2)
  const options: RunnerOptions = {}

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scenario' && args[i + 1]) {
      options.scenario = args[++i]
    } else if (args[i] === '--suite' && args[i + 1]) {
      options.suite = args[++i]
    } else if (args[i] === '--json') {
      options.json = true
    } else if (args[i] === '--html') {
      options.html = true
    }
  }

  const scenariosDir = join(process.cwd(), 'evals/scenarios')
  const reportsDir = join(process.cwd(), 'evals/reports')

  const scenarios = loadScenarios(scenariosDir, {
    suite: options.suite,
    id: options.scenario
  })

  if (scenarios.length === 0) {
    console.error('No scenarios found')
    process.exit(1)
  }

  console.log(`Running ${scenarios.length} scenario(s)...\n`)

  const reports: EvalScenarioReport[] = []

  for (const scenario of scenarios) {
    console.log(`[${scenario.suite}] ${scenario.id}: ${scenario.description}`)

    const runResults = await runScenario(scenario)
    const gradedResults = runResults.map(r => gradeRun(scenario, r))

    const passedRuns = gradedResults.filter(r => r.success).length
    const totalRuns = gradedResults.length
    const avgDuration = gradedResults.reduce((sum, r) => sum + r.durationMs, 0) / totalRuns

    const report: EvalScenarioReport = {
      scenarioId: scenario.id,
      suite: scenario.suite,
      totalRuns,
      passedRuns,
      failedRuns: totalRuns - passedRuns,
      averageDurationMs: avgDuration,
      successRate: passedRuns / totalRuns,
      results: gradedResults
    }

    reports.push(report)

    console.log(`  Passed: ${passedRuns}/${totalRuns}`)
    console.log(`  Avg Duration: ${Math.round(avgDuration)}ms`)
    console.log()
  }

  const totalPassed = reports.filter(r => r.successRate === 1).length
  const totalFailed = reports.length - totalPassed
  const overallAvgDuration = reports.reduce((sum, r) => sum + r.averageDurationMs, 0) / reports.length

  console.log('Summary:')
  console.log(`  Scenarios: ${reports.length}`)
  console.log(`  Passed: ${totalPassed}`)
  console.log(`  Failed: ${totalFailed}`)
  console.log(`  Average Duration: ${Math.round(overallAvgDuration)}ms`)

  if (options.json !== false) {
    const jsonPaths = writeJsonReports(reports, reportsDir)
    console.log(`  Reports: ${jsonPaths.join(', ')}`)
  }

  if (options.html !== false) {
    const htmlPath = join(reportsDir, 'index.html')
    writeHtmlDashboard(reports, htmlPath)
    console.log(`  Dashboard: ${htmlPath}`)
  }

  process.exit(totalFailed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
