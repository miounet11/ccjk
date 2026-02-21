# Persistence Manager

**Status**: Production Ready
**Version**: 1.0.0
**Last Updated**: 2026-02-21

---

## Overview

The Persistence Manager provides a comprehensive interface for managing CCJK's context persistence system. It allows you to view, search, export, import, and optimize stored contexts across hierarchical storage tiers (L0/L1/L2).

## Features

### 1. Context Management
- **List Contexts**: Paginated view of all stored contexts with metadata
- **Search Contexts**: Full-text search using SQLite FTS5 with ranking
- **View Details**: Detailed information about individual contexts
- **Delete Contexts**: Remove old or unwanted contexts

### 2. Import/Export
- **Export to JSON**: Export contexts for backup or migration
- **Import from JSON**: Restore contexts from backup files
- **Project-specific Export**: Export contexts for specific projects

### 3. Tier Management
- **L0 (Hot)**: <1 day, in-memory LRU cache, instant access
- **L1 (Warm)**: 1-7 days, indexed in database, fast retrieval
- **L2 (Cold)**: >7 days, lazy-loaded, slower access
- **Automatic Migration**: Contexts automatically move between tiers based on access patterns
- **Manual Migration**: Force tier optimization when needed

### 4. Database Operations
- **Statistics**: View global and project-specific statistics
- **Vacuum**: Reclaim disk space after deletions
- **Health Monitoring**: Track compression ratios and token savings

## Access Methods

### From Main Menu
```bash
npx ccjk
# Select option 'P' for Persistence Manager
```

### Direct Command
```bash
npx ccjk ccjk:persistence
# or
npx ccjk persistence
```

## Menu Options

### 1. List Stored Contexts
Displays all contexts with pagination:
- Context ID (first 8 characters)
- Compression algorithm
- Compression ratio
- Access count
- Age since last access

**Example Output**:
```
📋 Stored Contexts
────────────────────────────────────────────────────────────────────────────────
  a1b2c3d4... | semantic | 60.0% | 5 accesses | 2h 30m ago
  e5f6g7h8... | semantic | 55.5% | 12 accesses | 1d 5h ago
  i9j0k1l2... | semantic | 62.3% | 3 accesses | 3d 12h ago
```

### 2. Search Contexts
Full-text search with FTS5 support:

**Search Syntax**:
- Single term: `React`
- AND operator: `React AND TypeScript`
- OR operator: `React OR Vue`
- NOT operator: `React NOT hooks`
- Phrase search: `"error handling"`
- NEAR operator: `React NEAR/5 component`

**Example**:
```
Enter search query: React AND TypeScript

🔍 Search Results
────────────────────────────────────────────────────────────────────────────────
  a1b2c3d4... | semantic | 58.0% | rank: -2.45
    ...implementing <mark>React</mark> components with <mark>TypeScript</mark>...
  e5f6g7h8... | semantic | 61.2% | rank: -3.12
    ...<mark>TypeScript</mark> interfaces for <mark>React</mark> props...
```

### 3. View Context Details
Display comprehensive information about a specific context:
- Full context ID
- Project hash
- Compression algorithm and strategy
- Token counts (original and compressed)
- Compression ratio
- Access statistics
- Timestamps (created, last accessed)
- Metadata (if available)

**Example**:
```
📄 Context Details
────────────────────────────────────────────────────────────────────────────────
  ID: a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
  Project: project-hash-12345
  Algorithm: semantic
  Strategy: balanced
  Original Tokens: 1,500
  Compressed Tokens: 600
  Compression Ratio: 60.0%
  Access Count: 8
  Created: 2026-02-15 10:30:45
  Last Accessed: 2026-02-21 14:22:10
  Metadata:
    fileType: typescript
    category: component
```

### 4. Export Contexts
Export contexts to JSON format:
- Export all contexts or filter by project
- Specify custom output path
- Includes all metadata and statistics

**Example**:
```bash
Enter project hash (leave empty for all): project-123
Output file path: /path/to/backup/contexts-2026-02-21.json

✔ Exported 150 contexts to /path/to/backup/contexts-2026-02-21.json
```

**JSON Format**:
```json
[
  {
    "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
    "projectHash": "project-123",
    "content": "original content",
    "compressed": "compressed content",
    "algorithm": "semantic",
    "strategy": "balanced",
    "originalTokens": 1500,
    "compressedTokens": 600,
    "compressionRatio": 0.6,
    "metadata": "{}",
    "timestamp": 1708000000000,
    "lastAccessed": 1708500000000,
    "accessCount": 8
  }
]
```

### 5. Import Contexts
Import contexts from JSON backup:
- Validates JSON format
- Skips invalid entries
- Reports import count

**Example**:
```bash
Input file path: /path/to/backup/contexts-2026-02-21.json

✔ Imported 150 contexts
```

### 6. Clear Old Contexts
Remove contexts older than specified age:
- Predefined options: 7, 30, 90, 180 days
- Custom age in days
- Confirmation required
- Updates project statistics automatically

**Example**:
```bash
Clear contexts older than:
  1. 7 days
  2. 30 days
  3. 90 days
  4. 180 days
  5. Custom

Select: 2

Confirm clearing contexts older than 30 days? Yes

✔ Cleared 45 contexts
```

### 7. View Tier Distribution
Display statistics for each storage tier:

