# CCJK Plugin System v4.0.0

## Overview

The CCJK Plugin System provides a comprehensive, extensible architecture for enhancing CCJK functionality through plugins. Following the Twin Dragons philosophy, the plugin system amplifies Claude Code's capabilities while maintaining zero-friction user experience.

## Architecture

### Core Components

```
src/core/
├── plugin-system.ts    # Core plugin architecture
│   ├── CCJKPlugin interface
│   ├── PluginManager class
│   ├── Hook types and handlers
│   └── Plugin validation
└── hooks.ts           # Hook execution system
    ├── HookExecutor
    ├── HookUtils
    └── Built-in hooks

src/plugins/
├── analytics.ts       # Usage analytics plugin
├── performance.ts     # Performance monitoring plugin
├── ccm.ts            # Claude Code Manager integration
└── index.ts          # Plugin exports

tests/
├── core/
│   ├── plugin-system.test.ts  # Plugin system tests (23 tests)
│   └── hooks.test.ts          # Hook system tests (28 tests)
└── plugins/
    ├── analytics.test.ts      # Analytics plugin tests (14 tests)
    └── performance.test.ts    # Performance plugin tests (20 tests)
```

## Plugin System Features

### 1. Type-Safe Plugin Development

```typescript
import { CCJKPlugin, createPlugin, PluginHookType } from '@ccjk/core'

const myPlugin: CCJKPlugin = createPlugin({
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My awesome plugin',
  
  hooks: {
    [PluginHookType.PreCommand]: async (context) => {
      // Execute before commands
      return { success: true, continue: true }
    },
  },
  
  commands: [
    {
      name: 'my-command',
      description: 'Custom command',
      handler: async (args, options) => {
        // Command implementation
      },
    },
  ],
})
```

### 2. Hook System

**Available Hook Types:**
- `PreInit` - Before CCJK initialization
- `PostInit` - After CCJK initialization
- `PreCommand` - Before command execution
- `PostCommand` - After command execution
- `OnError` - When errors occur
- `PreConfig` - Before configuration changes
- `PostConfig` - After configuration changes
- `PreWorkflow` - Before workflow installation
- `PostWorkflow` - After workflow installation
- `PreMcp` - Before MCP service configuration
- `PostMcp` - After MCP service configuration
- `Shutdown` - On CCJK shutdown

**Hook Context:**
```typescript
interface HookContext {
  hookType: PluginHookType
  command?: string
  args?: string[]
  config?: Record<string, any>
  error?: Error
  workflow?: { id: string, type: string, agents?: string[] }
  mcpService?: { id: string, name: string }
  timestamp: number
  lang?: 'en' | 'zh-CN'
  metadata?: Record<string, any>
}
```

### 3. Plugin Manager

```typescript
import { pluginManager } from '@ccjk/core'

// Register a plugin
await pluginManager.register(myPlugin)

// Execute hooks
const results = await pluginManager.executeHook(
  PluginHookType.PreCommand,
  { command: 'init', args: [] }
)

// Get registered plugins
const plugins = pluginManager.getAllPlugins()

// Unregister a plugin
await pluginManager.unregister('my-plugin')
```

### 4. Built-in Hooks

**Profiling Hook:**
```typescript
import { profilingHook } from '@ccjk/core'
// Tracks execution time and memory usage
```

**Analytics Hook:**
```typescript
import { analyticsHook } from '@ccjk/core'
// Tracks command usage patterns
```

**Cleanup Hook:**
```typescript
import { cleanupHook } from '@ccjk/core'
// Performs cleanup on shutdown
```

**Error Logging Hook:**
```typescript
import { errorLoggingHook } from '@ccjk/core'
// Logs errors with context
```

## Built-in Plugins

### 1. Analytics Plugin

**Features:**
- Command usage tracking
- Error pattern analysis
- Performance metrics collection
- Anonymous usage statistics

**Usage:**
```bash
# View analytics report
ccjk analytics

# Clear analytics data
ccjk analytics clear
```

