/**
 * /bg Command - Background Task Management
 *
 * Provides CLI interface for background task operations:
 * - /bg <command> - Run command in background
 * - /bg status - Show background task status
 * - /bg list - List all background tasks
 * - /bg cancel <id> - Cancel a background task
 * - /bg output <id> - Get task output
 * - /bg clean - Clean up old tasks
 */

import type { BackgroundTask, TaskOptions, TaskOutput } from '../brain/background-manager'
import type { SupportedLang } from '../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { cancelBackgroundTask, executeBackground, getBackgroundManager } from '../brain/background-manager'
import { i18n } from '../i18n'

/**
 * Format task for display
 */
function formatTask(task: BackgroundTask, index: number): string {
  const indexStr = String(index + 1).padStart(2, '0')
  const statusIcon = {
    pending: ansis.gray('○'),
    running: ansis.yellow('◐'),
    completed: ansis.green('●'),
    failed: ansis.red('●'),
    cancelled: ansis.gray('⊘'),
  }[task.status]

  const type = task.type === 'bash' ? ansis.blue('Bash') : ansis.cyan('Agent')
  const command = task.type === 'bash'
    ? `${task.command} ${task.args?.join(' ') || ''}`
    : task.agentName || 'unknown'

  const progress = task.progress !== undefined
    ? ` ${ansis.gray(`[${task.progress}%]`)}`
    : ''

  const duration = task.startedAt
    ? ` ${ansis.gray.dim(`${Math.round((Date.now() - task.startedAt.getTime()) / 1000)}s`)}`
    : ''

  return `${statusIcon} ${ansis.green(indexStr)}. ${type}: ${command.substring(0, 40)}${progress}${duration}`
}

/**
 * Format task output for display
 */
function formatTaskOutput(output: TaskOutput): string {
  const lines: string[] = []

  if (output.stdout) {
    lines.push(ansis.white.bold('stdout:'))
    lines.push(ansis.gray(output.stdout.substring(0, 500)))
    if (output.stdout.length > 500) {
      lines.push(ansis.gray.dim('...(truncated)'))
    }
  }

  if (output.stderr) {
    lines.push(ansis.white.bold('\nstderr:'))
    lines.push(ansis.red(output.stderr.substring(0, 500)))
    if (output.stderr.length > 500) {
      lines.push(ansis.gray.dim('...(truncated)'))
    }
  }

  if (output.error) {
    lines.push(ansis.white.bold('\nerror:'))
    lines.push(ansis.red(output.error))
  }

  if (output.exitCode !== undefined) {
    lines.push(ansis.white.bold('\nexit code:'))
    lines.push(output.exitCode === 0 ? ansis.green(String(output.exitCode)) : ansis.red(String(output.exitCode)))
  }

  if (output.duration) {
    lines.push(ansis.white.bold('\nduration:'))
    lines.push(ansis.gray(`${output.duration}ms`))
  }

  return lines.join('\n')
}

/**
 * Run a command in background
 */
export async function runBackgroundCommand(
  command: string,
  args: string[],
  options: TaskOptions = {},
): Promise<string> {
  console.log(ansis.green(`\n▶ Running in background: ${command} ${args.join(' ')}`))
  console.log(ansis.gray('Task started. Use "ccjk bg status" to check progress.\n'))

  const taskId = await executeBackground(command, args, {
    ...options,
    silent: false,
  })

  return taskId
}

/**
 * Show background task status
 */
export async function showBackgroundStatus(options: {
  lang?: SupportedLang
  verbose?: boolean
} = {}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  const manager = getBackgroundManager()
  const stats = manager.getStatistics()
  const tasks = manager.getAllTasks()

  console.log(ansis.green.bold('\n📊 Background Task Status\n'))

  console.log(ansis.white('Summary:'))
  console.log(`  Total: ${ansis.yellow(String(stats.total))}`)
  console.log(`  Running: ${ansis.yellow(String(stats.running))}`)
  console.log(`  Completed: ${ansis.green(String(stats.completed))}`)
  console.log(`  Failed: ${ansis.red(String(stats.failed))}`)
  console.log(`  Cancelled: ${ansis.gray(String(stats.cancelled))}`)

  if (stats.running > 0) {
    console.log(ansis.white('\nRunning Tasks:'))
    const runningTasks = tasks.filter(t => t.status === 'running')

    for (const task of runningTasks) {
      const command = task.type === 'bash'
        ? `${task.command} ${task.args?.join(' ') || ''}`
        : task.agentName || 'unknown'

      console.log(`  ${ansis.yellow('▶')} ${command}`)
      console.log(`     ${ansis.gray.dim(`ID: ${task.id}`)}`)

      if (task.progress !== undefined) {
        console.log(`     ${ansis.gray(`Progress: ${task.progress}%`)}`)
      }
    }
  }

  console.log('')
}

/**
 * List all background tasks
 */
