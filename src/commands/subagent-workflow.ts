/**
 * CCJK Subagent Workflow Command
 *
 * CLI interface for managing subagent workflows based on Superpowers concepts.
 * Provides workflow creation, monitoring, and management capabilities.
 *
 * @module commands/subagent-workflow
 */

import type { SupportedLang } from '../constants.js'
import type {
  CreateWorkflowOptions,
} from '../workflow/index.js'
import type {
  WorkflowPhase,
  WorkflowSession,
  WorkflowStatus,
} from '../workflow/types.js'
import ansis from 'ansis'
import inquirer from 'inquirer'
import {
  cancelAllTasks,
  createWorkflow,
  getSchedulerStats,
  getWorkflowState,
  listWorkflows,
  pauseScheduler,
  resumeScheduler,
  transitionWorkflow,
} from '../workflow/index.js'

// ============================================================================
// Types
// ============================================================================

export interface SubagentWorkflowOptions {
  /** Language for UI */
  lang?: SupportedLang

  /** Workflow ID for operations */
  workflowId?: string

  /** Non-interactive mode */
  nonInteractive?: boolean

  /** Output format */
  format?: 'table' | 'json' | 'minimal'
}

// ============================================================================
// Constants
// ============================================================================

const PHASE_ICONS: Record<WorkflowPhase, string> = {
  brainstorming: '💡',
  planning: '📋',
  implementation: '🔨',
  review: '🔍',
  finishing: '✅',
}

const PHASE_COLORS: Record<WorkflowPhase, (text: string) => string> = {
  brainstorming: ansis.magenta,
  planning: ansis.green,
  implementation: ansis.yellow,
  review: ansis.green,
  finishing: ansis.green,
}

const STATUS_ICONS: Record<WorkflowStatus, string> = {
  active: '🔄',
  paused: '⏸️',
  completed: '✅',
  failed: '❌',
  cancelled: '🚫',
}

// ============================================================================
// Display Helpers
// ============================================================================

function formatPhase(phase: WorkflowPhase): string {
  const icon = PHASE_ICONS[phase]
  const color = PHASE_COLORS[phase]
  return `${icon} ${color(phase.charAt(0).toUpperCase() + phase.slice(1))}`
}

function formatDuration(ms: number): string {
  if (ms < 1000)
    return `${ms}ms`
  if (ms < 60000)
    return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000)
    return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

function formatProgress(current: number, total: number): string {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0
  const filled = Math.round(percentage / 5)
  const empty = 20 - filled
  const bar = ansis.green('█'.repeat(filled)) + ansis.gray('░'.repeat(empty))
  return `${bar} ${percentage}%`
}

function getTaskCounts(session: WorkflowSession): { completed: number, failed: number, total: number } {
  const tasks = session.tasks || []
  return {
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    total: tasks.length,
  }
}

// ============================================================================
// Main Commands
// ============================================================================

/**
 * Show workflow dashboard
 */
