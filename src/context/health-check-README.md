# Database Health Monitoring System

Comprehensive health monitoring, integrity checks, backup/restore, and error recovery for the SQLite database used in CCJK's context persistence system.

## Features

### 1. Health Monitoring
- **Integrity Checks**: PRAGMA integrity_check and foreign key validation
- **WAL Monitoring**: Track Write-Ahead Log size and checkpoint status
- **Size Monitoring**: Database size, page utilization, and free space tracking
- **Performance Metrics**: Query/write performance, index efficiency, cache hit rates

### 2. Backup & Restore
- **Automatic Backups**: Create timestamped database backups with metadata
- **Backup Management**: List, clean up old backups (keeps last 10)
- **Safe Restore**: Restore from backup with integrity verification
- **Metadata Tracking**: Store backup metadata (size, context count, timestamp)

### 3. WAL Management
- **Checkpoint Control**: PASSIVE, FULL, RESTART, TRUNCATE modes
- **Size Monitoring**: Track WAL and SHM file sizes
- **Auto-checkpoint**: Recommendations when WAL exceeds thresholds

### 4. Error Recovery
- **Automatic Recovery**: Detect corruption and restore from backup
- **Checkpoint Recovery**: Auto-checkpoint large WAL files
- **VACUUM Recovery**: Reclaim space when utilization is low
- **Integrity Verification**: Post-recovery integrity checks

### 5. Schema Migrations
- **Version Tracking**: PRAGMA user_version for schema versioning
- **Safe Migrations**: Transactional migrations with automatic rollback
- **Pre-migration Backups**: Automatic backup before each migration
- **Migration History**: Track applied migrations

## Installation

The health monitoring system is built into the context module:

```typescript
import { DatabaseHealthMonitor, createHealthMonitor } from '@/context'
import { getContextPersistence } from '@/context'
```

## Quick Start

### Basic Health Check

```typescript
import { createHealthMonitor, getContextPersistence } from '@/context'

const persistence = getContextPersistence()
const monitor = createHealthMonitor(persistence)

try {
  const health = await monitor.runHealthCheck()

  console.log(`Status: ${health.status}`)
  console.log(`Integrity: ${health.checks.integrity.passed ? 'PASSED' : 'FAILED'}`)
  console.log(`Database Size: ${health.checks.size.dbSize / 1024 / 1024} MB`)

  if (health.recommendations.length > 0) {
    console.log('Recommendations:', health.recommendations)
  }
} finally {
  monitor.close()
}
```

### Create Backup

```typescript
const backup = await monitor.backup('daily')

if (backup.success) {
  console.log(`Backup created: ${backup.backupPath}`)
  console.log(`Size: ${backup.metadata.dbSize / 1024 / 1024} MB`)
  console.log(`Contexts: ${backup.metadata.contextCount}`)
}
```

### Restore from Backup

```typescript
const backups = monitor.listBackups()

if (backups.length > 0) {
  const restore = await monitor.restore(backups[0].path)

  if (restore.success) {
    console.log('Database restored successfully')
  }
}
```

### Automatic Recovery

```typescript
const recovery = await monitor.attemptRecovery()

if (recovery.success) {
  console.log('Recovery successful')
  console.log('Actions taken:', recovery.actions)
} else {
  console.error('Recovery failed:', recovery.errors)
}
```

## API Reference

### DatabaseHealthMonitor

#### Constructor

```typescript
new DatabaseHealthMonitor(dbPath: string)
```

Creates a new health monitor for the specified database.

#### Methods

##### runHealthCheck()

```typescript
async runHealthCheck(): Promise<HealthCheckResult>
```

Runs comprehensive health check including integrity, WAL, size, and performance checks.

**Returns:**
- `status`: Overall health status (HEALTHY, WARNING, CRITICAL, UNKNOWN)
- `checks`: Individual check results
- `recommendations`: Array of recommended actions
- `errors`: Array of errors encountered

##### checkIntegrity()

```typescript
async checkIntegrity(): Promise<IntegrityCheckResult>
```

Runs PRAGMA integrity_check and foreign key validation.

**Returns:**
- `passed`: Whether integrity check passed
- `errors`: Array of integrity errors
- `corruptedTables`: List of corrupted tables
- `duration`: Check duration in milliseconds

##### checkWAL()

```typescript
async checkWAL(): Promise<WALCheckResult>
```

Checks Write-Ahead Log status and size.

