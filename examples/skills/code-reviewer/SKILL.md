# Code Reviewer | 代码审查

A comprehensive skill for performing intelligent code reviews based on best practices.

一个基于最佳实践进行智能代码审查的综合技能。

## When to Apply | 何时应用

- When reviewing pull requests | 审查 Pull Request 时
- When checking code quality | 检查代码质量时
- When performing security audits | 进行安全审计时
- When optimizing performance | 优化性能时
- When refactoring code | 重构代码时
- When onboarding new team members | 新成员入职培训时

## Overview | 概述

This skill helps you perform thorough, consistent code reviews by analyzing code changes against established best practices. It covers code quality, security, performance, maintainability, and style.

此技能通过分析代码变更并对照既定最佳实践，帮助您进行全面、一致的代码审查。涵盖代码质量、安全性、性能、可维护性和代码风格。

## Review Categories | 审查类别

| Category | Description | Priority |
|----------|-------------|----------|
| **Security** | Vulnerabilities, data exposure | CRITICAL |
| **Quality** | Logic errors, edge cases | HIGH |
| **Performance** | Efficiency, resource usage | HIGH |
| **Maintainability** | Readability, complexity | MEDIUM |
| **Style** | Formatting, conventions | LOW |

---

## Security Rules | 安全规则

### `security-001`: No Hardcoded Secrets | 禁止硬编码密钥

**Priority**: CRITICAL | 优先级：严重

Never hardcode passwords, API keys, tokens, or other secrets in source code.

永远不要在源代码中硬编码密码、API 密钥、令牌或其他敏感信息。

**❌ Bad:**
```javascript
const API_KEY = "sk-1234567890abcdef";
const password = "admin123";
const dbConnection = "mongodb://user:pass123@localhost:27017";
```

**✅ Good:**
```javascript
const API_KEY = process.env.API_KEY;
const password = process.env.DB_PASSWORD;
const dbConnection = process.env.DATABASE_URL;
```

### `security-002`: Input Validation | 输入验证

**Priority**: CRITICAL | 优先级：严重

Always validate and sanitize user input to prevent injection attacks.

始终验证和清理用户输入以防止注入攻击。

**❌ Bad:**
```javascript
// SQL Injection vulnerable
const query = `SELECT * FROM users WHERE id = ${userId}`;

// XSS vulnerable
element.innerHTML = userInput;

// Command injection vulnerable
exec(`ls ${userPath}`);
```

**✅ Good:**
```javascript
// Parameterized query
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);

// Safe DOM manipulation
element.textContent = userInput;

// Validated input
if (/^[a-zA-Z0-9_-]+$/.test(userPath)) {
  exec(`ls ${escapeshellarg(userPath)}`);
}
```

### `security-003`: Authentication & Authorization | 认证与授权

**Priority**: CRITICAL | 优先级：严重

Ensure proper authentication and authorization checks are in place.

确保适当的认证和授权检查已到位。

**❌ Bad:**
```javascript
// Missing auth check
app.get('/admin/users', (req, res) => {
  return db.getAllUsers();
});

// Insecure comparison
if (user.role == 'admin') { /* ... */ }
```

**✅ Good:**
```javascript
// Proper auth middleware
app.get('/admin/users', authenticate, authorize('admin'), (req, res) => {
  return db.getAllUsers();
});

// Strict comparison
if (user.role === 'admin') { /* ... */ }
```

### `security-004`: Secure Data Transmission | 安全数据传输

**Priority**: HIGH | 优先级：高

Use HTTPS and encrypt sensitive data in transit and at rest.

使用 HTTPS 并在传输和存储时加密敏感数据。

**❌ Bad:**
```javascript
// Insecure HTTP
fetch('http://api.example.com/data');

// Storing plain text passwords
user.password = plainPassword;
```

**✅ Good:**
```javascript
// Secure HTTPS
fetch('https://api.example.com/data');

// Hashed passwords
user.password = await bcrypt.hash(plainPassword, 12);
```

---

## Code Quality Rules | 代码质量规则

### `quality-001`: Handle Edge Cases | 处理边界情况

**Priority**: HIGH | 优先级：高

Always handle null, undefined, empty arrays, and boundary conditions.

始终处理 null、undefined、空数组和边界条件。

