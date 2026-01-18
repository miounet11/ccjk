# Multi-Agent Orchestration - Quick Start Guide

## Installation

The orchestration system is built into CCJK v4.0.0. No additional installation required.

```bash
npm install ccjk
# or
pnpm add ccjk
```

## 5-Minute Quick Start

### 1. Execute a Predefined Workflow

```typescript
import { executeWorkflowTemplate } from 'ccjk'

// Feature development workflow
const result = await executeWorkflowTemplate('feature-development', {
  featureDescription: 'Add user profile page',
  requirements: [
    'Display user information',
    'Allow profile editing',
    'Upload profile picture',
  ],
  acceptanceCriteria: [
    'Profile page loads in < 2s',
    'All fields are editable',
    'Image upload works',
  ],
})

console.log('Success:', result.success)
console.log('Duration:', result.durationMs, 'ms')
console.log('Agents executed:', result.results.length)
```

### 2. Monitor Progress

```typescript
import { createExecutor } from 'ccjk'

const executor = createExecutor()

await executor.execute({
  workflow: 'bug-fix',
  input: {
    bugDescription: 'Memory leak in data processing',
    reproductionSteps: ['Load data', 'Process', 'Memory increases'],
  },

  // Track progress
  onProgress: ({ current, total, percentage }) => {
    console.log(`Progress: ${percentage.toFixed(1)}% (${current}/${total})`)
  },

  // Monitor agents
  onAgentComplete: ({ role, result }) => {
    console.log(`✓ ${role} completed in ${result.durationMs}ms`)
  },
})
```

### 3. Create Custom Workflow

```typescript
import { createSequentialWorkflow } from 'ccjk'

const workflow = createSequentialWorkflow([
  {
    role: 'planner',
    model: 'opus',
    systemPrompt: 'Create a detailed implementation plan...',
  },
  {
    role: 'coder',
    model: 'sonnet',
    systemPrompt: 'Implement the plan with clean code...',
  },
  {
    role: 'reviewer',
    model: 'opus',
    systemPrompt: 'Review the implementation...',
  },
])

const result = await workflow.execute({
  id: 'custom-task-1',
  description: 'Build API endpoint',
  input: { endpoint: '/api/users', method: 'GET' },
})
```

## Common Use Cases

### Code Review

```typescript
import { executeWorkflowTemplate } from 'ccjk'

const review = await executeWorkflowTemplate('code-review', {
  codeChanges: `
    function processData(data) {
      // ... your code
    }
  `,
  context: {
    language: 'TypeScript',
    framework: 'Express',
  },
})

// Access individual reviews
const securityReview = review.results.find(r => r.role === 'security-reviewer')
const performanceReview = review.results.find(r => r.role === 'performance-reviewer')
```

### Refactoring

```typescript
const refactoring = await executeWorkflowTemplate('refactoring', {
  codeToRefactor: legacyCode,
  refactoringGoals: [
    'Reduce complexity',
    'Improve testability',
    'Add type safety',
  ],
})

// Get refactored code
const implementer = refactoring.results.find(r => r.role === 'implementer')
const refactoredCode = implementer.data
```

### Documentation

```typescript
const docs = await executeWorkflowTemplate('documentation', {
  codeOrFeature: myCode,
  documentationType: 'API Reference',
})

// Get generated documentation
const writer = docs.results.find(r => r.role === 'writer')
const documentation = writer.data
```

## Available Templates

| Template | Use Case | Duration |
|----------|----------|----------|
| `feature-development` | New features | ~45 min |
| `bug-fix` | Bug fixing | ~20 min |
| `code-review` | Code review | ~15 min |
| `refactoring` | Code refactoring | ~30 min |
| `documentation` | Docs generation | ~25 min |
| `testing` | Test generation | ~20 min |
| `security-audit` | Security check | ~30 min |
| `performance-optimization` | Performance tuning | ~35 min |
| `api-design` | API design | ~40 min |
| `architecture-review` | Architecture review | ~45 min |

## Execution Modes

### Sequential (Default)
Agents execute one after another. Output of each agent becomes input for the next.

```typescript
import { createSequentialWorkflow } from 'ccjk'

const workflow = createSequentialWorkflow([agent1, agent2, agent3])
```

**Use when**: Each step depends on the previous one.

