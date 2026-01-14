# Configuration Hot-Reload System

## Overview

The Configuration Hot-Reload System provides automatic configuration updates for the CCJK project without requiring application restarts. It combines local file watching with cloud synchronization to ensure configuration stays up-to-date.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Configuration Manager                     │
│  (Unified configuration management with hot-reload support)  │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
    ┌───────────▼──────────┐      ┌──────────▼──────────┐
    │   Config Watcher     │      │  Cloud Config Sync  │
    │ (File monitoring)    │      │ (Cloud sync)        │
    └──────────────────────┘      └─────────────────────┘
                │                             │
    ┌───────────▼──────────┐      ┌──────────▼──────────┐
    │  Local Config Files  │      │   Cloud API         │
    │  - settings.json     │      │  - Provider presets │
    └──────────────────────┘      └─────────────────────┘
```

### Module Responsibilities

#### 1. **ConfigWatcher** (`src/config-watcher.ts`)
- Monitors local configuration files for changes
- Debounces rapid file changes
- Parses JSON configuration files
- Emits events on configuration changes

**Key Features:**
- File system watching with `chokidar`
- Configurable debounce delay (default: 300ms)
- Automatic JSON parsing with error handling
- Support for multiple file paths
- Event-driven architecture

#### 2. **CloudConfigSync** (`src/cloud-config-sync.ts`)
- Synchronizes configuration from cloud API
- Periodic polling with configurable interval
- Retry mechanism with exponential backoff
- Change detection to avoid unnecessary updates

**Key Features:**
- Periodic sync (default: 5 minutes)
- Configurable timeout and retry logic
- Graceful degradation on failures
- Statistics tracking (success/failure counts)
- Event-driven notifications

#### 3. **ConfigManager** (`src/config-manager.ts`)
- Unified configuration management
- Combines file watching and cloud sync
- Thread-safe configuration updates
- Configuration priority handling
- Event-driven change notifications

**Key Features:**
- Configuration priority: CLI > Env > Local > Cloud
- Deep merge for partial updates
- Version tracking and metadata
- Subscribe/unsubscribe pattern
- Automatic initialization

## Installation

The hot-reload system is built into CCJK. No additional installation is required.

## Usage

### Basic Setup

```typescript
import { initializeConfigHotReload } from './config-hot-reload-integration'

// Initialize during application startup
await initializeConfigHotReload({
  enableFileWatch: true,
  enableCloudSync: true,
  cloudSyncInterval: 300000 // 5 minutes
})
```

### Getting Configuration

```typescript
import { getConfigManager } from './config-manager'

const manager = getConfigManager()
const config = await manager.getConfig()

console.log('Current model:', config.settings.model)
console.log('Available providers:', config.providers.length)
```

### Subscribing to Changes

```typescript
const manager = getConfigManager()

// Subscribe to all configuration changes
const unsubscribe = manager.subscribe((event) => {
  console.log('Config updated from:', event.source)
  console.log('Changed keys:', event.changedKeys)

  // React to changes
  if (event.changedKeys?.includes('settings.model')) {
    console.log('Model changed to:', event.current.settings.model)
    // Reinitialize your API client, etc.
  }
})

// Later, unsubscribe
unsubscribe()
```

### Listening to Specific Events

```typescript
const manager = getConfigManager()

// Listen for settings updates
manager.on('settings-updated', (event) => {
  console.log('Settings updated:', event.current.settings)
})

// Listen for provider updates
manager.on('providers-updated', (event) => {
  console.log('Providers updated:', event.current.providers)
})

// Handle errors
manager.on('error', (error) => {
  console.error('Configuration error:', error)
})
```

### Updating Configuration

```typescript
const manager = getConfigManager()

// Update configuration programmatically
await manager.updateConfig({
  settings: {
    model: 'claude-opus-4-20250514',
    maxTokens: 8192
  }
}, 'cli') // Source: 'cli', 'env', 'local', 'cloud', or 'default'
```

### Force Reload

```typescript
const manager = getConfigManager()

// Force reload from disk and cloud
await manager.reloadConfig()
```

### Cleanup

```typescript
const manager = getConfigManager()