**❌ Bad:**
```javascript
function getFirstItem(arr) {
  return arr[0].name;  // Crashes if arr is empty or null
}

function processUser(user) {
  return user.profile.email;  // Crashes if profile is undefined
}
```

**✅ Good:**
```javascript
function getFirstItem(arr) {
  return arr?.[0]?.name ?? null;
}

function processUser(user) {
  return user?.profile?.email ?? '';
}
```

### `quality-002`: Avoid Magic Numbers | 避免魔法数字

**Priority**: MEDIUM | 优先级：中

Use named constants instead of unexplained numeric values.

使用命名常量代替未解释的数值。

**❌ Bad:**
```javascript
if (password.length < 8) { /* ... */ }
setTimeout(callback, 86400000);
if (statusCode === 404) { /* ... */ }
```

**✅ Good:**
```javascript
const MIN_PASSWORD_LENGTH = 8;
if (password.length < MIN_PASSWORD_LENGTH) { /* ... */ }

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
setTimeout(callback, ONE_DAY_MS);

const HTTP_NOT_FOUND = 404;
if (statusCode === HTTP_NOT_FOUND) { /* ... */ }
```

### `quality-003`: Single Responsibility | 单一职责

**Priority**: HIGH | 优先级：高

Functions should do one thing and do it well.

函数应该只做一件事，并把它做好。

**❌ Bad:**
```javascript
function processUserData(user) {
  // Validates user
  if (!user.email) throw new Error('Invalid email');

  // Formats data
  user.name = user.name.trim().toLowerCase();

  // Saves to database
  db.save(user);

  // Sends email
  emailService.sendWelcome(user.email);

  // Logs activity
  logger.info('User processed');
}
```

**✅ Good:**
```javascript
function validateUser(user) {
  if (!user.email) throw new Error('Invalid email');
  return true;
}

function formatUserData(user) {
  return { ...user, name: user.name.trim().toLowerCase() };
}

async function createUser(user) {
  validateUser(user);
  const formatted = formatUserData(user);
  await db.save(formatted);
  await emailService.sendWelcome(formatted.email);
  logger.info('User created', { userId: formatted.id });
}
```

### `quality-004`: Error Handling | 错误处理

**Priority**: HIGH | 优先级：高

Handle errors gracefully with meaningful messages.

优雅地处理错误并提供有意义的消息。

**❌ Bad:**
```javascript
try {
  await fetchData();
} catch (e) {
  console.log(e);  // Silent failure
}

// Swallowing errors
function process() {
  try { riskyOperation(); } catch {}
}
```

**✅ Good:**
```javascript
try {
  await fetchData();
} catch (error) {
  logger.error('Failed to fetch data', {
    error: error.message,
    stack: error.stack
  });
  throw new ApplicationError('Data fetch failed', { cause: error });
}
```

---

## Performance Rules | 性能规则

### `perf-001`: Avoid N+1 Queries | 避免 N+1 查询

**Priority**: HIGH | 优先级：高

Batch database queries instead of querying in loops.

批量数据库查询而不是在循环中查询。

**❌ Bad:**
```javascript
const users = await db.getUsers();
for (const user of users) {
  user.posts = await db.getPostsByUserId(user.id);  // N+1 queries!
}
```

**✅ Good:**
```javascript
const users = await db.getUsers();
const userIds = users.map(u => u.id);
const posts = await db.getPostsByUserIds(userIds);  // Single query

const postsByUser = groupBy(posts, 'userId');
users.forEach(user => {
  user.posts = postsByUser[user.id] || [];
});
```

### `perf-002`: Optimize Loops | 优化循环

**Priority**: MEDIUM | 优先级：中

Avoid unnecessary operations inside loops.

避免在循环内进行不必要的操作。

**❌ Bad:**
```javascript
for (let i = 0; i < arr.length; i++) {  // length checked each iteration
  const config = JSON.parse(configString);  // Parsing in every iteration
  process(arr[i], config);
}
```

**✅ Good:**
```javascript
const config = JSON.parse(configString);  // Parse once
const len = arr.length;  // Cache length
for (let i = 0; i < len; i++) {
  process(arr[i], config);
}
```

### `perf-003`: Use Appropriate Data Structures | 使用适当的数据结构

**Priority**: MEDIUM | 优先级：中

Choose the right data structure for the operation.

为操作选择正确的数据结构。

