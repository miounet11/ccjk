# Superpowers × CCJK 深度融合方案

## 🎯 核心理念

将 Superpowers 的 14 个专业技能深度融合到 CCJK 的 8 个快捷操作中，让用户获得：
- **零学习曲线**：通过数字快捷键直接触发专业工作流
- **自动化工作流**：智能检测场景，自动应用最佳实践
- **渐进式增强**：从简单到复杂，逐步引导用户使用高级功能

## 📊 映射关系

### 1. Smart Commit (1) ← finishing-a-development-branch
**当前**：简单的 commit 消息生成
**增强**：
- 自动检查是否有未提交的测试
- 验证代码质量（linting, formatting）
- 生成符合 Conventional Commits 的消息
- 提示是否需要 code review

### 2. Code Review (2) ← requesting-code-review + receiving-code-review
**当前**：基础代码审查
**增强**：
- 自动派发 code-reviewer 子代理
- 两阶段审查：快速扫描 → 深度分析
- 生成可操作的反馈清单
- 追踪修复进度

### 3. Write Tests (3) ← test-driven-development
**当前**：TDD 工作流
**增强**：
- 强制 Red-Green-Refactor 循环
- 自动检测是否先写了实现代码（违规警告）
- 测试覆盖率实时反馈
- 集成 testing-anti-patterns 检查

### 4. Plan Feature (4) ← writing-plans + executing-plans + subagent-driven-development
**当前**：6 步开发流程
**增强**：
- 自动生成任务分解（Task 1, 2, 3...）
- 每个任务完成后自动触发 code review
- 并行任务自动派发子代理
- 进度追踪和可视化

### 5. Debug Issue (5) ← systematic-debugging
**当前**：系统性调试
**增强**：
- 强制四阶段流程（Root Cause → Pattern → Hypothesis → Implementation）
- 自动检测是否跳过了 Phase 1（违规警告）
- 失败次数追踪（3 次后强制架构讨论）
- 集成 root-cause-tracing 技术

### 6. Brainstorm (6) ← brainstorming + dispatching-parallel-agents
**当前**：探索想法和方案
**增强**：
- 自动派发多个并行子代理探索不同方向
- 结构化输出（Pros/Cons/Trade-offs）
- 方案对比矩阵
- 决策树生成

### 7. Verify Code (7) ← verification-before-completion
**当前**：质量验证
**增强**：
- 完整的验证清单（Tests, Linting, Types, Security）
- 自动运行测试套件
- 生成质量报告
- 部署前检查清单

### 8. Write Docs (8) ← writing-skills
**当前**：生成文档
**增强**：
- 自动从代码生成 API 文档
- README 模板和最佳实践
- 代码注释质量检查
- 文档覆盖率报告

## 🚀 实施计划

### Phase 1: 智能路由层（1-2 天）

**目标**：当用户输入数字时，自动加载对应的 Superpowers 技能

```typescript
// src/brain/superpowers-router.ts
export async function routeToSuperpower(actionId: number, context: string) {
  const mapping = {
    1: 'finishing-a-development-branch',
    2: 'requesting-code-review',
    3: 'test-driven-development',
    4: 'subagent-driven-development',
    5: 'systematic-debugging',
    6: 'brainstorming',
    7: 'verification-before-completion',
    8: 'writing-skills'
  }

  const skillName = mapping[actionId]
  if (!skillName) return null

  // 加载 skill.md 内容
  const skillPath = `~/.claude/plugins/superpowers/skills/${skillName}/SKILL.md`
  const skillContent = await readFile(skillPath, 'utf-8')

  // 注入到 Claude 的 system prompt
  return {
    skill: skillName,
    content: skillContent,
    context
  }
}
```

### Phase 2: 自动检测和警告（2-3 天）

**目标**：检测用户是否违反了最佳实践，自动警告

