import type { CliOptions } from '../cli-lazy'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { getSessionManager } from '../session-manager'

const SESSIONS_DIR = join(homedir(), '.ccjk', 'sessions')
const CCJK_DIR = join(homedir(), '.ccjk')
const CLAUDE_DIR = join(homedir(), '.claude')

interface SessionMetadata {
  id: string
  timestamp: Date
  description?: string
}

/**
 * Save current session
 */
export async function saveSession(): Promise<void> {
  try {
    const timestamp = new Date().toISOString()
    const sessionId = `session-${Date.now()}`

    // Prompt for description
    const { description } = await inquirer.prompt<{ description: string }>({
      type: 'input',
      name: 'description',
      message: 'Session description (optional):',
    })

    const metadata: SessionMetadata = {
      id: sessionId,
      timestamp: new Date(timestamp),
      description,
    }

    // Ensure sessions directory exists
    if (!existsSync(SESSIONS_DIR)) {
      await mkdir(SESSIONS_DIR, { recursive: true })
    }

    // Save metadata
    const sessionFile = join(SESSIONS_DIR, `${sessionId}.json`)
    await writeFile(sessionFile, JSON.stringify(metadata, null, 2))

    console.log(ansis.green(`✔ Session saved: ${sessionId}`))
    if (description) {
      console.log(ansis.gray(`  ${description}`))
    }
  }
  catch (error) {
    console.error(ansis.red('Failed to save session:'), error)
  }
}

/**
 * List all saved sessions
 */
export async function listSessions(): Promise<void> {
  try {
    const sessionManager = getSessionManager()
    const sessions = await sessionManager.listSessions()

    if (sessions.length === 0) {
      console.log(ansis.yellow('No sessions found'))
      console.log(ansis.gray(`\nCreate a new session with: ${ansis.green('ccjk session create')}`))
      return
    }

    console.log(ansis.green.bold('\n📋 Saved Sessions:\n'))

    // Sort by last accessed (most recent first)
    const sortedSessions = [...sessions].sort((a, b) => {
      const aTime = a.lastUsedAt?.getTime() || a.createdAt.getTime()
      const bTime = b.lastUsedAt?.getTime() || b.createdAt.getTime()
      return bTime - aTime
    })

    for (const session of sortedSessions) {
      const nameDisplay = session.name ? ansis.green(session.name) : ansis.gray('(unnamed)')
      const idDisplay = ansis.gray(`[${session.id.substring(0, 8)}]`)

      console.log(`  ${nameDisplay} ${idDisplay}`)

      if (session.provider) {
        console.log(ansis.gray(`    Provider: ${session.provider}`))
      }

      const createdDate = session.createdAt.toLocaleString()
      console.log(ansis.gray(`    Created: ${createdDate}`))

      if (session.lastUsedAt) {
        const accessedDate = session.lastUsedAt.toLocaleString()
        console.log(ansis.gray(`    Last accessed: ${accessedDate}`))
      }

      if (session.history.length > 0) {
        console.log(ansis.gray(`    History: ${session.history.length} entries`))
      }

      console.log('')
    }

    console.log(ansis.gray(`Total: ${sessions.length} session(s)`))
    console.log(ansis.gray(`\nUse ${ansis.green('ccjk --resume <name|id>')} to resume a session`))
  }
  catch (error) {
    console.error(ansis.red('Failed to list sessions:'), error)
  }
}

/**
 * Restore a session
 */
