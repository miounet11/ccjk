# Brain System CLI Integration

## Overview

This integration provides **zero-config automatic execution** for CCJK CLI.

Users simply type what they want - the system automatically:
- Detects intent
- Creates skills if needed
- Spawns agents if needed
- Selects MCP tools if needed
- Routes to appropriate execution path (mayor/plan/feature/direct)

**No manual commands needed. No configuration needed.**

## Quick Integration

### Step 1: Import the Hook

In your main CLI entry point (e.g., `src/cli.ts` or `src/index.ts`):

```typescript
import { setupBrainHook, processCliInput } from './brain/integration/cli-hook'
```

### Step 2: Initialize During Startup

```typescript
// During CLI initialization
async function initializeCli() {
  // ... existing initialization code ...

  // Setup brain hook
  await setupBrainHook({
    enabled: true,
    silent: false, // Show what's happening
    fallbackToClaudeCode: true, // Fallback on errors
  })

  console.log('CLI ready!')
}
```

### Step 3: Intercept User Input

```typescript
// In your input handler
async function handleUserInput(userInput: string) {
  // Process through brain hook
  const result = await processCliInput(userInput)

  if (result.shouldContinue) {
    // Brain system didn't handle it - pass to Claude Code
    await executeClaudeCode(userInput)
  }
  // Otherwise, brain system already handled it
}
```

## Complete Example

```typescript
import { setupBrainHook, processCliInput } from './brain/integration/cli-hook'

// Main CLI entry point
async function main() {
  // Initialize brain system
  await setupBrainHook()

  // Start CLI loop
  while (true) {
    const userInput = await getUserInput()

    // Process through brain hook
    const result = await processCliInput(userInput)

    if (result.handled) {
      // Brain system handled it
      console.log('✓ Completed by brain system')

      if (result.executionResult) {
        // Access execution details
        console.log(`Route: ${result.executionResult.route}`)
        console.log(`Convoy: ${result.executionResult.convoyId}`)
        console.log(`Agents: ${result.executionResult.agentsCreated.join(', ')}`)
      }
    } else if (result.shouldContinue) {
      // Pass to normal Claude Code
      await executeClaudeCode(userInput)
    }
  }
}

main().catch(console.error)
```

## What Gets Intercepted?

The brain system intercepts and handles:

### ✅ Intercepted (Automatic Handling)

- **Complex tasks**: "Implement user authentication with JWT"
- **Multi-step features**: "Add a dashboard with charts and user management"
- **Architecture requests**: "Design a microservices architecture"
- **Integration tasks**: "Integrate Stripe payment processing"
- **Deployment tasks**: "Setup CI/CD pipeline with GitHub Actions"

### ⏭️ Bypassed (Pass to Claude Code)

- **System commands**: `/help`, `/clear`, `/exit`
- **Simple questions**: "What is React?", "How do I use useState?"
- **Short queries**: "Show me the code"
- **Informational requests**: "Explain this function"

## User Experience

### Before (Manual)

```bash
User: I want to add authentication
Claude: Do you want to use /plan or /feat?
User: /ccjk:feat
Claude: Which agents do you need?
User: auth-specialist
Claude: Do you need MCP tools?
User: Yes, github and filesystem
...
```

### After (Automatic)

```bash
User: I want to add authentication

🧠 Analyzing your request...
   System will automatically handle: skills, agents, MCP tools

============================================================
🧠 Brain System Result
============================================================

👔 Route: MAYOR
📊 Complexity: complex
🎯 Intent: feature

🤖 Agents Created:
   ✓ agent-specialist-1738598400000

🎓 Skills Created:
   ✓ skill-authentication-specialist-1738598400000

🔧 MCP Tools Selected:
   ✓ github
   ✓ filesystem

📦 Convoy: convoy-1738598400000

💬 Message:
   Mayor Agent will orchestrate this complex task with 8 steps

============================================================

✓ Completed by brain system
```

## Configuration

### Enable/Disable

```typescript
import { getGlobalBrainHook } from './brain/integration/cli-hook'

const hook = getGlobalBrainHook()

// Disable
hook.disable()

// Enable
hook.enable()

// Check status
if (hook.isEnabled()) {
  console.log('Brain system active')
}
```

### Silent Mode

```typescript
await setupBrainHook({
  silent: true, // Don't show brain system messages
})
```

### Disable Fallback

```typescript
await setupBrainHook({
  fallbackToClaudeCode: false, // Throw errors instead of falling back
})
```

## Events

Listen to brain system events:

