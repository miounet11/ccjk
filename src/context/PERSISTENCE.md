# Context Persistence

## Overview

The Context Persistence system provides SQLite-based persistent storage for compressed contexts across sessions. This allows CCJK to maintain context history and restore previous sessions automatically.

## Features

- **Persistent Storage**: Contexts are stored in SQLite database at `~/.ccjk/context/contexts.db`
- **Project-Based Organization**: Contexts are organized by project hash for easy retrieval
- **Automatic Migration**: Seamlessly migrates existing in-memory cache to persistent storage
- **Session Restoration**: Automatically loads recent contexts on startup
- **Statistics & Analytics**: Track compression ratios, token savings, and access patterns
- **Import/Export**: Backup and restore contexts as JSON
- **Cleanup**: Automatic cleanup of old contexts to manage disk space

## Architecture

### Database Schema

```sql
CREATE TABLE contexts (
  id TEXT PRIMARY KEY,
  project_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  compressed TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  strategy TEXT NOT NULL,
  original_tokens INTEGER NOT NULL,
  compressed_tokens INTEGER NOT NULL,
  compression_ratio REAL NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  timestamp INTEGER NOT NULL,
  last_accessed INTEGER NOT NULL,
  access_count INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE projects (
  hash TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  context_count INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}'
);
```

### Key Components

1. **ContextPersistence**: Main persistence manager
2. **Migration Utilities**: Tools for migrating between cache and persistence
3. **ContextManager Integration**: Automatic persistence in compression workflow

## Usage

### Basic Usage

```typescript
import { ContextManager } from '@/context'

// Create manager with persistence enabled
const manager = new ContextManager({
  enablePersistence: true,
  projectHash: 'my-project-hash',
})

// Compress and automatically persist
const compressed = await manager.compress({
  id: 'context-1',
  content: 'Large context content...',
  timestamp: Date.now(),
})

// Context is automatically saved to SQLite
```

### Direct Persistence API

```typescript
import { getContextPersistence } from '@/context'

const persistence = getContextPersistence()

// Save a context
persistence.saveContext(compressedContext, 'project-hash')

// Retrieve a context
const context = persistence.getContext('context-id')

// Get all contexts for a project
const contexts = persistence.getProjectContexts('project-hash', {
  limit: 10,
  sortBy: 'lastAccessed',
  sortOrder: 'desc',
})

// Get statistics
const stats = persistence.getStats('project-hash')
console.log(`Total contexts: ${stats.totalContexts}`)
console.log(`Average compression: ${stats.averageCompressionRatio * 100}%`)
```

### Migration

```typescript
import {
  migrateCacheToPersistence,
  restoreCacheFromPersistence,
  syncCacheAndPersistence,
  verifyMigration,
} from '@/context'

// Migrate existing cache to persistence
const result = await migrateCacheToPersistence(
  cache,
  'project-hash',
  persistence,
)

console.log(`Migrated ${result.migratedCount} contexts`)

// Restore cache from persistence
await restoreCacheFromPersistence(cache, 'project-hash', persistence, 100)

// Bidirectional sync
await syncCacheAndPersistence(cache, 'project-hash', persistence)

// Verify integrity
const verification = await verifyMigration(cache, 'project-hash', persistence)
console.log(`Matched: ${verification.matched}`)
console.log(`Cache only: ${verification.cacheOnly}`)
console.log(`Persistence only: ${verification.persistenceOnly}`)
```

### Cleanup

```typescript
import { getContextPersistence } from '@/context'

const persistence = getContextPersistence()

// Clean up contexts older than 30 days
const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
const removed = persistence.cleanup(maxAge)
console.log(`Removed ${removed} old contexts`)

// Vacuum database to reclaim space
persistence.vacuum()
```

### Import/Export

```typescript
import { getContextPersistence } from '@/context'
import { writeFileSync, readFileSync } from 'node:fs'

const persistence = getContextPersistence()

// Export contexts to JSON
const contexts = persistence.exportContexts('project-hash')
writeFileSync('contexts-backup.json', JSON.stringify(contexts, null, 2))

// Import contexts from JSON
const backup = JSON.parse(readFileSync('contexts-backup.json', 'utf-8'))
const imported = persistence.importContexts(backup)
console.log(`Imported ${imported} contexts`)
```

