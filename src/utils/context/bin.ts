#!/usr/bin/env node

/**
 * Context Compression System - CLI Entry Point
 *
 * Provides command-line interface for managing context compression
 * and transparently proxying Claude Code with compression capabilities.
 *
 * Usage:
 *   ccjk [claude-code-args...]     # Start Claude Code with compression
 *   ccjk --status                  # Show current session status
 *   ccjk --compress                # Manually trigger compression
 *   ccjk --sessions                # List all sessions
 *   ccjk --sync                    # Manual cloud sync
 *   ccjk --config                  # Show/edit configuration
 *   ccjk --stats                   # Show statistics
 *   ccjk --help                    # Show help
 */

import process from 'node:process'
import { CLIWrapper } from './cli-wrapper'
import { createContextManager } from './context-manager'

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1B[0m',
  bright: '\x1B[1m',
  dim: '\x1B[2m',
  red: '\x1B[31m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  blue: '\x1B[34m',
  magenta: '\x1B[35m',
  cyan: '\x1B[36m',
  white: '\x1B[37m',
}

/**
 * Format bytes to human-readable string
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
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp)
    return 'Never'

  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0)
    return `${days}d ago`
  if (hours > 0)
    return `${hours}h ago`
  if (minutes > 0)
    return `${minutes}m ago`
  return `${seconds}s ago`
}

/**
 * Print colored message
 */
function print(message: string, color?: keyof typeof colors): void {
  const colorCode = color ? colors[color] : ''
  console.log(`${colorCode}${message}${colors.reset}`)
}

/**
 * Print error message
 */
function printError(message: string): void {
  console.error(`${colors.red}${colors.bright}Error:${colors.reset} ${colors.red}${message}${colors.reset}`)
}

/**
 * Print success message
 */
function printSuccess(message: string): void {
  console.log(`${colors.green}${colors.bright}✓${colors.reset} ${colors.green}${message}${colors.reset}`)
}

/**
 * Print warning message
 */
function printWarning(message: string): void {
  console.log(`${colors.yellow}${colors.bright}⚠${colors.reset} ${colors.yellow}${message}${colors.reset}`)
}

/**
 * Print info message
 */
function printInfo(message: string): void {
  console.log(`${colors.cyan}${colors.bright}ℹ${colors.reset} ${colors.cyan}${message}${colors.reset}`)
}

/**
 * Print section header
 */
function printHeader(title: string): void {
  console.log()
  console.log(`${colors.bright}${colors.blue}━━━ ${title} ━━━${colors.reset}`)
  console.log()
}

/**
 * Show help message
 */
function showHelp(): void {
  print(`
${colors.bright}${colors.cyan}Context Compression System${colors.reset} - CLI Tool

${colors.bright}USAGE:${colors.reset}
  ccjk [options] [claude-code-args...]

${colors.bright}OPTIONS:${colors.reset}
  ${colors.green}--status${colors.reset}              Show current session status
  ${colors.green}--compress${colors.reset}            Manually trigger compression
  ${colors.green}--sessions${colors.reset}            List all sessions
  ${colors.green}--sync${colors.reset}                Manually trigger cloud sync
  ${colors.green}--config${colors.reset}              Show/edit configuration
  ${colors.green}--stats${colors.reset}               Show statistics
  ${colors.green}--cleanup [days]${colors.reset}      Clean up old sessions (default: 30 days)
  ${colors.green}--disable-compression${colors.reset} Run without compression
  ${colors.green}--verbose${colors.reset}             Enable verbose logging
  ${colors.green}--help${colors.reset}                Show this help message

${colors.bright}EXAMPLES:${colors.reset}
  ${colors.dim}# Start Claude Code with compression${colors.reset}
  ccjk

  ${colors.dim}# Start with specific project${colors.reset}
  ccjk --project /path/to/project

  ${colors.dim}# Check current status${colors.reset}
  ccjk --status

  ${colors.dim}# Manually compress context${colors.reset}
  ccjk --compress

  ${colors.dim}# View statistics${colors.reset}
  ccjk --stats

  ${colors.dim}# Clean up old sessions${colors.reset}
  ccjk --cleanup 30

${colors.bright}COMPRESSION:${colors.reset}
  Context compression automatically triggers when token usage exceeds 80%.
  You can also manually trigger compression using ${colors.green}/compress${colors.reset} in Claude Code
  or by running ${colors.green}ccjk --compress${colors.reset} in another terminal.

${colors.bright}MORE INFO:${colors.reset}
  Documentation: https://github.com/your-repo/ccjk
  Issues: https://github.com/your-repo/ccjk/issues
`)
}

/**
 * Show current session status
 */
async function showStatus(): Promise<void> {
  try {
    const manager = createContextManager({ debug: false })
    await manager.initialize()

    const session = manager.getCurrentSession()
    const stats = manager.getStats()

    printHeader('Session Status')

    if (!session) {
      printWarning('No active session')
      return
    }

    console.log(`${colors.bright}Session ID:${colors.reset}       ${session.id}`)
    console.log(`${colors.bright}Project:${colors.reset}          ${session.projectPath}`)
    console.log(`${colors.bright}Started:${colors.reset}          ${new Date(session.startTime).toLocaleString()}`)
    console.log(`${colors.bright}Token Count:${colors.reset}      ${session.tokenCount.toLocaleString()}`)
    console.log(`${colors.bright}FC Count:${colors.reset}         ${session.fcCount}`)
    console.log(`${colors.bright}Context Usage:${colors.reset}    ${(stats.contextUsage * 100).toFixed(1)}%`)

    // Show threshold level with color
    const thresholdColor = stats.thresholdLevel === 'critical'
      ? 'red'
      : stats.thresholdLevel === 'warning'
        ? 'yellow'
        : 'green'
    console.log(`${colors.bright}Threshold:${colors.reset}        ${colors[thresholdColor]}${stats.thresholdLevel}${colors.reset}`)

    console.log()
  }
  catch (error) {
    printError(`Failed to get status: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

/**
 * Manually trigger compression
 */
async function triggerCompression(): Promise<void> {
  try {
    const manager = createContextManager({ debug: false })
    await manager.initialize()

    const session = manager.getCurrentSession()
    if (!session) {
      printWarning('No active session to compress')
      return
    }

    printInfo('Starting compression...')

    const summary = await manager.compress()

    printSuccess('Compression completed')
    console.log()
    console.log(`${colors.bright}Original Tokens:${colors.reset}   ${summary.originalTokens.toLocaleString()}`)
    console.log(`${colors.bright}Compressed:${colors.reset}        ${summary.compressedTokens.toLocaleString()}`)
    console.log(`${colors.bright}Ratio:${colors.reset}             ${(summary.compressionRatio * 100).toFixed(1)}%`)
    console.log(`${colors.bright}Saved:${colors.reset}             ${(summary.originalTokens - summary.compressedTokens).toLocaleString()} tokens`)
    console.log()
  }
  catch (error) {
    printError(`Failed to compress: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

/**
 * List all sessions
 */
async function listSessions(): Promise<void> {
  try {
    const manager = createContextManager({ debug: false })
    await manager.initialize()

    const storageManager = manager.getStorageManager()
    const sessions = await storageManager.listSessions({ projectHash: undefined })

    printHeader('Sessions')

    if (sessions.length === 0) {
      printWarning('No sessions found')
      return
    }

    console.log(`${colors.dim}Total: ${sessions.length} sessions${colors.reset}`)
    console.log()

    for (const session of sessions.slice(0, 20)) {
      const status = session.status === 'active' ? colors.green : colors.dim
      console.log(`${status}●${colors.reset} ${colors.bright}${session.id}${colors.reset}`)
      console.log(`  ${colors.dim}Project:${colors.reset} ${session.projectPath}`)
      console.log(`  ${colors.dim}Started:${colors.reset} ${new Date(session.startTime).toLocaleString()}`)
      if (session.endTime) {
        console.log(`  ${colors.dim}Ended:${colors.reset}   ${new Date(session.endTime).toLocaleString()}`)
      }
      console.log()
    }

    if (sessions.length > 20) {
      console.log(`${colors.dim}... and ${sessions.length - 20} more${colors.reset}`)
    }
  }
  catch (error) {
    printError(`Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

/**
 * Show statistics
 */
async function showStats(): Promise<void> {
  try {
    const manager = createContextManager({ debug: false })
    await manager.initialize()

    const stats = manager.getStats()

    printHeader('Statistics')

    console.log(`${colors.bright}Current Tokens:${colors.reset}       ${stats.currentTokens.toLocaleString()}`)
    console.log(`${colors.bright}Compressed Tokens:${colors.reset}    ${stats.compressedTokens.toLocaleString()}`)
    console.log(`${colors.bright}Compression Ratio:${colors.reset}    ${(stats.compressionRatio * 100).toFixed(1)}%`)
    console.log(`${colors.bright}Total Sessions:${colors.reset}       ${stats.sessionCount}`)
    console.log(`${colors.bright}Total Messages:${colors.reset}       ${stats.totalMessages.toLocaleString()}`)
    console.log(`${colors.bright}Last Compression:${colors.reset}     ${formatRelativeTime(stats.lastCompression)}`)
    console.log(`${colors.bright}Context Usage:${colors.reset}        ${(stats.contextUsage * 100).toFixed(1)}%`)

    // Show threshold level with color
    const thresholdColor = stats.thresholdLevel === 'critical'
      ? 'red'
      : stats.thresholdLevel === 'warning'
        ? 'yellow'
        : 'green'
    console.log(`${colors.bright}Threshold Level:${colors.reset}      ${colors[thresholdColor]}${stats.thresholdLevel}${colors.reset}`)

    console.log()
  }
  catch (error) {
    printError(`Failed to get stats: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

/**
 * Show configuration
 */
async function showConfig(): Promise<void> {
  try {
    const manager = createContextManager({ debug: false })
    await manager.initialize()

    const configManager = manager.getConfigManager()
    const config = await configManager.get()

    printHeader('Configuration')

    console.log(`${colors.bright}Enabled:${colors.reset}              ${config.enabled ? `${colors.green}Yes` : `${colors.red}No`}${colors.reset}`)
    console.log(`${colors.bright}Max Context Tokens:${colors.reset}   ${config.maxContextTokens.toLocaleString()}`)
    console.log(`${colors.bright}Context Threshold:${colors.reset}    ${config.contextThreshold.toLocaleString()}`)
    console.log(`${colors.bright}Summary Model:${colors.reset}        ${config.summaryModel}`)
    console.log(`${colors.bright}Auto Summarize:${colors.reset}       ${config.autoSummarize ? `${colors.green}Yes` : `${colors.red}No`}${colors.reset}`)
    console.log(`${colors.bright}Cloud Sync:${colors.reset}           ${config.cloudSync.enabled ? `${colors.green}Yes` : `${colors.red}No`}${colors.reset}`)

    if (config.cloudSync.enabled) {
      console.log(`${colors.bright}Sync Endpoint:${colors.reset}        ${config.cloudSync.endpoint || 'default'}`)
    }

    console.log()
  }
  catch (error) {
    printError(`Failed to get config: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

/**
 * Clean up old sessions
 */
async function cleanupSessions(maxAgeDays: number = 30): Promise<void> {
  try {
    const manager = createContextManager({ debug: false })
    await manager.initialize()

    printInfo(`Cleaning up sessions older than ${maxAgeDays} days...`)

    const result = await manager.cleanupOldSessions(maxAgeDays)

    printSuccess(`Cleaned up ${result.sessionsRemoved} sessions`)
    console.log(`${colors.dim}Freed ${formatBytes(result.bytesFreed)}${colors.reset}`)
    console.log()
  }
  catch (error) {
    printError(`Failed to cleanup: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

/**
 * Start Claude Code with compression proxy
 */
async function startProxy(args: string[], options: {
  disableCompression?: boolean
  verbose?: boolean
  projectPath?: string
}): Promise<void> {
  try {
    const wrapper = new CLIWrapper({
      disableCompression: options.disableCompression,
      verbose: options.verbose,
      projectPath: options.projectPath,
    })

    // Setup event listeners for user feedback
    wrapper.getSessionManager().on('threshold_warning', (event) => {
      printWarning(`Context usage: ${event.data.usage.toFixed(1)}% (${event.data.remaining} tokens remaining)`)
    })

    wrapper.getSessionManager().on('threshold_critical', (event) => {
      printError(`Critical: Context usage at ${event.data.usage.toFixed(1)}%`)
      printInfo('Triggering automatic compression...')
    })

    wrapper.getSessionManager().on('fc_summarized', (event) => {
      if (options.verbose) {
        printSuccess(`Summarized: ${event.data.summary.fcName}`)
      }
    })

    // Start the wrapper
    await wrapper.start(args)
  }
  catch (error) {
    printError(`Failed to start: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Parse options
  let disableCompression = false
  let verbose = false
  let projectPath: string | undefined

  // Handle management commands
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp()
    return
  }

  if (args[0] === '--status') {
    await showStatus()
    return
  }

  if (args[0] === '--compress') {
    await triggerCompression()
    return
  }

  if (args[0] === '--sessions') {
    await listSessions()
    return
  }

  if (args[0] === '--stats') {
    await showStats()
    return
  }

  if (args[0] === '--config') {
    await showConfig()
    return
  }

  if (args[0] === '--cleanup') {
    const maxAgeDays = args[1] ? Number.parseInt(args[1], 10) : 30
    if (Number.isNaN(maxAgeDays) || maxAgeDays <= 0) {
      printError('Invalid cleanup days. Must be a positive number.')
      process.exit(1)
    }
    await cleanupSessions(maxAgeDays)
    return
  }

  if (args[0] === '--sync') {
    printWarning('Cloud sync not yet implemented')
    return
  }

  // Parse flags for proxy mode
  const claudeArgs: string[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--disable-compression') {
      disableCompression = true
    }
    else if (arg === '--verbose') {
      verbose = true
    }
    else if (arg === '--project') {
      projectPath = args[++i]
    }
    else {
      claudeArgs.push(arg)
    }
  }

  // Start proxy mode
  await startProxy(claudeArgs, {
    disableCompression,
    verbose,
    projectPath,
  })
}

// Run main function
main().catch((error) => {
  printError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
  if (error instanceof Error && error.stack) {
    console.error(colors.dim + error.stack + colors.reset)
  }
  process.exit(1)
})