```typescript
import { getGlobalBrainHook } from './brain/integration/cli-hook'

const hook = getGlobalBrainHook()

// When brain system handles input
hook.on('hook:handled', ({ input, result }) => {
  console.log(`Brain handled: ${input}`)
  console.log(`Route: ${result.route}`)
})

// When input passes through to Claude Code
hook.on('hook:passthrough', ({ input, reason }) => {
  console.log(`Passing through: ${input}`)
  console.log(`Reason: ${reason}`)
})

// When errors occur
hook.on('hook:error', ({ error, input }) => {
  console.error(`Error processing: ${input}`, error)
})
```

## Advanced Usage

### Custom Bypass Keywords

```typescript
import { getGlobalCliInterceptor } from './brain/router/cli-interceptor'

const interceptor = getGlobalCliInterceptor({
  bypassKeywords: ['debug', 'test', 'manual'],
})

// Now these will bypass:
// "debug this function" -> passes to Claude Code
// "test the API" -> passes to Claude Code
```

### Adjust Complexity Thresholds

```typescript
import { getGlobalIntentRouter } from './brain/router/intent-router'

const router = getGlobalIntentRouter({
  mayorComplexityThreshold: 'moderate', // Lower threshold
  planComplexityThreshold: 'simple',
  autoRoute: true,
})
```

### Disable Auto-Creation

```typescript
import { getGlobalAutoExecutor } from './brain/router/auto-executor'

const executor = getGlobalAutoExecutor({
  autoCreateSkills: false, // Don't auto-create skills
  autoCreateAgents: false, // Don't auto-create agents
  autoSelectMcp: true, // Still auto-select MCP tools
})
```

## Architecture

```
User Input
    |
    v
[CLI Hook] ──────────────────────────────────────┐
    |                                            |
    v                                            |
[CLI Interceptor]                                |
    |                                            |
    v                                            |
[Intent Router] ─> Analyze complexity            |
    |              Detect intent type            |
    v                                            |
[Auto Executor] ─> Detect skill needs            |
    |              Detect agent needs            |
    |              Detect MCP needs              |
    v                                            |
    ├─> [Mayor Agent] ─> Complex multi-agent    |
    ├─> [Plan Mode] ───> Architectural planning |
    ├─> [Feature Mode] ─> Single feature impl  |
    └─> [Direct] ──────> Simple execution       |
                                                 |
                                                 v
                                        [Claude Code]
                                        (for bypassed input)
```

## Testing

```typescript
import { processCliInput, resetGlobalBrainHook } from './brain/integration/cli-hook'

describe('Brain CLI Integration', () => {
  beforeEach(() => {
    resetGlobalBrainHook()
  })

  it('should handle complex tasks', async () => {
    const result = await processCliInput('Implement user authentication')
    expect(result.handled).toBe(true)
    expect(result.executionResult?.route).toBe('mayor')
  })

  it('should bypass simple questions', async () => {
    const result = await processCliInput('What is React?')
    expect(result.shouldContinue).toBe(true)
  })
})
```

## Troubleshooting

### Brain system not intercepting

```typescript
import { getGlobalBrainHook } from './brain/integration/cli-hook'

const hook = getGlobalBrainHook()
console.log('Enabled:', hook.isEnabled())

// Re-enable if needed
hook.enable()
```

### Too many things being intercepted

```typescript
import { getGlobalCliInterceptor } from './brain/router/cli-interceptor'

const interceptor = getGlobalCliInterceptor({
  bypassKeywords: ['explain', 'show', 'tell'], // Add more bypass keywords
})
```

### Not enough things being intercepted

Adjust complexity thresholds:

```typescript
import { getGlobalIntentRouter } from './brain/router/intent-router'

const router = getGlobalIntentRouter({
  mayorComplexityThreshold: 'simple', // Lower threshold
})
```

## Migration Guide

### From Manual Commands

If you have existing code that uses manual commands:

```typescript
// Before
if (input.startsWith('/ccjk:feat')) {
  await executeFeature(input)
} else if (input.startsWith('/ccjk:mayor')) {
  await executeMayor(input)
}

// After
const result = await processCliInput(input)
if (result.shouldContinue) {
  // Fallback to existing logic
}
```

### Gradual Rollout

Enable for specific users:

```typescript
const enableBrainSystem = process.env.ENABLE_BRAIN === 'true'

await setupBrainHook({
  enabled: enableBrainSystem,
})
```

## Performance

- **Initialization**: ~100ms (one-time)
- **Intent analysis**: ~10ms per request
- **Skill creation**: ~50ms per skill
- **Agent creation**: ~50ms per agent
- **Total overhead**: ~20-200ms depending on complexity

## Security

- All state is stored in Git worktrees (isolated)
- No external API calls for intent detection
- Skills and agents are sandboxed
- MCP tools follow existing security policies

## Support

For issues or questions:
- Check the examples in `src/brain/examples/`
- Read the main documentation in `src/brain/README.md`
- Review the quick start guide in `src/brain/QUICK_START.md`