export async function restoreSession(sessionId?: string): Promise<void> {
  try {
    if (!existsSync(SESSIONS_DIR)) {
      console.log(ansis.yellow('No sessions found'))
      return
    }

    const files = await readdir(SESSIONS_DIR)
    const sessions = files.filter(f => f.endsWith('.json'))

    if (sessions.length === 0) {
      console.log(ansis.yellow('No sessions found'))
      return
    }

    // If no ID provided, prompt user to select
    if (!sessionId) {
      const choices = await Promise.all(
        sessions.map(async (file) => {
          const content = await readFile(join(SESSIONS_DIR, file), 'utf-8')
          const metadata: SessionMetadata = JSON.parse(content)
          const date = new Date(metadata.timestamp).toLocaleString()
          return {
            name: `${metadata.id} - ${date}${metadata.description ? ` - ${metadata.description}` : ''}`,
            value: metadata.id,
          }
        }),
      )

      const { selected } = await inquirer.prompt<{ selected: string }>({
        type: 'list',
        name: 'selected',
        message: 'Select session to restore:',
        choices,
      })

      sessionId = selected
    }

    const sessionFile = join(SESSIONS_DIR, `${sessionId}.json`)
    if (!existsSync(sessionFile)) {
      console.log(ansis.red(`Session not found: ${sessionId}`))
      return
    }

    const content = await readFile(sessionFile, 'utf-8')
    const metadata: SessionMetadata = JSON.parse(content)

    console.log(ansis.green(`✔ Session restored: ${metadata.id}`))
    if (metadata.description) {
      console.log(ansis.gray(`  ${metadata.description}`))
    }
  }
  catch (error) {
    console.error(ansis.red('Failed to restore session:'), error)
  }
}

/**
 * Export session as Markdown
 */
export async function exportSession(sessionId?: string): Promise<void> {
  try {
    if (!existsSync(SESSIONS_DIR)) {
      console.log(ansis.yellow('No sessions found'))
      return
    }

    const files = await readdir(SESSIONS_DIR)
    const sessions = files.filter(f => f.endsWith('.json'))

    if (sessions.length === 0) {
      console.log(ansis.yellow('No sessions found'))
      return
    }

    // If no ID provided, prompt user to select
    if (!sessionId) {
      const choices = await Promise.all(
        sessions.map(async (file) => {
          const content = await readFile(join(SESSIONS_DIR, file), 'utf-8')
          const metadata: SessionMetadata = JSON.parse(content)
          const date = new Date(metadata.timestamp).toLocaleString()
          return {
            name: `${metadata.id} - ${date}${metadata.description ? ` - ${metadata.description}` : ''}`,
            value: metadata.id,
          }
        }),
      )

      const { selected } = await inquirer.prompt<{ selected: string }>({
        type: 'list',
        name: 'selected',
        message: 'Select session to export:',
        choices,
      })

      sessionId = selected
    }

    const sessionFile = join(SESSIONS_DIR, `${sessionId}.json`)
    if (!existsSync(sessionFile)) {
      console.log(ansis.red(`Session not found: ${sessionId}`))
      return
    }

    const content = await readFile(sessionFile, 'utf-8')
    const metadata: SessionMetadata = JSON.parse(content)

    // Generate markdown
    const markdown = `# Session: ${metadata.id}

**Date:** ${new Date(metadata.timestamp).toLocaleString()}
${metadata.description ? `**Description:** ${metadata.description}\n` : ''}
## Details

Session data would be exported here.
`

    const outputFile = join(process.cwd(), `${sessionId}.md`)
    await writeFile(outputFile, markdown)

    console.log(ansis.green(`✔ Session exported: ${outputFile}`))
  }
  catch (error) {
    console.error(ansis.red('Failed to export session:'), error)
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

/**
 * Get directory size recursively
 */
async function getDirSize(dirPath: string): Promise<number> {
  if (!existsSync(dirPath))
    return 0

  let totalSize = 0
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        totalSize += await getDirSize(fullPath)
      }
      else {
        const fileStat = await stat(fullPath)
        totalSize += fileStat.size
      }
    }
  }
  catch {
    // Ignore permission errors
  }
  return totalSize
}

/**
 * Count files in directory recursively
 */
async function countFiles(dirPath: string): Promise<number> {
  if (!existsSync(dirPath))
    return 0

  let count = 0
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        count += await countFiles(fullPath)
      }
      else {
        count++
      }
    }
  }
  catch {
    // Ignore permission errors
  }
  return count
}

interface CleanupTarget {
  name: string
  path: string
  description: string
  size: number
  fileCount: number
  safe: boolean // Whether it's safe to delete without affecting functionality
}

/**
 * Analyze cleanup targets
 */
