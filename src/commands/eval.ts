/**
 * CCJK Eval Command
 *
 * Run evaluation scenarios and generate reports.
 */

import type { EvalScenarioReport } from '../core/evals'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gradeRun, loadScenarios, runScenario } from '../core/evals'
import { writeHtmlDashboard } from '../core/evals/reporter-html'
import { compareReports, createSuiteSummary, writeComparisonReport, writeScenarioReport, writeSuiteSummary } from '../core/evals/writer'

export interface EvalRunOptions {
  scenario?: string
  suite?: string
  runs?: number
  verbose?: boolean
  html?: boolean
  json?: boolean
}

export interface EvalCompareOptions {
  baseline: string
  candidate: string
  verbose?: boolean
}

export interface EvalCommandOptions {
  scenario?: string
  suite?: string
  runs?: number
  verbose?: boolean
  html?: boolean
  json?: boolean
  baseline?: string
  candidate?: string
  compare?: boolean
}

/**
 * Run evaluation scenarios
 */
export async function evalRun(options: EvalRunOptions = {}): Promise<void> {
  const {
    scenario,
    suite,
    runs = 1,
    verbose = false,
    html = true,
    json = true,
  } = options

  console.log('🔍 Loading scenarios...')

  const scenarios = loadScenarios('evals/scenarios', {
    suite,
    id: scenario,
  })

  if (scenarios.length === 0) {
    console.error('❌ No scenarios found')
    process.exit(1)
  }

  console.log(`📋 Found ${scenarios.length} scenario(s)\n`)

  const reports: EvalScenarioReport[] = []

  for (const scenario of scenarios) {
    console.log(`▶️  Running: ${scenario.id}`)

    const results = await runScenario({
      ...scenario,
      runs,
    })
    const gradedResults = results.map(r => gradeRun(scenario, r))

    const passedRuns = gradedResults.filter(r => r.success).length
    const totalRuns = gradedResults.length
    const avgDuration = gradedResults.reduce((sum, r) => sum + r.durationMs, 0) / totalRuns
    const avgScore = gradedResults.reduce((sum, r) => sum + (r.score ?? (r.success ? 1 : 0)), 0) / totalRuns

    const report: EvalScenarioReport = {
      scenarioId: scenario.id,
      suite: scenario.suite,
      totalRuns,
      passedRuns,
      failedRuns: totalRuns - passedRuns,
      averageDurationMs: avgDuration,
      successRate: passedRuns / totalRuns,
      averageScore: avgScore,
      results: gradedResults,
    }

    reports.push(report)

    const status = report.successRate === 1 ? '✅' : '❌'
    console.log(`${status} ${scenario.id}: ${report.passedRuns}/${report.totalRuns} passed (${(report.successRate * 100).toFixed(0)}%)\n`)

    if (json) {
      await writeScenarioReport(report, { includeStdout: verbose, includeStderr: verbose })
    }
  }

  // Group by suite
  const suiteMap = new Map<string, EvalScenarioReport[]>()
  for (const report of reports) {
    const suiteReports = suiteMap.get(report.suite) || []
    suiteReports.push(report)
    suiteMap.set(report.suite, suiteReports)
  }

  // Create suite summaries
  const suiteSummaries = []
  for (const [suite, suiteReports] of suiteMap) {
    const summary = createSuiteSummary(suite, suiteReports)
    suiteSummaries.push(summary)

    if (json) {
      await writeSuiteSummary(summary)
    }
  }

  // Generate dashboard
  if (html) {
    const outputPath = join(process.cwd(), 'evals/reports', `dashboard-${Date.now()}.html`)
    writeHtmlDashboard(reports, outputPath)
    console.log(`📊 Dashboard: ${outputPath}\n`)
  }

  // Print summary
  console.log('📊 Summary:')
  console.log(`   Total Scenarios: ${reports.length}`)
  console.log(`   Passed: ${reports.filter(r => r.successRate === 1).length}`)
  console.log(`   Failed: ${reports.filter(r => r.successRate < 1).length}`)

  const overallSuccessRate = reports.reduce((sum, r) => sum + r.successRate, 0) / reports.length
  console.log(`   Success Rate: ${(overallSuccessRate * 100).toFixed(1)}%`)

  if (reports.some(r => r.successRate < 1)) {
    process.exit(1)
  }
}

/**
 * Main eval command entry point
 */
export async function evalCommand(options: EvalCommandOptions): Promise<void> {
  if (options.compare) {
    if (!options.baseline || !options.candidate) {
      console.error('❌ Both --baseline and --candidate are required for comparison')
      process.exit(1)
    }
    await evalCompare({ baseline: options.baseline, candidate: options.candidate, verbose: options.verbose })
    return
  }

  await evalRun({
    scenario: options.scenario,
    suite: options.suite,
    runs: options.runs,
    verbose: options.verbose,
    html: options.html,
    json: options.json,
  })
}

/**
 * Compare evaluation reports
 */
export async function evalCompare(options: EvalCompareOptions): Promise<void> {
  const { baseline, candidate } = options

  console.log('📊 Loading reports...')

  const baselineContent = await readFile(baseline, 'utf-8')
  const candidateContent = await readFile(candidate, 'utf-8')

  const baselineReport = JSON.parse(baselineContent) as EvalScenarioReport
  const candidateReport = JSON.parse(candidateContent) as EvalScenarioReport

  console.log(`Baseline: ${baseline}`)
  console.log(`Candidate: ${candidate}\n`)

  const comparison = compareReports(baselineReport, candidateReport)

  console.log(`Scenario: ${comparison.scenarioId}`)
  console.log(`Success Rate: ${(comparison.baselineSuccessRate * 100).toFixed(0)}% → ${(comparison.candidateSuccessRate * 100).toFixed(0)}% (${comparison.deltaSuccessRate >= 0 ? '+' : ''}${(comparison.deltaSuccessRate * 100).toFixed(1)}%)`)
  console.log(`Duration: ${comparison.baselineAverageDurationMs.toFixed(0)}ms → ${comparison.candidateAverageDurationMs.toFixed(0)}ms (${comparison.deltaDurationPercent >= 0 ? '+' : ''}${comparison.deltaDurationPercent.toFixed(1)}%)\n`)

  if (comparison.regression) {
    console.log('❌ REGRESSION DETECTED')
    process.exit(1)
  }
  else {
    console.log('✅ No regression')
  }

  await writeComparisonReport([comparison])
}
