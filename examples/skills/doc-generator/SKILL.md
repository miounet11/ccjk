# Doc Generator | 文档生成器

A skill for generating high-quality documentation following best practices.

一个遵循最佳实践生成高质量文档的技能。

## When to Apply | 何时应用

- When writing code documentation | 编写代码文档时
- When creating README files | 创建 README 文件时
- When documenting APIs | 编写 API 文档时
- When adding code comments | 添加代码注释时
- When writing example code | 编写示例代码时

## Overview | 概述

This skill helps you write clear, consistent, and comprehensive documentation. It analyzes your code and suggests appropriate documentation patterns based on the language and context.

此技能帮助您编写清晰、一致且全面的文档。它分析您的代码并根据语言和上下文建议适当的文档模式。

---

## JSDoc/TSDoc Rules | JSDoc/TSDoc 规则

### `doc-001`: Document All Public APIs

**Priority**: CRITICAL | 优先级：关键

All public functions, classes, and interfaces must have documentation.

所有公共函数、类和接口必须有文档。

**❌ Bad:**
```typescript
export function calculateTotal(items, tax) {
    return items.reduce((sum, item) => sum + item.price, 0) * (1 + tax);
}
```

**✅ Good:**
```typescript
/**
 * Calculates the total price including tax.
 * 计算含税总价。
 *
 * @param items - Array of items with price property | 带有 price 属性的商品数组
 * @param tax - Tax rate as decimal (e.g., 0.1 for 10%) | 税率小数（如 0.1 表示 10%）
 * @returns Total price with tax applied | 应用税率后的总价
 *
 * @example
 * ```typescript
 * const items = [{ price: 100 }, { price: 200 }];
 * const total = calculateTotal(items, 0.1); // 330
 * ```
 */
export function calculateTotal(items: Item[], tax: number): number {
    return items.reduce((sum, item) => sum + item.price, 0) * (1 + tax);
}
```

### `doc-002`: Use Proper JSDoc Tags

**Priority**: HIGH | 优先级：高

Use standard JSDoc/TSDoc tags consistently.

一致地使用标准 JSDoc/TSDoc 标签。

| Tag | Usage | 用途 |
|-----|-------|------|
| `@param` | Function parameters | 函数参数 |
| `@returns` | Return value | 返回值 |
| `@throws` | Exceptions thrown | 抛出的异常 |
| `@example` | Usage examples | 使用示例 |
| `@deprecated` | Deprecated APIs | 已弃用的 API |
| `@see` | Related references | 相关引用 |
| `@since` | Version introduced | 引入版本 |
| `@template` | Generic type parameters | 泛型类型参数 |

**✅ Good:**
```typescript
/**
 * Fetches user data from the API.
 * 从 API 获取用户数据。
 *
 * @param userId - The unique user identifier | 用户唯一标识符
 * @returns Promise resolving to user data | 解析为用户数据的 Promise
 * @throws {NotFoundError} When user doesn't exist | 当用户不存在时
 * @throws {NetworkError} When API is unreachable | 当 API 无法访问时
 *
 * @example
 * ```typescript
 * try {
 *   const user = await fetchUser('123');
 *   console.log(user.name);
 * } catch (error) {
 *   handleError(error);
 * }
 * ```
 *
 * @see {@link updateUser} for modifying user data
 * @since 1.0.0
 */
export async function fetchUser(userId: string): Promise<User> {
    // implementation
}
```

### `doc-003`: Document Complex Types

**Priority**: HIGH | 优先级：高

Interfaces and type aliases should have property-level documentation.

接口和类型别名应该有属性级别的文档。

**❌ Bad:**
```typescript
interface Config {
    timeout: number;
    retries: number;
    baseUrl: string;
}
```

**✅ Good:**
```typescript
/**
 * Configuration options for the API client.
 * API 客户端的配置选项。
 */
interface Config {
    /**
     * Request timeout in milliseconds.
     * 请求超时时间（毫秒）。
     * @default 5000
     */
    timeout: number;

    /**
     * Number of retry attempts for failed requests.
     * 失败请求的重试次数。
     * @default 3
     */
    retries: number;

    /**
     * Base URL for all API requests.
     * 所有 API 请求的基础 URL。
     * @example "https://api.example.com/v1"
     */
    baseUrl: string;
}
```

---

## README Rules | README 规则

### `doc-004`: Include Essential Sections

**Priority**: CRITICAL | 优先级：关键

Every README should have these sections:

每个 README 应包含以下部分：

```markdown
# Project Name | 项目名称

Brief description of what the project does.
项目功能的简要描述。

## Installation | 安装

How to install the project.
如何安装项目。

## Quick Start | 快速开始

Minimal example to get started.
快速入门的最小示例。

## Usage | 使用方法

Detailed usage instructions.
详细的使用说明。

## API Reference | API 参考

Link to or include API documentation.
API 文档链接或内容。

## Contributing | 贡献

How to contribute to the project.
如何为项目做贡献。

## License | 许可证

Project license information.
项目许可证信息。
```

