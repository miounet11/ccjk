# Skills API v2.0

## Overview

The Skills API provides a dynamic skill loading and execution system for CCJK. Skills are reusable, composable units of functionality that can be loaded at runtime without restarting the application. The API supports hot-reloading, dependency management, and skill versioning.

## Features

- **Hot-Reloading**: Load/unload skills without restart
- **Dependency Management**: Automatic dependency resolution
- **Skill Versioning**: Support multiple skill versions
- **Validation**: Schema-based skill validation
- **Skill Marketplace**: Browse and install skills from cloud
- **Performance Monitoring**: Track skill execution metrics

## Installation

```bash
npm install @ccjk/v2
```

## Quick Start

```typescript
import { SkillManager, Skill } from '@ccjk/v2'

// Initialize skill manager
const manager = new SkillManager({
  skillPath: './skills',
  enableHotReload: true
})

// Define a skill
const mySkill: Skill = {
  id: 'file-formatter',
  name: 'File Formatter',
  version: '1.0.0',
  description: 'Formats code files',
  author: 'CCJK Team',

  async execute(context) {
    const { filePath, style } = context.params

    // Format the file
    const formatted = await formatCode(filePath, style)

    return {
      success: true,
      result: formatted,
      metadata: { style, lines: formatted.split('\n').length }
    }
  }
}

// Register and execute
await manager.registerSkill(mySkill)
const result = await manager.execute('file-formatter', {
  filePath: 'src/app.ts',
  style: 'prettier'
})

console.log(result.success) // true
console.log(result.metadata) // { style: 'prettier', lines: 42 }
```

## API Reference

### SkillManager

Main class for managing skills.

#### Constructor

```typescript
constructor(options: SkillManagerOptions)
```

**Parameters:**
- `options.skillPath` - Path to skills directory (default: `'./skills'`)
- `options.enableHotReload` - Enable hot-reloading (default: `true`)
- `options.enableCache` - Enable skill caching (default: `true`)
- `options.validationMode` - Validation mode ('strict', 'lenient', 'none')

#### Methods

##### registerSkill

```typescript
async registerSkill(skill: Skill): Promise<void>
```

Registers a new skill.

**Parameters:**
- `skill.id` - Unique skill identifier
- `skill.name` - Human-readable name
- `skill.version` - Semantic version
- `skill.description` - Skill description
- `skill.author` - Skill author
- `skill.dependencies` - Array of skill dependencies (optional)
- `skill.execute` - Async execution function
- `skill.schema` - JSON schema for validation (optional)
- `skill.permissions` - Required permissions (optional)

**Throws:**
- `SkillValidationError` - If skill validation fails
- `SkillDependencyError` - If dependencies cannot be resolved

**Example:**
```typescript
await manager.registerSkill({
  id: 'code-generator',
  name: 'Code Generator',
  version: '2.1.0',
  description: 'Generates boilerplate code',
  author: 'CCJK',

  dependencies: ['template-engine', 'formatter'],

  async execute(context) {
    const { template, params } = context.params
    return generateCode(template, params)
  },

  schema: {
    type: 'object',
    properties: {
      template: { type: 'string' },
      params: { type: 'object' }
    },
    required: ['template']
  }
})
```

##### unregisterSkill

```typescript
async unregisterSkill(skillId: string): Promise<void>
```

Unregisters a skill.

**Parameters:**
- `skillId` - Skill identifier

##### execute

```typescript
async execute(skillId: string, context: ExecutionContext): Promise<ExecutionResult>
```

Executes a skill.

**Parameters:**
- `skillId` - Skill to execute
- `context.params` - Parameters to pass to skill
- `context.metadata` - Additional metadata
- `context.timeout` - Execution timeout in ms (default: `30000`)

**Returns:**
- `success` - Whether execution succeeded
- `result` - Return value from skill
- `error` - Error message (if failed)
- `metadata` - Skill metadata
- `duration` - Execution time in ms

