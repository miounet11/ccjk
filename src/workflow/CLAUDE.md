# Workflow Module

**📍 Navigation**: [Root](../../CLAUDE.md) › [src](../CLAUDE.md) › workflow

**Last Updated**: 2026年 1月22日 星期四 19时10分33秒 CST

---

## 🔄 Module Overview

The Workflow module provides workflow orchestration with state machine, scheduling, review system, and skill integration.

## 🎯 Core Responsibilities

- **Workflow Orchestration**: Manage workflow execution
- **State Machine**: Track workflow states
- **Workflow Scheduling**: Schedule workflow execution
- **Review System**: Code review workflows
- **Skill Integration**: Integrate with skills

## 📁 Module Structure

```
src/workflow/
├── state-machine.ts        # State machine
├── scheduler.ts            # Workflow scheduler
├── review.ts               # Review system
├── skill.ts                # Skill integration
├── types.ts                # Type definitions
└── index.ts                # Module exports
```

## 🔗 Dependencies

### Internal Dependencies
- `src/brain` - Brain system
- `src/skills` - Skills system
- `src/config` - Configuration

## 🚀 Key Interfaces

```typescript
interface WorkflowEngine {
  execute(workflow: Workflow): Promise<WorkflowResult>
  pause(workflowId: string): void
  resume(workflowId: string): void
  cancel(workflowId: string): void
}

interface StateMachine {
  transition(from: State, to: State): boolean
  getCurrentState(): State
  getHistory(): State[]
}

interface WorkflowScheduler {
  schedule(workflow: Workflow, cron: string): void
  cancel(scheduleId: string): void
}
```

## 📝 Usage Example

```typescript
import { WorkflowEngine } from '@/workflow'

const engine = new WorkflowEngine()
const result = await engine.execute(workflow)
```

---

**📊 Coverage**: High
**🎯 Priority**: High
**🔄 Status**: Production Ready