### Parallel
All agents execute simultaneously with the same input.

```typescript
import { createParallelWorkflow } from 'ccjk'

const workflow = createParallelWorkflow([agent1, agent2, agent3], {
  maxParallel: 3, // Run all 3 at once
})
```

**Use when**: You need multiple independent perspectives.

### Pipeline
Similar to sequential but with explicit data transformation between stages.

```typescript
import { createPipelineWorkflow } from 'ccjk'

const workflow = createPipelineWorkflow([stage1, stage2, stage3])
```

**Use when**: You need explicit data transformation between stages.

## Model Selection Guide

| Model | Use Case | Speed | Cost |
|-------|----------|-------|------|
| `opus` | Complex reasoning, architecture, planning | Slow | High |
| `sonnet` | Implementation, testing, balanced tasks | Medium | Medium |
| `haiku` | Simple tasks, style checking, fast operations | Fast | Low |
| `inherit` | Use parent/default model | - | - |

## Best Practices

### 1. Start with Templates

```typescript
// ✅ Good: Use predefined templates
await executeWorkflowTemplate('feature-development', input)

// ❌ Avoid: Building from scratch initially
const workflow = createSequentialWorkflow([...]) // Only when needed
```

### 2. Monitor Execution

```typescript
// ✅ Good: Track progress and errors
await executor.execute({
  workflow: 'bug-fix',
  input: data,
  onProgress: (p) => console.log(p.percentage),
  onAgentError: (e) => console.error(e),
})

// ❌ Avoid: Fire and forget
await executor.execute({ workflow: 'bug-fix', input: data })
```

### 3. Handle Errors Gracefully

```typescript
// ✅ Good: Proper error handling
try {
  const result = await executeWorkflowTemplate('feature-development', input)
  if (!result.success) {
    console.error('Workflow failed:', result.error)
  }
} catch (error) {
  console.error('Execution error:', error)
}
```

### 4. Use Appropriate Models

```typescript
// ✅ Good: Match model to task complexity
{
  role: 'architect',
  model: 'opus', // Complex reasoning
  systemPrompt: '...',
}

{
  role: 'style-checker',
  model: 'haiku', // Simple task
  systemPrompt: '...',
}

// ❌ Avoid: Using opus for simple tasks
{
  role: 'style-checker',
  model: 'opus', // Overkill and expensive
  systemPrompt: '...',
}
```

### 5. Provide Rich Context

```typescript
// ✅ Good: Rich context
await executor.execute({
  workflow: 'feature-development',
  input: { feature: '...' },
  context: {
    projectName: 'MyApp',
    language: 'TypeScript',
    framework: 'React',
    testFramework: 'Vitest',
    codingStandards: 'Airbnb',
  },
})

// ❌ Avoid: Minimal context
await executor.execute({
  workflow: 'feature-development',
  input: { feature: '...' },
})
```

## Troubleshooting

### Workflow Takes Too Long

```typescript
// Set timeout
await executor.execute({
  workflow: 'feature-development',
  input: data,
  timeout: 300000, // 5 minutes
})
```

### Agent Fails Intermittently

```typescript
// Add retry logic
const agent: AgentConfig = {
  role: 'implementer',
  model: 'sonnet',
  systemPrompt: '...',
  retryAttempts: 3,
  retryDelay: 1000,
}
```

### Need to Continue on Error

```typescript
// Enable continueOnError
await executor.execute({
  workflow: 'code-review',
  input: data,
  continueOnError: true, // Don't stop if one reviewer fails
})
```

## Next Steps

1. **Explore Templates**: Try all 10 predefined templates
2. **Customize**: Modify templates for your needs
3. **Create Custom**: Build your own workflows
4. **Monitor**: Track execution history and statistics
5. **Optimize**: Adjust models, timeouts, and retry settings

## Resources

- **Full Documentation**: `/docs/orchestration-system.md`
- **Implementation Details**: `/docs/orchestration-implementation-summary.md`
- **Source Code**: `/src/core/agent-orchestrator.ts`, `/src/workflows/`
- **Tests**: `/tests/core/`, `/tests/workflows/`

## Support

For issues or questions:
1. Check the full documentation
2. Review test files for examples
3. Open an issue on GitHub
4. Consult the CCJK community

---

**Happy Orchestrating! 🎭**
