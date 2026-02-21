# Health Alerts System

The Health Alerts System provides comprehensive database health monitoring and alerting for the CCJK Context Compression System.

## Features

- **Automatic Health Checks**: Runs on CLI startup to detect issues early
- **Multi-Level Alerts**: Critical, Warning, and Info severity levels
- **Alert History**: Tracks alerts over time with resolution status
- **Actionable Recommendations**: Provides specific commands to fix issues
- **Silent Mode**: Can be disabled with `--silent` flag
- **Comprehensive Checks**:
  - Database corruption detection
  - WAL file size monitoring
  - Disk utilization tracking
  - Backup age verification
  - Performance monitoring

## Alert Severity Levels

### 🔴 Critical
- Database corruption detected
- Integrity check failures
- Fatal errors

**Action**: Immediate attention required. May result in data loss.

### 🟡 Warning
- WAL file exceeds threshold (default: 10MB)
- Low disk utilization (default: <70%)
- Backup older than threshold (default: 7 days)
- Performance degradation

**Action**: Should be addressed soon to prevent issues.

### 💡 Info
- WAL file approaching threshold
- Backup approaching age threshold
- Optimization suggestions

**Action**: Informational, no immediate action required.

## CLI Usage

### View Current Alerts

```bash
ccjk context --alerts
```

Displays all current health alerts with severity indicators and recommended actions.

### Run Full Health Check

```bash
ccjk context --health
```

Runs comprehensive health check including:
- Database integrity verification
- WAL status and size
- Database size and utilization
- Performance metrics
- Recommendations

### View Alert History

```bash
ccjk context --alert-history
```

Shows historical alerts with timestamps, resolution status, and summary statistics.

### Maintenance Commands

#### Checkpoint WAL File

```bash
ccjk context --checkpoint
```

Merges WAL file changes into main database. Run when:
- WAL file is large (>10MB)
- Before backups
- After bulk operations

#### Vacuum Database

```bash
ccjk context --vacuum
```

Reclaims unused space and optimizes database. Run when:
- Disk utilization is low (<70%)
- After deleting many contexts
- Database performance is slow

#### Create Backup

```bash
ccjk context --backup
```

Creates timestamped backup of database. Run:
- Regularly (recommended: weekly)
- Before major operations
- After significant changes

#### Attempt Recovery

```bash
ccjk context --recover
```

Attempts automatic recovery from database issues:
- Restores from latest backup if corrupted
- Checkpoints WAL if needed
- Runs VACUUM if utilization is low

## Configuration

Health alerts can be configured when creating a `HealthAlertsManager`:

```typescript
import { HealthAlertsManager } from '@/context/health-alerts'

const manager = new HealthAlertsManager(dbPath, {
  silent: false,                    // Show alerts on startup
  walThresholdMB: 10,               // WAL size threshold in MB
  diskUtilizationThreshold: 70,     // Disk utilization threshold %
  backupAgeThresholdDays: 7,        // Backup age threshold in days
  enableHistory: true,              // Log alerts to history
})
```

## Programmatic Usage

### Basic Health Check

```typescript
import { runStartupHealthCheck } from '@/context/health-alerts'

const alerts = await runStartupHealthCheck(dbPath, {
  silent: false,
  walThresholdMB: 10,
  diskUtilizationThreshold: 70,
  backupAgeThresholdDays: 7,
})

console.log(`Found ${alerts.length} alerts`)
```

### Manual Health Check

```typescript
import { HealthAlertsManager, AlertSeverity } from '@/context/health-alerts'

const manager = new HealthAlertsManager(dbPath)

try {
  const alerts = await manager.checkHealth()

  // Filter by severity
  const critical = alerts.filter(a => a.severity === AlertSeverity.CRITICAL)
  const warnings = alerts.filter(a => a.severity === AlertSeverity.WARNING)

  // Display alerts
  manager.displayAlerts(alerts)
} finally {
  manager.close()
}
```

### Alert History Management

```typescript
const manager = new HealthAlertsManager(dbPath)

try {
  // Get recent history
  const history = await manager.getHistory(10)

  // Get summary statistics
  const summary = await manager.getSummary()
  console.log('Summary:', summary)

  // Mark alert as resolved
  if (history.length > 0) {
    await manager.markResolved(history[0].timestamp)
  }

  // Clear history
  await manager.clearHistory()
} finally {
  manager.close()
}
```

