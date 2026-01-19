---
name: refactoring
description: 智能代码重构，包含安全检查和最佳实践
version: 1.0.0
author: CCJK
category: dev
triggers:
  - /refactor
  - /rf
  - /cleanup
use_when:
  - "用户想要重构代码"
  - "代码需要清理"
  - "改进代码结构"
  - "用户提到重构"
auto_activate: true
priority: 7
difficulty: intermediate
tags:
  - refactoring
  - code-quality
  - cleanup
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - mcp__ide__getDiagnostics
  - Bash(npm test)
  - Bash(pnpm test)
  - Bash(yarn test)
context: fork
user-invocable: true
hooks:
  - type: PreToolUse
    matcher: Edit
    command: echo "编辑前创建备份..."
  - type: PostToolUse
    matcher: Edit
    command: echo "编辑完成，正在验证..."
---

# 代码重构

## 上下文
$ARGUMENTS

## 指令

遵循安全且系统化的重构实践：

### 安全第一

在任何重构之前：

1. **验证测试存在**
   - 检查现有测试覆盖率
   - 运行测试确保通过
   - 如果没有测试，先编写测试

2. **创建备份**
   - Git 提交当前状态
   - 或手动备份文件

3. **小步前进**
   - 一次只做一个改动
   - 每次改动后测试
   - 频繁提交

### 重构目录

选择合适的重构技术：

#### 1. 提取方法（Extract Method）
**何时使用**：函数过长或有重复代码
**如何操作**：
```typescript
// 重构前
function processOrder(order) {
  // 验证订单
  if (!order.items || order.items.length === 0) {
    throw new Error('订单为空')
  }
  // 计算总额
  let total = 0
  for (const item of order.items) {
    total += item.price * item.quantity
  }
  // 应用折扣
  if (order.coupon) {
    total *= (1 - order.coupon.discount)
  }
  return total
}

// 重构后
function processOrder(order) {
  validateOrder(order)
  const subtotal = calculateSubtotal(order.items)
  return applyDiscount(subtotal, order.coupon)
}

function validateOrder(order) {
  if (!order.items || order.items.length === 0) {
    throw new Error('订单为空')
  }
}

function calculateSubtotal(items) {
  return items.reduce((sum, item) =>
    sum + item.price * item.quantity, 0)
}

function applyDiscount(amount, coupon) {
  return coupon ? amount * (1 - coupon.discount) : amount
}
```

#### 2. 重命名符号（Rename Symbol）
**何时使用**：名称不能清晰表达意图
**如何操作**：
- 尽可能使用 IDE 重构工具
- 谨慎搜索和替换
- 更新文档和注释

```typescript
// 重构前
function calc(x, y) { return x * y }

// 重构后
function calculateArea(width, height) {
  return width * height
}
```

#### 3. 移动到模块（Move to Module）
**何时使用**：代码应该属于不同的模块
**如何操作**：
- 识别逻辑分组
- 将相关函数移到一起
- 更新导入/导出

```typescript
// 重构前：utils.ts
export function validateEmail(email) { ... }
export function sendEmail(to, subject) { ... }
export function formatDate(date) { ... }

// 重构后：email.ts
export function validateEmail(email) { ... }
export function sendEmail(to, subject) { ... }

// 重构后：date.ts
export function formatDate(date) { ... }
```

#### 4. 内联变量（Inline Variable）
**何时使用**：变量没有增加清晰度
**如何操作**：
```typescript
// 重构前
const isValid = user.age >= 18
return isValid

// 重构后
return user.age >= 18
```

#### 5. 提取接口（Extract Interface）
**何时使用**：多个实现共享行为
**如何操作**：
```typescript
// 重构前
class FileLogger {
  log(message: string) { ... }
}
class ConsoleLogger {
  log(message: string) { ... }
}

// 重构后
interface Logger {
  log(message: string): void
}

class FileLogger implements Logger {
  log(message: string) { ... }
}

class ConsoleLogger implements Logger {
  log(message: string) { ... }
}
```

