/**
 * CCJK Status Dashboard — project diagnostics + health score
 *
 * Usage: ccjk status [--json] [--compact]
 */

import type { ProjectContext } from '../config/project-scanner'
import type { SmartDefaults } from '../config/smart-defaults'
import type { HealthReport, HealthResult, Recommendation } from '../health/types'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import ansis from 'ansis'
import { join } from 'pathe'
import { scanProject } from '../config/project-scanner'
import { analyzeProject } from '../discovery/project-analyzer'
import { getRecommendations } from '../discovery/skill-matcher'
import { runHealthCheck } from '../health/index'

// ============================================================================
// Types
// ============================================================================

export interface StatusOptions {
  json?: boolean
  compact?: boolean
}

interface InstalledSettings {
  mcpServers: Record<string, any>
  hooks: Record<string, any>
}

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
  pass: ansis.green('\u2713'),
  warn: ansis.yellow('\u26A0'),
  fail: ansis.red('\u2717'),
}

const INSTALLED = ansis.green('\u2713')
const MISSING = ansis.gray('\u2212')

function label(text: string): string {
  return ansis.gray(text)
}

function val(text: string): string {
  return ansis.white(text)
}

function heading(text: string): string {
  return ansis.cyan.bold(text)
}

function divider(): string {
  return ansis.gray('\u2500'.repeat(44))
}

function renderScoreBar(score: number): string {
  const filled = Math.round(score / 5)
  const empty = 20 - filled
  let bar = ''
  if (score >= 80)
    bar = ansis.green('\u2588'.repeat(filled))
  else if (score >= 50)
    bar = ansis.yellow('\u2588'.repeat(filled))
  else bar = ansis.red('\u2588'.repeat(filled))
  bar += ansis.gray('\u2591'.repeat(empty))
  return bar
}

// ============================================================================
// Settings loader
// ============================================================================

function loadInstalledSettings(): InstalledSettings {
  const settingsPath = join(homedir(), '.claude', 'settings.json')
  try {
    if (!existsSync(settingsPath)) return { mcpServers: {}, hooks: {} }
    const data = JSON.parse(readFileSync(settingsPath, 'utf-8'))
    return {
      mcpServers: data.mcpServers || {},
      hooks: data.hooks || {},
    }
  }
  catch {
    return { mcpServers: {}, hooks: {} }
  }
}

// ============================================================================
// Smart defaults loader (lazy, catches errors)
// ============================================================================

async function loadSmartDefaults(): Promise<SmartDefaults | null> {
  try {
    const { detectSmartDefaults } = await import('../config/smart-defaults')
    return await detectSmartDefaults()
  }
  catch {
    return null
  }
}

// ============================================================================
// Section renderers
// ============================================================================

function renderProjectSection(ctx: ProjectContext): string[] {
  const lines: string[] = []
  lines.push(heading('Project'))

  const fields: [string, string][] = [
    ['Language', ctx.language],
    ['Framework', ctx.framework],
    ['Test Runner', ctx.testRunner],
    ['Pkg Manager', ctx.packageManager],
    ['Linter', ctx.linter],
    ['Formatter', ctx.formatter],
    ['Database', ctx.database === 'none' ? 'none' : ctx.database],
  ]

  for (const [k, v] of fields) {
    const display = v === 'none' || v === 'unknown' ? ansis.gray(v) : val(v)
    lines.push(`  ${label(`${k}:`.padEnd(14))} ${display}`)
  }

  // Extra flags
  const flags: string[] = []
  if (ctx.isMonorepo) flags.push('monorepo')
  if (ctx.hasDocker) flags.push('docker')
  if (ctx.hasCI) flags.push('CI')
  if (ctx.hasGitHooks) flags.push('git-hooks')
  if (ctx.usesConventionalCommits) flags.push('conventional-commits')
  if (flags.length > 0) {
    lines.push(`  ${label('Flags:'.padEnd(14))} ${val(flags.join(', '))}`)
  }

  return lines
}

function renderRuntimeSection(ctx: ProjectContext): string[] {
  const lines: string[] = []
  lines.push(heading('Runtime'))

  const rt = ctx.runtime
  lines.push(`  ${label('Platform:'.padEnd(14))} ${val(process.platform)} ${ansis.gray(`(${process.arch})`)}`)

  const envFlags: string[] = []
  if (rt.isContainer) envFlags.push('container')
  if (rt.isHeadless) envFlags.push('headless')
  if (rt.isSSH) envFlags.push('SSH')
  if (rt.isCI) envFlags.push('CI')
  if (rt.isWSL) envFlags.push('WSL')

  if (envFlags.length > 0) {
    lines.push(`  ${label('Environment:'.padEnd(14))} ${val(envFlags.join(', '))}`)
  }
  else {
    lines.push(`  ${label('Environment:'.padEnd(14))} ${ansis.gray('standard')}`)
  }

  lines.push(`  ${label('Browser:'.padEnd(14))} ${rt.hasBrowser ? ansis.green('available') : ansis.gray('unavailable')}`)

  return lines
}

