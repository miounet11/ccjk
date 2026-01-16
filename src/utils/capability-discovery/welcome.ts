/**
 * Welcome Interface Generator
 * Creates beautiful welcome messages showing available capabilities
 */

import type { CapabilityScanResult, WelcomeOptions } from './types'
import ansis from 'ansis'

const BOX_CHARS = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
}

/**
 * Create a box border line
 */
function createBorderLine(width: number, type: 'top' | 'bottom' | 'middle'): string {
  const left = type === 'top' ? BOX_CHARS.topLeft : type === 'bottom' ? BOX_CHARS.bottomLeft : BOX_CHARS.vertical
  const right = type === 'top' ? BOX_CHARS.topRight : type === 'bottom' ? BOX_CHARS.bottomRight : BOX_CHARS.vertical
  const fill = type === 'middle' ? ' ' : BOX_CHARS.horizontal

  return `${left}${fill.repeat(width - 2)}${right}`
}

/**
 * Pad text to center it within a given width
 */
function centerText(text: string, width: number): string {
  // Strip ANSI codes for length calculation
  // eslint-disable-next-line no-control-regex
  const plainText = text.replace(/\x1B\[[0-9;]*m/g, '')
  const padding = Math.max(0, width - plainText.length - 2)
  const leftPad = Math.floor(padding / 2)
  const rightPad = padding - leftPad

  return `${BOX_CHARS.vertical}${' '.repeat(leftPad)}${text}${' '.repeat(rightPad)}${BOX_CHARS.vertical}`
}

/**
 * Pad text to left-align it within a given width
 */
function leftText(text: string, width: number): string {
  // Strip ANSI codes for length calculation
  // eslint-disable-next-line no-control-regex
  const plainText = text.replace(/\x1B\[[0-9;]*m/g, '')
  const padding = Math.max(0, width - plainText.length - 2)
  return `${BOX_CHARS.vertical} ${text}${' '.repeat(padding - 1)}${BOX_CHARS.vertical}`
}

/**
 * Get version from package.json
 */
function getVersion(): string {
  try {
    // eslint-disable-next-line ts/no-require-imports
    const pkg = require('../../../package.json')
    return pkg.version || '0.0.0'
  }
  catch {
    return '0.0.0'
  }
}

/**
 * Generate welcome message
 */
export function generateWelcome(
  scanResult: CapabilityScanResult,
  options: WelcomeOptions = {},
): string {
  const {
    showVersion = true,
    showStats = true,
    showRecommendations = true,
    compact = false,
  } = options

  const lines: string[] = []
  const width = compact ? 50 : 60

  // Header
  lines.push(createBorderLine(width, 'top'))

  if (showVersion) {
    const version = getVersion()
    const title = ansis.bold.cyan(`🎉 CCJK v${version} - Claude Code JinKu`)
    lines.push(centerText(title, width))
  }
  else {
    const title = ansis.bold.cyan('🎉 CCJK - Claude Code JinKu')
    lines.push(centerText(title, width))
  }

  // Stats section
  if (showStats && scanResult.total > 0) {
    lines.push(leftText('', width))
    lines.push(leftText(ansis.bold('📦 Loaded Capabilities:'), width))

    if (scanResult.commands.length > 0) {
      const activeCommands = scanResult.commands.filter(c => c.status === 'active').length
      lines.push(leftText(`   ${ansis.green('•')} ${activeCommands} CCJK Command(s)`, width))
    }

    if (scanResult.skills.length > 0) {
      const activeSkills = scanResult.skills.filter(c => c.status === 'active').length
      lines.push(leftText(`   ${ansis.green('•')} ${activeSkills} Custom Skill(s)`, width))
    }

    if (scanResult.superpowers.length > 0) {
      const activeSuperpowers = scanResult.superpowers.filter(c => c.status === 'active').length
      lines.push(leftText(`   ${ansis.green('•')} ${activeSuperpowers} Superpower(s)`, width))
    }

    if (scanResult.agents.length > 0) {
      const activeAgents = scanResult.agents.filter(c => c.status === 'active').length
      lines.push(leftText(`   ${ansis.green('•')} ${activeAgents} Agent Tool(s)`, width))
    }

    if (scanResult.mcpServices.length > 0) {
      const activeMcp = scanResult.mcpServices.filter(c => c.status === 'active').length
      lines.push(leftText(`   ${ansis.green('•')} ${activeMcp} MCP Service(s)`, width))
    }

    // Error count
    if (scanResult.errorCount > 0) {
      lines.push(leftText(`   ${ansis.red('⚠')} ${scanResult.errorCount} Error(s)`, width))
    }
  }

  // Recommendations
  if (showRecommendations && !compact) {
    lines.push(leftText('', width))
    lines.push(leftText(ansis.bold('💡 Quick Start:'), width))
    lines.push(leftText(`   Type ${ansis.green('/ccjk:status')} to see all capabilities`, width))

    if (scanResult.commands.length > 0) {
      const topCommand = scanResult.commands
        .filter(c => c.status === 'active')
        .sort((a, b) => b.priority - a.priority)[0]

      if (topCommand && topCommand.triggers?.[0]) {
        lines.push(leftText(`   Try ${ansis.green(topCommand.triggers[0])} for ${topCommand.name}`, width))
      }
    }
  }

  // Footer
  lines.push(createBorderLine(width, 'bottom'))

  return lines.join('\n')
}

/**
 * Generate compact welcome (one-line summary)
 */
export function generateCompactWelcome(scanResult: CapabilityScanResult): string {
  const parts: string[] = []

  if (scanResult.commands.length > 0) {
    parts.push(`${scanResult.commands.filter(c => c.status === 'active').length} commands`)
  }

  if (scanResult.skills.length > 0) {
    parts.push(`${scanResult.skills.filter(c => c.status === 'active').length} skills`)
  }

  if (scanResult.superpowers.length > 0) {
    parts.push(`${scanResult.superpowers.filter(c => c.status === 'active').length} superpowers`)
  }

  const summary = parts.join(', ')
  return ansis.dim(`CCJK loaded: ${summary || 'no capabilities'}`)
}

/**
 * Generate recommendation based on scan results
 */
export function generateRecommendations(scanResult: CapabilityScanResult): string[] {
  const recommendations: string[] = []

  // No capabilities installed
  if (scanResult.total === 0) {
    recommendations.push('Run `npx ccjk` to install CCJK capabilities')
    return recommendations
  }

  // Agent Browser not installed
  if (scanResult.agents.length === 0) {
    recommendations.push('Install Agent Browser for zero-config browser automation')
  }

  // No superpowers
  if (scanResult.superpowers.length === 0) {
    recommendations.push('Install Superpowers for advanced AI workflows')
  }

  // Errors detected
  if (scanResult.errorCount > 0) {
    recommendations.push(`Fix ${scanResult.errorCount} capability error(s) - run /ccjk:status for details`)
  }

  return recommendations
}
