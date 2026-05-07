---
description: Linear 高质量方法 - 问题验证→优先级排序→专注构建，Linear 团队的产品质量哲学
allowed-tools: Read(**), Write(**), Exec(npm run dev, npm test)
argument-hint: [--validate] [--prioritize] [--focus-mode]
# examples:
#   - /linear-method                    # 启动 Linear 工作流
#   - /linear-method --validate         # 问题验证阶段
#   - /linear-method --prioritize       # 优先级排序
#   - /linear-method --focus-mode       # 专注构建模式
---

> **基于 Discipline Baseline**：本 workflow 在 4 条全局原则（Think / Simplicity / Surgical / Goal-driven）之上提供更具体的流程编排。当本文档与 baseline 冲突，**baseline 优先**。

# Linear Quality Method

基于 Linear 团队的产品开发哲学，通过严格的问题验证、优先级排序和专注构建，打造高质量软件产品。

---

## 核心理念

Linear 是一个以速度和质量著称的项目管理工具，其团队的开发方法论强调：

**1. 问题优先（Problem-First）**
- 先理解问题，再考虑解决方案
- 验证问题是否真实存在
- 评估问题的影响范围

**2. 质量至上（Quality Over Speed）**
- 宁可慢一点，也要做对
- 技术债务是最大的敌人
- 每个功能都要经过深思熟虑

**3. 专注构建（Focus on Building）**
- 减少会议和干扰
- 长时间的深度工作
- 一次只做一件事

**4. 用户体验（User Experience）**
- 每个细节都重要
- 性能是功能的一部分
- 简洁胜于复杂

---

## Linear Workflow

### Phase 1: Problem Validation（问题验证）

**目标**：确保我们在解决真实且重要的问题

#### 1.1 问题陈述

使用 Linear 的问题模板：

```markdown
## Problem Statement

### What is the problem?
[清晰描述问题是什么]

### Who is affected?
- [ ] All users
- [ ] Specific user segment: [describe]
- [ ] Internal team
- [ ] External partners

### How often does this occur?
- [ ] Every time
- [ ] Frequently (daily)
- [ ] Occasionally (weekly)
- [ ] Rarely (monthly)

### What is the impact?
- [ ] Blocker (prevents work)
- [ ] Major (significant friction)
- [ ] Minor (small annoyance)
- [ ] Nice to have

### Evidence
- User feedback: [links]
- Analytics data: [metrics]
- Support tickets: [count]
- Team observations: [notes]
```

#### 1.2 问题验证清单

```markdown
## Validation Checklist

- [ ] 问题描述清晰具体（不是解决方案）
- [ ] 有真实用户反馈或数据支持
- [ ] 影响范围已量化
- [ ] 不解决的后果已评估
- [ ] 与产品愿景一致
- [ ] 不是 XY 问题（用户要 X，我们误以为要 Y）
```

#### 1.3 反例：伪问题

```markdown
❌ Bad: "我们需要添加一个新的设置页面"
→ 这是解决方案，不是问题

✅ Good: "用户无法自定义通知偏好，导致收到过多不相关通知，
         每天有 50+ 用户在支持渠道抱怨此问题"

❌ Bad: "代码需要重构"
→ 没有说明为什么需要重构

✅ Good: "当前认证模块的复杂度导致每次添加新功能需要 3 天，
         而竞品只需要半天，影响我们的迭代速度"
```

---

### Phase 2: Prioritization（优先级排序）

**目标**：在有限的时间内做最重要的事

#### 2.1 RICE 评分框架

Linear 使用 RICE 框架评估优先级：

```
RICE Score = (Reach × Impact × Confidence) / Effort

Reach (触达)：影响多少用户？
- 1000+ users = 10
- 100-1000 users = 5
- 10-100 users = 2
- < 10 users = 1

Impact (影响)：对用户的影响有多大？
- Massive (3.0): 核心功能，显著改善体验
- High (2.0): 重要功能，明显改善体验
- Medium (1.0): 有用功能，适度改善体验
- Low (0.5): 小改进
- Minimal (0.25): 微小改进

Confidence (信心)：我们有多确定？
- High (100%): 有数据支持
- Medium (80%): 有一些证据
- Low (50%): 基于假设

Effort (工作量)：需要多少人月？
- 以人月为单位（1 人月 = 1 人工作 1 个月）
```

#### 2.2 优先级示例

