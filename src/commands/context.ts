/**
 * Context Command
 *
 * View and manage hierarchical context loading.
 *
 * @module commands/context
 */

import ansis from 'ansis'
import { contextLoader } from '../brain/context-loader'
import type { Task } from '../brain/orchestrator-types'

export interface ContextOptions {
  show?: boolean
  layers?: string
  task?: string
  clear?: boolean
  // Health alerts options
  health?: boolean
  alerts?: boolean
  alertHistory?: boolean
  checkpoint?: boolean
  vacuum?: boolean
  backup?: boolean
  recover?: boolean
}

/**
 * Context command handler
 */
export async function contextCommand(options: ContextOptions = {}): Promise<void> {
  // Health check
  if (options.health) {
    await runHealthCheck()
    return
  }

  // Show alerts
  if (options.alerts) {
    await showAlerts()
    return
  }

  // Show alert history
  if (options.alertHistory) {
    await showAlertHistory()
    return
  }

  // Checkpoint WAL
  if (options.checkpoint) {
    await checkpointWAL()
    return
  }

  // Vacuum database
  if (options.vacuum) {
    await vacuumDatabase()
    return
  }

  // Backup database
  if (options.backup) {
    await backupDatabase()
    return
  }

  // Recover database
  if (options.recover) {
    await recoverDatabase()
    return
  }

  // Clear cache
  if (options.clear) {
    contextLoader.clearCache()
    console.log(ansis.green('\n✅ Context cache cleared\n'))
    return
  }

  // Show context
  if (options.show) {
    const layers = options.layers
      ? options.layers.split(',').map(l => l.trim() as any)
      : ['project', 'domain', 'task', 'execution']

    // Create mock task if task name provided
    let task: Task | undefined
    if (options.task) {
      task = {
        id: 'preview',
        name: options.task,
        description: `Preview context for: ${options.task}`,
        type: 'preview' as any,
        priority: 'normal',
        status: 'pending',
        requiredCapabilities: [],
        dependencies: [],
        maxRetries: 0,
        retryCount: 0,
        progress: 0,
        input: {
          parameters: {},
        },
        metadata: {
          tags: ['preview'],
        },
        createdAt: new Date().toISOString(),
      }
    }

    console.log(ansis.cyan.bold('\n🔍 Loading Context...\n'))

    const context = await contextLoader.load({
      projectRoot: process.cwd(),
      layers,
      task,
    })

    console.log(ansis.white(`Total Size: ${formatBytes(context.totalSize)}`))
    console.log(ansis.white(`Layers: ${context.layers.size}`))
    console.log()

    // Show each layer
    for (const [layer, entries] of context.layers) {
      console.log(ansis.cyan.bold(`📁 ${layer.toUpperCase()}`))
      console.log(ansis.gray(`   ${entries.length} entries`))

      for (const entry of entries) {
        const size = formatBytes(entry.content.length)
        console.log(ansis.white(`   • ${entry.source} (${size})`))
      }

      console.log()
    }

    // Show formatted output
    if (context.totalSize < 10_000) {
      console.log(ansis.cyan.bold('📄 Formatted Context:\n'))
      console.log(ansis.gray('─'.repeat(60)))
      console.log(contextLoader.formatForLLM(context))
      console.log(ansis.gray('─'.repeat(60)))
      console.log()
    }
    else {
      console.log(ansis.yellow('⚠️  Context too large to display (use --layers to filter)\n'))
    }

    return
  }

  // Default: show help
  console.log(ansis.cyan.bold('\n🔍 Context Management\n'))
  console.log(ansis.white('Context Loading:'))
  console.log(ansis.gray('  ccjk context --show                    # Show all context layers'))
  console.log(ansis.gray('  ccjk context --show --layers project   # Show specific layers'))
  console.log(ansis.gray('  ccjk context --show --task "api work"  # Preview context for task'))
  console.log(ansis.gray('  ccjk context --clear                   # Clear context cache'))
  console.log()
  console.log(ansis.white('Database Health:'))
  console.log(ansis.gray('  ccjk context --health                  # Run health check'))
  console.log(ansis.gray('  ccjk context --alerts                  # Show current alerts'))
  console.log(ansis.gray('  ccjk context --alert-history           # Show alert history'))
  console.log(ansis.gray('  ccjk context --checkpoint              # Checkpoint WAL file'))
  console.log(ansis.gray('  ccjk context --vacuum                  # Vacuum database'))
  console.log(ansis.gray('  ccjk context --backup                  # Create backup'))
  console.log(ansis.gray('  ccjk context --recover                 # Attempt recovery'))
  console.log()
  console.log(ansis.white('Available Layers:'))
  console.log(ansis.gray('  • project    - README, CLAUDE.md, package.json, tsconfig.json'))
  console.log(ansis.gray('  • domain     - Domain-specific files (api, ui, database, etc.)'))
  console.log(ansis.gray('  • task       - Task description and input'))
  console.log(ansis.gray('  • execution  - Previous outputs and errors'))
  console.log()
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ============================================================================
// Health Management Functions
// ============================================================================

/**
 * Get database path
 */
function getDbPath(): string {
  const { join } = require('pathe')
  return join(
    process.env.HOME || process.env.USERPROFILE || '.',
    '.ccjk',
    'context',
    'contexts.db',
  )
}

/**
 * Run health check
 */
async function runHealthCheck(): Promise<void> {
  const { HealthAlertsManager } = await import('../context/health-alerts')
  const { DatabaseHealthMonitor } = await import('../context/health-check')

  const dbPath = getDbPath()
  const { existsSync } = await import('node:fs')

  if (!existsSync(dbPath)) {
    console.log(ansis.yellow('\n⚠️  Database not found. No health check needed.\n'))
    return
  }

  console.log(ansis.cyan.bold('\n🏥 Running Database Health Check...\n'))

  const monitor = new DatabaseHealthMonitor(dbPath)

  try {
    const health = await monitor.runHealthCheck()

    // Display status
    const statusEmoji = health.status === 'healthy' ? '✅' : health.status === 'warning' ? '⚠️' : '🔴'
    console.log(ansis.bold(`${statusEmoji} Status: ${health.status.toUpperCase()}`))
    console.log()

    // Display integrity check
    console.log(ansis.cyan('Integrity Check:'))
    console.log(`  ${health.checks.integrity.passed ? '✅' : '❌'} ${health.checks.integrity.passed ? 'Passed' : 'Failed'} (${health.checks.integrity.duration}ms)`)
    if (health.checks.integrity.errors.length > 0) {
      for (const error of health.checks.integrity.errors) {
        console.log(ansis.red(`    • ${error}`))
      }
    }
    console.log()

    // Display WAL status
    console.log(ansis.cyan('WAL Status:'))
    console.log(`  Mode: ${health.checks.wal.mode}`)
    console.log(`  Size: ${formatBytes(health.checks.wal.walSize)}`)
    console.log(`  Checkpointable: ${health.checks.wal.checkpointable ? 'Yes' : 'No'}`)
    console.log()

    // Display size info
    console.log(ansis.cyan('Database Size:'))
    console.log(`  DB: ${formatBytes(health.checks.size.dbSize)}`)
    console.log(`  WAL: ${formatBytes(health.checks.size.walSize)}`)
    console.log(`  Total: ${formatBytes(health.checks.size.totalSize)}`)
    console.log(`  Utilization: ${health.checks.size.utilizationPercent.toFixed(1)}%`)
    console.log()

    // Display performance
    console.log(ansis.cyan('Performance:'))
    console.log(`  Query Time: ${health.checks.performance.queryTime}ms`)
    console.log(`  Write Time: ${health.checks.performance.writeTime}ms`)
    console.log()

    // Display recommendations
    if (health.recommendations.length > 0) {
      console.log(ansis.yellow.bold('💡 Recommendations:'))
      for (const rec of health.recommendations) {
        console.log(ansis.yellow(`  • ${rec}`))
      }
      console.log()
    }

    // Display errors
    if (health.errors.length > 0) {
      console.log(ansis.red.bold('🔴 Errors:'))
      for (const error of health.errors) {
        console.log(ansis.red(`  • ${error}`))
      }
      console.log()
    }
  }
  finally {
    monitor.close()
  }
}

/**
 * Show current alerts
 */
async function showAlerts(): Promise<void> {
  const { HealthAlertsManager } = await import('../context/health-alerts')

  const dbPath = getDbPath()
  const { existsSync } = await import('node:fs')

  if (!existsSync(dbPath)) {
    console.log(ansis.yellow('\n⚠️  Database not found. No alerts.\n'))
    return
  }

  const manager = new HealthAlertsManager(dbPath)

  try {
    const alerts = await manager.checkHealth()

    if (alerts.length === 0) {
      console.log(ansis.green('\n✅ No alerts. Database is healthy.\n'))
      return
    }

    manager.displayAlerts(alerts)
  }
  finally {
    manager.close()
  }
}

/**
 * Show alert history
 */
async function showAlertHistory(): Promise<void> {
  const { HealthAlertsManager } = await import('../context/health-alerts')

  const dbPath = getDbPath()
  const manager = new HealthAlertsManager(dbPath)

  try {
    const history = await manager.getHistory(20)

    if (history.length === 0) {
      console.log(ansis.yellow('\n⚠️  No alert history found.\n'))
      return
    }

    console.log(ansis.cyan.bold('\n📋 Alert History\n'))

    for (const entry of history) {
      const date = new Date(entry.timestamp).toLocaleString()
      const statusEmoji = entry.healthStatus === 'healthy' ? '✅' : entry.healthStatus === 'warning' ? '⚠️' : '🔴'
      const resolvedBadge = entry.resolved ? ansis.green('[Resolved]') : ansis.red('[Unresolved]')

      console.log(`${statusEmoji} ${date} ${resolvedBadge}`)
      console.log(ansis.gray(`   Status: ${entry.healthStatus}`))
      console.log(ansis.gray(`   Alerts: ${entry.alerts.length}`))

      if (entry.alerts.length > 0) {
        for (const alert of entry.alerts.slice(0, 3)) {
          const emoji = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '💡'
          console.log(ansis.gray(`     ${emoji} ${alert.message}`))
        }
        if (entry.alerts.length > 3) {
          console.log(ansis.gray(`     ... and ${entry.alerts.length - 3} more`))
        }
      }

      console.log()
    }

    // Show summary
    const summary = await manager.getSummary()
    console.log(ansis.cyan.bold('📊 Summary'))
    console.log(`  Total Alerts: ${summary.totalAlerts}`)
    console.log(`  Critical: ${summary.criticalCount}`)
    console.log(`  Warnings: ${summary.warningCount}`)
    console.log(`  Info: ${summary.infoCount}`)
    console.log(`  Unresolved: ${summary.unresolvedCount}`)
    console.log()
  }
  finally {
    manager.close()
  }
}

/**
 * Checkpoint WAL file
 */
async function checkpointWAL(): Promise<void> {
  const { DatabaseHealthMonitor } = await import('../context/health-check')

  const dbPath = getDbPath()
  const { existsSync } = await import('node:fs')

  if (!existsSync(dbPath)) {
    console.log(ansis.yellow('\n⚠️  Database not found.\n'))
    return
  }

  console.log(ansis.cyan('\n🔄 Checkpointing WAL file...\n'))

  const monitor = new DatabaseHealthMonitor(dbPath)

  try {
    const result = await monitor.checkpoint('RESTART')

    if (result.success) {
      console.log(ansis.green(`✅ Checkpoint successful`))
      console.log(`   WAL frames: ${result.walFrames}`)
      console.log(`   Checkpointed: ${result.checkpointed}\n`)
    }
    else {
      console.log(ansis.red(`❌ Checkpoint failed: ${result.error}\n`))
    }
  }
  finally {
    monitor.close()
  }
}

/**
 * Vacuum database
 */
async function vacuumDatabase(): Promise<void> {
  const { DatabaseHealthMonitor } = await import('../context/health-check')

  const dbPath = getDbPath()
  const { existsSync } = await import('node:fs')

  if (!existsSync(dbPath)) {
    console.log(ansis.yellow('\n⚠️  Database not found.\n'))
    return
  }

  console.log(ansis.cyan('\n🧹 Running VACUUM...\n'))

  const monitor = new DatabaseHealthMonitor(dbPath)

  try {
    const sizeBefore = await monitor.checkSize()
    const beforeSize = sizeBefore.totalSize

    // Run vacuum (access db directly)
    const db = (monitor as any).db
    db.prepare('VACUUM').run()

    const sizeAfter = await monitor.checkSize()
    const afterSize = sizeAfter.totalSize
    const saved = beforeSize - afterSize

    console.log(ansis.green('✅ VACUUM completed'))
    console.log(`   Before: ${formatBytes(beforeSize)}`)
    console.log(`   After: ${formatBytes(afterSize)}`)
    console.log(`   Saved: ${formatBytes(saved)}\n`)
  }
  catch (error) {
    console.log(ansis.red(`❌ VACUUM failed: ${error instanceof Error ? error.message : String(error)}\n`))
  }
  finally {
    monitor.close()
  }
}

/**
 * Backup database
 */
async function backupDatabase(): Promise<void> {
  const { DatabaseHealthMonitor } = await import('../context/health-check')

  const dbPath = getDbPath()
  const { existsSync } = await import('node:fs')

  if (!existsSync(dbPath)) {
    console.log(ansis.yellow('\n⚠️  Database not found.\n'))
    return
  }

  console.log(ansis.cyan('\n💾 Creating backup...\n'))

  const monitor = new DatabaseHealthMonitor(dbPath)

  try {
    const result = await monitor.backup('manual')

    if (result.success) {
      console.log(ansis.green('✅ Backup created successfully'))
      console.log(`   Path: ${result.backupPath}`)
      console.log(`   Size: ${formatBytes(result.metadata.dbSize)}`)
      console.log(`   Contexts: ${result.metadata.contextCount}`)
      console.log(`   Projects: ${result.metadata.projectCount}`)
      console.log(`   Duration: ${result.duration}ms\n`)
    }
    else {
      console.log(ansis.red(`❌ Backup failed: ${result.error}\n`))
    }
  }
  finally {
    monitor.close()
  }
}

/**
 * Recover database
 */
async function recoverDatabase(): Promise<void> {
  const { DatabaseHealthMonitor } = await import('../context/health-check')

  const dbPath = getDbPath()
  const { existsSync } = await import('node:fs')

  if (!existsSync(dbPath)) {
    console.log(ansis.yellow('\n⚠️  Database not found.\n'))
    return
  }

  console.log(ansis.cyan('\n🔧 Attempting database recovery...\n'))

  const monitor = new DatabaseHealthMonitor(dbPath)

  try {
    const result = await monitor.attemptRecovery()

    if (result.success) {
      console.log(ansis.green('✅ Recovery successful\n'))
    }
    else {
      console.log(ansis.red('❌ Recovery failed\n'))
    }

    // Show actions taken
    if (result.actions.length > 0) {
      console.log(ansis.cyan('Actions Taken:'))
      for (const action of result.actions) {
        console.log(ansis.white(`  • ${action}`))
      }
      console.log()
    }

    // Show errors
    if (result.errors.length > 0) {
      console.log(ansis.red('Errors:'))
      for (const error of result.errors) {
        console.log(ansis.red(`  • ${error}`))
      }
      console.log()
    }
  }
  finally {
    monitor.close()
  }
}
