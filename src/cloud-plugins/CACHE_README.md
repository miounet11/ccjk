# Cloud Plugin Cache System

## Overview

The Cloud Plugin Cache System provides efficient local caching for cloud-based plugins in the CCJK project. It reduces network requests, improves performance, and enables offline plugin access.

## Features

- ✅ **Local Caching**: Store plugin metadata and content locally
- ✅ **Cache Expiration**: Automatic TTL-based cache invalidation (24 hours default)
- ✅ **Atomic Operations**: Thread-safe file operations with atomic writes
- ✅ **Size Limits**: Configurable limits for cache size and plugin count
- ✅ **Content Caching**: Cache individual plugin content files
- ✅ **Statistics**: Detailed cache statistics and monitoring
- ✅ **Error Handling**: Graceful error recovery and validation

## Architecture

```
~/.ccjk/cloud-plugins/cache/
├── metadata.json          # Cache metadata and plugin list
└── contents/              # Individual plugin content files
    ├── plugin-1.txt
    ├── plugin-2.txt
    └── ...
```

## Installation

The cache system is automatically available when you import the cloud-plugins module:

```typescript
import { LocalPluginCache, getDefaultCache } from '@/cloud-plugins'
```

## Usage

### Basic Usage

```typescript
import { getDefaultCache } from '@/cloud-plugins'

// Get the default cache instance
const cache = getDefaultCache()

// Load cached plugins
const plugins = cache.getCachedPlugins()

// Update cache with new plugins
cache.updateCache(newPlugins)

// Check if cache is expired
if (cache.isCacheExpired()) {
  // Fetch fresh data from cloud
}
```

### Custom Cache Directory

```typescript
import { LocalPluginCache } from '@/cloud-plugins'

// Create cache with custom directory
const cache = new LocalPluginCache('/custom/cache/path')
```

### Cache Plugin Content

```typescript
// Cache plugin content
const contentPath = cache.cachePluginContent('my-plugin', pluginCode)

// Retrieve cached content
const content = cache.getPluginContent('my-plugin')

// Remove cached content
cache.removePluginContent('my-plugin')
```

### Cache Statistics

```typescript
const stats = cache.getCacheStats()

console.log(`Total plugins: ${stats.totalPlugins}`)
console.log(`Cache size: ${stats.cacheSize} bytes`)
console.log(`Cached contents: ${stats.cachedContents}`)
console.log(`Is expired: ${stats.isExpired}`)
```

### Clear Cache

```typescript
// Clear all cache data
cache.clearCache()
```

## Configuration

### Cache Configuration Constants

```typescript
export const CACHE_CONFIG = {
  /** Cache time-to-live: 24 hours in milliseconds */
  TTL: 24 * 60 * 60 * 1000,

  /** Maximum number of plugins to cache */
  MAX_PLUGINS: 1000,

  /** Cache version for compatibility tracking */
  VERSION: '1.0.0',

  /** Maximum size for individual plugin content (5MB) */
  MAX_CONTENT_SIZE: 5 * 1024 * 1024,
}
```

### Customizing Configuration

To customize cache behavior, modify the constants in `src/cloud-plugins/cache.ts`:

```typescript
// Example: Increase cache TTL to 48 hours
TTL: 48 * 60 * 60 * 1000

// Example: Increase max plugins to 2000
MAX_PLUGINS: 2000
```

## API Reference

### LocalPluginCache Class

#### Constructor

```typescript
constructor(cacheDir?: string)
```

Creates a new cache instance with optional custom directory.

#### Methods

##### `ensureCacheDir(): void`

Ensures cache directory exists, creating it if necessary.

##### `loadCache(): CloudPluginCache | null`

Loads cache metadata from disk. Returns `null` if cache doesn't exist or is invalid.

##### `saveCache(cache: CloudPluginCache): void`

Saves cache metadata to disk using atomic write operations.

##### `getCachedPlugins(): CloudPlugin[]`

Returns array of all cached plugins.

##### `getCachedPlugin(id: string): CloudPlugin | undefined`

Returns a single plugin by ID, or `undefined` if not found.

##### `updateCache(plugins: CloudPlugin[]): void`

Updates cache with new plugin list, preserving creation timestamp.

##### `isCacheExpired(): boolean`

Checks if cache has expired based on TTL.

##### `clearCache(): void`

Removes all cache data including metadata and content files.

##### `cachePluginContent(pluginId: string, content: string): string`

Caches plugin content to disk. Returns path to cached file.

##### `getPluginContent(pluginId: string): string | null`

Retrieves cached plugin content. Returns `null` if not cached.

##### `removePluginContent(pluginId: string): boolean`

Removes cached plugin content. Returns `true` if content was removed.

##### `getCacheStats(): CacheStats`

Returns detailed cache statistics.

### Convenience Functions

```typescript
// Get default cache instance
function getDefaultCache(): LocalPluginCache

// Load cached plugins
function loadCachedPlugins(): CloudPlugin[]

// Update plugin cache
function updatePluginCache(plugins: CloudPlugin[]): void

// Check if cache is expired
function isCacheExpired(): boolean

// Clear plugin cache
function clearPluginCache(): void

// Get cache statistics
function getCacheStats(): CacheStats
```