## Alert Categories

### Corruption
- Database integrity check failures
- Foreign key violations
- Corrupted tables

**Resolution**: Run `ccjk context --recover` to attempt automatic recovery.

### WAL (Write-Ahead Log)
- WAL file size exceeds threshold
- WAL checkpoint needed

**Resolution**: Run `ccjk context --checkpoint` to merge WAL into main database.

### Disk
- Low disk utilization
- Excessive free pages
- Database size issues

**Resolution**: Run `ccjk context --vacuum` to reclaim space.

### Backup
- No backups found
- Backup older than threshold

**Resolution**: Run `ccjk context --backup` to create a new backup.

### Performance
- Slow query performance
- Slow write performance
- Index efficiency issues

**Resolution**: Check database indexes, run VACUUM, or optimize queries.

## Alert History

Alert history is stored in `~/.ccjk/context/alert-history.json` and includes:

- Timestamp of each check
- All alerts detected
- Overall health status
- Resolution status

History is automatically maintained with:
- Maximum 100 entries kept
- Automatic cleanup of old entries
- JSON format for easy parsing

## Best Practices

### Regular Maintenance

1. **Daily**: Check alerts on CLI startup (automatic)
2. **Weekly**: Create backup (`ccjk context --backup`)
3. **Monthly**: Run VACUUM (`ccjk context --vacuum`)
4. **As Needed**: Checkpoint WAL when large (`ccjk context --checkpoint`)

### Monitoring

```bash
# Check health status
ccjk context --health

# View current alerts
ccjk context --alerts

# Review history
ccjk context --alert-history
```

### Automation

```bash
# Silent mode for scripts
ccjk --silent init

# Automated backup script
#!/bin/bash
ccjk context --backup
if [ $? -eq 0 ]; then
  echo "Backup successful"
else
  echo "Backup failed"
  exit 1
fi
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Check Database Health
  run: |
    ccjk context --health
    if ccjk context --alerts | grep -q "CRITICAL"; then
      echo "Critical database issues detected"
      exit 1
    fi
```

## Troubleshooting

### Database Corruption

```bash
# Attempt automatic recovery
ccjk context --recover

# If recovery fails, restore from backup
ccjk context --backup  # Create current backup first
# Then manually restore from ~/.ccjk/context/backups/
```

### Large WAL File

```bash
# Checkpoint to merge WAL
ccjk context --checkpoint

# Verify WAL size reduced
ccjk context --health
```

### Low Disk Utilization

```bash
# Run VACUUM to reclaim space
ccjk context --vacuum

# Check improvement
ccjk context --health
```

### No Backups

```bash
# Create initial backup
ccjk context --backup

# Set up automated backups (cron example)
0 0 * * 0 ccjk context --backup  # Weekly on Sunday
```

## API Reference

See [health-alerts-examples.ts](../src/context/health-alerts-examples.ts) for comprehensive examples.

### HealthAlertsManager

```typescript
class HealthAlertsManager {
  constructor(dbPath: string, config?: HealthAlertsConfig)

  async checkHealth(): Promise<HealthAlert[]>
  displayAlerts(alerts: HealthAlert[]): void
  async getHistory(limit?: number): Promise<AlertHistoryEntry[]>
  async getSummary(): Promise<AlertSummary>
  async markResolved(timestamp: number): Promise<void>
  async clearHistory(): Promise<void>
  close(): void
}
```

### runStartupHealthCheck

```typescript
async function runStartupHealthCheck(
  dbPath: string,
  config?: HealthAlertsConfig
): Promise<HealthAlert[]>
```

## Related Documentation

- [Context Persistence](../src/context/PERSISTENCE.md)
- [Database Health Check](../src/context/health-check.ts)
- [Context System Overview](../src/context/CLAUDE.md)

## Support

For issues or questions:
1. Check alert history: `ccjk context --alert-history`
2. Run health check: `ccjk context --health`
3. Attempt recovery: `ccjk context --recover`
4. Create backup: `ccjk context --backup`
5. Report issue with health check output
