# Hooks API v2.0

## Overview

The Hooks API provides a powerful traceability and enforcement mechanism for tracking critical operations in CCJK. It ensures that all important actions are logged, traceable, and optionally enforced through a multi-level hook system.

## Features

- **Multi-level Hooks**: L1 (logging), L2 (approval with bypass), L3 (strict enforcement)
- **Traceability**: Complete audit trail of all operations
- **Enforcement**: Optional strict mode for critical operations
- **Performance**: Minimal overhead with async hook execution
- **Extensibility**: Easy to add custom hooks

## Installation

```bash
npm install @ccjk/v2
```

## Quick Start

```typescript
import { HookEnforcer, HookLevel } from '@ccjk/v2'

// Initialize hook enforcer
const enforcer = new HookEnforcer({
  strictMode: true,
  auditLogPath: './audit.log'
})

// Define a hook
await enforcer.registerHook({
  id: 'file-write',
  level: HookLevel.LEVEL_3,
  description: 'Critical file write operation',
  handler: async (context) => {
    console.log(`Writing to ${context.filePath}`)
    // Perform file write
  }
})

// Execute hook (with enforcement)
const result = await enforcer.execute('file-write', {
  filePath: '/path/to/file',
  content: 'Hello, World!'
})

console.log(result.executed) // true
console.log(result.duration) // Execution time in ms
```

## API Reference

### HookEnforcer

Main class for managing and executing hooks.

#### Constructor

```typescript
constructor(options: HookEnforcerOptions)
```

**Parameters:**
- `options.strictMode` - Enable strict enforcement for L3 hooks (default: `false`)
- `options.auditLogPath` - Path to audit log file (optional)
- `options.maxHistorySize` - Maximum number of hook executions to keep in memory (default: `1000`)

#### Methods

##### registerHook

```typescript
async registerHook(hook: HookDefinition): Promise<void>
```

Registers a new hook.

**Parameters:**
- `hook.id` - Unique hook identifier
- `hook.level` - Hook level (L1, L2, or L3)
- `hook.description` - Human-readable description
- `hook.handler` - Async function to execute

**Example:**
```typescript
await enforcer.registerHook({
  id: 'api-call',
  level: HookLevel.LEVEL_2,
  description: 'External API call',
  handler: async (ctx) => {
    const response = await fetch(ctx.url, {
      method: ctx.method,
      body: ctx.body
    })
    return response.json()
  }
})
```

##### execute

```typescript
async execute(hookId: string, context: Record<string, any>): Promise<HookResult>
```

Executes a hook with the given context.

**Parameters:**
- `hookId` - Hook identifier
- `context` - Execution context (will be passed to handler)

**Returns:**
- `executed` - Whether the hook was executed
- `result` - Return value from handler
- `duration` - Execution time in milliseconds
- `timestamp` - ISO timestamp of execution

**Throws:**
- `HookNotFoundError` - If hook ID doesn't exist
- `HookEnforcementError` - If L3 hook bypass attempted in strict mode

**Example:**
```typescript
const result = await enforcer.execute('api-call', {
  url: 'https://api.example.com',
  method: 'POST',
  body: JSON.stringify({ data: 'test' })
})

console.log(`API call took ${result.duration}ms`)
```

##### bypass

```typescript
async bypass(hookId: string, reason: string): Promise<void>
```

Bypasses an L2 hook (not allowed for L3 in strict mode).

**Parameters:**
- `hookId` - Hook to bypass
- `reason` - Reason for bypass

**Throws:**
- `HookEnforcementError` - If trying to bypass L3 hook in strict mode

##### getHistory

```typescript
getHistory(hookId?: string): HookExecution[]
```

Retrieves execution history.

**Parameters:**
- `hookId` - Optional hook ID to filter by

**Returns:** Array of hook executions

##### getStats

```typescript
getStats(): HookStats
```

Gets statistics about hook executions.

**Returns:**
- `totalExecutions` - Total number of executions
- `executionsByHook` - Map of hook ID to execution count
- `averageDuration` - Average execution time in ms
- `bypassCount` - Number of bypasses

### HookLevel

Enum defining hook levels.

```typescript
enum HookLevel {
  LEVEL_1 = 1,  // Logging only
  LEVEL_2 = 2,  // Approval with bypass option
  LEVEL_3 = 3   // Strict enforcement (no bypass)
}
```

### Types

```typescript
interface HookDefinition {
  id: string
  level: HookLevel
  description: string
  handler: (context: Record<string, any>) => Promise<any>
}

interface HookResult {
  executed: boolean
  result?: any
  duration: number
  timestamp: string
}

interface HookExecution {
  hookId: string
  context: Record<string, any>
  result: HookResult
  bypassed?: boolean
  bypassReason?: string
}

interface HookStats {
  totalExecutions: number
  executionsByHook: Record<string, number>
  averageDuration: number
  bypassCount: number
}
```

## Configuration

### Hook Levels

Choose the appropriate level based on criticality:

**L1 (Logging)**
- Use for: Non-critical operations, debugging, observability
- Behavior: Always executes, logs result
- Example: Performance metrics, analytics

**L2 (Approval with Bypass)**
- Use for: Important operations that can be skipped
- Behavior: Requires explicit approval, can bypass
- Example: External API calls, resource-intensive operations