export async function listBackgroundTasks(options: {
  lang?: SupportedLang
  status?: string
} = {}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  const manager = getBackgroundManager()
  let tasks = manager.getAllTasks()

  if (options.status) {
    tasks = tasks.filter(t => t.status === options.status)
  }

  if (tasks.length === 0) {
    console.log(ansis.yellow('\nNo background tasks found\n'))
    return
  }

  console.log(ansis.green.bold('\n📋 Background Tasks\n'))

  for (let i = 0; i < tasks.length; i++) {
    console.log(formatTask(tasks[i], i))

    if (tasks[i].metadata?.name) {
      console.log(`     ${ansis.gray.dim(`Name: ${tasks[i].metadata?.name}`)}`)
    }
  }

  console.log(`\n  ${ansis.gray(`Total: ${tasks.length} task(s)`)}`)
  console.log(ansis.gray('\nUse "ccjk bg output <id>" to view task output\n'))
}

/**
 * Cancel a background task
 */
export async function cancelTask(taskId: string, options: {
  lang?: SupportedLang
  force?: boolean
} = {}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  const manager = getBackgroundManager()
  const task = manager.getTask(taskId)

  if (!task) {
    console.log(ansis.red(`\nTask not found: ${taskId}\n`))
    return
  }

  if (task.status !== 'running') {
    console.log(ansis.yellow(`\nTask is not running: ${task.status}\n`))
    return
  }

  if (!options.force) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: `Cancel task "${taskId}"?`,
      default: false,
    })

    if (!confirm) {
      console.log(ansis.yellow('\nCancelled\n'))
      return
    }
  }

  const success = await cancelBackgroundTask(taskId)

  if (success) {
    console.log(ansis.green(`\n✔ Task cancelled: ${taskId}\n`))
  }
  else {
    console.log(ansis.red(`\n✖ Failed to cancel task: ${taskId}\n`))
  }
}

/**
 * Show task output
 */
export async function showTaskOutput(taskId: string, options: {
  lang?: SupportedLang
  full?: boolean
} = {}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  const manager = getBackgroundManager()
  const task = manager.getTask(taskId)

  if (!task) {
    console.log(ansis.red(`\nTask not found: ${taskId}\n`))
    return
  }

  console.log(ansis.green.bold(`\n📤 Task Output: ${taskId}\n`))
  console.log(ansis.gray(`  ${'─'.repeat(40)}`))

  console.log(ansis.white(`  Status: ${task.status}`))
  console.log(ansis.white(`  Type: ${task.type}`))

  if (task.command) {
    console.log(ansis.white(`  Command: ${task.command} ${task.args?.join(' ') || ''}`))
  }

  if (task.agentName) {
    console.log(ansis.white(`  Agent: ${task.agentName}`))
  }

  if (task.startedAt) {
    console.log(ansis.white(`  Started: ${task.startedAt.toLocaleString()}`))
  }

  if (task.completedAt) {
    console.log(ansis.white(`  Completed: ${task.completedAt.toLocaleString()}`))
  }

  if (task.exitCode !== undefined) {
    console.log(ansis.white(`  Exit Code: ${task.exitCode}`))
  }

  console.log('')

  if (task.output) {
    console.log(formatTaskOutput(task.output))
  }
  else if (task.status === 'running') {
    console.log(ansis.yellow('  Task is still running...'))
  }
  else {
    console.log(ansis.gray('  No output available'))
  }

  console.log('')
}

/**
 * Clean up old background tasks
 */
export async function cleanupBackgroundTasks(options: {
  lang?: SupportedLang
  olderThan?: number // Hours
  force?: boolean
} = {}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  const manager = getBackgroundManager()
  const olderThanMs = (options.olderThan || 24) * 60 * 60 * 1000

  if (!options.force) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: `Clean up tasks older than ${options.olderThan || 24} hours?`,
      default: false,
    })

    if (!confirm) {
      console.log(ansis.yellow('\nCancelled\n'))
      return
    }
  }

  const cleaned = manager.cleanup(olderThanMs)

  console.log(ansis.green(`\n✔ Cleaned up ${cleaned} task(s)\n`))
}

/**
 * Interactive background task picker
 */
export async function backgroundTaskPicker(options: {
  lang?: SupportedLang
} = {}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  const manager = getBackgroundManager()
  const tasks = manager.getAllTasks()

  if (tasks.length === 0) {
    console.log(ansis.yellow('\nNo background tasks found\n'))
    return
  }

  const choices = tasks.map(task => ({
    name: formatTask(task, tasks.indexOf(task)),
    value: task.id,
    short: task.id.substring(0, 8),
  }))

  const { taskId } = await inquirer.prompt<{ taskId: string }>({
    type: 'list',
    name: 'taskId',
    message: 'Select a task:',
    choices,
    pageSize: 15,
  })

  const { action } = await inquirer.prompt<{ action: string }>({
    type: 'list',
    name: 'action',
    message: 'Choose action:',
    choices: [
      { name: '📤 View output', value: 'output' },
      { name: '✖ Cancel task', value: 'cancel' },
      { name: '← Back to list', value: 'back' },
    ],
  })

  switch (action) {
    case 'output':
      await showTaskOutput(taskId, { lang: options.lang })
      break
    case 'cancel':
      await cancelTask(taskId, { lang: options.lang, force: true })
      break
  }
}

