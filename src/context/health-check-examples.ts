/**
 * Database Health Check Examples
 *
 * Demonstrates how to use the database health monitoring system.
 *
 * @module context/health-check-examples
 */

import { DatabaseHealthMonitor, HealthStatus, createHealthMonitor } from './health-check'
import { ContextPersistence, getContextPersistence } from './persistence'

/**
 * Example 1: Basic Health Check
 */
export async function basicHealthCheck() {
  const persistence = getContextPersistence()
  const monitor = createHealthMonitor(persistence)

  try {
    const health = await monitor.runHealthCheck()

    console.log(`Database Status: ${health.status}`)
    console.log(`Integrity: ${health.checks.integrity.passed ? 'PASSED' : 'FAILED'}`)
    console.log(`Database Size: ${(health.checks.size.dbSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`WAL Size: ${(health.checks.size.walSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Utilization: ${health.checks.size.utilizationPercent.toFixed(1)}%`)

    if (health.recommendations.length > 0) {
      console.log('\nRecommendations:')
      health.recommendations.forEach(rec => console.log(`  - ${rec}`))
    }

    if (health.errors.length > 0) {
      console.log('\nErrors:')
      health.errors.forEach(err => console.log(`  - ${err}`))
    }

    return health
  }
  finally {
    monitor.close()
  }
}

/**
 * Example 2: Scheduled Health Monitoring
 */
export function scheduleHealthMonitoring(intervalMs: number = 3600000) {
  const persistence = getContextPersistence()
  const monitor = createHealthMonitor(persistence)

  const interval = setInterval(async () => {
    try {
      const health = await monitor.runHealthCheck()

      if (health.status === HealthStatus.CRITICAL) {
        console.error('CRITICAL: Database health check failed!')
        await monitor.attemptRecovery()
      }
      else if (health.status === HealthStatus.WARNING) {
        console.warn('WARNING: Database health issues detected')

        // Auto-checkpoint if WAL is large
        if (health.checks.wal.checkpointable) {
          await monitor.checkpoint('RESTART')
        }

        // Auto-vacuum if utilization is low
        if (health.checks.size.utilizationPercent < 70) {
          console.log('Running VACUUM to reclaim space...')
          // Note: VACUUM should be done through persistence instance
        }
      }
    }
    catch (error) {
      console.error('Health check failed:', error)
    }
  }, intervalMs)

  // Return cleanup function
  return () => {
    clearInterval(interval)
    monitor.close()
  }
}

/**
 * Example 3: Automatic Backup Strategy
 */
export async function automaticBackupStrategy() {
  const persistence = getContextPersistence()
  const monitor = createHealthMonitor(persistence)

  try {
    // Daily backup
    const dailyBackup = await monitor.backup('daily')
    console.log(`Daily backup created: ${dailyBackup.backupPath}`)

    // Weekly backup with label
    const weeklyBackup = await monitor.backup('weekly')
    console.log(`Weekly backup created: ${weeklyBackup.backupPath}`)

    // List all backups
    const backups = monitor.listBackups()
    console.log(`\nTotal backups: ${backups.length}`)

    backups.forEach((backup, index) => {
      const date = new Date(backup.metadata.timestamp)
      const size = (backup.metadata.dbSize / 1024 / 1024).toFixed(2)
      console.log(`  ${index + 1}. ${date.toISOString()} - ${size} MB - ${backup.metadata.contextCount} contexts`)
    })

    return backups
  }
  finally {
    monitor.close()
  }
}

/**
 * Example 4: Disaster Recovery
 */
export async function disasterRecovery() {
  const persistence = getContextPersistence()
  const monitor = createHealthMonitor(persistence)

  try {
    console.log('Running integrity check...')
    const integrity = await monitor.checkIntegrity()

    if (!integrity.passed) {
      console.error('Database corruption detected!')
      console.error('Corrupted tables:', integrity.corruptedTables)

      console.log('\nAttempting automatic recovery...')
      const recovery = await monitor.attemptRecovery()

      if (recovery.success) {
        console.log('Recovery successful!')
        recovery.actions.forEach(action => console.log(`  ✓ ${action}`))
      }
      else {
        console.error('Automatic recovery failed!')
        recovery.errors.forEach(error => console.error(`  ✗ ${error}`))

        // Manual restore from backup
        const backups = monitor.listBackups()
        if (backups.length > 0) {
          console.log('\nAttempting restore from latest backup...')
          const restore = await monitor.restore(backups[0].path)

          if (restore.success) {
            console.log('Restore successful!')
          }
          else {
            console.error('Restore failed:', restore.error)
          }
        }
      }
    }
    else {
      console.log('Database integrity check passed ✓')
    }
  }
  finally {
    monitor.close()
  }
}

/**
 * Example 5: Performance Monitoring
 */
export async function performanceMonitoring() {
  const persistence = getContextPersistence()
  const monitor = createHealthMonitor(persistence)

  try {
    const perf = await monitor.checkPerformance()

    console.log('Performance Metrics:')
    console.log(`  Query Time: ${perf.queryTime}ms`)
    console.log(`  Write Time: ${perf.writeTime}ms`)
    console.log(`  Index Efficiency: ${perf.indexEfficiency}%`)
    console.log(`  Cache Hit Rate: ${perf.cacheHitRate}%`)

    if (perf.recommendations.length > 0) {
      console.log('\nPerformance Recommendations:')
      perf.recommendations.forEach(rec => console.log(`  - ${rec}`))
    }

    // Alert if performance is degraded
    if (perf.queryTime > 100) {
      console.warn('⚠️  Query performance is degraded')
    }

    if (perf.writeTime > 50) {
      console.warn('⚠️  Write performance is degraded')
    }

    return perf
  }
  finally {
    monitor.close()
  }
}

/**
 * Example 6: WAL Management
 */
export async function walManagement() {
  const persistence = getContextPersistence()
  const monitor = createHealthMonitor(persistence)

  try {
    const wal = await monitor.checkWAL()

    console.log('WAL Status:')
    console.log(`  Mode: ${wal.mode}`)
    console.log(`  WAL Size: ${(wal.walSize / 1024).toFixed(2)} KB`)
    console.log(`  SHM Size: ${(wal.shmSize / 1024).toFixed(2)} KB`)

    if (wal.checkpointable) {
      console.log('\nCheckpointing WAL...')
      const checkpoint = await monitor.checkpoint('RESTART')

      if (checkpoint.success) {
        console.log(`✓ Checkpointed ${checkpoint.checkpointed} frames`)
      }
      else {
        console.error(`✗ Checkpoint failed: ${checkpoint.error}`)
      }
    }

    return wal
  }
  finally {
    monitor.close()
  }
}

/**
 * Example 7: Database Migration
 */
export async function databaseMigration() {
  const persistence = getContextPersistence()
  const monitor = createHealthMonitor(persistence)

  try {
    const currentVersion = monitor.getSchemaVersion()
    console.log(`Current schema version: ${currentVersion}`)

    // Define migrations
    const migrations = [
      {
        version: 1,
        description: 'Initial schema',
        up: (db: any) => {
          // Already applied in persistence.ts
        },
      },
      {
        version: 2,
        description: 'Add tags column',
        up: (db: any) => {
          db.exec('ALTER TABLE contexts ADD COLUMN tags TEXT DEFAULT \"[]\"')
        },
      },
      {
        version: 3,
        description: 'Add quality score',
        up: (db: any) => {
          db.exec('ALTER TABLE contexts ADD COLUMN quality_score REAL DEFAULT 0.0')
        },
      },
    ]

    console.log('\nApplying migrations...')
    const result = await monitor.applyMigrations(migrations)

    if (result.success) {
      console.log('✓ All migrations applied successfully')
      result.applied.forEach(version => {
        const migration = migrations.find(m => m.version === version)
        console.log(`  ✓ v${version}: ${migration?.description}`)
      })
    }
    else {
      console.error('✗ Migration failed')
      result.errors.forEach(error => console.error(`  ✗ ${error}`))
    }

    console.log(`\nNew schema version: ${monitor.getSchemaVersion()}`)

    return result
  }
  finally {
    monitor.close()
  }
}

/**
 * Example 8: Comprehensive Health Dashboard
 */
export async function healthDashboard() {
  const persistence = getContextPersistence()
  const monitor = createHealthMonitor(persistence)

  try {
    console.log('='.repeat(60))
    console.log('DATABASE HEALTH DASHBOARD')
    console.log('='.repeat(60))

    const health = await monitor.runHealthCheck()

    // Status
    const statusIcon = {
      [HealthStatus.HEALTHY]: '✓',
      [HealthStatus.WARNING]: '⚠',
      [HealthStatus.CRITICAL]: '✗',
      [HealthStatus.UNKNOWN]: '?',
    }[health.status]

    console.log(`\n${statusIcon} Overall Status: ${health.status.toUpperCase()}`)
    console.log(`   Timestamp: ${new Date(health.timestamp).toISOString()}`)

    // Integrity
    console.log('\n📋 Integrity Check:')
    console.log(`   Status: ${health.checks.integrity.passed ? '✓ PASSED' : '✗ FAILED'}`)
    console.log(`   Duration: ${health.checks.integrity.duration}ms`)
    if (health.checks.integrity.errors.length > 0) {
      console.log('   Errors:')
      health.checks.integrity.errors.forEach(err => console.log(`     - ${err}`))
    }

    // Size
    console.log('\n💾 Storage:')
    console.log(`   Database: ${(health.checks.size.dbSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   WAL: ${(health.checks.size.walSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   Total: ${(health.checks.size.totalSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   Pages: ${health.checks.size.pageCount} (${health.checks.size.freePages} free)`)
    console.log(`   Utilization: ${health.checks.size.utilizationPercent.toFixed(1)}%`)

    // WAL
    console.log('\n📝 Write-Ahead Log:')
    console.log(`   Mode: ${health.checks.wal.mode}`)
    console.log(`   Size: ${(health.checks.wal.walSize / 1024).toFixed(2)} KB`)
    console.log(`   Checkpoint Needed: ${health.checks.wal.checkpointable ? 'YES' : 'NO'}`)

    // Performance
    console.log('\n⚡ Performance:')
    console.log(`   Query Time: ${health.checks.performance.queryTime}ms`)
    console.log(`   Write Time: ${health.checks.performance.writeTime}ms`)
    console.log(`   Index Efficiency: ${health.checks.performance.indexEfficiency}%`)
    console.log(`   Cache Hit Rate: ${health.checks.performance.cacheHitRate}%`)

    // Recommendations
    if (health.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      health.recommendations.forEach(rec => console.log(`   - ${rec}`))
    }

    // Errors
    if (health.errors.length > 0) {
      console.log('\n❌ Errors:')
      health.errors.forEach(err => console.log(`   - ${err}`))
    }

    // Backups
    const backups = monitor.listBackups()
    console.log('\n💼 Backups:')
    console.log(`   Total: ${backups.length}`)
    if (backups.length > 0) {
      const latest = backups[0]
      console.log(`   Latest: ${new Date(latest.metadata.timestamp).toISOString()}`)
      console.log(`   Size: ${(latest.metadata.dbSize / 1024 / 1024).toFixed(2)} MB`)
    }

    console.log('\n' + '='.repeat(60))

    return health
  }
  finally {
    monitor.close()
  }
}

/**
 * Example 9: Automated Maintenance
 */
export async function automatedMaintenance() {
  const persistence = getContextPersistence()
  const monitor = createHealthMonitor(persistence)

  try {
    console.log('Running automated maintenance...\n')

    // 1. Health check
    console.log('1. Running health check...')
    const health = await monitor.runHealthCheck()
    console.log(`   Status: ${health.status}`)

    // 2. Checkpoint WAL if needed
    if (health.checks.wal.checkpointable) {
      console.log('2. Checkpointing WAL...')
      const checkpoint = await monitor.checkpoint('RESTART')
      console.log(`   Checkpointed: ${checkpoint.checkpointed} frames`)
    }

    // 3. Create backup
    console.log('3. Creating backup...')
    const backup = await monitor.backup('maintenance')
    console.log(`   Backup: ${backup.backupPath}`)

    // 4. Vacuum if needed
    if (health.checks.size.utilizationPercent < 70) {
      console.log('4. Running VACUUM...')
      // Note: VACUUM should be done through persistence
      console.log('   Skipped (requires persistence instance)')
    }

    // 5. Verify integrity
    console.log('5. Verifying integrity...')
    const integrity = await monitor.checkIntegrity()
    console.log(`   Integrity: ${integrity.passed ? 'PASSED' : 'FAILED'}`)

    console.log('\n✓ Maintenance completed')
  }
  finally {
    monitor.close()
  }
}
