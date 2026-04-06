---
title: 功能开发工作流
---

# 功能开发工作流

功能开发工作流是由 `essentialTools` bundle 提供的规划型命令。它的定位是帮助用户完成需求澄清、方案收敛与实施交接，而不是把它包装成一个与当前安装面不一致的独立系统。

## 来源

- **所属工作流 bundle**：`essentialTools`
- **安装的命令文件**：`feat.md`
- **Claude Code 命令**：`/ccjk:feat <功能描述>`
- **Codex 命令**：`/prompts:feat <功能描述>`
- **配套智能体**：`planner`、`ui-ux-designer`、`init-architect`、`get-current-datetime`

## 适用场景

当你希望在真正实施前，先完成一轮结构化功能规划时，使用 `/ccjk:feat`。

典型用途：
- 澄清新功能需求
- 比较候选技术方案
- 补充 UI/UX 考量
- 产出可直接交接实施的任务拆解

如果你已经明确要做什么，更需要完整的实施闭环，则应使用 `/ccjk:workflow` 或 `/prompts:workflow`。

## 各工具入口

### Claude Code

```text
/ccjk:feat 实现带回复和审核的用户评论功能
```

### Codex

```text
/prompts:feat 实现带回复和审核的用户评论功能
```

## 典型输出

该工作流偏重规划，通常会产出：

1. 需求框定
2. 一个或多个方案选项
3. 与界面相关时的 UI/UX 考量
4. 面向执行的实现计划

## 与其他工作流的关系

| 工作流 | 最适合的场景 |
| --- | --- |
| `/ccjk:feat` / `/prompts:feat` | 功能规划与方案收敛 |
| `/ccjk:init-project` / `/prompts:init-project` | 项目初始化与架构定调 |
| `/ccjk:workflow` / `/prompts:workflow` | 更完整的阶段化实施闭环 |

## 说明

- 当前产品面中已经不再使用旧的 `featPlanUx` 工作流 ID；真实发货的是 `essentialTools`。
- 这个命令在 Codex 中是实际可用的，因为同一个 `feat.md` 模板会安装到 `~/.codex/prompts/`。
- Claude Code 会把相关智能体安装到 `~/.claude/agents/ccjk/essential/`。

## 相关页面

- [工作流系统](../features/workflows.md)
- [Claude Code 配置能力](../features/claude-code.md)
- [Codex 支持](../features/codex.md)