**Returns:**
- `mode`: Journal mode (usually 'wal')
- `walSize`: WAL file size in bytes
- `shmSize`: Shared memory file size in bytes
- `checkpointable`: Whether checkpoint is recommended
- `recommendations`: Array of recommendations

##### checkpoint()

```typescript
async checkpoint(mode?: 'PASSIVE' | 'FULL' | 'RESTART' | 'TRUNCATE'): Promise<CheckpointResult>
```

Checkpoints the WAL to the main database.

**Modes:**
- `PASSIVE`: Checkpoint without blocking readers/writers
- `FULL`: Checkpoint all frames, may block
- `RESTART`: Checkpoint and restart WAL
- `TRUNCATE`: Checkpoint and truncate WAL to zero bytes

**Returns:**
- `success`: Whether checkpoint succeeded
- `walFrames`: Number of frames in WAL
- `checkpointed`: Number of frames checkpointed
- `error`: Error message if failed

##### checkSize()

```typescript
async checkSize(): Promise<SizeCheckResult>
```

Checks database size and utilization.

**Returns:**
- `dbSize`: Database file size in bytes
- `walSize`: WAL file size in bytes
- `totalSize`: Total size (db + wal)
- `pageCount`: Total number of pages
- `pageSize`: Size of each page in bytes
- `freePages`: Number of free pages
- `utilizationPercent`: Percentage of pages in use
- `recommendations`: Array of recommendations

##### checkPerformance()

```typescript
async checkPerformance(): Promise<PerformanceCheckResult>
```

Measures database performance metrics.

**Returns:**
- `queryTime`: Query execution time in milliseconds
- `writeTime`: Write execution time in milliseconds
- `indexEfficiency`: Index efficiency percentage
- `cacheHitRate`: Cache hit rate percentage
- `recommendations`: Array of recommendations

##### backup()

```typescript
async backup(label?: string): Promise<BackupResult>
```

Creates a database backup with optional label.

**Parameters:**
- `label`: Optional label for the backup (e.g., 'daily', 'pre-migration')

**Returns:**
- `success`: Whether backup succeeded
- `backupPath`: Path to backup file
- `metadata`: Backup metadata (timestamp, size, counts)
- `duration`: Backup duration in milliseconds
- `error`: Error message if failed

##### restore()

```typescript
async restore(backupPath: string): Promise<RestoreResult>
```

Restores database from backup.

**Parameters:**
- `backupPath`: Path to backup file

**Returns:**
- `success`: Whether restore succeeded
- `restoredFrom`: Path to backup file
- `metadata`: Backup metadata
- `duration`: Restore duration in milliseconds
- `error`: Error message if failed

##### listBackups()

```typescript
listBackups(): Array<{ path: string, metadata: BackupMetadata }>
```

Lists all available backups, sorted by timestamp (newest first).

##### attemptRecovery()

```typescript
async attemptRecovery(): Promise<RecoveryResult>
```

Attempts automatic recovery from database issues.

**Recovery Steps:**
1. Check integrity
2. If corrupted, restore from latest backup
3. Checkpoint WAL if needed
4. VACUUM if utilization is low

**Returns:**
- `success`: Whether recovery succeeded
- `actions`: Array of actions taken
- `errors`: Array of errors encountered

##### applyMigrations()

```typescript
async applyMigrations(migrations: Migration[]): Promise<MigrationResult>
```

Applies database schema migrations.

**Parameters:**
- `migrations`: Array of migration objects with version, description, and up function

**Returns:**
- `success`: Whether all migrations succeeded
- `applied`: Array of applied migration versions
- `errors`: Array of errors encountered

##### getSchemaVersion()

```typescript
getSchemaVersion(): number
```

Gets current schema version from PRAGMA user_version.

##### setSchemaVersion()

```typescript
setSchemaVersion(version: number): void
```

Sets schema version in PRAGMA user_version.

##### close()

```typescript
close(): void
```

Closes the database connection.

## Health Status Levels

- **HEALTHY**: All checks passed, no issues detected
- **WARNING**: Minor issues detected, recommendations available
- **CRITICAL**: Serious issues detected, immediate action required
- **UNKNOWN**: Health check failed to complete

## Recommendations

The health monitoring system provides actionable recommendations:

### WAL Recommendations
- "WAL file is large, run checkpoint to merge changes" (WAL > 1MB)
- "WAL file exceeds 10MB, immediate checkpoint recommended" (WAL > 10MB)

