/**
 * Agent Teams CLI Command
 *
 * Exposes the BrainOrchestrator to CLI for multi-agent task execution.
 * Provides workflow presets and progress tracking via ConvoyManager.
 *
 * Commands:
 * - agents run --task <task>     - Execute a task with agent teams
 * - agents status                - Show active convoys and agent status
 * - agents list                  - List available workflow presets
 * - agents cancel <id>           - Cancel a running convoy
 *
 * @module commands/agents
 */

import type { Task } from '../brain/orchestrator-types'
import ansis from 'ansis'
import ora from 'ora'
import { nanoid } from 'nanoid'
import { BrainOrchestrator } from '../brain/orchestrator'
import { getGlobalConvoyManager } from '../brain/convoy/convoy-manager'

// ============================================================================
// Command Options
// ============================================================================

export interface AgentsCommandOptions {
  task?: string
  workflow?: string
  verbose?: boolean
  json?: boolean
}

// ============================================================================
// Workflow Presets
// ============================================================================

interface WorkflowPreset {
  id: string
  name: string
  description: string
  taskTemplate: (input: string) => Task
}

const WORKFLOW_PRESETS: WorkflowPreset[] = [
  {
    id: 'analyze',
    name: 'Code Analysis',
    description: 'Analyze codebase structure, dependencies, and quality',
    taskTemplate: (input: string) => ({
      id: nanoid(),
      name: 'Analyze Codebase',
      description: input || 'Analyze the codebase for structure, dependencies, and quality issues',
      type: 'analysis',
      priority: 'normal',
      status: 'pending',
      requiredCapabilities: [
        {
          id: 'code-analysis',
          name: 'Code Analysis',
          model: 'sonnet',
          specialties: ['static-analysis', 'dependency-analysis'],
          strength: 0.9,
          costFactor: 1.0,
        },
      ],
      input: {
        parameters: { task: input },
        instructions: input,
      },
      dependencies: [],
      maxRetries: 3,
      retryCount: 0,
      metadata: {
        tags: ['analysis', 'code-quality'],
      },
      createdAt: new Date().toISOString(),
      progress: 0,
    }),
  },
  {
    id: 'fix',
    name: 'Bug Fix',
    description: 'Identify and fix bugs in the codebase',
    taskTemplate: (input: string) => ({
      id: nanoid(),
      name: 'Fix Bugs',
      description: input || 'Identify and fix bugs in the codebase',
      type: 'bug-fix',
      priority: 'high',
      status: 'pending',
      requiredCapabilities: [
        {
          id: 'debugging',
          name: 'Debugging',
          model: 'sonnet',
          specialties: ['bug-detection', 'code-repair'],
          strength: 0.85,
          costFactor: 1.2,
        },
      ],
      input: {
        parameters: { task: input },
        instructions: input,
      },
      dependencies: [],
      maxRetries: 3,
      retryCount: 0,
      metadata: {
        tags: ['bug-fix', 'debugging'],
      },
      createdAt: new Date().toISOString(),
      progress: 0,
    }),
  },
  {
    id: 'test',
    name: 'Test Generation',
    description: 'Generate comprehensive test suites',
    taskTemplate: (input: string) => ({
      id: nanoid(),
      name: 'Generate Tests',
      description: input || 'Generate comprehensive test suites for the codebase',
      type: 'testing',
      priority: 'normal',
      status: 'pending',
      requiredCapabilities: [
        {
          id: 'test-generation',
          name: 'Test Generation',
          model: 'sonnet',
          specialties: ['unit-testing', 'integration-testing'],
          strength: 0.8,
          costFactor: 1.0,
        },
      ],
      input: {
        parameters: { task: input },
        instructions: input,
      },
      dependencies: [],
      maxRetries: 3,
      retryCount: 0,
      metadata: {
        tags: ['testing', 'quality-assurance'],
      },
      createdAt: new Date().toISOString(),
      progress: 0,
    }),
  },
  {
    id: 'optimize',
    name: 'Code Optimization',
    description: 'Optimize code for performance and efficiency',
    taskTemplate: (input: string) => ({
      id: nanoid(),
      name: 'Optimize Code',
      description: input || 'Optimize code for performance and efficiency',
      type: 'optimization',
      priority: 'normal',
      status: 'pending',
      requiredCapabilities: [
        {
          id: 'optimization',
          name: 'Code Optimization',
          model: 'sonnet',
          specialties: ['performance-tuning', 'refactoring'],
          strength: 0.85,
          costFactor: 1.1,
        },
      ],
      input: {
        parameters: { task: input },
        instructions: input,
      },
      dependencies: [],
      maxRetries: 3,
      retryCount: 0,
      metadata: {
        tags: ['optimization', 'performance'],
      },
      createdAt: new Date().toISOString(),
      progress: 0,
    }),
  },
]

// ============================================================================
// Command Handler
// ============================================================================

/**
 * Handle agents command
 */
export async function handleAgentsCommand(
  args: string[],
  options: AgentsCommandOptions = {},
): Promise<void> {
  const subcommand = args[0]

  switch (subcommand) {
    case 'run':
      await runAgentTeam(options)
      break

    case 'status':
      await showStatus(options)
      break

    case 'list':
      await listWorkflows(options)
      break

    case 'cancel':
      await cancelConvoy(args[1], options)
      break

    default:
      showHelp()
  }
}