```markdown
## Feature: 键盘快捷键

Reach: 8 (80% 的活跃用户)
Impact: 2.0 (High - 显著提升效率)
Confidence: 100% (用户强烈要求)
Effort: 2 人月

RICE Score = (8 × 2.0 × 1.0) / 2 = 8.0

---

## Feature: 深色模式

Reach: 10 (所有用户)
Impact: 1.0 (Medium - 改善体验)
Confidence: 80% (部分用户要求)
Effort: 3 人月

RICE Score = (10 × 1.0 × 0.8) / 3 = 2.67

---

## Bug: 搜索结果不准确

Reach: 9 (90% 用户使用搜索)
Impact: 3.0 (Massive - 核心功能损坏)
Confidence: 100% (有明确复现步骤)
Effort: 1 人月

RICE Score = (9 × 3.0 × 1.0) / 1 = 27.0  ← 最高优先级
```

#### 2.3 优先级矩阵

```
高影响 │ 🔥 立即做        │ 📅 计划做
      │ (Quick Wins)   │ (Major Projects)
      │                │
──────┼────────────────┼──────────────────
      │                │
低影响 │ 🤔 考虑做        │ ❌ 不做
      │ (Fill-ins)     │ (Time Sinks)
      │                │
       低工作量          高工作量
```

#### 2.4 说不的艺术

Linear 团队以「说不」著称：

```markdown
## 何时说不

❌ 功能请求来自单个用户（除非是关键客户）
❌ 解决方案复杂但影响小
❌ 与产品愿景不符
❌ 有更简单的替代方案
❌ 维护成本高于价值

## 如何说不

✅ "感谢反馈！我们理解这个需求，但目前优先级较低，
    因为只有 2% 的用户会用到。我们会持续关注。"

✅ "这是个好想法，但实现成本很高（3 个月），
    而我们有更高优先级的问题需要解决。"

✅ "我们考虑过这个方案，但它会增加产品复杂度，
    与我们'保持简洁'的理念不符。"
```

---

### Phase 3: Spec Writing（规格编写）

**目标**：在编码前明确所有细节

#### 3.1 Linear Spec 模板

```markdown
# [Feature Name]

## Problem
[从 Phase 1 复制问题陈述]

## Goals
- Primary goal: [核心目标]
- Secondary goals: [次要目标]
- Non-goals: [明确不做什么]

## User Stories

As a [role], I want to [action] so that [benefit].

### Example
As a developer, I want to use keyboard shortcuts
so that I can navigate the app without using the mouse.

## Solution

### Overview
[高层次的解决方案描述]

### User Flow
1. User presses `Cmd+K`
2. Command palette opens
3. User types "create issue"
4. Matching commands are filtered
5. User presses Enter
6. Issue creation dialog opens

### UI/UX Design
[Figma 链接或截图]

### Technical Approach

#### Architecture
```typescript
// 核心接口设计
interface KeyboardShortcut {
  key: string
  modifiers: Modifier[]
  action: () => void
  description: string
}

class ShortcutManager {
  register(shortcut: KeyboardShortcut): void
  unregister(key: string): void
  execute(event: KeyboardEvent): void
}
```

#### Data Model
[数据库 schema 或状态结构]

#### API Changes
[新增或修改的 API]

### Edge Cases
- What if user presses conflicting shortcuts?
- What if shortcut is already used by browser?
- What if user is in an input field?

### Performance Considerations
- Shortcut registration: O(1)
- Shortcut lookup: O(1) using Map
- No impact on initial load time

### Accessibility
- All shortcuts must have mouse alternatives
- Shortcuts must be discoverable (help menu)
- Support for screen readers

### Security
- No security implications

## Success Metrics

- 30% of users adopt keyboard shortcuts within 1 month
- Average task completion time reduces by 20%
- NPS score increases by 5 points

## Rollout Plan

### Phase 1: Internal Beta (Week 1)
- Deploy to team
- Gather feedback
- Fix critical bugs

### Phase 2: Public Beta (Week 2-3)
- Deploy to 10% of users
- Monitor metrics
- Iterate based on feedback

### Phase 3: General Availability (Week 4)
- Deploy to all users
- Announce in changelog
- Create help documentation

## Open Questions

- [ ] Should shortcuts be customizable?
- [ ] Which shortcuts should be enabled by default?
- [ ] How to handle conflicts with browser shortcuts?

## Timeline

- Spec review: 2 days
- Implementation: 1.5 weeks
- Testing: 2 days
- Beta: 1 week
- GA: Week 4

Total: 4 weeks
```

