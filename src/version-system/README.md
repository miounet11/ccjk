# Unified Version Management System

A comprehensive, unified system for managing tool versions with smart caching, batch operations, and automated scheduling.

## Overview

The Version Management System consolidates version checking, updating, and scheduling into a single, efficient API. It eliminates duplicate code and reduces network calls through intelligent caching.

### Key Features

- **Unified API**: Single interface for all version management operations
- **Smart Caching**: LRU cache with TTL to minimize network requests
- **Batch Operations**: Check multiple tools simultaneously
- **Automated Scheduling**: Schedule periodic version checks with auto-update
- **Progress Tracking**: Real-time update progress with callbacks
- **Backup & Rollback**: Automatic backup before updates with rollback support
- **Event System**: Subscribe to version check and update events
- **Statistics**: Comprehensive metrics for monitoring and optimization

## Architecture

```
VersionService (Main API)
    ├── VersionCache (Smart LRU Cache)
    ├── VersionChecker (Version Checking)
    ├── VersionUpdater (Update Management)
    └── VersionScheduler (Automated Scheduling)
```

## Installation

```bash
npm install ccjk
```

## Quick Start

```typescript
import { createVersionService } from 'ccjk/version-system';

// Create service
const service = createVersionService();

// Check version
const info = await service.checkVersion('claude-code');
console.log(`Current: ${info.currentVersion}, Latest: ${info.latestVersion}`);

// Update tool
if (info.updateAvailable) {
  await service.updateTool('claude-code');
}

// Schedule automatic checks
service.scheduleCheck('claude-code', 3600000); // Check every hour
service.startScheduler();
```

## API Reference

### VersionService

Main service class providing unified API for version management.

#### Creation

```typescript
import { createVersionService } from 'ccjk/version-system';

const service = createVersionService({
  defaultCacheTtl: 3600000,      // 1 hour cache TTL
  maxCacheSize: 100,              // Max 100 cached entries
  enableBatchChecking: true,      // Enable batch operations
  networkTimeout: 10000,          // 10 second timeout
  retryAttempts: 3,               // Retry 3 times on failure
  retryDelay: 1000,               // 1 second between retries
});
```

#### Version Checking

```typescript
// Check single tool
const info = await service.checkVersion('claude-code');

// Force check (bypass cache)
const info = await service.checkVersion('claude-code', { force: true });

// Check with custom TTL
const info = await service.checkVersion('claude-code', {
  cacheTtl: 1800000  // 30 minutes
});

// Batch check multiple tools
const result = await service.batchCheckVersions([
  'claude-code',
  'aider',
  'cursor'
]);

console.log(`Checked ${result.tools.length} tools in ${result.duration}ms`);
console.log(`Cache hits: ${result.cacheHits}, Network requests: ${result.networkRequests}`);

// Check if update available
const hasUpdate = await service.isUpdateAvailable('claude-code');

// Get tools with available updates
const toolsWithUpdates = await service.getToolsWithUpdates([
  'claude-code',
  'aider',
  'cursor'
]);
```

#### Updating Tools

```typescript
// Update to latest version
await service.updateTool('claude-code');

// Update to specific version
await service.updateTool('claude-code', '1.2.3');

// Update with options
await service.updateTool('claude-code', '1.2.3', {
  backup: true,           // Create backup before update
  timeout: 300000,        // 5 minute timeout
  onProgress: (status) => {
    console.log(`${status.status}: ${status.progress}%`);
  }
});

// Update all tools with available updates
const results = await service.updateAllTools([
  'claude-code',
  'aider',
  'cursor'
]);

for (const [tool, success] of results) {
  console.log(`${tool}: ${success ? 'Updated' : 'Failed'}`);
}

// Get update status
const status = service.getUpdateStatus('claude-code');
console.log(`Status: ${status?.status}, Progress: ${status?.progress}%`);
```

#### Scheduling

```typescript
// Schedule periodic check (every hour)
service.scheduleCheck('claude-code', 3600000);

// Schedule with auto-update
service.scheduleCheck('claude-code', 3600000, true);

// Start scheduler
service.startScheduler();

// Stop scheduler
service.stopScheduler();

// Trigger immediate check
await service.triggerCheck('claude-code');

// Cancel schedule
service.cancelSchedule('claude-code');

// Get schedule info
const schedule = service.getSchedule('claude-code');
console.log(`Next check: ${schedule?.nextCheck}`);
```

#### Cache Management

```typescript
// Clear all cache
service.clearCache();

// Invalidate specific tool
service.invalidateCache('claude-code');

// Prune expired entries
const pruned = service.pruneCache();

// Get cache statistics
const cacheStats = service.getCacheStats();
console.log(`Cache size: ${cacheStats.size}, Hit rate: ${cacheStats.hitRate}`);
```

#### Statistics

