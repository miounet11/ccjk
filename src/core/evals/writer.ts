/**
 * Report Writers
 */

import type { EvalScenarioReport, EvalSuiteSummary } from './types.js'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export interface WriteReportOptions {
  includeStdout?: boolean
  includeStderr?: boolean
}

export async function writeScenarioReport(
  report: EvalScenarioReport,
  options: WriteReportOptions = {},
): Promise<string> {
  const outputPath = join(
    process.cwd(),
    'evals/reports',
    report.suite,
    `${report.scenarioId}.json`,
  )

  const data = {
    ...report,
    results: report.results.map(run => ({
      ...run,
      stdout: options.includeStdout ? run.stdout : undefined,
      stderr: options.includeStderr ? run.stderr : undefined,
    })),
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8')

  return outputPath
}

export function createSuiteSummary(
  suite: string,
  scenarios: EvalScenarioReport[],
): EvalSuiteSummary {
  const totalScenarios = scenarios.length
  const passedScenarios = scenarios.filter(s => s.successRate === 1).length
  const failedScenarios = totalScenarios - passedScenarios
  const successRate = totalScenarios === 0 ? 0 : passedScenarios / totalScenarios
  const averageScore
    = totalScenarios === 0
      ? 0
      : scenarios.reduce((sum, s) => sum + (s.averageScore ?? s.successRate), 0) / totalScenarios

  return {
    suite,
    totalScenarios,
    passedScenarios,
    failedScenarios,
    successRate,
    averageScore,
    scenarios,
  }
}

export async function writeSuiteSummary(
  summary: EvalSuiteSummary,
): Promise<string> {
  const outputPath = join(
    process.cwd(),
    'evals/reports',
    summary.suite,
    '_summary.json',
  )

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(summary, null, 2), 'utf-8')

  return outputPath
}

export async function generateHtmlDashboard(html: string): Promise<string> {
  const outputPath = join(
    process.cwd(),
    'evals/reports',
    `dashboard-${Date.now()}.html`,
  )

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, html, 'utf-8')

  return outputPath
}

export interface ComparisonReport {
  scenarioId: string
  baselineSuccessRate: number
  candidateSuccessRate: number
  deltaSuccessRate: number
  baselineAverageDurationMs: number
  candidateAverageDurationMs: number
  deltaDurationPercent: number
  regression: boolean
}

export function compareReports(
  baseline: EvalScenarioReport,
  candidate: EvalScenarioReport,
): ComparisonReport {
  const deltaSuccessRate = candidate.successRate - baseline.successRate
  const deltaDurationPercent
    = ((candidate.averageDurationMs - baseline.averageDurationMs)
      / baseline.averageDurationMs)
    * 100

  return {
    scenarioId: baseline.scenarioId,
    baselineSuccessRate: baseline.successRate,
    candidateSuccessRate: candidate.successRate,
    deltaSuccessRate,
    baselineAverageDurationMs: baseline.averageDurationMs,
    candidateAverageDurationMs: candidate.averageDurationMs,
    deltaDurationPercent,
    regression: deltaSuccessRate < -0.05,
  }
}

export async function writeComparisonReport(
  comparisons: ComparisonReport[],
): Promise<string> {
  const outputPath = join(
    process.cwd(),
    'evals/reports',
    `comparison-${Date.now()}.json`,
  )

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(comparisons, null, 2), 'utf-8')

  return outputPath
}

export function hasRegression(comparisons: ComparisonReport[]): boolean {
  return comparisons.some(c => c.regression)
}
