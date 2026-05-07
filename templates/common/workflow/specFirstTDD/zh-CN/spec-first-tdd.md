---
description: SPEC-First TDD 工作流 - 规格先行的测试驱动开发，通过 AI 辅助实现红绿重构循环
allowed-tools: Read(**), Write(**), Exec(npm test, npm run test:watch, npm run coverage)
argument-hint: [--watch] [--coverage] [--unit-only] [--integration-only]
# examples:
#   - /spec-first-tdd                    # 启动完整 TDD 循环
#   - /spec-first-tdd --watch            # 监听模式持续运行测试
#   - /spec-first-tdd --coverage         # 生成测试覆盖率报告
#   - /spec-first-tdd --unit-only        # 仅运行单元测试
---

> **基于 Discipline Baseline**：本 workflow 在 4 条全局原则（Think / Simplicity / Surgical / Goal-driven）之上提供更具体的流程编排。当本文档与 baseline 冲突，**baseline 优先**。

# SPEC-First TDD Workflow

基于 Kent Beck 的《测试驱动开发》和 Robert C. Martin 的《代码整洁之道》，结合 AI 能力实现的现代化 TDD 工作流。

---

## 核心理念

**SPEC-First（规格先行）**：在编写任何代码之前，先用自然语言明确定义：
- **What**：要实现什么功能
- **Why**：为什么需要这个功能
- **How**：如何验证功能正确性

**RED-GREEN-REFACTOR（红绿重构）**：
1. 🔴 **RED**：编写失败的测试（定义期望行为）
2. 🟢 **GREEN**：编写最简单的代码让测试通过
3. ♻️ **REFACTOR**：在测试保护下重构代码

---

## Workflow Steps

### Phase 1: SPEC Definition（规格定义）

**目标**：用自然语言清晰定义需求和验收标准

```markdown
## Feature Specification

### User Story
As a [role], I want [feature] so that [benefit]

### Acceptance Criteria
- Given [context]
- When [action]
- Then [expected outcome]

### Edge Cases
- What if [edge case 1]?
- What if [edge case 2]?

### Non-Functional Requirements
- Performance: [requirement]
- Security: [requirement]
- Accessibility: [requirement]
```

**AI 辅助**：
- 帮助识别遗漏的边界条件
- 建议测试场景优先级
- 生成测试数据样例

---

### Phase 2: Test-First（测试先行）

**目标**：将 SPEC 转化为可执行的测试用例

#### 2.1 编写测试骨架

```typescript
describe('UserAuthentication', () => {
  describe('login', () => {
    it('should return token when credentials are valid', async () => {
      // Arrange
      const credentials = { email: 'user@example.com', password: 'secret' }

      // Act
      const result = await auth.login(credentials)

      // Assert
      expect(result.token).toBeDefined()
      expect(result.user.email).toBe(credentials.email)
    })

    it('should throw error when credentials are invalid', async () => {
      // Arrange
      const credentials = { email: 'user@example.com', password: 'wrong' }

      // Act & Assert
      await expect(auth.login(credentials)).rejects.toThrow('Invalid credentials')
    })
  })
})
```

#### 2.2 运行测试（预期失败）

```bash
npm test
# ❌ FAIL: UserAuthentication › login › should return token when credentials are valid
# ReferenceError: auth is not defined
```

**关键原则**：
- 测试必须先失败（证明测试有效）
- 失败原因应该清晰明确
- 一次只关注一个测试用例

---

### Phase 3: Minimal Implementation（最小实现）

**目标**：编写刚好让测试通过的代码（不多不少）

```typescript
class UserAuthentication {
  async login(credentials: Credentials): Promise<AuthResult> {
    // 最简单的实现：硬编码返回
    if (credentials.email === 'user@example.com' && credentials.password === 'secret') {
      return {
        token: 'fake-token',
        user: { email: credentials.email }
      }
    }
    throw new Error('Invalid credentials')
  }
}
```

#### 运行测试（预期通过）

```bash
npm test
# ✅ PASS: UserAuthentication › login › should return token when credentials are valid
# ✅ PASS: UserAuthentication › login › should throw error when credentials are invalid
```

**关键原则**：
- 不要过度设计
- 不要提前优化
- 只写让测试通过的代码

---

### Phase 4: Refactor（重构）

**目标**：在测试保护下改善代码设计

#### 4.1 识别代码坏味道

- 硬编码值
- 重复代码
- 过长函数
- 不清晰的命名
- 缺少抽象

