# TypeScript Expert | TypeScript 专家

A comprehensive skill for TypeScript best practices, type definitions, generics, and code quality guidelines.

TypeScript 最佳实践、类型定义、泛型和代码质量指南的综合技能包。

## When to Apply | 何时应用

- When writing TypeScript code | 编写 TypeScript 代码时
- When defining types and interfaces | 定义类型和接口时
- When using generics | 使用泛型时
- When reviewing TypeScript code | 审查 TypeScript 代码时
- When refactoring JavaScript to TypeScript | 将 JavaScript 重构为 TypeScript 时
- When configuring tsconfig.json | 配置 tsconfig.json 时

## Overview | 概述

This skill helps you write type-safe, maintainable TypeScript code following industry best practices. It covers type definitions, generics, type guards, utility types, and strict mode configurations.

本技能帮助您遵循行业最佳实践编写类型安全、可维护的 TypeScript 代码。涵盖类型定义、泛型、类型守卫、工具类型和严格模式配置。

---

## Type Definition Rules | 类型定义规则

### `ts-001`: Prefer `interface` for Object Types | 对象类型优先使用 `interface`

**Priority | 优先级**: HIGH | 高

Use `interface` for object types that may be extended. Use `type` for unions, intersections, and primitives.

对于可能被扩展的对象类型使用 `interface`。对于联合类型、交叉类型和原始类型使用 `type`。

**❌ Bad | 错误示例:**
```typescript
// Using type for extendable objects
type User = {
  id: string;
  name: string;
};

// Cannot be extended with declaration merging
type AdminUser = User & { role: string };
```

**✅ Good | 正确示例:**
```typescript
// Interface for extendable objects
interface User {
  id: string;
  name: string;
}

// Can be extended
interface AdminUser extends User {
  role: string;
}

// Use type for unions and complex types
type Status = 'pending' | 'active' | 'inactive';
type Result<T> = Success<T> | Failure;
```

### `ts-002`: Use Explicit Return Types for Public APIs | 公共 API 使用显式返回类型

**Priority | 优先级**: HIGH | 高

Always specify return types for exported functions and methods to ensure API stability.

始终为导出的函数和方法指定返回类型，以确保 API 稳定性。

**❌ Bad | 错误示例:**
```typescript
// Implicit return type - can change unexpectedly
export function getUser(id: string) {
  return db.users.find(u => u.id === id);
}

// Return type inferred as User | undefined, but not explicit
export const fetchData = async (url: string) => {
  const response = await fetch(url);
  return response.json();
};
```

**✅ Good | 正确示例:**
```typescript
// Explicit return type for API stability
export function getUser(id: string): User | undefined {
  return db.users.find(u => u.id === id);
}

// Clear async return type
export const fetchData = async (url: string): Promise<ApiResponse> => {
  const response = await fetch(url);
  return response.json();
};
```

### `ts-003`: Avoid `any`, Use `unknown` for Unknown Types | 避免 `any`，使用 `unknown` 处理未知类型

**Priority | 优先级**: CRITICAL | 关键

`any` disables type checking. Use `unknown` and narrow the type with type guards.

`any` 会禁用类型检查。使用 `unknown` 并通过类型守卫缩小类型范围。

**❌ Bad | 错误示例:**
```typescript
// any disables all type checking
function processData(data: any) {
  return data.value.nested.property; // No error, but may crash at runtime
}

// Catching errors with any
try {
  doSomething();
} catch (error: any) {
  console.log(error.message); // Unsafe
}
```

**✅ Good | 正确示例:**
```typescript
// unknown requires type narrowing
function processData(data: unknown): string {
  if (isValidData(data)) {
    return data.value;
  }
  throw new Error('Invalid data');
}

// Type guard for error handling
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

try {
  doSomething();
} catch (error: unknown) {
  if (isError(error)) {
    console.log(error.message); // Safe
  }
}
```

---

## Generics Rules | 泛型规则

### `ts-004`: Use Descriptive Generic Names | 使用描述性泛型名称