**L3 (Strict Enforcement)**
- Use for: Critical security or data integrity operations
- Behavior: Must execute, no bypass allowed in strict mode
- Example: File system writes, database mutations

### Strict Mode

When `strictMode` is enabled:
- L3 hooks cannot be bypassed
- Attempting to bypass throws `HookEnforcementError`
- Recommended for production environments

## Examples

### Example 1: File System Monitoring

```typescript
import { HookEnforcer, HookLevel } from '@ccjk/v2'

const enforcer = new HookEnforcer({ strictMode: true })

// Register file write hook
await enforcer.registerHook({
  id: 'fs-write',
  level: HookLevel.LEVEL_3,
  description: 'Critical file system write',
  handler: async (ctx) => {
    await fs.writeFile(ctx.path, ctx.content)
    return { bytesWritten: ctx.content.length }
  }
})

// All file writes go through hook
await enforcer.execute('fs-write', {
  path: '/data/config.json',
  content: JSON.stringify({ key: 'value' })
})
```

### Example 2: API Call Tracking

```typescript
// Register API call hook
await enforcer.registerHook({
  id: 'external-api',
  level: HookLevel.LEVEL_2,
  description: 'External API call',
  handler: async (ctx) => {
    const response = await fetch(ctx.url, {
      method: ctx.method || 'GET',
      headers: ctx.headers || {},
      body: ctx.body ? JSON.stringify(ctx.body) : undefined
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`)
    }

    return await response.json()
  }
})

// Execute API call with tracking
try {
  const result = await enforcer.execute('external-api', {
    url: 'https://api.example.com/users',
    method: 'GET'
  })
  console.log('API result:', result.result)
} catch (error) {
  // Bypass for fallback
  await enforcer.bypass('external-api', 'API unavailable, using cache')
}
```

### Example 3: Performance Monitoring

```typescript
// Register performance hook
await enforcer.registerHook({
  id: 'perf-metric',
  level: HookLevel.LEVEL_1,
  description: 'Performance metric collection',
  handler: async (ctx) => {
    const startTime = Date.now()
    const result = await ctx.operation()
    const duration = Date.now() - startTime

    // Log to metrics system
    metrics.histogram(ctx.metricName, duration)

    return result
  }
})

// Wrap operations with performance tracking
const result = await enforcer.execute('perf-metric', {
  operation: () => databaseQuery('SELECT * FROM users'),
  metricName: 'db.query.duration'
})
```

### Example 4: Audit Trail

```typescript
const enforcer = new HookEnforcer({
  strictMode: true,
  auditLogPath: './audit.json'
})

// Register audit hook
await enforcer.registerHook({
  id: 'sensitive-operation',
  level: HookLevel.LEVEL_3,
  description: 'Sensitive data operation',
  handler: async (ctx) => {
    // Log to audit trail
    const auditEntry = {
      timestamp: new Date().toISOString(),
      user: ctx.userId,
      action: ctx.action,
      resource: ctx.resourceId
    }

    await fs.appendFile('./audit.json', JSON.stringify(auditEntry) + '\n')

    // Execute operation
    return await ctx.operation()
  }
})

// All sensitive operations are automatically audited
await enforcer.execute('sensitive-operation', {
  userId: 'user-123',
  action: 'DELETE',
  resourceId: 'document-456',
  operation: () => deleteDocument('document-456')
})
```

## Error Handling

### HookNotFoundError

Thrown when attempting to execute a non-existent hook.

```typescript
try {
  await enforcer.execute('non-existent-hook', {})
} catch (error) {
  if (error instanceof HookNotFoundError) {
    console.error('Hook not found:', error.message)
  }
}
```

### HookEnforcementError

Thrown when attempting to bypass a Level 3 hook in strict mode.

```typescript
try {
  await enforcer.bypass('critical-hook', 'trying to bypass')
} catch (error) {
  if (error instanceof HookEnforcementError) {
    console.error('Cannot bypass critical hook:', error.message)
  }
}
```

## Performance

- **Overhead**: < 1ms per hook execution (excluding handler time)
- **Async**: All hooks execute asynchronously
- **Memory**: O(n) where n is maxHistorySize (default: 1000)
- **Audit Logging**: Optional, writes to disk asynchronously

## Best Practices

1. **Choose the Right Level**
   - Use L1 for non-critical operations
   - Use L2 for important operations with fallback options
   - Use L3 for security-critical operations

2. **Keep Handlers Fast**
   - Hook handlers should be lightweight
   - Offload heavy work to background tasks
   - Use async operations

3. **Use Descriptive IDs**
   - Hook IDs should be self-documenting
   - Example: `file-write`, `api-call`, `db-query`

4. **Enable Strict Mode in Production**
   - Prevents accidental bypasses of critical hooks
   - Provides stronger guarantees

5. **Monitor Hook Statistics**
   - Regularly check `getStats()` for unusual patterns
   - Look for high bypass counts

## See Also

- [Brain API](./brain-v2.md) - Intelligent context management
- [Skills API](./skills-v2.md) - Dynamic skill loading
- [Agents API](./agents-v2.md) - Multi-agent orchestration
