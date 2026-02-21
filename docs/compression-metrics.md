# Compression Metrics System

Comprehensive tracking and display system for context compression metrics, providing real-time feedback and cumulative statistics.

## Overview

The Compression Metrics System tracks every compression operation, storing detailed metrics in a SQLite database and providing rich visualization and reporting capabilities.

## Features

### 1. Real-time Compression Feedback

After each compression, display immediate feedback:

```
✅ Compressed 50.0K tokens → 15.0K (70% reduction) [125ms]
```

### 2. Cumulative Statistics

Track compression performance over time:

- **Session Stats**: Last 24 hours
- **Weekly Stats**: Last 7 days
- **Monthly Stats**: Last 30 days
- **Overall Stats**: All-time totals

### 3. Cost Savings Estimation

Automatic calculation of cost savings based on Claude Opus pricing ($0.015 per 1K tokens):

```
💰 Cost Savings: $12.45
  Session (24h): $2.30
  Weekly (7d):   $8.75
  Monthly (30d): $12.45
```

### 4. Dashboard Integration

Metrics are automatically displayed in the `ccjk status` dashboard:

```
Compression Metrics
  Total Saved:       125.5K tokens
  Avg Reduction:     68%
  Cost Savings:      $1.88
  Session (24h):     15 compressions, $0.45 saved
```

## Database Schema

### compression_metrics Table

```sql
CREATE TABLE compression_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_hash TEXT NOT NULL,
  context_id TEXT NOT NULL,
  original_tokens INTEGER NOT NULL,
  compressed_tokens INTEGER NOT NULL,
  compression_ratio REAL NOT NULL,
  time_taken_ms INTEGER NOT NULL,
  algorithm TEXT NOT NULL,
  strategy TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
```

### Indexes

- `idx_metrics_project`: Fast project-based queries
- `idx_metrics_timestamp`: Time-range filtering
- `idx_metrics_context`: Context-specific lookups

## API Usage

### Basic Compression with Metrics

```typescript
import { ContextManager } from '@/context'
import { MetricsDisplay } from '@/context/metrics-display'

const manager = new ContextManager({
  enablePersistence: true,
  projectHash: 'my-project',
})

const context = {
  id: 'ctx-1',
  content: 'Large context content...',
  timestamp: Date.now(),
}

const startTime = Date.now()
const compressed = await manager.compress(context)
const timeTaken = Date.now() - startTime

// Display result
MetricsDisplay.displayCompressionResult(
  compressed.originalTokens,
  compressed.compressedTokens,
  compressed.compressionRatio,
  timeTaken,
)
```

### Get Statistics

```typescript
// Get overall statistics
const stats = manager.getCompressionMetricsStats()

console.log(`Total compressions: ${stats.totalCompressions}`)
console.log(`Tokens saved: ${stats.totalTokensSaved}`)
console.log(`Cost savings: $${stats.estimatedCostSavings.toFixed(2)}`)

// Display full statistics
MetricsDisplay.displayCompressionStats(stats)
```

### Get Recent Metrics

```typescript
// Get last 10 compressions
const recent = manager.getRecentCompressionMetrics(10)

// Display as table
MetricsDisplay.displayCompressionTable(recent)
```

### Time-Range Filtering

```typescript
const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)

const stats = manager.getCompressionMetricsStats({
  startTime: oneDayAgo,
})

console.log(`Last 24h: ${stats.totalCompressions} compressions`)
```

## Display Functions

### displayCompressionResult()

Show immediate feedback after compression:

```typescript
MetricsDisplay.displayCompressionResult(
  originalTokens: number,
  compressedTokens: number,
  compressionRatio: number,
  timeTakenMs: number,
)
```

Output:
```
✅ Compressed 50.0K tokens → 15.0K (70% reduction) [125ms]
```

### displayCompressionStats()

Show comprehensive statistics:

```typescript
MetricsDisplay.displayCompressionStats(stats)
```

Output:
```
📊 Compression Statistics
────────────────────────────────────────────────────────────

Overall:
  Total Compressions:  150
  Tokens Saved:       2.5M
  Avg Compression:    68%
  Avg Time:           125ms
  Cost Savings:       $37.50

Session (24h):
  Compressions:      25
  Tokens Saved:      450.0K
  Cost Savings:      $6.75

Weekly (7d):
  Compressions:      120
  Tokens Saved:      2.1M
  Cost Savings:      $31.50

Monthly (30d):
  Compressions:      150
  Tokens Saved:      2.5M
  Cost Savings:      $37.50

────────────────────────────────────────────────────────────
💡 Cost based on $0.015 per 1K tokens (Claude Opus pricing)
```

### displayCompressionTable()

Show recent compressions in table format:

```typescript
MetricsDisplay.displayCompressionTable(metrics, limit)
```

Output:
```
Recent Compressions
────────────────────────────────────────────────────────────────────────────────
Original    Compressed  Ratio     Time      Strategy       Algorithm
────────────────────────────────────────────────────────────────────────────────
50.0K       15.0K       70%       125ms     balanced       semantic
32.5K       12.8K       61%       98ms      aggressive     combined
18.2K       8.1K        55%       76ms      conservative   semantic
────────────────────────────────────────────────────────────────────────────────
```

### displayCompactCompressionStats()

Compact format for dashboard integration:

```typescript
const lines = MetricsDisplay.displayCompactCompressionStats(stats)
console.log(lines.join('\n'))
```

