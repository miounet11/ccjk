# Startup Orchestrator Module

**Last Updated**: Thu Jan 16 2026

[Root](../../../CLAUDE.md) > [src](../../) > [utils](../) > **startup-orchestrator**

## Module Responsibilities

Coordinates the initialization of all capability enhancement modules during CCJK startup. Provides a robust orchestration system with dependency resolution, error handling, lifecycle hooks, and graceful degradation. Ensures optimal startup performance (target < 500ms) while maintaining system reliability.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Startup Orchestrator Flow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  onBeforeStart Hook                                              │
│       ↓                                                          │
│  ┌──────────────────┐                                           │
│  │  version-sync    │  (Independent, can skip)                  │
│  └────────┬─────────┘                                           │
│           ↓                                                      │
│  ┌──────────────────┐                                           │
│  │ config-guardian  │  (Depends on version-sync, critical)      │
│  └────────┬─────────┘                                           │
│           ↓                                                      │
│  onConfigValidated Hook                                          │
│           ↓                                                      │
│  ┌──────────────────┐                                           │
│  │   tool-router    │  (Independent, can skip)                  │
│  └────────┬─────────┘                                           │
│           ↓                                                      │
│  ┌──────────────────┐                                           │
│  │   zero-config    │  (Depends on config-guardian, can skip)   │
│  └────────┬─────────┘                                           │
│           ↓                                                      │
│  ┌──────────────────┐                                           │
│  │ capability-disc. │  (Depends on all, can skip)               │
│  └────────┬─────────┘                                           │
│           ↓                                                      │
│  onCapabilitiesLoaded Hook                                       │
│           ↓                                                      │
│  onReady Hook                                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Entry Points

### Main Orchestrator

```typescript
import { StartupOrchestrator, createDefaultOrchestrator } from './startup-orchestrator'

// Create orchestrator with default modules
const orchestrator = createDefaultOrchestrator()

// Or create custom orchestrator
const customOrchestrator = new StartupOrchestrator()
customOrchestrator.registerModule(myCustomModule)

// Register hooks
orchestrator.on('onReady', async (context) => {
  console.log('Startup complete!', context.capabilities)
})

// Execute startup
const result = await orchestrator.run()
```

## External Interfaces

### StartupOrchestrator Class

```typescript
class StartupOrchestrator {
  /**
   * Register a startup module
   */
  registerModule(module: StartupModule): void

  /**
   * Register a lifecycle hook
   */
  on(event: StartupEvent, handler: StartupHandler): void

  /**
   * Get current startup status
   */
  getStatus(): StartupStatus

  /**
   * Execute the complete startup flow
   */
  run(): Promise<StartupResult>

  /**
   * Reset orchestrator state
   */
  reset(): void
}
```

### Module Definition Interface

```typescript
interface StartupModule {
  name: string
  dependencies: string[]
  canSkip?: boolean
  execute: () => Promise<ModuleResult>
}

interface ModuleResult {
  status: 'success' | 'failed' | 'skipped'
  duration: number
  error?: string
  data?: unknown
}
```

### Lifecycle Hooks

```typescript
type StartupEvent = 
  | 'onBeforeStart'        // Before any module execution
  | 'onConfigValidated'    // After config-guardian completes
  | 'onCapabilitiesLoaded' // After capability discovery
  | 'onReady'              // All modules completed

type StartupHandler = (context: StartupContext) => void | Promise<void>

interface StartupContext {
  results: Map<string, ModuleResult>
  capabilities: Capability[]
  config: unknown
}
```

## Key Dependencies

### Internal Dependencies

```typescript
// Module definitions
import {
  createVersionSyncModule,
  createConfigGuardianModule,
  createToolRouterModule,
  createZeroConfigModule,
  createCapabilityDiscoveryModule,
} from './modules'

// Hook management
import { StartupHooks } from './hooks'

// Type definitions
import type {
  StartupModule,
  ModuleResult,
  StartupResult,
  StartupStatus,
} from './types'
```

### External Module Integration

```typescript
// Future integrations (TODO)
import { checkVersionSync } from '../version-sync'
import { validateAndRepairConfig } from '../config-guardian'
import { configureToolPriority } from '../tool-router'
import { activateZeroConfig } from '../zero-config'
import { discoverCapabilities } from '../capability-discovery'
```

## Data Models

### Startup Result

```typescript
interface StartupResult {
  success: boolean          // Overall success status
  duration: number          // Total startup time in ms
  modules: {
    [name: string]: {
      status: 'success' | 'failed' | 'skipped'
      duration: number
      error?: string
    }
  }
  capabilities: Capability[] // Discovered capabilities
}
```

### Capability Model

```typescript
interface Capability {
  id: string              // Unique capability identifier
  name: string            // Display name
  description: string     // User-friendly description
  enabled: boolean        // Activation status
  module: string          // Source module name
}
```

### Startup Status

```typescript
interface StartupStatus {
  phase: 'idle' | 'running' | 'completed' | 'failed'
  currentModule?: string  // Currently executing module
  progress: number        // 0-100 percentage
  startTime?: number      // Start timestamp
  endTime?: number        // End timestamp
}
```

## Module Definitions

### 1. Version Sync Module

- **Name**: `version-sync`
- **Dependencies**: None
- **Can Skip**: Yes
- **Purpose**: Check and synchronize versions across tools
- **Execution Time**: ~50ms

### 2. Config Guardian Module