// Dispose when shutting down
await manager.dispose()
```

## Configuration Priority

The system follows a strict priority order when merging configurations:

1. **CLI Arguments** - Highest priority
2. **Environment Variables**
3. **Local Configuration Files**
4. **Cloud Configuration**
5. **Default Values** - Lowest priority

## Events

### ConfigManager Events

| Event | Description | Payload |
|-------|-------------|---------|
| `config-updated` | Any configuration change | `ConfigUpdateEvent` |
| `settings-updated` | Settings.json changed | `ConfigUpdateEvent` |
| `providers-updated` | API providers changed | `ConfigUpdateEvent` |
| `error` | Error occurred | `Error` |

### ConfigWatcher Events

| Event | Description | Payload |
|-------|-------------|---------|
| `config-changed` | File content changed | `ConfigChangeEvent` |
| `config-removed` | File was deleted | `ConfigChangeEvent` |
| `ready` | Watcher is ready | `void` |
| `error` | Error occurred | `Error` |

### CloudConfigSync Events

| Event | Description | Payload |
|-------|-------------|---------|
| `config-updated` | Cloud config changed | `CloudSyncEvent` |
| `sync-started` | Sync started | `CloudSyncEvent` |
| `sync-completed` | Sync completed | `CloudSyncEvent` |
| `sync-failed` | Sync failed | `CloudSyncEvent` |
| `error` | Error occurred | `Error` |

## API Reference

### ConfigManager

#### Constructor Options

```typescript
interface ConfigManagerOptions {
  enableFileWatch?: boolean        // Default: true
  enableCloudSync?: boolean        // Default: false
  cloudSyncInterval?: number       // Default: 300000 (5 min)
  watchDebounceMs?: number         // Default: 300
  cloudApiEndpoint?: string
  cloudApiKey?: string
  configPaths?: string[]
}
```

#### Methods

- `initialize(): Promise<void>` - Initialize the manager
- `dispose(): Promise<void>` - Cleanup and stop watching
- `getConfig(): Promise<ManagedConfig>` - Get current configuration
- `updateConfig(updates, source?): Promise<ManagedConfig>` - Update configuration
- `reloadConfig(): Promise<void>` - Force reload from all sources
- `subscribe(callback): () => void` - Subscribe to changes
- `getMetadata(): Metadata` - Get configuration metadata
- `isInitialized(): boolean` - Check if initialized

### ConfigWatcher

#### Constructor Options

```typescript
interface ConfigWatcherOptions {
  debounceMs?: number              // Default: 300
  ignoreInitial?: boolean          // Default: true
  parser?: (path: string) => Promise<any>
}
```

#### Methods

- `watch(paths): void` - Start watching files
- `stopWatching(): Promise<void>` - Stop watching
- `isWatching(path): boolean` - Check if path is watched
- `getWatchedPaths(): string[]` - Get all watched paths
- `onConfigChange(callback): () => void` - Subscribe to changes

### CloudConfigSync

#### Constructor Options

```typescript
interface CloudConfigSyncOptions {
  syncInterval?: number            // Default: 300000 (5 min)
  timeout?: number                 // Default: 5000
  maxRetries?: number              // Default: 3
  apiEndpoint?: string
  apiKey?: string
  syncOnStart?: boolean            // Default: true
}
```

#### Methods

- `startSync(): void` - Start periodic sync
- `stopSync(): void` - Stop periodic sync
- `forceSync(): Promise<void>` - Force immediate sync
- `isActive(): boolean` - Check if sync is active
- `getStats(): SyncStats` - Get sync statistics
- `onConfigUpdate(callback): () => void` - Subscribe to updates

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test config-manager
pnpm test config-watcher
pnpm test cloud-config-sync

# Run with coverage
pnpm test:coverage
```

### Test Files

- `tests/config-manager.test.ts` - ConfigManager tests
- `tests/config-watcher.test.ts` - ConfigWatcher tests
- `tests/cloud-config-sync.test.ts` - CloudConfigSync tests

### Test Coverage

All modules have comprehensive test coverage including:
- Unit tests for core functionality
- Integration tests for module interaction
- Edge case tests for error handling
- Concurrent update tests
- Performance tests

## Performance Considerations

### File Watching

