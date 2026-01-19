# Test Generator | 测试生成器

A skill for generating high-quality tests following best practices for Jest/Vitest.

一个遵循 Jest/Vitest 最佳实践生成高质量测试的技能。

## When to Apply | 何时应用

- When writing new tests for existing code | 为现有代码编写新测试时
- When implementing TDD workflow | 实施 TDD 工作流时
- When improving test coverage | 提高测试覆盖率时
- When refactoring tests | 重构测试时
- When reviewing test quality | 审查测试质量时

## Overview | 概述

This skill helps you write comprehensive, maintainable tests following industry best practices. It analyzes your code and suggests appropriate test cases with proper structure.

此技能帮助您遵循行业最佳实践编写全面、可维护的测试。它分析您的代码并建议具有适当结构的测试用例。

## Test File Naming | 测试文件命名

```
source.ts        → source.test.ts       (unit tests | 单元测试)
source.ts        → source.spec.ts       (alternative | 替代方案)
source.ts        → source.edge.test.ts  (edge cases | 边界情况)
source.ts        → source.integration.test.ts (integration | 集成测试)
```

---

## Rules | 规则

### `test-001`: Follow AAA Pattern | 遵循 AAA 模式

**Priority | 优先级**: CRITICAL | 关键

Always structure tests using Arrange-Act-Assert pattern for clarity and maintainability.

始终使用 Arrange-Act-Assert 模式构建测试，以提高清晰度和可维护性。

**❌ Bad | 错误示例:**
```typescript
test('calculates total', () => {
  expect(calculateTotal([{ price: 10, qty: 2 }, { price: 5, qty: 3 }])).toBe(35);
});
```

**✅ Good | 正确示例:**
```typescript
test('calculates total price for multiple items', () => {
  // Arrange | 准备
  const items = [
    { price: 10, qty: 2 },
    { price: 5, qty: 3 }
  ];

  // Act | 执行
  const result = calculateTotal(items);

  // Assert | 断言
  expect(result).toBe(35);
});
```

### `test-002`: One Assertion Per Concept | 每个概念一个断言

**Priority | 优先级**: HIGH | 高

Each test should verify one specific behavior. Multiple assertions are OK if they test the same concept.

每个测试应验证一个特定行为。如果测试同一概念，多个断言是可以的。

**❌ Bad | 错误示例:**
```typescript
test('user service', () => {
  const user = createUser('John');
  expect(user.name).toBe('John');
  expect(user.id).toBeDefined();

  const updated = updateUser(user.id, { name: 'Jane' });
  expect(updated.name).toBe('Jane');

  deleteUser(user.id);
  expect(getUser(user.id)).toBeNull();
});
```

**✅ Good | 正确示例:**
```typescript
describe('UserService', () => {
  test('creates user with provided name', () => {
    const user = createUser('John');

    expect(user.name).toBe('John');
    expect(user.id).toBeDefined();
  });

  test('updates user name', () => {
    const user = createUser('John');

    const updated = updateUser(user.id, { name: 'Jane' });

    expect(updated.name).toBe('Jane');
  });

  test('deletes user', () => {
    const user = createUser('John');

    deleteUser(user.id);

    expect(getUser(user.id)).toBeNull();
  });
});
```

### `test-003`: Use Descriptive Test Names | 使用描述性测试名称

**Priority | 优先级**: HIGH | 高

Test names should describe the expected behavior, not the implementation.

测试名称应描述预期行为，而不是实现细节。

**❌ Bad | 错误示例:**
```typescript
test('test1', () => { ... });
test('calculateTotal', () => { ... });
test('it works', () => { ... });
```

**✅ Good | 正确示例:**
```typescript
test('returns zero for empty cart', () => { ... });
test('calculates total with tax for US customers', () => { ... });
test('throws error when quantity is negative', () => { ... });
```

**Naming Pattern | 命名模式:**
```
should [expected behavior] when [condition]
[action] [expected result] for [scenario]
```

