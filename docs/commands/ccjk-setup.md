# CCJK Setup Command Documentation

The `ccjk ccjk:setup` command is the ultimate local mode setup orchestrator for CCJK v8.0.0. It provides intelligent, automated setup of your complete AI coding environment.

## Overview

The setup command analyzes your project and automatically configures:
- **Skills** - Reusable coding patterns and best practices
- **MCP Services** - Language servers and development tools
- **Agents** - Specialized AI coding assistants
- **Hooks** - Git hooks and automation

## Quick Start

### Recommended Setup (Most Common)

```bash
# Interactive setup with recommended profile
ccjk ccjk:setup

# Non-interactive with auto-confirmation
ccjk ccjk:setup --auto-confirm -y

# Custom resource selection
ccjk ccjk:setup --resources skills,agents
```

### Profile-Based Setup

```bash
# Minimal setup (5-8 resources)
ccjk ccjk:setup --profile minimal

# Recommended setup (12-18 resources) - default
ccjk ccjk:setup --profile recommended

# Full setup (20-30 resources)
ccjk ccjk:setup --profile full
```

## Command Options

### Profile Selection

| Profile | Resources | Use Case |
|---------|-----------|----------|
| `minimal` | 5-8 | Quick start, small projects |
| `recommended` | 12-18 | Most projects (default) |
| `full` | 20-30 | Large projects, full feature set |
| `custom` | Variable | Select specific resources |

### Resource Selection

```bash
# Install all resources
ccjk ccjk:setup --resources skills,mcp,agents,hooks

# Install only skills and agents
ccjk ccjk:setup --resources skills,agents

# Install only MCP services
ccjk ccjk:setup --resources mcp
```

### Execution Control

```bash
# Parallel execution (default, faster)
ccjk ccjk:setup --parallel

# Sequential execution (safer for debugging)
ccjk ccjk:setup --no-parallel

# Max concurrency limit
ccjk ccjk:setup --max-concurrency 2
```

### Interactive Mode

```bash
# Interactive mode with confirmation prompts (default)
ccjk ccjk:setup --interactive

# Non-interactive mode
ccjk ccjk:setup --no-interactive

# Auto-confirm all prompts
ccjk ccjk:setup --auto-confirm -y
```

### Safety Features

```bash
# Create backup before setup (default)
ccjk ccjk:setup --backup

# Skip backup
ccjk ccjk:setup --no-backup

# Auto-rollback on failure (default)
ccjk ccjk:setup --rollback-on-error

# Keep changes even on failure
ccjk ccjk:setup --no-rollback-on-error
```

### Preview & Testing

```bash
# Dry run (preview without making changes)
ccjk ccjk:setup --dry-run

# Generate report (default)
ccjk ccjk:setup --report

# Skip report generation
ccjk ccjk:setup --no-report
```

### Output Format

```bash
# Standard output (default)
ccjk ccjk:setup

# Verbose output
ccjk ccjk:setup --verbose -v

# JSON output (for scripts/CI)
ccjk ccjk:setup --json
```

### Language

```bash
# English (default)
ccjk ccjk:setup --lang en

# Chinese
ccjk ccjk:setup --lang zh-CN
```

## Usage Examples

### Example 1: TypeScript + React Project

```bash
ccjk ccjk:setup --profile recommended

# Output:
# 🔍 Analyzing project...
#    ✓ Project type: TypeScript + React
#    ✓ Package manager: pnpm
#    ✓ Testing: Vitest
#
# 📋 Installation Plan (recommended profile):
#
# Skills (5):
#   • ts-best-practices
#   • react-patterns
#   • testing-best-practices
#   • git-workflow
#
# MCP Services (3):
#   • typescript-language-server
#   • eslint-mcp
#   • git-mcp
#
# Agents (3):
#   • typescript-architect
#   • react-specialist
#   • testing-automation-expert
#
# Hooks (4):
#   • pre-commit-eslint
#   • pre-commit-prettier
#   • pre-push-tests
#
# Total: 15 resources
# Proceed? [Y/n]
```

### Example 2: Minimal Setup