**Priority | 优先级**: MEDIUM | 中

Use meaningful names for generics beyond single letters when the purpose is not obvious.

当目的不明显时，使用有意义的泛型名称而不是单个字母。

**❌ Bad | 错误示例:**
```typescript
// Single letters are unclear for complex generics
function transform<T, U, V>(
  input: T,
  mapper: (item: T) => U,
  filter: (item: U) => V
): V[] {
  // ...
}

// What does K, V represent?
class Store<K, V> {
  private data: Map<K, V>;
}
```

**✅ Good | 正确示例:**
```typescript
// Descriptive names for clarity
function transform<TInput, TIntermediate, TOutput>(
  input: TInput,
  mapper: (item: TInput) => TIntermediate,
  filter: (item: TIntermediate) => TOutput
): TOutput[] {
  // ...
}

// Clear purpose
class Store<TKey, TValue> {
  private data: Map<TKey, TValue>;
}

// Simple cases can use T, K, V
function identity<T>(value: T): T {
  return value;
}
```

### `ts-005`: Use Generic Constraints | 使用泛型约束

**Priority | 优先级**: HIGH | 高

Constrain generics to ensure type safety and enable property access.

约束泛型以确保类型安全并启用属性访问。

**❌ Bad | 错误示例:**
```typescript
// No constraint - cannot access properties
function getLength<T>(item: T): number {
  return item.length; // Error: Property 'length' does not exist
}

// Too loose - accepts anything
function merge<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 }; // May fail if not objects
}
```

**✅ Good | 正确示例:**
```typescript
// Constrained to types with length
function getLength<T extends { length: number }>(item: T): number {
  return item.length; // Safe
}

// Constrained to objects
function merge<T extends object, U extends object>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

// Using keyof constraint
function getProperty<TObj, TKey extends keyof TObj>(obj: TObj, key: TKey): TObj[TKey] {
  return obj[key];
}
```

### `ts-006`: Provide Default Generic Types | 提供默认泛型类型

**Priority | 优先级**: MEDIUM | 中

Use default generic types to improve API ergonomics.

使用默认泛型类型来改善 API 人体工程学。

**❌ Bad | 错误示例:**
```typescript
// Always requires type argument
interface ApiResponse<T> {
  data: T;
  status: number;
}

// Must specify type even for simple cases
const response: ApiResponse<unknown> = await fetch('/api');
```

**✅ Good | 正确示例:**
```typescript
// Default type for common cases
interface ApiResponse<T = unknown> {
  data: T;
  status: number;
}

// Can omit type argument
const response: ApiResponse = await fetch('/api');

// Or specify when needed
const userResponse: ApiResponse<User> = await fetch('/api/user');
```

---

## Type Inference Rules | 类型推断规则

### `ts-007`: Let TypeScript Infer When Obvious | 明显时让 TypeScript 推断

**Priority | 优先级**: MEDIUM | 中

Don't add type annotations when TypeScript can infer the type correctly.

当 TypeScript 可以正确推断类型时，不要添加类型注解。

**❌ Bad | 错误示例:**
```typescript
// Redundant type annotations
const name: string = 'John';
const count: number = 42;
const isActive: boolean = true;
const users: User[] = [user1, user2];

// Redundant in arrow functions with context
const numbers = [1, 2, 3];
const doubled: number[] = numbers.map((n: number): number => n * 2);
```

**✅ Good | 正确示例:**
```typescript
// Let TypeScript infer obvious types
const name = 'John';
const count = 42;
const isActive = true;
const users = [user1, user2];

// Inference works in callbacks
const numbers = [1, 2, 3];
const doubled = numbers.map(n => n * 2);

// Add types when inference is unclear or for documentation
const config: AppConfig = loadConfig();
```

### `ts-008`: Use `const` Assertions for Literal Types | 使用 `const` 断言获取字面量类型

**Priority | 优先级**: MEDIUM | 中

Use `as const` to preserve literal types and create readonly structures.

使用 `as const` 保留字面量类型并创建只读结构。

