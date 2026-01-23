# Actionbook API v2.0

## Overview

The Actionbook API provides a comprehensive system for tracking, recording, and replaying actions in CCJK. It serves as an audit trail and action replay system, enabling users to track what happened, when it happened, and who performed the action. The API supports action versioning, rollback capabilities, and detailed action metadata.

## Features

- **Action Tracking**: Record all actions with full context
- **Action Replay**: Replay actions with the same context
- **Version Control**: Track action versions and changes
- **Rollback Support**: Revert to previous states
- **Audit Trail**: Complete audit log of all actions
- **Action Analytics**: Analyze action patterns and performance

## Installation

```bash
npm install @ccjk/v2
```

## Quick Start

```typescript
import { Actionbook, Action } from '@ccjk/v2'

// Initialize actionbook
const actionbook = new Actionbook({
  storagePath: './actions',
  enableCompression: true,
  retentionDays: 30
})

// Define an action
const action: Action = {
  id: 'create-file',
  name: 'Create File',
  version: '1.0.0',
  description: 'Creates a new file',

  async execute(context) {
    const { filePath, content } = context.params
    await fs.writeFile(filePath, content)
    return { filePath, size: content.length }
  },

  async rollback(context) {
    const { filePath } = context.params
    await fs.unlink(filePath)
    return { rolledBack: true }
  }
}

// Register and execute
await actionbook.registerAction(action)
const result = await actionbook.execute('create-file', {
  filePath: 'notes.txt',
  content: 'Hello, World!'
})

console.log('Action executed:', result.success)
console.log('Action ID:', result.actionId)

// Get action history
const history = await actionbook.getHistory('create-file')
console.log('Executed', history.length, 'times')
```

## API Reference

### Actionbook

Main class for managing actions.

#### Constructor

```typescript
constructor(options: ActionbookOptions)
```

**Parameters:**
- `options.storagePath` - Path to store actions (default: `'./actions'`)
- `options.enableCompression` - Enable compression (default: `true`)
- `options.retentionDays` - Action retention in days (default: `30`)
- `options.enableEncryption` - Enable encryption (default: `false`)

#### Methods

##### registerAction

```typescript
async registerAction(action: Action): Promise<void>
```

Registers a new action.

**Parameters:**
- `action.id` - Unique action identifier
- `action.name` - Human-readable name
- `action.version` - Semantic version
- `action.description` - Action description
- `action.execute` - Async execution function
- `action.rollback` - Async rollback function (optional)
- `action.schema` - JSON schema for validation (optional)
- `action.permissions` - Required permissions (optional)

**Throws:**
- `ActionValidationError` - If action validation fails
- `ActionConflictError` - If action ID already exists

**Example:**
```typescript
await actionbook.registerAction({
  id: 'database-migration',
  name: 'Database Migration',
  version: '2.0.0',
  description: 'Runs database migrations',

  async execute(context) {
    const { migrationId, database } = context.params

    // Run migration
    await database.runMigration(migrationId)

    return {
      migrationId,
      executedAt: new Date().toISOString(),
      status: 'completed'
    }
  },

  async rollback(context) {
    const { migrationId, database } = context.params

    // Revert migration
    await database.revertMigration(migrationId)

    return {
      migrationId,
      revertedAt: new Date().toISOString(),
      status: 'rolled-back'
    }
  },

  schema: {
    type: 'object',
    properties: {
      migrationId: { type: 'string' },
      database: { type: 'object' }
    },
    required: ['migrationId', 'database']
  }
})
```

##### execute

```typescript
async execute(actionId: string, context: ExecutionContext): Promise<ActionResult>
```

Executes an action.

**Parameters:**
- `actionId` - Action to execute
- `context.params` - Parameters to pass
- `context.metadata` - Additional metadata
- `context.userId` - User performing the action
- `context.requestId` - Request identifier

**Returns:**
- `success` - Whether execution succeeded
- `result` - Return value from action
- `actionId` - Unique execution ID
- `timestamp` - Execution timestamp
- `version` - Action version used

**Throws:**
- `ActionNotFoundError` - If action doesn't exist
- `ActionExecutionError` - If execution fails
- `ActionPermissionError` - If permission denied

