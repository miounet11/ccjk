import ansis from 'ansis'
import {
  getBestResearchResult,
  getLatestResearchSession,
  getResearchReport,
  getResearchSessionStatus,
  listResearchResults,
  listResearchSessions,
  runResearchExperiment,
} from '../services/research-runner'

export interface ResearchCommandOptions {
  name?: string
  cmd?: string
  metric?: string
  budgetMs?: number
  cwd?: string
  limit?: number
  baseline?: string
  objective?: 'maximize' | 'minimize' | 'auto'
  dbPath?: string
}

function printDivider(): void {
  console.log(ansis.dim('─'.repeat(60)))
}

function formatMetric(metricName?: string, metricValue?: number): string {
  if (!metricName) {
    return 'not configured'
  }

  if (metricValue === undefined) {
    return `${metricName} (not found)`
  }

  return `${metricName}=${metricValue}`
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return 'unknown'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

function previewCommand(command: string, maxLength: number = 48): string {
  if (command.length <= maxLength) {
    return command
  }

  return `${command.slice(0, maxLength - 1)}…`
}

function getLatestTaskData(status: Awaited<ReturnType<typeof getResearchSessionStatus>>): Record<string, any> {
  if (!status || status.tasks.length === 0) {
    return {}
  }

  const latestTask = status.tasks[status.tasks.length - 1] as any
  return (latestTask?.output as any)?.data || {}
}

export async function researchCommand(
  action: string,
  args: string[] = [],
  options: ResearchCommandOptions = {},
): Promise<void> {
  switch (action) {
    case 'run':
      await runResearchCommand(options)
      return
    case 'status':
      await showResearchStatus((args[0] as string | undefined) || undefined, options)
      return
    case 'sessions':
    case 'list':
      await listResearchCommand(options)
      return
    case 'results':
      await showResearchResults(options)
      return
    case 'report':
      await showResearchReport((args[0] as string | undefined) || undefined, options)
      return
    case 'help':
    case '':
      showResearchHelp()
      return
    default:
      console.error(ansis.red(`Unknown research action: ${action}`))
      showResearchHelp()
  }
}

async function runResearchCommand(options: ResearchCommandOptions): Promise<void> {
  if (!options.cmd) {
    console.error(ansis.red('Error: --cmd is required for `ccjk research run`'))
    console.log(ansis.dim('Example: ccjk research run --name baseline --cmd "python train.py" --metric val_bpb'))
    return
  }

  const result = await runResearchExperiment({
    name: options.name,
    command: options.cmd,
    metricName: options.metric,
    budgetMs: options.budgetMs,
    cwd: options.cwd,
    baselineSessionId: options.baseline,
    objective: options.objective,
    dbPath: options.dbPath,
  })

  console.log('')
  console.log(ansis.bold.cyan('🔬 Research Run'))
  printDivider()
  console.log(ansis.gray(`Session:   ${result.sessionId}`))
  console.log(ansis.gray(`Task:      ${result.taskId}`))
  console.log(ansis.gray(`Name:      ${result.name}`))
  console.log(ansis.gray(`Phase:     ${result.phase}`))
  console.log(ansis.gray(`Objective: ${result.objective}`))
  console.log(ansis.gray(`Verdict:   ${result.verdict}`))
  console.log(ansis.gray(`Reason:    ${result.verdictReason}`))
  console.log(ansis.gray(`Command:   ${result.command}`))
  console.log(ansis.gray(`CWD:       ${result.cwd}`))
  console.log(ansis.gray(`Status:    ${result.status}`))
  console.log(ansis.gray(`Exit code: ${result.exitCode}`))
  console.log(ansis.gray(`Metric:    ${formatMetric(result.metricName, result.metricValue)}`))
  if (result.comparison) {
    console.log(ansis.gray(`Baseline:  ${result.comparison.baselineName} (${result.comparison.baselineSessionId})`))
    console.log(ansis.gray(`Compare:   ${result.comparison.result}`))
  }
  console.log(ansis.gray(`Duration:  ${result.durationMs}ms`))

  if (result.stderr) {
    console.log('')
    console.log(ansis.bold('stderr'))
    console.log(ansis.dim(result.stderr))
  }

  if (result.stdout) {
    console.log('')
    console.log(ansis.bold('stdout'))
    console.log(ansis.dim(result.stdout))
  }

  console.log('')
}

async function showResearchStatus(sessionId: string | undefined, options: ResearchCommandOptions): Promise<void> {
  const resolvedSessionId = sessionId || getLatestResearchSession(options.dbPath)?.id
  if (!resolvedSessionId) {
    console.log(ansis.yellow('No research sessions found.'))
    console.log('')
    return
  }

  const status = getResearchSessionStatus(resolvedSessionId, options.dbPath)
  if (!status) {
    console.log(ansis.yellow(`Research session not found: ${resolvedSessionId}`))
    console.log('')
    return
  }

  const outputData = getLatestTaskData(status)
  const metricValue = typeof outputData.metricValue === 'number'
    ? outputData.metricValue
    : typeof status.metadata.metricValue === 'number'
      ? status.metadata.metricValue
      : undefined

  console.log('')
  console.log(ansis.bold.cyan('🧪 Research Status'))
  printDivider()
  console.log(ansis.gray(`Session:   ${status.sessionId}`))
  console.log(ansis.gray(`Name:      ${status.metadata.name || status.sessionId}`))
  console.log(ansis.gray(`Phase:     ${status.metadata.currentPhase || 'unknown'}`))
  console.log(ansis.gray(`Objective: ${status.metadata.objective || 'unknown'}`))
  console.log(ansis.gray(`Verdict:   ${status.metadata.verdict || 'unknown'}`))
  console.log(ansis.gray(`Reason:    ${status.metadata.verdictReason || 'unknown'}`))
  console.log(ansis.gray(`Command:   ${status.metadata.command || 'unknown'}`))
  console.log(ansis.gray(`Metric:    ${formatMetric(status.metadata.metricName, metricValue)}`))
  console.log(ansis.gray(`Status:    ${outputData.status || status.metadata.status || 'unknown'}`))
  console.log(ansis.gray(`Exit code: ${outputData.exitCode ?? status.metadata.exitCode ?? 'unknown'}`))
  console.log(ansis.gray(`Duration:  ${outputData.durationMs ?? status.metadata.durationMs ?? 'unknown'}ms`))
  console.log(ansis.gray(`Tasks:     ${status.metrics.completedTasks}/${status.metrics.totalTasks} completed`))
  console.log(ansis.gray(`Success:   ${Math.round((status.metrics.successRate || 0) * 100)}%`))
  console.log(ansis.gray(`Avg ms:    ${status.metrics.avgExecutionTime}`))
  console.log(ansis.gray(`Next:      ${status.recovery.nextExecutable.length}`))

  if (status.metadata.comparison) {
    const comparison = status.metadata.comparison as {
      baselineName?: string
      baselineSessionId?: string
      result?: string
      summary?: string
    }
    console.log(ansis.gray(`Baseline:  ${comparison.baselineName || comparison.baselineSessionId || 'unknown'}`))
    console.log(ansis.gray(`Compare:   ${comparison.result || 'unknown'}`))
    console.log(ansis.gray(`Summary:   ${comparison.summary || 'unknown'}`))
  }

  if (status.decisions.length > 0) {
    const lastDecision = status.decisions[status.decisions.length - 1]
    console.log(ansis.gray(`Decision:  ${lastDecision.outcome || lastDecision.decision}`))
  }

  console.log('')
}

async function listResearchCommand(options: ResearchCommandOptions): Promise<void> {
  const sessions = listResearchSessions(options.limit || 10, options.dbPath)

  console.log('')
  console.log(ansis.bold.cyan('📚 Research Sessions'))
  printDivider()

  if (sessions.length === 0) {
    console.log(ansis.yellow('No research sessions found.'))
    console.log('')
    return
  }

  for (const session of sessions) {
    console.log(ansis.bold(session.name))
    console.log(ansis.gray(`  ${session.id}`))
    console.log(ansis.gray(`  phase: ${session.currentPhase}`))
    console.log(ansis.gray(`  objective: ${session.objective || 'unknown'}`))
    console.log(ansis.gray(`  verdict: ${session.verdict || 'unknown'}`))
    if (session.baselineSessionId) {
      console.log(ansis.gray(`  baseline: ${session.baselineSessionId}`))
    }
    console.log(ansis.gray(`  cmd: ${session.command}`))
    console.log(ansis.gray(`  metric: ${session.metricName || 'not configured'}`))
    console.log(ansis.gray(`  cwd: ${session.cwd}`))
  }

  console.log('')
}

async function showResearchResults(options: ResearchCommandOptions): Promise<void> {
  const rows = listResearchResults(options.limit || 10, options.dbPath)
  const best = getBestResearchResult(options.dbPath)

  console.log('')
  console.log(ansis.bold.cyan('📈 Research Results'))
  printDivider()

  if (rows.length === 0) {
    console.log(ansis.yellow('No research results found.'))
    console.log('')
    return
  }

  if (best) {
    console.log(ansis.bold('Best'))
    console.log(ansis.gray(`  ${best.name} · ${formatMetric(best.metricName, best.metricValue)} · ${best.status} · ${best.durationMs}ms`))
    console.log(ansis.gray(`  objective: ${best.metricName ? (['loss', 'error', 'bpb', 'perplexity', 'ppl', 'latency', 'duration', 'time', 'cost', 'price', 'wer', 'cer'].some(keyword => best.metricName?.toLowerCase().includes(keyword)) ? 'minimize' : 'maximize') : 'unknown'}`))
    console.log(ansis.gray(`  ${previewCommand(best.command)}`))
    console.log('')
  }

  console.log(ansis.bold('Recent'))
  for (const row of rows) {
    console.log(ansis.gray(`${formatTimestamp(row.timestamp)} · ${row.name} · ${row.status} · ${formatMetric(row.metricName, row.metricValue)} · ${row.durationMs}ms · ${previewCommand(row.command)}`))
  }

  console.log('')
}

async function showResearchReport(sessionId: string | undefined, options: ResearchCommandOptions): Promise<void> {
  const report = getResearchReport(sessionId, options.dbPath)
  if (!report) {
    console.log(ansis.yellow(sessionId ? `Research session not found: ${sessionId}` : 'No research sessions found.'))
    console.log('')
    return
  }

  console.log('')
  console.log(ansis.bold.cyan('📝 Research Report'))
  printDivider()
  console.log(ansis.gray(`Session:   ${report.sessionId}`))
  console.log(ansis.gray(`Name:      ${report.name}`))
  console.log(ansis.gray(`Created:   ${formatTimestamp(report.createdAt)}`))
  console.log(ansis.gray(`Command:   ${report.command}`))
  console.log(ansis.gray(`CWD:       ${report.cwd}`))
  console.log(ansis.gray(`Status:    ${report.status}`))
  console.log(ansis.gray(`Exit code: ${report.exitCode}`))
  console.log(ansis.gray(`Duration:  ${report.durationMs}ms`))
  console.log(ansis.gray(`Metric:    ${formatMetric(report.metricName, report.metricValue)}`))
  console.log(ansis.gray(`Objective: ${report.objective || 'unknown'}`))
  console.log(ansis.gray(`Reason:    ${report.verdictReason}`))
  if (report.comparison) {
    console.log(ansis.gray(`Baseline:  ${report.comparison.baselineName} (${report.comparison.baselineSessionId})`))
    console.log(ansis.gray(`Compare:   ${report.comparison.result}`))
  }
  console.log(ansis.gray(`Outcome:   ${report.outcome}`))

  if (report.phaseHistory.length > 0) {
    console.log(ansis.gray(`Phases:    ${report.phaseHistory.join(' → ')}`))
  }

  console.log('')
}

export function showResearchHelp(): void {
  console.log('')
  console.log(ansis.bold.cyan('ccjk research'))
  printDivider()
  console.log('  run      Run a persisted research experiment with optional baseline comparison')
  console.log('  status   Show the latest or selected research session status')
  console.log('  sessions List recent research sessions')
  console.log('  results  Show recent result rows and the current best run')
  console.log('  report   Render a compact persisted research report')
  console.log('')
  console.log(ansis.dim('Example: ccjk research run --name baseline --cmd "python train.py" --metric val_bpb --objective minimize'))
  console.log(ansis.dim('Example: ccjk research run --name candidate --cmd "python train.py --lr 1e-4" --metric val_bpb --baseline research-123'))
  console.log(ansis.dim('Example: ccjk research report research-123'))
  console.log('')
}
