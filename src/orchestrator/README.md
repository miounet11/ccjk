# CCJK Orchestrator EventBus

A powerful, type-safe event bus implementation for the CCJK Orchestrator system.

## Features

- ✅ **Asynchronous Event Handling** - All listeners execute asynchronously
- ✅ **Event Priority** - Control execution order with priority levels
- ✅ **One-Time Listeners** - Automatic cleanup with `once()` method
- ✅ **Wildcard Matching** - Subscribe to multiple events with patterns
- ✅ **Event History** - Debug and audit with built-in event recording
- ✅ **Type Safety** - Full TypeScript support with type inference
- ✅ **Error Handling** - Robust error recovery without breaking other listeners
- ✅ **Scoped Events** - Namespace isolation for modular systems

## Installation

```typescript
import { EventBus, createEventBus } from './orchestrator/events'
import type { OrchestratorEventType } from './orchestrator/types'
```

## Quick Start

### Basic Usage

```typescript
// Create an event bus
const eventBus = new EventBus()

// Subscribe to an event
eventBus.on('workflow:start', (event) => {
  console.log('Workflow started:', event.data)
})

// Emit an event
await eventBus.emit('workflow:start', { workflowId: 'my-workflow' })
```

### One-Time Listeners

```typescript
// Execute listener only once
eventBus.once('workflow:complete', (event) => {
  console.log('Workflow completed:', event.data)
})

await eventBus.emit('workflow:complete', { workflowId: 'my-workflow' })
await eventBus.emit('workflow:complete', { workflowId: 'another-workflow' })
// Listener only executes for the first emission
```

### Event Priority

```typescript
// Higher priority listeners execute first
eventBus.on('task:start', () => {
  console.log('High priority')
}, { priority: 10 })

eventBus.on('task:start', () => {
  console.log('Low priority')
}, { priority: 1 })

await eventBus.emit('task:start', { taskId: 'task-1' })
// Output:
// High priority
// Low priority
```

### Wildcard Events

```typescript
// Subscribe to all workflow events
eventBus.on('workflow:*', (event) => {
  console.log('Workflow event:', event.type, event.data)
})

// Subscribe to all start events
eventBus.on('*:start', (event) => {
  console.log('Start event:', event.type)
})

await eventBus.emit('workflow:start', { workflowId: 'wf-1' })
await eventBus.emit('task:start', { taskId: 'task-1' })
// Both listeners will be triggered
```

### Unsubscribing

```typescript
// Get subscription object
const subscription = eventBus.on('task:complete', (event) => {
  console.log('Task completed')
})

// Unsubscribe when done
subscription.unsubscribe()

// Or remove all listeners for an event
eventBus.off('task:complete')
```

## Advanced Features

### Event History

```typescript
// Create event bus with history enabled
const eventBus = new EventBus({
  enableHistory: true,
  maxHistorySize: 100,
})

// Emit some events
await eventBus.emit('workflow:start', { workflowId: 'wf-1' })
await eventBus.emit('task:start', { taskId: 'task-1' })

// Get all history
const history = eventBus.getHistory()

// Filter history
const workflowHistory = eventBus.getHistory(entry =>
  entry.event.startsWith('workflow:'),
)

// Clear history
eventBus.clearHistory()
```

### Wait for Events

```typescript
// Wait for a specific event
const event = await eventBus.waitFor('workflow:complete')
console.log('Workflow completed:', event.data)

// Wait with timeout (in milliseconds)
try {
  const event = await eventBus.waitFor('workflow:complete', 5000)
  console.log('Completed within 5 seconds')
}
catch (error) {
  console.error('Timeout waiting for completion')
}
```

### Scoped Event Bus

```typescript
// Create a scoped event bus for namespace isolation
const agentBus = eventBus.createScope('agent')

// Events are automatically prefixed
agentBus.on('task:start', (event) => {
  console.log('Agent task started')
})

// Emits 'agent.task:start' internally
await agentBus.emit('task:start', { taskId: 'task-1' })

// Can also listen from parent bus
eventBus.on('agent.task:start', (event) => {
  console.log('Received from parent bus')
})
```

### Execution Context

```typescript
import type { ExecutionContext }