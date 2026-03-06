/**
 * CCJK Cloud Sync Command
 *
 * CLI interface for managing cloud synchronization of skills, configs, and workflows.
 * Supports multiple backends: GitHub Gist, WebDAV, S3.
 *
 * @module commands/cloud-sync
 */

import type {
  CloudProvider,
  ConflictStrategy,
  SyncDirection,
  SyncResult,
} from '../cloud-sync/types.js'
import type { SupportedLang } from '../constants.js'
import ansis from 'ansis'
import inquirer from 'inquirer'
import {
  configureSyncEngine,
  getConflicts,
  getSyncEngine,
  getSyncStatus,
  performSync,
  resolveConflict,
} from '../cloud-sync/index.js'
import { displayError } from '../utils/error-formatter.js'

// ============================================================================
// Types
// ============================================================================

export interface CloudSyncOptions {
  /** Language for UI */
  lang?: SupportedLang

  /** Sync direction */
  direction?: SyncDirection

  /** Force sync (ignore conflicts) */
  force?: boolean

  /** Dry run (no actual changes) */
  dryRun?: boolean

  /** Provider type */
  provider?: CloudProvider

  /** Non-interactive mode */
  nonInteractive?: boolean

  /** Output format */
  format?: 'table' | 'json' | 'minimal'

  /** Conflict resolution strategy */
  conflictStrategy?: ConflictStrategy
}

// ============================================================================
// Constants
// ============================================================================

const PROVIDER_ICONS: Record<CloudProvider, string> = {
  'github-gist': '🐙',
  'webdav': '☁️',
  's3': '📦',
  'custom': '🔧',
}

const STATUS_ICONS: Record<string, string> = {
  idle: '✅',
  syncing: '🔄',
  conflict: '⚠️',
  error: '❌',
}

const DIRECTION_ICONS: Record<SyncDirection, string> = {
  push: '⬆️',
  pull: '⬇️',
  bidirectional: '🔄',
}

// ============================================================================
// Display Helpers
// ============================================================================

function formatTimestamp(dateStr: string | null): string {
  if (!dateStr)
    return ansis.dim('never')

  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000)
    return ansis.green('just now')
  if (diff < 3600000)
    return ansis.green(`${Math.floor(diff / 60000)}m ago`)
  if (diff < 86400000)
    return ansis.yellow(`${Math.floor(diff / 3600000)}h ago`)
  return ansis.red(`${Math.floor(diff / 86400000)}d ago`)
}

export function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes}B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ============================================================================
// Main Commands
// ============================================================================

/**
 * Show sync dashboard
 */
export async function showSyncDashboard(_options: CloudSyncOptions = {}): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan('┌─────────────────────────────────────────────────────────────┐'))
  console.log(ansis.bold.cyan('│') + ansis.bold.white('  ☁️  Cloud Sync Dashboard                                    ') + ansis.bold.cyan('│'))
  console.log(ansis.bold.cyan('├─────────────────────────────────────────────────────────────┤'))

  const state = getSyncStatus()

  // Connection status
  const statusIcon = STATUS_ICONS[state.status] || '❓'
  const statusColor = state.status === 'idle' ? ansis.green : state.status === 'error' ? ansis.red : ansis.yellow

  console.log(ansis.bold.cyan('│') + `  ${ansis.bold('Status:')}     ${statusIcon} ${statusColor(state.status)}`.padEnd(60) + ansis.bold.cyan('│'))
  console.log(ansis.bold.cyan('│') + `  ${ansis.bold('Last Sync:')}  ${formatTimestamp(state.lastSyncAt)}`.padEnd(60) + ansis.bold.cyan('│'))
  console.log(ansis.bold.cyan('│') + `  ${ansis.bold('Progress:')}   ${state.progress}%`.padEnd(60) + ansis.bold.cyan('│'))

  console.log(ansis.bold.cyan('├─────────────────────────────────────────────────────────────┤'))

  // Sync stats
  console.log(ansis.bold.cyan('│') + ansis.bold('  Sync Statistics:                                           ') + ansis.bold.cyan('│'))
  console.log(`${ansis.bold.cyan('│')}  ${ansis.green('↑')} Pushed: ${String(state.stats?.pushed || 0).padEnd(6)} ${ansis.green('↓')} Pulled: ${String(state.stats?.pulled || 0).padEnd(6)} ${ansis.yellow('⚠')} Conflicts: ${state.stats?.conflictsResolved || 0}  ${ansis.bold.cyan('│')}`)

  // Conflicts
  const conflicts = getConflicts()
  if (conflicts.length > 0) {
    console.log(ansis.bold.cyan('├─────────────────────────────────────────────────────────────┤'))
    console.log(ansis.bold.cyan('│') + ansis.bold.red(`  ⚠️  Conflicts (${conflicts.length}):`.padEnd(59)) + ansis.bold.cyan('│'))
    for (const conflict of conflicts.slice(0, 3)) {
      console.log(ansis.bold.cyan('│') + `  ${ansis.red('!')} ${conflict.itemId.slice(0, 50)}`.padEnd(60) + ansis.bold.cyan('│'))
    }
  }

  // Error
  if (state.lastError) {
    console.log(ansis.bold.cyan('├─────────────────────────────────────────────────────────────┤'))
    console.log(ansis.bold.cyan('│') + ansis.bold.red(`  ❌ Error: ${state.lastError.slice(0, 45)}`.padEnd(59)) + ansis.bold.cyan('│'))
  }

  console.log(ansis.bold.cyan('└─────────────────────────────────────────────────────────────┘'))
  console.log('')
}