### `test-004`: Isolate Tests | 隔离测试

**Priority | 优先级**: CRITICAL | 关键

Tests must be independent and not rely on execution order or shared state.

测试必须独立，不依赖执行顺序或共享状态。

**❌ Bad | 错误示例:**
```typescript
let counter = 0;

test('increments counter', () => {
  counter++;
  expect(counter).toBe(1);
});

test('counter is now 1', () => {
  expect(counter).toBe(1); // Depends on previous test!
});
```

**✅ Good | 正确示例:**
```typescript
describe('Counter', () => {
  let counter: Counter;

  beforeEach(() => {
    counter = new Counter(); // Fresh instance for each test
  });

  test('starts at zero', () => {
    expect(counter.value).toBe(0);
  });

  test('increments by one', () => {
    counter.increment();
    expect(counter.value).toBe(1);
  });
});
```

### `test-005`: Mock External Dependencies | 模拟外部依赖

**Priority | 优先级**: HIGH | 高

Mock external services, APIs, databases, and file systems to ensure test reliability.

模拟外部服务、API、数据库和文件系统以确保测试可靠性。

**❌ Bad | 错误示例:**
```typescript
test('fetches user data', async () => {
  // Actually calls the API - slow, flaky, requires network
  const user = await fetchUser(123);
  expect(user.name).toBe('John');
});
```

**✅ Good | 正确示例:**
```typescript
import { vi } from 'vitest';

test('fetches user data', async () => {
  // Arrange
  const mockUser = { id: 123, name: 'John' };
  vi.spyOn(api, 'get').mockResolvedValue(mockUser);

  // Act
  const user = await fetchUser(123);

  // Assert
  expect(user.name).toBe('John');
  expect(api.get).toHaveBeenCalledWith('/users/123');
});
```

**Mock Patterns | 模拟模式:**

```typescript
// Function mock | 函数模拟
const mockFn = vi.fn().mockReturnValue('result');

// Module mock | 模块模拟
vi.mock('./database', () => ({
  query: vi.fn().mockResolvedValue([])
}));

// Spy on existing method | 监视现有方法
vi.spyOn(object, 'method').mockImplementation(() => 'mocked');

// Restore mocks | 恢复模拟
afterEach(() => {
  vi.restoreAllMocks();
});
```

### `test-006`: Test Edge Cases | 测试边界情况

**Priority | 优先级**: HIGH | 高

Always test boundary conditions, error cases, and unusual inputs.

始终测试边界条件、错误情况和异常输入。

**Edge Cases Checklist | 边界情况清单:**

| Category | Cases to Test |
|----------|---------------|
| **Empty/Null** | `null`, `undefined`, `''`, `[]`, `{}` |
| **Boundaries** | `0`, `-1`, `MAX_INT`, `MIN_INT` |
| **Types** | Wrong types, type coercion |
| **Async** | Timeouts, race conditions, rejections |
| **Strings** | Unicode, special chars, very long strings |
| **Arrays** | Empty, single item, duplicates, sorted/unsorted |

**✅ Good Edge Case Tests | 正确的边界情况测试:**

```typescript
describe('divide', () => {
  test('divides two positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  test('throws error when dividing by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });

  test('handles negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5);
    expect(divide(10, -2)).toBe(-5);
    expect(divide(-10, -2)).toBe(5);
  });

  test('handles decimal results', () => {
    expect(divide(1, 3)).toBeCloseTo(0.333, 2);
  });

  test('handles very large numbers', () => {
    expect(divide(Number.MAX_SAFE_INTEGER, 1)).toBe(Number.MAX_SAFE_INTEGER);
  });
});
```

### `test-007`: Maintain Test Coverage | 维护测试覆盖率

**Priority | 优先级**: MEDIUM | 中

Aim for meaningful coverage, not just high percentages.

追求有意义的覆盖率，而不仅仅是高百分比。

