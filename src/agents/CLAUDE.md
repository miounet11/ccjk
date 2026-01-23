# Agents Module

**📍 Navigation**: [Root](../../CLAUDE.md) › [src](../CLAUDE.md) › agents

**Last Updated**: 2026年 1月22日 星期四 19时10分33秒 CST

---

## 🤖 Module Overview

The Agents module provides multi-agent orchestration and collaboration capabilities for complex task execution.

## 🎯 Core Responsibilities

- **Agent Orchestration**: Coordinate multiple AI agents
- **Task Distribution**: Distribute tasks across agents
- **Result Aggregation**: Combine results from multiple agents
- **Agent Communication**: Inter-agent messaging
- **Cowork Patterns**: Collaborative work patterns

## 📁 Module Structure

```
src/agents/
├── cowork-orchestrator.ts  # Cowork orchestration
├── index.ts                # Module exports
└── (agent implementations)
```

## 🔗 Dependencies

### Internal Dependencies
- `src/brain` - Brain system
- `src/types` - Type definitions

## 🚀 Key Interfaces

```typescript
interface CoworkOrchestrator {
  orchestrate(task: Task, agents: Agent[]): Promise<Result>
  distribute(task: Task): SubTask[]
  aggregate(results: Result[]): Result
}
```

## 📝 Usage Example

```typescript
import { CoworkOrchestrator } from '@/agents'

const orchestrator = new CoworkOrchestrator()
const result = await orchestrator.orchestrate(task, agents)
```

---

**📊 Coverage**: Medium
**🎯 Priority**: High
**🔄 Status**: Production Ready
