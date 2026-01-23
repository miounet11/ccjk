# Workflow API v2.0

## Overview

The Workflow API provides a powerful system for generating, executing, and managing complex workflows in CCJK. Workflows are composed of actions that can be executed sequentially, in parallel, or conditionally. The API supports dynamic workflow generation, version control, and workflow templates.

## Features

- **Dynamic Generation**: Generate workflows from natural language
- **Parallel Execution**: Execute actions concurrently
- **Conditional Logic**: Branch based on conditions
- **Version Control**: Track workflow versions and changes
- **Templates**: Reusable workflow templates
- **Monitoring**: Track workflow execution and performance

## Installation

```bash
npm install @ccjk/v2
```

## Quick Start

```typescript
import { WorkflowEngine, WorkflowGenerator } from '@ccjk/v2'

// Initialize workflow engine
const engine = new WorkflowEngine({
  maxConcurrentActions: 10,
  enableMonitoring: true
})

// Define a workflow
const workflow = {
  id: 'deploy-app',
  name: 'Deploy Application',
  description: 'Deploys a web application',
  version: '1.0.0',

  actions: [
    {
      id: 'build',
      name: 'Build Application',
      type: 'shell',
      command: 'npm run build',
      output: 'build-output'
    },
    {
      id: 'test',
      name: 'Run Tests',
      type: 'shell',
      command: 'npm test',
      dependsOn: ['build']
    },
    {
      id: 'deploy',
      name: 'Deploy to Production',
      type: 'shell',
      command: 'npm run deploy',
      dependsOn: ['test'],
      condition: '${test.exitCode} === 0'
    }
  ]
}

// Execute workflow
const result = await engine.execute(workflow)

console.log('Status:', result.status)
console.log('Duration:', result.duration)
console.log('Actions completed:', result.completedActions.length)
```

## API Reference

### WorkflowEngine

Main class for executing workflows.

#### Constructor

```typescript
constructor(options: EngineOptions)
```

**Parameters:**
- `options.maxConcurrentActions` - Max concurrent actions (default: `10`)
- `options.enableMonitoring` - Enable monitoring (default: `true`)
- `options.timeout` - Default timeout in ms (default: `300000`)
- `options.retryAttempts` - Retry attempts (default: `3`)

#### Methods

##### execute

```typescript
async execute(workflow: Workflow, options?: ExecuteOptions): Promise<ExecutionResult>
```

Executes a workflow.

**Parameters:**
- `workflow` - Workflow definition
- `options.context` - Execution context
- `options.variables` - Workflow variables
- `options.dryRun` - Execute without side effects

**Returns:**
- `status` - Execution status
- `duration` - Total execution time
- `completedActions` - Successfully completed actions
- `failedActions` - Failed actions
- `output` - Workflow output
- `logs` - Execution logs

**Throws:**
- `WorkflowValidationError` - If workflow is invalid
- `WorkflowExecutionError` - If execution fails

**Example:**
```typescript
const result = await engine.execute(workflow, {
  context: {
    environment: 'production',
    branch: 'main'
  },
  variables: {
    APP_NAME: 'myapp',
    DEPLOY_TARGET: 'aws'
  }
})

if (result.status === 'success') {
  console.log('Deployment successful!')
} else {
  console.error('Deployment failed:', result.failedActions)
}
```

##### validate

```typescript
validate(workflow: Workflow): ValidationResult
```

Validates a workflow definition.

**Returns:**
- `valid` - Whether workflow is valid
- `errors` - Array of validation errors
- `warnings` - Array of warnings

##### getExecutionHistory

```typescript
getExecutionHistory(workflowId?: string): ExecutionRecord[]
```

Gets execution history.

##### getMetrics

```typescript
getMetrics(): EngineMetrics
```

Gets engine performance metrics.

### WorkflowGenerator

Generates workflows from natural language descriptions.

#### Methods

##### generate

```typescript
async generate(description: string, options?: GenerateOptions): Promise<GeneratedWorkflow>
```

Generates a workflow from description.

**Parameters:**
- `description` - Natural language description
- `options.context` - Additional context
- `options.template` - Base template to use
- `options.constraints` - Generation constraints

**Returns:** Generated workflow

**Example:**
```typescript
const generator = new WorkflowGenerator()

const generated = await generator.generate(
  'Create a workflow that builds a Node.js app, runs tests, and deploys to staging if tests pass',
  {
    context: {
      appType: 'Node.js',
      testFramework: 'Jest',
      deploymentTarget: 'staging'
    },
    constraints: {
      maxActions: 10,
      parallelization: true
    }
  }
)

console.log('Generated workflow:', generated.workflow)
console.log('Confidence:', generated.confidence)
```

