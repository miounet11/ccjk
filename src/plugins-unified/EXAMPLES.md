# Unified Plugin System Examples

Practical examples demonstrating common use cases.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Advanced Search](#advanced-search)
3. [Conflict Management](#conflict-management)
4. [Custom Adapters](#custom-adapters)
5. [CLI Integration](#cli-integration)

## Basic Usage

### Simple Plugin Installation

```typescript
import { PluginRouter } from './plugins-unified'

const router = new PluginRouter()

// Install a plugin (auto-selects best source)
const result = await router.install('typescript-workflow', {
  config: { defaultSource: 'auto' },
  lang: 'en',
})

if (result.success) {
  console.log(`✓ Installed ${result.plugin?.name} from ${result.source}`)
} else {
  console.error(`✗ Installation failed: ${result.error}`)
}
```

### Search and Install

```typescript
import { PluginRouter } from './plugins-unified'

const router = new PluginRouter()
const context = {
  config: { defaultSource: 'auto' },
  lang: 'en',
}

// Search for plugins
const results = await router.search('git workflow', context)

console.log(`Found ${results.length} plugins:`)
results.forEach((plugin, i) => {
  console.log(`${i + 1}. ${plugin.name} (${plugin.source})`)
  console.log(`   ${plugin.description}`)
  console.log(`   ⭐ ${plugin.rating || 'N/A'} | 📥 ${plugin.stats?.downloads || 0}`)
})

// Install the top result
if (results.length > 0) {
  const topPlugin = results[0]
  const installResult = await router.install(topPlugin.id, context)
  console.log(installResult.success ? '✓ Installed' : '✗ Failed')
}
```

### List and Manage Installed Plugins

```typescript
import { PluginRegistry } from './plugins-unified'

const registry = new PluginRegistry()

// List all installed plugins
const installed = await registry.listAll()

console.log('Installed Plugins:')
installed.forEach(plugin => {
  const status = plugin.enabled ? '✓' : '✗'
  console.log(`${status} ${plugin.name} v${plugin.version} (${plugin.source})`)
})

// Enable/disable a plugin
await registry.updateStatus('typescript-workflow', 'disabled')
console.log('Plugin disabled')

await registry.updateStatus('typescript-workflow', 'installed')
console.log('Plugin enabled')
```

## Advanced Search

### Filtered Search

```typescript
import { PluginRouter } from './plugins-unified'

const router = new PluginRouter()

// Search with filters
const results = await router.search('', {
  config: { defaultSource: 'auto' },
  lang: 'en',
}, {
  category: 'workflow',
  tags: ['git', 'version-control'],
  sortBy: 'rating',
  sortOrder: 'desc',
  limit: 10,
})

console.log('Top-rated workflow plugins:')
results.forEach(plugin => {
  console.log(`- ${plugin.name}: ${plugin.rating}/5 ⭐`)
})
```

### Source-Specific Search

```typescript
import { PluginRouter } from './plugins-unified'

const router = new PluginRouter()

// Search only CCJK marketplace
const ccjkResults = await router.search('typescript', {
  config: { defaultSource: 'auto' },
  explicitSource: 'ccjk',
})

console.log('CCJK Marketplace results:', ccjkResults.length)

// Search only native plugins
const nativeResults = await router.search('typescript', {
  config: { defaultSource: 'auto' },
  explicitSource: 'native',
})

console.log('Native plugins:', nativeResults.length)
```

### Paginated Search

```typescript
import { PluginRouter } from './plugins-unified'

const router = new PluginRouter()
const context = {
  config: { defaultSource: 'auto' },
  lang: 'en',
}

const pageSize = 10
let page = 0
let hasMore = true

while (hasMore) {
  const results = await router.search('workflow', context, {
    limit: pageSize,
    offset: page * pageSize,
  })

  console.log(`\nPage ${page + 1}:`)
  results.forEach(plugin => {
    console.log(`- ${plugin.name}`)
  })

  hasMore = results.length === pageSize
  page++

  if (page >= 5) break // Limit to 5 pages for demo
}
```

## Conflict Management

### Detect and Display Conflicts

```typescript
import { PluginRegistry, ConflictResolver, ConflictType } from './plugins-unified'

const registry = new PluginRegistry()
const resolver = new ConflictResolver()

// Get all installed plugins
const installed = await registry.listAll()

// Detect conflicts
const conflicts = resolver.detectConflicts(installed)

if (conflicts.length === 0) {
  console.log('✓ No conflicts detected')
} else {
  console.log(`⚠ Found ${conflicts.length} conflicts:\n`)

  conflicts.forEach((conflict, i) => {
    console.log(`${i + 1}. ${conflict.type.toUpperCase()} Conflict`)
    console.log(`   Resource: ${conflict.resource}`)
    console.log(`   Severity: ${conflict.severity}/10`)
    console.log(`   Plugins:`)
    conflict.plugins.forEach(p => {
      console.log(`   - ${p.name} (${p.source})`)
    })
    if (conflict.resolution) {
      console.log(`   Suggestion: ${conflict.resolution}`)
    }
    console.log()
  })
}
```

### Automatic Conflict Resolution

```typescript
import {
  PluginRegistry,
  ConflictResolver,
  ResolutionStrategy,
} from './plugins-unified'

const registry = new PluginRegistry()
const resolver = new ConflictResolver()

const installed = await registry.listAll()
const conflicts = resolver.detectConflicts(installed)

if (conflicts.length > 0) {
  console.log('Resolving conflicts...')

  // Try different strategies
  const strategies = [
    ResolutionStrategy.KEEP_VERIFIED,
    ResolutionStrategy.KEEP_HIGHEST_RATED,
    ResolutionStrategy.KEEP_MOST_POPULAR,
  ]

  for (const strategy of strategies) {
    const result = await resolver.resolveConflicts(conflicts, strategy)

    if (result.success && result.unresolved.length === 0) {
      console.log(`✓ Resolved using strategy: ${strategy}`)
      console.log(`  Enabled: ${result.enabled.map(p => p.name).join(', ')}`)
      console.log(`  Disabled: ${result.disabled.map(p => p.name).join(', ')}`)

      // Apply resolution
      for (const plugin of result.disabled) {
        await registry.updateStatus(plugin.id, 'disabled')
      }
      break
    }
  }
}
```

### Manual Conflict Resolution

```typescript
import { PluginRegistry, ConflictResolver } from './plugins-unified'
import readline from 'readline'

const registry = new PluginRegistry()
const resolver = new ConflictResolver()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const installed = await registry.listAll()
const conflicts = resolver.detectConflicts(installed)

for (const conflict of conflicts) {
  console.log(`\nConflict: ${conflict.type} - ${conflict.resource}`)
  console.log('Choose which plugin to keep:')

  conflict.plugins.forEach((plugin, i) => {
    console.log(`${i + 1}. ${plugin.name} (${plugin.source})`)
    console.log(`   Rating: ${plugin.rating || 'N/A'}`)
    console.log(`   Downloads: ${plugin.stats?.downloads || 0}`)
  })

  const answer = await new Promise<string>(resolve => {
    rl.question('Enter number: ', resolve)
  })

  const choice = parseInt(answer) - 1
  if (choice >= 0 && choice < conflict.plugins.length) {
    const keepPlugin = conflict.plugins[choice]
    console.log(`Keeping: ${keepPlugin.name}`)

    // Disable others
    for (let i = 0; i < conflict.plugins.length; i++) {
      if (i !== choice) {
        await registry.updateStatus(conflict.plugins[i].id, 'disabled')
        console.log(`Disabled: ${conflict.plugins[i].name}`)
      }
    }
  }
}

rl.close()
```

## Custom Adapters

### Creating a GitHub Adapter

```typescript
import { BasePluginAdapter } from './plugins-unified/adapters/base'
import type {
  UnifiedPlugin,
  SearchOptions,
  InstallOptions,
  InstallResult,
  UninstallResult,
  UpdateResult,
} from './plugins-unified/types'

class GitHubAdapter extends BasePluginAdapter {
  protected sourceType = 'github' as const

  async search(options: SearchOptions): Promise<UnifiedPlugin[]> {
    // Search GitHub repositories
    const query = `${options.query} topic:claude-plugin`
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}`
    )
    const data = await response.json()

    return data.items.map((repo: any) => ({
      id: repo.full_name,
      name: repo.name,
      version: '1.0.0', // Would need to parse from releases
      source: 'github',
      description: repo.description,
      author: repo.owner.login,
      status: 'available',
      enabled: false,
      verified: repo.owner.type === 'Organization',
      repository: repo.html_url,
      stats: {
        downloads: 0,
        rating: repo.stargazers_count / 1000, // Normalize stars to 0-5
      },
      updatedAt: repo.updated_at,
    }))
  }

  async getPlugin(id: string): Promise<UnifiedPlugin | null> {
    // Fetch repository details
    const [owner, repo] = id.split('/')
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
    if (!response.ok) return null

    const data = await response.json()
    return {
      id: data.full_name,
      name: data.name,
      version: '1.0.0',
      source: 'github',
      description: data.description,
      author: data.owner.login,
      status: 'available',
      enabled: false,
      verified: data.owner.type === 'Organization',
      repository: data.html_url,
      stats: {
        downloads: 0,
        rating: data.stargazers_count / 1000,
      },
      updatedAt: data.updated_at,
    }
  }

  async install(id: string, options: InstallOptions): Promise<InstallResult> {
    // Clone repository and install
    try {
      const [owner, repo] = id.split('/')
      // Implementation would clone repo and set up plugin
      return {
        success: true,
        source: 'github',
        plugin: await this.getPlugin(id),
      }
    } catch (error) {
      return this.createInstallError(
        error instanceof Error ? error.message : 'Installation failed'
      )
    }
  }

  async uninstall(id: string): Promise<UninstallResult> {
    // Remove cloned repository
    return { success: true }
  }

  async update(id: string): Promise<UpdateResult> {
    // Pull latest changes
    return {
      success: true,
      oldVersion: '1.0.0',
      newVersion: '1.1.0',
    }
  }

  async listInstalled(): Promise<UnifiedPlugin[]> {
    // List installed GitHub plugins
    return []
  }

  async isInstalled(id: string): Promise<boolean> {
    // Check if plugin is installed
    return false
  }
}

// Register the adapter
import { AdapterFactory } from './plugins-unified/adapters/factory'

// Extend the factory to support GitHub
AdapterFactory.registerAdapter('github', () => new GitHubAdapter())
```

## CLI Integration

### Plugin Search Command

```typescript
import { Command } from 'commander'
import { PluginRouter } from './plugins-unified'

const program = new Command()

program
  .command('search <query>')
  .description('Search for plugins')
  .option('-s, --source <source>', 'Source to search (ccjk, native, auto)')
  .option('-c, --category <category>', 'Filter by category')
  .option('-l, --limit <number>', 'Max results', '20')
  .action(async (query, options) => {
    const router = new PluginRouter()
    const context = {
      config: { defaultSource: options.source || 'auto' },
      explicitSource: options.source !== 'auto' ? options.source : undefined,
    }

    const results = await router.search(query, context, {
      category: options.category,
      limit: parseInt(options.limit),
    })

    console.log(`Found ${results.length} plugins:\n`)
    results.forEach((plugin, i) => {
      console.log(`${i + 1}. ${plugin.name} (${plugin.source})`)
      console.log(`   ${plugin.description}`)
      console.log(`   ⭐ ${plugin.rating || 'N/A'} | 📥 ${plugin.stats?.downloads || 0}\n`)
    })
  })

program.parse()
```

### Plugin Install Command

```typescript
import { Command } from 'commander'
import { PluginRouter } from './plugins-unified'

const program = new Command()

program
  .command('install <plugin>')
  .description('Install a plugin')
  .option('-s, --source <source>', 'Source to install from')
  .option('-v, --version <version>', 'Specific version to install')
  .option('-f, --force', 'Force reinstall if exists')
  .action(async (plugin, options) => {
    const router = new PluginRouter()
    const context = {
      config: { defaultSource: options.source || 'auto' },
      explicitSource: options.source,
    }

    console.log(`Installing ${plugin}...`)

    const result = await router.install(plugin, context, {
      version: options.version,
      force: options.force,
    })

    if (result.success) {
      console.log(`✓ Successfully installed ${result.plugin?.name} from ${result.source}`)
    } else {
      console.error(`✗ Installation failed: ${result.error}`)
      process.exit(1)
    }
  })

program.parse()
```

### Plugin List Command

```typescript
import { Command } from 'commander'
import { PluginRegistry } from './plugins-unified'

const program = new Command()

program
  .command('list')
  .description('List installed plugins')
  .option('-s, --source <source>', 'Filter by source')
  .option('--enabled', 'Show only enabled plugins')
  .option('--disabled', 'Show only disabled plugins')
  .action(async (options) => {
    const registry = new PluginRegistry()

    let plugins = options.source
      ? await registry.listBySource(options.source)
      : await registry.listAll()

    if (options.enabled) {
      plugins = plugins.filter(p => p.enabled)
    } else if (options.disabled) {
      plugins = plugins.filter(p => !p.enabled)
    }

    console.log(`Installed Plugins (${plugins.length}):\n`)
    plugins.forEach(plugin => {
      const status = plugin.enabled ? '✓' : '✗'
      console.log(`${status} ${plugin.name} v${plugin.version}`)
      console.log(`   Source: ${plugin.source}`)
      if (plugin.description) {
        console.log(`   ${plugin.description}`)
      }
      console.log()
    })
  })

program.parse()
```
