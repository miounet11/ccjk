# Task Persistence Quick Start Guide

## Overview

The enhanced task persistence system provides dependency tracking, execution recovery, metrics, and decision logging for the Brain System.

## Quick Start

### Basic Usage

```typescript
import { taskPersistence } from '@/brain/task-persistence'

// Save a task
const task: Task = {
  id: 'task-1',
  name: 'Process data',
  status: 'pending',
  // ... other fields
}
taskPersistence.saveTask(task, 'session-id')

// Update status
taskPersistence.updateTaskStatus('task-1', 'running')
taskPersistence.updateTaskStatus('task-1', 'completed')

// Retrieve task
const retrieved = taskPersistence.getTask('task-1')
```

## Dependency Management

### Adding Dependencies

```typescript
// Sequential dependency (task-2 must wait for task-1)
taskPersistence.addDependency('task-2', 'task-1', 'sequential', true)

// Data dependency (task-2 needs output from task-1)
taskPersistence.addDependency('task-2', 'task-1', 'data', true)

// Parallel dependency (can run together, but task-2 needs task-1 complete)
taskPersistence.addDependency('task-2', 'task-1', 'parallel', false)
```

### Checking Dependencies

```typescript
// Get all dependencies for a task
const deps = taskPersistence.getTaskDependencies('task-2')
// Returns: [{ taskId, dependsOnId, dependencyType, required, createdAt }]

// Get tasks that depend on this task
const dependents = taskPersistence.getDependentTasks('task-1')

// Check for circular dependencies before adding
const wouldCycle = taskPersistence.detectCircularDependency('task-1', 'task-3')
if (!wouldCycle) {
  taskPersistence.addDependency('task-1', 'task-3')
}
```

## Execution Planning

### Topological Ordering

```typescript
// Get tasks in execution order
const orderedTasks = taskPersistence.getTopologicalOrder('session-id')
// Returns tasks sorted by dependency level (0 = no deps, 1 = depends on level 0, etc.)

// Get tasks ready to execute now
const executable = taskPersistence.getNextExecutableTasks('session-id')
// Returns only tasks with all dependencies completed
```

### Dependency Graph

```typescript
// Build complete dependency graph
const graph = taskPersistence.buildDependencyGraph('session-id')
// Returns: TaskGraphNode[] with levels and relationships

for (const node of graph) {
  console.log(`${node.name} (level ${node.level})`)
  console.log(`  Depends on: ${node.dependencies.join(', ')}`)
  console.log(`  Depended by: ${node.dependents.join(', ')}`)
}
```

## Execution Recovery

### Recovering After Crash

```typescript
// On system restart
const state = taskPersistence.recoverExecutionState('session-id')

console.log(`Completed: ${state.completedTasks.length}`)
console.log(`Running: ${state.runningTasks.length}`)
console.log(`Pending: ${state.pendingTasks.length}`)
console.log(`Failed: ${state.failedTasks.length}`)

// Resume execution
for (const task of state.nextExecutable) {
  console.log(`Can execute: ${task.name}`)
  await executeTask(task)
}

// Retry failed tasks
for (const task of state.failedTasks) {
  if (task.retryCount < 3) {
    await retryTask(task)
  }
}
```

## Metrics Collection

### Recording Metrics

```typescript
const startTime = Date.now()

try {
  await executeTask(task)

  // Record success
  taskPersistence.recordMetrics({
    taskId: task.id,
    sessionId: 'session-id',
    executionTime: Date.now() - startTime,
    retryCount: 0,
    success: true
  })
} catch (error) {
  // Record failure
  taskPersistence.recordMetrics({
    taskId: task.id,
    sessionId: 'session-id',
    executionTime: Date.now() - startTime,
    retryCount: task.retryCount,
    success: false,
    errorType: error.name
  })
}
```

### Analyzing Metrics

