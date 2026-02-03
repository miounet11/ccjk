# Gastown Multi-Agent System - Quick Start Guide

## Installation

No additional dependencies needed. The system uses only Node.js built-ins and existing project dependencies.

## Basic Usage

### 1. Simple State Persistence

```typescript
import { getGlobalStateManager } from './brain/persistence/git-backed-state'

const stateManager = getGlobalStateManager()
await stateManager.initialize()

// Create agent and save state
await stateManager.createAgentWorktree('my-agent')
await stateManager.saveState('my-agent', {
  agentId: 'my-agent',
  status: 'active',
  currentTask: 'Processing',
  memory: { data: 'value' },
})

// Load state
const state = await stateManager.loadState('my-agent')
console.log(state)
```

### 2. Send Messages Between Agents

```typescript
import { getGlobalMailboxManager } from './brain/messaging/persistent-mailbox'

const mailbox = getGlobalMailboxManager()
await mailbox.initialize()

// Create mailboxes
await mailbox.createMailbox('agent-1')
await mailbox.createMailbox('agent-2')

// Send message
await mailbox.send('agent-1', 'agent-2', {
  type: 'task',
  payload: { action: 'process', data: 'value' },
})

// Read messages
const messages = await mailbox.read('agent-2')
console.log(messages)
```

### 3. Manage Task Workflows

```typescript
import { getGlobalConvoyManager } from './brain/convoy/convoy-manager'

const convoy = getGlobalConvoyManager()
await convoy.initialize()

// Create convoy
const myConvoy = await convoy.create('My Project', {
  description: 'Complete project tasks',
})

// Add tasks
const task1 = await convoy.addTask(myConvoy.id, 'Task 1')
const task2 = await convoy.addTask(myConvoy.id, 'Task 2', {
  dependsOn: [task1.id],
})

// Start and execute
await convoy.start(myConvoy.id)
await convoy.startTask(myConvoy.id, task1.id, 'agent-1')
await convoy.completeTask(myConvoy.id, task1.id)

// Check progress
const summary = convoy.getSummary(myConvoy.id)
console.log(`Progress: ${summary.progress}%`)
```

### 4. Use Mayor Agent (All-in-One)

```typescript
import { getGlobalMayorAgent } from './brain/mayor/mayor-agent'

const mayor = getGlobalMayorAgent({
  autoCreateConvoy: true,
  autoSpawnWorkers: true,
  monitorProgress: true,
})

// Listen to events
mayor.on('progress:update', (update) => {
  console.log(`Progress: ${update.progress}%`)
})

// Process request
const response = await mayor.processRequest(
  'Implement user authentication feature',
)

console.log(response.message)
console.log('Plan:', response.plan)
```

## Common Patterns

### Pattern 1: Worker Agent

```typescript
import { getGlobalStateManager } from './brain/persistence/git-backed-state'
import { getGlobalMailboxManager } from './brain/messaging/persistent-mailbox'

class WorkerAgent {
  constructor(private agentId: string) {}

  async initialize() {
    const state = getGlobalStateManager()
    const mailbox = getGlobalMailboxManager()

    await state.initialize()
    await mailbox.initialize()
    await state.createAgentWorktree(this.agentId)
    await mailbox.createMailbox(this.agentId)
  }

  async processMessages() {
    const mailbox = getGlobalMailboxManager()
    const messages = await mailbox.read(this.agentId, { unreadOnly: true })

    for (const message of messages) {
      await this.handleMessage(message)
      await mailbox.markAsRead(this.agentId, message.id)
    }
  }

  async handleMessage(message: any) {
    // Process message
    console.log('Processing:', message)

    // Save state
    const state = getGlobalStateManager()
    await state.saveState(this.agentId, {
      agentId: this.agentId,
      status: 'active',
      currentTask: message.type,
      memory: { lastMessage: message.id },
    })
  }
}

// Usage
const worker = new WorkerAgent('worker-001')
await worker.initialize()
await worker.processMessages()
```

### Pattern 2: Progress Monitoring

```typescript
import { getGlobalConvoyManager } from './brain/convoy/convoy-manager'
import { ProgressTracker } from './brain/convoy/progress-tracker'

const convoy = getGlobalConvoyManager()
await convoy.initialize()

const myConvoy = await convoy.create('My Tasks')
// ... add tasks ...

// Setup progress tracking
const tracker = new ProgressTracker(convoy, {
  updateInterval: 1000,
  consoleOutput: true,
})

tracker.on('progress', (update) => {
  console.log(`${update.completedTasks}/${update.totalTasks} tasks done`)
})

tracker.on('completed', (convoyId) => {
  console.log('All tasks completed!')
  tracker.destroy()
})

tracker.track(myConvoy.id)
```