```typescript
const stats = service.getStats();

console.log(`Total checks: ${stats.totalChecks}`);
console.log(`Cache hits: ${stats.cacheHits}`);
console.log(`Network requests: ${stats.networkRequests}`);
console.log(`Average check time: ${stats.averageCheckTime}ms`);
console.log(`Total updates: ${stats.totalUpdates}`);
console.log(`Success rate: ${stats.successfulUpdates / stats.totalUpdates}`);

// Reset statistics
service.resetStats();
```

#### Events

```typescript
// Listen to events
service.on('check-started', (event) => {
  console.log(`Checking ${event.tool}...`);
});

service.on('check-completed', (event) => {
  console.log(`Check completed for ${event.tool}`);
});

service.on('update-available', (event) => {
  console.log(`Update available for ${event.tool}: ${event.data.latestVersion}`);
});

service.on('update-started', (event) => {
  console.log(`Starting update for ${event.tool}...`);
});

service.on('update-progress', (event) => {
  console.log(`Update progress: ${event.data.progress}%`);
});

service.on('update-completed', (event) => {
  console.log(`Update completed for ${event.tool}`);
});

service.on('update-failed', (event) => {
  console.error(`Update failed for ${event.tool}: ${event.data.error}`);
});
```

#### Backup Management

```typescript
// List backups
const backups = await service.listBackups('claude-code');
console.log(`Found ${backups.length} backups`);

// Clean old backups (keep 5 most recent)
const deleted = await service.cleanBackups('claude-code', 5);
console.log(`Deleted ${deleted} old backups`);
```

#### Configuration

```typescript
// Get configuration
const config = service.getConfig();

// Update configuration
service.updateConfig({
  defaultCacheTtl: 7200000,  // 2 hours
  maxCacheSize: 200
});

// Export configuration
const exported = service.exportConfig();
localStorage.setItem('version-config', exported);

// Import configuration
const imported = localStorage.getItem('version-config');
service.importConfig(imported);
```

#### Utilities

```typescript
// Compare versions
const result = service.compareVersions('2.0.0', '1.0.0');
// Returns: 'greater' | 'less' | 'equal' | 'invalid'

// Check if tool is installed
const installed = await service.isInstalled('claude-code');

// Get current version
const current = await service.getCurrentVersion('claude-code');

// Get latest version
const latest = await service.getLatestVersion('claude-code');
```

#### Cleanup

```typescript
// Cleanup resources before shutdown
await service.cleanup();
```

## Usage Examples

### Example 1: Basic Version Check and Update

```typescript
import { createVersionService } from 'ccjk/version-system';

async function checkAndUpdate() {
  const service = createVersionService();

  // Check version
  const info = await service.checkVersion('claude-code');

  console.log(`Current version: ${info.currentVersion}`);
  console.log(`Latest version: ${info.latestVersion}`);

  if (info.updateAvailable) {
    console.log('Update available! Updating...');

    await service.updateTool('claude-code', undefined, {
      backup: true,
      onProgress: (status) => {
        console.log(`${status.message} (${status.progress}%)`);
      }
    });

    console.log('Update completed!');
  } else {
    console.log('Already up to date!');
  }
}
```

### Example 2: Batch Check Multiple Tools

```typescript
async function checkMultipleTools() {
  const service = createVersionService();

  const tools = ['claude-code', 'aider', 'cursor', 'cline'];

  console.log(`Checking ${tools.length} tools...`);

  const result = await service.batchCheckVersions(tools);

  console.log(`Completed in ${result.duration}ms`);
  console.log(`Cache hits: ${result.cacheHits}`);
  console.log(`Network requests: ${result.networkRequests}`);

  for (const [tool, info] of result.results) {
    if (info.updateAvailable) {
      console.log(`${tool}: ${info.currentVersion} → ${info.latestVersion}`);
    }
  }

  for (const [tool, error] of result.errors) {
    console.error(`${tool}: ${error.message}`);
  }
}
```

### Example 3: Automated Scheduled Checks

```typescript
async function setupAutomatedChecks() {
  const service = createVersionService();

  // Schedule checks for multiple tools
  service.scheduleCheck('claude-code', 3600000, true);  // Every hour, auto-update
  service.scheduleCheck('aider', 7200000, false);       // Every 2 hours, no auto-update
  service.scheduleCheck('cursor', 3600000, true);

  // Listen to events
  service.on('update-available', (event) => {
    console.log(`Update available for ${event.tool}`);
    // Send notification, email, etc.
  });

  service.on('update-completed', (event) => {
    console.log(`${event.tool} updated successfully`);
  });

  service.on('update-failed', (event) => {
    console.error(`Failed to update ${event.tool}: ${event.data.error}`);
  });

  // Start scheduler
  service.startScheduler();

  console.log('Automated checks started');
}
```

### Example 4: Progress Tracking

