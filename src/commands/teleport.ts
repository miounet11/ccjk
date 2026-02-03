/**
 * /teleport Command - Interactive Teleport Interface
 *
 * Provides CLI interface for:
 * - /teleport export - Export current session for sharing
 * - /teleport import <url> - Import session from URL
 * - /teleport list - List shared sessions
 * - /teleport status - Check teleport service status
 * - /teleport qr - Generate QR code for mobile transfer
 */

import type { TeleportOptions } from '../cloud-sync/remote-client'
import type { TeleportSession } from '../cloud-sync/teleport'
import type { SupportedLang } from '../constants'
import type { Session } from '../session-manager'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { createCustomClient, createRemoteClient } from '../cloud-sync/remote-client'
import {
  exportSessionTeleport,
  generateTeleportUrl,
  importSessionTeleport,
  listTeleportTransfers,
  parseTeleportUrl,

} from '../cloud-sync/teleport'
import { i18n } from '../i18n'
import { getSessionManager } from '../session-manager'

/**
 * Display teleport banner
 */
function displayBanner(): void {
  console.log(ansis.cyan.bold('\n🌀 Teleport Remote Session\n'))
}

/**
 * Export current session
 */
export async function exportSession(options: {
  lang?: SupportedLang
  sessionId?: string
  includeHistory?: boolean
  includeContext?: boolean
}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  displayBanner()

  const sessionManager = getSessionManager()

  let session: Session | null = null

  if (options.sessionId) {
    session = await sessionManager.loadSession(options.sessionId)
  }
  else {
    // Get most recent session
    const sessions = await sessionManager.listSessions({
      sortBy: 'lastUsedAt',
      order: 'desc',
      limit: 1,
    })

    session = sessions[0] || null
  }

  if (!session) {
    console.log(ansis.yellow('No session found'))
    console.log(ansis.gray('Create a session first by starting a Claude Code conversation\n'))
    return
  }

  console.log(ansis.white(`Session: ${session.name || session.id.substring(0, 8)}`))
  console.log(ansis.gray(`Messages: ${session.history.length}\n`))

  const exportOptions: TeleportOptions = {
    includeHistory: options.includeHistory ?? true,
    includeContext: options.includeContext ?? true,
  }

  console.log(ansis.gray('Exporting session...'))

  const result = await exportSessionTeleport(session, exportOptions)

  if (result.success) {
    console.log(ansis.green('\n✔ Session exported successfully!\n'))

    if (result.url) {
      console.log(ansis.white('Share URL:'))
      console.log(ansis.cyan(`  ${result.url}\n`))

      console.log(ansis.gray('To import this session on another device:'))
      console.log(ansis.white(`  ccjk teleport import ${result.url}\n`))
    }

    if (result.exported !== undefined) {
      console.log(ansis.gray(`Exported ${result.exported} messages\n`))
    }
  }
  else {
    console.log(ansis.red(`\n✖ Export failed: ${result.message}\n`))
  }
}

/**
 * Import session from URL
 */
export async function importSession(
  url: string,
  options: {
    lang?: SupportedLang
    name?: string
  } = {},
): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  displayBanner()

  console.log(ansis.white(`Importing from: ${url}\n`))
  console.log(ansis.gray('Fetching session data...'))

  const result = await importSessionTeleport(url)

  if (result.success) {
    console.log(ansis.green('\n✔ Session imported successfully!\n'))

    if (result.sessionId) {
      console.log(ansis.white(`Session ID: ${result.sessionId}`))

      // Set name if provided
      if (options.name) {
        const sessionManager = getSessionManager()
        await sessionManager.renameSession(result.sessionId, options.name)
        console.log(ansis.white(`Name: ${options.name}`))
      }

      console.log(ansis.gray('\nUse "ccjk session restore" to continue this session\n'))
    }

    if (result.imported !== undefined) {
      console.log(ansis.gray(`Imported ${result.imported} messages\n`))
    }
  }
  else {
    console.log(ansis.red(`\n✖ Import failed: ${result.message}\n`))
  }
}

