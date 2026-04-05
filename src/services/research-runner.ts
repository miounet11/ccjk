import type { Task as BrainTask, TaskOutput } from '../brain/orchestrator-types'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { nanoid } from 'nanoid'
import { dirname, join } from 'pathe'
import { TaskPersistence } from '../brain/task-persistence'
import { TaskQueue } from '../brain/task-queue'
import { executeCommand } from '../utils/command/executor'

const DEFAULT_BUDGET_MS = 5 * 60 * 1000
const DEFAULT_SESSION_LIMIT = 10
const RESEARCH_SESSION_KIND = 'research'
const RESULTS_LEDGER_FILE = 'research-results.tsv'
const RESULTS_LEDGER_HEADERS = [
  'timestamp',
  'sessionId',
  'taskId',
  'name',
  'phase',
  'verdict',
  'status',
  'exitCode',
  'metricName',
  'metricValue',
  'durationMs',
  'cwd',
  'command',
] as const

type ResultsLedgerColumn = typeof RESULTS_LEDGER_HEADERS[number]

interface CommandExecutionResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number
  error?: string
}

export type ResearchPhase = 'brief' | 'baseline' | 'experiment' | 'verify' | 'report'
export type ResearchVerdict = 'PASS' | 'FAIL' | 'PARTIAL'

export interface ResearchRunOptions {
  name?: string
  command: string
  metricName?: string
  budgetMs?: number
  cwd?: string
  maxRetries?: number
  dbPath?: string
}

export interface ResearchRunResult {
  sessionId: string
  taskId: string
  name: string
  command: string
  cwd: string
  metricName?: string
  metricValue?: number
  success: boolean
  status: 'completed' | 'failed' | 'timeout'
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  phase: ResearchPhase
  verdict: ResearchVerdict
  phaseHistory: ResearchPhase[]
  createdAt: string
}

export interface ResearchSessionSummary {
  id: string
  createdAt: number
  name: string
  command: string
  cwd: string
  metricName?: string
  budgetMs: number
  currentPhase: ResearchPhase
  verdict?: ResearchVerdict
}

export interface ResearchSessionStatus {
  sessionId: string
  metadata: Record<string, any>
  tasks: ReturnType<TaskPersistence['getSessionTasks']>
  metrics: ReturnType<TaskPersistence['getSessionMetrics']>
  decisions: ReturnType<TaskPersistence['getDecisionLog']>
  recovery: ReturnType<TaskPersistence['recoverExecutionState']>
}

export interface ResearchResultRow {
  timestamp: string
  sessionId: string
  taskId: string
  name: string
  phase: ResearchPhase
  verdict: ResearchVerdict
  status: string
  exitCode: number
  metricName?: string
  metricValue?: number
  durationMs: number
  cwd: string
  command: string
}

export interface ResearchReport {
  sessionId: string
  name: string
  createdAt: string
  currentPhase: ResearchPhase
  verdict: ResearchVerdict
  command: string
  cwd: string
  status: string
  exitCode: number
  metricName?: string
  metricValue?: number
  durationMs: number
  phaseHistory: ResearchPhase[]
  outcome: string
  content: string
}

class ResearchCommandError extends Error {
  constructor(readonly result: CommandExecutionResult) {
    super(result.error || `Command exited with code ${result.exitCode}`)
    this.name = 'ResearchCommandError'
  }
}

function createPersistence(dbPath?: string): TaskPersistence {
  return new TaskPersistence(dbPath)
}