## Type Definitions

### CloudPlugin

```typescript
interface CloudPlugin {
  id: string
  name: Record<SupportedLang, string>
  description: Record<SupportedLang, string>
  category: PluginCategory
  version: string
  author: string
  downloads: number
  rating: number
  tags: string[]
  dependencies?: string[]
  size: number
  createdAt: string
  updatedAt: string
  skills?: CcjkSkill[]
  agents?: AgentExtension[]
  workflows?: WorkflowExtension[]
  mcpServices?: McpServiceExtension[]
}
```

### CloudPluginCache

```typescript
interface CloudPluginCache {
  version: string
  plugins: CloudPlugin[]
  createdAt: string
  expiresAt: string
  lastUpdated: string
  totalPlugins: number
}
```

### CacheStats

```typescript
interface CacheStats {
  totalPlugins: number
  cacheSize: number
  lastUpdated: string | null
  expiresAt: string | null
  isExpired: boolean
  cachedContents: number
}
```

## Error Handling

The cache system includes comprehensive error handling:

```typescript
try {
  cache.saveCache(cacheData)
} catch (error) {
  console.error('Failed to save cache:', error)
  // Handle error appropriately
}
```

Common errors:
- **Permission denied**: Insufficient file system permissions
- **Disk full**: Not enough disk space
- **Invalid cache structure**: Corrupted cache data
- **Content too large**: Plugin content exceeds size limit

## Best Practices

### 1. Check Cache Expiration

Always check if cache is expired before using cached data:

```typescript
if (cache.isCacheExpired()) {
  // Fetch fresh data from cloud
  const freshPlugins = await fetchPluginsFromCloud()
  cache.updateCache(freshPlugins)
}
```

### 2. Handle Cache Misses

Gracefully handle cases where cache doesn't exist:

```typescript
const plugins = cache.getCachedPlugins()
if (plugins.length === 0) {
  // Fetch from cloud
}
```

### 3. Monitor Cache Size

Regularly check cache statistics to monitor disk usage:

```typescript
const stats = cache.getCacheStats()
if (stats.cacheSize > MAX_ACCEPTABLE_SIZE) {
  cache.clearCache()
}
```

### 4. Validate Plugin Content

Always validate plugin content before using:

```typescript
const content = cache.getPluginContent('my-plugin')
if (content && isValidPluginCode(content)) {
  // Use content
}
```

## Testing

The cache system includes comprehensive test coverage:

```bash
# Run cache tests
pnpm test cache.test.ts

# Run with coverage
pnpm test:coverage cache.test.ts
```

Test coverage includes:
- ✅ Directory creation and initialization
- ✅ Cache loading and saving
- ✅ Cache expiration logic
- ✅ Plugin content caching
- ✅ Error handling and recovery
- ✅ Cache statistics calculation
- ✅ Atomic write operations
- ✅ Size limit enforcement

## Performance Considerations

### Cache Hit Rate

The cache system is designed for high hit rates:
- 24-hour TTL balances freshness and performance
- Atomic writes prevent corruption
- Efficient file system operations

### Memory Usage

- Cache metadata is loaded on-demand
- Plugin content is read only when needed
- No in-memory caching of large content

### Disk Usage

- Maximum 1000 plugins by default
- 5MB limit per plugin content
- Automatic cleanup on cache clear

## Troubleshooting

### Cache Not Loading

**Problem**: `loadCache()` returns `null`

**Solutions**:
1. Check if cache directory exists
2. Verify file permissions
3. Check cache version compatibility
4. Validate JSON structure

### Cache Corruption

**Problem**: Invalid cache data

**Solutions**:
1. Clear cache: `cache.clearCache()`
2. Fetch fresh data from cloud
3. Check disk space and permissions

### Performance Issues

**Problem**: Slow cache operations

**Solutions**:
1. Check disk I/O performance
2. Reduce cache size
3. Clear old cached content
4. Monitor cache statistics

## Migration Guide

### From No Cache to Cache System

```typescript
// Before
const plugins = await fetchPluginsFromCloud()

// After
const cache = getDefaultCache()
let plugins = cache.getCachedPlugins()

if (plugins.length === 0 || cache.isCacheExpired()) {
  plugins = await fetchPluginsFromCloud()
  cache.updateCache(plugins)
}
```

### Upgrading Cache Version

When cache version changes, old caches are automatically invalidated:

```typescript
// Old cache with version 0.9.0 will be ignored
// New cache with version 1.0.0 will be created
```

## Contributing

When contributing to the cache system:

1. **Add Tests**: All new features must include tests
2. **Update Documentation**: Keep this README up-to-date
3. **Follow Patterns**: Use existing patterns for consistency
4. **Error Handling**: Include comprehensive error handling
5. **Performance**: Consider performance implications

## License

This cache system is part of the CCJK project and follows the same license.

## Related Documentation

- [Cloud Plugins Module](./index.ts)
- [Plugin Types](./types.ts)
- [Test Suite](../../tests/cloud-plugins/cache.test.ts)
- [CCJK Main Documentation](../../CLAUDE.md)
