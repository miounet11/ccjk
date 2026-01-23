# CCJK v2.0 Test Framework

A comprehensive testing infrastructure for CCJK 2.0 with enhanced coverage, performance monitoring, and advanced testing utilities.

## Overview

The CCJK v2.0 test framework provides:

- **85% minimum coverage** across lines, functions, branches, and statements
- **Advanced mock factory** for consistent test data generation
- **Comprehensive assertion helpers** for enhanced test readability
- **Integration test support** for cross-component testing
- **Performance benchmarking** built into test execution
- **Isolated test environments** with automatic cleanup

## Directory Structure

```
tests/v2/
├── unit/                    # Unit tests for individual components
│   ├── config-manager.test.ts
│   ├── workflow-engine.test.ts
│   └── mcp-manager.test.ts
├── integration/             # Integration tests for component interaction
│   ├── init-workflow.test.ts
│   └── api-provider.test.ts
├── helpers/                 # Test utilities and helpers
│   ├── mock-factory.ts      # Mock creation utilities
│   ├── test-data-generator.ts # Test data generation
│   └── assertion-helpers.ts  # Enhanced assertions
├── fixtures/                # Test data fixtures
│   ├── config.json
│   ├── workflow.json
│   ├── mcp-service.json
│   └── api-providers.json
├── setup.ts                 # Global test setup
└── teardown.ts             # Global test teardown
```

## Running Tests

### Basic Commands

```bash
# Run all v2 tests
pnpm test:v2

# Run with UI
pnpm test:v2:ui

# Run with coverage
pnpm test:v2:coverage

# Run once (CI mode)
pnpm test:v2:run

# Watch mode
pnpm test:v2:watch
```

### Specific Test Categories

```bash
# Run only unit tests
pnpm test:v2 tests/v2/unit

# Run only integration tests
pnpm test:v2 tests/v2/integration

# Run specific test file
pnpm test:v2 tests/v2/unit/config-manager.test.ts
```

## Test Configuration

The v2 test framework uses `vitest.config.v2.ts` with enhanced settings:

- **Strict coverage thresholds**: 85% minimum across all metrics
- **Isolated execution**: Each test runs in a separate fork
- **Enhanced reporting**: JSON, HTML, and JUnit output
- **Performance monitoring**: Built-in timing and resource tracking
- **Advanced aliases**: Simplified imports with `@helpers`, `@fixtures`, etc.

## Writing Tests

### Using Mock Factory

```typescript
import { MockFactory } from '@helpers'

// Create comprehensive mock suite
const mockSuite = MockFactory.createCCJKMockSuite({
  platform: 'linux',
  hasClaudeCode: true,
  hasConfig: true,
  apiKey: 'test-key',
})

// Create specific mocks
const tinyexecMock = MockFactory.createTinyexecMock({
  stdout: 'success',
  exitCode: 0,
})
```

### Using Test Data Generator

```typescript
import { TestDataGenerator } from '@helpers'

// Generate realistic test data
const config = TestDataGenerator.generateCCJKConfig({
  apiProvider: '302.AI',
  debugMode: true,
})

const workflow = TestDataGenerator.generateWorkflowConfig({
  category: 'advanced',
  steps: [/* custom steps */],
})
```

### Using Assertion Helpers

```typescript
import { AssertionHelpers } from '@helpers'

// Enhanced assertions
AssertionHelpers.expectValidConfig(config)
AssertionHelpers.expectArrayLength(results, 5)
AssertionHelpers.expectCompletesWithinTime(
  () => operation(),
  1000 // max 1 second
)
```

## Test Environment

### Automatic Setup

Each test gets:
- **Isolated temp directory**: `/tmp/ccjk-v2-tests-{timestamp}/{test-name}`
- **Clean environment variables**: Test-specific env vars
- **Mocked external dependencies**: File system, commands, prompts
- **Automatic cleanup**: Temp files removed after tests

### Environment Variables

```bash
NODE_ENV=test
CCJK_TEST_MODE=v2
CCJK_LOG_LEVEL=silent
CCJK_TEST_TEMP_DIR=/tmp/ccjk-v2-tests-{timestamp}
CCJK_DISABLE_ANALYTICS=true
CCJK_DISABLE_UPDATE_CHECK=true
CCJK_DISABLE_TELEMETRY=true
```

