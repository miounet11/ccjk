/**
 * History Commands
 * 历史管理命令
 *
 * @version 8.0.0
 * @module commands
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { HistoryManager } from '../history'
import type { HistoryEntryType } from '../history'

/**
 * Register history commands
 */
export function registerHistoryCommands(program: Command): void {
  const histCmd = program
    .command('history')
    .alias('hist')
    .description('History management commands')

  // List history
  histCmd
    .command('list')
    .alias('ls')
    .description('List command history')
    .option('-t, --type <type>', 'Filter by type (command|prompt|session)')
    .option('-q, --query <query>', 'Search query')
    .option('-l, --limit <n>', 'Limit number of results', '20')
    .action(async (options: any) => {
      try {
        const manager = new HistoryManager()
        await manager.initialize()

        const entries = await manager.search({
          type: options.type as HistoryEntryType,
          query: options.query,
          limit: parseInt(options.limit),
        })

        if (entries.length === 0) {
          console.log(chalk.yellow('No history entries found'))
          return
        }

        console.log(chalk.bold(`\n📜 History (${entries.length}):\n`))

        for (const entry of entries) {
          const icon = getTypeIcon(entry.type)
          const time = new Date(entry.timestamp).toLocaleString()

          console.log(`${icon} ${chalk.gray(time)}`)
          console.log(`   ${chalk.white(entry.content)}`)

          if (entry.sessionId) {
            console.log(`   ${chalk.gray(`Session: ${entry.sessionId}`)}`)
          }
          console.log()
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to list history:'), error.message)
        process.exit(1)
      }
    })

  // Search history
  histCmd
    .command('search <query>')
    .description('Search command history')
    .option('-t, --type <type>', 'Filter by type')
    .option('-l, --limit <n>', 'Limit number of results', '10')
    .action(async (query: string, options: any) => {
      try {
        const manager = new HistoryManager()
        await manager.initialize()

        const entries = await manager.search({
          query,
          type: options.type as HistoryEntryType,
          limit: parseInt(options.limit),
        })

        if (entries.length === 0) {
          console.log(chalk.yellow(`No results found for: ${query}`))
          return
        }

        console.log(chalk.bold(`\n🔍 Search Results (${entries.length}):\n`))

        for (const entry of entries) {
          const icon = getTypeIcon(entry.type)
          const time = new Date(entry.timestamp).toLocaleString()

          console.log(`${icon} ${chalk.gray(time)}`)

          // Highlight query in content
          const highlighted = entry.content.replace(
            new RegExp(query, 'gi'),
            match => chalk.yellow.bold(match)
          )
          console.log(`   ${highlighted}`)
          console.log()
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to search history:'), error.message)
        process.exit(1)
      }
    })

  // Show statistics
  histCmd
    .command('stats')
    .description('Show history statistics')
    .action(async () => {
      try {
        const manager = new HistoryManager()
        await manager.initialize()

        const stats = await manager.getStats()

        console.log(chalk.bold('\n📊 History Statistics:\n'))
        console.log(chalk.white(`Total entries: ${stats.total}`))

        console.log(chalk.bold('\nBy Type:'))
        for (const [type, count] of Object.entries(stats.byType)) {
          const icon = getTypeIcon(type as HistoryEntryType)
          console.log(`  ${icon} ${type}: ${count}`)
        }

        if (stats.mostUsedCommands.length > 0) {
          console.log(chalk.bold('\nMost Used Commands:'))
          for (let i = 0; i < Math.min(10, stats.mostUsedCommands.length); i++) {
            const { command, count } = stats.mostUsedCommands[i]
            console.log(`  ${i + 1}. ${chalk.cyan(command)} ${chalk.gray(`(${count} times)`)}`)
          }
        }

        if (stats.recentSessions.length > 0) {
          console.log(chalk.bold('\nRecent Sessions:'))
          for (const sessionId of stats.recentSessions.slice(0, 5)) {
            console.log(`  • ${chalk.cyan(sessionId)}`)
          }
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to get statistics:'), error.message)
        process.exit(1)
      }
    })

  // Clear history
  histCmd
    .command('clear')
    .description('Clear all history')
    .option('-f, --force', 'Skip confirmation')
    .option('--days <n>', 'Clear entries older than N days')
    .action(async (options: any) => {
      try {
        if (!options.force) {
          console.log(chalk.yellow('⚠️  This will clear your command history.'))
          console.log(chalk.yellow('   Use --force to confirm.'))
          process.exit(0)
        }

        const manager = new HistoryManager()
        await manager.initialize()

        if (options.days) {
          const removed = await manager.clearOld(parseInt(options.days))
          console.log(chalk.green(`✅ Cleared ${removed} old entries`))
        } else {
          await manager.clear()
          console.log(chalk.green('✅ History cleared'))
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to clear history:'), error.message)
        process.exit(1)
      }
    })
}

/**
 * Get type icon
 */
function getTypeIcon(type: HistoryEntryType): string {
  switch (type) {
    case 'command':
      return '⚡'
    case 'prompt':
      return '💬'
    case 'session':
      return '📁'
    default:
      return '❓'
  }
}
