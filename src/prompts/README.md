# Modern Clack-based Prompt System

**Version**: 4.0.0
**Created**: 2026-01-18
**Status**: ✅ Complete

## Overview

A beautiful, modern prompt system for CCJK built on [@clack/prompts](https://github.com/natemoo-re/clack) with comprehensive i18n support, task execution capabilities, and elegant error handling.

## Features

### 🎨 Beautiful UI Components
- **Intro/Outro Messages**: Branded setup wizards with colored headers
- **Spinners**: Animated progress indicators for long-running tasks
- **Progress Bars**: Visual progress tracking with percentage display
- **Color Coding**: Semantic colors using picocolors (green=success, red=error, yellow=warning)
- **Step Indicators**: Clear multi-step process visualization

### 🌍 Full Internationalization
- **Supported Languages**: English (en), Chinese (zh-CN)
- **Dynamic Language Switching**: Runtime language selection
- **Complete Coverage**: All prompts, errors, and messages translated
- **Namespace Organization**: Logical grouping (cli, api, errors, etc.)

### 🚀 Advanced Task Execution
- **Sequential Execution**: Run tasks one after another with progress
- **Parallel Execution**: Run multiple tasks concurrently with configurable concurrency
- **Retry Logic**: Automatic retry with exponential backoff
- **Timeout Support**: Prevent hanging tasks with configurable timeouts
- **Progress Tracking**: Real-time progress updates with custom messages
- **Error Handling**: Graceful error recovery with detailed reporting

### ✨ Developer Experience
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Cancellation Support**: Graceful handling of user cancellations
- **Validation**: Built-in input validation with helpful error messages
- **Testing**: 100% test coverage with comprehensive test suites

## Installation

Dependencies are already installed in the project:

```json
{
  "@clack/prompts": "^0.7.0",
  "picocolors": "^1.1.1"
}
```

## Usage Examples

### Basic Prompts

```typescript
import {
  initPrompts,
  outroPrompts,
  promptText,
  promptPassword,
  promptConfirm,
  promptSelect,
  promptMultiSelect,
} from './prompts'

// Initialize with branded intro
initPrompts('CCJK Setup')

// Text input with validation
const projectName = await promptText({
  message: 'What is your project name?',
  placeholder: 'my-awesome-project',
  validate: (value) => {
    if (!value) return 'Project name is required'
    if (!/^[a-z0-9-_]+$/i.test(value)) return 'Invalid project name'
  },
})

// Password input
const apiKey = await promptPassword({
  message: 'Enter your API key',
  validate: (value) => {
    if (!value) return 'API key is required'
  },
})

// Confirmation
const shouldContinue = await promptConfirm({
  message: 'Continue with installation?',
  initialValue: true,
})

// Single select
const codeType = await promptSelect(
  'Select code tool',
  [
    { value: 'claude-code', label: 'Claude Code', hint: 'Official CLI' },
    { value: 'codex', label: 'Codex', hint: 'Alternative' },
  ],
)

// Multi-select
const features = await promptMultiSelect(
  'Select features',
  [
    { value: 'mcp', label: 'MCP Services' },
    { value: 'workflows', label: 'AI Workflows' },
    { value: 'ccr', label: 'CCR Proxy' },
  ],
)

// Show completion message
outroPrompts('🎉 Setup complete!')
```

### Project Setup Wizard

```typescript
import { promptProjectSetup } from './prompts'

// All-in-one setup wizard using p.group()
const config = await promptProjectSetup()

console.log(config)
// {
//   projectName: 'my-project',
//   codeType: 'claude-code',
//   language: 'en',
//   aiOutputLanguage: 'en',
//   features: ['mcp', 'workflows']
// }
```

### API Configuration

```typescript
import { promptApiConfiguration } from './prompts'

const apiConfig = await promptApiConfiguration()

if (apiConfig.type === 'api_key') {
  console.log(`Provider: ${apiConfig.provider}`)
  console.log(`API Key: ${apiConfig.apiKey}`)
}
else if (apiConfig.type === 'ccr_proxy') {
  console.log(`CCR Host: ${apiConfig.ccrProxy.host}`)
  console.log(`CCR Port: ${apiConfig.ccrProxy.port}`)
}
```

### Task Execution

```typescript
import {
  executeTask,
  executeTasks,
  executeTaskGroups,
  executeTaskWithRetry,
  executeTasksParallel,
  showTaskSummary,
} from './prompts'

// Single task with spinner
await executeTask('Installing dependencies', async () => {
  await installDependencies()
}, {
  showDuration: true,
})

// Multiple tasks sequentially
const results = await executeTasks([
  { title: 'Task 1', task: async () => { /* ... */ } },
  { title: 'Task 2', task: async () => { /* ... */ } },
  { title: 'Task 3', task: async () => { /* ... */ }, enabled: false }, // Skip
], {
  stopOnError: false,
  showProgress: true,
})

// Task groups with sections
await executeTaskGroups([
  {
    title: 'Setup Phase',
    tasks: [
      { title: 'Create directories', task: async () => { /* ... */ } },
      { title: 'Copy files', task: async () => { /* ... */ } },
    ],
  },
  {
    title: 'Configuration Phase',
    tasks: [
      { title: 'Configure API', task: async () => { /* ... */ } },
      { title: 'Install MCP', task: async () => { /* ... */ } },
    ],
  },
])

// Retry on failure
await executeTaskWithRetry('Download file', async () => {
  await downloadFile()
}, {
  maxRetries: 3,
  retryDelay: 1000,
  onRetry: (attempt, error) => {
    console.log(`Retry ${attempt}: ${error.message}`)
  },
})

// Parallel execution
await executeTasksParallel([
  { title: 'Task 1', task: async () => { /* ... */ } },
  { title: 'Task 2', task: async () => { /* ... */ } },
  { title: 'Task 3', task: async () => { /* ... */ } },
], {
  concurrency: 2,
})

// Show summary
showTaskSummary(results, 'Installation Summary')
```

### Progress Tracking

```typescript
import { TaskProgressTracker, executeTasksWithProgress } from './prompts'

// Manual progress tracking
const tracker = new TaskProgressTracker(5, 'Processing files')

for (let i = 0; i < 5; i++) {
  await processFile(i)
  tracker.increment(`Processing file ${i + 1}`)
}

tracker.complete('All files processed!')

// Automatic progress tracking
const results = await executeTasksWithProgress('Installing packages', [
  async () => await installPackage1(),
  async () => await installPackage2(),
  async () => await installPackage3(),
])
```

### Helper Functions

```typescript
import { note, log, warn, error, success, step, withProgress, withSteps } from './prompts'

// Show informational note
note('This will configure your API settings', 'API Configuration')

// Log messages
log('Starting installation...')
warn('This may take a few minutes')
error('Installation failed!')
success('Installation complete!')
step('Step 1: Configure API')

// Execute with progress
const result = await withProgress('Downloading...', async () => {
  return await download()
})

// Execute multiple steps
await withSteps([
  { message: 'Step 1', task: async () => { /* ... */ } },
  { message: 'Step 2', task: async () => { /* ... */ } },
  { message: 'Step 3', task: async () => { /* ... */ } },
])
```

## Architecture

### File Structure

```
src/prompts/
├── index.ts          # Main exports
├── types.ts          # TypeScript type definitions
├── modern.ts         # Core prompt functions
└── tasks.ts          # Task execution system

tests/prompts/
├── modern.test.ts    # Prompt system tests (21 tests)
└── tasks.test.ts     # Task execution tests (22 tests)
```

### Type Definitions

```typescript
// Project setup configuration
interface ProjectSetupConfig {
  projectName: string
  codeType: 'claude-code' | 'codex'
  language: SupportedLang
  aiOutputLanguage: string
  features: string[]
}

// API configuration
interface ApiConfigOptions {
  type: 'auth_token' | 'api_key' | 'ccr_proxy' | 'skip'
  authToken?: string
  apiKey?: string
  ccrProxy?: { host: string, port: number }
  provider?: string
}

// Task options
interface TaskOptions {
  title: string
  task: () => Promise<void>
  enabled?: boolean
}

// Task group
interface TaskGroup {
  title: string
  tasks: TaskOptions[]
}
```

## Internationalization

### Translation Keys

All prompts support i18n through the following namespaces:

- **cli**: CLI interface messages
- **api**: API configuration messages
- **errors**: Error messages
- **language**: Language selection messages
- **common**: Common terms

### Adding Translations

1. Add keys to `src/i18n/locales/en/*.json`
2. Add corresponding translations to `src/i18n/locales/zh-CN/*.json`
3. Use `i18n.t('namespace:key')` in code

Example:

```typescript
// In code
const message = i18n.t('cli:setupWizard')

// In en/cli.json
{
  "setupWizard": "CCJK Setup Wizard"
}

// In zh-CN/cli.json
{
  "setupWizard": "CCJK 设置向导"
}
```

## Testing

### Test Coverage

- **43 tests total** (100% passing)
- **21 tests** for modern.ts (prompt functions)
- **22 tests** for tasks.ts (task execution)

### Running Tests

```bash
# Run all prompt tests
pnpm test tests/prompts/

# Run with coverage
pnpm test:coverage tests/prompts/

# Run in watch mode
pnpm test:watch tests/prompts/
```

### Test Structure

```typescript
describe('Modern Prompt System', () => {
  describe('Basic Prompts', () => {
    it('should initialize prompts with intro', async () => {
      // Test implementation
    })
  })

  describe('Project Setup Wizard', () => {
    it('should run project setup wizard', async () => {
      // Test implementation
    })
  })
})
```

## Migration Guide

### From Inquirer to Clack

**Before (Inquirer):**

```typescript
import inquirer from 'inquirer'

const { name } = await inquirer.prompt({
  type: 'input',
  name: 'name',
  message: 'Enter name:',
})
```

**After (Clack):**

```typescript
import { promptText } from './prompts'

const name = await promptText({
  message: 'Enter name:',
})
```

### Benefits of Migration

1. **Better UX**: More modern, beautiful interface
2. **Better DX**: Simpler API, better TypeScript support
3. **Better Performance**: Lighter weight, faster rendering
4. **Better Maintenance**: Active development, modern codebase

## Best Practices

### 1. Always Initialize

```typescript
initPrompts('Your App Name')
// ... your prompts
outroPrompts('✓ Complete!')
```

### 2. Use Validation

```typescript
const value = await promptText({
  message: 'Enter value',
  validate: (v) => {
    if (!v) return 'Required'
    if (v.length < 3) return 'Too short'
  },
})
```

### 3. Handle Cancellation

```typescript
import { isCancel, handleCancel } from './prompts'

const value = await promptText({ message: 'Enter value' })

if (isCancel(value)) {
  handleCancel() // Shows cancel message and exits
}
```

### 4. Group Related Tasks

```typescript
await executeTaskGroups([
  {
    title: 'Phase 1',
    tasks: [/* ... */],
  },
  {
    title: 'Phase 2',
    tasks: [/* ... */],
  },
])
```

### 5. Show Progress

```typescript
await executeTask('Long operation', async () => {
  // Your code
}, {
  showDuration: true,
})
```

## Troubleshooting

### Issue: Prompts not showing colors

**Solution**: Ensure terminal supports colors. Clack automatically detects support.

### Issue: Tests failing with import errors

**Solution**: Use correct relative paths in tests:

```typescript
// Correct
import { promptText } from '../../src/prompts/modern'

// Incorrect
import { promptText } from './modern'
```

### Issue: i18n keys not found

**Solution**: Ensure `ensureI18nInitialized()` is called before using prompts.

## Future Enhancements

- [ ] Add more prompt types (date picker, autocomplete)
- [ ] Add theme customization
- [ ] Add prompt history/replay
- [ ] Add prompt recording for testing
- [ ] Add more progress bar styles

## Contributing

When adding new prompts:

1. Add function to `src/prompts/modern.ts`
2. Add types to `src/prompts/types.ts`
3. Add translations to i18n files
4. Add tests to `tests/prompts/modern.test.ts`
5. Update this README

## License

MIT

## Credits

- Built with [@clack/prompts](https://github.com/natemoo-re/clack)
- Colors by [picocolors](https://github.com/alexeyraspopov/picocolors)
- Inspired by modern CLI tools like [create-t3-app](https://create.t3.gg/)
