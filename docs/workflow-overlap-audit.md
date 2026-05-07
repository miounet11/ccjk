# Workflow Overlap Audit

> Karpathy baseline 落地后，重新评估 8 个 workflow 的定位。Baseline 已涵盖了
> "克制、精准、验证 loop" 这套通用纪律。下面看每个 workflow 的**独立价值**还在哪里。

---

## Karpathy 4 条原则覆盖范围

| 原则 | 在 baseline 中的形式 | 全局生效？ |
|---|---|---|
| Think before coding | 第 1 节 "含糊请求先问" | ✅ 写进 `~/.claude/CLAUDE.md` |
| Simplicity first | 第 2 节 "最小代码" | ✅ |
| Surgical changes | 第 3 节 "只改任务相关的行" | ✅ |
| Goal-driven execution | 第 4 节 "失败测试 → 跑通" | ✅ |

---

## 8 个 workflow 现状 vs baseline

| Workflow | 命令 | 主张 | 与 baseline 重叠度 | 独立价值 |
|---|---|---|---|---|
| `interviewWorkflow` | `/interview` | AI 面试准备/问题生成 | **0%** | 独立场景，留 |
| `essentialTools` | `/init-project /feat /goal` | 项目初始化、功能规划、目标设定 | 30%（goal 覆盖原则 4） | 留：模板/agent 初始化是工程产出，baseline 是行为约束 |
| `gitWorkflow` | `/commit /worktree /cleanBranches /rollback` | Git 操作 | 0% | 独立场景，留 |
| `sixStepsWorkflow` | `/workflow` | 6 阶段（研究→构思→计划→执行→优化→评审） | **70%**（计划+评审已被 think+goal 覆盖） | 弱化：保留作为"重型项目重型流程"的可选入口 |
| `specFirstTDD` | `/spec-first-tdd` | RED-GREEN-REFACTOR | **80%** 与 goal-driven 重叠 | 留作专用入口（用户主动调）；baseline 是默认行为 |
| `continuousDelivery` | `/continuous-delivery` | 自动化构建/部署/回滚 | 0% | 独立场景，留 |
| `refactoringMaster` | `/refactoring-master` | Fowler 重构模式小步走 | **50%**（小步快跑被 surgical 覆盖；模式目录独立价值在） | 留：Fowler 模式 catalog 是知识，不是行为 |
| `linearMethod` | `/linear-method` | 问题验证 → 优先级 → 专注 | **40%**（问题验证 ≈ think） | 留：产品决策方法论，超出编码纪律 |

---

## 推荐处置（不动现有 workflow，改头部声明）

避免破坏现有用户工作流，**不删不并**。改三处：

### 1. workflow 顶部加入 baseline 引用（可选）

`sixStepsWorkflow` / `specFirstTDD` / `linearMethod` / `refactoringMaster` 这 4 个最重叠的 workflow 在文件开头加：

```markdown
> **基于 Discipline Baseline**：本 workflow 在 4 条全局原则
> （Think / Simplicity / Surgical / Goal-driven）之上提供更具体的流程编排。
> 当本文档与 baseline 冲突，**baseline 优先**。
```

不删任何东西。声明优先级，避免冲突。

### 2. 默认选择策略调整

`WORKFLOW_CONFIG_BASE` 里的 `defaultSelected` 当前：

```
interviewWorkflow      true
essentialTools         true   ← 留
gitWorkflow            true   ← 留
sixStepsWorkflow       true   ← 因和 baseline 重叠 70%，建议改 false
specFirstTDD           ?
continuousDelivery     ?
refactoringMaster      ?
linearMethod           ?
```

baseline 进 CLAUDE.md 后，新用户不需要 sixStep 默认选中 —— baseline 已涵盖大半。让用户主动选 = 强场景下才用重型流程。

### 3. 菜单/选择器分组（前端层）

在 workflow 选择 UI 加分组：
- **Always-on（已自动启用）**：`Discipline Baseline`（伪条目，提示用户已在 CLAUDE.md 生效）
- **Essential**：interviewWorkflow / essentialTools / gitWorkflow
- **Process（与 baseline 重叠，按需）**：sixSteps / specFirstTDD / linearMethod / refactoringMaster
- **Operational**：continuousDelivery

---

## 结论

不需要合并/删除 workflow。Karpathy 是**行为约束**，workflow 是**流程编排** —— 两层不同。
但要让用户知道：选不选这些 workflow，baseline 的那 4 条都已生效。这一点用：

1. baseline 进 `~/.claude/CLAUDE.md`（已做）
2. 6 个 output style 末尾加 Discipline 引用（已做）
3. 重叠度高的 workflow 顶部加优先级声明（待做）
4. 菜单分组时区分 always-on / 可选（待做）

这样用户**理解层级**：行为纪律 = 默认（不可选关），流程模板 = 选项（按需开）。
