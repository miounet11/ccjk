/**
 * Unified Session Command
 *
 * Merges session-resume, background, and new session management features
 */

import { existsSync, readdirSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import ansis from 'ansis'
import { join } from 'pathe'
import { getTranslation } from '../../i18n'
import { ensureDir, readJsonFile, writeJsonFile } from '../../utils/fs-operations'

/**
 * Session storage directory
 */
const SESSIONS_DIR = join(homedir(), '.ccjk', 'sessions')

/**
 * Session data structure
 */
export interface Session {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  workingDir: string
  context: {
    files: string[]
    gitBranch?: string
    metadata: Record<string, unknown>
  }
}

/**
 * Generate unique session ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

/**
 * Save current session
 */
export async function saveSession(name?: string): Promise<Session> {
  const t = getTranslation()

  ensureDir(SESSIONS_DIR)

  const session: Session = {
    id: generateId(),
    name: name || `session-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workingDir: process.cwd(),
    context: {
      files: [],
      gitBranch: getCurrentGitBranch(),
      metadata: {
        platform: process.platform,
        nodeVersion: process.version,
        shell: process.env.SHELL,
      },
    },
  }

  const sessionPath = join(SESSIONS_DIR, `${session.id}.json`)
  writeJsonFile(sessionPath, session, true)

  console.log(ansis.green(`\n✓ ${t('session.saved')}: ${ansis.bold(session.name)}`))
  console.log(ansis.dim(`  ID: ${session.id}`))
  console.log(ansis.dim(`  ${t('session.location')}: ${sessionPath}\n`))

  return session
}

/**
 * Restore session
 */
export async function restoreSession(idOrName: string): Promise<void> {
  const t = getTranslation()

  const session = findSession(idOrName)
  if (!session) {
    console.log(ansis.red(`\n✗ ${t('session.notFound')}: ${idOrName}\n`))
    return
  }

  console.log(ansis.green(`\n✓ ${t('session.restoring')}: ${ansis.bold(session.name)}`))
  console.log(ansis.dim(`  ID: ${session.id}`))
  console.log(ansis.dim(`  ${t('session.workingDir')}: ${session.workingDir}`))

  if (session.context.gitBranch) {
    console.log(ansis.dim(`  ${t('session.branch')}: ${session.context.gitBranch}`))
  }

  console.log()

  // Update session access time
  session.updatedAt = new Date().toISOString()
  const sessionPath = join(SESSIONS_DIR, `${session.id}.json`)
  writeJsonFile(sessionPath, session, true)

  // TODO: Implement actual restoration logic
  console.log(ansis.dim(t('session.restoreNote')))
}

/**
 * List all sessions
 */
export async function listSessions(): Promise<void> {
  const t = getTranslation()

  if (!existsSync(SESSIONS_DIR)) {
    console.log(ansis.dim(`\n${t('session.noSessions')}\n`))
    return
  }

  const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'))

  if (files.length === 0) {
    console.log(ansis.dim(`\n${t('session.noSessions')}\n`))
    return
  }

  const sessions: Session[] = []
  for (const file of files) {
    try {
      const session = readJsonFile<Session>(join(SESSIONS_DIR, file))
      sessions.push(session)
    }
    catch {
      // Skip invalid files
    }
  }

  // Sort by updated time (newest first)
  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  console.log(ansis.green.bold(`\n${t('session.savedSessions')} (${sessions.length})\n`))

  for (const session of sessions) {
    const isCurrent = session.workingDir === process.cwd()
    const currentMarker = isCurrent ? ansis.green(' •') : ansis.dim(' •')

    console.log(`${currentMarker} ${ansis.bold(session.name)}`)
    console.log(ansis.dim(`    ID: ${session.id}`))
    console.log(ansis.dim(`    ${t('session.directory')}: ${session.workingDir}`))
    console.log(ansis.dim(`    ${t('session.lastUpdate')}: ${formatDate(session.updatedAt)}`))
    console.log()
  }
}

/**
 * Delete session
 */
export async function deleteSession(idOrName: string): Promise<void> {
  const t = getTranslation()

  const session = findSession(idOrName)
  if (!session) {
    console.log(ansis.red(`\n✗ ${t('session.notFound')}: ${idOrName}\n`))
    return
  }

  const sessionPath = join(SESSIONS_DIR, `${session.id}.json`)

  try {
    unlinkSync(sessionPath)
    console.log(ansis.green(`\n✓ ${t('session.deleted')}: ${ansis.bold(session.name)}\n`))
  }
  catch (error) {
    console.log(ansis.red(`\n✗ ${t('session.deleteFailed')}: ${(error as Error).message}\n`))
  }
}

/**
 * Resume last session
 * @deprecated This function is no longer called directly to avoid conflict with Claude Code's built-in /resume command.
 * Use restoreSession() with interactive picker instead.
 */
export async function resumeLastSession(): Promise<void> {
  const t = getTranslation()

  if (!existsSync(SESSIONS_DIR)) {
    console.log(ansis.dim(`\n${t('session.noSessions')}\n`))
    return
  }

  const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'))

  if (files.length === 0) {
    console.log(ansis.dim(`\n${t('session.noSessions')}\n`))
    return
  }

  let latestSession: Session | null = null
  let latestTime = 0

  for (const file of files) {
    try {
      const session = readJsonFile<Session>(join(SESSIONS_DIR, file))
      const time = new Date(session.updatedAt).getTime()
      if (time > latestTime) {
        latestTime = time
        latestSession = session
      }
    }
    catch {
      // Skip invalid files
    }
  }

  if (latestSession) {
    await restoreSession(latestSession.id)
  }
  else {
    console.log(ansis.dim(`\n${t('session.noSessions')}\n`))
  }
}

/**
 * Find session by ID or name
 */
function findSession(idOrName: string): Session | null {
  if (!existsSync(SESSIONS_DIR))
    return null

  const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'))

  for (const file of files) {
    try {
      const session = readJsonFile<Session>(join(SESSIONS_DIR, file))
      if (session.id === idOrName || session.name === idOrName) {
        return session
      }
    }
    catch {
      // Skip invalid files
    }
  }

  return null
}

/**
 * Get current git branch
 */
function getCurrentGitBranch(): string | undefined {
  try {
    const { execSync } = require('node:child_process')
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  }
  catch {
    return undefined
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1)
    return 'just now'
  if (diffMins < 60)
    return `${diffMins}m ago`
  if (diffHours < 24)
    return `${diffHours}h ago`
  if (diffDays < 7)
    return `${diffDays}d ago`

  return date.toLocaleDateString()
}

/**
 * Main session command handler
 */
export async function handleSessionCommand(args: string[]): Promise<void> {
  const [action, ...rest] = args

  switch (action) {
    case 'save':
      await saveSession(rest[0])
      break
    case 'restore':
      if (!rest[0]) {
        console.log(ansis.red('\n✗ Error: Session ID or name required\n'))
        console.log(ansis.dim('Usage: ccjk session restore <id|name>\n'))
        break
      }
      await restoreSession(rest[0])
      break
    case 'list':
    case 'ls':
      await listSessions()
      break
    case 'delete':
    case 'rm':
      if (!rest[0]) {
        console.log(ansis.red('\n✗ Error: Session ID or name required\n'))
        console.log(ansis.dim('Usage: ccjk session delete <id|name>\n'))
        break
      }
      await deleteSession(rest[0])
      break
    // Note: 'resume' subcommand removed to avoid conflict with Claude Code's built-in /resume command
    // Use 'ccjk session restore' with interactive picker instead
    default:
      showSessionHelp()
  }
}

/**
 * Show session command help
 */
function showSessionHelp(): void {
  console.log(ansis.green.bold('\n💾 Session Commands\n'))
  console.log(ansis.white('  ccjk session save [name]    ') + ansis.dim('Save current session'))
  console.log(ansis.white('  ccjk session restore [id]   ') + ansis.dim('Restore session (interactive picker if no id)'))
  console.log(ansis.white('  ccjk session list          ') + ansis.dim('List all sessions'))
  console.log(ansis.white('  ccjk session delete <id>    ') + ansis.dim('Delete session'))
  console.log()
}