/**
 * List shared sessions
 */
export async function listSharedSessions(options: {
  lang?: SupportedLang
  remote?: boolean
}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  displayBanner()

  if (options.remote) {
    await listRemoteSessions(options)
  }
  else {
    await listLocalTransfers(options)
  }
}

/**
 * List local transfer history
 */
async function listLocalTransfers(options: {
  lang?: SupportedLang
}): Promise<void> {
  const transfers = listTeleportTransfers()

  if (transfers.length === 0) {
    console.log(ansis.yellow('No shared sessions found\n'))
    console.log(ansis.gray('Use "ccjk teleport export" to share a session\n'))
    return
  }

  console.log(ansis.green('Local Transfer History\n'))

  for (const transfer of transfers) {
    const statusIcon = {
      pending: ansis.gray('○'),
      in_progress: ansis.yellow('◐'),
      completed: ansis.green('●'),
      failed: ansis.red('●'),
    }[transfer.status]

    const source = transfer.source === 'cli' ? ansis.blue('CLI') : ansis.cyan('Web')
    const direction = transfer.direction === 'export' ? '↑' : '↓'

    console.log(`${statusIcon} ${source} ${direction} ${ansis.white(transfer.name || transfer.sessionId?.substring(0, 8))}`)

    if (transfer.url) {
      console.log(ansis.gray.dim(`  URL: ${transfer.url}`))
    }

    console.log(ansis.gray.dim(`  Created: ${transfer.createdAt.toLocaleString()}`))
    console.log('')
  }
}

/**
 * List remote sessions
 */
async function listRemoteSessions(options: {
  lang?: SupportedLang
}): Promise<void> {
  console.log(ansis.gray('Connecting to remote service...'))

  try {
    const client = createRemoteClient()
    const statusResult = await client.getStatus()

    if (!statusResult.success || !statusResult.data?.connected) {
      console.log(ansis.yellow('\nRemote service unavailable\n'))
      return
    }

    const sessionsResult = await client.listSessions({ limit: 20 })

    if (!sessionsResult.success || !sessionsResult.data) {
      console.log(ansis.yellow('\nFailed to fetch sessions\n'))
      return
    }

    const { sessions, total } = sessionsResult.data

    console.log(ansis.green(`Remote Sessions (${total} total)\n`))

    for (const session of sessions) {
      const age = getSessionAge(session.createdAt)
      console.log(ansis.white(`${session.name || session.sessionId?.substring(0, 8)}`))
      console.log(ansis.gray.dim(`  ID: ${session.transferId}`))
      console.log(ansis.gray.dim(`  Age: ${age}`))
      console.log(ansis.gray.dim(`  URL: ${session.url || '(none)'}`))
      console.log('')
    }
  }
  catch (error) {
    console.log(ansis.red(`\nError: ${(error as Error).message}\n`))
  }
}

/**
 * Get session age display
 */
function getSessionAge(createdAt: string): string {
  const now = Date.now()
  const created = new Date(createdAt).getTime()
  const diffMs = now - created

  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }
  return 'Just now'
}

/**
 * Check teleport service status
 */
export async function checkTeleportStatus(options: {
  lang?: SupportedLang
}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  displayBanner()

  try {
    const client = createRemoteClient()
    const result = await client.getStatus()

    if (result.success && result.data) {
      const { connected, version, deviceId, features } = result.data

      console.log(ansis.green('✔ Teleport Service Status\n'))
      console.log(ansis.white(`  Connected: ${connected ? ansis.green('Yes') : ansis.red('No')}`))
      console.log(ansis.white(`  Version: ${ansis.gray(version)}`))
      console.log(ansis.white(`  Device ID: ${ansis.gray(deviceId)}`))
      console.log(ansis.white(`  Features: ${ansis.gray(features.join(', '))}\n`))
    }
    else {
      console.log(ansis.red('✖ Service unavailable\n'))
      console.log(ansis.gray(`Error: ${result.error}\n`))
    }
  }
  catch (error) {
    console.log(ansis.red('✖ Connection failed\n'))
    console.log(ansis.gray(`Error: ${(error as Error).message}\n`))
  }
}