async function analyzeCleanupTargets(): Promise<CleanupTarget[]> {
  const targets: CleanupTarget[] = []

  // CCJK cache directories
  const ccjkCacheDirs = [
    { name: 'ccjk/cache', path: join(CCJK_DIR, 'cache'), desc: 'General cache files', safe: true },
    { name: 'ccjk/sessions', path: join(CCJK_DIR, 'sessions'), desc: 'Saved session data', safe: true },
    { name: 'ccjk/logs', path: join(CCJK_DIR, 'logs'), desc: 'Log files', safe: true },
    { name: 'ccjk/temp', path: join(CCJK_DIR, 'temp'), desc: 'Temporary files', safe: true },
  ]

  // Claude directories - these are the actual directories that accumulate data
  const claudeDirs = [
    { name: 'claude/projects', path: join(CLAUDE_DIR, 'projects'), desc: 'Claude project caches', safe: true },
    { name: 'claude/debug', path: join(CLAUDE_DIR, 'debug'), desc: 'Debug logs and traces', safe: true },
    { name: 'claude/file-history', path: join(CLAUDE_DIR, 'file-history'), desc: 'File edit history', safe: true },
    { name: 'claude/shell-snapshots', path: join(CLAUDE_DIR, 'shell-snapshots'), desc: 'Shell state snapshots', safe: true },
    { name: 'claude/paste-cache', path: join(CLAUDE_DIR, 'paste-cache'), desc: 'Clipboard paste cache', safe: true },
    { name: 'claude/todos', path: join(CLAUDE_DIR, 'todos'), desc: 'Todo list files', safe: false },
    { name: 'claude/plans', path: join(CLAUDE_DIR, 'plans'), desc: 'Plan files', safe: true },
    { name: 'claude/session-env', path: join(CLAUDE_DIR, 'session-env'), desc: 'Session environment data', safe: true },
    { name: 'claude/ide', path: join(CLAUDE_DIR, 'ide'), desc: 'IDE integration cache', safe: true },
  ]

  for (const dir of [...ccjkCacheDirs, ...claudeDirs]) {
    if (existsSync(dir.path)) {
      const size = await getDirSize(dir.path)
      const fileCount = await countFiles(dir.path)
      if (size > 0) {
        targets.push({
          name: dir.name,
          path: dir.path,
          description: dir.desc,
          size,
          fileCount,
          safe: dir.safe,
        })
      }
    }
  }

  return targets.sort((a, b) => b.size - a.size)
}

/**
 * Clean up session and cache data
 */
export async function cleanupSession(options: { all?: boolean, force?: boolean } = {}): Promise<void> {
  try {
    console.log(ansis.green.bold('\n🧹 Session & Cache Cleanup\n'))

    // Analyze targets
    console.log(ansis.gray('Analyzing cleanup targets...'))
    const targets = await analyzeCleanupTargets()

    if (targets.length === 0) {
      console.log(ansis.green('✔ No cleanup needed - everything is clean!'))
      return
    }

    // Display targets
    console.log(ansis.white.bold('\nCleanup Targets:\n'))
    let totalSize = 0
    let totalFiles = 0

    for (const target of targets) {
      totalSize += target.size
      totalFiles += target.fileCount
      const sizeStr = formatBytes(target.size).padStart(10)
      const filesStr = `${target.fileCount} files`.padStart(12)
      console.log(`  ${ansis.yellow(sizeStr)} ${ansis.gray(filesStr)}  ${ansis.white(target.name)}`)
      console.log(`  ${ansis.gray(`                        ${target.description}`)}`)
      console.log(`  ${ansis.gray(`                        ${target.path}`)}`)
      console.log('')
    }

    console.log(ansis.white.bold('─'.repeat(50)))
    console.log(`  ${ansis.green(formatBytes(totalSize).padStart(10))} ${ansis.gray(`${totalFiles} files`.padStart(12))}  ${ansis.white.bold('Total')}`)
    console.log('')

    // Confirm cleanup
    if (!options.force) {
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
        type: 'confirm',
        name: 'confirm',
        message: options.all
          ? `Delete ALL ${targets.length} targets (${formatBytes(totalSize)})?`
          : 'Select targets to clean?',
        default: false,
      })

      if (!confirm) {
        console.log(ansis.yellow('Cleanup cancelled'))
        return
      }
    }

    // Select targets if not --all
    let selectedTargets = targets
    if (!options.all && !options.force) {
      const { selected } = await inquirer.prompt<{ selected: string[] }>({
        type: 'checkbox',
        name: 'selected',
        message: 'Select targets to clean:',
        choices: targets.map(t => ({
          name: `${t.name} (${formatBytes(t.size)}, ${t.fileCount} files)`,
          value: t.path,
          checked: t.safe,
        })),
      })

      selectedTargets = targets.filter(t => selected.includes(t.path))
    }

    if (selectedTargets.length === 0) {
      console.log(ansis.yellow('No targets selected'))
      return
    }

    // Perform cleanup
    console.log(ansis.gray('\nCleaning up...'))
    let cleanedSize = 0
    let cleanedFiles = 0

    for (const target of selectedTargets) {
      try {
        await rm(target.path, { recursive: true, force: true })
        cleanedSize += target.size
        cleanedFiles += target.fileCount
        console.log(ansis.green(`  ✔ ${target.name}`))
      }
      catch (error) {
        console.log(ansis.red(`  ✖ ${target.name}: ${error}`))
      }
    }

    console.log('')
    console.log(ansis.green.bold(`✔ Cleanup complete!`))
    console.log(ansis.gray(`  Freed ${formatBytes(cleanedSize)} (${cleanedFiles} files)`))
  }
  catch (error) {
    console.error(ansis.red('Failed to cleanup:'), error)
  }
}

