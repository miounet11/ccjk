---
name: ts-best-practices
description: TypeScript 5.3+ best practices and patterns for type-safe development
description_zh: TypeScript 5.3+ 最佳实践和类型安全开发模式
version: 1.0.0
category: programming
triggers: ['/ts-best-practices', '/typescript', '/ts-patterns']
use_when:
  - Writing TypeScript code with strict typing
  - Implementing generic constraints and utility types
  - Optimizing TypeScript performance and maintainability
  - Code review for TypeScript projects
use_when_zh:
  - 编写严格类型的 TypeScript 代码
  - 实现泛型约束和工具类型
  - 优化 TypeScript 性能和可维护性
  - TypeScript 项目代码审查
auto_activate: true
priority: 8
agents: [typescript-expert, code-reviewer]
tags: [typescript, types, generics, patterns, best-practices]
---

# TypeScript Best Practices | TypeScript 最佳实践

## Context | 上下文

Use this skill when working with TypeScript 5.3+ projects that require strict typing, performance optimization, and maintainable code architecture. Essential for enterprise-grade TypeScript development.

在使用 TypeScript 5.3+ 项目时使用此技能，需要严格类型、性能优化和可维护的代码架构。对于企业级 TypeScript 开发至关重要。

## Best Practices | 最佳实践

### 1. Strict Type Configuration | 严格类型配置

```typescript
// tsconfig.json - Recommended strict settings
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  }
}
```

### 2. Generic Constraints | 泛型约束

```typescript
// ✅ Good: Proper generic constraints
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
}

// ✅ Good: Conditional types with constraints
type ApiResponse<T> = T extends string
  ? { message: T }
  : { data: T };

// ❌ Bad: Unconstrained generics
interface BadRepository<T> {
  findById(id: string): Promise<T | null>; // T could be anything
}
```

### 3. Utility Types Usage | 工具类型使用

```typescript
// ✅ Good: Leverage built-in utility types
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

type PublicUser = Omit<User, 'password'>;
type UserUpdate = Partial<Pick<User, 'name' | 'email'>>;
type CreateUser = Omit<User, 'id'>;

// ✅ Good: Custom utility types
type NonNullable<T> = T extends null | undefined ? never : T;
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```

### 4. Type Guards and Assertions | 类型守卫和断言

```typescript
// ✅ Good: Type guards
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' &&
         obj !== null &&
         'id' in obj &&
         'name' in obj;
}

// ✅ Good: Assertion functions
function assertIsNumber(value: unknown): asserts value is number {
  if (typeof value !== 'number') {
    throw new Error('Expected number');
  }
}
```

## Common Patterns | 常用模式

### 1. Builder Pattern with Types | 带类型的建造者模式

```typescript
class QueryBuilder<T> {
  private conditions: Array<(item: T) => boolean> = [];

  where<K extends keyof T>(
    key: K,
    value: T[K]
  ): QueryBuilder<T> {
    this.conditions.push(item => item[key] === value);
    return this;
  }

  build(): (items: T[]) => T[] {
    return items => items.filter(item =>
      this.conditions.every(condition => condition(item))
    );
  }
}

// Usage
const userFilter = new QueryBuilder<User>()
  .where('status', 'active')
  .where('role', 'admin')
  .build();
```

### 2. Event System with Type Safety | 类型安全的事件系统

```typescript
interface EventMap {
  'user:created': { user: User };
  'user:updated': { user: User; changes: Partial<User> };
  'user:deleted': { userId: string };
}

class TypedEventEmitter<T extends Record<string, any>> {
  private listeners: {
    [K in keyof T]?: Array<(data: T[K]) => void>;
  } = {};

  on<K extends keyof T>(
    event: K,
    listener: (data: T[K]) => void
  ): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.listeners[event]?.forEach(listener => listener(data));
  }
}

// Usage with full type safety
const emitter = new TypedEventEmitter<EventMap>();
emitter.on('user:created', ({ user }) => {
  console.log(`User ${user.name} created`); // ✅ Type-safe
});
```

### 3. Branded Types for Domain Safety | 领域安全的品牌类型

```typescript
// ✅ Good: Branded types prevent mixing different IDs
type UserId = string & { readonly brand: unique symbol };
type ProductId = string & { readonly brand: unique symbol };

function createUserId(id: string): UserId {
  return id as UserId;
}

function createProductId(id: string): ProductId {
  return id as ProductId;
}

function getUser(id: UserId): Promise<User> {
  // Implementation
}

// This prevents accidental ID mixing
const userId = createUserId('user-123');
const productId = createProductId('product-456');

getUser(userId); // ✅ Works
getUser(productId); // ❌ Type error - prevents bugs
```

