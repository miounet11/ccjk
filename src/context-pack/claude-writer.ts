/**
 * CCJK Context Pack - Claude Code Writer
 *
 * Writes context pack to CLAUDE.md format.
 */

import type { ContextPack } from './builder'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'pathe'

/**
 * Write context pack to CLAUDE.md
 */
export async function writeClaudeContext(
  contextPack: ContextPack,
  outputPath: string,
): Promise<void> {
  const content = formatClaudeContext(contextPack)

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, content, 'utf-8')
}

/**
 * Format context pack as CLAUDE.md
 */
function formatClaudeContext(pack: ContextPack): string {
  const sections: string[] = []

  // Header
  sections.push('# CLAUDE.md')
  sections.push('')
  sections.push('This file provides guidance to Claude Code when working with code in this repository.')
  sections.push('')
  sections.push(`Generated: ${new Date(pack.generatedAt).toLocaleString()}`)
  sections.push('')
  sections.push('---')
  sections.push('')

  // Project Information
  sections.push('## Project Information')
  sections.push('')
  sections.push(pack.projectIdentity)
  sections.push('')

  // Stack Details
  if (pack.stack.frameworks.length > 0) {
    sections.push('## Technology Stack')
    sections.push('')

    for (const framework of pack.stack.frameworks) {
      sections.push(`### ${framework.name}`)
      if (framework.version) {
        sections.push(`Version: ${framework.version}`)
      }
      sections.push(`Type: ${framework.type}`)
      sections.push('')
    }
  }

  // Commands
  if (pack.commands.length > 0) {
    sections.push('## Available Commands')
    sections.push('')

    const commandsByType = new Map<string, typeof pack.commands>()
    for (const cmd of pack.commands) {
      const cmds = commandsByType.get(cmd.type) || []
      cmds.push(cmd)
      commandsByType.set(cmd.type, cmds)
    }

    for (const [type, commands] of commandsByType) {
      sections.push(`### ${type.charAt(0).toUpperCase() + type.slice(1)}`)
      sections.push('')
      for (const cmd of commands) {
        sections.push(`- \`${cmd.name}\`: ${cmd.command}`)
        if (cmd.description) {
          sections.push(`  ${cmd.description}`)
        }
      }
      sections.push('')
    }
  }

  // Repository Structure
  if (pack.repoTopology) {
    sections.push('## Repository Structure')
    sections.push('')
    sections.push(pack.repoTopology)
    sections.push('')
  }

  // Test Policy
  if (pack.testPolicy) {
    sections.push('## Testing')
    sections.push('')
    sections.push(pack.testPolicy)
    sections.push('')
  }

  // Risk Zones
  if (pack.riskZones.length > 0) {
    sections.push('## Risk Zones')
    sections.push('')
    sections.push('Be cautious when modifying these areas:')
    sections.push('')
    for (const zone of pack.riskZones) {
      sections.push(`- ${zone}`)
    }
    sections.push('')
  }

  // Retrieval Instructions
  if (pack.retrievalInstructions) {
    sections.push('## Development Guidelines')
    sections.push('')
    sections.push(pack.retrievalInstructions)
    sections.push('')
  }

  return sections.join('\n')
}