**Example:**
```typescript
const result = await actionbook.execute('database-migration', {
  params: {
    migrationId: '2024-01-01-add-users-table',
    database: dbConnection
  },
  metadata: {
    reason: 'Adding user management feature'
  },
  userId: 'user-123',
  requestId: 'req-456'
})

console.log('Migration result:', result.result)
console.log('Execution ID:', result.actionId)
```

##### rollback

```typescript
async rollback(actionExecutionId: string, context?: RollbackContext): Promise<RollbackResult>
```

Rolls back an executed action.

**Parameters:**
- `actionExecutionId` - ID from execute result
- `context` - Additional rollback context

**Returns:**
- `success` - Whether rollback succeeded
- `result` - Rollback result
- `timestamp` - Rollback timestamp

**Throws:**
- `RollbackNotSupportedError` - If action has no rollback
- `RollbackError` - If rollback fails

**Example:**
```typescript
try {
  // Execute action
  const result = await actionbook.execute('create-file', {
    params: { filePath: 'test.txt', content: 'test' }
  })

  // Later, roll it back
  const rollback = await actionbook.rollback(result.actionId)
  console.log('Rollback successful:', rollback.success)
} catch (error) {
  if (error instanceof RollbackError) {
    console.error('Rollback failed:', error.message)
  }
}
```

##### replay

```typescript
async replay(actionExecutionId: string): Promise<ActionResult>
```

Replays an action with the same parameters.

**Parameters:**
- `actionExecutionId` - ID to replay

**Returns:** Replay result

##### getHistory

```typescript
async getHistory(filters?: HistoryFilters): Promise<ActionRecord[]>
```

Gets action execution history.

**Parameters:**
- `filters.actionId` - Filter by action ID
- `filters.userId` - Filter by user ID
- `filters.status` - Filter by status
- `filters.startDate` - Filter by start date
- `filters.endDate` - Filter by end date
- `filters.limit` - Limit results (default: `100`)

##### getAction

```typescript
getAction(actionId: string): Action | undefined
```

Gets an action definition.

##### listActions

```typescript
listActions(filter?: ActionFilter): ActionInfo[]
```

Lists registered actions.

##### getMetrics

```typescript
getMetrics(actionId?: string): ActionMetrics
```

Gets action execution metrics.

**Returns:**
- `executions` - Total executions
- `successRate` - Success rate (0-1)
- `averageDuration` - Average execution time
- `rollbackRate` - Rollback rate (0-1)
- `popularActions` - Most executed actions

### Action Analytics

Analytics for action patterns and performance.

#### Methods

##### getUsagePatterns

```typescript
getUsagePatterns(options?: AnalyticsOptions): UsagePattern[]
```

Gets usage patterns across all actions.

**Returns:** Array of usage patterns including frequency, timing, and success rates.

##### getPerformanceMetrics

```typescript
getPerformanceMetrics(actionId?: string): PerformanceMetrics
```

Gets detailed performance metrics.

##### getErrorAnalysis

```typescript
getErrorAnalysis(filters?: ErrorFilters): ErrorAnalysis
```

Analyzes errors across actions.

**Returns:**
- `topErrors` - Most frequent errors
- `errorTrends` - Error trends over time
- `errorCategories` - Errors by category
- `recoveryRate` - Rate of successful recoveries

### Types

```typescript
interface Action {
  id: string
  name: string
  version: string
  description: string
  execute: (context: ExecutionContext) => Promise<any>
  rollback?: (context: RollbackContext) => Promise<any>
  schema?: JSONSchema
  permissions?: string[]
  metadata?: Record<string, any>
}

interface ExecutionContext {
  params: Record<string, any>
  metadata?: Record<string, any>
  userId?: string
  requestId?: string
  timestamp: string
  version: string
}

interface ActionResult {
  success: boolean
  result?: any
  actionId: string
  timestamp: string
  version: string
}

interface RollbackContext {
  executionId: string
  originalContext: ExecutionContext
  additionalData?: Record<string, any>
}

interface RollbackResult {
  success: boolean
  result?: any
  timestamp: string
}

interface ActionRecord {
  executionId: string
  actionId: string
  userId?: string
  requestId?: string
  status: 'success' | 'failed' | 'rolled-back'
  result?: any
  error?: string
  timestamp: string
  duration: number
  version: string
}

interface ActionInfo {
  id: string
  name: string
  version: string
  description: string
  hasRollback: boolean
  registeredAt: string
  executionCount: number
}
```