Output:
```
Compression Metrics
  Total Saved:        2.5M tokens
  Avg Reduction:      68%
  Cost Savings:       $37.50
  Session (24h):     25 compressions, $6.75 saved
```

### createCompressionBar()

Visual progress bar for compression ratio:

```typescript
const bar = MetricsDisplay.createCompressionBar(0.68, 20)
console.log(bar) // ████████████████░░░░
```

## Utility Functions

### formatTokenCount()

Format token counts with K/M suffix:

```typescript
MetricsDisplay.formatTokenCount(1500)      // "1.5K"
MetricsDisplay.formatTokenCount(1500000)   // "1.5M"
MetricsDisplay.formatTokenCount(500)       // "500"
```

### formatCost()

Format cost in USD:

```typescript
MetricsDisplay.formatCost(12.456)   // "$12.46"
MetricsDisplay.formatCost(0.0234)   // "$0.023"
MetricsDisplay.formatCost(0.0012)   // "$0.0012"
```

### formatRatio()

Format compression ratio as percentage:

```typescript
MetricsDisplay.formatRatio(0.68)   // "68%"
MetricsDisplay.formatRatio(0.725)  // "73%"
```

### formatTime()

Format time in ms or seconds:

```typescript
MetricsDisplay.formatTime(125)    // "125ms"
MetricsDisplay.formatTime(1500)   // "1.50s"
```

## Maintenance

### Cleanup Old Metrics

Remove metrics older than specified age:

```typescript
const persistence = getContextPersistence()

// Remove metrics older than 90 days
const maxAge = 90 * 24 * 60 * 60 * 1000
const deleted = persistence.cleanupCompressionMetrics(maxAge)

console.log(`Deleted ${deleted} old metrics`)
```

### Database Vacuum

Reclaim space after cleanup:

```typescript
persistence.vacuum()
```

## Integration with Status Dashboard

The metrics are automatically integrated into `ccjk status`:

```bash
ccjk status
```

Output includes:
```
────────────────────────────────────────────

Compression Metrics
  Total Saved:       125.5K tokens
  Avg Reduction:     68%
  Cost Savings:      $1.88
  Session (24h):     15 compressions, $0.45 saved

────────────────────────────────────────────
```

## Performance Considerations

### Database Performance

- Metrics are stored in SQLite with WAL mode enabled
- Indexes optimize common query patterns
- Automatic cleanup prevents unbounded growth

### Memory Usage

- Metrics are stored on disk, not in memory
- Only recent metrics are loaded for display
- Configurable limits prevent excessive memory usage

### Query Optimization

- Time-range queries use indexed timestamp column
- Project-specific queries use indexed project_hash column
- Aggregations are performed in SQL for efficiency

## Cost Calculation

Cost savings are calculated based on Claude Opus pricing:

- **Input tokens**: $0.015 per 1K tokens
- **Savings formula**: `(tokens_saved / 1000) * 0.015`

Example:
- Original: 50,000 tokens
- Compressed: 15,000 tokens
- Saved: 35,000 tokens
- Cost savings: `(35,000 / 1000) * 0.015 = $0.525`

## Testing

Comprehensive test suite in `src/context/__tests__/compression-metrics.test.ts`:

```bash
pnpm vitest src/context/__tests__/compression-metrics.test.ts
```

Test coverage:
- ✅ Metrics storage and retrieval
- ✅ Statistics calculation
- ✅ Time-range filtering
- ✅ Cost calculations
- ✅ Cleanup operations
- ✅ Manager integration
- ✅ Multiple compression strategies

## Examples

See `src/context/examples/compression-metrics-example.ts` for complete examples:

```bash
ts-node src/context/examples/compression-metrics-example.ts
```

Examples include:
1. Basic compression with metrics display
2. Multiple compressions with cumulative statistics
3. Compression metrics table
4. Compact metrics display for dashboard
5. Cost savings calculation
6. Real-time compression monitoring

## Troubleshooting

### Metrics Not Appearing

1. Ensure persistence is enabled:
   ```typescript
   const manager = new ContextManager({
     enablePersistence: true,
     projectHash: 'your-project',
   })
   ```

2. Check database location:
   ```typescript
   const persistence = getContextPersistence()
   console.log(persistence.getDatabaseSize())
   ```

3. Verify compressions are being tracked:
   ```typescript
   const stats = manager.getCompressionMetricsStats()
   console.log(stats.totalCompressions)
   ```

### Database Errors

1. Check database file permissions
2. Ensure sufficient disk space
3. Run database integrity check:
   ```typescript
   persistence.db.pragma('integrity_check')
   ```

### Performance Issues

1. Clean up old metrics regularly
2. Vacuum database periodically
3. Use time-range filters for large datasets
4. Consider archiving old metrics

## Future Enhancements

- [ ] Export metrics to CSV/JSON
- [ ] Graphical visualization (charts/graphs)
- [ ] Compression quality metrics
- [ ] Algorithm performance comparison
- [ ] Custom cost models
- [ ] Metrics aggregation by project/user
- [ ] Real-time metrics streaming
- [ ] Metrics API endpoints

## Related Documentation

- [Context Compression System](./context-compression.md)
- [Persistence Layer](./persistence.md)
- [Status Dashboard](./status-dashboard.md)
- [Performance Optimization](./performance.md)
