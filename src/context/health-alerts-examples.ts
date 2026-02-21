/**
 * Health Alerts System Examples
 *
 * This file demonstrates how to use the Health Alerts System.
 *
 * @module context/health-alerts-examples
 */

import { HealthAlertsManager, runStartupHealthCheck, AlertSeverity } from './health-alerts'
import { join } from 'pathe'

/**
 * Example 1: Run health check on CLI startup
 */
export async function example1_StartupCheck() {
  const dbPath = join(
    process.env.HOME || process.env.USERPROFILE || '.',
    '.ccjk',
    'context',
    'contexts.db',
  )

  // Run startup health check (displays alerts automatically)
  const alerts = await runStartupHealthCheck(dbPath, {
    silent: false, // Show alerts
    walThresholdMB: 10, // Alert if WAL > 10MB
    diskUtilizationThreshold: 70, // Alert if utilization < 70%
    backupAgeThresholdDays: 7, // Alert if backup > 7 days old
  })

  console.log(`Found ${alerts.length} alerts`)
}

/**
 * Example 2: Manual health check with custom configuration
 */
export async function example2_ManualCheck() {
  const dbPath = join(
    process.env.HOME || process.env.USERPROFILE || '.',
    '.ccjk',
    'context',
    'contexts.db',
  )

  const manager = new HealthAlertsManager(dbPath, {
    walThresholdMB: 5, // More aggressive threshold
    diskUtilizationThreshold: 80, // Higher threshold
    backupAgeThresholdDays: 3, // More frequent backups
    enableHistory: true, // Log to history
  })

  try {
    const alerts = await manager.checkHealth()

    // Filter by severity
    const critical = alerts.filter(a => a.severity === AlertSeverity.CRITICAL)
    const warnings = alerts.filter(a => a.severity === AlertSeverity.WARNING)

    console.log(`Critical: ${critical.length}, Warnings: ${warnings.length}`)

    // Display alerts
    manager.displayAlerts(alerts)
  }
  finally {
    manager.close()
  }
}

/**
 * Example 3: Check alert history and summary
 */
export async function example3_AlertHistory() {
  const dbPath = join(
    process.env.HOME || process.env.USERPROFILE || '.',
    '.ccjk',
    'context',
    'contexts.db',
  )

  const manager = new HealthAlertsManager(dbPath)

  try {
    // Get recent history
    const history = await manager.getHistory(10)
    console.log(`Found ${history.length} historical entries`)

    // Get summary statistics
    const summary = await manager.getSummary()
    console.log('Summary:', summary)

    // Mark latest entry as resolved
    if (history.length > 0 && !history[0].resolved) {
      await manager.markResolved(history[0].timestamp)
      console.log('Marked latest alert as resolved')
    }
  }
  finally {
    manager.close()
  }
}

/**
 * Example 4: Silent mode for automated scripts
 */
export async function example4_SilentMode() {
  const dbPath = join(
    process.env.HOME || process.env.USERPROFILE || '.',
    '.ccjk',
    'context',
    'contexts.db',
  )

  // Run in silent mode (no output)
  const alerts = await runStartupHealthCheck(dbPath, { silent: true })

  // Process alerts programmatically
  const hasCritical = alerts.some(a => a.severity === AlertSeverity.CRITICAL)

  if (hasCritical) {
    // Exit with error code for CI/CD
    process.exit(1)
  }
}

/**
 * Example 5: Custom alert processing
 */
export async function example5_CustomProcessing() {
  const dbPath = join(
    process.env.HOME || process.env.USERPROFILE || '.',
    '.ccjk',
    'context',
    'contexts.db',
  )

  const manager = new HealthAlertsManager(dbPath)

  try {
    const alerts = await manager.checkHealth()

    // Group by category
    const byCategory = alerts.reduce((acc, alert) => {
      if (!acc[alert.category]) {
        acc[alert.category] = []
      }
      acc[alert.category].push(alert)
      return acc
    }, {} as Record<string, typeof alerts>)

    // Process each category
    for (const [category, categoryAlerts] of Object.entries(byCategory)) {
      console.log(`\n${category.toUpperCase()}: ${categoryAlerts.length} alerts`)

      for (const alert of categoryAlerts) {
        console.log(`  [${alert.severity}] ${alert.message}`)
        if (alert.action) {
          console.log(`    → ${alert.action}`)
        }
      }
    }
  }
  finally {
    manager.close()
  }
}