**Throws:**
- `SkillNotFoundError` - If skill doesn't exist
- `SkillTimeoutError` - If execution times out
- `SkillExecutionError` - If execution fails

**Example:**
```typescript
const result = await manager.execute('code-generator', {
  params: {
    template: 'express-api',
    params: { name: 'UserAPI' }
  },
  metadata: { requestId: '123' },
  timeout: 10000
})

if (result.success) {
  console.log('Generated code:', result.result)
} else {
  console.error('Execution failed:', result.error)
}
```

##### listSkills

```typescript
listSkills(filter?: SkillFilter): SkillInfo[]
```

Lists registered skills.

**Parameters:**
- `filter.category` - Filter by category
- `filter.author` - Filter by author
- `filter.version` - Filter by version
- `filter.tags` - Filter by tags

**Returns:** Array of skill information

##### getSkill

```typescript
getSkill(skillId: string): Skill | undefined
```

Gets a skill by ID.

##### hasSkill

```typescript
hasSkill(skillId: string): boolean
```

Checks if a skill is registered.

##### reloadSkill

```typescript
async reloadSkill(skillId: string): Promise<void>
```

Reloads a skill from disk (hot-reload).

##### getMetrics

```typescript
getMetrics(skillId?: string): SkillMetrics
```

Gets execution metrics for a skill or all skills.

**Returns:**
- `executions` - Total executions
- `successRate` - Success rate (0-1)
- `averageDuration` - Average execution time in ms
- `lastExecuted` - Last execution timestamp
- `errors` - Array of recent errors

### Skill Cloud Manager

Manages cloud-based skills from the marketplace.

#### Methods

##### searchSkills

```typescript
async searchSkills(query: string, options?: SearchOptions): Promise<SkillSearchResult[]>
```

Searches the skill marketplace.

**Parameters:**
- `query` - Search query
- `options.category` - Filter by category
- `options.tags` - Filter by tags
- `options.limit` - Max results (default: `20`)

**Returns:** Array of search results

##### installSkill

```typescript
async installSkill(skillId: string, version?: string): Promise<void>
```

Installs a skill from the marketplace.

##### updateSkill

```typescript
async updateSkill(skillId: string): Promise<void>
```

Updates a skill to the latest version.

##### publishSkill

```typescript
async publishSkill(skill: Skill): Promise<void>
```

Publishes a skill to the marketplace.

### Types

```typescript
interface Skill {
  id: string
  name: string
  version: string
  description: string
  author: string
  dependencies?: string[]
  execute: (context: ExecutionContext) => Promise<any>
  schema?: JSONSchema
  permissions?: Permission[]
  category?: string
  tags?: string[]
  metadata?: Record<string, any>
}

interface ExecutionContext {
  params: Record<string, any>
  metadata?: Record<string, any>
  timeout?: number
  signal?: AbortSignal
}

interface ExecutionResult {
  success: boolean
  result?: any
  error?: string
  metadata: SkillMetadata
  duration: number
  timestamp: string
}

interface SkillInfo {
  id: string
  name: string
  version: string
  description: string
  author: string
  category?: string
  tags?: string[]
  loaded: boolean
  loadedAt?: string
}

interface SkillMetrics {
  executions: number
  successRate: number
  averageDuration: number
  lastExecuted?: string
  errors: ErrorEntry[]
}

interface SkillFilter {
  category?: string
  author?: string
  version?: string
  tags?: string[]
}
```

## Configuration

### Skill Structure

Skills should follow this structure:

```
skills/
├── my-skill/
│   ├── index.ts          # Skill definition
│   ├── schema.json       # Validation schema (optional)
│   ├── README.md         # Documentation
│   └── tests/            # Skill tests
```

### Skill Definition