**Configuration:**
```typescript
{
  enabled: true,
  options: {
    trackCommands: true,
    trackErrors: true,
    trackPerformance: true,
    showSummaryOnShutdown: false,
  }
}
```

### 2. Performance Plugin

**Features:**
- Real-time performance monitoring
- Memory usage tracking
- Execution time profiling
- Slow operation warnings

**Usage:**
```bash
# View performance report
ccjk performance

# Clear performance data
ccjk performance clear
```

**Configuration:**
```typescript
{
  enabled: true,
  options: {
    trackAll: true,
    showWarnings: true,
    slowOperationThreshold: 5000, // ms
    showSummaryOnShutdown: false,
  }
}
```

### 3. CCM Plugin

**Features:**
- Claude Code version management
- Installation switching
- Configuration synchronization
- Multi-instance support

**Usage:**
```bash
# List installations
ccjk ccm list

# Install version
ccjk ccm install 1.2.0

# Switch version
ccjk ccm use 1.2.0

# Update to latest
ccjk ccm update

# Show current version
ccjk ccm current
```

## Plugin Development Guide

### Creating a Plugin

1. **Define Plugin Structure:**

```typescript
import { CCJKPlugin, createPlugin, PluginHookType } from '@ccjk/core'

const myPlugin: CCJKPlugin = createPlugin({
  name: 'ccjk-my-plugin',
  version: '1.0.0',
  description: 'My plugin description',
  author: 'Your Name',
  homepage: 'https://github.com/your/plugin',
  
  // Optional: Minimum CCJK version required
  minCcjkVersion: '4.0.0',
  
  // Plugin configuration
  config: {
    enabled: true,
    options: {
      customOption: 'value',
    },
  },
  
  // Initialization
  async init(manager) {
    // Setup code
  },
  
  // Cleanup
  async cleanup() {
    // Cleanup code
  },
  
  // Hook handlers
  hooks: {
    [PluginHookType.PreCommand]: async (context) => {
      return { success: true, continue: true }
    },
  },
  
  // Custom commands
  commands: [
    {
      name: 'my-command',
      description: 'My custom command',
      aliases: ['mc'],
      handler: async (args, options) => {
        console.log('Command executed!')
      },
    },
  ],
})

export default myPlugin
```

2. **Register Plugin:**

```typescript
import { pluginManager } from '@ccjk/core'
import myPlugin from './my-plugin'

await pluginManager.register(myPlugin)
```

3. **Test Plugin:**

```typescript
import { describe, expect, it, beforeEach } from 'vitest'
import { PluginManager } from '@ccjk/core'
import myPlugin from './my-plugin'

describe('My Plugin', () => {
  let manager: PluginManager
  
  beforeEach(() => {
    manager = new PluginManager()
  })
  
  it('should register successfully', async () => {
    await expect(manager.register(myPlugin)).resolves.not.toThrow()
  })
})
```

### Best Practices

1. **Plugin Naming:**
   - Use prefix `ccjk-` for official plugins
   - Use descriptive names (e.g., `ccjk-analytics`, `ccjk-performance`)

2. **Version Management:**
   - Follow semantic versioning (semver)
   - Specify `minCcjkVersion` for compatibility

3. **Error Handling:**
   - Always return `{ success: boolean, continue: boolean }` from hooks
   - Use `continue: false` to stop execution chain
   - Handle errors gracefully

4. **Performance:**
   - Keep hooks lightweight
   - Use async operations appropriately
   - Avoid blocking operations

5. **Configuration:**
   - Provide sensible defaults
   - Make options configurable
   - Document all configuration options

## Hook Execution

### Basic Execution

```typescript
import { executeHook, PluginHookType } from '@ccjk/core'

const stats = await executeHook(
  PluginHookType.PreCommand,
  { command: 'init' }
)

console.log(`Executed ${stats.totalHooks} hooks`)
console.log(`Success: ${stats.successfulHooks}`)
console.log(`Failed: ${stats.failedHooks}`)
```

### Advanced Execution