##### optimize

```typescript
async optimize(workflow: Workflow): Promise<OptimizedWorkflow>
```

Optimizes a workflow for better performance.

**Returns:** Optimized workflow with improvements

### Action Types

#### Shell Action

Executes shell commands.

```typescript
{
  type: 'shell',
  command: string,
  cwd?: string,
  env?: Record<string, string>,
  timeout?: number
}
```

#### HTTP Action

Makes HTTP requests.

```typescript
{
  type: 'http',
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  headers?: Record<string, string>,
  body?: any,
  timeout?: number
}
```

#### Script Action

Executes JavaScript/TypeScript.

```typescript
{
  type: 'script',
  code: string,
  language: 'javascript' | 'typescript',
  timeout?: number
}
```

#### Parallel Action

Executes actions in parallel.

```typescript
{
  type: 'parallel',
  actions: Action[],
  maxConcurrency?: number
}
```

#### Condition Action

Executes conditionally.

```typescript
{
  type: 'condition',
  condition: string, // JavaScript expression
  ifTrue: Action | Action[],
  ifFalse?: Action | Action[]
}
```

#### Loop Action

Executes actions in a loop.

```typescript
{
  type: 'loop',
  items: any[],
  action: Action,
  parallel?: boolean
}
```

### Types

```typescript
interface Workflow {
  id: string
  name: string
  description: string
  version: string
  actions: Action[]
  metadata?: Record<string, any>
}

interface Action {
  id: string
  name: string
  type: string
  dependsOn?: string[]
  condition?: string
  onError?: 'continue' | 'stop' | 'retry'
  timeout?: number
  [key: string]: any
}

interface ExecuteOptions {
  context?: Record<string, any>
  variables?: Record<string, string>
  dryRun?: boolean
  timeout?: number
}

interface ExecutionResult {
  status: 'success' | 'failed' | 'cancelled'
  duration: number
  startTime: string
  endTime: string
  completedActions: string[]
  failedActions: FailedAction[]
  output: Record<string, any>
  logs: LogEntry[]
}

interface FailedAction {
  actionId: string
  error: string
  attempt: number
  timestamp: string
}

interface EngineMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageDuration: number
  mostExecutedWorkflows: string[]
}
```

## Configuration

### Workflow Structure

```typescript
const workflow: Workflow = {
  id: 'unique-id',
  name: 'Workflow Name',
  description: 'What this workflow does',
  version: '1.0.0',

  // Actions to execute
  actions: [
    {
      id: 'action-1',
      name: 'First Action',
      type: 'shell',
      command: 'echo "Hello"',
      dependsOn: [], // No dependencies
      condition: 'true', // Always execute
      onError: 'stop', // Stop on error
      timeout: 30000 // 30 seconds
    }
  ],

  // Additional metadata
  metadata: {
    category: 'deployment',
    tags: ['production', 'automated'],
    author: 'CCJK Team'
  }
}
```

### Action Dependencies

```typescript
// Sequential execution
actions: [
  { id: 'build', type: 'shell', command: 'npm run build' },
  { id: 'test', dependsOn: ['build'], type: 'shell', command: 'npm test' },
  { id: 'deploy', dependsOn: ['test'], type: 'shell', command: 'npm run deploy' }
]

// Parallel execution
actions: [
  { id: 'test-frontend', type: 'shell', command: 'npm test -- frontend' },
  { id: 'test-backend', type: 'shell', command: 'npm test -- backend' },
  { id: 'test-e2e', type: 'shell', command: 'npm test -- e2e' },
  { id: 'report', dependsOn: ['test-frontend', 'test-backend', 'test-e2e'] }
]
```

### Variables and Context

```typescript
// Define variables
const result = await engine.execute(workflow, {
  variables: {
    APP_NAME: 'myapp',
    VERSION: '1.0.0',
    DEPLOY_ENV: 'staging'
  }
})

// Use in actions
{
  id: 'deploy',
  type: 'shell',
  command: 'deploy ${APP_NAME} --version ${VERSION} --env ${DEPLOY_ENV}'
}

// Access previous action outputs
{
  id: 'notify',
  type: 'http',
  method: 'POST',
  url: '${build.output.url}/notify',
  body: { status: '${test.status}' }
}
```

## Examples

### Example 1: CI/CD Pipeline

