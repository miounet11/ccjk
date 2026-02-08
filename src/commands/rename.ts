/**
 * /rename Command - Session Naming Capability
 *
 * Allows users to name the current session for easy reference
 * Integrates with Git branch for automatic naming suggestions
 */

import type { SupportedLang } from '../constants'
import type { Session } from '../session-manager'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { i18n } from '../i18n'
import { getSessionManager } from '../session-manager'

const CLAUDE_DIR = join(homedir(), '.claude')
const _SESSIONS_DIR = join(CLAUDE_DIR, 'sessions')
const CURRENT_SESSION_FILE = join(CLAUDE_DIR, 'current-session.json')

interface CurrentSession {
  id?: string
  name?: string
  startedAt?: string
}

/**
 * Get current session information
 */
async function getCurrentSession(): Promise<CurrentSession | null> {
  try {
    if (!existsSync(CURRENT_SESSION_FILE)) {
      return null
    }

    const content = await readFile(CURRENT_SESSION_FILE, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return null
  }
}

/**
 * Save current session information
 */
async function saveCurrentSession(session: CurrentSession): Promise<void> {
  const { writeFile } = await import('node:fs/promises')
  await writeFile(CURRENT_SESSION_FILE, JSON.stringify(session, null, 2), 'utf-8')
}

/**
 * Get Git branch for naming suggestion
 */
function getGitBranch(): string | null {
  try {
    const { execSync } = require('node:child_process')
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      cwd: process.cwd(),
    }).trim()

    return branch === 'HEAD' ? null : branch
  }
  catch {
    return null
  }
}

/**
 * Get working directory name for naming suggestion
 */
function getWorkingDirName(): string | null {
  try {
    const { dirname } = require('node:path')
    const currentDir = process.cwd()
    return dirname(currentDir).split('/').pop() || null
  }
  catch {
    return null
  }
}

/**
 * Generate name suggestions for the session
 */
function generateNameSuggestions(): string[] {
  const suggestions: string[] = []

  const gitBranch = getGitBranch()
  if (gitBranch && gitBranch !== 'main' && gitBranch !== 'master') {
    suggestions.push(gitBranch)
    suggestions.push(`${gitBranch}-${new Date().toISOString().slice(0, 10)}`)
  }

  const dirName = getWorkingDirName()
  if (dirName) {
    suggestions.push(dirName)
    suggestions.push(`${dirName}-session`)
  }

  suggestions.push(
    `${new Date().toISOString().slice(0, 10)}-session`,
    `session-${Date.now().toString(36)}`,
  )

  return suggestions
}

/**
 * Format session name with timestamp
 */
function _formatSessionName(baseName: string): string {
  const timestamp = new Date().toISOString().slice(0, 10)
  return `${baseName}-${timestamp}`
}

/**
 * Validate session name
 */
function validateSessionName(name: string): string | true {
  const trimmed = name.trim()

  if (trimmed.length === 0) {
    return i18n.t('rename:nameCannotBeEmpty') || 'Session name cannot be empty'
  }

  if (trimmed.length > 100) {
    return i18n.t('rename:nameTooLong') || 'Session name must be less than 100 characters'
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*\\/]/
  if (invalidChars.test(trimmed)) {
    return i18n.t('rename:invalidCharacters') || 'Session name contains invalid characters'
  }

  return true
}

/**
 * Rename the current session
 */
export async function renameCurrentSession(options: {
  name?: string
  lang?: SupportedLang
  force?: boolean
}): Promise<void> {
  try {
    // Initialize i18n
    if (options.lang && i18n.language !== options.lang) {
      await i18n.changeLanguage(options.lang)
    }

    console.log(ansis.green.bold('\n📝 Rename Session\n'))

    // Get current session
    const currentSession = await getCurrentSession()

    if (!currentSession) {
      // Check if there's a session in ~/.claude/sessions
      const sessionManager = getSessionManager()
      const sessions = await sessionManager.listSessions({ limit: 1, sortBy: 'lastUsedAt', order: 'desc' })

      if (sessions.length === 0) {
        console.log(ansis.yellow(i18n.t('rename:noActiveSession') || 'No active session found.'))
        console.log(ansis.gray(i18n.t('rename:startClaudeCode') || 'Start a Claude Code session first.'))
        return
      }

      const recentSession = sessions[0]
      console.log(ansis.gray(i18n.t('rename:usingRecentSession') || `Using most recent session: ${recentSession.id}`))

      const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
        type: 'confirm',
        name: 'confirm',
        message: i18n.t('rename:renameRecentSession') || `Rename this session?`,
        default: true,
      })

      if (!confirm) {
        console.log(ansis.yellow(i18n.t('rename:cancelled') || 'Cancelled'))
        return
      }

      await renameSession(recentSession.id, options)
      return
    }

    await renameSession(currentSession.id!, options)
  }
  catch (error) {
    console.error(ansis.red(i18n.t('rename:error') || 'Failed to rename session:'), error)
  }
}