### `doc-005`: Lead with Value Proposition

**Priority**: HIGH | 优先级：高

Start README with what problem the project solves.

README 开头应说明项目解决什么问题。

**❌ Bad:**
```markdown
# MyLib

A JavaScript library.

## Installation
npm install mylib
```

**✅ Good:**
```markdown
# MyLib

> Simplify date manipulation with zero dependencies.
> 零依赖简化日期操作。

**Why MyLib?** | **为什么选择 MyLib？**
- 🚀 10x faster than alternatives | 比替代方案快 10 倍
- 📦 Only 2KB gzipped | 仅 2KB（gzip 后）
- 🌍 Full i18n support | 完整的国际化支持

## Installation | 安装
```

### `doc-006`: Provide Copy-Paste Examples

**Priority**: HIGH | 优先级：高

Examples should be complete and runnable.

示例应该完整且可运行。

**❌ Bad:**
```markdown
## Usage
Call the `process` function with your data.
```

**✅ Good:**
```markdown
## Usage | 使用方法

```javascript
import { process } from 'mylib';

// Basic usage | 基本用法
const result = process({
    input: 'Hello World',
    options: { uppercase: true }
});

console.log(result); // "HELLO WORLD"
```
```

---

## API Documentation Rules | API 文档规则

### `doc-007`: Document Request/Response Formats

**Priority**: CRITICAL | 优先级：关键

API endpoints must document request and response schemas.

API 端点必须记录请求和响应模式。

**✅ Good:**
```markdown
### POST /api/users

Create a new user. | 创建新用户。

**Request Body | 请求体:**
```json
{
    "name": "string (required) | 字符串（必填）",
    "email": "string (required) | 字符串（必填）",
    "role": "string (optional, default: 'user') | 字符串（可选，默认：'user'）"
}
```

**Response | 响应:**
```json
{
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "string",
    "createdAt": "ISO 8601 datetime"
}
```

**Status Codes | 状态码:**
| Code | Description | 描述 |
|------|-------------|------|
| 201 | User created successfully | 用户创建成功 |
| 400 | Invalid request body | 无效的请求体 |
| 409 | Email already exists | 邮箱已存在 |
```

### `doc-008`: Include Authentication Details

**Priority**: HIGH | 优先级：高

Document how to authenticate API requests.

记录如何认证 API 请求。

**✅ Good:**
```markdown
## Authentication | 认证

All API requests require authentication via Bearer token.
所有 API 请求需要通过 Bearer token 认证。

**Header Format | 请求头格式:**
```
Authorization: Bearer <your-api-key>
```

**Example | 示例:**
```bash
curl -X GET https://api.example.com/users \
  -H "Authorization: Bearer sk_live_xxxxx"
```
```

### `doc-009`: Document Error Responses

**Priority**: HIGH | 优先级：高

Include common error responses and how to handle them.

包含常见错误响应及其处理方法。

**✅ Good:**
```markdown
## Error Handling | 错误处理

All errors follow this format | 所有错误遵循此格式:

```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human readable message | 人类可读的消息",
        "details": {} // Optional additional info | 可选的附加信息
    }
}
```

**Common Errors | 常见错误:**

| Code | HTTP Status | Description | 描述 |
|------|-------------|-------------|------|
| `INVALID_TOKEN` | 401 | Token is invalid or expired | Token 无效或已过期 |
| `RATE_LIMITED` | 429 | Too many requests | 请求过多 |
| `NOT_FOUND` | 404 | Resource not found | 资源未找到 |
```

---

## Comment Rules | 注释规则

### `doc-010`: Explain Why, Not What

**Priority**: CRITICAL | 优先级：关键

Comments should explain reasoning, not describe obvious code.

注释应解释原因，而不是描述显而易见的代码。

**❌ Bad:**
```typescript
// Increment counter by 1 | 将计数器加 1
counter++;

// Loop through array | 遍历数组
for (const item of items) {
    // Process item | 处理项目
    process(item);
}
```

**✅ Good:**
```typescript
// Use post-increment to return old value for comparison
// 使用后置递增以返回旧值用于比较
const previousCount = counter++;

// Process items sequentially to maintain order dependency
// 顺序处理项目以维护顺序依赖
for (const item of items) {
    // Skip archived items per business rule BR-123
    // 根据业务规则 BR-123 跳过已归档项目
    if (item.archived) continue;
    process(item);
}
```

### `doc-011`: Use TODO/FIXME/HACK Tags

**Priority**: MEDIUM | 优先级：中

Use standard tags for actionable comments.

使用标准标签标记可操作的注释。

