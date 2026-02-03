# 🧠 Brain System - Documentation Index

## Quick Links

- **[README](./README.md)** - Main documentation and overview
- **[QUICK_START](./QUICK_START.md)** - Get started in 5 minutes
- **[SUMMARY](./SUMMARY.md)** - Complete system summary
- **[Integration Guide](./integration/README.md)** - How to integrate with CLI

## Core Documentation

### Getting Started
1. [README.md](./README.md) - Overview, features, and quick start
2. [QUICK_START.md](./QUICK_START.md) - 5-minute quick start guide
3. [SUMMARY.md](./SUMMARY.md) - Complete system architecture and summary

### Integration
1. [integration/README.md](./integration/README.md) - CLI integration guide
2. [integration/cli-hook.ts](./integration/cli-hook.ts) - CLI hook implementation

### Core Components

#### Router System
- [router/index.ts](./router/index.ts) - Main entry point
- [router/intent-router.ts](./router/intent-router.ts) - Intent analysis and routing
- [router/auto-executor.ts](./router/auto-executor.ts) - Automatic resource creation
- [router/cli-interceptor.ts](./router/cli-interceptor.ts) - CLI input interception

#### Supporting Systems
- [convoy/convoy-manager.ts](./convoy/convoy-manager.ts) - Task packaging and tracking
- [messaging/persistent-mailbox.ts](./messaging/persistent-mailbox.ts) - Agent communication
- [persistence/git-backed-state.ts](./persistence/git-backed-state.ts) - State management
- [agents/mayor-agent.ts](./agents/mayor-agent.ts) - Complex task orchestration

### Examples
- [examples/zero-config-demo.ts](./examples/zero-config-demo.ts) - Zero-config usage demo
- [examples/integration-example.ts](./examples/integration-example.ts) - CLI integration example
- [examples/advanced-usage.ts](./examples/advanced-usage.ts) - Advanced configuration

## Documentation by Topic

### For Users
- **Getting Started**: [QUICK_START.md](./QUICK_START.md)
- **What It Does**: [README.md#features](./README.md#features)
- **User Experience**: [README.md#user-experience](./README.md#user-experience)
- **Examples**: [examples/](./examples/)

### For Developers
- **Architecture**: [SUMMARY.md#system-architecture](./SUMMARY.md#system-architecture)
- **Integration**: [integration/README.md](./integration/README.md)
- **API Reference**: Component source files
- **Testing**: [README.md#testing](./README.md#testing)

### For Contributors
- **File Structure**: [SUMMARY.md#file-structure](./SUMMARY.md#file-structure)
- **Core Components**: [SUMMARY.md#supporting-systems](./SUMMARY.md#supporting-systems)
- **Integration Points**: [SUMMARY.md#integration-points](./SUMMARY.md#integration-points)

## Key Concepts

### Zero-Config Philosophy
> "用户希望的是输入和结果，而不是关注过程。过程完全可以不参与。"

Users type what they want → System delivers results

No manual commands. No configuration. Just works.

### Automatic Everything
- ✅ Automatic intent detection
- ✅ Automatic skill creation
- ✅ Automatic agent spawning
- ✅ Automatic MCP tool selection
- ✅ Automatic routing

### Four Execution Routes
1. **Mayor** - Complex multi-agent orchestration
2. **Plan** - Architectural planning and design
3. **Feature** - Single feature implementation
4. **Direct** - Simple execution

## Quick Reference

### User Commands
```bash
# Just type what you want - no commands needed!
ccjk
> Implement user authentication with JWT
> Design a microservices architecture
> Setup CI/CD pipeline with GitHub Actions
```

### Developer API
```typescript
import { processUserInput } from './brain/router'

const result = await processUserInput('Implement authentication')

if (result.handled) {
  console.log(`Route: ${result.result.route}`)
  console.log(`Agents: ${result.result.agentsCreated.join(', ')}`)
}
```

### Configuration
```typescript
import { setupBrainHook } from './brain/integration/cli-hook'

await setupBrainHook({
  enabled: true,
  silent: false,
  fallbackToClaudeCode: true,
})
```

## File Organization

```
src/brain/
├── 📄 Documentation
│   ├── README.md              # Main documentation
│   ├── QUICK_START.md         # Quick start guide
│   ├── SUMMARY.md             # Complete summary
│   └── INDEX.md               # This file
│
├── 🔧 Core System
│   ├── router/                # Routing and intent detection
│   ├── integration/           # CLI integration
│   ├── convoy/                # Task packaging
│   ├── messaging/             # Agent communication
│   ├── persistence/           # State management
│   └── agents/                # Agent implementations
│
└── 📚 Examples
    └── examples/              # Usage examples
```

## Common Tasks

### I want to...

#### Use the Brain System
→ Just use CCJK CLI normally! It's automatically enabled.
→ See: [QUICK_START.md](./QUICK_START.md)

#### Understand How It Works
→ Read the architecture overview
→ See: [SUMMARY.md#system-architecture](./SUMMARY.md#system-architecture)

#### Integrate with My CLI
→ Follow the integration guide
→ See: [integration/README.md](./integration/README.md)

#### Configure the System
→ Check configuration options
→ See: [README.md#configuration](./README.md#configuration)

#### Run Examples
→ Check the examples directory
→ See: [examples/](./examples/)

#### Contribute
→ Read the file structure and architecture
→ See: [SUMMARY.md](./SUMMARY.md)

## Support

### Documentation
- Main docs: [README.md](./README.md)
- Quick start: [QUICK_START.md](./QUICK_START.md)
- Complete summary: [SUMMARY.md](./SUMMARY.md)

### Examples
- Zero-config demo: [examples/zero-config-demo.ts](./examples/zero-config-demo.ts)
- Integration example: [examples/integration-example.ts](./examples/integration-example.ts)
- Advanced usage: [examples/advanced-usage.ts](./examples/advanced-usage.ts)

### Issues
- Open an issue on GitHub
- Check existing documentation first

---

**Zero configuration. Zero manual intervention. Just works.**
