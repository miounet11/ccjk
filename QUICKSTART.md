# Quick Start Guide

Get started with the Code Tools Abstraction Layer in 5 minutes.

## Installation

```bash
npm install ccjk
```

## Basic Usage

### 1. Create a Tool

```typescript
import { createTool } from 'ccjk';

const claude = createTool('claude-code');
```

### 2. Check Installation

```typescript
const status = await claude.isInstalled();
console.log(status.installed); // true or false
```

### 3. Configure the Tool

```typescript
await claude.configure({
  name: 'claude-code',
  apiKey: process.env.CLAUDE_API_KEY,
  model: 'claude-opus-4',
});
```

### 4. Use the Tool

```typescript
import { IChatTool } from 'ccjk';

const chatTool = claude as IChatTool;
const response = await chatTool.chat('Hello, Claude!');
console.log(response.output);
```

## Available Tools

- `claude-code` - Claude Code CLI
- `codex` - OpenAI Codex
- `aider` - Aider AI pair programmer
- `continue` - Continue autopilot
- `cline` - Cline coding agent
- `cursor` - Cursor AI editor

## Common Patterns

### Check Multiple Tools

```typescript
import { getRegistry } from 'ccjk';

const registry = getRegistry();
const toolNames = registry.getToolNames();

for (const name of toolNames) {
  const tool = createTool(name);
  const status = await tool.isInstalled();
  console.log(`${name}: ${status.installed ? '✅' : '❌'}`);
}
```

### Select Best Available Tool

```typescript
const preferredTools = ['claude-code', 'cursor', 'aider'];

for (const name of preferredTools) {
  const tool = createTool(name);
  const status = await tool.isInstalled();
  if (status.installed) {
    console.log(`Using: ${tool.getMetadata().displayName}`);
    break;
  }
}
```

### Update Configuration

```typescript
await claude.updateConfig({
  model: 'claude-sonnet-3.5',
  settings: {
    temperature: 0.7,
  },
});
```

## Next Steps

- Read the [full documentation](./README.md)
- Check out [usage examples](../examples/usage.ts)
- Learn about [architecture](./ARCHITECTURE.md)
- See [migration guide](./MIGRATION.md) if migrating from old code

## CLI Tool

Use the CLI for quick operations:

```bash
# List all tools
npx ccjk list

# Check installation
npx ccjk check claude-code

# Show tool info
npx ccjk info aider

# Install a tool
npx ccjk install cursor
```

## Need Help?

- Check the [README](./README.md)
- Read the [API documentation](./README.md#api-reference)
- Open an issue on GitHub