```bash
ccjk ccjk:setup --profile minimal --auto-confirm

# Quickly installs essential resources only
# - 1-2 essential skills
# - 1 language server
# - 1 generalist agent
# - 1-2 pre-commit hooks
```

### Example 3: Custom Setup

```bash
# Install only skills and agents for an existing project
ccjk ccjk:setup \
  --profile custom \
  --resources skills,agents \
  --auto-confirm
```

### Example 4: CI/CD Pipeline

```bash
# Non-interactive setup for CI/CD
ccjk ccjk:setup \
  --profile recommended \
  --no-interactive \
  --auto-confirm \
  --json \
  --lang en
```

### Example 5: Preview Changes

```bash
# See what would be installed without making changes
ccjk ccjk:setup --dry-run --profile full
```

## What Gets Installed

### Minimal Profile (5-8 resources)

**Skills (1-2)**
- Git workflow basics

**MCP Services (1)**
- Language server for your primary language

**Agents (1)**
- Generalist coding assistant

**Hooks (1-2)**
- Pre-commit linting
- Basic formatting

### Recommended Profile (12-18 resources)

**Skills (3-5)**
- Language best practices (TS/JS)
- Framework-specific patterns
- Testing best practices
- Git workflow

**MCP Services (2-3)**
- Language server
- ESLint integration
- Git integration

**Agents (2-3)**
- Language architect
- Framework specialist
- Testing expert

**Hooks (3-4)**
- Pre-commit: ESLint, Prettier
- Pre-push: Tests
- Post-test: Coverage

### Full Profile (20-30 resources)

Everything from recommended plus:

**Additional Skills**
- Advanced patterns
- Performance optimization
- Security best practices
- API design patterns

**Additional MCP Services**
- File system operations
- Search/indexing
- Docker integration (if applicable)

**Additional Agents**
- Code reviewer
- Performance optimizer
- Security expert

**Additional Hooks**
- Dependency checks
- Security audits
- Custom workflow hooks

## Project Analysis

The setup command automatically detects:

- **Project Type**: Library, app, CLI, monorepo
- **Languages**: TypeScript, JavaScript, Python, etc.
- **Frameworks**: React, Vue, Next.js, etc.
- **Testing**: Jest, Vitest, Testing Library
- **Code Quality**: ESLint, Prettier, TypeScript
- **Package Manager**: npm, pnpm, yarn
- **Team Size**: Estimated from git history

This analysis determines which resources are most relevant for your project.

## Installation Report

After setup, a detailed report is generated:

```markdown
# CCJK Setup Report

**Date**: 2026-01-24 15:30:45
**Profile**: recommended
**Duration**: 4.4s

## Project Analysis
- Type: TypeScript + React
- Complexity: medium
- Team Size: 5-10 developers

## Installed Resources

### Skills (5)
- ✅ ts-best-practices (essential)
- ✅ react-patterns (high)
- ✅ testing-best-practices (recommended)
- ✅ git-workflow (recommended)

### MCP Services (3)
- ✅ typescript-language-server (essential)
- ✅ eslint-mcp (essential)
- ✅ git-mcp (recommended)

### Agents (3)
- ✅ typescript-architect
- ✅ react-specialist
- ✅ testing-automation-expert

### Hooks (4)
- ✅ pre-commit-eslint
- ✅ pre-commit-prettier
- ✅ pre-push-tests
- ✅ post-test-coverage

## Next Steps
1. Start coding: Your agents are ready
2. Run an agent: ccjk agent run typescript-architect
3. View available skills: ccjk skills list
```

## Backup & Rollback

### Automatic Backup

By default, setup creates a backup before making changes:

```bash
ccjk ccjk:setup

# Backup created at:
# .ccjk-backups/ccjk-setup-20260124-153045/
```

Backup includes:
- `.claude.json` and `.claude.md`
- `.claudeignore`
- `.vscode/settings.json`
- Git hooks
- Package configuration

### Manual Rollback

If setup fails or you want to revert:

```bash
# Find recent backups
ls .ccjk-backups/

# Restore specific backup
ccjk backup restore .ccjk-backups/ccjk-setup-20260124-153045
```

### Automatic Rollback