/**
 * /bg command handler
 */
export async function bgCommand(args: string[], options: {
  lang?: SupportedLang
}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  const action = args[0] || 'help'

  switch (action) {
    case 'status': {
      await showBackgroundStatus(options)
      break
    }

    case 'list': {
      await listBackgroundTasks(options)
      break
    }

    case 'cancel': {
      const taskId = args[1]
      if (!taskId) {
        console.log(ansis.red('\nUsage: ccjk bg cancel <task-id>\n'))
        return
      }
      await cancelTask(taskId, options)
      break
    }

    case 'output': {
      const taskId = args[1]
      if (!taskId) {
        console.log(ansis.red('\nUsage: ccjk bg output <task-id>\n'))
        return
      }
      await showTaskOutput(taskId, options)
      break
    }

    case 'clean': {
      await cleanupBackgroundTasks(options)
      break
    }

    case 'picker': {
      await backgroundTaskPicker(options)
      break
    }

    case 'run': {
      const command = args[1]
      if (!command) {
        console.log(ansis.red('\nUsage: ccjk bg run <command> [args...]\n'))
        return
      }
      await runBackgroundCommand(command, args.slice(2))
      break
    }

    case 'help': {
      console.log(ansis.green.bold('\n📋 Background Task Commands\n'))
      console.log(ansis.white('  ccjk bg status              - Show task status'))
      console.log(ansis.white('  ccjk bg list                - List all tasks'))
      console.log(ansis.white('  ccjk bg cancel <id>         - Cancel a task'))
      console.log(ansis.white('  ccjk bg output <id>         - Show task output'))
      console.log(ansis.white('  ccjk bg clean               - Clean up old tasks'))
      console.log(ansis.white('  ccjk bg picker              - Interactive task picker'))
      console.log(ansis.white('  ccjk bg run <cmd> [args...] - Run command in background'))
      console.log(ansis.white('  ccjk bg <cmd> [args...]      - Shortcut for run'))
      console.log('')
      break
    }

    default: {
      // Treat as command to run
      await runBackgroundCommand(action, args.slice(1))
    }
  }
}

/**
 * Enhanced /tasks command with background support
 */
export async function showTasksMenu(options: {
  lang?: SupportedLang
} = {}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  const manager = getBackgroundManager()
  const stats = manager.getStatistics()

  console.log(ansis.green.bold('\n📋 Tasks & Background Jobs\n'))

  console.log(ansis.white('Background Tasks:'))
  console.log(`  Running: ${ansis.yellow(String(stats.running))}`)
  console.log(`  Completed: ${ansis.green(String(stats.completed))}`)
  console.log(`  Failed: ${ansis.red(String(stats.failed))}`)

  console.log('')
  console.log(ansis.white('Actions:'))
  console.log(`  ${ansis.green('1.')} List all tasks`)
  console.log(`  ${ansis.green('2.')} Show status`)
  console.log(`  ${ansis.green('3.')} Interactive picker`)
  console.log(`  ${ansis.green('4.')} Clean up old tasks`)
  console.log(`  ${ansis.green('0.')} Back`)

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: 'Select action:',
    validate: input => ['0', '1', '2', '3', '4'].includes(input) || 'Invalid choice',
  })

  switch (choice) {
    case '1':
      await listBackgroundTasks(options)
      break
    case '2':
      await showBackgroundStatus(options)
      break
    case '3':
      await backgroundTaskPicker(options)
      break
    case '4':
      await cleanupBackgroundTasks(options)
      break
  }
}

/**
 * Execute parallel bash + agent commands
 */
export async function executeParallelTasks(
  bashCmd?: { command: string, args: string[] },
  agentCall?: { agentName: string, input: unknown },
  options: TaskOptions = {},
): Promise<void> {
  const manager = getBackgroundManager()

  console.log(ansis.green('\n▶ Running parallel tasks...'))

  const results = await manager.executeParallel(bashCmd, agentCall, options)

  console.log(ansis.green('\n✔ Parallel tasks completed\n'))

  if (results.bashResult) {
    console.log(ansis.white('Bash Result:'))
    if (results.bashResult.stdout) {
      console.log(ansis.gray(results.bashResult.stdout.substring(0, 500)))
    }
    if (results.bashResult.stderr) {
      console.log(ansis.red(results.bashResult.stderr.substring(0, 500)))
    }
  }

  if (results.agentResult) {
    console.log(ansis.white('Agent Result:'))
    console.log(ansis.gray(JSON.stringify(results.agentResult, null, 2).substring(0, 500)))
  }
}