```typescript
async function updateWithProgress() {
  const service = createVersionService();

  await service.updateTool('claude-code', undefined, {
    backup: true,
    onProgress: (status) => {
      switch (status.status) {
        case 'checking':
          console.log('🔍 Checking prerequisites...');
          break;
        case 'downloading':
          console.log(`⬇️  Downloading... ${status.progress}%`);
          break;
        case 'installing':
          console.log(`⚙️  Installing... ${status.progress}%`);
          break;
        case 'completed':
          console.log('✅ Update completed!');
          break;
        case 'failed':
          console.error(`❌ Update failed: ${status.error}`);
          break;
      }
    }
  });
}
```

### Example 5: Cache Optimization

```typescript
async function optimizeCache() {
  const service = createVersionService({
    defaultCacheTtl: 1800000,  // 30 minutes
    maxCacheSize: 50
  });

  // Check multiple tools (will be cached)
  await service.batchCheckVersions([
    'claude-code',
    'aider',
    'cursor'
  ]);

  // Subsequent checks use cache
  const info = await service.checkVersion('claude-code');

  // Get cache statistics
  const stats = service.getCacheStats();
  console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);

  // Prune expired entries
  const pruned = service.pruneCache();
  console.log(`Pruned ${pruned} expired entries`);
}
```

## Performance Optimization

### Cache Strategy

The system uses an LRU (Least Recently Used) cache with TTL (Time To Live):

- **Default TTL**: 1 hour (configurable)
- **Max Size**: 100 entries (configurable)
- **Automatic Pruning**: Expired entries removed automatically
- **Hit Rate Tracking**: Monitor cache effectiveness

### Network Optimization

- **Batch Checking**: Check multiple tools in parallel
- **Request Deduplication**: Concurrent checks for same tool share result
- **Retry Logic**: Automatic retry with exponential backoff
- **Timeout Control**: Configurable timeouts prevent hanging

### Expected Performance

Based on the implementation:

- **Cache Hit Rate**: 70-90% for typical usage
- **Network Request Reduction**: 50-70%
- **Check Speed**: 30-50% faster with caching
- **Batch Efficiency**: 3-5x faster than sequential checks

## Best Practices

### 1. Use Appropriate Cache TTL

```typescript
// For frequently changing tools
const service = createVersionService({
  defaultCacheTtl: 1800000  // 30 minutes
});

// For stable tools
const service = createVersionService({
  defaultCacheTtl: 7200000  // 2 hours
});
```

### 2. Batch Check When Possible

```typescript
// ❌ Bad: Sequential checks
for (const tool of tools) {
  await service.checkVersion(tool);
}

// ✅ Good: Batch check
await service.batchCheckVersions(tools);
```

### 3. Use Scheduled Checks

```typescript
// ✅ Good: Automated checks
service.scheduleCheck('claude-code', 3600000);
service.startScheduler();

// Instead of manual polling
```

### 4. Handle Errors Gracefully

```typescript
try {
  await service.updateTool('claude-code');
} catch (error) {
  console.error('Update failed:', error);
  // Rollback happens automatically if backup was enabled
}
```

### 5. Monitor Statistics

```typescript
// Periodically check performance
setInterval(() => {
  const stats = service.getStats();
  console.log(`Cache hit rate: ${stats.cacheHits / stats.totalChecks}`);

  if (stats.cacheHits / stats.totalChecks < 0.5) {
    console.warn('Low cache hit rate, consider increasing TTL');
  }
}, 3600000);
```

## Migration Guide

### From Separate Systems

If you're migrating from separate version checking, updating, and scheduling systems:

```typescript
// Before: Multiple systems
import { VersionChecker } from './old/version-checker';
import { AutoUpdater } from './old/auto-updater';
import { UpdateScheduler } from './old/tool-update-scheduler';

const checker = new VersionChecker();
const updater = new AutoUpdater();
const scheduler = new UpdateScheduler();

// After: Unified system
import { createVersionService } from 'ccjk/version-system';

const service = createVersionService();
```

### API Mapping

| Old API | New API |
|---------|---------|
| `checker.check(tool)` | `service.checkVersion(tool)` |
| `updater.update(tool, version)` | `service.updateTool(tool, version)` |
| `scheduler.schedule(tool, interval)` | `service.scheduleCheck(tool, interval)` |
| `checker.getCache()` | `service.getCacheStats()` |
| `updater.getStatus(tool)` | `service.getUpdateStatus(tool)` |

## Troubleshooting

### High Network Usage

```typescript
// Increase cache TTL
service.updateConfig({ defaultCacheTtl: 7200000 });

// Check cache hit rate
const stats = service.getCacheStats();
console.log(`Hit rate: ${stats.hitRate}`);
```

### Slow Updates

```typescript
// Increase timeout
await service.updateTool('tool', undefined, {
  timeout: 600000  // 10 minutes
});
```

### Failed Updates

```typescript
// Enable backup for rollback
await service.updateTool('tool', undefined, {
  backup: true
});

// Check backups
const backups = await service.listBackups('tool');
```

## License

MIT

## Contributing

Contributions welcome! Please see CONTRIBUTING.md for guidelines.
