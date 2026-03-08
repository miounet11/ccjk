import type { CompressionMetric } from '../context/persistence'
import type { DailyStats, RequestRecord } from '../types/stats'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import ansis from 'ansis'
import { dirname, join } from 'pathe'
import { getContextPersistence } from '../context/persistence'
import { getStatsStorage } from '../stats-storage'

export interface ImpactOptions {
  json?: boolean
  days?: number
  output?: string
}

export interface ImpactDailyPoint {
  date: string
  requests: number
  tokens: number
  cost: number
  savedTokens: number
  savedCost: number
}

interface ComparisonWindow {
  startDate: string
  endDate: string
  avgDailyTokens: number
  avgDailyCost: number
  avgDailySavedTokens: number
}

export interface ImpactReport {
  generatedAt: string
  rangeDays: number
  trackingStartDate?: string
  baselineMethod: string
  today: {
    date: string
    requests: number
    tokens: number
    cost: number
    savedTokens: number
    savedCost: number
    deltaTokensVsYesterday: number
    deltaSavedTokensVsYesterday: number
  }
  totals: {
    activeDays: number
    totalRequests: number
    totalTokens: number
    totalCost: number
    totalSavedTokens: number
    totalSavedCost: number
    averageDailyTokens: number
    averageDailySavedTokens: number
    averageCompressionRatio: number
    totalCompressions: number
    averageCompressionTimeMs: number
  }
  comparison?: {
    baseline: ComparisonWindow
    recent: ComparisonWindow
    tokenDeltaPercent: number
    costDeltaPercent: number
    savedTokensDeltaPercent: number
  }
  topProviders: Array<{
    provider: string
    requests: number
    tokens: number
    cost: number
  }>
  topModels: Array<{
    model: string
    requests: number
    tokens: number
  }>
  topProjects: Array<{
    name: string
    contexts: number
    tokens: number
    updatedAt?: string
  }>
  topAlgorithms: Array<{
    algorithm: string
    count: number
    savedTokens: number
  }>
  daily: ImpactDailyPoint[]
  notes: string[]
}

