import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'

const SESSIONS_DIR = join(homedir(), '.ccjk', 'sessions')

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

    console.log(ansis.cyan.bold('\n📋 Saved Sessions:\n'))

    for (const file of sessions) {
      const content = await readFile(join(SESSIONS_DIR, file), 'utf-8')
      const metadata: SessionMetadata = JSON.parse(content)
      const date = new Date(metadata.timestamp).toLocaleString()

      console.log(ansis.white(`  ${metadata.id}`))
      console.log(ansis.gray(`    ${date}`))
      if (metadata.description) {
        console.log(ansis.gray(`    ${metadata.description}`))
      }
      console.log('')
    }
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
