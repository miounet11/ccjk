# 功能规划：Plan Mode 上下文智能同步

> **版本**: v1.0.0
> **日期**: 2026-01-25
> **状态**: 规划中

---

## 📋 概述

### 功能目标
实现 CCJK 工作流（`/ccjk:feat`, `/ccjk:init-project`, `/ccjk:workflow` 等）与 Claude Code CLI 新版 Plan Mode Context Clearing 功能的深度协同，在规划阶段完成后自动清理上下文，提升任务执行精准度。

### 预期价值
1. **提升执行质量** - 干净的上下文让 Claude 更专注于计划执行
2. **防止上下文过载** - 避免 token 超限导致的问题
3. **无缝体验** - 用户无需手动执行 `/compact`
4. **智能协同** - 与 Claude Code CLI 原生功能完美配合

### 影响范围
- Skills 系统（`/ccjk:feat`, `/ccjk:init-project`, `/ccjk:workflow`）
- 上下文管理模块
- Token 检测机制
- 工作流状态机

---

## 🎯 功能分解

### 核心功能

- [ ] **F1: Plan 完成后自动触发上下文清理建议**
  - 检测 Plan 阶段完成
  - 提示用户选择清理模式
  - 与 Claude Code CLI `/compact` 协同

- [ ] **F2: 智能 Token 阈值检测优化**
  - 优化当前 7.7% · 15.3k tokens 检测机制
  - 动态阈值调整
  - 预警机制

- [ ] **F3: 工作流状态持久化**
  - Plan 内容保存到文件
  - 上下文清理后可恢复
  - 支持跨会话继续

- [ ] **F4: Claude Code CLI 协同指令**
  - 生成 `/compact` 建议
  - 支持 Plan Mode 新选项
  - 提供清理/保留选择

---

## 📐 技术方案

### 方案 A：Workflow Hook 机制（推荐）

在工作流状态机中添加 `onPlanComplete` 钩子：

```typescript
// src/workflow/state-machine.ts
interface WorkflowHooks {
  onPlanComplete?: (plan: PlanDocument) => Promise<ContextAction>
}

type ContextAction =
  | { type: 'suggest_compact', reason: string }
  | { type: 'auto_save_plan', path: string }
  | { type: 'none' }
```

**优点**：
- 与现有架构一致
- 可扩展性强
- 不侵入 Claude Code CLI

**实现步骤**：
1. 扩展 WorkflowStateMachine 添加钩子
2. 在 Plan 阶段完成时触发
3. 自动保存 Plan 到 `.ccjk/plan/current/`
4. 输出提示信息引导用户

---

### 方案 B：Skill 指令增强

在 Skill 定义中添加 `context_strategy` 字段：

```yaml
# templates/skills/feat.md
---
name: ccjk:feat
context_strategy:
  on_plan_complete: suggest_clear  # suggest_clear | auto_clear | preserve
  save_plan: true
  plan_path: .ccjk/plan/current/
---
```

**优点**：
- 配置化，灵活
- 每个 Skill 可独立配置

---

### 方案 C：智能检测 + 自动建议

基于 Token 使用率自动触发：

```typescript
// src/context/auto-compact-advisor.ts
interface CompactAdvisor {
  // 检测是否需要建议 compact
  shouldSuggestCompact(context: ContextState): CompactSuggestion

  // 检测 Plan 阶段完成
  detectPlanCompletion(messages: Message[]): boolean

  // 生成建议消息
  generateSuggestion(reason: CompactReason): string
}
```

---

### 推荐方案：A + C 组合

1. **Workflow Hook** 处理明确的 Plan 完成事件
2. **智能检测** 作为兜底，处理 Token 过载情况

---

## 🔧 实施计划

### Phase 1: 基础设施（优先级 P0）

| 任务 | 描述 | 文件 |
|------|------|------|
| 1.1 | 创建 Plan 文档保存机制 | `src/workflow/plan-persistence.ts` |
| 1.2 | 扩展工作流钩子系统 | `src/workflow/state-machine.ts` |
| 1.3 | 添加上下文清理建议器 | `src/context/compact-advisor.ts` |

### Phase 2: Skill 集成（优先级 P1）

| 任务 | 描述 | 文件 |
|------|------|------|
| 2.1 | 更新 feat Skill 定义 | `templates/skills/feat.md` |
| 2.2 | 更新 init-project Skill | `templates/skills/init-project.md` |
| 2.3 | 更新 workflow Skill | `templates/skills/workflow.md` |

### Phase 3: 智能检测优化（优先级 P1）

| 任务 | 描述 | 文件 |
|------|------|------|
| 3.1 | 优化 Token 估算算法 | `src/utils/context/token-estimator.ts` |
| 3.2 | 添加动态阈值机制 | `src/context/threshold-manager.ts` |
| 3.3 | 实现预警系统 | `src/context/warning-system.ts` |

### Phase 4: 用户体验（优先级 P2）

| 任务 | 描述 | 文件 |
|------|------|------|
| 4.1 | 添加清理模式选择 UI | Skill 输出 |
| 4.2 | 国际化支持 | `src/i18n/locales/*/context.json` |
| 4.3 | 文档更新 | `docs/zh-CN/features/context.md` |

---

## ✅ 验收标准

### 功能验收

1. **Plan 完成自动保存**
   - [ ] 执行 `/ccjk:feat` 完成规划后，Plan 自动保存到 `.ccjk/plan/current/`
   - [ ] 文件命名规范：`{功能名}-{timestamp}.md`

2. **上下文清理建议**
   - [ ] Plan 完成后显示清理建议
   - [ ] 提供"清理上下文"和"保留上下文"两个选项
   - [ ] 建议信息包含 Token 使用情况

3. **Claude Code CLI 协同**
   - [ ] 输出的建议可直接复制执行
   - [ ] 与 Claude Code 新版 Plan Mode 兼容

4. **Token 检测优化**
   - [ ] 动态阈值根据模型调整
   - [ ] 预警在 70% 使用率时触发
   - [ ] 不干扰正常工作流

### 性能指标

- Plan 保存延迟 < 100ms
- Token 估算准确率 > 90%
- 无额外 API 调用

---

## 📝 输出示例

### Plan 完成后的建议输出

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 规划完成！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Plan 已保存: .ccjk/plan/current/用户评论功能-20260125.md

📊 当前上下文状态:
   • Token 使用: 45.2k / 200k (22.6%)
   • 消息数量: 67 条
   • Plan 阶段消息: 52 条

💡 建议: 清空上下文后执行计划

   Claude Code 新功能支持在接受计划后自动清空上下文，
   这能让 Claude 更专注于执行，提升任务完成质量。

   选择执行方式:

   [1] 🧹 清空上下文并执行 (推荐)
       - 自动清理规划阶段的讨论
       - 保留 Plan 文档作为执行依据
       - 获得干净的上下文窗口

   [2] 📎 保留上下文并执行
       - 保留所有历史对话
       - 适合需要参考讨论细节的情况

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔗 相关资源

- Claude Code Plan Mode 文档
- CCJK 上下文管理模块: `src/context/`
- 工作流状态机: `src/workflow/state-machine.ts`
- Token 估算器: `src/utils/context/token-estimator.ts`

---

## 📝 迭代历史

### v1 - 2026-01-25
- 初始规划
- 确定 Workflow Hook + 智能检测组合方案
