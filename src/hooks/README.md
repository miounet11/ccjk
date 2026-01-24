# CCJK Hooks System v8.0.0

## Overview

The CCJK Hooks System provides intelligent, project-aware hook management for automated workflows. It supports:

- **Automatic Detection**: Analyzes your project type and recommends appropriate hooks
- **Cloud Recommendations**: Fetches cloud-based hook recommendations tailored to your stack
- **Local Templates**: Falls back to local hook templates when cloud is unavailable
- **Interactive & Non-Interactive**: Supports both guided setup and automation
- **Multi-Language**: TypeScript, JavaScript, Python, Rust, Go, and Java support
- **Comprehensive Testing**: Full test suite with edge case coverage

## Features

### 🎯 Smart Hook Recommendations

The system analyzes your project and recommends hooks based on:

- Project type (TypeScript, JavaScript, Python, Rust, Go, Java)
- Framework (React, Vue, Angular, Next.js, Django, Spring, etc.)
- Package manager (npm, yarn, pnpm, pip, cargo, go mod, maven, gradle)
- Existing tools (ESLint, Prettier, Jest, etc.)
- Development practices (testing, linting, formatting)

### 🪝 Hook Categories

#### Pre-Commit Hooks

- `pre-commit-eslint` - Run ESLint on staged files
- `pre-commit-prettier` - Format code with Prettier
- `pre-commit-types` - Run TypeScript type checking
- `pre-commit-tests` - Run relevant unit tests

#### Post-Test Hooks

- `post-test-coverage` - Generate coverage reports
- `post-test-summary` - Summarize test results
- `post-test-notify` - Send test result notifications
- `post-test-benchmark` - Track test performance metrics

#### Lifecycle Hooks

- `post-install-setup` - Run setup after dependencies install
- `pre-build-clean` - Clean build directory before build
- `post-build-size` - Analyze build size after build
- `pre-push-checks` - Run all checks before pushing

### ☁️ Cloud Integration

- **Personalized Recommendations**: Cloud API analyzes your project stack
- **Community Hooks**: Access hooks created by the community
- **Automatic Updates**: Get the latest hooks from the cloud
- **Analytics**: Track hook usage and performance

## Usage

### Basic Usage

```bash
# Interactive hook installation
ccjk ccjk:hooks

# List available hooks
ccjk hooks list

# Test all hooks
ccjk hooks test
```

### Advanced Usage

```bash
# Filter by type
ccjk ccjk:hooks --type pre-commit

# Filter by category
ccjk ccjk:hooks --category post-test

# Exclude specific hooks
ccjk ccjk:hooks --exclude pre-commit-prettier,pre-commit-types

# Dry-run (see what would be installed)
ccjk ccjk:hooks --dry-run

# JSON output
ccjk ccjk:hooks --json

# Verbose output
ccjk ccjk:hooks --verbose
```

## Installation Flow

1. **Project Analysis**
   - Detects project type
   - Identifies frameworks
   - Scans for existing tools
   - Checks package manager

2. **Hook Recommendations**
   - Fetches cloud recommendations (if available)
   - Falls back to local templates
   - Filters by project type
   - Sorts by priority

3. **Interactive Selection**
   - Display categorized hooks
   - Show descriptions and triggers
   - User confirmation

4. **Installation**
   - Validate hook triggers
   - Register with hook manager
   - Create hook configurations
   - Setup git hooks

5. **Testing Instructions**
   - Display testing commands
   - Show hook execution details
   - Provide troubleshooting tips

## Hook Configuration

Each hook has the following structure:

```json
{
  "name": "pre-commit-eslint",
  "description": "Run ESLint on staged files",
  "type": "pre-commit",
  "category": "pre-commit",
  "projectTypes": ["typescript", "javascript"],
  "trigger": {
    "matcher": "git:pre-commit",
    "condition": "git diff --cached --name-only | grep -E \"\\.(ts|js|tsx|jsx)$\""
  },
  "action": {
    "command": "eslint",
    "args": ["--fix", "--staged"],
    "timeout": 30000
  },
  "enabled": true,
  "priority": 100,
  "metadata": {
    "version": "1.0.0",
    "tags": ["linting", "code-quality"]
  }
}
```

### Trigger Types

