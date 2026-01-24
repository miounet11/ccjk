# Orchestrators Module

The orchestrators module provides high-level orchestration for complex multi-step operations in CCJK.

## Overview

Orchestrators coordinate multiple commands and utilities to achieve complex workflows with:

- **Parallel Execution** - Run independent operations concurrently
- **Error Handling** - Comprehensive error recovery and rollback
- **Progress Tracking** - Real-time status updates
- **Backup & Restore** - Automatic safety before modifications
- **Report Generation** - Detailed operation summaries

## Setup Orchestrator

The `SetupOrchestrator` is the main orchestrator for the `/ccjk:setup` command.

### Features

- **Deep Project Analysis** - Detects project type, languages, frameworks, tools
- **Smart Resource Selection** - Chooses appropriate skills, MCP, agents, hooks
- **Profile-Based Installation** - Minimal, recommended, full, or custom
- **Parallel Phase Execution** - Installs independent resources concurrently
- **Automatic Backup** - Creates backup before modifications
- **Rollback on Failure** - Restores backup if installation fails
- **Detailed Reporting** - Generates markdown report with next steps

### Architecture

```
SetupOrchestrator
├── Project Analysis
│   ├── Detect project type
│   ├── Analyze dependencies
│   ├── Estimate team size
│   └── Calculate complexity
├── Installation Plan
│   ├── Select resources by profile
│   ├── Resolve dependencies
│   ├── Detect conflicts
│   └── Calculate execution order
├── Phase Execution
│   ├── Skills Phase (independent)
│   ├── MCP Phase (independent)
│   ├── Agents Phase (depends on 1,2)
│   └── Hooks Phase (independent)
├── Validation
│   ├── Verify installations
│   ├── Test configurations
│   └── Check integrations
└── Reporting
    ├── Generate summary
    ├── Create markdown report
    └── Suggest next steps
```

### Usage

```typescript
import { SetupOrchestrator } from './orchestrators/setup-orchestrator'
import { ProjectAnalyzer } from './analyzers/project-analyzer'

const analyzer = new ProjectAnalyzer()
const orchestrator = new SetupOrchestrator(analyzer)

const result = await orchestrator.execute({
  profile: 'recommended',
  parallel: true,
  backup: true,
  report: true,
  rollbackOnError: true,
})

console.log(`Installed ${result.totalInstalled} resources in ${result.duration}ms`)
```

### Phases

#### Skills Phase

Installs reusable coding patterns and best practices:
- Language-specific patterns (TS, JS, Python)
- Framework patterns (React, Vue, Next.js)
- Testing best practices
- Git workflow patterns

#### MCP Phase

Configures Model Context Protocol services:
- Language servers (TypeScript, Python, etc.)
- Linting integration (ESLint, Pylint)
- Git integration
- Package management tools

#### Agents Phase

Creates specialized AI coding assistants:
- Language architects (TypeScript, Python)
- Framework specialists (React, Vue)
- Testing experts
- Code reviewers
- Performance optimizers

#### Hooks Phase

Sets up automation hooks:
- Pre-commit: Linting, formatting, validation
- Pre-push: Test execution
- Post-test: Coverage reports
- Custom workflow hooks

### Profiles

#### Minimal Profile

**Resources**: 5-8
**Use Case**: Quick start, small projects
**Duration**: 1-2s

Essential resources only:
- 1-2 core skills
- 1 language server
- 1 generalist agent
- 1-2 pre-commit hooks

#### Recommended Profile

**Resources**: 12-18
**Use Case**: Most projects (default)
**Duration**: 3-5s

Balanced selection based on project analysis:
- 3-5 relevant skills
- 2-3 MCP services
- 2-3 specialist agents
- 3-4 critical hooks

#### Full Profile

**Resources**: 20-30
**Use Case**: Large projects, complete toolset
**Duration**: 5-8s

All applicable resources:
- All language/framework skills
- All relevant MCP services
- All applicable agents
- All available hooks

### Error Handling

The orchestrator implements sophisticated error handling:

```typescript
// Phase-level error handling
{
  phase: 'skills',
  success: true,
  installed: 5,
  failed: 0,
  errors: []
}

// Automatic rollback on critical failure
if (result.totalFailed > criticalThreshold) {
  await orchestrator.rollback(result)
}

// Detailed error reporting
result.errors.forEach(error => {
  console.error(error.message)
  console.error(error.stack)
})
```

### Performance

**Parallel Execution**:
- Skills + MCP: 1-2s (concurrent)
- Agents + Hooks: 1-2s (concurrent)
- Total: 2-4s for recommended profile

**Sequential Execution**:
- Skills: 1-2s
- MCP: 1-2s
- Agents: 2-3s
- Hooks: 1-2s
- Total: 5-9s for recommended profile

### Backup System

Automatic backup creation before setup:

```typescript
const backupPath = await createBackup('ccjk-setup', {
  includePatterns: [
    '.claude.json',
    '.claude.md',
    '.vscode/settings.json',
  ],
  compress: true,
})
```

Backup restoration on failure:

```typescript
await orchestrator.rollback(result)
// 1. Uninstall installed resources
// 2. Remove configurations
// 3. Restore backup
```

### Report Generation

Detailed markdown reports with:

```markdown
# CCJK Setup Report

**Date**: 2026-01-24 15:30:45
**Profile**: recommended
**Duration**: 4.4s

## Project Analysis
- Type: TypeScript + React
- Complexity: medium

## Installed Resources
### Skills (5)
- ✅ ts-best-practices (essential)
- ✅ react-patterns (high)
- ...

## Next Steps
1. Start coding: Your agents are ready
2. Run an agent: ccjk agent run typescript-architect
```

## Future Orchestrators

Potential future orchestrators:

### Cloud Setup Orchestrator

Orchestrate cloud-based setup:
- Sync configuration from cloud
- Install cloud-hosted skills
- Connect to cloud agents
- Enable cloud hooks

### Migration Orchestrator

Handle complex migrations:
- Migrate from v6 to v8
- Convert old configurations
- Preserve user settings
- Validate migration

### Update Orchestrator

Manage updates across all resources:
- Check for updates
- Update skills, MCP, agents, hooks
- Test compatibility
- Rollback on failure

## Testing

The orchestrators module has comprehensive test coverage:

```bash
# Unit tests
pnpm test tests/orchestrators/setup-orchestrator.test.ts

# Integration tests
pnpm test tests/commands/ccjk-setup.test.ts

# Full test suite
pnpm test
```

## Architecture Decisions

### Why Orchestrators?

1. **Complexity Management** - Multi-step operations need coordination
2. **Error Recovery** - Centralized rollback capability
3. **Performance** - Parallel execution of independent operations
4. **User Experience** - Progress tracking and reporting
5. **Safety** - Automatic backup before modifications

### Design Principles

- **Single Responsibility** - Each orchestrator handles one workflow
- **Composability** - Orchestrators can use other orchestrators
- **Testability** - Mockable dependencies for unit testing
- **Observability** - Detailed logging and metrics
- **Recovery** - Always have a rollback path

## Related Modules

- **Commands** - `/ccjk:skills`, `/ccjk:mcp`, `/ccjk:agents`, `/ccjk:hooks`
- **Analyzers** - Project detection and analysis
- **Utils** - Backup, report generation, config management
- **Templates** - Resource templates for installation