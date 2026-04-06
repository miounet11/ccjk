---
title: Claude Code 配置能力
---

# Claude Code 配置能力

CCJK 为 Claude Code 提供完整的零配置体验。`ccjk init` 会把配置、工作流命令以及可选的辅助资源安装到 Claude Code 的原生目录中。

## 核心能力

| 功能模块 | 说明 | 位置 |
| --- | --- | --- |
| API 配置 | 官方登录、API Key、CCR 代理三种模式 | `~/.claude/settings.json` |
| 工作流命令 | CCJK 安装的 slash commands | `~/.claude/commands/ccjk/` |
| 工作流智能体 | 选中 bundle 所需的智能体 | `~/.claude/agents/ccjk/` |
| 输出风格 | 可选的 AI 输出风格 | `~/.claude/output-styles/` |
| MCP 服务 | 已安装的 MCP 配置项 | `~/.claude/settings.json` |
| 系统提示 | 全局项目与用户指令 | `~/.claude/CLAUDE.md` |

## 目录结构

执行 `ccjk init` 后，Claude Code 的工作流目录大致如下：

```text
~/.claude/
├── settings.json
├── CLAUDE.md
├── commands/
│   └── ccjk/
│       ├── interview.md
│       ├── init-project.md
│       ├── feat.md
│       ├── workflow.md
│       ├── git-commit.md
│       ├── git-rollback.md
│       ├── git-cleanBranches.md
│       ├── git-worktree.md
│       └── ...
├── agents/
│   └── ccjk/
│       └── essential/
│           ├── init-architect.md
│           ├── get-current-datetime.md
│           ├── planner.md
│           └── ui-ux-designer.md
├── output-styles/
└── backup/
```

## 当前实际提供的工作流 bundle

| 工作流 ID | 默认安装 | Claude Code 命令 |
| --- | --- | --- |
| `interviewWorkflow` | 是 | `/ccjk:interview` |
| `essentialTools` | 是 | `/ccjk:init-project`、`/ccjk:feat` |
| `gitWorkflow` | 是 | `/ccjk:git-commit`、`/ccjk:git-rollback`、`/ccjk:git-cleanBranches`、`/ccjk:git-worktree` |
| `sixStepsWorkflow` | 否 | `/ccjk:workflow` |
| `specFirstTDD` | 否 | `/ccjk:spec-first-tdd` |
| `continuousDelivery` | 否 | `/ccjk:continuous-delivery` |
| `refactoringMaster` | 否 | `/ccjk:refactoring-master` |
| `linearMethod` | 否 | `/ccjk:linear-method` |

> 旧文档中提到的 `featPlanUx` 已经过时。当前版本的功能规划命令归属于 `essentialTools`。

## 工作流安装

```bash
# 安装默认工作流集合
npx ccjk i -s

# 安装指定子集
npx ccjk i -s --workflows interviewWorkflow,essentialTools,sixStepsWorkflow

# 跳过工作流安装
npx ccjk i -s --workflows skip
```

## Slash command 形式

由于 CCJK 会把工作流文件安装到 `~/.claude/commands/ccjk/`，所以在 Claude Code 中应使用以下命令形式：

```text
/ccjk:interview
/ccjk:init-project
/ccjk:feat
/ccjk:workflow
/ccjk:git-commit
```

## API 与模型管理

### 官方登录

```text
? 选择 API 认证方式
  ❯ 使用官方登录
```

### API Key 模式

```bash
npx ccjk i -s -p 302ai -k "sk-xxx"
npx ccjk i -s -t api_key -k "sk-xxx" -u "https://api.example.com"
```

### CCR 代理模式

```bash
npx ccjk i -s -t ccr_proxy
npx ccjk ccr
```

## 更新工作流内容

```bash
npx ccjk update
```

当你想刷新工作流/模板内容，同时保留现有 Claude Code 配置时，使用 `ccjk update`。

## 相关页面

- [工作流系统](workflows.md)
- [功能开发工作流](../workflows/feat.md)
- [Codex 支持](codex.md)
