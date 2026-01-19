# Skill Hot Reload System

## Overview

The Skill Hot Reload System provides automatic detection and reloading of SKILL.md files in CCJK. When a skill file is added, modified, or deleted, the system automatically updates the skill cache and emits events for downstream consumers.

## Features

- **Automatic File Watching**: Monitors skill directories for SKILL.md file changes
- **Event-Driven Architecture**: Emits events for skill additions, changes, and removals
- **Debouncing**: Prevents excessive reloads during rapid file changes
- **Cache Integration**: Automatically updates the skill cache on file changes
- **Error Handling**: Graceful error handling with detailed error events
- **Configurable**: Flexible options for customizing watch behavior

## Architecture

### Core Components

1. **SkillHotReloadManager**: Main class that manages file watching and event emission
2. **SkillDiscovery**: Discovers skill directories and loads skill files
3. **SkillCache**: Caches loaded skills for performance
4. **Chokidar**: File system watcher library

### Event Flow

```
File Change → Chokidar Watcher → Debounce → Load Skill → Update Cache → Emit Event
```

## Usage

### Basic Usage

```typescript
import { createSkillHotReloader } from './utils/skill-md/hot-reload'

// Create hot reloader instance
const reloader = createSkillHotReloader({
  ignoreInitial: true,
  debounceMs: 300,
})

// Listen for skill events
reloader.on('skill-added', (event) => {
  console.log('New skill added:', event.skill.metadata.name)
})

reloader.on('skill-changed', (event) => {
  console.log('Skill updated:', event.skill.metadata.name)
})

reloader.on('skill-removed', (event) => {
  console.log('Skill removed:', event.skillName)
})

reloader.on('error', (error, context) => {
  console.error('Hot reload error:', error.message, 'Context:', context)
})

// Start watching (uses default skill directories)
reloader.watch()

// Or watch specific directories
reloader.watch(['/path/to/skills', '/another/path'])

// Stop watching when done
reloader.stop()
```

### Advanced Usage

```typescript
import { SkillHotReloadManager } from './utils/skill-md/hot-reload'
import { SkillDiscovery } from './utils/skill-md/discovery'
import { SkillCache } from './utils/skill-md/cache'

// Create custom instances
const discovery = new SkillDiscovery()
const cache = new SkillCache()

const reloader = new SkillHotReloadManager(discovery, cache, {
  ignoreInitial: false,  // Process existing files on startup
  debounceMs: 500,       // Wait 500ms before processing changes
  watchAdded: true,      // Watch for new files
  watchChanged: true,    // Watch for file modifications
  watchRemoved: true,    // Watch for file deletions
})

// Manual skill reload
await reloader.reloadSkill('skill-name')

// Reload all skills
await reloader.reloadAll()
```

## Configuration Options

### HotReloadOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ignoreInitial` | boolean | `true` | Ignore existing files when starting watcher |
| `debounceMs` | number | `300` | Milliseconds to wait before processing file changes |
| `watchAdded` | boolean | `true` | Watch for new SKILL.md files |
| `watchChanged` | boolean | `true` | Watch for modifications to SKILL.md files |
| `watchRemoved` | boolean | `true` | Watch for deleted SKILL.md files |

## Events

### skill-added

Emitted when a new SKILL.md file is created.

```typescript
interface HotReloadEvent {
  type: 'added'
  skill: Skill
  skillName: string
  filePath: string
  timestamp: Date
}
```

### skill-changed

Emitted when an existing SKILL.md file is modified.

```typescript
interface HotReloadEvent {
  type: 'changed'
  skill: Skill
  skillName: string
  filePath: string
  timestamp: Date
}
```

### skill-removed

Emitted when a SKILL.md file is deleted.

```typescript
interface HotReloadEvent {
  type: 'removed'
  skillName: string
  filePath: string
  timestamp: Date
}
```

### error

Emitted when an error occurs during hot reload.

```typescript
reloader.on('error', (error: Error, context: string) => {
  // context can be: 'load', 'cache', 'watcher'
})
```

### ready

Emitted when the file watcher is ready and monitoring files.

```typescript
reloader.on('ready', () => {
  console.log('Hot reload system is ready')
})
```

## Implementation Details

### File Watching Strategy

The hot reload system uses a directory-based watching strategy rather than glob patterns:

1. **Watch Directories**: Monitors skill directories directly
2. **Filter Files**: Filters for SKILL.md files in event handlers
3. **Recursive Watching**: Watches all subdirectories (depth: 99)

This approach was chosen because:
- More reliable in test environments
- Better performance on macOS
- Simpler event handling logic

### Debouncing

File changes are debounced to prevent excessive reloads:

1. File change detected
2. Wait for `debounceMs` milliseconds
3. If no more changes, process the file
4. If more changes occur, reset the timer

This is especially useful when:
- Editors save files multiple times
- Large files are being written
- Multiple files are being modified

### Cache Integration

The hot reload system automatically updates the skill cache:

- **Added**: Skill is loaded and added to cache
- **Changed**: Skill is reloaded and cache is updated
- **Removed**: Skill is removed from cache

This ensures the cache is always in sync with the file system.

## Testing

The hot reload system includes comprehensive unit tests:

```bash
npm test -- tests/unit/utils/skill-md/hot-reload.test.ts
```

Test coverage includes:
- Basic watch/stop functionality
- Skill addition detection
- Skill modification detection
- Skill deletion detection
- Error handling
- Cache integration
- Debouncing behavior

## Troubleshooting

### Events Not Firing

If file change events are not being detected:

1. Check that the watcher is started: `reloader.watch()`
2. Verify the skill directories exist
3. Ensure files are named exactly `SKILL.md` (case-sensitive)
4. Check that `ignoreInitial` is set correctly
5. Wait for the `ready` event before making changes

### Performance Issues

If the system is slow or consuming too many resources:

1. Increase `debounceMs` to reduce reload frequency
2. Disable unused watch options (`watchAdded`, `watchChanged`, `watchRemoved`)
3. Watch specific directories instead of using defaults
4. Check for excessive file system activity

### Memory Leaks

Always stop the watcher when done:

```typescript
// In cleanup code
reloader.stop()
```

This prevents file handles from remaining open and consuming memory.

## Future Enhancements

Potential improvements for future versions:

1. **Batch Processing**: Process multiple file changes in a single batch
2. **Incremental Updates**: Only reload changed sections of skills
3. **Dependency Tracking**: Reload dependent skills when a skill changes
4. **Remote Watching**: Watch skills on remote file systems
5. **Performance Metrics**: Track reload times and event frequencies
6. **Conflict Resolution**: Handle concurrent modifications gracefully

## Related Documentation

- [Skill Discovery System](./skill-discovery.md)
- [Skill Cache System](./skill-cache.md)
- [SKILL.md Format](./skill-format.md)
- [CCJK Architecture](./architecture.md)

## API Reference

### SkillHotReloadManager

```typescript
class SkillHotReloadManager extends EventEmitter {
  constructor(
    discovery: SkillDiscovery,
    cache: SkillCache,
    options?: Partial<HotReloadOptions>
  )

  watch(skillsDirs?: string[]): void
  stop(): void
  reloadSkill(skillName: string): Promise<void>
  reloadAll(): Promise<void>
}
```

### Factory Function

```typescript
function createSkillHotReloader(
  options?: Partial<HotReloadOptions>
): SkillHotReloadManager
```

Creates a hot reloader with default discovery and cache instances.

## License

Part of the CCJK (Claude Code JSON Kit) project.