function renderMcpSection(recommended: string[], installed: Record<string, any>): string[] {
  const lines: string[] = []
  lines.push(heading('MCP Services'))

  const installedNames = Object.keys(installed)

  if (recommended.length === 0 && installedNames.length === 0) {
    lines.push(`  ${ansis.gray('No MCP services detected')}`)
    return lines
  }

  // Show recommended services with install status
  const shown = new Set<string>()
  for (const svc of recommended) {
    const isInstalled = installedNames.some(name =>
      name.toLowerCase().includes(svc.toLowerCase())
      || svc.toLowerCase().includes(name.toLowerCase()),
    )
    const icon = isInstalled ? INSTALLED : MISSING
    lines.push(`  ${icon} ${isInstalled ? val(svc) : ansis.gray(svc)}`)
    shown.add(svc.toLowerCase())
  }

  // Show extra installed services not in recommended list
  for (const name of installedNames) {
    if (!shown.has(name.toLowerCase()) && !recommended.some(r => r.toLowerCase() === name.toLowerCase())) {
      lines.push(`  ${INSTALLED} ${val(name)} ${ansis.gray('(extra)')}`)
    }
  }

  return lines
}

function renderHooksSection(recommended: string[], installed: Record<string, any>): string[] {
  const lines: string[] = []
  lines.push(heading('Hooks'))

  const installedEvents = Object.keys(installed)
  const hasAnyHooks = installedEvents.length > 0

  if (recommended.length === 0 && !hasAnyHooks) {
    lines.push(`  ${ansis.gray('No hooks detected')}`)
    return lines
  }

  for (const hookId of recommended) {
    // Check if any installed hook event contains hooks
    const isInstalled = hasAnyHooks
    const icon = isInstalled ? INSTALLED : MISSING
    lines.push(`  ${icon} ${isInstalled ? val(hookId) : ansis.gray(hookId)}`)
  }

  if (hasAnyHooks) {
    const totalHookCount = installedEvents.reduce((sum, event) => {
      const eventHooks = installed[event]
      return sum + (Array.isArray(eventHooks) ? eventHooks.length : 0)
    }, 0)
    if (totalHookCount > 0) {
      lines.push(`  ${ansis.gray(`${totalHookCount} hook(s) across ${installedEvents.length} event(s)`)}`)
    }
  }

  return lines
}

function renderClaudeCodeSection(defaults: SmartDefaults | null): string[] {
  const lines: string[] = []
  lines.push(heading('Claude Code'))

  const version = defaults?.claudeCodeVersion
  lines.push(`  ${label('Version:'.padEnd(14))} ${version ? val(version) : ansis.gray('not detected')}`)

  if (defaults?.nativeFeatures) {
    const nf = defaults.nativeFeatures
    const features: string[] = []
    if (nf.hooks) features.push('hooks')
    if (nf.memory) features.push('memory')
    if (nf.subagents) features.push('subagents')
    if (nf.toolSearch) features.push('tool-search')
    if (features.length > 0) {
      lines.push(`  ${label('Features:'.padEnd(14))} ${val(features.join(', '))}`)
    }
  }

  return lines
}

function renderHealthSection(report: HealthReport, compact: boolean): string[] {
  const lines: string[] = []
  lines.push(heading('Brain Dashboard'))

  const gradeColor = GRADE_COLORS[report.grade] || ((s: string) => s)
  const scoreBar = renderScoreBar(report.totalScore)
  lines.push(`  ${label('Score:'.padEnd(14))} ${scoreBar} ${gradeColor(report.grade)} ${ansis.gray(`(${report.totalScore}/100)`)}`)

  if (!compact) {
    lines.push('')
    for (const r of report.results) {
      const icon = STATUS_ICONS[r.status]
      const scoreText = ansis.gray(`${r.score}/${r.weight}`)
      lines.push(`  ${icon} ${r.name.padEnd(18)} ${scoreText.padEnd(10)} ${ansis.gray(r.message)}`)
    }
  }

  if (report.recommendations.length > 0) {
    lines.push('')
    lines.push(ansis.yellow.bold('  Recommendations:'))
    for (const rec of report.recommendations.slice(0, 3)) {
      const priority = rec.priority === 'high' ? ansis.red('!') : rec.priority === 'medium' ? ansis.yellow('•') : ansis.gray('·')
      lines.push(`  ${priority} ${rec.title}`)
      if (rec.command) {
        lines.push(`    ${ansis.gray('→')} ${ansis.cyan(rec.command)}`)
      }
    }
  }

  return lines
}

// ============================================================================
// Main command
// ============================================================================

export async function statusCommand(options: StatusOptions = {}): Promise<void> {
  try {
    // Gather all data
    const [ctx, defaults, installed, health] = await Promise.all([
      scanProject(),
      loadSmartDefaults(),
      Promise.resolve(loadInstalledSettings()),
      runHealthCheck(),
    ])

    // JSON output
    if (options.json) {
      console.log(JSON.stringify({
        project: ctx,
        smartDefaults: defaults,
        installed,
        health,
      }, null, 2))
      return
    }

    // Text output
    const sections: string[][] = []

    sections.push(renderProjectSection(ctx))
    sections.push(renderRuntimeSection(ctx))

    if (defaults) {
      sections.push(renderMcpSection(defaults.mcpServices, installed.mcpServers))
      sections.push(renderHooksSection(defaults.recommendedHooks, installed.hooks))
      sections.push(renderClaudeCodeSection(defaults))
    }
    else {
      sections.push(renderMcpSection([], installed.mcpServers))
      sections.push(renderHooksSection([], installed.hooks))
      sections.push(renderClaudeCodeSection(null))
    }

    sections.push(renderHealthSection(health, options.compact || false))

    // Print all sections
    console.log()
    for (let i = 0; i < sections.length; i++) {
      console.log(sections[i].join('\n'))
      if (i < sections.length - 1) {
        console.log()
        console.log(divider())
        console.log()
      }
    }
    console.log()
  }
  catch (error) {
    console.error(ansis.red('Error running status command:'), error)
    process.exit(1)
  }
}