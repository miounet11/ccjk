/**
 * /resume Command - Interactive Session Picker
 *
 * Provides an interactive session picker with keyboard shortcuts:
 * - P = Preview session details
 * - R = Rename session
 * - D = Delete session
 * - Enter = Resume session
 */

import type { SupportedLang } from '../constants'
import { homedir } from 'node:os'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { i18n } from '../i18n'
import { getSessionManager } from '../session-manager'

const CLAUDE_DIR = join(homedir(), '.claude')

/**
 * Format session for display
 */
function formatSessionDisplay(session: any, index: number): string {
  const indexStr = String(index + 1).padStart(2, '0')
  const pinned = session.metadata?.pinned ? ansis.yellow('📌') : ' '
  const name = session.name || ansis.gray('(unnamed)')
  const id = ansis.gray.dim(`[${session.id.substring(0, 8)}]`)
  const branch = session.metadata?.branch ? ansis.cyan(`(${session.metadata.branch})`) : ''
  const forked = session.metadata?.forkedFrom ? ansis.dim('⑂') : ''
  const historyCount = session.history.length
  const lastUsed = session.lastUsedAt.toLocaleString()

  return `${pinned} ${ansis.green(indexStr)}. ${name} ${id} ${branch} ${forked}`
}

/**
 * Format session details for preview
 */
function formatSessionDetails(session: any): string {
  const lines: string[] = []

  lines.push(ansis.white.bold(`\n  Session: ${session.name || '(unnamed)'}`))
  lines.push(ansis.gray(`  ${'─'.repeat(40)}`))

  if (session.gitInfo?.branch) {
    lines.push(ansis.white(`  Git Branch: ${ansis.cyan(session.gitInfo.branch)}`))
  }

  if (session.gitInfo?.commitHash) {
    lines.push(ansis.white(`  Commit: ${ansis.gray(session.gitInfo.commitHash.substring(0, 8))}`))
  }

  if (session.provider) {
    lines.push(ansis.white(`  Provider: ${ansis.green(session.provider)}`))
  }

  if (session.model) {
    lines.push(ansis.white(`  Model: ${ansis.gray(session.model)}`))
  }

  if (session.forkedFrom) {
    lines.push(ansis.white(`  Forked from: ${ansis.gray(session.forkedFrom.substring(0, 8))}`))
  }

  if (session.metadata?.tags && session.metadata.tags.length > 0) {
    lines.push(ansis.white(`  Tags: ${ansis.yellow(session.metadata.tags.join(', '))}`))
  }

  lines.push(ansis.white(`  Created: ${ansis.gray(session.createdAt.toLocaleString())}`))
  lines.push(ansis.white(`  Last used: ${ansis.gray(session.lastUsedAt.toLocaleString())}`))
  lines.push(ansis.white(`  History entries: ${ansis.gray(String(session.history.length))}`))

  // Show recent history
  if (session.history.length > 0) {
    lines.push(ansis.white('\n  Recent activity:'))
    const recent = session.history.slice(-3).reverse()
    for (const entry of recent) {
      const role = entry.role === 'user' ? ansis.blue('You') : ansis.green('AI')
      const preview = entry.content.substring(0, 60).replace(/\n/g, ' ')
      lines.push(`    ${role}: ${ansis.gray.dim(preview)}...`)
    }
  }

  lines.push('')

  return lines.join('\n')
}

/**
 * Show session details preview
 */
async function previewSession(session: any): Promise<string> {
  console.log(formatSessionDetails(session))

  const { action } = await inquirer.prompt<{ action: string }>({
    type: 'list',
    name: 'action',
    message: 'Choose action:',
    choices: [
      { name: '← Back to list', value: 'back' },
      { name: 'Resume this session', value: 'resume' },
      { name: 'Rename session', value: 'rename' },
      { name: 'Toggle pin', value: 'pin' },
      { name: 'Delete session', value: 'delete' },
    ],
  })

  return action
}

/**
 * Rename a session
 */
async function renameSessionAction(sessionManager: any, session: any): Promise<boolean> {
  const { newName } = await inquirer.prompt<{ newName: string }>({
    type: 'input',
    name: 'newName',
    message: 'Enter new name:',
    default: session.name || '',
    validate: (input: string) => {
      if (!input.trim()) {
        return 'Name cannot be empty'
      }
      if (input.length > 100) {
        return 'Name must be less than 100 characters'
      }
      return true
    },
  })

  const success = await sessionManager.renameSession(session.id, newName.trim())

  if (success) {
    console.log(ansis.green(`\n✔ Renamed to: ${newName}`))
    session.name = newName.trim()
  }
  else {
    console.log(ansis.red('\n✖ Failed to rename'))
  }

  return success
}

/**
 * Delete a session with confirmation
 */
