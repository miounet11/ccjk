# Workflow v2 - AI-Powered Workflow Generation

> Generate, optimize, and manage workflows using AI and reusable fragments

## Overview

CCJK Workflow v2 is an intelligent workflow generation system that uses AI to create, validate, and optimize workflows for software development tasks. It combines the power of large language models with a curated library of reusable workflow fragments.

## Key Features

- **AI-Powered Generation**: Generate workflows from natural language descriptions
- **Fragment Library**: 50+ reusable workflow fragments organized by category
- **Smart Validation**: Comprehensive validation including circular dependency detection
- **Automatic Optimization**: Parallelization, caching, and resource optimization
- **Multi-Platform Support**: Works with Linux, macOS, Windows, and Termux
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @ccjk/workflow-v2
```

## Quick Start

### Basic Usage

```typescript
import { WorkflowManager } from '@ccjk/workflow-v2'

// Create a workflow manager
const manager = new WorkflowManager({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-5-20250929',
})

// Generate a workflow from natural language
const result = await manager.generateWorkflow({
  task: 'Build and test a Node.js application',
  context: {
    language: 'typescript',
    framework: 'express',
    platform: 'linux',
    packageManager: 'npm',
  },
})

console.log('Generated workflow:', result.workflow)
console.log('Confidence:', result.metadata.confidence)
console.log('Duration:', result.metadata.duration, 'ms')
```

### Using Fragments

```typescript
// Search for fragments
const fragments = manager.searchFragments('docker')

// Get fragments by category
const setupFragments = manager.getFragmentsByCategory('setup')

// Generate workflow from fragments
const result = await manager.generateFromFragments(
  ['setup-nodejs', 'setup-git', 'setup-docker'],
  {
    language: 'javascript',
    platform: 'linux',
  }
)
```

### Validation

```typescript
const validation = manager.validateWorkflow(workflow, context)

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors)
  console.warn('Warnings:', validation.warnings)
  console.info('Suggestions:', validation.suggestions)
}
```

### Optimization

```typescript
const optimization = manager.optimizeWorkflow(workflow, context)

console.log('Time saved:', optimization.estimatedTimeSaved, 'minutes')
console.log('Resource saved:', optimization.estimatedResourceSaved)
console.log('Improvements:', optimization.improvements)
```

## Workflow Structure

```typescript
interface Workflow {
  id: string
  name: string
  description: string
  version: string
  tags: string[]
  steps: WorkflowStep[]
  metadata: WorkflowMetadata
  requirements: WorkflowRequirements
}

interface WorkflowStep {
  id: string
  name: string
  description: string
  command?: string
  script?: string
  dependencies?: string[]
  validation?: ValidationRule
  errorHandling?: ErrorHandling
  timeout?: number
  retry?: RetryConfig
}
```

## Fragment Library

### Available Categories

- **Setup**: Environment initialization, configuration, dependency installation
- **Develop**: Building, linting, type checking, development server
- **Test**: Unit tests, integration tests, E2E tests, performance tests
- **Deploy**: Docker deployment, NPM publishing, cloud deployments

### Example Fragment

```typescript
{
  id: 'setup-nodejs',
  name: 'Setup Node.js Environment',
  description: 'Initialize a Node.js project with package.json and dependencies',
  category: 'setup',
  steps: [
    {
      id: 'check-node',
      name: 'Check Node.js Installation',
      command: 'node --version',
      validation: { type: 'exit_code', condition: '0' },
      errorHandling: { strategy: 'abort' }
    },
    {
      id: 'install-deps',
      name: 'Install Dependencies',
      command: 'npm install',
      dependencies: ['init-package'],
      timeout: 300,
      retry: { maxAttempts: 3, backoff: 'exponential' }
    }
  ],
  tags: ['nodejs', 'javascript', 'package-manager'],
  requirements: {
    tools: ['node', 'npm'],
    platforms: ['linux', 'macos', 'windows']
  }
}
```

## Advanced Usage

### Custom Fragments

```typescript
import { FragmentLibrary } from '@ccjk/workflow-v2'

const library = new FragmentLibrary()

const customFragment: Fragment = {
  id: 'custom-deploy',
  name: 'Custom Deployment',
  description: 'My custom deployment workflow',
  category: 'deploy',
  steps: [
    {
      id: 'build',
      name: 'Build Application',
      command: 'npm run build',
      timeout: 300,
    },
    {
      id: 'deploy',
      name: 'Deploy to Production',
      command: './deploy.sh',
      dependencies: ['build'],
      errorHandling: { strategy: 'retry', maxAttempts: 2 },
    },
  ],
  tags: ['deployment', 'production'],
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0',
  },
}

library.addFragment(customFragment)
```

### Workflow Generation Options

```typescript
const result = await manager.generateWorkflow({
  task: 'Build and deploy application',
  context: { language: 'typescript', platform: 'linux' },
  options: {
    includeTests: true,
    includeErrorHandling: true,
    optimizationLevel: 'speed',
    style: 'concise',
    customRequirements: [
      'Must use Docker for deployment',
      'Include health checks',
    ],
  },
})
```

### Validation Rules

```typescript
interface ValidationRule {
  type: 'exit_code' | 'output' | 'file_exists' | 'custom'
  condition: string | RegExp | ((result: any) => boolean)
  errorMessage?: string
}