```typescript
const ciCDWorkflow: Workflow = {
  id: 'ci-cd-pipeline',
  name: 'CI/CD Pipeline',
  description: 'Build, test, and deploy application',
  version: '2.0.0',

  actions: [
    {
      id: 'checkout',
      name: 'Checkout Code',
      type: 'shell',
      command: 'git checkout ${BRANCH}'
    },
    {
      id: 'install',
      name: 'Install Dependencies',
      type: 'shell',
      command: 'npm ci',
      dependsOn: ['checkout']
    },
    {
      id: 'lint',
      name: 'Lint Code',
      type: 'shell',
      command: 'npm run lint',
      dependsOn: ['install']
    },
    {
      id: 'test',
      name: 'Run Tests',
      type: 'shell',
      command: 'npm test',
      dependsOn: ['install']
    },
    {
      id: 'build',
      name: 'Build Application',
      type: 'shell',
      command: 'npm run build',
      dependsOn: ['lint', 'test']
    },
    {
      id: 'security-scan',
      name: 'Security Scan',
      type: 'shell',
      command: 'npm audit && snyk test',
      dependsOn: ['install']
    },
    {
      id: 'deploy-staging',
      name: 'Deploy to Staging',
      type: 'condition',
      condition: '${ENVIRONMENT} === "staging"',
      ifTrue: {
        type: 'shell',
        command: 'npm run deploy:staging'
      },
      dependsOn: ['build', 'security-scan']
    },
    {
      id: 'deploy-prod',
      name: 'Deploy to Production',
      type: 'condition',
      condition: '${ENVIRONMENT} === "production"',
      ifTrue: {
        type: 'shell',
        command: 'npm run deploy:prod'
      },
      dependsOn: ['build', 'security-scan']
    },
    {
      id: 'notify',
      name: 'Notify Team',
      type: 'http',
      method: 'POST',
      url: '${SLACK_WEBHOOK}',
      body: {
        text: 'Deployment completed: ${build.output.status}'
      },
      dependsOn: ['deploy-staging', 'deploy-prod']
    }
  ]
}

// Execute with different environments
await engine.execute(ciCDWorkflow, {
  variables: {
    ENVIRONMENT: 'staging',
    BRANCH: 'main',
    SLACK_WEBHOOK: 'https://hooks.slack.com/...'
  }
})
```

### Example 2: Parallel Testing

```typescript
const testWorkflow: Workflow = {
  id: 'parallel-testing',
  name: 'Parallel Testing',
  description: 'Run tests in parallel',
  version: '1.0.0',

  actions: [
    {
      id: 'setup',
      name: 'Setup Test Environment',
      type: 'shell',
      command: 'npm run test:setup'
    },
    {
      id: 'run-tests',
      name: 'Run All Tests',
      type: 'parallel',
      dependsOn: ['setup'],
      actions: [
        {
          id: 'unit-tests',
          name: 'Unit Tests',
          type: 'shell',
          command: 'npm run test:unit'
        },
        {
          id: 'integration-tests',
          name: 'Integration Tests',
          type: 'shell',
          command: 'npm run test:integration'
        },
        {
          id: 'e2e-tests',
          name: 'E2E Tests',
          type: 'shell',
          command: 'npm run test:e2e'
        },
        {
          id: 'performance-tests',
          name: 'Performance Tests',
          type: 'shell',
          command: 'npm run test:performance'
        }
      ],
      maxConcurrency: 4
    },
    {
      id: 'coverage',
      name: 'Generate Coverage Report',
      type: 'shell',
      command: 'npm run coverage:report',
      dependsOn: ['run-tests']
    }
  ]
}
```

### Example 3: Dynamic Workflow Generation

```typescript
const generator = new WorkflowGenerator()

// Generate from description
const generated = await generator.generate(
  'Create a workflow that backs up the database, compresses the backup, uploads to S3, and sends a notification email'
)

console.log('Generated workflow:', generated.workflow)

// Execute the generated workflow
const result = await engine.execute(generated.workflow, {
  variables: {
    DB_NAME: 'myapp',
    S3_BUCKET: 'backups',
    EMAIL: 'admin@example.com'
  }
})

console.log('Backup completed:', result.status)
```

### Example 4: Looping Actions