**Example Output**:
```
📊 Tier Distribution
────────────────────────────────────────────────────────────────────────────────
  L0 (Hot) - <1 day, in-memory cache
    Count: 25
    Size: 2.45 MB
    Hit Rate: 87.3%

  L1 (Warm) - 1-7 days, indexed in DB
    Count: 150
    Avg Access Time: 2d 14h

  L2 (Cold) - >7 days, lazy-loaded
    Count: 500
    Avg Access Time: 45d 8h

  Tier Migrations:
    Hot → Warm: 12
    Warm → Cold: 8
    Cold → Warm: 3
    Warm → Hot: 5
```

### 8. Migrate Tiers Manually
Force optimization of tier distribution:
- Demotes old hot contexts to warm tier
- Promotes frequently accessed warm contexts to hot tier
- Reports promotion and demotion counts

**Example**:
```bash
Enter project hash (leave empty for all):

Migrating tiers...

✔ Migration complete
  Promoted: 8
  Demoted: 15
```

### 9. Database Statistics
View comprehensive database statistics:

**Example Output**:
```
📈 Database Statistics
────────────────────────────────────────────────────────────────────────────────
  Total Contexts: 675
  Total Projects: 12
  Original Tokens: 1,250,000
  Compressed Tokens: 500,000
  Avg Compression: 60.0%
  Database Size: 45.23 MB
  Oldest Context: 2025-12-15 08:30:00
  Newest Context: 2026-02-21 14:45:30
  Tokens Saved: 750,000 (60.0%)
```

### V. Vacuum Database
Reclaim disk space after deletions:
- Compacts database file
- Removes fragmentation
- May take time for large databases
- Requires confirmation

**Example**:
```bash
Confirm vacuum database? (This may take some time) Yes

Vacuuming database...

✔ Database vacuum complete
```

## Storage Location

Contexts are stored in SQLite database:
```
~/.ccjk/context/contexts.db
```

**Database Features**:
- WAL mode for better concurrency
- FTS5 virtual table for full-text search
- Automatic triggers for search index sync
- Composite indexes for tier queries

## Performance Characteristics

### L0 (Hot) Tier
- **Access Time**: <1ms (in-memory)
- **Hit Rate**: 75%+ typical
- **Max Size**: 5MB default
- **Max Entries**: 100 default
- **Eviction**: LRU (Least Recently Used)

### L1 (Warm) Tier
- **Access Time**: 1-5ms (indexed DB query)
- **Storage**: SQLite with indexes
- **Query Performance**: O(log n)

### L2 (Cold) Tier
- **Access Time**: 5-20ms (full table scan)
- **Storage**: SQLite lazy-loaded
- **Query Performance**: O(n) with limit

### Search Performance
- **FTS5 Search**: 10-50ms typical
- **Ranking**: BM25 algorithm
- **Index Size**: ~20% of content size

## Best Practices

### Regular Maintenance
1. **Weekly**: Review tier distribution
2. **Monthly**: Clear old contexts (>90 days)
3. **Quarterly**: Vacuum database
4. **Yearly**: Export full backup

### Optimization Tips
1. Keep L0 cache size appropriate for your workload
2. Adjust tier thresholds based on access patterns
3. Use search instead of listing for large datasets
4. Export contexts before major cleanups

### Backup Strategy
```bash
# Weekly backup
npx ccjk persistence
# Select option 4 (Export)
# Leave project hash empty for full export
# Save to: ~/backups/ccjk/contexts-$(date +%Y-%m-%d).json

# Or direct database backup
cp ~/.ccjk/context/contexts.db ~/backups/ccjk/contexts-$(date +%Y-%m-%d).db
```

## Troubleshooting

### Database Locked
**Symptom**: "database is locked" error

**Solution**:
```bash
# Close all CCJK processes
pkill -f ccjk

# Remove WAL files if needed
rm ~/.ccjk/context/contexts.db-wal
rm ~/.ccjk/context/contexts.db-shm
```

### Slow Search
**Symptom**: Search takes >1 second

**Solution**:
```bash
# Vacuum database to rebuild indexes
npx ccjk persistence
# Select option V (Vacuum)
```

### High Memory Usage
**Symptom**: L0 cache consuming too much memory

**Solution**: Reduce L0 cache size in configuration

### Corrupted Database
**Symptom**: "database disk image is malformed"

**Solution**:
```bash
# Restore from backup
cp ~/backups/ccjk/contexts-latest.db ~/.ccjk/context/contexts.db

# Or rebuild from JSON export
npx ccjk persistence
# Select option 5 (Import)
```

## API Integration

For programmatic access:

```typescript
import { getContextPersistence } from '@ccjk/context/persistence'
import { createHierarchicalLoader } from '@ccjk/context/hierarchical-loader'

// Get persistence instance
const persistence = getContextPersistence()

// Search contexts
const results = persistence.searchContexts('React AND TypeScript', {
  sortBy: 'relevance',
  limit: 10,
})

// Get statistics
const stats = persistence.getStats()

// Create hierarchical loader
const loader = createHierarchicalLoader(persistence, 'project-hash')
const tierStats = loader.getStats()
```

## Related Documentation

- [Context Compression](./context-compression.md)
- [Hierarchical Storage](./hierarchical-storage.md)
- [Brain System](./brain-system.md)
- [Performance Tuning](./performance-tuning.md)

## Changelog

### v1.0.0 (2026-02-21)
- Initial release
- Full-text search with FTS5
- Hierarchical tier management (L0/L1/L2)
- Export/import functionality
- Database statistics and vacuum
- Interactive menu interface
