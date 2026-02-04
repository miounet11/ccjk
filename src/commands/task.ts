/**
 * Task Management Commands
 * 任务管理命令
 *
 * @version 8.0.0
 * @module commands
 */

import type { CAC } from 'cac'
import type { TaskPriority, TaskStatus } from '../task-manager/types'
import ansis from 'ansis'
import { TaskManager } from '../task-manager/task-manager'

/**
 * Register task management commands
 */
export function registerTaskCommands(program: CAC): void {
  const taskCmd = program.command('task', 'Task management commands')
  taskCmd
    .alias('tasks')

  // Create task
  taskCmd
    .command('create <name>', 'Create a new task')
    .option('-d, --description <desc>', 'Task description')
    .option('-p, --priority <priority>', 'Task priority (high|medium|low)')
    .example('task create "Fix bug" -p high')
    .option('--depends-on <ids...>', 'Task dependencies (space-separated IDs)')
    .action(async (name: string, options: any) => {
      try {
        const manager = new TaskManager()

        const task = await manager.createTask({
          name,
          description: options.description,
          priority: (options.priority || 'medium') as TaskPriority,
          dependsOn: options.dependsOn || [],
        })

        console.log(ansis.green('✅ Task created successfully:'))
        console.log(ansis.cyan(`   ID: ${task.id}`))
        console.log(ansis.white(`   Name: ${task.name}`))
        console.log(ansis.white(`   Status: ${task.status}`))
        console.log(ansis.white(`   Priority: ${task.priority}`))
      }
      catch (error: any) {
        console.error(ansis.red('❌ Failed to create task:'), error.message)
        process.exit(1)
      }
    })

  // List tasks
  taskCmd
    .command('list', 'List all tasks')
    .alias('ls')
    .option('-s, --status <status>', 'Filter by status')
    .option('-p, --priority <priority>', 'Filter by priority')
    .option('--limit <n>', 'Limit number of results', { default: '50' })
    .action(async (options: any) => {
      try {
        const manager = new TaskManager()

        const tasks = await manager.listTasks({
          status: options.status as TaskStatus,
          priority: options.priority as TaskPriority,
          limit: Number.parseInt(options.limit),
        })

        if (tasks.length === 0) {
          console.log(ansis.yellow('No tasks found'))
          return
        }

        console.log(ansis.bold(`\n📋 Tasks (${tasks.length}):\n`))

        for (const task of tasks) {
          const statusIcon = getStatusIcon(task.status)
          const priorityColor = getPriorityColor(task.priority)

          console.log(`${statusIcon} ${ansis.cyan(task.id)} ${ansis.white(task.name)}`)
          console.log(`   Status: ${ansis.white(task.status)} | Priority: ${priorityColor(task.priority)}`)

          if (task.dependsOn.length > 0) {
            console.log(`   Depends on: ${task.dependsOn.join(', ')}`)
          }

          if (task.description) {
            console.log(`   ${ansis.gray(task.description)}`)
          }
          console.log()
        }
      }
      catch (error: any) {
        console.error(ansis.red('❌ Failed to list tasks:'), error.message)
        process.exit(1)
      }
    })

  // Update task
  taskCmd
    .command('update <id>', 'Update a task')
    .option('-s, --status <status>', 'Update status')
    .option('-p, --priority <priority>', 'Update priority')
    .option('-n, --name <name>', 'Update name')
    .option('-d, --description <desc>', 'Update description')
    .action(async (id: string, options: any) => {
      try {
        const manager = new TaskManager()

        const updates: any = {}
        if (options.status)
          updates.status = options.status
        if (options.priority)
          updates.priority = options.priority
        if (options.name)
          updates.name = options.name
        if (options.description)
          updates.description = options.description

        const task = await manager.updateTask(id, updates)

        if (!task) {
          console.error(ansis.red(`❌ Task not found: ${id}`))
          process.exit(1)
        }

        console.log(ansis.green('✅ Task updated successfully:'))
        console.log(ansis.cyan(`   ID: ${task.id}`))
        console.log(ansis.white(`   Name: ${task.name}`))
        console.log(ansis.white(`   Status: ${task.status}`))
      }
      catch (error: any) {
        console.error(ansis.red('❌ Failed to update task:'), error.message)
        process.exit(1)
      }
    })

  // Delete task
  taskCmd
    .command('delete <id>', 'Delete a task')
    .alias('rm')
    .action(async (id: string) => {
      try {
        const manager = new TaskManager()

        const deleted = await manager.deleteTask(id)

        if (!deleted) {
          console.error(ansis.red(`❌ Task not found: ${id}`))
          process.exit(1)
        }

        console.log(ansis.green(`✅ Task deleted: ${id}`))
      }
      catch (error: any) {
        console.error(ansis.red('❌ Failed to delete task:'), error.message)
        process.exit(1)
      }
    })

  // Show dependency graph
  taskCmd
    .command('graph [taskId]', 'Show task dependency graph')
    .action(async (taskId?: string) => {
      try {
        const manager = new TaskManager()

        if (!taskId) {
          // Show all tasks
          const tasks = await manager.listTasks()
          console.log(ansis.bold('\n📊 All Tasks:\n'))
          for (const task of tasks) {
            const statusIcon = getStatusIcon(task.status)
            console.log(`  ${statusIcon} ${ansis.cyan(task.id)} ${ansis.white(task.name)}`)
            if (task.dependsOn && task.dependsOn.length > 0) {
              console.log(`     ↑ depends on: ${task.dependsOn.join(', ')}`)
            }
          }
          return
        }

        const result = await manager.getDependencyGraph(taskId)
        const graph = result.nodes

        console.log(ansis.bold('\n📊 Task Dependency Graph:\n'))

        // Group by level
        const levels = new Map<number, typeof graph>()
        for (const node of graph) {
          if (!levels.has(node.level)) {
            levels.set(node.level, [])
          }
          levels.get(node.level)!.push(node)
        }

        const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b)

        for (const level of sortedLevels) {
          const nodes = levels.get(level)!
          console.log(ansis.gray(`Level ${level}:`))

          for (const node of nodes) {
            const statusIcon = getStatusIcon(node.status)
            console.log(`  ${statusIcon} ${ansis.cyan(node.id)} ${ansis.white(node.name)}`)

            if (node.dependencies.length > 0) {
              console.log(`     ↑ depends on: ${node.dependencies.join(', ')}`)
            }
          }
          console.log()
        }
      }
      catch (error: any) {
        console.error(ansis.red('❌ Failed to generate graph:'), error.message)
        process.exit(1)
      }
    })

  // Show statistics
  taskCmd
    .command('stats', 'Show task statistics')
    .action(async () => {
      try {
        const manager = new TaskManager()

        const stats = await manager.getStats()

        console.log(ansis.bold('\n📈 Task Statistics:\n'))
        console.log(ansis.white(`Total tasks: ${stats.total}`))
        console.log(ansis.white(`Completion rate: ${stats.completionRate}%`))

        if (stats.averageDuration) {
          const avgMinutes = Math.round(stats.averageDuration / 60000)
          console.log(ansis.white(`Average duration: ${avgMinutes} minutes`))
        }

        console.log(ansis.bold('\nBy Status:'))
        for (const [status, count] of Object.entries(stats.byStatus)) {
          console.log(`  ${getStatusIcon(status as TaskStatus)} ${status}: ${count}`)
        }

        console.log(ansis.bold('\nBy Priority:'))
        for (const [priority, count] of Object.entries(stats.byPriority)) {
          const color = getPriorityColor(priority as TaskPriority)
          console.log(`  ${color(priority)}: ${count}`)
        }
      }
      catch (error: any) {
        console.error(ansis.red('❌ Failed to get statistics:'), error.message)
        process.exit(1)
      }
    })

  // Get schedule
  taskCmd
    .command('schedule', 'Show task execution schedule')
    .action(async () => {
      try {
        const manager = new TaskManager()

        const schedule = await manager.getSchedule()

        console.log(ansis.bold('\n🗓️  Task Schedule:\n'))

        console.log(ansis.bold('Execution Order:'))
        for (let i = 0; i < schedule.order.length; i++) {
          const task = schedule.order[i]
          console.log(`  ${i + 1}. ${ansis.cyan(task.id)} ${ansis.white(task.name)}`)
        }

        console.log(ansis.bold('\nParallel Groups:'))
        for (let i = 0; i < schedule.parallelGroups.length; i++) {
          const group = schedule.parallelGroups[i]
          console.log(ansis.gray(`  Group ${i + 1}:`))
          for (const task of group) {
            console.log(`    • ${ansis.cyan(task.id)} ${ansis.white(task.name)}`)
          }
        }

        if (schedule.blocked.length > 0) {
          console.log(ansis.bold('\n⏸️  Blocked Tasks:'))
          for (const task of schedule.blocked) {
            console.log(`  • ${ansis.cyan(task.id)} ${ansis.white(task.name)}`)
            console.log(`    Waiting for: ${task.dependsOn.join(', ')}`)
          }
        }
      }
      catch (error: any) {
        console.error(ansis.red('❌ Failed to get schedule:'), error.message)
        process.exit(1)
      }
    })
}

/**
 * Get status icon
 */
function getStatusIcon(status: TaskStatus): string {
  switch (status) {
    case 'pending':
      return '⏳'
    case 'in_progress':
      return '🔄'
    case 'completed':
      return '✅'
    case 'blocked':
      return '🚫'
    case 'cancelled':
      return '❌'
    default:
      return '❓'
  }
}

/**
 * Get priority color
 */
function getPriorityColor(priority: TaskPriority): (text: string) => string {
  switch (priority) {
    case 'high':
      return ansis.red
    case 'medium':
      return ansis.yellow
    case 'low':
      return ansis.blue
    default:
      return ansis.white
  }
}