export async function showWorkflowDashboard(_options: SubagentWorkflowOptions = {}): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan('┌─────────────────────────────────────────────────────────────┐'))
  console.log(ansis.bold.cyan('│') + ansis.bold.white('  🚀 Subagent Workflow Dashboard                              ') + ansis.bold.cyan('│'))
  console.log(ansis.bold.cyan('├─────────────────────────────────────────────────────────────┤'))

  // Get scheduler stats
  const stats = getSchedulerStats()

  // Stats row
  console.log(`${ansis.bold.cyan('│')}  ${ansis.bold('Active:')} ${ansis.green(String(stats.activeWorkflows).padEnd(4))} ${ansis.bold('Queued:')} ${ansis.yellow(String(stats.queuedTasks).padEnd(4))} ${ansis.bold('Completed:')} ${ansis.green(String(stats.completedTasks).padEnd(4))}    ${ansis.bold.cyan('│')}`)
  console.log(`${ansis.bold.cyan('│')}  ${ansis.bold('Failed:')} ${ansis.red(String(stats.failedTasks).padEnd(4))} ${ansis.bold('Agents:')} ${ansis.green(String(stats.totalAgents).padEnd(4))} ${ansis.bold('Uptime:')} ${ansis.dim(formatDuration(stats.uptime).padEnd(8))}   ${ansis.bold.cyan('│')}`)
  console.log(ansis.bold.cyan('├─────────────────────────────────────────────────────────────┤'))

  // List active workflows
  const workflows = listWorkflows()
  const activeWorkflows = workflows.filter(w => w.status === 'active' || w.status === 'paused')

  if (activeWorkflows.length === 0) {
    console.log(ansis.bold.cyan('│') + ansis.dim('  No active workflows                                        ') + ansis.bold.cyan('│'))
  }
  else {
    console.log(ansis.bold.cyan('│') + ansis.bold('  Active Workflows:                                          ') + ansis.bold.cyan('│'))
    for (const wf of activeWorkflows.slice(0, 5)) {
      const phaseStr = formatPhase(wf.currentPhase)
      const counts = getTaskCounts(wf)
      const progress = formatProgress(counts.completed, counts.total)
      console.log(`${ansis.bold.cyan('│')}  ${ansis.dim(wf.id.slice(0, 8))} ${phaseStr.padEnd(25)} ${progress}  ${ansis.bold.cyan('│')}`)
    }
    if (activeWorkflows.length > 5) {
      console.log(ansis.bold.cyan('│') + ansis.dim(`  ... and ${activeWorkflows.length - 5} more`) + ' '.repeat(44 - String(activeWorkflows.length - 5).length) + ansis.bold.cyan('│'))
    }
  }

  console.log(ansis.bold.cyan('└─────────────────────────────────────────────────────────────┘'))
  console.log('')
}

/**
 * Create a new workflow
 */
