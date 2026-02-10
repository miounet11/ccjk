/**
 * CCJK Status Dashboard - "Brain Dashboard"
 *
 * Usage: ccjk status
 */
import process from 'node:process'
import ansis from 'ansis'
import { analyzeProject } from '../discovery/project-analyzer'
import { getRecommendations } from '../discovery/skill-matcher'
import type { ProjectProfile } from '../discovery/types'
import { runHealthCheck } from '../health/index'
import type { HealthReport, HealthResult, Recommendation } from '../health/types'

// ============================================================================
// Rendering helpers
// ============================================================================

const GRADE_COLORS: Record<string, (s: string) => string> = {
  S: (s: string) => ansis.magenta.bold(s),
  A: (s: string) => ansis.green.bold(s),
  B: (s: string) => ansis.cyan.bold(s),
  C: (s: string) => ansis.yellow.bold(s),
  D: (s: string) => ansis.red(s),
  F: (s: string) => ansis.red.bold(s),
}

const STATUS_ICONS: Record<string, string> = {
  pass: ansis.green('✓'),
  warn: ansis.yellow('⚠'),
  fail: ansis.red('✗'),
}

function stripAnsi(s: string): string {
  return s.replace(/\x1B\[[0-9;]*m/g, '')
}

function renderBox(lines: string[], width: number = 55): string {
  const top = ansis.gray('╭' + '─'.repeat(width - 2) + '╮')
  const bot = ansis.gray('╰' + '─'.repeat(width - 2) + '╯')
  const pad = (s: string) => {
    const stripped = stripAnsi(s)
    const remaining = width - 4 - stripped.length
    return ansis.gray('│') + '  ' + s + ' '.repeat(Math.max(0, remaining)) + '  ' + ansis.gray('│')
  }
  return [top, ...lines.map(pad), bot].join('\n')
}

function renderScoreBar(score: number): string {
  const filled = Math.round(score / 5)
  const empty = 20 - filled
  let bar = ''
  if (score >= 80) bar = ansis.green('█'.repeat(filled))
  else if (score >= 50) bar = ansis.yellow('█'.repeat(filled))
  else bar = ansis.red('█'.repeat(filled))
  bar += ansis.gray('░'.repeat(empty))
  return bar
}

// ============================================================================
// Section renderers
// ============================================================================

function renderHeader(report: HealthReport, profile: ProjectProfile): string[] {
  const gradeColor = GRADE_COLORS[report.grade] || ((s: string) => s)
  const lines: string[] = []

  lines.push('')
  lines.push(ansis.cyan.bold('🧠 CCJK Brain Dashboard'))
  lines.push('')
  lines.push(`${renderScoreBar(report.totalScore)}  ${gradeColor(report.grade)} ${ansis.bold(`${report.totalScore}/100`)}`)
  lines.push('')

  if (profile.projectName) {
    const stackParts: string[] = []
    if (profile.language !== 'unknown') stackParts.push(profile.language)
    stackParts.push(...profile.frameworks.slice(0, 3))
    const stack = stackParts.length > 0 ? ansis.gray(` (${stackParts.join(', ')})`) : ''
    lines.push(ansis.gray('Project: ') + ansis.white(profile.projectName) + stack)
  }

  return lines
}

function renderSetupStatus(results: HealthResult[]): string[] {
  const lines: string[] = []
  lines.push('')
  lines.push(ansis.yellow.bold('Setup Status'))
  lines.push('')

  for (const r of results) {
    const icon = STATUS_ICONS[r.status] || '?'
    const name = r.name.padEnd(16)
    const msg = r.status === 'pass'
      ? ansis.green(r.message)
      : r.status === 'warn'
        ? ansis.yellow(r.message)
        : ansis.red(r.message)
    lines.push(`${icon} ${ansis.bold(name)} ${msg}`)
  }

  return lines
}

function renderRecommendations(recs: Recommendation[], maxShow: number = 4): string[] {
  if (recs.length === 0) return []

  const lines: string[] = []
  lines.push('')
  lines.push(ansis.yellow.bold('Recommendations'))
  lines.push('')

  for (const rec of recs.slice(0, maxShow)) {
    const icon = rec.priority === 'high' ? ansis.red('→') : ansis.yellow('→')
    lines.push(`${icon} ${rec.description}`)
    if (rec.command) {
      lines.push(`  ${ansis.cyan(rec.command)}`)
    }
  }

  if (recs.length > maxShow) {
    lines.push(ansis.gray(`  ... and ${recs.length - maxShow} more`))
  }

  return lines
}

function renderProjectRecs(profile: ProjectProfile): string[] {
  const { skills, mcpServices } = getRecommendations(profile)
  if (skills.length === 0 && mcpServices.length === 0) return []

  const lines: string[] = []
  lines.push('')
  lines.push(ansis.yellow.bold('For Your Project'))
  lines.push('')

  if (skills.length > 0) {
    lines.push(`${ansis.cyan(String(skills.length))} skills match your stack:`)
    for (const s of skills.slice(0, 3)) {
      lines.push(`  ${ansis.green('+')} ${s.name} ${ansis.gray(`- ${s.reason}`)}`)
    }
    lines.push(`  ${ansis.cyan('ccjk ccjk:skills --dry-run')}`)
  }

  if (mcpServices.length > 0) {
    lines.push(`${ansis.cyan(String(mcpServices.length))} MCP services recommended`)
    lines.push(`  ${ansis.cyan('ccjk ccjk:mcp --dry-run')}`)
  }

  return lines
}

function renderQuickActions(): string[] {
  return [
    '',
    ansis.yellow.bold('Quick Actions'),
    '',
    `${ansis.cyan('ccjk boost')}        Auto-apply recommendations`,
    `${ansis.cyan('ccjk ccjk:skills')}  Install project-matched skills`,
    `${ansis.cyan('ccjk ccjk:mcp')}     Install recommended MCP services`,
    `${ansis.cyan('ccjk doctor')}       Full environment diagnostics`,
  ]
}

// ============================================================================
// Main command
// ============================================================================

export interface StatusOptions {
  json?: boolean
  compact?: boolean
}

export async function status(options: StatusOptions = {}): Promise<void> {
  const [report, profile] = await Promise.all([
    runHealthCheck(),
    Promise.resolve(analyzeProject()),
  ])

  if (options.json) {
    console.log(JSON.stringify({
      score: report.totalScore,
      grade: report.grade,
      results: report.results.map(r => ({ name: r.name, status: r.status, score: r.score, message: r.message })),
      recommendations: report.recommendations,
      project: { name: profile.projectName, language: profile.language, frameworks: profile.frameworks, tags: profile.tags },
    }, null, 2))
    return
  }

  const allLines: string[] = [
    ...renderHeader(report, profile),
    ...renderSetupStatus(report.results),
    ...renderRecommendations(report.recommendations),
    ...renderProjectRecs(profile),
    ...renderQuickActions(),
    '',
  ]

  console.log(renderBox(allLines))
}