#### 3.2 Spec Review 清单

```markdown
## Review Checklist

### Clarity
- [ ] 问题陈述清晰
- [ ] 解决方案明确
- [ ] 所有术语都有定义

### Completeness
- [ ] 覆盖所有用户场景
- [ ] 考虑了边界情况
- [ ] 定义了成功指标

### Feasibility
- [ ] 技术方案可行
- [ ] 时间估算合理
- [ ] 资源充足

### Quality
- [ ] 性能影响已评估
- [ ] 可访问性已考虑
- [ ] 安全性已审查

### Alignment
- [ ] 与产品愿景一致
- [ ] 与设计系统一致
- [ ] 与技术架构一致
```

---

### Phase 4: Focused Building（专注构建）

**目标**：高质量、高效率地实现功能

#### 4.1 深度工作原则

Linear 团队推崇深度工作：

```markdown
## Deep Work Principles

### 1. 长时间专注块
- 最少 2 小时不间断工作
- 关闭所有通知
- 使用番茄工作法（可选）

### 2. 减少会议
- 每周最多 5 小时会议
- 异步沟通优先
- 会议必须有明确议程

### 3. 批处理沟通
- 固定时间查看消息（如 10am, 3pm）
- 不立即回复非紧急消息
- 使用状态指示器（专注中/可打扰）

### 4. 单任务模式
- 一次只做一个 issue
- 完成后再开始下一个
- 避免上下文切换
```

#### 4.2 代码质量标准

```typescript
// Linear 的代码质量标准

// ✅ Good: 清晰的命名
function calculateMonthlyRecurringRevenue(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((sum, sub) => sum + sub.monthlyPrice, 0)
}

// ❌ Bad: 模糊的命名
function calc(data: any[]): number {
  return data.filter(d => d.s === 'a').reduce((s, d) => s + d.p, 0)
}

// ✅ Good: 小函数，单一职责
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): boolean {
  return password.length >= 8
}

function validateUser(user: User): ValidationResult {
  const errors: string[] = []
  if (!validateEmail(user.email)) errors.push('Invalid email')
  if (!validatePassword(user.password)) errors.push('Password too short')
  return { valid: errors.length === 0, errors }
}

// ❌ Bad: 大函数，多个职责
function validate(user: any): any {
  // 100 行验证逻辑
}
```

#### 4.3 性能优先

```typescript
// Linear 对性能的极致追求

// ✅ Good: 优化的列表渲染
function IssueList({ issues }: { issues: Issue[] }) {
  return (
    <VirtualList
      items={issues}
      itemHeight={48}
      renderItem={(issue) => <IssueRow issue={issue} />}
    />
  )
}

// ❌ Bad: 渲染所有项目
function IssueList({ issues }: { issues: Issue[] }) {
  return (
    <div>
      {issues.map(issue => <IssueRow key={issue.id} issue={issue} />)}
    </div>
  )
}

// ✅ Good: 防抖搜索
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    searchIssues(query)
  }, 300),
  []
)

// ✅ Good: 乐观更新
function updateIssue(id: string, data: Partial<Issue>) {
  // 立即更新 UI
  setIssues(prev => prev.map(issue =>
    issue.id === id ? { ...issue, ...data } : issue
  ))

  // 后台同步
  api.updateIssue(id, data).catch(() => {
    // 失败时回滚
    revertIssue(id)
  })
}
```

#### 4.4 渐进式交付

```markdown
## Progressive Delivery

### Week 1: Core Functionality
- [ ] 基础功能实现
- [ ] 单元测试
- [ ] 内部测试

### Week 2: Polish
- [ ] UI 细节优化
- [ ] 性能优化
- [ ] 边界情况处理

### Week 3: Beta
- [ ] 部署到 10% 用户
- [ ] 收集反馈
- [ ] 修复问题

### Week 4: GA
- [ ] 全量发布
- [ ] 文档更新
- [ ] 公告发布
```

---

### Phase 5: Quality Assurance（质量保证）

**目标**：确保发布的功能达到 Linear 的质量标准

#### 5.1 测试清单

