export interface EvalAssertion {
  type: 'exit_code' | 'file_exists' | 'contains_text' | 'json_field' | 'threshold'
  expected?: number | string | boolean
  path?: string
  value?: string
  field?: string
  operator?: 'eq' | 'gte' | 'lte'
}

export interface EvalScenario {
  id: string
  suite: string
  description: string
  command: string
  runs?: number
  assertions: EvalAssertion[]
  metrics?: string[]
}

export interface EvalRunResult {
  scenarioId: string
  runIndex: number
  success: boolean
  durationMs: number
  exitCode: number
  metrics: Record<string, number | string | boolean>
  assertionResults: EvalAssertionResult[]
  score?: number
  stdout?: string
  stderr?: string
}

export interface EvalAssertionResult {
  type: string
  success: boolean
  message: string
}

export interface EvalScenarioReport {
  scenarioId: string
  suite: string
  totalRuns: number
  passedRuns: number
  failedRuns: number
  averageDurationMs: number
  successRate: number
  averageScore?: number
  results: EvalRunResult[]
}

export interface EvalSuiteSummary {
  suite: string
  totalScenarios: number
  passedScenarios: number
  failedScenarios: number
  successRate: number
  averageScore: number
  scenarios: EvalScenarioReport[]
}

export interface EvalDashboard {
  title: string
  timestamp: string
  totalScenarios: number
  passedScenarios: number
  failedScenarios: number
  overallSuccessRate: number
  suites: EvalSuiteSummary[]
}

export interface EvalComparisonReport {
  scenarioId: string
  baselineSuccessRate: number
  candidateSuccessRate: number
  baselineAverageDurationMs: number
  candidateAverageDurationMs: number
  deltaSuccessRate: number
  deltaDurationMs: number
}