**❌ Bad | 错误示例:**
```typescript
// Type is string[], not readonly tuple
const COLORS = ['red', 'green', 'blue'];

// Type is { method: string }, not literal
const config = {
  method: 'GET'
};

// Cannot use as discriminated union
function handleMethod(method: 'GET' | 'POST') {}
handleMethod(config.method); // Error: string is not assignable
```

**✅ Good | 正确示例:**
```typescript
// Type is readonly ['red', 'green', 'blue']
const COLORS = ['red', 'green', 'blue'] as const;

// Type is { readonly method: 'GET' }
const config = {
  method: 'GET'
} as const;

// Works with literal types
function handleMethod(method: 'GET' | 'POST') {}
handleMethod(config.method); // OK

// Create type from const
type Color = typeof COLORS[number]; // 'red' | 'green' | 'blue'
```

---

## Strict Mode Rules | 严格模式规则

### `ts-009`: Enable Strict Mode | 启用严格模式

**Priority | 优先级**: CRITICAL | 关键

Always enable strict mode in tsconfig.json for maximum type safety.

始终在 tsconfig.json 中启用严格模式以获得最大类型安全性。

**❌ Bad | 错误示例:**
```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false
  }
}
```

**✅ Good | 正确示例:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### `ts-010`: Handle Nullable Types Explicitly | 显式处理可空类型

**Priority | 优先级**: HIGH | 高

With `strictNullChecks`, handle null and undefined explicitly.

启用 `strictNullChecks` 后，显式处理 null 和 undefined。

**❌ Bad | 错误示例:**
```typescript
// Ignoring potential null
function getUser(id: string): User | null {
  return db.find(id);
}

const user = getUser('123');
console.log(user.name); // Error: Object is possibly null

// Using non-null assertion carelessly
console.log(user!.name); // Dangerous
```

**✅ Good | 正确示例:**
```typescript
function getUser(id: string): User | null {
  return db.find(id);
}

const user = getUser('123');

// Option 1: Early return / throw
if (!user) {
  throw new Error('User not found');
}
console.log(user.name); // Safe

// Option 2: Optional chaining
console.log(user?.name ?? 'Unknown');

// Option 3: Type narrowing
if (user !== null) {
  console.log(user.name); // Safe
}
```

---

## Type Guard Rules | 类型守卫规则

### `ts-011`: Create Custom Type Guards | 创建自定义类型守卫

**Priority | 优先级**: HIGH | 高

Use type predicates to create reusable type guards.

使用类型谓词创建可重用的类型守卫。

**❌ Bad | 错误示例:**
```typescript
// Inline type checking - not reusable
function processResponse(response: unknown) {
  if (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    'status' in response
  ) {
    // Still typed as unknown
    console.log(response.data);
  }
}
```

**✅ Good | 正确示例:**
```typescript
// Type guard with predicate
interface ApiResponse {
  data: unknown;
  status: number;
}

function isApiResponse(value: unknown): value is ApiResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'status' in value &&
    typeof (value as ApiResponse).status === 'number'
  );
}

function processResponse(response: unknown) {
  if (isApiResponse(response)) {
    // Correctly typed as ApiResponse
    console.log(response.data);
    console.log(response.status);
  }
}
```

### `ts-012`: Use Discriminated Unions | 使用可辨识联合

**Priority | 优先级**: HIGH | 高

Use a common property to discriminate between union members.

使用公共属性来区分联合成员。

**❌ Bad | 错误示例:**
```typescript
// No discriminant - hard to narrow
interface Success {
  data: string;
}

interface Failure {
  error: Error;
}

type Result = Success | Failure;

function handle(result: Result) {
  if ('data' in result) {
    // Works but fragile
  }
}
```

**✅ Good | 正确示例:**
```typescript
// Discriminated union with type property
interface Success {
  type: 'success';
  data: string;
}

interface Failure {
  type: 'failure';
  error: Error;
}

type Result = Success | Failure;

function handle(result: Result) {
  switch (result.type) {
    case 'success':
      console.log(result.data); // TypeScript knows it's Success
      break;
    case 'failure':
      console.error(result.error); // TypeScript knows it's Failure
      break;
  }
}

// Exhaustiveness checking
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}
```

