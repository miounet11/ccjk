# Context Persistence Quick Start

## What is Context Persistence?

Context Persistence automatically saves your compressed contexts to a SQLite database, allowing them to survive CLI restarts and be restored in future sessions.

## Quick Start

### 1. Enable Persistence (Default)

Persistence is enabled by default when using ContextManager:

```typescript
import { ContextManager } from 'ccjk/context'

const manager = new ContextManager({
  projectHash: 'my-project-hash', // Required for persistence
})
```

### 2. Compress and Auto-Save

```typescript
const compressed = await manager.compress({
  id: 'unique-id',
  content: 'Your large context content here...',
  timestamp: Date.now(),
})

// Context is automatically:
// 1. Compressed using optimal strategy
// 2. Cached in memory for fast access
// 3. Persisted to SQLite database
```

### 3. Automatic Restoration

On next startup, recent contexts are automatically loaded:

```typescript
const manager = new ContextManager({
  projectHash: 'my-project-hash',
})

// Recent contexts are already loaded from persistence!
const cached = manager.getCached('unique-id')
```

## Common Operations

### Get Statistics

```typescript
const stats = manager.getPersistenceStats()

console.log(`Total contexts: ${stats.totalContexts}`)
console.log(`Total tokens saved: ${stats.totalOriginalTokens - stats.totalCompressedTokens}`)
console.log(`Average compression: ${(stats.averageCompressionRatio * 100).toFixed(1)}%`)
```

### Clean Up Old Contexts

```typescript
// Remove contexts older than 30 days
const maxAge = 30 * 24 * 60 * 60 * 1000
const removed = manager.cleanupPersistence(maxAge)

console.log(`Removed ${removed} old contexts`)
```

### Export for Backup

```typescript
import { writeFileSync } from 'node:fs'

const contexts = manager.exportPersistence()
writeFileSync('backup.json', JSON.stringify(contexts, null, 2))
```

### Import from Backup

```typescript
import { getContextPersistence } from 'ccjk/context'
import { readFileSync } from 'node:fs'

const persistence = getContextPersistence()
const backup = JSON.parse(readFileSync('backup.json', 'utf-8'))
const imported = persistence.importContexts(backup)

console.log(`Imported ${imported} contexts`)
```

## Advanced Usage

### Direct Persistence API

```typescript
import { getContextPersistence } from 'ccjk/context'

const persistence = getContextPersistence()

// Query contexts
const contexts = persistence.getProjectContexts('project-hash', {
  limit: 10,
  sortBy: 'lastAccessed',
  sortOrder: 'desc',
})

// Get specific context
const context = persistence.getContext('context-id')

// Delete context
persistence.deleteContext('context-id')

// Delete all contexts for a project
persistence.deleteProjectContexts('project-hash')
```

### Migration from In-Memory Cache

```typescript
import { migrateCacheToPersistence } from 'ccjk/context'

// Migrate existing cache to persistence
const result = await migrateCacheToPersistence(
  cache,
  'project-hash',
)

if (result.success) {
  console.log(`✓ Migrated ${result.migratedCount} contexts`)
} else {
  console.error('Migration failed:', result.errors)
}
```

### Custom Database Location

```typescript
import { createContextPersistence } from 'ccjk/context'

const persistence = createContextPersistence('/custom/path/contexts.db')
```

## Database Location

By default, contexts are stored at:
```
~/.ccjk/context/contexts.db
```

Additional files:
- `contexts.db-wal` - Write-ahead log
- `contexts.db-shm` - Shared memory

## Configuration Options

```typescript
const manager = new ContextManager({
  // Enable/disable persistence (default: true)
  enablePersistence: true,

  // Project hash for organizing contexts (required)
  projectHash: 'my-project-hash',

  // Standard options
  defaultStrategy: CompressionStrategy.BALANCED,
  enableCache: true,
  maxCacheSize: 10 * 1024 * 1024,
  maxCacheEntries: 1000,
})
```

## Disable Persistence

If you want to use only in-memory cache:

```typescript
const manager = new ContextManager({
  enablePersistence: false,
})
```

## Performance Tips

1. **Set Project Hash**: Always provide a project hash for better organization
2. **Regular Cleanup**: Schedule periodic cleanup of old contexts
3. **Vacuum Database**: Run `persistence.vacuum()` monthly to reclaim space
4. **Limit Queries**: Use `limit` parameter when querying many contexts
5. **Cache Hot Contexts**: Frequently accessed contexts stay in memory

## Troubleshooting

### Database Locked

```typescript
// Ensure proper cleanup
persistence.close()
```

### Large Database Size

```typescript
// Clean up old contexts
persistence.cleanup(7 * 24 * 60 * 60 * 1000) // 7 days

// Vacuum to reclaim space
persistence.vacuum()

// Check size
const stats = persistence.getStats()
console.log(`Database size: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`)
```

### Corrupted Database

```bash
# Backup and recreate
mv ~/.ccjk/context/contexts.db ~/.ccjk/context/contexts.db.backup
# Database will be recreated on next use
```

## Best Practices

1. **Always set project hash** for proper organization
2. **Clean up regularly** to manage disk space
3. **Export important contexts** for backup
4. **Monitor statistics** to track usage
5. **Use appropriate compression strategy** for your use case

## Examples

### Complete Workflow

```typescript
import { ContextManager, CompressionStrategy } from 'ccjk/context'

// Initialize with persistence
const manager = new ContextManager({
  projectHash: 'my-app-v1',
  defaultStrategy: CompressionStrategy.BALANCED,
})

// Compress and save
const context1 = await manager.compress({
  id: 'user-session-1',
  content: 'Large user session data...',
  timestamp: Date.now(),
  metadata: { userId: '123', sessionId: 'abc' },
})

// Later, retrieve from cache or persistence
const cached = manager.getCached('user-session-1')
if (!cached) {
  const persisted = manager.getPersistedContext('user-session-1')
  // Use persisted context
}

// Check statistics
const stats = manager.getPersistenceStats()
console.log(`Saved ${stats.totalOriginalTokens - stats.totalCompressedTokens} tokens`)

// Clean up old sessions (30 days)
const removed = manager.cleanupPersistence(30 * 24 * 60 * 60 * 1000)
console.log(`Cleaned up ${removed} old contexts`)
```

## API Reference

See [PERSISTENCE.md](../src/context/PERSISTENCE.md) for complete API documentation.

## Support

For issues or questions:
- Check [PERSISTENCE.md](../src/context/PERSISTENCE.md) for detailed documentation
- Review test files for usage examples
- Open an issue on GitHub
