/**
 * Agent Browser Session Manager
 *
 * Manages browser sessions for multi-agent concurrent operations.
 * Each session has isolated cookies, storage, and browser state.
 *
 * @see https://github.com/vercel-labs/agent-browser
 * @module utils/agent-browser/session
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export interface BrowserSession {
  /** Session name/identifier */
  name: string
  /** Whether this is the currently active session */
  isActive: boolean
  /** Whether the session has an open browser */
  isRunning: boolean
}

export interface SessionCreateOptions {
  /** Session name (default: auto-generated) */
  name?: string
  /** Initial URL to open */
  url?: string
  /** Run in headed mode (show browser window) */
  headed?: boolean
  /** HTTP headers to set (JSON string) */
  headers?: Record<string, string>
}

/**
 * List all active browser sessions
 */
export async function listSessions(): Promise<BrowserSession[]> {
  try {
    const { stdout } = await execAsync('agent-browser session list', { timeout: 10000 })
    const sessions: BrowserSession[] = []

    // Parse output format:
    // Active sessions:
    // -> default
    //    agent1
    //    agent2
    const lines = stdout.split('\n').filter(line => line.trim())

    for (const line of lines) {
      if (line.includes('Active sessions:') || line.includes('No active')) {
        continue
      }

      const isActive = line.startsWith('->')
      const name = line.replace('->', '').trim()

      if (name) {
        sessions.push({
          name,
          isActive,
          isRunning: true, // If listed, it's running
        })
      }
    }

    return sessions
  }
  catch {
    return []
  }
}

/**
 * Get the current active session name
 */
export async function getCurrentSession(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('agent-browser session', { timeout: 5000 })
    // Output: "Current session: default" or just the session name
    const match = stdout.match(/(?:Current session:\s*)?(\S+)/)
    return match ? match[1].trim() : null
  }
  catch {
    return null
  }
}

/**
 * Create and start a new browser session
 */
export async function createSession(options: SessionCreateOptions = {}): Promise<{ success: boolean, sessionName: string, error?: string }> {
  const sessionName = options.name || `agent-${Date.now()}`

  try {
    // Build command
    let command = `agent-browser --session ${sessionName}`

    if (options.headed) {
      command += ' --headed'
    }

    if (options.headers) {
      command += ` --headers '${JSON.stringify(options.headers)}'`
    }

    // Open URL or just initialize
    const url = options.url || 'about:blank'
    command += ` open "${url}"`

    await execAsync(command, { timeout: 30000 })

    return { success: true, sessionName }
  }
  catch (error: any) {
    return {
      success: false,
      sessionName,
      error: error.message || 'Failed to create session',
    }
  }
}

/**
 * Close a specific session
 */
export async function closeSession(sessionName: string): Promise<boolean> {
  try {
    await execAsync(`agent-browser --session ${sessionName} close`, { timeout: 10000 })
    return true
  }
  catch {
    return false
  }
}

/**
 * Close all sessions
 */
export async function closeAllSessions(): Promise<{ closed: number, failed: number }> {
  const sessions = await listSessions()
  let closed = 0
  let failed = 0

  for (const session of sessions) {
    const success = await closeSession(session.name)
    if (success) {
      closed++
    }
    else {
      failed++
    }
  }

  return { closed, failed }
}

/**
 * Generate unique session names for multi-agent operations
 */
export function generateSessionNames(count: number, prefix = 'agent'): string[] {
  const timestamp = Date.now()
  return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}-${timestamp}`)
}

/**
 * Execute a command in a specific session
 */
export async function executeInSession(
  sessionName: string,
  command: string,
  options: { timeout?: number, json?: boolean } = {},
): Promise<{ success: boolean, output: string, error?: string }> {
  const timeout = options.timeout || 30000
  const jsonFlag = options.json ? ' --json' : ''

  try {
    const fullCommand = `agent-browser --session ${sessionName}${jsonFlag} ${command}`
    const { stdout, stderr } = await execAsync(fullCommand, { timeout })

    return {
      success: true,
      output: stdout.trim(),
      error: stderr.trim() || undefined,
    }
  }
  catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message || 'Command execution failed',
    }
  }
}

/**
 * Get session status with browser state
 */
export async function getSessionStatus(sessionName: string): Promise<{
  exists: boolean
  currentUrl?: string
  title?: string
}> {
  try {
    const urlResult = await executeInSession(sessionName, 'get url', { timeout: 5000 })
    const titleResult = await executeInSession(sessionName, 'get title', { timeout: 5000 })

    return {
      exists: urlResult.success,
      currentUrl: urlResult.success ? urlResult.output : undefined,
      title: titleResult.success ? titleResult.output : undefined,
    }
  }
  catch {
    return { exists: false }
  }
}