async function deleteSessionAction(sessionManager: any, session: any): Promise<boolean> {
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message: ansis.red(`Delete session "${session.name || session.id.substring(0, 8)}"?`),
    default: false,
  })

  if (!confirm) {
    return false
  }

  const success = await sessionManager.deleteSession(session.id)

  if (success) {
    console.log(ansis.green('\n✔ Session deleted'))
  }
  else {
    console.log(ansis.red('\n✖ Failed to delete'))
  }

  return success
}

/**
 * Toggle pin on a session
 */
async function togglePinAction(sessionManager: any, session: any): Promise<boolean> {
  const currentPinned = session.metadata?.pinned || false

  // Update session metadata
  session.metadata = session.metadata || {}
  session.metadata.pinned = !currentPinned

  const success = await sessionManager.updateSession(session.id, {
    metadata: session.metadata,
  })

  if (success) {
    console.log(ansis.green(`\n✔ ${!currentPinned ? 'Pinned' : 'Unpinned'} session`))
  }

  return success
}

/**
 * Resume a session (launch with session context)
 */
async function resumeSession(session: any): Promise<void> {
  console.log(ansis.green(`\n✔ Resuming session: ${session.name || session.id.substring(0, 8)}`))
  console.log(ansis.gray('Session context loaded. You can now continue your conversation.\n'))

  // In a real implementation, this would:
  // 1. Write session context to a temp file
  // 2. Launch Claude Code with the session context
  // 3. Or write to ~/.claude/current-session for CLI pickup

  const { writeFile } = await import('node:fs/promises')
  const currentSessionPath = join(CLAUDE_DIR, 'current-session.json')

  await writeFile(currentSessionPath, JSON.stringify({
    id: session.id,
    name: session.name,
    resumedAt: new Date().toISOString(),
  }, null, 2), 'utf-8')

  console.log(ansis.gray('Run: claude'))
}

/**
 * Show interactive session picker
 */
export async function showSessionPicker(options: {
  lang?: SupportedLang
  branch?: string
  filter?: string
}): Promise<void> {
  try {
    // Initialize i18n
    if (options.lang && i18n.language !== options.lang) {
      await i18n.changeLanguage(options.lang)
    }

    const sessionManager = getSessionManager()

    // Get filtered sessions
    let sessions = await sessionManager.listSessions({
      sortBy: 'lastUsedAt',
      order: 'desc',
    })

    // Filter by branch if provided (manual filtering since SessionListOptions doesn't support branch)
    if (options.branch) {
      sessions = sessions.filter(s => s.metadata?.branch === options.branch)
    }

    // Apply text filter if provided
    if (options.filter) {
      const lowerFilter = options.filter.toLowerCase()
      sessions = sessions.filter(s =>
        s.name?.toLowerCase().includes(lowerFilter)
        || s.id.toLowerCase().includes(lowerFilter),
      )
    }

    if (sessions.length === 0) {
      console.log(ansis.yellow('\n📋 No sessions found'))
      console.log(ansis.gray('Start a conversation with Claude Code to create sessions.\n'))
      return
    }

    // Main picker loop
    let selectedIndex = 0
    let activeSession = sessions[selectedIndex]
    let sessionList = [...sessions]

    while (true) {
      console.clear()
      console.log(ansis.green.bold('\n📋 Session Picker\n'))

      // Show filter info if applicable
      if (options.branch) {
        console.log(ansis.cyan(`  Branch: ${options.branch}`))
      }
      if (options.filter) {
        console.log(ansis.gray(`  Filter: ${options.filter}`))
      }

      console.log(ansis.gray(`  ${'─'.repeat(40)}`))
      console.log(ansis.gray('  Keyboard: ↑↓=Navigate, P=Preview, R=Rename, D=Delete, Enter=Resume, Q=Quit'))
      console.log('')

      // Display sessions
      for (let i = 0; i < sessionList.length; i++) {
        const session = sessionList[i]
        const isCurrent = i === selectedIndex
        const marker = isCurrent ? ansis.green('►') : ' '
        const line = formatSessionDisplay(session, i)

        if (isCurrent) {
          console.log(`${marker} ${ansis.white.bold(line.substring(3))}`)
        }
        else {
          console.log(`${marker} ${line.substring(3)}`)
        }
      }

      // Get user input
      const { action } = await inquirer.prompt<{ action: string }>({
        type: 'list',
        name: 'action',
        message: 'Select action:',
        choices: [
          { name: '▲ Previous session', value: 'up' },
          { name: '▼ Next session', value: 'down' },
          { name: '👁 Preview session (P)', value: 'preview' },
          { name: '✏️ Rename session (R)', value: 'rename' },
          { name: '📌 Toggle pin (T)', value: 'pin' },
          { name: '🗑 Delete session (D)', value: 'delete' },
          { name: '✔ Resume session (Enter)', value: 'resume' },
          { name: '✖ Exit (Q)', value: 'exit' },
        ],
        pageSize: 15,
      })

      switch (action) {
        case 'up':
          selectedIndex = (selectedIndex - 1 + sessionList.length) % sessionList.length
          activeSession = sessionList[selectedIndex]
          break

        case 'down':
          selectedIndex = (selectedIndex + 1) % sessionList.length
          activeSession = sessionList[selectedIndex]
          break

        case 'preview':
          const previewAction = await previewSession(activeSession)
          if (previewAction === 'resume') {
            await resumeSession(activeSession)
            return
          }
          else if (previewAction === 'rename') {
            await renameSessionAction(sessionManager, activeSession)
          }
          else if (previewAction === 'pin') {
            await togglePinAction(sessionManager, activeSession)
          }
          else if (previewAction === 'delete') {
            const deleted = await deleteSessionAction(sessionManager, activeSession)
            if (deleted) {
              sessionList = sessionList.filter(s => s.id !== activeSession.id)
              if (selectedIndex >= sessionList.length) {
                selectedIndex = Math.max(0, sessionList.length - 1)
              }
              activeSession = sessionList[selectedIndex] || null
            }
          }
          break

        case 'rename':
          await renameSessionAction(sessionManager, activeSession)
          break

        case 'pin':
          await togglePinAction(sessionManager, activeSession)
          break

        case 'delete':
          const deleted = await deleteSessionAction(sessionManager, activeSession)
          if (deleted) {
            sessionList = sessionList.filter(s => s.id !== activeSession.id)
            if (selectedIndex >= sessionList.length) {
              selectedIndex = Math.max(0, sessionList.length - 1)
            }
            activeSession = sessionList[selectedIndex] || null
          }

          if (sessionList.length === 0) {
            console.log(ansis.yellow('\nNo more sessions'))
            return
          }
          break

        case 'resume':
          await resumeSession(activeSession)
          return

        case 'exit':
          console.log(ansis.gray('\nCancelled'))
          return
      }
    }
  }
  catch (error) {
    if (error instanceof Error && error.message !== 'User force closed the prompt with null') {
      console.error(ansis.red('Error:'), error)
    }
  }
}