// Example usages
const exitCodeRule = {
  type: 'exit_code' as const,
  condition: '0',
  errorMessage: 'Command failed',
}

const fileExistsRule = {
  type: 'file_exists' as const,
  condition: 'dist/index.js',
  errorMessage: 'Build output not found',
}

const outputRule = {
  type: 'output' as const,
  condition: /success/i,
  errorMessage: 'Output does not indicate success',
}
```

### Error Handling Strategies

```typescript
interface ErrorHandling {
  strategy: 'retry' | 'continue' | 'abort' | 'fallback'
  fallbackStep?: string
  maxAttempts?: number
}

// Retry with exponential backoff
const step: WorkflowStep = {
  id: 'deploy',
  name: 'Deploy',
  command: 'npm run deploy',
  errorHandling: { strategy: 'retry' },
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    initialDelay: 1000,
    maxDelay: 30000,
  },
}
```

## Optimization Features

### Automatic Improvements

1. **Parallelization**: Identify and execute independent steps in parallel
2. **Caching**: Add caching for expensive operations
3. **Resource Cleanup**: Ensure proper cleanup of resources
4. **Timeout Optimization**: Adjust timeouts based on step complexity
5. **Error Handling**: Add appropriate error handling and retry logic

### Example Optimization

```typescript
const optimization = manager.optimizeWorkflow(workflow, context)

optimization.improvements.forEach(imp => {
  console.log(`${imp.type}: ${imp.description}`)
  console.log(`  Impact: ${imp.impact}`)
  console.log(`  Before: ${imp.before}`)
  console.log(`  After: ${imp.after}`)
})
```

## API Reference

### WorkflowManager

Main class for workflow management.

#### Methods

- `generateWorkflow(request)` - Generate workflow from natural language
- `generateFromFragments(fragmentIds, context)` - Generate from fragments
- `validateWorkflow(workflow, context)` - Validate workflow
- `optimizeWorkflow(workflow, context)` - Optimize workflow
- `searchFragments(query)` - Search fragment library
- `getFragmentsByCategory(category)` - Get fragments by category
- `addFragment(fragment)` - Add custom fragment
- `removeFragment(id)` - Remove fragment
- `getFragmentStats()` - Get library statistics

### WorkflowGenerator

Low-level workflow generation.

#### Methods

- `generate(request)` - Generate workflow
- `generateFromFragments(fragmentIds, context)` - Generate from fragments
- `clearCache()` - Clear generation cache
- `getCacheStats()` - Get cache statistics

### WorkflowValidator

Workflow validation.

#### Validation Checks

- Structure validation
- Step validation
- Dependency validation
- Circular dependency detection
- Platform compatibility
- Resource availability
- Security validation
- Performance validation

### WorkflowOptimizer

Workflow optimization.

#### Optimization Rules

- Step parallelization
- Build caching
- Dependency reduction
- Resource cleanup
- Timeout optimization
- Error handling

## Best Practices

1. **Always Validate**: Validate workflows before execution
2. **Use Fragments**: Leverage existing fragments for common tasks
3. **Handle Errors**: Implement proper error handling and retry logic
4. **Set Timeouts**: Configure appropriate timeouts for each step
5. **Test Thoroughly**: Test workflows in safe environments before production
6. **Monitor Execution**: Add health checks and monitoring steps
7. **Clean Up**: Ensure proper cleanup of resources
8. **Version Control**: Track workflow versions in git

## Error Handling

```typescript
try {
  const result = await manager.generateWorkflow(request)

  if (!result.validation.isValid) {
    console.error('Workflow has errors:', result.validation.errors)
    // Handle validation errors
  }

  // Use workflow
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Invalid API key')
  } else if (error.message.includes('timeout')) {
    console.error('Generation timeout')
  } else {
    console.error('Unknown error:', error)
  }
}
```

## Performance Tips

1. **Use Cache**: Enable caching to speed up repeated generations
2. **Parallelize**: Generate multiple workflows concurrently
3. **Optimize First**: Always optimize workflows before execution
4. **Fragment Reuse**: Use fragments instead of generating from scratch
5. **Context Building**: Provide rich context for better generation

## Examples

See the `/examples` directory for complete examples:

- `basic-generation.ts` - Basic workflow generation
- `fragment-usage.ts` - Using fragments
- `custom-fragments.ts` - Creating custom fragments
- `validation.ts` - Workflow validation
- `optimization.ts` - Workflow optimization
- `error-handling.ts` - Error handling patterns

## License

MIT

## Contributing

Contributions are welcome! Please see CONTRIBUTING.md for guidelines.

## Support

- GitHub Issues: https://github.com/yourusername/ccjk/issues
- Documentation: https://docs.ccjk.dev
- Discord: https://discord.gg/ccjk
