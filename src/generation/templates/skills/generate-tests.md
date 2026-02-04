# Generate Tests

Automatically generate comprehensive unit tests for TypeScript/JavaScript code.

## Triggers

- **command**: `/test` - Trigger with slash command
- **pattern**: `generate tests for` - Natural language trigger
- **pattern**: `生成测试` - Chinese language trigger
- **pattern**: `write tests` - Alternative trigger

## Actions

### Action 1: prompt

Analyze the code and identify test scenarios.

```
Analyze the provided code and identify:

1. **Functions/Methods to Test**
   - Public API surface
   - Input parameters and types
   - Return values and types
   - Side effects

2. **Test Scenarios**
   - Happy path cases
   - Edge cases
   - Error cases
   - Boundary conditions

3. **Dependencies**
   - External dependencies to mock
   - Database interactions
   - API calls
   - File system operations
```

### Action 2: prompt

Generate comprehensive test suite.

```
Generate a complete test suite using Vitest with:

1. **Test Structure**
   - Descriptive test names
   - AAA pattern (Arrange, Act, Assert)
   - Proper test organization with describe blocks

2. **Test Coverage**
   - All public functions/methods
   - Happy path scenarios
   - Edge cases and error handling
   - Boundary conditions

3. **Best Practices**
   - Proper mocking of dependencies
   - Independent, isolated tests
   - Clear assertions
   - TypeScript types for test data

Example format:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  describe('methodName', () => {
    it('should handle happy path', () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle edge case', () => {
      // Test implementation
    });
  });
});
```
```

### Action 3: write

Write the generated tests to a file.

```
Write tests to: {filename}.test.ts
```

## Requirements

- **tool**: vitest - Vitest must be installed
- **context**: typescript-project - Must be a TypeScript project

---

**Category:** testing
**Priority:** 8
**Tags:** testing, unit-tests, vitest, automation, code-generation
**Source:** smart-analysis