/**
 * Quick session picker (returns session ID)
 */
export async function pickSession(options: {
  lang?: SupportedLang
  branch?: string
}): Promise<string | null> {
  try {
    if (options.lang && i18n.language !== options.lang) {
      await i18n.changeLanguage(options.lang)
    }

    const sessionManager = getSessionManager()
    let sessions = await sessionManager.listSessions({
      sortBy: 'lastUsedAt',
      order: 'desc',
      limit: 20,
    })

    // Filter by branch if provided
    if (options.branch) {
      sessions = sessions.filter(s => s.metadata?.branch === options.branch)
    }

    if (sessions.length === 0) {
      return null
    }

    const choices = sessions.map(session => ({
      name: formatSessionDisplay(session, sessions.indexOf(session)),
      value: session.id,
      short: session.name || session.id.substring(0, 8),
    }))

    const { sessionId } = await inquirer.prompt<{ sessionId: string }>({
      type: 'list',
      name: 'sessionId',
      message: 'Select a session:',
      choices,
      pageSize: 15,
    })

    return sessionId
  }
  catch {
    return null
  }
}

/**
 * Resume session by name or ID
 */
export async function resumeSessionByIdentifier(
  identifier: string,
  options: {
    lang?: SupportedLang
  } = {},
): Promise<void> {
  try {
    if (options.lang && i18n.language !== options.lang) {
      await i18n.changeLanguage(options.lang)
    }

    const sessionManager = getSessionManager()
    const session = await sessionManager.loadSession(identifier)

    if (!session) {
      console.log(ansis.red(`\nSession not found: ${identifier}`))
      console.log(ansis.gray('Use "ccjk session restore" to browse available sessions\n'))
      return
    }

    await resumeSession(session)
  }
  catch (error) {
    console.error(ansis.red('Failed to resume session:'), error)
  }
}

/**
 * Show session history
 */
