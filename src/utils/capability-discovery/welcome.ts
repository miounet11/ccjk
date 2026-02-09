/**
 * Welcome Interface Generator
 * Creates beautiful welcome messages showing available capabilities
 */

import type { CapabilityScanResult, WelcomeOptions } from './types'
import ansis from 'ansis'
import { version as pkgVersion } from '../../../package.json'

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
  const plainText = text.replace(/\x1B\[[0-9;]*m/g, '')
  const padding = Math.max(0, width - plainText.length - 2)
  return `${BOX_CHARS.vertical} ${text}${' '.repeat(padding - 1)}${BOX_CHARS.vertical}`
}

/**
 * Get version from package.json
 */
function getVersion(): string {
  return pkgVersion || '0.0.0'
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
  const width = compact ? 50 : 70

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

  // Available capabilities section
  if (showStats && scanResult.total > 0) {
    lines.push(leftText('', width))
    lines.push(leftText(ansis.bold('✨ Available Capabilities:'), width))

    // Skills - show actual skill names
    if (scanResult.skills.length > 0) {
      const activeSkills = scanResult.skills.filter(c => c.status === 'active')
      if (activeSkills.length > 0) {
        lines.push(leftText('', width))
        lines.push(leftText(ansis.bold.green('  📚 Skills:'), width))
        activeSkills.slice(0, 5).forEach((skill) => {
          const trigger = skill.triggers?.[0] || `/${skill.id}`
          lines.push(leftText(`     ${ansis.cyan(trigger.padEnd(20))} ${ansis.dim(skill.description)}`, width))
        })
        if (activeSkills.length > 5) {
          lines.push(leftText(`     ${ansis.dim(`... and ${activeSkills.length - 5} more`)}`, width))
        }
      }
    }

    // MCP Services - show actual service names
    if (scanResult.mcpServices.length > 0) {
      const activeMcp = scanResult.mcpServices.filter(c => c.status === 'active')
      if (activeMcp.length > 0) {
        lines.push(leftText('', width))
        lines.push(leftText(ansis.bold.green('  🔌 MCP Services:'), width))
        activeMcp.slice(0, 5).forEach((mcp) => {
          lines.push(leftText(`     ${ansis.cyan(mcp.name.padEnd(20))} ${ansis.dim(mcp.description)}`, width))
        })
        if (activeMcp.length > 5) {
          lines.push(leftText(`     ${ansis.dim(`... and ${activeMcp.length - 5} more`)}`, width))
        }
      }
    }

    // Agents - show actual agent names
    if (scanResult.agents.length > 0) {
      const activeAgents = scanResult.agents.filter(c => c.status === 'active')
      if (activeAgents.length > 0) {
        lines.push(leftText('', width))
        lines.push(leftText(ansis.bold.green('  🤖 Agents:'), width))
        activeAgents.forEach((agent) => {
          const trigger = agent.triggers?.[0] || agent.id
          lines.push(leftText(`     ${ansis.cyan(trigger.padEnd(20))} ${ansis.dim(agent.description)}`, width))
        })
      }
    }

    // Superpowers - show actual superpower names
    if (scanResult.superpowers.length > 0) {
      const activeSuperpowers = scanResult.superpowers.filter(c => c.status === 'active')
      if (activeSuperpowers.length > 0) {
        lines.push(leftText('', width))
        lines.push(leftText(ansis.bold.green('  ⚡ Superpowers:'), width))
        activeSuperpowers.slice(0, 3).forEach((sp) => {
          lines.push(leftText(`     ${ansis.cyan(sp.name.padEnd(20))} ${ansis.dim(sp.description)}`, width))
        })
        if (activeSuperpowers.length > 3) {
          lines.push(leftText(`     ${ansis.dim(`... and ${activeSuperpowers.length - 3} more`)}`, width))
        }
      }
    }

    // CCJK Commands summary (not detailed list to keep it clean)
    if (scanResult.commands.length > 0) {
      const activeCommands = scanResult.commands.filter(c => c.status === 'active').length
      lines.push(leftText('', width))
      lines.push(leftText(`  ${ansis.green('•')} ${activeCommands} CCJK Command(s) available`, width))
    }

    // Error count
    if (scanResult.errorCount > 0) {
      lines.push(leftText('', width))
      lines.push(leftText(`  ${ansis.red('⚠')} ${scanResult.errorCount} capability error(s) detected`, width))
    }
  }

  // Quick start tips
  if (showRecommendations && !compact) {
    lines.push(leftText('', width))
    lines.push(leftText(ansis.bold('💡 Quick Tips:'), width))
    lines.push(leftText(`   ${ansis.green('/ccjk:status')} - View detailed capability status`, width))
    lines.push(leftText(`   ${ansis.green('/ccjk:help')} - Get help and documentation`, width))

    // Show a useful skill example if available
    const activeSkills = scanResult.skills.filter(c => c.status === 'active')
    if (activeSkills.length > 0 && activeSkills[0].triggers?.[0]) {
      lines.push(leftText(`   ${ansis.green(activeSkills[0].triggers[0])} - Try this skill`, width))
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
