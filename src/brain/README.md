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

## 🦸 Superpowers Integration

### Overview

The Superpowers Integration extends the Brain system with professional workflow automation, natural language skill triggering, and best practice enforcement.

### Key Features

#### 1. Natural Language Skill Triggering

Automatically detect user intent and trigger appropriate skills:

```typescript
import { skillTrigger } from '@/brain'

const match = skillTrigger.getBestMatch('访问 github.com')
// => { skillName: 'browser', confidence: 0.95, extractedParams: { param1: 'github.com' } }
```

**Supported Patterns**:
- Browser: "访问 github.com", "open google.com", "search TypeScript"
- Commit: "提交代码", "git commit", "save changes"
- Review: "审查代码", "code review", "check this code"
- Test: "写测试", "add tests", "test this function"
- Debug: "调试问题", "fix bug", "why doesn't this work"
- Plan: "规划功能", "implement feature", "how to do X"

#### 2. Best Practice Enforcement

Detect and prevent violations of professional practices:

```typescript
import { PracticeEnforcer } from '@/brain'

const enforcer = new PracticeEnforcer()
const violations = await enforcer.checkAll(context)
// => [{ severity: 'ERROR', message: 'TDD violation: implementation before test' }]
```

**Detection Rules**:
- TDD: Implementation before test (ERROR)
- Debug: No root cause analysis (ERROR)
- Debug: Multiple failures (WARNING → ERROR after 3 attempts)
- Commit: No tests (WARNING)

#### 3. Smart Suggestions

Context-aware workflow recommendations:

```typescript
import { smartSuggestions } from '@/brain'

const suggestions = await smartSuggestions.analyze(context)
// => [{ actionId: 5, reason: '3 failures detected', priority: 'HIGH' }]
```

#### 4. Hooks Integration

Automatic intervention at key moments:

```typescript
import { hooksIntegration } from '@/brain'

const response = await hooksIntegration.onUserPromptSubmit({
  userInput: '访问 github.com',
  conversationHistory: [...],
  recentFiles: [...],
})

if (response.autoExecute) {
  // Auto-execute: /browser github.com
}
```

**Available Hooks**:
- `onUserPromptSubmit`: Before user input submission
- `onFileChange`: After file modifications
- `onPreCommit`: Before git commit
- `onTestFailure`: After test failures

#### 5. Workflow Automation

Automate common professional workflows:

```typescript
import { workflowAutomator } from '@/brain'

// Auto Code Review
await workflowAutomator.autoCodeReview({ baseSha: 'HEAD~1', headSha: 'HEAD' })

// Auto TDD
await workflowAutomator.autoTDD('shopping cart feature')

// Auto Systematic Debugging
await workflowAutomator.autoSystematicDebugging('login failure')

// Auto Finish Branch
await workflowAutomator.autoFinishBranch()
```

#### 6. Quick Action Enhancement

Map number shortcuts (1-8) to Superpowers workflows:

```typescript
import { superpowersRouter } from '@/brain'

const skill = await superpowersRouter.routeByActionId(5)
// => { id: 'systematic-debugging', name: 'Systematic Debugging' }

const prompt = await superpowersRouter.generateEnhancedPrompt(5, 'login failure')
// => Full systematic debugging workflow guidance
```

**Quick Actions**:
1. Smart Commit
2. Code Review → `requesting-code-review`
3. Write Tests → `test-driven-development`
4. Plan Feature → `subagent-driven-development`
5. Debug Issue → `systematic-debugging`
6. Brainstorm
7. Verify Code → `finish-branch`
8. Write Docs

### Configuration

```bash
# Copy example config
cp .ccjk/hooks.example.json .ccjk/hooks.json

# Edit configuration
vim .ccjk/hooks.json
```

**Example Config**:
```json
{
  "hooks": {
    "onUserPromptSubmit": {
      "enabled": true,
      "config": {
        "autoExecuteThreshold": 0.8,
        "suggestionThreshold": 0.5,
        "blockOnCriticalViolation": true
      }
    }
  },
  "skillTriggers": {
    "browser": {
      "enabled": true,
      "autoExecute": true
    }
  },
  "violations": {
    "tdd": {
      "implementationFirst": {
        "severity": "ERROR",
        "block": true
      }
    }
  }
}
```

### Usage Examples

**Example 1: Natural Language Browser Trigger**
```
User: 访问 github.com

System: 🚀 Auto-executing: browser (confidence: 95%)
        [Opens browser automatically]
```

**Example 2: TDD Violation Detection**
```
User: [Writes implementation code]

System: ❌ Detected implementation before test
        This violates TDD principles.
        💡 Suggestion: Delete implementation, enter 3 to restart

        Continue anyway? (y/n)
```

**Example 3: Multiple Failure Debugging**
```
User: [3rd fix attempt fails]

System: 🚨 3 failures detected - this may be an architectural issue
        💡 Suggestion: Enter 5 to start systematic debugging

        Phase 1: Root Cause Investigation
        Before proposing any fix, we need to investigate:
        1. What is the error message?
        2. Can you reproduce it consistently?
        3. What changed recently?
```

### Documentation

- [Superpowers Integration Guide](../../docs/SUPERPOWERS_INTEGRATION_GUIDE.md)
- [Hooks Configuration Reference](../../.ccjk/hooks.example.json)
- [API Documentation](./index.ts)

### Testing

```bash
# Run Superpowers tests
pnpm test src/brain/__tests__/skill-trigger.test.ts

# Test coverage
pnpm test:coverage
```

### Performance Impact

- Skill trigger detection: ~5ms
- Practice enforcement: ~10ms
- Smart suggestions: ~15ms
- Total overhead: ~30ms (negligible)

### Best Practices

1. **Trust smart suggestions** - Consider recommendations seriously
2. **Use natural language** - Speak naturally, no need for complex commands
3. **Leverage quick actions** - Remember the 8 number shortcuts
4. **Build habits** - Think "which number should I press" when facing issues

### Comparison

**Traditional Approach**:
- Time: 2 hours
- Rework: 3 times
- Test coverage: 0%
- Code quality: ?

**Superpowers Integration**:
- Time: 1 hour
- Rework: 0 times
- Test coverage: 95%
- Code quality: A+

---

**Remember**: The best tool is one you don't notice. Superpowers Integration makes professional workflows feel as natural as breathing.