// ============================================================================
// Subcommands
// ============================================================================

/**
 * Run agent team on a task
 */
async function runAgentTeam(options: AgentsCommandOptions): Promise<void> {
  if (!options.task) {
    console.log(ansis.red('Error: Please specify a task with --task'))
    console.log(ansis.dim('Example: agents run --task "Analyze the codebase"'))
    return
  }

  // Get workflow preset if specified
  const workflow = options.workflow
    ? WORKFLOW_PRESETS.find(w => w.id === options.workflow)
    : WORKFLOW_PRESETS[0] // Default to analyze

  if (options.workflow && !workflow) {
    console.log(ansis.red(`Error: Unknown workflow: ${options.workflow}`))
    console.log(ansis.dim('Run "agents list" to see available workflows'))
    return
  }

  console.log(ansis.cyan('\n🤖 Starting Agent Team\n'))
  console.log(ansis.bold('Task:'), options.task)
  if (workflow) {
    console.log(ansis.bold('Workflow:'), workflow.name)
  }
  console.log('')

  // Create task from workflow template
  const task = workflow!.taskTemplate(options.task)

  // Initialize convoy manager
  const convoyManager = getGlobalConvoyManager()
  await convoyManager.initialize()

  // Create convoy for tracking
  const convoy = await convoyManager.create(`Agent Team: ${task.name}`, {
    description: task.description,
    createdBy: 'cli',
    notifyOnComplete: true,
    notifyOnFailure: true,
    tags: ['agent-team', workflow?.id || 'custom'],
  })

  // Add task to convoy
  await convoyManager.addTask(convoy.id, task.name, {
    description: task.description,
  })

  // Start convoy
  await convoyManager.start(convoy.id)

  // Initialize orchestrator
  const orchestrator = new BrainOrchestrator({
    maxConcurrentTasks: 10,
    maxConcurrentAgents: 5,
    verboseLogging: options.verbose || false,
    enableParallelExecution: true,
  })

  // Setup progress tracking
  const spinner = ora('Initializing agent team...').start()

  orchestrator.on('plan:created', (plan) => {
    spinner.text = `Created plan with ${plan.tasks.length} tasks`
  })

  orchestrator.on('task:started', (task) => {
    spinner.text = `Executing: ${task.name}`
  })

  orchestrator.on('task:completed', (task) => {
    spinner.succeed(`Completed: ${task.name}`)
    spinner.start()
  })

  orchestrator.on('task:failed', (task, error) => {
    spinner.fail(`Failed: ${task.name} - ${error.message}`)
    spinner.start()
  })

  try {
    // Execute task
    const result = await orchestrator.execute(task)

    spinner.stop()

    // Update convoy
    const convoyTask = convoy.tasks[0]
    if (result.success) {
      await convoyManager.completeTask(convoy.id, convoyTask.id, result)
    }
    else {
      await convoyManager.failTask(
        convoy.id,
        convoyTask.id,
        result.errors[0]?.message || 'Unknown error',
      )
    }

    // Display results
    console.log('')
    if (result.success) {
      console.log(ansis.green('✅ Agent team completed successfully!'))
    }
    else {
      console.log(ansis.red('❌ Agent team failed'))
    }

    console.log('')
    console.log(ansis.bold('Results:'))
    console.log(ansis.dim('─'.repeat(60)))

    if (options.json) {
      console.log(JSON.stringify(result, null, 2))
    }
    else {
      console.log(ansis.dim(`Status: ${result.status}`))
      console.log(ansis.dim(`Tasks Completed: ${result.completedTasks.length}`))
      console.log(ansis.dim(`Tasks Failed: ${result.failedTasks.length}`))
      console.log(ansis.dim(`Duration: ${result.duration}ms`))
      console.log(ansis.dim(`Success Rate: ${(result.metrics.successRate * 100).toFixed(1)}%`))

      if (result.errors.length > 0) {
        console.log('')
        console.log(ansis.bold('Errors:'))
        for (const error of result.errors) {
          console.log(ansis.red(`  • ${error.message}`))
        }
      }

      if (result.warnings.length > 0) {
        console.log('')
        console.log(ansis.bold('Warnings:'))
        for (const warning of result.warnings) {
          console.log(ansis.yellow(`  • ${warning}`))
        }
      }
    }

    console.log(ansis.dim('─'.repeat(60)))
    console.log('')
    console.log(ansis.dim(`Convoy ID: ${convoy.id}`))
    console.log(ansis.dim('Run "agents status" to see all convoys'))
  }
  catch (error) {
    spinner.fail('Agent team execution failed')
    console.log(ansis.red(`\n❌ Error: ${error instanceof Error ? error.message : error}`))

    // Update convoy
    const convoyTask = convoy.tasks[0]
    await convoyManager.failTask(
      convoy.id,
      convoyTask.id,
      error instanceof Error ? error.message : String(error),
    )
  }
}

/**
 * Show status of active convoys
 */