/**
 * Show session/cache status
 */
export async function sessionStatus(): Promise<void> {
  try {
    console.log(ansis.green.bold('\n📊 Session & Cache Status\n'))

    const targets = await analyzeCleanupTargets()

    if (targets.length === 0) {
      console.log(ansis.green('✔ All clean - no cached data found'))
      return
    }

    let totalSize = 0
    let totalFiles = 0

    console.log(ansis.white.bold('Directory                Size        Files'))
    console.log(ansis.gray('─'.repeat(50)))

    for (const target of targets) {
      totalSize += target.size
      totalFiles += target.fileCount
      const name = target.name.padEnd(24)
      const size = formatBytes(target.size).padStart(10)
      const files = String(target.fileCount).padStart(8)
      console.log(`${ansis.white(name)} ${ansis.yellow(size)} ${ansis.gray(files)}`)
    }

    console.log(ansis.gray('─'.repeat(50)))
    console.log(`${ansis.white.bold('Total'.padEnd(24))} ${ansis.green.bold(formatBytes(totalSize).padStart(10))} ${ansis.gray(String(totalFiles).padStart(8))}`)
    console.log('')
    console.log(ansis.gray(`Run ${ansis.green('ccjk session cleanup')} to free up space`))

    // Show enhanced session statistics
    const sessionManager = getSessionManager()
    const stats = await sessionManager.getStatistics()

    if (stats.totalSessions > 0) {
      console.log(ansis.green.bold('\n📝 Session Statistics\n'))
      console.log(ansis.white(`Total Sessions: ${ansis.yellow(String(stats.totalSessions))}`))
      console.log(ansis.white(`Total History Entries: ${ansis.yellow(String(stats.totalHistoryEntries))}`))
      if (stats.oldestSession) {
        console.log(ansis.white(`Oldest Session: ${ansis.gray(stats.oldestSession.toLocaleString())}`))
      }
      if (stats.newestSession) {
        console.log(ansis.white(`Newest Session: ${ansis.gray(stats.newestSession.toLocaleString())}`))
      }
      if (stats.mostRecentlyUsed) {
        console.log(ansis.white(`Most Recently Used: ${ansis.gray(stats.mostRecentlyUsed.toLocaleString())}`))
      }
    }
  }
  catch (error) {
    console.error(ansis.red('Failed to get status:'), error)
  }
}

/**
 * Create a new session
 */