- **Name**: `config-guardian`
- **Dependencies**: `version-sync`
- **Can Skip**: No (critical)
- **Purpose**: Validate and repair configuration files
- **Execution Time**: ~100ms

### 3. Tool Router Module

- **Name**: `tool-router`
- **Dependencies**: None
- **Can Skip**: Yes
- **Purpose**: Configure tool priority and routing
- **Execution Time**: ~30ms

### 4. Zero Config Module

- **Name**: `zero-config`
- **Dependencies**: `config-guardian`
- **Can Skip**: Yes
- **Purpose**: Activate zero-configuration features
- **Execution Time**: ~80ms

### 5. Capability Discovery Module

- **Name**: `capability-discovery`
- **Dependencies**: All other modules
- **Can Skip**: Yes
- **Purpose**: Discover and display available capabilities
- **Execution Time**: ~40ms

## Error Handling Strategy

### Graceful Degradation

```typescript
// Module execution with error handling
async executeModule(module: StartupModule): Promise<ModuleResult> {
  try {
    // Check dependencies
    if (!this.checkDependencies(module)) {
      return { status: 'skipped', duration: 0, error: 'Dependencies not satisfied' }
    }

    // Execute module
    const result = await module.execute()
    return result
  } catch (error) {
    // If module can be skipped, mark as skipped instead of failed
    if (module.canSkip) {
      return { status: 'skipped', duration: 0, error: error.message }
    }
    
    // Critical module failure
    return { status: 'failed', duration: 0, error: error.message }
  }
}
```

### Dependency Resolution

- Topological sort for execution order
- Circular dependency detection
- Failed dependency propagation
- Skipped module handling

## Performance Optimization

### Target Metrics

- **Total Startup Time**: < 500ms
- **Module Execution**: Parallel where possible
- **Memory Overhead**: < 10MB
- **CPU Usage**: Minimal blocking operations

### Optimization Strategies

1. **Parallel Execution**: Independent modules run concurrently
2. **Lazy Loading**: Module code loaded on-demand
3. **Caching**: Results cached for subsequent runs
4. **Early Exit**: Skip unnecessary modules based on context

## Testing Strategy

### Unit Tests

```typescript
// Test orchestrator initialization
describe('StartupOrchestrator', () => {
  it('should register modules correctly', () => {
    const orchestrator = new StartupOrchestrator()
    const module = createVersionSyncModule()
    orchestrator.registerModule(module)
    expect(orchestrator.getStatus().phase).toBe('idle')
  })

  it('should resolve execution order correctly', () => {
    // Test dependency resolution
  })

  it('should handle module failures gracefully', () => {
    // Test error handling
  })
})
```

### Integration Tests

```typescript
// Test complete startup flow
describe('Startup Flow', () => {
  it('should execute all modules in correct order', async () => {
    const orchestrator = createDefaultOrchestrator()
    const result = await orchestrator.run()
    expect(result.success).toBe(true)
    expect(result.duration).toBeLessThan(500)
  })

  it('should trigger hooks at correct times', async () => {
    // Test hook execution
  })
})
```

### Edge Cases

- Module timeout handling
- Circular dependency detection
- Hook error isolation
- Concurrent execution safety

## Usage Examples

### Basic Usage

```typescript
import { createDefaultOrchestrator } from './startup-orchestrator'

async function startupCCJK() {
  const orchestrator = createDefaultOrchestrator()
  
  const result = await orchestrator.run()
  
  if (result.success) {
    console.log(`Startup completed in ${result.duration}ms`)
    console.log(`Capabilities: ${result.capabilities.length}`)
  } else {
    console.error('Startup failed:', result.modules)
  }
}
```

### Custom Module Registration

```typescript
import { StartupOrchestrator } from './startup-orchestrator'

const orchestrator = new StartupOrchestrator()

// Register custom module
orchestrator.registerModule({
  name: 'my-custom-module',
  dependencies: ['config-guardian'],
  canSkip: true,
  async execute() {
    // Custom initialization logic
    return {
      status: 'success',
      duration: 50,
      data: { capabilities: [...] }
    }
  }
})

await orchestrator.run()
```

### Hook Registration

```typescript
orchestrator.on('onBeforeStart', async (context) => {
  console.log('Starting CCJK initialization...')
})

orchestrator.on('onConfigValidated', async (context) => {
  console.log('Configuration validated:', context.config)
})

orchestrator.on('onReady', async (context) => {
  console.log('CCJK ready with capabilities:', context.capabilities)
})
```

## Future Enhancements

### Planned Features

1. **Module Marketplace**: Dynamic module loading from registry
2. **Performance Profiling**: Detailed timing and bottleneck analysis
3. **Health Checks**: Post-startup validation and diagnostics
4. **Rollback Support**: Automatic rollback on critical failures
5. **Progressive Enhancement**: Gradual capability activation

### Integration Points

- CLI command integration (`npx ccjk startup`)
- Configuration file support (`.ccjkrc`)
- Environment variable overrides
- Debug mode with verbose logging

## Related Files

- `../version-sync/` - Version synchronization module (TODO)
- `../config-guardian/` - Configuration validation module (TODO)
- `../tool-router/` - Tool priority routing module (TODO)
- `../zero-config/` - Zero-configuration module (TODO)
- `../capability-discovery/` - Capability discovery module (TODO)

## Change Log

### 2026-01-16 - Initial Implementation

- Created startup orchestrator architecture
- Implemented dependency resolution system
- Added lifecycle hook management
- Defined module interfaces and types
- Established error handling strategy
- Set performance targets (< 500ms)
