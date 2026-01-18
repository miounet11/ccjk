# CCJK Multi-Agent Orchestration System

## Overview

The CCJK Multi-Agent Orchestration System is a comprehensive framework for coordinating multiple AI agents in various workflow patterns. It provides a flexible, event-driven architecture for building complex AI-powered development workflows.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                  Multi-Agent Orchestration System                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │ AgentOrchestrator│◄─────┤ WorkflowExecutor │                │
│  │                  │      │                  │                │
│  │ - Sequential     │      │ - Template Mgmt  │                │
│  │ - Parallel       │      │ - Context Mgmt   │                │
│  │ - Pipeline       │      │ - Result Agg     │                │
│  └──────────────────┘      └──────────────────┘                │
│           ▲                         ▲                            │
│           │                         │                            │
│           │                         │                            │
│  ┌────────┴─────────┐      ┌───────┴──────────┐                │
│  │  Agent Config    │      │ Workflow Template│                │
│  │  - Role          │      │ - Predefined     │                │
│  │  - Model         │      │ - Customizable   │                │
│  │  - System Prompt │      │ - Reusable       │                │
│  └──────────────────┘      └──────────────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Module Structure

- **`src/core/agent-orchestrator.ts`** - Core orchestration engine
- **`src/workflows/templates.ts`** - Predefined workflow templates
- **`src/workflows/executor.ts`** - High-level workflow execution
- **`tests/core/`** - Orchestrator tests
- **`tests/workflows/`** - Workflow and executor tests

## Features

### 1. Multiple Execution Modes

#### Sequential Execution
Agents execute one after another, with each agent processing the output of the previous agent.

```typescript
import { createSequentialWorkflow } from 'ccjk'

const workflow = createSequentialWorkflow([
  {
    role: 'architect',
    model: 'opus',
    systemPrompt: 'Design the system architecture...',
  },
  {
    role: 'implementer',
    model: 'sonnet',
    systemPrompt: 'Implement the design...',
  },
  {
    role: 'tester',
    model: 'sonnet',
    systemPrompt: 'Write comprehensive tests...',
  },
])

const result = await workflow.execute({
  id: 'task-1',
  description: 'Build authentication system',
  input: { requirements: [...] },
})
```

#### Parallel Execution
All agents process the same input simultaneously, useful for multi-perspective analysis.

```typescript
import { createParallelWorkflow } from 'ccjk'

const workflow = createParallelWorkflow([
  {
    role: 'security-reviewer',
    model: 'opus',
    systemPrompt: 'Review for security vulnerabilities...',
  },
  {
    role: 'performance-reviewer',
    model: 'sonnet',
    systemPrompt: 'Analyze performance implications...',
  },
  {
    role: 'style-reviewer',
    model: 'haiku',
    systemPrompt: 'Check code style and quality...',
  },
], { maxParallel: 3 })
```

#### Pipeline Execution
Similar to sequential but with explicit data transformation between stages.

```typescript
import { createPipelineWorkflow } from 'ccjk'

const workflow = createPipelineWorkflow([
  {
    role: 'data-collector',
    model: 'sonnet',
    systemPrompt: 'Collect and validate data...',
  },
  {
    role: 'data-processor',
    model: 'sonnet',
    systemPrompt: 'Process and transform data...',
  },
  {
    role: 'data-analyzer',
    model: 'opus',
    systemPrompt: 'Analyze processed data...',
  },
])
```

### 2. Predefined Workflow Templates

#### Feature Development
Complete feature development workflow from design to review.

```typescript
import { executeWorkflowTemplate } from 'ccjk'

const result = await executeWorkflowTemplate('feature-development', {
  featureDescription: 'User authentication with JWT',
  requirements: [
    'Secure password hashing',
    'Token-based authentication',
    'Refresh token support',
  ],
  acceptanceCriteria: [
    'Users can register and login',
    'Tokens expire after 1 hour',
    'Refresh tokens valid for 7 days',
  ],
})
```

**Workflow**: architect → implementer → tester → reviewer

#### Bug Fix
Systematic bug analysis, fix, and verification.

