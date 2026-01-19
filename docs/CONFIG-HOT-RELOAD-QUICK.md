# Configuration Hot-Reload - Quick Reference

## Quick Start

### 1. Initialize (One Line)

```typescript
import { initializeConfigHotReload } from './config-hot-reload-integration'
await initializeConfigHotReload()
```

### 2. Get Configuration

```typescript
import { getConfigManager } from './config-manager'
const config = await getConfigManager().getConfig()
```

### 3. Subscribe to Changes

```typescript
getConfigManager().subscribe((event) => {
  console.log('Config updated:', event.changedKeys)
})
```

## Common Use Cases

### React to Model Changes

```typescript
getConfigManager().on('settings-updated', (event) => {
  if (event.changedKeys?.includes('settings.model')) {
    reinitializeApiClient(event.current.settings.model)
  }
})
```

### Update Configuration

```typescript
await getConfigManager().updateConfig({
  settings: { model: 'claude-opus-4-20250514' }
}, 'cli')
```

### Force Reload

```typescript
await getConfigManager().reloadConfig()
```

### Cleanup on Shutdown

```typescript
await getConfigManager().dispose()
```

## Configuration Options

```typescript
initializeConfigHotReload({
  enableFileWatch: true,        // Watch local files
  enableCloudSync: false,       // Sync from cloud
  cloudSyncInterval: 300000,    // 5 minutes
  cloudApiEndpoint: 'https://api.example.com',
  cloudApiKey: 'your-key'
})
```

## Events Reference

| Event | When | Use For |
|-------|------|---------|
| `config-updated` | Any change | General updates |
| `settings-updated` | Settings changed | Model/API changes |
| `providers-updated` | Providers changed | Provider list updates |
| `error` | Error occurred | Error handling |

## Priority Order

1. **CLI** - Command line arguments (highest)
2. **Env** - Environment variables
3. **Local** - Local config files
4. **Cloud** - Cloud API
5. **Default** - Default values (lowest)

## File Structure

```
src/
├── config-watcher.ts              # File watching
├── cloud-config-sync.ts           # Cloud sync
├── config-manager.ts              # Main manager
└── config-hot-reload-integration.ts  # Examples

tests/
├── config-watcher.test.ts         # Watcher tests
├── cloud-config-sync.test.ts      # Sync tests
└── config-manager.test.ts         # Manager tests

docs/
├── CONFIG-HOT-RELOAD.md           # Full documentation
├── CONFIG-HOT-RELOAD-SUMMARY.md   # Implementation summary
└── CONFIG-HOT-RELOAD-QUICK.md     # This file
```

## Testing

```bash
# Run all tests
pnpm test

# Run specific test
pnpm test config-manager

# With coverage
pnpm test:coverage
```

## Troubleshooting

### Changes Not Detected?
- Check `enableFileWatch: true`
- Verify file path is correct
- Check file permissions

### Cloud Sync Not Working?
- Check `enableCloudSync: true`
- Verify API endpoint and key
- Check network connectivity

### High Memory Usage?
- Reduce watched files
- Increase debounce delay
- Increase sync interval

## Best Practices

✅ **DO:**
- Initialize early in application startup
- Subscribe to specific events you need
- Unsubscribe when components are destroyed
- Handle errors gracefully
- Dispose on shutdown

❌ **DON'T:**
- Modify returned config objects directly
- Subscribe to all events if you only need specific ones
- Forget to unsubscribe
- Ignore error events
- Set sync interval too low

## Example: Complete Integration

```typescript
import { initializeConfigHotReload, shutdownConfigHotReload } from './config-hot-reload-integration'
import { getConfigManager } from './config-manager'

async function main() {
  // 1. Initialize
  await initializeConfigHotReload({
    enableFileWatch: true,
    enableCloudSync: true
  })

  // 2. Get config
  const manager = getConfigManager()
  const config = await manager.getConfig()
  console.log('Model:', config.settings.model)

  // 3. Subscribe to changes
  const unsubscribe = manager.subscribe((event) => {
    console.log('Config updated from:', event.source)
    // React to changes...
  })

  // 4. Handle errors
  manager.on('error', (error) => {
    console.error('Config error:', error)
  })

  // 5. Your application code...
  await runApplication(config)

  // 6. Cleanup on shutdown
  process.on('SIGINT', async () => {
    unsubscribe()
    await shutdownConfigHotReload()
    process.exit(0)
  })
}

main().catch(console.error)
```

## API Cheat Sheet

### ConfigManager

```typescript
// Get instance
const manager = getConfigManager()

// Initialize
await manager.initialize()

// Get config
const config = await manager.getConfig()

// Update config
await manager.updateConfig({ settings: { model: 'opus' } }, 'cli')

// Reload
await manager.reloadConfig()

// Subscribe
const unsub = manager.subscribe(callback)
unsub() // Unsubscribe

// Events
manager.on('config-updated', callback)
manager.on('settings-updated', callback)
manager.on('providers-updated', callback)
manager.on('error', callback)

// Metadata
const meta = manager.getMetadata()

// Status
const initialized = manager.isInitialized()

// Cleanup
await manager.dispose()
```

### ConfigWatcher

```typescript
import { ConfigWatcher } from './config-watcher'

const watcher = new ConfigWatcher({ debounceMs: 300 })

// Watch files
watcher.watch('/path/to/config.json')
watcher.watch(['/path/1.json', '/path/2.json'])

// Events
watcher.on('config-changed', callback)
watcher.on('config-removed', callback)
watcher.on('ready', callback)
watcher.on('error', callback)

// Subscribe
const unsub = watcher.onConfigChange(callback)

// Status
const watching = watcher.isWatching('/path/to/config.json')
const paths = watcher.getWatchedPaths()

// Stop
await watcher.stopWatching()
```

### CloudConfigSync

```typescript
import { CloudConfigSync } from './cloud-config-sync'

const sync = new CloudConfigSync({
  syncInterval: 300000,
  timeout: 5000,
  apiEndpoint: 'https://api.example.com'
})

// Start/stop
sync.startSync()
sync.stopSync()

// Force sync
await sync.forceSync()

// Events
sync.on('config-updated', callback)
sync.on('sync-started', callback)
sync.on('sync-completed', callback)
sync.on('sync-failed', callback)
sync.on('error', callback)

// Subscribe
const unsub = sync.onConfigUpdate(callback)

// Status
const active = sync.isActive()
const stats = sync.getStats()
```

## Performance Tips

- **Debounce:** Default 300ms is good for most cases
- **Sync Interval:** 5 minutes is reasonable for cloud sync
- **File Watching:** Only watch files that actually change
- **Event Subscriptions:** Unsubscribe when not needed
- **Deep Copy:** Config returns are deep copied (safe to use)

## Security Tips

- Store API keys in environment variables
- Use HTTPS for cloud endpoints
- Validate configuration before applying
- Set appropriate file permissions
- Audit configuration changes

## Links

- **Full Documentation:** [CONFIG-HOT-RELOAD.md](./CONFIG-HOT-RELOAD.md)
- **Implementation Summary:** [CONFIG-HOT-RELOAD-SUMMARY.md](./CONFIG-HOT-RELOAD-SUMMARY.md)
- **Integration Examples:** `src/config-hot-reload-integration.ts`
- **Test Examples:** `tests/config-*.test.ts`

---

**Need Help?**
1. Check full documentation
2. Review test files for examples
3. Check GitHub issues
4. Create new issue with details