async function showStatus(options: AgentsCommandOptions): Promise<void> {
  const convoyManager = getGlobalConvoyManager()
  await convoyManager.initialize()

  const activeConvoys = convoyManager.getActive()
  const allConvoys = convoyManager.list()

  if (options.json) {
    console.log(JSON.stringify({ active: activeConvoys, all: allConvoys }, null, 2))
    return
  }

  console.log(ansis.cyan('\n🚀 Agent Teams Status\n'))

  if (activeConvoys.length === 0) {
    console.log(ansis.dim('No active convoys'))
  }
  else {
    console.log(ansis.bold('Active Convoys:'))
    console.log('')
    for (const convoy of activeConvoys) {
      console.log(`  ${ansis.bold(convoy.name)} ${ansis.dim('(' + convoy.id + ')')}`)
      console.log(ansis.dim(`    Status: ${convoy.status}`))
      console.log(ansis.dim(`    Progress: ${convoy.progress}%`))
      console.log(ansis.dim(`    Tasks: ${convoy.completedTasks}/${convoy.totalTasks}`))
      console.log('')
    }
  }

  const recentConvoys = allConvoys.slice(0, 5)
  if (recentConvoys.length > 0) {
    console.log(ansis.bold('Recent Convoys:'))
    console.log('')
    for (const convoy of recentConvoys) {
      const statusIcon = convoy.status === 'completed' ? '✅' : convoy.status === 'failed' ? '❌' : '⏸️'
      console.log(`  ${statusIcon} ${ansis.bold(convoy.name)} ${ansis.dim('(' + convoy.id + ')')}`)
      console.log(ansis.dim(`    Status: ${convoy.status}`))
      console.log(ansis.dim(`    Progress: ${convoy.progress}%`))
      console.log(ansis.dim(`    Created: ${new Date(convoy.createdAt).toLocaleString()}`))
      console.log('')
    }
  }

  console.log(ansis.dim(`Total convoys: ${allConvoys.length}`))
}

/**
 * List available workflow presets
 */
async function listWorkflows(options: AgentsCommandOptions): Promise<void> {
  if (options.json) {
    console.log(JSON.stringify(WORKFLOW_PRESETS, null, 2))
    return
  }

  console.log(ansis.cyan('\n📋 Available Workflow Presets\n'))

  for (const workflow of WORKFLOW_PRESETS) {
    console.log(`  ${ansis.bold(workflow.name)} ${ansis.dim('(' + workflow.id + ')')}`)
    console.log(ansis.dim(`    ${workflow.description}`))
    console.log('')
  }

  console.log(ansis.dim('Usage:'))
  console.log(ansis.dim('  agents run --task "Your task" --workflow <id>'))
  console.log('')
  console.log(ansis.dim('Example:'))
  console.log(ansis.dim('  agents run --task "Find performance bottlenecks" --workflow optimize'))
}

/**
 * Cancel a running convoy
 */
async function cancelConvoy(convoyId: string, options: AgentsCommandOptions): Promise<void> {
  if (!convoyId) {
    console.log(ansis.red('Error: Please specify a convoy ID'))
    console.log(ansis.dim('Example: agents cancel cv-abc123'))
    return
  }

  const convoyManager = getGlobalConvoyManager()
  await convoyManager.initialize()

  const convoy = convoyManager.get(convoyId)
  if (!convoy) {
    console.log(ansis.red(`Error: Convoy not found: ${convoyId}`))
    return
  }

  await convoyManager.cancel(convoyId)
  console.log(ansis.green(`✅ Cancelled convoy: ${convoy.name}`))
}

/**
 * Show help
 */
function showHelp(): void {
  console.log(`
${ansis.bold(ansis.cyan('🤖 Agent Teams Command'))}

${ansis.bold('Usage:')}
  agents <command> [options]

${ansis.bold('Commands:')}
  ${ansis.green('run')}              Execute a task with agent teams
  ${ansis.green('status')}           Show active convoys and status
  ${ansis.green('list')}             List available workflow presets
  ${ansis.green('cancel')} <id>      Cancel a running convoy

${ansis.bold('Options:')}
  --task <task>       Task description (required for run)
  --workflow <id>     Workflow preset (analyze, fix, test, optimize)
  --verbose, -v       Enable verbose logging
  --json              Output as JSON

${ansis.bold('Examples:')}
  ${ansis.dim('# Run code analysis')}
  agents run --task "Analyze the codebase for issues"

  ${ansis.dim('# Run with specific workflow')}
  agents run --task "Fix memory leaks" --workflow fix

  ${ansis.dim('# Show status')}
  agents status

  ${ansis.dim('# List workflows')}
  agents list

  ${ansis.dim('# Cancel convoy')}
  agents cancel cv-abc123

${ansis.bold('Workflow Presets:')}
  ${ansis.green('analyze')}    - Code analysis and quality checks
  ${ansis.green('fix')}        - Bug detection and fixing
  ${ansis.green('test')}       - Test generation and coverage
  ${ansis.green('optimize')}   - Performance optimization
`)
}

// ============================================================================
// Export
// ============================================================================

export default handleAgentsCommand