/**
 * Example 6: Integration with monitoring systems
 */
export async function example6_MonitoringIntegration() {
  const dbPath = join(
    process.env.HOME || process.env.USERPROFILE || '.',
    '.ccjk',
    'context',
    'contexts.db',
  )

  const manager = new HealthAlertsManager(dbPath)

  try {
    const alerts = await manager.checkHealth()
    const summary = await manager.getSummary()

    // Format for monitoring system (e.g., Prometheus, Datadog)
    const metrics = {
      timestamp: Date.now(),
      database_health_alerts_total: summary.totalAlerts,
      database_health_alerts_critical: summary.criticalCount,
      database_health_alerts_warning: summary.warningCount,
      database_health_alerts_info: summary.infoCount,
      database_health_alerts_unresolved: summary.unresolvedCount,
      database_health_status: alerts.some(a => a.severity === AlertSeverity.CRITICAL) ? 'critical' : 'ok',
    }

    // Send to monitoring system
    console.log('Metrics:', JSON.stringify(metrics, null, 2))

    // Could send to external service:
    // await fetch('https://monitoring.example.com/metrics', {
    //   method: 'POST',
    //   body: JSON.stringify(metrics),
    // })
  }
  finally {
    manager.close()
  }
}

/**
 * Example 7: Automated recovery workflow
 */
export async function example7_AutomatedRecovery() {
  const dbPath = join(
    process.env.HOME || process.env.USERPROFILE || '.',
    '.ccjk',
    'context',
    'contexts.db',
  )

  const manager = new HealthAlertsManager(dbPath)

  try {
    const alerts = await manager.checkHealth()

    // Auto-fix common issues
    for (const alert of alerts) {
      if (alert.category === 'wal' && alert.severity === AlertSeverity.WARNING) {
        console.log('Auto-fixing: Checkpointing WAL...')
        const { DatabaseHealthMonitor } = await import('./health-check')
        const monitor = new DatabaseHealthMonitor(dbPath)
        await monitor.checkpoint('RESTART')
        monitor.close()
      }

      if (alert.category === 'disk' && alert.severity === AlertSeverity.WARNING) {
        console.log('Auto-fixing: Running VACUUM...')
        const { DatabaseHealthMonitor } = await import('./health-check')
        const monitor = new DatabaseHealthMonitor(dbPath)
        const db = (monitor as any).db
        db.prepare('VACUUM').run()
        monitor.close()
      }

      if (alert.category === 'backup' && alert.severity === AlertSeverity.WARNING) {
        console.log('Auto-fixing: Creating backup...')
        const { DatabaseHealthMonitor } = await import('./health-check')
        const monitor = new DatabaseHealthMonitor(dbPath)
        await monitor.backup('auto')
        monitor.close()
      }
    }

    // Re-check after fixes
    const newAlerts = await manager.checkHealth()
    console.log(`Alerts reduced from ${alerts.length} to ${newAlerts.length}`)
  }
  finally {
    manager.close()
  }
}

// Run examples if executed directly
if (require.main === module) {
  (async () => {
    console.log('\n=== Example 1: Startup Check ===')
    await example1_StartupCheck()

    console.log('\n=== Example 2: Manual Check ===')
    await example2_ManualCheck()

    console.log('\n=== Example 3: Alert History ===')
    await example3_AlertHistory()

    console.log('\n=== Example 5: Custom Processing ===')
    await example5_CustomProcessing()

    console.log('\n=== Example 6: Monitoring Integration ===')
    await example6_MonitoringIntegration()
  })()
}