```typescript
import { HookExecutor, PluginHookType } from '@ccjk/core'

const stats = await HookExecutor.executeWithTimeout(
  PluginHookType.PreCommand,
  { command: 'init' },
  {
    timeout: 5000,        // 5 second timeout
    parallel: false,      // Sequential execution
    stopOnError: false,   // Continue on errors
    verbose: true,        // Log execution
  }
)
```

### Retry Logic

```typescript
import { executeHookWithRetry, PluginHookType } from '@ccjk/core'

const stats = await executeHookWithRetry(
  PluginHookType.PreCommand,
  { command: 'init' },
  3,      // Max retries
  1000    // Retry delay (ms)
)
```

## Internationalization

Plugin system supports i18n through dedicated translation files:

**English:** `src/i18n/locales/en/plugin-system.json`
**Chinese:** `src/i18n/locales/zh-CN/plugin-system.json`

**Usage in plugins:**
```typescript
import { i18n } from '@ccjk/i18n'

const message = i18n.t('plugin-system.analytics.title')
```

## Testing

### Test Coverage

- **Plugin System:** 23 tests (100% pass rate)
- **Hook System:** 28 tests (100% pass rate)
- **Analytics Plugin:** 14 tests (100% pass rate)
- **Performance Plugin:** 20 tests (100% pass rate)

**Total:** 85 tests, 100% pass rate

### Running Tests

```bash
# Run all plugin tests
pnpm vitest run tests/core/ tests/plugins/

# Run specific test file
pnpm vitest run tests/core/plugin-system.test.ts

# Run with coverage
pnpm vitest run --coverage tests/core/ tests/plugins/
```

## API Reference

### CCJKPlugin Interface

```typescript
interface CCJKPlugin {
  name: string
  version: string
  description: string
  author?: string
  homepage?: string
  minCcjkVersion?: string
  maxCcjkVersion?: string
  init?: (manager: PluginManager) => Promise<void>
  cleanup?: () => Promise<void>
  hooks?: Partial<Record<PluginHookType, HookHandler>>
  commands?: PluginCommand[]
  config?: PluginConfig
}
```

### PluginManager Class

```typescript
class PluginManager {
  async register(plugin: CCJKPlugin): Promise<void>
  async unregister(pluginName: string): Promise<void>
  async executeHook(hookType: PluginHookType, context: Partial<HookContext>): Promise<HookResult[]>
  getPlugin(pluginName: string): CCJKPlugin | undefined
  getAllPlugins(): CCJKPlugin[]
  getCommand(commandName: string): PluginCommand | undefined
  getAllCommands(): PluginCommand[]
  setEnabled(enabled: boolean): void
  isEnabled(): boolean
}
```

### HookExecutor Class

```typescript
class HookExecutor {
  static async executeWithTimeout(
    hookType: PluginHookType,
    context: Partial<HookContext>,
    options?: HookExecutionOptions
  ): Promise<HookExecutionStats>
  
  static async executeWithRetry(
    hookType: PluginHookType,
    context: Partial<HookContext>,
    maxRetries?: number,
    retryDelay?: number
  ): Promise<HookExecutionStats>
}
```

## Future Enhancements

1. **Plugin Marketplace:**
   - Cloud-based plugin registry
   - Plugin discovery and installation
   - Version management

2. **Plugin Dependencies:**
   - Declare plugin dependencies
   - Automatic dependency resolution
   - Conflict detection

3. **Plugin Sandboxing:**
   - Isolated execution environment
   - Permission system
   - Resource limits

4. **Hot Reloading:**
   - Reload plugins without restart
   - Development mode support
   - Live debugging

5. **Plugin CLI:**
   - `ccjk plugin install <name>`
   - `ccjk plugin list`
   - `ccjk plugin enable/disable <name>`

## Contributing

To contribute a plugin:

1. Follow the plugin development guide
2. Write comprehensive tests (80%+ coverage)
3. Add i18n translations (en + zh-CN)
4. Document all features and APIs
5. Submit PR with plugin code and tests

## License

MIT License - See LICENSE file for details

---

**Built with ❤️ following the Twin Dragons Philosophy**

*"没有 Claude Code 就没有 CCJK，没有 CCJK 就没有更好的 Claude Code 体验"*