```typescript
// src/brain/practice-enforcer.ts
export class PracticeEnforcer {
  // TDD 违规检测
  async detectTDDViolation(files: string[]) {
    // 检查是否有新的实现代码但没有对应测试
    const hasNewCode = files.some(f => !f.includes('.test.'))
    const hasNewTests = files.some(f => f.includes('.test.'))

    if (hasNewCode && !hasNewTests) {
      return {
        violation: 'TDD_SKIPPED',
        message: '⚠️ 检测到新代码但没有测试！请先写测试（输入 3 启动 TDD）',
        severity: 'ERROR'
      }
    }
  }

  // Debug 违规检测
  async detectDebugViolation(conversation: Message[]) {
    // 检查是否直接提出修复而没有 root cause 分析
    const hasFixProposal = conversation.some(m =>
      m.content.includes('fix') || m.content.includes('修复')
    )
    const hasRootCauseAnalysis = conversation.some(m =>
      m.content.includes('root cause') || m.content.includes('根本原因')
    )

    if (hasFixProposal && !hasRootCauseAnalysis) {
      return {
        violation: 'DEBUG_PHASE1_SKIPPED',
        message: '⚠️ 请先完成 Phase 1: Root Cause Investigation！（输入 5 启动系统性调试）',
        severity: 'WARNING'
      }
    }
  }
}
```

### Phase 3: 工作流自动化（3-4 天）

**目标**：自动执行多步骤工作流

```typescript
// src/brain/workflow-automator.ts
export class WorkflowAutomator {
  // 自动化 Code Review 工作流
  async autoCodeReview() {
    // 1. 获取 git SHAs
    const baseSha = await exec('git rev-parse HEAD~1')
    const headSha = await exec('git rev-parse HEAD')

    // 2. 派发 code-reviewer 子代理
    const review = await dispatchSubagent('code-reviewer', {
      baseSha,
      headSha,
      context: await getRecentChanges()
    })

    // 3. 解析反馈
    const issues = parseReviewFeedback(review)

    // 4. 生成可操作清单
    return {
      critical: issues.filter(i => i.severity === 'critical'),
      important: issues.filter(i => i.severity === 'important'),
      minor: issues.filter(i => i.severity === 'minor'),
      actionItems: generateActionItems(issues)
    }
  }

  // 自动化 Subagent-Driven Development
  async autoSubagentDevelopment(plan: string) {
    const tasks = parsePlanIntoTasks(plan)

    for (const task of tasks) {
      // 1. 派发 implementer 子代理
      await dispatchSubagent('implementer', { task })

      // 2. 自动触发 code review
      const review = await this.autoCodeReview()

      // 3. 如果有 critical issues，暂停并等待修复
      if (review.critical.length > 0) {
        console.log('⚠️ 发现严重问题，请修复后继续')
        await waitForUserConfirmation()
      }

      // 4. 继续下一个任务
    }
  }
}
```

### Phase 4: 智能提示系统（2-3 天）

**目标**：在合适的时机主动提示用户使用高级功能

```typescript
// src/brain/smart-suggestions.ts
export class SmartSuggestions {
  async analyzeSituation(context: ConversationContext) {
    const suggestions = []

    // 检测到多次修复失败 → 建议系统性调试
    if (context.failedFixAttempts >= 2) {
      suggestions.push({
        action: 5,
        reason: '检测到多次修复失败，建议使用系统性调试（输入 5）',
        priority: 'HIGH'
      })
    }

    // 检测到大型功能 → 建议使用计划驱动开发
    if (context.estimatedComplexity > 0.7) {
      suggestions.push({
        action: 4,
        reason: '这是一个复杂功能，建议先规划再实现（输入 4）',
        priority: 'MEDIUM'
      })
    }

    // 检测到准备提交 → 建议 code review
    if (context.hasUncommittedChanges && context.linesChanged > 100) {
      suggestions.push({
        action: 2,
        reason: '变更较大，建议提交前进行代码审查（输入 2）',
        priority: 'MEDIUM'
      })
    }

    return suggestions
  }
}
```

### Phase 5: 可视化和报告（2-3 天）

**目标**：提供清晰的进度追踪和质量报告

```typescript
// src/brain/progress-tracker.ts
export class ProgressTracker {
  // 生成开发进度报告
  generateProgressReport(plan: Plan) {
    return `
## 📊 开发进度报告

### 总体进度
- 已完成: ${plan.completedTasks}/${plan.totalTasks} 任务
- 进度: ${plan.progress}%
- 预计剩余时间: ${plan.estimatedTimeRemaining}

### 质量指标
- 测试覆盖率: ${plan.testCoverage}%
- Code Review 通过率: ${plan.reviewPassRate}%
- 违规次数: ${plan.violations}

### 下一步
${plan.nextActions.map(a => `- ${a}`).join('\n')}
    `
  }

  // 生成质量报告
  generateQualityReport(codebase: Codebase) {
    return `