```typescript
// index.ts
import { Skill } from '@ccjk/v2'

export default {
  id: 'my-skill',
  name: 'My Skill',
  version: '1.0.0',
  description: 'Does something useful',
  author: 'Your Name',

  dependencies: [], // No dependencies

  // Optional JSON schema for validation
  schema: {
    type: 'object',
    properties: {
      input: { type: 'string' }
    },
    required: ['input']
  },

  // Main execution function
  async execute(context) {
    const { input } = context.params

    // Do work here
    const result = processInput(input)

    return {
      success: true,
      result,
      metadata: { processedAt: new Date().toISOString() }
    }
  }
} as Skill
```

### Validation Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "filePath": {
      "type": "string",
      "description": "Path to the file"
    },
    "options": {
      "type": "object",
      "properties": {
        "format": { "type": "string", "enum": ["json", "yaml"] }
      }
    }
  },
  "required": ["filePath"]
}
```

## Examples

### Example 1: Code Generation Skill

```typescript
const codeGenSkill: Skill = {
  id: 'express-generator',
  name: 'Express Generator',
  version: '2.0.0',
  description: 'Generates Express.js boilerplate',
  author: 'CCJK',

  dependencies: ['template-engine'],

  schema: {
    type: 'object',
    properties: {
      appName: { type: 'string' },
      features: {
        type: 'array',
        items: { type: 'string', enum: ['auth', 'logging', 'swagger'] }
      }
    },
    required: ['appName']
  },

  async execute(context) {
    const { appName, features = [] } = context.params

    // Generate Express app structure
    const structure = {
      'app.js': generateAppFile(appName),
      'routes/': {},
      'controllers/': {},
      'models/': {}
    }

    // Add requested features
    if (features.includes('auth')) {
      structure['middleware/auth.js'] = generateAuth()
    }

    return {
      success: true,
      result: structure,
      metadata: { features, files: Object.keys(structure).length }
    }
  }
}

await manager.registerSkill(codeGenSkill)
const result = await manager.execute('express-generator', {
  params: {
    appName: 'MyAPI',
    features: ['auth', 'logging']
  }
})
```

### Example 2: File Processing Skill

```typescript
const fileProcessor: Skill = {
  id: 'file-processor',
  name: 'File Processor',
  version: '1.5.0',
  description: 'Processes and transforms files',
  author: 'CCJK',

  async execute(context) {
    const { filePath, operations } = context.params

    let content = await fs.readFile(filePath, 'utf-8')

    // Apply operations in sequence
    for (const op of operations) {
      switch (op.type) {
        case 'replace':
          content = content.replaceAll(op.search, op.replace)
          break
        case 'regex':
          content = content.replace(new RegExp(op.pattern, op.flags), op.replacement)
          break
        case 'transform':
          content = op.fn(content)
          break
      }
    }

    // Write back if requested
    if (context.params.write) {
      await fs.writeFile(filePath, content)
    }

    return {
      success: true,
      result: content,
      metadata: {
        originalSize: content.length,
        operationsCount: operations.length
      }
    }
  }
}

// Process a file
const result = await manager.execute('file-processor', {
  params: {
    filePath: 'config.json',
    write: true,
    operations: [
      { type: 'replace', search: 'localhost', replace: 'production-server' },
      { type: 'regex', pattern: '"port":\\s*\\d+', flags: 'g', replacement: '"port": 8080' }
    ]
  }
})
```

### Example 3: Skill with Dependencies

```typescript
// Dependency skill
const templateEngine: Skill = {
  id: 'template-engine',
  name: 'Template Engine',
  version: '1.0.0',
  description: 'Renders templates with data',
  author: 'CCJK',

  async execute(context) {
    const { template, data } = context.params
    return renderTemplate(template, data)
  }
}

