# Hierarchical Context Loading (L0/L1/L2)

## Overview

The Hierarchical Context Loader implements a three-tier caching system for compressed contexts, optimizing access patterns based on recency and frequency of use.

## Architecture

### Tier Definitions

```
┌─────────────────────────────────────────────────────────────┐
│                    L0 (Hot) Tier                            │
│  • Age: <1 day                                              │
│  • Storage: In-memory LRU cache                             │
│  • Access Time: <1ms                                        │
│  • Max Size: 5MB / 100 entries (configurable)               │
│  • Use Case: Frequently accessed contexts                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    L1 (Warm) Tier                           │
│  • Age: 1-7 days                                            │
│  • Storage: SQLite with indexes                             │
│  • Access Time: 1-5ms                                       │
│  • Max Size: Unlimited                                      │
│  • Use Case: Recently accessed contexts                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    L2 (Cold) Tier                           │
│  • Age: >7 days                                             │
│  • Storage: SQLite (lazy loaded)                            │
│  • Access Time: 5-20ms                                      │
│  • Max Size: Unlimited                                      │
│  • Use Case: Archived contexts, batch operations            │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. Automatic Tier Management

- **Age-based Classification**: Contexts are automatically classified based on last access time
- **LRU Eviction**: L0 cache uses Least Recently Used eviction when full
- **Promotion**: Frequently accessed contexts are promoted to higher tiers
- **Demotion**: Stale contexts are demoted to lower tiers

### 2. Performance Optimization

- **L0 Cache**: In-memory cache for instant access to hot contexts
- **Indexed Queries**: L1/L2 use SQLite indexes for fast retrieval
- **Lazy Loading**: L2 contexts loaded in batches to minimize memory usage
- **Access Tracking**: Automatic tracking of access patterns for optimization

### 3. Statistics and Monitoring

- **Tier Metrics**: Count, size, and hit rate for each tier
- **Migration Tracking**: Monitor context movement between tiers
- **Access Patterns**: Average access time and frequency per tier

## Usage

### Basic Setup

```typescript
import { ContextPersistence, HierarchicalContextLoader } from '@/context'

const persistence = new ContextPersistence()
const loader = new HierarchicalContextLoader(
  persistence,
  'project-hash',
  {
    hotThreshold: 24 * 60 * 60 * 1000,      // 1 day
    warmThreshold: 7 * 24 * 60 * 60 * 1000, // 7 days
    l0MaxEntries: 100,
    l0MaxSize: 5 * 1024 * 1024,             // 5MB
  }
)
```

### Retrieving Contexts

```typescript
// Get context from any tier (automatic tier detection)
const context = await loader.getContext('context-id')

// Get hot contexts (L0)
const hotContexts = loader.getHotContexts()

// Get warm contexts (L1)
const warmContexts = loader.getWarmContexts(50)

// Get cold contexts (L2)
const coldContexts = loader.getColdContexts(100)

// Lazy load cold contexts in batches
const batch1 = await loader.lazyColdContexts(0, 50)
const batch2 = await loader.lazyColdContexts(50, 50)
```

### Tier Management

```typescript
// Migrate contexts between tiers based on access patterns
const result = loader.migrateContexts()
console.log(`Promoted: ${result.promoted}, Demoted: ${result.demoted}`)

// Refresh L0 cache with current hot contexts
loader.refreshL0Cache()

// Clear L0 cache
loader.clearL0Cache()
```

### Statistics

```typescript
const stats = loader.getStats()

console.log('L0 (Hot):', {
  count: stats.l0.count,
  size: stats.l0.size,
  hitRate: stats.l0.hitRate,
})

console.log('L1 (Warm):', {
  count: stats.l1.count,
  avgAccessTime: stats.l1.avgAccessTime,
})

console.log('L2 (Cold):', {
  count: stats.l2.count,
  avgAccessTime: stats.l2.avgAccessTime,
})

console.log('Migrations:', stats.migrations)
```

### Integration with ContextManager

```typescript
import { ContextManager } from '@/context'

const manager = new ContextManager({
  enablePersistence: true,
  projectHash: 'my-project',
})

// Access hierarchical loader through manager
const hotContexts = manager.getHotContexts()
const warmContexts = manager.getWarmContexts(50)
const coldContexts = manager.getColdContexts(100)

// Migrate tiers
const result = manager.migrateContextTiers()

