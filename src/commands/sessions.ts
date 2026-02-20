/**
 * Sessions Command
 *
 * Manage and restore Brain System sessions.
 *
 * @module commands/sessions
 */

import ansis from 'ansis'
import { taskPersistence } from '../brain/task-persistence'

export interface SessionsOptions {
  list?: boolean
  show?: string
  restore?: string
  cleanup?: boolean
}

/**
 * Sessions command handler
 */
export async function sessionsCommand(options: SessionsOptions = {}): Promise<void> {
  // List all sessions
  if (options.list) {
    const sessions = taskPersistence.listSessions(20)

    if (sessions.length === 0) {
      console.log(ansis.yellow('\n⚠️  No sessions found\n'))
      return
    }

    console.log(ansis.cyan.bold('\n📋 Brain Sessions\n'))

    for (const session of sessions) {
      const date = new Date(session.createdAt).toLocaleString()
      console.log(ansis.white(`  ${session.id}`))
      console.log(ansis.gray(`    Created: ${date}`))
      if (session.metadata.rootTask) {
        console.log(ansis.gray(`    Task: ${session.metadata.rootTask}`))
      }
      console.log()
    }

    return
  }

  // Show session details
  if (options.show) {
    const context = taskPersistence.restoreContext(options.show)

    if (!context) {
      console.log(ansis.red(`\n❌ Session not found: ${options.show}\n`))
      return
    }

    console.log(ansis.cyan.bold(`\n📊 Session: ${context.sessionId}\n`))
    console.log(ansis.white(`Tasks: ${context.tasks.length}`))
    console.log()

    for (const task of context.tasks) {
      const statusIcon = {
        pending: '⏳',
        running: '🔄',
        completed: '✅',
        failed: '❌',
      }[task.status]

      console.log(`  ${statusIcon} ${task.name}`)
      console.log(ansis.gray(`     Status: ${task.status}`))
      console.log(ansis.gray(`     Priority: ${task.priority}`))

      if (task.dependencies.length > 0) {
        console.log(ansis.gray(`     Depends on: ${task.dependencies.join(', ')}`))
      }

      if (task.error) {
        const error = JSON.parse(task.error)
        console.log(ansis.red(`     Error: ${error.message}`))
      }

      console.log()
    }

    return
  }

  // Restore session
  if (options.restore) {
    const context = taskPersistence.restoreContext(options.restore)

    if (!context) {
      console.log(ansis.red(`\n❌ Session not found: ${options.restore}\n`))
      return
    }

    console.log(ansis.cyan.bold(`\n🔄 Restoring session: ${context.sessionId}\n`))

    // Find incomplete tasks
    const incompleteTasks = context.tasks.filter(
      t => t.status === 'pending' || t.status === 'running',
    )

    if (incompleteTasks.length === 0) {
      console.log(ansis.green('✅ All tasks completed, nothing to restore\n'))
      return
    }

    console.log(ansis.yellow(`Found ${incompleteTasks.length} incomplete tasks:\n`))

    for (const task of incompleteTasks) {
      console.log(`  ⏳ ${task.name}`)
    }

    console.log()
    console.log(ansis.gray('💡 To resume execution, use:'))
    console.log(ansis.cyan(`   ccjk brain execute --session ${context.sessionId}`))
    console.log()

    return
  }

  // Cleanup old sessions
  if (options.cleanup) {
    const deleted = taskPersistence.cleanup(7)
    console.log(ansis.green(`\n✅ Cleaned up ${deleted} old records (kept last 7 days)\n`))
    return
  }

  // Default: show help
  console.log(ansis.cyan.bold('\n📋 Brain Sessions Management\n'))
  console.log(ansis.white('Usage:'))
  console.log(ansis.gray('  ccjk sessions --list              # List all sessions'))
  console.log(ansis.gray('  ccjk sessions --show <id>         # Show session details'))
  console.log(ansis.gray('  ccjk sessions --restore <id>      # Restore incomplete session'))
  console.log(ansis.gray('  ccjk sessions --cleanup           # Clean up old sessions'))
  console.log()
}