```typescript
const deploymentWorkflow: Workflow = {
  id: 'multi-region-deploy',
  name: 'Multi-Region Deployment',
  description: 'Deploy to multiple regions',
  version: '1.0.0',

  actions: [
    {
      id: 'get-regions',
      name: 'Get Regions',
      type: 'script',
      language: 'javascript',
      code: `
        const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1']
        return regions
      `
    },
    {
      id: 'deploy-all',
      name: 'Deploy to All Regions',
      type: 'loop',
      items: '${get-regions.output}',
      action: {
        id: 'deploy-region',
        name: 'Deploy to Region',
        type: 'shell',
        command: 'deploy.sh ${item}'
      }
    },
    {
      id: 'verify-all',
      name: 'Verify All Deployments',
      type: 'loop',
      items: '${get-regions.output}',
      action: {
        id: 'verify-region',
        name: 'Verify Region',
        type: 'http',
        method: 'GET',
        url: 'https://api-${item}.example.com/health'
      }
    }
  ]
}
```

### Example 5: Error Handling and Retries

```typescript
const resilientWorkflow: Workflow = {
  id: 'resilient-deployment',
  name: 'Resilient Deployment',
  description: 'Deployment with retry logic',
  version: '1.0.0',

  actions: [
    {
      id: 'pre-check',
      name: 'Pre-deployment Check',
      type: 'http',
      method: 'GET',
      url: 'https://api.example.com/status',
      onError: 'stop',
      timeout: 5000
    },
    {
      id: 'deploy',
      name: 'Deploy Application',
      type: 'shell',
      command: 'deploy.sh --target production',
      onError: 'retry',
      timeout: 60000,
      retries: {
        attempts: 3,
        delay: 5000,
        backoff: 'exponential'
      }
    },
    {
      id: 'health-check',
      name: 'Health Check',
      type: 'script',
      language: 'javascript',
      code: `
        const axios = require('axios')

        async function healthCheck() {
          let attempts = 0
          while (attempts < 5) {
            try {
              const response = await axios.get('https://app.example.com/health')
              if (response.status === 200) {
                return { healthy: true, status: response.status }
              }
            } catch (error) {
              attempts++
              await new Promise(resolve => setTimeout(resolve, 10000))
            }
          }
          throw new Error('Health check failed after 5 attempts')
        }

        return await healthCheck()
      `,
      dependsOn: ['deploy']
    },
    {
      id: 'rollback',
      name: 'Rollback on Failure',
      type: 'condition',
      condition: '${health-check.output.healthy} !== true',
      ifTrue: {
        type: 'shell',
        command: 'rollback.sh'
      },
      dependsOn: ['health-check']
    }
  ]
}
```

## Error Handling

### WorkflowValidationError

```typescript
try {
  engine.execute(invalidWorkflow)
} catch (error) {
  if (error instanceof WorkflowValidationError) {
    console.error('Validation errors:', error.errors)
    console.error('Warnings:', error.warnings)
  }
}
```

### WorkflowExecutionError

```typescript
try {
  await engine.execute(workflow)
} catch (error) {
  if (error instanceof WorkflowExecutionError) {
    console.error('Workflow failed:', error.message)
    console.error('Failed action:', error.actionId)
    console.error('Error details:', error.details)
  }
}
```

### ActionTimeoutError

```typescript
try {
  await engine.execute(workflowWithTimeout)
} catch (error) {
  if (error instanceof ActionTimeoutError) {
    console.error('Action timed out:', error.actionId)
    console.error('Timeout:', error.timeout, 'ms')
  }
}
```

## Performance

- **Workflow Parsing**: < 10ms
- **Action Execution**: Varies by action type
- **Parallel Execution**: Up to 10 concurrent actions (configurable)
- **Memory Usage**: O(n) where n is number of actions
- **History Storage**: Configurable retention period

## Best Practices

1. **Use Parallel Execution**
   - Identify independent actions
   - Use parallel type for concurrent execution
   - Set maxConcurrency to limit resources

2. **Implement Proper Error Handling**
   - Use onError for retry logic
   - Provide fallback actions
   - Log errors for debugging

3. **Optimize Dependencies**
   - Minimize action dependencies
   - Use parallel execution when possible
   - Avoid circular dependencies

4. **Use Variables and Context**
   - Define reusable variables
   - Pass context between actions
   - Avoid hardcoding values

5. **Monitor Performance**
   - Track execution times
   - Identify bottleneck actions
   - Optimize slow actions

6. **Version Control Workflows**
   - Use semantic versioning
   - Document changes
   - Test before deploying

## See Also

- [Hooks API](./hooks-v2.md) - Traceability and enforcement
- [Skills API](./skills-v2.md) - Dynamic skill loading
- [Agents API](./agents-v2.md) - Multi-agent orchestration
- [Actionbook API](./actionbook.md) - Action tracking

---

**Source**: [src/workflow/workflow-engine.ts](../../src/workflow/workflow-engine.ts#L1)

**Last Updated**: 2026-01-23