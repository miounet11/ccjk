import type { EvalComparisonReport, EvalScenarioReport } from './types.js'

export function compareReports(
  baseline: EvalScenarioReport,
  candidate: EvalScenarioReport,
): EvalComparisonReport {
  if (baseline.scenarioId !== candidate.scenarioId) {
    throw new Error(
      `Scenario ID mismatch: baseline=${baseline.scenarioId}, candidate=${candidate.scenarioId}`,
    )
  }

  const deltaSuccessRate = candidate.successRate - baseline.successRate
  const deltaDurationMs = candidate.averageDurationMs - baseline.averageDurationMs

  return {
    scenarioId: baseline.scenarioId,
    baselineSuccessRate: baseline.successRate,
    candidateSuccessRate: candidate.successRate,
    baselineAverageDurationMs: baseline.averageDurationMs,
    candidateAverageDurationMs: candidate.averageDurationMs,
    deltaSuccessRate,
    deltaDurationMs,
  }
}