```typescript
// Get metrics for specific task
const taskMetrics = taskPersistence.getTaskMetrics('task-1')
for (const metric of taskMetrics) {
  console.log(`Attempt ${metric.retryCount}: ${metric.executionTime}ms`)
  console.log(`Success: ${metric.success}`)
}

// Get aggregated session metrics
const sessionMetrics = taskPersistence.getSessionMetrics('session-id')
console.log(`Total tasks: ${sessionMetrics.totalTasks}`)
console.log(`Success rate: ${(sessionMetrics.successRate * 100).toFixed(1)}%`)
console.log(`Avg execution time: ${sessionMetrics.avgExecutionTime}ms`)
console.log(`Total retries: ${sessionMetrics.totalRetries}`)
```

## Decision Logging

### Logging Decisions

```typescript
// Log a decision with reasoning
const decisionId = `decision-${Date.now()}`
taskPersistence.logDecision({
  id: decisionId,
  sessionId: 'session-id',
  taskId: 'task-1',
  decision: 'Use parallel execution',
  reasoning: 'Tasks have no dependencies and 3 agents available',
  context: JSON.stringify({
    taskCount: 5,
    availableAgents: 3,
    estimatedSpeedup: '40%'
  })
})

// Update outcome after execution
taskPersistence.updateDecisionOutcome(
  decisionId,
  'Completed 42% faster than sequential'
)
```

### Reviewing Decisions

```typescript
// Get all decisions for session
const decisions = taskPersistence.getDecisionLog('session-id')
for (const decision of decisions) {
  console.log(`\n${new Date(decision.timestamp).toISOString()}`)
  console.log(`Decision: ${decision.decision}`)
  console.log(`Reasoning: ${decision.reasoning}`)
  if (decision.outcome) {
    console.log(`Outcome: ${decision.outcome}`)
  }
}

// Get decisions for specific task
const taskDecisions = taskPersistence.getTaskDecisionLog('task-1')
```

## Common Patterns

### Pattern 1: Task Chain with Error Handling

```typescript
const tasks = [
  { id: 'fetch', name: 'Fetch data' },
  { id: 'process', name: 'Process data' },
  { id: 'save', name: 'Save results' }
]

// Save tasks
tasks.forEach(task => taskPersistence.saveTask(task, 'session-1'))

// Create chain
taskPersistence.addDependency('process', 'fetch', 'data', true)
taskPersistence.addDependency('save', 'process', 'sequential', true)

// Execute with recovery
const state = taskPersistence.recoverExecutionState('session-1')
for (const task of state.nextExecutable) {
  const startTime = Date.now()

  try {
    await executeTask(task)
    taskPersistence.updateTaskStatus(task.id, 'completed')
    taskPersistence.recordMetrics({
      taskId: task.id,
      sessionId: 'session-1',
      executionTime: Date.now() - startTime,
      retryCount: 0,
      success: true
    })
  } catch (error) {
    taskPersistence.updateTaskStatus(task.id, 'failed', undefined, error)
    taskPersistence.recordMetrics({
      taskId: task.id,
      sessionId: 'session-1',
      executionTime: Date.now() - startTime,
      retryCount: task.retryCount,
      success: false,
      errorType: error.name
    })
  }
}
```

### Pattern 2: Parallel Execution with Metrics

```typescript
// Create parallel tasks
const parallelTasks = [
  { id: 'task-a', name: 'Task A' },
  { id: 'task-b', name: 'Task B' },
  { id: 'task-c', name: 'Task C' }
]

parallelTasks.forEach(task => taskPersistence.saveTask(task, 'session-2'))

// Log decision to use parallel execution
taskPersistence.logDecision({
  id: 'decision-parallel',
  sessionId: 'session-2',
  decision: 'Execute tasks in parallel',
  reasoning: 'No dependencies detected, 3 agents available',
  context: JSON.stringify({ taskCount: 3, agents: 3 })
})

// Execute in parallel
const startTime = Date.now()
await Promise.all(parallelTasks.map(task => executeTask(task)))
const totalTime = Date.now() - startTime

// Update decision outcome
taskPersistence.updateDecisionOutcome(
  'decision-parallel',
  `Completed in ${totalTime}ms (estimated 3x speedup)`
)
```

### Pattern 3: Retry with Exponential Backoff