Setup automatically rolls back on failure (by default):

```bash
ccjk ccjk:setup --rollback-on-error

# If installation fails:
# 1. Uninstall any installed resources
# 2. Restore backup
# 3. Report error
```

## Performance

### Execution Time

| Profile | Resources | Time (parallel) | Time (sequential) |
|---------|-----------|-----------------|-------------------|
| minimal | 5-8 | 1-2s | 3-5s |
| recommended | 12-18 | 3-5s | 8-12s |
| full | 20-30 | 5-8s | 15-20s |

### Parallel Execution

Phases run in parallel where safe:

```
Phase 1: Skills ─┐
                ├─> Parallel (1-2s)
Phase 2: MCP   ─┘

Phase 3: Agents ─┐
                ├─> Parallel (1-2s)
Phase 4: Hooks  ─┘
```

## Troubleshooting

### Setup Fails

```bash
# Run with verbose output
ccjk ccjk:setup --verbose

# Check what would be done
ccjk ccjk:setup --dry-run

# Try minimal profile first
ccjk ccjk:setup --profile minimal
```

### Partial Installation

If some resources fail:

```bash
# Check report for details
cat setup-report-*.md

# Retry with specific resources
ccjk ccjk:setup --resources skills --auto-confirm
```

### Conflict Detection

Setup automatically detects and reports conflicts:

```
⚠️  Conflict detected:
  - ESLint MCP service already configured
  - Existing pre-commit hooks found

Solution:
  - Use --backup to preserve existing config
  - Manual merge may be required
```

## Advanced Usage

### Scripted Setup

```bash
#!/bin/bash
# setup-ccjk.sh

ccjk ccjk:setup \
  --profile recommended \
  --no-interactive \
  --auto-confirm \
  --backup \
  --report \
  --lang en

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ Setup successful"
  cat setup-report-*.md
else
  echo "❌ Setup failed"
  exit 1
fi
```

### Docker Integration

```dockerfile
FROM node:20

# Install CCJK
RUN npm install -g ccjk

# Setup project
WORKDIR /app
COPY . .

# Run setup non-interactively
RUN ccjk ccjk:setup \
  --profile minimal \
  --no-interactive \
  --auto-confirm \
  --json
```

### Monorepo Setup

```bash
# Setup for specific workspace
cd packages/frontend
ccjk ccjk:setup --profile recommended

cd packages/backend
ccjk ccjk:setup --profile minimal
```

## Best Practices

1. **Start with recommended profile** - Adjust after testing
2. **Use dry-run first** - Preview changes before applying
3. **Keep backups** - Essential for rollback
4. **Review the report** - Understand what was installed
5. **Customize gradually** - Add resources as needed
6. **Test in dev branch** - Validate before merging
7. **Document custom setup** - Share with team

## Comparison with Other Commands

| Command | Scope | Automation | Analysis |
|---------|-------|------------|----------|
| `ccjk:setup` | All resources | Full | Deep analysis |
| `ccjk:skills` | Skills only | Manual selection | Basic detection |
| `ccjk:mcp` | MCP only | Manual selection | Basic detection |
| `ccjk:agents` | Agents only | Manual selection | Basic detection |
| `ccjk:hooks` | Hooks only | Manual selection | Basic detection |

Use `ccjk:setup` for:
- New projects
- Complete environment setup
- Team onboarding
- Major upgrades

Use individual commands for:
- Adding specific resources
- Updating existing setup
- Testing new features

## Related Commands

```bash
# Individual resource management
ccjk ccjk:skills --help
ccjk ccjk:mcp --help
ccjk ccjk:agents --help
ccjk ccjk:hooks --help

# View installed resources
ccjk skills list
ccjk mcp list
ccjk agents list
ccjk hooks list

# Remove resources
ccjk skills remove <skill-id>
ccjk mcp remove <service-id>
ccjk agents remove <agent-id>
ccjk hooks remove <hook-id>
```

## Support

- Documentation: [CCJK Docs](https://ccjk.dev)
- Issues: [GitHub Issues](https://github.com/lucc/ccjk/issues)
- Discord: [CCJK Community](https://discord.gg/ccjk)