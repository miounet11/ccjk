# Unified Plugin System API Documentation

## Table of Contents

1. [Core Types](#core-types)
2. [Plugin Router](#plugin-router)
3. [Plugin Registry](#plugin-registry)
4. [Conflict Resolver](#conflict-resolver)
5. [Adapters](#adapters)
6. [Error Handling](#error-handling)

## Core Types

### UnifiedPlugin

Represents a plugin from any source in a unified format.

```typescript
interface UnifiedPlugin {
  // Core identification
  id: string                    // Unique identifier
  name: string                  // Display name
  version: string               // Semantic version
  source: PluginSourceType      // 'ccjk' | 'native'

  // Metadata
  description?: string          // Plugin description
  author?: string               // Author name
  category?: string             // Category (e.g., 'workflow', 'tool')

  // Status
  status: PluginStatus          // 'installed' | 'available' | 'disabled' | 'updating'
  enabled: boolean              // Whether plugin is active
  verified: boolean             // Official/verified status

  // Capabilities
  commands?: string[]           // Commands provided
  skills?: string[]             // Skills provided
  features?: string[]           // Features provided

  // Discovery
  tags?: string[]               // Search tags
  homepage?: string             // Homepage URL
  repository?: string           // Repository URL

  // Dependencies
  dependencies?: Record<string, string>  // Plugin dependencies

  // Statistics
  rating?: number               // Average rating (0-5)
  stats?: {
    downloads?: number          // Download count
    rating?: number             // Rating score
    reviews?: number            // Review count
  }

  // Timestamps
  installedAt?: string          // ISO timestamp
  updatedAt?: string            // ISO timestamp

  // Source-specific
  marketplace?: string          // Marketplace identifier
  metadata?: Record<string, any> // Additional metadata
}
```

### SearchOptions

```typescript
interface SearchOptions {
  query?: string                // Search query
  category?: string             // Filter by category
  tags?: string[]               // Filter by tags
  source?: PluginSourceType     // Filter by source
  limit?: number                // Max results (default: 20)
  offset?: number               // Pagination offset
  sortBy?: 'name' | 'downloads' | 'rating' | 'updated'
  sortOrder?: 'asc' | 'desc'
}
```

### InstallOptions

```typescript
interface InstallOptions {
  version?: string              // Specific version to install
  force?: boolean               // Force reinstall if exists
  autoEnable?: boolean          // Enable after install (default: true)
  skipDependencies?: boolean    // Skip dependency installation
}
```

## Plugin Router

The main entry point for plugin operations.

### Constructor

```typescript
const router = new PluginRouter(config?: PluginRouterConfig)
```

### Methods

#### search(query: string, context: PluginContext): Promise<UnifiedPlugin[]>

Search for plugins across all sources.

```typescript
const results = await router.search('typescript', {
  config: { defaultSource: 'auto' },
  lang: 'en',
})
```

#### install(id: string, context: PluginContext, options?: InstallOptions): Promise<InstallResult>

Install a plugin from the best available source.

```typescript
const result = await router.install('typescript-workflow', context, {
  autoEnable: true,
})
```

#### uninstall(id: string, context: PluginContext): Promise<UninstallResult>

Uninstall a plugin.

```typescript
const result = await router.uninstall('typescript-workflow', context)
```

#### update(id: string, context: PluginContext): Promise<UpdateResult>

Update a plugin to the latest version.

```typescript
const result = await router.update('typescript-workflow', context)
```

## Plugin Registry

Manages the local plugin registry.

### Methods

#### register(plugin: UnifiedPlugin): Promise<void>

Register a plugin in the local registry.

#### unregister(id: string): Promise<void>

Remove a plugin from the registry.

#### get(id: string): Promise<UnifiedPlugin | null>

Get a plugin by ID.

#### listAll(): Promise<UnifiedPlugin[]>

List all registered plugins.

#### listBySource(source: PluginSourceType): Promise<UnifiedPlugin[]>

List plugins from a specific source.

## Conflict Resolver

Detects and resolves conflicts between plugins.

### Methods

#### detectConflicts(plugins: UnifiedPlugin[]): PluginConflict[]

Detect conflicts between plugins.

```typescript
const conflicts = resolver.detectConflicts(installedPlugins)
```

#### resolveConflicts(conflicts: PluginConflict[], strategy: ResolutionStrategy): Promise<ResolutionResult>

Resolve conflicts using a strategy.

```typescript
const result = await resolver.resolveConflicts(
  conflicts,
  ResolutionStrategy.KEEP_HIGHEST_RATED
)
```

### Resolution Strategies

- `KEEP_FIRST`: Keep the first plugin, disable others
- `KEEP_LAST`: Keep the last plugin, disable others
- `KEEP_HIGHEST_RATED`: Keep the highest rated plugin
- `KEEP_MOST_POPULAR`: Keep the most downloaded plugin
- `KEEP_VERIFIED`: Keep the official/verified plugin
- `KEEP_PREFERRED_SOURCE`: Keep plugin from preferred source
- `MANUAL`: Require manual resolution

## Adapters

### CcjkAdapter

Adapter for CCJK Skills Marketplace.

```typescript
const adapter = new CcjkAdapter()
const plugins = await adapter.search({ query: 'git' })
```

### ClaudeNativeAdapter

Adapter for Claude native plugins.

```typescript
const adapter = new ClaudeNativeAdapter()
const plugins = await adapter.listInstalled()
```

## Error Handling

All methods return results with success/error fields:

```typescript
const result = await router.install('plugin-id', context)

if (result.success) {
  console.log('Installed:', result.plugin)
} else {
  console.error('Error:', result.error)
}
```