### Pattern 3: Crash Recovery

```typescript
import { getGlobalRecoveryManager } from './brain/persistence/state-recovery'

const recovery = getGlobalRecoveryManager({
  autoRecover: true,
  validateState: true,
  maxAttempts: 3,
})

// On startup
const report = await recovery.initialize()

if (report) {
  console.log(`Recovered: ${report.recovered}`)
  console.log(`Failed: ${report.failed}`)

  for (const agent of report.agents) {
    if (agent.status === 'recovered') {
      console.log(`✓ ${agent.agentId} recovered`)
    }
  }
}
```

### Pattern 4: State Snapshots

```typescript
import { getGlobalStateManager } from './brain/persistence/git-backed-state'

const state = getGlobalStateManager()
await state.initialize()

// Before risky operation
const snapshot = await state.createSnapshot(
  'my-agent',
  'Before major refactoring',
)

try {
  // Risky operation
  await performRiskyOperation()
}
catch (error) {
  // Rollback on failure
  await state.rollback('my-agent', snapshot.commitId)
  console.log('Rolled back to snapshot')
}
```

## Event Reference

### State Manager Events
- `state:saved` - State saved to Git
- `state:loaded` - State loaded from Git
- `snapshot:created` - Snapshot created
- `rollback:completed` - Rollback completed

### Mailbox Events
- `message:sent` - Message sent
- `message:received` - Message received
- `message:read` - Message marked as read
- `message:expired` - Message expired

### Convoy Events
- `convoy:created` - Convoy created
- `convoy:started` - Convoy started
- `convoy:completed` - Convoy completed
- `task:added` - Task added
- `task:started` - Task started
- `task:completed` - Task completed
- `task:failed` - Task failed

### Mayor Events
- `intent:analyzed` - Intent analyzed
- `plan:created` - Plan created
- `convoy:created` - Convoy created
- `workers:spawned` - Workers spawned
- `progress:update` - Progress updated
- `convoy:completed` - Convoy completed
- `human:notify` - Human notification

## Configuration

### State Manager Config

```typescript
const stateManager = getGlobalStateManager()
// Uses default config, can be customized in constructor
```

### Mailbox Config

```typescript
const mailbox = getGlobalMailboxManager()
// Default: checks expired messages every 60 seconds
```

### Convoy Config

```typescript
const convoy = getGlobalConvoyManager()
// No special config needed
```

### Mayor Config

```typescript
const mayor = getGlobalMayorAgent({
  autoCreateConvoy: true,    // Auto-create convoy from plan
  autoSpawnWorkers: true,    // Auto-spawn worker agents
  monitorProgress: true,     // Monitor convoy progress
  notifyHuman: true,         // Notify human of events
})
```

### Progress Tracker Config

```typescript
const tracker = new ProgressTracker(convoy, {
  updateInterval: 2000,      // Update every 2 seconds
  consoleOutput: false,      // Don't log to console
})
```

### Recovery Manager Config

```typescript
const recovery = getGlobalRecoveryManager({
  autoRecover: true,         // Auto-recover on init
  validateState: true,       // Validate recovered state
  maxAttempts: 3,           // Max recovery attempts
  retryDelay: 1000,         // Delay between retries (ms)
})
```

## Troubleshooting

### Issue: Git errors

**Solution**: Ensure Git is installed and the repository is initialized.

```bash
git --version
git status
```

### Issue: State not persisting

**Solution**: Check that worktree was created:

```typescript
const path = stateManager.getAgentPath('my-agent')
console.log('Agent path:', path)
```

### Issue: Messages not delivered

**Solution**: Ensure both mailboxes exist:

```typescript
await mailbox.createMailbox('sender')
await mailbox.createMailbox('receiver')
```

### Issue: Tasks not executing

**Solution**: Check task dependencies:

```typescript
const convoy = convoyManager.get(convoyId)
console.log('Tasks:', convoy.tasks)
console.log('Ready tasks:', convoy.tasks.filter(t => t.status === 'pending'))
```

## Best Practices

1. **Always initialize** managers before use
2. **Create worktrees** before saving state
3. **Create mailboxes** before sending messages
4. **Handle errors** in async operations
5. **Clean up** trackers when done
6. **Use snapshots** before risky operations
7. **Monitor events** for debugging
8. **Validate state** after recovery

## Next Steps

- Read the full documentation: `src/brain/README.md`
- See complete examples: `src/brain/examples/gastown-usage.ts`
- Run the example: `npx tsx src/brain/examples/gastown-usage.ts`
- Explore the implementation: `GASTOWN_IMPLEMENTATION.md`

## Support

For issues or questions, refer to the main project documentation.