## Anti-Patterns | 反模式

### 1. Avoid `any` and Type Assertions | 避免 `any` 和类型断言

```typescript
// ❌ Bad: Using any
function processData(data: any): any {
  return data.someProperty;
}

// ❌ Bad: Unsafe type assertions
const user = data as User; // Could fail at runtime

// ✅ Good: Proper typing with validation
function processData<T extends { someProperty: unknown }>(
  data: T
): T['someProperty'] {
  return data.someProperty;
}

// ✅ Good: Safe type assertions with validation
function isUser(data: unknown): data is User {
  return typeof data === 'object' &&
         data !== null &&
         'id' in data;
}

const user = isUser(data) ? data : null;
```

### 2. Avoid Overly Complex Types | 避免过于复杂的类型

```typescript
// ❌ Bad: Overly complex type that's hard to understand
type ComplexType<T> = T extends infer U
  ? U extends Record<string, any>
    ? { [K in keyof U]: U[K] extends Function
        ? ReturnType<U[K]> extends Promise<infer R>
          ? R extends object
            ? ComplexType<R>
            : never
          : never
        : never }
    : never
  : never;

// ✅ Good: Break down complex types into smaller, named pieces
type AsyncReturnType<T> = T extends (...args: any[]) => Promise<infer R>
  ? R
  : never;

type FunctionProperties<T> = {
  [K in keyof T]: T[K] extends Function ? T[K] : never;
};

type ExtractAsyncReturns<T> = {
  [K in keyof FunctionProperties<T>]: AsyncReturnType<T[K]>;
};
```

### 3. Avoid Mutation of Readonly Types | 避免修改只读类型

```typescript
// ❌ Bad: Mutating readonly arrays
function badSort(items: readonly number[]): readonly number[] {
  return items.sort(); // Mutates the original array!
}

// ✅ Good: Create new arrays for readonly inputs
function goodSort(items: readonly number[]): readonly number[] {
  return [...items].sort();
}

// ✅ Good: Use proper readonly patterns
interface ReadonlyConfig {
  readonly apiUrl: string;
  readonly timeout: number;
  readonly features: readonly string[];
}
```

## Performance Tips | 性能提示

### 1. Use Type-Only Imports | 使用仅类型导入

```typescript
// ✅ Good: Type-only imports don't affect bundle size
import type { User, ApiResponse } from './types';
import { validateUser } from './validators';

// ❌ Bad: Importing types as values
import { User, ApiResponse, validateUser } from './module';
```

### 2. Optimize Conditional Types | 优化条件类型

```typescript
// ✅ Good: Efficient conditional type
type IsArray<T> = T extends readonly any[] ? true : false;

// ❌ Bad: Inefficient nested conditionals
type BadIsArray<T> = T extends any[]
  ? true
  : T extends readonly any[]
    ? true
    : false;
```

### 3. Use Template Literal Types Wisely | 明智使用模板字面量类型

```typescript
// ✅ Good: Reasonable template literal usage
type EventName = `on${Capitalize<string>}`;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiEndpoint = `/${string}`;

// ❌ Bad: Overly complex template literals that slow compilation
type BadComplexTemplate<T extends Record<string, any>> = {
  [K in keyof T as `get${Capitalize<string & K>}From${Capitalize<string>}With${Capitalize<string>}`]: T[K];
};
```

## Code Quality Checklist | 代码质量检查清单

- [ ] All functions have explicit return types
- [ ] Generic constraints are properly defined
- [ ] No usage of `any` or unsafe type assertions
- [ ] Proper error handling with typed errors
- [ ] Type guards are used for runtime validation
- [ ] Utility types are leveraged appropriately
- [ ] Complex types are broken down into smaller pieces
- [ ] Type-only imports are used where possible
- [ ] Branded types are used for domain safety
- [ ] Performance implications of types are considered

## 代码质量检查清单

- [ ] 所有函数都有明确的返回类型
- [ ] 泛型约束定义正确
- [ ] 不使用 `any` 或不安全的类型断言
- [ ] 使用类型化错误进行适当的错误处理
- [ ] 使用类型守卫进行运行时验证
- [ ] 适当利用工具类型
- [ ] 复杂类型被分解为更小的部分
- [ ] 在可能的地方使用仅类型导入
- [ ] 使用品牌类型确保领域安全
- [ ] 考虑类型的性能影响