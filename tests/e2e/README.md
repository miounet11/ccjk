# CCJK E2E Test Framework

This directory contains the end-to-end (E2E) test framework for CCJK, providing real-world testing scenarios for the complete application.

## Overview

The E2E test framework simulates actual user interactions and real-world usage patterns to ensure CCJK works correctly across different scenarios, platforms, and configurations.

## Test Structure

```
tests/e2e/
├── setup.ts              # Global test environment setup
├── teardown.ts           # Global test cleanup
├── helpers.ts            # Test helper functions and utilities
├── init-workflow.test.ts       # Initialization flow tests
├── mcp-workflow.test.ts        # MCP management flow tests
├── cloud-sync.test.ts         # Cloud synchronization tests
└── cross-platform.test.ts     # Cross-platform compatibility tests
```

## Running Tests

### Full E2E Test Suite
```bash
# Run all E2E tests in watch mode
pnpm test:e2e

# Run all E2E tests once
pnpm test:e2e:run

# Run tests with UI
pnpm test:e2e:ui

# Run with coverage
pnpm test:e2e:coverage

# Debug mode (verbose logging)
pnpm test:e2e:debug
```

### Specific Test Files
```bash
# Run specific test file
pnpm test:e2e init-workflow.test.ts

# Run specific test suite
pnpm test:e2e --grep "Fresh Installation"

# Run with custom timeout
CCJK_E2E_TIMEOUT=180000 pnpm test:e2e
```

## Key Features

### 1. Isolated Test Environment
- Each test runs in an isolated temporary directory
- Separate HOME directory for each test run
- Independent configuration and project directories
- Automatic cleanup after tests

### 2. Real-World Simulation
- Full CLI command execution using real `bin/ccjk.mjs`
- Simulated user input/interaction
- Actual file system operations
- Real configuration changes
- Process management and cleanup

### 3. Cross-Platform Support
- Tested on Windows, macOS, and Linux
- Platform-specific path handling
- Different shell environments (bash, zsh, PowerShell)
- Architecture compatibility (x64, ARM)

### 4. Helper Functions
The `helpers.ts` file provides:

#### Command Execution
- `runCcjk()` - Execute CCJK CLI commands with options
- `runCommand()` - Run shell commands
- Support for user input simulation
- Timeout handling
- Real-time output capture

#### Assertion Helpers
- `assertSuccess()` - Assert command success
- `assertFailure()` - Assert command failure
- `assertOutputContains()` - Check output content
- `assertFile()` - File existence and content validation
- `assertOutputMatches()` - Regex pattern matching

#### Wait Functions
- `waitFor()` - Wait for condition to be true
- `waitForFile()` - Wait for file to exist
- `waitForFileContent()` - Wait for file content to match

#### File Utilities
- `createFile()` - Create files with content
- `readJsonFile()` / `writeJsonFile()` - Safe JSON file operations
- `assertFile()` - Validate file properties

#### Mock Data
- `createMockMcpServer()` - Create MCP server configurations
- `createMockCloudConfig()` - Create cloud sync configurations
- `createMockResponses()` - Generate mock user responses

### 5. Platform Utilities
- `isPlatform()` - Check current platform
- `skipOnPlatform()` - Skip tests on specific platforms
- `normalizePath()` - Normalize path for current platform
- `getPathSeparator()` - Get platform-specific path separator

## Test Categories

### Initialization Tests (`init-workflow.test.ts`)
- Fresh installation scenarios
- Configuration migration from older versions
- Interactive setup workflows
- Project type detection (Node.js, Python, Rust, etc.)
- Error recovery and resilience
- Environment variable handling

### MCP Management Tests (`mcp-workflow.test.ts`)
- MCP server listing and search
- Server installation and uninstallation
- Configuration management
- Server lifecycle (start, stop, restart)
- Project-level MCP configuration
- Error handling for MCP operations

### Cloud Sync Tests (`cloud-sync.test.ts`)
- Cloud provider setup (GitHub Gist, WebDAV, local)
- Configuration synchronization
- Conflict resolution strategies
- Multi-device sync
- Cloud skills synchronization
- Security and encryption
- Backup and restore
- Auto-sync functionality

### Cross-Platform Tests (`cross-platform.test.ts`)
- Platform-specific path handling
- Different file systems and characteristics
- Shell environment compatibility
- Node.js version compatibility
- Package manager compatibility
- Terminal compatibility
- Locale and encoding support
- Special environments (CI/CD, Docker)

## Test Environment

Each E2E test creates a complete isolated environment:
- Root temp directory: `~/.tmp/ccjk-e2e-{timestamp}`
- Mock HOME directory with all config directories
- Independent project workspace
- Clean environment variables
- Automatic cleanup after tests

## Writing New Tests

### Basic Test Structure
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { runCcjk, assertSuccess } from './helpers'
import { createTestProject } from './setup'

describe('My Test Suite', () => {
  let testProjectDir: string

  beforeEach(async () => {
    testProjectDir = await createTestProject({
      name: `my-test-${Date.now()}`,
      withGit: true,
    })
    process.chdir(testProjectDir)
  })

  it('should perform action', async () => {
    const result = await runCcjk(['command', 'arg1', 'arg2'], {
      input: ['response1', 'response2'], // for interactive prompts
      timeout: 30000,
    })

    assertSuccess(result)
    expect(result.stdout).toContain('expected output')
  })
})
```

### Test Patterns

#### Interactive Command
```typescript
const result = await runCcjk(['init'], {
  input: ['y', 'n', 'test-value'],
  timeout: 60000,
})
```

#### Config Testing
```typescript
const projectDir = await createTestProject({
  withClaudeConfig: true,
  files: {
    '.customrc': 'custom content',
  },
})

// Test your specific scenario
```

#### Platform-Specific Test
```typescript
import { isPlatform } from './helpers'

it('should work on Windows', async () => {
  if (!isPlatform('win32')) return // Skip on other platforms

  const result = await runCcjk(['command'])
  assertSuccess(result)
})
```

## Configuration

### Test Timeout
Default timeout: 120 seconds
Set via: `CCJK_E2E_TIMEOUT` environment variable

### Debug Mode
Enable debug logging:
```bash
CCJK_E2E_DEBUG=true pnpm test:e2e
```

### Coverage
Coverage thresholds for E2E tests:
- Lines: 60%
- Functions: 60%
- Branches: 60%
- Statements: 60%

## Troubleshooting

### Tests Timing Out
- Increase timeout: `CCJK_E2E_TIMEOUT=180000 pnpm test:e2e`
- Check if CLI command is hanging
- Use debug mode to see what's happening

### Tests Failing Locally
- Ensure Node.js 20+ is installed
- Run `pnpm install` to install dependencies
- Check if any processes are blocking ports

### Platform-Specific Issues
- Some tests are skipped on certain platforms
- Check platform detection with `process.platform`
- Verify environment variable handling

### File System Issues
- Ensure temp directory is writable
- Check disk space
- Clean up old test directories if needed

## Best Practices

1. Always use isolated project directories
2. Clean up resources after tests
3. Use appropriate timeouts for operations
4. Test error cases, not just success cases
5. Use meaningful test descriptions
6. Minimize external dependencies
7. Mock network calls when possible
8. Document platform-specific behavior

## Continuous Integration

E2E tests run in CI/CD environment:
- Set `CI=true` for non-interactive mode
- Tests run in isolated containers
- Special handling for limited resources
- Network restrictions are handled gracefully

## Related Documentation

- [CCJK Project README](/README.md)
- [Testing Guidelines](/docs/testing.md)
- [CLI Usage](/docs/cli.md)
