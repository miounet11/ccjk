# Unified Plugin System

A unified plugin management system that provides a consistent interface for managing plugins from multiple sources (CCJK Skills Marketplace and Claude Native Plugins).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Plugin Router                           │
│  - Smart source selection                                   │
│  - Conflict detection                                       │
│  - Unified search & install                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─────────────────┬───────────────┐
                            ▼                 ▼               ▼
                    ┌──────────────┐  ┌──────────────┐ ┌──────────────┐
                    │ CCJK Adapter │  │Native Adapter│ │Future Sources│
                    └──────────────┘  └──────────────┘ └──────────────┘
                            │                 │               │
                            ▼                 ▼               ▼
                    ┌──────────────┐  ┌──────────────┐ ┌──────────────┐
                    │Skills Market │  │Local Plugins │ │   GitHub     │
                    │   place API  │  │  Directory   │ │     NPM      │
                    └──────────────┘  └──────────────┘ └──────────────┘
```

## Features

### 1. **Multi-Source Support**
- **CCJK Skills Marketplace**: Cloud-based skills with ratings, reviews, and recommendations
- **Claude Native Plugins**: Locally installed plugins
- **Extensible**: Easy to add new sources (GitHub, NPM, etc.)

### 2. **Smart Source Selection**
Automatically selects the best source based on:
- User preferences
- Plugin popularity (downloads)
- Plugin quality (ratings)
- Update frequency
- Language/locale preferences

### 3. **Conflict Resolution**
Detects and resolves conflicts between plugins:
- Command conflicts (same command from multiple plugins)
- Skill conflicts (duplicate skill implementations)
- Feature conflicts (overlapping features)
- Dependency conflicts

### 4. **Unified API**
Consistent interface regardless of plugin source:
```typescript
// Search across all sources
const plugins = await router.search('git', context)

// Install from best source automatically
const result = await router.install('git-workflow', context)

// Get plugin details
const plugin = await router.getPlugin('git-workflow', context)
```

## Usage

### Basic Setup

```typescript
import { PluginRouter, PluginRegistry, ConflictResolver } from './plugins-unified'

const config = {
  defaultSource: 'auto', // or 'ccjk', 'native'
  preferredSources: ['ccjk', 'native'],
  enableConflictDetection: true,
}

const router = new PluginRouter(config)
const registry = new PluginRegistry()
const resolver = new ConflictResolver()
```

### Search for Plugins

```typescript
// Search all sources
const results = await router.search('typescript', {
  config,
  lang: 'en',
})

// Search specific source
const ccjkResults = await router.search('typescript', {
  config,
  explicitSource: 'ccjk',
})
```

### Install Plugins

```typescript
// Install from best source (auto-selected)
const result = await router.install('typescript-workflow', {
  config,
  lang: 'en',
})

if (result.success) {
  console.log(`Installed from ${result.source}`)
} else {
  console.error(result.error)
}

// Install from specific source
const ccjkResult = await router.install('ccjk:typescript-workflow', {
  config,
  explicitSource: 'ccjk',
})
```

### Plugin ID Formats

The system supports multiple plugin ID formats:

```typescript
// Plain name (auto-select source)
'typescript-workflow'

// With source prefix
'ccjk:typescript-workflow'
'native:git-tools'

// With marketplace suffix (forces native source)
'typescript-workflow@vscode'
```

### Conflict Detection

```typescript
const resolver = new ConflictResolver()

// Get all installed plugins
const installed = await registry.listAll()

// Detect conflicts
const conflicts = resolver.detectConflicts(installed)

if (conflicts.length > 0) {
  console.log('Conflicts detected:')
  conflicts.forEach(conflict => {
    console.log(`- ${conflict.type}: ${conflict.resource}`)
    console.log(`  Plugins: ${conflict.plugins.map(p => p.name).join(', ')}`)
    console.log(`  Severity: ${conflict.severity}/10`)
  })
}
```

### Conflict Resolution

```typescript
// Resolve conflicts automatically
const resolution = await resolver.resolveConflicts(
  conflicts,
  ResolutionStrategy.KEEP_HIGHEST_RATED
)

if (resolution.success) {
  console.log('Conflicts resolved:')
  console.log(`- Enabled: ${resolution.enabled.map(p => p.name).join(', ')}`)
  console.log(`- Disabled: ${resolution.disabled.map(p => p.name).join(', ')}`)

  // Apply resolution
  for (const plugin of resolution.disabled) {
    await registry.disable(plugin.id)
  }
} else {
  console.log('Manual resolution required for:')
  resolution.unresolved.forEach(conflict => {
    console.log(`- ${conflict.resource}`)
  })
}
```

## Resolution Strategies

```typescript
enum ResolutionStrategy {
  KEEP_FIRST = 'keep_first',              // Keep first installed
  KEEP_LAST = 'keep_last',                // Keep last installed
  KEEP_HIGHEST_RATED = 'keep_highest_rated', // Keep highest rated
  KEEP_MOST_POPULAR = 'keep_most_popular',   // Keep most downloaded
  KEEP_VERIFIED = 'keep_verified',        // Keep official/verified
  KEEP_PREFERRED_SOURCE = 'keep_preferred_source', // Keep from preferred source
  MANUAL = 'manual',                      // Require manual resolution
}
```

## Configuration

```typescript
interface UnifiedPluginConfig {
  // Default source selection
  defaultSource: 'auto' | 'ccjk' | 'native'

