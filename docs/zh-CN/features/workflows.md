---
title: 工作流系统
---

# 工作流系统

CCJK 当前提供的一组真实工作流 bundle 由 `src/config/workflows.ts` 定义，并在 `ccjk init` 或 `ccjk update` 时安装到各工具的原生命令目录。

## 内置工作流 bundle

| 工作流 ID | 默认安装 | 安装的命令文件 | 自动安装的智能体 | Claude Code | Codex |
| --- | --- | --- | --- | --- | --- |
| `interviewWorkflow` | 是 | `interview.md` | 无 | `/ccjk:interview` | `/prompts:interview` |
| `essentialTools` | 是 | `init-project.md`、`feat.md`、`goal.md` | `init-architect`、`get-current-datetime`、`planner`、`ui-ux-designer` | `/ccjk:init-project`、`/ccjk:feat`、`/ccjk:goal` | `/prompts:init-project`、`/prompts:feat`、`/prompts:goal` |
| `gitWorkflow` | 是 | `git-commit.md`、`git-rollback.md`、`git-cleanBranches.md`、`git-worktree.md` | 无 | `/ccjk:git-commit` 等 | `/prompts:git-commit` 等 |
| `sixStepsWorkflow` | 否 | `workflow.md` | 无 | `/ccjk:workflow` | `/prompts:workflow` |
| `specFirstTDD` | 否 | `spec-first-tdd.md` | 无 | `/ccjk:spec-first-tdd` | `/prompts:spec-first-tdd` |
| `continuousDelivery` | 否 | `continuous-delivery.md` | 无 | `/ccjk:continuous-delivery` | `/prompts:continuous-delivery` |
| `refactoringMaster` | 否 | `refactoring-master.md` | 无 | `/ccjk:refactoring-master` | `/prompts:refactoring-master` |
| `linearMethod` | 否 | `linear-method.md` | 无 | `/ccjk:linear-method` | `/prompts:linear-method` |

> 说明：旧文档里出现的 `commonTools` 与 `featPlanUx` 属于历史命名。当前版本中，`/ccjk:init-project` 和 `/ccjk:feat` 都归属于 `essentialTools` bundle。

## 安装位置

- **Claude Code**：`~/.claude/commands/ccjk/`
- **Codex**：`~/.codex/prompts/`
- **Claude Code 中与功能规划相关的智能体**：`~/.claude/agents/ccjk/essential/`

## 安装与更新

```bash
# 安装默认工作流集合
npx ccjk init

# 只安装指定工作流
npx ccjk init --workflows interviewWorkflow,essentialTools,gitWorkflow

# 更新已安装的工作流内容
npx ccjk update
```

CCJK 会从 `templates/common/workflow/` 复制模板，并让命令文件名与最终 slash command 名称保持一致。

## 各工具命令格式

| 工具 | 目录 | 前缀 | 示例 |
| --- | --- | --- | --- |
| Claude Code | `~/.claude/commands/ccjk/` | `/ccjk:` | `/ccjk:feat`、`/ccjk:workflow`、`/ccjk:git-commit` |
| Codex | `~/.codex/prompts/` | `/prompts:` | `/prompts:feat`、`/prompts:workflow`、`/prompts:git-commit` |

## 推荐入口

- **新功能规划**：`essentialTools` → `/ccjk:feat` 或 `/prompts:feat`
- **持久化目标执行**：`essentialTools` → `/ccjk:goal` 或 `/prompts:goal`
- **项目初始化**：`essentialTools` → `/ccjk:init-project` 或 `/prompts:init-project`
- **结构化实施**：`sixStepsWorkflow` → `/ccjk:workflow` 或 `/prompts:workflow`
- **Git 操作**：`gitWorkflow`
- **面试准备**：`interviewWorkflow`

## 相关页面

- [Claude Code 配置能力](claude-code.md)
- [Codex 支持](codex.md)
- [功能开发工作流](../workflows/feat.md)