```typescript
const result = await executeWorkflowTemplate('bug-fix', {
  bugDescription: 'Memory leak in data processing',
  reproductionSteps: [
    'Load large dataset',
    'Process data multiple times',
    'Memory usage increases continuously',
  ],
  expectedBehavior: 'Memory should be released after processing',
})
```

**Workflow**: analyzer → implementer → tester

#### Code Review
Multi-perspective code review covering security, performance, and style.

```typescript
const result = await executeWorkflowTemplate('code-review', {
  codeChanges: `
    // Pull request changes
    function authenticateUser(username, password) {
      // ... implementation
    }
  `,
  context: {
    projectType: 'web-application',
    language: 'TypeScript',
  },
})
```

**Workflow**: security-reviewer + performance-reviewer + style-reviewer (parallel)

#### Refactoring
Systematic code refactoring with analysis, planning, and validation.

```typescript
const result = await executeWorkflowTemplate('refactoring', {
  codeToRefactor: '// Legacy code...',
  refactoringGoals: [
    'Improve maintainability',
    'Reduce complexity',
    'Eliminate duplication',
  ],
})
```

**Workflow**: analyzer → planner → implementer → validator

### 3. Event-Driven Architecture

Monitor workflow execution with comprehensive event tracking:

```typescript
import { createExecutor } from 'ccjk'

const executor = createExecutor()

await executor.execute({
  workflow: 'feature-development',
  input: { /* ... */ },

  // Progress tracking
  onProgress: ({ current, total, percentage }) => {
    console.log(`Progress: ${current}/${total} (${percentage}%)`)
  },

  // Agent lifecycle events
  onAgentStart: ({ role, task }) => {
    console.log(`Starting agent: ${role}`)
  },

  onAgentComplete: ({ role, result }) => {
    console.log(`Completed agent: ${role}`)
    console.log(`Duration: ${result.durationMs}ms`)
  },

  onAgentError: ({ role, error }) => {
    console.error(`Agent ${role} failed:`, error)
  },
})
```

### 4. Template Customization

Customize existing templates or create new ones:

```typescript
import { getWorkflowTemplate, createExecutor } from 'ccjk'

const executor = createExecutor()

// Customize existing template
const customWorkflow = executor.customizeTemplate('bug-fix', {
  // Add custom agent
  agents: [
    {
      role: 'performance-profiler',
      model: 'sonnet',
      systemPrompt: 'Profile performance before and after fix...',
    },
  ],

  // Add custom context
  context: {
    projectName: 'CCJK',
    environment: 'production',
  },

  // Override timeout
  timeout: 60000,

  // Update metadata
  metadata: {
    version: '2.0.0',
    customizedBy: 'team-name',
  },
})

const result = await executor.executeCustom(customWorkflow, {
  bugDescription: '...',
})
```

### 5. Template Variables

Use variables in system prompts for dynamic customization:

```typescript
const workflow: WorkflowConfig = {
  type: 'sequential',
  agents: [
    {
      role: 'developer',
      model: 'sonnet',
      systemPrompt: `
        You are a {{role}} working on {{project}}.
        Use {{language}} for implementation.
        Follow {{codingStandard}} coding standards.
      `,
    },
  ],
}

await executor.execute({
  workflow,
  input: { /* ... */ },
  variables: {
    role: 'senior developer',
    project: 'CCJK v4.0',
    language: 'TypeScript',
    codingStandard: 'Airbnb',
  },
})
```

### 6. Execution History & Statistics

Track and analyze workflow executions:

```typescript
import { getGlobalExecutor } from 'ccjk'

const executor = getGlobalExecutor()

// Execute multiple workflows
await executor.executeTemplate('bug-fix', { /* ... */ })
await executor.executeTemplate('code-review', { /* ... */ })
await executor.executeTemplate('refactoring', { /* ... */ })

// Get execution history
const history = executor.getExecutionHistory()
console.log(`Total executions: ${history.length}`)

history.forEach(summary => {
  console.log(`
    Workflow: ${summary.workflowName}
    Success: ${summary.success}
    Duration: ${summary.durationMs}ms
    Agents: ${summary.agentsExecuted}
    Success Rate: ${summary.agentsSucceeded}/${summary.agentsExecuted}
  `)
})

// Get statistics
const stats = executor.getStatistics()
console.log(`
  Total Executions: ${stats.totalExecutions}
  Successful: ${stats.successfulExecutions}
  Failed: ${stats.failedExecutions}
  Average Duration: ${stats.averageDuration}ms
  Total Agents Executed: ${stats.totalAgentsExecuted}
