import type { CCMAction } from './types'
import { env } from 'node:process'
// CCMSession type imported but not used - removed
import { exec } from 'tinyexec'
import { getTranslation } from '../../i18n'
import { getCCMSessions, getStatusDisplay } from './config'

/**
 * Launch CCM watch mode
 */
export async function launchCCM(): Promise<void> {
  const t = getTranslation()

  console.log(t('ccm.launching'))

  try {
    // Launch in watch mode (this will block until user exits)
    await exec('ccm', ['watch'], { nodeOptions: { stdio: 'inherit' } })
  }
  catch (error) {
    console.error(t('ccm.launchError'), error)
    throw error
  }
}

/**
 * Clear all CCM sessions
 */
export async function clearCCMSessions(): Promise<void> {
  const t = getTranslation()

  console.log(t('ccm.clearingSessions'))

  try {
    await exec('ccm', ['clear'])
    console.log(t('ccm.clearSuccess'))
  }
  catch (error) {
    console.error(t('ccm.clearError'), error)
    throw error
  }
}

/**
 * List CCM sessions
 */
export async function listCCMSessions(): Promise<void> {
  const t = getTranslation()

  try {
    await exec('ccm', ['list'], { nodeOptions: { stdio: 'inherit' } })
  }
  catch (error) {
    console.error(t('ccm.listError'), error)
    throw error
  }
}

/**
 * Show CCM status with formatted output
 */
export async function showCCMStatus(): Promise<void> {
  const t = getTranslation()

  try {
    const sessions = await getCCMSessions()

    if (sessions.length === 0) {
      console.log(t('ccm.noActiveSessions'))
      return
    }

    console.log(t('ccm.statusHeader'))
    console.log('─'.repeat(60))

    for (const session of sessions) {
      const { symbol, label } = getStatusDisplay(session.status)
      const cwd = session.cwd.replace(env.HOME || '', '~')
      console.log(`${symbol} ${label.padEnd(10)} ${cwd}`)
    }

    console.log('─'.repeat(60))
    console.log(t('ccm.totalSessions', { count: sessions.length }))
  }
  catch (error) {
    console.error(t('ccm.statusError'), error)
    throw error
  }
}

/**
 * Execute CCM command
 */
export async function executeCCMCommand(action: CCMAction): Promise<void> {
  switch (action) {
    case 'launch':
    case 'watch':
      await launchCCM()
      break
    case 'setup':
      // Setup is handled by installer.ts
      throw new Error('Use setupCCMHooks from installer.ts')
    case 'clear':
      await clearCCMSessions()
      break
    case 'list':
      await listCCMSessions()
      break
    case 'status':
      await showCCMStatus()
      break
    default:
      throw new Error(`Unknown CCM action: ${action}`)
  }
}

/**
 * Get formatted session list for display
 */
export async function getFormattedSessions(): Promise<string[]> {
  const sessions = await getCCMSessions()

  return sessions.map((session) => {
    const { symbol, label } = getStatusDisplay(session.status)
    const cwd = session.cwd.replace(env.HOME || '', '~')
    return `${symbol} ${label.padEnd(10)} ${cwd}`
  })
}