### Size Recommendations
- "Database utilization is X%, consider VACUUM" (utilization < 70%)
- "X free pages detected, VACUUM recommended" (free pages > 30%)
- "Database exceeds 100MB, consider archiving old data" (size > 100MB)

### Performance Recommendations
- "Query performance is slow, check indexes" (query time > 50ms)
- "Write performance is slow, consider optimizing" (write time > 20ms)
- "Few indexes detected, query performance may be suboptimal" (< 4 indexes)

## Best Practices

### 1. Regular Health Checks

Run health checks periodically (e.g., hourly or daily):

```typescript
setInterval(async () => {
  const health = await monitor.runHealthCheck()
  if (health.status !== HealthStatus.HEALTHY) {
    console.warn('Database health issue detected', health)
  }
}, 3600000) // Every hour
```

### 2. Automatic Backups

Create backups before critical operations:

```typescript
// Before migration
await monitor.backup('pre-migration')

// Daily backup
await monitor.backup('daily')

// Before bulk operations
await monitor.backup('pre-bulk-operation')
```

### 3. WAL Management

Checkpoint WAL regularly to prevent it from growing too large:

```typescript
const wal = await monitor.checkWAL()
if (wal.checkpointable) {
  await monitor.checkpoint('RESTART')
}
```

### 4. Monitor Performance

Track performance metrics over time:

```typescript
const perf = await monitor.checkPerformance()
if (perf.queryTime > 100) {
  console.warn('Query performance degraded')
  // Consider adding indexes or optimizing queries
}
```

### 5. Automated Recovery

Implement automatic recovery for critical systems:

```typescript
const health = await monitor.runHealthCheck()
if (health.status === HealthStatus.CRITICAL) {
  await monitor.attemptRecovery()
}
```

## Migration Example

```typescript
const migrations = [
  {
    version: 1,
    description: 'Initial schema',
    up: (db) => {
      // Already applied
    },
  },
  {
    version: 2,
    description: 'Add tags column',
    up: (db) => {
      db.exec('ALTER TABLE contexts ADD COLUMN tags TEXT DEFAULT "[]"')
    },
  },
  {
    version: 3,
    description: 'Add quality score',
    up: (db) => {
      db.exec('ALTER TABLE contexts ADD COLUMN quality_score REAL DEFAULT 0.0')
      db.exec('CREATE INDEX idx_contexts_quality ON contexts(quality_score)')
    },
  },
]

const result = await monitor.applyMigrations(migrations)
if (result.success) {
  console.log('Migrations applied:', result.applied)
} else {
  console.error('Migration failed:', result.errors)
}
```

## Troubleshooting

### Database Corruption

If integrity check fails:

1. Attempt automatic recovery: `await monitor.attemptRecovery()`
2. If recovery fails, restore from backup: `await monitor.restore(backupPath)`
3. If no backups available, database may need manual repair

### Large WAL File

If WAL file grows too large:

1. Checkpoint immediately: `await monitor.checkpoint('TRUNCATE')`
2. Check for long-running transactions
3. Ensure no processes are holding database locks

### Low Utilization

If database has many free pages:

1. Run VACUUM through persistence: `persistence.vacuum()`
2. Consider archiving old data
3. Implement data retention policies

### Performance Issues

If queries are slow:

1. Check index usage: `await monitor.checkPerformance()`
2. Add missing indexes
3. Optimize query patterns
4. Consider database size and archiving

## File Locations

- **Database**: `~/.ccjk/context/contexts.db`
- **WAL**: `~/.ccjk/context/contexts.db-wal`
- **SHM**: `~/.ccjk/context/contexts.db-shm`
- **Backups**: `~/.ccjk/context/backups/`
- **Backup Metadata**: `~/.ccjk/context/backups/*.db.meta.json`

## Performance Considerations

- **Integrity Check**: ~10-100ms depending on database size
- **WAL Check**: <1ms (file stat operations)
- **Size Check**: ~1-5ms (PRAGMA queries)
- **Performance Check**: ~5-20ms (test queries)
- **Backup**: ~100ms-1s depending on database size
- **Restore**: ~100ms-1s depending on database size
- **Checkpoint**: ~10-500ms depending on WAL size

## Security Considerations

- Backups are stored in the same directory as the database
- No encryption is applied to backups
- Backup metadata may contain sensitive information
- Consider implementing backup encryption for production use
- Implement access controls for backup directory

## License

MIT
