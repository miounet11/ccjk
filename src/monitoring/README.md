# CCJK Performance Monitoring

Comprehensive performance monitoring system for CCJK with real-time dashboard, detailed metrics collection, and intelligent reporting.

## Overview

The CCJK monitoring module provides:

- **Real-time Performance Dashboard**: Live terminal-based monitoring with ANSI colors and ASCII charts
- **Comprehensive Metrics**: Track command execution, API calls, cache performance, errors, and agent tasks
- **Performance Reports**: Generate detailed reports with trend analysis and anomaly detection
- **Event System**: Subscribe to metric events and set up alerts
- **Export Capabilities**: Export data in JSON, CSV, or HTML formats

## Architecture

```
src/monitoring/
├── index.ts              # Main entry point and exports
├── types.ts              # TypeScript type definitions
├── metrics-collector.ts  # Core metrics collection engine
├── performance-tracker.ts # High-level tracking utilities
├── dashboard.ts          # Terminal dashboard implementation
└── reporter.ts           # Report generation with analysis
```

## Features

### 1. Metrics Collection

#### Command Execution Tracking
```typescript
import { getMetricsCollector } from './monitoring'

const collector = getMetricsCollector()

// Track command execution
const id = collector.startCommand('init', ['--force'])
try {
  // ... execute command
  collector.endCommand(id, 'success')
} catch (error) {
  collector.endCommand(id, 'failed', error.message)
}
```

#### API Call Monitoring
```typescript
// Track API calls
const callId = collector.startApiCall('anthropic', '/v1/messages', 'POST')
try {
  const response = await fetch('/v1/messages', { method: 'POST' })
  collector.endApiCall(callId, 'success', {
    statusCode: response.status,
    tokensUsed: 1000,
  })
} catch (error) {
  collector.endApiCall(callId, 'failed', {
    error: error.message,
  })
}
```

#### Cache Performance Tracking
```typescript
// Track cache operations
collector.recordCacheOperation('get', 'config-cache', true, 5) // hit
collector.recordCacheOperation('get', 'template-cache', false, 1) // miss
collector.recordCacheOperation('set', 'config-cache', true, 3, 1024) // size 1KB
```

### 2. Performance Tracker

High-level tracking utilities with decorators:

```typescript
import { getPerformanceTracker, trackPerformance, trackErrors } from './monitoring'

const tracker = getPerformanceTracker()

// Track async operations
const { result, duration } = await tracker.measure('fetch-data',
  () => fetchData()
)

// Use decorators
class DataProcessor {
  @trackPerformance('process-data')
  @trackErrors('data-processing')
  async process(data: unknown) {
    // This method will be tracked automatically
  }
}

// Track API calls
await tracker.trackApiCallAsync('anthropic', '/v1/messages',
  () => makeApiCall()
)
```

### 3. Real-time Dashboard

Start the interactive monitoring dashboard:

```bash
# Start real-time dashboard
ccjk monitor

# With custom refresh interval
ccjk monitor --refresh 1000

# Generate a report
ccjk monitor report --range daily --output report.txt

# Export metrics data
ccjk monitor export --format json --output metrics.json
```

Dashboard features:
- Live updating metrics every 2 seconds (configurable)
- System overview with health status
- Memory usage with trend indicators
- API performance with latency sparklines
- Command execution statistics with bar charts
- Cache hit rates with progress bars
- Recent errors with severity indicators
- Agent task statistics

### 4. Performance Reports

Generate comprehensive reports:

```typescript
import { createReporter } from './monitoring'

const reporter = createReporter({
  timeRange: 'daily',
  includeTrends: true,
  includeAnomalies: true,
})

// Generate report
const report = reporter.generateReport()

// Format as different outputs
console.log(reporter.formatReportAsText(report))
console.log(reporter.formatReportAsJson(report))
console.log(reporter.formatReportAsHtml(report))
```

Reports include:
- Summary statistics
- Command execution details
- API performance metrics
- Cache hit rates and statistics
- Error analysis with severity breakdown
- Trend analysis (up/down/stable)
- Anomaly detection (outlier identification)
- Actionable recommendations

### 5. Event System

Subscribe to metric events:

```typescript
const collector = getMetricsCollector()

// Subscribe to threshold alerts
collector.on('threshold:exceeded', (event) => {
  console.log(`Threshold exceeded: ${event.data.message}`)
  // Send notification, log to external system, etc.
})

// Subscribe to errors
tracker.on('error:recorded', (event) => {
  const error = event.data
  console.error(`Error occurred: ${error.type} - ${error.message}`)
})
```

### 6. Threshold Alerts

Set up custom thresholds:

```typescript
const tracker = getPerformanceTracker()

// Add performance thresholds
tracker.addThreshold({
  metric: 'command.duration',
  warning: 5000,      // 5 seconds
  critical: 30000,    // 30 seconds
  comparison: 'gt',
})

tracker.addThreshold({
  metric: 'memory.heapUsedPercent',
  warning: 0.8,       // 80%
  critical: 0.95,     // 95%
  comparison: 'gt',
})

// Listen for alerts
tracker.on('threshold:exceeded', (alert) => {
  if (alert.data.level === 'critical') {
    // Send critical alert
    sendAlert(alert.data.message)
  }
})
```

## Metrics Tracked

### 1. Command Metrics
- Execution count, success/failure rates
- Duration statistics (avg, min, max, p95, p99)
- Memory usage per command
- Error tracking

### 2. Memory Metrics
- Heap used/total with percentages
- RSS (Resident Set Size)
- External memory
- Trend analysis (increasing/stable/decreasing)

### 3. API Call Metrics
- Provider-specific statistics
- Latency measurements (avg, p95, p99)
- Request/response sizes
- Token usage
- Cache hit/miss tracking
- Error rates

### 4. Cache Metrics
- Total operations
- Hit/miss counts
- Hit rate percentage
- Average latency
- Total size and item count
- Eviction count

### 5. Error Metrics
- Error type distribution
- Severity levels (low, medium, high, critical)
- Resolution status
- Error rate (per minute)
- Recent errors with context

### 6. Agent Task Metrics
- Task counts per agent
- Success/failure rates
- Duration statistics
- Token usage
- Last active timestamp

## CLI Usage

```bash
# Start real-time dashboard
ccjk monitor

# Generate report
ccjk monitor report

# Export metrics
ccjk monitor export --format json --output metrics.json

# Show help
ccjk monitor help
```

## Configuration

The monitoring system can be configured with various options:

```typescript
import { getMetricsCollector } from './monitoring'

const collector = getMetricsCollector({
  maxRecords: 10000,           // Maximum records to store
  retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
  enablePersistence: false,    // Save to disk
  persistPath: './monitoring', // Persistence directory
})
```

## Dashboard Configuration

Customize the dashboard appearance:

```typescript
const dashboard = createDashboard({
  refreshInterval: 2000,    // Refresh every 2 seconds
  showCommands: true,
  showMemory: true,
  showApi: true,
  showCache: true,
  showErrors: true,
  showAgents: true,
  chartWidth: 40,          // Chart width
  chartHeight: 8,          // Chart height
  colorScheme: 'default',  // or 'minimal', 'colorful'
})
```

## Report Configuration

Customize performance reports:

```typescript
const reporter = createReporter({
  timeRange: 'daily',      // hourly, daily, weekly, monthly
  includeCommands: true,
  includeMemory: true,
  includeApi: true,
  includeCache: true,
  includeErrors: true,
  includeAgents: true,
  includeTrends: true,
  includeAnomalies: true,
})
```

## Export Formats

### JSON Export
Contains all metric data with timestamps and metadata.

### CSV Export
Structured data format for spreadsheet analysis:
- Command execution data
- API call statistics
- Memory snapshots
- Error records

### HTML Export
Rich web-based report with:
- Interactive charts
- Color-coded metrics
- Trend visualizations
- Responsive design

## Integration Examples

### With Express.js Middleware
```typescript
import { trackPerformance } from './monitoring'

app.use(trackApiPerformance = (req, res, next) => {
  const tracker = getPerformanceTracker()
  tracker.trackCommand('api', [req.path])
  next()
})
```

### With Winston Logger
```typescript
import winston from 'winston'
import { getMetricsCollector } from './monitoring'

const collector = getMetricsCollector()
collector.on('error:recorded', (event) => {
  logger.error(`Monitoring Error: ${event.data.message}`, {
    type: event.data.type,
    severity: event.data.severity,
    context: event.data.context,
  })
})
```

## Best Practices

1. **Start Monitoring Early**: Initialize the monitoring system at application startup
2. **Set Meaningful Thresholds**: Configure thresholds based on your SLAs
3. **Monitor Trends**: Review trends regularly to identify degradation patterns
4. **Track Everything**: Add tracking to all critical paths
5. **Export Regularly**: Schedule regular exports for historical analysis
6. **Use Decorators**: Leverage decorators for automatic tracking
7. **Monitor Memory**: Keep an eye on memory trends for leak detection

## Troubleshooting

### High Memory Usage
- Check memory trend indicators
- Review memory thresholds
- Enable automatic GC monitoring

### Missed Metrics
- Ensure collector is initialized
- Check event listener setup
- Verify threshold configurations

### Performance Impact
- Reduce maxRecords setting
- Increase retention period
- Disable persistence if not needed

## API Reference

See the exported types in `types.ts` for complete API documentation.
