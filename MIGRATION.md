# Migration Guide

This guide helps you migrate from the old code tool implementations to the new unified abstraction layer.

## Overview

The new abstraction layer provides:
- Unified interface for all tools
- Reduced code duplication (~500 lines eliminated)
- Easier maintenance and testing
- Consistent configuration management
- Simple addition of new tools

## Breaking Changes

### 1. Import Paths

**Before:**
```typescript
import { ClaudeCode } from './utils/code-tools/claude-code';
import { Aider } from './utils/code-tools/aider';
import { Cursor } from './utils/code-tools/cursor';
```

**After:**
```typescript
import { createTool } from 'ccjk';
// or
import { ClaudeCodeTool, AiderTool, CursorTool } from 'ccjk';
```

### 2. Tool Instantiation

**Before:**
```typescript
const claude = new ClaudeCode();
const aider = new Aider();
```

**After:**
```typescript
// Recommended: Use factory
const claude = createTool('claude-code');
const aider = createTool('aider');

// Alternative: Direct instantiation
const claude = new ClaudeCodeTool();
const aider = new AiderTool();
```

### 3. Configuration

**Before:**
```typescript
// Each tool had different config methods
await claude.setApiKey('key');
await claude.setModel('claude-opus-4');

await aider.configure({ token: 'key' });
await aider.setModel('gpt-4');
```

**After:**
```typescript
// Unified configuration interface
await claude.configure({
  name: 'claude-code',
  apiKey: 'key',
  model: 'claude-opus-4',
});

await aider.configure({
  name: 'aider',
  apiKey: 'key',
  model: 'gpt-4',
});

// Or update specific fields
await claude.updateConfig({ apiKey: 'new-key' });
```

### 4. Installation Checks

**Before:**
```typescript
// Different methods for each tool
const claudeInstalled = await claude.checkInstalled();
const aiderInstalled = await aider.isInstalled();
const cursorInstalled = await cursor.installed();
```

**After:**
```typescript
// Unified interface
const claudeStatus = await claude.isInstalled();
const aiderStatus = await aider.isInstalled();
const cursorStatus = await cursor.isInstalled();

// All return InstallStatus object
console.log(claudeStatus.installed); // boolean
console.log(claudeStatus.version);   // string | undefined
console.log(claudeStatus.path);      // string | undefined
```

### 5. Command Execution

**Before:**
```typescript
// Different execution patterns
await claude.chat('prompt');
await aider.message('prompt');
await cursor.ask('prompt');
```

**After:**
```typescript
// Unified execute method
await claude.execute('chat', ['prompt']);
await aider.execute('message', ['prompt']);
await cursor.execute('ask', ['prompt']);

// Or use specialized interfaces
import { IChatTool } from 'ccjk';
const chatTool = claude as IChatTool;
await chatTool.chat('prompt');
```

## Step-by-Step Migration

### Step 1: Update Dependencies

```bash
npm install ccjk
```

### Step 2: Update Imports

Replace old imports:
```typescript
// Old
import { ClaudeCode } from './utils/code-tools/claude-code';
import { Aider } from './utils/code-tools/aider';
```

With new imports:
```typescript
// New
import { createTool } from 'ccjk';
```

### Step 3: Update Tool Creation

Replace direct instantiation:
```typescript
// Old
const claude = new ClaudeCode();
```

With factory pattern:
```typescript
// New
const claude = createTool('claude-code');
```

### Step 4: Update Configuration Calls

Replace custom config methods:
```typescript
// Old
await claude.setApiKey('key');
await claude.setModel('model');
```

With unified config:
```typescript
// New
await claude.configure({
  name: 'claude-code',
  apiKey: 'key',
  model: 'model',
});
```

### Step 5: Update Method Calls

Replace tool-specific methods with unified interface:
```typescript
// Old
const installed = await claude.checkInstalled();
const version = await claude.getToolVersion();

// New
const status = await claude.isInstalled();
const version = await claude.getVersion();
```