export async function createNewWorkflow(options: SubagentWorkflowOptions = {}): Promise<string | null> {
  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  🆕 Create New Workflow`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  if (options.nonInteractive) {
    // Non-interactive mode - create with defaults
    const config: CreateWorkflowOptions = {
      name: `workflow-${Date.now()}`,
      description: 'Auto-created workflow',
    }

    const workflow = createWorkflow(config)
    console.log(ansis.green(`  ✅ Created workflow: ${workflow.id}`))
    return workflow.id
  }

  // Interactive mode
  const answers = await inquirer.prompt<{
    name: string
    description: string
    branch: string
  }>([
    {
      type: 'input',
      name: 'name',
      message: 'Workflow name:',
      default: `workflow-${Date.now()}`,
      validate: (input: string) => input.length > 0 || 'Name is required',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description:',
      default: '',
    },
    {
      type: 'input',
      name: 'branch',
      message: 'Git branch (optional):',
      default: '',
    },
  ])

  const config: CreateWorkflowOptions = {
    name: answers.name,
    description: answers.description,
    branch: answers.branch || undefined,
  }

  const workflow = createWorkflow(config)

  console.log('')
  console.log(ansis.green(`  ✅ Created workflow successfully!`))
  console.log(ansis.dim(`  ID: ${workflow.id}`))
  console.log(ansis.dim(`  Phase: ${formatPhase(workflow.currentPhase)}`))
  console.log('')

  return workflow.id
}

/**
 * Show workflow details
 */
export async function showWorkflowDetails(options: SubagentWorkflowOptions = {}): Promise<void> {
  let workflowId = options.workflowId

  if (!workflowId) {
    const workflows = listWorkflows()
    if (workflows.length === 0) {
      console.log(ansis.yellow('\n  ⚠️ No workflows found\n'))
      return
    }

    const { selected } = await inquirer.prompt<{ selected: string }>({
      type: 'list',
      name: 'selected',
      message: 'Select workflow:',
      choices: workflows.map(wf => ({
        name: `${STATUS_ICONS[wf.status]} ${wf.id.slice(0, 8)} - ${wf.name} (${wf.currentPhase})`,
        value: wf.id,
      })),
    })
    workflowId = selected
  }

  const workflow = getWorkflowState(workflowId)
  if (!workflow) {
    console.log(ansis.red(`\n  ❌ Workflow not found: ${workflowId}\n`))
    return
  }

  const counts = getTaskCounts(workflow)

  console.log('')
  console.log(ansis.bold.cyan('┌─────────────────────────────────────────────────────────────┐'))
  console.log(ansis.bold.cyan('│') + ansis.bold.white(`  📊 Workflow: ${workflow.name}`.padEnd(60)) + ansis.bold.cyan('│'))
  console.log(ansis.bold.cyan('├─────────────────────────────────────────────────────────────┤'))

  // Basic info
  console.log(`${ansis.bold.cyan('│')}  ${ansis.bold('ID:')}      ${workflow.id}${' '.repeat(Math.max(0, 60 - 12 - workflow.id.length))}${ansis.bold.cyan('│')}`)
  console.log(`${ansis.bold.cyan('│')}  ${ansis.bold('Status:')}  ${STATUS_ICONS[workflow.status]} ${workflow.status}${' '.repeat(Math.max(0, 60 - 14 - workflow.status.length))}${ansis.bold.cyan('│')}`)
  console.log(`${ansis.bold.cyan('│')}  ${ansis.bold('Phase:')}   ${formatPhase(workflow.currentPhase)}${' '.repeat(35)}${ansis.bold.cyan('│')}`)

  // Progress
  console.log(ansis.bold.cyan('├─────────────────────────────────────────────────────────────┤'))
  console.log(ansis.bold.cyan('│') + ansis.bold('  Progress:                                                  ') + ansis.bold.cyan('│'))
  console.log(`${ansis.bold.cyan('│')}  ${formatProgress(counts.completed, counts.total)}                        ${ansis.bold.cyan('│')}`)
  console.log(`${ansis.bold.cyan('│')}  Tasks: ${ansis.green(String(counts.completed))}/${counts.total} completed, ${ansis.red(String(counts.failed))} failed${' '.repeat(20)}${ansis.bold.cyan('│')}`)

  // Phase history
  if (workflow.phaseHistory && workflow.phaseHistory.length > 0) {
    console.log(ansis.bold.cyan('├─────────────────────────────────────────────────────────────┤'))
    console.log(ansis.bold.cyan('│') + ansis.bold('  Phase History:                                             ') + ansis.bold.cyan('│'))
    for (const entry of workflow.phaseHistory.slice(-5)) {
      const phase = entry.to
      const timestamp = entry.timestamp instanceof Date
        ? entry.timestamp.toISOString()
        : String(entry.timestamp)
      console.log(`${ansis.bold.cyan('│')}  ${PHASE_ICONS[phase]} ${phase.padEnd(15)} ${ansis.dim(timestamp.slice(0, 19).padEnd(10))}${' '.repeat(16)}${ansis.bold.cyan('│')}`)
    }
  }

  console.log(ansis.bold.cyan('└─────────────────────────────────────────────────────────────┘'))
  console.log('')
}

/**
 * Control workflow (pause/resume/cancel)
 */
export async function controlWorkflow(_options: SubagentWorkflowOptions = {}): Promise<void> {
  const workflows = listWorkflows()
  const activeWorkflows = workflows.filter(w => w.status === 'active' || w.status === 'paused')

  if (activeWorkflows.length === 0) {
    console.log(ansis.yellow('\n  ⚠️ No active workflows to control\n'))
    return
  }

  const { workflowId, action } = await inquirer.prompt<{
    workflowId: string
    action: 'pause' | 'resume' | 'cancel' | 'advance'
  }>([
    {
      type: 'list',
      name: 'workflowId',
      message: 'Select workflow:',
      choices: activeWorkflows.map(wf => ({
        name: `${STATUS_ICONS[wf.status]} ${wf.id.slice(0, 8)} - ${wf.name}`,
        value: wf.id,
      })),
    },
    {
      type: 'list',
      name: 'action',
      message: 'Action:',
      choices: [
        { name: '⏸️  Pause workflow', value: 'pause' },
        { name: '▶️  Resume workflow', value: 'resume' },
        { name: '⏭️  Advance to next phase', value: 'advance' },
        { name: '🚫 Cancel workflow', value: 'cancel' },
      ],
    },
  ])

  const workflow = getWorkflowState(workflowId)
  if (!workflow) {
    console.log(ansis.red(`\n  ❌ Workflow not found\n`))
    return
  }

  switch (action) {
    case 'pause':
      pauseScheduler()
      console.log(ansis.yellow(`\n  ⏸️ Paused scheduler\n`))
      break

    case 'resume':
      resumeScheduler()
      console.log(ansis.green(`\n  ▶️ Resumed scheduler\n`))
      break

    case 'advance': {
      const phases: WorkflowPhase[] = ['brainstorming', 'planning', 'implementation', 'review', 'finishing']
      const currentIndex = phases.indexOf(workflow.currentPhase)
      if (currentIndex < phases.length - 1) {
        const nextPhase = phases[currentIndex + 1]
        transitionWorkflow(workflowId, nextPhase)
        console.log(ansis.green(`\n  ⏭️ Advanced to ${formatPhase(nextPhase)}\n`))
      }
      else {
        console.log(ansis.yellow(`\n  ⚠️ Already at final phase\n`))
      }
      break
    }

    case 'cancel':
      cancelAllTasks(workflowId)
      console.log(ansis.red(`\n  🚫 Cancelled workflow\n`))
      break
  }
}

/**
 * List all workflows
 */
export async function listAllWorkflows(options: SubagentWorkflowOptions = {}): Promise<void> {
  const workflows = listWorkflows()

  if (options.format === 'json') {
    console.log(JSON.stringify(workflows, null, 2))
    return
  }

  if (workflows.length === 0) {
    console.log(ansis.yellow('\n  ⚠️ No workflows found\n'))
    return
  }

  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(80)))
  console.log(ansis.bold(`  ${'ID'.padEnd(10)} ${'Name'.padEnd(20)} ${'Phase'.padEnd(15)} ${'Status'.padEnd(10)} ${'Progress'.padEnd(15)}`))
  console.log(ansis.bold.cyan('━'.repeat(80)))

  for (const wf of workflows) {
    const counts = getTaskCounts(wf)
    const progress = `${counts.completed}/${counts.total}`
    console.log(
      `  ${ansis.dim(wf.id.slice(0, 8).padEnd(10))} `
      + `${wf.name.slice(0, 18).padEnd(20)} `
      + `${formatPhase(wf.currentPhase).padEnd(25)} `
      + `${STATUS_ICONS[wf.status]} ${wf.status.padEnd(8)} `
      + `${progress}`,
    )
  }

  console.log(ansis.bold.cyan('━'.repeat(80)))
  console.log(ansis.dim(`  Total: ${workflows.length} workflows`))
  console.log('')
}

// ============================================================================
// Interactive Menu
// ============================================================================

/**
 * Main workflow management menu
 */
export async function manageSubagentWorkflows(options: SubagentWorkflowOptions = {}): Promise<void> {
  while (true) {
    await showWorkflowDashboard(options)

    const { action } = await inquirer.prompt<{ action: string }>({
      type: 'list',
      name: 'action',
      message: 'Workflow Management:',
      choices: [
        { name: '🆕 Create new workflow', value: 'create' },
        { name: '📋 List all workflows', value: 'list' },
        { name: '📊 View workflow details', value: 'details' },
        { name: '🎮 Control workflow', value: 'control' },
        { name: '🔙 Back', value: 'back' },
      ],
    })

    switch (action) {
      case 'create':
        await createNewWorkflow(options)
        break
      case 'list':
        await listAllWorkflows(options)
        break
      case 'details':
        await showWorkflowDetails(options)
        break
      case 'control':
        await controlWorkflow(options)
        break
      case 'back':
        return
    }

    // Pause before showing menu again
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

/**
 * Main entry point for workflow command
 */
export async function workflow(
  subcommand?: string,
  options: SubagentWorkflowOptions = {},
): Promise<void> {
  switch (subcommand) {
    case 'create':
      await createNewWorkflow(options)
      break
    case 'list':
      await listAllWorkflows(options)
      break
    case 'show':
    case 'details':
      await showWorkflowDetails(options)
      break
    case 'control':
      await controlWorkflow(options)
      break
    case 'dashboard':
      await showWorkflowDashboard(options)
      break
    default:
      await manageSubagentWorkflows(options)
  }
}
