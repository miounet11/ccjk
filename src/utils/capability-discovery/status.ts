/**
 * Status Panel Generator
 * Creates detailed status panels for capability display
 */

import type { Capability, CapabilityScanResult, StatusOptions } from './types'
import ansis from 'ansis'

/**
 * Generate a detailed status panel
 */
export function generateStatusPanel(
  scanResult: CapabilityScanResult,
  options: StatusOptions = {},
): string {
  const { detailed = false, filterType, filterStatus } = options
  const lines: string[] = []

  lines.push(ansis.bold.cyan('╭─────────────────────────────────────────────────────╮'))
  lines.push(ansis.bold.cyan('│         CCJK Capability Status Panel                │'))
  lines.push(ansis.bold.cyan('╰─────────────────────────────────────────────────────╯'))
  lines.push('')

  // Summary
  lines.push(ansis.bold('📊 Summary:'))
  lines.push(`   Total: ${scanResult.total} | Active: ${ansis.green(String(scanResult.activeCount))} | Errors: ${scanResult.errorCount > 0 ? ansis.red(String(scanResult.errorCount)) : '0'}`)
  lines.push('')

  // Commands section
  if (scanResult.commands.length > 0 && (!filterType || filterType === 'command')) {
    lines.push(ansis.bold.yellow('📝 Commands:'))
    for (const cap of filterCapabilities(scanResult.commands, filterStatus)) {
      lines.push(formatCapabilityLine(cap, detailed))
    }
    lines.push('')
  }

  // Skills section
  if (scanResult.skills.length > 0 && (!filterType || filterType === 'skill')) {
    lines.push(ansis.bold.blue('🎯 Skills:'))
    for (const cap of filterCapabilities(scanResult.skills, filterStatus)) {
      lines.push(formatCapabilityLine(cap, detailed))
    }
    lines.push('')
  }

  // Superpowers section
  if (scanResult.superpowers.length > 0 && (!filterType || filterType === 'superpower')) {
    lines.push(ansis.bold.magenta('⚡ Superpowers:'))
    for (const cap of filterCapabilities(scanResult.superpowers, filterStatus)) {
      lines.push(formatCapabilityLine(cap, detailed))
    }
    lines.push('')
  }

  // Agents section
  if (scanResult.agents.length > 0 && (!filterType || filterType === 'agent')) {
    lines.push(ansis.bold.green('🤖 Agents:'))
    for (const cap of filterCapabilities(scanResult.agents, filterStatus)) {
      lines.push(formatCapabilityLine(cap, detailed))
    }
    lines.push('')
  }

  // MCP Services section
  if (scanResult.mcpServices.length > 0 && (!filterType || filterType === 'mcp')) {
    lines.push(ansis.bold.cyan('🔌 MCP Services:'))
    for (const cap of filterCapabilities(scanResult.mcpServices, filterStatus)) {
      lines.push(formatCapabilityLine(cap, detailed))
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Filter capabilities by status
 */
function filterCapabilities(
  capabilities: Capability[],
  filterStatus?: 'active' | 'inactive' | 'error',
): Capability[] {
  if (!filterStatus) {
    return capabilities
  }
  return capabilities.filter(c => c.status === filterStatus)
}

/**
 * Format a single capability line
 */
function formatCapabilityLine(cap: Capability, detailed: boolean): string {
  const statusIcon = cap.status === 'active'
    ? ansis.green('●')
    : cap.status === 'error'
      ? ansis.red('●')
      : ansis.gray('○')

  const name = cap.status === 'active' ? ansis.white(cap.name) : ansis.gray(cap.name)

  let line = `   ${statusIcon} ${name}`

  if (cap.triggers && cap.triggers.length > 0) {
    line += ansis.dim(` (${cap.triggers[0]})`)
  }

  if (detailed) {
    line += `\n      ${ansis.dim(cap.description)}`
    if (cap.path) {
      line += `\n      ${ansis.dim(`Path: ${cap.path}`)}`
    }
    if (cap.error) {
      line += `\n      ${ansis.red(`Error: ${cap.error}`)}`
    }
  }

  return line
}

/**
 * Format capability list as simple text
 */
export function formatCapabilityList(capabilities: Capability[]): string {
  if (capabilities.length === 0) {
    return 'No capabilities found.'
  }

  const lines: string[] = []

  for (const cap of capabilities) {
    const status = cap.status === 'active' ? '✓' : cap.status === 'error' ? '✗' : '○'
    lines.push(`${status} ${cap.name} - ${cap.description}`)
  }

  return lines.join('\n')
}

/**
 * Generate quick status summary
 */
export function generateQuickStatus(scanResult: CapabilityScanResult): string {
  const parts: string[] = []

  if (scanResult.commands.length > 0) {
    const active = scanResult.commands.filter(c => c.status === 'active').length
    parts.push(`${active}/${scanResult.commands.length} commands`)
  }

  if (scanResult.skills.length > 0) {
    const active = scanResult.skills.filter(c => c.status === 'active').length
    parts.push(`${active}/${scanResult.skills.length} skills`)
  }

  if (scanResult.superpowers.length > 0) {
    const active = scanResult.superpowers.filter(c => c.status === 'active').length
    parts.push(`${active}/${scanResult.superpowers.length} superpowers`)
  }

  if (scanResult.agents.length > 0) {
    const active = scanResult.agents.filter(c => c.status === 'active').length
    parts.push(`${active}/${scanResult.agents.length} agents`)
  }

  if (scanResult.mcpServices.length > 0) {
    const active = scanResult.mcpServices.filter(c => c.status === 'active').length
    parts.push(`${active}/${scanResult.mcpServices.length} MCP`)
  }

  return parts.join(' | ')
}