### Step 6: Test Your Changes

Run your test suite to ensure everything works:
```bash
npm test
```

## Migration Examples

### Example 1: Simple Tool Usage

**Before:**
```typescript
import { ClaudeCode } from './utils/code-tools/claude-code';

async function useClaude() {
  const claude = new ClaudeCode();

  if (await claude.checkInstalled()) {
    await claude.setApiKey(process.env.CLAUDE_API_KEY);
    const result = await claude.chat('Hello');
    console.log(result);
  }
}
```

**After:**
```typescript
import { createTool } from 'ccjk';
import { IChatTool } from 'ccjk';

async function useClaude() {
  const claude = createTool('claude-code') as IChatTool;

  const status = await claude.isInstalled();
  if (status.installed) {
    await claude.updateConfig({
      apiKey: process.env.CLAUDE_API_KEY
    });
    const result = await claude.chat('Hello');
    console.log(result.output);
  }
}
```

### Example 2: Multiple Tools

**Before:**
```typescript
import { ClaudeCode } from './utils/code-tools/claude-code';
import { Aider } from './utils/code-tools/aider';
import { Cursor } from './utils/code-tools/cursor';

async function checkTools() {
  const claude = new ClaudeCode();
  const aider = new Aider();
  const cursor = new Cursor();

  const claudeOk = await claude.checkInstalled();
  const aiderOk = await aider.isInstalled();
  const cursorOk = await cursor.installed();

  return { claudeOk, aiderOk, cursorOk };
}
```

**After:**
```typescript
import { createTool } from 'ccjk';

async function checkTools() {
  const tools = ['claude-code', 'aider', 'cursor'].map(createTool);

  const results = await Promise.all(
    tools.map(async tool => ({
      name: tool.getMetadata().name,
      installed: (await tool.isInstalled()).installed,
    }))
  );

  return results;
}
```

### Example 3: Configuration Management

**Before:**
```typescript
import { ClaudeCode } from './utils/code-tools/claude-code';

async function configureClaude() {
  const claude = new ClaudeCode();

  await claude.setApiKey('key');
  await claude.setModel('claude-opus-4');
  await claude.setTemperature(0.7);
  await claude.setMaxTokens(4096);

  const config = await claude.getConfig();
  return config;
}
```

**After:**
```typescript
import { createTool } from 'ccjk';

async function configureClaude() {
  const claude = createTool('claude-code');

  await claude.configure({
    name: 'claude-code',
    apiKey: 'key',
    model: 'claude-opus-4',
    settings: {
      temperature: 0.7,
      maxTokens: 4096,
    },
  });

  const config = await claude.getConfig();
  return config;
}
```

### Example 4: Tool Selection

**Before:**
```typescript
import { ClaudeCode } from './utils/code-tools/claude-code';
import { Aider } from './utils/code-tools/aider';
import { Cursor } from './utils/code-tools/cursor';

async function selectBestTool() {
  const claude = new ClaudeCode();
  if (await claude.checkInstalled()) return claude;

  const aider = new Aider();
  if (await aider.isInstalled()) return aider;

  const cursor = new Cursor();
  if (await cursor.installed()) return cursor;

  throw new Error('No tools available');
}
```

**After:**
```typescript
import { createTool } from 'ccjk';

async function selectBestTool() {
  const toolNames = ['claude-code', 'aider', 'cursor'];

  for (const name of toolNames) {
    const tool = createTool(name);
    const status = await tool.isInstalled();
    if (status.installed) {
      return tool;
    }
  }

  throw new Error('No tools available');
}
```

## Deprecation Warnings

If you need to maintain backward compatibility temporarily, you can add deprecation warnings:

```typescript
// Old API wrapper (deprecated)
export class ClaudeCode {
  private tool: ICodeTool;

  constructor() {
    console.warn('ClaudeCode is deprecated. Use createTool("claude-code") instead.');
    this.tool = createTool('claude-code');
  }

  async checkInstalled(): Promise<boolean> {
    console.warn('checkInstalled() is deprecated. Use isInstalled() instead.');
    const status = await this.tool.isInstalled();
    return status.installed;
  }

  // ... other deprecated methods
}
```

## Common Issues

### Issue 1: Type Errors

**Problem:**
```typescript
const tool = createTool('claude-code');
await tool.chat('prompt'); // Error: chat doesn't exist on ICodeTool
```

**Solution:**
```typescript
import { IChatTool } from 'ccjk';
const tool = createTool('claude-code') as IChatTool;
await tool.chat('prompt'); // OK
```

### Issue 2: Configuration Not Persisting

**Problem:**
Configuration changes don't persist between runs.

**Solution:**
Use `configure()` or `updateConfig()` which automatically save to disk:
```typescript
await tool.updateConfig({ apiKey: 'key' }); // Saves to ~/.ccjk/tools/
```

### Issue 3: Tool Not Found

**Problem:**
```typescript
const tool = createTool('my-tool'); // Error: Tool 'my-tool' not found
```

**Solution:**
Check available tools:
```typescript
import { getRegistry } from 'ccjk';
const registry = getRegistry();
console.log(registry.getToolNames()); // ['claude-code', 'codex', 'aider', ...]
```

## Testing Your Migration

### Unit Tests

Update your unit tests to use the new interface:

```typescript
// Old
describe('ClaudeCode', () => {
  it('should check installation', async () => {
    const claude = new ClaudeCode();
    const installed = await claude.checkInstalled();
    expect(typeof installed).toBe('boolean');
  });
});

// New
describe('ClaudeCodeTool', () => {
  it('should check installation', async () => {
    const claude = createTool('claude-code');
    const status = await claude.isInstalled();
    expect(status).toHaveProperty('installed');
    expect(typeof status.installed).toBe('boolean');
  });
});
```

### Integration Tests

Test that all tools work together:

```typescript
import { createTool, getRegistry } from 'ccjk';

describe('Tool Integration', () => {
  it('should work with all tools', async () => {
    const registry = getRegistry();
    const toolNames = registry.getToolNames();

    for (const name of toolNames) {
      const tool = createTool(name);
      expect(tool).toBeDefined();
      expect(tool.getMetadata().name).toBe(name);
    }
  });
});
```

## Rollback Plan

If you need to rollback:

1. Keep old code in a separate branch
2. Use feature flags to toggle between old and new implementations
3. Maintain backward compatibility wrappers

```typescript
// Feature flag approach
const USE_NEW_TOOLS = process.env.USE_NEW_TOOLS === 'true';

function getTool(name: string) {
  if (USE_NEW_TOOLS) {
    return createTool(name);
  } else {
    // Old implementation
    return new OldToolClass();
  }
}
```

## Support

If you encounter issues during migration:

1. Check the [README](./README.md) for usage examples
2. Review the [API documentation](#api-reference)
3. Open an issue on GitHub with:
   - Your current code
   - Expected behavior
   - Actual behavior
   - Error messages

## Timeline

Recommended migration timeline:

- **Week 1**: Update dependencies and imports
- **Week 2**: Migrate tool instantiation and configuration
- **Week 3**: Update method calls and test
- **Week 4**: Remove old code and deprecation warnings

## Checklist

- [ ] Install new package (`npm install ccjk`)
- [ ] Update imports
- [ ] Replace tool instantiation with factory pattern
- [ ] Update configuration calls
- [ ] Update method calls to use unified interface
- [ ] Run tests
- [ ] Update documentation
- [ ] Remove old code
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Deploy to production

## Benefits After Migration

- **Less Code**: ~500 lines eliminated
- **Consistency**: Same API for all tools
- **Maintainability**: Single place to update common functionality
- **Extensibility**: Add new tools in < 5 minutes
- **Type Safety**: Full TypeScript support
- **Testing**: Easier to test with unified interface