---

## Utility Types | 工具类型

### `ts-013`: Use Built-in Utility Types | 使用内置工具类型

**Priority | 优先级**: MEDIUM | 中

Leverage TypeScript's built-in utility types instead of recreating them.

利用 TypeScript 的内置工具类型，而不是重新创建它们。

**❌ Bad | 错误示例:**
```typescript
// Recreating built-in types
interface PartialUser {
  id?: string;
  name?: string;
  email?: string;
}

// Manual readonly
interface ReadonlyUser {
  readonly id: string;
  readonly name: string;
}

// Manual pick
interface UserName {
  name: string;
}
```

**✅ Good | 正确示例:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

// Use Partial for optional properties
type PartialUser = Partial<User>;

// Use Readonly for immutable objects
type ReadonlyUser = Readonly<User>;

// Use Pick to select properties
type UserName = Pick<User, 'name'>;

// Use Omit to exclude properties
type UserWithoutId = Omit<User, 'id'>;

// Use Record for dictionaries
type UserMap = Record<string, User>;

// Use Required to make all properties required
type RequiredUser = Required<PartialUser>;

// Use ReturnType to extract function return type
type GetUserReturn = ReturnType<typeof getUser>;

// Use Parameters to extract function parameters
type GetUserParams = Parameters<typeof getUser>;
```

### `ts-014`: Create Custom Utility Types | 创建自定义工具类型

**Priority | 优先级**: MEDIUM | 中

Create reusable utility types for common patterns in your codebase.

为代码库中的常见模式创建可重用的工具类型。

**✅ Good Examples | 正确示例:**
```typescript
// Make specific properties optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make specific properties required
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Nullable type
type Nullable<T> = T | null;

// Non-nullable properties
type NonNullableProperties<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

// Extract array element type
type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

// Promise unwrap
type Awaited<T> = T extends Promise<infer U> ? U : T;
```

---

## Best Practices Summary | 最佳实践总结

| Rule | Priority | Description |
|------|----------|-------------|
| `ts-001` | HIGH | Prefer `interface` for object types | 对象类型优先使用 `interface` |
| `ts-002` | HIGH | Explicit return types for public APIs | 公共 API 使用显式返回类型 |
| `ts-003` | CRITICAL | Avoid `any`, use `unknown` | 避免 `any`，使用 `unknown` |
| `ts-004` | MEDIUM | Descriptive generic names | 描述性泛型名称 |
| `ts-005` | HIGH | Use generic constraints | 使用泛型约束 |
| `ts-006` | MEDIUM | Default generic types | 默认泛型类型 |
| `ts-007` | MEDIUM | Let TypeScript infer when obvious | 明显时让 TypeScript 推断 |
| `ts-008` | MEDIUM | Use `const` assertions | 使用 `const` 断言 |
| `ts-009` | CRITICAL | Enable strict mode | 启用严格模式 |
| `ts-010` | HIGH | Handle nullable types explicitly | 显式处理可空类型 |
| `ts-011` | HIGH | Create custom type guards | 创建自定义类型守卫 |
| `ts-012` | HIGH | Use discriminated unions | 使用可辨识联合 |
| `ts-013` | MEDIUM | Use built-in utility types | 使用内置工具类型 |
| `ts-014` | MEDIUM | Create custom utility types | 创建自定义工具类型 |

---

## Recommended tsconfig.json | 推荐的 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,

    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

---

## Integration | 集成

This skill works best with:

本技能与以下工具配合使用效果最佳：

- ESLint with `@typescript-eslint` plugin | ESLint 配合 `@typescript-eslint` 插件
- Prettier for code formatting | Prettier 用于代码格式化
- VS Code with TypeScript extension | VS Code 配合 TypeScript 扩展
- Type coverage tools like `type-coverage` | 类型覆盖工具如 `type-coverage`