## Configuration

### ContextManager Configuration

```typescript
const manager = new ContextManager({
  // Enable/disable persistence (default: true)
  enablePersistence: true,

  // Project hash for organizing contexts
  projectHash: 'my-project-hash',

  // Standard context manager options
  defaultStrategy: CompressionStrategy.BALANCED,
  enableCache: true,
  maxCacheSize: 10 * 1024 * 1024,
  maxCacheEntries: 1000,
})
```

### Custom Database Path

```typescript
import { createContextPersistence } from '@/context'

// Use custom database location
const persistence = createContextPersistence('/custom/path/contexts.db')
```

## Performance

### Benchmarks

- **Save Context**: ~1-2ms per context
- **Retrieve Context**: ~0.5-1ms per context
- **Query 100 Contexts**: ~5-10ms
- **Database Size**: ~1KB per context (varies with content size)
- **Startup Load**: ~50-100ms for 100 contexts

### Optimization Tips

1. **WAL Mode**: Database uses Write-Ahead Logging for better concurrency
2. **Indexes**: Optimized indexes on project_hash, timestamp, and access patterns
3. **Batch Operations**: Use transactions for bulk operations
4. **Cache Integration**: Hot contexts stay in memory cache
5. **Lazy Loading**: Only loads recent contexts on startup

## Storage Management

### Database Location

```
~/.ccjk/context/
├── contexts.db          # Main database
├── contexts.db-wal      # Write-ahead log
└── contexts.db-shm      # Shared memory
```

### Disk Space

- Average context: ~1KB
- 1000 contexts: ~1MB
- 10,000 contexts: ~10MB
- 100,000 contexts: ~100MB

### Cleanup Strategy

```typescript
// Recommended cleanup schedule
const CLEANUP_INTERVALS = {
  // Clean contexts older than 30 days
  daily: 30 * 24 * 60 * 60 * 1000,

  // Clean contexts older than 7 days for completed projects
  weekly: 7 * 24 * 60 * 60 * 1000,

  // Vacuum database monthly
  monthly: () => persistence.vacuum(),
}
```

## Migration from In-Memory Cache

### Automatic Migration

When persistence is enabled, the ContextManager automatically:

1. Loads recent contexts from persistence on startup
2. Saves new contexts to both cache and persistence
3. Maintains consistency between cache and persistence

### Manual Migration

For existing deployments with in-memory cache:

```typescript
import { ContextManager, migrateCacheToPersistence } from '@/context'

// Get existing manager with cache
const manager = new ContextManager({ enablePersistence: false })

// Migrate to persistence
const result = await migrateCacheToPersistence(
  manager['cache'], // Access private cache
  'project-hash',
)

if (result.success) {
  console.log(`Successfully migrated ${result.migratedCount} contexts`)
} else {
  console.error('Migration failed:', result.errors)
}
```

## Error Handling

```typescript
try {
  const persistence = getContextPersistence()
  persistence.saveContext(context, projectHash)
} catch (error) {
  console.error('Failed to save context:', error)
  // Fallback to in-memory cache only
}
```

## Testing

See `src/context/__tests__/persistence.test.ts` and `src/context/__tests__/migration.test.ts` for comprehensive test examples.

```bash
# Run persistence tests
pnpm test persistence

# Run migration tests
pnpm test migration

# Run all context tests
pnpm test context
```

## Troubleshooting

### Database Locked

```typescript
// WAL mode prevents most locking issues
// If you encounter locks, ensure proper cleanup:
persistence.close()
```

### Corrupted Database

```bash
# Backup and recreate
mv ~/.ccjk/context/contexts.db ~/.ccjk/context/contexts.db.backup
# Database will be recreated on next use
```

### Large Database Size

```typescript
// Clean up old contexts
persistence.cleanup(7 * 24 * 60 * 60 * 1000) // 7 days

// Vacuum to reclaim space
persistence.vacuum()

// Check size
const stats = persistence.getStats()
console.log(`Database size: ${stats.totalSize / 1024 / 1024}MB`)
```

## FTS5 Full-Text Search

### Overview

