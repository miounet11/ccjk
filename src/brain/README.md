# 🧠 Brain System - Zero-Config Intelligent Routing

## Overview

The Brain System provides **zero-configuration automatic execution** for CCJK CLI. Users simply type what they want - the system automatically handles everything.

**No manual commands. No configuration. Just input and results.**

## Philosophy

> "用户希望的是输入和结果，而不是关注过程。过程完全可以不参与。"

Users want:
- **Input**: Type what they want
- **Result**: Get it done

Users don't want:
- Manual command selection (`/ccjk:feat`, `/ccjk:mayor`)
- Manual skill creation
- Manual agent spawning
- Manual MCP tool selection
- Manual routing decisions

The Brain system handles all of this automatically.

## Features

### 🎯 Automatic Intent Detection
- Analyzes user input to understand what they want
- Detects complexity level (simple, moderate, complex, architectural)
- Identifies intent type (feature, refactor, bug-fix, architecture, deployment, etc.)

### 🤖 Automatic Resource Creation
- **Skills**: Automatically creates skills when needed
- **Agents**: Automatically spawns agents when needed
- **MCP Tools**: Automatically selects appropriate MCP tools

### 🚦 Automatic Routing
- **Mayor Route**: Complex multi-agent orchestration
- **Plan Route**: Architectural planning and design
- **Feature Route**: Single feature implementation
- **Direct Route**: Simple execution

### 📦 Convoy System
- Automatic task packaging and tracking
- Persistent state across sessions
- Git-backed storage for reliability

### 💬 Messaging System
- Agent-to-agent communication
- Persistent mailboxes
- Automatic message routing

### 🔄 State Management
- Git-backed persistent state
- Automatic state synchronization
- Isolated worktrees for safety

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

## Quick Start

### For Users

Just use CCJK CLI normally. The Brain system is automatically enabled.

```bash
# Complex feature
ccjk
> Implement user authentication with JWT

# Architecture design
ccjk
> Design a microservices architecture for e-commerce

# Deployment
ccjk
> Setup CI/CD pipeline with GitHub Actions

# Simple question (automatically bypassed to Claude Code)
ccjk
> What is React?
```

### For Developers

The Brain system is automatically initialized during CLI startup. No integration needed.

If you want to use it programmatically:

```typescript
import { processUserInput } from './brain/router'

const result = await processUserInput('Implement user authentication')

if (result.handled) {
  console.log('Brain system handled it')
  console.log(`Route: ${result.result.route}`)
  console.log(`Agents: ${result.result.agentsCreated.join(', ')}`)
} else {
  // Pass to Claude Code
  await executeClaudeCode(userInput)
}
```

## Components

### Core Components

- **Intent Router** (`src/brain/router/intent-router.ts`)
  - Analyzes user input
  - Determines complexity and intent
  - Routes to appropriate execution path

- **Auto Executor** (`src/brain/router/auto-executor.ts`)
  - Automatically creates skills
  - Automatically spawns agents
  - Automatically selects MCP tools
  - Executes the task

- **CLI Interceptor** (`src/brain/router/cli-interceptor.ts`)
  - Intercepts all user input
  - Decides what to handle vs. bypass
  - Routes to Auto Executor

- **CLI Hook** (`src/brain/integration/cli-hook.ts`)
  - Integrates with existing CLI
  - Seamless integration
  - Fallback to Claude Code

### Supporting Systems

- **Convoy Manager** (`src/brain/convoy/convoy-manager.ts`)
  - Task packaging and tracking
  - Persistent state management

- **Messaging System** (`src/brain/messaging/persistent-mailbox.ts`)
  - Agent-to-agent communication
  - Persistent mailboxes

- **State Management** (`src/brain/persistence/git-backed-state.ts`)
  - Git-backed persistent state
  - Automatic synchronization

- **Mayor Agent** (`src/brain/agents/mayor-agent.ts`)
  - Complex task orchestration
  - Multi-agent coordination

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

## What Gets Intercepted?

### ✅ Intercepted (Automatic Handling)

- Complex tasks: "Implement user authentication with JWT"
- Multi-step features: "Add a dashboard with charts and user management"
- Architecture requests: "Design a microservices architecture"
- Integration tasks: "Integrate Stripe payment processing"
- Deployment tasks: "Setup CI/CD pipeline with GitHub Actions"

### ⏭️ Bypassed (Pass to Claude Code)

- System commands: `/help`, `/clear`, `/exit`
- Simple questions: "What is React?", "How do I use useState?"
- Short queries: "Show me the code"
- Informational requests: "Explain this function"

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

### Custom Bypass Keywords

```typescript
import { getGlobalCliInterceptor } from './brain/router/cli-interceptor'

const interceptor = getGlobalCliInterceptor({
  bypassKeywords: ['debug', 'test', 'manual'],
})
```

## Examples

See `src/brain/examples/` for complete examples:

- `zero-config-demo.ts` - Zero-config usage demo
- `integration-example.ts` - CLI integration example
- `advanced-usage.ts` - Advanced configuration

## Documentation

- **Quick Start**: `src/brain/QUICK_START.md`
- **Integration Guide**: `src/brain/integration/README.md`
- **Architecture**: `src/brain/ARCHITECTURE.md`
- **API Reference**: `src/brain/API.md`

## Testing

```bash
# Run tests
npm test src/brain

# Run demo
npm run brain:demo

# Run integration test
npm run brain:integration-test
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

## Roadmap

- [ ] Machine learning-based intent detection
- [ ] User preference learning
- [ ] Multi-language support
- [ ] Cloud-based state synchronization
- [ ] Advanced agent coordination patterns
- [ ] Integration with more MCP servers

## Contributing

See `CONTRIBUTING.md` for guidelines.

## License

Same as CCJK project.

## Support

For issues or questions:
- Check the examples in `src/brain/examples/`
- Read the documentation in `src/brain/`
- Open an issue on GitHub

---

**Zero configuration. Zero manual intervention. Just works.**