**✅ Good:**
```typescript
// TODO: Implement caching for performance (Issue #123)
// TODO: 实现缓存以提升性能（Issue #123）

// FIXME: This breaks when input is empty
// FIXME: 当输入为空时会出错

// HACK: Workaround for browser bug, remove after Chrome 120
// HACK: 浏览器 bug 的临时解决方案，Chrome 120 后移除

// NOTE: This algorithm is O(n²), acceptable for n < 1000
// NOTE: 此算法复杂度为 O(n²)，n < 1000 时可接受
```

### `doc-012`: Document Magic Numbers and Strings

**Priority**: HIGH | 优先级：高

Explain non-obvious constants.

解释不明显的常量。

**❌ Bad:**
```typescript
if (retries > 3) {
    await sleep(5000);
}
```

**✅ Good:**
```typescript
const MAX_RETRIES = 3;        // Prevent infinite retry loops | 防止无限重试循环
const BACKOFF_MS = 5000;      // 5 seconds between retries | 重试间隔 5 秒

if (retries > MAX_RETRIES) {
    await sleep(BACKOFF_MS);
}
```

---

## Example Code Rules | 示例代码规则

### `doc-013`: Make Examples Self-Contained

**Priority**: CRITICAL | 优先级：关键

Examples should run without external dependencies.

示例应该无需外部依赖即可运行。

**❌ Bad:**
```typescript
// Assumes user knows about config and utils
// 假设用户了解 config 和 utils
const result = processData(data, config.options);
```

**✅ Good:**
```typescript
import { processData } from 'mylib';

// Complete example with all required setup
// 包含所有必需设置的完整示例
const data = {
    items: [1, 2, 3],
    filter: 'even'
};

const options = {
    transform: true,
    validate: true
};

const result = processData(data, options);
console.log(result); // { items: [2], transformed: true }
```

### `doc-014`: Show Common Use Cases

**Priority**: HIGH | 优先级：高

Include examples for the most common scenarios.

包含最常见场景的示例。

**✅ Good:**
```typescript
// Basic Usage | 基本用法
const client = new ApiClient({ apiKey: 'xxx' });

// With Custom Options | 自定义选项
const client = new ApiClient({
    apiKey: 'xxx',
    timeout: 10000,
    retries: 5
});

// With Error Handling | 错误处理
try {
    const result = await client.fetch('/users');
} catch (error) {
    if (error instanceof RateLimitError) {
        await sleep(error.retryAfter);
        // retry...
    }
}

// With TypeScript Generics | TypeScript 泛型
const user = await client.fetch<User>('/users/123');
```

### `doc-015`: Include Expected Output

**Priority**: MEDIUM | 优先级：中

Show what the example produces.

展示示例的输出结果。

**✅ Good:**
```typescript
import { format } from 'mylib';

console.log(format(1234567.89));
// Output | 输出: "1,234,567.89"

console.log(format(1234567.89, { locale: 'de-DE' }));
// Output | 输出: "1.234.567,89"

console.log(format(1234567.89, { currency: 'USD' }));
// Output | 输出: "$1,234,567.89"
```

---

## Workflow | 工作流程

### Step 1: Analyze Code Structure | 分析代码结构

```bash
# Find files needing documentation | 查找需要文档的文件
find src -name "*.ts" -o -name "*.js"

# Check existing documentation coverage | 检查现有文档覆盖率
grep -r "@param\|@returns" src/
```

### Step 2: Identify Documentation Gaps | 识别文档缺口

- Public exports without JSDoc | 没有 JSDoc 的公共导出
- Complex functions without examples | 没有示例的复杂函数
- Missing README sections | 缺失的 README 部分
- Undocumented API endpoints | 未记录的 API 端点

### Step 3: Prioritize by Impact | 按影响优先排序

1. Public API documentation | 公共 API 文档
2. README quick start | README 快速开始
3. Complex function examples | 复杂函数示例
4. Internal code comments | 内部代码注释

### Step 4: Write Documentation | 编写文档

- Follow the rules above | 遵循上述规则
- Use bilingual format when appropriate | 适当时使用双语格式
- Include runnable examples | 包含可运行的示例

### Step 5: Validate Documentation | 验证文档

```bash
# Check for broken links | 检查断开的链接
# Verify code examples compile | 验证代码示例可编译
# Run documentation tests | 运行文档测试
```

---

## Integration | 集成

This skill works best with:

此技能最适合与以下工具配合使用：

- **TypeDoc** - Generate API docs from TSDoc | 从 TSDoc 生成 API 文档
- **JSDoc** - Generate docs from JSDoc comments | 从 JSDoc 注释生成文档
- **VitePress/Docusaurus** - Documentation sites | 文档站点
- **Swagger/OpenAPI** - API documentation | API 文档
- **ESLint plugins** - Enforce documentation rules | 强制执行文档规则

## Related Skills | 相关技能

- `git-smart-commit` - For documenting changes in commits | 在提交中记录更改
- `code-review` - For reviewing documentation quality | 审查文档质量