export async function showSessionHistory(
  identifier: string,
  options: {
    lang?: SupportedLang
    limit?: number
  } = {},
): Promise<void> {
  try {
    if (options.lang && i18n.language !== options.lang) {
      await i18n.changeLanguage(options.lang)
    }

    const sessionManager = getSessionManager()
    const session = await sessionManager.loadSession(identifier)

    if (!session) {
      console.log(ansis.red(`\nSession not found: ${identifier}`))
      return
    }

    console.log(ansis.green.bold(`\n📜 Session History: ${session.name || identifier}\n`))
    console.log(ansis.gray(`  ${'─'.repeat(40)}`))
    console.log(ansis.white(`  Total entries: ${session.history.length}`))
    console.log(ansis.white(`  Created: ${session.createdAt.toLocaleString()}`))
    console.log(ansis.white(`  Last used: ${session.lastUsedAt.toLocaleString()}`))
    console.log('')

    if (session.history.length === 0) {
      console.log(ansis.gray('  No history entries\n'))
      return
    }

    const limit = options.limit || session.history.length
    const entries = session.history.slice(-limit)

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const role = entry.role === 'user' ? ansis.blue('You') : entry.role === 'system' ? ansis.yellow('System') : ansis.green('AI')
      const timestamp = entry.timestamp.toLocaleString()
      const tokens = entry.tokens ? ansis.gray(`[${entry.tokens} tokens]`) : ''

      console.log(`\n  ${ansis.gray.dim(`[${i + 1}]`)} ${ansis.gray.dim(timestamp)} ${role} ${tokens}`)
      console.log(`  ${ansis.white(entry.content.substring(0, 200))}${entry.content.length > 200 ? '...' : ''}`)
    }

    console.log('')
  }
  catch (error) {
    console.error(ansis.red('Failed to show session history:'), error)
  }
}

/**
 * List all sessions (simple format)
 */
export async function listSessionsSimple(options: {
  lang?: SupportedLang
  branch?: string
} = {}): Promise<void> {
  try {
    if (options.lang && i18n.language !== options.lang) {
      await i18n.changeLanguage(options.lang)
    }

    const sessionManager = getSessionManager()
    let sessions = await sessionManager.listSessions({
      sortBy: 'lastUsedAt',
      order: 'desc',
    })

    // Filter by branch if provided
    if (options.branch) {
      sessions = sessions.filter(s => s.metadata?.branch === options.branch)
    }

    if (sessions.length === 0) {
      console.log(ansis.yellow('\nNo sessions found\n'))
      return
    }

    console.log(ansis.green.bold('\n📋 Sessions\n'))

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i]
      const num = String(i + 1).padStart(2, '0')
      const name = session.name || ansis.gray('(unnamed)')
      const id = ansis.gray.dim(`[${session.id.substring(0, 8)}]`)
      const branch = session.metadata?.branch ? ansis.cyan(` ${session.metadata.branch}`) : ''
      const lastUsed = session.lastUsedAt.toLocaleString()

      console.log(`  ${ansis.green(num)}. ${name} ${id}${branch}`)
      console.log(`     ${ansis.gray.dim(lastUsed)}`)
    }

    console.log(`\n  ${ansis.gray(`Total: ${sessions.length} session(s)`)}\n`)
  }
  catch (error) {
    console.error(ansis.red('Failed to list sessions:'), error)
  }
}

/**
 * Export session resume command
 */
export async function resumeCommand(args: string[], options: {
  lang?: SupportedLang
}): Promise<void> {
  const identifier = args[0]

  if (identifier) {
    await resumeSessionByIdentifier(identifier, options)
  }
  else {
    await showSessionPicker(options)
  }
}

/**
 * Fork current session
 */
export async function forkSession(
  sourceId: string,
  options: {
    name?: string
    branch?: string
    lang?: SupportedLang
  } = {},
): Promise<void> {
  try {
    if (options.lang && i18n.language !== options.lang) {
      await i18n.changeLanguage(options.lang)
    }

    const sessionManager = getSessionManager()
    const sourceSession = await sessionManager.loadSession(sourceId)

    if (!sourceSession) {
      console.error(ansis.red('Source session not found'))
      return
    }

    // Create a new session based on the source
    const newSession = await sessionManager.createSession(
      options.name || `${sourceSession.name || 'Session'} (fork)`,
      sourceSession.provider,
      sourceSession.apiKey,
      {
        apiUrl: sourceSession.apiUrl,
        model: sourceSession.model,
        codeType: sourceSession.codeType,
        metadata: {
          ...sourceSession.metadata,
          forkedFrom: sourceId,
          parentName: sourceSession.name,
          branch: options.branch || sourceSession.metadata?.branch,
        },
      },
    )

    // Copy history from source session
    newSession.history = [...sourceSession.history]
    await sessionManager.saveSession(newSession)

    if (newSession) {
      console.log(ansis.green(`\n✔ Session forked: ${newSession.name || newSession.id}`))
      if ((newSession.metadata as any)?.gitInfo?.branch) {
        console.log(ansis.gray(`  Branch: ${(newSession.metadata as any).gitInfo.branch}`))
      }
      console.log(ansis.gray(`\nRun: ccjk session restore ${newSession.id}\n`))
    }
    else {
      console.log(ansis.red('\nFailed to fork session\n'))
    }
  }
  catch (error) {
    console.error(ansis.red('Failed to fork session:'), error)
  }
}