function getResearchDataDir(dbPath?: string): string {
  const resolvedDbPath = dbPath || join(homedir(), '.ccjk', 'brain.db')
  const dir = dirname(resolvedDbPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getResultsLedgerPath(dbPath?: string): string {
  return join(getResearchDataDir(dbPath), RESULTS_LEDGER_FILE)
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractMetricValue(output: string, metricName?: string): number | undefined {
  if (!metricName) {
    return undefined
  }

  const matcher = new RegExp(`(?:^|\\b)${escapeRegex(metricName)}\\s*[:=]\\s*(-?\\d+(?:\\.\\d+)?)`, 'im')
  const match = output.match(matcher)
  if (!match) {
    return undefined
  }

  const value = Number.parseFloat(match[1])
  return Number.isFinite(value) ? value : undefined
}

function getFailureStatus(result: CommandExecutionResult, error?: Error): 'failed' | 'timeout' {
  const message = [result.error, result.stderr, error?.message].filter(Boolean).join(' ')
  return /timed out/i.test(message) ? 'timeout' : 'failed'
}

function inferResearchPhase(name: string): ResearchPhase {
  return /baseline/i.test(name) ? 'baseline' : 'experiment'
}

function buildPhaseHistory(runPhase: ResearchPhase): ResearchPhase[] {
  return ['brief', runPhase, 'verify', 'report']
}

function determineVerdict(success: boolean, metricName?: string, metricValue?: number): ResearchVerdict {
  if (!success) {
    return 'FAIL'
  }

  if (metricName && metricValue === undefined) {
    return 'PARTIAL'
  }

  return 'PASS'
}

function sanitizeLedgerField(value: unknown): string {
  if (value === undefined || value === null) {
    return ''
  }

  return String(value)
    .replace(/\t/g, ' ')
    .replace(/\r?\n/g, ' ')
    .trim()
}

function ensureResultsLedger(dbPath?: string): string {
  const ledgerPath = getResultsLedgerPath(dbPath)
  if (!existsSync(ledgerPath)) {
    writeFileSync(ledgerPath, `${RESULTS_LEDGER_HEADERS.join('\t')}\n`, 'utf8')
  }
  return ledgerPath
}

function serializeResultRow(row: ResearchResultRow): string {
  const values: Record<ResultsLedgerColumn, string> = {
    timestamp: sanitizeLedgerField(row.timestamp),
    sessionId: sanitizeLedgerField(row.sessionId),
    taskId: sanitizeLedgerField(row.taskId),
    name: sanitizeLedgerField(row.name),
    phase: sanitizeLedgerField(row.phase),
    verdict: sanitizeLedgerField(row.verdict),
    status: sanitizeLedgerField(row.status),
    exitCode: sanitizeLedgerField(row.exitCode),
    metricName: sanitizeLedgerField(row.metricName),
    metricValue: sanitizeLedgerField(row.metricValue),
    durationMs: sanitizeLedgerField(row.durationMs),
    cwd: sanitizeLedgerField(row.cwd),
    command: sanitizeLedgerField(row.command),
  }

  return RESULTS_LEDGER_HEADERS.map(header => values[header]).join('\t')
}

function parseResultRow(line: string): ResearchResultRow | null {
  if (!line.trim()) {
    return null
  }

  const columns = line.split('\t')
  if (columns.length < RESULTS_LEDGER_HEADERS.length) {
    return null
  }

  const [
    timestamp,
    sessionId,
    taskId,
    name,
    phase,
    verdict,
    status,
    exitCode,
    metricName,
    metricValue,
    durationMs,
    cwd,
    command,
  ] = columns

  const parsedMetric = metricValue ? Number.parseFloat(metricValue) : undefined

  return {
    timestamp,
    sessionId,
    taskId,
    name,
    phase: (phase as ResearchPhase) || 'experiment',
    verdict: (verdict as ResearchVerdict) || 'PARTIAL',
    status,
    exitCode: Number.parseInt(exitCode, 10) || 0,
    metricName: metricName || undefined,
    metricValue: Number.isFinite(parsedMetric as number) ? parsedMetric : undefined,
    durationMs: Number.parseInt(durationMs, 10) || 0,
    cwd,
    command,
  }
}

function appendResultRow(row: ResearchResultRow, dbPath?: string): void {
  const ledgerPath = ensureResultsLedger(dbPath)
  appendFileSync(ledgerPath, `${serializeResultRow(row)}\n`, 'utf8')
}

function readAllResultRows(dbPath?: string): ResearchResultRow[] {
  const ledgerPath = getResultsLedgerPath(dbPath)
  if (!existsSync(ledgerPath)) {
    return []
  }

  const content = readFileSync(ledgerPath, 'utf8')
  const lines = content.split(/\r?\n/).filter(Boolean)
  if (lines.length <= 1) {
    return []
  }

  return lines
    .slice(1)
    .map(parseResultRow)
    .filter((row): row is ResearchResultRow => Boolean(row))
}

function metricDirection(metricName?: string): 'asc' | 'desc' {
  const normalized = (metricName || '').toLowerCase()
  if (!normalized) {
    return 'desc'
  }

  const lowerIsBetter = ['loss', 'error', 'bpb', 'perplexity', 'ppl', 'latency', 'duration', 'time', 'cost', 'price', 'wer', 'cer']
  if (lowerIsBetter.some(keyword => normalized.includes(keyword))) {
    return 'asc'
  }

  return 'desc'
}

function selectBestByMetric(rows: ResearchResultRow[]): ResearchResultRow | undefined {
  const newestMetricRow = [...rows].reverse().find(row => row.metricName && row.metricValue !== undefined)
  if (!newestMetricRow?.metricName) {
    return [...rows].reverse().find(row => row.verdict === 'PASS') || rows[rows.length - 1]
  }

  const candidates = rows.filter(row => row.metricName === newestMetricRow.metricName && row.metricValue !== undefined)
  if (candidates.length === 0) {
    return newestMetricRow
  }

  const direction = metricDirection(newestMetricRow.metricName)
  return candidates.reduce((best, current) => {
    if (!best.metricValue || current.metricValue === undefined) {
      return best
    }

    if (direction === 'asc') {
      return current.metricValue < best.metricValue ? current : best
    }

    return current.metricValue > best.metricValue ? current : best
  })
}

function buildResearchTask(taskId: string, options: Required<Pick<ResearchRunOptions, 'name' | 'command' | 'cwd' | 'maxRetries' | 'budgetMs'>> & Pick<ResearchRunOptions, 'metricName'>): BrainTask {
  return {
    id: taskId,
    name: options.name,
    description: `Run research command: ${options.command}`,
    type: 'research-run',
    priority: 'normal',
    status: 'pending',
    requiredCapabilities: [],
    input: {
      parameters: {
        command: options.command,
        cwd: options.cwd,
        metricName: options.metricName,
        budgetMs: options.budgetMs,
      },
      instructions: 'Execute the configured research command and capture its metric output.',
    },
    dependencies: [],
    maxRetries: options.maxRetries,
    retryCount: 0,
    timeout: options.budgetMs,
    metadata: {
      tags: ['research', 'experiment'],
      category: 'research',
      createdBy: 'ccjk research',
      custom: {
        metricName: options.metricName,
        cwd: options.cwd,
      },
    },
    createdAt: new Date().toISOString(),
    progress: 0,
  }
}

function normalizeRunOptions(options: ResearchRunOptions): Required<Pick<ResearchRunOptions, 'command' | 'name' | 'cwd' | 'budgetMs' | 'maxRetries'>> & Pick<ResearchRunOptions, 'metricName' | 'dbPath'> {
  return {
    command: options.command,
    name: options.name || `research-${Date.now()}`,
    cwd: options.cwd || process.cwd(),
    budgetMs: options.budgetMs || DEFAULT_BUDGET_MS,
    maxRetries: options.maxRetries ?? 0,
    metricName: options.metricName,
    dbPath: options.dbPath,
  }
}

export async function runResearchExperiment(options: ResearchRunOptions): Promise<ResearchRunResult> {
  const normalized = normalizeRunOptions(options)
  const persistence = createPersistence(normalized.dbPath)
  const queue = new TaskQueue({
    concurrency: 1,
    defaultTimeout: normalized.budgetMs,
    defaultMaxRetries: normalized.maxRetries,
  })

  const createdAt = new Date().toISOString()
  const runPhase = inferResearchPhase(normalized.name)
  const phaseHistory = buildPhaseHistory(runPhase)
  const sessionId = `research-${Date.now()}-${nanoid(6)}`
  const taskId = `research-task-${nanoid(8)}`
  const task = buildResearchTask(taskId, normalized)

  persistence.saveSession(sessionId, {
    kind: RESEARCH_SESSION_KIND,
    name: normalized.name,
    command: normalized.command,
    cwd: normalized.cwd,
    metricName: normalized.metricName,
    budgetMs: normalized.budgetMs,
    currentPhase: runPhase,
    phaseHistory: ['brief', runPhase],
    createdAt,
  })
  persistence.saveTask(task, sessionId)

  let attempts = 0
  let commandResult: CommandExecutionResult | undefined
  let error: Error | undefined

  const startedAt = Date.now()
  persistence.updateTaskStatus(taskId, 'running')

  try {
    commandResult = await queue.add(async () => {
      attempts += 1
      const result = await executeCommand(normalized.command, [], {
        cwd: normalized.cwd,
        timeout: normalized.budgetMs,
        shell: true,
      })

      if (!result.success) {
        throw new ResearchCommandError(result)
      }

      return result
    }, {
      timeout: normalized.budgetMs,
      maxRetries: normalized.maxRetries,
      metadata: {
        sessionId,
        command: normalized.command,
      },
    })
  }
  catch (caughtError) {
    error = caughtError instanceof Error ? caughtError : new Error(String(caughtError))
    if (caughtError instanceof ResearchCommandError) {
      commandResult = caughtError.result
    }
  }

  const durationMs = Date.now() - startedAt
  const finalizedResult: CommandExecutionResult = commandResult || {
    success: false,
    stdout: '',
    stderr: '',
    exitCode: 1,
    error: error?.message || 'Research command failed',
  }

  const status = finalizedResult.success ? 'completed' : getFailureStatus(finalizedResult, error)
  const combinedOutput = [finalizedResult.stdout, finalizedResult.stderr].filter(Boolean).join('\n')
  const metricValue = extractMetricValue(combinedOutput, normalized.metricName)
  const verdict = determineVerdict(finalizedResult.success, normalized.metricName, metricValue)

  const output: TaskOutput = {
    data: {
      command: normalized.command,
      cwd: normalized.cwd,
      status,
      exitCode: finalizedResult.exitCode,
      stdout: finalizedResult.stdout,
      stderr: finalizedResult.stderr,
      metricName: normalized.metricName,
      metricValue,
      durationMs,
      attempts,
      phase: runPhase,
      verdict,
    },
    logs: combinedOutput ? combinedOutput.split(/\r?\n/) : [],
    metadata: {
      status,
      success: finalizedResult.success,
      verdict,
    },
  }

  persistence.updateTaskStatus(
    taskId,
    finalizedResult.success ? 'completed' : 'failed',
    output,
    finalizedResult.success ? undefined : error,
  )

  persistence.recordMetrics({
    taskId,
    sessionId,
    executionTime: durationMs,
    retryCount: Math.max(0, attempts - 1),
    success: finalizedResult.success,
    errorType: finalizedResult.success ? undefined : status,
  })

  persistence.logDecision({
    id: `decision-${nanoid(8)}`,
    sessionId,
    taskId,
    decision: 'record research run',
    reasoning: normalized.metricName
      ? `Executed the research command and tracked metric ${normalized.metricName}.`
      : 'Executed the research command without a configured metric parser.',
    context: JSON.stringify({
      command: normalized.command,
      cwd: normalized.cwd,
      budgetMs: normalized.budgetMs,
      metricName: normalized.metricName,
      phase: runPhase,
    }),
    outcome: finalizedResult.success
      ? metricValue === undefined
        ? 'completed without metric'
        : `${normalized.metricName}=${metricValue}`
      : finalizedResult.error || error?.message || 'failed',
  })

  persistence.saveSession(sessionId, {
    kind: RESEARCH_SESSION_KIND,
    name: normalized.name,
    command: normalized.command,
    cwd: normalized.cwd,
    metricName: normalized.metricName,
    budgetMs: normalized.budgetMs,
    currentPhase: 'report',
    phaseHistory,
    runPhase,
    verdict,
    status,
    exitCode: finalizedResult.exitCode,
    metricValue,
    durationMs,
    createdAt,
  })

  appendResultRow({
    timestamp: createdAt,
    sessionId,
    taskId,
    name: normalized.name,
    phase: runPhase,
    verdict,
    status,
    exitCode: finalizedResult.exitCode,
    metricName: normalized.metricName,
    metricValue,
    durationMs,
    cwd: normalized.cwd,
    command: normalized.command,
  }, normalized.dbPath)

  return {
    sessionId,
    taskId,
    name: normalized.name,
    command: normalized.command,
    cwd: normalized.cwd,
    metricName: normalized.metricName,
    metricValue,
    success: finalizedResult.success,
    status,
    exitCode: finalizedResult.exitCode,
    stdout: finalizedResult.stdout,
    stderr: finalizedResult.stderr,
    durationMs,
    phase: runPhase,
    verdict,
    phaseHistory,
    createdAt,
  }
}

export function listResearchSessions(limit: number = DEFAULT_SESSION_LIMIT, dbPath?: string): ResearchSessionSummary[] {
  const persistence = createPersistence(dbPath)
  return persistence
    .listSessions(Math.max(limit * 5, 50))
    .filter(session => session.metadata?.kind === RESEARCH_SESSION_KIND)
    .slice(0, limit)
    .map(session => ({
      id: session.id,
      createdAt: session.createdAt,
      name: session.metadata.name || session.id,
      command: session.metadata.command || '',
      cwd: session.metadata.cwd || process.cwd(),
      metricName: session.metadata.metricName,
      budgetMs: session.metadata.budgetMs || DEFAULT_BUDGET_MS,
      currentPhase: session.metadata.currentPhase || 'experiment',
      verdict: session.metadata.verdict,
    }))
}

export function getLatestResearchSession(dbPath?: string): ResearchSessionSummary | undefined {
  return listResearchSessions(1, dbPath)[0]
}

export function getResearchSessionStatus(sessionId: string, dbPath?: string): ResearchSessionStatus | null {
  const persistence = createPersistence(dbPath)
  const restored = persistence.restoreContext(sessionId)
  if (!restored) {
    return null
  }

  return {
    sessionId,
    metadata: restored.metadata,
    tasks: restored.tasks,
    metrics: persistence.getSessionMetrics(sessionId),
    decisions: persistence.getDecisionLog(sessionId),
    recovery: persistence.recoverExecutionState(sessionId),
  }
}

export function listResearchResults(limit: number = DEFAULT_SESSION_LIMIT, dbPath?: string): ResearchResultRow[] {
  return readAllResultRows(dbPath).reverse().slice(0, limit)
}

export function getBestResearchResult(dbPath?: string): ResearchResultRow | undefined {
  const rows = readAllResultRows(dbPath)
  if (rows.length === 0) {
    return undefined
  }

  return selectBestByMetric(rows)
}

export function getResearchReport(sessionId?: string, dbPath?: string): ResearchReport | null {
  const resolvedSessionId = sessionId || getLatestResearchSession(dbPath)?.id
  if (!resolvedSessionId) {
    return null
  }

  const status = getResearchSessionStatus(resolvedSessionId, dbPath)
  if (!status) {
    return null
  }

  const latestTask = status.tasks[status.tasks.length - 1]
  const outputData = (latestTask?.output as TaskOutput | undefined)?.data || {}
  const phaseHistory = (status.metadata.phaseHistory as ResearchPhase[] | undefined) || []
  const verdict = (status.metadata.verdict as ResearchVerdict | undefined)
    || determineVerdict(status.metrics.failedTasks === 0, status.metadata.metricName, outputData.metricValue as number | undefined)
  const currentPhase = (status.metadata.currentPhase as ResearchPhase | undefined) || 'report'

  const createdAt = String(status.metadata.createdAt || '')
  const outcome = String(
    status.decisions[status.decisions.length - 1]?.outcome
      || status.decisions[status.decisions.length - 1]?.decision
      || outputData.stderr
      || outputData.status
      || 'unknown',
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)

  const lines: string[] = []
  lines.push('# CCJK Research Report')
  lines.push('')
  lines.push(`**Session**: ${resolvedSessionId}`)
  lines.push(`**Name**: ${status.metadata.name || resolvedSessionId}`)
  lines.push(`**Created**: ${createdAt || 'unknown'}`)
  lines.push(`**Phase**: ${currentPhase}`)
  lines.push(`**Verdict**: ${verdict}`)
  lines.push(`**Command**: ${status.metadata.command || outputData.command || 'unknown'}`)
  lines.push(`**CWD**: ${status.metadata.cwd || outputData.cwd || process.cwd()}`)
  lines.push(`**Exit Code**: ${outputData.exitCode ?? 'unknown'}`)
  lines.push(`**Status**: ${outputData.status || status.metadata.status || 'unknown'}`)
  lines.push(`**Metric**: ${status.metadata.metricName ? `${status.metadata.metricName}=${outputData.metricValue ?? 'not found'}` : 'not configured'}`)
  lines.push(`**Duration**: ${outputData.durationMs ?? status.metadata.durationMs ?? 0}ms`)
  lines.push(`**Outcome**: ${outcome}`)

  if (phaseHistory.length > 0) {
    lines.push('')
    lines.push('## Phase History')
    lines.push('')
    lines.push(`- ${phaseHistory.join(' → ')}`)
  }

  return {
    sessionId: resolvedSessionId,
    name: status.metadata.name || resolvedSessionId,
    createdAt,
    currentPhase,
    verdict,
    command: status.metadata.command || outputData.command || 'unknown',
    cwd: status.metadata.cwd || outputData.cwd || process.cwd(),
    status: String(outputData.status || status.metadata.status || 'unknown'),
    exitCode: Number(outputData.exitCode ?? 0),
    metricName: status.metadata.metricName,
    metricValue: typeof outputData.metricValue === 'number' ? outputData.metricValue : undefined,
    durationMs: Number(outputData.durationMs ?? status.metadata.durationMs ?? 0),
    phaseHistory,
    outcome,
    content: lines.join('\n'),
  }
}