// Get tier statistics
const stats = manager.getTierStats()
```

## Performance Characteristics

### Access Times (Typical)

| Tier | Storage | Access Time | Throughput |
|------|---------|-------------|------------|
| L0   | Memory  | <1ms        | 100K+ ops/s|
| L1   | SQLite  | 1-5ms       | 10K+ ops/s |
| L2   | SQLite  | 5-20ms      | 1K+ ops/s  |

### Memory Usage

- **L0 Cache**: 5MB default (configurable)
- **L1/L2**: Minimal memory footprint (lazy loaded)
- **Total Overhead**: <10MB for typical workloads

### Recommended Configuration

```typescript
// For high-frequency access patterns
{
  hotThreshold: 12 * 60 * 60 * 1000,      // 12 hours
  warmThreshold: 3 * 24 * 60 * 60 * 1000, // 3 days
  l0MaxEntries: 200,
  l0MaxSize: 10 * 1024 * 1024,            // 10MB
}

// For memory-constrained environments
{
  hotThreshold: 24 * 60 * 60 * 1000,      // 1 day
  warmThreshold: 7 * 24 * 60 * 60 * 1000, // 7 days
  l0MaxEntries: 50,
  l0MaxSize: 2 * 1024 * 1024,             // 2MB
}

// For large-scale projects
{
  hotThreshold: 48 * 60 * 60 * 1000,      // 2 days
  warmThreshold: 14 * 24 * 60 * 60 * 1000,// 14 days
  l0MaxEntries: 500,
  l0MaxSize: 20 * 1024 * 1024,            // 20MB
}
```

## Migration Strategies

### Automatic Migration

The loader automatically migrates contexts based on:

1. **Age**: Contexts older than `hotThreshold` are demoted from L0
2. **Access Frequency**: Contexts with >10 accesses are promoted to L0
3. **Cache Pressure**: LRU eviction when L0 is full

### Manual Migration

```typescript
// Run migration manually (e.g., in a cron job)
setInterval(() => {
  const result = loader.migrateContexts()
  console.log(`Migration: +${result.promoted} -${result.demoted}`)
}, 60 * 60 * 1000) // Every hour
```

## Best Practices

1. **Regular Migration**: Run `migrateContexts()` periodically to maintain optimal tier distribution
2. **Monitor Hit Rate**: Keep L0 hit rate >70% for best performance
3. **Batch Cold Access**: Use `lazyColdContexts()` for bulk operations on old contexts
4. **Tune Thresholds**: Adjust tier thresholds based on your access patterns
5. **Cache Refresh**: Refresh L0 cache after bulk operations or project changes

## Troubleshooting

### Low L0 Hit Rate

**Problem**: L0 hit rate <50%

**Solutions**:
- Increase `l0MaxEntries` and `l0MaxSize`
- Decrease `hotThreshold` to keep more contexts in L0
- Run `migrateContexts()` more frequently

### High Memory Usage

**Problem**: L0 cache consuming too much memory

**Solutions**:
- Decrease `l0MaxSize` and `l0MaxEntries`
- Increase `hotThreshold` to demote contexts faster
- Call `clearL0Cache()` periodically

### Slow Cold Access

**Problem**: L2 access taking >50ms

**Solutions**:
- Use `lazyColdContexts()` for batch operations
- Run `persistence.vacuum()` to optimize database
- Consider archiving very old contexts

## Testing

Run the test suite:

```bash
pnpm vitest src/context/__tests__/hierarchical-loader.test.ts
```

Run benchmarks:

```bash
pnpm tsx scripts/benchmark-hierarchical-loader.ts
```

## API Reference

### HierarchicalContextLoader

#### Constructor

```typescript
new HierarchicalContextLoader(
  persistence: ContextPersistence,
  projectHash: string,
  config?: Partial<TierConfig>
)
```

#### Methods

- `getContext(contextId: string): Promise<CompressedContext | null>`
- `getHotContexts(): TieredContext[]`
- `getWarmContexts(limit?: number): TieredContext[]`
- `getColdContexts(limit?: number): TieredContext[]`
- `getContextsByTier(tier: ContextTier, limit?: number): TieredContext[]`
- `lazyColdContexts(offset: number, limit: number): Promise<TieredContext[]>`
- `migrateContexts(): { promoted: number, demoted: number }`
- `getStats(): TierStats`
- `clearL0Cache(): void`
- `refreshL0Cache(): void`

### Factory Function

```typescript
createHierarchicalLoader(
  persistence: ContextPersistence,
  projectHash: string,
  config?: Partial<TierConfig>
): HierarchicalContextLoader
```

## Future Enhancements

- [ ] Adaptive tier thresholds based on access patterns
- [ ] Predictive pre-loading of contexts
- [ ] Compression level per tier (more aggressive for L2)
- [ ] Multi-project tier sharing
- [ ] Distributed caching support