export async function impactCommand(options: ImpactOptions = {}): Promise<void> {
  const report = collectImpactReport(options.days)

  if (options.json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  renderImpactSummary(report)

  const outputPath = options.output || getDefaultImpactReportPath()
  writeImpactHtmlReport(report, outputPath)
  console.log(ansis.dim(`HTML report: ${outputPath}`))
}

export function collectImpactReport(daysInput?: number): ImpactReport {
  const days = normalizeDays(daysInput)
  const storage = getStatsStorage()
  const { startDate, endDate } = getDateRange(days)
  const records = storage.getRecordsByDateRange(startDate, endDate)
  const allUsageDates = storage.getAvailableDates()

  const allUsageStartDate = allUsageDates[0]
  const usageDailyMap = buildUsageDailyMap(records)
  const windowDates = enumerateDates(startDate, endDate)

  let compressionMetrics: CompressionMetric[] = []
  let topProjects: ImpactReport['topProjects'] = []
  let compressionNotes: string[] = []

  try {
    const persistence = getContextPersistence()
    compressionMetrics = persistence.getCompressionMetrics(undefined, {
      startTime: toStartTimestamp(startDate),
      endTime: toEndTimestamp(endDate),
      sortOrder: 'asc',
    })
    topProjects = persistence
      .listProjects()
      .sort((a, b) => (b.total_tokens || 0) - (a.total_tokens || 0))
      .slice(0, 5)
      .map(project => ({
        name: project.name || project.path || project.hash,
        contexts: project.context_count || 0,
        tokens: project.total_tokens || 0,
        updatedAt: project.updated_at ? new Date(project.updated_at).toISOString() : undefined,
      }))
  }
  catch {
    compressionNotes.push('Context compression history is unavailable, so savings may be under-reported.')
  }

  const compressionDailyMap = buildCompressionDailyMap(compressionMetrics)
  const daily = windowDates.map((date) => {
    const usage = usageDailyMap.get(date)
    const compression = compressionDailyMap.get(date)
    return {
      date,
      requests: usage?.totalRequests || 0,
      tokens: usage?.totalTokens || 0,
      cost: usage?.totalCost || 0,
      savedTokens: compression?.savedTokens || 0,
      savedCost: compression?.savedCost || 0,
    }
  })

  const activeDays = daily.filter(day => day.requests > 0 || day.savedTokens > 0).length
  const totalRequests = daily.reduce((sum, day) => sum + day.requests, 0)
  const totalTokens = daily.reduce((sum, day) => sum + day.tokens, 0)
  const totalCost = daily.reduce((sum, day) => sum + day.cost, 0)
  const totalSavedTokens = daily.reduce((sum, day) => sum + day.savedTokens, 0)
  const totalSavedCost = daily.reduce((sum, day) => sum + day.savedCost, 0)
  const totalOriginalTokens = compressionMetrics.reduce((sum, metric) => sum + metric.originalTokens, 0)
  const averageCompressionRatio = totalOriginalTokens > 0
    ? totalSavedTokens / totalOriginalTokens
    : 0
  const averageCompressionTimeMs = compressionMetrics.length > 0
    ? compressionMetrics.reduce((sum, metric) => sum + metric.timeTakenMs, 0) / compressionMetrics.length
    : 0

  const today = daily[daily.length - 1] || emptyDailyPoint(endDate)
  const yesterday = daily[daily.length - 2] || emptyDailyPoint(endDate)
  const comparison = buildComparison(daily)
  const modelSummary = summarizeModels(records)
  const providerSummary = summarizeProviders(records)
  const algorithmSummary = summarizeAlgorithms(compressionMetrics)
  const notes = buildNotes({
    allUsageStartDate,
    daily,
    comparison,
    hasCompressionData: compressionMetrics.length > 0,
    compressionNotes,
  })

  return {
    generatedAt: new Date().toISOString(),
    rangeDays: days,
    trackingStartDate: allUsageStartDate || daily.find(day => day.savedTokens > 0)?.date,
    baselineMethod: comparison
      ? 'Comparison uses the earliest tracked window versus the most recent window.'
      : 'More history is needed before a baseline comparison is meaningful.',
    today: {
      ...today,
      deltaTokensVsYesterday: today.tokens - yesterday.tokens,
      deltaSavedTokensVsYesterday: today.savedTokens - yesterday.savedTokens,
    },
    totals: {
      activeDays,
      totalRequests,
      totalTokens,
      totalCost,
      totalSavedTokens,
      totalSavedCost,
      averageDailyTokens: activeDays > 0 ? totalTokens / activeDays : 0,
      averageDailySavedTokens: activeDays > 0 ? totalSavedTokens / activeDays : 0,
      averageCompressionRatio,
      totalCompressions: compressionMetrics.length,
      averageCompressionTimeMs,
    },
    comparison,
    topProviders: providerSummary,
    topModels: modelSummary,
    topProjects,
    topAlgorithms: algorithmSummary,
    daily,
    notes,
  }
}

function normalizeDays(daysInput?: number): number {
  if (!daysInput || Number.isNaN(daysInput)) {
    return 14
  }
  return Math.max(7, Math.min(90, Math.floor(daysInput)))
}

function getDateRange(days: number): { startDate: string, endDate: string } {
  const now = new Date()
  const end = formatDate(now)
  const startTime = toStartTimestamp(end) - ((days - 1) * 24 * 60 * 60 * 1000)
  const start = formatDate(new Date(startTime))
  return { startDate: start, endDate: end }
}

function buildUsageDailyMap(records: RequestRecord[]): Map<string, DailyStats> {
  const map = new Map<string, DailyStats>()

  for (const record of records) {
    const date = formatDate(new Date(record.timestamp))
    const existing = map.get(date) || {
      date,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatency: 0,
      providerStats: {},
    }

    existing.totalRequests++
    if (record.success) {
      existing.successfulRequests++
    }
    else {
      existing.failedRequests++
    }
    existing.totalInputTokens += record.inputTokens || 0
    existing.totalOutputTokens += record.outputTokens || 0
    existing.totalTokens += record.totalTokens || 0
    existing.totalCost += record.cost || 0

    map.set(date, existing)
  }

  return map
}

function buildCompressionDailyMap(metrics: CompressionMetric[]): Map<string, { savedTokens: number, savedCost: number }> {
  const map = new Map<string, { savedTokens: number, savedCost: number }>()

  for (const metric of metrics) {
    const date = formatDate(new Date(metric.timestamp))
    const existing = map.get(date) || { savedTokens: 0, savedCost: 0 }
    const savedTokens = metric.originalTokens - metric.compressedTokens
    existing.savedTokens += savedTokens
    existing.savedCost += estimateCompressionCost(savedTokens)
    map.set(date, existing)
  }

  return map
}

function summarizeProviders(records: RequestRecord[]): ImpactReport['topProviders'] {
  const map = new Map<string, { requests: number, tokens: number, cost: number }>()

  for (const record of records) {
    const key = record.provider || 'unknown'
    const current = map.get(key) || { requests: 0, tokens: 0, cost: 0 }
    current.requests++
    current.tokens += record.totalTokens || 0
    current.cost += record.cost || 0
    map.set(key, current)
  }

  return Array.from(map.entries())
    .map(([provider, value]) => ({ provider, ...value }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5)
}

function summarizeModels(records: RequestRecord[]): ImpactReport['topModels'] {
  const map = new Map<string, { requests: number, tokens: number }>()

  for (const record of records) {
    if (!record.model) {
      continue
    }
    const current = map.get(record.model) || { requests: 0, tokens: 0 }
    current.requests++
    current.tokens += record.totalTokens || 0
    map.set(record.model, current)
  }

  return Array.from(map.entries())
    .map(([model, value]) => ({ model, ...value }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5)
}

function summarizeAlgorithms(metrics: CompressionMetric[]): ImpactReport['topAlgorithms'] {
  const map = new Map<string, { count: number, savedTokens: number }>()

  for (const metric of metrics) {
    const current = map.get(metric.algorithm) || { count: 0, savedTokens: 0 }
    current.count++
    current.savedTokens += metric.originalTokens - metric.compressedTokens
    map.set(metric.algorithm, current)
  }

  return Array.from(map.entries())
    .map(([algorithm, value]) => ({ algorithm, ...value }))
    .sort((a, b) => b.savedTokens - a.savedTokens)
    .slice(0, 5)
}

export function buildComparison(daily: ImpactDailyPoint[]): ImpactReport['comparison'] | undefined {
  const activeDays = daily.filter(day => day.requests > 0 || day.savedTokens > 0)
  if (activeDays.length < 4) {
    return undefined
  }

  const windowSize = Math.min(7, Math.floor(activeDays.length / 2))
  const baselineDays = activeDays.slice(0, windowSize)
  const recentDays = activeDays.slice(-windowSize)

  const baseline = summarizeWindow(baselineDays)
  const recent = summarizeWindow(recentDays)

  return {
    baseline,
    recent,
    tokenDeltaPercent: calculatePercentDelta(baseline.avgDailyTokens, recent.avgDailyTokens),
    costDeltaPercent: calculatePercentDelta(baseline.avgDailyCost, recent.avgDailyCost),
    savedTokensDeltaPercent: calculatePercentDelta(baseline.avgDailySavedTokens, recent.avgDailySavedTokens),
  }
}

function summarizeWindow(days: ImpactDailyPoint[]): ComparisonWindow {
  const dayCount = Math.max(days.length, 1)
  return {
    startDate: days[0].date,
    endDate: days[days.length - 1].date,
    avgDailyTokens: days.reduce((sum, day) => sum + day.tokens, 0) / dayCount,
    avgDailyCost: days.reduce((sum, day) => sum + day.cost, 0) / dayCount,
    avgDailySavedTokens: days.reduce((sum, day) => sum + day.savedTokens, 0) / dayCount,
  }
}

function calculatePercentDelta(baseline: number, current: number): number {
  if (baseline === 0) {
    return current === 0 ? 0 : 100
  }
  return ((current - baseline) / baseline) * 100
}

function buildNotes(input: {
  allUsageStartDate?: string
  daily: ImpactDailyPoint[]
  comparison?: ImpactReport['comparison']
  hasCompressionData: boolean
  compressionNotes: string[]
}): string[] {
  const notes = [...input.compressionNotes]
  const usageDays = input.daily.filter(day => day.requests > 0).length

  if (!input.allUsageStartDate) {
    notes.push('No API usage history was found under ~/.ccjk/stats yet. The report is currently driven by compression history only.')
  }

  if (!input.hasCompressionData) {
    notes.push('Compression savings data is not available yet, so the page can only show raw usage where records exist.')
  }

  if (!input.comparison) {
    notes.push('At least four active days are needed before before/after comparison cards become meaningful.')
  }

  if (usageDays > 0 && input.allUsageStartDate) {
    notes.push(`Tracking currently starts at ${input.allUsageStartDate}. Until an explicit install marker exists, the baseline uses earliest tracked data.`)
  }

  return notes
}

function renderImpactSummary(report: ImpactReport): void {
  console.log('')
  console.log(ansis.cyan.bold('CCJK Usage Impact'))
  console.log(ansis.gray('='.repeat(72)))
  console.log(ansis.dim(`${report.rangeDays}-day view ending ${report.today.date}`))
  console.log('')

  console.log(ansis.yellow('Today'))
  console.log(`  Tokens:      ${ansis.white.bold(formatInteger(report.today.tokens))} ${formatSigned(report.today.deltaTokensVsYesterday, 'vs yesterday')}`)
  console.log(`  Cost:        ${ansis.white.bold(formatCurrency(report.today.cost))}`)
  console.log(`  Saved:       ${ansis.green.bold(formatInteger(report.today.savedTokens))} ${formatSigned(report.today.deltaSavedTokensVsYesterday, 'vs yesterday')}`)
  console.log(`  Requests:    ${ansis.white.bold(formatInteger(report.today.requests))}`)
  console.log('')

  console.log(ansis.yellow('Range Summary'))
  console.log(`  Total tokens:        ${ansis.white.bold(formatInteger(report.totals.totalTokens))}`)
  console.log(`  Total cost:          ${ansis.white.bold(formatCurrency(report.totals.totalCost))}`)
  console.log(`  Saved tokens:        ${ansis.green.bold(formatInteger(report.totals.totalSavedTokens))}`)
  console.log(`  Saved cost:          ${ansis.green.bold(formatCurrency(report.totals.totalSavedCost))}`)
  console.log(`  Compression runs:    ${ansis.white.bold(formatInteger(report.totals.totalCompressions))}`)
  console.log(`  Avg compression:     ${ansis.white.bold(formatPercent(report.totals.averageCompressionRatio))}`)
  console.log(`  Active days:         ${ansis.white.bold(formatInteger(report.totals.activeDays))}`)
  console.log('')

  if (report.comparison) {
    console.log(ansis.yellow('Before / After'))
    console.log(`  Baseline: ${report.comparison.baseline.startDate} -> ${report.comparison.baseline.endDate}`)
    console.log(`  Recent:   ${report.comparison.recent.startDate} -> ${report.comparison.recent.endDate}`)
    console.log(`  Avg daily tokens: ${ansis.white.bold(formatInteger(report.comparison.recent.avgDailyTokens))} (${formatSigned(report.comparison.tokenDeltaPercent, 'vs baseline', true)})`)
    console.log(`  Avg daily cost:   ${ansis.white.bold(formatCurrency(report.comparison.recent.avgDailyCost))} (${formatSigned(report.comparison.costDeltaPercent, 'vs baseline', true)})`)
    console.log(`  Avg daily saved:  ${ansis.green.bold(formatInteger(report.comparison.recent.avgDailySavedTokens))} (${formatSigned(report.comparison.savedTokensDeltaPercent, 'vs baseline', true)})`)
    console.log('')
  }

  if (report.topProviders.length > 0) {
    console.log(ansis.yellow('Provider Summary'))
    for (const provider of report.topProviders) {
      console.log(`  ${provider.provider.padEnd(18)} ${formatInteger(provider.tokens).padStart(10)} tokens  ${formatCurrency(provider.cost).padStart(10)}`)
    }
    console.log('')
  }

  if (report.topModels.length > 0) {
    console.log(ansis.yellow('Model Summary'))
    for (const model of report.topModels) {
      console.log(`  ${truncate(model.model, 30).padEnd(32)} ${formatInteger(model.tokens).padStart(10)} tokens`)
    }
    console.log('')
  }

  if (report.topProjects.length > 0) {
    console.log(ansis.yellow('Code Summary'))
    for (const project of report.topProjects) {
      console.log(`  ${truncate(project.name, 30).padEnd(32)} ${formatInteger(project.tokens).padStart(10)} tokens  ${formatInteger(project.contexts).padStart(6)} ctx`)
    }
    console.log('')
  }

  if (report.topAlgorithms.length > 0) {
    console.log(ansis.yellow('Optimization Summary'))
    for (const algorithm of report.topAlgorithms) {
      console.log(`  ${algorithm.algorithm.padEnd(18)} ${formatInteger(algorithm.savedTokens).padStart(10)} saved  ${formatInteger(algorithm.count).padStart(6)} runs`)
    }
    console.log('')
  }

  if (report.notes.length > 0) {
    console.log(ansis.yellow('Notes'))
    for (const note of report.notes) {
      console.log(`  - ${note}`)
    }
    console.log('')
  }
}

function writeImpactHtmlReport(report: ImpactReport, outputPath: string): void {
  const outputDir = dirname(outputPath)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }
  writeFileSync(outputPath, generateImpactHtml(report), 'utf-8')
}

export function generateImpactHtml(report: ImpactReport): string {
  const maxUsage = Math.max(...report.daily.map(day => day.tokens), 1)
  const maxSaved = Math.max(...report.daily.map(day => day.savedTokens), 1)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CCJK Usage Impact</title>
    <style>
      :root {
        --bg: #f6f1e8;
        --panel: rgba(255, 252, 246, 0.86);
        --ink: #1f2933;
        --muted: #5b6770;
        --accent: #0f766e;
        --accent-soft: #99f6e4;
        --usage: #d97706;
        --saved: #0f766e;
        --border: rgba(31, 41, 51, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: var(--ink);
        font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(217, 119, 6, 0.18), transparent 30%),
          radial-gradient(circle at top right, rgba(15, 118, 110, 0.2), transparent 28%),
          linear-gradient(180deg, #fffaf1 0%, var(--bg) 100%);
      }
      .shell {
        max-width: 1180px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }
      .hero, .panel {
        background: var(--panel);
        backdrop-filter: blur(10px);
        border: 1px solid var(--border);
        border-radius: 24px;
        box-shadow: 0 20px 60px rgba(31, 41, 51, 0.08);
      }
      .hero {
        padding: 28px;
        margin-bottom: 20px;
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
      }
      h1 {
        margin: 10px 0 8px;
        font-size: clamp(34px, 5vw, 56px);
        line-height: 0.98;
      }
      .subtle {
        color: var(--muted);
        max-width: 760px;
        font-size: 15px;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 14px;
        margin-top: 24px;
      }
      .stat {
        padding: 18px;
        border-radius: 18px;
        background: rgba(255,255,255,0.68);
        border: 1px solid rgba(31, 41, 51, 0.08);
      }
      .stat .label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .stat .value {
        margin-top: 8px;
        font-size: 28px;
        font-weight: 800;
      }
      .grid {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 20px;
        margin-top: 20px;
      }
      .panel {
        padding: 22px;
      }
      .panel h2 {
        margin: 0 0 14px;
        font-size: 20px;
      }
      .chart {
        display: grid;
        gap: 10px;
      }
      .bar-row {
        display: grid;
        grid-template-columns: 86px 1fr 64px 64px;
        gap: 10px;
        align-items: center;
      }
      .bar-track {
        position: relative;
        height: 10px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(31, 41, 51, 0.08);
      }
      .bar-usage, .bar-saved {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        border-radius: 999px;
      }
      .bar-usage { background: linear-gradient(90deg, #fb923c, var(--usage)); }
      .bar-saved { background: linear-gradient(90deg, #5eead4, var(--saved)); opacity: 0.9; }
      .mini {
        color: var(--muted);
        font-size: 12px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        padding: 10px 0;
        text-align: left;
        border-bottom: 1px solid rgba(31, 41, 51, 0.08);
        font-size: 14px;
      }
      th {
        color: var(--muted);
        font-weight: 600;
      }
      .note-list {
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
      }
      @media (max-width: 900px) {
        .grid { grid-template-columns: 1fr; }
        .bar-row { grid-template-columns: 72px 1fr 56px 56px; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="hero">
        <div class="eyebrow">Daily proof of value</div>
        <h1>CCJK Usage Impact</h1>
        <p class="subtle">A simple answer to the product question: is CCJK reducing usage and increasing token efficiency over time?</p>
        <div class="stats">
          ${statCard('Today tokens', formatInteger(report.today.tokens))}
          ${statCard('Today saved', formatInteger(report.today.savedTokens))}
          ${statCard('Today cost', formatCurrency(report.today.cost))}
          ${statCard(`${report.rangeDays}d saved`, formatInteger(report.totals.totalSavedTokens))}
          ${statCard('Compression runs', formatInteger(report.totals.totalCompressions))}
          ${statCard('Avg compression', formatPercent(report.totals.averageCompressionRatio))}
        </div>
      </section>

      <div class="grid">
        <section class="panel">
          <h2>Daily effect</h2>
          <div class="chart">
            ${report.daily.map(day => `
              <div class="bar-row">
                <div class="mini">${day.date.slice(5)}</div>
                <div class="bar-track">
                  <div class="bar-usage" style="width:${(day.tokens / maxUsage) * 100}%"></div>
                  <div class="bar-saved" style="width:${(day.savedTokens / maxSaved) * 100}%"></div>
                </div>
                <div class="mini">${compactNumber(day.tokens)}</div>
                <div class="mini">${compactNumber(day.savedTokens)}</div>
              </div>
            `).join('')}
          </div>
          <p class="mini">Orange shows used tokens. Teal shows tokens saved through compression and context optimization.</p>
        </section>

        <section class="panel">
          <h2>Before / after</h2>
          ${report.comparison
            ? `
              <table>
                <tr><th>Window</th><th>Avg tokens/day</th><th>Avg saved/day</th></tr>
                <tr><td>${report.comparison.baseline.startDate} → ${report.comparison.baseline.endDate}</td><td>${formatInteger(report.comparison.baseline.avgDailyTokens)}</td><td>${formatInteger(report.comparison.baseline.avgDailySavedTokens)}</td></tr>
                <tr><td>${report.comparison.recent.startDate} → ${report.comparison.recent.endDate}</td><td>${formatInteger(report.comparison.recent.avgDailyTokens)}</td><td>${formatInteger(report.comparison.recent.avgDailySavedTokens)}</td></tr>
              </table>
              <p class="mini">Avg daily tokens delta: ${escapeHtml(formatSignedPlain(report.comparison.tokenDeltaPercent, 'vs baseline', true))}</p>
              <p class="mini">Avg daily saved tokens delta: ${escapeHtml(formatSignedPlain(report.comparison.savedTokensDeltaPercent, 'vs baseline', true))}</p>
            `
            : `<p class="mini">Need more active days before baseline comparison becomes trustworthy.</p>`}
        </section>
      </div>

      <div class="grid">
        <section class="panel">
          <h2>Provider and model summary</h2>
          <table>
            <tr><th>Provider</th><th>Requests</th><th>Tokens</th><th>Cost</th></tr>
            ${report.topProviders.map(provider => `<tr><td>${escapeHtml(provider.provider)}</td><td>${formatInteger(provider.requests)}</td><td>${formatInteger(provider.tokens)}</td><td>${formatCurrency(provider.cost)}</td></tr>`).join('') || '<tr><td colspan="4">No provider history yet</td></tr>'}
          </table>
          <br />
          <table>
            <tr><th>Model</th><th>Requests</th><th>Tokens</th></tr>
            ${report.topModels.map(model => `<tr><td>${escapeHtml(model.model)}</td><td>${formatInteger(model.requests)}</td><td>${formatInteger(model.tokens)}</td></tr>`).join('') || '<tr><td colspan="3">No model history yet</td></tr>'}
          </table>
        </section>

        <section class="panel">
          <h2>Code and optimization summary</h2>
          <table>
            <tr><th>Project</th><th>Contexts</th><th>Tokens</th></tr>
            ${report.topProjects.map(project => `<tr><td>${escapeHtml(project.name)}</td><td>${formatInteger(project.contexts)}</td><td>${formatInteger(project.tokens)}</td></tr>`).join('') || '<tr><td colspan="3">No project history yet</td></tr>'}
          </table>
          <br />
          <table>
            <tr><th>Algorithm</th><th>Runs</th><th>Saved</th></tr>
            ${report.topAlgorithms.map(algorithm => `<tr><td>${escapeHtml(algorithm.algorithm)}</td><td>${formatInteger(algorithm.count)}</td><td>${formatInteger(algorithm.savedTokens)}</td></tr>`).join('') || '<tr><td colspan="3">No optimization history yet</td></tr>'}
          </table>
        </section>
      </div>

      <section class="panel" style="margin-top:20px">
        <h2>Notes</h2>
        <ul class="note-list">
          ${report.notes.map(note => `<li>${escapeHtml(note)}</li>`).join('')}
        </ul>
        <p class="mini">Generated at ${escapeHtml(report.generatedAt)} from local CCJK tracking data.</p>
      </section>
    </div>
  </body>
</html>`
}

function statCard(label: string, value: string): string {
  return `<div class="stat"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`
}

function getDefaultImpactReportPath(): string {
  return join(homedir(), '.ccjk', 'reports', 'impact-latest.html')
}

function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  let cursor = toStartTimestamp(startDate)
  const end = toStartTimestamp(endDate)

  while (cursor <= end) {
    dates.push(formatDate(new Date(cursor)))
    cursor += 24 * 60 * 60 * 1000
  }

  return dates
}

function toStartTimestamp(date: string): number {
  return new Date(`${date}T00:00:00`).getTime()
}

function toEndTimestamp(date: string): number {
  return new Date(`${date}T23:59:59.999`).getTime()
}

function emptyDailyPoint(date: string): ImpactDailyPoint {
  return {
    date,
    requests: 0,
    tokens: 0,
    cost: 0,
    savedTokens: 0,
    savedCost: 0,
  }
}

function estimateCompressionCost(tokens: number): number {
  return (tokens / 1000) * 0.015
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString()
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatSigned(value: number, label: string, isPercent = false): string {
  const abs = isPercent ? `${Math.abs(value).toFixed(1)}%` : formatInteger(Math.abs(value))
  const sign = value > 0 ? '+' : value < 0 ? '-' : '0'
  const tone = value > 0 ? ansis.yellow : value < 0 ? ansis.green : ansis.gray
  const rendered = value === 0 ? `${abs} ${label}` : `${sign}${abs} ${label}`
  return tone(rendered)
}

function formatSignedPlain(value: number, label: string, isPercent = false): string {
  const abs = isPercent ? `${Math.abs(value).toFixed(1)}%` : formatInteger(Math.abs(value))
  if (value === 0) {
    return `${abs} ${label}`
  }
  const sign = value > 0 ? '+' : '-'
  return `${sign}${abs} ${label}`
}

function compactNumber(value: number): string {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, maxLength - 1)}…`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