**❌ Bad:**
```javascript
// O(n) lookup every time
const users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
const user = users.find(u => u.id === targetId);

// Checking duplicates with array
const seen = [];
items.forEach(item => {
  if (!seen.includes(item)) seen.push(item);  // O(n^2)
});
```

**✅ Good:**
```javascript
// O(1) lookup with Map
const usersMap = new Map(users.map(u => [u.id, u]));
const user = usersMap.get(targetId);

// O(n) with Set
const unique = [...new Set(items)];
```

### `perf-004`: Lazy Loading & Caching | 懒加载与缓存

**Priority**: MEDIUM | 优先级：中

Load resources on demand and cache expensive computations.

按需加载资源并缓存昂贵的计算。

**❌ Bad:**
```javascript
// Loading everything upfront
import { entireHugeLibrary } from 'huge-library';

// Recomputing expensive operation
function getReport() {
  return expensiveCalculation(data);  // Called every time
}
```

**✅ Good:**
```javascript
// Dynamic import
const module = await import('huge-library/specific-feature');

// Memoization
const memoizedCalculation = memoize(expensiveCalculation);
function getReport() {
  return memoizedCalculation(data);
}
```

---

## Maintainability Rules | 可维护性规则

### `maintain-001`: Meaningful Names | 有意义的命名

**Priority**: HIGH | 优先级：高

Use descriptive, intention-revealing names.

使用描述性的、揭示意图的名称。

**❌ Bad:**
```javascript
const d = new Date();
const arr = users.filter(x => x.a > 18);
function proc(d) { /* ... */ }
const temp = calculate();
```

**✅ Good:**
```javascript
const currentDate = new Date();
const adultUsers = users.filter(user => user.age > 18);
function processPayment(paymentData) { /* ... */ }
const totalRevenue = calculateRevenue();
```

### `maintain-002`: Keep Functions Small | 保持函数简短

**Priority**: MEDIUM | 优先级：中

Functions should be short and focused (ideally under 20 lines).

函数应该简短且专注（理想情况下少于 20 行）。

**❌ Bad:**
```javascript
function handleUserRegistration(data) {
  // 100+ lines of validation, formatting,
  // database operations, email sending,
  // logging, analytics, etc.
}
```

**✅ Good:**
```javascript
async function handleUserRegistration(data) {
  const validatedData = validateRegistrationData(data);
  const user = await createUser(validatedData);
  await sendWelcomeEmail(user);
  trackRegistration(user);
  return user;
}
```

### `maintain-003`: Avoid Deep Nesting | 避免深层嵌套

**Priority**: MEDIUM | 优先级：中

Limit nesting to 3 levels maximum. Use early returns.

将嵌套限制在最多 3 层。使用提前返回。

**❌ Bad:**
```javascript
function processOrder(order) {
  if (order) {
    if (order.items) {
      if (order.items.length > 0) {
        if (order.customer) {
          if (order.customer.isActive) {
            // Finally do something
          }
        }
      }
    }
  }
}
```

**✅ Good:**
```javascript
function processOrder(order) {
  if (!order) return null;
  if (!order.items?.length) return null;
  if (!order.customer?.isActive) return null;

  // Process the order
  return executeOrder(order);
}
```

### `maintain-004`: Write Self-Documenting Code | 编写自文档化代码

**Priority**: MEDIUM | 优先级：中

Code should be readable without excessive comments.

代码应该在没有过多注释的情况下可读。

**❌ Bad:**
```javascript
// Check if user is adult
if (u.a >= 18) {
  // Add to list
  l.push(u);
}

// Loop through items
for (let i = 0; i < arr.length; i++) {
  // Process item
  proc(arr[i]);
}
```

**✅ Good:**
```javascript
const ADULT_AGE = 18;
if (user.age >= ADULT_AGE) {
  eligibleUsers.push(user);
}

items.forEach(item => processItem(item));
```

### `maintain-005`: DRY - Don't Repeat Yourself | 不要重复自己

**Priority**: HIGH | 优先级：高

Extract repeated code into reusable functions.

将重复的代码提取为可重用的函数。

**❌ Bad:**
```javascript
// In file A
const fullName = `${user.firstName} ${user.lastName}`.trim();
const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

// In file B (same logic repeated)
const name = `${customer.firstName} ${customer.lastName}`.trim();
const abbr = `${customer.firstName[0]}${customer.lastName[0]}`.toUpperCase();
```