`)
```

## Available Workflow Templates

| Template ID | Description | Workflow Type | Agents | Duration |
|-------------|-------------|---------------|--------|----------|
| `feature-development` | Complete feature development | Sequential | 4 | ~45 min |
| `bug-fix` | Bug analysis and fixing | Sequential | 3 | ~20 min |
| `code-review` | Multi-perspective review | Parallel | 3 | ~15 min |
| `refactoring` | Code refactoring | Sequential | 4 | ~30 min |
| `documentation` | Documentation generation | Sequential | 3 | ~25 min |
| `testing` | Test generation | Sequential | 2 | ~20 min |
| `security-audit` | Security analysis | Sequential | 1 | ~30 min |
| `performance-optimization` | Performance tuning | Sequential | 2 | ~35 min |
| `api-design` | API design and implementation | Sequential | 2 | ~40 min |
| `architecture-review` | Architecture review | Sequential | 1 | ~45 min |

## API Reference

### AgentOrchestrator

```typescript
class AgentOrchestrator {
  constructor(config: WorkflowConfig)

  // Execute workflow
  execute(task: Task): Promise<WorkflowResult>

  // Validate configuration
  validate(): { valid: boolean, errors: string[] }

  // Agent management
  addAgent(config: AgentConfig, position?: number): void
  removeAgent(role: string): boolean
  getAgent(role: string): Agent | undefined
  getAllAgents(): Agent[]

  // Configuration
  updateConfig(config: Partial<WorkflowConfig>): void
  getConfig(): WorkflowConfig

  // State
  isRunning(): boolean
  reset(): void
}
```

### WorkflowExecutor

```typescript
class WorkflowExecutor {
  // Execute workflows
  execute(options: WorkflowExecutionOptions): Promise<WorkflowResult>
  executeTemplate(templateId: WorkflowTemplateId, input: unknown, options?: Partial<WorkflowExecutionOptions>): Promise<WorkflowResult>
  executeCustom(config: WorkflowConfig, input: unknown, options?: Partial<WorkflowExecutionOptions>): Promise<WorkflowResult>

  // Template management
  getTemplateInfo(templateId: WorkflowTemplateId): WorkflowTemplate | undefined
  customizeTemplate(templateId: WorkflowTemplateId, customizations: object): WorkflowConfig
  validateWorkflow(config: WorkflowConfig): { valid: boolean, errors: string[] }

  // History and statistics
  getExecutionHistory(limit?: number): WorkflowExecutionSummary[]
  getStatistics(): object
  clearHistory(): void
  setMaxHistorySize(size: number): void

  // Context management
  getActiveContexts(): WorkflowContext[]
  getContext(executionId: string): WorkflowContext | undefined
  cancelExecution(executionId: string): Promise<boolean>
}
```

## Best Practices

### 1. Choose the Right Execution Mode

- **Sequential**: When each step depends on the previous one (feature development, bug fixing)
- **Parallel**: When you need multiple independent perspectives (code review, analysis)
- **Pipeline**: When you need explicit data transformation between stages (ETL workflows)

### 2. Model Selection

- **Opus**: Complex reasoning, architecture, planning, review
- **Sonnet**: Balanced performance for implementation, testing
- **Haiku**: Fast operations, simple tasks, style checking
- **Inherit**: Use parent/default model

### 3. Error Handling

```typescript
const workflow: WorkflowConfig = {
  type: 'sequential',
  agents: [...],

  // Continue on error for non-critical workflows
  continueOnError: true,

  // Set reasonable timeout
  timeout: 300000, // 5 minutes
}

// Configure retry for critical agents
const criticalAgent: AgentConfig = {
  role: 'implementer',
  model: 'sonnet',
  systemPrompt: '...',
  retryAttempts: 3,
  retryDelay: 1000,
}
```