## ✅ 代码质量报告

### 测试
- 单元测试: ${codebase.unitTests} 个
- 集成测试: ${codebase.integrationTests} 个
- 覆盖率: ${codebase.coverage}%

### 代码规范
- Linting 错误: ${codebase.lintErrors}
- Type 错误: ${codebase.typeErrors}
- 安全问题: ${codebase.securityIssues}

### 最佳实践
- TDD 遵循率: ${codebase.tddCompliance}%
- Code Review 覆盖: ${codebase.reviewCoverage}%
    `
  }
}
```

## 🎨 用户体验设计

### 场景 1: 新手用户

```
用户: 我想实现一个登录功能

CCJK: 检测到这是一个中等复杂度的功能。建议：

💡 输入 4 - 使用计划驱动开发
   ✓ 自动分解任务
   ✓ 每步完成后自动审查
   ✓ 确保不遗漏边界情况

或者直接描述需求，我会引导你完成。

用户: 4

CCJK: 🎯 启动计划驱动开发工作流

正在分析需求...
已生成 6 个任务：

1. 设计登录 API 接口
2. 实现密码加密和验证
3. 添加 JWT token 生成
4. 实现登录端点
5. 添加错误处理
6. 编写集成测试

开始执行 Task 1...
[自动派发子代理]
[自动进行 code review]
[继续下一个任务]
```

### 场景 2: 经验用户

```
用户: 这个 bug 很奇怪，改了好几次都不行

CCJK: ⚠️ 检测到多次修复失败（3 次）

根据 Superpowers systematic-debugging 原则：
3+ 次失败 = 架构问题，不是简单 bug

建议：
输入 5 - 启动系统性调试
   → Phase 1: Root Cause Investigation
   → 追踪数据流
   → 质疑架构设计

用户: 5

CCJK: 🐛 启动系统性调试工作流

## Phase 1: Root Cause Investigation

让我们先停止猜测，开始系统性分析：

1. 错误信息完整内容是什么？
2. 能稳定复现吗？
3. 最近有什么变更？

[引导用户完成四个阶段]
```

### 场景 3: 自动化场景

```
用户: [修改了代码]

CCJK: 💡 智能提示

检测到你修改了 auth.ts 但没有对应的测试文件。

根据 TDD 最佳实践：
❌ 先写代码再写测试 = 测试可能无效
✅ 先写测试再写代码 = 确保测试有效

建议：
1. 删除刚才的实现代码
2. 输入 3 启动 TDD 工作流
3. 先写失败的测试
4. 再实现功能

要继续当前方式吗？(y/n)
```

## 📈 成功指标

### 用户层面
- 快捷操作使用率 > 80%
- 用户满意度 > 4.5/5
- 学习曲线 < 10 分钟

### 质量层面
- TDD 遵循率 > 70%
- Code Review 覆盖率 > 90%
- Bug 修复成功率（首次）> 85%

### 效率层面
- 开发速度提升 30%
- 返工率降低 50%
- 代码质量提升 40%

## 🔧 技术实现要点

### 1. Skill 加载机制
```typescript
// 动态加载 Superpowers skills
const skillLoader = new SkillLoader('~/.claude/plugins/superpowers/skills')
const skill = await skillLoader.load('systematic-debugging')
```

### 2. 违规检测引擎
```typescript
// 实时检测用户行为
const enforcer = new PracticeEnforcer()
const violations = await enforcer.check(userAction)
if (violations.length > 0) {
  showWarning(violations)
}
```

### 3. 子代理调度
```typescript
// 自动派发和管理子代理
const dispatcher = new SubagentDispatcher()
await dispatcher.dispatch('code-reviewer', context)
```

### 4. 进度追踪
```typescript
// 实时追踪工作流进度
const tracker = new ProgressTracker()
tracker.updateProgress(taskId, 'completed')
```

## 🎯 下一步行动

1. **立即开始**：实现 Phase 1 智能路由层
2. **快速验证**：选择 1-2 个高频场景测试
3. **迭代优化**：根据用户反馈调整
4. **全面推广**：覆盖所有 8 个快捷操作

---

**核心价值主张**：
让专业的 Superpowers 工作流变得像输入数字一样简单，
让最佳实践成为默认选择，而不是额外负担。