/**
 * Generate QR code for session
 */
export async function generateQRCode(options: {
  lang?: SupportedLang
  sessionId?: string
}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  displayBanner()

  const sessionManager = getSessionManager()
  let session: Session | null = null

  if (options.sessionId) {
    session = await sessionManager.loadSession(options.sessionId)
  }
  else {
    const sessions = await sessionManager.listSessions({
      sortBy: 'lastUsedAt',
      order: 'desc',
      limit: 1,
    })

    session = sessions[0] || null
  }

  if (!session) {
    console.log(ansis.yellow('No session found\n'))
    return
  }

  // Export session first
  const result = await exportSessionTeleport(session)

  if (!result.success || !result.url) {
    console.log(ansis.red('Failed to generate QR code\n'))
    return
  }

  console.log(ansis.white(`Session: ${session.name || session.id.substring(0, 8)}`))
  console.log(ansis.gray('\nScan this QR code to import on mobile device:\n'))

  // Generate QR code
  try {
    // Try to use qrcode library
    const QRCode = await import('qrcode').catch(() => null)

    if (QRCode) {
      const qr = await QRCode.toString(result.url, { type: 'terminal', width: 60 })
      console.log(qr)
      console.log('')
    }
    else {
      console.log(ansis.yellow('QR code library not available'))
      console.log(ansis.white(`Share URL: ${result.url}\n`))
    }
  }
  catch {
    console.log(ansis.white(`Share URL: ${result.url}\n`))
  }
}

/**
 * Interactive session picker for export
 */
export async function exportPicker(options: {
  lang?: SupportedLang
}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  const sessionManager = getSessionManager()
  const sessions = await sessionManager.listSessions({
    sortBy: 'lastUsedAt',
    order: 'desc',
  })

  if (sessions.length === 0) {
    console.log(ansis.yellow('\nNo sessions found\n'))
    return
  }

  const choices = sessions.map(session => ({
    name: `${session.name || ansis.gray('(unnamed)')} ${ansis.gray.dim(`[${session.history.length} messages]`)}`,
    value: session.id,
    short: session.name || session.id.substring(0, 8),
  }))

  const { sessionId } = await inquirer.prompt<{ sessionId: string }>({
    type: 'list',
    name: 'sessionId',
    message: 'Select session to export:',
    choices,
    pageSize: 15,
  })

  const selectedSession = sessions.find(s => s.id === sessionId)
  if (selectedSession) {
    await exportSession({
      lang: options.lang,
      sessionId,
    })
  }
}

/**
 * Interactive import menu
 */
export async function importPicker(options: {
  lang?: SupportedLang
}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  displayBanner()

  const { method } = await inquirer.prompt<{ method: string }>({
    type: 'list',
    name: 'method',
    message: 'Import method:',
    choices: [
      { name: 'From URL', value: 'url' },
      { name: 'From transfer ID', value: 'id' },
      { name: 'Browse remote sessions', value: 'remote' },
    ],
  })

  switch (method) {
    case 'url': {
      const { url } = await inquirer.prompt<{ url: string }>({
        type: 'input',
        name: 'url',
        message: 'Enter session URL:',
        validate: input => input.trim().length > 0 || 'URL cannot be empty',
      })

      await importSession(url, options)
      break
    }

    case 'id': {
      const { transferId } = await inquirer.prompt<{ transferId: string }>({
        type: 'input',
        name: 'transferId',
        message: 'Enter transfer ID:',
        validate: input => input.trim().length > 0 || 'Transfer ID cannot be empty',
      })

      const url = generateTeleportUrl(transferId)
      await importSession(url, options)
      break
    }

    case 'remote': {
      await listRemoteSessions(options)

      const { url } = await inquirer.prompt<{ url: string }>({
        type: 'input',
        name: 'url',
        message: 'Enter session URL to import (or leave empty to cancel):',
      })

      if (url && url.trim()) {
        await importSession(url.trim(), options)
      }
      else {
        console.log(ansis.gray('\nCancelled\n'))
      }
      break
    }
  }
}

