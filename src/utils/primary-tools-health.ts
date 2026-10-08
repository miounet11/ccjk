/**
 * One-click health check + repair for the four primary tools:
 * Clavue / Claude Code / Codex / Grok CLI
 */

import type { CodeToolType } from '../constants'
import { existsSync } from 'node:fs'
import {
  CODE_TOOL_TYPES,
  isClaudeFamilyTool,
  settingsFileForTool,
} from '../constants'
import { TOOL_MATRIX } from '../config/tool-matrix'

const CODE_TOOL_INFO: Record<CodeToolType, { name: string, configFile: string }> = {
  clavue: { name: TOOL_MATRIX.clavue.displayName, configFile: settingsFileForTool('clavue') },
  'claude-code': { name: TOOL_MATRIX['claude-code'].displayName, configFile: settingsFileForTool('claude-code') },
  codex: { name: TOOL_MATRIX.codex.displayName, configFile: settingsFileForTool('codex') },
  grok: { name: TOOL_MATRIX.grok.displayName, configFile: settingsFileForTool('grok') },
}
import {
  analyzeClaudeSettings,
  checkApiEndpointHealth,
  isLocalUrl,
  readClaudeSettingsFile,
  repairClaudeSettingsFile,
} from './claude-settings-guard'
import { getGrokQuickStatus, readGrokConfig } from './grok-config'
import { readCodexConfig } from './code-tools/codex'

export type ToolHealthStatus = 'ok' | 'warning' | 'error' | 'missing'

export interface ToolHealthReport {
  tool: CodeToolType
  displayName: string
  configFile: string
  status: ToolHealthStatus
  messages: string[]
  fixes: string[]
  repaired?: boolean
  repairSummary?: string
}

export interface PrimaryToolsHealthResult {
  reports: ToolHealthReport[]
  okCount: number
  warningCount: number
  errorCount: number
  missingCount: number
  repairedCount: number
}

async function checkClaudeFamilyHealth(
  tool: 'clavue' | 'claude-code',
  options: { repair?: boolean } = {},
): Promise<ToolHealthReport> {
  const info = CODE_TOOL_INFO[tool]
  const report: ToolHealthReport = {
    tool,
    displayName: info.name,
    configFile: info.configFile,
    status: 'ok',
    messages: [],
    fixes: [],
  }

  if (!existsSync(info.configFile)) {
    report.status = 'missing'
    report.messages.push('settings.json not found')
    report.fixes.push(`ccjk init -T ${tool}`)
    return report
  }

  let settings = readClaudeSettingsFile(info.configFile)
  if (!settings) {
    report.status = 'error'
    report.messages.push('settings.json is invalid JSON')
    report.fixes.push(`ccjk config repair  (or restore from ~/.claude/backup)`)
    return report
  }

  if (options.repair) {
    const result = await repairClaudeSettingsFile(info.configFile, {
      backup: true,
      healthCheck: 'local-only',
    })
    report.repaired = result.changed
    report.repairSummary = [
      result.removedKeys.length ? `removed: ${result.removedKeys.join(', ')}` : null,
      result.migrated.length ? `migrated: ${result.migrated.join('; ')}` : null,
      result.backupPath ? `backup: ${result.backupPath}` : null,
    ].filter(Boolean).join(' | ') || 'no structural changes'
    settings = readClaudeSettingsFile(info.configFile) || settings
  }

  const issues = analyzeClaudeSettings(settings)
  const critical = issues.filter(i => i.severity === 'critical')
  const high = issues.filter(i => i.severity === 'high')

  if (critical.length) {
    report.status = 'error'
    report.messages.push(...critical.map(i => `[${i.key || 'root'}] ${i.message}`))
    report.fixes.push('ccjk config repair')
  }
  else if (high.length) {
    report.status = 'warning'
    report.messages.push(...high.map(i => `[${i.key}] ${i.message}`))
    report.fixes.push('ccjk config repair')
  }
  else {
    report.messages.push('settings clean')
  }

  const base = settings.env?.ANTHROPIC_BASE_URL
  if (base) {
    const health = await checkApiEndpointHealth(base, 2000)
    if (!health.ok) {
      if (isLocalUrl(base)) {
        report.status = report.status === 'error' ? 'error' : 'error'
        report.messages.push(`local API unreachable: ${base}`)
        report.fixes.push('Start proxy (ccr start) or change ANTHROPIC_BASE_URL')
      }
      else {
        if (report.status === 'ok')
          report.status = 'warning'
        report.messages.push(`API probe failed: ${base} (${health.error || 'unknown'})`)
      }
    }
    else {
      report.messages.push(`API OK (${health.latencyMs}ms)`)
    }
  }
  else {
    report.messages.push('no ANTHROPIC_BASE_URL (using default/official)')
  }

  return report
}

