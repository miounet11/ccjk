/**
 * Sandbox command for managing sandbox mode
 */

import type { SupportedLang } from '../constants.js'
import type { AuditLogFilter } from '../types/sandbox.js'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { i18n } from '../i18n/index.js'
import { getGlobalSandboxManager } from '../sandbox/sandbox-manager.js'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler.js'
import { addNumbersToChoices } from '../utils/prompt-helpers.js'

/**
 * Sandbox command options
 */
export interface SandboxOptions {
  lang?: SupportedLang
  action?: 'enable' | 'disable' | 'status' | 'audit' | 'clear'
  // Enable options
  isolateRequests?: boolean
  maskSensitiveData?: boolean
  auditLog?: boolean
  maxRequestsPerMinute?: number
  // Audit options
  type?: 'request' | 'response' | 'error'
  limit?: number
  // Clear options
  olderThan?: number
}

/**
 * Format timestamp to readable date
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

/**
 * Format duration in milliseconds
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

/**
 * Enable sandbox mode
 */
async function enableSandbox(options: SandboxOptions): Promise<void> {
  const manager = getGlobalSandboxManager()
  const lang = options.lang || 'en'

  console.log(ansis.green(i18n.t('sandbox:enablingTitle', { lng: lang })))

  // Get configuration from options or prompt
  const config = {
    isolateRequests: options.isolateRequests ?? true,
    maskSensitiveData: options.maskSensitiveData ?? true,
    auditLog: options.auditLog ?? true,
    maxRequestsPerMinute: options.maxRequestsPerMinute ?? 60,
  }

  // If no options provided, prompt for configuration
  if (options.isolateRequests === undefined) {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'isolateRequests',
        message: i18n.t('sandbox:isolateRequestsPrompt', { lng: lang }),
        default: true,
      },
      {
        type: 'confirm',
        name: 'maskSensitiveData',
        message: i18n.t('sandbox:maskSensitiveDataPrompt', { lng: lang }),
        default: true,
      },
      {
        type: 'confirm',
        name: 'auditLog',
        message: i18n.t('sandbox:auditLogPrompt', { lng: lang }),
        default: true,
      },
      {
        type: 'number',
        name: 'maxRequestsPerMinute',
        message: i18n.t('sandbox:maxRequestsPrompt', { lng: lang }),
        default: 60,
        validate: (value: unknown) => {
          const num = Number(value)
          return num > 0 || i18n.t('sandbox:invalidNumber', { lng: lang })
        },
      },
    ] as const)

    Object.assign(config, answers)
  }

  await manager.enable(config)

  console.log(ansis.green(`\n✓ ${i18n.t('sandbox:enabledSuccess', { lng: lang })}`))
  console.log(ansis.dim(`  ${i18n.t('sandbox:isolateRequests', { lng: lang })}: ${config.isolateRequests ? '✓' : '✗'}`))
  console.log(ansis.dim(`  ${i18n.t('sandbox:maskSensitiveData', { lng: lang })}: ${config.maskSensitiveData ? '✓' : '✗'}`))
  console.log(ansis.dim(`  ${i18n.t('sandbox:auditLog', { lng: lang })}: ${config.auditLog ? '✓' : '✗'}`))
  console.log(ansis.dim(`  ${i18n.t('sandbox:maxRequests', { lng: lang })}: ${config.maxRequestsPerMinute}/min`))
}

/**
 * Disable sandbox mode
 */
async function disableSandbox(options: SandboxOptions): Promise<void> {
  const manager = getGlobalSandboxManager()
  const lang = options.lang || 'en'

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: i18n.t('sandbox:disableConfirm', { lng: lang }),
      default: false,
    },
  ])

  if (!confirm) {
    console.log(ansis.yellow(i18n.t('common:cancelled', { lng: lang })))
    return
  }

  manager.disable()
  console.log(ansis.green(`\n✓ ${i18n.t('sandbox:disabledSuccess', { lng: lang })}`))
}

/**
 * Show sandbox status
 */