#### 6. 用多态替换条件（Replace Conditional with Polymorphism）
**何时使用**：基于类型的复杂条件判断
**如何操作**：
```typescript
// 重构前
function getSpeed(vehicle) {
  if (vehicle.type === 'car') {
    return vehicle.enginePower * 2
  } else if (vehicle.type === 'bike') {
    return vehicle.gears * 10
  } else if (vehicle.type === 'plane') {
    return vehicle.thrust * 100
  }
}

// 重构后
interface Vehicle {
  getSpeed(): number
}

class Car implements Vehicle {
  getSpeed() { return this.enginePower * 2 }
}

class Bike implements Vehicle {
  getSpeed() { return this.gears * 10 }
}

class Plane implements Vehicle {
  getSpeed() { return this.thrust * 100 }
}
```

#### 7. 简化条件（Simplify Conditional）
**何时使用**：复杂的布尔逻辑
**如何操作**：
```typescript
// 重构前
if (user.age >= 18 && user.hasLicense && !user.isSuspended) {
  allowDriving()
}

// 重构后
function canDrive(user) {
  return user.age >= 18
    && user.hasLicense
    && !user.isSuspended
}

if (canDrive(user)) {
  allowDriving()
}
```

#### 8. 删除死代码（Remove Dead Code）
**何时使用**：代码永远不会执行
**如何操作**：
- 使用覆盖率工具识别
- 检查 git 历史了解上下文
- 有版本控制支持，可以放心删除

### 分步执行流程

```markdown
## 重构会话：[目标]

### 1. 重构前准备
- [ ] 测试存在且通过
- [ ] 代码已提交到 git
- [ ] 重构目标已确定

### 2. 重构步骤
**步骤 1**：[重构技术]
- 影响文件：[列表]
- 变更内容：[描述]
- 测试：✅ 通过

**步骤 2**：[下一个技术]
- 影响文件：[列表]
- 变更内容：[描述]
- 测试：✅ 通过

### 3. 重构后验证
- [ ] 所有测试仍然通过
- [ ] 代码更清晰/更简洁
- [ ] 功能未改变
- [ ] 文档已更新
- [ ] 变更已提交
```

### 验证清单

重构后验证：

- [ ] **测试通过**：所有现有测试仍然通过
- [ ] **行为未变**：功能完全相同
- [ ] **代码质量提升**：代码更清晰/更简洁
- [ ] **无新问题**：没有引入新 bug
- [ ] **文档已更新**：注释和文档反映变更
- [ ] **性能保持**：没有性能退化

### 危险信号 - 如果出现以下情况请停止重构：

- 测试意外失败
- 你在改变行为，而不是结构
- 你在添加功能（那不是重构）
- 你已经重构了几个小时还没提交
- 你不确定代码的作用

### 最佳实践

1. **重构或添加功能，永远不要同时做**
   - 将重构提交与功能提交分开
   - 使代码审查更容易
   - 需要时更容易回滚

2. **保持测试绿色**
   - 频繁运行测试
   - 立即修复失败的测试
   - 测试失败时不要继续

3. **小而专注的变更**
   - 一次只用一种重构技术
   - 每次成功重构后提交
   - 易于审查和理解

4. **使用 IDE 工具**
   - 自动重构更安全
   - 不易出现拼写错误
   - 自动更新所有引用

5. **需要注意的代码异味**
   - 长函数（>20 行）
   - 重复代码
   - 大类（>300 行）
   - 长参数列表（>3 个参数）
   - 复杂条件
   - 魔法数字/字符串

### 常见重构模式

**模式 1：提取和组合**
```
长函数 → 提取方法 → 组合可读流程
```

**模式 2：合并重复**
```
重复代码 → 提取公共逻辑 → 复用
```

**模式 3：简化复杂性**
```
复杂逻辑 → 分解为步骤 → 清晰意图
```

**模式 4：改进命名**
```
不清晰的名称 → 重命名 → 自文档化代码
```

### 输出格式

```markdown
## 重构完成：[目标]

### 所做变更
1. **[技术]**：[描述]
   - 文件：[列表]
   - 原因：[为什么做这个重构]

2. **[技术]**：[描述]
   - 文件：[列表]
   - 原因：[为什么做这个重构]

### 指标
- 代码行数：[之前] → [之后]
- 函数数量：[之前] → [之后]
- 复杂度：[之前] → [之后]

### 验证
- ✅ 所有测试通过
- ✅ 行为未改变
- ✅ 代码质量提升
- ✅ 文档已更新

### 后续步骤
- [可选的后续重构]
```