/**
 * Rename a specific session
 */
async function renameSession(sessionId: string, options: {
  name?: string
  force?: boolean
}): Promise<void> {
  const sessionManager = getSessionManager()
  const session = await sessionManager.loadSession(sessionId)

  if (!session) {
    console.log(ansis.red(i18n.t('rename:sessionNotFound') || `Session not found: ${sessionId}`))
    return
  }

  const currentName = session.name || session.id.substring(0, 8)
  console.log(ansis.white(`${i18n.t('rename:currentName') || 'Current name'}: ${ansis.green(currentName)}`))

  let newName = options.name

  if (!newName) {
    // Generate suggestions
    const suggestions = generateNameSuggestions()

    console.log(ansis.gray(`${i18n.t('rename:suggestions') || 'Suggestions'}:`))
    suggestions.slice(0, 5).forEach((suggestion, index) => {
      console.log(`  ${ansis.green(String(index + 1))}. ${ansis.white(suggestion)}`)
    })

    const { nameChoice } = await inquirer.prompt<{ nameChoice: string }>({
      type: 'input',
      name: 'nameChoice',
      message: i18n.t('rename:enterNewName') || 'Enter new session name (or select suggestion by number):',
      validate: (input: string) => {
        // Check if it's a number (suggestion selection)
        const num = Number.parseInt(input, 10)
        if (!Number.isNaN(num) && num > 0 && num <= suggestions.length) {
          return true
        }
        return validateSessionName(input)
      },
    })

    const num = Number.parseInt(nameChoice, 10)
    if (!Number.isNaN(num) && num > 0 && num <= suggestions.length) {
      newName = suggestions[num - 1]
    }
    else {
      newName = nameChoice.trim()
    }
  }

  if (!newName || newName === currentName) {
    console.log(ansis.yellow(i18n.t('rename:unchanged') || 'Session name unchanged'))
    return
  }

  // Confirm if not forced
  if (!options.force) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: `${i18n.t('rename:confirmRename') || 'Rename to'} ${ansis.green(newName)}?`,
      default: true,
    })

    if (!confirm) {
      console.log(ansis.yellow(i18n.t('rename:cancelled') || 'Cancelled'))
      return
    }
  }

  // Rename the session
  const success = await sessionManager.renameSession(sessionId, newName)

  if (success) {
    // Update current session file if applicable
    const currentSession = await getCurrentSession()
    if (currentSession?.id === sessionId) {
      await saveCurrentSession({
        ...currentSession,
        name: newName,
      })
    }

    console.log(ansis.green(`\n✔ ${i18n.t('rename:renamed') || 'Session renamed'}: ${ansis.green(newName)}`))

    // Show Git branch info if available
    const gitBranch = getGitBranch()
    if (gitBranch) {
      console.log(ansis.gray(`  Git Branch: ${gitBranch}`))
    }
  }
  else {
    console.log(ansis.red(i18n.t('rename:failed') || 'Failed to rename session'))
  }
}

/**
 * List and rename sessions interactively
 */