## Coverage Requirements

The v2 framework enforces strict coverage thresholds:

| Metric | Minimum | Target |
|--------|---------|--------|
| Lines | 85% | 95% |
| Functions | 85% | 95% |
| Branches | 85% | 95% |
| Statements | 85% | 95% |

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Text**: Console output during test runs
- **HTML**: `./coverage/v2/index.html` for detailed browsing
- **JSON**: `./coverage/v2/coverage-final.json` for CI integration
- **LCOV**: `./coverage/v2/lcov.info` for external tools

## Performance Monitoring

### Built-in Performance Tracking

Tests automatically track:
- **Execution time**: Per test and overall suite
- **Memory usage**: Peak memory consumption
- **Resource utilization**: CPU and I/O metrics

### Performance Assertions

```typescript
// Ensure operations complete within time limits
await AssertionHelpers.expectCompletesWithinTime(
  () => heavyOperation(),
  5000 // 5 seconds max
)

// Verify performance metrics
AssertionHelpers.expectPerformanceWithinBounds(
  metrics,
  { maxDuration: 1000, maxMemory: 50 * 1024 * 1024 }
)
```

## Best Practices

### Test Organization

1. **One test file per module**: Keep tests focused and maintainable
2. **Descriptive test names**: Use clear, specific descriptions
3. **Arrange-Act-Assert**: Follow AAA pattern consistently
4. **Mock external dependencies**: Isolate units under test

### Mock Usage

1. **Use MockFactory**: Consistent mock creation across tests
2. **Reset mocks**: Clean up between tests with `MockFactory.resetAllMocks()`
3. **Verify interactions**: Use `MockVerifier` for call verification
4. **Realistic data**: Use `TestDataGenerator` for test data

### Performance Considerations

1. **Set time limits**: Use `expectCompletesWithinTime` for critical operations
2. **Monitor resource usage**: Track memory and CPU in integration tests
3. **Parallel execution**: Design tests to run concurrently when possible
4. **Cleanup resources**: Ensure proper cleanup to prevent memory leaks

## Debugging Tests

### Debug Mode

```bash
# Run with debug output
CCJK_LOG_LEVEL=debug pnpm test:v2

# Run specific test with debugging
pnpm test:v2 --reporter=verbose tests/v2/unit/config-manager.test.ts
```

### Test Isolation

Each test runs in isolation with:
- **Separate temp directory**: No file system conflicts
- **Clean environment**: Fresh environment variables
- **Mocked dependencies**: Predictable external interactions

### Common Issues

1. **Mock not reset**: Use `MockFactory.resetAllMocks()` in `afterEach`
2. **Async timing**: Use proper `await` for async operations
3. **File system conflicts**: Tests use isolated temp directories
4. **Environment pollution**: Tests restore original environment

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run CCJK v2.0 Tests
  run: pnpm test:v2:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/v2/lcov.info
```

### Coverage Reporting

The framework generates JUnit XML for CI integration:
```bash
# Coverage report location
./coverage/v2/junit.xml
```

## Contributing

When adding new tests:

1. **Follow naming conventions**: `*.test.ts` for unit tests
2. **Use provided helpers**: Leverage MockFactory and TestDataGenerator
3. **Maintain coverage**: Ensure new code meets 85% threshold
4. **Add integration tests**: Test component interactions
5. **Document complex tests**: Add comments for complex test logic

## Troubleshooting

### Common Errors

1. **Coverage below threshold**: Add tests for uncovered code paths
2. **Test timeouts**: Increase timeout or optimize test performance
3. **Mock conflicts**: Ensure proper mock cleanup between tests
4. **File system errors**: Check temp directory permissions

### Getting Help

- Check existing test examples in `tests/v2/unit/` and `tests/v2/integration/`
- Review helper utilities in `tests/v2/helpers/`
- Examine test fixtures in `tests/v2/fixtures/`
- Run tests with `--reporter=verbose` for detailed output