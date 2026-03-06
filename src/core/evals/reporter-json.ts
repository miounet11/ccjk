import type { EvalScenarioReport } from './types.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export function writeJsonReport(report: EvalScenarioReport, outputPath: string): void {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8')
}

export function writeJsonReports(reports: EvalScenarioReport[], outputDir: string): string[] {
  const paths: string[] = []

  for (const report of reports) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${report.scenarioId}-${timestamp}.json`
    const outputPath = `${outputDir}/${filename}`

    writeJsonReport(report, outputPath)
    paths.push(outputPath)
  }

  return paths
}