**Coverage Guidelines | 覆盖率指南:**

| Metric | Target | Description |
|--------|--------|-------------|
| **Lines** | ≥80% | Lines of code executed |
| **Functions** | ≥80% | Functions called |
| **Branches** | ≥75% | If/else paths taken |
| **Statements** | ≥80% | Statements executed |

**Coverage Commands | 覆盖率命令:**

```bash
# Generate coverage report | 生成覆盖率报告
pnpm test:coverage

# View HTML report | 查看 HTML 报告
open coverage/index.html

# Check coverage thresholds | 检查覆盖率阈值
vitest run --coverage --coverage.thresholds.lines=80
```

**vitest.config.ts:**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
```

---

## Unit Tests | 单元测试

### Definition | 定义

Unit tests verify individual functions or classes in isolation.

单元测试验证独立的函数或类。

### Characteristics | 特征

- **Fast** | 快速: Execute in milliseconds | 毫秒级执行
- **Isolated** | 隔离: No external dependencies | 无外部依赖
- **Deterministic** | 确定性: Same input = same output | 相同输入 = 相同输出
- **Focused** | 聚焦: Test one thing | 测试一件事

### Example | 示例

```typescript
// src/utils/string.ts
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// src/utils/string.test.ts
import { describe, test, expect } from 'vitest';
import { capitalize } from './string';

describe('capitalize', () => {
  test('capitalizes first letter of lowercase string', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  test('lowercases rest of string', () => {
    expect(capitalize('HELLO')).toBe('Hello');
  });

  test('returns empty string for empty input', () => {
    expect(capitalize('')).toBe('');
  });

  test('handles single character', () => {
    expect(capitalize('a')).toBe('A');
  });

  test('handles mixed case', () => {
    expect(capitalize('hELLo WoRLD')).toBe('Hello world');
  });
});
```

---

## Integration Tests | 集成测试

### Definition | 定义

Integration tests verify that multiple units work together correctly.

集成测试验证多个单元是否正确协同工作。

### Characteristics | 特征

- **Broader scope** | 更广范围: Test module interactions | 测试模块交互
- **May use real dependencies** | 可能使用真实依赖: Database, file system | 数据库、文件系统
- **Slower than unit tests** | 比单元测试慢
- **Test workflows** | 测试工作流

### Example | 示例

```typescript
// tests/integration/user-workflow.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase, cleanupTestDatabase } from '../helpers/db';
import { UserService } from '../../src/services/user';
import { EmailService } from '../../src/services/email';

describe('User Registration Workflow', () => {
  let db: TestDatabase;
  let userService: UserService;
  let emailService: EmailService;

  beforeAll(async () => {
    db = await createTestDatabase();
    emailService = new EmailService({ testMode: true });
    userService = new UserService(db, emailService);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  test('registers user and sends welcome email', async () => {
    // Arrange
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'securePassword123'
    };

    // Act
    const user = await userService.register(userData);

    // Assert
    expect(user.id).toBeDefined();
    expect(user.email).toBe(userData.email);

    const savedUser = await db.users.findById(user.id);
    expect(savedUser).toBeDefined();

    const sentEmails = emailService.getSentEmails();
    expect(sentEmails).toContainEqual(
      expect.objectContaining({
        to: userData.email,
        subject: 'Welcome!'
      })
    );
  });
});
```

---

## Mock Usage Rules | Mock 使用规则

### When to Mock | 何时使用 Mock

| Scenario | Mock? | Reason |
|----------|-------|--------|
| External API calls | ✅ Yes | Avoid network dependency |
| Database queries | ✅ Yes (unit) / ❌ No (integration) | Depends on test type |
| File system | ✅ Yes | Avoid side effects |
| Time/Date | ✅ Yes | Ensure determinism |
| Pure functions | ❌ No | No side effects |
| Internal modules | ⚠️ Sometimes | Only if complex |

### Mock Best Practices | Mock 最佳实践

```typescript
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

describe('OrderService', () => {
  // Setup mocks before each test | 每个测试前设置 mock
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15'));
  });

  // Cleanup after each test | 每个测试后清理
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('creates order with current timestamp', () => {
    const order = createOrder({ items: [] });

    expect(order.createdAt).toEqual(new Date('2024-01-15'));
  });
});
```

### Mock Patterns | Mock 模式

**1. Return Value Mock | 返回值模拟:**
```typescript
const mockGetUser = vi.fn().mockReturnValue({ id: 1, name: 'John' });
```

**2. Async Mock | 异步模拟:**
```typescript
const mockFetch = vi.fn()
  .mockResolvedValueOnce({ data: 'first' })
  .mockResolvedValueOnce({ data: 'second' })
  .mockRejectedValueOnce(new Error('Network error'));
