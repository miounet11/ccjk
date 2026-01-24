# CCJK Hook Templates Library

This directory contains comprehensive hook configuration templates for CCJK v8.0.0's Cloud-Native Task Management System.

## Available Hook Templates

### Pre-commit Hooks (Code Quality)

| Template | Priority | Applicable To | Description |
|----------|----------|---------------|-------------|
| **[pre-commit-eslint.md](./pre-commit-eslint.md)** | 10 | TypeScript, JavaScript, React, Vue | ESLint with auto-fix before commits |
| **[pre-commit-prettier.md](./pre-commit-prettier.md)** | 9 | All projects | Code formatting with Prettier |
| **[pre-commit-black.md](./pre-commit-black.md)** | 10 | Python, Django, Flask, FastAPI | Python code formatting with Black |
| **[pre-commit-gofmt.md](./pre-commit-gofmt.md)** | 10 | Go, Golang | Go code formatting with gofmt |
| **[pre-commit-type-check.md](./pre-commit-type-check.md)** | 10 | TypeScript, React, Vue, Angular | TypeScript type checking |

### Post-test Hooks (Coverage & Quality)

| Template | Priority | Applicable To | Description |
|----------|----------|---------------|-------------|
| **[post-test-coverage.md](./post-test-coverage.md)** | 5 | All tested projects | Test coverage report generation |

### Git Workflow Hooks (Process Automation)

| Template | Priority | Applicable To | Description |
|----------|----------|---------------|-------------|
| **[git-workflow-hooks.md](./git-workflow-hooks.md)** | 8 | All projects | Comprehensive git workflow automation |

## Hook Types

### PreToolUse Hooks
- **Trigger**: Before tool execution (e.g., `git commit`, `git push`)
- **Purpose**: Validation, formatting, quality checks
- **Behavior**: Can block the operation if checks fail

### PostToolUse Hooks
- **Trigger**: After successful tool execution
- **Purpose**: Reporting, cleanup, automation
- **Behavior**: Informational, doesn't block operations

### Multiple Hooks
- **Trigger**: Various git operations
- **Purpose**: Comprehensive workflow management
- **Behavior**: Combines multiple hook types

## Priority System

Hook priorities determine execution order:

- **Priority 15**: Critical pre-checks (branch protection, environment validation)
- **Priority 10-14**: Code quality and formatting
- **Priority 5-9**: Reporting and documentation
- **Priority 1-4**: Cleanup and automation

## Template Structure

Each hook template follows this structure:

```markdown
---
id: unique-hook-id
type: PreToolUse | PostToolUse | Multiple
name: Human-readable name
description: Brief description
priority: 1-15
matcher: Bash(pattern) or ToolUse(pattern)
command: command to execute
timeout: milliseconds
enabled: true
applicableTo: [project-types]
---

# Hook Name

## Description
Detailed description in English and Chinese

## When it runs
Trigger conditions and scope

## Configuration
Setup instructions and prerequisites

## Customization
How to customize the hook

## Error Handling
Error scenarios and solutions

## Advanced Configuration
Complex use cases and integrations
```

## Usage in CCJK v8.0.0

### Installation
```bash
# Install hook templates
ccjk hooks install pre-commit-eslint
ccjk hooks install post-test-coverage
ccjk hooks install git-workflow-hooks

# Install all hooks for a project type
ccjk hooks install --type typescript
ccjk hooks install --type python
ccjk hooks install --type go
```

### Configuration
```yaml
# ccjk.config.yaml
hooks:
  pre-commit-eslint:
    enabled: true
    priority: 10
    timeout: 30000

  post-test-coverage:
    enabled: true
    priority: 5
    generateReport: true

  git-workflow-hooks:
    enabled: true
    branchProtection:
      protectedBranches: ['main', 'develop']
      requirePullRequest: true
```

### Management
```bash
# List installed hooks
ccjk hooks list

# Enable/disable hooks
ccjk hooks enable pre-commit-eslint
ccjk hooks disable post-test-coverage

# Update hook configuration
ccjk hooks config pre-commit-eslint --timeout 45000

# Validate hook configuration
ccjk hooks validate
```

## Integration with Cloud-Native Features

### Cloud Sync
- Hook configurations sync across devices
- Team-wide hook policies
- Centralized hook management

### Hot-Reload
- Hook changes apply without restart
- Dynamic hook loading
- Real-time configuration updates

### Multi-Agent Orchestration
- Hooks can trigger agent workflows
- Coordinated quality checks
- Intelligent error handling

## Best Practices

### 1. Hook Selection
- Choose hooks appropriate for your project type
- Consider team workflow and requirements
- Balance quality checks with development speed

### 2. Priority Management
- Set priorities to ensure proper execution order
- Critical checks should have higher priorities
- Avoid priority conflicts between similar hooks

### 3. Performance Optimization
- Use appropriate timeouts for hook complexity
- Consider parallel execution for independent checks
- Optimize hook commands for speed

### 4. Error Handling
- Provide clear error messages
- Include recovery instructions
- Allow hook bypassing for emergencies

### 5. Team Adoption
- Document hook purposes and benefits
- Provide training on hook usage
- Gradually introduce hooks to avoid disruption

## Contributing

To add new hook templates:

1. Create a new `.md` file following the template structure
2. Include comprehensive documentation in English and Chinese
3. Test the hook configuration thoroughly
4. Update this index file
5. Submit a pull request

## Support

For hook-related issues:
- Check the individual hook documentation
- Use `ccjk hooks doctor` for diagnostics
- Report issues on the CCJK GitHub repository
- Join the CCJK community discussions

---

**Last Updated**: 2026-01-24
**CCJK Version**: v8.0.0
**Total Templates**: 7