- **Debouncing**: Rapid file changes are debounced (default: 300ms)
- **Efficient Parsing**: JSON parsing only on actual changes
- **Memory**: Minimal memory footprint with event-driven architecture

### Cloud Sync

- **Polling Interval**: Configurable (default: 5 minutes)
- **Change Detection**: Only emits events when configuration actually changes
- **Retry Logic**: Exponential backoff prevents API hammering
- **Timeout**: Configurable timeout prevents hanging requests

### Configuration Updates

- **Thread-Safe**: Update lock prevents race conditions
- **Deep Copy**: Returns deep copies to prevent external modifications
- **Efficient Merge**: Deep merge only updates changed values

## Error Handling

### Graceful Degradation

The system is designed to fail gracefully:

1. **File Watch Errors**: Logged but don't crash the application
2. **Cloud Sync Failures**: Falls back to local configuration
3. **Parse Errors**: Emits error event but continues watching
4. **Network Errors**: Retries with exponential backoff

### Error Events

All errors are emitted as events, allowing applications to handle them appropriately:

```typescript
manager.on('error', (error) => {
  console.error('Configuration error:', error)
  // Show notification, log to monitoring service, etc.
})
```

## Best Practices

### 1. Initialize Early

Initialize the hot-reload system during application startup:

```typescript
async function main() {
  await initializeConfigHotReload()
  // Rest of your application...
}
```

### 2. Subscribe to Relevant Changes

Only subscribe to configuration changes that affect your component:

```typescript
manager.on('settings-updated', (event) => {
  if (event.changedKeys?.includes('settings.model')) {
    // Only react to model changes
    reinitializeApiClient(event.current.settings.model)
  }
})
```

### 3. Cleanup on Shutdown

Always dispose the manager when shutting down:

```typescript
process.on('SIGINT', async () => {
  await manager.dispose()
  process.exit(0)
})
```

### 4. Handle Errors

Always handle configuration errors:

```typescript
manager.on('error', (error) => {
  logger.error('Configuration error:', error)
  // Optionally notify user or monitoring service
})
```

### 5. Use Unsubscribe

Unsubscribe from events when components are destroyed:

```typescript
const unsubscribe = manager.subscribe(callback)

// Later, when component is destroyed
unsubscribe()
```

## Troubleshooting

### File Changes Not Detected

1. Check if file watching is enabled: `enableFileWatch: true`
2. Verify file path is correct
3. Check file permissions
4. Ensure debounce delay hasn't been set too high

### Cloud Sync Not Working

1. Verify cloud sync is enabled: `enableCloudSync: true`
2. Check API endpoint and key configuration
3. Verify network connectivity
4. Check sync interval setting
5. Review error events for specific issues

### Configuration Not Updating

1. Check configuration priority (CLI > Env > Local > Cloud)
2. Verify update source matches priority
3. Check for update lock issues (concurrent updates)
4. Review error events

### High Memory Usage

1. Reduce number of watched files
2. Increase debounce delay
3. Increase cloud sync interval
4. Ensure proper cleanup with `dispose()`

## Migration Guide

### From Static Configuration

If you're currently using static configuration:

```typescript
// Before
import { API_PROVIDER_PRESETS } from './config/api-providers'
const providers = API_PROVIDER_PRESETS

// After
import { getConfigManager } from './config-manager'
const manager = getConfigManager()
const config = await manager.getConfig()
const providers = config.providers
```

### Adding Hot-Reload to Existing Code

1. Initialize the hot-reload system at startup
2. Replace static config reads with `manager.getConfig()`
3. Subscribe to relevant configuration changes
4. Update components when configuration changes
5. Add cleanup on shutdown

## Examples

See `src/config-hot-reload-integration.ts` for complete examples including:

- Basic initialization
- Configuration access
- Event subscription
- Programmatic updates
- Custom configuration paths
- Testing setup
- Cleanup procedures

## Contributing

When contributing to the hot-reload system:

1. Add tests for new features
2. Update documentation
3. Follow existing code style
4. Ensure backward compatibility
5. Add error handling
6. Update CHANGELOG.md

## License

Same as CCJK project license.

## Support

For issues or questions:
1. Check this documentation
2. Review test files for usage examples
3. Check GitHub issues
4. Create a new issue with detailed information