export async function createSessionCommand(options: CliOptions): Promise<void> {
  try {
    const sessionManager = getSessionManager()

    // Prompt for session details if not provided
    let name = options.name as string | undefined
    let provider = options.provider as string | undefined
    let apiKey = options.apiKey as string | undefined

    if (!name) {
      const { sessionName } = await inquirer.prompt<{ sessionName: string }>({
        type: 'input',
        name: 'sessionName',
        message: 'Session name (optional):',
      })
      name = sessionName || undefined
    }

    if (!provider) {
      const { providerChoice } = await inquirer.prompt<{ providerChoice: string }>({
        type: 'list',
        name: 'providerChoice',
        message: 'Select API provider:',
        choices: [
          { name: 'Anthropic (Claude)', value: 'anthropic' },
          { name: 'OpenAI', value: 'openai' },
          { name: 'Azure OpenAI', value: 'azure' },
          { name: 'Custom', value: 'custom' },
          { name: 'Skip (use default)', value: '' },
        ],
      })
      provider = providerChoice || undefined
    }

    if (provider && !apiKey) {
      const { key } = await inquirer.prompt<{ key: string }>({
        type: 'password',
        name: 'key',
        message: `Enter API key for ${provider} (optional):`,
        mask: '*',
      })
      apiKey = key || undefined
    }

    const session = await sessionManager.createSession(name, provider, apiKey, {
      codeType: options.codeType as any,
    })

    console.log(ansis.green(`\n✔ Session created successfully!`))
    console.log(ansis.white(`  ID: ${ansis.green(session.id)}`))
    if (session.name) {
      console.log(ansis.white(`  Name: ${ansis.green(session.name)}`))
    }
    if (session.provider) {
      console.log(ansis.white(`  Provider: ${ansis.green(session.provider)}`))
    }
    console.log(ansis.gray(`\nUse ${ansis.green(`ccjk --resume ${session.name || session.id}`)} to resume this session`))
  }
  catch (error) {
    console.error(ansis.red('Failed to create session:'), error)
  }
}

/**
 * Rename a session
 */
export async function renameSessionCommand(sessionId: string, options: CliOptions): Promise<void> {
  try {
    const sessionManager = getSessionManager()

    if (!sessionId) {
      console.log(ansis.red('Please provide a session ID or name'))
      return
    }

    let newName = options.name as string | undefined

    if (!newName) {
      const { name } = await inquirer.prompt<{ name: string }>({
        type: 'input',
        name: 'name',
        message: 'Enter new session name:',
        validate: (input: string) => input.trim().length > 0 || 'Name cannot be empty',
      })
      newName = name
    }

    const success = await sessionManager.renameSession(sessionId, newName!)

    if (success) {
      console.log(ansis.green(`✔ Session renamed to: ${ansis.green(newName!)}`))
    }
    else {
      console.log(ansis.red(`Session not found: ${sessionId}`))
    }
  }
  catch (error) {
    console.error(ansis.red('Failed to rename session:'), error)
  }
}

/**
 * Delete a session
 */
export async function deleteSessionCommand(sessionId: string, options: CliOptions): Promise<void> {
  try {
    const sessionManager = getSessionManager()

    if (!sessionId) {
      console.log(ansis.red('Please provide a session ID or name'))
      return
    }

    // Load session to show details
    const session = await sessionManager.loadSession(sessionId)

    if (!session) {
      console.log(ansis.red(`Session not found: ${sessionId}`))
      return
    }

    // Confirm deletion unless --force
    if (!options.force) {
      console.log(ansis.yellow('\n⚠️  You are about to delete:'))
      console.log(ansis.white(`  ID: ${ansis.green(session.id)}`))
      if (session.name) {
        console.log(ansis.white(`  Name: ${ansis.green(session.name)}`))
      }
      console.log(ansis.white(`  Created: ${ansis.gray(session.createdAt.toLocaleString())}`))
      console.log(ansis.white(`  History entries: ${ansis.gray(String(session.history.length))}`))

      const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to delete this session?',
        default: false,
      })

      if (!confirm) {
        console.log(ansis.yellow('Deletion cancelled'))
        return
      }
    }

    const success = await sessionManager.deleteSession(sessionId)

    if (success) {
      console.log(ansis.green(`✔ Session deleted: ${sessionId}`))
    }
    else {
      console.log(ansis.red(`Failed to delete session: ${sessionId}`))
    }
  }
  catch (error) {
    console.error(ansis.red('Failed to delete session:'), error)
  }
}