**✅ Good:**
```javascript
// utils/name.js
function getFullName(person) {
  return `${person.firstName} ${person.lastName}`.trim();
}

function getInitials(person) {
  return `${person.firstName[0]}${person.lastName[0]}`.toUpperCase();
}

// Usage
const fullName = getFullName(user);
const initials = getInitials(user);
```

---

## Code Style Rules | 代码风格规则

### `style-001`: Consistent Formatting | 一致的格式化

**Priority**: LOW | 优先级：低

Use consistent indentation, spacing, and formatting.

使用一致的缩进、间距和格式。

**❌ Bad:**
```javascript
function foo(){
const x=1;
  const y = 2;
    if(x==y){
return true}
  return false
}
```

**✅ Good:**
```javascript
function foo() {
  const x = 1;
  const y = 2;

  if (x === y) {
    return true;
  }

  return false;
}
```

### `style-002`: Consistent Naming Conventions | 一致的命名约定

**Priority**: LOW | 优先级：低

Follow language-specific naming conventions.

遵循特定语言的命名约定。

**❌ Bad:**
```javascript
const user_name = 'Alice';      // snake_case in JS
const MyVariable = 42;          // PascalCase for variable
function GetUserData() {}       // PascalCase for function
class userService {}            // camelCase for class
```

**✅ Good:**
```javascript
const userName = 'Alice';       // camelCase for variables
const MAX_RETRIES = 3;          // UPPER_SNAKE for constants
function getUserData() {}       // camelCase for functions
class UserService {}            // PascalCase for classes
```

### `style-003`: Import Organization | 导入组织

**Priority**: LOW | 优先级：低

Organize imports logically and consistently.

逻辑且一致地组织导入。

**❌ Bad:**
```javascript
import { helper } from './utils';
import React from 'react';
import axios from 'axios';
import { useState } from 'react';
import { Button } from './components';
import lodash from 'lodash';
```

**✅ Good:**
```javascript
// External libraries
import React, { useState } from 'react';
import axios from 'axios';
import lodash from 'lodash';

// Internal modules
import { Button } from './components';
import { helper } from './utils';
```

---

## Review Workflow | 审查工作流

### Step 1: Understand Context | 理解上下文

```bash
# View the changes
git diff [base]...[head]

# Check related files
git log --oneline -10
```

### Step 2: Security Scan | 安全扫描

- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Auth checks in place
- [ ] No SQL/XSS injection risks

### Step 3: Quality Check | 质量检查

- [ ] Edge cases handled
- [ ] Error handling present
- [ ] No code duplication
- [ ] Functions are focused

### Step 4: Performance Review | 性能审查

- [ ] No N+1 queries
- [ ] Efficient algorithms
- [ ] Appropriate caching
- [ ] No memory leaks

### Step 5: Maintainability | 可维护性

- [ ] Clear naming
- [ ] Reasonable function size
- [ ] Limited nesting
- [ ] Self-documenting

### Step 6: Style Check | 风格检查

- [ ] Consistent formatting
- [ ] Follows conventions
- [ ] Organized imports

---

## Review Comment Templates | 审查评论模板

### Security Issue | 安全问题
```
🔴 **Security**: [security-00X]
This code [description of issue].
Consider [suggested fix].
```

### Quality Issue | 质量问题
```
🟡 **Quality**: [quality-00X]
[Description of issue]
Suggestion: [how to improve]
```

### Performance Issue | 性能问题
```
🟠 **Performance**: [perf-00X]
[Description of issue]
This could be optimized by [suggestion].
```

### Suggestion | 建议
```
💡 **Suggestion**:
[Optional improvement idea]
```

### Praise | 表扬
```
✨ **Nice**:
Great use of [pattern/technique]!
```

---

## Integration | 集成

This skill works best with:

- Git hooks for pre-commit checks | Git 钩子用于提交前检查
- CI/CD pipelines for automated review | CI/CD 流水线用于自动审查
- ESLint/Prettier for style enforcement | ESLint/Prettier 用于风格强制
- SonarQube for code quality metrics | SonarQube 用于代码质量指标
- Security scanning tools (Snyk, etc.) | 安全扫描工具（Snyk 等）
