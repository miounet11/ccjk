/**
 * CCJK Dashboard
 *
 * Generates human-readable benchmark views and reports.
 */

import type { EvalDashboard, EvalSuiteSummary } from '../core/evals'
import { generateHtmlDashboard } from '../core/evals'

export { generateHtmlDashboard }

/**
 * Create dashboard from suite summaries
 */
export function createDashboard(
  title: string,
  suites: EvalSuiteSummary[],
): EvalDashboard {
  let totalScenarios = 0
  let passedScenarios = 0
  let failedScenarios = 0

  for (const suite of suites) {
    totalScenarios += suite.totalScenarios
    passedScenarios += suite.passedScenarios
    failedScenarios += suite.failedScenarios
  }

  const overallSuccessRate = totalScenarios > 0 ? passedScenarios / totalScenarios : 0

  return {
    title,
    timestamp: new Date().toISOString(),
    totalScenarios,
    passedScenarios,
    failedScenarios,
    overallSuccessRate,
    suites,
  }
}