```markdown
## Testing Checklist

### Functional Testing
- [ ] 所有用户场景都能正常工作
- [ ] 边界情况已测试
- [ ] 错误处理正确

### Performance Testing
- [ ] 页面加载时间 < 1s
- [ ] 交互响应时间 < 100ms
- [ ] 无内存泄漏

### Accessibility Testing
- [ ] 键盘导航正常
- [ ] 屏幕阅读器兼容
- [ ] 颜色对比度达标

### Cross-browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Testing
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] 响应式布局正确
```

#### 5.2 代码审查标准

```markdown
## Code Review Standards

### Must Have
- [ ] 代码符合风格指南
- [ ] 所有测试通过
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 警告

### Should Have
- [ ] 代码易于理解
- [ ] 函数长度合理（< 50 行）
- [ ] 复杂度可控（圈复杂度 < 10）
- [ ] 有必要的注释

### Nice to Have
- [ ] 性能优化
- [ ] 可复用性
- [ ] 扩展性
```

---

### Phase 6: Launch & Iterate（发布与迭代）

**目标**：成功发布并持续改进

#### 6.1 发布清单

```markdown
## Launch Checklist

### Pre-launch
- [ ] 所有测试通过
- [ ] 性能指标达标
- [ ] 文档已更新
- [ ] 团队已培训

### Launch
- [ ] 部署到生产环境
- [ ] 监控关键指标
- [ ] 准备回滚方案

### Post-launch
- [ ] 发布公告
- [ ] 收集用户反馈
- [ ] 监控错误率
- [ ] 分析使用数据
```

#### 6.2 成功指标追踪

```typescript
// 追踪关键指标
const metrics = {
  // 使用指标
  adoptionRate: 0.30,  // 30% 用户使用新功能
  dailyActiveUsers: 1250,
  featureUsagePerUser: 8.5,

  // 性能指标
  p50Latency: 45,  // ms
  p95Latency: 120,  // ms
  errorRate: 0.001,  // 0.1%

  // 业务指标
  userSatisfaction: 4.8,  // 5 分制
  supportTickets: -15,  // 减少 15%
  taskCompletionTime: -20  // 减少 20%
}
```

#### 6.3 迭代计划

```markdown
## Iteration Plan

### Week 1 Post-launch
- 修复关键 bug
- 优化性能瓶颈
- 回应用户反馈

### Week 2-4
- 添加用户要求的小改进
- 优化 UI 细节
- 完善文档

### Month 2+
- 评估是否达到成功指标
- 决定下一步方向
- 规划相关功能
```

---

## Linear Principles

### 1. 速度源于质量

```
低质量 → 技术债务 → 开发变慢 → 更多债务 → 恶性循环
高质量 → 易于修改 → 开发加速 → 更高质量 → 良性循环
```

### 2. 简洁胜于复杂

```markdown
❌ 添加配置选项让用户选择
✅ 选择最佳默认值

❌ 支持所有可能的用例
✅ 专注核心用例

❌ 功能越多越好
✅ 功能恰到好处
```

### 3. 细节决定成败

```typescript
// Linear 对细节的关注

// 动画时长精确到毫秒
const ANIMATION_DURATION = 150  // ms

// 间距使用 4px 网格系统
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
}

// 颜色有明确的语义
const COLORS = {
  primary: '#5E6AD2',
  success: '#0FA958',
  warning: '#F2994A',
  error: '#E5484D'
}
```

### 4. 用户体验无处不在

```markdown
## UX Checklist

- [ ] 加载状态（不让用户等待）
- [ ] 错误提示（清晰的错误信息）
- [ ] 空状态（引导用户开始使用）
- [ ] 快捷键（提升效率）
- [ ] 撤销操作（允许犯错）
- [ ] 乐观更新（即时反馈）
- [ ] 渐进增强（基础功能优先）
```

---

## Command Options

- `--validate`：运行问题验证流程
- `--prioritize`：使用 RICE 框架排序
- `--focus-mode`：启动专注构建模式
- `--quality-check`：运行质量检查

---

## Success Metrics

- ✅ 功能采用率 > 30%
- ✅ 用户满意度 > 4.5/5
- ✅ 性能 P95 < 200ms
- ✅ 错误率 < 0.1%
- ✅ 技术债务保持低水平

---

## References

- Linear Blog: "How we build Linear"
- Linear Method: Product development philosophy
- Cal Newport - *Deep Work*
- Basecamp - *Shape Up*