The persistence layer now includes FTS5 (Full-Text Search 5) for fast, powerful search capabilities:

- **Sub-10ms Search**: Fast search on datasets up to 5000 contexts
- **Rich Query Syntax**: Phrases, boolean operators (AND, OR, NOT), NEAR
- **BM25 Ranking**: Industry-standard relevance ranking
- **Snippet Generation**: Automatic excerpt generation with highlighted matches
- **Automatic Sync**: Triggers keep FTS5 index synchronized

### Basic Search

```typescript
import { getContextPersistence } from '@/context'

const persistence = getContextPersistence()

// Simple keyword search
const results = persistence.searchContexts('authentication')

// Multi-keyword search
const results = persistence.searchContexts('database migration')

// Phrase search
const results = persistence.searchContexts('"user authentication"')

// Boolean operators
const results = persistence.searchContexts('JWT AND authentication')
const results = persistence.searchContexts('API OR GraphQL')
const results = persistence.searchContexts('security NOT deprecated')

// Access results
results.forEach(result => {
  console.log(`ID: ${result.id}`)
  console.log(`Rank: ${result.rank}`) // BM25 score
  console.log(`Snippet: ${result.snippet}`) // Highlighted excerpt
})
```

### Search with Filters

```typescript
// Filter by project
const results = persistence.searchContexts('API', {
  projectHash: 'project-hash-123',
})

// Filter by time range
const results = persistence.searchContexts('authentication', {
  startTime: Date.now() - 86400000, // Last 24 hours
  limit: 20,
})

// Sort by different criteria
const results = persistence.searchContexts('database', {
  sortBy: 'relevance', // Default for search
  sortOrder: 'desc',
})
```

### Hot/Warm/Cold Context Queries

Optimized queries for different access patterns:

```typescript
// Hot contexts: frequently accessed, recently used
const hot = persistence.getHotContexts('project-hash', 10)

// Warm contexts: accessed multiple times but not recently
const warm = persistence.getWarmContexts('project-hash', 10)

// Cold contexts: rarely accessed, candidates for cleanup
const cold = persistence.getColdContexts('project-hash', 10)

// Use for cache management
if (cacheSize > maxSize) {
  const toEvict = persistence.getColdContexts(projectHash, 100)
  toEvict.forEach(ctx => cache.evict(ctx.id))
}
```

### FTS5 Query Syntax

| Query | Description | Example |
|-------|-------------|----------|
| `word` | Single keyword | `authentication` |
| `word1 word2` | Multiple keywords (OR) | `database migration` |
| `"phrase"` | Exact phrase | `"user authentication"` |
| `AND` | Both terms must match | `JWT AND authentication` |
| `OR` | Either term must match | `API OR GraphQL` |
| `NOT` | Exclude term | `security NOT deprecated` |
| `()` | Grouping | `(auth OR security) AND JWT` |
| `NEAR(n)` | Terms within n tokens | `user NEAR/5 authentication` |
| `*` | Prefix match | `auth*` |

### Performance Benchmarks

| Dataset Size | Operation | Avg Time | Throughput |
|--------------|-----------|----------|------------|
| 100 contexts | Single keyword | 2-3ms | 400 ops/sec |
| 1000 contexts | Single keyword | 5-8ms | 150 ops/sec |
| 5000 contexts | Single keyword | 8-12ms | 100 ops/sec |
| 1000 contexts | Complex query | 10-15ms | 80 ops/sec |
| 1000 contexts | Hot contexts | 1-2ms | 600 ops/sec |

### Testing

```bash
# Run FTS5 search tests
pnpm vitest src/context/__tests__/fts5-search.test.ts

# Run search performance benchmark
pnpm tsx scripts/benchmark-fts5-search.ts
```

## Future Enhancements

- [x] Full-text search on context content (FTS5 implemented)
- [ ] Cloud sync integration
- [ ] Compression of stored contexts
- [ ] Context versioning and history
- [ ] Multi-project context sharing
- [ ] Automatic backup to cloud storage
- [ ] Context analytics dashboard

## Related Documentation

- [Context System Overview](./CLAUDE.md)
- [Compression Strategies](./compression/README.md)
- [Cache Management](./cache.ts)
- [Analytics](./analytics.ts)