/**
 * Main teleport command handler
 */
export async function teleportCommand(args: string[], options: {
  lang?: SupportedLang
}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  const action = args[0] || 'menu'

  switch (action) {
    case 'export': {
      if (args[1] === 'picker') {
        await exportPicker(options)
      }
      else {
        await exportSession({
          lang: options.lang,
          sessionId: args[1],
        })
      }
      break
    }

    case 'import': {
      const url = args[1]
      if (!url) {
        await importPicker(options)
      }
      else {
        await importSession(url, options)
      }
      break
    }

    case 'list': {
      const remote = args.includes('--remote') || args.includes('-r')
      await listSharedSessions({ lang: options.lang, remote })
      break
    }

    case 'status': {
      await checkTeleportStatus(options)
      break
    }

    case 'qr': {
      await generateQRCode({
        lang: options.lang,
        sessionId: args[1],
      })
      break
    }

    case 'menu': {
      await showTeleportMenu(options)
      break
    }

    case 'help': {
      showTeleportHelp()
      break
    }

    default: {
      // Treat as import URL
      await importSession(action, options)
    }
  }
}

/**
 * Show teleport menu
 */
async function showTeleportMenu(options: {
  lang?: SupportedLang
}): Promise<void> {
  if (options.lang && i18n.language !== options.lang) {
    await i18n.changeLanguage(options.lang)
  }

  displayBanner()

  console.log(ansis.white('Actions:'))
  console.log(`  ${ansis.green('1.')} Export session for sharing`)
  console.log(`  ${ansis.green('2.')} Import session from URL`)
  console.log(`  ${ansis.green('3.')} List shared sessions`)
  console.log(`  ${ansis.green('4.')} Check service status`)
  console.log(`  ${ansis.green('5.')} Generate QR code`)
  console.log(`  ${ansis.green('0.')} Back`)
  console.log('')

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: 'Select action:',
    validate: input => ['0', '1', '2', '3', '4', '5'].includes(input) || 'Invalid choice',
  })

  switch (choice) {
    case '1':
      await exportPicker(options)
      break
    case '2':
      await importPicker(options)
      break
    case '3':
      await listSharedSessions(options)
      break
    case '4':
      await checkTeleportStatus(options)
      break
    case '5':
      await generateQRCode(options)
      break
  }
}

/**
 * Show teleport help
 */
function showTeleportHelp(): void {
  console.log(ansis.cyan.bold('\n🌀 Teleport Commands\n'))
  console.log(ansis.white('Export:'))
  console.log('  ccjk teleport export              - Export current session')
  console.log('  ccjk teleport export <session-id>   - Export specific session')
  console.log('  ccjk teleport export picker        - Interactive picker')
  console.log('')
  console.log(ansis.white('Import:'))
  console.log('  ccjk teleport import <url>          - Import from URL')
  console.log('  ccjk teleport import                - Interactive import')
  console.log('  ccjk teleport <url>                 - Quick import from URL')
  console.log('')
  console.log(ansis.white('List:'))
  console.log('  ccjk teleport list                 - List local transfers')
  console.log('  ccjk teleport list --remote        - List remote sessions')
  console.log('')
  console.log(ansis.white('Other:'))
  console.log('  ccjk teleport status               - Check service status')
  console.log('  ccjk teleport qr                   - Generate QR code')
  console.log('  ccjk teleport menu                 - Interactive menu')
  console.log('')
  console.log(ansis.gray('Session URLs use the format: claude://teleport/<transfer-id>'))
  console.log('')
}