export async function renameSessionInteractive(options: {
  lang?: SupportedLang
}): Promise<void> {
  try {
    // Initialize i18n
    if (options.lang && i18n.language !== options.lang) {
      await i18n.changeLanguage(options.lang)
    }

    const sessionManager = getSessionManager()
    const sessions = await sessionManager.listSessions({
      sortBy: 'lastUsedAt',
      order: 'desc',
    })

    if (sessions.length === 0) {
      console.log(ansis.yellow(i18n.t('rename:noSessions') || 'No sessions found'))
      return
    }

    // Display sessions for selection
    const choices = sessions.map((session) => {
      const name = session.name || ansis.gray('(unnamed)')
      const id = ansis.gray(`[${session.id.substring(0, 8)}]`)
      const branch = (session.metadata as any)?.gitInfo?.branch ? ansis.dim(`(${(session.metadata as any).gitInfo.branch})`) : ''
      const pinned = session.metadata?.pinned ? ansis.yellow('📌') : ''

      return {
        name: `${pinned} ${name} ${id} ${branch}`,
        value: session.id,
        short: session.name || session.id.substring(0, 8),
      }
    })

    const { sessionId } = await inquirer.prompt<{ sessionId: string }>({
      type: 'list',
      name: 'sessionId',
      message: i18n.t('rename:selectSession') || 'Select session to rename:',
      choices,
      pageSize: 10,
    })

    await renameSession(sessionId, {})
  }
  catch (error) {
    console.error(ansis.red(i18n.t('rename:error') || 'Failed to rename session:'), error)
  }
}

/**
 * Quick rename (for use in Claude Code workflow)
 */
export async function quickRename(name: string): Promise<boolean> {
  try {
    const currentSession = await getCurrentSession()

    if (!currentSession) {
      return false
    }

    const sessionManager = getSessionManager()
    return await sessionManager.renameSession(currentSession.id!, name)
  }
  catch {
    return false
  }
}

/**
 * Set session name for current Claude Code session
 */
export async function setSessionName(name: string): Promise<void> {
  const currentSession = await getCurrentSession()

  const sessionData: CurrentSession = {
    ...currentSession,
    name,
    startedAt: currentSession?.startedAt || new Date().toISOString(),
  }

  await saveCurrentSession(sessionData)

  // Also update in session manager
  const sessionManager = getSessionManager()
  if (currentSession?.id) {
    await sessionManager.renameSession(currentSession.id, name)
  }
}

/**
 * Get current session name
 */
export async function getSessionName(): Promise<string | null> {
  const currentSession = await getCurrentSession()
  return currentSession?.name || null
}

/**
 * Rename command handler (for CLI)
 */
export async function renameCommand(args: string[], options: {
  lang?: SupportedLang
  force?: boolean
}): Promise<void> {
  // If args provided, use as name
  const name = args[0]

  await renameCurrentSession({
    name,
    lang: options.lang,
    force: options.force,
  })
}

/**
 * List all session names
 */
export async function listSessionNames(options: {
  lang?: SupportedLang
  branch?: string
}): Promise<void> {
  try {
    if (options.lang && i18n.language !== options.lang) {
      await i18n.changeLanguage(options.lang)
    }

    const sessionManager = getSessionManager()
    const sessions = await sessionManager.listSessions({
      sortBy: 'lastUsedAt',
      order: 'desc',
    })

    if (sessions.length === 0) {
      console.log(ansis.yellow(i18n.t('rename:noSessions') || 'No sessions found'))
      return
    }

    console.log(ansis.green.bold(`\n📋 ${i18n.t('rename:sessionNames') || 'Session Names'}\n`))

    // Group by branch if available
    const byBranch = new Map<string, Session[]>()
    byBranch.set('no-branch', [])

    for (const session of sessions) {
      const branch = (session.metadata as any)?.gitInfo?.branch || 'no-branch'
      if (!byBranch.has(branch)) {
        byBranch.set(branch, [])
      }
      byBranch.get(branch)!.push(session)
    }

    for (const [branch, branchSessions] of byBranch) {
      if (branchSessions.length === 0) {
        continue
      }

      if (branch !== 'no-branch') {
        console.log(ansis.cyan(`\n  🌿 ${branch}`))
      }

      for (const session of branchSessions) {
        const pinned = session.metadata?.pinned ? ansis.yellow('📌') : ' '
        const name = session.name || ansis.gray('(unnamed)')
        const id = ansis.gray.dim(`[${session.id.substring(0, 8)}]`)
        const accessed = session.lastUsedAt.toLocaleString()

        console.log(`  ${pinned} ${name} ${id}`)
        console.log(`     ${ansis.gray.dim(accessed)}`)
      }
    }

    console.log('')
  }
  catch (error) {
    console.error(ansis.red(i18n.t('rename:error') || 'Failed to list sessions:'), error)
  }
}