// Skill that depends on template-engine
const emailSender: Skill = {
  id: 'email-sender',
  name: 'Email Sender',
  version: '1.2.0',
  description: 'Sends formatted emails',
  author: 'CCJK',

  dependencies: ['template-engine'],

  async execute(context) {
    const { to, subject, templateName, data } = context.params

    // Use dependency skill
    const template = await loadTemplate(templateName)
    const html = await manager.execute('template-engine', {
      params: { template, data }
    })

    // Send email
    await sendEmail({ to, subject, html })

    return { success: true, result: { sent: true, to } }
  }
}

// Register in dependency order
await manager.registerSkill(templateEngine)
await manager.registerSkill(emailSender)
```

### Example 4: Cloud Skills

```typescript
// Search marketplace
const results = await manager.cloud.searchSkills('code formatting', {
  category: 'development',
  tags: ['prettier', 'eslint'],
  limit: 10
})

console.log('Found skills:', results.length)

// Install a skill
await manager.cloud.installSkill('prettier-formatter', '2.0.0')

// Use the installed skill
const result = await manager.execute('prettier-formatter', {
  params: { filePath: 'src/app.ts', options: { semi: true } }
})

// Update to latest version
await manager.cloud.updateSkill('prettier-formatter')
```

### Example 5: Skill Metrics

```typescript
// Get metrics for specific skill
const metrics = manager.getMetrics('code-generator')

console.log('Code Generator Metrics:')
console.log(`- Executions: ${metrics.executions}`)
console.log(`- Success rate: ${(metrics.successRate * 100).toFixed(1)}%`)
console.log(`- Avg duration: ${metrics.averageDuration}ms`)
console.log(`- Last executed: ${metrics.lastExecuted}`)

// Get all skill metrics
const allMetrics = manager.getMetrics()

// Find most used skills
Object.entries(allMetrics)
  .sort(([, a], [, b]) => b.executions - a.executions)
  .slice(0, 5)
  .forEach(([skillId, metrics]) => {
    console.log(`${skillId}: ${metrics.executions} executions`)
  })
```

## Error Handling

### SkillNotFoundError

```typescript
try {
  await manager.execute('non-existent', {})
} catch (error) {
  if (error instanceof SkillNotFoundError) {
    console.error('Skill not found:', error.skillId)
  }
}
```

### SkillTimeoutError

```typescript
try {
  await manager.execute('slow-skill', { timeout: 1000 })
} catch (error) {
  if (error instanceof SkillTimeoutError) {
    console.error('Skill timed out after', error.timeout, 'ms')
  }
}
```

### SkillValidationError

```typescript
try {
  await manager.registerSkill(invalidSkill)
} catch (error) {
  if (error instanceof SkillValidationError) {
    console.error('Validation errors:', error.errors)
  }
}
```

## Performance

- **Load Time**: < 10ms per skill
- **Execution**: Varies by skill (typically < 100ms)
- **Hot-Reload**: < 5ms
- **Memory**: O(n) where n is number of loaded skills
- **Validation**: < 1ms for JSON schema validation

## Best Practices

1. **Keep Skills Focused**
   - Each skill should do one thing well
   - Use composition for complex tasks

2. **Use Dependencies**
   - Declare dependencies explicitly
   - Keep dependency graph shallow

3. **Provide Schemas**
   - Always define JSON schemas
   - Validate inputs thoroughly

4. **Handle Errors**
   - Return structured error responses
   - Provide helpful error messages

5. **Document Skills**
   - Write clear descriptions
   - Provide usage examples
   - Include README files

6. **Monitor Performance**
   - Check execution metrics
   - Optimize slow skills
   - Set appropriate timeouts

## See Also

- [Hooks API](./hooks-v2.md) - Traceability and enforcement
- [Brain API](./brain-v2.md) - Context optimization
- [Agents API](./agents-v2.md) - Multi-agent orchestration
- [Actionbook API](./actionbook.md) - Action tracking

---

**Source**: [src/skills/skill-manager.ts](../../src/skills/skill-manager.ts#L1)

**Last Updated**: 2026-01-23