async function checkCodexHealth(): Promise<ToolHealthReport> {
  const info = CODE_TOOL_INFO.codex
  const report: ToolHealthReport = {
    tool: 'codex',
    displayName: info.name,
    configFile: info.configFile,
    status: 'ok',
    messages: [],
    fixes: [],
  }

  if (!existsSync(info.configFile)) {
    report.status = 'missing'
    report.messages.push('config.toml not found')
    report.fixes.push('ccjk init -T codex')
    return report
  }

  try {
    const config = readCodexConfig()
    if (!config) {
      report.status = 'warning'
      report.messages.push('config.toml unreadable or empty')
      report.fixes.push('ccjk init -T codex')
      return report
    }
    const providerCount = config.providers?.length || 0
    if (providerCount === 0) {
      report.status = 'warning'
      report.messages.push('no model providers configured')
      report.fixes.push('ccjk api apply -T codex --key <k> --url <u>')
    }
    else {
      report.messages.push(`${providerCount} provider(s), active=${config.modelProvider || '—'}`)
    }
    if (config.model)
      report.messages.push(`model=${config.model}`)
  }
  catch (error) {
    report.status = 'error'
    report.messages.push(error instanceof Error ? error.message : String(error))
    report.fixes.push('ccjk init -T codex')
  }

  return report
}

async function checkGrokHealth(): Promise<ToolHealthReport> {
  const info = CODE_TOOL_INFO.grok
  const report: ToolHealthReport = {
    tool: 'grok',
    displayName: info.name,
    configFile: info.configFile,
    status: 'ok',
    messages: [],
    fixes: [],
  }

  const quick = getGrokQuickStatus()
  if (!quick.installed) {
    report.status = 'warning'
    report.messages.push('grok CLI not installed')
    report.fixes.push(quick.hint)
  }

  if (!existsSync(info.configFile)) {
    report.status = report.status === 'ok' ? 'missing' : report.status
    report.messages.push('config.toml not found')
    report.fixes.push('ccjk grok api  or  ccjk init -T grok')
    return report
  }

  const config = readGrokConfig()
  if (!config || config.models.length === 0) {
    if (report.status === 'ok')
      report.status = 'warning'
    report.messages.push(quick.loggedIn ? 'logged in, no custom models' : 'no models configured')
    if (!quick.loggedIn)
      report.fixes.push('ccjk grok api')
  }
  else {
    report.messages.push(
      `${config.models.length} model(s), default=${config.defaultModel || '—'}`,
    )
  }

  if (quick.installed && quick.configured && report.status === 'ok')
    report.messages.push('ready')

  return report
}

/**
 * Full health report for all primary tools
 */
export async function checkPrimaryToolsHealth(
  options: { repair?: boolean } = {},
): Promise<PrimaryToolsHealthResult> {
  const reports: ToolHealthReport[] = []

  for (const tool of CODE_TOOL_TYPES) {
    if (isClaudeFamilyTool(tool)) {
      reports.push(await checkClaudeFamilyHealth(tool, options))
    }
    else if (tool === 'codex') {
      reports.push(await checkCodexHealth())
    }
    else if (tool === 'grok') {
      reports.push(await checkGrokHealth())
    }
  }

  return {
    reports,
    okCount: reports.filter(r => r.status === 'ok').length,
    warningCount: reports.filter(r => r.status === 'warning').length,
    errorCount: reports.filter(r => r.status === 'error').length,
    missingCount: reports.filter(r => r.status === 'missing').length,
    repairedCount: reports.filter(r => r.repaired).length,
  }
}

/**
 * Repair Claude-family settings (dirty keys / dead local proxy hygiene)
 * and re-check all tools.
 */
export async function repairPrimaryToolsHealth(): Promise<PrimaryToolsHealthResult> {
  return checkPrimaryToolsHealth({ repair: true })
}

export function formatPrimaryToolsHealth(result: PrimaryToolsHealthResult): string {
  const lines: string[] = []
  lines.push('Primary tools health (Clavue / Claude Code / Codex / Grok CLI)')
  lines.push('─'.repeat(56))

  for (const r of result.reports) {
    const icon
      = r.status === 'ok'
        ? '✅'
        : r.status === 'warning'
          ? '⚠️'
          : r.status === 'missing'
            ? '○'
            : '❌'
    lines.push(`${icon} ${r.displayName}  [${r.status}]`)
    lines.push(`   ${r.configFile}`)
    for (const m of r.messages)
      lines.push(`   · ${m}`)
    if (r.repaired)
      lines.push(`   🔧 repaired: ${r.repairSummary || 'yes'}`)
    for (const f of r.fixes)
      lines.push(`   💡 ${f}`)
  }

  lines.push('─'.repeat(56))
  lines.push(
    `Summary: ok=${result.okCount} warn=${result.warningCount} err=${result.errorCount} missing=${result.missingCount}`
    + (result.repairedCount ? ` repaired=${result.repairedCount}` : ''),
  )
  return lines.join('\n')
}