/**
 * Configure sync provider
 */
export async function configureSync(options: CloudSyncOptions = {}): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  ⚙️  Configure Cloud Sync`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  const { provider } = await inquirer.prompt<{ provider: CloudProvider }>({
    type: 'list',
    name: 'provider',
    message: 'Select sync provider:',
    choices: [
      { name: '🐙 GitHub Gist - Sync via GitHub Gists', value: 'github-gist' },
      { name: '☁️  WebDAV - Sync via WebDAV server', value: 'webdav' },
      { name: '📦 S3 - Sync via S3-compatible storage', value: 's3' },
    ],
    default: options.provider,
  })

  let credentials: Record<string, string> = {}

  switch (provider) {
    case 'github-gist': {
      const answers = await inquirer.prompt<{
        token: string
        gistId: string
      }>([
        {
          type: 'password',
          name: 'token',
          message: 'GitHub Personal Access Token:',
          validate: (input: string) => input.length > 0 || 'Token is required',
        },
        {
          type: 'input',
          name: 'gistId',
          message: 'Gist ID (leave empty to create new):',
        },
      ])
      credentials = { token: answers.token, gistId: answers.gistId }
      break
    }

    case 'webdav': {
      const answers = await inquirer.prompt<{
        endpoint: string
        username: string
        password: string
      }>([
        {
          type: 'input',
          name: 'endpoint',
          message: 'WebDAV URL:',
          validate: (input: string) => input.startsWith('http') || 'Must be a valid URL',
        },
        {
          type: 'input',
          name: 'username',
          message: 'Username:',
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
        },
      ])
      credentials = answers
      break
    }

    case 's3': {
      const answers = await inquirer.prompt<{
        endpoint: string
        token: string
        secretKey: string
        bucket: string
      }>([
        {
          type: 'input',
          name: 'endpoint',
          message: 'S3 Endpoint (leave empty for AWS):',
        },
        {
          type: 'input',
          name: 'token',
          message: 'Access Key ID:',
        },
        {
          type: 'password',
          name: 'secretKey',
          message: 'Secret Access Key:',
        },
        {
          type: 'input',
          name: 'bucket',
          message: 'Bucket name:',
          default: 'ccjk-sync',
        },
      ])
      credentials = answers
      break
    }
  }

  // Configure the engine
  await configureSyncEngine(provider, credentials)

  console.log('')
  console.log(ansis.green(`  ✅ Configured ${PROVIDER_ICONS[provider]} ${provider} provider`))
  console.log('')
}

/**
 * Perform sync operation
 */
export async function syncNow(options: CloudSyncOptions = {}): Promise<SyncResult | null> {
  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  🔄 Sync Now`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  const engine = getSyncEngine()
  if (!engine) {
    console.log(ansis.yellow('  ⚠️ No sync provider configured'))
    console.log(ansis.dim('  Run: ccjk sync config'))
    console.log('')
    return null
  }

  // Select direction
  let direction = options.direction
  if (!direction && !options.nonInteractive) {
    const answer = await inquirer.prompt<{ direction: SyncDirection }>({
      type: 'list',
      name: 'direction',
      message: 'Sync direction:',
      choices: [
        { name: '🔄 Bidirectional - Sync both ways', value: 'bidirectional' },
        { name: '⬆️  Push - Upload local changes', value: 'push' },
        { name: '⬇️  Pull - Download remote changes', value: 'pull' },
      ],
      default: 'bidirectional',
    })
    direction = answer.direction
  }

  direction = direction || 'bidirectional'

  // Confirm if not forced
  if (!options.force && !options.nonInteractive) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: `${DIRECTION_ICONS[direction]} Proceed with ${direction} sync?`,
      default: true,
    })

    if (!confirm) {
      console.log(ansis.yellow('\n  Cancelled\n'))
      return null
    }
  }

  // Perform sync
  console.log(ansis.dim(`\n  ${DIRECTION_ICONS[direction]} Syncing...`))

  try {
    const result = await performSync({
      direction,
      force: options.force,
      dryRun: options.dryRun,
      conflictStrategy: options.conflictStrategy,
    })

    // Display results
    console.log('')
    if (result.success) {
      console.log(ansis.green('  ✅ Sync completed successfully!'))
      console.log(ansis.dim(`  ↑ Pushed: ${result.pushed.length}  ↓ Pulled: ${result.pulled.length}`))
      if (result.conflicts.length > 0) {
        console.log(ansis.yellow(`  ⚠️ ${result.conflicts.length} conflicts detected`))
      }
    }
    else {
      const errorMsg = result.errors.length > 0 ? result.errors[0].message : 'Unknown error'
      console.log(ansis.red(`  ❌ Sync failed: ${errorMsg}`))
    }
    console.log('')

    return result
  }
  catch (error) {
    displayError(error as Error, 'Cloud sync')
    return null
  }
}

