# Agent Teams CLI

The Agent Teams feature exposes the BrainOrchestrator to the CLI, enabling multi-agent orchestration for complex tasks.

## Overview

Agent Teams coordinate multiple AI agents to execute complex tasks through intelligent task decomposition, parallel execution, and result aggregation. The system uses the ConvoyManager for progress tracking and the BrainOrchestrator for agent coordination.

## Commands

### Run Agent Team

Execute a task with agent teams:

```bash
ccjk agents run --task "Analyze the codebase for performance issues"
```

With a specific workflow preset:

```bash
ccjk agents run --task "Fix memory leaks" --workflow fix
```

With verbose logging:

```bash
ccjk agents run --task "Generate tests" --workflow test --verbose
```

With JSON output:

```bash
ccjk agents run --task "Optimize code" --workflow optimize --json
```

### Show Status

View active convoys and recent execution history:

```bash
ccjk agents status
```

With JSON output:

```bash
ccjk agents status --json
```

### List Workflows

List available workflow presets:

```bash
ccjk agents list
```

With JSON output:

```bash
ccjk agents list --json
```

### Cancel Convoy

Cancel a running convoy:

```bash
ccjk agents cancel cv-abc123
```

## Workflow Presets

### Analyze

Code analysis and quality checks:

```bash
ccjk agents run --task "Analyze codebase structure" --workflow analyze
```

**Capabilities:**
- Static code analysis
- Dependency analysis
- Code quality assessment
- Architecture review

### Fix

Bug detection and fixing:

```bash
ccjk agents run --task "Find and fix bugs" --workflow fix
```

**Capabilities:**
- Bug detection
- Code repair
- Error handling improvements
- Edge case fixes

### Test

Test generation and coverage:

```bash
ccjk agents run --task "Generate test suite" --workflow test
```

**Capabilities:**
- Unit test generation
- Integration test creation
- Test coverage analysis
- Test quality assessment

### Optimize

Performance optimization:

```bash
ccjk agents run --task "Optimize performance" --workflow optimize
```

**Capabilities:**
- Performance profiling
- Code optimization
- Refactoring suggestions
- Resource usage optimization

## Architecture

### Components

1. **BrainOrchestrator**: Central coordinator for multi-agent execution
   - Task decomposition
   - Agent selection and assignment
   - Parallel execution management
   - Result aggregation

2. **ConvoyManager**: Progress tracking and task grouping
   - Task organization
   - Progress monitoring
   - Dependency management
   - Notifications

3. **Workflow Presets**: Pre-configured task templates
   - Task definitions
   - Required capabilities
   - Execution parameters

### Execution Flow

```
1. User runs: ccjk agents run --task "..." --workflow analyze
   ↓
2. Create task from workflow template
   ↓
3. Initialize ConvoyManager and create convoy
   ↓
4. Initialize BrainOrchestrator
   ↓
5. Execute task with progress tracking
   ↓
6. Display results and convoy status
```

## Examples

### Example 1: Code Analysis

```bash
# Analyze codebase for issues
ccjk agents run --task "Analyze the codebase for potential issues" --workflow analyze

# Output:
# 🤖 Starting Agent Team
# Task: Analyze the codebase for potential issues
# Workflow: Code Analysis
#
# ✓ Created plan with 3 tasks
# ✓ Completed: Scan codebase structure
# ✓ Completed: Analyze dependencies
# ✓ Completed: Generate quality report
#
# ✅ Agent team completed successfully!
#
# Results:
# ────────────────────────────────────────────────────────────
# Status: completed
# Tasks Completed: 3
# Tasks Failed: 0
# Duration: 1234ms
# Success Rate: 100.0%
# ────────────────────────────────────────────────────────────
#
# Convoy ID: cv-abc123
# Run "agents status" to see all convoys
```

### Example 2: Bug Fixing

```bash
# Find and fix bugs
ccjk agents run --task "Fix memory leaks in the application" --workflow fix --verbose
```

### Example 3: Test Generation

```bash
# Generate comprehensive tests
ccjk agents run --task "Generate tests for user authentication" --workflow test
```

### Example 4: Performance Optimization

```bash
# Optimize code performance
ccjk agents run --task "Optimize database queries" --workflow optimize
```

## Advanced Usage

### Custom Task Without Workflow

You can run tasks without specifying a workflow (defaults to 'analyze'):

```bash
ccjk agents run --task "Review security vulnerabilities"
```

### Monitoring Progress

Check status while a convoy is running:

```bash
# In another terminal
ccjk agents status
```

### Cancelling Execution

If you need to stop a running convoy:

```bash
ccjk agents cancel cv-abc123
```

## Integration with Brain System

The Agent Teams CLI integrates with CCJK's Brain system:

- **Task Decomposition**: Automatically breaks complex tasks into subtasks
- **Agent Selection**: Chooses appropriate agents based on required capabilities
- **Parallel Execution**: Runs independent tasks concurrently
- **Result Aggregation**: Combines results from multiple agents
- **Error Recovery**: Automatic retry and self-healing mechanisms

## Troubleshooting

### No Task Specified

```bash
Error: Please specify a task with --task
Example: agents run --task "Analyze the codebase"
```

**Solution**: Always provide a task description with `--task`.

### Unknown Workflow

```bash
Error: Unknown workflow: custom
Run "agents list" to see available workflows
```

**Solution**: Use one of the available workflows: analyze, fix, test, optimize.

### Convoy Not Found

```bash
Error: Convoy not found: cv-xyz789
```

**Solution**: Check convoy ID with `ccjk agents status`.

## See Also

- [Brain System Documentation](../src/brain/CLAUDE.md)
- [Orchestrator Types](../src/brain/orchestrator-types.ts)
- [Convoy Manager](../src/brain/convoy/convoy-manager.ts)
- [Agent Command](../src/commands/agent.ts) - Single agent management
