/**
 * History Commands
 * 历史管理命令
 *
 * @version 8.0.0
 * @module commands
 */

import type { HistoryEntryType } from '../history'
import ansis from 'ansis'
import { HistoryManager } from '../history'

export interface HistoryOptions {
  type?: string
  query?: string
  limit?: string
  force?: boolean
  days?: string
}

/**
 * List history entries
 */
export async function listHistory(options: HistoryOptions = {}): Promise<void> {
  try {
    const manager = new HistoryManager()
    await manager.initialize()

    const entries = await manager.search({
      type: options.type as HistoryEntryType,
      query: options.query,
      limit: options.limit ? Number.parseInt(options.limit) : 20,
    })

    if (entries.length === 0) {
      console.log(ansis.yellow('No history entries found'))
      return
    }

    console.log(ansis.bold(`\n📜 History (${entries.length}):\n`))

    for (const entry of entries) {
      const icon = getTypeIcon(entry.type)
      const time = new Date(entry.timestamp).toLocaleString()

      console.log(`${icon} ${ansis.gray(time)}`)
      console.log(`   ${ansis.white(entry.content)}`)

      if (entry.sessionId) {
        console.log(`   ${ansis.gray(`Session: ${entry.sessionId}`)}`)
      }
      console.log()
    }
  }
  catch (error: any) {
    console.error(ansis.red('❌ Failed to list history:'), error.message)
    process.exit(1)
  }
}

/**
 * Search history entries
 */
export async function searchHistory(query: string, options: HistoryOptions = {}): Promise<void> {
  try {
    const manager = new HistoryManager()
    await manager.initialize()

    const entries = await manager.search({
      query,
      type: options.type as HistoryEntryType,
      limit: options.limit ? Number.parseInt(options.limit) : 10,
    })

    if (entries.length === 0) {
      console.log(ansis.yellow(`No results found for: ${query}`))
      return
    }

    console.log(ansis.bold(`\n🔍 Search Results (${entries.length}):\n`))

    for (const entry of entries) {
      const icon = getTypeIcon(entry.type)
      const time = new Date(entry.timestamp).toLocaleString()

      console.log(`${icon} ${ansis.gray(time)}`)

      // Highlight query in content
      const highlighted = entry.content.replace(
        new RegExp(query, 'gi'),
        match => ansis.yellow.bold(match),
      )
      console.log(`   ${highlighted}`)
      console.log()
    }
  }
  catch (error: any) {
    console.error(ansis.red('❌ Failed to search history:'), error.message)
    process.exit(1)
  }
}

/**
 * Show history statistics
 */
export async function historyStats(): Promise<void> {
  try {
    const manager = new HistoryManager()
    await manager.initialize()

    const stats = await manager.getStats()

    console.log(ansis.bold('\n📊 History Statistics:\n'))
    console.log(ansis.white(`Total entries: ${stats.total}`))

    console.log(ansis.bold('\nBy Type:'))
    for (const [type, count] of Object.entries(stats.byType)) {
      const icon = getTypeIcon(type as HistoryEntryType)
      console.log(`  ${icon} ${type}: ${count}`)
    }

    if (stats.mostUsedCommands.length > 0) {
      console.log(ansis.bold('\nMost Used Commands:'))
      for (let i = 0; i < Math.min(10, stats.mostUsedCommands.length); i++) {
        const { command, count } = stats.mostUsedCommands[i]
        console.log(`  ${i + 1}. ${ansis.cyan(command)} ${ansis.gray(`(${count} times)`)}`)
      }
    }

    if (stats.recentSessions.length > 0) {
      console.log(ansis.bold('\nRecent Sessions:'))
      for (const sessionId of stats.recentSessions.slice(0, 5)) {
        console.log(`  • ${ansis.cyan(sessionId)}`)
      }
    }
  }
  catch (error: any) {
    console.error(ansis.red('❌ Failed to get statistics:'), error.message)
    process.exit(1)
  }
}

/**
 * Clear history
 */
export async function clearHistory(options: HistoryOptions = {}): Promise<void> {
  try {
    if (!options.force) {
      console.log(ansis.yellow('⚠️  This will clear your command history.'))
      console.log(ansis.yellow('   Use --force to confirm.'))
      process.exit(0)
    }

    const manager = new HistoryManager()
    await manager.initialize()

    if (options.days) {
      const removed = await manager.clearOld(Number.parseInt(options.days))
      console.log(ansis.green(`✅ Cleared ${removed} old entries`))
    }
    else {
      await manager.clear()
      console.log(ansis.green('✅ History cleared'))
    }
  }
  catch (error: any) {
    console.error(ansis.red('❌ Failed to clear history:'), error.message)
    process.exit(1)
  }
}

/**
 * Show history help
 */
export function historyHelp(): void {
  console.log('\n📜 History Commands:')
  console.log('  ccjk history list          - List command history')
  console.log('  ccjk history search <q>    - Search history')
  console.log('  ccjk history stats         - Show statistics')
  console.log('  ccjk history clear         - Clear history')
  console.log('\nOptions:')
  console.log('  -t, --type <type>          - Filter by type (command|prompt|session)')
  console.log('  -q, --query <query>        - Search query')
  console.log('  -l, --limit <n>            - Limit results (default: 20)')
  console.log('  -f, --force                - Skip confirmation')
  console.log('  --days <n>                 - Clear entries older than N days\n')
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