```

**3. Implementation Mock | 实现模拟:**
```typescript
const mockCalculate = vi.fn().mockImplementation((a, b) => a + b);
```

**4. Partial Mock | 部分模拟:**
```typescript
vi.mock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return {
    ...actual,
    riskyFunction: vi.fn().mockReturnValue('safe')
  };
});
```

---

## Test Coverage Rules | 测试覆盖率规则

### Coverage Strategy | 覆盖率策略

```
┌─────────────────────────────────────────────────────────────────┐
│                    Test Coverage Pyramid                         │
│                    测试覆盖率金字塔                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                         /\                                       │
│                        /  \                                      │
│                       / E2E \        (少量 | Few)                │
│                      /──────\                                    │
│                     /        \                                   │
│                    / Integration \   (适量 | Some)               │
│                   /──────────────\                               │
│                  /                \                              │
│                 /    Unit Tests    \  (大量 | Many)              │
│                /────────────────────\                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### What to Cover | 覆盖什么

**High Priority | 高优先级:**
- Business logic | 业务逻辑
- Data transformations | 数据转换
- Error handling | 错误处理
- Edge cases | 边界情况
- Public APIs | 公共 API

**Lower Priority | 低优先级:**
- Simple getters/setters | 简单的 getter/setter
- Framework boilerplate | 框架样板代码
- Third-party library wrappers | 第三方库包装器

### Coverage Configuration | 覆盖率配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/types/**',
        'src/index.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
```

---

## AAA Pattern Examples | AAA 模式示例

### Basic Example | 基础示例

```typescript
test('filters active users', () => {
  // Arrange - Set up test data | 准备 - 设置测试数据
  const users = [
    { id: 1, name: 'Alice', active: true },
    { id: 2, name: 'Bob', active: false },
    { id: 3, name: 'Charlie', active: true }
  ];

  // Act - Execute the function | 执行 - 执行函数
  const activeUsers = filterActiveUsers(users);

  // Assert - Verify the result | 断言 - 验证结果
  expect(activeUsers).toHaveLength(2);
  expect(activeUsers.map(u => u.name)).toEqual(['Alice', 'Charlie']);
});
```

### Async Example | 异步示例

```typescript
test('fetches and transforms user data', async () => {
  // Arrange
  const mockResponse = { id: 1, first_name: 'John', last_name: 'Doe' };
  vi.spyOn(api, 'fetchUser').mockResolvedValue(mockResponse);

  // Act
  const user = await getUserProfile(1);

  // Assert
  expect(user).toEqual({
    id: 1,
    fullName: 'John Doe'
  });
});
```

### Error Handling Example | 错误处理示例

```typescript
test('throws validation error for invalid email', () => {
  // Arrange
  const invalidData = { email: 'not-an-email', name: 'Test' };

  // Act & Assert
  expect(() => validateUser(invalidData)).toThrow('Invalid email format');
});