async function showStatus(options: SandboxOptions): Promise<void> {
  const manager = getGlobalSandboxManager()
  const lang = options.lang || 'en'
  const status = manager.getStatus()

  console.log(ansis.green.bold(`\n${i18n.t('sandbox:statusTitle', { lng: lang })}`))
  console.log(ansis.dim('─'.repeat(50)))

  // Status
  const statusText = status.enabled
    ? ansis.green(i18n.t('sandbox:enabled', { lng: lang }))
    : ansis.red(i18n.t('sandbox:disabled', { lng: lang }))
  console.log(`${i18n.t('sandbox:status', { lng: lang })}: ${statusText}`)

  if (status.enabled) {
    // Configuration
    console.log(`\n${ansis.bold(i18n.t('sandbox:configuration', { lng: lang }))}:`)
    console.log(`  ${i18n.t('sandbox:isolateRequests', { lng: lang })}: ${status.config.isolateRequests ? '✓' : '✗'}`)
    console.log(`  ${i18n.t('sandbox:maskSensitiveData', { lng: lang })}: ${status.config.maskSensitiveData ? '✓' : '✗'}`)
    console.log(`  ${i18n.t('sandbox:auditLog', { lng: lang })}: ${status.config.auditLog ? '✓' : '✗'}`)
    console.log(`  ${i18n.t('sandbox:maxRequests', { lng: lang })}: ${status.config.maxRequestsPerMinute}/min`)

    // Statistics
    console.log(`\n${ansis.bold(i18n.t('sandbox:statistics', { lng: lang }))}:`)
    console.log(`  ${i18n.t('sandbox:totalRequests', { lng: lang })}: ${status.stats.totalRequests}`)
    console.log(`  ${i18n.t('sandbox:totalResponses', { lng: lang })}: ${status.stats.totalResponses}`)
    console.log(`  ${i18n.t('sandbox:totalErrors', { lng: lang })}: ${status.stats.totalErrors}`)
    console.log(`  ${i18n.t('sandbox:rateLimitHits', { lng: lang })}: ${status.stats.rateLimitHits}`)

    // Audit log info
    if (status.config.auditLog) {
      const auditStats = await manager.getAuditLogger().getStats()
      console.log(`\n${ansis.bold(i18n.t('sandbox:auditLogInfo', { lng: lang }))}:`)
      console.log(`  ${i18n.t('sandbox:totalEntries', { lng: lang })}: ${auditStats.totalEntries}`)
      console.log(`  ${i18n.t('sandbox:requests', { lng: lang })}: ${auditStats.byType.request}`)
      console.log(`  ${i18n.t('sandbox:responses', { lng: lang })}: ${auditStats.byType.response}`)
      console.log(`  ${i18n.t('sandbox:errors', { lng: lang })}: ${auditStats.byType.error}`)

      if (auditStats.oldestEntry && auditStats.newestEntry) {
        const duration = auditStats.newestEntry - auditStats.oldestEntry
        console.log(`  ${i18n.t('sandbox:timeRange', { lng: lang })}: ${formatDuration(duration)}`)
      }
    }
  }

  console.log(ansis.dim('─'.repeat(50)))
}

/**
 * Show audit logs
 */
async function showAuditLogs(options: SandboxOptions): Promise<void> {
  const manager = getGlobalSandboxManager()
  const lang = options.lang || 'en'

  if (!manager.getStatus().enabled) {
    console.log(ansis.yellow(i18n.t('sandbox:notEnabled', { lng: lang })))
    return
  }

  // Build filter
  const filter: AuditLogFilter = {
    type: options.type,
    limit: options.limit || 20,
  }

  const logs = await manager.getAuditLogs(filter)

  if (logs.length === 0) {
    console.log(ansis.yellow(i18n.t('sandbox:noAuditLogs', { lng: lang })))
    return
  }

  console.log(ansis.green.bold(`\n${i18n.t('sandbox:auditLogsTitle', { lng: lang })}`))
  console.log(ansis.dim(`${i18n.t('sandbox:showing', { lng: lang })} ${logs.length} ${i18n.t('sandbox:entries', { lng: lang })}`))
  console.log(ansis.dim('─'.repeat(80)))

  for (const log of logs) {
    const typeColor = log.type === 'error' ? ansis.red : log.type === 'request' ? ansis.green : ansis.green
    const typeLabel = typeColor(log.type.toUpperCase().padEnd(8))

    console.log(`\n${typeLabel} ${ansis.dim(formatTimestamp(log.timestamp))}`)
    console.log(ansis.dim(`ID: ${log.id}`))

    if (log.metadata?.requestId) {
      console.log(ansis.dim(`Request ID: ${log.metadata.requestId}`))
    }

    if (log.error) {
      console.log(ansis.red(`Error: ${log.error.message}`))
      if (log.error.code) {
        console.log(ansis.dim(`Code: ${log.error.code}`))
      }
    }
    else {
      console.log(ansis.dim(JSON.stringify(log.data, null, 2).substring(0, 200)))
    }
  }

  console.log(ansis.dim(`\n${'─'.repeat(80)}`))
}

