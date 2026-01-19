# CCJK Hooks System

A powerful and flexible hooks system for the CCJK CLI tool that allows you to execute custom scripts at various stages of the code operation lifecycle.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Hook Types](#hook-types)
- [Hook Context](#hook-context)
- [CLI Commands](#cli-commands)
- [Creating Custom Hooks](#creating-custom-hooks)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

## Overview

The CCJK Hooks System enables you to:

- Execute custom scripts before and after API requests
- Log and monitor API usage
- Handle errors and provider switches
- Track session lifecycle
- Integrate with external tools and services
- Automate workflows based on CCJK events

## Features

- ✅ **Multiple Hook Types**: PreRequest, PostResponse, ProviderSwitch, Error, SessionStart, SessionEnd
- ✅ **Flexible Execution**: Synchronous and asynchronous hook execution
- ✅ **Rich Context**: Detailed context data passed to each hook
- ✅ **Timeout Control**: Configurable timeouts to prevent hanging
- ✅ **Easy Management**: Simple CLI commands for hook management
- ✅ **Cross-Platform**: Works on Windows, macOS, Linux, and Termux
- ✅ **Multiple Languages**: Support for Shell, Node.js, Python, and more
- ✅ **Persistent Configuration**: Hooks are saved and loaded automatically

## Installation

The hooks system is built into CCJK. No additional installation required.

### Initialize Hooks Directory

```bash
# Create hooks directory
mkdir -p ~/.ccjk/hooks

# Create logs directory for hook outputs
mkdir -p ~/.ccjk/logs
```

## Quick Start

### 1. Create Your First Hook

Create a simple logging hook:

```bash
cat > ~/.ccjk/hooks/log-request.js << 'EOF'
#!/usr/bin/env node
const context = JSON.parse(process.env.CCJK_HOOK_CONTEXT);
console.log(`Request to ${context.provider} using ${context.model}`);
EOF

chmod +x ~/.ccjk/hooks/log-request.js
```

### 2. Register the Hook

```bash
ccjk hooks add PreRequest "node ~/.ccjk/hooks/log-request.js"
```

### 3. List Your Hooks

```bash
ccjk hooks list
```

### 4. Test It

Run any CCJK command and your hook will execute before each API request.

## Hook Types

### PreRequest

Executed before sending an API request.

**Use Cases:**
- Log request details
- Validate request parameters
- Modify request metadata
- Track API usage

**Context Data:**
```typescript
{
  timestamp: number
  provider: string
  model: string
  messages?: Array<{role: string, content: string}>
  metadata?: Record<string, any>
}
```

### PostResponse

Executed after receiving an API response.

**Use Cases:**
- Log response details
- Save responses to files
- Calculate metrics
- Trigger notifications

**Context Data:**
```typescript
{
  timestamp: number
  provider: string
  model: string
  latency: number
  tokens?: {
    input: number
    output: number
    total: number
  }
  success: boolean
  response?: any
  error?: string
}
```

### ProviderSwitch

Executed when switching between API providers.

**Use Cases:**
- Log provider changes
- Update monitoring dashboards
- Notify team members
- Track failover events

**Context Data:**
```typescript
{
  timestamp: number
  fromProvider: string
  toProvider: string
  reason: string
  previousConfig?: any
  newConfig?: any
}
```

### Error

Executed when an error occurs.

**Use Cases:**
- Log errors
- Send error notifications
- Trigger alerts
- Track error patterns

**Context Data:**
```typescript
{
  timestamp: number
  error: string
  errorType: string
  provider?: string
  operation?: string
  retryCount?: number
  metadata?: Record<string, any>
}
```

### SessionStart

Executed when a new session starts.

**Use Cases:**
- Initialize session tracking
- Set up monitoring
- Log session start
- Prepare resources

**Context Data:**
```typescript
{
  timestamp: number
  sessionId: string
  provider?: string
  config?: any
}
```

### SessionEnd

Executed when a session ends.

**Use Cases:**
- Log session summary
- Calculate session metrics
- Clean up resources
- Generate reports

**Context Data:**
```typescript
{
  timestamp: number
  sessionId: string
  duration: number
  totalRequests?: number
  totalTokens?: number
  reason: 'normal' | 'error' | 'timeout'
}
```

## Hook Context

All hooks receive context data through the `CCJK_HOOK_CONTEXT` environment variable as JSON.

### Accessing Context in Your Hook

**Node.js:**
```javascript
const context = JSON.parse(process.env.CCJK_HOOK_CONTEXT);
console.log('Provider:', context.provider);
```

**Python:**
```python
import os
import json

context = json.loads(os.environ['CCJK_HOOK_CONTEXT'])
print(f"Provider: {context['provider']}")
```

**Shell:**
```bash
CONTEXT="$CCJK_HOOK_CONTEXT"
PROVIDER=$(echo "$CONTEXT" | jq -r '.provider')
echo "Provider: $PROVIDER"
```

## CLI Commands

### Add Hook

```bash
ccjk hooks add <type> <command> [options]
```

**Options:**
- `--timeout <ms>` - Set timeout in milliseconds (default: 5000, max: 60000)
- `--async` - Execute hook asynchronously without blocking
- `--description <text>` - Add description for documentation

**Examples:**
```bash
# Basic hook
ccjk hooks add PreRequest "node ~/.ccjk/hooks/log.js"

# With timeout
ccjk hooks add PreRequest "node ~/.ccjk/hooks/slow.js" --timeout 10000

# Async execution
ccjk hooks add PostResponse "node ~/.ccjk/hooks/save.js" --async

# With description
ccjk hooks add Error "node ~/.ccjk/hooks/notify.js" --description "Send error notifications"
```

### List Hooks

```bash
ccjk hooks list [options]
```

**Options:**
- `--verbose` - Show detailed information including timeout, async status, and descriptions

**Examples:**
```bash
# Basic list
ccjk hooks list

# Verbose list
ccjk hooks list --verbose
```

### Remove Hook

```bash
ccjk hooks remove <type> <command>
```

**Examples:**
```bash
ccjk hooks remove PreRequest "node ~/.ccjk/hooks/log.js"
```

### Clear Hooks

```bash
ccjk hooks clear [type]
```

**Examples:**
```bash
# Clear specific type
ccjk hooks clear PreRequest

# Clear all hooks
ccjk hooks clear
```

### Enable/Disable Hooks

```bash
# Enable all hooks
ccjk hooks enable

# Disable all hooks
ccjk hooks disable
```

## Creating Custom Hooks

### Node.js Hook Template

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get context from environment
const contextJson = process.env.CCJK_HOOK_CONTEXT;

if (!contextJson) {
  console.error('Error: CCJK_HOOK_CONTEXT not provided');
  process.exit(1);
}

try {
  const context = JSON.parse(contextJson);

  // Your hook logic here
  console.log('Hook executed:', context);

  // Exit with success
  process.exit(0);
} catch (error) {
  console.error('Hook error:', error.message);
  process.exit(1);
}
```

### Python Hook Template

```python
#!/usr/bin/env python3

import os
import sys
import json

# Get context from environment
context_json = os.environ.get('CCJK_HOOK_CONTEXT')

if not context_json:
    print('Error: CCJK_HOOK_CONTEXT not provided', file=sys.stderr)
    sys.exit(1)

try:
    context = json.loads(context_json)

    # Your hook logic here
    print(f"Hook executed: {context}")

    # Exit with success
    sys.exit(0)
except Exception as e:
    print(f"Hook error: {e}", file=sys.stderr)
    sys.exit(1)
```

### Shell Hook Template

```bash
#!/bin/bash

# Get context from environment
CONTEXT="$CCJK_HOOK_CONTEXT"

if [ -z "$CONTEXT" ]; then
  echo "Error: CCJK_HOOK_CONTEXT not provided" >&2
  exit 1
fi

# Parse JSON (requires jq)
PROVIDER=$(echo "$CONTEXT" | jq -r '.provider')
TIMESTAMP=$(echo "$CONTEXT" | jq -r '.timestamp')

# Your hook logic here
echo "Hook executed: Provider=$PROVIDER, Time=$TIMESTAMP"

# Exit with success
exit 0
```

## Best Practices

### 1. Keep Hooks Fast

Hooks should execute quickly to avoid blocking the main flow:

```javascript
// ❌ Bad: Slow synchronous operation
const result = await slowOperation(); // Takes 10 seconds

// ✅ Good: Use async flag for slow operations
// Register with: --async
```

### 2. Handle Errors Gracefully

Always catch and handle errors:

```javascript
try {
  // Hook logic
  processData(context);
  process.exit(0);
} catch (error) {
  console.error('Hook error:', error.message);
  process.exit(1); // Non-zero exit code indicates failure
}
```

### 3. Validate Input

Always validate context data:

```javascript
const context = JSON.parse(process.env.CCJK_HOOK_CONTEXT);

if (!context.provider || !context.model) {
  console.error('Invalid context: missing required fields');
  process.exit(1);
}
```

### 4. Use Appropriate Timeouts

Set timeouts based on hook complexity:

```bash
# Fast hook (default 5s is fine)
ccjk hooks add PreRequest "node ~/.ccjk/hooks/fast.js"

# Slow hook (increase timeout)
ccjk hooks add PostResponse "node ~/.ccjk/hooks/slow.js" --timeout 15000

# Very slow hook (use async)
ccjk hooks add PostResponse "node ~/.ccjk/hooks/very-slow.js" --async
```

### 5. Log to Files, Not Console

Avoid spamming console output:

```javascript
// ❌ Bad: Spam console
console.log('Processing...');
console.log('Step 1...');
console.log('Step 2...');

// ✅ Good: Log to file
const logFile = path.join(os.homedir(), '.ccjk', 'logs', 'hook.log');
fs.appendFileSync(logFile, `${new Date().toISOString()} - Hook executed\n`);
```

### 6. Use Absolute Paths

Always use absolute paths for file operations:

```javascript
// ❌ Bad: Relative path
const logFile = './logs/hook.log';

// ✅ Good: Absolute path
const logFile = path.join(os.homedir(), '.ccjk', 'logs', 'hook.log');
```

### 7. Test Hooks Independently

Test your hooks before registering them:

```bash
# Set test context
export CCJK_HOOK_CONTEXT='{"timestamp":1234567890,"provider":"anthropic","model":"claude-3-5-sonnet-20241022"}'

# Run hook
node ~/.ccjk/hooks/my-hook.js

# Check exit code
echo $?
```

## Examples

### Example 1: Request Logger

Log all API requests to a file:

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const context = JSON.parse(process.env.CCJK_HOOK_CONTEXT);
const logFile = path.join(process.env.HOME, '.ccjk', 'logs', 'requests.log');

const logEntry = {
  timestamp: new Date(context.timestamp).toISOString(),
  provider: context.provider,
  model: context.model,
};

fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
process.exit(0);
```

**Register:**
```bash
ccjk hooks add PreRequest "node ~/.ccjk/hooks/log-request.js"
```

### Example 2: Response Saver

Save API responses to individual files:

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const context = JSON.parse(process.env.CCJK_HOOK_CONTEXT);
const responseDir = path.join(process.env.HOME, '.ccjk', 'responses');

if (!fs.existsSync(responseDir)) {
  fs.mkdirSync(responseDir, { recursive: true });
}

const filename = `response-${context.timestamp}.json`;
const filepath = path.join(responseDir, filename);

fs.writeFileSync(filepath, JSON.stringify(context, null, 2));
process.exit(0);
```

**Register:**
```bash
ccjk hooks add PostResponse "node ~/.ccjk/hooks/save-response.js" --async
```

### Example 3: Error Notifier

Send notifications on errors:

```javascript
#!/usr/bin/env node
const { exec } = require('child_process');

const context = JSON.parse(process.env.CCJK_HOOK_CONTEXT);

// Send macOS notification
if (process.platform === 'darwin') {
  const message = `CCJK Error: ${context.error}`;
  exec(`osascript -e 'display notification "${message}" with title "CCJK"'`);
}

// Log error
console.error(`Error: ${context.error}`);
process.exit(0);
```

**Register:**
```bash
ccjk hooks add Error "node ~/.ccjk/hooks/notify-error.js"
```

### Example 4: Token Usage Tracker

Track token usage across sessions:

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const context = JSON.parse(process.env.CCJK_HOOK_CONTEXT);

if (!context.tokens) {
  process.exit(0);
}

const statsFile = path.join(process.env.HOME, '.ccjk', 'token-stats.json');

let stats = {};
if (fs.existsSync(statsFile)) {
  stats = JSON.parse(fs.readFileSync(statsFile, 'utf-8'));
}

const date = new Date().toISOString().split('T')[0];
if (!stats[date]) {
  stats[date] = { input: 0, output: 0, total: 0 };
}

stats[date].input += context.tokens.input || 0;
stats[date].output += context.tokens.output || 0;
stats[date].total += context.tokens.total || 0;

fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
process.exit(0);
```

**Register:**
```bash
ccjk hooks add PostResponse "node ~/.ccjk/hooks/track-tokens.js" --async
```

## API Reference

### HookManager

Main class for managing hooks.

```typescript
class HookManager {
  constructor(options?: HookManagerOptions)

  registerHook(hook: Hook): boolean
  unregisterHook(type: HookType, command: string): boolean
  executeHooks(type: HookType, context: HookContext): Promise<HookResult[]>

  getAllHooks(): Record<HookType, Hook[]>
  getHooksByType(type: HookType): Hook[]

  clearHooksByType(type: HookType): boolean
  clearAllHooks(): boolean

  setEnabled(enabled: boolean): void
  isEnabled(): boolean

  getConfigPath(): string
}
```

### HookExecutor

Class for executing individual hooks.

```typescript
class HookExecutor {
  execute(hook: Hook, context: HookContext): Promise<HookResult>
  executeAsync(hook: Hook, context: HookContext): void
}
```

### Types

```typescript
enum HookType {
  PreRequest = 'PreRequest',
  PostResponse = 'PostResponse',
  ProviderSwitch = 'ProviderSwitch',
  Error = 'Error',
  SessionStart = 'SessionStart',
  SessionEnd = 'SessionEnd',
}

interface Hook {
  type: HookType
  command: string
  timeout?: number
  enabled?: boolean
  async?: boolean
  description?: string
}

interface HookResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number
  executionTime: number
  error?: string
}
```

## Troubleshooting

### Hook Not Executing

**Problem:** Hook doesn't run when expected.

**Solutions:**
1. Check if hooks are enabled: `ccjk hooks list`
2. Verify hook command is correct
3. Ensure hook script has execute permissions: `chmod +x ~/.ccjk/hooks/my-hook.js`
4. Check logs for errors

### Hook Timing Out

**Problem:** Hook execution times out.

**Solutions:**
1. Increase timeout: `ccjk hooks add PreRequest "..." --timeout 10000`
2. Use async execution: `ccjk hooks add PreRequest "..." --async`
3. Optimize hook script performance
4. Remove slow operations from hook

### Context Not Available

**Problem:** `CCJK_HOOK_CONTEXT` is undefined or empty.

**Solutions:**
1. Ensure environment variable is being read correctly
2. Check JSON parsing in your hook script
3. Verify hook type matches expected context structure
4. Test with manual context: `export CCJK_HOOK_CONTEXT='{"timestamp":123,"provider":"test"}'`

### Permission Denied

**Problem:** Hook script can't be executed.

**Solutions:**
1. Make script executable: `chmod +x ~/.ccjk/hooks/my-hook.js`
2. Check file permissions: `ls -l ~/.ccjk/hooks/`
3. Verify script has correct shebang: `#!/usr/bin/env node`

### Hook Fails Silently

**Problem:** Hook fails but no error is shown.

**Solutions:**
1. Check hook exit code in script
2. Add error logging to hook
3. Test hook independently
4. Review hook output: `ccjk hooks list --verbose`

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../LICENSE) for details.

## Support

- **Issues**: https://github.com/your-repo/ccjk/issues
- **Discussions**: https://github.com/your-repo/ccjk/discussions
- **Documentation**: https://ccjk.dev/docs/hooks
