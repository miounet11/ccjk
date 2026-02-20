# Database Health Check - Quick Start Guide

## Installation

```typescript
import { DatabaseHealthMonitor, createHealthMonitor, HealthStatus } from '@/context'
import { getContextPersistence } from '@/context'
```

## 5-Minute Quick Start

### 1. Basic Health Check

```typescript
const persistence = getContextPersistence()
const monitor = createHealthMonitor(persistence)

try {
  const health = await monitor.runHealthCheck()
  console.log(`Status: ${health.status}`)

  if (health.status === HealthStatus.CRITICAL) {
    await monitor.attemptRecovery()
  }
} finally {
  monitor.close()
}
```

### 2. Create Backup

```typescript
const backup = await monitor.backup('daily')
console.log(`Backup: ${backup.backupPath}`)
```

### 3. Restore from Backup

```typescript
const backups = monitor.listBackups()
await monitor.restore(backups[0].path)
```

### 4. Checkpoint WAL

```typescript
const wal = await monitor.checkWAL()
if (wal.checkpointable) {
  await monitor.checkpoint('RESTART')
}
```

### 5. Apply Migration

```typescript
const migrations = [
  {
    version: 2,
    description: 'Add tags column',
    up: (db) => {
      db.exec('ALTER TABLE contexts ADD COLUMN tags TEXT DEFAULT "[]"')
    },
  },
]

await monitor.applyMigrations(migrations)
```

## Common Patterns

### Scheduled Monitoring

```typescript
setInterval(async () => {
  const health = await monitor.runHealthCheck()
  if (health.status !== HealthStatus.HEALTHY) {
    console.warn('Health issue:', health.recommendations)
  }
}, 3600000) // Every hour
```

### Pre-Operation Backup

```typescript
// Before risky operation
await monitor.backup('pre-operation')

try {
  // Risky operation
} catch (error) {
  // Restore if failed
  const backups = monitor.listBackups()
  await monitor.restore(backups[0].path)
}
```

### Performance Monitoring

```typescript
const perf = await monitor.checkPerformance()
if (perf.queryTime > 100) {
  console.warn('Slow queries detected')
}
```

## Health Status Levels

- `HEALTHY` - All good
- `WARNING` - Minor issues
- `CRITICAL` - Immediate action needed
- `UNKNOWN` - Check failed

## Key Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `runHealthCheck()` | Full health assessment | `HealthCheckResult` |
| `checkIntegrity()` | Database corruption check | `IntegrityCheckResult` |
| `checkWAL()` | WAL status | `WALCheckResult` |
| `checkSize()` | Size and utilization | `SizeCheckResult` |
| `checkPerformance()` | Performance metrics | `PerformanceCheckResult` |
| `backup(label?)` | Create backup | `BackupResult` |
| `restore(path)` | Restore from backup | `RestoreResult` |
| `checkpoint(mode?)` | Checkpoint WAL | `CheckpointResult` |
| `attemptRecovery()` | Auto-recovery | `RecoveryResult` |
| `applyMigrations(migrations)` | Apply schema changes | `MigrationResult` |

## Checkpoint Modes

- `PASSIVE` - Non-blocking
- `FULL` - Complete (may block)
- `RESTART` - Checkpoint and restart
- `TRUNCATE` - Checkpoint and truncate

## File Locations

- Database: `~/.ccjk/context/contexts.db`
- Backups: `~/.ccjk/context/backups/`

## More Information

- Full API: See `health-check-README.md`
- Examples: See `health-check-examples.ts`
- Tests: See `__tests__/health-check.test.ts`