/**
 * Resolve conflicts interactively
 */
export async function resolveConflicts(_options: CloudSyncOptions = {}): Promise<void> {
  const conflicts = getConflicts()

  if (conflicts.length === 0) {
    console.log(ansis.green('\n  ✅ No conflicts to resolve\n'))
    return
  }

  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  ⚠️  Resolve Conflicts (${conflicts.length})`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  for (const conflict of conflicts) {
    console.log(ansis.bold(`  📄 ${conflict.itemId}`))
    console.log(ansis.dim(`  Type: ${conflict.itemType}`))
    console.log(ansis.dim(`  Local:  ${conflict.localItem.name} (v${conflict.localItem.version})`))
    console.log(ansis.dim(`  Remote: ${conflict.remoteItem.name} (v${conflict.remoteItem.version})`))
    console.log('')

    const { resolution } = await inquirer.prompt<{ resolution: 'local' | 'remote' | 'skip' }>({
      type: 'list',
      name: 'resolution',
      message: 'Resolution:',
      choices: [
        { name: '💾 Keep local version', value: 'local' },
        { name: '☁️  Use remote version', value: 'remote' },
        { name: '⏭️  Skip for now', value: 'skip' },
      ],
    })

    if (resolution !== 'skip') {
      await resolveConflict(conflict.id, resolution)
      console.log(ansis.green(`  ✅ Resolved: ${resolution}\n`))
    }
  }

  console.log(ansis.green('  Done resolving conflicts\n'))
}

/**
 * Show sync history
 */
export async function showSyncHistory(options: CloudSyncOptions = {}): Promise<void> {
  const engine = getSyncEngine()
  if (!engine) {
    console.log(ansis.yellow('\n  ⚠️ Sync not configured\n'))
    return
  }

  // For now, just show current state since history isn't implemented
  const state = engine.getState()

  if (options.format === 'json') {
    console.log(JSON.stringify(state, null, 2))
    return
  }

  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(70)))
  console.log(ansis.bold(`  Sync State`))
  console.log(ansis.bold.cyan('━'.repeat(70)))
  console.log(`  Status: ${state.status}`)
  console.log(`  Last Sync: ${state.lastSyncAt || 'Never'}`)
  console.log(`  Total Synced: ${state.stats.totalSynced}`)
  console.log(`  Pushed: ${state.stats.pushed}`)
  console.log(`  Pulled: ${state.stats.pulled}`)
  console.log(`  Conflicts Resolved: ${state.stats.conflictsResolved}`)
  console.log(ansis.bold.cyan('━'.repeat(70)))
  console.log('')
}

// ============================================================================
// Interactive Menu
// ============================================================================

/**
 * Main sync management menu
 */
export async function manageSyncMenu(options: CloudSyncOptions = {}): Promise<void> {
  while (true) {
    await showSyncDashboard(options)

    const { action } = await inquirer.prompt<{ action: string }>({
      type: 'list',
      name: 'action',
      message: 'Cloud Sync:',
      choices: [
        { name: '🔄 Sync now', value: 'sync' },
        { name: '⚙️  Configure provider', value: 'config' },
        { name: '⚠️  Resolve conflicts', value: 'conflicts' },
        { name: '📜 View state', value: 'history' },
        { name: '🔙 Back', value: 'back' },
      ],
    })

    switch (action) {
      case 'sync':
        await syncNow(options)
        break
      case 'config':
        await configureSync(options)
        break
      case 'conflicts':
        await resolveConflicts(options)
        break
      case 'history':
        await showSyncHistory(options)
        break
      case 'back':
        return
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

/**
 * Main entry point for sync command
 */
export async function cloudSync(
  subcommand?: string,
  options: CloudSyncOptions = {},
): Promise<void> {
  switch (subcommand) {
    case 'push':
      await syncNow({ ...options, direction: 'push' })
      break
    case 'pull':
      await syncNow({ ...options, direction: 'pull' })
      break
    case 'sync':
      await syncNow({ ...options, direction: 'bidirectional' })
      break
    case 'config':
    case 'configure':
      await configureSync(options)
      break
    case 'conflicts':
      await resolveConflicts(options)
      break
    case 'history':
      await showSyncHistory(options)
      break
    case 'status':
    case 'dashboard':
      await showSyncDashboard(options)
      break
    default:
      await manageSyncMenu(options)
  }
}