### 4. Context Management

```typescript
await executor.execute({
  workflow: 'feature-development',
  input: { /* ... */ },

  // Provide rich context
  context: {
    projectName: 'CCJK',
    codebase: 'TypeScript',
    testFramework: 'Vitest',
    codingStandards: 'Airbnb',
    targetPlatform: 'Node.js',
  },
})
```

### 5. Monitor Execution

```typescript
const executor = createExecutor()

// Set reasonable history size
executor.setMaxHistorySize(100)

// Monitor progress
await executor.execute({
  workflow: 'feature-development',
  input: { /* ... */ },

  onProgress: ({ percentage }) => {
    updateProgressBar(percentage)
  },

  onAgentComplete: ({ role, result }) => {
    logAgentResult(role, result)
  },
})

// Review statistics periodically
const stats = executor.getStatistics()
if (stats.failedExecutions > stats.successfulExecutions * 0.1) {
  console.warn('High failure rate detected!')
}
```

## Testing

The orchestration system includes comprehensive test coverage:

```bash
# Run all orchestration tests
pnpm vitest run tests/core/ tests/workflows/

# Run specific test suites
pnpm vitest run tests/core/agent-orchestrator.test.ts
pnpm vitest run tests/workflows/templates.test.ts
pnpm vitest run tests/workflows/executor.test.ts

# Watch mode for development
pnpm vitest watch tests/core/ tests/workflows/
```

## Examples

### Example 1: Custom Development Workflow

```typescript
import { createSequentialWorkflow } from 'ccjk'

const workflow = createSequentialWorkflow([
  {
    role: 'requirements-analyst',
    model: 'opus',
    systemPrompt: 'Analyze and clarify requirements...',
  },
  {
    role: 'architect',
    model: 'opus',
    systemPrompt: 'Design system architecture...',
  },
  {
    role: 'implementer',
    model: 'sonnet',
    systemPrompt: 'Implement the design...',
  },
  {
    role: 'tester',
    model: 'sonnet',
    systemPrompt: 'Write comprehensive tests...',
  },
  {
    role: 'documenter',
    model: 'sonnet',
    systemPrompt: 'Generate documentation...',
  },
])

const result = await workflow.execute({
  id: 'feature-auth',
  description: 'Implement user authentication',
  input: {
    requirements: 'Users need to login with email and password',
  },
})
```

### Example 2: Parallel Code Analysis

```typescript
import { createParallelWorkflow } from 'ccjk'

const workflow = createParallelWorkflow([
  {
    role: 'security-auditor',
    model: 'opus',
    systemPrompt: 'Perform security audit...',
  },
  {
    role: 'performance-analyzer',
    model: 'sonnet',
    systemPrompt: 'Analyze performance...',
  },
  {
    role: 'accessibility-checker',
    model: 'sonnet',
    systemPrompt: 'Check accessibility...',
  },
  {
    role: 'seo-analyzer',
    model: 'haiku',
    systemPrompt: 'Analyze SEO...',
  },
], {
  maxParallel: 4,
  continueOnError: true,
})
```

### Example 3: Data Processing Pipeline

```typescript
import { createPipelineWorkflow } from 'ccjk'

const workflow = createPipelineWorkflow([
  {
    role: 'data-validator',
    model: 'sonnet',
    systemPrompt: 'Validate input data...',
  },
  {
    role: 'data-transformer',
    model: 'sonnet',
    systemPrompt: 'Transform data format...',
  },
  {
    role: 'data-enricher',
    model: 'opus',
    systemPrompt: 'Enrich data with additional info...',
  },
  {
    role: 'data-aggregator',
    model: 'sonnet',
    systemPrompt: 'Aggregate and summarize...',
  },
])
```

## Contributing

When adding new workflow templates:

1. Define the template in `src/workflows/templates.ts`
2. Add comprehensive tests in `tests/workflows/templates.test.ts`
3. Document the template in this README
4. Update the template ID type union

## License

Part of CCJK (Claude Code JinKu) - MIT License
