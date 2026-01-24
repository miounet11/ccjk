/**
 * Task Management Commands
 * 任务管理命令
 *
 * @version 8.0.0
 * @module commands
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { TaskManager } from '../task-manager'
import type { TaskStatus, TaskPriority } from '../task-manager'

/**
 * Register task management commands
 */
export function registerTaskCommands(program: Command): void {
  const taskCmd = program
    .command('task')
    .alias('tasks')
    .description('Task management commands')

  // Create task
  taskCmd
    .command('create <name>')
    .description('Create a new task')
    .option('-d, --description <desc>', 'Task description')
    .option('-p, --priority <priority>', 'Task priority (high|medium|low)', 'medium')
    .option('--depends-on <ids...>', 'Task dependencies (space-separated IDs)')
    .action(async (name: string, options: any) => {
      try {
        const manager = new TaskManager()
        await manager.initialize()

        const task = await manager.createTask({
          name,
          description: options.description,
          priority: options.priority as TaskPriority,
          dependsOn: options.dependsOn || [],
        })

        console.log(chalk.green('✅ Task created successfully:'))
        console.log(chalk.cyan(`   ID: ${task.id}`))
        console.log(chalk.white(`   Name: ${task.name}`))
        console.log(chalk.white(`   Status: ${task.status}`))
        console.log(chalk.white(`   Priority: ${task.priority}`))
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to create task:'), error.message)
        process.exit(1)
      }
    })

  // List tasks
  taskCmd
    .command('list')
    .alias('ls')
    .description('List all tasks')
    .option('-s, --status <status>', 'Filter by status')
    .option('-p, --priority <priority>', 'Filter by priority')
    .option('--limit <n>', 'Limit number of results', '50')
    .action(async (options: any) => {
      try {
        const manager = new TaskManager()
        await manager.initialize()

        const tasks = await manager.listTasks({
          status: options.status as TaskStatus,
          priority: options.priority as TaskPriority,
          limit: parseInt(options.limit),
        })

        if (tasks.length === 0) {
          console.log(chalk.yellow('No tasks found'))
          return
        }

        console.log(chalk.bold(`\n📋 Tasks (${tasks.length}):\n`))

        for (const task of tasks) {
          const statusIcon = getStatusIcon(task.status)
          const priorityColor = getPriorityColor(task.priority)

          console.log(`${statusIcon} ${chalk.cyan(task.id)} ${chalk.white(task.name)}`)
          console.log(`   Status: ${chalk.white(task.status)} | Priority: ${priorityColor(task.priority)}`)

          if (task.dependsOn.length > 0) {
            console.log(`   Depends on: ${task.dependsOn.join(', ')}`)
          }

          if (task.description) {
            console.log(`   ${chalk.gray(task.description)}`)
          }
          console.log()
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to list tasks:'), error.message)
        process.exit(1)
      }
    })

  // Update task
  taskCmd
    .command('update <id>')
    .description('Update a task')
    .option('-s, --status <status>', 'Update status')
    .option('-p, --priority <priority>', 'Update priority')
    .option('-n, --name <name>', 'Update name')
    .option('-d, --description <desc>', 'Update description')
    .action(async (id: string, options: any) => {
      try {
        const manager = new TaskManager()
        await manager.initialize()

        const updates: any = {}
        if (options.status) updates.status = options.status
        if (options.priority) updates.priority = options.priority
        if (options.name) updates.name = options.name
        if (options.description) updates.description = options.description

        const task = await manager.updateTask(id, updates)

        if (!task) {
          console.error(chalk.red(`❌ Task not found: ${id}`))
          process.exit(1)
        }

        console.log(chalk.green('✅ Task updated successfully:'))
        console.log(chalk.cyan(`   ID: ${task.id}`))
        console.log(chalk.white(`   Name: ${task.name}`))
        console.log(chalk.white(`   Status: ${task.status}`))
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to update task:'), error.message)
        process.exit(1)
      }
    })

  // Delete task
  taskCmd
    .command('delete <id>')
    .alias('rm')
    .description('Delete a task')
    .action(async (id: string) => {
      try {
        const manager = new TaskManager()
        await manager.initialize()

        const deleted = await manager.deleteTask(id)

        if (!deleted) {
          console.error(chalk.red(`❌ Task not found: ${id}`))
          process.exit(1)
        }

        console.log(chalk.green(`✅ Task deleted: ${id}`))
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to delete task:'), error.message)
        process.exit(1)
      }
    })

  // Show dependency graph
  taskCmd
    .command('graph')
    .description('Show task dependency graph')
    .action(async () => {
      try {
        const manager = new TaskManager()
        await manager.initialize()

        const graph = await manager.getDependencyGraph()

        console.log(chalk.bold('\n📊 Task Dependency Graph:\n'))

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
          console.log(chalk.gray(`Level ${level}:`))

          for (const node of nodes) {
            const statusIcon = getStatusIcon(node.status)
            console.log(`  ${statusIcon} ${chalk.cyan(node.id)} ${chalk.white(node.name)}`)

            if (node.dependencies.length > 0) {
              console.log(`     ↑ depends on: ${node.dependencies.join(', ')}`)
            }
          }
          console.log()
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to generate graph:'), error.message)
        process.exit(1)
      }
    })

  // Show statistics
  taskCmd
    .command('stats')
    .description('Show task statistics')
    .action(async () => {
      try {
        const manager = new TaskManager()
        await manager.initialize()

        const stats = await manager.getStats()

        console.log(chalk.bold('\n📈 Task Statistics:\n'))
        console.log(chalk.white(`Total tasks: ${stats.total}`))
        console.log(chalk.white(`Completion rate: ${stats.completionRate}%`))

        if (stats.averageDuration) {
          const avgMinutes = Math.round(stats.averageDuration / 60000)
          console.log(chalk.white(`Average duration: ${avgMinutes} minutes`))
        }

        console.log(chalk.bold('\nBy Status:'))
        for (const [status, count] of Object.entries(stats.byStatus)) {
          console.log(`  ${getStatusIcon(status as TaskStatus)} ${status}: ${count}`)
        }

        console.log(chalk.bold('\nBy Priority:'))
        for (const [priority, count] of Object.entries(stats.byPriority)) {
          const color = getPriorityColor(priority as TaskPriority)
          console.log(`  ${color(priority)}: ${count}`)
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to get statistics:'), error.message)
        process.exit(1)
      }
    })

  // Get schedule
  taskCmd
    .command('schedule')
    .description('Show task execution schedule')
    .action(async () => {
      try {
        const manager = new TaskManager()
        await manager.initialize()

        const schedule = await manager.getSchedule()

        console.log(chalk.bold('\n🗓️  Task Schedule:\n'))

        console.log(chalk.bold('Execution Order:'))
        for (let i = 0; i < schedule.order.length; i++) {
          const task = schedule.order[i]
          console.log(`  ${i + 1}. ${chalk.cyan(task.id)} ${chalk.white(task.name)}`)
        }

        console.log(chalk.bold('\nParallel Groups:'))
        for (let i = 0; i < schedule.parallelGroups.length; i++) {
          const group = schedule.parallelGroups[i]
          console.log(chalk.gray(`  Group ${i + 1}:`))
          for (const task of group) {
            console.log(`    • ${chalk.cyan(task.id)} ${chalk.white(task.name)}`)
          }
        }

        if (schedule.blocked.length > 0) {
          console.log(chalk.bold('\n⏸️  Blocked Tasks:'))
          for (const task of schedule.blocked) {
            console.log(`  • ${chalk.cyan(task.id)} ${chalk.white(task.name)}`)
            console.log(`    Waiting for: ${task.dependsOn.join(', ')}`)
          }
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to get schedule:'), error.message)
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
      return chalk.red
    case 'medium':
      return chalk.yellow
    case 'low':
      return chalk.blue
    default:
      return chalk.white
  }
}
