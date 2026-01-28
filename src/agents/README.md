# Multi-Agent Orchestration System

A lightweight, high-performance multi-agent orchestration system for coordinating 2-5 AI agents to work on complex tasks.

## Features

- **Automatic Agent Selection**: Intelligently selects agents based on task requirements
- **Task Decomposition**: Breaks down complex tasks into manageable subtasks
- **Parallel & Sequential Execution**: Supports both parallel and phased execution strategies
- **Conflict Resolution**: Detects and resolves conflicts between agent results
- **Performance Optimized**: Orchestration overhead < 1s
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Multi-Agent Orchestrator                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Task → Select Agents → Decompose → Execute → Aggregate     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Agent 1    │  │   Agent 2    │  │   Agent 3    │      │
│  │  (Sonnet)    │  │   (Opus)     │  │  (Sonnet)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Predefined Agents

| Agent ID | Model | Specialties | Cost (tokens) |
|----------|-------|-------------|---------------|
| `typescript-cli-architect` | Sonnet | TypeScript, CLI, Architecture | 8,000 |
| `ccjk-i18n-specialist` | Opus | i18next, Localization | 12,000 |
| `ccjk-tools-integration-specialist` | Sonnet | MCP, Tool Integration | 8,000 |
| `ccjk-testing-specialist` | Sonnet | Vitest, TDD, Coverage | 8,000 |
| `ccjk-config-architect` | Opus | Configuration, Validation | 12,000 |

## Usage

### Basic Example

```typescript
import { MultiAgentOrchestrator } from '@/agents'
import type { OrchestratorTask } from '@/types/agent'

const orchestrator = new MultiAgentOrchestrator()

const task: OrchestratorTask = {
  id: 'task-1',
  description: 'Create a new TypeScript CLI command',
  complexity: 'simple',
  requiredSpecialties: ['typescript', 'cli']
}

const result = await orchestrator.orchestrate(task)
console.log(result.resolution)
```

### Complex Task with Multiple Phases

```typescript
const complexTask: OrchestratorTask = {
  id: 'task-2',
  description: 'Implement full feature with tests and i18n',
  complexity: 'complex',
  requiredSpecialties: ['typescript', 'testing', 'i18next', 'configuration']
}

const result = await orchestrator.orchestrate(complexTask)
const metrics = orchestrator.getMetrics(result)

console.log(`Agents: ${metrics.agentCount}`)
console.log(`Phases: ${metrics.phaseCount}`)
console.log(`Overhead: ${metrics.overheadTime}ms`)
console.log(`Total Tokens: ${metrics.totalTokens}`)
```

## Task Complexity Levels

### Simple
- **Agents**: 1
- **Execution**: Single phase
- **Use Case**: Straightforward tasks with clear requirements

### Medium
- **Agents**: 2-3
- **Execution**: Parallel
- **Use Case**: Tasks requiring multiple specialties

### Complex
- **Agents**: 4-5
- **Execution**: Multi-phase (sequential + parallel)
- **Use Case**: Large features requiring coordination

## Orchestration Strategies

### Simple Task (1 Agent)
```
Task → Agent → Result
```

### Medium Task (2-3 Agents, Parallel)
```
Task → [Agent1, Agent2, Agent3] → Aggregate → Result
```

### Complex Task (4-5 Agents, Multi-Phase)
```
Task → Phase 1: [Agent1, Agent2] (parallel)
     → Phase 2: [Agent3] (depends on Phase 1)
     → Phase 3: [Agent4, Agent5] (parallel)
     → Aggregate → Result
```

## API Reference

### MultiAgentOrchestrator

#### `selectAgents(task: OrchestratorTask): OrchestratorAgentCapability[]`
Selects appropriate agents based on task requirements.

#### `orchestrate(task: OrchestratorTask): Promise<OrchestrationResult>`
Orchestrates the complete task execution.

#### `getMetrics(result: OrchestrationResult): OrchestrationMetrics`
Calculates performance metrics for the orchestration.

### Types

```typescript
interface OrchestratorTask {
  id: string
  description: string
  complexity: 'simple' | 'medium' | 'complex'
  requiredSpecialties: string[]
}

interface OrchestrationResult {
  results: Map<string, OrchestratorAgentResult>
  conflicts: OrchestratorConflict[]
  resolution: any
  totalTime: number
  totalTokens: number
}

interface OrchestrationMetrics {
  agentCount: number
  phaseCount: number
  parallelExecutions: number
  totalTime: number
  overheadTime: number
  totalTokens: number
}
```

## Performance

### Benchmarks

| Task Type | Agents | Total Time | Overhead | Tokens |
|-----------|--------|------------|----------|--------|
| Simple | 1 | ~2000ms | <100ms | 8,000 |
| Medium | 2-3 | ~3000ms | <200ms | 20,000 |
| Complex | 4-5 | ~6000ms | <500ms | 40,000 |

**Target**: Orchestration overhead < 1s ✅

### Running Benchmarks

```bash
pnpm tsx tests/agents/benchmark.ts
```

## Testing

```bash
# Run all tests
pnpm test tests/agents/multi-agent-orchestrator.test.ts

# Run with coverage
pnpm test:coverage tests/agents/
```

## Conflict Resolution

The orchestrator automatically detects and resolves conflicts:

1. **Missing Results**: When agents fail to complete tasks
2. **Disagreements**: When agents produce conflicting results
3. **Incompatibilities**: When results cannot be merged

Resolution strategies:
- **Voting**: Majority wins
- **Priority**: Based on agent specialty relevance
- **Human Intervention**: For unresolvable conflicts

## Future Enhancements

- [ ] Dynamic agent loading
- [ ] Custom conflict resolution strategies
- [ ] Real-time progress tracking
- [ ] Agent result caching
- [ ] Adaptive agent selection based on performance history

## License

MIT