  // Preferred sources (in order)
  preferredSources?: PluginSourceType[]

  // Enable automatic conflict detection
  enableConflictDetection?: boolean

  // Conflict resolution strategy
  conflictResolution?: ResolutionStrategy

  // Cache settings
  cacheEnabled?: boolean
  cacheTTL?: number

  // API settings for CCJK marketplace
  apiEndpoint?: string
  apiKey?: string
}
```

## Plugin Metadata

```typescript
interface UnifiedPlugin {
  // Core fields
  id: string
  name: string
  version: string
  source: PluginSourceType

  // Optional metadata
  description?: string
  author?: string
  category?: string
  status?: 'available' | 'installed' | 'disabled' | 'updating'

  // Capabilities
  commands?: string[]
  skills?: string[]
  features?: string[]
  tags?: string[]

  // Links
  homepage?: string
  repository?: string

  // Dependencies
  dependencies?: Record<string, string>

  // Stats
  stats?: {
    downloads?: number
    rating?: number
    reviews?: number
  }

  // Timestamps
  installedAt?: string
  updatedAt?: string

  // Flags
  enabled?: boolean
  verified?: boolean

  // Source info
  marketplace?: string
}
```

## Adapters

### Creating a Custom Adapter

```typescript
import { BasePluginAdapter } from './adapters/base'

class MyCustomAdapter extends BasePluginAdapter {
  protected sourceType: PluginSourceType = 'custom'

  async search(options: SearchOptions): Promise<UnifiedPlugin[]> {
    // Implement search logic
  }

  async getPlugin(id: string): Promise<UnifiedPlugin | null> {
    // Implement get logic
  }

  async install(id: string, options: InstallOptions): Promise<InstallResult> {
    // Implement install logic
  }

  async uninstall(id: string): Promise<UninstallResult> {
    // Implement uninstall logic
  }

  async update(id: string): Promise<UpdateResult> {
    // Implement update logic
  }

  async listInstalled(): Promise<UnifiedPlugin[]> {
    // Implement list logic
  }

  async isInstalled(id: string): Promise<boolean> {
    // Implement check logic
  }
}
```

### Register Custom Adapter

```typescript
import { AdapterFactory } from './adapters/factory'

// Add to factory
AdapterFactory.registerAdapter('custom', MyCustomAdapter)
```

## API Reference

### PluginRouter

#### `parsePluginId(id: string): ParsedPluginId`
Parse a plugin ID into its components.

#### `resolveSource(pluginId: string, context: RouterContext): Promise<PluginSourceType>`
Determine which source to use for a plugin.

#### `getPlugin(pluginId: string, context: RouterContext): Promise<UnifiedPlugin | null>`
Get plugin details from the resolved source.

#### `search(query: string, context: RouterContext, options?: SearchOptions): Promise<UnifiedPlugin[]>`
Search for plugins across all or specific sources.

#### `install(pluginId: string, context: RouterContext): Promise<InstallResult>`
Install a plugin from the best source.

#### `uninstall(pluginId: string, context: RouterContext): Promise<UninstallResult>`
Uninstall a plugin.

### ConflictResolver

#### `detectConflicts(plugins: UnifiedPlugin[]): PluginConflict[]`
Detect all conflicts between plugins.

#### `resolveConflicts(conflicts: PluginConflict[], strategy: ResolutionStrategy): Promise<ResolutionResult>`
Resolve conflicts using the specified strategy.

## Examples

### Example 1: Smart Plugin Installation

```typescript
// User wants to install a TypeScript plugin
const result = await router.install('typescript', {
  config: {
    defaultSource: 'auto',
    preferredSources: ['ccjk', 'native'],
  },
  lang: 'en',
})

// Router will:
// 1. Search both CCJK and native sources
// 2. Compare plugins (ratings, downloads, freshness)
// 3. Select the best one
// 4. Install it
```

### Example 2: Conflict Detection and Resolution

```typescript
// Install multiple plugins
await router.install('git-tools-a', context)
await router.install('git-tools-b', context)

// Both provide the same 'git-commit' command
const conflicts = resolver.detectConflicts(await registry.listAll())

// Resolve automatically
const resolution = await resolver.resolveConflicts(
  conflicts,
  ResolutionStrategy.KEEP_HIGHEST_RATED
)

// Apply resolution
for (const plugin of resolution.disabled) {
  await registry.disable(plugin.id)
}
```

### Example 3: Multi-Source Search

```typescript
// Search all sources
const allResults = await router.search('react', context)

// Results are automatically deduplicated and ranked
console.log('Found plugins:')
allResults.forEach(plugin => {
  console.log(`- ${plugin.name} (${plugin.source})`)
  console.log(`  Rating: ${plugin.stats?.rating || 'N/A'}`)
  console.log(`  Downloads: ${plugin.stats?.downloads || 'N/A'}`)
})
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Test specific adapter
npm test -- adapters/ccjk-adapter.test.ts
```

## Contributing

When adding a new plugin source:

1. Create an adapter extending `BasePluginAdapter`
2. Implement all required methods
3. Add to `AdapterFactory`
4. Update type definitions
5. Add tests
6. Update documentation

## License

MIT