## Configuration

### Storage Options

```typescript
const actionbook = new Actionbook({
  storagePath: './actions',
  enableCompression: true,
  compressionLevel: 6, // 1-9
  retentionDays: 90,
  enableEncryption: true,
  encryptionKey: process.env.ACTIONBOOK_KEY
})
```

### Action Metadata

Actions can include metadata for organization:

```typescript
const action: Action = {
  id: 'deploy-service',
  name: 'Deploy Service',
  version: '1.0.0',
  description: 'Deploys a microservice',

  metadata: {
    category: 'deployment',
    tags: ['production', 'kubernetes'],
    author: 'DevOps Team',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-15',
    documentation: 'https://docs.example.com/deploy'
  },

  execute: async (context) => {
    // Implementation
  }
}
```

## Examples

### Example 1: File Operations

```typescript
// File operations with rollback
const fileActions = {
  create: {
    id: 'file-create',
    name: 'Create File',
    version: '1.0.0',

    async execute(context) {
      const { path, content } = context.params
      await fs.writeFile(path, content)
      return { path, size: content.length }
    },

    async rollback(context) {
      const { path } = context.originalContext.params
      await fs.unlink(path)
      return { deleted: path }
    }
  },

  move: {
    id: 'file-move',
    name: 'Move File',
    version: '1.0.0',

    async execute(context) {
      const { from, to } = context.params
      await fs.rename(from, to)
      return { from, to }
    },

    async rollback(context) {
      const { from, to } = context.originalContext.params
      await fs.rename(to, from)
      return { movedBack: true }
    }
  }
}

// Register actions
await actionbook.registerAction(fileActions.create)
await actionbook.registerAction(fileActions.move)

// Execute with rollback capability
const createResult = await actionbook.execute('file-create', {
  params: { path: 'temp.txt', content: 'test' }
})

// Move the file
const moveResult = await actionbook.execute('file-move', {
  params: { from: 'temp.txt', to: 'moved.txt' }
})

// Rollback both actions
await actionbook.rollback(moveResult.actionId)
await actionbook.rollback(createResult.actionId)
```

### Example 2: Database Operations

```typescript
const migrationAction: Action = {
  id: 'database-migration',
  name: 'Database Migration',
  version: '2.0.0',
  description: 'Runs database migrations with rollback',

  async execute(context) {
    const { migrationName, database } = context.params

    // Create backup before migration
    const backup = await database.createBackup(migrationName)

    try {
      // Run migration
      await database.runMigration(migrationName)

      return {
        migrationName,
        backupId: backup.id,
        status: 'completed'
      }
    } catch (error) {
      // Restore from backup on failure
      await database.restoreBackup(backup.id)
      throw error
    }
  },

  async rollback(context) {
    const { migrationName, backupId } = context.originalContext.result

    // Restore from backup
    await database.restoreBackup(backupId)

    return {
      migrationName,
      backupId,
      status: 'rolled-back'
    }
  }
}

// Execute migration
const result = await actionbook.execute('database-migration', {
  params: {
    migrationName: 'add-users-table',
    database: dbConnection
  },
  userId: 'admin-123'
})

// Later, roll it back
await actionbook.rollback(result.actionId)
```

### Example 3: API Operations with Audit Trail

```typescript
const apiAction: Action = {
  id: 'api-request',
  name: 'API Request',
  version: '1.0.0',
  description: 'Makes authenticated API calls',

  async execute(context) {
    const { method, endpoint, data, token } = context.params

    // Log the API call
    console.log(`API Call: ${method} ${endpoint}`)

    // Make the request
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const result = await response.json()

    return {
      status: response.status,
      data: result,
      endpoint,
      method
    }
  }
}

// Execute multiple API calls
const results = await Promise.all([
  actionbook.execute('api-request', {
    params: {
      method: 'GET',
      endpoint: 'https://api.example.com/users',
      token: 'secret-token'
    },
    userId: 'user-123',
    requestId: 'req-456'
  }),
  actionbook.execute('api-request', {
    params: {
      method: 'POST',
      endpoint: 'https://api.example.com/posts',
      data: { title: 'New Post' },
      token: 'secret-token'
    },
    userId: 'user-123',
    requestId: 'req-789'
  })
])

// Get audit trail
const history = await actionbook.getHistory({
  userId: 'user-123',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
})

console.log('User made', history.length, 'API calls in January')
```