- **git**: Git hooks (pre-commit, post-commit, pre-push, etc.)
- **file**: File changes (file:**/*.ts)
- **command**: Command execution (command:npm test)
- **schedule**: Cron-based scheduling (schedule:* * * * *)
- **webhook**: Webhook triggers (webhook:https://...)

### Hook Categories

- **pre-commit**: Hooks that run before git commit
- **post-test**: Hooks that run after tests
- **lifecycle**: Hooks that run at specific lifecycle events
- **custom**: User-defined hooks

## Architecture

### Core Components

```
ccjk-hooks (Command)
├── ProjectAnalyzer (Project Detection)
├── HookManager (Hook Registration & Execution)
├── TemplateLoader (Local Templates)
├── CloudClient (Cloud Recommendations)
└── TriggerValidator (Validation)
```

### Project Analyzer

The `ProjectAnalyzer` detects:

- Project type (TypeScript, JavaScript, Python, Rust, Go, Java)
- Framework (React, Vue, Angular, Next.js, Django, Spring, etc.)
- Package manager (npm, yarn, pnpm, pip, cargo, go mod, maven, gradle)
- Development tools (ESLint, Prettier, Jest, etc.)
- Test coverage
- Linting setup
- Formatting configuration

### Hook Manager

The `HookManager` handles:

- Hook registration
- Hook execution
- Hook lifecycle management
- Configuration persistence
- Event emission

### Template Loader

The `TemplateLoader` provides:

- Local hook templates
- Default hooks for each project type
- Framework-specific hooks
- Tool-specific hooks

### Cloud Client

The `CloudClient` offers:

- Personalized hook recommendations
- Community hooks
- Hook analytics
- Automatic updates

### Trigger Validator

The `TriggerValidator` ensures:

- Valid trigger syntax
- Supported trigger types
- Safe trigger patterns
- No trigger conflicts

## Testing

### Run Tests

```bash
# Run all tests
pnpm test

# Run hook-specific tests
pnpm test ccjk-hooks

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Test Coverage

The test suite includes:

- **Unit Tests**: Individual function testing
- **Integration Tests**: End-to-end workflow testing
- **Edge Case Tests**: Error conditions and failures
- **Mock Testing**: External dependency mocking

Coverage goals: **80%** minimum across all metrics.

## Troubleshooting

### Common Issues

#### No hooks found

**Problem**: No hooks match your project type

**Solution**:
- Check project detection with `ccjk ccjk:hooks --verbose`
- Manually specify hooks with `--include` parameter
- Use `--all` to show all available hooks

#### Hook validation failed

**Problem**: Hook trigger is invalid

**Solution**:
- Check trigger syntax
- Verify git repository exists
- Ensure required tools are installed

#### Hook execution failed

**Problem**: Hook command failed to run

**Solution**:
- Check command path
- Verify command arguments
- Check execution timeout
- Review hook logs with `ccjk hooks list --verbose`

#### Cloud recommendations unavailable

**Problem**: Cloud API is down or unreachable

**Solution**:
- System automatically falls back to local templates
- Check internet connection
- Try again later
- Use `--local` to force local templates

## API Reference

### Command Options

```typescript
interface CcjkHooksOptions {
  type?: HookType | 'all'                    // Hook type filter
  category?: HookCategory | 'all'            // Hook category filter
  exclude?: string[]                         // Hooks to exclude
  enabled?: boolean                          // Only enabled hooks
  priority?: number                          // Minimum priority
  dryRun?: boolean                           // Dry-run mode
  json?: boolean                             // JSON output
  verbose?: boolean                          // Verbose output
}
```

### Hook Type

```typescript
type HookType =
  | 'pre-commit'
  | 'post-commit'
  | 'pre-push'
  | 'post-push'
  | 'pre-test'
  | 'post-test'
  | 'pre-build'
  | 'post-build'
  | 'pre-install'
  | 'post-install'
  | 'pre-start'
  | 'post-start'
  | 'custom'
```

### Hook Category

```typescript
type HookCategory = 'pre-commit' | 'post-test' | 'lifecycle' | 'custom'
```

## Contributing

### Adding New Hooks

1. Create hook template in `templates/hooks/<category>/<name>.json`
2. Add to `src/hooks/template-loader.ts` defaults
3. Add translations in `src/i18n/locales/*/hooks.json`
4. Add tests in `tests/commands/ccjk-hooks.test.ts`
5. Run tests to verify

### Hook Template Example

```json
{
  "name": "my-custom-hook",
  "description": "My custom hook",
  "type": "pre-commit",
  "category": "pre-commit",
  "projectTypes": ["typescript"],
  "trigger": {
    "matcher": "git:pre-commit"
  },
  "action": {
    "command": "my-command",
    "args": ["--arg"],
    "timeout": 30000
  },
  "enabled": true,
  "priority": 100,
  "metadata": {
    "version": "1.0.0",
    "tags": ["custom"]
  }
}
```

## Future Enhancements

- [ ] Hook marketplace integration
- [ ] Visual hook editor
- [ ] Hook performance monitoring
- [ ] Hook conflict detection
- [ ] Automatic hook updates
- [ ] Hook versioning
- [ ] Remote hook execution
- [ ] Hook chaining and composition
- [ ] Conditional hook execution
- [ ] Hook analytics dashboard

## License

MIT License - see LICENSE file for details