/**
 * Clear audit logs
 */
async function clearAuditLogs(options: SandboxOptions): Promise<void> {
  const manager = getGlobalSandboxManager()
  const lang = options.lang || 'en'

  if (!manager.getStatus().enabled) {
    console.log(ansis.yellow(i18n.t('sandbox:notEnabled', { lng: lang })))
    return
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: i18n.t('sandbox:clearConfirm', { lng: lang }),
      default: false,
    },
  ])

  if (!confirm) {
    console.log(ansis.yellow(i18n.t('common:cancelled', { lng: lang })))
    return
  }

  const deletedCount = await manager.clearAuditLogs(options.olderThan)
  console.log(ansis.green(`\n✓ ${i18n.t('sandbox:clearedLogs', { lng: lang, count: deletedCount })}`))
}

/**
 * Show sandbox menu
 */
async function showSandboxMenu(lang: SupportedLang): Promise<void> {
  const manager = getGlobalSandboxManager()
  const status = manager.getStatus()

  const choices = addNumbersToChoices([
    {
      name: status.enabled
        ? i18n.t('sandbox:disableSandbox', { lng: lang })
        : i18n.t('sandbox:enableSandbox', { lng: lang }),
      value: status.enabled ? 'disable' : 'enable',
    },
    {
      name: i18n.t('sandbox:viewStatus', { lng: lang }),
      value: 'status',
    },
    {
      name: i18n.t('sandbox:viewAuditLogs', { lng: lang }),
      value: 'audit',
      disabled: !status.enabled || !status.config.auditLog,
    },
    {
      name: i18n.t('sandbox:clearAuditLogs', { lng: lang }),
      value: 'clear',
      disabled: !status.enabled || !status.config.auditLog,
    },
    {
      name: i18n.t('common:back', { lng: lang }),
      value: 'back',
    },
  ])

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: i18n.t('sandbox:menuTitle', { lng: lang }),
      choices,
    },
  ])

  if (action === 'back') {
    return
  }

  switch (action) {
    case 'enable':
      await enableSandbox({ lang })
      break
    case 'disable':
      await disableSandbox({ lang })
      break
    case 'status':
      await showStatus({ lang })
      break
    case 'audit':
      await showAuditLogs({ lang })
      break
    case 'clear':
      await clearAuditLogs({ lang })
      break
  }

  // Show menu again
  await showSandboxMenu(lang)
}

/**
 * Sandbox command entry point
 */
export async function sandbox(options: SandboxOptions = {}): Promise<void> {
  try {
    const lang = options.lang || 'en'

    // If action is specified, execute directly
    if (options.action) {
      switch (options.action) {
        case 'enable':
          await enableSandbox(options)
          break
        case 'disable':
          await disableSandbox(options)
          break
        case 'status':
          await showStatus(options)
          break
        case 'audit':
          await showAuditLogs(options)
          break
        case 'clear':
          await clearAuditLogs(options)
          break
      }
    }
    else {
      // Show interactive menu
      await showSandboxMenu(lang)
    }
  }
  catch (error) {
    if (handleExitPromptError(error)) {
      return
    }
    handleGeneralError(error)
  }
}