### Example 4: Action Replay

```typescript
// Execute an action
const original = await actionbook.execute('file-create', {
  params: { path: 'report.txt', content: 'Monthly Report' }
})

// Later, replay the same action
const replay = await actionbook.replay(original.actionId)

console.log('Replay result:', replay.result)
console.log('Original vs Replay:', original.actionId === replay.actionId ? 'Same' : 'Different')

// Get the action record details
const record = await actionbook.getHistory({
  executionId: original.actionId
})

console.log('Original execution:', record[0])
console.log('Replay execution:', record[1])
```

### Example 5: Analytics and Metrics

```typescript
// Get action metrics
const metrics = actionbook.getMetrics()

console.log('Action Metrics:')
console.log(`- Total executions: ${metrics.executions}`)
console.log(`- Success rate: ${(metrics.successRate * 100).toFixed(1)}%`)
console.log(`- Average duration: ${metrics.averageDuration}ms`)
console.log(`- Rollback rate: ${(metrics.rollbackRate * 100).toFixed(1)}%`)

// Get usage patterns
const patterns = actionbook.analytics.getUsagePatterns()

console.log('Most used actions:')
patterns.slice(0, 5).forEach(pattern => {
  console.log(`- ${pattern.actionId}: ${pattern.frequency} times`)
})

// Get error analysis
const errors = actionbook.analytics.getErrorAnalysis()

console.log('Top errors:')
errors.topErrors.forEach(error => {
  console.log(`- ${error.type}: ${error.count} occurrences`)
})

console.log('Recovery rate:', (errors.recoveryRate * 100).toFixed(1), '%')
```

## Error Handling

### ActionNotFoundError

```typescript
try {
  await actionbook.execute('non-existent')
} catch (error) {
  if (error instanceof ActionNotFoundError) {
    console.error('Action not found:', error.actionId)
  }
}
```

### ActionExecutionError

```typescript
try {
  await actionbook.execute('failing-action', {
    params: { willFail: true }
  })
} catch (error) {
  if (error instanceof ActionExecutionError) {
    console.error('Action failed:', error.message)
    console.error('Action ID:', error.actionId)
    console.error('Context:', error.context)
  }
}
```

### RollbackNotSupportedError

```typescript
try {
  await actionbook.rollback('no-rollback-action')
} catch (error) {
  if (error instanceof RollbackNotSupportedError) {
    console.error('Action does not support rollback')
  }
}
```

## Performance

- **Action Execution**: < 1ms overhead (excluding action time)
- **Rollback**: < 2ms overhead (excluding rollback time)
- **Storage**: ~1KB per action record (compressed)
- **Search**: O(log n) for indexed fields
- **Analytics**: Real-time with millisecond latency

## Best Practices

1. **Always Implement Rollback**
   - Every action that changes state should have rollback
   - Test rollback functionality thoroughly
   - Document rollback behavior

2. **Use Schema Validation**
   - Define JSON schemas for all actions
   - Validate inputs before execution
   - Provide clear error messages

3. **Include Metadata**
   - Add meaningful metadata to actions
   - Track user and request IDs
   - Include timestamps

4. **Monitor Performance**
   - Track execution times
   - Monitor error rates
   - Set up alerts for failures

5. **Secure Sensitive Data**
   - Use encryption for sensitive parameters
   - Don't log sensitive information
   - Use environment variables for secrets

6. **Version Your Actions**
   - Use semantic versioning
   - Document changes
   - Test backwards compatibility

## See Also

- [Hooks API](./hooks-v2.md) - Traceability and enforcement
- [Skills API](./skills-v2.md) - Dynamic skill loading
- [Agents API](./agents-v2.md) - Multi-agent orchestration
- [Workflow API](./workflow-v2.md) - Workflow generation

---

**Source**: [src/actionbook/actionbook.ts](../../src/actionbook/actionbook.ts#L1)

**Last Updated**: 2026-01-23