```typescript
async function executeWithRetry(task: Task, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now()

    try {
      await executeTask(task)

      taskPersistence.recordMetrics({
        taskId: task.id,
        sessionId: task.sessionId,
        executionTime: Date.now() - startTime,
        retryCount: attempt,
        success: true
      })

      return
    } catch (error) {
      const backoffMs = Math.pow(2, attempt) * 1000

      taskPersistence.logDecision({
        id: `retry-${task.id}-${attempt}`,
        sessionId: task.sessionId,
        taskId: task.id,
        decision: `Retry with ${backoffMs}ms backoff`,
        reasoning: `Attempt ${attempt} failed: ${error.message}`,
        context: JSON.stringify({ attempt, backoffMs, errorType: error.name })
      })

      taskPersistence.recordMetrics({
        taskId: task.id,
        sessionId: task.sessionId,
        executionTime: Date.now() - startTime,
        retryCount: attempt,
        success: false,
        errorType: error.name
      })

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, backoffMs))
      } else {
        throw error
      }
    }
  }
}
```

## Best Practices

### 1. Always Check for Circular Dependencies

```typescript
function addDependencySafe(taskId: string, dependsOnId: string) {
  if (taskPersistence.detectCircularDependency(taskId, dependsOnId)) {
    throw new Error(`Adding dependency would create circular reference`)
  }
  taskPersistence.addDependency(taskId, dependsOnId)
}
```

### 2. Use Recovery State on Startup

```typescript
async function resumeSession(sessionId: string) {
  const state = taskPersistence.recoverExecutionState(sessionId)

  // Mark running tasks as failed (they were interrupted)
  for (const task of state.runningTasks) {
    taskPersistence.updateTaskStatus(task.id, 'failed')
  }

  // Execute next available tasks
  for (const task of state.nextExecutable) {
    await executeTask(task)
  }
}
```

### 3. Log Important Decisions

```typescript
// Log decisions that affect execution strategy
if (shouldUseParallel) {
  taskPersistence.logDecision({
    id: `decision-${Date.now()}`,
    sessionId,
    decision: 'Use parallel execution',
    reasoning: 'No dependencies, multiple agents available',
    context: JSON.stringify({ strategy: 'parallel', agents: 3 })
  })
}
```

### 4. Record Metrics for All Executions

```typescript
// Always record metrics, even for failures
try {
  await executeTask(task)
  recordSuccess(task)
} catch (error) {
  recordFailure(task, error)
  throw error
}
```

## API Reference

See [TASK_PERSISTENCE_ENHANCEMENT.md](../TASK_PERSISTENCE_ENHANCEMENT.md) for complete API documentation.

## Troubleshooting

### Issue: Circular dependency detected

```typescript
// Check dependency chain
const deps = taskPersistence.getTaskDependencies('task-id')
console.log('Dependencies:', deps)

// Visualize graph
const graph = taskPersistence.buildDependencyGraph('session-id')
for (const node of graph) {
  console.log(`${node.id} -> [${node.dependencies.join(', ')}]`)
}
```

### Issue: Tasks not becoming executable

```typescript
// Check task status
const task = taskPersistence.getTask('task-id')
console.log('Status:', task.status)

// Check dependencies
const deps = taskPersistence.getTaskDependencies('task-id')
for (const dep of deps) {
  const depTask = taskPersistence.getTask(dep.dependsOnId)
  console.log(`${dep.dependsOnId}: ${depTask?.status}`)
}
```

### Issue: Poor performance metrics

```typescript
// Analyze session metrics
const metrics = taskPersistence.getSessionMetrics('session-id')
if (metrics.successRate < 0.8) {
  console.warn('Low success rate:', metrics.successRate)
}

if (metrics.avgExecutionTime > 5000) {
  console.warn('High avg execution time:', metrics.avgExecutionTime)
}

// Review decision log for insights
const decisions = taskPersistence.getDecisionLog('session-id')
for (const decision of decisions) {
  if (decision.outcome?.includes('failed')) {
    console.log('Failed decision:', decision)
  }
}
```
