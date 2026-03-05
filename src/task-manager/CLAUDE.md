# Task Manager Module

**📍 Navigation**: [Root](../../CLAUDE.md) › [src](../) › **task-manager**

**Last Updated**: 2026-03-04

---

## 📦 Module Overview

The Task Manager module provides task queue management and execution coordination. It handles task scheduling, prioritization, and parallel execution with resource management.

## 🎯 Core Responsibilities

- **Task Queue Management**: Maintain and prioritize task queues
- **Task Scheduling**: Schedule tasks based on priority and dependencies
- **Parallel Execution**: Execute multiple tasks concurrently with resource limits
- **Task Lifecycle**: Track task states from creation to completion
- **Error Handling**: Retry failed tasks and handle errors gracefully

## 📁 Module Structure

```
src/task-manager/
├── index.ts              # Task manager orchestrator
└── (queue and execution logic)
```

## 🔗 Dependencies

### Internal Dependencies
- `src/brain` - Agent task coordination
- `src/monitoring` - Task execution metrics

### External Dependencies
- Queue data structures
- Async execution utilities

## 🚀 Key Interfaces

```typescript
interface TaskManager {
  enqueue(task: Task): string
  dequeue(): Task | null
  execute(taskId: string): Promise<TaskResult>
  cancel(taskId: string): void
  getStatus(taskId: string): TaskStatus
}

interface Task {
  id: string
  type: string
  priority: number
  dependencies: string[]
  payload: any
  retries: number
  maxRetries: number
}

interface TaskResult {
  taskId: string
  status: 'success' | 'failure' | 'cancelled'
  result?: any
  error?: Error
  duration: number
}

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
```

## 📊 Performance Metrics

- **Queue Throughput**: 100+ tasks/second
- **Task Latency**: <10ms queue overhead
- **Concurrency**: Configurable worker pool size

## 🧪 Testing

Test files: None yet (needs coverage)

### Test Strategy
- Unit tests for queue operations
- Integration tests with brain module
- Concurrency tests for parallel execution
- Stress tests for high task volumes
- Error handling and retry logic tests

## 📝 Usage Example

```typescript
import { TaskManager } from '@/task-manager'

const manager = new TaskManager({ maxConcurrency: 5 })

// Enqueue a task
const taskId = manager.enqueue({
  id: 'task-1',
  type: 'analysis',
  priority: 10,
  dependencies: [],
  payload: { file: 'src/index.ts' },
  retries: 0,
  maxRetries: 3
})

// Execute task
const result = await manager.execute(taskId)

if (result.status === 'success') {
  console.log('Task completed:', result.result)
} else {
  console.error('Task failed:', result.error)
}
```

## 🚧 Future Enhancements

- [ ] Add task persistence for crash recovery
- [ ] Implement task priority adjustment
- [ ] Add task dependency graph visualization
- [ ] Create task execution history tracking

---

**📊 Coverage**: Low (needs tests)
**🎯 Priority**: Low
**🔄 Status**: Stable
