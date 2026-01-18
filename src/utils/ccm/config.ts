import type { CCMSession, CCMSessionsData, CCMStatusDisplay } from './types'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'

/**
 * CCM data directory path
 */
export const CCM_DATA_DIR = join(homedir(), '.claude-monitor')

/**
 * CCM sessions file path
 */
export const CCM_SESSIONS_FILE = join(CCM_DATA_DIR, 'sessions.json')

/**
 * Check if CCM is configured in Claude Code settings
 */
export async function isCCMConfigured(): Promise<boolean> {
  try {
    const settingsPath = join(homedir(), '.claude', 'settings.json')
    if (!existsSync(settingsPath)) {
      return false
    }

    const content = await readFile(settingsPath, 'utf-8')
    const settings = JSON.parse(content)

    // Check if CCM hooks are configured
    const hooks = settings.hooks || {}
    return Object.values(hooks).some((hook: any) =>
      hook?.command?.includes('claude-code-monitor'),
    )
  }
  catch {
    return false
  }
}

/**
 * Get CCM sessions from sessions.json
 */
export async function getCCMSessions(): Promise<CCMSession[]> {
  try {
    if (!existsSync(CCM_SESSIONS_FILE)) {
      return []
    }

    const content = await readFile(CCM_SESSIONS_FILE, 'utf-8')
    const data: CCMSessionsData = JSON.parse(content)

    return data.sessions || []
  }
  catch {
    return []
  }
}

/**
 * Get status display for a session status
 */
export function getStatusDisplay(status: CCMSession['status']): CCMStatusDisplay {
  switch (status) {
    case 'running':
      return {
        symbol: '●',
        label: 'Running',
        color: 'green',
      }
    case 'waiting_input':
      return {
        symbol: '◐',
        label: 'Waiting',
        color: 'yellow',
      }
    case 'stopped':
      return {
        symbol: '✓',
        label: 'Done',
        color: 'gray',
      }
    default:
      return {
        symbol: '?',
        label: 'Unknown',
        color: 'gray',
      }
  }
}

/**
 * Get active sessions count
 */
export async function getActiveSessionsCount(): Promise<number> {
  const sessions = await getCCMSessions()
  return sessions.filter(s => s.status === 'running' || s.status === 'waiting_input').length
}

/**
 * Check if CCM data directory exists
 */
export function ccmDataDirExists(): boolean {
  return existsSync(CCM_DATA_DIR)
}

/**
 * Check if CCM sessions file exists
 */
export function ccmSessionsFileExists(): boolean {
  return existsSync(CCM_SESSIONS_FILE)
}