#### 4.2 应用重构模式

```typescript
class UserAuthentication {
  constructor(
    private userRepository: UserRepository,
    private tokenService: TokenService,
    private passwordHasher: PasswordHasher
  ) {}

  async login(credentials: Credentials): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(credentials.email)

    if (!user) {
      throw new Error('Invalid credentials')
    }

    const isPasswordValid = await this.passwordHasher.verify(
      credentials.password,
      user.passwordHash
    )

    if (!isPasswordValid) {
      throw new Error('Invalid credentials')
    }

    const token = await this.tokenService.generate(user.id)

    return {
      token,
      user: { email: user.email }
    }
  }
}
```

#### 4.3 持续运行测试

```bash
npm test -- --watch
# ✅ All tests passing
```

**关键原则**：
- 小步重构（每次改动后立即运行测试）
- 保持测试绿色
- 重构不改变行为

---

### Phase 5: Expand Coverage（扩展覆盖）

**目标**：添加更多测试用例覆盖边界条件

```typescript
describe('UserAuthentication', () => {
  describe('login', () => {
    // ... 已有测试 ...

    it('should handle database connection errors gracefully', async () => {
      // 测试基础设施故障
    })

    it('should rate-limit failed login attempts', async () => {
      // 测试安全防护
    })

    it('should log security events', async () => {
      // 测试审计需求
    })
  })
})
```

#### 检查覆盖率

```bash
npm run coverage
# Statements   : 95.2% ( 120/126 )
# Branches     : 88.9% ( 24/27 )
# Functions    : 100% ( 15/15 )
# Lines        : 94.8% ( 110/116 )
```

---

## TDD Best Practices

### 1. 测试命名规范

```typescript
// ✅ Good: 清晰描述行为和预期
it('should return 400 when email format is invalid')
it('should cache user data for 5 minutes after successful login')

// ❌ Bad: 模糊不清
it('test login')
it('should work')
```

### 2. AAA 模式（Arrange-Act-Assert）

```typescript
it('should calculate total price with discount', () => {
  // Arrange: 准备测试数据
  const cart = new ShoppingCart()
  cart.addItem({ price: 100, quantity: 2 })
  const discount = new PercentageDiscount(10)

  // Act: 执行被测试的操作
  const total = cart.calculateTotal(discount)

  // Assert: 验证结果
  expect(total).toBe(180) // 200 - 10% = 180
})
```

### 3. 测试隔离

```typescript
// ✅ Good: 每个测试独立
beforeEach(() => {
  database.clear()
  cache.flush()
})

// ❌ Bad: 测试之间有依赖
let userId: string
it('should create user', () => {
  userId = createUser() // 后续测试依赖这个 ID
})
```

### 4. 测试金字塔

```
        /\
       /  \      E2E Tests (10%)
      /____\     - 关键用户流程
     /      \    Integration Tests (20%)
    /        \   - 模块间交互
   /__________\  Unit Tests (70%)
                 - 单个函数/类
```

---

## AI-Assisted TDD Workflow

### AI 的角色

1. **SPEC 阶段**
   - 帮助细化需求
   - 识别边界条件
   - 生成测试场景

2. **测试编写**
   - 生成测试骨架
   - 建议测试数据
   - 补充遗漏的断言

3. **实现阶段**
   - 提供最小实现
   - 建议设计模式
   - 识别潜在问题

4. **重构阶段**
   - 检测代码坏味道
   - 建议重构手法
   - 验证重构安全性

### 人类的角色

- 定义业务价值和优先级
- 审查测试覆盖的完整性
- 判断代码设计的合理性
- 决策架构和技术选型

---

## Command Options

- `--watch`：监听模式，文件变化时自动运行测试
- `--coverage`：生成测试覆盖率报告
- `--unit-only`：仅运行单元测试（快速反馈）
- `--integration-only`：仅运行集成测试
- `--verbose`：显示详细测试输出

---

## Success Metrics

- ✅ 测试覆盖率 > 80%（关键路径 100%）
- ✅ 所有测试 < 10 秒运行完成
- ✅ 每个功能都有对应的测试
- ✅ 测试失败时能快速定位问题
- ✅ 重构不破坏现有功能

---

## References

- Kent Beck - *Test-Driven Development: By Example*
- Robert C. Martin - *Clean Code* & *Clean Architecture*
- Martin Fowler - *Refactoring: Improving the Design of Existing Code*
- Growing Object-Oriented Software, Guided by Tests
