import type { SetupResult, SetupReport } from '../orchestrators/setup-orchestrator'
import dayjs from 'dayjs'

export function generateReport(result: SetupResult): string {
  const report: SetupReport = {
    date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    profile: result.installationPlan?.profile || 'unknown',
    duration: result.duration,
    projectAnalysis: result.projectAnalysis,
    installationPlan: result.installationPlan,
    phases: result.phases,
    summary: {
      total: result.totalInstalled + result.totalSkipped + result.totalFailed,
      installed: result.totalInstalled,
      skipped: result.totalSkipped,
      failed: result.totalFailed,
    },
    nextSteps: generateNextSteps(result),
  }

  return formatReport(report)
}

function formatReport(report: SetupReport): string {
  const lines: string[] = []

  // Header
  lines.push('# CCJK Setup Report')
  lines.push('')
  lines.push(`**Date**: ${report.date}`)
  lines.push(`**Profile**: ${report.profile}`)
  lines.push(`**Duration**: ${(report.duration / 1000).toFixed(1)}s`)
  lines.push('')

  // Project Analysis
  if (report.projectAnalysis) {
    lines.push('## Project Analysis')
    lines.push('')
    lines.push(`- **Type**: ${report.projectAnalysis.type || 'Unknown'}`)
    lines.push(`- **Complexity**: ${report.projectAnalysis.complexity || 'Unknown'}`)
    if (report.projectAnalysis.teamSize) {
      lines.push(`- **Team Size**: ${report.projectAnalysis.teamSize}`)
    }
    if (report.projectAnalysis.languages?.length) {
      lines.push(`- **Languages**: ${report.projectAnalysis.languages.join(', ')}`)
    }
    if (report.projectAnalysis.frameworks?.length) {
      lines.push(`- **Frameworks**: ${report.projectAnalysis.frameworks.join(', ')}`)
    }
    lines.push('')
  }

  // Installation Summary
  lines.push('## Installation Summary')
  lines.push('')
  lines.push(`✅ **Total Installed**: ${report.summary.installed}`)
  if (report.summary.skipped > 0) {
    lines.push(`⚠️  **Total Skipped**: ${report.summary.skipped}`)
  }
  if (report.summary.failed > 0) {
    lines.push(`❌ **Total Failed**: ${report.summary.failed}`)
  }
  lines.push('')

  // Phase Details
  for (const phase of report.phases) {
    if (phase.installed === 0 && phase.skipped === 0 && phase.failed === 0) {
      continue
    }

    lines.push(`### ${phase.phase.charAt(0).toUpperCase() + phase.phase.slice(1)} Phase`)
    lines.push('')
    lines.push(`- **Status**: ${phase.success ? '✅ Success' : '❌ Failed'}`)
    lines.push(`- **Installed**: ${phase.installed}`)
    if (phase.skipped > 0) {
      lines.push(`- **Skipped**: ${phase.skipped}`)
    }
    if (phase.failed > 0) {
      lines.push(`- **Failed**: ${phase.failed}`)
    }
    lines.push(`- **Duration**: ${(phase.duration / 1000).toFixed(1)}s`)

    if (phase.details?.resources) {
      lines.push('')
      lines.push('**Installed Resources**:')
      for (const resource of phase.details.resources) {
        lines.push(`  - ${resource.id || resource.name} (${resource.priority || 'unknown'})`)
      }
    }

    lines.push('')
  }

  // Next Steps
  if (report.nextSteps.length > 0) {
    lines.push('## Next Steps')
    lines.push('')
    for (let i = 0; i < report.nextSteps.length; i++) {
      lines.push(`${i + 1}. ${report.nextSteps[i]}`)
    }
    lines.push('')
  }

  // Configuration Details
  if (report.installationPlan) {
    lines.push('## Configuration Details')
    lines.push('')
    lines.push('```json')
    lines.push(JSON.stringify(report.installationPlan, null, 2))
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n')
}

function generateNextSteps(result: SetupResult): string[] {
  const steps: string[] = []

  if (result.totalInstalled > 0) {
    steps.push('Start coding: Your CCJK configuration is ready to use')

    const agentsPhase = result.phases.find(p => p.phase === 'agents')
    if (agentsPhase?.installed > 0) {
      steps.push('Run an agent: ccjk agent run <agent-name>')
    }

    const skillsPhase = result.phases.find(p => p.phase === 'skills')
    if (skillsPhase?.installed > 0) {
      steps.push('View available skills: ccjk skills list')
    }

    const mcpPhase = result.phases.find(p => p.phase === 'mcp')
    if (mcpPhase?.installed > 0) {
      steps.push('Check MCP services: ccjk mcp list')
    }

    const hooksPhase = result.phases.find(p => p.phase === 'hooks')
    if (hooksPhase?.installed > 0) {
      steps.push('Verify hooks: ccjk hooks list')
    }
  }

  if (result.totalFailed > 0) {
    steps.push('Review failed installations and try again with --verbose for details')
  }

  steps.push('Customize your setup anytime with: ccjk setup --profile custom')

  return steps
}

export function generatePhaseReport(phase: string, resources: any[]): string {
  const lines: string[] = []

  lines.push(`## ${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase Plan`)
  lines.push('')
  lines.push(`**Total Resources**: ${resources.length}`)
  lines.push('')

  const byPriority = groupByPriority(resources)

  for (const [priority, items] of Object.entries(byPriority)) {
    if (items.length > 0) {
      lines.push(`### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority`)
      for (const item of items) {
        lines.push(`- ${item.id || item.name}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

function groupByPriority(resources: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {
    essential: [],
    high: [],
    recommended: [],
    medium: [],
    low: [],
  }

  for (const resource of resources) {
    const priority = resource.priority || 'medium'
    if (!groups[priority]) {
      groups[priority] = []
    }
    groups[priority].push(resource)
  }

  return groups
}