test('rejects with specific error for network failure', async () => {
  // Arrange
  vi.spyOn(api, 'fetch').mockRejectedValue(new Error('Network error'));

  // Act & Assert
  await expect(fetchData()).rejects.toThrow('Network error');
});
```

---

## Edge Case Testing | 边界情况测试

### Comprehensive Edge Case Template | 全面的边界情况模板

```typescript
describe('processInput', () => {
  describe('null and undefined handling | 空值处理', () => {
    test('handles null input', () => {
      expect(processInput(null)).toBe(defaultValue);
    });

    test('handles undefined input', () => {
      expect(processInput(undefined)).toBe(defaultValue);
    });
  });

  describe('empty values | 空值', () => {
    test('handles empty string', () => {
      expect(processInput('')).toBe(defaultValue);
    });

    test('handles empty array', () => {
      expect(processInput([])).toEqual([]);
    });

    test('handles empty object', () => {
      expect(processInput({})).toEqual({});
    });
  });

  describe('boundary values | 边界值', () => {
    test('handles zero', () => {
      expect(processNumber(0)).toBe(0);
    });

    test('handles negative numbers', () => {
      expect(processNumber(-1)).toBe(-1);
    });

    test('handles maximum safe integer', () => {
      expect(processNumber(Number.MAX_SAFE_INTEGER)).toBeDefined();
    });

    test('handles minimum safe integer', () => {
      expect(processNumber(Number.MIN_SAFE_INTEGER)).toBeDefined();
    });
  });

  describe('special characters | 特殊字符', () => {
    test('handles unicode characters', () => {
      expect(processString('你好世界')).toBe('你好世界');
    });

    test('handles emoji', () => {
      expect(processString('Hello 👋')).toBe('Hello 👋');
    });

    test('handles special characters', () => {
      expect(processString('<script>alert("xss")</script>')).toBe(escaped);
    });
  });

  describe('error conditions | 错误条件', () => {
    test('throws for invalid type', () => {
      expect(() => processInput(123 as any)).toThrow(TypeError);
    });

    test('throws for circular reference', () => {
      const circular: any = {};
      circular.self = circular;
      expect(() => processInput(circular)).toThrow('Circular reference');
    });
  });
});
```

---

## Workflow | 工作流

### Step 1: Analyze Code | 分析代码

```bash
# Identify functions to test | 识别要测试的函数
# Look for:
# - Public functions | 公共函数
# - Complex logic | 复杂逻辑
# - Error handling | 错误处理
# - Edge cases | 边界情况
```

### Step 2: Plan Test Cases | 规划测试用例

```
Function: calculateDiscount(price, discountPercent)

Test Cases:
1. Normal case: 100, 10 → 90
2. Zero discount: 100, 0 → 100
3. Full discount: 100, 100 → 0
4. Edge: negative price → throw
5. Edge: discount > 100 → throw
6. Edge: decimal values → correct rounding
```

### Step 3: Write Tests First (TDD) | 先写测试 (TDD)

```typescript
describe('calculateDiscount', () => {
  test('applies percentage discount to price', () => {
    expect(calculateDiscount(100, 10)).toBe(90);
  });

  test('returns original price for zero discount', () => {
    expect(calculateDiscount(100, 0)).toBe(100);
  });

  // ... more tests
});
```

### Step 4: Implement & Refactor | 实现和重构

```
Red → Green → Refactor
红 → 绿 → 重构

1. Write failing test (Red) | 写失败的测试（红）
2. Write minimal code to pass (Green) | 写最少代码通过（绿）
3. Refactor while keeping tests green | 重构同时保持测试通过
```

### Step 5: Verify Coverage | 验证覆盖率

```bash
pnpm test:coverage
```

---

## Integration | 集成

This skill works best with:

- **Jest/Vitest** for test execution | 测试执行
- **@testing-library** for component testing | 组件测试
- **MSW** for API mocking | API 模拟
- **Faker.js** for test data generation | 测试数据生成
- **CI/CD pipelines** for automated testing | 自动化测试
